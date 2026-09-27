/**
 * THE JOIN. D2 to D4 as they actually run (plan 2.2 and 4.1), in one place.
 *
 *   beginSignIn   mint `state`, open the browser at the console's sign-in page
 *   receiveGrant  the browser came back (deep link) or the person pasted the code
 *   enrol         generate a key, POST /enrol signed by it, verify, and only
 *                 then write the key and membership.json
 *
 * ORDER IS THE POINT. Nothing is written until the relay has accepted the key
 * AND the fingerprint it reports matches the one we derive. A refused code, an
 * expired grant, a wrong `state`, a relay that is down, a keyring that cannot
 * encrypt: each leaves the machine exactly as it was, with no key on disk and
 * no membership file, and `hasIdentity()` false. That is the property Phase 0
 * proves and the tests mutate.
 *
 * THE KEYRING IS CHECKED BEFORE THE RELAY IS CALLED. `saveIdentity` refuses on
 * an OS that cannot really encrypt. Discovering that AFTER `/enrol` succeeded
 * would leave a device row on the relay, a spent grant and a redeemed invite,
 * with no key on this machine to ever use them: a member who exists everywhere
 * except where it matters. So the check that would refuse the write runs first.
 *
 * THE GRANT IS SPENT ON FAILURE TOO. The relay deletes it before it decides
 * (single use, like a nonce), and this side cannot tell whether a refusal came
 * before or after that point. So any relay failure discards the grant we hold
 * and the retry is a fresh sign-in. Claiming the grant is still good when it
 * may not be would send the person round the loop twice.
 */
import { shell } from 'electron';
import { randomBytes } from 'node:crypto';
import { hostname, release } from 'node:os';
import * as identity from './deviceIdentity';
import { enrol as relayEnrol, b64url, type RelayFailure } from './relay';
import { writeMembership, LEASE_SECONDS } from './teamsMembership';
import * as gate from './teamsGate';
import { isGrantToken, parseTeamsDeepLink } from '../shared/teams';
import type { CodeError, EnrolProgress, EnrolResult } from '../shared/teams';

/** Kevin's page (plan 2.2, S10). Overridable for the dev stub, like MD_RELAY_URL. */
export const SIGNIN_URL = process.env.MD_TEAMS_SIGNIN_URL ?? 'https://app.harnessmd.com/desktop/signin';

/**
 * DEV ONLY, AND LOUD ABOUT IT. Until S10 lands the live relay rejects a `grant`
 * field outright (`noExtras` on /enrol), so the whole join can only be
 * exercised end to end by leaving the grant out. `MD_TEAMS_SIGNIN=off` skips
 * the browser and sends the code alone. A packaged app launched from the Finder
 * or the Start menu has no such variable. This is not a product setting and it
 * does not soften the founder's ruling: it is how the rest of the path gets
 * tested while the page it depends on is being built.
 */
const SIGNIN_OFF = process.env.MD_TEAMS_SIGNIN === 'off';

/** The console's grant TTL is five minutes (plan 2.2). We give up at the same time. */
export const SIGNIN_TTL_MS = 5 * 60_000;

interface Pending {
  state: string;
  grant: string | null;
  expiresAt: number;
}

let pending: Pending | null = null;

const grantListeners = new Set<() => void>();
const progressListeners = new Set<(step: EnrolProgress) => void>();

/** Fires when a grant has arrived, by either route. The renderer moves on. */
export function onGrant(fn: () => void): () => void {
  grantListeners.add(fn);
  return () => { grantListeners.delete(fn); };
}

/** D3's three rows, as each one starts. */
export function onProgress(fn: (step: EnrolProgress) => void): () => void {
  progressListeners.add(fn);
  return () => { progressListeners.delete(fn); };
}

const progress = (step: EnrolProgress): void => { progressListeners.forEach((fn) => fn(step)); };

/* ---- the browser round trip ----------------------------------------------- */

export interface SignInBegun {
  ok: true;
  /** For the tests and the "open again" button; the renderer never needs to show it. */
  url: string | null;
  /** True under MD_TEAMS_SIGNIN=off: no browser, no grant, code alone. */
  skipped: boolean;
  expiresAt: string;
}

export type SignInRefused = {
  ok: false;
  error: 'refused';
  detail: string;
  reason: 'keyring_unavailable' | 'keyring_not_encrypting';
};

/**
 * Mint a fresh `state` and open the browser. Calling it again (the "open the
 * browser again" button) replaces the pending state: an older link that then
 * arrives is refused, which is right, because it is not the one we are
 * waiting for any more.
 *
 * THE KEYRING IS CHECKED BEFORE THE BROWSER OPENS. If this machine cannot store
 * a key, the person should learn that on D2, not after signing in with Clerk
 * and watching the last row of D3 fail. Same check `enrol` repeats, because
 * `enrol` can also run without this step under the dev switch.
 */
export async function beginSignIn(
  open: (url: string) => Promise<void> = (u) => shell.openExternal(u),
): Promise<SignInBegun | SignInRefused> {
  const storable = identity.canStoreIdentity();
  if (!storable.ok) {
    return { ok: false, error: 'refused', detail: storable.reason, reason: storable.code };
  }
  const state = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SIGNIN_TTL_MS;
  pending = { state, grant: null, expiresAt };
  gate.setEnrolling(true);
  if (SIGNIN_OFF) {
    console.warn('[teams] MD_TEAMS_SIGNIN=off: skipping the browser sign-in; enrol will carry no grant');
    return { ok: true, url: null, skipped: true, expiresAt: new Date(expiresAt).toISOString() };
  }
  const url = `${SIGNIN_URL}?state=${state}`;
  await open(url);
  return { ok: true, url, skipped: false, expiresAt: new Date(expiresAt).toISOString() };
}

export type GrantRefusal = { ok: false; error: 'signin'; detail: string };

/**
 * The grant arrives. Two routes, two checks:
 *
 *   link    the deep link carries `state`, and it must equal the one we minted.
 *           A mismatch is refused WITHOUT clearing the pending sign-in: a
 *           foreign link must not be able to cancel a real one.
 *   paste   the person is the channel. There is no `state` to compare, but
 *           there must be a sign-in in progress, or a pasted value has nothing
 *           to attach to. A pasted whole deep link is accepted too, because
 *           that is what a browser's address bar hands over.
 */
export function receiveGrant(
  input: { grant: string; state?: string },
  via: 'link' | 'paste',
): { ok: true } | GrantRefusal {
  if (!pending) return { ok: false, error: 'signin', detail: 'No sign-in is in progress on this machine.' };
  if (Date.now() > pending.expiresAt) {
    pending = null;
    gate.setEnrolling(false);
    return { ok: false, error: 'signin', detail: 'That sign-in took longer than five minutes.' };
  }

  let grant = input.grant.trim().toLowerCase();
  let state = input.state?.trim().toLowerCase();
  if (via === 'paste') {
    const asLink = parseTeamsDeepLink(grant);
    if (asLink) { grant = asLink.grant; state = asLink.state; }
  }
  if (!isGrantToken(grant)) {
    return { ok: false, error: 'signin', detail: 'That is not the code the browser showed.' };
  }
  if (via === 'link' || state !== undefined) {
    if (state !== pending.state) {
      return { ok: false, error: 'signin', detail: 'That link was not the one this machine asked for.' };
    }
  }

  pending.grant = grant;
  grantListeners.forEach((fn) => fn());
  return { ok: true };
}

export function hasGrant(): boolean {
  return pending?.grant != null && Date.now() <= pending.expiresAt;
}

/** The person backed out. Nothing was written, so there is nothing to undo. */
export function cancelSignIn(): void {
  pending = null;
  gate.setEnrolling(false);
}

/* ---- the enrol ------------------------------------------------------------ */

/**
 * The relay's failure, mapped onto D2's `CodeError`.
 *
 * Branch on `error`, never on `detail` (HANDOFF section 3), with ONE confined
 * exception: the relay uses a single `conflict` code for a redeemed, expired,
 * revoked or suspended invite and puts the state word in the sentence
 * (`That invite is ${state}.`). Two words are matched, and anything else falls
 * through to `refused` with the relay's own sentence shown, so a wording change
 * degrades to less specific copy rather than to wrong copy.
 */
export function mapFailure(f: RelayFailure): { error: CodeError; detail: string | null } {
  if (f.status === 0) return { error: 'offline', detail: f.detail };
  switch (f.error) {
    case 'not_found':
      return { error: 'invalid', detail: f.detail };
    case 'conflict': {
      const d = (f.detail ?? '').toLowerCase();
      if (/\bredeemed\b/.test(d)) return { error: 'used', detail: f.detail };
      if (/\bexpired\b/.test(d)) return { error: 'expired', detail: f.detail };
      return { error: 'refused', detail: f.detail };
    }
    default:
      // seats_exhausted, device_limit, entitlement_inactive, invalid_body,
      // rate_limited, unauthorized, server_error: the sentence is the copy.
      return { error: 'refused', detail: f.detail };
  }
}

/** `MD-XXXX-XXXX`, whatever the person typed or pasted. */
export function normaliseCode(raw: string): string {
  const body = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^MD/, '');
  return `MD-${body.slice(0, 4)}-${body.slice(4, 8)}`;
}

export interface EnrolDeps {
  /** Overridable for the tests; the app passes its own version. */
  appVersion: string;
}

export async function enrol(input: { code: string }, deps: EnrolDeps): Promise<EnrolResult> {
  // NO CODE IS A SECOND MACHINE (plan 4.8, server item S10): the person signed
  // in as themselves and the relay finds their seat by the grant's identity.
  // It needs the grant, so the dev switch (no grant) cannot take this path.
  const code = input.code.trim() ? normaliseCode(input.code) : '';
  if (!code && SIGNIN_OFF) {
    return { ok: false, error: 'invalid', detail: 'Enter the invite code.' };
  }

  // A grant, unless the dev switch says the relay is not expecting one.
  let grant: string | undefined;
  if (!SIGNIN_OFF) {
    if (!hasGrant()) {
      return {
        ok: false, error: 'signin',
        detail: 'Sign in with your browser first; the sign-in did not complete.',
      };
    }
    grant = pending!.grant!;
  }

  // Keyring first. See the header: refusing here costs nothing; refusing after
  // the relay said yes costs a device row nobody can use.
  const storable = identity.canStoreIdentity();
  if (!storable.ok) {
    return { ok: false, error: 'refused', detail: storable.reason, reason: storable.code };
  }

  gate.setEnrolling(true);
  try {
    progress('keys');
    const pair = await identity.generateUnsaved();
    const publicKeyUrl = b64url(pair.publicKey);
    const publicKeyStd = Buffer.from(pair.publicKey).toString('base64');

    progress('registering');
    const res = await relayEnrol({
      // Absent, not empty, for a second machine: the body is hashed into the
      // signature and the relay's validator refuses an empty string.
      ...(code ? { code } : {}),
      publicKey: publicKeyUrl,
      deviceName: hostname().slice(0, 80),
      os: `${process.platform} ${release()}`.slice(0, 40),
      appVersion: deps.appVersion.slice(0, 20),
      ...(grant ? { grant } : {}),
    }, pair.privateKey);

    if (!res.ok) {
      // The grant may be spent. Drop it; the retry is a fresh sign-in.
      if (pending) pending.grant = null;
      return { ok: false, ...mapFailure(res) };
    }

    progress('checking');
    // Contract 3.2: derive the fingerprint and compare. The relay's copy is
    // what the roster will show everyone; if it does not describe OUR key, the
    // safety number teammates read aloud would verify a key we do not hold.
    const expected = identity.fingerprintFor(publicKeyStd);
    if (res.data.fingerprint !== expected) {
      if (pending) pending.grant = null;
      return {
        ok: false, error: 'refused', reason: 'fingerprint_mismatch',
        detail: 'The server reported a fingerprint that does not match the key this machine made. Nothing was saved.',
      };
    }

    // Only now. Key first, then membership: a crash between the two is an
    // orphan key that the gate reads as solo and the next enrol overwrites.
    try {
      identity.saveIdentity(pair.publicKey, pair.privateKey);
    } catch (e) {
      const err = e as Error & { code?: 'keyring_unavailable' | 'keyring_not_encrypting' };
      return { ok: false, error: 'refused', detail: err.message, reason: err.code };
    }
    writeMembership({
      orgId: res.data.orgId,
      memberId: res.data.memberId,
      deviceId: res.data.deviceId,
      orgName: res.data.orgName,
      relayUrl: res.data.relayUrl,
      enrolledAt: res.data.enrolledAt,
      lastVerifiedAt: res.data.enrolledAt,
      lastVerifiedLocalAt: new Date().toISOString(),
      leaseSeconds: LEASE_SECONDS,
    });
    pending = null;

    return {
      ok: true,
      org: { orgId: res.data.orgId, name: res.data.orgName },
      memberId: res.data.memberId,
      deviceId: res.data.deviceId,
      fingerprint: res.data.fingerprint,
    };
  } finally {
    // Either `live` now, or back to `solo` with nothing on disk.
    gate.setEnrolling(false);
  }
}

/** Tests only: the pending sign-in, so a refusal can be shown to leave it alone. */
export function _pendingForTests(): { state: string; hasGrant: boolean } | null {
  return pending ? { state: pending.state, hasGrant: pending.grant != null } : null;
}

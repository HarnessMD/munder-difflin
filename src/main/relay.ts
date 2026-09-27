/**
 * THE RELAY CLIENT. Every request this machine makes to the relay goes through
 * `signedFetch`, and nothing else in the app may call the relay directly.
 *
 * The relay authenticates MACHINES by Ed25519 signature, not by a session. There
 * is no token to leak and no password to reset: possession of the private key,
 * which never leaves `deviceIdentity.ts`, is the whole credential.
 *
 * THE CANONICAL STRING IS THE PART THAT GOES WRONG, and contract 3.1 names both
 * mistakes a client makes first. Getting either wrong produces a signature that
 * is well formed and simply does not verify, and the relay answers one
 * undifferentiated `unauthorized` — deliberately, because distinguishing the
 * failures is an oracle. So a client cannot debug this from the response. It has
 * to be right by construction, which is why it is one function with tests.
 *
 *   MDv1
 *   <METHOD, uppercase>
 *   <path WITH query string, exactly as sent>
 *   <nonce>
 *   <lowercase hex SHA-256 of the raw body, or EMPTY STRING for a GET>
 *   <deviceId, or EMPTY STRING on enrol>
 *
 * ALWAYS SIX LINES.
 *  - On enrol, line six is empty, so the string ENDS IN A NEWLINE. It is six
 *    lines with a blank last one, not five lines.
 *  - On a GET, line five is the EMPTY STRING and NOT the SHA-256 of the empty
 *    string. Those differ, and the second one looks far more correct.
 *
 * Nonces are single use with a 120 second TTL, and the first successful
 * verification deletes one. So every request fetches its own: a retry needs a
 * new nonce, and a replayed signature fails even inside the TTL.
 */

import { app } from 'electron';
import { createHash } from 'node:crypto';
import _sodium from 'libsodium-wrappers';
import { initCrypto, signDetached } from './deviceIdentity';
import { trustFor, youAllowDefault, youAllowFor } from './teamPins';
import { agentNamesFor } from './teamNames';
import { readMembership, touchVerified } from './teamsMembership';
import type { NetworkLevel, Teammate } from '../renderer/src/components/team/types';

/**
 * Where a machine that has not enrolled yet sends its first request. A
 * packaged build talks to the public relay (RELAY-VPS-DEPLOY.md, step 11); a
 * dev build talks to the relay on this machine, which is what every test and
 * the local rehearsal run. `MD_RELAY_URL` overrides both.
 */
const PUBLIC_RELAY_URL = 'https://relay.harnessmd.com';
const LOCAL_RELAY_URL = 'http://127.0.0.1:4312';
const DEFAULT_RELAY_URL = app.isPackaged ? PUBLIC_RELAY_URL : LOCAL_RELAY_URL;

/**
 * The HTTP origin every signed request goes to, and the socket derives its
 * URL from the same answer so the two can never point at different relays.
 *
 * `MD_RELAY_URL` (dev) wins. Otherwise the relay this machine ENROLLED WITH:
 * the 201 on `/enrol` carries `relayUrl` (`wss://host/connect`) and it is in
 * membership.json, so a member talks to the relay that knows their key and
 * not to whatever the build's default happened to be. Before enrolment there
 * is no membership and the default is the only answer.
 */
export function relayHttpUrl(): string {
  const env = process.env.MD_RELAY_URL;
  if (env) return env.replace(/\/+$/, '');
  const ws = readMembership()?.relayUrl;
  if (ws && /^wss?:\/\//.test(ws)) return ws.replace(/^ws/, 'http').replace(/\/connect\/?$/, '').replace(/\/+$/, '');
  return DEFAULT_RELAY_URL;
}

/**
 * THE DEVICE ID ON THE WIRE IS THE RELAY'S, NOT OURS. `deviceIdentity()` carries
 * a locally derived id (the fingerprint, squashed) that keys this machine's own
 * rows; the relay minted a different one at enrol (`dev_` + 22 base58) and
 * refuses every other shape at `/challenge`. It lives in membership.json, and
 * every signed request reads it from there. Sending the local one, which is
 * what this file did before membership.json existed, could never be answered.
 */
function enrolledDeviceId(): string | null {
  return readMembership()?.deviceId ?? null;
}

export interface RelayFailure {
  ok: false;
  /** The relay's machine code. `unauthorized` covers every auth failure on
   *  purpose; do not try to interpret it further. */
  error: string;
  detail: string | null;
  status: number;
}
export type RelayResult<T> = { ok: true; data: T } | RelayFailure;

const fail = (error: string, detail: string | null, status: number): RelayFailure =>
  ({ ok: false, error, detail, status });

/** base64url, no padding — what the relay expects for keys and signatures. */
export function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Build the canonical string. Exported ONLY so it can be tested directly: it is
 * the one piece whose failure mode is invisible from the network.
 */
export function canonicalString(opts: {
  method: string;
  /** Path INCLUDING the query string, exactly as it will be sent. */
  path: string;
  nonce: string;
  /** The raw body bytes as they will be sent, or undefined for a GET. */
  rawBody?: string;
  /** Absent on enrol, where the device does not exist yet. */
  deviceId?: string;
}): string {
  const bodyHash = opts.rawBody === undefined
    // NOT the hash of the empty string. Contract 3.1 calls this out by name.
    ? ''
    : createHash('sha256').update(opts.rawBody, 'utf8').digest('hex');

  return [
    'MDv1',
    opts.method.toUpperCase(),
    opts.path,
    opts.nonce,
    bodyHash,
    opts.deviceId ?? '',
  ].join('\n');
}

/** A nonce, optionally bound to a device so it cannot be spent by another.
 *  Exported for the socket (teamsSession.ts), whose upgrade is a signed GET
 *  that `fetch` cannot make; nothing else may call it. */
export async function getNonce(deviceId?: string): Promise<RelayResult<string>> {
  const path = deviceId
    ? `/challenge?deviceId=${encodeURIComponent(deviceId)}`
    : '/challenge';
  try {
    // Every relay call must fail visibly, never hang (v050-forced-signup, R6):
    // the join door sits on this path, and callers already treat any thrown
    // fetch, an abort included, as a failed result with a retry.
    const res = await fetch(`${relayHttpUrl()}${path}`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return fail('unauthorized', 'could not get a nonce', res.status);
    const body = (await res.json()) as { nonce?: string };
    if (!body.nonce) return fail('server_error', 'the relay sent no nonce', res.status);
    return { ok: true, data: body.nonce };
  } catch (e) {
    return fail('server_error', e instanceof Error ? e.message : String(e), 0);
  }
}

/**
 * One signed request. Fetches its own nonce, because nonces are single use.
 *
 * `signWith` exists for enrolment only: the request is signed by the key being
 * registered, which is how the relay learns the caller holds the private half,
 * and at that moment there is no stored identity to sign with.
 */
export async function signedFetch<T>(opts: {
  method: 'GET' | 'POST' | 'PATCH';
  /** Path with query string, exactly as sent. */
  path: string;
  body?: unknown;
  /** Omit on enrol. */
  deviceId?: string;
  /** Enrolment only: sign with this secret key instead of the stored one. */
  signWith?: Uint8Array;
}): Promise<RelayResult<T>> {
  await initCrypto();

  const nonce = await getNonce(opts.deviceId);
  if (!nonce.ok) return nonce;

  // Serialise ONCE and send exactly these bytes. Re-serialising would change the
  // whitespace and the body hash with it, for the same reason the Razorpay
  // webhook must not re-serialise.
  const rawBody = opts.body === undefined ? undefined : JSON.stringify(opts.body);

  const canonical = canonicalString({
    method: opts.method,
    path: opts.path,
    nonce: nonce.data,
    rawBody,
    deviceId: opts.deviceId,
  });

  const signature = await signDetached(canonical, opts.signWith);
  if (!signature) return fail('unauthorized', 'no signing key on this machine', 0);

  try {
    const res = await fetch(`${relayHttpUrl()}${opts.path}`, {
      method: opts.method,
      headers: {
        ...(rawBody === undefined ? {} : { 'content-type': 'application/json' }),
        'x-md-nonce': nonce.data,
        'x-md-signature': b64url(signature),
        ...(opts.deviceId ? { 'x-md-device': opts.deviceId } : {}),
      },
      body: rawBody,
      // Same rule as getNonce above: a signed call (enrol included) times out
      // rather than hanging a door; the catch below turns it into a result.
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 204) {
      if (opts.deviceId) touchVerified(res.headers.get('date'));
      return { ok: true, data: undefined as T };
    }
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* not json */ }

    if (!res.ok) {
      const e = parsed as { error?: string; detail?: string | null } | null;
      return fail(e?.error ?? 'server_error', e?.detail ?? null, res.status);
    }
    // Plan 4.2: a successful signed response is proof of live membership, and
    // the lease of 2.3 is measured from it. Recorded here, on the one path every
    // signed request shares; not read back by anything until Phase 1.
    if (opts.deviceId) touchVerified(res.headers.get('date'));
    return { ok: true, data: parsed as T };
  } catch (e) {
    return fail('server_error', e instanceof Error ? e.message : String(e), 0);
  }
}

/* ---- the endpoints D7-D15 need ---------------------------------------------- */

/**
 * The roster, as the LIVE relay actually returns it — verified against 4312, not
 * transcribed from the contract. It is nested and it carries `org` and `you`
 * alongside the members, which a flat `items` array would have lost.
 *
 * `theyAllow` is per MEMBER and `youAllow` is nowhere: contract 0.3 keeps your
 * personal override on this machine, because a field we decline to store is a
 * field a relay compromise cannot leak. Do not add it here.
 *
 * `verified` and `previousFingerprint` are also absent, per 0.4 — a relay that
 * could set `verified` could clear it, so trust-on-first-use is pinned locally
 * and D13 renders a change the local pin noticed.
 */
export interface RelayDevice {
  deviceId: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  presence: 'online' | 'offline';
  lastSeenAt: string | null;
}

export interface RelayMember {
  memberId: string;
  name: string | null;
  theyAllow: 'strict' | 'communication-only' | 'allow-all';
  suspended: boolean;
  /** Up to five. A person's machines cost one seat between them, per 0.4. */
  devices: RelayDevice[];
  /** The relay marks your own row rather than making the client compare ids. */
  isSelf: boolean;
  /** Their orchestrator's nickname (Amendment 6). Absent on an older relay. */
  bossName?: string | null;
  /** 0.5.2: would that seat take a message from THIS machine right now, as
   *  the door they published (`patchMe({ receive })`) says. Absent on an older
   *  relay, and then nothing is predicted. */
  receiving?: boolean;
}

export interface RelayRoster {
  org: { orgId: string; name: string; seatsUsed: number; seatsPaid: number;
         defaultPermission: 'strict' | 'communication-only' | 'allow-all' };
  you: { memberId: string; deviceId: string };
  members: RelayMember[];
}

/** D7, D8, D9. One read for the whole roster. */
export function fetchRoster() {
  const deviceId = enrolledDeviceId();
  if (!deviceId) return Promise.resolve(fail('unauthorized', 'not enrolled', 0));
  return signedFetch<RelayRoster>({ method: 'GET', path: '/roster', deviceId });
}

/** One stored envelope, as `/queue` items and `envelope` frames both carry it
 *  (contract 3.4, 3.6; the frame adds `t` and is otherwise the same object). */
export interface QueueEnvelope {
  envelopeId: string;
  fromDeviceId: string;
  fromMemberId: string;
  ciphertext: string;
  nonce: string;
  senderSignature: string;
  threadId: string;
  sentAt: string;
  expiresAt: string;
}

/** A pending approval request as `/queue` lists it beside the envelopes
 *  (D10, Phase 2 reads these; Phase 1 only puts them on disk). */
export interface QueueRequest {
  requestId: string;
  fromMemberId: string;
  fromDeviceId: string;
  type: string;
  ciphertext: string;
  nonce: string;
  senderSignature: string;
  at: string;
  expiresAt: string;
  expired: boolean;
}

/**
 * D11. Drain what arrived while this machine was offline. READING DOES NOT
 * DELETE (contract 3.6): `ack` names the envelopes already written to disk by
 * the previous round, and the relay deletes those before answering. A crash
 * between the response and the disk write leaves the envelope on the relay,
 * which is the property the contract asks for.
 */
export function drainQueue(ack: string[] = []) {
  const deviceId = enrolledDeviceId();
  if (!deviceId) return Promise.resolve(fail('unauthorized', 'not enrolled', 0));
  const path = ack.length ? `/queue?ack=${encodeURIComponent(ack.join(','))}` : '/queue';
  return signedFetch<{ items: QueueEnvelope[]; nextCursor: string | null; requests?: QueueRequest[] }>({
    method: 'GET', path, deviceId,
  });
}

/**
 * D11 / 4.6. Store and forward one ciphertext to every device of a person
 * (contract 3.5). ONE call per message: the bridge builds a ciphertext every
 * listed device can open. 202 is accepted, not delivered.
 */
export function postEnvelope(body: {
  toDeviceIds: string[]; ciphertext: string; nonce: string; senderSignature: string;
  threadId: string; sentAt: string;
}) {
  const deviceId = enrolledDeviceId();
  if (!deviceId) return Promise.resolve(fail('unauthorized', 'not enrolled', 0));
  return signedFetch<{ envelopeIds: Record<string, string>; delivered: string[]; queued: string[] }>({
    method: 'POST', path: '/envelope', body, deviceId,
  });
}

/** D10 / 4.6. An approval request to a person, fanned out by the relay to
 *  their devices (contract 3.8). `type` is the only thing in clear. */
export function postRequest(body: {
  toMemberId: string; type: 'run-task' | 'share-context' | 'join-thread';
  ciphertext: string; nonce: string; senderSignature: string; expiresAt: string;
}) {
  const deviceId = enrolledDeviceId();
  if (!deviceId) return Promise.resolve(fail('unauthorized', 'not enrolled', 0));
  return signedFetch<{ requestId: string; delivered: string[]; queued: string[] }>({
    method: 'POST', path: '/request', body, deviceId,
  });
}

/**
 * `GET /me` (plan 4.4, server item S2): the one signed read that carries the
 * org's identity, policy and state, and this device's membership state with
 * its reason. S2 is WRITTEN (teams-backend API-CONTRACT 3.9, 2 Sep 2026):
 * the relay answers in report mode, so a suspended seat and a halted org
 * come back as facts in the body, not as 401 / 402. An older relay still
 * answers `not_found`, and every caller treats that as "not reported yet".
 * `org.signingKey` is the org key FINGERPRINT (six groups of four), which is
 * what the relay stores; teamsOrg.keyGroups passes that form through.
 */
export type { BillingState } from '../shared/teams';
import type { BillingState } from '../shared/teams';

export interface MeResponse {
  org: {
    orgId: string;
    name: string;
    /** The org's Ed25519 signing key, base64url. Pinned locally on first sight. */
    signingKey: string;
    defaultPermission: 'strict' | 'communication-only' | 'allow-all';
    requireFingerprint: boolean;
    entitlement: { state: BillingState; trialEndsAt: string | null; graceEndsAt: string | null };
    seatsUsed?: number;
    seatsPaid?: number;
  };
  you: {
    memberId: string; deviceId: string; name: string | null; email: string | null; isAdmin: boolean; theyAllowDefault?: boolean;
    /** Your orchestrator's nickname (Amendment 6). Absent on an older relay. */
    bossName?: string | null;
    /** 0.5.2: the inbound door this seat last published, echoed back. */
    receive?: ReceivePublication | null;
  };
  membership: 'active' | 'suspended' | 'removed';
  serverTime: string;
  leaseSeconds?: number;
}

export function fetchMe() {
  const deviceId = enrolledDeviceId();
  if (!deviceId) return Promise.resolve(fail('unauthorized', 'not enrolled', 0));
  return signedFetch<MeResponse>({ method: 'GET', path: '/me', deviceId });
}

/**
 * 0.5.2: this seat's inbound door, as THIS MACHINE enforces it, published so
 * a sender is refused by the relay instead of told "delivered" for a message
 * the recipient's bridge was always going to drop. `default` is the answer
 * for everyone not listed; `members` are the exceptions, at most 200. The
 * bridge builds it from the same policy the inbound gate reads
 * (`teamsBridge.receivePublication`), so the two cannot disagree.
 */
export interface ReceivePublication {
  default: boolean;
  members: Record<string, boolean>;
}

/**
 * The three bodies `PATCH /me` takes, EXACTLY ONE per call: the relay refuses
 * a body with two of them. `bossName` is Amendment 6; `name` (0.5.2) is the
 * PERSON's display name, 1..80 after trim, null clears it; `receive` is the
 * inbound door above.
 */
export type MePatch =
  | { bossName: string | null }
  | { name: string | null }
  | { receive: ReceivePublication };

/**
 * `PATCH /me` (Amendment 6, widened in 0.5.2): claim or clear this seat's
 * orchestrator nickname, set the person's name, or publish the receive door.
 * Null clears. 200 is the full `/me` body, `you.name` and `you.receive`
 * echoed. `conflict` names the holder in `detail`; `not_found` is an older
 * relay with no such route, and an older relay that HAS the route but not
 * the field answers `invalid_body` with `unknown field: name` or `unknown
 * field: receive` in the detail. Callers treat both as "not supported yet",
 * never as a refusal.
 */
export function patchMe(body: MePatch) {
  const deviceId = enrolledDeviceId();
  if (!deviceId) return Promise.resolve(fail('unauthorized', 'not enrolled', 0));
  return signedFetch<MeResponse>({ method: 'PATCH', path: '/me', body, deviceId });
}

/**
 * `GET /billing` (API-CONTRACT 3.10, PRO phase 5): the admin's billing view.
 * The relay refuses a member's device with `forbidden`; main refuses before
 * asking (the second wall, index.ts `billing:summary`). The body is validated
 * by shared/billing.ts `parseBillingWire`, never trusted as typed.
 */
export function fetchBilling() {
  const deviceId = enrolledDeviceId();
  if (!deviceId) return Promise.resolve(fail('unauthorized', 'not enrolled', 0));
  return signedFetch<unknown>({ method: 'GET', path: '/billing', deviceId });
}

/** The relay's 201 on `/enrol`, as `relay/server.mjs` actually builds it. */
export interface EnrolResponse {
  deviceId: string;
  memberId: string;
  orgId: string;
  orgName: string;
  fingerprint: string;
  /** `wss://…/connect`: the socket, for Phase 1. */
  relayUrl: string;
  enrolledAt: string;
}

/**
 * D3. Redeem an invite and register this machine's public key.
 *
 * `grant` is the Clerk sign-in's one-time token (plan 2.2, server item S10).
 * It is sent ONLY when present: the field is serialised into the body and the
 * body is hashed into the signature, so an `undefined` that JSON.stringify
 * drops and a key that is simply absent are the same bytes, but an explicit
 * `null` would not be, and the live relay's `noExtras` would refuse it.
 */
export function enrol(body: {
  /** Absent for a second machine (plan 4.8): the grant alone names the seat. */
  code?: string; publicKey: string; deviceName: string;
  os: string; appVersion: string; displayName?: string; grant?: string;
}, signWith: Uint8Array) {
  return signedFetch<EnrolResponse>({ method: 'POST', path: '/enrol', body, signWith });
}

/** libsodium is loaded here too so callers do not have to. */
export async function ready(): Promise<void> {
  await initCrypto();
  await _sodium.ready;
}

/* ---- the roster, as the screens need it ------------------------------------- */

/**
 * Map the relay's roster onto the shape D7/D8/D9 render.
 *
 * THE JOIN IS THE POINT. Three fields do not come from the relay and must not:
 * `youAllow` is your local override (0.3), and `verified` / `previousFingerprint`
 * are trust on first use pinned on this machine (0.4). They are read from
 * `teamPins` here, so there is exactly one place where local trust meets remote
 * data and it is visible.
 *
 * A person may have up to five machines. The roster is per PERSON, so the row
 * shows the machine they are actually on: newest `lastSeenAt` first, the same
 * rule the console uses.
 */
/** One of YOUR machines, for S1's device list (plan 4.8, Pam's S1). */
export interface OwnDevice {
  deviceId: string;
  name: string;
  presence: 'online' | 'offline';
  lastSeenAt: string | null;
  /** The machine this is running on. */
  isThis: boolean;
}

export async function teamRoster(): Promise<RelayResult<{
  org: RelayRoster['org'];
  teammates: Teammate[];
  self: Teammate | null;
  /** Every machine enrolled under this person, this one marked. */
  selfDevices: OwnDevice[];
  /** What this machine allows a teammate with no override: your own default
   *  if you set one, else the org default. The self row and the Network
   *  section's top card show and set it; `overridden` is measured against it. */
  yourDefault: NetworkLevel;
}>> {
  const r = await fetchRoster();
  if (!r.ok) return r;

  const rows: Teammate[] = [];
  let self: Teammate | null = null;
  const thisDevice = enrolledDeviceId();
  const yourDefault: NetworkLevel = youAllowDefault() ?? r.data.org.defaultPermission;
  const selfDevices: OwnDevice[] = (r.data.members.find((m) => m.isSelf)?.devices ?? [])
    .map((d) => ({ deviceId: d.deviceId, name: d.name, presence: d.presence, lastSeenAt: d.lastSeenAt, isThis: d.deviceId === thisDevice }))
    .sort((a, b) => Number(b.isThis) - Number(a.isThis) || new Date(b.lastSeenAt ?? 0).getTime() - new Date(a.lastSeenAt ?? 0).getTime());

  for (const m of r.data.members) {
    const device = [...m.devices].sort(
      (a, b) => new Date(b.lastSeenAt ?? 0).getTime() - new Date(a.lastSeenAt ?? 0).getTime()
    )[0];
    // A member with no enrolled machine has no key to trust and no presence to
    // report. They are on the roster in the console as a pending invite; here
    // they are simply not a machine yet.
    if (!device) continue;

    const trust = trustFor(device.deviceId, device.fingerprint);
    const override = youAllowFor(m.memberId);

    const mate: Teammate = {
      id: m.memberId,
      /**
       * NEVER THE EMPTY STRING (founder, 6 Sep 2026, item 10). `RelayMember.name`
       * is nullable and the console does not always hold a display name, so
       * `?? ''` handed every surface a blank: the thread title read "Your
       * Michael and 's Dwight", the avatar glyph had no letter, and
       * `name.split(' ')[0]` in the offline notice produced nothing at all.
       *
       * The fallback is their MACHINE, which is the only other human-readable
       * thing the relay gives us about them and, unlike a generic word, still
       * tells two nameless teammates apart. Done here rather than in each
       * renderer so the five surfaces that show a teammate cannot drift into
       * five different fallbacks.
       */
      name: m.name?.trim() || device.name,
      // 0.5.2: the screens need to know the fallback is in play, so the self
      // row can ask for a name and a teammate row can say there is none.
      ...(m.name?.trim() ? {} : { unnamed: true }),
      machine: device.name,
      /* ONLINE WHEN ANY DEVICE IS, per the contract's mapping note — not the
         primary device's presence. Those differ when someone's newest machine
         is asleep and an older one is awake, and reporting them offline when
         they are reachable is the wrong direction to be wrong in. */
      presence: m.suspended
        ? 'offline'
        : (m.devices.some((d) => d.presence === 'online') ? 'online' : 'offline'),
      theyAllow: m.theyAllow,
      youAllow: override ?? yourDefault,
      overridden: override !== undefined && override !== yourDefault,
      fingerprint: device.fingerprint,
      verified: trust.verified,
      previousFingerprint: trust.previousFingerprint,
      isSelf: m.isSelf,
      deviceId: device.deviceId,
      // Amendment 6. An older relay omits it; the renderer draws no chip then.
      bossName: m.bossName ?? null,
      // 0.5.2: the door they published, for the row's prediction. Absent on
      // an older relay, and then the row predicts nothing beyond `theyAllow`.
      ...(typeof m.receiving === 'boolean' ? { receiving: m.receiving } : {}),
    };
    // 0.5.2: what their agents are called, as sealed messages from them have
    // said. Local memory (teamNames.ts); the relay never carried it.
    const agents = agentNamesFor(m.memberId);
    if (agents.length) mate.agents = agents;

    if (m.isSelf) self = mate;
    else rows.push(mate);
  }

  return { ok: true, data: { org: r.data.org, teammates: rows, self, selfDevices, yourDefault } };
}

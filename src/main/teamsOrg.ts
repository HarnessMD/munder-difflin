/**
 * THE ORG CHANNEL (plan 4.4; Pam's spine, UI-PLAN-teams-v2 §2). Four things
 * the org must be able to tell a member's machine, and a fifth: its identity
 * (name AND signing key), its policy, its state, and this device's membership
 * with its reason. All five are one signed read, `GET /me`.
 *
 * S2 IS WRITTEN (teams-backend API-CONTRACT 3.9, 2 Sep 2026) to this shape,
 * with two facts the plan did not have: `signingKey` is the org key
 * FINGERPRINT (six groups of four, what the relay stores), and seat counts
 * come only to admins. An older relay answers `not_found`, and this file then
 * reports the org as `available: false`: the name from enrolment shows, and
 * every row that would need the wire is honestly absent rather than guessed.
 *
 * WHAT IT DOES WITH THE ANSWER:
 *   - pins `org.signingKey` on first sight, unverified, beside the device pins
 *     (`teamPins.orgTrustFor`); a DIFFERENT key for the same org later is D13
 *     for the org itself and S1 shows both;
 *   - writes `leaseSeconds` into membership.json when the org sets one, which
 *     is the seam plan 2.3 leaves for an org-configurable lease;
 *   - tells the gate the membership state WITH ITS REASON: `suspended`,
 *     `removed`, or an entitlement that is not trialing or healthy, so the
 *     takeover renders Pam's three copies instead of "ended or paused"; and
 *     clears a `stopped` the socket could only call unknown when `/me` says
 *     the seat is active;
 *   - polls on connect, every quarter hour while connected, on every `stopped`
 *     (that is where the reason comes from), and hourly once the plan lapsed
 *     so the day the org pays it comes back on its own.
 *
 * The consequence of `requireFingerprint` lives in teamsBridge.send: a
 * message to a teammate whose key this person has not verified is refused
 * with the reason, when the policy is on. A policy row without that is the
 * defect being fixed.
 */
import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fetchMe, type MeResponse } from './relay';
import { fingerprintFor } from './deviceIdentity';
import { markOrgVerified, orgTrustFor } from './teamPins';
import { readMembership, writeMembership } from './teamsMembership';
import * as gate from './teamsGate';
import * as session from './teamsSession';
import type { BillingState, OrgView } from '../shared/teams';

export const TUNING = {
  /** The `/me` cadence on a live socket (plan 4.4). */
  pollMs: 15 * 60_000,
  /** Once the plan lapsed: the org's problem, re-asked hourly. */
  lapsedPollMs: 60 * 60_000,
};

const ACTIVE: readonly BillingState[] = ['trialing', 'healthy'];
const isStr = (v: unknown): v is string => typeof v === 'string';

/** The six groups a person reads aloud. The relay sends them AS the six
 *  groups (contract 3.9: the org has no raw key on the wire), so that form
 *  passes through; a base64url key, should one ever arrive, is digested the
 *  way a device key is. */
export const KEY_GROUPS_RE = /^[0-9A-F]{4}( [0-9A-F]{4}){5}$/;
export function keyGroups(signingKey: string): string {
  if (KEY_GROUPS_RE.test(signingKey)) return signingKey;
  const b64 = signingKey.replace(/-/g, '+').replace(/_/g, '/');
  return fingerprintFor(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
}

/** `<userData>/teams/org.json`: the last `/me` answer, 0600 like its neighbours. */
interface OrgFile {
  orgId: string;
  name: string;
  signingKey: string;
  defaultPermission: 'strict' | 'communication-only' | 'allow-all';
  requireFingerprint: boolean;
  entitlement: { state: BillingState; trialEndsAt: string | null; graceEndsAt: string | null };
  seatsUsed: number | null;
  seatsPaid: number | null;
  you: { name: string | null; email: string | null; isAdmin: boolean };
  membership: 'active' | 'suspended' | 'removed';
  fetchedAt: string;
}

function filePath(): string {
  return join(app.getPath('userData'), 'teams', 'org.json');
}

function readFile(): OrgFile | null {
  const p = filePath();
  if (!existsSync(p)) return null;
  try {
    const f = JSON.parse(readFileSync(p, 'utf8')) as Partial<OrgFile>;
    if (!f || !isStr(f.orgId) || !isStr(f.name) || !isStr(f.signingKey) || !f.entitlement || !f.you) return null;
    return f as OrgFile;
  } catch {
    return null;
  }
}

function writeFile(f: OrgFile): void {
  const p = filePath();
  mkdirSync(dirname(p), { recursive: true, mode: 0o700 });
  writeFileSync(`${p}.tmp`, JSON.stringify(f, null, 2), { encoding: 'utf8', mode: 0o600 });
  renameSync(`${p}.tmp`, p);
}

/** The file, only if it is about the org this machine is enrolled in. */
function current(): OrgFile | null {
  const m = readMembership();
  const f = readFile();
  return m && f && f.orgId === m.orgId ? f : null;
}

const subscribers = new Set<(v: OrgView) => void>();

export function onChange(fn: (v: OrgView) => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

function notify(): void {
  const v = view();
  subscribers.forEach((fn) => fn(v));
}

export function view(): OrgView {
  const m = readMembership();
  const empty: OrgView = {
    available: false, orgId: m?.orgId ?? '', name: m?.orgName ?? '',
    signingKey: null, keyGroups: null, keyVerified: false, keyPreviousGroups: null,
    defaultPermission: null, requireFingerprint: null, entitlement: null,
    seatsUsed: null, seatsPaid: null, you: null, membership: null, fetchedAt: null,
  };
  const f = current();
  if (!f) return empty;
  const trust = orgTrustFor(f.orgId, f.signingKey);
  return {
    available: true, orgId: f.orgId, name: f.name,
    signingKey: f.signingKey, keyGroups: keyGroups(f.signingKey), keyVerified: trust.verified,
    keyPreviousGroups: trust.previous ? keyGroups(trust.previous) : null,
    defaultPermission: f.defaultPermission, requireFingerprint: f.requireFingerprint,
    entitlement: f.entitlement, seatsUsed: f.seatsUsed, seatsPaid: f.seatsPaid,
    you: f.you, membership: f.membership, fetchedAt: f.fetchedAt,
  };
}

/** The policy in effect, for the bridge. Null until the relay reports one. */
export function policy(): { defaultPermission: OrgFile['defaultPermission']; requireFingerprint: boolean } | null {
  const f = current();
  return f ? { defaultPermission: f.defaultPermission, requireFingerprint: f.requireFingerprint } : null;
}

export type RefreshOutcome = 'updated' | 'unavailable' | 'refused' | 'offline';

/**
 * One `/me` read, applied. `unavailable` is today's relay (no route);
 * `refused` is a 401, which the socket's own path interprets; `offline` is
 * anything else, and the last answer stands.
 */
export async function refresh(): Promise<RefreshOutcome> {
  const m = readMembership();
  if (!m) return 'unavailable';
  const r = await fetchMe();
  if (!r.ok) {
    if (r.status === 404 || r.error === 'not_found') return 'unavailable';
    if (r.status === 401) return 'refused';
    return 'offline';
  }
  const me = r.data;
  if (!valid(me)) return 'offline';

  writeFile({
    orgId: me.org.orgId, name: me.org.name, signingKey: me.org.signingKey,
    defaultPermission: me.org.defaultPermission, requireFingerprint: !!me.org.requireFingerprint,
    entitlement: {
      state: me.org.entitlement.state,
      trialEndsAt: isStr(me.org.entitlement.trialEndsAt) ? me.org.entitlement.trialEndsAt : null,
      graceEndsAt: isStr(me.org.entitlement.graceEndsAt) ? me.org.entitlement.graceEndsAt : null,
    },
    seatsUsed: typeof me.org.seatsUsed === 'number' ? me.org.seatsUsed : null,
    seatsPaid: typeof me.org.seatsPaid === 'number' ? me.org.seatsPaid : null,
    you: { name: isStr(me.you.name) ? me.you.name : null, email: isStr(me.you.email) ? me.you.email : null, isAdmin: !!me.you.isAdmin },
    membership: me.membership,
    fetchedAt: isStr(me.serverTime) ? me.serverTime : new Date().toISOString(),
  });

  // The org's lease, if it sets one (plan 2.3's "org-configurable later").
  if (typeof me.leaseSeconds === 'number' && me.leaseSeconds > 0 && me.leaseSeconds !== m.leaseSeconds) {
    writeMembership({ ...m, leaseSeconds: me.leaseSeconds });
  }

  // Pins on first sight; notes a change. The view reads the result.
  orgTrustFor(me.org.orgId, me.org.signingKey);

  // Membership state with its reason (plan 4.5 with S2). This is the org's
  // word about this seat and it outranks what the socket could infer.
  if (me.membership === 'suspended') gate.setRevoked('suspended');
  else if (me.membership === 'removed') gate.setRevoked('removed');
  else if (!ACTIVE.includes(me.org.entitlement.state)) gate.setRevoked('entitlement');
  else if (gate.revokedReason()) gate.setRevoked(null);

  notify();
  schedule();
  return 'updated';
}

function valid(me: MeResponse): boolean {
  return !!me && !!me.org && isStr(me.org.orgId) && isStr(me.org.name) && isStr(me.org.signingKey)
    && ['strict', 'communication-only', 'allow-all'].includes(me.org.defaultPermission)
    // FIVE states, not four. `awaiting-card` is where every org is created and
    // where it stays until a payment is confirmed. Leaving it out of this list
    // meant `valid()` threw away the whole `/me` response for exactly the orgs
    // that had just signed up, so `org.json` was never written, `useOrg()` was
    // null, and `useStanding()` could not resolve 'admin'. The person who had
    // just paid could not see their own org.
    && !!me.org.entitlement && ['awaiting-card', 'trialing', 'healthy', 'payment-failed', 'cancelled'].includes(me.org.entitlement.state)
    && !!me.you && ['active', 'suspended', 'removed'].includes(me.membership);
}

/** S1's Verify: a person read the six groups to their admin. */
export function verifyKey(): { ok: boolean } {
  const f = current();
  if (!f) return { ok: false };
  markOrgVerified(f.orgId, f.signingKey);
  notify();
  return { ok: true };
}

/* ---- the poll ------------------------------------------------------------- */

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

function schedule(): void {
  if (!running) return;
  if (timer) clearInterval(timer);
  const f = current();
  const lapsed = !!f && !ACTIVE.includes(f.entitlement.state);
  timer = setInterval(() => { void refresh(); }, lapsed ? TUNING.lapsedPollMs : TUNING.pollMs);
  timer.unref?.();
}

/** Runs while the machine is enrolled. Returns the stop. */
export function start(): () => void {
  if (running) return stop;
  running = true;
  const off = session.onChange((v) => {
    // Connected: the org may have changed while we were away. Stopped: the
    // reason lives here, not in the close code.
    if (v.state === 'connected' || v.state === 'stopped') void refresh();
  });
  void refresh();
  schedule();
  return () => { off(); stop(); };
}

function stop(): void {
  running = false;
  if (timer) clearInterval(timer);
  timer = null;
}

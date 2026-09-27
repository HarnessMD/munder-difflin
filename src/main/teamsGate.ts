/**
 * THE GATE. One function, one answer, read by App.tsx before anything Teams
 * renders (plan section 5).
 *
 *   solo       no membership AND no identity   → the app as shipped today
 *   enrolling  a sign-in or an enrol is in flight on this machine
 *   live       membership, the device key, and a lease younger than 24h
 *   degraded   the lease is older than the warning threshold: live, plus a banner
 *   locked     the lease expired, the local clock went backwards, or the
 *              relay stopped this seat (plan 4.5) → the takeover
 *
 * THE SOLO PATH IS UNTOUCHED. `mode()` reaches `hasIdentity()` and one
 * `existsSync`, both side-effect free, and nothing else runs. A machine that
 * never joins never loads libsodium, never generates a key, never writes a
 * file (brief D3).
 *
 * TWO ORPHAN STATES, BOTH ANSWERED `solo`, BOTH ON PURPOSE. A key file without a
 * membership file is a machine that ran the pre-Phase-0 build (which generated
 * a key with no relay behind it) or crashed between the two writes; a
 * membership file without a key cannot sign anything. Neither can act as a
 * member, so neither is told it is one. The next enrol overwrites both files,
 * which is the whole repair. When the honest state is unknown, claim less.
 *
 * THE LEASE (plan 2.3, DEFAULT NOT RULING: the constants live in
 * teamsMembership.ts). Age is measured from `lastVerifiedAt`, which is the
 * RELAY's clock at the last proof of membership, against the local clock now.
 * A few seconds of skew between the two is noise against 24 and 72 hours.
 *
 * THE CLOCK RULE, and why it compares the local clock with ITSELF. A lease on
 * wall-clock time can be extended by setting the clock back, so the plan says:
 * if local time is ever earlier than the last proof, lock. Compared across
 * clocks that would lock a laptop whose relay runs a few minutes ahead, which
 * is an honest machine. So membership.json also carries the LOCAL time of
 * that proof, and the rule is: local now earlier than local then, by more
 * than the tolerance, is a clock set back, and a set-back clock is a lockout
 * rather than an extension. Setting the clock FORWARD only shortens the lease,
 * which harms nobody but the person doing it.
 */
import { hasIdentity } from './deviceIdentity';
import { readMembership, LEASE_WARN_SECONDS, type Membership } from './teamsMembership';
import type { LockInfo, StopReason, TeamsMode } from '../shared/teams';

/** How far the local clock may sit BEHIND its own last stamp before that reads
 *  as tampering. Five minutes is far beyond NTP drift and far short of useful. */
export const CLOCK_BACK_TOLERANCE_SECONDS = 5 * 60;

let enrolling = false;
/** Set by the session when the relay stopped this seat; cleared on the next `ready`. */
let revoked: StopReason | null = null;
let clock: ReturnType<typeof setInterval> | null = null;
let lastAnswer: TeamsMode | null = null;
const subscribers = new Set<(mode: TeamsMode) => void>();

/** Pure: the lease's answer for one membership at one instant. Exported so
 *  the tests can walk the clock without touching a file or a timer. */
export function leaseState(m: Membership, now: number = Date.now()): 'live' | 'degraded' | 'locked' {
  const at = Date.parse(m.lastVerifiedAt);
  if (!Number.isFinite(at)) return 'locked';
  const localAt = Date.parse(m.lastVerifiedLocalAt);
  if (Number.isFinite(localAt) && now < localAt - CLOCK_BACK_TOLERANCE_SECONDS * 1000) return 'locked';
  const age = (now - at) / 1000;
  if (age > m.leaseSeconds) return 'locked';
  if (age > LEASE_WARN_SECONDS) return 'degraded';
  return 'live';
}

export function mode(): TeamsMode {
  if (enrolling) return 'enrolling';
  const m = readMembership();
  if (!m || !hasIdentity()) return 'solo';
  if (revoked) return 'locked';
  return leaseState(m);
}

/** Why `locked`, for the takeover. Null whenever the answer is not `locked`. */
export function lockInfo(): LockInfo | null {
  if (enrolling) return null;
  const m = readMembership();
  if (!m || !hasIdentity()) return null;
  if (revoked) return { kind: 'revoked', reason: revoked, orgName: m.orgName, lastVerifiedAt: m.lastVerifiedAt };
  if (leaseState(m) === 'locked') return { kind: 'lease', reason: null, orgName: m.orgName, lastVerifiedAt: m.lastVerifiedAt };
  return null;
}

/** The sign-in / enrol round trip is in flight. Renderer sees `enrolling`. */
export function setEnrolling(on: boolean): void {
  if (enrolling === on) return;
  enrolling = on;
  notify();
}

/** The session's word: the relay stopped this seat (reason), or a `ready`
 *  frame proved it is live again (null). */
export function setRevoked(reason: StopReason | null): void {
  if (revoked === reason) return;
  revoked = reason;
  notify();
}

export function revokedReason(): StopReason | null {
  return revoked;
}

/** Push the current answer to everyone listening. Called after any write. */
export function notify(): void {
  const m = mode();
  lastAnswer = m;
  subscribers.forEach((fn) => fn(m));
}

/** Re-read after a proof of membership; push only if the answer moved. */
export function refresh(): void {
  if (mode() !== lastAnswer) notify();
}

export function onChange(fn: (mode: TeamsMode) => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

/**
 * The lease moves on its own. An app left open on a laptop with no network
 * crosses 24 hours and then 72 with no request in between to re-read the
 * file, so something has to look at the clock. Once a minute is plenty for
 * thresholds measured in days; it pushes only when the answer changes.
 */
export function startLeaseClock(intervalMs: number = 60_000): void {
  if (clock) return;
  lastAnswer = mode();
  clock = setInterval(() => {
    const m = mode();
    if (m !== lastAnswer) notify();
  }, intervalMs);
  clock.unref?.();
}

export function stopLeaseClock(): void {
  if (clock) clearInterval(clock);
  clock = null;
}

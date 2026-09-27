/**
 * membership.json: what this machine knows about the team it belongs to.
 *
 * `<userData>/teams/membership.json`, beside the device key and the trust
 * pins. It is NOT secret, but it is the gate's input, and a file the gate reads
 * that another process can rewrite unnoticed is not a gate, so it is 0600 like
 * its neighbours.
 *
 * THE ONE FIELD THAT MATTERS MOST IS `deviceId`. The relay mints it at enrol
 * (`dev_` plus 22 base58 characters) and refuses any other shape on every
 * signed request. `deviceIdentity.ts` also has a `deviceId`, derived locally
 * from the fingerprint, and the two are NOT the same value: the local one keys
 * this machine's own rows, the relay's one is what goes in `x-md-device`. Before
 * this file existed the relay client sent the local one and could never have
 * been answered. Every signed request now reads THIS file for its device id.
 *
 * `lastVerifiedAt` and `leaseSeconds` are the offline lease of plan 2.3. In
 * Phase 0 they are RECORDED, NOT ENFORCED: every successful signed response
 * moves `lastVerifiedAt` forward, and nothing yet reads it back to lock the
 * app. The two constants below are the seam for that ruling, which the founder
 * has not made; they are a reversible default, not a decision.
 */
import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** 2.3, DEFAULT NOT RULING: 72 hours of local use without reaching the relay. */
export const LEASE_SECONDS = 72 * 3600;
/** 2.3, DEFAULT NOT RULING: the banner starts at 24 hours. */
export const LEASE_WARN_SECONDS = 24 * 3600;

export interface Membership {
  orgId: string;
  memberId: string;
  /** THE RELAY'S device id. See the header. */
  deviceId: string;
  orgName: string;
  /** The socket URL the relay told us at enrol, `wss://.../connect`. */
  relayUrl: string;
  enrolledAt: string;
  /** Server time of the last successful signed response. */
  lastVerifiedAt: string;
  /**
   * LOCAL wall clock at that same moment. The lease is measured on the relay's
   * clock; this one exists only so the gate can notice the local clock moving
   * BACKWARDS relative to itself (plan 2.3, clock tampering) without comparing
   * two clocks that may legitimately disagree by a few seconds.
   */
  lastVerifiedLocalAt: string;
  leaseSeconds: number;
  /**
   * 0.4.9 nickname: the enrol-time claim of the orchestrator's name was
   * refused (`conflict`), so this seat has no nickname yet and the Team
   * screen's self row asks for one. Cleared by the first successful claim.
   * Present only while true, so an older file reads back unchanged.
   */
  bossNameNeeded?: boolean;
}

function filePath(): string {
  return join(app.getPath('userData'), 'teams', 'membership.json');
}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function readMembership(): Membership | null {
  const p = filePath();
  if (!existsSync(p)) return null;
  try {
    const m = JSON.parse(readFileSync(p, 'utf8')) as Partial<Membership> | null;
    if (!m || !isStr(m.orgId) || !isStr(m.memberId) || !isStr(m.deviceId)
        || !isStr(m.orgName) || !isStr(m.enrolledAt)) {
      return null;
    }
    return {
      orgId: m.orgId, memberId: m.memberId, deviceId: m.deviceId, orgName: m.orgName,
      relayUrl: isStr(m.relayUrl) ? m.relayUrl : '',
      enrolledAt: m.enrolledAt,
      lastVerifiedAt: isStr(m.lastVerifiedAt) ? m.lastVerifiedAt : m.enrolledAt,
      // An older file has no local stamp; the server one is the honest default,
      // and a few seconds of skew is inside the gate's tolerance.
      lastVerifiedLocalAt: isStr(m.lastVerifiedLocalAt) ? m.lastVerifiedLocalAt
        : (isStr(m.lastVerifiedAt) ? m.lastVerifiedAt : m.enrolledAt),
      leaseSeconds: typeof m.leaseSeconds === 'number' && m.leaseSeconds > 0 ? m.leaseSeconds : LEASE_SECONDS,
      ...(m.bossNameNeeded === true ? { bossNameNeeded: true } : {}),
    };
  } catch {
    return null;
  }
}

export function writeMembership(m: Membership): void {
  const p = filePath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(m, null, 2), { encoding: 'utf8', mode: 0o600 });
}

/**
 * 0.4.9 nickname: remember that this seat still owes the org a unique name for
 * its orchestrator (the enrol-time claim was refused), or that it no longer
 * does. A no-op when there is no membership, so a solo machine never grows the
 * flag. The flag is written only when true, so an older file round trips.
 */
export function setBossNameNeeded(needed: boolean): void {
  const m = readMembership();
  if (!m) return;
  if (!!m.bossNameNeeded === needed) return;
  const { bossNameNeeded: _was, ...rest } = m;
  writeMembership(needed ? { ...rest, bossNameNeeded: true } : rest);
}

/**
 * A successful signed response is proof of live membership (plan 4.2). Record
 * when, in the RELAY's clock where it gave one: a lease measured on a clock the
 * user can set back is not a lease. An unparseable or absent header falls back
 * to local time, which claims no more than the old value did.
 *
 * Never moves backwards. Two responses arriving out of order must not shorten
 * the lease, and a server clock briefly behind ours must not either.
 */
export function touchVerified(serverTime: string | null | undefined): void {
  const m = readMembership();
  if (!m) return;
  const parsed = serverTime ? Date.parse(serverTime) : NaN;
  const at = Number.isFinite(parsed) ? parsed : Date.now();
  const prev = Date.parse(m.lastVerifiedAt);
  if (Number.isFinite(prev) && at <= prev) return;
  writeMembership({
    ...m,
    lastVerifiedAt: new Date(at).toISOString(),
    lastVerifiedLocalAt: new Date().toISOString(),
  });
}

export function forgetMembership(): void {
  const p = filePath();
  if (existsSync(p)) rmSync(p, { force: true });
}

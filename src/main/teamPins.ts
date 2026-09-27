/**
 * WHAT THIS MACHINE KNOWS THAT THE RELAY DOES NOT, AND MUST NOT.
 *
 * Two fields on `Teammate` have no wire representation, and both absences are
 * deliberate rather than unfinished:
 *
 *  - **`youAllow`** is your personal override for one teammate. Contract 0.3
 *    keeps it here: it is a local policy decision nobody else needs to read, and
 *    a field we decline to store is a field a relay compromise cannot leak.
 *
 *  - **`verified` and `previousFingerprint`** are trust on first use, pinned
 *    HERE. Contract 0.4: a relay that could set `verified` could clear it, so
 *    asking the server whether a key is trusted defeats the point of checking.
 *    The pin is the memory of what this machine saw first; a mismatch against it
 *    is exactly what D13 renders.
 *
 * So this file is the difference between a roster that reports what the server
 * believes and one that reports what THIS MACHINE has actually confirmed. If it
 * ever starts reading either value off the wire, the feature is gone while still
 * appearing to work — which is the worst version of a security defect and the
 * one the fabricated fingerprint nearly shipped.
 *
 * Stored beside the device key, at 0600, for the same reason: it is not secret,
 * but it is trust state, and trust state a local process can rewrite unnoticed
 * is not trust state.
 */

import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  EMPTY_SCHEDULE, normalizePolicy, normalizeSchedule, policyOf, presetOf, scheduleSlot, scheduledPreset,
  type PolicyPreset, type StatusSchedule, type TeamPolicy,
} from '../shared/teamPolicy';
import type { NetworkLevel } from '../renderer/src/components/team/types';

interface Pin {
  /** The fingerprint this machine saw first and has not been told to forget. */
  fingerprint: string;
  /** True once a human confirmed it out of band. Never set from the wire. */
  verified: boolean;
  /** Kept when the fingerprint changes, so D13 can show both. */
  previous?: string;
  firstSeenAt: string;
}

interface PinFile {
  /** Keyed by deviceId — the pin belongs to a MACHINE, not a person. A
   *  teammate's new laptop is a new key and honestly reads as unverified. */
  pins: Record<string, Pin>;
  /** LEGACY, 0.4.9 and earlier. Keyed by memberId, one of the three old words.
   *  Read once as the migration source for `youPolicy` and kept in step on
   *  every write so a person who downgrades to 0.4.9 still has their overrides.
   *  Nothing enforces it any more: {@link youPolicyFor} is the truth. */
  youAllow: Record<string, NetworkLevel>;
  /** LEGACY, as above, for the machine default. */
  youAllowDefault?: NetworkLevel;
  /** 0.4.10. What you allow ONE teammate, on the three axes. Absent means
   *  "follow your default" (below), which is what makes clearing an override
   *  different from setting it to off. */
  youPolicy?: Record<string, TeamPolicy>;
  /** 0.4.10. THIS MACHINE's default for everyone without an override. Absent
   *  means "follow the org default the relay reports". It is local for the
   *  same reason `youPolicy` is: what you let reach your agents is your
   *  decision, enforced here, and nothing the relay needs to know. */
  youPolicyDefault?: TeamPolicy;
  /** 0.4.10. YOUR STATUS: the whole machine's answer, ANDed with every per
   *  person policy (`effectivePolicy`). Absent is NOT "off": see
   *  {@link myStatus}. */
  status?: TeamPolicy;
  /** 0.4.10. When to be on what status, by day and time of day. */
  statusSchedule?: StatusSchedule;
  /** 0.5.2. The person chose `status` by hand while the schedule was driving,
   *  inside this window instance (`scheduleSlot`). Their choice holds until a
   *  different instance starts; then the schedule decides again. */
  statusHold?: { slot: string };
  /** The ORG's signing key, pinned the same way (Pam's S1, plan 4.4): first
   *  sight unverified, a person's word the only path to verified, a change
   *  kept beside the new value so the panel can show both. Keyed by orgId. */
  org?: Record<string, Pin>;
}

const EMPTY: PinFile = { pins: {}, youAllow: {} };

const LEVELS: readonly string[] = ['strict', 'communication-only', 'allow-all'];
function isLevel(v: unknown): v is NetworkLevel {
  return typeof v === 'string' && LEVELS.includes(v);
}

/**
 * The nearest OLD word for a new policy, for the two legacy readers that are
 * still on the wire path (`src/main/relay.ts:487,502`) and for the copy of the
 * value we keep for a downgrade.
 *
 * `listen` (receive, no send, no commands) has no old word, because the old
 * vocabulary could not say it. It projects to `strict`, the nearest CLOSED
 * word, never to `communication-only`: a screen or an older build must never
 * show MORE permission than this machine actually enforces.
 */
function legacyOf(policy: TeamPolicy): NetworkLevel {
  const preset = presetOf(policy);
  if (preset === 'open') return 'allow-all';
  if (preset === 'converse') return 'communication-only';
  if (preset === 'listen' || preset === 'off') return 'strict';
  // A combination the four presets do not cover. Send decides how it reads to
  // an old build, and an old build cannot express "no send" except as strict.
  return policy.send && policy.receive ? 'communication-only' : 'strict';
}

function filePath(): string {
  return join(app.getPath('userData'), 'teams', 'trust.json');
}

function read(): PinFile {
  const p = filePath();
  if (!existsSync(p)) return { ...EMPTY };
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8')) as Partial<PinFile>;
    return {
      pins: parsed.pins && typeof parsed.pins === 'object' ? parsed.pins : {},
      // Carried through, or every read forgets the org pin and re-pins it
      // as first sight (which is exactly what a test caught).
      org: parsed.org && typeof parsed.org === 'object' ? parsed.org : undefined,
      youAllow: parsed.youAllow && typeof parsed.youAllow === 'object' ? parsed.youAllow : {},
      // PRESENT BUT UNREADABLE IS NOT ABSENT. Absent means "follow the org
      // default", which the relay controls and which may be more permissive
      // than what this person actually set. A value that is there and is not
      // one of the three words is a corrupt or hand edited default, and it
      // degrades to the closed word rather than handing the decision back to
      // the relay. Failing open on an unrecognised stored value is the classic
      // bug in this area.
      youAllowDefault: isLevel(parsed.youAllowDefault) ? parsed.youAllowDefault
        : parsed.youAllowDefault === undefined ? undefined : 'strict',
      youPolicy: parsed.youPolicy && typeof parsed.youPolicy === 'object' ? parsed.youPolicy : undefined,
      youPolicyDefault: parsed.youPolicyDefault && typeof parsed.youPolicyDefault === 'object'
        ? normalizePolicy(parsed.youPolicyDefault) : undefined,
      status: parsed.status && typeof parsed.status === 'object' ? normalizePolicy(parsed.status) : undefined,
      statusSchedule: parsed.statusSchedule ? normalizeSchedule(parsed.statusSchedule) : undefined,
      // 0.5.2: the hold is a slot key and nothing else; anything else is no hold.
      statusHold: parsed.statusHold && typeof parsed.statusHold === 'object' && typeof (parsed.statusHold as { slot?: unknown }).slot === 'string'
        ? { slot: (parsed.statusHold as { slot: string }).slot } : undefined,
    };
  } catch {
    // A corrupt trust file must not throw the roster away. Losing the pins
    // degrades every teammate to unverified, which is the safe direction: it
    // asks for confirmation again rather than granting it.
    return { ...EMPTY };
  }
}

function write(data: PinFile): void {
  const p = filePath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
}

export interface TrustState {
  verified: boolean;
  /** Set only when the current fingerprint differs from the pin. */
  previousFingerprint?: string;
}

/**
 * Trust on first use.
 *
 * First sight of a device pins its fingerprint, unverified: seeing a key is not
 * the same as confirming it, and starting at `verified: true` would mean nobody
 * is ever asked to check. A later mismatch keeps the old value and clears
 * verification, which is what D13 draws.
 */
export function trustFor(deviceId: string, fingerprint: string): TrustState {
  const data = read();
  const pin = data.pins[deviceId];

  if (!pin) {
    data.pins[deviceId] = {
      fingerprint, verified: false, firstSeenAt: new Date().toISOString(),
    };
    write(data);
    return { verified: false };
  }

  if (pin.fingerprint === fingerprint) {
    // A change that was recorded and not yet answered stays visible on every
    // read, not only the first: D13 must survive the next roster refresh,
    // which arrives within a second of any presence frame. Verifying clears
    // `previous`, and that is the only thing that does.
    return pin.verified || !pin.previous
      ? { verified: pin.verified }
      : { verified: false, previousFingerprint: pin.previous };
  }

  // CHANGED. Record it once, keeping whatever the pin held before, and drop
  // verification. Re-pinning silently is the failure this whole mechanism
  // exists to prevent.
  if (pin.previous !== pin.fingerprint) {
    data.pins[deviceId] = {
      fingerprint,
      verified: false,
      previous: pin.fingerprint,
      firstSeenAt: pin.firstSeenAt,
    };
    write(data);
    return { verified: false, previousFingerprint: pin.fingerprint };
  }
  return { verified: false, previousFingerprint: pin.previous };
}

/** A human confirmed this key out of band. The ONLY way `verified` becomes true. */
export function markVerified(deviceId: string, fingerprint: string): void {
  const data = read();
  data.pins[deviceId] = {
    ...(data.pins[deviceId] ?? { firstSeenAt: new Date().toISOString() }),
    fingerprint,
    verified: true,
    previous: undefined,
  };
  write(data);
}

/* ---- the org's signing key, same rules (Pam's S1, plan 4.4) ---------------- */

export interface OrgTrust {
  verified: boolean;
  /** Set only when the key the relay shows differs from the pin: D13 for the org itself. */
  previous?: string;
}

/**
 * Trust on first use for the ORG key. The relay could of course lie on first
 * sight; that is why the check is out of band (the six groups read to the
 * admin, or compared with what the admin's own app shows) and why a person
 * pressing Verify is the only path to true.
 */
export function orgTrustFor(orgId: string, signingKey: string): OrgTrust {
  const data = read();
  const org = data.org ?? {};
  const pin = org[orgId];
  if (!pin) {
    org[orgId] = { fingerprint: signingKey, verified: false, firstSeenAt: new Date().toISOString() };
    write({ ...data, org });
    return { verified: false };
  }
  if (pin.fingerprint === signingKey) {
    // Same rule as the device pin: a recorded, unanswered change stays visible.
    return pin.verified || !pin.previous ? { verified: pin.verified } : { verified: false, previous: pin.previous };
  }
  if (pin.previous !== pin.fingerprint) {
    org[orgId] = { fingerprint: signingKey, verified: false, previous: pin.fingerprint, firstSeenAt: pin.firstSeenAt };
    write({ ...data, org });
    return { verified: false, previous: pin.fingerprint };
  }
  return { verified: false, previous: pin.previous };
}

/** A human read the six groups to their admin, or compared them. The only path to true. */
export function markOrgVerified(orgId: string, signingKey: string): void {
  const data = read();
  const org = data.org ?? {};
  org[orgId] = {
    ...(org[orgId] ?? { firstSeenAt: new Date().toISOString() }),
    fingerprint: signingKey, verified: true, previous: undefined,
  };
  write({ ...data, org });
}

/* ---- what you allow, on three axes (0.4.10) -------------------------------- */

/**
 * MIGRATION HAPPENS ON READ, AND THERE IS NO MIGRATION SCRIPT.
 *
 * A 0.4.9 install has `youAllow` full of old words and no `youPolicy` at all.
 * Every read below goes through `normalizePolicy`, which takes a string through
 * `presetFromLegacy` and an object through the three booleans, and which FAILS
 * CLOSED on anything else. So the first read of an old file yields the right
 * policy, the first write records it in the new shape, and a hand edited or
 * corrupt value degrades to `off` rather than to "allowed".
 *
 * Do not add a code path that reads either field without it.
 */

/** Your override for one teammate, or undefined to follow your default. */
export function youPolicyFor(memberId: string): TeamPolicy | undefined {
  const data = read();
  const stored = data.youPolicy?.[memberId];
  if (stored !== undefined) return normalizePolicy(stored);
  const legacy = data.youAllow[memberId];
  return legacy === undefined ? undefined : normalizePolicy(legacy);
}

/** Set, or clear with null so this teammate follows your default again. */
export function setYouPolicy(memberId: string, value: TeamPolicy | NetworkLevel | null): void {
  const data = read();
  const map = { ...(data.youPolicy ?? {}) };
  if (value === null) {
    delete map[memberId];
    delete data.youAllow[memberId];
  } else {
    const policy = normalizePolicy(value);
    map[memberId] = policy;
    // Kept in step so a downgrade to 0.4.9 still has the override. `legacyOf`
    // never overstates it; see the note there.
    data.youAllow[memberId] = legacyOf(policy);
  }
  data.youPolicy = map;
  write(data);
  notify();
}

/** This machine's default for teammates without an override, or undefined to
 *  follow the org default. The message path reads it between the two:
 *  `youPolicyFor(sender) ?? youPolicyDefault() ?? org.defaultPermission`. */
export function youPolicyDefault(): TeamPolicy | undefined {
  const data = read();
  if (data.youPolicyDefault !== undefined) return normalizePolicy(data.youPolicyDefault);
  return data.youAllowDefault === undefined ? undefined : normalizePolicy(data.youAllowDefault);
}

export function setYouPolicyDefault(value: TeamPolicy | NetworkLevel | null): void {
  const data = read();
  if (value === null) {
    delete data.youPolicyDefault;
    delete data.youAllowDefault;
  } else {
    const policy = normalizePolicy(value);
    data.youPolicyDefault = policy;
    data.youAllowDefault = legacyOf(policy);
  }
  write(data);
  notify();
}

/* ---- your status, and the schedule that moves it --------------------------- */

/**
 * YOUR STATUS: the whole machine's answer, ANDed with every per person policy.
 *
 * ABSENT MEANS `open`, AND THAT IS NOT A FAIL OPEN. `open` is the identity for
 * the AND in `effectivePolicy`, so a machine that has never set a status
 * enforces exactly what 0.4.9 enforced: the per person policy and nothing
 * else. Defaulting to `off` would silence every real user on upgrade, and
 * defaulting to anything narrower would quietly revoke a permission they
 * already granted. A status that IS stored, and is garbage, still fails closed
 * through `normalizePolicy`.
 */
export function myStatus(): TeamPolicy {
  const raw = read().status;
  return raw === undefined ? policyOf('open') : normalizePolicy(raw);
}

/**
 * THE PERSON'S write. When a schedule window is driving at that moment, the
 * choice is recorded with the window instance it was made in, and it holds
 * until that instance ends: `statusNow` answers the person, not the schedule,
 * and `applySchedule` leaves it alone. That is the sentence on the control
 * ("Changing it here holds until the next window starts"), kept for the first
 * time in 0.5.2. Clearing the status (null) drops the hold with it.
 */
export function setMyStatus(value: TeamPolicy | PolicyPreset | null, at: Date = new Date()): void {
  const data = read();
  if (value === null) {
    delete data.status;
    delete data.statusHold;
  } else {
    data.status = typeof value === 'string' ? policyOf(value) : normalizePolicy(value);
    const slot = scheduleSlot(myStatusSchedule(), at);
    if (slot) data.statusHold = { slot };
    else delete data.statusHold;
  }
  write(data);
  notify();
}

/** The SCHEDULE's write: the timer moving the status into a window, which
 *  ends any hold, because the hold was for the instance that just ended. */
function writeScheduledStatus(policy: TeamPolicy): void {
  const data = read();
  data.status = policy;
  delete data.statusHold;
  write(data);
  notify();
}

/** True while the person's own choice is holding against the schedule. */
function holdActive(data: PinFile, schedule: StatusSchedule, at: Date): boolean {
  const slot = data.statusHold?.slot;
  return typeof slot === 'string' && slot === scheduleSlot(schedule, at);
}

export function myStatusSchedule(): StatusSchedule {
  const raw = read().statusSchedule;
  return raw === undefined ? { ...EMPTY_SCHEDULE, windows: [] } : normalizeSchedule(raw);
}

/** A new schedule is a fresh start: no hold from the old one survives it. */
export function setMyStatusSchedule(value: unknown): void {
  const data = read();
  data.statusSchedule = normalizeSchedule(value);
  delete data.statusHold;
  write(data);
  notify();
}

/**
 * The status that is actually in force at `at`, schedule applied.
 *
 * READ THIS ON EVERY SEND, not only on the timer. A laptop asleep through the
 * boundary of a window wakes with the timer still pending, and a send in that
 * window would otherwise act on a status the person scheduled themselves out
 * of. `scheduledPreset` answers null when the schedule is off or nothing
 * matches, and null leaves the status exactly where the person put it.
 */
export function statusNow(at: Date = new Date()): TeamPolicy {
  const data = read();
  const schedule = myStatusSchedule();
  const want = scheduledPreset(schedule, at);
  if (!want) return myStatus();
  // The person's own choice, made inside this window instance, wins over it.
  if (holdActive(data, schedule, at)) return myStatus();
  return policyOf(want);
}

/** True while a schedule window is deciding the status, so a control can say
 *  the schedule is driving rather than pretend the person chose this. False
 *  while the person's choice is holding: then they did choose it. */
export function scheduleDriving(at: Date = new Date()): boolean {
  const schedule = myStatusSchedule();
  if (scheduledPreset(schedule, at) === null) return false;
  return !holdActive(read(), schedule, at);
}

/** True while a manual choice is holding against an enabled schedule, for a
 *  control that wants to say so. */
export function statusHeld(at: Date = new Date()): boolean {
  const schedule = myStatusSchedule();
  return scheduledPreset(schedule, at) !== null && holdActive(read(), schedule, at);
}

/**
 * Write the scheduled status down if it has moved. Called on a timer so the
 * STORED status (what the control shows) follows the schedule, rather than
 * showing yesterday's choice while `statusNow` quietly enforces something else.
 * Returns the new status when it changed, else null.
 */
export function applySchedule(at: Date = new Date()): TeamPolicy | null {
  const schedule = myStatusSchedule();
  if (!schedule.enabled) return null;
  const want = scheduledPreset(schedule, at);
  if (!want) return null;
  // Inside the instance the person chose in, the schedule keeps its hands off.
  if (holdActive(read(), schedule, at)) return null;
  const wanted = policyOf(want);
  const current = myStatus();
  if (current.receive === wanted.receive && current.send === wanted.send && current.commands === wanted.commands) {
    // Nothing to move, but a hold from an instance that has ended is over.
    if (read().statusHold) writeScheduledStatus(current);
    return null;
  }
  writeScheduledStatus(wanted);
  return wanted;
}

/* ---- change notification --------------------------------------------------- */

const subs = new Set<() => void>();

/** Fires after any write above. Main forwards it to the renderer so the one
 *  status control is never showing a value the schedule has already moved. */
export function onPolicyChange(fn: () => void): () => void {
  subs.add(fn);
  return () => { subs.delete(fn); };
}

function notify(): void {
  for (const fn of [...subs]) { try { fn(); } catch { /* a listener must not break a write */ } }
}

/* ---- the legacy one axis view (deprecated) --------------------------------- */

/**
 * @deprecated Kept for the two readers that still speak the old vocabulary:
 * the roster join at `src/main/relay.ts:487,502`, and the Classic seam's
 * `TeamTab.tsx` select. Nothing enforces these any more; `teamsBridge` reads
 * {@link youPolicyFor} and {@link statusNow}. `listen` has no old word, so the
 * projection understates rather than overstates; see `legacyOf`.
 */
export function youAllowFor(memberId: string): NetworkLevel | undefined {
  const policy = youPolicyFor(memberId);
  return policy === undefined ? undefined : legacyOf(policy);
}

/** @deprecated Use {@link setYouPolicy}. Accepts an old word so the Classic
 *  seam and `teams:setYouAllow` keep working, and writes the new store. */
export function setYouAllow(memberId: string, level: NetworkLevel | TeamPolicy | null): void {
  setYouPolicy(memberId, level);
}

/** @deprecated Use {@link youPolicyDefault}. */
export function youAllowDefault(): NetworkLevel | undefined {
  const policy = youPolicyDefault();
  return policy === undefined ? undefined : legacyOf(policy);
}

/** @deprecated Use {@link setYouPolicyDefault}. */
export function setYouAllowDefault(level: NetworkLevel | TeamPolicy | null): void {
  setYouPolicyDefault(level);
}

/**
 * THE FLOOR LOCK (0.5.3, B23 part 2, Creed 23 Sep 2026). One floor per hive.
 *
 * A hive's hook socket (`<hive>/hooks.sock`) is bound by whichever process
 * opened the hive last: HookServer.start() removes an existing socket file as
 * stale and listens on the path, and stop() removes it again. With two floors
 * (two app processes, each with its own userData) on ONE hive, the second
 * floor steals the first floor's agents, since every agent carries the same
 * HIVE_SOCK path in its environment, and either floor quitting unlinks the
 * socket the other is using. So a hive is open in one floor at a time, and
 * this file says which: `<hive>/.floor-lock`, JSON with the holder's pid and
 * userData, written before the hook server starts, checked at boot and by the
 * New Floor picker, removed on quit, cleared when the holder is dead.
 *
 * The userData path is the identity, not the pid alone: Electron's single
 * instance lock guarantees one live process per userData, so a lock naming
 * OUR userData is ours (a relaunch of this install, whose `app.exit()` fired
 * no quit event) whatever its pid says. A lock naming another userData with a
 * live pid is another floor. A dead pid is a stale lock and is cleared. The
 * one gap is a recycled pid, a dead floor whose number the OS handed to some
 * other process; the message then names the pid and the folder, and a person
 * can see it is not a floor. Rare, and quitting that process or deleting the
 * file clears it.
 *
 * Pure node: no electron import, so the lock is tested with a fake pid.
 */
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';

export const FLOOR_LOCK_FILE = '.floor-lock';

export interface FloorLock {
  pid: number;
  /** app.getPath('userData') of the holder: the floor's identity. */
  userData: string;
  /** ISO time the lock was taken. */
  since: string;
  /** App version of the holder, for the log and the refusal message. */
  version?: string;
}

export interface FloorIdentity {
  pid: number;
  userData: string;
  version?: string;
}

export type FloorLockState =
  | { state: 'free' }
  | { state: 'mine'; lock: FloorLock }
  | { state: 'stale'; lock: FloorLock }
  | { state: 'held'; lock: FloorLock }
  | { state: 'unreadable' };

export interface FloorLockOptions {
  /** Injected for tests; the default asks the OS with signal 0. */
  isAlive?: (pid: number) => boolean;
  /** Called after the hive read as free and before the exclusive create; the
   *  race test lands another floor's file in that gap. */
  onFree?: () => void;
}

export function floorLockPath(hiveRoot: string): string {
  return join(hiveRoot, FLOOR_LOCK_FILE);
}

/** `process.kill(pid, 0)`: ESRCH is dead, EPERM is alive but not ours. */
export function pidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** A `~` prefix expanded and the path made absolute, so two spellings of one
 *  folder compare equal. The same rule config.ts applies to harnessHome. */
export function normaliseHome(p: string): string {
  const t = p.trim();
  const expanded = t === '~' ? homedir() : t.startsWith('~/') || t.startsWith('~\\') ? join(homedir(), t.slice(2)) : t;
  return resolve(expanded);
}

export function samePath(a: string, b: string): boolean {
  const x = normaliseHome(a);
  const y = normaliseHome(b);
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y;
}

export function readFloorLock(hiveRoot: string): FloorLock | null | 'unreadable' {
  const file = floorLockPath(hiveRoot);
  if (!existsSync(file)) return null;
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<FloorLock>;
    if (!raw || typeof raw !== 'object') return 'unreadable';
    if (!Number.isInteger(raw.pid) || typeof raw.userData !== 'string' || !raw.userData) return 'unreadable';
    return { pid: raw.pid as number, userData: raw.userData, since: typeof raw.since === 'string' ? raw.since : '', version: typeof raw.version === 'string' ? raw.version : undefined };
  } catch {
    return 'unreadable';
  }
}

/** What the lock says from the point of view of `me`. */
export function checkFloorLock(hiveRoot: string, me: FloorIdentity, opts: FloorLockOptions = {}): FloorLockState {
  const lock = readFloorLock(hiveRoot);
  if (lock === null) return { state: 'free' };
  if (lock === 'unreadable') return { state: 'unreadable' };
  if (samePath(lock.userData, me.userData)) return { state: 'mine', lock };
  const alive = (opts.isAlive ?? pidAlive)(lock.pid);
  return alive ? { state: 'held', lock } : { state: 'stale', lock };
}

export type AcquireResult =
  | { ok: true; lock: FloorLock; cleared?: FloorLock }
  | { ok: false; error: 'held'; lock: FloorLock }
  | { ok: false; error: 'io'; detail: string };

/**
 * Take the lock for `me`, or say who holds it. A stale lock (dead holder), an
 * unreadable file and our own earlier lock are replaced. The file is created
 * with `wx` (exclusive), so two floors racing for a free hive cannot both win:
 * the loser sees EEXIST, reads the winner's lock and reports it as held.
 */
export function acquireFloorLock(hiveRoot: string, me: FloorIdentity, opts: FloorLockOptions = {}): AcquireResult {
  const file = floorLockPath(hiveRoot);
  const lock: FloorLock = { pid: me.pid, userData: normaliseHome(me.userData), since: new Date().toISOString(), version: me.version };
  let cleared: FloorLock | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = checkFloorLock(hiveRoot, me, opts);
    if (current.state === 'held') return { ok: false, error: 'held', lock: current.lock };
    if (current.state !== 'free') {
      if (current.state === 'stale') cleared = current.lock;
      try { unlinkSync(file); } catch { /* raced away, the create below decides */ }
    } else if (attempt === 0) {
      opts.onFree?.();
    }
    try {
      mkdirSync(hiveRoot, { recursive: true });
      const fd = openSync(file, 'wx', 0o600);
      try { writeSync(fd, JSON.stringify(lock, null, 2)); } finally { closeSync(fd); }
      return { ok: true, lock, cleared };
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') return { ok: false, error: 'io', detail: e instanceof Error ? e.message : String(e) };
      // Somebody wrote the file between our check and our create: loop and
      // read it; a live other floor comes back as held, anything else is
      // cleared and retried.
    }
  }
  const last = checkFloorLock(hiveRoot, me, opts);
  if (last.state === 'held') return { ok: false, error: 'held', lock: last.lock };
  return { ok: false, error: 'io', detail: 'could not create the lock after three attempts' };
}

/** Remove the lock if it is ours. Another floor's lock is never touched. */
export function releaseFloorLock(hiveRoot: string, me: FloorIdentity): boolean {
  const lock = readFloorLock(hiveRoot);
  if (lock === null) return false;
  if (lock !== 'unreadable' && !samePath(lock.userData, me.userData)) return false;
  try { unlinkSync(floorLockPath(hiveRoot)); return true; } catch { return false; }
}

/** One line for the log and the refusal message. */
export function describeFloorLock(lock: FloorLock): string {
  const when = lock.since ? ` since ${lock.since}` : '';
  const ver = lock.version ? `, app ${lock.version}` : '';
  return `pid ${lock.pid}${ver}, data ${lock.userData}${when}`;
}

// ─── The New Floor picker's checks (B21) ────────────────────────────────────

export type FloorRefusal = 'current' | 'held' | 'same-data-dir' | 'invalid';

export interface FloorRequest {
  /** The harness home the new floor should open (its hive is `<home>/hive`). */
  harnessHome: string;
  /** The floor's own app data folder, when the spawner has chosen it already. */
  dataDir?: string;
}

export interface FloorContext {
  /** This floor's harnessHome, or null before onboarding. */
  currentHome: string | null;
  /** This floor's app.getPath('userData'). */
  userData: string;
  /** `<home>/hive`, the same rule HiveManager.root() uses. */
  hiveRootOf: (home: string) => string;
}

export type FloorValidation =
  | { ok: true; harnessHome: string }
  | { ok: false; refusal: FloorRefusal; lock?: FloorLock; detail?: string };

/**
 * Why a picked folder cannot become a floor: it is this floor's own hive (open
 * here already), another live floor holds its lock, or the data dir the
 * spawner chose is this floor's own (two processes on one userData cannot even
 * start, see B23-TWO-FLOORS-RISKS.md item 1). A stale lock is not a refusal:
 * the new floor clears it when it takes the hive.
 */
export function validateFloorRequest(req: FloorRequest, ctx: FloorContext, opts: FloorLockOptions = {}): FloorValidation {
  if (typeof req.harnessHome !== 'string' || !req.harnessHome.trim()) return { ok: false, refusal: 'invalid', detail: 'no folder' };
  const home = normaliseHome(req.harnessHome);
  if (ctx.currentHome && samePath(home, ctx.currentHome)) return { ok: false, refusal: 'current' };
  if (req.dataDir) {
    if (samePath(req.dataDir, ctx.userData)) return { ok: false, refusal: 'same-data-dir' };
    // This floor's data dir INSIDE the new floor's: the new floor would read or
    // wipe its parent. The other way round, floors/<id>/ under the parent, is
    // the design and is allowed.
    const parentInsideChild = (normaliseHome(ctx.userData) + sep).startsWith(normaliseHome(req.dataDir) + sep);
    if (parentInsideChild) return { ok: false, refusal: 'same-data-dir', detail: 'the data folder contains this floor\'s own' };
  }
  const state = checkFloorLock(ctx.hiveRootOf(home), { pid: process.pid, userData: ctx.userData }, opts);
  if (state.state === 'held') return { ok: false, refusal: 'held', lock: state.lock };
  if (state.state === 'mine') return { ok: false, refusal: 'current' };
  return { ok: true, harnessHome: home };
}

export type FloorProbe = 'free' | 'current' | 'held' | 'missing';

/** For the picker's list: one word per remembered folder. */
export function probeFloor(home: string, ctx: FloorContext, opts: FloorLockOptions = {}): { state: FloorProbe; lock?: FloorLock } {
  const h = normaliseHome(home);
  if (!existsSync(h)) return { state: 'missing' };
  if (ctx.currentHome && samePath(h, ctx.currentHome)) return { state: 'current' };
  const s = checkFloorLock(ctx.hiveRootOf(h), { pid: process.pid, userData: ctx.userData }, opts);
  if (s.state === 'held') return { state: 'held', lock: s.lock };
  if (s.state === 'mine') return { state: 'current' };
  return { state: 'free' };
}

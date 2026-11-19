/**
 * A damaged source of truth is kept, never replaced. config.json and the
 * hive's registry.json and tasks.json are read through readJsonFile:
 *
 *   - DAMAGED: the file does not parse (or is not a JSON object). It is kept as
 *     it is, the text that was judged is copied aside once per spell of damage
 *     as `<name>.damaged-YYYY-MM-DD-HHMM` in local time (then seconds, then
 *     milliseconds, if that name is taken; a copy is never overwritten), writes
 *     to it pause, and integrityIssues() names it for the window's banner.
 *   - UNREADABLE: it cannot be read just now (busy, locked). That is no damage:
 *     no copy, and the caller keeps this run's last good value (a copy). With
 *     none yet (start up) it is read 3 more times, 50 ms apart, once per spell
 *     of the error.
 *
 * A spell ends when the file reads again, or is gone.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT): the fork keeps a copy of a
 * config.json that does not parse and pauses writes to it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

export type JsonRead =
  | { kind: 'ok'; value: Record<string, unknown> }
  | { kind: 'missing' }
  | { kind: 'damaged'; error: string; copy: string | null }
  | { kind: 'unreadable'; error: string };

/** One damaged file, as the window may see it: names only, never a path. */
export interface IntegrityIssue {
  file: string;
  /** The copy's name beside it, or null when no copy could be made. */
  copy: string | null;
  error: string;
}

interface Held extends IntegrityIssue { path: string; copyPath: string | null }

const held = new Map<string, Held>();
/** Files read patiently in the current spell of a read error. */
const waited = new Set<string>();
/** Files whose skipped write was logged in the current spell. */
const skipLogged = new Set<string>();

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function waitSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** The copy's time stamp: minutes, then seconds, then milliseconds. */
function stamp(d: Date, detail: number): string {
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  if (detail === 0) return base;
  return detail === 1 ? `${base}${pad(d.getSeconds())}` : `${base}${pad(d.getSeconds())}${pad(d.getMilliseconds(), 3)}`;
}

/** Copy the judged text beside the file under a name that is not taken. */
function copyAside(p: string, raw: string): string | null {
  const d = new Date();
  for (let detail = 0; detail < 3; detail++) {
    const copyPath = join(dirname(p), `${basename(p)}.damaged-${stamp(d, detail)}`);
    try {
      writeFileSync(copyPath, raw, { encoding: 'utf8', flag: 'wx' });
      return copyPath;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') {
        console.error(`[integrity] could not copy ${basename(p)} aside:`, errText(e));
        return null;
      }
    }
  }
  return null;
}

function healthy(p: string): void {
  if (held.delete(p)) console.log(`[integrity] ${basename(p)} reads again; writes to it resume`);
  waited.delete(p);
  skipLogged.delete(p);
}

function readOnce(p: string): JsonRead {
  let raw: string;
  try { raw = readFileSync(p, 'utf8'); } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') { healthy(p); return { kind: 'missing' }; }
    return { kind: 'unreadable', error: errText(e) };
  }
  let error: string;
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      healthy(p);
      return { kind: 'ok', value: value as Record<string, unknown> };
    }
    error = 'not a JSON object';
  } catch (e) { error = errText(e); }
  const known = held.get(p);
  // Once per spell: the first damaged read keeps the text it judged.
  const copyPath = known ? known.copyPath : copyAside(p, raw);
  const copy = copyPath ? basename(copyPath) : null;
  if (!known) console.error(`[integrity] ${basename(p)} is damaged (${error}); kept as it is${copy ? `, copied to ${copy}` : ''}; writes to it pause until it reads again`);
  held.set(p, { path: p, file: basename(p), copyPath, copy, error });
  waited.delete(p);
  return { kind: 'damaged', error, copy };
}

/** Read one JSON source of truth. `patient`: the caller has no last good value
 *  yet, so an unreadable file is read 3 more times, 50 ms apart (once per spell). */
export function readJsonFile(p: string, patient = false): JsonRead {
  let r = readOnce(p);
  if (r.kind === 'unreadable' && patient && !waited.has(p)) {
    waited.add(p);
    for (let i = 0; i < 3 && r.kind === 'unreadable'; i++) { waitSync(50); r = readOnce(p); }
  }
  return r;
}

/** Whether a write to `p` must be skipped now: it is damaged, or cannot be read
 *  just now (what is on disk is unknown). `logged` is true the first time in a
 *  spell, so a caller logs a skipped write once. */
export function writeRefusal(p: string): { why: 'damaged' | 'read error'; error: string; copy: string | null; logged: boolean } | null {
  const r = readJsonFile(p);
  if (r.kind !== 'damaged' && r.kind !== 'unreadable') return null;
  const logged = !skipLogged.has(p);
  skipLogged.add(p);
  return r.kind === 'damaged'
    ? { why: 'damaged', error: r.error, copy: r.copy, logged }
    : { why: 'read error', error: r.error, copy: null, logged };
}

/** Damaged files, for the window's banner. */
export function integrityIssues(): IntegrityIssue[] {
  return [...held.values()].map(({ file, copy, error }) => ({ file, copy, error }));
}

/** The path behind a listed name (a damaged file or its copy), or null: the
 *  window names a file, it never passes a path. */
export function integrityPath(name: string): string | null {
  for (const h of held.values()) {
    if (name === h.file) return h.path;
    if (h.copyPath && name === h.copy) return h.copyPath;
  }
  return null;
}

/**
 * A settings file, agent list or task board that exists but cannot be used.
 *
 * Before this, `config.json`, `registry.json` and `tasks.json` read as their
 * defaults (or as empty) when they did not parse, and the next save wrote those
 * defaults over the person's file. Now such a file is KEPT as it is, one copy
 * of it is saved beside it under a dated name, and writes to it pause until it
 * reads again: a hand repair in place resumes them by itself. The window shows
 * a banner from `integrity:issues`.
 *
 * The copy is made once per spell of damage (from the first bad read until the
 * file reads good again), so a hand repair saved many times leaves one copy.
 * A file that cannot be READ (EMFILE, EBUSY, an offline cloud file, a mode
 * change) is listed and paused the same way but has no identity: every read
 * tries again, and the owner keeps its last good value meanwhile.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT): config.ts noteCorruptConfig and
 * hive.ts readAuthoritativeJson.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

/** What the banner names. `copy` is the copy's file name, or null when none could be made. */
export interface DamagedFile {
  file: string;
  copy: string | null;
  error: string;
}

/** The top level a file must have to be used. */
export type JsonShape = 'object' | 'tasks' | 'registry';

/** Why parsed JSON cannot be used as `shape`, or null when it can. */
export function shapeProblem(parsed: unknown, shape: JsonShape): string | null {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return 'the file does not hold an object';
  const o = parsed as Record<string, unknown>;
  if (shape === 'tasks' && o.tasks !== undefined && !Array.isArray(o.tasks)) return '"tasks" is not a list';
  if (shape === 'registry' && (o.agents === null || typeof o.agents !== 'object' || Array.isArray(o.agents))) return '"agents" is not an object';
  return null;
}

/** The file's identity, so an unchanged file is not read again. The change
 *  time counts too: a mode change, or a repair in place on a coarse clock. */
export function fileIdentity(p: string): string | null {
  try { const st = statSync(p); return `${st.ino}:${st.size}:${st.mtimeMs}:${st.ctimeMs}`; } catch { return null; }
}

/**
 * Dated copy name beside the file, in local time as the person reads it:
 * `<name>.damaged-2026-10-19-1405`. A name already there gets the
 * seconds (`-140503`), then the milliseconds, never a ' 2' style name, and an
 * existing file is never overwritten.
 */
export function damagedCopyPath(p: string, now: Date = new Date(), exists: (p: string) => boolean = existsSync): string {
  const two = (n: number): string => String(n).padStart(2, '0');
  const minute = `${p}.damaged-${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}`;
  if (!exists(minute)) return minute;
  const second = `${minute}${two(now.getSeconds())}`;
  if (!exists(second)) return second;
  const milli = `${second}-${String(now.getMilliseconds()).padStart(3, '0')}`;
  for (let n = 0; ; n++) {
    const name = n === 0 ? milli : `${milli}-${n}`;
    if (!exists(name)) return name;
  }
}

/** Block this thread for `ms`: a read at start up has nothing to show meanwhile. */
export function waitSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** More reads, and the gap between them, for a file that cannot be read when
 *  its owner has no last good value yet (the first read of a run). */
export const UNREADABLE_RETRIES = 3;
export const UNREADABLE_RETRY_MS = 50;

/**
 * Reads and keeps track of damaged files. One per owner (the config module,
 * the hive), so each keeps its own list.
 */
export class DamagedFiles {
  private readonly issues = new Map<string, DamagedFile & { id: string | null }>();
  /** Paths copied (or tried) in their current spell of damage. */
  private readonly copied = new Set<string>();
  /** The identity of each file when it last read (or was written) good. */
  private readonly good = new Map<string, string>();
  /** Paths a patient read already waited on in this spell. */
  private readonly waited = new Set<string>();

  constructor(private readonly onNew?: (path: string, issue: DamagedFile) => void) {}

  /** The spell of damage is over: the file is gone, read good, or we wrote it. */
  private clear(p: string): void {
    this.issues.delete(p);
    this.copied.delete(p);
    this.waited.delete(p);
  }

  /**
   * read, for an owner with no last good value: a file that cannot be read is
   * tried 3 more times, 50 ms apart, before the owner falls back to defaults
   * (an EBUSY on the first config read must not start the app with no hive).
   * It waits once per spell: a file that stays unreadable must not block the
   * thread on every read, and readConfig runs twice every 1.5 s.
   */
  readPatiently(p: string, shape: JsonShape): ReturnType<DamagedFiles['read']> {
    let r = this.read(p, shape);
    if (r.ok || r.why !== 'unreadable' || this.waited.has(p)) return r;
    for (let i = 0; i < UNREADABLE_RETRIES && !r.ok && r.why === 'unreadable'; i++) {
      waitSync(UNREADABLE_RETRY_MS);
      r = this.read(p, shape);
    }
    if (!r.ok && r.why === 'unreadable') this.waited.add(p);
    return r;
  }

  /**
   * Read `p` as JSON of `shape`. Returns the parsed value, `missing` when there
   * is no file, `damaged` when it does not parse or has the wrong shape (the
   * issue is recorded, and the copy made once), or `unreadable` when it could
   * not be read at all (recorded, no copy, tried again on every read).
   */
  read(p: string, shape: JsonShape): { ok: true; value: unknown } | { ok: false; why: 'missing' | 'damaged' | 'unreadable' } {
    if (!existsSync(p)) { this.clear(p); return { ok: false, why: 'missing' }; }
    const id = fileIdentity(p);
    const known = this.issues.get(p);
    if (known && id !== null && known.id === id) return { ok: false, why: 'damaged' };
    let raw: string;
    try {
      raw = readFileSync(p, 'utf8');
    } catch (error) {
      // A passing error (EMFILE, EBUSY, an offline cloud file) has no identity
      // to wait on: noted with none, so the next read tries again.
      this.note(p, null, null, error instanceof Error ? error.message : String(error));
      return { ok: false, why: 'unreadable' };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      this.note(p, id, raw, error instanceof Error ? error.message : String(error));
      return { ok: false, why: 'damaged' };
    }
    const problem = shapeProblem(parsed, shape);
    if (problem) { this.note(p, id, raw, problem); return { ok: false, why: 'damaged' }; }
    this.clear(p);
    if (id !== null) this.good.set(p, id); else this.good.delete(p);
    return { ok: true, value: parsed };
  }

  /** Is `p` damaged (or unreadable) right now, so writes to it pause? Reads it
   *  again only when it changed since the last read, good or bad. */
  damaged(p: string, shape: JsonShape): boolean {
    const id = fileIdentity(p);
    if (id !== null && this.good.get(p) === id && !this.issues.has(p)) return false;
    const r = this.read(p, shape);
    return !r.ok && r.why !== 'missing';
  }

  /** After our own write: the file as written is good. */
  wrote(p: string): void {
    const id = fileIdentity(p);
    this.clear(p);
    if (id !== null) this.good.set(p, id); else this.good.delete(p);
  }

  /** The damaged files, for the banner. */
  list(): DamagedFile[] {
    return [...this.issues.values()].map(({ file, copy, error }) => ({ file, copy, error }));
  }

  /** The full path of a file listed now, by the name the banner shows; null for
   *  any other name. The window names a file, never a path. */
  pathOf(name: string): string | null {
    for (const [p, issue] of this.issues) if (issue.file === name) return p;
    return null;
  }

  private note(p: string, id: string | null, raw: string | null, error: string): void {
    const prev = this.issues.get(p);
    let copy = prev?.copy ?? null;
    // One copy per spell of damage, of exactly the text that was judged.
    if (raw !== null && !this.copied.has(p)) {
      this.copied.add(p);
      const to = damagedCopyPath(p);
      try {
        writeFileSync(to, raw, { flag: 'wx' });
        copy = basename(to);
      } catch (copyError) {
        copy = null;
        console.error(`[damaged-file] could not copy ${basename(p)}:`, copyError);
      }
    }
    const issue = { file: basename(p), copy, error, id };
    const isNew = !prev || prev.error !== error || prev.copy !== copy;
    this.issues.set(p, issue);
    if (isNew) {
      console.error(`[damaged-file] ${basename(p)} cannot be used (${error}); it is kept as it is and writes to it are paused.${copy ? ` Copy: ${copy}` : ''}`);
      try { this.onNew?.(p, { file: issue.file, copy, error }); } catch { /* reporting never breaks a read */ }
    }
  }
}

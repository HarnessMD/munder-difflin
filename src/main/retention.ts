/**
 * The retention sweep: the one place that actually deletes, and the only place
 * in the app that does.
 *
 * Runs once shortly after boot and then hourly, beside startTaskHygiene and
 * memory.start() in index.ts. Every decision it makes comes from
 * shared/retention.ts and is unit tested there; this file owns the filesystem
 * and nothing else.
 *
 * DELETING A USER'S DATA IS THE MOST DANGEROUS THING THIS CODEBASE DOES, so
 * every removal here passes four gates and any one of them failing skips the
 * store rather than guessing:
 *
 *   1. ROOT. The sweep refuses to run at all unless the hive root really is
 *      `<harnessHome>/hive` and both roots exist as real directories. Every
 *      path it touches is BUILT from those roots; it never accepts a path.
 *   2. SHAPE. Each entry must match an exact, anchored name pattern for its
 *      store. A file that does not match is kept, always. The patterns are the
 *      writers' own formats, copied from the code that produces them.
 *   3. LINK. Every entry is lstat'd, never stat'd, and anything that is not a
 *      plain file (or, for the two directory stores, a plain directory) is
 *      skipped. A symlink is therefore never followed and never deleted.
 *   4. FLOOR. planReap refuses to plan a total wipe, and the count bounds are
 *      all well above one, so a store that exists can never end up empty.
 *
 * The two jsonl files are rewritten through a temp file and a rename, never by
 * reading them into memory, because they are the two files that actually got
 * large. Their original mtime is restored afterwards: the heartbeat reads
 * log.jsonl's mtime to decide whether a floor is quiet (index.ts:1064), and a
 * sweep must not make an idle floor look busy.
 */
import {
  appendFileSync, closeSync, createReadStream, createWriteStream, existsSync, lstatSync,
  openSync, readdirSync, readFileSync, readSync, renameSync, rmSync, statSync, unlinkSync,
  utimesSync, writeFileSync
} from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import {
  costLedgerKeyOf, CostCarryFold, planReap, planTrim, retentionLine, retentionSummary,
  RETENTION_POLICIES, type LedgerLine, type RetentionOutcome, type RetentionPolicy
} from '../shared/retention';

/** Hourly, the same cadence as the task hygiene sweep. Nothing here is urgent:
 *  a store that is over its bound has been over it for weeks. */
export const RETENTION_INTERVAL_MS = 3_600_000;

/**
 * How long after boot the first sweep waits.
 *
 * Not politeness. costLifetime.ts folds the cost ledger incrementally and holds
 * a byte offset into it; trimming the file underneath a fold that has not
 * caught up yet would leave that offset pointing at shifted bytes. Ninety
 * seconds is several fleet snapshots, by which point the fold is at EOF and the
 * trim leaves the file smaller than the offset, which is exactly the condition
 * costLifetime.ts treats as "rotated underneath us" and refolds from zero.
 */
export const RETENTION_FIRST_DELAY_MS = 90_000;

/** Abort a ledger trim if this many bytes were appended while it ran. Normal
 *  growth during a trim is a few KB; anything on this scale means something is
 *  writing hard and the sweep can wait an hour. */
const MAX_CATCHUP_BYTES = 16 * 1024 * 1024;

// ─── name patterns, copied from the writers ──────────────────────────────────

/** `roster-${ISO with : and . replaced by -}-${seq}-${reason}.json`, roster.ts:199. */
const ROSTER_BACKUP = /^roster-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-\d+-(?:write|run-start|declined|reset)\.json$/;
/** `${msg.id}.json`, hive.ts:1553, plus the router's `bad-` prefix, hive.ts:1817. */
const MESSAGE_FILE = /^(?:bad-)?[A-Za-z0-9][A-Za-z0-9_-]*\.json$/;
/** `<id>.json` as god writes it, moved by archiveRequest, index.ts:4959. */
const SPAWN_FILE = /^[A-Za-z0-9][A-Za-z0-9_-]*\.json$/;
/** `utcStamp()` in reflect.ts:424, e.g. `20260904T123000Z`. */
const MEMORY_BACKUP_STAMP = /^\d{8}T\d{6}Z$/;
/** An agent directory under `<hive>/agents`. */
const AGENT_DIR = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export interface RetentionRoots {
  /** `<harnessHome>/hive`, or null when no home is configured. */
  hiveRoot: string | null;
  /** The harness home itself; roster backups live here, not under the hive. */
  harnessHome: string | null;
}

/** What one store's pass did. `refused` means nothing was touched. */
export interface SweepStat {
  removed: number;
  freedBytes: number;
  refused?: string;
}

const NOTHING: SweepStat = { removed: 0, freedBytes: 0 };

// ─── gates ───────────────────────────────────────────────────────────────────

/** Is `target` the root itself or somewhere underneath it? Path comparison
 *  only: the caller has already built `target` out of `root`, and every entry
 *  is lstat'd, so this is the belt to that pair of braces. */
export function withinRoot(root: string, target: string): boolean {
  const r = resolve(root);
  const t = resolve(target);
  return t === r || t.startsWith(r + sep);
}

/** A real directory, not a symlink to one, not a file, not missing. */
function isPlainDir(p: string): boolean {
  try { return lstatSync(p).isDirectory(); } catch { return false; }
}

/** A real file, not a symlink to one. lstat, so a link reports as a link. */
function plainFileStat(p: string): { size: number; mtimeMs: number } | null {
  try {
    const s = lstatSync(p);
    return s.isFile() ? { size: s.size, mtimeMs: s.mtimeMs } : null;
  } catch { return null; }
}

/** Bytes under a directory, skipping anything that is not a plain file or a
 *  plain directory. Used only to report what a reap freed. */
function dirSize(p: string, depth = 0): number {
  if (depth > 8) return 0;
  let total = 0;
  let names: string[];
  try { names = readdirSync(p); } catch { return 0; }
  for (const name of names) {
    const child = join(p, name);
    let s;
    try { s = lstatSync(child); } catch { continue; }
    if (s.isFile()) total += s.size;
    else if (s.isDirectory()) total += dirSize(child, depth + 1);
  }
  return total;
}

// ─── directory stores ────────────────────────────────────────────────────────

/**
 * Delete the oldest FILES in one directory, keeping what planReap keeps.
 *
 * `root` is the store's authority: the directory must sit inside it or the
 * whole call is refused. `pattern` must be anchored and must describe the
 * writer's own filename format; anything that does not match is left alone
 * forever, which is the right default for a folder someone dropped a note in.
 */
export function reapFiles(
  root: string | null,
  dirPath: string,
  pattern: RegExp,
  policy: RetentionPolicy,
  now: number
): SweepStat {
  if (!root) return { ...NOTHING, refused: 'no root configured' };
  if (!withinRoot(root, dirPath)) return { ...NOTHING, refused: 'the folder is outside its root' };
  if (!existsSync(dirPath)) return NOTHING;
  if (!isPlainDir(dirPath)) return { ...NOTHING, refused: 'the folder is not a plain directory' };

  let names: string[];
  try { names = readdirSync(dirPath); } catch { return { ...NOTHING, refused: 'the folder could not be read' }; }

  const candidates: { name: string; mtimeMs: number; size: number }[] = [];
  for (const name of names) {
    if (basename(name) !== name || !pattern.test(name)) continue;
    const st = plainFileStat(join(dirPath, name));
    if (!st) continue; // missing, a symlink, or a directory: never a candidate
    candidates.push({ name, mtimeMs: st.mtimeMs, size: st.size });
  }
  if (candidates.length === 0) return NOTHING;

  const sizes = new Map(candidates.map((c) => [c.name, c.size]));
  const plan = planReap(candidates, policy, now);
  let removed = 0;
  let freedBytes = 0;
  for (const name of plan.drop) {
    if (basename(name) !== name || !pattern.test(name)) continue; // gate 2, again
    const p = join(dirPath, name);
    if (!withinRoot(root, p)) continue;                            // gate 1, again
    if (!plainFileStat(p)) continue;                               // gate 3, again
    try { unlinkSync(p); removed++; freedBytes += sizes.get(name) ?? 0; }
    catch { /* gone already, or not ours to remove */ }
  }
  return { removed, freedBytes };
}

/** The same, for stores whose entries are DIRECTORIES (memory condense
 *  backups). A symlinked directory fails the lstat gate and is never removed;
 *  `rm -r` unlinks links it meets inside rather than following them. */
export function reapDirs(
  root: string | null,
  dirPath: string,
  pattern: RegExp,
  policy: RetentionPolicy,
  now: number
): SweepStat {
  if (!root) return { ...NOTHING, refused: 'no root configured' };
  if (!withinRoot(root, dirPath)) return { ...NOTHING, refused: 'the folder is outside its root' };
  if (!existsSync(dirPath)) return NOTHING;
  if (!isPlainDir(dirPath)) return { ...NOTHING, refused: 'the folder is not a plain directory' };

  let names: string[];
  try { names = readdirSync(dirPath); } catch { return { ...NOTHING, refused: 'the folder could not be read' }; }

  const candidates: { name: string; mtimeMs: number }[] = [];
  for (const name of names) {
    if (basename(name) !== name || !pattern.test(name)) continue;
    const p = join(dirPath, name);
    if (!isPlainDir(p)) continue;
    try { candidates.push({ name, mtimeMs: lstatSync(p).mtimeMs }); } catch { /* gone */ }
  }
  if (candidates.length === 0) return NOTHING;

  const plan = planReap(candidates, policy, now);
  let removed = 0;
  let freedBytes = 0;
  for (const name of plan.drop) {
    if (basename(name) !== name || !pattern.test(name)) continue;
    const p = join(dirPath, name);
    if (!withinRoot(root, p) || !isPlainDir(p)) continue;
    const size = dirSize(p);
    try { rmSync(p, { recursive: true, force: true }); removed++; freedBytes += size; }
    catch { /* leave it for the next sweep */ }
  }
  return { removed, freedBytes };
}

/**
 * Cap `<harnessHome>/roster-backups`.
 *
 * Its own entry point because roster.ts calls it too: the roster backs itself
 * up on EVERY write, which on a busy floor is thousands of copies a day, and
 * waiting an hour to notice would mean the folder is only ever bounded on the
 * hour. The path is built here rather than imported from roster.ts so the two
 * modules do not have to import each other; roster.ts:58 is the definition it
 * mirrors, and `verifyRoots` plus the anchored filename pattern mean a wrong
 * path removes nothing rather than something else.
 */
export function reapRosterBackups(home: string | null, now = Date.now()): SweepStat {
  if (!home || !isPlainDir(home)) return { ...NOTHING, refused: 'no harness home' };
  return reapFiles(home, join(home, 'roster-backups'), ROSTER_BACKUP, RETENTION_POLICIES.rosterBackups, now);
}

// ─── line based files ────────────────────────────────────────────────────────

/**
 * Stream one byte range as complete lines, reporting each line's absolute
 * offset and byte length. Never holds more than one chunk plus one line.
 *
 * `skipFirstPartial` is for a range that starts mid file: the bytes before the
 * first newline belong to a line whose start we did not read, so they are
 * counted and discarded rather than reported as a line.
 */
async function eachLine(
  path: string,
  start: number,
  endExclusive: number,
  skipFirstPartial: boolean,
  onLine: (text: string, bytes: number, offset: number) => void
): Promise<void> {
  if (endExclusive <= start) return;
  await new Promise<void>((done, fail) => {
    const stream = createReadStream(path, { start, end: endExclusive - 1 });
    let tail = Buffer.alloc(0);
    let skipping = skipFirstPartial;
    let pos = start;
    stream.on('data', (chunk: string | Buffer) => {
      const raw = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      const buf = tail.length ? Buffer.concat([tail, raw]) : raw;
      let i = 0;
      for (;;) {
        const nl = buf.indexOf(0x0a, i);
        if (nl === -1) break;
        const bytes = nl - i + 1;
        if (skipping) skipping = false;
        else onLine(buf.subarray(i, nl).toString('utf8'), bytes, pos);
        pos += bytes;
        i = nl + 1;
      }
      // Copied rather than sliced: a subarray keeps the whole chunk alive, and
      // the leftover is never more than one line.
      tail = Buffer.from(buf.subarray(i));
    });
    stream.on('error', fail);
    stream.on('end', () => {
      // A file with no trailing newline ends on a real line, and it is the
      // NEWEST one, so it must be counted or the trim would drop it.
      if (tail.length && !skipping) onLine(tail.toString('utf8'), tail.length, pos);
      done();
    });
  });
}

/** Copy `[from, to)` of `src` onto the end of `dest`, streaming. */
async function appendRange(src: string, from: number, to: number, dest: string): Promise<void> {
  if (to <= from) return;
  await new Promise<void>((done, fail) => {
    const read = createReadStream(src, { start: from, end: to - 1 });
    const write = createWriteStream(dest, { flags: 'a' });
    read.on('error', fail);
    write.on('error', fail);
    write.on('close', () => done());
    read.pipe(write);
  });
}

/** Read `[from, to)` synchronously. Used only for the last few KB appended
 *  while the trim was running, so it is never a large read. */
function readRangeSync(path: string, from: number, to: number): Buffer {
  const len = Math.max(0, to - from);
  const buf = Buffer.alloc(len);
  if (len === 0) return buf;
  const fd = openSync(path, 'r');
  try { readSync(fd, buf, 0, len, from); } finally { closeSync(fd); }
  return buf;
}

/**
 * Trim a jsonl ledger to its bound, keeping the newest lines.
 *
 * Three passes, none of which holds the file:
 *   1. from `size - 2 * max`, collect the byte length of each complete line and
 *      let planTrim pick the exact boundary. Twice the budget is scanned so the
 *      planner does real work rather than rubber stamping a raw byte offset,
 *      and the array is line COUNTS, never line contents.
 *   2. cost ledger only: fold everything being dropped into the carry lines
 *      that keep lifetime spend exact. See shared/retention.ts.
 *   3. write carry lines, then copy the kept range, then top up anything
 *      appended while we worked, then rename. The top up and the rename are one
 *      synchronous run, and every writer to these files is in this same
 *      process, so no append can land between them.
 */
export async function trimLedger(
  root: string | null,
  path: string,
  policy: RetentionPolicy,
  opts: { carry?: boolean; now?: number } = {}
): Promise<SweepStat> {
  if (!root) return { ...NOTHING, refused: 'no root configured' };
  if (!withinRoot(root, path)) return { ...NOTHING, refused: 'the file is outside its root' };
  if (!existsSync(path)) return NOTHING;
  const first = plainFileStat(path);
  if (!first) return { ...NOTHING, refused: 'not a plain file' };
  const size = first.size;
  if (size <= policy.max) return NOTHING;

  // 1. Where does the newest `max` bytes worth of whole lines begin?
  const scanFrom = Math.max(0, size - policy.max * 2);
  const lines: LedgerLine[] = [];
  let firstScanned = size;
  await eachLine(path, scanFrom, size, scanFrom > 0, (_t, bytes, offset) => {
    if (lines.length === 0) firstScanned = offset;
    lines.push({ bytes });
  });
  if (lines.length === 0) return { ...NOTHING, refused: 'no line boundary found' };
  const plan = planTrim(lines, policy);
  const keepFrom = firstScanned + plan.bytesDropped;
  if (keepFrom <= 0) return NOTHING;

  // 2. Carry the dropped region forward, when the file's meaning needs it. The
  //    kept region is read first, for keys only, so a session that ended before
  //    the cut folds into one number instead of leaving a line behind forever.
  let head = '';
  if (opts.carry) {
    const keptKeys = new Set<string>();
    await eachLine(path, keepFrom, size, false, (text) => {
      const k = costLedgerKeyOf(text);
      if (k) keptKeys.add(k);
    });
    const fold = new CostCarryFold();
    await eachLine(path, 0, keepFrom, false, (text) => fold.add(text));
    const carried = fold.finish(opts.now ?? Date.now(), keptKeys);
    const all = [...carried.carry, ...carried.survivors];
    head = all.length ? `${all.join('\n')}\n` : '';
  }

  // 3. Rewrite.
  const tmp = `${path}.retention-tmp`;
  try {
    writeFileSync(tmp, head, 'utf8');
    await appendRange(path, keepFrom, size, tmp);
    const after = statSync(path);
    if (after.size < size) throw new Error('the ledger shrank underneath the trim');
    if (after.size - size > MAX_CATCHUP_BYTES) throw new Error('too much was appended during the trim');
    if (after.size > size) appendFileSync(tmp, readRangeSync(path, size, after.size));
    renameSync(tmp, path);
    // The newest content is byte for byte what it was, so the file's own idea
    // of when it last changed must not move either.
    try { utimesSync(path, after.atime, after.mtime); } catch { /* not fatal */ }
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* nothing to clean */ }
    return { ...NOTHING, refused: e instanceof Error ? e.message : String(e) };
  }
  return { removed: 0, freedBytes: Math.max(0, keepFrom - Buffer.byteLength(head, 'utf8')) };
}

/**
 * Trim `board-archive.md` to its bound at an ENTRY boundary.
 *
 * Every entry is a whole copy of board.md under a dated `## Archived …`
 * heading (shared/taskHygiene.ts:312), so the cut has to land on one of those
 * or the oldest surviving entry is a copy with its top torn off. The file's own
 * header block, everything before the first heading, is preserved verbatim: it
 * is hive.ts's text and not ours to rewrite.
 */
export async function trimBoardArchive(
  root: string | null,
  path: string,
  policy: RetentionPolicy
): Promise<SweepStat> {
  if (!root) return { ...NOTHING, refused: 'no root configured' };
  if (!withinRoot(root, path)) return { ...NOTHING, refused: 'the file is outside its root' };
  if (!existsSync(path)) return NOTHING;
  const first = plainFileStat(path);
  if (!first) return { ...NOTHING, refused: 'not a plain file' };
  const size = first.size;
  if (size <= policy.max) return NOTHING;

  // The header block: up to the first heading, capped so a file with no heading
  // at all can never be read whole.
  const probe = readRangeSync(path, 0, Math.min(size, 8192)).toString('utf8');
  const headerEnd = probe.startsWith('## Archived ')
    ? 0
    : (probe.indexOf('\n## Archived ') >= 0 ? probe.indexOf('\n## Archived ') + 1 : -1);
  if (headerEnd < 0) return { ...NOTHING, refused: 'no entry heading in the header' };

  let keepFrom = -1;
  await eachLine(path, Math.max(0, size - policy.max), size, size > policy.max, (text, _b, offset) => {
    if (keepFrom < 0 && text.startsWith('## Archived ')) keepFrom = offset;
  });
  if (keepFrom <= headerEnd) return NOTHING;

  const tmp = `${path}.retention-tmp`;
  const note = 'Older copies past this file size cap were removed by the retention sweep.\n';
  try {
    const header = readRangeSync(path, 0, headerEnd).toString('utf8');
    writeFileSync(tmp, header.includes(note) ? header : `${header}${note}\n`, 'utf8');
    await appendRange(path, keepFrom, size, tmp);
    const after = statSync(path);
    if (after.size < size) throw new Error('the archive shrank underneath the trim');
    if (after.size - size > MAX_CATCHUP_BYTES) throw new Error('too much was appended during the trim');
    if (after.size > size) appendFileSync(tmp, readRangeSync(path, size, after.size));
    renameSync(tmp, path);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* nothing to clean */ }
    return { ...NOTHING, refused: e instanceof Error ? e.message : String(e) };
  }
  return { removed: 0, freedBytes: Math.max(0, keepFrom - headerEnd) };
}

/**
 * Cap `tasks-archive.json` by card count, newest first.
 *
 * Fully synchronous on purpose. This is the one file the hourly hygiene sweep
 * also writes (hive.ts:1868), and a synchronous read plus rename cannot
 * interleave with its synchronous read plus write inside one Node process, so
 * the two can never lose each other's work.
 */
export function capTasksArchive(
  root: string | null,
  path: string,
  policy: RetentionPolicy
): SweepStat {
  if (!root) return { ...NOTHING, refused: 'no root configured' };
  if (!withinRoot(root, path)) return { ...NOTHING, refused: 'the file is outside its root' };
  if (!existsSync(path)) return NOTHING;
  const st = plainFileStat(path);
  if (!st) return { ...NOTHING, refused: 'not a plain file' };

  let doc: { tasks?: unknown };
  try { doc = JSON.parse(readFileSync(path, 'utf8')); } catch { return { ...NOTHING, refused: 'the archive could not be parsed' }; }
  const tasks = Array.isArray(doc?.tasks) ? doc.tasks : null;
  if (!tasks || tasks.length <= policy.max) return NOTHING;

  // The writer keeps this list newest first (hive.ts:1845), so the newest cards
  // are the head of the array and the cut is a plain slice.
  const next = { ...doc, tasks: tasks.slice(0, policy.max) };
  const tmp = `${path}.retention-tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
    renameSync(tmp, path);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* nothing to clean */ }
    return { ...NOTHING, refused: e instanceof Error ? e.message : String(e) };
  }
  const freed = Math.max(0, st.size - statSync(path).size);
  return { removed: tasks.length - policy.max, freedBytes: freed };
}

// ─── the sweep ───────────────────────────────────────────────────────────────

/** Both roots, verified. Null when the sweep must not run. */
function verifyRoots(roots: RetentionRoots): { hive: string; home: string } | null {
  const home = roots.harnessHome;
  const hive = roots.hiveRoot;
  if (!home || !hive) return null;
  // The hive root is `<harnessHome>/hive` everywhere in this app (hive.ts:374).
  // If it is not, something has been reconfigured under us and this sweep has
  // no business deleting anything.
  if (basename(hive) !== 'hive' || !withinRoot(home, hive)) return null;
  if (!isPlainDir(home) || !isPlainDir(hive)) return null;
  return { hive, home };
}

/** One full pass. Never throws: a store that cannot be swept is reported and
 *  the rest of the sweep carries on. */
export async function runRetention(
  roots: RetentionRoots,
  now = Date.now()
): Promise<RetentionOutcome[]> {
  const ok = verifyRoots(roots);
  const out: RetentionOutcome[] = [];
  const add = (policy: RetentionPolicy, s: SweepStat): void => {
    out.push({ id: policy.id, label: policy.label, removed: s.removed, freedBytes: s.freedBytes, refused: s.refused });
  };
  if (!ok) {
    return [{
      id: 'roots', label: 'Retention', removed: 0, freedBytes: 0,
      refused: 'the harness home and its hive folder could not be verified'
    }];
  }
  const { hive, home } = ok;

  const P = RETENTION_POLICIES;

  add(P.costLedger, await safely(() => trimLedger(hive, join(hive, 'cost-ledger.jsonl'), P.costLedger, { carry: true, now })));
  add(P.hiveLog, await safely(() => trimLedger(hive, join(hive, 'log.jsonl'), P.hiveLog)));
  add(P.rosterBackups, sync(() => reapRosterBackups(home, now)));

  // Every agent's two archive folders, summed into one line.
  const archive: SweepStat = { removed: 0, freedBytes: 0 };
  const agentsDir = join(hive, 'agents');
  if (isPlainDir(agentsDir)) {
    let ids: string[] = [];
    try { ids = readdirSync(agentsDir); } catch { ids = []; }
    for (const id of ids) {
      if (basename(id) !== id || !AGENT_DIR.test(id)) continue;
      if (!isPlainDir(join(agentsDir, id))) continue;
      for (const rel of [['inbox', '.done'], ['outbox', '.sent']]) {
        const r = sync(() => reapFiles(hive, join(agentsDir, id, rel[0], rel[1]), MESSAGE_FILE, P.messageArchive, now));
        archive.removed += r.removed;
        archive.freedBytes += r.freedBytes;
      }
    }
  }
  add(P.messageArchive, archive);

  const spawn: SweepStat = { removed: 0, freedBytes: 0 };
  for (const sub of ['.done', '.failed']) {
    const r = sync(() => reapFiles(hive, join(hive, 'spawn-requests', sub), SPAWN_FILE, P.spawnRequests, now));
    spawn.removed += r.removed;
    spawn.freedBytes += r.freedBytes;
  }
  add(P.spawnRequests, spawn);

  add(P.tasksArchive, sync(() => capTasksArchive(hive, join(hive, 'tasks-archive.json'), P.tasksArchive)));
  add(P.boardArchive, await safely(() => trimBoardArchive(hive, join(hive, 'board-archive.md'), P.boardArchive)));
  add(P.memoryBackups, sync(() => reapDirs(hive, join(hive, 'backups'), MEMORY_BACKUP_STAMP, P.memoryBackups, now)));

  return out;
}

function sync(f: () => SweepStat): SweepStat {
  try { return f(); } catch (e) { return { ...NOTHING, refused: e instanceof Error ? e.message : String(e) }; }
}

async function safely(f: () => Promise<SweepStat>): Promise<SweepStat> {
  try { return await f(); } catch (e) { return { ...NOTHING, refused: e instanceof Error ? e.message : String(e) }; }
}

let timer: ReturnType<typeof setInterval> | null = null;
let firstRun: ReturnType<typeof setTimeout> | null = null;
let running = false;

/** Arm the sweep: once after RETENTION_FIRST_DELAY_MS, then hourly. Re-arming
 *  is safe; the previous timers are cleared first. */
export function startRetention(
  getRoots: () => RetentionRoots,
  intervalMs = RETENTION_INTERVAL_MS,
  firstDelayMs = RETENTION_FIRST_DELAY_MS
): void {
  stopRetention();
  const tick = (): void => {
    // A pass that is still streaming a large ledger must never have a second
    // one started on top of it.
    if (running) return;
    running = true;
    void runRetention(getRoots())
      .then((outcomes) => {
        const worked = outcomes.filter((o) => !o.refused && (o.removed > 0 || o.freedBytes > 0));
        if (worked.length) console.log('[retention]', retentionSummary(outcomes), worked.map(retentionLine).join(' '));
        const refused = outcomes.filter((o) => o.refused);
        if (refused.length) console.warn('[retention]', refused.map(retentionLine).join(' '));
      })
      .catch((e) => console.error('[retention]', e))
      .finally(() => { running = false; });
  };
  firstRun = setTimeout(tick, firstDelayMs);
  timer = setInterval(tick, intervalMs);
}

export function stopRetention(): void {
  if (firstRun) { clearTimeout(firstRun); firstRun = null; }
  if (timer) { clearInterval(timer); timer = null; }
}

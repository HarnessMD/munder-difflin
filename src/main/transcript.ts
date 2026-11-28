import { closeSync, cpSync, existsSync, fstatSync, mkdirSync, openSync, readSync, readdirSync, statSync } from 'node:fs';
import { openGuarded } from '../core/guardedFile';
import { open } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { estimateCostUsd, normalizeModel } from './pricing';

/** Claude Code's project key: the absolute cwd with EVERY non-alphanumeric
 *  character turned into a dash — the leading slash and any dots included.
 *  /Users/me/app → -Users-me-app, /Users/me/MDv0.3.0 → -Users-me-MDv0-3-0,
 *  C:\Users\me\app → C--Users-me-app.
 *
 *  One rule for every platform. The Windows branch always used it; POSIX had its
 *  own narrower spelling, and that divergence is what broke — see projectDir. */
function projectKey(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, '-');
}

/** The pre-2026 POSIX key: leading slash DROPPED, only slashes dashed, so dots
 *  survived (/Users/me/MDv0.3.0 → Users-me-MDv0.3.0). Kept solely so transcripts
 *  written before the change stay readable. */
function legacyProjectKey(cwd: string): string {
  return process.platform === 'win32'
    ? projectKey(cwd)
    : cwd.replace(/^\//, '').replaceAll('/', '-');
}

/** Resolve the Claude Code transcript directory for a given working directory:
 *  ~/.claude/projects keyed by cwd.
 *
 *  We used to emit the legacy key unconditionally on POSIX, which silently
 *  stopped matching once Claude Code moved to dashing every non-alphanumeric.
 *  Nothing errored — every caller reads an absent directory as "no transcripts
 *  yet" — so the miss cost months of dead memory condensation (a long run of
 *  `condense-abort`s with zero successes) and a usage reconciler quietly reading
 *  nothing at all.
 *
 *  Prefer the CURRENT spelling; fall back to the legacy one only when it exists
 *  and the current one does not, so pre-change installs stay readable. That order
 *  is not cosmetic: this harness itself created legacy-named directories by
 *  copying transcripts into them, so a fallback-first resolver would keep reading
 *  our own stale copies forever. When neither exists we return the CURRENT
 *  spelling, because callers that go on to create the directory must create the
 *  one Claude Code will actually read. */
function sessionFilesRoot(): string {
  return path.join(os.homedir(), '.claude/projects');
}

export function projectDir(cwd: string): string {
  const root = sessionFilesRoot();
  const current = path.join(root, projectKey(cwd));
  if (existsSync(current)) return current;
  // For cwd '/' the legacy key is the empty string, and path.join(root, '')
  // collapses to the projects ROOT — which always exists, so the fallback would
  // hand back a directory holding every project rather than one, and callers
  // would read/seed `~/.claude/projects/<session>.jsonl`. An empty key is not a
  // project name; treat it as no legacy candidate at all.
  const legacyKey = legacyProjectKey(cwd);
  if (!legacyKey) return current;
  const legacy = path.join(root, legacyKey);
  return existsSync(legacy) ? legacy : current;
}

/** Ensure session `<sessionId>.jsonl` exists in `cwd`'s Claude project dir so a
 *  `claude --resume <sessionId>` spawn in that cwd can find it. Claude keys
 *  transcripts by cwd, so a session started elsewhere is invisible until its
 *  `.jsonl` is seeded across.
 *
 *  - Already present in the target project dir → no-op, returns true.
 *  - Found under a DIFFERENT project dir (resumed from another cwd — the Add
 *    Agent "resume session" flow, #2) → copied across, returns true.
 *  - Not found anywhere → returns false, so the caller can fall back to a fresh
 *    session instead of launching a broken `--resume`.
 *
 *  Best-effort: any fs error yields false rather than throwing into the spawn. */
/** A Claude session id is a UUID. Renderer-supplied ids flow into `path.join`, so
 *  reject anything outside this charset before using one as a path component (a
 *  crafted id like `../../x` would otherwise traverse out of the project dirs). */
const VALID_SESSION_ID = /^[A-Za-z0-9_-]+$/;

export function seedSessionTranscript(cwd: string, sessionId: string): boolean {
  try {
    if (!sessionId || !VALID_SESSION_ID.test(sessionId)) return false;
    const target = path.join(projectDir(cwd), `${sessionId}.jsonl`);
    if (existsSync(target)) return true;
    const projectsRoot = sessionFilesRoot();
    if (!existsSync(projectsRoot)) return false;
    for (const dir of readdirSync(projectsRoot)) {
      const candidate = path.join(projectsRoot, dir, `${sessionId}.jsonl`);
      if (existsSync(candidate)) {
        mkdirSync(path.dirname(target), { recursive: true });
        cpSync(candidate, target);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Resolve a session id to the ORIGINAL working directory it ran in, for the Add
 *  Agent "resume session" auto-fill. The cwd is read from a transcript RECORD
 *  (every line carries a `cwd` field) — deliberately NOT by un-dashing the
 *  project-dir name, which is lossy when the path itself contains dashes. Searches
 *  every `~/.claude/projects/<dir>/<sessionId>.jsonl`; if more than one matches
 *  (shouldn't — session ids are unique UUIDs) the most-recently-modified wins.
 *  Returns the cwd string, or null if not found / unreadable / no cwd record. */
export function resolveSessionCwd(sessionId: string): string | null {
  try {
    if (!sessionId || !VALID_SESSION_ID.test(sessionId)) return null;
    const projectsRoot = sessionFilesRoot();
    if (!existsSync(projectsRoot)) return null;
    let best: { file: string; mtime: number } | null = null;
    for (const dir of readdirSync(projectsRoot)) {
      const candidate = path.join(projectsRoot, dir, `${sessionId}.jsonl`);
      try {
        const st = statSync(candidate);
        if (!best || st.mtimeMs > best.mtime) best = { file: candidate, mtime: st.mtimeMs };
      } catch { /* not present in this project dir */ }
    }
    if (!best) return null;
    // The FIRST record with a cwd, so a head read: a 276 MiB transcript used to
    // be read whole for a line that sits in its first few KB.
    return firstLineMatch(best.file, (line) => {
      try {
        const rec = JSON.parse(line) as { cwd?: unknown };
        return typeof rec.cwd === 'string' && rec.cwd ? rec.cwd : undefined;
      } catch { return undefined; /* skip a malformed line */ }
    }) ?? null;
  } catch {
    return null;
  }
}

const HEAD_CHUNK_BYTES = 64 * 1024;

/** The first non-empty line of `file` for which `pick` returns a value, reading
 *  forward in chunks and stopping there. Same answer as splitting the whole
 *  file, including a last line with no newline. Throws on a read error. */
export function firstLineMatch<T>(file: string, pick: (line: string) => T | undefined): T | undefined {
  const fd = openSync(file, 'r');
  try {
    let pos = 0;
    let carry = Buffer.alloc(0);
    const chunk = Buffer.alloc(HEAD_CHUNK_BYTES);
    for (;;) {
      const n = readSync(fd, chunk, 0, chunk.length, pos);
      pos += n;
      const buf = Buffer.concat([carry, chunk.subarray(0, n)]);
      const cut = n === 0 ? buf.length : buf.lastIndexOf(0x0a) + 1;
      for (const line of buf.subarray(0, cut).toString('utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const hit = pick(trimmed);
        if (hit !== undefined) return hit;
      }
      if (n === 0) return undefined;
      carry = Buffer.from(buf.subarray(cut));
    }
  } finally { closeSync(fd); }
}

export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estimatedCostUsd: number;
  /** The most-recently-seen model id (normalized, e.g. `claude-opus-4-8`), or
   *  undefined if no priced record was found. Lets the UI label the row. */
  model?: string;
  /** When these totals last covered every byte of the files they came from
   *  (epoch ms). Now for an up to date read; earlier while a large append is
   *  still being read in the background, so a velocity diff against them is
   *  taken over the real elapsed time. */
  asOf?: number;
}

function zero(): AgentUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0 };
}

export interface ReadUsageOptions {
  /** When set, only transcripts whose records carry this `sessionId` are summed.
   *  This is how the co-located-agents double-count (bug #2) is avoided: two
   *  agents sharing a cwd each filter to their own session instead of summing
   *  every `.jsonl` under the shared project dir. When unset, all are summed
   *  (the legacy behavior, used when the agent's session id isn't yet known). */
  sessionId?: string;
}

/** Per-file incremental parse state for the usage cache. Transcripts are
 *  append-only JSONL, so a parsed byte range's totals never change — repeat
 *  reads only stat the file and parse the appended tail. One entry per
 *  physical file (keyed by dir|file), shared across every sessionId that
 *  queries it — `all` is the unfiltered sum, `perSession` breaks the same
 *  parsed data out per record's own sessionId so a filtered caller never
 *  triggers its own re-read/re-parse of a file another agent already primed. */
interface FileUsageEntry {
  size: number;
  mtimeMs: number;
  /** Bytes parsed so far — always ends on a newline boundary, so a torn
   *  trailing line is simply re-read once the writer completes it. */
  offset: number;
  /** When these totals last covered the whole file (epoch ms of that stat). */
  checkedAt: number;
  all: AgentUsage;
  /** Bounded at one entry per file in practice: Claude Code writes one
   *  transcript per session, named for that session id, and only ever appends
   *  that session's records to it. Measured across 2172 top-level transcripts
   *  in `~/.claude/projects`: every one holds exactly one distinct sessionId,
   *  and it always equals the filename stem. (Subagent transcripts CAN carry
   *  two — the parent's and the resumed parent's — but they live in a nested
   *  `<session>/subagents/` dir that the non-recursive readdir below never
   *  reads.) So the refresh-path clone is O(1), not O(sessions-ever-seen), and
   *  needs no pruning of its own; USAGE_CACHE_MAX bounds the file count. */
  perSession: Map<string, AgentUsage>;
}

const usageCache = new Map<string, FileUsageEntry>();
/** Soft bound; when crossed after a walk, the least recently used entries of
 *  OTHER project dirs are dropped (entries rebuild on demand). The dir just
 *  walked is never evicted: a harness home that has run thousands of sessions
 *  (3,025 transcripts, 1.1 GB, on the founder's floor) would otherwise evict
 *  its own head while reading its tail, so every beat missed on every file and
 *  re-read the whole folder synchronously. */
export const USAGE_CACHE_MAX = 2048;

/** Drop least recently used entries outside `keepDir` until the cache is back
 *  to half the bound, or only `keepDir`'s entries are left. */
function pruneUsageCache(keepDir: string): void {
  if (usageCache.size <= USAGE_CACHE_MAX) return;
  const prefix = `${keepDir}|`;
  let drop = usageCache.size - USAGE_CACHE_MAX / 2;
  for (const k of Array.from(usageCache.keys())) {
    if (drop <= 0) break;
    if (k.startsWith(prefix)) continue;
    usageCache.delete(k);
    drop--;
  }
}

const USAGE_KEY = Buffer.from('"usage"');

/** Parse the complete JSONL lines in `buf` (it must end on a newline, or be
 *  empty), accumulating into BOTH `entry.all` (unfiltered) and the per-session
 *  bucket each record's OWN sessionId maps to.
 *
 *  A line without the literal `"usage"` cannot be a priced record, so it is
 *  skipped before it is decoded or parsed. Most of a big transcript is tool
 *  output on user records, and decoding it was most of the cost. The search
 *  jumps from one `"usage"` to the next, so those lines are never even split.
 *
 *  Parsing every record into every bucket it belongs to, once, up front, means
 *  a filtered query is a Map lookup instead of a re-parse (the cache used to be
 *  keyed per (file, sessionId), so N agents sharing a cwd parsed each new byte
 *  N times). */
function parseUsageBuffer(buf: Buffer, entry: FileUsageEntry): void {
  let from = 0;
  while (from < buf.length) {
    const hit = buf.indexOf(USAGE_KEY, from);
    if (hit === -1) return;
    const start = hit === 0 ? 0 : buf.lastIndexOf(0x0a, hit - 1) + 1;
    let end = buf.indexOf(0x0a, hit);
    if (end === -1) end = buf.length;
    parseUsageLine(buf.subarray(Math.max(start, from), end).toString('utf8').trim(), entry);
    from = end + 1;
  }
}

function parseUsageLine(trimmed: string, entry: FileUsageEntry): void {
  if (!trimmed) return;
  let rec: {
    type?: unknown;
    sessionId?: unknown;
    message?: { model?: unknown; usage?: Record<string, unknown> };
  };
  try {
    rec = JSON.parse(trimmed);
  } catch {
    return;
  }
  if (rec.type !== 'assistant') return;
  const u = rec.message?.usage;
  if (!u) return;
  const model = typeof rec.message?.model === 'string' ? normalizeModel(rec.message.model) : undefined;
  const rIn = num(u.input_tokens);
  const rOut = num(u.output_tokens);
  const rCacheWrite = num(u.cache_creation_input_tokens);
  const rCacheRead = num(u.cache_read_input_tokens);
  // Price THIS record by its own model, then accumulate — so a mixed-model
  // agent (rare) is still costed correctly rather than at one flat rate.
  const cost = estimateCostUsd(model, {
    inputTokens: rIn,
    outputTokens: rOut,
    cacheReadTokens: rCacheRead,
    cacheWriteTokens: rCacheWrite
  });
  const targets: AgentUsage[] = [entry.all];
  if (typeof rec.sessionId === 'string' && rec.sessionId) {
    let bucket = entry.perSession.get(rec.sessionId);
    if (!bucket) {
      bucket = zero();
      entry.perSession.set(rec.sessionId, bucket);
    }
    targets.push(bucket);
  }
  for (const acc of targets) {
    if (model) acc.model = model;
    acc.inputTokens += rIn;
    acc.outputTokens += rOut;
    acc.cacheWriteTokens += rCacheWrite;
    acc.cacheReadTokens += rCacheRead;
    acc.estimatedCostUsd += cost;
  }
}

/** More unread bytes than this are read in chunks off the caller's stack. A
 *  whole-file sync read of a 276 MiB transcript froze the main process for 1.2
 *  to 1.9 s and peaked near 800 MB; a 30 s beat's tail is a few KB. */
const DEFAULT_ASYNC_READ_BYTES = 1024 * 1024;
const asyncReadBytes = DEFAULT_ASYNC_READ_BYTES;
const READ_CHUNK_BYTES = 1024 * 1024;

/** One background read per file. `base` is the entry it extends: the last
 *  complete totals, or null for a first read or a re-read after a shrink. */
interface PendingRead { promise: Promise<void>; base: FileUsageEntry | null }
const pendingReads = new Map<string, PendingRead>();

/** A file whose first read is still in flight: there are no totals for it yet. */
const PENDING = Symbol('pending');

/** The entry a read of `st` starts from: a fresh one, or a copy of `base`. */
function nextEntry(st: { size: number; mtimeMs: number }, base: FileUsageEntry | null): FileUsageEntry {
  return base
    ? {
        size: st.size,
        mtimeMs: st.mtimeMs,
        offset: base.offset,
        checkedAt: base.checkedAt,
        all: { ...base.all },
        perSession: new Map(Array.from(base.perSession, ([k, v]) => [k, { ...v }]))
      }
    : { size: st.size, mtimeMs: st.mtimeMs, offset: 0, checkedAt: 0, all: zero(), perSession: new Map() };
}

/** Read `full` from `entry.offset` to `entry.size` in chunks, yielding between
 *  them, then publish the entry. Nothing is visible until the read completes, so
 *  no caller ever sees a partial sum. */
function startChunkedRead(key: string, full: string, entry: FileUsageEntry, base: FileUsageEntry | null, statAt: number): void {
  const promise = (async () => {
    const fh = await open(full, 'r');
    try {
      let pos = entry.offset;
      let carry = Buffer.alloc(0);
      while (pos < entry.size) {
        const len = Math.min(READ_CHUNK_BYTES, entry.size - pos);
        const chunk = Buffer.allocUnsafe(len);
        const { bytesRead } = await fh.read(chunk, 0, len, pos);
        if (bytesRead === 0) break;
        pos += bytesRead;
        const buf = carry.length ? Buffer.concat([carry, chunk.subarray(0, bytesRead)]) : chunk.subarray(0, bytesRead);
        // Only up to the last complete line; a torn line waits for the next chunk,
        // or for the writer to finish it.
        const cut = buf.lastIndexOf(0x0a) + 1;
        if (cut > 0) {
          parseUsageBuffer(buf.subarray(0, cut), entry);
          entry.offset += cut;
        }
        carry = Buffer.from(buf.subarray(cut));
      }
    } finally { await fh.close(); }
    entry.checkedAt = statAt;
    usageCache.delete(key);
    usageCache.set(key, entry);
  })()
    .catch(() => { /* unreadable right now: keep what we had; the next call retries */ })
    .finally(() => { pendingReads.delete(key); });
  pendingReads.set(key, { promise, base });
}

/** Cached totals for one transcript file, refreshed incrementally: unchanged
 *  size+mtime → cache hit (no read at all); grown → parse only the appended
 *  tail; shrunk (rewritten) → full re-parse. Null when the file vanished.
 *
 *  More than 1 MB unread goes to a background chunked read. Until it lands:
 *    - a first read, or a re-read after a shrink, answers PENDING (no totals);
 *    - an append answers the last complete totals, whose `checkedAt` says when
 *      they were complete.
 *  Never a partial sum: the breaker would read one as a burn spike.
 *
 *  Keyed by dir|file ONLY — one cache entry per physical file, shared by
 *  every agent that queries it, regardless of sessionId filter (see
 *  parseUsageBuffer for why keying by filter was the bug). */
function readFileUsage(dir: string, file: string): FileUsageEntry | typeof PENDING | null {
  const key = `${dir}|${file}`;
  const inFlight = pendingReads.get(key);
  if (inFlight) return inFlight.base ?? PENDING;
  const full = path.join(dir, file);
  const statAt = Date.now();
  let st: { size: number; mtimeMs: number };
  try { st = statSync(full); } catch { usageCache.delete(key); return null; }
  const cached = usageCache.get(key);
  if (cached && cached.size === st.size && cached.mtimeMs === st.mtimeMs) {
    cached.checkedAt = statAt;
    // Re-insert so Map order is least-recently-used first (see pruneUsageCache).
    usageCache.delete(key);
    usageCache.set(key, cached);
    return cached;
  }
  const base = !cached || st.size < cached.offset ? null : cached;
  const entry = nextEntry(st, base);
  if (st.size - entry.offset > asyncReadBytes) {
    // A shrunk file's old totals describe bytes that are gone.
    if (!base) usageCache.delete(key);
    startChunkedRead(key, full, entry, base, statAt);
    return base ?? PENDING;
  }
  try {
    const fd = openSync(full, 'r');
    try {
      const len = st.size - entry.offset;
      if (len > 0) {
        const buf = Buffer.alloc(len);
        const read = readSync(fd, buf, 0, len, entry.offset);
        // Consume only up to the last complete line; a torn trailing line
        // stays unparsed (offset holds at the newline) until the writer
        // finishes it — it is then counted exactly once.
        const cut = buf.subarray(0, read).lastIndexOf(0x0a) + 1;
        if (cut > 0) {
          parseUsageBuffer(buf.subarray(0, cut), entry);
          entry.offset += cut;
        }
      }
    } finally { closeSync(fd); }
  } catch {
    // Unreadable right now — keep what we have; totals refresh on the next call.
  }
  entry.checkedAt = statAt;
  usageCache.delete(key);
  usageCache.set(key, entry);
  return entry;
}

/** Sum real token usage across Claude Code transcripts for `cwd`, pricing each
 *  assistant record by ITS OWN model (fixes cost bug #1 — no more Sonnet for
 *  everyone) via the fallback price table. Optionally filtered to one session
 *  (fixes bug #2). Resilient by design: any unreadable file or malformed line is
 *  skipped, and any unexpected failure yields a zeroed result rather than
 *  throwing into the IPC handler. This is the OFFLINE reconciler / fallback —
 *  the live source is the OTel collector (`telemetry.ts`).
 *
 *  Returns null ("no data yet") while a file it needs is on its first
 *  background read; see readFileUsage. `asOf` is when the totals were last
 *  complete.
 *
 *  Called from the ~30s breaker/cost beat for every agent without live OTel, so
 *  it must stay cheap on multi-MB transcript dirs: per-file incremental caching
 *  above means a steady-state call is a readdir + one stat per file. */
export function readAgentUsage(cwd: string, opts: ReadUsageOptions = {}): AgentUsage | null {
  const usage = zero();
  try {
    const dir = projectDir(cwd);
    if (!existsSync(dir)) return usage;
    // A known session reads only its own transcript: Claude Code writes one
    // file per session, named for it, holding only that session's records (see
    // FileUsageEntry.perSession). The 30 s cost beat's fallback then costs one
    // stat instead of a stat per transcript ever written in a shared cwd (3,025
    // in the harness home).
    //
    // If that file is missing the answer is zero, without walking the dir. The
    // walk could only ever sum zero (on 29 Sep 2026 every one of 3,318
    // transcripts, 2.99 GB, held its own session id and no other) and it parsed
    // up to the whole folder to find that out: 773 MB for the shared repo. The
    // walk remains for a call with no session id.
    let files: string[];
    if (opts.sessionId) {
      const own = `${opts.sessionId}.jsonl`;
      if (!VALID_SESSION_ID.test(opts.sessionId) || !existsSync(path.join(dir, own))) {
        usage.asOf = Date.now();
        return usage;
      }
      files = [own];
    } else {
      files = readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
    }
    let lastModel: string | undefined;
    let pending = false;
    let asOf = Infinity;
    for (const file of files) {
      const entry = readFileUsage(dir, file);
      if (entry === PENDING) { pending = true; continue; }
      if (!entry) continue;
      asOf = Math.min(asOf, entry.checkedAt);
      const totals = opts.sessionId ? entry.perSession.get(opts.sessionId) : entry.all;
      if (!totals) continue;
      usage.inputTokens += totals.inputTokens;
      usage.outputTokens += totals.outputTokens;
      usage.cacheWriteTokens += totals.cacheWriteTokens;
      usage.cacheReadTokens += totals.cacheReadTokens;
      usage.estimatedCostUsd += totals.estimatedCostUsd;
      if (totals.model) lastModel = totals.model;
    }
    pruneUsageCache(dir);
    if (pending) return null;
    if (lastModel) usage.model = lastModel;
    usage.asOf = Number.isFinite(asOf) ? asOf : Date.now();
    return usage;
  } catch {
    return zero();
  }
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Current context size (tokens) of a live session: the token accounting of the
 *  LAST assistant message in its transcript — input + cache read/write is what
 *  the model just consumed as context, plus its output which joins the context
 *  for the next turn. Tail-reads the file (transcripts grow to many MB), so a
 *  poll stays cheap. Returns null when the transcript is missing/unreadable or
 *  holds no assistant message yet. */
const CONTEXT_TAIL_BYTES = 256 * 1024;

export function readContextTokens(transcriptPath: string): number | null {
  try {
    // Opened without following a link, a regular file only, checked on the
    // opened handle at every read (src/core/guardedFile.ts).
    const fd = openGuarded(transcriptPath);
    if (fd === null) return null;
    try {
      const size = fstatSync(fd).size;
      const len = Math.min(size, CONTEXT_TAIL_BYTES);
      if (len === 0) return null;
      const buf = Buffer.alloc(len);
      readSync(fd, buf, 0, len, size - len);
      const lines = buf.toString('utf8').split('\n');
      // Scan from the end; the very first chunk line may be cut mid-record and
      // simply fails to parse, which is fine.
      for (let i = lines.length - 1; i >= 0; i--) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;
        let rec: { type?: unknown; message?: { usage?: Record<string, unknown> } };
        try {
          rec = JSON.parse(trimmed);
        } catch {
          continue;
        }
        if (rec.type !== 'assistant') continue;
        const u = rec.message?.usage;
        if (!u) continue;
        return num(u.input_tokens) + num(u.output_tokens)
          + num(u.cache_creation_input_tokens) + num(u.cache_read_input_tokens);
      }
      return null;
    } finally {
      closeSync(fd);
    }
  } catch {
    return null;
  }
}

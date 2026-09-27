import { lstat, mkdir, open, readFile, readdir, realpath, rename, stat, writeFile } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { imageMimeForPath } from '../shared/imageTypes';

/**
 * Lexical containment — pure string math, no filesystem access.
 *
 * PRIVATE on purpose. On its own this is NOT a containment guarantee: `resolve`,
 * `normalize` and `relative` know nothing about symlinks, while the `readFile` /
 * `writeFile` / `readdir` that runs afterwards is resolved by the kernel, which
 * follows them. `safeResolve` is the guard every consumer must use.
 */
function lexicalJoin(root: string, rel: string): { absRoot: string; absPath: string } | null {
  const absRoot = resolve(root);
  const absPath = isAbsolute(rel) ? normalize(rel) : resolve(absRoot, rel);
  const rel2 = relative(absRoot, absPath);
  if (rel2.startsWith('..') || isAbsolute(rel2)) return null;
  return { absRoot, absPath };
}

/**
 * Canonicalize `absPath` and re-check containment against the canonical root.
 *
 * `realpath` throws ENOENT for a path that does not exist yet — which is normal
 * for a write that creates a file — so the deepest EXISTING ancestor is
 * canonicalized and the not-yet-existing tail is re-attached to it. That keeps
 * "create a new file in a real workspace directory" working while still pinning
 * every existing component to where it actually lives on disk.
 */
async function canonicalize(realRoot: string, absPath: string): Promise<string | null> {
  let probe = absPath;
  const tail: string[] = [];
  for (;;) {
    try {
      const real = await realpath(probe);
      const full = tail.length ? resolve(real, ...tail) : real;
      const r = relative(realRoot, full);
      if (r.startsWith('..') || isAbsolute(r)) return null;
      return full;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') return null;
      const parent = dirname(probe);
      if (parent === probe) return null;      // walked past the filesystem root
      tail.unshift(basename(probe));
      probe = parent;
    }
  }
}

/**
 * True if any component of `absPath` below `realRoot` is a symlink.
 *
 * Runs on the CANONICALIZED path, so every link that `realpath` could resolve is
 * already gone by the time it walks — which is exactly why an in-workspace link
 * to an existing in-workspace target is followed rather than refused.
 *
 * What is left for it to catch is the DANGLING link, and that is load-bearing: a
 * link whose target does not exist yet makes `realpath` throw ENOENT, so
 * canonicalization treats it as a to-be-created name and lets it through. A write
 * then follows the link and creates the file at its EXTERNAL target. An `lstat`
 * walk sees the link itself and refuses it regardless of where it points.
 */
async function hasSymlinkComponent(realRoot: string, absPath: string): Promise<boolean> {
  let cur = realRoot;
  for (const part of relative(realRoot, absPath).split(sep).filter(Boolean)) {
    cur = resolve(cur, part);
    try {
      if ((await lstat(cur)).isSymbolicLink()) return true;
    } catch (e) {
      // Nothing there yet — the rest of the path cannot exist either, so there is
      // no link left to find. Anything else is unreadable metadata: fail closed.
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
      return true;
    }
  }
  return false;
}

/**
 * Confines `rel` inside `root` and returns the CANONICAL absolute path, or null
 * on violation.
 *
 * Exported so other main-process modules (e.g. git.ts) validate caller-supplied
 * relative paths against a workspace root with the SAME guard — there is exactly
 * one path-escape policy in the app and it lives here.
 *
 * Async because containment cannot be decided without touching the filesystem.
 *
 * The boundary is the WORKSPACE, not "no symlinks at all". A link whose target
 * exists and is itself inside the workspace is followed, and what comes back is
 * the canonical path of that target — it reaches nothing the caller could not
 * already reach by its real name, and refusing it would make an ordinary
 * `node_modules` or monorepo checkout unbrowsable. What is refused is a link that
 * leaves the workspace, and a DANGLING link, whose target does not exist yet and
 * so cannot be proven to land inside it.
 */
export async function safeResolve(root: string, rel: string): Promise<string | null> {
  const lex = lexicalJoin(root, rel);
  if (!lex) return null;
  let realRoot: string;
  try {
    realRoot = await realpath(lex.absRoot);
  } catch {
    return null;
  }
  const abs = await canonicalize(realRoot, lex.absPath);
  if (!abs) return null;
  if (await hasSymlinkComponent(realRoot, abs)) return null;
  return abs;
}

/**
 * Open-time guards, so containment does not depend on the path still meaning the
 * same thing between the check above and the open below.
 *
 * O_NOFOLLOW makes the kernel refuse the final component if it is a symlink;
 * O_NONBLOCK keeps a FIFO from parking the open (and with it the IPC call and the
 * renderer's loading state) forever. Both are POSIX-only — on Windows they are
 * undefined and OR in as 0, which is why the `lstat` walk above is a check in its
 * own right and not merely a pre-filter.
 */
const READ_FLAGS = constants.O_RDONLY | (constants.O_NOFOLLOW | 0) | (constants.O_NONBLOCK | 0);
const WRITE_FLAGS =
  constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | (constants.O_NOFOLLOW | 0);

/**
 * Open a path that `safeResolve` has ALREADY cleared, for reading.
 *
 * Exported, and the only way any main-process module opens a confined path,
 * because clearing a path and reading it are two separate resolutions: the guard
 * inspects the path, and then the kernel looks it up again at open time. Whatever
 * replaces the final component in between is what the read actually gets, so the
 * open has to refuse it on its own — a caller that reaches for a plain `readFile`
 * after `safeResolve` has no final-component protection at all.
 *
 * Callers still have to check `fstat` THROUGH the returned handle (not `stat` on
 * the path, which resolves it a third time) before trusting what they opened.
 */
export function openForRead(abs: string): Promise<FileHandle> {
  return open(abs, READ_FLAGS);
}

export interface DirEntry {
  name: string;
  isDir: boolean;
  size: number;
  mtime: number;
}

export async function listDir(root: string, rel: string): Promise<{
  ok: true; entries: DirEntry[]; path: string;
} | { ok: false; error: string }> {
  const abs = await safeResolve(root, rel);
  if (!abs) return { ok: false, error: 'path escapes root' };
  try {
    const names = await readdir(abs);
    const entries = await Promise.all(names.map(async (name): Promise<DirEntry> => {
      try {
        const s = await stat(join(abs, name));
        return { name, isDir: s.isDirectory(), size: s.size, mtime: s.mtimeMs };
      } catch {
        return { name, isDir: false, size: 0, mtime: 0 };
      }
    }));
    entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return { ok: true, entries, path: abs };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const MAX_READ_BYTES = 2 * 1024 * 1024; // 2 MB

export async function readFileText(root: string, rel: string): Promise<{
  ok: true; content: string; path: string; size: number;
} | { ok: false; error: string }> {
  const abs = await safeResolve(root, rel);
  if (!abs) return { ok: false, error: 'path escapes root' };
  let fh;
  try {
    fh = await openForRead(abs);
    const s = await fh.stat();
    if (!s.isFile()) return { ok: false, error: 'not a regular file' };
    if (s.size > MAX_READ_BYTES) {
      return { ok: false, error: `file too large (${(s.size / 1024 / 1024).toFixed(1)} MB)` };
    }
    const buf = await fh.readFile();
    // Reject obvious binary files based on null-byte sniff
    if (buf.includes(0)) return { ok: false, error: 'binary file (not displayable)' };
    return { ok: true, content: buf.toString('utf8'), path: abs, size: s.size };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    await fh?.close().catch(() => {});
  }
}

/**
 * Ceiling for the BINARY read. Deliberately larger than MAX_READ_BYTES (2 MB):
 * that cap exists to stop Monaco choking on a huge text buffer, and applying it
 * to images would reject the exact files people want to look at — a retina
 * screenshot of a full 5K display is routinely 3–6 MB. 10 MB covers real
 * screenshots and design assets while still refusing to hand the renderer a
 * video-sized payload over structured clone.
 */
const MAX_BINARY_READ_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Read a file as raw BYTES, confined to `root` by the same `safeResolve` guard as
 * every other fs entry point here.
 *
 * Exists because the text path deliberately refuses binary content (the
 * null-byte sniff in readFileText), which meant a PNG in an agent's workspace
 * was completely unviewable inside the app — the IDE opened a tab that said
 * "binary file (not displayable)" and stopped there. The renderer cannot reach
 * the file itself: the CSP is `default-src 'self'` with no `file:` source and
 * there is no registered file protocol, so `<img src="file://…">` silently
 * fails. Bytes therefore have to travel over IPC, and the renderer turns them
 * into a `blob:` URL (already allowed by `img-src`).
 *
 * NEVER reads unbounded: the size is checked from stat BEFORE opening, and
 * re-checked against the bytes actually read so a file that grows between the
 * two calls can't slip past the cap.
 */
export async function readFileBinary(root: string, rel: string, maxBytes = MAX_BINARY_READ_BYTES): Promise<{
  ok: true; bytes: Uint8Array<ArrayBuffer>; mime: string; path: string; size: number;
} | { ok: false; error: string }> {
  const abs = await safeResolve(root, rel);
  if (!abs) return { ok: false, error: 'path escapes root' };
  let fh;
  try {
    fh = await openForRead(abs);
    const s = await fh.stat();
    // Directories and FIFOs are the trap here: readFile on a directory throws
    // (fine) but on a FIFO it BLOCKS forever with no size to check against, which
    // would hang the IPC call and, with it, the renderer's loading state.
    if (!s.isFile()) return { ok: false, error: 'not a regular file' };
    if (s.size > maxBytes) {
      return { ok: false, error: `file too large (${(s.size / 1024 / 1024).toFixed(1)} MB)` };
    }
    const buf = await fh.readFile();
    if (buf.byteLength > maxBytes) {
      // The file grew between stat and read. Rare, but the cap is a memory
      // guarantee for the renderer, not an advisory.
      return { ok: false, error: 'file grew past the size limit while reading' };
    }
    // COPY into a freshly-allocated Uint8Array instead of forwarding the Buffer.
    // Node serves small reads out of a shared 8 KB Buffer pool, so a pooled
    // Buffer is a VIEW onto memory that also holds unrelated recently-read
    // bytes; structured-clone carries the whole backing ArrayBuffer across the
    // IPC boundary, not just the view. Copying keeps the renderer's payload
    // exactly the file and nothing else.
    const bytes = new Uint8Array(buf.byteLength);
    bytes.set(buf);
    return {
      ok: true,
      bytes,
      mime: imageMimeForPath(abs) ?? 'application/octet-stream',
      path: abs,
      size: s.size
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    await fh?.close().catch(() => {});
  }
}

export async function writeFileText(root: string, rel: string, content: string): Promise<{
  ok: true; path: string;
} | { ok: false; error: string }> {
  const abs = await safeResolve(root, rel);
  if (!abs) return { ok: false, error: 'path escapes root' };
  let fh;
  try {
    fh = await open(abs, WRITE_FLAGS, 0o666);
    await fh.writeFile(content, 'utf8');
    return { ok: true, path: abs };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    await fh?.close().catch(() => {});
  }
}

/* ─────────────────────────── repo-wide search (0.4.9 phase 9) ──────────────
 * The IDE could open a file and edit it and never once answer "where is this
 * string?". ⌘F searched the buffer in front of you, which is the question
 * nobody was asking.
 *
 * Node, not ripgrep. Shelling out to a binary the user may not have, on a path
 * we would then have to quote, to search a tree we already walk, buys speed we
 * do not need at this size and costs a dependency and an injection surface.
 * What it does buy is bounds, and those are set explicitly below instead.
 */

/** Directories that are never source and are usually enormous. `.git` is not
 *  optional; the rest are conventions, and a dot-directory that is not on this
 *  list (`.github`, `.claude`) IS searched, because people keep real files
 *  there. */
const SEARCH_SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'out', 'build', 'coverage', '.next', '.nuxt',
  '.cache', '.turbo', '.parcel-cache', '__pycache__', '.venv', 'venv',
  '.mypy_cache', '.pytest_cache', 'target', 'vendor', 'Pods', '.gradle', '.dart_tool'
]);

/** A file bigger than this is a bundle, a lockfile or a fixture, not something
 *  a person is searching for a word in. */
const SEARCH_MAX_FILE_BYTES = 1024 * 1024;
/** Sniffed from the head of the file: one null byte and it is not text. */
const SEARCH_SNIFF_BYTES = 8192;

export interface SearchHit {
  rel: string;
  /** 1-based, so it can be handed straight to an editor. */
  line: number;
  /** 1-based column of the match within the line. */
  col: number;
  /** The whole line, clipped: a minified file would otherwise send back a
   *  megabyte of one "line" per hit. */
  text: string;
  /** Length of the match, so the renderer can mark it without re-running the
   *  pattern (and without disagreeing with the matcher about what matched). */
  length: number;
}

export interface SearchOptions {
  regex?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  /** Stop after this many hits and say so. */
  maxHits?: number;
  /** Wall-clock ceiling. A search is interactive; one that runs longer than
   *  this has already lost, so it returns what it has. */
  timeBudgetMs?: number;
}

export type SearchOutcome =
  | { ok: true; hits: SearchHit[]; truncated: boolean; filesScanned: number }
  | { ok: false; error: string };

const MAX_LINE_CHARS = 400;

/** Build the matcher. A literal query is escaped, so a search for `a.b` does
 *  not quietly match `axb`, which is the bug every naive search ships with. */
function buildMatcher(query: string, o: SearchOptions): RegExp | { error: string } {
  const flags = o.caseSensitive ? 'g' : 'gi';
  let source: string;
  if (o.regex) {
    source = query;
  } else {
    source = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  if (o.wholeWord) source = `\\b(?:${source})\\b`;
  try {
    return new RegExp(source, flags);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'bad pattern' };
  }
}

/**
 * Search every text file under `root` for `query`.
 *
 * Confined by the same `safeResolve` as every other entry point here, and bounded
 * four ways: hits, files scanned, per-file size, and wall clock. It returns
 * `truncated` rather than pretending a capped result is the whole answer,
 * because a search that silently lies about completeness is worse than one
 * that says it gave up.
 */
export async function searchInRoot(root: string, query: string, opts: SearchOptions = {}): Promise<SearchOutcome> {
  const absRoot = await safeResolve(root, '');
  if (!absRoot) return { ok: false, error: 'path escapes root' };
  if (!query) return { ok: true, hits: [], truncated: false, filesScanned: 0 };
  const matcher = buildMatcher(query, opts);
  if ('error' in matcher) return { ok: false, error: matcher.error };

  const maxHits = Math.min(Math.max(opts.maxHits ?? 500, 1), 5000);
  const deadline = Date.now() + Math.min(Math.max(opts.timeBudgetMs ?? 5000, 250), 30_000);
  const hits: SearchHit[] = [];
  let filesScanned = 0;
  let truncated = false;

  const walk = async (dirAbs: string, dirRel: string): Promise<void> => {
    if (truncated) return;
    let entries;
    try {
      entries = await readdir(dirAbs, { withFileTypes: true });
    } catch {
      return; // an unreadable directory is not a failed search
    }
    for (const e of entries) {
      if (truncated) return;
      if (Date.now() > deadline) { truncated = true; return; }
      const rel = dirRel ? `${dirRel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (SEARCH_SKIP_DIRS.has(e.name)) continue;
        await walk(join(dirAbs, e.name), rel);
        continue;
      }
      // A symlink is not followed: it can point outside the root, and the
      // confinement guard is about the path we were given, not where the
      // filesystem chooses to send us.
      if (!e.isFile()) continue;
      let buf: Buffer;
      try {
        const s = await stat(join(dirAbs, e.name));
        if (s.size > SEARCH_MAX_FILE_BYTES) continue;
        buf = await readFile(join(dirAbs, e.name));
      } catch {
        continue;
      }
      if (buf.subarray(0, SEARCH_SNIFF_BYTES).includes(0)) continue;
      filesScanned++;
      const lines = buf.toString('utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        matcher.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = matcher.exec(line)) !== null) {
          hits.push({
            rel, line: i + 1, col: m.index + 1,
            text: line.length > MAX_LINE_CHARS ? `${line.slice(0, MAX_LINE_CHARS)}…` : line,
            length: m[0].length
          });
          if (hits.length >= maxHits) { truncated = true; return; }
          // A zero-width match (`a*`, `^`) would spin here forever.
          if (m[0].length === 0) matcher.lastIndex++;
        }
      }
    }
  };

  await walk(absRoot, '');
  return { ok: true, hits, truncated, filesScanned };
}

/* ─────────────────────── file operations (0.4.9 phase 9) ───────────────────
 * New file, new folder, rename. Every one of them resolves through safeResolve,
 * and the two-ended ones (rename) resolve BOTH ends: a rename whose
 * destination escapes the root is a write outside the root with extra steps.
 *
 * None of them overwrite. `wx` and mkdir's own EEXIST do the refusing, rather
 * than a stat-then-write that races anything else touching the tree.
 */

export type FsOpResult = { ok: true; path: string; rel: string } | { ok: false; error: string };

/** Reject the names a path component may not have, before the filesystem is
 *  asked. A `..` component is caught by safeResolve; these are the ones that
 *  would otherwise succeed and produce something unusable. */
function badName(rel: string): string | null {
  if (!rel || !rel.trim()) return 'name is empty';
  if (rel.includes('\0')) return 'name contains a null byte';
  if (rel.length > 1024) return 'name is too long';
  const parts = rel.split('/').filter(Boolean);
  if (!parts.length) return 'name is empty';
  for (const p of parts) {
    if (p === '.' || p === '..') return 'name contains a path segment that is not a name';
    if (p.trim() !== p) return 'name starts or ends with a space';
  }
  return null;
}

export async function makeDirIn(root: string, rel: string): Promise<FsOpResult> {
  const bad = badName(rel);
  if (bad) return { ok: false, error: bad };
  const abs = await safeResolve(root, rel);
  if (!abs) return { ok: false, error: 'path escapes root' };
  try {
    // Not recursive-silent: `recursive: true` succeeds on an existing folder,
    // which would tell the person they made something they did not.
    await mkdir(abs, { recursive: false });
    return { ok: true, path: abs, rel };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'EEXIST') return { ok: false, error: 'already exists' };
    if (err.code === 'ENOENT') return { ok: false, error: 'the folder above it does not exist' };
    return { ok: false, error: err.message ?? String(e) };
  }
}

/** Create an EMPTY file. Never truncates: `wx` fails if anything is there. */
export async function createFileIn(root: string, rel: string): Promise<FsOpResult> {
  const bad = badName(rel);
  if (bad) return { ok: false, error: bad };
  const abs = await safeResolve(root, rel);
  if (!abs) return { ok: false, error: 'path escapes root' };
  try {
    const h = await open(abs, 'wx');
    await h.close();
    return { ok: true, path: abs, rel };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'EEXIST') return { ok: false, error: 'already exists' };
    if (err.code === 'ENOENT') return { ok: false, error: 'the folder above it does not exist' };
    return { ok: false, error: err.message ?? String(e) };
  }
}

/** Rename or move, both ends confined. Refuses to clobber an existing path:
 *  `rename` on POSIX silently replaces the destination, which would delete a
 *  file the person never named. */
export async function renameIn(root: string, fromRel: string, toRel: string): Promise<FsOpResult> {
  const bad = badName(fromRel) ?? badName(toRel);
  if (bad) return { ok: false, error: bad };
  const from = await safeResolve(root, fromRel);
  const to = await safeResolve(root, toRel);
  if (!from || !to) return { ok: false, error: 'path escapes root' };
  if (from === to) return { ok: true, path: to, rel: toRel };
  try {
    await stat(to);
    return { ok: false, error: 'already exists' };
  } catch { /* the destination is free, which is what we want */ }
  try {
    // The destination's parent has to exist; mkdir -p on the caller's behalf
    // would turn a typo'd rename into a tree of empty folders.
    await stat(dirname(to));
  } catch {
    return { ok: false, error: 'the folder above it does not exist' };
  }
  try {
    await rename(from, to);
    return { ok: true, path: to, rel: toRel };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') return { ok: false, error: 'not found' };
    return { ok: false, error: err.message ?? String(e) };
  }
}

/**
 * Expand a leading `~` to the user's home dir and return an absolute, normalized
 * path. SYNC on purpose — every consumer (spawn guards, cwd validation, config
 * writes) is synchronous.
 *
 * Only a SHELL expands `~`; Node's `fs`/`child_process` treat it as a literal
 * directory name, so a user-typed `~/dev/foo` fails every existsSync/statSync and
 * dies with `cwd does not exist`. This is applied at INGESTION (project add,
 * `pty:spawn`) so the registry only ever stores an ABSOLUTE cwd, with
 * defense-in-depth at the consumers.
 *
 * Non-tilde absolute paths are returned resolved/normalized. Anything that is
 * still RELATIVE after expansion is returned untouched (trimmed) so callers keep
 * their own "not-absolute" errors instead of it being silently resolved against
 * the Electron process cwd. Empty input passes straight through. Windows paths
 * (`C:\…`, UNC) are unaffected — they never start with `~`.
 */
export function expandTilde(p: string): string {
  if (typeof p !== 'string') return p;
  const t = p.trim();
  if (!t) return p;
  let out = t;
  if (t === '~') out = homedir();
  else if (t.startsWith('~/') || t.startsWith('~\\')) out = join(homedir(), t.slice(2));
  if (!isAbsolute(out)) return t;
  return resolve(out);
}

/**
 * Normalize the hive home and its recent-list in one place (#140).
 *
 * Onboarding SUGGESTS `~/HarnessAgents` in a free-text field, so the single most
 * common setup path — accept the default, press Finish — used to persist a literal
 * `~`. Finish immediately creates that directory, and Node's mkdir has no concept
 * of `~`: it tried to create a folder literally named "~" and died with
 * `ENOENT: no such file or directory, mkdir '~/HarnessAgents'`, wedging the wizard
 * on its last step. Expanding at the config-write boundary means every downstream
 * reader — mkdir, the hive root, the launch picker — sees one absolute path.
 *
 * `prior` is normalized too: entries written before this existed would otherwise
 * let the launch picker hand a stale `~/…` string straight back and reintroduce
 * the same failure. Deduped against the new home, newest first, capped.
 */
export function normalizeHiveHome(
  home: string,
  prior: readonly string[] = [],
  cap = 8
): { home: string; recentHives: string[] } {
  const abs = expandTilde(home);
  const seen = new Set<string>([abs]);
  const recentHives = [abs];
  for (const h of prior) {
    if (typeof h !== 'string' || !h.trim()) continue;
    const e = expandTilde(h);
    if (seen.has(e)) continue;
    seen.add(e);
    recentHives.push(e);
  }
  return { home: abs, recentHives: recentHives.slice(0, cap) };
}

/** Existence/metadata check for an ABSOLUTE path (v0.3.4 — backs the terminal
 *  ⌘-click markdown flow). `~/` is expanded here (the renderer doesn't know
 *  the home dir). Read-only metadata: returns whether a regular file exists and
 *  the normalized absolute path; never file contents. */
export async function statAbs(p: string): Promise<{ exists: boolean; isFile: boolean; path: string }> {
  const abs = expandTilde(p);
  if (!isAbsolute(abs)) return { exists: false, isFile: false, path: p };
  try {
    const s = await stat(abs);
    return { exists: true, isFile: s.isFile(), path: abs };
  } catch {
    return { exists: false, isFile: false, path: abs };
  }
}

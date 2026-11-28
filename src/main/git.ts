import { spawn } from 'node:child_process';
import { existsSync, readdirSync, promises as fsp, type Dirent } from 'node:fs';
import { devNull } from 'node:os';
import { join } from 'node:path';
import { openForRead, safeResolve } from './fs';
import { unlinkWorktreeDeps } from './worktreeDeps';
import { agentBranchFor, isPartialCloneAt, safeGit } from '../core/gitSafe';
import { recordWorktreeBase } from '../core/worktreeBase';

/** Run git in `cwd` with `args`. Returns stdout text or an error.
 *
 *  The folder's own `.git/config` may have been written by somebody else (a
 *  client on the bridge, or whoever prepared a folder a person opened), so
 *  git runs on a private copy of that config that holds only the keys on
 *  the allow list (src/core/gitSafe.ts). The one door for every git call
 *  in this file. */
/** `settingsNotCarried`: git ran and its answer stands, and what it wrote to
 *  the repository's settings during the run (the upstream of a branch a
 *  switch made) did not reach the repository's real config. */
type GitRun = { ok: true; stdout: string; settingsNotCarried?: true } | { ok: false; error: string };

async function runGit(cwd: string, args: string[], timeoutMs = 8000): Promise<GitRun> {
  const safe = await safeGit(cwd, args, { timeoutMs });
  if (!safe.ok) return { ok: false, error: safe.error };
  return new Promise<{ ok: true; stdout: string } | { ok: false; error: string }>((resolve) => {
    // Its own process group, so the time limit ends git AND whatever git
    // started: a child left alive holds the pipes, and `close` never fires.
    const group = process.platform !== 'win32';
    const proc = spawn(safe.program, safe.args, { cwd: safe.cwd, env: safe.env, detached: group });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    const settle = (answer: { ok: true; stdout: string } | { ok: false; error: string }): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(answer);
    };
    // Stop it, and do not wait for `close`: a child that left the group and
    // kept the pipes open would hold the call as long as it lives.
    const stop = (words: string): void => {
      try { if (group && proc.pid) process.kill(-proc.pid, 'SIGKILL'); else proc.kill('SIGKILL'); } catch { try { proc.kill('SIGKILL'); } catch { /* gone */ } }
      try { proc.stdout.destroy(); proc.stderr.destroy(); } catch { /* closed */ }
      settle({ ok: false, error: words });
    };
    const timer = setTimeout(() => stop(gitTimeLimitWords(timeoutMs)), timeoutMs);
    const take = (into: Buffer[]) => (d: Buffer): void => {
      if (settled) return;
      bytes += d.length;
      // Capped: one string cannot hold more than about 512 MB, and nothing the app shows is near this.
      if (bytes > gitOutputCap) { stop(GIT_TOO_MUCH_OUTPUT); return; }
      into.push(d);
    };
    proc.stdout.on('data', take(out));
    proc.stderr.on('data', take(err));
    proc.on('error', e => settle({ ok: false, error: e.message }));
    proc.on('close', code => {
      if (code === 0) settle({ ok: true, stdout: safe.fix(Buffer.concat(out).toString()) });
      else settle({ ok: false, error: safe.fix(Buffer.concat(err).toString()).trim() || `git exited ${code}` });
    });
  }).then(async (answer): Promise<GitRun> => {
    // Never swallowed: a run that worked and left its settings behind says so.
    const { settings } = await safe.done();
    if (settings !== 'not-carried') return answer;
    console.warn(`[git] ${args[0] ?? ''}: the settings git wrote during this run were not carried to the repository's config`);
    return answer.ok ? { ...answer, settingsNotCarried: true } : answer;
  }, async (e): Promise<GitRun> => {
    // git could not be started at all (spawn threw): the private folder is
    // removed here too, and the fault goes on as it was.
    try { await safe.done(); } catch { /* the fault that is thrown is the first one */ }
    throw e;
  });
}

export const NOT_DOWNLOADED_FILE = 'this file is not downloaded (a partial clone) and the app does not fetch it; read it in a terminal';
export const IS_A_FOLDER = 'this path is a folder, not a file';
export const NOT_DOWNLOADED_IS_FOLDER = 'this path is a folder, and it is not downloaded (a partial clone); the app does not fetch it; read it in a terminal';
export const NOT_DOWNLOADED_FOLDER = 'the app cannot tell whether this file exists: a folder on the way to it is not downloaded (a partial clone) and the app does not fetch it; read it in a terminal';
/** What a call that ran out of time answers: a time limit, said as one. */
export const GIT_TIME_LIMIT = 'git did not answer in time and was stopped';
const gitTimeLimitWords = (ms: number): string => `${GIT_TIME_LIMIT} (${Math.round(ms / 1000)} s)`;
export const GIT_TOO_MUCH_OUTPUT = 'git wrote more than the app reads and was stopped';
/** The most one call's output may weigh. */
const gitOutputCap = 128 * 1024 * 1024;
/** A call that was stopped, not one git answered: never read as "not there". */
const wasStopped = (error: string): boolean => error.startsWith(GIT_TIME_LIMIT) || error === GIT_TOO_MUCH_OUTPUT;

/** A base branch that would read as an option, or holds a character no ref
 *  has, is answered as a query that failed: every caller then keeps the work. */
const UNSAFE_BASE = { ok: false as const, error: 'invalid revision' };

/** Make a work tree and fill it. Two steps: `worktree add` checks nothing out, then
 *  the files are written by a run of its own in the new work tree. Both run
 *  on the private copy of the config, where no filter a client named can
 *  run (src/core/gitSafe.ts). */
async function addWorktreeFilled(cwd: string, wtPath: string, rest: string[]): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
  const added = await runGit(cwd, ['worktree', 'add', '--no-checkout', wtPath, ...rest], 15000);
  if (!added.ok) return added;
  const filled = await runGit(wtPath, ['reset', '--hard', '-q'], 60000);
  if (filled.ok) return added;
  // Not left half made: an empty work tree would read as "every file deleted".
  await runGit(cwd, ['worktree', 'remove', '--force', wtPath]);
  return filled;
}

export interface GitBranchInfo {
  current: string | null;
  detached: boolean;
}
export interface GitStatusEntry {
  path: string;
  index: string;   // staged status char
  worktree: string; // unstaged status char
  oldPath?: string; // rename/copy source, when the record carries one
}
export interface GitStatus {
  staged: GitStatusEntry[];
  unstaged: GitStatusEntry[];
  untracked: string[];
}
export interface GitCommit {
  sha: string;
  shortSha: string;
  parents: string[];
  subject: string;
  author: string;
  time: number; // unix seconds
  refs: string[]; // branch/tag refs
}
export interface GitAheadBehind {
  ahead: number;
  behind: number;
  upstream: string | null;
}

export async function getBranch(cwd: string): Promise<GitBranchInfo | { error: string }> {
  const head = await runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!head.ok) return { error: head.error };
  const name = head.stdout.trim();
  if (name === 'HEAD') return { current: null, detached: true };
  return { current: name, detached: false };
}

export async function getStatus(cwd: string): Promise<GitStatus | { error: string }> {
  const res = await runGit(cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  if (!res.ok) return { error: res.error };
  const entries: GitStatusEntry[] = [];
  const untracked: string[] = [];
  const tokens = res.stdout.split('\0').filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.length < 3) continue;
    const index = token[0];
    const worktree = token[1];
    const path = token.slice(3);
    if (index === '?' && worktree === '?') { untracked.push(path); continue; }
    const entry: GitStatusEntry = { path, index, worktree };
    // Rename/copy records carry a SECOND null-terminated path — the source
    // ("R  <new>\0<old>\0"). Consume it (as parseNameStatusZ does) and keep it
    // on the entry, or the old path is parsed as another status record whose
    // status letters come from the filename.
    if (index === 'R' || index === 'C' || worktree === 'R' || worktree === 'C') {
      const oldPath = tokens[i + 1];
      if (oldPath !== undefined) { entry.oldPath = oldPath; i += 1; }
    }
    entries.push(entry);
  }
  return {
    staged: entries.filter(e => e.index !== ' ' && e.index !== '?'),
    unstaged: entries.filter(e => e.worktree !== ' ' && e.worktree !== '?'),
    untracked
  };
}

export async function getLog(cwd: string, n: number): Promise<GitCommit[] | { error: string }> {
  const sep = '\x1e';   // record separator
  const fsep = '\x1f';  // field separator
  const fmt = ['%H', '%P', '%s', '%an', '%at', '%D'].join(fsep) + sep;
  const res = await runGit(cwd, ['log', '--all', `--max-count=${n}`, `--pretty=format:${fmt}`]);
  if (!res.ok) return { error: res.error };
  const out: GitCommit[] = [];
  for (const rec of res.stdout.split(sep)) {
    if (!rec.trim()) continue;
    const [sha, parents, subject, author, atime, refs] = rec.split(fsep);
    if (!sha) continue;
    out.push({
      sha,
      shortSha: sha.slice(0, 7),
      parents: parents.split(' ').filter(Boolean),
      subject: subject ?? '',
      author: author ?? '',
      time: parseInt(atime, 10) || 0,
      refs: (refs ?? '').split(', ').map(s => s.trim()).filter(Boolean)
    });
  }
  return out;
}

export async function getBranches(cwd: string): Promise<{
  local: string[]; remote: string[]; current: string | null;
} | { error: string }> {
  const res = await runGit(cwd, ['branch', '-a', '--format=%(HEAD)\x1f%(refname:short)']);
  if (!res.ok) return { error: res.error };
  let current: string | null = null;
  const local: string[] = [];
  const remote: string[] = [];
  for (const line of res.stdout.split('\n')) {
    if (!line) continue;
    const [head, name] = line.split('\x1f');
    if (!name) continue;
    if (head.trim() === '*') current = name;
    if (name.startsWith('remotes/')) remote.push(name.replace(/^remotes\//, ''));
    else local.push(name);
  }
  return { local, remote, current };
}

export async function getAheadBehind(cwd: string): Promise<GitAheadBehind | { error: string }> {
  const up = await runGit(cwd, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (!up.ok) return { ahead: 0, behind: 0, upstream: null };
  const upstream = up.stdout.trim();
  const ab = await runGit(cwd, ['rev-list', '--left-right', '--count', `HEAD...${upstream}`]);
  if (!ab.ok) return { error: ab.error };
  const [ahead, behind] = ab.stdout.trim().split('\t').map(n => parseInt(n, 10) || 0);
  return { ahead, behind, upstream };
}

/** Best-effort detect: is `cwd` actually a git repo? */
export async function isRepo(cwd: string): Promise<boolean> {
  const res = await runGit(cwd, ['rev-parse', '--is-inside-work-tree']);
  return res.ok && res.stdout.trim() === 'true';
}

const MAX_DIFF_BYTES = 2 * 1024 * 1024; // 2 MB — keep the diff view responsive

/** A file's two sides for a working-tree-vs-HEAD diff. `head` is the committed
 *  version ('' for a new/untracked file); `working` is the on-disk version ('' for
 *  a file deleted from the working tree). The renderer feeds these straight into
 *  Monaco's DiffEditor (original = head, modified = working). */
export interface GitDiff {
  ok: true;
  path: string;            // resolved absolute path (display only)
  relPath: string;
  head: string;
  working: string;
  headExists: boolean;     // file is tracked at HEAD
  workingExists: boolean;  // file is present in the working tree
  isBinary: boolean;       // either side is binary → not text-diffable
}

/**
 * Diff a single file: its committed (HEAD) content vs its current working-tree
 * content. `relPath` MUST be repo-root-relative and is path-validated against
 * `cwd` with the shared fs guard (no escaping the workspace). All git/fs access
 * stays in the main process — the renderer only ever receives the two text sides.
 */
export async function getDiff(
  cwd: string, relPath: string
): Promise<GitDiff | { ok: false; error: string }> {
  const abs = await safeResolve(cwd, relPath);
  if (!abs) return { ok: false, error: 'path escapes repository root' };

  // HEAD side: `git show HEAD:<path>` — errors (untracked / new file) → no head version.
  let head = '';
  let headExists = false;
  const show = await runGit(cwd, ['show', `HEAD:${relPath}`]);
  if (show.ok) { head = show.stdout; headExists = true; }

  // Working side: read the on-disk file through the same guarded open as the file
  // IPC, so the final component is re-checked by the kernel at open time rather
  // than trusted from the `safeResolve` above. ENOENT (or a refused open) →
  // nothing diffable in the working tree.
  let working = '';
  let workingExists = false;
  let workingBinary = false;
  let fh;
  try {
    fh = await openForRead(abs);
    // Stat THROUGH the handle: it describes what is actually open, where a second
    // `stat` on the path would resolve it again. A directory has no diffable
    // content, and a FIFO would park the read — and the IPC call behind it —
    // forever.
    const s = await fh.stat();
    if (!s.isFile()) throw new Error('not a regular file');
    if (s.size > MAX_DIFF_BYTES) {
      return { ok: false, error: `file too large to diff (${(s.size / 1048576).toFixed(1)} MB)` };
    }
    const buf = await fh.readFile();
    workingExists = true;
    if (buf.includes(0)) workingBinary = true;
    else working = buf.toString('utf8');
  } catch {
    workingExists = false;
  } finally {
    await fh?.close().catch(() => {});
  }

  const isBinary = workingBinary || head.includes('\0');
  return {
    ok: true,
    path: abs,
    relPath,
    head: isBinary ? '' : head,
    working: isBinary ? '' : working,
    headExists,
    workingExists,
    isBinary
  };
}

/** The MAIN working tree of the repository `cwd` belongs to.
 *
 *  For a normal checkout that's just the repo root. For a linked worktree it is
 *  the original repo, NOT the worktree directory — an isolated agent's cwd is
 *  `<harnessHome>/worktrees/<agent-id>`, whose basename is the agent id and says
 *  nothing about which project it's working on. `--git-common-dir` resolves to
 *  the shared `.git` of the main checkout from anywhere in the worktree family.
 *  Returns null when `cwd` isn't a git repo (or git is unavailable). */
export async function mainRepoRoot(cwd: string): Promise<string | null> {
  const res = await runGit(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (!res.ok) return null;
  const gitDir = res.stdout.trim();
  if (!gitDir) return null;
  // `<repo>/.git` → `<repo>`. A bare repo has no working tree to name, so its
  // own path is the best answer we have.
  const stripped = gitDir.replace(/[\\/]\.git[\\/]?$/, '');
  return stripped || gitDir;
}

/** Provision an isolated git worktree for an agent at `wtPath`, branching off
 *  `baseBranch`. Tries to create a fresh `agent/<id>` branch first; if that
 *  branch already exists, falls back to checking out `baseBranch` directly. */
export async function addWorktree(
  cwd: string, wtPath: string, baseBranch: string
): Promise<{ ok: boolean; error?: string }> {
  // The base reaches git as an argument: never one that reads as an option.
  if (!isSafeRev(baseBranch)) return { ok: false, error: 'invalid revision' };
  const branch = agentBranchFor(wtPath);
  // The base is written down beside the worktree (core/worktreeBase.ts), so
  // the Projects view can still compare with it after a restart.
  const fresh = await addWorktreeFilled(cwd, wtPath, ['-b', branch, baseBranch]);
  if (fresh.ok) { recordWorktreeBase(wtPath, baseBranch); return { ok: true }; }
  // Branch likely already exists (or the path is taken) — retry without -b.
  const fallback = await addWorktreeFilled(cwd, wtPath, [baseBranch]);
  if (fallback.ok) { recordWorktreeBase(wtPath, baseBranch); return { ok: true }; }
  return { ok: false, error: fallback.error };
}

/** The two removals `unlinkLinksUnder` uses; a test hands in its own. */
export interface LinkOps { unlink: (p: string) => Promise<void>; rmdir: (p: string) => Promise<void> }
const fsLinkOps: LinkOps = { unlink: (p) => fsp.unlink(p), rmdir: (p) => fsp.rmdir(p) };

/**
 * Remove every symlink and junction under `root` as a LINK, never through it.
 * A link is never followed: the walk goes down real folders only. On Windows
 * `unlink` can refuse a junction, and a NON-recursive `rmdir` then removes the
 * link alone. The folder entries' own types are used, so a large tree costs
 * one read per folder, not one stat per file; an entry of unknown type is
 * asked with `lstat`.
 */
export async function unlinkLinksUnder(
  root: string, ops: LinkOps = fsLinkOps
): Promise<{ removed: number; failed: { path: string; error: string }[] }> {
  let removed = 0;
  const failed: { path: string; error: string }[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    // A folder or entry that cannot be read may hide a link, so it counts as
    // failed and the removal refuses. Gone in the meantime (ENOENT) is fine.
    const unreadable = (p: string, err: unknown): void => {
      if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return;
      failed.push({ path: p, error: `cannot be read: ${err instanceof Error ? err.message : String(err)}` });
    };
    let entries: Dirent[];
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch (err) { unreadable(dir, err); continue; }
    for (const e of entries) {
      const p = join(dir, e.name);
      let link = e.isSymbolicLink();
      let folder = e.isDirectory();
      if (!link && !folder && !e.isFile()) {
        try { const st = await fsp.lstat(p); link = st.isSymbolicLink(); folder = st.isDirectory(); } catch (err) { unreadable(p, err); continue; }
      }
      if (link) {
        try { await ops.unlink(p); removed++; } catch {
          try { await ops.rmdir(p); removed++; } catch (err) {
            failed.push({ path: p, error: err instanceof Error ? err.message : String(err) });
          }
        }
      } else if (folder) stack.push(p);
    }
  }
  return { removed, failed };
}

/** Is `wtPath` one of `cwd`'s LINKED worktrees: listed by git, and not the
 *  first entry (the main checkout)? Compared by real path; any doubt is no.
 *  `{ error }` when git could not list them at all. */
async function isLinkedWorktreeOf(cwd: string, wtPath: string): Promise<boolean | { error: string }> {
  const list = await listWorktrees(cwd);
  if (!Array.isArray(list)) return { error: list.error };
  let wt: string;
  try { wt = await fsp.realpath(wtPath); } catch { return false; }
  for (const w of list.slice(1)) {
    try { if (await fsp.realpath(w.path) === wt) return true; } catch { /* listed, but gone */ }
  }
  return false;
}

/** Best-effort removal of an agent's worktree. Forced so a dirty tree doesn't
 *  block teardown; failures are surfaced but callers may ignore them. A path
 *  that is not a linked worktree of `cwd`, or is itself a link, is refused
 *  (`refused`) before anything is touched. A link inside that cannot be removed
 *  as a link, or a folder that cannot be read, refuses the removal too: the
 *  links already removed stay removed, as links, and every file and folder
 *  stays for a person to look at. */
export async function removeWorktree(
  cwd: string, wtPath: string
): Promise<{ ok: boolean; error?: string; refused?: boolean }> {
  // Git's own check used to run before anything was touched; the walk below now
  // runs first, so the same questions are asked here. A folder that is gone is
  // left to git, as before.
  let present = true;
  try {
    // The walk would follow a link AT the root and unlink the links in its target.
    if ((await fsp.lstat(wtPath)).isSymbolicLink()) {
      return { ok: false, refused: true, error: 'refused: the worktree folder is itself a link; nothing was touched' };
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      return { ok: false, refused: true, error: `refused: the worktree folder cannot be read (${err instanceof Error ? err.message : String(err)}); nothing was touched` };
    }
    present = false;
  }
  if (present) {
    const linked = await isLinkedWorktreeOf(cwd, wtPath);
    if (typeof linked === 'object') return { ok: false, refused: true, error: `refused: git could not list the worktrees (${linked.error}); nothing was touched` };
    if (!linked) return { ok: false, refused: true, error: 'refused: not a linked worktree of this repository; nothing was touched' };
  }
  // The shared node_modules link goes first. Most callers already unlink it,
  // but not all (the "ended by a person" path in agentWorktree.ts), and on
  // Windows a junction left in place makes git report success while the
  // folder stays behind. A second unlink where the caller already did is a
  // no-op.
  const deps = await unlinkWorktreeDeps(cwd, wtPath);
  if (!deps.ok) return { ok: false, error: `dependency unlink failed: ${deps.error}` };
  // Every other link inside goes too, as a link. Git for Windows' `worktree
  // remove --force` deletes THROUGH a junction: a `node_modules` linked to any
  // folder but the base's (which the line above leaves alone) would be emptied.
  // One that cannot be removed as a link stops the removal before `--force`.
  const links = present ? await unlinkLinksUnder(wtPath) : { removed: 0, failed: [] };
  if (links.failed.length > 0) {
    const first = links.failed[0];
    const removed = links.removed + (deps.removed ? 1 : 0);
    return {
      ok: false,
      refused: true,
      error: `refused: ${links.failed.length} link(s) or folder(s) inside could not be removed as links or read, and --force could delete through them (${first.path}: ${first.error}); ${removed} link(s) were removed as links by this removal; no file or folder was deleted`
    };
  }
  const res = await runGit(cwd, ['worktree', 'remove', '--force', wtPath]);
  if (res.ok && !existsSync(wtPath)) return { ok: true };
  if (res.ok) return { ok: false, error: 'worktree directory still exists' };
  return { ok: false, error: res.error };
}

/** Does this worktree hold work that must NOT be auto-discarded? `keep` is true if
 *  the working tree is dirty (uncommitted/untracked changes) OR the branch has
 *  commits the base branch doesn't (un-integrated / would-be-PR commits). Ephemeral
 *  workers never push, so "commits ahead of base" is the local proxy for "un-pushed
 *  / open PR" work. Fails SAFE: any git query we can't run is treated as "there
 *  might be work" → keep, so an uncertain state never triggers an auto-remove. */
export async function worktreeHasUnintegratedWork(
  wtPath: string, baseBranch: string
): Promise<{ keep: boolean; detail: string; branch: string; dirty: boolean; dirtyKnown: boolean; ahead: number }> {
  const br = await getBranch(wtPath);
  const branch = 'current' in br && br.current ? br.current : '(detached)';
  // Uncommitted or untracked changes?
  const status = await runGit(wtPath, ['status', '--porcelain']);
  const dirty = status.ok ? status.stdout.trim().length > 0 : true; // unknown → assume dirty
  // Commits on HEAD not reachable from the base branch?
  let ahead = 0;
  let aheadKnown = true;
  const rl = isSafeRev(baseBranch) ? await runGit(wtPath, ['rev-list', '--count', `${baseBranch}..HEAD`]) : UNSAFE_BASE;
  if (rl.ok) {
    const n = parseInt(rl.stdout.trim(), 10);
    ahead = Number.isFinite(n) ? n : 0;
  } else {
    aheadKnown = false; // unknown → assume there is work
  }
  const keep = dirty || ahead > 0 || !aheadKnown;
  const detail = `dirty=${dirty}, commitsAheadOf(${baseBranch})=${aheadKnown ? ahead : 'unknown'}`;
  return { keep, detail, branch, dirty, dirtyKnown: status.ok, ahead };
}

/** Is this preserved worker worktree SAFE to garbage-collect — i.e. is its work
 *  fully integrated (or empty) with nothing uncommitted to lose? Used by the
 *  ephemeral-worker GC sweep, which must NEVER discard un-integrated work.
 *
 *  Returns `gc: true` ONLY when BOTH:
 *    (1) the working tree is clean (no uncommitted/untracked changes), AND
 *    (2) the worker's content is already in `baseBranch` — proven by EITHER
 *        commitsAheadOf(base) === 0 (HEAD reachable from base: fast-forward /
 *        plain merge, robust even after base advances) OR `git diff base HEAD`
 *        being empty (base's tree equals HEAD's tree: catches a SQUASH merge,
 *        which leaves the original commits unreachable so the ahead-count alone
 *        would never clear).
 *
 *  Fails SAFE in every other case: a dirty tree, un-integrated commits, OR any
 *  git query we can't run all yield `gc: false` (keep the worktree). This is the
 *  stronger sibling of `worktreeHasUnintegratedWork` — that gate decides whether
 *  to PRESERVE at teardown; this one decides whether a preserved worktree may now
 *  be reclaimed. */
export async function worktreeIsGcSafe(
  wtPath: string, baseBranch: string
): Promise<{ gc: boolean; detail: string }> {
  // (1) Clean tree?
  const status = await runGit(wtPath, ['status', '--porcelain']);
  if (!status.ok) return { gc: false, detail: 'status query failed' };
  if (status.stdout.trim().length > 0) return { gc: false, detail: 'working tree dirty' };
  // (2a) HEAD fully reachable from base (ahead == 0)?
  const rl = isSafeRev(baseBranch) ? await runGit(wtPath, ['rev-list', '--count', `${baseBranch}..HEAD`]) : UNSAFE_BASE;
  if (rl.ok) {
    const n = parseInt(rl.stdout.trim(), 10);
    if (Number.isFinite(n) && n === 0) return { gc: true, detail: `clean + 0 commits ahead of ${baseBranch}` };
  }
  // (2b) base tree identical to HEAD tree (squash-merge / equivalent content)?
  // `git diff --quiet <base> HEAD` → exit 0 (ok) means NO differences.
  const diff = isSafeRev(baseBranch) ? await runGit(wtPath, ['diff', '--quiet', baseBranch, 'HEAD']) : UNSAFE_BASE;
  if (diff.ok) return { gc: true, detail: `clean + tree identical to ${baseBranch} (integrated/squashed)` };
  // Either there are real un-integrated commits, or a query failed → keep.
  return { gc: false, detail: `clean but content not yet in ${baseBranch}` };
}

/** What a worktree holds, as COUNTS, for the worktree list (0.5.3, feature 24).
 *  The gates above answer yes or no for the app's own teardown; a person deciding
 *  whether to delete a folder needs to know how much and of which kind, because
 *  the two are not equally lost: uncommitted files go with the folder, commits
 *  stay on the branch.
 *
 *  `ownLinks` are top level names the app put there itself (the linked
 *  node_modules), which a `node_modules/` ignore rule does not match because the
 *  link is a file, not a directory. Listing must not unlink a running agent's
 *  dependencies to ask, so they are filtered instead.
 *
 *  `baseBranch` is the branch the worktree was cut from, when the app still
 *  remembers it. After a restart it does not, and guessing "whatever the project
 *  has checked out today" was measured wrong on a real floor: every row read 300
 *  commits unmerged because the project sat on a docs branch. With no base the
 *  count is COMMITS ON NO OTHER BRANCH, local or remote, which needs no guess and
 *  is the question a person deleting it is asking. The other refs are listed and
 *  passed by name because `--branches` dies on one broken ref name (a Finder
 *  duplicate, "name 2", was enough), where for-each-ref only warns.
 *
 *  `known` is false when either query failed, and an unknown is never a "nothing
 *  here". */
export async function worktreeWorkSummary(
  wtPath: string, baseBranch: string | null, ownLinks: readonly string[] = []
): Promise<{ known: boolean; uncommitted: number; unmerged: number; branch: string | null }> {
  const br = await getBranch(wtPath);
  const branch = 'current' in br && br.current ? br.current : null;
  const status = await runGit(wtPath, ['status', '--porcelain']);
  const own = new Set(ownLinks.flatMap(n => [`?? ${n}`, `?? ${n}/`]));
  const uncommitted = status.ok ? status.stdout.split('\n').filter(l => l.trim() && !own.has(l.trimEnd())).length : 0;
  let rl: Awaited<ReturnType<typeof runGit>>;
  if (baseBranch) {
    rl = isSafeRev(baseBranch) ? await runGit(wtPath, ['rev-list', '--count', `${baseBranch}..HEAD`]) : UNSAFE_BASE;
  } else {
    const refs = await runGit(wtPath, ['for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes']);
    if (!refs.ok) rl = refs;
    else {
      const others = refs.stdout.split('\n').map(r => r.trim())
        .filter(r => r && !/\s/.test(r) && r !== `refs/heads/${branch}`).map(r => `^${r}`);
      rl = await runGit(wtPath, ['rev-list', '--count', 'HEAD', ...others, '--']);
    }
  }
  const n = rl.ok ? parseInt(rl.stdout.trim(), 10) : NaN;
  return { known: status.ok && Number.isFinite(n), uncommitted, unmerged: Number.isFinite(n) ? n : 0, branch };
}

// ─── 0.5.6: a temp's worktree goes by default at teardown ────────────────────

/** `git add -A` and the commit may walk a large tree; the 8 s default is for
 *  queries. */
const TEARDOWN_GIT_MS = 60_000;

/** Commit everything left in a worktree to the branch it is on (a temp's
 *  teardown): changed and untracked files, never ignored ones. No repo hook
 *  runs (`--no-verify` skips two of them, the empty hooks path the rest) and no
 *  signing key is asked for: nobody is there to answer either. The commit
 *  names an author itself only when the repo has none set, so a person's own
 *  identity is used when there is one. `committed` is false when there was
 *  nothing to commit.
 *
 *  It fails, so the caller keeps the folder, when the tree is not clean
 *  afterwards or when the commit recorded a nested repository: git stores that
 *  as a pointer, and the files behind it exist in the folder alone. */
export async function commitAllInWorktree(
  wtPath: string, message: string
): Promise<{ ok: true; committed: boolean } | { ok: false; error: string }> {
  const before = await runGit(wtPath, ['status', '--porcelain']);
  if (!before.ok) return { ok: false, error: before.error };
  if (!before.stdout.trim()) return { ok: true, committed: false };
  const add = await runGit(wtPath, ['add', '-A'], TEARDOWN_GIT_MS);
  if (!add.ok) return { ok: false, error: add.error };
  const ident = await runGit(wtPath, ['var', 'GIT_COMMITTER_IDENT']);
  const who = ident.ok ? [] : ['-c', 'user.name=Munder Difflin', '-c', 'user.email=temp@munderdifflin.invalid'];
  const commit = await runGit(wtPath, [
    '-c', `core.hooksPath=${devNull}`, '-c', 'commit.gpgsign=false', ...who,
    'commit', '--no-verify', '-m', message
  ], TEARDOWN_GIT_MS);
  if (!commit.ok) return { ok: false, error: commit.error };
  const nested = await runGit(wtPath, ['diff-tree', '--no-commit-id', '-r', 'HEAD']);
  if (!nested.ok) return { ok: false, error: nested.error };
  if (/^:\d{6} 160000 /m.test(nested.stdout)) return { ok: false, error: 'a nested repository is in the commit; its files are in the folder alone' };
  const after = await runGit(wtPath, ['status', '--porcelain']);
  if (!after.ok) return { ok: false, error: after.error };
  if (after.stdout.trim()) return { ok: false, error: 'files are still uncommitted after the commit' };
  return { ok: true, committed: true };
}

/** After a temp's folder is gone: how many commits its branch holds that its
 *  base lacks, and the branch deleted when that is none. Only the branch the
 *  app made for that worktree (`agent/<id>`) is ever deleted, never the base and
 *  never a branch the temp or a person named. `ahead` is null when git could
 *  not say, and a branch nobody could count is kept. */
export async function deleteBranchIfNothingAhead(
  cwd: string, wtPath: string, branch: string, baseBranch: string
): Promise<{ ahead: number | null; deleted: boolean; error?: string }> {
  if (!isSafeRev(branch) || !isSafeRev(baseBranch)) return { ahead: null, deleted: false, error: 'unsafe branch name' };
  const rl = await runGit(cwd, ['rev-list', '--count', `${baseBranch}..${branch}`, '--']);
  const n = rl.ok ? parseInt(rl.stdout.trim(), 10) : NaN;
  if (!Number.isFinite(n)) return { ahead: null, deleted: false, error: rl.ok ? 'no count' : rl.error };
  if (n > 0) return { ahead: n, deleted: false };
  if (branch === baseBranch || branch !== agentBranchFor(wtPath)) return { ahead: 0, deleted: false };
  const del = await runGit(cwd, ['branch', '-D', branch]);
  return del.ok ? { ahead: 0, deleted: true } : { ahead: 0, deleted: false, error: del.error };
}

/** Take back a worktree made moments ago for a start that is now
 *  held: the folder through removeWorktree, then the branch the app made for
 *  it when it holds nothing (never a branch that was there before). */
export async function discardNewWorktree(origCwd: string, wtPath: string, baseBranch: string): Promise<{ ok: boolean; error?: string }> {
  const br = await getBranch(wtPath);
  const branch = 'current' in br && br.current ? br.current : null;
  const gone = await removeWorktree(origCwd, wtPath);
  if (!gone.ok) return { ok: false, error: gone.error };
  if (branch) await deleteBranchIfNothingAhead(origCwd, wtPath, branch, baseBranch);
  return { ok: true };
}

/** The nested repositories a worktree's folder holds: every path git records
 *  as a pointer to another repository (mode 160000) whose folder is not empty.
 *  The WHOLE index is read, so a pointer the temp committed itself, in any
 *  commit, counts as much as one in the commit the app just made. A project's
 *  own submodule that was never filled in this worktree is an empty folder and
 *  is not counted: nothing behind that pointer is here to lose. */
async function nestedRepositoriesIn(
  wtPath: string
): Promise<{ ok: true; paths: string[] } | { ok: false; error: string }> {
  const ls = await runGit(wtPath, ['ls-files', '-s', '-z'], TEARDOWN_GIT_MS);
  if (!ls.ok) return { ok: false, error: ls.error };
  const paths = ls.stdout.split('\0')
    .filter(e => e.startsWith('160000 ')).map(e => e.slice(e.indexOf('\t') + 1))
    .filter(p => { try { return readdirSync(join(wtPath, p)).length > 0; } catch { return false; } });
  return { ok: true, paths };
}

/** What became of a temp's worktree at teardown. `branch` is the one to report:
 *  the branch the temp ended on, or the one the app made for it (`agent/<id>`)
 *  when it ended anywhere else and left nothing there. `made` is that second
 *  branch when both hold commits, so it is never passed over. */
export type TempWorktreeFate =
  | { removed: true; committed: boolean; branch: string | null; ahead: number | null; branchDeleted: boolean; made?: { branch: string; ahead: number | null } }
  | { removed: false; why: string; refused?: boolean };

/** A temp's teardown (founder, 10 Oct 2026: "worktree destruction must happen
 *  by default"). `work` is what `worktreeHasUnintegratedWork` just said.
 *
 *   1. Uncommitted or untracked files are committed to the temp's branch.
 *   2. The folder is removed.
 *   3. A branch with commits its base lacks is kept; one with none is deleted.
 *   4. The folder stays only when step 1 or 2 fails, and `why` says which.
 *
 *  Step 1 needs the branch the app made for the temp (`agent/<id>`). A worktree
 *  left on its base branch, on no branch, or on any other branch is not
 *  committed to: the first and the last would write a branch a person or the
 *  temp named, the second would leave the commit on nothing once the folder
 *  goes. Files git ignores are lost with the folder.
 *
 *  A nested repository anywhere in the tree keeps the folder too, clean tree
 *  or not: git removes it without a word, and a branch holds only its pointer. */
export async function finalizeTempWorktree(
  origCwd: string, wtPath: string, baseBranch: string, workerId: string,
  work: { dirty: boolean; keep: boolean; branch: string }
): Promise<TempWorktreeFate> {
  const detached = work.branch === '(detached)';
  const ownBranch = !detached && work.branch !== baseBranch;
  const appBranch = agentBranchFor(wtPath);
  let committed = false;
  if (work.dirty) {
    if (!ownBranch || work.branch !== appBranch) return { removed: false, why: 'it holds uncommitted files and is on no branch of its own to commit them to' };
    const left = await commitAllInWorktree(wtPath, `temp ${workerId}: work left at teardown`);
    if (!left.ok) return { removed: false, why: `the commit of what it left failed: ${left.error}` };
    committed = left.committed;
  } else if (detached && work.keep) {
    return { removed: false, why: 'its commits are on no branch' };
  }
  const nested = await nestedRepositoriesIn(wtPath);
  if (!nested.ok) return { removed: false, why: `its tree could not be read for a nested repository: ${nested.error}` };
  if (nested.paths.length > 0) return { removed: false, why: `a nested repository is in its tree at ${nested.paths[0]}; its files are in the folder alone` };
  const gone = await removeWorktree(origCwd, wtPath);
  if (!gone.ok) return { removed: false, why: `the folder could not be removed: ${gone.error}`, ...(gone.refused ? { refused: true } : {}) };
  // A temp that ended anywhere but on the branch the app made for it may have
  // left its commits there. That branch is counted too, by the same rule: it
  // goes when it holds none, and is reported when it holds any.
  let made: { branch: string; ahead: number | null } | null = null;
  if (work.branch !== appBranch && appBranch !== baseBranch
    && (await runGit(origCwd, ['rev-parse', '--verify', '--quiet', `refs/heads/${appBranch}`])).ok) {
    const m = await deleteBranchIfNothingAhead(origCwd, wtPath, appBranch, baseBranch);
    if (!m.deleted && m.ahead !== 0) made = { branch: appBranch, ahead: m.ahead };
  }
  if (!ownBranch) return { removed: true, committed, branch: made?.branch ?? null, ahead: made?.ahead ?? null, branchDeleted: false };
  const kept = await deleteBranchIfNothingAhead(origCwd, wtPath, work.branch, baseBranch);
  if (made && kept.ahead === 0) return { removed: true, committed, branch: made.branch, ahead: made.ahead, branchDeleted: false };
  return { removed: true, committed, branch: work.branch, ahead: kept.ahead, branchDeleted: kept.deleted, ...(made ? { made } : {}) };
}

// ─── v0.3.4: history / compare / checkout plumbing (git visualization) ───────

/** Renderer-supplied revs/refs are untrusted strings. Allow the conservative
 *  charset git refs actually use, refuse leading '-' (option injection), and
 *  always pass '--' before any path arguments at call sites. */
export function isSafeRev(rev: string): boolean {
  return rev.length > 0 && rev.length <= 256 && !rev.startsWith('-') && /^[0-9A-Za-z._/^~@{}-]+$/.test(rev);
}

/** Full-history DAG page for the commit graph. Same record shape as getLog but
 *  topologically ordered (the graph layout assumes it) and pageable. Run this
 *  against mainRepoRoot(cwd) so every agent worktree branch appears. */
export async function getLogGraph(cwd: string, n: number, skip = 0): Promise<GitCommit[] | { error: string }> {
  const sep = '\x1e';
  const fsep = '\x1f';
  const fmt = ['%H', '%P', '%s', '%an', '%at', '%D'].join(fsep) + sep;
  const res = await runGit(cwd, [
    'log', '--all', '--topo-order', `--max-count=${n}`, ...(skip > 0 ? [`--skip=${skip}`] : []),
    `--pretty=format:${fmt}`
  ], 15000);
  if (!res.ok) return { error: res.error };
  const out: GitCommit[] = [];
  for (const rec of res.stdout.split(sep)) {
    if (!rec.trim()) continue;
    const [sha, parents, subject, author, atime, refs] = rec.split(fsep);
    if (!sha) continue;
    out.push({
      sha: sha.trim(),
      shortSha: sha.trim().slice(0, 7),
      parents: (parents ?? '').split(' ').filter(Boolean),
      subject: subject ?? '',
      author: author ?? '',
      time: parseInt(atime, 10) || 0,
      refs: (refs ?? '').split(', ').map(s => s.trim()).filter(Boolean)
    });
  }
  return out;
}

export interface GitCommitFile {
  path: string;
  status: string;      // A/M/D/R/C/T…
  oldPath?: string;    // for renames/copies
}

/** Parse `-z --name-status` output shared by diff-tree and diff. Records are
 *  STATUS\0path\0 — with renames/copies STATUS<score>\0old\0new\0. */
function parseNameStatusZ(stdout: string): GitCommitFile[] {
  const tokens = stdout.split('\0').filter((t) => t.length > 0);
  const files: GitCommitFile[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const status = tokens[i];
    if (!/^[A-Z]/.test(status)) continue; // skip stray commit ids
    const kind = status[0];
    if (kind === 'R' || kind === 'C') {
      const oldPath = tokens[i + 1];
      const path = tokens[i + 2];
      i += 2;
      if (path) files.push({ path, status: kind, oldPath });
    } else {
      const path = tokens[i + 1];
      i += 1;
      if (path) files.push({ path, status: kind });
    }
  }
  return files;
}

/** Files touched by one commit (rename-aware). */
export async function getCommitFiles(cwd: string, sha: string): Promise<GitCommitFile[] | { error: string }> {
  if (!isSafeRev(sha)) return { error: 'invalid revision' };
  const res = await runGit(cwd, ['diff-tree', '--no-commit-id', '-r', '--root', '-z', '-M', '--name-status', sha, '--']);
  if (!res.ok) return { error: res.error };
  return parseNameStatusZ(res.stdout);
}

const MAX_SHOW_BYTES = 2 * 1024 * 1024; // match getDiff's cap

/** One side of a rev-pinned diff: the file's content at `rev` ('' + exists:false
 *  when the path doesn't exist there — e.g. an added file's parent side). */
export async function getFileAtRev(cwd: string, rev: string, relPath: string): Promise<
  { ok: true; exists: boolean; isBinary: boolean; content: string } | { ok: false; error: string }
> {
  if (!isSafeRev(rev)) return { ok: false, error: 'invalid revision' };
  if (!(await safeResolve(cwd, relPath))) return { ok: false, error: 'path escapes repository root' };
  // "." and ".." are taken out once, here. Git reads `rev:path` letter for
  // letter: `sub/../s` named nothing, so a file that is there read as "not
  // there", and git's listing answered its own error for such a name.
  const parts: string[] = [];
  for (const part of relPath.split('/')) {
    if (!part || part === '.') continue;
    // A ".." that would leave the repository never gets here: safeResolve above refused it.
    if (part === '..') { parts.pop(); continue; }
    parts.push(part);
  }
  relPath = parts.join('/');
  // WHEN GIT COULD NOT READ THE FILE. "It did not exist at that revision" is
  // answered only when that is known. Not when the call was stopped (a time
  // limit is said as one), and not in a partial clone when the file, or a
  // folder on the way to it, is not downloaded: the app's git fetches
  // nothing, so there it cannot tell, and says so.
  type Read = { ok: true; exists: boolean; isBinary: boolean; content: string } | { ok: false; error: string };
  const NOT_THERE: Read = { ok: true, exists: false, isBinary: false, content: '' };
  const gone = async (failed: string): Promise<Read> => {
    if (wasStopped(failed)) return { ok: false, error: failed };
    if (!(await isPartialCloneAt(cwd))) return NOT_THERE;
    // A revision nobody has is not a folder that was not downloaded: it is
    // answered as an ordinary repository answers it.
    const known = await runGit(cwd, ['rev-parse', '--verify', '--quiet', rev]);
    if (!known.ok) return wasStopped(known.error) ? { ok: false, error: known.error } : NOT_THERE;
    // Down the path, folder by folder: is the folder's own listing here, and
    // what does it say the next part is? The listing names a file or a folder
    // without the thing itself being read, so a path that runs THROUGH a file
    // is "not there", and a path that ENDS on a folder is said to be a folder.
    // No part to walk: the top of a revision, which is always a folder.
    if (parts.length === 0) return { ok: false, error: NOT_DOWNLOADED_IS_FOLDER };
    let folder = `${rev}^{tree}`;
    for (let i = 0; i < parts.length; i++) {
      const here = await runGit(cwd, ['cat-file', '-e', folder]);
      if (!here.ok) return wasStopped(here.error) ? { ok: false, error: here.error } : { ok: false, error: NOT_DOWNLOADED_FOLDER };
      // The name letter for letter: a name that starts with ":" is otherwise
      // read as pathspec magic. From the top: `rev:path` is, whatever cwd is.
      const listing = await runGit(cwd, ['ls-tree', '-z', '--full-tree', folder, '--', `:(literal)${parts[i]}`]);
      if (!listing.ok) return { ok: false, error: listing.error };
      // One row: "<mode> <type> <id>\t<name>".
      const row = listing.stdout.split('\0').find((r) => r.slice(r.indexOf('\t') + 1) === parts[i]);
      if (!row) return NOT_THERE;
      const kind = row.split(/[ \t]/)[1];
      const last = i === parts.length - 1;
      if (kind === 'tree') {
        if (last) return { ok: false, error: NOT_DOWNLOADED_IS_FOLDER };
        folder = `${rev}:${parts.slice(0, i + 1).join('/')}`;
        continue;
      }
      // A file, or another repository's commit (a submodule): nothing is under it.
      return last && kind === 'blob' ? { ok: false, error: NOT_DOWNLOADED_FILE } : NOT_THERE;
    }
    return { ok: false, error: NOT_DOWNLOADED_FILE };
  };
  const size = await runGit(cwd, ['cat-file', '-s', `${rev}:${relPath}`]);
  if (!size.ok) return gone(size.error);
  if ((parseInt(size.stdout.trim(), 10) || 0) > MAX_SHOW_BYTES) {
    return { ok: false, error: 'file too large to diff (>2 MB)' };
  }
  const res = await runGit(cwd, ['show', `${rev}:${relPath}`]);
  if (!res.ok) return gone(res.error);
  // A FOLDER is not a file: `git show` of one prints its listing, which was
  // answered as the file's content. Asked only when the output looks like one.
  if (res.stdout.startsWith('tree ')) {
    const kind = await runGit(cwd, ['cat-file', '-t', `${rev}:${relPath}`]);
    if (kind.ok && kind.stdout.trim() === 'tree') return { ok: false, error: IS_A_FOLDER };
  }
  if (res.stdout.includes('\0')) return { ok: true, exists: true, isBinary: true, content: '' };
  return { ok: true, exists: true, isBinary: false, content: res.stdout };
}

export interface GitCompare {
  ahead: number;        // commits in head, not base
  behind: number;       // commits in base, not head
  mergeBase: string | null;
  files: GitCommitFile[];
}

/** Compare two refs. mode 'three' (default, PR-style): what head adds since the
 *  merge base. mode 'two': the literal state difference base→head. */
export async function compareRefs(cwd: string, base: string, head: string, mode: 'two' | 'three'): Promise<GitCompare | { error: string }> {
  if (!isSafeRev(base) || !isSafeRev(head)) return { error: 'invalid revision' };
  const counts = await runGit(cwd, ['rev-list', '--left-right', '--count', `${base}...${head}`]);
  if (!counts.ok) return { error: counts.error };
  const [behind, ahead] = counts.stdout.trim().split('\t').map((x) => parseInt(x, 10) || 0);
  const mb = await runGit(cwd, ['merge-base', base, head]);
  const mergeBase = mb.ok ? mb.stdout.trim() : null;
  const diffArgs = mode === 'three'
    ? ['diff', '-z', '-M', '--name-status', `${base}...${head}`, '--']
    : ['diff', '-z', '-M', '--name-status', base, head, '--'];
  const res = await runGit(cwd, diffArgs, 15000);
  if (!res.ok) return { error: res.error };
  return { ahead, behind, mergeBase, files: parseNameStatusZ(res.stdout) };
}

export interface GitWorktreeInfo { path: string; head: string; branch: string | null }

export async function listWorktrees(cwd: string): Promise<GitWorktreeInfo[] | { error: string }> {
  const res = await runGit(cwd, ['worktree', 'list', '--porcelain']);
  if (!res.ok) return { error: res.error };
  const out: GitWorktreeInfo[] = [];
  let cur: Partial<GitWorktreeInfo> = {};
  for (const line of res.stdout.split('\n')) {
    if (line.startsWith('worktree ')) { if (cur.path) out.push(cur as GitWorktreeInfo); cur = { path: line.slice(9), head: '', branch: null }; }
    else if (line.startsWith('HEAD ')) cur.head = line.slice(5);
    else if (line.startsWith('branch ')) cur.branch = line.slice(7).replace(/^refs\/heads\//, '');
  }
  if (cur.path) out.push(cur as GitWorktreeInfo);
  return out;
}

/** Guarded checkout (v0.3.4). FAIL-SAFE philosophy like worktreeHasUnintegratedWork:
 *  any doubt → refuse. Guards here cover the repo itself; the IPC layer adds the
 *  "no agent actively working in this tree" guard (it owns the pty registry). */
export async function checkoutRef(cwd: string, ref: string, detach: boolean): Promise<{ ok: true; detached: boolean; settingsNotCarried?: true } | { ok: false; error: string }> {
  if (!isSafeRev(ref)) return { ok: false, error: 'invalid revision' };
  const st = await getStatus(cwd);
  if ('error' in st) return { ok: false, error: `could not verify a clean tree: ${st.error}` };
  const dirty = st.staged.length + st.unstaged.length;
  if (dirty > 0) {
    // Every change is a file of this branch that is not in the folder: one
    // an earlier switch could not write, or one deleted by hand (the app
    // cannot tell which). "Commit or stash" would record it as deleted.
    const missing = st.unstaged.filter((e) => e.worktree === 'D');
    if (st.staged.length === 0 && missing.length === st.unstaged.length) {
      return {
        ok: false,
        error: missing.length === 1
          ? `not switched: 1 file of this branch is missing from the folder, for example ${missing[0].path}. If you did not delete it, do not commit: a commit would record it as deleted on this branch. Bring it back with git in a terminal, then switch`
          : `not switched: ${missing.length} files of this branch are missing from the folder, for example ${missing[0].path}. If you did not delete them, do not commit: a commit would record them as deleted on this branch. Bring them back with git in a terminal, then switch`
      };
    }
    return { ok: false, error: `working tree has ${dirty} uncommitted change${dirty === 1 ? '' : 's'} — commit or stash first` };
  }
  const res = await runGit(cwd, detach ? ['switch', '--detach', ref] : ['switch', ref], 15000);
  if (!res.ok) {
    // A branch held by another worktree: name the holder instead of raw stderr.
    if (/already checked out|already used by worktree/i.test(res.error)) {
      const wts = await listWorktrees(cwd);
      const holder = Array.isArray(wts) ? wts.find((w) => w.branch === ref.replace(/^refs\/heads\//, '')) : undefined;
      return { ok: false, error: holder ? `'${ref}' is checked out in another worktree: ${holder.path}` : res.error };
    }
    return { ok: false, error: res.error };
  }
  // Git's "ok" is not taken on trust. The tree was clean before the switch,
  // so a tracked file that is missing from the work tree now is one the
  // switch could not write (its content is not in this repository). HEAD has
  // moved; the answer says so and does not read as a switch that worked.
  const after = await getStatus(cwd);
  if ('error' in after) return { ok: false, error: `switched to '${ref}', but the app could not check that its files were written. You are on '${ref}' now. Look at the folder in a terminal before you go on. Git said: ${after.error}` };
  const leftOut = after.unstaged.filter((e) => e.worktree === 'D');
  if (leftOut.length > 0) {
    const one = leftOut.length === 1;
    return { ok: false, error: `switched to '${ref}', but ${one ? '1 file' : `${leftOut.length} files`} of that branch ${one ? 'was' : 'were'} not written, for example ${leftOut[0].path}. ${one ? 'Its' : 'Their'} content is not in this repository. You are on '${ref}' now. To get the ${one ? 'file' : 'files'}, fetch the missing content with git in a terminal` };
  }
  // The switch stands. A new local branch whose upstream was not recorded is said, not hidden.
  return { ok: true, detached: detach, ...(res.settingsNotCarried ? { settingsNotCarried: true as const } : {}) };
}

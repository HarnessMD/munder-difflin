/**
 * The worktree list with real git and a real disk (0.5.3, feature 24). The rule
 * is shared/worktreeList.ts; this finds the folders, asks git what each holds,
 * and removes one when the rule allows it.
 *
 * Its own file, with no Electron import, so test/v053-worktree-screen.test.cjs
 * runs it against a real repository. Same reason as main/agentWorktree.ts: a
 * rule about deleting somebody's work should have run before it ships.
 *
 * WHAT IS LISTED: the folders directly under a worktrees root the app created
 * (`<harnessHome>/worktrees`, or `<project>/worktrees` on an install with no
 * home). Not every `git worktree` of every project: one a person made by hand is
 * theirs, and this screen must not be able to delete it.
 */
import { execFile } from 'node:child_process';
import { lstat, readdir, readFile, realpath, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { listWorktrees, removeWorktree, worktreeWorkSummary } from './git';
import { linkWorktreeDeps, unlinkWorktreeDeps } from './worktreeDeps';
import {
  isSameOrInside, worktreeDeleteVerdict,
  type WorktreeDeleteRefusal, type WorktreeRow, type WorktreeWork
} from '../shared/worktreeList';

/** What the running app knows and the disk does not. */
export interface WorktreeAdminContext {
  /** Worktrees roots to look under. Missing ones are skipped. */
  roots: readonly string[];
  /** The cwd of every running terminal. */
  liveCwds: readonly string[];
  /** The base branch recorded for a folder, when the app still remembers it. */
  baseFor?: (wtPath: string) => string | undefined;
}

/** The names the app links into a worktree itself (main/worktreeDeps.ts). */
const OWN_LINKS = ['node_modules'] as const;

async function real(p: string): Promise<string> {
  try { return await realpath(p); } catch { return p; }
}

async function isLive(wtPath: string, liveCwds: readonly string[]): Promise<boolean> {
  const wt = await real(wtPath);
  for (const c of liveCwds) if (isSameOrInside(wt, await real(c), sep)) return true;
  return false;
}

/** Is this folder registered with git as a worktree of `projectRoot`? Asked of
 *  git itself, and only at delete time. */
async function isRegistered(projectRoot: string, wtPath: string): Promise<boolean> {
  const list = await listWorktrees(projectRoot);
  if (!Array.isArray(list)) return false;
  const wt = await real(wtPath);
  for (const w of list) if (await real(w.path) === wt) return true;
  return false;
}

/**
 * The project and branch of a linked worktree, READ FROM THE DISK. A linked
 * worktree's `.git` is a file, `gitdir: <project>/.git/worktrees/<name>`, and
 * that folder's HEAD names the branch. No git process, so a list of fifty folders
 * costs fifty small reads. A plain folder, or a full clone someone dropped here,
 * has no such file: it is listed, and never offered for deletion.
 */
async function readLink(wtPath: string): Promise<{ projectRoot: string | null; branch: string | null }> {
  try {
    if (!(await lstat(join(wtPath, '.git'))).isFile()) return { projectRoot: null, branch: null };
    const m = /^gitdir:\s*(.+?)\s*$/m.exec(await readFile(join(wtPath, '.git'), 'utf8'));
    if (!m) return { projectRoot: null, branch: null };
    const adminDir = resolve(wtPath, m[1]);
    const cut = adminDir.replace(/\\/g, '/').lastIndexOf('/.git/worktrees/');
    if (cut < 0) return { projectRoot: null, branch: null };
    let branch: string | null = null;
    try { branch = /^ref:\s*refs\/heads\/(.+?)\s*$/m.exec(await readFile(join(adminDir, 'HEAD'), 'utf8'))?.[1] ?? null; } catch { /* registration pruned */ }
    return { projectRoot: adminDir.slice(0, cut), branch };
  } catch { return { projectRoot: null, branch: null }; }
}

async function describe(wtPath: string, ctx: WorktreeAdminContext): Promise<WorktreeRow> {
  let createdAt = 0;
  try { const s = await stat(wtPath); createdAt = s.birthtimeMs || s.mtimeMs || 0; } catch { /* unknown age */ }
  return { path: wtPath, name: basename(wtPath), createdAt, live: await isLive(wtPath, ctx.liveCwds), ...(await readLink(wtPath)) };
}

/**
 * What one listed folder holds. Measured against the recorded base when the app
 * still has it, and against every other branch when it does not (git.ts
 * worktreeWorkSummary says why). Null for a folder that is not in the list or
 * not a worktree.
 */
export async function worktreeWork(wtPath: string, ctx: WorktreeAdminContext): Promise<WorktreeWork | null> {
  if (!(await underRoot(wtPath, ctx.roots))) return null;
  const { projectRoot } = await readLink(wtPath);
  if (!projectRoot) return null;
  return workOf(wtPath, ctx);
}

async function workOf(wtPath: string, ctx: WorktreeAdminContext): Promise<WorktreeWork> {
  const base = ctx.baseFor?.(wtPath) ?? null;
  const w = await worktreeWorkSummary(wtPath, base, OWN_LINKS);
  return { base, known: w.known, uncommitted: w.uncommitted, unmerged: w.unmerged };
}

async function foldersUnder(roots: readonly string[]): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const root of roots) {
    let names: string[];
    try { names = await readdir(root); } catch { continue; }
    for (const name of names) {
      if (name.startsWith('.')) continue; // tool folders, never a worktree
      const p = join(root, name);
      try { if (!(await lstat(p)).isDirectory()) continue; } catch { continue; }
      const key = await real(p);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

/** Every folder under the roots, with no git and no sizes. What each holds
 *  (worktreeWork) and how big it is (worktreeSize) are asked one row at a time,
 *  so neither a slow disk nor a large project holds up the list. */
export async function listOwnedWorktrees(ctx: WorktreeAdminContext): Promise<WorktreeRow[]> {
  const rows: WorktreeRow[] = [];
  for (const p of await foldersUnder(ctx.roots)) rows.push(await describe(p, ctx));
  return rows;
}

/** Is `wtPath` a folder DIRECTLY under one of the roots? Resolved on both sides,
 *  so a symlink or a `..` cannot point the delete somewhere else. */
async function underRoot(wtPath: string, roots: readonly string[]): Promise<boolean> {
  const wt = await real(wtPath);
  for (const root of roots) if (await real(root) === dirname(wt)) return true;
  return false;
}

export type WorktreeRemoveResult =
  | { ok: true }
  | { ok: false; code: WorktreeDeleteRefusal; work?: WorktreeWork }
  | { ok: false; code: 'git-failed'; error: string };

/**
 * Remove one folder. Everything is asked again here, at the moment of removal:
 * the list the person was looking at may be minutes old, and an agent may have
 * been restarted into the folder since. `confirmed` is the person having seen
 * the warning for a folder that holds work; it answers nothing else.
 */
export async function removeOwnedWorktree(
  wtPath: string, confirmed: boolean, ctx: WorktreeAdminContext
): Promise<WorktreeRemoveResult> {
  if (!(await underRoot(wtPath, ctx.roots))) return { ok: false, code: 'outside' };
  const row = await describe(wtPath, ctx);
  const origin = row.projectRoot;
  const isWorktree = !!origin && await real(origin) !== await real(wtPath) && await isRegistered(origin, wtPath);
  const unknown: WorktreeWork = { base: null, known: false, uncommitted: 0, unmerged: 0 };
  // Not asked for a running agent's folder: the answer could not change the refusal.
  const work = origin && isWorktree && !row.live ? await workOf(wtPath, ctx) : unknown;
  const verdict = worktreeDeleteVerdict({ underRoot: true, live: row.live, isWorktree, work }, confirmed);
  if (!verdict.ok) return { ok: false, code: verdict.code, ...(verdict.code === 'needs-confirm' ? { work } : {}) };
  if (!origin) return { ok: false, code: 'not-a-worktree' };
  const unlinked = await unlinkWorktreeDeps(origin, wtPath);
  const r = await removeWorktree(origin, wtPath);
  if (r.ok) return { ok: true };
  // Put the dependencies back: the folder is still there and may be restarted into.
  if (unlinked.ok && unlinked.removed) await linkWorktreeDeps(origin, wtPath);
  return { ok: false, code: 'git-failed', error: r.error ?? 'unknown' };
}

/**
 * Bytes on disk under one listed folder. `du` where there is one: measured on a
 * real 1.1 GB worktree it answered in under a second, where walking the tree
 * from Node took 25. The walk is the fallback (Windows, or a `du` that failed)
 * and yields as it goes, so the main process keeps answering. Neither follows
 * links: the linked node_modules belongs to the project, not to this folder,
 * and removing the folder does not free it.
 */
export async function worktreeSize(wtPath: string, roots: readonly string[]): Promise<number | null> {
  if (!(await underRoot(wtPath, roots))) return null;
  if (process.platform !== 'win32') {
    const kb = await new Promise<number | null>((done) => {
      execFile('du', ['-sk', wtPath], { timeout: 120_000 }, (err, stdout) => {
        const n = parseInt(String(stdout).trim().split(/\s+/)[0] ?? '', 10);
        // du exits 1 when one file could not be read and still prints a total.
        done(Number.isFinite(n) && (!err || n > 0) ? n : null);
      });
    });
    if (kb !== null) return kb * 1024;
  }
  return walkSize(wtPath);
}

async function walkSize(root: string): Promise<number> {
  let total = 0;
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > 64) return;
    let names: string[];
    try { names = await readdir(dir); } catch { return; }
    for (const name of names) {
      const child = join(dir, name);
      let s;
      try { s = await lstat(child); } catch { continue; }
      if (s.isDirectory()) await walk(child, depth + 1);
      else total += s.size;
    }
  };
  await walk(root, 0);
  return total;
}

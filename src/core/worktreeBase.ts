/**
 * A WORKTREE'S BASE, WRITTEN DOWN (task force 0.5.8 round 2, item 5).
 *
 * The Projects view compares each agent's work with the branch its worktree
 * was cut from. Main kept that branch only in memory (`worktreeBases`), so
 * after a restart a compare had nothing to compare against. It is now kept in
 * the worktree's own private git folder, `<repo>/.git/worktrees/<name>/md-base`:
 *
 * - git never reads or shows a file there, so `git status` stays clean;
 * - `git worktree remove` and `prune` delete it with the worktree, so it never
 *   outlives the work it describes;
 * - it needs no git to read, so the instant worktree list can use it.
 *
 * Found through the worktree's `.git` FILE ("gitdir: <path>"). A main checkout
 * has a `.git` folder, never a file, and so never gets one.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

export const BASE_FILE = 'md-base';

/** A branch name as the base may be: letters, digits and `._/-`, no `..`,
 *  never read as an option. Anything else is not trusted as a base. */
export function isBaseName(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= 200 && /^[A-Za-z0-9._/-]+$/.test(v)
    && !v.startsWith('-') && !v.includes('..') && !v.endsWith('/') && !v.endsWith('.lock');
}

/** The worktree's private git folder, from its `.git` file; null for a
 *  folder that is not a linked worktree. */
export function worktreeGitDir(wtPath: string): string | null {
  try {
    const dotGit = join(wtPath, '.git');
    if (!statSync(dotGit).isFile()) return null;
    const m = /^gitdir:\s*(.+?)\s*$/m.exec(readFileSync(dotGit, 'utf8'));
    if (!m) return null;
    return isAbsolute(m[1]) ? m[1] : resolve(wtPath, m[1]);
  } catch { return null; }
}

/** Write the base down. False when there is nowhere to write it; never throws. */
export function recordWorktreeBase(wtPath: string, base: string): boolean {
  if (!isBaseName(base)) return false;
  const dir = worktreeGitDir(wtPath);
  if (!dir) return false;
  try { writeFileSync(join(dir, BASE_FILE), `${base}\n`, 'utf8'); return true; } catch { return false; }
}

/** The base written for this worktree, or null. */
export function readWorktreeBase(wtPath: string): string | null {
  const dir = worktreeGitDir(wtPath);
  if (!dir) return null;
  try {
    const v = readFileSync(join(dir, BASE_FILE), 'utf8').trim();
    return isBaseName(v) ? v : null;
  } catch { return null; }
}

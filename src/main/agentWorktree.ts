import { statSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { isRepo, mainRepoRoot } from './git';

export interface AgentWorktree {
  cwd: string;
  worktreePath?: string;
  worktreeOrigin?: string;
}

/** Resolve a persisted isolation recipe before provisioning or starting a CLI.
 *  Never recreate/prune a checkout here: its branch may contain unmerged work.
 *  Falling back to a known origin is safe; guessing one from a dead path isn't. */
export async function resolveAgentWorktree(
  requested: AgentWorktree, saved?: AgentWorktree
): Promise<({ ok: true; worktreeGone?: boolean } & AgentWorktree) | { ok: false; error: string }> {
  const same = (a?: string, b?: string) => !!a && !!b && resolve(a) === resolve(b);
  // Do not let an old registry entry override a deliberate move to another cwd.
  const applicable = saved && [saved.cwd, saved.worktreePath, saved.worktreeOrigin].some(p => same(p, requested.cwd));
  const wt = requested.worktreePath ?? (applicable ? saved.worktreePath : undefined);
  const origin = requested.worktreeOrigin ?? (applicable ? saved.worktreeOrigin : undefined);
  if (!wt) return { ok: true, cwd: requested.cwd };

  // rev-parse alone accepts a non-checkout directory inside a parent repo. The
  // isolated path must still have its own .git entry, not just leftover .claude/.
  let linked = false;
  try { linked = statSync(join(wt, '.git')).isFile(); } catch { /* missing checkout */ }
  if (isAbsolute(wt) && linked && await isRepo(wt)) {
    const base = (origin && !same(origin, wt) ? origin : await mainRepoRoot(wt)) ?? undefined;
    return { ok: true, cwd: wt, worktreePath: wt, worktreeOrigin: base };
  }
  if (!origin || same(origin, wt)) {
    return { ok: false, error: `Worktree is unavailable and its origin was not saved: ${wt}. Select the original repository folder to restore this agent.` };
  }
  if (!isAbsolute(origin) || !await isRepo(origin)) {
    return { ok: false, error: `Worktree origin is unavailable: ${origin}. Select an existing repository folder to restore this agent.` };
  }
  return { ok: true, cwd: origin, worktreeGone: true };
}

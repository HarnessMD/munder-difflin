/**
 * What to do with a NORMAL agent's isolated worktree when its terminal ends.
 * The rule is shared/worktreeFate.ts; this applies it with real git.
 *
 * Its own file, with no Electron import, so test/crash-keeps-work.test.cjs can
 * run it against a real repository. index.ts is not loadable from a test, and a
 * rule about deleting somebody's work should not be one that has only been read.
 */
import { removeWorktree, worktreeHasUnintegratedWork } from './git';
import { linkWorktreeDeps, unlinkWorktreeDeps } from './worktreeDeps';
import { fateWithoutGit, normalAgentWorktreeFate, type TeardownReason } from '../shared/worktreeFate';

export interface AgentWorktreeOutcome {
  fate: 'removed' | 'kept' | 'remove-failed';
  detail: string;
  branch?: string;
}

export async function finalizeAgentWorktree(
  wtPath: string, origCwd: string, baseBranch: string, reason: TeardownReason
): Promise<AgentWorktreeOutcome> {
  const fixed = fateWithoutGit(reason);
  if (fixed === 'remove') {
    const r = await removeWorktree(origCwd, wtPath);
    return r.ok ? { fate: 'removed', detail: 'ended by a person' } : { fate: 'remove-failed', detail: r.error ?? 'unknown' };
  }
  // A restart or a revive is about to respawn the agent IN this folder. Touch
  // nothing: not the dependencies, not git. The agent may already be starting.
  if (fixed === 'keep') return { fate: 'kept', detail: `kept for the ${reason}` };
  // The linked node_modules is ours, not the agent's work. Take it out before
  // asking whether the tree is dirty, or every tree with dependencies is.
  const unlinked = await unlinkWorktreeDeps(origCwd, wtPath);
  const work = await worktreeHasUnintegratedWork(wtPath, baseBranch);
  // `known` used to be passed as a literal true, so the rule's "unknown means
  // keep" never fired and the code leaned on git.ts defaulting dirty to true.
  // Now git.ts says whether it could answer, and the rule decides.
  if (normalAgentWorktreeFate(reason, { dirty: work.dirty, known: work.dirtyKnown }) === 'keep') {
    // Put the dependencies back: the person's next move is to restart the agent
    // in this folder, and it should still run.
    if (unlinked.ok && unlinked.removed) await linkWorktreeDeps(origCwd, wtPath);
    return { fate: 'kept', detail: work.detail, branch: work.branch };
  }
  const r = await removeWorktree(origCwd, wtPath);
  return r.ok ? { fate: 'removed', detail: work.detail, branch: work.branch } : { fate: 'remove-failed', detail: r.error ?? 'unknown' };
}

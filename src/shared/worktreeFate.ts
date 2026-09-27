/**
 * What happens to a NORMAL agent's isolated worktree when its terminal ends.
 *
 * HISTORY, because the second half is a correction of the first. Until 0.5.3 a
 * normal agent's worktree was removed with `git worktree remove --force` on
 * every route, a crash included, which deleted whatever it had not committed.
 * The first fix (24688d52) added a reason with a DEFAULT of "a person ended
 * it", and its commit message said every caller but one was a person. Nobody
 * had opened the other callers. Creed's review did: the circuit breaker, the
 * automatic revive after sleep and both Restart buttons were all still force
 * removing a dirty worktree, and this floor's log showed the Restart one
 * happening (agent gem-mu103yx4, 14 Sep, three restarts into a folder the kill
 * had just removed).
 *
 * So there is NO DEFAULT any more. Every caller of teardownPty must say who
 * ended the agent, and the type makes leaving it out a compile error.
 *
 *   person     a person stopped or closed THIS agent. Removed, as before.
 *   restart    a person pressed Restart. They chose to restart, not to
 *              discard: the folder is what the agent comes back into. KEPT,
 *              always, without even asking git.
 *   revive     the app is bringing back an agent whose process died while the
 *              machine slept. Same: KEPT, always.
 *   exit       the process ended on its own (crash, killed from outside, quit).
 *   guardrail  the circuit breaker stopped it. Nobody was at the keyboard, and
 *              an agent that is looping is the likeliest of all to be mid edit.
 *   sweep      a bulk teardown aimed at the floor, not at this agent's work
 *              (switching the office theme).
 *              exit, guardrail and sweep: kept if the tree is DIRTY. Only
 *              dirty, not "has commits": commits are safe on the branch, and
 *              keeping every tree that ever committed would keep nearly all.
 *   worker     a temp. Never reaches this rule, temps have their own gate
 *              (finalizeWorkerWorktree). Answered "keep" so that if it ever
 *              did, it would fail safe.
 *
 * And when git could not say whether the tree is dirty: kept. An unknown is
 * not a no.
 */
export type TeardownReason = 'person' | 'restart' | 'revive' | 'exit' | 'guardrail' | 'sweep' | 'worker';
export type WorktreeFate = 'remove' | 'keep';

/** The reasons under which the folder is about to be used again. Main also
 *  keeps TRACKING the folder for these, so a later Stop still removes it. */
export const RESPAWNING: readonly TeardownReason[] = ['restart', 'revive'];

/** What a renderer may ask for through `pty:kill`. It can only ever make the
 *  teardown SAFER: anything it sends that is not on this list is a person. */
export function reasonFromRenderer(value: unknown): TeardownReason {
  return value === 'restart' || value === 'revive' || value === 'sweep' ? value : 'person';
}

/** Can the answer be known without asking git? */
export function fateWithoutGit(reason: TeardownReason): WorktreeFate | null {
  if (reason === 'person') return 'remove';
  if (reason === 'restart' || reason === 'revive' || reason === 'worker') return 'keep';
  return null;
}

export function normalAgentWorktreeFate(
  reason: TeardownReason,
  work: { dirty: boolean; known: boolean }
): WorktreeFate {
  const fixed = fateWithoutGit(reason);
  if (fixed) return fixed;
  if (!work.known) return 'keep';
  return work.dirty ? 'keep' : 'remove';
}

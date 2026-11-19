/**
 * Reopen an archived agent: put it back on the floor under its own id, in its
 * own folder, with its prior session resumed. The recipe is respawnAgent's
 * (the one "Restore team" uses); this is the part every Reopen button
 * shares, moved out of the list in CommandCenterPanel so no caller can drift
 * from it.
 *
 * No window, store or React here, so a plain node test can drive it.
 */
import type { Agent } from '../store/store';
import type { RespawnRecipe, RespawnResult } from './respawnAgent';

export type ReopenOutcome =
  | { outcome: 'respawned' }
  | { outcome: 'already-live' }
  | { outcome: 'failed'; error: string }
  /** Another reopen is still running; nothing was done. */
  | { outcome: 'busy' };

export interface ReopenDeps {
  recipe: (a: Agent) => Promise<RespawnRecipe>;
  respawn: (a: Agent, recipe: RespawnRecipe) => Promise<RespawnResult>;
  addAgent: (a: Agent) => void;
  /** The card's action line when its terminal never went away. */
  alreadyOpenText: string;
  now?: () => number;
}

// One reopen at a time for the whole window, whichever skin or list asked. A
// component's own state is read from its last draw, so two quick presses both
// saw "nothing running" and could spawn the same agent twice. This is set
// before the first await.
let inFlight: string | null = null;

/** The id being reopened right now, or null. */
export function reopenInFlight(): string | null {
  return inFlight;
}

export async function reopenArchivedAgent(a: Agent, deps: ReopenDeps): Promise<ReopenOutcome> {
  if (inFlight !== null) return { outcome: 'busy' };
  inFlight = a.id;
  try {
    const recipe = await deps.recipe(a);
    const provider = recipe.provider;
    const res = await deps.respawn(a, recipe);
    if (res.outcome === 'failed') return { outcome: 'failed', error: res.error };
    if (res.outcome === 'already-live') {
      // Its terminal never went away. Putting the card back makes the roster
      // and the live PTY agree again.
      deps.addAgent({ ...a, provider, ptyId: a.ptyId ?? `pty-${a.id}`, archived: false, status: 'idle', action: deps.alreadyOpenText });
      return { outcome: 'already-live' };
    }
    // addAgent un-archives by id (an id is active xor archived), so the row
    // leaves the archived list as the card returns to the floor.
    deps.addAgent({
      ...a,
      provider,
      ptyId: res.ptyId,
      archived: false,
      status: 'idle',
      action: res.worktreeGone ? 'worktree gone — using base repo' : res.resumeNotFound ? 'started fresh, last session not found' : 'starting up',
      worktreePath: res.worktreeGone ? undefined : a.worktreePath,
      seedPrompt: res.seedPrompt,
      carrying: undefined,
      currentStation: 'desk',
      recentTextTs: (deps.now ?? Date.now)()
    });
    return { outcome: 'respawned' };
  } catch (e) {
    return { outcome: 'failed', error: e instanceof Error ? e.message : String(e) };
  } finally {
    inFlight = null;
  }
}

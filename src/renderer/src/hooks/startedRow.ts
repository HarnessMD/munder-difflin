/**
 * A ROW MAIN STARTED (`hive:agentSpawned` for an agent already on the floor).
 * A start main makes (the orchestrator's, a voice one) is told to the window
 * as a whole card, and `addAgent` does nothing for an id that is listed. So
 * a row that is down (a move left it stopped, its process ended) kept no
 * terminal while its agent ran: Run in, the copy is left stopped, mail wakes
 * it, and the row never showed it. A reopen does not come here: archiving
 * takes the row out of `agents`, so it is added as new.
 *
 * Such a row takes the terminal main started and what main says it runs
 * (command, model, engine, folder); its card (name, look, goal, note) is
 * kept. An agent that had not run here (`neverStarted`) has started now, so
 * its grey goes. A row that is up is left alone: the card is
 * then the echo of a start this window made.
 *
 * Pure: useHive.ts applies the patch with the store's `updateAgent`.
 */
import type { Agent } from '@/store/store';

/** What main sends with `hive:agentSpawned` (shared/spawnedCard.ts), as read here. */
export interface StartedCard { id: string; ptyId?: string; cwd?: string; command?: string; model?: string; provider?: string; worktreePath?: string }

/** The row is down: no terminal, or the mark of a process that ended. */
export function rowIsDown(a: Pick<Agent, 'ptyId' | 'exit' | 'sleeping'>): boolean {
  return a.sleeping === true || !a.ptyId || !!a.exit;
}

/** The patch that makes a down row the started agent's, or null when the row is up. */
export function startedRowPatch(a: Agent, rec: StartedCard): Partial<Agent> | null {
  if (!rowIsDown(a)) return null;
  return {
    ptyId: rec.ptyId ?? rec.id,
    exit: undefined,
    sleeping: false,
    waking: false,
    neverStarted: undefined,
    archived: false,
    status: 'idle',
    action: 'starting up',
    recentTextTs: Date.now(),
    ...(rec.command ? { command: rec.command } : {}),
    ...(rec.model ? { model: rec.model } : {}),
    ...(rec.provider ? { provider: rec.provider as Agent['provider'] } : {}),
    ...(rec.cwd ? { cwd: rec.cwd } : {}),
    ...(rec.worktreePath ? { worktreePath: rec.worktreePath } : {})
  };
}

/**
 * What an agent restarts ON, from the command box in its details panel
 * (0.5.3, founder 24 Sep: "the agent sidebar should have the input area that
 * shows the cli command used to spawn this agent and user should be able to
 * edit it and restart button should always be visible").
 *
 * The panel's Restart used to rebuild the line from the provider and model
 * picks, so a hand edit saved from the agent sheet was dropped on the next
 * restart, and there was no box to edit it in. Now the line on screen is the
 * line that runs:
 *   - an empty box runs the line the picks resolve to;
 *   - a line for another engine is refused, not run (commandEngineConflict);
 *   - a `--model X` in the line becomes the stored model, because the restore
 *     path at app start writes the stored model back into the line
 *     (commandWithModel) and would otherwise undo the edit.
 * No electron import and no store import, so a test runs it as it is.
 */
import type { AgentProvider } from './agentProvider';
import { commandEngineConflict } from './godCommand';
import { modelInCommand } from './liveModel';

export interface AgentRestartPlan {
  /** The exact line to spawn and to store as the agent's command. */
  command: string;
  /** The model to store: the one the line names, else the one already stored. */
  model: string | undefined;
  /** The engine the line would start instead of `provider`, or null. */
  conflict: AgentProvider | null;
}

export function planAgentRestart(draft: string, resolved: string, provider: AgentProvider, storedModel: string | undefined): AgentRestartPlan {
  const command = draft.trim() || resolved.trim();
  const conflict = commandEngineConflict(command, provider);
  return { command, model: modelInCommand(command, provider) ?? storedModel, conflict };
}

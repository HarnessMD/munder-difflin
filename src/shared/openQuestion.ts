/**
 * Is a question for a person open in this agent's terminal right now?
 *
 * 0.5.3 bug 19. An agent that calls AskUserQuestion draws a multiple choice
 * menu and waits. To the app that looked like any other tool call: PreToolUse
 * arrived, the agent read as `working`, and then the terminal went silent
 * because a menu waiting for a person prints nothing. Twelve seconds of silence
 * is the evidence both delivery paths trust to mean "the turn is over", so the
 * inbox nudge was typed into the menu and the Return that ends every delivery
 * picked whichever option was highlighted. Nobody was at the keyboard.
 *
 * Silence cannot tell a finished turn from a waiting menu, and neither can the
 * idle Notification, which fires for both. The tool call can: the menu is open
 * from the question tool's PreToolUse until something proves it closed.
 *
 * Shared by the two writers that type into a terminal, the renderer's queue
 * drain (useHive.ts) and the main process wake watchdog (workerWake.ts), so
 * they cannot disagree about it. No electron import and no store import.
 */

/** Tools that put a menu in front of a person and block until it is answered.
 *  ExitPlanMode is the plan approval menu, the same shape as a question. */
export const HUMAN_QUESTION_TOOLS: readonly string[] = ['AskUserQuestion', 'ExitPlanMode'];

export function isHumanQuestionTool(tool: string | undefined): boolean {
  return !!tool && HUMAN_QUESTION_TOOLS.includes(tool);
}

export type QuestionEffect = 'open' | 'close' | null;

/** What one hook event means for the agent's open question.
 *
 *  Only the question tool's OWN PostToolUse closes it. A sub agent runs beside
 *  its parent and reports under the parent's id, so another tool finishing, or
 *  a SubagentStop, says nothing about the parent's menu.
 *
 *  Stop, UserPromptSubmit and SessionStart close it because each is proof the
 *  menu is gone: the turn ended, a person typed a new prompt, or the process is
 *  a new one. They cover the dismissed menu, where no PostToolUse is sent. */
export function questionEffect(event: string | undefined, tool: string | undefined): QuestionEffect {
  if (event === 'PreToolUse') return isHumanQuestionTool(tool) ? 'open' : null;
  if (event === 'PostToolUse') return isHumanQuestionTool(tool) ? 'close' : null;
  if (event === 'Stop' || event === 'UserPromptSubmit' || event === 'SessionStart') return 'close';
  return null;
}

export class OpenQuestionTracker {
  /** agentId to the question tool that is open. */
  private open = new Map<string, string>();

  /** Feed every hook event. Returns the effect so a caller can react to the edge. */
  note(agentId: string | undefined, event: string | undefined, tool: string | undefined): QuestionEffect {
    if (!agentId) return null;
    const effect = questionEffect(event, tool);
    if (effect === 'open') this.open.set(agentId, tool as string);
    else if (effect === 'close') this.open.delete(agentId);
    return effect;
  }

  isOpen(agentId: string | undefined): boolean {
    return !!agentId && this.open.has(agentId);
  }

  /** The agent's terminal is gone, and its menu with it. */
  forget(agentId: string): void {
    this.open.delete(agentId);
  }
}

/**
 * Drop the hold of every agent whose terminal is gone. `listed` is whether the
 * listing ANSWERED: a listing that failed and a floor with no terminals both
 * arrive as an empty list, and they are opposite facts. Dropping a hold is the
 * dangerous direction, it is what lets a delivery press Return into a menu, so
 * a failed listing forgets nothing and the next poll decides.
 *
 * A function, not three lines inside an effect, so that a test can RUN it with
 * a failed listing. The first test for this only read the source text, and it
 * passed whether or not the guard did anything (Creed's review).
 */
export function forgetExitedTerminals(
  tracker: OpenQuestionTracker,
  agents: ReadonlyArray<{ id: string; ptyId?: string | null }>,
  listing: { listed: boolean; liveIds: ReadonlySet<string> }
): string[] {
  if (!listing.listed) return [];
  const forgotten: string[] = [];
  for (const a of agents) {
    if (a.ptyId && !listing.liveIds.has(a.ptyId) && tracker.isOpen(a.id)) { tracker.forget(a.id); forgotten.push(a.id); }
  }
  return forgotten;
}

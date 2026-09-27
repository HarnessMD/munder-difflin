/**
 * The command the orchestrator actually starts with (0.5.3 bug 20).
 *
 * His command was never stored: it was derived from `godProvider` and
 * `godModel` at boot and at restart, and the settings tab could only show it
 * and copy it. A person who needs one more flag on it had no place to put it.
 *
 * `config.godCommand` is that place: a hand edited line that wins over the
 * derived one. It can go stale, because the provider is also changed from
 * places that know nothing about it (onboarding, the classic command center,
 * voice). So it is ignored, not obeyed, when its binary is a KNOWN engine other
 * than the one now picked: a saved `claude ...` line must not start a floor
 * whose orchestrator was switched to codex. An unknown binary is a person's own
 * wrapper and is trusted.
 */
import { inferAgentProvider, type AgentProvider } from './agentProvider';

export function effectiveGodCommand(
  override: string | undefined | null,
  resolved: string,
  godProvider: AgentProvider
): string {
  const line = (override ?? '').trim();
  if (!line) return resolved;
  if (commandEngineConflict(line, godProvider)) return resolved;
  return line;
}

/**
 * The engine a typed command line would start, when that is NOT the engine
 * picked for the agent; null when the two agree (0.5.3, founder 24 Sep).
 *
 * One rule for every place a person edits a command and presses Restart: the
 * orchestrator's Config tab and an agent's details panel. The boot path above
 * quietly falls back to the derived line on a conflict, which is right for a
 * STALE saved edit (T85). A line being typed right now is not stale, so the
 * editors show this conflict and keep Restart off instead of starting a
 * different line than the one on screen.
 *
 * An unknown binary is a person's own wrapper and never conflicts, and a
 * `custom` agent runs whatever it is given.
 */
export function commandEngineConflict(line: string, provider: AgentProvider): AgentProvider | null {
  const trimmed = line.trim();
  if (!trimmed || provider === 'custom') return null;
  const of = inferAgentProvider(trimmed, undefined);
  return of !== 'custom' && of !== provider ? of : null;
}

/** What to store for a draft: nothing when it says what the picks already
 *  resolve to, so the derived line keeps following the picks. */
export function godCommandToStore(draft: string, resolved: string): string | undefined {
  const line = draft.trim();
  return !line || line === resolved.trim() ? undefined : line;
}

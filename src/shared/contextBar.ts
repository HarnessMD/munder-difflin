/**
 * The compact bar, in tokens (0.5.6).
 *
 * The person sets a percent. The app compacts on what that percent means in
 * tokens for the agent's own window: 30% of a 1,000,000 window is 300,000
 * tokens, 50% of a 200,000 window is 100,000.
 *
 * Two roads use these numbers:
 *   - An agent WITH a token count is checked when its turn ends. At or over
 *     the bar, its compact is queued. No timer, no gap between runs.
 *   - An agent with NO token count stays on the timer, as before. Its engine
 *     reports nothing to measure, so time is all there is.
 *
 * Pure, and it imports a type only, so main, the window and the tests all read
 * the same numbers.
 */
import type { ContextRule } from './triggers';

/** The three facts about an agent this file reads. The window's `Agent` fits. */
export interface ContextReading {
  /** The agent's context size now, in tokens. Absent: the engine reports none. */
  contextTokens?: number;
  /** The window size the engine reported, in tokens. Absent until it does. */
  contextLimit?: number;
  /** The model name. A name with `1m` in it is a 1,000,000 token window. */
  model?: string;
}

/** The two bars of a rule. `ContextRule` fits. */
export type ContextBars = Pick<ContextRule, 'minContextPct' | 'minContextPctLargeWindow'>;

/** The two window sizes the app sees. */
export const SMALL_WINDOW_TOKENS = 200_000;
export const LARGE_WINDOW_TOKENS = 1_000_000;

/** At or above this size a window is judged against the large window bar. Sits
 *  between the two real sizes so neither lands in doubt. */
export const LARGE_CONTEXT_WINDOW = 500_000;

/** The agent's window: the limit its engine reported, or 1,000,000 for a 1M
 *  model name, or 200,000. */
export function windowTokens(a: ContextReading): number {
  if (typeof a.contextLimit === 'number' && Number.isFinite(a.contextLimit) && a.contextLimit > 0) return a.contextLimit;
  return /1m/i.test(a.model ?? '') ? LARGE_WINDOW_TOKENS : SMALL_WINDOW_TOKENS;
}

/** The percent the person set for a window of this size. */
export function barPctForWindow(windowSize: number, rule: ContextBars): number {
  return windowSize >= LARGE_CONTEXT_WINDOW ? rule.minContextPctLargeWindow : rule.minContextPct;
}

/** A percent of a window, in tokens. 0 for a percent of 0 or less: no bar. */
export function pctToTokens(pct: number, windowSize: number): number {
  if (!(pct > 0) || !(windowSize > 0)) return 0;
  return Math.round((pct * windowSize) / 100);
}

/** What a rule's two percents mean in tokens, for the settings screens: the
 *  small bar on a 200,000 window, the large bar on a 1,000,000 one. */
export function ruleBarTokens(rule: ContextBars): { small: number; large: number } {
  return {
    small: pctToTokens(rule.minContextPct, SMALL_WINDOW_TOKENS),
    large: pctToTokens(rule.minContextPctLargeWindow, LARGE_WINDOW_TOKENS)
  };
}

/** The agent's bar in tokens. 0 means the rule has no bar for this window (the
 *  person set 0%), and then time alone fires it. */
export function barTokens(a: ContextReading, rule: ContextBars): number {
  const size = windowTokens(a);
  return pctToTokens(barPctForWindow(size, rule), size);
}

/** Does the app have a token count for this agent? A count of 0 is a count. */
export function hasTokenReading(a: ContextReading): boolean {
  return typeof a.contextTokens === 'number' && Number.isFinite(a.contextTokens);
}

/** Is this agent's compact decided when its turn ends? It needs a token count
 *  and a bar to hold it against. Without either it stays on the timer. */
export function compactsAtTurnEnd(a: ContextReading, rule: ContextBars): boolean {
  return hasTokenReading(a) && barTokens(a, rule) > 0;
}

/** Is the agent at or over its bar? False with no count, and false with no bar. */
export function atOrOverBar(a: ContextReading, rule: ContextBars): boolean {
  const bar = barTokens(a, rule);
  return bar > 0 && hasTokenReading(a) && (a.contextTokens as number) >= bar;
}

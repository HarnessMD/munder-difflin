/**
 * The RESPONSE STYLE brief, the standing house rules for HOW every agent
 * answers, on every engine.
 *
 * The founder's ask, verbatim: "Ensure that all agents across have some kind of
 * response style brief, stick to the subject, factual, short and crisp and
 * easily understandable language always, add this as a part of settings that
 * user can edit."
 *
 * Two things follow from "the user can edit it".
 *
 *  1. It rides the LIVE channels, never the spawn command. The standing goal
 *     already solved this: `src/main/hooks.ts` returns it as `additionalContext`
 *     on SessionStart + UserPromptSubmit (claude, codex, gemini, grok), and
 *     `withStandingGoal` in `useHive.ts` prepends it to the text typed into the
 *     PTY for the engines with no hook bridge (cursor, copilot). This module is
 *     the one renderer both paths call, so the two can never drift, and an edit
 *     lands without restarting a single agent. It is deliberately NOT baked into
 *     `injectedPrompt()` (hive.ts), which is evaluated once at spawn and is kept
 *     prompt cache invariant for exactly that reason.
 *
 *  2. It must be VOLATILE FREE. `additionalContext` is re-sent on every prompt,
 *     so a timestamp, a counter or an agent id in here would move the tail of
 *     the prompt on every single turn and invalidate the prompt cache for the
 *     whole floor. Nothing in this file reads a clock, a counter or an id.
 *
 * React free and dependency free on purpose: main, renderer and `node --test`
 * all load it (test/load-ts.cjs cannot resolve react or load a .tsx).
 */

/** The tag the brief is wrapped in, so an agent can see where it starts and
 *  ends, the same shape as the `<goal>` block it travels beside. */
export const RESPONSE_STYLE_TAG = 'response_style';

/** The shipped brief. Written as instructions to an agent, not as marketing.
 *  House rule: no dashes anywhere in copy a person or an agent reads. */
export const DEFAULT_RESPONSE_STYLE = [
  'Answer in the house style, on every message:',
  'Stay on the subject you were asked about, and answer the question that was actually asked.',
  'Be factual. Say what you checked and what you found. If you do not know, say that you do not know.',
  'Be short and crisp. Lead with the answer, then add only the detail that changes it.',
  'Use plain language anyone on the team can read. Spell a term out the first time you use it.',
  'Cut filler. No preamble, no flattery, no repeating the question back.',
  'When something is genuinely long, break it into short labelled parts instead of one block.'
].join('\n');

/** Character ceiling for the brief. Large enough to write a real house style,
 *  small enough that it costs little on every turn of every agent. */
export const RESPONSE_STYLE_MAX = 1200;

/** Anything that would let the value break out of its own wrapper. Opening and
 *  closing, case insensitive, so a `</RESPONSE_STYLE>` pasted into the textarea
 *  cannot end the block early and turn the rest of the text into free floating
 *  instructions sitting outside the brief. */
const TAG_PATTERN = new RegExp(`</?\\s*${RESPONSE_STYLE_TAG}\\s*/?>`, 'gi');

/**
 * Drop the control characters. They have no business in a style brief, and one
 * of the two delivery paths TYPES this text into a live terminal, where an
 * escape sequence is not merely noise. Tab (9) and newline (10) are kept; every
 * other C0 control and DEL (127) goes. Written as a code point scan rather than
 * a regex so the source of this file stays plain ASCII.
 */
function stripControls(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 9 || code === 10 || (code >= 32 && code !== 127)) out += ch;
  }
  return out;
}

/**
 * The brief as it will actually be used: never empty, never over the cap, never
 * able to close its own wrapper. Anything that is not a usable string falls back
 * to the shipped default, because "no style at all" is not one of the states the
 * founder asked for.
 */
export function normalizeResponseStyle(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_RESPONSE_STYLE;
  const cleaned = stripControls(value.replace(/\r\n?/g, '\n').replace(TAG_PATTERN, '')).trim();
  if (!cleaned) return DEFAULT_RESPONSE_STYLE;
  // Trimmed before the slice, so the first character is never whitespace and the
  // capped result can never come back empty.
  return cleaned.length > RESPONSE_STYLE_MAX
    ? cleaned.slice(0, RESPONSE_STYLE_MAX).trim()
    : cleaned;
}

/**
 * The exact block that gets injected, on BOTH delivery paths. Normalizes on the
 * way through, so no caller can emit an unwrapped, oversized or self closing
 * brief by forgetting to sanitize first.
 */
export function renderResponseStyle(value: unknown): string {
  return `<${RESPONSE_STYLE_TAG}>\n${normalizeResponseStyle(value)}\n</${RESPONSE_STYLE_TAG}>`;
}

/** True when the effective brief is the shipped one, so Settings can say
 *  "default" instead of showing a diff against nothing. An empty or unset value
 *  IS the default, because that is what the agents will receive. */
export function isDefaultStyle(value: unknown): boolean {
  return normalizeResponseStyle(value) === DEFAULT_RESPONSE_STYLE;
}

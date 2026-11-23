/**
 * Claude Code's own output style, set for the agents this app starts (0.5.3
 * feature 19: "concise output by default, to save users tokens").
 *
 * Two layers, and only one was missing.
 *
 *  1. The response style brief (responseStyle.ts) already reaches EVERY engine:
 *     as hook context where there is a hook bridge, typed in front of each
 *     message where there is not. It is the concise instruction for every
 *     provider that has no output style setting of its own.
 *  2. Claude Code does have one: `outputStyle` in its settings. The app writes a
 *     settings file per agent and never set it. This module is that setting.
 *
 * "Concise" is a style Claude Code ships (checked in the installed 2.1.278
 * binary). The user can change it, and may name a style of their own from
 * `~/.claude/output-styles`, so the value is a name, not an enum. It lands in a
 * JSON settings file, never on a command line, but it is still held to a plain
 * name so a pasted paragraph cannot become a settings value.
 */

export const DEFAULT_CLAUDE_OUTPUT_STYLE = 'Concise';

/** The styles Claude Code ships, in the order the picker shows them. `default`
 *  is Claude Code's own name for "no style": the way to turn this off. */
export const CLAUDE_OUTPUT_STYLES: readonly string[] = ['Concise', 'default', 'Explanatory', 'Learning'];

const STYLE_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,59}$/;

/** The style that will be written. Unset, empty or not a plain name falls back to
 *  Concise, because "concise by default" is the ask. */
export function normalizeClaudeOutputStyle(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_CLAUDE_OUTPUT_STYLE;
  const name = value.trim();
  return STYLE_NAME.test(name) ? name : DEFAULT_CLAUDE_OUTPUT_STYLE;
}

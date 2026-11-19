/**
 * What each hive agent's own Codex `config.toml` changes from the copy of the
 * person's `~/.codex/config.toml` it starts from. The person's file is only
 * read, never written.
 *
 * Line based on purpose: a full TOML round trip would reformat the person's
 * file and drop their comments.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT): src/main/codexAgentConfig.ts and
 * src/shared/codexToolOutputLimit.ts.
 */

/**
 * The most of one tool output, in Codex's estimated tokens (about 4
 * characters each), that the model sees on later requests. Codex keeps the
 * start and the end of a longer output and marks the middle as cut. Every
 * output stays in the conversation and is sent again with every later
 * request, so a long one costs on every step after it.
 */
export const CODEX_TOOL_OUTPUT_TOKEN_LIMIT = 4000;

/** A `[plugins.<name>]` table header (not an array of tables, not a sub-table).
 *  A bare TOML key is only [A-Za-z0-9_-]: a dot starts a dotted key (a sub-table
 *  such as `[plugins.browser.settings]`), and a name with '@' must be quoted. */
const PLUGIN_TABLE = /^\s*\[\s*plugins\s*\.\s*("(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+)\s*\]\s*(#.*)?$/;
const ANY_TABLE = /^\s*\[/;
const ENABLED = /^(\s*)(["']?)enabled\2(\s*=\s*)(true|false)(\s*(#.*)?)$/;
const PLUGINS_OFF_NOTE = '# munder-hive: plugins are off for hive agents';

/**
 * Turn every plugin in the copied config OFF. Each enabled plugin adds its
 * tools, skills and instructions to every request; a hive coding agent uses
 * none of them. A plugin table with no `enabled` key gets `enabled = false`.
 */
export function disableCodexPlugins(config: string): { text: string; disabled: number } {
  const lines = config.split(/\r?\n/);
  const out: string[] = [];
  let inPlugin = false;
  let sawEnabled = false;
  let disabled = 0;
  const closeTable = (): void => {
    if (inPlugin && !sawEnabled) {
      // After the table's last non-blank line, so a blank separator stays one.
      let at = out.length;
      while (at > 0 && out[at - 1].trim() === '') at--;
      out.splice(at, 0, `enabled = false ${PLUGINS_OFF_NOTE}`);
      disabled++;
    }
    inPlugin = false;
    sawEnabled = false;
  };
  for (const line of lines) {
    if (ANY_TABLE.test(line)) {
      closeTable();
      inPlugin = PLUGIN_TABLE.test(line);
      out.push(line);
      continue;
    }
    const m = inPlugin ? ENABLED.exec(line) : null;
    if (m) {
      sawEnabled = true;
      if (m[4] === 'true') {
        out.push(`${m[1]}${m[2]}enabled${m[2]}${m[3]}false ${PLUGINS_OFF_NOTE}`);
        disabled++;
        continue;
      }
    }
    out.push(line);
  }
  closeTable();
  return { text: out.join('\n'), disabled };
}

/** Is `line` the top-level key `key`, bare or quoted? */
function isKeyLine(line: string, key: string): boolean {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*(["']?)${esc}\\1\\s*=`).test(line);
}

/**
 * Add a top-level number key at the very top of the file, where TOML reads it
 * as top level (after a table header it would belong to that table). A key the
 * person already set at top level is left as theirs.
 */
export function withCodexTopLevelNumber(config: string, key: string, value: number): string {
  const lines = config.split(/\r?\n/);
  const firstTable = lines.findIndex((l) => ANY_TABLE.test(l));
  const top = firstTable < 0 ? lines : lines.slice(0, firstTable);
  if (top.some((l) => isKeyLine(l, key))) return config;
  return `# --- munder-hive: per-agent limit (auto-generated; do not edit) ---\n${key} = ${Math.trunc(value)}\n\n${config}`;
}

const TUI_TABLE = /^\s*\[\s*tui\s*\]\s*(#.*)?$/;
const ALT_SCREEN_IN_TUI = /^\s*(["']?)alternate_screen\1\s*=/;
const ALT_SCREEN_DOTTED = /^\s*tui\s*\.\s*(["']?)alternate_screen\1\s*=/;
const TUI_INLINE = /^\s*tui\s*=/;
const INLINE_NOTE = '# munder-hive: Codex draws inline, so its output stays in the terminal and scrolls back (auto-generated)';

/**
 * CODEX DRAWS INLINE ("scrolling up to see older message is not working").
 * Codex 0.164 runs on the terminal's alternate screen unless told otherwise. That screen keeps no history, so the
 * app's terminal had nothing to scroll back through: only Codex's own view moved, a row per turn of the wheel. `[tui] alternate_screen = "never"` (the config twin of `--no-alt-screen`) keeps Codex
 * on the normal screen, its output goes into the terminal's history, and the wheel scrolls it as it does a Claude
 * agent's. A Codex that does not know the key reads past it; a flag it did not know would stop it.
 *
 * The person's own setting stands: a `tui` table given inline (a key beside it would break the file) or an
 * `alternate_screen` they set comes back as it is. A `[tui]` header gets the key under it (a second `[tui]` would be
 * a duplicate table); with none, a dotted key goes at the top, where it is top level.
 */
export function withCodexInlineScreen(config: string): string {
  const lines = config.split(/\r?\n/);
  let table: string | null = null;
  let tuiHeader = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (ANY_TABLE.test(line)) {
      table = TUI_TABLE.test(line) ? 'tui' : 'other';
      if (table === 'tui' && tuiHeader < 0) tuiHeader = i;
      continue;
    }
    if (table === null && (TUI_INLINE.test(line) || ALT_SCREEN_DOTTED.test(line))) return config;
    if (table === 'tui' && ALT_SCREEN_IN_TUI.test(line)) return config;
  }
  if (tuiHeader >= 0) {
    lines.splice(tuiHeader + 1, 0, INLINE_NOTE, 'alternate_screen = "never"');
    return lines.join('\n');
  }
  return `${INLINE_NOTE}\ntui.alternate_screen = "never"\n${config}`;
}

/** The copied config with plugins off, the tool output cap set and Codex drawing inline. */
export function codexAgentConfig(config: string): string {
  return withCodexTopLevelNumber(withCodexInlineScreen(disableCodexPlugins(config).text), 'tool_output_token_limit', CODEX_TOOL_OUTPUT_TOKEN_LIMIT);
}

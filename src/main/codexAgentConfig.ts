/**
 * What a hive Codex agent's OWN config.toml changes relative to the seed copied
 * from the person's ~/.codex/config.toml (installCodexHooks). Pure text
 * transforms; the person's file is only ever read, never written.
 *
 * Line based on purpose: a full TOML round trip would reformat the person's
 * file and drop their comments.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT).
 */

/** Each tool output the model sees is capped at this many of Codex's estimated
 *  tokens (about 4 characters each): an output over it keeps its beginning and
 *  end, and the middle is cut. The model's own policy still applies on top. */
export const CODEX_TOOL_OUTPUT_TOKEN_LIMIT = 4000;

/** A `[plugins.<name>]` table header (not an array of tables, not a sub-table).
 *  A bare TOML key is only [A-Za-z0-9_-]: a dot starts a dotted key (a sub-table
 *  such as `[plugins.browser.settings]`), and a name with '@' must be quoted. */
const PLUGIN_TABLE = /^\s*\[\s*plugins\s*\.\s*("(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+)\s*\]\s*(#.*)?$/;
const ANY_TABLE = /^\s*\[/;
const ENABLED = /^(\s*)(["']?)enabled\2(\s*=\s*)(true|false)(\s*(#.*)?)$/;

/**
 * Every plugin the seed enables is turned OFF for a hive agent: each enabled
 * plugin adds its tools, skills and instructions to every request (browser,
 * computer use, documents, spreadsheets, ...), none of which a hive coding
 * agent uses. A plugin table with no `enabled` key gets `enabled = false` too.
 * Returns the text and how many were turned off.
 */
export function disableCodexPlugins(config: string): { text: string; disabled: number } {
  const lines = config.split(/\r?\n/);
  const out: string[] = [];
  let inPlugin = false;
  let sawEnabled = false;
  let disabled = 0;
  const closeTable = (): void => {
    if (inPlugin && !sawEnabled) {
      // After the table's last non-blank line, so a blank separator stays a separator.
      let at = out.length;
      while (at > 0 && out[at - 1].trim() === '') at--;
      out.splice(at, 0, 'enabled = false # munder-hive: plugins are off for hive agents');
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
        out.push(`${m[1]}${m[2]}enabled${m[2]}${m[3]}false # munder-hive: plugins are off for hive agents`);
        disabled++;
        continue;
      }
    }
    out.push(line);
  }
  closeTable();
  return { text: out.join('\n'), disabled };
}

/** A top-level key line of the seed (before its first table), bare or quoted. */
function topLevelKey(line: string, key: string): boolean {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*(["']?)${esc}\\1\\s*=`).test(line);
}

/**
 * Set top-level scalar keys in OUR copy: any seed line for the same key before
 * the first table is removed (TOML forbids a duplicate key), and ours go first
 * in the file. A `null` value only removes.
 */
export function setCodexTopLevelKeys(config: string, entries: Record<string, number | boolean | null>): string {
  const lines = config.split(/\r?\n/);
  const firstTable = lines.findIndex((l) => ANY_TABLE.test(l));
  const topEnd = firstTable < 0 ? lines.length : firstTable;
  const keys = Object.keys(entries);
  const kept = lines.filter((l, i) => i >= topEnd || !keys.some((k) => topLevelKey(l, k)));
  const ours = keys
    .filter((k) => (typeof entries[k] === 'number' && Number.isFinite(entries[k] as number)) || typeof entries[k] === 'boolean')
    .map((k) => `${k} = ${typeof entries[k] === 'boolean' ? String(entries[k]) : Math.trunc(entries[k] as number)}`);
  if (!ours.length) return kept.join('\n');
  return `# --- munder-hive: per-agent limits (auto-generated; do not edit) ---\n${ours.join('\n')}\n\n${kept.join('\n')}`;
}

/** OUR copy of the seed: plugins off, and each tool output capped. */
export function codexAgentConfig(seed: string): string {
  return setCodexTopLevelKeys(disableCodexPlugins(seed).text, { tool_output_token_limit: CODEX_TOOL_OUTPUT_TOKEN_LIMIT });
}

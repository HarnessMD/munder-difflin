/**
 * Codex's Windows sandbox for a per agent config (plan F, T5, founder's ruling
 * 29 Sep: option 1).
 *
 * On Windows, Codex turns `-s workspace-write` into READ ONLY unless its Windows
 * sandbox is on (codex-rs/config/src/config_toml.rs effective_sandbox_mode), and
 * it is off unless config.toml says `[windows] sandbox = "elevated" |
 * "unelevated"` (codex-rs/core/src/windows_sandbox.rs). With auto mode's
 * `-a never` such an agent can neither write nor ask, which reads as "auto mode
 * sends no flags". So the per agent copy of the config gets
 * `sandbox = "unelevated"` (elevated needs an admin setup) when the person has
 * not chosen anything. The auto mode flag itself does not change: no bypass.
 *
 * Only ever applied to the agent's own copy, never to the person's config.
 *
 * A config Codex cannot parse stops Codex from starting, so the reader below
 * is deliberately strict (gate of #190, W3): it follows multi line strings,
 * arrays and inline tables across lines, and any line it does not understand
 * means "write nothing". Leaving the key out costs write access on Windows;
 * a broken config costs the whole agent.
 */

/** Old `[features]` switches Codex still reads as a Windows sandbox choice
 *  (codex-rs/core/src/windows_sandbox.rs legacy_windows_sandbox_mode_from_entries).
 *  Present at all, true or false, means the person chose. */
const LEGACY_FEATURE_KEYS = new Set([
  'elevated_windows_sandbox',
  'experimental_windows_sandbox',
  'enable_experimental_windows_sandbox'
]);

export type CodexWindowsSandbox =
  | { toml: string; why: 'added' }
  /** `person-set`: a sandbox choice is already there. `doubt`: the reader could
   *  not be sure an edit keeps the file valid; `detail` says why, for the log. */
  | { toml: null; why: 'person-set' | 'doubt'; detail: string };

const SEGMENT = /\s*(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|([A-Za-z0-9_-]+))\s*/y;

/** A dotted TOML key as its segments, or null when it is not one. */
function keyPath(text: string): string[] | null {
  const out: string[] = [];
  let at = 0;
  for (;;) {
    SEGMENT.lastIndex = at;
    const m = SEGMENT.exec(text);
    if (!m) return null;
    out.push(m[1] ?? m[2] ?? m[3]);
    at = SEGMENT.lastIndex;
    if (at === text.length) return out;
    if (text[at] !== '.') return null;
    at++;
  }
}

/** Where a value left the reader: inside a multi line string, and how many
 *  `[` or `{` are still open. `bad` when the text cannot be valid TOML. */
interface ScanState { ml: '"""' | "'''" | null; depth: number; bad?: string }

/** Follow strings, comments and brackets through one line of value text. */
function scan(text: string, st: ScanState): void {
  let i = 0;
  while (i < text.length) {
    if (st.ml) {
      if (st.ml === '"""' && text[i] === '\\') { i += 2; continue; }
      if (text.startsWith(st.ml, i)) {
        i += 3;
        // Up to two quotes of content may sit right before the closing three.
        let extra = 0;
        while (extra < 2 && text[i] === st.ml[0]) { i++; extra++; }
        st.ml = null;
        continue;
      }
      i++;
      continue;
    }
    const ch = text[i];
    if (ch === '#') return;
    if (text.startsWith('"""', i) || text.startsWith("'''", i)) { st.ml = text.slice(i, i + 3) as ScanState['ml']; i += 3; continue; }
    if (ch === '"') {
      i++;
      while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
      if (i >= text.length) { st.bad = 'unclosed string'; return; }
      i++;
      continue;
    }
    if (ch === "'") {
      const end = text.indexOf("'", i + 1);
      if (end < 0) { st.bad = 'unclosed string'; return; }
      i = end + 1;
      continue;
    }
    if (ch === '[' || ch === '{') st.depth++;
    else if (ch === ']' || ch === '}') {
      st.depth--;
      if (st.depth < 0) { st.bad = 'unbalanced brackets'; return; }
    }
    i++;
  }
}

const doubt = (detail: string): CodexWindowsSandbox => ({ toml: null, why: 'doubt', detail });
const personSet = (detail: string): CodexWindowsSandbox => ({ toml: null, why: 'person-set', detail });

/**
 * The config with `sandbox = "unelevated"` in its `windows` table, or null with
 * the reason it is left alone: the person set a sandbox already (in `[windows]`,
 * as a dotted `windows.sandbox` key, inline, or through a legacy feature
 * switch), or the reader is not sure an edit keeps the file valid.
 */
export function codexWindowsSandboxToml(toml: string): CodexWindowsSandbox {
  const eol = toml.includes('\r\n') ? '\r\n' : '\n';
  const lines = toml.replace(/^﻿/, '').split(/\r?\n/);
  const st: ScanState = { ml: null, depth: 0 };
  let table: string[] = [];
  let windowsHeader = -1;
  let rootDottedWindows = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Inside a multi line string, array or inline table: not a statement.
    if (st.ml || st.depth > 0) {
      scan(line, st);
      if (st.bad) return doubt(`line ${i + 1}: ${st.bad}`);
      continue;
    }
    if (/^\s*(#.*)?$/.test(line)) continue;
    if (/^\s*\[/.test(line)) {
      const arr = line.match(/^\s*\[\[([^\[\]]+)\]\]\s*(#.*)?$/);
      const tbl = arr ? null : line.match(/^\s*\[([^\[\]]+)\]\s*(#.*)?$/);
      const path = keyPath((arr ?? tbl)?.[1] ?? '');
      if (!path) return doubt(`line ${i + 1}: a table header it cannot read`);
      if (arr) {
        if (path[0] === 'windows') return doubt(`line ${i + 1}: windows is an array of tables`);
        table = ['[[]]', ...path];
        continue;
      }
      table = path;
      if (path.length === 1 && path[0] === 'windows') {
        if (windowsHeader >= 0) return doubt(`line ${i + 1}: a second [windows] table`);
        windowsHeader = i;
      }
      continue;
    }
    const kv = line.match(/^(\s*(?:"(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+)(?:\s*\.\s*(?:"(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+))*\s*)=(.*)$/);
    const own = kv ? keyPath(kv[1]) : null;
    if (!kv || !own) return doubt(`line ${i + 1}: a line it cannot read`);
    scan(kv[2], st);
    if (st.bad) return doubt(`line ${i + 1}: ${st.bad}`);
    const key = [...table, ...own];
    if (key[0] === 'windows' && key[1] === 'sandbox') return personSet(`line ${i + 1}`);
    if (key[0] === 'features' && key.length === 2 && LEGACY_FEATURE_KEYS.has(key[1])) return personSet(`line ${i + 1}`);
    if (key.length === 1 && key[0] === 'windows') {
      // `windows = { … }`: an inline table cannot take another key from outside.
      return /\bsandbox\b/.test(kv[2]) ? personSet(`line ${i + 1}`) : doubt(`line ${i + 1}: windows is an inline table`);
    }
    if (key.length === 1 && key[0] === 'features' && /windows_sandbox/.test(kv[2])) return personSet(`line ${i + 1}`);
    if (table.length === 0 && own[0] === 'windows' && rootDottedWindows < 0) rootDottedWindows = i;
  }
  if (st.ml) return doubt('a multi line string is never closed');
  if (st.depth > 0) return doubt('an array or inline table is never closed');
  // Dotted `windows.x` keys at the top AND a [windows] header: TOML rejects that
  // already, and an edit cannot make it valid.
  if (windowsHeader >= 0 && rootDottedWindows >= 0) return doubt('windows is both dotted keys and a table');

  const entry = 'sandbox = "unelevated"';
  if (windowsHeader >= 0) {
    lines.splice(windowsHeader + 1, 0, entry);
    return { toml: lines.join(eol), why: 'added' };
  }
  if (rootDottedWindows >= 0) {
    // `windows` is already defined by dotted keys at the top, so a [windows]
    // header would define it twice. Add one more dotted key beside them.
    lines.splice(rootDottedWindows, 0, `windows.${entry}`);
    return { toml: lines.join(eol), why: 'added' };
  }
  const sep = toml.length === 0 || toml.endsWith('\n') ? '' : eol;
  return {
    toml: `${toml}${sep}${eol}# --- munder-hive: Codex's Windows sandbox, so auto mode can write (plan F) ---${eol}[windows]${eol}${entry}${eol}`,
    why: 'added'
  };
}

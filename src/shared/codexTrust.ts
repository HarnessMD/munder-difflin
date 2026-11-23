/** Codex gates every working directory behind an interactive "do you trust this
 *  directory?" prompt, and the answer is persisted per config home as a
 *  `[projects."<dir>"]` table with `trust_level = "trusted"`. An agent that gets
 *  its own isolated CODEX_HOME therefore starts with a config that has never
 *  answered it, and hits that prompt on its first turn. With nobody at the
 *  keyboard it simply stalls.
 *
 *  Pre-seeding the same table is the only way out: no flag or environment
 *  variable skips the prompt (notably NOT
 *  `--dangerously-bypass-approvals-and-sandbox`, which governs command approval,
 *  not directory trust), and a `-c projects…` override is not persisted so it
 *  does not count as an answer either. */

/** Render a string as a TOML basic string, quotes included.
 *
 *  A directory name may legally contain a quote or a backslash on POSIX, and
 *  interpolating one straight into `[projects."…"]` produces a config file Codex
 *  cannot parse, which is worse than the prompt it was meant to remove. */
export function tomlBasicString(value: string): string {
  let out = '"';
  for (const ch of value) {
    const code = ch.codePointAt(0) as number;
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\b') out += '\\b';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\f') out += '\\f';
    else if (ch === '\r') out += '\\r';
    else if (code < 0x20 || code === 0x7f) out += `\\u${code.toString(16).padStart(4, '0')}`;
    else out += ch;
  }
  return `${out}"`;
}

/** Decode one TOML key segment (bare, 'literal' or "basic"). */
function decodeKey(raw: string): string {
  if (raw.startsWith("'")) return raw.slice(1, -1);
  if (!raw.startsWith('"')) return raw;
  return raw.slice(1, -1).replace(/\\(u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g, (_m, e: string) => {
    if (e[0] === 'u' || e[0] === 'U') return String.fromCodePoint(parseInt(e.slice(1), 16));
    return ({ b: '\b', t: '\t', n: '\n', f: '\f', r: '\r', '"': '"', '\\': '\\' } as Record<string, string>)[e] ?? e;
  });
}

/** Split a dotted TOML key (`projects."/a.b".trust_level`) into decoded segments. */
function keySegments(key: string): string[] {
  const out: string[] = [];
  const re = /\s*("(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+)\s*(\.|$)/y;
  let m: RegExpExecArray | null;
  while (re.lastIndex < key.length && (m = re.exec(key))) out.push(decodeKey(m[1]));
  return out;
}

/** Whether `toml` already defines the `projects.<dir>` table, in any spelling:
 *  a `[projects."<dir>"]` header, a `"<dir>" = …` key under `[projects]`, or a
 *  root level dotted `projects."<dir>"… = …` key. Appending our own header next
 *  to any of those is a duplicate table, which is invalid TOML and would make
 *  Codex refuse the whole config. */
export function hasCodexProjectTable(toml: string, dir: string): boolean {
  let table: string[] = [];
  for (const rawLine of toml.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const header = /^\[\[?(.+?)\]\]?\s*(#.*)?$/.exec(line);
    if (header) {
      table = keySegments(header[1]);
      if (table.length >= 2 && table[0] === 'projects' && table[1] === dir) return true;
      continue;
    }
    const eq = /^((?:"(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_.\s-])+?)\s*=/.exec(line);
    if (!eq) continue;
    const full = [...table, ...keySegments(eq[1])];
    if (full.length >= 2 && full[0] === 'projects' && full[1] === dir) return true;
  }
  return false;
}

/** The config.toml fragment that marks `dir` as already trusted, or '' when
 *  `existing` already has a table for that directory (the user's own answer,
 *  trusted or not, stands, and a second table would break the file).
 *
 *  `dir` must be canonical (realpath resolved): Codex resolves the directory
 *  before looking it up, so an entry keyed by an unresolved spelling (`/tmp/x`
 *  where the kernel says `/private/tmp/x`) never matches and the prompt returns. */
export function codexTrustEntry(dir: string, existing = ''): string {
  if (hasCodexProjectTable(existing, dir)) return '';
  return `\n[projects.${tomlBasicString(dir)}]\ntrust_level = "trusted"\n`;
}

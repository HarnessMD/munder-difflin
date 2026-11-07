/**
 * The R3 hold: what a hive Codex agent's folder would load from project `.codex`
 * layers, so main can hold the start until the person allows the folder.
 *
 * Every hive Codex start passes --dangerously-bypass-hook-trust, so a layer Codex
 * loads runs with no review: its MCP servers start with the agent and its hooks on
 * the first turn (in auto mode, outside the sandbox). Codex loads a project layer
 * only where the person's own config trusts the folder, but the hold does not rely
 * on that: every project `.codex` counts, fail safe.
 *
 * This is the PURE detector. It is deliberately wider than any Codex version's
 * loader: every `.codex` from the agent's folder up to the filesystem root (not
 * just up to the project root), and for a linked worktree the main checkout's
 * hooks as well (Codex takes a worktree's hooks from there). The agent's own
 * CODEX_HOME and the person's own ~/.codex (their global config, already loaded)
 * are not project layers. Whatever cannot be read counts as code that runs.
 *
 * A layer carries code through config.toml, hooks.json, rules/, agents/ (a role
 * file can carry mcp_servers) and hooks/; every entry of agents/ and hooks/ counts.
 * Only sandbox_mode and approval_policy in config.toml are overridden by the
 * agent's own --sandbox and --ask-for-approval; every other key can widen access
 * or run code (shell_environment_policy sets the environment of every command,
 * notify runs a program after every turn), so it counts and is named.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT): the TOML reader and the worktree
 * walk as written there; the trust and version model left out.
 */
import * as nodeFs from 'node:fs';
import { homedir } from 'node:os';
import { posix, win32 } from 'node:path';

// ── a small TOML reader (enough to read what codex reads; throws on what codex would reject) ──

export class TomlError extends Error {}
type TomlTable = { [k: string]: unknown };
const isTable = (v: unknown): v is TomlTable => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Parse TOML text into plain objects. Strings (all four forms), arrays, inline tables, tables,
 * arrays of tables and dotted keys are real; other scalars (numbers, booleans, dates) are kept
 * as their raw text, so a malformed number is NOT caught here (codex would then reject the file;
 * the only cost is a missed "does not parse" note, never a missed hook). Redefining a key or a
 * table is an error, as in TOML.
 */
export function parseToml(text: string): TomlTable {
  const s = text.replace(/\r\n/g, '\n');
  let i = 0;
  let line = 1;
  const root: TomlTable = {};
  const defined = new WeakSet<object>();   // tables defined by a [header] or a key path
  const inlineOrValue = new WeakSet<object>(); // inline tables / static arrays: closed to extension
  let current: TomlTable = root;
  const fail = (m: string): never => { throw new TomlError(`line ${line}: ${m}`); };
  const peek = (): string => s[i] ?? '';
  const ws = (): void => { while (peek() === ' ' || peek() === '\t') i++; };
  const wsNl = (): void => {
    for (;;) {
      ws();
      if (peek() === '#') { while (i < s.length && s[i] !== '\n') i++; }
      if (peek() === '\n') { i++; line++; continue; }
      return;
    }
  };
  const endOfLine = (): void => {
    ws();
    if (peek() === '#') while (i < s.length && s[i] !== '\n') i++;
    if (i < s.length && s[i] !== '\n') fail(`unexpected ${JSON.stringify(s.slice(i, i + 12))}`);
  };
  const basicEscape = (): string => {
    const c = s[i++];
    const simple: Record<string, string> = { b: '\b', t: '\t', n: '\n', f: '\f', r: '\r', '"': '"', '\\': '\\', e: '\u001b' };
    if (c in simple) return simple[c];
    if (c === 'u' || c === 'U') {
      const n = c === 'u' ? 4 : 8;
      const h = s.slice(i, i + n);
      if (!new RegExp(`^[0-9A-Fa-f]{${n}}$`).test(h)) fail('bad unicode escape');
      i += n;
      const cp = parseInt(h, 16);
      if (cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) fail('bad unicode scalar');
      return String.fromCodePoint(cp);
    }
    return fail(`bad escape \\${c ?? ''}`);
  };
  const str = (): string => {
    if (s.startsWith('"""', i)) {
      i += 3; if (peek() === '\n') { i++; line++; }
      let out = '';
      for (;;) {
        if (i >= s.length) fail('unterminated """ string');
        if (s.startsWith('"""', i)) {
          let q = 3; while (s[i + q] === '"' && q < 5) q++;
          out += '"'.repeat(q - 3); i += q; return out;
        }
        const c = s[i++];
        if (c === '\n') { line++; out += c; continue; }
        if (c === '\\') {
          if (/^[ \t]*\n/.test(s.slice(i))) { while (/[ \t\n]/.test(peek())) { if (peek() === '\n') line++; i++; } continue; }
          out += basicEscape(); continue;
        }
        out += c;
      }
    }
    if (s.startsWith("'''", i)) {
      i += 3; if (peek() === '\n') { i++; line++; }
      const end = s.indexOf("'''", i);
      if (end < 0) fail("unterminated ''' string");
      let e = end; while (s[e + 3] === "'" && e - end < 2) e++;
      const out = s.slice(i, e);
      line += (out.match(/\n/g) || []).length;
      i = e + 3; return out;
    }
    if (peek() === '"') {
      i++; let out = '';
      for (;;) {
        const c = s[i++];
        if (c === undefined || c === '\n') fail('unterminated string');
        if (c === '"') return out;
        if (c === '\\') { out += basicEscape(); continue; }
        out += c;
      }
    }
    if (peek() === "'") {
      i++; const end = s.indexOf("'", i);
      const nl = s.indexOf('\n', i);
      if (end < 0 || (nl >= 0 && nl < end)) fail('unterminated literal string');
      const out = s.slice(i, end); i = end + 1; return out;
    }
    return fail('expected a string');
  };
  const keyPart = (): string => {
    ws();
    if (peek() === '"' || peek() === "'") {
      if (s.startsWith('"""', i) || s.startsWith("'''", i)) fail('a key cannot be multi-line');
      return str();
    }
    const m = /^[A-Za-z0-9_-]+/.exec(s.slice(i));
    if (!m) fail('expected a key');
    i += m![0].length; return m![0];
  };
  const keyPath = (): string[] => {
    const parts = [keyPart()];
    for (;;) { ws(); if (peek() !== '.') return parts; i++; parts.push(keyPart()); }
  };
  const value = (): unknown => {
    ws();
    const c = peek();
    if (c === '"' || c === "'") return str();
    if (c === '[') {
      i++; const arr: unknown[] = [];
      for (;;) {
        wsNl();
        if (peek() === ']') { i++; break; }
        arr.push(value());
        wsNl();
        if (peek() === ',') { i++; continue; }
        if (peek() === ']') { i++; break; }
        fail('expected , or ] in an array');
      }
      inlineOrValue.add(arr);
      return arr;
    }
    if (c === '{') {
      i++; const t: TomlTable = {};
      ws();
      if (peek() === '}') { i++; inlineOrValue.add(t); return t; }
      for (;;) {
        const kp = keyPath(); ws();
        if (peek() !== '=') fail('expected = in an inline table');
        i++;
        assign(t, kp, value(), true);
        ws();
        if (peek() === ',') { i++; continue; }
        if (peek() === '}') { i++; break; }
        fail('expected , or } in an inline table');
      }
      inlineOrValue.add(t);
      return t;
    }
    const m = /^[A-Za-z0-9_:.+\-]+(?:[ T][0-9:.+\-Z]+)?/.exec(s.slice(i));
    if (!m) return fail('expected a value');
    i += m[0].length;
    return m[0] === 'true' ? true : m[0] === 'false' ? false : m[0];
  };
  const assign = (table: TomlTable, kp: string[], v: unknown, inInline = false): void => {
    let t = table;
    for (const part of kp.slice(0, -1)) {
      const next = t[part];
      if (next === undefined) { const n: TomlTable = {}; t[part] = n; defined.add(n); t = n; continue; }
      if (!isTable(next) || (inlineOrValue.has(next) && !inInline)) fail(`key ${part} is already a value`);
      t = next as TomlTable;
    }
    const last = kp[kp.length - 1];
    if (last in t) fail(`key ${kp.join('.')} is defined twice`);
    t[last] = v;
  };
  const tableAt = (kp: string[], arrayOfTables: boolean): TomlTable => {
    let t = root;
    kp.forEach((part, idx) => {
      const isLast = idx === kp.length - 1;
      let next = t[part];
      if (isLast && arrayOfTables) {
        if (next === undefined) { next = []; t[part] = next; }
        if (!Array.isArray(next) || inlineOrValue.has(next)) fail(`${kp.join('.')} is not an array of tables`);
        const n: TomlTable = {}; (next as unknown[]).push(n); t = n; return;
      }
      if (next === undefined) { const n: TomlTable = {}; t[part] = n; t = n; if (isLast) defined.add(n); return; }
      if (Array.isArray(next) && !inlineOrValue.has(next) && !isLast) { t = next[next.length - 1] as TomlTable; return; }
      if (!isTable(next) || inlineOrValue.has(next)) fail(`${kp.join('.')} redefines a value`);
      if (isLast) { if (defined.has(next as TomlTable)) fail(`table ${kp.join('.')} is defined twice`); defined.add(next as TomlTable); }
      t = next as TomlTable;
    });
    return t;
  };
  for (;;) {
    wsNl();
    if (i >= s.length) break;
    if (peek() === '[') {
      const aot = s.startsWith('[[', i);
      i += aot ? 2 : 1;
      const kp = keyPath(); ws();
      if (!s.startsWith(aot ? ']]' : ']', i)) fail('expected ] to close a table header');
      i += aot ? 2 : 1;
      current = tableAt(kp, aot);
      endOfLine();
      continue;
    }
    const kp = keyPath(); ws();
    if (peek() !== '=') fail('expected = after a key');
    i++;
    assign(current, kp, value());
    endOfLine();
  }
  return root;
}

// ── the detector ─────────────────────────────────────────────────────────────────────────────

export interface LayerFs {
  statSync: (p: string) => { isDirectory(): boolean; isFile(): boolean };
  readFileSync: (p: string, e: 'utf8') => string;
  readdirSync: (p: string) => string[];
}
const realFs: LayerFs = {
  statSync: (p) => nodeFs.statSync(p),
  readFileSync: (p, e) => nodeFs.readFileSync(p, e),
  readdirSync: (p) => nodeFs.readdirSync(p)
};

/** One thing a layer carries. `what` is an id the window words; `detail` is data
 *  (server or hook names, a config key, or the error as given). An entry of agents/
 *  or hooks/ is one item per file; past CODEX_FOLDER_LIST_MAX, one more item names
 *  the folder and counts the rest (`more`). */
export interface CodexLayerItem {
  file: string;
  what: 'mcp-servers' | 'hooks' | 'rules' | 'agents' | 'setting' | 'unreadable' | 'does-not-parse' | 'confinement';
  detail?: string;
  more?: number;
}

export interface CodexLayer {
  /** The `.codex` folder of this layer. */
  dotCodex: string;
  /** Linked worktree: the main checkout's `.codex` its hooks come from. */
  hooksFrom?: string;
  items: CodexLayerItem[];
}

export interface CodexLayerReport {
  layers: CodexLayer[];
  /** What could not be checked (an unreadable folder, an unresolvable worktree). */
  unknown: string[];
  /** The folder a person means by "this project": the cwd, or for a linked worktree the same
   *  path in its main checkout (so one OK covers every worktree of that project). */
  projectFolder: string;
}

export interface CodexLayerInput {
  cwd: string;
  /** The agent's CODEX_HOME (a `.codex` equal to it is not a project layer). */
  codexHome: string;
  /** The person's own codex home (default ~/.codex). */
  userCodexHome?: string;
  platform?: NodeJS.Platform;
  fs?: LayerFs;
}

/** The only config.toml keys the agent's own --sandbox and --ask-for-approval override. */
const CONFINE_KEYS = ['sandbox_mode', 'approval_policy'];
/** The most entries of agents/ or hooks/ listed one by one. */
export const CODEX_FOLDER_LIST_MAX = 20;
const stripVerbatim = (p: string): string => p.replace(/^\\\\\?\\(?!UNC\\)/, '');
const asciiLower = (s: string): string => s.replace(/[A-Z]/g, (c) => c.toLowerCase());

/** A folder's key: resolved, and on Windows ASCII-lowercased (as Codex keys a project). */
export function codexFolderKey(p: string, platform: NodeJS.Platform = process.platform): string {
  const P = platform === 'win32' ? win32 : posix;
  const r = P.resolve(stripVerbatim(p));
  return platform === 'win32' ? asciiLower(r) : r;
}

const sameKey = (a: string, b: string, platform: NodeJS.Platform): boolean => codexFolderKey(a, platform) === codexFolderKey(b, platform);
const names = (v: unknown): string => (isTable(v) ? Object.keys(v).join(', ') : '');

/** The project `.codex` layers this cwd could load, and what each carries. Never throws:
 *  whatever cannot be read or resolved is reported (as `unreadable` or in `unknown`). */
export function codexProjectLayers(input: CodexLayerInput): CodexLayerReport {
  const platform = input.platform ?? process.platform;
  const fs = input.fs ?? realFs;
  const P = platform === 'win32' ? win32 : posix;
  const unknown: string[] = [];
  /** null: not there; 'error': there but not readable. */
  const stat = (p: string): { dir: boolean; file: boolean } | null | 'error' => {
    try { const st = fs.statSync(p); return { dir: st.isDirectory(), file: st.isFile() }; }
    catch (e) {
      const code = (e as NodeJS.ErrnoException)?.code;
      return code === 'ENOENT' || code === 'ENOTDIR' ? null : 'error';
    }
  };
  const read = (p: string): { text: string | null; error: string | null } => {
    try { return { text: fs.readFileSync(p, 'utf8'), error: null }; }
    catch (e) {
      return (e as NodeJS.ErrnoException)?.code === 'ENOENT' ? { text: null, error: null } : { text: null, error: (e as Error).message };
    }
  };

  const cwd = P.resolve(stripVerbatim(input.cwd));
  const ancestors: string[] = [];
  for (let d = cwd; ; d = P.dirname(d)) { ancestors.push(d); if (P.dirname(d) === d) break; }

  // The git checkout root, and the main checkout of a linked worktree.
  let checkoutRoot: string | null = null;
  for (const a of ancestors) {
    const st = stat(P.join(a, '.git'));
    if (st === 'error') { unknown.push(`${P.join(a, '.git')} could not be read`); continue; }
    if (!st) continue;
    if (st.dir) { const h = stat(P.join(a, '.git', 'HEAD')); if (h === 'error' || !h) continue; }
    checkoutRoot = a; break;
  }
  let repoRoot: string | null = checkoutRoot;
  if (checkoutRoot) {
    const dotGit = P.join(checkoutRoot, '.git');
    const st = stat(dotGit);
    if (st && st !== 'error' && st.file) {
      // A linked worktree: `.git` holds `gitdir: <main>/.git/worktrees/<name>`, whose
      // `commondir` points at the main `.git`. Unresolvable -> fail closed.
      repoRoot = null;
      try {
        const m = /^gitdir:\s*(.+?)\s*$/m.exec(fs.readFileSync(dotGit, 'utf8'));
        if (!m) throw new Error('no gitdir line');
        const gitDir = P.resolve(checkoutRoot, m[1]);
        const common = P.resolve(gitDir, fs.readFileSync(P.join(gitDir, 'commondir'), 'utf8').trim());
        if (P.basename(P.dirname(gitDir)) !== 'worktrees' || P.basename(common) !== '.git') throw new Error('not a worktrees/<name> gitdir');
        repoRoot = P.dirname(common);
      } catch (e) {
        unknown.push(`the linked worktree at ${checkoutRoot} could not be resolved to its main checkout (${(e as Error).message}); its hooks come from there`);
      }
    }
  }
  const linked = !!(checkoutRoot && repoRoot && !sameKey(checkoutRoot, repoRoot, platform));

  const own = [input.codexHome, input.userCodexHome ?? P.join(homedir(), '.codex')];
  const hooksOf = (dir: string, cfg: TomlTable | null, items: CodexLayerItem[]): void => {
    if (cfg && 'hooks' in cfg) items.push({ file: P.join(dir, 'config.toml'), what: 'hooks', detail: names(cfg.hooks) });
    const hj = P.join(dir, 'hooks.json');
    const r = read(hj);
    if (r.error) { items.push({ file: hj, what: 'unreadable', detail: r.error }); return; }
    if (r.text === null) return;
    let parsed: unknown;
    try { parsed = JSON.parse(r.text); } catch (e) { items.push({ file: hj, what: 'does-not-parse', detail: (e as Error).message }); return; }
    const hooks = isTable(parsed) ? parsed.hooks : undefined;
    const empty = isTable(parsed) && Object.keys(parsed).length === 0;
    const noHooks = isTable(hooks) && Object.values(hooks).every((v) => Array.isArray(v) && v.length === 0);
    if (!empty && !noHooks) items.push({ file: hj, what: 'hooks', detail: names(hooks) });
  };
  const configOf = (dir: string, items: CodexLayerItem[]): TomlTable | null => {
    const file = P.join(dir, 'config.toml');
    const r = read(file);
    if (r.error) { items.push({ file, what: 'unreadable', detail: r.error }); return null; }
    if (r.text === null) return null;
    try { return parseToml(r.text); } catch (e) { items.push({ file, what: 'does-not-parse', detail: (e as Error).message }); return null; }
  };
  /** Every entry of a folder Codex loads code from (agents/, hooks/); an unreadable one counts. */
  const entriesOf = (folder: string, what: 'agents' | 'hooks', items: CodexLayerItem[]): void => {
    const st = stat(folder);
    if (st === 'error') { items.push({ file: folder, what: 'unreadable' }); return; }
    if (!st || !st.dir) return;
    let list: string[];
    try { list = fs.readdirSync(folder).slice().sort(); }
    catch (e) { items.push({ file: folder, what: 'unreadable', detail: (e as Error).message }); return; }
    for (const n of list.slice(0, CODEX_FOLDER_LIST_MAX)) items.push({ file: P.join(folder, n), what });
    if (list.length > CODEX_FOLDER_LIST_MAX) items.push({ file: folder, what, more: list.length - CODEX_FOLDER_LIST_MAX });
  };

  const layers: CodexLayer[] = [];
  for (const dir of ancestors.slice().reverse()) {
    const dotCodex = P.join(dir, '.codex');
    const st = stat(dotCodex);
    const items: CodexLayerItem[] = [];
    // Linked worktree: the main checkout's matching `.codex` gives this folder's hooks,
    // whether or not the worktree has its own copy.
    let hooksFrom: string | undefined;
    if (linked && checkoutRoot && repoRoot) {
      const rel = P.relative(checkoutRoot, dir);
      if (!rel.startsWith('..') && !P.isAbsolute(rel)) hooksFrom = P.join(repoRoot, rel, '.codex');
    }
    const ownLayer = st === 'error' || (st !== null && st.dir);
    if (ownLayer && !own.some((h) => sameKey(dotCodex, h, platform))) {
      if (st === 'error') items.push({ file: dotCodex, what: 'unreadable' });
      else {
        const cfg = configOf(dotCodex, items);
        const cfgFile = P.join(dotCodex, 'config.toml');
        // hooks is listed by hooksOf below; every other key is named here.
        for (const k of Object.keys(cfg ?? {})) {
          if (k === 'mcp_servers') items.push({ file: cfgFile, what: 'mcp-servers', detail: names(cfg!.mcp_servers) });
          else if (CONFINE_KEYS.includes(k)) items.push({ file: cfgFile, what: 'confinement', detail: k });
          else if (k !== 'hooks') items.push({ file: cfgFile, what: 'setting', detail: k });
        }
        const rulesDir = P.join(dotCodex, 'rules');
        const rst = stat(rulesDir);
        if (rst === 'error') items.push({ file: rulesDir, what: 'unreadable' });
        else if (rst && rst.dir) {
          try {
            for (const n of fs.readdirSync(rulesDir)) if (n.endsWith('.rules')) items.push({ file: P.join(rulesDir, n), what: 'rules' });
          } catch (e) { items.push({ file: rulesDir, what: 'unreadable', detail: (e as Error).message }); }
        }
        entriesOf(P.join(dotCodex, 'agents'), 'agents', items);
        // A worktree's own hooks count too: which copy Codex reads differs by version.
        hooksOf(dotCodex, cfg, items);
        entriesOf(P.join(dotCodex, 'hooks'), 'hooks', items);
      }
    }
    if (hooksFrom && !own.some((h) => sameKey(hooksFrom!, h, platform))) {
      const hst = stat(hooksFrom);
      if (hst === 'error') items.push({ file: hooksFrom, what: 'unreadable' });
      else if (hst && hst.dir) {
        hooksOf(hooksFrom, configOf(hooksFrom, items), items);
        entriesOf(P.join(hooksFrom, 'hooks'), 'hooks', items);
      }
    }
    if (items.length) layers.push({ dotCodex, ...(hooksFrom ? { hooksFrom } : {}), items });
  }
  let projectFolder = cwd;
  if (linked && checkoutRoot && repoRoot) {
    const rel = P.relative(checkoutRoot, cwd);
    if (!rel.startsWith('..') && !P.isAbsolute(rel)) projectFolder = rel ? P.join(repoRoot, rel) : repoRoot;
  }
  return { layers, unknown, projectFolder };
}

// ── the hold ─────────────────────────────────────────────────────────────────────────────────

/** True when the person allowed this folder (by its key, spelled as in the main checkout). */
export function isCodexFolderOk(folder: string, oks: readonly string[] | undefined, platform: NodeJS.Platform = process.platform): boolean {
  const key = codexFolderKey(folder, platform);
  return (oks ?? []).some((k) => typeof k === 'string' && codexFolderKey(k, platform) === key);
}

/** Why a Codex start is held: the layers that carry code or command policy, or what
 *  could not be checked. */
export interface CodexHold {
  /** The key one OK records: the project folder, spelled as in the main checkout. */
  folderKey: string;
  folder: string;
  layers: CodexLayer[];
  unknown: string[];
}

/** Hold when a layer carries anything but sandbox_mode and approval_policy (code, any
 *  other config key, an entry of agents/ or hooks/, a file that cannot be read or does
 *  not parse), or something could not be checked, unless the folder is allowed. A
 *  config.toml with those two keys alone starts (the agent's own --sandbox and
 *  --ask-for-approval win). */
export function codexHold(report: CodexLayerReport, oks: readonly string[] | undefined, platform: NodeJS.Platform = process.platform): CodexHold | null {
  const layers = report.layers
    .map((l) => ({ ...l, items: l.items.filter((it) => it.what !== 'confinement') }))
    .filter((l) => l.items.length > 0);
  if (!layers.length && !report.unknown.length) return null;
  if (isCodexFolderOk(report.projectFolder, oks, platform)) return null;
  return { folderKey: codexFolderKey(report.projectFolder, platform), folder: report.projectFolder, layers, unknown: report.unknown };
}

/** What the window shows for a held Codex start. */
export interface CodexHoldNotice extends CodexHold {
  agentId: string;
  at: number;
}

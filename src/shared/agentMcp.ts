/**
 * Per-agent MCP grants. Floor-wide consent lives in
 * `config.mcpDefaults` (one row per catalog id); `config.agentMcp` holds an
 * OVERRIDE per agent, keyed agent id → catalog id → { enabled }. An agent with
 * no row for a server follows the floor. This module resolves the two into
 * what one agent actually gets, and both main (the launch path) and the
 * renderer (the Capabilities screen, the agent screen) call it, so the
 * picture on screen and the servers in the agent's settings file cannot
 * disagree.
 *
 * WHY THE RESULT IS EXPLICIT FOR EVERY CATALOG ID. hive.ts refuses a write or
 * secret tier server unless its consent is the literal `true` (defence in
 * depth against a missing row). A per-agent grant is a human clicking a
 * switch, the same act as the floor-wide one, so it must arrive at that
 * check as an explicit boolean rather than as "no row, use the default".
 */
import { MCP_CATALOG, type McpCatalogEntry } from './mcpCatalog';

export interface McpConsent { enabled: boolean }
export type McpConsentMap = Record<string, McpConsent>;
export type AgentMcpMap = Record<string, McpConsentMap>;

/** Whether one agent gets one server: its own row, else the floor, else the
 *  catalog default. */
export function mcpEnabledFor(entry: McpCatalogEntry, floor: McpConsentMap | undefined, perAgent: AgentMcpMap | undefined, agentId: string): boolean {
  const own = perAgent?.[agentId]?.[entry.id]?.enabled;
  if (typeof own === 'boolean') return own;
  const floorRow = floor?.[entry.id]?.enabled;
  if (typeof floorRow === 'boolean') return floorRow;
  return entry.defaultEnabled;
}

/** True when the agent has its own row for the server (the switch is not
 *  merely echoing the floor). */
export function hasOwnMcpRow(perAgent: AgentMcpMap | undefined, agentId: string, mcpId: string): boolean {
  return typeof perAgent?.[agentId]?.[mcpId]?.enabled === 'boolean';
}

/** The consent map the launch path hands to hive.ensureAgent for ONE agent:
 *  every catalog id present, every value an explicit boolean. */
export function effectiveMcp(floor: McpConsentMap | undefined, perAgent: AgentMcpMap | undefined, agentId: string, catalog: McpCatalogEntry[] = MCP_CATALOG): McpConsentMap {
  const out: McpConsentMap = {};
  for (const e of catalog) out[e.id] = { enabled: mcpEnabledFor(e, floor, perAgent, agentId) };
  return out;
}

/** The map with one agent's row for one server set, or cleared (`null`) so
 *  the agent follows the floor again. Pure; main persists the result. Empty
 *  agent objects are dropped so the file does not fill with `{}` rows. */
export function withAgentMcp(perAgent: AgentMcpMap | undefined, agentId: string, mcpId: string, enabled: boolean | null): AgentMcpMap {
  const next: AgentMcpMap = { ...(perAgent ?? {}) };
  const row: McpConsentMap = { ...(next[agentId] ?? {}) };
  if (enabled === null) delete row[mcpId];
  else row[mcpId] = { enabled };
  if (Object.keys(row).length === 0) delete next[agentId];
  else next[agentId] = row;
  return next;
}

/** Structural guard for the persisted map: a hand-edited file keeps the rows
 *  that are well formed and drops the rest. */
export function sanitizeAgentMcp(raw: unknown): AgentMcpMap | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: AgentMcpMap = {};
  for (const [agentId, rows] of Object.entries(raw as Record<string, unknown>)) {
    if (!rows || typeof rows !== 'object') continue;
    const clean: McpConsentMap = {};
    for (const [mcpId, v] of Object.entries(rows as Record<string, unknown>)) {
      const enabled = (v as { enabled?: unknown } | null)?.enabled;
      if (typeof enabled === 'boolean') clean[mcpId] = { enabled };
    }
    if (Object.keys(clean).length) out[agentId] = clean;
  }
  return Object.keys(out).length ? out : undefined;
}

/* ---- custom servers (0.5.6, the agent file) -------------------------------- */

/**
 * A server that is NOT in the catalog, kept for one agent in
 * `config.agentCustomMcp`, agent id → server name → server. It arrives in an
 * agent file (shared/agentFile.ts), so every field came from outside.
 *
 * It runs a command on this machine. So it is written into an agent's
 * settings file only on the literal `enabled: true`, the same bar a write or
 * secret catalog server has, and nothing but a person's tick sets that.
 *
 * NO ENV VALUE IS STORED. `envNames` only says which names the server reads;
 * the server inherits the agent's environment, which already holds the
 * office's custom secrets.
 */
export interface AgentCustomMcpServer {
  /** Letters, digits, dash and underscore. */
  name: string;
  command: string;
  args: string[];
  envNames?: string[];
  description?: string;
  enabled: boolean;
}
export type AgentCustomMcpMap = Record<string, Record<string, AgentCustomMcpServer>>;

export const CUSTOM_MCP_NAME_RE = /^[A-Za-z0-9_-]{1,40}$/;
export const CUSTOM_MCP_MAX_PER_AGENT = 8;
export const CUSTOM_MCP_MAX_ARGS = 32;
export const CUSTOM_MCP_MAX_ENV_NAMES = 16;

/** The agent's folder at start, as the catalog's own servers spell it. */
export const MCP_CWD_PLACEHOLDER = '<cwd>';
/** Where an export took out a folder of the machine that made the file. */
export const MCP_PATH_PLACEHOLDER = '<path>';

/** The key a custom server is written under. Every catalog server is
 *  `munder-<id>`, so a key that starts `munder_` can never be one of them,
 *  whatever the server or a later catalog entry is called. */
export function customMcpKey(name: string): string {
  return `munder_custom_${name}`;
}

/** One word of a command line. Engines start a server with no shell, but on
 *  Windows a `.cmd` shim goes through cmd.exe, so nothing that chains a
 *  second command or expands a variable there or in sh is allowed: no
 *  control character, quote, backtick, `$`, `&`, `|`, `;`, `<`, `>`, `^`,
 *  `%` or `!`. The two placeholders above are the only use of `<` and `>`. */
const WORD_RE = /^[^\u0000-\u001f\u007f&|;<>^%!`$"']+$/;
function wordOk(v: unknown, max: number): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > max || v !== v.trim()) return false;
  const bare = v.split(MCP_CWD_PLACEHOLDER).join('').split(MCP_PATH_PLACEHOLDER).join('');
  return bare === '' || WORD_RE.test(bare);
}
const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

/** Why this is not a custom server, in a few words, or null when it is one. */
export function customMcpProblem(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'must be an object';
  const o = raw as Record<string, unknown>;
  // `__proto__` fits the pattern and is no key an object can hold as its own.
  if (typeof o.name !== 'string' || !CUSTOM_MCP_NAME_RE.test(o.name) || o.name === '__proto__') return '"name" must be 1 to 40 letters, digits, dashes or underscores';
  // The command is one word of its own: a server named as a folder of the
  // exporting machine has nothing left to run.
  if (!wordOk(o.command, 200) || (o.command as string).includes(MCP_PATH_PLACEHOLDER) || (o.command as string).includes(MCP_CWD_PLACEHOLDER)) return '"command" must be one plain command, at most 200 characters';
  if (!Array.isArray(o.args) || o.args.length > CUSTOM_MCP_MAX_ARGS) return `"args" must be a list of at most ${CUSTOM_MCP_MAX_ARGS} items`;
  for (const a of o.args) if (!wordOk(a, 400)) return '"args" holds an item that is empty, too long, or has a character a command line may not carry';
  if (o.envNames !== undefined) {
    if (!Array.isArray(o.envNames) || o.envNames.length > CUSTOM_MCP_MAX_ENV_NAMES) return `"envNames" must be a list of at most ${CUSTOM_MCP_MAX_ENV_NAMES} names`;
    for (const n of o.envNames) if (typeof n !== 'string' || !ENV_NAME_RE.test(n)) return '"envNames" holds something that is not an environment name';
  }
  if (o.description !== undefined && (typeof o.description !== 'string' || o.description.length > 300)) return '"description" must be text of at most 300 characters';
  // A value must never ride in beside the names.
  if ('env' in o) return 'a server may name the environment it reads ("envNames") but never carry a value ("env")';
  return null;
}

/** One server rebuilt from its named fields, or null when it is not one.
 *  `enabled` is true only for the literal `true`. */
export function cleanCustomMcp(raw: unknown): AgentCustomMcpServer | null {
  if (customMcpProblem(raw) !== null) return null;
  const o = raw as Record<string, unknown>;
  const envNames = Array.isArray(o.envNames) ? [...new Set(o.envNames as string[])] : [];
  const description = typeof o.description === 'string' ? o.description.trim() : '';
  return {
    name: o.name as string,
    command: o.command as string,
    args: [...(o.args as string[])],
    ...(envNames.length ? { envNames } : {}),
    ...(description ? { description } : {}),
    enabled: o.enabled === true
  };
}

const AGENT_KEY_RE = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,79}$/;

/** Structural guard for the persisted map, like `sanitizeAgentMcp`: the rows
 *  that are well formed stay, the rest are dropped. */
export function sanitizeAgentCustomMcp(raw: unknown): AgentCustomMcpMap | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: AgentCustomMcpMap = {};
  for (const [agentId, rows] of Object.entries(raw as Record<string, unknown>)) {
    if (!AGENT_KEY_RE.test(agentId) || agentId === '__proto__' || !rows || typeof rows !== 'object' || Array.isArray(rows)) continue;
    const clean: Record<string, AgentCustomMcpServer> = {};
    for (const [name, v] of Object.entries(rows as Record<string, unknown>)) {
      if (Object.keys(clean).length >= CUSTOM_MCP_MAX_PER_AGENT) break;
      const server = cleanCustomMcp(v);
      // The key is the name: a row filed under another name is not trusted.
      if (server && server.name === name) clean[name] = server;
    }
    if (Object.keys(clean).length) out[agentId] = clean;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Every custom server one agent holds, on or off, by name. */
export function customMcpOf(map: AgentCustomMcpMap | undefined, agentId: string): AgentCustomMcpServer[] {
  const rows = sanitizeAgentCustomMcp(map)?.[agentId] ?? {};
  return Object.values(rows).sort((a, b) => a.name.localeCompare(b.name));
}

/** What the launch path hands to hive.ensureAgent for ONE agent: only the
 *  servers a person switched on. */
export function enabledCustomMcp(map: AgentCustomMcpMap | undefined, agentId: string): AgentCustomMcpServer[] {
  return customMcpOf(map, agentId).filter((s) => s.enabled === true);
}

/** The map with one agent's server set, or removed (`null`). Pure; main
 *  persists the result. Throws when the server is not well formed or the
 *  agent already holds the most it may. */
export function withAgentCustomMcp(map: AgentCustomMcpMap | undefined, agentId: string, name: string, server: unknown): AgentCustomMcpMap {
  if (!AGENT_KEY_RE.test(agentId) || agentId === '__proto__') throw new Error('invalid agent id');
  if (!CUSTOM_MCP_NAME_RE.test(name) || name === '__proto__') throw new Error('invalid server name');
  const next: AgentCustomMcpMap = { ...(sanitizeAgentCustomMcp(map) ?? {}) };
  const rows: Record<string, AgentCustomMcpServer> = { ...(next[agentId] ?? {}) };
  if (server === null) delete rows[name];
  else {
    const clean = cleanCustomMcp(server);
    if (!clean || clean.name !== name) throw new Error(`invalid custom server: ${customMcpProblem(server) ?? 'the name does not match'}`);
    if (!(name in rows) && Object.keys(rows).length >= CUSTOM_MCP_MAX_PER_AGENT) throw new Error(`an agent holds at most ${CUSTOM_MCP_MAX_PER_AGENT} custom servers`);
    rows[name] = clean;
  }
  if (Object.keys(rows).length === 0) delete next[agentId];
  else next[agentId] = rows;
  return next;
}

/** A custom server as it is written into an agent's settings file: the
 *  folder placeholder becomes the agent's own folder, and no `env` is
 *  written, so the server reads the agent's environment. */
export function customMcpSpec(server: AgentCustomMcpServer, cwd: string): { command: string; args: string[] } {
  return { command: server.command, args: server.args.map((a) => a.split(MCP_CWD_PLACEHOLDER).join(cwd)) };
}

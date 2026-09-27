/**
 * Per-agent MCP grants (PRO phase 3, plan 4.5). Floor-wide consent lives in
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

/** Which of the given agents get a server (the Capabilities "who has it" row). */
export function agentsWithMcp(entry: McpCatalogEntry, agentIds: string[], floor: McpConsentMap | undefined, perAgent: AgentMcpMap | undefined): string[] {
  return agentIds.filter((id) => mcpEnabledFor(entry, floor, perAgent, id));
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

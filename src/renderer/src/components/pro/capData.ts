/**
 * Who has what, for the Capabilities screen. Pure, so test/pro-capabilities
 * can prove the projection. MCP grants resolve through shared/agentMcp.ts
 * (the same function the launch path uses); this file covers the two kinds
 * that carry no grant table of their own and are TRUE BY CONSTRUCTION:
 *
 *  - a skill is a directory the engine discovers, scoped by where it sits
 *    (user: the machine, project: one repo, bundled: shipped with the app),
 *    and only the engine it was written for reads it;
 *  - an engine tool is used by the agents running on it; a memory tool by
 *    every agent while it is installed; a prerequisite by nobody in
 *    particular (it is the floor's, not an agent's).
 *
 * Neither is editable here, and the screen must not pretend otherwise: the
 * avatar row is a fact, not a control.
 */
import type { AgentProvider } from '@shared/agentProvider';

export interface CapAgent { id: string; provider?: AgentProvider; cwd: string }
export interface CapSkill { provider: 'claude' | 'opencode' | 'codex'; scope: 'user' | 'project' | 'bundled'; path: string; /** agent cwds the discovery ran with that produced this skill (project scope) */ foundIn: string[] }
export interface CapTool { id: string; kind: 'prerequisite' | 'memory' | 'engine'; found: boolean }

export function providerOf(a: CapAgent): AgentProvider { return a.provider ?? 'claude'; }

export function agentsForSkill(skill: CapSkill, agents: CapAgent[]): string[] {
  return agents
    .filter((a) => providerOf(a) === skill.provider)
    .filter((a) => skill.scope !== 'project' || skill.foundIn.includes(a.cwd))
    .map((a) => a.id);
}

export function agentsForTool(tool: CapTool, agents: CapAgent[]): string[] {
  if (!tool.found) return [];
  if (tool.kind === 'engine') {
    const provider = tool.id.startsWith('engine:') ? tool.id.slice('engine:'.length) : tool.id;
    return agents.filter((a) => providerOf(a) === provider).map((a) => a.id);
  }
  if (tool.kind === 'memory') return agents.map((a) => a.id);
  return [];
}

/** Local skills are discovered per cwd; the same skill (same path) shows up
 *  once per cwd that can see it. Fold to one row per path, remembering which
 *  cwds found it. */
export function foldSkills<T extends { path: string }>(perCwd: { cwd: string; skills: T[] }[]): (T & { foundIn: string[] })[] {
  const byPath = new Map<string, T & { foundIn: string[] }>();
  for (const { cwd, skills } of perCwd) {
    for (const s of skills) {
      const row = byPath.get(s.path);
      if (row) { if (!row.foundIn.includes(cwd)) row.foundIn.push(cwd); }
      else byPath.set(s.path, { ...s, foundIn: [cwd] });
    }
  }
  return [...byPath.values()];
}

export type CapFilter = 'all' | 'mcp' | 'skills' | 'tools';

export function matches(q: string, ...fields: (string | undefined)[]): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

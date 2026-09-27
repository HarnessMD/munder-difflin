/**
 * THE SIDEBAR AS A STATUS VIEW (0.5.3, features 1 to 4; Snuggly Paws and
 * Teminite, 10 to 12 Sep 2026). People read the sidebar, not the agent screen,
 * to see what everybody is up to, so the list is grouped by project, a row
 * shows three lines of its private note, and the list can be searched by what
 * a note says. This file is the two rules that decide WHICH rows are drawn and
 * under what heading. It draws nothing and imports nothing, so a test takes it
 * directly.
 *
 * "Project" is the folder the person picked when they hired the agent
 * (`Agent.project`, the basename of that folder), NOT the worktree the agent
 * runs in. An isolated agent's `cwd` is `<home>/worktrees/<agent id>`, and
 * grouping by that would give every agent a group of its own.
 */

export interface SidebarAgentLike {
  id: string;
  name: string;
  isGod?: boolean;
  project?: string;
  note?: string;
  description?: string;
  model?: string;
  provider?: string;
}

export interface SidebarGroup<T> {
  /** Stable across renders and sessions: the fold state is kept under it. */
  key: string;
  /** The project folder's name, or '' for agents that have none. */
  label: string;
  agents: T[];
}

/** The heading an agent sits under. Trimmed; an empty one is "no project". */
export function projectOf(agent: SidebarAgentLike): string {
  return (agent.project ?? '').trim();
}

/**
 * Split an ALREADY ORDERED list into the orchestrator and project groups.
 *
 * Order is inherited, never invented: inside a group agents keep the order
 * they came in (most recently used first), and groups appear in the order of
 * their first member, so the project somebody is working in right now is on
 * top. The orchestrator belongs to no project and stays pinned above them all.
 * Agents with no project go last, whatever their recency: a heading that says
 * "no project" should not be the first thing in the list.
 */
export function groupAgentsByProject<T extends SidebarAgentLike>(ordered: readonly T[]): { pinned: T[]; groups: SidebarGroup<T>[] } {
  const pinned: T[] = [];
  const byKey = new Map<string, SidebarGroup<T>>();
  for (const a of ordered) {
    if (a.isGod) { pinned.push(a); continue; }
    const label = projectOf(a);
    const key = label.toLowerCase();
    const g = byKey.get(key);
    if (g) g.agents.push(a);
    else byKey.set(key, { key, label, agents: [a] });
  }
  const groups = [...byKey.values()];
  const named = groups.filter((g) => g.key !== '');
  const orphans = groups.filter((g) => g.key === '');
  return { pinned, groups: [...named, ...orphans] };
}

/** Headings earn their row only when there is something to tell apart. One
 *  project (or none) draws as the flat list it always was. */
export function showsGroupHeadings<T>(groups: readonly SidebarGroup<T>[]): boolean {
  return groups.length > 1;
}

/**
 * Does this agent match what was typed? Every word has to be found, in any of
 * the things a person might remember an agent by: its name, its private note,
 * its project, its job line, its model or its engine. Case is ignored. An
 * empty query matches everyone.
 */
export function matchesAgentSearch(agent: SidebarAgentLike, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = [agent.name, agent.note, agent.project, agent.description, agent.model, agent.provider]
    .map((v) => (v ?? '').toLowerCase()).join('\n');
  return words.every((w) => hay.includes(w));
}

/** The search box is furniture until the list is long enough to lose somebody
 *  in. Below this many agents it is not drawn. */
export const SIDEBAR_SEARCH_FROM = 5;

/**
 * KEEP MY AGENT ORDER (0.5.3, founder 24 Sep 2026): "if a person has set some
 * agents in a particular order then they should stay that way ... there should
 * be a setting that should be not enabled by default ... toggle is on they
 * should be allowed to change the position of agents in the sidebar".
 *
 * Off (the default): the rail orders itself, most recently used first
 * (agentRecency.orderAgents), and rows cannot be dragged.
 * On: the rail draws `config.agentOrder`, a list of agent ids, and only a
 * person's drag or Move up / Move down changes it.
 *
 * The rules, pure so a test takes them directly:
 *   - the orchestrator is pinned first and is never in the list;
 *   - agents in the list keep its order;
 *   - an agent the list has never seen (a new hire) goes after every listed
 *     one, so it lands at the END of its project group;
 *   - an id with no agent any more (archived, removed) is simply not drawn,
 *     and is dropped the next time the list is written;
 *   - the first time the setting is on and there is no list yet, the order on
 *     screen at that moment is frozen as the starting list;
 *   - a move stays inside the agent's project group.
 */

export interface OrderedAgentLike {
  id: string;
  isGod?: boolean;
}

/** The longest list stored; a floor is never near it, a corrupt file might be. */
export const AGENT_ORDER_MAX = 1000;

/** What `config.agentOrder` may hold: unique non empty ids, in order. */
export function normalizeAgentOrder(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of input) {
    if (typeof v !== 'string') continue;
    const id = v.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= AGENT_ORDER_MAX) break;
  }
  return out;
}

/**
 * The manual order over the automatic one. `auto` is the list as the rail
 * would draw it with the setting off; it decides only where agents the saved
 * list does not name go (after the named ones, in their automatic order).
 */
export function applyAgentOrder<T extends OrderedAgentLike>(auto: readonly T[], saved: readonly string[]): T[] {
  const at = new Map(saved.map((id, i) => [id, i]));
  const pinned = auto.filter((a) => a.isGod);
  const named = auto.filter((a) => !a.isGod && at.has(a.id)).sort((a, b) => (at.get(a.id) as number) - (at.get(b.id) as number));
  const fresh = auto.filter((a) => !a.isGod && !at.has(a.id));
  return [...pinned, ...named, ...fresh];
}

/** The list to store for a rail drawn as `groups` (each group's ids, top to
 *  bottom). The orchestrator is never stored: he is pinned by rule. */
export function orderFromGroups(groups: readonly (readonly string[])[]): string[] {
  return normalizeAgentOrder(groups.flat());
}

/** Move `id` to `target` (an index inside its own group, clamped). Returns
 *  the new groups; the input is not mutated. An unknown id changes nothing. */
export function moveInGroup(groups: readonly (readonly string[])[], id: string, target: number): string[][] {
  return groups.map((g) => {
    const from = g.indexOf(id);
    if (from < 0) return [...g];
    const next = g.filter((x) => x !== id);
    const to = Math.max(0, Math.min(next.length, Math.round(target)));
    next.splice(to, 0, id);
    return next;
  });
}

/** Move `id` one step up (-1) or down (+1) inside its group. */
export function moveBy(groups: readonly (readonly string[])[], id: string, delta: -1 | 1): string[][] {
  const g = groups.find((x) => x.includes(id));
  if (!g) return groups.map((x) => [...x]);
  return moveInGroup(groups, id, g.indexOf(id) + delta);
}

/** Whether `id` can go one step that way inside its group. */
export function canMove(groups: readonly (readonly string[])[], id: string, delta: -1 | 1): boolean {
  const g = groups.find((x) => x.includes(id));
  if (!g) return false;
  const i = g.indexOf(id) + delta;
  return i >= 0 && i < g.length;
}

/**
 * Where a dragged row lands, from where its centre is now. `centres` are the
 * resting centres of the group's rows top to bottom, the dragged row's own
 * included at `from`. The answer is the index the row takes in the group.
 */
export function dropIndex(centres: readonly number[], from: number, draggedCentre: number): number {
  let to = 0;
  for (let i = 0; i < centres.length; i++) {
    if (i === from) continue;
    if (draggedCentre > centres[i]) to += 1;
  }
  return to;
}

/**
 * How far each OTHER row slides while one is held over `to`: rows between the
 * old and the new place move by the dragged row's height, the rest stay.
 */
export function shiftFor(i: number, from: number, to: number, height: number): number {
  if (i === from) return 0;
  if (from < to && i > from && i <= to) return -height;
  if (from > to && i >= to && i < from) return height;
  return 0;
}

/**
 * PROJECTS MOVE TOO (founder, batch 3, 25 Sep 2026): with the setting on, a
 * project heading can be dragged among the others. `saved` is
 * `config.projectOrder`, project keys (lower case, as sidebarGroups makes
 * them). Named projects the list does not know keep their automatic place
 * after the known ones; the no project group stays last, as it always is.
 */
export function applyGroupOrder<G extends { key: string }>(groups: readonly G[], saved: readonly string[]): G[] {
  const at = new Map(saved.map((k, i) => [k, i]));
  const named = groups.filter((g) => g.key !== '');
  const known = named.filter((g) => at.has(g.key)).sort((a, b) => (at.get(a.key) as number) - (at.get(b.key) as number));
  const fresh = named.filter((g) => !at.has(g.key));
  return [...known, ...fresh, ...groups.filter((g) => g.key === '')];
}

/**
 * Ordering for agent lists: MOST RECENTLY USED FIRST (founder item 4,
 * 4 Sep 2026). The agent whose last activity is newest leads, so the people
 * you are working with right now sit at the top of the Inbox's YOUR TEAM list
 * and of the sidebar's agent list. Both surfaces call THIS comparator, so the
 * two lists can never disagree about what "recently used" means.
 *
 * The orchestrator is EXEMPT: he is pinned, not ranked. The Inbox draws him
 * as his own card under Ask me and the sidebar keeps him at the head of the
 * list, so `orderAgents` places him first unconditionally and recency only
 * orders everybody else.
 *
 * The recency signal is the activity digest's `ts` (shared/activity.ts), the
 * same epoch ms the rows already show as their time. An agent with no digest
 * yet sorts LAST, ties break by name, so a fresh roster still reads in one
 * deterministic order instead of insertion order.
 *
 * This module is the ordering rule ONLY, kept free of every import (no React,
 * no store) so the comparator is unit-testable on its own, the same reason
 * askMeOrder.ts keeps the ASK ME rule structural.
 */

/** The only shape the ordering needs from an agent. Structural so the test
 *  does not have to construct a whole store Agent. */
export interface AgentOrderLike {
  id: string;
  name: string;
  isGod?: boolean;
}

/** A recency signal as epoch ms, or null when it is missing or unusable.
 *  Never throws: a digest that came back malformed costs that one agent its
 *  position, never the list. */
export function recencyMs(v: number | undefined | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Newest first; an agent with no recency signal sorts after every agent
 *  that has one; two missing signals tie (the caller breaks ties by name). */
export function compareByRecency(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

/**
 * The whole rule in one call: the orchestrator first (pinned, exempt from
 * recency), then everyone else newest-used first, ties and missing signals
 * by name. Returns a new array; the input is never mutated.
 */
export function orderAgents<T extends AgentOrderLike>(
  agents: readonly T[],
  lastUsed: (id: string) => number | undefined | null
): T[] {
  return [...agents].sort((a, b) => {
    if (!!a.isGod !== !!b.isGod) return a.isGod ? -1 : 1;
    const c = compareByRecency(recencyMs(lastUsed(a.id)), recencyMs(lastUsed(b.id)));
    return c !== 0 ? c : a.name.localeCompare(b.name);
  });
}

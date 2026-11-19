/**
 * Which registry agents are LIVE, and why one that is not is not (0.5.8).
 *
 * Until 0.5.7 one flag, `archived`, meant two things. A person's Archive or Stop
 * set it, and so did every terminal that ended on its own and the startup sweep
 * (archiveOrphanedAgents), which marked every agent with no running terminal
 * archived about 20 ms after each launch. The app could not tell a person's
 * choice from that bookkeeping, and a team whose terminals all ended at once (a
 * customer's 15 agents, 28 Oct 2026) stayed archived at every launch after.
 *
 * Now there are two flags:
 *   - `archived`: a PERSON archived or stopped it. Only that holds it back at the
 *     next launch; "Reopen" is the way back.
 *   - `stopped`: it has no terminal right now and nobody chose that (it exited,
 *     crashed, was killed from outside, the breaker stopped it, or the app quit).
 *     It is restored at the next launch like any other.
 *
 * Every place that skipped an archived agent (the breaker, broadcasts, wakes,
 * routing, the roster) skips a stopped one too, through `isLive`. That is what
 * keeps the old flood away: the breaker steering an agent that has no terminal,
 * and every steer landing in god's inbox as a reply god can never clear (#57/#58).
 *
 * Dependency free so the rules are unit testable without Electron or a hive.
 */

export interface LivenessFlags {
  archived?: boolean;
  stopped?: boolean;
}

/** Live: registered, not archived by a person, and not stopped. The one check
 *  every reader uses, so a new flag can never be missed in one of them. */
export function isLive(a: LivenessFlags | null | undefined): boolean {
  return !!a && !a.archived && !a.stopped;
}

/** Why an agent is not started at the next launch although nobody archived it. */
export type RestoreHold = 'crash-loop' | 'guardrail';

/** A run shorter than this that ends on its own counts as a quick exit. */
export const QUICK_EXIT_MS = 2 * 60_000;
/** Quick exits in a row before the automatic restore leaves the agent alone. */
export const QUICK_EXITS_TO_HOLD = 2;

/** The quick exit count after a run that ended on its own: one more for a short
 *  run, back to none for a run that lasted. */
export function nextQuickExits(prev: number | undefined, ranMs: number): number {
  return ranMs < QUICK_EXIT_MS ? (prev ?? 0) + 1 : 0;
}

/** Whether that count is enough to stop restoring the agent on its own. */
export function holdsRestore(quickExits: number): boolean {
  return quickExits >= QUICK_EXITS_TO_HOLD;
}

/**
 * The one time move from the 0.5.7 meaning of `archived` to the 0.5.8 one.
 *
 * A 0.5.7 registry has `archived: true` on every agent without a terminal,
 * because the startup sweep put it there. Read as "a person archived it", that
 * would hold back the whole team at the first 0.5.8 launch. So an archived agent
 * that 0.5.7 did NOT record as ended (restore-gate.json, `ended`) was only swept,
 * and becomes stopped.
 *
 * `ended` alone cannot tell a person from a crash: 0.5.7 wrote it for both, so a
 * team whose terminals all ended in one crash is all in it. The roster can: a
 * person's Archive moves the card to roster `archived`. So an agent whose card
 * is still on the floor (`onFloor`: roster `agents` or `restorable`) becomes
 * stopped whatever `ended` says. One in `ended` with its card off the floor
 * keeps `archived`: 0.5.7 would not have restored it either.
 *
 * Returns the ids to move from archived to stopped. God is never archived, and
 * a temp stays archived: 0.5.7 never recorded a temp's ending, and a temp is
 * never restored.
 */
export function sweptByOldStartup(
  agents: Record<string, LivenessFlags & { role?: string }>,
  godId: string | null,
  endedIn057: readonly string[],
  onFloor: readonly string[] = []
): string[] {
  const ended = new Set(endedIn057);
  const floor = new Set(onFloor);
  return Object.entries(agents)
    .filter(([id, a]) => id !== godId && a.archived === true && (floor.has(id) || !ended.has(id))
      && a.role !== 'temp' && !id.startsWith('worker-'))
    .map(([id]) => id);
}

/** The ids of the cards on the floor in roster.json (`agents` and `restorable`),
 *  for sweptByOldStartup. A card a person archived is in roster `archived` and is
 *  not counted. No roster, or a list that is not one, gives none. */
export function floorCardIds(roster: { agents?: unknown; restorable?: unknown } | null): string[] {
  const ids: string[] = [];
  for (const list of [roster?.agents, roster?.restorable]) {
    if (!Array.isArray(list)) continue;
    for (const c of list) if (c && typeof c === 'object' && typeof (c as { id?: unknown }).id === 'string') ids.push((c as { id: string }).id);
  }
  return ids;
}

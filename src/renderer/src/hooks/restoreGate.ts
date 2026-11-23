/**
 * The launch gate for "restore team" (0.5.5, performance findings item 5:
 * "archived agents get started again").
 *
 * Two stores describe the same team and they can disagree:
 *
 *   - the hive REGISTRY (`registry.json`, owned by main). `teardownPty` marks an
 *     agent archived the moment its PTY dies, for EVERY death: an explicit kill,
 *     the CLI exiting on its own, a crash, a kill from outside the app.
 *   - the renderer ROSTER (`roster.json` + localStorage). It only learns about a
 *     kill the user drove through a button. A PTY that died on its own leaves the
 *     card in place on purpose, so the person can press Restart — see
 *     `teardownPty`, which broadcasts `hive:agentArchived` for temps only, with
 *     the comment "NOT done for regular agents".
 *
 * So an agent whose terminal ended without a button press is archived in the
 * registry and still live in the roster. At the next launch `reconcileWithLivePtys`
 * sees a roster agent with no live PTY, calls it restorable, and the automatic
 * restore starts it again. Observed on this machine: grok-mu1dnzz3 was archived
 * 2026-09-16T09:37:59Z, and roster.json written eight hours later still listed it
 * under `agents`; it was respawned at the next launch, 2026-09-17T06:23:48Z.
 *
 * The rule (Plan H section 4): an agent starts at launch only if BOTH stores say
 * it is live.
 *
 * The registry's half is NOT its `archived` flag. Two different things set that
 * flag: `teardownPty` when a terminal ENDS, and `archiveOrphanedAgents` as
 * bookkeeping at every startup. An agent that was only swept must still restore —
 * the roster says live and the person expects it back. Kevin's replay of
 * log.jsonl over 73 launches, 29 Sep 2026: reading the flag would stop 2 restores
 * that should be stopped and 48 that should not. So the endings are recorded
 * separately, in src/main/restoreGateStore.ts, and `endedInLastSession` here is
 * that list.
 *
 * Structural and dependency-free, like respawnAgent.ts, so the rule is unit
 * testable without Electron, a store or a window.
 */

/** The only field the gate needs from a roster entry. */
export interface GateableAgent {
  id: string;
}

export interface RestoreSplit<T extends GateableAgent> {
  /** Agents both stores agree are live: restore these. */
  restore: T[];
  /** Agents whose terminal ended in the previous session: do not start them,
   *  retire them from the restorable list so the two stores agree and the button
   *  stops offering them.
   *  "Reopen" on the archived row is the deliberate way back. */
  retire: T[];
}

/**
 * Split a restorable list against the registry's archived ids.
 *
 * Order is preserved in both halves: the restorable list is the order the person
 * dragged their cards into, and it is persisted, so a restore must not reshuffle it.
 */
export function splitRestorable<T extends GateableAgent>(
  restorable: readonly T[],
  endedInLastSession: readonly string[]
): RestoreSplit<T> {
  const archived = new Set(endedInLastSession);
  const restore: T[] = [];
  const retire: T[] = [];
  for (const a of restorable) (archived.has(a.id) ? retire : restore).push(a);
  return { restore, retire };
}

/** The two lists a retire rewrites, or `null` when nothing matched (so the caller
 *  can return the store state unchanged and skip both disk writes). */
export interface RetiredLists<T extends GateableAgent> {
  restorable: T[];
  archived: T[];
}

/**
 * Move `ids` off the restorable list and onto the archived one.
 *
 * Moved, not dropped: the row keeps its spawn recipe, so "Reopen" can still bring
 * the agent back deliberately — which is the whole point of the gate. `normalize`
 * clears the live run-state on the way across (the caller owns the Agent shape);
 * an id already on the archived list is replaced by the moved entry rather than
 * duplicated.
 */
export function retireRestorableLists<T extends GateableAgent>(
  restorable: readonly T[],
  archived: readonly T[],
  ids: readonly string[],
  normalize: (agent: T) => T
): RetiredLists<T> | null {
  const drop = new Set(ids);
  const moved = restorable.filter((a) => drop.has(a.id));
  if (!moved.length) return null;
  return {
    restorable: restorable.filter((a) => !drop.has(a.id)),
    archived: [...archived.filter((a) => !drop.has(a.id)), ...moved.map(normalize)]
  };
}

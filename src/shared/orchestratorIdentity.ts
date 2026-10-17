/** Orchestrator's identity before anyone has customized it — the app's own default,
 *  not a magic string sprinkled at every spawn call site. */
export const DEFAULT_ORCHESTRATOR_NAME = 'Michael';

/**
 * Resolve orchestrator's display name for a (re)spawn.
 *
 * `renameAgent()` (`store.ts`) persists a rename straight into `registry.json`
 * via `hive.ts`'s `renameAgent()` — but the orchestrator-spawn effect used to rebuild
 * orchestrator's agent object from scratch with `name: DEFAULT_ORCHESTRATOR_NAME` hardcoded in
 * three places, so a custom name reverted to "Michael" on every app restart
 * even though the registry still had it right. Reading the persisted name
 * back here (instead of hardcoding the default) is what keeps a rename from
 * reverting. Falls back to the default only when nothing has been persisted
 * yet — a fresh hive, or a registry not yet written this run.
 */
export function resolveOrchestratorName(persistedName: string | undefined | null): string {
  const trimmed = persistedName?.trim();
  return trimmed ? trimmed : DEFAULT_ORCHESTRATOR_NAME;
}

/** Ids the orchestrator went by before it was renamed. Mail already on disk, and
 *  agents whose memory predates the rename, still address it by these, so the
 *  router keeps accepting them (and the one-time migration renames state off them). */
export const LEGACY_ORCHESTRATOR_IDS: readonly string[] = ['god'];

/** True when `to` addresses the orchestrator by its current id, a legacy id, or
 *  the "human" proxy alias. */
export function isOrchestratorAddress(to: string, orchestratorId: string): boolean {
  return to === 'human' || to === orchestratorId || LEGACY_ORCHESTRATOR_IDS.includes(to);
}

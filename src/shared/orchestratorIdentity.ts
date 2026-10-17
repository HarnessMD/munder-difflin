/** What the orchestrator is called when neither the user nor the active theme has
 *  said otherwise. The CODE always refers to it as "orchestrator"; this is only
 *  the label people see. */
export const DEFAULT_ORCHESTRATOR_NAME = 'Orchestrator';

/** Longest display name accepted from a theme or a rename. */
export const MAX_DISPLAY_NAME = 40;

/** A usable display name, or null: a trimmed string of 1..MAX_DISPLAY_NAME with no
 *  control characters. Themes are third-party input, so they pass through this. */
export function sanitizeDisplayName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  // eslint-disable-next-line no-control-regex
  return t.length > 0 && t.length <= MAX_DISPLAY_NAME && !/[\u0000-\u001f\u007f]/.test(t) ? t : null;
}

// The name the active theme suggests (`copy.orchestratorName` in its manifest).
// Module state because every consumer of resolveOrchestratorName would otherwise
// need the theme threaded through to it; each process (main, renderer) sets its own.
let themeSuggestedName: string | null = null;
export function setThemeOrchestratorName(name: unknown): void { themeSuggestedName = sanitizeDisplayName(name); }
export function getThemeOrchestratorName(): string | null { return themeSuggestedName; }

/**
 * Resolve orchestrator's display name for a (re)spawn.
 *
 * `renameAgent()` (`store.ts`) persists a rename straight into `registry.json`
 * via `hive.ts`'s `renameAgent()` — but the orchestrator-spawn effect used to rebuild
 * orchestrator's agent object from scratch with `name: DEFAULT_ORCHESTRATOR_NAME` hardcoded in
 * three places, so a custom name reverted to "the orchestrator" on every app restart
 * even though the registry still had it right. Reading the persisted name
 * back here (instead of hardcoding the default) is what keeps a rename from
 * reverting. Falls back to the default only when nothing has been persisted
 * yet — a fresh hive, or a registry not yet written this run.
 */
export function resolveOrchestratorName(
  persistedName: string | undefined | null,
  themeName: string | null = themeSuggestedName
): string {
  // Precedence: the user's own rename, then what the active theme suggests, then the default.
  return sanitizeDisplayName(persistedName) ?? sanitizeDisplayName(themeName) ?? DEFAULT_ORCHESTRATOR_NAME;
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

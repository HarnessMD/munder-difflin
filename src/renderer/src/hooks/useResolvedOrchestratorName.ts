import { useEffect, useState } from 'react';
import { resolveOrchestratorName, setThemeOrchestratorName, DEFAULT_ORCHESTRATOR_NAME } from '@shared/orchestratorIdentity';

const ORCHESTRATOR_ID = 'orchestrator';

/**
 * Orchestrator's persisted display name, for the boot screens shown BEFORE the store
 * has orchestrator's live agent object (so before `agent.name` exists anywhere to
 * read). Reads the registry directly, the same way useHive.ts's spawn effect
 * does, rather than assuming the default — otherwise a renamed orchestrator's own
 * "clocking in" screen would flash the wrong name every launch.
 */
export function useResolvedOrchestratorName(): string {
  const [orchestratorName, setOrchestratorName] = useState(DEFAULT_ORCHESTRATOR_NAME);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      window.cth.hiveRegistry(),
      window.cth.themeOrchestratorName().catch(() => null)
    ]).then(([reg, themeName]) => {
      setThemeOrchestratorName(themeName);
      if (!cancelled) setOrchestratorName(resolveOrchestratorName(reg?.agents?.[ORCHESTRATOR_ID]?.name));
    }).catch(() => { /* keep the default while unknown */ });
    return () => { cancelled = true; };
  }, []);
  return orchestratorName;
}

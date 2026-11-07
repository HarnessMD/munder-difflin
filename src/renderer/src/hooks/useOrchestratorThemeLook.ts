// Ported from Prozzta/guppyos 02d0d50b (MIT).
import { useEffect } from 'react';
import { useStore } from '@/store/store';
import { themeBuilder, themeProjectDefaults } from '@/scene/themes/themeCatalog';
import { orchestratorDefaultLook, readLook } from '@/scene/themes/looks';

/**
 * On a theme-pack floor the orchestrator wears the pack's orchestrator look (projectDefaults.orchestrator) until it has
 * a stored look for that theme. It is stored once, as source 'captain-default', so it is durable and editable like any
 * look; a stored look is never replaced, and the name is never touched (an existing orchestrator keeps its name).
 */
export function useOrchestratorThemeLook(): void {
  const themeId = useStore((s) => s.officeTheme);
  const godId = useStore((s) => s.agents.find((a) => a.isGod)?.id);
  const hasLook = useStore((s) => !!readLook(s.agents.find((a) => a.isGod)?.appearanceByTheme?.[themeId]));
  useEffect(() => {
    if (!godId || hasLook) return;
    const god = useStore.getState().agents.find((a) => a.id === godId);
    const seed = themeProjectDefaults(themeId)?.orchestrator;
    const look = god && seed ? orchestratorDefaultLook(themeBuilder(themeId) ?? undefined, god.appearanceByTheme?.[themeId], seed.appearance) : null;
    if (god && look) useStore.getState().updateAgent(godId, { appearanceByTheme: { ...(god.appearanceByTheme ?? {}), [themeId]: look } });
  }, [themeId, godId, hasLook]);
}

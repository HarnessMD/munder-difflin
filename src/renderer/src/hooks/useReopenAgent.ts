import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import { buildSpawnCommand, inferAgentProvider, tokenizeCommand } from '@/store/config';
import { commandWithModel } from '@shared/liveModel';
import { respawnAgent, rendererRespawnDeps, type RespawnRecipe } from './respawnAgent';
import { reopenArchivedAgent, reopenInFlight, type ReopenOutcome } from './reopenAgent';

/** The saved command, replayed on the model last seen running, like the restore. */
export async function recipeFor(a: Agent): Promise<RespawnRecipe> {
  const provider = inferAgentProvider(a.command, a.provider);
  const cfg = await window.cth.getConfig();
  const command = commandWithModel(a.command, a.model, provider) || buildSpawnCommand(cfg, a.model, provider);
  const [exe, ...args] = tokenizeCommand(command);
  return { provider, exe: exe ?? '', args };
}

/**
 * Reopen for an archived list, in either skin. Per row progress and failure
 * text: a reopen can fail (the CLI is gone, the folder moved), and a button
 * that fails silently reads as broken, so the reason shows on the row.
 */
export function useReopenAgent(): {
  reopen: (a: Agent) => Promise<ReopenOutcome>;
  reopening: string | null;
  errors: Record<string, string>;
} {
  const { t } = useTranslation();
  const addAgent = useStore((s) => s.addAgent);
  const [reopening, setReopening] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const reopen = useCallback(async (a: Agent): Promise<ReopenOutcome> => {
    if (reopenInFlight() !== null) return { outcome: 'busy' };
    setReopening(a.id);
    setErrors((e) => ({ ...e, [a.id]: '' }));
    const r = await reopenArchivedAgent(a, {
      recipe: recipeFor,
      respawn: (x, recipe) => respawnAgent(x, recipe, rendererRespawnDeps),
      addAgent,
      alreadyOpenText: t('commandCenter.alreadyOpen')
    });
    setReopening(null);
    if (r.outcome === 'failed') setErrors((e) => ({ ...e, [a.id]: t('commandCenter.reopenFailed', { error: r.error }) }));
    return r;
  }, [addAgent, t]);
  return { reopen, reopening, errors };
}

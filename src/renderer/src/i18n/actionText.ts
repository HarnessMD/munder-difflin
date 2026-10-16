import type { TFunction } from 'i18next';

/**
 * Display-time map for the FIXED English `agent.action` strings.
 *
 * Producers (store.ts, useHive, usePtyParser, CommandCenterPanel, mockEvents)
 * set `action` to a small set of status literals ('reconnecting…', 'thinking',
 * …). The thought cloud (OfficeFloor liveActivity) and the agent card render
 * that string raw — so without this map every one of them stays English in
 * every locale. Live tool text ('edit App.tsx') and user-prompt words are NOT
 * in this map and keep rendering untouched as the fallback.
 *
 * Keys live in the `agentAction` locale section (same tree in all locales).
 */
const ACTION_KEYS: Record<string, string> = {
  'reconnecting…': 'agentAction.reconnecting',
  'archived': 'agentAction.archived',
  'running the floor': 'agentAction.runningFloor',
  'compacting context': 'agentAction.compacting',
  'resumed': 'agentAction.resumed',
  'thinking': 'agentAction.thinking',
  'idle': 'agentAction.idle',
  'reading inbox': 'agentAction.readingInbox',
  'starting up': 'agentAction.startingUp',
  'revived after sleep': 'agentAction.revived',
  'awaiting': 'agentAction.awaiting',
  'waiting on you': 'agentAction.waitingYou',
  'waiting on god': 'agentAction.waitingGod',
  'heading back to desk': 'agentAction.headingBack',
  'recreating terminal…': 'agentAction.recreating',
  'continuing…': 'agentAction.continuing'
};

/** i18n key for a known action literal, or null for live/free-form text. */
export function actionKey(action: string | undefined | null): string | null {
  if (!action) return null;
  return ACTION_KEYS[action.trim()] ?? null;
}

/** Localize a known action literal; pass anything else through untouched. */
export function localizeAction(t: TFunction, action: string | undefined | null): string {
  const key = actionKey(action);
  if (key) return t(key);
  return (action || '').trim();
}

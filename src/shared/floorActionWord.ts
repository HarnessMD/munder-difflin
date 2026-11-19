/**
 * The app's own words in `agent.action`, for a floor's bubble in the viewer's
 * language. Anything else in there is a live command as the CLI ran it, shown as it is.
 */
const WORDS: ReadonlyMap<string, string> = new Map(Object.entries({
  idle: 'idle',
  'compacting context': 'compacting',
  thinking: 'live.thinking',
  resumed: 'live.resumed',
  'reading inbox': 'live.readingInbox',
  'reading a new message': 'live.readingMessage',
  'starting up': 'live.startingUp',
  'reconnecting…': 'live.reconnecting',
  'breaker cleared': 'live.breakerCleared',
  'revived after sleep': 'live.revivedAfterSleep',
  'started fresh, last session not found': 'live.startedFresh',
  'worktree gone — using base repo': 'live.worktreeGone',
  'worktree gone, using base repo': 'live.worktreeGone',
  spawned: 'live.spawned',
  awaiting: 'live.awaiting',
  'waiting on you': 'live.waitingOnYou',
  'waiting on god': 'live.waitingOnOrchestrator',
  'asking a question': 'live.asking',
  'restarting…': 'live.restarting',
  'continuing…': 'live.continuing',
  'recreating terminal…': 'live.recreatingTerminal'
}));

export function floorActionWord(action: string): { key: string; vars: Record<string, string> } | null {
  const word = WORDS.get(action);
  if (word) return { key: `office.activity.${word}`, vars: {} };
  const using = /^using (.+)$/.exec(action);
  if (using) return { key: 'office.activity.live.using', vars: { tool: using[1] } };
  // The engine's own name, as the restart wrote it.
  const switching = /^switching to (.+)…$/.exec(action);
  return switching ? { key: 'office.activity.live.switchingTo', vars: { engine: switching[1] } } : null;
}

/** `agent.action` as a screen draws it: the app's own words in the viewer's language, a live command as it is. */
export function actionWords(action: string, t: (key: string, vars: Record<string, string>) => string): string {
  const word = floorActionWord(action);
  return word ? t(word.key, word.vars) : action;
}

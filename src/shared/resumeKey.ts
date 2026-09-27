/**
 * Which recorded session should a restarted agent resume?
 *
 * 0.5.3 bug 1. The registry kept ONE session id per agent and trusted it. Two
 * sources write it, the hook payload and the live telemetry sample, and the
 * telemetry source takes the most recent live session under the agent's id. A
 * child process that inherits the agent's telemetry environment is one of those.
 * Measured on a live floor: every busy agent's key flipped A, B, A over and over,
 * and one agent's key pointed for two days at a session with zero tokens and no
 * transcript on disk. Restart in that window and the resume flag is dropped
 * quietly, so the agent comes back empty while the restore says it worked.
 *
 * Three small rules, each pure so it can be tested without a floor:
 *  - keep the displaced keys, so the real session is still findable,
 *  - resume the first key whose transcript actually exists,
 *  - do not let a sample that proves no conversation become the key.
 */

export const SESSION_HISTORY_CAP = 8;

/** The history with `sessionId` moved to the front. Most recent first, no
 *  duplicates (an A, B, A flip must not grow it), bounded. */
export function pushSessionHistory(history: readonly string[] | undefined, sessionId: string | undefined): string[] {
  const prior = history ?? [];
  if (!sessionId) return [...prior];
  return [sessionId, ...prior.filter((s) => s !== sessionId)].slice(0, SESSION_HISTORY_CAP);
}

/** The first candidate whose transcript exists. Undefined when none does:
 *  the caller starts fresh and SAYS so, it never guesses. */
export function pickResumableSession(
  candidates: readonly (string | undefined | null)[],
  exists: (sessionId: string) => boolean
): string | undefined {
  const seen = new Set<string>();
  for (const c of candidates) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    if (exists(c)) return c;
  }
  return undefined;
}

/** Does this usage sample prove a conversation took place in its session? A
 *  session that has moved no tokens at all is a process that started under the
 *  agent's id, not the agent's conversation. */
export function sampleProvesConversation(
  sample: { input: number; output: number; cacheRead: number; cacheCreation: number } | null | undefined
): boolean {
  if (!sample) return false;
  return sample.input + sample.output + sample.cacheRead + sample.cacheCreation > 0;
}

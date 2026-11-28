/**
 * What the season's decorations hear from the input areas. One event so far:
 * the PERSON sent a message. The store cannot tell (the queue also takes work
 * orders, Slack and compact commands, and the Classic input area writes no
 * sent log), so each input area says it at its own send, next to the count it
 * already keeps for telemetry.
 *
 * With the season off nothing listens, and the call returns at once.
 */
type SentListener = (agentId: string) => void;

const sentListeners = new Set<SentListener>();

export function notePersonSent(agentId: string): void {
  if (sentListeners.size === 0) return;
  for (const fn of sentListeners) fn(agentId);
}

export function onPersonSent(fn: SentListener): () => void {
  sentListeners.add(fn);
  return () => { sentListeners.delete(fn); };
}

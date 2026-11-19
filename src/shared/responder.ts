/**
 * The agent that takes an inbound message: `configured` when it is a
 * non-empty id among `activeIds`, else `godId`. A temp value (0.5.6, below) is
 * never an agent's id here, even on a floor with an agent whose id is `temp`.
 */
export function resolveResponder(configured: unknown, activeIds: readonly string[], godId: string): string {
  if (typeof configured !== 'string') return godId;
  const id = configured.trim();
  if (!id || isTempReceiver(id) || !activeIds.includes(id)) return godId;
  return id;
}

/**
 * A TEMP AS THE RECEIVER (0.5.6, founder 10 Oct 2026). The setting stays one
 * string: `temp` hires a temp for each message, `temp:<agent id>` hires one
 * cloned from that agent. The two functions above read either as "not an
 * active agent", so a caller that has not been moved still lands on the
 * orchestrator and never mails an agent named "temp".
 */
export const TEMP_RECEIVER = 'temp';

/** How long an inbound message waits for a free temp slot before the
 *  orchestrator takes it instead. */
export const INBOUND_TEMP_WAIT_MS = 120_000;

/** A temp has one source at most: the agent it is cloned from. */
export type Receiver = { kind: 'agent'; id: string } | { kind: 'temp'; cloneOf?: string };

export function isTempReceiver(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  return s === TEMP_RECEIVER || s.startsWith(`${TEMP_RECEIVER}:`);
}

/** The stored value for a temp receiver, cloned from `cloneOf` when given. */
export function tempReceiverValue(cloneOf?: string): string {
  const id = typeof cloneOf === 'string' ? cloneOf.trim() : '';
  return id ? `${TEMP_RECEIVER}:${id}` : TEMP_RECEIVER;
}

/**
 * Who takes an inbound message. `cloneableIds` are the agents a temp may be
 * cloned from (registered, not archived, not the orchestrator, not the
 * assistant, not a temp); the agent need not be running. A clone of an agent
 * that is not among them is a plain temp, never a lost message.
 */
export function resolveReceiver(configured: unknown, activeIds: readonly string[], cloneableIds: readonly string[], godId: string): Receiver {
  if (isTempReceiver(configured)) {
    const cloneOf = (configured as string).trim().slice(TEMP_RECEIVER.length + 1).trim();
    return cloneOf && cloneableIds.includes(cloneOf) ? { kind: 'temp', cloneOf } : { kind: 'temp' };
  }
  return { kind: 'agent', id: resolveResponder(configured, activeIds, godId) };
}

/** The webhook form of `resolveReceiver`: the endpoint's own value when it has
 *  one, else the webhook default. */
export function resolveWebhookReceiver(endpointTo: unknown, webhookDefault: unknown, activeIds: readonly string[], cloneableIds: readonly string[], godId: string): Receiver {
  const own = typeof endpointTo === 'string' && endpointTo.trim() ? endpointTo : webhookDefault;
  return resolveReceiver(own, activeIds, cloneableIds, godId);
}

/** How many temps one lasting agent may run at once when the setting is unset,
 *  and the most it can be set to. */
export const MAX_TEMPS_PER_AGENT_DEFAULT = 2;
export const MAX_TEMPS_PER_AGENT_MAX = 4;

export function resolveMaxTempsPerAgent(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_TEMPS_PER_AGENT_MAX ? Math.floor(v) : MAX_TEMPS_PER_AGENT_DEFAULT;
}

/** The agents a temp may be cloned from, and the agents that may start a temp. */
export function cloneableIdsOf(agents: readonly { id: string; archived?: boolean; isGod?: boolean; isAssistant?: boolean; role?: string }[]): string[] {
  return agents
    .filter((a) => !a.archived && !a.isGod && !a.isAssistant && a.role !== 'temp' && !a.id.startsWith('worker-'))
    .map((a) => a.id);
}

/**
 * WHO ANSWERS AN INBOUND MESSAGE (0.5.2, founder ruling, Option A).
 *
 * Two channels bring work in from outside the floor: a Slack request and a
 * teammate's message over the relay. Until 0.5.2 each had its own answer,
 * Slack a two way radio (the orchestrator triages, or a temp is hired for
 * every request) and the teammate channel the orchestrator with no choice at
 * all. The ruling is ONE setting covering both the same way: the value is an
 * agent id, unset means the orchestrator, and the person can point it at any
 * active agent.
 *
 * THE FALLBACK IS NOT OPTIONAL. When the configured agent is not active
 * (archived, gone, the send-only assistant, an id nobody has) the message
 * goes to the orchestrator, never nowhere. A setting that could route mail
 * into a closed tab would be a setting that loses mail, which is the one
 * thing an inbound channel must not do. So every caller resolves through
 * this function against the agents that can take mail RIGHT NOW, and the
 * renderer (Slack) and main (teammates) cannot disagree about the rule.
 *
 * Pure and import-free so a test can pin it and both processes can share it.
 */

/** The stored value that means "the orchestrator": nothing. The select in
 *  Settings writes it for the first option, and main stores it as absent, so
 *  an older config.json with no field and a cleared one read the same. */
export const RESPONDER_ORCHESTRATOR = '';

/**
 * The agent that takes an inbound message: `configured` when it is a
 * non-empty id among `activeIds`, else `godId`.
 */
export function resolveResponder(configured: unknown, activeIds: readonly string[], godId: string): string {
  if (typeof configured !== 'string') return godId;
  const id = configured.trim();
  if (!id || !activeIds.includes(id)) return godId;
  return id;
}

/**
 * WHO TAKES A WEBHOOK CALL (0.5.3, settings redesign): the endpoint's own
 * agent when it names one, else the webhook default (`webhookResponder`),
 * resolved by the same rule, so a gone agent is the orchestrator. Shared so
 * main (which sends the work) and the Trigger History tab (which says who has
 * it) cannot disagree.
 */
export function resolveWebhookRecipient(endpointTo: unknown, webhookDefault: unknown, activeIds: readonly string[], godId: string): string {
  const own = typeof endpointTo === 'string' && endpointTo.trim() ? endpointTo : webhookDefault;
  return resolveResponder(own, activeIds, godId);
}

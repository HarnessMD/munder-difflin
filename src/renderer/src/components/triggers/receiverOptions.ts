/**
 * WHO RECEIVES AN INBOUND, AS ONE LIST. Every picker that points an inbound
 * at someone (Slack, the webhook default and each endpoint, a scheduled
 * mission) offers the same choices in the same order: the orchestrator, each
 * agent, "A temp", then "A temp, clone of <agent>" for each agent a temp may
 * be cloned from. The values are the ones main resolves (shared/responder):
 * an agent id, `temp`, `temp:<agent id>`.
 *
 * Pure: no React and no store.
 */
import { TEMP_RECEIVER, cloneableIdsOf, isTempReceiver, resolveReceiver, tempReceiverValue } from '@shared/responder';

export interface ReceiverAgent { id: string; name: string; archived?: boolean; isGod?: boolean; isAssistant?: boolean; role?: string }
export interface ReceiverOption { value: string; label: string }
export interface ReceiverWords { temp: string; cloneOf: (name: string) => string }

/** The two temp labels, read from the locale files. */
export function receiverWords(t: (k: string, o?: Record<string, unknown>) => string): ReceiverWords {
  return {
    temp: t('settings.connections.responder.temp'),
    cloneOf: (name) => t('settings.connections.responder.tempClone', { name })
  };
}

/** The agents an inbound may be pointed at: active, not the orchestrator, not
 *  the send only assistant. The same set main takes mail for. */
export function receiverAgents<A extends ReceiverAgent>(agents: readonly A[]): A[] {
  return agents.filter((a) => !a.isGod && !a.archived && !a.isAssistant);
}

/**
 * The list. `orchestrator` is the first option, with the value that picker
 * stores for it ('' for a responder, 'god' for a mission). `choices` is the
 * agents the picker offers; the clone options always come from `agents`, the
 * whole floor, because an agent that is not running can still be cloned.
 */
export function receiverOptions(
  agents: readonly ReceiverAgent[],
  orchestrator: ReceiverOption,
  words: ReceiverWords,
  choices: readonly ReceiverAgent[] = receiverAgents(agents)
): ReceiverOption[] {
  const cloneable = cloneableIdsOf(agents);
  return [
    orchestrator,
    ...choices.map((a) => ({ value: a.id, label: a.name })),
    { value: TEMP_RECEIVER, label: words.temp },
    ...agents.filter((a) => cloneable.includes(a.id)).map((a) => ({ value: tempReceiverValue(a.id), label: words.cloneOf(a.name) }))
  ];
}

/** The option a saved value selects. A clone of an agent that is gone still
 *  shows as a temp, which is what main starts for it. Any other value that is
 *  not in the list shows as `fallback`. */
export function receiverShown(value: string | null | undefined, options: readonly ReceiverOption[], fallback: string): string {
  const v = typeof value === 'string' ? value : '';
  if (options.some((o) => o.value === v)) return v;
  return isTempReceiver(v) ? TEMP_RECEIVER : fallback;
}

/** The words for a saved temp value: "A temp", or the clone line while that
 *  agent can still be cloned. Undefined when the value is not a temp. */
export function tempReceiverLabel(value: unknown, agents: readonly ReceiverAgent[], words: ReceiverWords): string | undefined {
  const r = resolveReceiver(value, [], cloneableIdsOf(agents), '');
  if (r.kind !== 'temp') return undefined;
  const from = r.cloneOf ? agents.find((a) => a.id === r.cloneOf) : undefined;
  return from ? words.cloneOf(from.name) : words.temp;
}

/** The words for whoever a receiver value points at in a list: the label of
 *  the option it selects, the orchestrator's when it selects none. */
export function receiverLabel(value: string | null | undefined, options: readonly ReceiverOption[]): string {
  const shown = receiverShown(value, options, '');
  return (options.find((o) => o.value === shown) ?? options[0])?.label ?? '';
}

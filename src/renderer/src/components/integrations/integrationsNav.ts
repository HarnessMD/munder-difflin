/**
 * THE ONE DOOR INTO INTEGRATIONS. A place that sends a person to Slack, a
 * webhook or a key opens Integrations with the item it is about already
 * picked: App answers with Settings on its Integrations section. The item rides here,
 * outside React, and the screen takes it once when it mounts, or hears the
 * event when it is already on show, the way inboxIntent.ts hands over a chat.
 */
export const INTEGRATIONS_EVENT = 'cth:open-integrations';

let wanted: string | null = null;

/** Open Integrations, on `item` when given (an item key, integrationsModel.ts). */
export function openIntegrations(item?: string): void {
  wanted = item ?? null;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(INTEGRATIONS_EVENT, { detail: { item: item ?? null } }));
}

/** The item a door asked for, left in place (a render may run twice). */
export function peekWantedIntegration(): string | null {
  return wanted;
}

/** The item a door asked for, taken once. */
export function takeWantedIntegration(): string | null {
  const w = wanted;
  wanted = null;
  return w;
}

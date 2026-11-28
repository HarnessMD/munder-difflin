/**
 * THE ADD INBOUND WEBHOOK FORM (0.5.3 batch 3, founder 25 Sep 2026: an "Add
 * new inbound webhook" button that asks for the webhook type, the request it
 * accepts, the authentication type, the agent it goes to and the prompt added
 * to each event).
 *
 * The form's answers and the endpoint they make, kept pure so a test pins
 * them and the Settings modal stays a view:
 *   - a service (GitHub, Linear, Telegram) signs its own way and posts its
 *     own payload, so its endpoint carries no schema choice and no auth;
 *   - a blank webhook keeps the schema the person gave (it must parse) and
 *     the auth they picked ('header' is the default and is not stored);
 *   - it goes live with the Save that writes it (enabled), like every card in
 *     Connections: nothing reaches it before that Save.
 */
import { DEFAULT_WEBHOOK_SCHEMA, type WebhookAuth, type WebhookSource, type WebhookTrigger } from './triggers';

export interface InboundWebhookForm {
  source: WebhookSource;
  name: string;
  description: string;
  /** The JSON Schema a blank webhook's body is checked against. */
  schema: string;
  auth: WebhookAuth;
  /** Agent id; '' is the default agent. */
  to: string;
  prompt: string;
}

export function blankInboundForm(source: WebhookSource = 'custom', name = ''): InboundWebhookForm {
  return { source, name, description: '', schema: DEFAULT_WEBHOOK_SCHEMA, auth: 'header', to: '', prompt: '' };
}

/** Why the form cannot be added yet, or null. */
export function inboundFormProblem(f: InboundWebhookForm): 'name' | 'schema' | null {
  if (!f.name.trim()) return 'name';
  if (f.source === 'custom') {
    try { JSON.parse(f.schema); } catch { return 'schema'; }
  }
  return null;
}

/** The endpoint the form describes, on top of a fresh one (`newWebhook`). */
export function webhookFromForm(f: InboundWebhookForm, base: WebhookTrigger): WebhookTrigger {
  const custom = f.source === 'custom';
  const out: WebhookTrigger = {
    ...base,
    name: f.name.trim(),
    enabled: true,
    schema: custom && f.schema.trim() ? f.schema : DEFAULT_WEBHOOK_SCHEMA
  };
  if (!custom) out.source = f.source;
  if (custom && f.auth !== 'header') out.auth = f.auth;
  if (f.description.trim()) out.description = f.description.trim();
  if (f.prompt.trim()) out.prompt = f.prompt.trim();
  if (f.to) out.to = f.to;
  return out;
}

/** What the caller sends, for the hint under the auth choice. */
export function authHeaderExample(auth: WebhookAuth): string {
  if (auth === 'bearer') return 'Authorization: Bearer <secret>';
  if (auth === 'hmac') return 'x-md-signature: sha256=<hex HMAC-SHA256 of the body>';
  return 'x-md-webhook-secret: <secret>';
}

/**
 * What a webhook row says about its address (founder retest 25 Sep: "the
 * address takes a while to appear"):
 *   unsaved   not written yet: the address comes after Save
 *   off       switched off: no address is served
 *   ready     the address is there
 *   failed    the last start failed (a port, the tunnel), or it has been
 *             creating for longer than `timeoutMs`: red, with a retry
 *   creating  saved and on, no address yet: a spinner and "Creating address"
 */
export type RowAddressState = 'unsaved' | 'off' | 'creating' | 'ready' | 'failed';
export const ADDRESS_TIMEOUT_MS = 60_000;

export function rowAddressState(r: { saved: boolean; enabled: boolean; url: string; starting: boolean; error?: string; creatingForMs: number }, timeoutMs = ADDRESS_TIMEOUT_MS): RowAddressState {
  if (!r.saved) return 'unsaved';
  if (!r.enabled) return 'off';
  if (r.url) return 'ready';
  if (r.starting) return 'creating';
  if (r.error || r.creatingForMs > timeoutMs) return 'failed';
  return 'creating';
}

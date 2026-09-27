import {
  DEFAULT_CONTEXT_TRIGGER,
  DEFAULT_TRIGGER_MODE,
  DEFAULT_WEBHOOK_SCHEMA,
  type ContextRule,
  type ContextTriggerConfig,
  type WebhookTrigger
} from '@shared/triggers';

/**
 * TRIGGER IPC — the renderer's side of the trigger config surface.
 *
 * Thin on purpose: `window.cth` already types every call (preload bridges
 * `triggers:*`, `webhooks:*` and `org:*`), so this module exists only for the
 * three things a raw invoke does not do — deep-fill a half-written context rule
 * before it reaches a number input, turn a rejected read into "keep what you
 * have" rather than "adopt nothing", and mint a new endpoint in the same shape
 * Settings → Connections mints one.
 */

/** Shape flows from preload's `webhooks:status` handler, derived rather than
 *  retyped (the WorkersTab convention) so it cannot drift from the real reply. */
export type WebhooksStatus = Awaited<ReturnType<typeof window.cth.webhooksStatus>>;

/* ───────────────────────────── context trigger ───────────────────────────── */

function fillRule(partial: Partial<ContextRule> | undefined, fallback: ContextRule): ContextRule {
  return {
    enabled: partial?.enabled ?? fallback.enabled,
    everyMs: typeof partial?.everyMs === 'number' ? partial.everyMs : fallback.everyMs,
    minContextPct: typeof partial?.minContextPct === 'number' ? partial.minContextPct : fallback.minContextPct,
    minContextPctLargeWindow: typeof partial?.minContextPctLargeWindow === 'number'
      ? partial.minContextPctLargeWindow
      : fallback.minContextPctLargeWindow,
    message: typeof partial?.message === 'string' ? partial.message : fallback.message
  };
}

/** Read the context trigger, deep-filled. A half-written sub-object must never
 *  reach the number inputs as `undefined` — React would flip them uncontrolled. */
export async function getContextTrigger(): Promise<ContextTriggerConfig> {
  try {
    const cfg: Partial<ContextTriggerConfig> | null = await window.cth.getContextTrigger();
    return {
      compact: fillRule(cfg?.compact, DEFAULT_CONTEXT_TRIGGER.compact),
      clear: fillRule(cfg?.clear, DEFAULT_CONTEXT_TRIGGER.clear)
    };
  } catch {
    return DEFAULT_CONTEXT_TRIGGER;
  }
}

/** Fire and forget — the controls have already moved, which is the house
 *  pattern for config writes across the Command Center. */
export function setContextTrigger(cfg: ContextTriggerConfig): void {
  void window.cth.setContextTrigger(cfg).catch(() => { /* optimistic */ });
}

/* ─────────────────────────────── webhooks ────────────────────────────────── */

/** `null` on failure, never `[]` — a caller would adopt an empty list and wipe
 *  a perfectly good store mirror over one dropped IPC. */
export async function listWebhooks(): Promise<WebhookTrigger[] | null> {
  try {
    return (await window.cth.listWebhooks()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist and hand back main's canonical list — it sanitises what the renderer
 * sends (trims names, refuses an id that is not URL-safe, forces `enabled: false`
 * on a secretless endpoint), so the saved truth can differ from what was sent.
 */
export async function saveWebhooks(list: WebhookTrigger[]): Promise<WebhookTrigger[] | null> {
  try {
    return (await window.cth.saveWebhooks(list)) ?? null;
  } catch {
    return null;
  }
}

export async function deleteWebhook(id: string): Promise<WebhookTrigger[] | null> {
  try {
    return (await window.cth.deleteWebhook(id)) ?? null;
  } catch {
    return null;
  }
}

export async function webhooksStatus(): Promise<WebhooksStatus> {
  try {
    return await window.cth.webhooksStatus();
  } catch {
    return { running: false, endpoints: [] };
  }
}

/** 256 bits of hex, the shape main mints. Only reached if the mint call fails —
 *  a locally minted secret still persists through `saveWebhooks`, so "add
 *  webhook" never silently hands out a blank credential. */
function localSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function generateWebhookSecret(): Promise<string> {
  try {
    const secret = await window.cth.generateWebhookSecret();
    if (secret) return secret;
  } catch { /* fall through to a local mint */ }
  return localSecret();
}

/**
 * A fresh endpoint. Two deliberate choices, both matched to Settings → Connections
 * so an endpoint made in either surface is the same thing:
 *
 *  - the id shape is `wh-<base36 time>-<rand>`. It becomes a public URL path
 *    segment, so it is stable for the endpoint's whole life (never renumbered on
 *    save) and stays inside main's URL-safe charset.
 *  - it arrives DISABLED. The operator copies the URL and the secret, then opts
 *    in — an endpoint that went live the instant it was created would be open
 *    before anyone had been told the address.
 */
export function newWebhook(secret: string, index: number): WebhookTrigger {
  return {
    id: `wh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: index === 0 ? 'inbound' : `inbound ${index + 1}`,
    secret,
    enabled: false,
    mode: DEFAULT_TRIGGER_MODE,
    schema: DEFAULT_WEBHOOK_SCHEMA,
    createdAt: Date.now(),
    // ON for a NEW endpoint, and left alone on every endpoint that already
    // exists: a caller nobody has vetted yet is the one to hold at arm's
    // length, and quietly changing what a live endpoint sends is not ours to do.
    guardrails: true
  };
}


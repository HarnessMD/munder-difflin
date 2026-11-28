import {
  DEFAULT_CONTEXT_TRIGGER,
  DEFAULT_TRIGGER_MODE,
  DEFAULT_WEBHOOK_SCHEMA,
  type ContextRule,
  type ContextTriggerConfig,
  type WebhookTrigger
} from '@shared/triggers';
import { sanitizeSwitchClear } from '@shared/switchClear';

/**
 * TRIGGER IPC — the renderer's side of the trigger config surface.
 *
 * Thin on purpose: `window.cth` already types every call (preload bridges
 * `triggers:*` and `webhooks:*`), so this module exists only for the
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
  const force = typeof partial?.force === 'boolean' ? partial.force : fallback.force === true;
  return {
    enabled: partial?.enabled ?? fallback.enabled,
    everyMs: typeof partial?.everyMs === 'number' ? partial.everyMs : fallback.everyMs,
    minContextPct: typeof partial?.minContextPct === 'number' ? partial.minContextPct : fallback.minContextPct,
    minContextPctLargeWindow: typeof partial?.minContextPctLargeWindow === 'number'
      ? partial.minContextPctLargeWindow
      : fallback.minContextPctLargeWindow,
    message: typeof partial?.message === 'string' ? partial.message : fallback.message,
    ...(force ? { force: true } : {})
  };
}

/** Whether the last read failed, or a save since it failed: what the screen
 *  shows is then not what is stored. */
let contextReadFailed = false;
/** A save is on its way, and the newest change made since it left, with the
 *  callers waiting on it (a change replaced by a newer one is answered with it). */
let contextSaving = false;
let contextWaiting: { cfg: ContextTriggerConfig; answer: Array<(saved: boolean) => void> } | null = null;

/** Read the context trigger, deep-filled. A half-written sub-object must never
 *  reach the number inputs as `undefined` — React would flip them uncontrolled. */
export async function getContextTrigger(): Promise<ContextTriggerConfig> {
  try {
    const cfg: Partial<ContextTriggerConfig> | null = await window.cth.getContextTrigger();
    contextReadFailed = false;
    return {
      compact: fillRule(cfg?.compact, DEFAULT_CONTEXT_TRIGGER.compact),
      clear: fillRule(cfg?.clear, DEFAULT_CONTEXT_TRIGGER.clear),
      switchClear: sanitizeSwitchClear(cfg?.switchClear, DEFAULT_CONTEXT_TRIGGER.switchClear)
    };
  } catch (e: unknown) {
    contextReadFailed = true;
    console.warn('[triggers] the context trigger could not be read; showing the defaults:', e instanceof Error ? e.message : e);
    return DEFAULT_CONTEXT_TRIGGER;
  }
}

/** Answers whether the rule was saved. The form does not wait for it (its
 *  controls have already moved, the house pattern for config writes across
 *  the Command Center).
 *
 *  Not sent after a read that failed: the screen then shows the defaults, and
 *  a save built on them would overwrite the stored rule. That answers false,
 *  as a failed save does. */
export function setContextTrigger(cfg: ContextTriggerConfig): Promise<boolean> {
  if (contextReadFailed) {
    console.warn('[triggers] not saved: the context trigger was not read, so this change would overwrite the stored one');
    return Promise.resolve(false);
  }
  // One save at a time. A save carries what this form last saw, so a second
  // one sent while the first is on its way would be refused as built on an
  // old read, and lock the form with nothing said. It waits instead, and the
  // newest waiting change is the one sent (each change is the whole rule).
  if (contextSaving) {
    return new Promise((resolve) => {
      contextWaiting = { cfg, answer: [...(contextWaiting?.answer ?? []), resolve] };
    });
  }
  contextSaving = true;
  return window.cth.setContextTrigger(cfg).then(() => true).catch((e: unknown) => {
    // No further save from this screen until it has read again.
    contextReadFailed = true;
    console.warn('[triggers] the context trigger was not saved:', e instanceof Error ? e.message : e);
    return false;
  }).then((saved) => {
    contextSaving = false;
    const next = contextWaiting;
    contextWaiting = null;
    if (next) void setContextTrigger(next.cfg).then((s) => next.answer.forEach((a) => a(s)));
    return saved;
  });
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


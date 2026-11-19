/**
 * ONE WEBHOOK ROW, AS IT MAY BE SAVED (moved here from src/main/index.ts,
 * unchanged): how `webhooks:save` cleans a row. Pure.
 */
import { DEFAULT_TRIGGER_MODE, DEFAULT_WEBHOOK_SCHEMA, githubWebhookEvents, isWebhookAuth, isWebhookSource, type TriggerMode, type WebhookTrigger } from './triggers';

/** Normalise one endpoint coming back from the renderer. Unknown/blank fields
 *  fall back to what is already persisted, so a UI that round-trips a partially
 *  filled row can never blank a live secret or silently widen a mode. */
export function sanitizeWebhookTrigger(raw: unknown, existing: WebhookTrigger[]): WebhookTrigger | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<WebhookTrigger>;
  const id = typeof r.id === 'string' ? r.id.trim() : '';
  // The id is spliced into a public URL path. Restrict it to a boring charset
  // rather than escaping later: no slashes (which would forge a nested route),
  // no encoded traversal, nothing that could make two endpoints alias.
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(id)) return null;
  const prior = existing.find((t) => t.id === id);
  const secret = typeof r.secret === 'string' && r.secret.trim() ? r.secret.trim() : prior?.secret ?? '';
  const mode = isTriggerMode(r.mode) ? r.mode : prior?.mode ?? DEFAULT_TRIGGER_MODE;
  return {
    id,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : prior?.name ?? id,
    secret,
    // A secretless endpoint can never be enabled — it would be an open door.
    enabled: secret ? (typeof r.enabled === 'boolean' ? r.enabled : prior?.enabled ?? false) : false,
    mode,
    schema: typeof r.schema === 'string' && r.schema.trim() ? r.schema : prior?.schema ?? DEFAULT_WEBHOOK_SCHEMA,
    createdAt: typeof r.createdAt === 'number' && r.createdAt > 0 ? r.createdAt : prior?.createdAt ?? Date.now(),
    // 0.4.9 phase 4. Both are OPTIONAL and both fall back to what is already
    // stored, which is the whole migration: an endpoint written before these
    // existed keeps behaving as it did until someone edits it. The prompt is
    // bounded because it rides with EVERY request this endpoint accepts, and an
    // unbounded one would be an unbounded cost per call.
    ...(typeof r.prompt === 'string' ? (r.prompt.trim() ? { prompt: r.prompt.trim().slice(0, WEBHOOK_PROMPT_MAX) } : {}) : (prior?.prompt ? { prompt: prior.prompt } : {})),
    ...(typeof r.guardrails === 'boolean' ? { guardrails: r.guardrails } : (prior?.guardrails ? { guardrails: true } : {})),
    // 0.5.3 (settings redesign): who sends, who answers, and what it is for.
    // Optional and falling back to what is stored, like the two above. `to` is
    // an agent id or nothing; '' from the picker means the webhook default.
    // 0.5.6: it may also be a temp, `temp` or `temp:<agent id>` for a clone.
    ...(isWebhookSource(r.source) ? { source: r.source } : (prior?.source ? { source: prior.source } : {})),
    // Which GitHub deliveries go on. An empty list is none; no list is what is stored.
    ...(Array.isArray(r.events) ? { events: githubWebhookEvents(r.events) } : (prior?.events ? { events: prior.events } : {})),
    ...(typeof r.to === 'string' ? (/^(temp:)?[A-Za-z0-9._-]{1,80}$/.test(r.to.trim()) ? { to: r.to.trim() } : {}) : (prior?.to ? { to: prior.to } : {})),
    ...(typeof r.description === 'string' ? (r.description.trim() ? { description: r.description.trim().slice(0, 200) } : {}) : (prior?.description ? { description: prior.description } : {})),
    // 0.5.3 batch 3: how a custom caller proves itself. 'header' is the
    // default and is not stored.
    ...(isWebhookAuth(r.auth) ? (r.auth === 'header' ? {} : { auth: r.auth }) : (prior?.auth ? { auth: prior.auth } : {}))
  };
}

/** A standing instruction rides with every request the endpoint accepts, so it
 *  is bounded: an unbounded one is an unbounded cost per call. */
export const WEBHOOK_PROMPT_MAX = 2000;

export function isTriggerMode(v: unknown): v is TriggerMode {
  return v === 'strict' || v === 'allow-all' || v === 'communication-only';
}

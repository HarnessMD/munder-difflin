/**
 * WHAT AN AGENT CAN REACH, IN WORDS IT CAN ACT ON (0.5.8).
 *
 * `GET /i` on the broker names ids only. This turns the same records, and the
 * computer's inbound webhooks, into one entry each: its id, its name, its kind
 * (an API the person saved a key for, or a webhook that brings messages in)
 * and what it allows. The
 * broker answers it at `GET /integrations` (main/integrationBroker.ts), and an
 * agent's start brief names the same list in one line (main/hive.ts).
 *
 * NEVER A SECRET. Every field is picked by name from the record, never spread:
 * no key, no secret reference, no auth header or query name, no webhook
 * secret, no webhook address. A base URL holds no
 * userinfo, query or fragment (validateBaseUrl refuses them). Text the person
 * typed (a name, a webhook's description) is cut short and loses its control
 * characters.
 *
 * Pure: no electron, no file, no clock.
 */
import type { IntegrationRecord } from './integrations';

export type IntegrationListKind = 'api' | 'webhook';

export interface IntegrationListEntry {
  id: string;
  name: string;
  kind: IntegrationListKind;
  /** One sentence: what an agent may do with it. */
  allows: string;
  /** How to call it through the broker; absent for a webhook (nothing to call). */
  call?: string;
  /** The address calls go under (an API). */
  base?: string;
  /** A webhook: who its messages go to (an agent id, `god`, or `a new temp`). */
  to?: string;
  /** A webhook: the person's own line about what it is for. */
  about?: string;
}

/** The fields of a webhook the list reads. The secret is not one of them. */
export interface WebhookListInput {
  id: string;
  name: string;
  enabled: boolean;
  source?: string;
  to?: string;
  description?: string;
}

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g;
const clean = (v: unknown, max: number): string => {
  const s = typeof v === 'string' ? v.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim() : '';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

const CALL = (id: string): string => `$MD_BROKER_URL/i/${id}/<path>`;

/** One API, or null when it is off or not an entry at all. */
export function entryForRecord(rec: IntegrationRecord | undefined): IntegrationListEntry | null {
  if (!rec || rec.enabled !== true || typeof rec.id !== 'string' || !rec.id) return null;
  const id = rec.id;
  const name = clean(rec.label, 80) || id;
  const base = typeof rec.baseUrl === 'string' ? rec.baseUrl : '';
  const allows = rec.authType === 'none'
    ? `Calls under ${base}, with no key.`
    : `Calls under ${base}, with the key the person saved; the service decides what that key may do.`;
  return { id, name, kind: 'api', allows, call: CALL(id), base };
}

const SOURCE_NAMES: Record<string, string> = { github: 'GitHub', linear: 'Linear', telegram: 'Telegram' };

/** Who a webhook's messages go to, in words: the agent id, or a new temp. */
function toText(to: string | undefined): string {
  const t = typeof to === 'string' ? to.trim() : '';
  if (!t) return 'god';
  if (t === 'temp' || t.startsWith('temp:')) return 'a new temp';
  return clean(t, 64) || 'god';
}

/** One inbound webhook, or null when it is off. */
export function entryForWebhook(w: WebhookListInput | undefined): IntegrationListEntry | null {
  if (!w || w.enabled !== true || typeof w.id !== 'string' || !w.id) return null;
  const from = SOURCE_NAMES[w.source ?? ''] ?? 'an outside caller';
  const to = toText(w.to);
  const about = clean(w.description, 200);
  return {
    id: w.id,
    name: clean(w.name, 80) || w.id,
    kind: 'webhook',
    allows: `Brings messages in: each request from ${from} reaches ${to} as a hive message with a kanban card. Nothing to call; finish the card and the caller reads its status.`,
    to,
    ...(about ? { about } : {})
  };
}

/** The whole list: the records this agent may reach (on only), then the webhooks (on only). */
export function integrationList(records: ReadonlyArray<IntegrationRecord | undefined>, webhooks: ReadonlyArray<WebhookListInput> = []): IntegrationListEntry[] {
  const out: IntegrationListEntry[] = [];
  const seen = new Set<string>();
  for (const r of records) {
    const e = entryForRecord(r);
    if (e && !seen.has(e.id)) { seen.add(e.id); out.push(e); }
  }
  for (const w of webhooks) {
    const e = entryForWebhook(w);
    if (e) out.push(e);
  }
  return out;
}

const KIND_WORDS: Record<IntegrationListKind, string> = { api: 'API', webhook: 'webhook' };
/** The most entries the start brief names; the route has them all. */
export const BRIEF_MAX_ENTRIES = 12;

/** One line for an agent's start brief: what is live now, and where to ask again. */
export function integrationsBriefLine(entries: ReadonlyArray<IntegrationListEntry>): string {
  const shown = entries.slice(0, BRIEF_MAX_ENTRIES).map((e) => {
    const extra = e.kind === 'webhook' ? `, messages to ${e.to ?? 'god'}` : '';
    return `${e.id} (${e.name}, ${KIND_WORDS[e.kind]}${extra})`;
  });
  const more = entries.length > BRIEF_MAX_ENTRIES ? `; and ${entries.length - BRIEF_MAX_ENTRIES} more` : '';
  const list = shown.length ? `${shown.join('; ')}${more}` : 'none';
  return `LIVE INTEGRATIONS at your start: ${list}. This changes while you run: GET $MD_BROKER_URL/integrations with your broker token lists what is live now and what each allows (section 3 of the capabilities skill says how to call each and what every refusal means).`;
}

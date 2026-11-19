/**
 * THE ACTIVITY TAB OF THE INTEGRATIONS SCREEN (0.5.6, founder 16 Oct 2026:
 * "Option 3, two-pane is good, we should go forward with that").
 *
 * The right pane of an integration has Setup, Who answers and Activity.
 * Activity is the last events of that one integration, newest first, read
 * from the hive's log.jsonl by main (`integrations:activity`). This module is
 * the shape both sides agree on; nothing here touches a disk.
 *
 * A key names one integration:
 *   `slack`                  the Slack connection
 *   `webhook:<id>`           one inbound webhook, by its id
 *   `conn:<id>`              one service connection the agents call, by its id
 *   `secret:<NAME>`          one key or secret, by the env var name agents use
 *
 * An item never carries a value of a key, a token, a password, a message body
 * or a URL with a query: only when, which way, and a coded line of what.
 */
export const ACTIVITY_LIMIT = 50;

export type IntegrationActivityKey = 'slack' | `webhook:${string}` | `conn:${string}` | `secret:${string}`;

/** `in` came to the office, `out` went from it, `error` failed, `info` the rest. */
export type IntegrationActivityKind = 'in' | 'out' | 'error' | 'info';

export interface IntegrationActivityItem {
  /** Epoch ms. */
  at: number;
  kind: IntegrationActivityKind;
  /** What happened, as a code the screen translates: the locale key is
   *  `integrationActivity.<event>`, filled from `params` (e.g. `slackIn`
   *  with {who, where, agent}). */
  event: string;
  /** Plain strings and numbers for the sentence. Never a value of a key, a
   *  token, a password, a message body or a URL with a query. */
  params?: Record<string, string | number>;
  /** The agent involved, when there is one: its id. */
  agentId?: string;
}

const KEY_RE = /^(slack|webhook:[A-Za-z0-9._-]{1,80}|conn:[a-z0-9][a-z0-9-]{0,63}|secret:[A-Z0-9_]{1,64})$/;

export function isIntegrationActivityKey(v: unknown): v is IntegrationActivityKey {
  return typeof v === 'string' && KEY_RE.test(v);
}

/**
 * Every event code an item may carry, with the params its sentence uses. Each
 * code has a sentence under `integrationActivity.<code>` in en, zh-CN and ar.
 * `godName` is i18next's default variable and is never passed.
 */
export const ACTIVITY_EVENT_PARAMS = {
  // Slack. `who` and `where` are Slack ids: main keeps no names for them.
  slackIn: ['who', 'where'],
  slackInDm: ['who'],
  slackInAnon: ['where'],
  slackOut: ['where'],
  slackOutFailed: ['where', 'error'],
  slackStartedPolling: [],
  slackStartedSocket: [],
  slackStartedWebhook: [],
  slackFailed: ['error'],
  slackRefused: ['error'],
  slackStopped: [],
  slackTempNotQueued: [],
  slackConnected: [],
  slackDisconnected: [],
  slackRateLimited: [],
  slackNote: ['detail'],
  slackSetByAgent: ['agent'],
  // An agent's change through its connections folder that was not made.
  agentChangeFailed: ['agent'],
  // One inbound webhook.
  webhookIn: ['agent'],
  webhookInTemp: [],
  webhookHeld: [],
  webhookApproved: ['agent'],
  webhookApprovedTemp: [],
  webhookDeclined: [],
  webhookDone: [],
  webhookRefusedAuth: [],
  webhookRefusedBody: [],
  webhookRefusedSize: [],
  webhookRefusedRate: [],
  webhookError: ['status'],
  webhookAddedByAgent: ['agent'],
  webhookEditedByAgent: ['agent'],
  webhookSecretRotatedByAgent: ['agent'],
  webhookRemovedByAgent: ['agent'],
  // One service connection, called through the integration broker.
  connCall: ['agent', 'method', 'status'],
  connCallFailed: ['agent', 'method', 'status'],
  connUnreachable: ['agent', 'method'],
  connDenied: ['agent'],
  connNoKey: ['agent'],
  connBadRequest: ['agent', 'method'],
  connCallCut: ['agent', 'method'],
  connTestOk: ['status'],
  connTestFailed: ['status'],
  connTestUnreachable: [],
  // One key or secret, read by a running agent.
  secretRead: ['agent'],
  secretMissing: ['agent']
} as const satisfies Record<string, readonly string[]>;

export type IntegrationActivityEvent = keyof typeof ACTIVITY_EVENT_PARAMS;

/** Resolves an agent id to the name the screen shows. */
export type ActivityNameOf = (agentId: string) => string | undefined;

type Raw = Record<string, unknown>;

const SLACK_ID_RE = /^[A-Z0-9]{2,32}$/;
const AGENT_ID_RE = /^[A-Za-z0-9._:-]{1,80}$/;
/** An error as a short code or phrase: no quotes, no braces, so a fragment of
 *  a response body cannot ride along. */
const CODE_RE = /^[A-Za-z0-9_ .:/-]{1,80}$/;
/** A transport line of our own: plain words, numbers and punctuation only. */
const DETAIL_RE = /^[A-Za-z0-9_ .,:;()/+%-]{1,160}$/;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const codeOf = (v: unknown): string => { const s = str(v); return CODE_RE.test(s) ? s : 'unknown'; };
const statusOf = (v: unknown): number | undefined => (typeof v === 'number' && Number.isInteger(v) && v >= 100 && v <= 999 ? v : undefined);
const slackId = (v: unknown): string | undefined => { const s = str(v); return SLACK_ID_RE.test(s) ? s : undefined; };
const methodOf = (v: unknown): string => { const s = str(v); return /^[A-Z]{1,10}$/.test(s) ? s : 'OTHER'; };

function make(at: number, kind: IntegrationActivityKind, event: IntegrationActivityEvent, params?: Record<string, string | number>, agentId?: string): IntegrationActivityItem {
  return { at, kind, event, ...(params && Object.keys(params).length > 0 ? { params } : {}), ...(agentId ? { agentId } : {}) };
}

/** The agent on a line, with the name to show: its registry name, else its id. */
function agentOf(v: unknown, nameOf?: ActivityNameOf): { id: string; name: string } | undefined {
  const id = str(v);
  if (!AGENT_ID_RE.test(id)) return undefined;
  let name: string | undefined;
  try { name = nameOf?.(id); } catch { name = undefined; }
  const shown = typeof name === 'string' ? name.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 60) : '';
  return { id, name: shown || id };
}

/**
 * One log.jsonl line as the item it is for `key`, or null when the line is
 * about something else. Pure. Only fields named here are read, so a value, a
 * body, a header or a query on the line never reaches the screen.
 */
export function activityItemFor(raw: unknown, key: IntegrationActivityKey, nameOf?: ActivityNameOf): IntegrationActivityItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const e = raw as Raw;
  const at = e.ts;
  if (typeof at !== 'number' || !Number.isFinite(at) || at <= 0) return null;
  if (key === 'slack') return slackItem(e, at, nameOf);
  const colon = key.indexOf(':');
  const kind = key.slice(0, colon);
  const id = key.slice(colon + 1);
  if (kind === 'webhook') return webhookItem(e, at, id, nameOf);
  if (kind === 'conn') return connItem(e, at, id, nameOf);
  if (kind === 'secret') return secretItem(e, at, id, nameOf);
  return null;
}

function slackItem(e: Raw, at: number, nameOf?: ActivityNameOf): IntegrationActivityItem | null {
  if (e.kind === 'connections' && e.op === 'slack.set') {
    const agent = agentOf(e.from, nameOf);
    if (!agent) return null;
    return e.ok === true
      ? make(at, 'info', 'slackSetByAgent', { agent: agent.name }, agent.id)
      : make(at, 'error', 'agentChangeFailed', { agent: agent.name }, agent.id);
  }
  if (e.kind !== 'slack') return null;
  const where = slackId(e.channel);
  switch (e.event) {
    case 'message-in': {
      const who = slackId(e.user);
      if (e.place === 'dm' && who) return make(at, 'in', 'slackInDm', { who });
      if (who && where) return make(at, 'in', 'slackIn', { who, where });
      return where ? make(at, 'in', 'slackInAnon', { where }) : null;
    }
    case 'reply-out': return where ? make(at, 'out', 'slackOut', { where }) : null;
    case 'reply-failed': return where ? make(at, 'error', 'slackOutFailed', { where, error: codeOf(e.error) }) : null;
    case 'started':
      if (e.mode === 'polling') return make(at, 'info', 'slackStartedPolling');
      if (e.mode === 'socket') return make(at, 'info', 'slackStartedSocket');
      if (e.mode === 'webhook') return make(at, 'info', 'slackStartedWebhook');
      return null;
    case 'failed': return make(at, 'error', 'slackFailed', { error: codeOf(e.error) });
    case 'refused': return make(at, 'error', 'slackRefused', { error: codeOf(e.error) });
    case 'stopped': return make(at, 'info', 'slackStopped');
    case 'temp-not-queued': return make(at, 'error', 'slackTempNotQueued');
    case 'transport': {
      const line = str(e.line).replace(/^(socket|slack poll):\s*/, '');
      if (!line || line.startsWith('reconnect in')) return null;
      if (line === 'connected') return make(at, 'info', 'slackConnected');
      if (line.startsWith('disconnect')) return make(at, 'info', 'slackDisconnected');
      if (line.startsWith('rate limited')) return make(at, 'info', 'slackRateLimited');
      return DETAIL_RE.test(line) ? make(at, 'info', 'slackNote', { detail: line }) : null;
    }
    default: return null;
  }
}

const WEBHOOK_OPS: Record<string, IntegrationActivityEvent> = {
  'webhook.add': 'webhookAddedByAgent',
  'webhook.edit': 'webhookEditedByAgent',
  'webhook.rotateSecret': 'webhookSecretRotatedByAgent',
  'webhook.remove': 'webhookRemovedByAgent'
};

function webhookItem(e: Raw, at: number, id: string, nameOf?: ActivityNameOf): IntegrationActivityItem | null {
  if (e.webhookId !== id) return null;
  if (e.kind === 'connections') {
    const agent = agentOf(e.from, nameOf);
    const event = typeof e.op === 'string' ? WEBHOOK_OPS[e.op] : undefined;
    if (!agent || !event) return null;
    return e.ok === true
      ? make(at, 'info', event, { agent: agent.name }, agent.id)
      : make(at, 'error', 'agentChangeFailed', { agent: agent.name }, agent.id);
  }
  if (e.kind !== 'webhook-call') return null;
  const temp = e.temp === true;
  const agent = agentOf(e.agentId, nameOf);
  switch (e.outcome) {
    case 'sent':
      if (temp) return make(at, 'in', 'webhookInTemp', undefined, agent?.id);
      return agent ? make(at, 'in', 'webhookIn', { agent: agent.name }, agent.id) : null;
    case 'approved':
      if (temp) return make(at, 'info', 'webhookApprovedTemp', undefined, agent?.id);
      return agent ? make(at, 'info', 'webhookApproved', { agent: agent.name }, agent.id) : null;
    case 'held': return make(at, 'in', 'webhookHeld');
    case 'declined': return make(at, 'info', 'webhookDeclined');
    case 'done': return make(at, 'out', 'webhookDone');
    case 'refused': {
      const status = statusOf(e.status);
      if (status === 401) return make(at, 'error', 'webhookRefusedAuth');
      if (status === 400) return make(at, 'error', 'webhookRefusedBody');
      if (status === 413) return make(at, 'error', 'webhookRefusedSize');
      if (status === 429) return make(at, 'error', 'webhookRefusedRate');
      return status ? make(at, 'error', 'webhookError', { status }) : null;
    }
    default: return null;
  }
}

function connItem(e: Raw, at: number, id: string, nameOf?: ActivityNameOf): IntegrationActivityItem | null {
  if (e.id !== id) return null;
  if (e.kind === 'conn-test') {
    const status = statusOf(e.status);
    if (e.ok === true) return status ? make(at, 'info', 'connTestOk', { status }) : null;
    return status ? make(at, 'error', 'connTestFailed', { status }) : make(at, 'error', 'connTestUnreachable');
  }
  if (e.kind !== 'conn-call') return null;
  const agent = agentOf(e.agentId, nameOf);
  if (!agent) return null;
  const method = methodOf(e.method);
  const status = statusOf(e.status);
  const who = { agent: agent.name };
  switch (e.error) {
    case 'forbidden': return make(at, 'error', 'connDenied', who, agent.id);
    case 'no_secret': return make(at, 'error', 'connNoKey', who, agent.id);
    case 'bad_gateway': return make(at, 'error', 'connUnreachable', { ...who, method }, agent.id);
    case 'bad_request':
    case 'payload_too_large':
    case 'not_found': return make(at, 'error', 'connBadRequest', { ...who, method }, agent.id);
    case 'cut': return make(at, 'error', 'connCallCut', { ...who, method }, agent.id);
    default:
      if (!status) return null;
      return status < 400 && e.error === undefined
        ? make(at, 'out', 'connCall', { ...who, method, status }, agent.id)
        : make(at, 'error', 'connCallFailed', { ...who, method, status }, agent.id);
  }
}

function secretItem(e: Raw, at: number, name: string, nameOf?: ActivityNameOf): IntegrationActivityItem | null {
  if (e.kind !== 'secret-read' || e.name !== name) return null;
  const agent = agentOf(e.agentId, nameOf);
  if (!agent) return null;
  if (e.outcome === 'ok') return make(at, 'out', 'secretRead', { agent: agent.name }, agent.id);
  if (e.outcome === 'not-found') return make(at, 'error', 'secretMissing', { agent: agent.name }, agent.id);
  return null;
}

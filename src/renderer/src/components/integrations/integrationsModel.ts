/**
 * THE INTEGRATIONS SCREEN'S RULES, without React.
 *
 * Everything the office connects to is one list: Slack, each inbound webhook,
 * each service connection the agents call, and every key and secret. This file
 * says what each row's state is, which rows need a look, and what a search
 * finds. The screen (IntegrationsScreen.tsx) reads it.
 *
 * An item is named by a key, the same one the Activity tab asks main for
 * (shared/integrationActivity.ts), plus two for things not made yet:
 *   slack                  the Slack connection
 *   webhook:<id>           one inbound webhook
 *   conn:<id>              one service connection
 *   secret:<ENV NAME>      an AI provider key (by the env var agents read) or
 *                          a custom secret (by its own name)
 *   new:conn:<template>    a connection being added from a template
 *   new:secret             a secret being added
 *   keys                   the Keys and secrets page: every provider key and
 *                          custom secret, listed on the right
 *   providers              the AI providers page
 *   github                 the one GitHub row: its token and its webhook
 *
 * Import free apart from @shared.
 */
import type { RowAddressState } from '@shared/inboundWebhook';

export type IntegrationGroup = 'chat' | 'webhooks' | 'apps' | 'keys';

export const SLACK_ITEM = 'slack';
export const NEW_SECRET_ITEM = 'new:secret';
export const KEYS_ITEM = 'keys';
export const PROVIDERS_ITEM = 'providers';
export const GITHUB_ITEM = 'github';
export const webhookItem = (id: string): string => `webhook:${id}`;
export const connItem = (id: string): string => `conn:${id}`;
export const secretItem = (name: string): string => `secret:${name}`;
export const newConnItem = (templateId: string): string => `new:conn:${templateId}`;

/** What kind of thing a key names, and its id. */
export type ItemRef =
  | { kind: 'slack' }
  | { kind: 'webhook'; id: string }
  | { kind: 'conn'; id: string }
  | { kind: 'secret'; name: string }
  | { kind: 'newConn'; templateId: string }
  | { kind: 'newSecret' }
  | { kind: 'keys' }
  | { kind: 'providers' }
  | { kind: 'github' };

export function itemRef(key: string): ItemRef | null {
  if (key === SLACK_ITEM) return { kind: 'slack' };
  if (key === NEW_SECRET_ITEM) return { kind: 'newSecret' };
  if (key === KEYS_ITEM) return { kind: 'keys' };
  if (key === PROVIDERS_ITEM) return { kind: 'providers' };
  if (key === GITHUB_ITEM) return { kind: 'github' };
  if (key.startsWith('new:conn:') && key.length > 'new:conn:'.length) return { kind: 'newConn', templateId: key.slice('new:conn:'.length) };
  if (key.startsWith('webhook:') && key.length > 'webhook:'.length) return { kind: 'webhook', id: key.slice('webhook:'.length) };
  if (key.startsWith('conn:') && key.length > 'conn:'.length) return { kind: 'conn', id: key.slice('conn:'.length) };
  if (key.startsWith('secret:') && key.length > 'secret:'.length) return { kind: 'secret', name: key.slice('secret:'.length) };
  return null;
}

/** The tone a row's badge wears. */
export type LookTone = 'ok' | 'warn' | 'bad' | 'off';

/* ---- Slack ------------------------------------------------------------------ */

export type SlackCode = 'off' | 'needs' | 'events' | 'live' | 'down' | 'starting';

export interface SlackLookInput {
  on: boolean;
  /** Fields the chosen way still lacks (shared/slackSetup slackMissingFields). */
  missing: readonly string[];
  /** The bridge's last status; null until it has answered. */
  status: { running: boolean; lastError?: string; configError?: string; liveMissing?: readonly string[] } | null;
}

export function slackCode(s: SlackLookInput): SlackCode {
  if (!s.on) return 'off';
  if (s.missing.length) return 'needs';
  if (!s.status) return 'starting';
  if (s.status.running) return s.status.liveMissing?.length ? 'events' : 'live';
  return s.status.lastError || s.status.configError ? 'down' : 'starting';
}

export const SLACK_TONE: Record<SlackCode, LookTone> = { off: 'off', needs: 'warn', events: 'warn', live: 'ok', down: 'bad', starting: 'off' };
const SLACK_ATTN: ReadonlySet<SlackCode> = new Set<SlackCode>(['needs', 'events', 'down']);
export const slackNeedsLook = (c: SlackCode): boolean => SLACK_ATTN.has(c);

/* ---- one inbound webhook --------------------------------------------------- */

export type HookCode = RowAddressState | 'removing';

export const HOOK_TONE: Record<HookCode, LookTone> = { unsaved: 'warn', off: 'off', creating: 'off', ready: 'ok', failed: 'bad', removing: 'warn' };
export const hookNeedsLook = (c: HookCode): boolean => c === 'failed';

/* ---- one service connection ------------------------------------------------- */

export type ConnCode = 'off' | 'needsKey' | 'failed' | 'passed' | 'ready';

export interface ConnLookInput {
  enabled: boolean;
  needsSecret: boolean;
  hasSecret: boolean;
  /** The last Test run on this machine since the app started, if any. */
  test?: { ok: boolean } | null;
}

export function connCode(c: ConnLookInput): ConnCode {
  if (!c.enabled) return 'off';
  if (c.needsSecret && !c.hasSecret) return 'needsKey';
  if (c.test && !c.test.ok) return 'failed';
  if (c.test?.ok) return 'passed';
  return 'ready';
}

export const CONN_TONE: Record<ConnCode, LookTone> = { off: 'off', needsKey: 'warn', failed: 'bad', passed: 'ok', ready: 'ok' };
export const connNeedsLook = (c: ConnCode): boolean => c === 'needsKey' || c === 'failed';

/* ---- keys and secrets -------------------------------------------------------- */

export type KeyCode = 'saved' | 'unset';
export const KEY_TONE: Record<KeyCode, LookTone> = { saved: 'ok', unset: 'off' };

/* ---- search ------------------------------------------------------------------ */

/** Every word of the query is somewhere in the row's words, any case. */
export function matchesQuery(query: string, words: readonly string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = words.join(' ').toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}

/**
 * Which item to show: the one asked for when it exists, else the one already
 * shown when it still exists, else the first that needs a look, else the
 * first row. An item being added (new:) always exists while it is open.
 */
export function pickItem(asked: string | null, current: string | null, keys: readonly string[], needsLook: readonly string[]): string | null {
  const exists = (k: string | null): k is string => !!k && (k.startsWith('new:') || keys.includes(k));
  if (exists(asked)) return asked;
  if (exists(current)) return current;
  return needsLook.find((k) => keys.includes(k)) ?? keys[0] ?? null;
}

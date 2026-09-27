/**
 * GitHub, Linear and Telegram calling a webhook endpoint (0.5.3, the settings
 * redesign; founder 24 Sep 2026: Integrations are "telegram, Linear, Github
 * and an empty webhook config ... triggers the agents whenever an api call
 * comes in").
 *
 * None of the three can send our `x-md-webhook-secret` header or post our
 * `{ message }` body. Each proves itself its own way, with the secret the
 * person pasted into the service:
 *
 *   github    `X-Hub-Signature-256: sha256=<hex HMAC-SHA256 of the raw body>`
 *   linear    `Linear-Signature: <hex HMAC-SHA256 of the raw body>`
 *   telegram  `X-Telegram-Bot-Api-Secret-Token: <the secret itself>`, set by
 *             setWebhook's secret_token
 *
 * and posts its own event, which is turned here into the one message an
 * agent reads. Everything is constant time and length guarded; the secret
 * never leaves this file. Pure apart from node:crypto, so a test can drive it
 * with real signatures.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { WebhookSource } from '../shared/triggers';

export type ServiceSource = Exclude<WebhookSource, 'custom'>;

export function isServiceSource(s: unknown): s is ServiceSource {
  return s === 'github' || s === 'linear' || s === 'telegram';
}

const SIGNATURE_HEADER: Record<ServiceSource, string> = {
  github: 'x-hub-signature-256',
  linear: 'linear-signature',
  telegram: 'x-telegram-bot-api-secret-token'
};

function header(headers: IncomingHttpHeaders, name: string): string | null {
  const v = headers[name];
  return typeof v === 'string' && v ? v : null;
}

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/** Is the service's signature header there at all? Checked before the body
 *  is read, so a caller with nothing to prove never makes us buffer. */
export function hasServiceSignature(source: ServiceSource, headers: IncomingHttpHeaders): boolean {
  return header(headers, SIGNATURE_HEADER[source]) !== null;
}

/** Does the signature match this endpoint's secret for this exact body? */
export function verifyServiceSignature(source: ServiceSource, headers: IncomingHttpHeaders, rawBody: Buffer, secret: string): boolean {
  const got = header(headers, SIGNATURE_HEADER[source]);
  if (!got || !secret) return false;
  if (source === 'telegram') return sameText(got, secret);
  const mac = createHmac('sha256', secret).update(rawBody).digest('hex');
  return sameText(got.trim().toLowerCase(), source === 'github' ? `sha256=${mac}` : mac);
}

/** What one service event becomes. `skip` is an event with nothing for an
 *  agent (GitHub's ping, a Telegram update with no text): answered 200 so the
 *  service does not retry, and nothing is sent anywhere. */
export type ServiceInbound =
  | { skip: true; reason: string }
  | { skip?: false; message: string; title: string; from?: string };

const EXCERPT = 1500;
const cut = (s: unknown, n = EXCERPT): string => {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});

export function inboundFromService(source: ServiceSource, headers: IncomingHttpHeaders, body: unknown): ServiceInbound {
  const b = obj(body);
  if (source === 'telegram') {
    const m = obj(b.message ?? b.edited_message ?? b.channel_post);
    const text = cut(m.text ?? m.caption);
    if (!text) return { skip: true, reason: 'no text' };
    const from = obj(m.from);
    const chat = obj(m.chat);
    const who = (typeof from.username === 'string' && from.username) ? `@${from.username}` : cut(from.first_name, 80) || 'someone';
    const where = cut(chat.title, 80) || (chat.id !== undefined ? `chat ${String(chat.id)}` : '');
    return {
      title: text.length > 60 ? `${text.slice(0, 59)}…` : text,
      from: who,
      message: [`Telegram message from ${who}${where ? ` in ${where}` : ''}:`, text].join('\n')
    };
  }
  if (source === 'github') {
    const event = header(headers, 'x-github-event') ?? 'event';
    if (event === 'ping') return { skip: true, reason: 'ping' };
    const action = typeof b.action === 'string' ? b.action : '';
    const repo = cut(obj(b.repository).full_name, 120);
    const sender = cut(obj(b.sender).login, 80);
    const item = obj(b.pull_request ?? b.issue ?? b.release ?? b.discussion);
    const comment = obj(b.comment);
    const itemTitle = cut(item.title ?? item.name, 200);
    const url = cut(comment.html_url ?? item.html_url ?? obj(b.repository).html_url, 300);
    const text = cut(comment.body ?? item.body);
    const head = `GitHub ${event}${action ? ` (${action})` : ''}${repo ? ` on ${repo}` : ''}`;
    return {
      title: itemTitle ? `${head}: ${itemTitle}`.slice(0, 120) : head,
      ...(sender ? { from: sender } : {}),
      message: [head, itemTitle && `Title: ${itemTitle}`, sender && `By: ${sender}`, url && `Link: ${url}`, text && `\n${text}`].filter(Boolean).join('\n')
    };
  }
  // linear
  const type = typeof b.type === 'string' ? b.type : 'event';
  const action = typeof b.action === 'string' ? b.action : '';
  const data = obj(b.data);
  const ident = cut(data.identifier, 40);
  const itemTitle = cut(data.title ?? obj(data.issue).title, 200);
  const actor = cut(obj(b.actor).name, 80);
  const url = cut(b.url ?? data.url, 300);
  const text = cut(data.body ?? data.description);
  const head = `Linear ${type}${action ? ` (${action})` : ''}${ident ? ` ${ident}` : ''}`;
  return {
    title: itemTitle ? `${head}: ${itemTitle}`.slice(0, 120) : head,
    ...(actor ? { from: actor } : {}),
    message: [head, itemTitle && `Title: ${itemTitle}`, actor && `By: ${actor}`, url && `Link: ${url}`, text && `\n${text}`].filter(Boolean).join('\n')
  };
}

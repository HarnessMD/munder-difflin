/**
 * A SERVICE'S LOGO on the Integrations screen: Slack, Linear, GitHub,
 * monday.com and the other services the app connects to each show their own.
 *
 * `ServiceLogo` draws one logo in a square tile; `logoIdFor` picks the logo
 * for a record the app holds (a connection, a webhook, a key).
 *
 * The brand marks are Simple Icons paths (CC0), copied as data into
 * ./serviceLogoMarks.ts with the version and the licence. Slack, OpenAI and
 * monday.com, which Simple Icons does not carry, draw the logo files in
 * assets/logos. Any other brand it lacks shows its first letter in its
 * colour, never a drawn logo. Google Calendar and Google Drive, the accounts
 * an agent connects, are a letter by design.
 * Webhook is the Classic web icon; REST API and key are generic stroke marks.
 *
 * The tile: square, a 1px inset ring in --cth-ink-300, --cth-paper-200 fill,
 * the mark in its brand colour. A mark too dark for the dark tile lifts by the
 * one rule below, keyed on tokens.css's own :root[data-cth-theme='dark'].
 */
import type { CSSProperties, ReactElement } from 'react';
import { Icon } from '../Icon';
import { BRAND_MARKS, type BrandMark, type BrandMarkId } from './serviceLogoMarks';
import slackLogo from '@/assets/logos/slack.png?url';
import openaiLogo from '@/assets/logos/openai.png?url';
import mondayLogo from '@/assets/logos/monday.png?url';

export type ServiceLogoId =
  | 'slack' | 'github' | 'linear' | 'telegram' | 'jira' | 'confluence' | 'notion' | 'stripe'
  | 'sentry' | 'hubspot' | 'razorpay' | 'monday'
  | 'anthropic' | 'openai' | 'gemini' | 'openrouter' | 'groq'
  | 'gmail' | 'googlecalendar' | 'googledrive'
  | 'webhook' | 'rest' | 'key';

type GenericId = 'webhook' | 'rest' | 'key';

/** Every brand id has a mark: a brand added to ServiceLogoId without one
 *  fails the typecheck here rather than drawing an empty tile. */
const MARKS: Record<Exclude<ServiceLogoId, GenericId>, BrandMark> = BRAND_MARKS;

/** The logo files behind the marks that say `image`. */
const IMAGES: Partial<Record<BrandMarkId, string>> = { slack: slackLogo, openai: openaiLogo, monday: mondayLogo };

const LABEL: Record<ServiceLogoId, string> = {
  slack: 'Slack', github: 'GitHub', linear: 'Linear', telegram: 'Telegram', jira: 'Jira', confluence: 'Confluence',
  notion: 'Notion', stripe: 'Stripe', sentry: 'Sentry', hubspot: 'HubSpot', razorpay: 'Razorpay', monday: 'monday.com',
  anthropic: 'Anthropic', openai: 'OpenAI', gemini: 'Google Gemini', openrouter: 'OpenRouter', groq: 'Groq',
  gmail: 'Gmail', googlecalendar: 'Google Calendar', googledrive: 'Google Drive',
  webhook: 'Webhook', rest: 'REST API', key: 'Key'
};

/** Every id, in the order of the type. */
export const SERVICE_LOGO_IDS = Object.keys(LABEL) as ServiceLogoId[];

export function serviceLogoLabel(id: ServiceLogoId): string {
  return LABEL[id];
}

/** The provider keys the app gives their own rows, by environment name. */
const PROVIDER_ENV: Readonly<Record<string, ServiceLogoId>> = {
  ANTHROPIC_API_KEY: 'anthropic', OPENAI_API_KEY: 'openai', GEMINI_API_KEY: 'gemini',
  GOOGLE_GENERATIVE_AI_API_KEY: 'gemini', OPENROUTER_API_KEY: 'openrouter', GROQ_API_KEY: 'groq'
};
const PROVIDER_IDS: ReadonlySet<string> = new Set(Object.values(PROVIDER_ENV));

/** Words that name a service. Confluence before Jira, as both live on
 *  atlassian.net and only Confluence's path has /wiki. */
const NAMES: ReadonlyArray<readonly [RegExp, ServiceLogoId]> = [
  [/slack/, 'slack'], [/github/, 'github'], [/linear/, 'linear'], [/telegram/, 'telegram'],
  [/confluence|atlassian\.net\/wiki/, 'confluence'], [/jira|atlassian\.net/, 'jira'], [/notion/, 'notion'], [/stripe/, 'stripe'],
  [/sentry/, 'sentry'], [/hubspot|hubapi/, 'hubspot'], [/razorpay/, 'razorpay'], [/monday/, 'monday'],
  [/anthropic/, 'anthropic'], [/openrouter/, 'openrouter'], [/openai/, 'openai'], [/gemini|generativelanguage/, 'gemini'], [/groq/, 'groq'],
  [/gmail|google[- ]mail/, 'gmail'], [/google[- ]calendar/, 'googlecalendar'], [/google[- ]drive/, 'googledrive']
];

/** The logo for what the app holds.
 *  A key: a provider's own row by its environment name; any other secret is
 *  the key mark, whatever it is called.
 *  Anything else: the template id first, then a webhook's source, the label
 *  or name, then the base URL's host and path; nothing named falls back to
 *  the webhook mark for a webhook and the REST mark for the rest. */
export function logoIdFor(x: { kind?: string; templateId?: string; source?: string; label?: string; name?: string; baseUrl?: string; envVar?: string }): ServiceLogoId {
  const kind = (x.kind ?? '').toLowerCase();
  if (x.envVar || kind === 'key' || kind === 'secret') {
    const byEnv = PROVIDER_ENV[(x.envVar ?? '').trim().toUpperCase()];
    if (byEnv) return byEnv;
    return x.templateId && PROVIDER_IDS.has(x.templateId) ? (x.templateId as ServiceLogoId) : 'key';
  }
  for (const words of [x.templateId, x.source, x.label, x.name, urlWords(x.baseUrl)]) {
    const w = (words ?? '').toLowerCase();
    if (!w) continue;
    for (const [re, id] of NAMES) if (re.test(w)) return id;
  }
  return kind === 'webhook' ? 'webhook' : 'rest';
}

function urlWords(url?: string): string {
  if (!url) return '';
  try { const u = new URL(url); return u.hostname + u.pathname; } catch { return ''; }
}

/* ---- dark theme -------------------------------------------------------------- */

function darkFill(m: BrandMark): string {
  return m.dark === 'ink' ? 'var(--cth-ink-900)' : `color-mix(in srgb, ${m.hex} 50%, var(--cth-ink-900))`;
}

/** One rule per lifted mark. The mark's light colour is the svg's `fill`
 *  attribute, which any stylesheet rule outranks, so only dark mode moves. A
 *  black logo file turns white instead. */
export const SERVICE_LOGO_CSS = (Object.keys(MARKS) as BrandMarkId[])
  .filter((id) => MARKS[id].dark)
  .map((id) => (MARKS[id].dark === 'invert'
    ? `:root[data-cth-theme='dark'] [data-service-logo='${id}'] img{filter:invert(1)}`
    : `:root[data-cth-theme='dark'] [data-service-logo='${id}'] svg{fill:${darkFill(MARKS[id])}}`))
  .join('\n');

if (typeof document !== 'undefined' && !document.getElementById('service-logo-style')) {
  const style = document.createElement('style');
  style.id = 'service-logo-style';
  style.textContent = SERVICE_LOGO_CSS;
  document.head.appendChild(style);
}

/* ---- drawing ----------------------------------------------------------------- */

/** Generic marks: 24 grid, 1.7 stroke. */
const GENERIC_PATHS: Record<Exclude<GenericId, 'webhook'>, string> = {
  // A pair of braces: the body of a request.
  rest: 'M8 4c-1.7 0-3 .6-3 2.5v3C5 11 4 12 3 12c1 0 2 1 2 2.5v3C5 19.4 6.3 20 8 20M16 4c1.7 0 3 .6 3 2.5v3c0 1.5 1 2.5 2 2.5-1 0-2 1-2 2.5v3c0 1.9-1.3 2.5-3 2.5',
  // A key: the bow, the shaft and two bits.
  key: 'M8 15m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M10.8 12.2L20 3M17 6l2.5 2.5M14.5 8.5l2 2'
};

function Mark({ id, size }: { id: ServiceLogoId; size: number }): ReactElement {
  if (id === 'webhook') return <Icon name="web" size={Math.max(1, Math.round(size / 16))} />;
  if (id === 'rest' || id === 'key') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" style={{ display: 'block' }}
        fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d={GENERIC_PATHS[id]} />
      </svg>
    );
  }
  const m = MARKS[id];
  const src = m.image ? IMAGES[id] : undefined;
  if (src) return <img src={src} width={size} height={size} alt="" draggable={false} style={{ display: 'block', objectFit: 'contain' }} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" style={{ display: 'block' }} fill={m.hex}>
      {m.path
        ? <path d={m.path} />
        : <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fontSize={19} fontWeight={700}
            style={{ fontFamily: 'var(--cth-font-ui)' }}>{m.initial}</text>}
    </svg>
  );
}

export function ServiceLogo({ id, size = 28, title }: { id: ServiceLogoId; size?: number; title?: string }): ReactElement {
  const label = title ?? LABEL[id];
  const tile: CSSProperties = {
    width: size, height: size, flex: `0 0 ${size}px`, boxSizing: 'border-box',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--cth-paper-200)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', color: 'var(--cth-ink-700)'
  };
  return (
    <span role="img" aria-label={label} data-service-logo={id} style={tile}>
      <Mark id={id} size={Math.round(size * 0.6)} />
    </span>
  );
}

/**
 * API key auth shapes (v0.4.9 phase 6b, founder 3 Sep 2026: "a custom API
 * connection that supports every API key auth shape a real service uses").
 *
 * A registered connection sends ONE credential, and every REST API on the
 * market puts it in one of six places. This module is the only description of
 * those places, and `apiAuthParts` is the only code that turns a configured
 * shape plus a secret into the pieces of a request:
 *
 *   none    nothing is added                     a public API
 *   bearer  Authorization: Bearer <secret>       Stripe, Notion, Sentry, HubSpot
 *   header  <name>: <secret>                     Linear, Anthropic (x-api-key)
 *   prefix  <name>: <word> <secret>              Token, ApiKey, SSWS and friends
 *   query   ?<name>=<secret>                     NewsAPI, OpenWeather, Google
 *   basic   Authorization: Basic b64(user:key)   Jira, Confluence, Twilio, Mailgun
 *
 * Dependency free on purpose: main injects these at forward-time, the renderer
 * draws the shape, and test/pro-049-connections loads the file directly.
 *
 * TWO RULES ABOUT THE SECRET, AND THEY DECIDE THE SHAPE OF THE API.
 *
 *   1. `apiAuthParts` is the ONLY function that is ever handed a secret, and
 *      main is its only caller. Nothing it returns is drawn.
 *   2. `apiAuthPreview` is what the editor draws, and it TAKES NO SECRET. Not
 *      a masked one, not an optional one: the argument does not exist, so no
 *      change to this file or to a caller can put a key on the screen. Both
 *      functions read the same `apiAuthSlot`, so the preview cannot claim a
 *      header the request does not send.
 *
 * An unset secret produces NOTHING. A missing value that reaches a template
 * literal becomes the four-letter string "undefined", which is how a request
 * ends up sending `Authorization: Bearer undefined` and an API answers 401
 * with nobody able to see why.
 */

/** The six shapes, plus the GitHub preset, which is bearer with the two
 *  constant headers the GitHub REST API wants on every call. */
export type ApiAuthMode = 'none' | 'bearer' | 'header' | 'prefix' | 'query' | 'basic' | 'github';

/** A configured shape. Discriminated on `mode`, so the fields a shape needs
 *  travel with it and a shape can never be half configured in a type. */
export type ApiAuth =
  | { mode: 'none' }
  | { mode: 'bearer' }
  /** The secret verbatim under a header the provider names. */
  | { mode: 'header'; header: string }
  /** The secret under a header the provider names, behind a word it names. */
  | { mode: 'prefix'; header: string; prefix: string }
  /** The secret as a query parameter the provider names. */
  | { mode: 'query'; param: string }
  /** HTTP basic: a user (often an email) and the secret as the password. */
  | { mode: 'basic'; user: string }
  | { mode: 'github' };

/** The pieces a shape contributes to one outbound request. Header keys are
 *  lowercase, the way fetch sends them. */
export interface ApiAuthParts {
  headers: Record<string, string>;
  query: Record<string, string>;
}

/** WHERE the credential rides and what wraps it. One description, read by the
 *  request builder and by the preview, so the two cannot disagree. */
export interface ApiAuthSlot {
  where: 'header' | 'query';
  /** Lowercased header name, or the query parameter name as typed. */
  name: string;
  /** Literal text placed in front of the secret. '' when there is none. */
  prefix: string;
  /** Set only for HTTP basic, which folds the user and the secret into one
   *  base64 pair instead of sending the secret as it was typed. */
  basicUser?: string;
}

/** Every mode, in the order the editor lists them: no credential first, then
 *  the shapes in rough order of how often a REST API asks for them. */
export const API_AUTH_MODES: readonly ApiAuthMode[] = ['none', 'bearer', 'header', 'prefix', 'query', 'basic'];

/** The stand-in for a secret in anything a person can read. It is a constant,
 *  so it cannot carry a character, a prefix or a length of the real value. */
export const SECRET_MASK = '****';

/** Headers the GitHub REST API wants on every call. Not credentials: they ride
 *  whether or not a token is stored, which is what makes a public read work. */
export const GITHUB_HEADERS: Readonly<Record<string, string>> = {
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28'
};

/** A header name the app may inject under. */
export const HEADER_NAME_RE = /^[A-Za-z0-9-]{1,64}$/;
/** A query parameter name. Wider than a header: dots and underscores are
 *  common (`api_key`, `key`, `appid`, `auth.token`). */
export const QUERY_PARAM_RE = /^[A-Za-z0-9_.-]{1,64}$/;
/** The word in front of the secret: Token, ApiKey, SSWS, Basic, Bot. One word,
 *  no spaces, because the space is added here. */
export const AUTH_PREFIX_RE = /^[A-Za-z0-9-]{1,32}$/;
/** The basic-auth user. Usually an email, so this is deliberately wide, and
 *  refuses only the colon that separates the pair and anything unprintable. */
export const BASIC_USER_RE = /^[\x21-\x39\x3b-\x7e]([\x20-\x39\x3b-\x7e]{0,126}[\x21-\x39\x3b-\x7e])?$/;

/** True when a secret string actually carries a value. undefined, '' and a
 *  run of spaces are all "no secret", and none of them may reach a request. */
export function hasSecretValue(secret: string | undefined | null): secret is string {
  return typeof secret === 'string' && secret.trim().length > 0;
}

/** The only rendering of a secret this app draws: a constant when one is set,
 *  nothing when one is not. The result never depends on the value. */
export function maskSecret(secret: string | undefined | null): string {
  return hasSecretValue(secret) ? SECRET_MASK : '';
}

/** Where this shape puts its credential, or null when it sends none. */
export function apiAuthSlot(auth: ApiAuth): ApiAuthSlot | null {
  switch (auth.mode) {
    case 'none':
      return null;
    case 'bearer':
    case 'github':
      return { where: 'header', name: 'authorization', prefix: 'Bearer ' };
    case 'header': {
      const name = auth.header.trim().toLowerCase();
      return HEADER_NAME_RE.test(name) ? { where: 'header', name, prefix: '' } : null;
    }
    case 'prefix': {
      const name = auth.header.trim().toLowerCase();
      const word = auth.prefix.trim();
      if (!HEADER_NAME_RE.test(name) || !AUTH_PREFIX_RE.test(word)) return null;
      return { where: 'header', name, prefix: `${word} ` };
    }
    case 'query': {
      const name = auth.param.trim();
      return QUERY_PARAM_RE.test(name) ? { where: 'query', name, prefix: '' } : null;
    }
    case 'basic': {
      const user = auth.user.trim();
      return BASIC_USER_RE.test(user) ? { where: 'header', name: 'authorization', prefix: 'Basic ', basicUser: user } : null;
    }
    default:
      return null;
  }
}

/**
 * The request pieces a configured shape produces. THE function of this module:
 * main hands it a decrypted secret at forward-time and merges the result into
 * the outbound request.
 *
 * Returns empty maps, never a partial header, when the secret is unset or the
 * shape is not configured yet. Nothing here is logged and nothing is returned
 * to a caller outside main.
 */
export function apiAuthParts(auth: ApiAuth, secret: string | undefined | null): ApiAuthParts {
  const constant: Record<string, string> = auth.mode === 'github' ? { ...GITHUB_HEADERS } : {};
  const slot = apiAuthSlot(auth);
  if (!slot || !hasSecretValue(secret)) return { headers: constant, query: {} };
  const value = slot.basicUser !== undefined
    ? `${slot.prefix}${base64Utf8(`${slot.basicUser}:${secret}`)}`
    : `${slot.prefix}${secret}`;
  return slot.where === 'header'
    ? { headers: { ...constant, [slot.name]: value }, query: {} }
    : { headers: constant, query: { [slot.name]: value } };
}

/**
 * The line the editor draws: the shape, with the mask standing where the key
 * goes. THERE IS NO SECRET PARAMETER, by design (see the header of this file).
 *
 * Returns '' when the shape sends nothing, so a caller renders the sentence
 * for "nothing is added" rather than an empty header line.
 */
export function apiAuthPreview(auth: ApiAuth): string {
  const slot = apiAuthSlot(auth);
  if (!slot) return '';
  if (slot.where === 'query') return `?${slot.name}=${SECRET_MASK}`;
  return `${headerCase(slot.name)}: ${slot.prefix}${SECRET_MASK}`;
}

/** Which field of a shape is not filled in yet, or null when it is complete.
 *  A field name, not a sentence: the copy lives in the locale files. */
export function validateApiAuth(auth: ApiAuth): 'header' | 'prefix' | 'param' | 'user' | null {
  switch (auth.mode) {
    case 'header':
      return HEADER_NAME_RE.test(auth.header.trim()) ? null : 'header';
    case 'prefix':
      if (!HEADER_NAME_RE.test(auth.header.trim())) return 'header';
      return AUTH_PREFIX_RE.test(auth.prefix.trim()) ? null : 'prefix';
    case 'query':
      return QUERY_PARAM_RE.test(auth.param.trim()) ? null : 'param';
    case 'basic':
      return BASIC_USER_RE.test(auth.user.trim()) ? null : 'user';
    default:
      return null;
  }
}

/** Header names the way a provider's docs write them (`X-Api-Key`), for
 *  display only. The request always sends the lowercase form. */
export function headerCase(name: string): string {
  return name.split('-').map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join('-');
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** base64 of a UTF-8 string. Hand rolled because this module runs in main
 *  (where Buffer exists), in the renderer (where it does not) and under the
 *  test loader, and HTTP basic needs the same answer in all three. */
export function base64Utf8(input: string): string {
  const bytes: number[] = [];
  for (const ch of input) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 63];
  }
  return out;
}

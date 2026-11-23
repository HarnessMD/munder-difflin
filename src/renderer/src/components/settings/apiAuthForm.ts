/**
 * What the custom API form draws and checks about an auth shape. Main builds
 * the request (shared/integrations.ts); this file never sees a secret.
 * `apiAuthPreview` takes no secret by design, so nothing it returns can put a
 * key on the screen. The name rules are the ones main checks on save.
 */
import { HEADER_NAME_RE } from '@shared/integrations';

export type ApiAuthMode = 'none' | 'bearer' | 'header' | 'prefix' | 'query' | 'basic' | 'github';

export type ApiAuth =
  | { mode: 'none' }
  | { mode: 'bearer' }
  | { mode: 'header'; header: string }
  | { mode: 'prefix'; header: string; prefix: string }
  | { mode: 'query'; param: string }
  | { mode: 'basic'; user: string }
  | { mode: 'github' };

/** Every mode the editor lists: no credential first, then the shapes in rough
 *  order of how often a REST API asks for them. */
export const API_AUTH_MODES: readonly ApiAuthMode[] = ['none', 'bearer', 'header', 'prefix', 'query', 'basic'];

/** The stand in for a secret in anything a person can read. */
const SECRET_MASK = '****';
const AUTH_PREFIX_RE = /^[A-Za-z0-9-]{1,32}$/;
const QUERY_PARAM_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const BASIC_USER_RE = /^[\x21-\x39\x3b-\x7e]{1,128}$/;

/** Header names the way a provider's docs write them (`X-Api-Key`). */
function headerCase(name: string): string {
  return name.split('-').map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join('-');
}

/** The line the editor draws: the shape, with the mask where the key goes.
 *  '' when the shape sends nothing. */
export function apiAuthPreview(auth: ApiAuth): string {
  switch (auth.mode) {
    case 'bearer':
    case 'github':
      return `Authorization: Bearer ${SECRET_MASK}`;
    case 'header': {
      const name = auth.header.trim();
      return HEADER_NAME_RE.test(name) ? `${headerCase(name.toLowerCase())}: ${SECRET_MASK}` : '';
    }
    case 'prefix': {
      const name = auth.header.trim();
      const word = auth.prefix.trim();
      return HEADER_NAME_RE.test(name) && AUTH_PREFIX_RE.test(word) ? `${headerCase(name.toLowerCase())}: ${word} ${SECRET_MASK}` : '';
    }
    case 'query': {
      const name = auth.param.trim();
      return QUERY_PARAM_RE.test(name) ? `?${name}=${SECRET_MASK}` : '';
    }
    case 'basic':
      return BASIC_USER_RE.test(auth.user.trim()) ? `Authorization: Basic ${SECRET_MASK}` : '';
    default:
      return '';
  }
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

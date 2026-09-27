/**
 * Integrations registry — shared schema (Phase 2 foundation).
 *
 * A dependency-free, importable-by-both (main + renderer) module declaring the
 * integration record/template types, their validation, and the v1 reference
 * templates. Mirrors the posture of `src/shared/mcpCatalog.ts`: NO electron / node /
 * UI imports so it can be pulled into the main process, the preload bridge, and the
 * renderer alike.
 *
 * An *integration* is a labeled REST endpoint a user registers ("label it and it's
 * available"). The record carries METADATA ONLY — never the secret value, only a
 * `secretRef` handle into the encrypted secret store (see src/main/integrations.ts).
 * The loopback secret broker (src/main/integrationBroker.ts) is the ONLY place a real
 * secret is materialized, and only at forward-time inside the main process.
 *
 * Relationship to mcpCatalog.ts: that catalog declares STDIO MCP servers; this
 * registry declares HTTP REST endpoints reached through the loopback broker — a
 * complementary transport, not a competing catalog. Where a service overlaps
 * (github/db/email/search) the labels are kept aligned.
 *
 * Full contract: hive/docs/integrations-spec.md.
 */

import {
  apiAuthParts,
  AUTH_PREFIX_RE,
  BASIC_USER_RE,
  HEADER_NAME_RE,
  QUERY_PARAM_RE,
  type ApiAuth,
  type ApiAuthParts
} from './apiAuth';

export { HEADER_NAME_RE } from './apiAuth';

export type IntegrationKind = 'github' | 'custom-rest';

/** How the broker injects credentials when forwarding to the integration's baseUrl.
 *  This is the ONLY auth-injection vocabulary; the secret is supplied by the broker
 *  at forward-time, never stored here. The shapes themselves, and the one function
 *  that turns a shape plus a secret into request pieces, live in ./apiAuth. */
export type IntegrationAuthType =
  | 'none'    // public API — inject nothing
  | 'bearer'  // Authorization: Bearer <secret>
  | 'header'  // <authHeader>: <secret>   (authHeader required)
  | 'prefix'  // <authHeader>: <authPrefix> <secret>   (both required)
  | 'query'   // ?<authQuery>=<secret>   (authQuery required)
  | 'basic'   // Authorization: Basic base64(<authUser>:<secret>)   (authUser required)
  | 'github'; // Authorization: Bearer <secret> + GitHub API headers

/** A registered integration. METADATA ONLY — carries NO secret value, only a
 *  `secretRef` handle. Safe to persist in config.json and cross IPC to the renderer. */
export interface IntegrationRecord {
  /** Stable slug, unique. See SLUG_RE. Also seeds the secretRef (`int:<id>`). */
  id: string;
  /** Human label for the UI (<= 60 chars). */
  label: string;
  /** Preset family — drives default headers and UI affordances. */
  kind: IntegrationKind;
  /** https origin (+ optional base path). The broker forwards <baseUrl>/<path>. A
   *  loopback http origin is allowed only for explicit local custom-rest targets. */
  baseUrl: string;
  /** How the broker injects auth when forwarding upstream. */
  authType: IntegrationAuthType;
  /** REQUIRED iff authType is 'header' or 'prefix' — the header NAME to inject
   *  the secret under. */
  authHeader?: string;
  /** REQUIRED iff authType === 'prefix' — the word in front of the secret
   *  ('Token', 'ApiKey', 'SSWS'). The separating space is added at forward-time. */
  authPrefix?: string;
  /** REQUIRED iff authType === 'query' — the query parameter NAME. */
  authQuery?: string;
  /** REQUIRED iff authType === 'basic' — the user half of the pair. NOT a
   *  secret: the secret is the password half and lives in the secret store. */
  authUser?: string;
  /** HANDLE into the encrypted secret store; NEVER the secret. Present iff
   *  authType !== 'none'. Convention: `int:<id>`. */
  secretRef?: string;
  /** Which template seeded this record (`IntegrationTemplate.idSuggestion`).
   *  Seven shipped templates share the custom-rest KIND, so a record that
   *  remembers only its kind cannot be told from any other custom REST API,
   *  and the editor shows the wrong provider's help. Optional: records written
   *  before v0.4.9 phase 6b do not carry it (see resolveTemplate). */
  templateId?: string;
  /** Consent gate. A worker can reach an integration ONLY when enabled. */
  enabled: boolean;
  /** epoch ms. */
  createdAt: number;
  /** epoch ms. */
  updatedAt: number;
}

/** A preset that seeds an IntegrationRecord. Dwight extends the catalog by appending
 *  to INTEGRATION_TEMPLATES — no broker or registry changes needed. */
export interface IntegrationTemplate {
  kind: IntegrationKind;
  /** Default label (user-editable). */
  label: string;
  /** Default origin. Empty for custom-rest (the user supplies it). */
  baseUrl: string;
  authType: IntegrationAuthType;
  /** For authType 'header' and 'prefix'. */
  authHeader?: string;
  /** For authType 'prefix'. */
  authPrefix?: string;
  /** For authType 'query'. */
  authQuery?: string;
  /** For authType 'basic'. The user half, never the secret. */
  authUser?: string;
  /** UI prompt for the secret field, e.g. "GitHub personal access token". */
  secretLabel?: string;
  /** One line: where to get the secret / what scopes it needs. */
  secretHelp?: string;
  /** https link for the UI. */
  docsUrl?: string;
  /** Default slug seed. */
  idSuggestion: string;
}

/** Integration id: lowercase slug, 2–40 chars, no leading/trailing hyphen. */
export const INTEGRATION_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
export const ALL_AUTH_TYPES: readonly IntegrationAuthType[] = ['none', 'bearer', 'header', 'prefix', 'query', 'basic', 'github'];
export const ALL_KINDS: readonly IntegrationKind[] = ['github', 'custom-rest'];

/** The secretRef handle for an integration id (1:1). */
export function secretRefFor(id: string): string {
  return `int:${id}`;
}

/** True iff this auth type needs a stored secret. */
export function authTypeNeedsSecret(t: IntegrationAuthType): boolean {
  return t !== 'none';
}

/**
 * Validate an integration record (the upsert gate). Mirrors validateHireManifest's
 * style: returns { ok:true } or { ok:false, error }. Fail closed — anything not
 * explicitly allowed is rejected. `createdAt`/`updatedAt` are stamped by the
 * registry, so they are not required on input.
 */
export function validateIntegrationRecord(
  rec: unknown
): { ok: true; value: Omit<IntegrationRecord, 'createdAt' | 'updatedAt'> } | { ok: false; error: string } {
  if (!rec || typeof rec !== 'object') return { ok: false, error: 'record must be an object' };
  const r = rec as Record<string, unknown>;

  const id = typeof r.id === 'string' ? r.id.trim() : '';
  if (!INTEGRATION_SLUG_RE.test(id)) {
    return { ok: false, error: 'id must be a lowercase slug (2–40 chars, a–z 0–9 -, no leading/trailing hyphen)' };
  }
  const label = typeof r.label === 'string' ? r.label.trim() : '';
  if (!label || label.length > 60) return { ok: false, error: 'label is required and must be <= 60 chars' };

  const kind = r.kind as IntegrationKind;
  if (!ALL_KINDS.includes(kind)) return { ok: false, error: `kind must be one of ${ALL_KINDS.join(', ')}` };

  const authType = r.authType as IntegrationAuthType;
  if (!ALL_AUTH_TYPES.includes(authType)) {
    return { ok: false, error: `authType must be one of ${ALL_AUTH_TYPES.join(', ')}` };
  }

  const baseUrl = typeof r.baseUrl === 'string' ? r.baseUrl.trim() : '';
  const urlCheck = validateBaseUrl(baseUrl);
  if (!urlCheck.ok) return { ok: false, error: urlCheck.error };

  // One rule per auth field: it is REQUIRED by the shapes that send it and
  // REFUSED by the ones that do not, so a record cannot carry a header name
  // left over from a shape the user moved away from.
  const field = (key: 'authHeader' | 'authPrefix' | 'authQuery' | 'authUser', wanted: boolean, re: RegExp, what: string):
    { ok: true; value: string | undefined } | { ok: false; error: string } => {
    const raw = typeof r[key] === 'string' ? (r[key] as string).trim() : '';
    if (!wanted) {
      return raw === ''
        ? { ok: true, value: undefined }
        : { ok: false, error: `${key} is not valid for authType '${authType}'` };
    }
    return re.test(raw) ? { ok: true, value: raw } : { ok: false, error: `authType '${authType}' requires ${key} matching ${what}` };
  };

  const h = field('authHeader', authType === 'header' || authType === 'prefix', HEADER_NAME_RE, '[A-Za-z0-9-]{1,64}');
  if (!h.ok) return h;
  const p = field('authPrefix', authType === 'prefix', AUTH_PREFIX_RE, '[A-Za-z0-9-]{1,32}');
  if (!p.ok) return p;
  const q = field('authQuery', authType === 'query', QUERY_PARAM_RE, '[A-Za-z0-9_.-]{1,64}');
  if (!q.ok) return q;
  const u = field('authUser', authType === 'basic', BASIC_USER_RE, 'a printable name without a colon');
  if (!u.ok) return u;

  const templateId = typeof r.templateId === 'string' && INTEGRATION_SLUG_RE.test(r.templateId.trim())
    ? r.templateId.trim()
    : undefined;

  const needsSecret = authTypeNeedsSecret(authType);
  const secretRef = needsSecret ? secretRefFor(id) : undefined;
  const enabled = r.enabled === true;

  return {
    ok: true,
    value: {
      id, label, kind, baseUrl, authType,
      authHeader: h.value, authPrefix: p.value, authQuery: q.value, authUser: u.value,
      secretRef, templateId, enabled
    }
  };
}

/** Validate a baseUrl: https origin (+ optional path), no userinfo, no traversal.
 *  A loopback http origin (127.0.0.1 / [::1] / localhost) is permitted for explicit
 *  local custom-rest targets the user registers. */
export function validateBaseUrl(baseUrl: string): { ok: true; url: URL } | { ok: false; error: string } {
  if (!baseUrl) return { ok: false, error: 'baseUrl is required' };
  let u: URL;
  try {
    u = new URL(baseUrl);
  } catch {
    return { ok: false, error: 'baseUrl must be a valid URL' };
  }
  if (u.username || u.password) return { ok: false, error: 'baseUrl must not contain userinfo' };
  if (u.search || u.hash) return { ok: false, error: 'baseUrl must not contain a query or fragment' };
  if (baseUrl.includes('..')) return { ok: false, error: 'baseUrl must not contain ".."' };
  const isLoopbackHost =
    u.hostname === '127.0.0.1' || u.hostname === '::1' || u.hostname === '[::1]' || u.hostname === 'localhost';
  if (u.protocol === 'https:') return { ok: true, url: u };
  if (u.protocol === 'http:' && isLoopbackHost) return { ok: true, url: u };
  return { ok: false, error: 'baseUrl must be https (http allowed only for 127.0.0.1/localhost)' };
}

/** The record's auth shape, as ./apiAuth describes it. A record stores the
 *  shape flattened over optional columns; this puts it back together so there
 *  is exactly one description of each shape in the app. */
export function apiAuthOf(rec: Pick<IntegrationRecord, 'authType' | 'authHeader' | 'authPrefix' | 'authQuery' | 'authUser'>): ApiAuth {
  switch (rec.authType) {
    case 'bearer': return { mode: 'bearer' };
    case 'github': return { mode: 'github' };
    case 'header': return { mode: 'header', header: rec.authHeader ?? '' };
    case 'prefix': return { mode: 'prefix', header: rec.authHeader ?? '', prefix: rec.authPrefix ?? '' };
    case 'query': return { mode: 'query', param: rec.authQuery ?? '' };
    case 'basic': return { mode: 'basic', user: rec.authUser ?? '' };
    default: return { mode: 'none' };
  }
}

/**
 * Build the upstream request pieces the broker injects when forwarding. Pure — the
 * caller (the broker, in main) passes the already-decrypted secret; this function
 * never reads any store and never logs.
 *
 * Returns BOTH halves: headers to merge (lowercased keys) and query parameters to
 * set on the upstream URL. A caller that merges only the headers silently drops
 * the credential of every query-parameter API, which is a 401 nobody can see.
 */
export function buildAuthRequest(
  rec: Pick<IntegrationRecord, 'authType' | 'authHeader' | 'authPrefix' | 'authQuery' | 'authUser'>,
  secret: string | undefined
): ApiAuthParts {
  return apiAuthParts(apiAuthOf(rec), secret);
}

/**
 * The template a record came from, for the label and the provider's own secret
 * help. NOT a lookup by kind: seven shipped templates share the custom-rest
 * kind, so `templates.find((x) => x.kind === rec.kind)` answers "Custom REST
 * API" for Stripe, Linear, Notion, Jira, Sentry, Confluence and HubSpot alike.
 *
 * Three steps, most specific first, so a record written before templateId
 * existed still finds its provider:
 *   1. the stored templateId
 *   2. an exact baseUrl match inside the same kind
 *   3. the kind, but ONLY when one template claims it, never a guess
 */
export function resolveTemplate(
  templates: readonly IntegrationTemplate[],
  rec: Pick<IntegrationRecord, 'kind' | 'baseUrl'> & { templateId?: string }
): IntegrationTemplate | undefined {
  if (rec.templateId) {
    const byId = templates.find((x) => x.idSuggestion === rec.templateId);
    if (byId) return byId;
  }
  const sameKind = templates.filter((x) => x.kind === rec.kind);
  const byUrl = sameKind.find((x) => x.baseUrl !== '' && x.baseUrl === rec.baseUrl.trim());
  if (byUrl) return byUrl;
  return sameKind.length === 1 ? sameKind[0] : undefined;
}

/**
 * Join an integration baseUrl with a worker-supplied path, confining the result
 * under the baseUrl origin (NOT an open proxy). Returns null if the path would
 * escape the origin (absolute URL, host override, or traversal above the base path).
 * `pathAndQuery` is the part after `/i/<integrationId>/` including any query string.
 */
export function resolveUpstreamUrl(baseUrl: string, pathAndQuery: string): URL | null {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return null;
  }
  // Reject anything that smells like an absolute target or traversal.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(pathAndQuery)) return null; // scheme://...
  if (pathAndQuery.startsWith('//')) return null; // protocol-relative host override
  // Decode the path before the traversal check so an encoded `%2e%2e` is caught too.
  const pathOnly = pathAndQuery.split(/[?#]/)[0];
  let decodedPath: string;
  try { decodedPath = decodeURIComponent(pathOnly); } catch { return null; }
  if (decodedPath.split('/').some((seg) => seg === '..')) return null;

  // Normalize the base path to a directory prefix, then append the worker path.
  const basePath = base.pathname.endsWith('/') ? base.pathname : base.pathname + '/';
  const rel = pathAndQuery.replace(/^\/+/, '');
  let resolved: URL;
  try {
    resolved = new URL(basePath + rel, base.origin);
  } catch {
    return null;
  }
  // Confine: same origin AND the resolved path stays under the base path prefix.
  if (resolved.origin !== base.origin) return null;
  const confinePrefix = base.pathname.endsWith('/') ? base.pathname : base.pathname + '/';
  if (confinePrefix !== '/' && !(resolved.pathname + '/').startsWith(confinePrefix) && resolved.pathname !== base.pathname) {
    return null;
  }
  return resolved;
}

/** v1 reference templates — the two end-to-end references. Dwight appends more here. */
export const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    kind: 'github',
    label: 'GitHub',
    baseUrl: 'https://api.github.com',
    authType: 'github',
    secretLabel: 'GitHub personal access token',
    secretHelp: 'Create a fine-grained or classic PAT at github.com/settings/tokens with the scopes your workers need.',
    docsUrl: 'https://docs.github.com/rest',
    idSuggestion: 'github'
  },
  {
    kind: 'custom-rest',
    label: 'Custom REST API',
    baseUrl: '',
    authType: 'bearer',
    secretLabel: 'API key / token',
    secretHelp: 'Point baseUrl at any REST API, then pick how it wants the key: a bearer token, a header you name, a header with a prefix word, a query parameter, HTTP basic, or none.',
    idSuggestion: 'my-api'
  },

  // ─── First-wave YC tools (Dwight, P2) ───────────────────────────────────────
  // Per-tool auth model + high-value endpoint catalog: hive/docs/integration-templates.md.
  // Gmail / Google Calendar / Salesforce are intentionally NOT registered yet: they
  // authenticate via OAuth, and IntegrationAuthType has no `oauth2` (OAuth refresh is a
  // v1 non-goal — spec §8). They are documented under "Pending: OAuth broker".
  {
    kind: 'custom-rest',
    label: 'Linear',
    baseUrl: 'https://api.linear.app/graphql',
    authType: 'header',
    authHeader: 'Authorization',
    secretLabel: 'Linear API key',
    secretHelp: 'Linear → Settings → Security & access → Personal API keys. Sent verbatim in Authorization (no "Bearer"). Every call POSTs to /graphql.',
    docsUrl: 'https://developers.linear.app/docs/graphql/working-with-the-graphql-api',
    idSuggestion: 'linear'
  },
  {
    kind: 'custom-rest',
    label: 'Jira',
    baseUrl: 'https://your-domain.atlassian.net/rest/api/3',
    authType: 'header',
    authHeader: 'Authorization',
    secretLabel: 'Authorization header (Basic …)',
    secretHelp: 'Basic auth: paste "Basic " + base64("<email>:<api-token>"). Token at id.atlassian.com → Security → API tokens. Replace your-domain with your Atlassian site.',
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/',
    idSuggestion: 'jira'
  },
  {
    kind: 'custom-rest',
    label: 'Notion',
    baseUrl: 'https://api.notion.com/v1',
    authType: 'bearer',
    secretLabel: 'Notion internal integration token',
    secretHelp: 'notion.so/my-integrations → Internal Integration Secret; share target pages/DBs with it. Every request also needs header "Notion-Version: 2022-06-28" (worker sends it per request).',
    docsUrl: 'https://developers.notion.com/reference/intro',
    idSuggestion: 'notion'
  },
  {
    kind: 'custom-rest',
    label: 'Stripe',
    baseUrl: 'https://api.stripe.com/v1',
    authType: 'bearer',
    secretLabel: 'Stripe secret key',
    secretHelp: 'dashboard.stripe.com → Developers → API keys → Secret key (sk_live_/sk_test_). Restricted keys recommended. Bodies are form-encoded, not JSON.',
    docsUrl: 'https://stripe.com/docs/api',
    idSuggestion: 'stripe'
  },
  {
    kind: 'custom-rest',
    label: 'Confluence',
    baseUrl: 'https://your-domain.atlassian.net/wiki/api/v2',
    authType: 'header',
    authHeader: 'Authorization',
    secretLabel: 'Authorization header (Basic …)',
    secretHelp: 'Basic auth: paste "Basic " + base64("<email>:<api-token>") (same Atlassian token as Jira). Replace your-domain with your site.',
    docsUrl: 'https://developer.atlassian.com/cloud/confluence/rest/v2/intro/',
    idSuggestion: 'confluence'
  },
  {
    kind: 'custom-rest',
    label: 'Sentry',
    baseUrl: 'https://sentry.io/api/0',
    authType: 'bearer',
    secretLabel: 'Sentry auth token',
    secretHelp: 'sentry.io → Settings → Auth Tokens. Org-scoped routes carry your org slug in the path, e.g. /organizations/<org>/issues/.',
    docsUrl: 'https://docs.sentry.io/api/',
    idSuggestion: 'sentry'
  },
  {
    kind: 'custom-rest',
    label: 'HubSpot',
    baseUrl: 'https://api.hubapi.com',
    authType: 'bearer',
    secretLabel: 'HubSpot private app token',
    secretHelp: 'HubSpot → Settings → Integrations → Private Apps → create app → Access token (scopes crm.objects.*).',
    docsUrl: 'https://developers.hubspot.com/docs/api/crm/understanding-the-crm',
    idSuggestion: 'hubspot'
  }
];

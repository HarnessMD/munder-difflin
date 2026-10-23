/**
 * Default MCP server catalog (Workstream 3). A dependency-free, importable-by-both
 * (main + renderer) registry of the MCP servers Munder Difflin can wire into each
 * agent's per-session `settings.json`. Keep it free of electron/UI/node imports.
 *
 * Tiers gate consent:
 *   - 'safe-readonly' → no secret or state-changing tools; shipped ON by default.
 *   - 'write'         → can mutate state, including within the workspace; OFF by default,
 *                       consent-gated.
 *   - 'secret'        → needs an API key / token / connection string; OFF by default,
 *                       consent-gated.
 *
 * The actual merge (catalog ∩ enabled, cwd-scoping of filesystem/git, id namespacing,
 * non-fatal resolution) is Workstream 3's `buildDefaultMcpServers`/`hookSettings`
 * job — this module only declares the entries, their tiers, and the seed defaults.
 *
 * NOTE: several reference servers ship as Python (uvx) rather than npm (npx). The
 * commands below reflect each server's real transport; entries that couldn't be
 * verified against an installed server are flagged `// TODO-verify`. Workstream 3
 * makes a server that fails to resolve non-fatal to the agent.
 */

/** Every consent tier, in Settings display order. Add a tier here: the type, the
 *  resolver's validation and the Settings grouping all derive from this list. Any
 *  tier other than 'safe-readonly' is consent-gated (see the Tiers note above). */
export const MCP_TIERS = ['safe-readonly', 'write', 'secret'] as const;

export type McpTier = (typeof MCP_TIERS)[number];

export function isMcpTier(value: unknown): value is McpTier {
  return typeof value === 'string' && (MCP_TIERS as readonly string[]).includes(value);
}

export const LEGACY_MCP_CONSENT_REVISION = 1;

/** A consent revision is a safe positive integer; anything else is malformed. */
function isConsentRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

export interface McpConsentRecord {
  enabled: boolean;
  consentRevision?: number;
}

export type McpDefaultsMap = Record<string, McpConsentRecord>;

/** Stored consent records keyed by catalog id, as read from config.json — never the
 *  whole HarnessConfig. undefined → no stored records, catalog defaults apply;
 *  null → the state could not be read, fail closed. Values stay untrusted JSON. */
export type McpConsentInput = Readonly<Record<string, unknown>> | null | undefined;

export type McpConsentStateResult =
  | { ok: true; records: Record<string, unknown> }
  | { ok: false; error: string };

export interface McpCatalogEntry {
  /** Stable catalog id (also the consent key in `config.mcpDefaults`). The merge
   *  step namespaces the written server id (e.g. `munder-<id>`) to avoid clobbering
   *  a user's own `~/.claude` MCP server of the same name. */
  id: string;
  /** Human label for the consent UI. */
  label: string;
  /** One-line description for the consent UI / hire import preview. */
  description: string;
  /** The MCP stdio server launch spec. `filesystem`/`git` carry a placeholder cwd
   *  arg that Workstream 3 replaces with the agent cwd at merge time. */
  spec: {
    command: string;
    args: string[];
    /** Required env (e.g. an API token). Present only on write/secret entries; the
     *  value is supplied via consent, never hard-coded here. */
    env?: Record<string, string>;
  };
  tier: McpTier;
  /** Seed for `config.mcpDefaults[id].enabled`. Always === (tier === 'safe-readonly'). */
  defaultEnabled: boolean;
  /** Permission contract revision, not a package version or identity proof. */
  consentRevision?: number;
}

/** The default MCP bundle. Safe/read-only servers are ON; anything that writes
 *  or needs a secret is OFF until the user consents. */
export const MCP_CATALOG: McpCatalogEntry[] = [
  // ─── Safe, read-only, no-secret — shipped ON ──────────────────────────────
  {
    id: 'sequential-thinking',
    label: 'Sequential Thinking',
    description: 'Structured step-by-step reasoning scratchpad. No I/O, no secrets.',
    spec: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'] },
    tier: 'safe-readonly',
    defaultEnabled: true
  },
  {
    id: 'time',
    label: 'Time',
    description: 'Current time and timezone conversions.',
    // Reference time server ships as Python. // TODO-verify transport (uvx vs an npm port)
    spec: { command: 'uvx', args: ['mcp-server-time'] },
    tier: 'safe-readonly',
    defaultEnabled: true
  },
  {
    id: 'fetch',
    label: 'Fetch',
    description: 'Fetch a URL and return its content as markdown (read-only HTTP GET).',
    // Reference fetch server ships as Python. // TODO-verify transport (uvx vs an npm port)
    spec: { command: 'uvx', args: ['mcp-server-fetch'] },
    tier: 'safe-readonly',
    defaultEnabled: true
  },
  {
    id: 'context7',
    label: 'Context7 Docs',
    description: 'Up-to-date library/framework documentation lookups.',
    spec: { command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
    tier: 'safe-readonly',
    defaultEnabled: true
  },
  {
    id: 'filesystem',
    label: 'Filesystem (cwd)',
    description: 'Read, write, edit and move files under the configured workspace root. Requires explicit consent.',
    // The trailing arg is the allowed root — Workstream 3 replaces this placeholder
    // with the agent cwd at merge time so it is NEVER whole-disk.
    spec: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '<cwd>'] },
    tier: 'write',
    defaultEnabled: false,
    consentRevision: 2
  },
  {
    id: 'git',
    label: 'Git (cwd)',
    description: 'Inspect and modify the workspace repository, including add, commit, reset and branch operations. Requires explicit consent.',
    // Reference git server ships as Python; `--repository <cwd>` is set at merge time.
    // TODO-verify transport (uvx vs an npm port).
    spec: { command: 'uvx', args: ['mcp-server-git', '--repository', '<cwd>'] },
    tier: 'write',
    defaultEnabled: false,
    consentRevision: 2
  },

  // ─── Write / secret — shipped OFF, consent-gated ──────────────────────────
  {
    id: 'github-token',
    label: 'GitHub',
    description: 'Read/write GitHub issues, PRs, and repos. Requires a personal access token.',
    spec: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' }
    },
    tier: 'secret',
    defaultEnabled: false
  },
  {
    id: 'db',
    label: 'Database',
    description: 'Query a SQL database. Requires a connection string.',
    // TODO-verify exact server package for the user's DB engine (Postgres assumed).
    spec: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: { DATABASE_URL: '' }
    },
    tier: 'secret',
    defaultEnabled: false
  },
  {
    id: 'email-calendar',
    label: 'Email & Calendar',
    description: 'Read/send mail and read/write calendar events. Requires account credentials.',
    // TODO-verify provider package (Gmail/Google Calendar assumed).
    spec: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-gsuite'], env: { GOOGLE_OAUTH_TOKEN: '' } },
    tier: 'secret',
    defaultEnabled: false
  },
  {
    id: 'search-with-key',
    label: 'Web Search',
    description: 'Keyed web search. Requires a search-provider API key.',
    // TODO-verify provider package (Brave Search assumed).
    spec: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'], env: { BRAVE_API_KEY: '' } },
    tier: 'secret',
    defaultEnabled: false
  }
];

/** Look up a catalog entry by id. */
export function mcpCatalogEntry(id: string): McpCatalogEntry | undefined {
  const entry = MCP_CATALOG.find((e) => e.id === id);
  return entry ? {
    ...entry,
    spec: { ...entry.spec, args: [...entry.spec.args], ...(entry.spec.env ? { env: { ...entry.spec.env } } : {}) }
  } : undefined;
}

/** Whether an id is a known safe-readonly server (the only tier a hire manifest may
 *  request without surfacing for human consent — Workstream 3 validation). */
export function isSafeReadonlyMcp(id: string): boolean {
  return mcpCatalogEntry(id)?.tier === 'safe-readonly';
}

/** Seed for `DEFAULTS.mcpDefaults` — derived from the catalog so the two never
 *  drift (safe-readonly ON, write/secret OFF). */
export function defaultMcpDefaults(): McpDefaultsMap {
  const out: McpDefaultsMap = {};
  for (const e of MCP_CATALOG) out[e.id] = { enabled: e.defaultEnabled };
  return out;
}

/** JSON object boundary shared by config, runtime and renderer. Stricter than the
 *  module-private `isPlainObject` in triggers.ts: only `Object.prototype` or
 *  null-prototype objects pass (no arrays, class instances, Map/Date), and a
 *  throwing Proxy reads as "not an object" instead of breaking the caller. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  try {
    if (value === null || typeof value !== 'object') return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

/** Ignore inherited properties and accessors. null means malformed, not absent. */
function ownDataValue(record: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor === undefined ? undefined : 'value' in descriptor ? descriptor.value : null;
}

/** Missing maps use catalog defaults; malformed maps fail closed for every entry.
 *  The static type steers callers; the runtime checks still guard a mistyped value. */
export function mcpConsentRecord(records: McpConsentInput, catalogId: string): unknown {
  try {
    if (records === undefined) return undefined;
    return isPlainObject(records) ? ownDataValue(records, catalogId) : null;
  } catch {
    return null;
  }
}

/** The revision a grant must carry for this catalog entry; omitted (or undefined)
 *  means the legacy revision. undefined result = the catalog entry is malformed. */
export function requiredConsentRevision(entry: McpCatalogEntry): number | undefined {
  // Not `??`: a null revision is a malformed entry, not a request for the legacy one.
  const revision = entry.consentRevision === undefined ? LEGACY_MCP_CONSENT_REVISION : entry.consentRevision;
  return isConsentRevision(revision) ? revision : undefined;
}

/** The record an explicit grant stores — the single source for both the main-process
 *  writer and the resolver's expectations. Consent-gated tiers and revised entries
 *  carry the catalog revision; an unrevised safe entry keeps the legacy
 *  `{ enabled:true }` shape. undefined = the entry's own policy is invalid. */
export function mcpConsentGrant(entry: McpCatalogEntry): McpConsentRecord | undefined {
  const revision = requiredConsentRevision(entry);
  if (revision === undefined) return undefined;
  const record: McpConsentRecord = entry.tier !== 'safe-readonly' || revision !== LEGACY_MCP_CONSENT_REVISION
    ? { enabled: true, consentRevision: revision }
    : { enabled: true };
  return resolveMcpEnablement(entry, record) ? record : undefined;
}

/** Read-time consent only: never migrates or mutates a stored grant. */
export function resolveMcpEnablement(entry: McpCatalogEntry, candidateRecord: unknown): boolean {
  try {
    const requiredRevision = requiredConsentRevision(entry);
    if (requiredRevision === undefined) return false;
    if (!isMcpTier(entry.tier)) return false;
    if (typeof entry.defaultEnabled !== 'boolean') return false;
    if (entry.tier !== 'safe-readonly' && entry.defaultEnabled) return false;
    if (candidateRecord === undefined) return entry.tier === 'safe-readonly' && entry.defaultEnabled;
    if (!isPlainObject(candidateRecord) || ownDataValue(candidateRecord, 'enabled') !== true) return false;
    // Stored records are untrusted JSON: an own key holding undefined is malformed.
    const recordedRevision = Object.hasOwn(candidateRecord, 'consentRevision')
      ? ownDataValue(candidateRecord, 'consentRevision') : LEGACY_MCP_CONSENT_REVISION;
    if (!isConsentRevision(recordedRevision)) return false;
    return recordedRevision === requiredRevision;
  } catch {
    // Untrusted accessors/proxies must not break a consumer or grant access.
    return false;
  }
}

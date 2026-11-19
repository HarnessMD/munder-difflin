/**
 * The app's own list of local MCP servers (Workstream 3). A dependency-free,
 * importable-by-both (main + renderer) registry of the MCP servers Munder Difflin
 * can wire into each agent's per-session `settings.json`. Keep it free of
 * electron/UI/node imports.
 *
 * THIS LIST IS TRUSTED CODE. Every command below is in the binary and the app
 * starts it for each agent that has the server on. So an entry is added only
 * when its package was found under that exact name, from its maker, on the day
 * in `MCP_CATALOG_CHECKED`, and it is pinned to the version that was read. A
 * launcher that takes a version (npx, uvx, a container tag) always gets one:
 * an unpinned server would run whatever was published last night.
 *
 * Tiers gate consent:
 *   - 'safe-readonly' → needs no secret and cannot write outside the agent's
 *                       folder. The only tier that may be on without a person
 *                       saying so.
 *   - 'write'         → can change something outside the agent's folder, or
 *                       act for the person somewhere else (a browser, a
 *                       repository). OFF by default, consent-gated.
 *   - 'secret'        → needs an API key / token / connection string; OFF by
 *                       default, consent-gated. Most of these write as well.
 *
 * WHY `filesystem` AND `git` ARE 'write' (0.5.6). Both were marked safe read
 * only. Neither is read only, and neither stays inside the agent's folder:
 *   - filesystem has write_file, edit_file and move_file. The `<cwd>` argument
 *     below is NOT what bounds it under Claude Code: the server's README says
 *     a client's roots "completely replace" the folders given on the command
 *     line, and Claude Code (2.1.203 and later) answers roots with the launch
 *     folder plus every additional working directory. hive.ts grants each
 *     agent its hive folder and the office root that way, so the server can
 *     write there too.
 *   - git has git_commit, git_add, git_reset, git_checkout and
 *     git_create_branch. `--repository <cwd>` walks UP to the enclosing
 *     repository root, so an agent whose folder sits inside a larger
 *     repository, or in a linked worktree, writes to a repository that is
 *     bigger than its folder.
 *
 * The actual merge (catalog ∩ enabled, cwd-scoping of filesystem/git, id namespacing,
 * non-fatal resolution) is Workstream 3's `buildDefaultMcpServers`/`hookSettings`
 * job — this module only declares the entries, their tiers, and the seed defaults.
 *
 * Several servers ship as Python (uvx) or as a container (docker) rather than
 * npm (npx). The commands below are each maker's own. A machine without uv or
 * Docker simply fails to start that one server, which Workstream 3 keeps
 * non-fatal to the agent.
 */

export type McpTier = 'safe-readonly' | 'write' | 'secret';

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
    /** The NAMES of the secrets the server cannot work without, each with an
     *  empty value. Present only on secret entries; a value is never written
     *  here. A setting that has a default of its own is left out, so an empty
     *  value can never override that default. */
    env?: Record<string, string>;
  };
  tier: McpTier;
  /** Seed for `config.mcpDefaults[id].enabled`. True only for the four servers
   *  that were on by default before 0.5.6 and are still safe read only. It is
   *  never true outside that tier, and a server added later ships off whatever
   *  its tier: a release must not start a new program for every agent. */
  defaultEnabled: boolean;
}

/** The day every package, version and tag below was read from its registry. */
export const MCP_CATALOG_CHECKED = '2026-10-14';

/** The app's own servers. Only the four read only ones that shipped on are on;
 *  anything that writes, needs a secret or is new is off until a person says so. */
export const MCP_CATALOG: McpCatalogEntry[] = [
  // ─── Safe, read-only, no-secret — shipped ON ──────────────────────────────
  {
    id: 'sequential-thinking',
    label: 'Sequential Thinking',
    description: 'A scratchpad for reasoning one step at a time. It touches nothing outside itself.',
    spec: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking@1.0.0'] },
    tier: 'safe-readonly',
    defaultEnabled: true
  },
  {
    id: 'time',
    label: 'Time',
    description: 'The current time and conversions between time zones.',
    // The reference time server is Python, so it starts through uv.
    spec: { command: 'uvx', args: ['mcp-server-time@2026.10.10'] },
    tier: 'safe-readonly',
    defaultEnabled: true
  },
  {
    id: 'fetch',
    label: 'Fetch',
    description: 'Fetches a web address and returns the page as markdown. It can reach addresses on the local network too.',
    // The reference fetch server is Python, so it starts through uv.
    spec: { command: 'uvx', args: ['mcp-server-fetch@2026.10.10'] },
    tier: 'safe-readonly',
    defaultEnabled: true
  },
  {
    id: 'context7',
    label: 'Context7 Docs',
    description: 'Looks up current documentation for libraries and frameworks. Works with no key, at lower limits.',
    spec: { command: 'npx', args: ['-y', '@upstash/context7-mcp@4.4.1'] },
    tier: 'safe-readonly',
    defaultEnabled: true
  },

  // ─── Read only and no secret, yet consent-gated — added in 0.5.6 ──────────
  // It reads a public registry and nothing else, but starting it pulls and
  // runs a container image on this machine. A hire link or an agent file must
  // not be able to do that with nobody saying yes, so the tier is 'write'.
  {
    id: 'terraform',
    label: 'Terraform',
    description: 'Looks up providers, modules and policies in the public Terraform Registry. Needs Docker. It is started with no token, so it cannot reach HCP Terraform.',
    // What keeps this entry read only: no `--toolsets`, so only the registry
    // group loads (the default at 1.3.0), no `-e TFE_TOKEN`, and no mount.
    spec: { command: 'docker', args: ['run', '-i', '--rm', 'hashicorp/terraform-mcp-server:1.3.0'] },
    tier: 'write',
    defaultEnabled: false
  },

  // ─── Write / secret — shipped OFF, consent-gated ──────────────────────────
  {
    id: 'filesystem',
    label: 'Filesystem',
    description: "Reads, writes, edits and moves files in the agent's folder and in every other folder the agent has been given.",
    // The trailing arg is the allowed root — Workstream 3 replaces this placeholder
    // with the agent cwd at merge time. A client that sends roots replaces it.
    spec: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem@1.0.0', '<cwd>'] },
    tier: 'write',
    defaultEnabled: false
  },
  {
    id: 'git',
    label: 'Git',
    description: "Reads status, log and diff, and can stage, commit, reset, branch and check out in the repository that holds the agent's folder.",
    // The reference git server is Python; `--repository <cwd>` is set at merge
    // time and the server widens it to the enclosing repository root.
    spec: { command: 'uvx', args: ['mcp-server-git@2026.10.10', '--repository', '<cwd>'] },
    tier: 'write',
    defaultEnabled: false
  },
  {
    id: 'playwright',
    label: 'Playwright',
    description: 'Drives a browser: opens pages, clicks, types, uploads files, runs page scripts and saves screenshots. It acts as whoever is signed in on a site.',
    spec: { command: 'npx', args: ['-y', '@playwright/mcp@0.0.83'] },
    tier: 'write',
    defaultEnabled: false
  },
  {
    id: 'chrome-devtools',
    label: 'Chrome DevTools',
    description: 'Controls and inspects a Chrome browser: navigation, input, scripts, network and performance traces. Needs Chrome.',
    // The maker collects usage statistics unless told not to. The app does not
    // opt a person in to that on their behalf.
    spec: { command: 'npx', args: ['-y', 'chrome-devtools-mcp@1.10.1', '--no-usage-statistics'] },
    tier: 'write',
    defaultEnabled: false
  },
  {
    id: 'github',
    label: 'GitHub',
    description: 'Issues, pull requests, repositories and workflows on GitHub, from GitHub. It can delete files and repositories. Needs Docker and a personal access token.',
    // `-e NAME` with no value hands the container the variable of that name
    // from the environment the server was started in.
    spec: {
      command: 'docker',
      args: ['run', '-i', '--rm', '-e', 'GITHUB_PERSONAL_ACCESS_TOKEN', 'ghcr.io/github/github-mcp-server:v2.0.2'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' }
    },
    tier: 'secret',
    defaultEnabled: false
  },
  {
    id: 'dbhub',
    label: 'DBHub',
    description: 'Runs SQL against one database: PostgreSQL, MySQL, MariaDB, SQL Server, Oracle or SQLite. It can change and delete data. Needs a connection string and Node 22.5 or later.',
    spec: {
      command: 'npx',
      args: ['-y', '@bytebase/dbhub@1.5.0', '--transport', 'stdio'],
      env: { DSN: '' }
    },
    tier: 'secret',
    defaultEnabled: false
  },
  {
    id: 'mcp-toolbox-databases',
    label: 'MCP Toolbox for Databases',
    description: 'Google\'s database tools, set up for PostgreSQL: run SQL, list tables, read plans and statistics. It can change and delete data. Needs the database name, user and password.',
    // POSTGRES_HOST and POSTGRES_PORT have defaults (localhost, 5432), so they
    // are not named in `env`: see the note on that field.
    spec: {
      command: 'npx',
      args: ['-y', '@toolbox-sdk/server@1.14.0', '--prebuilt=postgres', '--stdio'],
      env: { POSTGRES_DATABASE: '', POSTGRES_USER: '', POSTGRES_PASSWORD: '' }
    },
    tier: 'secret',
    defaultEnabled: false
  },
  {
    id: 'brave-search',
    label: 'Brave Search',
    description: 'Web, news, image, video and local search through the Brave Search API. Needs a Brave API key.',
    spec: {
      command: 'npx',
      args: ['-y', '@brave/brave-search-mcp-server@2.1.4', '--transport', 'stdio'],
      env: { BRAVE_API_KEY: '' }
    },
    tier: 'secret',
    defaultEnabled: false
  },
  {
    id: 'firecrawl',
    label: 'Firecrawl',
    description: "Scrapes, crawls and searches the web through Firecrawl. Calls draw on the account's credits. Needs a Firecrawl API key and Node 22 or later.",
    spec: {
      command: 'npx',
      args: ['-y', 'firecrawl-mcp@3.30.0'],
      env: { FIRECRAWL_API_KEY: '' }
    },
    tier: 'secret',
    defaultEnabled: false
  }
];

/**
 * Ids this list once held and no longer starts, each with the id that took
 * its place, or null when nothing local did. An old settings row, hire file
 * or agent file may still name one. Read it through `resolveMcpId`; never
 * start a retired id, and never carry its consent over: the replacement is
 * another package, and a yes to the old one is not a yes to it.
 *
 *   github-token     `@modelcontextprotocol/server-github`: npm marks it "no
 *                    longer supported". GitHub's own server replaces it.
 *   db               `@modelcontextprotocol/server-postgres`: the same notice.
 *                    DBHub takes one connection string as it did.
 *   search-with-key  `@modelcontextprotocol/server-brave-search`: the same
 *                    notice. Brave's own server reads the same BRAVE_API_KEY.
 *   email-calendar   `@modelcontextprotocol/server-gsuite` never existed on
 *                    npm (404). Google's Gmail and Calendar servers are hosted
 *                    and sign in through the person's own Google Cloud
 *                    client, so no local command replaces it.
 */
export const RETIRED_MCP_IDS: Record<string, string | null> = {
  'github-token': 'github',
  db: 'dbhub',
  'search-with-key': 'brave-search',
  'email-calendar': null
};

const own = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

/** Whether the list once held this id and has let it go. */
export function isRetiredMcp(id: string): boolean {
  return own(RETIRED_MCP_IDS, id);
}

/** The id to use today for an id read from an old file: itself when the list
 *  still holds it, its replacement when it was retired, and null when there
 *  is none or the id was never known. */
export function resolveMcpId(id: string): string | null {
  if (MCP_CATALOG.some((e) => e.id === id)) return id;
  const next = own(RETIRED_MCP_IDS, id) ? RETIRED_MCP_IDS[id] : null;
  return next && MCP_CATALOG.some((e) => e.id === next) ? next : null;
}

/** Look up a catalog entry by id. A retired id has no entry: it is never
 *  started, so nothing may resolve it to a command by accident. */
export function mcpCatalogEntry(id: string): McpCatalogEntry | undefined {
  return MCP_CATALOG.find((e) => e.id === id);
}

/** Seed for `DEFAULTS.mcpDefaults` — derived from the catalog so the two never
 *  drift (the four safe read only servers that shipped on are ON, the rest OFF). */
export function defaultMcpDefaults(): Record<string, { enabled: boolean }> {
  const out: Record<string, { enabled: boolean }> = {};
  for (const e of MCP_CATALOG) out[e.id] = { enabled: e.defaultEnabled };
  return out;
}

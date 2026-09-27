/**
 * The capabilities marketplace (v0.4.9 phase 6a). The founder opened
 * Capabilities, found a screen that assumes he already knows what to install,
 * and asked to land on a catalog instead.
 *
 * THE RULE THIS FILE IS WRITTEN UNDER. Every entry is a real thing that
 * exists, and every entry's action genuinely runs through a door the app
 * ALREADY HAS. Nothing here is fetched: the list ships in the binary, so the
 * screen is instant and works with no network. There are four doors and only
 * four, one per kind:
 *
 *   skill   window.cth.skillsInstall(url, name)   downloads the GitHub folder
 *                                                 into ~/.claude/skills
 *   mcp     window.cth.updateConfig({ mcpDefaults })  flips the workspace
 *                                                 consent the launch path reads
 *   tool    the exact install command, copied     the app has no installer for
 *                                                 an engine; Settings then
 *                                                 Prerequisites runs the check
 *   plugin  the /plugin command, copied           the app has NO plugin door at
 *                                                 all; the command runs inside
 *                                                 a Claude Code session
 *
 * The last two are honest about being a copied command rather than a button
 * that installs. That is why `door` is a field and not an implementation
 * detail: test/pro-049-marketplace pins every entry to a door that exists, so
 * a future entry cannot claim an installer nobody wrote.
 *
 * WHAT IS DELIBERATELY ABSENT.
 *   - The three MCP servers whose package the catalog itself flags as assumed
 *     (db, email-calendar, search-with-key). They stay one click away in the
 *     grant sheet on the same screen; they are not recommended by name here
 *     because the package behind them is not verified.
 *   - Prerequisites (uv, git, node) and the memory tool. Founder decision 5a:
 *     the machine check lives under Settings, and this page never probes.
 *
 * Importable by main, preload and renderer: no electron, node or UI imports.
 */
import { MCP_CATALOG, type McpCatalogEntry } from './mcpCatalog';
import { mcpEnabledFor, type AgentMcpMap, type McpConsentMap } from './agentMcp';

export type MarketKind = 'skill' | 'mcp' | 'tool' | 'plugin';

/** Which existing door installs the entry. One of exactly four. */
export type MarketDoor =
  /** window.cth.skillsInstall(entry.url, entry.name) */
  | 'skills:install'
  /** window.cth.updateConfig({ mcpDefaults: { [ref]: { enabled: true } } }) */
  | 'config:mcp'
  /** the engine's own install command, from shared/toolCatalog, copied */
  | 'tool:command'
  /** /plugin install <name>@claude-plugins-official, copied */
  | 'plugin:command';

export type MarketGroup =
  | 'documents' | 'design' | 'engineering' | 'research'
  | 'cloud' | 'security' | 'workspace' | 'engines';

/** Display order. The label is `pro.market.group.<id>` in the three locales. */
export const MARKET_GROUPS: MarketGroup[] = [
  'workspace', 'engineering', 'documents', 'design', 'research', 'cloud', 'security', 'engines'
];

export interface MarketEntry {
  /** Stable and unique across the whole catalog. `<kind>:<slug>`. */
  id: string;
  kind: MarketKind;
  group: MarketGroup;
  /** What the thing calls itself. For a skill this is also what the installed
   *  copy is called, which is half of how it is recognised again. */
  name: string;
  /** One line, from the person's side of the screen: what it is FOR. */
  blurb: string;
  /** Where it came from: the publisher, never a category. */
  source: string;
  door: MarketDoor;
  /** skill: the GitHub folder skillsInstall downloads.
   *  plugin: the plugin's page in the official directory. */
  url?: string;
  /** mcp: an id in MCP_CATALOG. tool: an id in toolCatalog(). */
  ref?: string;
}

/** The one marketplace the plugin entries come from, and the one the copied
 *  command installs from. Claude Code ships with it configured. */
export const PLUGIN_MARKETPLACE = 'claude-plugins-official';
const PLUGIN_HOME = 'https://github.com/anthropics/claude-plugins-official/tree/main/plugins';

const skill = (slug: string, group: MarketGroup, name: string, blurb: string, source: string, url: string): MarketEntry =>
  ({ id: `skill:${slug}`, kind: 'skill', group, name, blurb, source, door: 'skills:install', url });
const mcp = (ref: string, group: MarketGroup, name: string, blurb: string, source: string): MarketEntry =>
  ({ id: `mcp:${ref}`, kind: 'mcp', group, name, blurb, source, door: 'config:mcp', ref });
const tool = (ref: string, name: string, blurb: string, source: string): MarketEntry =>
  ({ id: `tool:${ref}`, kind: 'tool', group: 'engines', name, blurb, source, door: 'tool:command', ref });
const plugin = (slug: string, group: MarketGroup, blurb: string): MarketEntry =>
  ({ id: `plugin:${slug}`, kind: 'plugin', group, name: slug, blurb, source: 'Anthropic', door: 'plugin:command', url: `${PLUGIN_HOME}/${slug}` });

/**
 * The catalog. Every skill url is a GitHub folder the installer can walk;
 * every mcp ref is an MCP_CATALOG id; every tool ref is a toolCatalog id with
 * a real install command; every plugin is an Anthropic built entry in the
 * official directory.
 */
export const MARKETPLACE: MarketEntry[] = [
  /* ── The workspace itself ──────────────────────────────────────────────── */
  mcp('time', 'workspace', 'Time',
    'Gives an agent the real date, time and timezone instead of a guess.',
    'Model Context Protocol'),
  skill('skill-creator', 'workspace', 'skill-creator',
    'Builds a new skill with you, one question at a time.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/skill-creator'),
  plugin('claude-code-setup', 'workspace',
    'Reads your codebase and suggests the hooks, skills and MCP servers it would actually use.'),
  plugin('claude-md-management', 'workspace',
    'Audits CLAUDE.md and folds in what a session learned, so project memory stays current.'),
  plugin('hookify', 'workspace',
    'Turns a rule you keep repeating into a hook that enforces it.'),

  /* ── Code and engineering ──────────────────────────────────────────────── */
  mcp('sequential-thinking', 'engineering', 'Sequential Thinking',
    'A scratchpad for taking a hard problem in steps. Nothing leaves the machine.',
    'Model Context Protocol'),
  mcp('filesystem', 'engineering', 'Filesystem',
    "Reads and edits files inside the agent's own workspace, and nowhere else.",
    'Model Context Protocol'),
  mcp('git', 'engineering', 'Git',
    'Reads status, log and diff for the repository the agent is working in.',
    'Model Context Protocol'),
  mcp('github-token', 'engineering', 'GitHub',
    'Issues, pull requests and repositories on GitHub. Needs a personal access token.',
    'Model Context Protocol'),
  skill('claude-api', 'engineering', 'claude-api',
    "Anthropic's own guidance for building on the Claude API, tool use and caching included.",
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/claude-api'),
  skill('mcp-builder', 'engineering', 'mcp-builder',
    'Walks you through writing an MCP server of your own.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/mcp-builder'),
  skill('web-artifacts-builder', 'engineering', 'web-artifacts-builder',
    'Builds a whole HTML page with React and Tailwind rather than a snippet.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder'),
  skill('webapp-testing', 'engineering', 'webapp-testing',
    'Drives a real browser with Playwright to test a web app.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/webapp-testing'),
  skill('stripe-best-practices', 'engineering', 'stripe-best-practices',
    "Stripe's own guidance for payments, subscriptions and webhooks.",
    'Stripe', 'https://github.com/stripe/ai/tree/main/skills/stripe-best-practices'),
  plugin('feature-dev', 'engineering',
    'A whole feature workflow: explore the codebase, design the change, then review it.'),
  plugin('code-review', 'engineering',
    'Reviews a pull request with several agents and scores out the false positives.'),
  plugin('pr-review-toolkit', 'engineering',
    'Review agents for comments, tests, error handling, type design and code quality.'),
  plugin('frontend-design', 'engineering',
    'Frontend code that does not come out looking like every other AI frontend.'),
  plugin('plugin-dev', 'engineering',
    'Seven skills for writing a Claude Code plugin: hooks, commands, agents and MCP.'),
  plugin('typescript-lsp', 'engineering',
    'Real TypeScript code intelligence in the session, from the language server.'),

  /* ── Documents and writing ─────────────────────────────────────────────── */
  skill('docx', 'documents', 'docx',
    'Writes and edits Word documents, comments and tracked changes included.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/docx'),
  skill('pdf', 'documents', 'pdf',
    'Pulls content out of PDFs, splits and merges them, and makes new ones.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/pdf'),
  skill('pptx', 'documents', 'pptx',
    'Builds and edits PowerPoint decks.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/pptx'),
  skill('xlsx', 'documents', 'xlsx',
    'Works spreadsheets: formulas, tables and charts.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/xlsx'),
  skill('internal-comms', 'documents', 'internal-comms',
    'Drafts the internal announcement or report you would rather not write.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/internal-comms'),

  /* ── Design and media ──────────────────────────────────────────────────── */
  skill('canvas-design', 'design', 'canvas-design',
    'Lays out a design and renders it to PNG or PDF.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/canvas-design'),
  skill('brand-guidelines', 'design', 'brand-guidelines',
    "Puts your company's branding on whatever an agent produces.",
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/brand-guidelines'),
  skill('theme-factory', 'design', 'theme-factory',
    'Makes one visual theme and applies it across a set of documents.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/theme-factory'),
  skill('algorithmic-art', 'design', 'algorithmic-art',
    'Draws generative art with p5.js.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/algorithmic-art'),
  skill('slack-gif-creator', 'design', 'slack-gif-creator',
    'Makes an animated GIF at the size Slack wants.',
    'Anthropic', 'https://github.com/anthropics/skills/tree/main/skills/slack-gif-creator'),

  /* ── Reference and research ────────────────────────────────────────────── */
  mcp('fetch', 'research', 'Fetch',
    'Reads a web page and hands it back as plain markdown.',
    'Model Context Protocol'),
  mcp('context7', 'research', 'Context7 Docs',
    "Looks up a library's current documentation instead of recalling an old version of it.",
    'Upstash'),

  /* ── Cloud and deployment ──────────────────────────────────────────────── */
  skill('cloudflare-wrangler', 'cloud', 'wrangler',
    'Deploys and manages Cloudflare Workers, KV, R2, D1 and Queues.',
    'Cloudflare', 'https://github.com/cloudflare/skills/tree/main/skills/wrangler'),
  skill('cloudflare-workers-best-practices', 'cloud', 'workers-best-practices',
    'How to write a Cloudflare Worker that holds up in production.',
    'Cloudflare', 'https://github.com/cloudflare/skills/tree/main/skills/workers-best-practices'),
  skill('cloudflare-web-perf', 'cloud', 'web-perf',
    'Audits Core Web Vitals and the resources blocking your first render.',
    'Cloudflare', 'https://github.com/cloudflare/skills/tree/main/skills/web-perf'),

  /* ── Security ──────────────────────────────────────────────────────────── */
  plugin('claude-security', 'security',
    'Scans your own code for vulnerabilities inside the session, and challenges every finding before it reports it.'),
  plugin('security-guidance', 'security',
    'Watches the edits an agent makes for injection, XSS, hardcoded secrets and the rest.'),

  /* ── Engines to run agents on ──────────────────────────────────────────── */
  tool('engine:claude', 'Claude Code', 'The engine most of the team runs on.', 'Anthropic'),
  tool('engine:codex', 'Codex · GPT', "Runs an agent on OpenAI's Codex CLI.", 'OpenAI'),
  tool('engine:gemini', 'Gemini CLI', "Runs an agent on Google's Gemini CLI.", 'Google'),
  tool('engine:opencode', 'OpenCode', 'Runs an agent on OpenCode, which takes your own model keys.', 'OpenCode'),
  tool('engine:copilot', 'Copilot', "Runs an agent on GitHub Copilot's CLI.", 'GitHub'),
  tool('engine:crush', 'Crush · Charm', 'Runs an agent on Crush, the terminal coding agent from Charm.', 'Charm'),
  tool('engine:pi', 'Pi', 'Runs an agent on Pi, the coding agent from Earendil Works.', 'Earendil Works')
];

/* ───────────────────────────── lookups ────────────────────────────────── */

export function marketEntry(id: string): MarketEntry | undefined {
  return MARKETPLACE.find((e) => e.id === id);
}

/** The command a person pastes into a Claude Code session to install a plugin.
 *  Built here so the copied text and the note under the group cannot disagree. */
export function pluginCommand(entry: MarketEntry): string | null {
  if (entry.kind !== 'plugin') return null;
  return `/plugin install ${entry.name}@${PLUGIN_MARKETPLACE}`;
}

/* ───────────────────────── recognising an install ─────────────────────── */

/** A GitHub folder url, which is the only shape skills:install can walk. */
const TREE_URL = /^https:\/\/github\.com\/[^/]+\/[^/]+\/tree\/[^/]+\/(.+)$/;
/** The same name test main/skills.ts applies before it creates a folder. */
const SAFE_DIR = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/**
 * The folder `skills:install` will create for a skill entry, which is also how
 * the entry is recognised on the next open.
 *
 * WHY NOT MATCH ON THE NAME ALONE. The installer names the folder from the
 * LAST SEGMENT OF THE SOURCE PATH, never from the label we print, while the
 * name a scan reports comes from the SKILL.md frontmatter. Those two agree for
 * most skills and not for all, and a marketplace that offers Install for
 * something already installed is the exact defect this phase exists to avoid.
 * So both are checked, and this is the half that is deterministic.
 */
export function skillFolder(entry: MarketEntry): string | null {
  if (entry.kind !== 'skill' || !entry.url) return null;
  const m = TREE_URL.exec(entry.url.replace(/\/+$/, ''));
  if (!m) return null;
  const base = m[1].split('/').pop() ?? '';
  return SAFE_DIR.test(base) ? base : null;
}

/** One installed skill, as `skills:local` reports it. */
export interface InstalledSkill { name: string; path: string }

/** What the app actually records about this workspace. Tools and plugins are
 *  absent on purpose: nothing in the app reads either back, so nothing claims
 *  them installed. */
export interface InstalledState {
  skills: InstalledSkill[];
  /** MCP catalog ids that resolve ON, from `mcpInstalledIds`. */
  mcp: string[];
}

function baseName(p: string): string {
  return p.split(/[\\/]/).filter(Boolean).pop() ?? '';
}

/** The installed copy of a skill entry, by frontmatter name or by the folder
 *  the installer would have created. Undefined when it is not here. */
export function installedSkillFor<T extends InstalledSkill>(entry: MarketEntry, skills: T[]): T | undefined {
  if (entry.kind !== 'skill') return undefined;
  const folder = skillFolder(entry)?.toLowerCase();
  const name = entry.name.toLowerCase();
  return skills.find((s) => s.name.toLowerCase() === name || (!!folder && baseName(s.path).toLowerCase() === folder));
}

/** Whether the marketplace entry is already here. False for every kind the
 *  app cannot read back, which is the honest answer, not a guess. */
export function entryInstalled(entry: MarketEntry, state: InstalledState): boolean {
  if (entry.kind === 'mcp') return !!entry.ref && state.mcp.includes(entry.ref);
  if (entry.kind !== 'skill') return false;
  return !!installedSkillFor(entry, state.skills);
}

/**
 * The MCP servers this workspace has on: the workspace default, plus anything
 * an agent switched on for itself. Resolved through the same function the
 * launch path uses, so the tab and the settings file cannot disagree.
 */
export function mcpInstalledIds(
  floor: McpConsentMap | undefined,
  perAgent: AgentMcpMap | undefined,
  agentIds: string[],
  catalog: McpCatalogEntry[] = MCP_CATALOG
): string[] {
  return catalog
    .filter((e) => mcpEnabledFor(e, floor, undefined, '') || agentIds.some((id) => mcpEnabledFor(e, floor, perAgent, id)))
    .map((e) => e.id);
}

/* ───────────────────────── searching and grouping ─────────────────────── */

export type MarketFilter = MarketKind | 'all';

export function marketMatches(e: MarketEntry, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [e.name, e.blurb, e.source, e.id, e.ref].some((f) => f?.toLowerCase().includes(needle));
}

export function filterMarket(q: string, kind: MarketFilter, entries: MarketEntry[] = MARKETPLACE): MarketEntry[] {
  return entries.filter((e) => (kind === 'all' || e.kind === kind) && marketMatches(e, q));
}

/** The rows in display order, folded into their groups. A group that matched
 *  nothing is dropped rather than printed empty. */
export function groupMarket(entries: MarketEntry[]): { group: MarketGroup; entries: MarketEntry[] }[] {
  return MARKET_GROUPS
    .map((group) => ({ group, entries: entries.filter((e) => e.group === group) }))
    .filter((g) => g.entries.length > 0);
}

/** How many of each kind are in the catalog, for the filter's counts. */
export function marketCounts(entries: MarketEntry[] = MARKETPLACE): Record<MarketFilter, number> {
  const out: Record<MarketFilter, number> = { all: entries.length, skill: 0, mcp: 0, tool: 0, plugin: 0 };
  for (const e of entries) out[e.kind] += 1;
  return out;
}

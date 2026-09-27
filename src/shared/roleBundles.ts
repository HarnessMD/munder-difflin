/**
 * Role bundles (v0.4.9 plan, W-B). One click gives an agent everything its
 * role needs; the person trims afterwards. A bundle is DATA over the catalogs
 * the app already has, never a new capability:
 *
 *   mcp     ids from shared/mcpCatalog (MCP_CATALOG)
 *   skills  names of the skills shipped in resources/skills (the bundled set
 *           hive.ts copies into every agent at start)
 *   tools   ids from shared/toolCatalog (the memory tool and one engine row
 *           per provider preset)
 *
 * test/pro-049-capabilities pins every id to a real catalog entry, so a
 * bundle cannot name something that does not exist.
 *
 * WHAT APPLYING A BUNDLE WRITES. Only the MCP half is a per agent grant:
 * config.agentMcp rows through config:setAgentMcp, the same rows the launch
 * path resolves (shared/agentMcp.ts), and only for agents on Claude Code,
 * because MCP servers reach Claude engines alone. Bundled skills are copied
 * into every agent's .claude/skills on each start, so there is no per agent
 * skills door and nothing to write. Tools are facts about the machine
 * (Settings → Prerequisites); a bundle lists the ones the role leans on.
 *
 * Importable by main, preload and renderer: no electron, node or UI imports.
 */
import { MCP_CATALOG } from './mcpCatalog';
import { mcpEnabledFor, type AgentMcpMap, type McpConsentMap } from './agentMcp';

export interface RoleBundle {
  id: string;
  labelKey: string;
  blurbKey: string;
  mcp: string[];
  skills: string[];
  tools: string[];
}

const bundle = (id: string, mcp: string[], skills: string[], tools: string[]): RoleBundle =>
  ({ id, labelKey: `pro.bundles.${id}.label`, blurbKey: `pro.bundles.${id}.blurb`, mcp, skills, tools });

/** The eleven bundles, in the order the founder listed them. */
export const ROLE_BUNDLES: RoleBundle[] = [
  bundle('designer',
    ['fetch', 'context7', 'filesystem', 'git', 'sequential-thinking'],
    ['md-fetch-summarize', 'capabilities', 'md-hive-sync'],
    ['engine:claude', 'mempalace']),
  bundle('software-engineer',
    ['sequential-thinking', 'time', 'fetch', 'context7', 'filesystem', 'git', 'github-token', 'db'],
    ['md-audit', 'md-fetch-summarize', 'md-hive-sync', 'capabilities', 'temporal'],
    ['engine:claude', 'mempalace']),
  bundle('product-manager',
    ['sequential-thinking', 'time', 'fetch', 'github-token', 'email-calendar', 'search-with-key'],
    ['md-fetch-summarize', 'capabilities', 'temporal', 'thisWeek', 'lastWeek', 'thisQuarter'],
    ['engine:claude', 'mempalace']),
  bundle('frontend-developer',
    ['sequential-thinking', 'fetch', 'context7', 'filesystem', 'git', 'github-token'],
    ['md-audit', 'md-fetch-summarize', 'md-hive-sync', 'capabilities'],
    ['engine:claude', 'mempalace']),
  bundle('founders-office',
    ['time', 'fetch', 'email-calendar', 'search-with-key', 'filesystem', 'sequential-thinking'],
    ['capabilities', 'md-fetch-summarize', 'temporal', 'today', 'thisWeek'],
    ['engine:claude', 'mempalace']),
  bundle('community-manager',
    ['time', 'fetch', 'search-with-key', 'email-calendar', 'github-token'],
    ['md-fetch-summarize', 'capabilities', 'today', 'yesterday', 'thisWeek', 'lastWeek'],
    ['engine:claude', 'mempalace']),
  bundle('growth-hacker',
    ['fetch', 'search-with-key', 'db', 'time', 'sequential-thinking'],
    ['md-fetch-summarize', 'capabilities', 'temporal', 'last7Days', 'last30Days', 'thisWeek', 'lastWeek'],
    ['engine:claude', 'mempalace']),
  bundle('demand-generation',
    ['fetch', 'search-with-key', 'email-calendar', 'db', 'time'],
    ['md-fetch-summarize', 'capabilities', 'thisMonth', 'lastMonth', 'thisQuarter', 'lastQuarter'],
    ['engine:claude', 'mempalace']),
  bundle('cold-outreach',
    ['fetch', 'search-with-key', 'email-calendar', 'time'],
    ['md-fetch-summarize', 'capabilities', 'today', 'thisWeek'],
    ['engine:claude', 'mempalace']),
  bundle('cfo',
    ['db', 'time', 'fetch', 'sequential-thinking', 'email-calendar'],
    ['capabilities', 'temporal', 'thisMonth', 'lastMonth', 'thisQuarter', 'lastQuarter', 'thisYear', 'lastYear'],
    ['engine:claude', 'mempalace']),
  bundle('legal',
    ['fetch', 'search-with-key', 'time', 'sequential-thinking', 'filesystem'],
    ['md-fetch-summarize', 'capabilities', 'temporal', 'thisYear', 'lastYear'],
    ['engine:claude', 'mempalace'])
];

export function roleBundle(id: string): RoleBundle | undefined {
  return ROLE_BUNDLES.find((b) => b.id === id);
}

/** What granting a bundle to one agent would write: the MCP ids the agent
 *  does not have yet (`grant`), the ones it already resolves to on
 *  (`already`), and whether MCP reaches its engine at all. Pure, so the
 *  sheet and the test read the same plan. */
export function bundleGrantPlan(
  b: RoleBundle,
  agentId: string,
  floor: McpConsentMap | undefined,
  perAgent: AgentMcpMap | undefined,
  provider: string | undefined
): { grant: string[]; already: string[]; mcpReaches: boolean } {
  const mcpReaches = (provider ?? 'claude') === 'claude';
  const grant: string[] = [];
  const already: string[] = [];
  for (const id of b.mcp) {
    const entry = MCP_CATALOG.find((e) => e.id === id);
    if (!entry) continue;
    if (mcpEnabledFor(entry, floor, perAgent, agentId)) already.push(id);
    else grant.push(id);
  }
  return { grant: mcpReaches ? grant : [], already, mcpReaches };
}

/**
 * PRO Capabilities. THE MARKETPLACE IS WHAT YOU LAND ON (founder, v0.4.9 6a):
 * the old screen assumed you already knew what to install, so the curated
 * catalog is now the default tab and the who-has-what columns moved behind
 * one of their own.
 *
 * ONE DESIGN, THREE TABS (founder, v0.4.11 item 12): every tab renders the
 * same section header over the same 3 column grid of the same card anatomy
 * (title, kind chip, description, source line, actions), so switching tabs
 * changes the answer, never the language. The "Browse skills" header button
 * is gone: the Marketplace IS the browsing surface, and skill management
 * stays one link away on the Installed tab. Connections and Role bundles
 * moved into the Marketplace hero, which explains the curated list; they are
 * not duplicated in the header.
 *
 *   Marketplace  shared/marketplace.ts, shipped in the file, nothing fetched.
 *                Every card's button goes through a door that already exists:
 *                skills:install for a skill, config:update mcpDefaults for a
 *                server, and for an engine or a plugin the exact command,
 *                copied, because the app installs neither. A card whose thing
 *                is already here says so and offers what you do NEXT instead
 *                of a dead Install.
 *   Installed    real state, never a guess: skills:local for what is on this
 *                machine, and mcpInstalledIds resolving the same consent the
 *                launch path reads. Empty gets the numbered steps.
 *   Who has what the three columns this screen used to be, now the same card
 *                grid as the other tabs: each card keeps its avatar strip,
 *                its tier chip and its add-to-agent action.
 *
 * MCP IS THE ONE EDITABLE COLUMN. "Add to agent" opens the grant sheet: the
 * workspace default at the top (the same `config.mcpDefaults` switch the
 * Classic settings flip), then one switch per agent writing `config.agentMcp`
 * through `config:setAgentMcp` (read-modify-write in main). An agent following
 * the default says so; a row of its own can be cleared back to it. Servers
 * reach Claude engines only (hive.ts writes the settings file for Claude),
 * so an agent on another engine shows why it has no switch instead of a
 * switch that would do nothing. "Role bundles" (v0.4.9 W-B) grants a whole
 * role's set in one click through the same door (BundleSheet).
 *
 * Skills and tools are facts (capData.ts): the row says who can use them.
 * Skills open in the kit's SkillsSheet (install and remove over the same
 * IPC the Classic tab used); connections in ConnectionsSheet (the registry's
 * add, edit and remove doors). PREREQUISITES ARE NOT HERE (founder, 5a):
 * nothing on this page calls tools:status; the tools column lists the
 * engines and the memory tool from the catalog with who is configured on
 * them, and the machine check lives under Settings → Prerequisites, run on
 * request only. The marketplace keeps that decision: it offers engines, which
 * are a capability you add, and never a prerequisite of the machine.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { skillInstallError } from '../skillInstallError';
import { useStore, type Agent } from '@/store/store';
import type { HarnessConfig } from '@/store/config';
import type { LocalSkill } from '../../../../preload';
import { MCP_CATALOG, mcpCatalogEntry, type McpCatalogEntry, type McpTier } from '@shared/mcpCatalog';
import { agentsWithMcp, hasOwnMcpRow, mcpEnabledFor } from '@shared/agentMcp';
import { toolCatalog, type ToolSpec } from '@shared/toolCatalog';
import {
  entryInstalled, filterMarket, groupMarket, installedSkillFor, marketCounts, mcpInstalledIds, pluginCommand,
  type MarketEntry, type MarketFilter, type MarketKind
} from '@shared/marketplace';
import { integrationsClient, type IntegrationRecordView } from '../../integrations/registryClient';
import { Bar, Btn, Chip, CloseX, Portrait, SearchBox, Seg, SetupEmpty, Sheet, Switch, Tabs, proToast, useAgentById } from './ui';
import { useTechnical } from './depth';
import { agentsForSkill, agentsForTool, foldSkills, matches, providerOf, type CapFilter } from './capData';
import { SkillsSheet } from './SkillsSheet';
import { ConnectionsSheet } from './ConnectionsSheet';
import { openBundleSheet } from './bundleSheetStore';

const TIER_TONE: Record<McpTier, 'ok' | 'warn' | 'bad'> = { 'safe-readonly': 'ok', write: 'warn', secret: 'bad' };
const PROVIDER_LABEL: Record<string, string> = { claude: 'Claude Code', opencode: 'OpenCode', codex: 'Codex' };
const KIND_TONE: Record<MarketKind, 'accent' | 'info' | 'muted' | 'outline'> = { skill: 'accent', mcp: 'info', tool: 'muted', plugin: 'outline' };

type View = 'market' | 'installed' | 'agents';
type LoadedSkill = LocalSkill & { foundIn: string[] };

export function CapabilitiesScreen({ config }: { config: HarnessConfig | null }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const agents = useStore((s) => s.agents);
  // The marketplace is the default view: the founder opened this screen and
  // found it assumed he already knew what to install.
  const [view, setView] = useState<View>('market');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<MarketFilter>('all');
  const [filter, setFilter] = useState<CapFilter>('all');
  const [grant, setGrant] = useState<McpCatalogEntry | null>(null);
  const [sheet, setSheet] = useState<'skills' | 'connections' | null>(null);
  const [gen, setGen] = useState(0);

  const skills = useLocalSkills(agents, gen);
  const tools = useMemo(() => toolCatalog().filter((x) => x.kind !== 'prerequisite'), []);
  const connections = useConnections(gen);

  const agentIds = agents.map((a) => a.id);
  const show = (k: Exclude<CapFilter, 'all'>) => filter === 'all' || filter === k;

  // Real state, both halves: what a scan of this machine found, and what the
  // same resolver the launch path uses says is on.
  const mcpOn = useMemo(() => mcpInstalledIds(config?.mcpDefaults, config?.agentMcp, agentIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config?.mcpDefaults, config?.agentMcp, agentIds.join('\n')]);
  const installedState = useMemo(() => ({ skills: skills ?? [], mcp: mcpOn }), [skills, mcpOn]);

  const mcpRows = MCP_CATALOG.filter((e) => matches(q, e.label, e.id, e.description));
  const skillRows = (skills ?? []).filter((s) => matches(q, s.name, s.description, s.provider, s.scope));
  const toolRows = tools.filter((x) => matches(q, x.label, x.id, x.why));
  const connRows = connections.filter((c) => matches(q, c.label, c.id, c.baseUrl));
  const openPrereq = () => window.dispatchEvent(new CustomEvent('cth:open-settings', { detail: { section: 'Prerequisites' } }));
  const counts = useMemo(() => marketCounts(), []);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <Bar title={t('pro.caps.title')} sub={t('pro.caps.sub')}>
        <SearchBox value={q} onChange={setQ} placeholder={view === 'market' ? t('pro.market.search') : t('pro.caps.search')} />
      </Bar>
      <Tabs value={view} ariaLabel={t('pro.market.tabsLabel')} onChange={setView}
        tabs={[
          { value: 'market', label: t('pro.market.tab.market') },
          { value: 'installed', label: t('pro.market.tab.installed') },
          { value: 'agents', label: t('pro.market.tab.agents') }
        ]}
        right={view === 'market' ? (
          <Seg value={kind} ariaLabel={t('pro.market.filterLabel')} onChange={setKind} options={[
            { value: 'all', label: `${t('pro.market.filter.all')} ${counts.all}` },
            { value: 'skill', label: t('pro.market.filter.skill') }, { value: 'mcp', label: t('pro.market.filter.mcp') },
            { value: 'tool', label: t('pro.market.filter.tool') }, { value: 'plugin', label: t('pro.market.filter.plugin') }
          ]} />
        ) : view === 'agents' ? (
          <Seg value={filter} ariaLabel={t('pro.caps.filterLabel')} onChange={setFilter} options={[
            { value: 'all', label: t('pro.caps.filter.all') }, { value: 'mcp', label: t('pro.caps.filter.mcp') },
            { value: 'skills', label: t('pro.caps.filter.skills') }, { value: 'tools', label: t('pro.caps.filter.tools') }
          ]} />
        ) : undefined} />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 18 }}>
        {view === 'market' && (
          <Marketplace q={q} kind={kind} state={installedState} skills={skills ?? []} tools={tools} config={config}
            technical={technical} onChanged={() => setGen((g) => g + 1)} onGrant={setGrant} onPrereq={openPrereq}
            onConnections={() => setSheet('connections')} />
        )}
        {view === 'installed' && (
          <Installed q={q} skills={skills} mcpOn={mcpOn} agents={agents} agentIds={agentIds} config={config}
            technical={technical} onGrant={setGrant} onManage={() => setSheet('skills')} onGoMarket={() => setView('market')} />
        )}
        {view === 'agents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1080 }}>
            {show('mcp') && (
              <Section title={t('pro.caps.mcp')} n={mcpRows.length}>
                {mcpRows.map((e) => (
                  <CapCard key={e.id} label={e.label} desc={e.description} source={t('pro.caps.source.mcp')} code={technical ? e.id : undefined}
                    chips={<><Chip tone={KIND_TONE.mcp}>{t('pro.market.kind.mcp')}</Chip><Chip tone={TIER_TONE[e.tier]}>{t(`pro.caps.tier.${e.tier}`)}</Chip></>}
                    who={agentsWithMcp(e, agentIds, config?.mcpDefaults, config?.agentMcp)}
                    action={<AddLink onClick={() => setGrant(e)}>{t('pro.caps.addToAgent')}</AddLink>} />
                ))}
              </Section>
            )}
            {show('skills') && (
              <Section title={t('pro.caps.skills')} n={skillRows.length}>
                {skillRows.length === 0 && <Empty>{t('pro.caps.noSkills')}</Empty>}
                {skillRows.map((s) => (
                  <CapCard key={s.path} label={s.name} desc={s.description} source={t('pro.caps.source.skill')} code={technical ? s.path : undefined}
                    chips={<><Chip tone={KIND_TONE.skill}>{t('pro.market.kind.skill')}</Chip><Chip tone="muted">{PROVIDER_LABEL[s.provider] ?? s.provider}</Chip><Chip tone="outline">{t(`pro.caps.scope.${s.scope}`)}</Chip></>}
                    who={agentsForSkill(s, agents)} />
                ))}
              </Section>
            )}
            {show('tools') && (
              <Section title={t('pro.caps.tools')} n={toolRows.length + connRows.length} right={<AddLink onClick={openPrereq}>{t('pro.caps.checkPrereq')}</AddLink>}>
                {toolRows.map((x) => (
                  // Who is CONFIGURED on the engine, or every agent for the memory
                  // layer: facts from the roster, not a probe of this machine.
                  <CapCard key={x.id} label={x.label} desc={x.why} source={t('pro.caps.source.tool')} code={technical ? x.id : undefined}
                    chips={<><Chip tone={KIND_TONE.tool}>{t('pro.market.kind.tool')}</Chip><Chip tone={x.kind === 'engine' ? 'accent' : 'muted'}>{t(`pro.caps.toolKind.${x.kind}`)}</Chip></>}
                    who={agentsForTool({ id: x.id, kind: x.kind, found: true }, agents)} />
                ))}
                {connRows.map((c) => {
                  const usable = c.enabled && (c.authType === 'none' || c.hasSecret);
                  return (
                    <CapCard key={`conn:${c.id}`} label={c.label} desc={c.baseUrl} source={t('pro.caps.source.connection')} code={technical ? c.id : undefined}
                      chips={<><Chip tone="outline">{t('pro.caps.connection')}</Chip>{!usable && <Chip tone="warn">{c.enabled ? t('pro.caps.needsKey') : t('common.off')}</Chip>}</>}
                      who={usable ? agentIds : []} action={<AddLink onClick={() => setSheet('connections')}>{t('pro.caps.manage')}</AddLink>} />
                  );
                })}
              </Section>
            )}
          </div>
        )}
      </div>
      {grant && config && <GrantSheet entry={grant} config={config} agents={agents} onClose={() => setGrant(null)} />}
      {sheet === 'skills' && <SkillsSheet agentCwd={agents.find((a) => a.isGod)?.cwd} onClose={() => setSheet(null)} onChanged={() => setGen((g) => g + 1)} />}
      {sheet === 'connections' && <ConnectionsSheet onClose={() => setSheet(null)} onChanged={() => setGen((g) => g + 1)} />}
    </div>
  );
}

/* ───────────────────────────── the marketplace ────────────────────────── */

/**
 * The curated catalog. Four kinds, four doors, and a card never offers a door
 * it does not have: an engine and a plugin get the command copied, because the
 * app has no installer for either and pretending otherwise would be the one
 * thing worse than not shipping this.
 */
function Marketplace({ q, kind, state, skills, tools, config, technical, onChanged, onGrant, onPrereq, onConnections }: {
  q: string; kind: MarketFilter; state: { skills: LoadedSkill[]; mcp: string[] }; skills: LoadedSkill[];
  tools: ToolSpec[]; config: HarnessConfig | null; technical: boolean;
  onChanged: () => void; onGrant: (e: McpCatalogEntry) => void; onPrereq: () => void; onConnections: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const groups = useMemo(() => groupMarket(filterMarket(q, kind)), [q, kind]);

  const install = async (e: MarketEntry) => {
    if (!e.url) return;
    setBusy(e.id);
    try {
      const res = await window.cth.skillsInstall(e.url, e.name);
      if (res.ok) { proToast(t('pro.market.installedToast', { name: e.name }), { tone: 'ok' }); onChanged(); }
      else proToast(skillInstallError(t, res, t('pro.market.installFailed', { name: e.name })), { tone: 'bad', ms: 7000 });
    } catch (err) {
      proToast(err instanceof Error ? err.message : t('pro.market.installFailed', { name: e.name }), { tone: 'bad' });
    } finally { setBusy(null); }
  };
  const turnOn = async (e: MarketEntry) => {
    if (!e.ref || !config) return;
    setBusy(e.id);
    try {
      await window.cth.updateConfig({ mcpDefaults: { ...(config.mcpDefaults ?? {}), [e.ref]: { enabled: true } } });
      proToast(t('pro.market.onToast', { name: e.name }), { tone: 'ok' });
    } catch {
      proToast(t('pro.market.onFailed', { name: e.name }), { tone: 'bad' });
    } finally { setBusy(null); }
  };
  const copy = (text: string) => {
    void window.cth.copyToClipboard(text).then(() => proToast(t('pro.market.copiedToast')));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1080 }}>
      <MarketHero onConnections={onConnections} />
      {(kind === 'all' || kind === 'skill') && <Note>{t('pro.market.skillNote')}</Note>}
      {(kind === 'all' || kind === 'mcp') && <Note>{t('pro.market.mcpNote')}</Note>}
      {groups.length === 0 && <Empty>{t('pro.market.noMatch')}</Empty>}
      {groups.map(({ group, entries }) => (
        <Section key={group} title={t(`pro.market.group.${group}`)} n={entries.length}>
          {entries.map((e) => {
            const have = entryInstalled(e, state);
            const command = e.kind === 'plugin' ? pluginCommand(e) : e.kind === 'tool' ? (tools.find((x) => x.id === e.ref)?.install.posix ?? null) : null;
            const local = installedSkillFor(e, skills);
            return (
              <MarketCard key={e.id} entry={e} have={have} command={command} technical={technical}
                note={e.kind === 'tool' ? t('pro.market.engineNote') : e.kind === 'plugin' ? t('pro.market.pluginNote') : undefined}
                actions={
                  e.kind === 'skill' ? (have
                    ? <Btn size="sm" onClick={() => { if (local) void window.cth.skillsReveal(local.path); }}>{t('pro.market.openFolder')}</Btn>
                    : <Btn size="sm" kind="primary" disabled={busy === e.id} onClick={() => { void install(e); }}>{busy === e.id ? t('pro.market.installing') : t('pro.market.install')}</Btn>)
                  : e.kind === 'mcp' ? (have
                    ? <Btn size="sm" onClick={() => { const c = e.ref && mcpCatalogEntry(e.ref); if (c) onGrant(c); }}>{t('pro.market.chooseAgents')}</Btn>
                    : <Btn size="sm" kind="primary" disabled={busy === e.id || !config} onClick={() => { void turnOn(e); }}>{busy === e.id ? t('pro.market.turningOn') : t('pro.market.turnOn')}</Btn>)
                  : e.kind === 'tool' ? (<>
                      <Btn size="sm" kind="primary" disabled={!command} onClick={() => { if (command) copy(command); }}>{t('pro.market.copyCommand')}</Btn>
                      <Btn size="sm" kind="ghost" onClick={onPrereq}>{t('pro.caps.checkPrereq')}</Btn>
                    </>)
                  : (<>
                      <Btn size="sm" kind="primary" disabled={!command} onClick={() => { if (command) copy(command); }}>{t('pro.market.copyCommand')}</Btn>
                      <Btn size="sm" kind="ghost" onClick={() => { if (e.url) void window.cth.openExternal(e.url); }}>{t('pro.market.learnMore')}</Btn>
                    </>)
                } />
            );
          })}
        </Section>
      ))}
    </div>
  );
}

/** The hero: what this list is, and the two doors that belong beside it.
 *  Connections and Role bundles live HERE, not in the header, so there is one
 *  place to find them and no duplicate button to wonder about. */
function MarketHero({ onConnections }: { onConnections: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ padding: '16px 18px', borderRadius: 10, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-200)', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{t('pro.market.hero.title')}</h2>
        <Chip tone="accent">{t('pro.market.hero.chip')}</Chip>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--cth-ink-700)', lineHeight: 1.5, maxWidth: 680 }}>{t('pro.market.hero.lead')}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
        <Btn onClick={onConnections}>{t('pro.caps.connections')}</Btn>
        <Btn kind="primary" onClick={() => openBundleSheet()}>{t('pro.caps.bundles')}</Btn>
      </div>
    </div>
  );
}

/** One catalog card, on the shared shell. Even 1px border all round; the state
 *  is a chip, never an edge. `command` is the literal text the copy button puts
 *  on the clipboard, printed so nobody has to trust the button. */
function MarketCard({ entry, have, command, note, technical, actions }: {
  entry: MarketEntry; have: boolean; command: string | null; note?: string; technical: boolean; actions: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <CardShell title={entry.name} chips={<>
      <Chip tone={KIND_TONE[entry.kind]}>{t(`pro.market.kind.${entry.kind}`)}</Chip>
      {have && <Chip tone="ok">{entry.kind === 'mcp' ? t('pro.market.on') : t('pro.market.installed')}</Chip>}
    </>}>
      <CardDesc text={entry.blurb} />
      <CardSource text={entry.source} />
      {command && <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', overflowWrap: 'anywhere' }}>{command}</code>}
      {technical && entry.url && <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', overflowWrap: 'anywhere' }}>{entry.url}</code>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>{actions}</div>
      {note && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{note}</span>}
    </CardShell>
  );
}

/* ───────────────────────────── the installed tab ──────────────────────── */

/**
 * What this workspace actually has. Both lists are read, never inferred: the
 * skills come from the scan of this machine, the servers from the resolver the
 * launch path uses. Nothing else is claimed installed, because nothing else is
 * recorded anywhere the app can read.
 */
function Installed({ q, skills, mcpOn, agents, agentIds, config, technical, onGrant, onManage, onGoMarket }: {
  q: string; skills: LoadedSkill[] | null; mcpOn: string[]; agents: Agent[]; agentIds: string[];
  config: HarnessConfig | null; technical: boolean;
  onGrant: (e: McpCatalogEntry) => void; onManage: () => void; onGoMarket: () => void;
}) {
  const { t } = useTranslation();
  if (skills === null) return <Empty>{t('pro.market.scanning')}</Empty>;
  const servers = MCP_CATALOG.filter((e) => mcpOn.includes(e.id));
  if (skills.length === 0 && servers.length === 0) {
    return (
      <SetupEmpty icon="capabilities" title={t('pro.market.empty.title')} lead={t('pro.market.empty.lead')}
        steps={[t('pro.market.empty.s1'), t('pro.market.empty.s2'), t('pro.market.empty.s3'), t('pro.market.empty.s4')]}
        action={{ label: t('pro.market.empty.action'), run: onGoMarket }} />
    );
  }
  const shownSkills = skills.filter((s) => matches(q, s.name, s.description, s.provider, s.scope));
  const shownServers = servers.filter((e) => matches(q, e.label, e.id, e.description));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1080 }}>
      {shownSkills.length > 0 && (
        <Section title={t('pro.market.installedSkills')} n={shownSkills.length} right={<AddLink onClick={onManage}>{t('pro.market.manageSkills')}</AddLink>}>
          {shownSkills.map((s) => (
            <CapCard key={s.path} label={s.name} desc={s.description} source={t('pro.caps.source.skill')} code={technical ? s.path : undefined}
              chips={<><Chip tone={KIND_TONE.skill}>{t('pro.market.kind.skill')}</Chip><Chip tone="muted">{PROVIDER_LABEL[s.provider] ?? s.provider}</Chip><Chip tone="outline">{t(`pro.caps.scope.${s.scope}`)}</Chip></>}
              who={agentsForSkill(s, agents)}
              action={<AddLink onClick={() => { void window.cth.skillsReveal(s.path); }}>{t('pro.market.openFolder')}</AddLink>} />
          ))}
        </Section>
      )}
      {shownServers.length > 0 && (
        <Section title={t('pro.market.installedMcp')} n={shownServers.length}>
          {shownServers.map((e) => (
            <CapCard key={e.id} label={e.label} desc={e.description} source={t('pro.caps.source.mcp')} code={technical ? e.id : undefined}
              chips={<><Chip tone={KIND_TONE.mcp}>{t('pro.market.kind.mcp')}</Chip><Chip tone={TIER_TONE[e.tier]}>{t(`pro.caps.tier.${e.tier}`)}</Chip><Chip tone="ok">{t('pro.market.on')}</Chip></>}
              who={agentsWithMcp(e, agentIds, config?.mcpDefaults, config?.agentMcp)}
              action={<AddLink onClick={() => onGrant(e)}>{t('pro.market.chooseAgents')}</AddLink>} />
          ))}
        </Section>
      )}
      {shownSkills.length === 0 && shownServers.length === 0 && <Empty>{t('pro.market.noMatch')}</Empty>}
    </div>
  );
}

/* ───────────────────────────── data hooks ─────────────────────────────── */

/** null until the scan answers, so the empty state is never a loading flash. */
function useLocalSkills(agents: Agent[], gen: number) {
  const cwds = useMemo(() => [...new Set(agents.map((a) => a.cwd).filter(Boolean))].sort(), [agents]);
  const key = cwds.join('\n');
  const [rows, setRows] = useState<LoadedSkill[] | null>(null);
  useEffect(() => {
    let alive = true;
    const list = cwds.length ? cwds : [''];
    Promise.all(list.map((cwd) => window.cth.skillsLocal(cwd || undefined).then((skills) => ({ cwd, skills })).catch(() => ({ cwd, skills: [] as LocalSkill[] }))))
      .then((perCwd) => { if (alive) setRows(foldSkills(perCwd)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, gen]);
  return rows;
}

/** Re-read when a sheet reports a change: that is where the list changes. */
function useConnections(gen: number): IntegrationRecordView[] {
  const [rows, setRows] = useState<IntegrationRecordView[]>([]);
  useEffect(() => {
    let alive = true;
    integrationsClient.list().then((r) => { if (alive) setRows(r); }).catch(() => undefined);
    return () => { alive = false; };
  }, [gen]);
  return rows;
}

/* ───────────────────────────── pieces ─────────────────────────────────── */

/** One section: the same header over the same 3 column grid on every tab. */
function Section({ title, n, right, children }: { title: string; n: number; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ minWidth: 0 }}>
      <h2 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--cth-ink-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {title} <span style={{ color: 'var(--cth-ink-500)', fontWeight: 500, fontSize: 12, fontFamily: 'var(--cth-font-mono)' }}>{n}</span>
        {right}
      </h2>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: 'var(--cth-ink-500)', padding: '8px 0' }}>{children}</div>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontSize: 12, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{children}</p>;
}

function AddLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ marginInlineStart: 'auto', border: 'none', background: 'transparent', padding: 0, font: 'inherit', fontSize: 11.5, fontWeight: 500, color: 'var(--cth-accent-text)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

/** The one card container every tab draws: even 1px border all round, title
 *  row with the kind chip first, then whatever lines the kind carries. */
function CardShell({ title, chips, children }: { title: string; chips: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <b style={{ fontWeight: 600, fontSize: 13, color: 'var(--cth-ink-900)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</b>
        {chips}
      </div>
      {children}
    </div>
  );
}

function CardDesc({ text }: { text: string }) {
  return <small title={text} style={{ fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: 1.45, overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{text}</small>;
}

function CardSource({ text }: { text: string }) {
  return <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{text}</span>;
}

/** One capability card on the shared shell. `code` is the technical
 *  rendering's id or path line; `who` is the avatar strip of fact. */
function CapCard({ label, desc, source, code, chips, who, action }: {
  label: string; desc: string; source: string; code?: string; chips: React.ReactNode; who: string[]; action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const agentById = useAgentById();
  return (
    <CardShell title={label} chips={chips}>
      {desc && <CardDesc text={desc} />}
      <CardSource text={source} />
      {code && <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{code}</code>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, minHeight: 24 }}>
        {who.length === 0
          ? <Chip tone="outline">{t('pro.caps.noAgent')}</Chip>
          : <AvatarStack agents={who.map(agentById).filter((a): a is Agent => !!a)} />}
        {action}
      </div>
    </CardShell>
  );
}

function AvatarStack({ agents, max = 8 }: { agents: Agent[]; max?: number }) {
  const shown = agents.slice(0, max);
  const more = agents.length - shown.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }} title={agents.map((a) => a.name).join(', ')}>
      {shown.map((a, i) => (
        <span key={a.id} style={{ marginInlineStart: i ? -6 : 0, borderRadius: 7, border: '2px solid var(--cth-cream-100)', background: 'var(--cth-cream-200)', display: 'grid', placeItems: 'center', width: 24, height: 24, overflow: 'hidden' }}>
          <Portrait agent={a} size={20} />
        </span>
      ))}
      {more > 0 && <span style={{ marginInlineStart: 6, fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>+{more}</span>}
    </div>
  );
}

function SheetHead({ title, onClose }: { title: string; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 12px 18px', borderBottom: '1px solid var(--cth-ink-300)' }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, flex: 1, color: 'var(--cth-ink-900)' }}>{title}</h2>
      <CloseX onClick={onClose} title={t('common.close')} />
    </div>
  );
}

/* ───────────────────────────── the grant sheet ────────────────────────── */

function GrantSheet({ entry, config, agents, onClose }: { entry: McpCatalogEntry; config: HarnessConfig; agents: Agent[]; onClose: () => void }) {
  const { t } = useTranslation();
  const floor = mcpEnabledFor(entry, config.mcpDefaults, undefined, '');
  const [busy, setBusy] = useState<string | null>(null);
  const setFloor = (enabled: boolean) => {
    setBusy('floor');
    window.cth.updateConfig({ mcpDefaults: { ...(config.mcpDefaults ?? {}), [entry.id]: { enabled } } }).catch(() => undefined).finally(() => setBusy(null));
  };
  const setAgent = (agentId: string, enabled: boolean | null) => {
    setBusy(agentId);
    window.cth.setAgentMcp(agentId, entry.id, enabled).catch(() => undefined).finally(() => setBusy(null));
  };
  return (
    <Sheet onClose={onClose} width={520}>
      <SheetHead title={entry.label} onClose={onClose} />
      <div style={{ overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Chip tone={TIER_TONE[entry.tier]}>{t(`pro.caps.tier.${entry.tier}`)}</Chip>
          <code style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{entry.id}</code>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--cth-ink-700)', lineHeight: 1.45 }}>{entry.description}</p>
        {entry.tier !== 'safe-readonly' && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--cth-ink-500)', lineHeight: 1.45, padding: 10, borderRadius: 8, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-200)' }}>{t(`pro.caps.tierNote.${entry.tier}`)}</p>
        )}
        <Row label={t('pro.caps.workspaceDefault')} hint={t('pro.caps.workspaceHint')} on={floor} busy={busy === 'floor'} onChange={setFloor} />
        <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />
        {agents.map((a) => {
          const claude = providerOf(a) === 'claude';
          const own = hasOwnMcpRow(config.agentMcp, a.id, entry.id);
          const on = mcpEnabledFor(entry, config.mcpDefaults, config.agentMcp, a.id);
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 32 }}>
              <Portrait agent={a} size={26} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>
                  {!claude ? t('pro.caps.notForEngine', { engine: PROVIDER_LABEL[providerOf(a)] ?? providerOf(a) }) : own ? t('pro.caps.ownRow') : t('pro.caps.followsWorkspace')}
                </span>
              </span>
              {claude && own && <Btn size="sm" kind="ghost" disabled={busy === a.id} onClick={() => setAgent(a.id, null)}>{t('pro.caps.useWorkspace')}</Btn>}
              {claude && <Switch on={on} onChange={(v) => setAgent(a.id, v)} label={`${a.name}: ${on ? t('common.on') : t('common.off')}`} />}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function Row({ label, hint, on, busy, onChange }: { label: string; hint: string; on: boolean; busy: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cth-ink-900)' }}>{label}</span>
        <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{hint}</span>
      </span>
      <span style={{ opacity: busy ? 0.5 : 1 }}><Switch on={on} onChange={onChange} label={label} /></span>
    </div>
  );
}

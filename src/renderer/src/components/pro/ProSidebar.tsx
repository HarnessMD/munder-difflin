/**
 * THE PRO SIDEBAR. Founder's order, 2 Sep 2026, prototype of record at
 * hive/shared/design/app-v2/prototype.html.
 *
 *   logo + org line
 *   Tasks · Inbox · Automations · Memory · Capabilities
 *   AGENTS   Agents (n live) · Temps (n running)
 *   TEAM     the Teams seam's rows (Team, Requests) — Creed's, reached by id
 *   profile row → drop-UP, BY STANDING (plan 6.3, through `can()` only):
 *     admin   Profile · Settings · Subscription & billing · Version & updates · Theme
 *     member  Profile · Settings · Version & updates · Theme (no billing row,
 *             no seat counts anywhere)
 *     solo    Profile · Settings · License key · Upgrade to Teams ·
 *             Version & updates · Theme
 *
 * SOLO HAS NO TEAM SECTION AT ALL (founder, 4 Sep 2026). Not a disabled row,
 * not a row with a padlock: the whole section is absent, because the Team
 * screen and Team knowledge are things a solo plan can never have rather than
 * things this person has not been granted yet. Which rows exist is `navFor`'s
 * answer, read through `proCompanyRows` so this file and the pane table in
 * App.tsx cannot disagree.
 *
 * THE OFFER IS MADE ONCE, HERE. "Upgrade to Teams" opens one sheet that says
 * what the network and Team knowledge are and where to buy them. One place, so
 * the rest of the app never has to mention a team to somebody who does not
 * have one.
 *
 * Collapses to a 60px icon strip (the chevron on its edge, or ⌘\); the state is
 * the same `cth.railCollapsed` the old rail kept, so nobody's preference moves.
 *
 * Every row opens a working surface; a row that opens nothing is the defect
 * the closed union in proNav.ts exists to prevent.
 */
import { createContext, Fragment, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import { useAgent } from '@/store/useAgent';
import { useSidebarAgents, type SidebarAgent } from './sidebarAgents';
import { useRailCollapsed, toggleRailCollapsed, useRailWidth, setRailWidth, type RailRowSpec } from '../professional/railState';
import { RAIL_WIDTH_MAX, RAIL_WIDTH_MIN, RAIL_WIDTH_STEP, dragRailWidth } from '@shared/railWidth';
import { useRtl } from '@/i18n/useDirection';
import { orderAgents } from '@shared/agentRecency';
import { applyAgentOrder, applyGroupOrder, orderFromGroups } from '@shared/agentOrder';
import { RailOrderContext, useRailDrag, useRailOrder } from './railOrder';
import { SIDEBAR_SEARCH_FROM, groupAgentsByProject, matchesAgentSearch, showsGroupHeadings } from '@shared/sidebarGroups';
import { CloseX, Chip, ConfirmDialog, Sheet, StatusDot, inputStyle, proToast, statusColor, statusTint } from './ui';
import { SpritePortrait } from '../SpritePortrait';
import { openQuestion, waitsOnHuman, type HiveTask } from '../TasksKanban';
import { compareByNewestAsk } from '../askMeOrder';
import { ticketOf } from '@/store/taskLedger';
import { useTaskLedger } from './taskData';
import { ageWord } from '@shared/railSeen';
import { ticketTipFacts } from '@shared/ticketTip';
import { previewLine } from '@shared/lineClamp';
import { followAgentHold, markAgentOpened, useFinishedSince, useHumanMailFor } from './railData';
import { NoteEditor, RowMenu, Strip, TipHead, TipLine, useRailTip, type RowMenuItem } from './railPieces';
import { requestInboxChat } from './inboxIntent';
import { TruncatedNote } from '../NoteTooltip';
import { useLastActivity } from './activityData';
import { openAgentSheet } from './agentSheetStore';
import { openAskMe } from './askMeModalStore';
import { asksFor } from '@shared/askMeBadge';
import { useOrg, useTeamsMode, isInOrg, useStanding } from '../team/teamsMode';
import { can } from '@shared/permissions';
import { soloConsoleUrl } from '@shared/soloPro';
import { useRoster } from '../team/useRoster';
import { useAppTheme } from '@/design/theme';
import brandLogo from '@brand/logo.png?url';
import { ProIcon, type ProIconName } from './icons';
import { PRO_SCREENS, proCompanyRows, proDestinations, type ProScreen } from './proNav';
import { ProUpgradeToTeams } from './onboarding/ProUpgradeToTeams';
import { CHORD_HINT } from './proKeys';
import { useBeat } from './MessagePulse';
import { EngineBadge, useEngineWords } from './Engine';
import { freeDoor, useFreeAccount } from '../../store/freeAccount';

/**
 * 288, from 244 (founder, 8 Sep 2026, card v052-sidebar-layout). In the agent
 * list the orchestrator's row carries the portrait, the Orchestrator chip, the
 * engine badge, the status dot and the note clip beside the name, and at 244
 * those fixed parts left the name about 35px: "Ste…". The row is not
 * redesigned; the column is wide enough for a name beside its badge.
 *
 * Since 0.5.3 rc.4 this is the DEFAULT: the edge is dragged between 220 and
 * 480 and a double click returns here (@shared/railWidth, RailEdge below).
 */
export const PRO_SIDEBAR_WIDTH = 288;
export const PRO_SIDEBAR_WIDTH_COLLAPSED = 60;
/** Whether the agent list under the Agents row is unfolded (phase 2, 0.4.9). */
const AGENTS_OPEN_KEY = 'cth.proAgentsOpen';
/** Which project groups are folded shut (0.5.3, feature 2). A JSON list of
 *  group keys; a group nobody folded is open, so a new project shows itself. */
const GROUPS_SHUT_KEY = 'cth.proAgentGroupsShut';

function readShutGroups(): string[] {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(GROUPS_SHUT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

/** Live for the sidebar count means "something is happening right now", the
 *  same four kinds the old rail's `live` pill counted. */
const LIVE = new Set(['working', 'thinking', 'typing', 'compacting']);

export interface ProSidebarProps {
  current: string;
  onSelect: (screen: ProScreen | string) => void;
  /** The Teams seam's rows: Team, Requests (with count). Keyed by pane id. */
  companyRows: RailRowSpec[];
  onToggleTheme: () => void;
  appVersion: string;
  /** Keep my agent order (Settings, General): the saved order is drawn and
   *  rows can be dragged. Off, the list orders itself. shared/agentOrder.ts. */
  keepAgentOrder?: boolean;
  savedAgentOrder?: string[];
  /** The project headings' order while it is on (config.projectOrder). */
  savedProjectOrder?: string[];
  /** Sidebar shows only agents and notes (config.sidebarAgentsNotesOnly). */
  agentsAndNotesOnly?: boolean;
}

/* SIDEBAR SHOWS ONLY AGENTS AND NOTES (0.5.3 rc.4, founder 25 Sep 2026: "one
   more setting which allows the user to not have any Ask me or any tickets
   listed next to the agent. Just the agent and the notes."). A context, not
   a row prop, so the memoised rows keep their four props and a flip of the
   setting still reaches every one of them. */
const AgentsAndNotesOnly = createContext(false);
const NO_FINISHED: ReturnType<typeof useFinishedSince> = [];

const ICON_FOR: Record<(typeof PRO_SCREENS)[number], ProIconName> = {
  tasks: 'tasks', inbox: 'inbox', automations: 'automations', memory: 'memory',
  capabilities: 'capabilities', puck: 'puck', agents: 'agents', temps: 'temps'
};

export function ProSidebar({
  current, onSelect, companyRows, onToggleTheme, appVersion, keepAgentOrder, savedAgentOrder, savedProjectOrder, agentsAndNotesOnly = false
}: ProSidebarProps) {
  const { t } = useTranslation();
  const collapsed = useRailCollapsed();
  const railWidth = useRailWidth();
  const [resizing, setResizing] = useState(false);
  // NINE FIELDS, NOT THE ROSTER (0.5.3, Pam's audit): the sidebar hears a
  // store write only when a field it orders, searches, groups or counts by
  // has changed. A pty chunk (action, progress, context) is not one, so it
  // reaches the one row it is about and nothing else (sidebarAgents.ts).
  const agents = useSidebarAgents();
  // Most recently used first (founder item 4), through the one shared
  // comparator the Inbox's YOUR TEAM list reads too. The orchestrator is
  // exempt: pinned first, drawn distinct (accent hairline + chip) below.
  const lastActivity = useLastActivity(useMemo(() => agents.map((a) => a.id), [agents]));
  const autoOrdered = useMemo(() => orderAgents(agents, (id) => lastActivity[id]?.ts), [agents, lastActivity]);
  // KEEP MY AGENT ORDER (founder, 24 Sep 2026). On, the saved list is drawn
  // and only a person moves a row; recency no longer reorders anything. A
  // move is drawn at once from `localOrder` and the config catches up.
  const keep = keepAgentOrder === true;
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  useEffect(() => { setLocalOrder(null); }, [savedAgentOrder]);
  const savedList = localOrder ?? savedAgentOrder;
  const orderedAgents = useMemo(
    () => (keep && savedList && savedList.length ? applyAgentOrder(autoOrdered, savedList) : autoOrdered),
    [keep, savedList, autoOrdered]
  );
  // The first time the setting is on with no list yet, the order on screen
  // right now becomes the list, so switching it on moves nothing.
  const froze = useRef(false);
  useEffect(() => {
    if (!keep || (savedAgentOrder && savedAgentOrder.length) || froze.current) return;
    const ids = orderFromGroups(groupAgentsByProject(autoOrdered).groups.map((g) => g.agents.map((a) => a.id)));
    if (!ids.length) return;
    froze.current = true;
    void window.cth.updateConfig({ agentOrder: ids }).catch(() => { froze.current = false; });
  }, [keep, savedAgentOrder, autoOrdered]);
  // 0.5.3, the sidebar as the status view (features 1 to 4). What is typed
  // narrows the list by name, note, project, job, model or engine; what is
  // left is drawn under its project. Both rules are pure, in
  // @shared/sidebarGroups. Nothing here changes what a ROW is given.
  const [agentQuery, setAgentQuery] = useState('');
  const [shutGroups, setShutGroupsState] = useState<string[]>(readShutGroups);
  const toggleGroup = (key: string) => {
    const next = shutGroups.includes(key) ? shutGroups.filter((k) => k !== key) : [...shutGroups, key];
    setShutGroupsState(next);
    try { window.localStorage.setItem(GROUPS_SHUT_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };
  const searching = agentQuery.trim().length > 0;
  const shownAgents = useMemo(() => orderedAgents.filter((a) => matchesAgentSearch(a, agentQuery)), [orderedAgents, agentQuery]);
  // Projects keep the order a person dragged them into while the setting is
  // on; with no list yet they follow their first member in the saved agent
  // order, which is already stable. Off, the automatic order as before.
  const [localProjects, setLocalProjects] = useState<string[] | null>(null);
  useEffect(() => { setLocalProjects(null); }, [savedProjectOrder]);
  const projectList = localProjects ?? savedProjectOrder;
  const sortGroups = useCallback(<G extends { key: string }>(gs: G[]): G[] => (keep && projectList && projectList.length ? applyGroupOrder(gs, projectList) : gs), [keep, projectList]);
  const grouped = useMemo(() => {
    const g = groupAgentsByProject(shownAgents);
    return { ...g, groups: sortGroups(g.groups) };
  }, [shownAgents, sortGroups]);
  const headings = showsGroupHeadings(grouped.groups);
  // What a drag or Move up / Move down works on: every group, top to bottom.
  const orderGroups = useMemo(() => sortGroups(groupAgentsByProject(orderedAgents).groups).map((g) => g.agents.map((a) => a.id)), [orderedAgents, sortGroups]);
  // The projects that can move: every named one (no project stays last).
  const projectKeys = useMemo(() => [sortGroups(groupAgentsByProject(orderedAgents).groups).filter((g) => g.key !== '').map((g) => g.key)], [orderedAgents, sortGroups]);
  const commitProjects = useCallback((next: string[][]) => {
    const keys = next[0] ?? [];
    setLocalProjects(keys);
    void window.cth.updateConfig({ projectOrder: keys }).catch(() => setLocalProjects(null));
  }, []);
  const commitOrder = useCallback((next: string[][]) => {
    const ids = orderFromGroups(next);
    setLocalOrder(ids);
    void window.cth.updateConfig({ agentOrder: ids }).catch(() => setLocalOrder(null));
  }, []);
  const railDrag = useRailDrag(keep && !searching && !collapsed, orderGroups, commitOrder);
  const projectDrag = useRailDrag(keep && !searching && !collapsed && headings, projectKeys, commitProjects);
  // One function for the life of the sidebar, so a memoised row's props are
  // the same between renders and it can decline to render. `onSelect` itself
  // is whatever the shell passed this time; the ref keeps the latest one.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectAgent = useCallback((id: string) => onSelectRef.current(`agent:${id}`), []);
  const goTo = useCallback((screen: string) => onSelectRef.current(screen), []);
  // A 1:1 set anywhere reaches the row's chip through main's push (Pam's audit 4).
  useEffect(() => { followAgentHold(); }, []);
  const agentRow = (a: SidebarAgent) => {
    const row = <AgentRow key={a.id} id={a.id} active={current === `agent:${a.id}`} onSelect={selectAgent} onGo={goTo} />;
    // The orchestrator is pinned: he never moves and has no grip.
    return a.isGod ? row : railDrag.wrap(a.id, row, a.name);
  };
  const live = agents.filter((a) => LIVE.has(a.status)).length;
  const running = useRunningWorkers();
  const mode = useTeamsMode();
  const org = useOrg();
  const inOrg = isInOrg(mode);
  const standing = useStanding();
  // ONE ANSWER about what exists here (proNav → @shared/soloPro → can()).
  const dest = proDestinations(standing);
  const rowsForStanding = proCompanyRows(standing, companyRows);
  const theme = useAppTheme();
  const [menu, setMenu] = useState(false);
  const [offer, setOffer] = useState(false);
  /* Item 5, the other direction. `null` is closed; a string is the reason the
     switch was refused, shown in a sheet rather than swallowed. */
  const [leaveRefusal, setLeaveRefusal] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  // Sign out is two presses, the same rule ProfileScreen's leave uses: the
  // first arms the row for six seconds, the second signs out. Closing the
  // drop-up disarms it.
  const [signOutArmed, setSignOutArmed] = useState(false);
  useEffect(() => {
    if (!signOutArmed) return;
    const id = window.setTimeout(() => setSignOutArmed(false), 6000);
    return () => window.clearTimeout(id);
  }, [signOutArmed]);
  useEffect(() => { if (!menu) setSignOutArmed(false); }, [menu]);
  const [agentsOpen, setAgentsOpenState] = useState<boolean>(() => { try { return window.localStorage.getItem(AGENTS_OPEN_KEY) !== '0'; } catch { return true; } });
  const setAgentsOpen = (next: boolean) => { setAgentsOpenState(next); try { window.localStorage.setItem(AGENTS_OPEN_KEY, next ? '1' : '0'); } catch { /* noop */ } };
  const meRef = useRef<HTMLDivElement | null>(null);

  // The drop-up closes on an outside click, Escape, or once a row is chosen.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (meRef.current && !meRef.current.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [menu]);

  const person = org?.you ?? null;
  const { free } = useFreeAccount();
  const personName = person?.name || t('pro.you');
  // Two lines, two facts, never the same one twice (founder, 5 Sep 2026:
  // "Solo · this machine" said nothing and was drawn in both places). The
  // header is the PLACE: the org, or the plan. The profile row is the PERSON:
  // the name over the email this machine signed in with, the org's record
  // first and the free account after it, which every install has now.
  const personLine = person?.email || free?.email || t('pro.profile.emailUnknown');
  const orgLine = org?.name ? `${org.name} · Teams` : t('pro.plan.pro');

  const rows = useMemo(() => ({
    work: PRO_SCREENS.filter((s) => !['agents', 'temps'].includes(s))
  }), []);

  const label = (s: string) => t(`pro.nav.${s}`);
  const isOn = (id: string) => current === id || (id === 'agents' && current.startsWith('agent:'));

  return (
    <AgentsAndNotesOnly.Provider value={agentsAndNotesOnly}>
    <aside
      // A rail: a row's tooltip opens to the right of it, never over the rows
      // below (founder, 23 Sep 2026; @shared/tipPlacement).
      data-tip-surface="rail"
      style={{
        position: 'relative', flexShrink: 0,
        width: collapsed ? PRO_SIDEBAR_WIDTH_COLLAPSED : railWidth,
        display: 'flex', flexDirection: 'column', minHeight: 0,
        background: 'var(--cth-paper-100)', borderRight: '1px solid var(--cth-ink-300)',
        fontFamily: 'var(--cth-font-ui)', fontSize: 13, color: 'var(--cth-ink-900)',
        // No transition while the edge is dragged: the column follows the
        // pointer, it does not chase it.
        transition: resizing ? 'none' : 'width 120ms ease'
      }}
    >
      {!collapsed && <RailEdge width={railWidth} onResizing={setResizing} />}
      <button
        type="button"
        onClick={toggleRailCollapsed}
        title={`${collapsed ? t('rail.expand') : t('rail.collapse')} (${CHORD_HINT.sidebar})`}
        aria-label={collapsed ? t('rail.expand') : t('rail.collapse')}
        style={{
          position: 'absolute', top: 16, right: -13, zIndex: 6,
          width: 26, height: 26, borderRadius: '50%',
          background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-300)',
          display: 'grid', placeItems: 'center', color: 'var(--cth-ink-500)', cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
        }}
      >
        <ProIcon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={12} />
      </button>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '14px 0 10px' : '14px 14px 10px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <img src={brandLogo} alt="" style={{ width: 28, height: 28, borderRadius: 7, display: 'block' }} />
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Munder Difflin</div>
            <div style={{ fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{orgLine}</div>
          </div>
        )}
      </div>

      {/* THE MIDDLE IS THE ONLY THING THAT SCROLLS (card
          sidebar-no-scroll-profile-unreachable, founder 6 Sep 2026). The
          column used to be one growing stack: two agents were enough for the
          list to push the profile row past the viewport with no way to reach
          it, because no child owned a scroll region. Header above, profile
          row below, both pinned; everything between lives here. minHeight: 0
          is load bearing: without it this flex child refuses to shrink below
          its content and the whole defect comes back.

          NO VISIBLE SCROLLBAR, SCROLLING KEPT (founder, 8 Sep 2026, card
          v052-sidebar-layout: "we do not need any scroll bar in the sidebar").
          `cth-scroll-hidden` (global.css) is `scrollbar-width: none` plus a
          zero width `::-webkit-scrollbar`, which is the one form that also
          holds on Windows and Linux: there a classic scrollbar takes layout
          width, so hiding it by colour alone would leave a 12px gutter and a
          narrower column than the width above says. Wheel, trackpad and
          keyboard scrolling are untouched; only the track is gone. */}
      <div data-sidebar-scroll style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }} className="cth-scroll-hidden">
      <nav style={{ padding: collapsed ? '4px 10px' : '4px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {rows.work.map((s) => (
          <NavRow key={s} id={s} label={label(s)} icon={ICON_FOR[s]} active={isOn(s)} collapsed={collapsed} onClick={() => onSelect(s)} />
        ))}
      </nav>

      <SectionLabel
        collapsed={collapsed}
        trailing={(
          <button
            type="button" data-add-agent
            title={t('rail.addAgent')} aria-label={t('rail.addAgent')}
            onClick={() => openAgentSheet({ mode: 'add' })}
            style={{
              width: 18, height: 18, borderRadius: 5, padding: 0, flexShrink: 0,
              border: '1px solid var(--cth-ink-300)', background: 'transparent', color: 'var(--cth-ink-500)',
              display: 'grid', placeItems: 'center', cursor: 'pointer', font: 'inherit', lineHeight: 1
            }}
          >
            <ProIcon name="plus" size={11} />
          </button>
        )}
      >{t('pro.section.agents')}</SectionLabel>
      <nav style={{ padding: collapsed ? '4px 10px' : '4px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <NavRow id="agents" label={label('agents')} icon={ICON_FOR.agents} active={isOn('agents')} collapsed={collapsed} onClick={() => onSelect('agents')}
          trailing={(
            <>
              <Live n={live} word={t('pro.live')} />
              <span
                role="button" tabIndex={0} data-agent-list-toggle
                aria-expanded={agentsOpen}
                aria-label={agentsOpen ? t('pro.sidebar.collapseAgents') : t('pro.sidebar.expandAgents')}
                title={agentsOpen ? t('pro.sidebar.collapseAgents') : t('pro.sidebar.expandAgents')}
                onClick={(e) => { e.stopPropagation(); setAgentsOpen(!agentsOpen); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setAgentsOpen(!agentsOpen); } }}
                style={{ display: 'inline-grid', placeItems: 'center', width: 18, height: 18, borderRadius: 5, color: 'var(--cth-ink-500)', marginLeft: 4, transform: agentsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}
              >
                <ProIcon name="chevronRight" size={11} />
              </span>
            </>
          )} />
        {agentsOpen && !collapsed && (
          <div data-agent-list style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '2px 0 4px 10px' }}>
            {agents.length >= SIDEBAR_SEARCH_FROM && (
              <label data-agent-search style={{ display: 'flex', alignItems: 'center', gap: 6, height: 26, margin: '2px 8px 4px 0', padding: '0 8px', borderRadius: 7, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', color: 'var(--cth-ink-500)' }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><circle cx={11} cy={11} r={7} /><path d="M20 20l-3.5-3.5" /></svg>
                <input
                  value={agentQuery} onChange={(e) => setAgentQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape' && agentQuery) { e.stopPropagation(); setAgentQuery(''); } }}
                  placeholder={t('pro.sidebar.searchAgents')} aria-label={t('pro.sidebar.searchAgents')}
                  style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', font: 'inherit', fontSize: 12, color: 'var(--cth-ink-900)' }}
                />
              </label>
            )}
            {searching && shownAgents.length === 0 && (
              <div data-agent-search-empty style={{ padding: '6px 8px 8px 2px', fontSize: 11.5, lineHeight: 1.4, color: 'var(--cth-ink-500)' }}>{t('pro.sidebar.noAgentMatches', { query: agentQuery.trim() })}</div>
            )}
            <RailOrderContext.Provider value={railDrag.order}>
            {grouped.pinned.map(agentRow)}
            {grouped.groups.map((g) => {
              // A search opens every group: a match inside a folded group that
              // stays hidden is a search that found nothing.
              const open = searching || !shutGroups.includes(g.key);
              const movable = projectDrag.order.enabled && g.key !== '';
              const body = (
                <>
                  {headings && (
                    <button
                      type="button" data-agent-group={g.key} aria-expanded={open}
                      onClick={() => toggleGroup(g.key)}
                      onPointerDown={movable ? (e) => projectDrag.headingDown(e, g.key) : undefined}
                      title={movable ? t('pro.rail.dragProject', { name: g.label }) : (g.label || t('pro.sidebar.noProject'))}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', margin: '6px 0 1px', padding: '3px 8px 3px 2px', border: 'none', background: 'transparent', font: 'inherit', cursor: movable ? (projectDrag.dragging === g.key ? 'grabbing' : 'grab') : 'pointer', userSelect: 'none', touchAction: movable ? 'none' : undefined, color: 'var(--cth-ink-500)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textAlign: 'start' }}
                    >
                      <span style={{ display: 'inline-grid', placeItems: 'center', width: 12, height: 12, flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}><ProIcon name="chevronRight" size={9} /></span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.label || t('pro.sidebar.noProject')}</span>
                      <span style={{ flexShrink: 0, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{g.agents.length}</span>
                    </button>
                  )}
                  {open && g.agents.map(agentRow)}
                </>
              );
              return movable ? projectDrag.group(g.key, body) : <Fragment key={g.key || '(none)'}>{body}</Fragment>;
            })}
            </RailOrderContext.Provider>
          </div>
        )}
        <NavRow id="temps" label={label('temps')} icon={ICON_FOR.temps} active={isOn('temps')} collapsed={collapsed} onClick={() => onSelect('temps')}
          trailing={<Live n={running} word={t('pro.running')} />} />
      </nav>

      {/* Absent, not disabled, when this install has no team: the section
          label with an empty list under it is the same lie as a dead row. */}
      {rowsForStanding.length > 0 && (
        <>
          <SectionLabel collapsed={collapsed}>{t('pro.section.team')}</SectionLabel>
          <nav style={{ padding: collapsed ? '4px 10px' : '4px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {rowsForStanding.map((r) => (
              <NavRow key={r.id} id={r.id} label={r.label} icon="team" active={isOn(r.id)} collapsed={collapsed} onClick={() => onSelect(r.id)}
                trailing={r.count ? <Count value={r.count} hot /> : r.id === 'team' && inOrg ? <OnlineCount word={t('pro.online')} /> : undefined} />
            ))}
          </nav>
        </>
      )}

      </div>

      {/* Profile row + drop-up */}
      {/* SHORTER (founder, 8 Sep 2026, card v052-sidebar-layout: the name
          and email block "takes more vertical space than it earns"): 4px of
          outer padding instead of 8, a 22px monogram instead of 26, and the
          two lines set tight. Still two facts, the name over the email, which
          the 5 Sep ruling asked for. */}
      <div ref={meRef} style={{ position: 'relative', padding: '4px 6px', borderTop: '1px solid var(--cth-ink-300)' }}>
        {menu && (
          <div
            role="menu"
            style={{
              position: 'absolute', left: 8, bottom: 'calc(100% - 4px)',
              width: collapsed ? 236 : 'calc(100% - 16px)',
              background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-300)',
              borderRadius: 10, boxShadow: 'var(--cth-shadow-hard)', padding: 6, zIndex: 20,
              /* ITEM 6, THE SIDEBAR OVERFLOW (founder, 6 Sep 2026). The middle
                 of the column got its scroll region on 6 Sep
                 (sidebar-no-scroll-profile-unreachable), but THIS menu was
                 left unbounded: absolutely positioned, growing upward from the
                 profile row, with no maxHeight and no overflow. A solo admin
                 sees up to nine rows here (profile, settings, billing, licence,
                 upgrade, back to individual, updates, theme, sign out), and on
                 a short window the stack runs off the top of the screen with
                 the first rows unreachable and nothing to scroll. Capping it to
                 the space that actually exists above the row is the whole fix;
                 the menu scrolls instead of escaping. */
              maxHeight: 'calc(100vh - 96px)', overflowY: 'auto'
            }}
            className="cth-scroll-hidden"
          >
            <MenuRow icon="profile" label={t('pro.menu.profile')} onClick={() => { setMenu(false); onSelect('profile'); }} />
            <MenuRow icon="settings" label={t('pro.menu.settings')} hint={CHORD_HINT.settings} onClick={() => { setMenu(false); onSelect('settings'); }} />
            {can(standing, 'billing.view') && (
              <MenuRow icon="billing" label={t('pro.menu.billing')} onClick={() => { setMenu(false); onSelect('billing'); }} />
            )}
            {/* Solo, and only solo. `ownLicense` and `offerTeams` are one
                answer from `navFor`, which is `can()` over the two families
                the founder named; the drop-up still asks nobody about
                isAdmin. The license row opens the person's OWN console, which
                is where a solo plan is bought, read back and managed. */}
            {dest.ownLicense && (
              <MenuRow icon="external" label={t('pro.menu.license')} onClick={() => { setMenu(false); void window.cth.openExternal?.(soloConsoleUrl()); }} />
            )}
            {dest.offerTeams && (
              <MenuRow icon="team" label={t('pro.menu.upgrade')} onClick={() => { setMenu(false); setOffer(true); }} />
            )}
            {/* ITEM 5, TEAM BACK TO INDIVIDUAL (founder, 6 Sep 2026). The
                mirror of the row above, so both directions are one click from
                the same menu. Main holds the condition, not this row: the
                relay is asked whether anyone else is in the org, and a refusal
                comes back with the count so the sheet can say why. Refusing
                here from a cached roster would be guessing at the one moment
                where guessing costs somebody their team. */}
            {inOrg && (
              <MenuRow
                icon="profile"
                label={t('pro.menu.leaveTeam')}
                onClick={() => {
                  if (leaving) return;
                  setMenu(false);
                  setLeaving(true);
                  void window.cth.teamsLeave?.()
                    .then((r) => {
                      if (r.ok) return; // the gate re-admits as individual
                      setLeaveRefusal(r.reason === 'has-teammates'
                        ? t('pro.menu.leaveTeamHasMates', { count: r.teammates })
                        : t('pro.menu.leaveTeamUnreachable'));
                    })
                    .catch(() => setLeaveRefusal(t('pro.menu.leaveTeamUnreachable')))
                    .finally(() => setLeaving(false));
                }}
              />
            )}
            <MenuRow icon="update" label={t('pro.menu.updates')} hint={`v${appVersion}`} onClick={() => { setMenu(false); onSelect('updates'); }} />
            <div style={{ borderTop: '1px solid var(--cth-ink-300)', margin: '6px 0' }} />
            <MenuRow icon="theme" label={t('pro.menu.theme')} hint={theme} onClick={() => { onToggleTheme(); }} />
            {/* Solo only: an org member leaves through Profile, where the
                consequences (a new fingerprint) are spelled out. A solo
                sign-out forgets the account and the licence on this machine
                and lands on the entry door. */}
            {dest.ownLicense && (
              <>
                <div style={{ borderTop: '1px solid var(--cth-ink-300)', margin: '6px 0' }} />
                <MenuRow
                  icon="arrowRight"
                  label={signOutArmed ? t('pro.menu.signOutConfirm') : t('pro.menu.signOut')}
                  onClick={() => {
                    if (!signOutArmed) { setSignOutArmed(true); return; }
                    setMenu(false);
                    void freeDoor.signOut();
                  }}
                />
              </>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-haspopup="menu"
          aria-expanded={menu}
          data-standing={standing}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: collapsed ? '4px 0' : '4px 6px', justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 8, background: menu ? 'var(--cth-surface-active)' : 'transparent',
            border: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit'
          }}
        >
          <Initials name={personName} />
          {!collapsed && (
            <>
              <span data-profile-lines style={{ minWidth: 0, flex: 1, lineHeight: 1.2 }}>
                <span style={{ display: 'block', fontWeight: 500, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personName}</span>
                <span style={{ display: 'block', fontSize: 10.5, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personLine}</span>
              </span>
              <ProIcon name={menu ? 'chevronDown' : 'chevronUp'} size={12} style={{ color: 'var(--cth-ink-500)' }} />
            </>
          )}
        </button>
      </div>

      {/* THE ONE PLACE A TEAM IS OFFERED. Everywhere else a solo install is
          simply an app without those features, which is what the founder's
          "not a disabled item in the sidebar" means in practice. */}
      {offer && (
        <Sheet onClose={() => setOffer(false)} width={520}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px 0 16px' }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t('pro.menu.upgrade')}</span>
            <CloseX onClick={() => setOffer(false)} title={t('common.close')} />
          </div>
          <div style={{ padding: 16, overflowY: 'auto' }}>
            <ProUpgradeToTeams onSetUpTeam={() => { void window.cth.openExternal?.('https://harnessmd.com/checkout'); }} />
          </div>
        </Sheet>
      )}
      {leaveRefusal && (
        <Sheet onClose={() => setLeaveRefusal(null)} width={420}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 0' }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t('pro.menu.leaveTeam')}</span>
            <CloseX onClick={() => setLeaveRefusal(null)} title={t('common.close')} />
          </div>
          <div style={{ padding: 16, fontSize: 12.5, lineHeight: 1.5, color: 'var(--cth-ink-700)' }}>
            {leaveRefusal}
          </div>
        </Sheet>
      )}
    </aside>
    </AgentsAndNotesOnly.Provider>
  );
}

/* ---- pieces ------------------------------------------------------------- */

function NavRow({ id, label, icon, active, collapsed, onClick, trailing }: {
  id: string; label: string; icon: ProIconName; active: boolean; collapsed: boolean;
  onClick: () => void; trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-screen={id}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: collapsed ? '8px 0' : '6px 8px', justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 7, border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit',
        background: active ? 'var(--cth-surface-active)' : 'transparent',
        color: active ? 'var(--cth-ink-900)' : 'var(--cth-ink-700)',
        fontWeight: active ? 500 : 400, position: 'relative'
      }}
    >
      <ProIcon name={icon} style={{ opacity: 0.85 }} />
      {!collapsed && (
        <>
          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          {trailing}
        </>
      )}
    </button>
  );
}

/**
 * THE ROW, V2 (0.5.3, F25; Pam's prototype hive/shared/design/sidebar-pro/v3,
 * founder approved 22 Sep 2026, HANDOFF.md is the spec of record). The row
 * answers "what is this agent doing" before anything else:
 *
 *   line 1  name (bold while something is unread), orchestrator chip, 1:1
 *           chip, and at the far right the unread badge or, with no note,
 *           the clip on hover
 *   line 2  engine tile and model on the left, the status word on the right
 *   line 3  the context bar with "N% context"; absent with no session
 *   line 4  task id and title; absent with no card
 *   (line 5, the live action and its tip, removed for 0.5.3 rc.5 by the
 *   founder: "The tool call and last tool call info ... is useless")
 *   strips  Asked you, Crashed, Finished. Messages are not a strip: they are
 *           the badge, whose hover lists them and which clears only when the
 *           agent is opened, never on hover.
 *   note    the clip in front of the note, three lines, inline editor
 *
 * Click opens the agent. Right click: Open, Message, Pause or Resume tools,
 * Hold or Release 1:1, Rename, Add or Edit note, Archive. No click to open
 * details anywhere (founder).
 *
 * THE ROW IS ITS OWN SUBSCRIBER (Pam's audit). It is given an id and reads
 * its agent through `useAgent`; the mail, the marks, the ledger's ticket and
 * the activity stamp come through per row selectors (railData.ts); memo on
 * the four props means a hook event on another agent never reaches this
 * function. The age text alone follows the 30 s clock.
 * test/v053-sidebar-row-renders counts it; test/v053-pro-rail-v2 pins it.
 */
const AgentRow = memo(function AgentRow({ id, active, onSelect, onGo }: { id: string; active: boolean; onSelect: (id: string) => void; onGo: (screen: string) => void }) {
  const agent = useAgent(id);
  // Gone between the list's render and this one (archived, removed): nothing
  // to draw, and the list's next render drops the row.
  if (!agent) return null;
  return <AgentRowBody agent={agent} active={active} onSelect={onSelect} onGo={onGo} />;
});

/** The card a row names: the app writes ids, an orchestrator writes names. */
function ticketFor(tasks: HiveTask[] | null, agent: Agent): HiveTask | null {
  return ticketOf(tasks, agent.id) ?? ticketOf(tasks, agent.name);
}

/** The question this agent is waiting on the person for: the session's own
 *  block reason first, else the NEWEST open ask of its own (founder, 24 Sep:
 *  "if more than 1 ask me is present then the sidebar should always show the
 *  most recent ask me"). The list is the Ask me section's, found by the same
 *  rule in the same order, so the strip is that section's first row and the
 *  card it opens is the one it shows. Before this the strip took the first
 *  card in ledger order, which is creation order, not ask order. */
function askFor(agent: Agent, tasks: HiveTask[] | null): { text?: string; card?: string } {
  const newest = tasks
    ? asksFor(tasks.filter(waitsOnHuman), agent.id, agent.name, agent.isGod === true).sort((a, b) => compareByNewestAsk(openQuestion(a), openQuestion(b)))[0]
    : undefined;
  const own = agent.blockReason?.summary?.trim();
  // The ask is written in markdown for the Ask me card; the strip is one
  // plain line, so the syntax goes and the words stay (T133: the strip
  // printed "**Which accent colour...** - `sky`" raw).
  if (own) return { text: own, card: newest?.id };
  if (!newest) return {};
  return { text: previewLine(openQuestion(newest)?.q ?? '') || undefined, card: newest.id };
}

function AgentRowBody({ agent, active, onSelect, onGo }: { agent: Agent; active: boolean; onSelect: (id: string) => void; onGo: (screen: string) => void }) {
  const { t } = useTranslation();
  const beat = useBeat(agent.id);
  const isGodRow = agent.isGod === true;
  const engine = useEngineWords(agent.provider, agent.model);
  const setAgentNote = useStore((s) => s.setAgentNote);
  const renameAgent = useStore((s) => s.renameAgent);
  const archiveAgent = useStore((s) => s.archiveAgent);
  const updateAgent = useStore((s) => s.updateAgent);
  const { tasks } = useTaskLedger(10_000);
  // Agents and notes only: no card, no ask, no finished card on the row. The
  // live action, the crash strip and the note stay; the bell has every ask.
  const bare = useContext(AgentsAndNotesOnly);
  const ticket = bare ? null : ticketFor(tasks, agent);
  // The card behind Asked you, when there is one: clicking the strip opens the
  // Ask me modal on it, over whatever screen is up, and never navigates
  // (founder: answer right there). A session's own block reason keeps the
  // newest card behind it when one waits, as before.
  const { text: ask, card: askCard } = useMemo(() => (bare ? ({} as ReturnType<typeof askFor>) : askFor(agent, tasks)), [agent, tasks, bare]);
  const mail = useHumanMailFor(agent.id);
  const finishedCards = useFinishedSince(agent.id, agent.name);
  const finished = bare ? NO_FINISHED : finishedCards;
  const tip = useRailTip();
  const railOrder = useRailOrder();
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(agent.name);
  const [menu, setMenu] = useState<{ x: number; y: number; paused?: boolean } | null>(null);
  const [archiveAsk, setArchiveAsk] = useState(false);
  const statusWord = t(`pro.status.${agent.status}`);
  const statusPaint = statusColor(agent.status);

  /* CONTEXT PERCENTAGE (founder, 6 Sep 2026, item 8). The same two fields and
     the same arithmetic AgentScreen uses (AgentScreen.tsx: ctxPct), so the
     sidebar and the agent's own screen can never disagree about how full a
     session is. Null means no live session: the line is absent rather than a
     confident 0%. Thresholds match `Meter`. */
  const ctxPct = agent.contextLimit && agent.contextTokens !== undefined
    ? Math.min(100, Math.round((agent.contextTokens / agent.contextLimit) * 100))
    : null;
  const ctxColor = ctxPct === null ? undefined
    : ctxPct >= 90 ? 'var(--cth-status-blocked)'
      : ctxPct >= 75 ? 'var(--cth-status-waiting)'
        : 'var(--cth-ink-500)';

  // Bold name: mail the person has not looked at, a card finished since, or
  // a question waiting. Hover clears nothing; opening the agent does.
  const unread = mail.count > 0 || finished.length > 0 || !!ask;

  const open = () => { markAgentOpened(agent.id, agent.name); tip.close(); onSelect(agent.id); };
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const saveNote = (text: string) => {
    setAgentNote(agent.id, text.trim());
    setEditing(false);
    proToast(text.trim() ? t('pro.rail.noteSaved') : t('pro.rail.noteRemoved'));
  };
  const commitName = async () => {
    const v = nameDraft.trim();
    setRenaming(false);
    if (v && v !== agent.name) { const r = await renameAgent(agent.id, v); if (!r.ok) proToast(r.error ?? t('pro.rail.renameFailed'), { tone: 'bad' }); }
  };
  const pause = async (paused: boolean) => {
    const sn = paused ? await window.cth.controlResume(agent.id) : await window.cth.controlPause(agent.id, true);
    proToast(sn?.paused ? t('pro.room.pausedToast', { name: agent.name }) : t('pro.room.resumedToast', { name: agent.name }));
  };
  const hold = async () => {
    const next = !agent.onHold;
    const res = await window.cth.hiveSetAgentHold(agent.id, next).catch(() => ({ ok: false as const }));
    if (!res.ok) { proToast(t('pro.room.holdFailed'), { tone: 'bad' }); return; }
    updateAgent(agent.id, { onHold: next });
  };
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    tip.close();
    setMenu({ x: e.clientX, y: e.clientY });
    void window.cth.controlSnapshot?.(agent.id).then((sn) => setMenu((m) => (m ? { ...m, paused: !!sn?.paused } : m))).catch(() => { /* unknown, the label says pause */ });
  };
  const menuItems: (RowMenuItem | 'rule')[] = menu ? [
    { id: 'open', label: t('pro.rail.menu.open'), run: open },
    { id: 'message', label: t('pro.rail.menu.message'), run: () => { requestInboxChat(agent.id); onGo('inbox'); } },
    { id: 'pause', label: menu.paused ? t('pro.room.resumeTools') : t('pro.room.pauseTools'), run: () => { void pause(!!menu.paused); } },
    { id: 'hold', label: agent.onHold ? t('pro.rail.menu.release') : t('pro.rail.menu.hold'), run: () => { void hold(); } },
    'rule',
    { id: 'rename', label: t('pro.rail.menu.rename'), run: () => { setNameDraft(agent.name); setRenaming(true); } },
    { id: 'note', label: agent.note ? t('pro.rail.noteEdit') : t('pro.rail.noteAdd'), run: () => setEditing(true) },
    // The keyboard way to reorder, while Keep my agent order is on.
    ...(railOrder.canMove(agent.id, -1) ? [{ id: 'moveUp', label: t('pro.rail.menu.moveUp'), run: () => railOrder.move(agent.id, -1) }] : []),
    ...(railOrder.canMove(agent.id, 1) ? [{ id: 'moveDown', label: t('pro.rail.menu.moveDown'), run: () => railOrder.move(agent.id, 1) }] : []),
    'rule',
    { id: 'archive', label: t('pro.rail.menu.archive'), danger: true, run: () => setArchiveAsk(true) }
  ] : [];

  const showBadgeTip = (el: HTMLElement) => {
    const now = Date.now();
    tip.open(el, (
      <>
        <TipHead>{t('pro.rail.newFrom', { count: mail.count, name: agent.name })}</TipHead>
        {mail.texts.map((m) => <TipLine key={m.id} text={m.subject || m.body} age={ageWord(Date.parse(m.at) || now, now)} />)}
      </>
    ));
  };

  // The ticket line's tip (founder, 25 Sep 2026: "When we hover on the ticket
  // on the sidebar it should show the ticket details in the tooltip"). The
  // same rail tip and timing as the live line; the facts are @shared/ticketTip.
  // No foot: a click on the line opens the agent, like the rest of the row.
  const showTicketTip = (el: HTMLElement) => {
    if (!ticket) return;
    const f = ticketTipFacts(ticket);
    const now = Date.now();
    // The ledger names an agent by id or by name; the tip says the name. Read
    // once, here, so the row does not follow the whole roster.
    const assignee = f.assignee ? (useStore.getState().agents.find((a) => a.id === f.assignee || a.name === f.assignee)?.name ?? f.assignee) : null;
    const pri = f.priority?.kind === 'level' ? t('pro.tasks.priority', { level: f.priority.level }) : f.priority?.label;
    tip.open(el, (
      <>
        <TipHead>{[f.key, t(`pro.tasks.status.${f.status}`, { defaultValue: f.status }), pri].filter(Boolean).join(' · ')}</TipHead>
        <TipLine text={f.title} full />
        {f.description && <TipLine text={f.description} full />}
        {assignee && <TipLine text={t('pro.rail.ticketAssignee', { name: assignee })} />}
        {f.createdAt !== null && <TipLine text={t('pro.rail.ticketCreated', { age: ageWord(f.createdAt, Math.max(now, f.createdAt)) })} />}
        {f.dependsOn > 0 && <TipLine text={t('pro.rail.ticketDepends', { count: f.dependsOn })} />}
        {f.question && <TipLine text={t('pro.rail.ticketAsks', { q: previewLine(f.question) })} full />}
      </>
    ));
  };

  const clipBtn = (label: string, extra?: React.CSSProperties) => (
    <button
      type="button" className="cth-rail-clip" data-agent-note={agent.id}
      title={label} aria-label={label}
      onClick={(e) => { stop(e); setEditing((v) => !v); }}
      style={{ flexShrink: 0, display: 'inline-grid', placeItems: 'center', width: 18, height: 18, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'var(--cth-ink-500)', ...extra }}
    >
      <ProIcon name="note" size={13} />
    </button>
  );

  return (
    <div
      className="cth-rail-row"
      data-agent-card={agent.id}
      data-agent-nav={agent.id}
      data-unread={unread ? '1' : '0'}
      role="button" tabIndex={0}
      aria-current={active ? 'page' : undefined}
      onClick={open}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }}
      onContextMenu={onContextMenu}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: ROW_GAP,
        padding: `6px 6px 6px ${CARD_PAD_LEFT}px`, borderRadius: 8, cursor: 'pointer', position: 'relative',
        background: active ? 'var(--cth-surface-active)' : 'transparent',
        color: active ? 'var(--cth-ink-900)' : 'var(--cth-ink-700)',
        boxShadow: beat ? 'inset 0 0 0 1px var(--cth-accent), inset 0 0 0 3px var(--cth-accent-soft)' : active ? 'inset 0 0 0 1px var(--cth-ink-300)' : undefined,
        transition: 'background 120ms'
      }}
    >
      {/* Bare sprite, no chip behind it (pilot item 15): the row is the
          selection surface, the avatar is just the person. */}
      <SpritePortrait character={agent.character} size={28} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* line 1 */}
        <span data-agent-line1 style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, height: 18 }}>
          {renaming ? (
            <input
              autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
              onClick={stop} onBlur={() => { void commitName(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void commitName(); } if (e.key === 'Escape') { e.preventDefault(); setRenaming(false); } }}
              aria-label={t('pro.rail.menu.rename')} data-agent-rename
              style={{ ...inputStyle, height: 18, padding: '0 6px', borderRadius: 5, fontSize: 12.5, flex: 1, minWidth: 0, width: 'auto' }}
            />
          ) : (
            <span data-agent-name style={{ fontSize: 13, fontWeight: unread ? 600 : 400, color: unread || active ? 'var(--cth-ink-900)' : 'inherit', flex: '0 1 auto', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</span>
          )}
          {isGodRow && <Chip tone="accent" style={{ height: 15, fontSize: 9, padding: '0 5px', flexShrink: 0 }}>{t('pro.agents.orchestrator')}</Chip>}
          {agent.onHold && <span data-agent-hold title={t('pro.rail.oneOnOneTitle')} style={{ display: 'inline-flex', alignItems: 'center', height: 15, padding: '0 5px', borderRadius: 6, fontSize: 9.5, fontWeight: 500, background: 'var(--cth-cream-200)', color: 'var(--cth-ink-500)', flexShrink: 0 }}>{t('pro.rail.oneOnOne')}</span>}
          {mail.count > 0 ? (
            <span
              data-agent-badge={agent.id} aria-label={t('pro.rail.newFrom', { count: mail.count, name: agent.name })}
              onMouseEnter={(e) => showBadgeTip(e.currentTarget)} onMouseLeave={tip.leave}
              style={{ marginLeft: 'auto', minWidth: 18, height: 18, padding: '0 6px', borderRadius: 999, background: 'var(--cth-accent)', color: 'var(--cth-accent-ink)', fontSize: 10.5, fontWeight: 600, display: 'inline-grid', placeItems: 'center', flexShrink: 0, cursor: 'default', fontVariantNumeric: 'tabular-nums' }}
            >{mail.count}</span>
          ) : (!agent.note && !editing) ? clipBtn(t('pro.rail.noteAdd'), { marginLeft: 'auto' }) : null}
        </span>
        {/* line 2 */}
        <span data-agent-meta style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 10.5, color: 'var(--cth-ink-500)', height: 16 }}>
          <EngineBadge provider={agent.provider} size={14} title={engine.title} />
          <span data-engine-model title={engine.title} style={{ flex: '0 1 auto', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{engine.model}</span>
          {ctxPct === null && <span data-agent-no-session style={{ whiteSpace: 'nowrap' }}>· {t('pro.rail.noSession')}</span>}
          <span data-agent-status={agent.status} title={statusWord} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, color: statusPaint }}>
            <StatusDot status={agent.status} size={7} />
            {statusWord}
          </span>
        </span>
        {/* line 3: the context bar. Track is ink-300 so it stays visible on the
            hover and selected greys. */}
        {ctxPct !== null && (
          <span data-agent-context={ctxPct} title={t('pro.agents.contextTitle', { pct: ctxPct })} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 14, fontSize: 10.5, color: 'var(--cth-ink-500)' }}>
            <span style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--cth-ink-300)', overflow: 'hidden' }}>
              <i style={{ display: 'block', height: '100%', width: `${ctxPct}%`, borderRadius: 2, background: ctxColor }} />
            </span>
            <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums', flexShrink: 0, color: ctxColor }}>{t('pro.rail.contextPct', { pct: ctxPct })}</span>
          </span>
        )}
        {/* line 4: the card */}
        {ticket && (
          <span data-agent-task={ticket.id} onMouseEnter={(e) => showTicketTip(e.currentTarget)} onMouseLeave={tip.leave} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 12, color: active ? 'var(--cth-ink-900)' : 'var(--cth-ink-700)' }}>
            <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 10.5, color: 'var(--cth-ink-500)', flexShrink: 0 }}>{ticket.id}</span>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticket.title}</span>
          </span>
        )}
        {/* No live action line (founder, 25 Sep 2026: "The tool call and last
            tool call info about the agent in the sidebar is useless, remove
            it."). The status word on line 2 says what the agent is doing. */}
        {/* strips */}
        {ask && <Strip kind="ask" word={t('pro.rail.askedYou')} text={ask} color={statusColor('blocked')} tint={statusTint('blocked')} onClick={askCard ? (e) => { stop(e); openAskMe({ taskId: askCard }); } : undefined} />}
        {/* Batch 2: a print mode run that exited 0 finished its task; that is
            not a failure, so it is a done strip, not the crash one. */}
        {agent.exit?.verdict === 'finished' && (
          <Strip kind="done" word={t('pro.agents.finished')} text={ageWord(agent.exit.at, Math.max(Date.now(), agent.exit.at))} color="var(--cth-status-working)" tint="var(--cth-status-working-tint)" />
        )}
        {agent.exit && agent.exit.verdict !== 'finished' && (
          <Strip
            kind="crash" word={agent.exit.verdict === 'crashed' ? t('pro.rail.crashed') : t('pro.agents.stopped')}
            text={agent.exit.verdict === 'crashed'
              ? t('pro.rail.crashedWith', { code: agent.exit.signal ? `signal ${agent.exit.signal}` : `exit ${agent.exit.exitCode ?? '?'}`, age: ageWord(agent.exit.at, Math.max(Date.now(), agent.exit.at)) })
              : ageWord(agent.exit.at, Math.max(Date.now(), agent.exit.at))}
            color="var(--cth-status-blocked)" tint="var(--cth-status-blocked-tint)"
          />
        )}
        {finished.length > 0 && (
          <Strip kind="done" word={t('pro.rail.finished')} text={finished.map((f) => `${f.id} ${f.title}`).join(' · ')} color="var(--cth-status-working)" tint="var(--cth-status-working-tint)" />
        )}
        {/* 0.5.3 feature 18: the strip above names the death; the command box and
            Restart live in the agent's details panel on the right, not here
            (founder, 24 Sep: "I only want it on the right sidebar"). */}
        {/* the note: the clip in front of it, three lines, or the editor */}
        {editing ? (
          <NoteEditor
            initial={agent.note ?? ''} placeholder={t('pro.rail.notePlaceholder')} hint={t('pro.rail.noteHint')}
            saveLabel={t('pro.rail.save')} cancelLabel={t('pro.rail.cancel')}
            onSave={saveNote} onCancel={() => setEditing(false)}
          />
        ) : agent.note ? (
          <span data-agent-note-row style={{ marginTop: 3, display: 'flex', gap: 5, alignItems: 'flex-start', minWidth: 0 }}>
            {clipBtn(t('pro.rail.noteEdit'), { marginTop: -1, opacity: 0.7 })}
            <TruncatedNote
              note={agent.note}
              data-agent-note-text
              lines={3}
              style={{ display: 'block', flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 400, lineHeight: 1.3, color: 'var(--cth-ink-500)' }}
            />
          </span>
        ) : null}
      </span>
      {tip.node}
      {menu && <RowMenu at={menu} items={menuItems} onClose={() => setMenu(null)} />}
      {archiveAsk && (
        <span onClick={stop} onContextMenu={stop}>
          <ConfirmDialog
            title={t('pro.room.archiveTitle', { name: agent.name })} body={t('pro.room.archiveBody')} confirmLabel={t('pro.room.archiveConfirm')}
            onConfirm={() => { setArchiveAsk(false); archiveAgent(agent.id); proToast(t('pro.room.archived', { name: agent.name })); if (active) onGo('agents'); }}
            onClose={() => setArchiveAsk(false)}
          />
        </span>
      )}
    </div>
  );
}

/** The agent row's portrait height, the gap between it and the text, and the
 *  card's left padding. The portrait's JSX carries the literal 28 (every PRO
 *  avatar site is pinned by test/pro-0411-avatars on its literal). */
const PORTRAIT_SIZE = 28;
const ROW_GAP = 8;
const CARD_PAD_LEFT = 10;
void PORTRAIT_SIZE;

/** A section heading; `trailing` puts a control on the header row (the Agents
 *  section's add button). The collapsed rail keeps its plain divider, so the
 *  control only exists where there is a row to sit on. */
function SectionLabel({ collapsed, trailing, children }: { collapsed: boolean; trailing?: React.ReactNode; children: React.ReactNode }) {
  if (collapsed) return <div style={{ height: 1, background: 'var(--cth-ink-300)', margin: '10px 14px 4px' }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cth-ink-500)', padding: '14px 16px 4px', fontWeight: 600 }}>
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {trailing}
    </div>
  );
}

/** A neutral count, or the amber "needs you" pill when `hot`. */
function Count({ value, hot }: { value: number; hot?: boolean }) {
  if (!value) return null;
  return (
    <span style={{
      marginLeft: 'auto', fontFamily: 'var(--cth-font-mono)', fontSize: hot ? 10.5 : 11, lineHeight: '17px',
      padding: hot ? '0 6px' : 0, borderRadius: 9, fontWeight: hot ? 600 : 400,
      background: hot ? 'var(--cth-accent)' : 'transparent',
      color: hot ? 'var(--cth-accent-ink)' : 'var(--cth-ink-500)'
    }}>
      {value}
    </span>
  );
}

/** `4 live`, `2 running`, `3 online`: a dot and a word, mint because it means
 *  "happening now". */
function Live({ n, word }: { n: number; word: string }) {
  if (!n) return null;
  return (
    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>
      <i style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cth-status-working)', display: 'inline-block' }} />
      <span style={{ fontFamily: 'var(--cth-font-figures)' }}>{n}</span> {word}
    </span>
  );
}

function MenuRow({ icon, label, hint, onClick }: { icon: ProIconName; label: string; hint?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 8px', borderRadius: 7,
        border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'var(--cth-ink-900)'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cth-surface-active)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <ProIcon name={icon} size={15} style={{ color: 'var(--cth-ink-500)' }} />
      <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>{hint}</span>}
    </button>
  );
}

/** People are initials or a photo; AGENTS are sprites (SpritePortrait), never
 *  initials — founder ruling 2 Sep. This is only ever a person. */
function Initials({ name }: { name: string }) {
  const ini = name.split(/[\s-]+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      background: 'var(--cth-cream-200)', color: 'var(--cth-ink-900)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 10
    }}>
      {ini}
    </span>
  );
}

/* ---- data --------------------------------------------------------------- */

/** Running temps, polled at the same 2s the Temps screen uses. Zero when the
 *  preload is absent (tests, preview). */
function useRunningWorkers(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const api = window.cth;
    if (!api?.listWorkers) return;
    let alive = true;
    const tick = () => { api.listWorkers().then((r) => { if (alive) setN(r.live.length); }).catch(() => { /* main is restarting; keep the last count */ }); };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);
  return n;
}

/** Teammates online, for the Team row. Rendered only inside an org: solo has
 *  no roster, and useRoster() outside the bridge falls back to fixtures, a
 *  number this row must never show. A component rather than a hook so the
 *  roster is not subscribed to at all when there is no org. */
function OnlineCount({ word }: { word: string }) {
  const roster = useRoster();
  const n = roster.teammates.filter((m) => m.presence === 'online').length;
  return <Live n={n} word={word} />;
}

/**
 * THE SIDEBAR'S EDGE (0.5.3 rc.4, founder 25 Sep 2026: "increase or decrease
 * the width by clicking on the edge and dragging it"). A 6px strip on the
 * inner edge (the right one, the left one in Arabic), the column resize
 * cursor. The drag draws every move and stores once, on release; a double
 * click returns the default. It is a focusable separator, so the arrow keys
 * move it too. Rows reflow on their own: every row is laid out to the width
 * of the column, nothing in it is sized to 288.
 */
function RailEdge({ width, onResizing }: { width: number; onResizing: (on: boolean) => void }) {
  const { t } = useTranslation();
  const rtl = useRtl();
  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    let last = startWidth;
    onResizing(true);
    document.body.style.cursor = 'col-resize';
    const move = (ev: PointerEvent) => { last = dragRailWidth(startWidth, startX, ev.clientX, rtl); setRailWidth(last, false); };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.cursor = '';
      onResizing(false);
      setRailWidth(last);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // The key toward the content widens the column, in either direction.
    const wider = rtl ? 'ArrowLeft' : 'ArrowRight';
    const narrower = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === wider) { e.preventDefault(); setRailWidth(width + RAIL_WIDTH_STEP); }
    else if (e.key === narrower) { e.preventDefault(); setRailWidth(width - RAIL_WIDTH_STEP); }
    else if (e.key === 'Home' || e.key === 'Enter') { e.preventDefault(); setRailWidth(PRO_SIDEBAR_WIDTH); }
  };
  return (
    <div
      role="separator" aria-orientation="vertical" tabIndex={0}
      aria-label={t('pro.rail.resize')} title={t('pro.rail.resizeTitle')}
      aria-valuenow={width} aria-valuemin={RAIL_WIDTH_MIN} aria-valuemax={RAIL_WIDTH_MAX}
      data-rail-edge className="cth-rail-edge"
      onPointerDown={start}
      onDoubleClick={() => setRailWidth(PRO_SIDEBAR_WIDTH)}
      onKeyDown={onKey}
      style={{ position: 'absolute', top: 0, bottom: 0, insetInlineEnd: -3, width: 6, cursor: 'col-resize', zIndex: 5, touchAction: 'none' }}
    />
  );
}

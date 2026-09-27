/**
 * PRO: sidebar on the left, ONE screen on the right. Replaces ProfessionalLayout
 * (founder, 2 Sep 2026; plan at hive/shared/design/app-v2/PLAN-pro-mode.md).
 *
 * PHASE 0 MOUNTED WHAT EXISTED; phases 1 to 4 redrew every screen: Agents,
 * the agent screen, Tasks, Inbox, Automations, Memory, Capabilities, Temps,
 * Team, and the pages under the drop-up (Profile, Settings, Version &
 * updates, and for admins Subscription & billing, phase 5). Nothing here is a placeholder: a row either opens a working
 * surface or the row is not drawn.
 *
 * TEAM is the one seam id PRO draws itself: the seam still contributes the
 * row and its pane, and the shell routes `team` to TeamScreen (the PRO
 * roster with the standing-gated toolbar) while `org`, `requests` and
 * `thread` stay Creed's panes, reached by the same ids as before.
 *
 * THE SWITCH IS EXHAUSTIVE over ProScreen. The rail's open enum let two
 * declared panes fall through to the org chart unnoticed; here a screen added
 * to the union without a branch is a type error, and a sidebar row whose id is
 * not in the union or in `extraPanes` is a test failure (test/pro-nav.test.cjs).
 *
 * THE TEAMS SEAM IS UNCHANGED: `companyRows` + `extraPanes`, keyed by the same
 * id, and panes navigate to panes through PaneNavProvider exactly as before.
 * That is why paneNav.tsx and railState.ts survived the rail.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@/store/store';
import type { HarnessConfig } from '@/store/config';
import type { Section as SettingsSection } from '../SettingsModal';
import { PaneNavProvider, type PaneNav } from '../professional/paneNav';
import { toggleRailCollapsed, type PaneId, type RailRowSpec } from '../professional/railState';
import { proChordFor } from './proKeys';
import { ProBooting, useBootRecovery } from './ProBooting';
import { ProSidebar } from './ProSidebar';
import { TempsScreen } from './TempsScreen';
import { TeamScreen } from './TeamScreen';
import { ProfileScreen } from './ProfileScreen';
import { SettingsScreen } from './SettingsScreen';
import { UpdatesScreen } from './UpdatesScreen';
import { BillingScreen } from './BillingScreen';
import { AgentsScreen } from './AgentsScreen';
import { AgentScreen } from './AgentScreen';
import { GodScreen } from './GodScreen';
import { TasksScreen } from './TasksScreen';
import { TaskSheetHost } from './TaskSheet';
import { AgentSheetHost } from './AgentSheet';
import { InboxScreen } from './InboxScreen';
import { AutomationsScreen } from './AutomationsScreen';
import { CapabilitiesScreen } from './CapabilitiesScreen';
import { BundleSheetHost } from './BundleSheet';
import { AskMeModalHost } from './AskMeModal';
import { MemoryScreen } from './MemoryScreen';
import { PuckScreen } from './PuckScreen';
import { PRO_HOME, PRO_NAVIGATE_EVENT, isProScreen, type ProScreen } from './proNav';
import { ProToastHost } from './ui';
import { setAudience } from './depth';
import { setTaskHygieneConfig } from './taskData';
import { usePulseFeed } from './MessagePulse';
import { TEAM_PANE } from '../team/teamsSeam';

export interface ProShellProps {
  config: HarnessConfig | null;
  companyRows: RailRowSpec[];
  extraPanes: Record<string, ReactNode>;
  onToggleTheme: () => void;
  appVersion: string;
}

/** ADDING AN AGENT HAS ONE DOOR IN PRO: the agent sheet (agentSheetStore's
 *  `openAgentSheet`), hosted below beside the task sheet. App's Classic
 *  modal is never drawn over PRO, so the shell takes no onAddAgent prop. */
export function ProShell({
  config, companyRows, extraPanes, onToggleTheme, appVersion
}: ProShellProps) {
  const [screen, setScreen] = useState<PaneId>(PRO_HOME);
  /** The Settings tab a deep link asked for; cleared on leaving the page so
   *  the next plain visit opens on General, as the modal always has. */
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(undefined);
  const agents = useStore((s) => s.agents);
  const selectAgent = useStore((s) => s.select);

  // THE PUCK EXISTS ONLY UNDER THIS SHELL. Main draws the floating window
  // when the config says on AND a Pro shell is on screen; this is the second
  // half. Mount says yes, unmount (sign out, a lock, the skin switching) says
  // no, so a locked seat never keeps a puck that can message the orchestrator.
  useEffect(() => {
    void window.cth.puckAdmit?.(true);
    return () => { void window.cth.puckAdmit?.(false); };
  }, []);

  // D1: the simple / technical rendering follows the audience answer in the
  // config (depth.ts). Fed here, once, for every screen under the shell.
  const audience = config?.audience;
  // Item 7: the boot gate. Read here, drawn over the shell below. 0.5.2: it
  // waits for the automatic restore too, and offers a way out (ProBooting.tsx).
  const { recovering, remaining, skippable, skip } = useBootRecovery(config ? config.onboardingComplete === true : undefined);
  useEffect(() => { setAudience(audience); }, [audience]);
  // W-A: the hygiene thresholds (Stale chip, the "still open" reminder) the
  // same way, so Tasks, Inbox and the sheet never ask the config themselves.
  const taskHygiene = config?.taskHygiene;
  useEffect(() => { setTaskHygieneConfig(taskHygiene); }, [taskHygiene]);

  // W-C, the message pulse: the one subscription to the router's stream,
  // here so the cards, the overlay and the sidebar rows read one store.
  usePulseFeed();

  // One function for the sidebar, the Agents grid and a pane navigating: the
  // three cannot drift into different meanings of "show this".
  const go = useCallback((next: PaneId) => {
    setScreen(next);
    if (next !== 'settings') setSettingsSection(undefined);
    if (next.startsWith('agent:')) selectAgent(next.slice('agent:'.length));
  }, [selectAgent]);
  const nav = useMemo<PaneNav>(() => ({ current: screen, go }), [screen, go]);

  // SETTINGS HAS ONE DOOR IN PRO: the page. `cth:open-settings` is how the
  // rest of the tree deep-links into Settings ("set it now" beside a Talk
  // button, the memory panel, the titlebar gear); in Classic, App answers it
  // with the modal. Here the shell answers instead and App stands down
  // (App.tsx checks the skin), so a deep link can no longer draw the Classic
  // modal over a PRO screen that already has Settings as a page.
  useEffect(() => {
    const onOpen = (e: Event) => {
      setSettingsSection((e as CustomEvent<{ section?: SettingsSection }>).detail?.section);
      setScreen('settings');
    };
    window.addEventListener('cth:open-settings', onOpen);
    return () => window.removeEventListener('cth:open-settings', onOpen);
  }, []);

  // The titlebar's door (proNav.ts): the connection chip sits above the
  // shell and asks for the Team screen through this event, answered with
  // the same `go` the sidebar uses. An id that is neither a screen nor one
  // of the seam's panes is ignored, never a blank pane. The panes are read
  // through a ref: App rebuilds the object every render and the listener
  // must not follow it.
  const panesRef = useRef(extraPanes);
  panesRef.current = extraPanes;
  useEffect(() => {
    const onNav = (e: Event) => {
      const s = (e as CustomEvent<{ screen?: string }>).detail?.screen;
      if (s && (isProScreen(s) || s === TEAM_PANE || s in panesRef.current)) go(s);
    };
    window.addEventListener(PRO_NAVIGATE_EVENT, onNav);
    return () => window.removeEventListener(PRO_NAVIGATE_EVENT, onNav);
  }, [go]);

  // The chords the UI already promised (proKeys.ts): ⌘\ folds the sidebar,
  // ⌘, opens Settings. ⌘. belongs to the agent screen, which listens itself.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const chord = proChordFor(e);
      if (chord === 'sidebar') { e.preventDefault(); toggleRailCollapsed(); }
      else if (chord === 'settings') { e.preventDefault(); go('settings'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const body = (() => {
    if (!isProScreen(screen)) {
      // The seam's panes (team, requests, thread, org). Team is drawn by PRO
      // (see the header); the rest are the seam's. An unknown id lands on
      // home rather than on a blank pane, and the test keeps unknown ids out
      // of the sidebar in the first place.
      if (screen === TEAM_PANE) return <TeamScreen />;
      return screen in extraPanes ? extraPanes[screen] : <AgentsScreen config={config} onOpen={(id) => go(`agent:${id}`)} />;
    }
    return renderScreen(screen);
  })();

  function renderScreen(s: ProScreen): ReactNode {
    if (s.startsWith('agent:')) {
      const a = agents.find((x) => x.id === s.slice('agent:'.length));
      if (!a) return <AgentsScreen config={config} onOpen={(id) => go(`agent:${id}`)} />;
      // The orchestrator has his own screen (phase 3, D9): six tabs, PRO
      // native. Every other agent opens the agent screen. This is the one
      // door, so the Classic Command Center is never mounted under PRO.
      if (a.isGod) return <GodScreen agent={a} config={config} />;
      return <AgentScreen agent={a} config={config} />;
    }
    switch (s as Exclude<ProScreen, `agent:${string}`>) {
      case 'agents': return <AgentsScreen config={config} onOpen={(id) => go(`agent:${id}`)} />;
      case 'tasks': return <TasksScreen />;
      case 'inbox': return <InboxScreen />;
      case 'automations': return <AutomationsScreen />;
      case 'memory': return <MemoryScreen config={config} />;
      case 'capabilities': return <CapabilitiesScreen config={config} />;
      case 'puck': return <PuckScreen config={config} />;
      case 'temps': return <TempsScreen />;
      case 'profile': return <ProfileScreen />;
      case 'settings': return <SettingsScreen config={config} section={settingsSection} />;
      case 'updates': return <UpdatesScreen appVersion={appVersion} />;
      case 'billing': return <BillingScreen />;
    }
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 0, position: 'relative' }}>
      {/* Item 7: held until every restored agent has been reattached. See
          ProBooting.tsx for what counts as recovered and why there is a cap. */}
      {recovering && <ProBooting remaining={remaining} skippable={skippable} onSkip={skip} />}
      <ProSidebar
        current={screen}
        onSelect={go}
        companyRows={companyRows}
        onToggleTheme={onToggleTheme}
        appVersion={appVersion}
        keepAgentOrder={config?.keepAgentOrder === true}
        savedAgentOrder={config?.agentOrder}
        savedProjectOrder={config?.projectOrder}
        agentsAndNotesOnly={config?.sidebarAgentsNotesOnly === true}
      />
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', background: 'var(--cth-cream-50)' }}>
        <PaneNavProvider value={nav}>
          {body}
          {/* The task sheet, for whoever calls store.openTaskDetail: inside the
              provider so its Open / Ask buttons can navigate (see TaskSheet). */}
          <TaskSheetHost />
          {/* The agent sheet, for whoever calls openAgentSheet (the header
              button, the grid's Add card, the agent room's editor). */}
          <AgentSheetHost config={config} />
          {/* The role bundle sheet (W-B), for the Capabilities header and the
              agent room's details panel: inside the provider so its toast can
              open the agent that was granted. */}
          <BundleSheetHost config={config} />
          {/* The Ask me modal (0.5.3), for the bell and the Ask me section on
              every agent's Inbox thread: answer where you stand. */}
          <AskMeModalHost />
          <ProToastHost />
        </PaneNavProvider>
      </div>
    </div>
  );
}

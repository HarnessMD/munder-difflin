/**
 * The boards. One frame per STATE, never one frame you have to click through:
 * a reviewer should see every state at once.
 */
import { Component, ReactNode, useEffect, useMemo, useState } from 'react';
import { TeamTab } from '@/components/team/TeamTab';
import { ApprovalQueue, ApprovalToast } from '@/components/team/ApprovalQueue';
import { OrgSetupBanner, TeamLevelSummary } from '@/components/team/OrgOnboardingBits';
import { MOCK_REQUESTS, MOCK_THREAD } from '@/components/team/mockTeam';
import { CrossNodeThread } from '@/components/team/CrossNodeThread';
import { FingerprintWarning } from '@/components/team/FingerprintWarning';
import { NetworkPermissions } from '@/components/team/NetworkPermissions';
import { UpgradeToTeams } from '@/components/team/UpgradeToTeams';
import { ConnectionChip } from '@/components/team/primitives';
import { RevokedTakeover } from '@/components/team/RevokedTakeover';
import { OrgPanel } from '@/components/team/OrgPanel';
import type { LockInfo, OrgView, StopReason } from '@shared/teams';
import { MOCK_TEAMMATES } from '@/components/team/mockTeam';
import { NETWORK_LEVELS, type ConnectionState, type ThreadMessage } from '@/components/team/types';
import { FirstLaunch } from '@/components/team/onboarding/FirstLaunch';
import { EnterInviteCode } from '@/components/team/onboarding/EnterInviteCode';
import { SignInWait } from '@/components/team/onboarding/SignInWait';
import { IdentitySetup } from '@/components/team/onboarding/IdentitySetup';
import { JoinedSummary } from '@/components/team/onboarding/JoinedSummary';
import { FirstRunFlow } from '@/components/team/onboarding/FirstRunFlow';
import { CharacterPicker } from '@/components/CharacterPicker';
import { SpriteEditor } from '@/components/SpriteEditor';
import { TranscribeSettings } from '@/components/TranscribeSettings';
import { SettingsModal, type Section as SettingsSection } from '@/components/SettingsModal';
import type { HarnessConfig } from '@/store/config';
import { DEFAULT_TRANSCRIBE } from '@shared/transcribeConfig';
import { ProSidebar } from '@/components/pro/ProSidebar';
import { AgentStrip } from '@/components/AgentStrip';
import { SidebarRow } from '@/components/FullscreenTerminal';
import { useStore, type Agent } from '@/store/store';
import type { OfficeCharacterName } from '@/scene/office/castRoster';
import { setCustomAvatars } from '@/scene/office/avatarRegistry';
import { presetRecipe, randomRecipe, type CustomAvatar } from '@shared/avatars';
import { PuckScreen } from '@/components/pro/PuckScreen';
import { MemoryScreen } from '@/components/pro/MemoryScreen';
import { Composer } from '@/components/pro/Composer';
import { AskMeBell } from '@/components/pro/AskMeBell';
import { AgentInbox } from '@/components/pro/AgentInbox';
import { AskMeModalHost } from '@/components/pro/AskMeModal';
import { PuckApp } from '@/puck/PuckApp';
import '@/puck/puck.css';
import { PaneNavProvider } from '@/components/professional/paneNav';
import { CORNER_MARGIN, DEFAULT_PUCK_CONFIG, DEFAULT_PUCK_STATE, normalizePuckConfig, ringFootprint, windowFor, type PuckConfig, type PuckState } from '@shared/puck';
import { createPortal } from 'react-dom';
import { installCthStub } from './cthStub';
import { IdePanel } from '@/ide/IdePanel';
import { ProToastHost } from '@/components/pro/ui';
import { TasksScreen } from '@/components/pro/TasksScreen';
import { AgentTasks } from '@/components/pro/AgentTasks';
import i18nInstance, { directionFor } from '@/i18n';
import { agentTasks } from '@/components/pro/agentTaskRules';
import { MonacoEditor } from '@/ide/MonacoEditor';
import { IdeShortcut } from '@/ide/IdeShortcut';
import { WorktreesPanel } from '@/components/WorktreesPanel';
import { BoundPortNote } from '@/components/BoundPortNote';
import type { WorktreeRow, WorktreeWork } from '@shared/worktreeList';
import { PtyTerminalView } from '@/components/PtyTerminalView';
import { acquireTerminal } from '@/components/terminalPool';
import type { CliMissingState } from '@shared/cliMissing';
import type { LoginPrompt } from '@shared/cliLogin';

/* The puck (7 Sep 2026). The screen reads main over the bridge, so the
   harness stands in a `window.cth` (cthStub.ts); the floating window itself
   draws from props here, every state at once, on a backdrop that stands in
   for whatever app the puck is floating over. */
installCthStub();
const PUCK_CFG: PuckConfig = { ...DEFAULT_PUCK_CONFIG, enabled: true };
const PUCK_SIDE = ringFootprint(PUCK_CFG.size);
const puckState = (patch: Partial<PuckState>): PuckState => ({
  ...DEFAULT_PUCK_STATE, shown: true, canTranscribe: true, screenAccess: 'granted', offset: { x: PUCK_SIDE / 2, y: PUCK_SIDE / 2 }, ...patch
});
const NO_KEY_STATE = puckState({ menuOpen: true, canTranscribe: false });
const PUCK_PREVIEW_SHOT = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200"><rect width="360" height="200" fill="#e9e4d8"/><rect x="20" y="20" width="320" height="30" rx="5" fill="#fff8e7"/><rect x="20" y="66" width="220" height="14" rx="3" fill="#a899b5"/><rect x="20" y="90" width="280" height="14" rx="3" fill="#a899b5"/><rect x="20" y="114" width="170" height="14" rx="3" fill="#a899b5"/><rect x="250" y="150" width="90" height="30" rx="6" fill="#1a1320"/></svg>'
);
/* A tall region capture (a phone shaped column), to see the picture capped
   by the window rather than the card running off it. */
const PUCK_PREVIEW_TALL = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="210" height="1100"><rect width="210" height="1100" fill="#e9e4d8"/><rect x="16" y="16" width="178" height="26" rx="5" fill="#fff8e7"/>' +
  Array.from({ length: 14 }, (_, i) => `<rect x="16" y="${64 + i * 72}" width="${120 + (i % 3) * 28}" height="12" rx="3" fill="#a899b5"/>`).join('') +
  '<rect x="120" y="1050" width="74" height="28" rx="6" fill="#1a1320"/></svg>'
);

/** `edge` puts the window where main's clamp would: flush with the frame's
 *  corner or right edge, the way windowFor pushes it against a display. */
function PuckBackdrop({ children, edge }: { children: ReactNode; edge?: 'corner' | 'right' }) {
  const at = edge === 'corner' ? { right: 0, bottom: 0 }
    : edge === 'right' ? { right: 0, top: '50%', transform: 'translateY(-50%)' }
      : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg, #b9c9d4 0%, #d8cfc4 55%, #e5c9a8 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 24, top: 24, right: 24, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.35)' }} />
      <div style={{ position: 'absolute', left: 24, top: 76, width: '55%', bottom: 24, borderRadius: 8, background: 'rgba(255,255,255,0.22)' }} />
      <div style={{ position: 'absolute', ...at, width: PUCK_SIDE, height: PUCK_SIDE }}>
        {children}
      </div>
    </div>
  );
}

/** 0.5.3, I3: the largest Stapler parked in the bottom right of a 1300 by
 *  900 laptop screen, menu bar and Dock drawn, the frame's edge the screen's.
 *  Its window is taller than the work area and hangs off the bottom, as on a
 *  real laptop. `fix=0` draws it the way the page did before (no screen from
 *  main: the bare square), `fix=1` with the screen windowFor reports. */
const LAPTOP_SCREEN = { width: 1300, height: 900, menu: 25, dock: 70 };
function StapleEdgeFrame({ what, fix }: { what: 'card' | 'flash' | 'ring'; fix: boolean }) {
  const size = 160;
  const area = { x: 0, y: LAPTOP_SCREEN.menu, width: LAPTOP_SCREEN.width, height: LAPTOP_SCREEN.height - LAPTOP_SCREEN.menu - LAPTOP_SCREEN.dock };
  const w = windowFor({ x: area.width - 12 - size / 2, y: area.y + area.height - 12 - size / 2 }, area, size);
  const cfg = { ...PUCK_CFG, size };
  const state = puckState({ offset: w.offset, screen: fix ? w.screen : null, menuOpen: what === 'ring' });
  const compose = what === 'card' ? { kind: 'screenshot' as const, shots: [{ path: '/tmp/shot.png', preview: PUCK_PREVIEW_TALL, width: 210, height: 1100 }] } : undefined;
  const flash = what === 'flash' ? { text: 'Could not send: the office is not set up on this Mac yet.', bad: true, action: { label: 'Open the app', run: () => {} } } : undefined;
  return (
    <div data-stapler-edge={fix ? 'fixed' : 'before'} style={{ position: 'relative', width: LAPTOP_SCREEN.width, height: LAPTOP_SCREEN.height, overflow: 'hidden', background: 'linear-gradient(160deg, #b9c9d4 0%, #d8cfc4 55%, #e5c9a8 100%)' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: LAPTOP_SCREEN.menu, background: 'rgba(255,255,255,0.7)' }} />
      <div style={{ position: 'absolute', left: '50%', bottom: 6, transform: 'translateX(-50%)', width: 560, height: LAPTOP_SCREEN.dock - 12, borderRadius: 16, background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.7)' }} />
      <div data-stapler-window style={{ position: 'absolute', left: w.window.x, top: w.window.y, width: w.window.width, height: w.window.height }}>
        <PuckApp preview={{ config: cfg, state, compose, flash }} />
      </div>
    </div>
  );
}

/** 0.5.3, I5: the send card's picker, on a screenshot card and on a spoken
 *  message card, with a floor of running agents, two of them named Jim. */
const PUCK_RECIPIENTS = [
  { id: 'god', name: 'Michael' }, { id: 'pam-1', name: 'Pam' }, { id: 'jim-1', name: 'Jim (jim-1)' }, { id: 'jim-2', name: 'Jim (jim-2)' }, { id: 'dwight-1', name: 'Dwight' }
];
function StapleRecipientFrame({ kind }: { kind: 'screenshot' | 'message' }) {
  const state = puckState({ recipients: PUCK_RECIPIENTS, recipientId: 'pam-1', recipient: 'Pam' });
  const compose = kind === 'screenshot'
    ? { kind: 'screenshot' as const, shots: [{ path: '/tmp/shot.png', preview: PUCK_PREVIEW_SHOT, width: 360, height: 200 }] }
    : { kind: 'message' as const, text: '' };
  return <PuckBackdrop><PuckApp preview={{ config: PUCK_CFG, state, compose }} /></PuckBackdrop>;
}

/** The Puck screen, live: a save merges onto this frame's own config the way
 *  main does, so a click on a swatch repaints the preview here as it does in
 *  the app (the founder's "the colour does not apply", 7 Sep 2026, needed a
 *  place to click). The frame claims the stub's updateConfig on the press
 *  that leads to the save, so four frames on one page do not fight. */
function PuckScreenFrame({ tab, groq = true }: { tab: 'settings' | 'meetings' | 'screenshots'; groq?: boolean }) {
  useStore.setState({ hasGroqKey: groq });
  const [puck, setPuck] = useState<PuckConfig>(PUCK_CFG);
  const config = useMemo(() => ({ puck }), [puck]);
  const claim = () => {
    (window.cth as unknown as Record<string, unknown>).updateConfig = async (patch: { puck?: Partial<PuckConfig> }) => {
      setPuck((p) => normalizePuckConfig({ ...p, ...patch.puck }));
      return {};
    };
  };
  return (
    <PaneNavProvider value={{ current: 'puck', go: () => {} }}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }} onPointerDownCapture={claim} onKeyDownCapture={claim}>
        <PuckScreen config={config as never} initialTab={tab} />
      </div>
    </PaneNavProvider>
  );
}


/* 0.5.3, F25: Pam's Classic cards (hive/shared/design/sidebar-free/final).
   The strip card and the fullscreen roster row, seeded with the fields the
   rows draw: engine and model, a live session, a ticket from the ledger, an
   action with an age, a held agent, a crashed one, notes. Switch the harness
   skin to `office` to see them in their own tokens. */
const NOW = Date.now();
const CLASSIC_AGENTS: Agent[] = [
  { id: 'preview-michael', name: 'Michael', character: 'michael', accent: 'lemon', description: 'Runs the floor', project: 'hive', cwd: '/code/hive', status: 'working', action: 'Routing 3 messages, reviewing the Teams proof from Creed', provider: 'claude', model: 'claude-opus-5', contextLimit: 1000000, contextTokens: 290000, isGod: true, note: 'Runs the floor', recentTextTs: NOW - 3000 },
  { id: 'preview-kevin', name: 'Kevin', character: 'kevin', accent: 'sky', description: 'Server', project: 'md-server', cwd: '/code/md-server', status: 'working', action: 'Writing the /me route, 4 of 6 cases green', provider: 'claude', model: 'claude-fable-5-1', contextLimit: 200000, contextTokens: 14000, recentTextTs: NOW - 12000 },
  { id: 'preview-creed', name: 'Creed', character: 'creed', accent: 'lilac', description: 'Relay', project: 'md-server', cwd: '/code/md-server', status: 'blocked', action: 'Waiting on Kevin for the relay schema', provider: 'claude', model: 'claude-fable-5', contextLimit: 200000, contextTokens: 14000, note: 'Prefers the flat schema.\nDo not let it touch the Mongo indexes.', recentTextTs: NOW - 9 * 60000 },
  { id: 'preview-oscar', name: 'Darryl', character: 'oscar', accent: 'mint', description: 'Tests', project: 'md-server', cwd: '/code/md-server', status: 'working', action: 'Running the billing webhook tests, 88 of 120', provider: 'codex', model: 'gpt-5.6-sol', contextLimit: 200000, contextTokens: 44000, onHold: true, recentTextTs: NOW - 3000 },
  { id: 'preview-andy', name: 'Andy', character: 'andy', accent: 'coral', description: 'Receipts', project: 'harnessmd.com', cwd: '/code/site', status: 'waiting', action: '', provider: 'claude', model: 'claude-opus-5', contextLimit: 1000000, contextTokens: 140000, recentTextTs: NOW - 4 * 60000 },
  { id: 'preview-pam', name: 'Pam', character: 'pam', accent: 'sky', description: 'Design', project: 'harnessmd.com', cwd: '/code/site', status: 'idle', action: 'Delivered the Pro sidebar prototype', provider: 'claude', model: 'claude-fable-5', contextLimit: 200000, contextTokens: 176000, note: 'HTML mockups.\nThree versions when asked for three.', recentTextTs: NOW - 18 * 60000 },
  { id: 'preview-ryan', name: 'Ryan', character: 'ryan', accent: 'mint', description: 'Pricing', project: 'harnessmd.com', cwd: '/code/site', status: 'thinking', action: 'Planning the pricing endpoint change', provider: 'gemini', model: 'pro', contextLimit: 1000000, contextTokens: 200000, recentTextTs: NOW - 40000 },
  { id: 'preview-jim', name: 'Bob', character: 'jim', accent: 'sky', description: 'Docs', project: '', cwd: '/code/docs', status: 'idle', action: '', provider: 'claude', model: '', exit: { verdict: 'crashed', exitCode: 1, at: NOW - 12 * 60000 }, recentTextTs: NOW - 12 * 60000 }
].map((a) => ({ tmuxTarget: '', progress: 0, ptyId: `pty-${a.id}`, ...a } as unknown as Agent));
const CLASSIC_TASKS = { tasks: [
  { id: 'T-118', title: 'Billing webhook retries', status: 'doing', assignee: 'preview-kevin', createdAt: '2026-09-22T00:00:00.000Z' },
  { id: 'T-119', title: 'Relay schema for Teams', status: 'blocked', assignee: 'preview-creed', createdAt: '2026-09-22T00:00:00.000Z', humanQA: [{ q: 'Flat or nested?', askedAt: '2026-09-23T00:00:00.000Z' }] },
  { id: 'T-117', title: 'Webhook test suite', status: 'doing', assignee: 'preview-oscar', createdAt: '2026-09-22T00:00:00.000Z' },
  { id: 'T-120', title: 'Team knowledge receipt', status: 'blocked', assignee: 'preview-andy', createdAt: '2026-09-22T00:00:00.000Z' },
  { id: 'T-121', title: 'Regional pricing rollout', status: 'doing', assignee: 'preview-ryan', createdAt: '2026-09-22T00:00:00.000Z' },
  { id: 'T-099', title: 'Old and done', status: 'done', assignee: 'preview-pam', createdAt: '2026-09-20T00:00:00.000Z' }
] };
function seedClassic(): void {
  useStore.setState({ agents: CLASSIC_AGENTS, selectedId: 'preview-pam' });
  const cth = (window as unknown as { cth: Record<string, unknown> }).cth;
  cth.hiveTasks = () => Promise.resolve(CLASSIC_TASKS);
  cth.agentActivity = (id: string) => { const a = CLASSIC_AGENTS.find((x) => x.id === id); return Promise.resolve(a?.recentTextTs ? [{ ts: a.recentTextTs, kind: 'tool', tool: 'Edit' }] : []); };
  cth.gitMainRepo = (cwd: string) => Promise.resolve(cwd);
  cth.controlSnapshot = () => Promise.resolve({ paused: false, halted: false });
}
function ClassicStripFrame() {
  seedClassic();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end', background: 'var(--cth-cream-100)' }}>
      <AgentStrip config={{ harnessHome: '/h' } as never} />
    </div>
  );
}
const ROSTER_SCALE = { name: 9, group: 9, note: 11, portraitScale: 1.5, portrait: 27 };
const NO_DRAG = { start: () => {}, over: () => {}, leave: () => {}, drop: () => {}, end: () => {} };
function ClassicRosterFrame() {
  seedClassic();
  const rows = (ids: string[]) => ids.map((id) => (
    <SidebarRow key={id} id={id} active={id === 'preview-pam'} dragging={false} over={false} dragActive={false}
      onOpen={() => {}} onContextMenu={(e) => e.preventDefault()} renameRequest={0} noteRequest={0} drag={NO_DRAG} scale={ROSTER_SCALE} />
  ));
  const group = (label: string, ids: string[]) => (
    <div key={label} style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid var(--cth-ink-300)' }}>
      <div style={{ padding: '0 10px 6px', fontFamily: 'var(--cth-font-display)', fontSize: 9, color: 'var(--cth-ink-500)' }}>{label}</div>
      {rows(ids)}
    </div>
  );
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <aside className="cth-scroll-hidden" style={{ width: 300, flexShrink: 0, overflowY: 'auto', padding: '6px 0', background: 'var(--cth-cream-200)', borderRight: '1px solid var(--cth-ink-300)' }}>
        {rows(['preview-michael'])}
        {group('MD-SERVER', ['preview-kevin', 'preview-creed', 'preview-oscar'])}
        {group('HARNESSMD.COM', ['preview-andy', 'preview-pam', 'preview-ryan'])}
        {group('NO PROJECT', ['preview-jim'])}
      </aside>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--cth-ink-500)', fontSize: 12 }}>the terminal</div>
    </div>
  );
}

/* Enough agents to overflow a sidebar (card sidebar-no-scroll-profile-
   unreachable, 6 Sep 2026: the founder lost the profile row behind TWO). Only
   the fields the sidebar rows draw; the cast names are real so the sprites
   paint. Seeded into the real store because ProSidebar reads it. */
const CAST: OfficeCharacterName[] = ['michael', 'jim', 'pam', 'dwight', 'angela', 'oscar', 'kevin', 'stanley', 'phyllis', 'creed', 'meredith', 'ryan'];
const SIDEBAR_AGENTS: Agent[] = CAST.map((character, i) => ({
  id: `preview-${character}`,
  name: character[0].toUpperCase() + character.slice(1),
  character,
  status: i % 3 === 0 ? 'working' : 'idle',
  provider: i % 2 === 0 ? 'claude' : 'codex',
  model: i % 2 === 0 ? 'claude-fable-5' : 'gpt-5.2-codex',
  isGod: i === 0,
  // Founder, 7 Sep 2026: a note under a row, and a selected row with a live
  // context figure, so the row's three lines can be looked at together.
  // 0.5.3, features 2 to 4: three projects and one agent with none, so the
  // headings draw; a long note, so the three line clamp has something to cut.
  project: i === 0 ? 'hive' : ['munder-difflin-pro', 'landing-site', 'billing-service'][i % 3],
  ...(character === 'ryan' ? { project: '' } : {}),
  ...(character === 'dwight' ? { note: 'Owns the Razorpay path end to end.\nAsk before touching prod.\nOn call this week, pages go to him first.\nBack up is Oscar.' } : {}),
  ...(character === 'jim' ? { note: 'Workforce' } : {}),
  ...(character === 'pam' ? { contextLimit: 200000, contextTokens: 12000, note: 'Owns the release drop' } : {})
} as unknown as Agent));

/* 0.5.3, F25: THE PRO RAIL V2 (Pam's prototype, sidebar-pro/v3). Every state
   the row can be in, on one rail, with the doors the row reads answered from
   here: mail to the person (the badge and its tip), the ledger (the task line,
   Asked you, Finished), the activity stamp (the age), the control snapshot
   (the menu's Pause or Resume). The founder's screenshots in
   evidence/pro-rail-v2/ come from this frame. */
// The Classic board above declares NOW too; one clock for both frames.
const RAIL_V2: Agent[] = ([
  { id: 'v2-steve', name: 'Steve Jobs', character: 'michael', isGod: true, project: '', provider: 'claude', model: 'claude-opus-5-5[1m]', status: 'working', contextLimit: 1_000_000, contextTokens: 290_000, action: 'Routing 3 messages, reviewing the Teams proof from Creed and drafting the next task for Kevin once the retries land', note: 'Runs the floor' },
  { id: 'v2-kevin', name: 'Kevin', character: 'kevin', project: 'md-server', provider: 'claude', model: 'claude-fable-5-1', status: 'working', contextLimit: 200_000, contextTokens: 14_000, action: 'Writing the /me route, 4 of 6 cases green' },
  { id: 'v2-creed', name: 'Creed', character: 'creed', project: 'md-server', provider: 'claude', model: 'claude-fable-5', status: 'waiting', contextLimit: 200_000, contextTokens: 14_000, action: 'Waiting on Kevin for the relay schema', note: 'Prefers the flat schema.\nDo not let it touch the Mongo indexes.' },
  { id: 'v2-darryl', name: 'Darryl', character: 'oscar', project: 'md-server', provider: 'codex', model: 'gpt-5.5', status: 'working', contextLimit: 200_000, contextTokens: 44_000, action: 'Running the billing webhook tests, 88 of 120', onHold: true },
  { id: 'v2-andy', name: 'Andy', character: 'andy', project: 'harnessmd.com', provider: 'claude', model: 'claude-opus-5-5[1m]', status: 'blocked', contextLimit: 1_000_000, contextTokens: 140_000, action: '', blockReason: { summary: 'Which receipt layout ships, A or B?', detail: '', actions: [] } },
  { id: 'v2-pam', name: 'Pam', character: 'pam', project: 'harnessmd.com', provider: 'claude', model: 'claude-fable-5', status: 'idle', contextLimit: 200_000, contextTokens: 44_000, action: 'Delivered the Pro sidebar prototype', note: 'HTML mockups.\nAsk before drawing, three versions when asked for three.' },
  { id: 'v2-ryan', name: 'Ryan', character: 'ryan', project: 'harnessmd.com', provider: 'gemini', model: 'gemini-3-pro', status: 'thinking', contextLimit: 1_000_000, contextTokens: 200_000, action: 'Planning the pricing endpoint change' },
  { id: 'v2-bob', name: 'BOB', character: 'jim', project: '', provider: 'claude', model: 'claude-opus-5-5[1m]', status: 'idle', action: '', exit: { verdict: 'crashed', exitCode: 1, at: NOW - 12 * 60_000 }, command: 'claude --model opus' },
  { id: 'v2-grok', name: 'GROK', character: 'toby', project: '', provider: 'grok', model: '', status: 'idle', action: '' }
] as Partial<Agent>[]).map((a) => ({ accent: 'mint', description: '', tmuxTarget: '', cwd: '/w', progress: 0, ptyId: `pty-${a.id}`, ...a } as unknown as Agent));
const RAIL_TASKS = { tasks: [
  { id: 'T-118', title: 'Billing webhook retries', status: 'doing', assignee: 'v2-kevin', dependsOn: [], priority: 1, createdAt: '2026-09-23T08:00:00.000Z' },
  { id: 'T-119', title: 'Relay schema for Teams', status: 'doing', assignee: 'v2-creed', dependsOn: [], priority: 1, createdAt: '2026-09-23T08:00:00.000Z' },
  { id: 'T-117', title: 'Webhook test suite', status: 'doing', assignee: 'v2-darryl', dependsOn: ['T-118', 'T-119'], priority: 4, description: 'Cover the billing webhook end to end.\nSigned body, Bearer and header secret.\nA replayed delivery is refused.\nA taken port moves the server.\nThe retry envelope matches Kevin\'s draft.\nRed until the relay schema lands.\nThis seventh line is cut from the tip.', createdAt: '2026-09-23T08:00:00.000Z' },
  { id: 'T-120', title: 'Team knowledge receipt', status: 'blocked', assignee: 'v2-andy', dependsOn: [], priority: 1, createdAt: '2026-09-23T08:00:00.000Z', humanQA: [{ q: 'Which receipt layout ships, A or B?', askedAt: '2026-09-23T09:00:00.000Z' }] },
  { id: 'T-122', title: 'Pro sidebar prototype', status: 'done', assignee: 'v2-pam', dependsOn: [], priority: 1, createdAt: '2026-09-22T08:00:00.000Z', doneAt: new Date(NOW - 18 * 60_000).toISOString() },
  // The Asked you strip from a CARD (Andy's comes from his session's block
  // reason, which wins): markdown in, plain words out (T133 follow up).
  { id: 'T-127', title: 'Drop page accent', status: 'blocked', assignee: 'v2-pam', dependsOn: [], priority: 1, createdAt: '2026-09-23T08:00:00.000Z', humanQA: [{ q: '**Which accent colour for the drop page, `sky` or `mint`?**\n\n- `sky`\n- `mint`', askedAt: '2026-09-23T09:30:00.000Z' }] },
  { id: 'T-121', title: 'Regional pricing rollout', status: 'doing', assignee: 'v2-ryan', dependsOn: [], priority: 1, createdAt: '2026-09-23T08:00:00.000Z' }
] };
const RAIL_AGES: Record<string, number> = { 'v2-steve': 2_000, 'v2-kevin': 12_000, 'v2-creed': 9 * 60_000, 'v2-darryl': 3_000, 'v2-andy': 4 * 60_000, 'v2-pam': 18 * 60_000, 'v2-ryan': 40_000, 'v2-grok': 2 * 3600_000 };
const RAIL_MAIL = {
  'v2-steve': { count: 2, latest: new Date(NOW - 2 * 60_000).toISOString(), texts: [
    { id: 'm1', at: new Date(NOW - 2 * 60_000).toISOString(), subject: 'Sidebar options are in, pick one when you can. V2 is my pick but the context bar needs a cleaner home before we ship it.', body: '' },
    { id: 'm2', at: new Date(NOW - 11 * 60_000).toISOString(), subject: 'Kevin and Creed are both on the relay schema now, I split T-119 so Creed is not blocked on the webhook retries.', body: '' }
  ] },
  'v2-creed': { count: 3, latest: new Date(NOW - 9 * 60_000).toISOString(), texts: [
    { id: 'm3', at: new Date(NOW - 9 * 60_000).toISOString(), subject: 'Relay schema blocked on Kevin, can you nudge? I need the retry envelope shape before I can finish the Teams relay and the tests are red until then.', body: '' },
    { id: 'm4', at: new Date(NOW - 14 * 60_000).toISOString(), subject: 'Two options for the schema in my note. Flat keeps the Mongo indexes untouched, nested is what Kevin drafted.', body: '' },
    { id: 'm5', at: new Date(NOW - 3600_000).toISOString(), subject: 'Picked up T-119, reading the relay code first.', body: '' }
  ] },
  'v2-andy': { count: 1, latest: new Date(NOW - 4 * 60_000).toISOString(), texts: [
    { id: 'm6', at: new Date(NOW - 4 * 60_000).toISOString(), subject: 'Both layouts are done and rendered at hive/shared/design/receipt. A is the compact one, B keeps the full ledger. Need your pick.', body: '' }
  ] }
};
function RailV2Frame({ bare = false }: { bare?: boolean }) {
  useStore.setState({ agents: RAIL_V2 });
  const cth = window.cth as unknown as Record<string, unknown>;
  // Pam last opened 20 minutes ago, before her card was done: Finished shows.
  // Written once, so opening a row in the frame keeps its own mark.
  useState(() => { try { window.localStorage.setItem('cth.proRail.seen', JSON.stringify({ opened: { 'v2-pam': new Date(NOW - 20 * 60_000).toISOString() }, done: { 'v2-pam': [] } })); } catch { /* noop */ } return null; });
  Object.assign(cth, {
    hiveHumanMailSince: (since: Record<string, string>) => Promise.resolve(Object.fromEntries(Object.entries(RAIL_MAIL).filter(([id]) => !since[id]))),
    hiveTasks: () => Promise.resolve(RAIL_TASKS),
    agentActivity: (id: string) => Promise.resolve(id in RAIL_AGES ? [{ ts: NOW - RAIL_AGES[id], kind: 'tool', tool: 'Read' }] : []),
    onAgentActivity: () => () => {},
    onAgentHold: () => () => {},
    onHiveMessage: () => () => {},
    controlSnapshot: () => Promise.resolve({ paused: false, halted: false }),
    hiveSetAgentHold: (_id: string, hold: boolean) => Promise.resolve({ ok: true, onHold: hold }),
    listWorkers: () => Promise.resolve({ live: [], recent: [] })
  });
  const [current, setCurrent] = useState('agent:v2-kevin');
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <ProSidebar current={current} onSelect={(s) => setCurrent(String(s))} companyRows={[]} onToggleTheme={() => {}} appVersion="0.5.3" agentsAndNotesOnly={bare} />
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--cth-ink-500)', fontSize: 12 }}>
        the screen ({current})
      </div>
    </div>
  );
}

/* 0.5.3, the Pro rail V2 founder requirements: the Ask me section on every
   agent's Inbox (a worker's and the orchestrator's), and the Ask me modal the
   section's rows and the bell open. Andy asks two questions; one card has no
   assignee, which is the orchestrator's; Pam's Asked you question stays on
   Pam. The ledger is patched in memory, so Answer and Dismiss really move a
   card out of the list here. */
const ASK_TASKS = { tasks: [
  ...RAIL_TASKS.tasks,
  { id: 'T-124', title: 'Receipt copy for the Teams plan', status: 'blocked', assignee: 'Andy', dependsOn: [], priority: 1, createdAt: '2026-09-23T08:00:00.000Z', humanQA: [{ q: '**Does the receipt say "seats" or "members"?** The invoice PDF says seats, the app says members.\n\n- `seats`\n- `members`', askedAt: new Date(NOW - 25 * 60_000).toISOString() }] },
  { id: 'T-125', title: 'Razorpay live keys', status: 'blocked', dependsOn: [], priority: 1, createdAt: '2026-09-23T07:00:00.000Z', humanQA: [{ q: '**I need the Razorpay live key pair to finish the billing switch.** Paste them in Settings, Connections, then answer `done`.', askedAt: new Date(NOW - 50 * 60_000).toISOString() }] },
  { id: 'T-126', title: 'Drop copy for 0.5.3', status: 'blocked', assignee: 'v2-pam', dependsOn: [], priority: 1, createdAt: '2026-09-23T07:00:00.000Z', humanQA: [{ q: 'Is "Ask me" the name on the modal, or "Questions for you"?', askedAt: new Date(NOW - 7 * 60_000).toISOString() }] }
] };
const ASK_MESSAGES: Record<string, unknown[]> = {
  'v2-andy': [{ id: 'am1', from: 'v2-andy', to: 'god', act: 'inform', subject: 'Both receipt layouts are rendered, need a pick', body: 'Both layouts are in hive/shared/design/receipt and both render at every width I tried, A is the compact one that keeps the totals block and the seat count on one line and drops the per member rows below a fold, B keeps the full ledger with a row per member and the tax lines inline, which is longer but matches the invoice PDF line for line, and my pick would be A for the app and B for the PDF but that is two layouts to maintain, so the one question is whether the receipt and the invoice must read the same.', created_at: new Date(NOW - 30 * 60_000).toISOString() }],
  'v2-steve': [{ id: 'am2', from: 'god', to: 'v2-kevin', act: 'request', subject: 'Take T-118, billing webhook retries', body: '', created_at: new Date(NOW - 40 * 60_000).toISOString() }]
};
/* 0.5.3, founder 24 Sep 2026: "the ask me box should be smaller and placed
   somewhere else and blend with the theme". The dock is only itself with the
   composer under it, so this frame draws the real pair: the thread, the
   section, the composer. One column with a single question, one with three.
   The counts are exact, so the frame's own tasks replace the rail's. */
const DOCK_TASKS = { tasks: [
  { id: 'T-118', title: 'Billing webhook retries', status: 'blocked', assignee: 'v2-kevin', dependsOn: [], priority: 1, createdAt: '2026-09-23T08:00:00.000Z', humanQA: [{ q: 'Do the webhook retries back off for 24 hours, or give up after the fourth try?', askedAt: new Date(NOW - 6 * 60_000).toISOString() }] },
  { id: 'T-120', title: 'Team knowledge receipt', status: 'blocked', assignee: 'v2-andy', dependsOn: [], priority: 1, createdAt: '2026-09-23T08:00:00.000Z', humanQA: [{ q: '**Which receipt layout ships, A or B?** A is the compact one, B keeps the full ledger with a row per member and the tax lines inline.', askedAt: new Date(NOW - 4 * 60_000).toISOString() }] },
  { id: 'T-124', title: 'Receipt copy for the Teams plan', status: 'blocked', assignee: 'v2-andy', dependsOn: [], priority: 1, createdAt: '2026-09-23T08:00:00.000Z', humanQA: [{ q: 'Does the receipt say "seats" or "members"? The invoice PDF says seats, the app says members.', askedAt: new Date(NOW - 25 * 60_000).toISOString() }] },
  { id: 'T-128', title: 'Tax line for the EU', status: 'blocked', assignee: 'v2-andy', dependsOn: [], priority: 1, createdAt: '2026-09-23T06:00:00.000Z', humanQA: [{ q: 'The EU tax line needs a VAT number on the receipt and I cannot find where the company one is stored, is it in Settings or in the licence?', askedAt: new Date(NOW - 70 * 60_000).toISOString() }] }
] };
/* Dismiss all's one call, as main answers it: every card in one pass, a card
   that is gone skipped. Slowed so the list can be seen clearing before the
   answer; ?fail=<card id> leaves that card out, as a failed card. */
function patchAllSlowly<T extends { id: string }>(tasks: T[], patches: Array<{ id: string; patch: Record<string, unknown> }>): Promise<{ ok: boolean; applied: string[] }> {
  const fail = new URLSearchParams(window.location.search).get('fail');
  const applied: string[] = [];
  for (const { id, patch } of patches) {
    const i = tasks.findIndex((x) => x.id === id);
    if (i < 0 || id === fail) continue;
    tasks[i] = { ...tasks[i], ...patch };
    applied.push(id);
  }
  return new Promise((r) => window.setTimeout(() => r({ ok: true, applied }), 1500));
}
function AskMeDockFrame() {
  useStore.setState({ agents: RAIL_V2 });
  const cth = window.cth as unknown as Record<string, unknown>;
  // A ledger the frame can write, so Dismiss all runs end to end here.
  const [ledger] = useState(() => ({ tasks: DOCK_TASKS.tasks.map((x) => ({ ...x })) }));
  Object.assign(cth, {
    hiveTasks: () => Promise.resolve({ tasks: ledger.tasks.map((x) => ({ ...x })) }),
    hivePatchTask: (id: string, patch: Record<string, unknown>) => {
      const i = ledger.tasks.findIndex((x) => x.id === id);
      if (i >= 0) ledger.tasks[i] = { ...ledger.tasks[i], ...patch } as (typeof ledger.tasks)[number];
      return Promise.resolve({ ok: i >= 0 });
    },
    hivePatchTasks: (patches: Array<{ id: string; patch: Record<string, unknown> }>) => patchAllSlowly(ledger.tasks, patches),
    hiveMessages: ({ agentId }: { agentId: string }) => Promise.resolve(ASK_MESSAGES[agentId] ?? []),
    hiveSend: () => Promise.resolve({ ok: true }),
    historyList: () => Promise.resolve([]),
    agentActivity: () => Promise.resolve([]),
    onAgentActivity: () => () => {},
    onHiveMessage: () => () => {}
  });
  const column = (a: Agent, label: string) => (
    <div key={a.id} data-dock-column={a.id} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 18px', borderBottom: '1px solid var(--cth-ink-300)', flexShrink: 0 }}>
        <b style={{ fontSize: 14 }}>{a.name}</b>
        <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{label}</span>
        <span style={{ flex: 1 }} />
        <AskMeBell agent={a} />
      </div>
      <AgentInbox agent={a} />
      <Composer agent={a} />
    </div>
  );
  return (
    <PaneNavProvider value={{ current: 'inbox', go: () => {} }}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        {column(RAIL_V2.find((a) => a.id === 'v2-kevin')!, '1 question')}
        {column(RAIL_V2.find((a) => a.id === 'v2-andy')!, '3 questions')}
      </div>
      <AskMeModalHost />
      <ProToastHost />
    </PaneNavProvider>
  );
}

function AskMeFrame() {
  useStore.setState({ agents: RAIL_V2 });
  const cth = window.cth as unknown as Record<string, unknown>;
  const [ledger] = useState(() => ({ tasks: ASK_TASKS.tasks.map((x) => ({ ...x })) }));
  Object.assign(cth, {
    hiveTasks: () => Promise.resolve({ tasks: ledger.tasks.map((x) => ({ ...x })) }),
    hivePatchTask: (id: string, patch: Record<string, unknown>) => {
      const i = ledger.tasks.findIndex((x) => x.id === id);
      if (i >= 0) ledger.tasks[i] = { ...ledger.tasks[i], ...patch } as (typeof ledger.tasks)[number];
      return Promise.resolve({ ok: i >= 0 });
    },
    hivePatchTasks: (patches: Array<{ id: string; patch: Record<string, unknown> }>) => patchAllSlowly(ledger.tasks, patches),
    hiveSend: () => Promise.resolve({ ok: true }),
    hiveMessages: ({ agentId }: { agentId: string }) => Promise.resolve(ASK_MESSAGES[agentId] ?? []),
    historyList: () => Promise.resolve([]),
    agentActivity: () => Promise.resolve([]),
    onAgentActivity: () => () => {},
    onHiveMessage: () => () => {}
  });
  const column = (a: Agent) => (
    <div key={a.id} data-ask-frame-agent={a.id} style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 18px', borderBottom: '1px solid var(--cth-ink-300)', flexShrink: 0 }}>
        <b style={{ fontSize: 15 }}>{a.name}</b>
        <span style={{ flex: 1 }} />
        <AskMeBell agent={a} />
      </div>
      <AgentInbox agent={a} />
    </div>
  );
  return (
    <PaneNavProvider value={{ current: 'inbox', go: () => {} }}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        {column(RAIL_V2.find((a) => a.id === 'v2-andy')!)}
        {column(RAIL_V2.find((a) => a.isGod)!)}
      </div>
      <AskMeModalHost />
    </PaneNavProvider>
  );
}

/* `keep`: Keep my agent order on, so every row draws its reorder handle
   under the avatar (0.5.3 batch 3; ?only=order). */
function SidebarFrame({ keep = false }: { keep?: boolean }) {
  useStore.setState({ agents: SIDEBAR_AGENTS });
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <ProSidebar current="agent:preview-jim" onSelect={() => {}} companyRows={[]} onToggleTheme={() => {}} appVersion="0.0.0"
        keepAgentOrder={keep} savedAgentOrder={keep ? SIDEBAR_AGENTS.map((a) => a.id) : undefined} />
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--cth-ink-500)', fontSize: 12 }}>
        the screen
      </div>
    </div>
  );
}

/* 0.5.3, bug 10 (Jinbo, 13 Sep 2026): the memory cards clipped in the Chinese
   UI. The screen reads notes over IPC, so the frame answers `hiveMemory` with
   notes in Chinese, long unbroken runs included, which is the text that bit.
   Switch the harness language to zh-CN to see the chips at their widest. */
const ZH_MEMORY = [
  '# 记忆',
  '## Pinned',
  '- **发布流程必须先在预发布环境完整验证后才能推送到生产环境并通知所有相关负责人**：任何人不得跳过。',
  '- **支付回调地址** https://example.com/api/v1/payments/razorpay/webhook/callback/verification/endpoint 不可更改',
  '## Summary',
  '**季度总结以及下一个季度的全部工作计划安排与人员分工明细说明文档**：本季度完成了侧边栏重构、记忆面板、技能安装器以及多语言界面的全部工作。',
  '## 2026-09-13 记忆面板卡片在中文界面下文字和标签被右侧边缘裁切的问题排查记录',
  '卡片里的文字和标签超出了右边缘，需要在中文界面下复现并修复，同时检查深色与浅色两种主题。'
].join('\n');

function MemoryFrame() {
  useStore.setState({ agents: SIDEBAR_AGENTS });
  const cth = (window as unknown as { cth: Record<string, unknown> }).cth;
  cth.hiveMemory = () => Promise.resolve(ZH_MEMORY);
  cth.harnessHomeSync = () => '/Users/you/HarnessAgents';
  cth.hiveLog = () => Promise.resolve([]);
  cth.memoryStatus = () => Promise.resolve({ active: false });
  cth.listDir = () => Promise.resolve(null);
  cth.hiveMessages = () => Promise.resolve([]);
  // A search that finds something: two hits, each naming a ticket, so the
  // result cards draw their chips and their ticket rows.
  cth.textSearch = () => Promise.resolve({ ok: true, results: [
    { source: 'preview-pam/memory.md', excerpt: 'mdv-4821 记忆面板卡片在中文界面下文字和标签被右侧边缘裁切，需要在预发布环境完整验证后才能推送到生产环境。https://example.com/api/v1/payments/razorpay/webhook/callback/verification/endpoint' },
    { source: 'preview-jim/memory.md', excerpt: 'mdv-4822 技能安装器拒绝安装体积过大的技能包，需要重新评估体积上限并补充二进制文件下载路径。' }
  ] });
  cth.hiveTasks = () => Promise.resolve({ tasks: [
    { id: 'mdv-4821', title: '记忆面板卡片在中文界面下文字和标签被右侧边缘裁切的问题需要尽快排查并修复', status: 'doing', assignee: 'preview-pam', description: '记忆 卡片 裁切' },
    { id: 'mdv-4822', title: '技能安装器体积上限重新评估以及二进制文件下载路径的补充实现与回归测试', status: 'blocked', assignee: 'preview-jim', description: '记忆 技能', humanQA: [{ q: '体积上限定为 16 MiB 可以吗？', askedAt: '2026-09-20T01:00:00.000Z' }] }
  ] });
  return (
    <PaneNavProvider value={{ current: 'memory', go: () => {} }}>
      <div style={{ position: 'relative', height: '100%' }}><MemoryScreen config={null} /></div>
    </PaneNavProvider>
  );
}

/* 0.5.3, bug 8: the professional composer, live. Copy a picture, click in the
   box and paste: a chip appears. The harness has no main process, so the file
   main would write is answered here with a fixed name. */
function ComposerFrame() {
  useStore.setState({ agents: SIDEBAR_AGENTS });
  const cth = (window as unknown as { cth: Record<string, unknown> }).cth;
  cth.saveClipboardImage = () => Promise.resolve({ ok: true, file: { path: '/tmp/cth-pastes/paste-1758300000000.png', name: 'paste-1758300000000.png' } });
  cth.pathForFile = (f: File) => `/Users/you/Desktop/${f.name}`;
  return (
    <PaneNavProvider value={{ current: 'agents', go: () => {} }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><Composer agent={SIDEBAR_AGENTS[1]} /></div>
    </PaneNavProvider>
  );
}

/* 0.5.3, I8: the attach button takes PDFs, videos and folders. `platform`
   stands in for the OS: the Mac draws one button whose picker takes both
   kinds, Windows and Linux one per kind. The harness has no native picker, so
   the answer is what the person would pick: a PDF, a video and a folder, or
   only the kind the button asked for. The last kind asked is kept on window
   for the driver to read. */
function AttachFrame({ platform }: { platform: string }) {
  useStore.setState({ agents: SIDEBAR_AGENTS });
  const cth = (window as unknown as { cth: Record<string, unknown> }).cth;
  cth.platform = platform;
  const pdf = { path: '/Users/you/Documents/brief.pdf', name: 'brief.pdf' };
  const video = { path: '/Users/you/Movies/demo.mp4', name: 'demo.mp4' };
  const folder = { path: '/Users/you/Designs/screens', name: 'screens/' };
  cth.attachFiles = (want: string) => {
    (window as unknown as { __attachWant?: string }).__attachWant = want;
    const files = want === 'folders' ? [folder] : want === 'files' ? [pdf, video] : [pdf, video, folder];
    return Promise.resolve({ ok: true, files });
  };
  return (
    <PaneNavProvider value={{ current: 'agents', go: () => {} }}>
      <div data-attach-platform={platform} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><Composer agent={SIDEBAR_AGENTS[1]} /></div>
    </PaneNavProvider>
  );
}

/* 0.5.3, founder ask 25 Sep: find and replace in an open file. The bar is
   Monaco's own widget, opened here with its replace row out and "save"
   searched, under a stand in tab strip so it is plain the bar stays in the
   editor. ?only=idefind&w=<px>&dir=rtl for a narrow pane or Arabic. */
const FIND_SAMPLE = `export function save(rel: string) {\n  // save the buffer, then clear the dirty dot\n  const buf = buffers[rel];\n  if (!buf) return;\n  return window.cth.ideWrite(rel, buf.content).then(() => markSaved(rel));\n}\n\nexport function saveAll() {\n  for (const rel of Object.keys(buffers)) void save(rel);\n}\n`;
function IdeFindFrame() {
  const [text, setText] = useState(FIND_SAMPLE);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--cth-paper-100)' }}>
      <div data-fake-tabs style={{ height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', fontSize: 12, color: 'var(--cth-ink-700)' }}>
        <span>save.ts</span><span style={{ color: 'var(--cth-ink-500)' }}>ideBuffers.ts</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MonacoEditor
          path="save.ts"
          value={text}
          onChange={setText}
          onEditor={(ed) => {
            if (!ed) return;
            ed.setSelection({ startLineNumber: 1, startColumn: 17, endLineNumber: 1, endColumn: 21 });
            void ed.getAction('editor.action.startFindReplaceAction')?.run();
          }}
        />
      </div>
    </div>
  );
}

/* 0.5.3, founder on rc.4: a card dropped anywhere in a column lands there.
   Short columns (one empty) on a tall board, so the space under the cards is
   most of the screen. ?only=tasks */
const BOARD_TASKS = [
  { id: 'T-201', title: 'Receipt layout A or B', status: 'todo', assignee: 'v2-andy', dependsOn: [], priority: 1, createdAt: '2026-09-24T08:00:00.000Z' },
  { id: 'T-202', title: 'Billing webhook retries', status: 'todo', assignee: 'v2-kevin', dependsOn: [], priority: 1, createdAt: '2026-09-24T09:00:00.000Z' },
  { id: 'T-203', title: 'EU tax line on the receipt', status: 'doing', assignee: 'v2-andy', dependsOn: [], priority: 1, createdAt: '2026-09-24T10:00:00.000Z' },
  { id: 'T-204', title: 'Seats or members in the copy', status: 'done', assignee: 'v2-andy', dependsOn: [], priority: 2, createdAt: '2026-09-23T10:00:00.000Z' }
];
function TasksBoardFrame() {
  useStore.setState({ agents: RAIL_V2 });
  try { localStorage.setItem('cth.tasksView', 'board'); } catch { /* private mode */ }
  const cth = window.cth as unknown as Record<string, unknown>;
  // ?many=N adds N cards to To do, for a column longer than the screen.
  const many = Number(new URLSearchParams(window.location.search).get('many') ?? 0);
  const extra = Array.from({ length: many }, (_, i) => ({ ...BOARD_TASKS[1], id: `T-3${String(i).padStart(2, '0')}`, title: `Filler card ${i + 1}` }));
  Object.assign(cth, { hiveTasks: () => Promise.resolve({ tasks: [...BOARD_TASKS, ...extra].map((x) => ({ ...x })) }), hiveTasksArchive: () => Promise.resolve({ tasks: [] }) });
  return (
    <PaneNavProvider value={{ current: 'tasks', go: () => {} }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--cth-cream-50)' }}>
        <TasksScreen />
      </div>
    </PaneNavProvider>
  );
}

/* 0.5.3, founder on rc.4: the agent's Tasks tab. One card per status and one
   that is someone else's (it must not show). ?only=agenttasks&lang=ar */
function AgentTasksFrame() {
  const h = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();
  const pam = RAIL_V2.find((a) => a.id === 'v2-andy')!;
  const ledger = [
    { id: 'T-120', title: 'Team knowledge receipt, layout A', status: 'done' as const, assignee: pam.id, dependsOn: [], priority: 1, createdAt: h(80), doneAt: h(2), result: 'Shipped layout A' },
    { id: 'T-128', title: 'Tax line for the EU', status: 'doing' as const, assignee: pam.name, dependsOn: [], priority: 1, createdAt: h(30), startedAt: h(5) },
    { id: 'T-124', title: 'Receipt copy for the Teams plan', status: 'blocked' as const, assignee: pam.id, dependsOn: [], priority: 1, createdAt: h(100), humanQA: [{ q: 'Seats or members?', askedAt: h(72) }] },
    { id: 'T-131', title: 'Receipt PDF font', status: 'todo' as const, assignee: pam.id, dependsOn: [], priority: 2, createdAt: h(1000) },
    { id: 'T-118', title: 'Billing webhook retries', status: 'doing' as const, assignee: 'v2-kevin', dependsOn: [], priority: 1, createdAt: h(3) }
  ];
  const lang = new URLSearchParams(window.location.search).get('lang');
  useEffect(() => {
    if (!lang) return;
    void i18nInstance.changeLanguage(lang);
    document.documentElement.setAttribute('dir', directionFor(lang));
  }, [lang]);
  return <AgentTasks agent={pam} tasks={agentTasks(ledger, pam)} />;
}

/* 0.5.3 review, findings 7 and 16: the IDE shortcut, live. The box stands in for
   a focused terminal and writes down every key it is sent. Click in it, press
   Command I (Control I off a Mac): the IDE opens and what you type next must NOT
   appear in the log, and Escape must close the IDE without reaching the box.
   With the stand in modal up the chord must do nothing. */
function IdeShortcutFrame() {
  const ideOpen = useStore((s) => s.ideOpen);
  const [modal, setModal] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--cth-cream-50)', fontSize: 12 }}>
      <textarea data-fake-terminal placeholder="stand in for a focused terminal" onKeyDown={(e) => setLog((l) => [...l, e.key])} style={{ height: 40 }} />
      <div data-key-log style={{ fontFamily: 'var(--cth-font-mono)', color: 'var(--cth-ink-700)' }}>keys the terminal was sent: {log.join(' ') || 'none'}</div>
      <div><button type="button" data-toggle-modal onClick={() => setModal((m) => !m)}>{modal ? 'close the modal' : 'open a modal (z 300, like Settings)'}</button></div>
      {/* Through a portal: a frame clips its fixed children to itself, and a modal
          the size of the frame is not what the app draws. */}
      {modal && createPortal(
        <div data-fake-modal onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(26, 19, 32, 0.7)', display: 'grid', placeItems: 'center' }}>
          <div style={{ background: 'var(--cth-cream-50)', padding: 24 }}>a modal. Command I must do nothing now. Click to close.</div>
        </div>,
        document.body
      )}
      <IdeShortcut />
      {ideOpen && createPortal(<IdePanel />, document.body)}
    </div>
  );
}

/* 0.5.3, feature 24: the worktree list. The stub answers the way main does and
   at the speed it was measured at: the list at once, what a row holds a moment
   later, its size last. Delete follows main's rule: a clean folder goes, one
   holding work is refused until the warning was shown, a running agent's never. */
const DAY = 86_400_000;
const WT_ROWS: Array<WorktreeRow & { work: WorktreeWork | null; size: number }> = [
  { path: '/h/worktrees/jim-msiupp4g', name: 'jim-msiupp4g', projectRoot: '/code/MunderDifflin', branch: 'content/launch-posts', createdAt: Date.now() - 61 * DAY, live: false, work: { base: null, known: true, uncommitted: 21, unmerged: 0 }, size: 1.1 * 1024 ** 3 },
  { path: '/h/worktrees/pam-msiuqzw9', name: 'pam-msiuqzw9', projectRoot: '/code/MunderDifflin', branch: 'landing/personal-agi-variants', createdAt: Date.now() - 60 * DAY, live: false, work: { base: null, known: true, uncommitted: 1, unmerged: 2 }, size: 31.8 * 1024 ** 2 },
  { path: '/h/worktrees/worker-meredith-onboarding-engine-fix', name: 'worker-meredith-onboarding-engine-fix', projectRoot: '/code/MunderDifflin', branch: 'agent/worker-meredith-onboarding-engine-fix', createdAt: Date.now() - 29 * DAY, live: false, work: { base: 'main', known: true, uncommitted: 0, unmerged: 0 }, size: 72.8 * 1024 ** 2 },
  { path: '/h/worktrees/kevin-server', name: 'kevin-server', projectRoot: null, branch: null, createdAt: Date.now() - 12 * DAY, live: false, work: null, size: 412 * 1024 ** 2 },
  { path: '/h/worktrees/bob-mtzs7t19', name: 'bob-mtzs7t19', projectRoot: '/code/MunderDifflin', branch: null, createdAt: Date.now() - DAY, live: false, work: { base: 'main', known: false, uncommitted: 0, unmerged: 0 }, size: 90 * 1024 ** 2 },
  { path: '/h/worktrees/creed-mt7sph23', name: 'creed-mt7sph23', projectRoot: '/code/MunderDifflin', branch: 'teams/clients-backend', createdAt: Date.now() - 1000, live: true, work: { base: 'main', known: true, uncommitted: 111, unmerged: 3 }, size: 1.8 * 1024 ** 3 }
];
function WorktreesFrame({ chrome }: { chrome: 'modal' | 'inline' }) {
  const cth = (window as unknown as { cth: Record<string, unknown> }).cth;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let rows = [...WT_ROWS];
  cth.listOwnedWorktrees = async () => rows.map(({ work: _w, size: _s, ...r }) => r);
  cth.worktreeWork = async (p: string) => { await wait(300); return rows.find((r) => r.path === p)?.work ?? null; };
  cth.worktreeSize = async (p: string) => { await wait(1200); return rows.find((r) => r.path === p)?.size ?? null; };
  cth.removeOwnedWorktree = async (p: string, confirmed: boolean) => {
    await wait(400);
    const r = rows.find((x) => x.path === p);
    if (!r) return { ok: false, code: 'outside' };
    if (r.live) return { ok: false, code: 'live' };
    if (!r.work) return { ok: false, code: 'not-a-worktree' };
    if ((!r.work.known || r.work.uncommitted > 0 || r.work.unmerged > 0) && !confirmed) return { ok: false, code: 'needs-confirm', work: r.work };
    rows = rows.filter((x) => x.path !== p);
    return { ok: true };
  };
  return <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: 24, background: 'var(--cth-cream-50)' }}><WorktreesPanel chrome={chrome} /></div>;
}

/* 0.5.3, feature 5: the Ask Me badge in an agent screen's bar. The Memory
   frame's ledger has one blocked card with an open question, asked by Jim, so
   Jim's bar shows the filled badge and Pam's shows the quiet one. */
function AskMeBellFrame() {
  const bar = (a: Agent) => (
    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 18px', borderBottom: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)' }}>
      <b style={{ fontSize: 16 }}>{a.name}</b>
      <span style={{ flex: 1 }} />
      <AskMeBell agent={a} />
      <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>the rest of the bar</span>
    </div>
  );
  return (
    <PaneNavProvider value={{ current: 'agents', go: () => {} }}>
      {bar(SIDEBAR_AGENTS[1])}
      {bar(SIDEBAR_AGENTS[2])}
    </PaneNavProvider>
  );
}

/* Two avatars for the picker frame. Registered here so the painter can draw a
   `custom:<id>` tile in the harness, where nothing mirrors config. */
const DEMO_AVATARS: CustomAvatar[] = [
  { id: 'demo0001', name: 'Holly', recipe: presetRecipe(7), createdAt: '2026-09-03T00:00:00.000Z', updatedAt: '2026-09-03T00:00:00.000Z' },
  { id: 'demo0002', name: 'Erin', recipe: randomRecipe(42, 'women'), createdAt: '2026-09-03T00:00:00.000Z', updatedAt: '2026-09-03T00:00:00.000Z' },
];
setCustomAvatars(DEMO_AVATARS);

function PickerFrame() {
  const [c, setC] = useState<OfficeCharacterName>('custom:demo0001');
  return <CharacterPicker value={c} onPick={setC} accent="sky" scale={2} avatars={DEMO_AVATARS} />;
}

const rekeyed = MOCK_TEAMMATES.find(m => m.previousFingerprint)!;
const pam = MOCK_TEAMMATES[0]!;
const offlineMate = MOCK_TEAMMATES.find(m => m.presence === 'offline')!;
/* MOCK_THREAD's last message is hardcoded `sending`, so the queued and failed
   renderings had no way to appear. These re-stamp only that message. */
const withDelivery = (d: ThreadMessage['delivery']): ThreadMessage[] =>
  MOCK_THREAD.map((m, i) => (i === MOCK_THREAD.length - 1 ? { ...m, delivery: d } : m));

const STOP_REASONS: StopReason[] = ['suspended', 'removed', 'entitlement', 'unknown'];
const LAST_SEEN = '2026-09-01T09:14:00.000Z';
const lock = (kind: LockInfo['kind'], reason: LockInfo['reason']): LockInfo =>
  ({ kind, reason, orgName: 'Dunder Mifflin Scranton', lastVerifiedAt: LAST_SEEN });
const LOCKS: { label: string; info: LockInfo }[] = [
  { label: 'suspended: seat held, no new code', info: lock('revoked', 'suspended') },
  { label: 'removed: solo or a new code', info: lock('revoked', 'removed') },
  { label: 'entitlement: the org\'s problem, not theirs', info: lock('revoked', 'entitlement') },
  { label: 'unknown: two unauthorized, no /me to ask', info: lock('revoked', 'unknown') },
  { label: 'lease: 72 h unreached, reconnect only', info: lock('lease', null) },
];

const ORG: OrgView = {
  available: true, orgId: 'org_1', name: 'Dunder Mifflin Scranton',
  signingKey: 'k', keyGroups: '7C1D 44B0 E9A2 0F6E 58C3 A17B', keyVerified: false, keyPreviousGroups: null,
  defaultPermission: 'communication-only', requireFingerprint: false,
  entitlement: { state: 'trialing', trialEndsAt: '2026-09-15T00:00:00.000Z', graceEndsAt: null },
  seatsUsed: 4, seatsPaid: 5, you: { name: 'Pam Beesly', email: 'pam@dundermifflin.example', isAdmin: false },
  membership: 'active', fetchedAt: '2026-09-02T09:14:00.000Z',
};
const ORGS: { label: string; org: OrgView }[] = [
  { label: 'first sight, unverified, trial day 15', org: ORG },
  { label: 'verified, verification required', org: { ...ORG, keyVerified: true, requireFingerprint: true, entitlement: { state: 'healthy', trialEndsAt: null, graceEndsAt: null } } },
  { label: 'key CHANGED since verified', org: { ...ORG, keyPreviousGroups: '2A9F 10C4 77DE B3E1 6F02 9C58', entitlement: { state: 'payment-failed', trialEndsAt: null, graceEndsAt: '2026-09-20T00:00:00.000Z' } } },
  { label: 'today\'s relay: /me not reported', org: { ...ORG, available: false, signingKey: null, keyGroups: null, defaultPermission: null, requireFingerprint: null, entitlement: null, seatsUsed: null, seatsPaid: null, you: null, membership: null, fetchedAt: null } },
];

const CONNECTION_STATES: ConnectionState[] = [
  'connected', 'connecting', 'reconnecting', 'offline', 'network-blocked'
];

/**
 * Each frame catches its own errors. Without this, one component that needs IPC
 * throws and takes all twenty boards down with it, which turns a harness that
 * shows nineteen working screens into a blank page.
 */
class FrameBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        height: '100%', display: 'grid', placeItems: 'center', padding: 16,
        background: 'var(--cth-status-blocked-tint)'
      }}>
        <span style={{
          fontFamily: 'var(--cth-font-mono)', fontSize: 12,
          color: 'var(--cth-status-blocked)', textAlign: 'center'
        }}>
          did not render here — {this.state.error.message}
        </span>
      </div>
    );
  }
}

/* 0.5.3, F16 system audio PR 5: the Settings block "Also record the other
 * side of calls" in every state its line can show. ?only=sysaudio&state=<key>
 * draws one; the keys are the file names under evidence/f16-system-audio/. */
const SYS_AUDIO_STATES: Record<string, { platform: string; available: boolean; granted: boolean; source: 'helper' | 'renderer' | null; reason?: string; detail?: string }> = {
  'mac-granted': { platform: 'darwin', available: true, granted: true, source: 'helper' },
  'mac-not-granted': { platform: 'darwin', available: true, granted: false, source: null, reason: 'screen-not-granted' },
  'mac-too-old': { platform: 'darwin', available: false, granted: false, source: null, reason: 'macos-too-old' },
  'mac-no-helper': { platform: 'darwin', available: false, granted: false, source: null, reason: 'no-helper' },
  'win-ready': { platform: 'win32', available: true, granted: true, source: 'renderer' },
  'linux-found': { platform: 'linux', available: true, granted: true, source: 'renderer', detail: 'Monitor of Built-in Audio Analog Stereo' },
  'linux-none': { platform: 'linux', available: false, granted: true, source: null, reason: 'no-monitor' }
};
function SystemAudioFrame({ state }: { state: string }) {
  const sys = SYS_AUDIO_STATES[state] ?? SYS_AUDIO_STATES['mac-granted'];
  const cth = window.cth as unknown as Record<string, unknown>;
  const cfg = { ...DEFAULT_TRANSCRIBE };
  const status = {
    platform: sys.platform, engines: { apple: sys.platform === 'darwin', whisper: true, groq: false },
    chosen: { dictation: sys.platform === 'darwin' ? 'apple' : 'whisper', meeting: 'whisper' },
    model: { selected: 'base', inUse: 'base', installed: { base: true, small: false }, path: { base: '', small: '' } },
    words: { total: 214, custom: 0, whisperKept: 60, whisperPromptChars: 700 }, config: cfg
  };
  cth.transcribeStatus = async () => status;
  cth.transcribeSetConfig = async (patch: Record<string, unknown>) => ({ ok: true, config: { ...cfg, ...patch }, status });
  cth.anyAppStatus = async () => ({ available: sys.platform === 'darwin', armed: null, transcriber: null, permissions: { mic: 'authorized', accessibility: true, postEvent: true } });
  cth.systemAudioStatus = async () => sys;
  cth.systemAudioRequest = async () => ({ ok: true, granted: false });
  cth.systemAudioOpenSettings = async () => ({ ok: true });
  cth.onTranscribeDownloadProgress = () => () => {};
  return (
    <div style={{ width: 720, padding: 24, background: 'var(--cth-paper-50)' }}>
      <TranscribeSettings config={{ transcribe: cfg } as unknown as Parameters<typeof TranscribeSettings>[0]['config']} />
    </div>
  );
}

/* 0.5.3, I2: the missing CLI card and the sign in modal, drawn where the app
 * draws them, OVER A REAL XTERM in a real PtyTerminalView, so that what sits
 * on top of the grid (the cursor over a button, a click landing) is the same
 * thing a reviewer's pointer meets in the app. The pool subscribes to
 * onPtyCliMissing and onPtyLogin at acquire, so the frame answers those two
 * calls itself and fires the state once the view has mounted. This board
 * imports puck.css, whose pass through root rule turns pointer events off
 * page wide here; that is exactly the hostile host the overlay's own
 * `pointerEvents: 'auto'` exists for, so the harness proves it.
 * ?only=cli&what=<key>; the keys are the states below. */
const CLI_MISSING_STATES: Record<string, CliMissingState> = {
  npm: { provider: 'claude', label: 'Claude Code', bin: 'claude', rung: 'npm', command: 'npm install -g @anthropic-ai/claude-code', manualCommand: null, nodeMissing: false, docsUrl: 'https://docs.anthropic.com/en/docs/claude-code' },
  native: { provider: 'kimi', label: 'Kimi Code', bin: 'kimi', rung: 'native', command: 'curl -fsSL https://cdn.kimi.com/kimi-code/install.sh | bash', manualCommand: null, nodeMissing: false, docsUrl: 'https://kimi.ai/code' },
  node: { provider: 'codex', label: 'Codex', bin: 'codex', rung: 'node-then-npm', command: 'curl -fsSL https://nodejs.org/dist/v24.19.0/node-v24.19.0-darwin-arm64.tar.gz | tar -xz && npm install -g @openai/codex', manualCommand: null, nodeMissing: true, nodeVersion: 'v24.19.0', docsUrl: 'https://developers.openai.com/codex/cli' },
  manual: { provider: 'gemini', label: 'Gemini CLI', bin: 'gemini', rung: 'manual', command: null, manualCommand: 'npm install -g @google/gemini-cli', nodeMissing: true, docsUrl: 'https://github.com/google-gemini/gemini-cli' },
  failed: { provider: 'kimi', label: 'Kimi Code', bin: 'kimi', rung: 'native', command: 'curl -fsSL https://cdn.kimi.com/kimi-code/install.sh | bash', manualCommand: null, nodeMissing: false, docsUrl: 'https://kimi.ai/code', failed: { exitCode: 16, tail: 'Downloading kimi 2.1.0 for darwin-arm64\ncurl: (16) Error in the HTTP2 framing layer\ninstall.sh: download failed, nothing was changed' } },
  custom: { provider: 'custom', label: 'my-agent', bin: 'my-agent', rung: 'manual', command: null, manualCommand: null, nodeMissing: false }
};
const CLI_LOGIN_PROMPTS: Record<string, LoginPrompt> = {
  device: { provider: 'kimi', kind: 'device-code', url: 'https://kimi.ai/code/authorize_device', trusted: true, code: 'HTKB-XQRC', line: 'Open https://kimi.ai/code/authorize_device and enter the code HTKB-XQRC', recipe: 'provider' },
  browser: { provider: 'cursor', kind: 'browser', url: 'https://cursor.com/loginDeepControl?challenge=abc', trusted: true, line: 'Opening https://cursor.com/loginDeepControl?challenge=abc in your browser', recipe: 'provider' },
  paste: { provider: 'claude', kind: 'paste-code', url: 'https://claude.ai/oauth/authorize?code=true', trusted: true, line: 'Paste code here if prompted >', recipe: 'provider' },
  unvouched: { provider: 'codex', kind: 'device-code', url: 'https://evil.example/login', trusted: false, code: 'ABCD-1234', line: 'Sign in: open https://evil.example/login and enter code ABCD-1234', recipe: 'generic' },
  key: { provider: 'codex', kind: 'api-key', trusted: false, line: 'Enter your OpenAI API key:', recipe: 'generic' }
};
const CLI_TERMINAL_LINES = [
  '\x1b[1mDwight\x1b[0m  ~/Documents/office  \x1b[2m(kimi)\x1b[0m',
  '',
  '$ kimi',
  ''
];
function CliCardFrame({ what }: { what: string }) {
  const missing = CLI_MISSING_STATES[what];
  const login = CLI_LOGIN_PROMPTS[what.replace(/^login-/, '')];
  const ptyId = `preview-cli-${what}`;
  const cth = window.cth as unknown as Record<string, unknown>;
  // Answered before the view mounts: the pool subscribes at acquire.
  cth.onPtyCliMissing = (id: string, cb: (s: CliMissingState) => void) => {
    if (id === ptyId && missing) setTimeout(() => cb(missing), 50);
    return () => {};
  };
  cth.onPtyLogin = (id: string, cb: (e: { prompt: LoginPrompt }) => void) => {
    if (id === ptyId && login) setTimeout(() => cb({ prompt: login }), 50);
    return () => {};
  };
  cth.installCli = async () => ({ ok: true });
  cth.loginAct = async () => ({ ok: true });
  useEffect(() => {
    const entry = acquireTerminal(ptyId);
    const t = setTimeout(() => { try { entry.term.write(CLI_TERMINAL_LINES.join('\r\n')); } catch { /* not open yet */ } }, 200);
    return () => clearTimeout(t);
  }, [ptyId]);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'var(--cth-paper-100)' }}>
      <PtyTerminalView ptyId={ptyId} embedded chrome="pro" />
    </div>
  );
}

export function Frame({ label, width = 1280, height = 560, children }: {
  label: string; width?: number; height?: number; children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{
        fontFamily: 'var(--cth-font-mono)', fontSize: 11, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--cth-ink-500)', marginBottom: 8
      }}>{label}</div>
      <div style={{
        position: 'relative', width, height, maxWidth: '100%',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', overflow: 'hidden'
      }}>
        <FrameBoundary>{children}</FrameBoundary>
      </div>
    </section>
  );
}

/** Settings drawn inline, as the PRO page draws it (0.5.3, batch 3). Custom
 *  secrets answer from a list kept here, so Add, Remove and Save can be
 *  driven; no value is ever kept. */
function SettingsFrame({ section }: { section: SettingsSection }) {
  // General's Updates block reads the build's version, which only the app's
  // own bundler defines.
  (globalThis as { __APP_VERSION__?: string }).__APP_VERSION__ ??= '0.5.3-preview';
  const cth = window.cth as unknown as Record<string, unknown>;
  const names = ((window as unknown as { __secrets?: string[] }).__secrets ??= ['GITHUB_TOKEN', 'LINEAR_API_KEY']);
  cth.customSecretList = () => Promise.resolve([...names].sort());
  cth.customSecretSet = ({ name }: { name: string }) => { if (!names.includes(name)) names.push(name); return Promise.resolve({ ok: true }); };
  cth.customSecretRemove = (name: string) => { names.splice(names.indexOf(name), 1); return Promise.resolve({ ok: true }); };
  cth.providerKeyHas = (b: string) => Promise.resolve(b === 'anthropic');
  const config = { notifications: false, harnessHome: '/Users/you/HarnessAgents' } as unknown as HarnessConfig;
  return <div style={{ position: 'relative', height: '100%' }}><SettingsModal config={config} initialSection={section} onClose={() => undefined} chrome="inline" /></div>;
}

export function Boards() {
  // ?only=rail draws the rail frame alone: the whole board is heavy, and a
  // screenshot of one frame should not wait for every other one to paint.
  const only = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('only') : null;
  if (only === 'askme') {
    return (
      <Frame label="Ask me (0.5.3, Pro rail V2): the section on a worker's Inbox and on the orchestrator's, and the modal both open" width={1100} height={720}>
        <AskMeFrame />
      </Frame>
    );
  }
  if (only === 'askme-dock') {
    return (
      <Frame label="Ask me docked over the composer (0.5.3, 24 Sep): one question and three, PRO light and PRO dark" width={1480} height={700}>
        <div style={{ display: 'flex', height: '100%', gap: 8 }}>
          {(['light', 'dark'] as const).map((th) => (
            <iframe key={th} data-dock-pane={th} title={th} src={`?only=askme-dock-pane&skin=professional&theme=${th}`} style={{ flex: 1, border: 'none', height: '100%', background: 'var(--cth-cream-50)' }} />
          ))}
        </div>
      </Frame>
    );
  }
  if (only === 'askme-dock-pane') {
    return <div style={{ height: 690 }}><AskMeDockFrame /></div>;
  }
  if (only === 'stapler-edge') {
    const q = new URLSearchParams(window.location.search);
    const what = (q.get('what') ?? 'card') as 'card' | 'flash' | 'ring';
    const fix = q.get('fix') !== '0';
    return (
      <Frame label={`Stapler at a laptop's bottom right edge (0.5.3, I3): ${what}, ${fix ? 'placed inside the screen' : 'before the fix'}`} width={LAPTOP_SCREEN.width} height={LAPTOP_SCREEN.height}>
        <StapleEdgeFrame what={what} fix={fix} />
      </Frame>
    );
  }
  if (only === 'stapler-recipient') {
    const kind = new URLSearchParams(window.location.search).get('kind') === 'message' ? 'message' : 'screenshot';
    return (
      <Frame label={`Stapler send card, the recipient picker (0.5.3, I5): ${kind}`} width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
        <StapleRecipientFrame kind={kind} />
      </Frame>
    );
  }
  if (only === 'attach') {
    const platform = new URLSearchParams(window.location.search).get('platform') ?? 'darwin';
    return (
      <Frame label={`The composer's attach button (0.5.3, I8): ${platform}`} width={760} height={260}>
        <AttachFrame platform={platform} />
      </Frame>
    );
  }
  if (only === 'sysaudio') {
    const state = new URLSearchParams(window.location.search).get('state') ?? 'mac-granted';
    return (
      <Frame label={`Settings, Dictation & Meetings: the other side of calls, ${state}`} width={780} height={1040}>
        <SystemAudioFrame state={state} />
      </Frame>
    );
  }
  if (only === 'cli') {
    const what = new URLSearchParams(window.location.search).get('what') ?? 'native';
    return (
      <Frame label={`A terminal whose CLI is not installed, or whose CLI wants a sign in (0.5.3, I2): ${what}`} width={900} height={520}>
        <CliCardFrame what={what} />
      </Frame>
    );
  }
  if (only === 'tasks') {
    return (
      <Frame label="Tasks board (0.5.3, rc.4): drop anywhere in a column" width={1100} height={640}>
        <TasksBoardFrame />
      </Frame>
    );
  }
  if (only === 'idefind') {
    const q = new URLSearchParams(window.location.search);
    const w = Number(q.get('w') ?? 900);
    if (q.get('dir') === 'rtl') document.documentElement.setAttribute('dir', 'rtl');
    return (
      <Frame label={`IDE find and replace (0.5.3), ${w}px pane${q.get('dir') === 'rtl' ? ', right to left' : ''}`} width={w} height={320}>
        <IdeFindFrame />
      </Frame>
    );
  }
  if (only === 'agenttasks') {
    return (
      <Frame label="Agent view, Tasks tab (0.5.3, rc.4)" width={900} height={420}>
        <AgentTasksFrame />
      </Frame>
    );
  }
  if (only === 'settings') {
    const section = (new URLSearchParams(window.location.search).get('section') ?? 'Keys & Secrets') as SettingsSection;
    return (
      <Frame label={`Settings (0.5.3, batch 3): ${section}`} width={1000} height={760}>
        <SettingsFrame section={section} />
      </Frame>
    );
  }
  if (only === 'order') {
    return (
      <Frame label="Keep my agent order on (0.5.3, batch 3): the reorder handle centred under each avatar" width={420} height={980}>
        <SidebarFrame keep />
      </Frame>
    );
  }
  if (only === 'rail-bare') {
    return (
      <Frame label="Sidebar shows only agents and notes (0.5.3 rc.4): the rail V2 rows with no Asked you, no task line, no Finished" width={720} height={980}>
        <RailV2Frame bare />
      </Frame>
    );
  }
  if (only === 'rail') {
    return (
      <Frame label="Pro rail V2 (0.5.3, F25): mail badge, status word, context bar, task, Asked you, Finished, Crashed, 1:1, notes" width={720} height={980}>
        <RailV2Frame />
      </Frame>
    );
  }
  return (
    <>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Frame label="Pro rail V2 (0.5.3, F25): mail badge, status word, context bar, task, Asked you, Finished, Crashed, 1:1, notes" width={720} height={980}>
          <RailV2Frame />
        </Frame>
        <Frame label="Puck: idle, floating over an app" width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
          <PuckBackdrop><PuckApp preview={{ config: PUCK_CFG, state: puckState({}) }} /></PuckBackdrop>
        </Frame>
        <Frame label="Puck: the ring open (screenshot up, recorders at the shoulders, computer use disabled)" width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
          <PuckBackdrop><PuckApp preview={{ config: PUCK_CFG, state: puckState({ menuOpen: true }) }} /></PuckBackdrop>
        </Frame>
        <Frame label="Puck: ring open with no Groq key (record message disabled, says why)" width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
          <PuckBackdrop><PuckApp preview={{ config: PUCK_CFG, state: NO_KEY_STATE }} /></PuckBackdrop>
        </Frame>
        <Frame label="Puck: recording a meeting, invisible to shares, ring open (stop + visibility only)" width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
          <PuckBackdrop><PuckApp preview={{ config: PUCK_CFG, state: puckState({ menuOpen: true, invisible: true, recording: { kind: 'meeting', meetingId: 'm', startedAt: Date.now() - 754_000, segments: 2, transcribed: 1 } }) }} /></PuckBackdrop>
        </Frame>
        <Frame label="Puck: a message being spoken, the words arriving in the card, and the ring open over it with Stop and Leave invisible" width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
          <PuckBackdrop><PuckApp preview={{ config: PUCK_CFG, state: puckState({ menuOpen: true, recording: { kind: 'message', startedAt: Date.now() - 23_000 } }), compose: { kind: 'message', text: '' } }} /></PuckBackdrop>
        </Frame>
        <Frame label="Puck: a meeting running, its transcript growing in the card, ring closed" width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
          <PuckBackdrop><PuckApp preview={{ config: PUCK_CFG, state: puckState({ recording: { kind: 'meeting', meetingId: '2026-09-07_10-32-05', startedAt: Date.now() - 754_000, segments: 2, transcribed: 1 } }), compose: { kind: 'meeting', meetingId: '2026-09-07_10-32-05' } }} /></PuckBackdrop>
        </Frame>
        <Frame label="Puck: a screenshot taken, the note card open" width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
          <PuckBackdrop><PuckApp preview={{ config: PUCK_CFG, state: puckState({}), compose: { kind: 'screenshot', shots: [{ path: '/x.png', preview: PUCK_PREVIEW_SHOT, width: 640, height: 356 }] } }} /></PuckBackdrop>
        </Frame>
        <Frame label="Puck: three screenshots on one card, thumbnails with remove (I6)" width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
          <PuckBackdrop><PuckApp preview={{ config: PUCK_CFG, state: puckState({}), compose: { kind: 'screenshot', shots: [{ path: '/a.png', preview: PUCK_PREVIEW_SHOT, width: 640, height: 356 }, { path: '/b.png', preview: PUCK_PREVIEW_TALL, width: 420, height: 2200 }, { path: '/c.png', preview: PUCK_PREVIEW_SHOT, width: 640, height: 356 }] } }} /></PuckBackdrop>
        </Frame>
        <Frame label="Puck: a tall region screenshot, the picture capped so Send stays inside the window" width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
          <PuckBackdrop><PuckApp preview={{ config: PUCK_CFG, state: puckState({}), compose: { kind: 'screenshot', shots: [{ path: '/y.png', preview: PUCK_PREVIEW_TALL, width: 420, height: 2200 }] } }} /></PuckBackdrop>
        </Frame>
        <Frame label="Puck: snapped to the right edge, so the ring fans out on the left, screenshot in the middle" width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
          <PuckBackdrop edge="right"><PuckApp preview={{ config: PUCK_CFG, state: puckState({ menuOpen: true, offset: { x: PUCK_SIDE - 12 - PUCK_CFG.size / 2, y: PUCK_SIDE / 2 } }) }} /></PuckBackdrop>
        </Frame>
        <Frame label="Puck: blue, wink; in the corner (the corner margin from both edges), so the ring fans out towards the open quadrant" width={PUCK_SIDE + 120} height={PUCK_SIDE + 120}>
          <PuckBackdrop edge="corner"><PuckApp preview={{ config: { ...PUCK_CFG, color: '#B3D4F0', expression: 'wink', seed: 'comet 42' }, state: puckState({ menuOpen: true, offset: { x: PUCK_SIDE - CORNER_MARGIN - PUCK_CFG.size / 2, y: PUCK_SIDE - CORNER_MARGIN - PUCK_CFG.size / 2 } }) }} /></PuckBackdrop>
        </Frame>
      </div>
      <Frame label="Puck screen: settings, General open (look, behaviour, ring buttons, send to), preview" height={880}>
        <PuckScreenFrame tab="settings" />
      </Frame>
      <Frame label="Puck screen: settings, with no Groq key on file" height={760}>
        <PuckScreenFrame tab="settings" groq={false} />
      </Frame>
      <Frame label="Puck screen: meeting transcripts, one done and one waiting for a key" height={640}>
        <PuckScreenFrame tab="meetings" />
      </Frame>
      <Frame label="Puck screen: screenshots, one sent and one not" height={520}>
        <PuckScreenFrame tab="screenshots" />
      </Frame>
      <Frame label="Memory screen, narrow window, notes in Chinese: nothing may leave a card by the right edge" width={760} height={620}>
        <MemoryFrame />
      </Frame>
      <Frame label="Professional composer: paste a picture or a copied file and it becomes an attachment chip" width={720} height={220}>
        <ComposerFrame />
      </Frame>
      <Frame label="IDE shortcut: the keyboard leaves the terminal when the IDE opens, and a modal blocks the chord" width={720} height={160}>
        <IdeShortcutFrame />
      </Frame>
      <Frame label="Bound port note in Settings: quiet on the asked for port, a warning when it moved" width={420} height={150}>
        <div style={{ position: 'absolute', inset: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--cth-cream-50)' }}>
          <BoundPortNote bound={{ port: 3849 }} />
          <BoundPortNote bound={{ port: 51234, movedFrom: 3849 }} />
        </div>
      </Frame>
      <Frame label="Worktrees, in Settings: what each folder holds, and a delete that warns first" width={760} height={760}>
        <WorktreesFrame chrome="inline" />
      </Frame>
      <Frame label="Worktrees, narrow: nothing may leave a row by the edge" width={380} height={700}>
        <WorktreesFrame chrome="inline" />
      </Frame>
      <Frame label="Ask Me badge: Jim asked (filled), Pam did not (quiet). It is absent when nothing waits" width={520} height={106}>
        <AskMeBellFrame />
      </Frame>
      <Frame label="Sidebar with twelve agents, tall window: the list scrolls, the profile row stays" width={900} height={700}>
        <SidebarFrame />
      </Frame>
      <Frame label="Sidebar with twelve agents, SHORT window: where the missing scroll region bit first" width={900} height={460}>
        <SidebarFrame />
      </Frame>
      <Frame label="Sprite editor: the character picker with two custom avatars and the presets open" height={700}>
        <div style={{ padding: 16, maxWidth: 720 }}><PickerFrame /></div>
      </Frame>
      <Frame label="Sprite editor: creating an avatar, started from preset 7" width={940} height={660}>
        <SpriteEditor inline mode="create" initialRecipe={presetRecipe(6)} initialName="Holly" onSave={() => {}} onClose={() => {}} />
      </Frame>
      <Frame label="Sprite editor: editing an existing avatar (delete in the footer)" width={940} height={660}>
        <SpriteEditor inline mode="edit" initialRecipe={DEMO_AVATARS[1].recipe} initialName={DEMO_AVATARS[1].name} onSave={() => {}} onDelete={() => {}} onClose={() => {}} />
      </Frame>
      <Frame label="D1-D4 first run, live — click through it" height={620}>
        <FirstRunFlow onDone={() => {}} />
      </Frame>
      {/* LAST on purpose: frames seed the store as they render, and the last
          seed is the one every store reader draws. */}
      <Frame label="Classic, 0.5.3 F25: the strip card (Pam's card 2), 236 x 92, one size; the orchestrator lemon; Bob crashed; Darryl held 1:1" width={1280} height={160}>
        <ClassicStripFrame />
      </Frame>
      <Frame label="Classic, 0.5.3 F25: the fullscreen roster row (Pam's card 1): name, chip, engine, model, percent, gauge, ticket, live line, crash strip, note bullets" width={900} height={760}>
        <ClassicRosterFrame />
      </Frame>
      <Frame label="D1 first launch, choose path" height={520}>
        <FirstLaunch onJoinTeam={() => {}} onIndividuals={() => {}} />
      </Frame>
      <Frame label="D2 enter invite code — empty" height={420}>
        <EnterInviteCode onContinue={() => {}} onNoCode={() => {}} />
      </Frame>
      <Frame label="D2 invalid code" height={420}>
        <EnterInviteCode onContinue={() => {}} onNoCode={() => {}} error="invalid" />
      </Frame>
      <Frame label="D2 validating" height={420}>
        <EnterInviteCode onContinue={() => {}} onNoCode={() => {}} validating />
      </Frame>
      <Frame label="D2 refused — the relay's own sentence is the copy" height={420}>
        <EnterInviteCode onContinue={() => {}} onNoCode={() => {}}
          error="refused" errorDetail="10 of 10 seats are in use." />
      </Frame>
      <Frame label="D2b waiting for the browser sign-in, with the paste fallback" height={460}>
        <SignInWait onOpenAgain={() => {}} onPaste={() => {}} onBack={() => {}} />
      </Frame>
      <Frame label="D2b the sign-in did not come back" height={460}>
        <SignInWait error="That link was not the one this machine asked for."
          onOpenAgain={() => {}} onPaste={() => {}} onBack={() => {}} />
      </Frame>
      <Frame label="D3 setting up your identity — org unknown until the relay answers" height={400}>
        <IdentitySetup step="registering" error={null} onRetry={() => {}} onDone={() => {}} />
      </Frame>
      <Frame label="D3 keychain refused — the real generation failure" height={400}>
        <IdentitySetup
          orgName="Dunder Mifflin Scranton"
          step="keys"
          error={{ code: 'refused', detail: 'the only keyring available encrypts with a hardcoded key', reason: 'keyring_not_encrypting' }}
          onRetry={() => {}}
          onDone={() => {}}
        />
      </Frame>
      <Frame label="D3 refused on row 2, with retry" height={400}>
        <IdentitySetup orgName="Dunder Mifflin Scranton" step="registering"
          error={{ code: 'refused', detail: 'This organisation is not currently active.' }}
          onRetry={() => {}} onDone={() => {}} />
      </Frame>
      <Frame label="D4 joined, team summary" height={720}>
        <JoinedSummary orgName="Dunder Mifflin Scranton" onOpen={() => {}} />
      </Frame>

      {/* THE WIZARD IS STILL NOT HERE and that is still the harness working:
          OnboardingWizard reads config over IPC, so it cannot render without a
          main process, and the rule stands — a screen that cannot be rendered
          from props alone does not belong here.

          What IS here is everything D6 ADDS to it. Those two blocks are pure, so
          they were lifted into team/OrgOnboardingBits.tsx and they render from
          props like everything else. The wizard's own steps are unchanged from
          the solo path and were already reviewed; these were the only new
          pixels, and they had never been looked at. */}
      <Frame label="D6 org banner — pinned to every wizard step" height={120}>
        <div style={{ padding: 16, maxWidth: 520 }}>
          <OrgSetupBanner orgName="Dunder Mifflin Scranton" />
        </div>
      </Frame>
      <Frame label="D6 permissions step, team half — read only, all three levels" height={620}>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
          {NETWORK_LEVELS.map(l => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TeamLevelSummary level={l} />
            </div>
          ))}
        </div>
      </Frame>

      <Frame label="D7 team roster · click a row for D8 · D8 opens D11">
        <TeamTab connection="connected" onOpenThread={() => {}} />
      </Frame>
      <Frame label="D7 disconnected — list dims, presence is stale not wrong">
        <TeamTab connection="reconnecting" />
      </Frame>
      {/* The takeover (plan 4.5, Pam's S2): one surface, one reason at a
          time, and only the remedy that reason allows. `unknown` is today's
          server (no /me, no revoked frame); `lease` is plan 2.3 at 72 h. */}
      {LOCKS.map(l => (
        <Frame key={l.label} label={`D14 / S2 takeover — ${l.label}`} height={360}>
          <TeamTab connection="stopped" lock={l.info} onReconnect={() => {}} onContinueSolo={() => {}} onEnterNewCode={() => {}} />
        </Frame>
      ))}
      {ORGS.map(o => (
        <Frame key={o.label} label={`S1 this org — ${o.label}`} height={640}>
          <OrgPanel org={o.org} standing={o.org.you?.isAdmin ? 'admin' : 'member'} onVerify={() => {}} onBack={() => {}} />
        </Frame>
      ))}
      <Frame label="D14 / S2 takeover — full window (3.1 lock, LOCK_APP_ON_REVOKE)" height={420}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <RevokedTakeover info={LOCKS[1]!.info} full onReconnect={() => {}} onEnterNewCode={() => {}} />
        </div>
      </Frame>
      <Frame label="D10 approval queue — the requests row's pane" height={520}>
        <div style={{ height: '100%', overflowY: 'auto', padding: 12 }}>
          <ApprovalQueue requests={MOCK_REQUESTS} />
        </div>
      </Frame>
      <Frame label="D10 approval toast — app level now, not inside a pane" height={260}>
        <ApprovalToast
          request={MOCK_REQUESTS[0]!}
          onAllowOnce={() => {}} onDismiss={() => {}} onAlwaysAllow={() => {}} />
      </Frame>
      <Frame label="D11 cross node thread — sending, and the agent pickup strip" height={620}>
        <CrossNodeThread mate={pam} />
      </Frame>
      <Frame label="D11 they are offline — queued" height={620}>
        <CrossNodeThread mate={offlineMate} thread={withDelivery('queued')} />
      </Frame>
      <Frame label="D11 send failed" height={620}>
        <CrossNodeThread mate={pam} thread={withDelivery('failed')} />
      </Frame>
      <Frame label="D13 fingerprint changed" height={520}>
        <FingerprintWarning mate={rekeyed} onAccept={() => {}} onBlock={() => {}} />
      </Frame>
      <Frame label="D9 network permissions — default Blocked, plus overrides" height={560}>
        <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}><NetworkPermissions /></div>
      </Frame>
      <Frame label="D15 upgrade panel on its own" height={240}>
        <div style={{ padding: 16 }}>
          <UpgradeToTeams onSetUpTeam={() => {}} onJoinExisting={() => {}} />
        </div>
      </Frame>
      <Frame label="D12 connection states, all five" height={80}>
        <div style={{ display: 'flex', gap: 12, padding: 16, flexWrap: 'wrap' }}>
          {CONNECTION_STATES.map(s => (
            <ConnectionChip key={s} state={s} attempt={s === 'reconnecting' ? 3 : undefined} />
          ))}
        </div>
      </Frame>
      <Frame label="D12 stopped — the reason's word and hue, never a generic label" height={80}>
        <div style={{ display: 'flex', gap: 12, padding: 16, flexWrap: 'wrap' }}>
          {STOP_REASONS.map(r => <ConnectionChip key={r} state="stopped" reason={r} />)}
        </div>
      </Frame>
    </>
  );
}

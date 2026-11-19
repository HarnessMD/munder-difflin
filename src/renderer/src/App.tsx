import { useEffect, useLayoutEffect, useState, lazy, Suspense, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, selectedAgent } from '@/store/store';
import { startMockLoop, stopMockLoop } from '@/store/mockEvents';
import type { HarnessConfig } from '@/store/config';
import { shouldAutoOpenHive } from '@shared/hivePicker';
import { useHive } from '@/hooks/useHive';
import { useResolvedGodName } from '@/hooks/useResolvedGodName';
import { useGodNameSync } from '@/i18n/useGodNameSync';
import { useDirectionSync } from '@/i18n/useDirection';
import { useArabicTerminalSync } from '@/terminal/useArabicTerminalSync';
import { MemoryPanel } from '@/components/MemoryPanel';
import { AgentDetailPanel } from '@/components/AgentDetailPanel';
import { CommandCenterPanel } from '@/components/CommandCenterPanel';
import { AgentStrip } from '@/components/AgentStrip';
import { AddAgentModal } from '@/components/AddAgentModal';
import { MichaelBooting } from '@/components/MichaelBooting';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { markBootShellMounted, markReconciled, skipBootWait, useBootGate } from '@/store/bootGate';
import { holdForRecords, releaseIfDoor } from '@/components/bootSplash';
import { BootSplashGate } from '@/components/BootSplashGate';
import { HivePicker } from '@/components/HivePicker';
import { NewFloorPicker } from '@/components/NewFloorPicker';
import { QuitWarningModal } from '@/components/QuitWarningModal';
import { CompletionToast } from '@/realtime/CompletionToast';
import { UpdateToast } from '@/components/UpdateToast';
import { DegradedToast } from '@/components/DegradedToast';
import { ToastHost } from '@/components/ToastHost';
import { UpdateBadge } from '@/components/UpdateBadge';
import { useAppTheme, toggleAppTheme } from '@/design/theme';
import { normalizeSeason, setSeason } from '@/design/season';
import { GlyphSprite } from '@/components/RoleGlyph';
import { LimitsChip } from '@/components/limits/LimitsChip';
import { SettingsModal, type Section as SettingsSection } from '@/components/SettingsModal';
import { INTEGRATIONS_EVENT } from '@/components/integrations/integrationsNav';
import { PixelPanel } from '@/components/PixelPanel';
import { PixelButton } from '@/components/PixelButton';
import { Icon } from '@/components/Icon';
import { SidebarSplitter } from '@/components/SidebarSplitter';
import { acquireTerminal, answerTerminalProbe, notifyThemeChangeAll } from '@/components/terminalPool';
import { markHiveOpen } from '@/components/crashReload';
import { FullscreenTerminal } from '@/components/FullscreenTerminal';
import { TaskDetailOverlay } from '@/components/TaskDetailOverlay';
import { IdePanel } from '@/ide/IdePanel';
import { IdeShortcut } from '@/ide/IdeShortcut';
import { AppOverlaySlot } from '@/components/AppSlots';
import brandLogo from '@brand/logo.png?url';
import { OWN_FRAME, windowBarRef } from '@/design/windowChrome';
import { WindowMenuButton } from '@/components/WindowMenuButton';

/* The office floor is the ONLY owner of the app's Pixi/WebGL context. Loaded
   lazily so `scene/office` and pixi stay out of the first paint: the hive
   picker and onboarding draw without it. */
const OfficeFloor = lazy(async () => ({
  default: (await import('@/scene/office/OfficeFloor')).OfficeFloor
}));

/** Restored agents come back marked with this action until their session
 *  answers (store.ts); the boot overlay counts them. */
const RECONNECTING = 'reconnecting…';

/** The boot overlay (0.5.2): the whole window blurred, with the restore count
 *  and the way out, until the restore is over (store/bootGate.ts). Fixed, so
 *  it covers the title bar too, and mounted over the shell rather than in
 *  place of it, so nothing below unmounts when recovery finishes. */
function BootOverlay({ onboardingComplete }: { onboardingComplete: boolean | undefined }) {
  const { t } = useTranslation();
  const reconnecting = useStore((s) => s.agents.filter((a) => a.action === RECONNECTING).length);
  const gate = useBootGate({ reconnecting, onboardingComplete });
  if (gate.settled) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-boot-overlay="classic"
      style={{
        position: 'fixed', inset: 0, zIndex: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(26, 19, 32, 0.35)', backdropFilter: 'blur(6px)'
      }}
    >
      <div style={{ width: 360 }}>
        <PixelPanel variant="dialog" title="CLOCKING IN" noPadding>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} style={{ width: 14, height: 14, background: '#6E1423', boxShadow: 'var(--cth-shadow-hard)', animation: 'cth-blink 1s steps(1, end) infinite', animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', textAlign: 'center', color: 'var(--cth-ink-700)' }}>
              {t('pro.boot.restoring', { count: gate.remaining, defaultValue: 'Restoring your agents… ({{count}} left)' })}
            </p>
            <p style={{ margin: 0, fontSize: 12, lineHeight: '18px', textAlign: 'center', color: 'var(--cth-ink-500)' }}>
              {t('pro.boot.note', 'Reconnecting each session where it left off.')}
            </p>
            {gate.skippable && (
              <PixelButton variant="secondary" size="md" onClick={skipBootWait}>{t('pro.boot.skip', 'Continue without waiting')}</PixelButton>
            )}
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}

/** The boot gate's clock starts here, the first time the shell is on screen:
 *  below onboarding and the hive picker, so neither spends the restore's
 *  budget. See store/bootGate.ts. */
function BootClock() {
  useEffect(() => { markBootShellMounted(); }, []);
  return null;
}

/** App still waiting for its config. A blank page; the start loader stays over it. */
function BootHold() {
  useLayoutEffect(holdForRecords, []);
  return <div style={{ width: '100vw', height: '100vh', background: 'var(--cth-cream-100)' }} />;
}

/** The focus mode toggle: the fullscreen terminal for the selected agent,
 *  else the orchestrator, else any live agent. */
function toggleFocusMode(): void {
  const st = useStore.getState();
  if (st.fullscreenAgentId) { st.setFullscreen(null); return; }
  const target = st.agents.find((x) => x.id === st.selectedId && x.ptyId)
    ?? st.agents.find((x) => x.isGod && x.ptyId)
    ?? st.agents.find((x) => x.ptyId);
  if (target) st.setFullscreen(target.id);
}

const TOP_BUTTON: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, padding: 0,
  background: 'var(--cth-paper-100)',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
  border: 'none', cursor: 'pointer',
  color: 'var(--cth-ink-900)'
};

export function App() {
  // Point every {{godName}} string at the orchestrator's real, renameable name.
  useGodNameSync();
  // Mirror the document only for a user who has picked an RTL app language.
  useDirectionSync();
  // Let terminals that are ALREADY open follow a language switch too.
  useArabicTerminalSync();
  const agent = useStore(selectedAgent);
  const agents = useStore(s => s.agents);
  const agentCount = agents.length;
  const bootingGodName = useResolvedGodName();
  const addAgentOpen = useStore(s => s.addAgentOpen);
  const setAddAgentOpen = useStore(s => s.setAddAgentOpen);
  const clearPendingHires = useStore(s => s.clearPendingHires);
  const godStatus = useStore(s => s.godStatus);
  const fullscreenAgentId = useStore(s => s.fullscreenAgentId);
  const appThemeNow = useAppTheme();
  const flipTheme = () => {
    const next = toggleAppTheme();
    // Tell every RUNNING program the theme flipped. xterm repaints its own
    // cells, but a TUI that painted its panels with explicit colours keeps
    // them until it redraws, which left OpenCode's boxes in the old palette
    // until the agent restarted. Only programs that enabled DEC mode 2031
    // are told, and it is every pooled terminal rather than the visible one,
    // so a background agent is not stale when you switch to it.
    notifyThemeChangeAll(next === 'dark' ? 'dark' : 'light');
    // Mirror into the harness config: every agent (re)spawned from now
    // on gets the matching `theme` in its per-session Claude settings,
    // so the TUI's truecolor palette fits the terminal. Scoped to
    // harness agents — the user's global Claude theme is never touched.
    void window.cth.updateConfig({ terminalTheme: next });
  };
  const sidebarWidth = useStore(s => s.sidebarWidth);
  const setSidebarWidth = useStore(s => s.setSidebarWidth);
  const ideOpen = useStore(s => s.ideOpen);

  const [config, setConfig] = useState<HarnessConfig | null>(null);
  // Whether the user has passed the launch-time hive picker this session. Starts
  // true (skip the picker) right after a hive SWITCH — changeHome relaunches and
  // leaves a one-shot localStorage flag so we don't bounce back onto the picker for
  // the hive we just chose. Also set true on onboarding completion (below).
  const [hiveOpened, setHiveOpened] = useState<boolean>(() => {
    try {
      if (window.localStorage.getItem('cth.skipHivePickerOnce')) {
        window.localStorage.removeItem('cth.skipHivePickerOnce');
        return true;
      }
    } catch { /* localStorage unavailable — show the picker */ }
    return false;
  });
  useEffect(() => { markHiveOpen(hiveOpened); }, [hiveOpened]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Which tab Settings opens on. Set by a `cth:open-settings` deep link, reset
   *  to undefined (→ General) whenever the modal is opened the normal way. */
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(undefined);
  const [quitWarn, setQuitWarn] = useState<{ ptyCount: number } | null>(null);
  const [vpWidth, setVpWidth] = useState<number>(window.innerWidth);

  // Deep link into Settings from anywhere in the tree. Settings' open state is
  // local to App, so a nested control (e.g. "set it now" beside a disabled Talk
  // button) has no path to it without threading a prop through every layer
  // between; a window event keeps that plumbing out of the components in
  // between, matching the existing `cth:` CustomEvent convention. The title
  // bar gear dispatches this same event, so there is one door into Settings.
  useEffect(() => {
    const onOpenSettings = (e: Event): void => {
      const section = (e as CustomEvent<{ section?: SettingsSection }>).detail?.section;
      setSettingsSection(section);
      setSettingsOpen(true);
    };
    // The Integrations door is Settings' Integrations section (integrationsNav.ts).
    const onOpenIntegrations = (): void => {
      setSettingsSection('Integrations');
      setSettingsOpen(true);
    };
    window.addEventListener('cth:open-settings', onOpenSettings);
    window.addEventListener(INTEGRATIONS_EVENT, onOpenIntegrations);
    return () => {
      window.removeEventListener('cth:open-settings', onOpenSettings);
      window.removeEventListener(INTEGRATIONS_EVENT, onOpenIntegrations);
    };
  }, []);

  // Initial config load
  useEffect(() => {
    let cancelled = false;
    window.cth.getConfig().then(c => {
      if (cancelled) return;
      setConfig(c);
      // openLastHiveOnLaunch counts as clicking "open" on the current hive. An
      // unattended (headless) host has nobody to click it, so without this every
      // restart leaves the app up but the floor dead (#595). Decided once, at
      // launch: flipping the setting later must not bounce a live floor back to
      // the picker. Needs a harnessHome — with nothing to reopen, the picker is
      // the only way forward. Batched with setConfig, so the picker never flashes.
      if (shouldAutoOpenHive(c)) setHiveOpened(true);
      // Mirror the custom avatars so the pickers list them and the painter can
      // draw a `custom:<id>` character (avatarRegistry, fed by the setter).
      useStore.getState().setAvatars(c.avatars ?? []);
      // Mirror the triggers so Integrations and the Command Center's
      // Triggers tab read one list, not two copies that drift — whichever surface
      // saves calls these same setters and the other repaints. No extra IPC: main
      // deep-fills both fields on every config read (withTriggerDefaults), so
      // getConfig() already serves what listWebhooks() would.
      const withTriggers = c as HarnessConfig;
      useStore.getState().setWebhookTriggers(withTriggers.webhookTriggers ?? []);
    });
    // Mirror BYOK OpenAI key presence (boolean only; the key never leaves main) so the
    // Realtime Michael voice toggle can gate on it. Lives in the secret broker, not
    // config — so fetch it rather than derive from c.
    window.cth.realtimeHasOpenAiKey().then(has => {
      if (!cancelled) useStore.getState().setHasOpenAiKey(has);
    });
    return () => { cancelled = true; };
  }, []);

  // Config subscription — the copy loaded above would otherwise go stale the
  // moment anything saves a setting.
  useEffect(() => window.cth.onConfigChanged((c) => {
    setConfig(c);
    // The avatar list is drawn from synchronously (painter, floor), so it is
    // re-mirrored on every write: a save in the editor repaints every portrait.
    useStore.getState().setAvatars(c.avatars ?? []);
  }), []);

  // The season (0.5.5): the config is the truth and design/season.ts keeps a
  // boot cache of it. Applied mid session: saving Theme in Settings dresses or
  // undresses the office at once.
  useEffect(() => {
    if (!config) return;
    setSeason(normalizeSeason(config.seasonalTheme));
  }, [config?.seasonalTheme]);

  // Quit warning subscription
  useEffect(() => window.cth.onCloseRequested((info) => setQuitWarn(info)), []);

  // 0.5.3, B21: "New Floor" (the File menu, Cmd/Ctrl+Shift+N) asks where to
  // start. Main pushes the ask to the focused window; the modal does the rest.
  const [newFloorOpen, setNewFloorOpen] = useState(false);
  useEffect(() => window.cth.onFloorPickerOpen(() => setNewFloorOpen(true)), []);

  // Shareable hires: a validated manifest arriving via the munderdifflin://
  // deep link (or file import) pre-fills the Add-Agent surface. Never spawns by
  // itself.
  const enqueuePendingHires = useStore(s => s.enqueuePendingHires);
  const closeAddAgentReview = () => {
    clearPendingHires();
    setAddAgentOpen(false);
  };
  useEffect(() => {
    const unsub = window.cth.onHireImport?.((m) => {
      enqueuePendingHires([m]);
      setAddAgentOpen(true);
    });
    // Pull anything that arrived before this subscription existed (cold-start
    // deep links; packaged renderers load too fast for push-on-load).
    void window.cth.drainPendingHires?.().then((queued) => {
      if (queued && queued.length > 0) {
        enqueuePendingHires(queued);
        setAddAgentOpen(true);
      }
    });
    return unsub;
  }, [enqueuePendingHires, setAddAgentOpen]);
  useEffect(() => window.cth.onHireError?.((info) => {
    console.error('[hire] import failed:', info.error);
  }), []);

  // Tell main whether the floor is running or parked on the launch-time hive
  // picker, so fleet.json and log.jsonl say "waiting for harness selection"
  // instead of looking like a healthy, idle floor (#595).
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    window.cth.reportFloorState(hiveOpened ? 'open' : 'awaiting-hive-selection');
  }, [config?.onboardingComplete, hiveOpened]);

  // The hive: god-agent bootstrap, hook-driven avatars, idle-agent waking. Held
  // off until the user opens a hive in the launch picker (passing null no-ops the
  // hook) so Michael doesn't boot against the current home while the user may be
  // about to switch to a different one.
  useHive(hiveOpened ? config : null);

  // Pre-warm a persistent terminal for every live agent so its output is
  // buffered from spawn. Switching agents then re-attaches an already-rendered
  // terminal instantly (with full history) instead of building a blank one.
  useEffect(() => {
    for (const a of agents) if (a.ptyId) acquireTerminal(a.ptyId);
  }, [agents]);

  // Autosend (0.5.5): main submits every automated message and asks here for
  // the terminal's screen and whether a person's draft holds it.
  useEffect(() => window.cth.onTerminalProbe?.(answerTerminalProbe), []);

  // Synthetic demo loop — CAGED (#5B). It must never animate alongside a live
  // hive (it would fire fake envelope handoffs and step seeded agents). Run it
  // only as an explicit showcase (VITE_CTH_DEMO=1 in dev) or on a genuinely
  // empty floor, and stop it the instant the first real PTY agent appears
  // (Michael always spawns, so in normal operation it effectively never runs).
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    const DEMO = import.meta.env.DEV && import.meta.env.VITE_CTH_DEMO === '1';
    const evaluate = () => {
      const hasLive = useStore.getState().agents.some((a) => a.ptyId);
      if (DEMO || !hasLive) startMockLoop();
      else stopMockLoop();
    };
    evaluate();
    const unsub = useStore.subscribe(evaluate);
    return () => { unsub(); stopMockLoop(); };
  }, [config?.onboardingComplete]);

  // Reconcile restored agents against the PTYs still alive in the main process.
  // After a renderer reload (e.g. the laptop slept and Vite reloaded the page),
  // this keeps agents whose process survived and drops any that truly died.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    let cancelled = false;
    // Main saw which agents ended on their own; they keep saying so. A failed ask keeps nothing.
    const ended = Promise.resolve(window.cth.hiveEndedAgents?.() ?? []).catch(() => []);
    Promise.all([window.cth.listPtys(), ended]).then(([list, endedAgents]) => {
      if (cancelled) return;
      useStore.getState().reconcileWithLivePtys(list.map((p) => p.id), endedAgents);
      // The restorable list is final from here; the boot gate may now count it.
      markReconciled();
    }).catch(() => {
      // Main did not answer: the roster stays as restored, and the gate must
      // not wait for a reconcile that will never come.
      markReconciled();
    });
    return () => { cancelled = true; };
  }, [config?.onboardingComplete]);

  // Re-apply the persisted focus-mode preference as the roster fills in.
  //
  // Not a one-shot at store construction: at launch every restored agent still
  // carries the PREVIOUS session's PTY id, so the reconcile above prunes the lot
  // and correctly drops focus mode to null before god has respawned. The
  // preference therefore has to be re-checked once agents with live terminals
  // actually exist. `restoreFocusMode` is a no-op unless the preference is on and
  // focus mode is currently off, so re-running it on every roster change is safe
  // and pressing Esc stays sticky.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    useStore.getState().restoreFocusMode();
  }, [config?.onboardingComplete, agents]);

  // Track viewport width for splitter clamping
  useEffect(() => {
    const onResize = () => setVpWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // After every commit. No blank hold and no shell on screen means a door is drawn (onboarding, the hive
  // picker); it has what it needs, so the start loader goes.
  useEffect(releaseIfDoor);

  if (!config) {
    return <BootHold />;
  }

  if (!config.onboardingComplete) {
    return <OnboardingWizard onComplete={(next) => { setConfig(next); setHiveOpened(true); }} />;
  }

  // Launch-time hive picker: on reopen, let the user open their current hive,
  // switch to a recent one, or open/create another. Skipped right after onboarding,
  // right after a switch-relaunch (see hiveOpened init), and on every launch when
  // openLastHiveOnLaunch is set (see the initial config load).
  if (!hiveOpened) {
    return <HivePicker config={config} onOpenCurrent={() => setHiveOpened(true)} />;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100vw', height: '100vh',
      overflow: 'hidden'
    }}>
      {/* 0.5.2: the shell is on screen, the boot gate's clock starts. */}
      <BootClock />
      {/* The start loader stays over the shell until its first data is in. */}
      <BootSplashGate />
      {/* 0.5.2: the whole window blurred until the restore is over. */}
      <BootOverlay onboardingComplete={config.onboardingComplete === true} />
      <div
        ref={windowBarRef}
        className="cth-titlebar-drag cth-window-bar cth-window-bar-flat"
        data-window-bar-color="var(--cth-cream-200)"
        style={{
          height: 36, minHeight: 36,
          background: 'linear-gradient(180deg, var(--cth-cream-100) 0%, var(--cth-cream-200) 100%)',
          borderBottom: '1px solid var(--cth-ink-300)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 96,
          paddingRight: 12,
          gap: 12,
          userSelect: 'none'
        }}
      >
        {/* Off the Mac the menu button takes the logo's place. */}
        <WindowMenuButton />
        {!OWN_FRAME && (
          <img
            src={brandLogo}
            alt="Munder Difflin"
            style={{ height: 20, width: 'auto', display: 'block' }}
          />
        )}
        {/* v0.3.7: the version is no longer inert text. It doubles as the
            update control (check, or open the page of a newer release). */}
        <UpdateBadge />
        <span style={{
          fontFamily: 'var(--cth-font-ui)',
          fontSize: 13,
          color: 'var(--cth-ink-500)'
        }}>
          {config.autoMode ? 'auto mode on' : 'auto mode off'}
        </span>
        {/* Usage limits: 28 px to match the buttons beside it. It takes the
            right hand push. */}
        <LimitsChip />
        {/* v0.3.4: theme + fullscreen live HERE (top right), not buried in the
            terminal header — and the theme darkens the whole app, terminals
            included (design/theme.ts + tokens.css dark block). */}
        <button
          className="cth-titlebar-nodrag cth-tip"
          onClick={flipTheme}
          data-tip={appThemeNow === 'dark' ? 'Light theme' : 'Dark theme'}
          aria-label="Toggle dark mode"
          style={{ ...TOP_BUTTON, fontSize: 13, lineHeight: 1 }}
        >
          {appThemeNow === 'dark' ? '☀' : '☾'}
        </button>
        {/* v0.3.4: the IDE button moved to agent level — every agent's header
            (sidebar detail, god Command Center, fullscreen) carries it. */}
        <button
          className="cth-titlebar-nodrag cth-settings-btn cth-tip"
          onClick={() => window.dispatchEvent(new CustomEvent('cth:open-settings'))}
          data-tip="Settings"
          aria-label="Settings"
          style={TOP_BUTTON}
        >
          <GearGlyph />
        </button>
        {/* Focus mode: the one keystroke way into the fullscreen terminal (Esc leaves it). */}
        <button
          className="cth-titlebar-nodrag cth-tip"
          onClick={toggleFocusMode}
          data-tip={fullscreenAgentId ? 'Exit focus mode (Esc)' : 'Focus mode'}
          aria-label="Toggle focus mode"
          style={TOP_BUTTON}
        >
          {fullscreenAgentId ? <CollapseGlyph /> : <ExpandGlyph />}
        </button>
      </div>

      {/* Role-glyph symbol defs, injected once. Cross-file <use> does not
          resolve from file://, which is how Electron serves the packaged
          renderer, so the sprite has to live in the document. */}
      <GlyphSprite />

      {/* The office is a room: floor, splitter, detail panel, agent strip along
          the bottom, and the strip is at the bottom because it mirrors the floor
          above it. */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex',
        padding: 16,
        gap: 0
      }}>
        <div style={{ flex: 1, minHeight: 0, minWidth: 0, position: 'relative' }}>
          <Suspense fallback={<div style={{ width: '100%', height: '100%', background: 'var(--cth-cream-50)' }} />}>
            <OfficeFloor />
          </Suspense>
          <MemoryPanel />
          {agentCount === 0 && godStatus === 'booting' && <MichaelBooting />}
          {agentCount === 0 && godStatus !== 'booting' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ pointerEvents: 'auto', width: 360 }}>
                <PixelPanel variant="dialog" title="EMPTY FLOOR" noPadding>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: '20px' }}>
                      No agents on the floor yet. Spawn one to see real claude output stream in here.
                    </p>
                    <PixelButton variant="primary" size="md" onClick={() => setAddAgentOpen(true)}>
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <Icon name="plus" /> add agent
                      </span>
                    </PixelButton>
                  </div>
                </PixelPanel>
              </div>
            </div>
          )}
        </div>

        <SidebarSplitter
          width={sidebarWidth}
          onChange={setSidebarWidth}
          viewportWidth={vpWidth}
        />

        <div style={{
          width: sidebarWidth, flexShrink: 0,
          minHeight: 0, display: 'flex', flexDirection: 'column'
        }}>
          {agent ? (
            // Michael gets the full Command Center instead of the plain panel.
            agent.isGod ? <CommandCenterPanel agent={agent} /> : <AgentDetailPanel agent={agent} />
          ) : godStatus === 'booting' ? (
            <PixelPanel variant="default" noPadding style={{
              padding: 16, height: '100%',
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', gap: 12
            }}>
              <div style={{
                fontFamily: 'var(--cth-font-display)', fontSize: 10, lineHeight: '14px',
                color: 'var(--cth-ink-500)'
              }}>WAKING THE FLOOR</div>
              <p style={{ margin: 0, fontSize: 13, textAlign: 'center', color: 'var(--cth-ink-700)' }}>
                {bootingGodName} is clocking in.<br />
                The terminal will land here once he's seated.
              </p>
            </PixelPanel>
          ) : (
            <PixelPanel variant="default" noPadding style={{
              padding: 16, height: '100%',
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', gap: 12
            }}>
              <div style={{
                fontFamily: 'var(--cth-font-display)', fontSize: 10, lineHeight: '14px',
                color: 'var(--cth-ink-500)'
              }}>NO AGENT SELECTED</div>
              <p style={{ margin: 0, fontSize: 13, textAlign: 'center', color: 'var(--cth-ink-700)' }}>
                Spawn an agent from the strip below.<br />
                The terminal and command bar will land here.
              </p>
              <PixelButton variant="secondary" size="md" onClick={() => setAddAgentOpen(true)}>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Icon name="plus" /> add agent
                </span>
              </PixelButton>
            </PixelPanel>
          )}
        </div>
      </div>

      <AgentStrip config={config} />

      {addAgentOpen && (
        <AddAgentModal
          onClose={closeAddAgentReview}
          config={config}
          onConfigChange={setConfig}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          config={config}
          initialSection={settingsSection}
          onClose={() => { setSettingsOpen(false); setSettingsSection(undefined); }}
        />
      )}

      {/* The quit dialog: keep them running, or kill all and quit. */}
      {quitWarn && (
        <QuitWarningModal
          ptyCount={quitWarn.ptyCount}
          onCancel={() => {
            window.cth.cancelClose();
            setQuitWarn(null);
          }}
          onConfirm={async () => { await window.cth.confirmClose(); }}
        />
      )}

      {fullscreenAgentId && <FullscreenTerminal config={config} />}
      <IdeShortcut />
      {ideOpen && <IdePanel />}
      <TaskDetailOverlay />

      {/* THE OVERLAY SLOT. At the app root and outside the floor region on
          purpose: a finished run is a fact about this machine, not about
          whichever pane happens to be open.

          Every app-level transient goes through here rather than placing itself,
          so they stack and cannot cover each other. Order is closest-to-corner
          first, by urgency: the completion notice self-dismisses, the update
          offer waits. */}
      <AppOverlaySlot
        transients={[
          <ToastHost key="toasts" />,
          <CompletionToast key="completion" />,
          <DegradedToast key="degraded" />,
          <UpdateToast key="update" />
        ]}
      />

      {/* 0.5.3, B21: the New Floor picker; the ask comes from the app menu. */}
      {newFloorOpen && <NewFloorPicker config={config} onClose={() => setNewFloorOpen(false)} />}
    </div>
  );
}

/** Corner brackets pointing out — enter the fullscreen terminal. Clean
 *  strokes, not the 16x16 pixel set: at this size a pixel-grid glyph reads as
 *  a rendering artifact next to the OS window controls. */
function ExpandGlyph() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth={1.4}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      <path d="M6.2 3H3v3.2M9.8 3H13v3.2M6.2 13H3V9.8M9.8 13H13V9.8" />
    </svg>
  );
}

/** The same brackets turned inward — leave fullscreen. */
function CollapseGlyph() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth={1.4}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      <path d="M3 6.2h3.2V3M13 6.2H9.8V3M3 9.8h3.2V13M13 9.8H9.8V13" />
    </svg>
  );
}

/** A wrench. The previous glyph was a hub with eight radiating spokes, which at
 *  18px is indistinguishable from a sun — sitting immediately beside a theme
 *  toggle whose light-mode icon IS a sun. A tool shape carries "settings"
 *  without competing with its neighbour. Drawn on a 24 box for curve headroom
 *  and rendered at 16. */
function GearGlyph() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      <path d="M15.5 3.5a5 5 0 0 0-6.1 6.1l-5.6 5.6a2.3 2.3 0 1 0 3.2 3.2l5.6-5.6a5 5 0 0 0 6.1-6.1l-3 3-2.2-.6-.6-2.2z" />
    </svg>
  );
}

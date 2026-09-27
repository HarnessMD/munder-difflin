import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useStore, selectedAgent } from '@/store/store';
import { startMockLoop, stopMockLoop } from '@/store/mockEvents';
import type { HarnessConfig } from '@/store/config';
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
import { ProBooting, useBootRecovery, useBootWords } from '@/components/pro/ProBooting';
import { markBootShellMounted, markReconciled } from '@/store/bootGate';
import { Paywall } from '@/components/team/onboarding/Paywall';
import { HivePicker } from '@/components/HivePicker';
import { NewFloorPicker } from '@/components/NewFloorPicker';
import { QuitWarningModal } from '@/components/QuitWarningModal';
import { CompletionToast } from '@/realtime/CompletionToast';
import { UpdateToast } from '@/components/UpdateToast';
import { UpdateBadge } from '@/components/UpdateBadge';
import { useAppTheme, toggleAppTheme } from '@/design/theme';
import { appSkin, setAppSkin, setDefaultAppSkin, useAppSkin } from '@/design/skin';
import { freeAdmits } from '@shared/freeTier';
import { useFreeAccount } from '@/store/freeAccount';
import { ProOnboarding } from '@/components/pro/onboarding/ProOnboarding';
import { ProTakeover } from '@/components/pro/onboarding/ProTakeover';
import { GlyphSprite } from '@/components/RoleGlyph';
import { ProShell } from '@/components/pro/ProShell';
import { openAgentSheet } from '@/components/pro/agentSheetStore';
import { ModeSwitch } from '@/components/pro/ModeSwitch';
import { ProTitlebar, ProConnectionChip } from '@/components/pro/ProTitlebar';
import { ProTransients } from '@/components/pro/ProTransients';
import { SettingsModal, type Section as SettingsSection } from '@/components/SettingsModal';
import { PixelPanel } from '@/components/PixelPanel';
import { PixelButton } from '@/components/PixelButton';
import { Icon } from '@/components/Icon';
import { SidebarSplitter } from '@/components/SidebarSplitter';
import { acquireTerminal, notifyThemeChangeAll } from '@/components/terminalPool';
import { FullscreenTerminal } from '@/components/FullscreenTerminal';
import { useRestoreTeam } from '@/hooks/useRestoreTeam';
import { TaskDetailOverlay } from '@/components/TaskDetailOverlay';
import { IdePanel } from '@/ide/IdePanel';
import { IdeShortcut } from '@/ide/IdeShortcut';
import { AppChromeSlot } from '@/components/AppSlots';
import { AppOverlaySlot } from '@/components/AppSlots';
import {
  TeamsLock, TeamsModal, TeamsToast, useTeamsCompanyRows, teamsPanes
} from '@/components/team/teamsSeam';
import { isInOrg, useLockInfo, useStanding, useTeamsMode } from '@/components/team/teamsMode';
import { useAccessBlockedPing } from '@/analytics/funnel';
import { TeamWindow, TeamWindowButton } from '@/components/team/TeamWindow';
import { closeTeamWindow, useTeamWindowOpen, useTeamWindowShortcut } from '@/components/team/teamWindowState';
import { LOCK_APP_ON_REVOKE, REQUIRE_MEMBERSHIP, SOLO_PRO } from '@shared/teams';
import { keepCompanyPanes, keepCompanyRows, proGateAdmits } from '@shared/soloPro';
import { useSoloLicense } from '@/components/pro/onboarding/soloLicense';
import { useHoldOptionToTalk } from '@/freeflow/holdOption';
import brandLogo from '@brand/logo.png?url';

/* The office floor is the ONLY owner of the app's Pixi/WebGL context, and it is
   dead weight in the Professional skin. Loaded lazily so `scene/office` and its
   whole dependency tree stay out of the graph entirely when Professional is the
   selected skin — a static import would evaluate the module (and pull pixi) at
   startup no matter what we render. See design/skin.ts. */
const OfficeFloor = lazy(async () => ({
  default: (await import('@/scene/office/OfficeFloor')).OfficeFloor
}));

// Injected at build time from package.json (see electron.vite.config.ts).
declare const __APP_VERSION__: string;

/** PRO's mount of the restore driver, headless on purpose.
 *
 *  `useRestoreTeam` carries BOTH restore paths, the boot auto restore and the
 *  manual "restore team" button, and it only runs where a component mounts it.
 *  Its two mount points were Classic surfaces: AgentStrip (office skin only,
 *  below) and FullscreenTerminal (never over PRO). Under the professional skin
 *  nothing mounted the hook, so last session's workers sat on the restorable
 *  list forever and the team never came back (founder, item 3: "Restoring team
 *  is not working on the PRO screen").
 *
 *  Renders nothing because in PRO the restored agents appearing in the rail IS
 *  the outcome, exactly as the Classic auto restore behaves. The hook is built
 *  for multiple simultaneous mounts (module level latch), so this cannot double
 *  start a restore after a skin switch. */
/** Classic's card for the boot overlay (0.5.2): the pixel panel MichaelBooting
 *  draws, with the restore count and the way out. Built here and handed to
 *  ProBooting as `card`, because nothing under pro/ may import the pixel
 *  components (test/pro-fence.test.cjs). */
function ClassicBootCard({ remaining, skippable, onSkip }: { remaining: number; skippable: boolean; onSkip: () => void }) {
  const words = useBootWords(remaining);
  return (
    <div style={{ width: 360 }}>
      <PixelPanel variant="dialog" title="CLOCKING IN" noPadding>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{ width: 14, height: 14, background: '#6E1423', boxShadow: 'var(--cth-shadow-hard)', animation: 'cth-blink 1s steps(1, end) infinite', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', textAlign: 'center', color: 'var(--cth-ink-700)' }}>{words.line}</p>
          <p style={{ margin: 0, fontSize: 12, lineHeight: '18px', textAlign: 'center', color: 'var(--cth-ink-500)' }}>{words.note}</p>
          {skippable && (
            <PixelButton variant="secondary" size="md" onClick={onSkip}>{words.skip}</PixelButton>
          )}
        </div>
      </PixelPanel>
    </div>
  );
}

function RestoreTeamDriver({ config }: { config: HarnessConfig | null }) {
  useRestoreTeam(config);
  return null;
}

/** The boot gate's clock starts here, the first time the shell is on screen:
 *  below the paywall, the sign-in and the hive picker, so none of them spends
 *  the restore's budget, and the blur still draws for a person who came in
 *  through a door. See store/bootGate.ts. */
function BootClock() {
  useEffect(() => { markBootShellMounted(); }, []);
  return null;
}

/** 0.5.3, F16: whether a local recogniser can take dictation right now; the
 *  mic button and the hold gesture open on this OR a Groq key. Never throws:
 *  an older main without the door leaves the flag off. */
async function refreshCanDictate(): Promise<void> {
  try {
    const st = await window.cth.transcribeStatus?.();
    useStore.getState().setCanDictate(!!st && st.chosen.dictation !== null && st.chosen.dictation !== 'groq');
  } catch {
    useStore.getState().setCanDictate(false);
  }
}

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
  const skin = useAppSkin();
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
  const setIdeOpen = useStore(s => s.setIdeOpen);

  const [config, setConfig] = useState<HarnessConfig | null>(null);
  // 0.5.2, card v052-startup-restore-loading: the boot gate runs at App
  // level for BOTH skins, so the blur and the release drop read one answer
  // to "is the restore over". PRO draws its overlay from ProShell; Classic
  // draws it below, over the whole window.
  // Undefined while the config has not loaded: the gate holds its answer.
  // `config?.onboardingComplete === true` fed FALSE on the first frame, which
  // the gate read as a fresh install and latched settled, so the blur never
  // drew for anyone (found before the 0.5.2 tag; test/boot-gate-wiring.test.cjs).
  const boot = useBootRecovery(config ? config.onboardingComplete === true : undefined);
  // Whether the user has passed the launch-time hive picker this session. Starts
  // true (skip the picker) right after a hive SWITCH — changeHome relaunches and
  // leaves a one-shot localStorage flag so we don't bounce back onto the picker for
  // the hive we just chose. Also set true on onboarding completion (below).
  //
  // PRO (0.4.9 phase 1): an install with a current workspace opens it on
  // launch; switching lives in Settings (pro/onboarding/WorkspacePicker).
  // Read once at mount, not on every render: the skin cannot change while the
  // picker is up, and a switch to Classic later must not drop the running
  // app back onto the picker.
  const [hiveOpened, setHiveOpened] = useState<boolean>(() => {
    try {
      if (window.localStorage.getItem('cth.skipHivePickerOnce')) {
        window.localStorage.removeItem('cth.skipHivePickerOnce');
        return true;
      }
    } catch { /* localStorage unavailable — show the picker */ }
    return appSkin() === 'professional';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The gate in main (plan section 5): read once, then pushed on every change,
  // which is how the Teams surface appears the moment first run enrols.
  const teamsMode = useTeamsMode();
  const inOrg = isInOrg(teamsMode);
  /* `access_blocked` (0.5.0 funnel). Read up here because hooks cannot live in
     the early-return branches below, and the lock's kind and reason arrive a
     round trip after the screen does. Only a REVOKED lock reports, and the
     reason decides whether this person lost a seat or the org stopped paying;
     see the hook. */
  const lockNow = useLockInfo();
  useAccessBlockedPing(lockNow?.kind, lockNow?.reason);
  const teamRows = useTeamsCompanyRows(inOrg);
  // WHAT THIS MACHINE IS ALLOWED TO SEE, in two facts and one function
  // (@shared/soloPro). `standing` decides which destinations exist at all, so
  // a solo install is not offered a Team row that opens an empty room; the
  // license decides whether a machine with no org is let in at all.
  const standing = useStanding();
  const { license, known: licenseKnown } = useSoloLicense();
  // The free tier (founder ruling, 5 Sep 2026, shared/freeTier.ts): an
  // identity on disk that admits CLASSIC, and only Classic, for a machine
  // with no org and no licence.
  const { free, known: freeKnown } = useFreeAccount();
  // Phase 8 (plan Part 7, Option B): the Team window is Classic's one door to
  // the team. PRO has its own Team screen and chord table, so the chord is
  // armed for Classic only and the window is never drawn over PRO.
  const teamWindowOpen = useTeamWindowOpen();
  useTeamWindowShortcut(skin !== 'professional');
  // 5 Sep 2026, third pass: the fresh install runs ONE onboarding
  // (ProOnboarding) on any skin, so the Classic D1 state (`firstRun`,
  // `individualPath`) is gone with the chain that read it.
  /** Which tab Settings opens on. Set by a `cth:open-settings` deep link, reset
   *  to undefined (→ General) whenever the modal is opened the normal way. */
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(undefined);
  const [quitWarn, setQuitWarn] = useState<{ ptyCount: number } | null>(null);
  const [vpWidth, setVpWidth] = useState<number>(window.innerWidth);

  // Deep link into Settings from anywhere in the tree. Settings' open state is
  // local to App, so a nested control (e.g. "set it now" beside a disabled Talk
  // button) has no path to it without threading a prop through every layer
  // between; a window event keeps that plumbing out of the components in
  // between, matching the existing `cth:` CustomEvent convention.
  //
  // In PRO the event is ProShell's: Settings is a page there, and the shell
  // navigates to it (with the section). App stands down so the Classic modal
  // is never drawn over a PRO screen. The titlebar gear dispatches this same
  // event, so both skins have exactly one door into Settings.
  useEffect(() => {
    if (skin === 'professional') return;
    const onOpenSettings = (e: Event): void => {
      const section = (e as CustomEvent<{ section?: SettingsSection }>).detail?.section;
      setSettingsSection(section);
      setSettingsOpen(true);
    };
    window.addEventListener('cth:open-settings', onOpenSettings);
    return () => window.removeEventListener('cth:open-settings', onOpenSettings);
  }, [skin]);

  // Initial config load
  useEffect(() => {
    let cancelled = false;
    window.cth.getConfig().then(c => {
      if (cancelled) return;
      setConfig(c);
      // Mirror the Free Flow flag into the store so the composer mic button shows
      // only when enabled (Settings keeps this in sync on save).
      // Mirror boolean key-presence ONLY (never the key value) so the composer can
      // show the voice button disabled-with-tooltip when Free Flow is on but no
      // Groq key is set (Settings keeps this in sync on save).
      useStore.getState().setHasGroqKey(!!c.groqApiKey);
      // 0.5.3, F16: the local engines take dictation with no key at all.
      void refreshCanDictate();
      // Mirror the active office theme so OfficeFloor renders it (gated on the
      // tvShowOffices flag; off = always the office). Settings keeps this synced.
      useStore.getState().setOfficeTheme(c.tvShowOffices ? (c.officeTheme ?? 'office') : 'office');
      // Mirror the custom avatars so the pickers list them and the painter can
      // draw a `custom:<id>` character (avatarRegistry, fed by the setter).
      useStore.getState().setAvatars(c.avatars ?? []);
      // Mirror the triggers so Settings → Connections and the Command Center's
      // Triggers tab read one list, not two copies that drift — whichever surface
      // saves calls these same setters and the other repaints. No extra IPC: main
      // deep-fills both fields on every config read (withTriggerDefaults), so
      // getConfig() already serves what listWebhooks() would.
      // `c` is typed as the PRELOAD's HarnessConfig, which hasn't picked the two
      // fields up yet (another lane's file); the renderer mirror type declares them.
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

  // Free Flow entry point B — hold-Option (⌥) to talk. In-renderer push-to-talk
  // for whichever agent the user is viewing; gated on the flag, terminal-safe
  // (solo-hold threshold, aborts on any other key). See freeflow/holdOption.ts.
  useHoldOptionToTalk();

  // Config subscription — the copy loaded above would otherwise go stale the
  // moment anything saves a setting.
  useEffect(() => window.cth.onConfigChanged((c) => {
    void refreshCanDictate();
    setConfig(c);
    // The avatar list is drawn from synchronously (painter, floor), so it is
    // re-mirrored on every write: a save in the editor repaints every portrait.
    useStore.getState().setAvatars(c.avatars ?? []);
  }), []);

  // Another window (the puck) asking for Settings: main relays it here and
  // it takes the one door the titlebar gear takes, whichever skin is on.
  useEffect(() => window.cth.onOpenSettings((arg) => {
    window.dispatchEvent(new CustomEvent('cth:open-settings', { detail: { section: arg.section } }));
  }), []);

  // The default view (0.4.11): the config is the truth, and design/skin.ts
  // keeps a boot cache of it so the next launch opens in that view before the
  // config has arrived. Mirrored on every change, never applied mid session:
  // the titlebar switch owns the current view.
  useEffect(() => {
    if (!config) return;
    setDefaultAppSkin(config.defaultView === 'office' || config.defaultView === 'professional' ? config.defaultView : null);
  }, [config?.defaultView]);

  // Quit warning subscription
  useEffect(() => window.cth.onCloseRequested((info) => setQuitWarn(info)), []);

  // 0.5.3, B21: "New Floor" (the File menu, Cmd/Ctrl+Shift+N) asks where to
  // start. Main pushes the ask to the focused window; the modal does the rest.
  const [newFloorOpen, setNewFloorOpen] = useState(false);
  useEffect(() => window.cth.onFloorPickerOpen(() => setNewFloorOpen(true)), []);

  // Shareable hires: a validated manifest arriving via the munderdifflin://
  // deep link (or file import) pre-fills the Add-Agent surface. Never spawns by
  // itself. In PRO that surface is the agent sheet (one door, decision D3),
  // so the Classic modal is never drawn over a PRO screen.
  const enqueuePendingHires = useStore(s => s.enqueuePendingHires);
  const closeAddAgentReview = () => {
    clearPendingHires();
    setAddAgentOpen(false);
  };
  useEffect(() => {
    const openReview = () => {
      if (skin === 'professional') openAgentSheet({ mode: 'add' });
      else setAddAgentOpen(true);
    };
    const unsub = window.cth.onHireImport?.((m) => {
      enqueuePendingHires([m]);
      openReview();
    });
    // Pull anything that arrived before this subscription existed (cold-start
    // deep links; packaged renderers load too fast for push-on-load).
    void window.cth.drainPendingHires?.().then((queued) => {
      if (queued && queued.length > 0) {
        enqueuePendingHires(queued);
        openReview();
      }
    });
    return unsub;
  }, [enqueuePendingHires, setAddAgentOpen, skin]);
  useEffect(() => window.cth.onHireError?.((info) => {
    console.error('[hire] import failed:', info.error);
  }), []);

  // The quit warning's two answers, one set for both skins' dialogs (founder,
  // 5 Sep 2026: closing time left the quit flow; the only doors are keep them
  // running and kill all and quit).
  const quitHandlers = {
    onCancel: () => {
      window.cth.cancelClose();
      setQuitWarn(null);
    },
    onConfirm: async () => { await window.cth.confirmClose(); }
  };

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
    window.cth.listPtys().then((list) => {
      if (cancelled) return;
      useStore.getState().reconcileWithLivePtys(list.map((p) => p.id));
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

  // THE DOWNGRADE (founder ruling, 5 Sep 2026): when a PRO key dies, the
  // person lands in Classic with their work, never locked out. One automatic
  // moment, and it does not fire on a deliberate ModeSwitch flip to PRO later
  // on — that flip must keep leading to the paywall, or there is no way back.
  //
  //   LIVE, when the recheck loop kills the key mid-session: admission was
  //   held and is now lost, so PRO closes and local work continues in Classic.
  //   (The BOOT half was retired in the third pass: a key found dead at boot
  //   meets the PAYWALL at the gate below, which says the key stopped working
  //   and continues free in one click. A silent skin flip at launch would
  //   also have eaten the fresh install's paywall, which is the distinction
  //   screen the ruling asks for.)
  const wasAdmitted = useRef(false);
  useEffect(() => {
    if (!licenseKnown || teamsMode !== 'solo') return;
    const admitted = proGateAdmits(teamsMode, license);
    if (skin === 'professional' && wasAdmitted.current && !admitted) {
      setAppSkin('office');
    }
    wasAdmitted.current = admitted;
  }, [licenseKnown, license, teamsMode, skin]);

  if (!config) {
    return <div style={{ width: '100vw', height: '100vh', background: 'var(--cth-cream-100)' }} />;
  }

  // Plan 3.1, DEFAULT NOT RULING (`LOCK_APP_ON_REVOKE`): an enrolled machine
  // that lost its membership, or let the lease run out, locks the whole app
  // behind the takeover. Local work is not offered. With the boolean off, the
  // takeover sits on the Team surface instead and this branch never runs.
  //
  // The skin picks the surface, never the rule: PRO draws the kit takeover
  // (0.4.9 phase 1), Classic keeps Creed's; both read the same lock and call
  // the same remedies.
  if (LOCK_APP_ON_REVOKE && teamsMode === 'locked') {
    return skin === 'professional' ? <ProTakeover /> : <TeamsLock />;
  }

  // THE GATE (`REQUIRE_MEMBERSHIP`, founder 3 Sep 2026; `SOLO_PRO`, founder
  // 4 Sep 2026). A machine with no paid answer behind it is not let into the
  // app: it gets the way in, full window, and nothing else. This covers the
  // install that already finished onboarding under an older build too, since
  // the first-run branch below only runs before onboarding and an onboarded
  // machine with nothing behind it would otherwise walk straight into the
  // picker. `enrolling` stays here so the join is not unmounted mid-way.
  //
  // WHAT MOVED ON 4 SEP: a PRO machine with a live LICENSE has a paid answer
  // without an org, so it is admitted. `proGateAdmits` is the whole rule and
  // it refuses `locked` outright, which is the property that matters: a person
  // whose seat was revoked must meet the takeover, never fall through into
  // solo and keep working. Classic passes no license and is therefore on
  // exactly the branch it was on in 0.4.9.
  //
  // `licenseKnown` is the first read of that record coming back. Until it
  // does, the honest answer is "not yet", so the window stays blank for one
  // IPC round trip rather than flashing the way in at a licensed person.
  const soloAdmitted = SOLO_PRO && skin === 'professional' && proGateAdmits(teamsMode, license);
  // The free tier admits CLASSIC and only Classic (5 Sep 2026), and only in
  // `solo`: `locked` is a takeover and `enrolling` is a join in flight, and a
  // free record must be able to rescue neither.
  const freeAdmitted = skin !== 'professional' && teamsMode === 'solo' && freeAdmits(free);
  // A PAID individual is admitted into Classic too (5 Sep 2026, second pass):
  // the licence buys the whole app, and a person who bought PRO then flipped
  // the switch to Classic must not meet the paywall for what they paid for.
  const classicPaid = SOLO_PRO && skin !== 'professional' && teamsMode === 'solo' && proGateAdmits(teamsMode, license);
  // ONE hold for both records (5 Sep 2026, third pass): the door screens read
  // the free record on every skin now, so the window waits one IPC trip for
  // both answers rather than flashing a door at a person who is already in.
  if ((!licenseKnown || !freeKnown) && (teamsMode === 'solo' || teamsMode === 'enrolling')) {
    return <div style={{ width: '100vw', height: '100vh', background: 'var(--cth-cream-100)' }} />;
  }
  if (REQUIRE_MEMBERSHIP && config.onboardingComplete && !soloAdmitted && !freeAdmitted && !classicPaid && (teamsMode === 'solo' || teamsMode === 'enrolling')) {
    // Onboarded, signed in, unpaid, in the professional skin: the PAYWALL is
    // the distinction the founder ruled comes after onboarding. Continue free
    // flips to Classic, which the free record admits; a key stays here.
    /* `trigger` for `paywall_shown` (0.5.0 funnel) is decided HERE, at the
       branch that knows why — and it is TWO answers, not one.
       I first wrote this as a flat `licence_missing`, on the belief that a dead
       key downgrades into Classic rather than walling. That is only the LIVE
       half. The comment on the downgrade above says the boot half was retired
       deliberately: "a key found dead at boot meets the PAYWALL at the gate
       below". So this one branch serves both a person who never bought and a
       person whose licence just died, and reporting the second as
       `licence_missing` would count a lapsed customer as someone who never
       arrived — a confident wrong value, which is the thing this funnel's two
       earlier rulings were both about.
       The records already tell them apart: reaching here means
       `proGateAdmits` said no, so a licence that EXISTS is a licence that
       stopped working. */
    /* `onFree` stays FIRST: test/free-tier.test.cjs pins this line as source
       text ("the signed-in wall is the paywall"), and prop order is arbitrary
       here, so satisfying it costs nothing and keeps that guard intact. */
    /* Stays ONE statement with no braces: three separate suites pin this line
       as source text ("the signed-in wall is the paywall"). Wrapping it in a
       block broke all three at once, and the shape is free to keep. */
    if (freeAdmits(free)) return <Paywall onFree={() => setAppSkin('office')} trigger={license ? 'licence_expired' : 'licence_missing'} />;
    // Onboarded with no account at all (the 0.4.6 upgrader): the two doors,
    // on every skin, because the onboarding is one thing now. The individual
    // door is a sign-in, never a key.
    return <ProOnboarding entryOnly />;
  }

  if (!config.onboardingComplete) {
    // ONE ONBOARDING (founder ruling, 5 Sep 2026, third pass): the PRO design
    // for every fresh install, on any skin. Its entry step is the two-segment
    // door (for individuals: a sign-in; for teams: the join), the paid
    // distinction happens at the paywall AFTER, and Classic's old wizard
    // chain no longer mounts from here.
    return <ProOnboarding onComplete={(next) => { setConfig(next); setHiveOpened(true); }} />;
  }

  // Launch-time hive picker: on reopen, let the user open their current hive,
  // switch to a recent one, or open/create another. Skipped right after onboarding
  // and right after a switch-relaunch (see hiveOpened init).
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
      {/* 0.5.2: Classic's boot overlay, the whole window blurred until the
          restore is over (PRO mounts the same component from ProShell). */}
      {skin !== 'professional' && boot.recovering && (
        <ProBooting remaining={boot.remaining} skippable={boot.skippable} onSkip={boot.skip} card={<ClassicBootCard remaining={boot.remaining} skippable={boot.skippable} onSkip={boot.skip} />} />
      )}
      {/* rt-12: global fixed-overlay toast for voice-Michael completions ("Oscar
          finished X"). Renders null until one arrives. Mounted in the overlay
          slot at the bottom of this file, with every other app-level transient. */}
      {/* Title bar. PRO's is the kit's (pro/ProTitlebar.tsx, 0.4.9 phase 6):
          flat surface, the version as the update control, Simple | Technical,
          the connection chip, theme, gear, Classic | PRO. The Classic bar
          below is unchanged. Both take the chrome slot from here, because
          App owns the two app-level slots for both skins (AppSlots.tsx). */}
      {skin === 'professional' ? (
        <ProTitlebar
          theme={appThemeNow}
          onToggleTheme={flipTheme}
          appVersion={__APP_VERSION__}
          chrome={<AppChromeSlot><ProConnectionChip /></AppChromeSlot>}
        />
      ) : (
      <div
        className="cth-titlebar-drag"
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
        <img
          src={brandLogo}
          alt="Munder Difflin"
          style={{ height: 20, width: 'auto', display: 'block' }}
        />
        {/* v0.3.7: the version is no longer inert text — it doubles as the
            update control (check / download / restart to update). */}
        <UpdateBadge />
        <span style={{
          fontFamily: 'var(--cth-font-ui)',
          fontSize: 13,
          color: 'var(--cth-ink-500)'
        }}>
          {config.autoMode ? 'auto mode on' : 'auto mode off'}
        </span>
        {/* v0.3.4: theme + fullscreen live HERE (top right), not buried in the
            terminal header — and the theme darkens the whole app, terminals
            included (design/theme.ts + tokens.css dark block). */}
        <button
          className="cth-titlebar-nodrag cth-tip"
          onClick={flipTheme}
          data-tip={appThemeNow === 'dark' ? 'Light theme' : 'Dark theme'}
          aria-label="Toggle dark mode"
          style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, padding: 0,
            background: 'var(--cth-paper-100)',
            boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
            border: 'none', borderRadius: 'var(--cth-radius-md, 2px)', cursor: 'pointer',
            color: 'var(--cth-ink-900)', fontSize: 13, lineHeight: 1
          }}
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
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, padding: 0,
            background: 'var(--cth-paper-100)',
            boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
            border: 'none', borderRadius: 'var(--cth-radius-md, 2px)', cursor: 'pointer',
            color: 'var(--cth-ink-900)'
          }}
        >
          <GearGlyph />
        </button>
        {/* FOCUS MODE, for the free tier (founder ruling, 5 Sep 2026). The
            2 Sep ruling turned this button into the Classic | PRO switch; for
            a free install that switch is the door to the licence screens, not
            a place to work, so the one-keystroke way into the fullscreen
            terminal comes back BESIDE it rather than instead of it. Licensed
            and org machines keep the 2 Sep titlebar exactly. */}
        {freeAdmitted && (
          <button
            className="cth-titlebar-nodrag cth-tip"
            onClick={() => {
              if (fullscreenAgentId) { useStore.getState().setFullscreen(null); return; }
              const all = useStore.getState().agents;
              const target = all.find((x) => x.id === useStore.getState().selectedId && x.ptyId)
                ?? all.find((x) => x.isGod && x.ptyId)
                ?? all.find((x) => x.ptyId);
              if (target) useStore.getState().setFullscreen(target.id);
            }}
            data-tip={fullscreenAgentId ? 'Exit focus mode (Esc)' : 'Focus mode'}
            aria-label="Toggle focus mode"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, padding: 0,
              background: 'var(--cth-paper-100)',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
              border: 'none', borderRadius: 'var(--cth-radius-md, 2px)', cursor: 'pointer',
              color: 'var(--cth-ink-900)'
            }}
          >
            {fullscreenAgentId ? <CollapseGlyph /> : <ExpandGlyph />}
          </button>
        )}
        {/* CLASSIC | PRO. Founder, 2 Sep 2026: the focus-mode expand/collapse
            button became this switch. Classic keeps the fullscreen terminal
            (Esc, the agent header); in PRO the agent screen is the focus. */}
        <ModeSwitch />

        {/* THE CHROME SLOT. App-level, persistent, above the skin switch — see
            components/AppSlots.tsx for why there are exactly two of these.

            Classic carries the Team button: the ONE door to the Team window,
            with the unread count on it (phase 8, plan Part 7). The chip's
            facts, the relay state and since when, moved inside that window
            and to the one Connections row in Classic Settings, so the Classic
            titlebar has one teams control rather than two side by side. PRO's
            slot, in the PRO titlebar above, carries its connection chip. */}
        <AppChromeSlot><TeamWindowButton /></AppChromeSlot>

      </div>
      )}

      {/* Role-glyph symbol defs, injected once. Cross-file <use> does not
          resolve from file://, which is how Electron serves the packaged
          renderer, so the sprite has to live in the document. */}
      <GlyphSprite />

      {/* SECTION 7 — THE ONE STRUCTURAL CHANGE.
          Office is a room: floor, splitter, detail panel, agent strip along the
          bottom, and the strip is at the bottom because it mirrors the floor
          above it. Professional replaces the strip with a persistent left rail
          and ONE pane, because the strip works for eight agents and breaks at
          thirty — and Professional is the skin for the person running thirty.
          Both layouts are mounted from the same state; nothing below the rail
          knows which skin it is in. */}
      {skin === 'professional' ? (
        <ProShell
          config={config}
          companyRows={keepCompanyRows(standing, teamRows)}
          extraPanes={keepCompanyPanes(standing, teamsPanes(inOrg))}
          onToggleTheme={flipTheme}
          appVersion={__APP_VERSION__}
        />
      ) : (
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
      )}

      {/* The agent strip is what the rail REPLACES, so it is Office-only.
          Section 7: "This is the old agent strip." */}
      {skin === 'office' && <AgentStrip config={config} />}

      {/* PRO has no strip and no fullscreen rail, the two Classic surfaces
          that mount useRestoreTeam, so the driver mounts here or last
          session's team is never respawned under PRO. See RestoreTeamDriver. */}
      {skin === 'professional' && <RestoreTeamDriver config={config} />}

      {/* Classic only: PRO adds and edits agents through its own sheet
          (ProShell mounts AgentSheetHost), never through this modal. */}
      {addAgentOpen && skin !== 'professional' && (
        <AddAgentModal
          onClose={closeAddAgentReview}
          config={config}
          onConfigChange={setConfig}
        />
      )}

      {/* Never over PRO: there Settings is a page (ProShell), and a modal left
          open by a Classic session must not follow the switch. */}
      {settingsOpen && skin !== 'professional' && (
        <SettingsModal
          config={config}
          initialSection={settingsSection}
          onClose={() => { setSettingsOpen(false); setSettingsSection(undefined); }}
        />
      )}

      {/* Classic's Team window (phase 8). Never over PRO, same rule as the
          Settings modal above; the store closes it from the button, the chord
          and Esc alike. Mounted after Settings so it paints over it. */}
      {teamWindowOpen && skin !== 'professional' && (
        <TeamWindow onClose={closeTeamWindow} />
      )}

      {/* Classic's quit dialog. PRO asks the same question through its own
          sheet (ProTransients below), with these same handlers. */}
      {quitWarn && skin !== 'professional' && (
        <QuitWarningModal
          ptyCount={quitWarn.ptyCount}
          onCancel={quitHandlers.onCancel}
          onConfirm={quitHandlers.onConfirm}
        />
      )}

      {/* The fullscreen focus terminal is Classic's (Esc, the agent header).
          PRO retired it: there the agent screen is the focus, and a focus
          preference restored under PRO must not paint a Classic surface. */}
      {fullscreenAgentId && skin !== 'professional' && <FullscreenTerminal config={config} />}
      <IdeShortcut />
      {ideOpen && <IdePanel />}
      {/* PRO draws the sheet inside ProShell (TaskSheetHost), where it can navigate. */}
      {skin !== 'professional' && <TaskDetailOverlay />}

      {/* THE OVERLAY SLOT. At the app root and outside the floor region on
          purpose: an approval request, a finished run and a changed key are
          facts about this machine, not about whichever pane happens to be open.
          Mounted inside a pane, each would be invisible exactly when it mattered.

          Every app-level transient goes through here rather than placing itself.
          All three used to anchor to `right: 16, bottom: 16` independently and
          covered each other by z-index; the slot stacks them so they cannot.
          Order is closest-to-corner first, by urgency — the approval can EXPIRE,
          the completion notice self-dismisses, the update offer waits.

          Under PRO (0.4.9 phase 6) the same five facts render through the
          kit: ProTransients subscribes to the same pushes and raises PRO
          toasts and sheets, so none of the Classic transients is mounted. */}
      {skin !== 'professional' ? (
        <AppOverlaySlot
          modal={<TeamsModal />}
          transients={[
            <TeamsToast key="approval" />,
            <CompletionToast key="completion" />,
            <UpdateToast key="update" />
          ]}
        />
      ) : (
        <ProTransients quit={quitWarn ? { ptyCount: quitWarn.ptyCount, ...quitHandlers } : null} />
      )}

      {/* 0.5.3, B21: the New Floor picker, over either skin; it is the one
          modal both share, since the ask comes from the app menu. */}
      {newFloorOpen && <NewFloorPicker config={config} onClose={() => setNewFloorOpen(false)} />}
    </div>
  );
}

/** Corner brackets pointing out — enter the fullscreen terminal. The pair the
 *  2 Sep 2026 switch removed, back for the free tier's titlebar button. Clean
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

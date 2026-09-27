import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { agentModels, type HarnessConfig } from '@/store/config';
import { useStore } from '@/store/store';
import { UpdatesSection } from './UpdatesSection';
import { WorktreesPanel } from './WorktreesPanel';
import { SettingsHeroCard } from './SettingsHeroCard';
import { SetupPanel } from './SetupPanel';
import { PrerequisitesCheck } from './PrerequisitesCheck';
import { BossNameSection } from './pro/BossNameField';
import { NameSection } from './pro/NameField';
import { ProIcon } from './pro/icons';
import { OfficeThemePicker } from './OfficeThemePicker';
import { ResponseStyleSection } from './ResponseStyleSection';
import { AiEnginesSettings } from './AiEnginesSettings';
import { TranscribeSettings } from './TranscribeSettings';
import { REALTIME_MODEL } from '@shared/realtimePricing';
import {
  isArabicTerminalEnabled,
  isArabicTerminalFollowingLanguage,
  setArabicTerminalEnabled
} from '@/terminal/arabicSetting';
import { notifyArabicTerminalChangeAll } from '@/components/terminalPool';
import { LANGUAGES, setLanguage } from '@/i18n';
import { useTeamsMode } from './team/teamsMode';
import { proGateAdmits } from '@shared/soloPro';
import { useSoloLicense } from './pro/onboarding/soloLicense';
import type { AppSkin } from '@/design/skin';
import { TASK_HYGIENE_DEFAULTS, TASK_HYGIENE_KEYS, resolveTaskHygiene, type TaskHygieneConfig, type TaskHygieneKey } from '@shared/taskHygiene';
import { Btn, Panel } from './pro/ui';
import { settingsChrome } from './pro/settings/chrome';
import { createSettingsDraft } from './settings/draftStore';
import { InfoTip, SettingsFrameProvider } from './settings/SettingsFrame';
import { ConnectionsSection } from './settings/ConnectionsSection';
import { KeysSecretsSection, KEYS_READY } from './settings/KeysSecretsSection';
import { editFor, keyTask, keyTaskId, type KeyBroker } from './settings/providerKeys';

export interface SettingsModalProps {
  config: HarnessConfig;
  onClose: () => void;
  /** Open straight to a section instead of General. Used by deep links from
   *  elsewhere in the UI — "set it now" beside a disabled Talk button lands on
   *  the tab that actually holds the field, rather than making the user hunt. */
  initialSection?: Section;
  /** `inline` (PRO's Settings page) drops the overlay and the dialog frame and
   *  nothing else; the body, its nav and its footer are the same component,
   *  so the two skins cannot drift on what a setting does. */
  chrome?: 'modal' | 'inline';
}

/** Clear every renderer-side persisted key so a relaunch starts truly empty. */
/** Free Flow's two fields as one comparable value: what main holds, or what
 *  the page shows. */
function freeflowKey(apiKey: string, model: string): string {
  return JSON.stringify([apiKey, model]);
}

/** The write only broker, for the OpenAI key on Orchestrator's voice. */
const openAiBroker: KeyBroker = {
  set: (backend, key) => window.cth.providerKeySet({ backend, key }),
  clear: (backend) => window.cth.providerKeyClear(backend)
};

function clearLocalState(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('cth.')) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch { /* noop */ }
}

// v0.3.4 redesign: six tabs, one topic each. 'AI Engines' folded into
// Agents & Models; Slack and webhooks live in Connections (MCP servers are
// Capabilities' alone since 0.5.3 batch 3);
// voice gets its own tab; Danger Zone became a red row at the bottom of General.
/* The section heading, the rule between sections, the inputs, the nav and the
   footer are all DEFINED ONCE AND PICKED BY CHROME, in pro/settings/chrome.ts.
   They were written out inline seventeen times, in three slightly different
   forms, which is how a tab ends up looking subtly unlike its neighbours; then
   0.4.10 needed a second answer for each of them, because PRO embeds this same
   body as a page and was still drawing the Classic pixel form under a kit Bar.
   One markup, two style sets, no fork. */

export type Section = 'General' | 'Prerequisites' | 'Agents & Models' | 'Autonomy & Budgets' | 'Connections' | 'Keys & Secrets' | 'Voice' | 'Dictation & Meetings' | 'Memory & Knowledge';
/* 0.5.3 redesign order (founder, 24 Sep 2026). Keys & Secrets draws from its
   own file under ./settings and joins the nav once that file says it is
   ready, so a build never shows an empty tab. Integrations is gone (batch 3,
   founder 25 Sep): its endpoints are Connections > Inbound integrations. */
const NAV_SECTIONS: Section[] = (['General', 'Prerequisites', 'Agents & Models', 'Autonomy & Budgets', 'Connections', 'Keys & Secrets', 'Voice', 'Dictation & Meetings', 'Memory & Knowledge'] as Section[])
  .filter((s) => s !== 'Keys & Secrets' || KEYS_READY);
/** i18n key for each nav section's label — the Section values themselves stay
 *  as stable identifiers (tab state, deep links). */
const NAV_SECTION_KEYS: Record<Section, string> = {
  'General': 'settings.nav.general',
  'Prerequisites': 'settings.nav.prerequisites',
  'Agents & Models': 'settings.nav.agentsModels',
  'Autonomy & Budgets': 'settings.nav.autonomyBudgets',
  'Connections': 'settings.nav.connections',
  'Keys & Secrets': 'settings.nav.keysSecrets',
  'Voice': 'settings.nav.voice',
  'Dictation & Meetings': 'settings.nav.dictation',
  'Memory & Knowledge': 'settings.nav.memoryKnowledge'
};

export function SettingsModal({ config, onClose, initialSection, chrome = 'modal' }: SettingsModalProps) {
  /* Classic is the modal; PRO embeds the same body as a page (`inline`). They
     no longer differ on content: the teams rows (Classic's relay row, PRO's
     organisation trigger) left Connections for the Team window in 0.5.3. */
  /* The one place the two skins differ on LOOK. Every style below is read off
     this, so a PRO shape can never leak into Classic and vice versa: there is
     no branch to get wrong at a call site. Destructured under the names the
     markup already used, so the form's 2218 lines did not have to move. */
  const {
    sectionHead, sectionHeadTight, sectionHeadFlush, rule: sectionRule,
    input: slackInputStyle, label: slackLabelStyle,
    navColumn, navRow, pane, footer, panel, optionCard, chip,
    statusDot, warnTile, dangerHead, errorText
  } = settingsChrome(chrome);
  const teamsMode = useTeamsMode();
  const { t, i18n } = useTranslation();
  const godName = useStore((s) => s.agents.find((a) => a.isGod)?.name) ?? 'the orchestrator';
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>(initialSection ?? 'General');
  /** The one draft every section file stages into (settings/draftStore.ts). */
  const [draft] = useState(createSettingsDraft);
  useSyncExternalStore(draft.subscribe, draft.version);

  // Change-home flow: null until the user picks a new folder, then the sub-modal
  // confirms move-vs-fresh. Pre-selects 'move' (recommended - keeps the data).
  const [changeHome, setChangeHome] = useState<string | null>(null);
  const [changeMode, setChangeMode] = useState<'move' | 'fresh'>('move');
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeErr, setChangeErr] = useState('');

  // Desktop notifications (founder batch 3 #2): staged on the page's one draft
  // like every other row, so a click lights Save instead of writing at once.
  const notificationsSaved = (config as HarnessConfig & { notifications?: boolean }).notifications === true;
  const notifications = draft.value<boolean>('notifications', notificationsSaved);
  const toggleNotifications = (): void => {
    const next = !notifications;
    if (next === notificationsSaved) draft.unstage(['notifications']);
    else draft.stage({ notifications: next });
  };

  // ─── v0.3.4 redesign: settings that were onboarding-trapped or UI-less ────
  const cfgX = config as HarnessConfig & {
    strongKeepalive?: boolean; audience?: string; autoMode?: boolean;
    defaultModel?: string; maxTurns?: number; semanticMemory?: boolean;
  };
  /**
   * ONE SAVE BUTTON.
   *
   * Settings used to persist three different ways: toggles wrote to disk the
   * instant you clicked them, some sections had their own Save, and a couple of
   * fields saved on blur. Nothing told you which kind you were looking at, so
   * "did that stick?" had no answer you could learn once and reuse.
   *
   * Now every setting that goes through `updateConfig` is STAGED here and
   * written by the footer Save, in a single call.
   *
   * Two things stay immediate, on purpose, and they are not settings:
   *   - API keys, which go to the write-only secret broker. Nothing can read
   *     one back to diff it, so there is no staged value to hold.
   *   - Free Flow, which arms a global hotkey in main. Staging that would leave
   *     the hotkey and the checkbox disagreeing until you pressed Save.
   * Slack and webhooks keep their own controls too: those connect and
   * disconnect live rather than storing a preference.
   */
  const [pending, setPending] = useState<Partial<HarnessConfig>>({});
  /** Auto-compact lives inside the missions array, so it is resolved at save
   *  time against the config on disk rather than staged as a whole array. */
  const [autoCompactPending, setAutoCompactPending] = useState<boolean | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveNote, setSaveNote] = useState('');
  /** The note is a failure (a partial save or a thrown write): the error colour, not the success one. */
  const [saveBad, setSaveBad] = useState(false);
  /** True once a control that USED to persist on click has been changed. Only
   *  those need the close guard: the text fields always needed a Save. */
  const stagedDirty = Object.keys(pending).length > 0 || autoCompactPending !== null;
  const stage = (patch: Partial<HarnessConfig>): void =>
    setPending((prev) => ({ ...prev, ...patch }));

  // The default view (founder, 6 Sep 2026): the view the office opens in,
  // Classic or PRO, a PRO user's setting. The gate is the one the titlebar
  // switch and the plans band use, expression for expression, so the three
  // cannot disagree about who is a PRO user. Staged like every other General
  // row; App.tsx mirrors the saved value into design/skin.ts for the next
  // launch. It never changes the current view: the titlebar switch owns that.
  const { license: soloLicense } = useSoloLicense();
  const proUser = proGateAdmits(teamsMode, soloLicense);
  const [defaultView, setDefaultView] = useState<AppSkin | ''>(cfgX.defaultView === 'office' || cfgX.defaultView === 'professional' ? cfgX.defaultView : '');
  const chooseDefaultView = (v: AppSkin) => {
    setDefaultView(v);
    stage({ defaultView: v } as Partial<HarnessConfig>);
  };
  const [keepAwake, setKeepAwake] = useState<boolean>(cfgX.strongKeepalive === true);
  const toggleKeepAwake = async () => {
    const next = !keepAwake;
    setKeepAwake(next);
    stage({ strongKeepalive: next } as Partial<HarnessConfig>);
  };
  // Keep my agent order (founder, 24 Sep 2026): off by default, staged on
  // the page's one draft, so it takes effect on Save. shared/agentOrder.ts.
  const keepOrderSaved = cfgX.keepAgentOrder === true;
  const keepOrder = draft.value<boolean>('keepAgentOrder', keepOrderSaved);
  const toggleKeepOrder = () => {
    const next = !keepOrder;
    if (next === keepOrderSaved) draft.unstage(['keepAgentOrder']);
    else draft.stage({ keepAgentOrder: next });
  };
  // Sidebar shows only agents and notes (founder, 25 Sep 2026): off by
  // default, on the same draft, so it takes effect on Save.
  const bareRailSaved = cfgX.sidebarAgentsNotesOnly === true;
  const bareRail = draft.value<boolean>('sidebarAgentsNotesOnly', bareRailSaved);
  const toggleBareRail = () => {
    const next = !bareRail;
    if (next === bareRailSaved) draft.unstage(['sidebarAgentsNotesOnly']);
    else draft.stage({ sidebarAgentsNotesOnly: next });
  };
  const [simpleMode, setSimpleMode] = useState<boolean>(cfgX.audience === 'non-technical');
  // Renderer-local, not part of HarnessConfig — it only changes how this window
  // paints pty output. Read once; the setter keeps localStorage in step.
  const [arabicTerminal, setArabicTerminal] = useState(isArabicTerminalEnabled);
  // Whether that value is the language's default or a choice the user made.
  // Shown as a note rather than a second control: the toggle already IS the
  // override, so the only thing missing is telling them which one they are
  // looking at. Re-read on every language change, because the default moves.
  const [arabicFollowsLanguage, setArabicFollowsLanguage] = useState(isArabicTerminalFollowingLanguage);
  useEffect(() => {
    setArabicTerminal(isArabicTerminalEnabled());
    setArabicFollowsLanguage(isArabicTerminalFollowingLanguage());
  }, [i18n.language]);
  const toggleSimpleMode = async () => {
    const next = !simpleMode;
    setSimpleMode(next);
    stage({ audience: next ? 'non-technical' : 'technical' } as Partial<HarnessConfig>);
  };
  const [autoModeOn, setAutoModeOn] = useState<boolean>(cfgX.autoMode !== false);
  const toggleAutoMode = async () => {
    const next = !autoModeOn;
    setAutoModeOn(next);
    stage({ autoMode: next } as Partial<HarnessConfig>);
  };
  // Default OFF, so an absent value must read as off. Note this is `=== true`,
  // the mirror image of autoMode's `!== false` above, because the two defaults
  // are opposite.
  const [orchSpawnOn, setOrchSpawnOn] = useState<boolean>(cfgX.orchestratorMaySpawn !== false);
  const toggleOrchSpawn = async () => {
    const next = !orchSpawnOn;
    setOrchSpawnOn(next);
    stage({ orchestratorMaySpawn: next } as Partial<HarnessConfig>);
  };
  const [defaultModelSel, setDefaultModelSel] = useState<string>(cfgX.defaultModel ?? 'claude-opus-5-5');
  const saveDefaultModel = (id: string): void => {
    setDefaultModelSel(id);
    stage({ defaultModel: id } as Partial<HarnessConfig>);
  };
  const [maxTurnsVal, setMaxTurnsVal] = useState<string>(cfgX.maxTurns != null ? String(cfgX.maxTurns) : '');
  const maxTurnsPatch = (): Partial<HarnessConfig> => {
    const n = maxTurnsVal.trim() === '' ? undefined : Number(maxTurnsVal);
    return { maxTurns: Number.isFinite(n as number) && (n as number) > 0 ? Math.round(n as number) : undefined } as Partial<HarnessConfig>;
  };
  const [semMemOn, setSemMemOn] = useState<boolean>(cfgX.semanticMemory !== false);
  const toggleSemMem = async () => {
    const next = !semMemOn;
    setSemMemOn(next);
    stage({ semanticMemory: next } as Partial<HarnessConfig>);
  };
  // Phase 4 of 0.4.9 (plan Part 3): the engine's model, its state and the
  // index folder live HERE and nowhere else; the PRO Memory screen only asks
  // whether search by meaning can answer. Same Settings page under both skins.
  const [embedModel, setEmbedModel] = useState<'minilm' | 'embeddinggemma'>(config.embeddingModel === 'embeddinggemma' ? 'embeddinggemma' : 'minilm');
  const saveEmbedModel = (m: 'minilm' | 'embeddinggemma'): void => {
    setEmbedModel(m);
    stage({ embeddingModel: m } as Partial<HarnessConfig>);
  };
  const [memStatus, setMemStatus] = useState<{ available: boolean; initialized: boolean; palacePath: string | null } | null>(null);
  useEffect(() => {
    let alive = true;
    window.cth.memoryStatus().then((s) => { if (alive) setMemStatus(s); }).catch(() => undefined);
    return () => { alive = false; };
  }, [semMemOn]);
  const memFolder = memStatus?.palacePath ?? null;
  const memState = !memStatus ? '' : !memStatus.available ? t('memoryPanel.notSetUp') : !semMemOn ? t('common.off') : memStatus.initialized ? t('memoryPanel.onReady') : t('memoryPanel.onGettingReady');

  // --- circuit-breaker config (Lane A #6 canonical fields, widened view) ---
  // Drives Jim's real breaker: floor-wide TOKEN budget (costCapTokens) + output-
  // token velocity ceiling (circuitBreaker.tokenVelocityPerMin). The token cap
  // replaced the old dollar cap as the user-facing budget.
  type BreakerCfgView = HarnessConfig & {
    costCapTokens?: number;
    circuitBreaker?: { tokenVelocityPerMin?: number; enabled?: boolean; hardStop?: boolean; repeatedToolLimit?: number; errorStormLimit?: number };
  };
  const breakerCfg = config as BreakerCfgView;
  const [agentBudget, setAgentBudget] = useState(breakerCfg.costCapTokens != null ? String(breakerCfg.costCapTokens) : '');
  const [velocityCeiling, setVelocityCeiling] = useState(breakerCfg.circuitBreaker?.tokenVelocityPerMin != null ? String(breakerCfg.circuitBreaker.tokenVelocityPerMin) : '');
  // v0.3.4: the four previously UI-less breaker fields get controls.
  const [brkEnabled, setBrkEnabled] = useState<boolean>(breakerCfg.circuitBreaker?.enabled !== false);
  const [brkHardStop, setBrkHardStop] = useState<boolean>(breakerCfg.circuitBreaker?.hardStop === true);
  const [brkRepeated, setBrkRepeated] = useState(breakerCfg.circuitBreaker?.repeatedToolLimit != null ? String(breakerCfg.circuitBreaker.repeatedToolLimit) : '');
  const [brkErrStorm, setBrkErrStorm] = useState(breakerCfg.circuitBreaker?.errorStormLimit != null ? String(breakerCfg.circuitBreaker.errorStormLimit) : '');
  const budgetPatch = (): Partial<HarnessConfig> => {
    const tokens = agentBudget.trim() === '' ? undefined : Number(agentBudget);
    const vel = velocityCeiling.trim() === '' ? undefined : Number(velocityCeiling);
    const rep = brkRepeated.trim() === '' ? undefined : Number(brkRepeated);
    const storm = brkErrStorm.trim() === '' ? undefined : Number(brkErrStorm);
    return {
      costCapTokens: Number.isFinite(tokens as number) ? (tokens as number) : undefined,
      circuitBreaker: {
        ...(breakerCfg.circuitBreaker ?? {}),
        enabled: brkEnabled,
        hardStop: brkHardStop,
        tokenVelocityPerMin: Number.isFinite(vel as number) ? (vel as number) : undefined,
        repeatedToolLimit: Number.isFinite(rep as number) ? Math.round(rep as number) : undefined,
        errorStormLimit: Number.isFinite(storm as number) ? Math.round(storm as number) : undefined
      }
    } as Partial<HarnessConfig>;
  };
  // --- hygiene thresholds (0.4.9 W-A): five numbers under Autonomy & Budgets ---
  // Each row stages its value on blur; the footer Save commits the staged
  // patch through updateConfig like every other setting here (one writer).
  // Only finite positive numbers are written: a blank or a 0 is not a request
  // to archive everything, and it reads as the default again.
  const hygieneCfg = resolveTaskHygiene(config.taskHygiene);
  const [hygiene, setHygiene] = useState<Record<TaskHygieneKey, string>>(() => {
    const out = {} as Record<TaskHygieneKey, string>;
    for (const k of TASK_HYGIENE_KEYS) out[k] = String(hygieneCfg[k]);
    return out;
  });
  // Ticket keys (0.5.3): the prefix new cards get. Blank = keep the current one.
  const [ticketPrefix, setTicketPrefix] = useState<string>(config.ticketPrefix ?? '');
  const [ticketPrefixNow, setTicketPrefixNow] = useState<string>('');
  useEffect(() => { void window.cth.hiveTicketPrefix?.().then((p) => setTicketPrefixNow(typeof p === 'string' ? p : '')).catch(() => undefined); }, []);
  const ticketPrefixValid = ticketPrefix === '' || /^[A-Z][A-Z0-9]{2}$/.test(ticketPrefix);
  const hygienePatch = (): Partial<TaskHygieneConfig> => {
    const out: Partial<TaskHygieneConfig> = {};
    for (const k of TASK_HYGIENE_KEYS) {
      const n = Number(hygiene[k]);
      if (hygiene[k].trim() !== '' && Number.isFinite(n) && n > 0) out[k] = Math.round(n);
    }
    return out;
  };
  /** The one writer. Commits what the form currently shows, in a single
   *  updateConfig, so a half-applied save is not a state the app can reach. */
  /* The typed fields (max turns, the budget and breaker numbers) are read into
     every save rather than staged, so they count as changed when what they
     would write differs from what they wrote last. Save is enabled only when
     something, here or in a section's draft, is actually different. */
  const formPatchKey = JSON.stringify({ ...maxTurnsPatch(), ...budgetPatch() });
  const formBase = useRef(formPatchKey);
  const dirty = stagedDirty || draft.dirty() || formPatchKey !== formBase.current;
  const saveAll = async (): Promise<void> => {
    setSaveBusy(true); setSaveNote(''); setSaveBad(false);
    try {
      const base: Partial<HarnessConfig> = {
        ...maxTurnsPatch(),
        ...budgetPatch(),
        ...pending
      };
      if (autoCompactPending !== null) {
        // Read-modify-write against disk, not against a stale copy: another
        // window (or main) may have edited a different mission meanwhile.
        const cfg = await window.cth.getConfig();
        base.missions = (cfg.missions ?? []).map((m) =>
          m.id === 'compact-maintenance' ? { ...m, enabled: autoCompactPending } : m
        );
      }
      // One write: this form's patch with every section's staged fields on
      // top, then the sections' tasks (keys, connections) in order.
      const result = await draft.commit(base, (patch) => window.cth.updateConfig(patch));
      if (result.errors.some((e) => e.id === 'config')) throw new Error(result.errors[0].message);
      setPending({});
      setAutoCompactPending(null);
      formBase.current = formPatchKey;
      if (!result.ok) { setSaveBad(true); setSaveNote(t('settings.frame.partlySaved', { error: result.errors[0].message })); return; }
      setSaveNote(t('settings.saved'));
      setTimeout(() => setSaveNote(''), 1800);
    } catch (e) {
      setSaveBad(true);
      setSaveNote(e instanceof Error ? e.message : String(e));
    } finally { setSaveBusy(false); }
  };

  /** Closing with staged changes used to be impossible, because everything wrote
   *  on click. Now it is, so say so rather than dropping the edit silently. */
  const requestClose = (): void => {
    if (dirty && !window.confirm(t('settings.unsavedWarning'))) return;
    draft.reset();
    onClose();
  };

  const fmtBudgetTokens = (raw: string): string => {
    const n = Number(raw);
    if (!raw.trim() || !Number.isFinite(n) || n <= 0) return '';
    if (n >= 1e9) return `${+(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${+(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}K`;
    return String(n);
  };

  // ─── Knowledge Graph (enterprise multimodal context for agents) ───────────
  const [kgEnabled, setKgEnabled] = useState<boolean>(
    (config as HarnessConfig & { knowledgeGraph?: { enabled?: boolean } }).knowledgeGraph?.enabled === true
  );
  const [kgDocCount, setKgDocCount] = useState(0);
  const [kgBusy, setKgBusy] = useState(false);
  const [kgNote, setKgNote] = useState('');

  const refreshKgStatus = async () => {
    try { const s = await window.cth.kgStatus(); setKgDocCount(s.docCount); }
    catch { /* status unavailable */ }
  };

  const toggleKg = async () => {
    const next = !kgEnabled;
    setKgEnabled(next);
    try {
      stage({ knowledgeGraph: { enabled: next } });
      if (next) await refreshKgStatus();
    } catch { setKgEnabled(!next); }
  };

  const addKgFiles = async () => {
    setKgBusy(true); setKgNote('');
    try {
      const res = await window.cth.kgAddFiles();
      if (!res.ok) { setKgNote(res.error === 'cancelled' ? '' : (res.error ?? 'failed')); return; }
      const added = res.results.filter((r) => r.ok).length;
      const failed = res.results.length - added;
      setKgNote(`added ${added} document${added === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}`);
      await refreshKgStatus();
    } catch (e) { setKgNote(e instanceof Error ? e.message : String(e)); }
    finally { setKgBusy(false); }
  };

  // ─── Scheduled auto-compact — the compact-maintenance mission's enabled flag.
  // The mission itself stays the single source of truth (the Triggers tab edits
  // the same field); this is just a General-section shortcut. Default OFF (v0.3.4).
  const [autoCompactOn, setAutoCompactOn] = useState<boolean>(
    (config.missions ?? []).some((m) => m.id === 'compact-maintenance' && m.enabled)
  );
  const toggleAutoCompact = async () => {
    const next = !autoCompactOn;
    setAutoCompactOn(next);
    setAutoCompactPending(next);
  };

  // ─── Auto-update (default ON; gates main's updater checks entirely) ────────
  const [autoUpdateOn, setAutoUpdateOn] = useState<boolean>(config.autoUpdate !== false);
  const toggleAutoUpdate = async () => {
    const next = !autoUpdateOn;
    setAutoUpdateOn(next);
    try { stage({ autoUpdate: next }); }
    catch { setAutoUpdateOn(!next); }
  };

  // ─── Anonymous usage stats (default ON = opt-out; contract in TELEMETRY.md) ─
  const [telemetryOn, setTelemetryOn] = useState<boolean>(config.telemetryEnabled !== false);
  const toggleTelemetry = async () => {
    const next = !telemetryOn;
    setTelemetryOn(next);
    try { stage({ telemetryEnabled: next }); }
    catch { setTelemetryOn(!next); }
  };

  // ORCHESTRATOR'S VOICE (founder batch 3): the section is only the OpenAI key
  // Talk needs. The key is the same broker slot Keys & Secrets writes
  // (apikey:openai) and the same draft task (key:openai), so typing it in either
  // place stages one change, and the footer Save stores it.
  const hasOpenAiKey = useStore((s) => s.hasOpenAiKey);
  const setHasOpenAiKey = useStore((s) => s.setHasOpenAiKey);
  const [openAiVoiceKey, setOpenAiVoiceKey] = useState('');
  const typeOpenAiVoiceKey = (text: string): void => {
    setOpenAiVoiceKey(text);
    const edit = editFor(text);
    draft.setTask(keyTaskId('openai'), edit ? keyTask('openai', edit, openAiBroker, (has) => { setHasOpenAiKey(has); setOpenAiVoiceKey(''); }) : null);
  };

  // --- Free Flow (voice dictation → message queue) ---
  // Batch 3 (founder): no on/off of its own; the composer mic works with the
  // engine picked in Dictation & Meetings, and the Groq key and model show
  // under that list only while it says Groq (TranscribeSettings decides).
  const setHasGroqKeyStore = useStore((s) => s.setHasGroqKey);
  const [groqKey, setGroqKey] = useState(config.groqApiKey ?? '');
  const [freeflowModel, setFreeflowModel] = useState(config.freeflowModel ?? 'whisper-large-v3-turbo');
  const [showGroqKey, setShowGroqKey] = useState(false);

  // Re-seed every editable field from the on-disk config when the modal opens.
  // App's `config` prop is loaded once and never refreshed after a save, so
  // without this the saved budget / velocity / slack values show blank on reopen.
  useEffect(() => {
    let alive = true;
    window.cth.getConfig().then((c) => {
      if (!alive) return;
      const cc = c as BreakerCfgView;
      setAgentBudget(cc.costCapTokens != null ? String(cc.costCapTokens) : '');
      setVelocityCeiling(cc.circuitBreaker?.tokenVelocityPerMin != null ? String(cc.circuitBreaker.tokenVelocityPerMin) : '');
      const kgOn = (cc as { knowledgeGraph?: { enabled?: boolean } }).knowledgeGraph?.enabled === true;
      setKgEnabled(kgOn);
      setGroqKey(cc.groqApiKey ?? '');
      setFreeflowModel(cc.freeflowModel ?? 'whisper-large-v3-turbo');
      freeflowBase.current = freeflowKey(cc.groqApiKey ?? '', cc.freeflowModel ?? 'whisper-large-v3-turbo');
    }).catch(() => { /* keep prop-seeded values */ });
    window.cth.kgStatus().then((s) => { if (alive) setKgDocCount(s.docCount); })
      .catch(() => { /* status unavailable */ });
    return () => { alive = false; };
  }, []);

  // --- Free Flow handlers ---
  // 0.5.3, one Save (founder 24 Sep: "no turn on, no turn off, no save
  // individually"): the key and model are a draft task, `freeflow`, while
  // they differ from what main holds. The footer Save runs it through
  // freeflowSetConfig; only then does the store learn a key is there.
  const freeflowBase = useRef(freeflowKey(config.groqApiKey ?? '', config.freeflowModel ?? 'whisper-large-v3-turbo'));
  useEffect(() => {
    const apiKey = groqKey;
    const model = freeflowModel.trim() || 'whisper-large-v3-turbo';
    const key = freeflowKey(apiKey, model);
    draft.setTask('freeflow', key === freeflowBase.current ? null : async () => {
      await window.cth.freeflowSetConfig({ apiKey, model });
      freeflowBase.current = key;
      // Mirror boolean key-presence so the voice button enables/disables live
      // without an app restart (presence only — never the key value).
      setHasGroqKeyStore(!!apiKey.trim());
    });
  }, [groqKey, freeflowModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = async () => {
    setBusy(true);
    clearLocalState();
    // Wipes hive + palace, resets config, and relaunches into onboarding.
    // The app exits, so this never resolves - no need to clear `busy`.
    await window.cth.resetAll();
  };

  // --- Change home folder ---
  /** Pick a new folder, then open the move-vs-fresh sub-modal. */
  const pickNewHome = async () => {
    setChangeErr('');
    const res = await window.cth.chooseFolder();
    if (!res.ok) return; // cancelled - no-op
    setChangeMode('move'); // recommended default
    setChangeHome(res.path);
  };

  /** Apply the home-folder change. On success the app relaunches (never resolves);
   *  on failure we surface the error and the existing home keeps running. */
  const applyChangeHome = async () => {
    if (!changeHome) return;
    setChangeBusy(true); setChangeErr('');
    // Moving copies the hive (incl. its .git) + palace, so the new home owns the
    // same renderer-side roster - keep localStorage. A 'fresh' home starts empty,
    // so clear the renderer cache to match.
    if (changeMode === 'fresh') clearLocalState();
    try {
      const res = await window.cth.changeHome(changeHome, changeMode);
      if (!res.ok) { setChangeErr(res.error ?? 'Could not change the home folder.'); setChangeBusy(false); }
      // ok === true never returns (the process relaunches).
    } catch (e) {
      setChangeErr(e instanceof Error ? e.message : String(e));
      setChangeBusy(false);
    }
  };

  const modalTitle = changeHome
    ? t('settings.changeHomeTitle')
    : confirming
      ? t('settings.resetTitle')
      : t('settings.title');

  const body = (
    <SettingsFrameProvider draft={draft} chrome={chrome}>
          {/* === Change home sub-modal === */}
          {changeHome ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.changeHome.newHome')}</span>
                <code style={{
                  fontFamily: 'var(--cth-font-mono, monospace)', fontSize: 12,
                  color: 'var(--cth-ink-900)', wordBreak: 'break-all'
                }}>{changeHome}</code>
              </div>

              {/* Move vs. fresh - two selectable option rows; move is preselected. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  ['move', t('settings.changeHome.moveTitle'), t('settings.changeHome.moveDesc')],
                  ['fresh', t('settings.changeHome.freshTitle'), t('settings.changeHome.freshDesc')]
                ] as const).map(([value, title, desc]) => {
                  const selected = changeMode === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setChangeMode(value)}
                      disabled={changeBusy}
                      style={{ ...optionCard(selected), cursor: changeBusy ? 'default' : 'pointer' }}
                    >
                      <span style={{
                        fontSize: 13, lineHeight: '20px',
                        color: 'var(--cth-ink-900)', fontWeight: selected ? 700 : 400
                      }}>
                        {selected ? '◉ ' : '○ '}{title}
                      </span>
                      <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>{desc}</span>
                    </button>
                  );
                })}
              </div>

              {changeErr && (
                <div style={errorText}>{changeErr}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Btn onClick={() => { setChangeHome(null); setChangeErr(''); }} disabled={changeBusy}>
                  {t('common.cancel')}
                </Btn>
                <Btn kind="primary" onClick={applyChangeHome} disabled={changeBusy}>
                  {changeBusy ? t('settings.apply') : (changeMode === 'move' ? t('settings.moveAndRestart') : t('settings.switchAndRestart'))}
                </Btn>
              </div>
            </div>

          /* === Reset confirmation screen === */
          ) : confirming ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={warnTile}>
                  <ProIcon name="bell" />
                </div>
                <div style={{ flex: 1, fontSize: 15, lineHeight: '22px', color: 'var(--cth-ink-700)' }}>
                  {t('settings.resetConfirm.body', { godName })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Btn onClick={() => setConfirming(false)} disabled={busy}>
                  {t('common.cancel')}
                </Btn>
                <Btn kind="danger" onClick={reset} disabled={busy}>
                  {busy ? t('settings.resetting') : t('settings.eraseEverything')}
                </Btn>
              </div>
            </div>

          /* === Main two-pane settings layout === */
          ) : (
            <>
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

                {/* Left nav. The column and its rows are the chrome's, so PRO
                    gets the kit's rail (a filled active row on a rounded
                    corner) and Classic keeps its pixel list, off one markup.
                    `aria-current` says which section is showing in both. */}
                <nav aria-label={t('settings.title')} style={navColumn}>
                  {NAV_SECTIONS.map((section) => {
                    const active = activeSection === section;
                    return (
                      <button
                        key={section}
                        type="button"
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setActiveSection(section)}
                        style={navRow(active)}
                      >
                        {t(NAV_SECTION_KEYS[section])}
                      </button>
                    );
                  })}
                </nav>

                {/* Right scrollable content pane. minWidth:0 lets this flex child
                    shrink to the row's width instead of growing to its content's
                    min-content (which would push a horizontal scrollbar). */}
                <div style={pane}>

                  {/* GENERAL */}
                  {activeSection === 'General' && (
                    <>
                      {/* Who you are and what this install is — version, plan,
                          sponsor, and the app-level actions that belong to none
                          of the settings below. Slots for a future subscription
                          and a sponsor live here; both render nothing until set. */}
                      <SettingsHeroCard />

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Updates — first among the settings proper, because "am I
                          on the latest?" is the question people open Settings to
                          answer, and the toolbar chip says nothing at all when
                          the answer is yes. */}
                      <UpdatesSection />

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* 0.4.9: what this machine's orchestrator is called to
                          the rest of the team. PRO only, like Prerequisites
                          above: the field is kit drawn, and Classic keeps the
                          orchestrator's name where it has always been, in the
                          agent's own Edit dialog. 0.5.2 put the person's own
                          name directly above it: both are what a teammate's
                          roster shows about this seat. */}
                      {chrome === 'inline' && (
                        <>
                          <NameSection />
                          <BossNameSection />
                          <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />
                        </>
                      )}

                      {/* Home folder */}
                      <div>
                        <div style={sectionHead}>
                          {t('settings.general.homeFolder')}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 13, lineHeight: '20px', alignItems: 'center' }}>
                          <span style={{
                            flex: 1, color: 'var(--cth-ink-900)', wordBreak: 'break-all',
                            fontFamily: 'var(--cth-font-mono, monospace)'
                          }}>{config.harnessHome ?? '—'}</span>
                          <Btn size="sm" onClick={pickNewHome}>{t('settings.change')}</Btn>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Environment — settings that used to be trapped in onboarding */}
                      <div>
                        <div style={sectionHead}>
                          {t('settings.general.environment')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {/* Default view, PRO users only (founder, 6 Sep 2026). A
                              free install never sees the row: for that person
                              PRO is a door, not a place to open in. */}
                          {proUser && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }} data-default-view>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.general.defaultView')}</span>
                                <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                                  {t('settings.general.defaultViewDesc')}
                                </span>
                              </div>
                              <div aria-label={t('settings.general.defaultView')} style={{ display: 'inline-flex', gap: 4, flexShrink: 0 }}>
                                {(['office', 'professional'] as const).map((v) => (
                                  <Btn key={v} kind={defaultView === v ? 'primary' : 'default'} size="sm" onClick={() => chooseDefaultView(v)}>
                                    {v === 'office' ? t('mode.classic') : t('mode.pro')}
                                  </Btn>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.general.keepAwake')}</span>
                              <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                                {t('settings.general.keepAwakeDesc')}
                              </span>
                            </div>
                            <Btn kind={keepAwake ? 'primary' : 'default'} size="sm" onClick={toggleKeepAwake}>
                              {keepAwake ? t('common.on') : t('common.off')}
                            </Btn>
                          </div>
                          <div data-keep-agent-order style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {t('settings.general.keepAgentOrder')}
                              <InfoTip text={t('settings.general.keepAgentOrderInfo')} label={t('settings.general.keepAgentOrder')} />
                            </span>
                            <Btn kind={keepOrder ? 'primary' : 'default'} size="sm" onClick={toggleKeepOrder}>
                              {keepOrder ? t('common.on') : t('common.off')}
                            </Btn>
                          </div>
                          <div data-sidebar-agents-notes-only style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {t('settings.general.sidebarAgentsNotesOnly')}
                              <InfoTip text={t('settings.general.sidebarAgentsNotesOnlyInfo')} label={t('settings.general.sidebarAgentsNotesOnly')} />
                            </span>
                            <Btn kind={bareRail ? 'primary' : 'default'} size="sm" onClick={toggleBareRail}>
                              {bareRail ? t('common.on') : t('common.off')}
                            </Btn>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.general.simpleMode')}</span>
                              <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                                {t('settings.general.simpleModeDesc')}
                              </span>
                            </div>
                            <Btn kind={simpleMode ? 'primary' : 'default'} size="sm" onClick={toggleSimpleMode}>
                              {simpleMode ? t('common.on') : t('common.off')}
                            </Btn>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                                {t('settings.general.arabicTerminal')}
                              </span>
                              <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                                {t('settings.general.arabicTerminalDesc')}
                              </span>
                              {arabicFollowsLanguage && (
                                <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                                  {t('settings.general.arabicTerminalFollowsLanguage')}
                                </span>
                              )}
                            </div>
                            <Btn kind={arabicTerminal ? 'primary' : 'default'} size="sm" onClick={() => {
                                const next = !arabicTerminal;
                                setArabicTerminalEnabled(next);
                                setArabicTerminal(next);
                                setArabicFollowsLanguage(false);
                                // Reach the terminals that are already open, the
                                // same way a language switch does.
                                notifyArabicTerminalChangeAll();
                              }}>
                              {arabicTerminal ? t('common.on') : t('common.off')}
                            </Btn>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Language — app UI language (i18n) */}
                      <div>
                        <div style={sectionHead}>
                          {t('settings.general.language')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.general.language')}</span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.general.languageDesc')}
                            </span>
                          </div>
                          <select
                            value={i18n.language}
                            onChange={(e) => setLanguage(e.target.value)}
                            style={slackInputStyle}
                            aria-label={t('settings.general.language')}
                          >
                            {LANGUAGES.map((l) => (
                              <option key={l.code} value={l.code}>{l.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Desktop notifications toggle */}
                      <div>
                        <div style={sectionHead}>
                          {t('settings.general.notifications')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {t('settings.general.desktopNotifications')}
                            </span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.general.desktopNotificationsDesc')}
                            </span>
                          </div>
                          <Btn kind={notifications ? 'primary' : 'default'} size="sm" onClick={toggleNotifications}>
                            {notifications ? t('common.on') : t('common.off')}
                          </Btn>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Scheduled auto-compact (compact-maintenance mission) */}
                      <div>
                        <div style={sectionHead}>
                          {t('settings.general.maintenance')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {t('settings.general.autoCompact')}
                            </span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.general.autoCompactDesc')}
                            </span>
                          </div>
                          <Btn kind={autoCompactOn ? 'primary' : 'default'} size="sm" onClick={toggleAutoCompact}>
                            {autoCompactOn ? t('common.on') : t('common.off')}
                          </Btn>
                        </div>
                        <div style={{ height: 10 }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {t('settings.general.autoUpdate')}
                            </span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.general.autoUpdateDesc')}
                            </span>
                          </div>
                          <Btn kind={autoUpdateOn ? 'primary' : 'default'} size="sm" onClick={toggleAutoUpdate}>
                            {autoUpdateOn ? t('common.on') : t('common.off')}
                          </Btn>
                        </div>
                        <div style={{ height: 10 }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {t('settings.general.telemetry')}
                            </span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.general.telemetryDesc')}
                            </span>
                          </div>
                          <Btn kind={telemetryOn ? 'primary' : 'default'} size="sm" onClick={toggleTelemetry}>
                            {telemetryOn ? t('common.on') : t('common.off')}
                          </Btn>
                        </div>
                      </div>

                      {/* The Classic / PRO switch lives in the titlebar (ModeSwitch);
                          one writer of the skin, founder ruling 2 Sep 2026. */}

                      {/* Office Theme — TV-show office maps (experimental; flag tvShowOffices, default off) */}
                      <div style={{ height: 18 }} />
                      <OfficeThemePicker config={config} />
                    </>
                  )}

                  {/* AGENTS & MODELS — what powers the office */}
                  {/* PREREQUISITES — the external tools the app leans on and
                      whether this machine has them. It was a Command Center tab,
                      which was the wrong home: it is machine-wide state, not
                      something about the agent whose terminal you are reading. */}
                  {/* PRO (inline chrome) runs the lookup only after Check now
                      (v0.4.9 phase 5a); Classic keeps SetupPanel as it is. */}
                  {activeSection === 'Prerequisites' && (chrome === 'inline' ? <PrerequisitesCheck /> : <SetupPanel onDone={onClose} />)}

                  {activeSection === 'Agents & Models' && (
                    <>
                      <div>
                        <div style={sectionHead}>
                          {t('settings.agentsModels.defaultModel')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                            {t('settings.agentsModels.defaultModelDesc', { godName })}
                          </span>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {agentModels().map((m) => (
                              <button
                                key={m.label}
                                type="button"
                                aria-pressed={defaultModelSel === m.id}
                                onClick={() => { if (m.id) void saveDefaultModel(m.id); }}
                                style={chip(defaultModelSel === m.id)}
                              >{m.label}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      <AiEnginesSettings config={config} />

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Agents & Models is a flat stack: a section, a hairline,
                          the next section. A new section component mounts on the
                          line after this comment and needs nothing else; it draws
                          its own heading with the chrome's sectionHead. */}

                      {/* How every agent is asked to write. It saves itself
                          through updateConfig, so it is deliberately outside the
                          modal's pending and stage machinery. */}
                      <ResponseStyleSection config={config} chrome={chrome} />

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Advanced */}
                      <div>
                        <div style={sectionHead}>
                          {t('settings.agentsModels.advanced')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, color: 'var(--cth-ink-900)' }}>{t('settings.agentsModels.maxTurns')}</span>
                          <input
                            type="number" min="1" step="10" value={maxTurnsVal}
                            onChange={(e) => setMaxTurnsVal(e.target.value)}
                            placeholder={t('settings.agentsModels.unlimited')}
                            style={{ ...slackInputStyle, width: 120 }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.agentsModels.blankUnlimited')}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* AUTONOMY & BUDGETS — the safety tab */}
                  {activeSection === 'Autonomy & Budgets' && (
                    <>
                      <div>
                        <div style={sectionHead}>
                          {t('settings.autonomy.autonomy')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {autoModeOn ? t('settings.autonomy.autoOn') : t('settings.autonomy.autoOff')}
                            </span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.autonomy.autoDesc')}
                            </span>
                          </div>
                          <Btn kind={autoModeOn ? 'primary' : 'default'} size="sm" onClick={toggleAutoMode}>
                            {autoModeOn ? t('settings.autonomy.autonomous') : t('settings.autonomy.askFirst')}
                          </Btn>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)', margin: '12px 0' }} />

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              Who can add agents
                            </span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {orchSpawnOn
                                ? `${godName} can hire on his own. Every agent he starts spends tokens you did not approve.`
                                : `Only you. ${godName} can still ask, and his request waits in the queue instead of failing.`}
                            </span>
                          </div>
                          <Btn kind={orchSpawnOn ? 'primary' : 'default'} size="sm" onClick={toggleOrchSpawn}>
                            {orchSpawnOn ? `me and ${godName}` : 'only me'}
                          </Btn>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Circuit breaker — the FULL unit (v0.3.4: all fields have UI) */}
                      <div>
                        <div style={sectionHead}>
                          {t('settings.autonomy.breaker')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.autonomy.breakerDesc')}
                            </span>
                            <Btn kind={brkEnabled ? 'primary' : 'default'} size="sm" onClick={() => { setBrkEnabled(!brkEnabled); }}>
                              {brkEnabled ? t('common.on') : t('common.off')}
                            </Btn>
                          </div>
                          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, ...slackLabelStyle }}>
                              {t('settings.autonomy.floorBudget')}
                              <input
                                type="number" min="0" step="100000" value={agentBudget}
                                onChange={(e) => setAgentBudget(e.target.value)}
                                placeholder={t('settings.autonomy.budgetPlaceholder')}
                                style={{ ...slackInputStyle, width: 180 }}
                              />
                              <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>
                                {fmtBudgetTokens(agentBudget) ? t('settings.autonomy.budgetEquals', { value: fmtBudgetTokens(agentBudget) }) : t('settings.autonomy.budgetTotal')}
                              </span>
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, ...slackLabelStyle }}>
                              {t('settings.autonomy.velocity')}
                              <input
                                type="number" min="0" step="1000" value={velocityCeiling}
                                onChange={(e) => setVelocityCeiling(e.target.value)}
                                placeholder={t('settings.autonomy.velocityPlaceholder')}
                                style={{ ...slackInputStyle, width: 180 }}
                              />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, ...slackLabelStyle }}>
                              {t('settings.autonomy.repeatedLimit')}
                              <input
                                type="number" min="0" step="5" value={brkRepeated}
                                onChange={(e) => setBrkRepeated(e.target.value)}
                                placeholder={t('settings.autonomy.defaultPlaceholder')}
                                style={{ ...slackInputStyle, width: 140 }}
                              />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, ...slackLabelStyle }}>
                              {t('settings.autonomy.errorStormLimit')}
                              <input
                                type="number" min="0" step="5" value={brkErrStorm}
                                onChange={(e) => setBrkErrStorm(e.target.value)}
                                placeholder={t('settings.autonomy.defaultPlaceholder')}
                                style={{ ...slackInputStyle, width: 140 }}
                              />
                            </label>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.autonomy.hardStop')}</span>
                              <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                                {t('settings.autonomy.hardStopDesc')}
                              </span>
                            </div>
                            <Btn kind={brkHardStop ? 'danger' : 'default'} size="sm" onClick={() => { setBrkHardStop(!brkHardStop); }}>
                              {brkHardStop ? t('settings.autonomy.killOnTrip') : t('settings.autonomy.steerFirst')}
                            </Btn>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Archiving (0.4.9 W-A): the shared files every agent reads on wake stop growing. */}
                      <div>
                        <div style={sectionHead}>
                          {t('settings.autonomy.hygiene')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                            {t('settings.autonomy.hygieneDesc', { godName })}
                          </span>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, ...slackLabelStyle }}>
                            {t('settings.autonomy.ticketPrefix')}
                            <input
                              type="text" maxLength={3} value={ticketPrefix} data-ticket-prefix
                              onChange={(e) => setTicketPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                              onBlur={() => { if (ticketPrefixValid) stage({ ticketPrefix: ticketPrefix || undefined }); }}
                              placeholder={ticketPrefixNow || 'V53'}
                              aria-invalid={!ticketPrefixValid}
                              style={{ ...slackInputStyle, width: 140, fontFamily: 'var(--cth-font-mono)', ...(ticketPrefixValid ? {} : { borderColor: 'var(--cth-coral)' }) }}
                            />
                            <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('settings.autonomy.ticketPrefixHint', { example: `${ticketPrefix.length === 3 && ticketPrefixValid ? ticketPrefix : ticketPrefixNow || 'V53'}-299` })}</span>
                          </label>
                          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            {TASK_HYGIENE_KEYS.map((k) => (
                              <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, ...slackLabelStyle }}>
                                {t(`settings.autonomy.hygieneField.${k}`)}
                                <input
                                  type="number" min="1" step="1" value={hygiene[k]}
                                  onChange={(e) => setHygiene({ ...hygiene, [k]: e.target.value })}
                                  onBlur={() => stage({ taskHygiene: hygienePatch() })}
                                  placeholder={String(TASK_HYGIENE_DEFAULTS[k])}
                                  style={{ ...slackInputStyle, width: 140 }}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* MEMORY & KNOWLEDGE */}
                  {/* DICTATION & MEETINGS (0.5.3, F16): the local recognisers, the model, the key, the words */}
                  {activeSection === 'Dictation & Meetings' && (
                    <TranscribeSettings
                      config={config}
                      groqFields={
                        /* The Groq key and model, directly under the engine list while
                           Groq is picked (founder, 25 Sep), titled GROQ API for Dictation. */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-groq-dictation>
                          <div style={sectionHeadTight}>
                            {t('settings.transcribe.groqTitle')}
                          </div>
                          {/* Groq API key — stored in main config, used only there. */}
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={slackLabelStyle}>{t('settings.voice.groqKey')}</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input
                                type={showGroqKey ? 'text' : 'password'}
                                value={groqKey}
                                onChange={(e) => setGroqKey(e.target.value)}
                                placeholder={t('settings.voice.groqPlaceholder')}
                                aria-label={t('settings.voice.groqKey')}
                                style={{ ...slackInputStyle, fontFamily: 'var(--cth-font-mono)' }}
                              />
                              <Btn size="sm" onClick={() => setShowGroqKey((v) => !v)} disabled={!groqKey}>
                                {showGroqKey ? t('common.hide') : t('common.show')}
                              </Btn>
                            </div>
                          </label>

                          {/* Model picker */}
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 280 }}>
                            <span style={slackLabelStyle}>{t('settings.voice.model')}</span>
                            <select
                              value={freeflowModel}
                              onChange={(e) => setFreeflowModel(e.target.value)}
                              style={{ ...slackInputStyle, fontFamily: 'var(--cth-font-mono)' }}
                            >
                              <option value="whisper-large-v3-turbo">{t('settings.voice.fast')}</option>
                              <option value="whisper-large-v3">{t('settings.voice.accurate')}</option>
                            </select>
                          </label>

                          {draft.hasTask('freeflow') && (
                            <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }} data-freeflow-note>{t('settings.frame.onSave')}</span>
                          )}

                          <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                            {t('settings.voice.freeFlowHint')}
                          </span>
                        </div>
                      }
                    />
                  )}

                  {activeSection === 'Memory & Knowledge' && (
                    <>
                      <div>
                        <div style={sectionHead}>
                          {t('settings.memory.semanticMemory')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.memory.crossSession')}</span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.memory.crossSessionDesc')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            {memState && <span data-testid="memory-state" style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{memState}</span>}
                            <Btn kind={semMemOn ? 'primary' : 'default'} size="sm" onClick={toggleSemMem} disabled={memStatus ? !memStatus.available : false}>
                              {semMemOn ? t('common.on') : t('common.off')}
                            </Btn>
                          </div>
                        </div>
                        {memStatus && !memStatus.available && (
                          <div style={{ marginTop: 8, fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                            {t('memoryPanel.notInstalled')} {t('memoryPanel.plainNotesStill')}
                          </div>
                        )}
                        {memStatus?.available && semMemOn && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('memoryPanel.searchLanguage')}</span>
                              <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>{t('settings.memory.modelDesc')}</span>
                            </div>
                            <select
                              value={embedModel}
                              onChange={(e) => saveEmbedModel(e.target.value === 'embeddinggemma' ? 'embeddinggemma' : 'minilm')}
                              style={{ ...slackInputStyle, width: 220 }}
                              aria-label={t('memoryPanel.searchLanguage')}
                            >
                              <option value="minilm">{t('memoryPanel.modelFast')} · {t('memoryPanel.modelFastDetail')}</option>
                              <option value="embeddinggemma">{t('memoryPanel.modelMultilingual')} · {t('memoryPanel.modelMultilingualDetail')}</option>
                            </select>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.memory.folder')}</span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)', fontFamily: memFolder ? 'var(--cth-font-mono)' : undefined, overflowWrap: 'anywhere' }}>
                              {memFolder ? memFolder.replace(/^\/Users\/[^/]+/, '~') : t('settings.memory.noFolder')}
                            </span>
                          </div>
                          <Btn size="sm" disabled={!memFolder || !memStatus?.initialized} onClick={() => { if (memFolder) void window.cth.revealPath(memFolder); }}>
                            {t('settings.memory.reveal')}
                          </Btn>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Knowledge Graph — enterprise multimodal context for agents */}
                      <div>
                        <div style={sectionHead}>
                          {t('settings.memory.kg')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {t('settings.memory.kgTitle')}
                            </span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.memory.kgDesc')}
                            </span>
                          </div>
                          <Btn kind={kgEnabled ? 'primary' : 'default'} size="sm" onClick={toggleKg}>
                            {kgEnabled ? t('common.on') : t('common.off')}
                          </Btn>
                        </div>
                        {kgEnabled && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                            <Btn size="sm" onClick={addKgFiles} disabled={kgBusy}>
                              {kgBusy ? t('settings.memory.adding') : t('settings.memory.addFiles')}
                            </Btn>
                            <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>
                              {kgDocCount === 1
                                ? t('settings.memory.docCount', { count: kgDocCount })
                                : t('settings.memory.docCountPlural', { count: kgDocCount })}
                            </span>
                            {kgNote && <span style={{ fontSize: 12, color: 'var(--cth-mint)' }}>{kgNote}</span>}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* 0.5.3 redesign slots: each section draws from its own file
                      under ./settings and stages into the page's one draft. */}
                  {activeSection === 'Connections' && <ConnectionsSection config={config} />}
                  {activeSection === 'Keys & Secrets' && <KeysSecretsSection config={config} />}

                  {/* ORCHESTRATOR'S VOICE: only the OpenAI key Talk needs (founder batch 3). */}
                  {activeSection === 'Voice' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-orchestrator-voice>
                      <div style={sectionHeadTight}>
                        {t('settings.voice.title')}
                      </div>
                      <div style={panel}>
                        <span style={sectionHeadFlush}>
                          {t('settings.voice.openaiKey')}
                        </span>
                        <span style={{ fontSize: 12, lineHeight: '17px', color: 'var(--cth-ink-700)' }}>
                          {t('settings.voice.openaiKeyDesc1', { godName, model: REALTIME_MODEL })}
                        </span>
                        <input
                          type="password"
                          autoComplete="off"
                          aria-label={t('settings.voice.openaiKey')}
                          data-voice-key
                          value={openAiVoiceKey}
                          onChange={(e) => typeOpenAiVoiceKey(e.target.value)}
                          placeholder={hasOpenAiKey ? t('settings.voice.keyPlaceholderSaved') : 'sk-…'}
                          style={{ ...slackInputStyle, fontFamily: 'var(--cth-font-mono)' }}
                        />
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 12, lineHeight: '16px',
                          color: hasOpenAiKey ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)'
                        }}>
                          <span aria-hidden style={statusDot(hasOpenAiKey)} />
                          {draft.hasTask(keyTaskId('openai'))
                            ? t('settings.keys.willSave')
                            : hasOpenAiKey ? t('settings.voice.keySaved', { godName }) : t('settings.voice.noKey', { godName })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 0.5.3, feature 24: the worktrees on disk, and a guarded delete. */}
                  {activeSection === 'General' && (
                    <>
                      <WorktreesPanel chrome={chrome} />
                      <div style={sectionRule} />
                    </>
                  )}

                  {/* Danger — a red row at the bottom of General (was its own tab) */}
                  {activeSection === 'General' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={dangerHead}>{t('settings.general.dangerZone')}</div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)' }}>
                        {t('settings.general.dangerDesc', { godName })}
                      </p>
                      <div>
                        <Btn kind="danger" onClick={() => setConfirming(true)}>
                          {t('settings.general.resetStartOver')}
                        </Btn>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Footer */}
              <div style={footer}>
                {saveNote && (
                  <span style={{ fontSize: 12, color: saveBad ? 'var(--cth-coral)' : 'var(--cth-mint)' }} data-save-note={saveBad ? 'bad' : 'ok'}>{saveNote}</span>
                )}
                {dirty && !saveNote && (
                  <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.unsavedChanges')}</span>
                )}
                <Btn onClick={requestClose}>{t('settings.close')}</Btn>
                <Btn kind="primary" onClick={() => void saveAll()} disabled={saveBusy || !dirty}>
                  {saveBusy ? t('settings.saving') : t('common.save')}
                </Btn>
              </div>
            </>
          )}
    </SettingsFrameProvider>
  );

  if (chrome === 'inline') {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {body}
      </div>
    );
  }

  return (
    <div
      onClick={busy ? undefined : onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26, 19, 32, 0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 840, maxWidth: '92vw', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          filter: 'drop-shadow(4px 4px 0 rgba(26, 19, 32, 0.25))'
        }}
      >
        <Panel title={modalTitle} noPadding style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '88vh' }}>
          {body}
        </Panel>
      </div>
    </div>
  );
}

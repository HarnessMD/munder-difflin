import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { agentModels, type HarnessConfig } from '@/store/config';
import { useStore } from '@/store/store';
import { UpdatesSection } from './UpdatesSection';
import { WorktreesPanel } from './WorktreesPanel';
import { SetupPanel } from './SetupPanel';
import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { Icon } from './Icon';
import { useIntegrityIssues } from './integrityIssues';
import { GraphicsSetting } from './GraphicsSetting';
import { CodexFoldersSection } from './CodexFoldersSection';
import { CodexMemorySwitches } from './settings/CodexMemorySwitches';
import { ResponseStyleSection } from './ResponseStyleSection';
import { AiEnginesSettings } from './AiEnginesSettings';
import { REALTIME_MODEL } from '@shared/realtimePricing';
import {
  isArabicTerminalEnabled,
  isArabicTerminalFollowingLanguage,
  setArabicTerminalEnabled
} from '@/terminal/arabicSetting';
import { notifyArabicTerminalChangeAll } from '@/components/terminalPool';
import { OFFERED_LANGUAGES, setLanguage } from '@/i18n';
import { TASK_HYGIENE_DEFAULTS, TASK_HYGIENE_KEYS, resolveTaskHygiene, type TaskHygieneConfig, type TaskHygieneKey } from '@shared/taskHygiene';
import { settingsKit } from './settings/classicChrome';
import { createSettingsDraft } from './settings/draftStore';
import { InfoTip, SettingsFrameProvider } from './settings/SettingsFrame';
import { IntegrationsScreen } from './integrations/IntegrationsScreen';
import { guardedLeave } from './settings/leaveGuard';
import { editFor, keyTask, keyTaskId, type KeyBroker } from './settings/providerKeys';
import { RealtimeDevicePicker } from '@/realtime/DevicePicker';
import { McpDefaultsSettings } from './McpDefaultsSettings';
import { AgentMcpGrants } from './AgentMcpGrants';

export interface SettingsModalProps {
  config: HarnessConfig;
  onClose: () => void;
  /** Open straight to a section instead of General. Used by deep links from
   *  elsewhere in the UI — "set it now" beside a disabled Talk button lands on
   *  the tab that actually holds the field, rather than making the user hunt. */
  initialSection?: Section;
}

/** The write only broker, for the OpenAI key on Orchestrator's voice. */
const openAiBroker: KeyBroker = {
  set: (backend, key) => window.cth.providerKeySet({ backend, key }),
  clear: (backend) => window.cth.providerKeyClear(backend)
};

/** Clear every renderer-side persisted key so a relaunch starts truly empty. */
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

// One topic per tab. 'AI Engines' folded into Agents & Models; Slack,
// webhooks, service connections and keys live in Integrations; MCP servers,
// the floor's defaults and each agent's grants, have their own tab; voice
// gets its own tab; Danger Zone is a red row at the bottom of General.
/* The section heading, the rule between sections, the inputs, the nav and the
   footer are all DEFINED ONCE, in settings/classicChrome.ts, so no tab looks
   subtly unlike its neighbours. */

export type Section = 'General' | 'Prerequisites' | 'Agents & Models' | 'Autonomy & Budgets' | 'Integrations' | 'MCP Servers' | 'Voice' | 'Memory & Knowledge';
/* Integrations is ONE section of Settings: the Integrations screen, with its
   own draft and its own Save. */
const NAV_SECTIONS: Section[] = ['General', 'Prerequisites', 'Agents & Models', 'Autonomy & Budgets', 'Integrations', 'MCP Servers', 'Voice', 'Memory & Knowledge'];
/** i18n key for each nav section's label — the Section values themselves stay
 *  as stable identifiers (tab state, deep links). */
const NAV_SECTION_KEYS: Record<Section, string> = {
  'General': 'settings.nav.general',
  'Prerequisites': 'settings.nav.prerequisites',
  'Agents & Models': 'settings.nav.agentsModels',
  'Autonomy & Budgets': 'settings.nav.autonomyBudgets',
  'Integrations': 'integrations.screen.title',
  'MCP Servers': 'settings.nav.mcpServers',
  'Voice': 'settings.nav.voice',
  'Memory & Knowledge': 'settings.nav.memoryKnowledge'
};

export function SettingsModal({ config, onClose, initialSection }: SettingsModalProps) {
  /* Every style below is read off the one Settings kit, destructured under
     the names the markup already used. */
  const {
    sectionHead, sectionHeadTight, sectionHeadFlush, rule: sectionRule,
    input: slackInputStyle, label: slackLabelStyle,
    navColumn, navRow, pane, footer, panel, optionCard, chip,
    statusDot, warnTile, dangerHead, errorText
  } = settingsKit;
  const { t, i18n } = useTranslation();
  const godName = useStore((s) => s.agents.find((a) => a.isGod)?.name) ?? 'the orchestrator';
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>(initialSection && NAV_SECTIONS.includes(initialSection) ? initialSection : 'General');
  /** The one draft every section file stages into (settings/draftStore.ts). */
  const [draft] = useState(createSettingsDraft);
  useSyncExternalStore(draft.subscribe, draft.version);

  // Change-home flow: null until the user picks a new folder, then the sub-modal
  // confirms move-vs-fresh. Pre-selects 'move' (recommended - keeps the data).
  const [changeHome, setChangeHome] = useState<string | null>(null);
  const [changeMode, setChangeMode] = useState<'move' | 'fresh'>('move');
  /** config.json does not read: main has paused writes to it, so Save says why it waits (P7). */
  const settingsPaused = useIntegrityIssues().some((i) => (i.file.split(/[\\/]/).pop() ?? i.file) === 'config.json');
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
   * API keys stay immediate, on purpose: they go to the write-only secret
   * broker, and nothing can read one back to diff it, so there is no staged
   * value to hold. Slack and webhooks keep their own controls too: those connect and
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

  const [idleMinutes, setIdleMinutes] = useState(config.agentIdleMinutes ?? 60);
  // How long an idle voice session stays open before it closes; the spend cap stays the runaway guard.
  const [idleDisconnectMs, setIdleDisconnectMs] = useState<number>(config.realtimeIdleDisconnectMs ?? 180_000);
  const [keepAwake, setKeepAwake] = useState<boolean>(cfgX.strongKeepalive === true);
  const toggleKeepAwake = async () => {
    const next = !keepAwake;
    setKeepAwake(next);
    stage({ strongKeepalive: next } as Partial<HarnessConfig>);
  };
  // Skip the launch picker (#605, issue #595): default OFF, on the same draft,
  // so it takes effect on Save.
  const openLastHiveSaved = cfgX.openLastHiveOnLaunch === true;
  const openLastHive = draft.value<boolean>('openLastHiveOnLaunch', openLastHiveSaved);
  const toggleOpenLastHive = () => {
    const next = !openLastHive;
    if (next === openLastHiveSaved) draft.unstage(['openLastHiveOnLaunch']);
    else draft.stage({ openLastHiveOnLaunch: next });
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
  // Lasting agents have their own switch (god's call 1): default OFF, so `=== true`.
  const [orchLastingOn, setOrchLastingOn] = useState<boolean>(cfgX.orchestratorMayAddLasting === true);
  const toggleOrchLasting = async () => {
    const next = !orchLastingOn;
    setOrchLastingOn(next);
    stage({ orchestratorMayAddLasting: next } as Partial<HarnessConfig>);
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
  // The engine's model, its state and the index folder live HERE and nowhere else.
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
  // Drives Jim's real breaker: the output token velocity ceiling
  // (circuitBreaker.tokenVelocityPerMin) and the breaker's own switches. The
  // floor token budget (costCapTokens) was removed on 16 Oct 2026: the token
  // limits per period are the budget, set on the orchestrator's Budget and
  // breaker tab and in each agent's side panel.
  type BreakerCfgView = HarnessConfig & {
    circuitBreaker?: { tokenVelocityPerMin?: number; enabled?: boolean; hardStop?: boolean; repeatedToolLimit?: number; errorStormLimit?: number };
  };
  const breakerCfg = config as BreakerCfgView;
  const [velocityCeiling, setVelocityCeiling] = useState(breakerCfg.circuitBreaker?.tokenVelocityPerMin != null ? String(breakerCfg.circuitBreaker.tokenVelocityPerMin) : '');
  // v0.3.4: the four previously UI-less breaker fields get controls.
  const [brkEnabled, setBrkEnabled] = useState<boolean>(breakerCfg.circuitBreaker?.enabled !== false);
  const [brkHardStop, setBrkHardStop] = useState<boolean>(breakerCfg.circuitBreaker?.hardStop === true);
  const [brkRepeated, setBrkRepeated] = useState(breakerCfg.circuitBreaker?.repeatedToolLimit != null ? String(breakerCfg.circuitBreaker.repeatedToolLimit) : '');
  const [brkErrStorm, setBrkErrStorm] = useState(breakerCfg.circuitBreaker?.errorStormLimit != null ? String(breakerCfg.circuitBreaker.errorStormLimit) : '');
  const budgetPatch = (): Partial<HarnessConfig> => {
    const vel = velocityCeiling.trim() === '' ? undefined : Number(velocityCeiling);
    const rep = brkRepeated.trim() === '' ? undefined : Number(brkRepeated);
    const storm = brkErrStorm.trim() === '' ? undefined : Number(brkErrStorm);
    return {
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
        // The context trigger's compact half, saved the way Automations saves it (triggers:setContext re-arms
        // its timer). Read first, so the rest of the rule is what is stored now, not this window's copy.
        const trigger = await window.cth.getContextTrigger();
        await window.cth.setContextTrigger({ ...trigger, compact: { ...trigger.compact, enabled: autoCompactPending } });
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
    // Integrations holds its own draft and asks about it first (leaveGuard).
    guardedLeave(() => {
      if (dirty && !window.confirm(t('settings.unsavedWarning'))) return;
      draft.reset();
      onClose();
    });
  };

  const ticketPrefixField = (
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
  );

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

  // ─── Scheduled auto-compact — the context trigger's compact half (contextTrigger.compact.enabled).
  // The compact-maintenance mission is retired into it at every start (main/index.ts, maint-1), so the
  // trigger is the single source of truth: Automations edits the same field, and this is a General-section
  // shortcut to it. On by default (DEFAULT_CONTEXT_TRIGGER, shared/triggers.ts).
  const [autoCompactOn, setAutoCompactOn] = useState<boolean>(config.contextTrigger?.compact?.enabled === true);
  const toggleAutoCompact = async () => {
    const next = !autoCompactOn;
    setAutoCompactOn(next);
    setAutoCompactPending(next);
  };

  // ─── Update notice (default ON; gates main's updater checks entirely) ──────
  const [autoUpdateOn, setAutoUpdateOn] = useState<boolean>(config.autoUpdate !== false);
  const toggleAutoUpdate = async () => {
    const next = !autoUpdateOn;
    setAutoUpdateOn(next);
    try { stage({ autoUpdate: next }); }
    catch { setAutoUpdateOn(!next); }
  };

  // ─── Anonymous usage stats (opt out; the contract is TELEMETRY.md) ─────────
  const [telemetryOn, setTelemetryOn] = useState<boolean>(config.telemetryEnabled !== false);
  const toggleTelemetry = (): void => {
    const next = !telemetryOn;
    setTelemetryOn(next);
    stage({ telemetryEnabled: next });
  };

  // ORCHESTRATOR'S VOICE (founder batch 3): the section is only the OpenAI key
  // Talk needs. The key is the same broker slot the OpenAI key of Integrations
  // writes (apikey:openai) through the same task (key:openai); the footer Save
  // stores it.
  const hasOpenAiKey = useStore((s) => s.hasOpenAiKey);
  const setHasOpenAiKey = useStore((s) => s.setHasOpenAiKey);
  const [openAiVoiceKey, setOpenAiVoiceKey] = useState('');
  const typeOpenAiVoiceKey = (text: string): void => {
    setOpenAiVoiceKey(text);
    const edit = editFor(text);
    draft.setTask(keyTaskId('openai'), edit ? keyTask('openai', edit, openAiBroker, (has) => { setHasOpenAiKey(has); setOpenAiVoiceKey(''); }) : null);
  };


  // Re-seed every editable field from the on-disk config when the modal opens.
  // App's `config` prop is loaded once and never refreshed after a save, so
  // without this the saved budget / velocity / slack values show blank on reopen.
  useEffect(() => {
    let alive = true;
    window.cth.getConfig().then((c) => {
      if (!alive) return;
      const cc = c as BreakerCfgView;
      setVelocityCeiling(cc.circuitBreaker?.tokenVelocityPerMin != null ? String(cc.circuitBreaker.tokenVelocityPerMin) : '');
      const kgOn = (cc as { knowledgeGraph?: { enabled?: boolean } }).knowledgeGraph?.enabled === true;
      setKgEnabled(kgOn);
    }).catch(() => { /* keep prop-seeded values */ });
    window.cth.kgStatus().then((s) => { if (alive) setKgDocCount(s.docCount); })
      .catch(() => { /* status unavailable */ });
    return () => { alive = false; };
  }, []);


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
    try {
      if (changeMode === 'fresh') clearLocalState();
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
    <SettingsFrameProvider draft={draft}>
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
                <PixelButton variant="secondary" onClick={() => { setChangeHome(null); setChangeErr(''); }} disabled={changeBusy}>
                  {t('common.cancel')}
                </PixelButton>
                <PixelButton variant="primary" onClick={applyChangeHome} disabled={changeBusy}>
                  {changeBusy ? t('settings.apply') : (changeMode === 'move' ? t('settings.moveAndRestart') : t('settings.switchAndRestart'))}
                </PixelButton>
              </div>
            </div>

          /* === Reset confirmation screen === */
          ) : confirming ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={warnTile}>
                  <Icon name="bell" />
                </div>
                <div style={{ flex: 1, fontSize: 15, lineHeight: '22px', color: 'var(--cth-ink-700)' }}>
                  {t('settings.resetConfirm.body', { godName })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <PixelButton variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
                  {t('common.cancel')}
                </PixelButton>
                <PixelButton variant="destructive" onClick={reset} disabled={busy}>
                  {busy ? t('settings.resetting') : t('settings.eraseEverything')}
                </PixelButton>
              </div>
            </div>

          /* === Main two-pane settings layout === */
          ) : (
            <>
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

                {/* Left nav. `aria-current` says which section is showing. */}
                <nav aria-label={t('settings.title')} style={navColumn}>
                  {NAV_SECTIONS.map((section) => {
                    const active = activeSection === section;
                    return (
                      <button
                        key={section}
                        type="button"
                        aria-current={active ? 'page' : undefined}
                        onClick={() => { if (section !== activeSection) guardedLeave(() => setActiveSection(section)); }}
                        style={navRow(active)}
                      >
                        {section === 'MCP Servers' ? t(NAV_SECTION_KEYS[section], 'MCP SERVERS') : t(NAV_SECTION_KEYS[section])}
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
                      {/* Updates — first among the settings proper, because "am I
                          on the latest?" is the question people open Settings to
                          answer, and the toolbar chip says nothing at all when
                          the answer is yes. */}
                      <UpdatesSection />

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

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
                          <PixelButton variant="secondary" size="sm" onClick={pickNewHome}>{t('settings.change')}</PixelButton>
                        </div>
                        <div data-open-last-hive style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.general.openLastHive')}</span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.general.openLastHiveDesc')}
                            </span>
                          </div>
                          <PixelButton variant={openLastHive ? 'primary' : 'secondary'} size="sm" onClick={toggleOpenLastHive}>
                            {openLastHive ? t('common.on') : t('common.off')}
                          </PixelButton>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Environment — settings that used to be trapped in onboarding */}
                      <div>
                        <div style={sectionHead}>
                          {t('settings.general.environment')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.general.keepAwake')}</span>
                              <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                                {t('settings.general.keepAwakeDesc')}
                              </span>
                            </div>
                            <PixelButton variant={keepAwake ? 'primary' : 'secondary'} size="sm" onClick={toggleKeepAwake}>
                              {keepAwake ? t('common.on') : t('common.off')}
                            </PixelButton>
                          </div>
                          <label style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            Sleep agents after inactivity (minutes)
                            <input aria-label="Agent sleep timeout in minutes" type="number" min={1} step={1} value={idleMinutes}
                              onChange={(e) => { const value = Number(e.target.value); if (Number.isFinite(value) && value >= 1) { setIdleMinutes(value); stage({ agentIdleMinutes: value }); } }} />
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.general.simpleMode')}</span>
                              <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                                {t('settings.general.simpleModeDesc')}
                              </span>
                            </div>
                            <PixelButton variant={simpleMode ? 'primary' : 'secondary'} size="sm" onClick={toggleSimpleMode}>
                              {simpleMode ? t('common.on') : t('common.off')}
                            </PixelButton>
                          </div>
                          {/* Graphics: Auto, GPU or CPU only, from the next start. */}
                          <GraphicsSetting />
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
                            <PixelButton variant={arabicTerminal ? 'primary' : 'secondary'} size="sm" onClick={() => {
                                const next = !arabicTerminal;
                                setArabicTerminalEnabled(next);
                                setArabicTerminal(next);
                                setArabicFollowsLanguage(false);
                                // Reach the terminals that are already open, the
                                // same way a language switch does.
                                notifyArabicTerminalChangeAll();
                              }}>
                              {arabicTerminal ? t('common.on') : t('common.off')}
                            </PixelButton>
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
                            {OFFERED_LANGUAGES.map((l) => (
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
                          <PixelButton variant={notifications ? 'primary' : 'secondary'} size="sm" onClick={toggleNotifications}>
                            {notifications ? t('common.on') : t('common.off')}
                          </PixelButton>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)' }} />

                      {/* Scheduled auto-compact (the context trigger's compact half) */}
                      <div>
                        <div style={sectionHead}>
                          {t('settings.general.maintenance')}
                        </div>
                        <div data-auto-compact style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {t('settings.general.autoCompact')}
                            </span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.general.autoCompactDesc')}
                            </span>
                          </div>
                          <PixelButton variant={autoCompactOn ? 'primary' : 'secondary'} size="sm" onClick={toggleAutoCompact}>
                            {autoCompactOn ? t('common.on') : t('common.off')}
                          </PixelButton>
                        </div>
                        <div style={{ height: 10 }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {t('settings.general.updateNotice', { defaultValue: 'Update notices' })}
                            </span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.general.updateNoticeDesc', {
                                defaultValue: 'Check GitHub releases every 6 hours and say when a newer version is out. Nothing is downloaded or installed.'
                              })}
                            </span>
                          </div>
                          <PixelButton variant={autoUpdateOn ? 'primary' : 'secondary'} size="sm" onClick={toggleAutoUpdate}>
                            {autoUpdateOn ? t('common.on') : t('common.off')}
                          </PixelButton>
                        </div>
                        <div style={{ height: 10 }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {t('settings.general.telemetry')}
                            </span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {t('settings.general.telemetryDesc', 'A few anonymous events (app opened, agent spawned, feature used) that help improve Munder Difflin. Never prompts, code, file paths or agent output. The full list is in TELEMETRY.md.')}
                            </span>
                          </div>
                          <PixelButton variant={telemetryOn ? 'primary' : 'secondary'} size="sm" onClick={toggleTelemetry}>
                            {telemetryOn ? t('common.on') : t('common.off')}
                          </PixelButton>
                        </div>
                      </div>
                    </>
                  )}

                  {/* AGENTS & MODELS — what powers the office */}
                  {/* PREREQUISITES — the external tools the app leans on and
                      whether this machine has them. It was a Command Center tab,
                      which was the wrong home: it is machine-wide state, not
                      something about the agent whose terminal you are reading. */}
                  {activeSection === 'Prerequisites' && <SetupPanel onDone={onClose} />}

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
                          its own heading with the kit's sectionHead. */}

                      {/* How every agent is asked to write. It saves itself
                          through updateConfig, so it is deliberately outside the
                          modal's pending and stage machinery. */}
                      <ResponseStyleSection config={config} />

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
                      {/* The project Codex folders allowed so far, with withdraw. */}
                      <div style={{ height: 18 }} />
                      <CodexFoldersSection />
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
                          <PixelButton variant={autoModeOn ? 'primary' : 'secondary'} size="sm" onClick={toggleAutoMode}>
                            {autoModeOn ? t('settings.autonomy.autonomous') : t('settings.autonomy.askFirst')}
                          </PixelButton>
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
                          <PixelButton variant={orchSpawnOn ? 'primary' : 'secondary'} size="sm" onClick={toggleOrchSpawn}>
                            {orchSpawnOn ? `me and ${godName}` : 'only me'}
                          </PixelButton>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'var(--cth-ink-300)', margin: '12px 0' }} />

                      {/* Lasting agents: their own switch, off until the person turns it on. */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                              {t('settings.autonomy.lasting', { god: godName })}
                            </span>
                            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                              {orchLastingOn ? t('settings.autonomy.lastingOn', { god: godName }) : t('settings.autonomy.lastingOff', { god: godName })}
                            </span>
                          </div>
                          <PixelButton variant={orchLastingOn ? 'primary' : 'secondary'} size="sm" onClick={toggleOrchLasting}>
                            {orchLastingOn ? t('settings.autonomy.lastingYes', { god: godName }) : t('settings.autonomy.lastingNo')}
                          </PixelButton>
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
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                                {t('settings.autonomy.breakerDesc')}
                              </span>
                            </span>
                            <PixelButton variant={brkEnabled ? 'primary' : 'secondary'} size="sm" onClick={() => { setBrkEnabled(!brkEnabled); }}>
                              {brkEnabled ? t('common.on') : t('common.off')}
                            </PixelButton>
                          </div>
                          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
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
                            <PixelButton variant={brkHardStop ? 'destructive' : 'secondary'} size="sm" onClick={() => { setBrkHardStop(!brkHardStop); }}>
                              {brkHardStop ? t('settings.autonomy.killOnTrip') : t('settings.autonomy.steerFirst')}
                            </PixelButton>
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
                          {ticketPrefixField}
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
                            <PixelButton variant={semMemOn ? 'primary' : 'secondary'} size="sm" onClick={toggleSemMem} disabled={memStatus ? !memStatus.available : false}>
                              {semMemOn ? t('common.on') : t('common.off')}
                            </PixelButton>
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
                          <PixelButton variant="secondary" size="sm" disabled={!memFolder || !memStatus?.initialized} onClick={() => { if (memFolder) void window.cth.revealPath(memFolder); }}>
                            {t('settings.memory.reveal')}
                          </PixelButton>
                        </div>
                        <CodexMemorySwitches config={config} />
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
                          <PixelButton variant={kgEnabled ? 'primary' : 'secondary'} size="sm" onClick={toggleKg}>
                            {kgEnabled ? t('common.on') : t('common.off')}
                          </PixelButton>
                        </div>
                        {kgEnabled && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                            <PixelButton variant="secondary" size="sm" onClick={addKgFiles} disabled={kgBusy}>
                              {kgBusy ? t('settings.memory.adding') : t('settings.memory.addFiles')}
                            </PixelButton>
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

                  {/* Integrations keeps its own draft and its own Save. */}
                  {activeSection === 'Integrations' && <IntegrationsScreen config={config} />}
                  {/* MCP servers: the floor's defaults, then each agent's own grants. */}
                  {activeSection === 'MCP Servers' && (
                    <>
                      <McpDefaultsSettings config={config} />
                      <div style={sectionRule} />
                      <AgentMcpGrants config={config} />
                    </>
                  )}
                  {/* Builds from source only: no row in a packaged app's nav, and no page behind a deep link either. */}

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
                      <RealtimeDevicePicker />
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 280 }}>
                        <span style={slackLabelStyle}>{t('settings.voice.idleDisconnect')}</span>
                        <select
                          value={String(idleDisconnectMs)}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setIdleDisconnectMs(v);
                            stage({ realtimeIdleDisconnectMs: v });
                          }}
                          style={{ ...slackInputStyle, fontFamily: 'var(--cth-font-mono)' }}
                        >
                          <option value="30000">{t('settings.voice.30s')}</option>
                          <option value="60000">{t('settings.voice.1m')}</option>
                          <option value="120000">{t('settings.voice.2m')}</option>
                          <option value="180000">{t('settings.voice.3m')}</option>
                          <option value="300000">{t('settings.voice.5m')}</option>
                          <option value="600000">{t('settings.voice.10m')}</option>
                          <option value="0">{t('settings.voice.never')}</option>
                        </select>
                        <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                          {t('settings.voice.idleDisconnectDesc')}
                        </span>
                      </label>
                    </div>
                  )}

                  {/* 0.5.3, feature 24: the worktrees on disk, and a guarded delete. */}
                  {activeSection === 'General' && (
                    <>
                      <WorktreesPanel />
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
                        <PixelButton variant="destructive" onClick={() => setConfirming(true)}>
                          {t('settings.general.resetStartOver')}
                        </PixelButton>
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
                {settingsPaused ? (
                  <span style={{ fontSize: 12, color: 'var(--cth-ink-700)' }} data-save-blocked>{t('integrity.saveBlocked')}</span>
                ) : dirty && !saveNote && (
                  <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.unsavedChanges')}</span>
                )}
                <PixelButton variant="secondary" onClick={requestClose}>{t('settings.close')}</PixelButton>
                {/* Integrations has its own Save in its pane: one Save in view. */}
                {activeSection !== 'Integrations' && (
                  <PixelButton variant="primary" onClick={() => void saveAll()} disabled={saveBusy || !dirty || settingsPaused}>
                    {saveBusy ? t('settings.saving') : t('settings.save')}
                  </PixelButton>
                )}
              </div>
            </>
          )}
    </SettingsFrameProvider>
  );

  return (
    <div
      onClick={busy ? undefined : () => guardedLeave(onClose)}
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
          width: activeSection === 'Integrations' ? 1120 : 840, maxWidth: '92vw', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          filter: 'drop-shadow(4px 4px 0 rgba(26, 19, 32, 0.25))'
        }}
      >
        <PixelPanel variant="dialog" title={modalTitle} noPadding style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '88vh' }}>
          {body}
        </PixelPanel>
      </div>
    </div>
  );
}

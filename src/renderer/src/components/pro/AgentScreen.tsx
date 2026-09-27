/**
 * ONE AGENT (v0.4.9 phase 2, decision D10): the bar with the controls, two
 * tabs (Inbox, Terminal), the composer, and the details panel on the right
 * that folds (the panel button, or ⌘.). Git, Messages and Traces left this
 * screen: Git lives in the IDE, messages in the Inbox tab, traces in Temps
 * and the technical Inbox lines. Prototype of record: `viewAgent()` in
 * hive/shared/design/app-v2/prototype.html (v4).
 *
 * The orchestrator has his own screen (GodScreen, phase 3); this file routes
 * him there once it lands and, until then, draws the same frame without the
 * control cluster (the leash is Michael's Budget & breaker tab, not a button).
 *
 * WHAT WRITES WHERE, so nothing here is a second way to change one fact:
 *   Pause tools / resume     window.cth.controlPause / controlResume
 *   Stop after this step     window.cth.controlHalt to arm, controlUnhalt to
 *                            cancel. The control is a toggle (founder round 2,
 *                            item 5): while armed it draws pressed, and the
 *                            second click lets the agent keep going.
 *   1:1                      window.cth.hiveSetAgentHold (the orchestrator
 *                            holds deliveries while you have the agent)
 *   Stop                     killPty + disposeTerminal + store.archiveAgent,
 *                            after a confirm (the Classic panel's exact steps)
 *   IDE                      store.setIdeOpen
 *   name                     store.renameAgent   (commit on blur, Draft)
 *   role, goal               store.updateAgent
 *   engine                   the ENGINE selects write store.updateAgent
 *                            (provider, model, command), the exact patch the
 *                            agent sheet's edit save sends, applied on the
 *                            next start. Restart now is killPty + spawnPty
 *                            into the SAME pty id (the Command Center's
 *                            restart steps), resuming the recorded session
 *                            when the provider still matches it. The full
 *                            form stays openAgentSheet edit.
 *   token cap                window.cth.setAgentTokenCap. READ back through
 *                            shared/agentCard.readAgentTokenCap (0.4.9 phase
 *                            7.3): the field holds this agent's own cap and
 *                            says "Not set" when it has none, and a row under
 *                            it names the cap actually in force, which may be
 *                            the workspace default or nothing at all. A zero
 *                            on disk is not a cap, because the breaker will
 *                            not enforce one.
 *   compact context          enqueueMessage('/compact'): the same queued
 *                            command the auto compact mission uses
 *   archive                  store.archiveAgent, after a confirm
 * The terminal stays mounted under the Inbox tab (hidden, not unmounted), so
 * the pty parser keeps feeding the store while a person reads the thread.
 */
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { markAgentOpened } from './railData';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import { AGENT_PROVIDER_PRESETS, type AgentProvider, buildSpawnCommand, type HarnessConfig, inferAgentProvider, isClaudeProvider, modelsForProvider, modelWord, providerPreset, tokenizeCommand } from '@/store/config';
import { usePtyParser } from '@/hooks/usePtyParser';
import { MCP_CATALOG } from '@shared/mcpCatalog';
import { mcpEnabledFor } from '@shared/agentMcp';
import { readAgentTokenCap, tokenCapFieldText } from '@shared/agentCard';
import { roleForHiveSpawn } from '@shared/agentRole';
import { planAgentRestart } from '@shared/agentRestart';
import { ageWord } from '@shared/railSeen';
import { CommandField } from './CommandField';
import { PtyTerminalView } from '../PtyTerminalView';
import { CliMissingCard } from '../CliMissingCard';
import { useCliMissing, useCliSetup } from '../terminalPool';
import { composerHoldKey } from '@shared/cliSetup';
import { CliSetupPanel } from './CliSetupPanel';
import { terminalInstanceKey } from '../terminalRecovery';
import { acquireTerminal, disposeTerminal, resetTerminal } from '../terminalPool';
import { usePaneNav } from '../professional/paneNav';
import { ProIcon } from './icons';
import { CHORD_HINT, proChordFor } from './proKeys';
import { Btn, Chip, ConfirmDialog, Draft, Field, IconBtn, Kv, Meter, SectionH, SelectBox, StatusChip, Tabs, fmtK, proToast, usd } from './ui';
import { SpritePortrait } from '../SpritePortrait';
import { useTechnical } from './depth';
import { openAgentSheet } from './agentSheetStore';
import { openBundleSheet } from './bundleSheetStore';
import { useTaskLedger } from './taskData';
import { AskMeBell } from './AskMeBell';
import { ticketFor } from './AgentsScreen';
import { describeEntry, useAgentActivity } from './activityData';
import { AgentInbox } from './AgentInbox';
import { AgentTasks } from './AgentTasks';
import { agentTasks } from './agentTaskRules';
import { Composer } from './Composer';

type AgentControlSnapshot = NonNullable<Awaited<ReturnType<typeof window.cth.controlSnapshot>>>;

const LS_KEY = 'cth.proConfigOpen';
let open = (() => { try { return window.localStorage.getItem(LS_KEY) !== '0'; } catch { return true; } })();
const subs = new Set<() => void>();
export function setConfigOpen(next: boolean): void {
  if (next === open) return;
  open = next;
  try { window.localStorage.setItem(LS_KEY, next ? '1' : '0'); } catch { /* noop */ }
  subs.forEach((fn) => fn());
}
export function toggleConfigOpen(): void { setConfigOpen(!open); }
function useConfigOpen(): boolean {
  return useSyncExternalStore((fn) => { subs.add(fn); return () => subs.delete(fn); }, () => open);
}

export const CONFIG_PANEL_WIDTH = 340;
type Tab = 'inbox' | 'tasks' | 'terminal';

export function AgentScreen({ agent, config }: { agent: Agent; config: HarnessConfig | null }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const nav = usePaneNav();
  const isOpen = useConfigOpen();
  // Terminal first for everyone (founder round 2, item 4a): opening an agent
  // shows the live session, and the Inbox is one click away in both renderings.
  const [tab, setTab] = useState<Tab>('terminal');
  const cliMissing = useCliMissing(agent.ptyId);
  const cliSetup = useCliSetup(agent.ptyId);
  const [stopAsk, setStopAsk] = useState(false);
  const archiveAgent = useStore((s) => s.archiveAgent);
  const setIdeOpen = useStore((s) => s.setIdeOpen);
  const updateAgent = useStore((s) => s.updateAgent);
  const onPtyStream = usePtyParser(agent.id);
  // The Tasks tab (founder on rc.4): this agent's cards, counted in the tab.
  const { tasks: ledger } = useTaskLedger();
  const myTasks = useMemo(() => (ledger ? agentTasks(ledger, agent) : null), [ledger, agent.id, agent.name]); // eslint-disable-line react-hooks/exhaustive-deps
  // 0.5.3, F25: opening this screen is what clears the rail's badge and its
  // Finished strip for this agent, whichever door led here.
  useEffect(() => { markAgentOpened(agent.id, agent.name); }, [agent.id, agent.name]);
  // A stopped agent is restarted from the details panel only (founder, 24 Sep:
  // not from the left rail), so opening one, or one dying while open, shows it.
  useEffect(() => { if (agent.exit) setConfigOpen(true); }, [agent.id, agent.exit?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (proChordFor(e) === 'agentConfig') { e.preventDefault(); toggleConfigOpen(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sub = technical ? [agent.model ?? agent.provider, agent.provider && agent.model ? agent.provider : null].filter(Boolean).join(' · ') : firstSentence(agent.description);

  const stop = async () => {
    setStopAsk(false);
    if (!agent.ptyId) return;
    await window.cth.killPty(agent.ptyId);
    disposeTerminal(agent.ptyId);
    archiveAgent(agent.id);
    proToast(t('pro.room.stopped', { name: agent.name }));
    nav.go('agents');
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)' }}>
      {/* The same bar as the orchestrator's screen (GodScreen): the bare
          sprite at native art size in a 40 box, in the standard 52 bar. The
          2x face in a 64 bar (pilot item 15) was called too big for this bar
          on the god screen on 5 Sep 2026 and here on 7 Sep 2026 (founder:
          "it should be the same as the orchestrator"). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 18px', borderBottom: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)', flexShrink: 0 }}>
        <SpritePortrait character={agent.character} size={40} />
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>{agent.name}</h1>
        <StatusChip status={agent.status} raw={agent.action} />
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{sub}</span>
        <span style={{ flex: 1 }} />
        <AskMeBell agent={agent} />
        {!agent.isGod && <Controls agent={agent} />}
        {!agent.isGod && <Btn kind="danger" size="sm" onClick={() => setStopAsk(true)} disabled={!agent.ptyId}>{t('pro.room.stop')}</Btn>}
        <Btn size="sm" title={`${t('pro.room.ide')} ${CHORD_HINT.ide}`} onClick={() => setIdeOpen(true, agent.id)}>{t('pro.room.ide')}</Btn>
        <IconBtn name="panel" active={isOpen} onClick={toggleConfigOpen} title={`${isOpen ? t('pro.agent.hideDetails') : t('pro.agent.showDetails')} (${CHORD_HINT.agentConfig})`} />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Tabs value={tab} onChange={setTab} ariaLabel={t('pro.room.tabsLabel')} tabs={[{ value: 'inbox', label: t('pro.room.tabs.inbox') }, { value: 'tasks', label: t('pro.room.tabs.tasks'), count: myTasks?.length ?? 0 }, { value: 'terminal', label: t('pro.room.tabs.terminal') }]} />
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <Pane show={tab === 'inbox'}><AgentInbox agent={agent} /></Pane>
            <Pane show={tab === 'tasks'}><AgentTasks agent={agent} tasks={myTasks} /></Pane>
            <Pane show={tab === 'terminal'}>
              {agent.ptyId ? (
                <PtyTerminalView
                  key={terminalInstanceKey(agent.ptyId, agent.terminalGeneration)}
                  ptyId={agent.ptyId}
                  provider={agent.provider}
                  onStreamData={onPtyStream}
                  onUserPrompt={(text) => {
                    updateAgent(agent.id, { lastPrompt: text });
                    if (text.trim().toLowerCase() === '/clear') updateAgent(agent.id, { contextTokens: 0, contextLimit: undefined, progress: 0 });
                    void window.cth.historyAdd({ agentId: agent.id, cwd: agent.cwd, text });
                  }}
                  fullscreen={false}
                  embedded
                  chrome="pro"
                />
              ) : (
                <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--cth-ink-500)', fontSize: 13, padding: 24, textAlign: 'center' }}>{t('pro.room.noSession', { name: agent.name })}</div>
              )}
            </Pane>
            {/* Batch 2 (founder, 24 Sep 2026): an agent whose CLI is not
                installed had an empty inbox that said nothing about why.
                The same card as the Terminal tab, over the Inbox tab. */}
            {tab === 'inbox' && cliMissing && agent.ptyId && <CliMissingCard ptyId={agent.ptyId} state={cliMissing} />}
          </div>
          <Composer agent={agent}
            autoFocus={tab === 'inbox'}
            holdKey={composerHoldKey(cliSetup, !!cliMissing)}
            setupPanel={cliSetup && agent.ptyId ? <CliSetupPanel ptyId={agent.ptyId} setup={cliSetup} onShowTerminal={tab === 'terminal' ? undefined : () => setTab('terminal')} /> : null}
          />
        </div>
        {isOpen && <DetailsPanel agent={agent} config={config} />}
      </div>

      {stopAsk && (
        <ConfirmDialog danger title={t('pro.room.stopTitle', { name: agent.name })} body={t('pro.room.stopBody')} confirmLabel={t('pro.room.stop')} onConfirm={() => { void stop(); }} onClose={() => setStopAsk(false)} />
      )}
    </div>
  );
}

/** Both tab bodies stay mounted; the hidden one keeps its size and is only
 *  invisible, so xterm never has to refit and the parser keeps its stream. */
function Pane({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <div aria-hidden={!show} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', visibility: show ? 'visible' : 'hidden', pointerEvents: show ? 'auto' : 'none' }}>
      {children}
    </div>
  );
}

/* ---- the control cluster ------------------------------------------------- */

function Controls({ agent }: { agent: Agent }) {
  const { t } = useTranslation();
  const godName = useStore((s) => s.agents.find((a) => a.isGod)?.name) ?? t('pro.room.theOrchestrator');
  const updateAgent = useStore((s) => s.updateAgent);
  const [snap, setSnap] = useState<AgentControlSnapshot | null>(null);
  const held = !!agent.onHold;

  useEffect(() => {
    let alive = true;
    const tick = () => { window.cth.controlSnapshot?.(agent.id).then((s) => { if (alive && s) setSnap(s); }).catch(() => { /* none yet */ }); };
    tick();
    const id = window.setInterval(tick, 3000);
    return () => { alive = false; window.clearInterval(id); };
  }, [agent.id]);

  const pause = async () => {
    const s = snap?.paused ? await window.cth.controlResume(agent.id) : await window.cth.controlPause(agent.id, true);
    if (s) setSnap(s);
    proToast(s?.paused ? t('pro.room.pausedToast', { name: agent.name }) : t('pro.room.resumedToast', { name: agent.name }));
  };
  // A toggle, not a one-way latch: the second click disarms the pending stop
  // through controlUnhalt and the agent keeps going (founder round 2, item 5).
  const halt = async () => {
    const armed = !!snap?.halted;
    const s = armed ? await window.cth.controlUnhalt(agent.id) : await window.cth.controlHalt(agent.id);
    if (s) setSnap(s);
    proToast(armed ? t('pro.room.stopAfterCancelToast', { name: agent.name }) : t('pro.room.stopAfterToast', { name: agent.name }));
  };
  const hold = async () => {
    const res = await window.cth.hiveSetAgentHold(agent.id, !held).catch(() => ({ ok: false as const }));
    if (!res.ok) { proToast(t('pro.room.holdFailed'), { tone: 'bad' }); return; }
    updateAgent(agent.id, { onHold: !held });
    proToast(!held ? t('pro.room.heldToast', { name: agent.name, god: godName }) : t('pro.room.releasedToast'));
  };

  return (
    <span style={{ display: 'inline-flex', gap: 4, padding: 2, borderRadius: 9, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)' }}>
      <Ctl on={!!snap?.paused} onClick={() => { void pause(); }} title={t('pro.room.pauseTitle')}>{snap?.paused ? t('pro.room.resumeTools') : t('pro.room.pauseTools')}</Ctl>
      <Ctl on={!!snap?.halted} onClick={() => { void halt(); }} title={snap?.halted ? t('pro.room.stopAfterArmedTitle') : t('pro.room.stopAfterTitle')}>{snap?.halted ? t('pro.room.stopAfterArmed') : t('pro.room.stopAfter')}</Ctl>
      <Ctl on={held} onClick={() => { void hold(); }} title={t('pro.room.oneOnOneTitle', { name: agent.name, god: godName })}>{t('pro.room.oneOnOne')}</Ctl>
    </span>
  );
}

function Ctl({ on, onClick, title, disabled, children }: { on: boolean; onClick: () => void; title: string; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} title={title} disabled={disabled} onClick={onClick} style={{
      height: 24, padding: '0 9px', borderRadius: 7, border: `1px solid ${on ? 'var(--cth-accent)' : 'transparent'}`, font: 'inherit', fontSize: 12, fontWeight: 500,
      background: on ? 'var(--cth-accent-soft)' : 'transparent', color: on ? 'var(--cth-accent-text)' : 'var(--cth-ink-700)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1, whiteSpace: 'nowrap'
    }}>{children}</button>
  );
}

/* ---- the details panel --------------------------------------------------- */

function DetailsPanel({ agent, config }: { agent: Agent; config: HarnessConfig | null }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const nav = usePaneNav();
  const renameAgent = useStore((s) => s.renameAgent);
  const updateAgent = useStore((s) => s.updateAgent);
  const enqueueMessage = useStore((s) => s.enqueueMessage);
  const archiveAgent = useStore((s) => s.archiveAgent);
  const setIdeOpen = useStore((s) => s.setIdeOpen);
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const usage = useAgentUsage(agent.id);
  const { tasks } = useTaskLedger(10_000);
  const ticket = ticketFor(agent.id, tasks);
  const activity = useAgentActivity(agent.id, 50);
  const last = activity.length ? activity[activity.length - 1] : undefined;
  const [archiveAsk, setArchiveAsk] = useState(false);

  const now = agent.recentAssistantText?.trim() || (last ? describeEntry(last, t, technical) : agent.description);
  const ctxPct = agent.contextLimit && agent.contextTokens !== undefined ? Math.min(100, Math.round((agent.contextTokens / agent.contextLimit) * 100)) : null;
  const mcps = MCP_CATALOG.filter((m) => mcpEnabledFor(m, config?.mcpDefaults, config?.agentMcp, agent.id));
  // 7.3. `config.agentTokenCaps?.[agent.id]` read through a truthiness test
  // answered "not set", "set to zero" and "capped at N" with two states, so a
  // zero on disk drew as an empty field here and as the digit 0 in the
  // orchestrator's config tab, and the panel could not say which cap was
  // actually in force. The read is now explicit and shared.
  const cap = readAgentTokenCap(agent.id, config?.agentTokenCaps, config?.costCapTokens);
  const capField = tokenCapFieldText(agent.id, config?.agentTokenCaps);
  const capLine = cap.source === 'agent' ? t('pro.agent.capOwn', { tokens: fmtK(cap.tokens) })
    : cap.source === 'workspace' ? t('pro.agent.capWorkspace', { tokens: fmtK(cap.tokens) })
    : t('pro.agent.capNotSet');

  const saveName = async (v: string) => { if (v.trim() && v.trim() !== agent.name) { await renameAgent(agent.id, v.trim()); proToast(t('pro.agent.saved')); } };
  const saveRole = (v: string) => { if (v.trim() && v.trim() !== agent.description) { updateAgent(agent.id, { description: v.trim() }); proToast(t('pro.agent.saved')); } };
  const saveGoal = (v: string) => { if (v.trim() !== (agent.goal ?? '')) { updateAgent(agent.id, { goal: v.trim() || undefined }); proToast(t('pro.agent.saved')); } };
  const saveCap = (v: string) => {
    const n = Number(v.replace(/[,_\s]/g, ''));
    const tokens = Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
    void window.cth.setAgentTokenCap(agent.id, tokens).then(() => proToast(t('pro.agent.saved'))).catch(() => proToast(t('pro.agent.saveFailed'), { tone: 'bad' }));
  };
  const copySession = () => { if (agent.ptyId) { void navigator.clipboard.writeText(agent.ptyId); proToast(t('pro.room.copied')); } };
  const compact = () => { enqueueMessage(agent.id, '/compact'); proToast(t('pro.room.compactToast', { name: agent.name })); };
  const openTerminal = async () => {
    const r = await window.cth.openTerminalAt(agent.cwd).catch(() => ({ ok: false as const }));
    if (!r.ok) proToast(t('pro.room.terminalFailed'), { tone: 'bad' });
  };

  return (
    <aside style={{ width: CONFIG_PANEL_WIDTH, flexShrink: 0, borderLeft: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
      <SectionH>{t('pro.agent.now')}</SectionH>
      <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--cth-ink-700)' }}>{now}</p>
      {ticket && (
        <button type="button" onClick={() => openTaskDetail(ticket.id)} style={{ display: 'flex', gap: 6, alignItems: 'baseline', border: 'none', background: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textAlign: 'start', color: 'var(--cth-ink-900)' }}>
          <span style={{ fontFamily: 'var(--cth-font-figures)', fontSize: 11, color: 'var(--cth-ink-500)' }}>{ticket.id}</span>
          <span style={{ fontSize: 12.5 }}>{ticket.title}</span>
        </button>
      )}

      <SectionH>{t('pro.agent.context')}</SectionH>
      {ctxPct === null ? <Muted>{t('pro.agent.noSession')}</Muted> : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-figures)' }}>
          <span>{ctxPct}%</span>
          <div style={{ flex: 1 }}><Meter pct={ctxPct} /></div>
          <span>{fmtK(agent.contextLimit ?? 0)}</span>
        </div>
      )}
      <Kv rows={[
        { k: t('pro.agent.tokens'), v: usage ? fmtK(usage.input + usage.output + usage.cacheRead + usage.cacheCreation) : '—', mono: true },
        { k: t('pro.agent.spend'), v: usage ? (cap.source === 'agent' ? t('pro.room.spendOfCap', { spend: usd(usage.usd), cap: fmtK(cap.tokens) }) : usd(usage.usd)) : '—', mono: true },
        { k: t('pro.agent.session'), v: agent.ptyId ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {t('pro.room.sessionLine', { n: agent.terminalGeneration ?? 0 })}
            {technical && <IconBtn name="copy" size={20} title={t('pro.room.copySession')} onClick={copySession} />}
          </span>
        ) : t('pro.agent.noSession') }
      ]} />
      {agent.ptyId && <Btn size="sm" onClick={compact} style={{ alignSelf: 'flex-start' }}>{t('pro.room.compact')}</Btn>}

      <SectionH>{t('pro.agent.identity')}</SectionH>
      <Field label={t('pro.agent.name')}><Draft value={agent.name} onCommit={(v) => { void saveName(v); }} ariaLabel={t('pro.agent.name')} /></Field>
      <Field label={t('pro.agent.role')}><Draft multiline value={agent.description} onCommit={saveRole} ariaLabel={t('pro.agent.role')} style={{ minHeight: 60 }} /></Field>
      <Field label={t('pro.agent.goal')}><Draft multiline value={agent.goal ?? ''} onCommit={saveGoal} placeholder={t('pro.agent.goalHint')} ariaLabel={t('pro.agent.goal')} style={{ minHeight: 44 }} /></Field>
      <Muted>{t('pro.room.autosave')}</Muted>

      <SectionH>{t('pro.agent.engine')}</SectionH>
      {config
        ? <EngineEditor key={agent.id} agent={agent} config={config} />
        : <Kv rows={[{ k: t('pro.agent.provider'), v: agent.provider ?? '—' }, { k: t('pro.agent.model'), v: agent.model ?? '—', mono: technical }]} />}
      {/* Founder round 2, item 16: the way into the full form is a real button
          under the section, not link text buried in the note. */}
      <Btn size="sm" onClick={() => openAgentSheet({ mode: 'edit', agentId: agent.id })} style={{ alignSelf: 'flex-start' }}>{t('pro.room.editAgentConfig')}</Btn>

      <SectionH>{t('pro.agent.workspace')}</SectionH>
      <Kv rows={[
        { k: t('pro.room.folder'), v: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%' }}>
            <span title={agent.cwd} style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left' }}>{agent.cwd || '—'}</span>
            {agent.cwd && <IconBtn name="chevronRight" size={20} title={t('pro.room.openTerminal')} onClick={() => { void openTerminal(); }} />}
          </span>
        ) },
        { k: t('pro.room.branch'), v: agent.worktreePath ?? t('pro.agent.noWorktree'), mono: !!agent.worktreePath },
        { k: t('pro.room.changes'), v: <button type="button" onClick={() => setIdeOpen(true, agent.id)} style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'var(--cth-accent-text)', fontWeight: 500, cursor: 'pointer' }}>{t('pro.room.openIde')}</button> }
      ]} />

      <SectionH>{t('pro.agent.capabilities')}</SectionH>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {mcps.map((m) => <Chip key={m.id} tone="muted">{m.label}</Chip>)}
        {mcps.length === 0 && <Muted>{t('pro.agent.noMcp')}</Muted>}
        <Btn kind="ghost" size="sm" onClick={() => nav.go('capabilities')} style={{ height: 24 }}>{t('pro.agent.manage')}</Btn>
        <Btn kind="ghost" size="sm" onClick={() => openBundleSheet({ agentId: agent.id })} style={{ height: 24 }}>{t('pro.agent.roleBundle')}</Btn>
      </div>

      <SectionH>{t('pro.agent.budget')}</SectionH>
      {/* The field edits THIS AGENT'S OWN cap, so it is empty when the agent
          has none, and its placeholder says that in words rather than showing
          a zero or nothing at all. Which cap is actually in force is a
          different fact and gets its own row, because the workspace number
          pre-filled into the field would become a per agent override on the
          next blur. */}
      <Field label={t('pro.agent.tokenCap')} hint={t('pro.agent.tokenCapNote')}>
        <Draft mono value={capField} onCommit={saveCap} placeholder={t('pro.agent.capNotSet')} ariaLabel={t('pro.agent.tokenCap')} />
      </Field>
      <Kv rows={[{ k: t('pro.agent.capApplies'), v: capLine, mono: cap.source !== 'none' }]} />

      <div style={{ marginTop: 10 }}>
        <button type="button" onClick={() => setArchiveAsk(true)} style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', fontSize: 12, color: 'var(--cth-ink-500)', cursor: 'pointer' }}>{t('pro.room.archive')}</button>
      </div>
      {archiveAsk && (
        <ConfirmDialog title={t('pro.room.archiveTitle', { name: agent.name })} body={t('pro.room.archiveBody')} confirmLabel={t('pro.room.archiveConfirm')}
          onConfirm={() => { setArchiveAsk(false); archiveAgent(agent.id); proToast(t('pro.room.archived', { name: agent.name })); nav.go('agents'); }}
          onClose={() => setArchiveAsk(false)} />
      )}
    </aside>
  );
}

/* ---- the engine (provider + model, in the panel) -------------------------- */

/** Compact provider and model selects (founder round 2, item 16: the panel had
 *  no way to change either). A pick writes the SAME patch the agent sheet's
 *  edit save sends, through store.updateAgent: provider, model, and the
 *  command rebuilt from them. The change applies on the next start, so after a
 *  pick the panel says so and offers Restart now, which runs the Command
 *  Center's restart steps against this agent's own pty: kill, reset the xterm
 *  in place, spawn the stored command into the SAME pty id. The recorded
 *  conversation is resumed when the provider still matches the session that
 *  recorded it; a provider change starts fresh (a session cannot cross CLIs). */
function EngineEditor({ agent, config }: { agent: Agent; config: HarnessConfig }) {
  const { t } = useTranslation();
  const updateAgent = useStore((s) => s.updateAgent);
  // The provider of the session running NOW, so a restart knows whether the
  // recorded conversation can come along. Seeded once per agent (the component
  // is keyed by agent.id) and advanced only when a restart actually lands.
  const [sessionProvider, setSessionProvider] = useState<AgentProvider>(() => inferAgentProvider(agent.command, agent.provider));
  const [changed, setChanged] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const provider = inferAgentProvider(agent.command, agent.provider);
  const preset = providerPreset(provider);
  const providerOptions = AGENT_PROVIDER_PRESETS.map((p) => ({ value: p.id, label: p.label }));
  // Same rule as the agent sheet: a model the list does not know (a newer id,
  // or the one already running) is shown as a real, selected option, and no
  // model at all gets its own row, so the select never lies about the command.
  const modelOptions = (() => {
    const known = modelsForProvider(provider).map((m) => ({ value: m.id ?? '', label: m.label }));
    if (!known.some((m) => m.value === (agent.model ?? ''))) {
      if (agent.model) known.push({ value: agent.model, label: t('pro.sheet.modelCurrent', { model: modelWord(provider, agent.model) ?? agent.model }) });
      else known.unshift({ value: '', label: t('pro.sheet.modelDefault') });
    }
    return known;
  })();

  // THE LINE THIS AGENT RUNS, editable (founder, 24 Sep). The box starts on the
  // stored command, which is the line it was spawned with; a provider or model
  // pick rewrites it (the store patch below), the agent sheet's rule. Restart
  // runs what is in the box, so the line on screen is the line that runs.
  const resolved = provider === 'custom' ? '' : buildSpawnCommand(config, agent.model, provider);
  const stored = (agent.command ?? '').trim() || resolved;
  const [draft, setDraft] = useState(stored);
  useEffect(() => { setDraft(stored); }, [stored]);
  const plan = planAgentRestart(draft, resolved, provider, agent.model);
  const draftDirty = draft.trim() !== stored.trim();
  const conflictText = plan.conflict ? t('pro.sheet.commandOtherEngine', { engine: providerPreset(plan.conflict).label, picked: preset.label }) : null;

  const pickProvider = (id: AgentProvider) => {
    if (id === provider) return;
    const model = isClaudeProvider(id) ? config.defaultModel : config.providerDefaultModels?.[id];
    const command = id === 'custom' ? (agent.command ?? config.defaultCommand ?? '') : buildSpawnCommand(config, model, id);
    updateAgent(agent.id, { provider: id, model, command });
    setChanged(true);
  };
  const pickModel = (m?: string) => {
    if ((m ?? '') === (agent.model ?? '')) return;
    updateAgent(agent.id, { model: m, command: buildSpawnCommand(config, m, provider) });
    setChanged(true);
  };

  // The process ended on its own (0.5.3 feature 18). Restart here is then the
  // one way back: the left rail only names the death (founder, 24 Sep).
  const down = agent.exit;
  const blocked = (!agent.ptyId && !down) || restarting || !!plan.conflict || !plan.command;

  /** A dead agent comes back on the restore's recipe, not a live restart's:
   *  it re enters its worktree when that still exists (`isolate: false`, never
   *  a second `git worktree add` on the same path) and falls back to the base
   *  folder when teardown removed it; main resumes the last session that has a
   *  transcript and says when there was none. Moved here from the rail's
   *  CrashedBlock. */
  const revive = async (command: string) => {
    const ptyId = agent.ptyId ?? `pty-${agent.id}`;
    let cwd = agent.cwd;
    let worktreeGone = false;
    if (agent.worktreePath) {
      if (await window.cth.gitIsRepo(agent.worktreePath)) cwd = agent.worktreePath;
      else worktreeGone = true;
    }
    // The old process is gone; clear its frame so the new one paints clean.
    resetTerminal(ptyId, { preserveScrollback: true });
    const [exe, ...args] = tokenizeCommand(command);
    const res = await window.cth.spawnPty({
      id: ptyId, cwd, command: exe, args, provider, cols: 100, rows: 30,
      isolate: false,
      resume: true,
      hive: { id: agent.id, name: agent.name, cwd, provider, isGod: agent.isGod, isAssistant: agent.isAssistant, role: roleForHiveSpawn(agent) }
    });
    if (!res.ok) throw new Error(res.error ?? 'spawn failed');
    updateAgent(agent.id, {
      exit: undefined, ptyId, command, provider, archived: false, status: 'idle',
      action: worktreeGone ? 'worktree gone, using base repo' : res.resumeNotFound ? 'started fresh, last session not found' : 'restarting…',
      worktreePath: worktreeGone ? undefined : agent.worktreePath,
      seedPrompt: res.seedPrompt
    });
    setSessionProvider(provider);
    setChanged(false);
    if (res.resumeNotFound) proToast(t('pro.room.restartedFresh', { name: agent.name }), { tone: 'bad' });
    else proToast(t('pro.room.restartedToast', { name: agent.name }));
  };

  const restart = async () => {
    if (blocked) return;
    setRestarting(true);
    if (down) {
      try {
        updateAgent(agent.id, { command: plan.command, model: plan.model });
        await revive(plan.command);
      } catch (error) {
        proToast(t('pro.agents.crashedFailed', { name: agent.name, error: error instanceof Error ? error.message : String(error) }), { tone: 'bad' });
      } finally {
        setRestarting(false);
      }
      return;
    }
    if (!agent.ptyId) { setRestarting(false); return; }
    try {
      const nextProvider = provider;
      // The box, not a rebuild from the picks: a rebuild threw a hand edit away.
      const command = plan.command;
      // Stored BEFORE the spawn, so a restart of the app (useRestoreTeam) starts
      // on the same line even if this one fails half way.
      updateAgent(agent.id, { command, model: plan.model });
      // Resume is opportunistic: a recorded session on the SAME provider comes
      // along; anything else (no record, a moved transcript, a new provider)
      // starts fresh rather than refusing the restart.
      const resume = nextProvider === sessionProvider;
      // 0.5.3 bug 1: the renderer used to check the ONE recorded session id here
      // and quietly turn the resume off when it had no transcript. That id is not
      // always the agent's conversation (shared/resumeKey.ts), so main now walks
      // every session on record and says whether anything resumed.
      // Capture the live grid before replacing anything, the way the Command
      // Center's restart does, so the new process paints at the right size.
      const entry = acquireTerminal(agent.ptyId);
      const cols = entry.term.cols || 100;
      const rows = entry.term.rows || 30;
      // 'restart': the person chose to restart, not to discard. Main keeps the
      // worktree and keeps tracking it, and the agent comes back IN it.
      const killed = await window.cth.killPty(agent.ptyId, 'restart');
      // A pty that is already gone is the state the kill was trying to reach.
      if (!killed.ok && !/^no pty:/.test(killed.error ?? '')) throw new Error(killed.error ?? 'kill failed');
      resetTerminal(agent.ptyId, { preserveScrollback: resume });
      const [exe, ...args] = tokenizeCommand(command.trim());
      const res = await window.cth.spawnPty({
        id: agent.ptyId,
        cwd: agent.worktreePath ?? agent.cwd,
        command: exe,
        args,
        provider: nextProvider,
        cols,
        rows,
        hive: { id: agent.id, name: agent.name, cwd: agent.cwd, provider: nextProvider, isGod: agent.isGod, isAssistant: agent.isAssistant, role: roleForHiveSpawn(agent) },
        resume
      });
      if (!res.ok) throw new Error(res.error ?? 'restart failed');
      updateAgent(agent.id, { command: command.trim(), status: 'idle', action: resume && res.resumed ? 'continuing…' : 'restarting…' });
      setSessionProvider(nextProvider);
      setChanged(false);
      // Asked to continue and nothing came back: say so, in the place the person
      // is looking, instead of a plain "restarted" over an empty agent.
      if (res.resumeNotFound) proToast(t('pro.room.restartedFresh', { name: agent.name }), { tone: 'bad' });
      else proToast(t('pro.room.restartedToast', { name: agent.name }));
    } catch (error) {
      console.warn('[pro] engine restart failed', error);
      proToast(t('pro.room.restartFailed'), { tone: 'bad' });
    } finally {
      setRestarting(false);
    }
  };

  return (
    <>
      <Field label={t('pro.agent.provider')}>
        <SelectBox<AgentProvider> ariaLabel={t('pro.agent.provider')} value={provider} onChange={pickProvider} options={providerOptions} />
      </Field>
      {preset.supportsModel && (
        <Field label={t('pro.agent.model')}>
          <SelectBox<string> ariaLabel={t('pro.agent.model')} value={agent.model ?? ''} onChange={(v) => pickModel(v || undefined)} options={modelOptions} />
        </Field>
      )}
      <Field label={t('pro.sheet.command')} hint={t('pro.agent.commandHint')}>
        <CommandField ariaLabel={t('pro.sheet.command')} value={draft} resolved={resolved} onChange={setDraft} disabled={restarting} testId="agent" error={conflictText} />
      </Field>
      <Muted>{t('pro.room.engineNote', { name: agent.name })}</Muted>
      {/* ALWAYS here (founder, 24 Sep: it hid until a model changed). The line
          above says what a pending change is; the button runs the box. */}
      {/* Stopped or crashed: said right above the button that brings it back,
          with the exit code and when, as the rail strip says it. */}
      {down && (
        <span role="status" data-agent-down={down.verdict} style={{ fontSize: 12, fontWeight: 500, color: down.verdict === 'crashed' ? 'var(--cth-status-blocked)' : 'var(--cth-ink-700)' }}>
          {down.verdict === 'crashed' ? t('pro.agents.crashed') : down.verdict === 'finished' ? t('pro.agents.finished') : t('pro.agents.stopped')}{' '}
          {down.verdict === 'crashed'
            ? t('pro.rail.crashedWith', { code: down.signal ? `signal ${down.signal}` : `exit ${down.exitCode ?? '?'}`, age: ageWord(down.at, Math.max(Date.now(), down.at)) })
            : null}
        </span>
      )}
      <div data-agent-restart style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Btn size="sm" kind={down || changed || draftDirty ? 'primary' : 'default'} disabled={blocked} onClick={() => { void restart(); }}>
          {restarting ? t('pro.god.config.restarting') : t('pro.room.restartNow')}
        </Btn>
        {(changed || draftDirty) && <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--cth-ink-700)' }}>{changed ? t('pro.room.restartNeeded') : t('pro.agent.restartToApply')}</span>}
      </div>
    </>
  );
}

/* ---- pieces -------------------------------------------------------------- */

function Muted({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{children}</p>;
}

function firstSentence(s: string): string {
  return s.trim().split(/(?<=[.!?])\s/)[0] ?? s;
}

/** The agent's latest usage sample, then live pushes. Null until the collector answers. */
function useAgentUsage(agentId: string) {
  const [s, setS] = useState<{ input: number; output: number; cacheRead: number; cacheCreation: number; usd: number } | null>(null);
  useEffect(() => {
    let alive = true;
    setS(null);
    window.cth.telemetryUsage?.(agentId).then((x) => { if (alive && x) setS(x); }).catch(() => { /* collector down */ });
    const off = window.cth.onTelemetryEvent?.((e) => { if (e.kind === 'usage' && e.sample.agentId === agentId) setS(e.sample); });
    return () => { alive = false; off?.(); };
  }, [agentId]);
  return s;
}

/**
 * THE ORCHESTRATOR'S SCREEN (v0.4.9 phase 3, plan Part 4 section 4, D9 = A).
 * Where clicking Michael used to land in the Classic Command Center cut to
 * three tabs, PRO now draws his screen itself, to the prototype's viewGod:
 * the agent screen's frame (portrait, name, the orchestrator chip, a status
 * chip, the control cluster, no dense menu bar) over six tabs:
 *
 *   Terminal          his real session (PtyTerminalView, PRO chrome)
 *   Messages          the stream between agents, the Inbox's own reader
 *   Routing           what he routed where, newest first, same reader
 *   Budget & breaker  spend against the cap, the breaker, auto mode, caps
 *   Board             board.md read only, with a proposal composer
 *   Configuration     his settings, through the agent screen's doors
 *
 * The five Command Center tabs that have PRO homes (Ask me, triggers,
 * workers, the memory graph, trigger history) are not here: the Inbox,
 * Automations, Temps and Memory screens are their homes, and the sidebar is
 * the one door to them.
 *
 * ⌘. on the agent screen folds its config panel; here the same chord opens
 * Configuration and closes it again (back to the tab that was open).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AskMeBell } from './AskMeBell';
import { useStore, type Agent } from '@/store/store';
import type { HarnessConfig } from '@/store/config';
import { useRealtimeMichael } from '@/realtime/session';
import { CostHud } from '@/realtime/CostHud';
import { isComposingKey } from '@shared/imeGuard';
import { OPENAI_KEYS_URL, saveOpenAiKey } from '@/voice/keyEntry';
import { usePaneNav } from '../professional/paneNav';
import { useFloor } from './InboxScreen';
import { Btn, Chip, StatusChip, StatusDot, Tabs, monoInputStyle, proToast } from './ui';
import { SpritePortrait } from '../SpritePortrait';
import { ProIcon } from './icons';
import { useTechnical } from './depth';
import { CHORD_HINT, proChordFor } from './proKeys';
import { GOD_TABS, firstSentence, isGodTab, type GodTab } from './god/godData';
import { TerminalTab } from './god/TerminalTab';
import { MessagesTab } from './god/MessagesTab';
import { RoutingTab } from './god/RoutingTab';
import { BudgetTab } from './god/BudgetTab';
import { BoardTab } from './god/BoardTab';
import { ConfigTab } from './god/ConfigTab';

const TAB_KEY = 'cth.proGodTab';
function readTab(): GodTab {
  try { const v = window.localStorage.getItem(TAB_KEY); return isGodTab(v) ? v : 'terminal'; } catch { return 'terminal'; }
}

export function GodScreen({ agent, config }: { agent: Agent; config: HarnessConfig | null }) {
  const { t } = useTranslation();
  const nav = usePaneNav();
  const technical = useTechnical();
  const [tab, setTabState] = useState<GodTab>(readTab);
  const before = useRef<GodTab>('terminal');
  const setTab = useCallback((next: GodTab) => {
    setTabState((cur) => { if (cur !== 'config') before.current = cur; return next; });
    try { window.localStorage.setItem(TAB_KEY, next); } catch { /* private mode */ }
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (proChordFor(e) !== 'agentConfig') return;
      e.preventDefault();
      setTab(tab === 'config' ? before.current : 'config');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, setTab]);

  // One reader for both message tabs: the Inbox's, refreshed on every routed message.
  const messages = useFloor();
  const sub = technical
    ? `${agent.model ?? config?.godModel ?? t('pro.god.config.cliDefault')} · ${agent.provider ?? config?.godProvider ?? 'claude'}`
    : firstSentence(agent.description) || t('pro.god.runs');

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--cth-cream-50)' }}>
      {/* The bare sprite, native sized in a 40 box (founder, 5 Sep 2026: the
          2x face was too big for this bar). Crisp sizes are whole multiples of
          the 28px frame, so smaller-than-56 means the row's own 28 art. */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 18px', borderBottom: '1px solid var(--cth-ink-300)', flexShrink: 0, background: 'var(--cth-cream-50)' }}>
        <SpritePortrait character={agent.character} size={40} />
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--cth-ink-900)', whiteSpace: 'nowrap' }}>{agent.name}</h1>
        <Chip tone="accent">{t('pro.god.orchestrator')}</Chip>
        <StatusChip status={agent.status} raw={agent.action} />
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sub}>{sub}</span>
        <span style={{ flex: 1 }} />
        <VoiceButton godName={agent.name} />
        <CostHud compact />
        <DeliveryButton agent={agent} />
        <AskMeBell agent={agent} />
        <Btn size="sm" title={`${t('pro.god.ideTitle')} ${CHORD_HINT.ide}`} onClick={() => useStore.getState().setIdeOpen(true, agent.id)}>{t('pro.god.ide')}</Btn>
      </header>
      <Tabs
        value={tab}
        tabs={GOD_TABS.map((k) => ({ value: k, label: t(`pro.god.tab.${k}`) }))}
        onChange={setTab}
        ariaLabel={t('pro.god.tabsLabel', { name: agent.name })}
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {tab === 'terminal' && <TerminalTab agent={agent} />}
        {tab === 'messages' && <MessagesTab messages={messages} />}
        {tab === 'routing' && <RoutingTab messages={messages} />}
        {tab === 'budget' && <BudgetTab agent={agent} config={config} />}
        {tab === 'board' && <BoardTab agent={agent} config={config} />}
        {tab === 'config' && <ConfigTab agent={agent} config={config} />}
      </div>
    </div>
  );
}

/* ---- the control cluster ------------------------------------------------- */

/** Realtime voice, the same session singleton the Classic toggle drives
 *  (realtime/session.ts). Without an OpenAI key the button stays visible and
 *  muted, and a click opens the card that takes the key (0.4.11, founder
 *  6 Sep 2026: "the button is disabled but when clicked on it should open a
 *  dropdown modal asking user to add their openai api keys"), so the muted
 *  button is never a dead end. connect() stays unreachable until the key is
 *  saved. */
const KEY_CARD_W = 300;
function VoiceButton({ godName }: { godName: string }) {
  const { t } = useTranslation();
  const hasKey = useStore((s) => s.hasOpenAiKey);
  const { status, error, connect, disconnect } = useRealtimeMichael();
  const live = status !== 'off';
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const [keyDraft, setKeyDraft] = useState('');
  const [keyNote, setKeyNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!at) return;
    const away = (e: globalThis.MouseEvent) => {
      const node = e.target as Node;
      if (anchorRef.current?.contains(node) || panelRef.current?.contains(node)) return;
      setAt(null);
    };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setAt(null); };
    const reflow = () => setAt(null);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('resize', reflow);
      window.removeEventListener('scroll', reflow, true);
    };
  }, [at]);

  const title = !hasKey
    ? t('pro.god.voice.noKey')
    : error
      ? `${t(`pro.god.voiceTitle.${status}`, { name: godName })}: ${error}`
      : t(`pro.god.voiceTitle.${status}`, { name: godName });

  const toggleCard = (): void => {
    if (at) { setAt(null); return; }
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return;
    // The header sits at the top of the screen, so the card goes below it.
    setAt({ left: Math.max(8, Math.min(r.left, window.innerWidth - KEY_CARD_W - 8)), top: r.bottom + 8 });
  };

  const saveKey = async (): Promise<void> => {
    if (!keyDraft.trim() || saving) return;
    setSaving(true);
    setKeyNote('');
    const r = await saveOpenAiKey(keyDraft);
    setSaving(false);
    if (r.ok) { setKeyDraft(''); setAt(null); proToast(t('pro.god.voice.keySaved')); return; }
    setKeyNote(t('pro.voice.keyFailed'));
  };

  return (
    <span ref={anchorRef} style={{ display: 'inline-flex' }}>
      <Btn
        size="sm"
        kind={live ? 'primary' : 'default'}
        title={title}
        style={hasKey ? undefined : { opacity: 0.7 }}
        onClick={() => { if (!hasKey) { toggleCard(); return; } if (status === 'off') void connect(); else disconnect(); }}
      >
        <ProIcon name="mic" size={14} />{t(`pro.god.voice.${status}`)}
      </Btn>
      {!hasKey && at && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('pro.god.voice.keyTitle')}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', left: at.left, top: at.top, zIndex: 460, width: KEY_CARD_W, boxSizing: 'border-box',
            padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 7,
            background: 'var(--cth-cream-50)', border: '1px solid var(--cth-ink-300)', borderRadius: 10,
            boxShadow: 'var(--cth-shadow-hard)', fontFamily: 'var(--cth-font-ui)', fontSize: 11.5, lineHeight: 1.45,
            color: 'var(--cth-ink-900)', textAlign: 'start'
          }}
        >
          <span style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cth-ink-500)' }}>{t('pro.god.voice.keyTitle')}</span>
          {/* The cost goes first: Talk is billed by OpenAI per minute, unlike
              dictation, and that is the fact that decides whether someone
              pastes a key here. */}
          <span>{t('pro.god.voice.keyLead', { name: godName })}</span>
          <span>
            {t('pro.god.voice.keyCreate')}{' '}
            <a
              href={OPENAI_KEYS_URL}
              onClick={(e) => { e.preventDefault(); void window.cth.openExternal(OPENAI_KEYS_URL); }}
              style={{ color: 'var(--cth-accent-text)' }}
            >platform.openai.com/api-keys</a>
          </span>
          <div data-openai-key-entry style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              onKeyDown={(e) => { if (isComposingKey(e)) return; if (e.key === 'Enter') void saveKey(); }}
              placeholder="sk-…"
              aria-label={t('settings.voice.openaiKey')}
              autoFocus
              style={{ ...monoInputStyle, height: 28, flex: 1, minWidth: 0 }}
            />
            <Btn size="sm" kind="primary" onClick={() => { void saveKey(); }} disabled={!keyDraft.trim() || saving}>{t('settings.voice.save')}</Btn>
          </div>
          {keyNote && <span style={{ color: 'var(--cth-coral)' }}>{keyNote}</span>}
        </div>,
        document.body
      )}
    </span>
  );
}

/** The one team wide delivery switch (v0.3.4): queued messages are typed into
 *  agents as they go idle, or every queue is held. Reads the god's control
 *  snapshot, writes every live agent's, as the Classic header did. */
function DeliveryButton({ agent }: { agent: Agent }) {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    let alive = true;
    window.cth.controlSnapshot(agent.id)
      .then((s) => { if (alive && s) setPaused(s.autoDeliveryPaused); })
      .catch(() => { /* none */ });
    return () => { alive = false; };
  }, [agent.id]);
  const toggle = async () => {
    const next = !paused;
    setPaused(next);
    const all = useStore.getState().agents;
    await Promise.all(all.map((a) => window.cth.controlAutoDelivery(a.id, next).catch(() => null)));
  };
  return (
    <Btn size="sm" kind={paused ? 'primary' : 'default'} title={paused ? t('pro.god.deliveriesPausedTitle') : t('pro.god.deliveriesOnTitle')} onClick={() => { void toggle(); }}>
      <StatusDot status={paused ? 'waiting' : 'working'} />
      {paused ? t('pro.god.deliveriesPaused') : t('pro.god.deliveriesOn')}
    </Btn>
  );
}

/**
 * AGENTS (v0.4.9 phase 2, decisions D4 and D8): the orchestrator's card, then
 * a lean card per agent, four to a row. Prototype of record:
 * hive/shared/design/app-v2/prototype.html `viewAgents()` (v4, founder
 * approved 3 Sep 2026 after two feedback rounds).
 *
 * WHAT A CARD SAYS, and where each line comes from, because a figure with no
 * source is a claim:
 *   status                the store (hook events → useHive), through StatusChip
 *   sub line              simple: the role's first sentence; technical: the model
 *   ticket                the task ledger, the card assigned to this agent
 *                         (doing first, then blocked, then todo); opens the sheet
 *   latest update         the agent's own words (recentAssistantText), else the
 *                         last activity digest entry (shared/activity.ts), with
 *                         its time; "New, no activity yet" when there is nothing
 *   context               Agent.contextTokens / contextLimit (hidden until known)
 *   tokens this session   useFleetTelemetry() samples
 *   terminal              the last lines of THIS AGENT'S OWN terminal, read
 *                         out of the pooled xterm buffer (see useTerminalTail)
 *
 * PHASE 7 (founder, 3 Sep 2026: "the agent card is empty"). The ticket line
 * and the update line were already wired here and already fed; what made a
 * card look empty is that BOTH of them are often absent at once, and then the
 * whole middle of the card was nothing at all. Three changes, in the order
 * they matter:
 *
 *   7.5  the ticket slot is never blank. A card the agent holds, or
 *   7.6  an Add button that writes a REAL card into the task ledger
 *        (window.cth.hiveAddTask), assigns it to this agent, and then messages
 *        the agent about it through the same queue everything else uses. Two
 *        doors, one action, because a ticket nobody was told about is a ticket
 *        that does not get worked.
 *   7.7  the last lines of the agent's terminal, drawn from the terminal's own
 *        buffer and labelled as the terminal. See useTerminalTail for why that
 *        is available here at all, and why the alternative was a lie.
 *
 * FIGURES ARE MONO (7.4). Every number on this screen reads in
 * --cth-font-figures, which is the terminal's face, so a token total on a card
 * and the same total in the terminal are one face. The `small` suffix inside a
 * Stat used to be forced back to the UI face, which put "of $50" in Inter
 * beside "$12.40" in JetBrains Mono, in one sentence.
 *
 * THE ORCHESTRATOR'S CARD IS ALWAYS DRAWN (D8). The 0.4.8 grid hid him when
 * his row had not landed in the store yet, so the app looked like it had no
 * orchestrator. Now the card renders from godStatus (booting, failed) until
 * the row exists, then from the row. Its four stats are doors: Tasks opens
 * the Tasks screen, Waiting on you opens the Ask me queue in the Inbox.
 *
 * THE PROMPT BAR lives inside the orchestrator card: the text is the god's
 * DRAFT in the store, Enter enqueues through `enqueueMessage`, ⌘↵ opens his
 * screen. AVATARS, NOT INITIALS (founder, 2 Sep): SpritePortrait, drawn bare
 * at an integer sprite scale since pilot item 15 (no chip, no blur).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { matchesAgentSearch } from '@shared/sidebarGroups';
import { useStore, type Agent } from '@/store/store';
import type { HarnessConfig } from '@/store/config';
import type { ActivityEntry } from '@shared/activity';
import { TAIL_SCAN_ROWS, sameTail, terminalTail } from '@shared/agentCard';
import { useResolvedGodName } from '@/hooks/useResolvedGodName';
import { useFleetTelemetry, totalTokens } from '@/hooks/useTelemetry';
import { useFreeflow } from '@/freeflow/recorder';
import { openQuestion, waitsOnHuman, type HiveTask } from '../TasksKanban';
import { acquireTerminal } from '../terminalPool';
import { usePaneNav } from '../professional/paneNav';
import { ProIcon } from './icons';
import { Bar, Btn, Card, Chip, CloseX, Field, IconBtn, Meter, SearchBox, Sheet, StatusChip, StatusDot, fmtK, fmtWhen, inputStyle, proToast, textareaStyle, usd } from './ui';
import { SpritePortrait } from '../SpritePortrait';
import { EngineLine } from './Engine';
import { useTechnical } from './depth';
import { useTaskLedger } from './taskData';
import { requestInboxChat } from './inboxIntent';
import { openAgentSheet } from './agentSheetStore';
import { describeEntry, useLastActivity } from './activityData';
import { BEAT_RING, PulseOverlay, useBeat } from './MessagePulse';
import { VoiceButton } from './Composer';
import { collectDroppedAttachments } from '@shared/dropAttachments';
import { DropZone } from './dropZone';
import { attachmentsFromPaste } from '../pasteAttachments';
import { attachWants, type AttachWant } from '@shared/attachDialog';

const ATTACH_TITLE = { any: 'pro.agents.attachAny', files: 'pro.agents.attach', folders: 'pro.agents.attachFolder' } as const;

export interface AgentsScreenProps {
  config: HarnessConfig | null;
  onOpen: (agentId: string) => void;
}

type Level = 'healthy' | 'steering' | 'constrained' | 'stopped';
const LEVEL_RANK: Record<Level, number> = { healthy: 0, steering: 1, constrained: 2, stopped: 3 };
const LEVEL_STATUS: Record<Level, 'working' | 'waiting' | 'blocked' | 'ghost'> = { healthy: 'working', steering: 'waiting', constrained: 'blocked', stopped: 'ghost' };

export function AgentsScreen({ config, onOpen }: AgentsScreenProps) {
  const { t, i18n } = useTranslation();
  const technical = useTechnical();
  const nav = usePaneNav();
  const agents = useStore((s) => s.agents);
  const godStatus = useStore((s) => s.godStatus);
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const godName = useResolvedGodName();
  const god = agents.find((a) => a.isGod);
  const others = agents.filter((a) => !a.isGod);
  const fleet = useFleetTelemetry();
  const { tasks, refresh: refreshTasks } = useTaskLedger(10_000);
  const lastActivity = useLastActivity(useMemo(() => others.map((a) => a.id), [others]));
  const [q, setQ] = useState('');
  // The agent whose "no ticket" Add button is open, if any (7.6).
  const [newTicket, setNewTicket] = useState<Agent | null>(null);

  const spend = Object.values(fleet.samples).reduce((s, x) => s + (x.usd || 0), 0);
  const cap = config?.costCapUsd;
  const worst = (Object.values(fleet.breakers).map((b) => b.level as Level).sort((a, b) => LEVEL_RANK[b] - LEVEL_RANK[a])[0]) ?? null;
  const doing = tasks ? tasks.filter((x) => x.status === 'doing').length : null;
  const blocked = tasks ? tasks.filter((x) => x.status === 'blocked').length : null;
  // 0.5.3: counted by the rule the Inbox lists by (waitsOnHuman), so this
  // number and the chat it opens cannot disagree. It used to count every open
  // question, blocked or not, and the Inbox shows only the blocked ones.
  const asks = tasks ? tasks.filter(waitsOnHuman).length : null;
  const temps = useRunningTemps();
  // W-C: the router names the orchestrator `god`, which is his store id too.
  const godId = god?.id ?? 'god';
  const godBeat = useBeat(godId);

  const shown = q.trim()
    // 0.5.3, feature 4: one rule for both places an agent is searched for, so
    // the note a person wrote finds the agent here as it does in the sidebar.
    ? others.filter((a) => matchesAgentSearch(a, q))
    : others;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)' }}>
      <Bar title={t('pro.nav.agents')} sub={t('pro.agents.subLine', { count: others.length, temps })}>
        <SearchBox value={q} onChange={setQ} placeholder={t('pro.agents.search')} />
        <Btn onClick={() => nav.go('capabilities')}>{t('pro.nav.capabilities')}</Btn>
        <Btn kind="primary" onClick={() => openAgentSheet({ mode: 'add' })}>{t('rail.addAgent')}</Btn>
      </Bar>

      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
       {/* The relative wrapper is the pulse overlay's frame: it covers the
           whole content, not only the first viewport of a scrolled grid. */}
       <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card onOpen={god ? () => onOpen(god.id) : undefined} ariaLabel={godName} dataAttrs={{ 'data-agent': godId }}
          style={{ overflow: 'hidden', boxShadow: godBeat ? BEAT_RING : undefined, transition: 'box-shadow 80ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 0' }}>
            <SpritePortrait character={god?.character ?? 'michael'} size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                {godName}
                <Chip tone="accent">{t('pro.agents.orchestrator')}</Chip>
              </div>
              {/* The engine line in BOTH renderings (founder, 5 Sep 2026: the
                  orchestrator's card shows its provider and model too); the
                  context figure still belongs to the technical one only. */}
              {god && (
                <EngineLine provider={god.provider} model={god.model} after={technical ? ctxLine(god, t) : undefined} size={15} style={{ marginTop: 2, fontSize: 11.5 }} />
              )}
            </div>
            <span style={{ marginLeft: 'auto' }}>
              {god ? <StatusChip status={god.status} raw={god.action} />
                : godStatus === 'failed' ? <Chip tone="bad"><StatusDot status="blocked" />{t('pro.agents.godFailed')}</Chip>
                : <Chip tone="think"><StatusDot status="thinking" />{t('pro.agents.godStarting')}</Chip>}
            </span>
          </div>
          <div style={{ padding: '10px 16px 0', fontSize: 13, color: 'var(--cth-ink-700)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {god ? (god.recentAssistantText || god.description) : godStatus === 'failed' ? t('pro.agents.godFailedHint') : t('pro.agents.godStartingHint', { name: godName })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, padding: '12px 16px 14px' }}>
            <Stat label={t('pro.agents.stat.budget')}>
              <Value accent mono>{usd(spend)}<small>{cap ? t('pro.agents.stat.ofCap', { cap: usd(cap) }) : t('pro.agents.stat.noCap')}</small></Value>
              {cap ? <div style={{ marginTop: 5 }}><Meter pct={Math.min(100, (spend / cap) * 100)} /></div> : null}
            </Stat>
            <Stat label={t('pro.agents.stat.breaker')}>
              <Value>{worst ? <><StatusDot status={LEVEL_STATUS[worst]} /> {t(`pro.agents.level.${worst}`)}</> : '—'}</Value>
            </Stat>
            <Stat label={t('pro.agents.stat.tasks')} onClick={() => nav.go('tasks')} title={t('pro.agents.openTasks')}>
              <Value mono>{doing === null ? '—' : doing}<small>{doing === null ? '' : t('pro.agents.doingBlocked', { blocked })}</small></Value>
            </Stat>
            <Stat label={t('pro.agents.stat.waiting')} onClick={() => { requestInboxChat('askme'); nav.go('inbox'); }} title={t('pro.agents.openAsks')}>
              <Value mono hot={!!asks}>{asks === null ? '—' : asks}<small>{asks === 1 ? t('pro.agents.question') : t('pro.agents.stat.questions')}</small></Value>
            </Stat>
          </div>
          {god && <PromptBar god={god} godName={godName} onOpen={() => onOpen(god.id)} />}
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          {shown.map((a) => (
            <AgentCard
              key={a.id} agent={a} technical={technical} locale={i18n.language}
              ticket={ticketFor(a.id, tasks)} last={lastActivity[a.id]}
              tokens={fleet.samples[a.id] ? totalTokens(fleet.samples[a.id]) : null}
              breaker={(fleet.breakers[a.id]?.level as Level | undefined) ?? null}
              onOpen={() => onOpen(a.id)} onTicket={openTaskDetail} onAddTicket={() => setNewTicket(a)}
            />
          ))}
          <Card onClick={() => openAgentSheet({ mode: 'add' })} ariaLabel={t('rail.addAgent')} style={{ aspectRatio: '1 / 1', borderStyle: 'dashed', background: 'transparent', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--cth-ink-500)' }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
            <span>{t('rail.addAgent')}</span>
          </Card>
        </div>
        <PulseOverlay />
       </div>
      </div>

      {newTicket && (
        <NewTicketSheet agent={newTicket} onClose={() => setNewTicket(null)} onMade={() => { void refreshTasks(); }} />
      )}
    </div>
  );
}

/* ---- one card ------------------------------------------------------------ */

function AgentCard({ agent: a, technical, locale, ticket, last, tokens, breaker, onOpen, onTicket, onAddTicket }: {
  agent: Agent; technical: boolean; locale: string; ticket: HiveTask | null; last: ActivityEntry | undefined;
  tokens: number | null; breaker: Level | null; onOpen: () => void; onTicket: (id: string) => void; onAddTicket: () => void;
}) {
  const { t } = useTranslation();
  // The line under the name is the ENGINE in both renderings (founder, 5 Sep
  // 2026): the provider's mark and the model's short name. The simple
  // rendering keeps the role's first sentence after it, on the same line, so
  // when the column is narrow the role is what goes first and the model is
  // what stays.
  const role = technical ? undefined : firstSentence(a.description);
  const own = a.recentAssistantText?.trim();
  const update = own ? { text: own, ts: a.recentTextTs } : last ? { text: describeEntry(last, t, technical), ts: last.ts } : null;
  const fresh = !update && !ticket && (a.status === 'idle' || a.status === 'ghost');
  const ctx = a.contextLimit && a.contextTokens !== undefined ? Math.min(100, Math.round((a.contextTokens / a.contextLimit) * 100)) : null;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  // W-C: the accent ring for the beat a message is moving to or from here.
  const beat = useBeat(a.id);
  const tail = useTerminalTail(a.ptyId);

  return (
    <Card onOpen={onOpen} ariaLabel={a.name} className="pro-agent-card" dataAttrs={{ 'data-agent': a.id }}
      style={{ aspectRatio: '1 / 1', padding: 14, position: 'relative', boxShadow: beat ? BEAT_RING : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 92, minWidth: 0 }}>
        {/* Bare and card-sized (pilot item 15): no chip behind the face, one
            sprite step larger than a list row's. */}
        <SpritePortrait character={a.character} size={56} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
          <EngineLine provider={a.provider} model={a.model} after={role} style={{ marginTop: 2 }} />
        </div>
      </div>
      <span style={{ position: 'absolute', top: 14, right: 14 }}><StatusChip status={a.status} raw={a.action} /></span>

      <div style={{ flex: 1, minHeight: 0, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {/* 7.5 and 7.6. The ticket slot always holds something: the card the
            agent is on, or the way to give it one. The Add button is not a
            placeholder for a ticket, it WRITES one. */}
        {ticket ? (
          <button type="button" title={ticket.title} onClick={(e) => { stop(e); onTicket(ticket.id); }} style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0, padding: '4px 7px', borderRadius: 7,
            border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', font: 'inherit', fontSize: 12, color: 'var(--cth-ink-900)', cursor: 'pointer', textAlign: 'start'
          }}>
            <span style={{ fontFamily: 'var(--cth-font-figures)', fontSize: 11, color: 'var(--cth-ink-500)', flexShrink: 0 }}>{ticket.id}</span>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticket.title}</span>
          </button>
        ) : (
          <button type="button" title={t('pro.agents.addTicketTitle', { name: a.name })} onClick={(e) => { stop(e); onAddTicket(); }} style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0, padding: '4px 7px', borderRadius: 7,
            border: '1px dashed var(--cth-ink-300)', background: 'transparent', font: 'inherit', fontSize: 12, color: 'var(--cth-ink-500)', cursor: 'pointer', textAlign: 'start'
          }}>
            <ProIcon name="plus" size={12} />
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('pro.agents.addTicket')}</span>
          </button>
        )}
        {update ? (
          <div style={{ fontSize: 12.5, color: 'var(--cth-ink-700)', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {update.text}
            {update.ts ? <time style={{ fontFamily: 'var(--cth-font-figures)', color: 'var(--cth-ink-500)', fontSize: 11 }}> · {fmtWhen(update.ts, locale)}</time> : null}
          </div>
        ) : fresh ? (
          <div style={{ fontSize: 12.5, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>
            {t('pro.agents.fresh')}<br />{t('pro.agents.freshHint')}
          </div>
        ) : null}
        {/* 7.7. The agent's OWN terminal, said to be the terminal. */}
        {tail.length > 0 && (
          <div style={{ marginTop: 'auto', minWidth: 0, flexShrink: 0 }}>
            <div style={{ fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cth-ink-500)', marginBottom: 3 }}>{t('pro.agents.terminalTail')}</div>
            <div style={{
              fontFamily: 'var(--cth-font-figures)', fontSize: 10, lineHeight: '14px', color: 'var(--cth-ink-500)',
              border: '1px solid var(--cth-ink-300)', borderRadius: 7, background: 'var(--cth-cream-100)', padding: '4px 6px', overflow: 'hidden'
            }}>
              {tail.map((line, i) => (
                <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={line}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!fresh && ctx !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--cth-ink-500)', marginTop: 8, width: '100%' }}>
          {technical ? <span style={{ fontFamily: 'var(--cth-font-figures)' }}>{ctx}%</span> : <span>{t('pro.agents.context')}</span>}
          <div style={{ flex: 1 }}><Meter pct={ctx} /></div>
          <span style={{ fontFamily: 'var(--cth-font-figures)' }}>{technical ? fmtK(a.contextLimit ?? 0) : `${ctx}%`}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', width: '100%' }}>
        {!fresh && tokens !== null && <Chip title={t('pro.agents.tokensTitle')} style={{ fontFamily: 'var(--cth-font-figures)' }}>{fmtK(tokens)} tok</Chip>}
        {breaker && breaker !== 'healthy' && <Chip tone={breaker === 'steering' ? 'warn' : 'bad'}>{t(`pro.agents.level.${breaker}`)}</Chip>}
        <span style={{ flex: 1 }} />
        <Btn size="sm" onClick={onOpen} style={{ height: 24 }} title={t('pro.agents.promptTitle', { name: a.name })}>{t('pro.agents.promptBtn')}</Btn>
      </div>
    </Card>
  );
}

/* ---- the prompt bar ------------------------------------------------------ */

function PromptBar({ god, godName, onOpen }: { god: Agent; godName: string; onOpen: () => void }) {
  const { t } = useTranslation();
  const text = useStore((s) => s.drafts[god.id] ?? '');
  const setDraft = useStore((s) => s.setDraft);
  const enqueueMessage = useStore((s) => s.enqueueMessage);
  const ff = useFreeflow();
  const recording = ff.targetAgentId === god.id && ff.status === 'recording';
  const transcribing = ff.targetAgentId === god.id && ff.status === 'transcribing';
  const [files, setFiles] = useState<{ path: string; name: string }[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const send = () => {
    const body = files.length
      ? (text.trim() ? `${text}\n\nAttached files:\n` : 'Attached files:\n') + files.map((f) => `- ${f.path} (${f.name})`).join('\n')
      : text;
    if (!body.trim()) return;
    enqueueMessage(god.id, body);
    void window.cth.trackMessageSent?.('composer');
    setDraft(god.id, '');
    setFiles([]);
  };
  // ONE door for the paperclip and the drop zone (5 Sep 2026: this prompt bar
  // had no drop lane, the third composer to miss it — hence dropZone.tsx).
  const addFiles = (incoming: { path: string; name: string }[]) =>
    setFiles((prev) => {
      const fresh = collectDroppedAttachments(incoming, prev.map((p) => p.path));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  const attach = async (want: AttachWant) => {
    const res = await window.cth.attachFiles(want);
    if (res.ok) addFiles(res.files);
  };

  return (
    <div style={{ position: 'relative', borderTop: '1px solid var(--cth-ink-300)', padding: '10px 12px', cursor: 'default' }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <DropZone onFiles={addFiles} />
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {files.map((f) => (
            <Chip key={f.path} title={f.path}>
              <span style={{ maxWidth: 110, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{f.name}</span>
              <button type="button" onClick={() => setFiles((p) => p.filter((x) => x.path !== f.path))} aria-label={t('queueComposer.removeAttachment')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cth-ink-500)', padding: 0, font: 'inherit' }}>×</button>
            </Chip>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-300)', borderRadius: 10, padding: '4px 4px 4px 12px' }}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setDraft(god.id, e.target.value)}
          onPaste={(e) => { void attachmentsFromPaste(e).then((a) => { if (a.length) addFiles(a); }); }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (e.metaKey || e.ctrlKey) { onOpen(); return; }
            send();
          }}
          placeholder={recording ? t('queueComposer.recording') : transcribing ? t('queueComposer.transcribing') : t('pro.agents.prompt', { name: godName })}
          aria-label={t('pro.agents.prompt', { name: godName })}
          style={{ flex: 1, border: 'none', background: 'none', outline: 'none', height: 32, fontSize: 13, font: 'inherit', color: 'var(--cth-ink-900)', minWidth: 0 }}
        />
        {/* Files and folders (0.5.3, I8): one button on the Mac, one per kind
              where the picker cannot take both. */}
          {attachWants(window.cth.platform).map((w) => (
            <IconBtn key={w} name={w === 'folders' ? 'folder' : 'clip'} title={t(ATTACH_TITLE[w])} onClick={() => { void attach(w); }} />
          ))}
        <VoiceButton agentId={god.id} />
        <Btn kind="primary" size="sm" onClick={send} disabled={!text.trim() && !files.length} style={{ height: 30 }}>
          <ProIcon name="send" size={14} />{t('pro.agents.send')}
        </Btn>
      </div>
    </div>
  );
}

/* ---- pieces -------------------------------------------------------------- */

function Stat({ label, children, onClick, title }: { label: string; children: React.ReactNode; onClick?: () => void; title?: string }) {
  const body = (
    <>
      <span style={{ display: 'block', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cth-ink-500)' }}>{label}</span>
      {children}
    </>
  );
  const base: React.CSSProperties = { minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'start' };
  if (!onClick) return <div style={base}>{body}</div>;
  return (
    <button type="button" title={title} onClick={(e) => { e.stopPropagation(); onClick(); }} style={{ ...base, cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
      {body}
    </button>
  );
}

function Value({ children, accent, hot, mono }: { children: React.ReactNode; accent?: boolean; hot?: boolean; mono?: boolean }) {
  return (
    <span className="pro-stat-value" style={{
      display: 'flex', alignItems: 'baseline', gap: 5, fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      fontFamily: mono ? 'var(--cth-font-figures)' : undefined,
      color: hot ? 'var(--cth-status-waiting)' : accent ? 'var(--cth-accent-text)' : 'var(--cth-ink-900)'
    }}>
      {children}
    </span>
  );
}

/* ---- 7.6, giving an agent a ticket --------------------------------------- *
 * TWO WRITES, IN THIS ORDER, AND NEITHER IS OPTIONAL:
 *
 *   1. window.cth.hiveAddTask       a real card in the task ledger, assigned
 *                                   to this agent, status todo. The same door
 *                                   the Slack promotion path uses, so the card
 *                                   is indistinguishable from any other and
 *                                   shows up on the Tasks board immediately.
 *   2. enqueueMessage(..., fromHuman) the agent is TOLD. A card written into a
 *                                   file the agent is not reading is not an
 *                                   assignment, it is a note to yourself, and
 *                                   the founder asked for "creates one AND
 *                                   messages the agent" for exactly that
 *                                   reason.
 *
 * If the ledger write fails, nothing is sent: an agent briefed on a card that
 * does not exist would go looking for it. The sheet stays open with the text
 * still in it so the person can retry rather than retype.
 */
function NewTicketSheet({ agent, onClose, onMade }: { agent: Agent; onClose: () => void; onMade: () => void }) {
  const { t } = useTranslation();
  const enqueueMessage = useStore((s) => s.enqueueMessage);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const clean = title.trim();
    if (!clean || busy) return;
    setBusy(true);
    const id = `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const task: HiveTask = {
      id,
      title: clean,
      description: detail.trim() || undefined,
      assignee: agent.id,
      status: 'todo',
      dependsOn: [],
      priority: 1,
      createdAt: new Date().toISOString()
    };
    const res = await window.cth.hiveAddTask(task).catch(() => ({ ok: false as const }));
    setBusy(false);
    if (!res.ok) { proToast(t('pro.agents.ticketFailed'), { tone: 'bad' }); return; }
    // The brief carries what was typed and the standing contract every card
    // has, in that order. An empty detail leaves no gap.
    const brief = [t('pro.agents.ticketBrief', { id, title: clean }), detail.trim(), t('pro.agents.ticketBriefEnd')].filter(Boolean).join('\n\n');
    enqueueMessage(agent.id, brief, { fromHuman: true });
    void window.cth.trackMessageSent?.('composer');
    proToast(t('pro.agents.ticketMade', { name: agent.name }));
    onMade();
    onClose();
  };

  return (
    <Sheet onClose={onClose} width={520}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--cth-ink-300)' }}>
        <SpritePortrait character={agent.character} size={28} />
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0 }}>{t('pro.agents.newTicketTitle', { name: agent.name })}</h2>
        <CloseX onClick={onClose} title={t('common.close')} />
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <Field label={t('pro.agents.ticketTitleLabel')}>
          <input
            autoFocus
            aria-label={t('pro.agents.ticketTitleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void create(); } }}
            placeholder={t('pro.agents.ticketTitlePlaceholder')}
            style={inputStyle}
          />
        </Field>
        <Field label={t('pro.agents.ticketDetailLabel')} hint={t('pro.agents.ticketDetailHint')}>
          <textarea
            aria-label={t('pro.agents.ticketDetailLabel')}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={t('pro.agents.ticketDetailPlaceholder')}
            style={{ ...textareaStyle, minHeight: 92 }}
          />
        </Field>
        {/* What the button is about to do, in words, before it is pressed. */}
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.45, color: 'var(--cth-ink-500)' }}>{t('pro.agents.ticketWhat', { name: agent.name })}</p>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--cth-ink-300)' }}>
        <span style={{ flex: 1 }} />
        <Btn onClick={onClose}>{t('common.cancel')}</Btn>
        <Btn kind="primary" onClick={() => { void create(); }} disabled={!title.trim() || busy}>{t('pro.agents.ticketCreate')}</Btn>
      </div>
    </Sheet>
  );
}

/* ---- data ---------------------------------------------------------------- */

const TICKET_ORDER: Record<string, number> = { doing: 0, blocked: 1, todo: 2 };

/** The card the agent is on: doing first, then blocked, then todo. Done cards
 *  are not "the ticket" any more. */
export function ticketFor(agentId: string, tasks: HiveTask[] | null): HiveTask | null {
  if (!tasks) return null;
  const mine = tasks.filter((x) => x.assignee === agentId && x.status !== 'done');
  if (mine.length === 0) return null;
  mine.sort((a, b) => (TICKET_ORDER[a.status] ?? 9) - (TICKET_ORDER[b.status] ?? 9));
  return mine[0];
}

function firstSentence(s: string): string {
  const m = s.trim().split(/(?<=[.!?])\s/)[0];
  return m ?? s;
}

function ctxLine(a: Agent, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (!a.contextLimit || a.contextTokens === undefined) return '';
  return t('pro.agents.ctxOf', { pct: Math.min(100, Math.round((a.contextTokens / a.contextLimit) * 100)), cap: fmtK(a.contextLimit) });
}

/* ---- 7.7, the last lines of the agent's terminal -------------------------- *
 *
 * THE ROUTE, AND WHY THE OTHER TWO WERE WRONG.
 *
 * The brief offered two ways: main keeps a per agent tail and the renderer
 * asks for it, or the card falls back to the activity digest. Neither is
 * needed, and one of them is dishonest.
 *
 *   the digest    already reaches this screen (useLastActivity) and is already
 *                 drawn, as the update line, which is what it is. It is a
 *                 sentence the app WROTE about a hook event. Putting it under
 *                 a heading that says "terminal" would be a caption lying
 *                 about its picture, and it would double the same fact on one
 *                 card.
 *   a tail in     main sees the pty stream as RAW BYTES keyed by pty id, and
 *   main          those bytes are a repainting TUI: cursor addressing, erases,
 *                 partial frames. Turning them into lines needs a terminal
 *                 emulator, which main does not have and should not grow. A
 *                 tail built there would be shredded frame fragments, and the
 *                 renderer already runs the emulator that resolves them.
 *
 * The stream IS here, for every agent, all the time. App.tsx pre-warms a
 * pooled xterm for every agent that has a live session, and terminalPool
 * subscribes each one to `pty:data` for its whole lifetime specifically so its
 * buffer keeps filling while no view is mounted. So the honest source for "the
 * last three lines of terminal output" is the terminal's own buffer, already
 * emulated, already correct, with no new IPC, no new state and nothing kept in
 * main. The bound comes free: xterm owns the buffer, this only ever reads the
 * bottom TAIL_SCAN_ROWS rows of it, and the entry goes away with the agent
 * (disposeTerminal) so nothing outlives the session or reaches disk.
 *
 * acquireTerminal is called only for an agent that HAS a ptyId, which is the
 * exact set App pre-warms, so in practice this always hits an existing entry
 * rather than creating one. If it ever did create one it would build the same
 * terminal App was about to, with the same defaults the attaching view
 * re-applies anyway.
 *
 * Polled, not subscribed: the pool entry is a mutable object no component
 * listens to, which is the same reason useHasTerminalDraft polls it. Two
 * seconds of lag on three lines of context is invisible, and `sameTail` keeps
 * an unchanged screen from re-rendering the grid.
 */
function useTerminalTail(ptyId: string | undefined, everyMs = 2000): string[] {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    if (!ptyId) { setLines([]); return; }
    const read = () => {
      let next: string[] = [];
      try {
        const buf = acquireTerminal(ptyId).term.buffer.active;
        const bottom = buf.baseY + buf.cursorY;
        const rows: string[] = [];
        for (let y = Math.max(0, bottom - TAIL_SCAN_ROWS); y <= bottom; y++) {
          // `true` trims the trailing whitespace cells a TUI pads its box with.
          rows.push(buf.getLine(y)?.translateToString(true) ?? '');
        }
        next = terminalTail(rows);
      } catch { return; /* the terminal is being torn down; keep the last read */ }
      setLines((prev) => (sameTail(prev, next) ? prev : next));
    };
    read();
    const id = window.setInterval(read, everyMs);
    return () => window.clearInterval(id);
  }, [ptyId, everyMs]);
  return lines;
}

/** Running temps, the same poll the sidebar uses. */
function useRunningTemps(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const api = window.cth;
    if (!api?.listWorkers) return;
    let alive = true;
    const tick = () => { api.listWorkers().then((r) => { if (alive) setN(r.live.length); }).catch(() => { /* keep the last count */ }); };
    tick();
    const id = window.setInterval(tick, 5000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);
  return n;
}

// Small hover lift for cards, one rule, respecting reduced motion (global.css
// already zeroes transitions under prefers-reduced-motion).
//
// 7.4: the `small` suffix used to be pushed back to --cth-font-ui, which put
// "of $50" and "doing · 1 blocked" in Inter right beside the figure they
// belong to in the terminal's face. The suffix carries figures of its own, so
// it reads in the same face as the number it qualifies.
const style = document.createElement('style');
style.textContent = '.pro-agent-card{transition:transform 80ms,box-shadow 80ms}.pro-agent-card:hover{box-shadow:var(--cth-shadow-hard);transform:translateY(-1px)}.pro-stat-value small{font-size:11.5px;font-weight:500;color:var(--cth-ink-500);font-family:var(--cth-font-figures)}';
if (typeof document !== 'undefined' && !document.getElementById('pro-agents-style')) { style.id = 'pro-agents-style'; document.head.appendChild(style); }

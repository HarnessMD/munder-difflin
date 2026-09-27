/**
 * INBOX: one list of conversations on the left, the open one on the right.
 * Prototype of record: hive/shared/design/app-v2/prototype.html (v2).
 *
 * REBUILT 3 Sep 2026 (v0.4.9 phase 3). The founder's words: "Open chats are
 * vague, I do not know what does what", and "basically a better way of knowing
 * what a particular agent is working on, was working on, what are we talking to
 * them". Four generic rows cannot answer that however well they are drawn, so
 * the list now has A ROW PER AGENT, each opening the SAME thread the agent's
 * own screen shows (AgentInbox), with the same composer under it. There is one
 * implementation of an agent conversation in the app, and it is reached from
 * two places.
 *
 * THE SECTIONS, EACH OVER A DOOR THAT ALREADY EXISTED:
 *   For you   Ask me      hive:tasks, the open humanQA on blocked cards; answer
 *                         and dismiss through askMeActions, the same protocol
 *                         the Classic ASK ME tab speaks.
 *             Orchestrator his own highlighted card, pinned under Ask me and
 *                         OUT of the team list (founder item 8): accent
 *                         hairline, a chip naming what he is.
 *   Your team one row per worker, most recently used first (item 4, via
 *                         @shared/agentRecency, the same comparator the
 *                         sidebar reads): sprite, what it is doing right now
 *                         (the activity digest), and what is still waiting to
 *                         be sent to it. Sections fold from their headers and
 *                         the folds are remembered (cth.proInboxFolds).
 *   Everyone  Floor       hive:messages (bodies redacted main-side), refreshed
 *                         on hive:message: every message between every agent,
 *                         including the orchestrator's own. A message from you
 *                         goes to the god as a request and STAYS ON SCREEN
 *                         while the ledger catches up, which it did not before.
 *   Outside   Slack       slack:history (main/slackHistory.ts): what Slack
 *                         threads sent us and what we posted back. A reply
 *                         needs an explicit thread, so it is offered per row.
 *             Webhooks    triggerHistory:list, source 'webhook'; a held row
 *                         offers Approve / Reject through triggerHistory:decide.
 *   Team      one row per teammate, in an org; the thread is Creed's
 *             CrossNodeThread rendered in place (its own store, its own send).
 *
 * WIDTH: the reading pane is fluid. Bubbles used to cap at 640px, which on a
 * wide window left most of the pane empty ("not full width, should cover the
 * rest of the screen width and be responsive"); the measure is now in `ch`, so
 * it follows the text, and the list column scales with the window.
 *
 * AVATARS: agents are sprites (founder, 2 Sep), people keep initials
 * (GlyphAvatar), a webhook or a Slack thread gets the section's icon.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import { useResolvedGodName } from '@/hooks/useResolvedGodName';
import type { TriggerHistoryEntry } from '@shared/triggers';
import type { SlackHistoryEntry } from '@shared/slackHistory';
import { resolvePollSeconds, resolveSlackMode, type SlackMode } from '@shared/slackMode';
import { stillPending, type PendingSend } from '@shared/inboxThread';
import { orderAgents } from '@shared/agentRecency';
import { clampLines, previewLine } from '@shared/lineClamp';
import { openQuestion, waitsOnHuman, type HiveTask } from '../TasksKanban';
import { compareByNewestAsk } from '../askMeOrder';
import { AskMeCard, useAskMeAct } from './AskMeCard';
import { CrossNodeThread } from '../team/CrossNodeThread';
import { usePaneNav } from '../professional/paneNav';
import type { ActivityEntry } from '@shared/activity';
import { GlyphAvatar } from '../team/primitives';
import { useRoster } from '../team/useRoster';
import { takeInboxChat } from './inboxIntent';
import { isInOrg, useTeamsMode } from '../team/teamsMode';
import type { Teammate } from '../team/types';
import { Btn, Chip, SearchBox, SetupEmpty, StatusChip, dayOf, fmtWhen, useAgentById, useNameFor } from './ui';
import { SpritePortrait } from '../SpritePortrait';
import { ProIcon, type ProIconName } from './icons';
import { useTaskLedger } from './taskData';
import { AgentInbox, Refs, SentStatus } from './AgentInbox';
import { Composer as AgentComposer } from './Composer';
import { describeEntry, useLastActivity } from './activityData';
import { useTechnical } from './depth';

/** Mirror of preload's VoiceMessage; the renderer does not import the preload
 *  package. Exported for the orchestrator's screen, whose Messages and
 *  Routing tabs read the same rows through `useFloor` below. */
export interface FloorMessage {
  id: string; conversation: string; from: string; to: string;
  act: 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done';
  subject: string; body: string; requires_reply: boolean;
  direction: 'inbox' | 'outbox'; owner: string; archived: boolean; created_at: string;
}

type Chat =
  | { id: 'askme'; kind: 'askme' }
  | { id: 'floor'; kind: 'floor' }
  | { id: 'slack'; kind: 'slack' }
  | { id: 'webhook'; kind: 'trigger'; source: 'webhook' }
  | { id: `agent:${string}`; kind: 'agent'; agent: Agent }
  | { id: `dm:${string}`; kind: 'dm'; mate: Teammate };

const ACT_TONE: Record<FloorMessage['act'], 'accent' | 'warn' | 'ok' | 'bad' | 'outline'> = {
  request: 'accent', query: 'warn', done: 'ok', agree: 'ok', refuse: 'bad', inform: 'outline', propose: 'outline'
};

/** The same measure the agent thread uses: wide enough to read, and it follows
 *  the text rather than a fixed pixel width that leaves a wide window empty. */
const BUBBLE = 'min(74ch, 86%)';

/** Which list sections are folded, remembered across launches (item 8) the
 *  same way the sidebar remembers its agent fold (cth.proAgentsOpen). */
const FOLDS_KEY = 'cth.proInboxFolds';
function readFolds(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(FOLDS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed as Record<string, boolean> : {};
  } catch { return {}; }
}

export function InboxScreen() {
  const { t, i18n } = useTranslation();
  const mode = useTeamsMode();
  const inOrg = isInOrg(mode);
  const roster = useRoster();
  const { tasks, refresh: refreshTasks } = useTaskLedger(5000);
  const floor = useFloor();
  const godName = useResolvedGodName();
  const slack = useSlack();
  const triggers = useTriggers();
  const agents = useStore((s) => s.agents);
  const queues = useStore((s) => s.messageQueues);
  const technical = useTechnical();
  const [chatId, setChatId] = useState<string>(() => takeInboxChat() ?? 'floor');
  const [query, setQuery] = useState('');
  const [folds, setFolds] = useState<Record<string, boolean>>(readFolds);
  const toggleFold = (id: string) => setFolds((prev) => {
    const next = { ...prev, [id]: !prev[id] };
    try { window.localStorage.setItem(FOLDS_KEY, JSON.stringify(next)); } catch { /* noop */ }
    return next;
  });

  // Most recently used first (founder item 4): the agent whose last activity
  // is newest leads, through the one shared comparator the sidebar reads too.
  // The orchestrator is exempt; he is pinned to his own card under Ask me.
  const lastActivity = useLastActivity(useMemo(() => agents.map((a) => a.id), [agents]));
  const team = useMemo(() => orderAgents(agents, (id) => lastActivity[id]?.ts), [agents, lastActivity]);

  const waiting = useMemo(() => (tasks ?? []).filter(waitsOnHuman).sort((a, b) => compareByNewestAsk(openQuestion(a), openQuestion(b))), [tasks]);
  const webhooks = triggers.filter((e) => e.source === 'webhook');
  const pendingWebhooks = webhooks.filter((e) => e.decision === 'pending').length;

  const chats: Chat[] = useMemo(() => {
    const out: Chat[] = [{ id: 'askme', kind: 'askme' }];
    for (const a of team) out.push({ id: `agent:${a.id}`, kind: 'agent', agent: a });
    out.push({ id: 'floor', kind: 'floor' }, { id: 'slack', kind: 'slack' }, { id: 'webhook', kind: 'trigger', source: 'webhook' });
    if (inOrg) for (const m of roster.teammates) out.push({ id: `dm:${m.id}`, kind: 'dm', mate: m });
    return out;
  }, [inOrg, roster.teammates, team]);
  const chat = chats.find((c) => c.id === chatId) ?? chats.find((c) => c.kind === 'floor')!;

  const q = query.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);

  const row = (c: Chat) => {
    const on = c.id === chat.id;
    let icon: ReactNode; let name: string; let sub: string; let count = 0; let when = ''; let right: ReactNode = null;
    switch (c.kind) {
      case 'askme': icon = <SectionIcon name="ask" tone="warn" />; name = t('pro.inbox.askme'); sub = t('pro.inbox.askmeSub'); count = waiting.length; when = fmtWhenOf(i18n.language, waiting[0] ? openQuestion(waiting[0])?.askedAt : undefined); break;
      case 'agent': {
        // What it is doing right now, in its own terms. The digest is the same
        // line the agent card shows, so the two never disagree; with no digest
        // yet the row says what the agent is rather than saying nothing.
        const last = lastActivity[c.agent.id];
        icon = <SpritePortrait character={c.agent.character} size={28} />;
        name = c.agent.name;
        // The digest line can carry an agent's own words verbatim (a notice,
        // a sent subject), so it goes through previewLine: raw Markdown syntax
        // read as literal asterisks and brackets in a one line row otherwise.
        sub = last ? previewLine(describeEntry(last, t, technical)) : (c.agent.isGod ? t('pro.inbox.godSub') : t('pro.inbox.agentIdle'));
        count = (queues[c.agent.id] ?? []).length;
        when = fmtWhenOf(i18n.language, last?.ts);
        right = <StatusChip status={c.agent.status} raw={c.agent.action} />;
        break;
      }
      case 'floor': icon = <SectionIcon name="agents" />; name = t('pro.inbox.routed'); sub = t('pro.inbox.routedSub', { god: godName }); when = fmtWhenOf(i18n.language, floor[0]?.created_at); break;
      case 'slack': icon = <SectionIcon name="slack" />; name = t('pro.inbox.slack'); sub = slackSubtitle(slack.status, t); when = fmtWhenOf(i18n.language, slack.rows[0]?.at); break;
      case 'trigger':
        icon = <SectionIcon name="hook" />;
        name = t('pro.inbox.webhooks');
        sub = t('pro.inbox.webhooksSub');
        count = pendingWebhooks;
        when = fmtWhenOf(i18n.language, webhooks[0]?.at);
        break;
      case 'dm': icon = <GlyphAvatar name={c.mate.name} presence={c.mate.presence} size={30} />; name = c.mate.name; sub = `${c.mate.machine} · ${t(`team.presence.${c.mate.presence}`)}`; break;
    }
    if (!matches(`${name} ${sub}`)) return null;
    // The orchestrator's card is HIGHLIGHTED, not merely first (item 8): an
    // accent hairline on all four sides and a chip naming what he is. The
    // background stays for the selected state, so selection still reads.
    const isGodCard = c.kind === 'agent' && c.agent.isGod === true;
    return (
      <button key={c.id} type="button" onClick={() => setChatId(c.id)} aria-current={on ? 'true' : undefined} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 9, cursor: 'pointer', font: 'inherit', textAlign: 'left',
        // The orchestrator chip is the only distinction (founder, 5 Sep 2026:
        // "does not need to have a border, just the badge is good enough").
        border: 'none',
        background: on ? 'var(--cth-accent-soft)' : 'transparent', color: 'var(--cth-ink-900)'
      }}>
        {icon}
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <b style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</b>
            {isGodCard && <Chip tone="accent" style={{ height: 16, fontSize: 9.5, padding: '0 5px', flexShrink: 0, alignSelf: 'center' }}>{t('pro.agents.orchestrator')}</Chip>}
            {when && <time style={{ fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', flexShrink: 0 }}>{when}</time>}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
            {right}
            {count > 0 && <span title={t('pro.inbox.waitingCount', { count })} style={{ flexShrink: 0, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--cth-accent)', color: 'var(--cth-accent-ink)', fontSize: 11, fontWeight: 600, display: 'inline-grid', placeItems: 'center' }}>{count}</span>}
          </span>
        </span>
      </button>
    );
  };

  // Each section folds from its header and the fold is remembered (item 8).
  // A search overrides a fold: a hidden row a query matches must still appear,
  // or the search box would lie about what exists.
  const section = (id: string, label: string, items: Chat[]) => {
    const rows = items.map(row).filter(Boolean);
    if (rows.length === 0) return null;
    const folded = !q && folds[id] === true;
    return (
      <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          type="button" data-section-fold={id} aria-expanded={!folded}
          title={folded ? t('pro.inbox.expandSection') : t('pro.inbox.collapseSection')}
          onClick={() => toggleFold(id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, width: '100%', padding: '10px 10px 4px',
            border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit', textAlign: 'left',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cth-ink-500)'
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
          <ProIcon name="chevronRight" size={10} style={{ transform: folded ? 'none' : 'rotate(90deg)', transition: 'transform 120ms', flexShrink: 0 }} />
        </button>
        {!folded && rows}
      </div>
    );
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      {/* The list column scales with the window instead of sitting at 290px:
          on a narrow window it gives the thread its room back, on a wide one it
          stops the names truncating. */}
      <div style={{ width: 'clamp(232px, 22%, 330px)', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)' }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid var(--cth-ink-300)', flexShrink: 0 }}>
          <SearchBox value={query} onChange={setQuery} placeholder={t('pro.inbox.search')} style={{ flex: 1, minWidth: 0 }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 8px 12px' }}>
          {/* The orchestrator sits UNDER the Ask me card, out of the team list
              (item 8): he is the door the work goes through, not one worker
              among the workers. `team` keeps him first, so he lands directly
              below Ask me. */}
          {section('forYou', t('pro.inbox.section.forYou'), chats.filter((c) => c.kind === 'askme' || (c.kind === 'agent' && c.agent.isGod === true)))}
          {section('team', t('pro.inbox.section.team'), chats.filter((c) => c.kind === 'agent' && c.agent.isGod !== true))}
          {section('everyone', t('pro.inbox.section.everyone'), chats.filter((c) => c.kind === 'floor'))}
          {section('outside', t('pro.inbox.section.outside'), chats.filter((c) => c.kind === 'slack' || c.kind === 'trigger'))}
          {inOrg && section('people', t('pro.inbox.section.people'), chats.filter((c) => c.kind === 'dm'))}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--cth-cream-50)' }}>
        {chat.kind === 'askme' && <AskMeThread tasks={waiting} refresh={refreshTasks} />}
        {/* The agent's own screen and this one draw the SAME thread and the
            SAME composer. Keyed by id so switching agents remounts the thread
            rather than scrolling one agent's history under another's name. */}
        {chat.kind === 'agent' && (
          <AgentChat key={chat.agent.id} agent={chat.agent} last={lastActivity[chat.agent.id]} />
        )}
        {chat.kind === 'floor' && <FloorThread messages={floor} />}
        {chat.kind === 'slack' && <SlackThread rows={slack.rows} running={slack.status.running} sub={slackSubtitle(slack.status, t)} />}
        {chat.kind === 'trigger' && <TriggerThread rows={webhooks} />}
        {chat.kind === 'dm' && <CrossNodeThread mate={chat.mate} />}
      </div>
    </div>
  );
}

/** One agent, in the Inbox: the header names it and says what it is doing, the
 *  thread is the agent screen's thread, and the composer is the agent screen's
 *  composer, so Send and Steer behave identically in both places. */
function AgentChat({ agent, last }: { agent: Agent; last?: ActivityEntry }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const nav = usePaneNav();
  return (
    <>
      <ThreadHeader
        icon={<SpritePortrait character={agent.character} size={28} />}
        title={agent.name}
        sub={last ? describeEntry(last, t, technical) : (agent.isGod ? t('pro.inbox.godSub') : t('pro.inbox.agentIdle'))}
        right={
          <>
            <StatusChip status={agent.status} raw={agent.action} />
            <Btn size="sm" onClick={() => nav.go(`agent:${agent.id}`)}>{t('pro.inbox.openAgent')}</Btn>
          </>
        }
      />
      <AgentInbox agent={agent} />
      <AgentComposer agent={agent} />
    </>
  );
}

/* ---- threads ------------------------------------------------------------- */

function AskMeThread({ tasks, refresh }: { tasks: HiveTask[]; refresh: () => Promise<void> }) {
  const { t } = useTranslation();
  const { busy, act } = useAskMeAct(refresh);
  return (
    <>
      <ThreadHeader icon={<SectionIcon name="ask" tone="warn" />} title={t('pro.inbox.askme')} sub={t('pro.inbox.askmeCount', { count: tasks.length })} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tasks.length === 0 && <EmptyThread>{t('pro.inbox.askmeEmpty')}</EmptyThread>}
        {tasks.map((task) => (
          <AskMeCard key={task.id} task={task} busy={busy} onAct={(x, what) => void act(x, what)} style={{ maxWidth: BUBBLE }} />
        ))}
      </div>
    </>
  );
}

function FloorThread({ messages }: { messages: FloorMessage[] }) {
  const { t, i18n } = useTranslation();
  const agents = useStore((s) => s.agents);
  const god = agents.find((a) => a.isGod);
  const godName = useResolvedGodName();
  const nameFor = useNameFor();
  const agentById = useAgentById();
  const { tasks } = useTaskLedger(15_000);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // A message he sent that the ledger has not returned yet. It is the reason
  // his own message "vanished": `hive:send` writes a mailbox file and
  // `hive:messages` reads mailboxes back, so there is a poll between the two,
  // and the draft was cleared into it.
  const [pending, setPending] = useState<PendingSend[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages.length, pending.length]);
  useEffect(() => { setPending((p) => stillPending(p, messages.map((m) => m.body))); }, [messages]);
  // Same clamp and the same per message memory as the agent thread: keyed by
  // message id, so it survives a poll appending new rows, and reset only when
  // this thread itself unmounts.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleExpanded = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const byId = useMemo(() => new Map((tasks ?? []).map((x) => [x.id, x])), [tasks]);
  const knownIds = useMemo(() => (tasks ?? []).map((x) => x.id), [tasks]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    const key = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const first = body.split('\n')[0].slice(0, 80);
    // On screen BEFORE the door is touched, and the draft is cleared in the
    // same breath, so the box empties and the message is already in the thread.
    setPending((p) => [...p, { key, subject: first, body, at: Date.now(), status: 'sending' }]);
    setDraft('');
    setNote(null);
    setSending(true);
    const res = await window.cth.hiveSend({ to: 'god', act: 'request', subject: first, body }, 'human').catch((e) => ({ ok: false, error: String(e) }));
    const error = res.ok ? undefined : ((res as { error?: string }).error ?? t('pro.sheet.failed'));
    setPending((p) => p.map((x) => (x.key === key ? { ...x, status: res.ok ? 'sent' : 'failed', error } : x)));
    if (!res.ok) setNote(error ?? null);
    setSending(false);
  };

  // Oldest at the top. Sorted here rather than reversed: the door returns
  // newest first, but a thread must read in time order whatever it returns.
  const ordered = [...messages].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const items: ReactNode[] = [];
  let lastDay = '';
  for (const m of ordered) {
    const day = dayOf(m.created_at, i18n.language);
    const label = day.key === 'date' ? day.text : t(`pro.inbox.${day.key}`);
    if (label !== lastDay) { items.push(<DaySep key={`d-${m.id}`}>{label}</DaySep>); lastDay = label; }
    const me = m.from === 'human';
    const sender = agentById(m.from);
    const toLabel = m.to === 'broadcast' ? t('pro.inbox.everyone') : m.to === 'human' ? t('pro.you') : nameFor(m.to);
    items.push(
      <div key={m.id} style={{ display: 'flex', gap: 8, justifyContent: me ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
        {!me && (sender ? <SpritePortrait character={sender.character} size={28} /> : <SectionIcon name="agents" />)}
        <div style={{ maxWidth: BUBBLE, padding: '8px 12px', borderRadius: 12, background: me ? 'var(--cth-accent-soft)' : 'var(--cth-cream-100)', border: `1px solid ${me ? 'var(--cth-accent-line)' : 'var(--cth-ink-300)'}`, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--cth-ink-700)', fontWeight: 600, flexWrap: 'wrap' }}>
            <span>{me ? t('pro.you') : nameFor(m.from)}</span>
            {!me && <Chip tone={ACT_TONE[m.act]}>{m.act}</Chip>}
            {toLabel && <span style={{ fontWeight: 400, color: 'var(--cth-ink-500)' }}>→ {toLabel}</span>}
            {m.requires_reply && !me && <Chip tone="warn">{t('pro.inbox.needsReply')}</Chip>}
          </div>
          {m.subject && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{m.subject}</div>}
          <ClampedPlainBody source={m.body} expanded={expanded.has(m.id)} onToggle={() => toggleExpanded(m.id)} />
          <Refs text={`${m.subject} ${m.body}`} byId={byId} knownIds={knownIds} />
          <div style={{ fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', alignSelf: 'flex-end' }}>{fmtWhen(m.created_at, i18n.language)}</div>
        </div>
      </div>
    );
  }
  for (const p of pending) {
    items.push(
      <div key={p.key} style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', maxWidth: '100%' }}>
        <div style={{ maxWidth: BUBBLE, padding: '8px 12px', borderRadius: 12, background: 'var(--cth-accent-soft)', border: '1px solid var(--cth-accent-line)', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--cth-ink-700)', fontWeight: 600 }}>{t('pro.you')}</div>
          <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--cth-ink-900)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.body}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', alignSelf: 'flex-end' }}>
            <span>{fmtWhen(p.at, i18n.language)}</span>
            <SentStatus sent={{ id: p.key, text: p.body, ts: p.at, status: p.status === 'sending' ? 'queued' : p.status === 'failed' ? 'failed' : 'sent' }} />
          </div>
          {p.error && <div style={{ fontSize: 11, color: 'var(--cth-status-blocked)' }}>{p.error}</div>}
        </div>
      </div>
    );
  }

  return (
    <>
      <ThreadHeader icon={<SectionIcon name="agents" />} title={t('pro.inbox.routed')} sub={t('pro.inbox.routedSub', { god: godName })} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && pending.length === 0 && <EmptyThread>{t('pro.inbox.agentsEmpty')}</EmptyThread>}
        {items}
        <div ref={bottom} />
      </div>
      <ThreadComposer
        to={god ? t('pro.inbox.toGod', { name: god.name }) : t('pro.inbox.noGod')}
        value={draft} onChange={setDraft} onSend={() => void send()} disabled={!god || sending} note={note}
      />
    </>
  );
}

/** The Slack row's second line, by the way Slack reaches the office (0.4.11):
 *  polling says how often it asks, the socket says whether it is up, the
 *  webhook keeps its listening line, and off says where to turn it on. */
function slackSubtitle(s: SlackLiveStatus, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (!s.running) return t('pro.inbox.slackOff');
  if (s.mode === 'polling') {
    const sec = s.pollSeconds;
    const every = sec < 60 ? t('pro.inbox.everySeconds', { n: sec }) : sec === 60 ? t('pro.inbox.everyMinute') : t('pro.inbox.everyMinutes', { n: Math.round(sec / 60) });
    return t('pro.inbox.slackPolling', { every });
  }
  if (s.mode === 'socket') return s.socketConnectedAt ? t('pro.inbox.slackSocketOn') : t('pro.inbox.slackSocketReconnecting');
  return t('pro.inbox.slackOn');
}

function SlackThread({ rows, running, sub }: { rows: SlackHistoryEntry[]; running: boolean; sub: string }) {
  const { t, i18n } = useTranslation();
  // Slack carries whatever an agent posted there, so a row here is exactly as
  // long as a room message and gets exactly the same clamp. The floor thread
  // fixed this first; leaving Slack unbounded just moved the wall of text one
  // tab across.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const [replyTo, setReplyTo] = useState<SlackHistoryEntry | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const send = async () => {
    const text = draft.trim();
    if (!text || !replyTo || sending) return;
    setSending(true);
    const res = await window.cth.slackReply({ channel: replyTo.channel, thread_ts: replyTo.thread_ts, text }).catch((e) => ({ ok: false, error: String(e) }));
    if (res.ok) { setDraft(''); setNote(null); } else setNote(res.error ?? t('pro.sheet.failed'));
    setSending(false);
  };
  const ordered = [...rows].sort((a, b) => a.at - b.at);
  const items: ReactNode[] = [];
  let lastDay = '';
  for (const r of ordered) {
    const day = dayOf(r.at, i18n.language);
    const label = day.key === 'date' ? day.text : t(`pro.inbox.${day.key}`);
    if (label !== lastDay) { items.push(<DaySep key={`d-${r.id}`}>{label}</DaySep>); lastDay = label; }
    const out = r.direction === 'outbound';
    items.push(
      <div key={r.id} style={{ display: 'flex', gap: 8, justifyContent: out ? 'flex-end' : 'flex-start' }}>
        {!out && <SectionIcon name="slack" />}
        <div style={{ maxWidth: BUBBLE, padding: '8px 12px', borderRadius: 12, background: out ? 'var(--cth-accent-soft)' : 'var(--cth-cream-100)', border: `1px solid ${out ? 'var(--cth-accent-line)' : 'var(--cth-ink-300)'}`, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>{r.channel} · {r.thread_ts}</div>
          <ClampedPlainBody source={r.text} expanded={expanded.has(r.id)} onToggle={() => toggleExpanded(r.id)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>
            <span>{fmtWhen(r.at, i18n.language)}</span>
            {out && (r.ok ? <span style={{ color: 'var(--cth-status-working)' }}>✓✓ {t('pro.inbox.posted')}</span> : <span style={{ color: 'var(--cth-status-blocked)' }}>{t('pro.inbox.postFailed', { error: r.error ?? '?' })}</span>)}
            <span style={{ flex: 1 }} />
            <Btn size="sm" kind={replyTo?.id === r.id ? 'primary' : 'ghost'} onClick={() => setReplyTo(r)}>{t('pro.inbox.reply')}</Btn>
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      <ThreadHeader icon={<SectionIcon name="slack" />} title={t('pro.inbox.slack')} sub={sub} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Not listening is a DIFFERENT state from listening and quiet, and the
            founder asked for the difference to be drawn (3 Sep 2026): one is
            three steps away from working, the other is working already. */}
        {rows.length === 0 && !running && (
          <SetupEmpty
            icon="slack" title={t('pro.inbox.slackSetup.title')} lead={t('pro.inbox.slackSetup.lead')}
            steps={[t('pro.inbox.slackSetup.s1'), t('pro.inbox.slackSetup.s2'), t('pro.inbox.slackSetup.s3')]}
            action={{ label: t('pro.inbox.openConnections'), run: openConnections }}
          />
        )}
        {rows.length === 0 && running && <EmptyThread>{t('pro.inbox.slackEmpty')}</EmptyThread>}
        {items}
      </div>
      <ThreadComposer
        to={replyTo ? t('pro.inbox.toThread', { channel: replyTo.channel, thread: replyTo.thread_ts }) : t('pro.inbox.pickThread')}
        value={draft} onChange={setDraft} onSend={() => void send()} disabled={!replyTo || sending} note={note}
      />
    </>
  );
}

function TriggerThread({ rows }: { rows: TriggerHistoryEntry[] }) {
  const { t, i18n } = useTranslation();
  const nav = usePaneNav();
  const [busy, setBusy] = useState<string | null>(null);
  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setBusy(id);
    try { await window.cth.decideTriggerHistory({ id, decision }); } catch { /* the ledger event refreshes the list */ }
    setBusy(null);
  };
  const tone = (d: TriggerHistoryEntry['decision']): 'ok' | 'warn' | 'bad' | 'outline' =>
    d === 'approved' || d === 'auto-allowed' ? 'ok' : d === 'pending' ? 'warn' : d === 'rejected' ? 'bad' : 'outline';
  const ordered = [...rows].sort((a, b) => a.at - b.at);
  const items: ReactNode[] = [];
  let lastDay = '';
  for (const r of ordered) {
    const day = dayOf(r.at, i18n.language);
    const label = day.key === 'date' ? day.text : t(`pro.inbox.${day.key}`);
    if (label !== lastDay) { items.push(<DaySep key={`d-${r.id}`}>{label}</DaySep>); lastDay = label; }
    const out = r.direction === 'outbound';
    items.push(
      <div key={r.id} style={{ display: 'flex', gap: 8, justifyContent: out ? 'flex-end' : 'flex-start' }}>
        {!out && <SectionIcon name="hook" />}
        <div style={{ maxWidth: BUBBLE, padding: '8px 12px', borderRadius: 12, background: out ? 'var(--cth-accent-soft)' : 'var(--cth-cream-100)', border: `1px solid ${out ? 'var(--cth-accent-line)' : 'var(--cth-ink-300)'}`, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--cth-ink-700)', flexWrap: 'wrap' }}>
            <span>{r.sourceName || r.peer}</span>
            {r.decision && <Chip tone={tone(r.decision)}>{t(`pro.inbox.decision.${r.decision}`)}</Chip>}
            {r.taskId && <span style={{ fontWeight: 400, fontFamily: 'var(--cth-font-mono)', color: 'var(--cth-ink-500)' }}>{r.taskId}</span>}
          </div>
          {r.title && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{r.title}</div>}
          <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--cth-ink-900)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 220, overflowY: 'auto' }}>{r.body}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>
            <span>{fmtWhen(r.at, i18n.language)}</span>
            {r.decision === 'pending' && (
              <>
                <span style={{ flex: 1 }} />
                <Btn size="sm" kind="primary" disabled={busy === r.id} onClick={() => void decide(r.id, 'approved')}>{t('pro.inbox.approve')}</Btn>
                <Btn size="sm" kind="ghost" disabled={busy === r.id} onClick={() => void decide(r.id, 'rejected')}>{t('pro.inbox.reject')}</Btn>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      <ThreadHeader icon={<SectionIcon name="hook" />} title={t('pro.inbox.webhooks')} sub={t('pro.inbox.webhooksSub')} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.length === 0 && (
          <SetupEmpty
            icon="hook" title={t('pro.inbox.hookSetup.title')} lead={t('pro.inbox.hookSetup.lead')}
            steps={[t('pro.inbox.hookSetup.s1'), t('pro.inbox.hookSetup.s2'), t('pro.inbox.hookSetup.s3')]}
            action={{ label: t('pro.inbox.openAutomations'), run: () => nav.go('automations') }}
          />
        )}
        {items}
      </div>
    </>
  );
}

/* ---- pieces -------------------------------------------------------------- */

/** Settings, on the Connections tab. The deep link the app already uses, so
 *  this button lands where the tokens are typed rather than at the top of
 *  Settings with the person hunting for the right tab. */
function openConnections(): void {
  window.dispatchEvent(new CustomEvent('cth:open-settings', { detail: { section: 'Connections' } }));
}

function ThreadHeader({ icon, title, sub, right }: { icon: ReactNode; title: string; sub: string; right?: ReactNode }) {
  return (
    <div style={{ height: 52, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', borderBottom: '1px solid var(--cth-ink-300)', flexShrink: 0 }}>
      {icon}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

/** The footer under a thread that is NOT an agent's. An agent's thread gets
 *  the real composer (queue, steer, attachments); Slack and the floor take one
 *  box and one Send, because that is all their doors accept. */
function ThreadComposer({ to, value, onChange, onSend, disabled, note }: { to: string; value: string; onChange: (v: string) => void; onSend: () => void; disabled?: boolean; note?: string | null }) {
  const { t } = useTranslation();
  return (
    <div style={{ borderTop: '1px solid var(--cth-ink-300)', padding: '10px 18px 14px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
      <div style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{to}{note && <span style={{ color: 'var(--cth-status-blocked)', marginLeft: 8 }}>{note}</span>}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)} rows={2} disabled={disabled}
          placeholder={t('pro.inbox.write')}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSend(); } }}
          style={{ flex: 1, resize: 'vertical', font: 'inherit', fontSize: 13, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', color: 'var(--cth-ink-900)', outline: 'none', minHeight: 40 }}
        />
        <Btn kind="primary" onClick={onSend} disabled={disabled || !value.trim()}><ProIcon name="send" size={14} />{t('pro.inbox.send')}</Btn>
      </div>
    </div>
  );
}

/**
 * The floor's messages are plain text, not Markdown, so this is the plain
 * text twin of AgentInbox's ClampedMarkdown: same source level clamp, same
 * expand and collapse control, no renderer in between.
 */
function ClampedPlainBody({ source, expanded, onToggle }: { source: string; expanded: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const clamp = useMemo(() => clampLines(source), [source]);
  return (
    <>
      <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--cth-ink-900)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {clamp.clipped && !expanded ? clamp.text : source}
      </div>
      {clamp.clipped && (
        <button
          type="button" onClick={onToggle}
          style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'transparent', font: 'inherit', fontSize: 11.5, fontWeight: 600, color: 'var(--cth-accent-text)', cursor: 'pointer' }}
        >
          {expanded ? t('pro.inbox.showLess') : (clamp.hiddenLines === 1 ? t('pro.inbox.showMoreOne') : t('pro.inbox.showMore', { count: clamp.hiddenLines }))}
        </button>
      )}
    </>
  );
}

function DaySep({ children }: { children: ReactNode }) {
  return <div style={{ alignSelf: 'center', fontSize: 11, color: 'var(--cth-ink-500)', padding: '2px 10px', borderRadius: 10, background: 'var(--cth-cream-200)', margin: '4px 0' }}>{children}</div>;
}
function EmptyThread({ children }: { children: ReactNode }) {
  return <div style={{ margin: 'auto', fontSize: 13, color: 'var(--cth-ink-500)', textAlign: 'center', maxWidth: 360 }}>{children}</div>;
}
function SectionIcon({ name, tone }: { name: ProIconName; tone?: 'warn' }) {
  return (
    <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center', background: tone === 'warn' ? 'var(--cth-status-waiting-tint)' : 'var(--cth-cream-200)', color: tone === 'warn' ? 'var(--cth-status-waiting)' : 'var(--cth-ink-700)' }}>
      <ProIcon name={name} size={16} />
    </span>
  );
}
function fmtWhenOf(locale: string, iso: string | number | undefined): string {
  return iso === undefined ? '' : fmtWhen(iso, locale);
}

/* ---- data ---------------------------------------------------------------- */

/** The floor's recent messages, newest first; refetched on every routed
 *  message and every 10s besides (a drain or an archive moves files without
 *  an event). The one reader of `hive:messages` in PRO: the orchestrator's
 *  screen (GodScreen) imports it rather than keeping a copy. */
export function useFloor(): FloorMessage[] {
  const [rows, setRows] = useState<FloorMessage[]>([]);
  const load = useCallback(() => {
    const api = window.cth;
    if (!api?.hiveMessages) return;
    api.hiveMessages({ limit: 200 }).then((r) => setRows(r as FloorMessage[])).catch(() => { /* keep the last list */ });
  }, []);
  useEffect(() => {
    load();
    const id = window.setInterval(load, 10_000);
    const off = window.cth?.onHiveMessage?.(() => load());
    return () => { window.clearInterval(id); off?.(); };
  }, [load]);
  return rows;
}

/** What the Inbox needs of slack:status plus the saved polling interval, which
 *  the status does not carry: it lives in config. */
interface SlackLiveStatus { running: boolean; mode: SlackMode; socketConnectedAt?: number; pollSeconds: number }

function useSlack(): { rows: SlackHistoryEntry[]; status: SlackLiveStatus } {
  const [rows, setRows] = useState<SlackHistoryEntry[]>([]);
  const [status, setStatus] = useState<SlackLiveStatus>({ running: false, mode: 'polling', pollSeconds: resolvePollSeconds(undefined) });
  const load = useCallback(() => {
    const api = window.cth;
    if (!api?.slackHistory) return;
    api.slackHistory().then(setRows).catch(() => { /* keep */ });
    Promise.all([api.slackStatus?.(), api.getConfig?.()]).then(([s, cfg]) => {
      setStatus({
        running: !!s?.running,
        mode: s?.mode ?? resolveSlackMode(cfg),
        socketConnectedAt: s?.socketConnectedAt,
        pollSeconds: resolvePollSeconds(cfg?.slackPollSeconds)
      });
    }).catch(() => { /* keep */ });
  }, []);
  useEffect(() => {
    load();
    const id = window.setInterval(load, 15_000);
    const off = window.cth?.onSlackHistoryUpdated?.(() => load());
    return () => { window.clearInterval(id); off?.(); };
  }, [load]);
  return { rows, status };
}

function useTriggers(): TriggerHistoryEntry[] {
  const [rows, setRows] = useState<TriggerHistoryEntry[]>([]);
  const load = useCallback(() => {
    const api = window.cth;
    if (!api?.listTriggerHistory) return;
    api.listTriggerHistory().then(setRows).catch(() => { /* keep */ });
  }, []);
  useEffect(() => {
    load();
    const off = window.cth?.onTriggerHistoryUpdated?.(() => load());
    return () => { off?.(); };
  }, [load]);
  return rows;
}

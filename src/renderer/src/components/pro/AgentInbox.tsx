/**
 * THE AGENT THREAD. One agent, everything anyone said to or about it, in order.
 *
 * This is the component the founder's Inbox complaint (3 Sep 2026) comes down
 * to: "a better way of knowing what a particular agent is working on, was
 * working on, what are we talking to them. Basically every message that we send
 * etc. should be visible clearly." So it is now the ONE thread, drawn on the
 * agent's own screen and again inside the Inbox, rather than two views that
 * each showed part of the traffic.
 *
 * Five sources, none invented:
 *   messages   window.cth.hiveMessages({agentId}): every hive message to or
 *              from this agent, which is where the orchestrator's dispatches
 *              and the agent's own reports live
 *   sent       store.sentLog: what the PERSON sent, with the status it has
 *              reached, kept from the moment Send was pressed so a delivered
 *              message stops vanishing when it leaves the queue
 *   typed      window.cth.historyList(agentId): lines typed straight into the
 *              terminal, which the composer never saw
 *   system     the activity digest (shared/activity.ts): tool runs, idle,
 *              compaction, session starts, and the path of any file a tool
 *              touched, so the file can be opened from here
 *   tickets    the task ledger, joined in when a message names a card, so
 *              "what did it conclude" has a home beside the message that
 *              concluded it
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent, type QueuedMessage } from '@/store/store';
import { MarkdownPreview } from '@/markdown/MarkdownPreview';
import type { ActivityEntry } from '@shared/activity';
import { collapseToolRuns } from '@shared/activityCollapse';
import { clampLines, previewLine } from '@shared/lineClamp';
import { asksFor } from '@shared/askMeBadge';
import { fileLabel, filePathsIn, mergeSent, taskIdsIn, type SentEntry } from '@shared/inboxThread';
import { openQuestion, waitsOnHuman, type HiveTask } from '../TasksKanban';
import { compareByNewestAsk } from '../askMeOrder';
import { openAskMe } from './askMeModalStore';
import { Chip, dayOf, fmtWhen, useAgentById, useNameFor } from './ui';
import { SpritePortrait } from '../SpritePortrait';
import { ProIcon } from './icons';
import { useTechnical } from './depth';
import { describeEntry, useAgentActivity } from './activityData';
import { useTaskLedger } from './taskData';

/** The preload's message row, named from the door itself so the two cannot drift. */
type VoiceMessage = Awaited<ReturnType<typeof window.cth.hiveMessages>>[number];

type Item =
  | { kind: 'msg'; ts: number; m: VoiceMessage }
  | { kind: 'me'; ts: number; sent: SentEntry }
  | { kind: 'sys'; ts: number; e: ActivityEntry };

const EMPTY_QUEUE: QueuedMessage[] = [];
const EMPTY_SENT: SentEntry[] = [];
const ACT_TONE: Record<string, 'accent' | 'warn' | 'ok' | 'outline' | 'bad'> = { request: 'accent', query: 'warn', done: 'ok', agree: 'ok', inform: 'outline', propose: 'outline', refuse: 'bad' };
const SENT_TONE: Record<SentEntry['status'], 'warn' | 'ok' | 'bad' | 'muted'> = { queued: 'warn', sent: 'ok', failed: 'bad', dropped: 'muted' };
const TASK_TONE: Record<HiveTask['status'], 'outline' | 'accent' | 'warn' | 'ok'> = { todo: 'outline', doing: 'accent', blocked: 'warn', done: 'ok' };

/** A bubble is wide enough to read and no wider. The old thread capped at
 *  640px, which on his screen left most of the pane empty; a measure in `ch`
 *  follows the text instead of the window. */
const BUBBLE = 'min(74ch, 86%)';

/** The agent's Inbox: the thread, then the Ask me section docked under it,
 *  which puts it directly above the composer in both places that draw an
 *  agent's conversation (its own screen's Inbox tab and the Inbox screen's row
 *  for it, the orchestrator included): the question is read where the answer
 *  is typed (founder, 24 Sep 2026: "the ask me box should be smaller and
 *  placed somewhere else and blend with the theme"). */
export function AgentInbox({ agent }: { agent: Agent }) {
  return (
    <>
      <AgentThread agent={agent} />
      <AskMeSection agent={agent} />
    </>
  );
}

/**
 * ASK ME, PER AGENT (0.5.3, the Pro rail V2 founder requirement 1): the
 * questions this agent is waiting on the person for, above its thread. The
 * rule is askMeBadge's `asksFor`, the one the bell's "mine" counts by; the
 * list is the Inbox's (waitsOnHuman, newest ask first). Absent when nothing of
 * this agent's waits. A row opens the Ask me modal on that question, so the
 * answer is given here without leaving the screen (requirement 2).
 */
function AskMeSection({ agent }: { agent: Agent }) {
  const { t, i18n } = useTranslation();
  const { tasks } = useTaskLedger(10_000);
  const mine = useMemo(
    () => asksFor((tasks ?? []).filter(waitsOnHuman), agent.id, agent.name, agent.isGod === true).sort((a, b) => compareByNewestAsk(openQuestion(a), openQuestion(b))),
    [tasks, agent.id, agent.name, agent.isGod]
  );
  if (mine.length === 0) return null;
  // Compact and in the kit's own surface: the composer's queue box (panel
  // fill, one even 1px line, radius 10), a sentence case label with the kit
  // chip for the count, then one line per question. No waiting tint, no
  // orange caps: the header's question badge is the loud pointer, this is
  // the quiet list it points at. Three rows show; more scroll.
  // The box sits on the thread's own paper with room above it (founder,
  // 24 Sep: "should be having padding at the top it looks abrupt"): the
  // thread's 22px side gutter, and 12px over / 10px under, the composer's own
  // vertical rhythm, so the last message never touches the box.
  return (
    <div data-ask-me-dock style={{ flexShrink: 0, padding: `${ASK_DOCK_PAD_TOP}px 22px 10px`, background: 'var(--cth-paper-100)' }}>
    <section data-ask-me-section={agent.id} aria-label={t('pro.askMe.sectionLabel', { name: agent.name })} style={{ borderRadius: 10, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500, color: 'var(--cth-ink-700)' }}>
        <ProIcon name="ask" size={13} style={{ color: 'var(--cth-ink-500)' }} />
        <span>{t('pro.inbox.askme')}</span>
        <Chip tone="outline" style={{ height: 16, fontSize: 10.5, padding: '0 6px', fontVariantNumeric: 'tabular-nums' }}>{mine.length}</Chip>
      </div>
      <div data-ask-me-rows style={{ maxHeight: ASK_ROW_H * 3, overflowY: 'auto' }}>
        {mine.map((task) => {
          const open = openQuestion(task)!;
          return (
            <button
              key={task.id} type="button" data-ask-me-row={task.id}
              title={previewLine(open.q, 400)}
              aria-label={t('pro.askMe.answerThis')}
              onClick={() => openAskMe({ taskId: task.id })}
              className="cth-ask-row"
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: ASK_ROW_H, padding: '0 10px', border: 'none', borderTop: '1px solid var(--cth-ink-300)', cursor: 'pointer', font: 'inherit', textAlign: 'start', color: 'var(--cth-ink-900)' }}
            >
              <span data-ask-me-q style={{ flex: 1, minWidth: 0, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{previewLine(open.q, 400)}</span>
              <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>{task.id}</span>
              {open.askedAt && <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>{fmtWhen(open.askedAt, i18n.language)}</span>}
              <span data-ask-me-answer style={{ flexShrink: 0, fontSize: 12, fontWeight: 500, color: 'var(--cth-ink-900)' }}>{t('pro.askMe.answer')}</span>
            </button>
          );
        })}
      </div>
    </section>
    </div>
  );
}
/** One question's row height; the list shows three before it scrolls. */
const ASK_ROW_H = 32;
/** The room between the thread's last message and the box. */
const ASK_DOCK_PAD_TOP = 12;

function AgentThread({ agent }: { agent: Agent }) {
  const { t, i18n } = useTranslation();
  const technical = useTechnical();
  const nameFor = useNameFor();
  const agentById = useAgentById();
  const queue = useStore((s) => s.messageQueues[agent.id]) ?? EMPTY_QUEUE;
  const log = useStore((s) => s.sentLog[agent.id]) ?? EMPTY_SENT;
  const messages = useAgentMessages(agent.id);
  const history = useSentHistory(agent.id);
  const activity = useAgentActivity(agent.id);
  // Slower than the board's poll: these cards are reference material beside a
  // message, not the screen someone is watching for a status change.
  const { tasks } = useTaskLedger(15_000);
  const endRef = useRef<HTMLDivElement | null>(null);
  // A long agent message clamps to a few lines; expanding it back out is kept
  // here, keyed by message id, for as long as this thread stays mounted. It
  // resets when the thread closes, which is the "while the thread is open"
  // the founder's fix asked for, no more and no less.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleExpanded = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const byId = useMemo(() => new Map((tasks ?? []).map((x) => [x.id, x])), [tasks]);
  const knownIds = useMemo(() => (tasks ?? []).map((x) => x.id), [tasks]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const m of messages) {
      const ts = Date.parse(m.created_at);
      if (!Number.isNaN(ts)) out.push({ kind: 'msg', ts, m });
    }
    for (const s of mergeSent(log, history)) out.push({ kind: 'me', ts: s.ts, sent: s });
    for (const e of activity) out.push({ kind: 'sys', ts: e.ts, e });
    return out.sort((a, b) => a.ts - b.ts);
  }, [messages, history, activity, log]);

  // Pilot feedback item 7: an afternoon in the shell used to draw one "Bash"
  // line per call until the feed was nothing but tool names. Consecutive rows
  // for the same tool fold into one run here (the rule lives in
  // shared/activityCollapse.ts); everything that is not a bare tool line
  // passes through untouched.
  const feed = useMemo(
    () => collapseToolRuns(items, (x) => (x.kind === 'sys' && x.e.kind === 'tool' ? x.e.tool : undefined)),
    [items]
  );

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [items.length]);

  if (items.length === 0) {
    return (
      // The thread's own paper, empty or not, so the Ask me dock under it
      // never shows as a band of another colour.
      <div data-inbox-empty style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--cth-ink-500)', fontSize: 13, padding: 24, textAlign: 'center', background: 'var(--cth-paper-100)' }}>
        {t('pro.room.emptyInbox', { name: agent.name })}
      </div>
    );
  }

  // The queue count is shown on the row that is still waiting, not as a
  // separate strip: the composer already lists the queue, and two lists of the
  // same messages was half of "I do not know what does what".
  let lastDay = '';
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--cth-paper-100)' }}>
      {feed.map((fi, i) => {
        const ts = fi.kind === 'run' ? fi.ts : fi.row.ts;
        const d = dayOf(ts, i18n.language);
        const dayText = d.key === 'today' ? t('pro.inbox.today') : d.key === 'yesterday' ? t('pro.inbox.yesterday') : d.text;
        const sep = dayText !== lastDay ? <DaySep key={`d${i}`} text={dayText} /> : null;
        lastDay = dayText;
        const when = fmtWhen(ts, i18n.language);
        let row: ReactNode;
        if (fi.kind === 'run') {
          // One line whether the tool ran once or forty times. Only a lone run
          // keeps its detail and its file chip: a folded run has many of each,
          // and drawing them all is the wall of rows this line replaced.
          const head = fi.rows[0];
          const only = fi.count === 1 && head.kind === 'sys' ? head : null;
          const base = fi.count === 1
            ? t('pro.room.sys.toolOnce', { tool: fi.tool })
            : t('pro.room.sys.toolRun', { tool: fi.tool, count: fi.count });
          row = (
            <div key={`s${i}`} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11.5, color: 'var(--cth-ink-500)', padding: '0 4px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 10.5, flexShrink: 0 }}>{when}</span>
              <span>{technical && only?.e.detail ? `${base} · ${only.e.detail}` : base}</span>
              {only?.e.path && <FileChip path={only.e.path} />}
            </div>
          );
          return <span key={`w${i}`} style={{ display: 'contents' }}>{sep}{row}</span>;
        }
        const it = fi.row;
        if (it.kind === 'sys') {
          row = (
            <div key={`s${i}`} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11.5, color: 'var(--cth-ink-500)', padding: '0 4px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 10.5, flexShrink: 0 }}>{when}</span>
              <span>{describeEntry(it.e, t, technical)}</span>
              {it.e.path && <FileChip path={it.e.path} />}
            </div>
          );
        } else if (it.kind === 'me') {
          const s = it.sent;
          row = (
            <div key={`m${i}`} style={{ alignSelf: 'flex-end', maxWidth: BUBBLE, minWidth: 0 }}>
              <div style={{ background: 'var(--cth-accent-soft)', border: '1px solid var(--cth-accent-line)', borderRadius: 12, padding: '8px 12px', fontSize: 13, lineHeight: 1.45, color: 'var(--cth-ink-900)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {s.text}
                <Refs text={s.text} byId={byId} knownIds={knownIds} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 10.5, color: 'var(--cth-ink-500)' }}>
                  <span style={{ fontFamily: 'var(--cth-font-mono)' }}>{when}</span>
                  <SentStatus sent={s} />
                </div>
              </div>
            </div>
          );
        } else {
          const m = it.m;
          const fromSelf = m.from === agent.id;
          const who = fromSelf ? agent : agentById(m.from);
          const isHuman = m.from === 'human';
          const body = (
            <>
              <ClampedMarkdown source={m.body} expanded={expanded.has(m.id)} onToggle={() => toggleExpanded(m.id)} />
              <Refs text={`${m.subject} ${m.body}`} byId={byId} knownIds={knownIds} />
            </>
          );
          if (isHuman) {
            row = (
              <div key={`h${i}`} style={{ alignSelf: 'flex-end', maxWidth: BUBBLE, minWidth: 0 }}>
                <div style={{ background: 'var(--cth-accent-soft)', border: '1px solid var(--cth-accent-line)', borderRadius: 12, padding: '8px 12px', fontSize: 13, lineHeight: 1.45, color: 'var(--cth-ink-900)' }}>
                  {m.subject && <div style={{ fontWeight: 600 }}>{m.subject}</div>}
                  {body}
                  <div style={{ marginTop: 4, fontSize: 10.5, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>{when}</div>
                </div>
              </div>
            );
          } else {
            row = (
              <div key={`g${i}`} style={{ display: 'flex', gap: 10, maxWidth: BUBBLE, minWidth: 0 }}>
                {who ? <SpritePortrait character={who.character} size={28} /> : <span style={{ width: 18, height: 28, borderRadius: 5, background: 'var(--cth-cream-200)', flexShrink: 0 }} />}
                <div style={{ background: 'var(--cth-cream-50)', border: '1px solid var(--cth-ink-300)', borderRadius: 12, padding: '8px 12px', fontSize: 13, lineHeight: 1.45, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                    {nameFor(m.from) ?? m.from}
                    {m.act && <Chip tone={ACT_TONE[m.act] ?? 'outline'} style={{ height: 16, fontSize: 10 }}>{t(`pro.room.act.${m.act}`)}</Chip>}
                    {!fromSelf && m.to !== agent.id && <span style={{ fontWeight: 400, color: 'var(--cth-ink-500)' }}>→ {nameFor(m.to) ?? m.to}</span>}
                  </div>
                  {m.subject && <div style={{ fontWeight: 600 }}>{m.subject}</div>}
                  {body}
                  <div style={{ marginTop: 4, fontSize: 10.5, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>{when}</div>
                </div>
              </div>
            );
          }
        }
        return <span key={`w${i}`} style={{ display: 'contents' }}>{sep}{row}</span>;
      })}
      <div style={{ fontSize: 11, color: 'var(--cth-ink-500)', alignSelf: 'center', padding: '2px 0' }}>
        {queue.length > 0 ? t('pro.room.waitingToSend', { count: queue.length, name: agent.name }) : null}
      </div>
      <div ref={endRef} />
    </div>
  );
}

/* ---- the pieces both threads use ----------------------------------------- */

/** Where a message the person sent has got to, in words and a colour. */
export function SentStatus({ sent }: { sent: SentEntry }) {
  const { t } = useTranslation();
  if (sent.status === 'sent') return <span style={{ color: 'var(--cth-accent-text)' }}>✓✓ {t('pro.room.delivered')}</span>;
  return <Chip tone={SENT_TONE[sent.status]} style={{ height: 16, fontSize: 10 }}>{t(`pro.room.sendStatus.${sent.status}`)}</Chip>;
}

/**
 * A message body, clamped to a handful of source lines so one long agent
 * answer cannot push every other message off the screen. `clampLines` does
 * the cutting before Markdown ever sees the text (see src/shared/lineClamp.ts
 * for why `-webkit-line-clamp` cannot do this job); this component only owns
 * the expand and collapse control on top of that. Unclamped text renders as
 * before, with no control drawn at all.
 */
export function ClampedMarkdown({ source, expanded, onToggle }: { source: string; expanded: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const clamp = useMemo(() => clampLines(source), [source]);
  if (!clamp.clipped) return <MarkdownPreview source={source} variant="card" />;
  return (
    <>
      <MarkdownPreview source={expanded ? source : clamp.text} variant="card" />
      <button
        type="button" onClick={onToggle}
        style={{ display: 'block', marginTop: 4, padding: 0, border: 'none', background: 'transparent', font: 'inherit', fontSize: 11.5, fontWeight: 600, color: 'var(--cth-accent-text)', cursor: 'pointer' }}
      >
        {expanded ? t('pro.room.showLess') : (clamp.hiddenLines === 1 ? t('pro.room.showMoreOne') : t('pro.room.showMore', { count: clamp.hiddenLines }))}
      </button>
    </>
  );
}

/**
 * The files and the tickets a message names. Both are joins against something
 * real: a path is opened in the editor, a ticket is drawn only when the ledger
 * still has that card. Nothing is drawn when a message names neither, which is
 * most messages.
 */
export function Refs({ text, byId, knownIds }: { text: string; byId: Map<string, HiveTask>; knownIds: string[] }) {
  const paths = useMemo(() => filePathsIn(text), [text]);
  const ids = useMemo(() => taskIdsIn(text, knownIds), [text, knownIds]);
  if (paths.length === 0 && ids.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
      {paths.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {paths.map((p) => <FileChip key={p} path={p} />)}
        </div>
      )}
      {ids.map((id) => {
        const task = byId.get(id);
        return task ? <TicketCard key={id} task={task} /> : null;
      })}
    </div>
  );
}

/** One file, opened in the editor by name. The whole path is the tooltip, so
 *  the chip can stay short without hiding which file it means. */
export function FileChip({ path }: { path: string }) {
  const openFileInIde = useStore((s) => s.openFileInIde);
  return (
    <button
      type="button" onClick={() => openFileInIde(path)} title={path}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: 260, padding: '2px 8px', borderRadius: 7, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', color: 'var(--cth-ink-900)', font: 'inherit', fontSize: 11, fontFamily: 'var(--cth-font-mono)', cursor: 'pointer' }}
    >
      <ProIcon name="folder" size={11} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileLabel(path)}</span>
    </button>
  );
}

/**
 * A ticket named in a message, with the one thing the founder said was missing:
 * "we do not know what an agent gives as a final answer or resolution, so it
 * should be logged per ticket". The ledger's `result` IS that answer, written
 * by whoever closed the card, so it is shown here rather than left in a file
 * nobody opens. No result yet says so plainly.
 */
export function TicketCard({ task }: { task: HiveTask }) {
  const { t } = useTranslation();
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const agentById = useAgentById();
  const owner = agentById(task.assignee);
  return (
    <button
      type="button" onClick={() => openTaskDetail(task.id)}
      style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', color: 'var(--cth-ink-900)', font: 'inherit', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 10.5, color: 'var(--cth-ink-500)' }}>{task.id}</span>
        <Chip tone={TASK_TONE[task.status]} style={{ height: 16, fontSize: 10 }}>{t(`pro.tasks.status.${task.status}`)}</Chip>
        {owner && <SpritePortrait character={owner.character} size={28} />}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{task.title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.4 }}>
        {task.result?.trim() ? task.result : t('pro.inbox.noResultYet')}
      </div>
    </button>
  );
}

function DaySep({ text }: { text: string }) {
  return <div style={{ alignSelf: 'center', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cth-ink-500)', padding: '6px 0' }}>{text}</div>;
}

/* ---- data ---------------------------------------------------------------- */

/** Every hive message to or from the agent, refreshed on each routed push. */
function useAgentMessages(agentId: string): VoiceMessage[] {
  const [rows, setRows] = useState<VoiceMessage[]>([]);
  useEffect(() => {
    const api = window.cth;
    if (!api?.hiveMessages) return;
    let alive = true;
    const load = () => {
      api.hiveMessages({ agentId, limit: 200, includeArchived: true })
        .then((r) => { if (alive) setRows((r as VoiceMessage[]).filter((m) => m.from === agentId || m.to === agentId)); })
        .catch(() => { /* keep the last list */ });
    };
    load();
    const off = api.onHiveMessage?.((e) => { if (e.from === agentId || e.to === agentId || e.targets?.includes(agentId)) load(); });
    return () => { alive = false; off?.(); };
  }, [agentId]);
  return rows;
}

/** What the person typed straight into the terminal: the command history
 *  ledger. Re-read whenever the queue moves, since a delivered message is
 *  often echoed back into it. */
function useSentHistory(agentId: string): { ts: number; text: string }[] {
  const [rows, setRows] = useState<{ ts: number; text: string }[]>([]);
  const queueLen = useStore((s) => (s.messageQueues[agentId] ?? EMPTY_QUEUE).length);
  useEffect(() => {
    const api = window.cth;
    if (!api?.historyList) return;
    let alive = true;
    api.historyList(agentId, 200)
      .then((r) => { if (alive) setRows(r.map((h) => ({ ts: h.ts, text: h.text })).filter((h) => !h.text.startsWith('/'))); })
      .catch(() => { /* keep the last list */ });
    return () => { alive = false; };
  }, [agentId, queueLen]);
  return rows;
}

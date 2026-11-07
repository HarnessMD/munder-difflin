import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelBadge } from './PixelBadge';
import { useStore, type AskMeCardState } from '@/store/store';
import { type HiveTask, openQuestion, waitsOnHuman } from './TasksKanban';
import { compareByNewestAsk } from './askMeOrder';
import { AskMeQuestion } from './AskMeQuestion';
import { composeAnswer, normalizeHumanQA, questionRef, type AnswerOutcome, type QuestionRef } from '@shared/humanQuestion';

/**
 * ASK ME — first-class human feedback through the task system.
 *
 * Tasks the god can only move with the human's input sit here. An entry isn't
 * necessarily a question — it can be a TO-DO only the human can perform
 * (create an account, approve a purchase, provide credentials, test on a real
 * device). Each card shows the open ask, a place to respond (an answer, or a
 * "done, here's the result" confirmation), and the CASCADE of downstream
 * tasks stuck waiting on this one — so "why isn't X done?" reads as "ah,
 * because I still owe something here."
 *
 * Sending an answer goes through main (hiveAnswerQuestion), which writes it into
 * the card's humanQA entry in hive/tasks.json (the decision is documented ON the
 * task, forever) and mails the god, so the card gets unblocked and the work goes
 * on. Main names the question by what the card showed, so an answer never lands
 * on a question the god changed or closed meanwhile (Pam's P4: "not sent").
 */

const POLL_MS = 5000;

function parse(raw: unknown): HiveTask[] {
  const list = (raw && typeof raw === 'object' && Array.isArray((raw as { tasks?: unknown }).tasks))
    ? (raw as { tasks: HiveTask[] }).tasks
    : [];
  return list.filter((t) => !!t && typeof t === 'object');
}

/** The same question as the card showed: text, stamp, place and option labels. */
function sameRef(a: QuestionRef, b: QuestionRef): boolean {
  const la = a.labels ?? [], lb = b.labels ?? [];
  return a.q === b.q && a.askedAt === b.askedAt && a.nth === b.nth && la.length === lb.length && la.every((l, i) => l === lb[i]);
}

/** All tasks transitively waiting on `id` (dependents chain), cycle-safe. */
function dependentsTree(id: string, all: HiveTask[], seen = new Set<string>()): HiveTask[] {
  if (seen.has(id)) return [];
  seen.add(id);
  const direct = all.filter((t) => Array.isArray(t.dependsOn) && t.dependsOn.includes(id) && t.status !== 'done');
  return direct.flatMap((d) => [d, ...dependentsTree(d.id, all, seen)]);
}

export function AskMeTab() {
  const { t: translate } = useTranslation();
  const agents = useStore((s) => s.agents);
  const restorable = useStore((s) => s.restorableAgents);
  const [tasks, setTasks] = useState<HiveTask[]>([]);
  // Drafts live in the STORE (keyed by task id) — switching tabs unmounts this
  // view, and a half-typed answer must survive the round trip. So do the picks
  // and an answer that was not sent (askMeCards).
  const drafts = useStore((s) => s.answerDrafts);
  const setAnswerDraft = useStore((s) => s.setAnswerDraft);
  const cards = useStore((s) => s.askMeCards);
  const setAskMeCard = useStore((s) => s.setAskMeCard);
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const [sending, setSending] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // The board before the last poll: a card that left it still has its title.
  const prev = useRef<HiveTask[]>([]);

  const refresh = useCallback(async (): Promise<HiveTask[] | null> => {
    try {
      const next = parse(await window.cth.hiveTasks());
      setTasks((cur) => { prev.current = cur; return next; });
      return next;
    } catch { return null; /* keep last good */ }
  }, []);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, POLL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [refresh]);

  // A question that changed or closed under what the person wrote (Pam's P4).
  // Changed: the box empties and what they wrote shows below, read only, to copy,
  // until they send. Closed: the card stays, read only, until they dismiss it. An
  // empty box with no picks just leaves, as before.
  useEffect(() => {
    const { askMeCards, answerDrafts } = useStore.getState();
    for (const [id, st] of Object.entries(askMeCards)) {
      const cur = tasks.find((x) => x.id === id);
      const now = cur && waitsOnHuman(cur) ? questionRef(cur) : null;
      if (st.closed) {
        // Asked again: what they wrote shows under the new question instead.
        if (now) setAskMeCard(id, { notSent: 'gone', ...(st.kept ? { kept: st.kept } : {}) });
        continue;
      }
      if (st.ref ? now && sameRef(now, st.ref) : now) continue;
      const wrote = st.ref ? composeAnswer(st.entry?.options, st.picks ?? [], answerDrafts[id] ?? '') : null;
      const kept = wrote ?? st.kept;
      if (wrote) setAnswerDraft(id, '');
      if (!kept) { setAskMeCard(id, null); continue; }
      if (now) { setAskMeCard(id, { notSent: 'gone', kept }); continue; }
      const known = cur ?? prev.current.find((x) => x.id === id);
      const open = known ? openQuestion(known) : undefined;
      const entry = st.entry ?? (open ? normalizeHumanQA(open) ?? undefined : undefined);
      setAskMeCard(id, {
        notSent: 'gone', kept, ...(entry ? { entry } : {}),
        closed: { title: known?.title ?? id, ...(known?.assignee ? { assignee: known.assignee } : {}) }
      });
    }
  }, [tasks, setAskMeCard, setAnswerDraft]);

  const nameFor = (id?: string): string | undefined =>
    id ? (agents.find((a) => a.id === id)?.name ?? restorable.find((a) => a.id === id)?.name ?? id) : undefined;

  // Newest ask at the top, oldest at the bottom. Before this the board had no
  // comparator at all, so a question's position was an accident of where its
  // card sat in tasks.json. `filter` already returns a fresh array, so sorting
  // in place never touches the store's own ordering. The ask each card is
  // ranked by comes from openQuestion() — the same predicate waitsOnHuman uses
  // — and only this OUTER list is sorted; a card's humanQA history stays
  // chronological (see askMeOrder.ts).
  const waiting = tasks
    .filter(waitsOnHuman)
    .sort((a, b) => compareByNewestAsk(openQuestion(a), openQuestion(b)));
  const waitingIds = new Set(waiting.map((t) => t.id));
  const closedCards = Object.entries(cards).filter(([id, st]) => st.closed && !waitingIds.has(id));
  // A closed card keeps its place (Pam's P4): one list, ranked by its question's
  // ask like the open ones; a tie keeps the board's own order.
  const boardOrder = (id: string): number => {
    const i = tasks.findIndex((x) => x.id === id);
    return i >= 0 ? i : tasks.length + prev.current.findIndex((x) => x.id === id);
  };
  const rows: Array<{ id: string; task?: HiveTask; st?: AskMeCardState; ask?: { askedAt?: string } }> = [
    ...waiting.map((t) => ({ id: t.id, task: t, ask: openQuestion(t) })),
    ...closedCards.map(([id, st]) => ({ id, st, ask: st.entry }))
  ].sort((a, b) => compareByNewestAsk(a.ask, b.ask) || boardOrder(a.id) - boardOrder(b.id));

  /** Note which question a draft or a pick was made for, the first time. */
  const record = (task: HiveTask, picks?: number[]) => {
    const ref = questionRef(task);
    const open = openQuestion(task);
    if (!ref || !open) return;
    const st = useStore.getState().askMeCards[task.id];
    const same = !!st?.ref && sameRef(st.ref, ref);
    setAskMeCard(task.id, {
      ...(st ?? {}),
      ref,
      entry: normalizeHumanQA(open) ?? { q: open.q },
      picks: picks ?? (same ? st?.picks ?? [] : [])
    });
  };

  const sendAnswer = async (task: HiveTask) => {
    if (sending) return;
    const open = openQuestion(task);
    const entry = open ? normalizeHumanQA(open) : null;
    const { askMeCards, answerDrafts } = useStore.getState();
    const st = askMeCards[task.id];
    const ref = st?.ref ?? questionRef(task);
    if (!entry || !ref) return;
    const picks = st?.ref ? st.picks ?? [] : [];
    const text = composeAnswer(entry.options, picks, answerDrafts[task.id] ?? '');
    if (!text) return;
    setSending(task.id);
    let out: AnswerOutcome;
    try {
      out = await window.cth.hiveAnswerQuestion({
        taskId: task.id, ref, answer: { text, ...(entry.options?.length ? { chosen: picks } : {}) }
      });
    } catch { out = { result: 'failed' }; }
    if (out.result === 'ok') {
      setAnswerDraft(task.id, '');
      setAskMeCard(task.id, null);
      await refresh();
    } else if (out.result === 'gone') {
      // Changed or closed first: the next board shows which (the effect above).
      setAskMeCard(task.id, { ...(st ?? {}), ref, entry, picks, notSent: undefined });
      const next = await refresh();
      const cur = next?.find((x) => x.id === task.id);
      const now = cur && waitsOnHuman(cur) ? questionRef(cur) : null;
      if (!next || (now && sameRef(now, ref))) setAskMeCard(task.id, { ...(st ?? {}), ref, entry, picks, notSent: 'failed' });
    } else {
      // The box keeps the answer and the picks.
      setAskMeCard(task.id, { ...(st ?? {}), ref, entry, picks, notSent: 'failed' });
    }
    setSending(null);
  };

  // Dismiss the open ask off the ASK ME board WITHOUT answering it. Main marks
  // the open humanQA entry `dismissedAt` (no fabricated answer), so it stops
  // being the open question and the card leaves this view — the question itself
  // stays on the card, so the Q&A history is never dropped (protocol). The task
  // stays blocked on the kanban; the god can re-ask by appending a fresh entry.
  const dismiss = async (task: HiveTask) => {
    const ref = questionRef(task);
    if (!ref || sending === task.id) return;
    setSending(task.id);
    const out: AnswerOutcome = await window.cth.hiveAnswerQuestion({ taskId: task.id, ref, dismiss: true })
      .catch(() => ({ result: 'failed' as const }));
    if (out.result === 'ok') setAskMeCard(task.id, null);
    setSending(null);
    await refresh();
  };

  // A closed card leaves only when the person says so; nothing is written.
  const dropClosed = (id: string) => {
    setAskMeCard(id, null);
    setAnswerDraft(id, '');
  };

  const cardStyle = { background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)', display: 'flex', flexDirection: 'column' } as const;
  // header: title + assignee + dismiss
  const header = (id: string, title: string, assignee: string | undefined, onDismiss: () => void, busy: boolean) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px',
      background: 'var(--cth-lilac-light, #ece2f5)', boxShadow: 'inset 0 -1px 0 var(--cth-ink-700)'
    }}>
      <button
        onClick={() => openTaskDetail(id)}
        title={translate('askMe.openDetail')}
        style={{
          border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, textAlign: 'left',
          fontFamily: 'var(--cth-font-mono)', fontSize: 15, color: 'var(--cth-ink-900)',
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}
      >
        {title}
      </button>
      {nameFor(assignee) && <PixelBadge status="blocked" label={nameFor(assignee)!} />}
      {/* Dismiss — clears this ask off the board without answering it.
          The card's Q&A history is preserved (the question stays on the
          card, just marked dismissed). */}
      <button
        onClick={onDismiss}
        disabled={busy}
        title={translate('askMe.dismissTitle')}
        aria-label={translate('askMe.dismissAria')}
        style={{
          flexShrink: 0, width: 18, height: 18, padding: 0, marginLeft: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          border: 'none', cursor: busy ? 'default' : 'pointer',
          background: 'transparent', color: 'var(--cth-ink-500)',
          fontFamily: 'var(--cth-font-ui)', fontSize: 13
        }}
        onMouseEnter={(e) => { if (!busy) e.currentTarget.style.color = 'var(--cth-coral)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cth-ink-500)'; }}
      >✕</button>
    </div>
  );

  return (
    // Body text is set in the mono face (VT323) — the same readable font the
    // memory viewer uses. Pixelify Sans (font-ui) is too chunky for prose like
    // questions and answers. Display/badge bits keep their explicit faces.
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--cth-paper-200)', padding: 10, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--cth-font-mono)' }}>
      {waiting.length === 0 && closedCards.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--cth-ink-500)', fontSize: 12 }}>
          {translate('askMe.emptyTitle')}<br />
          <span style={{ fontSize: 11, color: 'var(--cth-ink-300)' }}>
            {translate('askMe.emptySub')}
          </span>
        </div>
      )}
      {rows.map((row) => {
        // Closed while written for: read only, with what was written, until dismissed.
        if (!row.task) {
          const st = row.st!;
          return (
            <div key={`closed-${row.id}`} style={cardStyle}>
              {header(row.id, st.closed!.title, st.closed!.assignee, () => dropClosed(row.id), false)}
              <div style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AskMeQuestion
                  entry={st.entry ?? { q: '' }}
                  draft=""
                  onDraft={() => undefined}
                  picks={[]}
                  onPicks={() => undefined}
                  onSend={() => undefined}
                  sending={false}
                  notSent="gone"
                  kept={st.kept}
                  closed
                />
              </div>
            </div>
          );
        }
        const t = row.task;
        const open = openQuestion(t)!;
        const entry = normalizeHumanQA(open) ?? { q: open.q };
        const ref = questionRef(t);
        const st = cards[t.id];
        // Picks made for another question never carry over (the effect above moves them out).
        const picks = st?.ref && ref && sameRef(st.ref, ref) ? st.picks ?? [] : [];
        const stuck = dependentsTree(t.id, tasks);
        return (
          <div key={t.id} style={cardStyle}>
            {header(t.id, t.title, t.assignee, () => void dismiss(t), sending === t.id)}

            <div style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AskMeQuestion
                entry={entry}
                draft={drafts[t.id] ?? ''}
                onDraft={(v) => { record(t); setAnswerDraft(t.id, v); }}
                picks={picks}
                onPicks={(p) => record(t, p)}
                onSend={() => void sendAnswer(t)}
                sending={sending === t.id}
                notSent={st?.notSent}
                kept={st?.kept}
              />
              {(t.humanQA?.filter((e) => e.a).length ?? 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => openTaskDetail(t.id)}
                    title={translate('askMe.viewAnswersHistory')}
                    style={{
                      border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
                      fontSize: 10, color: 'var(--cth-ink-700)', fontFamily: 'var(--cth-font-display)',
                      textDecoration: 'underline'
                    }}
                  >
                    {(() => {
                      const n = t.humanQA!.filter((e) => e.a).length;
                      return n === 1
                        ? translate('askMe.viewAnswers', { count: n })
                        : translate('askMe.viewAnswersPlural', { count: n });
                    })()}
                  </button>
                </div>
              )}

              {/* the cascade: what's stuck behind this answer */}
              {stuck.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, color: 'var(--cth-coral)' }}>
                    {stuck.length === 1
                      ? translate('askMe.blockingDownstream', { count: stuck.length })
                      : translate('askMe.blockingDownstreamPlural', { count: stuck.length })}
                  </div>
                  {stuck.slice(0, 6).map((d, i) => (
                    <div key={d.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      paddingLeft: 8 + Math.min(i, 3) * 8,
                      fontSize: 12, color: 'var(--cth-ink-700)'
                    }}>
                      <span style={{ color: 'var(--cth-ink-300)' }}>└</span>
                      <span style={{ width: 7, height: 7, flexShrink: 0, background: d.status === 'blocked' ? 'var(--cth-coral)' : 'var(--cth-sky)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
                      {nameFor(d.assignee) && <span style={{ fontSize: 10, color: 'var(--cth-ink-500)' }}>({nameFor(d.assignee)})</span>}
                    </div>
                  ))}
                  {stuck.length > 6 && (
                    <div style={{ paddingLeft: 14, fontSize: 11, color: 'var(--cth-ink-300)' }}>{translate('askMe.more', { count: stuck.length - 6 })}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

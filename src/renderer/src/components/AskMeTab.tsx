import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import { PixelBadge } from './PixelBadge';
import { useStore } from '@/store/store';
import { type HiveTask, type HumanQA, openQuestion, waitsOnHuman } from './TasksKanban';
import { compareByNewestAsk } from './askMeOrder';
import { saveAnswer, saveDismissal, sendAnswerNotice, withDismissal } from './askMeActions';
import { picksKey, recordAnswer } from './humanQuestion';
import { AskClosed, AskNotSentRow, AskOptions, AskTags, AskText, askAnswerState, askButtonLabel, draftFor, failedOn, nextPicks, openAsksKey, settleNotSents, takeClosedUnsents, takeStrandedAnswers, waitingById, withClosedAsks, type AskNotSent } from './AskChoices';
import { isComposingKey } from '@shared/imeGuard';
import { useRtl } from '@/i18n/useDirection';

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
 * Sending an answer does two things:
 *   1. writes it into the card's humanQA entry in hive/tasks.json (the
 *      decision is documented ON the task, forever), and
 *   2. mails the god so it picks the answer up, unblocks the card, and the
 *      work continues — no separate HumanQuestion.md side-channel anymore.
 */

const POLL_MS = 5000;

function parse(raw: unknown): HiveTask[] {
  const list = (raw && typeof raw === 'object' && Array.isArray((raw as { tasks?: unknown }).tasks))
    ? (raw as { tasks: HiveTask[] }).tasks
    : [];
  return list.filter((t) => !!t && typeof t === 'object');
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
  const rtl = useRtl();
  const agents = useStore((s) => s.agents);
  const restorable = useStore((s) => s.restorableAgents);
  const [tasks, setTasks] = useState<HiveTask[]>([]);
  // Drafts live in the STORE (keyed by task id) — switching tabs unmounts this
  // view, and a half-typed answer must survive the round trip.
  const drafts = useStore((s) => s.answerDrafts);
  const setAnswerDraft = useStore((s) => s.setAnswerDraft);
  // Picks on an ask with options live beside the drafts, for the same reason.
  const picks = useStore((s) => s.answerPicks);
  const setAnswerPicks = useStore((s) => s.setAnswerPicks);
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const [sending, setSending] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try { setTasks(parse(await window.cth.hiveTasks())); } catch { /* keep last good */ }
  }, []);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, POLL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [refresh]);

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

  // Why a card's last answer was not sent: until it sends or its
  // question closes. A card whose question closed under the answer stays, read
  // only, until its ✕ (State: not sent, question closed); settleNotSent.
  const [notSent, setNotSent] = useState<Readonly<Record<string, AskNotSent>>>({});
  const markNotSent = (id: string, v: AskNotSent | null) => setNotSent((m) => {
    if (v) return { ...m, [id]: v };
    if (!(id in m)) return m;
    const rest: Record<string, AskNotSent> = { ...m };
    delete rest[id];
    return rest;
  });
  const asksKey = openAsksKey(tasks);
  // The cards this tab last showed waiting, to tell a question that closed.
  const shown = useRef<ReadonlyMap<string, HiveTask>>(new Map());
  useEffect(() => {
    // Text left unsent on a question that changed shows once, to copy;
    // on one that closed elsewhere, the card stays closed with it.
    const stranded = takeStrandedAnswers(tasks);
    const closed = takeClosedUnsents(shown.current, tasks);
    shown.current = waitingById(tasks);
    setNotSent((m) => settleNotSents(m, tasks, stranded, closed));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- asksKey stands for tasks
  }, [asksKey, notSent]);
  const cards = withClosedAsks(waiting, notSent);

  /**
   * An answer or a dismissal changes ONE humanQA entry, in main, on the card as
   * it is on disk (askMeActions.saveAnswer / saveDismissal): this
   * view's 5 s old snapshot is never written back, so an entry the god added or
   * edited since the last poll stays. When that entry is no longer open
   * ('gone': answered, dismissed or rewritten underneath us) nothing is written;
   * the box empties and what was written shows under it, to copy.
   */

  const sendAnswer = async (task: HiveTask) => {
    const open = openQuestion(task);
    // The note, or the picked options plus the note (humanQuestion.composeAnswer).
    const answer = askAnswerState(open, draftFor(drafts[task.id], open), picks[task.id]);
    const text = answer.text.trim();
    const chosen = answer.picked.length ? answer.picked : undefined;
    if (!text || !open || sending) return;
    setSending(task.id);
    const empty = () => { setAnswerDraft(task.id, picksKey(open), ''); setAnswerPicks(task.id, picksKey(open), []); };
    try {
      // 1) Document the answer ON the card (main changes that one entry).
      const result = await saveAnswer(task, open, text, chosen);
      if (!result.ok) {
        // Gone: the question changed or closed meanwhile. The box empties for
        // the new one and what was written shows below it, to copy. Any other
        // failure keeps the answer in the box.
        if (result.error === 'gone') { empty(); markNotSent(task.id, { why: 'gone', kept: text, was: { task, open, picked: answer.picked } }); void refresh(); }
        else markNotSent(task.id, failedOn(open));
        setSending(null);
        return;
      }
      // The box empties first: once the card shows another question, text
      // still in it would read as unsent (takeStrandedAnswer).
      empty();
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, humanQA: recordAnswer(t.humanQA, open, { text, chosen }) } : t)));
      // 2) Tell the agent that asked, so the card gets unblocked and work
      // continues. The answer is on the card already, so a failed notice is
      // only logged.
      await sendAnswerNotice(task, open, text, chosen);
      markNotSent(task.id, null);
    } catch { markNotSent(task.id, failedOn(open)); }
    setSending(null);
  };

  // Dismiss the open ask off the ASK ME board WITHOUT answering it. We mark the
  // open humanQA entry `dismissedAt` (no fabricated answer) so openQuestion()
  // stops returning it and the card leaves this view — the question itself stays
  // on the card, so the Q&A history is never dropped (protocol). The task stays
  // blocked on the kanban; the god can re-ask by appending a fresh humanQA entry.
  const dismiss = async (task: HiveTask) => {
    const open = openQuestion(task);
    if (!open || sending === task.id) return;
    const next = tasks.map((t) => (t.id === task.id ? { ...t, humanQA: withDismissal(t.humanQA, open) } : t));
    // Dismissed by the person: its note and what was in its box go first, so
    // the card does not come back as a closed one with unsent text.
    markNotSent(task.id, null);
    setAnswerDraft(task.id, picksKey(open), '');
    setAnswerPicks(task.id, picksKey(open), []);
    setTasks(next); // optimistic — the card disappears immediately
    try {
      const result = await saveDismissal(task, open);
      if (!result.ok) throw new Error('task changed before ask could be dismissed');
    } catch {
      setTasks(tasks); // restore on failure so the user can retry
    }
  };

  return (
    // Body text is set in the mono face (VT323) — the same readable font the
    // memory viewer uses. Pixelify Sans (font-ui) is too chunky for prose like
    // questions and answers. Display/badge bits keep their explicit faces.
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--cth-paper-200)', padding: 10, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--cth-font-mono)' }}>
      {cards.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--cth-ink-500)', fontSize: 12 }}>
          {translate('askMe.emptyTitle')}<br />
          <span style={{ fontSize: 11, color: 'var(--cth-ink-300)' }}>
            {translate('askMe.emptySub')}
          </span>
        </div>
      )}
      {cards.map((t) => {
        // Kept after its question closed under the answer: read only, and its ✕
        // only takes it off this list (the entry is already closed).
        const closed = !waiting.includes(t);
        const open = openQuestion(t)!;
        const stuck = closed ? [] : dependentsTree(t.id, tasks);
        const note = draftFor(drafts[t.id], open);
        const answer = askAnswerState(open, note, picks[t.id]);
        const label = askButtonLabel(translate, answer, note);
        return (
          <div key={t.id} style={{
            background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* header: title + assignee */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px',
              background: 'var(--cth-lilac-light, #ece2f5)', boxShadow: 'inset 0 -1px 0 var(--cth-ink-700)'
            }}>
              <button
                onClick={() => openTaskDetail(t.id)}
                title={translate('askMe.openDetail')}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, textAlign: 'left',
                  fontFamily: 'var(--cth-font-mono)', fontSize: 15, color: 'var(--cth-ink-900)',
                  flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}
              >
                {t.title}
              </button>
              {nameFor(t.assignee) && <PixelBadge status="blocked" label={nameFor(t.assignee)!} />}
              {/* Dismiss — clears this ask off the board without answering it.
                  The card's Q&A history is preserved (the question stays on the
                  card, just marked dismissed). */}
              <button
                onClick={() => (closed ? markNotSent(t.id, null) : void dismiss(t))}
                disabled={sending === t.id}
                title={translate('askMe.dismissTitle')}
                aria-label={translate('askMe.dismissAria')}
                style={{
                  flexShrink: 0, width: 18, height: 18, padding: 0, marginLeft: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                  border: 'none', cursor: sending === t.id ? 'default' : 'pointer',
                  background: 'transparent', color: 'var(--cth-ink-500)',
                  fontFamily: 'var(--cth-font-ui)', fontSize: 13
                }}
                onMouseEnter={(e) => { if (sending !== t.id) e.currentTarget.style.color = 'var(--cth-coral)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cth-ink-500)'; }}
              >✕</button>
            </div>

            <div style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {closed ? <AskClosed state={notSent[t.id]} size={15} /> : (<>
              {/* The question, rendered as markdown. The god writes these with
                  emphasis, lists, `code` and links; as plain text the asterisks
                  and backticks were on screen literally. The card variant keeps
                  this card's mono face and turns a single newline into a break, so
                  a question with no markdown in it looks exactly as it did. */}
              {answer.shown && <AskTags entry={answer.shown} />}
              <div style={{ lineHeight: '19px' }}>
                <AskText q={open.q} size={15} />
              </div>
              {answer.shown && (
                <AskOptions
                  entry={answer.shown} picked={answer.picked} disabled={sending === t.id}
                  onToggle={(i) => setAnswerPicks(t.id, picksKey(open), nextPicks(answer, i))}
                />
              )}

              {/* answer box */}
              <textarea
                dir={rtl ? 'auto' : undefined}
                value={note}
                onChange={(e) => setAnswerDraft(t.id, picksKey(open), e.target.value)}
                onKeyDown={(e) => { if (isComposingKey(e)) return; if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void sendAnswer(t); }}
                rows={answer.hasOptions ? 2 : 3}
                placeholder={translate(answer.hasOptions ? 'askMe.notePlaceholder' : 'askMe.answerPlaceholder')}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '6px 8px', resize: 'vertical',
                  background: 'var(--cth-paper-100)', border: 'none',
                  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
                  fontFamily: 'var(--cth-font-mono)', fontSize: 15, lineHeight: '18px',
                  color: 'var(--cth-ink-900)', outline: 'none'
                }}
              />
              <AskNotSentRow state={notSent[t.id]} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PixelButton
                  variant="primary" size="sm"
                  disabled={!answer.text.trim() || sending === t.id}
                  onClick={() => void sendAnswer(t)}
                >
                  {sending === t.id ? translate('askMe.sending') : (label ?? translate('askMe.respond'))}
                </PixelButton>
                {(t.humanQA?.filter((e) => e.a).length ?? 0) > 0 && (
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
                )}
              </div>
              </>)}

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

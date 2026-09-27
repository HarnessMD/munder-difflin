/**
 * ONE OPEN ASK, answerable where it stands. Lifted out of the Inbox's Ask Me
 * chat (0.5.3) so the chat and the Ask me modal draw the same card over the
 * same protocol (askMeActions): who is asking, on which card, since when, the
 * question, the answer box, Answer and Dismiss. A draft lives in the store
 * (answerDrafts), so a half written answer survives closing the modal and
 * reappears in the chat, and the other way round.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { MarkdownPreview } from '@/markdown/MarkdownPreview';
import { askNagDays } from '@shared/taskHygiene';
import { askerOf } from '@shared/askMeBadge';
import { openQuestion, type HiveTask } from '../TasksKanban';
import { answerOpenQuestion, dismissOpenQuestion, dismissAllOpenQuestions } from '../askMeActions';
import { Btn, Chip, fmtWhen, proToast, useAgentById, useNameFor } from './ui';
import type { DismissAllResult } from '../askMeBulk';
import { SpritePortrait } from '../SpritePortrait';
import { useTaskHygiene } from './taskData';

/** Answer or dismiss one card, then re-read the ledger. `busy` names the card
 *  in flight so every card's buttons wait for it, as the chat always did. */
export function useAskMeAct(refresh: () => Promise<void>): {
  busy: string | null;
  act: (task: HiveTask, what: 'answer' | 'dismiss') => Promise<boolean>;
  dismissAll: (tasks: HiveTask[]) => Promise<DismissAllResult>;
  /** Cards Dismiss all has taken off the list and the ledger has not caught up with yet. */
  gone: ReadonlySet<string>;
} {
  const { t } = useTranslation();
  const drafts = useStore((s) => s.answerDrafts);
  const setAnswerDraft = useStore((s) => s.setAnswerDraft);
  const [busy, setBusy] = useState<string | null>(null);
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set());
  const act = async (task: HiveTask, what: 'answer' | 'dismiss') => {
    setBusy(task.id);
    const ok = what === 'answer'
      ? await answerOpenQuestion(task, drafts[task.id] ?? '').catch(() => false)
      : await dismissOpenQuestion(task).catch(() => false);
    if (ok && what === 'answer') setAnswerDraft(task.id, '');
    await refresh();
    setBusy(null);
    return ok;
  };
  // Dismiss all (founder on rc.4: "all at once"). Every question leaves the
  // list the moment it is confirmed, one call dismisses them all, one re-read
  // brings back only a card that did not go, and a toast says how it went.
  const dismissAll = async (tasks: HiveTask[]) => {
    setBusy(DISMISS_ALL);
    setGone(new Set(tasks.map((x) => x.id)));
    const r = await dismissAllOpenQuestions(tasks).catch(() => ({ dismissed: 0, failed: tasks.length }));
    await refresh();
    setGone(new Set());
    setBusy(null);
    if (r.failed > 0) proToast(t('pro.askMe.dismissAllFailed', { count: r.failed, total: r.dismissed + r.failed }), { tone: 'bad', ms: 8000 });
    else if (r.dismissed > 0) proToast(t('pro.askMe.dismissedAll', { count: r.dismissed }), { tone: 'ok' });
    return r;
  };
  return { busy, act, dismissAll, gone };
}

/** The `busy` marker while Dismiss all runs; no task id looks like it. */
export const DISMISS_ALL = '*all*';

export function AskMeCard({ task, busy, onAct, onOpenTask, focus, style }: {
  task: HiveTask;
  busy: string | null;
  onAct: (task: HiveTask, what: 'answer' | 'dismiss') => void;
  /** The task id is a link to the card; the modal closes itself first. */
  onOpenTask?: (id: string) => void;
  /** The question the modal was opened on: its answer box takes the caret. */
  focus?: boolean;
  style?: CSSProperties;
}) {
  const { t, i18n } = useTranslation();
  const drafts = useStore((s) => s.answerDrafts);
  const setAnswerDraft = useStore((s) => s.setAnswerDraft);
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const agentById = useAgentById();
  const nameFor = useNameFor();
  const hygiene = useTaskHygiene();
  const box = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!focus) return;
    box.current?.focus();
    box.current?.scrollIntoView({ block: 'nearest' });
  }, [focus]);
  const open = openQuestion(task);
  if (!open) return null;
  // Who is asking: the same rule that puts the ask on an agent's tab.
  const asker = askerOf(task) || undefined;
  const a = agentById(asker);
  const draft = drafts[task.id] ?? '';
  // W-A: a question that has waited past the nag threshold says so here, on
  // the card, instead of being archived under the person.
  const nag = askNagDays(task, hygiene, Date.now());
  return (
    <div data-ask-card={task.id} style={{ padding: 14, borderRadius: 12, background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-300)', display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--cth-ink-500)', flexWrap: 'wrap' }}>
        {a ? <SpritePortrait character={a.character} size={28} /> : null}
        <span>{nameFor(asker) ?? nameFor('god')}</span>
        <span>·</span>
        <button type="button" onClick={() => (onOpenTask ?? openTaskDetail)(task.id)} style={{ font: 'inherit', fontFamily: 'var(--cth-font-mono)', color: 'var(--cth-accent-text)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>{task.id}</button>
        {open.askedAt && <><span>·</span><span style={{ fontFamily: 'var(--cth-font-mono)' }}>{fmtWhen(open.askedAt, i18n.language)}</span></>}
        {nag !== null && <Chip tone="warn">{t('pro.tasks.askOpenDays', { count: nag })}</Chip>}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: '20px', color: 'var(--cth-ink-900)' }}><MarkdownPreview source={open.q} variant="card" /></div>
      <div style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{task.title}</div>
      <textarea
        ref={box} data-ask-answer={task.id}
        value={draft} onChange={(e) => setAnswerDraft(task.id, e.target.value)} rows={2}
        placeholder={t('pro.inbox.answerPlaceholder')}
        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', font: 'inherit', fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)', outline: 'none' }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn kind="primary" size="sm" disabled={busy !== null || !draft.trim()} onClick={() => onAct(task, 'answer')}>{t('pro.sheet.answer')}</Btn>
        <Btn kind="ghost" size="sm" disabled={busy !== null} onClick={() => onAct(task, 'dismiss')}>{t('pro.sheet.dismiss')}</Btn>
      </div>
    </div>
  );
}

/**
 * What answering or dismissing an open ask DOES, shared by every surface that
 * offers it. One copy of the ledger patch and one copy of the notice the
 * agent that asked receives, so the surfaces cannot drift into two protocols.
 *
 * Main writes the answer (hive:answerQuestion). The window names the
 * card and the ONE entry (askRef: its q, askedAt or nth, the labels shown) and the change;
 * main finds that entry on the card as it is on disk and changes only it, so
 * an entry the god added or edited since the window's last poll, and every
 * field the window never read, stays as it is. No such entry: 'gone', nothing
 * is written and the caller keeps the draft. withAnswer, withDismissal and
 * recordAnswer only show the change at once in the caller's own view.
 */
import type { HiveTask, HumanQA } from './TasksKanban';
import { openQuestion } from './TasksKanban';
import { dismissAllAtOnce, type DismissAllResult } from './askMeBulk';
import { chosenLine, rawChosen } from './humanQuestion';
import { askLabels } from '@shared/askOptions';
import { answerRecipient, type AnswerRoster } from '@shared/askMeBadge';

/** The card's humanQA with the open entry answered, for the caller's own view.
 *  `open` is matched by identity only: a text match could mark another entry. */
export function withAnswer(qa: HumanQA[] | undefined, open: HumanQA, text: string, now = new Date().toISOString()): HumanQA[] {
  return (qa ?? []).map((e) => (e === open ? { ...e, a: text, answeredAt: now } : e));
}

/** The card's humanQA with the open entry dismissed, for the caller's own view:
 *  no fabricated answer, the question stays on the card, openQuestion() stops
 *  returning it. Matched by identity only. */
export function withDismissal(qa: HumanQA[] | undefined, open: HumanQA, now = new Date().toISOString()): HumanQA[] {
  return (qa ?? []).map((e) => (e === open ? { ...e, dismissedAt: now } : e));
}

/** Which entry main changes, as this card shows it. */
export interface AskRef { q: string; askedAt?: string; nth?: number; labels: string[] }

/** Which entry main changes: its question; its askedAt when it has one, else
 *  how many earlier entries on the card share that question (a repeat of a
 *  question is otherwise the same entry to main); and the option labels shown,
 *  so an answer to options rewritten since does not land. */
export function askRef(task: HiveTask, open: HumanQA): AskRef {
  const labels = askLabels(open.options);
  if (typeof open.askedAt === 'string') return { q: open.q, askedAt: open.askedAt, labels };
  const qa = task.humanQA ?? [];
  const at = qa.indexOf(open);
  return at < 0 ? { q: open.q, labels } : { q: open.q, nth: qa.slice(0, at).filter((e) => e.q === open.q).length, labels };
}

/** Write an answer on the open entry (`open` is the STORED entry; `chosen` the
 *  picks as the card showed them, sent as RAW positions). */
export function saveAnswer(task: HiveTask, open: HumanQA, text: string, chosen?: number[], now = new Date().toISOString()): Promise<{ ok: boolean; error?: string }> {
  const raw = rawChosen(open, chosen);
  return window.cth.hiveAnswerQuestion(task.id, askRef(task, open), { a: text, answeredAt: now, ...(raw.length ? { chosen: raw } : {}) });
}

/** Write a dismissal on the open entry. */
export function saveDismissal(task: HiveTask, open: HumanQA, now = new Date().toISOString()): Promise<{ ok: boolean; error?: string }> {
  return window.cth.hiveAnswerQuestion(task.id, askRef(task, open), { dismissedAt: now });
}

/** The message that carries the answer to the agent that asked (or the god)
 *  so it picks the answer up and unblocks the card. `chosen`: the options
 *  picked, as the card showed them (humanQuestion.ts). */
export function answerNotice(task: HiveTask, open: HumanQA, text: string, chosen?: number[], to = 'god'): { to: string; act: 'inform'; subject: string; body: string } {
  const chose = chosenLine(open, chosen);
  return {
    to,
    act: 'inform',
    subject: `HUMAN ANSWER on task "${task.title}"`,
    body: [
      `The human answered the open question on task ${task.id} ("${task.title}"):`,
      `Q: ${open.q}`,
      ...(chose ? [chose] : []),
      `A: ${text}`,
      'The answer is also recorded in the card\'s humanQA. Act on it, unblock the card, and continue the work.'
    ].join('\n')
  };
}

/** What became of an answer: sent; `gone`, main found no such open question
 *  (changed or closed while the person wrote) and wrote nothing; or `failed`,
 *  anything else (the answer stays in the box to try again). */
export type AnswerOutcome = 'sent' | 'gone' | 'failed';

/** Answer the card's open question: patch the ledger, then tell the agent
 *  that asked (answerRecipient).
 *  `chosen`: the options picked, as the card showed them; `text` already
 *  names them (composeAnswer). Once the ledger holds the answer it is sent: a
 *  notice that fails is logged, never shown as not sent (a retry would only
 *  meet 'gone'); the answer is still on the card. */
export async function answerOpenQuestion(task: HiveTask, text: string, chosen?: number[]): Promise<AnswerOutcome> {
  const open = openQuestion(task);
  const body = text.trim();
  if (!open) return 'gone';
  if (!body) return 'failed';
  const result = await saveAnswer(task, open, body, chosen);
  if (!result.ok) return result.error === 'gone' ? 'gone' : 'failed';
  await sendAnswerNotice(task, open, body, chosen);
  return 'sent';
}

/** Tell the agent that asked (answerRecipient; the god when the roster
 *  cannot be read) that an answer landed; a failure is logged, never thrown.
 *  The asker is read from `task` as the caller had it, before the answer was
 *  written. */
export async function sendAnswerNotice(task: HiveTask, open: HumanQA, text: string, chosen?: number[]): Promise<void> {
  let roster: AnswerRoster | null = null;
  try { roster = await window.cth.hiveRegistry(); } catch { /* unread: the god hears it */ }
  const to = answerRecipient(task, roster);
  try { await window.cth.hiveSend(answerNotice(task, open, text, chosen, to), 'human'); }
  catch (e) { console.error(`[askme] the answer on ${task.id} is saved, but the notice to ${to} failed:`, e); }
}

/** The message that tells the agent that asked its question was declined, with
 *  the person's reason (Decline is the dismissal plus this notice). */
export function declineNotice(task: HiveTask, open: HumanQA, reason: string, to = 'god'): { to: string; act: 'inform'; subject: string; body: string } {
  return {
    to,
    act: 'inform',
    subject: `HUMAN DECLINED on task "${task.title}"`,
    body: [
      `The human declined the open question on task ${task.id} ("${task.title}"):`,
      `Q: ${open.q}`,
      `Reason: ${reason}`,
      'The question is closed on the card\'s humanQA (dismissedAt). Do not wait for an answer: act on the reason and continue the work.'
    ].join('\n')
  };
}

/** Decline the card's open question: write the dismissal, then tell the agent
 *  that asked, with the reason. The reason is required: none, nothing is
 *  written ('failed'). Once the dismissal is written it is sent: a notice that
 *  fails is logged, as with an answer. */
export async function declineOpenQuestion(task: HiveTask, reason: string): Promise<AnswerOutcome> {
  const open = openQuestion(task);
  const why = reason.trim();
  if (!open) return 'gone';
  if (!why) return 'failed';
  const result = await saveDismissal(task, open);
  if (!result.ok) return result.error === 'gone' ? 'gone' : 'failed';
  let roster: AnswerRoster | null = null;
  try { roster = await window.cth.hiveRegistry(); } catch { /* unread: the god hears it */ }
  const to = answerRecipient(task, roster);
  try { await window.cth.hiveSend(declineNotice(task, open, why, to), 'human'); }
  catch (e) { console.error(`[askme] the decline on ${task.id} is saved, but the notice to ${to} failed:`, e); }
  return 'sent';
}

/** Dismiss the card's open question without answering it. */
export async function dismissOpenQuestion(task: HiveTask): Promise<boolean> {
  const open = openQuestion(task);
  if (!open) return false;
  const result = await saveDismissal(task, open);
  return !!result.ok;
}

/** What a single Dismiss asks main to change, or null when nothing is open. */
export function dismissalItem(task: HiveTask, now = new Date().toISOString()): { ref: AskRef; change: { dismissedAt: string } } | null {
  const open = openQuestion(task);
  return open ? { ref: askRef(task, open), change: { dismissedAt: now } } : null;
}

/** Dismiss every open question in the list AT ONCE (founder on rc.4: "it
 *  should be doing it all at once"): the single Dismiss's change for each card,
 *  sent in one call that main writes and commits once. askMeBulk counts. */
export function dismissAllOpenQuestions(tasks: readonly HiveTask[]): Promise<DismissAllResult> {
  const now = new Date().toISOString();
  return dismissAllAtOnce(tasks, (task) => dismissalItem(task, now),
    (items) => window.cth.hiveAnswerQuestions(items.map((i) => ({ taskId: i.id, ...i.patch }))));
}

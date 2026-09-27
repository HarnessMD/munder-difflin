/**
 * What answering or dismissing an open ask DOES, shared by every surface that
 * offers it: the Classic ASK ME tab, the PRO Inbox "For you" list and the PRO
 * task sheet. One copy of the ledger patch and one copy of the notice the god
 * receives, so the three cannot drift into three protocols.
 *
 * Both helpers are pure over the card they are given; the caller re-reads the
 * ledger and decides what to do with the result (optimistic state or a plain
 * refresh). `hive:patchTask` merges ONE field against the latest on-disk
 * ledger, so a card the god added since the caller's last poll survives.
 */
import type { HiveTask, HumanQA } from './TasksKanban';
import { openQuestion } from './TasksKanban';
import { dismissAllAtOnce, type DismissAllResult } from './askMeBulk';

/** The card's humanQA with the open entry answered. `open` is re-located by
 *  identity, then by text, so an answer never lands on a question the god
 *  swapped in underneath the caller's snapshot. */
export function withAnswer(qa: HumanQA[] | undefined, open: HumanQA, text: string, now = new Date().toISOString()): HumanQA[] {
  return (qa ?? []).map((e) => (e === open || (e.q === open.q && !e.a) ? { ...e, a: text, answeredAt: now } : e));
}

/** The card's humanQA with the open entry dismissed: no fabricated answer, the
 *  question stays on the card, openQuestion() stops returning it. */
export function withDismissal(qa: HumanQA[] | undefined, open: HumanQA, now = new Date().toISOString()): HumanQA[] {
  return (qa ?? []).map((e) => (e === open || (e.q === open.q && !e.a && !e.dismissedAt) ? { ...e, dismissedAt: now } : e));
}

/** The message the god gets so it picks the answer up and unblocks the card. */
export function answerNotice(task: HiveTask, open: HumanQA, text: string): { to: string; act: 'inform'; subject: string; body: string } {
  return {
    to: 'god',
    act: 'inform',
    subject: `HUMAN ANSWER on task "${task.title}"`,
    body: [
      `The human answered the open question on task ${task.id} ("${task.title}"):`,
      `Q: ${open.q}`,
      `A: ${text}`,
      'The answer is also recorded in the card\'s humanQA. Act on it, unblock the card, and continue the work.'
    ].join('\n')
  };
}

/** Answer the card's open question: patch the ledger, then tell the god.
 *  Resolves false when there was nothing open or the patch did not land (the
 *  caller keeps the draft so the person can retry). */
export async function answerOpenQuestion(task: HiveTask, text: string): Promise<boolean> {
  const open = openQuestion(task);
  const body = text.trim();
  if (!open || !body) return false;
  const result = await window.cth.hivePatchTask(task.id, { humanQA: withAnswer(task.humanQA, open, body) });
  if (!result.ok) return false;
  await window.cth.hiveSend(answerNotice(task, open, body), 'human');
  return true;
}

/** Dismiss the card's open question without answering it. */
export async function dismissOpenQuestion(task: HiveTask): Promise<boolean> {
  const patch = dismissalPatch(task);
  if (!patch) return false;
  const result = await window.cth.hivePatchTask(task.id, patch);
  return !!result.ok;
}

/** The patch a single Dismiss writes, or null when nothing is open. */
export function dismissalPatch(task: HiveTask, now?: string): { humanQA: HumanQA[] } | null {
  const open = openQuestion(task);
  return open ? { humanQA: withDismissal(task.humanQA, open, now) } : null;
}

/** Dismiss every open question in the list AT ONCE (founder on rc.4: "it
 *  should be doing it all at once"): the single Dismiss's patch for each card,
 *  sent in one call that main writes and commits once. askMeBulk counts. */
export function dismissAllOpenQuestions(tasks: readonly HiveTask[]): Promise<DismissAllResult> {
  const now = new Date().toISOString();
  return dismissAllAtOnce(tasks, (task) => dismissalPatch(task, now), (patches) => window.cth.hivePatchTasks(patches));
}

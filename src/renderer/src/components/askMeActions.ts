import { openQuestion, type HiveTask } from './TasksKanban';

/**
 * Answer or dismiss the open humanQA on one card.
 *
 * Re-reads the ledger first. The patch is one card's humanQA, so a card the
 * orchestrator added since the last poll is left alone, and an answer cannot
 * land on a question that was swapped out underneath the draft.
 */

function parse(raw: unknown): HiveTask[] {
  const list = (raw && typeof raw === 'object' && Array.isArray((raw as { tasks?: unknown }).tasks))
    ? (raw as { tasks: HiveTask[] }).tasks
    : [];
  return list.filter((t) => !!t && typeof t === 'object');
}

export async function answerOpenQuestion(taskId: string, answer: string): Promise<{ ok: boolean }> {
  const text = answer.trim();
  if (!text || !taskId) return { ok: false };
  try {
    const tasks = parse(await window.cth.hiveTasks());
    const task = tasks.find((t) => t.id === taskId);
    const open = task ? openQuestion(task) : undefined;
    if (!task || !open) return { ok: false };
    const humanQA = (task.humanQA ?? []).map((e) =>
      e === open || (e.q === open.q && !e.a && !e.dismissedAt)
        ? { ...e, a: text, answeredAt: new Date().toISOString() }
        : e
    );
    const saved = await window.cth.hivePatchTask(task.id, { humanQA });
    if (!saved.ok) return { ok: false };
    await window.cth.hiveSend({
      to: 'god',
      act: 'inform',
      subject: `HUMAN ANSWER on task "${task.title}"`,
      body: [
        `The human answered the open question on task ${task.id} ("${task.title}"):`,
        `Q: ${open.q}`,
        `A: ${text}`,
        'The answer is also recorded in the card\'s humanQA. Act on it, unblock the card, and continue the work.'
      ].join('\n')
    }, 'human');
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function dismissOpenQuestion(taskId: string): Promise<{ ok: boolean }> {
  if (!taskId) return { ok: false };
  try {
    const tasks = parse(await window.cth.hiveTasks());
    const task = tasks.find((t) => t.id === taskId);
    const open = task ? openQuestion(task) : undefined;
    if (!task || !open) return { ok: false };
    const humanQA = (task.humanQA ?? []).map((e) =>
      e === open || (e.q === open.q && !e.a && !e.dismissedAt)
        ? { ...e, dismissedAt: new Date().toISOString() }
        : e
    );
    const saved = await window.cth.hivePatchTask(task.id, { humanQA });
    return { ok: saved.ok };
  } catch {
    return { ok: false };
  }
}

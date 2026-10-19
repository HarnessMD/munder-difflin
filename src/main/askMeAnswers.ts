/**
 * The main side of `hive:answerQuestion` and `hive:answerQuestions`: an answer
 * or a dismissal changes ONE humanQA entry, the one the card showed, on the
 * latest tasks.json. The window never writes a card's whole humanQA list: its
 * copy is up to 5 s old, and writing it back would undo an entry the god added
 * since. Several requests (Dismiss all) are applied in order and written once.
 *
 * Pure and Electron free: Hive.answerQuestions reads and writes the ledger.
 */
import {
  answerMail,
  composeAnswer,
  normalizeHumanQA,
  normalizeOptionsIndexed,
  openQuestionByRef,
  type AnswerRequest,
  type QuestionRef
} from '../shared/humanQuestion';

const MAX_ID = 200;

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function parseRef(raw: unknown): QuestionRef | null {
  if (!isObject(raw) || typeof raw.q !== 'string') return null;
  if (!Number.isSafeInteger(raw.nth) || (raw.nth as number) < 0) return null;
  if (raw.askedAt !== undefined && typeof raw.askedAt !== 'string') return null;
  if (raw.labels !== undefined && (!Array.isArray(raw.labels) || !raw.labels.every((l) => typeof l === 'string'))) return null;
  return {
    q: raw.q,
    nth: raw.nth as number,
    ...(typeof raw.askedAt === 'string' ? { askedAt: raw.askedAt } : {}),
    ...(Array.isArray(raw.labels) ? { labels: raw.labels as string[] } : {})
  };
}

/** A well formed request, or null (reported as invalid). */
export function parseAnswerRequest(raw: unknown): AnswerRequest | null {
  if (!isObject(raw)) return null;
  const taskId = raw.taskId;
  if (typeof taskId !== 'string' || !taskId || taskId.length > MAX_ID) return null;
  const ref = parseRef(raw.ref);
  if (!ref) return null;
  if (raw.dismiss === true) return raw.answer === undefined ? { taskId, ref, dismiss: true } : null;
  const a = raw.answer;
  if (!isObject(a) || typeof a.text !== 'string') return null;
  if (a.chosen !== undefined && (!Array.isArray(a.chosen) || !a.chosen.every((i) => Number.isSafeInteger(i) && (i as number) >= 0))) return null;
  return { taskId, ref, answer: { text: a.text, ...(Array.isArray(a.chosen) ? { chosen: a.chosen as number[] } : {}) } };
}

export interface AppliedAnswer {
  result: 'ok' | 'gone' | 'invalid';
  /** For an answer that was applied: the god's inbox message. */
  notice?: { subject: string; body: string };
}

/**
 * Apply each request, in order, to the raw ledger list. Returns the next list
 * (only changed cards replaced, every other field kept as written), whether
 * anything changed, and one result per request.
 */
export function applyAnswers(
  rawTasks: unknown[],
  reqs: Array<AnswerRequest | null>,
  nowIso: string
): { tasks: unknown[]; changed: boolean; outcomes: AppliedAnswer[] } {
  const tasks = rawTasks.slice();
  let changed = false;
  const outcomes = reqs.map((req): AppliedAnswer => {
    if (!req) return { result: 'invalid' };
    const at = tasks.findIndex((t) => isObject(t) && t.id === req.taskId);
    if (at < 0) return { result: 'gone' };
    const card = tasks[at] as Record<string, unknown>;
    const i = openQuestionByRef(card, req.ref, 'answer' in req);
    if (i < 0) return { result: 'gone' };
    const qa = (card.humanQA as unknown[]).slice();
    const entry = qa[i] as Record<string, unknown>;
    let notice: AppliedAnswer['notice'];
    if ('dismiss' in req) {
      qa[i] = { ...entry, dismissedAt: nowIso };
    } else {
      const shown = normalizeHumanQA(entry)!;
      const options = shown.options ?? [];
      const chosen = [...new Set(req.answer.chosen ?? [])].sort((a, b) => a - b);
      if (chosen.some((c) => c >= options.length)) return { result: 'invalid' };
      if (chosen.length > 1 && !shown.multi) return { result: 'invalid' };
      const text = composeAnswer(options, chosen, req.answer.text);
      if (!text) return { result: 'invalid' };
      // The card's picks index the valid list; the ledger keeps raw positions.
      const rawIndex = normalizeOptionsIndexed(entry.options)?.rawIndex ?? [];
      const rest = { ...entry };
      delete rest.chosen;
      qa[i] = { ...rest, a: text, answeredAt: nowIso, ...(chosen.length ? { chosen: chosen.map((c) => rawIndex[c]) } : {}) };
      const title = typeof card.title === 'string' ? card.title : req.taskId;
      notice = answerMail({ id: req.taskId, title }, entry, { text, chosen });
    }
    tasks[at] = { ...card, humanQA: qa };
    changed = true;
    return notice ? { result: 'ok', notice } : { result: 'ok' };
  });
  return { tasks, changed, outcomes };
}

/**
 * Ask Me: the questions on a task card (`humanQA`), shared by main (which writes
 * an answer or a dismissal, askMeAnswers) and the window (which shows the open
 * question). One rule for "what is still asked", so every surface agrees.
 *
 * A humanQA entry is written by hand by the god, so everything is validated:
 *   { q, a?, askedAt?, answeredAt?, dismissedAt?,
 *     options?: [{ label, detail? }] or ["label", ...], recommended?: <option index>,
 *     multi?: boolean, chosen?: <option indexes the human picked> }
 * Every field but q is optional: an entry with only q is a free text question,
 * as before. `recommended` and `chosen` are positions in the options list AS
 * WRITTEN (raw), so an invalid option never shifts the ones after it.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT).
 */

export interface HumanQAOption {
  label: string;
  detail?: string;
}

/** The fields a humanQA entry may carry, validated (normalizeHumanQA). */
export interface HumanQAFields {
  q: string;
  a?: string;
  askedAt?: string;
  answeredAt?: string;
  dismissedAt?: string;
  options?: HumanQAOption[];
  recommended?: number;
  multi?: boolean;
  chosen?: number[];
}

/** More than this is a form, not a choice; the rest are dropped (the note field remains). */
export const MAX_OPTIONS = 8;
const MAX_LABEL = 200;
const MAX_DETAIL = 2000;

/** Valid options only (non-empty string labels, optional string detail), capped. */
export function normalizeOptions(raw: unknown): HumanQAOption[] | undefined {
  return normalizeOptionsIndexed(raw)?.options;
}

/**
 * The valid options plus, for each, its position in the RAW stored list. The stored
 * `recommended` and `chosen` are RAW positions (what the god wrote, and what stays in
 * tasks.json); the card works on the valid list. Without this map, an invalid option (an
 * empty label, say) ahead of a valid one would shift every index after it.
 */
export function normalizeOptionsIndexed(raw: unknown): { options: HumanQAOption[]; rawIndex: number[] } | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: HumanQAOption[] = [];
  const rawIndex: number[] = [];
  for (let r = 0; r < raw.length; r++) {
    const o: unknown = raw[r];
    if (out.length >= MAX_OPTIONS) break;
    // A bare string is accepted as a label (the god may write ["A", "B"]).
    const label = typeof o === 'string' ? o : (o && typeof o === 'object' ? (o as { label?: unknown }).label : undefined);
    if (typeof label !== 'string' || !label.trim()) continue;
    const detail = o && typeof o === 'object' ? (o as { detail?: unknown }).detail : undefined;
    out.push({
      label: label.trim().slice(0, MAX_LABEL),
      ...(typeof detail === 'string' && detail.trim() ? { detail: detail.trim().slice(0, MAX_DETAIL) } : {})
    });
    rawIndex.push(r);
  }
  return out.length ? { options: out, rawIndex } : undefined;
}

/** Normalize one raw humanQA entry, or null when it has no string q. Unknown fields are
 *  dropped; the optional fields survive only when valid. */
export function normalizeHumanQA(raw: unknown): HumanQAFields | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.q !== 'string') return null;
  const indexed = normalizeOptionsIndexed(e.options);
  const options = indexed?.options;
  // Stored recommended/chosen are RAW positions: map each to its place in the valid list.
  const toShown = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) && indexed ? indexed.rawIndex.indexOf(v) : -1);
  const rec = toShown(e.recommended);
  const chosen = Array.isArray(e.chosen) ? [...new Set(e.chosen.map(toShown).filter((i) => i >= 0))].sort((a, b) => a - b) : [];
  return {
    q: e.q,
    ...(typeof e.a === 'string' ? { a: e.a } : {}),
    ...(typeof e.askedAt === 'string' ? { askedAt: e.askedAt } : {}),
    ...(typeof e.answeredAt === 'string' ? { answeredAt: e.answeredAt } : {}),
    ...(typeof e.dismissedAt === 'string' ? { dismissedAt: e.dismissedAt } : {}),
    ...(options ? { options } : {}),
    ...(rec >= 0 ? { recommended: rec } : {}),
    ...(options && e.multi === true ? { multi: true } : {}),
    ...(chosen.length ? { chosen } : {})
  };
}

/** An entry the window lists: an object with a string q. */
function isEntry(e: unknown): e is Record<string, unknown> & { q: string } {
  return !!e && typeof e === 'object' && typeof (e as { q?: unknown }).q === 'string';
}

/**
 * Closed, by text only: an answer with text in it, or a dismissal stamp. Nothing
 * else closes an entry, so `"a": ""`, `"a": true` or picks without an answer
 * leave the question asked on every surface alike.
 */
export function entryClosed(e: unknown): boolean {
  if (!isEntry(e)) return true;
  const hasText = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';
  return hasText(e.a) || hasText(e.dismissedAt);
}

/** Where the card's open question sits in its raw humanQA list, or -1. The open
 *  question is the LAST entry still open. A done card asks nothing. */
export function openQuestionIndex(task: unknown): number {
  if (!task || typeof task !== 'object') return -1;
  const t = task as { status?: unknown; humanQA?: unknown };
  if (t.status === 'done' || !Array.isArray(t.humanQA)) return -1;
  for (let i = t.humanQA.length - 1; i >= 0; i--) {
    if (!entryClosed(t.humanQA[i])) return i;
  }
  return -1;
}

/** The card's open question, if any (openQuestionIndex). */
export function openQuestion<E>(task: { status?: string; humanQA?: E[] }): E | undefined {
  const i = openQuestionIndex(task);
  return i < 0 ? undefined : task.humanQA![i];
}

/**
 * How a write names the question the card showed. With an askedAt, q and askedAt
 * name it; without one, q and `nth`. `nth` counts only entries with a string q
 * (as the window lists them), so an entry the window skips cannot shift it.
 */
export interface QuestionRef {
  q: string;
  askedAt?: string;
  nth: number;
  /** For an answer: the option labels the card showed, in order ([] for none).
   *  A changed list is a changed question. */
  labels?: string[];
}

/** The ref for the card's open question, from the card as stored (its options
 *  kept), or null when nothing is asked. */
export function questionRef(task: { status?: string; humanQA?: unknown[] }): QuestionRef | null {
  const i = openQuestionIndex(task);
  if (i < 0) return null;
  const qa = task.humanQA!;
  const e = qa[i] as Record<string, unknown> & { q: string };
  return {
    q: e.q,
    ...(typeof e.askedAt === 'string' ? { askedAt: e.askedAt } : {}),
    nth: qa.slice(0, i).filter(isEntry).length,
    labels: (normalizeOptions(e.options) ?? []).map((o) => o.label)
  };
}

/** The raw index of the card's open question when `ref` still names it (for an
 *  answer, with the same labels), else -1: it changed or closed. */
export function openQuestionByRef(task: unknown, ref: QuestionRef, forAnswer: boolean): number {
  const i = openQuestionIndex(task);
  if (i < 0) return -1;
  const qa = (task as { humanQA: unknown[] }).humanQA;
  const e = qa[i] as Record<string, unknown> & { q: string };
  if (e.q !== ref.q) return -1;
  if (ref.askedAt !== undefined) {
    if (e.askedAt !== ref.askedAt) return -1;
  } else if (typeof e.askedAt === 'string' || qa.slice(0, i).filter(isEntry).length !== ref.nth) {
    return -1;
  }
  if (forAnswer) {
    const now = (normalizeOptions(e.options) ?? []).map((o) => o.label);
    const shown = ref.labels ?? [];
    if (now.length !== shown.length || now.some((l, k) => l !== shown[k])) return -1;
  }
  return i;
}

/** The answer text written to `a` (what the god reads). Options answer by their labels;
 *  a note is appended; a bare note is the answer, as before. Empty -> null. */
export function composeAnswer(options: HumanQAOption[] | undefined, chosen: number[], note: string): string | null {
  const labels = (options ?? []).filter((_, i) => chosen.includes(i)).map((o) => o.label);
  const n = note.trim();
  if (!labels.length) return n || null;
  const pick = labels.join('; ');
  return n ? `${pick}\n\nNote: ${n}` : pick;
}

/** The inbox message the god gets for an answer. `chosen` indexes the valid list. */
export function answerMail(task: { id: string; title: string }, open: unknown, answer: { text: string; chosen?: number[] }): { subject: string; body: string } {
  const e = (open && typeof open === 'object' ? open : {}) as { q?: unknown; options?: unknown };
  const indexed = normalizeOptionsIndexed(e.options);
  const opts = indexed?.options ?? [];
  const chosen = (answer.chosen ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < opts.length);
  return {
    subject: `HUMAN ANSWER on task "${task.title}"`,
    body: [
      `The human answered the open question on task ${task.id} ("${task.title}"):`,
      `Q: ${typeof e.q === 'string' ? e.q : ''}`,
      // #n is the option's position in the list as the god wrote it (the stored raw index).
      ...(chosen.length ? [`CHOSE: ${chosen.map((i) => `#${indexed!.rawIndex[i]} "${opts[i].label}"`).join(', ')}`] : []),
      `A: ${answer.text}`,
      'The answer is also recorded in the card\'s humanQA. Act on it, unblock the card, and continue the work.'
    ].join('\n')
  };
}

/** One write from the window: answer, or dismiss, the question a card showed.
 *  `chosen` indexes the valid options the card showed. */
export type AnswerRequest =
  | { taskId: string; ref: QuestionRef; answer: { text: string; chosen?: number[] } }
  | { taskId: string; ref: QuestionRef; dismiss: true };

/**
 * - ok: written (an answer is sent once it is saved; the god's notice follows,
 *   and a notice that fails is logged, never reported as not sent);
 * - gone: the card is gone or done, or its question changed or closed; nothing written;
 * - invalid: a malformed request, no text and no pick, or several picks on a one pick question;
 * - failed: tasks.json could not be written (damaged, or not readable just now); see error.
 */
export interface AnswerOutcome {
  result: 'ok' | 'gone' | 'invalid' | 'failed';
  error?: string;
}

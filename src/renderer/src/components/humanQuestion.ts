// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * The pure logic behind an ASK ME card with options (no React here, so every
 * surface that shows an ask can share it).
 *
 * A humanQA entry is written by hand by the god, so everything is validated:
 *   { q, a?, askedAt?, answeredAt?, dismissedAt?, from?,
 *     options?: [{ label, detail? }], recommended?: <option index>, multi?: boolean,
 *     chosen?: <option indexes the human picked> }
 * Indexes count from 0. Every new field is optional: an entry without them comes
 * out exactly as today, and `a` always carries the answer as text.
 */
import type { HumanQA } from './TasksKanban';
import { normalizeOptionsIndexed } from '../../../shared/askOptions';

// The option rule lives in shared/askOptions.ts so main checks an answer the
// same way; it is re-exported here for every surface that used it.
export { MAX_OPTIONS, MAX_RAW_OPTIONS, normalizeOptionsIndexed } from '../../../shared/askOptions';

export type HumanQAOption = NonNullable<HumanQA['options']>[number];

/** Valid options only (non-empty string labels, optional string detail), capped. */
export function normalizeOptions(raw: unknown): HumanQAOption[] | undefined {
  return normalizeOptionsIndexed(raw)?.options;
}

/** One raw humanQA entry as a card shows it, or null when it has no string q. Unknown
 *  fields are dropped; the new optional fields survive only when valid, with
 *  `recommended` and `chosen` as positions in the valid option list. */
export function normalizeHumanQA(raw: unknown): HumanQA | null {
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
    ...(typeof e.from === 'string' ? { from: e.from } : {}),
    ...(options ? { options } : {}),
    ...(rec >= 0 ? { recommended: rec } : {}),
    ...(options && e.multi === true ? { multi: true } : {}),
    ...(chosen.length ? { chosen } : {})
  };
}

const HEADLINE_MAX = 140;
const LIST_LINE = /^\s*(?:[-*+•]|\d+[.)])\s+/;

/**
 * Split a question into a short headline (shown bold) and the body below it.
 * The headline is the first line when it is short and not a list item; otherwise the
 * first sentence of the first line, when that is short. Leading markdown heading marks
 * are dropped from the headline. No split -> the whole text is the body.
 */
export function splitHeadline(q: string): { headline: string | null; body: string } {
  const text = q.replace(/\r\n?/g, '\n').replace(/^\s*\n/, '');
  const nl = text.indexOf('\n');
  const first = (nl < 0 ? text : text.slice(0, nl)).trim();
  const rest = nl < 0 ? '' : text.slice(nl + 1);
  if (!first || LIST_LINE.test(first)) return { headline: null, body: text.trim() };
  const clean = first.replace(/^#{1,6}\s+/, '');
  if (clean.length <= HEADLINE_MAX) return { headline: clean, body: rest.trim() };
  const m = /^(.{10,}?[.?!:])\s+(.*)$/s.exec(clean);
  if (m && m[1].length <= HEADLINE_MAX) {
    return { headline: m[1], body: [m[2], rest].filter((s) => s.trim()).join('\n').trim() };
  }
  return { headline: null, body: text.trim() };
}

/** The picked set after clicking option `i`: multi toggles membership; single selects it
 *  (clicking the selected one again clears it). Sorted, de-duplicated. A click only
 *  picks; the person still presses answer. */
export function togglePick(multi: boolean | undefined, cur: number[], i: number): number[] {
  if (multi) return (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]).sort((a, b) => a - b);
  return cur.length === 1 && cur[0] === i ? [] : [i];
}

/** The answer text written to `a` (what the god reads). Options answer by their labels;
 *  a note is appended; a bare note is the answer, as today. Empty -> null. */
export function composeAnswer(options: HumanQAOption[] | undefined, chosen: number[], note: string): string | null {
  const labels = (options ?? []).filter((_, i) => chosen.includes(i)).map((o) => o.label);
  const n = note.trim();
  if (!labels.length) return n || null;
  const pick = labels.join('; ');
  return n ? `${pick}\n\nNote: ${n}` : pick;
}

/** The answer as the card hands it to its host: `chosen` indexes the valid list the card showed. */
export interface ComposedAnswer {
  text: string;
  chosen?: number[];
}

/** The card's picks as RAW positions in the stored entry's options, sorted; out of range
 *  ones dropped. What main is sent as `chosen` (hive:answerQuestion). */
export function rawChosen(open: HumanQA, chosen: number[] | undefined): number[] {
  const rawIndex = normalizeOptionsIndexed(open.options)?.rawIndex ?? [];
  return [...new Set((chosen ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < rawIndex.length).map((i) => rawIndex[i]))].sort((a, b) => a - b);
}

/**
 * The card's humanQA with the open entry answered: `a` and `answeredAt`, plus `chosen`
 * (raw positions, from 0) when options were picked. `open` is matched by identity only,
 * as askMeActions.withAnswer does; with no picks the result is exactly withAnswer's. It
 * only shows the answer at once; main writes it (hive:answerQuestion).
 *
 * Pass the STORED entry (from task.humanQA, as main hands it over) as `open`, here and to
 * chosenLine; give only the card the normalized entry (normalizeHumanQA). A normalized
 * `open` would make the raw position map the identity and store the shown indexes.
 */
export function recordAnswer<T extends HumanQA>(qa: T[] | undefined, open: T, answer: ComposedAnswer, nowIso = new Date().toISOString()): T[] {
  const chosen = rawChosen(open, answer.chosen);
  return (qa ?? []).map((e) =>
    e === open
      ? { ...e, a: answer.text, answeredAt: nowIso, ...(chosen.length ? { chosen } : {}) }
      : e);
}

/** The line the god's answer notice gains when options were picked, e.g.
 *  `CHOSE: #0 "Ship B now", #2 "Wait for C"` (#n is the position as the god wrote it,
 *  from 0), or null when nothing was picked. A label's whitespace is collapsed and it is
 *  quoted as JSON, so a newline or a quote in it cannot split the notice. */
export function chosenLine(open: HumanQA, chosen: number[] | undefined): string | null {
  const indexed = normalizeOptionsIndexed(open.options);
  if (!indexed) return null;
  const picked = [...new Set(chosen ?? [])].filter((i) => Number.isInteger(i) && i >= 0 && i < indexed.options.length).sort((a, b) => a - b);
  return picked.length
    ? `CHOSE: ${picked.map((i) => `#${indexed.rawIndex[i]} ${JSON.stringify(indexed.options[i].label.replace(/\s+/g, ' ').trim())}`).join(', ')}`
    : null;
}

/** The key unsent picks are kept under: the question plus a hash of its option labels, so
 *  a rewrite that reorders or changes the options does not move picks onto other labels. */
export function picksKey(open: HumanQA): string {
  const labels = JSON.stringify((normalizeOptionsIndexed(open.options)?.options ?? []).map((o) => o.label));
  let h = 0x811c9dc5; // FNV-1a, 32 bit
  for (let i = 0; i < labels.length; i++) { h ^= labels.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `${open.q}\u0000${h.toString(16)}`;
}

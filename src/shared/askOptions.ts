// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * The options of an Ask Me entry, read the one way the window shows them and
 * main checks an answer against them (renderer humanQuestion.ts uses this;
 * main's hive.answerQuestions validates `chosen` with it).
 *
 * The god writes options by hand: `[{ label, detail? }]` or bare strings.
 * Indexes count from 0. The stored `recommended` and `chosen` are RAW
 * positions in that list; the card works on the valid ones.
 */

export interface AskOption { label: string; detail?: string }

/** More than this is a form, not a choice; the rest are dropped (the note field remains). */
export const MAX_OPTIONS = 8;
/** At most this many raw entries are looked at, however long the list. */
export const MAX_RAW_OPTIONS = 64;
const MAX_LABEL = 200;
const MAX_DETAIL = 2000;

/**
 * The valid options plus, for each, its position in the RAW stored list. The stored
 * `recommended` and `chosen` are RAW positions (what the god wrote, and what stays in
 * tasks.json); the card works on the valid list. Without this map, an invalid option (an
 * empty label, say) ahead of a valid one would shift every index after it.
 */
export function normalizeOptionsIndexed(raw: unknown): { options: AskOption[]; rawIndex: number[] } | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: AskOption[] = [];
  const rawIndex: number[] = [];
  for (let r = 0; r < Math.min(raw.length, MAX_RAW_OPTIONS); r++) {
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

/** The option labels a card shows for these stored options, in order; [] for none. */
export function askLabels(rawOptions: unknown): string[] {
  return (normalizeOptionsIndexed(rawOptions)?.options ?? []).map((o) => o.label);
}

/** Is `chosen` a valid pick of RAW positions for these stored options: integers,
 *  no repeats, each one an option the card shows, and one at most unless the
 *  entry is `multi: true` (the card's own rule)? An empty list is valid. */
export function validRawChosen(rawOptions: unknown, chosen: unknown, multi?: unknown): chosen is number[] {
  if (!Array.isArray(chosen)) return false;
  if (chosen.length === 0) return true;
  if (multi !== true && chosen.length > 1) return false;
  const shown = normalizeOptionsIndexed(rawOptions)?.rawIndex ?? [];
  return chosen.every((i) => Number.isInteger(i) && shown.includes(i as number)) && new Set(chosen).size === chosen.length;
}

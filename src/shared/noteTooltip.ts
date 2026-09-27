/**
 * WHEN AN AGENT NOTE NEEDS A TOOLTIP (0.5.2, card v052-agent-note-tooltip).
 *
 * The founder: "if the note is longer than one line", hovering it shows the
 * whole note. The half that is easy to miss is the IF. A tooltip on every
 * note repeats text the person can already read, on every row, which is
 * worse than the bug. So the question is asked of the note and of the box
 * it was drawn in, and the answer is yes only when something is hidden:
 * the single line was cut (the box is narrower than its text), or the note
 * has more than one line with words on it, of which the row shows the first.
 *
 * Pure and import-free so a test can take it directly; the component that
 * measures the box (components/NoteTooltip.tsx) hands the numbers in.
 */

/** The line a row shows: the first line with anything on it. */
export function noteFirstLine(note: string | null | undefined): string {
  return (note ?? '').split('\n').find((l) => l.trim()) ?? '';
}

/** More than one line carries words. Blank lines do not count. */
export function noteIsMultiLine(note: string | null | undefined): boolean {
  return (note ?? '').split('\n').filter((l) => l.trim()).length > 1;
}

/** What a row that shows several lines draws: every line with words on it,
 *  in order. Blank lines are dropped so they do not spend the row's lines. */
export function noteShownLines(note: string | null | undefined): string {
  return (note ?? '').split('\n').map((l) => l.trimEnd()).filter((l) => l.trim()).join('\n');
}

/**
 * The same IF for a row that shows up to `lines` lines (0.5.3, feature 3: the
 * sidebar shows three). Something is hidden when the clamp cut the text, which
 * the box says by being shorter than its content. Unmeasured, a note with more
 * lines of words than the row has is known to be cut; anything else is not.
 */
export function noteNeedsTooltipClamped(
  note: string | null | undefined,
  lines: number,
  box: { scrollHeight: number; clientHeight: number } | null
): boolean {
  const shown = noteShownLines(note);
  if (!shown) return false;
  if (box) return box.scrollHeight > box.clientHeight + 1;
  return shown.split('\n').length > lines;
}

export function noteNeedsTooltip(
  note: string | null | undefined,
  box: { scrollWidth: number; clientWidth: number } | null
): boolean {
  if (!noteFirstLine(note)) return false;
  if (noteIsMultiLine(note)) return true;
  // A box that has not been measured (no layout yet) hides nothing we know of.
  return !!box && box.scrollWidth > box.clientWidth;
}

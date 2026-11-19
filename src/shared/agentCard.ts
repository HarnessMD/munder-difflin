/**
 * The last lines of real output from an agent's terminal. The bottom of a live
 * terminal is a repainting TUI frame (blank rows, box rules, the same status
 * line written again on every beat), so the last rows of the buffer are often
 * furniture, not output. Pure and dependency free.
 */

/** Lines read back by default. */
export const TAIL_LINES = 3;
/** How far back up the buffer the search for those lines is allowed to go. A
 *  TUI can hold thirty rows of frame above the last real sentence; past this
 *  the reading is too old to call "what it is doing now". */
export const TAIL_SCAN_ROWS = 80;
/** Longest line returned. A terminal row can be very wide. */
export const TAIL_LINE_MAX = 140;

/** A row worth reading has a letter or a digit in it. Box rules, spinners made
 *  of braille dots, a bare `>` prompt and blank padding do not. */
const HAS_CONTENT = /[\p{L}\p{N}]/u;

/**
 * The last `limit` lines of real output from a terminal buffer, oldest first.
 * `rows` is the raw buffer, oldest first. An empty buffer, a buffer of nothing
 * but frame, or a row that is not a string all give back an empty list. At
 * most TAIL_SCAN_ROWS rows are read, and each line is cut to `maxLen`.
 */
export function terminalTail(
  rows: readonly string[],
  limit: number = TAIL_LINES,
  maxLen: number = TAIL_LINE_MAX
): string[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const want = Math.floor(limit);
  if (!Number.isFinite(want) || want <= 0 || maxLen <= 1) return [];

  const out: string[] = [];
  const stop = Math.max(0, rows.length - TAIL_SCAN_ROWS);
  for (let i = rows.length - 1; i >= stop && out.length < want; i--) {
    const raw = rows[i];
    if (typeof raw !== 'string') continue;
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line || !HAS_CONTENT.test(line)) continue;
    // A TUI repaints its status line unchanged on every beat; say it once.
    if (line === out[out.length - 1]) continue;
    out.push(line.length > maxLen ? `${line.slice(0, maxLen - 1)}…` : line);
  }
  return out.reverse();
}

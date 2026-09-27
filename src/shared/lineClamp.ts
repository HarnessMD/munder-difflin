/**
 * SHOW THE FIRST FEW LINES OF A LONG MESSAGE, and say how much is left.
 *
 * An agent writing an answer will happily produce four hundred lines. In a row
 * that is one item in a list, that answer pushes every other row off the
 * screen, and the person loses the thing a list is for, which is seeing what
 * is there. So a row shows the opening and a count of what it is hiding.
 *
 * WHY THIS IS NOT `-webkit-line-clamp`. CSS clamps what it PAINTS, so the
 * whole four hundred lines still parse as Markdown, still build four hundred
 * DOM nodes, and still cost that on every re render of the list. It also
 * cannot tell you how much it hid, so the row cannot say "42 more lines". This
 * clamps the SOURCE, before the Markdown renderer ever sees it.
 *
 * WHAT IT PROTECTS AGAINST, in order of how often each actually happens:
 *   a long answer                  cut at `maxLines` source lines
 *   one enormous unbroken line     cut at `maxChars`, on a word boundary
 *   a cut that lands inside a code fence, which would leave the renderer with
 *     an unterminated fence and swallow the rest of the row as code
 *   a cut that lands inside a table, which renders as a stray pipe row
 *
 * Pure and import-free so `test/load-ts.cjs` can take it directly.
 */

export interface ClampResult {
  /** The text to render. Valid Markdown on its own: never an open fence. */
  text: string;
  /** True when anything was removed. The row draws its "more" affordance on
   *  this, never on comparing lengths, because a cut can remove trailing blank
   *  lines and change nothing a reader would notice. */
  clipped: boolean;
  /** Source lines not shown, for the count in the row. Zero when not clipped. */
  hiddenLines: number;
}

export interface ClampOptions {
  /** Source lines to keep. The founder asked for four or five in the inbox
   *  rows, so five is the default and the caller narrows it. */
  maxLines?: number;
  /** Characters to keep, as the second bound. A single 8000 character
   *  paragraph is one line and would otherwise pass the line test. */
  maxChars?: number;
}

export const CLAMP_MAX_LINES = 5;
export const CLAMP_MAX_CHARS = 400;

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/** Blank at the top of a body is noise from a template, and blank runs in the
 *  middle waste half the budget on nothing. Collapsed before counting so the
 *  five lines a row shows are five lines of content. */
function tidy(body: string): string[] {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (line === '' && (out.length === 0 || out[out.length - 1] === '')) continue;
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out;
}

/** Cut a single over long line at the last word boundary inside the budget.
 *  Falls back to a hard cut only when there is no boundary at all, which is a
 *  URL or a base64 blob, and a hard cut is the right answer for both. */
function cutToChars(line: string, budget: number): string {
  if (line.length <= budget) return line;
  const head = line.slice(0, budget);
  const space = head.lastIndexOf(' ');
  return (space > budget * 0.5 ? head.slice(0, space) : head).replace(/\s+$/, '');
}

export function clampLines(body: string, opts: ClampOptions = {}): ClampResult {
  const maxLines = Math.max(1, opts.maxLines ?? CLAMP_MAX_LINES);
  const maxChars = Math.max(1, opts.maxChars ?? CLAMP_MAX_CHARS);
  const lines = tidy(body ?? '');
  if (lines.length === 0) return { text: '', clipped: false, hiddenLines: 0 };

  const kept: string[] = [];
  let used = 0;
  let cutMidLine = false;
  // Where the line cut part way sits in `kept`, so the count can say its tail
  // is hidden even when every line was reached (T133: one long message drew
  // "Show 0 more lines", because only whole lines were counted).
  let cutAt = -1;

  for (const line of lines) {
    if (kept.length >= maxLines) break;
    const remaining = maxChars - used;
    if (remaining <= 0) break;
    if (line.length > remaining) {
      const piece = cutToChars(line, remaining);
      // A cut that leaves nothing readable is worse than stopping one line
      // short, so an empty piece ends the loop instead of adding a blank row.
      if (piece.trim() !== '') { kept.push(piece); cutMidLine = true; cutAt = kept.length - 1; }
      break;
    }
    kept.push(line);
    used += line.length + 1;
  }

  // A fence opened inside what we kept and never closed would run the rest of
  // the row as code, so drop back to before it opened. Dropping is right and
  // closing it is not: the fence content is truncated code, and showing a
  // half statement as if it were whole is the lie this avoids.
  let fenceOpen = false;
  let lastFenceStart = -1;
  for (let i = 0; i < kept.length; i++) {
    if (FENCE.test(kept[i])) {
      if (fenceOpen) { fenceOpen = false; } else { fenceOpen = true; lastFenceStart = i; }
    }
  }
  if (fenceOpen && lastFenceStart >= 0) kept.length = lastFenceStart;

  // A lone table row without its header renders as a line of pipes. If the
  // last kept line looks like a table row and the table continues past the
  // cut, drop the partial table entirely.
  while (kept.length > 0 && /^\s*\|.*\|\s*$/.test(kept[kept.length - 1]) && kept.length < lines.length) {
    if (kept.length > 1 && /^\s*\|.*\|\s*$/.test(kept[kept.length - 2])) { kept.pop(); continue; }
    kept.pop();
    break;
  }

  while (kept.length > 0 && kept[kept.length - 1] === '') kept.pop();

  const clipped = kept.length < lines.length || cutMidLine;
  return {
    text: kept.join('\n'),
    clipped,
    // Whole lines not reached, plus one for the tail of a line cut part way
    // when that piece survived the fence and table drops (a dropped piece is
    // already counted as a whole line). Clipped always hides at least one.
    hiddenLines: clipped ? Math.max(1, lines.length - kept.length + (cutAt >= 0 && cutAt < kept.length ? 1 : 0)) : 0
  };
}

/**
 * A one line preview, for places with a single row and no room at all: the
 * sidebar's unread list and a notification. Markdown syntax is stripped rather
 * than rendered, because one line of raw `**bold**` and `[text](url)` reads
 * worse than the words on their own.
 */
export function previewLine(body: string, maxChars = 120): string {
  const first = tidy(body ?? '').find((l) => l !== '' && !FENCE.test(l)) ?? '';
  const plain = first
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/^\s{0,3}[-*+]\s+/, '')
    .replace(/^\s{0,3}\d{1,3}[.)]\s+/, '')
    .replace(/^\s{0,3}>\s?/, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]*)`/g, '$1')
    .trim();
  return cutToChars(plain, maxChars);
}

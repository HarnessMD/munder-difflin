// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * HISTORY-VIEW-169: the History tab's renderer-side model. Pure: no React, no window.
 *
 * THE RETAINED HISTORY IS BOUNDED. The renderer holds at most HISTORY_RETAIN_MAX items,
 * as ONE contiguous byte window [start, end) of the transcript:
 *  - following new turns appends at the end and trims the OLDEST items;
 *  - paging older prepends and, past the cap, trims the NEWEST items. The window then no
 *    longer reaches the file's end (`live` false): following pauses until "Jump to latest"
 *    reloads the tail.
 * Trimming is at LINE granularity (one transcript line can yield several items), so a
 * window edge is always a line boundary and the next page from it neither repeats nor
 * skips an item.
 */
import {
  HISTORY_RETAIN_MAX,
  type HistoryItem,
  type HistoryPage,
  type HistoryProvider,
  type HistoryUnavailableReason
} from '@shared/history';

export interface HistoryWindow {
  fileId: string | null;
  provider: HistoryProvider | null;
  fileName: string;
  items: HistoryItem[];
  start: number;
  end: number;
  atStart: boolean;
  /** `end` is the file's live end, so a follow poll may append. */
  live: boolean;
  unavailable: HistoryUnavailableReason | null;
}

export const EMPTY_WINDOW: HistoryWindow = {
  fileId: null, provider: null, fileName: '', items: [], start: 0, end: 0, atStart: false, live: false, unavailable: null
};

/** Drop the oldest items down to `cap`, cutting at a line boundary. */
export function trimOldest(w: HistoryWindow, cap = HISTORY_RETAIN_MAX): HistoryWindow {
  const items = w.items;
  if (items.length <= cap) return w;
  let cut = items.length - cap;
  while (cut < items.length && items[cut].offset === items[cut - 1].offset) cut += 1;
  const kept = items.slice(cut);
  return { ...w, items: kept, start: kept.length ? kept[0].offset : w.end, atStart: false };
}

/** Drop the newest items down to `cap`, cutting at a line boundary. The window stops being live. */
export function trimNewest(w: HistoryWindow, cap = HISTORY_RETAIN_MAX): HistoryWindow {
  const items = w.items;
  if (items.length <= cap) return w;
  let keep = cap;
  while (keep > 0 && items[keep].offset === items[keep - 1].offset) keep -= 1;
  return { ...w, items: items.slice(0, keep), end: items[keep].offset, live: false };
}

/** A tail page replaces everything. */
export function applyTail(page: HistoryPage, cap = HISTORY_RETAIN_MAX): HistoryWindow {
  if (!page.ok) return { ...EMPTY_WINDOW, unavailable: page.reason };
  return trimOldest({
    fileId: page.fileId,
    provider: page.provider,
    fileName: page.fileName,
    items: page.items,
    start: page.start,
    end: page.end,
    atStart: page.atStart,
    live: true,
    unavailable: null
  }, cap);
}

/** An older page, prepended. 'reload' when it is not the page before this window. */
export function applyOlder(w: HistoryWindow, page: HistoryPage, cap = HISTORY_RETAIN_MAX): HistoryWindow | 'reload' {
  if (!page.ok || page.fileId !== w.fileId || page.end !== w.start) return 'reload';
  return trimNewest({ ...w, items: [...page.items, ...w.items], start: page.start, atStart: page.atStart }, cap);
}

/** A follow page, appended. 'reload' on a new file (new session, rotated thread) or a reset. */
export function applyNewer(w: HistoryWindow, page: HistoryPage, cap = HISTORY_RETAIN_MAX): HistoryWindow | 'reload' {
  if (!page.ok || page.reset || page.fileId !== w.fileId || page.start !== w.end) return 'reload';
  if (!page.items.length && page.end === w.end) return w;
  return trimOldest({ ...w, items: [...w.items, ...page.items], end: page.end }, cap);
}

export interface VisibleRange {
  first: number;
  /** Exclusive. */
  last: number;
  padTop: number;
  padBottom: number;
  total: number;
}

/**
 * Which rows to mount for a scroll position: only those in view plus `overscan` pixels
 * either side. `heights` are measured where known and estimated otherwise.
 */
export function visibleRange(heights: number[], scrollTop: number, viewport: number, overscan = 400): VisibleRange {
  const total = heights.reduce((a, b) => a + b, 0);
  const lo = Math.max(0, scrollTop - overscan);
  const hi = scrollTop + Math.max(0, viewport) + overscan;
  let y = 0;
  let first = heights.length;
  let padTop = 0;
  for (let i = 0; i < heights.length; i += 1) {
    if (y + heights[i] > lo) { first = i; padTop = y; break; }
    y += heights[i];
  }
  if (first === heights.length) padTop = total;
  let last = first;
  y = padTop;
  while (last < heights.length && y < hi) { y += heights[last]; last += 1; }
  return { first, last, padTop, padBottom: Math.max(0, total - y), total };
}

/** HH:MM:SS in local time, or '' when the record had no timestamp. */
export function clockOf(at: number | null): string {
  if (at === null || !Number.isFinite(at)) return '';
  const d = new Date(at);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** The words for a history that cannot be shown, by main's reason (Pam's P5). An agent not
 *  in the registry yet has no history yet, so it shares the empty line. */
export const UNAVAILABLE_KEY: Record<HistoryUnavailableReason, string> = {
  'no-agent': 'history.empty',
  'unsupported-provider': 'history.unsupported',
  'no-transcript': 'history.empty',
  unreadable: 'history.readFailed'
};

/** Main's system lines that mean the conversation was compacted (Claude Code, Codex). */
const COMPACTED_TEXT = new Set(['Conversation compacted', 'Context compacted']);

/** The key for a system line main sends as English, or null when the line is data (a slash
 *  command's name) to show as written. */
export function systemKey(text: string): string | null {
  if (COMPACTED_TEXT.has(text)) return 'history.compacted';
  if (text === 'Context checkpoint') return 'history.checkpoint';
  return null;
}

/** The engine's name for the footer, as the app names it elsewhere. */
export const ENGINE_NAME: Record<HistoryProvider, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  antigravity: 'Antigravity'
};

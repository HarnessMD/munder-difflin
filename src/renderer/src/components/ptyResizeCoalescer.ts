// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * Settle a burst of terminal grid changes into AT MOST ONE pty resize.
 *
 * LAG-150: a pty resize is not free on the other end. Codex (0.154) answers ANY change of
 * rows or cols by replaying its whole transcript — measured ~90 KB for ~120 lines of
 * history and ~280 KB for ~360, linear, never clearing scrollback — and every byte of it
 * goes back through main, IPC and xterm. The terminal's host changes height whenever the
 * composer under it changes height (a message queued to a busy agent shows the pending
 * list; delivering it hides the list again), and the ResizeObserver fitted and resized
 * the pty on every one of those, as well as on every tick of a window/splitter drag.
 *
 * `request(from, to)` is called after each local xterm fit that changed the grid. The pty
 * is told only once the grid has been quiet for `settleMs`, and only if the settled grid
 * differs from the grid the burst STARTED from — so a transient 19 -> 14 -> 19 rows costs
 * the agent nothing, and a 40-tick drag costs one replay instead of forty.
 *
 * Pure, with its timers injected, so the rule can be tested under node.
 */
export interface Grid { cols: number; rows: number }

export interface ResizeTimerHost {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}

/** Long enough to swallow a layout flip and a drag's tick train, short enough that a
 *  deliberate resize still feels immediate. */
export const PTY_RESIZE_SETTLE_MS = 150;

export interface PtyResizeCoalescer {
  /** A local fit moved the xterm grid from `from` to `to`. */
  request(from: Grid, to: Grid): void;
  /** Send now if a settled change is pending (used on dispose so nothing is lost). */
  flush(): void;
  /** Drop anything pending without sending. */
  cancel(): void;
  readonly pending: boolean;
}

export function createPtyResizeCoalescer(
  send: (grid: Grid) => void,
  host: ResizeTimerHost = { set: (fn, t) => setTimeout(fn, t), clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) },
  settleMs: number = PTY_RESIZE_SETTLE_MS
): PtyResizeCoalescer {
  let handle: unknown = null;
  let origin: Grid | null = null;   // the grid the pty had when this burst began
  let latest: Grid | null = null;

  const flush = (): void => {
    if (handle !== null) { host.clear(handle); handle = null; }
    const from = origin, to = latest;
    origin = null; latest = null;
    if (!from || !to) return;
    if (from.cols === to.cols && from.rows === to.rows) return; // settled back where it started
    send({ cols: to.cols, rows: to.rows });
  };

  return {
    request(from: Grid, to: Grid): void {
      if (origin === null) origin = { cols: from.cols, rows: from.rows };
      latest = { cols: to.cols, rows: to.rows };
      if (handle !== null) host.clear(handle);
      handle = host.set(flush, settleMs);
    },
    flush,
    cancel(): void {
      if (handle !== null) { host.clear(handle); handle = null; }
      origin = null; latest = null;
    },
    get pending(): boolean { return handle !== null; }
  };
}

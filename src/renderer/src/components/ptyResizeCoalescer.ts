/**
 * Settle a burst of terminal grid changes into AT MOST ONE pty resize.
 *
 * A pty resize is not free on the other end: Codex answers any change of rows
 * or columns by drawing its whole conversation again (the fork measured about
 * 90 KB for 120 lines of history, growing with it), and every byte comes back
 * through main, IPC and xterm. The terminal's host changes height whenever the
 * box under it does (a queued message shows the pending list, delivering it
 * hides it again), and a window or splitter drag fits on every tick.
 *
 * `request(from, to)` is called after each local fit that changed the grid.
 * The pty is told only once the grid has been quiet for `settleMs`, and only
 * if the settled grid differs from the grid the burst STARTED from: a passing
 * 19 -> 14 -> 19 rows costs the agent nothing, and a 40 tick drag costs one
 * redraw instead of forty.
 *
 * Pure, with its timers injected.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT): src/renderer/src/components/ptyResizeCoalescer.ts.
 */
export interface Grid { cols: number; rows: number }

export interface ResizeTimerHost {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}

/** Long enough to swallow a layout flip and a drag's ticks, short enough that a
 *  deliberate resize still feels immediate. */
export const PTY_RESIZE_SETTLE_MS = 150;

export interface PtyResizeCoalescer {
  /** A local fit moved the xterm grid from `from` to `to`. */
  request(from: Grid, to: Grid): void;
  /** Send now if a change is pending (on detach, so nothing is lost). */
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
  let origin: Grid | null = null; // the grid the pty had when this burst began
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

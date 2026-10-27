/**
 * When a window's view (its renderer process) dies, main reloads it and leaves a
 * one shot notice for the reloaded page to show: the agents and their terminals
 * live in main and keep running. The window shows its own words for `reason`;
 * main sends only the reason's id.
 *
 * Deliberately minimal: a reload, never a recreated window, and no memory or
 * crash dump tracking.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT).
 */

export interface RecoveryNotice {
  /** When main brought the view back (ms since the epoch). */
  at: number;
  /** Electron's render-process-gone reason ('crashed', 'oom', 'killed', ...), or
   *  'render-error' when the window asked for the reload after an error. */
  reason: string;
  /** How many reloads in a row, this one included. */
  streak: number;
}

/** A view that dies this many times within RELOAD_SPELL_MS stays down, so a
 *  view that dies on load is not reloaded in a loop. */
export const MAX_RELOADS = 3;
export const RELOAD_SPELL_MS = 60_000;

/** Whether to reload a view that just died, given the reloads before it. */
export class ReloadPolicy {
  private recent: number[] = [];

  next(now: number): { reload: boolean; streak: number } {
    this.recent = this.recent.filter((t) => now - t < RELOAD_SPELL_MS);
    if (this.recent.length >= MAX_RELOADS) return { reload: false, streak: this.recent.length };
    this.recent.push(now);
    return { reload: true, streak: this.recent.length };
  }
}

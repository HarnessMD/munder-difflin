import type { ContextRule } from '../shared/triggers';

/**
 * WHEN a context rule fires: the clock of the context trigger.
 *
 * It owns only the CADENCE; who gets the command is decided in src/shared/contextTriggerDecide.ts.
 *
 * Two phase, like a scheduled mission: a timeout for what is left of the
 * cadence since the last run, then a steady interval, so a partly elapsed
 * cadence survives a re-arm (a start, a settings edit, a wake from sleep).
 */
export type ContextAction = 'compact' | 'clear';

export interface ContextTriggerTimerDeps {
  /** The live rule for one half. Read again at every fire: the person may
   *  have edited the message or the bars since the timer was armed. */
  rule(action: ContextAction): ContextRule;
  /** The last run times as stored, or nothing. May throw: read as none. */
  readLastRun(): Record<string, number> | null | undefined;
  /** Store them. May throw: the times are best effort. */
  writeLastRun(map: Record<string, number>): void;
  fire(action: ContextAction, rule: ContextRule): void;
  onError?(action: ContextAction, e: unknown): void;
  now?(): number;
}

export interface ContextTriggerTimer {
  /** Clear, then arm both halves from the rules as they are now. Calling it
   *  twice never stacks timers. */
  sync(): void;
  clear(): void;
  /** Record a run that happened elsewhere (a retired mission's last run), so
   *  the cadence carries on from it. */
  setLastRun(action: ContextAction, at: number): void;
}

export function createContextTriggerTimer(deps: ContextTriggerTimerDeps): ContextTriggerTimer {
  const now = deps.now ?? Date.now;
  const timers = new Map<ContextAction, { timeout?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval> }>();
  // A rule has no last run time of its own, so the times are stored beside
  // it. Without them every re-arm would restart a 2 h cadence from zero, and
  // a person who edits the rule twice a day would never see it fire.
  let lastRun: Record<string, number> | null = null;
  const runMap = (): Record<string, number> => {
    if (!lastRun) {
      try { lastRun = deps.readLastRun() ?? {}; } catch { lastRun = {}; }
    }
    return lastRun;
  };
  const stamp = (action: ContextAction): number => {
    const map = runMap();
    const at = now();
    map[action] = at;
    try { deps.writeLastRun(map); } catch { /* best effort */ }
    return at;
  };
  // A half with NO recorded run is stamped now, not read as the epoch: the
  // time left would clamp to 0 and every terminal would be compacted the
  // moment the app starts. A first start waits a full cadence.
  const lastRunAt = (action: ContextAction): number => {
    const v = runMap()[action];
    return typeof v === 'number' && Number.isFinite(v) ? v : stamp(action);
  };
  const clear = (): void => {
    for (const t of timers.values()) {
      if (t.timeout) clearTimeout(t.timeout);
      if (t.interval) clearInterval(t.interval);
    }
    timers.clear();
  };
  const sync = (): void => {
    clear();
    for (const action of ['compact', 'clear'] as const) {
      const rule = deps.rule(action);
      if (!rule.enabled || !(rule.everyMs > 0)) continue;
      const fire = (): void => {
        try {
          stamp(action);
          deps.fire(action, deps.rule(action));
        } catch (e) {
          deps.onError?.(action, e);
        }
      };
      const remaining = Math.max(0, rule.everyMs - (now() - lastRunAt(action)));
      const entry: { timeout?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval> } = {};
      entry.timeout = setTimeout(() => {
        fire();
        entry.interval = setInterval(fire, rule.everyMs);
      }, remaining);
      timers.set(action, entry);
    }
  };
  const setLastRun = (action: ContextAction, at: number): void => {
    const map = runMap();
    map[action] = at;
    try { deps.writeLastRun(map); } catch { /* best effort */ }
  };
  return { sync, clear, setLastRun };
}

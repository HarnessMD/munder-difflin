/**
 * AUTOMATIONS ARM ON SAVE (founder, 11 Sep 2026: "We should be able to start
 * schedules and webhooks as soon as it saves").
 *
 * A schedule used to be armed at three moments only: boot, a save from the
 * Schedules or Automations screen, and waking from sleep. Every other door that
 * saved one left it switched on with no timer behind it. The voice actions
 * (create, enable, disable) write the list and stop there, and a mission added
 * straight to config.json waits for the next restart. That is how blog-seo-4h
 * sat enabled from 22:58 IST on 10 Sep to 11:14 IST on 11 Sep and never fired.
 *
 * So arming no longer depends on which door saved. The scheduler remembers the
 * missions it armed, and the watch below compares what is saved against that
 * and re-arms when they differ:
 *   1. on every write the app makes (onConfigWritten), so a save by any route
 *      is armed before that save returns;
 *   2. on a short poll for edits made to the file outside the app, which only
 *      stats the file and reads it when its modification time or size changed;
 *   3. whenever a screen or the voice asks for the list, so nothing can show a
 *      schedule as on while no timer runs for it.
 * Webhooks get the same comparison against the running server.
 *
 * `lastFiredAt` is left out of the comparison on purpose: the scheduler writes
 * it on every fire, and re-arming on that would reset every schedule each time
 * one of them ran. Everything else is in it, because a timer holds the mission
 * it was armed with, so a changed message or target would otherwise keep
 * sending the old one.
 *
 * Main only. No Electron import, so test/automations-arm-on-save.test.cjs runs
 * the real scheduler against a real config file with a fake clock.
 */
import { normalizeWeekly, weeklyDelayMs } from '../shared/weeklySchedule';
import type { WebhookTrigger } from '../shared/triggers';
import type { ScheduledMission } from './config';

/** The timer calls the scheduler makes, injectable so a test can run the clock. */
export interface SchedulerClock {
  now(): number;
  setTimeout(fn: () => void, ms: number): NodeJS.Timeout;
  setInterval(fn: () => void, ms: number): NodeJS.Timeout;
  clearTimeout(handle: NodeJS.Timeout): void;
  clearInterval(handle: NodeJS.Timeout): void;
}

const REAL_CLOCK: SchedulerClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle),
  clearInterval: (handle) => clearInterval(handle)
};

/** Same value, same string, whatever order the keys were written in: the
 *  renderer and a hand edit do not agree on key order, and a reorder is not a
 *  change. Undefined keys drop out the way JSON drops them on disk. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) out[k] = canonical(v);
    }
    return out;
  }
  return value;
}

/** What the scheduler armed from, minus the stamp it writes itself. */
export function missionsArmingKey(missions: readonly ScheduledMission[] | undefined): string {
  return JSON.stringify((missions ?? []).map((m) => {
    const { lastFiredAt, ...rest } = m;
    void lastFiredAt;
    return canonical(rest);
  }));
}

/** What the webhook server was pointed at. */
export function webhooksArmingKey(hooks: readonly WebhookTrigger[] | undefined): string {
  return JSON.stringify((hooks ?? []).map(canonical));
}

/** The missions:save merge. `lastFiredAt` is scheduler owned. The renderer loads
 *  missions once and later sends back a STALE array, so a wholesale write would
 *  clobber every lastFiredAt the scheduler has stamped since. Merge by id and
 *  keep the newer lastFiredAt (almost always the persisted one) so the UI can
 *  never erase it. */
export function mergeSavedMissions(incoming: unknown, persisted: readonly ScheduledMission[]): ScheduledMission[] {
  const list = (Array.isArray(incoming) ? incoming : []) as ScheduledMission[];
  const persistedById = new Map(persisted.map((m) => [m.id, m] as const));
  return list.map((m) => {
    const prevLastFired = persistedById.get(m.id)?.lastFiredAt ?? 0;
    const lastFiredAt = Math.max(m.lastFiredAt ?? 0, prevLastFired) || undefined;
    return { ...m, lastFiredAt };
  });
}

/** A mission's live scheduler handles: the initial `setTimeout` that waits out
 *  the time remaining until its next due fire, and the steady `setInterval`
 *  armed once it has fired. Both are tracked so shutdown can clear whichever is
 *  pending. */
export interface MissionTimer {
  timeout?: NodeJS.Timeout;
  interval?: NodeJS.Timeout;
}

export interface MissionSchedulerDeps {
  /** The saved missions, read fresh on every call. */
  readMissions(): ScheduledMission[];
  /** One due mission: dispatch it and stamp lastFiredAt. Owns its own errors. */
  fire(m: ScheduledMission): void;
  /** The heartbeat keeps its own adaptive cadence and registers into `timers`. */
  armHeartbeat(m: ScheduledMission): void;
  clock?: SchedulerClock;
}

export interface MissionScheduler {
  /** Active timers keyed by mission id. */
  readonly timers: Map<string, MissionTimer>;
  /** Clear everything, then arm every enabled mission from what is saved. */
  sync(): void;
  /** Clear and forget every timer. What is armed is then nothing. */
  clear(): void;
  /** sync() only when the saved missions differ from the armed ones. True when it re-armed. */
  syncIfChanged(): boolean;
}

export function createMissionScheduler(deps: MissionSchedulerDeps): MissionScheduler {
  const clock = deps.clock ?? REAL_CLOCK;
  const timers = new Map<string, MissionTimer>();
  /** The key of what is armed right now; null when nothing is. */
  let armedKey: string | null = null;

  const clear = (): void => {
    for (const t of timers.values()) {
      if (t.timeout) clock.clearTimeout(t.timeout);
      if (t.interval) clock.clearInterval(t.interval);
    }
    timers.clear();
    armedKey = null;
  };

  const sync = (): void => {
    clear();
    const missions = deps.readMissions();
    armedKey = missionsArmingKey(missions);
    for (const m of missions) {
      if (!m.enabled) continue;
      // A weekly mission (day-of-week + time) is armed below and does NOT need an
      // interval, so the interval guard has to come after that branch — it used to
      // be folded into the line above and would have rejected every one of them.
      const weekly = m.kind === 'heartbeat' ? null : normalizeWeekly(m.weekly);
      if (!weekly && !(m.intervalMs > 0)) continue;
      // Heartbeat (Lane A #1) opts out of the fixed setInterval and self-reschedules
      // with an adaptive cadence. Registered into the same timers map so clear()
      // tears it down identically on quit/reset.
      if (m.kind === 'heartbeat') { deps.armHeartbeat(m); continue; }
      const fire = (): void => deps.fire(m);
      const entry: MissionTimer = {};
      if (weekly) {
        // Weekly self-reschedules: there is no steady interval to settle into,
        // because the gap between two slots varies (Fri to Mon is not Mon to Wed,
        // and the week the clocks change is not 168 hours long).
        //
        // `justFired` is a spin guard, not a nicety. weeklyDelayMs returns 0 for a
        // slot that was missed and not yet run, and it learns "already run" from
        // the persisted lastFiredAt — so if fire()'s writeConfig ever failed, the
        // next computation would return 0 again, forever. Passing `now` as the
        // last-fired floor after a fire makes the catch-up branch unreachable, so
        // the worst case is a lost stamp rather than a hot loop.
        const rearm = (justFired: boolean): void => {
          const now = clock.now();
          const persisted = deps.readMissions().find((x) => x.id === m.id)?.lastFiredAt ?? 0;
          const delay = weeklyDelayMs(weekly, now, justFired ? Math.max(persisted, now) : persisted);
          if (delay === null) return;
          entry.timeout = clock.setTimeout(() => { fire(); rearm(true); }, delay);
        };
        rearm(false);
        timers.set(m.id, entry);
        continue;
      }
      // Honor lastFiredAt so a partially-elapsed interval is not restarted from
      // zero on reboot or when an unrelated mission is edited: wait only the time
      // remaining until the next due fire, then settle into a steady interval.
      const remaining = Math.max(0, m.intervalMs - (clock.now() - (m.lastFiredAt ?? 0)));
      entry.timeout = clock.setTimeout(() => {
        fire();
        entry.interval = clock.setInterval(fire, m.intervalMs);
      }, remaining);
      timers.set(m.id, entry);
    }
  };

  const syncIfChanged = (): boolean => {
    if (missionsArmingKey(deps.readMissions()) === armedKey) return false;
    sync();
    return true;
  };

  return { timers, sync, clear, syncIfChanged };
}

/** How often the file's stamp is checked for edits made outside the app. A
 *  stat, not a read: the file is read only when the stamp changed. */
export const ARMING_POLL_MS = 2_000;

export interface ArmingWatchDeps {
  readConfig(): { missions?: ScheduledMission[]; webhookTriggers?: WebhookTrigger[] };
  /** A cheap stamp of the saved file (modification time and size), or
   *  null when there is no file. Checked instead of reading the file, so an
   *  idle app reads nothing (card app-resource-optimization-052). */
  configStamp(): string | null;
  missions: Pick<MissionScheduler, 'syncIfChanged'>;
  /** Bring the webhook server in line with the saved endpoints. Idempotent. */
  reconcileWebhooks(): void;
  /** Missions were re-armed, so an open screen should reload its list. */
  onMissionsRearmed?(): void;
  /** Subscribe to the app's own config writes; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
  pollMs?: number;
  clock?: Pick<SchedulerClock, 'setInterval' | 'clearInterval'>;
}

export interface ArmingWatch {
  /** Re-arm what differs from what is saved, reading the file only if its
   *  stamp changed since the last look. */
  check(): void;
  /** Stop for good: no more polls, no more reaction to writes. For teardown. */
  stop(): void;
}

/** Start keeping the scheduler and the webhook server in line with what is
 *  saved. The webhook server at start is taken as already reconciled (boot
 *  starts it for the enabled endpoints), so only a later change touches it. */
export function startArmingWatch(deps: ArmingWatchDeps): ArmingWatch {
  const clock = deps.clock ?? REAL_CLOCK;
  let stopped = false;
  let webhooksKey = webhooksArmingKey(deps.readConfig().webhookTriggers);
  /** The file's stamp at the last read; undefined before the first look. */
  let seenStamp: string | null | undefined;

  const stampNow = (): string | null => {
    try { return deps.configStamp(); } catch { return null; }
  };

  /** Read what is saved and re-arm what differs from what is armed. */
  const compare = (): void => {
    try {
      if (deps.missions.syncIfChanged()) deps.onMissionsRearmed?.();
      const key = webhooksArmingKey(deps.readConfig().webhookTriggers);
      if (key !== webhooksKey) {
        webhooksKey = key;
        deps.reconcileWebhooks();
      }
    } catch (e) {
      console.error('[arming] check failed:', e);
    }
  };

  /** The poll and the list reads: a stat, and a read only when the file changed.
   *  The stamp is taken before the read, so a write landing in between is read
   *  on the next look rather than missed. */
  const check = (): void => {
    if (stopped) return;
    const stamp = stampNow();
    if (stamp === seenStamp) return;
    seenStamp = stamp;
    compare();
  };

  /** An app write changed the file by definition: look now, and remember the
   *  new stamp so the next poll does not read it again. */
  const afterWrite = (): void => {
    if (stopped) return;
    seenStamp = stampNow();
    compare();
  };

  const unsubscribe = deps.subscribe(afterWrite);
  const poll = clock.setInterval(check, deps.pollMs ?? ARMING_POLL_MS);
  (poll as { unref?: () => void }).unref?.();
  check();

  return {
    check,
    stop: () => {
      if (stopped) return;
      stopped = true;
      unsubscribe();
      clock.clearInterval(poll);
    }
  };
}

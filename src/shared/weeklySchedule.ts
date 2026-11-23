/**
 * WEEKLY SCHEDULES — "every Monday and Thursday at 09:00" instead of
 * "every 86400000 ms".
 *
 * A `ScheduledMission` has always fired on a fixed interval, which cannot say
 * "weekday mornings": an interval drifts relative to the clock, and a 24h one
 * started at 15:00 fires at 15:00 forever. This module adds the other shape.
 * When a mission carries a valid `weekly`, that REPLACES its interval; the
 * interval is left on the record untouched so switching back restores it.
 *
 * Pure and import-free on purpose, so the test loader can take it directly and
 * the scheduler's arithmetic is testable without a clock or a config file.
 *
 * ── Everything here is LOCAL time, deliberately ────────────────────────────
 * "09:00 on Monday" means 09:00 where the user is sitting, which is the only
 * reading a person expects. That is why the next occurrence is built with the
 * Date(y, m, d, h, min) constructor rather than by adding milliseconds: adding
 * 7 * 86400000 across a daylight-saving boundary lands an hour off, while
 * re-constructing from calendar fields lands on the same wall clock. On a
 * spring-forward day a time that does not exist (02:30 in most of the US) rolls
 * forward the way the platform rolls it, which is the standard behaviour and
 * the one every other scheduler produces too.
 *
 * ── A schedule keeps the time zone it was saved in ─────────────────────────
 * A saved schedule carries `zone` and its slots are worked out in that zone,
 * whatever the machine's own clock says. One with no zone, saved before this,
 * uses the machine's own time as it always did.
 */

export interface WeeklySchedule {
  /** 0 = Sunday … 6 = Saturday. Empty means "not a weekly schedule". */
  days: number[];
  /** Minutes since local midnight, 0..1439. */
  minute: number;
  /** The IANA time zone it was saved in. Absent: the machine's own time. */
  zone?: string;
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Initials for the 7-button picker. Two Ts and two Ss — the position carries
 *  the meaning, and every calendar in the world does the same. */
export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * How long after a MISSED slot the mission still fires.
 *
 * A laptop asleep at 09:00 and opened at 10:30 should still get its 09:00 run;
 * one closed on Friday and opened on Monday should not get Friday's. Six hours
 * splits those two cases about where a person would. This matches what the
 * interval scheduler already does (it clamps a negative remaining time to zero
 * and fires on boot), so the two kinds of schedule behave the same way after a
 * sleep rather than one of them silently skipping.
 */
export const WEEKLY_CATCHUP_MS = 6 * 60 * 60 * 1000;

/**
 * A timer can wake a few milliseconds before its slot (it fired at
 * 13:59:59.948, then again at 14:00:00.003). A fire this close before a slot
 * was that slot's, and the slot does not run again.
 */
export const WEEKLY_EARLY_WAKE_MS = 5_000;

const zoneFormats = new Map<string, Intl.DateTimeFormat>();
/** The formatter that reads a clock in this zone, or null for a zone this machine does not know. */
function zoneFormat(zone: string): Intl.DateTimeFormat | null {
  const known = zoneFormats.get(zone);
  if (known) return known;
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    zoneFormats.set(zone, f);
    return f;
  } catch {
    return null;
  }
}

/** What the clock on the wall reads in this zone at this instant, as a UTC time value. */
function wallClockMs(zone: string, ms: number): number {
  const parts: Record<string, number> = {};
  for (const p of zoneFormat(zone)!.formatToParts(ms)) if (p.type !== 'literal') parts[p.type] = Number(p.value);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/** The time zone of the person at this machine, or undefined where it cannot say. */
export function hereZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/** A schedule as a person saves it: it keeps the zone it has, and a new one takes theirs. */
export function withSavedZone<T extends { zone?: string }>(w: T): T {
  if (w.zone) return w;
  const zone = hereZone();
  return zone ? { ...w, zone } : w;
}

/** Validate and canonicalise. Returns null for anything that is not a usable
 *  weekly schedule — no days, a bad day number, a minute outside the day — so
 *  every caller has exactly one check to make. Days come back sorted and
 *  de-duplicated, so two schedules that mean the same thing compare equal. */
export function normalizeWeekly(w: unknown): WeeklySchedule | null {
  if (!w || typeof w !== 'object') return null;
  const raw = w as { days?: unknown; minute?: unknown };
  if (!Array.isArray(raw.days)) return null;
  const days = [...new Set(
    raw.days.filter((d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6)
  )].sort((a, b) => a - b);
  if (days.length === 0) return null;
  const minute = raw.minute;
  if (typeof minute !== 'number' || !Number.isInteger(minute) || minute < 0 || minute > 1439) return null;
  const zone = (raw as { zone?: unknown }).zone;
  return typeof zone === 'string' && zone && zoneFormat(zone) ? { days, minute, zone } : { days, minute };
}

/** "09:00". Zero-padded 24h, because a schedule an operator is reading back
 *  should not need an am/pm second look. */
export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Human summary for a row: "weekdays at 09:00 (Asia/Kolkata)", "Mon, Thu at 14:30". `machineZone` names the
 *  clock of a schedule with no zone of its own, where that is not the reader's (an office's is UTC). */
export function formatWeekly(w: unknown, machineZone?: string): string {
  const n = normalizeWeekly(w);
  if (!n) return 'no days picked';
  const zone = n.zone ?? machineZone;
  const at = `${formatMinute(n.minute)}${zone ? ` (${zone})` : ''}`;
  const key = n.days.join(',');
  if (key === '0,1,2,3,4,5,6') return `every day at ${at}`;
  if (key === '1,2,3,4,5') return `weekdays at ${at}`;
  if (key === '0,6') return `weekends at ${at}`;
  return `${n.days.map((d) => WEEKDAY_LABELS[d]).join(', ')} at ${at}`;
}

/** Build the local instant for `minute` on the day `offset` days from `from`.
 *  Calendar-field construction, not millisecond arithmetic — see the DST note. */
function slotAt(from: Date, offset: number, minute: number): Date {
  return new Date(
    from.getFullYear(), from.getMonth(), from.getDate() + offset,
    Math.floor(minute / 60), minute % 60, 0, 0
  );
}

/** The slot `offset` days from `fromMs` and the day of the week it falls on, on the schedule's own clock. */
function slotOf(n: WeeklySchedule, fromMs: number, offset: number): { day: number; ms: number } {
  if (!n.zone) {
    const slot = slotAt(new Date(fromMs), offset, n.minute);
    return { day: slot.getDay(), ms: slot.getTime() };
  }
  const today = new Date(wallClockMs(n.zone, fromMs));
  const wall = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset, Math.floor(n.minute / 60), n.minute % 60);
  // The zone's offset at the slot, read at the slot: it can differ from today's across a clock change.
  const guess = wall - (wallClockMs(n.zone, wall) - wall);
  return { day: new Date(wall).getUTCDay(), ms: wall - (wallClockMs(n.zone, guess) - guess) };
}

/** The first matching slot STRICTLY after `nowMs`, or null if there are no days.
 *  Eight candidates is always enough: the worst case is one day a week whose
 *  slot has already passed today, which lands on offset 7. */
export function nextWeeklyFireMs(w: unknown, nowMs: number): number | null {
  const n = normalizeWeekly(w);
  if (!n) return null;
  for (let offset = 0; offset <= 7; offset++) {
    const slot = slotOf(n, nowMs, offset);
    if (n.days.includes(slot.day) && slot.ms > nowMs) return slot.ms;
  }
  return null;
}

/** The most recent matching slot at or before `nowMs`, or null. Used only to
 *  decide whether a slot was MISSED while the app was not running. */
export function previousWeeklyFireMs(w: unknown, nowMs: number): number | null {
  const n = normalizeWeekly(w);
  if (!n) return null;
  for (let offset = 0; offset >= -7; offset--) {
    const slot = slotOf(n, nowMs, offset);
    if (n.days.includes(slot.day) && slot.ms <= nowMs) return slot.ms;
  }
  return null;
}

/**
 * How long the scheduler should wait before firing this mission, or null when
 * the schedule is not usable.
 *
 * Zero means "fire now": a slot passed while we were not watching, it is recent
 * enough to still be worth running, and we have not already run it. That last
 * clause is what `lastFiredAt` is for — without it, re-arming the scheduler
 * (which happens on every save of ANY mission) would re-fire a mission that
 * already ran minutes ago.
 */
export function weeklyDelayMs(w: unknown, nowMs: number, lastFiredAt = 0): number | null {
  const n = normalizeWeekly(w);
  if (!n) return null;
  const prev = previousWeeklyFireMs(n, nowMs);
  if (prev !== null && prev - lastFiredAt > WEEKLY_EARLY_WAKE_MS && nowMs - prev <= WEEKLY_CATCHUP_MS) return 0;
  const next = nextWeeklyFireMs(n, nowMs);
  if (next === null) return null;
  // It fired just before this slot: that was the slot's run, so wait for the one after.
  const wait = lastFiredAt <= next && next - lastFiredAt <= WEEKLY_EARLY_WAKE_MS ? nextWeeklyFireMs(n, next) : next;
  return wait === null ? null : Math.max(0, wait - nowMs);
}

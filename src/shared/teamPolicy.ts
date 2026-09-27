/**
 * WHAT MAY CROSS BETWEEN TWO PEOPLE, on three axes instead of one word.
 *
 * Until 0.4.10 this was `NetworkLevel`, three words on one axis: `strict`,
 * `communication-only`, `allow-all`. One axis cannot say the thing people
 * actually want, which is "read me but do not write to me", or "you may talk
 * to me but you may not put work on my machine". Worse, the three words were
 * ambiguous in the one direction that matters: `allow-all` read as "they may
 * do anything", and nobody could tell from the row whether their own agents
 * were allowed to write back.
 *
 * So: three independent booleans, and a preset for each of the four
 * combinations a person actually asks for.
 *
 *   receive   their messages reach me
 *   send      my agents may write to them
 *   commands  a message from them may become work on my machine
 *
 * DIRECTION, because this is the part that was wrong before. A policy is
 * always MINE, and it always describes what I permit. `receive` and
 * `commands` are inbound: I am the one who decides. `send` is outbound: I am
 * still the one who decides, because it is my agents doing the writing. What
 * the OTHER person permits is their policy, reported by the relay, and I can
 * only read it. A message crosses when BOTH sides allow it, which is why
 * `canSendTo` and `canReceiveFrom` below each take two policies.
 *
 * Pure and import-free so `test/load-ts.cjs` can take it directly.
 */

/** The three axes, in display order. */
export type TeamAxis = 'receive' | 'send' | 'commands';
export const TEAM_AXES: readonly TeamAxis[] = ['receive', 'send', 'commands'];

export interface TeamPolicy {
  /** Their messages reach me. */
  receive: boolean;
  /** My agents may write to them. */
  send: boolean;
  /** A message from them may become work here. Implies `receive`. */
  commands: boolean;
}

/**
 * The four the founder named, in the words he named them.
 *
 *   off       no take, no send
 *   listen    receive only
 *   converse  receive and send
 *   open      receive, send, and may take commands
 */
export type PolicyPreset = 'off' | 'listen' | 'converse' | 'open';
export const POLICY_PRESETS: readonly PolicyPreset[] = ['off', 'listen', 'converse', 'open'];

const PRESET_POLICY: Record<PolicyPreset, TeamPolicy> = {
  off: { receive: false, send: false, commands: false },
  listen: { receive: true, send: false, commands: false },
  converse: { receive: true, send: true, commands: false },
  open: { receive: true, send: true, commands: true }
};

export function policyOf(preset: PolicyPreset): TeamPolicy {
  return { ...PRESET_POLICY[preset] };
}

/**
 * Normalise any shape into a policy, so a record written by an older build, or
 * a relay that still speaks `NetworkLevel`, cannot produce `undefined` in a
 * boolean position and read as "allowed" somewhere downstream.
 *
 * The one invariant: `commands` implies `receive`, because a command arrives
 * as a message. A stored record that says otherwise is repaired here rather
 * than at every call site.
 */
export function normalizePolicy(value: unknown): TeamPolicy {
  if (typeof value === 'string') return policyOf(presetFromLegacy(value));
  if (!value || typeof value !== 'object') return policyOf('off');
  const raw = value as Partial<Record<TeamAxis, unknown>>;
  const commands = raw.commands === true;
  return {
    receive: raw.receive === true || commands,
    send: raw.send === true,
    commands
  };
}

/**
 * The old three words, mapped once, here.
 *
 *   strict              nothing crosses                     off
 *   communication-only  messages both ways, no work         converse
 *   allow-all           messages both ways, and work        open
 *
 * There is no old value that meant "receive only", which is why nobody could
 * express it. `listen` is new and reachable only from the new control.
 *
 * ONE DELIBERATE BEHAVIOUR CHANGE, and it is a tightening. `youAllow` only ever
 * governed INBOUND, so a person on `strict` could still have their own agents
 * write to that teammate. `off` closes both directions. The shipped label for
 * `strict` was "Blocked", and a person who marked someone Blocked did not
 * expect their own agents to keep writing to them; the old behaviour was the
 * label failing to match the code, not an intention. Migrating to `off` makes
 * the two agree. A person who wanted one direction only now has `listen`, which
 * is the setting they could never express before.
 */
export function presetFromLegacy(level: string): PolicyPreset {
  if (level === 'allow-all') return 'open';
  if (level === 'communication-only') return 'converse';
  return 'off';
}

/** The preset a policy is exactly equal to, or null when it is a combination
 *  the four presets do not cover (receive off with send on, say). The control
 *  shows a preset as chosen only on an exact match, so a custom combination is
 *  never mislabelled as one of the four. */
export function presetOf(policy: TeamPolicy): PolicyPreset | null {
  for (const preset of POLICY_PRESETS) {
    const p = PRESET_POLICY[preset];
    if (p.receive === policy.receive && p.send === policy.send && p.commands === policy.commands) return preset;
  }
  return null;
}

/** Every axis off. Used to short circuit a whole screen: when this is true
 *  there is nothing to draw about a conversation, only the offer to turn it
 *  back on. */
export function isSilent(policy: TeamPolicy): boolean {
  return !policy.receive && !policy.send && !policy.commands;
}

/**
 * My status and my per person policy are ANDed, never ORed.
 *
 * The status is the whole machine's answer and the per person policy is the
 * exception. Taking the intersection means switching the machine to `off`
 * silences everybody without walking the roster, which is the point of having
 * a status at all: a person going into a meeting sets one control, not twelve.
 */
export function effectivePolicy(status: TeamPolicy, perPerson: TeamPolicy | null | undefined): TeamPolicy {
  if (!perPerson) return { ...status };
  return {
    receive: status.receive && perPerson.receive,
    send: status.send && perPerson.send,
    commands: status.commands && perPerson.commands && status.receive && perPerson.receive
  };
}

/** My agents may write to them: I permit sending, and they permit receiving. */
export function canSendTo(mine: TeamPolicy, theirs: TeamPolicy): boolean {
  return mine.send && theirs.receive;
}

/** Their agents may write to me: they permit sending, and I permit receiving. */
export function canReceiveFrom(mine: TeamPolicy, theirs: TeamPolicy): boolean {
  return theirs.send && mine.receive;
}

/** A message from them may become work here. Needs the inbound door open on
 *  my side first, which `effectivePolicy` already guarantees; asserted again
 *  because this is the axis with teeth. */
export function canTakeCommandsFrom(mine: TeamPolicy, theirs: TeamPolicy): boolean {
  return canReceiveFrom(mine, theirs) && mine.commands;
}

/**
 * WHY a send is refused, so the caller never has to guess and the agent gets
 * an instruction rather than a rejection.
 *
 * `null` means it is allowed. Otherwise the reason names the side that is
 * closed, because "you are set to receive only" and "they are not accepting
 * messages" need two different things done about them by two different people.
 */
export type SendBlock = 'you-not-sending' | 'they-not-receiving';

export function sendBlock(mine: TeamPolicy, theirs: TeamPolicy): SendBlock | null {
  if (!mine.send) return 'you-not-sending';
  if (!theirs.receive) return 'they-not-receiving';
  return null;
}

/**
 * A STATUS SCHEDULE: what preset to be on, by day and time of day.
 *
 * Windows are local time and half open, `from` inclusive and `to` exclusive,
 * measured in minutes since local midnight the way `WeeklySchedule` measures
 * its firing minute. A window that ends before it starts wraps past midnight,
 * which is the only way to say "asleep from 22:00 to 07:00" in one row.
 *
 * The first matching rule wins, so a narrow exception is written above the
 * broad one, and `fallback` is what applies when nothing matches. Order is the
 * user's, never sorted behind their back.
 */
export interface StatusWindow {
  /** 0 = Sunday … 6 = Saturday. Empty is never a match. */
  days: number[];
  /** Minutes since local midnight, 0..1439. */
  from: number;
  /** Minutes since local midnight, 0..1440. Equal to `from` means the whole day. */
  to: number;
  preset: PolicyPreset;
}

export interface StatusSchedule {
  enabled: boolean;
  windows: StatusWindow[];
  /** Where the status sits when no window matches. */
  fallback: PolicyPreset;
}

export const EMPTY_SCHEDULE: StatusSchedule = { enabled: false, windows: [], fallback: 'converse' };

function inWindow(w: StatusWindow, day: number, minute: number): boolean {
  if (!w.days.includes(day)) return false;
  if (w.from === w.to) return true;
  if (w.from < w.to) return minute >= w.from && minute < w.to;
  // Wraps midnight. The day in `days` is the day the window STARTS, so an
  // evening window is matched on its own evening and again on the small hours
  // that belong to it.
  return minute >= w.from || minute < w.to;
}

/**
 * The preset the schedule asks for at a moment, or null when the schedule is
 * off or nothing matches and there is no reason to move. A caller that gets
 * null leaves the status exactly where the person put it, which is what makes
 * a disabled schedule harmless.
 */
export function scheduledPreset(schedule: StatusSchedule, at: Date): PolicyPreset | null {
  if (!schedule.enabled) return null;
  const day = at.getDay();
  const minute = at.getHours() * 60 + at.getMinutes();
  for (const w of schedule.windows) {
    if (inWindow(w, day, minute)) return w.preset;
    // A window that wraps midnight also owns the small hours of the NEXT day.
    if (w.from > w.to && w.days.includes((day + 6) % 7) && minute < w.to) return w.preset;
  }
  return schedule.fallback;
}

/**
 * WHICH WINDOW INSTANCE IS DECIDING at a moment, as one stable string, or
 * null when the schedule is off (0.5.2, card v052-teammate-message-notifications).
 *
 * The status control promises that a status chosen while a window is driving
 * "holds until the next window starts". Until 0.5.2 nothing kept that promise:
 * `statusNow` answered the schedule on every read and `applySchedule` wrote the
 * schedule's word back over the person's within a minute, so Off lasted under
 * sixty seconds and the message path ignored it from the first second. The
 * hold needs a name for "this window, today": the same window matching again
 * tomorrow is a NEW instance and the schedule takes over again. So the key is
 * the window's index plus the local instant it started; the fallback, between
 * windows, is one key until any window starts.
 */
export function scheduleSlot(schedule: StatusSchedule, at: Date): string | null {
  if (!schedule.enabled) return null;
  const day = at.getDay();
  const minute = at.getHours() * 60 + at.getMinutes();
  const midnight = new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
  const DAY_MS = 24 * 60 * 60_000;
  for (let i = 0; i < schedule.windows.length; i++) {
    const w = schedule.windows[i];
    if (inWindow(w, day, minute)) {
      // A wrapping window matched in the small hours started yesterday.
      const startedYesterday = w.from > w.to && minute < w.to;
      return `w${i}@${midnight - (startedYesterday ? DAY_MS : 0) + w.from * 60_000}`;
    }
    if (w.from > w.to && w.days.includes((day + 6) % 7) && minute < w.to) {
      return `w${i}@${midnight - DAY_MS + w.from * 60_000}`;
    }
  }
  return 'fallback';
}

/** Discard anything a hand edited config file could put here. A window with no
 *  days, or a minute outside the day, is dropped rather than silently clamped,
 *  because a clamped window enforces a time nobody chose. */
export function normalizeSchedule(value: unknown): StatusSchedule {
  if (!value || typeof value !== 'object') return { ...EMPTY_SCHEDULE, windows: [] };
  const raw = value as Partial<StatusSchedule>;
  const windows = Array.isArray(raw.windows) ? raw.windows.filter(isWindow) : [];
  return {
    enabled: raw.enabled === true,
    windows: windows.map((w) => ({
      days: [...new Set(w.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b),
      from: w.from,
      to: w.to,
      preset: w.preset
    })).filter((w) => w.days.length > 0),
    fallback: isPreset(raw.fallback) ? raw.fallback : 'converse'
  };
}

function isPreset(v: unknown): v is PolicyPreset {
  return typeof v === 'string' && (POLICY_PRESETS as readonly string[]).includes(v);
}

function isWindow(v: unknown): v is StatusWindow {
  if (!v || typeof v !== 'object') return false;
  const w = v as Partial<StatusWindow>;
  return Array.isArray(w.days)
    && typeof w.from === 'number' && Number.isInteger(w.from) && w.from >= 0 && w.from <= 1439
    && typeof w.to === 'number' && Number.isInteger(w.to) && w.to >= 0 && w.to <= 1440
    && isPreset(w.preset);
}

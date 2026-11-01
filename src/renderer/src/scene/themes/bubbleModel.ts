// Ported from Prozzta/guppyos 02d0d50b (MIT).
import { activityStatus, heavyText, type HeavyActivity } from '@shared/activityView';
import type { LivenessClassification, LivenessV1 } from '@shared/livenessV1';

/** The small, renderer-independent part of an agent needed by a thought cloud. */
export interface BubbleAgent {
  status: string;
  action?: string;
  lastPrompt?: string;
  carrying?: string;
  isGod?: boolean;
  /** The boot note the agent was restored or spawned with (TES-BUBBLES-188): never activity. */
  bootAction?: { text: string };
}

export interface BubbleThought {
  status: string;
  text: string;
  tool?: string;
}

/** A transient line supplied by Crew or another themed prop system. */
export interface BubbleSay {
  /** Stable within the producer's event stream; lets a cursor ignore a replay. */
  key: string;
  id: string;
  text: string;
  ttl?: number;
  /** Show it this many ms after it is consumed (the later lines of an exchange). */
  delay?: number;
}

/** A replay-safe cursor for bounded event arrays such as Crew.events. */
export interface BubbleSayCursor {
  seen: Set<string>;
  order: string[];
}

const MAX_CURSOR_KEYS = 128;

export function createSayCursor(): BubbleSayCursor {
  return { seen: new Set(), order: [] };
}

/** Feed a possibly replayed event array exactly once per stable event key. */
export function consumeSays(
  events: readonly BubbleSay[],
  cursor: BubbleSayCursor,
  say: (id: string, text: string, options?: { ttl?: number; delay?: number }) => void
): void {
  for (const event of events) {
    if (cursor.seen.has(event.key)) continue;
    cursor.seen.add(event.key);
    cursor.order.push(event.key);
    if (cursor.order.length > MAX_CURSOR_KEYS) cursor.seen.delete(cursor.order.shift()!);
    say(event.id, event.text, event.ttl === undefined && event.delay === undefined ? undefined
      : { ...(event.ttl === undefined ? {} : { ttl: event.ttl }), ...(event.delay === undefined ? {} : { delay: event.delay }) });
  }
}

function firstWords(prompt: string | undefined, maxWords = 6, maxChars = 42): string {
  if (!prompt) return '';
  const words = prompt.trim().split(/\s+/);
  let out = words.slice(0, maxWords).join(' ');
  if (out.length > maxChars) out = out.slice(0, maxChars).trimEnd();
  else if (words.length > maxWords) out += '…';
  return out;
}

function liveActivity(agent: BubbleAgent, fallback = ''): string {
  const action = agent.bootAction && agent.action === agent.bootAction.text ? '' : agent.action;
  return action?.trim() || firstWords(agent.lastPrompt) || fallback;
}

// TES-BUBBLES-188 (d): a status cloud comes and goes, as on the office floor. 1.1.87 kept one over
// every head all the time. A change shows it for CLOUD_SHOW_MS; another change inside the quiet
// after it waits; a state that lasts shows again every CLOUD_RESURFACE_MS or so. A compaction or
// a loop shows at once; 'needs you' (blocked), crashed and stuck stay up. An idle cloud never
// shows: the crew's own lines speak for an idle floor. 'waiting' is a place in the heavy-job
// queue (activityView), not a call for the Human, so it comes and goes like work.

/** How long a cloud shows for a change, ms (the bubble's linger and fade follow, about 1.5 s). */
export const CLOUD_SHOW_MS = 2600;
/** After a cloud, how long a further change of the same kind waits, ms. */
export const CLOUD_QUIET_MS = 30_000;
/** A lasting state shows again after this long, ms, drawn evenly from the range. */
export const CLOUD_RESURFACE_MS: readonly [number, number] = [20_000, 40_000];
/** States that show at once. */
const CALLS: ReadonlySet<string> = new Set(['compacting', 'looping']);
/** States that stay up: they need the Human. */
const STICKY: ReadonlySet<string> = new Set(['blocked', 'crashed', 'stuck']);
/** Liveness readings the cloud says over any hook status, as the card's chip does. */
const ALARMS: Partial<Record<LivenessClassification, string>> = { CRASHED: 'crashed', STUCK_WAKE: 'stuck' };

/** One person's cloud timing. */
export interface CloudGate {
  status: string | null;
  text: string | null;
  /** The cloud shows until then. */
  until: number;
  /** A plain change shows only from then. */
  quiet: number;
  /** A lasting state shows again from then. */
  next: number;
}

export function createCloudGate(): CloudGate {
  return { status: null, text: null, until: -Infinity, quiet: -Infinity, next: Infinity };
}

/** Whether the cloud for `thought` shows at `now` (ms); advances the gate. */
export function cloudShows(g: CloudGate, now: number, thought: { status: string; text: string } | null, rand: () => number): boolean {
  if (!thought) { g.status = g.text = null; g.until = -Infinity; return false; }
  const first = g.status === null;
  const changedStatus = !first && thought.status !== g.status, changed = changedStatus || (!first && thought.text !== g.text);
  g.status = thought.status;
  g.text = thought.text;
  if (STICKY.has(thought.status)) return true;
  // Runs per person per frame: no closures or arrays here.
  const lo = CLOUD_RESURFACE_MS[0], hi = CLOUD_RESURFACE_MS[1];
  if (first) g.next = now + rand() * hi; // what is there at first sight is no change: it surfaces in its turn
  else if ((changedStatus && CALLS.has(thought.status))
    || (thought.status !== 'idle' && ((changed && now >= g.quiet) || now >= g.next) && now >= g.until)) {
    g.until = now + CLOUD_SHOW_MS;
    g.quiet = g.until + CLOUD_QUIET_MS;
    g.next = g.until + lo + rand() * (hi - lo);
  }
  return now < g.until;
}

/** The status and cloud text the floor should show, projected through liveness first.
 *  IDLE-MEANS-IDLE (1.1.87): then through the agent's place in the heavy-job lock, as the office
 *  floor does: when the lock changes the status, the cloud says the lock's line. */
export function activityThought(agent: BubbleAgent, liveness?: LivenessV1, heavy?: HeavyActivity | null): BubbleThought | null {
  const alarm = liveness ? ALARMS[liveness.classification] : undefined;
  if (alarm) return { status: alarm, text: alarm };
  const status = activityStatus(agent.status, liveness, heavy);
  if (status !== activityStatus(agent.status, liveness)) agent = { ...agent, action: heavyText(heavy) ?? agent.action };
  switch (status) {
    case 'working':
    case 'thinking': return { status, text: liveActivity(agent), tool: agent.carrying };
    case 'waiting': return { status, text: liveActivity(agent, 'waiting'), tool: agent.carrying };
    case 'blocked': return { status, text: liveActivity(agent, 'needs you') };
    case 'compacting': return { status, text: liveActivity(agent, 'compacting context') };
    case 'looping': return { status, text: liveActivity(agent, 'looping — breaker armed') };
    case 'idle': return { status, text: liveActivity(agent, agent.isGod ? 'running the floor' : 'idle'), tool: agent.carrying };
    default: return null;
  }
}

/**
 * THE RULES of the Halloween corner on the queue input area (0.5.5 rc2,
 * founder 30 Sep 2026: "build cute micro interactions"). Nothing here draws:
 * SeasonCorner.tsx does. This file only answers what the pieces should be
 * doing, from things that are really happening in the app:
 *
 *   the pumpkin's mood   the agent's stored status and its session;
 *   the candle's glow    how full the agent's context is;
 *   the spider           up in the web, comes down while the pointer is on
 *                        the web and for a moment after (Round 7, R7-2);
 *   the web              small and light at rest, fades while the draft has
 *                        text under it, grows and gains contrast with the
 *                        spider while the pointer is on it (R7-2b).
 *
 * Import free on purpose: test/load-ts.cjs loads this file and runs it.
 */

export type Mood = 'surprised' | 'awake' | 'dozing' | 'out';

/** Strongest first: when two are true at once the earlier one is shown. */
export const MOODS: readonly Mood[] = ['surprised', 'awake', 'dozing', 'out'];

/** The agent is waiting on the person, or the breaker stopped it. */
const NEEDS_YOU: readonly string[] = ['waiting', 'blocked', 'looping'];
const AT_WORK: readonly string[] = ['working', 'thinking', 'compacting'];

export interface MoodInput {
  /** The status stored on the agent. 'typing' is derived at render and never
   *  stored, so it never reaches here. */
  status: string | undefined;
  /** The agent has a live terminal session. */
  hasSession: boolean;
}

export function moodFor(i: MoodInput): Mood {
  const status = i.status ?? '';
  if (NEEDS_YOU.includes(status)) return 'surprised';
  if (AT_WORK.includes(status)) return 'awake';
  if (!i.hasSession || status === 'ghost') return 'out';
  return 'dozing';
}

/** The candle is at its brightest with an empty context and at its lowest
 *  with a full one. Never dark: a full context is not a dead agent. */
export const GLOW_FULL = 1;
export const GLOW_LOW = 0.35;

/** Opacity of the glow, two decimals. Unknown sizes mean a bright candle. */
export function glowFor(contextTokens: number | undefined, contextLimit: number | undefined): number {
  if (!contextTokens || !contextLimit || contextTokens < 0 || contextLimit <= 0) return GLOW_FULL;
  const used = Math.min(1, contextTokens / contextLimit);
  return Math.round((GLOW_FULL - (GLOW_FULL - GLOW_LOW) * used) * 100) / 100;
}

/** The web at rest, in px: a small light web in the top corner of the input
 *  area, the one that shipped before Round 7. The css draws the box at this
 *  size and the pointer rule reads it. */
export const WEB_PX = 56;

/** The web while the pointer is on it (Round 7, R7-2b, founder: "more web
 *  grows out as we hover and spider drops"): 1.5 times the rest size, grown
 *  out of the corner by a transform, so the box itself never changes. The
 *  pointer rule reads this size while the web is grown, so a pointer on the
 *  grown part is still on the web. */
export const WEB_GROWN_PX = 84;

/** After the pointer leaves the web the spider stays down this long, then
 *  it climbs and the web shrinks with it. 1500 at first; the founder tried
 *  it and asked for it to "go back a bit quickly" (Round 7, R7-4). */
export const SPIDER_LINGER_MS = 700;

export interface SpiderState {
  /** Down on its thread, in the web. Up (false) is out of sight. */
  down: boolean;
  /** When it goes back up, or null while the pointer is on the web or it is
   *  already up. */
  upAt: number | null;
}

/** Up in the corner: the state on first paint, and the one it returns to.
 *  Typing does nothing to it (Round 7, R7-2, founder: "the spider should
 *  come out when user hovers on it"). */
export const SPIDER_UP: SpiderState = { down: false, upAt: null };

/** The pointer came onto the web: down it comes and stays. */
export function spiderOnEnter(): SpiderState {
  return { down: true, upAt: null };
}

/** The pointer left the web: it stays a moment, then goes back up. */
export function spiderOnLeave(now: number): SpiderState {
  return { down: true, upAt: now + SPIDER_LINGER_MS };
}

/** The one timeout fired. The pointer coming back since cleared `upAt`, and
 *  then the spider stays down. */
export function spiderOnTimer(state: SpiderState, now: number): SpiderState {
  if (!state.down) return SPIDER_UP;
  if (state.upAt === null) return state;
  return now >= state.upAt ? SPIDER_UP : state;
}

/** How long the one timeout should wait from `now`, or null for no timeout. */
export function spiderWait(state: SpiderState, now: number): number | null {
  if (!state.down || state.upAt === null) return null;
  return Math.max(0, state.upAt - now);
}

/** Is a pointer over the web? `dx` is how far it is in from the input area's
 *  corner edge (the right edge, the left one in Arabic), `dy` how far down
 *  from the top, both in px. The web fans out of the corner, so the answer
 *  is the triangle its outer strands reach, not the whole square: a pointer
 *  in the square's empty far corner is on the text, not the web. */
export function overWeb(dx: number, dy: number, size: number = WEB_PX): boolean {
  if (dx < 0 || dy < 0 || dx >= size || dy >= size) return false;
  return dx + dy <= size * 1.05;
}

/** The web is drawn over the text, so it steps back while there is any. */
export function webFaded(draft: string | undefined): boolean {
  return !!draft && draft.trim().length > 0;
}

/** How the web is drawn: `grown` (and with more contrast) exactly while the
 *  spider is down, so the two move together and go back together; `faded`
 *  with text under it, or with messages queued (the queue header is under
 *  the web then, and a pointer changes nothing there); `full` otherwise. */
export type WebLook = 'full' | 'faded' | 'grown';

export function webLook(spider: SpiderState, crowded: boolean, draft: string | undefined): WebLook {
  if (crowded) return 'faded';
  if (spider.down) return 'grown';
  return webFaded(draft) ? 'faded' : 'full';
}

/** The size the pointer rule reads: the rest web to come onto it, the grown
 *  web to stay on it, so the spider never climbs while the pointer is on the
 *  part that grew. */
export function hitSize(over: boolean): number {
  return over ? WEB_GROWN_PX : WEB_PX;
}

/** The candle's light changes at most this often, however fast the context
 *  count moves. */
export const GLOW_MIN_GAP_MS = 1000;

/** How long to hold a new glow back: 0 means show it now. */
export function glowWait(lastShownAt: number | null, now: number): number {
  if (lastShownAt === null) return 0;
  return Math.max(0, lastShownAt + GLOW_MIN_GAP_MS - now);
}

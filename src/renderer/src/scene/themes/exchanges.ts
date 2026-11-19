// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Crew exchanges (TES-BUBBLES-188 b2): short back-and-forths from a pack's lines file, played as
// alternating clouds between two people. The lines file keeps them under lines.exchanges, each
// either a plain array of lines (the bridge viewer's form) or {lines, roles?}, where roles[j] is
// the station that says lines[j] ('crew' = anyone). A wander chat plays one, and so does the
// bridge itself every so often, so the crew are heard talking even while everyone is at work.
// Pure: the floor supplies the people, the clock and the randomness.

import type { BubbleSay } from './bubbleModel';

export interface Exchange {
  lines: readonly string[];
  /** roles[j] is the station that says lines[j]; 'crew' is anyone. */
  roles?: readonly string[];
}

/** One person who may speak: their id and their station's role (null: a seat without one). */
export interface Speaker {
  id: string;
  role: string | null;
}

/** The time between two lines of an exchange (the bridge viewer's beat). */
export const EXCHANGE_BEAT_MS = 2400;
/** A line's cloud stays up this long: one beat, so the two speakers' clouds alternate. */
export const EXCHANGE_LINE_MS = 2400;
/** How long a wander chat holds the two still: long enough for the longest exchange. */
export const EXCHANGE_HOLD_MS = 4 * EXCHANGE_BEAT_MS;
/** The bridge starts a talk every this-many ms, the gap drawn evenly from the range. */
export const BRIDGE_TALK_GAP_MS: readonly [number, number] = [20_000, 40_000];
/** The share of bridge talks that go to a pair whose stations the exchange names. */
const PREFER_ROLES = 0.75;
const MAX_LINES = 4;

const plain = (s: unknown): s is string => typeof s === 'string' && s.trim() !== '' && !s.includes('{');

/** The exchanges of a lines file's `lines.exchanges`, in either form; anything malformed is skipped. */
export function readExchanges(raw: unknown): Exchange[] {
  if (!Array.isArray(raw)) return [];
  const out: Exchange[] = [];
  for (const item of raw) {
    const obj = Array.isArray(item) ? { lines: item } : item && typeof item === 'object' ? item as { lines?: unknown; roles?: unknown } : null;
    const lines = obj && Array.isArray(obj.lines) ? obj.lines : null;
    if (!lines || lines.length < 2 || lines.length > MAX_LINES || !lines.every(plain)) continue;
    const roles = Array.isArray(obj!.roles) && obj!.roles.length === lines.length && obj!.roles.every((r) => typeof r === 'string' && r.trim() !== '')
      ? (obj!.roles as string[]).map((r) => r.trim().toLowerCase()) : undefined;
    out.push(roles ? { lines: lines as string[], roles } : { lines: lines as string[] });
  }
  return out;
}

function hash(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** How well `ex` suits `first` opening and `second` answering: -1 when it does not fit, else the
 *  number of lines whose named station is the speaker's own. A speaker without a role may play one
 *  station nobody holds (`held` lists the stations people hold), the same one throughout. */
export function exchangeFit(ex: Exchange, first: Speaker, second: Speaker, held: ReadonlySet<string>): number {
  if (!ex.roles) return 0;
  let score = 0;
  const played = new Map<string, string>();
  for (let j = 0; j < ex.lines.length; j++) {
    const who = j % 2 ? second : first, role = ex.roles[j];
    if (role === 'crew') continue;
    if (role === who.role) { score++; continue; }
    if (who.role !== null || held.has(role)) return -1;
    if ((played.get(who.id) ?? role) !== role) return -1;
    played.set(who.id, role);
  }
  return score;
}

/** The exchange `a` and `b` play for `key` (the same one for the same key), as says from `at`:
 *  line j by the opener or the answerer in turn, one beat apart. Prefers exchanges that name the
 *  speakers' own stations; null when none fits. */
export function exchangeSays(exchanges: readonly Exchange[], a: Speaker, b: Speaker, held: ReadonlySet<string>, key: string): BubbleSay[] | null {
  const fits: Array<{ ex: Exchange; first: Speaker; second: Speaker; score: number }> = [];
  for (const ex of exchanges) {
    for (const [first, second] of [[a, b], [b, a]] as const) {
      const score = exchangeFit(ex, first, second, held);
      if (score >= 0) { fits.push({ ex, first, second, score }); break; }
    }
  }
  if (!fits.length) return null;
  const named = fits.filter((f) => f.score > 0);
  const h = hash(key), pool = named.length && h % 4 !== 0 ? named : fits;
  const pick = pool[Math.floor(h / 4) % pool.length];
  return pick.ex.lines.map((text, j) => ({
    key: `${key}#${j}`, id: (j % 2 ? pick.second : pick.first).id, text, ttl: EXCHANGE_LINE_MS, delay: j * EXCHANGE_BEAT_MS
  }));
}

/** The bridge's own talk: every BRIDGE_TALK_GAP_MS or so, two of the people present play an
 *  exchange, wherever they are. */
const NO_SAYS: readonly BubbleSay[] = Object.freeze([]);

export class BridgeTalk {
  private wait: number;
  private n = 0;
  /** Who spoke in the last talk: they sit the next one out when others can talk. */
  private last = new Set<string>();

  constructor(private readonly exchanges: readonly Exchange[], private readonly held: ReadonlySet<string>, private readonly rand: () => number) {
    this.wait = this.gap();
  }

  private gap(): number {
    const [lo, hi] = BRIDGE_TALK_GAP_MS;
    return lo + this.rand() * (hi - lo);
  }

  /** The says of a talk that starts in this tick, if one does. It runs every frame, so `speakers`
   *  may be a function: it is called only when a talk is due. */
  tick(dt: number, speakers: readonly Speaker[] | (() => readonly Speaker[])): readonly BubbleSay[] {
    if (!this.exchanges.length || (this.wait -= dt) > 0) return NO_SAYS;
    this.wait = this.gap();
    const people = typeof speakers === 'function' ? speakers() : speakers;
    if (people.length < 2) return NO_SAYS;
    const fresh = people.filter((p) => !this.last.has(p.id));
    const who = fresh.length >= 2 ? fresh : people;
    const pairs: Array<[Speaker, Speaker]> = [];
    for (let i = 0; i < who.length; i++) for (let j = i + 1; j < who.length; j++) pairs.push([who[i], who[j]]);
    const named = pairs.filter(([a, b]) => this.exchanges.some((ex) => exchangeFit(ex, a, b, this.held) > 0 || exchangeFit(ex, b, a, this.held) > 0));
    const pool = named.length && this.rand() < PREFER_ROLES ? named : pairs;
    const [a, b] = pool[Math.floor(this.rand() * pool.length)];
    this.last = new Set([a.id, b.id]);
    return exchangeSays(this.exchanges, a, b, this.held, `bridge:${++this.n}:${a.id}:${b.id}`) ?? [];
  }
}

type Stations = { captain?: string; seats?: Readonly<Record<string, { role?: string }>> } | undefined;

/** The role of a station: 'captain' for the captain's, else its seat's role; null for none. */
export function seatRole(stations: Stations, name: string | null | undefined): string | null {
  if (!name) return null;
  if (stations?.captain && stations.captain.toLowerCase() === name.toLowerCase()) return 'captain';
  return stations?.seats?.[name]?.role?.toLowerCase() ?? null;
}

/** Every role some station has: lines naming one are left to whoever holds it. */
export function stationRoles(stations: Stations): Set<string> {
  const held = new Set<string>();
  if (stations?.captain) held.add('captain');
  for (const name of Object.keys(stations?.seats ?? {})) { const r = seatRole(stations, name); if (r) held.add(r); }
  return held;
}

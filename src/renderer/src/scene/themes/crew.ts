// Ported from Prozzta/guppyos 02d0d50b (MIT).
// The people of a stations scene: who holds which station, who walks where,
// who sits. Ported from the bridge viewer's crew behaviour (spawn at the
// entrance, goTo, the tick's seat/wander logic), with stations
// handed out by the manifest-driven SeatAllocator. Idle agents wander, chat
// with an idle neighbour at a stop, and now and then go for coffee: the
// viewer's fixed coffee run (a per-agent cooldown, a full parked mug is drunk
// first), with the brew and mug spots from the pack. Pure: the Pixi scene only
// draws what this reports.

import { route, seatRoute, wanderTarget, cellCentre, type Station, type StationMap } from './stationMap';
import { SeatAllocator, type SeatChange, type SeatRules } from './seatAllocator';
import type { Facing } from './manifest';

/** Walking speed in map pixels per millisecond (the viewer's). */
export const WALK_SPEED = 0.045;

/** ms of the seat step: approach spot to seat point (sitting down) or back (getting up). Chairs are solid for
 *  every walk; the step is the only time feet are in a chair, and it is drawn seated, sorted with the chair. */
export const SEAT_STEP_MS = 220;

/** A seat step in progress: from -> to over `ms`; `sit` is the step in (it ends seated). */
export interface SeatStep {
  from: [number, number];
  to: [number, number];
  t: number;
  ms: number;
  sit: boolean;
}

/** Per agent: ms from the start of one coffee run to the next, when the pack sets none (the viewer's 3-5 min). */
export const COFFEE_GAP: [number, number] = [180000, 300000];

/** States that keep (or take) a seat and sit at it. */
export const atDesk = (s: string): boolean => s === 'working' || s === 'blocked' || s === 'error' || s === 'thinking' || s === 'waiting' || s === 'compacting' || s === 'looping';

export interface CrewAgent {
  id: string;
  status: string;
  orchestrator?: boolean;
  presetId?: string;
}

/** A mug left at a station: full until `full` (drunk when the sip ends, or after 60 s at most). */
export interface Mug { seat: Station; full: number; }

export interface CoffeeRun {
  spot: [number, number];
  phase: 'fetch' | 'walking' | 'brewing' | 'sipping' | 'back';
  /** ms in this phase. */
  t: number;
  until: number;
}

/** What happened on the floor (the scene may show it; tests count it). */
export interface CrewEvent { kind: 'chat' | 'errand' | 'brew' | 'sip' | 'gaveUp'; id: string; with?: string; at: number; }

export interface Walker {
  id: string;
  x: number;
  y: number;
  dir: Facing;
  moving: boolean;
  path: Array<[number, number]>;
  /** The station this agent holds (from the allocator). */
  seat: Station | null;
  lastSeat: Station | null;
  seated: boolean;
  /** A route to the seat was tried (the next stop sits down). */
  tried: boolean;
  /** Arrived at the end of the current path this tick. */
  arrived: boolean;
  /** ms until the next wander stop. */
  idle: number;
  /** ms before the first step (arrivals are staggered). */
  wait: number;
  status: string;
  /** Idle, at (or heading for) their own station with a coffee. */
  homeSit: boolean;
  /** Clock time the sip ends, then the time they get up (0: none). */
  sip: number;
  rise: number;
  /** Carrying a mug. */
  cup: boolean;
  /** The mug in hand holds a finished brew (set at the brew's end). A mug picked up for a refill is
   *  empty until then, so a run cut short on the way or mid-brew parks it empty (Jim, IDLE-187 S3). */
  fresh: boolean;
  /** Their mug, parked at a station. */
  mug: Mug | null;
  coffee: CoffeeRun | null;
  /** Clock time of their next coffee run, at the earliest. */
  coffeeNext: number;
  /** Clock time a chat ends. */
  talk: number;
  /** The seat whose chair p is in (seated, or stepping in or out of it); null on the floor. */
  chair: Station | null;
  step: SeatStep | null;
}

/** How to draw p with a chair: the seat it is in (seated or mid step) and how far in it is (1 seated, 0 at the
 *  approach spot); null standing on the floor. The scene sorts and poses p with that seat's chair. */
export function sitDraw(p: Walker): { seat: Station; k: number } | null {
  const c = p.chair ?? (p.seated ? p.seat : null);
  if (!c) return null;
  const s = p.step, f = s ? Math.min(1, s.t / (s.ms || 1)) : 1;
  return { seat: c, k: p.seated ? 1 : s ? (s.sit ? f : 1 - f) : 1 };
}

export interface CrewOptions {
  /** Per agent: ms from one coffee run's start to the next, [min, max]. */
  coffeeGap?: [number, number];
  /** Ms a wander chat holds the two still (long enough for the pack's exchanges). */
  chatHold?: number;
}

export class Crew {
  readonly SM: StationMap;
  readonly seats: SeatAllocator;
  private readonly byName = new Map<string, Station>();
  private readonly people = new Map<string, Walker>();
  private readonly rand: () => number;
  private readonly gap: [number, number];
  private readonly chatHold: number;
  /** The floor's coffee picker: ms to its next look. */
  private cool = 5000;
  /** The crew clock, ms. */
  t = 0;
  /** The last allocator changes (for tests and the scene's logs). */
  lastChanges: SeatChange[] = [];
  /** Recent floor events, newest last (at most 50). */
  events: CrewEvent[] = [];

  constructor(SM: StationMap, rules: SeatRules, rand: () => number = Math.random, opts: CrewOptions = {}) {
    this.SM = SM;
    this.rand = rand;
    this.gap = opts.coffeeGap ?? COFFEE_GAP;
    this.chatHold = opts.chatHold ?? 3000;
    for (const s of SM.seatOrder) this.byName.set(s.name, s);
    this.seats = new SeatAllocator({ ...rules, order: rules.order.filter((n) => this.byName.has(n)) });
  }

  walkers(): Walker[] { return [...this.people.values()]; }
  get(id: string): Walker | undefined { return this.people.get(id); }

  private entry(): [number, number] {
    const SM = this.SM;
    return SM.entrance ? [SM.entrance[0], SM.entrance[1]] : SM.start ? cellCentre(SM.grid, SM.start) : [0, 0];
  }

  private event(kind: CrewEvent['kind'], id: string, other?: string): void {
    this.events.push({ kind, id, ...(other ? { with: other } : {}), at: this.t });
    if (this.events.length > 50) this.events.shift();
  }

  /** Bring the floor in line with the roster: arrivals, departures, status changes. */
  sync(agents: CrewAgent[]): void {
    const changes: SeatChange[] = [];
    const ids = new Set(agents.map((a) => a.id));
    for (const id of [...this.people.keys()]) if (!ids.has(id)) { changes.push(...this.seats.leave(id)); this.people.delete(id); }
    let arrivals = 0;
    for (const a of agents) {
      let p = this.people.get(a.id);
      if (!p) {
        const [x, y] = this.entry();
        p = {
          id: a.id, x, y, dir: 'down', moving: false, path: [], seat: null, lastSeat: null, seated: false, tried: false, arrived: false, idle: 0,
          wait: arrivals++ * 400, status: a.status, homeSit: false, sip: 0, rise: 0, cup: false, fresh: false, mug: null, coffee: null, coffeeNext: 0, talk: 0,
          chair: null, step: null,
        };
        this.people.set(a.id, p);
        changes.push(...this.seats.join({ id: a.id, orchestrator: a.orchestrator, presetId: a.presetId }));
      } else if (p.status !== a.status) {
        const wasDesk = atDesk(p.status);
        p.status = a.status;
        if (wasDesk && !atDesk(a.status)) this.standUp(p);
        if (!wasDesk && atDesk(a.status)) { // back to work: a coffee run ends (a mug in hand is parked when they sit); a home sitter just stays
          p.coffee = null; p.homeSit = false; p.sip = 0; p.rise = 0; p.talk = 0;
          p.tried = false; p.path = [];
        }
      }
    }
    for (const c of changes) this.apply(c);
    this.lastChanges = changes;
  }

  /** A station moved: a seated agent stands up and walks to the new one (an idle sitter gives the seat up; the mug stays). */
  private apply(c: SeatChange): void {
    const p = this.people.get(c.agentId);
    if (!p) return;
    const to = c.to ? this.byName.get(c.to) ?? null : null;
    if (p.seat && p.seat !== to) { p.lastSeat = p.seat; }
    p.seat = to;
    p.seated = false; p.tried = false; p.path = [];
    p.homeSit = false; p.sip = 0; p.rise = 0;
    if (p.chair) this.stepOut(p);
  }

  private standUp(p: Walker): void {
    if (p.seated) p.lastSeat = p.seat;
    p.seated = false; p.tried = false; p.path = []; p.idle = 0;
    p.homeSit = false; p.sip = 0; p.rise = 0;
    if (p.chair) this.stepOut(p);
  }

  /** The seat step out of the chair p is in, from where it is to that seat's approach spot (a part-way step
   *  takes part of the time). */
  private stepOut(p: Walker): void {
    const c = p.chair!, a = this.SM.approach.get(c)!, L = Math.hypot(a[0] - c.x, a[1] - c.y) || 1;
    p.seated = false; p.moving = false;
    p.step = { from: [p.x, p.y], to: a, t: 0, ms: SEAT_STEP_MS * Math.max(0.2, Math.min(1, Math.hypot(a[0] - p.x, a[1] - p.y) / L)), sit: false };
  }

  /** The seat step into p's own seat, from where it is (its approach spot, or part-way out). */
  private stepIn(p: Walker): void {
    const s = p.seat!, a = this.SM.approach.get(s)!, L = Math.hypot(a[0] - s.x, a[1] - s.y) || 1;
    p.chair = s; p.path = []; p.moving = false;
    p.step = { from: [p.x, p.y], to: [s.x, s.y], t: 0, ms: SEAT_STEP_MS * Math.max(0.2, Math.min(1, Math.hypot(s.x - p.x, s.y - p.y) / L)), sit: true };
  }

  /** Plain floor to (tx, ty); in a chair, the seat step out to its approach spot first. Chairs are solid for
   *  every walk, the walker's own included. */
  goTo(p: Walker, tx: number, ty: number, exact: boolean): boolean {
    const c = p.chair, a = c ? this.SM.approach.get(c)! : null;
    const rest = route(this.SM, a ? a[0] : p.x, a ? a[1] : p.y, tx, ty, undefined, exact);
    if (!rest) return false;
    if (c) this.stepOut(p);
    p.path = rest;
    return true;
  }

  /** To p's own seat: out of any other chair by its seat step, plain floor to its own seat's approach spot, then
   *  (from the tick, on arrival) the seat step in. In its own chair (part-way out): straight back in. */
  goSeat(p: Walker): boolean {
    const seat = p.seat!, c = p.chair;
    if (c === seat) { this.stepIn(p); return true; }
    const a = c ? this.SM.approach.get(c)! : null;
    const rest = seatRoute(this.SM, a ? a[0] : p.x, a ? a[1] : p.y, seat);
    if (!rest) return false;
    if (c) this.stepOut(p);
    p.path = rest.slice(0, -1); // to the approach spot: the last leg is the seat step
    return true;
  }

  /** p stands on its own seat's approach spot. */
  private atApproach(p: Walker): boolean {
    const a = p.seat ? this.SM.approach.get(p.seat) : undefined;
    return !!a && Math.hypot(p.x - a[0], p.y - a[1]) < 0.5;
  }

  // ---- coffee and errands ----

  /** Where a parked mug stands: the pack's mug point for that station, else the station itself. */
  mugAt(m: Mug): [number, number] {
    return this.SM.mugSpots.get(m.seat) ?? [m.seat.x, m.seat.y];
  }

  private mugFull(p: Walker): boolean { return !!(p.mug && p.mug.full && this.t < p.mug.full); }

  /** The centre of the reachable open walk cell nearest to (x, y). */
  private nearOpen(x: number, y: number): [number, number] | null {
    const G = this.SM.grid, R = this.SM.reach;
    let best: [number, number] | null = null, bd = Infinity;
    for (let i = 0; i < G.W * G.H; i++) {
      if (!G.open[i] || !R[i]) continue;
      const c = cellCentre(G, [i % G.W, Math.floor(i / G.W)]), d = Math.hypot(c[0] - x, c[1] - y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  /** Coffee goes home: to their own station (an idle agent holds one), sat at and sipped. False with none. */
  private goHome(p: Walker): boolean {
    if (!p.seat) return false;
    p.coffee = null; p.homeSit = true; p.seated = false; p.tried = false; p.path = [];
    return true;
  }

  /** Just seated: a mug in hand is parked at the station; an idle agent home with coffee sips a while. */
  private sitDown(p: Walker): void {
    if (p.cup && p.seat) { p.mug = { seat: p.seat, full: p.fresh ? this.t + 60000 : 0 }; p.cup = false; p.fresh = false; }
    if (p.homeSit) { p.sip = this.t + 8000 + this.rand() * 8000; this.event('sip', p.id); }
  }

  private startCoffee(p: Walker, spot: [number, number]): boolean {
    if (p.homeSit) this.standUp(p);
    let phase: CoffeeRun['phase'] = 'walking';
    if (p.mug) {
      const at = this.mugAt(p.mug);
      if (Math.hypot(p.x - at[0], p.y - at[1]) < 26) { p.mug = null; p.cup = true; } // the mug is right here
      else { // go and get it first, from the open floor nearest to it; never a second mug
        const near = this.nearOpen(at[0], at[1]);
        if (!near || !this.goTo(p, near[0], near[1], true)) return false;
        phase = 'fetch';
      }
    }
    if (phase === 'walking' && !this.goTo(p, spot[0], spot[1], true)) return false;
    p.coffee = { spot, phase, t: 0, until: 0 };
    p.coffeeNext = this.t + this.gap[0] + this.rand() * (this.gap[1] - this.gap[0]);
    return true;
  }

  /** The walk took too long: no coffee this time; a mug in hand still goes home. */
  private endCoffee(p: Walker): void {
    if (!p.coffee) return;
    p.coffee = null; p.path = [];
    this.event('gaveUp', p.id);
    if (p.cup) this.goHome(p);
  }

  /** The next beat of a coffee run, once the walk so far is done. */
  private coffeeStep(p: Walker): void {
    const c = p.coffee!;
    if (c.phase === 'fetch') { // at their station: pick the mug up (if they got close enough), then on to the brew spot
      if (p.mug && Math.hypot(p.x - this.mugAt(p.mug)[0], p.y - this.mugAt(p.mug)[1]) < 26) { p.mug = null; p.cup = true; }
      if (p.mug) { this.endCoffee(p); return; } // could not get to it (never a second mug)
      c.phase = 'walking'; c.t = 0;
      if (!this.goTo(p, c.spot[0], c.spot[1], true)) this.endCoffee(p);
    } else if (c.phase === 'walking') { c.phase = 'brewing'; c.t = 0; this.event('brew', p.id); }
    else if (c.phase === 'brewing' && c.t > 2600) {
      p.cup = true; p.fresh = true;
      if (this.goHome(p)) return; // the seat logic walks them home and sits them down
      c.phase = 'sipping'; c.t = 0; c.until = 8000 + this.rand() * 8000; this.event('sip', p.id);
    } else if (c.phase === 'sipping' && c.t > c.until) {
      c.phase = 'back'; c.t = 0;
      const t = wanderTarget(this.SM, this.rand);
      if (t) this.goTo(p, t[0], t[1], true);
    } else if (c.phase === 'back') { p.coffee = null; p.idle = 1500 + this.rand() * 3000; }
  }

  /** The floor's coffee picker: every 6-12 s, 70% of the time, one eligible idle agent goes to a free brew spot. */
  private coffeeTick(dt: number): void {
    const brew = this.SM.brew;
    if (!brew.length || (this.cool -= dt) > 0) return;
    this.cool = 6000 + this.rand() * 6000;
    if (this.rand() >= 0.7) return;
    const all = this.walkers(), busy = all.filter((p) => p.coffee).map((p) => p.coffee!.spot);
    const free = brew.filter((s) => !busy.includes(s));
    const idle = all.filter((p) => !atDesk(p.status) && !p.coffee && !(p.wait > 0) && (!p.homeSit || p.seated) && (!p.seated || p.homeSit)
      && this.t >= p.coffeeNext && !this.mugFull(p));
    if (free.length && idle.length) this.startCoffee(idle[Math.floor(this.rand() * idle.length)], free[0]);
  }

  private face(p: Walker, q: Walker): void {
    const dx = q.x - p.x, dy = q.y - p.y;
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  /** A wander stop: talk with an idle neighbour standing still, else now and then an errand thought. */
  private atStop(p: Walker): void {
    const free = (q: Walker) => !atDesk(q.status) && !q.path.length && !q.seated && !q.coffee && !(q.wait > 0) && this.t >= q.talk;
    const q = this.walkers().find((q) => q !== p && free(q) && Math.hypot(q.x - p.x, q.y - p.y) < 40);
    if (q && this.t >= p.talk && this.rand() < 0.6) {
      this.face(p, q); this.face(q, p);
      p.talk = q.talk = this.t + this.chatHold;
      p.idle = Math.max(p.idle, this.chatHold); q.idle = Math.max(q.idle, this.chatHold);
      this.event('chat', p.id, q.id);
      return;
    }
    if (this.rand() < 0.3) this.event('errand', p.id);
  }

  tick(dt: number): void {
    dt = Math.max(0, Math.min(80, dt)); // a stale or late frame never moves anyone backwards or far
    this.t += dt;
    for (const p of this.people.values()) {
      if (p.wait > 0) { p.wait -= dt; continue; }
      if (p.coffee) { p.coffee.t += dt; if ((p.coffee.phase === 'walking' || p.coffee.phase === 'fetch') && p.coffee.t > 20000) this.endCoffee(p); }
      if (p.step) { // a seat step: nothing else moves p until it ends
        const s = p.step, f = Math.min(1, (s.t += dt) / (s.ms || 1));
        p.x = s.from[0] + (s.to[0] - s.from[0]) * f; p.y = s.from[1] + (s.to[1] - s.from[1]) * f;
        p.moving = false;
        if (f >= 1) {
          p.step = null;
          if (s.sit) { p.seated = true; p.lastSeat = p.seat; p.dir = p.seat!.facing; this.sitDown(p); }
          else p.chair = null;
        }
        continue;
      }
      if (!p.path.length) {
        p.moving = false;
        const arrived = p.arrived;
        p.arrived = false;
        if (p.coffee) { this.coffeeStep(p); continue; }
        if (p.seated && p.homeSit && p.sip && this.t > p.sip) { // the coffee is drunk: up now, or a while later
          p.sip = 0;
          if (p.mug) p.mug.full = 0;
          if (this.rand() < 0.5) this.standUp(p); else p.rise = this.t + 20000 + this.rand() * 20000;
          continue;
        }
        if (p.seated && p.homeSit && p.rise && this.t > p.rise) { this.standUp(p); continue; }
        if (p.seat && (atDesk(p.status) || p.homeSit) && !p.seated) {
          if (!p.tried) {
            p.tried = true;
            if (!this.goSeat(p)) { if (p.homeSit) p.homeSit = false; else p.idle = 2000; }
          } else if (!p.chair && this.atApproach(p)) this.stepIn(p); // only from its own approach spot
          else if (p.homeSit) p.homeSit = false; // could not get home: sip standing next time
          else if ((p.idle -= dt) <= 0) { p.tried = false; p.idle = 2000; } // could not get there: try again in a while
        } else if (!p.seated) {
          if (arrived) this.atStop(p);
          if ((p.idle -= dt) <= 0) {
            const t = wanderTarget(this.SM, this.rand);
            if (t) this.goTo(p, t[0], t[1], true);
            p.idle = 1500 + this.rand() * 3000;
          }
        }
        continue;
      }
      p.seated = false;
      const [tx, ty] = p.path[0], dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), step = WALK_SPEED * dt;
      p.moving = true;
      p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (d <= step) { p.x = tx; p.y = ty; p.path.shift(); if (!p.path.length) p.arrived = true; }
      else { p.x += dx / d * step; p.y += dy / d * step; }
    }
    this.coffeeTick(dt);
  }
}

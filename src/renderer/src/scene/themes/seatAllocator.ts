// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Station allocation for a stations scene, driven by the pack's manifest:
// `stations.seatOrder` is the fill order, `stations.captain` is kept for the
// orchestrator, and `builder.presets[].seat` gives a premade preset's agents a
// station of their own. Affinity wins: when a generic agent holds that
// station, it moves to the next free station in the order (and walks there).
// No seat names live in code.

import type { ThemeManifest } from './manifest';

export interface SeatAgent {
  id: string;
  /** The project's orchestrator: takes the captain's station. */
  orchestrator?: boolean;
  /** The builder preset the agent was made from, if any. */
  presetId?: string;
}

/** One agent's move. `from`/`to` are station names; null = no station (waiting or gone). */
export interface SeatChange { agentId: string; from: string | null; to: string | null; }

export interface SeatRules {
  /** Fill order (station names). Only stations that exist and are reachable. */
  order: string[];
  captain?: string | null;
  /** presetId -> station name. */
  presetSeats?: Record<string, string>;
}

/** The allocator's rules from a manifest, limited to the stations the map really offers. */
export function seatRulesFrom(m: Pick<ThemeManifest, 'stations' | 'builder'>, available?: string[]): SeatRules {
  const has = (n: string) => !available || available.some((a) => a.toLowerCase() === n.toLowerCase());
  const order = m.stations.seatOrder.filter(has);
  const presetSeats: Record<string, string> = {};
  for (const p of m.builder?.presets ?? []) if (p.seat && has(p.seat)) presetSeats[p.id] = p.seat;
  return { order, captain: m.stations.captain && has(m.stations.captain) ? m.stations.captain : null, presetSeats };
}

export class SeatAllocator {
  private readonly order: string[];
  private readonly captain: string | null;
  private readonly presetSeats: Record<string, string>;
  private readonly agents = new Map<string, SeatAgent>();
  /** station -> agent id */
  private readonly holder = new Map<string, string>();
  /** agent id -> station */
  private readonly seatOf = new Map<string, string>();
  /** Agents without a station, in join order. */
  private readonly waiting: string[] = [];
  /** agent id -> when it sat down (a counter): the longest-seated moves up first. */
  private readonly since = new Map<string, number>();
  private clock = 0;

  constructor(rules: SeatRules) {
    this.order = [...rules.order];
    this.captain = rules.captain && this.order.includes(rules.captain) ? rules.captain : null;
    this.presetSeats = {};
    for (const [p, s] of Object.entries(rules.presetSeats ?? {})) if (this.order.includes(s) && s !== this.captain) this.presetSeats[p] = s;
  }

  seat(agentId: string): string | null { return this.seatOf.get(agentId) ?? null; }

  /** Station -> agent id, for every held station. */
  snapshot(): Record<string, string> { return Object.fromEntries(this.holder); }

  /** The station an agent's preset gives it, if any. */
  private affinity(a: SeatAgent): string | null {
    return a.presetId ? this.presetSeats[a.presetId] ?? null : null;
  }

  /** The first free station in the order an agent may take (the captain's only for the orchestrator). */
  private firstFree(a: SeatAgent): string | null {
    if (a.orchestrator && this.captain && !this.holder.has(this.captain)) return this.captain;
    for (const s of this.order) if (s !== this.captain && !this.holder.has(s)) return s;
    return null;
  }

  private put(id: string, to: string | null, out: SeatChange[]): void {
    const from = this.seatOf.get(id) ?? null;
    if (from === to) { if (!to && !this.waiting.includes(id)) this.waiting.push(id); return; }
    if (from) { this.holder.delete(from); this.seatOf.delete(id); }
    const w = this.waiting.indexOf(id);
    if (to) { this.holder.set(to, id); this.seatOf.set(id, to); this.since.set(id, ++this.clock); if (w >= 0) this.waiting.splice(w, 1); }
    else if (w < 0) this.waiting.push(id);
    out.push({ agentId: id, from, to });
  }

  /** An agent arrives (or its preset/role changed): give it a station. A seated
   *  agent whose preset changes AWAY from its station keeps it: a same-preset
   *  agent in an ordinary chair moves up only once that station frees (refill),
   *  never by displacing a holder that is already sitting there. */
  join(a: SeatAgent): SeatChange[] {
    const out: SeatChange[] = [];
    const known = this.agents.has(a.id);
    this.agents.set(a.id, { ...a });
    if (known && this.seatOf.has(a.id)) {
      // already seated: only a better claim (captain or affinity) moves it
      const cur = this.seatOf.get(a.id)!;
      const want = a.orchestrator && this.captain ? this.captain : this.affinity(a);
      if (!want || want === cur) return out;
      if (want === this.captain && !this.holder.has(want)) { this.put(a.id, want, out); this.refill(out); return out; }
      if (want !== this.captain && this.claimAffinity(a, want, out)) { this.refill(out); return out; }
      return out;
    }
    if (a.orchestrator && this.captain && !this.holder.has(this.captain)) { this.put(a.id, this.captain, out); return out; }
    const aff = this.affinity(a);
    if (aff && this.claimAffinity(a, aff, out)) return out;
    this.put(a.id, this.firstFree({ ...a, orchestrator: false }), out);
    return out;
  }

  /** Take `seat` for `a`, moving a generic holder to the next free station. False
   *  when an agent with the same claim already holds it. */
  private claimAffinity(a: SeatAgent, seat: string, out: SeatChange[]): boolean {
    const cur = this.holder.get(seat);
    if (cur && cur !== a.id) {
      const h = this.agents.get(cur)!;
      if (this.affinity(h) === seat) return false; // the seat's own preset got there first
      this.holder.delete(seat); this.seatOf.delete(cur); // vacate, then place the displaced agent after the claimant
      this.put(a.id, seat, out);
      const to = this.firstFree({ ...h, orchestrator: false });
      if (to) { this.holder.set(to, cur); this.seatOf.set(cur, to); this.since.set(cur, ++this.clock); } else this.waiting.push(cur);
      out.push({ agentId: cur, from: seat, to });
      return true;
    }
    if (!cur) this.put(a.id, seat, out);
    return true;
  }

  /** An agent leaves: its station goes to whoever waits for it. */
  leave(agentId: string): SeatChange[] {
    const out: SeatChange[] = [];
    if (!this.agents.has(agentId)) return out;
    const from = this.seatOf.get(agentId) ?? null;
    if (from) { this.holder.delete(from); this.seatOf.delete(agentId); }
    const w = this.waiting.indexOf(agentId);
    if (w >= 0) this.waiting.splice(w, 1);
    this.agents.delete(agentId);
    this.since.delete(agentId);
    out.push({ agentId, from, to: null });
    this.refill(out);
    return out;
  }

  /** Free stations go to waiting agents: affinity and captain claims first. A
   *  preset station still free then goes to an agent of that preset seated
   *  elsewhere (the longest-seated moves up and walks there), and every chair
   *  left free goes to the rest in join order. */
  private refill(out: SeatChange[]): void {
    for (const id of [...this.waiting]) {
      const a = this.agents.get(id)!;
      const aff = this.affinity(a);
      if (a.orchestrator && this.captain && !this.holder.has(this.captain)) this.put(id, this.captain, out);
      else if (aff && !this.holder.has(aff)) this.put(id, aff, out);
    }
    for (const seat of new Set(Object.values(this.presetSeats))) {
      if (this.holder.has(seat)) continue;
      let best: string | null = null;
      for (const [id, at] of this.seatOf) {
        if (at === seat || at === this.captain || this.affinity(this.agents.get(id)!) !== seat) continue;
        if (best === null || this.since.get(id)! < this.since.get(best)!) best = id;
      }
      if (best) this.put(best, seat, out);
    }
    for (const id of [...this.waiting]) {
      const to = this.firstFree({ ...this.agents.get(id)!, orchestrator: false });
      if (!to) break;
      this.put(id, to, out);
    }
  }
}

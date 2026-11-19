// Ported from Prozzta/guppyos 02d0d50b (MIT).
// What the stations floor shows of the crew's coffee (COFFEE-NEVER-186). The crew model
// (crew.ts) has run coffee since 1.1.85, but the floor drew only the people, so a coffee run
// looked like a wander stop. The bridge viewer's draw half, as data: a mug in the hand
// while one is carried, a mug parked at a station, and a short line while brewing (a refill
// when they brought their own mug) and when the sip starts. Pure: it reads the crew and
// returns props; the scene draws them, the tests check them.

import type { Crew, Walker } from './crew';
import type { Facing } from './manifest';
import type { Pixels } from './raster';
import type { LinePicker } from './packLines';

/** The viewer's bubble lines (bridge-viewer.html LINES). */
export const COFFEE_LINES = {
  coffee: ['mmm, fresh one ☕', 'the good beans today', 'just one more cup', 'replicator never gets it right…'],
  brewing: ['brewing a fresh one ☕'],
  refill: ['a quick refill ☕'],
} as const;

/** How long the sip line shows after the sip starts, ms (the viewer's 3000). */
export const SIP_LINE_MS = 3000;
/** How long a brew takes, ms (crew.ts coffeeStep: brewing ends after 2600 ms). */
export const BREW_MS = 2600;

export type CoffeeProp =
  /** A mug in the hand of a standing or walking agent, at its feet position. */
  | { kind: 'cup'; id: string; x: number; y: number; dir: Facing }
  /** A mug parked at a station: `full` while it still steams. */
  | { kind: 'mug'; owner: string; x: number; y: number; full: boolean }
  /** A line over an agent's head: `key` names this coffee state (said once per key), `ttl` is what is left of it, ms. */
  | { kind: 'say'; id: string; text: string; key: string; ttl: number };

/** A stable pick, so a line does not change from frame to frame. */
function pick(lines: readonly string[], key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return lines[Math.abs(h) % lines.length];
}

/** Each coffee run's brew start (ms, crew clock), fixed when first seen: one brew line per run even once its brew event has scrolled out of crew.events. */
const brewStarts = new WeakMap<object, number>();
function brewStart(run: { t: number }, now: number): number {
  let at = brewStarts.get(run);
  if (at === undefined) brewStarts.set(run, (at = Math.round(now - run.t)));
  return at;
}

/** The coffee props for the crew as it stands now. `line` picks from the pack's own coffee lines (TES-BUBBLES-188). */
export function coffeeProps(crew: Pick<Crew, 'walkers' | 'mugAt' | 'events' | 't'>, line?: LinePicker): CoffeeProp[] {
  const out: CoffeeProp[] = [];
  const sipAt = new Map<string, number>();
  for (const e of crew.events) if (e.kind === 'sip') sipAt.set(e.id, e.at);
  for (const p of crew.walkers() as Walker[]) {
    if (p.mug) {
      const [x, y] = crew.mugAt(p.mug);
      out.push({ kind: 'mug', owner: p.id, x, y, full: crew.t < p.mug.full });
    }
    // Seated, a mug in hand is parked at once (crew.sitDown); a sitter holds none.
    if (p.cup && !p.seated) out.push({ kind: 'cup', id: p.id, x: p.x, y: p.y, dir: p.dir });
    if (p.coffee?.phase === 'brewing') {
      const key = `brew:${p.id}:${brewStart(p.coffee, crew.t)}`;
      out.push({ kind: 'say', id: p.id, text: line?.([p.cup ? 'refill' : 'brewing'], p.id) ?? pick(p.cup ? COFFEE_LINES.refill : COFFEE_LINES.brewing, p.id), key, ttl: Math.max(0, BREW_MS - p.coffee.t) });
      continue;
    }
    const at = sipAt.get(p.id);
    const sipping = p.coffee?.phase === 'sipping' || (p.homeSit && p.sip > 0);
    if (at !== undefined && sipping && crew.t - at < SIP_LINE_MS) {
      out.push({ kind: 'say', id: p.id, text: line?.(['coffee'], `${p.id}@${at}`) ?? pick(COFFEE_LINES.coffee, `${p.id}@${at}`), key: `sip:${p.id}:${at}`, ttl: SIP_LINE_MS - (crew.t - at) });
    }
  }
  return out;
}

/** The say props not yet said (one per coffee state, by key); `said` (agent id to key) is updated. */
export function freshSays(props: readonly CoffeeProp[], said: Map<string, string>): Array<Extract<CoffeeProp, { kind: 'say' }>> {
  const out: Array<Extract<CoffeeProp, { kind: 'say' }>> = [];
  for (const p of props) if (p.kind === 'say' && said.get(p.id) !== p.key) { said.set(p.id, p.key); out.push(p); }
  return out;
}

/** The coffee lines whose run has ended: said (in `said`) but no longer a say prop, as [id, key];
 *  they are forgotten in `said`. The floor takes them off at once, so a run cut short (back to work,
 *  or the heavy lock) does not keep "brewing…" over the cloud for the rest of its ttl (Jim NIT 1). */
export function endedSays(props: readonly CoffeeProp[], said: Map<string, string>): Array<[string, string]> {
  const live = new Set<string>();
  for (const p of props) if (p.kind === 'say') live.add(p.key);
  const out: Array<[string, string]> = [];
  for (const [id, key] of said) if (!live.has(key)) { said.delete(id); out.push([id, key]); }
  return out;
}

/** Forget what was said for agents no longer on the floor (`said` as freshSays keeps it). */
export function pruneSaid(said: Map<string, string>, present: Iterable<string>): void {
  const here = new Set(present);
  for (const id of said.keys()) if (!here.has(id)) said.delete(id);
}

// ---- drawing (bridge-viewer.html paintCup, cupInHand, handsOf, and the parked mug's depth) ----

/** The mug's size with its handle: a 5x4 body and a 1 px handle on one side. */
export const MUG_W = 6, MUG_H = 4;

/**
 * The Office's mug (the viewer's paintCup): white, a yellow stripe, the handle on the right (or the
 * left). Its pixel (0, 0) goes at (x + mugDx(left), y - MUG_H) for a mug whose bottom-left is (x, y).
 */
export function mugPixels(left: boolean): Pixels {
  const data = new Uint8ClampedArray(MUG_W * MUG_H * 4);
  const ox = left ? 1 : 0;
  const put = (x: number, y: number, hex: number) => {
    const i = (y * MUG_W + x + ox) * 4;
    data[i] = hex >> 16; data[i + 1] = (hex >> 8) & 255; data[i + 2] = hex & 255; data[i + 3] = 255;
  };
  for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) put(x, y, 0xf2ede2);
  for (let x = 0; x < 5; x++) put(x, 2, 0xe8c14d);
  for (let x = 0; x < 5; x++) put(x, 0, 0xffffff);
  for (const y of [1, 2]) put(left ? -1 : 5, y, 0xd9d2c4);
  return { width: MUG_W, height: MUG_H, data };
}

/** Where mugPixels(left)'s pixel 0 sits left of the mug's bottom-left corner. */
export function mugDx(left: boolean): number { return left ? -1 : 0; }

/** The mug in the hand: its bottom-left in the frame, the handle side, and whether it is behind the body. */
export interface CupPose { x: number; y: number; left: boolean; back: boolean }

interface Blob { x0: number; x1: number; y0: number; y1: number; n: number }

/**
 * A frame's hand pixels as 4-connected blobs (the viewer's handsOf): skin, i.e. a colour of the head
 * other than its outline, low on the body, below the neck. `sx, sy` is the frame's top-left in `sheet`.
 */
export function handsOf(sheet: Pixels, sx: number, sy: number, fw: number, fh: number): Blob[] {
  const D = sheet.data, at = (x: number, y: number) => ((sy + y) * sheet.width + sx + x) * 4;
  const L = (i: number) => 0.3 * D[i] + 0.59 * D[i + 1] + 0.11 * D[i + 2], K = (i: number) => (D[i] << 16) | (D[i + 1] << 8) | D[i + 2];
  let top = -1, dark = 1e9;
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    const i = at(x, y);
    if (D[i + 3]) { if (top < 0) top = y; dark = Math.min(dark, L(i)); }
  }
  if (top < 0) return [];
  const skin = new Set<number>(), on = new Uint8Array(fw * fh), out: Blob[] = [];
  for (let y = top + 6; y < Math.min(fh, top + 16); y++) for (let x = 0; x < fw; x++) {
    const i = at(x, y);
    if (D[i + 3] && L(i) > dark + 8 && L(i) < 235) skin.add(K(i));
  }
  for (let y = top + 19; y < fh; y++) for (let x = 0; x < fw; x++) {
    const i = at(x, y);
    if (D[i + 3] && skin.has(K(i))) on[y * fw + x] = 1;
  }
  for (let i = 0; i < fw * fh; i++) if (on[i]) {
    const q: Blob = { x0: fw, x1: -1, y0: fh, y1: -1, n: 0 }, st = [i];
    on[i] = 0;
    while (st.length) {
      const j = st.pop()!, x = j % fw, y = (j - x) / fw;
      q.n++; q.x0 = Math.min(q.x0, x); q.x1 = Math.max(q.x1, x); q.y0 = Math.min(q.y0, y); q.y1 = Math.max(q.y1, y);
      for (const n of [x > 0 ? j - 1 : -1, x < fw - 1 ? j + 1 : -1, j - fw, j + fw]) if (n >= 0 && n < fw * fh && on[n]) { on[n] = 0; st.push(n); }
    }
    out.push(q);
  }
  return out;
}

/**
 * The mug in the hand (the viewer's cupInHand), anchored to the hand pixels of the frame, so it
 * follows any character sheet. Facing down: in front at mid-body, the handle in the right hand.
 * Facing away: in the left hand, behind the body. Sideways: just ahead of the hand. Null: no hand found.
 */
export function cupInHand(sheet: Pixels, sx: number, sy: number, fw: number, fh: number, dir: Facing): CupPose | null {
  const h = handsOf(sheet, sx, sy, fw, fh);
  if (!h.length) return null;
  const H = dir === 'down' ? h.reduce((a, q) => (q.x1 > a.x1 ? q : a)) : dir === 'up' ? h.reduce((a, q) => (q.x0 < a.x0 ? q : a)) : h.reduce((a, q) => (q.n > a.n ? q : a));
  const y = H.y0 + 2; // the handle's two rows: the hand's top row and the one above
  return dir === 'down' ? { x: H.x0 - 6, y, left: false, back: false }
    : dir === 'up' ? { x: H.x0 - 4, y, left: false, back: true }
    : dir === 'right' ? { x: H.x1 + 2, y, left: true, back: false }
    : { x: H.x0 - 6, y, left: false, back: false };
}

/**
 * A parked mug's depth (the viewer's rule): it sorts just after the topmost sorted item it stands on
 * (an opaque pixel under its base row), so the console it sits on never hides it; on flat art, by its
 * own base line, before anyone standing there.
 */
export function mugDepth(x: number, y: number, items: ReadonlyArray<{ x: number; y: number; px: Pixels | null; foot: number; rank: number }>): { foot: number; rank: number } {
  let best: { foot: number; rank: number } | null = null;
  for (const it of items) {
    if (!it.px) continue;
    let under = 0;
    for (let dx = 0; dx < 5; dx++) {
      const px = x + dx - it.x, py = y - it.y;
      if (px >= 0 && py >= 0 && px < it.px.width && py < it.px.height && it.px.data[(py * it.px.width + px) * 4 + 3]) under++;
    }
    if (under && (!best || it.foot > best.foot || (it.foot === best.foot && it.rank > best.rank))) best = it;
  }
  return best ? { foot: best.foot, rank: best.rank + 0.25 } : { foot: y, rank: 1e9 - 0.5 };
}

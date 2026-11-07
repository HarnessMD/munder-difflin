// Ported from Prozzta/guppyos 02d0d50b (MIT).
// The stations floor's scene, the pure half (TES-GUPPY-RASTER, TES-FLOOR-EASE-188).
//
// Drawn whole every frame, TES filled its map-sized 'below' and 187 static
// boxes (1.27 M px for 28 k visible pixels): about twice the office's raster
// time, and at a fractional zoom each sprite rounded on its own, so their edges
// seamed. StationFloor composes the scene in map space instead, over the art's
// bounds (sceneBounds) at an integer scale k (sceneScale), and shows it with one
// quad through the camera:
// - a floor texture holds 'below' and every static, in their own order; it is
//   redrawn only when k changes;
// - each frame, over it and in depth order with the people, their cups and the
//   parked mugs, each static with an opaque pixel near one of them, and every
//   later static near those (frontPicker), then 'above'.
// When every pixel of 'below' and the statics is fully opaque or fully
// transparent, and every static is at opacity 1, that is the same picture as
// the full depth sort, texel for texel: per texel the topmost opaque item wins;
// away from people the floor texture holds it, and where a person stands every
// static that can cover them is drawn again in its depth slot. Otherwise
// (partial alpha) the floor draws directly, as before.

import { byDepth } from './compositor';
import type { Pixels } from './raster';

export interface Box { x: number; y: number; w: number; h: number }

/** True when every pixel's alpha is 0 or 255. */
export function binaryAlpha(px: Pixels): boolean {
  for (let i = 3; i < px.data.length; i += 4) { const a = px.data[i]; if (a !== 0 && a !== 255) return false; }
  return true;
}

/** True when any pixel has alpha above 0. */
export function hasVisiblePixel(px: Pixels): boolean {
  for (let i = 3; i < px.data.length; i += 4) if (px.data[i] !== 0) return true;
  return false;
}

/** The cache draws the same picture only for binary alpha at opacity 1. */
export function staticsCacheable(plan: { below: Pixels; sorted: Array<{ px?: Pixels | null; opacity: number }> }): boolean {
  return binaryAlpha(plan.below) && plan.sorted.every((it) => !it.px || (it.opacity === 1 && binaryAlpha(it.px)));
}

/** The statics' draw order on their own: the order a full depth sort gives them
 *  among themselves (byDepth, stable, as the floor sorts them with the people). */
export function staticOrder(sorted: Array<{ foot: number; rank: number }>): number[] {
  return sorted.map((it, i) => ({ foot: it.foot, rank: it.rank, i })).sort(byDepth).map((it) => it.i);
}

/** The grid that decides which statics are drawn again over the floor texture, in map px. */
export const NEAR_CELL = 12;
/** Which statics to draw again over the floor texture, given the boxes of the
 *  people (and their cups and mugs): those with an opaque pixel near one, and,
 *  closed in draw order, every later static with an opaque pixel near one of
 *  those (else a static drawn again would cover, away from the person, a later
 *  one). "Near" is the same or a neighbouring NEAR_CELL cell, a margin far
 *  wider than a person's half-texel rounding at the scene's scale.
 *  Boxes would do, but TES stacks big, mostly transparent rail boxes, and box
 *  overlap chained most statics together. */
export function frontPicker(statics: Array<{ px?: Pixels | null; x: number; y: number }>, order: number[], mapW: number, mapH: number): (people: Box[]) => boolean[] {
  const C = NEAR_CELL, cols = Math.ceil(mapW / C) + 2, rows = Math.ceil(mapH / C) + 2;
  // Cells are offset by one so a static or person one cell off the map still fits.
  const cell = (x: number, y: number) => (Math.min(rows - 1, Math.max(0, Math.floor(y / C) + 1))) * cols + Math.min(cols - 1, Math.max(0, Math.floor(x / C) + 1));
  const own: number[][] = statics.map((it) => {
    const out = new Set<number>();
    if (it.px) for (let y = 0; y < it.px.height; y++) for (let x = 0; x < it.px.width; x++) {
      if (it.px.data[(y * it.px.width + x) * 4 + 3] !== 0) out.add(cell(it.x + x, it.y + y));
    }
    return [...out];
  });
  const near = own.map((cs) => {
    const out = new Set<number>();
    for (const c of cs) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cy = Math.floor(c / cols) + dy, cx = (c % cols) + dx;
      if (cy >= 0 && cy < rows && cx >= 0 && cx < cols) out.add(cy * cols + cx);
    }
    return out;
  });
  // later[i]: the statics after i in draw order with an opaque pixel near one of i's.
  const rank = new Map<number, number>();
  order.forEach((i, k) => rank.set(i, k));
  const holders = new Map<number, number[]>();
  own.forEach((cs, i) => { for (const c of cs) { let h = holders.get(c); if (!h) holders.set(c, (h = [])); h.push(i); } });
  const later = near.map((cs, i) => {
    const out = new Set<number>();
    for (const c of cs) for (const j of holders.get(c) ?? []) if (j !== i && rank.get(j)! > rank.get(i)!) out.add(j);
    return [...out];
  });
  return (people) => {
    const on = statics.map(() => false);
    const at = new Set<number>();
    for (const q of people) {
      for (let y = q.y; y < q.y + q.h + C; y += C) for (let x = q.x; x < q.x + q.w + C; x += C) at.add(cell(Math.min(x, q.x + q.w - 1e-9), Math.min(y, q.y + q.h - 1e-9)));
    }
    for (const i of order) {
      if (!on[i] && own[i].length && [...near[i]].some((c) => at.has(c))) on[i] = true;
      if (on[i]) for (const j of later[i]) on[j] = true;
    }
    return on;
  };
}

/** TES-FLOOR-WHOLE-188: frontPicker for a floor drawn at a whole number of device px per map px
 *  on whole device px (Camera's whole mode), where a static drawn again lands exactly on its
 *  pixels in the floor texture: no rounding to allow for, so no margin. Those with an opaque pixel
 *  inside a person's (cup's, mug's) box and, closed in draw order, every later static sharing an
 *  opaque pixel with one of those (drawing one again covers nothing else). frontPicker's cells
 *  and their neighbours chained most of TES's rim and rails to every person: 56 of 187 statics
 *  drawn again per person on average, a draw call per 16 textures, and the fill of each. */
export function exactPicker(statics: Array<{ px?: Pixels | null; x: number; y: number }>, order: number[], mapW: number, mapH: number): (people: Box[]) => boolean[] {
  // Each static's opaque pixels as map px indices, and its box (statics sit on whole map px).
  const pts: Int32Array[] = statics.map((it) => {
    const out: number[] = [];
    if (it.px) {
      const ox = Math.round(it.x), oy = Math.round(it.y);
      for (let y = 0; y < it.px.height; y++) for (let x = 0; x < it.px.width; x++) {
        const mx = ox + x, my = oy + y;
        if (it.px.data[(y * it.px.width + x) * 4 + 3] !== 0 && mx >= 0 && my >= 0 && mx < mapW && my < mapH) out.push(my * mapW + mx);
      }
    }
    return Int32Array.from(out);
  });
  const box = statics.map((it) => (it.px ? { x0: Math.round(it.x), y0: Math.round(it.y), x1: Math.round(it.x) + it.px.width, y1: Math.round(it.y) + it.px.height } : null));
  const rank = new Int32Array(statics.length);
  order.forEach((i, k) => { rank[i] = k; });
  // later[i]: the statics after i in draw order sharing an opaque pixel with it.
  const holders = new Map<number, number[]>();
  pts.forEach((p, i) => { for (const q of p) { let h = holders.get(q); if (!h) holders.set(q, (h = [])); h.push(i); } });
  const later: Set<number>[] = statics.map(() => new Set<number>());
  for (const h of holders.values()) if (h.length > 1) for (const i of h) for (const j of h) if (rank[j] > rank[i]) later[i].add(j);
  // Each static's opaque pixels counted over every rect from its corner (a summed-area table), so
  // a person's box is asked in four reads per static, every tick: scanning the box instead cost the
  // renderer about 1 point of CPU at DPR 1 (a person in a large, mostly clear static read it whole).
  const sat: Array<Int32Array | null> = statics.map((it) => {
    if (!it.px) return null;
    const w = it.px.width, h = it.px.height, t = new Int32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        if (it.px.data[(y * w + x) * 4 + 3] !== 0) row++;
        t[(y + 1) * (w + 1) + x + 1] = t[y * (w + 1) + x + 1] + row;
      }
    }
    return t;
  });
  const hit = (i: number, q: Box) => {
    const b = box[i]!;
    const x0 = Math.max(b.x0, Math.floor(q.x)), y0 = Math.max(b.y0, Math.floor(q.y));
    const x1 = Math.min(b.x1, Math.ceil(q.x + q.w)), y1 = Math.min(b.y1, Math.ceil(q.y + q.h));
    if (x0 >= x1 || y0 >= y1) return false;
    const t = sat[i]!, W = b.x1 - b.x0 + 1;
    const ax = x0 - b.x0, ay = y0 - b.y0, bx = x1 - b.x0, by = y1 - b.y0;
    return t[by * W + bx] - t[ay * W + bx] - t[by * W + ax] + t[ay * W + ax] > 0;
  };
  return (people) => {
    const on = statics.map(() => false);
    for (const i of order) {
      if (!on[i] && box[i] && people.some((q) => hit(i, q))) on[i] = true;
      if (on[i]) for (const j of later[i]) on[j] = true;
    }
    return on;
  };
}

/** The map-px box holding every opaque pixel of 'below', 'above' and the statics (null: none).
 *  The floor scene is composed over just this box: TES's art is 288x384 of its 960x640 map. */
export function sceneBounds(plan: { below: Pixels; above: Pixels; sorted: Array<{ px?: Pixels | null; x: number; y: number }> }): Box | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (px: Pixels, ox: number, oy: number) => {
    for (let y = 0; y < px.height; y++) for (let x = 0; x < px.width; x++) {
      if (px.data[(y * px.width + x) * 4 + 3] === 0) continue;
      if (ox + x < x0) x0 = ox + x;
      if (ox + x + 1 > x1) x1 = ox + x + 1;
      if (oy + y < y0) y0 = oy + y;
      if (oy + y + 1 > y1) y1 = oy + y + 1;
    }
  };
  add(plan.below, 0, 0);
  add(plan.above, 0, 0);
  for (const it of plan.sorted) if (it.px) add(it.px, it.x, it.y);
  return x1 > x0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

/** The largest side of a scene render texture, in texels (WebGL 2 guarantees 2048; desktop GPUs give 8192 or more). */
export const SCENE_MAX_TEXELS = 4096;

/** The scene's integer scale k, texels per map px, for `deviceScale` device px per map px: the
 *  smallest integer at or above it (so the one resample to the screen never magnifies), within
 *  SCENE_MAX_TEXELS. A k off the device scale changes only how fine the scene is: it is still one
 *  uniform resample. */
export function sceneScale(deviceScale: number, b: Box, maxTexels = SCENE_MAX_TEXELS): number {
  const want = Math.max(1, Math.ceil(deviceScale - 1e-9));
  return Math.max(1, Math.min(want, Math.floor(maxTexels / Math.max(b.w, b.h))));
}

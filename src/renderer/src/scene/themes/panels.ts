// Ported from Prozzta/guppyos 02d0d50b (MIT).
// PANEL-BLINK-188: the bridge's chair panels, ported from the bridge viewer (HUMAN TEST 3,
// bridge-viewer.html: the panel parse in analyse(), panelLights, panelStates, paintPanels).
// Shapes named ...Panel in the stations layer (or a "points" layer) each go with the nearest seat;
// their lights are recoloured while drawing: working blinks green, idle is a steady dim amber,
// empty is dark. The map's art is not changed. Pure: the floor (PanelLayer.ts) only draws this.

import type { ObjectLayer } from './tiled';
import { blank, type Pixels } from './raster';
import { worldShape, inside, shapePoints, type WorldShape } from './geometry';
import type { ScenePlan } from './compositor';
import { staticOrder } from './staticCache';
import { workingBlinks } from '@shared/activityView';
import type { Station, StationMap } from './stationMap';

/** The viewer's working cycle, one step per PANEL_STEP_MS, each light offset by its own phase. */
export const PANEL_GREEN = ['#a6ffb8', '#5cf07f', '#5cf07f', '#2fbf55', '#17602c'] as const;
export const PANEL_IDLE = '#9a6a1e';
export const PANEL_EMPTY = '#2a2e38';
export const PANEL_STEP_MS = 240;

export type PanelState = 'working' | 'idle' | 'empty';
/** What draws a light's pixel, as the floor draws it: the flattened layers under or over everyone, or a sorted static. */
export type PanelOwner = 'below' | 'above' | number;

export interface PanelLight { x: number; y: number; h: number; }
/** A panel's lights drawn by one owner, with their box (the overlay sprite's size and place). */
export interface PanelGroup { owner: PanelOwner; x: number; y: number; w: number; h: number; lights: PanelLight[]; }
export interface Panel { name: string; seat: Station; groups: PanelGroup[]; lights: number; }

/** The panel shapes: visible non-point objects named ...panel (any case) in the stations layer, else (the viewer's
 *  `stuff ? stuff.l : pts ? pts.l : null`) in the first "points" layer. */
export function panelShapes(SM: Pick<StationMap, 'roles' | 'stations'>, stationsLayer: string): Array<{ name: string; shape: WorldShape; seat: Station }> {
  const want = stationsLayer.trim().toLowerCase();
  const objs = SM.roles.filter((x) => x.l.kind === 'object');
  const hit = objs.find((x) => x.l.name.trim().toLowerCase() === want) ?? objs.find((x) => x.r === 'points');
  const out: Array<{ name: string; shape: WorldShape; seat: Station }> = [];
  if (!SM.stations.length || !hit) return out;
  const l = hit.l as ObjectLayer;
  for (const o of l.objects) {
    if (!o.visible || o.shape === 'point' || !/panel/i.test(o.name || '')) continue;
    const s = worldShape(o, 0, 0, l), [bx0, by0, bx1, by1] = shapeBox(s);
    // the viewer's rule: the seat nearest the shape's box
    let seat = SM.stations[0], bd = Infinity;
    for (const t of SM.stations) {
      const d = Math.hypot(Math.max(bx0 - t.x, 0, t.x - bx1), Math.max(by0 - t.y, 0, t.y - by1));
      if (d < bd) { bd = d; seat = t; }
    }
    out.push({ name: o.name, shape: s, seat });
  }
  return out;
}

function shapeBox(s: WorldShape): [number, number, number, number] {
  const P = shapePoints(s);
  const xs = P ? P.map((q) => q[0]) : [s.x, s.x + s.w], ys = P ? P.map((q) => q[1]) : [s.y, s.y + s.h];
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

interface Px { x: number; y: number; i: number; owner: PanelOwner; c: number; lum: number; }

/** A panel's lights (the viewer's panelLights): the pixels inside its shape, on whatever the floor draws on
 *  top there. A tiny panel is all light; else its small spots of one colour (at most 5 pixels: an LED, a
 *  cross); else its bright pixels. */
export function panelLights(plan: ScenePlan, shape: WorldShape): Array<{ x: number; y: number; owner: PanelOwner }> {
  const PW = plan.below.width, PH = plan.below.height;
  const [bx0, by0, bx1, by1] = shapeBox(shape);
  const x0 = Math.max(0, Math.floor(bx0)), x1 = Math.min(PW, Math.ceil(bx1)), y0 = Math.max(0, Math.floor(by0)), y1 = Math.min(PH, Math.ceil(by1));
  // what is drawn there, top first: the layers over everyone, the statics from the front, the layers under everyone
  const order = staticOrder(plan.sorted).reverse().filter((i) => {
    const it = plan.sorted[i], p = it.px;
    return !!p && it.opacity > 0 && it.x < x1 && it.x + p.width > x0 && it.y < y1 && it.y + p.height > y0;
  });
  const at = (p: Pixels, x: number, y: number): number => (x >= 0 && y >= 0 && x < p.width && y < p.height ? (y * p.width + x) * 4 : -1);
  const px: Px[] = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (!inside(shape, x + 0.5, y + 0.5)) continue;
    let owner: PanelOwner | null = null, d: Uint8ClampedArray | Uint8Array | null = null, k = -1;
    k = at(plan.above, x, y);
    if (k >= 0 && plan.above.data[k + 3]) { owner = 'above'; d = plan.above.data; }
    if (owner === null) for (const i of order) {
      const it = plan.sorted[i], p = it.px!, q = at(p, x - it.x, y - it.y);
      if (q >= 0 && p.data[q + 3]) { owner = i; d = p.data; k = q; break; }
    }
    if (owner === null) { k = at(plan.below, x, y); if (k >= 0 && plan.below.data[k + 3]) { owner = 'below'; d = plan.below.data; } }
    if (owner === null || !d) continue;
    px.push({ x, y, i: y * PW + x, owner, c: (d[k] << 16) | (d[k + 1] << 8) | d[k + 2], lum: 0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2] });
  }
  const pick = (q: Px) => ({ x: q.x, y: q.y, owner: q.owner });
  if (px.length <= 25) return px.map(pick);
  const byI = new Map(px.map((q) => [q.i, q])), seen = new Set<number>();
  let lights: Px[] = [];
  for (const q of px) {
    if (seen.has(q.i)) continue;
    const comp = [q], st = [q];
    seen.add(q.i);
    while (st.length) {
      const a = st.pop()!;
      for (const n of [a.i - 1, a.i + 1, a.i - PW, a.i + PW]) {
        const b = byI.get(n);
        if (b && !seen.has(n) && b.c === a.c && Math.abs(b.x - a.x) <= 1) { seen.add(n); comp.push(b); st.push(b); }
      }
    }
    if (comp.length <= 5) lights.push(...comp);
  }
  if (!lights.length && px.length) {
    const m = [...px].sort((a, b) => a.lum - b.lum)[px.length >> 1].lum;
    lights = px.filter((q) => q.lum > m + 20);
  }
  return lights.map(pick);
}

/** Every panel of the map with its lights, grouped by what draws them. Computed once per pack. */
export function findPanels(SM: Pick<StationMap, 'roles' | 'stations'>, stationsLayer: string, plan: ScenePlan): Panel[] {
  return panelShapes(SM, stationsLayer).map(({ name, shape, seat }) => {
    const groups = new Map<PanelOwner, PanelLight[]>();
    let n = 0;
    for (const q of panelLights(plan, shape)) {
      if (!groups.has(q.owner)) groups.set(q.owner, []);
      groups.get(q.owner)!.push({ x: q.x, y: q.y, h: (q.x * 7 + q.y * 13) % 5 });
      n++;
    }
    return {
      name, seat, lights: n,
      groups: [...groups].map(([owner, lights]) => {
        const xs = lights.map((q) => q.x), ys = lights.map((q) => q.y), x = Math.min(...xs), y = Math.min(...ys);
        return { owner, x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1, lights };
      }),
    };
  });
}

/** The viewer's panelStates: working when its seat's sitter is seated and working (workingBlinks, the cards' own
 *  rule: a seated agent waiting, compacting or looping holds amber); idle when someone holds the seat (seated
 *  otherwise, or on the way to it), or it is the last seat of someone now idle with none; else empty. Writes into `out`. */
export function panelStates(panels: readonly Panel[], walkers: ReadonlyArray<{ seat: Station | null; lastSeat: Station | null; seated: boolean; status: string }>, out: PanelState[] = []): PanelState[] {
  out.length = panels.length;
  for (let k = 0; k < panels.length; k++) {
    const seat = panels[k].seat;
    let st: PanelState = 'empty';
    for (const p of walkers) {
      if (p.seat === seat && p.seated && workingBlinks(p.status)) { st = 'working'; break; }
      if (p.seat === seat || (!p.seat && p.status === 'idle' && p.lastSeat === seat)) st = 'idle';
    }
    out[k] = st;
  }
  return out;
}

/** The frame a panel shows: one of the 5 working phases, or its steady idle / empty colour. */
export type PanelFrame = 0 | 1 | 2 | 3 | 4 | 'idle' | 'empty';
export function panelFrame(state: PanelState, clock: number): PanelFrame {
  return state === 'working' ? (Math.floor(clock / PANEL_STEP_MS) % 5) as PanelFrame : state;
}

/** A light's colour in a frame (paintPanels). */
export function lightColour(frame: PanelFrame, h: number): string {
  return frame === 'idle' ? PANEL_IDLE : frame === 'empty' ? PANEL_EMPTY : PANEL_GREEN[(frame + h) % 5];
}

/** One group's overlay for a frame: its box, the lights opaque in their colours, the rest clear. Rastered once per
 *  group and frame (7 at most), then only swapped. */
export function groupPixels(g: PanelGroup, frame: PanelFrame): Pixels {
  const p = blank(g.w, g.h);
  for (const q of g.lights) {
    const c = lightColour(frame, q.h), k = ((q.y - g.y) * g.w + (q.x - g.x)) * 4;
    p.data[k] = parseInt(c.slice(1, 3), 16); p.data[k + 1] = parseInt(c.slice(3, 5), 16); p.data[k + 2] = parseInt(c.slice(5, 7), 16); p.data[k + 3] = 255;
  }
  return p;
}

// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Depth composition for a stations scene: what is drawn under everyone, what is
// sorted with people by its foot line, and what is drawn over everyone.
//
// A port of the bridge viewer's renderWorld / rowPieces / chairOf / seatPose
// (the audited oracle). Pure: it produces RGBA buffers and sort keys; the Pixi
// scene uploads the buffers and orders sprites by (foot, rank).

import { GID_MASK, tileFor, objBox, type MapLayer, type NormalizedMap, type ObjBox, type ObjectLayer, type TileLayer, type TiledObject } from './tiled';
import { blank, drawObject, drawTile, drawTileLayer, tileCellBox, type Pixels, type PixelStore } from './raster';
import { objCorners } from './geometry';
import type { Facing } from './manifest';

const SPECIAL = ['collision', 'collision-shapes', 'stations', 'points', 'zones'];

function roleOf(l: MapLayer): string {
  const n = l.name.toLowerCase();
  if (l.kind === 'image') return 'image';
  if (SPECIAL.includes(n)) return n;
  if (n.startsWith('below')) return 'below';
  if (n.startsWith('above')) return 'above';
  if (n.startsWith('props')) return 'sort';
  return l.kind === 'tile' ? 'below' : 'sort-unknown';
}

export interface RowPiece { foot: number; x: number; y: number; px: Pixels; }

export interface RowPieces {
  /** What people stand on (stairs, steps): drawn under everyone. */
  floor: Pixels;
  pieces: RowPiece[];
  /** Per map pixel: the foot line of the standing piece it belongs to, else -1. */
  footAt: Int32Array;
  isFloor: Uint8Array;
  /** The mask the pieces were judged against (a cache key). */
  solid: Uint16Array | null;
}

/** What rowPieces needs from the map analysis. */
export interface RowContext {
  M: NormalizedMap;
  store: PixelStore;
  PW: number;
  PH: number;
  solidBase: Uint16Array | null;
  flatLayers: Set<ObjectLayer>;
  rowPieceCache: Map<TileLayer, RowPieces>;
}

/** Alpha of the flat object layers stacked above tile layer `l` (Tiled draws them on top of it). */
export function flatCover(C: RowContext, l: TileLayer): Uint8Array {
  const { M, PW, PH } = C, li = M.layers.indexOf(l), a = new Uint8Array(PW * PH);
  M.layers.forEach((f, fi) => {
    if (fi <= li || !f.visible || f.kind !== 'object' || !C.flatLayers.has(f)) return;
    for (const o of f.objects) if (o.gid && o.visible) {
      const p = blank(PW, PH); drawObject(p, C.store, M, f, o, 1);
      for (let i = 0; i < a.length; i++) if (p.data[i * 4 + 3] > a[i]) a[i] = p.data[i * 4 + 3];
    }
  });
  return a;
}

/** A tile layer sorted with people (rails, lower walls, consoles), at pixel level.
 *  Each column of its pixels is cut into solid runs. A run lying wholly on open
 *  floor is something people stand on: it goes under everyone. A run touching
 *  something solid along its length or just under its foot stands up from its
 *  foot: it covers a person only when its foot is further south. */
export function rowPieces(C: RowContext, l: TileLayer): RowPieces {
  const hit = C.rowPieceCache.get(l);
  if (hit && hit.solid === C.solidBase) return hit;
  const { M, PW: W, PH: H } = C;
  const src = blank(W, H);
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const raw = l.data[y * l.w + x];
    if (!(raw & GID_MASK)) continue;
    const T = tileFor(M, raw);
    if (!T) continue;
    const [bx, by, bw, bh] = tileCellBox(M, l, x, y, T);
    drawTile(src, C.store, T, bx, by, bw, bh, 1);
  }
  const d = src.data, floor = blank(W, H), foot = new Int32Array(W * H).fill(-1);
  // a flat layer above it: pixels it hides fully are dropped; pixels it half-hides stay at floor level
  const cover = flatCover(C, l);
  for (let i = 0; i < W * H; i++) if (cover[i] === 255) d[i * 4 + 3] = 0;
  const S = C.solidBase, solidAt = (x: number, y: number) => !!S && y >= 0 && y < H && !!S[y * W + x];
  // each column's runs: a run stands up from its top down to 3 px below its last pixel on something solid
  // (all of it when something solid lies just under its foot). No mask: everything stands up from its own foot.
  type Run = { y0: number; y1: number; up: number };
  const cols: Run[][] = Array.from({ length: W }, () => []);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    if (!d[(y * W + x) * 4 + 3]) continue;
    let y1 = y;
    while (y1 + 1 < H && d[((y1 + 1) * W + x) * 4 + 3]) y1++;
    let last = -1, under = false;
    for (let k = y; k <= y1; k++) if (solidAt(x, k)) last = k;
    for (let k = y1 + 1; k <= y1 + 3; k++) if (solidAt(x, k)) under = true;
    cols[x].push({ y0: y, y1, up: !S || under ? y1 : last < 0 ? -1 : Math.min(y1, last + 3) });
    y = y1;
  }
  // a floor run hanging from the same top (within 2 px) as a standing run beside it belongs to that piece
  for (let changed = true; changed;) {
    changed = false;
    for (let x = 0; x < W; x++) for (const r of cols[x]) if (r.up < 0) for (const n of [...(cols[x - 1] || []), ...(cols[x + 1] || [])])
      if (n.up >= 0 && Math.abs(n.y0 - r.y0) <= 2 && n.up >= r.y0) { r.up = Math.min(r.y1, n.up); changed = true; break; }
  }
  for (let x = 0; x < W; x++) for (const r of cols[x]) for (let k = r.y0; k <= r.y1; k++) {
    const i = k * W + x;
    if (k <= r.up && !cover[i]) foot[i] = r.up + 1;
    else for (let c4 = 0; c4 < 4; c4++) floor.data[i * 4 + c4] = d[i * 4 + c4];
  }
  const boxes = new Map<number, [number, number, number, number]>();
  for (let i = 0; i < W * H; i++) if (foot[i] >= 0) {
    const x = i % W, y = (i - x) / W, B = boxes.get(foot[i]);
    if (B) { B[0] = Math.min(B[0], x); B[1] = Math.min(B[1], y); B[2] = Math.max(B[2], x); B[3] = Math.max(B[3], y); }
    else boxes.set(foot[i], [x, y, x, y]);
  }
  const pieces: RowPiece[] = [];
  for (const [f, [x0, y0, x1, y1]] of boxes) {
    const w = x1 - x0 + 1, h = y1 - y0 + 1, px = blank(w, h);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (foot[i] !== f) continue;
      const j = ((y - y0) * w + x - x0) * 4;
      for (let c4 = 0; c4 < 4; c4++) px.data[j + c4] = d[i * 4 + c4];
    }
    pieces.push({ foot: f, x: x0, y: y0, px });
  }
  const isFloor = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) isFloor[i] = floor.data[i * 4 + 3] ? 1 : 0;
  const out: RowPieces = { floor, pieces, footAt: foot, isFloor, solid: S };
  C.rowPieceCache.set(l, out);
  return out;
}

/** One tile object drawn alone into its own (rotated) bounding box. */
export function objectSprite(store: PixelStore, M: NormalizedMap, l: ObjectLayer, o: TiledObject, B: ObjBox = objBox(M, o)): RowPiece | null {
  if (!B.T) return null;
  const C = objCorners(o, B, l);
  const x0 = Math.floor(Math.min(...C.map((q) => q[0]))), x1 = Math.ceil(Math.max(...C.map((q) => q[0])));
  const y0 = Math.floor(Math.min(...C.map((q) => q[1]))), y1 = Math.ceil(Math.max(...C.map((q) => q[1])));
  if (x1 <= x0 || y1 <= y0) return null;
  const px = blank(x1 - x0, y1 - y0);
  drawTile(px, store, { ...B.T, d: false }, B.x + l.ox + B.T.ts.offX - x0, B.y + l.oy + B.T.ts.offY - y0, B.w, B.h, 1,
    o.rotation ? { deg: o.rotation, rx: o.x + l.ox - x0, ry: o.y + l.oy - y0 } : undefined);
  return { foot: y1, x: x0, y: y0, px };
}

/** A static thing sorted with people. `chair` is set for tile objects (a seated person sits in the nearest one). */
export interface SortedItem {
  foot: number;
  rank: number;
  x: number;
  y: number;
  px: Pixels | null;
  opacity: number;
  chair?: { x0: number; x1: number; top: number; o: TiledObject; l: ObjectLayer; B: ObjBox };
}

export interface ScenePlan {
  /** Everything drawn under people, flattened into one map-sized buffer. */
  below: Pixels;
  /** Everything drawn over people, flattened. */
  above: Pixels;
  sorted: SortedItem[];
}

export interface PlanContext extends RowContext {
  rowLayers: Set<TileLayer>;
}

/** Bucket every visible layer as Tiled stacks it: below everyone, sorted with
 *  people by foot line (then layer index), or above everyone. Per-object
 *  `depth` (below/above/sort) overrides; `sortOffset` moves a foot line. */
export function buildScenePlan(C: PlanContext): ScenePlan {
  const { M, store, PW, PH } = C;
  const below = blank(PW, PH), above = blank(PW, PH), sorted: SortedItem[] = [];
  M.layers.forEach((l, li) => {
    const r = roleOf(l);
    if (!l.visible || r === 'image' || SPECIAL.includes(r)) return; // image layers are references, not drawn
    if (l.kind === 'tile') {
      if (C.rowLayers.has(l)) {
        const P = rowPieces(C, l);
        compose(below, P.floor, 0, 0, l.opacity);
        for (const q of P.pieces) sorted.push({ foot: q.foot, rank: li, x: q.x, y: q.y, px: q.px, opacity: l.opacity });
      } else drawTileLayer(r === 'above' ? above : below, store, M, l, l.opacity);
      return;
    }
    if (l.kind !== 'object') return;
    const bucket = r === 'below' || C.flatLayers.has(l) ? 'below' : r === 'above' ? 'above' : 'sort';
    const objs = l.objects.filter((o) => o.gid && o.visible);
    const ord = l.order === 'index' ? objs : [...objs].sort((a, b) => a.y - b.y);
    for (const o of ord) {
      const dp = String(o.props.depth || '').toLowerCase();
      const where = dp === 'below' || dp === 'above' || dp === 'sort' ? dp : bucket;
      if (where === 'below') { drawObject(below, store, M, l, o); continue; }
      if (where === 'above') { drawObject(above, store, M, l, o); continue; }
      const B = objBox(M, o), Cn = objCorners(o, B, l), sp = objectSprite(store, M, l, o, B);
      const foot = Math.max(...Cn.map((p) => p[1])) + Number(o.props.sortOffset || 0);
      sorted.push({
        foot, rank: li, x: sp ? sp.x : 0, y: sp ? sp.y : 0, px: sp ? sp.px : null, opacity: l.opacity,
        chair: { x0: Math.min(...Cn.map((p) => p[0])), x1: Math.max(...Cn.map((p) => p[0])), top: B.y + l.oy, o, l, B },
      });
    }
  });
  return { below, above, sorted };
}

/** Source-over `src` onto `dst` at (dx, dy) with an opacity. */
export function compose(dst: Pixels, src: Pixels, dx: number, dy: number, opacity = 1): void {
  for (let y = 0; y < src.height; y++) {
    const Y = y + dy;
    if (Y < 0 || Y >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const X = x + dx;
      if (X < 0 || X >= dst.width) continue;
      const k = (y * src.width + x) * 4, a = src.data[k + 3] * opacity;
      if (a <= 0) continue;
      const j = (Y * dst.width + X) * 4, d = dst.data;
      if (a >= 255 || d[j + 3] === 0) { d[j] = src.data[k]; d[j + 1] = src.data[k + 1]; d[j + 2] = src.data[k + 2]; d[j + 3] = a; continue; }
      const sa = a / 255, da = d[j + 3] / 255, oa = sa + da * (1 - sa);
      for (let c = 0; c < 3; c++) d[j + c] = Math.round((src.data[k + c] * sa + d[j + c] * da * (1 - sa)) / oa);
      d[j + 3] = Math.round(oa * 255);
    }
  }
}

// ───────────────────────── people ─────────────────────────

/** The chair at a seat point: the nearest sorted tile object within 16 px of it
 *  (ties: the one centred nearest the seat). */
export function chairOf(seat: { x: number; y: number }, items: SortedItem[]): SortedItem | null {
  let best: SortedItem | null = null, bd = 16.5;
  for (const it of items) {
    const c = it.chair;
    if (!c) continue;
    const d = Math.hypot(Math.max(c.x0 - seat.x, 0, seat.x - c.x1), Math.max(c.top - seat.y, 0, seat.y - it.foot));
    if (d < bd || (d === bd && best && Math.abs((c.x0 + c.x1) / 2 - seat.x) < Math.abs((best.chair!.x0 + best.chair!.x1) / 2 - seat.x))) { bd = d; best = it; }
  }
  return best;
}

/** A sprite sheet and the frame a seated person uses. */
export interface SitFrame { sheet: Pixels; sx: number; sy: number; fw: number; fh: number; }

/** A side-facing sitter: where the sit frame's left edge goes, relative to the
 *  chair's left edge, so the body's back rests on the backrest (the chair's
 *  highest pixels). null when either picture has no pixels to measure. */
export function sideFit(store: PixelStore, B: ObjBox, frame: SitFrame, dir: 'left' | 'right'): number | null {
  if (!B.T) return null;
  const w = Math.round(B.w), h = Math.round(B.h);
  if (w <= 0 || h <= 0) return null;
  const A = blank(w, h);
  drawTile(A, store, { ...B.T, d: false }, 0, 0, w, h, 1);
  let top = -1;
  for (let y = 0; y < h && top < 0; y++) for (let x = 0; x < w; x++) if (A.data[(y * w + x) * 4 + 3]) { top = y; break; }
  let bx0 = w, bx1 = -1;
  if (top >= 0) for (let x = 0; x < w; x++) if (A.data[(top * w + x) * 4 + 3]) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); }
  const { sheet, sx, sy, fw, fh } = frame;
  let back = dir === 'left' ? -1 : fw; // the body's rearmost pixel below the head (the frame's bottom 10 rows)
  for (let y = Math.max(0, fh - 10); y < fh; y++) for (let x = 0; x < fw; x++) {
    const gx = sx + x, gy = sy + y;
    if (gx < 0 || gy < 0 || gx >= sheet.width || gy >= sheet.height) continue;
    if (sheet.data[(gy * sheet.width + gx) * 4 + 3]) back = dir === 'left' ? Math.max(back, x) : Math.min(back, x);
  }
  return top < 0 || back < 0 || back > fw - 1 ? null : dir === 'left' ? bx0 - back : bx1 - back;
}

export interface SeatPose {
  /** The frame's horizontal centre. */
  x: number;
  /** The frame's top. */
  y: number;
  /** Facing away: drawn just behind the chair (head and shoulders above its back). */
  behind: boolean;
}

/** Where a seated person is drawn: in the chair, by the way they face. `fit` is
 *  sideFit's result for a side-facing sitter, measured from the chair's left
 *  edge to the frame's left edge, so the frame's centre is half a frame width
 *  further on. The vertical offsets are the oracle's for a 32 px frame, scaled
 *  to the sheet's frame height. */
export function seatPose(chair: SortedItem, dir: Facing, fw: number, fh: number, fit: number | null): SeatPose {
  const c = chair.chair!, top = c.top, cx = (c.x0 + c.x1) / 2, k = fh / 32;
  if (dir === 'up') return { x: cx, y: top - 16 * k, behind: true };
  if (dir === 'left' || dir === 'right') return { x: fit == null ? cx + (dir === 'left' ? -2 : 2) : c.x0 + fit + fw / 2, y: top - 8 * k, behind: false };
  return { x: cx, y: top - 6 * k, behind: false };
}

/** The sort key of a person: seated, just above (or, facing away, just below)
 *  their chair, so what stands in front of the chair covers them; standing, by
 *  their feet, after everything on the same foot line. */
export function personKey(y: number, chair: SortedItem | null, pose: SeatPose | null): { foot: number; rank: number } {
  return chair && pose ? { foot: chair.foot, rank: chair.rank + (pose.behind ? -0.5 : 0.5) } : { foot: y, rank: 1e9 };
}

/** A person at their OWN side-facing seat's approach spot where that spot lies in the chair's art (level with
 *  the seat, behind its backrest: TES Chair3-6): drawn just in front of that chair, as the seat step draws them,
 *  not behind the backrest for the frames before and after the step. Seats facing up or down keep plain depth
 *  (there the spot is truly in front of or behind the chair). Only on the spot (as Crew's atApproach), or within `step` px of
 *  it while arriving (its path ends there); anywhere else (walking past behind the chair, leaving the spot)
 *  null, so plain depth. */
export function ownChairKey(p: { x: number; y: number; path: ReadonlyArray<readonly [number, number]> }, facing: Facing, chair: SortedItem | null, spot: readonly [number, number] | null | undefined, step: number): { foot: number; rank: number } | null {
  const c = chair?.chair;
  if (!c || !spot || (facing !== 'left' && facing !== 'right')) return null;
  const [ax, ay] = spot;
  if (!(ax >= c.x0 && ax <= c.x1 && ay >= c.top && ay <= chair!.foot)) return null;
  const d = Math.hypot(p.x - ax, p.y - ay), end = p.path[p.path.length - 1];
  const arriving = !!end && Math.hypot(end[0] - ax, end[1] - ay) < 0.5;
  return d < 0.5 || (arriving && d <= step) ? { foot: chair!.foot, rank: chair!.rank + 0.5 } : null;
}

/** Draw order: foot line, then Tiled's layer order (people last on a tie). */
export function byDepth<T extends { foot: number; rank: number }>(a: T, b: T): number {
  return a.foot - b.foot || a.rank - b.rank;
}

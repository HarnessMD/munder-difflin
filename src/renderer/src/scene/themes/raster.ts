// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Pixel rasterizer for normalized Tiled maps, in plain TypeScript.
//
// The bridge viewer decides walls, rails and depth from the PIXELS a layer
// draws (a wall blocks where its art is solid, a rail stands up from its own
// foot line). The app must reach the same answers in the renderer and in
// node:test, so drawing is done here into RGBA buffers rather than through a
// canvas: nearest-pixel sampling with Tiled's flip semantics, source-over
// blending, layer opacity. The scene uploads the finished buffers as textures.

import { GID_MASK, tileFor, objBox, type NormalizedMap, type ResolvedTile, type TileLayer, type ObjectLayer, type TiledObject } from './tiled';

/** An RGBA image (like the DOM's ImageData). */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

/** Decoded pictures by pack-relative path. */
export type PixelStore = Map<string, Pixels>;

export function blank(width: number, height: number): Pixels {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function blend(dst: Pixels, i: number, r: number, g: number, b: number, a: number): void {
  if (a <= 0) return;
  const d = dst.data, j = i * 4;
  if (a >= 255 || d[j + 3] === 0) { d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = a; return; }
  const sa = a / 255, da = d[j + 3] / 255, oa = sa + da * (1 - sa);
  d[j] = Math.round((r * sa + d[j] * da * (1 - sa)) / oa);
  d[j + 1] = Math.round((g * sa + d[j + 1] * da * (1 - sa)) / oa);
  d[j + 2] = Math.round((b * sa + d[j + 2] * da * (1 - sa)) / oa);
  d[j + 3] = Math.round(oa * 255);
}

/** Draw one tile image into the box (x, y, w, h) of `dst`, with Tiled's flip
 *  semantics (anti-diagonal D first, then H and V; with D the box is the
 *  transposed one, as the caller passes it). Optional rotation (degrees,
 *  clockwise) about (rx, ry), as Tiled rotates a tile object. */
export function drawTile(dst: Pixels, store: PixelStore, T: ResolvedTile | null, x: number, y: number, w: number, h: number,
  opacity = 1, rot?: { deg: number; rx: number; ry: number }): void {
  if (!T || !T.image) return;
  const src = store.get(T.image.path);
  if (!src || w <= 0 || h <= 0) return;
  const cx = x + w / 2, cy = y + h / 2;
  const a = rot && rot.deg ? rot.deg * Math.PI / 180 : 0, ca = Math.cos(a), sa = Math.sin(a);
  // the destination pixels the (rotated) box can touch
  let x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.ceil(x + w), y1 = Math.ceil(y + h);
  if (a) {
    const C = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) =>
      [rot!.rx + (px - rot!.rx) * ca - (py - rot!.ry) * sa, rot!.ry + (px - rot!.rx) * sa + (py - rot!.ry) * ca]);
    x0 = Math.floor(Math.min(...C.map((q) => q[0]))); x1 = Math.ceil(Math.max(...C.map((q) => q[0])));
    y0 = Math.floor(Math.min(...C.map((q) => q[1]))); y1 = Math.ceil(Math.max(...C.map((q) => q[1])));
  }
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(dst.width, x1); y1 = Math.min(dst.height, y1);
  // the drawn image is sw×sh, transposed to sh×sw by D; it fills the box
  const iw = T.d ? T.sh : T.sw, ih = T.d ? T.sw : T.sh;
  for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
    let qx = px + 0.5, qy = py + 0.5;
    if (a) { // undo the rotation
      const dx = qx - rot!.rx, dy = qy - rot!.ry;
      qx = rot!.rx + dx * ca + dy * sa; qy = rot!.ry - dx * sa + dy * ca;
    }
    // box coordinates, centred, then H/V flips (applied last, so undone first)
    let u = (qx - cx) * (iw / w), v = (qy - cy) * (ih / h);
    if (u < -iw / 2 || u >= iw / 2 || v < -ih / 2 || v >= ih / 2) continue;
    if (T.h) u = -u;
    if (T.v) v = -v;
    // D: the image is transposed (rotate 90° then mirror) — (u, v) -> (v, u)
    if (T.d) [u, v] = [v, u];
    const sx = Math.floor(u + T.sw / 2), sy = Math.floor(v + T.sh / 2);
    if (sx < 0 || sy < 0 || sx >= T.sw || sy >= T.sh) continue;
    const gx = T.sx + sx, gy = T.sy + sy;
    if (gx < 0 || gy < 0 || gx >= src.width || gy >= src.height) continue;
    const k = (gy * src.width + gx) * 4;
    const alpha = src.data[k + 3] * opacity;
    if (alpha > 0) blend(dst, py * dst.width + px, src.data[k], src.data[k + 1], src.data[k + 2], alpha);
  }
}

/** Where a tile of a tile layer is drawn: anchored at the cell's bottom-left
 *  plus the tileset offset; a D (rotated) tile takes its transposed size. */
export function tileCellBox(M: NormalizedMap, l: TileLayer, x: number, y: number, T: ResolvedTile): [number, number, number, number] {
  const dw = T.d ? T.sh : T.sw, dh = T.d ? T.sw : T.sh;
  return [l.ox + x * M.tw + T.ts.offX, l.oy + (y + 1) * M.th - dh + T.ts.offY, dw, dh];
}

/** Draw every tile of a tile layer (optionally only cells passing `keep`). */
export function drawTileLayer(dst: Pixels, store: PixelStore, M: NormalizedMap, l: TileLayer, opacity = l.opacity, keep?: (cell: number) => boolean): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const raw = l.data[y * l.w + x];
    if (!(raw & GID_MASK) || (keep && !keep(y * l.w + x))) continue;
    const T = tileFor(M, raw);
    if (!T) continue;
    const [bx, by, bw, bh] = tileCellBox(M, l, x, y, T);
    drawTile(dst, store, T, bx, by, bw, bh, opacity);
  }
}

/** Draw one tile object of an object layer (rotation and alignment included).
 *  Objects never apply the D bit (as in Tiled). */
export function drawObject(dst: Pixels, store: PixelStore, M: NormalizedMap, l: ObjectLayer, o: TiledObject, opacity = l.opacity): void {
  const B = objBox(M, o);
  if (!B.T) return;
  drawTile(dst, store, { ...B.T, d: false }, B.x + l.ox + B.T.ts.offX, B.y + l.oy + B.T.ts.offY, B.w, B.h, opacity,
    o.rotation ? { deg: o.rotation, rx: o.x + l.ox, ry: o.y + l.oy } : undefined);
}

/** Map size in pixels. */
export function mapPixelSize(M: NormalizedMap): { PW: number; PH: number } {
  return { PW: M.width * M.tw, PH: M.height * M.th };
}

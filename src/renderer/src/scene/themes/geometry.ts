// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Shape geometry for normalized Tiled maps (ported from the bridge viewer).

import type { ObjBox, ObjectLayer, ShapeKind, TiledObject } from './tiled';

/** A shape in map pixels. `abs` holds absolute polygon points when the shape
 *  was transformed (rotated or taken from a tile's collision shapes). */
export interface WorldShape {
  shape: ShapeKind | 'none';
  x: number;
  y: number;
  w: number;
  h: number;
  pts?: Array<[number, number]> | null;
  abs?: Array<[number, number]>;
  name?: string;
  cls?: string;
}

interface Offset { ox: number; oy: number; }

export function worldShape(o: TiledObject, dx: number, dy: number, layer: Offset): WorldShape {
  return { shape: o.shape, x: o.x + layer.ox + dx, y: o.y + layer.oy + dy, w: o.width, h: o.height, pts: o.points, name: o.name, cls: o.cls };
}

/** Rotate map point (x, y) about a tile object's own point, as Tiled rotates it (degrees, clockwise). */
export function rotAbout(o: TiledObject, layer: Offset, x: number, y: number): [number, number] {
  if (!o.rotation) return [x, y];
  const a = o.rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), px = o.x + layer.ox, py = o.y + layer.oy;
  return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c];
}

/** The 4 corners of a tile object's drawn box in map pixels, after rotation (tileset offset included). */
export function objCorners(o: TiledObject, B: ObjBox, layer: Offset): Array<[number, number]> {
  const x0 = B.x + layer.ox + (B.T ? B.T.ts.offX : 0), y0 = B.y + layer.oy + (B.T ? B.T.ts.offY : 0);
  return ([[x0, y0], [x0 + B.w, y0], [x0 + B.w, y0 + B.h], [x0, y0 + B.h]] as Array<[number, number]>).map(([x, y]) => rotAbout(o, layer, x, y));
}

/** A tile's collision shape (origin = the tile image's top-left) -> map pixels,
 *  through the placed object's scale, flips, tileset offset and rotation. */
export function footShape(s: TiledObject, B: ObjBox, sxs: number, sys: number, layer: ObjectLayer | Offset, o: TiledObject): WorldShape {
  const T = B.T!;
  const ox = B.x + layer.ox + T.ts.offX, oy = B.y + layer.oy + T.ts.offY;
  const fx = (x: number) => ox + (T.h ? B.w - x * sxs : x * sxs);
  const fy = (y: number) => oy + (T.v ? B.h - y * sys : y * sys);
  if (s.shape === 'point') return { shape: 'none', x: 0, y: 0, w: 0, h: 0 };
  let pts: Array<[number, number]>;
  if (s.points) pts = s.points.map(([px, py]) => [fx(s.x + px), fy(s.y + py)]);
  else {
    const xa = fx(s.x), xb = fx(s.x + s.width), ya = fy(s.y), yb = fy(s.y + s.height);
    const x = Math.min(xa, xb), y = Math.min(ya, yb), w = Math.abs(xb - xa), h = Math.abs(yb - ya);
    if (!o.rotation) return { shape: s.shape, x, y, w, h };
    pts = s.shape === 'ellipse'
      ? Array.from({ length: 24 }, (_, k) => [x + w / 2 + w / 2 * Math.cos(k * Math.PI / 12), y + h / 2 + h / 2 * Math.sin(k * Math.PI / 12)] as [number, number])
      : [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  }
  return { shape: s.shape === 'polyline' ? 'polyline' : 'polygon', x: 0, y: 0, w: 0, h: 0, abs: pts.map(([x, y]) => rotAbout(o, layer, x, y)) };
}

/** Polygon points of a shape in map pixels (null for rect/ellipse/point). */
export function shapePoints(s: WorldShape): Array<[number, number]> | null {
  return s.abs || (s.pts ? s.pts.map(([px, py]) => [s.x + px, s.y + py] as [number, number]) : null);
}

export function inside(s: WorldShape, x: number, y: number): boolean {
  if (s.shape === 'rect') return x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;
  if (s.shape === 'ellipse') {
    const rx = s.w / 2, ry = s.h / 2;
    if (!rx || !ry) return false;
    const dx = (x - s.x - rx) / rx, dy = (y - s.y - ry) / ry;
    return dx * dx + dy * dy <= 1;
  }
  if (s.shape === 'polygon') {
    const P = shapePoints(s)!;
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  return false;
}

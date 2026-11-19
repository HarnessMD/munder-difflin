// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Analysis of a stations-scene map: layer roles, the exact collision mask, the
// walk grid, stations, the entrance, seat zones and reachability.
//
// A port of the bridge viewer's analyse() (the audited oracle), with the
// pack's manifest naming the stations layer, the entrance and the seat facings
// instead of the viewer's built-in names. Pure: pictures arrive as RGBA
// buffers, so node:test runs the same code the renderer does.

import { GID_MASK, tileFor, objBox, type Diagnostic, type MapLayer, type NormalizedMap, type ObjectLayer, type TileLayer } from './tiled';
import { blank, drawTileLayer, drawObject, drawTile, tileCellBox, type PixelStore } from './raster';
import { worldShape, objCorners, footShape, inside, shapePoints, type WorldShape } from './geometry';
import { FACINGS, type Approach, type CoffeeSpec, type Facing, type NavigationSpec, type StationsSpec } from './manifest';
import { rowPieces, type RowPieces } from './compositor';

/** Layers that carry data, never drawn. */
export const SPECIAL = ['collision', 'collision-shapes', 'stations', 'points', 'zones'];

export type LayerRole = 'image' | 'collision' | 'collision-shapes' | 'stations' | 'points' | 'zones' | 'below' | 'above' | 'sort' | 'sort-unknown';

export function layerRole(layer: MapLayer): LayerRole {
  const n = layer.name.toLowerCase();
  if (layer.kind === 'image') return 'image';
  if (SPECIAL.includes(n)) return n as LayerRole;
  if (n.startsWith('below')) return 'below';
  if (n.startsWith('above')) return 'above';
  if (n.startsWith('props')) return 'sort';
  return layer.kind === 'tile' ? 'below' : 'sort-unknown';
}

/** A lower wall (a Walls layer named with "lower" or "front"): people walk behind
 *  it on the floor, so it is sorted with them row by row and its pixels do not block. */
export function lowerWall(l: MapLayer): boolean {
  return l.kind === 'tile' && /^wall/i.test(l.name.trim()) && /lower|front/i.test(l.name);
}

/** A layer of points only (stations, entrance): read even when hidden. */
export function pointsOnly(l: MapLayer): boolean {
  return l.kind === 'object' && l.objects.length > 0 && l.objects.every((o) => o.shape === 'point');
}

export interface Station {
  name: string;
  x: number;
  y: number;
  facing: Facing;
  role?: string;
  /** The manifest's approach side, when it names one. */
  approach?: Approach;
}

export interface WalkGrid {
  /** Cell size in pixels. */
  g: number;
  W: number;
  H: number;
  /** 1 where a walker's foot box is clear of every solid pixel. */
  open: Uint8Array;
}

export interface FurnitureBox { id: number; layer: ObjectLayer; x0: number; y0: number; x1: number; y1: number; }

export interface StationMap {
  M: NormalizedMap;
  roles: Array<{ l: MapLayer; r: LayerRole }>;
  /** Tile layers sorted with people one tile row at a time (rails, lower walls, consoles). */
  rowLayers: Set<TileLayer>;
  /** Object layers of single tiles on the floor, drawn under everyone. */
  flatLayers: Set<ObjectLayer>;
  PW: number;
  PH: number;
  /** Per map pixel: 0 = open, else an index into solidName. */
  solid: Uint16Array;
  /** The mask before the rails were added (rails judge their own feet against it). */
  solidBase: Uint16Array;
  solidName: string[];
  /** solidName indices that belong to the map's own collision layer: never excused by a seat zone. */
  hard: boolean[];
  integ: Uint32Array;
  grid: WalkGrid;
  stations: Station[];
  /** The stations in the manifest's seat order (only those that exist and are reachable). */
  seatOrder: Station[];
  captain: Station | null;
  /** Per station: its square and its chair's box. Nobody stops there to roam or brew. */
  seatZones: Map<Station, Array<[number, number, number, number]>>;
  /** Per station: the solidName index of its own chair, the only solid its sitter may cross (on the short leg in and out). */
  seatChair: Map<Station, number>;
  /** Per station: the open spot on the chair's approach side, outside every chair, walked to by plain floor before
   *  the seat step in (and stepped back to on getting up). */
  approach: Map<Station, [number, number]>;
  entrance: [number, number] | null;
  start: [number, number] | null;
  reach: Uint8Array;
  zones: WorldShape[];
  wanderZone: WorldShape | null;
  /** Brew spots (the manifest's coffee.brew points, then its brewAt ones, on reachable open floor). */
  brew: Array<[number, number]>;
  /** Per station: where its mug is parked (the manifest's coffee.mugs, else its mugLayer points). */
  mugSpots: Map<Station, [number, number]>;
  rowPieceCache: Map<TileLayer, RowPieces>;
  diagnostics: Diagnostic[];
}

/** The foot box: 12×6 px at a walker's feet. */
export function footBox(x: number, y: number): [number, number, number, number] {
  const X = Math.round(x), Y = Math.round(y);
  return [X - 6, Y - 5, X + 6, Y + 1];
}

/** Solid indices a walker may cross (its own chair); a collision-layer one never is. */
export type Excuse = readonly number[];

/** Solid pixels under the foot box at (x, y), not counting those of the `excuse`d
 *  solids (the walker's own chair). Off the map counts as solid. */
export function footHits(S: Pick<StationMap, 'PW' | 'PH' | 'integ' | 'solid' | 'hard'>, x: number, y: number, excuse?: Excuse): number {
  const [x0, y0, x1, y1] = footBox(x, y);
  if (x0 < 0 || y0 < 0 || x1 > S.PW || y1 > S.PH) return 1;
  const W1 = S.PW + 1, I = S.integ, n = I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0];
  if (!n || !excuse || !excuse.length) return n;
  let m = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const id = S.solid[y * S.PW + x];
    if (id && (S.hard[id] || !excuse.includes(id))) m++;
  }
  return m;
}

export function cellCentre(G: WalkGrid, [x, y]: [number, number]): [number, number] {
  return [(x + 0.5) * G.g, (y + 0.5) * G.g];
}

export interface AnalyseOptions {
  stations: StationsSpec;
  navigation?: NavigationSpec;
  coffee?: CoffeeSpec;
}

/** Analyse a stations map. Problems are reported in `diagnostics`; level
 *  'error' means the scene cannot be used (the caller falls back to the office). */
export function analyseStationMap(M: NormalizedMap, store: PixelStore, opts: AnalyseOptions): StationMap {
  const rep: Diagnostic[] = [];
  const PW = M.width * M.tw, PH = M.height * M.th;
  const roles = M.layers.map((l) => ({ l, r: layerRole(l) }));
  if (M.infinite) rep.push({ level: 'info', message: 'The map is infinite; it is cropped to its placed chunks.' });

  // Stacking (Tiled's order): a tile layer named with "rail", a lower wall, or one stacked above a sorted
  // object layer is sorted with people one tile row at a time (its row bottom is its foot line).
  const sortedLayer = ({ l, r }: { l: MapLayer; r: LayerRole }) => l.visible && l.kind === 'object' && (r === 'sort' || r === 'sort-unknown') && l.objects.some((o) => o.gid && o.visible);
  const firstObj = roles.findIndex(sortedLayer);
  const rowLayers = new Set(roles.filter(({ l, r }, i) => l.visible && l.kind === 'tile' && r === 'below'
    && (/rail/i.test(l.name) || lowerWall(l) || (firstObj >= 0 && i > firstObj)) && l.data.some((v) => v & GID_MASK)).map(({ l }) => l as TileLayer));

  // coarse walk grid (tile-sized unless the map says otherwise): only for the flat-layer test
  const g = Number(M.props.walkGrid) || M.tw;
  const W = Math.ceil(PW / g), H = Math.ceil(PH / g);
  const wall = new Uint8Array(W * H);
  const col = roles.find((x) => x.r === 'collision' && x.l.visible && x.l.kind === 'tile') as { l: TileLayer; r: LayerRole } | undefined;
  const cs = roles.find((x) => x.r === 'collision-shapes' && x.l.visible && x.l.kind === 'object');
  const colObj = roles.filter((x) => x.r === 'collision' && x.l.visible && x.l.kind === 'object');
  const shapes: WorldShape[] = [];
  for (const x of [cs, ...colObj]) if (x && x.l.kind === 'object') for (const o of x.l.objects) if (o.visible) shapes.push(worldShape(o, 0, 0, x.l));
  const tileAt = (l: TileLayer, cx: number, cy: number) => {
    const tx = Math.floor((cx - l.ox) / M.tw), ty = Math.floor((cy - l.oy) / M.th);
    return tx >= 0 && ty >= 0 && tx < l.w && ty < l.h && !!(l.data[ty * l.w + tx] & GID_MASK);
  };
  for (let gy = 0; gy < H; gy++) for (let gx = 0; gx < W; gx++) {
    const cx = (gx + 0.5) * g, cy = (gy + 0.5) * g, i = gy * W + gx;
    if (col && tileAt(col.l, cx, cy)) wall[i] = 1;
    if (!wall[i] && shapes.some((s) => inside(s, cx, cy))) wall[i] = 1;
  }
  const floors = M.layers.filter((l): l is TileLayer => l.kind === 'tile' && l.visible && /^floor/i.test(l.name.trim()));
  const wallTiles = M.layers.filter((l): l is TileLayer => l.kind === 'tile' && l.visible && /^wall/i.test(l.name.trim()) && !lowerWall(l));
  if (floors.length || wallTiles.length) for (let i = 0; i < W * H; i++) {
    const cx = (i % W + 0.5) * g, cy = (Math.floor(i / W) + 0.5) * g;
    if (floors.length && !floors.some((l) => tileAt(l, cx, cy))) wall[i] = 1;
    if (wallTiles.some((l) => tileAt(l, cx, cy))) wall[i] = 1;
  }
  if (!col && !cs && !colObj.length && !floors.length && !wallTiles.length)
    rep.push({ level: 'warn', message: 'No collision layer, collision shapes, Floor or Walls layer: people can walk everywhere.' });

  // A flat object layer (single-tile pieces edge to edge on one lattice, on the floor) is drawn under everyone.
  const touching = (bs: Array<{ x: number; y: number }>) => {
    const seen = new Set([0]), q = [0];
    while (q.length) {
      const a = bs[q.shift()!];
      bs.forEach((b, j) => { if (!seen.has(j) && ((a.y === b.y && Math.abs(a.x - b.x) === M.tw) || (a.x === b.x && Math.abs(a.y - b.y) === M.th))) { seen.add(j); q.push(j); } });
    }
    return seen.size === bs.length;
  };
  const flatLayers = new Set(roles.filter((x) => {
    if (!sortedLayer(x) || x.r !== 'sort-unknown' || x.l.kind !== 'object') return false; // a layer named props is never flat
    const l = x.l, os = l.objects.filter((o) => o.gid && o.visible), B0 = objBox(M, os[0]);
    return os.length > 1 && touching(os.map((o) => objBox(M, o))) && os.every((o) => {
      const B = objBox(M, o), x0 = B.x + l.ox, y0 = B.y + l.oy, gx = Math.floor((x0 + B.w / 2) / g), gy = Math.floor((y0 + B.h / 2) / g);
      return !o.rotation && !o.props.depth && B.w === M.tw && B.h === M.th && (B.x - B0.x) % M.tw === 0 && (B.y - B0.y) % M.th === 0
        && gx >= 0 && gy >= 0 && gx < W && gy < H && (!wall[gy * W + gx] || floors.some((fl) => tileAt(fl, x0 + B.w / 2, y0 + B.h / 2)));
    });
  }).map(({ l }) => l as ObjectLayer));

  // stations and the entrance, from the layer the manifest names (read even when hidden: points draw nothing)
  const spec = opts.stations;
  const stL = roles.find((x) => x.l.kind === 'object' && x.l.name.trim().toLowerCase() === spec.layer.trim().toLowerCase())?.l as ObjectLayer | undefined;
  if (!stL) rep.push({ level: 'error', message: `The map has no object layer named "${spec.layer}" (the manifest's stations layer).` });
  else if (!stL.visible && !pointsOnly(stL)) rep.push({ level: 'warn', message: `The stations layer "${stL.name}" is hidden and holds more than points; it is read anyway.` });
  const eq = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const excluded = (n: string) => eq(n, spec.entrance) || (spec.exclude ?? []).some((e) => eq(e, n)) || (opts.coffee?.brew ?? []).some((e) => eq(e, n));
  const seatSpec = (n: string) => Object.entries(spec.seats ?? {}).find(([k]) => eq(k, n))?.[1];
  const stations: Station[] = stL ? stL.objects.filter((o) => o.visible && o.shape === 'point' && o.name && !excluded(o.name)).map((o) => {
    const ss = seatSpec(o.name), mapFacing = String(o.props.facing ?? '');
    const facing: Facing = ss?.facing ?? (FACINGS.includes(mapFacing as Facing) ? mapFacing as Facing : 'down');
    const role = ss?.role ?? (typeof o.props.role === 'string' ? o.props.role : undefined);
    return { name: o.name, x: o.x + stL.ox, y: o.y + stL.oy, facing, ...(role ? { role } : {}), ...(ss?.approach ? { approach: ss.approach } : {}) };
  }) : [];
  const names = new Map<string, Station>();
  for (const s of stations) {
    if (names.has(s.name.toLowerCase())) rep.push({ level: 'error', message: `Two stations are named "${s.name}"; station names must be unique.` });
    names.set(s.name.toLowerCase(), s);
  }
  for (const n of spec.seatOrder) if (!names.has(n.toLowerCase())) rep.push({ level: 'error', message: `seatOrder names "${n}", but the layer "${spec.layer}" has no such point.` });
  for (const s of stations) if (!spec.seatOrder.some((n) => eq(n, s.name))) rep.push({ level: 'info', message: `Station "${s.name}" is not in seatOrder, so it is never assigned.` });
  const entObj = stL?.objects.find((o) => o.visible && eq(o.name, spec.entrance));
  let entrance: [number, number] | null = entObj && stL
    ? [entObj.x + stL.ox + (entObj.shape === 'point' ? 0 : entObj.width / 2), entObj.y + stL.oy + (entObj.shape === 'point' ? 0 : entObj.height / 2)] : null;
  if (stL && !entObj) rep.push({ level: 'error', message: `The layer "${spec.layer}" has no entrance point named "${spec.entrance}".` });

  // Walking, exact: every solid pixel (collision shapes by their own edges; whole tiles of a collision tile layer;
  // the drawn pixels of Walls; off the floor; furniture by its tile collision shape, else the solid pixels of its
  // lower half; furniture tile layers by their solid pixels). A walker's foot box must stay clear of them.
  const solid = new Uint16Array(PW * PH), solidName = [''];
  const own = (name: string) => solidName.push(name) - 1;
  const fill = (id: number, x: number, y: number) => { if (x >= 0 && y >= 0 && x < PW && y < PH && !solid[y * PW + x]) solid[y * PW + x] = id; };
  const fillRect = (id: number, x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) fill(id, x, y);
  };
  const fillShape = (id: number, s: WorldShape) => {
    if (!s || s.shape === 'none' || s.shape === 'point') return;
    const P = shapePoints(s);
    if (s.shape === 'polyline') {
      if (P) for (let i = 1; i < P.length; i++) {
        const [ax, ay] = P[i - 1], [bx, by] = P[i], n = Math.ceil(Math.hypot(bx - ax, by - ay)) + 1;
        for (let t = 0; t <= n; t++) fill(id, Math.floor(ax + (bx - ax) * t / n), Math.floor(ay + (by - ay) * t / n));
      }
      return;
    }
    const xs = P ? P.map((q) => q[0]) : [s.x, s.x + s.w], ys = P ? P.map((q) => q[1]) : [s.y, s.y + s.h];
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y < Math.min(PH, Math.ceil(Math.max(...ys))); y++)
      for (let x = Math.max(0, Math.floor(Math.min(...xs))); x < Math.min(PW, Math.ceil(Math.max(...xs))); x++) if (inside(s, x + 0.5, y + 0.5)) fill(id, x, y);
  };
  const layerAlpha = (l: TileLayer) => { const p = blank(PW, PH); drawTileLayer(p, store, M, l, 1); return p.data; };
  const colId = col ? own(`collision tile layer "${col.l.name}"`) : 0;
  if (col) for (let ty = 0; ty < M.height; ty++) for (let tx = 0; tx < M.width; tx++)
    if (tileAt(col.l, (tx + 0.5) * M.tw, (ty + 0.5) * M.th)) fillRect(colId, tx * M.tw, ty * M.th, (tx + 1) * M.tw, (ty + 1) * M.th);
  wallTiles.forEach((l) => { const id = own(`the wall "${l.name}"`), d = layerAlpha(l); for (let i = 0; i < PW * PH; i++) if (d[i * 4 + 3]) fill(id, i % PW, (i - i % PW) / PW); });
  if (floors.length) {
    const id = own('the edge of the floor'), ds = floors.map(layerAlpha);
    for (let i = 0; i < PW * PH; i++) if (!ds.some((d) => d[i * 4 + 3])) fill(id, i % PW, (i - i % PW) / PW);
  }
  for (const s of shapes) fillShape(own(`collision shape${s.name ? ` "${s.name}"` : ''}`), s);
  const furniture: FurnitureBox[] = [];
  roles.forEach(({ l, r }) => {
    if (l.kind !== 'object' || !l.visible || SPECIAL.includes(r) || flatLayers.has(l) || l === stL) return;
    for (const o of l.objects) {
      if (!o.gid || !o.visible) continue;
      const B = objBox(M, o), T = B.T;
      if (!T) continue;
      const C = objCorners(o, B, l);
      const x0 = Math.floor(Math.min(...C.map((q) => q[0]))), x1 = Math.ceil(Math.max(...C.map((q) => q[0])));
      const y0 = Math.floor(Math.min(...C.map((q) => q[1]))), y1 = Math.ceil(Math.max(...C.map((q) => q[1])));
      const id = own(`"${o.name || l.name}"`);
      if (T.tile && T.tile.shapes.length) {
        const sxs = B.w / (T.sw || 1), sys = B.h / (T.sh || 1);
        for (const s of T.tile.shapes) fillShape(id, footShape(s, B, sxs, sys, l, o));
      } else if ((r === 'sort' || r === 'sort-unknown') && T.image) {
        const p = blank(PW, PH); drawObject(p, store, M, l, o, 1);
        const mid = (y0 + y1) / 2; // the footprint: the lower half
        for (let y = Math.max(0, y0); y < Math.min(PH, y1); y++) for (let x = Math.max(0, x0); x < Math.min(PW, x1); x++)
          if (y >= mid && p.data[(y * PW + x) * 4 + 3] > 0) fill(id, x, y);
      } else continue;
      if (r === 'sort' || r === 'sort-unknown') furniture.push({ id, layer: l, x0, y0, x1, y1 });
    }
  });
  for (const l of rowLayers) if (!/rail/i.test(l.name) && !lowerWall(l)) { // a furniture tile layer blocks by its solid pixels
    const id = own(`"${l.name}"`);
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
      const raw = l.data[y * l.w + x];
      if (!(raw & GID_MASK)) continue;
      const T = tileFor(M, raw);
      if (!T || !T.image) continue;
      const [bx, by, bw, bh] = tileCellBox(M, l, x, y, T);
      const p = blank(PW, PH); drawTile(p, store, T, bx, by, bw, bh, 1);
      for (let py = Math.max(0, Math.floor(by)); py < Math.min(PH, Math.ceil(by + bh)); py++)
        for (let px = Math.max(0, Math.floor(bx)); px < Math.min(PW, Math.ceil(bx + bw)); px++) if (p.data[(py * PW + px) * 4 + 3]) fill(id, px, py);
    }
  }
  // rails: their standing pixels block as well as their shapes; what stands up is judged against
  // everything solid so far (solidBase); stairs and steps (pixels lying on the floor) stay open
  const solidBase = solid.slice();
  const partial = { M, store, PW, PH, solidBase, flatLayers, rowPieceCache: new Map<TileLayer, RowPieces>() };
  for (const l of rowLayers) if (/rail/i.test(l.name)) {
    const id = own(`the rail "${l.name}"`), P = rowPieces(partial, l);
    for (let i = 0; i < PW * PH; i++) if (P.footAt[i] >= 0) fill(id, i % PW, (i - i % PW) / PW);
  }
  const integ = new Uint32Array((PW + 1) * (PH + 1));
  for (let y = 0; y < PH; y++) for (let x = 0, row = 0; x < PW; x++) { row += solid[y * PW + x] ? 1 : 0; integ[(y + 1) * (PW + 1) + x + 1] = integ[y * (PW + 1) + x + 1] + row; }
  const hard = solidName.map((n) => /^collision/.test(n));
  const S = { PW, PH, integ, solid, hard };

  // a seat's zone (its own square and its chair's box: nobody stops there), and its chair (the nearest furniture):
  // solid for every walk: its sitter's feet are in it only on the seat step between its approach spot and the seat
  const seatZones = new Map<Station, Array<[number, number, number, number]>>();
  const seatChair = new Map<Station, number>();
  for (const s of stations) {
    let best: FurnitureBox | null = null, bd = 16.5;
    for (const f of furniture) { const d = Math.hypot(Math.max(f.x0 - s.x, 0, s.x - f.x1), Math.max(f.y0 - s.y, 0, s.y - f.y1)); if (d < bd) { bd = d; best = f; } }
    const sq: [number, number] = [Math.floor(s.x / M.tw) * M.tw, Math.floor(s.y / M.th) * M.th];
    seatZones.set(s, [[sq[0], sq[1], sq[0] + M.tw, sq[1] + M.th], ...(best ? [[best.x0, best.y0, best.x1, best.y1] as [number, number, number, number]] : [])]);
    if (best) seatChair.set(s, best.id);
    if ((col && tileAt(col.l, s.x, s.y)) || shapes.some((sh) => inside(sh, s.x, s.y)))
      rep.push({ level: 'error', message: `Station "${s.name}" stands inside a collision shape or tile; nobody can sit there.` });
  }

  const fg = opts.navigation?.walkGrid || Number(M.props.walkGrid) || 4, FW = Math.ceil(PW / fg), FH = Math.ceil(PH / fg);
  const G: WalkGrid = { g: fg, W: FW, H: FH, open: new Uint8Array(FW * FH) };
  for (let i = 0; i < FW * FH; i++) G.open[i] = footHits(S, (i % FW + 0.5) * fg, (Math.floor(i / FW) + 0.5) * fg) ? 0 : 1;
  const fcell = (x: number, y: number): [number, number] => [Math.floor(x / fg), Math.floor(y / fg)];
  let start: [number, number] | null = null;
  if (entrance) {
    const [x, y] = fcell(entrance[0], entrance[1]);
    if (x < 0 || y < 0 || x >= FW || y >= FH) { rep.push({ level: 'error', message: `The entrance "${spec.entrance}" is outside the map.` }); entrance = null; }
    else {
      start = [x, y];
      if (!G.open[y * FW + x]) { // its foot box is not clear: arrive at the nearest clear spot instead
        const seen = new Uint8Array(FW * FH), q: Array<[number, number]> = [[x, y]];
        seen[y * FW + x] = 1;
        let hit: [number, number] | null = null;
        while (q.length && !hit) {
          const [cx, cy] = q.shift()!;
          for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy, k = ny * FW + nx;
            if (nx < 0 || ny < 0 || nx >= FW || ny >= FH || seen[k]) continue;
            seen[k] = 1;
            const [ex, ey] = cellCentre(G, [nx, ny]);
            if (G.open[k] && !footHits(S, ex - 3, ey) && !footHits(S, ex + 3, ey)) { hit = [nx, ny]; break; }
            q.push([nx, ny]);
          }
        }
        if (hit) { start = hit; entrance = cellCentre(G, hit); rep.push({ level: 'info', message: `The entrance stands on something solid; people arrive at the nearest clear spot (${Math.round(entrance[0])}, ${Math.round(entrance[1])}).` }); }
        else { rep.push({ level: 'error', message: 'The entrance stands on something solid and no clear floor is near it.' }); start = null; entrance = null; }
      }
    }
  }
  const reach = new Uint8Array(FW * FH);
  const base = { S, G };
  if (start) {
    const q: Array<[number, number]> = [start];
    reach[start[1] * FW + start[0]] = 1;
    while (q.length) {
      const [x, y] = q.shift()!;
      for (const [nx, ny] of neighbours(base, x, y)) { const k = ny * FW + nx; if (!reach[k]) { reach[k] = 1; q.push([nx, ny]); } }
    }
  }
  // A seat is walked to by plain floor up to its approach spot, outside every chair; then the seat step in.
  const reachable = new Set<Station>();
  const approach = new Map<Station, [number, number]>();
  for (const s of stations) {
    const [x, y] = fcell(s.x, s.y);
    if (x < 0 || y < 0 || x >= FW || y >= FH) { rep.push({ level: 'error', message: `Station "${s.name}" is outside the map.` }); continue; }
    const ex: Excuse = seatChair.has(s) ? [seatChair.get(s)!] : [];
    const a = start && !footHits(S, s.x, s.y, ex) ? approachSpot({ S, G, reach }, s, ex) : null;
    if (a && s.approach && a.side !== s.approach) rep.push({ level: 'warn', message: `Station "${s.name}": its approach side "${s.approach}" is not open floor; it is entered from the ${a.side}.` });
    if (a) { approach.set(s, a.at); reach[y * FW + x] = 1; reachable.add(s); }
    else rep.push({ level: 'warn', message: `Station "${s.name}" cannot be reached from the entrance; it is never assigned.` });
  }
  const seatOrder = spec.seatOrder.map((n) => names.get(n.toLowerCase())).filter((s): s is Station => !!s && reachable.has(s));
  const captain = spec.captain ? seatOrder.find((s) => eq(s.name, spec.captain!)) ?? null : null;

  const znL = roles.find((x) => x.l.kind === 'object' && x.l.visible && x.l.name.trim().toLowerCase() === (opts.navigation?.zonesLayer ?? 'zones').toLowerCase())?.l as ObjectLayer | undefined;
  const zones = znL ? znL.objects.map((o) => worldShape(o, 0, 0, znL)) : [];
  const wz = opts.navigation?.wanderZone;
  const wanderZone = wz ? zones.find((z) => eq(z.name || '', wz)) ?? null : null;
  if (wz && !wanderZone) rep.push({ level: 'warn', message: `The wander zone "${wz}" is not in the zones layer; idle people wander anywhere they can reach.` });

  // Coffee: brew spots from the stations layer and/or inline, mug spots from their own layer and/or inline (all pack data)
  const brew: Array<[number, number]> = [];
  const mugSpots = new Map<Station, [number, number]>();
  if (opts.coffee) {
    const spots: Array<[string, [number, number]]> = [];
    for (const n of opts.coffee.brew ?? []) {
      const o = stL?.objects.find((q) => q.visible && q.name && eq(q.name, n));
      if (!o || !stL) { rep.push({ level: 'warn', message: `The coffee point "${n}" is not in the layer "${spec.layer}".` }); continue; }
      spots.push([`point "${n}"`, [o.x + stL.ox + (o.shape === 'point' ? 0 : o.width / 2), o.y + stL.oy + (o.shape === 'point' ? 0 : o.height / 2)]]);
    }
    for (const p of opts.coffee.brewAt ?? []) spots.push([`spot (${p[0]}, ${p[1]})`, [p[0], p[1]]]);
    for (const [n, p] of spots) {
      const [x, y] = fcell(p[0], p[1]);
      let hit: [number, number] | null = null, hd = Infinity;   // the point, or the nearest open reachable cell within 3 cells
      for (let cy = y - 3; cy <= y + 3; cy++) for (let cx = x - 3; cx <= x + 3; cx++) {
        if (cx < 0 || cy < 0 || cx >= FW || cy >= FH || !reach[cy * FW + cx] || !G.open[cy * FW + cx]) continue;
        const d = (cx - x) ** 2 + (cy - y) ** 2;
        if (d < hd) { hd = d; hit = d ? cellCentre(G, [cx, cy]) : p; }
      }
      // A brewer stands there for seconds: never on a seat square or a chair (the seat-zone rule, as inSeatZone)
      const fb = hit ? footBox(hit[0], hit[1]) : null;
      const onSeat = fb && [...seatZones].find(([, rects]) => rects.some(([a, b, c, d]) => fb[0] < c && fb[2] > a && fb[1] < d && fb[3] > b));
      if (!hit) rep.push({ level: 'warn', message: `The coffee ${n} is not on open floor reachable from the entrance; it is not used.` });
      else if (onSeat) rep.push({ level: 'warn', message: `The coffee ${n} is inside the seat zone of "${onSeat[0].name}"; it is not used.` });
      else brew.push(hit);
    }
    const ml = opts.coffee.mugLayer;
    const mL = ml ? roles.find((x) => x.l.kind === 'object' && eq(x.l.name, ml))?.l as ObjectLayer | undefined : undefined;
    if (ml && !mL) rep.push({ level: 'warn', message: `The mug layer "${ml}" is not in the map; mugs are not drawn.` });
    if (mL) for (const o of mL.objects) {
      const s = o.name ? names.get(o.name.trim().toLowerCase()) : undefined;
      if (s) mugSpots.set(s, [o.x + mL.ox, o.y + mL.oy]);
      else rep.push({ level: 'info', message: `The mug point "${o.name}" names no station; it is not used.` });
    }
    for (const [n, p] of Object.entries(opts.coffee.mugs ?? {})) {
      const s = names.get(n.trim().toLowerCase());
      if (s) mugSpots.set(s, [p[0], p[1]]);
      else rep.push({ level: 'info', message: `The coffee mug spot "${n}" names no station; it is not used.` });
    }
    if (!brew.length) rep.push({ level: 'warn', message: 'No usable coffee point: idle people only wander.' });
  }

  return {
    M, roles, rowLayers, flatLayers, PW, PH, solid, solidBase, solidName, hard, integ, grid: G, stations, seatOrder, captain,
    seatZones, seatChair, approach, entrance, start, reach, zones, wanderZone, brew, mugSpots, rowPieceCache: partial.rowPieceCache, diagnostics: rep,
  };
}

// ───────────────────────── paths ─────────────────────────

type Nav = { S: Pick<StationMap, 'PW' | 'PH' | 'integ' | 'solid' | 'hard'>; G: WalkGrid };
type Zones = Excuse | undefined;

/** A facing as a unit step. */
const STEP: Record<Facing, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

/** The direction of an approach side for a sitter facing `f` (left and right are the sitter's own). */
export function sideVector(f: Facing, side: Approach): [number, number] {
  const [x, y] = STEP[f];
  return side === 'front' ? [x, y] : side === 'back' ? [-x, -y] : side === 'left' ? [y, -x] : [-y, x];
}

/** The spot a sitter walks to before the seat step into seat `s`: on the manifest's side, else the front, the
 *  sides, then the back. It is the nearest point out from the seat whose foot box is clear of every solid (every
 *  chair included), that the entrance reaches by plain floor, and from which the seat step (not a walk) reaches
 *  the seat crossing nothing but its own chair. */
export function approachSpot(N: Nav & { reach: Uint8Array }, s: Station, ex: Excuse): { side: Approach; at: [number, number] } | null {
  const G = N.G, order: Approach[] = ['front', 'left', 'right', 'back'];
  for (const side of s.approach ? [s.approach, ...order.filter((o) => o !== s.approach)] : order) {
    const [dx, dy] = sideVector(s.facing, side);
    for (let k = 6; k <= 40; k += 2) {
      const at: [number, number] = [Math.round(s.x + dx * k), Math.round(s.y + dy * k)];
      const cx = Math.floor(at[0] / G.g), cy = Math.floor(at[1] / G.g);
      if (cx < 0 || cy < 0 || cx >= G.W || cy >= G.H) break;
      if (footHits(N.S, at[0], at[1]) || !N.reach[cy * G.W + cx] || !G.open[cy * G.W + cx]) continue;
      if (segClear(N.S, at, [s.x, s.y], ex)) return { side, at };
    }
  }
  return null;
}

/** Walk-grid neighbours (8-way, no corner cutting). `zones`: the solids this walker may
 *  cross (their own chair). */
export function neighbours(N: Nav, x: number, y: number, zones?: Zones): Array<[number, number]> {
  const G = N.G;
  const pass = (a: number, b: number) => !footHits(N.S, (a + 0.5) * G.g, (b + 0.5) * G.g, zones);
  const ok = (a: number, b: number) => a >= 0 && b >= 0 && a < G.W && b < G.H && (!!G.open[b * G.W + a] || (!!zones && zones.length > 0 && pass(a, b)));
  const out: Array<[number, number]> = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    if (!ok(x + dx, y + dy)) continue;
    if (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) continue; // no corner cutting
    out.push([x + dx, y + dy]);
  }
  return out;
}

/** A* on the walk grid; the cells from s to t inclusive, or null. */
export function astar(N: Nav, s: [number, number], t: [number, number], zones?: Zones): Array<[number, number]> | null {
  const G = N.G, W = G.W, n = W * G.H, h = (x: number, y: number) => Math.hypot(x - t[0], y - t[1]);
  const gs = new Float64Array(n).fill(Infinity), came = new Int32Array(n).fill(-1), heap: Array<[number, number]> = [];
  const push = (f: number, k: number) => {
    heap.push([f, k]);
    let i = heap.length - 1;
    while (i) { const q = (i - 1) >> 1; if (heap[q][0] <= heap[i][0]) break; [heap[q], heap[i]] = [heap[i], heap[q]]; i = q; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
      }
    }
    return top;
  };
  const sk = s[1] * W + s[0];
  gs[sk] = 0; push(h(s[0], s[1]), sk);
  while (heap.length) {
    const [f, k] = pop(), x = k % W, y = (k - x) / W;
    if (f > gs[k] + h(x, y) + 1e-9) continue;
    if (x === t[0] && y === t[1]) {
      const path: Array<[number, number]> = [[x, y]];
      let c = k;
      while (came[c] >= 0) { c = came[c]; path.unshift([c % W, (c - c % W) / W]); }
      return path;
    }
    for (const [nx, ny] of neighbours(N, x, y, zones)) {
      const nk = ny * W + nx, ng = gs[k] + Math.hypot(nx - x, ny - y);
      if (ng < gs[nk]) { gs[nk] = ng; came[nk] = k; push(ng + h(nx, ny), nk); }
    }
  }
  return null;
}

/** A walker's foot box stays clear all along the straight line a -> b. */
export function segClear(S: Nav['S'], a: [number, number], b: [number, number], zones?: Zones): boolean {
  const n = Math.ceil(2 * Math.hypot(b[0] - a[0], b[1] - a[1])); // every half pixel
  const at = (t: number): [number, number] => [Math.round(a[0] + (b[0] - a[0]) * t / (n || 1)), Math.round(a[1] + (b[1] - a[1]) * t / (n || 1))];
  let [px, py] = at(0);
  if (footHits(S, px, py, zones)) return false;
  for (let t = 1; t <= n; t++) { // between two samples the rounded position can mix their x and y
    const [x, y] = at(t);
    if (footHits(S, x, y, zones) || (x !== px && y !== py && (footHits(S, x, py, zones) || footHits(S, px, y, zones)))) return false;
    px = x; py = y;
  }
  return true;
}

/** A walking route in pixels from (x, y) to (tx, ty), smoothed into straight
 *  legs where the foot box stays clear; null when there is no way. With
 *  `exact`, the last point is (tx, ty) itself when the foot box is clear there
 *  (the walker's own seat zone excused). */
export function route(SM: StationMap, x: number, y: number, tx: number, ty: number, zones: Zones, exact: boolean): Array<[number, number]> | null {
  const G = SM.grid, N: Nav = { S: SM, G };
  const from: [number, number] = [Math.floor(x / G.g), Math.floor(y / G.g)], to: [number, number] = [Math.floor(tx / G.g), Math.floor(ty / G.g)];
  const path = astar(N, from, to, zones);
  if (!path) return null;
  let pts = path.slice(1).map((c) => cellCentre(G, c));
  // The first leg starts off the grid: check it like every other leg. When it is blocked, step first to the
  // nearest grid cell reachable in a clear straight line, and route from there.
  if (pts.length && !footHits(SM, x, y, zones) && !segClear(SM, [x, y], pts[0], zones)) {
    const cand: Array<[number, [number, number], [number, number]]> = [];
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
      const c: [number, number] = [from[0] + dx, from[1] + dy];
      if (c[0] < 0 || c[1] < 0 || c[0] >= G.W || c[1] >= G.H || !G.open[c[1] * G.W + c[0]]) continue;
      const q = cellCentre(G, c);
      cand.push([Math.hypot(q[0] - x, q[1] - y), c, q]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    let ok = false;
    for (const [, c, q] of cand) {
      if (!segClear(SM, [x, y], q, zones)) continue;
      const sub = astar(N, c, to, zones);
      if (!sub) continue;
      pts = [q, ...sub.slice(1).map((k) => cellCentre(G, k))]; ok = true; break;
    }
    if (!ok) return null; // no clear way off this spot: stay put rather than step into a solid
  }
  if (exact && !footHits(SM, tx, ty, zones) && segClear(SM, pts.length ? pts[pts.length - 1] : [x, y], [tx, ty], zones)) pts.push([tx, ty]);
  const out: Array<[number, number]> = [];
  let cur: [number, number] = [x, y];
  for (let i = 0; i < pts.length;) {
    let j = Math.min(pts.length - 1, i + 60);
    while (j > i && !segClear(SM, cur, pts[j], zones)) j--;
    out.push(pts[j]); cur = pts[j]; i = j + 1;
  }
  return out;
}

/** A route into seat `s`: plain floor to its approach spot (every chair solid), then the seat point, reached by
 *  the seat step, not walked. Null when there is no way (a seat with no approach spot is never assigned). */
export function seatRoute(SM: StationMap, x: number, y: number, s: Station): Array<[number, number]> | null {
  const a = SM.approach.get(s);
  if (!a) return null;
  const legs = route(SM, x, y, a[0], a[1], undefined, true);
  if (!legs) return null;
  const end = legs.length ? legs[legs.length - 1] : [x, y];
  if (end[0] !== a[0] || end[1] !== a[1]) legs.push(a);
  legs.push([s.x, s.y]);
  return legs;
}

/** True when (x, y) lies in any station's seat zone: roaming never stops there. */
export function inSeatZone(SM: StationMap, x: number, y: number): boolean {
  const fb = footBox(x, y);
  for (const rects of SM.seatZones.values()) for (const [a, b, c, d] of rects) if (fb[0] < c && fb[2] > a && fb[1] < d && fb[3] > b) return true;
  return false;
}

/** A random reachable open spot to wander to (inside the wander zone when there
 *  is one, never on a station's seat zone), or null. */
export function wanderTarget(SM: StationMap, rand: () => number = Math.random): [number, number] | null {
  const G = SM.grid;
  for (let k = 0; k < 200; k++) {
    const x = Math.floor(rand() * G.W), y = Math.floor(rand() * G.H), i = y * G.W + x;
    if (!G.open[i] || !SM.reach[i]) continue;
    const [cx, cy] = cellCentre(G, [x, y]);
    if (SM.wanderZone && !inside(SM.wanderZone, cx, cy)) continue;
    if (inSeatZone(SM, cx, cy)) continue;
    return [cx, cy];
  }
  return null;
}

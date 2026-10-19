// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Tiled map normalizer: TMX (with embedded or external TSX/TSJ tilesets) and
// TMJ (with embedded or external tilesets) become ONE normalized map model.
//
// Ported from the audited bridge viewer (the rendering oracle for TES PR-b):
// layer groups fold their offset/opacity/visibility into their children,
// infinite maps are cropped to their non-empty chunks, gids keep their flip
// bits, tilesets keep their native tile size, margin, spacing, offset and
// object alignment. Map inputs are read as they are; nothing is converted.
//
// Asset references are resolved against the PACK's own files, never against the
// author's disk: a reference such as "../../art/bridge.png" in a TSX resolves to
// the pack file at that relative path, else to the one pack file with the same
// name. So a map keeps working when the pack is copied anywhere.

import { parseXml, childOf, childrenOf, type XmlElement } from './xml';

export const FLIP_H = 0x80000000;
export const FLIP_V = 0x40000000;
export const FLIP_D = 0x20000000;
export const ROT_HEX = 0x10000000;
export const GID_MASK = 0x0fffffff;

export type DiagLevel = 'error' | 'warn' | 'info';
export interface Diagnostic { level: DiagLevel; message: string; }

export type Props = Record<string, string | number | boolean>;

export interface ImageRef {
  /** Pack-relative path of the resolved file (lower case, forward slashes). */
  path: string;
  /** Size as declared by the map/tileset (0 when not declared). */
  w: number;
  h: number;
}

export type ShapeKind = 'rect' | 'point' | 'ellipse' | 'polygon' | 'polyline';

export interface TiledObject {
  id: number;
  name: string;
  cls: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  /** Raw gid including flip bits (0 when the object is not a tile object). */
  gid: number;
  visible: boolean;
  props: Props;
  shape: ShapeKind;
  points: Array<[number, number]> | null;
}

export interface TiledTile {
  id: number;
  cls: string;
  props: Props;
  image: ImageRef | null;
  /** Sub-rectangle of a collection-of-images tile ([x, y, w, h]). */
  rect: [number, number, number, number] | null;
  /** The tile's own collision shapes, in tile-image pixels. */
  shapes: TiledObject[];
}

export interface TiledTileset {
  firstgid: number;
  name: string;
  tw: number;
  th: number;
  columns: number;
  margin: number;
  spacing: number;
  tilecount: number;
  align: string;
  offX: number;
  offY: number;
  image: ImageRef | null;
  tiles: Map<number, TiledTile>;
  /** Pack-relative path of the file the tileset was read from. */
  source: string;
  /** The tileset file could not be found: its gid range draws nothing. */
  missing?: boolean;
}

interface LayerBase {
  name: string;
  visible: boolean;
  opacity: number;
  ox: number;
  oy: number;
  props: Props;
}

export interface TileLayer extends LayerBase {
  kind: 'tile';
  w: number;
  h: number;
  data: number[];
  chunked?: boolean;
  cx?: number;
  cy?: number;
  rects?: Array<[number, number, number, number]>;
}

export interface ObjectLayer extends LayerBase {
  kind: 'object';
  order: string;
  objects: TiledObject[];
}

export interface ImageLayer extends LayerBase {
  kind: 'image';
  src: string | null;
}

export type MapLayer = TileLayer | ObjectLayer | ImageLayer;

export interface NormalizedMap {
  path: string;
  orientation: string;
  infinite: boolean;
  width: number;
  height: number;
  tw: number;
  th: number;
  props: Props;
  tilesets: TiledTileset[];
  layers: MapLayer[];
}

/** Read access to one pack's files (pack-relative paths). */
export interface PackFiles {
  /** Every file in the pack, as pack-relative paths. */
  list(): string[];
  /** A text file's contents, or null when it is not in the pack. */
  text(path: string): string | null;
}

// ───────────────────────── paths ─────────────────────────

export function normPath(p: string): string {
  const out: string[] = [];
  for (const seg of p.replace(/\\/g, '/').split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') out.pop(); else out.push(seg);
  }
  return out.join('/').toLowerCase();
}
const dirOf = (p: string) => { const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); };
const baseOf = (p: string) => p.replace(/\\/g, '/').split('/').pop()!.toLowerCase();

/** Resolve `rel` (as written in a file at `fromPath`) to a pack file, or null.
 *  The relative path first; else the one pack file with that file name. A
 *  Windows drive or absolute path is reduced to its file name. */
export function resolveAsset(files: PackFiles, fromPath: string, rel: string): string | null {
  const all = files.list().map((f) => [normPath(f), f] as const);
  const absolute = /^([a-zA-Z]:)?[\\/]/.test(rel);
  if (!absolute) {
    const want = normPath((dirOf(fromPath) ? dirOf(fromPath) + '/' : '') + rel);
    const hit = all.find(([k]) => k === want);
    if (hit) return hit[0];
  }
  const b = baseOf(rel);
  const named = all.filter(([k]) => baseOf(k) === b);
  return named.length === 1 ? named[0][0] : null;
}

// ───────────────────────── values ─────────────────────────

const num = (v: string | number | undefined | null, d = 0): number =>
  v === null || v === undefined || v === '' ? d : Number(v);

function xmlProps(el: XmlElement | undefined): Props {
  const out: Props = {};
  const ps = el && childOf(el, 'properties');
  if (ps) for (const p of childrenOf(ps, 'property')) {
    const t = p.attrs.type || 'string';
    let v: string | number | boolean = 'value' in p.attrs ? p.attrs.value : p.text;
    if (t === 'int' || t === 'float') v = Number(v); else if (t === 'bool') v = v === 'true';
    out[p.attrs.name] = v;
  }
  return out;
}

function jsonProps(arr: unknown): Props {
  const o: Props = {};
  if (Array.isArray(arr)) for (const p of arr) if (p && typeof p.name === 'string') o[p.name] = p.value;
  return o;
}

function xmlObject(o: XmlElement): TiledObject {
  const ob: TiledObject = {
    id: num(o.attrs.id), name: o.attrs.name || '',
    cls: o.attrs.class || o.attrs.type || '',
    x: num(o.attrs.x), y: num(o.attrs.y),
    width: num(o.attrs.width), height: num(o.attrs.height),
    rotation: num(o.attrs.rotation), gid: 'gid' in o.attrs ? Number(o.attrs.gid) >>> 0 : 0,
    visible: o.attrs.visible !== '0', props: xmlProps(o), shape: 'rect', points: null,
  };
  for (const c of o.children) {
    if (c.tag === 'point') ob.shape = 'point';
    else if (c.tag === 'ellipse') ob.shape = 'ellipse';
    else if (c.tag === 'polygon' || c.tag === 'polyline') {
      ob.shape = c.tag;
      ob.points = (c.attrs.points || '').trim().split(/\s+/).filter(Boolean)
        .map((pt) => pt.split(',').map(Number) as [number, number]);
    }
  }
  return ob;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jsonObject(o: any): TiledObject {
  const poly = o.polygon || o.polyline || null;
  return {
    id: o.id ?? 0, name: o.name || '', cls: o.class || o.type || '', x: o.x ?? 0, y: o.y ?? 0,
    width: o.width || 0, height: o.height || 0, rotation: o.rotation || 0,
    gid: o.gid ? o.gid >>> 0 : 0, visible: o.visible !== false, props: jsonProps(o.properties),
    shape: o.point ? 'point' : o.ellipse ? 'ellipse' : o.polygon ? 'polygon' : o.polyline ? 'polyline' : 'rect',
    points: poly ? poly.map((p: { x: number; y: number }) => [p.x, p.y] as [number, number]) : null,
  };
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64bytes(t: string): Uint8Array {
  const s = t.replace(/[\s=]/g, '');
  if (/[^A-Za-z0-9+/]/.test(s)) throw new Error('bad base64 tile data');
  const out = new Uint8Array(Math.floor(s.length * 3 / 4));
  let o = 0, acc = 0, bits = 0;
  for (const ch of s) {
    acc = (acc << 6) | B64.indexOf(ch); bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 0xff; }
  }
  return out.subarray(0, o);
}
function b64words(t: string): number[] {
  const b = b64bytes(t), out: number[] = [];
  for (let i = 0; i + 3 < b.length; i += 4) out.push((b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0);
  return out;
}

function decodeData(el: XmlElement, layerName: string, diags: Diagnostic[], enc = el.attrs.encoding, comp = el.attrs.compression): number[] {
  if (!enc) return childrenOf(el, 'tile').map((t) => Number(t.attrs.gid || 0) >>> 0);
  if (comp) {
    diags.push({ level: 'error', message: `Tile layer "${layerName}" uses ${comp} compression; theme packs need CSV or uncompressed base64 tile data.` });
    return [];
  }
  if (enc === 'csv') return el.text.trim().split(/[\s,]+/).filter(Boolean).map((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`bad CSV tile value "${v}" in layer "${layerName}"`);
    return n >>> 0;
  });
  if (enc === 'base64') return b64words(el.text);
  throw new Error(`unknown tile data encoding "${enc}" in layer "${layerName}"`);
}

// ───────────────────────── tilesets ─────────────────────────

function imageRef(files: PackFiles, from: string, src: string | undefined, w: number, h: number, owner: string, diags: Diagnostic[]): ImageRef | null {
  if (!src) return null;
  const path = resolveAsset(files, from, src);
  if (!path) {
    diags.push({ level: 'error', message: `Picture not found in the pack: "${src}" (used by ${owner}).` });
    return null;
  }
  return { path, w, h };
}

function parseTilesetXml(el: XmlElement, path: string, files: PackFiles, diags: Diagnostic[]): TiledTileset {
  if (el.tag !== 'tileset') throw new Error(`${path}: not a Tiled tileset`);
  const name = el.attrs.name || '';
  const ts: TiledTileset = {
    firstgid: 0, name, tw: num(el.attrs.tilewidth), th: num(el.attrs.tileheight),
    columns: num(el.attrs.columns), margin: num(el.attrs.margin), spacing: num(el.attrs.spacing),
    tilecount: num(el.attrs.tilecount), align: el.attrs.objectalignment || 'unspecified',
    offX: 0, offY: 0, image: null, tiles: new Map(), source: path,
  };
  for (const c of el.children) {
    if (c.tag === 'tileoffset') { ts.offX = num(c.attrs.x); ts.offY = num(c.attrs.y); }
    if (c.tag === 'image') ts.image = imageRef(files, path, c.attrs.source, num(c.attrs.width), num(c.attrs.height), `tileset "${name}"`, diags);
    if (c.tag === 'tile') {
      const id = num(c.attrs.id);
      const t: TiledTile = { id, cls: c.attrs.type || c.attrs.class || '', props: xmlProps(c), image: null, rect: null, shapes: [] };
      if ('width' in c.attrs) t.rect = [num(c.attrs.x), num(c.attrs.y), num(c.attrs.width), num(c.attrs.height)];
      for (const cc of c.children) {
        if (cc.tag === 'image') t.image = imageRef(files, path, cc.attrs.source, num(cc.attrs.width), num(cc.attrs.height), `tile ${id} of tileset "${name}"`, diags);
        if (cc.tag === 'objectgroup') for (const o of childrenOf(cc, 'object')) t.shapes.push(xmlObject(o));
      }
      ts.tiles.set(id, t);
    }
  }
  return ts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTilesetJson(j: any, path: string, files: PackFiles, diags: Diagnostic[]): TiledTileset {
  const name = j.name || '';
  const ts: TiledTileset = {
    firstgid: 0, name, tw: j.tilewidth, th: j.tileheight, columns: j.columns || 0, margin: j.margin || 0, spacing: j.spacing || 0,
    tilecount: j.tilecount || 0, align: j.objectalignment || 'unspecified', offX: j.tileoffset ? j.tileoffset.x : 0,
    offY: j.tileoffset ? j.tileoffset.y : 0,
    image: j.image ? imageRef(files, path, j.image, j.imagewidth || 0, j.imageheight || 0, `tileset "${name}"`, diags) : null,
    tiles: new Map(), source: path,
  };
  for (const t of j.tiles || []) {
    ts.tiles.set(t.id, {
      id: t.id, cls: t.type || t.class || '', props: jsonProps(t.properties),
      image: t.image ? imageRef(files, path, t.image, t.imagewidth || 0, t.imageheight || 0, `tile ${t.id} of tileset "${name}"`, diags) : null,
      rect: t.width !== undefined && t.image ? [t.x || 0, t.y || 0, t.width, t.height] : null,
      shapes: ((t.objectgroup && t.objectgroup.objects) || []).map(jsonObject),
    });
  }
  return ts;
}

function externalTileset(files: PackFiles, mapPath: string, src: string, firstgid: number, diags: Diagnostic[]): TiledTileset {
  const tsPath = resolveAsset(files, mapPath, src);
  const text = tsPath ? files.text(tsPath) : null;
  if (!tsPath || text === null) {
    diags.push({ level: 'error', message: `Tileset file not found in the pack: "${src}".` });
    return { firstgid, name: src, tw: 0, th: 0, columns: 0, margin: 0, spacing: 0, tilecount: 0, align: 'unspecified', offX: 0, offY: 0, image: null, tiles: new Map(), source: src, missing: true };
  }
  const ts = /\.(tsj|json)$/i.test(src)
    ? parseTilesetJson(JSON.parse(text), tsPath, files, diags)
    : parseTilesetXml(parseXml(text), tsPath, files, diags);
  ts.firstgid = firstgid;
  return ts;
}

// ───────────────────────── maps ─────────────────────────

/** Infinite maps: a layer's chunks become one grid starting at chunk square (cx, cy). */
function placeChunks(chunks: Array<{ x: number; y: number; w: number; h: number; data: number[] }>):
  Pick<TileLayer, 'w' | 'h' | 'data' | 'cx' | 'cy' | 'chunked' | 'rects'> {
  if (!chunks.length) return { w: 0, h: 0, data: [], cx: 0, cy: 0, chunked: true, rects: [] };
  const x0 = Math.min(...chunks.map((c) => c.x)), y0 = Math.min(...chunks.map((c) => c.y));
  const w = Math.max(...chunks.map((c) => c.x + c.w)) - x0, h = Math.max(...chunks.map((c) => c.y + c.h)) - y0;
  const data = new Array<number>(w * h).fill(0);
  for (const c of chunks) for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) data[(c.y - y0 + y) * w + (c.x - x0 + x)] = (c.data[y * c.w + x] ?? 0) >>> 0;
  const rects = chunks.filter((c) => c.data.some((v) => v & GID_MASK)).map((c) => [c.x, c.y, c.x + c.w, c.y + c.h] as [number, number, number, number]);
  return { w, h, data, cx: x0, cy: y0, chunked: true, rects };
}

/** Size an infinite map to its non-empty chunks (as Tiled's rasterizer does) and shift every layer onto it. */
function normaliseInfinite(M: NormalizedMap): void {
  const tl = M.layers.filter((l): l is TileLayer => l.kind === 'tile' && !!l.chunked);
  if (!tl.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of tl) for (const [a, b, c, d] of l.rects || []) { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); }
  if (x0 === Infinity) { x0 = 0; y0 = 0; x1 = M.width; y1 = M.height; }
  for (const l of M.layers) {
    l.ox -= x0 * M.tw; l.oy -= y0 * M.th;
    if (l.kind === 'tile' && l.chunked) { l.ox += (l.cx ?? 0) * M.tw; l.oy += (l.cy ?? 0) * M.th; }
  }
  M.width = x1 - x0; M.height = y1 - y0;
}

function parseTmx(text: string, path: string, files: PackFiles, diags: Diagnostic[]): NormalizedMap {
  const m = parseXml(text);
  if (m.tag !== 'map') throw new Error(`${path}: not a Tiled map`);
  const M: NormalizedMap = {
    path, orientation: m.attrs.orientation || 'orthogonal', infinite: m.attrs.infinite === '1',
    width: num(m.attrs.width), height: num(m.attrs.height),
    tw: num(m.attrs.tilewidth), th: num(m.attrs.tileheight), props: xmlProps(m), tilesets: [], layers: [],
  };
  for (const c of childrenOf(m, 'tileset')) {
    const first = num(c.attrs.firstgid);
    if (c.attrs.source) M.tilesets.push(externalTileset(files, path, c.attrs.source, first, diags));
    else { const ts = parseTilesetXml(c, path, files, diags); ts.firstgid = first; M.tilesets.push(ts); }
  }
  const walk = (parent: XmlElement, gx: number, gy: number, gop: number, gvis: boolean) => {
    for (const c of parent.children) {
      const base: LayerBase = {
        name: c.attrs.name || '', visible: c.attrs.visible !== '0' && gvis,
        opacity: num(c.attrs.opacity, 1) * gop, ox: gx + num(c.attrs.offsetx), oy: gy + num(c.attrs.offsety),
        props: xmlProps(c),
      };
      if (c.tag === 'layer') {
        const w = num(c.attrs.width), h = num(c.attrs.height);
        const d = childOf(c, 'data');
        if (d && d.children.some((x) => x.tag === 'chunk')) {
          const chunks = childrenOf(d, 'chunk').map((ch) => ({
            x: num(ch.attrs.x), y: num(ch.attrs.y), w: num(ch.attrs.width), h: num(ch.attrs.height),
            data: decodeData(ch, base.name, diags, d.attrs.encoding, d.attrs.compression),
          }));
          M.layers.push({ ...base, kind: 'tile', ...placeChunks(chunks) } as TileLayer);
        } else {
          const data = d ? decodeData(d, base.name, diags) : [];
          if (data.length && data.length !== w * h) throw new Error(`layer "${base.name}" has ${data.length} tiles, expected ${w}×${h}`);
          M.layers.push({ ...base, kind: 'tile', w, h, data });
        }
      } else if (c.tag === 'objectgroup') {
        M.layers.push({ ...base, kind: 'object', order: c.attrs.draworder || 'topdown', objects: childrenOf(c, 'object').map(xmlObject) });
      } else if (c.tag === 'imagelayer') {
        const im = childOf(c, 'image');
        M.layers.push({ ...base, kind: 'image', src: (im && im.attrs.source) || null });
      } else if (c.tag === 'group') walk(c, base.ox, base.oy, base.opacity, base.visible);
    }
  };
  walk(m, 0, 0, 1, true);
  normaliseInfinite(M);
  return M;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTmj(j: any, path: string, files: PackFiles, diags: Diagnostic[]): NormalizedMap {
  if (!j || typeof j !== 'object' || !Array.isArray(j.layers)) throw new Error(`${path}: not a Tiled JSON map`);
  const M: NormalizedMap = {
    path, orientation: j.orientation || 'orthogonal', infinite: !!j.infinite, width: j.width, height: j.height,
    tw: j.tilewidth, th: j.tileheight, props: jsonProps(j.properties), tilesets: [], layers: [],
  };
  for (const t of j.tilesets || []) {
    if (t.source) M.tilesets.push(externalTileset(files, path, t.source, t.firstgid, diags));
    else { const ts = parseTilesetJson(t, path, files, diags); ts.firstgid = t.firstgid; M.tilesets.push(ts); }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (arr: any[], gx: number, gy: number, gop: number, gvis: boolean) => {
    for (const l of arr || []) {
      const base: LayerBase = {
        name: l.name || '', visible: l.visible !== false && gvis, opacity: (l.opacity ?? 1) * gop,
        ox: gx + (l.offsetx || 0), oy: gy + (l.offsety || 0), props: jsonProps(l.properties),
      };
      if (l.type === 'tilelayer') {
        if (l.compression) {
          diags.push({ level: 'error', message: `Tile layer "${base.name}" uses ${l.compression} compression; theme packs need CSV or uncompressed base64 tile data.` });
          M.layers.push({ ...base, kind: 'tile', w: l.width || 0, h: l.height || 0, data: [] });
          continue;
        }
        const words = (d: unknown): number[] => typeof d === 'string' ? b64words(d) : ((d as number[]) || []).map((v) => v >>> 0);
        if (l.chunks) M.layers.push({ ...base, kind: 'tile', ...placeChunks(l.chunks.map((c: { x: number; y: number; width: number; height: number; data: unknown }) => ({ x: c.x, y: c.y, w: c.width, h: c.height, data: words(c.data) }))) } as TileLayer);
        else M.layers.push({ ...base, kind: 'tile', w: l.width, h: l.height, data: words(l.data) });
      } else if (l.type === 'objectgroup') M.layers.push({ ...base, kind: 'object', order: l.draworder || 'topdown', objects: (l.objects || []).map(jsonObject) });
      else if (l.type === 'imagelayer') M.layers.push({ ...base, kind: 'image', src: l.image || null });
      else if (l.type === 'group') walk(l.layers, base.ox, base.oy, base.opacity, base.visible);
    }
  };
  walk(j.layers, 0, 0, 1, true);
  normaliseInfinite(M);
  return M;
}

/** Parse a pack's map file (.tmx or .tmj) into the normalized model. A file that
 *  cannot be read at all throws; problems that leave a usable map are pushed to
 *  `diags` (level 'error' means the pack must not be used). */
export function parseMap(files: PackFiles, path: string, diags: Diagnostic[]): NormalizedMap {
  const text = files.text(path);
  if (text === null) throw new Error(`map file not found in the pack: "${path}"`);
  const M = /\.tmx$/i.test(path) ? parseTmx(text, normPath(path), files, diags) : parseTmj(JSON.parse(text), normPath(path), files, diags);
  if (M.orientation !== 'orthogonal') diags.push({ level: 'error', message: `The map is ${M.orientation}; theme packs need an orthogonal map.` });
  if (!(M.width > 0 && M.height > 0 && M.tw > 0 && M.th > 0)) throw new Error(`${path}: the map has no size`);
  for (const l of M.layers) if (l.kind === 'image' && l.src) {
    // an image layer is a tracing reference: never drawn, so a missing file is only information
    if (!resolveAsset(files, M.path, l.src)) diags.push({ level: 'info', message: `Image layer "${l.name}" refers to "${l.src}", which is not in the pack (it is not drawn).` });
  }
  return M;
}

// ───────────────────────── tiles ─────────────────────────

export interface ResolvedTile {
  ts: TiledTileset;
  tile: TiledTile | undefined;
  image: ImageRef | null;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  id: number;
  h: boolean;
  v: boolean;
  d: boolean;
}

/** The tileset, image and source rectangle a raw gid draws, with its flip bits. */
export function tileFor(M: NormalizedMap, raw: number): ResolvedTile | null {
  const gid = raw & GID_MASK;
  if (!gid) return null;
  let ts: TiledTileset | null = null;
  for (const t of M.tilesets) if (t.firstgid <= gid && (!ts || t.firstgid > ts.firstgid)) ts = t;
  if (!ts || ts.missing) return null; // a missing tileset keeps its gid range empty
  const id = gid - ts.firstgid;
  const t = ts.tiles.get(id);
  const flips = { h: !!(raw & FLIP_H), v: !!(raw & FLIP_V), d: !!(raw & FLIP_D) };
  if (t && t.image) {
    const [sx, sy, sw, sh] = t.rect || [0, 0, t.image.w, t.image.h];
    return { ts, tile: t, image: t.image, sx, sy, sw, sh, id, ...flips };
  }
  if (ts.image) {
    const cols = ts.columns || Math.max(1, Math.floor((ts.image.w - 2 * ts.margin + ts.spacing) / (ts.tw + ts.spacing)));
    return {
      ts, tile: t, image: ts.image, id, ...flips,
      sx: ts.margin + (id % cols) * (ts.tw + ts.spacing), sy: ts.margin + Math.floor(id / cols) * (ts.th + ts.spacing),
      sw: ts.tw, sh: ts.th,
    };
  }
  return { ts, tile: t, image: null, sx: 0, sy: 0, sw: ts.tw, sh: ts.th, id, ...flips };
}

const ALIGN: Record<string, [number, number]> = {
  topleft: [0, 0], top: [0.5, 0], topright: [1, 0], left: [0, 0.5], center: [0.5, 0.5], right: [1, 0.5],
  bottomleft: [0, 1], bottom: [0.5, 1], bottomright: [1, 1],
};

export interface ObjBox { T: ResolvedTile | null; x: number; y: number; w: number; h: number; }

/** The drawn box of a tile object, in map pixels (before rotation). */
export function objBox(M: NormalizedMap, o: TiledObject): ObjBox {
  const T = tileFor(M, o.gid);
  const a = ALIGN[(T && T.ts.align) || 'unspecified'] || [0, 1]; // orthogonal default: bottom-left
  const w = o.width || (T ? T.sw : 0), h = o.height || (T ? T.sh : 0);
  return { T, x: o.x - a[0] * w, y: o.y - a[1] * h, w, h };
}

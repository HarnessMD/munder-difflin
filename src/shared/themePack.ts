// Theme pack contract + PURE validator (docs/theming/THEME-PACK-INVENTORY.md §2).
//
// No fs, no Pixi, no Electron, no DOM: runs in main at scan time AND in the
// renderer before the scene touches a pack, and is unit-testable under plain
// node (like components/termColor.ts). It lives in src/shared because main
// cannot import renderer files; scene/office/themePack.ts re-exports it.

/** Theme identifiers are directory names on disk (§2.3). */
export type ThemeId = string;

/** Pack ids: lowercase, digits, hyphen; 2..40 chars. `_template` never matches. */
export const PACK_ID_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
/** Ids a pack may not use. `office` is the legacy alias for the first pack. */
export const RESERVED_PACK_IDS: readonly string[] = ['office', 'default', 'none'];
/** The built-in pack every fallback chain ends at. */
export const DEFAULT_THEME_ID: ThemeId = 'munder-difflin';
/** Legacy ids rewritten on config load (§4 step 0). */
export const LEGACY_THEME_ALIASES: Readonly<Record<string, ThemeId>> = { office: DEFAULT_THEME_ID };

/** Resolve a legacy alias; anything else passes through unchanged. */
export function normalizeThemeId(id: string): ThemeId {
  return Object.prototype.hasOwnProperty.call(LEGACY_THEME_ALIASES, id) ? LEGACY_THEME_ALIASES[id] : id;
}

export const SUPPORTED_SCHEMA = 1;

/** §2.4 hard limits. Enforced by main BEFORE bytes cross IPC and again here. */
export const PACK_LIMITS = {
  tileSize: 16,
  packBytes: 24 * 1024 * 1024,
  packWarnBytes: 12 * 1024 * 1024,
  manifestBytes: 256 * 1024,
  mapBytes: 2 * 1024 * 1024,
  tilesetBytes: 4 * 1024 * 1024,
  tilesetMaxWidth: 2048,
  tilesetMaxHeight: 8192,
  maxTilesets: 8,
  mapMinTiles: 8,
  mapMaxTiles: 128,
  unresolvedGidRatio: 0.05,
  previewBytes: 512 * 1024,
  fontBytes: 300 * 1024,
  maxFonts: 4,
  tokensBytes: 16 * 1024,
  terminalBytes: 64 * 1024,
  copyBytes: 256 * 1024,
} as const;

// ─── scene contract types (moved here so main + renderer share one source) ───
export interface Tile { x: number; y: number; }
export type Facing = 'up' | 'down' | 'left' | 'right';
export type ErrandKind =
  | 'water' | 'window' | 'dispenser' | 'fridge' | 'shelf' | 'bin' | 'smoke';

export interface ErrandSpot {
  kind: ErrandKind;
  stand: Tile;
  facing: Facing;
  fx: Tile;
  duration: number;
  godOnly?: boolean;
}
export interface MonitorConfig {
  offTopLeftGid: number;
  onGids: ReadonlyArray<readonly [number, number, number]>;
}
export interface CoffeeConfig {
  trayTile: Tile;
  trayStand: Tile;
  machineStand: Tile;
  sinkTile: Tile;
  sinkStand: Tile;
  maxCups: number;
}
export interface AnchorConfig { calendar: Tile; boards: Tile; clock: Tile; }

// ─── on-disk shapes ─────────────────────────────────────────────────────────
export interface Issue {
  level: 'error' | 'warn';
  code: string;
  path: string;
  message: string;
}

export interface PackManifestTileset {
  file: string;
  embedded?: boolean;
  firstgid?: number;
  /** Tiled `image` label written into the patched tileset metadata. Optional;
   *  defaults to the file's base name. (Spec deviation: needed so pack #1 is
   *  byte-equivalent to the legacy 'a5' / 'interiors' labels.) */
  image?: string;
}

/** == theme.json, 1:1 (§2.7). */
export interface PackManifest {
  schema: 1;
  id: ThemeId;
  name: string;
  version: string;
  author: string;
  license: string;
  blurb?: string;
  swatch?: string;
  map: string;
  tilesets: PackManifestTileset[];
  seats: { primary: string[]; cafe: string[]; cafeStands: [string, 'coffee' | 'vending'][] };
  coffee?: CoffeeConfig;
  anchors: AnchorConfig;
  errandSpots: ErrandSpot[];
  monitor: MonitorConfig;
  palette: { background: string; noteColors: Record<string, string> };
  fonts?: { family: string; file: string; weight?: string; slot?: 'display' | 'ui' | 'mono' }[];
  chrome?: { tokens?: string; defaultMode?: 'light' | 'dark' };
  terminal?: string;
  copy?: { appName?: string; godName?: string };
  cast?: { roster: string; default: string };
}

/** What main returns over IPC: manifest + the already size-checked bytes. */
export interface PackPayload {
  manifest: PackManifest;
  files: Record<string, Uint8Array>;
  source: 'builtin' | 'user' | 'dev';
  issues: Issue[];
}

export interface PackSummary {
  id: ThemeId;
  name: string;
  version: string;
  blurb?: string;
  swatch?: string;
  source: 'builtin' | 'user' | 'dev';
  /** False when the pack has an error issue (picker shows it greyed out). */
  available: boolean;
  issues: Issue[];
}

/** Atlas metadata the loader derives from the PNG header (never trusted from the manifest). */
export interface ResolvedTileset {
  file: string;
  embedded?: boolean;
  /** Absent for the embedded atlas — the map keeps its own inline metadata. */
  meta?: {
    firstgid: number;
    image: string;
    imagewidth: number;
    imageheight: number;
    tilewidth: number;
    tileheight: number;
    columns: number;
    tilecount: number;
  };
}

/** The validator's success value: everything the renderer needs, still bytes-free. */
export interface ValidatedPack {
  manifest: PackManifest;
  /** map.tmj decoded as UTF-8 — handed to the scene as `mapRaw`. */
  mapRaw: string;
  tilesets: ResolvedTileset[];
  /** `copy` / fonts / tokens that passed validation (carried, applied elsewhere). */
  tokensCss?: string;
}

export interface ValidateInput {
  /** The directory name the pack was found under. */
  dirName: string;
  /** pack-relative path -> bytes. Only files main chose to read are present. */
  files: Record<string, Uint8Array>;
}
export interface ValidateResult { pack: ValidatedPack | null; issues: Issue[]; }

// ─── helpers ────────────────────────────────────────────────────────────────
const REQUIRED_TILE_LAYERS = ['floor', 'walls', 'furniture-below', 'furniture-above', 'collision'] as const;
const REQUIRED_OBJECT_LAYERS = ['spawn-points', 'zones'] as const;
const FACINGS: readonly string[] = ['up', 'down', 'left', 'right'];
const ERRAND_KINDS: readonly string[] = ['water', 'window', 'dispenser', 'fridge', 'shelf', 'bin', 'smoke'];
const NOTE_KEYS = ['todo', 'doing', 'blocked', 'done'] as const;
const TILESET_PATH_RE = /^tilesets\/[a-z0-9._-]+\.png$/;
const FONT_PATH_RE = /^chrome\/fonts\/[a-z0-9._-]+\.woff2$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const FLIP_MASK = 0x1fffffff;

/** Path-safety for every manifest-referenced file: relative, no `..`, no
 *  absolute, no backslash, no NUL, no empty segment. */
export function isSafeRelPath(p: unknown): p is string {
  if (typeof p !== 'string' || p.length === 0 || p.length > 200) return false;
  if (p.includes('\0') || p.includes('\\') || p.startsWith('/') || /^[a-zA-Z]:/.test(p)) return false;
  return p.split('/').every((seg) => seg !== '' && seg !== '.' && seg !== '..');
}

/** Width/height from a PNG's IHDR, or null if the bytes are not a PNG. */
export function readPngHeader(b: Uint8Array): { width: number; height: number; colorType: number } | null {
  if (b.length < 26) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (b[i] !== sig[i]) return null;
  // chunk type at 12..15 must be IHDR
  if (b[12] !== 0x49 || b[13] !== 0x48 || b[14] !== 0x44 || b[15] !== 0x52) return null;
  const u32 = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  return { width: u32(16), height: u32(20), colorType: b[25] };
}

/** `#rrggbb` -> number (the in-memory PaletteConfig form). */
export function hexToNumber(hex: string): number {
  return parseInt(hex.slice(1), 16);
}
/** number -> `#rrggbb` (used by the pack generator). */
export function numberToHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isTile = (v: unknown): v is Tile => isObj(v) && isInt(v.x) && isInt(v.y);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

interface TiledLayerLike {
  name?: unknown; type?: unknown; data?: unknown; encoding?: unknown; compression?: unknown;
  objects?: unknown; width?: unknown; height?: unknown;
}

const decodeUtf8 = (b: Uint8Array): string => new TextDecoder('utf-8').decode(b);

// ─── validatePack ───────────────────────────────────────────────────────────
/** §2.5. Pure. Errors reject the pack whole (`pack: null`); warnings load and
 *  the one field falls back (dropped from the manifest the caller receives). */
export function validatePack(input: ValidateInput): ValidateResult {
  const issues: Issue[] = [];
  const err = (code: string, path: string, message: string) => issues.push({ level: 'error', code, path, message });
  const warn = (code: string, path: string, message: string) => issues.push({ level: 'warn', code, path, message });
  const fail = (): ValidateResult => ({ pack: null, issues });
  const { dirName, files } = input;

  if (typeof dirName !== 'string' || !PACK_ID_RE.test(dirName)) {
    err('bad-dir-name', '', `directory name '${String(dirName)}' is not a valid pack id`);
    return fail();
  }
  if (RESERVED_PACK_IDS.includes(dirName)) {
    err('reserved-id', '', `'${dirName}' is a reserved id`);
    return fail();
  }

  // total size
  let total = 0;
  for (const k of Object.keys(files)) total += files[k].byteLength;
  if (total > PACK_LIMITS.packBytes) {
    err('pack-too-large', '', `pack is ${total} bytes (max ${PACK_LIMITS.packBytes})`);
    return fail();
  }
  if (total > PACK_LIMITS.packWarnBytes) warn('pack-large', '', `pack is ${total} bytes (soft limit ${PACK_LIMITS.packWarnBytes})`);

  // ── manifest ──
  const manifestBytes = files['theme.json'];
  if (!manifestBytes) { err('missing-manifest', 'theme.json', 'theme.json is missing'); return fail(); }
  if (manifestBytes.byteLength > PACK_LIMITS.manifestBytes) {
    err('manifest-too-large', 'theme.json', 'theme.json is over the size limit'); return fail();
  }
  let rawManifest: unknown;
  try { rawManifest = JSON.parse(decodeUtf8(manifestBytes)); } catch (e) {
    err('bad-manifest', 'theme.json', `theme.json is not valid JSON: ${(e as Error).message}`); return fail();
  }
  if (!isObj(rawManifest)) { err('bad-manifest', 'theme.json', 'theme.json must be an object'); return fail(); }
  const m = rawManifest;

  if (!isInt(m.schema)) { err('bad-schema', 'schema', 'schema must be an integer'); return fail(); }
  if (m.schema > SUPPORTED_SCHEMA || m.schema < 1) {
    err('unsupported-schema', 'schema', `schema ${m.schema} is not supported (this build reads 1..${SUPPORTED_SCHEMA})`);
    return fail();
  }
  if (m.id !== dirName) {
    err('id-mismatch', 'id', `id '${String(m.id)}' must equal the directory name '${dirName}'`); return fail();
  }
  for (const k of ['name', 'version', 'author', 'license'] as const) {
    if (!isStr(m[k])) err('missing-field', k, `'${k}' is required and must be a non-empty string`);
  }
  if (isStr(m.version) && !SEMVER_RE.test(m.version)) err('bad-version', 'version', `'${m.version}' is not semver`);
  if (m.swatch !== undefined && !(typeof m.swatch === 'string' && HEX_RE.test(m.swatch))) {
    warn('bad-swatch', 'swatch', 'swatch must be #rrggbb; ignored');
    delete m.swatch;
  }
  if (m.map !== 'map.tmj') err('bad-map-name', 'map', "map must be exactly 'map.tmj'");

  // seats / anchors / palette / monitor are structurally required
  const seats = m.seats;
  if (!isObj(seats) || !Array.isArray(seats.primary) || !Array.isArray(seats.cafe) || !Array.isArray(seats.cafeStands)) {
    err('bad-seats', 'seats', 'seats.primary, seats.cafe and seats.cafeStands arrays are required');
  } else {
    const names = [...(seats.primary as unknown[]), ...(seats.cafe as unknown[])];
    if (!names.every(isStr)) err('bad-seats', 'seats', 'seat names must be non-empty strings');
    for (const cs of seats.cafeStands as unknown[]) {
      if (!(Array.isArray(cs) && cs.length === 2 && isStr(cs[0]) && (cs[1] === 'coffee' || cs[1] === 'vending'))) {
        err('bad-seats', 'seats.cafeStands', 'cafeStands entries must be [name, "coffee"|"vending"]');
        break;
      }
    }
  }
  const anchors = m.anchors;
  if (!isObj(anchors) || !isTile(anchors.calendar) || !isTile(anchors.boards) || !isTile(anchors.clock)) {
    err('bad-anchors', 'anchors', 'anchors.calendar/boards/clock tiles are required');
  }
  const palette = m.palette;
  if (!isObj(palette) || typeof palette.background !== 'string' || !HEX_RE.test(palette.background) ||
      !isObj(palette.noteColors)) {
    err('bad-palette', 'palette', 'palette.background (#rrggbb) and palette.noteColors are required');
  } else {
    for (const [k, v] of Object.entries(palette.noteColors)) {
      if (!(NOTE_KEYS as readonly string[]).includes(k) || typeof v !== 'string' || !HEX_RE.test(v)) {
        err('bad-palette', `palette.noteColors.${k}`, 'noteColors keys must be todo/doing/blocked/done with #rrggbb values');
      }
    }
  }
  if (!Array.isArray(m.errandSpots)) err('bad-errands', 'errandSpots', 'errandSpots must be an array');
  if (!Array.isArray(m.tilesets) || m.tilesets.length < 1) {
    err('bad-tilesets', 'tilesets', 'at least one tileset is required');
  } else if (m.tilesets.length > PACK_LIMITS.maxTilesets) {
    err('too-many-tilesets', 'tilesets', `${m.tilesets.length} tilesets (max ${PACK_LIMITS.maxTilesets})`);
  }
  // Stop here when the manifest skeleton is unusable: later checks index into it.
  if (issues.some((i) => i.level === 'error')) return fail();

  const manifest = m as unknown as PackManifest;

  // ── map ──
  const mapBytes = files['map.tmj'];
  if (!mapBytes) { err('missing-map', 'map.tmj', 'map.tmj is missing'); return fail(); }
  if (mapBytes.byteLength > PACK_LIMITS.mapBytes) {
    err('map-too-large', 'map.tmj', `map.tmj is ${mapBytes.byteLength} bytes (max ${PACK_LIMITS.mapBytes})`); return fail();
  }
  const mapRaw = decodeUtf8(mapBytes);
  let map: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(mapRaw);
    if (!isObj(parsed)) throw new Error('not an object');
    map = parsed;
  } catch (e) {
    err('bad-map', 'map.tmj', `map.tmj is not valid Tiled JSON: ${(e as Error).message}`); return fail();
  }
  const mw = map.width, mh = map.height;
  if (map.tilewidth !== PACK_LIMITS.tileSize || map.tileheight !== PACK_LIMITS.tileSize) {
    err('bad-tile-size', 'map.tmj', `tilewidth/tileheight must be ${PACK_LIMITS.tileSize}`);
  }
  if (map.infinite !== false && map.infinite !== undefined) err('infinite-map', 'map.tmj', 'infinite maps are not supported');
  if (map.orientation !== 'orthogonal') err('bad-orientation', 'map.tmj', 'map must be orthogonal');
  if (!isInt(mw) || !isInt(mh) || mw < PACK_LIMITS.mapMinTiles || mh < PACK_LIMITS.mapMinTiles ||
      mw > PACK_LIMITS.mapMaxTiles || mh > PACK_LIMITS.mapMaxTiles) {
    err('bad-map-size', 'map.tmj', `map must be ${PACK_LIMITS.mapMinTiles}..${PACK_LIMITS.mapMaxTiles} tiles per side`);
  }
  const layers = Array.isArray(map.layers) ? (map.layers as TiledLayerLike[]) : [];
  const byName = new Map<string, TiledLayerLike>();
  for (const l of layers) if (isObj(l) && typeof l.name === 'string') byName.set(l.name, l);
  for (const n of REQUIRED_TILE_LAYERS) {
    const l = byName.get(n);
    if (!l || l.type !== 'tilelayer') err('missing-layer', 'map.tmj', `required tilelayer '${n}' is missing`);
    else if (!Array.isArray(l.data) || l.encoding !== undefined || l.compression !== undefined) {
      err('encoded-layer', 'map.tmj', `layer '${n}' must use a plain-array data (no base64/zlib)`);
    }
  }
  for (const n of REQUIRED_OBJECT_LAYERS) {
    const l = byName.get(n);
    if (!l || l.type !== 'objectgroup') err('missing-layer', 'map.tmj', `required objectgroup '${n}' is missing`);
  }
  if (issues.some((i) => i.level === 'error')) return fail();

  // spawn points
  const spawnNames = new Set<string>();
  const sp = byName.get('spawn-points');
  if (sp && Array.isArray(sp.objects)) {
    for (const o of sp.objects as unknown[]) if (isObj(o) && typeof o.name === 'string') spawnNames.add(o.name);
  }
  if (!spawnNames.has('desk-ceo')) err('missing-desk-ceo', 'map.tmj', "spawn point 'desk-ceo' (god's seat) is required");
  if (manifest.seats.primary[0] !== 'desk-ceo') err('bad-seats', 'seats.primary', "seats.primary[0] must be 'desk-ceo'");
  if (manifest.seats.primary.length < 2) err('bad-seats', 'seats.primary', 'seats.primary needs desk-ceo plus at least one more seat');
  const seatRefs: string[] = [
    ...manifest.seats.primary, ...manifest.seats.cafe, ...manifest.seats.cafeStands.map((c) => c[0]),
  ];
  for (const n of seatRefs) {
    if (!spawnNames.has(n)) err('missing-spawn', `seats`, `seat '${n}' has no matching spawn point in the map`);
  }

  // ── tilesets ──
  const tsFiles: ResolvedTileset[] = [];
  const mapTilesets = Array.isArray(map.tilesets) ? (map.tilesets as Record<string, unknown>[]) : [];
  /** [firstgid, endExclusive) per resolved tileset, for the gid check. */
  const ranges: Array<[number, number]> = [];
  let prevEnd = 1;
  manifest.tilesets.forEach((t, i) => {
    const where = `tilesets[${i}]`;
    if (!isObj(t) || !isSafeRelPath(t.file) || !TILESET_PATH_RE.test(t.file)) {
      err('bad-tileset-path', where, 'tileset file must match tilesets/<[a-z0-9._-]>.png');
      return;
    }
    const bytes = files[t.file];
    if (!bytes) { err('missing-tileset', where, `tileset '${t.file}' is missing`); return; }
    if (bytes.byteLength > PACK_LIMITS.tilesetBytes) {
      err('tileset-too-large', where, `'${t.file}' is ${bytes.byteLength} bytes (max ${PACK_LIMITS.tilesetBytes})`); return;
    }
    const hdr = readPngHeader(bytes);
    if (!hdr) { err('tileset-not-png', where, `'${t.file}' is not a PNG`); return; }
    const ts = PACK_LIMITS.tileSize;
    if (hdr.width % ts !== 0 || hdr.height % ts !== 0 || hdr.width === 0 || hdr.height === 0) {
      err('tileset-bad-dims', where, `'${t.file}' is ${hdr.width}x${hdr.height}; width and height must be multiples of ${ts}`); return;
    }
    if (hdr.width > PACK_LIMITS.tilesetMaxWidth || hdr.height > PACK_LIMITS.tilesetMaxHeight) {
      err('tileset-too-big', where, `'${t.file}' is ${hdr.width}x${hdr.height} (max ${PACK_LIMITS.tilesetMaxWidth}x${PACK_LIMITS.tilesetMaxHeight})`); return;
    }
    if (hdr.colorType !== 6) warn('tileset-not-rgba', where, `'${t.file}' is not RGBA (colour type ${hdr.colorType})`);
    const columns = hdr.width / ts;
    const derivedCount = columns * (hdr.height / ts);
    if (t.embedded) {
      const inline = mapTilesets[i];
      if (!inline || !isInt(inline.firstgid) || inline.source !== undefined) {
        err('bad-embedded', where, `embedded tileset needs inline metadata at map.tilesets[${i}]`);
        return;
      }
      const count = isInt(inline.tilecount) ? inline.tilecount : derivedCount;
      ranges.push([inline.firstgid, inline.firstgid + count]);
      prevEnd = inline.firstgid + count;
      tsFiles.push({ file: t.file, embedded: true });
      return;
    }
    const firstgid = t.firstgid ?? prevEnd;
    if (!isInt(firstgid) || firstgid < 1 || firstgid < prevEnd) {
      err('bad-firstgid', where, `firstgid ${String(firstgid)} overlaps the previous tileset (must be >= ${prevEnd})`);
      return;
    }
    const image = typeof t.image === 'string' && t.image ? t.image : t.file.replace(/^tilesets\//, '').replace(/\.png$/, '');
    ranges.push([firstgid, firstgid + derivedCount]);
    prevEnd = firstgid + derivedCount;
    tsFiles.push({
      file: t.file,
      meta: {
        firstgid, image, imagewidth: hdr.width, imageheight: hdr.height,
        tilewidth: ts, tileheight: ts, columns, tilecount: derivedCount,
      },
    });
  });
  if (issues.some((i) => i.level === 'error')) return fail();

  // ── gid resolution (flip bits masked) ──
  let nonZero = 0, unresolved = 0;
  for (const n of REQUIRED_TILE_LAYERS) {
    for (const raw of (byName.get(n)!.data as unknown[])) {
      const gid = (typeof raw === 'number' ? raw : 0) & FLIP_MASK;
      if (gid === 0) continue;
      nonZero++;
      if (!ranges.some(([a, b]) => gid >= a && gid < b)) unresolved++;
    }
  }
  if (unresolved > 0) {
    if (nonZero > 0 && unresolved / nonZero > PACK_LIMITS.unresolvedGidRatio) {
      err('unresolved-gids', 'map.tmj', `${unresolved}/${nonZero} tile gids fall outside every tileset (max ${PACK_LIMITS.unresolvedGidRatio * 100}%)`);
      return fail();
    }
    warn('unresolved-gids', 'map.tmj', `${unresolved} tile gids fall outside every tileset and will be skipped`);
  }

  // ── optional fields: warn + drop ──
  const W = mw as number, H = mh as number;
  const collision = byName.get('collision')!.data as number[];
  const inBounds = (t: Tile) => t.x >= 0 && t.y >= 0 && t.x < W && t.y < H;
  const blocked = (t: Tile) => ((collision[t.y * W + t.x] ?? 0) & FLIP_MASK) !== 0;
  const standOk = (t: unknown): t is Tile => isTile(t) && inBounds(t) && !blocked(t);

  const out: PackManifest = { ...manifest };

  const c = manifest.coffee;
  if (c !== undefined) {
    const okTiles = isObj(c) && [c.trayTile, c.sinkTile].every((t) => isTile(t) && inBounds(t as Tile)) &&
      [c.trayStand, c.machineStand, c.sinkStand].every(standOk) && isInt(c.maxCups) && c.maxCups >= 0;
    if (!okTiles) { warn('bad-coffee', 'coffee', 'coffee config is invalid; coffee loop disabled'); delete out.coffee; }
  }

  out.errandSpots = manifest.errandSpots.filter((s, i) => {
    const ok = isObj(s) && ERRAND_KINDS.includes(s.kind as string) && FACINGS.includes(s.facing as string) &&
      standOk(s.stand) && isTile(s.fx) && typeof s.duration === 'number' && s.duration > 0;
    if (!ok) warn('bad-errand', `errandSpots[${i}]`, 'errand spot is invalid or its stand tile is out of bounds / blocked; dropped');
    return ok;
  });

  const mon = manifest.monitor;
  const monOk = isObj(mon) && isInt(mon.offTopLeftGid) && Array.isArray(mon.onGids) &&
    mon.onGids.every((g) => Array.isArray(g) && g.length === 3 && g.every(isInt));
  if (!monOk) {
    warn('bad-monitor', 'monitor', 'monitor config is invalid; desks render without the ON overlay');
    out.monitor = { offTopLeftGid: 0, onGids: [] };
  }

  // fonts / tokens / terminal / copy: ignored (not rejected) when bad
  let tokensCss: string | undefined;
  if (manifest.fonts !== undefined) {
    const good = (Array.isArray(manifest.fonts) ? manifest.fonts : []).filter((f, i) => {
      const ok = isObj(f) && isStr(f.family) && isSafeRelPath(f.file) && FONT_PATH_RE.test(f.file) &&
        !!files[f.file] && files[f.file].byteLength <= PACK_LIMITS.fontBytes;
      if (!ok) warn('bad-font', `fonts[${i}]`, 'font ignored (woff2 under chrome/fonts, <= 300 KB)');
      return ok;
    }).slice(0, PACK_LIMITS.maxFonts);
    out.fonts = good;
  }
  if (manifest.chrome?.tokens !== undefined) {
    const p = manifest.chrome.tokens;
    const b = isSafeRelPath(p) ? files[p] : undefined;
    const css = b ? decodeUtf8(b) : '';
    const ok = !!b && b.byteLength <= PACK_LIMITS.tokensBytes && !/url\s*\(/i.test(css) && !/@import/i.test(css);
    if (!ok) { warn('bad-tokens', 'chrome.tokens', 'tokens.css ignored (missing, > 16 KB, url() or @import)'); out.chrome = { ...out.chrome, tokens: undefined }; }
    else tokensCss = css;
  }
  if (manifest.cast !== undefined) {
    warn('cast-unsupported', 'cast', 'disk casts are not loaded in this build; the default roster is used');
    delete out.cast;
  }
  if (tsFiles.length > 0 && !manifest.license) warn('no-license', 'license', 'pack uses tilesets but declares no license');

  return { pack: { manifest: out, mapRaw, tilesets: tsFiles, tokensCss }, issues };
}

/** Convenience for callers that only need to know if a pack is usable. */
export const hasErrors = (issues: readonly Issue[]): boolean => issues.some((i) => i.level === 'error');

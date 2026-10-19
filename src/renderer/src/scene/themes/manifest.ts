// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Theme pack manifest (theme.json): the declarative contract of a theme pack.
//
// A pack is data only — JSON, maps, tilesets and pictures. It never ships code:
// `sceneKind` picks one of the host's own vetted scene renderers. The office is
// the built-in pack and the guaranteed fallback: a pack that fails validation
// (or whose files fail to load) renders the office with a diagnostic instead.

import type { Diagnostic } from './tiled';

export const OFFICE_THEME_ID = 'office';

/** Scene renderers the host provides. A pack picks one; it cannot add one. */
export const SCENE_KINDS = ['office', 'stations'] as const;
export type SceneKind = typeof SCENE_KINDS[number];

export type Facing = 'down' | 'up' | 'left' | 'right';
export const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];
/** The side of a chair its sitter walks in from, relative to the way they face. */
export type Approach = 'front' | 'back' | 'left' | 'right';
export const APPROACHES: readonly Approach[] = ['front', 'back', 'left', 'right'];

/** Rows of a character sheet: a stand and a sit frame per facing. */
export interface SpriteRows {
  down: number; up: number; left: number; right: number;
  sitDown: number; sitUp: number; sitLeft: number; sitRight: number;
}

export interface SpriteRendererSpec {
  kind: 'sheet';
  /** Pack-relative path of the character sheet picture. */
  sheet: string;
  frameWidth: number;
  frameHeight: number;
  rows: SpriteRows;
}

export interface StationSeatSpec {
  /** The way a sitter faces; else the seat's map property, else 'down'. */
  facing?: Facing;
  /** A free-form role tag (bubble lines, later PRs). */
  role?: string;
  /** The side the sitter walks in from; else the front when it is open, then the sides, then the back. */
  approach?: Approach;
}

export interface StationsSpec {
  /** Object layer holding the station points and the entrance point. */
  layer: string;
  /** Name of the entrance point in that layer. */
  entrance: string;
  /** The orchestrator's station (seated first, and only by the orchestrator). */
  captain?: string;
  /** The seat fill order. Stations not listed are never assigned. */
  seatOrder: string[];
  /** Point names in the layer that are not stations (e.g. a coffee spot). */
  exclude?: string[];
  seats?: Record<string, StationSeatSpec>;
}

/** Idle agents' coffee runs. The spots come from the map (named points) or,
 *  for a map that has none, from here (map pixels). At least one brew spot. */
export interface CoffeeSpec {
  /** Point names in the stations layer where coffee is made (each is a brew spot, never a station). */
  brew?: string[];
  /** Brew spots given inline, [x, y] in map pixels (snapped to the floor like named points; a spot in a seat zone is dropped). */
  brewAt?: Array<[number, number]>;
  /** An object layer of points named after stations: where each station's mug is parked. */
  mugLayer?: string;
  /** Mug spots given inline, by station name, [x, y] in map pixels; for the stations it names, it wins over mugLayer. */
  mugs?: Record<string, [number, number]>;
  /** Per agent: seconds from the start of one coffee run to the next, [min, max] (default [180, 300]). */
  cooldown?: [number, number];
}

export interface NavigationSpec {
  /** Walk-grid cell size in pixels (default 4). */
  walkGrid?: number;
  /** Name of a zone shape (in `zonesLayer`) that limits where idle agents wander. */
  wanderZone?: string;
  zonesLayer?: string;
}

/** The recolourable parts of a body. */
export type LookPart = 'skin' | 'shirt' | 'hair';
export const LOOK_PARTS: readonly LookPart[] = ['skin', 'shirt', 'hair'];
export type LookColors = Record<LookPart, string>;

/** The exact sheet colours that make up one part of a body. Each shade is
 *  recoloured from the chosen colour (the main shade becomes it), so the
 *  sheet's shading survives. */
export interface PartSpec {
  main: string;
  /** Every shade of the part, main included (#rrggbb). */
  shades: string[];
  /** Hair only: the hair is drawn in the outline colour, so it is found by
   *  shape (inner outline pixels joined to the top of the head). */
  byShape?: boolean;
}

/** A body's head-and-shoulders picture for cards: a sheet frame and a box in it. */
export interface PortraitSpec {
  /** Sheet row of the front-facing frame (default spriteRenderer.rows.down). */
  row?: number;
  /** [x, y, w, h] inside the frame. */
  crop: [number, number, number, number];
}

export interface BuilderBody {
  id: string;
  label: string;
  /** sheet column */
  column: number;
  parts?: Partial<Record<LookPart, PartSpec>>;
  portrait?: PortraitSpec;
}

export interface BuilderPreset {
  id: string;
  label?: string;
  bodyId?: string;
  colors?: Partial<LookColors>;
  /** Station this preset's agents take first (seat affinity). */
  seat?: string;
}

export interface BuilderSpec {
  /** The sheet's line colour: never recoloured; dark shades keep contrast to it. */
  outline?: string;
  /** The sheet's eye colour: never part of hair found by shape. */
  eyes?: string;
  /** Named swatches per part, offered by the builder. */
  swatches?: Partial<Record<LookPart, Record<string, string>>>;
  /** Whether a colour outside the swatches may be chosen (default true). */
  customColours?: boolean;
  bodies?: BuilderBody[];
  presets?: BuilderPreset[];
  /** The look of an agent whose saved look is unusable. */
  defaults?: { bodyId?: string; colors?: Partial<LookColors> };
  /** The look shown on onboarding's sample cards. */
  sample?: AppearanceSeed;
}

export interface AppearanceSeed {
  bodyId: string;
  colors?: { skin?: string; shirt?: string; hair?: string };
  presetId?: string;
}

export interface ProjectDefaults {
  orchestrator?: { name: string; appearance: AppearanceSeed };
}

export interface PaletteSpec {
  /** Canvas clear colour, #rrggbb. */
  background: string;
}

export interface ThemeManifest {
  schema: 1;
  id: string;
  label: string;
  sceneKind: SceneKind;
  /** Pack-relative path of the map (.tmx or .tmj). */
  map: string;
  palette: PaletteSpec;
  stations: StationsSpec;
  navigation: NavigationSpec;
  spriteRenderer: SpriteRendererSpec;
  /** Informational: licence and provenance notes for the pack's art. */
  assets?: { license?: string; attribution?: string };
  builder?: BuilderSpec;
  projectDefaults?: ProjectDefaults;
  /** Idle agents' coffee runs; without it idle agents only wander and chat. */
  coffee?: CoffeeSpec;
  /** Pack-relative paths of optional text files (e.g. bubble lines). */
  text?: Record<string, string>;
}

export interface ManifestResult {
  manifest: ThemeManifest | null;
  diagnostics: Diagnostic[];
}

const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const COLOUR_RE = /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|[a-z0-9][a-z0-9-]{0,39})$/;
const TOP_KEYS = new Set(['schema', 'id', 'label', 'sceneKind', 'map', 'palette', 'stations', 'navigation', 'spriteRenderer',
  'assets', 'builder', 'projectDefaults', 'coffee', 'text', '$comment']);
const ROW_KEYS: Array<keyof SpriteRows> = ['down', 'up', 'left', 'right', 'sitDown', 'sitUp', 'sitLeft', 'sitRight'];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown, max = 200): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
/** A pack-relative file path: no drive, no leading slash, no "..". */
const isPackPath = (v: unknown): v is string => isStr(v, 260) && !/^([a-zA-Z]:)?[\\/]/.test(v) && !v.split(/[\\/]/).includes('..');

/** Validate a parsed theme.json. Errors make the pack unusable (manifest null);
 *  a bad OPTIONAL section is dropped with a warning and the rest still loads. */
export function validateManifest(raw: unknown, packDir = ''): ManifestResult {
  const diags: Diagnostic[] = [];
  const where = packDir ? `${packDir}/theme.json` : 'theme.json';
  const err = (m: string) => diags.push({ level: 'error', message: `${where}: ${m}` });
  const warn = (m: string) => diags.push({ level: 'warn', message: `${where}: ${m}` });
  if (!isObj(raw)) { err('not a JSON object'); return { manifest: null, diagnostics: diags }; }
  for (const k of Object.keys(raw)) if (!TOP_KEYS.has(k)) warn(`unknown key "${k}" is ignored`);
  if (raw.schema !== 1) err('"schema" must be 1');
  if (!isStr(raw.id) || !ID_RE.test(raw.id)) err('"id" must be 1-40 characters of a-z, 0-9 and "-", starting with a letter or digit');
  else if (raw.id === OFFICE_THEME_ID) err('"office" is the built-in theme; a pack cannot replace it');
  if (!isStr(raw.label, 40)) err('"label" must be a non-empty string of at most 40 characters');
  if (!SCENE_KINDS.includes(raw.sceneKind as SceneKind) || raw.sceneKind === 'office') err(`"sceneKind" must be "stations" (the scene renderers a pack can use)`);
  if (!isPackPath(raw.map) || !/\.(tmx|tmj)$/i.test(raw.map)) err('"map" must be a pack-relative .tmx or .tmj path');

  const pal = raw.palette;
  if (!isObj(pal) || !isStr(pal.background) || !HEX_RE.test(pal.background)) err('"palette.background" must be a #rrggbb colour');

  const st = raw.stations;
  let stations: StationsSpec | null = null;
  if (!isObj(st)) err('"stations" is missing');
  else {
    const ok0 = diags.length;
    if (!isStr(st.layer)) err('"stations.layer" must name an object layer');
    if (!isStr(st.entrance)) err('"stations.entrance" must name a point');
    const order = st.seatOrder;
    if (!Array.isArray(order) || !order.length || !order.every((s) => isStr(s, 80))) err('"stations.seatOrder" must be a non-empty list of station names');
    else {
      const seen = new Set<string>();
      for (const s of order as string[]) { const k = s.toLowerCase(); if (seen.has(k)) err(`"stations.seatOrder" lists "${s}" twice`); seen.add(k); }
      if (st.captain !== undefined && (!isStr(st.captain) || !seen.has(st.captain.toLowerCase()))) err('"stations.captain" must be one of the names in seatOrder');
    }
    if (st.exclude !== undefined && !(Array.isArray(st.exclude) && st.exclude.every((s) => isStr(s, 80)))) err('"stations.exclude" must be a list of names');
    let seats: Record<string, StationSeatSpec> | undefined;
    if (st.seats !== undefined) {
      if (!isObj(st.seats)) err('"stations.seats" must be an object keyed by station name');
      else {
        seats = {};
        for (const [name, v] of Object.entries(st.seats)) {
          if (!isObj(v)) { err(`"stations.seats.${name}" must be an object`); continue; }
          if (v.facing !== undefined && !FACINGS.includes(v.facing as Facing)) err(`"stations.seats.${name}.facing" must be down, up, left or right`);
          if (v.role !== undefined && !isStr(v.role, 40)) err(`"stations.seats.${name}.role" must be a short string`);
          if (v.approach !== undefined && !APPROACHES.includes(v.approach as Approach)) err(`"stations.seats.${name}.approach" must be front, back, left or right`);
          seats[name] = { ...(v.facing ? { facing: v.facing as Facing } : {}), ...(v.role ? { role: v.role as string } : {}), ...(v.approach ? { approach: v.approach as Approach } : {}) };
        }
      }
    }
    if (diags.length === ok0) stations = {
      layer: st.layer as string, entrance: st.entrance as string, seatOrder: [...(st.seatOrder as string[])],
      ...(st.captain ? { captain: st.captain as string } : {}),
      ...(st.exclude ? { exclude: [...(st.exclude as string[])] } : {}),
      ...(seats ? { seats } : {}),
    };
  }

  const nav: NavigationSpec = {};
  if (raw.navigation !== undefined) {
    const n = raw.navigation;
    if (!isObj(n)) err('"navigation" must be an object');
    else {
      if (n.walkGrid !== undefined) { if (!isInt(n.walkGrid, 1, 64)) err('"navigation.walkGrid" must be a whole number of pixels from 1 to 64'); else nav.walkGrid = n.walkGrid; }
      if (n.wanderZone !== undefined) { if (!isStr(n.wanderZone)) err('"navigation.wanderZone" must name a zone'); else nav.wanderZone = n.wanderZone; }
      if (n.zonesLayer !== undefined) { if (!isStr(n.zonesLayer)) err('"navigation.zonesLayer" must name an object layer'); else nav.zonesLayer = n.zonesLayer; }
    }
  }

  const sr = raw.spriteRenderer;
  if (!isObj(sr)) err('"spriteRenderer" is missing');
  else {
    if (sr.kind !== 'sheet') err('"spriteRenderer.kind" must be "sheet"');
    if (!isPackPath(sr.sheet) || !/\.png$/i.test(sr.sheet)) err('"spriteRenderer.sheet" must be a pack-relative .png path');
    if (!isInt(sr.frameWidth, 1, 256) || !isInt(sr.frameHeight, 1, 256)) err('"spriteRenderer.frameWidth/frameHeight" must be whole numbers from 1 to 256');
    if (!isObj(sr.rows)) err('"spriteRenderer.rows" is missing');
    else for (const k of ROW_KEYS) if (!isInt(sr.rows[k], 0, 63)) err(`"spriteRenderer.rows.${k}" must be a row number from 0 to 63`);
  }

  let builder: BuilderSpec | undefined;
  if (raw.builder !== undefined) {
    const b = raw.builder, before = diags.length;
    if (!isObj(b)) err('"builder" must be an object');
    else {
      builder = {};
      const hex = (v: unknown): v is string => typeof v === 'string' && HEX_RE.test(v);
      const lower = (v: string) => v.toLowerCase();
      const colorsOf = (v: unknown, at: string): Partial<LookColors> | undefined => {
        if (!isObj(v)) { err(`"${at}" must be an object of skin, shirt and hair colours`); return undefined; }
        const out: Partial<LookColors> = {};
        for (const [k, c] of Object.entries(v)) {
          if (!LOOK_PARTS.includes(k as LookPart)) err(`"${at}.${k}" is not a part (skin, shirt or hair)`);
          else if (!hex(c)) err(`"${at}.${k}" must be a #rrggbb colour`);
          else out[k as LookPart] = lower(c);
        }
        return out;
      };
      for (const k of ['outline', 'eyes'] as const) if (b[k] !== undefined) { if (!hex(b[k])) err(`"builder.${k}" must be a #rrggbb colour`); else builder[k] = lower(b[k] as string); }
      if (b.customColours !== undefined) { if (typeof b.customColours !== 'boolean') err('"builder.customColours" must be true or false'); else builder.customColours = b.customColours; }
      if (b.swatches !== undefined) {
        if (!isObj(b.swatches)) err('"builder.swatches" must map parts to named colours');
        else {
          builder.swatches = {};
          for (const [part, set] of Object.entries(b.swatches)) {
            if (!LOOK_PARTS.includes(part as LookPart)) { err(`"builder.swatches.${part}" is not a part (skin, shirt or hair)`); continue; }
            if (!isObj(set) || !Object.keys(set).length || !Object.entries(set).every(([n, c]) => isStr(n, 40) && hex(c))) { err(`"builder.swatches.${part}" must map names to #rrggbb colours`); continue; }
            builder.swatches[part as LookPart] = Object.fromEntries(Object.entries(set).map(([n, c]) => [n, lower(c as string)]));
          }
        }
      }
      if (b.bodies !== undefined) {
        if (!Array.isArray(b.bodies)) err('"builder.bodies" must be a list');
        else {
          const ids = new Set<string>();
          builder.bodies = [];
          const fw = isObj(sr) && isInt(sr.frameWidth, 1, 256) ? sr.frameWidth : 0, fh = isObj(sr) && isInt(sr.frameHeight, 1, 256) ? sr.frameHeight : 0;
          for (const [i, x] of (b.bodies as unknown[]).entries()) {
            if (!isObj(x) || !isStr(x.id, 40) || !ID_RE.test(x.id) || !isStr(x.label, 40) || !isInt(x.column, 0, 255)) { err(`"builder.bodies[${i}]" needs id, label and column`); continue; }
            if (ids.has(x.id)) err(`"builder.bodies" lists "${x.id}" twice`);
            ids.add(x.id);
            const body: BuilderBody = { id: x.id, label: x.label, column: x.column };
            if (x.parts !== undefined) {
              if (!isObj(x.parts)) err(`"builder.bodies[${i}].parts" must map parts to { main, shades }`);
              else {
                body.parts = {};
                for (const [part, p] of Object.entries(x.parts)) {
                  const at = `builder.bodies[${i}].parts.${part}`;
                  if (!LOOK_PARTS.includes(part as LookPart)) { err(`"${at}" is not a part (skin, shirt or hair)`); continue; }
                  if (!isObj(p) || !hex(p.main) || (p.shades !== undefined && !(Array.isArray(p.shades) && p.shades.every(hex)))) { err(`"${at}" needs a #rrggbb main and a list of #rrggbb shades`); continue; }
                  if (p.byShape !== undefined && (p.byShape !== true || part !== 'hair')) { err(`"${at}.byShape" is only for hair, and must be true`); continue; }
                  if (p.byShape && !hex(b.outline)) { err(`"${at}.byShape" needs "builder.outline" (the colour the hair is drawn in)`); continue; }
                  const shades = [...new Set([lower(p.main as string), ...((p.shades as string[] | undefined) ?? []).map(lower)])];
                  body.parts[part as LookPart] = { main: lower(p.main as string), shades, ...(p.byShape ? { byShape: true } : {}) };
                }
              }
            }
            if (x.portrait !== undefined) {
              const p = x.portrait, c = isObj(p) ? p.crop : undefined;
              const cropOk = Array.isArray(c) && c.length === 4 && c.every((v) => isInt(v, 0, 256)) && c[2] > 0 && c[3] > 0
                && (!fw || (c[0] + c[2] <= fw && c[1] + c[3] <= fh));
              if (!isObj(p) || !cropOk || (p.row !== undefined && !isInt(p.row, 0, 63))) err(`"builder.bodies[${i}].portrait" needs crop [x, y, w, h] inside one ${fw}x${fh} frame (and an optional row)`);
              else body.portrait = { crop: [...(c as number[])] as [number, number, number, number], ...(p.row !== undefined ? { row: p.row as number } : {}) };
            }
            builder.bodies.push(body);
          }
        }
      }
      const bodyIds = new Set((builder.bodies ?? []).map((x) => x.id));
      const knownBody = (v: unknown) => isStr(v, 40) && (!bodyIds.size || bodyIds.has(v));
      if (b.defaults !== undefined) {
        const d = b.defaults;
        if (!isObj(d)) err('"builder.defaults" must be an object');
        else {
          builder.defaults = {};
          if (d.bodyId !== undefined) { if (!knownBody(d.bodyId)) err('"builder.defaults.bodyId" is not a declared body'); else builder.defaults.bodyId = d.bodyId as string; }
          if (d.colors !== undefined) { const c = colorsOf(d.colors, 'builder.defaults.colors'); if (c) builder.defaults.colors = c; }
        }
      }
      if (b.presets !== undefined) {
        if (!Array.isArray(b.presets)) err('"builder.presets" must be a list');
        else {
          const ids = new Set<string>();
          const order = new Set((stations?.seatOrder ?? []).map((s) => s.toLowerCase()));
          const bodies = new Set((builder.bodies ?? []).map((x) => x.id));
          builder.presets = [];
          for (const [i, x] of (b.presets as unknown[]).entries()) {
            if (!isObj(x) || !isStr(x.id, 40) || !ID_RE.test(x.id)) { err(`"builder.presets[${i}]" needs an id of a-z, 0-9 and "-"`); continue; }
            if (ids.has(x.id)) err(`"builder.presets" lists "${x.id}" twice`);
            ids.add(x.id);
            const p: BuilderPreset = { id: x.id };
            if (x.label !== undefined) { if (!isStr(x.label, 40)) err(`"builder.presets[${i}].label" must be a short string`); else p.label = x.label; }
            if (x.bodyId !== undefined) { if (!isStr(x.bodyId) || (bodies.size && !bodies.has(x.bodyId))) err(`"builder.presets[${i}].bodyId" is not a declared body`); else p.bodyId = x.bodyId; }
            if (x.colors !== undefined) { const c = colorsOf(x.colors, `builder.presets[${i}].colors`); if (c) p.colors = c; }
            if (x.seat !== undefined) {
              if (!isStr(x.seat, 80) || !order.has(x.seat.toLowerCase())) err(`"builder.presets[${i}].seat" must be one of the names in stations.seatOrder`);
              else if (stations?.captain && x.seat.toLowerCase() === stations.captain.toLowerCase()) err(`"builder.presets[${i}].seat" cannot be the captain's station`);
              else p.seat = x.seat;
            }
            builder.presets.push(p);
          }
        }
      }
      if (b.sample !== undefined) {
        const s = b.sample;
        if (!isObj(s) || !knownBody(s.bodyId)) err('"builder.sample" needs the bodyId of a declared body');
        else {
          builder.sample = { bodyId: s.bodyId as string };
          if (s.colors !== undefined) { const c = colorsOf(s.colors, 'builder.sample.colors'); if (c) builder.sample.colors = c; }
          if (s.presetId !== undefined) {
            if (!builder.presets?.some((p) => p.id === s.presetId)) err('"builder.sample.presetId" is not a declared preset');
            else builder.sample.presetId = s.presetId as string;
          }
        }
      }
    }
    if (diags.length !== before) builder = undefined;
  }

  let projectDefaults: ProjectDefaults | undefined;
  if (raw.projectDefaults !== undefined) {
    const pd = raw.projectDefaults, o = isObj(pd) ? pd.orchestrator : undefined, a = isObj(o) ? o.appearance : undefined;
    const colorsOk = (c: unknown) => c === undefined || (isObj(c) && Object.entries(c).every(([k, v]) => ['skin', 'shirt', 'hair'].includes(k) && isStr(v, 40) && COLOUR_RE.test(v)));
    if (!isObj(pd) || (o !== undefined && (!isObj(o) || !isStr(o.name, 40) || !isObj(a) || !isStr(a.bodyId, 40) || !colorsOk(a.colors)
      || (a.presetId !== undefined && !isStr(a.presetId, 40))))) {
      warn('"projectDefaults" is malformed and is ignored (expected { orchestrator: { name, appearance: { bodyId, colors?: { skin?, shirt?, hair? }, presetId? } } })');
    } else if (isObj(o) && isObj(a)) {
      projectDefaults = { orchestrator: { name: o.name as string, appearance: {
        bodyId: a.bodyId as string,
        ...(a.colors ? { colors: { ...(a.colors as Record<string, string>) } } : {}),
        ...(a.presetId ? { presetId: a.presetId as string } : {}),
      } } };
    } else projectDefaults = {};
  }

  let coffee: CoffeeSpec | undefined;
  if (raw.coffee !== undefined) {
    const c = raw.coffee, cd = isObj(c) ? c.cooldown : undefined;
    const seatNames = new Set((stations?.seatOrder ?? []).map((n) => n.trim().toLowerCase()));
    const xy = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e5);
    const list = (v: unknown, ok: (x: unknown) => boolean) => v === undefined || (Array.isArray(v) && v.length > 0 && v.length <= 8 && v.every(ok));
    const brewOk = isObj(c) && list(c.brew, (n) => isStr(n, 80)) && list(c.brewAt, xy) && (c.brew !== undefined || c.brewAt !== undefined);
    const mugsOk = !isObj(c) || c.mugs === undefined || (isObj(c.mugs) && Object.keys(c.mugs).length <= 64 && Object.entries(c.mugs).every(([k, v]) => isStr(k, 80) && xy(v)));
    const cdOk = cd === undefined || (Array.isArray(cd) && cd.length === 2 && cd.every((v) => typeof v === 'number' && v >= 10 && v <= 3600) && cd[0] <= cd[1]);
    if (!isObj(c) || !brewOk || !mugsOk || !cdOk || (c.mugLayer !== undefined && !isStr(c.mugLayer, 80))) {
      warn('"coffee" is malformed and is ignored (expected { brew?: [point names], brewAt?: [[x, y]], at least one of them; mugLayer?, mugs?: { station: [x, y] }, cooldown?: [min, max] seconds, 10-3600 })');
    } else if (((c.brew ?? []) as string[]).some((n) => seatNames.has(n.trim().toLowerCase()))) {
      warn('"coffee.brew" names a station in seatOrder; a brew spot is never a seat. Coffee is ignored');
    } else coffee = {
      ...(c.brew ? { brew: [...(c.brew as string[])] } : {}),
      ...(c.brewAt ? { brewAt: (c.brewAt as number[][]).map(([x, y]) => [x, y] as [number, number]) } : {}),
      ...(c.mugLayer ? { mugLayer: c.mugLayer as string } : {}),
      ...(c.mugs ? { mugs: Object.fromEntries(Object.entries(c.mugs as Record<string, number[]>).map(([k, [x, y]]) => [k, [x, y] as [number, number]])) } : {}),
      ...(cd ? { cooldown: [cd[0], cd[1]] as [number, number] } : {}),
    };
  }

  let text: Record<string, string> | undefined;
  if (raw.text !== undefined) {
    if (!isObj(raw.text) || !Object.values(raw.text).every(isPackPath)) warn('"text" must map names to pack-relative paths; ignored');
    else text = { ...(raw.text as Record<string, string>) };
  }
  let assets: ThemeManifest['assets'];
  if (raw.assets !== undefined) {
    if (!isObj(raw.assets) || !Object.values(raw.assets).every((v) => isStr(v, 2000))) warn('"assets" must map names to strings; ignored');
    else assets = { ...(raw.assets as Record<string, string>) };
  }

  if (diags.some((d) => d.level === 'error') || !stations) return { manifest: null, diagnostics: diags };
  const s = sr as Record<string, unknown>, rows = s.rows as Record<string, number>;
  const manifest: ThemeManifest = {
    schema: 1, id: raw.id as string, label: raw.label as string, sceneKind: raw.sceneKind as SceneKind, map: raw.map as string,
    palette: { background: (pal as Record<string, string>).background }, stations, navigation: nav,
    spriteRenderer: {
      kind: 'sheet', sheet: s.sheet as string, frameWidth: s.frameWidth as number, frameHeight: s.frameHeight as number,
      rows: Object.fromEntries(ROW_KEYS.map((k) => [k, rows[k]])) as unknown as SpriteRows,
    },
    ...(assets ? { assets } : {}), ...(builder ? { builder } : {}),
    ...(projectDefaults ? { projectDefaults } : {}), ...(coffee ? { coffee } : {}), ...(text ? { text } : {}),
  };
  return { manifest, diagnostics: diags };
}

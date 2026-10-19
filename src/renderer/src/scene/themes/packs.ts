// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Theme-pack loading: theme.json -> validated manifest -> normalized map ->
// the pictures it needs -> analysed stations scene. Every failure is a
// diagnostic, never a throw: the floor then renders the built-in Office.
//
// Pure. File access is a PackFiles over the pack's own files (pack-relative
// paths); pictures are decoded by the caller into a PixelStore.

import { normPath, parseMap, resolveAsset, type Diagnostic, type NormalizedMap, type PackFiles } from './tiled';
import { OFFICE_THEME_ID, validateManifest, type ThemeManifest } from './manifest';
import { analyseStationMap, type StationMap } from './stationMap';
import type { PixelStore } from './raster';
import { readPackLines, type PackLines } from './packLines';
import type { Exchange } from './exchanges';

/** A pack whose manifest and map parsed, with the pictures still to decode. */
export interface PackData {
  manifest: ThemeManifest;
  map: NormalizedMap;
  /** Pack paths of every picture the scene draws (tilesets, tile images, the sprite sheet). */
  images: string[];
  /** Pack path of the sprite sheet. */
  sheet: string;
  /** The pack's own bubble lines (manifest "text": {"lines": ...}), when it has them. */
  lines?: PackLines;
  /** The pack's crew exchanges (lines.exchanges), when it has them. */
  exchanges?: Exchange[];
}

export interface PackResult<T> { value: T | null; diagnostics: Diagnostic[]; }

const hasError = (d: Diagnostic[]) => d.some((x) => x.level === 'error');

/** Read and check a pack up to the point where its pictures are needed. */
export function readPack(files: PackFiles): PackResult<PackData> {
  const diags: Diagnostic[] = [];
  const src = files.text('theme.json');
  if (src == null) return { value: null, diagnostics: [{ level: 'error', message: 'The pack has no theme.json.' }] };
  let raw: unknown;
  try { raw = JSON.parse(src); } catch (e) {
    return { value: null, diagnostics: [{ level: 'error', message: `theme.json is not valid JSON: ${e instanceof Error ? e.message : String(e)}` }] };
  }
  const vm = validateManifest(raw);
  diags.push(...vm.diagnostics);
  const manifest = vm.manifest;
  if (!manifest) return { value: null, diagnostics: diags };
  if (manifest.id === OFFICE_THEME_ID) { diags.push({ level: 'error', message: 'A pack cannot replace the built-in office.' }); return { value: null, diagnostics: diags }; }
  const mapPath = resolveAsset(files, '', manifest.map);
  if (!mapPath || normPath(mapPath) !== normPath(manifest.map)) {
    diags.push({ level: 'error', message: `The map "${manifest.map}" is not in the pack.` });
    return { value: null, diagnostics: diags };
  }
  let map: NormalizedMap;
  try { map = parseMap(files, mapPath, diags); } catch (e) {
    diags.push({ level: 'error', message: `The map "${manifest.map}" cannot be read: ${e instanceof Error ? e.message : String(e)}` });
    return { value: null, diagnostics: diags };
  }
  const sheet = resolveAsset(files, '', manifest.spriteRenderer.sheet);
  if (!sheet || normPath(sheet) !== normPath(manifest.spriteRenderer.sheet)) diags.push({ level: 'error', message: `The sprite sheet "${manifest.spriteRenderer.sheet}" is not in the pack.` });
  const images = new Set<string>();
  for (const ts of map.tilesets) {
    if (ts.image) images.add(ts.image.path);
    for (const t of ts.tiles.values()) if (t.image) images.add(t.image.path);
  }
  if (sheet) images.add(sheet);
  if (hasError(diags)) return { value: null, diagnostics: diags };
  const read = readPackLines(files, manifest);
  diags.push(...read.diagnostics);
  return { value: { manifest, map, images: [...images], sheet: sheet!, ...(read.lines ? { lines: read.lines } : {}), ...(read.exchanges.length ? { exchanges: read.exchanges } : {}) }, diagnostics: diags };
}

/** The decoded sprite sheet must hold every row and frame the manifest names. */
export function checkSheet(data: PackData, store: PixelStore): Diagnostic[] {
  const out: Diagnostic[] = [];
  const S = store.get(data.sheet), R = data.manifest.spriteRenderer;
  if (!S) return [{ level: 'error', message: `The sprite sheet "${R.sheet}" could not be decoded.` }];
  const rows = Math.floor(S.height / R.frameHeight), cols = Math.floor(S.width / R.frameWidth);
  if (cols < 1) out.push({ level: 'error', message: `The sprite sheet is ${S.width} px wide, narrower than one ${R.frameWidth} px frame.` });
  for (const [k, r] of Object.entries(R.rows)) if (r >= rows)
    out.push({ level: 'error', message: `spriteRenderer.rows.${k} is row ${r}, but the sheet has ${rows} rows of ${R.frameHeight} px.` });
  for (const b of data.manifest.builder?.bodies ?? []) if (b.column >= cols)
    out.push({ level: 'error', message: `Body "${b.id}" uses sheet column ${b.column}, but the sheet has ${cols} columns of ${R.frameWidth} px.` });
  return out;
}

/** A pack ready to draw. */
export interface LoadedPack extends PackData {
  scene: StationMap;
  store: PixelStore;
  diagnostics: Diagnostic[];
}

/** Finish loading once the pictures are decoded: check the sheet and every
 *  picture, then analyse the map. null (with diagnostics) when it cannot be used. */
export function finishPack(data: PackData, store: PixelStore, earlier: Diagnostic[] = []): PackResult<LoadedPack> {
  const diags = [...earlier];
  for (const p of data.images) if (!store.has(p)) diags.push({ level: 'error', message: `The picture "${p}" could not be decoded.` });
  diags.push(...checkSheet(data, store));
  if (hasError(diags)) return { value: null, diagnostics: diags };
  let scene: StationMap;
  try { scene = analyseStationMap(data.map, store, { stations: data.manifest.stations, navigation: data.manifest.navigation, coffee: data.manifest.coffee }); } catch (e) {
    diags.push({ level: 'error', message: `The map could not be analysed: ${e instanceof Error ? e.message : String(e)}` });
    return { value: null, diagnostics: diags };
  }
  diags.push(...scene.diagnostics);
  if (hasError(diags)) return { value: null, diagnostics: diags };
  if (!scene.seatOrder.length) {
    diags.push({ level: 'error', message: 'No station in seatOrder can be reached; the scene has nowhere to seat anyone.' });
    return { value: null, diagnostics: diags };
  }
  return { value: { ...data, scene, store, diagnostics: diags }, diagnostics: diags };
}

/** What a theme picker needs to know about a pack, without loading its map. */
export interface PackSummary {
  id: string;
  label: string;
  sceneKind: ThemeManifest['sceneKind'];
  /** The folder the pack came from. */
  dir: string;
  /** The character sheet's frame size and rows (portraits need them). */
  spriteRenderer: ThemeManifest['spriteRenderer'];
  builder?: ThemeManifest['builder'];
  projectDefaults?: ThemeManifest['projectDefaults'];
}

/** The usable packs among `sources` (manifest valid, id unique and not the
 *  office), with every rejected pack's diagnostics by folder. */
export function catalogue(sources: Array<{ dir: string; files: PackFiles }>): { packs: PackSummary[]; rejected: Array<{ dir: string; diagnostics: Diagnostic[] }> } {
  const packs: PackSummary[] = [], rejected: Array<{ dir: string; diagnostics: Diagnostic[] }> = [];
  for (const { dir, files } of [...sources].sort((a, b) => a.dir.localeCompare(b.dir))) {
    const src = files.text('theme.json');
    let raw: unknown = null, diags: Diagnostic[] = [];
    try { raw = src == null ? null : JSON.parse(src); } catch { diags = [{ level: 'error', message: 'theme.json is not valid JSON.' }]; }
    const vm = diags.length ? { manifest: null, diagnostics: diags } : validateManifest(raw, dir);
    const m = vm.manifest;
    if (!m) { rejected.push({ dir, diagnostics: vm.diagnostics }); continue; }
    if (packs.some((p) => p.id === m.id)) {
      rejected.push({ dir, diagnostics: [{ level: 'error', message: `${dir}/theme.json: the id "${m.id}" is already used by another pack.` }] });
      continue;
    }
    packs.push({ id: m.id, label: m.label, sceneKind: m.sceneKind, dir, spriteRenderer: m.spriteRenderer, ...(m.builder ? { builder: m.builder } : {}), ...(m.projectDefaults ? { projectDefaults: m.projectDefaults } : {}) });
  }
  return { packs, rejected };
}

/** A PackFiles over an in-memory map of pack-relative path -> text (or null for a binary file). */
export function memoryFiles(entries: Record<string, string | null>): PackFiles {
  const keys = Object.keys(entries);
  const byNorm = new Map(keys.map((k) => [normPath(k), k] as const));
  return {
    list: () => keys,
    text: (p) => { const k = byNorm.get(normPath(p)); return k === undefined ? null : entries[k]; },
  };
}

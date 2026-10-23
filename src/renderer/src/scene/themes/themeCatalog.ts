// Ported from Prozzta/guppyos 02d0d50b (MIT).
// The theme catalogue the app sees: the built-in office (always first, always
// the fallback) plus every valid bundled pack. Also loads a stations pack's
// pictures for the scene. PR-a's project-creation picker reads `listThemes()`
// and `themeProjectDefaults(id)`; applying a seed is the picker's business.

import { OFFICE_THEME_ID, type ProjectDefaults, type BuilderSpec } from './manifest';
import { registerPackThemes } from '@shared/projectTheme';
import { catalogue, finishPack, readPack, type LoadedPack, type PackSummary } from './packs';
import { bundledPacks } from './packSources';
import { normPath, type Diagnostic } from './tiled';
import type { PortraitPack } from './looks';
import type { PixelStore, Pixels } from './raster';

export interface ThemeEntry {
  id: string;
  label: string;
  sceneKind: 'office' | 'stations';
  builtIn: boolean;
  /** A pack's art credit, for the picker. */
  credit?: { text: string; url: string };
}

let packs: PackSummary[] | null = null;
function summaries(): PackSummary[] {
  if (!packs) {
    const res = catalogue([...bundledPacks().values()]);
    for (const r of res.rejected) console.warn(`[themes] pack "${r.dir}" is not usable:\n` + r.diagnostics.map((d) => `  ${d.level}: ${d.message}`).join('\n'));
    packs = res.packs;
    registerPackThemes(packs.map((p) => ({ id: p.id, label: p.label, orchestrator: p.projectDefaults?.orchestrator })));
  }
  return packs;
}

/** Every selectable theme: the office first, then the bundled packs. */
export function listThemes(): ThemeEntry[] {
  return [
    { id: OFFICE_THEME_ID, label: 'Office', sceneKind: 'office', builtIn: true },
    ...summaries().map((p) => ({ id: p.id, label: p.label, sceneKind: p.sceneKind, builtIn: false, ...(p.credit ? { credit: p.credit } : {}) })),
  ];
}

/** True when `id` names a bundled stations pack. */
export function isStationPack(id: string): boolean {
  return summaries().some((p) => p.id === id && p.sceneKind === 'stations');
}

/** A pack's first-project seed (validated data), or null. Only for creating a
 *  blank project: never apply it to a project that already has a roster. */
export function themeProjectDefaults(id: string): ProjectDefaults | null {
  return summaries().find((p) => p.id === id)?.projectDefaults ?? null;
}

/** A pack's builder options (bodies, presets), or null. */
export function themeBuilder(id: string): BuilderSpec | null {
  return summaries().find((p) => p.id === id)?.builder ?? null;
}

/** Through an image element, never fetch(): Vite inlines small pictures as data:
 *  URLs, which the page's CSP allows for img-src but not for connect-src. */
async function decode(url: string): Promise<Pixels> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const bmp = await createImageBitmap(img, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const cv = new OffscreenCanvas(bmp.width, bmp.height);
  const g = cv.getContext('2d');
  if (!g) throw new Error('no 2d context');
  g.drawImage(bmp, 0, 0);
  bmp.close();
  const d = g.getImageData(0, 0, cv.width, cv.height);
  return { width: d.width, height: d.height, data: d.data };
}

/** What portraits and the look builder need from a pack: its builder, its
 *  sprite metadata and its decoded character sheet (no map). */
export interface ThemeLooks extends PortraitPack {
  label: string;
  sheet: Pixels;
}

const looksCache = new Map<string, Promise<ThemeLooks | null>>();

/** A pack's looks, loaded once. null for the office, an unknown id, or a sheet
 *  that cannot be decoded (portraits then show the Office character). */
export function loadThemeLooks(id: string): Promise<ThemeLooks | null> {
  let p = looksCache.get(id);
  if (!p) {
    p = (async () => {
      const s = summaries().find((x) => x.id === id);
      const url = s ? bundledPacks().get(s.dir)?.pictures.get(normPath(s.spriteRenderer.sheet)) : undefined;
      if (!s || !url) return null;
      try {
        const sheet = await decode(url);
        return { themeId: s.id, label: s.label, builder: s.builder, sprite: s.spriteRenderer, columns: Math.max(1, Math.floor(sheet.width / s.spriteRenderer.frameWidth)), sheet };
      } catch (e) {
        console.warn(`[themes] the sprite sheet of "${id}" could not be decoded:`, e);
        return null;
      }
    })();
    looksCache.set(id, p);
  }
  return p;
}

/** Load a stations pack ready to draw. On any problem: null with the reasons
 *  (the floor then shows the office and a note). */
export async function loadStationPack(id: string): Promise<{ pack: LoadedPack | null; diagnostics: Diagnostic[] }> {
  const s = summaries().find((p) => p.id === id);
  const src = s ? bundledPacks().get(s.dir) : undefined;
  if (!s || !src) return { pack: null, diagnostics: [{ level: 'error', message: `No bundled theme pack has the id "${id}".` }] };
  const read = readPack(src.files);
  if (!read.value) return { pack: null, diagnostics: read.diagnostics };
  const store: PixelStore = new Map();
  await Promise.all(read.value.images.map(async (p) => {
    const url = src.pictures.get(p);
    if (!url) return;
    try { store.set(p, await decode(url)); } catch { /* reported by finishPack as not decoded */ }
  }));
  const done = finishPack(read.value, store, read.diagnostics);
  return { pack: done.value, diagnostics: done.diagnostics };
}

// Theme loader — resolves a ThemeConfig into a ready-to-render map.
//
// Loads theme packs from disk via window.cth.loadThemePack(id), builds blob: URLs
// for tilesets/fonts/portraits/sprites, and caches the resulting ThemeConfig in THEMES.
// On failure, falls back to munder-difflin.

import { Texture } from 'pixi.js';
import type { TiledMap } from './TiledMapRenderer';
import {
  THEMES,
  getTheme,
  type ThemeConfig,
  type ThemeId,
  type ThemeCast,
  type TilesetEntry,
} from './themeRegistry';
import {
  DEFAULT_THEME_ID,
  normalizeThemeId,
  validatePack,
  hexToNumber,
  type PackPayload,
} from '@/shared/themePack';
import {
  PROCEDURAL_THEME_CAST,
  type CastMember,
} from './cast';
import { SCENE_W, SCENE_H } from './portraitArt';

/** Track created object URLs per theme to allow cleanup if needed. */
const THEME_OBJECT_URLS = new Map<ThemeId, string[]>();

/** Parse a theme's raw Tiled JSON and patch its tileset array.
 *  `embedded` atlases keep the map's own inline metadata; the rest are replaced
 *  by the theme's inline metadata (firstgid + image dimensions). The result's
 *  tileset order matches the texture-load order (texture[i] ↔ tilesets[i]). */
export function resolveThemeMap(theme: ThemeConfig): TiledMap {
  const m = JSON.parse(theme.mapRaw) as TiledMap;
  return {
    ...m,
    tilesets: theme.tilesets.map((t, i) => {
      if (t.embedded) return m.tilesets[i];
      // Strip the renderer-only fields (url/embedded); the rest is Tiled metadata.
      const { url: _url, embedded: _embedded, ...meta } = t;
      return meta as TiledMap['tilesets'][number];
    }),
  };
}

/** The ordered tileset image URLs to load as textures, matching the map's
 *  tileset order (so texture[i] lines up with tilesets[i]). */
export function themeTilesetUrls(theme: ThemeConfig): string[] {
  return theme.tilesets.map((t) => t.url);
}

/** Light validation: the theme's map must parse and carry sane dimensions. */
function isThemeRenderable(theme: ThemeConfig): boolean {
  try {
    const m = JSON.parse(theme.mapRaw) as TiledMap;
    return (
      typeof m.width === 'number' && m.width > 0 &&
      typeof m.height === 'number' && m.height > 0 &&
      Array.isArray(m.layers) && Array.isArray(m.tilesets)
    );
  } catch {
    return false;
  }
}

/**
 * Helper to build a ThemeCast from on-disk cast payload files.
 * Expects cast.json (metadata array) and sprites/<name>.png (108x32) per member.
 */
function buildDiskThemeCast(
  payload: PackPayload,
  urls: string[]
): ThemeCast | null {
  const castFile = payload.files['cast/cast.json'];
  if (!castFile) return null;

  let roster: Array<{ name: string; displayName: string; shirt: string; blurb: string }>;
  try {
    roster = JSON.parse(new TextDecoder('utf-8').decode(castFile));
    if (!Array.isArray(roster) || roster.length === 0) return null;
  } catch {
    return null;
  }

  const byName: Record<string, CastMember> = {};
  for (const m of roster) {
    byName[m.name] = {
      name: m.name as any,
      displayName: m.displayName || m.name,
      shirt: m.shirt || '#888888',
      blurb: m.blurb || '',
    };
  }

  const spriteCache = new Map<string, Texture[][]>();

  const getFrames = async (name: string): Promise<Texture[][]> => {
    const cached = spriteCache.get(name);
    if (cached) return cached;

    const spriteBytes = payload.files[`cast/sprites/${name}.png`];
    if (!spriteBytes) {
      // Fall back to procedural frame loader if disk sprite missing
      return PROCEDURAL_THEME_CAST.getFrames(name);
    }

    const blob = new Blob([spriteBytes], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    urls.push(url);

    return new Promise<Texture[][]>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // 6 frames of 18x32: front stand, front step-L, front step-R, back stand, back step-L, back step-R
          const baseTex = Texture.from(img);
          baseTex.source.scaleMode = 'nearest';

          const frontStand = new Texture({ source: baseTex.source, frame: new (Texture as any).Rectangle?.(0, 0, SCENE_W, SCENE_H) ?? { x: 0, y: 0, width: SCENE_W, height: SCENE_H } });
          const frontStepL = new Texture({ source: baseTex.source, frame: new (Texture as any).Rectangle?.(SCENE_W, 0, SCENE_W, SCENE_H) ?? { x: SCENE_W, y: 0, width: SCENE_W, height: SCENE_H } });
          const frontStepR = new Texture({ source: baseTex.source, frame: new (Texture as any).Rectangle?.(SCENE_W * 2, 0, SCENE_W, SCENE_H) ?? { x: SCENE_W * 2, y: 0, width: SCENE_W, height: SCENE_H } });
          const backStand  = new Texture({ source: baseTex.source, frame: new (Texture as any).Rectangle?.(SCENE_W * 3, 0, SCENE_W, SCENE_H) ?? { x: SCENE_W * 3, y: 0, width: SCENE_W, height: SCENE_H } });
          const backStepL  = new Texture({ source: baseTex.source, frame: new (Texture as any).Rectangle?.(SCENE_W * 4, 0, SCENE_W, SCENE_H) ?? { x: SCENE_W * 4, y: 0, width: SCENE_W, height: SCENE_H } });
          const backStepR  = new Texture({ source: baseTex.source, frame: new (Texture as any).Rectangle?.(SCENE_W * 5, 0, SCENE_W, SCENE_H) ?? { x: SCENE_W * 5, y: 0, width: SCENE_W, height: SCENE_H } });

          const frontRow = [frontStand, frontStepL, frontStepR, frontStand, frontStand, frontStand, frontStand];
          const backRow  = [backStand, backStepL, backStepR, backStand, backStand, backStand, backStand];

          // 3 rows CharacterSprite expects: down, up, right
          const frames: Texture[][] = [frontRow, backRow, frontRow];
          spriteCache.set(name, frames);
          resolve(frames);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  };

  const defaultCharacter = payload.manifest.cast?.default && byName[payload.manifest.cast.default]
    ? payload.manifest.cast.default
    : roster[0].name;

  return {
    byName,
    getFrames,
    defaultCharacter,
  };
}

/**
 * Transforms a PackPayload into a renderable ThemeConfig with blob: URLs.
 */
function packPayloadToThemeConfig(payload: PackPayload, id: ThemeId): ThemeConfig | null {
  const validation = validatePack({ dirName: id, files: payload.files });
  if (!validation.pack) {
    console.warn(`[themeLoader] pack '${id}' failed validation:`, validation.issues);
    return null;
  }

  const { manifest, mapRaw, tilesets: validatedTilesets } = validation.pack;
  const urls: string[] = [];

  const tilesets: TilesetEntry[] = [];
  for (let i = 0; i < validatedTilesets.length; i++) {
    const t = validatedTilesets[i];
    const bytes = payload.files[t.file];
    if (!bytes) {
      console.warn(`[themeLoader] missing tileset bytes for '${t.file}'`);
      return null;
    }
    const blob = new Blob([bytes], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    urls.push(url);

    if (t.embedded) {
      tilesets.push({ url, embedded: true });
    } else {
      tilesets.push({
        url,
        firstgid: t.meta?.firstgid,
        image: t.meta?.image,
        imagewidth: t.meta?.imagewidth,
        imageheight: t.meta?.imageheight,
        tilewidth: t.meta?.tilewidth,
        tileheight: t.meta?.tileheight,
        columns: t.meta?.columns,
        tilecount: t.meta?.tilecount,
      });
    }
  }

  // Cast resolution: pack WITH cast/ dir loads roster via ThemeCast; pack WITHOUT cast/ uses procedural
  const hasCast = Object.keys(payload.files).some((k) => k.startsWith('cast/'));
  const cast: ThemeCast = (hasCast && buildDiskThemeCast(payload, urls)) || {
    byName: PROCEDURAL_THEME_CAST.byName,
    getFrames: (name: string) => PROCEDURAL_THEME_CAST.getFrames(name),
    defaultCharacter: PROCEDURAL_THEME_CAST.defaultCharacter,
  };

  // Convert noteColors hex to numbers
  const noteColors: Record<string, number> = {};
  for (const [k, v] of Object.entries(manifest.palette.noteColors)) {
    noteColors[k] = hexToNumber(v);
  }

  // Revoke any previous blob URLs for this theme ID before assigning new ones
  const prevUrls = THEME_OBJECT_URLS.get(id);
  if (prevUrls) {
    for (const u of prevUrls) URL.revokeObjectURL(u);
  }
  THEME_OBJECT_URLS.set(id, urls);

  const themeConfig: ThemeConfig = {
    id,
    mapRaw,
    tilesets,
    primarySeatNames: [...manifest.seats.primary],
    cafeSeatNames: [...manifest.seats.cafe],
    cafeStands: manifest.seats.cafeStands.map(([name, kind]) => [name, kind] as const),
    coffee: manifest.coffee ? { ...manifest.coffee } : {
      trayTile: { x: 0, y: 0 },
      trayStand: { x: 0, y: 0 },
      machineStand: { x: 0, y: 0 },
      sinkTile: { x: 0, y: 0 },
      sinkStand: { x: 0, y: 0 },
      maxCups: 0,
    },
    anchors: { ...manifest.anchors },
    errandSpots: manifest.errandSpots.map((s) => ({ ...s })),
    monitor: {
      offTopLeftGid: manifest.monitor.offTopLeftGid,
      onGids: manifest.monitor.onGids.map((g) => [g[0], g[1], g[2]] as const),
    },
    palette: {
      background: hexToNumber(manifest.palette.background),
      noteColors,
    },
    cast,
  };

  return themeConfig;
}

/** Resolve a theme id to a renderable ThemeConfig. Async by design;
 *  loads disk pack via window.cth.loadThemePack(id) and caches in THEMES.
 *  Falls back to DEFAULT_THEME_ID ('munder-difflin') on any failure. */
export async function loadTheme(id: ThemeId): Promise<ThemeConfig> {
  const normId = normalizeThemeId(id);

  // Return cached theme if already loaded and renderable
  const cached = getTheme(normId);
  if (cached && isThemeRenderable(cached)) {
    return cached;
  }

  // Attempt to load from disk
  if (typeof window !== 'undefined' && window.cth?.loadThemePack) {
    try {
      const payload = await window.cth.loadThemePack(normId);
      if (payload) {
        const theme = packPayloadToThemeConfig(payload, normId);
        if (theme && isThemeRenderable(theme)) {
          THEMES.set(normId, theme);
          return theme;
        }
      }
    } catch (err) {
      console.warn(`[themeLoader] failed to load theme '${normId}' from disk:`, err);
    }
  }

  // Fallback chain: if not default theme, try loading default theme
  if (normId !== DEFAULT_THEME_ID) {
    console.warn(`[themeLoader] falling back from '${id}' to '${DEFAULT_THEME_ID}'`);
    return loadTheme(DEFAULT_THEME_ID);
  }

  // If even the default theme cannot be loaded via IPC, return cached or empty fallback
  const fallback = getTheme(DEFAULT_THEME_ID);
  if (fallback) return fallback;

  throw new Error(`[themeLoader] failed to load default theme '${DEFAULT_THEME_ID}'`);
}


// The built-in cast — roster metadata + sprite frames.
//
// Both the static portraits (cards / picker) and the in-scene walking sprites are
// now fully custom-drawn from the same per-character recipes in portraitArt.ts:
// the scene sprite reuses the portrait's exact head/face/clothing and adds legs,
// so an agent on the office floor looks identical to its card. The LimeZu base
// sheets are no longer used for the cast. See assets/ATTRIBUTION.md.

import { Texture } from 'pixi.js';
import { paintPortrait, sceneFrameBufs, SCENE_W, SCENE_H } from './portraitArt';
import {
  normalizeCharacter, LEGACY_CHARACTER_ALIASES, DEFAULT_CHARACTER, ORCHESTRATOR_CHARACTER,
  type CharacterName
} from './characters';

export { DEFAULT_CHARACTER, ORCHESTRATOR_CHARACTER, normalizeCharacter, type CharacterName };

export interface CastMember {
  name: CharacterName;
  displayName: string;
  /** Signature accent color (hex) — used for the in-scene selection glow. */
  shirt: string;
  /** Blurb shown when this character is picked / has no description yet. */
  blurb: string;
}

/** Selectable roster, in display order. */
export const CAST: CastMember[] = [
  { name: 'ada',   displayName: 'Ada',   shirt: '#46707a', blurb: 'Systems, quietly thorough' },
  { name: 'ben',   displayName: 'Ben',   shirt: '#3c785a', blurb: 'Backend, ships on Fridays' },
  { name: 'cleo',  displayName: 'Cleo',  shirt: '#e6aa3c', blurb: 'Design, strong opinions' },
  { name: 'dax',   displayName: 'Dax',   shirt: '#78408c', blurb: 'Frontend, loves a spinner' },
  { name: 'eli',   displayName: 'Eli',   shirt: '#c85a3c', blurb: 'Tests everything twice' },
  { name: 'fern',  displayName: 'Fern',  shirt: '#5a8c64', blurb: 'Docs and developer experience' },
  { name: 'gus',   displayName: 'Gus',   shirt: '#3c466e', blurb: 'Infra, owns the pager' },
  { name: 'hana',  displayName: 'Hana',  shirt: '#c85060', blurb: 'Data, plots first' },
  { name: 'ivo',   displayName: 'Ivo',   shirt: '#28463c', blurb: 'Runs the floor' },
  { name: 'jules', displayName: 'Jules', shirt: '#3c3c5a', blurb: 'Security, reads the diff' },
  { name: 'kira',  displayName: 'Kira',  shirt: '#3c3c46', blurb: 'Release manager' },
  { name: 'leo',   displayName: 'Leo',   shirt: '#dcdce6', blurb: 'Support, calm under fire' },
  { name: 'maya',  displayName: 'Maya',  shirt: '#c87832', blurb: 'Product, asks why' },
  { name: 'nico',  displayName: 'Nico',  shirt: '#5a5a64', blurb: 'Performance, counts milliseconds' },
  { name: 'otto',  displayName: 'Otto',  shirt: '#786450', blurb: 'Reviewer, never in a hurry' },
];

/** Lookup by name. Older saved names resolve to their replacement figure. */
export const CAST_BY_NAME: Record<string, CastMember> = {
  ...Object.fromEntries(CAST.map((c) => [c.name, c])),
  ...Object.fromEntries(
    Object.entries(LEGACY_CHARACTER_ALIASES).map(([old, now]) => [old, CAST.find((c) => c.name === now)!])
  ),
};

export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// ─── scene frames ────────────────────────────────────────────────────────────
const frameCache = new Map<CharacterName, Texture[][]>();

function bufToTexture(buf: Uint8ClampedArray): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = SCENE_W; canvas.height = SCENE_H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(SCENE_W, SCENE_H);
  img.data.set(buf);
  ctx.putImageData(img, 0, 0);
  const tex = Texture.from(canvas);
  tex.source.scaleMode = 'nearest';
  return tex;
}

/**
 * Frame grid CharacterSprite expects: 3 rows (down, up, right) × 7 frames
 * [walk1, walk2, walk3, type1, type2, read1, read2]. We provide a front view
 * (down — and reused for the side row, so left/right walkers still show a face)
 * and a back view (up — agents seated facing their desk show their back). The
 * three walk frames are stand / step-left / step-right.
 */
export async function getCastFrames(rawName: string): Promise<Texture[][]> {
  const name = normalizeCharacter(rawName);
  const cached = frameCache.get(name);
  if (cached) return cached;
  const { front, back } = sceneFrameBufs(name);
  const toRow = (bufs: Uint8ClampedArray[]): Texture[] => {
    const [stand, stepL, stepR] = bufs.map(bufToTexture);
    return [stand, stepL, stepR, stand, stand, stand, stand];
  };
  const frontRow = toRow(front);
  const frames: Texture[][] = [frontRow, toRow(back), frontRow]; // down, up, right
  frameCache.set(name, frames);
  return frames;
}

/**
 * Paint a character's static portrait for cards / the picker (delegates to the
 * custom procedural composer in portraitArt.ts).
 */
export async function paintCastPortrait(
  ctx: CanvasRenderingContext2D,
  name: string,
  scale = 2,
): Promise<void> {
  paintPortrait(ctx, normalizeCharacter(name), scale);
}

/** Built-in procedural cast satisfying ThemeCast for packs without cast/ directory. */
export const PROCEDURAL_THEME_CAST = {
  byName: CAST_BY_NAME,
  getFrames: (name: string) => getCastFrames(name),
  defaultCharacter: DEFAULT_CHARACTER,
};

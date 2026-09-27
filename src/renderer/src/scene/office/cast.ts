// The Office cast — roster metadata + sprite frames.
//
// Both the static portraits (cards / picker) and the in-scene walking sprites are
// fully custom-drawn from the same per-character recipes in portraitArt.ts:
// the scene sprite reuses the portrait's exact head/face/clothing and adds legs,
// so an agent on the office floor looks identical to its card. The LimeZu base
// sheets are no longer used for the cast. See assets/ATTRIBUTION.md.
//
// A `custom:<id>` or `preset:<n>` character goes through the same path: the
// painter resolves the name to a recipe, so the floor never has to know which
// kind of character it is drawing.

import { Texture } from 'pixi.js';
import { recipeKey } from '@shared/avatars';
import { paintPortrait, resolveRecipe, sceneFrameBufs, SCENE_W, SCENE_H } from './portraitArt';

import {
  OFFICE_CAST,
  CAST_BY_NAME,
  DEFAULT_CHARACTER,
  castMemberFor,
  hexToNumber,
  type OfficeCharacterName,
  type CastMember
} from './castRoster';

// Re-exported so scene code keeps a single import site for roster + frames.
export { OFFICE_CAST, CAST_BY_NAME, DEFAULT_CHARACTER, castMemberFor, hexToNumber };
export type { OfficeCharacterName, CastMember };

// ─── scene frames ────────────────────────────────────────────────────────────
// Keyed by name AND recipe content: editing a custom avatar changes its key,
// so the next getCastFrames for that name builds fresh textures instead of
// serving the ones drawn before the edit.
const frameCache = new Map<string, Texture[][]>();

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
export async function getCastFrames(name: OfficeCharacterName): Promise<Texture[][]> {
  const key = `${name}|${recipeKey(resolveRecipe(name))}`;
  const cached = frameCache.get(key);
  if (cached) return cached;
  const { front, back } = sceneFrameBufs(name);
  const toRow = (bufs: Uint8ClampedArray[]): Texture[] => {
    const [stand, stepL, stepR] = bufs.map(bufToTexture);
    return [stand, stepL, stepR, stand, stand, stand, stand];
  };
  const frontRow = toRow(front);
  const frames: Texture[][] = [frontRow, toRow(back), frontRow]; // down, up, right
  frameCache.set(key, frames);
  return frames;
}

/**
 * Paint a character's static portrait for cards / the picker (delegates to the
 * custom procedural composer in portraitArt.ts).
 */
export async function paintCastPortrait(
  ctx: CanvasRenderingContext2D,
  name: OfficeCharacterName,
  scale = 2,
): Promise<void> {
  paintPortrait(ctx, name, scale);
}

// Procedural sprites: the cast, custom avatars and presets, all from recipes.
//
// Every sprite the app draws is composed here from an AvatarRecipe (see
// src/shared/avatars.ts): skin → clothing → face → facial hair → hair → glasses
// on an 18×28 bust, and the same head over a torso and legs on an 18×32 walking
// figure. The fifteen Office characters are the fifteen recipes in CAST_RECIPES.
// A custom avatar (`custom:<id>`, looked up in avatarRegistry) and a preset
// (`preset:<n>`, generated from a seed) go through exactly the same functions.
// Both the static portraits in the UI and the in-scene walking sprites (cast.ts)
// come out of this module; the LimeZu sheets have not drawn the cast since
// 2026-08-20.
//
// BYTE FOR BYTE. The recipe grew for the sprite editor: face shape, eye style,
// nose, eye and lip colour, two skins, four hair styles and fourteen garments.
// Every original option is drawn at its original pixels, in its original
// order, so the cast renders identically to v0.4.8. test/avatar-recipes.test.cjs
// holds the hashes; touch a drawing function and that test says whether the
// cast moved.
//
// PIXEL BUDGET, for anyone adding an option. Head skin is x4..13, y4..16; eyes
// sit on row 9 (two pixels each), brows on rows 6..8, the nose at (8,11),(8,12),
// (7,12), the mouth on rows 13..15. Clothing is rows 19..27 on the bust and
// 18..24 on the scene figure, one row apart, so a garment is written once with
// a `T` offset and its details stay inside x5..12, rows T..T+6.

import type { OfficeCharacterName, BuiltinCharacterName } from './castRoster';
import { PORTRAIT_W, PORTRAIT_H } from './castRoster';
import {
  type AvatarRecipe,
  type RGB,
  type Skin,
  type Face,
  type HairStyle,
  type HairArgs,
  type Facial,
  type Cloth,
  CUSTOM_PREFIX,
  isCustomAvatarId,
  migrateRecipe,
  presetIndexOf,
  presetRecipe,
  recipeKey
} from '@shared/avatars';
import { getCustomAvatar } from './avatarRegistry';

// Re-exported from castRoster so nothing that only needs the SIZE has to pull
// this module in. See castRoster.ts.
export { PORTRAIT_W, PORTRAIT_H } from './castRoster';
// In-scene walking sprite: same width + upper body as the portrait, taller to add legs.
export const SCENE_W = 18;
export const SCENE_H = 32;
const OUTLINE: RGB = [38, 34, 46];
const HX0 = 4, HX1 = 13; // head skin columns

type Buf = Uint8ClampedArray;

// Current canvas dims — set per compose() so the same drawing primitives serve
// both the 18×28 portrait and the 18×32 scene sprite. (Rendering is synchronous.)
let CUR_W = PORTRAIT_W, CUR_H = PORTRAIT_H;

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
function shades(rgb: RGB, dl = 1.22, dd = 0.68): [RGB, RGB, RGB] {
  return [
    [clamp(rgb[0] * dl), clamp(rgb[1] * dl), clamp(rgb[2] * dl)],
    [rgb[0], rgb[1], rgb[2]],
    [clamp(rgb[0] * dd), clamp(rgb[1] * dd), clamp(rgb[2] * dd)],
  ];
}
const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] * (1 - t) + b[0] * t),
  Math.round(a[1] * (1 - t) + b[1] * t),
  Math.round(a[2] * (1 - t) + b[2] * t),
];

function set(buf: Buf, x: number, y: number, c: RGB, a = 255): void {
  if (x < 0 || x >= CUR_W || y < 0 || y >= CUR_H) return;
  const i = (y * CUR_W + x) * 4;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = a;
}
const clear = (buf: Buf, x: number, y: number): void => set(buf, x, y, [0, 0, 0], 0);
function alphaAt(buf: Buf, x: number, y: number): number {
  if (x < 0 || x >= CUR_W || y < 0 || y >= CUR_H) return 0;
  return buf[(y * CUR_W + x) * 4 + 3];
}
function rgbAt(buf: Buf, x: number, y: number): RGB {
  const i = (y * CUR_W + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2]];
}
function eq(a: RGB, b: RGB): boolean { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }
function rect(buf: Buf, x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(buf, x, y, c);
}
/** Repaint (x,y) only where it currently holds exactly `base`: a garment detail
 *  that must not spill onto skin, hair or the gap beside the torso. */
function onBase(buf: Buf, x: number, y: number, base: RGB, paint: RGB): void {
  if (alphaAt(buf, x, y) === 255 && eq(rgbAt(buf, x, y), base)) set(buf, x, y, paint);
}

// ─── palettes ────────────────────────────────────────────────────────────────
interface SkinPal { hi: RGB; base: RGB; sh: RGB; line: RGB; }
const SKIN: Record<Skin, SkinPal> = {
  pale:  { hi: [255, 238, 224], base: [252, 226, 208], sh: [226, 188, 166], line: [186, 136, 112] },
  light: { hi: [255, 221, 189], base: [247, 201, 170], sh: [212, 158, 126], line: [168, 112, 82] },
  tan:   { hi: [232, 182, 136], base: [214, 162, 116], sh: [176, 126, 86],  line: [138, 92, 60] },
  brown: { hi: [180, 130, 94],  base: [158, 112, 78],  sh: [124, 86, 58],   line: [90, 60, 40] },
  dark:  { hi: [142, 98, 70],   base: [120, 80, 56],   sh: [94, 62, 42],    line: [64, 42, 28] },
  deep:  { hi: [112, 74, 52],   base: [90, 58, 40],    sh: [66, 40, 27],    line: [44, 26, 16] },
};
/** The base skin colour of every ramp, for the editor's swatches. */
export const SKIN_SWATCHES: Record<Skin, RGB> = Object.fromEntries(
  (Object.keys(SKIN) as Skin[]).map((k) => [k, SKIN[k].base])
) as Record<Skin, RGB>;
const skinPal = (skin: string): SkinPal => SKIN[skin as Skin] ?? SKIN.light;

// ─── head + face ─────────────────────────────────────────────────────────────
function drawHead(buf: Buf, skin: string): void {
  const s = skinPal(skin);
  for (let y = 4; y <= 16; y++) {
    for (let x = HX0; x <= HX1; x++) {
      if (((x === HX0 || x === HX1) && (y === 4 || y === 5 || y === 16)) || ((x === 5 || x === 12) && y === 4)) continue;
      set(buf, x, y, s.base);
    }
  }
  for (let y = 6; y < 12; y++) set(buf, 5, y, s.hi);
  set(buf, 6, 5, s.hi); set(buf, 7, 5, s.hi);
  for (let y = 6; y < 15; y++) set(buf, 12, y, s.sh);
  for (const x of [7, 8, 9, 10, 11]) set(buf, x, 16, s.sh);
  for (const ex of [HX0 - 1, HX1 + 1]) { set(buf, ex, 9, s.base); set(buf, ex, 10, s.base); set(buf, ex, 11, s.sh); }
  rect(buf, 7, 17, 10, 18, s.sh); rect(buf, 7, 17, 9, 17, s.base);
}

// Puff the lower face into round cheeks + a double chin so a character reads as
// heavier. Runs after drawHead (adds skin at the jaw) and is safe before the
// face features, which sit higher (eyes y9, mouth y14).
function drawHeavyFace(buf: Buf, skin: string): void {
  const s = skinPal(skin);
  // Chubby cheeks: bulge the jaw outward past the normal x4..13 head box.
  for (let y = 11; y <= 15; y++) { set(buf, HX0 - 1, y, s.base); set(buf, HX1 + 1, y, s.base); }
  set(buf, HX0 - 1, 15, s.sh); set(buf, HX1 + 1, 15, s.sh);
  // Fuller, rounder lower jaw.
  for (const x of [5, 6, 11, 12]) set(buf, x, 16, s.base);
  // Double chin: a second rounded roll under the jaw.
  rect(buf, 6, 17, 11, 18, s.base);
  for (const x of [6, 7, 8, 9, 10, 11]) set(buf, x, 18, s.sh);
  set(buf, 7, 17, s.sh); set(buf, 10, 17, s.sh); // crease shadow between chin + roll
}

/** Face shape. Runs after drawHead and before the features. `oval` is the
 *  head as drawn; `heavy` is the original heavy build. */
function drawFaceShape(buf: Buf, skin: string, face: Face): void {
  const s = skinPal(skin);
  if (face === 'heavy') { drawHeavyFace(buf, skin); return; }
  if (face === 'round') {
    for (let y = 10; y <= 14; y++) { set(buf, HX0 - 1, y, s.base); set(buf, HX1 + 1, y, s.sh); }
    set(buf, HX0 - 1, 10, s.hi); set(buf, HX0 - 1, 14, s.sh);
  } else if (face === 'square') {
    rect(buf, HX0, 16, HX1, 16, s.base); set(buf, HX1, 16, s.sh);
    rect(buf, 5, 17, 12, 17, s.base); set(buf, 12, 17, s.sh); set(buf, 5, 17, s.sh);
    rect(buf, 7, 18, 10, 18, s.sh);
  } else if (face === 'long') {
    rect(buf, 5, 16, 12, 16, s.base); set(buf, 12, 16, s.sh);
    rect(buf, 5, 17, 12, 17, s.base); set(buf, 12, 17, s.sh);
    rect(buf, 7, 18, 10, 18, s.base); set(buf, 10, 18, s.sh); rect(buf, 7, 19, 10, 19, s.sh);
  } else if (face === 'heart') {
    for (const [x, y] of [[4, 14], [13, 14], [4, 15], [13, 15], [5, 16], [12, 16]] as const) clear(buf, x, y);
    set(buf, 6, 16, s.sh); set(buf, 11, 16, s.sh);
  }
}

/** Eyes, brows, nose, mouth, blush. The original four brows, four mouths and
 *  the original nose are drawn at their exact pixels; the additions sit beside
 *  them. `r` has been through migrateRecipe, so every field below is set. */
function drawFace(buf: Buf, r: AvatarRecipe): void {
  const s = skinPal(r.skin);
  const white: RGB = [250, 248, 244], pup: RGB = r.eyec ?? [46, 38, 42];
  const glint: RGB = [252, 250, 248], lash: RGB = [54, 40, 48];
  const e = r.eyes ?? 'normal';
  if (e === 'normal' || e === 'lashed' || e === 'wide') {
    for (const x of [5, 6, 10, 11]) set(buf, x, 9, white);
    set(buf, 6, 9, pup); set(buf, 10, 9, pup);
  }
  if (e === 'wide') { for (const x of [5, 6, 10, 11]) set(buf, x, 8, white); set(buf, 6, 8, pup); set(buf, 10, 8, pup); }
  // Feminine eyes: a dark upper lash line + an outer flick, and a bright glint
  // in each pupil so they read as bigger, rounder, more expressive.
  if (e === 'lashed') {
    for (const x of [5, 6, 10, 11]) set(buf, x, 8, lash);
    set(buf, 4, 8, lash); set(buf, 12, 8, lash);
    set(buf, 5, 9, glint); set(buf, 10, 9, glint);
  }
  if (e === 'dot') { set(buf, 6, 9, pup); set(buf, 10, 9, pup); }
  if (e === 'squint') for (const x of [5, 6, 10, 11]) set(buf, x, 9, pup);
  if (e === 'happy') { set(buf, 5, 9, pup); set(buf, 6, 8, pup); set(buf, 10, 8, pup); set(buf, 11, 9, pup); }

  const brow = r.brow ?? 'flat';
  if (brow === 'flat') for (const x of [5, 6, 10, 11]) set(buf, x, 7, s.line);
  else if (brow === 'angry') { set(buf, 5, 8, s.line); set(buf, 6, 7, s.line); set(buf, 10, 7, s.line); set(buf, 11, 8, s.line); }
  else if (brow === 'raised') for (const x of [5, 6, 10, 11]) set(buf, x, 6, s.line);
  else if (brow === 'soft') { for (const x of [5, 11]) set(buf, x, 7, s.line); for (const x of [6, 10]) set(buf, x, 7, s.sh); }
  else if (brow === 'thick') { for (const x of [4, 5, 6, 10, 11, 12]) set(buf, x, 7, s.line); set(buf, 5, 6, s.line); set(buf, 11, 6, s.line); }
  else if (brow === 'arched') { set(buf, 5, 7, s.line); set(buf, 6, 6, s.line); set(buf, 10, 6, s.line); set(buf, 11, 7, s.line); }

  const nose = r.nose ?? 'normal';
  if (nose === 'normal') { set(buf, 8, 11, s.sh); set(buf, 8, 12, s.sh); set(buf, 7, 12, s.sh); }
  else if (nose === 'small') set(buf, 8, 12, s.sh);
  else if (nose === 'long') { set(buf, 8, 10, s.sh); set(buf, 8, 11, s.sh); set(buf, 8, 12, s.sh); set(buf, 7, 12, s.sh); }
  else if (nose === 'wide') { set(buf, 8, 11, s.sh); set(buf, 7, 12, s.sh); set(buf, 8, 12, s.sh); set(buf, 9, 12, s.sh); }

  const mc: RGB = r.mouthc ?? [158, 86, 80];
  const mouth = r.mouth ?? 'neutral';
  const mouths: Record<typeof mouth, [number, number][]> = {
    neutral: [[7, 14], [8, 14], [9, 14], [10, 14]],
    smile: [[7, 14], [8, 14], [9, 14], [10, 14], [6, 13], [11, 13]],
    frown: [[7, 15], [8, 15], [9, 15], [10, 15], [6, 14], [11, 14]],
    grin: [[7, 14], [8, 14], [9, 14], [10, 14], [7, 13], [8, 13], [9, 13], [10, 13], [6, 13], [11, 13]],
    smirk: [[7, 14], [8, 14], [9, 14], [10, 14], [11, 13]],
    open: [],
  };
  for (const [x, y] of mouths[mouth]) set(buf, x, y, mc);
  if (mouth === 'open') { rect(buf, 8, 13, 9, 14, [88, 40, 46]); set(buf, 7, 14, mc); set(buf, 10, 14, mc); }
  if (r.blush) for (const x of [5, 12]) set(buf, x, 12, [235, 150, 140], 140);
}

// ─── hairstyles ──────────────────────────────────────────────────────────────
type HairFn = (buf: Buf, color: RGB, skinBase: RGB, a: HairArgs) => void;

const styleShort: HairFn = (buf, color, skinBase, a) => {
  const [hi, base, sh] = shades(color);
  const part = a.part ?? 'L', recede = a.recede ?? 0;
  rect(buf, HX0, 2, HX1, 4, base);
  for (let x = HX0 - 1; x <= HX1 + 1; x++) set(buf, x, 3, base);
  rect(buf, HX0 - 1, 4, HX1 + 1, 5, base);
  for (let y = 6; y < 9; y++) { set(buf, HX0 - 1, y, base); set(buf, HX0, y, base); set(buf, HX1, y, base); set(buf, HX1 + 1, y, base); }
  for (let x = HX0; x <= HX1; x++) set(buf, x, 5, base);
  if (recede) {
    for (let y = 3; y < 6; y++) for (let x = 6; x < 12; x++) if (eq(rgbAt(buf, x, y), base)) set(buf, x, y, skinBase);
    set(buf, 8, 5, base); // widow's peak
  }
  const hx = part === 'L' ? 6 : 11;
  for (let y = 2; y < 6; y++) set(buf, hx, y, sh);
  for (let x = HX0; x < hx; x++) if (alphaAt(buf, x, 3)) set(buf, x, 3, hi);
  for (let x = HX0; x <= HX1; x++) if (alphaAt(buf, x, 2)) set(buf, x, 2, hi);
};

const styleFloppy: HairFn = (buf, color) => {
  const [hi, base] = shades(color);
  rect(buf, HX0, 2, HX1, 4, base);
  for (let x = HX0 - 1; x <= HX1 + 1; x++) set(buf, x, 3, base);
  rect(buf, HX0 - 1, 4, HX1 + 1, 5, base);
  for (let x = HX0; x <= HX1; x++) set(buf, x, 5, base);
  for (let x = 6; x <= 12; x++) set(buf, x, 6, base);
  set(buf, 9, 7, base); set(buf, 10, 7, base); set(buf, 11, 7, base);
  for (let y = 6; y < 9; y++) { set(buf, HX0 - 1, y, base); set(buf, HX0, y, base); set(buf, HX1, y, base); set(buf, HX1 + 1, y, base); }
  for (let x = HX0; x <= HX1; x++) if (alphaAt(buf, x, 2)) set(buf, x, 2, hi);
  for (const x of [7, 8, 9]) set(buf, x, 6, hi);
};

const styleFrame: HairFn = (buf, color, skinBase, a) => {
  const [hi, base, sh] = shades(color);
  const length = a.length ?? 17, vol = a.vol ?? 1;
  rect(buf, HX0 - 1, 2, HX1 + 1, 5, base);
  for (let x = HX0 - 1; x <= HX1 + 1; x++) set(buf, x, 3, base);
  for (let x = HX0; x <= HX1; x++) set(buf, x, 5, base);
  for (let x = 6; x < 12; x++) set(buf, x, 6, base);
  set(buf, 8, 6, skinBase); set(buf, 9, 6, skinBase);
  for (let y = 6; y <= length; y++) {
    for (let dx = 0; dx < vol; dx++) { set(buf, HX0 - 1 - dx, y, base); set(buf, HX1 + 1 + dx, y, base); }
    set(buf, HX0, y, base); set(buf, HX1, y, base);
  }
  for (let x = HX0 - 1; x < HX0 + 1; x++) set(buf, x, length + 1, base);
  for (let x = HX1; x < HX1 + 2; x++) set(buf, x, length + 1, base);
  for (let y = 2; y < 6; y++) if (alphaAt(buf, HX1, y)) set(buf, HX1, y, sh);
  for (let x = HX0; x < 9; x++) if (alphaAt(buf, x, 2)) set(buf, x, 2, hi);
};

const styleBun: HairFn = (buf, color, skinBase) => {
  const [hi, base] = shades(color);
  rect(buf, HX0, 3, HX1, 5, base);
  for (let x = HX0 - 1; x <= HX1 + 1; x++) set(buf, x, 4, base);
  for (let x = HX0; x <= HX1; x++) set(buf, x, 5, base);
  for (let x = 6; x < 12; x++) set(buf, x, 6, base);
  set(buf, 8, 6, skinBase); set(buf, 9, 6, skinBase);
  for (let y = 6; y < 9; y++) { set(buf, HX0, y, base); set(buf, HX1, y, base); }
  rect(buf, 7, 1, 10, 2, base);
  for (let x = HX0; x <= HX1; x++) if (alphaAt(buf, x, 3)) set(buf, x, 3, hi);
};

const styleCurly: HairFn = (buf, color, skinBase) => {
  const [hi, base] = shades(color);
  const pts: [number, number][] = [[4, 3], [5, 2], [6, 3], [7, 2], [8, 3], [9, 2], [10, 3], [11, 2], [12, 3], [13, 3],
    [3, 4], [4, 4], [13, 4], [14, 4], [3, 5], [4, 5], [13, 5], [14, 5], [3, 6], [13, 6], [4, 6], [12, 6], [3, 7], [13, 7], [4, 7]];
  rect(buf, HX0, 3, HX1, 5, base);
  for (let x = HX0 - 1; x <= HX1 + 1; x++) set(buf, x, 4, base);
  for (const [x, y] of pts) set(buf, x, y, base);
  for (let x = 6; x < 12; x++) set(buf, x, 6, base);
  set(buf, 8, 6, skinBase); set(buf, 9, 6, skinBase);
  for (const [x, y] of [[5, 2], [7, 2], [9, 2], [11, 2]] as const) set(buf, x, y, hi);
};

const styleMessy: HairFn = (buf, color, skinBase, a) => {
  const [hi, base] = shades(color);
  const length = a.length ?? 8;
  rect(buf, HX0 - 1, 2, HX1 + 1, 5, base);
  const spikes: [number, number][] = [[3, 2], [5, 1], [7, 2], [9, 1], [11, 2], [13, 1], [14, 2], [4, 2], [12, 2]];
  for (const [x, y] of spikes) set(buf, x, y, base);
  for (let x = HX0; x <= HX1; x++) set(buf, x, 5, base);
  for (let x = 6; x < 12; x++) set(buf, x, 6, base);
  set(buf, 8, 6, skinBase); set(buf, 9, 6, skinBase);
  for (let y = 6; y <= length; y++) { set(buf, HX0 - 1, y, base); set(buf, HX0, y, base); set(buf, HX1, y, base); set(buf, HX1 + 1, y, base); }
  for (const [x, y] of spikes) set(buf, x, y, hi);
};

const styleRecede: HairFn = (buf, color, skinBase) => {
  const [, base, sh] = shades(color);
  for (let y = 4; y < 10; y++) { set(buf, HX0 - 1, y, base); set(buf, HX0, y, base); set(buf, HX1, y, base); set(buf, HX1 + 1, y, base); }
  for (let x = HX0; x <= HX1; x++) set(buf, x, 4, base);
  for (let x = HX0 + 1; x < HX1; x++) set(buf, x, 5, base);
  for (let y = 5; y < 9; y++) for (let x = 6; x < 12; x++) if (eq(rgbAt(buf, x, y), base)) set(buf, x, y, skinBase);
  for (let x = HX0; x <= HX1; x++) if (alphaAt(buf, x, 4)) set(buf, x, 4, sh);
};

const styleSpiky: HairFn = (buf, color, skinBase) => {
  const [hi, base] = shades(color);
  rect(buf, HX0, 3, HX1, 5, base);
  for (let x = HX0 - 1; x <= HX1 + 1; x++) set(buf, x, 4, base);
  for (let x = HX0; x <= HX1; x++) set(buf, x, 5, base);
  const spikes: [number, number][] = [[5, 2], [7, 1], [9, 2], [11, 1], [6, 2], [8, 2], [10, 2], [12, 2]];
  for (const [x, y] of spikes) set(buf, x, y, base);
  for (let x = 6; x < 12; x++) set(buf, x, 6, base);
  set(buf, 8, 6, skinBase); set(buf, 9, 6, skinBase);
  for (let y = 6; y < 8; y++) { set(buf, HX0, y, base); set(buf, HX1, y, base); }
  for (const [x, y] of spikes) set(buf, x, y, hi);
};

// Bald: a rounded skin crown (with a sheen) and only a low horseshoe fringe of
// hair around the temples / back of the head.
const styleBald: HairFn = (buf, color, skinBase, a) => {
  const [shi, sbase, ssh] = shades(skinBase, 1.1, 0.82);
  // rounded skin dome above the forehead
  for (let x = 6; x <= 11; x++) set(buf, x, 2, sbase);
  for (let x = 5; x <= 12; x++) set(buf, x, 3, sbase);
  for (let x = HX0; x <= HX1; x++) set(buf, x, 4, sbase);
  // bald-head sheen + side falloff
  for (const x of [7, 8, 9]) set(buf, x, 2, shi);
  set(buf, 6, 3, shi); set(buf, 7, 3, shi);
  set(buf, 5, 3, ssh); set(buf, 12, 3, ssh); set(buf, HX1, 4, ssh);
  // low horseshoe hair fringe — sides only, leaving the crown bald.
  const [, base, sh] = shades(color);
  const top = a.recede ? 8 : 6; // recede:1 → only a thin fringe very low
  for (let y = top; y <= 10; y++) {
    set(buf, HX0 - 1, y, base); set(buf, HX0, y, base);
    set(buf, HX1, y, base); set(buf, HX1 + 1, y, base);
  }
  for (let y = top; y <= 10; y++) { set(buf, HX0 - 1, y, sh); set(buf, HX1 + 1, y, sh); }
};

// Long, straight hair down past the shoulders. `length` is the last row.
const styleLong: HairFn = (buf, color, _skinBase, a) => {
  const [hi, base, sh] = shades(color);
  const len = a.length ?? 23;
  rect(buf, 5, 2, 12, 2, base); rect(buf, 4, 3, 13, 4, base);
  for (let x = 6; x <= 9; x++) set(buf, x, 2, hi);
  for (let y = 5; y <= 7; y++) { set(buf, 4, y, base); set(buf, 13, y, sh); }
  for (let y = 4; y <= len; y++) { set(buf, 3, y, y <= 9 ? hi : base); set(buf, 14, y, sh); }
  for (let y = 8; y <= len; y++) { set(buf, 2, y, base); set(buf, 15, y, sh); }
};

// A full round afro: two columns wider than the head on both sides, up to row 0.
const styleAfro: HairFn = (buf, color) => {
  const [hi, base, sh] = shades(color);
  rect(buf, 5, 0, 12, 0, base); rect(buf, 3, 1, 14, 1, base); rect(buf, 2, 2, 15, 4, base);
  for (let y = 5; y <= 12; y++) { rect(buf, 2, y, 3, y, base); rect(buf, 14, y, 15, y, base); }
  set(buf, 2, 13, base); set(buf, 15, 13, base); set(buf, 4, 5, base); set(buf, 13, 5, base);
  for (let y = 2; y <= 13; y++) set(buf, 15, y, sh);
  for (let y = 5; y <= 12; y++) set(buf, 14, y, y % 2 ? sh : base);
  for (const [x, y] of [[5, 0], [6, 0], [3, 1], [4, 1], [2, 2], [3, 2], [2, 3], [2, 5], [3, 7], [2, 9]] as const) set(buf, x, y, hi);
};

// Buzz cut: the hair colour blended into the skin, one row above the head.
const styleBuzz: HairFn = (buf, color, skinBase) => {
  const c = mix(shades(color)[1], skinBase, 0.45);
  rect(buf, 5, 3, 12, 3, c); rect(buf, 4, 4, 13, 4, c); set(buf, 4, 5, c); set(buf, 13, 5, c);
};

// Mohawk: buzzed sides and a two pixel crest up to row 0.
const styleMohawk: HairFn = (buf, color, skinBase) => {
  const [hi, base, sh] = shades(color);
  const c = mix(base, skinBase, 0.5);
  rect(buf, 4, 4, 13, 4, c); set(buf, 4, 5, c); set(buf, 13, 5, c);
  rect(buf, 8, 0, 9, 3, base); set(buf, 7, 3, base); set(buf, 10, 3, base);
  set(buf, 8, 0, hi); set(buf, 8, 1, hi); set(buf, 9, 3, sh); set(buf, 10, 3, sh);
};

/** Typed against HairStyle: a style added to the vocabulary without a drawing
 *  here (or the reverse) fails the build. */
const HAIR_FNS: Record<HairStyle, HairFn> = {
  styleShort, styleFloppy, styleFrame, styleBun, styleCurly, styleMessy, styleRecede, styleSpiky, styleBald,
  styleLong, styleAfro, styleBuzz, styleMohawk,
};

// ─── facial hair ─────────────────────────────────────────────────────────────
function drawFacial(buf: Buf, kind: Facial, color: RGB): void {
  const [, base, sh] = shades(color);
  if (kind === 'mustache') {
    for (const x of [6, 7, 8, 9, 10]) set(buf, x, 13, base);
    set(buf, 6, 12, base); set(buf, 10, 12, base);
  } else if (kind === 'mustacheSm') {
    for (const x of [7, 8, 9]) set(buf, x, 13, base);
  } else if (kind === 'stubble') {
    for (const [x, y] of [[5, 14], [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [11, 14], [12, 13], [4, 13], [5, 15], [10, 15]] as const)
      set(buf, x, y, sh, 150);
  } else if (kind === 'goatee') {
    for (const x of [8, 9]) set(buf, x, 15, base);
    set(buf, 8, 14, base); set(buf, 9, 14, base);
    for (const x of [7, 8, 9, 10]) set(buf, x, 13, base);
  }
}

// ─── glasses ─────────────────────────────────────────────────────────────────
// Clear prescription glasses (NOT sunglasses): a thin rim that frames each eye
// without covering it. The lens interior keeps the eye/skin already drawn, plus
// a small white glint so the lens reads as transparent glass.
function drawGlasses(buf: Buf): void {
  const frame: RGB = [60, 54, 62];
  const glint: RGB = [236, 240, 246];
  // Left lens rim around the eye at (5-6, 9): top, bottom, outer + inner edge.
  for (const x of [5, 6]) { set(buf, x, 8, frame); set(buf, x, 10, frame); }
  set(buf, 4, 9, frame); set(buf, 7, 9, frame);
  set(buf, 4, 8, frame); set(buf, 7, 8, frame);
  // Right lens rim around the eye at (10-11, 9).
  for (const x of [10, 11]) { set(buf, x, 8, frame); set(buf, x, 10, frame); }
  set(buf, 9, 9, frame); set(buf, 12, 9, frame);
  set(buf, 9, 8, frame); set(buf, 12, 8, frame);
  // Bridge over the nose + temple arms out to the hair.
  set(buf, 8, 8, frame);
  set(buf, 3, 9, frame); set(buf, 13, 9, frame);
  // Glass glint on each rim's top-outer corner so the lens reads as clear glass.
  set(buf, 4, 8, glint); set(buf, 9, 8, glint);
}

// ─── clothing ────────────────────────────────────────────────────────────────
function bodyShape(buf: Buf, col: RGB, heavy = false): void {
  const [, base, sh] = shades(col);
  const rows: [number, number, number][] = heavy
    ? [[19, 5, 12], [20, 3, 14], [21, 2, 15], [22, 1, 16], [23, 1, 16], [24, 0, 17], [25, 0, 17], [26, 0, 17], [27, 0, 17]]
    : [[19, 6, 11], [20, 4, 13], [21, 3, 14], [22, 2, 15], [23, 2, 15], [24, 1, 16], [25, 1, 16], [26, 1, 16], [27, 1, 16]];
  for (const [y, a, b] of rows) rect(buf, a, y, b, y, base);
  const [lo, hi] = heavy ? [1, 16] : [2, 15];
  for (let y = 22; y < 28; y++) { set(buf, lo, y, sh); set(buf, hi, y, sh); }
}

/** The bust: body shape + the six original garments. Any other garment gets
 *  the body only here and its details from GARMENT_ART below. */
function drawClothing(buf: Buf, kind: Cloth, c1: RGB, c2: RGB | undefined, tie: RGB | undefined, skin: string, heavy = false): void {
  const [hi, base, sh] = shades(c1);
  bodyShape(buf, c1, heavy);
  if (kind === 'suit') {
    const white: RGB = [238, 238, 236];
    for (const [x, y] of [[8, 19], [9, 19], [7, 20], [8, 20], [9, 20], [10, 20], [8, 21], [9, 21]] as const) set(buf, x, y, white);
    for (const [x, y] of [[6, 20], [7, 21], [11, 20], [10, 21], [6, 21], [11, 21]] as const) set(buf, x, y, sh);
    if (tie) { for (let y = 20; y < 26; y++) { set(buf, 8, y, tie); set(buf, 9, y, tie); } set(buf, 8, 20, shades(tie)[0]); }
    else for (let y = 22; y < 26; y++) { set(buf, 8, y, white); set(buf, 9, y, white); }
  } else if (kind === 'dressshirt') {
    for (const [x, y] of [[6, 19], [7, 19], [10, 19], [11, 19], [7, 20], [10, 20]] as const) set(buf, x, y, sh);
    for (let y = 20; y < 27; y += 2) set(buf, 8, y, sh);
    if (tie) for (let y = 19; y < 26; y++) { set(buf, 8, y, tie); set(buf, 9, y, tie); }
  } else if (kind === 'polo') {
    for (const [x, y] of [[6, 19], [7, 19], [10, 19], [11, 19]] as const) set(buf, x, y, hi);
    set(buf, 8, 20, sh); set(buf, 8, 22, sh);
    const accent = c2 ? shades(c2)[1] : hi;
    for (const [x, y] of [[7, 20], [9, 20]] as const) set(buf, x, y, accent);
  } else if (kind === 'blouse') {
    const s = skinPal(skin);
    for (const [x, y] of [[7, 19], [8, 19], [9, 19], [10, 19], [8, 20], [9, 20]] as const) set(buf, x, y, s.sh);
    for (let x = 5; x < 13; x++) if (eq(rgbAt(buf, x, 20), base)) set(buf, x, 20, hi);
  } else if (kind === 'cardigan') {
    const inner: RGB = c2 ? shades(c2)[1] : [235, 233, 226];
    for (let y = 19; y < 27; y++) { set(buf, 8, y, inner); set(buf, 9, y, inner); }
    for (const [x, y] of [[6, 19], [7, 19], [10, 19], [11, 19]] as const) set(buf, x, y, sh);
  } else if (kind === 'sweater') {
    for (const [x, y] of [[6, 19], [7, 19], [8, 19], [9, 19], [10, 19], [11, 19]] as const) set(buf, x, y, sh);
  }
}
function collarNeck(buf: Buf, skin: string): void {
  rect(buf, 7, 18, 10, 19, skinPal(skin).sh);
}

/** What one garment drawing needs to know about the recipe. */
interface GarmentCtx {
  hi: RGB; base: RGB; sh: RGB;
  c1: RGB; c2?: RGB; tie?: RGB;
  skin: SkinPal;
  heavy: boolean;
}
interface GarmentArt {
  /** Details over the body. `T` is the first clothing row: 19 on the bust, 18 on the figure. */
  draw?(b: Buf, T: number, c: GarmentCtx): void;
  /** Painted AFTER the head, over the neck: collars that rise above the shoulder line. */
  over?(b: Buf, c: GarmentCtx, scene: boolean): void;
  /** Scene figure only, after the legs: a skirt over the trousers. */
  skirt?(b: Buf, c: GarmentCtx): void;
}
const W: RGB = [238, 238, 236], IVORY: RGB = [235, 233, 226];

/** The fourteen garments added for the editor. The six originals stay in
 *  drawClothing / drawSceneTorso, untouched. */
const GARMENT_ART: Partial<Record<Cloth, GarmentArt>> = {
  shirt_open: { draw(b, T, c) {
    for (const [x, y] of [[5, T], [6, T], [11, T], [12, T], [6, T + 1], [11, T + 1]] as const) set(b, x, y, c.sh);
    for (const [x, y] of [[8, T], [9, T], [8, T + 1], [9, T + 1]] as const) set(b, x, y, c.skin.base);
    set(b, 8, T + 3, c.sh); set(b, 8, T + 5, c.sh);
  } },
  tee: { draw(b, T, c) {
    for (const x of [7, 8, 9, 10]) set(b, x, T, c.sh);
    if (c.c2) rect(b, 8, T + 3, 9, T + 4, c.c2);
  } },
  vest: { draw(b, T, c) {
    for (const [x, y] of [[8, T], [9, T], [7, T + 1], [8, T + 1], [9, T + 1], [10, T + 1], [8, T + 2], [9, T + 2], [6, T], [11, T]] as const) set(b, x, y, W);
    for (const [x, y] of [[7, T + 2], [10, T + 2], [7, T + 3], [10, T + 3]] as const) set(b, x, y, c.sh);
    set(b, 8, T + 4, c.sh); set(b, 8, T + 6, c.sh);
    if (c.tie) for (let y = T + 1; y <= T + 6; y++) { set(b, 8, y, c.tie); set(b, 9, y, c.tie); }
  } },
  blazer_tee: { draw(b, T, c) {
    const inner = c.c2 ?? IVORY;
    rect(b, 7, T, 10, T + 6, inner);
    set(b, 8, T, shades(inner)[2]); set(b, 9, T, shades(inner)[2]);
    for (const [x, y] of [[6, T], [11, T], [7, T + 1], [10, T + 1]] as const) set(b, x, y, c.sh);
  } },
  turtleneck: { over(b, c) {
    rect(b, 6, 17, 11, 18, c.base); for (const x of [7, 8, 9, 10]) set(b, x, 17, c.hi);
    set(b, 6, 17, c.sh); set(b, 11, 17, c.sh); set(b, 11, 18, c.sh);
  } },
  hoodie: {
    draw(b, T, c) {
      for (const x of [7, 10]) for (let y = T + 1; y <= T + 3; y++) set(b, x, y, c.hi);
      rect(b, 6, T + 5, 11, T + 5, c.sh); set(b, 6, T + 6, c.sh); set(b, 11, T + 6, c.sh);
    },
    over(b, c, scene) {
      const x0 = scene ? 5 : 6, x1 = scene ? 12 : 11;
      rect(b, x0, 17, 6, 17, c.base); rect(b, 11, 17, x1, 17, c.base);
      rect(b, x0 - 1, 18, 7, 18, c.base); rect(b, 10, 18, x1 + 1, 18, c.base);
      set(b, x0 - 1, 18, c.sh); set(b, x1 + 1, 18, c.sh); set(b, 8, 18, c.skin.sh); set(b, 9, 18, c.skin.sh);
    }
  },
  boatneck: { draw(b, T, c) {
    for (const x of [6, 7, 8, 9, 10, 11]) set(b, x, T, c.skin.sh);
    for (let x = 5; x <= 12; x++) onBase(b, x, T + 1, c.base, c.hi);
  } },
  dress: {
    draw(b, T, c) {
      set(b, 8, T, c.skin.sh); set(b, 9, T, c.skin.sh); set(b, 7, T, c.sh); set(b, 10, T, c.sh);
      for (let x = 5; x <= 12; x++) onBase(b, x, T + 5, c.base, c.sh);
    },
    skirt(b, c) {
      const x0 = c.heavy ? 3 : 4, x1 = c.heavy ? 14 : 13;
      rect(b, x0, 25, x1, 28, c.base);
      for (let y = 25; y <= 28; y++) { set(b, x0, y, c.hi); set(b, x1, y, c.sh); set(b, x1 - 1, y, c.sh); }
    }
  },
  wrap: { draw(b, T, c) {
    for (const [x, y] of [[5, T], [6, T + 1], [7, T + 2], [8, T + 3], [12, T], [11, T + 1], [10, T + 2], [9, T + 3]] as const) set(b, x, y, c.sh);
    for (const [x, y] of [[7, T], [8, T], [9, T], [10, T], [8, T + 1], [9, T + 1]] as const) set(b, x, y, c.skin.sh);
    for (let x = 6; x <= 11; x++) onBase(b, x, T + 5, c.base, c.hi);
  } },
  blazer_w: { draw(b, T, c) {
    const inner = c.c2 ?? IVORY;
    for (let y = T + 1; y <= T + 6; y++) { set(b, 8, y, inner); set(b, 9, y, inner); }
    set(b, 8, T, c.skin.sh); set(b, 9, T, c.skin.sh);
    for (const [x, y] of [[6, T], [11, T], [7, T + 1], [10, T + 1]] as const) set(b, x, y, c.sh);
  } },
  stripe_tee: { draw(b, T, c) {
    for (const x of [7, 8, 9, 10]) set(b, x, T, c.sh);
    const st = c.c2 ?? IVORY;
    for (const y of [T + 2, T + 4, T + 6]) for (let x = 4; x <= 13; x++) onBase(b, x, y, c.base, st);
  } },
  cami: { draw(b, T, c) {
    for (const x of [7, 8, 9, 10]) set(b, x, T, c.skin.sh);
    for (const [x, y] of [[4, T + 1], [5, T + 1], [12, T + 1], [13, T + 1], [3, T + 2], [4, T + 2], [13, T + 2], [14, T + 2]] as const) onBase(b, x, y, c.base, c.skin.base);
    for (const [x, y] of [[13, T + 1], [14, T + 2]] as const) onBase(b, x, y, c.skin.base, c.skin.sh);
  } },
  sweater_v: { draw(b, T, c) {
    const inner = c.c2 ?? W;
    for (const [x, y] of [[7, T], [8, T], [9, T], [10, T], [8, T + 1], [9, T + 1]] as const) set(b, x, y, inner);
    for (const [x, y] of [[6, T], [11, T], [7, T + 1], [10, T + 1], [8, T + 2], [9, T + 2]] as const) set(b, x, y, c.sh);
  } },
  shirt_w: { draw(b, T, c) {
    for (const [x, y] of [[6, T], [11, T]] as const) set(b, x, y, c.hi);
    for (const [x, y] of [[7, T], [10, T]] as const) set(b, x, y, c.sh);
    set(b, 8, T, c.skin.sh); set(b, 9, T, c.skin.sh);
    for (let y = T + 1; y <= T + 6; y += 2) set(b, 8, y, c.sh);
  } },
};

function garmentCtx(r: AvatarRecipe): GarmentCtx {
  const [hi, base, sh] = shades(r.c1);
  return { hi, base, sh, c1: r.c1, c2: r.c2, tie: r.tie, skin: skinPal(r.skin), heavy: r.face === 'heavy' };
}

// ─── scene body (full standing figure: torso + legs, front or back) ──────────
// Proportioned for standing (not the portrait bust): a narrower torso over real
// legs. Head (rows 2-16) sits above; this draws rows 18-31.
const SHOE: RGB = [44, 40, 48];

function drawSceneLegs(buf: Buf, pants: RGB, phase: number): void {
  const [, base, sh] = shades(pants);
  // two legs cols 5-7 / 10-12, gap at 8-9
  for (const [lx0, lx1] of [[5, 7], [10, 12]] as const) {
    rect(buf, lx0, 25, lx1, 30, base);
    for (let y = 25; y <= 30; y++) set(buf, lx1, y, sh); // inner shade
  }
  // feet — lift one foot per walk phase for a simple gait
  const leftLow = phase !== 1, rightLow = phase !== 2;
  rect(buf, 5, leftLow ? 31 : 30, 7, leftLow ? 31 : 30, SHOE);
  rect(buf, 10, rightLow ? 31 : 30, 12, rightLow ? 31 : 30, SHOE);
}

function drawSceneTorso(buf: Buf, r: AvatarRecipe, back: boolean): void {
  const [hi, base, sh] = shades(r.c1);
  // shoulders → torso, narrower than the portrait bust (wider + rounder if heavy)
  if (r.heavy) {
    rect(buf, 3, 18, 14, 18, base);
    rect(buf, 2, 19, 15, 19, base);
    rect(buf, 2, 20, 15, 24, base);
    for (let y = 20; y <= 24; y++) { set(buf, 2, y, sh); set(buf, 15, y, sh); set(buf, 14, y, sh); }
  } else {
    rect(buf, 4, 18, 13, 18, base);
    rect(buf, 3, 19, 14, 19, base);
    rect(buf, 4, 20, 13, 24, base);
    for (let y = 20; y <= 24; y++) { set(buf, 3, y, sh); set(buf, 14, y, sh); set(buf, 13, y, sh); } // arms / right shade
  }
  if (back) {
    // plain back with a collar line + center seam
    rect(buf, 6, 18, 11, 18, sh);
    for (let y = 19; y <= 24; y++) set(buf, 8, y, sh);
    return;
  }
  const skin = skinPal(r.skin);
  if (r.cloth === 'suit') {
    const white: RGB = [238, 238, 236];
    for (const [x, y] of [[8, 18], [9, 18], [7, 19], [8, 19], [9, 19], [10, 19], [8, 20], [9, 20]] as const) set(buf, x, y, white);
    for (const [x, y] of [[6, 19], [7, 20], [11, 19], [10, 20]] as const) set(buf, x, y, sh);
    if (r.tie) { for (let y = 19; y <= 24; y++) { set(buf, 8, y, r.tie); set(buf, 9, y, r.tie); } set(buf, 8, 19, shades(r.tie)[0]); }
  } else if (r.cloth === 'dressshirt') {
    for (const [x, y] of [[6, 18], [7, 18], [10, 18], [11, 18], [7, 19], [10, 19]] as const) set(buf, x, y, sh);
    if (r.tie) for (let y = 18; y <= 24; y++) { set(buf, 8, y, r.tie); set(buf, 9, y, r.tie); }
    else for (let y = 20; y <= 24; y += 2) set(buf, 8, y, sh);
  } else if (r.cloth === 'polo') {
    for (const [x, y] of [[6, 18], [7, 18], [10, 18], [11, 18]] as const) set(buf, x, y, hi);
    set(buf, 8, 19, sh); set(buf, 8, 21, sh);
  } else if (r.cloth === 'blouse') {
    for (const [x, y] of [[7, 18], [8, 18], [9, 18], [10, 18], [8, 19], [9, 19]] as const) set(buf, x, y, skin.sh);
    for (let x = 5; x < 13; x++) if (eq(rgbAt(buf, x, 19), base)) set(buf, x, 19, hi);
  } else if (r.cloth === 'cardigan') {
    const inner: RGB = r.c2 ? shades(r.c2)[1] : [235, 233, 226];
    for (let y = 18; y <= 24; y++) { set(buf, 8, y, inner); set(buf, 9, y, inner); }
    for (const [x, y] of [[6, 18], [7, 18], [10, 18], [11, 18]] as const) set(buf, x, y, sh);
  } else if (r.cloth === 'sweater') {
    for (const [x, y] of [[6, 18], [7, 18], [8, 18], [9, 18], [10, 18], [11, 18]] as const) set(buf, x, y, sh);
  }
}

/** Back of the head: a rounded hair-covered skull with crown sheen + nape, no face. */
function drawHeadBack(buf: Buf, r: AvatarRecipe): void {
  const s = skinPal(r.skin);
  if (r.hair === 'styleBald') { drawHeadBackBald(buf, r); return; }
  const [hi, base, sh] = shades(r.hairc);
  // rounded skull silhouette (narrow at crown + nape, full through the middle)
  const rows: [number, number, number][] = [
    [2, 6, 11], [3, 5, 12], [4, 4, 13], [5, 4, 13], [6, 4, 13], [7, 4, 13], [8, 4, 13],
    [9, 4, 13], [10, 4, 13], [11, 4, 13], [12, 4, 13], [13, 5, 12], [14, 6, 11],
  ];
  for (const [y, a, b] of rows) rect(buf, a, y, b, y, base);
  // long styles drape down the sides past the head
  const len = r.hair === 'styleFrame' ? (r.hairargs?.length ?? 17)
            : r.hair === 'styleMessy' ? (r.hairargs?.length ?? 9) : 0;
  for (let y = 11; y <= len; y++) { set(buf, HX0 - 1, y, base); set(buf, HX0, y, base); set(buf, HX1, y, base); set(buf, HX1 + 1, y, base); }
  // roundness: darken the side edges and the nape
  for (let y = 4; y <= 12; y++) { set(buf, 4, y, sh); set(buf, 13, y, sh); }
  for (const [x, y] of [[5, 3], [12, 3], [5, 13], [12, 13], [6, 14], [11, 14]] as const) set(buf, x, y, sh);
  // crown sheen (rounded top catching the light) + subtle center part
  for (const [x, y] of [[7, 2], [8, 2], [9, 2], [10, 2], [7, 3], [8, 3], [9, 3]] as const) set(buf, x, y, hi);
  for (let y = 4; y <= 11; y++) set(buf, 9, y, hi);   // sheen down the crown
  for (let y = 4; y <= 12; y++) set(buf, 8, y, sh);   // part line
  // nape + neck (skin)
  rect(buf, 7, 14, 10, 14, sh);
  rect(buf, 7, 15, 10, 17, s.sh);
  rect(buf, 7, 15, 9, 15, s.base);
}

/** Back of a bald head: a skin skull with a sheen and a low hair fringe ring. */
function drawHeadBackBald(buf: Buf, r: AvatarRecipe): void {
  const s = skinPal(r.skin);
  const [shi, sbase, ssh] = shades(s.base, 1.1, 0.82);
  const rows: [number, number, number][] = [
    [2, 6, 11], [3, 5, 12], [4, 4, 13], [5, 4, 13], [6, 4, 13], [7, 4, 13], [8, 4, 13],
    [9, 4, 13], [10, 4, 13], [11, 4, 13], [12, 4, 13], [13, 5, 12], [14, 6, 11],
  ];
  for (const [y, a, b] of rows) rect(buf, a, y, b, y, sbase);
  for (let y = 4; y <= 12; y++) { set(buf, 4, y, ssh); set(buf, 13, y, ssh); }
  for (const [x, y] of [[7, 2], [8, 2], [9, 2], [8, 3], [9, 4], [9, 5]] as const) set(buf, x, y, shi);
  // low hair fringe ring around the back/sides
  const [, base, sh] = shades(r.hairc);
  for (let x = 4; x <= 13; x++) { set(buf, x, 11, base); set(buf, x, 12, base); }
  for (const x of [4, 13]) { set(buf, x, 11, sh); set(buf, x, 12, sh); }
  // nape + neck (skin)
  rect(buf, 7, 14, 10, 14, s.sh);
  rect(buf, 7, 15, 10, 17, s.sh);
  rect(buf, 7, 15, 9, 15, s.base);
}

/** Back view for every style: the original drawing, then the fix-ups the four
 *  new styles need (the buzz and the mohawk start from the bald skull). */
function drawHeadBackAny(buf: Buf, r: AvatarRecipe): void {
  const [hi, base, sh] = shades(r.hairc);
  const s = skinPal(r.skin);
  if (r.hair === 'styleBuzz' || r.hair === 'styleMohawk') {
    drawHeadBackBald(buf, r);
    const c = mix(base, s.base, r.hair === 'styleBuzz' ? 0.45 : 0.5);
    // the bald back paints a fringe ring on rows 11..12; repaint skull rows 2..12 as stubble
    for (let y = 2; y <= 12; y++) for (let x = 4; x <= 13; x++) {
      if (alphaAt(buf, x, y) === 255 && !eq(rgbAt(buf, x, y), s.sh)) set(buf, x, y, c);
    }
    if (r.hair === 'styleMohawk') { rect(buf, 8, 1, 9, 12, base); set(buf, 8, 1, hi); set(buf, 8, 2, hi); }
    return;
  }
  drawHeadBack(buf, r);
  if (r.hair === 'styleLong') {
    const len = r.hairargs?.length ?? 23;
    for (let y = 11; y <= len; y++) { set(buf, 2, y, base); set(buf, 3, y, base); set(buf, 4, y, base); set(buf, 13, y, sh); set(buf, 14, y, sh); set(buf, 15, y, sh); }
    for (let y = 15; y <= len; y++) for (let x = 5; x <= 12; x++) set(buf, x, y, x === 8 ? sh : base);
  } else if (r.hair === 'styleAfro') {
    rect(buf, 5, 0, 12, 0, base); rect(buf, 3, 1, 14, 1, base); rect(buf, 2, 2, 15, 3, base);
    for (let y = 4; y <= 12; y++) { rect(buf, 2, y, 3, y, base); rect(buf, 14, y, 15, y, sh); }
    for (let y = 2; y <= 13; y++) set(buf, 15, y, sh);
    for (const [x, y] of [[5, 0], [6, 0], [3, 1], [2, 2], [2, 3]] as const) set(buf, x, y, hi);
  }
}

// ─── outline pass ────────────────────────────────────────────────────────────
function outlinePass(buf: Buf): void {
  const pts: [number, number][] = [];
  for (let y = 0; y < CUR_H; y++) {
    for (let x = 0; x < CUR_W; x++) {
      if (alphaAt(buf, x, y) !== 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (alphaAt(buf, x + dx, y + dy) === 255) { pts.push([x, y]); break; }
      }
    }
  }
  for (const [x, y] of pts) set(buf, x, y, OUTLINE);
}

// ─── the cast ────────────────────────────────────────────────────────────────
/** The fifteen shipped recipes, in their original short form (migrateRecipe
 *  fills the rest at draw time). Exhaustive over BuiltinCharacterName. */
export const CAST_RECIPES: Readonly<Record<BuiltinCharacterName, AvatarRecipe>> = {
  michael:  { skin: 'light', hairc: [58, 42, 28],   hair: 'styleShort',  hairargs: { part: 'L' }, cloth: 'suit', c1: [58, 63, 74], tie: [170, 58, 58], brow: 'flat', mouth: 'smile' },
  jim:      { skin: 'light', hairc: [92, 60, 34],   hair: 'styleFloppy', cloth: 'dressshirt', c1: [172, 196, 224], tie: [120, 130, 150], brow: 'flat', mouth: 'smile' },
  pam:      { skin: 'light', hairc: [120, 76, 42],  hair: 'styleFrame',  hairargs: { length: 18, vol: 2 }, cloth: 'cardigan', c1: [236, 174, 192], c2: [244, 242, 238], brow: 'soft', mouth: 'smile', blush: true, lashes: true },
  dwight:   { skin: 'light', hairc: [64, 48, 28],   hair: 'styleShort',  hairargs: { part: 'L', recede: 1 }, cloth: 'dressshirt', c1: [184, 155, 62], tie: [120, 82, 46], glasses: true, brow: 'angry', mouth: 'neutral' },
  kevin:    { skin: 'light', hairc: [58, 44, 30],   hair: 'styleBald',   cloth: 'polo', c1: [110, 140, 180], c2: [90, 120, 160], brow: 'flat', mouth: 'neutral', heavy: true },
  angela:   { skin: 'light', hairc: [186, 154, 90], hair: 'styleBun',    cloth: 'cardigan', c1: [150, 146, 170], c2: [235, 233, 226], brow: 'angry', mouth: 'frown', lashes: true },
  oscar:    { skin: 'tan',   hairc: [28, 22, 18],   hair: 'styleShort',  hairargs: { part: 'L' }, cloth: 'sweater', c1: [122, 60, 74], brow: 'flat', mouth: 'smile' },
  stanley:  { skin: 'dark',  hairc: [60, 54, 48],   hair: 'styleRecede', cloth: 'dressshirt', c1: [150, 120, 86], tie: [120, 78, 52], glasses: true, facial: 'mustache', brow: 'flat', mouth: 'neutral', heavy: true },
  phyllis:  { skin: 'light', hairc: [196, 162, 110], hair: 'styleCurly', cloth: 'blouse', c1: [202, 160, 192], glasses: true, brow: 'soft', mouth: 'smile', lashes: true, heavy: true },
  andy:     { skin: 'light', hairc: [74, 51, 32],   hair: 'styleShort',  hairargs: { part: 'R' }, cloth: 'polo', c1: [176, 65, 58], c2: [150, 50, 46], brow: 'raised', mouth: 'smile' },
  kelly:    { skin: 'tan',   hairc: [24, 18, 22],   hair: 'styleFrame',  hairargs: { length: 20, vol: 1 }, cloth: 'blouse', c1: [212, 90, 158], brow: 'soft', mouth: 'smile', blush: true, lashes: true },
  ryan:     { skin: 'light', hairc: [42, 32, 24],   hair: 'styleSpiky',  cloth: 'suit', c1: [58, 58, 68], tie: [40, 40, 50], brow: 'flat', mouth: 'neutral' },
  toby:     { skin: 'light', hairc: [106, 90, 66],  hair: 'styleShort',  hairargs: { part: 'L', recede: 1 }, cloth: 'dressshirt', c1: [150, 150, 120], facial: 'mustacheSm', brow: 'soft', mouth: 'frown' },
  creed:    { skin: 'light', hairc: [170, 166, 156], hair: 'styleBald',   cloth: 'dressshirt', c1: [126, 130, 96], facial: 'stubble', brow: 'flat', mouth: 'neutral' },
  meredith: { skin: 'light', hairc: [154, 82, 46],  hair: 'styleMessy',  hairargs: { length: 15 }, cloth: 'blouse', c1: [176, 86, 74], brow: 'raised', mouth: 'smile', lashes: true },
};

/** The recipe behind any character name: a built-in, a registered custom
 *  avatar, a preset, or Jim as the stand-in for a name nothing can draw (a
 *  deleted avatar renders as somebody rather than crashing the floor). */
export function resolveRecipe(name: OfficeCharacterName | string): AvatarRecipe {
  const builtin = (CAST_RECIPES as Record<string, AvatarRecipe | undefined>)[name];
  if (builtin) return builtin;
  if (isCustomAvatarId(name)) {
    const a = getCustomAvatar(name.slice(CUSTOM_PREFIX.length));
    if (a) return a.recipe;
  }
  const p = presetIndexOf(name);
  if (p !== null) return presetRecipe(p);
  return CAST_RECIPES.jim;
}

// ─── compose ─────────────────────────────────────────────────────────────────
/** The face/hair group (head → face shape → face → facial hair → hair → glasses), no clothing. */
function drawHeadGroup(buf: Buf, r: AvatarRecipe): void {
  const skinBase = skinPal(r.skin).base;
  drawHead(buf, r.skin);
  drawFaceShape(buf, r.skin, r.face ?? 'oval');
  drawFace(buf, r);
  if (r.facial) drawFacial(buf, r.facial, r.hairc);
  HAIR_FNS[r.hair](buf, r.hairc, skinBase, r.hairargs ?? {});
  if (r.glasses) drawGlasses(buf);
}

function defaultPants(r: AvatarRecipe): RGB {
  if (r.pants) return r.pants;
  return r.cloth === 'suit' ? shades(r.c1)[2] : [54, 56, 70];
}

/** Portrait bust: shoulders-height clothing + front head group. `r` is migrated. */
function compose(r: AvatarRecipe): Buf {
  CUR_W = PORTRAIT_W; CUR_H = PORTRAIT_H;
  const buf = new Uint8ClampedArray(PORTRAIT_W * PORTRAIT_H * 4);
  const c = garmentCtx(r);
  const art = GARMENT_ART[r.cloth];
  drawClothing(buf, r.cloth, r.c1, r.c2, r.tie, r.skin, c.heavy);
  art?.draw?.(buf, 19, c);
  collarNeck(buf, r.skin);
  drawHeadGroup(buf, r);
  art?.over?.(buf, c, false);
  outlinePass(buf);
  return buf;
}

/** Full-body 18×32 scene sprite. `back=false` reuses the portrait's exact face. */
function composeScene(r: AvatarRecipe, phase: number, back: boolean): Buf {
  CUR_W = SCENE_W; CUR_H = SCENE_H;
  const buf = new Uint8ClampedArray(SCENE_W * SCENE_H * 4);
  const c = garmentCtx(r);
  const art = GARMENT_ART[r.cloth];
  drawSceneTorso(buf, r, back);
  if (!back) art?.draw?.(buf, 18, c);
  drawSceneLegs(buf, defaultPants(r), phase);
  art?.skirt?.(buf, c);
  if (back) drawHeadBackAny(buf, r);
  else drawHeadGroup(buf, r);
  if (!back) art?.over?.(buf, c, true);
  outlinePass(buf);
  return buf;
}

// ─── public render ───────────────────────────────────────────────────────────
// Keyed by the recipe's content (recipeKey), not by character name: an edited
// custom avatar has a new key and simply misses, so nothing has to be
// invalidated. The editor produces one key per change; the caps below keep a
// long editing session from holding a few thousand buffers.
const CACHE_CAP = 512;
const bufCache = new Map<string, Buf>();
const sceneCache = new Map<string, SceneFrames>();

export interface SceneFrames { front: Buf[]; back: Buf[]; }

/** The 18×28 bust for a recipe, RGBA. */
export function portraitBufFor(recipe: AvatarRecipe): Buf {
  const m = migrateRecipe(recipe);
  const k = recipeKey(m);
  let buf = bufCache.get(k);
  if (!buf) {
    if (bufCache.size >= CACHE_CAP) bufCache.clear();
    buf = compose(m);
    bufCache.set(k, buf);
  }
  return buf;
}

/** The 18×28 bust for a character name. */
export function portraitBuf(name: OfficeCharacterName | string): Buf {
  return portraitBufFor(resolveRecipe(name));
}

/** Walk-phase frames (stand, step-L, step-R) for a recipe, front + back. */
export function sceneFrameBufsFor(recipe: AvatarRecipe): SceneFrames {
  const m = migrateRecipe(recipe);
  const k = recipeKey(m);
  let frames = sceneCache.get(k);
  if (!frames) {
    if (sceneCache.size >= CACHE_CAP) sceneCache.clear();
    frames = {
      front: [composeScene(m, 0, false), composeScene(m, 1, false), composeScene(m, 2, false)],
      back: [composeScene(m, 0, true), composeScene(m, 1, true), composeScene(m, 2, true)],
    };
    sceneCache.set(k, frames);
  }
  return frames;
}

/** Walk-phase frames for a character name. */
export function sceneFrameBufs(name: OfficeCharacterName | string): SceneFrames {
  return sceneFrameBufsFor(resolveRecipe(name));
}

/** Blit an RGBA buffer nearest-neighbour at `scale`: stage at 1× on an
 *  offscreen canvas, then draw scaled with smoothing off. */
function blit(ctx: CanvasRenderingContext2D, buf: Buf, w: number, h: number, scale: number): void {
  const stage = document.createElement('canvas');
  stage.width = w; stage.height = h;
  const sctx = stage.getContext('2d')!;
  const img = sctx.createImageData(w, h);
  img.data.set(buf);
  sctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w * scale, h * scale);
  ctx.drawImage(stage, 0, 0, w, h, 0, 0, w * scale, h * scale);
}

/** Paint a character's procedural portrait onto `ctx`, nearest-neighbor at `scale`. */
export function paintPortrait(ctx: CanvasRenderingContext2D, name: OfficeCharacterName, scale = 2): void {
  blit(ctx, portraitBuf(name), PORTRAIT_W, PORTRAIT_H, scale);
}

/** Paint the portrait of a recipe that has no name yet: the editor's preview and option tiles. */
export function paintRecipe(ctx: CanvasRenderingContext2D, recipe: AvatarRecipe, scale = 2): void {
  blit(ctx, portraitBufFor(recipe), PORTRAIT_W, PORTRAIT_H, scale);
}

/** Paint one walking frame of a recipe: `phase` 0 stand, 1 step left, 2 step right. */
export function paintSceneFrame(ctx: CanvasRenderingContext2D, recipe: AvatarRecipe, phase: 0 | 1 | 2, back: boolean, scale = 2): void {
  const frames = sceneFrameBufsFor(recipe);
  blit(ctx, (back ? frames.back : frames.front)[phase], SCENE_W, SCENE_H, scale);
}

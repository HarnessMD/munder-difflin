// Halloween costumes: what every character wears while the season is on.
//
// A costume is two things: a small change to the recipe (a skeleton onesie is
// a black sweater and black trousers) and an overlay painted after the head
// (a hat, ears, a collar, fangs, bones). portraitArt.ts calls both, only when
// the season asks for it, so with the season off the cast draws exactly the
// pixels test/avatar-recipes.test.cjs pins.
//
// Pure: no DOM, no pixi. The painter hands in a tiny pixel API so this module
// never needs to know which canvas (bust or walking figure) it is drawing on.
//
// PIXEL BUDGET (same as portraitArt): head skin x4..13, y4..16; brows rows
// 6..8, eyes row 9, mouth rows 13..15; clothing from row T (19 on the bust,
// 18 on the figure). Hats live in rows 0..5 and never cover the eyes. On the
// face (x4..13, rows 6..16) only three costumes paint, and only these pixels:
// the vampire's two fangs on the mouth row, the cat's nose and whiskers on
// rows 12..13, and the mummy's loose bandage end at x4..5 on row 6. Creed's
// hood takes the columns beside the face (x2..3, 14..15), never the skin.

import type { AvatarRecipe, RGB } from '@shared/avatars';
import { recipeKey } from '@shared/avatars';

export const COSTUMES = [
  'vampire', 'skeleton', 'witch', 'scarecrow', 'pumpkin', 'cat', 'scientist', 'undertaker',
  'fortune', 'pirate', 'batqueen', 'werewolf', 'mummy', 'reaper', 'bride',
] as const;
export type Costume = typeof COSTUMES[number];

/** Who wears what, picked for the person. The founder approved this cast
 *  from the costume sheet on 30 Sep 2026, every row as drawn. */
export const CAST_COSTUMES: Readonly<Record<string, Costume>> = {
  michael: 'vampire',
  jim: 'skeleton',
  pam: 'witch',
  dwight: 'scarecrow',
  kevin: 'pumpkin',
  angela: 'cat',
  oscar: 'scientist',
  stanley: 'undertaker',
  phyllis: 'fortune',
  andy: 'pirate',
  kelly: 'batqueen',
  ryan: 'werewolf',
  toby: 'mummy',
  creed: 'reaper',
  meredith: 'bride',
};

/** Custom avatars and presets draw from the costumes that read best on
 *  anyone, so the same person wears the same thing every time. */
export const POOL: readonly Costume[] = ['skeleton', 'witch', 'pumpkin', 'cat', 'vampire', 'mummy', 'scientist', 'pirate'];
export function costumeForRecipe(r: AvatarRecipe): Costume {
  const k = recipeKey(r);
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); }
  return POOL[(h >>> 0) % POOL.length];
}

// ─── palette (no red: orange, purple, green, black, bone) ─────────────────────
const INK: RGB = [34, 30, 42];
const INK_HI: RGB = [58, 52, 70];
const PURPLE: RGB = [92, 54, 138];
const PURPLE_HI: RGB = [128, 84, 176];
const PURPLE_SH: RGB = [60, 34, 94];
const ORANGE: RGB = [242, 140, 40];
const ORANGE_HI: RGB = [255, 176, 84];
const ORANGE_SH: RGB = [196, 100, 24];
const GREEN: RGB = [104, 150, 56];
const GREEN_SH: RGB = [66, 104, 38];
const BONE: RGB = [240, 236, 222];
const BONE_SH: RGB = [196, 190, 172];
const PINK: RGB = [236, 150, 176];
const FANG: RGB = [252, 252, 250];
const STRAW: RGB = [222, 186, 102];
const STRAW_SH: RGB = [176, 138, 64];
const RUST: RGB = [184, 108, 50];
const DENIM: RGB = [72, 94, 132];
const FUR: RGB = [132, 120, 108];
const FUR_HI: RGB = [172, 160, 146];
const FUR_SH: RGB = [94, 84, 76];
const STEEL_SH: RGB = [150, 156, 172];
const ROBE: RGB = [46, 42, 58];
const ROBE_HI: RGB = [70, 64, 86];
const GOGGLE: RGB = [120, 206, 192];
const GREY: RGB = [150, 150, 158];

/** The recipe a costume starts from. Only body clothing changes; the face,
 *  hair and skin stay the person's own so everyone is still recognisable. */
export function costumeRecipe(r: AvatarRecipe, c: Costume): AvatarRecipe {
  switch (c) {
    case 'skeleton': return { ...r, cloth: 'sweater', c1: INK, c2: undefined, tie: undefined, pants: INK };
    case 'mummy': return { ...r, cloth: 'sweater', c1: BONE, c2: undefined, tie: undefined, pants: BONE_SH };
    case 'vampire': return { ...r, cloth: 'suit', c1: PURPLE_SH, c2: BONE, tie: INK, pants: INK };
    case 'undertaker': return { ...r, cloth: 'suit', c1: INK, c2: BONE, tie: BONE, pants: INK };
    case 'witch': return { ...r, cloth: 'sweater', c1: PURPLE, c2: undefined, tie: undefined, pants: PURPLE_SH };
    case 'scarecrow': return { ...r, cloth: 'dressshirt', c1: RUST, c2: undefined, tie: undefined, pants: DENIM };
    case 'pumpkin': return { ...r, cloth: 'sweater', c1: ORANGE, c2: undefined, tie: undefined, pants: GREEN_SH };
    case 'cat': return { ...r, cloth: 'turtleneck', c1: INK, c2: undefined, tie: undefined, pants: INK };
    case 'scientist': return { ...r, cloth: 'suit', c1: BONE, c2: r.c1, tie: r.tie ?? INK_HI, pants: r.pants ?? INK_HI };
    case 'fortune': return { ...r, c1: PURPLE_HI, c2: ORANGE, pants: PURPLE_SH };
    case 'pirate': return { ...r, cloth: 'tee', c1: BONE, c2: undefined, tie: undefined, pants: INK };
    case 'batqueen': return { ...r, c1: PURPLE, c2: INK, pants: INK };
    case 'werewolf': return { ...r, cloth: 'tee', c1: FUR_SH, c2: undefined, tie: undefined, pants: DENIM };
    case 'reaper': return { ...r, cloth: 'hoodie', c1: ROBE, c2: ROBE_HI, tie: undefined, pants: ROBE };
    case 'bride': return { ...r, cloth: 'blouse', c1: BONE, c2: undefined, tie: undefined, pants: BONE_SH };
  }
}

/** The pixel API portraitArt hands in, bound to the canvas being drawn. */
export interface Px {
  w: number;
  h: number;
  set(x: number, y: number, c: RGB): void;
  clear(x: number, y: number): void;
  alpha(x: number, y: number): number;
  rgb(x: number, y: number): RGB;
}

export interface CostumeCtx {
  /** First clothing row: 19 on the bust, 18 on the walking figure. */
  T: number;
  scene: boolean;
  back: boolean;
  /** The costume recipe (after costumeRecipe), migrated. */
  r: AvatarRecipe;
}

function row(p: Px, y: number, x0: number, x1: number, c: RGB): void { for (let x = x0; x <= x1; x++) p.set(x, y, c); }
function clearRows(p: Px, y0: number, y1: number, x0 = 0, x1 = p.w - 1): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) p.clear(x, y);
}

// ─── hats and heads ───────────────────────────────────────────────────────────
function witchHat(p: Px): void {
  clearRows(p, 0, 4);
  // A tall cone with a bent tip, an orange band and green buckle, a wide brim
  // across the forehead (the brows stay clear on row 6).
  p.set(11, 0, PURPLE_SH); p.set(12, 0, PURPLE_SH); p.set(10, 0, PURPLE);
  row(p, 1, 8, 10, PURPLE); p.set(8, 1, PURPLE_HI);
  row(p, 2, 7, 10, PURPLE); p.set(7, 2, PURPLE_HI); p.set(10, 2, PURPLE_SH);
  row(p, 3, 6, 11, PURPLE); p.set(6, 3, PURPLE_HI); p.set(11, 3, PURPLE_SH);
  row(p, 4, 5, 12, ORANGE); p.set(5, 4, ORANGE_HI); p.set(12, 4, ORANGE_SH);
  p.set(8, 4, GREEN); p.set(9, 4, GREEN);
  row(p, 5, 2, 15, PURPLE); p.set(2, 5, PURPLE_HI); p.set(3, 5, PURPLE_HI); p.set(14, 5, PURPLE_SH); p.set(15, 5, PURPLE_SH);
}

function catEars(p: Px, back: boolean): void {
  clearRows(p, 0, 2);
  // two big pointed ears on a black band, pink inside from the front
  const ear = (xs: ReadonlyArray<readonly [number, number, number]>) => { for (const [y, a, b] of xs) row(p, y, a, b, INK); };
  ear([[0, 4, 4], [1, 4, 5], [2, 3, 6], [3, 3, 7]]);
  ear([[0, 13, 13], [1, 12, 13], [2, 11, 14], [3, 10, 14]]);
  row(p, 4, 4, 13, INK); p.set(6, 4, INK_HI); p.set(11, 4, INK_HI);
  if (!back) { p.set(5, 2, PINK); p.set(5, 3, PINK); p.set(4, 3, PINK); p.set(12, 2, PINK); p.set(12, 3, PINK); p.set(13, 3, PINK); }
}

function catFace(p: Px): void {
  const W: RGB = [70, 60, 72];
  p.set(8, 12, PINK);
  p.set(4, 12, W); p.set(5, 13, W);
  p.set(13, 12, W); p.set(12, 13, W);
}

function mummyHead(p: Px): void {
  // bandage strips wound over the hair and across the forehead, one loose end
  const strip = (pts: ReadonlyArray<readonly [number, number]>, c: RGB) => { for (const [x, y] of pts) if (p.alpha(x, y) === 255) p.set(x, y, c); };
  for (let x = 4; x <= 13; x++) { if (p.alpha(x, 5) === 255) p.set(x, 5, BONE); }
  strip([[5, 4], [6, 4], [7, 3], [8, 3], [9, 3], [10, 2], [11, 2], [12, 2]], BONE);
  strip([[4, 6], [5, 6], [12, 4], [13, 4], [13, 3]], BONE_SH);
  for (const x of [6, 9, 12]) if (p.alpha(x, 5) === 255) p.set(x, 5, BONE_SH);
  p.set(14, 5, BONE); p.set(15, 6, BONE); p.set(15, 7, BONE_SH);
}

// ─── bodies ──────────────────────────────────────────────────────────────────
/** Last row of the torso: the bust runs to the bottom, the figure to row 24. */
const torsoEnd = (ctx: CostumeCtx, p: Px) => (ctx.scene ? 24 : p.h - 1);

function skeletonBody(p: Px, ctx: CostumeCtx): void {
  const { T } = ctx;
  const end = torsoEnd(ctx, p);
  const onCloth = (x: number, y: number) => p.alpha(x, y) === 255 && isInk(p.rgb(x, y));
  const bone = (x: number, y: number, c: RGB = BONE) => { if (onCloth(x, y)) p.set(x, y, c); };
  if (ctx.back) {
    for (let y = T + 1; y <= end; y++) bone(8, y, y % 2 ? BONE : BONE_SH), bone(9, y, BONE_SH);
  } else {
    for (let y = T + 1; y <= end - 1; y++) { bone(8, y); bone(9, y, BONE_SH); }
    for (const dy of [2, 4, 6]) {
      const y = T + dy;
      if (y > end) continue;
      for (const x of [5, 6, 7]) bone(x, y);
      for (const x of [10, 11, 12]) bone(x, y, x === 12 ? BONE_SH : BONE);
    }
  }
  if (ctx.scene) {
    // leg bones down the trousers
    for (let y = 25; y <= 30; y++) { bone(6, y); bone(11, y, BONE_SH); }
  }
}

function isInk(c: RGB): boolean {
  // the sweater's three shades of INK, whatever shades() made of them
  return c[0] < 80 && c[1] < 76 && c[2] < 90 && Math.abs(c[0] - c[1]) < 14;
}

function mummyBody(p: Px, ctx: CostumeCtx): void {
  const { T } = ctx;
  const end = ctx.scene ? 30 : p.h - 1;
  // wraps: a shaded line every other row, stepping one pixel per band
  for (let y = T + 1; y <= end; y += 2) {
    for (let x = 0; x < p.w; x++) {
      if (p.alpha(x, y) !== 255) continue;
      const c = p.rgb(x, y);
      if (isBandage(c) && ((x + (y >> 1)) % 5 !== 0)) p.set(x, y, BONE_SH);
    }
  }
}

function isBandage(c: RGB): boolean {
  return c[0] > 150 && c[1] > 140 && c[2] > 120 && c[0] - c[2] < 60;
}

function vampireBody(p: Px, ctx: CostumeCtx): void {
  const { T, back } = ctx;
  const end = ctx.scene ? 29 : p.h - 1;
  if (back) {
    // the cape covers the whole back, purple shine down the middle
    for (let y = T; y <= end; y++) {
      const half = y < T + 2 ? 5 : 6;
      for (let x = 8 - half + 1; x <= 9 + half - 1; x++) p.set(x, y, INK);
      p.set(8, y, INK_HI);
    }
    row(p, T, 5, 12, PURPLE);
    return;
  }
  // the cape falls from the shoulders on both sides, purple lining inside
  for (let y = T; y <= end; y++) {
    const spread = Math.min(2, Math.floor((y - T) / 3));
    let xl = -1, xr = -1;
    for (let x = 0; x < p.w; x++) if (p.alpha(x, y) === 255) { xl = x; break; }
    for (let x = p.w - 1; x >= 0; x--) if (p.alpha(x, y) === 255) { xr = x; break; }
    if (xl < 0) { xl = 5; xr = 12; }
    if (y > 24 && ctx.scene) { xl = 5; xr = 12; }
    const L = Math.max(0, xl - spread), R = Math.min(p.w - 1, xr + spread);
    for (let x = L; x <= L + 1; x++) p.set(x, y, INK);
    for (let x = R - 1; x <= R; x++) p.set(x, y, INK);
    p.set(L + 2, y, PURPLE_SH); p.set(R - 2, y, PURPLE_SH);
  }
}

function vampireCollar(p: Px, ctx: CostumeCtx): void {
  if (ctx.back) return;
  // a tall collar standing up beside the jaw, painted only where nothing is
  const pts: ReadonlyArray<readonly [number, number, RGB]> = [
    [2, 14, INK], [3, 15, INK], [3, 16, PURPLE], [4, 17, PURPLE], [5, 18, INK], [2, 15, INK], [2, 16, INK], [3, 17, INK], [4, 18, INK],
    [15, 14, INK], [14, 15, INK], [14, 16, PURPLE], [13, 17, PURPLE], [12, 18, INK], [15, 15, INK], [15, 16, INK], [14, 17, INK], [13, 18, INK],
  ];
  for (const [x, y, c] of pts) if (p.alpha(x, y) !== 255 || y >= 17) p.set(x, y, c);
}

function fangs(p: Px, r: AvatarRecipe): void {
  const y = r.mouth === 'frown' ? 16 : 15;
  p.set(7, y, FANG); p.set(10, y, FANG);
}

// ─── the costumes added for 0.5.5 (sheet approved 30 Sep 2026) ──────────────
const CARVED: RGB = [96, 46, 12];
const RUST_SH: RGB = [136, 76, 34];

/** Draw a grid of letters from (x0, y0). '.' leaves the pixel alone. */
function stamp(p: Px, x0: number, y0: number, grid: readonly string[], pal: Readonly<Record<string, RGB>>): void {
  grid.forEach((line, dy) => {
    for (let dx = 0; dx < line.length; dx++) {
      const c = pal[line[dx]];
      if (c) p.set(x0 + dx, y0 + dy, c);
    }
  });
}
/** The clothing pixels: at or below T, drawn, and inside the torso rows. */
const onBody = (p: Px, ctx: CostumeCtx, x: number, y: number) => y >= ctx.T && y <= torsoEnd(ctx, p) && p.alpha(x, y) === 255;
function paintBody(p: Px, ctx: CostumeCtx, x: number, y: number, c: RGB): void { if (onBody(p, ctx, x, y)) p.set(x, y, c); }

function topHat(p: Px, back: boolean): void {
  clearRows(p, 0, 4);
  stamp(p, 0, 0, [
    '.....hkkkkkkk.....',
    '.....hkkkkkkk.....',
    '.....hkkkkkkk.....',
    '.....hkkkkkkk.....',
    '.....ggggggggg....'.slice(0, 18),
    '..hkkkkkkkkkkkkk..',
  ], { k: INK, h: INK_HI, g: GREY });
  if (!back) p.set(12, 4, BONE);
}
function bowTie(p: Px, ctx: CostumeCtx): void {
  if (ctx.back) return;
  const y = ctx.T + 1;
  stamp(p, 6, y - 1, ['g....g', 'ggkkgg', 'g....g'], { g: GREY, k: INK_HI });
  paintBody(p, ctx, 12, ctx.T + 3, BONE);
}

function tricorn(p: Px, back: boolean): void {
  clearRows(p, 0, 2);
  stamp(p, 0, 0, [
    '..................',
    '..kk..........kk..',
    '..kkk.kkkkkk.kkk..',
    '...kkkkkkkkkkkk...',
    '...kkkkkbbkkkkk...',
    '..oooooooooooooo..',
  ], { k: INK, b: back ? INK : BONE, o: ORANGE });
}
function sailorStripes(p: Px, ctx: CostumeCtx): void {
  const end = torsoEnd(ctx, p);
  for (let y = ctx.T + 1; y <= end; y += 2) for (let x = 0; x < p.w; x++) paintBody(p, ctx, x, y, y === end || y === end - 1 ? ORANGE : INK_HI);
}

function strawHat(p: Px): void {
  clearRows(p, 0, 3);
  stamp(p, 0, 0, [
    '..................',
    '......hssssss.....',
    '.....hssssssss....',
    '.....rrrrrrrrr....',
    '.hssssssssssssss..',
    '.t.S.t......t.S.t.',
  ], { s: STRAW, h: [240, 212, 140], S: STRAW_SH, t: STRAW, r: RUST_SH });
}
function plaid(p: Px, ctx: CostumeCtx): void {
  const end = torsoEnd(ctx, p);
  for (let y = ctx.T + 1; y <= end; y++) for (let x = 0; x < p.w; x++) {
    if (!onBody(p, ctx, x, y)) continue;
    if (y % 3 === 0) p.set(x, y, RUST_SH);
    else if (x % 3 === 0) p.set(x, y, [206, 134, 70]);
  }
  // a denim patch and straw poking out at the collar and the cuffs
  const py = ctx.scene ? ctx.T + 3 : ctx.T + 4;
  for (const [x, y] of [[5, py], [6, py], [5, py + 1], [6, py + 1]] as const) paintBody(p, ctx, x, y, DENIM);
  if (!ctx.back) { p.set(7, ctx.T, STRAW); p.set(10, ctx.T, STRAW_SH); }
  if (ctx.scene) { for (const x of [1, 16]) { p.set(x, 24, STRAW); p.set(x, 25, STRAW_SH); } row(p, 24, 3, 14, STRAW_SH); }
}

function pumpkinBeanie(p: Px): void {
  clearRows(p, 0, 3);
  stamp(p, 0, 0, [
    '........gl........',
    '........gll.......',
    '.....GGGGGGGG.....',
    '....GGGGGGGGGG....',
    '...GGGGGGGGGGGG...',
    '...dGdGdGdGdGdG...',
  ], { g: GREEN_SH, l: GREEN, G: GREEN, d: GREEN_SH });
}
function pumpkinFace(p: Px, ctx: CostumeCtx): void {
  const end = torsoEnd(ctx, p);
  for (let y = ctx.T + 1; y <= end; y++) for (const x of [4, 13]) paintBody(p, ctx, x, y, ORANGE_SH);
  if (ctx.back) return;
  const e = ctx.scene ? ctx.T + 1 : ctx.T + 2;
  const face: Array<[number, number]> = [
    [6, e + 1], [7, e], [7, e + 1], [10, e + 1], [10, e], [11, e + 1],
    [6, e + 3], [7, e + 4], [8, e + 4], [9, e + 3], [10, e + 4], [11, e + 4], [12, e + 3], [8, e + 3], [10, e + 3], [11, e + 3], [7, e + 3],
  ];
  for (const [x, y] of face) paintBody(p, ctx, x, y, CARVED);
}

function catDetails(p: Px, ctx: CostumeCtx): void {
  if (!ctx.back) for (let y = ctx.T + 1; y <= ctx.T + 4; y++) for (let x = 7; x <= 10; x++) if (!(y === ctx.T + 4 && (x === 7 || x === 10))) paintBody(p, ctx, x, y, BONE);
  if (ctx.scene) {
    // the tail curls up beside the hip
    const pts: Array<[number, number]> = ctx.back
      ? [[9, 25], [10, 26], [11, 26], [12, 25], [13, 24], [13, 23], [14, 22]]
      : [[16, 27], [17, 26], [17, 25], [17, 24], [16, 23]];
    for (const [x, y] of pts) p.set(x, y, INK);
  }
}

function goggles(p: Px, back: boolean): void {
  row(p, 5, 2, 15, INK_HI);
  if (back) return;
  stamp(p, 0, 3, [
    '....ssss..ssss....',
    '....sggs..sggs....',
    '..kksggskksggskk..',
  ], { s: STEEL_SH, g: GOGGLE, k: INK_HI });
}
function labCoat(p: Px, ctx: CostumeCtx): void {
  if (ctx.back) return;
  const y = ctx.T + (ctx.scene ? 2 : 3);
  paintBody(p, ctx, 12, y, ORANGE); paintBody(p, ctx, 13, y, PURPLE_HI);
  paintBody(p, ctx, 12, y + 1, BONE_SH); paintBody(p, ctx, 13, y + 1, BONE_SH);
}

function headScarf(p: Px): void {
  clearRows(p, 0, 2, 2, 15);
  stamp(p, 0, 2, [
    '.....pppppppp.....',
    '...pPPPPPPPPPPp...',
    '..pPPPPPPPPPPPPpk.',
    '..cPcPcPcPcPcPcPkk',
  ], { p: PURPLE, P: PURPLE_HI, c: ORANGE_HI, k: PURPLE_SH });
}
function shawl(p: Px, ctx: CostumeCtx): void {
  const y = ctx.T + (ctx.scene ? 3 : 4);
  for (let x = 0; x < p.w; x++) paintBody(p, ctx, x, y, x % 2 ? ORANGE : ORANGE_SH);
  for (let x = 0; x < p.w; x++) paintBody(p, ctx, x, y - 1, PURPLE);
}

function batBand(p: Px, back: boolean): void {
  clearRows(p, 0, 1);
  // a bat with wings spread wide, scalloped at the bottom, on an orange band
  stamp(p, 0, 0, [
    '.PP............PP.',
    '.PPPP..p..p..PPPP.',
    '..PPPPPppppPPPPP..',
    '...P.P.peep.P.P...',
    '..oooooooooooooo..',
  ], { P: PURPLE_HI, p: PURPLE_SH, e: back ? PURPLE_SH : ORANGE_HI, o: ORANGE });
}

function wolfEars(p: Px, back: boolean): void {
  clearRows(p, 0, 1);
  const pal = { f: FUR, h: FUR_HI, s: FUR_SH, i: back ? FUR : PINK };
  stamp(p, 0, 0, [
    '..f...........f...',
    '..ff.........ff...',
    '..hif.......fih...',
    '.hhiff.....ffihh..',
    '..hfff.....fffh...',
  ].map((l) => l.padEnd(18, '.').slice(0, 18)), pal);
}
function furCollar(p: Px, ctx: CostumeCtx): void {
  const T = ctx.T;
  for (let x = 0; x < p.w; x++) {
    paintBody(p, ctx, x, T, x % 2 ? FUR_HI : FUR);
    if (x % 3 === 1) paintBody(p, ctx, x, T + 1, FUR_HI);
  }
  // torn hem: a ragged line of fur at the bottom of the shirt
  const end = torsoEnd(ctx, p);
  for (let x = 0; x < p.w; x++) if (x % 2 === 0) paintBody(p, ctx, x, end, FUR);
  if (!ctx.back) for (const [x, dy] of [[5, 3], [6, 4], [7, 5]] as const) paintBody(p, ctx, x, T + dy, FUR_HI);
}

function reaperHood(p: Px, ctx: CostumeCtx): void {
  const { back } = ctx;
  clearRows(p, 0, 2, 2, 15);
  stamp(p, 0, 1, [
    '.....oooooooo.....',
    '....oooooooooo....',
    '...ohhhhhhhhhho...',
    '..oohhhhhhhhhhoo..',
    '..ohhhhhhhhhhhho..',
  ], { o: ROBE, h: back ? ROBE : ROBE_HI });
  // the sides of the hood, beside the face and never on it (x 2..3, 14..15).
  // The inner columns fill only where the avatar drew nothing: Creed's grey
  // side hair and stubble stay where they are without a costume, so nothing
  // is left hanging by the cheek (founder, round 4).
  for (let y = 6; y <= 14; y++) for (const x of [2, 3, 14, 15]) {
    if ((x === 3 || x === 14) && p.alpha(x, y) === 255) continue;
    p.set(x, y, x === 2 || x === 15 ? ROBE : ROBE_HI);
  }
  if (back) for (let y = 3; y <= 16; y++) for (let x = 2; x <= 15; x++) if (p.alpha(x, y) === 255 || (y <= 14)) p.set(x, y, x === 8 || x === 9 ? ROBE_HI : ROBE);
  // No scythe: a one pixel handle read as a stray line on the floor (founder,
  // round 4). The hood and the robe carry the costume.
}

function beehive(p: Px): void {
  clearRows(p, 0, 3, 2, 15);
  // a tall black beehive with a white lightning streak up each side
  stamp(p, 0, 0, [
    '......kkkkkk......',
    '.....kbkkkkbk.....',
    '....kbkkkkkkbk....',
    '....kbkkkkkkbk....',
    '...kbkkkkkkkkbk...',
    '...kbkkkkkkkkbk...',
  ], { k: INK, b: BONE });
}

// ─── entry point ─────────────────────────────────────────────────────────────
/** Paint a costume's overlay. Runs after the head group and the garment's own
 *  collar, before the outline pass, so the outline wraps the hat too. */
export function paintCostume(p: Px, c: Costume, ctx: CostumeCtx): void {
  const { back } = ctx;
  switch (c) {
    case 'witch': witchHat(p); break;
    case 'pumpkin': pumpkinFace(p, ctx); pumpkinBeanie(p); break;
    case 'cat': catDetails(p, ctx); catEars(p, back); if (!back) catFace(p); break;
    case 'mummy': mummyBody(p, ctx); mummyHead(p); break;
    case 'skeleton': skeletonBody(p, ctx); break;
    case 'vampire': vampireBody(p, ctx); vampireCollar(p, ctx); if (!back) fangs(p, ctx.r); break;
    case 'undertaker': bowTie(p, ctx); topHat(p, back); break;
    case 'pirate': sailorStripes(p, ctx); tricorn(p, back); break;
    case 'scarecrow': plaid(p, ctx); strawHat(p); break;
    case 'scientist': labCoat(p, ctx); goggles(p, back); break;
    case 'fortune': shawl(p, ctx); headScarf(p); break;
    case 'batqueen': batBand(p, back); break;
    case 'werewolf': furCollar(p, ctx); wolfEars(p, back); break;
    case 'reaper': reaperHood(p, ctx); break;
    case 'bride': beehive(p); break;
  }
}

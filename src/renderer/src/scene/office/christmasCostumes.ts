// Christmas costumes: what every character wears while the season is
// 'christmas'. The twin of costumes.ts (Halloween) and built the same way: a
// small change to the recipe (Santa is a red sweater and red trousers) and an
// overlay painted after the head (a hat, antlers, a halo, a scarf). portraitArt
// calls one or the other by the season, so with the season off the cast draws
// exactly the plain pixels.
//
// Pure: no DOM, no pixi. It draws through the same tiny pixel API (Px) and the
// same helpers as costumes.ts.
//
// PIXEL BUDGET (the same as costumes.ts): head skin x4..13, y4..16; brows rows
// 6..8, eyes row 9, mouth rows 13..15; clothing from row T (19 on the bust, 18
// on the figure). Hats live in rows 0..5 and never cover the eyes. On the face
// only one costume paints, and only one pixel: the reindeer's red nose on row
// 12, where the cat's nose goes. Wings and the scarf's tail stay off the face.
//
// Colours: red, green and gold with white and brown. Red is a costume colour
// here, never a status: nothing in the app's chrome takes it from this file.

import type { AvatarRecipe, RGB } from '@shared/avatars';
import { recipeKey } from '@shared/avatars';
import { clearRows, onBody, paintBody, row, stamp, torsoEnd, type CostumeCtx, type Px } from './costumes';

export const CHRISTMAS_COSTUMES = [
  'santa', 'mrsclaus', 'elf', 'reindeer', 'belsnickel', 'angel', 'nutcracker',
  'sweater', 'scarf', 'snowman', 'gingerbread', 'star', 'tree',
] as const;
export type ChristmasCostume = typeof CHRISTMAS_COSTUMES[number];

/** Who wears what, picked for the person: Michael is Santa, Dwight is his
 *  own Belsnickel, Angela the angel, Creed the tree. */
export const CAST_CHRISTMAS: Readonly<Record<string, ChristmasCostume>> = {
  michael: 'santa',
  jim: 'scarf',
  pam: 'reindeer',
  dwight: 'belsnickel',
  kevin: 'gingerbread',
  angela: 'angel',
  oscar: 'nutcracker',
  stanley: 'sweater',
  phyllis: 'mrsclaus',
  andy: 'elf',
  kelly: 'star',
  ryan: 'sweater',
  toby: 'snowman',
  creed: 'tree',
  meredith: 'reindeer',
};

/** Custom avatars and presets draw from the costumes that read best on
 *  anyone, so the same person wears the same thing every year. */
export const CHRISTMAS_POOL: readonly ChristmasCostume[] = ['santa', 'elf', 'reindeer', 'scarf', 'sweater', 'snowman', 'angel', 'star'];
export function christmasForRecipe(r: AvatarRecipe): ChristmasCostume {
  const k = recipeKey(r);
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); }
  return CHRISTMAS_POOL[(h >>> 0) % CHRISTMAS_POOL.length];
}

export function isChristmasCostume(c: string): c is ChristmasCostume {
  return (CHRISTMAS_COSTUMES as readonly string[]).includes(c);
}

// ─── palette (red, green, gold, white, brown) ─────────────────────────────────
const RED: RGB = [200, 50, 46];
const RED_HI: RGB = [228, 84, 78];
const RED_SH: RGB = [142, 31, 28];
const WHITE: RGB = [246, 246, 242];
const WHITE_SH: RGB = [206, 210, 214];
const GREEN: RGB = [47, 125, 69];
const GREEN_HI: RGB = [78, 159, 99];
const GREEN_SH: RGB = [30, 87, 48];
const GOLD: RGB = [232, 184, 74];
const GOLD_HI: RGB = [255, 224, 138];
const GOLD_SH: RGB = [176, 132, 40];
const BROWN: RGB = [120, 78, 44];
const BROWN_HI: RGB = [156, 108, 64];
const BROWN_SH: RGB = [84, 54, 30];
const GINGER: RGB = [184, 112, 54];
const GINGER_SH: RGB = [140, 80, 36];
const FUR: RGB = [132, 120, 108];
const FUR_HI: RGB = [172, 160, 146];
const FUR_SH: RGB = [94, 84, 76];
const INK: RGB = [34, 30, 42];
const INK_HI: RGB = [58, 52, 70];
const NAVY: RGB = [44, 58, 102];
/** Antlers and the fur hat are set apart from brown hair: pale horn, dark fur. */
const HORN: RGB = [222, 196, 150];
const HORN_SH: RGB = [176, 146, 104];
const DARK_FUR: RGB = [62, 44, 32];
const DARK_FUR_HI: RGB = [92, 68, 50];

/** The recipe a costume starts from. Only body clothing changes; the face,
 *  hair and skin stay the person's own so everyone is still recognisable. */
export function christmasRecipe(r: AvatarRecipe, c: ChristmasCostume): AvatarRecipe {
  switch (c) {
    case 'santa': return { ...r, cloth: 'sweater', c1: RED, c2: undefined, tie: undefined, pants: RED_SH };
    case 'mrsclaus': return { ...r, cloth: 'blouse', c1: RED, c2: undefined, tie: undefined, pants: RED_SH };
    case 'elf': return { ...r, cloth: 'sweater', c1: GREEN, c2: undefined, tie: undefined, pants: RED };
    case 'reindeer': return { ...r, cloth: 'sweater', c1: BROWN, c2: undefined, tie: undefined, pants: BROWN_SH };
    case 'belsnickel': return { ...r, cloth: 'suit', c1: BROWN_SH, c2: FUR_HI, tie: FUR, pants: BROWN_SH };
    case 'angel': return { ...r, cloth: 'blouse', c1: WHITE, c2: undefined, tie: undefined, pants: WHITE_SH };
    case 'nutcracker': return { ...r, cloth: 'suit', c1: RED, c2: WHITE, tie: GOLD, pants: NAVY };
    case 'sweater': return { ...r, cloth: 'sweater', c1: GREEN, c2: undefined, tie: undefined };
    case 'scarf': return r;
    case 'snowman': return { ...r, cloth: 'sweater', c1: WHITE, c2: undefined, tie: undefined, pants: WHITE_SH };
    case 'gingerbread': return { ...r, cloth: 'sweater', c1: GINGER, c2: undefined, tie: undefined, pants: GINGER_SH };
    case 'star': return { ...r, cloth: 'turtleneck', c1: GREEN_SH, c2: undefined, tie: undefined };
    case 'tree': return r;
  }
}

// ─── hats and heads ───────────────────────────────────────────────────────────
function santaHat(p: Px, back: boolean): void {
  clearRows(p, 0, 3);
  // A red cap that flops over to the right, a white pompom on its tip and a
  // white fur brim across the forehead (the brows stay clear on row 6).
  stamp(p, 0, 0, [
    '........rrrr......',
    '......rrrrrRrw....',
    '.....rrrrrrrRwWw..',
    '....rrrrrrrrr.ww..',
    '...wwwwwwwwwwww...',
    '...WwWwWwWwWwWw...',
  ], { r: RED, R: RED_SH, w: WHITE, W: WHITE_SH });
  if (!back) p.set(6, 1, RED_HI);
}

function hollyClip(p: Px): void {
  // A sprig of holly over the left ear: two leaves and three berries, and a
  // small red bow on the other side.
  stamp(p, 1, 2, [
    '.gG...',
    'gGGg..',
    '.grRr.',
    '..g...',
  ], { g: GREEN, G: GREEN_HI, r: RED, R: RED_HI });
  stamp(p, 12, 3, ['r.r', 'rRr', 'r.r'], { r: RED, R: RED_SH });
}

function elfHat(p: Px, back: boolean): void {
  clearRows(p, 0, 3);
  // A green cone leaning left with a gold bell on its tip and a red band.
  stamp(p, 0, 0, [
    '.b................',
    '.Bgg..............',
    '...gggggg.........',
    '....gggggggggG....',
    '...rrrrrrrrrrrr...',
    '...RrRrRrRrRrRr...',
  ], { g: GREEN, G: GREEN_SH, r: RED, R: RED_SH, b: GOLD_HI, B: GOLD });
  if (!back) p.set(5, 2, GREEN_HI);
}

function antlers(p: Px): void {
  clearRows(p, 0, 1);
  // Two branching antlers on a red headband.
  stamp(p, 0, 0, [
    '.a.a........a.a...',
    '.aaa..a..a..aaa...',
    '..a.aa....aa.a....',
    '..aa..........aa..',
    '...hhhhhhhhhhhh...',
  ], { a: HORN, h: RED });
  p.set(2, 3, HORN_SH); p.set(15, 3, HORN_SH);
}

function reindeerNose(p: Px): void {
  p.set(8, 12, RED);
  p.set(9, 12, RED_HI);
}

function furHat(p: Px, back: boolean): void {
  clearRows(p, 0, 4);
  // The Belsnickel's tall dark fur hat with a shaggy pale brim, a pine sprig
  // in front.
  stamp(p, 0, 0, [
    '.....ffFffFff.....',
    '....fFffFffFff....',
    '....fffFfffFff....',
    '...FfffffffffffF..',
    '..rRrRrRrRrRrRrRr.',
    '..R.r.R.r.R.r.R.r.',
  ], { f: DARK_FUR_HI, F: DARK_FUR, r: FUR_HI, R: FUR });
  if (!back) { p.set(6, 1, GREEN); p.set(7, 0, GREEN_HI); p.set(6, 2, GREEN_SH); }
}
function furCoat(p: Px, ctx: CostumeCtx): void {
  // a shaggy fur collar and fur cuffs on the brown coat
  for (let x = 0; x < p.w; x++) paintBody(p, ctx, x, ctx.T, x % 2 ? FUR_HI : FUR);
  const end = torsoEnd(ctx, p);
  for (let x = 0; x < p.w; x++) if (x % 2 === 1) paintBody(p, ctx, x, end, FUR);
}

function halo(p: Px): void {
  // A gold ring floating over the hair: drawn only where nothing is, so the
  // hair keeps its own shape under it.
  const pts: ReadonlyArray<readonly [number, number, RGB]> = [
    [6, 0, GOLD], [7, 0, GOLD_HI], [8, 0, GOLD_HI], [9, 0, GOLD_HI], [10, 0, GOLD_HI], [11, 0, GOLD],
    [5, 1, GOLD_SH], [12, 1, GOLD_SH], [6, 1, GOLD], [11, 1, GOLD],
  ];
  clearRows(p, 0, 0);
  for (const [x, y, c] of pts) if (y === 0 || p.alpha(x, y) !== 255) p.set(x, y, c);
}
function wings(p: Px, ctx: CostumeCtx): void {
  // Two small white wings behind the shoulders, only where nothing is drawn.
  const T = ctx.T;
  const L: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [1, 1], [0, 2], [1, 2], [0, 3], [1, 3], [1, 4]];
  for (const [dx, dy] of L) {
    for (const x of [dx, p.w - 1 - dx]) {
      const y = T + dy;
      if (p.alpha(x, y) !== 255) p.set(x, y, dx === 0 ? WHITE_SH : WHITE);
    }
  }
}

function shako(p: Px, back: boolean): void {
  clearRows(p, 0, 4);
  // The nutcracker's tall black hat: a gold band, a gold badge and a red plume.
  stamp(p, 0, 0, [
    '......kkkkkk.rr...',
    '.....kkkkkkkkrR...',
    '.....kkkkkkkk.....',
    '.....kkkkkkkk.....',
    '....GGGGGGGGGG....',
    '...hkkkkkkkkkkh...',
  ], { k: INK, h: INK_HI, G: GOLD, r: RED, R: RED_SH });
  if (!back) { p.set(8, 2, GOLD_HI); p.set(9, 2, GOLD); p.set(8, 3, GOLD); p.set(9, 3, GOLD_HI); }
}
function nutcrackerCoat(p: Px, ctx: CostumeCtx): void {
  if (ctx.back) return;
  // gold buttons down both sides of the front and a gold belt
  const end = torsoEnd(ctx, p);
  for (let y = ctx.T + 2; y < end - 1; y += 2) { paintBody(p, ctx, 6, y, GOLD); paintBody(p, ctx, 11, y, GOLD); }
  for (let x = 0; x < p.w; x++) paintBody(p, ctx, x, end - 1, x === 8 || x === 9 ? GOLD_HI : INK_HI);
}

function paperCrown(p: Px): void {
  clearRows(p, 0, 1);
  // A gold paper crown from a cracker, its points along the top.
  stamp(p, 0, 2, [
    '....G..G..G..G....',
    '....GGGGGGGGGG....',
    '....gGGgGGgGGg....',
  ], { G: GOLD, g: GOLD_SH });
}
function uglySweater(p: Px, ctx: CostumeCtx): void {
  // A red and white zigzag band, and snowflake dots above and below it.
  const y0 = ctx.T + (ctx.scene ? 2 : 3);
  for (let x = 0; x < p.w; x++) {
    paintBody(p, ctx, x, y0, x % 2 ? RED : WHITE);
    paintBody(p, ctx, x, y0 + 1, x % 2 ? WHITE : RED);
  }
  for (const x of [3, 7, 11, 14]) { paintBody(p, ctx, x, y0 + 3, WHITE); paintBody(p, ctx, x + 1, y0 - 2, WHITE); }
}

function beanie(p: Px): void {
  clearRows(p, 0, 2);
  // A red knit beanie with a white band and a white pompom.
  stamp(p, 0, 0, [
    '........ww........',
    '.......wWWw.......',
    '.....rrrrrrrr.....',
    '....rrRrrRrrRr....',
    '...rrrrrrrrrrrr...',
    '...wWwWwWwWwWwW...',
  ], { r: RED, R: RED_SH, w: WHITE, W: WHITE_SH });
}
function scarf(p: Px, ctx: CostumeCtx): void {
  // A striped scarf at the neck. Its tail hangs down the front, from the
  // front only: from behind it is the wrap at the neck alone.
  const T = ctx.T;
  for (let x = 2; x <= 15; x++) {
    p.set(x, T, x % 3 === 0 ? WHITE : RED);
    paintBody(p, ctx, x, T + 1, x % 3 === 1 ? WHITE : RED_SH);
  }
  if (ctx.back) return;
  for (let dy = 2; dy <= 6; dy++) {
    const y = T + dy;
    if (y > torsoEnd(ctx, p)) break;
    p.set(11, y, dy % 2 ? WHITE : RED);
    p.set(12, y, dy % 2 ? RED : RED_SH);
  }
}

function snowmanHat(p: Px, back: boolean): void {
  clearRows(p, 0, 4);
  // A black top hat with a red band and a sprig of holly.
  stamp(p, 0, 0, [
    '.....hkkkkkkk.....',
    '.....hkkkkkkk.....',
    '.....hkkkkkkk.....',
    '.....rrrrrrrr.....',
    '.....hkkkkkkk.....',
    '..hkkkkkkkkkkkkk..',
  ], { k: INK, h: INK_HI, r: RED });
  if (!back) { p.set(11, 3, GREEN); p.set(12, 3, GREEN_HI); p.set(11, 2, RED_HI); }
}
function snowmanBody(p: Px, ctx: CostumeCtx): void {
  // a red scarf at the neck, and coal buttons down the front
  for (let x = 0; x < p.w; x++) paintBody(p, ctx, x, ctx.T, x % 2 ? RED : RED_SH);
  if (ctx.back) return;
  const end = torsoEnd(ctx, p);
  for (let y = ctx.T + 2; y <= end - 1; y += 2) paintBody(p, ctx, 8, y, INK);
}

function gingerBow(p: Px): void {
  // A little red bow on top of the head, set to the right.
  stamp(p, 9, 1, ['r.r', 'rRr', 'r.r'], { r: RED, R: RED_SH });
}
function icing(p: Px, ctx: CostumeCtx): void {
  // white icing zigzags at the neck and the hem, and gumdrop buttons
  const end = torsoEnd(ctx, p);
  for (let x = 0; x < p.w; x++) {
    paintBody(p, ctx, x, ctx.T + (x % 2), WHITE);
    paintBody(p, ctx, x, end - (x % 2), WHITE);
  }
  if (ctx.back) return;
  const cols: RGB[] = [RED, GREEN, RED];
  cols.forEach((c, i) => paintBody(p, ctx, 8, ctx.T + 3 + i * 2, c));
}

function starBand(p: Px): void {
  clearRows(p, 0, 0);
  // A gold star on a thin band.
  stamp(p, 0, 0, [
    '........G.........',
    '.......GGG........',
    '.....GGGHGGG......',
    '......GGGGG.......',
    '...gggGGgGGggggg..',
  ], { G: GOLD, H: GOLD_HI, g: GOLD_SH });
}
function tinsel(p: Px, ctx: CostumeCtx): void {
  // a gold tinsel boa across the shoulders
  const T = ctx.T;
  for (let x = 1; x <= 16; x++) p.set(x, T, x % 2 ? GOLD : GOLD_HI);
  for (let x = 2; x <= 15; x++) if (x % 3 !== 0) paintBody(p, ctx, x, T + 1, GOLD_SH);
}

function treeHat(p: Px, back: boolean): void {
  clearRows(p, 0, 4);
  // A tall tree for a hat: a gold star on top, tinsel across it and two
  // ornaments, red and gold.
  stamp(p, 0, 0, [
    '........S.........',
    '.......gGg........',
    '......gGgtG.......',
    '.....gGtgGgG......',
    '....tgGgRgGgGt....',
    '...gGgGgGgGgGgG...',
  ], { S: GOLD_HI, g: GREEN, G: GREEN_SH, t: GOLD, R: back ? GREEN : RED });
}
function lights(p: Px, ctx: CostumeCtx): void {
  // a string of lights across the chest, shoulder to hip
  const cols: RGB[] = [RED_HI, GOLD_HI, GREEN_HI];
  const end = torsoEnd(ctx, p);
  let i = 0;
  for (let y = ctx.T + 1, x = 4; y <= end && x <= 13; y++, x++) {
    if (!onBody(p, ctx, x, y)) continue;
    p.set(x, y, (x + y) % 2 ? INK_HI : cols[i++ % cols.length]);
  }
}

function santaSuit(p: Px, ctx: CostumeCtx): void {
  // white fur at the neck and the hem, a black belt with a gold buckle
  const end = torsoEnd(ctx, p);
  for (let x = 0; x < p.w; x++) { paintBody(p, ctx, x, ctx.T, WHITE); paintBody(p, ctx, x, end, WHITE_SH); }
  const belt = end - 2;
  for (let x = 0; x < p.w; x++) paintBody(p, ctx, x, belt, INK);
  if (!ctx.back) { paintBody(p, ctx, 8, belt, GOLD); paintBody(p, ctx, 9, belt, GOLD); }
}
function mrsClausDress(p: Px, ctx: CostumeCtx): void {
  // a white collar and a white hem
  const end = torsoEnd(ctx, p);
  for (let x = 0; x < p.w; x++) { paintBody(p, ctx, x, ctx.T, WHITE); paintBody(p, ctx, x, end, WHITE); }
}
function elfTunic(p: Px, ctx: CostumeCtx): void {
  // a red zigzag collar and a gold belt
  for (let x = 0; x < p.w; x++) paintBody(p, ctx, x, ctx.T + (x % 2), RED);
  const belt = torsoEnd(ctx, p) - 2;
  for (let x = 0; x < p.w; x++) paintBody(p, ctx, x, belt, x === 8 || x === 9 ? GOLD_HI : GOLD_SH);
}
function reindeerBody(p: Px, ctx: CostumeCtx): void {
  if (ctx.back) return;
  // a pale belly on the brown sweater
  const end = torsoEnd(ctx, p);
  for (let y = ctx.T + 2; y <= end - 1; y++) for (let x = 7; x <= 10; x++) paintBody(p, ctx, x, y, BROWN_HI);
}

// ─── entry point ─────────────────────────────────────────────────────────────
/** Paint a Christmas costume's overlay. Runs where paintCostume runs: after
 *  the head group, before the outline pass, so the outline wraps the hat too. */
export function paintChristmas(p: Px, c: ChristmasCostume, ctx: CostumeCtx): void {
  const { back } = ctx;
  switch (c) {
    case 'santa': santaSuit(p, ctx); santaHat(p, back); break;
    case 'mrsclaus': mrsClausDress(p, ctx); hollyClip(p); break;
    case 'elf': elfTunic(p, ctx); elfHat(p, back); break;
    case 'reindeer': reindeerBody(p, ctx); antlers(p); if (!back) reindeerNose(p); break;
    case 'belsnickel': furCoat(p, ctx); furHat(p, back); break;
    case 'angel': wings(p, ctx); halo(p); break;
    case 'nutcracker': nutcrackerCoat(p, ctx); shako(p, back); break;
    case 'sweater': uglySweater(p, ctx); paperCrown(p); break;
    case 'scarf': scarf(p, ctx); beanie(p); break;
    case 'snowman': snowmanBody(p, ctx); snowmanHat(p, back); break;
    case 'gingerbread': icing(p, ctx); gingerBow(p); break;
    case 'star': tinsel(p, ctx); starBand(p); break;
    case 'tree': lights(p, ctx); treeHat(p, back); break;
  }
}

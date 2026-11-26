/**
 * SANTA'S SLEIGH (pieces/Sleigh.tsx, ChristmasLayer.tsx): the pixel art and
 * the timing of its flight. Christmas's twin of Halloween's bats: it crosses
 * the top of the window now and then, Santa in his sleigh behind three
 * reindeer, Rudolph's red nose in front. Import free on purpose:
 * test/load-ts.cjs loads this file and runs it.
 *
 * The art is a grid of letters, one per pixel, facing right (the way it
 * flies). Each letter is a colour token of the Christmas season (PALETTE);
 * '.' is empty. The legs are kept apart from the body in two frames, so
 * christmas.css can gallop them by showing one frame, then the other.
 */

/** Screen pixels per art pixel: the team is as tall as a bat (22 px). */
export const PIXEL = 2;

/** One flight loop, in seconds, and the share of it spent crossing. */
export const SLEIGH_LOOP_S = 46;
export const SLEIGH_CROSS_SHARE = 0.15;
/** Seconds after the window opens before the first crossing. */
export const SLEIGH_FIRST_S = 6;

export const PALETTE: Record<string, string> = {
  R: 'var(--cth-season-red)',
  r: 'var(--cth-season-red-sh)',
  W: 'var(--cth-season-snow)',
  s: 'var(--cth-season-skin)',
  E: 'var(--cth-season-ink)',
  Y: 'var(--cth-season-gold)',
  g: 'var(--cth-season-green)',
  G: 'var(--cth-season-green-sh)',
  d: 'var(--cth-season-deer)',
  D: 'var(--cth-season-deer-sh)',
  a: 'var(--cth-season-antler)',
  n: 'var(--cth-season-deer-sh)',
  N: 'var(--cth-season-red)',
};

/** Santa in his sleigh, the gift sack behind him. 20 wide, 11 high. */
const SLEIGH = [
  '........WRR.........',
  '.......RRR..........',
  '.......WWWW.........',
  '.gG....sEs..........',
  'gggG..WWWWss........',
  'gGgg.RRRWWRR........',
  'YRRRRRRRRRRRRR...Y..',
  '.RRRRRRRRRRRRRR..Y..',
  '..rrrrrrrrrrrrr.Y...',
  '...Y.......Y...Y....',
  '..YYYYYYYYYYYYY.....',
];

/** One reindeer, facing right. 'n' is the nose. 15 wide, 11 high. */
const DEER = [
  '..........a.a..',
  '..........aa...',
  '...........dEd.',
  '...........dddn',
  '..........dd...',
  'W.ddddddddddd..',
  '.ddddddddddd...',
  '..DDDDDDDDD....',
  '...............',
  '...............',
  '...............',
];

/** The legs, two frames: stretched out, then gathered under the body. */
const LEGS_A = [
  '..D.......D....',
  '.D.........D...',
];
const LEGS_B = [
  '...D.D..D.D....',
  '...D.D..D.D....',
];

/** Gaps, in art pixels, between the sleigh and the first deer and between deer. */
const SLEIGH_GAP = 3;
const DEER_GAP = 2;
export const DEER_COUNT = 3;

const HEIGHT = SLEIGH.length;
const LEG_ROW = 8;
/** The row the reins run along, from Santa's hands to the front deer. */
const REIN_ROW = 5;

function blank(w: number): string[][] {
  return Array.from({ length: HEIGHT }, () => Array.from({ length: w }, () => '.'));
}

function stamp(grid: string[][], art: string[], x: number, y: number): void {
  art.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') grid[y + j][x + i] = row[i];
  });
}

export interface Team {
  width: number;
  height: number;
  /** The body: sleigh, Santa, the deer without legs, the reins. */
  body: string[];
  /** The deer's legs, frame A (stretched) and frame B (gathered). */
  legsA: string[];
  legsB: string[];
}

/** Lays out the sleigh and the deer side by side, Rudolph last (in front). */
export function composeTeam(): Team {
  const deerX: number[] = [];
  let x = SLEIGH[0].length + SLEIGH_GAP;
  for (let k = 0; k < DEER_COUNT; k++) {
    deerX.push(x);
    x += DEER[0].length + (k < DEER_COUNT - 1 ? DEER_GAP : 0);
  }
  const width = x;
  const body = blank(width), legsA = blank(width), legsB = blank(width);
  stamp(body, SLEIGH, 0, 0);
  deerX.forEach((dx, k) => {
    const rudolph = k === DEER_COUNT - 1;
    stamp(body, DEER.map((row) => (rudolph ? row.replace('n', 'N') : row)), dx, 0);
    stamp(legsA, LEGS_A, dx, LEG_ROW);
    stamp(legsB, LEGS_B, dx, LEG_ROW);
  });
  // The reins: from Santa's hands (the last skin pixel) to Rudolph's chest.
  const hands = SLEIGH[4].lastIndexOf('s') + 1;
  const chest = deerX[DEER_COUNT - 1] + DEER[REIN_ROW].indexOf('d');
  for (let i = hands; i < chest; i++) if (body[REIN_ROW][i] === '.') body[REIN_ROW][i] = 'Y';
  const join = (g: string[][]) => g.map((r) => r.join(''));
  return { width, height: HEIGHT, body: join(body), legsA: join(legsA), legsB: join(legsB) };
}

export interface Run {
  x: number;
  y: number;
  w: number;
  key: string;
}

/** A grid as runs of one colour along each row: few rects to draw. */
export function toRuns(rows: string[]): Run[] {
  const runs: Run[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let w = 1;
      while (row[x + w] === key) w++;
      if (key !== '.') runs.push({ x, y, w, key });
      x += w;
    }
  });
  return runs;
}

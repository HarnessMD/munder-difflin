/**
 * WHERE the Halloween props go on a Classic office floor (0.5.5, founder
 * 28 Sep 2026). Nothing here draws: SeasonDecor.ts does. This file only reads
 * the map (walls, walkable tiles, desks, the cafe counter) and answers with
 * positions, so every theme's map gets dressed by the same rules and none of
 * it is painted into a map file. Season 'none' never calls it.
 *
 * Import free on purpose: test/load-ts.cjs loads this file and runs it.
 */

export interface PlanTile { x: number; y: number; }

export interface HalloweenPlanInput {
  /** Map size in tiles, and one tile's size in map pixels. */
  width: number;
  height: number;
  tileSize: number;
  /** The gid the map's `walls` layer paints at a tile, 0 where it has none. */
  wallAt(x: number, y: number): number;
  isWalkable(x: number, y: number): boolean;
  /** Top-left tile of each standard desk's 2x2 monitor block, in desk order. */
  desks: readonly PlanTile[];
  /** The cafe counter: the tile the machine is used from and the sink's tile. */
  machineStand: PlanTile;
  sinkTile: PlanTile;
  /** Tiles a prop must stay off: seats, the entrance, errand and cafe stands. */
  avoid: readonly PlanTile[];
  /** True where a furniture layer paints the tile: a window, the clock, a
   *  board. A wall lamp never hangs over one. Absent: nothing hangs anywhere. */
  decorAt?(x: number, y: number): boolean;
}

/** A prop in map pixels. `z` is its sort key among the characters. */
export interface PlanProp { x: number; y: number; z: number; }
export interface PlanPumpkin extends PlanProp {
  size: 'desk' | 'floor';
  /** Where in its flicker this one starts, 0 to 1, so they never pulse as one. */
  phase: number;
}
export interface PlanCobweb {
  /** The wall corner the web hangs from, in map pixels. */
  x: number;
  y: number;
  /** True for a top-right corner: the web is mirrored. */
  flip: boolean;
}

/** A red wall lamp (R4-4): the bulb's centre on a wall face, in map pixels.
 *  `z` is the foot of that wall, so anyone standing below walks in front. */
export interface PlanLamp extends PlanProp {
  /** Where in its flicker this one starts, 0 to 1. */
  phase: number;
}

export interface HalloweenPlan {
  pumpkins: PlanPumpkin[];
  cobwebs: PlanCobweb[];
  candy: PlanProp;
  bats: number;
  lamps: PlanLamp[];
}

export const MAX_DESK_PUMPKINS = 5;
export const MAX_FLOOR_PUMPKINS = 4;
export const MAX_COBWEBS = 6;
export const BAT_COUNT = 3;
export const MAX_RED_LAMPS = 5;
/** The fewest tiles between two red lamps. */
export const LAMP_GAP = 3;

/** A stable 0 to 1 number from a tile, so a prop looks the same every launch. */
function tileNoise(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Keep at most `max` of `all`, spread as far apart as they go. The first one
 *  kept is the first in reading order, so the pick never changes between runs. */
function spread<T extends PlanTile>(all: readonly T[], max: number): T[] {
  if (all.length <= max) return [...all];
  const kept: T[] = [all[0]];
  while (kept.length < max) {
    let best: T | null = null;
    let bestD = -1;
    for (const c of all) {
      if (kept.includes(c)) continue;
      let d = Infinity;
      for (const k of kept) d = Math.min(d, (c.x - k.x) ** 2 + (c.y - k.y) ** 2);
      if (d > bestD) { bestD = d; best = c; }
    }
    if (!best) break;
    kept.push(best);
  }
  return kept;
}

/** Wall tiles stacked directly above a tile: how tall the wall face is there. */
function wallRun(input: HalloweenPlanInput, x: number, y: number): number {
  let n = 0;
  while (n < 3 && input.wallAt(x, y - 1 - n) !== 0) n++;
  return n;
}

export function planHalloween(input: HalloweenPlanInput): HalloweenPlan {
  const ts = input.tileSize;
  const avoided = new Set(input.avoid.map((t) => `${t.x},${t.y}`));

  // Desk pumpkins: every other standard desk, sat on the desk top to the left
  // of the monitor. The right of the monitor is where the owner's mug goes.
  const desks = input.desks.filter((_, i) => i % 2 === 1);
  const pumpkins: PlanPumpkin[] = spread(desks, MAX_DESK_PUMPKINS).map((d) => ({
    size: 'desk' as const,
    x: d.x * ts - 9,
    y: d.y * ts + 27,
    // One under the monitor overlay's own key, so a lit screen never hides it.
    z: (d.y + 2) * ts - 2,
    phase: tileNoise(d.x, d.y)
  }));

  // Floor pumpkins: the inside corners of rooms, where nobody walks through.
  // A corner is a walkable tile with a closed tile below it and a closed tile
  // on ONE side. Closed on both sides is a doorway, and the map's last row is
  // the way out: neither gets a pumpkin to trip over.
  const corners: PlanTile[] = [];
  for (let y = 0; y < input.height; y++) {
    for (let x = 0; x < input.width; x++) {
      if (!input.isWalkable(x, y) || avoided.has(`${x},${y}`)) continue;
      if (y + 1 >= input.height || input.isWalkable(x, y + 1)) continue;
      if (!input.isWalkable(x, y - 1)) continue;
      if (input.isWalkable(x - 1, y) === input.isWalkable(x + 1, y)) continue;
      corners.push({ x, y });
    }
  }
  for (const c of spread(corners, MAX_FLOOR_PUMPKINS)) {
    pumpkins.push({
      size: 'floor',
      x: c.x * ts + 2,
      y: c.y * ts + ts - 1,
      z: (c.y + 1) * ts,
      phase: tileNoise(c.x, c.y)
    });
  }

  // Cobwebs: the top corners of rooms, hung at the top of the wall face. A
  // corner is where a side wall runs up THROUGH the face: the same wall tile
  // beside the floor and beside the face. A divider that stops under a wall
  // that carries on past it is not one, and a web there would hang in mid wall.
  const webTiles: Array<PlanTile & { flip: boolean; row: number }> = [];
  for (let y = 1; y < input.height; y++) {
    for (let x = 0; x < input.width; x++) {
      if (input.wallAt(x, y) !== 0 || input.wallAt(x, y - 1) === 0) continue;
      const run = wallRun(input, x, y);
      // A three tile wall is a cap over a two tile face: hang from under the cap.
      const row = y - Math.max(1, run === 3 ? 2 : run);
      for (const side of [-1, 1]) {
        const beside = input.wallAt(x + side, y);
        if (beside === 0 || beside !== input.wallAt(x + side, row)) continue;
        webTiles.push({ x, y, row, flip: side === 1 });
        break;
      }
    }
  }
  const cobwebs: PlanCobweb[] = spread(webTiles, MAX_COBWEBS).map((w) => (
    { x: (w.flip ? w.x + 1 : w.x) * ts, y: w.row * ts, flip: w.flip }
  ));

  // Red wall lamps (founder 30 Sep: "Add red lights"): on the face of a wall,
  // in its row right above the floor (a one tile wall, like the top of the
  // precinct, is its own face). Never at the end of a wall, never under or
  // over a window, the clock or a board, never beside a web, and never within
  // LAMP_GAP tiles of another lamp, so they read as lamps, not a strip.
  const decorAt = input.decorAt ?? (() => false);
  const lampTiles: PlanTile[] = [];
  for (let y = 0; y + 1 < input.height; y++) {
    for (let x = 0; x < input.width; x++) {
      if (input.wallAt(x, y) === 0 || input.wallAt(x, y + 1) !== 0) continue;
      if (input.wallAt(x - 1, y) === 0 || input.wallAt(x + 1, y) === 0) continue;
      if (decorAt(x, y) || decorAt(x, y - 1)) continue;
      if (webTiles.some((w) => Math.abs(w.x - x) <= 1 && Math.abs(w.y - y) <= 2)) continue;
      lampTiles.push({ x, y });
    }
  }
  const lampPick: PlanTile[] = [];
  for (const t of spread(lampTiles, MAX_RED_LAMPS)) {
    if (lampPick.every((k) => Math.max(Math.abs(k.x - t.x), Math.abs(k.y - t.y)) >= LAMP_GAP)) lampPick.push(t);
  }
  const lamps: PlanLamp[] = lampPick.map((t) => ({
    x: t.x * ts + ts / 2,
    y: t.y * ts + 6,
    z: (t.y + 1) * ts,
    phase: tileNoise(t.x, t.y)
  }));

  // The candy bowl sits on the counter between the machine and the sink, in
  // the gap the counter's own mug leaves free.
  const cx = Math.floor((input.machineStand.x + input.sinkTile.x) / 2);
  const candy: PlanProp = {
    x: cx * ts + 10,
    y: input.sinkTile.y * ts + 13,
    z: (input.sinkTile.y + 1) * ts
  };

  return { pumpkins, cobwebs, candy, bats: BAT_COUNT, lamps };
}

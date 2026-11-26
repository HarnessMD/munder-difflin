/**
 * THE SNOWFALL's flakes (ChristmasLayer.tsx): where each one falls, how big,
 * how fast. Fixed numbers from a seeded sequence, so the snow looks the same
 * on every launch and a test can hold its rules. Import free on purpose:
 * test/load-ts.cjs loads this file and runs it.
 *
 * A gentle snow: few flakes, small and slow, never a blizzard over the text.
 */

export interface Snowflake {
  /** Across the window, 0 to 100 (%). */
  left: number;
  /** Diameter in px. */
  size: number;
  opacity: number;
  /** Seconds to fall the height of the window. */
  fall: number;
  /** Seconds of one sway from side to side. */
  sway: number;
  /** Seconds already fallen at first paint, so the window opens mid snowfall. */
  delay: number;
}

export const FLAKE_COUNT = 28;
export const MIN_FALL_S = 14;
export const MAX_FALL_S = 26;
export const MIN_SIZE = 2;
export const MAX_SIZE = 5;

/** A small seeded generator (mulberry32): the same flakes every time. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function planSnow(count = FLAKE_COUNT, seed = 1225): Snowflake[] {
  const rnd = seeded(seed);
  const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
  return Array.from({ length: count }, (_, i) => {
    // Spread across the width in even bands, jittered inside each band, so
    // the flakes never bunch up on one side.
    const left = round(((i + rnd()) / count) * 100);
    const size = Math.round(MIN_SIZE + rnd() * (MAX_SIZE - MIN_SIZE));
    // Bigger flakes are nearer: they fall a little faster and show a little more.
    const near = (size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
    const fall = round(MAX_FALL_S - near * (MAX_FALL_S - MIN_FALL_S) * (0.6 + 0.4 * rnd()));
    return {
      left,
      size,
      opacity: round(0.45 + 0.4 * near, 2),
      fall,
      sway: round(2.5 + rnd() * 2.5),
      delay: round(rnd() * fall),
    };
  });
}

export const SNOWFLAKES: readonly Snowflake[] = planSnow();

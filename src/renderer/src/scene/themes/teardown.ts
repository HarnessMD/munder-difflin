// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Unmounting the stations floor (TES-GUPPY-RASTER).
//
// What the floor made itself (the cache target, its cells and tree, every texture
// it owns) is freed while the app and its sprites are still whole, then the app is
// destroyed. Freed after app.destroy, the cache's cell sprites were already
// destroyed: destroying them again threw (their texture was null), and the one
// catch around the whole free left the target, the tree and every texture behind.
// Each step now runs on its own, so one that throws cannot skip the rest.

export interface Destroyable {
  ticker?: { stop(): void } | null;
  destroy(removeView?: boolean, options?: { children?: boolean }): void;
}

export function teardownFloor(app: Destroyable, frees: ReadonlyArray<() => void>): void {
  try { app.ticker?.stop(); } catch { /* noop */ }
  for (const free of frees) {
    try { free(); } catch { /* noop */ }
  }
  try { app.destroy(true, { children: true }); } catch { /* noop */ }
}

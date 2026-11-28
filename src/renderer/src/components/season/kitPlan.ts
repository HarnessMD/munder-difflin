/**
 * THE KIT'S RULES. The Halloween micro interactions on moments the app
 * already has. The moving parts are CSS (kit.css) and the wiring is Kit.tsx;
 * this file is every number and every decision, with no imports, so a test
 * loads it on its own.
 *
 * The rule that shapes all of it: nothing runs while the app is idle. Every
 * animation here runs a fixed number of times after something real happened,
 * and the one that loops (the Send flame) is bounded by the pointer.
 */

/* ── 9, ignite ───────────────────────────────────────────────────────────── */
export const FLAME_MS = 240;
export const PRESS_SCALE = 0.96;

/* ── 13, boo ─────────────────────────────────────────────────────────────── */
/** Pop, hold, duck, all inside the shortest `copied` window the app has
 *  (1200 ms in SetupPanel, ToolVersionNotice and PrerequisitesCheck). */
export const BOO_MS = 1200;

/* ── 24, the summoning palette ───────────────────────────────────────────── */
export const KEYCAP_MS = 200;
export const SETTLE_MS = 200;

/* ── 10, the web spun checkbox ───────────────────────────────────────────── */
export const STRAND_MS = 700;
/** Strands spin out when the box goes from unticked to ticked. */
export function spun(prev: boolean | undefined, next: boolean): boolean {
  return prev === false && next === true;
}

/* ── 16, the peeking tooltip ─────────────────────────────────────────────── */
export const PEEK_MS = 300;

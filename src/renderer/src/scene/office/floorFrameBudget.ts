// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * LAG-150: how often the office floor is allowed to draw.
 *
 * Pixi's ticker runs on requestAnimationFrame, which fires at the DISPLAY's refresh rate —
 * measured 165 fps on the human's panel — and the canvas renders at >= 2x device pixels
 * (OfficeFloor's `resolution` floor, kept for bubble-text legibility), so every frame is
 * at least 4x the logical pixels. Measured on the shipped 1.1.49 at idle: the floor alone
 * was ~18% of a core in the renderer and ~14% in the GPU process; paused, 4% and 1%.
 *
 * The floor is pixel art: sprites step on whole pixels (roundPixels) and walk-cycle
 * frames change a few times a second, so 30 fps is visually indistinguishable here and
 * costs a fraction of 165. Capped at 30, the same idle floor measured ~5% / ~2%.
 */
export const FLOOR_MAX_FPS = 30;

/** Apply the cap to a Pixi ticker. `maxFPS` makes the ticker skip frames that arrive
 *  early; `deltaMS` still reports true elapsed time, so movement speed is unchanged. */
export function applyFloorFrameBudget(ticker: { maxFPS: number }): void {
  ticker.maxFPS = FLOOR_MAX_FPS;
}

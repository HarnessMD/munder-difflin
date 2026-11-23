/**
 * When the office floor stops drawing (0.5.5). Pure, no imports, so a test runs
 * it as is.
 *
 * The floor is off screen when a fullscreen terminal or the editor covers it,
 * or when its window is off screen. `windowHidden` comes from main (minimised,
 * hidden, Cmd+H, or on macOS fully covered); `docHidden` is document.hidden,
 * which never turns true while the app sets backgroundThrottling false, and is
 * kept only as a second signal in case that ever changes.
 */
export interface FloorPauseInputs {
  fullscreen: boolean;
  ideOpen: boolean;
  docHidden: boolean;
  windowHidden: boolean;
}

export function floorPaused(i: FloorPauseInputs): boolean {
  return i.fullscreen || i.ideOpen || i.docHidden || i.windowHidden;
}

/** Stop or start every ticker that draws the floor. Two: the floor's own
 *  app.ticker, and Pixi's Ticker.system, where Pixi's event system keeps a
 *  listener that asks for an animation frame at the display rate for as long
 *  as it runs. Stopping only the first still woke a hidden floor 60 to 120
 *  times a second. */
export function applyFloorPause(tickers: ReadonlyArray<{ stop(): void; start(): void } | null | undefined>, paused: boolean): void {
  for (const t of tickers) {
    if (!t) continue;
    if (paused) t.stop(); else t.start();
  }
}

/** One frame for a paused floor. A stopped ticker draws nothing, and a
 *  resize clears the canvas, so a floor mounted or resized while the window
 *  counts as off screen stayed blank until something woke it, even when a missed
 *  'show' had left it in front of the person. One tick through the floor's own
 *  ticker composes and renders the scene as it is now; the ticker stays stopped.
 *  The cap is lifted for that tick: under it, a tick within 1/30 s of the last
 *  frame (the end of init is one) returns without drawing. */
export function drawOnceWhilePaused(ticker: { update(): void; maxFPS: number } | null | undefined, paused: boolean): void {
  if (!paused || !ticker) return;
  const cap = ticker.maxFPS;
  ticker.maxFPS = 0;
  try { ticker.update(); } finally { ticker.maxFPS = cap; }
}

/** One frame for a paused floor whose size changed (a window resize, the rail, a switch of view, a reload). The
 *  camera eases to a new fit over about 1.6 s of running frames, and a paused floor gets one: it is put at its
 *  fit first, so that frame is the settled floor and not one zoomed out on a dark field until a pointer wakes it. */
export function drawSettledWhilePaused(ticker: { update(): void; maxFPS: number } | null | undefined, camera: { snapToTarget(): void } | null | undefined, paused: boolean): void {
  if (!paused || !ticker) return;
  camera?.snapToTarget();
  drawOnceWhilePaused(ticker, paused);
}

/** Frame rate ceiling for the office scene (perf Track B, 0.5.5).
 *
 *  Measured by the author of #273 on a live 120 Hz floor (% of one CPU core,
 *  renderer process / GPU process):
 *
 *    uncapped (120 Hz)   26.7 / 16.9
 *    60 fps              19.7 /  9.3
 *    30 fps              15.1 /  6.6
 *    20 fps              12.7 /  5.8
 *
 *  0.5.5 takes 30: most of the saving, and sprite frames only change 4 to 9
 *  times a second, so nothing visible is lost. What a cap does not change is
 *  SPEED: after the motion fixes (Character.updateWalk, Camera.update) every
 *  thing covers the same ground per second, just in fewer steps. */
export const FLOOR_MAX_FPS = 30;

// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * PERF-FLOOR-FILL-188: the TES floor redraws only what changed. The canvas keeps its drawing
 * buffer, and each frame only the device-px rects that something moving left or entered are
 * cleared and drawn again (the whole scene, scissored to each rect: inside a rect every pixel is
 * the one a full draw makes). Anything that moves the whole picture (the camera, the canvas size,
 * the resolution, the floor texture) draws it all.
 *
 * Why: a whole-n floor at n = 2 is 4x the fragments, and on a machine without a GPU every one of
 * them is software (SwiftShader) at 30 fps: drawing the settled floor every frame cost the GPU
 * process 1.5-3x v1.1.87. Redrawing only the people's rects costs a fraction of it at any n.
 */

/** A device-px rect, top-left origin. */
export type Rect = { x: number; y: number; w: number; h: number };

/** Bounds in CSS px (Pixi's getBounds) to the device-px rect holding every pixel they can touch,
 *  one px wider each side for vertex rounding, clipped to the W x H canvas (null: off it). */
export function deviceRect(b: { minX: number; minY: number; maxX: number; maxY: number }, r: number, W: number, H: number): Rect | null {
  if (!(b.maxX > b.minX && b.maxY > b.minY)) return null;
  const x0 = Math.max(0, Math.floor(b.minX * r) - 1), y0 = Math.max(0, Math.floor(b.minY * r) - 1);
  const x1 = Math.min(W, Math.ceil(b.maxX * r) + 1), y1 = Math.min(H, Math.ceil(b.maxY * r) + 1);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};
const touch = (a: Rect, b: Rect) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
const area = (a: Rect) => a.w * a.h;

/** The rects to draw again: overlapping or touching rects merged, then the pair whose union
 *  adds the least area merged until at most `maxRects` remain (each rect is one scissored draw of
 *  the scene). Every input pixel stays covered. */
export function mergeRects(rects: Rect[], maxRects = 6): Rect[] {
  let out = rects.filter((r) => r.w > 0 && r.h > 0).map((r) => ({ ...r }));
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) for (let j = i + 1; j < out.length; j++) {
      if (!touch(out[i], out[j])) continue;
      out[i] = union(out[i], out[j]);
      out.splice(j, 1);
      merged = true;
      break;
    }
  }
  while (out.length > Math.max(1, maxRects)) {
    let bi = 0, bj = 1, best = Infinity;
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
      const cost = area(union(out[i], out[j])) - area(out[i]) - area(out[j]);
      if (cost < best) { best = cost; bi = i; bj = j; }
    }
    const u = union(out[bi], out[bj]);
    out.splice(bj, 1);
    out[bi] = u;
    // A union can reach rects it did not touch before.
    out = mergeRects(out, Infinity);
  }
  return out;
}

/** One thing that can change between frames: its device rect (null: draws nothing on screen)
 *  and a signature of everything else about how it draws (texture, depth, opacity, content). */
export type Drawn = { rect: Rect | null; sig: string };

/**
 * Per frame, what to draw: 'full', or the rects where something changed. A thing that moved,
 * changed its signature, appeared or went away damages its old and its new rect. `always` rects
 * (things whose content cannot be signed cheaply) are drawn every frame.
 */
export class DamageTracker {
  private view: string | null = null;
  private last = new Map<unknown, Drawn>();

  /** Draw it all next frame (context restored, an outside draw, a test). */
  invalidate(): void { this.view = null; }

  frame(view: string, now: Map<unknown, Drawn>, always: Rect[], W: number, H: number, maxRects = 6): 'full' | Rect[] {
    const prev = this.last;
    this.last = now;
    if (view !== this.view) { this.view = view; return 'full'; }
    const dirty: Rect[] = [...always];
    for (const [k, d] of now) {
      const p = prev.get(k);
      if (p && p.sig === d.sig && sameRect(p.rect, d.rect)) continue;
      if (p?.rect) dirty.push(p.rect);
      if (d.rect) dirty.push(d.rect);
    }
    for (const [k, p] of prev) if (!now.has(k) && p.rect) dirty.push(p.rect);
    const rects = mergeRects(dirty, maxRects);
    // Past half the canvas a full draw is no dearer and is one pass.
    return rects.reduce((s, r) => s + area(r), 0) > (W * H) / 2 ? 'full' : rects;
  }
}

const sameRect = (a: Rect | null, b: Rect | null) => (a === null || b === null ? a === b : a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);

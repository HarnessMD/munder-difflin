// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Drawing looks: a body's sheet column recoloured to a look (cached), and a
// pack portrait painted into a card canvas. The decisions (which body, which
// colours, which frame and crop) come from looks.ts; this only blits.

import { recolorBody } from './recolor';
import { portraitPlacement, type PortraitPlan } from './looks';
import type { ThemeLooks } from './themeCatalog';
import type { BuilderBody, LookColors } from './manifest';

const columns = new Map<string, HTMLCanvasElement>();
const MAX = 200;

/** The body's column of the sheet in the given colours: a frameWidth-wide canvas, every row. */
export function lookColumn(looks: ThemeLooks, body: BuilderBody, colors: Partial<LookColors>): HTMLCanvasElement {
  const key = [looks.themeId, body.id, body.column, colors.skin ?? '', colors.shirt ?? '', colors.hair ?? ''].join('|');
  const hit = columns.get(key);
  if (hit) { columns.delete(key); columns.set(key, hit); return hit; }
  const fw = looks.sprite.frameWidth;
  const px = recolorBody(looks.sheet, body, colors, { x0: body.column * fw, fw, fh: looks.sprite.frameHeight }, looks.builder ?? {});
  const cv = document.createElement('canvas');
  cv.width = px.width; cv.height = px.height;
  cv.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(px.data), px.width, px.height), 0, 0);
  columns.set(key, cv);
  if (columns.size > MAX) columns.delete(columns.keys().next().value!);
  return cv;
}

/** Paint a pack portrait into the whole canvas (smoothing off: pixels stay square). */
export function paintPackPortrait(ctx: CanvasRenderingContext2D, looks: ThemeLooks, plan: Extract<PortraitPlan, { kind: 'pack' }>): void {
  const col = lookColumn(looks, plan.body, plan.colors);
  const [cx, cy, cw, ch] = plan.crop;
  const { dx, dy, dw, dh } = portraitPlacement(plan.crop, ctx.canvas.width, ctx.canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(col, cx, plan.sy + cy, cw, ch, dx, dy, dw, dh);
}

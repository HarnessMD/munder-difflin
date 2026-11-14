// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Recolouring a body of a pack's character sheet (skin, shirt, hair) by palette
// swap. A port of an audited per-pack recolourer, with the per-body colours
// taken from the pack's manifest instead of being written into the code:
// - each part lists the exact sheet colours it is made of, with a main shade;
//   every other colour (outline, eyes, trousers, badges) is left as it is;
// - hair drawn in the outline colour itself is found by shape: inner outline
//   pixels (4 opaque neighbours, not touching an eye) joined to the top rows
//   of the head;
// - shading is kept: the main shade becomes the chosen colour, a darker shade
//   keeps its lightness ratio (at least 60% of the step, and never closer to
//   the outline than a 1.45 contrast), a lighter one moves the same fraction
//   towards white; hue offset and saturation ratio are kept.
// Pure: RGBA in, RGBA out.

import type { BuilderBody, BuilderSpec, LookColors, LookPart, PartSpec } from './manifest';
import { LOOK_PARTS } from './manifest';
import type { Pixels } from './raster';

type RGB = [number, number, number];

export function hexRgb(c: string): RGB {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(c || '').trim());
  if (!m) throw new Error('colour must be #rrggbb or #rgb: ' + c);
  const h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
  const n = parseInt(h, 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
export const rgbHex = (rgb: RGB): string => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
/** '#rrggbb' for a valid colour, else null. */
export function normColour(c: unknown): string | null {
  if (typeof c !== 'string') return null;
  try { return rgbHex(hexRgb(c)); } catch { return null; }
}

function rgbToHsl([r, g, b]: RGB): RGB {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb([h, s, l]: RGB): RGB {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    const v = t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Darker shades keep at least this contrast to the outline, so eyes, mouth, nose and jaw stay visible. */
const MIN_CONTRAST = 1.45;
const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (rgb: RGB) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);

/** Each shade of a part ('#rrggbb') mapped to its new [r,g,b], built from the chosen colour. */
export function ramp(part: PartSpec, chosen: string, outline = '#000000'): Map<string, RGB> {
  const out = new Map<string, RGB>();
  const want = rgbHex(hexRgb(chosen)), main = rgbHex(hexRgb(part.main));
  if (want === main) { for (const s of part.shades) out.set(s, hexRgb(s)); return out; }
  const m = rgbToHsl(hexRgb(main)), c = rgbToHsl(hexRgb(want));
  const info = part.shades.filter((s) => s !== main).map((s) => ({ s, b: rgbToHsl(hexRgb(s)) }));
  const lighter = info.filter((x) => x.b[2] > m[2]), darker = info.filter((x) => x.b[2] <= m[2]);
  // Near-white choice: a highlight has no room above it, so the chosen colour becomes the highlight and the
  // main shade steps down instead (white hair keeps its shading).
  let cl = c[2], top = 0;
  for (const x of lighter) top = Math.max(top, x.b[2] - m[2]);
  const nearWhite = lighter.length > 0 && (1 - c[2]) * (top / Math.max(1e-6, 1 - m[2])) < 0.06;
  if (nearWhite) cl = c[2] - Math.max(0.06, top * 0.5);
  const lOf = new Map<string, number>();
  for (const x of lighter)
    lOf.set(x.s, nearWhite ? cl + (c[2] - cl) * ((x.b[2] - m[2]) / top) : cl + (1 - cl) * ((x.b[2] - m[2]) / Math.max(1e-6, 1 - m[2])));
  const tint = (b: RGB, l: number) => hslToRgb([c[0] + (b[0] - m[0]), m[1] > 0 ? clamp01(c[1] * (b[1] / m[1])) : c[1], clamp01(l)]);
  const k = Math.max(0.6, m[2] > 0 ? cl / m[2] : 1);
  let minRaw = cl;
  for (const x of darker) { const l = cl - (m[2] - x.b[2]) * k; lOf.set(x.s, l); minRaw = Math.min(minRaw, l); }
  // floor = the lightness at which the darkest shade's tint reaches MIN_CONTRAST against the outline
  let floor = 0;
  if (darker.length) {
    const outLum = lum(hexRgb(outline));
    const darkest = darker.reduce((a, x) => (x.b[2] < a.b[2] ? x : a));
    let lo = 0, hi = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if ((lum(tint(darkest.b, mid)) + 0.05) / (outLum + 0.05) >= MIN_CONTRAST) hi = mid; else lo = mid;
    }
    floor = Math.max(0, Math.min(hi, cl - 0.06));
  }
  if (minRaw < floor) for (const x of darker) lOf.set(x.s, cl - (cl - lOf.get(x.s)!) * (cl - floor) / (cl - minRaw));
  out.set(main, nearWhite ? hslToRgb([c[0], c[1], cl]) : hexRgb(want));
  for (const x of info) out.set(x.s, tint(x.b, lOf.get(x.s)!));
  return out;
}

const PART_ID: Record<LookPart, number> = { skin: 1, hair: 2, shirt: 3 };
const keyAt = (px: ArrayLike<number>, i: number): string | null => (px[i + 3] === 0 ? null : rgbHex([px[i], px[i + 1], px[i + 2]]));

/** The region of a sheet one body occupies: its column, every row. */
export interface BodyRegion { x0: number; fw: number; fh: number; }

/** 0 none, 1 skin, 2 hair, 3 shirt for every pixel of the sheet (only the body's column is marked). */
export function partMask(img: Pixels, body: BuilderBody, region: BodyRegion, spec: Pick<BuilderSpec, 'outline' | 'eyes'>): Uint8Array {
  const { width, height, data: px } = img, { x0, fw, fh } = region;
  const mask = new Uint8Array(width * height);
  const byColour = new Map<string, number>();
  const parts = body.parts ?? {};
  for (const name of LOOK_PARTS) {
    const p = parts[name];
    if (!p || p.byShape) continue;
    for (const s of p.shades) byColour.set(s, PART_ID[name]);
  }
  for (let y = 0; y < height; y++)
    for (let x = x0; x < Math.min(width, x0 + fw); x++) {
      const k = keyAt(px, (y * width + x) * 4);
      if (k && byColour.has(k)) mask[y * width + x] = byColour.get(k)!;
    }
  if (parts.hair?.byShape && spec.outline)
    for (let top = 0; top + fh <= height; top += fh) hairByShape(img, x0, fw, top, fh, spec.outline, spec.eyes ?? '#ffffff', mask);
  return mask;
}

/** One frame: hair drawn in the outline colour = pixels of that colour whose 4 neighbours (inside the frame)
 *  are all opaque and not an eye, 4-connected to such a pixel in the first 3 opaque rows of the frame. */
function hairByShape(img: Pixels, x0: number, fw: number, top: number, fh: number, colour: string, eyes: string, mask: Uint8Array): void {
  const { width, data: px } = img;
  const opaque = (x: number, y: number) => x >= x0 && x < x0 + fw && y >= top && y < top + fh && px[(y * width + x) * 4 + 3] !== 0;
  const is = (x: number, y: number, c: string) => opaque(x, y) && keyAt(px, (y * width + x) * 4) === c;
  const inner = (x: number, y: number) => is(x, y, colour) && opaque(x - 1, y) && opaque(x + 1, y) && opaque(x, y - 1) && opaque(x, y + 1)
    && !is(x - 1, y, eyes) && !is(x + 1, y, eyes) && !is(x, y - 1, eyes) && !is(x, y + 1, eyes);
  let firstRow = -1;
  for (let y = top; y < top + fh && firstRow < 0; y++)
    for (let x = x0; x < x0 + fw; x++) if (opaque(x, y)) { firstRow = y; break; }
  if (firstRow < 0) return;
  const seen = new Uint8Array(fw * fh), stack: Array<[number, number]> = [];
  for (let y = firstRow; y < firstRow + 3; y++)
    for (let x = x0; x < x0 + fw; x++) if (inner(x, y)) stack.push([x, y]);
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const s = (y - top) * fw + (x - x0);
    if (seen[s]) continue;
    seen[s] = 1;
    mask[y * width + x] = PART_ID.hair;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inner(x + dx, y + dy)) stack.push([x + dx, y + dy]);
  }
}

/** The body's own colours (each part's main shade); a part the body does not declare is absent. */
export function originalColors(body: BuilderBody): Partial<LookColors> {
  const out: Partial<LookColors> = {};
  for (const p of LOOK_PARTS) if (body.parts?.[p]) out[p] = body.parts[p]!.main;
  return out;
}

/** The body's column of the sheet, recoloured: a fw-wide strip, every row. */
export function recolorBody(img: Pixels, body: BuilderBody, colors: Partial<LookColors>, region: BodyRegion, spec: Pick<BuilderSpec, 'outline' | 'eyes'>): Pixels {
  const { width, height, data: px } = img, { x0, fw } = region;
  const maps = new Map<number, Map<string, RGB>>();
  for (const name of LOOK_PARTS) {
    const part = body.parts?.[name], want = normColour(colors[name]);
    if (part && want) maps.set(PART_ID[name], ramp(part, want, spec.outline));
  }
  const mask = maps.size ? partMask(img, body, region, spec) : null;
  const out = new Uint8ClampedArray(fw * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < fw; x++) {
      const sx = x0 + x, o = (y * fw + x) * 4;
      if (sx >= width) continue;
      const i = (y * width + sx) * 4;
      out[o] = px[i]; out[o + 1] = px[i + 1]; out[o + 2] = px[i + 2]; out[o + 3] = px[i + 3];
      const id = mask ? mask[y * width + sx] : 0;
      if (!id) continue;
      const rgb = maps.get(id)?.get(keyAt(px, i)!);
      if (rgb) { out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; }
    }
  return { width: fw, height, data: out };
}

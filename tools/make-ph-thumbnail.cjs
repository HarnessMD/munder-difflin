'use strict';
/**
 * Product Hunt thumbnail generator — 240x240 animated GIF.
 *
 * Michael alone, avatar-style, on a light brand ground, glancing around and
 * blinking. Renders the REAL sprite (src/renderer/src/scene/office/portraitArt.ts
 * is procedural pixel art with no DOM dependency outside its paint helper, so it
 * runs straight in Node), then patches the eye pixels per frame.
 *
 * No text: at ~50px in a scrolling feed the only things that survive are big
 * shapes, colour, and motion — and a face looking back at you is the one shape
 * everybody parses instantly.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const art = loadTs('src/renderer/src/scene/office/portraitArt.ts');

const W = 240, H = 240;
const SW = art.SCENE_W, SH = art.SCENE_H;

// ── palette ───────────────────────────────────────────────────────────────
const GROUND   = [241, 181, 61];       // #F1B53D — the brand yellow, sampled from
                                       // the shipping app icon tile (build/icon.png),
                                       // so the thumbnail matches the dock icon and
                                       // the site mark. Flat, edge to edge: no disc,
                                       // no vignette — any shape behind him competes
                                       // with the face.

// ── sprite geometry ───────────────────────────────────────────────────────
const SCALE = 10;                      // 18x32 sprite pixel -> 10px block
const CROP_TOP = 1;                    // sprite row where the drawing starts
const CROP_ROWS = 23;                  // head + shoulders, bled off the bottom
                                       // edge; the legs fall outside the frame
const OX = Math.round((W - SW * SCALE) / 2);
const OY = 12;

// ── eyes ──────────────────────────────────────────────────────────────────
// Whites occupy x 5-6 and 10-11. The art draws pupils at x=6 and x=10 (the
// inner pixel of each pair), so "centre" is free and one step either way gives
// a clean left/right glance. Row 9 is canon; row 10 is skin we borrow for a
// downward look.
const EYE_ROWS = [9, 10];
const WHITE   = [250, 248, 244];
const PUPIL   = [46, 38, 42];
const LID     = [168, 112, 82];        // SKIN.light.line
const SKIN_HI = [255, 221, 189];       // x=5 sits on the lit side of the face
const SKIN_BS = [247, 201, 170];

const setPx = (sp, x, y, c) => {
  const i = (y * SW + x) * 4;
  sp[i] = c[0]; sp[i + 1] = c[1]; sp[i + 2] = c[2]; sp[i + 3] = 255;
};
const skinAt = (x) => (x === 5 ? SKIN_HI : SKIN_BS);

/** Copy the sprite and repaint just the eyes. `h` -1/0/1, `v` 0/1. */
function patchEyes(base, { h = 0, v = 0, blink = false }) {
  const sp = Uint8ClampedArray.from(base);
  const cols = [5, 6, 10, 11];
  if (blink) {
    for (const x of cols) { setPx(sp, x, 10, skinAt(x)); setPx(sp, x, 9, LID); }
    return sp;
  }
  for (const x of cols) for (const y of EYE_ROWS) setPx(sp, x, y, WHITE);
  setPx(sp, h === -1 ? 5 : 6, 9 + v, PUPIL);
  setPx(sp, h === 1 ? 11 : 10, 9 + v, PUPIL);
  return sp;
}

// ── canvas helpers ────────────────────────────────────────────────────────
const px = (buf, x, y, c) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
};
const rect = (buf, x0, y0, x1, y1, c) => {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px(buf, x, y, c);
};

/** Blit the sprite at SCALE, cropped to the bust, skipping transparent pixels. */
function blitSprite(buf, sprite) {
  for (let sy = CROP_TOP; sy < CROP_TOP + CROP_ROWS && sy < SH; sy++) {
    for (let sx = 0; sx < SW; sx++) {
      const i = (sy * SW + sx) * 4;
      if (sprite[i + 3] < 128) continue;
      const c = [sprite[i], sprite[i + 1], sprite[i + 2]];
      const dx0 = OX + sx * SCALE, dy0 = OY + (sy - CROP_TOP) * SCALE;
      for (let dy = 0; dy < SCALE; dy++)
        for (let dx = 0; dx < SCALE; dx++) px(buf, dx0 + dx, dy0 + dy, c);
    }
  }
}

// ── compose one frame ─────────────────────────────────────────────────────
function composeFrame(sprite) {
  const buf = Buffer.alloc(W * H * 3);
  rect(buf, 0, 0, W, H, GROUND);
  blitSprite(buf, sprite);
  return buf;
}

// ── the loop: glance around, twice back to camera ─────────────────────────
// Delays are per-frame (centiseconds): darts are fast, holds are long. A single
// uniform delay makes eye movement read as a metronome instead of a person.
const BEATS = [
  [{ h: 0, v: 0 }, 100],
  [{ blink: true }, 8],
  [{ h: 0, v: 0 }, 24],
  [{ h: -1, v: 0 }, 52],
  [{ h: 0, v: 0 }, 16],
  [{ h: 1, v: 0 }, 50],
  [{ h: 1, v: 1 }, 28],
  [{ h: 0, v: 1 }, 22],
  [{ h: 0, v: 0 }, 44],
  [{ blink: true }, 8],
  [{ h: 0, v: 0 }, 90],
];

// ── quantise to an indexed palette ────────────────────────────────────────
function quantise(frames) {
  const map = new Map();
  const palette = [];
  for (const f of frames) {
    for (let i = 0; i < f.length; i += 3) {
      const key = (f[i] << 16) | (f[i + 1] << 8) | f[i + 2];
      if (!map.has(key)) { map.set(key, palette.length); palette.push([f[i], f[i + 1], f[i + 2]]); }
    }
  }
  if (palette.length > 256) throw new Error(`palette overflow: ${palette.length} colours`);
  const indexed = frames.map((f) => {
    const out = Buffer.alloc(W * H);
    for (let p = 0; p < W * H; p++) {
      const i = p * 3;
      out[p] = map.get((f[i] << 16) | (f[i + 1] << 8) | f[i + 2]);
    }
    return out;
  });
  return { palette, indexed };
}

// ── GIF LZW ───────────────────────────────────────────────────────────────
function lzwEncode(indexed, minCodeSize) {
  const clear = 1 << minCodeSize, end = clear + 1;
  let codeSize = minCodeSize + 1, next = end + 1;
  let dict = new Map();
  const resetDict = () => { dict = new Map(); next = end + 1; codeSize = minCodeSize + 1; };

  const out = [];
  let cur = 0, curBits = 0;
  const emit = (code) => {
    cur |= code << curBits; curBits += codeSize;
    while (curBits >= 8) { out.push(cur & 0xff); cur >>= 8; curBits -= 8; }
  };

  resetDict();
  emit(clear);
  let prefix = String(indexed[0]);
  for (let i = 1; i < indexed.length; i++) {
    const k = indexed[i];
    const combined = prefix + ',' + k;
    if (dict.has(combined)) { prefix = combined; continue; }
    emit(prefix.includes(',') ? dict.get(prefix) : Number(prefix));
    dict.set(combined, next++);
    if (next > (1 << codeSize)) {
      if (codeSize < 12) codeSize++;
      else { emit(clear); resetDict(); }
    }
    prefix = String(k);
  }
  emit(prefix.includes(',') ? dict.get(prefix) : Number(prefix));
  emit(end);
  if (curBits > 0) out.push(cur & 0xff);
  return Buffer.from(out);
}

function subBlocks(data) {
  const parts = [];
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.subarray(i, i + 255);
    parts.push(Buffer.from([chunk.length]), chunk);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

function buildGif(palette, indexed, delays) {
  let bits = 1; while ((1 << bits) < palette.length) bits++;
  const tableSize = 1 << bits;
  const gct = Buffer.alloc(tableSize * 3);
  palette.forEach((c, i) => { gct[i * 3] = c[0]; gct[i * 3 + 1] = c[1]; gct[i * 3 + 2] = c[2]; });

  const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
  const parts = [Buffer.from('GIF89a', 'ascii'), u16(W), u16(H),
    Buffer.from([0xf0 | (bits - 1), 0, 0]), gct,
    // Netscape 2.0 application extension = loop forever
    Buffer.from([0x21, 0xff, 0x0b]), Buffer.from('NETSCAPE2.0', 'ascii'),
    Buffer.from([0x03, 0x01]), u16(0), Buffer.from([0x00])];

  const minCodeSize = Math.max(2, bits);
  indexed.forEach((frame, i) => {
    parts.push(Buffer.from([0x21, 0xf9, 0x04, 0x04]), u16(delays[i]), Buffer.from([0x00, 0x00]));
    parts.push(Buffer.from([0x2c]), u16(0), u16(0), u16(W), u16(H), Buffer.from([0x00]));
    parts.push(Buffer.from([minCodeSize]), subBlocks(lzwEncode(frame, minCodeSize)));
  });
  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}

// ── run ───────────────────────────────────────────────────────────────────
const stand = art.sceneFrameBufs('michael').front[0];
const rgbFrames = BEATS.map(([eyes]) => composeFrame(patchEyes(stand, eyes)));
const delays = BEATS.map(([, d]) => d);

const { palette, indexed } = quantise(rgbFrames);
const gif = buildGif(palette, indexed, delays);

const outPath = process.argv[2] || path.join(__dirname, 'ph-thumbnail-240.gif');
fs.writeFileSync(outPath, gif);
const secs = (delays.reduce((a, b) => a + b, 0) / 100).toFixed(1);
console.log(`wrote ${outPath}`);
console.log(`  ${W}x${H}  frames=${rgbFrames.length}  loop=${secs}s  colours=${palette.length}  ${(gif.length / 1024).toFixed(1)} KB`);

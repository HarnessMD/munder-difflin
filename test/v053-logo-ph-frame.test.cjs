'use strict';
// 0.5.3 (founder, 23 Sep 2026): the static frame of the Product Hunt thumbnail
// is the logo everywhere: top left of the app, the Dock, the installers.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.join(__dirname, '..');

function pngSize(buf) {
  assert.equal(buf.toString('latin1', 1, 4), 'PNG');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

test('the source frame is checked in and the generator reads it', () => {
  assert.deepEqual(pngSize(fs.readFileSync(path.join(root, 'docs/media/logo-source-240.png'))), [240, 240]);
  const gen = fs.readFileSync(path.join(root, 'tools/make-logo-from-ph.py'), 'utf8');
  assert.match(gen, /docs\/media\/logo-source-240\.png/);
  assert.match(gen, /Image\.NEAREST/);
});

test('every surface carries the new mark at the right size', () => {
  assert.deepEqual(pngSize(fs.readFileSync(path.join(root, 'docs/logo.png'))), [512, 512]);
  assert.deepEqual(pngSize(fs.readFileSync(path.join(root, 'docs/favicon-32.png'))), [32, 32]);
  assert.deepEqual(pngSize(fs.readFileSync(path.join(root, 'docs/apple-touch-icon.png'))), [180, 180]);
  const icns = fs.readFileSync(path.join(root, 'build/icon.icns'));
  assert.equal(icns.toString('latin1', 0, 4), 'icns');
  assert.ok(icns.includes(Buffer.from('ic10')), 'the 1024 Retina slot is present');
  const ico = fs.readFileSync(path.join(root, 'build/icon.ico'));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.ok(ico.readUInt16LE(4) >= 6, 'the Windows icon carries 16 to 256');
});

test('the 512 logo is the source frame scaled twice on the pixel grid', () => {
  // Decode both PNGs (8 bit RGB or RGBA, filter 0 to 4) and compare pixels.
  function decode(buf) {
    let o = 8, w, h, ct, idat = [];
    while (o < buf.length) {
      const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
      if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
      if (type === 'IDAT') idat.push(d);
      o += 12 + len;
    }
    const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp;
    const out = Buffer.alloc(h * stride);
    for (let y = 0; y < h; y++) {
      const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y ? out[(y - 1) * stride + x] : 0;
        const c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
        let v = line[x];
        if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
        else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        out[y * stride + x] = v & 255;
      }
    }
    return { w, h, bpp, px: (x, y) => [0, 1, 2].map((k) => out[(y * w + x) * bpp + k]).join() };
  }
  const src = decode(fs.readFileSync(path.join(root, 'docs/media/logo-source-240.png')));
  const logo = decode(fs.readFileSync(path.join(root, 'docs/logo.png')));
  // 480 art centred (16 px each side), anchored to the bottom (32 px of ground on top).
  for (const [x, y] of [[0, 0], [120, 120], [60, 200], [239, 239], [100, 30]]) {
    assert.equal(logo.px(16 + 2 * x, 32 + 2 * y), src.px(x, y), `pixel ${x},${y}`);
  }
  assert.equal(logo.px(0, 0), src.px(0, 0), 'the extra canvas is the thumbnail yellow');
});

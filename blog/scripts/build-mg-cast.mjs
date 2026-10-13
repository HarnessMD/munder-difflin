// node scripts/build-mg-cast.mjs
// Builds the blog scene kit's cast from the landing page, so the blog never redraws a character.
// Reads the .sp-<name> walk strips (72 by 32, 4 frames) and .pt-<name> portraits (18 by 28) out of docs/index.html,
// packs them into src/assets/mg/cast.png (one row per character: 4 walk frames, then the portrait),
// and rewrites the CAST table in src/assets/mg/kit.js (row, shoulder edges, sleeve, skin and outline colours for the arms).
// Run it again whenever the landing page cast changes.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, '../docs/index.html'), 'utf8');
const ORDER = ['michael', 'jim', 'pam', 'dwight', 'kevin', 'angela', 'oscar', 'stanley', 'phyllis', 'andy', 'kelly', 'ryan', 'toby', 'creed', 'meredith'];
const FW = 18, FH = 32, COLS = 5;

function decode(buf) {
  let o = 8, w = 0, h = 0; const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8), data = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 6 || data[12]) throw new Error('expected 8 bit RGBA, not interlaced'); }
    if (type === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * 4), bpl = w * 4;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (bpl + 1)], row = y * bpl;
    for (let x = 0; x < bpl; x++) {
      const v = raw[y * (bpl + 1) + 1 + x], a = x >= 4 ? px[row + x - 4] : 0, b = y ? px[row - bpl + x] : 0, c = x >= 4 && y ? px[row - bpl + x - 4] : 0;
      let pr = 0;
      if (f === 1) pr = a; else if (f === 2) pr = b; else if (f === 3) pr = (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[row + x] = (v + pr) & 255;
    }
  }
  return { w, h, px };
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function encode(px, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// The last rule for a class wins in the page, so the last match wins here.
const art = {};
for (const m of html.matchAll(/\.(sp|pt)-([a-z]+)\{background-image:url\(data:image\/png;base64,([A-Za-z0-9+/=]+)\)/g)) art[m[1] + '-' + m[2]] = decode(Buffer.from(m[3], 'base64'));

const W = FW * COLS, H = FH * ORDER.length, out = Buffer.alloc(W * H * 4);
const blit = (src, sx, sw, dx, dy) => { for (let y = 0; y < src.h; y++) for (let x = 0; x < sw; x++) src.px.copy(out, ((dy + y) * W + dx + x) * 4, (y * src.w + sx + x) * 4, (y * src.w + sx + x) * 4 + 4); };
const hex = (s, x, y) => { const i = (y * s.w + x) * 4; return '#' + [0, 1, 2].map((k) => s.px[i + k].toString(16).padStart(2, '0')).join('').toUpperCase(); };
const alpha = (s, x, y) => s.px[(y * s.w + x) * 4 + 3];
const table = {};
ORDER.forEach((name, row) => {
  const sp = art['sp-' + name], pt = art['pt-' + name];
  if (!sp || !pt) throw new Error('landing page has no sprite for ' + name);
  if (sp.w !== 72 || sp.h !== 32 || pt.w !== 18 || pt.h !== 28) throw new Error('unexpected sprite size for ' + name);
  for (let f = 0; f < 4; f++) blit(sp, f * FW, FW, f * FW, row * FH);
  blit(pt, 0, FW, 4 * FW, row * FH);
  // Shoulder row of frame 0: where an arm joins the body, and the colours it is drawn in.
  const Y = 19; let l = 0, r = FW - 1;
  while (l < FW && alpha(sp, l, Y) < 128) l++;
  while (r > 0 && alpha(sp, r, Y) < 128) r--;
  const tally = {};
  for (let y = 8; y <= 14; y++) for (let x = 5; x <= 12; x++) { const c = hex(sp, x, y); tally[c] = (tally[c] || 0) + 1; }
  const skin = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
  table[name] = [row, l, r, hex(sp, l + 1, Y), skin, hex(sp, l, Y)];
});
fs.mkdirSync(path.join(root, 'src/assets/mg'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/assets/mg/cast.png'), encode(out, W, H));

const kit = path.join(root, 'src/assets/mg/kit.js');
if (fs.existsSync(kit)) {
  const body = '\n' + ORDER.map((n) => `    ${n}: ${JSON.stringify(table[n])},`).join('\n') + '\n    ';
  const src = fs.readFileSync(kit, 'utf8'), next = src.replace(/(\/\*CAST:START\*\/)[\s\S]*?(\/\*CAST:END\*\/)/, `$1${body}$2`);
  if (next === src && !src.includes(body)) throw new Error('kit.js has no CAST markers');
  fs.writeFileSync(kit, next);
}
console.log(`cast.png ${W} by ${H}, ${ORDER.length} characters`);
console.log(table);

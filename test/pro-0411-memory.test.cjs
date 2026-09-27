// pro-0.4.11: pilot feedback on the Memory screen, items 9, 10 and 11.
//
// Item 9: "Make memory graph stop moving and make the nodes movable when users
// drag them, so that they can read clearly and give the option to zoom in and
// zoom out with gestures." The idle spin is gone, a drag on a node moves THAT
// NODE and pins it, a drag on the background pans, and the wheel, a pinch and
// two buttons zoom about the cursor or the centre.
//
// Item 10: a click on a node answers in the rail, and for an AGENT node the
// WHOSE MEMORY chip is selected too, so the topic list follows the click. A
// background click clears the selection.
//
// Item 11: nothing overflows a card in the rail: long paths and titles wrap or
// ellipsize, and the ellipsized ones carry the full text in a title.
//
// The moving parts (moveTo, anchorPan, clampZoom) are pure arithmetic in
// memoryLayout.ts, so the behaviour half of this file runs them directly; the
// structural half pins the wiring the founder can see.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ml = loadTs(`${PRO}/memoryLayout.ts`);
const screen = strip(read(`${PRO}/MemoryScreen.tsx`));

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const locale = (l) => new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))));

/* ---- 1. the arithmetic the still stage runs on ---------------------------- */

test('moveTo puts a node exactly under the pointer and holds its depth', () => {
  const p = { x: 120, y: -40, z: 80 };
  const [rot, tilt, w, h, zoom] = [0.3, 0.35, 800, 600, 1.2];
  const before = ml.project(p, rot, tilt, w, h, zoom);
  const moved = ml.moveTo(p, rot, tilt, w, h, zoom, 500, 250);
  const after = ml.project(moved, rot, tilt, w, h, zoom);
  assert.ok(Math.abs(after.sx - 500) < 1e-6 && Math.abs(after.sy - 250) < 1e-6, 'the node lands where it was dropped');
  assert.ok(Math.abs(after.z - before.z) < 1e-6, 'its depth does not change, so it stays the size it was');
  assert.ok(Math.abs(after.s - before.s) < 1e-9);
  // A no-op drag is a no-op: moving a node to where it already projects.
  const still = ml.moveTo(p, rot, tilt, w, h, zoom, before.sx, before.sy);
  for (const k of ['x', 'y', 'z']) assert.ok(Math.abs(still[k] - p[k]) < 1e-6, `${k} unchanged`);
});

test('the zoom clamps, and a corrupt value falls back to the fit zoom', () => {
  assert.ok(ml.ZOOM_MIN < 1 && ml.ZOOM_MAX > 1, 'both directions exist');
  assert.equal(ml.clampZoom(0.0001), ml.ZOOM_MIN);
  assert.equal(ml.clampZoom(999), ml.ZOOM_MAX);
  assert.equal(ml.clampZoom(1.5), 1.5);
  assert.equal(ml.clampZoom(Number.NaN), 1, 'NaN never reaches the projection');
});

test('anchorPan holds the point under the cursor still through a zoom', () => {
  // A projected offset q from the centre sits at q = Q * zoom + pan. Pick the
  // world offset Q that is exactly under the anchor, change the zoom, and the
  // anchored point must not move; every other point scales about it.
  const [panX, panY, from, to, ax, ay] = [30, -12, 0.8, 1.6, 140, -60];
  const Q = { x: (ax - panX) / from, y: (ay - panY) / from };
  const pan = ml.anchorPan(panX, panY, from, to, ax, ay);
  assert.ok(Math.abs(Q.x * to + pan.panX - ax) < 1e-9, 'the anchored x is still');
  assert.ok(Math.abs(Q.y * to + pan.panY - ay) < 1e-9, 'the anchored y is still');
  const centre = ml.anchorPan(panX, panY, from, to, 0, 0);
  assert.ok(Math.abs(centre.panX - panX * (to / from)) < 1e-9, 'a centre anchor scales the pan, which is what the buttons use');
});

/* ---- 2. item 9 on the screen: still, movable, zoomable -------------------- */

test('the idle spin is gone and nothing rotates the stage any more', () => {
  assert.ok(!screen.includes('SPIN'), 'the spin constant is deleted, not merely unused');
  assert.ok(!/s\.rot \+=|rot: s\.drag|tilt: s\.drag/.test(screen), 'no code path changes the view angle');
  assert.match(screen, /rot: 0, tilt: 0\.35,/, 'the view angle is fixed state, set once');
});

test('dragging a node moves that node and pins it; dragging the background pans', () => {
  assert.match(screen, /pins: new Map<string, P3>\(\)/, 'the pinned positions live beside the layout, keyed by node id');
  assert.match(screen, /s\.pins\.set\(d\.id, moveTo\(p3, s\.rot, s\.tilt, rect\.width, rect\.height, zoom, x \+ d\.dx - v\.panX, y \+ d\.dy - v\.panY\)\)/,
    'a node drag goes through the shared inverse projection, grab offset and pan respected');
  assert.match(screen, /const p3 = s\.pins\.get\(n\.id\) \?\? s\.layout\.get\(n\.id\) \?\? \{ x: 0, y: 0, z: 0 \};/,
    'the draw loop prefers the pin, so a dropped node stays where it was put');
  assert.match(screen, /s\.view\.panX = s\.panDrag\.panX \+ dx; s\.view\.panY = s\.panDrag\.panY \+ dy;/, 'the background drag pans the view');
  assert.match(screen, /> 3\) d\.moved = true;/, 'a 3px threshold tells a click from a drag');
});

test('the wheel and a pinch zoom about the cursor, natively, because React\'s wheel is passive', () => {
  assert.match(screen, /cv\.addEventListener\('wheel', onWheel, \{ passive: false \}\);/);
  assert.match(screen, /cv\.removeEventListener\('wheel', onWheel\);/, 'and the listener lets go with the loop');
  const wheel = screen.slice(screen.indexOf('const onWheel = (e: WheelEvent)'), screen.indexOf("cv.addEventListener('wheel'"));
  assert.match(wheel, /e\.preventDefault\(\);/, 'the pinch must not zoom the window');
  assert.match(wheel, /e\.ctrlKey \? 0\.01 : 0\.002/, 'a pinch (ctrl+wheel) is coarser than a scroll');
  assert.match(wheel, /clampZoom\(/);
  assert.match(wheel, /anchorPan\(v\.panX, v\.panY, v\.zoom, k2, e\.clientX - rect\.left - rect\.width \/ 2, e\.clientY - rect\.top - rect\.height \/ 2\)/,
    'the point under the cursor stays under the cursor');
});

test('the visible zoom controls: in, out, and a fit that resets the view', () => {
  assert.match(screen, /onClick=\{\(\) => zoomBy\(1\.25\)\} title=\{t\('pro\.memory\.zoomIn'\)\}/);
  assert.match(screen, /onClick=\{\(\) => zoomBy\(0\.8\)\} title=\{t\('pro\.memory\.zoomOut'\)\}/);
  assert.match(screen, /onClick=\{fitView\} title=\{t\('pro\.memory\.fitHint'\)\}>\{t\('pro\.memory\.fit'\)\}<\/Btn>/);
  assert.match(screen, /const zoomBy = \(f: number\) => \{ const v = st\.current\.view; v\.zoomTarget = clampZoom\(v\.zoomTarget \* f\); \};/,
    'the buttons propose a target and the loop eases toward it');
  assert.match(screen, /const fitView = \(\) => \{ const v = st\.current\.view; v\.zoom = 1; v\.zoomTarget = 1; v\.panX = 0; v\.panY = 0; \};/);
  assert.match(screen, /const next = reduced \? v\.zoomTarget : v\.zoom \+ \(v\.zoomTarget - v\.zoom\) \* 0\.25;/,
    'reduced motion turns the glide into a jump');
});

test('the legend and the aria stopped promising rotation', () => {
  const en = locale('en');
  for (const k of ['pro.memory.legendHint', 'pro.memory.graphAria']) {
    assert.ok(!/rotate/i.test(en.get(k)), `${k} still says rotate: ${en.get(k)}`);
  }
  assert.match(en.get('pro.memory.legendHint'), /zoom/i, 'the legend teaches the new gesture');
});

/* ---- 3. item 10: a node click answers in the rail, agents in the chips too - */

test('selecting an agent node selects that agent\'s WHOSE MEMORY chip; background clears', () => {
  assert.match(screen, /const selectNode = useCallback\(\(id: string \| null\) => \{/);
  assert.match(screen, /if \(id && nodeTypeOf\(id, agents\) === 'agent'\) setWhose\(id\);/, 'the chip follows the node, so the topic list follows the click');
  assert.match(screen, /onSelect=\{selectNode\} agents=\{agents\} \/>/, 'the stage selects through the wrapper');
  assert.match(screen, /if \(nd && !nd\.moved\) onSelect\(nd\.id !== sel \? nd\.id : null\);/);
  assert.match(screen, /else if \(pd && !pd\.moved\) onSelect\(null\);/, 'an empty background click clears the selection');
});

/* ---- 4. item 11: nothing escapes a card ----------------------------------- */

test('every ellipsized one-liner in the rail carries the full text in a title', () => {
  assert.match(screen, /<span title=\{a \? a\.name : h\.source\}/, 'the exact-hit header shrinks instead of pushing the card open');
  assert.match(screen, /<span title=\{h\.source\} style=\{\{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var\(--cth-font-mono\)' \}\}>\{h\.source\}<\/span>/,
    'the technical source path ellipsizes inside the hit row');
  assert.match(screen, /<b title=\{result\.title \|\| result\.subtitle\}/, 'the card title without a door still tells its full name');
  assert.match(screen, /<span title=\{result\.subtitle\}/, 'so does the id or path under it');
  assert.match(screen, /<b title=\{owner \? owner\.name : hit\.source\} style=\{\{ minWidth: 0,/, 'the hit card owner can shrink');
  assert.match(screen, /<span title=\{task\.id\}/, 'a ticket id is one line with the whole id on hover');
  assert.match(screen, /<span title=\{x\.label\}/, 'a topic row label too');
  assert.match(screen, /\{technical && <span title=\{pathOf\(x\)\}/, 'and the note path under it');
});

test('paths that wrap, wrap anywhere, so one long token cannot widen a card', () => {
  assert.match(screen, /overflowWrap: 'anywhere' \}\}>\{t\('pro\.memory\.fileLine'/, 'the deliverable line in the note sheet wraps');
  for (const line of screen.split('\n')) {
    if (!/WebkitLineClamp/.test(line)) continue;
    assert.match(line, /overflowWrap: 'anywhere'/, `a clamp with no break rule overflows on one long token: ${line.trim().slice(0, 90)}`);
  }
});

/* ---- 5. strings ----------------------------------------------------------- */

test('the new strings exist in the three locales, translated, with no dash', () => {
  const keys = ['pro.memory.legendHint', 'pro.memory.graphAria', 'pro.memory.zoomIn', 'pro.memory.zoomOut', 'pro.memory.fit', 'pro.memory.fitHint'];
  const dicts = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, locale(l)]));
  for (const k of keys) {
    for (const l of Object.keys(dicts)) assert.ok(dicts[l].has(k), `${k} in ${l}`);
    assert.ok(!/—|–| - /.test(dicts.en.get(k)), `${k} carries a dash: ${dicts.en.get(k)}`);
    for (const l of ['zh-CN', 'ar']) assert.notEqual(dicts[l].get(k), dicts.en.get(k), `${l}: ${k} is untranslated`);
  }
});

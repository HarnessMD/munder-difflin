// THE PUCK (Pro, 7 Sep 2026): a round window that floats above every app,
// with a ring of actions. The rules live in src/shared/puck.ts and are run
// here directly; the window, the sidebar row and the locales are pinned by
// reading their source, the way test/pro-nav.test.cjs pins the shell.
//
//   1. The config normaliser hands back something every reader can trust.
//   2. Geometry: corners, clamping, snapping, the window that holds the ring.
//   3. The ring: slots, footprint, and the rotation that keeps it on screen.
//   4. The capture region: remembered when it fits, centred when it does not.
//   5. Meetings: status settles from the parts; the transcript clock.
//   6. The window: a panel, screen saver level, every Space, click through,
//      content protection, and NOT one of the app's windows.
//   7. The sidebar row, the shell case, the admit handshake, the mic gate.
//   8. Every key the screens use exists in all three locales, no dash.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const loadTs = require('./load-ts.cjs');
const P = loadTs('src/shared/puck.ts');
const DASH = /[–—]|\s-\s/;

/* ---- 1. the normaliser ------------------------------------------------------ */

test('1. an empty or garbage config normalises to the defaults, and enabled is never assumed', () => {
  assert.deepEqual(P.normalizePuckConfig(undefined), P.DEFAULT_PUCK_CONFIG);
  assert.deepEqual(P.normalizePuckConfig(null), P.DEFAULT_PUCK_CONFIG);
  assert.deepEqual(P.normalizePuckConfig('nope'), P.DEFAULT_PUCK_CONFIG);
  assert.equal(P.DEFAULT_PUCK_CONFIG.enabled, false, 'the window exists only for a person who turned it on');
  assert.equal(P.normalizePuckConfig({ enabled: 'yes' }).enabled, false, 'only a real true turns it on');
});

test('1. numbers are clamped into their published range and unknown choices fall to the default', () => {
  const c = P.normalizePuckConfig({ size: 9999, opacity: -4, segmentMinutes: 'x', shape: 'blob', expression: 'grumpy', seed: 42, color: 'neon', corner: 'middle' });
  assert.equal(c.size, P.PUCK_SIZE.max);
  assert.equal(c.opacity, P.PUCK_OPACITY.min);
  assert.equal(c.segmentMinutes, P.PUCK_SEGMENT_MINUTES.default);
  assert.equal(c.shape, 'auto');
  assert.equal(c.expression, 'idle');
  assert.equal(c.seed, P.PUCK_DEFAULT_SEED, 'a seed that is not a string is the default word');
  assert.equal(c.color, '#FFC94F', 'an unknown colour is the default, the app\'s own yellow');
  assert.equal(P.DEFAULT_PUCK_CONFIG.color, P.PUCK_DEFAULT_COLOR);
  assert.equal(P.normalizePuckConfig({ color: '#3a7bd5' }).color, '#3A7BD5', 'any hex, upper cased');
  assert.equal(P.normalizePuckConfig({ color: ' abc ' }).color, '#AABBCC', 'three digits expand, spaces go');
  assert.equal(P.normalizePuckConfig({ color: '#12345' }).color, '#FFC94F', 'five digits is no colour');
  assert.equal(P.normalizePuckConfig({ color: 'cream' }).color, '#FFF8E7', 'the pastel build\'s off white survives as its hex');
  assert.equal(P.normalizePuckConfig({ color: 'yellow' }).color, '#FFC94F');
  assert.equal(P.normalizePuckConfig({ color: 'auto' }).color, '#FFC94F', 'the hue build\'s auto is the default now');
  assert.equal(P.normalizePuckConfig({ color: 'sky' }).color, '#4F9FAF', 'a hue from the build before lands on the swatch of that name');
  assert.equal(P.normalizePuckConfig({ color: 'violet' }).color, '#D9D3DE');
  for (const h of Object.values(P.LEGACY_COLOR)) assert.equal(P.normalizeHex(h), h, `legacy target ${h} is a normal hex`);
  assert.equal(c.corner, 'bottom-right');
  assert.equal(P.normalizePuckConfig({ size: 100.6 }).size, 101, 'sizes are whole pixels');
});

test('1. the seed is a trimmed word, never empty, never longer than the cap', () => {
  assert.equal(P.normalizePuckConfig({ seed: '  comet 42  ' }).seed, 'comet 42');
  assert.equal(P.normalizePuckConfig({ seed: '   ' }).seed, P.PUCK_DEFAULT_SEED, 'blank falls to the default');
  assert.equal(P.normalizePuckConfig({ seed: 'x'.repeat(500) }).seed.length, P.PUCK_SEED_MAX);
});

test('1. a config saved before the blobatar swap keeps its mood: the old face maps onto a pose', () => {
  for (const [face, pose] of Object.entries(P.LEGACY_FACE_EXPRESSION)) {
    assert.equal(P.normalizePuckConfig({ face }).expression, pose, `${face} → ${pose}`);
  }
  assert.equal(P.normalizePuckConfig({ face: 'cool', expression: 'sad' }).expression, 'sad', 'a real expression wins over the old face');
  assert.equal(P.normalizePuckConfig({ face: 'grumpy' }).expression, 'idle', 'an unknown old face is idle');
  assert.ok(!('face' in P.normalizePuckConfig({ face: 'calm' })), 'the old field is not kept');
  assert.equal(P.PUCK_EXPRESSIONS.length, 14, 'the fourteen poses blobatar 2 ships');
  assert.equal(P.PUCK_SHAPES.length, 11, 'auto plus the ten silhouettes');
});

test('1. a malformed position or region becomes null, never a window at NaN', () => {
  assert.equal(P.normalizePuckConfig({ position: { x: 'a', y: 1 } }).position, null);
  assert.deepEqual(P.normalizePuckConfig({ position: { x: 10.4, y: 20.6 } }).position, { x: 10, y: 21 });
  assert.equal(P.normalizePuckConfig({ captureRegion: { x: 0, y: 0, width: 2, height: 2 } }).captureRegion, null, 'a region smaller than 8px is noise');
  const r = P.normalizePuckConfig({ captureRegion: { x: 1, y: 2, width: 300, height: 200, displayId: 7 } }).captureRegion;
  assert.deepEqual(r, { x: 1, y: 2, width: 300, height: 200, displayId: null }, 'a non string display id reads as unknown');
});

test('1. actions default on, computerUse included as a DISABLED button, and only false turns one off', () => {
  const c = P.normalizePuckConfig({ actions: { screenshot: false, meeting: 0, computerUse: 'off' } });
  assert.equal(c.actions.screenshot, false);
  assert.equal(c.actions.meeting, true, 'only false is off');
  assert.equal(c.actions.computerUse, true, 'the string is not false');
  assert.deepEqual(Object.keys(c.actions), [...P.PUCK_ACTIONS]);
  const puck = read('src/renderer/src/puck/PuckApp.tsx');
  assert.match(puck, /slot\.action === 'computerUse' \|\|/, 'the ring draws computer use disabled, always');
  assert.match(puck, /case 'computerUse': break;/, 'and clicking it does nothing');
});

/* ---- 2. geometry ------------------------------------------------------------ */

const AREA = { x: 0, y: 25, width: 1440, height: 875 };

test('2. the four corners keep the disc a margin off the edge', () => {
  const m = P.CORNER_MARGIN + 40;
  assert.deepEqual(P.cornerPosition('bottom-right', AREA, 80), { x: 1440 - m, y: 25 + 875 - m });
  assert.deepEqual(P.cornerPosition('top-left', AREA, 80), { x: m, y: 25 + m });
  assert.deepEqual(P.cornerPosition('top-right', AREA, 80), { x: 1440 - m, y: 25 + m });
  assert.deepEqual(P.cornerPosition('bottom-left', AREA, 80), { x: m, y: 25 + 875 - m });
});

test('2. the disc is clamped to the display; the ring may hang off, the disc may not', () => {
  assert.deepEqual(P.clampCentre({ x: -500, y: -500 }, AREA, 80), { x: 40, y: 65 });
  assert.deepEqual(P.clampCentre({ x: 9000, y: 9000 }, AREA, 80), { x: 1400, y: 860 });
  assert.deepEqual(P.clampCentre({ x: 700, y: 400 }, AREA, 80), { x: 700, y: 400 });
});

test('2. snapping moves ONE axis to the nearest edge, and only when close', () => {
  // Near the right edge: x snaps, y stays.
  assert.deepEqual(P.snapToEdge({ x: 1380, y: 400 }, AREA, 80), { x: 1440 - P.SNAP_MARGIN - 40, y: 400 });
  // Near the top: y snaps.
  assert.deepEqual(P.snapToEdge({ x: 700, y: 90 }, AREA, 80), { x: 700, y: 25 + P.SNAP_MARGIN + 40 });
  // In the middle: untouched.
  assert.deepEqual(P.snapToEdge({ x: 700, y: 450 }, AREA, 80), { x: 700, y: 450 });
});

test('2. windowFor: the window stays on the display and the offset carries what the clamp took', () => {
  const side = P.ringFootprint(80);
  const mid = P.windowFor({ x: 700, y: 450 }, AREA, 80);
  assert.deepEqual(mid.window, { x: 700 - side / 2, y: 450 - side / 2, width: side, height: side });
  assert.deepEqual(mid.offset, { x: side / 2, y: side / 2 }, 'a disc in the open sits at the window centre');
  const edge = P.windowFor({ x: 1400, y: 860 }, AREA, 80);
  assert.equal(edge.window.x + edge.window.width, 1440, 'the window stops at the right edge');
  assert.equal(edge.window.y + edge.window.height, 900, 'and at the bottom');
  assert.deepEqual({ x: edge.window.x + edge.offset.x, y: edge.window.y + edge.offset.y }, { x: 1400, y: 860 }, 'the disc still sits where the hand put it');
});

/* ---- 3. the ring ------------------------------------------------------------ */

const ACTIONS = P.DEFAULT_PUCK_CONFIG.actions;
const OPEN = { left: 1000, right: 1000, top: 1000, bottom: 1000 };
/** Neighbouring buttons keep RING.gap of air between them. */
function assertApart(layout, size) {
  const min = size * (P.RING.button + P.RING.gap) - 1;
  for (let i = 1; i < layout.slots.length; i++) {
    const a = layout.slots[i - 1]; const b = layout.slots[i];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    assert.ok(d >= min, `${a.action} and ${b.action} are ${d.toFixed(0)}px apart, under ${min.toFixed(0)}`);
  }
}

/** Every label's box is clear of every other button and every other label. */
function assertLabelsClear(L, size) {
  const boxes = L.slots.map((s) => ({ s, b: P.ringBox(s.angle, L.radius, size, s.label).label }));
  const bh = (size * P.RING.button) / 2;
  const apart = (a, b) => a.x1 <= b.x0 || a.x0 >= b.x1 || a.y1 <= b.y0 || a.y0 >= b.y1;
  for (const { s, b } of boxes) {
    for (const o of L.slots) {
      if (o === s) continue;
      assert.ok(apart(b, { x0: o.x - bh, x1: o.x + bh, y0: o.y - bh, y1: o.y + bh }), `${s.action}'s label is clear of ${o.action}'s button`);
    }
    for (const { s: o, b: ob } of boxes) {
      if (o === s) continue;
      assert.ok(apart(b, ob), `${s.action}'s label is clear of ${o.action}'s label`);
    }
  }
}

test('3. in the open the ring is the full circle at the ring radius, in ring order, with the close control below', () => {
  const L = P.ringLayout(ACTIONS, 100, OPEN);
  assert.equal(L.fan, null);
  assert.equal(L.radius, 100 * P.RING.radius);
  assert.deepEqual(L.slots.map((s) => s.action), ['screenshot', 'meeting', 'invisible', 'computerUse', 'message']);
  for (const s of L.slots) assert.ok(Math.abs(Math.hypot(s.x, s.y) - L.radius) < 1.5, `${s.action} is at radius ${Math.hypot(s.x, s.y)}`);
  assert.deepEqual(L.slots[0], { action: 'screenshot', angle: 0, x: 0, y: -110, label: { mode: 'beside', side: 'up' } }, 'screenshot is straight up, its label above');
  assert.deepEqual(L.slots[1].label, { mode: 'beside', side: 'right' }, 'a circle label sits beside its button');
  assert.deepEqual(L.close, { x: 0, y: 100 }, 'close straight below, nearer than the buttons');
  assert.ok(P.RING.radius <= 1.15, `the ring hugs the disc (radius ${P.RING.radius}); the first build sat at 1.4`);
  assertApart(L, 100);
  const two = P.ringLayout({ ...ACTIONS, screenshot: false, computerUse: false, invisible: false }, 100, OPEN);
  assert.deepEqual(two.slots.map((s) => s.action), ['meeting', 'message']);
});

test('3. a window in the open gives every side half a footprint, and that room fits the circle', () => {
  const size = 80;
  const half = P.ringFootprint(size) / 2;
  assert.equal(P.ringLayout(ACTIONS, size, { left: half, right: half, top: half, bottom: half }).fan, null);
});

test('3. against the right edge the ring fans out on the left: every button and label inside, screenshot in the middle', () => {
  const size = 80;
  const room = { left: 600, right: P.SNAP_MARGIN + size / 2, top: 600, bottom: 600 };
  const L = P.ringLayout(ACTIONS, size, room);
  assert.ok(L.fan, 'a fan, not the circle');
  assert.equal(L.slots.length, 5, 'nothing is dropped');
  assert.equal(L.close, null, 'a fan has no close control');
  const half = (size * P.RING.button) / 2 + P.RING.pad;
  for (const s of L.slots) {
    assert.ok(P.ringFits(s.angle, L.radius, size, room, s.label), `${s.action} at ${s.angle} fits, label included`);
    assert.ok(s.x + half <= room.right, `${s.action} does not cross the edge`);
  }
  const meanX = L.slots.reduce((a, s) => a + s.x, 0) / L.slots.length;
  assert.ok(meanX < -0.35 * L.radius, `the fan points away from the edge (mean x ${meanX.toFixed(0)} at radius ${L.radius})`);
  assert.ok(L.slots.every((s) => s.x <= 0.15 * L.radius), 'no button reaches past the disc towards the edge');
  assert.equal(L.radius, size * P.RING.radius, 'no wider than the circle: half a screen is room enough');
  assert.ok(L.slots.every((s) => s.label.mode === 'radial' && s.label.align !== 'right'), 'no fan label reaches back towards the edge');
  assert.equal(L.slots[2].label.align, 'left', 'the middle label extends away from the edge');
  assertLabelsClear(L, size);
  assert.equal(L.slots[2].action, 'screenshot', 'the most used action in the middle');
  assert.ok(Math.abs(L.slots[2].angle - 270) < 6, `pointing straight away (${L.slots[2].angle})`);
  assertApart(L, size);
  // The same story on the left edge, mirrored, and top and bottom. A fan's
  // end buttons may lean a few degrees past straight up or down towards the
  // edge, because they still fit there; none reaches past the disc.
  const lean = 0.15 * size * P.RING.radius;
  const R = P.ringLayout(ACTIONS, size, { ...room, left: room.right, right: 600 });
  assert.ok(R.fan && R.slots.every((s) => s.x > -lean), 'left edge: every button to the right');
  assert.ok(R.slots.every((s) => s.label.mode === 'radial' && s.label.align !== 'left'), 'left edge: no label reaches back towards the edge');
  assertLabelsClear(R, size);
  const D = P.ringLayout(ACTIONS, size, { ...OPEN, top: P.SNAP_MARGIN + size / 2 });
  assert.ok(D.fan && D.slots.every((s) => s.y > -lean), 'top edge: every button below');
  const U = P.ringLayout(ACTIONS, size, { ...OPEN, bottom: P.SNAP_MARGIN + size / 2 });
  assert.ok(U.fan && U.slots.every((s) => s.y < lean), 'bottom edge: every button above');
  assert.ok(U.slots.some((s) => s.label.mode === 'radial' && s.label.align === 'left') && U.slots.some((s) => s.label.align === 'right'), 'an upright fan spreads its labels both ways');
});

test('3. in a corner the fan faces the open quadrant, widening only as far as its buttons need', () => {
  const size = 80;
  const m = P.CORNER_MARGIN + size / 2;
  const room = { left: 900, right: m, top: 900, bottom: m };
  const L = P.ringLayout(ACTIONS, size, room);
  assert.ok(L.fan);
  assert.equal(L.slots.length, 5);
  for (const s of L.slots) assert.ok(P.ringFits(s.angle, L.radius, size, room, s.label), `${s.action} at ${s.angle} fits`);
  assert.ok(L.radius >= size * P.RING.radius && L.radius <= size * P.RING.maxRadius, `radius ${L.radius}`);
  // Five buttons and five readable labels on a quarter of a screen need
  // about half a disc more than the circle; the widening stops at the first
  // radius where the buttons clear each other.
  assert.ok(L.radius <= size * 1.5, `it widens to what the corner needs (${L.radius}px) and no further`);
  assert.ok(L.radius > size * P.RING.radius, 'and it did have to widen');
  assert.ok(L.slots.every((s) => s.x <= 0.45 * L.radius && s.y <= 0.45 * L.radius), 'up and to the left');
  assertApart(L, size);
  assertLabelsClear(L, size);
  // The other three corners, the same.
  for (const [name, r] of [['bottom left', { left: m, right: 900, top: 900, bottom: m }], ['top right', { left: 900, right: m, top: m, bottom: 900 }], ['top left', { left: m, right: 900, top: m, bottom: 900 }]]) {
    const C = P.ringLayout(ACTIONS, size, r);
    assert.ok(C.fan && C.slots.length === 5, `${name}: a fan of five`);
    for (const s of C.slots) assert.ok(P.ringFits(s.angle, C.radius, size, r, s.label), `${name}: ${s.action} fits`);
    assertApart(C, size);
    assertLabelsClear(C, size);
  }
  // The circle in the open stays at the plain radius: widening is for fans.
  assert.equal(P.ringLayout(ACTIONS, size, OPEN).radius, size * P.RING.radius);
});

test('3. Computer use, drawn disabled, takes the low end of a sideways fan and the left end of an upright one', () => {
  const size = 80;
  const edge = P.SNAP_MARGIN + size / 2;
  const lowest = (L) => L.slots.reduce((a, s) => (s.y > a.y ? s : a));
  const leftmost = (L) => L.slots.reduce((a, s) => (s.x < a.x ? s : a));
  assert.equal(lowest(P.ringLayout(ACTIONS, size, { ...OPEN, right: edge })).action, 'computerUse', 'fan to the left');
  assert.equal(lowest(P.ringLayout(ACTIONS, size, { ...OPEN, left: edge })).action, 'computerUse', 'fan to the right');
  assert.equal(leftmost(P.ringLayout(ACTIONS, size, { ...OPEN, bottom: edge })).action, 'computerUse', 'fan upward');
  assert.equal(leftmost(P.ringLayout(ACTIONS, size, { ...OPEN, top: edge })).action, 'computerUse', 'fan downward');
});

test('3. labels sit beside a sideways button and above or below an upright one', () => {
  assert.equal(P.labelSide(0), 'up');
  assert.equal(P.labelSide(60), 'right');
  assert.equal(P.labelSide(130), 'right');
  assert.equal(P.labelSide(180), 'down');
  assert.equal(P.labelSide(230), 'left');
  assert.equal(P.labelSide(300), 'left');
  // A label counts as part of the button when asking whether it fits.
  const size = 80;
  const r = size * P.RING.radius;
  const tight = { left: 600, right: Math.ceil(Math.sin(Math.PI / 3) * r + (size * P.RING.button) / 2 + P.RING.pad + 8), top: 600, bottom: 600 };
  assert.ok(!P.ringFits(60, r, size, tight), 'a right hand button whose label would be cut off does not fit');
  assert.ok(P.ringFits(60, r, size, { ...tight, right: tight.right + P.RING.label }), 'with room for the label it does');
});

test('3. the footprint holds the disc, the widest fan, a button and a label on every side', () => {
  const side = P.ringFootprint(80);
  assert.ok(side >= 80 + 2 * (80 * P.RING.maxRadius + (80 * P.RING.button) / 2 + P.RING.label));
  assert.ok(P.ringFootprint(160) > P.ringFootprint(48), 'it scales with the size');
});

/* ---- 4. the capture region ---------------------------------------------------- */

test('4. the remembered region is replayed on its own display and centred elsewhere', () => {
  const saved = { x: 100, y: 100, width: 400, height: 300, displayId: '2' };
  assert.deepEqual(P.initialRegion(saved, { id: '2', width: 1440, height: 900 }), { x: 100, y: 100, width: 400, height: 300 });
  const other = P.initialRegion(saved, { id: '9', width: 1200, height: 600 });
  assert.deepEqual(other, { x: 400, y: 200, width: 400, height: 200 }, 'a third of the display, centred');
  assert.deepEqual(P.initialRegion(null, { id: '1', width: 900, height: 600 }), { x: 300, y: 200, width: 300, height: 200 });
  // Saved on an unknown display: treated as portable.
  assert.deepEqual(P.initialRegion({ ...saved, displayId: null }, { id: '9', width: 1440, height: 900 }), { x: 100, y: 100, width: 400, height: 300 });
});

test('4. clampRegion shrinks before it moves and never goes below the minimum', () => {
  assert.deepEqual(P.clampRegion({ x: 1300, y: 800, width: 400, height: 300 }, 1440, 900), { x: 1040, y: 600, width: 400, height: 300 });
  assert.deepEqual(P.clampRegion({ x: 0, y: 0, width: 5000, height: 5000 }, 1440, 900), { x: 0, y: 0, width: 1440, height: 900 });
  assert.deepEqual(P.clampRegion({ x: 10, y: 10, width: 1, height: 1 }, 1440, 900), { x: 10, y: 10, width: P.REGION_MIN, height: P.REGION_MIN });
});

/* ---- 5. meetings ----------------------------------------------------------------- */

test('5. a meeting settles from its parts: recording until ended, done when every part is transcribed', () => {
  const seg = (n, transcribed, error = null) => ({ seq: n, file: `seg-${n}.webm`, startMs: 0, durationMs: 1000, transcribed, error });
  assert.equal(P.settleMeetingStatus({ endedAt: null, segments: [] }), 'recording');
  assert.equal(P.settleMeetingStatus({ endedAt: 'x', segments: [] }), 'failed', 'ended with nothing recorded');
  assert.equal(P.settleMeetingStatus({ endedAt: 'x', segments: [seg(0, true), seg(1, true)] }), 'done');
  assert.equal(P.settleMeetingStatus({ endedAt: 'x', segments: [seg(0, true), seg(1, false)] }), 'pending');
  assert.equal(P.settleMeetingStatus({ endedAt: 'x', segments: [seg(0, true), seg(1, false, 'Groq 401')] }), 'failed');
});

test('5. the transcript clock reads mm:ss under an hour and hh:mm:ss past it', () => {
  assert.equal(P.clockOf(0), '00:00');
  assert.equal(P.clockOf(65_000), '01:05');
  assert.equal(P.clockOf(3_600_000 + 61_000), '01:01:01');
  assert.equal(P.clockOf(-5), '00:00');
});

test('5. a meeting id sorts by time and is a safe folder name', () => {
  const id = P.meetingIdFor(new Date('2026-09-07T10:32:05.123Z'));
  assert.equal(id, '2026-09-07_10-32-05');
  assert.match(id, /^[0-9_\-]+$/);
});

/* ---- 6. the window ------------------------------------------------------------------ */

test('6. the puck is a panel at the screen saver level on every Space, click through, and never one of the app windows', () => {
  const main = read('src/main/puck.ts');
  assert.match(main, /return \{ type: 'panel' \}/, 'macOS: an NSPanel, which floats over full screen apps and does not activate the app');
  assert.match(main, /setAlwaysOnTop\(onTop \|\| capturing, 'screen-saver', capturing \? 3 : 1\)/, 'level 1 in the ordinary way; above the capture overlay only while one is up (0.5.2)');
  assert.match(main, /setVisibleOnAllWorkspaces\(onTop \|\| capturing, \{ visibleOnFullScreen: true/);
  assert.match(main, /w\.on\('blur', \(\) => \{ if \(!w\.isDestroyed\(\)\) raise\(w, cfgOf\(\)\.alwaysOnTop\); \}\)/, 'the level is re-asserted on blur');
  assert.match(main, /setIgnoreMouseEvents\(true, \{ forward: true \}\)/, 'the transparent part is click through');
  assert.match(main, /setContentProtection\(on\)/, 'invisible to a meeting is content protection');
  assert.match(main, /transparent: true/);
  assert.match(main, /nodeIntegration: false/);
  assert.match(main, /sandbox: true/);
  assert.match(main, /showInactive\(\)/, 'showing the puck never steals focus');
  const index = read('src/main/index.ts');
  assert.ok(!/allWindows\.add\(.*puck/i.test(index), 'the puck is not in allWindows');
  assert.ok(!/allWindows/.test(strip(main)), 'main/puck.ts never touches allWindows (the header may name it; the code may not)');
  // The Dock click brings a closed main window back while the puck lives: the
  // handler counts the app's own registry, never every BrowserWindow (0.5.2;
  // with the puck counted, `getAllWindows().length === 0` was never true again).
  assert.match(index, /app\.on\('activate', \(\) => \{\s*if \(allWindows\.size === 0\) createWindow\(\);\s*\}\);/, 'activate counts allWindows, the primary and the floors');
  assert.ok(!/app\.on\('activate'[\s\S]{0,200}getAllWindows/.test(index), 'activate never asks BrowserWindow.getAllWindows, which counts the puck');
});

test('6. the window exists only when the config is on AND a Pro shell admitted it', () => {
  const main = strip(read('src/main/puck.ts'));
  assert.match(main, /const want = admitted && cfg\.enabled;/);
  assert.match(main, /if \(want && !win\) createWindow\(cfg\);/);
  assert.match(main, /if \(!want && win\) \{ destroyWindow\(\); return; \}/);
  const shell = read('src/renderer/src/components/pro/ProShell.tsx');
  assert.match(shell, /void window\.cth\.puckAdmit\?\.\(true\);/);
  assert.match(shell, /return \(\) => \{ void window\.cth\.puckAdmit\?\.\(false\); \};/, 'unmount withdraws the puck');
});

test('6. the screenshot leaves as a PATH in a hive message, never as bytes; a path outside the puck folder is refused', () => {
  const main = strip(read('src/main/puck.ts'));
  // 0.5.2: the recipient is resolved rather than named, so a capture can be
  // aimed at one agent; the message is still a path and never bytes.
  // 0.5.3: the target is resolved ONCE into `to`, so the agent that is told and
  // the agent the toast names are the same one. Still captureTarget's answer.
  assert.match(main, /const to = captureTarget\(\);\s*const msg = deps\.hiveSend\(\{ to, act: 'request', subject: first, body: lines\.join\('\\n'\) \}, 'human'\)/);
  assert.match(main, /return resolveResponder\(cfgOf\(\)\.sendTo, ids, 'god'\);/, 'and an agent that is not running falls back to the orchestrator');
  // 0.5.3 (I6): several pictures, each path through the same check.
  assert.match(main, /const shots = \[\.\.\.new Set\(asked\.map\(underPuck\)/);
  assert.ok(!/readFileSync\(s[,)]/.test(main), 'no picture\'s bytes enter the message');
  assert.match(main, /const transcript = underPuck\(a\.transcript\);/);
  assert.match(main, /return abs === root \|\| abs\.startsWith\(root \+ sep\) \? abs : null;/);
  assert.ok(!/readFileSync\(shot/.test(main), 'the image bytes never enter the message');
  const html = read('src/renderer/puck.html');
  assert.match(html, /connect-src 'self';/, 'the puck page can reach no network host');
  assert.ok(!/api\.groq\.com|openai\.com/.test(html));
});

test('6. transcription needs an engine and the puck opens the mic gate only while recording', () => {
  // 0.5.3, F16: the router decides whether anything can transcribe (a local
  // engine or a Groq key); the puck asks canTranscribe() and never reads the key itself.
  const main = strip(read('src/main/puck.ts'));
  assert.match(main, /if \(!canTranscribe\(\)\) return; \/\/ stays pending/, 'a segment with no engine stays pending, no network');
  assert.match(main, /if \(!canTranscribe\(\)\) return \{ ok: false, error: 'no transcription engine' \};/, 'a message cannot start without an engine');
  assert.match(main, /micLive = true;/);
  assert.match(main, /micLive = false;/);
  const index = strip(read('src/main/index.ts'));
  assert.match(index, /cfg\.realtimeVoiceEnabled === true \|\| puckMicLive\(\);/, 'the session mic gate reads the puck flag');
  assert.match(index, /registerPuck\(\{/);
  assert.match(index, /transcribe: \(opts\) => getTranscribeRouter\(\)\.transcribe\(\{ \.\.\.opts, mode: opts\.mode \?\? 'meeting' \}\),/, 'the one router, not a second transcriber');
  assert.match(index, /canTranscribe: \(\) => getTranscribeRouter\(\)\.canTranscribe\('meeting'\),/);
});

test('6. the config write merges a partial onto the saved puck and normalises', () => {
  const cfg = strip(read('src/main/config.ts'));
  assert.match(cfg, /next\.puck = normalizePuckConfig\(\{ \.\.\.prev, \.\.\.add \}\);/);
  for (const f of ['src/main/config.ts', 'src/preload/index.ts', 'src/renderer/src/store/config.ts']) {
    assert.match(read(f), /puck\?: (Partial<)?PuckConfig>?;/, `${f} mirrors the puck field`);
  }
});

/* ---- 7. the shell -------------------------------------------------------------------- */

test('7. puck is a sidebar row with an icon and a screen, and the vite build emits its two pages', () => {
  const nav = loadTs('src/renderer/src/components/pro/proNav.ts');
  assert.ok(nav.PRO_SCREENS.includes('puck'));
  assert.equal(nav.isProScreen('puck'), true);
  assert.match(read('src/renderer/src/components/pro/ProShell.tsx'), /case 'puck': return <PuckScreen config=\{config\} \/>;/);
  assert.match(read('src/renderer/src/components/pro/ProSidebar.tsx'), /puck: 'puck'/);
  const vite = read('electron.vite.config.ts');
  assert.match(vite, /puck: resolve\(__dirname, 'src\/renderer\/puck\.html'\)/);
  assert.match(vite, /capture: resolve\(__dirname, 'src\/renderer\/capture\.html'\)/);
  assert.ok(fs.existsSync(path.join(ROOT, 'src/renderer/puck.html')));
  assert.ok(fs.existsSync(path.join(ROOT, 'src/renderer/capture.html')));
});

test('7. the Puck screen saves as it goes through updateConfig and reads the truth from main', () => {
  const screen = strip(read('src/renderer/src/components/pro/PuckScreen.tsx'));
  assert.match(screen, /window\.cth\.updateConfig\(\{ puck: patch \}\)/);
  assert.match(screen, /window\.cth\.puckState\(\)\.then\(setState\)/);
  assert.match(screen, /return window\.cth\.onPuckState\(setState\);/);
  assert.ok(!/Save changes|saveChanges/i.test(screen), 'no save button: every change is saved as it is made');
  // The remembered region is the capture overlay's opening box.
  assert.match(read('src/main/puck.ts'), /initialRegion\(cfg\.captureRegion,/);
  assert.match(read('src/main/puck.ts'), /captureRegion: \{ \.\.\.rect, displayId: String\(display\.id\) \}/, 'a capture remembers its box');
});

test('7. the recorder rolls a meeting into fresh files and caps a message', () => {
  const rec = strip(read('src/renderer/src/puck/recorder.ts'));
  assert.match(rec, /seq \+= 1;\s*startSegment\(\);\s*arm\(\);/, 'after a segment, a new MediaRecorder starts on the same stream');
  assert.match(rec, /mode\.kind === 'meeting' \? mode\.segmentMs : PUCK_MESSAGE_SEGMENT\.maxMs/, 'a meeting rolls on its interval, a message part at its longest run');
  assert.match(rec, /capTimer = setTimeout\(\(\) => \{ void stop\(\); \}, PUCK_MESSAGE_MAX_SECONDS \* 1000\)/, 'the whole message stops at the cap');
  assert.match(rec, /now - segmentStartedAt >= PUCK_MESSAGE_SEGMENT\.minMs && now - quietSince >= PUCK_MESSAGE_SEGMENT\.pauseMs\) roll\(\)/, 'a message part rolls at a pause, never before minMs');
  assert.match(rec, /const final = finalResolve !== null;/, 'only a stop makes a part the last one; a message rolls like a meeting');
  const app = strip(read('src/renderer/src/puck/PuckApp.tsx'));
  assert.match(app, /puckMeetingSegment\(\{ meetingId, seq: info\.seq, audio: clip\.audio/);
  assert.match(app, /if \(final && track === 'you'\) await window\.cth\.puckMeetingStop\(\{ meetingId \}\);/);
});

// The note card (founder, 7 Sep 2026): its field must not hang off the card,
// a screenshot's card has the same field as a spoken message's, and a mic in
// the card adds spoken words to the note being written, for a screenshot too.
test('7. the note card: the field fits, a screenshot gets a note, and the mic dictates into it', () => {
  const css = read('src/renderer/src/puck/puck.css');
  assert.match(css, /\.puck-card textarea \{[^}]*box-sizing: border-box/, 'the field is a border box, so 100% is the card\'s width');
  const app = strip(read('src/renderer/src/puck/PuckApp.tsx'));
  assert.match(app, /case 'message': dictate\(\); break;/, 'the ring\'s Record message is the same mic as the card\'s');
  assert.match(app, /const card: Compose = \{ kind: 'message', text: '' \};\s*composeRef\.current = card;\s*setCompose\(card\);/, 'speaking with no card open opens one at once, so the words have somewhere to appear');
  assert.match(app, /: await window\.cth\.puckMessageSegment\(\{ audio: clip\.audio, mimeType: clip\.mimeType \}\);/, 'every part is written down as it lands');
  assert.match(app, /if \(out\.ok\) \{ if \(final\) lastClip\.current = null; setNote\(\(n\) => join\(n, out\.text\)\); \}/, 'and joins the note');
  assert.match(app, /if \(final\) await window\.cth\.puckMessageStop\(\{ audio: new ArrayBuffer\(0\)/, 'a card closed mid dictation drops the words and still clears main');
  assert.match(app, /data-dictate[\s\S]*name=\{listening \? 'stop' : 'mic'\}/, 'one button: mic to start, stop to finish (stopped from the click, 25 Sep 2026)');
  assert.match(app, /disabled=\{busy !== null \|\| \(!st\.canTranscribe && !dictating\)\}/, 'no key, no mic, but a running dictation can always be stopped');
  const card = app.slice(app.indexOf('{compose && cardVisible && ('), app.indexOf('{/* A short notice'));
  assert.match(card, /<textarea/, 'the card has the field whatever it carries');
  assert.ok(card.indexOf('<textarea') > card.indexOf("compose.kind === 'screenshot' && <img"), 'the picture, then the field under it');
});

// While a recording runs (founder, 7 Sep 2026): the card stays open with
// the words arriving, a click on the disc still opens the ring with Stop and
// Leave invisible, and a meeting shows its transcript growing part by part.
test('7. while recording, the ring opens over the card, and a meeting has a transcript card', () => {
  const app = strip(read('src/renderer/src/puck/PuckApp.tsx'));
  assert.match(app, /const showRing = st\.menuOpen && !st\.capturing && \(!compose \|\| st\.recording !== null\);/, 'the ring is not folded by a card during a recording');
  assert.match(app, /if \(e\.button !== 0 \|\| \(compose && !st\.recording\)\) return;/, 'the disc takes the click while recording even with a card open');
  assert.match(app, /const avoid = showRing && st\.recording && layout \? ringExtent\(layout, size\) : null;/, 'the card moves clear of the open ring');
  assert.match(app, /const card: Compose = \{ kind: 'meeting', meetingId \};/, 'a meeting opens its transcript card');
  assert.match(app, /puckMeetingTranscript\(\{ id: meetingId \}\)/, 'read from main');
  assert.match(app, /\}, \[meetingId, written\]\);/, 'and read again each time another part is written down');
  assert.match(app, /readOnly[\s\S]*value=\{transcript\}/, 'shown read only');
  assert.match(app, /t\('pro\.puck\.card\.hide'\)[\s\S]*data-stop/, 'Hide puts the card away, Stop ends the meeting');
  // Quiet starts (founder, 7 Sep 2026): a recording begun from the ring
  // keeps its card away until the creature is clicked again; one begun from
  // an open card stays in view. And a spoken message can take a picture.
  assert.match(app, /const cardVisible = compose !== null && !ringTake && \(!quiet \|\| !st\.recording \|\| st\.menuOpen\);/, 'a quiet card shows only with the ring, and always once the recording ended');
  assert.equal((app.match(/setQuiet\(true\)/g) || []).length, 2, 'quiet on the two ring starts: a meeting, a message with no card open');
  assert.match(app, /useEffect\(\(\) => \{ if \(!st\.recording\) setQuiet\(false\); \}, \[st\.recording\]\);/, 'and never after the recording ends');
  assert.match(app, /\{compose && cardVisible && \(/, 'the card is drawn only when visible');
  assert.match(app, /const wantMouse = hover \|\| dragging \|\| st\.menuOpen \|\| cardVisible \|\| flash !== null \|\| st\.capturing \|\| ringTake;/, 'a hidden card claims no mouse; a capture in progress does (0.5.2, the buttons are here), and so does a ring take (its Done and Cancel, 0.5.3)');
  assert.match(app, /\(compose\.kind === 'message' \|\| compose\.kind === 'screenshot'\) && \([\s\S]*data-shot[\s\S]*onClick=\{\(\) => \{ void screenshot\(\); \}\}/, 'the message card has a Screenshot button, and a screenshot card another (I6)');
  assert.match(app, /if \(prev\?\.kind !== 'message' && prev\?\.kind !== 'screenshot'\) setNote\(''\);\s*setQuiet\(false\);/, 'a picture keeps the words already spoken, and the card stays in view');
  // The card's place, clear of the ring: pure geometry, tried for real.
  const size = 80;
  const side = P.ringFootprint(size);
  const rec = { screenshot: false, message: false, meeting: true, invisible: true, computerUse: false };
  const box = { w: 292, h: 210 };
  const clear = (c, ext) => c.left + box.w <= ext.x0 || c.left >= ext.x1 || c.top + box.h <= ext.y0 || c.top >= ext.y1;
  const inside = (c) => c.left >= 8 && c.top >= 8 && c.left + box.w <= side - 8 && c.top + box.h <= side - 8;
  // In the open: the two recording buttons sit to the right of the disc, so the card goes left.
  const open = { cx: side / 2, cy: side / 2, size };
  const lay = P.ringLayout(rec, size, { left: open.cx, right: side - open.cx, top: open.cy, bottom: side - open.cy });
  const ext = P.ringExtent(lay, size);
  const abs = { x0: open.cx + ext.x0, x1: open.cx + ext.x1, y0: open.cy + ext.y0, y1: open.cy + ext.y1 };
  const c = P.placeCard(box, side, open, ext);
  assert.ok(inside(c), 'inside the window');
  assert.ok(clear(c, abs), `clear of the ring: card ${JSON.stringify(c)} ring ${JSON.stringify(abs)}`);
  // The window is not wide enough for a card beside the disc at this size
  // (it never was: with no ring the card sat over the disc), so clear of
  // the ring here means above it, and off the disc too.
  assert.ok(clear(c, { x0: open.cx - size / 2, x1: open.cx + size / 2, y0: open.cy - size / 2, y1: open.cy + size / 2 }), 'off the disc');
  assert.ok(c.top + box.h <= abs.y0, 'above the ring, the one side with room');
  // Against the right edge: the fan is on the left, the card still finds a clear place.
  const edge = { cx: side - 12 - size / 2, cy: side / 2, size };
  const lay2 = P.ringLayout(rec, size, { left: edge.cx, right: side - edge.cx, top: edge.cy, bottom: side - edge.cy });
  const ext2 = P.ringExtent(lay2, size);
  const c2 = P.placeCard(box, side, edge, ext2);
  assert.ok(inside(c2) && clear(c2, { x0: edge.cx + ext2.x0, x1: edge.cx + ext2.x1, y0: edge.cy + ext2.y0, y1: edge.cy + ext2.y1 }), `edge: card ${JSON.stringify(c2)}`);
  // No ring: beside the disc when a side has room, else the middle of the
  // window over the disc, as before. This window has no side with room.
  const c3 = P.placeCard(box, side, open, null);
  assert.deepEqual(c3, { left: Math.round((side - box.w) / 2), top: Math.round((side - box.h) / 2) });
  const wide = 1000;
  const c4 = P.placeCard(box, wide, { cx: 300, cy: 500, size }, null);
  assert.deepEqual(c4, { left: 300 + size / 2 + 14, top: 500 - 120 }, 'room on the right: beside the disc');
});

// Founder, 7 Sep 2026, screenshot of the open ring with five labels around
// it: "the text should only appear when user hovers on a particular icon".
// The label is the button's next sibling, so CSS alone reveals it for the
// hovered (or keyboard focused) button; a disabled button still hovers, so
// "Coming soon" and "Needs a Groq key" keep their explanation. The native
// tooltip went: it would have repeated the label a second later.
test('7. a ring label shows only while its own button is hovered or focused', () => {
  const css = strip(read('src/renderer/src/puck/puck.css'));
  assert.match(css, /\.puck-label \{[^}]*opacity: 0;/, 'a label starts hidden');
  assert.match(css, /\.puck-ring\.in \.puck-btn:hover \+ \.puck-label,\s*\.puck-ring\.in \.puck-btn:focus-visible \+ \.puck-label \{ opacity: 1; \}/, 'and shows for the hovered or focused button, on an open ring only');
  assert.doesNotMatch(css, /\.puck-ring\.in \.puck-label \{/, 'no rule shows every label at once');
  assert.doesNotMatch(css, /\.puck-label \{[^}]*var\(--i\)/, 'no stagger: a hover answers at once');
  const app = strip(read('src/renderer/src/puck/PuckApp.tsx'));
  assert.match(app, /<\/button>\s*<div className="puck-label"/, 'the label is the next sibling of its button, where the hover selector reaches it');
  const btn = app.slice(app.indexOf('data-action={slot.action}'), app.indexOf('onClick={() => run(slot.action)}'));
  assert.doesNotMatch(btn, /\btitle=/, 'no native tooltip on a ring button: the label is the hover text');
  assert.match(btn, /aria-label=\{label\.text\}/, 'the name stays on the button for a reader');
});

// Founder, 7 Sep 2026, screenshot of the card: a 2872 by 1792 capture drawn
// 268 wide and far taller than wide. "It looks stretched; it should be
// visible in its proportion, just smaller to fit the message box width."
// The <img> carried the capture's own pixel size as its attributes and the
// stylesheet overrode only the width, so the height attribute stood.
test('7. the picture\'s box: its own proportion, down to the card\'s width, never past the window, never up', () => {
  const side = P.ringFootprint(80);
  const inner = P.CARD.w - 2 * P.CARD.pad;
  const wide = P.shotBox({ width: 2872, height: 1792 }, side);
  assert.equal(wide.width, inner, 'a capture wider than the card fills its inner width');
  assert.equal(wide.height, Math.round((1792 * inner) / 2872), 'at its own proportion');
  assert.deepEqual(P.shotBox({ width: 120, height: 70 }, side), { width: 120, height: 70 }, 'a small region is never blown up');
  const room = side - 16 - P.CARD.baseH - P.CARD.gap;
  const tall = P.shotBox({ width: 600, height: 4000 }, side);
  assert.equal(tall.height, room, 'a tall capture is capped by the window');
  assert.equal(tall.width, Math.round((600 * room) / 4000), 'and keeps its proportion');
  assert.equal(P.cardHeight(null), P.CARD.baseH, 'no picture: the plain card');
  assert.equal(P.cardHeight(wide), P.CARD.baseH + P.CARD.gap + wide.height, 'a picture adds its height and one gap');
  for (const size of [48, 80, 160]) {
    const s = P.ringFootprint(size);
    for (const shot of [{ width: 2872, height: 1792 }, { width: 300, height: 3000 }, { width: 0, height: 0 }, { width: NaN, height: -5 }]) {
      const b = P.shotBox(shot, s);
      assert.ok(Number.isInteger(b.width) && Number.isInteger(b.height) && b.width >= 1 && b.height >= 1, `${size}: a whole, positive box for ${JSON.stringify(shot)}`);
      assert.ok(b.width <= inner, `${size}: never wider than the card`);
      const h = P.cardHeight(b);
      const c = P.placeCard({ w: P.CARD.w, h }, s, { cx: s / 2, cy: s / 2, size }, null);
      assert.ok(c.top >= 8 && c.top + h <= s - 8, `${size}: the whole card, Send included, is inside the window (${h} tall in ${s})`);
    }
  }
});

test('7. the card draws the picture through that box, not the capture\'s pixel size', () => {
  const css = strip(read('src/renderer/src/puck/puck.css'));
  assert.match(css, /\.puck-card \{[^}]*width: 292px;/, 'the stylesheet card is the shared width');
  assert.equal(P.CARD.w, 292);
  const img = (css.match(/\.puck-card img \{([^}]*)\}/) || [])[1] || '';
  assert.match(img, /height: auto;/, 'the height follows the width');
  assert.match(img, /max-width: 100%;/, 'and never past the card');
  assert.doesNotMatch(img, /(^|[^-])width: 100%/, 'no full width rule left to fight a height attribute');
  const app = strip(read('src/renderer/src/puck/PuckApp.tsx'));
  assert.match(app, /const shots = compose\?\.kind === 'screenshot' && !compose\.attached \? shotsLayout\(compose\.shots, space\) : null;/, 'the box comes from the capture size and the part of the window on screen');
  assert.match(app, /const CARD_H = Math\.max\(cardHeight\(shots\), cardDrawn\);/, 'the card is as tall as that needs, or as it is drawn');
  assert.match(app, /placeCard\(\{ w: CARD_W, h: CARD_H \}, space/, 'and is placed at that height'); assert.match(app, /const CARD_W = Math\.max\(CARD\.w, cardDrawnW\);/, 'and at its drawn width');
  assert.match(app, /compose\.shots\.length === 1 && <img src=\{compose\.shots\[0\]\.preview\} alt="" width=\{shots\?\.boxes\[0\]\?\.width\} height=\{shots\?\.boxes\[0\]\?\.height\} \/>/, 'the picture carries the box');
  assert.doesNotMatch(app, /width=\{compose\.width\}/, 'the capture\'s pixel size is text under the field, nothing more');
});

/* ---- 7b. the face is a blobatar ------------------------------------------------------- */

// The founder swapped the hand drawn faces for blobatar (7 Sep 2026). The
// window, the pickers and the preview all draw through PuckFace, and the
// one thing that could silently drift is the number that pins a silhouette:
// blobatar chooses by bands on a 0..1 trait, so ask the real library what it
// draws for each of our numbers. `_layout` is its own, underscored, reachable
// on purpose for exactly this kind of check.
test('7. each named shape pins the silhouette blobatar itself names for that number', () => {
  const b = require('blobatar');
  for (const s of P.PUCK_SHAPES) {
    if (s === 'auto') continue;
    for (const word of ['puck', 'comet 42', 'x']) {
      assert.equal(b._layout(word, { traits: { shape: P.PUCK_SHAPE_TRAIT[s] } }).shape, s, `${s} for "${word}"`);
    }
  }
  assert.equal(new Set(Object.values(P.PUCK_SHAPE_TRAIT)).size, 10, 'ten distinct numbers');
});

test('7. PuckFace draws the creature on our disc: no blobatar backdrop, the motion sheet loaded, every pose wired', () => {
  const src = strip(read('src/renderer/src/components/pro/puck/PuckFace.tsx'));
  assert.match(src, /background=\{false\}/, 'the disc is ours');
  assert.match(src, /import 'blobatar\/motion\.css'/, 'idle motion needs its stylesheet');
  assert.match(src, /from 'blobatar\/expression'/, 'poses come from the expression entry, as values');
  for (const x of P.PUCK_EXPRESSIONS) assert.match(src, new RegExp(`\\b${x}: untinted\\(pose\\.${x}\\)`), `pose ${x} is wired`);
  assert.match(src, /PUCK_SHAPE_TRAIT\[look\.shape\]/, 'a named shape goes through the pinned table');
  assert.match(src, /palette=\{\{ head: body \}\}/, 'the body is painted the exact colour, not a ramp near it');
  assert.match(src, /const \{ hue, tone \} = bodyLook\(body\)/, 'hue and tone come from the body, so the eyes read on it');
  assert.match(src, /const untinted = \(e: pose\.Expression\): pose\.Expression => \(\{ \.\.\.e, tint: undefined \}\)/, 'a pose is worn without its tint');
  for (const x of P.PUCK_EXPRESSIONS) assert.match(src, new RegExp(`\\b${x}: untinted\\(pose\\.${x}\\)`), `pose ${x} is worn untinted`);
  assert.match(src, /hue=\{hue\}/);
  assert.match(src, /tone=\{tone\}/);
  assert.match(src, /normalizeHex\(look\.color\) \?\? PUCK_DEFAULT_COLOR/, 'a colour this build cannot read wears the default');
  assert.doesNotMatch(src, /borderRadius|<circle/, 'no disc: the creature is the whole puck');
  assert.match(src, /drop-shadow/, 'a shadow separates it from whatever is behind it');
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  assert.match(app, /<PuckFace look=\{dict\.phase[^\n]*: cfg\} size=\{size\} animate="always"/, 'the floating window breathes on its own');
  assert.equal(JSON.parse(read('package.json')).dependencies.blobatar, '^2.7.0', 'blobatar 2, the major the bands and poses are frozen for');
});

// The swatches (founder, 7 Sep 2026: pastels, a vibrant row, yellow by
// default) and any hex typed. Yellow must BE the app's accent, not a colour
// near it, so read it off the tokens sheet; the vibrant six must be the
// app's own project hues. The body must come out of blobatar exactly as
// written, with eyes that read on it: blobatar keeps its eyes readable
// against its OWN ramp only, so bodyLook picks the tone from the body's
// luminance, and this checks the contrast the way WCAG counts it, for every
// pose, since a pose may tint, and then across a sweep of custom colours.
test('7. the swatches: yellow is the accent, the vibrant six are the project hues, and blobatar paints each body exactly', () => {
  const b = require('blobatar');
  const tokens = read('src/renderer/src/design/tokens.css');
  const token = (name) => { const m = tokens.match(new RegExp(`--cth-${name}:\\s*(#[0-9A-Fa-f]{6})`)); assert.ok(m, `token ${name}`); return m[1].toUpperCase(); };
  assert.deepEqual(P.PUCK_SWATCHES.map((s) => s.id), ['cream', 'grey', 'red', 'blue', 'green', 'yellow', 'coral', 'peach', 'lemon', 'mint', 'sky', 'lilac'], 'twelve, in the picker\'s order');
  const by = Object.fromEntries(P.PUCK_SWATCHES.map((s) => [s.id, s]));
  assert.equal(by.yellow.hex, token('accent'), 'yellow is the accent itself');
  assert.equal(P.PUCK_DEFAULT_COLOR, by.yellow.hex, 'and the default');
  for (const id of ['coral', 'peach', 'lemon', 'mint', 'sky', 'lilac']) {
    assert.equal(by[id].group, 'vibrant');
    assert.equal(by[id].hex, token(id), `${id} is the app's own ${id}`);
  }
  for (const s of P.PUCK_SWATCHES) {
    assert.equal(P.normalizeHex(s.hex), s.hex, `${s.id}: a normal six digit hex`);
    if (s.group === 'pastel') assert.ok(P.luminance(s.hex) >= 0.45, `${s.id}: a pastel is light`);
  }
  // Worn the way PuckFace wears them: without the tint, so the body keeps the
  // colour it was given in EVERY pose. With the tint on, the sick pose paints
  // a cream body green (#b9e0a9), which is what the founder saw.
  const poses = require('blobatar/expression');
  const worn = Object.fromEntries(P.PUCK_EXPRESSIONS.map((x) => [x, { ...poses[x], tint: undefined }]));
  assert.notEqual(b._layout('saffron 24', { hue: 88, tone: 0, palette: { head: '#FFF8E7' }, expression: poses.sick }).palette.head, '#FFF8E7', 'blobatar\'s own sick pose repaints the body');
  const paints = (hex, why, floor) => {
    const { hue, tone } = P.bodyLook(hex);
    for (const word of ['puck', 'comet 42', 'x']) {
      for (const x of P.PUCK_EXPRESSIONS) {
        const p = b._layout(word, { hue, tone, palette: { head: hex }, expression: worn[x] }).palette;
        assert.equal(p.head, hex, `${why} ${x}: painted exactly for "${word}"`);
        const r = P.contrastRatio(p.eye, p.head);
        assert.ok(r >= floor, `${why} ${x} "${word}": eyes ${p.eye} on body ${p.head} read at ${r.toFixed(2)}:1, under ${floor}`);
      }
    }
  };
  for (const s of P.PUCK_SWATCHES) paints(s.hex, s.id, 4.5);
  // Custom colours: every grey, and the loud corners of the cube. No pair of
  // eye colours reaches 4.5:1 on a mid grey (black and white themselves stop
  // at 4.58), so the sweep asks for 4.3, with the flip where blobatar's dark
  // eye and its light eye read equally.
  for (let v = 0; v < 256; v += 5) paints(`#${[v, v, v].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`, `grey ${v}`, 4.3);
  for (const hex of ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#3A7BD5', '#8B0000', '#1A1320', '#FFFFFF', '#2E4A7A', '#5B2A86', '#006400', '#800080']) paints(hex, hex, 4.3);
  assert.ok(Math.abs(P.oklchHue('#FFC94F') - 84) <= 1, 'the accent sits at OKLCh hue 84');
  assert.ok(Math.abs(P.oklchHue('#B3D4F0') - 244) <= 1, 'the pastel blue at 244');
  assert.equal(P.bodyLook('#1A1320').tone, 0.999, 'ink takes light eyes');
  assert.equal(P.bodyLook('#FFF8E7').tone, 0, 'cream takes dark eyes');
});

/* ---- 8. locales ------------------------------------------------------------------------ */

test('8. every pro.puck key the three pages use exists in all three locales, no dash, variables intact', () => {
  const files = [
    'src/renderer/src/components/pro/PuckScreen.tsx',
    'src/renderer/src/puck/PuckApp.tsx',
    'src/renderer/src/capture/CaptureApp.tsx'
  ].map((f) => read(f)).join('\n');
  const keys = new Set([...files.matchAll(/t\('(pro\.[a-zA-Z.]+)'/g)].map((m) => m[1]));
  keys.add('pro.nav.puck');
  for (const x of ['settings', 'meetings', 'screenshots']) keys.add(`pro.puck.tabs.${x}`);
  for (const g of ['general', 'generalInfo', 'dictation', 'meetings', 'screenshots', 'sharedInfo', 'ring']) keys.add(`pro.puck.groups.${g}`);
  for (const s of P.PUCK_SHAPES) keys.add(`pro.puck.shapes.${s}`);
  for (const x of P.PUCK_EXPRESSIONS) keys.add(`pro.puck.expressions.${x}`);
  for (const s of P.PUCK_SWATCHES) keys.add(`pro.puck.colors.${s.id}`);
  for (const g of ['pastel', 'vibrant']) keys.add(`pro.puck.${g}`);
  for (const c of ['bottom-right', 'bottom-left', 'top-right', 'top-left']) keys.add(`pro.puck.corners.${c}`);
  for (const a of ['screenshot', 'message', 'meeting', 'invisible', 'computerUse']) { keys.add(`pro.puck.action.${a}`); keys.add(`pro.puck.action.${a}Hint`); keys.add(`pro.puck.ring.${a}`); }
  for (const s of ['recording', 'transcribing', 'done', 'pending', 'failed']) keys.add(`pro.puck.meetings.status.${s}`);
  assert.ok(keys.size > 70, `parser found only ${keys.size} keys; the guard is disarmed`);
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))]));
  const get = (obj, dotted) => dotted.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
  for (const k of keys) {
    const en = get(locales.en, k);
    assert.ok(typeof en === 'string' && en.length > 0, `en ${k}`);
    const vars = (en.match(/\{\{\w+\}\}/g) || []).sort();
    for (const l of ['en', 'zh-CN', 'ar']) {
      const s = get(locales[l], k);
      assert.ok(typeof s === 'string' && s.length > 0, `${l} ${k}`);
      assert.ok(!DASH.test(s), `${l} ${k}: no dash`);
      assert.deepEqual((s.match(/\{\{\w+\}\}/g) || []).sort(), vars, `${l} ${k}: same variables`);
    }
  }
});

test('8. no PRO puck surface draws a thicker border on one edge', () => {
  for (const f of ['src/renderer/src/components/pro/PuckScreen.tsx', 'src/renderer/src/components/pro/puck/PuckFace.tsx']) {
    const src = read(f);
    for (const m of src.matchAll(/border(Left|Right|Top|Bottom)\s*:\s*[`'"]([^`'"]+)[`'"]/g)) {
      assert.match(m[2], /^1px /, `${f}: border${m[1]} "${m[2]}" is not a 1px hairline`);
    }
  }
});

/* ---- 6b. registration runs before ready ------------------------------------ */

// registerPuck is called at module load of main/index.ts, before Electron's
// `ready`. Electron throws on the first touch of `screen` before that event,
// and the first dev launch (7 Sep 2026) died exactly there. So: load the real
// module against an electron whose `screen` refuses until ready, register,
// and expect the screen listeners only after ready has fired.
test('6. registerPuck never touches screen before ready, and listens once ready has fired', async () => {
  const Module = require('node:module');
  const os = require('node:os');
  const origLoad = Module._load;
  let ready = false;
  let fireReady;
  const readyP = new Promise((r) => { fireReady = r; });
  const screenEvents = [];
  const handles = [];
  const electron = {
    app: { whenReady: () => readyP, on: () => {}, isPackaged: false, getPath: () => os.tmpdir() },
    get screen() {
      if (!ready) throw new Error("The 'screen' module can't be used before the app 'ready' event");
      return { on: (ev) => screenEvents.push(ev), getPrimaryDisplay: () => ({ id: 1, workArea: { x: 0, y: 0, width: 1440, height: 900 } }), getDisplayNearestPoint: () => ({ id: 1, workArea: { x: 0, y: 0, width: 1440, height: 900 } }) };
    },
    ipcMain: { handle: (name) => handles.push(name), on: () => {} },
    BrowserWindow: class {},
    desktopCapturer: {},
    nativeImage: {},
    shell: {},
    systemPreferences: { getMediaAccessStatus: () => 'granted' }
  };
  Module._load = function (request, ...rest) {
    if (request === 'electron') return electron;
    return origLoad.call(this, request, ...rest);
  };
  try {
    const main = loadTs('src/main/puck.ts');
    const deps = {
      readConfig: () => ({}), writeConfig: () => ({}), onConfigWritten: () => () => {},
      hiveEnabled: () => false, hiveSend: () => ({}), transcribe: async () => ({ ok: false }),
      broadcast: () => {}, preload: '', rendererUrl: null, rendererDir: ''
    };
    assert.doesNotThrow(() => main.registerPuck(deps), 'registration must not reach screen before ready');
    assert.deepEqual(screenEvents, [], 'no screen listener before ready');
    assert.ok(handles.includes('puck:admit') && handles.includes('puck:captureConfirm'), 'the IPC surface is registered at once');
    ready = true;
    fireReady();
    await readyP;
    await new Promise((r) => setImmediate(r));
    // Three since 0.5.3. `display-added` was the missing one: a monitor arriving
    // moves the origin as surely as one leaving.  (test/stapler-displays.test.cjs)
    assert.deepEqual([...screenEvents].sort(), ['display-added', 'display-metrics-changed', 'display-removed'], 'all three screen listeners attach after ready');
  } finally {
    Module._load = origLoad;
  }
});

/* ---- 6c. the click after the ring closes -------------------------------------------- */

// Open the ring with a click on the creature, close it with a second click,
// and the third click did nothing (founder, 7 Sep 2026): main made the window
// click through the moment the ring closed, while the cursor was still over
// the creature, and the page had no reason to say otherwise because nothing
// it tracks had changed. So the window ignored the third click until the
// cursor left and came back. Drive the real IPC handlers against a window
// stub that records every setIgnoreMouseEvents, and expect the window to be
// taking the mouse after the sequence, because the page said so and main
// must not overrule it.
test('6. a click that closes the ring leaves the window taking the mouse, so the next click opens it again', () => {
  const Module = require('node:module');
  const os = require('node:os');
  const origLoad = Module._load;
  const ignores = [];
  const handlers = {};
  const display = { id: 1, workArea: { x: 0, y: 0, width: 1440, height: 900 }, bounds: { x: 0, y: 0, width: 1440, height: 900 }, scaleFactor: 1 };
  const noop = () => {};
  // Every method main touches while creating and placing the window is a
  // no-op; only the two this test is about answer.
  const windowStub = () => new Proxy({}, {
    get(_t, k) {
      if (k === 'isDestroyed') return () => false;
      if (k === 'setIgnoreMouseEvents') return (ignore) => { ignores.push(ignore); };
      if (k === 'webContents') return new Proxy({}, { get: (_w, wk) => (wk === 'then' ? undefined : noop) });
      if (k === 'then') return undefined;
      return noop;
    }
  });
  const electron = {
    app: { whenReady: () => Promise.resolve(), on: noop, isPackaged: false, getPath: () => os.tmpdir() },
    screen: { on: noop, getPrimaryDisplay: () => display, getDisplayNearestPoint: () => display, getAllDisplays: () => [display] },
    ipcMain: { handle: (name, fn) => { handlers[name] = fn; }, on: noop },
    BrowserWindow: class { constructor() { return windowStub(); } },
    desktopCapturer: {},
    nativeImage: {},
    shell: {},
    systemPreferences: { getMediaAccessStatus: () => 'granted' }
  };
  Module._load = function (request, ...rest) {
    if (request === 'electron') return electron;
    return origLoad.call(this, request, ...rest);
  };
  try {
    const main = loadTs.fresh('src/main/puck.ts');
    main.registerPuck({
      readConfig: () => ({ harnessHome: os.tmpdir(), puck: { enabled: true } }), writeConfig: () => ({}), onConfigWritten: () => () => {},
      hiveEnabled: () => false, hiveSend: () => ({}), transcribe: async () => ({ ok: false }),
      broadcast: noop, preload: '', rendererUrl: null, rendererDir: ''
    });
    handlers['puck:admit'](null, true);
    assert.equal(ignores.at(-1), true, 'a fresh window is click through');
    handlers['puck:ignoreMouse'](null, false);   // the cursor is over the creature
    let st = handlers['puck:menu'](null, true);  // click one: the ring opens
    assert.equal(st.menuOpen, true);
    st = handlers['puck:menu'](null, false);     // click two, same spot: it closes
    assert.equal(st.menuOpen, false);
    assert.equal(ignores.at(-1), false, 'the cursor never left the creature, so the window still takes the mouse and click three lands');
    handlers['puck:ignoreMouse'](null, true);    // the cursor leaves
    assert.equal(ignores.at(-1), true, 'and the page alone hands the mouse back');
  } finally {
    Module._load = origLoad;
  }
});

/* ---- 6e. a message is written down while it is spoken ---------------------------- */

// The founder wants the words on screen while talking (7 Sep 2026), so a
// message's parts are transcribed as they land and the recording goes on;
// only the last part ends it. Drive the real handlers.
test('6. a message part is transcribed with the recording still on; the last part ends it', async () => {
  const Module = require('node:module');
  const os = require('node:os');
  const origLoad = Module._load;
  const handlers = {};
  const noop = () => {};
  const display = { id: 1, workArea: { x: 0, y: 0, width: 1440, height: 900 }, bounds: { x: 0, y: 0, width: 1440, height: 900 }, scaleFactor: 1 };
  const windowStub = () => new Proxy({}, { get(_t, k) { if (k === 'isDestroyed') return () => false; if (k === 'webContents') return new Proxy({}, { get: (_w, wk) => (wk === 'then' ? undefined : noop) }); if (k === 'then') return undefined; return noop; } });
  const electron = {
    app: { whenReady: () => Promise.resolve(), on: noop, isPackaged: false, getPath: () => os.tmpdir() },
    screen: { on: noop, getPrimaryDisplay: () => display, getDisplayNearestPoint: () => display, getAllDisplays: () => [display] },
    ipcMain: { handle: (name, fn) => { handlers[name] = fn; }, on: noop },
    BrowserWindow: class { constructor() { return windowStub(); } },
    desktopCapturer: {}, nativeImage: {}, shell: {},
    systemPreferences: { getMediaAccessStatus: () => 'granted' }
  };
  Module._load = function (request, ...rest) { if (request === 'electron') return electron; return origLoad.call(this, request, ...rest); };
  try {
    const main = loadTs.fresh('src/main/puck.ts');
    const heard = [];
    main.registerPuck({
      readConfig: () => ({ harnessHome: os.tmpdir(), groqApiKey: 'k', puck: { enabled: true } }), writeConfig: () => ({}), onConfigWritten: () => () => {},
      hiveEnabled: () => false, hiveSend: () => ({}),
      transcribe: async ({ audio }) => { heard.push(audio.byteLength); return { ok: true, text: `part ${heard.length}` }; },
      broadcast: noop, preload: '', rendererUrl: null, rendererDir: ''
    });
    handlers['puck:admit'](null, true);
    assert.deepEqual(await handlers['puck:messageSegment'](null, { audio: new Uint8Array(3), mimeType: 'audio/webm' }), { ok: false, error: 'not recording a message' }, 'no part outside a message');
    assert.equal((await handlers['puck:messageStart']()).ok, true);
    assert.deepEqual(await handlers['puck:messageSegment'](null, { audio: new Uint8Array(3), mimeType: 'audio/webm' }), { ok: true, text: 'part 1' });
    assert.equal(handlers['puck:state']().recording.kind, 'message', 'still recording after a part');
    assert.deepEqual(await handlers['puck:messageSegment'](null, { audio: new Uint8Array(0), mimeType: 'audio/webm' }), { ok: false, error: 'no audio' }, 'an empty part is not sent anywhere');
    assert.deepEqual(await handlers['puck:messageStop'](null, { audio: new Uint8Array(5), mimeType: 'audio/webm' }), { ok: true, text: 'part 2' });
    assert.equal(handlers['puck:state']().recording, null, 'the last part ends it');
    assert.deepEqual(heard, [3, 5]);
  } finally {
    Module._load = origLoad;
  }
});

/* ---- 6f. what a failure means, and the doors out of it ---------------------------- */

// Founder, 7 Sep 2026: proper error and loading states for the flows that
// need setting up, the Groq key first. The classifier is pure; the two
// doors (Voice settings in the app, the Microphone pane) are IPC.
test('6. a failure is named by what to do about it, and the puck can open Voice settings and the mic pane', async () => {
  assert.equal(P.puckProblem('no transcription key'), 'noKey');
  assert.equal(P.puckProblem('missing Groq API key'), 'noKey');
  assert.equal(P.puckProblem('Groq 401: Invalid API Key'), 'badKey', 'a key that is set wrong');
  assert.equal(P.puckProblem('Groq 403: forbidden'), 'badKey');
  assert.equal(P.puckProblem('Groq 429: rate limit reached'), 'busy');
  assert.equal(P.puckProblem('Groq 503: Service Unavailable'), 'network');
  assert.equal(P.puckProblem('fetch failed'), 'network');
  assert.equal(P.puckProblem('getaddrinfo ENOTFOUND api.groq.com'), 'network');
  assert.equal(P.puckProblem('hive disabled (no harnessHome)'), 'noHive');
  assert.equal(P.puckProblem('mic-denied'), 'micDenied');
  assert.equal(P.puckProblem('mic-failed'), 'micFailed');
  assert.equal(P.puckProblem('no microphone api'), 'micFailed');
  assert.equal(P.puckProblem('nothing to send'), 'other');
  assert.equal(P.puckProblem(undefined), 'other');
  const app = strip(read('src/renderer/src/puck/PuckApp.tsx'));
  assert.ok((app.match(/showFlash\(problem\(/g) || []).length >= 8, 'every failure path goes through the classifier');
  assert.doesNotMatch(app, /showFlash\(\{ text: (r|out|started)\.error/, 'no raw error string reaches the person');
  assert.match(app, /puckOpenSettings\('Voice'\)/, 'a missing or refused key opens Voice settings');
  assert.match(app, /puckOpenMicAccess\(\)/, 'a refused microphone opens the pane');
  assert.match(app, /if \(final\) \{ setBusy\('transcribe'\); lastClip\.current = clip; \}/, 'the last part is kept for another try');
  assert.match(app, /if \(busy === 'starting'\) return t\('pro\.puck\.card\.starting'\);/, 'opening the microphone is said');
  assert.match(app, /if \(busy === 'send'\) return t\('pro\.puck\.card\.sending'\);/, 'sending is said');
  assert.match(app, /\{flash\?\.action && <button[^>]*onClick=\{flash\.action\.run\}/, 'the fix is a button on the card');
  assert.match(read('src/renderer/src/App.tsx'), /window\.cth\.onOpenSettings\(\(arg\) => \{\s*window\.dispatchEvent\(new CustomEvent\('cth:open-settings', \{ detail: \{ section: arg\.section \} \}\)\);/, 'the app answers the puck\'s ask with its one door into Settings');

  const Module = require('node:module');
  const os = require('node:os');
  const origLoad = Module._load;
  const handlers = {};
  const noop = () => {};
  const opened = [];
  const asked = [];
  const display = { id: 1, workArea: { x: 0, y: 0, width: 1440, height: 900 }, bounds: { x: 0, y: 0, width: 1440, height: 900 }, scaleFactor: 1 };
  const electron = {
    app: { whenReady: () => Promise.resolve(), on: noop, isPackaged: false, getPath: () => os.tmpdir() },
    screen: { on: noop, getPrimaryDisplay: () => display, getDisplayNearestPoint: () => display, getAllDisplays: () => [display] },
    ipcMain: { handle: (name, fn) => { handlers[name] = fn; }, on: noop },
    BrowserWindow: class {},
    desktopCapturer: {}, nativeImage: {}, shell: { openExternal: async (url) => { opened.push(url); } },
    systemPreferences: { getMediaAccessStatus: () => 'granted' }
  };
  Module._load = function (request, ...rest) { if (request === 'electron') return electron; return origLoad.call(this, request, ...rest); };
  try {
    const main = loadTs.fresh('src/main/puck.ts');
    main.registerPuck({
      readConfig: () => ({}), writeConfig: () => ({}), onConfigWritten: () => () => {},
      hiveEnabled: () => false, hiveSend: () => ({}), transcribe: async () => ({ ok: false }),
      broadcast: noop, openSettings: (section) => { asked.push(section); }, preload: '', rendererUrl: null, rendererDir: ''
    });
    await handlers['puck:openSettings'](null, 'Voice');
    await handlers['puck:openSettings'](null, undefined);
    assert.deepEqual(asked, ['Voice', undefined], 'the section is passed through, and no section means just the app');
    await handlers['puck:openMicAccess']();
    if (process.platform === 'darwin') assert.deepEqual(opened, ['x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone']);
    else assert.deepEqual(opened, []);
  } finally {
    Module._load = origLoad;
  }
});

/* ---- 6d. the first screenshot makes macOS ask ------------------------------------- */

// macOS reports screen access as `denied` until the first capture attempt,
// and only a capture attempt makes it ask and list the app under Screen
// Recording. The first build refused on `denied` before trying, so the
// founder saw "off in System Settings" with no app listed there to turn on
// (7 Sep 2026). Drive the real handler against a stub whose status is
// `denied` until desktopCapturer is touched, and expect the attempt to come
// first and its answer to decide.
test('6. Screenshot attempts a capture before calling the screen denied, so macOS asks and lists the app', async () => {
  const Module = require('node:module');
  const os = require('node:os');
  const origLoad = Module._load;
  const handlers = {};
  let status = 'denied';
  let probes = 0;
  let grantOnProbe = false;
  const display = { id: 1, workArea: { x: 0, y: 0, width: 1440, height: 900 }, bounds: { x: 0, y: 0, width: 1440, height: 900 }, scaleFactor: 1 };
  const noop = () => {};
  const windowStub = () => new Proxy({}, {
    get(_t, k) {
      if (k === 'isDestroyed') return () => false;
      if (k === 'webContents') return new Proxy({}, { get: (_w, wk) => (wk === 'then' ? undefined : noop) });
      if (k === 'then') return undefined;
      return noop;
    }
  });
  const electron = {
    app: { whenReady: () => Promise.resolve(), on: noop, isPackaged: false, getPath: () => os.tmpdir() },
    screen: { on: noop, getPrimaryDisplay: () => display, getDisplayNearestPoint: () => display, getAllDisplays: () => [display] },
    ipcMain: { handle: (name, fn) => { handlers[name] = fn; }, on: noop },
    BrowserWindow: class { constructor() { return windowStub(); } },
    desktopCapturer: { getSources: async () => { probes += 1; if (grantOnProbe) status = 'granted'; return []; } },
    nativeImage: {},
    shell: {},
    systemPreferences: { getMediaAccessStatus: (kind) => (kind === 'screen' ? status : 'granted') }
  };
  Module._load = function (request, ...rest) {
    if (request === 'electron') return electron;
    return origLoad.call(this, request, ...rest);
  };
  try {
    const main = loadTs.fresh('src/main/puck.ts');
    main.registerPuck({
      readConfig: () => ({ harnessHome: os.tmpdir(), puck: { enabled: true } }), writeConfig: () => ({}), onConfigWritten: () => () => {},
      hiveEnabled: () => false, hiveSend: () => ({}), transcribe: async () => ({ ok: false }),
      broadcast: noop, preload: '', rendererUrl: null, rendererDir: ''
    });
    handlers['puck:admit'](null, true);
    let r = await handlers['puck:captureStart']();
    assert.equal(probes, 1, 'one capture attempt was made, which is what makes macOS ask');
    assert.deepEqual(r, { ok: false, error: 'screen-denied' }, 'still denied after asking: now the note is true');
    grantOnProbe = true;
    r = await handlers['puck:captureStart']();
    assert.equal(probes, 2, 'asked again on the next try');
    assert.deepEqual(r, { ok: true }, 'granted after the attempt: the overlay opens');
    status = 'granted';
    handlers['puck:captureCancel']();
    r = await handlers['puck:captureStart']();
    assert.equal(probes, 2, 'already granted: no attempt needed');
    assert.deepEqual(r, { ok: true });
  } finally {
    Module._load = origLoad;
  }
});

/* 0.5.2, card v052-stapler-mic-permission-prompt (founder, 8 Sep 2026): the
   first-run microphone notice was parked at the screen edge, its copy was
   long, and its button broke on the text. */
test('6. the notice is whole and inside the window: it slides in from an edge and flips above the disc at the bottom', () => {
  const size = 80;
  const side = P.ringFootprint(size);
  const { w, margin } = P.FLASH;
  // In the open: centred under the disc.
  const open = P.placeFlash(side, { cx: side / 2, cy: side / 2, size }, 96);
  assert.strictEqual(open.width, w);
  assert.strictEqual(open.left, Math.round(side / 2 - w / 2));
  assert.strictEqual(open.top, side / 2 + size / 2 + P.FLASH.gap);
  // Disc in the top-left corner of the screen (the window clamped, the disc a
  // few px from the window's edge): the notice slides right, fully inside.
  const corner = P.placeFlash(side, { cx: size / 2 + 2, cy: size / 2 + 2, size }, 96);
  assert.strictEqual(corner.left, margin, 'it used to hang half outside the window here');
  assert.ok(corner.left + corner.width <= side - margin);
  // Right edge: the box keeps its width and is not squeezed to the letters.
  const right = P.placeFlash(side, { cx: side - size / 2 - 2, cy: side / 2, size }, 96);
  assert.strictEqual(right.width, w, 'a shrink-to-fit box here was a few px wide');
  assert.strictEqual(right.left, side - margin - w);
  // Bottom edge: no room below, so above the disc, and still inside.
  const bottom = P.placeFlash(side, { cx: side / 2, cy: side - size / 2 - 2, size }, 96);
  assert.ok(bottom.top + 96 <= bottom.top + 96 && bottom.top < side - size / 2 - 2 - size / 2, 'it flipped above');
  assert.ok(bottom.top >= margin && bottom.top + 96 <= side - margin);
  // A recording widens the gap below for the clock.
  const rec = P.placeFlash(side, { cx: side / 2, cy: side / 2, size }, 36, 36);
  assert.strictEqual(rec.top, side / 2 + size / 2 + 36);
});

test('6. the notice has one fixed width and stacked full-width buttons, so a longer label wraps inside its button', () => {
  const css = read('src/renderer/src/puck/puck.css');
  const flash = css.slice(css.indexOf('.puck-flash {'), css.indexOf('@media (prefers-reduced-motion'));
  assert.ok(!/transform: translate\(-50%/.test(flash), 'the -50% centring is what hung it off the edge');
  assert.ok(!/max-width/.test(flash), 'a max-width with no width is the shrink-to-fit sliver');
  assert.match(flash, /\.puck-flash \.puck-row \{ flex-direction: column; align-items: stretch;[^}]*width: 100%; \}/);
  assert.match(flash, /\.puck-flash \.puck-b \{\s*width: 100%; min-height: 26px;[^}]*white-space: normal; overflow-wrap: anywhere; text-align: center;/);
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  assert.match(app, /style=\{placeFlash\(space, \{ cx, cy, size \}, Math\.max\(flash\.action \? 96 : 36, flashDrawn\), st\.recording \? 36 : FLASH\.gap\)\}/, 'the app places it with the shared rule');
  // The copy is small.
  for (const l of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    const m = j.pro.puck.flash.micDenied;
    assert.ok(m.length <= 24, `${l} micDenied is ${m.length} chars: "${m}"`);
    assert.ok(!DASH.test(m));
  }
  assert.strictEqual(JSON.parse(read('src/renderer/src/i18n/locales/en.json')).pro.puck.flash.micDenied, 'No microphone access.');
});

// ── 9. Capture and Cancel on the Stapler (0.5.2, v052-stapler-capture-buttons-placement)
// The founder, 9 Sep 2026: the two buttons rendered at the edge of the
// selection, away from where the eye was. They live on the Stapler now.
test('9. the capture pair sits straight below the disc, or above it at the bottom of the screen, symmetric and inside the room', () => {
  const open = P.capturePair(80, { left: 400, right: 400, top: 400, bottom: 400 });
  assert.equal(open.below, true);
  assert.equal(open.y, Math.round(80 * P.RING.radius), 'at the ring radius, where the ring buttons would be');
  assert.equal(open.capture.x, -open.cancel.x, 'symmetric about the disc');
  assert.ok(open.cancel.x - open.capture.x >= open.button + 8, 'air between the two');
  assert.equal(open.button, Math.round(80 * P.RING.button), 'ring-sized buttons');
  const low = P.capturePair(80, { left: 400, right: 400, top: 400, bottom: 60 });
  assert.equal(low.below, false, 'no room for a button and its label below');
  assert.equal(low.y, -open.y, 'so the pair goes straight above');
  assert.equal(low.capture.x, open.capture.x, 'the x places do not move');
});

test('9. the overlay has no buttons of its own any more; the Stapler asks and the overlay answers with its box', () => {
  const overlay = read('src/renderer/src/capture/CaptureApp.tsx');
  assert.doesNotMatch(overlay, /<button/, 'no button at the edge of the selection');
  assert.doesNotMatch(overlay, /barTop|function btn\(/, 'the bar and its style are gone');
  assert.match(overlay, /window\.cth\.onPuckCaptureRequest\(\(\) => \{ void confirm\(\); \}\)/, 'the request lands on the confirm that knows the region');
  assert.match(overlay, /e\.key === 'Enter'/, 'Enter still captures');
  assert.match(overlay, /e\.key === 'Escape'/, 'Escape still cancels');
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  assert.match(app, /\{cfg && st\.capturing && !preview && \(\(\) => \{/, 'the pair renders only while a capture is up, never in the settings preview');
  assert.match(app, /placePair\(size, \{ cx, cy \}, room, space, cardBox\)/, 'placed by the shared rule from the disc\'s room on screen (0.5.3, I3), and above an open card (25 Sep 2026)');
  assert.match(app, /window\.cth\.puckCaptureRequest\(\)/, 'Capture asks main');
  assert.match(app, /void window\.cth\.puckCaptureCancel\(\)/, 'Cancel closes the overlay');
  assert.match(app, /flash !== null \|\| st\.capturing\b/, 'the window claims the mouse for the whole capture');
  assert.match(app, /className="puck-label always"/, 'the words stay on without a hover');
  const css = read('src/renderer/src/puck/puck.css');
  assert.match(css, /\.puck-label\.always \{ opacity: 1; \}/);
  const main = read('src/main/puck.ts');
  assert.match(main, /ipcMain\.handle\('puck:captureRequest', \(\) => requestCapture\(\)\)/);
  assert.match(main, /overlay\.webContents\.send\('puck:captureRequest'\)/, 'main relays to the overlay, which holds the box');
  assert.match(main, /setAlwaysOnTop\(onTop \|\| capturing, 'screen-saver', capturing \? 3 : 1\)/, 'the puck sits above the overlay (level 2) while capturing, whatever the setting says');
  assert.match(main, /setState\(\{ capturing: true, menuOpen: false \}\);\n  raise\(win, cfg\.alwaysOnTop\);/, 'raised the moment the overlay opens');
  assert.match(main, /if \(state\.capturing\) setState\(\{ capturing: false \}\);\n  if \(win && !win\.isDestroyed\(\)\) raise\(win, cfgOf\(\)\.alwaysOnTop\);/, 'and back to its own level when the overlay closes');
  const preload = read('src/preload/index.ts');
  assert.match(preload, /puckCaptureRequest: \(\)/);
  assert.match(preload, /ipcRenderer\.on\('puck:captureRequest', listener\)/);
  for (const l of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    const c = j.pro.puck.capture;
    assert.ok(!DASH.test(c.hint), `${l} hint has no dash`);
    assert.ok(c.hint.length <= 120, `${l} hint fits the pill: ${c.hint.length}`);
  }
  assert.match(JSON.parse(read('src/renderer/src/i18n/locales/en.json')).pro.puck.capture.hint, /Capture or Cancel on the Stapler/);
});


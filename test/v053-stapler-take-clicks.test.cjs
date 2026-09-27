/* 0.5.3, founder 25 Sep 2026: "Done and cancel button are not working in
 * stapler". The Stapler window ignores the mouse except where the renderer
 * says it wants it; a ring take's Done and Cancel sit off the disc, so the
 * take itself must claim the mouse or both clicks fall through. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '../src/renderer/src/puck/PuckApp.tsx'), 'utf8');

test('a ring take claims the mouse so Done and Cancel can be clicked', () => {
  const m = src.match(/const wantMouse = ([^;]+);/);
  assert.ok(m, 'wantMouse is defined');
  assert.match(m[1], /\bringTake\b/);
});

test('the take buttons are hit targets', () => {
  assert.match(src, /data-take-buttons/);
  assert.match(src, /data-take=\{kind\}/);
});

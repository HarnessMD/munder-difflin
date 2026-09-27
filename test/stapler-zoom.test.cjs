'use strict';

/**
 * THE STAPLER STAYS AT 100% (0.5.4, founder recording 26 Sep 2026).
 *
 * Cmd+= while the Stapler's note card had focus saved a Chromium zoom of 1.5
 * (131%) for puck.html. Main places the disc in window pixels and the page
 * draws it in CSS pixels, so from then on the disc sat about 100pt off the
 * cursor during every drag, across restarts.
 *
 * What these prove: the zoom keys are recognised on both platforms and plain
 * typing is not, and both Stapler windows lock their zoom on load, on change
 * and on those keys. What they do not prove: Chromium honouring
 * setZoomLevel(0) over a saved level. That is the founder's hand check (zoom
 * a 0.5.3 Stapler, update, drag).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { isZoomKey } = loadTs('src/shared/puck.ts');
const MAIN = fs.readFileSync(path.join(__dirname, '..', 'src/main/puck.ts'), 'utf8');

test('1. Cmd with + = - 0 is a zoom key on the Mac, Ctrl elsewhere, keypad included', () => {
  for (const key of ['+', '=', '-', '_', '0']) {
    assert.equal(isZoomKey({ type: 'keyDown', key, meta: true }, true), true, `Cmd ${key}`);
    assert.equal(isZoomKey({ type: 'keyDown', key, control: true }, false), true, `Ctrl ${key}`);
  }
  for (const code of ['NumpadAdd', 'NumpadSubtract', 'Numpad0', 'Equal']) {
    assert.equal(isZoomKey({ type: 'keyDown', key: 'x', code, meta: true }, true), true, code);
  }
});

test('2. typing, key up and the other modifier are left alone', () => {
  assert.equal(isZoomKey({ type: 'keyDown', key: '=' }, true), false, 'a plain = in the note');
  assert.equal(isZoomKey({ type: 'keyDown', key: '0', control: true }, true), false, 'Ctrl on the Mac');
  assert.equal(isZoomKey({ type: 'keyDown', key: '0', meta: true }, false), false, 'Win key elsewhere');
  assert.equal(isZoomKey({ type: 'keyUp', key: '=', meta: true }, true), false);
  assert.equal(isZoomKey({ type: 'keyDown', key: 'v', meta: true }, true), false, 'paste still works');
});

test('3. both Stapler windows lock their zoom, on load, on change and on the keys', () => {
  const body = MAIN.slice(MAIN.indexOf('function lockZoom('), MAIN.indexOf('function platformWindowType('));
  assert.match(body, /setZoomLevel\(0\)/);
  assert.match(body, /on\('did-finish-load', \(\) => \{\n\s*reset\(\);/);
  assert.match(body, /on\('zoom-changed', reset\)/);
  assert.match(body, /setVisualZoomLevelLimits\(1, 1\)/);
  assert.match(body, /before-input-event[\s\S]*isZoomKey[\s\S]*preventDefault/);
  assert.match(MAIN, /const w = win;\n\s*installLoopback\(w\);\n\s*lockZoom\(w\);/, 'the disc window');
  assert.match(MAIN, /const o = overlay;\n\s*lockZoom\(o\);/, 'the capture overlay');
});

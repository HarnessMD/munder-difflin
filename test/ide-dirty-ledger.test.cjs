'use strict';

/* The quit warning's count of unsaved IDE files must forget a window that is
 * gone (found merging review finding 15, 20 Sep 2026).
 *
 * The count lived in a bare Map in main, written only when the renderer spoke.
 * A window closed with "Lose the changes" never speaks again: its panel is
 * destroyed, not unmounted. On macOS the app stays up after the last window
 * closes, so the next Command Q said "1 file in the IDE has unsaved changes"
 * about a window that no longer existed, and Go back went back to nothing.
 * A reload did the same: the text was gone and the count was not. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const { IdeDirtyLedger } = loadTs('src/shared/ideBuffers.ts');

test('1. a window that reports unsaved files is counted, alone and in the total', () => {
  const l = new IdeDirtyLedger();
  assert.equal(l.report(7, 2), true);
  l.report(9, 1);
  assert.equal(l.get(7), 2);
  assert.equal(l.get(8), 0);
  assert.equal(l.total(), 3);
});

test('2. a window that is GONE is forgotten: the next quit does not ask about it', () => {
  const l = new IdeDirtyLedger();
  l.report(7, 2);
  l.report(9, 1);
  l.forget(7);
  assert.equal(l.get(7), 0);
  assert.equal(l.total(), 1);
  l.forget(9);
  assert.equal(l.total(), 0);
});

test('3. zero, a negative, NaN, a string and Infinity all mean nothing unsaved', () => {
  const l = new IdeDirtyLedger();
  l.report(7, 2);
  for (const bad of [0, -1, NaN, '3', Infinity, null, undefined]) {
    l.report(7, 2);
    l.report(7, bad);
    assert.equal(l.get(7), 0, String(bad));
  }
  l.report(7, 2.9);
  assert.equal(l.get(7), 2);
});

test('4. report says whether the count CHANGED, so a repeat does not reopen the question', () => {
  const l = new IdeDirtyLedger();
  assert.equal(l.report(7, 0), false);
  assert.equal(l.report(7, 1), true);
  assert.equal(l.report(7, 1), false);
  assert.equal(l.report(7, 0), true);
});

test('HAS IT RUN: main forgets a window when it closes and when its page reloads', () => {
  const main = fs.readFileSync(path.join(ROOT, 'src/main/index.ts'), 'utf8');
  assert.match(main, /new IdeDirtyLedger\(\)/);
  const closed = main.slice(main.indexOf("win.on('closed', () => {"), main.indexOf("win.on('closed', () => {") + 300);
  assert.match(closed, /ideDirtyByWindow\.forget\(wcId\)/, 'a closed window is still counted at the next quit');
  const nav = main.slice(main.indexOf("win.webContents.on('did-start-navigation'"), main.indexOf("win.webContents.on('did-start-navigation'") + 400);
  assert.match(nav, /ideDirtyByWindow\.forget\(wcId\)/, 'a reloaded page lost its text and kept its count');
});

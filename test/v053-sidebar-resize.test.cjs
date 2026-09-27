'use strict';

/* 0.5.3 rc.4, founder 25 Sep 2026: "The left sidebar should be adjustable.
 * You should be able to increase or decrease the width by clicking on the edge
 * and dragging it." Rules in shared/railWidth.ts; the stored value in
 * professional/railState.ts; the edge in pro/ProSidebar.tsx (RailEdge). */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const W = loadTs('src/shared/railWidth.ts');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
const railState = read('src/renderer/src/components/professional/railState.ts');

test('the width is clamped to 220..480, and anything that is not a number is the default', () => {
  assert.equal(W.RAIL_WIDTH_MIN, 220);
  assert.equal(W.RAIL_WIDTH_MAX, 480);
  assert.equal(W.clampRailWidth(100), 220);
  assert.equal(W.clampRailWidth(9999), 480);
  assert.equal(W.clampRailWidth(333.6), 334);
  assert.equal(W.clampRailWidth('360'), 360, 'localStorage gives a string back');
  for (const bad of [null, undefined, '', 'wide', NaN, Infinity, {}]) assert.equal(W.clampRailWidth(bad), 288, String(bad));
});

test('the default is the sidebar\'s own 288, the width a name needs beside the Orchestrator chip', () => {
  const m = sidebar.match(/export const PRO_SIDEBAR_WIDTH = (\d+);/);
  assert.equal(Number(m[1]), W.RAIL_WIDTH_DEFAULT);
});

test('dragging the edge: toward the content widens it, in Arabic too, and the clamp holds', () => {
  assert.equal(W.dragRailWidth(288, 288, 340, false), 340);
  assert.equal(W.dragRailWidth(288, 288, 250, false), 250);
  assert.equal(W.dragRailWidth(288, 288, 10, false), 220);
  assert.equal(W.dragRailWidth(288, 288, 2000, false), 480);
  // In Arabic the sidebar is on the right: the pointer moving left widens it.
  assert.equal(W.dragRailWidth(288, 1000, 950, true), 338);
  assert.equal(W.dragRailWidth(288, 1000, 1050, true), 238);
});

test('the width is remembered across launches, and a drag stores once, on release', () => {
  assert.match(railState, /const WIDTH_KEY = 'cth\.proRailWidth'/);
  assert.match(railState, /localStorage\.getItem\(WIDTH_KEY\)/, 'read at start');
  assert.match(railState, /if \(persist\) \{ try \{ window\.localStorage\.setItem\(WIDTH_KEY/);
  assert.match(sidebar, /setRailWidth\(last, false\)/, 'every move is drawn without a write');
  assert.match(sidebar, /onResizing\(false\);\s*setRailWidth\(last\);/, 'the release stores it');
});

test('the edge: inner side, col-resize, double click resets, no transition mid drag, gone when collapsed', () => {
  assert.match(sidebar, /width: collapsed \? PRO_SIDEBAR_WIDTH_COLLAPSED : railWidth/);
  assert.match(sidebar, /transition: resizing \? 'none' : 'width 120ms ease'/);
  assert.match(sidebar, /\{!collapsed && <RailEdge /);
  assert.match(sidebar, /insetInlineEnd: -3, width: 6, cursor: 'col-resize'/, 'logical side: flips in Arabic');
  assert.match(sidebar, /onDoubleClick=\{\(\) => setRailWidth\(PRO_SIDEBAR_WIDTH\)\}/);
  assert.match(sidebar, /role="separator" aria-orientation="vertical" tabIndex=\{0\}/, 'keyboard reachable');
});

test('the edge has words in every language', () => {
  for (const lang of ['en', 'ar', 'zh-CN']) {
    const rail = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`)).pro.rail;
    assert.ok(rail.resize && rail.resizeTitle, lang);
  }
});

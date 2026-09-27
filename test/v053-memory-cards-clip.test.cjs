'use strict';

/**
 * 0.5.3, bug 10 (Jinbo, 13 Sep 2026): memory cards were cut off at the right
 * edge. Reproduced in the preview harness, in English and in Chinese alike:
 * the results pane, in card layout, beside a rail dragged wide or in a small
 * window. The card grid had a bare 230px floor, so a pane narrower than one
 * card pushed every card past its edge. The screen's header had the same
 * fault one row up: a search box that would not go under 280px.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PRO = 'src/renderer/src/components/pro';

test('the shared card grid lets a lone column shrink with its pane', () => {
  const ui = read(`${PRO}/ui.tsx`);
  assert.match(ui, /export const CARD_GRID_COLUMNS = 'repeat\(auto-fill, minmax\(min\(230px, 100%\), 1fr\)\)';/);
});

test('the two screens that share the grid no longer carry a bare pixel floor', () => {
  // Other professional grids (bundles, connections, capabilities, puck) keep a
  // pixel floor: they sit in full width panes and sheets and were not seen to
  // clip. Only the grid that did is held here.
  for (const f of ['MemoryScreen.tsx', 'TasksScreen.tsx']) {
    const src = read(`${PRO}/${f}`);
    assert.doesNotMatch(src, /repeat\(auto-fill, minmax\(\d+px, 1fr\)\)/, `${f} has a grid that cannot go under its card width`);
    assert.match(src, /gridTemplateColumns: CARD_GRID_COLUMNS/, `${f} uses the shared grid`);
  }
});

test('the memory header gives way before it pushes Settings off the edge', () => {
  const mem = read(`${PRO}/MemoryScreen.tsx`);
  assert.doesNotMatch(mem, /placeholder=\{t\('pro\.memory\.search'\)\} style=\{\{ minWidth: 280 \}\}/);
  assert.match(mem, /placeholder=\{t\('pro\.memory\.search'\)\} style=\{\{ flex: '0 1 280px', minWidth: 120 \}\}/);
  const ui = read(`${PRO}/ui.tsx`);
  const bar = ui.slice(ui.indexOf('export function Bar('), ui.indexOf('export function SearchBox('));
  assert.match(bar, /\{sub && <span style=\{\{[^}]*minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis'/);
});

test('the preview harness keeps the frame that reproduced it', () => {
  const boards = read('tools/preview/boards.tsx');
  assert.match(boards, /<MemoryFrame \/>/);
  assert.match(boards, /cth\.textSearch = /, 'with hits, or the result cards never draw');
});

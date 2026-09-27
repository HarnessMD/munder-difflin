/**
 * 0.5.3, founder 23 Sep 2026, sidebar change 1: a row's tooltip opens AWAY
 * from its surface, never over sibling rows or cards. A rail row's tip opens
 * to the right of the rail (rail right edge + 8px, top aligned to the row,
 * clamped); a dock card's tip opens above the dock (left aligned to the card).
 * A line with no declared surface keeps the 0.5.2 rule.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { placeTip, SURFACE_GAP, TIP_SURFACE_ATTR } = loadTs('src/shared/tipPlacement.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const viewport = { w: 1440, h: 900 };
const rail = { left: 0, top: 0, right: 244, bottom: 900 };

test('a rail row: right of the rail, top aligned to the row', () => {
  const row = { left: 12, top: 300, right: 230, bottom: 340 };
  const tip = placeTip(row, viewport, { kind: 'rail', box: rail });
  assert.equal(tip.left, rail.right + SURFACE_GAP, 'clears the whole rail, not just the row');
  assert.equal(tip.top, 300, 'top aligned to the hovered row');
  assert.equal(tip.bottom, undefined);
});

test('a rail row near the bottom: the tip moves up once its height is known, and stays in the window', () => {
  const row = { left: 12, top: 860, right: 230, bottom: 890 };
  const tip = placeTip(row, viewport, { kind: 'rail', box: rail, tipHeight: 120 });
  assert.equal(tip.top, viewport.h - 8 - 120);
  assert.equal(tip.left, rail.right + SURFACE_GAP);
});

test('a dock card: above the dock, left aligned to the card, never over the cards beside it', () => {
  const dock = { left: 0, top: 800, right: 1440, bottom: 900 };
  const card = { left: 400, top: 808, right: 636, bottom: 892 };
  const tip = placeTip(card, viewport, { kind: 'dock', box: card });
  assert.equal(tip.left, 400);
  assert.equal(tip.bottom, viewport.h - card.top + SURFACE_GAP, 'its bottom edge sits 8px above the card');
  assert.equal(tip.top, undefined);
  assert.ok(viewport.h - tip.bottom <= dock.top + 8, 'the tip is above the dock');
});

test('no surface declared: the 0.5.2 rule, below the line or above it in the bottom third', () => {
  const line = { left: 20, top: 100, right: 200, bottom: 115 };
  assert.equal(placeTip(line, viewport).top, 115 + 6);
  const low = { left: 20, top: 700, right: 200, bottom: 715 };
  assert.equal(placeTip(low, viewport).bottom, viewport.h - 700 + 6);
});

test('the professional sidebar declares itself a rail, and the tooltip reads the declaration', () => {
  assert.match(read('src/renderer/src/components/pro/ProSidebar.tsx'), new RegExp(`${TIP_SURFACE_ATTR}="rail"`));
  const tip = read('src/renderer/src/components/NoteTooltip.tsx');
  assert.match(tip, /surfaceOf\(el\)/);
  assert.match(tip, /from '@shared\/tipPlacement'/);
});

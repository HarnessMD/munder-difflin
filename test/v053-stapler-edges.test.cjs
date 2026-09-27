'use strict';

/**
 * 0.5.3, founder batch 2, I3: "Stapler modals (send message etc.) get cut off
 * when the Stapler sits near a screen edge; open them fully visible, away from
 * edges."
 *
 * WHAT WAS WRONG. The Stapler's window is a square footprint that grows with
 * the size slider (1028px at the largest). windowFor keeps it on its screen
 * only while the work area is bigger than the square; on a laptop's work area
 * (above the Dock, under the menu bar) a large Stapler hangs off the bottom.
 * The card, the notice, the ring and the capture pair were all placed inside
 * the SQUARE, so they were placed off screen, and the card and the notice at
 * a guessed height. Now main says where the work area lies in the window, and
 * every piece is placed inside the part on screen, the card and the notice
 * 16px clear of a screen edge, at their drawn height.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const P = loadTs('src/shared/puck.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// A 13 inch laptop at its default scale: 1440 by 900 less the menu bar and a Dock.
const LAPTOP = { x: 0, y: 25, width: 1440, height: 800 };
const BIG = 160;
const side = P.ringFootprint(BIG);
const inBox = (x, y, w, h, b) => x >= b.x0 && y >= b.y0 && x + w <= b.x1 && y + h <= b.y1;
const bottomRightOf = (area, size) => ({ x: area.x + area.width - 12 - size / 2, y: area.y + area.height - 12 - size / 2 });

test('the largest Stapler is taller than a laptop work area: windowFor says where the screen ends', () => {
  assert.ok(side > LAPTOP.height, `footprint ${side} against a work area ${LAPTOP.height} tall`);
  const w = P.windowFor(bottomRightOf(LAPTOP, BIG), LAPTOP, BIG);
  assert.equal(w.window.height, side, 'the window is still the whole square');
  assert.ok(w.window.y + side > LAPTOP.y + LAPTOP.height, 'and it hangs off the bottom');
  assert.equal(w.screen.y1, LAPTOP.y + LAPTOP.height - w.window.y, 'the screen ends inside the window');
  assert.deepEqual(P.onScreen(side, w.screen), { x0: 0, y0: 0, x1: side, y1: w.screen.y1 });
  assert.deepEqual(P.onScreen(side, null), { x0: 0, y0: 0, x1: side, y1: side }, 'no screen yet: the whole square');
});

test('cardSpace: 16px from a screen edge, 8px from a bare window edge', () => {
  // In the open on a big screen: every side is only the window's edge.
  const wide = { x: 0, y: 0, width: 3000, height: 2000 };
  const open = P.windowFor({ x: 1500, y: 1000 }, wide, 80);
  const s80 = P.ringFootprint(80);
  assert.deepEqual(P.cardSpace(s80, open.screen), { x0: 8, y0: 8, x1: s80 - 8, y1: s80 - 8 });
  assert.deepEqual(P.cardSpace(s80, null), { x0: 8, y0: 8, x1: s80 - 8, y1: s80 - 8 }, 'the preview: as before 0.5.3');
  // Flush in a corner: those two sides are the screen's.
  const corner = P.windowFor(bottomRightOf(wide, 80), wide, 80);
  assert.deepEqual(P.cardSpace(s80, corner.screen), { x0: 8, y0: 8, x1: s80 - P.EDGE, y1: s80 - P.EDGE });
  // Clipped: the screen ends inside the window, and the space ends EDGE above it.
  const w = P.windowFor(bottomRightOf(LAPTOP, BIG), LAPTOP, BIG);
  assert.equal(P.cardSpace(side, w.screen).y1, w.screen.y1 - P.EDGE);
});

test('at the bottom of a laptop: in the bare square the notice and a picture card were off screen (the control); in the space they are whole', () => {
  const w = P.windowFor(bottomRightOf(LAPTOP, BIG), LAPTOP, BIG);
  const disc = { cx: w.offset.x, cy: w.offset.y, size: BIG };
  const seen = P.onScreen(side, w.screen);
  const space = P.cardSpace(side, w.screen);
  // The notice, the old call: under the disc, below the Dock.
  const oldFlash = P.placeFlash(side, disc, 96);
  assert.ok(oldFlash.top + 96 > seen.y1, `the old notice ends at ${oldFlash.top + 96}, the screen at ${seen.y1}`);
  const flash = P.placeFlash(space, disc, 96);
  assert.ok(inBox(flash.left, flash.top, flash.width, 96, space), JSON.stringify({ flash, space }));
  // A tall capture, the old call: the picture sized by the square, Send off screen.
  const phone = { width: 1170, height: 2532 };
  const oldShot = P.shotBox(phone, side);
  const oldH = P.cardHeight(oldShot);
  const oldCard = P.placeCard({ w: P.CARD.w, h: oldH }, side, disc, null);
  assert.ok(oldCard.top + oldH > seen.y1, `the old card ends at ${oldCard.top + oldH}, the screen at ${seen.y1}`);
  const h = P.cardHeight(P.shotBox(phone, space));
  const c = P.placeCard({ w: P.CARD.w, h }, space, disc, null);
  assert.ok(inBox(c.left, c.top, P.CARD.w, h, space), `card ${h} tall at ${c.top} in ${JSON.stringify(space)}`);
});

test('every size, every corner, edge and middle of four screens: the card and the notice are whole inside the space', () => {
  const screens = [LAPTOP, { x: 0, y: 0, width: 1280, height: 680 }, { x: -1920, y: 0, width: 1920, height: 1040 }, { x: 0, y: 25, width: 2560, height: 1350 }];
  for (const area of screens) {
    for (const size of [48, 80, 120, 160]) {
      const s = P.ringFootprint(size);
      for (const fx of [0, 0.5, 1]) for (const fy of [0, 0.5, 1]) {
        const w = P.windowFor({ x: area.x + fx * area.width, y: area.y + fy * area.height }, area, size);
        const disc = { cx: w.offset.x, cy: w.offset.y, size };
        const space = P.cardSpace(s, w.screen);
        const where = `${size} at ${fx},${fy} on ${JSON.stringify(area)}`;
        for (const h of [P.CARD.baseH, 320]) {
          const c = P.placeCard({ w: P.CARD.w, h }, space, disc, null);
          assert.ok(inBox(c.left, c.top, P.CARD.w, h, space), `${where}: card ${JSON.stringify(c)} ${h} tall in ${JSON.stringify(space)}`);
        }
        const f = P.placeFlash(space, disc, 96);
        assert.ok(inBox(f.left, f.top, f.width, 96, space), `${where}: notice ${JSON.stringify(f)} in ${JSON.stringify(space)}`);
        // Every side of the space that is a screen edge is EDGE inside it.
        const seen = P.onScreen(s, w.screen);
        if (w.screen.y1 <= s) assert.equal(space.y1, seen.y1 - P.EDGE, `${where}: bottom`);
        if (w.screen.x1 <= s) assert.equal(space.x1, seen.x1 - P.EDGE, `${where}: right`);
      }
    }
  }
});

test('the ring and the capture pair read their room from the part on screen', () => {
  const w = P.windowFor(bottomRightOf(LAPTOP, BIG), LAPTOP, BIG);
  const room = P.roomIn(P.onScreen(side, w.screen), w.offset.x, w.offset.y);
  assert.equal(room.bottom, w.screen.y1 - w.offset.y);
  assert.equal(P.capturePair(BIG, room).below, false, 'no room under the disc on screen: the pair goes above');
  const bare = { left: w.offset.x, right: side - w.offset.x, top: w.offset.y, bottom: side - w.offset.y };
  assert.equal(P.capturePair(BIG, bare).below, true, 'the control: the bare square says there is room, below the Dock');
});

test('wiring: main sends where the screen is, the page places everything inside it at its drawn height', () => {
  const main = read('src/main/puck.ts');
  assert.match(main, /const \{ window: bounds, offset, screen: onIt \} = windowFor\(t\.centre, t\.area, cfg\.size\);/);
  // rc.4: when the system moved the window, the offset and screen are taken from where it really is.
  assert.match(main, /const screenIn = real === bounds \? onIt : \{ x0: t\.area\.x - real\.x/);
  assert.match(main, /setState\(\{ offset: at, screen: screenIn \}, true\);/);
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  assert.match(app, /const room = roomIn\(onScreen\(side, st\.screen\), cx, cy\);\n  const space = cardSpace\(side, st\.screen\);/);
  assert.match(app, /return ringLayout\(actions, size, room\);/);
  assert.match(app, /const pair = placePair\(size, \{ cx, cy \}, room, space, cardBox\);/);
  assert.match(app, /const ro = new ResizeObserver\(read\);/, 'the card is measured as it grows');
  assert.match(app, /<div ref=\{cardRef\} className="puck-card"/);
  assert.match(app, /<div ref=\{flashRef\} className=\{`puck-flash/);
  assert.doesNotMatch(app, /\{ left: cx, right: side - cx, top: cy, bottom: side - cy \}/, 'no room read off the bare square');
  assert.equal(P.DEFAULT_PUCK_STATE.screen, null, 'before main places it, the whole window');
});

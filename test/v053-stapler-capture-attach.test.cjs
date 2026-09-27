'use strict';

/**
 * 0.5.3, founder 25 Sep 2026, on a6ed8259: "The done and cancel button should
 * be at top above the send message screen and even when we click screenshot
 * it is not getting shown as attached."
 *
 * PLACEMENT. With the compose card open, Capture and Cancel (and Done and
 * Cancel) sat below the disc, over the card's corner and past the screen edge
 * ("Cance"). shared/puck placePair puts the pair above the card, else below
 * it, else beside it, inside the part of the window on screen, clear of the
 * card and the disc. The rule runs for real here, with the Stapler at every
 * edge and corner.
 *
 * ATTACH. A capture that failed after Capture answered only the overlay,
 * which main closes at once, so nobody said anything and the card stayed as
 * it was. Main now tells the Stapler; macOS's empty picture with access
 * "granted" (a grant held by an older build) gets its own reason. A picture
 * that does arrive on a message card shows as a chip with a remove x, and
 * the card keeps its words.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const P = loadTs('src/shared/puck.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const APP = read('src/renderer/src/puck/PuckApp.tsx');

const SIZE = 80;
// The card as the PRO kit draws it: 292 plus padding and border.
const CARD_W = 318;
const CARD_H = 232;
// A 13 inch laptop's work area; the Stapler dragged to each edge and corner.
// windowFor (main's own rule) clamps it, places the window and says where the
// disc sits in it and where the screen lies in it.
const AREA = { x: 0, y: 25, width: 1440, height: 800 };
const X = { l: 0, m: 720, r: 1440 };
const Y = { t: 25, m: 425, b: 825 };
const PLACES = {
  'top-left': [X.l, Y.t], top: [X.m, Y.t], 'top-right': [X.r, Y.t], right: [X.r, Y.m],
  'bottom-right': [X.r, Y.b], bottom: [X.m, Y.b], 'bottom-left': [X.l, Y.b], left: [X.l, Y.m], middle: [X.m, Y.m]
};

function scene([x, y], size = SIZE) {
  const side = P.ringFootprint(size);
  const w = P.windowFor({ x, y }, AREA, size);
  const cx = w.offset.x; const cy = w.offset.y;
  const space = P.cardSpace(side, w.screen);
  const room = P.roomIn(P.onScreen(side, w.screen), cx, cy);
  const at = P.placeCard({ w: CARD_W, h: CARD_H }, space, { cx, cy, size }, null);
  const card = { x0: at.left, y0: at.top, x1: at.left + CARD_W, y1: at.top + CARD_H };
  const disc = { x0: cx - size / 2, x1: cx + size / 2, y0: cy - size / 2, y1: cy + size / 2 };
  return { side, cx, cy, space, room, card, disc, size };
}

function pairBox(pp) {
  const half = pp.button / 2;
  const wing = pp.dx + Math.max(half, P.PAIR_LABEL_HALF);
  const top = Math.min(pp.y - half, pp.labelTop - 10);
  const bottom = Math.max(pp.y + half, pp.labelTop + 10);
  return { x0: pp.x - wing, x1: pp.x + wing, y0: top, y1: bottom };
}
const meets = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const within = (a, s) => a.x0 >= s.x0 && a.x1 <= s.x1 && a.y0 >= s.y0 && a.y1 <= s.y1;

test('with the card open, the pair sits above it wherever there is room: whole, on screen, clear of card and disc', () => {
  for (const size of [56, 80, 120]) {
    for (const [name, spot] of Object.entries(PLACES)) {
      const { cx, cy, space, room, card, disc } = scene(spot, size);
      const pp = P.placePair(size, { cx, cy }, room, space, card);
      const box = pairBox(pp);
      const where = `${name} at size ${size}`;
      assert.ok(within(box, space), `${where}: the pair or a label leaves the screen ${JSON.stringify({ box, space })}`);
      assert.ok(!meets(box, card), `${where}: the pair covers the card`);
      assert.ok(!meets(box, disc), `${where}: the pair covers the disc`);
      assert.notEqual(pp.at, 'disc', `${where}: fell back to the disc rule with a card open`);
      if (!name.startsWith('top')) assert.equal(pp.at, 'above', `${where}: room above the card, yet ${pp.at}`);
      if (pp.at === 'above') assert.ok(box.y1 <= card.y0, `${where}: not above the card`);
    }
  }
});

test('the founder\'s case: the Stapler at the right edge, the card to its left; the pair above the card, Cancel whole', () => {
  const { cx, cy, space, room, card } = scene(PLACES.right);
  assert.ok(card.x1 <= cx, 'the card sits left of the disc here');
  const pp = P.placePair(SIZE, { cx, cy }, room, space, card);
  assert.equal(pp.at, 'above');
  assert.ok(pp.x + pp.dx + P.PAIR_LABEL_HALF <= space.x1, 'Cancel\'s label is cut at the screen edge');
  assert.ok(pp.x + pp.dx <= card.x1 && pp.x - pp.dx >= card.x0, 'the pair sits over the card, not over the disc');
  // The control: the old rule put the pair under the disc, over the card.
  const old = P.capturePair(SIZE, room);
  const oldBox = { x0: cx - old.cancel.x - P.PAIR_LABEL_HALF, x1: cx + old.cancel.x + P.PAIR_LABEL_HALF, y0: cy + old.y - old.button / 2, y1: cy + old.y + old.button / 2 };
  assert.ok(!within(oldBox, space), 'the old placement was already whole on screen here, so this case proves nothing');
});

test('no room above the card: below it; no room above or below: beside it; never over it', () => {
  const card = { x0: 40, y0: 20, x1: 358, y1: 590 };
  const space = { x0: 16, y0: 16, x1: 600, y1: 594 };
  const room = P.roomIn(space, 480, 300);
  const side = P.placePair(SIZE, { cx: 480, cy: 300 }, room, space, card);
  assert.equal(side.at, 'right', 'the card fills the height: the pair goes beside it');
  assert.ok(!meets(pairBox(side), card));
  const low = P.placePair(SIZE, { cx: 480, cy: 300 }, room, space, { x0: 40, y0: 20, x1: 358, y1: 300 });
  assert.equal(low.at, 'below');
});

test('no card: the disc rule as before, slid sideways so a label never leaves the screen', () => {
  for (const [name, spot] of Object.entries(PLACES)) {
    const { cx, cy, space, room } = scene(spot);
    const pp = P.placePair(SIZE, { cx, cy }, room, space, null);
    const old = P.capturePair(SIZE, room);
    assert.equal(pp.at, 'disc');
    assert.equal(pp.y, cy + old.y, `${name}: not the disc rule's height`);
    assert.ok(within(pairBox(pp), space), `${name}: the pair runs off screen (Cance)`);
  }
  const m = scene(PLACES.middle);
  assert.equal(P.placePair(SIZE, { cx: m.cx, cy: m.cy }, m.room, m.space, null).x, m.cx, 'with room, straight under the disc as before');
});

test('the page places both pairs by that rule, from the card as drawn, and claims the mouse for them', () => {
  assert.match(APP, /const CARD_W = Math\.max\(CARD\.w, cardDrawnW\);/);
  assert.match(APP, /const cardBox = compose && cardVisible\n\s+\? \{ x0: Number\(cardStyle\.left\), y0: Number\(cardStyle\.top\), x1: Number\(cardStyle\.left\) \+ CARD_W, y1: Number\(cardStyle\.top\) \+ CARD_H \}\n\s+: null;/);
  assert.match(APP, /const pair = placePair\(size, \{ cx, cy \}, room, space, cardBox\);/);
  assert.equal((APP.match(/style=\{\{ left: pair\.x, top: pair\.y, width: pair\.button, height: pair\.button,/g) || []).length, 2, 'Capture/Cancel and Done/Cancel both use it');
  assert.equal((APP.match(/left: pair\.x \+ x, top: pair\.labelTop/g) || []).length, 2);
  assert.doesNotMatch(APP, /capturePair\(/, 'a pair still placed by the disc alone');
  // Off the disc, so the window must claim the mouse (the #117 lesson).
  assert.match(APP, /const wantMouse = [^;]*st\.capturing[^;]*ringTake/);
});

test('a capture that fails after Capture reaches the Stapler, with its reason', () => {
  const main = read('src/main/puck.ts');
  assert.match(main, /ipcMain\.handle\('puck:captureConfirm', async \(_e, rect: unknown\) => \{\n\s+const r = await capture\(rect\);[\s\S]*?if \(!r\.ok\) \{ try \{ if \(win && !win\.isDestroyed\(\)\) win\.webContents\.send\('puck:captureFailed', \{ error: r\.error \}\);/);
  assert.match(main, /error: screenAccess\(\) === 'granted' \? 'screen-empty' : 'screen-denied'/, 'an empty picture with access granted says so');
  // The first grab after start can be empty and the next one fine: ask again.
  assert.match(main, /for \(let i = 0; i < CAPTURE_RETRIES && src && src\.thumbnail\.isEmpty\(\); i\+\+\) \{\n\s+await sleep\(CAPTURE_RETRY_MS\);\n\s+src = await grab\(\);/);
  assert.match(main, /export const CAPTURE_RETRIES = 3;\nexport const CAPTURE_RETRY_MS = 300;/);
  const pre = read('src/preload/index.ts');
  assert.match(pre, /onPuckCaptureFailed: \(cb: \(e: \{ error: string \}\) => void\)[\s\S]*?ipcRenderer\.on\('puck:captureFailed', listener\);/);
  assert.match(APP, /window\.cth\.onPuckCaptureFailed\(\(e\) => captureFailRef\.current\?\.\(e\.error\)\)/);
  assert.match(APP, /offShotFail\(\); \};/, 'the listener is removed with the others');
  assert.match(APP, /captureFailRef\.current = captureProblem;/);
  assert.match(APP, /if \(error === 'screen-denied' \|\| error === 'screen-empty'\)/);
});

test('a picture added to a message shows as a chip with a remove x; the words stay; Send carries it', () => {
  assert.match(APP, /const attached = prev\?\.kind === 'message' \|\| \(prev\?\.kind === 'screenshot' && prev\.attached === true\);/);
  assert.match(APP, /if \(prev\?\.kind !== 'message' && prev\?\.kind !== 'screenshot'\) setNote\(''\);/, 'the card\'s text is wiped by the capture');
  assert.match(APP, /\{compose\.kind === 'screenshot' && compose\.attached && \(\n\s+<div className="puck-attached"/);
  assert.match(APP, /<div key=\{s\.path\} className="puck-chip" data-chip>/);
  assert.match(APP, /if \(cur\.attached && cur\.shots\.length === 1\) \{\n\s+const msg: Compose = \{ kind: 'message', text: '' \};/, 'the last chip removed leaves the message');
  assert.match(APP, /const cardTitle = compose\?\.kind === 'screenshot' && !compose\.attached \?/, 'the card stays Send message');
  assert.match(APP, /compose\.kind === 'screenshot' \? \{ note: text, screenshots: compose\.shots\.map\(\(s\) => s\.path\) \}/, 'Send carries the pictures');
  const css = read('src/renderer/src/puck/puck.css');
  assert.match(css, /\.puck-card \.puck-chip \{[^}]*border: 1px solid var\(--cth-ink-300\);/, 'one even border');
});

test('strings in every language, no dashes', () => {
  for (const l of ['en', 'ar', 'zh-CN']) {
    const p = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.puck;
    for (const s of [p.card.chip, p.card.attached, p.flash.screenEmpty]) {
      assert.ok(s && s.trim(), `${l}: empty`);
      assert.doesNotMatch(s, /[–—]| - /, `${l}: ${s}`);
    }
    assert.match(p.card.chip, /\{\{n\}\}/);
    assert.match(p.card.attached, /\{\{count\}\}/);
  }
});

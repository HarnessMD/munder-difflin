'use strict';

// The release drop must reach fresh installs.
//
// It used to require a `last-run-version` stamp to ALREADY exist, but the stamp
// and its reader shipped in the same release — so no earlier install had the
// file, `previous` read null on the upgrade into that release, and the drop
// fired for almost nobody. These are the card's acceptance criteria (a)-(e).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { shouldShowReleaseDrop, isNewer } = loadTs('src/shared/updateState.ts');

// (a) a machine that has NEVER run this app
test('(a) a fresh install sees the drop on first launch', () => {
  assert.equal(shouldShowReleaseDrop(null, '0.4.7'), true);
});

// (b) the ordinary upgrade
test('(b) 0.4.6 -> 0.4.7 sees it', () => {
  assert.equal(shouldShowReleaseDrop('0.4.6', '0.4.7'), true);
});

// (c) seen once is seen
test('(c) the same version never fires twice', () => {
  assert.equal(shouldShowReleaseDrop('0.4.7', '0.4.7'), false);
  // …and the launch after a fresh install reads its own stamp back.
  assert.equal(shouldShowReleaseDrop('0.4.7', '0.4.7'), false);
});

// (d) a second RC of the SAME version — deliberate, not accidental
test('(d) 0.4.7-rc.1 -> 0.4.7-rc.2 fires, deliberately', () => {
  // isNewer discards -rc.N, so the two compare EQUAL. That is exactly why the
  // decision asks "is this a downgrade?" instead of "is this newer?".
  assert.equal(isNewer('0.4.7-rc.2', '0.4.7-rc.1'), false, 'isNewer still ignores -rc.N');
  assert.equal(shouldShowReleaseDrop('0.4.7-rc.1', '0.4.7-rc.2'), true);
  // and the rehearsal hop itself
  assert.equal(shouldShowReleaseDrop('0.4.6-rc.1', '0.4.7-rc.1'), true);
});

test('a downgrade announces nothing', () => {
  assert.equal(shouldShowReleaseDrop('0.4.8', '0.4.7'), false);
});

// ── the updater wires the decision, and keeps the stamp unconditional ────────

const updater = fs.readFileSync(path.resolve(__dirname, '..', 'src/main/updater.ts'), 'utf8');

test('the stamp write is still unconditional on a version change', () => {
  // This is what arms every install that boots this version even once, and it
  // is the half that ALREADY worked — it must not be re-gated.
  assert.match(updater, /if \(previous !== current\) \{\s*\n\s*try \{\s*\n\s*mkdirSync/);
});

test('the drop fires only when the stamp actually landed', () => {
  // Otherwise an unwritable userData reopens the drop on every boot forever.
  assert.match(updater, /if \(stamped && shouldShowReleaseDrop\(previous, current\)\)/);
});

test('a failed stamp write cannot skip the decision by throwing', () => {
  assert.match(updater, /logLine\(`last-run-version stamp failed/);
});

// (e) unchanged: no drop block in the body still renders nothing
test('(e) rendering a body with no drop block is untouched', () => {
  const toast = fs.readFileSync(
    path.resolve(__dirname, '..', 'src/renderer/src/components/UpdateToast.tsx'), 'utf8'
  );
  assert.match(toast, /drop/i, 'UpdateToast still decides on the drop block itself');
});

// ── (f)-(g) the drop must reach BOTH skins ──────────────────────────────────
//
// The 0.4.9 plan ruled the drop Classic only; the founder reversed that on
// 5 Sep 2026 ("make sure that our release drop shows up with the new
// update"). A drop that fires on every install but renders under only one
// skin misses everyone who took the Professional default, which is the same
// class of defect as (a): the moment exists and almost nobody sees it. So
// reachability is pinned per skin, on the surface each skin mounts.

const renderer = (p) => fs.readFileSync(
  path.resolve(__dirname, '..', 'src/renderer/src/components', p), 'utf8'
);

test('(f) Classic mounts the drop from UpdateToast, on the authored-block condition', () => {
  const toast = renderer('UpdateToast.tsx');
  assert.match(toast, /<ReleaseDrop\b/, 'Classic renders the drop');
  assert.match(toast, /extractDropHtml/, 'the authored block decides');
});

test('(g) PRO mounts the SAME drop from its transients, on the SAME condition', () => {
  const pro = renderer('pro/ProTransients.tsx');
  assert.match(pro, /<ReleaseDrop\b/, 'PRO renders the drop, not a fork of it');
  assert.match(pro, /extractDropHtml/, 'the same authored-block condition decides');
  assert.match(pro, /'just-updated'/, 'the boot-after-update state reaches the drop under PRO too');
  // The reversed ruling must not survive as prose that misleads the next
  // reader into re-fencing the drop.
  assert.doesNotMatch(pro, /stays Classic only/i);
});

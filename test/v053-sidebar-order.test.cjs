'use strict';

/* 0.5.3, founder 24 Sep 2026: "a setting that should be not enabled by default
 * ... flips this toggle and saves that's when this should start being in
 * effect ... toggle is off ... not allowed to change the position ... toggle
 * is on they should be allowed to change the position of agents in the
 * sidebar. make sure the ui ... when user drags any particular agent up or
 * down is smooth". Rules in shared/agentOrder.ts; drag in pro/railOrder.tsx. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const O = loadTs('src/shared/agentOrder.ts');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const ids = (xs) => xs.map((a) => a.id);
const god = { id: 'god', isGod: true };
const A = (id) => ({ id });

test('the saved order is drawn; the orchestrator stays pinned first', () => {
  const auto = [god, A('angela'), A('dwight'), A('oscar'), A('pam')];
  assert.deepEqual(ids(O.applyAgentOrder(auto, ['pam', 'oscar', 'angela', 'dwight'])), ['god', 'pam', 'oscar', 'angela', 'dwight']);
  // Recency moving someone to the top changes nothing while the setting is on.
  const recent = [god, A('dwight'), A('pam'), A('angela'), A('oscar')];
  assert.deepEqual(ids(O.applyAgentOrder(recent, ['pam', 'oscar', 'angela', 'dwight'])), ['god', 'pam', 'oscar', 'angela', 'dwight']);
});

test('a new agent goes to the end; a removed one drops out', () => {
  const auto = [god, A('newbie'), A('pam'), A('oscar')];
  assert.deepEqual(ids(O.applyAgentOrder(auto, ['oscar', 'gone', 'pam'])), ['god', 'oscar', 'pam', 'newbie']);
});

test('a move stays inside its group, clamped, and never mutates the input', () => {
  const groups = [['angela', 'dwight', 'oscar', 'pam'], ['kevin']];
  const next = O.moveInGroup(groups, 'pam', 0);
  assert.deepEqual(next, [['pam', 'angela', 'dwight', 'oscar'], ['kevin']]);
  assert.deepEqual(groups[0], ['angela', 'dwight', 'oscar', 'pam']);
  assert.deepEqual(O.moveInGroup(groups, 'angela', 99), [['dwight', 'oscar', 'pam', 'angela'], ['kevin']]);
  assert.deepEqual(O.moveInGroup(groups, 'kevin', -5), groups);
  assert.deepEqual(O.orderFromGroups(next), ['pam', 'angela', 'dwight', 'oscar', 'kevin']);
});

test('Move up / Move down, and when they are offered', () => {
  const groups = [['angela', 'dwight', 'oscar'], ['kevin']];
  assert.deepEqual(O.moveBy(groups, 'oscar', -1)[0], ['angela', 'oscar', 'dwight']);
  assert.equal(O.canMove(groups, 'angela', -1), false);
  assert.equal(O.canMove(groups, 'oscar', 1), false);
  assert.equal(O.canMove(groups, 'dwight', 1), true);
  assert.equal(O.canMove(groups, 'kevin', 1), false, 'alone in its group');
  assert.equal(O.canMove(groups, 'god', 1), false, 'the orchestrator is in no group');
});

test('where a dragged row lands and how far the others slide', () => {
  const centres = [10, 50, 90, 130];
  assert.equal(O.dropIndex(centres, 3, 5), 0, 'dragged above the first');
  assert.equal(O.dropIndex(centres, 0, 95), 2, 'past the third centre');
  assert.equal(O.dropIndex(centres, 1, 50), 1, 'not moved');
  // Row 3 held over index 0: rows 0..2 slide down one slot, nothing else.
  assert.deepEqual([0, 1, 2, 3].map((i) => O.shiftFor(i, 3, 0, 40)), [40, 40, 40, 0]);
  assert.deepEqual([0, 1, 2, 3].map((i) => O.shiftFor(i, 0, 2, 40)), [0, -40, -40, 0]);
});

test('the stored list is unique trimmed ids, bounded', () => {
  assert.deepEqual(O.normalizeAgentOrder([' pam ', 'pam', '', 3, null, 'oscar']), ['pam', 'oscar']);
  assert.deepEqual(O.normalizeAgentOrder('pam'), []);
  assert.equal(O.normalizeAgentOrder(Array.from({ length: 5000 }, (_, i) => `a${i}`)).length, O.AGENT_ORDER_MAX);
  assert.match(read('src/main/config.ts'), /if \(patch\.agentOrder !== undefined\) next\.agentOrder = normalizeAgentOrder\(patch\.agentOrder\);/);
});

test('Settings: off by default, on the page draft, applies on Save', () => {
  const s = read('src/renderer/src/components/SettingsModal.tsx');
  assert.match(s, /const keepOrderSaved = cfgX\.keepAgentOrder === true;/, 'absent reads as off');
  assert.match(s, /const keepOrder = draft\.value<boolean>\('keepAgentOrder', keepOrderSaved\);/);
  assert.match(s, /else draft\.stage\(\{ keepAgentOrder: next \}\);/, 'staged, not written');
  assert.match(s, /<InfoTip text=\{t\('settings\.general\.keepAgentOrderInfo'\)\}/);
  for (const loc of ['en', 'ar', 'zh-CN']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    for (const v of [j.settings.general.keepAgentOrder, j.settings.general.keepAgentOrderInfo, j.pro.rail.dragToMove, j.pro.rail.menu.moveUp, j.pro.rail.menu.moveDown]) {
      assert.ok(typeof v === 'string' && v.length > 0, loc);
      assert.doesNotMatch(v, /[–—]|\s-\s/, `${loc}: no dash`);
    }
  }
});

test('the rail: order only when on, no grip when off, searching or collapsed, orchestrator never moves', () => {
  const bar = read('src/renderer/src/components/pro/ProSidebar.tsx');
  assert.match(bar, /keep && savedList && savedList\.length \? applyAgentOrder\(autoOrdered, savedList\) : autoOrdered/);
  assert.match(bar, /useRailDrag\(keep && !searching && !collapsed, orderGroups, commitOrder\)/);
  assert.match(bar, /return a\.isGod \? row : railDrag\.wrap\(a\.id, row, a\.name\);/);
  assert.match(bar, /if \(!keep \|\| \(savedAgentOrder && savedAgentOrder\.length\) \|\| froze\.current\) return;/, 'frozen once, from the screen');
  assert.match(bar, /railOrder\.canMove\(agent\.id, -1\) \? \[\{ id: 'moveUp'/);
  assert.match(read('src/renderer/src/components/pro/ProShell.tsx'), /keepAgentOrder=\{config\?\.keepAgentOrder === true\}/);
});

test('the drag: transform only, 150 ms, reduced motion respected, one write on release', () => {
  const d = read('src/renderer/src/components/pro/railOrder.tsx');
  assert.match(d, /'transform 150ms ease'/);
  assert.match(d, /prefers-reduced-motion: reduce/);
  assert.match(d, /if \(d\.to !== d\.from\) commit\(moveInGroup\(groupsRef\.current, d\.id, d\.to\)\);/);
  assert.doesNotMatch(d, /updateConfig/, 'the rail writes, not the drag');
  assert.match(d, /touchAction: 'none'/);
  // The page wide reduced motion rule covers these transitions too.
  assert.doesNotMatch(d, /requestAnimationFrame/, 'PRO keeps one JS animation owner (pro-phase6)');
});

/* Batch 3 (founder, 25 Sep 2026, #17 and #18: "reorder does not work at
 * all"). The grip was hover only on the row's left edge; now a handle under
 * every avatar, and project headings drag too. */

test('projects keep the dragged order; unknown ones after; no project stays last', () => {
  const G = (key) => ({ key });
  const groups = [G('work'), G('acme'), G('site'), G('')];
  assert.deepEqual(O.applyGroupOrder(groups, ['site', 'work']).map((g) => g.key), ['site', 'work', 'acme', '']);
  assert.deepEqual(O.applyGroupOrder(groups, ['gone', 'acme']).map((g) => g.key), ['acme', 'work', 'site', '']);
  assert.deepEqual(O.applyGroupOrder(groups, []).map((g) => g.key), ['work', 'acme', 'site', '']);
  assert.deepEqual(O.moveInGroup([['work', 'acme', 'site']], 'site', 0), [['site', 'work', 'acme']]);
  assert.match(read('src/main/config.ts'), /if \(patch\.projectOrder !== undefined\) next\.projectOrder = normalizeAgentOrder\(patch\.projectOrder\);/);
});

test('the rail: project order only while on, headings drag with a threshold, a handle under each avatar', () => {
  const bar = read('src/renderer/src/components/pro/ProSidebar.tsx');
  assert.match(bar, /keep && projectList && projectList\.length \? applyGroupOrder\(gs, projectList\) : gs/, 'off: automatic order');
  assert.match(bar, /useRailDrag\(keep && !searching && !collapsed && headings, projectKeys, commitProjects\)/);
  assert.match(bar, /updateConfig\(\{ projectOrder: keys \}\)/);
  assert.match(bar, /onPointerDown=\{movable \? \(e\) => projectDrag\.headingDown\(e, g\.key\) : undefined\}/);
  assert.match(bar, /cursor: movable \? \(projectDrag\.dragging === g\.key \? 'grabbing' : 'grab'\) : 'pointer'/);
  assert.match(read('src/renderer/src/components/pro/ProShell.tsx'), /savedProjectOrder=\{config\?\.projectOrder\}/);
  const d = read('src/renderer/src/components/pro/railOrder.tsx');
  assert.match(d, /if \(Math\.abs\(dy\) < DRAG_THRESHOLD\) return;/, 'a heading press that does not move stays a click');
  assert.match(d, /if \(d\.armed\) \{ setDrag\(null\); return; \}/);
  assert.match(d, /swallowNextClick\(\);/, 'the release after a drag folds nothing and opens nothing');
  assert.match(d, /position: 'absolute', top: GRIP_TOP, width: GRIP_WIDTH/);
  const css = read('src/renderer/src/design/global.css');
  assert.match(css, /\.cth-order-grip \{ opacity: 0\.45;/, 'always shown while on, not hover only');
  assert.doesNotMatch(css, /\.cth-order-grip \{ opacity: 0;/);
  for (const loc of ['en', 'ar', 'zh-CN']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    assert.match(j.pro.rail.dragProject, /\{\{name\}\}/);
    assert.doesNotMatch(j.pro.rail.dragProject + j.settings.general.keepAgentOrderInfo, /\u2014/);
  }
});

test('the handle is centred on the avatar, left to right and in Arabic (founder retest, 25 Sep)', () => {
  const d = read('src/renderer/src/components/pro/railOrder.tsx');
  const bar = read('src/renderer/src/components/pro/ProSidebar.tsx');
  // The avatar: <SpritePortrait size={28}> in a row padded 6 6 6 CARD_PAD_LEFT.
  assert.match(bar, /<SpritePortrait character=\{agent\.character\} size=\{28\} \/>/);
  assert.match(bar, /padding: `6px 6px 6px \$\{CARD_PAD_LEFT\}px`/);
  assert.match(bar, /const CARD_PAD_LEFT = 10;/);
  assert.match(d, /const ROW_PAD_LEFT = 10;/);
  assert.match(d, /const ROW_PAD_RIGHT = 6;/);
  assert.match(d, /const AVATAR_W = portraitBox\(28\)\.w;/, 'the real width, not the 28 it was asked for');
  assert.match(d, /const GRIP_LTR = ROW_PAD_LEFT \+ AVATAR_W \/ 2 - GRIP_WIDTH \/ 2;/);
  assert.match(d, /const GRIP_RTL = ROW_PAD_RIGHT \+ AVATAR_W \/ 2 - GRIP_WIDTH \/ 2;/);
  const css = read('src/renderer/src/design/global.css');
  assert.match(css, /\.cth-order-grip \{[^}]*left: var\(--cth-grip-ltr\);/);
  assert.match(css, /\[dir="rtl"\] \.cth-order-grip \{ left: auto; right: var\(--cth-grip-rtl\); \}/);
});

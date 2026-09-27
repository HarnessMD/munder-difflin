'use strict';

/**
 * SETTINGS UNDER PRO (0.4.10). Founder, 4 Sep 2026: "The settings page still
 * needs to be redesigned, the sidebar and content still uses older design of
 * classic page, update it to make it fit our overall design."
 *
 * PRO's Settings page is the Classic SettingsModal embedded with
 * `chrome="inline"`. Until this release that prop dropped the overlay and the
 * dialog frame and NOTHING ELSE, so everything under the kit Bar — the left
 * nav, the headings, the inputs, the footer — was still the pixel form: an 8px
 * display face, square corners, borderless inputs on an inset shadow, a 2px
 * right edge on the nav and a 2px top edge on the footer.
 *
 * The fix could not be a PRO fork. test/pro-049-sweep.test.cjs refuses a
 * `pro/SettingsModal.tsx` on purpose: one component means the two skins cannot
 * drift on what a setting DOES. So the markup stayed one copy and only the
 * STYLE forked, into pro/settings/chrome.ts, which answers each shape twice.
 *
 * WHAT THIS FILE PINS, and each line is a thing that was actually wrong:
 *   1. No hex literal survives in the form. Three were `#6E1423`, the danger
 *      red, which is theme blind: the app has a light and a dark skin.
 *   2. No `2px solid` edge survives. Two did, on the nav and the footer, and
 *      the house rule is 1px on every edge with no exception.
 *   3. The PRO branch is built from radius tokens, the kit's fonts and the
 *      kit's surfaces, and it never inverts the active nav row.
 *   4. Classic did not move. Every Classic value is asserted by hand here, so
 *      a PRO shape leaking across the branch fails loudly rather than quietly
 *      restyling a modal 0.4.9 users are looking at right now.
 *
 * The style module is React free so it can be LOADED, not grepped: these read
 * the actual objects the form renders with.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
/** Comments off first: this file's own prose names the things it forbids. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const MODAL_PATH = 'src/renderer/src/components/SettingsModal.tsx';
const CHROME_PATH = 'src/renderer/src/components/pro/settings/chrome.ts';
const SCREEN_PATH = 'src/renderer/src/components/pro/SettingsScreen.tsx';

const MODAL = strip(read(MODAL_PATH));
const CHROME_SRC = strip(read(CHROME_PATH));
const { settingsChrome } = loadTs(CHROME_PATH);
const classic = settingsChrome('modal');
const pro = settingsChrome('inline');

/** Every string value anywhere in a style object, functions expanded. */
function values(style) {
  const out = [];
  for (const v of Object.values(style)) {
    if (typeof v === 'string') out.push(v);
    else if (typeof v === 'number') out.push(String(v));
  }
  return out;
}
function everyStyle(set) {
  const out = [];
  for (const v of Object.values(set)) {
    if (typeof v === 'function') { out.push(v(true)); out.push(v(false)); }
    else out.push(v);
  }
  return out;
}

/* ── 1. no hex, anywhere, in either skin ─────────────────────────────────── */

test('the Settings form carries no hardcoded colour, in the markup or in the chrome', () => {
  // `#6E1423` sat on the change-home error, the webhook warning and the Danger
  // Zone heading. A hex cannot follow the theme, and Classic and PRO each have
  // a dark mode, so all three read as a light-mode red on four of eight skins.
  for (const [file, src] of [[MODAL_PATH, MODAL], [CHROME_PATH, CHROME_SRC], [SCREEN_PATH, strip(read(SCREEN_PATH))]]) {
    const hits = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    assert.deepEqual(hits, [], `${file} carries a literal colour: ${hits.join(', ')}`);
  }
  // Including the silent kind: `var(--cth-name, #hex)` passes a hex grep and a
  // token grep and follows neither. Two of those were live here, both naming
  // the undeclared `--cth-mint-700`.
  assert.doesNotMatch(MODAL, /var\(\s*--cth-[A-Za-z0-9-]+\s*,\s*#/, 'a hex is hiding in a token fallback');
  assert.doesNotMatch(CHROME_SRC, /var\(\s*--cth-[A-Za-z0-9-]+\s*,\s*#/, 'a hex is hiding in a token fallback');
});

test('the three danger colours are the blocked status token, in both skins', () => {
  for (const [name, set] of [['classic', classic], ['pro', pro]]) {
    assert.equal(set.errorText.color, 'var(--cth-status-blocked)', `${name} error text`);
    assert.equal(set.dangerHead.color, 'var(--cth-status-blocked)', `${name} Danger Zone heading`);
  }
  // And the form reaches for them rather than writing a colour of its own.
  assert.match(MODAL, /<div style=\{errorText\}>\{changeErr\}<\/div>/);
  // (The webhook warning that also read errorText left with the Connections
  // markup for components/settings in 0.5.3; its point is an (i) there now.)
  assert.match(MODAL, /<div style=\{dangerHead\}>\{t\('settings\.general\.dangerZone'\)\}<\/div>/);
});

/* ── 2. every edge is a 1px hairline ─────────────────────────────────────── */

test('no edge in the Settings form is thicker than a hairline, in either skin', () => {
  // The nav's right edge and the footer's top edge were both 2px. Even borders
  // only (founder, 2 Sep 2026): a thicker edge is never how state is shown.
  for (const [file, src] of [[MODAL_PATH, MODAL], [CHROME_PATH, CHROME_SRC], [SCREEN_PATH, strip(read(SCREEN_PATH))]]) {
    assert.doesNotMatch(src, /\b2px solid\b/, `${file} still draws a 2px edge`);
    for (const m of src.matchAll(/border(?:Left|Right|Top|Bottom)?\s*:\s*[`'"]([^`'"]+)[`'"]/g)) {
      assert.match(m[1], /^1px |^none$/, `${file}: "${m[1]}" is not a 1px hairline`);
    }
  }
  for (const [name, set] of [['classic', classic], ['pro', pro]]) {
    for (const style of everyStyle(set)) {
      for (const v of values(style)) {
        assert.doesNotMatch(v, /\b(?:1\.5|2|3|4)px solid\b/, `${name} has a thick edge: ${v}`);
        // An inset ring is a border drawn as a shadow; it is held to the same
        // width. The 3px active marker on Classic's nav is the one deliberate
        // wider mark and it is a SHADOW, not an edge, which is how pro/ui.tsx's
        // Tabs marks its active tab too.
        for (const ring of v.match(/inset 0 0 0 [\d.]+px/g) ?? []) {
          assert.equal(ring, 'inset 0 0 0 1px', `${name} has a ring that is not 1px: ${v}`);
        }
      }
    }
  }
});

test('the active nav row is marked without a thicker edge, in either skin', () => {
  // Classic kept its lemon bar, redrawn as an inset shadow so no edge is
  // heavier than its neighbours; the row is still inverted, which is Classic's
  // own active affordance.
  assert.equal(classic.navRow(true).boxShadow, 'inset 3px 0 0 var(--cth-lemon)');
  assert.equal(classic.navRow(false).boxShadow, 'none');
  assert.equal(classic.navRow(true).borderLeft, undefined, 'the 3px border came back');
  // PRO fills the row instead. Not inverted, and no coloured rail at all.
  assert.equal(pro.navRow(true).background, 'var(--cth-surface-active)');
  assert.equal(pro.navRow(true).color, 'var(--cth-ink-900)');
  assert.equal(pro.navRow(false).background, 'transparent');
  assert.equal(pro.navRow(true).boxShadow, undefined, 'PRO grew a marker rail');
  assert.doesNotMatch(JSON.stringify(pro.navRow(true)), /lemon/, 'PRO grew a lemon marker');
  // Both columns are separated by one hairline, never a 2px edge.
  for (const set of [classic, pro]) {
    assert.equal(set.navColumn.borderRight, '1px solid var(--cth-ink-300)');
    assert.equal(set.footer.borderTop, '1px solid var(--cth-ink-300)');
  }
});

/* ── 3. the PRO branch is a PRO screen ───────────────────────────────────── */

test('every PRO corner is a radius token, never a number', () => {
  for (const style of everyStyle(pro)) {
    for (const [k, v] of Object.entries(style)) {
      if (!/^border(Top|Bottom)?(Left|Right)?Radius$/.test(k)) continue;
      assert.equal(typeof v, 'string', `PRO radius ${k} is a literal ${v}`);
      assert.match(v, /^var\(--cth-radius-(sm|md|lg|xl|pill), \d+px\)$/, `PRO radius ${k} is ${v}`);
    }
  }
  // The scale is only declared under the professional skin, so tokens.css asks
  // for the fallback form. Nothing here may name a radius without one.
  assert.doesNotMatch(CHROME_SRC, /var\(--cth-radius-[a-z]+\)/, 'a radius token was read without its fallback');
  // The shapes that used to be square now have a corner.
  for (const style of [pro.input, pro.navRow(true), pro.panel, pro.card(false), pro.optionCard(false), pro.chip(false), pro.codeBox]) {
    assert.ok(style.borderRadius, 'a PRO surface is still square');
  }
});

test('PRO draws the kit form controls, not the pixel ones', () => {
  // pro/ui.tsx's inputStyle: 32 tall, a real 1px border, the cream-100 ground.
  assert.equal(pro.input.height, 32);
  assert.equal(pro.input.border, '1px solid var(--cth-ink-300)');
  assert.equal(pro.input.background, 'var(--cth-cream-100)');
  assert.equal(pro.input.boxShadow, undefined, 'PRO kept the inset-shadow input');
  // pro/ui.tsx's SectionH: 11 / 600 / 0.3 tracking / uppercase / ink-500, and
  // no display face anywhere in PRO.
  assert.equal(pro.sectionHead.fontSize, 11);
  assert.equal(pro.sectionHead.fontWeight, 600);
  assert.equal(pro.sectionHead.letterSpacing, 0.3);
  assert.equal(pro.sectionHead.textTransform, 'uppercase');
  assert.equal(pro.sectionHead.color, 'var(--cth-ink-500)');
  for (const style of everyStyle(pro)) {
    assert.notEqual(style.fontFamily, 'var(--cth-font-display)', 'a PRO surface wears the pixel face');
  }
  // Every font PRO names is a token.
  for (const style of everyStyle(pro)) {
    if (style.fontFamily) assert.match(style.fontFamily, /^var\(--cth-font-(ui|mono)\)$/, `PRO font ${style.fontFamily}`);
  }
  assert.equal(pro.rule.height, 1, "PRO's section rule is not a hairline");
});

/* ── 4. Classic did not move ─────────────────────────────────────────────── */

test('the Classic modal is exactly what 0.4.9 shipped, minus the two thick edges', () => {
  assert.deepEqual(classic.input, {
    width: '100%',
    padding: '6px 8px 4px',
    background: 'var(--cth-paper-100)',
    border: 'none',
    boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
    fontFamily: 'var(--cth-font-ui)',
    fontSize: 13,
    color: 'var(--cth-ink-900)',
    outline: 'none'
  });
  assert.deepEqual(classic.label, {
    fontFamily: 'var(--cth-font-display)',
    fontSize: 8,
    lineHeight: '12px',
    color: 'var(--cth-ink-700)',
    textTransform: 'uppercase'
  });
  assert.equal(classic.sectionHead.fontFamily, 'var(--cth-font-display)');
  assert.equal(classic.sectionHead.fontSize, 8);
  assert.equal(classic.sectionHead.marginBottom, 10);
  assert.equal(classic.sectionHeadTight.marginBottom, 2);
  assert.equal(classic.sectionHeadFlush.marginBottom, 0);
  assert.deepEqual(classic.rule, { height: 2, background: 'var(--cth-ink-300)' });
  assert.equal(classic.navColumn.width, 160);
  assert.equal(classic.navColumn.background, 'var(--cth-cream-200)');
  assert.equal(classic.navRow(true).background, 'var(--cth-ink-900)');
  assert.equal(classic.navRow(true).color, 'var(--cth-cream-50)');
  assert.equal(classic.navRow(true).fontFamily, 'var(--cth-font-display)');
  // The 3px the border used to occupy became padding, so no row moved.
  assert.equal(classic.navRow(true).padding, '10px 16px 8px 19px');
  assert.equal(classic.footer.padding, '10px 16px');
});

test('the two skins are two style sets, not two components', () => {
  // The whole point: one markup. A pro/SettingsModal.tsx would pass every
  // assertion above and be the drift the sweep exists to prevent.
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/renderer/src/components/pro/SettingsModal.tsx')));
  assert.match(strip(read(SCREEN_PATH)), /from '\.\.\/SettingsModal'/);
  assert.match(strip(read(SCREEN_PATH)), /chrome="inline"/);
  // The form reads its look off the chrome once, at the top, and never
  // branches on `chrome` at a call site.
  assert.match(MODAL, /\} = settingsChrome\(chrome\);/);
  const body = MODAL.slice(MODAL.indexOf('const body = ('));
  assert.doesNotMatch(body, /chrome === 'modal'/, 'the markup branches on chrome for a style');
  // Every nav section still exists and the deep link still remounts on it.
  for (const s of ['General', 'Prerequisites', 'Agents & Models', 'Autonomy & Budgets', 'Connections', 'Voice', 'Memory & Knowledge']) {
    assert.ok(MODAL.includes(`'${s}'`), `the ${s} section left the nav`);
  }
  assert.match(MODAL, /aria-current=\{active \? 'page' : undefined\}/, 'the nav does not say which row is showing');
  assert.match(MODAL, /useState<Section>\(initialSection \?\? 'General'\)/);
  assert.match(strip(read(SCREEN_PATH)), /initialSection=\{section\}/);
});

test('every shape the form draws with is answered for both skins', () => {
  // A missing key is `undefined` spread into a style: no error, no pixels, and
  // nothing to see in a diff. Both sets must carry the same shape names.
  assert.deepEqual(Object.keys(classic).sort(), Object.keys(pro).sort());
  for (const k of Object.keys(classic)) {
    assert.equal(typeof classic[k], typeof pro[k], `${k} is a function in one skin and an object in the other`);
  }
  // And the form destructures all of them, so an unused shape is a dead one.
  const destructured = /const \{([\s\S]*?)\} = settingsChrome\(chrome\);/.exec(MODAL);
  assert.ok(destructured, 'the form no longer reads the chrome');
  const named = new Set([...destructured[1].matchAll(/(\w+)(?:\s*:\s*(\w+))?/g)].map((m) => m[1]));
  // 0.5.3: the section files under components/settings draw with the same
  // chrome (useSettingsChrome), so a shape they read is not dead.
  const dir = path.join(__dirname, '..', 'src/renderer/src/components/settings');
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.tsx'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/const \{([^}]*)\} = settingsChrome\(/g)) for (const n of m[1].matchAll(/(\w+)/g)) named.add(n[1]);
  }
  for (const k of Object.keys(classic)) assert.ok(named.has(k), `the form never reads ${k}`);
});

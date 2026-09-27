'use strict';

/**
 * 0.5.3, bug 16 (Teminite, 12 Sep 2026): in the professional skin the working
 * and idle dots looked the same. Two rules hold it shut. Idle is a hollow ring
 * (shape, not only hue), and in both professional themes each of the two
 * colours clears 3 to 1 against the ground it is drawn on.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { statusDotPaint, isHollowStatus } = loadTs('src/shared/statusDot.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

/** The body of the rule block whose selector is exactly `selector`. */
function block(css, selector) {
  const at = css.indexOf(selector + ' {');
  assert.notEqual(at, -1, `tokens.css has a block for ${selector}`);
  return css.slice(at, css.indexOf('\n}', at));
}
const token = (body, name) => {
  const m = body.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
  assert.ok(m, `${name} is a six digit hex in this block`);
  return m[1];
};

const css = read('src/renderer/src/design/tokens.css');
const THEMES = {
  light: block(css, ":root[data-cth-skin='professional']:not([data-cth-theme='dark'])"),
  dark: block(css, ":root[data-cth-skin='professional'][data-cth-theme='dark']")
};

test('idle is a hollow ring and working is a filled disc', () => {
  assert.equal(isHollowStatus('idle'), true);
  const idle = statusDotPaint('idle', 9);
  assert.equal(idle.background, 'transparent');
  assert.match(idle.boxShadow, /^inset 0 0 0 2px var\(--cth-dot-idle\)$/);
  assert.equal(statusDotPaint('working', 9).background, 'var(--cth-dot-working)');
  for (const s of ['thinking', 'waiting', 'blocked', 'success', 'looping', 'compacting', 'typing', 'ghost']) {
    assert.equal(isHollowStatus(s), false, `${s} stays filled`);
    assert.equal(statusDotPaint(s, 9).background, `var(--cth-status-${s})`);
  }
});

test('the professional StatusDot paints through the shared rule', () => {
  const ui = read('src/renderer/src/components/pro/ui.tsx');
  const dot = ui.slice(ui.indexOf('export function StatusDot'), ui.indexOf('export function StatusChip'));
  assert.match(dot, /\.\.\.statusDotPaint\(status, size\)/);
  assert.doesNotMatch(dot, /background:/, 'no second, unconditional fill beside the rule');
});

for (const [name, body] of Object.entries(THEMES)) {
  test(`professional ${name}: idle and working both clear 3 to 1 on the rail and on the active row`, () => {
    const idle = token(body, '--cth-dot-idle');
    const working = token(body, '--cth-dot-working');
    for (const ground of [token(body, '--cth-paper-100'), token(body, '--cth-surface-active')]) {
      assert.ok(ratio(idle, ground) >= 3, `idle ${idle} on ${ground} is ${ratio(idle, ground).toFixed(2)}`);
      assert.ok(ratio(working, ground) >= 3, `working ${working} on ${ground} is ${ratio(working, ground).toFixed(2)}`);
    }
    assert.notEqual(idle, token(body, '--cth-ink-500'), 'the idle dot is not just the hint text colour');
  });
}

test('professional dark: idle and working sit at least 2.4 to 1 apart', () => {
  const b = THEMES.dark;
  assert.ok(ratio(token(b, '--cth-dot-idle'), token(b, '--cth-dot-working')) >= 2.4);
});

test('the dot tokens exist in every skin and theme, so no block paints a missing name', () => {
  const blocks = css.split(/\n(?=:root)/).filter((b) => /--cth-status-idle:/.test(b));
  assert.equal(blocks.length, 4, 'office light, office dark, professional light, professional dark');
  for (const b of blocks) {
    assert.match(b, /--cth-dot-idle:/);
    assert.match(b, /--cth-dot-working:/);
  }
});

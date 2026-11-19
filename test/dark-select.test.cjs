'use strict';

// Native selects and their option lists read in both themes: the dark theme declares the dark
// browser scheme, and every select and option takes its surface and text from the theme tokens.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('the dark theme declares the dark scheme on the attribute the theme sets; the light one stays the default', () => {
  const css = read('src/renderer/src/design/global.css');
  assert.match(css, /:root \{ color-scheme: light; \}/);
  assert.match(css, /:root\[data-cth-theme='dark'\] \{ color-scheme: dark; \}/);
  assert.match(read('src/renderer/src/design/theme.ts'), /document\.documentElement\.dataset\.cthTheme = theme;/, 'data-cth-theme is what theme.ts stamps');
});

test('select, option and optgroup take the input surface and text; a disabled option is dimmed; each token exists in both themes', () => {
  const css = read('src/renderer/src/design/global.css');
  assert.match(css, /select, option, optgroup \{\s*background-color: var\(--cth-paper-100\);\s*color: var\(--cth-ink-900\);\s*\}/);
  assert.match(css, /option:disabled \{ color: var\(--cth-ink-500\); \}/);
  const tokens = read('src/renderer/src/design/tokens.css');
  const dark = tokens.slice(tokens.indexOf(":root[data-cth-theme='dark'] {"));
  for (const v of ['--cth-paper-100', '--cth-ink-900', '--cth-ink-500']) {
    assert.match(tokens, new RegExp(`${v}:`), `${v} light`);
    assert.match(dark.slice(0, dark.indexOf('}')), new RegExp(`${v}:`), `${v} dark`);
  }
});

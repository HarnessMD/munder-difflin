// PRO is the default mode (founder, 2 Sep 2026). The stored choice still wins.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(path.join(__dirname, '../src/renderer/src/design/skin.ts'), 'utf8');

test('load() falls back to professional, not office', () => {
  const body = SRC.slice(SRC.indexOf('function load()'), SRC.indexOf('let skin'));
  assert.match(body, /return 'professional';\s*}\s*$/);
  assert.ok(!/return 'office'/.test(body), 'office is no longer the fallback');
});

test('a stored value is still honoured, both ways', () => {
  const body = SRC.slice(SRC.indexOf('function load()'), SRC.indexOf('let skin'));
  assert.match(body, /v === 'office' \|\| v === 'professional'/);
});

const APP = fs.readFileSync(path.join(__dirname, '../src/renderer/src/App.tsx'), 'utf8');
const SWITCH = fs.readFileSync(path.join(__dirname, '../src/renderer/src/components/pro/ModeSwitch.tsx'), 'utf8');

test('the titlebar carries the Classic | PRO switch, and the focus toggle exists only for the free standing', () => {
  assert.match(APP, /<ModeSwitch \/>/);
  // 5 Sep 2026 (the free tier): the 2 Sep removal is AMENDED, not reversed.
  // For a free install the switch is the door to the licence screens, not a
  // place to work, so the focus-mode button is back BESIDE it, gated on the
  // free standing; a licensed or org machine keeps the 2 Sep titlebar.
  const toggles = [...APP.matchAll(/aria-label="Toggle focus mode"/g)];
  assert.equal(toggles.length, 1, 'exactly one focus toggle in the titlebar');
  const gate = APP.slice(APP.indexOf('{freeAdmitted && ('), APP.indexOf('aria-label="Toggle focus mode"'));
  assert.ok(gate.length > 0 && gate.length < 900, 'the toggle renders inside the freeAdmitted gate');
  assert.match(APP, /function ExpandGlyph\(\)/);
  assert.match(APP, /function CollapseGlyph\(\)/);
});

test('ModeSwitch is the one writer of the skin', () => {
  assert.match(SWITCH, /setAppSkin\(o\.value\)/);
  assert.ok(!fs.existsSync(path.join(__dirname, '../src/renderer/src/components/SkinPicker.tsx')), 'SkinPicker still exists: two writers');
  const settings = fs.readFileSync(path.join(__dirname, '../src/renderer/src/components/SettingsModal.tsx'), 'utf8');
  assert.ok(!settings.includes('SkinPicker'));
});

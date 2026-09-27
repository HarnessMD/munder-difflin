// 0.4.11, founder 6 Sep 2026: "Give a setting in the setting section, in the
// general part of the setting section, that allows users to set a default
// view, make it classic or pro. This is a setting that will be available just
// for pro users."
//
// The contract pinned here:
//   1. design/skin.ts: a set default view wins at launch over the view last
//      used; PRO stays the fallback; recording the default never touches the
//      current view (the titlebar switch stays the one writer of it).
//   2. The config carries `defaultView` in main, preload and the renderer, and
//      App.tsx mirrors the saved value into the boot cache on every change,
//      never applying it mid session.
//   3. Settings, General, Environment: the row is first, drawn only for a PRO
//      user by the same gate the titlebar switch uses, offers Classic and PRO,
//      and stages the value like every other General row.
//   4. The two strings exist in all three locales without a dash.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const DASH = /[–—]|\s-\s/;

test('1. a set default view wins at launch, PRO stays the fallback, and recording it never touches the current view', () => {
  const skin = read('src/renderer/src/design/skin.ts');
  const load = skin.slice(skin.indexOf('function load()'), skin.indexOf('let skin'));
  assert.match(load, /const preset = loadDefault\(\);\s*if \(preset\) return preset;/, 'the default is consulted before the view last used');
  assert.match(load, /return 'professional';\s*}\s*$/, 'PRO stays the fallback');
  assert.match(skin, /const LS_DEFAULT_KEY = 'cth\.skin\.default';/);
  const setter = skin.slice(skin.indexOf('export function setDefaultAppSkin('), skin.indexOf('export function useDefaultAppSkin('));
  assert.doesNotMatch(setter, /\bskin = /, 'recording the default does not change the current view');
  assert.doesNotMatch(setter, /setAppSkin\(/, 'nor through the switch\'s writer');
  assert.match(setter, /window\.localStorage\.removeItem\(LS_DEFAULT_KEY\)/, 'null clears the default');
  assert.match(skin, /export function useDefaultAppSkin\(\): AppSkin \| null/);
});

test('2. the config carries defaultView everywhere, and App.tsx mirrors it into the boot cache without applying it', () => {
  for (const f of ['src/main/config.ts', 'src/preload/index.ts', 'src/renderer/src/store/config.ts']) {
    assert.match(read(f), /defaultView\?: 'office' \| 'professional';/, `${f} carries defaultView`);
  }
  assert.match(read('src/main/config.ts'), /defaultView: undefined,/, 'unset by default: the view last used, then PRO');
  const app = strip(read('src/renderer/src/App.tsx'));
  assert.match(app, /import \{ appSkin, setAppSkin, setDefaultAppSkin, useAppSkin \} from '@\/design\/skin';/);
  const mirror = app.slice(app.indexOf('setDefaultAppSkin(config.defaultView'), app.indexOf('setDefaultAppSkin(config.defaultView') + 200);
  assert.match(mirror, /\}, \[config\?\.defaultView\]\);/, 'mirrored on every change of the saved value');
  const effect = app.slice(app.lastIndexOf('useEffect', app.indexOf('setDefaultAppSkin(config.defaultView')), app.indexOf('}, [config?.defaultView]);'));
  assert.doesNotMatch(effect, /setAppSkin\(/, 'the current view is not touched by the mirror');
});

test('3. Settings, General: the row is first under Environment, PRO users only by the switch\'s gate, Classic or PRO, staged', () => {
  const modal = read('src/renderer/src/components/SettingsModal.tsx');
  const code = strip(modal);
  assert.match(modal, /import \{ proGateAdmits \} from '@shared\/soloPro';/);
  assert.match(modal, /import \{ useSoloLicense \} from '\.\/pro\/onboarding\/soloLicense';/);
  assert.match(code, /const proUser = proGateAdmits\(teamsMode, soloLicense\);/, 'the gate is the titlebar switch\'s, expression for expression');
  assert.match(code, /stage\(\{ defaultView: v \} as Partial<HarnessConfig>\);/, 'staged like every General row, saved with the rest');
  const env = code.indexOf("t('settings.general.environment')");
  const row = code.indexOf('{proUser && (');
  const keepAwake = code.indexOf("t('settings.general.keepAwake')");
  assert.ok(env > 0 && row > env && keepAwake > row, `environment head (${env}) then the row (${row}) then keep awake (${keepAwake})`);
  const block = code.slice(row, keepAwake);
  assert.match(block, /data-default-view/);
  assert.match(block, /\(\['office', 'professional'\] as const\)\.map\(/, 'Classic and PRO, in that order');
  assert.match(block, /v === 'office' \? t\('mode\.classic'\) : t\('mode\.pro'\)/, 'the words are the switch\'s words');
  assert.doesNotMatch(code, /setAppSkin\(/, 'Settings never writes the current view: the titlebar switch is its one writer');
  const settingsSwitchTest = read('test/skin-default.test.cjs');
  assert.match(settingsSwitchTest, /ModeSwitch is the one writer of the skin/, 'the older pin still stands beside this one');
});

test('4. the two strings exist in all three locales without a dash', () => {
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))]));
  for (const k of ['defaultView', 'defaultViewDesc']) {
    for (const l of ['en', 'zh-CN', 'ar']) {
      const s = locales[l].settings.general[k];
      assert.ok(typeof s === 'string' && s.length > 0, `${l} ${k}`);
      assert.ok(!DASH.test(s), `${l} ${k}: no dash`);
    }
  }
  assert.equal(locales.en.settings.general.defaultView, 'Default view');
  assert.equal(locales.en.mode.classic, 'Classic');
  assert.equal(locales.en.mode.pro, 'PRO');
});

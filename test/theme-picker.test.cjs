'use strict';

// Settings' Office Theme section picks this project's floor. The Office and the packs are
// always offered, the TV-show floors only with the experimental flag. A pick waits for Save;
// Save stores it for this project, reads it back and draws that; a failed store says so and
// keeps the old floor. A switch keeps every agent: there is no confirm and no kill or archive.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const C = 'src/renderer/src/components';
const P = loadTs('src/shared/projectTheme.ts');
const CREDIT = { text: 'Artwork by Prozzta', url: 'https://github.com/Prozzta/guppyos' };
P.registerPackThemes([{ id: 'starhike', label: 'Star Hike' }]);

// The picker, run as written: its own code, with React's hooks and JSX swapped for plain
// stand-ins so the tree can be read and its buttons pressed.
const PICKER_JS = ts.transpileModule(read(`${C}/OfficeThemePicker.tsx`), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function picker(props, { updateConfig = async () => {} } = {}) {
  const calls = { pick: [], update: [], floor: [], open: [] };
  const states = [];
  let hook = 0;
  const React = {
    useState: (init) => {
      const i = hook++;
      if (states.length <= i) states.push(typeof init === 'function' ? init() : init);
      return [states[i], (v) => { states[i] = typeof v === 'function' ? v(states[i]) : v; }];
    },
  };
  const jsx = (type, p) => ({ type, props: p ?? {} });
  const mods = {
    react: React,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-i18next': { useTranslation: () => ({ t: (k, o) => (o ? `${k}${JSON.stringify(o)}` : k) }) },
    '@/store/store': { useStore: (sel) => sel({ setOfficeTheme: (x) => calls.floor.push(x) }) },
    './PixelButton': { PixelButton: 'PixelButton' },
    '@/scene/themes/themeCatalog': { listThemes: () => [{ id: 'office', builtIn: true }, { id: 'starhike', builtIn: false, credit: CREDIT }] },
    '@shared/projectTheme': P,
  };
  global.window = { cth: {
    updateConfig: (patch) => { calls.update.push(patch); return updateConfig(patch); },
    openExternal: async (u) => { calls.open.push(u); },
  } };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', PICKER_JS)((m) => { if (!(m in mods)) throw new Error(`unexpected import ${m}`); return mods[m]; }, mod, mod.exports);
  const all = { onPick: (id) => calls.pick.push(id), notSaved: false, pick: null, ...props };
  const render = () => { hook = 0; return mod.exports.OfficeThemePicker(all); };
  return { render, calls, states };
}

const kids = (n) => [n?.props?.children].flat(Infinity).filter((c) => c != null && c !== false && c !== true);
const text = (n) => (typeof n === 'string' || typeof n === 'number' ? String(n) : kids(n).map(text).join(''));
function findAll(n, pred, out = []) {
  if (n && typeof n === 'object') { if (pred(n)) out.push(n); for (const c of kids(n)) findAll(c, pred, out); }
  return out;
}
// A card is the grid's direct child; its label is the first 12px span's text.
function cards(tree) {
  const grid = findAll(tree, (n) => n.props?.style?.display === 'grid')[0];
  return kids(grid).map((card) => {
    const button = card.type === 'button' ? card : findAll(card, (n) => n.type === 'button')[0];
    const link = findAll(card, (n) => n.type === 'a')[0];
    const chips = findAll(card, (n) => n.type === 'span' && n.props?.style?.fontSize === 7).map(text);
    const label = text(findAll(card, (n) => n.type === 'span' && n.props?.style?.fontSize === 12)[0]);
    return { label, chips, button, link, card };
  });
}
const notes = (tree) => findAll(tree, (n) => n.type === 'div' && n.props?.style?.marginTop === 10 && n.props?.style?.fontSize === 12).map(text);
const cfg = (o = {}) => ({ harnessHome: '/Users/x/Projects/Star Base/', ...o });

test('the cards: The Office, then the packs; the five TV-show floors only with the flag on, after them', () => {
  const off = picker({ config: cfg(), current: 'office' }).render();
  assert.deepEqual(cards(off).map((c) => c.label), ['The Office', 'Star Hike']);
  const on = picker({ config: cfg({ tvShowOffices: true }), current: 'office' }).render();
  assert.deepEqual(cards(on).map((c) => c.label), ['The Office', 'Star Hike', 'Friends', 'Brooklyn Nine-Nine', 'Silicon Valley', 'Game of Thrones', 'Harry Potter']);
  assert.deepEqual(cards(on).filter((c) => c.chips.includes('officeTheme.soon')).map((c) => c.label), ['Friends', 'Silicon Valley', 'Game of Thrones', 'Harry Potter'], 'the floors with no content yet');
  assert.ok(text(off).includes('officeTheme.forProject{"project":"Star Base"}'), 'the line names the project folder');
  const win = picker({ config: cfg({ harnessHome: 'C:\\Users\\x\\Big Co\\' }), current: 'office' }).render();
  assert.ok(text(win).includes('officeTheme.forProject{"project":"Big Co"}'));
});

test('the chips: "current" on the floor drawn, "switches on Save" on the pick, with what Save will do', () => {
  let c = cards(picker({ config: cfg(), current: 'starhike' }).render());
  assert.deepEqual(c.map((x) => x.chips), [[], ['officeTheme.current']]);
  // a TV-show theme with the flag off draws the office
  c = cards(picker({ config: cfg(), current: 'friends' }).render());
  assert.deepEqual(c.map((x) => x.chips), [['officeTheme.current'], []]);
  c = cards(picker({ config: cfg({ tvShowOffices: true }), current: 'friends' }).render());
  assert.deepEqual(c.find((x) => x.label === 'Friends').chips, ['officeTheme.current'], 'no "soon" on the floor in use');
  const tree = picker({ config: cfg(), current: 'office', pick: 'starhike' }).render();
  c = cards(tree);
  assert.deepEqual(c.map((x) => x.chips), [['officeTheme.current'], ['officeTheme.onSave']]);
  assert.deepEqual(notes(tree), ['officeTheme.keepsAgents{"label":"Star Hike"}']);
});

test('a press picks a card; pressing the floor already drawn takes the pick back', () => {
  const p = picker({ config: cfg(), current: 'office', pick: 'starhike' });
  const c = cards(p.render());
  c[1].button.props.onClick();
  c[0].button.props.onClick();
  assert.deepEqual(p.calls.pick, ['starhike', null]);
  assert.equal(p.calls.update.length, 0, 'a press saves nothing');
  assert.equal(p.calls.floor.length, 0, 'and does not change the floor');
});

test('the pack card carries its credit as a link beside the pick button, never inside it', () => {
  const p = picker({ config: cfg(), current: 'office' });
  const [office, star] = cards(p.render());
  assert.equal(office.link, undefined);
  assert.equal(office.card.type, 'button');
  assert.equal(star.card.type, 'div');
  assert.equal(findAll(star.button, (n) => n.type === 'a').length, 0);
  assert.equal(text(star.link), CREDIT.text);
  assert.equal(star.link.props.href, CREDIT.url);
  let prevented = false;
  star.link.props.onClick({ preventDefault: () => { prevented = true; } });
  assert.ok(prevented, 'the link does not navigate the window');
  assert.deepEqual(p.calls.open, [CREDIT.url], 'it opens in the browser');
  assert.deepEqual(p.calls.pick, [], 'and picks nothing');
});

test('a Save that could not store the theme says so, until the next pick', () => {
  let tree = picker({ config: cfg(), current: 'office', notSaved: true }).render();
  assert.deepEqual(notes(tree), ['officeTheme.notSaved']);
  assert.equal(findAll(tree, (n) => n.props?.role === 'status').length, 1);
  tree = picker({ config: cfg(), current: 'office', pick: 'starhike', notSaved: true }).render();
  assert.deepEqual(notes(tree), ['officeTheme.keepsAgents{"label":"Star Hike"}']);
});

test('the flag: off drops a waiting TV-show pick and draws the office; on draws the project\'s floor; a failed write puts it back', async () => {
  const toggle = (tree) => findAll(tree, (n) => n.type === 'PixelButton')[0];
  let p = picker({ config: cfg({ tvShowOffices: true }), current: 'friends', pick: 'brooklyn99' });
  await toggle(p.render()).props.onClick();
  assert.deepEqual(p.calls.pick, [null]);
  assert.deepEqual(p.calls.update, [{ tvShowOffices: false }]);
  assert.deepEqual(p.calls.floor, ['office']);
  assert.equal(p.states[0], false);
  await toggle(p.render()).props.onClick();
  assert.deepEqual(p.calls.floor, ['office', 'friends']);

  p = picker({ config: cfg({ tvShowOffices: true }), current: 'friends', pick: 'starhike' });
  await toggle(p.render()).props.onClick();
  assert.deepEqual(p.calls.pick, [], 'a pack pick stays');
  p = picker({ config: cfg({ tvShowOffices: true }), current: 'office', pick: 'office' });
  await toggle(p.render()).props.onClick();
  assert.deepEqual(p.calls.pick, [], 'an Office pick stays');

  p = picker({ config: cfg(), current: 'office' }, { updateConfig: async () => { throw new Error('disk'); } });
  await toggle(p.render()).props.onClick();
  assert.equal(p.states[0], false, 'the flag is back off');
  assert.deepEqual(p.calls.floor, []);
});

test('Settings: a pick makes the form dirty; Save stores it after the other settings, reads it back, and says "saved" only when it was', () => {
  const s = read(`${C}/SettingsModal.tsx`);
  assert.match(s, /useState<ProjectThemeId>\(\(\) => resolveProjectTheme\(config, config\.harnessHome\)\)/);
  assert.match(s, /const dirty = Object\.keys\(pending\)\.length > 0 \|\| autoCompactPending !== null \|\| themePick !== null \|\| graphicsPick !== null;/);
  const save = s.slice(s.indexOf('const saveAll = async'), s.indexOf('} finally { setSaveBusy(false); }'));
  assert.ok(save.indexOf('await window.cth.updateConfig(patch);') < save.indexOf('window.cth.setProjectTheme(themePick)'));
  assert.match(save, /if \(themePick !== null\) \{[\s\S]*?const res = await window\.cth\.setProjectTheme\(themePick\);\s*const cfg = await window\.cth\.getConfig\(\);\s*setProjectThemeNow\(res\.theme\);\s*useStore\.getState\(\)\.setOfficeTheme\(floorSceneTheme\(res\.theme, cfg\.tvShowOffices\)\);\s*setThemePick\(null\);\s*setThemeNotSaved\(!res\.ok\);\s*themeSaved = res\.ok;\s*\}[\s\S]*?if \(themeSaved && graphicsSaved\) \{\s*setSaveNote\(t\('settings\.saved'\)\);/);
  assert.match(s, /<OfficeThemePicker\s*config=\{config\}\s*current=\{projectThemeNow\}\s*pick=\{themePick\}\s*onPick=\{\(id\) => \{ setThemePick\(id\); setThemeNotSaved\(false\); \}\}\s*notSaved=\{themeNotSaved\}\s*\/>/);
});

test('the floor at start is the project\'s own; the packs join the theme list before the first render', () => {
  assert.match(read('src/renderer/src/App.tsx'), /useStore\.getState\(\)\.setOfficeTheme\(floorSceneTheme\(resolveProjectTheme\(c, c\.harnessHome\), c\.tvShowOffices\)\);/);
  const cat = read('src/renderer/src/scene/themes/themeCatalog.ts');
  assert.match(cat, /packs = res\.packs;\s*registerPackThemes\(packs\.map\(\(p\) => \(\{ id: p\.id, label: p\.label, orchestrator: p\.projectDefaults\?\.orchestrator \}\)\)\);/);
  assert.doesNotMatch(cat, /export function floorSceneTheme/, 'one floor rule, the shared one');
  const main = read('src/renderer/src/main.tsx');
  assert.ok(main.indexOf('listThemes();') > 0 && main.indexOf('listThemes();') < main.indexOf('createRoot('), 'registered before render');
  // the floor rule itself
  assert.equal(P.floorSceneTheme('starhike', false), 'starhike');
  assert.equal(P.floorSceneTheme('friends', false), 'office');
  assert.equal(P.floorSceneTheme('friends', true), 'friends');
});

test('no confirm, no kill, no archive on a switch; every officeTheme word used is in all three languages, the old flow\'s words are gone', () => {
  const pk = read(`${C}/OfficeThemePicker.tsx`);
  assert.doesNotMatch(pk, /kill|archive|confirm|Modal|delete/i);
  const removed = ['notBuiltYet', 'switchAborted', 'confirmTitle', 'startsFreshCast', 'deleteCount', 'deleteCountPlural', 'onlyCarries', 'stillWorking', 'stillWorkingPlural', 'cantUndo', 'switching', 'deleteSwitch'];
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
  const src = walk('src/renderer/src').map((f) => read(f)).join('\n');
  const used = [...new Set([...src.matchAll(/t\('officeTheme\.(\w+)'/g)].map((m) => m[1]))];
  assert.ok(used.length >= 10, used.join());
  const want = { onSave: [], forProject: ['{{project}}'], keepsAgents: ['{{label}}'], notSaved: [] };
  for (const l of ['en', 'ar', 'zh-CN']) {
    const ot = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).officeTheme;
    for (const k of used) assert.ok(typeof ot[k] === 'string' && ot[k].trim(), `${l} officeTheme.${k}`);
    for (const [k, holes] of Object.entries(want)) for (const h of holes) assert.ok(ot[k].includes(h), `${l} ${k} keeps ${h}`);
    for (const k of removed) assert.equal(k in ot, false, `${l} ${k}`);
  }
  for (const k of removed) assert.doesNotMatch(src, new RegExp(`officeTheme\\.${k}\\b`), k);
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json')).officeTheme;
  assert.equal(en.notSaved, 'Not saved: your settings file could not be read just now, so the floor did not change.');
  assert.equal(en.keepsAgents, 'On Save, every agent moves to {{label}}. Names, memory and work stay; only the look changes.');
});

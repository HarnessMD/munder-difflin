'use strict';

// A new project picks its floor before it is made: from the project picker's "create new
// config…" or from Settings' Start fresh. The Office and the packs are offered (not the
// TV-show floors), each with the orchestrator who starts there and a pack's art credit.
// Main refuses a folder that is not empty or cannot be read; the window then names why,
// keeps the create button waiting, and puts back the window cache Settings cleared.

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
const G = loadTs('src/shared/godIdentity.ts');
const CREDIT = { text: 'Artwork by Prozzta', url: 'https://github.com/Prozzta/guppyos' };
const SEED = { appearance: { preset: 'rowan' } };
P.registerPackThemes([{ id: 'starhike', label: 'Star Hike', orchestrator: SEED }]);

// Components run as written, with React's hooks and JSX swapped for stand-ins: each mounted
// component keeps its own state, and a child component stays an element to mount by hand.
let current = null;
const React = {
  useState: (init) => {
    const c = current;
    const i = c.hook++;
    if (c.states.length <= i) c.states.push(typeof init === 'function' ? init() : init);
    return [c.states[i], (v) => { c.states[i] = typeof v === 'function' ? v(c.states[i]) : v; }];
  },
};
const jsx = (type, p) => ({ type, props: p ?? {} });
function mount(fn, props) {
  const c = { states: [], hook: 0 };
  c.render = () => { const prev = current; current = c; c.hook = 0; try { return fn(props); } finally { current = prev; } };
  return c;
}
function loadTsx(file, mods) {
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const all = { react: React, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-i18next': { useTranslation: () => ({ t: (k, o) => (o ? `${k}${JSON.stringify(o)}` : k) }) }, ...mods };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)((m) => { if (!(m in all)) throw new Error(`unexpected import ${m} in ${file}`); return all[m]; }, mod, mod.exports);
  return mod.exports;
}
const PTC = loadTsx(`${C}/ProjectThemeChoice.tsx`, {
  './SpritePortrait': { SpritePortrait: 'SpritePortrait' },
  '@/scene/themes/themeCatalog': {
    listThemes: () => [{ id: 'office', builtIn: true }, { id: 'starhike', builtIn: false, credit: CREDIT }],
    themeBuilder: (id) => ({ builderOf: id }),
    themeProjectDefaults: (id) => (id === 'starhike' ? { orchestrator: SEED } : null),
  },
  '@/scene/themes/looks': { orchestratorDefaultLook: (b, cur, app) => ({ from: b, cur, app }) },
  '@shared/projectTheme': P,
  '@shared/godIdentity': G,
});
const HP = loadTsx(`${C}/HivePicker.tsx`, {
  './PixelPanel': { PixelPanel: 'PixelPanel' }, './PixelButton': { PixelButton: 'PixelButton' }, './Icon': { Icon: 'Icon' },
  './ProjectThemeChoice': PTC,
});

const kids = (n) => [n?.props?.children].flat(Infinity).filter((c) => c != null && c !== false && c !== true);
const text = (n) => (typeof n === 'string' || typeof n === 'number' ? String(n) : kids(n).map(text).join(''));
function findAll(n, pred, out = []) {
  if (n && typeof n === 'object') { if (pred(n)) out.push(n); for (const c of kids(n)) findAll(c, pred, out); }
  return out;
}
const button = (tree, label) => findAll(tree, (n) => n.type === 'PixelButton' && text(n).includes(label))[0];
function cth(over = {}) {
  const calls = { open: [], changeHome: [] };
  const store = new Map();
  global.window = {
    localStorage: {
      get length() { return store.size; }, key: (i) => [...store.keys()][i] ?? null,
      getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k),
    },
    cth: {
      openExternal: async (u) => { calls.open.push(u); },
      chooseFolder: async () => ({ ok: true, path: '/Users/x/New Base' }),
      changeHome: async (...a) => { calls.changeHome.push(a); return { ok: false, error: 'not-empty' }; },
      ...over,
    },
  };
  return { calls, store };
}

test('the rows: The Office, then the packs, never a TV-show floor; each says who starts there', () => {
  cth();
  const picks = [];
  const tree = mount(PTC.ProjectThemeChoice, { pick: 'office', onPick: (id) => picks.push(id) }).render();
  assert.equal(tree.props.role, 'radiogroup');
  const rows = kids(tree);
  assert.deepEqual(rows.map((r) => r.props['aria-checked']), [true, false]);
  const god = G.resolveGodName(null);
  assert.ok(text(rows[0]).includes('The Office') && text(rows[0]).includes('projectTheme.office') && text(rows[0]).includes(`projectTheme.starts{"god":"${god}"}`));
  assert.ok(text(rows[1]).includes('Star Hike') && text(rows[1]).includes('projectTheme.starhike') && text(rows[1]).includes(`projectTheme.captain{"god":"${god}"}`));
  assert.equal(findAll(rows[0], (n) => n.type === 'SpritePortrait').length, 0, 'the office row is a swatch');
  const sp = findAll(rows[1], (n) => n.type === 'SpritePortrait')[0];
  assert.deepEqual(sp.props.agent.appearanceByTheme, { starhike: { from: { builderOf: 'starhike' }, cur: undefined, app: SEED.appearance } }, 'the pack\'s seed look');
  assert.equal(sp.props.themeId, 'starhike');
  // the experimental flag does not add TV-show floors here
  assert.deepEqual(P.offeredProjectThemes(false).map((x) => x.id), ['office', 'starhike']);
  assert.match(read(`${C}/ProjectThemeChoice.tsx`), /const themes = offeredProjectThemes\(false\);/);
});

test('a row is picked by a click, Enter or Space; not while the dialog is busy; the credit opens the browser and picks nothing', () => {
  const { calls } = cth();
  let picks = [];
  let rows = kids(mount(PTC.ProjectThemeChoice, { pick: 'office', onPick: (id) => picks.push(id) }).render());
  rows[1].props.onClick();
  let prevented = 0;
  for (const key of ['Enter', ' ', 'a', 'Tab']) rows[0].props.onKeyDown({ key, preventDefault: () => { prevented++; } });
  assert.deepEqual(picks, ['starhike', 'office', 'office']);
  assert.equal(prevented, 2);
  const link = findAll(rows[1], (n) => n.type === 'a')[0];
  assert.equal(text(link), CREDIT.text);
  let stopped = false;
  link.props.onClick({ preventDefault: () => {}, stopPropagation: () => { stopped = true; } });
  assert.ok(stopped, 'the click does not reach the row');
  assert.deepEqual(calls.open, [CREDIT.url]);
  picks = [];
  rows = kids(mount(PTC.ProjectThemeChoice, { pick: 'office', onPick: (id) => picks.push(id), disabled: true }).render());
  rows[1].props.onClick();
  rows[1].props.onKeyDown({ key: 'Enter', preventDefault: () => {} });
  assert.deepEqual(picks, []);
  assert.equal(rows[1].props.tabIndex, -1);
});

test('a refused folder: the tag and one line, for not-empty and unreadable only', () => {
  assert.equal(PTC.projectFolderError('not-empty'), 'not-empty');
  assert.equal(PTC.projectFolderError('unreadable'), 'unreadable');
  for (const e of [undefined, 'invalid-theme', 'That is already the current home folder.', 'cancelled']) assert.equal(PTC.projectFolderError(e), null, String(e));
  cth();
  for (const [error, key] of [['not-empty', 'projectTheme.notEmpty'], ['unreadable', 'projectTheme.unreadable']]) {
    const row = mount(PTC.ProjectFolderError, { error }).render();
    assert.equal(row.props.role, 'status');
    assert.equal(text(row), `projectTheme.errTag${key}`);
  }
});

async function newProject(over) {
  const env = cth(over);
  const picker = mount(HP.HivePicker, { config: { harnessHome: '/Users/x/Old', recentHives: [] }, onOpenCurrent: () => {} });
  let tree = picker.render();
  await button(tree, 'create new config').props.onClick();
  tree = picker.render();
  const el = findAll(tree, (n) => typeof n.type === 'function' && n.type.name === 'NewProjectDialog')[0];
  assert.ok(el, 'the dialog replaces the list');
  assert.equal(el.props.path, '/Users/x/New Base');
  const dialog = mount(el.type, el.props);
  return { ...env, picker, dialog, el };
}

test('"create new config…": choose a folder, then the floor; create makes the project with that floor', async () => {
  const { dialog, calls, store } = await newProject({ changeHome: async (...a) => { calls.changeHome.push(a); return new Promise(() => {}); } });
  let tree = dialog.render();
  assert.ok(text(tree).includes('projectTheme.folder{"path":"/Users/x/New Base"}'));
  let choice = findAll(tree, (n) => n.type === PTC.ProjectThemeChoice)[0];
  assert.equal(choice.props.pick, 'office', 'The Office is the default');
  choice.props.onPick('starhike');
  tree = dialog.render();
  void button(tree, 'projectTheme.create').props.onClick();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(calls.changeHome, [['/Users/x/New Base', 'fresh', 'starhike']]);
  assert.equal(store.get('cth.skipHivePickerOnce'), '1', 'the relaunch opens the new project, not the picker');
  tree = dialog.render();
  assert.equal(findAll(tree, (n) => n.type === PTC.ProjectThemeChoice)[0].props.disabled, true, 'busy while main works');
  // the picker's own "open existing config…" still opens a folder as it is, with no floor
  assert.match(read(`${C}/HivePicker.tsx`), /const res = await window\.cth\.changeHome\(path, 'fresh'\);/);
});

test('main refuses the folder: the row says why, create waits, the skip mark is taken back; cancel goes back to the list', async () => {
  const { dialog, picker, el, store, calls } = await newProject();
  void calls;
  let tree = dialog.render();
  await button(tree, 'projectTheme.create').props.onClick();
  tree = dialog.render();
  const err = findAll(tree, (n) => n.type === PTC.ProjectFolderError)[0];
  assert.equal(err.props.error, 'not-empty');
  assert.equal(button(tree, 'projectTheme.create').props.disabled, true);
  assert.equal(store.has('cth.skipHivePickerOnce'), false);
  assert.equal(findAll(tree, (n) => n.type === PTC.ProjectThemeChoice)[0].props.disabled, false, 'not busy any more');
  el.props.onCancel();
  assert.ok(text(picker.render()).includes('create new config'), 'back to the list');

  for (const [over, shown] of [
    [{ changeHome: async () => ({ ok: false, error: 'Pick a folder that is not inside (or a parent of) the current home.' }) }, 'Pick a folder that is not inside'],
    [{ changeHome: async () => ({ ok: false }) }, 'Could not open that folder.'],
    [{ changeHome: async () => { throw new Error('ipc gone'); } }, 'ipc gone'],
  ]) {
    const r = await newProject(over);
    await button(r.dialog.render(), 'projectTheme.create').props.onClick();
    const t2 = r.dialog.render();
    assert.ok(text(t2).includes(shown), shown);
    assert.equal(findAll(t2, (n) => n.type === PTC.ProjectFolderError).length, 0);
    assert.equal(button(t2, 'projectTheme.create').props.disabled, false, 'another try is allowed');
    assert.equal(r.store.has('cth.skipHivePickerOnce'), false);
  }
});

/** One top level function of a TS file, as JS. */
function fnJs(file, name) {
  const src = read(file);
  const at = src.indexOf(`function ${name}(`);
  assert.ok(at >= 0, `${name} in ${file}`);
  const end = src.indexOf('\n}\n', at);
  return ts.transpileModule(src.slice(at, end + 2), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

test('Settings Start fresh: the window cache it clears comes back when main refuses, and only the cth keys', () => {
  const S = `${C}/SettingsModal.tsx`;
  const fns = new Function(`${fnJs(S, 'clearLocalState')}\n${fnJs(S, 'snapshotLocalState')}\n${fnJs(S, 'restoreLocalState')}\nreturn { clearLocalState, snapshotLocalState, restoreLocalState };`)();
  const { store } = cth();
  store.set('cth.roster', '[1]'); store.set('cth.view', 'pro'); store.set('i18nextLng', 'ar'); store.set('other', 'x');
  const kept = fns.snapshotLocalState();
  assert.deepEqual(kept.sort(), [['cth.roster', '[1]'], ['cth.view', 'pro']]);
  fns.clearLocalState();
  assert.deepEqual([...store.keys()].sort(), ['i18nextLng', 'other']);
  fns.restoreLocalState(kept);
  assert.deepEqual(Object.fromEntries(store), { 'cth.roster': '[1]', 'cth.view': 'pro', i18nextLng: 'ar', other: 'x' });

  const s = read(S);
  const apply = s.slice(s.indexOf('const applyChangeHome = async'), s.indexOf('const applyChangeHome = async') + 1600);
  assert.match(apply, /const kept = changeMode === 'fresh' \? snapshotLocalState\(\) : null;\s*if \(kept\) clearLocalState\(\);/);
  assert.match(apply, /window\.cth\.changeHome\(changeHome, changeMode, changeMode === 'fresh' \? freshTheme : undefined\)/);
  assert.match(apply, /if \(!res\.ok\) \{\s*if \(kept\) restoreLocalState\(kept\);\s*const refused = projectFolderError\(res\.error\);\s*if \(refused\) setChangeFolderErr\(refused\);\s*else setChangeErr/);
  assert.match(apply, /\} catch \(e\) \{\s*if \(kept\) restoreLocalState\(kept\);/);
  // the rows show only for Start fresh; a new folder or another mode clears a refusal; the button waits on one
  assert.match(s, /\{changeMode === 'fresh' && \(\s*<ProjectThemeChoice pick=\{freshTheme\} onPick=\{\(id\) => \{ setFreshTheme\(id\); \}\} disabled=\{changeBusy\} \/>\s*\)\}/);
  assert.match(s, /setChangeMode\('move'\); \/\/ recommended default\s*setFreshTheme\('office'\);\s*setChangeFolderErr\(null\);\s*setChangeHome\(res\.path\);/);
  assert.match(s, /onClick=\{\(\) => \{ setChangeMode\(value\); setChangeFolderErr\(null\); \}\}/);
  assert.match(s, /onClick=\{applyChangeHome\} disabled=\{changeBusy \|\| changeFolderErr !== null\}/);
});

test('the words: 11 projectTheme keys in three languages, placeholders kept; English as written', () => {
  const keys = ['title', 'intro', 'folder', 'starts', 'captain', 'office', 'starhike', 'create', 'notEmpty', 'unreadable', 'errTag'];
  const holes = { folder: '{{path}}', starts: '{{god}}', captain: '{{god}}' };
  for (const l of ['en', 'ar', 'zh-CN']) {
    const pt = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).projectTheme;
    assert.deepEqual(Object.keys(pt).sort(), [...keys].sort(), l);
    for (const k of keys) assert.ok(typeof pt[k] === 'string' && pt[k].trim(), `${l} ${k}`);
    for (const [k, h] of Object.entries(holes)) assert.ok(pt[k].includes(h), `${l} ${k} keeps ${h}`);
  }
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json')).projectTheme;
  assert.equal(en.intro, 'The new project starts on this floor. You can change it later in Settings, and every agent comes along.');
  assert.equal(en.notEmpty, 'Choose an empty folder for a new project.');
  assert.equal(en.captain, "{{god}} takes the captain's chair");
  const used = new Set();
  for (const f of ['ProjectThemeChoice.tsx', 'HivePicker.tsx']) for (const m of read(`${C}/${f}`).matchAll(/'projectTheme\.(\w+)'/g)) used.add(m[1]);
  assert.deepEqual([...used].sort(), [...keys].sort(), 'every key is used, none is missing');
});

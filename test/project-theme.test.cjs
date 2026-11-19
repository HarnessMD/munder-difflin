'use strict';

// Each project keeps its own floor theme (officeThemeByHive, keyed by the project's home folder).
// A project with no entry shows the global theme it showed before, so nothing moves on upgrade;
// a save is read back and answers 'not-saved' on a damaged config.json; a Windows path matches
// whatever its case; a move takes the theme along; voice sets the current project's theme from
// what the picker offers; a switch keeps every agent; a pack's seed is a look, never a name.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const LOADER = path.join(ROOT, 'test/load-ts.cjs');
const loadTs = require(LOADER);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// realtimeActions registers its handlers on electron's ipcMain: stand one in, as the loader resolves it.
const handlers = new Map();
const electronId = createRequire(LOADER).resolve('electron');
require.cache[electronId] = { id: electronId, filename: electronId, loaded: true, exports: { ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) } } };

const P = loadTs('src/shared/projectTheme.ts');
const RA = loadTs('src/main/realtimeActions.ts');

const STARHIKE_SEED = { appearance: { bodyId: 'side-part', colors: { skin: '#fad6b8', shirt: '#2a8a87', hair: '#71413b' }, presetId: 'rowan' } };
P.registerPackThemes([{ id: 'starhike', label: 'Star Hike', orchestrator: STARHIKE_SEED }]);

const tmp = (t, name) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  return d;
};

function inChild(userData, body) {
  return JSON.parse(execFileSync(process.execPath, ['-e', `
    const electron = require.resolve('electron');
    require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: { app: { getPath: () => ${JSON.stringify(userData)} } } };
    const fs = require('node:fs'), p = require('node:path').join(${JSON.stringify(userData)}, 'config.json');
    const load = require(${JSON.stringify(LOADER)});
    const C = load('src/main/config.ts'), P = load('src/shared/projectTheme.ts');
    P.registerPackThemes([{ id: 'starhike', label: 'Star Hike' }]);
    const disk = () => JSON.parse(fs.readFileSync(p, 'utf8'));
    const out = {};
    ${body}
    process.stdout.write(JSON.stringify(out));`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
}

// ─── the shared rules ───────────────────────────────────────────────────────

test('the home key: a Windows path, drive or UNC, whatever its case; a POSIX path keeps its case', () => {
  const k = P.projectThemeHomeKey;
  assert.equal(k('C:\\Users\\Ann\\MD\\'), 'c:/users/ann/md');
  assert.equal(k('c:/USERS/ann/md'), 'c:/users/ann/md');
  assert.equal(k('\\\\Server\\Share\\Team'), '//server/share/team');
  assert.equal(k('/Users/Ann/MD/'), '/Users/Ann/MD');
  assert.notEqual(k('/Users/Ann/MD'), k('/users/ann/md'), 'two POSIX homes differing only by case stay two');
  assert.equal(P.projectThemeForHome({ 'C:/Users/Ann/MD': 'starhike' }, 'c:\\users\\ann\\md'), 'starhike');
  assert.equal(P.projectThemeForHome({ '/Users/Ann/MD': 'starhike' }, '/users/ann/md'), undefined);
  assert.equal(P.projectThemeForHome(undefined, '/x'), undefined);
});

test('which theme a project shows: its own entry, else the global theme from before, else the Office', () => {
  const r = P.resolveProjectTheme;
  assert.equal(r({ officeTheme: 'friends', officeThemeByHive: { '/a': 'starhike' } }, '/a'), 'starhike');
  assert.equal(r({ officeTheme: 'friends', officeThemeByHive: { '/a': 'starhike' } }, '/b'), 'friends', 'no entry: nothing moves on upgrade');
  assert.equal(r({ officeThemeByHive: { '/a': 'gone-pack' }, officeTheme: 'friends' }, '/a'), 'friends', 'a pack this build lacks falls back');
  assert.equal(r({}, '/a'), 'office');
  assert.equal(r({ officeTheme: 'nonsense' }, null), 'office');
  assert.equal(P.isStoredProjectThemeId('gone-pack'), true, 'a stored entry for a missing pack is kept');
  assert.equal(P.isStoredProjectThemeId('Not A Pack!'), false);
  assert.equal(P.isProjectThemeId('gone-pack'), false, 'but it cannot be chosen');
  assert.equal(P.isProjectThemeId('starhike'), true);
});

test('the catalogue: built ins, then packs; a pack id must be pack shaped and not a built in; offered: the Office and packs always, TV floors with the flag', () => {
  P.registerPackThemes([{ id: 'office', label: 'Fake' }, { id: 'Bad Id', label: 'x' }, { id: 'p2', label: '  ' }, null]);
  assert.equal(P.projectTheme('office').label, 'The Office');
  assert.equal(P.isProjectThemeId('Bad Id'), false);
  assert.equal(P.projectTheme('p2').label, 'p2', 'an empty label is the id');
  const sh = P.projectTheme('starhike');
  assert.deepEqual([sh.label, sh.sceneTheme], ['Star Hike', 'starhike']);
  assert.deepEqual(P.offeredProjectThemes(false).map((t) => t.id), ['office', 'starhike', 'p2']);
  assert.ok(P.offeredProjectThemes(true).map((t) => t.id).includes('friends'));
  assert.equal(P.floorSceneTheme('starhike', false), 'starhike', 'a pack is its own floor');
  assert.equal(P.floorSceneTheme('friends', false), 'office', 'a TV floor only with the flag');
  assert.equal(P.floorSceneTheme('friends', true), 'friends');
  assert.equal(P.projectTheme('nope').id, 'office');
});

test('a pack\'s orchestrator seed is a look: Star Hike\'s seed has no name, so the person\'s orchestrator keeps its own', () => {
  assert.equal(P.isProjectThemeSeed(STARHIKE_SEED), true, 'a seed without a name is a look only');
  assert.deepEqual(P.projectTheme('starhike').projectDefaults, { orchestrator: STARHIKE_SEED });
  assert.equal(P.isProjectThemeSeed({ name: 'Cpt', appearance: { bodyId: 'b' } }), true);
  for (const bad of [null, {}, { appearance: {} }, { appearance: { bodyId: ' ' } }, { name: 5, appearance: { bodyId: 'b' } }]) {
    assert.equal(P.isProjectThemeSeed(bad), false, JSON.stringify(bad));
  }
});

test('a home change: a move takes the theme along; a new project in a reused folder starts fresh', () => {
  const m = P.moveProjectTheme;
  assert.deepEqual(m({ '/old': 'starhike', '/x': 'friends' }, { mode: 'move', oldHome: '/old', newHome: '/new', blankProject: true }), { '/new': 'starhike', '/x': 'friends' });
  assert.deepEqual(m({ '/old': 'starhike', '/new': 'friends' }, { mode: 'move', oldHome: '/old', newHome: '/new', blankProject: false }), { '/new': 'starhike' }, 'the moved project\'s theme wins');
  assert.deepEqual(m({ '/new': 'friends' }, { mode: 'move', oldHome: '/old', newHome: '/new', blankProject: false }), {}, 'a moved project with no entry shows the global theme there');
  assert.deepEqual(m({ 'C:/Old': 'starhike' }, { mode: 'move', oldHome: 'c:\\old', newHome: 'c:\\OLD', blankProject: false }), { 'C:/Old': 'starhike' }, 'same folder: nothing to do');
  assert.deepEqual(m({ '/reused': 'starhike' }, { mode: 'fresh', newHome: '/reused', blankProject: true }), {}, 'a blank project does not inherit');
  assert.deepEqual(m({ '/reused': 'starhike' }, { mode: 'fresh', newHome: '/reused', blankProject: false }), { '/reused': 'starhike' }, 'switching back to an existing project keeps its theme');
  // A new project may come with its chosen floor; a move, or a folder that already holds a project, ignores it
  assert.deepEqual(m({ '/reused': 'friends', '/x': 'office' }, { mode: 'fresh', newHome: '/reused', blankProject: true, theme: 'starhike' }), { '/reused': 'starhike', '/x': 'office' });
  assert.deepEqual(m({ 'C:/New': 'friends' }, { mode: 'fresh', newHome: 'c:\\new', blankProject: true, theme: 'office' }), { 'c:/new': 'office' }, 'one entry per home, whatever its case on Windows');
  assert.deepEqual(m({}, { mode: 'fresh', newHome: '/n', blankProject: true, theme: 'nope' }), {}, 'an unknown theme is not stored');
  assert.deepEqual(m({ '/n': 'friends' }, { mode: 'fresh', newHome: '/n', blankProject: false, theme: 'starhike' }), { '/n': 'friends' }, 'an existing project keeps its own');
  assert.deepEqual(m({ '/old': 'friends' }, { mode: 'move', oldHome: '/old', newHome: '/new', blankProject: true, theme: 'starhike' }), { '/new': 'friends' }, 'a move keeps its own');
  const before = { '/old': 'starhike' };
  m(before, { mode: 'move', oldHome: '/old', newHome: '/new', blankProject: true });
  assert.deepEqual(before, { '/old': 'starhike' }, 'the input is never changed');
});

test('a new project\'s folder: missing, or holding only .DS_Store, is empty; anything else, or a folder that cannot be read, is refused', async (t) => {
  const F = loadTs('src/main/fs.ts');
  const d = tmp(t, 'newproj');
  assert.equal(await F.newProjectFolderState(d), 'empty');
  assert.equal(await F.newProjectFolderState(path.join(d, 'not-yet')), 'empty', 'a folder still to be made');
  fs.writeFileSync(path.join(d, '.DS_Store'), '');
  assert.equal(await F.newProjectFolderState(d), 'empty');
  fs.writeFileSync(path.join(d, '.hidden'), '');
  assert.equal(await F.newProjectFolderState(d), 'not-empty');
  const f = path.join(d, 'a-file');
  fs.writeFileSync(f, '');
  assert.equal(await F.newProjectFolderState(f), 'unreadable', 'a file is not a folder');
  const locked = path.join(d, 'locked');
  fs.mkdirSync(locked, { mode: 0o000 });
  try {
    if (process.getuid?.() !== 0) assert.equal(await F.newProjectFolderState(locked), 'unreadable');
  } finally { fs.chmodSync(locked, 0o700); }
});

// ─── saving it ──────────────────────────────────────────────────────────────

test('a save is merged into the latest config.json, keyed once per home, and read back', (t) => {
  const r = inChild(tmp(t, 'theme'), `
    C.writeConfig({ harnessHome: '/h/one', officeTheme: 'friends', officeThemeByHive: { '/h/other': 'starhike' } });
    out.first = C.setProjectThemeForHome('/h/one', 'starhike');
    out.map1 = disk().officeThemeByHive;
    out.global = disk().officeTheme;
    out.win1 = C.setProjectThemeForHome('C:\\\\Users\\\\Ann\\\\MD', 'starhike');
    out.win2 = C.setProjectThemeForHome('c:/users/ann/md', 'office');
    out.map2 = disk().officeThemeByHive;
    out.invalid = C.setProjectThemeForHome('/h/one', 'friends-and-more');
    out.unknownPack = C.setProjectThemeForHome('/h/one', 'gone-pack');
    out.map3 = disk().officeThemeByHive;`);
  assert.deepEqual(r.first, { ok: true, theme: 'starhike' });
  assert.deepEqual(r.map1, { '/h/other': 'starhike', '/h/one': 'starhike' }, 'another project\'s entry kept');
  assert.equal(r.global, 'friends', 'the global key is never touched');
  assert.deepEqual(r.win2, { ok: true, theme: 'office' });
  assert.deepEqual(r.map2, { '/h/other': 'starhike', '/h/one': 'starhike', 'c:/users/ann/md': 'office' }, 'one key for a Windows home in any case');
  assert.deepEqual(r.invalid, { ok: false, reason: 'invalid', theme: 'starhike' });
  assert.deepEqual(r.unknownPack, { ok: false, reason: 'invalid', theme: 'starhike' }, 'only a theme this build has can be chosen');
  assert.deepEqual(r.map3, r.map2);
});

test('a damaged config.json: the save is skipped and says "not-saved", with the theme still in force; the file is kept', (t) => {
  const r = inChild(tmp(t, 'theme-bad'), `
    C.writeConfig({ harnessHome: '/h/one', officeThemeByHive: { '/h/one': 'office' } });
    C.readConfig();
    const text = '{"harnessHome": "/h/one", "officeThemeByHive": {"/h/one": "office"}';
    fs.writeFileSync(p, text);
    out.save = C.setProjectThemeForHome('/h/one', 'starhike');
    out.kept = fs.readFileSync(p, 'utf8') === text;`);
  assert.deepEqual(r.save, { ok: false, reason: 'not-saved', theme: 'office' });
  assert.equal(r.kept, true);
});

test('stored entries: garbage dropped, a missing pack\'s entry kept, homes keyed on read', (t) => {
  const dir = tmp(t, 'theme-read');
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ officeThemeByHive: { 'C:\\Proj\\': 'starhike', '/keep': 'gone-pack', '/junk': 'Not A Theme!', ' ': 'office', '/n': 5 } }));
  const r = inChild(dir, `out.map = C.readConfig().officeThemeByHive;`);
  assert.deepEqual(r.map, { 'c:/proj': 'starhike', '/keep': 'gone-pack' });
  const arr = tmp(t, 'theme-arr');
  fs.writeFileSync(path.join(arr, 'config.json'), JSON.stringify({ officeThemeByHive: ['starhike'] }));
  assert.equal(inChild(arr, `out.has = 'officeThemeByHive' in C.readConfig();`).has, false);
});

// ─── voice ──────────────────────────────────────────────────────────────────

function voice(state) {
  const calls = [];
  const deps = new Proxy({
    getConfigValue: (k) => state.config[k],
    patchConfig: (patch) => calls.push(['patchConfig', patch]),
    getProjectTheme: () => state.theme,
    setProjectTheme: (id) => { calls.push(['setProjectTheme', id]); return state.save(id); },
    hiveEnabled: () => true,
    hiveLog: () => {}
  }, { get: (o, k) => (k in o ? o[k] : () => undefined) });
  RA.registerRealtimeActionIpc(deps);
  const run = (value, key = 'officeTheme') => handlers.get('realtime:action')({}, { verb: 'update_setting', key, value });
  return { run, calls };
}

test('voice sets the current project\'s theme, never the global key, from what the picker offers', async () => {
  const state = { config: { tvShowOffices: false }, theme: 'office', save: (id) => ({ ok: true, theme: id }) };
  const v = voice(state);
  const done = await v.run('star hike');
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.equal(done.spoken, 'Done, this project\'s theme is now Star Hike (was The Office). Every agent stays.');
  assert.deepEqual(v.calls, [['setProjectTheme', 'starhike']]);
  assert.ok(!v.calls.some(([k]) => k === 'patchConfig'), 'the global officeTheme is never written');
  assert.equal(done.needsConfirm, undefined, 'a look only: no confirm step');

  state.theme = 'starhike';
  assert.equal((await v.run('Star Hike', 'theme')).spoken, 'This project\'s theme is already Star Hike, nothing to change.');
  const tv = await v.run('Friends', 'projectTheme');
  assert.equal(tv.ok, false);
  assert.match(tv.spoken, /^Friends is a TV-show office, and TV-show offices are off in Settings\. The choices are: The Office, Star Hike/);
  assert.match((await v.run('Narnia')).spoken, /^There's no "Narnia" theme here\. The choices are: /);
  assert.match((await v.run('')).spoken, /^Which theme\? The choices are: /);

  state.theme = 'office';
  state.save = () => ({ ok: false, reason: 'not-saved', theme: 'office' });
  const notSaved = await v.run('starhike');
  assert.deepEqual([notSaved.ok, notSaved.spoken], [false, 'I couldn\'t save that: the settings file is damaged or busy, so this project stays on The Office.']);
  state.save = () => ({ ok: false, reason: 'no-home', theme: 'office' });
  assert.equal((await v.run('starhike')).spoken, 'I couldn\'t switch the theme: no project is open.');
});

// ─── wiring ─────────────────────────────────────────────────────────────────

test('wiring: one save path for the picker and voice; a home change carries the map; no global key by voice', () => {
  const idx = read('src/main/index.ts');
  assert.match(idx, /function chooseProjectTheme\(theme: unknown\): ProjectThemeSave \{\s*const cfg = readConfig\(\);\s*if \(!cfg\.harnessHome\) return \{ ok: false, reason: 'no-home', theme: resolveProjectTheme\(cfg, null\) \};\s*return setProjectThemeForHome\(cfg\.harnessHome, theme\);/);
  assert.match(idx, /ipcMain\.handle\('config:setProjectTheme', \(_evt, theme: unknown\) => chooseProjectTheme\(theme\)\);/);
  assert.match(idx, /getProjectTheme: \(\) => \{ const c = readConfig\(\); return resolveProjectTheme\(c, c\.harnessHome \?\? null\); \},\s*setProjectTheme: \(theme\) => chooseProjectTheme\(theme\)/);
  const change = /ipcMain\.handle\('config:changeHome'[\s\S]*?\n\}\);/.exec(idx)[0];
  const blank = change.indexOf("const blankProject = !existsSync(join(newHome, 'hive'));");
  assert.ok(blank > 0, 'a fresh home is told apart');
  assert.ok(blank < change.indexOf('cpSync') || change.indexOf('cpSync') < 0, 'read before anything is copied in');
  assert.match(change, /const officeThemeByHive = moveProjectTheme\(readConfig\(\)\.officeThemeByHive, \{ mode, oldHome, newHome, blankProject, theme \}\);\s*writeConfig\(\{ harnessHome: newHome, officeThemeByHive \}\);/);
  // Only a fresh start takes a chosen theme; it is checked, and the folder must be empty, before anything is stopped or copied
  const guard = change.indexOf("const chosen = mode === 'fresh' && p.projectTheme != null ? p.projectTheme : undefined;");
  assert.ok(guard > 0 && guard < change.indexOf('clearMissionTimers()'), 'refused before the old home is torn down');
  assert.match(change, /if \(chosen !== undefined\) \{\s*if \(!isProjectThemeId\(chosen\)\) return \{ ok: false, error: 'invalid-theme' \};\s*theme = chosen;\s*const folder = await newProjectFolderState\(newHome\);\s*if \(folder !== 'empty'\) return \{ ok: false, error: folder \};\s*\}/);
  assert.match(read('src/preload/index.ts'), /changeHome: \(newHome: string, mode: 'move' \| 'fresh', projectTheme\?: ProjectThemeId\)[^\n]*\n\s*ipcRenderer\.invoke\('config:changeHome', \{ newHome, mode, \.\.\.\(projectTheme !== undefined \? \{ projectTheme \} : \{\}\) \}\),/);
  const ra = read('src/main/realtimeActions.ts');
  assert.doesNotMatch(/const SETTING_POLICY[\s\S]*?\n\};/.exec(ra)[0], /^\s*officeTheme:/m, 'not a plain setting any more');
  assert.match(ra, /if \(THEME_KEYS\.has\(key\)\) return setThemeByVoice\(deps, a\.value\);\s*const policy = SETTING_POLICY\[key\];/);
  assert.match(read('src/preload/index.ts'), /setProjectTheme: \(theme: ProjectThemeId\): Promise<ProjectThemeSave> => ipcRenderer\.invoke\('config:setProjectTheme', theme\)/);
});

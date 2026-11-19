'use strict';

// The window says what main did after a failure. After main reloads the window by itself, a
// notice says when, once, until OK. While main holds config.json, tasks.json or registry.json
// as damaged, a banner names the file in plain words, says changes to it are paused, names the
// copy main kept (or says none was made), offers to show the file, and goes once it reads
// again; it has no close. Settings keeps Save off while config.json is paused and says why.
// The error screen's reload goes through main; the reloaded window opens on the project.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const i18next = require(path.join(ROOT, 'node_modules/i18next'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const C = 'src/renderer/src/components';
const LOC = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
const en = LOC('en');
const get = (o, k) => k.split('.').reduce((v, p) => (v == null ? v : v[p]), o);
const flat = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${pre}${k}.`) : [`${pre}${k}`]));

// React stood in: each mounted component keeps its own state; an effect runs after a render
// when its deps change (cleanup first). JSX is plain { type, props } to read and press.
let current = null;
const React = {
  useState: (init) => {
    const c = current;
    const i = c.hook++;
    if (!(i in c.states)) c.states[i] = typeof init === 'function' ? init() : init;
    return [c.states[i], (v) => { c.states[i] = typeof v === 'function' ? v(c.states[i]) : v; }];
  },
  useEffect: (fn, deps) => {
    const c = current;
    const i = c.hook++;
    const prev = c.deps.get(i);
    if (prev && deps && deps.length === prev.length && deps.every((d, k) => Object.is(d, prev[k]))) return;
    c.deps.set(i, deps);
    c.pending.push(() => { c.cleanups.get(i)?.(); const u = fn(); c.cleanups.set(i, typeof u === 'function' ? u : undefined); });
  },
};
const jsx = (type, p) => ({ type, props: p ?? {} });
const kids = (n) => [n?.props?.children].flat(Infinity).filter((c) => c != null && c !== false && c !== true);
const text = (n) => (typeof n === 'string' || typeof n === 'number' ? String(n) : kids(n).map(text).join(''));
function findAll(n, pred, out = []) {
  if (n && typeof n === 'object') { if (pred(n)) out.push(n); for (const c of kids(n)) findAll(c, pred, out); }
  return out;
}
function mount(fn, props = {}) {
  const c = { states: [], hook: 0, deps: new Map(), cleanups: new Map(), pending: [] };
  c.render = () => {
    const prev = current; current = c; c.hook = 0;
    let out;
    try { out = fn(props); } finally { current = prev; }
    for (const e of c.pending.splice(0)) e();
    return out;
  };
  c.unmount = () => { for (const u of c.cleanups.values()) u?.(); };
  return c;
}
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };
/** The English words, filled in as i18next does. */
const t = (k, o = {}) => {
  const v = get(en, k);
  return typeof v === 'string' ? v.replace(/\{\{(\w+)\}\}/g, (_, n) => String(o[n])) : k;
};

/** FailureNotices with main stood in; its 5 s poll is captured, not timed. */
function noticesOf(cth) {
  const timers = { polls: [], cleared: [] };
  global.window = { cth };
  const js = ts.transpileModule(read(`${C}/FailureNotices.tsx`), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const all = {
    react: React, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-i18next': { useTranslation: () => ({ t, i18n: { language: 'en' } }) }, './PixelButton': { PixelButton: 'PixelButton' },
  };
  const mod = { exports: {} };
  const setInterval = (fn, ms) => { assert.equal(ms, 5000); timers.polls.push(fn); return timers.polls.length; };
  const clearInterval = (id) => { timers.cleared.push(id); };
  new Function('require', 'module', 'exports', 'setInterval', 'clearInterval', js)(
    (m) => { if (!(m in all)) throw new Error(`unexpected import ${m}`); return all[m]; }, mod, mod.exports, setInterval, clearInterval);
  return { N: mod.exports, timers };
}
const buttons = (tree) => findAll(tree, (n) => n.type === 'PixelButton');
const draw = async (c) => { c.render(); await settle(); return c.render(); };

test('restored: once main reloaded the window, a notice says when, with OK to close it; it is taken once, so it never shows again', async () => {
  const at = Date.UTC(2026, 9, 19, 9, 41);
  let taken = 0;
  const { N } = noticesOf({ takeRecoveryNotice: async () => { taken++; return taken === 1 ? { at } : null; } });
  const c = mount(N.RecoveryNotice);
  const tree = await draw(c);
  assert.equal(tree.props.role, 'status');
  const time = new Date(at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  assert.equal(text(findAll(tree, (n) => n.type === 'b')[0]), `The window crashed and was reloaded at ${time}.`);
  assert.match(text(tree), /Your agents kept running\./);
  assert.equal(buttons(tree).length, 1);
  assert.equal(text(buttons(tree)[0]), 'OK');
  assert.equal(tree.props.style.insetInlineStart, 16, 'sits on the reading side in both directions');
  buttons(tree)[0].props.onClick();
  assert.equal(c.render(), null);
  c.render(); await settle();
  assert.equal(taken, 1, 'asked once per window');

  const none = mount(noticesOf({ takeRecoveryNotice: async () => null }).N.RecoveryNotice);
  assert.equal(await draw(none), null);
  const failed = mount(noticesOf({ takeRecoveryNotice: async () => { throw new Error('gone'); } }).N.RecoveryNotice);
  assert.equal(await draw(failed), null, 'a failed read shows nothing and throws nothing');
});

test('paused file: named in plain words, the copy in code, or the line with no copy; settings add the defaults line; show the file names it to main; no close', async () => {
  const revealed = [];
  const main = { list: [
    { file: 'config.json', copy: 'config.damaged-2026-10-19T09-40-00.json', error: 'Unexpected token' },
    { file: 'tasks.json', copy: null, error: 'Unexpected end' },
    { file: 'other.json', copy: 'other.damaged.json', error: 'x' },
  ] };
  const { N, timers } = noticesOf({
    integrityIssues: async () => main.list,
    integrityReveal: async (name) => { revealed.push(name); if (name === 'tasks.json') throw new Error('no window'); return { ok: true }; },
  });
  const c = mount(N.IntegrityBanner);
  assert.equal(c.render(), null, 'nothing before main answers');
  await settle();
  const tree = c.render();
  const boxes = findAll(tree, (n) => n.props && n.props['data-integrity']);
  assert.deepEqual(boxes.map((b) => b.props['data-integrity']), ['config.json', 'tasks.json', 'other.json']);
  for (const b of boxes) {
    assert.equal(b.props.role, 'status');
    assert.ok(text(b).startsWith('paused'), 'the paused tag first');
    assert.equal(buttons(b).length, 1, 'show the file only: no close while paused');
    assert.equal(text(buttons(b)[0]), 'show the file');
  }
  assert.match(text(boxes[0]), /Your settings \(config\.json\) could not be read\. Changes to it are paused\./);
  const code = findAll(boxes[0], (n) => n.type === 'code');
  assert.equal(code.length, 1);
  assert.equal(code[0].props.dir, 'ltr');
  assert.equal(text(code[0]), 'config.damaged-2026-10-19T09-40-00.json');
  assert.equal(text(findAll(boxes[0], (n) => n.type === 'p')[0]),
    'The app has not written over it and keeps a copy as config.damaged-2026-10-19T09-40-00.json. Fix the file or put a good copy back; changes start again on their own. Until then the app runs on default settings.');
  assert.match(text(boxes[1]), /The task board \(tasks\.json\) could not be read/);
  assert.equal(text(findAll(boxes[1], (n) => n.type === 'p')[0]), en.integrity.bodyNoCopy, 'no copy named, no defaults line');
  assert.equal(findAll(boxes[1], (n) => n.type === 'code').length, 0);
  assert.match(text(boxes[2]), /^pausedother\.json could not be read/, 'a file with no plain name is named as it is');
  for (const b of boxes) buttons(b)[0].props.onClick();
  await settle();
  assert.deepEqual(revealed, ['config.json', 'tasks.json', 'other.json'], 'by name, never a path');

  // The banner reads again every 5 s: a failed read keeps it, an empty list removes it.
  assert.equal(timers.polls.length, 1);
  window.cth.integrityIssues = () => Promise.reject(new Error('main busy'));
  timers.polls[0](); await settle();
  assert.equal(findAll(c.render(), (n) => n.props && n.props['data-integrity']).length, 3, 'a failed read keeps the last list');
  window.cth.integrityIssues = async () => ({ not: 'a list' });
  timers.polls[0](); await settle();
  assert.equal(c.render(), null, 'an answer that is not a list is no issues');
  assert.deepEqual(c.states[0], [], 'still a list, so Settings can ask it which file is paused');
  window.cth.integrityIssues = async () => [{ file: 'registry.json', copy: null, error: 'x' }];
  timers.polls[0](); await settle();
  assert.match(text(c.render()), /The agent list \(registry\.json\) could not be read/);
  window.cth.integrityIssues = async () => [];
  timers.polls[0](); await settle();
  assert.equal(c.render(), null, 'goes by itself once the file reads');

  // Closed: the poll stops and a late answer is dropped.
  let late;
  window.cth.integrityIssues = () => new Promise((r) => { late = r; });
  timers.polls[0]();
  c.unmount();
  assert.deepEqual(timers.cleared, [1]);
  late([{ file: 'tasks.json', copy: null, error: 'x' }]); await settle();
  assert.deepEqual(c.states[0], [], 'nothing set after close');
});

test('Settings: while config.json is paused Save is off and says why; another paused file leaves Save alone', () => {
  const src = read(`${C}/SettingsModal.tsx`);
  assert.match(src, /import \{ useIntegrityIssues \} from '\.\/FailureNotices';/);
  const m = /const configPaused = (useIntegrityIssues\(\)\.some\(\(issue\) => issue\.file === 'config\.json'\));/.exec(src);
  assert.ok(m, 'Settings reads the same list as the banner');
  const paused = (list) => new Function('useIntegrityIssues', `return ${m[1]};`)(() => list);
  assert.equal(paused([{ file: 'config.json' }]), true);
  assert.equal(paused([{ file: 'tasks.json' }, { file: 'registry.json' }]), false);
  assert.equal(paused([]), false);
  const at = src.indexOf('{configPaused && (');
  const foot = src.slice(at, src.indexOf("t('common.save')", at));
  assert.match(foot, /role="status"[^>]*>\{t\('integrity\.saveBlocked'\)\}/);
  assert.match(foot, /\{saveNote && !configPaused && \(/);
  assert.match(foot, /\{dirty && !saveNote && !configPaused && \(/);
  assert.match(foot, /onClick=\{\(\) => void saveAll\(\)\} disabled=\{saveBusy \|\| configPaused\}/);
  assert.doesNotMatch(foot, /cth-(coral|red)|status-blocked/, 'the reason is said in ink, not red');
});

test('the error screen reloads through main; only when that cannot be done does it reload here, back on the open project', () => {
  const src = read(`${C}/ErrorBoundary.tsx`);
  const fn = src.slice(src.indexOf('function reloadWindow'), src.indexOf('}\n', src.indexOf('window.location.reload();')) + 2);
  const run = (cth) => {
    const log = [];
    const window = {
      cth,
      localStorage: { setItem: (k, v) => log.push(['set', k, v]) },
      location: { reload: () => log.push(['reload']) },
    };
    new Function('window', 'SKIP_PICKER_ONCE', `${ts.transpile(fn, { target: ts.ScriptTarget.ES2022 })}\nreloadWindow();`)(window, 'cth.skipHivePickerOnce');
    return log;
  };
  const sent = [];
  assert.deepEqual(run({ reloadAfterError: () => sent.push('main') }), []);
  assert.deepEqual(sent, ['main']);
  assert.deepEqual(run({ reloadAfterError: () => { throw new Error('no bridge'); } }), [['set', 'cth.skipHivePickerOnce', '1'], ['reload']]);
  assert.deepEqual(run(undefined), [['set', 'cth.skipHivePickerOnce', '1'], ['reload']]);
});

test('the reloaded window opens on the project, not the picker; the banner shows on every screen, the notice on the floor', () => {
  const src = read('src/renderer/src/App.tsx');
  const init = src.slice(src.indexOf('useState<boolean>(() => {') + 'useState<boolean>('.length, src.indexOf('  });', src.indexOf('useState<boolean>(() => {')) + 3);
  const run = (recovering, flag) => {
    const store = new Map(flag ? [['cth.skipHivePickerOnce', '1']] : []);
    const window = { cth: { recovering }, localStorage: { getItem: (k) => store.get(k) ?? null, removeItem: (k) => store.delete(k) } };
    return [new Function('window', `return (${init})();`)(window), store.size];
  };
  assert.deepEqual(run(true, false), [true, 0]);
  assert.deepEqual(run(false, true), [true, 0], 'a switch still skips once');
  assert.deepEqual(run(false, false), [false, 0]);
  assert.match(src, /import \{ IntegrityBanner, RecoveryNotice \} from '@\/components\/FailureNotices';/);
  assert.match(src, /return <><IntegrityBanner \/><OnboardingWizard /);
  assert.match(src, /return <><IntegrityBanner \/><HivePicker /);
  assert.match(src, /<RecoveryNotice \/>\s*<IntegrityBanner \/>/);
  assert.equal(src.match(/<RecoveryNotice \/>/g).length, 1, 'the restored notice only where the project is open');

  const pre = read('src/preload/index.ts');
  assert.match(pre, /integrityIssues: \(\)[^]*?ipcRenderer\.invoke\('integrity:issues'\)/);
  assert.match(pre, /integrityReveal: \(name: string\)[^]*?ipcRenderer\.invoke\('integrity:reveal', name\)/);
  assert.match(pre, /recovering: \(\(\): boolean => \{ try \{ return ipcRenderer\.sendSync\('window:recoveringSync'\) === true; \} catch \{ return false; \} \}\)\(\)/);
  assert.match(pre, /takeRecoveryNotice: \(\)[^]*?ipcRenderer\.invoke\('window:takeRecoveryNotice'\)/);
  assert.match(pre, /reloadAfterError: \(\): void => ipcRenderer\.send\('window:reloadAfterError'\)/);
});

test('colours: the tag and boxes in the theme\'s soft colours, no red', () => {
  const src = read(`${C}/FailureNotices.tsx`);
  const used = [...new Set(src.match(/var\(--cth-[a-z0-9-]+\)/g))];
  assert.deepEqual(used.filter((v) => /coral|red|status-blocked/.test(v)), []);
  assert.ok(used.includes('var(--cth-lemon-light)'));
  const tokens = read('src/renderer/src/design/tokens.css');
  for (const v of used) assert.match(tokens, new RegExp(`${v.slice(4, -1)}\\s*:`), `${v} is declared`);
});

test('words: every notice key in English, Arabic and Chinese, translated, with the same placeholders', async () => {
  const keys = [...flat(en.recovery).map((k) => `recovery.${k}`), ...flat(en.integrity).map((k) => `integrity.${k}`)];
  assert.equal(keys.length, 13);
  for (const l of ['ar', 'zh-CN']) {
    const j = LOC(l);
    assert.deepEqual(flat(j.recovery), flat(en.recovery), `${l} recovery keys`);
    assert.deepEqual(flat(j.integrity), flat(en.integrity), `${l} integrity keys`);
    for (const k of keys) {
      const v = get(j, k);
      assert.equal(typeof v, 'string', `${l} ${k}`);
      assert.deepEqual((v.match(/\{\{\w+\}\}/g) ?? []).sort(), (get(en, k).match(/\{\{\w+\}\}/g) ?? []).sort(), `${l} ${k} placeholders`);
      if (!/\.file\./.test(k)) assert.notEqual(v, get(en, k), `${l} ${k} is translated`);
      else assert.ok(v.includes(`${k.split('.').pop()}.json`), `${l} ${k} keeps the file name`);
    }
  }
  const i = i18next.createInstance();
  await i.init({ lng: 'ar', resources: { ar: { translation: LOC('ar') } }, interpolation: { escapeValue: false } });
  assert.ok(i.t('integrity.body', { copy: '\u0001' }).includes('\u0001'), 'the copy has one place in the Arabic sentence');
});

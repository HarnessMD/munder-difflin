'use strict';

/* The IDE: review findings 6, 13, 15, 17, 24, 25 and the StrictMode hole in
 * ide-session test 5 (Creed's review of 4f5b2aa0, 20 Sep 2026).
 *
 * IdePanel.tsx cannot be mounted by this suite (Monaco, window.cth, the store),
 * so what CAN run is run: the buffer rules are a pure module, the session rules
 * are pure, and the hook is mounted under react-dom, in StrictMode, the way the
 * app runs it. The panel's wiring of those is pinned as text at the end, and a
 * text pin is only that. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { toIdeSession, parseIdeSession, IDE_SESSION_MAX_TABS, IDE_SESSION_KEY } = loadTs('src/shared/ideSession.ts');
const B = loadTs('src/shared/ideBuffers.ts');

const ready = (content, original = content) => ({ content, original, status: 'ready', saveState: 'idle' });
const tab = (rel, mode = 'edit') => ({ key: `${mode}::${rel}`, mode, rel });

/* ---- finding 6: a dirty buffer with no tab made the IDE impossible to close -- */

test('6a. a DIRTY tab refuses to close; a clean one, a loading one and a home tab do not', () => {
  const buffers = { 'a.ts': ready('edited', 'on disk'), 'b.ts': ready('same'), 'c.ts': { content: '', original: '', status: 'loading', saveState: 'idle' } };
  assert.equal(B.canCloseTab(tab('a.ts'), buffers), false);
  assert.equal(B.canCloseTab(tab('b.ts'), buffers), true);
  assert.equal(B.canCloseTab(tab('c.ts'), buffers), true);
  assert.equal(B.canCloseTab({ key: 'home::1', mode: 'home', rel: '' }, buffers), true);
  // A diff tab onto the same file is not the editor: closing it loses nothing.
  assert.equal(B.canCloseTab(tab('a.ts', 'diff'), buffers), true);
  // Duplicate makes a second window onto ONE buffer. Closing one of two loses
  // nothing; closing the last one would.
  const twin = { key: 'edit::a.ts#2', mode: 'edit', rel: 'a.ts' };
  assert.equal(B.canCloseTab(tab('a.ts'), buffers, [tab('a.ts'), twin]), true);
  assert.equal(B.canCloseTab(tab('a.ts'), buffers, [tab('a.ts')]), false);
});

test('6b. close others and close right KEEP every dirty tab', () => {
  const tabs = [tab('a.ts'), tab('b.ts'), tab('c.ts'), tab('d.ts')];
  const buffers = { 'a.ts': ready('x', 'y'), 'd.ts': ready('x', 'y') };
  assert.deepEqual(B.tabsAfterCloseOthers(tabs, 'edit::b.ts', buffers).map((t) => t.rel), ['a.ts', 'b.ts', 'd.ts']);
  assert.deepEqual(B.tabsAfterCloseRight(tabs, 'edit::b.ts', buffers).map((t) => t.rel), ['a.ts', 'b.ts', 'd.ts']);
});

test('6c. the way out a person chooses: discard puts the buffer back to what is on disk', () => {
  const out = B.discardChanges({ 'a.ts': ready('edited', 'on disk') }, 'a.ts');
  assert.equal(out['a.ts'].content, 'on disk');
  assert.equal(B.isDirty(out['a.ts']), false);
  const untouched = { 'a.ts': ready('same') };
  assert.equal(B.discardChanges(untouched, 'nope.ts'), untouched, 'an unknown file changes nothing');
});

test('6d. trashing a file or its folder drops the buffers under it, and only those', () => {
  const buffers = { 'src/a.ts': ready('x', 'y'), 'src/deep/b.ts': ready('x', 'y'), 'srcish.ts': ready('x', 'y') };
  assert.deepEqual(Object.keys(B.buffersAfterTrash(buffers, 'src')), ['srcish.ts'], '`src` must not take `srcish.ts` with it');
  assert.deepEqual(Object.keys(B.buffersAfterTrash(buffers, 'src/a.ts')).sort(), ['src/deep/b.ts', 'srcish.ts']);
});

test('6e. a dirty buffer with NO tab is found, so it can be shown instead of blocking in silence', () => {
  const buffers = { 'a.ts': ready('x', 'y'), 'b.ts': ready('x', 'y'), 'c.ts': ready('same') };
  assert.deepEqual(B.orphanDirtyRels([tab('a.ts')], buffers), ['b.ts']);
  assert.deepEqual(B.orphanDirtyRels([tab('a.ts'), tab('b.ts')], buffers), []);
  // A diff tab onto b.ts is not an editor tab onto b.ts.
  assert.deepEqual(B.orphanDirtyRels([tab('a.ts'), tab('b.ts', 'diff')], buffers), ['b.ts']);
});

test('15. the number main is told, and what it then asks: a count, plain words, no dash', () => {
  assert.equal(B.dirtyCount({ 'a.ts': ready('x', 'y'), 'b.ts': ready('same'), 'c.ts': ready('1', '2') }), 2);
  assert.equal(B.dirtyCount({}), 0);
  assert.match(B.ideQuitWarning(1).message, /^1 file in the IDE has unsaved changes\.$/);
  assert.match(B.ideQuitWarning(3).message, /^3 files in the IDE have unsaved changes\.$/);
  for (const n of [1, 3]) for (const v of Object.values(B.ideQuitWarning(n))) assert.doesNotMatch(v, /[\u2013\u2014]|\s-\s/);
});

/* ---- finding 13: a stale read landing under another project --------------- */

test('13. a file read that answers after the project changed is dropped', () => {
  assert.equal(B.readStillWanted('/repo/a', '/repo/a'), true);
  assert.equal(B.readStillWanted('/repo/a', '/repo/b'), false, "B's package.json must not land, clean, under A's root");
  assert.equal(B.readStillWanted('/repo/a', null), false);
});

/* ---- findings 17 and 24: what is saved ------------------------------------ */

test('17. over the cap, the NEWEST tabs and the active one are kept, not the oldest', () => {
  const tabs = Array.from({ length: IDE_SESSION_MAX_TABS + 5 }, (_, i) => tab(`f${i}.ts`));
  const requested = tabs[tabs.length - 1];
  const s = toIdeSession({ tabs, activeKey: requested.key, sideTab: 'explorer', mdViews: {} });
  assert.equal(s.tabs.length, IDE_SESSION_MAX_TABS);
  assert.ok(s.tabs.some((t) => t.rel === requested.rel), 'the file just opened was dropped by the cap');
  assert.equal(s.tabs[s.active]?.rel, requested.rel, 'and it is no longer the active tab');
  // An OLD tab that is active survives the cap too.
  const old = toIdeSession({ tabs, activeKey: tabs[0].key, sideTab: 'explorer', mdViews: {} });
  assert.equal(old.tabs.length, IDE_SESSION_MAX_TABS);
  assert.equal(old.tabs[old.active]?.rel, 'f0.ts');
});

test('24. what is written reads back the same: a duplicate tab does not move the active one', () => {
  const tabs = [tab('a.ts'), tab('b.ts'), { key: 'edit::b.ts#2', mode: 'edit', rel: 'b.ts' }];
  const written = toIdeSession({ tabs, activeKey: 'edit::b.ts#2', sideTab: 'explorer', mdViews: {} });
  const back = parseIdeSession(JSON.stringify(written));
  assert.deepEqual(back.tabs.map((t) => t.rel), ['a.ts', 'b.ts']);
  assert.equal(back.tabs[back.active]?.rel, 'b.ts', `reopened on ${back.tabs[back.active]?.rel ?? 'nothing'}, not on the file that was in front`);
  assert.deepEqual(written, back, 'toIdeSession and parseIdeSession disagree about the same session');
});

/* ---- finding 25 and the StrictMode hole: the hook, mounted ----------------- */

const el = (tag) => ({
  nodeType: 1, tagName: tag, nodeName: tag, namespaceURI: 'http://www.w3.org/1999/xhtml', childNodes: [], style: {}, attrs: {},
  addEventListener() {}, removeEventListener() {}, appendChild(c) { this.childNodes.push(c); return c; },
  removeChild(c) { this.childNodes = this.childNodes.filter((x) => x !== c); },
  insertBefore(c) { this.childNodes.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, contains() { return false; }, get ownerDocument() { return globalThis.document; }
});
globalThis.document ??= {
  nodeType: 9, body: el('BODY'), documentElement: el('HTML'), createElement: (t) => el(t.toUpperCase()),
  createTextNode: (t) => ({ nodeType: 3, nodeValue: t }), createEvent: () => ({ initEvent() {} }),
  addEventListener() {}, removeEventListener() {}, get activeElement() { return this.body; }, implementation: { hasFeature: () => false }
};
globalThis.window ??= {
  document: globalThis.document, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, setTimeout, clearTimeout,
  location: { href: 'http://x/' }, HTMLIFrameElement: function HTMLIFrameElement() {}
};
if (!('navigator' in globalThis)) Object.defineProperty(globalThis, 'navigator', { value: { language: 'en', userAgent: 'node' }, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = React;
function loadHook(file) {
  const filename = path.join(ROOT, file);
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', out.outputText)(mod, mod.exports, (r) => (r === '@shared/ideSession' ? loadTs('src/shared/ideSession.ts') : require(r)));
  return mod.exports;
}
const { useIdeSession } = loadHook('src/renderer/src/ide/useIdeSession.ts');
const HOME = [{ key: 'home::1', mode: 'home', rel: '' }];
const saved = (...rels) => JSON.stringify({ tabs: rels.map((rel) => ({ mode: 'edit', rel })), active: rels.length - 1, sideTab: 'git', mdViews: {} });

async function mount(storage, { strict }) {
  let api;
  function Host() {
    const [live, setLive] = React.useState({ tabs: HOME, activeKey: null, sideTab: 'explorer', mdViews: {} });
    api = { open: (rel) => setLive((p) => ({ ...p, tabs: [...p.tabs, tab(rel)], activeKey: `edit::${rel}` })) };
    useIdeSession('/repo', live, (session) => {
      setLive({ tabs: session.tabs.map((tb) => tab(tb.rel, tb.mode)), activeKey: null, sideTab: session.sideTab, mdViews: session.mdViews });
    }, storage);
    return null;
  }
  const root = createRoot(el('DIV'));
  const tree = strict ? React.createElement(React.StrictMode, null, React.createElement(Host)) : React.createElement(Host);
  await act(async () => { root.render(tree); });
  return { api: () => api, unmount: () => act(async () => { root.unmount(); }) };
}

test('STRICT MODE, which the app runs in: the blank first render is NEVER written over the saved session', async () => {
  // ide-session test 5 asserts this and passes, because it mounts without
  // StrictMode. main.tsx wraps the app in it, and there the effects run twice.
  assert.match(read('src/renderer/src/main.tsx'), /StrictMode/, 'the premise: the app really does run in StrictMode');
  const writes = [];
  const store = new Map([[IDE_SESSION_KEY + '/repo', saved('src/a.ts', 'README.md')]]);
  const m = await mount({ getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { writes.push(JSON.parse(v).tabs.map((t) => t.rel)); store.set(k, v); } }, { strict: true });
  for (const w of writes) assert.notDeepEqual(w, [], `a blank session was written over the saved one; writes in order: ${JSON.stringify(writes)}`);
  assert.deepEqual(JSON.parse(store.get(IDE_SESSION_KEY + '/repo')).tabs.map((t) => t.rel), ['src/a.ts', 'README.md']);
  await m.unmount();
});

test('25. a storage read that THROWS costs nothing: the saved session is not overwritten by the next tab change', async () => {
  const store = new Map([[IDE_SESSION_KEY + '/repo', saved('src/a.ts', 'README.md')]]);
  const writes = [];
  const m = await mount({ getItem: () => { throw new Error('SecurityError'); }, setItem: (k, v) => { writes.push(v); store.set(k, v); } }, { strict: false });
  await act(async () => { m.api().open('REQUESTED.md'); });
  assert.deepEqual(writes, [], 'a session we could not read was overwritten by one we just made up');
  assert.deepEqual(JSON.parse(store.get(IDE_SESSION_KEY + '/repo')).tabs.map((t) => t.rel), ['src/a.ts', 'README.md']);
  await m.unmount();
});

/* ---- the wiring, as text ---------------------------------------------------- */

test('HAS IT RUN: the panel asks these rules, and main is told about unsaved files', () => {
  const panel = read('src/renderer/src/ide/IdePanel.tsx');
  assert.match(panel, /canCloseTab\(/, 'closeTab still closes a dirty tab and leaves its buffer behind');
  assert.match(panel, /tabsAfterCloseOthers\(/); assert.match(panel, /tabsAfterCloseRight\(/);
  assert.match(panel, /buffersAfterTrash\(/, 'a trashed file keeps its dirty buffer, and the IDE can never close');
  assert.match(panel, /orphanDirtyRels\(/, 'a dirty buffer with no tab still blocks in silence');
  assert.match(panel, /discardChanges\(/, 'there is no way out of a save that keeps failing');
  assert.match(panel, /readStillWanted\(/, 'a stale read can still land under another project');
  assert.match(panel, /ideDirty\?\.\(/, 'main is never told, so quit cannot warn');
  const main = read('src/main/index.ts');
  assert.match(main, /ipcMain\.on\('ide:dirty'/);
  const at = main.indexOf("app.on('before-quit', (e) => {\n  if (allowQuit) return;");
  const quit = main.slice(at, at + 700);
  // BEFORE the terminal count, or a floor with no agents never reaches it.
  assert.ok(quit.indexOf('confirmLosingIdeEdits(') > 0 && quit.indexOf('confirmLosingIdeEdits(') < quit.indexOf('const count = ptyManager.list().length'), 'Command Q with a dirty IDE and no agents still just quits');
  const close = main.slice(main.indexOf("win.on('close', (e) => {"), main.indexOf("win.on('close', (e) => {") + 400);
  assert.match(close, /confirmLosingIdeEdits\(win, ideDirtyByWindow\.get\(wc\.id\) \?\? 0\)/, 'the red button still closes a window over unsaved IDE text');
  assert.doesNotMatch(read('src/shared/ideSession.ts'), /there is never one to lose/i, 'the comment still claims unsaved text cannot be lost');
  for (const l of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    for (const [where, k] of [[j.idePanel, 'discardChanges'], [j.idePanel, 'tabDirtyClose']]) {
      assert.ok(where && typeof where[k] === 'string' && where[k].length > 0, `${l}: ${k}`);
      assert.doesNotMatch(where[k], /[–—]|\s-\s/, `${l}: ${k} carries a dash`);
    }
  }
});

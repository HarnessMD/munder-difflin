/**
 * The IDE comes back the way it was left (0.5.3, fix list bug 13).
 *
 * The panel is mounted only while open and kept its whole session in component
 * state, so closing it threw away every tab. Tests 1 to 4 hold the pure rule
 * in src/shared/ideSession.ts. Tests 5 and 6 hold the WIRING as text, because
 * a rule nothing calls passes every test written against the rule.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { toIdeSession, parseIdeSession, isSafeRel, EMPTY_IDE_SESSION, IDE_SESSION_MAX_TABS, IDE_SESSION_KEY } = loadTs('src/shared/ideSession.ts');
const panel = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/ide/IdePanel.tsx'), 'utf8');

const LIVE = {
  tabs: [
    { key: 'home::1', mode: 'home', rel: '' },
    { key: 'edit::src/a.ts', mode: 'edit', rel: 'src/a.ts' },
    { key: 'rev::a::b::src/a.ts', mode: 'revdiff', rel: 'src/a.ts' },
    { key: 'edit::README.md', mode: 'edit', rel: 'README.md' },
    { key: 'image::art/logo.png', mode: 'image', rel: 'art/logo.png' }
  ],
  activeKey: 'edit::README.md',
  sideTab: 'git',
  mdViews: { 'README.md': 'preview', 'gone.md': 'split' }
};

test('1. a session round trips: the tabs, which one was in front, the side panel, the markdown view', () => {
  const back = parseIdeSession(JSON.stringify(toIdeSession(LIVE)));
  assert.deepEqual(back.tabs, [{ mode: 'edit', rel: 'src/a.ts' }, { mode: 'edit', rel: 'README.md' }, { mode: 'image', rel: 'art/logo.png' }]);
  assert.equal(back.tabs[back.active].rel, 'README.md', 'the tab that was in front is in front, though two tabs before it were not kept');
  assert.equal(back.sideTab, 'git');
  assert.deepEqual(back.mdViews, { 'README.md': 'preview' }, 'a view for a file that is not open is not carried');
});

test('2. the home tab and revision diffs are not kept, and neither is any unsaved text', () => {
  const s = toIdeSession(LIVE);
  assert.ok(!s.tabs.some((tb) => tb.mode === 'home' || tb.mode === 'revdiff'));
  assert.deepEqual(Object.keys(s).sort(), ['active', 'mdViews', 'sideTab', 'tabs'], 'a session has no field a buffer could ride in');
  assert.equal(toIdeSession({ ...LIVE, activeKey: 'home::1' }).active, -1);
});

test('3. storage is input: a path that leaves the root never reaches the file reader', () => {
  for (const bad of ['../secrets', 'a/../../etc/passwd', '/etc/passwd', 'C:\\Windows\\x', '..\\x', 'a\0b', '', 'x'.repeat(2000), 7, null]) {
    assert.equal(isSafeRel(bad), false, `accepted ${JSON.stringify(bad)}`);
  }
  assert.equal(isSafeRel('src/..hidden/a.ts'), true, 'two dots inside a NAME is a name');
  const back = parseIdeSession(JSON.stringify({ tabs: [{ mode: 'edit', rel: '../x' }, { mode: 'edit', rel: 'ok.ts' }, { mode: 'exec', rel: 'ok2.ts' }], active: 1, sideTab: 'rm -rf', mdViews: { 'ok.ts': 'explode' } }));
  assert.deepEqual(back.tabs, [{ mode: 'edit', rel: 'ok.ts' }]);
  assert.equal(back.active, 0, 'the active index follows the tab, not the slot');
  assert.equal(back.sideTab, 'explorer');
  assert.deepEqual(back.mdViews, {});
});

test('4. nothing that comes out of storage can stop the IDE opening', () => {
  for (const raw of [null, undefined, '', 'not json', '[]', '7', 'null', '{"tabs":7}', '{"tabs":[null,7,"x"],"active":"2"}']) {
    const s = parseIdeSession(raw);
    assert.deepEqual([s.tabs, s.active, s.sideTab], [[], -1, 'explorer'], `bad answer for ${raw}`);
  }
  const many = { tabs: Array.from({ length: 80 }, (_, i) => ({ mode: 'edit', rel: `f${i}.ts` })), active: 79 };
  const s = parseIdeSession(JSON.stringify(many));
  assert.equal(s.tabs.length, IDE_SESSION_MAX_TABS);
  assert.equal(s.active, -1, 'an active tab past the cap is no tab');
  const dup = parseIdeSession(JSON.stringify({ tabs: [{ mode: 'edit', rel: 'a.ts' }, { mode: 'edit', rel: 'a.ts' }], active: 1 }));
  assert.equal(dup.tabs.length, 1, 'one tab per file and mode: tab keys must be unique');
  assert.equal(EMPTY_IDE_SESSION.tabs.length, 0);
});

/* ---- 5 to 7: the TIMING, mounted for real ---------------------------------
   src/renderer/src/ide/useIdeSession.ts is run under react-dom against a fake
   DOM, the way boot-blur-replay runs the restore. A text pin cannot see an
   effect that fires in the wrong order; this can. */
const ts = require('typescript');
const ROOT = path.resolve(__dirname, '..');
const el = (tag) => ({
  nodeType: 1, tagName: tag, nodeName: tag, namespaceURI: 'http://www.w3.org/1999/xhtml', childNodes: [], style: {}, attrs: {},
  addEventListener() {}, removeEventListener() {}, appendChild(c) { this.childNodes.push(c); return c; },
  removeChild(c) { this.childNodes = this.childNodes.filter((x) => x !== c); },
  insertBefore(c) { this.childNodes.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, contains() { return false; }, get ownerDocument() { return globalThis.document; }
});
globalThis.document = {
  nodeType: 9, body: el('BODY'), documentElement: el('HTML'), createElement: (t) => el(t.toUpperCase()),
  createTextNode: (t) => ({ nodeType: 3, nodeValue: t }), createEvent: () => ({ initEvent() {} }),
  addEventListener() {}, removeEventListener() {}, get activeElement() { return this.body; }, implementation: { hasFeature: () => false }
};
globalThis.window = {
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
  const req = (r) => (r === '@shared/ideSession' ? loadTs('src/shared/ideSession.ts') : require(r));
  new Function('module', 'exports', 'require', out.outputText)(mod, mod.exports, req);
  return mod.exports;
}
const { useIdeSession } = loadHook('src/renderer/src/ide/useIdeSession.ts');

const HOME = [{ key: 'home::1', mode: 'home', rel: '' }];
const saved = (...rels) => JSON.stringify({ tabs: rels.map((rel) => ({ mode: 'edit', rel })), active: rels.length - 1, sideTab: 'git', mdViews: {} });
const tabsIn = (store, root) => JSON.parse(store.get(IDE_SESSION_KEY + root) ?? '{"tabs":[]}').tabs.map((tb) => tb.rel);

/** The panel, reduced to the four pieces of state the hook watches. It starts
 *  every root on a blank home tab and adopts a restore, exactly as IdePanel. */
async function mount(store) {
  const log = { restores: [], sets: [] };
  const fake = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { log.sets.push([k, v]); store.set(k, v); } };
  let api;
  function Host() {
    const [root, setRoot] = React.useState('/repo');
    const [live, setLive] = React.useState({ tabs: HOME, activeKey: null, sideTab: 'explorer', mdViews: {} });
    api = {
      open: (rel) => setLive((p) => ({ ...p, tabs: [...p.tabs, { key: `edit::${rel}`, mode: 'edit', rel }], activeKey: `edit::${rel}` })),
      switchTo: (next) => { setLive({ tabs: HOME, activeKey: null, sideTab: 'explorer', mdViews: {} }); setRoot(next); }
    };
    useIdeSession(root, live, (session) => {
      log.restores.push({ root, rels: session.tabs.map((tb) => tb.rel) });
      setLive({ tabs: session.tabs.map((tb) => ({ key: `${tb.mode}::${tb.rel}`, mode: tb.mode, rel: tb.rel })), activeKey: null, sideTab: session.sideTab, mdViews: session.mdViews });
    }, fake);
    return null;
  }
  const root = createRoot(el('DIV'));
  await act(async () => { root.render(React.createElement(Host)); });
  return { log, api: () => api, unmount: () => act(async () => { root.unmount(); }) };
}

test('5. OPENING: the saved tabs come back, and the blank first render never overwrites them', async () => {
  const store = new Map([[IDE_SESSION_KEY + '/repo', saved('src/a.ts', 'README.md')]]);
  const m = await mount(store);
  assert.deepEqual(m.log.restores, [{ root: '/repo', rels: ['src/a.ts', 'README.md'] }]);
  for (const [k, v] of m.log.sets) assert.notDeepEqual(JSON.parse(v).tabs, [], `${k} was saved with no tabs: the blank render was written over the session`);
  assert.deepEqual(tabsIn(store, '/repo'), ['src/a.ts', 'README.md']);
  await m.unmount();
});

test('6. WORKING: a tab opened is a tab saved, with nothing else to do', async () => {
  const store = new Map();
  const m = await mount(store);
  assert.deepEqual(m.log.restores, [], 'nothing saved means nothing to restore, and the home tab stands');
  await act(async () => { m.api().open('src/new.ts'); });
  assert.deepEqual(tabsIn(store, '/repo'), ['src/new.ts']);
  await m.unmount();
});

test('7. SWITCHING PROJECT: that project\'s own session comes back, and neither one damages the other', async () => {
  const store = new Map([[IDE_SESSION_KEY + '/repo', saved('src/a.ts')], [IDE_SESSION_KEY + '/other', saved('docs/plan.md', 'index.html')]]);
  const m = await mount(store);
  await act(async () => { m.api().switchTo('/other'); });
  assert.deepEqual(m.log.restores.at(-1), { root: '/other', rels: ['docs/plan.md', 'index.html'] });
  assert.deepEqual(tabsIn(store, '/other'), ['docs/plan.md', 'index.html'], 'the switch saved a blank session over the one it was about to read');
  assert.deepEqual(tabsIn(store, '/repo'), ['src/a.ts'], 'the project that was left lost its tabs');
  await act(async () => { m.api().switchTo('/repo'); });
  assert.deepEqual(m.log.restores.at(-1), { root: '/repo', rels: ['src/a.ts'] });
  await m.unmount();
});

test('8. the panel uses that hook, loads what it restores, and X refuses unsaved work as Escape does', () => {
  assert.match(panel, /useIdeSession\(root, \{ tabs, activeKey, sideTab, mdViews \}, restoreSession\);/);
  // A restored tab whose file is never read is a tab stuck on "loading".
  const restore = panel.slice(panel.indexOf('const restoreSession = useCallback('), panel.indexOf('// ─── end restoreSession'));
  assert.match(restore, /ensureEdit\(/); assert.match(restore, /ensureDiff\(/);
  assert.doesNotMatch(panel, /onClick=\{\(\) => setIdeOpen\(false\)\}/, 'a close button that skips the unsaved check discards edits without a word');
  assert.match(panel, /const requestClose = useCallback\(\(\) => \{ if \(!anyDirtyRef\.current\) setIdeOpen\(false\); \}/);
  assert.equal(IDE_SESSION_KEY, 'cth.ide.session::');
});

'use strict';

/**
 * CHECK AGAIN WHEN AN UPDATE IS DOWNLOADED, executed (0.5.2, god's ruling of
 * 9 Sep 2026: two controls in this release shipped dead under green tests,
 * so the wiring of the third of that shape is run, not read).
 *
 * The founder's report: with an update downloaded, "Restart to update"
 * replaced the only button and there was no way to check again. The rule is
 * pure (@shared/updateState.secondaryUpdateAction, pinned in
 * test/check-again-when-downloaded.test.cjs) and both surfaces read it
 * through one hook (useUpdatesSection). Pam ruled the state uncatchable in a
 * dev run, so this harness is the only evidence there will be before the tag:
 * the REAL hook mounted through react-dom's client on a fake container, the
 * real subscription captured, main's status pushed through it, and the real
 * Check again pressed.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(ROOT, 'src/renderer/src');

/* ---- a fake DOM: enough for react-dom's client to mount a null tree ------- */
const el = (tag) => ({
  nodeType: 1, tagName: tag, nodeName: tag, namespaceURI: 'http://www.w3.org/1999/xhtml', childNodes: [], style: {},
  addEventListener() {}, removeEventListener() {}, appendChild(c) { this.childNodes.push(c); return c; }, removeChild() {},
  insertBefore(c) { this.childNodes.push(c); return c; }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
  contains() { return false; }, get ownerDocument() { return document; }
});
const document = {
  nodeType: 9, body: el('BODY'), documentElement: el('HTML'), createElement: (t) => el(t.toUpperCase()),
  createTextNode: (t) => ({ nodeType: 3, nodeValue: t }), createEvent: () => ({ initEvent() {} }),
  addEventListener() {}, removeEventListener() {}, get activeElement() { return this.body; }, implementation: { hasFeature: () => false }
};
globalThis.document = document;

/* ---- the preload surface the hook talks to ------------------------------- */
let pushStatus = null;
const calls = [];
let current = null;
const cth = {
  platform: 'darwin', arch: 'arm64',
  onUpdateStatus: (cb) => { pushStatus = cb; return () => { pushStatus = null; }; },
  updateCurrent: () => Promise.resolve(current),
  updateCheckNow: () => { calls.push('updateCheckNow'); return Promise.resolve({ ok: true }); },
  updateDownload: () => { calls.push('updateDownload'); return Promise.resolve({ ok: true }); },
  updateRestartAndInstall: () => { calls.push('updateRestartAndInstall'); return Promise.resolve({ ok: true }); },
  updateOpenRelease: (url) => { calls.push(`updateOpenRelease:${url ?? ''}`); return Promise.resolve({ ok: true }); }
};
globalThis.window = {
  document, cth, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, setTimeout, clearTimeout,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'http://x/' },
  HTMLIFrameElement: function HTMLIFrameElement() {}
};
if (!('navigator' in globalThis)) Object.defineProperty(globalThis, 'navigator', { value: { language: 'en', userAgent: 'node' }, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.__APP_VERSION__ = '0.5.2';

/* ---- the loader: the renderer's aliases, the real modules ------------------ */
const cache = new Map();
function resolveTs(fromDir, req) {
  const base = req.startsWith('@shared/') ? path.join(ROOT, 'src/shared', req.slice(8))
    : req.startsWith('@/') ? path.join(RENDERER, req.slice(2))
    : path.resolve(fromDir, req);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}
function loadFile(filename) {
  const hit = cache.get(filename);
  if (hit) return hit.exports;
  if (filename.endsWith('.json')) { const m = { exports: JSON.parse(fs.readFileSync(filename, 'utf8')) }; cache.set(filename, m); return m.exports; }
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React },
    fileName: filename
  });
  const mod = { exports: {} };
  cache.set(filename, mod);
  const req = (r) => {
    if (r.startsWith('.') || r.startsWith('@shared/') || r.startsWith('@/')) {
      const x = resolveTs(path.dirname(filename), r);
      if (x) return loadFile(x);
    }
    return require(r);
  };
  new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText)(mod, mod.exports, req, filename, path.dirname(filename));
  return mod.exports;
}

const React = require('react');
globalThis.React = React;
const { createRoot } = require('react-dom/client');
const { act } = React;
const { useUpdatesSection } = loadFile(path.join(RENDERER, 'components/updates/useUpdatesSection.ts'));

/** The latest answer the hook gave the surface. */
let latest = null;
function Surface() { latest = useUpdatesSection(); return null; }
let root;
test.before(async () => {
  root = createRoot(el('DIV'));
  await act(async () => { root.render(React.createElement(Surface)); });
});
test.after(async () => { await act(async () => { root.unmount(); }); });
const push = (status) => act(async () => { pushStatus(status); });

test('1. nothing asked yet: one button, Check, and no second action', () => {
  assert.equal(typeof pushStatus, 'function', 'the hook subscribed to main');
  assert.equal(latest.state, 'idle');
  assert.equal(latest.view.button, 'updatesSection.checkBtn');
  assert.equal(latest.checkAgain, null);
});

test('2. an update downloaded: Restart is the primary button and Check again sits beside it', async () => {
  await push({ state: 'downloaded', version: '0.5.3', notes: '## 0.5.3\n- one thing' });
  assert.equal(latest.state, 'downloaded');
  assert.equal(latest.view.button, 'updatesSection.restartBtn', 'the founder saw only this');
  assert.equal(typeof latest.checkAgain, 'function', 'and now the second action exists');
  assert.equal(latest.checkAgainLabel, 'updatesSection.checkAgainBtn');
  assert.equal(latest.view.tone, 'ready');
});

test('3. pressing Check again runs the real check, once, and clears busy when main answers', async () => {
  await act(async () => { latest.checkAgain(); });
  assert.deepEqual(calls, ['updateCheckNow'], 'the same check as everywhere else');
  assert.equal(latest.busy, false, 'the click settled');
  await act(async () => { latest.checkAgain(); });
  assert.deepEqual(calls, ['updateCheckNow', 'updateCheckNow'], 'a press after it settled is one more check');
  // Two presses inside ONE tick both fire: `busy` is render-time state, so
  // the hook's own guard cannot see the first press yet. The surfaces disable
  // the button on busy (pinned in test/check-again-when-downloaded.test.cjs),
  // which is what stops a double click in the app. Recorded, not fixed.
});

test('4. the check that finds the same release keeps the downloaded file; a newer one supersedes it', async () => {
  await push({ state: 'checking' });
  assert.equal(latest.state, 'downloaded', 'checking does not throw the staged file away');
  assert.equal(typeof latest.checkAgain, 'function');
  await push({ state: 'available', version: '0.5.3' });
  assert.equal(latest.state, 'downloaded', 'the same version again: still downloaded');
  await push({ state: 'available', version: '0.5.4' });
  assert.equal(latest.state, 'available');
  assert.equal(latest.view.button, 'updatesSection.downloadBtn');
  assert.equal(latest.checkAgain, null, 'only the downloaded state carries the second action');
});

test('5. the primary button in the downloaded state is Restart, through the real door', async () => {
  await push({ state: 'downloaded', version: '0.5.4' });
  await act(async () => { latest.run(); });
  assert.equal(calls.at(-1), 'updateRestartAndInstall');
});

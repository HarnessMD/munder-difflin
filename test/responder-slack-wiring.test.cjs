'use strict';

/**
 * WHO ANSWERS A SLACK MESSAGE, executed (0.5.2, god's ruling of 9 Sep 2026
 * after two controls in this release shipped dead under green tests).
 *
 * The responder has three wires. The teammate half is executed in
 * test/teams-bridge.test.cjs (a real sealed envelope through the real bridge,
 * landing on dwight when configured and on god otherwise). The rule itself is
 * pinned in test/responder.test.cjs. What nothing ran was the Slack half: the
 * renderer effect in useHive (#5) that takes main's payload, resolves the
 * configured id against the agents that are actually running, and enqueues
 * the text where the drain will type it.
 *
 * So this file mounts the REAL useHive through react-dom's client on a fake
 * container (effects run), with the real store underneath and a preload
 * surface stubbed just enough to answer, captures the real subscription the
 * effect makes, and fires main's payload shape through it. Then it reads the
 * queues. Main's own half, tagging the payload with the configured id, is one
 * field in onSlackTransportMessage (src/main/index.ts) that cannot be loaded
 * here; it is pinned as text at the end, on both sides of the IPC channel.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(ROOT, 'src/renderer/src');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

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

/* ---- the floor: Michael, dwight (active), pam (archived), the assistant --- */
const row = (id, extra = {}) => ({ id, name: id, character: id, accent: 'mint', description: '', project: 'p', tmuxTarget: '', cwd: '/r', status: 'working', action: 'using Bash', progress: 0, ptyId: `pty-${id}`, command: 'claude', provider: 'claude', ...extra });
const ROSTER = [row('god', { isGod: true }), row('dwight'), row('pam', { archived: true }), row('assistant', { isAssistant: true })];
const ls = new Map();
const subs = {};
const calls = [];
const config = { onboardingComplete: true, harnessHome: '/h', godProvider: 'claude', godModel: 'claude-opus-4-8', responseStyle: '', autoMode: true };
const cth = new Proxy({
  rosterReadSync: () => ({ version: 1, savedAt: 'x', agents: ROSTER, archived: [], restorable: [], queues: {}, selectedId: null }),
  harnessHomeSync: () => '/h',
  rosterWrite: () => Promise.resolve({ ok: true }),
  devNoGod: () => Promise.resolve(true),
  listPtys: () => Promise.resolve(ROSTER.map((a) => ({ id: a.ptyId }))),
  hiveRegistry: () => Promise.resolve({ agents: {} }),
  hiveInbox: () => Promise.resolve([]),
  hiveTasks: () => Promise.resolve({ tasks: [] }),
  getConfig: () => Promise.resolve(config),
  controlSnapshot: () => Promise.resolve({ autoDeliveryPaused: false }),
  agentContext: () => Promise.resolve(null),
  gitIsRepo: () => Promise.resolve(true)
}, {
  get(target, name) {
    if (name in target) return target[name];
    if (typeof name === 'string' && name.startsWith('on')) return (cb) => { subs[name] = cb; return () => { delete subs[name]; }; };
    return (...args) => { calls.push([name, args]); return Promise.resolve({ ok: true }); };
  }
});
globalThis.window = {
  document, localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); } },
  cth, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, setTimeout, clearTimeout,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'http://x/' },
  // react-dom asks `instanceof window.HTMLIFrameElement` before every commit.
  HTMLIFrameElement: function HTMLIFrameElement() {}
};
globalThis.localStorage = window.localStorage;
if (!('navigator' in globalThis)) Object.defineProperty(globalThis, 'navigator', { value: { language: 'en', userAgent: 'node' }, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* ---- the loader: the renderer's aliases, the real modules, three stubs ---- */
const cache = new Map();
const STUBS = {
  // xterm needs a browser; the effect under test never reaches a terminal.
  [path.join(RENDERER, 'components/terminalPool.ts')]: { acquireTerminal: () => null, resetTerminal() {}, isTerminalAutomationSafe: () => true },
  // sprites; only read when a worker is hired, not on this path.
  [path.join(RENDERER, 'scene/office/castRoster.ts')]: { OFFICE_CAST: [{ id: 'michael', name: 'Michael' }], DEFAULT_CHARACTER: 'michael' }
};
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
  if (STUBS[filename]) return STUBS[filename];
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
const { useStore } = loadFile(path.join(RENDERER, 'store/store.ts'));
const { useHive } = loadFile(path.join(RENDERER, 'hooks/useHive.ts'));

function Floor() { useHive(config); return null; }
let root;
test.before(async () => {
  root = createRoot(el('DIV'));
  await act(async () => { root.render(React.createElement(Floor)); });
});
test.after(async () => { await act(async () => { root.unmount(); }); });

const queue = (id) => useStore.getState().messageQueues[id] ?? [];
const payload = (responder, extra = {}) => ({ text: 'Please look at the spacing.', channel: 'C1', ts: '1.1', thread_ts: '1.0', autonomyPreamble: 'PROTOCOL: ', responder, ...extra });
const fire = (msg) => act(async () => { subs.onSlackMessage(msg); });

test('1. the effect subscribes to the Slack door on mount, on the real preload name', () => {
  assert.equal(typeof subs.onSlackMessage, 'function', 'useHive registered the Slack handler');
  assert.deepEqual(queue('god'), []);
  assert.deepEqual(queue('dwight'), []);
});

test('2. the configured agent takes the message while it is active: text, thread and the working instruction', async () => {
  await fire(payload('dwight'));
  assert.equal(queue('god').length, 0, 'nothing for the orchestrator');
  const m = queue('dwight')[0];
  assert.ok(m, 'landed on dwight');
  assert.equal(m.text, 'Please look at the spacing.');
  assert.deepEqual(m.slack, { channel: 'C1', thread_ts: '1.0' }, 'the card gets the thread');
  assert.equal(m.instruction, 'PROTOCOL: Please look at the spacing.', 'the autonomy preamble rides only in the instruction');
});

test('3. the fallback is not optional: archived, the assistant, unset, unknown and whitespace all land on the orchestrator', async () => {
  for (const r of ['pam', 'assistant', '', undefined, 'nobody', '   ']) {
    const before = queue('god').length;
    await fire(payload(r, { text: `for ${JSON.stringify(r)}` }));
    assert.equal(queue('god').length, before + 1, `${JSON.stringify(r)} falls back to the orchestrator`);
  }
  assert.equal(queue('dwight').length, 1, 'dwight got nothing more');
  assert.deepEqual(queue('pam'), []);
  assert.deepEqual(queue('assistant'), []);
});

test('4. attachments ride as local paths, and an empty message with no files is dropped', async () => {
  await fire(payload('dwight', { text: '', files: [{ path: '/tmp/a.png', name: 'a.png', mimetype: 'image/png' }] }));
  assert.equal(queue('dwight').at(-1).text, 'Attached files:\n/tmp/a.png (a.png)');
  const n = queue('dwight').length;
  await fire(payload('dwight', { text: '   ' }));
  assert.equal(queue('dwight').length, n, 'nothing enqueued for an empty message');
});

test('5. main tags the payload with the configured id, on the same channel the preload listens to (text, the one part this file cannot run)', () => {
  const main = read('src/main/index.ts');
  const fn = main.slice(main.indexOf('async function onSlackTransportMessage('), main.indexOf('function resolveSlackTempCwd('));
  assert.match(fn, /responder: cfg\.responder \?\? '',/, 'the configured id rides along');
  assert.match(fn, /liveWebContents\(\)\?\.send\('slack:incomingMessage', ipcMsg\)/);
  assert.match(read('src/preload/index.ts'), /ipcRenderer\.on\('slack:incomingMessage'/, 'the preload listens on the same name');
  const hive = read('src/renderer/src/hooks/useHive.ts');
  assert.match(hive, /enqueueMessage\(resolveResponder\(msg\.responder, active, GOD_ID\), text, \{ slack, instruction \}\)/);
});

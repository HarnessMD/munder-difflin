'use strict';

/**
 * ONE HOOK EVENT, ONE ROW (0.5.3, F25 groundwork; Pam's audit of the Pro
 * sidebar, hive/shared/design/sidebar-pro/v3/HANDOFF.md).
 *
 * The audit's two faults: ProSidebar subscribed to the WHOLE agents array,
 * and AgentRow was not memoised, so every per chunk `updateAgent` from the
 * pty parser (action, progress, context tokens) re-rendered the sidebar and
 * every row in it. The Classic strip had the same shape (AgentStrip over
 * the whole array, AgentCard with inline callbacks).
 *
 * This mounts the REAL components on react-dom's client with a fake DOM
 * (the pattern of test/pro-052-stapler-meetings), then patches the store the
 * way the parser does and COUNTS RENDERS: a row renders once per hook event
 * on its own agent and never for another agent's. The count is taken where
 * it cannot lie: React.createElement is called from inside a row's render
 * for the row's own elements, so an element only a row creates is one
 * render of that row.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(ROOT, 'src/renderer/src');

/* ---- a fake DOM: enough for react-dom's client to mount ------------------- */
const el = (tag) => ({
  nodeType: 1, tagName: tag, nodeName: tag, namespaceURI: 'http://www.w3.org/1999/xhtml', childNodes: [], style: {}, attrs: {},
  options: [], value: '', multiple: false, selectedIndex: -1, defaultValue: '',
  addEventListener() {}, removeEventListener() {}, appendChild(c) { this.childNodes.push(c); return c; },
  removeChild(c) { this.childNodes = this.childNodes.filter((x) => x !== c); },
  insertBefore(c) { this.childNodes.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, contains() { return false; }, get ownerDocument() { return document; },
  setAttributeNS() {}, removeAttributeNS() {}, focus() {}, blur() {}, dispatchEvent() { return true; },
  getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
});
const document = {
  nodeType: 9, body: el('BODY'), documentElement: el('HTML'), createElement: (t) => el(t.toUpperCase()),
  createTextNode: (t) => ({ nodeType: 3, nodeValue: t }), createEvent: () => ({ initEvent() {} }),
  createElementNS: (_ns, t) => el(String(t).toUpperCase()),
  head: el('HEAD'), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, get activeElement() { return this.body; }, implementation: { hasFeature: () => false }
};
globalThis.document = document;

/* ---- what main would answer --------------------------------------------- */
const agentRow = (id, name, extra = {}) => ({ id, name, character: id, accent: 'mint', description: '', project: 'p', tmuxTarget: '', cwd: '/r', status: 'idle', action: '', progress: 0, ptyId: `pty-${id}`, command: 'claude', provider: 'claude', ...extra });
const ROSTER = [agentRow('god', 'Michael', { isGod: true }), agentRow('dwight', 'Dwight'), agentRow('pam', 'Pam'), agentRow('jim', 'Jim')];
let ledgerReads = 0;
let ledgerBody = { tasks: [{ id: 'T1', title: 'Wall', status: 'doing', assignee: 'jim', createdAt: '2026-09-23T00:00:00.000Z' }, { id: 'T2', title: 'Old', status: 'done', assignee: 'jim', createdAt: '2026-09-22T00:00:00.000Z' }, { id: 'T3', title: 'Ask', status: 'blocked', assignee: 'pam', createdAt: '2026-09-23T00:00:00.000Z' }] };
const cth = new Proxy({
  rosterReadSync: () => ({ version: 1, savedAt: 'x', agents: ROSTER, archived: [], restorable: [], queues: {}, selectedId: null }),
  harnessHomeSync: () => '/h',
  rosterWrite: () => Promise.resolve({ ok: true }),
  agentActivity: () => Promise.resolve([]),
  listWorkers: () => Promise.resolve({ live: [], recent: [] }),
  hiveTasks: () => { ledgerReads++; return Promise.resolve(ledgerBody); },
  getConfig: () => Promise.resolve({})
}, {
  get(target, name) {
    if (name in target) return target[name];
    if (typeof name === 'string' && name.startsWith('on')) return () => () => {};
    return () => Promise.resolve({ ok: true });
  }
});
/* The sidebar and the strip poll (workers every 2 s, tasks every 5 s). Those
   timers must not keep node alive once the tests are done. */
const unref = (t) => { if (t && typeof t.unref === 'function') t.unref(); return t; };
globalThis.window = {
  document, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  cth, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  setTimeout: (fn, ms, ...a) => unref(setTimeout(fn, ms, ...a)), clearTimeout,
  setInterval: (fn, ms, ...a) => unref(setInterval(fn, ms, ...a)), clearInterval,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'http://x/' },
  innerWidth: 1200, innerHeight: 800,
  HTMLIFrameElement: function HTMLIFrameElement() {}
};
globalThis.localStorage = window.localStorage;
if (!('navigator' in globalThis)) Object.defineProperty(globalThis, 'navigator', { value: { language: 'en', userAgent: 'node' }, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* ---- the loader ---------------------------------------------------------- */
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
/** The portrait paints on a canvas the fake DOM does not have. Its box rule
 *  is what the row lays out with, so that stays real (test/pro-agent-row-card
 *  holds it to the frame); the painter is a blank. */
const PORTRAIT = path.join(RENDERER, 'components/SpritePortrait.tsx');
const portraitStub = { SpritePortrait: () => null, portraitBox: (size) => ({ w: Math.round(size * 0.75), h: size }), snapPortraitScale: () => 1, SUB_NATIVE_SCALE: 2 };
function loadFile(filename) {
  const hit = cache.get(filename);
  if (hit) return hit.exports;
  if (filename === PORTRAIT) { cache.set(filename, { exports: portraitStub }); return portraitStub; }
  if (filename.endsWith('.json')) { const m = { exports: JSON.parse(fs.readFileSync(filename, 'utf8')) }; cache.set(filename, m); return m.exports; }
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React },
    fileName: filename
  });
  const mod = { exports: {} };
  cache.set(filename, mod);
  const req = (r) => {
    if (r.endsWith('.css')) return {};
    if (r.startsWith('@brand/')) return { default: 'logo.png' };
    // The strip's card asks the terminal pool whether a prompt holds a draft;
    // the pool's module pulls xterm, which has no business in a render count.
    if (r.startsWith('@xterm/')) return { Terminal: class {}, FitAddon: class {}, WebglAddon: class {}, Unicode11Addon: class {} };
    if (r.startsWith('.') || r.startsWith('@shared/') || r.startsWith('@/')) {
      const x = resolveTs(path.dirname(filename), r.replace(/\?url$/, ''));
      if (x) return loadFile(x);
    }
    return require(r);
  };
  new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText)(mod, mod.exports, req, filename, path.dirname(filename));
  return mod.exports;
}

const React = require('react');
globalThis.React = React;
const { AgentNameEditor } = loadFile(path.join(RENDERER, 'components/AgentNameEditor.tsx'));

/* ---- the render counters -------------------------------------------------
   Pro:     <button data-agent-nav={id}> is created by AgentRow's render only.
            <div data-sidebar-scroll> is created by ProSidebar's render only.
   Classic: <div data-strip-entry={id}> is created by StripEntry's render only,
            <AgentNameEditor name=…> by AgentCard's render only (the card is
            the entry's child; the entry is the memo boundary).
            <div data-agent-strip> is created by AgentStrip's render only. */
const rowRenders = {};
const entryRenders = {};
const cardRenders = {};
let sidebarRenders = 0;
let stripRenders = 0;
const realCreate = React.createElement;
React.createElement = function counted(type, props, ...kids) {
  if (props && typeof props === 'object') {
    if (typeof props['data-agent-nav'] === 'string') rowRenders[props['data-agent-nav']] = (rowRenders[props['data-agent-nav']] ?? 0) + 1;
    if ('data-sidebar-scroll' in props) sidebarRenders++;
    if (type === AgentNameEditor && typeof props.name === 'string') cardRenders[props.name] = (cardRenders[props.name] ?? 0) + 1;
    if ('data-agent-strip' in props) stripRenders++;
    if (typeof props['data-strip-entry'] === 'string') entryRenders[props['data-strip-entry']] = (entryRenders[props['data-strip-entry']] ?? 0) + 1;
  }
  return realCreate.call(this, type, props, ...kids);
};
const snap = () => ({ rows: { ...rowRenders }, entries: { ...entryRenders }, cards: { ...cardRenders }, sidebar: sidebarRenders, strip: stripRenders });
const delta = (before, after, key, id) => (after[key][id] ?? 0) - (before[key][id] ?? 0);

const { createRoot } = require('react-dom/client');
const { act } = React;
const { useStore } = loadFile(path.join(RENDERER, 'store/store.ts'));
const { ProSidebar } = loadFile(path.join(RENDERER, 'components/pro/ProSidebar.tsx'));
const { AgentStrip } = loadFile(path.join(RENDERER, 'components/AgentStrip.tsx'));

/** What the pty parser writes per chunk (store.updateAgent's own comment). */
const chunk = (id, n) => ({ action: `Reading file ${n}`, progress: n % 8, contextTokens: 1000 * n, contextLimit: 200_000 });
const patch = async (id, p) => { await act(async () => { useStore.getState().updateAgent(id, p); }); };

test('Pro sidebar: a hook event on one agent renders that row once and no other row, and not the sidebar', async () => {
  const root = createRoot(el('DIV'));
  await act(async () => {
    root.render(React.createElement(ProSidebar, { current: 'agents', onSelect() {}, companyRows: [], onToggleTheme() {}, appVersion: '0.5.3' }));
  });
  try {
    for (const a of ROSTER) assert.ok((rowRenders[a.id] ?? 0) >= 1, `${a.id}'s row is on screen`);

    const before = snap();
    await patch('dwight', chunk('dwight', 1));
    await patch('dwight', chunk('dwight', 2));
    await patch('dwight', chunk('dwight', 3));
    const after = snap();
    assert.equal(delta(before, after, 'rows', 'dwight'), 3, "three chunks on Dwight: Dwight's row renders three times");
    assert.equal(delta(before, after, 'rows', 'pam'), 0, "Pam's row does not render for Dwight's chunk");
    assert.equal(delta(before, after, 'rows', 'jim'), 0, "Jim's row does not render for Dwight's chunk");
    assert.equal(delta(before, after, 'rows', 'god'), 0, "the orchestrator's row does not render for Dwight's chunk");
    assert.equal(after.sidebar - before.sidebar, 0, 'the sidebar itself does not render: action, progress and context are not sidebar fields');

    // A field the sidebar DOES read (status feeds the live count) renders the
    // sidebar, and still only the one row.
    const b2 = snap();
    await patch('dwight', { status: 'working' });
    const a2 = snap();
    assert.ok(a2.sidebar - b2.sidebar >= 1, 'a status change reaches the sidebar (the live count)');
    assert.equal(delta(b2, a2, 'rows', 'dwight'), 1, "Dwight's row renders once for its status");
    assert.equal(delta(b2, a2, 'rows', 'pam'), 0, "Pam's row is untouched by Dwight's status");
    assert.equal(delta(b2, a2, 'rows', 'jim'), 0, "Jim's row is untouched by Dwight's status");

    // And a note on Pam is Pam's row, nobody else's.
    const b3 = snap();
    await act(async () => { useStore.getState().setAgentNote('pam', 'wall first'); });
    const a3 = snap();
    assert.equal(delta(b3, a3, 'rows', 'pam'), 1, "Pam's note renders Pam's row once");
    assert.equal(delta(b3, a3, 'rows', 'dwight'), 0, "Pam's note does not render Dwight's row");
  } finally {
    await act(async () => { root.unmount(); });
  }
});

test('Classic strip: a hook event on one agent renders that entry once and no other entry, and not the strip', async () => {
  const root = createRoot(el('DIV'));
  await act(async () => { root.render(React.createElement(AgentStrip, { config: { harnessHome: '/h' } })); });
  try {
    for (const a of ROSTER) assert.ok((cardRenders[a.name] ?? 0) >= 1, `${a.name}'s card is on screen`);
    // One chunk first, uncounted: AgentCard's own draft poll sets an equal
    // state at mount, and React spends that queued no-op on the card's next
    // render. That is the card's mount, not the strip's fault, and it happens
    // once per card. After it, one chunk is one render.
    await patch('jim', chunk('jim', 0));

    const before = snap();
    await patch('jim', chunk('jim', 1));
    await patch('jim', chunk('jim', 2));
    const after = snap();
    assert.equal(delta(before, after, 'entries', 'jim'), 2, "two chunks on Jim: Jim's entry renders twice");
    assert.equal(delta(before, after, 'cards', 'Jim'), 2, "two chunks on Jim: Jim's card renders twice");
    for (const [id, name] of [['pam', 'Pam'], ['dwight', 'Dwight'], ['god', 'Michael']]) {
      assert.equal(delta(before, after, 'entries', id), 0, `${name}'s entry does not render for Jim's chunk`);
      assert.equal(delta(before, after, 'cards', name), 0, `${name}'s card does not render for Jim's chunk`);
    }
    assert.equal(after.strip - before.strip, 0, 'the strip itself does not render for a chunk');

    // Selection is the strip's business and moves two entries, no more.
    const b2 = snap();
    await act(async () => { useStore.getState().select('pam'); });
    const a2 = snap();
    assert.ok(a2.strip - b2.strip >= 1, 'selection reaches the strip');
    assert.equal(delta(b2, a2, 'entries', 'pam'), 1, "Pam's entry renders once: it is now selected");
    assert.equal(delta(b2, a2, 'entries', 'jim'), 0, "Jim's entry does not render for Pam's selection");
    assert.equal(delta(b2, a2, 'entries', 'dwight'), 0, "Dwight's entry does not render for Pam's selection");
  } finally {
    await act(async () => { root.unmount(); });
  }
});

const { useTaskLedger, tasksOf, ticketOf, resetTaskLedgerForTests } = loadFile(path.join(RENDERER, 'store/taskLedger.ts'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('the task ledger is one poll for everyone, not one per hook, and a tick that changed nothing renders nobody', async () => {
  resetTaskLedgerForTests();
  const seen = [];
  const Reader = ({ n }) => { const { tasks } = useTaskLedger(40); seen.push([n, tasks]); return null; };
  const root = createRoot(el('DIV'));
  ledgerReads = 0;
  await act(async () => {
    root.render(React.createElement(React.Fragment, null, ...[1, 2, 3, 4, 5, 6].map((n) => React.createElement(Reader, { key: n, n }))));
  });
  try {
    await act(async () => { await sleep(150); });
    // Six hooks at 40 ms for 150 ms: the old shape is 6 reads at mount and
    // 6 more every tick, around 24. One shared poll is one at mount and one
    // per tick, 4 or 5 with timer jitter.
    assert.ok(ledgerReads >= 2 && ledgerReads <= 6, `one poll for six hooks: ${ledgerReads} reads in 150 ms`);
    const last = seen.filter(([n]) => n === 1).map(([, t]) => t);
    const arrays = new Set(last.filter(Boolean));
    assert.equal(arrays.size, 1, 'every tick returned the same ledger, so the hook saw one array');
    assert.ok(last[last.length - 1].length === 3, 'and it is the ledger');

    // A changed file is a new array, once, for everyone.
    const rendersBefore = seen.length;
    ledgerBody = { tasks: [...ledgerBody.tasks, { id: 'T4', title: 'New', status: 'todo', assignee: 'pam', createdAt: '2026-09-23T01:00:00.000Z' }] };
    await act(async () => { await sleep(90); });
    const fresh = seen.slice(rendersBefore);
    assert.ok(fresh.length >= 6, 'the change reached every hook');
    assert.equal(new Set(fresh.map(([, t]) => t)).size, 1, 'as one array');
    assert.equal(fresh[0][1].length, 4);
  } finally {
    await act(async () => { root.unmount(); });
  }
  resetTaskLedgerForTests();
});

test('the assignee index answers a row in one map read and keeps its arrays across calls', () => {
  const tasks = [
    { id: 'T1', title: 'Wall', status: 'doing', assignee: 'jim', dependsOn: [] },
    { id: 'T2', title: 'Old', status: 'done', assignee: 'jim', dependsOn: [] },
    { id: 'T3', title: 'Ask', status: 'blocked', assignee: 'pam', dependsOn: [] },
    { id: 'T5', title: 'Next', status: 'todo', assignee: 'pam', dependsOn: [] },
    { id: 'T6', title: 'Loose', status: 'todo', dependsOn: [] }
  ];
  assert.equal(tasksOf(tasks, 'jim'), tasksOf(tasks, 'jim'), 'the same array for the same ledger');
  assert.deepEqual(tasksOf(tasks, 'jim').map((t) => t.id), ['T1', 'T2']);
  assert.equal(tasksOf(tasks, 'nobody').length, 0);
  assert.equal(tasksOf(null, 'jim').length, 0, 'no ledger yet is no cards, not a throw');
  assert.equal(ticketOf(tasks, 'jim').id, 'T1', 'doing first, never done');
  assert.equal(ticketOf(tasks, 'pam').id, 'T3', 'blocked before todo');
  assert.equal(ticketOf(tasks, 'nobody'), null);
  assert.equal(ticketOf([{ id: 'T2', title: 'Old', status: 'done', assignee: 'jim', dependsOn: [] }], 'jim'), null, 'only a done card is no ticket');
});

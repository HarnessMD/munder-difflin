'use strict';

/**
 * F25, THE FRIDAY CUT IN THE CLASSIC SKIN (0.5.3). Pam's Classic cards,
 * hive/shared/design/sidebar-free/final: card 1 is the fullscreen roster
 * row, card 2 the strip card. The cut: name, avatar, engine tile and model,
 * status chip, eight segment gauge with the percent, ticket id and title,
 * live action with its age, CRASHED strip, note bullets read only, click to
 * open, right click menu. No unread badge, no ASKED YOU or FINISHED strip.
 *
 * Two halves. The mounted half runs the real strip on react-dom's client
 * (the pattern of test/v053-sidebar-row-renders) and drives the right click
 * menu; the roster row is mounted on its own and counted the way the strip
 * is. The source half pins the shapes a reviewer would otherwise have to
 * read for: one card size, the gauge, the strings in every locale.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(ROOT, 'src/renderer/src');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ---- a fake DOM, enough for react-dom's client and a portal ------------- */
const el = (tag) => ({
  nodeType: 1, tagName: tag, nodeName: tag, namespaceURI: 'http://www.w3.org/1999/xhtml', childNodes: [], style: {}, attrs: {},
  options: [], value: '', multiple: false, selectedIndex: -1, defaultValue: '',
  addEventListener() {}, removeEventListener() {}, appendChild(c) { this.childNodes.push(c); return c; },
  removeChild(c) { this.childNodes = this.childNodes.filter((x) => x !== c); },
  insertBefore(c) { this.childNodes.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, contains() { return false; }, get ownerDocument() { return document; },
  setAttributeNS() {}, removeAttributeNS() {}, focus() {}, blur() {}, dispatchEvent() { return true; }, select() {},
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
const ROSTER = [
  agentRow('god', 'Michael', { isGod: true }),
  agentRow('dwight', 'Dwight', { contextLimit: 200000, contextTokens: 176000, action: 'Reading the wall', note: 'Owns Razorpay\nAsk first' }),
  agentRow('pam', 'Pam', { exit: { verdict: 'crashed', exitCode: 1, at: Date.now() - 60000 } }),
  agentRow('jim', 'Jim', { onHold: true })
];
const TASKS = { tasks: [
  { id: 'T1', title: 'Wall', status: 'doing', assignee: 'dwight', createdAt: '2026-09-23T00:00:00.000Z' },
  { id: 'T0', title: 'Old', status: 'done', assignee: 'dwight', createdAt: '2026-09-22T00:00:00.000Z' }
] };
const calls = { pause: [], resume: [], hold: [], killed: [] };
const cth = new Proxy({
  rosterReadSync: () => ({ version: 1, savedAt: 'x', agents: ROSTER, archived: [], restorable: [], queues: {}, selectedId: null }),
  harnessHomeSync: () => '/h',
  rosterWrite: () => Promise.resolve({ ok: true }),
  agentActivity: (id) => Promise.resolve(id === 'dwight' ? [{ ts: Date.now() - 12000, kind: 'tool', tool: 'Edit' }] : []),
  listWorkers: () => Promise.resolve({ live: [], recent: [] }),
  hiveTasks: () => Promise.resolve(TASKS),
  getConfig: () => Promise.resolve({}),
  controlSnapshot: () => Promise.resolve({ paused: false, halted: false }),
  controlPause: (id, on) => { calls.pause.push([id, on]); return Promise.resolve({ paused: true, halted: false }); },
  controlResume: (id) => { calls.resume.push(id); return Promise.resolve({ paused: false, halted: false }); },
  hiveSetAgentHold: (id, hold) => { calls.hold.push([id, hold]); return Promise.resolve({ ok: true, onHold: hold }); },
  killPty: (id) => { calls.killed.push(id); return Promise.resolve({ ok: true }); }
}, {
  get(target, name) {
    if (name in target) return target[name];
    if (typeof name === 'string' && name.startsWith('on')) return () => () => {};
    return () => Promise.resolve({ ok: true });
  }
});
const unref = (t) => { if (t && typeof t.unref === 'function') t.unref(); return t; };
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = (fn, ms, ...a) => unref(realSetInterval(fn, ms, ...a));
globalThis.window = {
  document, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  cth, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  setTimeout: (fn, ms, ...a) => unref(setTimeout(fn, ms, ...a)), clearTimeout,
  setInterval: (fn, ms, ...a) => unref(realSetInterval(fn, ms, ...a)), clearInterval,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'http://x/' },
  innerWidth: 1200, innerHeight: 800, confirm: () => true,
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
/* Every element with a data attribute this file cares about, by its value,
   so the real buttons can be driven by what a person would see. */
const found = new Map();
const rowRenders = {};
const liveLines = {};
const realCreate = React.createElement;
React.createElement = function counted(type, props, ...kids) {
  if (props && typeof props === 'object') {
    for (const k of ['data-agent-strip-card', 'data-menu-item', 'data-agent-menu', 'data-roster-row', 'data-ticket', 'data-crashed-strip', 'data-hold', 'data-boss', 'data-context-gauge', 'data-context-pct', 'data-live-line', 'data-agent-ago', 'data-agent-note', 'data-note-add', 'data-notepad-glyph']) {
      if (k in props) found.set(`${k}=${props[k]}`, props);
    }
    if (typeof props['data-roster-row'] === 'string') rowRenders[props['data-roster-row']] = (rowRenders[props['data-roster-row']] ?? 0) + 1;
    // The live line's words, per row: its first child is the text span.
    if (typeof props['data-live-line'] === 'string') liveLines[props['data-live-line']] = kids[0]?.props?.children;
  }
  return realCreate.call(this, type, props, ...kids);
};
const { createRoot } = require('react-dom/client');
const { act } = React;
const { useStore } = loadFile(path.join(RENDERER, 'store/store.ts'));
const { AgentStrip } = loadFile(path.join(RENDERER, 'components/AgentStrip.tsx'));
const { SidebarRow } = loadFile(path.join(RENDERER, 'components/FullscreenTerminal.tsx'));
const has = (k) => [...found.keys()].some((x) => x.startsWith(k));
const menuItems = () => [...found.keys()].filter((k) => k.startsWith('data-menu-item=')).map((k) => k.slice('data-menu-item='.length));
const fakeEvent = (x = 40, y = 40) => ({ preventDefault() {}, stopPropagation() {}, clientX: x, clientY: y });
/** Forget the last menu's items, so the next menu is read on its own. */
const forgetMenu = () => { for (const k of [...found.keys()]) if (k.startsWith('data-menu-item=') || k.startsWith('data-agent-menu=')) found.delete(k); };

test('the strip card: right click opens the seven item menu, and every item takes the door it names', async () => {
  const root = createRoot(el('DIV'));
  await act(async () => { root.render(React.createElement(AgentStrip, { config: { harnessHome: '/h' } })); });
  try {
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    assert.ok(has('data-agent-strip-card=Michael'), 'the orchestrator has a card');
    assert.ok(has('data-boss='), 'and the BOSS tag');
    assert.ok(has('data-hold='), "Jim's card says 1:1");
    assert.ok(has('data-ticket=T1'), "Dwight's card names his DOING ticket, never the done one");
    assert.ok(!has('data-ticket=T0'), 'a done card is not a ticket');
    assert.ok(has('data-context-pct='), "Dwight's card prints the context percent");

    // Right click Dwight: the menu, with the items in the cut.
    found.get('data-agent-strip-card=Dwight').onContextMenu(fakeEvent());
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    assert.ok(has('data-agent-menu=dwight'), 'the menu is for the card that was clicked');
    const items = menuItems();
    for (const want of ['Open', 'Message', 'pause', 'hold', 'Rename', 'note', 'archive']) assert.ok(items.includes(want), `menu has ${want}: ${items.join(', ')}`);

    // Hold: the hive door, then the store.
    await act(async () => { found.get('data-menu-item=hold').onClick(); await new Promise((r) => setTimeout(r, 10)); });
    assert.deepEqual(calls.hold, [['dwight', true]], 'Hold asks main to hold Dwight');
    assert.equal(useStore.getState().agents.find((a) => a.id === 'dwight').onHold, true, 'and the record follows');

    // Pause tools: the control door.
    found.get('data-agent-strip-card=Dwight').onContextMenu(fakeEvent());
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    await act(async () => { found.get('data-menu-item=pause').onClick(); await new Promise((r) => setTimeout(r, 10)); });
    assert.deepEqual(calls.pause, [['dwight', true]], 'Pause tools pauses Dwight');

    // Open: selection.
    found.get('data-agent-strip-card=Dwight').onContextMenu(fakeEvent());
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    await act(async () => { found.get('data-menu-item=Open').onClick(); });
    assert.equal(useStore.getState().selectedId, 'dwight', 'Open selects the agent');

    // The orchestrator's menu has no note item.
    forgetMenu();
    found.get('data-agent-strip-card=Michael').onContextMenu(fakeEvent());
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    assert.ok(has('data-agent-menu=god'));
    const godItems = menuItems();
    assert.ok(!godItems.includes('note'), 'no note on the orchestrator');
    assert.ok(!godItems.includes('archive'), 'no archive on the orchestrator: the floor would respawn him');

    // Archive Pam (crashed): the record leaves the floor.
    found.get('data-agent-strip-card=Pam').onContextMenu(fakeEvent());
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    await act(async () => { found.get('data-menu-item=archive').onClick(); await new Promise((r) => setTimeout(r, 10)); });
    assert.deepEqual(calls.killed, ['pty-pam'], 'Archive kills the process first, as the detail panel does');
    assert.ok(!useStore.getState().agents.some((a) => a.id === 'pam'), 'Archive removes Pam from the floor');
    assert.ok(useStore.getState().archivedAgents.some((a) => a.id === 'pam'), 'into the archive');
  } finally {
    await act(async () => { root.unmount(); });
  }
});

test('the roster row draws the cut from its own record, and a hook event on one agent renders that row only', async () => {
  // Pam is archived by the test above; the rows are drawn for the three left.
  const ids = ['god', 'dwight', 'jim'];
  const drag = { start() {}, over() {}, leave() {}, drop() {}, end() {} };
  const scale = { name: 9, group: 9, note: 11, portraitScale: 1.5, portrait: 27 };
  const Rows = () => React.createElement(React.Fragment, null, ...ids.map((id) => React.createElement(SidebarRow, {
    key: id, id, active: id === 'dwight', dragging: false, over: false, dragActive: false,
    onOpen() {}, onContextMenu() {}, renameRequest: 0, noteRequest: 0, drag, scale
  })));
  const root = createRoot(el('DIV'));
  await act(async () => { root.render(React.createElement(Rows)); });
  try {
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    for (const id of ids) assert.ok((rowRenders[id] ?? 0) >= 1, `${id}'s row is on screen`);
    assert.ok(has('data-boss='), 'the orchestrator row has BOSS');
    assert.ok(has('data-hold='), "Jim's row says 1:1");
    assert.ok(has('data-ticket=T1'), "Dwight's row names his ticket");
    assert.ok(has('data-context-gauge='), 'a session draws the gauge');
    assert.ok(has('data-live-line='), 'the live line is there');

    // Pam's review of #36. (2) No stray pencil: a row with no note carries the
    // add control only (hover reveals it, global.css); a row with a note draws
    // the paper block with the notepad glyph in front and no add control; the
    // orchestrator's row has neither control. (3) The live line's fallback is
    // the status word, never Idle for an agent that is not idle (the English
    // badge words, the same ones the chip prints).
    assert.ok(has('data-agent-note=dwight'), "Dwight's note is the paper block");
    assert.ok(has('data-notepad-glyph='), 'with the notepad glyph in front');
    assert.ok(!has('data-note-add=dwight'), 'and no add control beside it');
    assert.ok(has('data-note-add=jim'), "Jim has no note, so his row carries the add control");
    assert.ok(!has('data-agent-note=jim'), 'and no block');
    assert.ok(!has('data-note-add=god') && !has('data-agent-note=god'), 'the orchestrator has no note control');
    // The strip test above left Jim reconnecting; the fallback needs an empty action.
    await act(async () => { useStore.getState().updateAgent('jim', { action: '', status: 'idle' }); });
    assert.equal(liveLines.jim, 'idle', 'an idle agent with nothing to say is idle');
    await act(async () => { useStore.getState().updateAgent('jim', { status: 'waiting' }); });
    assert.equal(liveLines.jim, 'waiting', 'a waiting agent with nothing to say is waiting, not idle');
    await act(async () => { useStore.getState().updateAgent('jim', { status: 'idle' }); });

    // One chunk first, uncounted: the row's draft poll sets an equal state at
    // mount and React spends that queued no-op on the row's next render
    // (the same quirk test/v053-sidebar-row-renders documents for the card).
    await act(async () => { useStore.getState().updateAgent('dwight', { action: 'warming', progress: 0 }); });
    // Two chunks on Dwight: Dwight's row twice, nobody else.
    const before = { ...rowRenders };
    await act(async () => { useStore.getState().updateAgent('dwight', { action: 'Reading file 1', progress: 1, contextTokens: 177000 }); });
    await act(async () => { useStore.getState().updateAgent('dwight', { action: 'Reading file 2', progress: 2, contextTokens: 178000 }); });
    assert.equal(rowRenders.dwight - before.dwight, 2, "Dwight's row renders once per chunk");
    assert.equal(rowRenders.god - before.god, 0, "the orchestrator's row does not render for Dwight's chunk");
    assert.equal(rowRenders.jim - before.jim, 0, "Jim's row does not render for Dwight's chunk");

    // A crash draws the strip on that row.
    await act(async () => { useStore.getState().updateAgent('jim', { exit: { verdict: 'crashed', exitCode: 2, at: Date.now() } }); });
    assert.ok(has('data-crashed-strip='), 'the CRASHED strip');
  } finally {
    await act(async () => { root.unmount(); });
  }
});

test('the strings exist in every locale, and the card is one size', () => {
  for (const l of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    for (const k of ['open', 'message', 'pauseTools', 'resumeTools', 'hold', 'release', 'rename', 'addNote', 'editNote', 'archive']) assert.equal(typeof j.agentMenu[k], 'string', `${l} agentMenu.${k}`);
    for (const k of ['crashed', 'stopped', 'noProject', 'contextTitle', 'noSession', 'oneOnOne']) assert.equal(typeof j.agentRow[k], 'string', `${l} agentRow.${k}`);
  }
  const card = read('src/renderer/src/components/AgentCard.tsx');
  assert.match(card, /export const CARD_W = 236;\s*\nexport const CARD_H = 92;/, "Pam's card: 236 x 92, one size for every agent");
  assert.doesNotMatch(card, /width = 220|height = 78/, 'the old sizes are gone');
  assert.match(card, /<ContextGauge segments=\{segments\} accent=\{accent\} height=\{4\} \/>/, 'the eight segment gauge along the bottom edge');
  const gauge = read('src/renderer/src/components/agentRow/ContextGauge.tsx');
  assert.match(gauge, /segments >= 7 \? 'var\(--cth-coral\)' : segments >= 6 \? 'var\(--cth-lemon\)'/, 'lemon from six of eight, coral from seven (the card\'s old rule)');
  const strip = read('src/renderer/src/components/AgentStrip.tsx');
  assert.match(strip, /height: CARD_H \+ 32,\s*\n\s*minHeight: CARD_H \+ 32,/, 'the dock is sized from the card');
  const roster = read('src/renderer/src/components/FullscreenTerminal.tsx');
  assert.match(roster, /export const SidebarRow = memo\(function SidebarRow\(\{/, 'the roster row is memoised');
  assert.match(roster, /const agent = useAgent\(id\);/, 'and reads its own record');
  assert.doesNotMatch(roster, /useStore\(s => s\.agents\)/, 'the roster no longer subscribes to the whole array');
  const menu = read('src/renderer/src/components/agentRow/AgentContextMenu.tsx');
  assert.doesNotMatch(menu, /unread|humanMailSince|finished/i, 'nothing from outside the cut leaked into the menu');
});

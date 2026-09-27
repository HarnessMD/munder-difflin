'use strict';

/**
 * 0.5.2, "Send now" on a queued row (founder, 8 Sep 2026, verbatim: "The send
 * now button does not work on queue message. if the agents and orchestrator's
 * input area is different then fix this in both issues.").
 *
 * One component serves both rooms (pro/Composer, mounted by the agent room
 * and the orchestrator's Terminal tab since 59e5d4f0), so this file renders
 * THAT component through React, captures the real button its rows draw, and
 * clicks it. What the click must do: move the row to the front of the queue,
 * mark it released (manual), persist that, and SAY what happens next. The
 * drain (useHive effect #4) types a released row the moment the agent is idle
 * and never mid-turn; the founder's orchestrator was mid-turn for half an
 * hour while he clicked, so nothing visible happened and the row said nothing.
 *
 * Not a pure helper under unexercised wiring: the click path runs here.
 * What this file cannot run is the drain itself (a hook with a dozen effects
 * over window.cth); its pause bypass and idle hold are pinned as text at the
 * end, and the founder's re-check is the last gate on that half.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(ROOT, 'src/renderer/src');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---- the loader: the renderer's aliases, the real modules, two stubs ------- */
const cache = new Map();
const STUBS = {
  // The recorder touches the microphone; the composer only asks it for status.
  [path.join(RENDERER, 'freeflow/recorder.ts')]: { useFreeflow: () => ({ status: 'idle', targetAgentId: null }), freeflowRecorder: { toggle() {} } },
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
  if (filename.endsWith('.json')) {
    const m = { exports: JSON.parse(fs.readFileSync(filename, 'utf8')) };
    cache.set(filename, m);
    return m.exports;
  }
  if (filename.endsWith('.css')) return {};
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React },
    fileName: filename
  });
  const mod = { exports: {} };
  cache.set(filename, mod);
  const req = (r) => {
    if (r.startsWith('.') || r.startsWith('@shared/') || r.startsWith('@/') || r.startsWith('@brand/')) {
      const x = resolveTs(path.dirname(filename), r.replace(/\?url$/, ''));
      if (x) return loadFile(x);
      if (r.startsWith('@brand/')) return { default: 'logo.png' };
    }
    return require(r);
  };
  new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText)(mod, mod.exports, req, filename, path.dirname(filename));
  return mod.exports;
}

/* ---- the floor: Michael with three rows parked, deliveries paused for him -- */
const god = { id: 'god', name: 'Michael', character: 'michael', accent: 'lemon', description: '', project: 'hive', tmuxTarget: '', cwd: '/h', status: 'idle', action: '', progress: 0, ptyId: 'pty-god', command: 'claude', provider: 'claude', isGod: true };
const parked = [
  { id: 'q-1', text: 'Jim is summarising the release notes.', ts: 1 },
  { id: 'q-2', text: 'Pam is ticking the changelog paths.', ts: 2 },
  { id: 'q-3', text: 'Give me one line when all five are done.', ts: 3 }
];
const ls = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (ls.has(k) ? ls.get(k) : null),
    setItem: (k, v) => { ls.set(k, String(v)); },
    removeItem: (k) => { ls.delete(k); }
  },
  cth: {
    rosterReadSync: () => ({ version: 1, savedAt: 'x', agents: [god], archived: [], restorable: [], queues: { god: parked }, selectedId: null }),
    harnessHomeSync: () => '/h',
    rosterWrite: () => Promise.resolve({ ok: true }),
    trackMessageSent: () => {}
  },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  innerWidth: 1200, innerHeight: 800,
  setTimeout: () => 0
};
globalThis.localStorage = window.localStorage;
globalThis.document = { body: {}, addEventListener() {}, removeEventListener() {} };
if (!('navigator' in globalThis)) Object.defineProperty(globalThis, 'navigator', { value: { language: 'en' }, configurable: true });

const React = require('react');
globalThis.React = React;
const { renderToString } = require('react-dom/server');
// Every button the component creates, with its REAL props, as it creates them.
let buttons = [];
const realCreate = React.createElement;
React.createElement = function (type, props, ...children) {
  if (type === 'button' && props) buttons.push(props);
  return realCreate.call(React, type, props, ...children);
};

// zustand 4.5 hands a SERVER render its INITIAL state, so a frame rendered
// here would never see a change. This harness renders frames, it does not
// hydrate: give the selector shim the live getter as the server snapshot,
// before zustand binds to it.
const withSelector = require('use-sync-external-store/shim/with-selector');
const realWithSelector = withSelector.useSyncExternalStoreWithSelector;
withSelector.useSyncExternalStoreWithSelector = (subscribe, getSnapshot, _getServerSnapshot, selector, equalityFn) =>
  realWithSelector(subscribe, getSnapshot, getSnapshot, selector, equalityFn);
const { useStore } = loadFile(path.join(RENDERER, 'store/store.ts'));
const ui = loadFile(path.join(RENDERER, 'components/pro/ui.tsx'));
const { Composer } = loadFile(path.join(RENDERER, 'components/pro/Composer.tsx'));

/** One frame of the real composer for `agent`; returns its HTML and the Send now buttons it drew. */
function frame(agent) {
  buttons = [];
  const html = renderToString(React.createElement(Composer, { agent }));
  return { html, sendNow: buttons.filter((b) => b['data-send-now'] !== undefined) };
}
const queue = () => useStore.getState().messageQueues.god;
const lastToast = () => ui.readToasts().at(-1)?.text;

test('1. the click on a row reaches the store: front of the queue, released, persisted', () => {
  assert.deepEqual(queue().map((m) => m.id), ['q-1', 'q-2', 'q-3'], 'three rows parked at load');
  const { sendNow } = frame({ ...god, status: 'idle' });
  assert.equal(sendNow.length, 3, 'every waiting row draws Send now');
  sendNow[1].onClick();
  assert.deepEqual(queue().map((m) => m.id), ['q-2', 'q-1', 'q-3'], 'the clicked row is now first');
  assert.equal(queue()[0].manual, true, 'and released past the delivery pause');
  assert.equal(queue()[0].now, true, 'and marked to go straight into the CLI (25 Sep 2026)');
  assert.equal(JSON.parse(ls.get('cth.messageQueues')).god[0].manual, true, 'persisted, so a relaunch keeps the release');
  assert.equal(lastToast(), 'pro.room.sendNowIdle', 'the person is told it goes now');
});

test('2. the released row says it is next, and no longer offers Send now', () => {
  const { html, sendNow } = frame({ ...god, status: 'idle' });
  assert.equal(sendNow.length, 2, 'the two rows still waiting keep the button');
  // Michael runs Claude Code, which takes input mid-turn (25 Sep 2026).
  assert.match(html, /pro\.room\.sendNowSending/, 'the released row says it is going now');
});

test('3. mid-turn, the click releases and says it went into the terminal (Claude Code), or goes when the turn ends (other engines)', () => {
  const { sendNow } = frame({ ...god, status: 'working', action: 'using Bash' });
  sendNow[0].onClick();
  assert.equal(queue()[0].manual, true);
  assert.equal(queue()[0].id, 'q-1', 'the newest release goes to the front');
  assert.equal(lastToast(), 'pro.room.sendNowCli', 'Claude Code takes it now; its own queue runs it after the turn');
  // An engine not known to take input mid-turn keeps the 0.5.2 words: the
  // founder case, the orchestrator was mid-turn for half an hour and the click said nothing.
  const codex = { ...god, provider: 'codex', command: 'codex', status: 'working', action: 'using Bash' };
  const other = frame(codex);
  assert.equal(other.sendNow[0].title, 'pro.room.sendNowTitle');
  other.sendNow[0].onClick();
  assert.equal(lastToast(), 'pro.room.sendNowBusy');
});

test('4. the words exist in every locale, with no dashes, and the button explains itself', () => {
  for (const l of ['en', 'zh-CN', 'ar']) {
    const room = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.room;
    for (const k of ['sendNowTitle', 'sendNowIdle', 'sendNowBusy', 'sendNowNext', 'sendNowCli', 'sendNowCliTitle', 'sendNowSending']) {
      assert.equal(typeof room[k], 'string', `${l} has pro.room.${k}`);
      assert.doesNotMatch(room[k], /—|–/, `${l} ${k}: no dashes`);
    }
    assert.match(room.sendNowTitle, /\{\{name\}\}/);
    assert.match(room.sendNowBusy, /\{\{name\}\}/);
  }
  const composer = read('src/renderer/src/components/pro/Composer.tsx');
  assert.match(composer, /releaseQueuedMessage\(agent\.id, m\.id, true\)/, 'the release is the store door, now marked to go straight in');
  assert.match(composer, /title=\{intoCli \? t\('pro\.room\.sendNowCliTitle', \{ name: agent\.name \}\) : t\('pro\.room\.sendNowTitle', \{ name: agent\.name \}\)\}/, 'the title says what the click does');
  assert.match(composer, /m\.manual \? \(/, 'a released row is drawn as released');
});

test('5. the drain honours the release: the pause is bypassed; the idle gate only for a CLI that takes input mid-turn (pinned as text; the hook is not run here)', () => {
  const hive = read('src/renderer/src/hooks/useHive.ts');
  const idle = hive.indexOf("if (!jump && !canDeliverToAgent(target.status, ptyQuietMs(target.ptyId, now), QUIESCE_IDLE_MS, openQuestions.isOpen(target.id))) {");
  const pause = hive.indexOf('if (control?.autoDeliveryPaused && !next.manual) return { sent: false };');
  assert.ok(idle > 0 && pause > idle, 'the idle gate comes first and a manual release does not skip it; the pause gate lets a manual release through');
  assert.match(hive, /const unsub = useStore\.subscribe\(schedule\);/, 'a release (a store change) wakes the drain rather than waiting for the backstop');
});

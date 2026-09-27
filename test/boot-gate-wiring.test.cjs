'use strict';

/**
 * 0.5.2, card v052-startup-restore-loading, the wiring (9 Sep 2026).
 *
 * The pure decision (@shared/bootGate) was tested and right, and the module
 * above it (store/bootGate.ts) was pinned as source text, and the feature
 * never ran: App's first frame has no config, `config?.onboardingComplete
 * === true` fed false, the decision read "fresh install, nothing to restore",
 * and the latch closed on frame one for every install. No blur, no skip, the
 * drop not held. A green suite of two thousand tests shipped a headline
 * feature that never drew, because nothing EXECUTED the wiring.
 *
 * So this file renders the real store/bootGate.ts through React, with the
 * real store underneath, with the inputs App passes, in the order App passes
 * them: frame one before the config, the config, the reconcile, a door that
 * takes its time, the shell, the skip, the cap. A test that asserts a
 * counter renders is not a test that the counter counts.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');

const ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(ROOT, 'src/renderer/src');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

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
  if (filename.endsWith('.json')) {
    const m = { exports: JSON.parse(fs.readFileSync(filename, 'utf8')) };
    cache.set(filename, m);
    return m.exports;
  }
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

/* ---- a roster of five workers whose terminals died with the last session --- */
const row = (id) => ({ id, name: id, character: id, accent: 'mint', description: '', project: 'p', tmuxTarget: '', cwd: '/r', status: 'idle', action: '', progress: 0, ptyId: `pty-${id}`, command: 'claude', provider: 'claude' });
const TEAM = ['jim', 'pam', 'dwight', 'angela', 'oscar'].map(row);
const ls = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (ls.has(k) ? ls.get(k) : null),
    setItem: (k, v) => { ls.set(k, String(v)); },
    removeItem: (k) => { ls.delete(k); }
  },
  cth: {
    rosterReadSync: () => ({ version: 1, savedAt: 'x', agents: TEAM, archived: [], restorable: [], queues: {}, selectedId: null }),
    harnessHomeSync: () => '/h',
    rosterWrite: () => Promise.resolve({ ok: true })
  },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
};
globalThis.localStorage = window.localStorage;

const { useStore } = loadFile(path.join(RENDERER, 'store/store.ts'));
const gate = loadFile(path.join(RENDERER, 'store/bootGate.ts'));
const { BOOT_WAIT_CAP_MS, BOOT_SKIP_AFTER_MS } = loadFile(path.join(ROOT, 'src/shared/bootGate.ts'));

/** One frame of the overlay's hook, rendered through React, as App renders it. */
function Probe(props) {
  const g = gate.useBootGate(props);
  return React.createElement('i', null, JSON.stringify(g));
}
function frame(props) {
  const html = renderToString(React.createElement(Probe, props));
  return JSON.parse(html.replace(/<\/?i>/g, '').replace(/&quot;/g, '"'));
}
const reconnecting = () => useStore.getState().agents.filter((a) => a.action === 'reconnecting…').length;

/** A stopped clock the module reads through Date.now, so the cap and the skip can be driven. */
const realNow = Date.now;
let now = realNow();
const tick = (ms) => { now += ms; };
test.before(() => { Date.now = () => now; });
test.after(() => { Date.now = realNow; });

/** Back to the moment the window opened, with five workers to restore. */
function freshBoot() {
  gate._resetBootGateForTests();
  useStore.setState({ agents: [], restorableAgents: [], feeds: {} });
}

test('1. frame one, no config yet: the gate holds its answer, and once the config is in it waits for the five', () => {
  freshBoot();
  // As the roster loads, every persisted agent wears the reconnecting marker.
  useStore.setState({ agents: TEAM.map((a) => ({ ...a, action: 'reconnecting…' })) });
  const first = frame({ reconnecting: reconnecting(), onboardingComplete: undefined });
  assert.equal(first.settled, false, 'frame one, config unknown: not decided (before the fix: settled, latched, no blur ever)');
  // The config arrives; App's reconcile finds no live terminal and moves the five to restorable.
  useStore.getState().reconcileWithLivePtys([]);
  gate.markReconciled();
  assert.equal(useStore.getState().restorableAgents.length, 5);
  const open = frame({ reconnecting: reconnecting(), onboardingComplete: true });
  assert.equal(open.settled, false, 'five to restore and the restore not started: the blur is up');
  assert.equal(open.remaining, 5, 'the line reads five');
  assert.equal(open.skippable, false, 'no skip before the shell is even on screen');
});

test('2. the control: a known answer with nothing to wait for settles at once, and a fresh install goes straight in', () => {
  freshBoot();
  gate.markReconciled();
  assert.equal(frame({ reconnecting: 0, onboardingComplete: true }).settled, true, 'nothing persisted, nothing reconnecting: in');
  freshBoot();
  assert.equal(frame({ reconnecting: 3, onboardingComplete: false }).settled, true, 'not onboarded, KNOWN: nothing to restore, in');
});

test('3. a door before the shell spends none of the budget: the clock starts when the shell mounts', () => {
  freshBoot();
  useStore.setState({ restorableAgents: TEAM });
  gate.markReconciled();
  const inputs = { reconnecting: 0, onboardingComplete: true };
  // Eight minutes at the paywall, then the licence goes in (the founder, 8 Sep 2026).
  tick(8 * 60_000);
  let g = frame(inputs);
  assert.equal(g.settled, false, 'still waiting: no cap has run because no clock has started');
  assert.equal(g.skippable, false, 'no skip offered behind a door');
  // The shell is on screen.
  gate.markBootShellMounted();
  g = frame(inputs);
  assert.equal(g.settled, false);
  assert.equal(g.remaining, 5);
  tick(BOOT_SKIP_AFTER_MS - 1);
  assert.equal(frame(inputs).skippable, false, 'a quick restore never shows the skip');
  tick(1);
  assert.equal(frame(inputs).skippable, true, 'the way out is offered three seconds after the shell, not after page load');
  tick(BOOT_WAIT_CAP_MS - BOOT_SKIP_AFTER_MS - 1);
  assert.equal(frame(inputs).settled, false, 'one millisecond short of the cap');
  tick(1);
  assert.equal(frame(inputs).settled, true, 'the cap lifts it, counted from the shell');
  tick(-BOOT_WAIT_CAP_MS);
  assert.equal(frame(inputs).settled, true, 'and the latch holds whatever the clock says next');
});

test('4. the skip is a way out, and it is a latch too', () => {
  freshBoot();
  useStore.setState({ restorableAgents: TEAM });
  gate.markReconciled();
  gate.markBootShellMounted();
  const inputs = { reconnecting: 0, onboardingComplete: true };
  assert.equal(frame(inputs).settled, false);
  gate.skipBootWait();
  assert.equal(frame(inputs).settled, true, 'the person left');
  assert.equal(frame(inputs).remaining, 0, 'nothing is counted once settled');
});

test('5. App and the shell pass the gate what it can act on, and the clock sits below every door', () => {
  const app = read('src/renderer/src/App.tsx');
  const shell = read('src/renderer/src/components/pro/ProShell.tsx');
  const boot = read('src/renderer/src/components/pro/ProBooting.tsx');
  assert.match(app, /useBootRecovery\(config \? config\.onboardingComplete === true : undefined\)/, 'App: undefined until the config has loaded');
  assert.match(shell, /useBootRecovery\(config \? config\.onboardingComplete === true : undefined\)/, 'the shell: the same');
  assert.match(boot, /export function useBootRecovery\(onboardingComplete: boolean \| undefined\)/, 'no default that turns "not loaded" into an answer');
  assert.match(app, /function BootClock\(\) \{\n\s+useEffect\(\(\) => \{ markBootShellMounted\(\); \}, \[\]\);/, 'the clock starts on mount');
  const clock = app.indexOf('<BootClock />');
  const mainReturn = app.lastIndexOf('return (', clock);
  assert.ok(clock > 0 && mainReturn > 0, 'the clock is mounted inside a return');
  for (const door of ['<Paywall ', '<ProOnboarding ', '<HivePicker ', '<ProTakeover />']) {
    const at = app.indexOf(door);
    assert.ok(at > 0 && at < mainReturn, `${door.trim()} returns before the main return that carries the clock`);
  }
  const store = read('src/renderer/src/store/bootGate.ts');
  assert.doesNotMatch(store, /const T0 = Date\.now\(\);/, 'no clock at module load');
  assert.match(store, /if \(latestOnboarding === undefined\) return false;/, 'unknown is held, not decided');
});

'use strict';

/**
 * CAN THE BOOT BLUR DRAW AT ALL? (0.5.2, god's question of 9 Sep 2026 after
 * the founder's instance quit with `restorable: []` in roster.json and a
 * relaunch that, to the eye, showed no blur.)
 *
 * The answer is executed here, not read. This file boots the renderer the way
 * a relaunch does, on the founder's own roster shape (Michael and five workers,
 * every one with a terminal id, none alive after a quit): the real store loads
 * the file, the real App effects reconcile it against an empty PTY list and
 * start the boot clock, the real useHive boots Michael, the real useRestoreTeam
 * fires the automatic restore, and the real ProShell condition mounts the real
 * ProBooting overlay. Spawns answer with the stagger the founder's relaunch
 * carried (MD_RESTORE_SLOW_MS, scaled). The timeline is sampled while it runs.
 *
 * Two facts it settles:
 *   1. `restorable` is EMPTY in the file at rest by design. It is computed at
 *      the next boot: the reconcile moves every worker whose terminal is not
 *      alive into it, the restore spawns from it, and the roster is written
 *      with it full during the run and empty again once every worker is back.
 *      A quit that leaves it empty is the normal state, not a lost restore.
 *   2. The overlay is up from the first frame until the last spawn answers,
 *      counting down as they land, and comes down on its own before the cap.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(ROOT, 'src/renderer/src');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---- a fake DOM: enough for react-dom's client to mount ------------------- */
const el = (tag) => ({
  nodeType: 1, tagName: tag, nodeName: tag, namespaceURI: 'http://www.w3.org/1999/xhtml', childNodes: [], style: {}, attrs: {},
  addEventListener() {}, removeEventListener() {}, appendChild(c) { this.childNodes.push(c); return c; },
  removeChild(c) { this.childNodes = this.childNodes.filter((x) => x !== c); },
  insertBefore(c) { this.childNodes.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, contains() { return false; }, get ownerDocument() { return document; }
});
const document = {
  nodeType: 9, body: el('BODY'), documentElement: el('HTML'), createElement: (t) => el(t.toUpperCase()),
  createTextNode: (t) => ({ nodeType: 3, nodeValue: t }), createEvent: () => ({ initEvent() {} }),
  addEventListener() {}, removeEventListener() {}, get activeElement() { return this.body; }, implementation: { hasFeature: () => false }
};
globalThis.document = document;

/* ---- the founder's floor at rest: six agents, six terminal ids, none alive ---- */
const CMD = 'claude --permission-mode bypassPermissions';
const row = (id, name, extra = {}) => ({
  id, name, character: id, accent: 'mint', description: '', project: 'p', tmuxTarget: '', cwd: '/repo',
  status: 'idle', action: 'starting up', progress: 0, ptyId: `pty-${id}`, command: CMD, provider: 'claude', ...extra
});
const WORKERS = ['jim', 'pam', 'dwight', 'angela', 'oscar'];
const FILE = {
  version: 1, savedAt: 'x',
  agents: [row('god', 'Michael', { isGod: true, action: 'running the floor', command: 'claude --model claude-opus-4-8 --permission-mode bypassPermissions' }), ...WORKERS.map((w) => row(w, w))],
  archived: [], restorable: [], queues: { god: [{ id: 'q-1', text: 'parked', queuedAt: 1 }] }, selectedId: 'oscar'
};
/** The stagger the founder's relaunch carried: MD_RESTORE_SLOW_MS × the spawn's
 *  sequence number, Michael's boot spawn first. 2000 ms there, scaled here. */
const SLOW_MS = 250;
const T = Date.now();
const at = () => Date.now() - T;
const spawns = [];          // [{ id, askedAt, answeredAt }]
const rosterWrites = [];    // every rosterWrite payload, in order
let seq = 0;
const ls = new Map();
const subs = {};
const config = { onboardingComplete: true, harnessHome: '/h', godProvider: 'claude', godModel: 'claude-opus-4-8', responseStyle: '', autoMode: true };
const cth = new Proxy({
  rosterReadSync: () => JSON.parse(JSON.stringify(FILE)),
  harnessHomeSync: () => '/h',
  rosterWrite: (snap) => { rosterWrites.push({ t: at(), agents: snap.agents.map((a) => a.id), restorable: snap.restorable.map((a) => a.id), archived: snap.archived.map((a) => a.id) }); return Promise.resolve({ ok: true }); },
  // After a quit nothing is alive in main: this is what makes every worker restorable.
  listPtys: () => Promise.resolve([]),
  devNoGod: () => Promise.resolve(false),
  // Main's boot archived the five in ITS registry (archiveOrphanedAgents); the
  // renderer reads that registry for names and roles only.
  hiveRegistry: () => Promise.resolve({ godId: 'god', agents: { god: { name: 'Michael', role: 'orchestrator (god)' }, ...Object.fromEntries(WORKERS.map((w) => [w, { name: w, archived: true }])) } }),
  hiveInbox: () => Promise.resolve([]),
  hiveTasks: () => Promise.resolve({ tasks: [] }),
  getConfig: () => Promise.resolve(config),
  controlSnapshot: () => Promise.resolve({ autoDeliveryPaused: false }),
  agentContext: () => Promise.resolve(null),
  gitIsRepo: () => Promise.resolve(true),
  spawnPty: (opts) => new Promise((resolve) => {
    seq += 1;
    const rec = { id: opts.id, seq, askedAt: at(), answeredAt: null };
    spawns.push(rec);
    setTimeout(() => { rec.answeredAt = at(); resolve({ ok: true, resumed: true }); }, SLOW_MS * seq);
  })
}, {
  get(target, name) {
    if (name in target) return target[name];
    if (typeof name === 'string' && name.startsWith('on')) return (cb) => { subs[name] = cb; return () => { delete subs[name]; }; };
    return () => Promise.resolve({ ok: true });
  }
});
globalThis.window = {
  document, localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); } },
  cth, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, setTimeout, clearTimeout,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'http://x/' },
  HTMLIFrameElement: function HTMLIFrameElement() {}
};
globalThis.localStorage = window.localStorage;
if (!('navigator' in globalThis)) Object.defineProperty(globalThis, 'navigator', { value: { language: 'en', userAgent: 'node' }, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* ---- the loader: the renderer's aliases, the real modules, two stubs ------- */
const cache = new Map();
const STUBS = {
  [path.join(RENDERER, 'components/terminalPool.ts')]: { acquireTerminal: () => null, resetTerminal() {}, isTerminalAutomationSafe: () => true },
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
    if (r.endsWith('.css')) return {};
    if (r.startsWith('@brand/')) return { default: 'logo.png' };
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
/* Every ProBooting element React builds, with its props: the proof the real
   overlay was mounted, not a stand-in. */
const overlays = [];
const realCreate = React.createElement;
React.createElement = function patched(type, props, ...kids) {
  if (typeof type === 'function' && type.name === 'ProBooting') overlays.push({ t: at(), remaining: props.remaining, skippable: !!props.skippable });
  return realCreate.call(this, type, props, ...kids);
};
const { createRoot } = require('react-dom/client');
const { act } = React;
const { useStore } = loadFile(path.join(RENDERER, 'store/store.ts'));
const { useHive } = loadFile(path.join(RENDERER, 'hooks/useHive.ts'));
const { useRestoreTeam, autoRestorePhase, AUTO_RESTORE_DELAY_MS } = loadFile(path.join(RENDERER, 'hooks/useRestoreTeam.ts'));
const { markBootShellMounted, markReconciled } = loadFile(path.join(RENDERER, 'store/bootGate.ts'));
const { ProBooting, useBootRecovery } = loadFile(path.join(RENDERER, 'components/pro/ProBooting.tsx'));
const { BOOT_WAIT_CAP_MS } = loadFile(path.join(ROOT, 'src/shared/bootGate.ts'));

/* ---- the relaunch, wired the way App.tsx and ProShell.tsx wire it -------- */
const frames = [];   // every render of the shell: { t, recovering, remaining }
function RestoreTeamDriver({ config }) { useRestoreTeam(config); return null; }
function BootClock() { React.useEffect(() => { markBootShellMounted(); }, []); return null; }
function Floor({ config }) { useHive(config); return null; }
function Shell({ config }) {
  // ProShell.tsx: `useBootRecovery(config ? config.onboardingComplete === true : undefined)`
  const { recovering, remaining, skippable, skip } = useBootRecovery(config ? config.onboardingComplete === true : undefined);
  frames.push({ t: at(), recovering, remaining });
  return React.createElement(React.Fragment, null,
    recovering ? React.createElement(ProBooting, { remaining, skippable, onSkip: skip }) : null);
}
function App() {
  // App.tsx: the config is null on the first frame and arrives from main.
  const [config, setConfig] = React.useState(null);
  React.useEffect(() => { window.cth.getConfig().then(setConfig); }, []);
  // App.tsx: the reconcile against live PTYs, then the gate may count.
  React.useEffect(() => {
    if (!config?.onboardingComplete) return;
    let cancelled = false;
    window.cth.listPtys().then((list) => {
      if (cancelled) return;
      useStore.getState().reconcileWithLivePtys(list.map((p) => p.id));
      markReconciled();
    }).catch(() => { markReconciled(); });
    return () => { cancelled = true; };
  }, [config?.onboardingComplete]);
  if (!config) return null;
  return React.createElement(React.Fragment, null,
    React.createElement(BootClock),
    React.createElement(Floor, { config }),
    React.createElement(Shell, { config }),
    React.createElement(RestoreTeamDriver, { config }));
}

const samples = [];  // every 50 ms: { t, agents, restorable, phase, overlayUp, remaining }
let root;
test.before(async () => {
  root = createRoot(el('DIV'));
  await act(async () => { root.render(React.createElement(App)); });
  // A CAP, NOT A BUDGET. The loop below leaves the moment the boot has settled,
  // so a healthy run takes what it always took. The old cap was the healthy
  // time plus two seconds, and on a busy machine (three suites at once, load
  // above 25, 0.5.3 task force) the replay simply had not finished when it ran
  // out: tests 2, 3 and 4 then failed with nothing wrong. It passed alone every
  // time. Four times the room, and still a cap, so a boot that never settles
  // fails here rather than hangs.
  const deadline = (AUTO_RESTORE_DELAY_MS + SLOW_MS * 8 + 2000) * 4;
  while (at() < deadline) {
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    const last = frames[frames.length - 1];
    const s = useStore.getState();
    samples.push({ t: at(), agents: s.agents.map((a) => a.id), restorable: s.restorableAgents.length, phase: autoRestorePhase(), overlayUp: !!last?.recovering, remaining: last?.remaining ?? -1 });
    if (autoRestorePhase() === 'done' && !last?.recovering && s.agents.length === 6) {
      // One more beat for the roster flush (500 ms debounce) to write the settled floor.
      await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
      break;
    }
  }
  if (process.env.BLUR_DEBUG) {
    console.log('spawns', JSON.stringify(spawns));
    console.log('overlays', JSON.stringify(overlays));
    console.log('writes', JSON.stringify(rosterWrites));
    console.log('samples', JSON.stringify(samples.filter((_, i) => i % 4 === 0)));
  }
});
test.after(async () => { await act(async () => { root.unmount(); }); });

const first = (pred) => samples.find(pred);

test('1. the mounted condition is the shipped one: ProShell draws the overlay while recovering, App does the same for Classic', () => {
  const shell = read('src/renderer/src/components/pro/ProShell.tsx');
  assert.match(shell, /useBootRecovery\(config \? config\.onboardingComplete === true : undefined\)/);
  assert.match(shell, /\{recovering && <ProBooting remaining=\{remaining\} skippable=\{skippable\} onSkip=\{skip\} \/>\}/);
  const app = read('src/renderer/src/App.tsx');
  assert.match(app, /\{skin !== 'professional' && boot\.recovering && \(/);
  assert.match(app, /useStore\.getState\(\)\.reconcileWithLivePtys\(list\.map\(\(p\) => p\.id\)\);\s*\/\/[^\n]*\n\s*markReconciled\(\);/);
});

test('2. restorable is empty in the file at rest and is COMPUTED at boot: the reconcile fills it from the dead terminals', () => {
  assert.deepEqual(FILE.restorable, [], 'the file a quit leaves behind: agents with terminal ids, restorable empty');
  const filled = first((s) => s.restorable === 5);
  assert.ok(filled, `the reconcile moved the five workers into restorable (samples: ${JSON.stringify(samples.slice(0, 3))})`);
  assert.ok(!filled.agents.some((id) => WORKERS.includes(id)), 'and out of agents, since no terminal answered for them');
  // The roster file mirrors it: written with restorable full during the run…
  assert.ok(rosterWrites.some((w) => w.restorable.length === 5), 'roster.json carried the five as restorable mid-boot');
  // …and empty again once every worker is back with a live terminal.
  const last = rosterWrites[rosterWrites.length - 1];
  assert.deepEqual(last.restorable, [], 'the last write of the run has restorable empty again');
  assert.deepEqual([...last.agents].sort(), ['angela', 'dwight', 'god', 'jim', 'oscar', 'pam'].sort(), 'with all six back in agents');
  assert.deepEqual(last.archived, [], 'nothing was archived on the renderer side: main\'s registry flag never reaches the roster');
});

test('3. the blur draws: the real ProBooting is mounted from the first frame until the last spawn answers, counting down', () => {
  assert.ok(overlays.length > 0, 'ProBooting was created');
  assert.ok(frames[0].recovering, 'the shell\'s first frame is already under the overlay');
  const counts = [...new Set(overlays.map((o) => o.remaining))];
  for (const n of [5, 4, 3, 2, 1]) assert.ok(counts.includes(n), `the line showed ${n} left (saw ${counts.join(',')})`);
  // It stayed up across the automatic restore's delay and the whole batch…
  const restoreFired = first((s) => s.phase === 'running');
  assert.ok(restoreFired, 'the automatic restore fired');
  assert.ok(samples.filter((s) => s.t < restoreFired.t).every((s) => s.overlayUp), 'the overlay was up during the delay before the restore');
  assert.ok(samples.filter((s) => s.phase === 'running').every((s) => s.overlayUp), 'and while the batch ran');
  // …and came down on its own, before the cap, once everyone was back.
  const down = first((s) => s.phase === 'done' && !s.overlayUp);
  assert.ok(down, 'the overlay came down');
  assert.equal(down.agents.length, 6, 'with all six agents on the floor');
  assert.ok(down.t < BOOT_WAIT_CAP_MS, `and before the cap (${down.t} ms)`);
  const lastSpawn = Math.max(...spawns.map((s) => s.answeredAt ?? Infinity));
  assert.ok(down.t >= lastSpawn, `not before the last spawn answered (${down.t} >= ${lastSpawn})`);
  assert.ok(overlays.some((o) => o.skippable), 'the way out was offered after three seconds');
});

test('4. the spawns are the restore\'s, staggered, Michael first', () => {
  assert.equal(spawns[0].id, 'pty-god', 'Michael boots first');
  assert.deepEqual(spawns.slice(1).map((s) => s.id), WORKERS.map((w) => `pty-${w}`), 'the workers follow in roster order');
  for (let i = 1; i < spawns.length; i++) assert.ok(spawns[i].answeredAt > spawns[i - 1].answeredAt, 'each answers after the one before');
});

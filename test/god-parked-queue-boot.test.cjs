'use strict';
/**
 * A message parked for the orchestrator survives a restart (0.5.2, card
 * v052-god-parked-queue-lost-on-boot).
 *
 * REPRODUCED 9 Sep 2026 against the real store, not read off the source: with
 * two messages parked for `god` in the roster at load, the exact call the god
 * boot made (`removeAgent('god')`) left `messageQueues` without a `god` key and
 * persisted that to localStorage, before useHive re-added the row under the
 * same id. Every launch, silently.
 *
 * The store is loaded here for real (zustand and all), through a loader that
 * knows the renderer's `@/` alias and gives it the two things it reads at
 * module load: a window with localStorage and the synchronous roster bridge.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(ROOT, 'src/renderer/src');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

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

const godRow = { id: 'god', name: 'Michael', character: 'michael', accent: 'lemon', description: '', project: 'hive', tmuxTarget: '', cwd: '/h', status: 'idle', action: '', progress: 0, ptyId: 'pty-god', command: 'claude', provider: 'claude', isGod: true };
const parked = [
  { id: 'q1', text: 'Michael, when you are back: put the shot list on the board.', ts: 1 },
  { id: 'q2', text: 'And tell Jim his summary is due.', ts: 2 }
];

/** A fresh store over a roster that holds a stale god row and his parked queue. */
function freshStore() {
  const ls = new Map();
  const writes = [];
  globalThis.window = {
    localStorage: {
      getItem: (k) => (ls.has(k) ? ls.get(k) : null),
      setItem: (k, v) => { ls.set(k, String(v)); },
      removeItem: (k) => { ls.delete(k); }
    },
    cth: {
      rosterReadSync: () => ({ version: 1, savedAt: 'x', agents: [godRow], archived: [], restorable: [], queues: { god: parked, jim: [{ id: 'j1', text: 'hi jim', ts: 3 }] }, selectedId: null }),
      harnessHomeSync: () => '/h',
      rosterWrite: (snap) => { writes.push(snap); return Promise.resolve({ ok: true }); }
    },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }
  };
  globalThis.localStorage = globalThis.window.localStorage;
  cache.delete(path.join(RENDERER, 'store/store.ts'));
  const { useStore } = loadFile(path.join(RENDERER, 'store/store.ts'));
  return { useStore, ls };
}

test('1. the reproduction: the old call drops a queue parked for god, and persists the drop', () => {
  const { useStore, ls } = freshStore();
  assert.equal(useStore.getState().messageQueues.god?.length, 2, 'two messages parked for Michael at load');
  useStore.getState().removeAgent('god');
  assert.equal(useStore.getState().messageQueues.god, undefined, 'plain removeAgent still drops the queue with the row (the contract for a real removal)');
  assert.deepEqual(Object.keys(JSON.parse(ls.get('cth.messageQueues'))), ['jim'], 'and the drop is persisted');
});

test('2. the fix: the god boot clears the row and keeps the queue, and the re-added row finds it', () => {
  const { useStore, ls } = freshStore();
  useStore.getState().removeAgent('god', { keepQueue: true });
  assert.equal(useStore.getState().agents.some((a) => a.id === 'god'), false, 'the stale row is gone');
  assert.deepEqual(useStore.getState().messageQueues.god, parked, 'the parked messages are untouched');
  assert.equal(ls.has('cth.messageQueues'), false, 'nothing was persisted: the queue on disk still holds them');
  useStore.getState().addAgent({ ...godRow, ptyId: 'pty-god' });
  assert.deepEqual(useStore.getState().messageQueues.god, parked, 'the re-added orchestrator owns the same queue');
  assert.equal(useStore.getState().messageQueues.jim.length, 1, 'other queues are untouched either way');
});

test('3. useHive makes the keepQueue call at the god boot, and nothing else calls removeAgent', () => {
  const hive = read('src/renderer/src/hooks/useHive.ts');
  assert.match(hive, /useStore\.getState\(\)\.removeAgent\(GOD_ID, \{ keepQueue: true \}\);/);
  assert.doesNotMatch(hive, /removeAgent\(GOD_ID\);/, 'the old call is gone');
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
  const callers = walk(RENDERER).filter((f) => /\bremoveAgent\((?!\s*\(id)/.test(read(path.relative(ROOT, f))) && !f.endsWith('store/store.ts'));
  assert.deepEqual(callers.map((f) => path.relative(ROOT, f)), ['src/renderer/src/hooks/useHive.ts'], 'the god boot is the one caller, so the contract change is contained');
});

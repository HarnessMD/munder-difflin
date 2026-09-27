'use strict';

/**
 * 0.5.3, founder batch 2, I5: "Stapler send: dropdown of all active agents to
 * pick the recipient for screenshots, messages, audio; last picked recipient
 * persists across Stapler close and open."
 *
 * The picker is the config's `sendTo`, the field the Settings box already
 * writes and main already routes by (resolveResponder), so a pick reaches every
 * capture and outlives the card, the window and the app. The rules are run
 * directly; main is loaded for real with Electron stubbed (the way
 * puck-main-wiring does it), its handlers CALLED, and the hive message checked.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const loadShared = require('./load-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const P = loadShared('src/shared/puck.ts');

/* ---- the pure rules ------------------------------------------------------- */

const NAMES = { god: 'Michael', 'pam-1': 'Pam', 'jim-1': 'Jim', 'jim-2': 'Jim', 'oscar-1': '' };
const nameOf = (id) => NAMES[id] ?? id;

test('the picker lists the orchestrator first, then every running agent once, in the floor\'s order', () => {
  assert.deepEqual(P.puckRecipients(['pam-1', 'god', 'oscar-1'], nameOf), [
    { id: 'god', name: 'Michael' }, { id: 'pam-1', name: 'Pam' }, { id: 'oscar-1', name: 'oscar-1' }
  ], 'the orchestrator is never listed twice; a nameless agent reads as its id');
  assert.deepEqual(P.puckRecipients([], nameOf), [{ id: 'god', name: 'Michael' }], 'nobody else running: the orchestrator alone');
});

test('two agents with one name are told apart by their id', () => {
  assert.deepEqual(P.puckRecipients(['jim-1', 'jim-2', 'pam-1'], nameOf).map((r) => r.name), ['Michael', 'Jim (jim-1)', 'Jim (jim-2)', 'Pam']);
});

test('a pick is stored the way Settings stores it: the orchestrator as the empty default, anyone else by id', () => {
  assert.equal(P.sendToFor('god'), '');
  assert.equal(P.sendToFor(' pam-1 '), 'pam-1');
  assert.equal(P.normalizePuckConfig({ sendTo: 'pam-1' }).sendTo, 'pam-1', 'and it survives the config being read back');
  assert.deepEqual([P.DEFAULT_PUCK_STATE.recipientId, P.DEFAULT_PUCK_STATE.recipients], ['god', []]);
});

/* ---- main, executed -------------------------------------------------------- */

const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'puck-recipient-'));
test.after(() => { fs.rmSync(HOME, { recursive: true, force: true }); });
const handlers = new Map();
const electronStub = {
  app: { whenReady: () => ({ then: () => Promise.resolve() }), on() {}, getPath: () => HOME },
  BrowserWindow: class { static getAllWindows() { return []; } },
  desktopCapturer: { getSources: async () => [] },
  ipcMain: { handle: (channel, fn) => { handlers.set(channel, fn); } },
  nativeImage: { createFromPath: () => ({ resize: () => ({ toDataURL: () => 'data:image/png;base64,' }) }) },
  screen: { on() {}, getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }), getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }) },
  shell: { openExternal() {}, showItemInFolder() {}, trashItem: async () => {} },
  systemPreferences: { getMediaAccessStatus: () => 'granted' }
};
const cache = new Map();
function loadMain(filename) {
  const hit = cache.get(filename);
  if (hit) return hit.exports;
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename
  });
  const mod = { exports: {} };
  cache.set(filename, mod);
  const req = (r) => {
    if (r === 'electron') return electronStub;
    if (r.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), r);
      for (const c of [base, `${base}.ts`, path.join(base, 'index.ts')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return loadMain(c);
      return {};
    }
    return Module.createRequire(filename)(r);
  };
  new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText)(mod, mod.exports, req, filename, path.dirname(filename));
  return mod.exports;
}

let config = { harnessHome: HOME, groqApiKey: '', puck: { enabled: true, sendTo: '' } };
let live = ['pam-1', 'jim-1'];
const sent = [];
loadMain(path.join(ROOT, 'src/main/puck.ts')).registerPuck({
  readConfig: () => config,
  writeConfig: (patch) => { config = { ...config, ...patch }; return config; },
  onConfigWritten: () => () => {},
  hiveEnabled: () => true,
  hiveSend: (partial, from) => { const msg = { id: `m-${sent.length + 1}`, from, ...partial }; sent.push(msg); return msg; },
  transcribe: async () => ({ ok: true, text: '' }),
  broadcast: () => {},
  openSettings: () => {},
  agentIds: () => live,
  agentName: nameOf,
  preload: '/preload.js', rendererUrl: null, rendererDir: '/renderer'
});
const call = (channel, arg) => handlers.get(channel)({}, arg);

test('main: the state the card opens with names every running agent and who is chosen', async () => {
  const st = await call('puck:state');
  assert.deepEqual(st.recipients, [{ id: 'god', name: 'Michael' }, { id: 'pam-1', name: 'Pam' }, { id: 'jim-1', name: 'Jim' }]);
  assert.equal(st.recipientId, 'god');
  assert.equal(st.recipient, 'Michael');
});

test('main: a pick is saved, the message and the spoken words go to it, and a reopened card still shows it', async () => {
  assert.equal(typeof handlers.get('puck:sendTo'), 'function', 'the picker has a handler');
  const st = await call('puck:sendTo', 'pam-1');
  assert.equal(config.puck.sendTo, 'pam-1', 'written to the config, which outlives the window and the app');
  assert.deepEqual([st.recipientId, st.recipient], ['pam-1', 'Pam']);
  await call('puck:send', { note: 'a spoken message, written down' });
  assert.equal(sent[sent.length - 1].to, 'pam-1', 'a message goes to the pick');
  // Closing and reopening the Stapler reads the state again from main.
  const reopened = await call('puck:state');
  assert.equal(reopened.recipientId, 'pam-1', 'the last pick is still chosen');
  // Back to the orchestrator: stored as the default, the way Settings stores it.
  await call('puck:sendTo', 'god');
  assert.equal(config.puck.sendTo, '');
  await call('puck:send', { note: 'to the orchestrator' });
  assert.equal(sent[sent.length - 1].to, 'god');
});

test('main: only a choice the picker offered is taken', async () => {
  await call('puck:sendTo', 'jim-1');
  for (const bad of ['nobody-at-all', 42, null, { id: 'pam-1' }]) {
    await call('puck:sendTo', bad);
    assert.equal(config.puck.sendTo, 'jim-1', `refused: ${JSON.stringify(bad)}`);
  }
  // Jim stops running: the pick is kept, the capture goes to the orchestrator
  // (the rule since 0.5.2), and the card says so.
  live = ['pam-1'];
  const st = await call('puck:state');
  assert.equal(config.puck.sendTo, 'jim-1', 'a pick is not forgotten because its agent stopped');
  assert.deepEqual([st.recipientId, st.recipient], ['god', 'Michael']);
  await call('puck:send', { note: 'while Jim is down' });
  assert.equal(sent[sent.length - 1].to, 'god');
});

/* ---- the card ---------------------------------------------------------------- */

test('the card: a picker in the title row of the screenshot and message cards, fed by main, answered by main', () => {
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  assert.match(app, /\{compose\.kind !== 'meeting' && st\.recipients\.length > 0 && \(/, 'screenshot and message cards; a meeting sends nothing from the card');
  assert.match(app, /value=\{st\.recipientId\}/);
  assert.match(app, /\{st\.recipients\.map\(\(r\) => <option key=\{r\.id\} value=\{r\.id\}>\{r\.name\}<\/option>\)\}/);
  assert.match(app, /onChange=\{\(e\) => \{ void pickRecipient\(e\.target\.value\); \}\}/);
  assert.match(app, /setSt\(await window\.cth\.puckSendTo\(id\)\);/);
  assert.match(read('src/preload/index.ts'), /puckSendTo: \(id: string\): Promise<PuckState> => ipcRenderer\.invoke\('puck:sendTo', id\)/);
  const main = read('src/main/puck.ts');
  assert.match(main, /d\.writeConfig\(\{ puck: \{ \.\.\.cfgOf\(\), sendTo: sendToFor\(id\) \} \}\);/);
  assert.match(main, /setState\(\{ menuOpen: open === true, \.\.\.who\(\) \}\);/, 'the list is read fresh when the ring opens');
});

test('strings in every language, no dashes', () => {
  for (const l of ['en', 'zh-CN', 'ar']) {
    const card = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.puck.card;
    for (const k of ['to', 'sendTo']) {
      assert.ok(card[k] && card[k].trim(), `${l} ${k}`);
      assert.doesNotMatch(card[k], /[–—]| - /, `${l} ${k}`);
    }
  }
});

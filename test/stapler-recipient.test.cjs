/**
 * The Stapler says who it sent to (0.5.3). The founder's floor has an
 * orchestrator called Steve Jobs; the toast said "Sent to Michael."
 *
 * THE ROUTING WAS ALWAYS RIGHT AND IS NOT TOUCHED. Only the words were wrong,
 * for two reasons that stack: the send never said who it picked, so every
 * string named the orchestrator whoever got the capture; and the Stapler is a
 * window with no store, so `{{godName}}` there was the i18n DEFAULT, "Michael",
 * on every floor in the world.
 *
 * Test 1 runs the real `src/main/puck.ts`. The rest hold the strings and the
 * gate that waived exactly the case that broke.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'stapler-recipient-'));
test.after(() => fs.rmSync(HOME, { recursive: true, force: true }));

class FakeWindow {
  constructor() { this.events = new Map(); this.webContents = { on: (n, fn) => this.events.set(`wc:${n}`, fn), send() {} }; FakeWindow.last = this; }
  static getAllWindows() { return []; }
  on(n, fn) { this.events.set(n, fn); } once(n, fn) { this.events.set(n, fn); }
  setBounds() {} getBounds() { return { x: 0, y: 0, width: 1, height: 1 }; } isDestroyed() { return false; } isVisible() { return true; }
  showInactive() {} hide() {} destroy() {} loadFile() { return Promise.resolve(); } loadURL() { return Promise.resolve(); }
  setMenuBarVisibility() {} setAlwaysOnTop() {} setVisibleOnAllWorkspaces() {} setIgnoreMouseEvents() {} setContentProtection() {}
}
const D = { id: 1, scaleFactor: 2, bounds: { x: 0, y: 0, width: 1512, height: 982 }, workArea: { x: 0, y: 25, width: 1512, height: 957 } };
const handlers = new Map();
const electronStub = {
  app: { whenReady: () => ({ then: () => Promise.resolve() }), on() {}, getPath: () => HOME },
  BrowserWindow: FakeWindow, desktopCapturer: { getSources: async () => [] },
  ipcMain: { handle: (c, fn) => handlers.set(c, fn) },
  nativeImage: { createFromPath: () => ({ resize: () => ({ toDataURL: () => '' }) }) },
  screen: { on() {}, getPrimaryDisplay: () => D, getAllDisplays: () => [D], getDisplayNearestPoint: () => D, getCursorScreenPoint: () => ({ x: 0, y: 0 }) },
  shell: { openExternal() {}, showItemInFolder() {}, trashItem: async () => {} },
  systemPreferences: { getMediaAccessStatus: () => 'granted' }
};
const cache = new Map();
function loadTs(filename) {
  const hit = cache.get(filename);
  if (hit) return hit.exports;
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename });
  const mod = { exports: {} };
  cache.set(filename, mod);
  const req = (r) => {
    if (r === 'electron') return electronStub;
    if (r.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), r);
      for (const c of [base, `${base}.ts`, path.join(base, 'index.ts')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return loadTs(c);
      return {};
    }
    return Module.createRequire(filename)(r);
  };
  new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText)(mod, mod.exports, req, filename, path.dirname(filename));
  return mod.exports;
}

/* The founder's floor. Main's two answers are separate on purpose: who has a
   live terminal, and what each one is called. */
const NAMES = { god: 'Steve Jobs', kevin: 'Kevin', pam: 'Pam' };
let live = ['god', 'kevin', 'pam'];
let config = { harnessHome: HOME, groqApiKey: '', puck: { enabled: true, sendTo: '' } };
let configWritten = () => {};
const sent = [];
const broadcasts = [];
const deps = {
  readConfig: () => config, writeConfig: (p) => { config = { ...config, ...p }; configWritten(); return config; },
  onConfigWritten: (fn) => { configWritten = fn; return () => {}; },
  hiveEnabled: () => true, hiveSend: (m) => { sent.push(m); return { id: `m-${sent.length}` }; }, transcribe: async () => ({ ok: true, text: '' }),
  broadcast: (channel, payload) => { broadcasts.push([channel, payload]); }, openSettings: () => {},
  agentIds: () => live, agentName: (id) => NAMES[id] ?? id,
  preload: '/p.js', rendererUrl: null, rendererDir: '/r'
};
loadTs(path.join(ROOT, 'src/main/puck.ts')).registerPuck(deps);
const call = (c, a) => handlers.get(c)({}, a);
const aim = (id) => deps.writeConfig({ puck: { ...config.puck, sendTo: id } });

test('1. the send names whoever it actually reached, and the label agrees before the send', async () => {
  await call('puck:admit', true);
  FakeWindow.last.events.get('wc:did-finish-load')();

  // Nobody chosen: the orchestrator, by its LIVE name and never the stock one.
  assert.equal((await call('puck:state')).recipient, 'Steve Jobs');
  let r = await call('puck:send', { note: 'look' });
  assert.deepEqual([r.ok, r.to, sent.at(-1).to], [true, 'Steve Jobs', 'god']);

  // An agent chosen and running: that agent, in both places.
  aim('kevin');
  assert.equal((await call('puck:state')).recipient, 'Kevin', 'the label follows the choice live');
  r = await call('puck:send', { note: 'look' });
  assert.deepEqual([r.to, sent.at(-1).to], ['Kevin', 'kevin']);

  // Its terminal dies. No config write happens, so nothing pushes. The routing
  // falls back to the orchestrator, and the words must fall back WITH it.
  live = ['god', 'pam'];
  r = await call('puck:send', { note: 'look' });
  assert.deepEqual([r.to, sent.at(-1).to], ['Steve Jobs', 'god'], 'named one agent and told another');
  await call('puck:menu', true);
  assert.equal((await call('puck:state')).recipient, 'Steve Jobs', 'the ring opened on a stale name');
});

/* ---- the strings ---------------------------------------------------------- */
const LOCALES = ['en', 'ar', 'zh-CN'];
const puckStrings = (loc) => {
  const out = {};
  const walk = (o, p) => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object') walk(v, `${p}.${k}`); else out[`${p}.${k}`] = v; } };
  walk(JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`)).pro.puck, 'pro.puck');
  return out;
};
const NAMING = ['pro.puck.flash.sent', 'pro.puck.meetings.sent', 'pro.puck.meetings.send', 'pro.puck.screenshots.send', 'pro.puck.card.notePlaceholder', 'pro.puck.action.screenshotHint', 'pro.puck.action.messageHint'];

test('2. no Stapler string names the orchestrator by default, in any language', () => {
  for (const loc of LOCALES) {
    const s = puckStrings(loc);
    for (const [k, v] of Object.entries(s)) assert.doesNotMatch(v, /\{\{godName\}\}/, `${loc} ${k} still says godName`);
    for (const k of NAMING) assert.match(s[k], /\{\{recipient\}\}/, `${loc} ${k} lost its name, so that reader sees a literal brace or nobody`);
    for (const k of ['pro.puck.sendToGone', 'pro.puck.sendToGoneOption']) assert.match(s[k], /\{\{name\}\}/, `${loc} ${k} prints a raw id`);
  }
});

test('3. every call site hands those strings a recipient, and the toasts use the SEND\'s answer', () => {
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  const screen = read('src/renderer/src/components/pro/PuckScreen.tsx');
  assert.match(app, /t\('pro\.puck\.flash\.sent', \{ recipient: r\.to \}\)/);
  assert.match(app, /t\('pro\.puck\.card\.notePlaceholder', \{ recipient: st\.recipient \}\)/);
  // The screenshot send names who it reached. The meeting send (0.5.3, batch 2
  // #8) goes to the agents the person ticked and names every one it reached.
  assert.equal((screen.match(/t\('pro\.puck\.meetings\.sent', \{ recipient: r\.to \}\)/g) ?? []).length, 1);
  assert.match(screen, /t\('pro\.puck\.meetings\.sentTo', \{ names: r\.sent\.join\(', '\) \}\)/);
  assert.match(screen, /t\('pro\.puck\.screenshots\.send', \{ recipient \}\)/);
  assert.match(screen, /t\(`pro\.puck\.action\.\$\{a\}Hint`, \{ recipient \}\)/);
  assert.match(screen, /const recipient = state\.recipient \|\| godName;/, 'main\'s answer first; the screen cannot know who has a terminal');
});

test('4. the Stapler and capture windows get NO default i18n variable, because nothing there sets one', () => {
  // `godName` is a default variable that only App.tsx keeps live. These two
  // windows never mount App. A `{{godName}}` string used from either renders
  // the stock name for ever, and the interpolation gate waived it.
  const gate = read('test/i18n-interpolation-args.test.cjs');
  assert.match(gate, /NO_DEFAULTS_IN/, 'the gate still waives godName everywhere');
  for (const entry of ['src/renderer/src/puck/main.tsx', 'src/renderer/src/capture/main.tsx']) {
    assert.doesNotMatch(read(entry), /useGodNameSync|from '\.\.\/App'|from '@\/App'/, `${entry} now mounts the sync; revisit the gate`);
  }
});

test('5. WITH THE STAPLER SWITCHED OFF the Settings screen is still told who a capture would reach', async () => {
  // Creed's review, finding 19. With no Stapler window, sync() returned before
  // the line that published the recipient, so changing "Send captures to" left
  // the Send buttons on the Settings screen naming the old agent. That screen
  // reads the state once on mount and then only listens for broadcasts.
  live = ['god', 'kevin', 'pam'];
  deps.writeConfig({ puck: { ...config.puck, enabled: false, sendTo: '' } });
  broadcasts.length = 0;
  deps.writeConfig({ puck: { ...config.puck, enabled: false, sendTo: 'pam' } });
  const told = broadcasts.filter(([c]) => c === 'puck:state').map(([, st]) => st.recipient);
  assert.equal(told.at(-1), 'Pam', `the screen was told ${JSON.stringify(told)}`);
});

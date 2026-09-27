/**
 * The Stapler in dark mode (0.5.3, fix list bug 17, Teminite 12 Sep).
 *
 * It stayed cream for THREE reasons at once, and fixing any one alone changes
 * nothing on screen, which is how this survived: the window never learned the
 * theme, its page never stamped the attribute the tokens key off, and its
 * stylesheet did not use a single colour token anyway. One test each.
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
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'stapler-theme-'));
test.after(() => fs.rmSync(HOME, { recursive: true, force: true }));

/* ---- 1. main carries the theme across, live ------------------------------ */
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
let config = { harnessHome: HOME, groqApiKey: '', puck: { enabled: true } };
let configWritten = () => {};
const deps = {
  readConfig: () => config, writeConfig: (p) => { config = { ...config, ...p }; configWritten(); return config; },
  onConfigWritten: (fn) => { configWritten = fn; return () => {}; },
  hiveEnabled: () => true, hiveSend: () => ({ id: 'm' }), transcribe: async () => ({ ok: true, text: '' }),
  broadcast: () => {}, openSettings: () => {}, agentIds: () => [], preload: '/p.js', rendererUrl: null, rendererDir: '/r'
};
loadTs(path.join(ROOT, 'src/main/puck.ts')).registerPuck(deps);
const call = (c, a) => handlers.get(c)({}, a);

test('1. the Stapler window is told the app theme, and told again the moment it flips', async () => {
  await call('puck:admit', true);
  FakeWindow.last.events.get('wc:did-finish-load')();
  assert.equal((await call('puck:state')).theme, 'light');
  // Exactly what the title bar toggle does: App.tsx flipTheme.
  deps.writeConfig({ terminalTheme: 'dark' });
  assert.equal((await call('puck:state')).theme, 'dark', 'the flip did not reach the Stapler');
  deps.writeConfig({ terminalTheme: 'light' });
  assert.equal((await call('puck:state')).theme, 'light');
});

/* ---- 2. the page stamps the attribute the tokens key off ------------------ */
test('2. the Stapler page stamps data-cth-theme on its OWN document from that state', () => {
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  assert.match(app, /document\.documentElement\.dataset\.cthTheme\s*=\s*st\.theme === 'dark' \? 'dark' : 'light'/);
  assert.match(app, /\[preview, st\.theme\]/, 'and re-runs when the theme changes');
});

/* ---- 3. the stylesheet actually has a dark set ---------------------------- */
const css = read('src/renderer/src/puck/puck.css').replace(/\/\*[\s\S]*?\*\//g, '');
const block = (selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `no ${selector} block`);
  return css.slice(at, css.indexOf('}', at));
};
const vars = (b) => [...b.matchAll(/(--puck-[\w-]+):/g)].map((m) => m[1]).sort();

test('3. every Stapler colour variable has a dark value, and dark is not a copy of light', () => {
  const light = block(':root'); const dark = block(":root[data-cth-theme='dark']");
  assert.ok(vars(light).length >= 10, 'the light set is missing');
  assert.deepEqual(vars(dark), vars(light), 'a variable with no dark value stays light in dark mode');
  for (const v of vars(light)) {
    const pick = (b) => new RegExp(`${v}:\\s*([^;]+);`).exec(b)[1].trim();
    assert.notEqual(pick(dark), pick(light), `${v} is the same in both themes`);
  }
  assert.match(dark, /color-scheme:\s*dark/);
});

test('4. the surfaces a person reads carry no light literal of their own', () => {
  const LIGHT = /#FFF8E7|#ffffff|#ECE7DA|#F0EAD2|#6B5878|#B8433A|color: #1A1320|background: #1A1320/i;
  const rules = css.split('}').map((r) => r.trim()).filter(Boolean);
  const themed = rules.filter((r) => /^\.puck-(btn|card|row|b)\b/.test(r) && !/^\.puck-(btn|b)\.(danger|close)/.test(r));
  assert.ok(themed.length >= 12, `only found ${themed.length} themed rules, the selector filter is wrong`);
  for (const r of themed) assert.doesNotMatch(r, LIGHT, `still hard coded light: ${r.slice(0, 70)}`);
});

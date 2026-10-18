'use strict';

/**
 * RENDERER-PROFILE (option A): real, never-shown windows driven by the REAL RendererProbe
 * (transpiled from src).
 * - BUSY: armed while healthy, then stuck in `runawayAllocator`, a loop that allocates without
 *   yielding (bounded at MAX_MB, then spins in the same function). capture() must name it (stack
 *   and profile), write a parseable .cpuprofile, and leave the renderer running.
 * - UNARMED: the same loop, with the probe only arming at spike time (the 1.1.67 situation).
 *   capture() must time out at 'arm', give up and detach, and never hang main.
 * - IDLE: an armed, calm page. No stack, a profile, and the page still answers afterwards.
 * - FOREIGN: an armed page that hits a `debugger;` statement. The probe resumes it, so the page
 *   finishes its work.
 * The result also records main's worst event-loop gap during each capture. userData and
 * sessionData are inside the sandbox.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const { isolateAppPaths } = require('./isolate-paths.cjs');
const { writeFileSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const MARKER = '__RENDERERPROFILE_RESULT__';
const argOf = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const sandbox = argOf('sandbox', null);
if (!sandbox) { process.stderr.write('renderer-profile harness: --sandbox required\n'); process.exit(2); }
// HARNESS-CRASHPAD: every path, crashDumps included, inside the sandbox (asserted).
isolateAppPaths(app, sandbox);

const src = readFileSync(join(__dirname, '..', '..', 'src', 'main', 'rendererRecovery.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
const R = mod.exports;

const MAX_MB = 200; // bounded: never starves tests running beside it
const page = (name) => {
  const file = join(sandbox, `${name}.html`);
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><title>${name}</title><script>
  const { ipcRenderer } = require('electron');
  function runawayAllocator(maxMb) {
    const keep = [];
    for (;;) { if (keep.length * 2 < maxMb) keep.push(new Array(262144).fill(keep.length)); else keep[keep.length - 1][0] += 1; }
  }
  function stopsAtDebugger() { debugger; ipcRenderer.send('page:after-debugger'); }
  ipcRenderer.on('page:busy', () => setTimeout(() => runawayAllocator(${MAX_MB}), 20));
  ipcRenderer.on('page:debugger', () => setTimeout(stopsAtDebugger, 20));
  window.ping = () => 'pong';
  ipcRenderer.send('page:ready', '${name}');
</script>`);
  return file;
};

const result = { ok: false };
const finish = (extra = {}) => { Object.assign(result, extra); process.stdout.write(`${MARKER}${JSON.stringify(result)}\n`); app.exit(0); };
setTimeout(() => finish({ error: 'timeout' }), 110_000).unref?.();
app.on('window-all-closed', () => { /* each scenario opens its own window */ });

const waiters = new Map();
const once = (ch) => new Promise((r) => { waiters.set(ch, r); });
ipcMain.on('page:ready', (_e, name) => { const r = waiters.get(`ready:${name}`); if (r) r(); });
ipcMain.on('page:after-debugger', () => { const r = waiters.get('after-debugger'); if (r) r(); });

/** main's worst event-loop gap while `fn` runs (a 20 ms ticker). */
async function measured(fn) {
  let last = Date.now(); let worst = 0;
  const tick = setInterval(() => { const now = Date.now(); worst = Math.max(worst, now - last); last = now; }, 20);
  try { const r = await fn(); return { r, worstGapMs: Math.max(worst, Date.now() - last) }; } finally { clearInterval(tick); }
}

async function scenario(name, { arm = true, busy = false } = {}) {
  const win = new BrowserWindow({ show: false, width: 400, height: 300, webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false } });
  const wc = win.webContents;
  const probe = new R.RendererProbe(wc.debugger, { devToolsOpen: () => wc.isDevToolsOpened() });
  const up = once(`ready:${name}`);
  win.loadFile(page(name));
  await up;
  const armed = arm ? await probe.arm() : false;
  if (busy) { wc.send('page:busy'); await new Promise((r) => setTimeout(r, 700)); }
  const pid = wc.getOSProcessId();
  const dir = join(sandbox, 'renderer-profiles');
  const { r, worstGapMs } = await measured(() => probe.capture({ write: (json) => R.saveRendererProfile(dir, pid, json) }));
  let fileNodes = null;
  if (r.file) { try { fileNodes = JSON.parse(readFileSync(r.file, 'utf8')).nodes.length; } catch { fileNodes = -1; } }
  // Not left paused: an idle page must still answer; a busy one must still be allocating (alive).
  const answers = busy ? null : await Promise.race([wc.executeJavaScript('window.ping()'), new Promise((res) => setTimeout(() => res('no-answer'), 30000))]);
  const attachedAfter = wc.debugger.isAttached();
  const out = { name, armed, pid, profile: { ...r, file: r.file ? 'written' : null }, fileNodes, worstGapMs, answers, attachedAfter, foreignResumes: probe.foreignResumes };
  probe.giveUp();
  win.destroy();
  return out;
}

async function foreign() {
  const win = new BrowserWindow({ show: false, width: 400, height: 300, webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false } });
  const wc = win.webContents;
  const probe = new R.RendererProbe(wc.debugger, { devToolsOpen: () => wc.isDevToolsOpened() });
  const up = once('ready:foreign');
  win.loadFile(page('foreign'));
  await up;
  const armed = await probe.arm();
  const after = once('after-debugger');
  wc.send('page:debugger');
  const got = await Promise.race([after.then(() => 'continued'), new Promise((r) => setTimeout(() => r('stuck'), 30000))]);
  const out = { name: 'foreign', armed, got, foreignResumes: probe.foreignResumes };
  probe.giveUp();
  win.destroy();
  return out;
}

app.whenReady().then(async () => {
  try {
    const busy = await scenario('busy', { busy: true });
    const unarmed = await scenario('unarmed', { arm: false, busy: true });
    const idle = await scenario('idle');
    const dbgStmt = await foreign();
    finish({ ok: true, busy, unarmed, idle, foreign: dbgStmt });
  } catch (e) {
    finish({ ok: false, error: e && e.stack ? e.stack : String(e) });
  }
});

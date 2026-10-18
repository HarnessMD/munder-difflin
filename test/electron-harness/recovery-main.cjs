'use strict';

/**
 * RENDERER-RECOVERY-164: the recovery module driven by a REAL, never-shown BrowserWindow whose
 * renderer is really crashed with webContents.forcefullyCrashRenderer().
 *
 * A stand-in "terminal" streams `pty:data:t1` every 40 ms to its OWNER webContents, the way
 * PtyManager routes a PTY (owner read at send time, reassigned on recreate). The page counts
 * the chunks it receives after each load, so "the terminal reattached" is observed, not
 * assumed. Sequence:
 *   crash 1 -> the SAME webContents reloads; data flows again; a reload notice is set
 *   crash 2 -> a NEW window replaces it; the stream's owner moves to it; the old one is
 *              destroyed without its 'close' firing; data flows to the new page
 *   crash 3 -> recovery gives up: no reload, no new window; the stream keeps running in main
 * The parent (run in the test) owns the sandbox directory, as with the other harnesses.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const { isolateAppPaths } = require('./isolate-paths.cjs');
const { writeFileSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const MARKER = '__RECOVERY_RESULT__';
const argOf = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const sandbox = argOf('sandbox', null);
if (!sandbox) { process.stderr.write('recovery harness: --sandbox required\n'); process.exit(2); }
// HARNESS-CRASHPAD: this harness crashes its renderer on purpose; without crashDumps in the
// sandbox, those dumps landed in the live app's %APPDATA%/munder-difflin/Crashpad.
isolateAppPaths(app, sandbox);

// The real module, transpiled in-process (it has no imports).
const src = readFileSync(join(__dirname, '..', '..', 'src', 'main', 'rendererRecovery.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
const R = mod.exports;

const page = join(sandbox, 'page.html');
writeFileSync(page, `<!doctype html><meta charset="utf-8"><title>recovery</title><script>
  const { ipcRenderer } = require('electron');
  let got = 0;
  ipcRenderer.on('pty:data:t1', () => { got += 1; if (got === 3) ipcRenderer.send('page:got3'); });
  ipcRenderer.invoke('page:notice').then((n) => ipcRenderer.send('page:ready', n));
</script>`);

const result = { steps: [], ok: false };
const note = (s) => { result.steps.push({ t: Date.now(), ...s }); };
const finish = (extra = {}) => {
  Object.assign(result, extra);
  process.stdout.write(`${MARKER}${JSON.stringify(result)}\n`);
  app.exit(0);
};
setTimeout(() => finish({ error: 'timeout' }), 60_000).unref?.();

let owner = null;                       // the stream's owner webContents (PtyManager semantics)
const notices = new Map();              // wc.id -> notice (one-shot)
const closeEvents = [];                 // any 'close' on a window (must stay empty)
const gaveUp = [];
let destroyed = [];
setInterval(() => { if (owner && !owner.isDestroyed()) { try { owner.send('pty:data:t1', 'x'); } catch { /* gone */ } } }, 40);

ipcMain.handle('page:notice', (e) => { const n = notices.get(e.sender.id) ?? null; notices.delete(e.sender.id); return n; });

const waiters = [];
// An event that arrives BEFORE its waiter is registered is kept, not lost: under a busy machine
// the page can report 'got3' before the harness awaits it (that race once failed the suite).
const early = [];
const waitFor = (name, pred = () => true, ms = 15_000) => new Promise((resolve, reject) => {
  const hit = early.findIndex((e) => e.name === name && pred(e.data));
  if (hit >= 0) { const [e] = early.splice(hit, 1); resolve(e.data); return; }
  const w = { name, pred, resolve };
  waiters.push(w);
  setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); reject(new Error(`timed out waiting for ${name}`)); } }, ms);
});
const emit = (name, data) => {
  const w = waiters.find((x) => x.name === name && x.pred(data));
  if (w) { waiters.splice(waiters.indexOf(w), 1); w.resolve(data); } else early.push({ name, data });
};
ipcMain.on('page:ready', (e, n) => emit('ready', { wcId: e.sender.id, notice: n }));
ipcMain.on('page:got3', (e) => emit('got3', { wcId: e.sender.id }));

const policy = new R.RecoveryPolicy();
function makeWindow() {
  const win = new BrowserWindow({ show: false, width: 400, height: 300, webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false } });
  win.on('close', () => closeEvents.push(win.webContents.id));
  win.loadFile(page);
  return win;
}
const deps = {
  policy,
  now: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  log: (row) => { note({ row }); emit('gone', row); },
  quitting: () => false,
  setNotice: (w, n) => { notices.set(w.webContents.id, n); },
  recreate: (old) => {
    const next = makeWindow();
    if (owner === old.webContents) owner = next.webContents; // reassignOwner
    destroyed.push(old.webContents.id);
    old.destroy();
    return next;
  },
  install: (w) => R.installRendererRecovery(w, deps),
  giveUp: (w, d) => { gaveUp.push(d); emit('gaveUp', d); }
};

app.whenReady().then(async () => {
  try {
    let win = makeWindow();
    R.installRendererRecovery(win, deps);
    owner = win.webContents;
    const first = await waitFor('ready');
    await waitFor('got3', (d) => d.wcId === first.wcId);
    const firstPid = win.webContents.getOSProcessId();
    note({ phase: 'loaded', wcId: first.wcId, pid: firstPid, goneListeners: win.webContents.listenerCount('render-process-gone') });

    // Crash 1: reload the SAME webContents.
    win.webContents.forcefullyCrashRenderer();
    const gone1 = await waitFor('gone');
    const re = await waitFor('ready', (d) => d.wcId === first.wcId);
    await waitFor('got3', (d) => d.wcId === first.wcId);
    const pidAfterReload = win.webContents.getOSProcessId();
    note({ phase: 'reloaded', sameWc: re.wcId === first.wcId, notice: re.notice, newPid: pidAfterReload !== firstPid, goneListeners: win.webContents.listenerCount('render-process-gone') });

    // Crash 2 (within 2 min): recreate once.
    win.webContents.forcefullyCrashRenderer();
    const gone2 = await waitFor('gone');
    const fresh = await waitFor('ready', (d) => d.wcId !== first.wcId);
    await waitFor('got3', (d) => d.wcId === fresh.wcId);
    const all = BrowserWindow.getAllWindows();
    win = all.find((w) => w.webContents.id === fresh.wcId);
    note({ phase: 'recreated', newWc: fresh.wcId !== first.wcId, notice: fresh.notice, ownerMoved: owner === win.webContents, oldDestroyed: destroyed.includes(first.wcId), windows: all.length, closeEvents: [...closeEvents] });

    // Crash 3: give up. No reload, no new window; the stream keeps running in main.
    // Both events fire in the same turn as the crash row, so wait for them BEFORE crashing.
    const goneP = waitFor('gone'); const gaveP = waitFor('gaveUp');
    win.webContents.forcefullyCrashRenderer();
    const [gone3, g] = await Promise.all([goneP, gaveP]);
    let reloadedAnyway = false;
    try { await waitFor('ready', () => true, 3000); reloadedAnyway = true; } catch { /* expected: nothing comes back */ }
    note({ phase: 'gave-up', streak: g.streak, reloadedAnyway, windows: BrowserWindow.getAllWindows().length });

    finish({
      ok: true,
      rows: [gone1, gone2, gone3].map((r) => ({ reason: r.reason, exitCode: r.exitCode, recovery: r.recovery, streak: r.streak, pid: r.pid, hasUptime: typeof r.windowUptimeMs === 'number' })),
      firstPid
    });
  } catch (e) {
    finish({ ok: false, error: e.message });
  }
});

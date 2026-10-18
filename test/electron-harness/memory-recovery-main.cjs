'use strict';

/**
 * MEMSPIKE-167: a real, never-shown window whose renderer FREEZES in a busy loop while it
 * allocates without bound (the 2026-09-27 spike: a runaway renderer the Human had to kill). The
 * REAL sampler (fast interval, a low limit) must confirm the over-limit on two samples, main must
 * kill the renderer WITHOUT its cooperation (recoverRendererForMemory), and the REAL
 * installRendererRecovery must reload it. A stand-in PTY keeps streaming from MAIN throughout and
 * must reach the reloaded page; the reloaded page is calm (it asks main which mode it is in).
 * crashDumps, userData and sessionData are all inside the sandbox.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const { isolateAppPaths } = require('./isolate-paths.cjs');
const { writeFileSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const MARKER = '__MEMRECOVERY_RESULT__';
const argOf = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const sandbox = argOf('sandbox', null);
if (!sandbox) { process.stderr.write('memory-recovery harness: --sandbox required\n'); process.exit(2); }
// HARNESS-CRASHPAD: every path, crashDumps included, inside the sandbox (asserted).
isolateAppPaths(app, sandbox);

const src = readFileSync(join(__dirname, '..', '..', 'src', 'main', 'rendererRecovery.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
const R = mod.exports;

// Low and BOUNDED: the hog stops allocating a little past the limit (then only spins, still
// frozen), so it never starves other tests running beside it in the suite (it once took ~1.4 GB).
const LIMIT_MB = Number(argOf('limit-mb', '400'));
const HOG_MAX_MB = LIMIT_MB + 250;
const page = join(sandbox, 'page.html');
writeFileSync(page, `<!doctype html><meta charset="utf-8"><title>memrecovery</title><script>
  const { ipcRenderer } = require('electron');
  let got = 0;
  ipcRenderer.on('pty:data:t1', () => { got += 1; if (got === 3) ipcRenderer.send('page:got3'); });
  ipcRenderer.invoke('page:mode').then(({ mode, maxMb }) => {
    ipcRenderer.invoke('page:notice').then((n) => ipcRenderer.send('page:ready', { mode, notice: n }));
    if (mode === 'hog') {
      // FROZEN: never yields to the event loop again (so it cannot run a reload). It grows in
      // 2 MB steps up to maxMb, then only spins.
      setTimeout(() => { const keep = []; for (;;) { if (keep.length * 2 < maxMb) keep.push(new Array(262144).fill(keep.length)); } }, 50);
    }
  });
</script>`);

const result = { steps: [], ok: false };
const note = (s) => { result.steps.push({ t: Date.now(), ...s }); };
const finish = (extra = {}) => { Object.assign(result, extra); process.stdout.write(`${MARKER}${JSON.stringify(result)}\n`); app.exit(0); };
// Hang guards only (FLAKY-170): generous, since a saturated machine stretched the kill alone to ~3 min (recovered in 181 s).
setTimeout(() => finish({ error: 'timeout' }), 900_000).unref?.();

let owner = null;
let loads = 0;
let ticks = 0;
const notices = new Map();
setInterval(() => { ticks += 1; if (owner && !owner.isDestroyed()) { try { owner.send('pty:data:t1', 'x'); } catch { /* gone */ } } }, 40);
ipcMain.handle('page:mode', () => { loads += 1; return { mode: loads === 1 ? 'hog' : 'calm', maxMb: HOG_MAX_MB }; });
ipcMain.handle('page:notice', (e) => { const n = notices.get(e.sender.id) ?? null; notices.delete(e.sender.id); return n; });

const waiters = [];
// An event that arrives BEFORE its waiter is registered is kept, not lost: under a busy machine
// the page can report 'got3' before the harness awaits it (that race once failed the suite).
const early = [];
const waitFor = (name, pred = () => true, ms = 600_000) => new Promise((resolve, reject) => {
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
ipcMain.on('page:ready', (e, d) => emit('ready', { wcId: e.sender.id, ...d }));
ipcMain.on('page:got3', (e) => emit('got3', { wcId: e.sender.id }));

const policy = new R.RecoveryPolicy();
let memoryAt = 0;
let memoryKillPending = false;

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({ show: false, width: 400, height: 300, webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false } });
    win.loadFile(page);
    R.installRendererRecovery(win, {
      policy, now: () => Date.now(), setTimer: (fn, ms) => setTimeout(fn, ms),
      log: (row) => { note({ row: { reason: row.reason, recovery: row.recovery, streak: row.streak } }); emit('gone', row); },
      quitting: () => false,
      // FLAKY-TIMING (Andy, flaky-170): this stand-in for index.ts's setNotice marked the notice
      // 'memory' only when it came < 15 s (wall clock) after the kill. The harness's question is
      // plumbing - beforeKill ran before the kill, and the reload's notice follows it - so it is
      // now answered by that ORDER: a memory kill not yet reported marks the next notice.
      setNotice: (w, n) => { const mem = memoryKillPending; memoryKillPending = false; notices.set(w.webContents.id, mem ? { ...n, reason: 'memory', sinceKillMs: Date.now() - memoryAt } : n); },
      recreate: () => null, install: () => {}, giveUp: (w, d) => emit('gaveUp', d)
    });
    owner = win.webContents;
    const first = await waitFor('ready');
    note({ phase: 'loaded', mode: first.mode, pid: win.webContents.getOSProcessId() });

    const actions = [];
    const sampler = new R.RendererMemorySampler({
      metrics: () => app.getAppMetrics(), now: () => Date.now(), alert: (r) => note({ alert: r.why, mb: r.mb }),
      alertMb: LIMIT_MB,
      onOverLimit: (pid, mb) => {
        const outcome = R.recoverRendererForMemory(pid, {
          windows: () => BrowserWindow.getAllWindows(), givenUp: () => policy.givenUp, beforeKill: () => { memoryAt = Date.now(); memoryKillPending = true; }
        });
        actions.push({ pid, mb, outcome, at: Date.now() });
        note({ phase: 'over-limit', pid, mb, outcome });
      }
    });
    const timer = setInterval(() => sampler.sample(), 300);
    const hogStart = Date.now();
    const gone = await waitFor('gone');
    const re = await waitFor('ready', (d) => d.wcId === first.wcId && d.mode === 'calm');
    await waitFor('got3', (d) => d.wcId === first.wcId);
    clearInterval(timer);
    const ticksAtEnd = ticks;
    note({ phase: 'recovered', notice: re.notice, sameWc: re.wcId === first.wcId, newPid: win.webContents.getOSProcessId() });
    finish({ ok: true, actions, gone: { reason: gone.reason, recovery: gone.recovery }, notice: re.notice, recoverMs: Date.now() - hogStart, ptyTicks: ticksAtEnd, limitMb: LIMIT_MB });
  } catch (e) {
    finish({ ok: false, error: e.message });
  }
});

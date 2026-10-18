'use strict';

/**
 * Reproduction of the A15 IPC-ordering experiment (`andy-l0-ipcorder.md`).
 *
 * WHY THIS EXISTS AT ALL. The original 7,060-trial result was measured with a
 * throwaway harness that was never committed, so the figure was true and nobody
 * could re-run it. A measurement nobody can reproduce decays into a claim; this
 * makes the instrument part of the repository so the number can be re-earned
 * instead of quoted.
 *
 * THE THREE-PHASE SHAPE IS PRESERVED EXACTLY, including the third phase, which is
 * the only one that loses a renderer and therefore the only one that tests the
 * thing A15 actually worries about:
 *   1. the production shape - `void invoke('mark'); await invoke('write')`, both in
 *      flight at once because the await is on the RESULT, not before the send
 *   2. nothing awaited at all - every pair queued in one synchronous loop
 *   3. the death itself - a fresh window per round that queues both messages and
 *      then calls `process.crash()` in the SAME synchronous turn
 *
 * The counterexample being hunted is one specific ordering: a WRITE that arrived
 * WITHOUT its mark. That is the direction that costs something, because main would
 * then have no record of a keystroke the renderer really sent. "Neither arrived" is
 * the safe direction and is counted separately rather than rounded into "no
 * failures" - the ticket expires and nothing is typed.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const { isolateAppPaths } = require('./isolate-paths.cjs');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

function argOf(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

const PHASE1 = Number(argOf('phase1', '200'));
const PHASE2 = Number(argOf('phase2', '500'));
const PHASE3 = Number(argOf('phase3', '10'));

// THE SANDBOX BELONGS TO THE PARENT (run.cjs), which creates it, passes it here as
// `--sandbox`, and removes it AFTER this process has exited. This process used to create
// it and `rmSync` it on the way out, inside a swallowed `catch` - and on Windows Chromium
// still holds files open at that moment, so the removal failed silently, every time. That
// is how about 1,400 directories and 14 GB accumulated in %TEMP% before anyone noticed. A
// child cannot reliably delete the directory its own open handles live in; its parent can.
const sandboxRoot = argOf('sandbox', null);
if (!sandboxRoot) {
  process.stderr.write('harness: refusing to run without --sandbox <dir>; the parent (run.cjs) owns the sandbox lifecycle\n');
  process.exit(2);
}
// HARNESS-CRASHPAD: every path, crashDumps included, inside the sandbox (asserted).
isolateAppPaths(app, sandboxRoot);

/** Arrival order per id, in the order main actually received them. */
const seen = new Map();
const note = (kind, id) => {
  if (!seen.has(id)) seen.set(id, []);
  seen.get(id).push(kind);
};

ipcMain.handle('mark', (_e, id) => { note('mark', id); return true; });
ipcMain.handle('write', (_e, id) => { note('write', id); return true; });

/** Classify one id's arrivals into the four outcomes the experiment reports. */
function tally(ids) {
  const out = { writeAfterMark: 0, writeWithoutMark: 0, neither: 0, markOnly: 0 };
  for (const id of ids) {
    const got = seen.get(id) ?? [];
    const m = got.indexOf('mark');
    const w = got.indexOf('write');
    if (m < 0 && w < 0) out.neither += 1;
    else if (w >= 0 && m < 0) out.writeWithoutMark += 1;
    else if (w < 0) out.markOnly += 1;
    else if (w > m) out.writeAfterMark += 1;
    else out.writeWithoutMark += 1; // a write ordered BEFORE its mark is the same defect
  }
  return out;
}

function finish(payload) {
  process.stdout.write(`\n__HARNESS_RESULT__${JSON.stringify(payload)}\n`);
  app.exit(0);
}

/** A window that can call `process.crash()` and speak ipcRenderer directly. This is
 *  the only place node integration is enabled, and it exists because the phase-3
 *  renderer has to die mid-turn; a preload bridge cannot express that. */
function crashRound(file) {
  return new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false }
  }).loadFile(file).catch(() => { /* the point of the round is that it dies */ });
}

app.whenReady().then(async () => {
  try {
    const driver = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false }
    });
    await driver.loadURL('data:text/html,<title>ipc-order</title>');

    // ── Phase 1 — the production shape ────────────────────────────────────────
    await driver.webContents.executeJavaScript(`(async () => {
      const { ipcRenderer } = require('electron');
      for (let i = 0; i < ${PHASE1}; i++) {
        const id = 'p1-' + i;
        void ipcRenderer.invoke('mark', id);
        await ipcRenderer.invoke('write', id);
      }
      return true;
    })()`, true);

    // ── Phase 2 — nothing awaited ─────────────────────────────────────────────
    await driver.webContents.executeJavaScript(`(async () => {
      const { ipcRenderer } = require('electron');
      const all = [];
      for (let i = 0; i < ${PHASE2}; i++) {
        const id = 'p2-' + i;
        all.push(ipcRenderer.invoke('mark', id));
        all.push(ipcRenderer.invoke('write', id));
      }
      await Promise.all(all);
      return true;
    })()`, true);

    // ── Phase 3 — the renderer dies in the same turn ──────────────────────────
    for (let i = 0; i < PHASE3; i++) {
      const id = `p3-${i}`;
      const file = join(sandboxRoot, `round-${i}.html`);
      writeFileSync(file, `<!doctype html><meta charset="utf-8"><script>
        const { ipcRenderer } = require('electron');
        ipcRenderer.invoke('mark', ${JSON.stringify(id)});
        ipcRenderer.invoke('write', ${JSON.stringify(id)});
        process.crash();
      </script>`, 'utf8');
      await crashRound(file);
      // A full turn before judging, so anything still in flight has its chance to
      // land. Without this the experiment would measure its own impatience.
      await new Promise((r) => setTimeout(r, 120));
    }

    const ids = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
    finish({
      ok: true,
      build: {
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node
      },
      phases: {
        production_shape: { trials: PHASE1, ...tally(ids('p1', PHASE1)) },
        nothing_awaited: { trials: PHASE2, ...tally(ids('p2', PHASE2)) },
        renderer_crashes: { trials: PHASE3, ...tally(ids('p3', PHASE3)) }
      }
    });
  } catch (e) {
    finish({ ok: false, error: String((e && e.stack) || e) });
  }
});

app.on('window-all-closed', () => { /* phase 3 kills windows on purpose */ });

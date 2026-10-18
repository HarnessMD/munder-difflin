'use strict';

/**
 * RENDERER-RECOVERY-164: the local crash reporter, for real, in a hidden Electron.
 *   --mode dump      start the reporter (crashDumps.ts, uploadToServer:false), crash a hidden
 *                    renderer with process.crash(), and report the exit code and the dump that
 *                    waitForDump finds in the sandbox's crashDumps folder
 *   --mode ready     only measure time from process start to app 'ready', with
 *                    --reporter on|off, for the startup-cost comparison
 * The parent owns the sandbox directory.
 */
const { app, BrowserWindow, crashReporter } = require('electron');
const { isolateAppPaths } = require('./isolate-paths.cjs');
const { writeFileSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const t0 = Date.now() - Math.round(process.uptime() * 1000);
const MARKER = '__CRASHDUMP_RESULT__';
const argOf = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const sandbox = argOf('sandbox', null);
const mode = argOf('mode', 'dump');
const withReporter = argOf('reporter', 'on') === 'on';
if (!sandbox) { process.stderr.write('crash-dump harness: --sandbox required\n'); process.exit(2); }
// HARNESS-CRASHPAD: every path, crashDumps included, inside the sandbox (asserted).
const crashDir = isolateAppPaths(app, sandbox, { reporter: false }).crashDumps; // it starts (or skips) its own reporter below

const load = (rel) => {
  const src = readFileSync(join(__dirname, '..', '..', 'src', 'main', rel), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
  return mod.exports;
};
const D = load('crashDumps.ts');

// FLAKY-170 (Andy): what start() DOES on main, measured load-independently - its CPU time and every
// synchronous fs call it makes - next to the wall time (which a saturated machine stretches to
// seconds: one sample measured 7080 ms, with no defect).
const SYNC_FS = ['readFileSync', 'readdirSync', 'statSync', 'lstatSync', 'existsSync', 'openSync', 'readSync', 'writeFileSync', 'unlinkSync', 'rmSync', 'mkdirSync', 'copyFileSync', 'renameSync', 'accessSync'];
const startSyncFs = {};
let startCpuMs = null;
let start = null;
if (withReporter) {
  const fsMod = require('node:fs');
  const real = {};
  for (const k of SYNC_FS) { real[k] = fsMod[k]; fsMod[k] = function (...a) { startSyncFs[k] = (startSyncFs[k] || 0) + 1; return real[k].apply(this, a); }; }
  const c0 = process.cpuUsage();
  try { start = D.startLocalCrashReporter(crashReporter); } finally { Object.assign(fsMod, real); }
  const c = process.cpuUsage(c0);
  startCpuMs = (c.user + c.system) / 1000;
}
const finish = (r) => { process.stdout.write(`${MARKER}${JSON.stringify(r)}\n`); app.exit(0); };
// A hang guard only (FLAKY-170: generous; a loaded machine measured launches up to ~100 s).
setTimeout(() => finish({ ok: false, error: 'timeout' }), 300_000).unref?.();

app.whenReady().then(async () => {
  const readyMs = Date.now() - t0;
  const startCostMs = start ? start.readyAt - start.startedAt : null;
  if (mode === 'ready') { finish({ ok: true, readyMs, startCostMs, startCpuMs, startSyncFs, reporter: withReporter }); return; }
  const page = join(sandbox, 'crash.html');
  writeFileSync(page, '<!doctype html><meta charset="utf-8"><script>setTimeout(() => process.crash(), 300);</script>');
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false } });
  const since = Date.now();
  win.webContents.on('render-process-gone', async (_e, d) => {
    // Up to 100 s for Crashpad to write the dump (it returns at the first one found): a poll deadline, not a bound.
    const dump = await D.waitForDump(crashDir, since, { tries: 400, intervalMs: 250 });
    finish({ ok: true, reason: d.reason, exitCode: d.exitCode, dumpPath: dump?.path ?? null, dumpBytes: dump?.size ?? null, inSandbox: !!dump && dump.path.startsWith(crashDir), startCostMs, readyMs, uploadsEnabled: crashReporter.getUploadToServer() });
  });
  win.loadFile(page);
});

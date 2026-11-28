'use strict';
/**
 * Electron fixture for the restart-terminal regression test
 * (test/restart-terminal-preserve.cjs). Spawns via the outer plain-node driver.
 *
 * Boots a hidden BrowserWindow with nodeIntegration and runs the renderer
 * payload (test/fixtures/bug-14.renderer.js) via webContents.executeJavaScript —
 * the same protocol as test/fixtures/quit-sweep-main.cjs. The payload's result
 * JSON arrives over ipcRenderer 'bug14:result'; it is written to the
 * --result-file path and the app exits 0. Timeouts and crashes exit non-zero
 * with the error inside the result file.
 *
 * The page loads a blank file:// document (not data:) so localStorage has a
 * real, writable origin — the same situation as the packaged app.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
let resultFile = path.join(os.tmpdir(), 'bug14-result.json');
let rendererJs = path.join(__dirname, 'bug-14.renderer.js');
let repo = process.cwd();
let blankHtml = '';
for (const a of args) {
  if (a.startsWith('--result-file=')) resultFile = a.slice('--result-file='.length);
  else if (a.startsWith('--renderer=')) rendererJs = a.slice('--renderer='.length);
  else if (a.startsWith('--repo=')) repo = a.slice('--repo='.length);
  else if (a.startsWith('--blank=')) blankHtml = a.slice('--blank='.length);
}

function bail(message, code) {
  try {
    fs.writeFileSync(resultFile, JSON.stringify({ error: message }));
  } catch { /* last resort */ }
  console.error('[bug14-fixture] ' + message);
  app.exit(code);
}

const TIMEOUT_MS = 90_000;
const timer = setTimeout(() => bail('fixture self-timeout after ' + TIMEOUT_MS + 'ms', 3), TIMEOUT_MS);
if (timer.unref) timer.unref();

process.on('uncaughtException', (e) => bail('uncaughtException: ' + (e && e.stack || String(e)), 4));
process.on('unhandledRejection', (e) => bail('unhandledRejection: ' + (e && e.stack || String(e)), 4));

let got = false;
ipcMain.on('bug14:result', (_ev, json) => {
  if (got) return;
  got = true;
  clearTimeout(timer);
  try { fs.writeFileSync(resultFile, json); } catch { /* ignore */ }
  app.exit(0);
});

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1600,
    height: 1200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  // A blank page on a file:// origin: localStorage works, no network. The
  // driver creates the file (in tmp) and passes it with --blank=.
  const blankUrl = 'file:///' + blankHtml.split(path.sep).join('/');
  await win.loadURL(blankUrl);

  const payload = fs.readFileSync(rendererJs, 'utf8');
  const bootstrap = 'globalThis.__BUG14_REPO__=' + JSON.stringify(repo) + ';';
  await win.webContents.executeJavaScript(bootstrap + '\n' + payload, true);

  // Normal completion ships the result over IPC, which exits the app. If the
  // payload returned early without the IPC firing, fail loudly after a grace
  // period rather than hanging.
  setTimeout(() => {
    if (!got) bail('renderer finished without shipping a result', 5);
  }, 3000);
}).catch((e) => {
  clearTimeout(timer);
  bail('fixture main threw: ' + (e && e.stack || String(e)), 2);
});

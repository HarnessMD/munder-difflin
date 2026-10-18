'use strict';
/**
 * HARNESS-CRASHPAD: every Electron MAIN a test launches calls isolateAppPaths(app, sandbox) at the
 * top, before app.whenReady, crashReporter.start or any window.
 *
 * Without it, Electron resolves userData, sessionData and crashDumps from the package name, i.e.
 * the LIVE app's %APPDATA%/munder-difflin. Harness crashes then wrote Crashpad dumps (ptype renderer,
 * "electron-harness") next to the real app's own dumps, and the app's prune (3 kept) deleted real
 * evidence to make room for them (1.1.65-1.1.67). test/harness-crashpad-guard.test.cjs fails if a
 * main does not call this.
 *
 * appData and logs are redirected too, so no default path can resolve outside the sandbox. The
 * paths are re-read and asserted: a harness that is not isolated refuses to run (exit 2).
 *
 * setPath('crashDumps') ALONE IS NOT ENOUGH (verified 2026-09-28): Electron's Crashpad handler is
 * already running on its default database, so a renderer crash in a harness that never calls
 * crashReporter.start() still landed in the live folder (--user-data-dir was the sandbox). The
 * helper therefore starts a local-only reporter (no upload) on the sandboxed crashDumps. A main that
 * starts its own reporter right after (crash-dump-main, pty-quit-main) passes { reporter: false }.
 */
const { join, resolve, relative, isAbsolute } = require('node:path');
const { mkdirSync } = require('node:fs');

function inside(dir, root) {
  const rel = relative(resolve(root), resolve(dir));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * FLAKY-170 (Andy): a harness window is HIDDEN, so Chromium treats its renderer as a background
 * tab: it drops the renderer process to background priority (Windows priority 4) and throttles its
 * timers. Under a saturated machine that starves the renderer outright - measured under 34 CPU
 * hogs: 15 harness renderers at priority 4 with 0-0.8 s of CPU over 130 s, while the tests waited
 * on them until their hang guards fired. A test's hidden window is the foreground work of that
 * test, not a background tab, so it keeps normal scheduling. Nothing under test depends on
 * backgrounding (the app's own windows are visible). Must run before 'ready'; every harness main
 * calls isolateAppPaths at the top, which calls this.
 */
function keepRenderersScheduled(app) {
  if (!app.commandLine) return; // a unit test's fake app
  // disable-gpu too: a hidden harness window draws nothing on screen, and under the same load
  // dozens of concurrent GPU-process start-ups were a large share of the stalled launches.
  for (const sw of ['disable-renderer-backgrounding', 'disable-background-timer-throttling', 'disable-backgrounding-occluded-windows', 'disable-gpu']) {
    app.commandLine.appendSwitch(sw);
  }
}

function isolateAppPaths(app, sandbox, opts = {}) {
  if (!sandbox) {
    process.stderr.write('harness: refusing to run without a sandbox (HARNESS-CRASHPAD)\n');
    process.exit(2);
  }
  const paths = {
    appData: join(sandbox, 'appData'),
    userData: sandbox,
    sessionData: sandbox,
    crashDumps: join(sandbox, 'crashDumps'),
    logs: join(sandbox, 'logs')
  };
  for (const [name, dir] of Object.entries(paths)) {
    mkdirSync(dir, { recursive: true });
    app.setPath(name, dir);
  }
  const outside = Object.keys(paths).filter((name) => !inside(app.getPath(name), sandbox));
  if (outside.length) {
    process.stderr.write(`harness: ${outside.join(', ')} resolved outside the sandbox (HARNESS-CRASHPAD)\n`);
    process.exit(2);
  }
  keepRenderersScheduled(app);
  if (opts.reporter !== false) {
    require('electron').crashReporter.start({ uploadToServer: false, submitURL: '', compress: false });
  }
  return paths;
}

module.exports = { isolateAppPaths, inside };

'use strict';

/**
 * Electron main process for the renderer test harness (authorised on `L0-UI-B5`).
 *
 * WHY A REAL BrowserWindow. The evidence this harness exists to produce is about a
 * RENDERED screen: xterm only fills `entry.opened` and a readable buffer row once
 * `term.open()` has run against a real element, and computed style, accessibility
 * semantics and responsive behaviour are properties of a layout engine rather than
 * of a DOM tree. jsdom was explicitly excluded and would not answer any of them - it
 * has no layout, so every one of those reads would return a plausible-looking value
 * that nothing produced.
 *
 * TEST INFRASTRUCTURE ONLY. Nothing here is imported by the app, no production file
 * is modified to make a scenario observable, and the scenarios import the REAL
 * renderer modules rather than reimplementing their logic. If an observation turns
 * out to need a production change, the rule is to report it and stop - not to add a
 * seam quietly, because a seam added to make a test pass is a change to the thing
 * being measured.
 *
 * ISOLATION. `userData` is repointed at a throwaway directory before `app.whenReady`,
 * so a harness run cannot read or write Stable's or Dev's state. The window is never
 * shown.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const { isolateAppPaths } = require('./isolate-paths.cjs');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

/** `--scenario <abs.ts>` `--width N` `--height N` `--timeout N` */
function argOf(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

const scenario = argOf('scenario');
const width = Number(argOf('width', '1280'));
const height = Number(argOf('height', '800'));
const timeoutMs = Number(argOf('timeout', '30000'));

// Isolated before anything can resolve a default path off the package name.
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

let finished = false;
/** One exit path, so a result and a failure cannot both be printed. */
function finish(payload) {
  if (finished) return;
  finished = true;
  process.stdout.write(`\n__HARNESS_RESULT__${JSON.stringify(payload)}\n`);
  app.exit(0);
}

/**
 * Bundle the scenario for the renderer.
 *
 * The scenario is TypeScript and pulls in the real components, so it is bundled the
 * way the app bundles them rather than loaded through a bespoke loader: same
 * resolution, same `@shared` alias, same CSS. A stylesheet import is turned into a
 * runtime `<style>` injection, because xterm measures a real cell from real CSS and
 * dropping the stylesheet would silently change every geometry-dependent reading.
 */
async function bundleScenario(entry) {
  const esbuild = require('esbuild');
  // Vite-style asset imports (`x.png?url`, `x.tmj?raw`) and the `@brand` alias, so a scenario can
  // mount the REAL App (RR-164): ?url resolves to a file URL, ?raw to the file's text.
  const viteAssets = {
    name: 'vite-assets',
    setup(build) {
      const { dirname, resolve: res, join: j } = require('node:path');
      const { pathToFileURL } = require('node:url');
      const root = j(__dirname, '..', '..');
      build.onResolve({ filter: /\?(url|raw|worker)$/ }, (args) => {
        const [spec, kind] = args.path.split('?');
        const p = spec.startsWith('@brand/') ? res(root, 'docs', spec.slice(7))
          : spec.startsWith('@/') ? res(root, 'src', 'renderer', 'src', spec.slice(2))
            : res(dirname(args.importer), spec);
        return { path: p, namespace: `vite-${kind}` };
      });
      // ?worker (monaco): a stub Worker class; a scenario never opens the editor.
      build.onLoad({ filter: /.*/, namespace: 'vite-worker' }, () => ({ contents: 'export default class { postMessage() {} terminate() {} addEventListener() {} removeEventListener() {} }', loader: 'js' }));
      build.onLoad({ filter: /.*/, namespace: 'vite-url' }, (args) => ({ contents: `export default ${JSON.stringify(pathToFileURL(args.path).href)};`, loader: 'js' }));
      build.onLoad({ filter: /.*/, namespace: 'vite-raw' }, async (args) => ({ contents: `export default ${JSON.stringify(await require('node:fs/promises').readFile(args.path, 'utf8'))};`, loader: 'js' }));
    }
  };
  const cssAsStyleTag = {
    name: 'css-as-style-tag',
    setup(build) {
      build.onLoad({ filter: /\.css$/ }, async (args) => {
        const css = await require('node:fs/promises').readFile(args.path, 'utf8');
        return {
          contents: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);`,
          loader: 'js'
        };
      });
    }
  };
  const out = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'SCENARIO',
    platform: 'browser',
    target: 'chrome120',
    sourcemap: 'inline',
    // `@` is the renderer's own root alias (electron.vite / tsconfig.web): a scenario that
    // mounts a real COMPONENT, not only terminalPool, pulls in modules that use it.
    alias: {
      '@shared': join(__dirname, '..', '..', 'src', 'shared'),
      '@': join(__dirname, '..', '..', 'src', 'renderer', 'src')
    },
    jsx: 'automatic',
    // What electron-vite defines for the renderer, so a scenario can mount the REAL App (RR-164).
    define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}', __APP_VERSION__: '"0.0.0-harness"' },
    plugins: [viteAssets, cssAsStyleTag],
    logLevel: 'silent'
  });
  return out.outputFiles[0].text;
}

app.whenReady().then(async () => {
  const timer = setTimeout(
    () => finish({ ok: false, error: `harness timed out after ${timeoutMs}ms` }),
    timeoutMs
  );
  timer.unref?.();

  ipcMain.once('harness:result', (_e, payload) => {
    clearTimeout(timer);
    finish(payload);
  });

  try {
    const code = await bundleScenario(scenario);
    const bundleFile = join(sandboxRoot, 'scenario.js');
    writeFileSync(bundleFile, code, 'utf8');

    const win = new BrowserWindow({
      width,
      height,
      show: false,
      webPreferences: {
        preload: join(__dirname, 'harness-preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        // Offscreen windows are throttled, which would make a scenario that waits
        // on a frame or a timer flaky for a reason that has nothing to do with it.
        backgroundThrottling: false
      }
    });

    // Real window geometry, because a responsive reading taken by resizing a <div>
    // measures a <div>. The scenario awaits the resize so a later measurement cannot
    // race the layout it is supposed to be measuring.
    ipcMain.handle('harness:resize', (_e, { width: w, height: h }) => {
      win.setSize(Math.round(w), Math.round(h));
      return new Promise((resolve) => setTimeout(() => resolve({ size: win.getSize() }), 120));
    });

    // IMPACT-LOOP-171: the renderer's OWN process memory (private bytes, as the app's
    // RendererMemorySampler reads it), which a page cannot observe about itself.
    ipcMain.handle('harness:metrics', () => {
      const pid = win.webContents.getOSProcessId();
      const r = app.getAppMetrics().find((x) => x.pid === pid);
      return r ? { privateMb: Math.round((r.memory.privateBytes || 0) / 1024), workingSetMb: Math.round(r.memory.workingSetSize / 1024) } : null;
    });

    // A REAL CLICK. `element.click()` dispatches an untrusted synthetic event from inside
    // the page; this goes through Chromium's input pipeline at window coordinates, so it
    // is hit-tested against what is actually rendered there and arrives `isTrusted`.
    ipcMain.handle('harness:click', async (_e, { x, y }) => {
      const at = { x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 };
      win.webContents.sendInputEvent({ type: 'mouseDown', ...at });
      win.webContents.sendInputEvent({ type: 'mouseUp', ...at });
      return new Promise((resolve) => setTimeout(() => resolve(true), 80));
    });

    // THE ACCESSIBILITY TREE, NOT THE DOM. C2.11 #14 asks what a screen reader is
    // handed, which is a platform artifact computed from role, name and semantics -
    // routinely different from the markup, and not derivable from it. This is the
    // read jsdom cannot even approximate.
    ipcMain.handle('harness:axtree', async () => {
      try {
        if (!win.webContents.debugger.isAttached()) win.webContents.debugger.attach('1.3');
        await win.webContents.debugger.sendCommand('Accessibility.enable');
        const { nodes } = await win.webContents.debugger.sendCommand('Accessibility.getFullAXTree');
        return nodes.map((n) => ({
          role: n.role?.value ?? null,
          name: n.name?.value ?? null,
          ignored: n.ignored === true
        }));
      } catch (e) {
        return { error: String(e) };
      }
    });

    win.webContents.on('console-message', (_e, _level, message) => {
      process.stderr.write(`[renderer] ${message}\n`);
    });
    win.webContents.on('render-process-gone', (_e, details) => {
      finish({ ok: false, error: `renderer process gone: ${details.reason}` });
    });

    await win.loadFile(join(__dirname, 'page.html'));
    // Executed rather than script-tagged so a bundling or syntax error surfaces here
    // as a rejected promise instead of a silent blank page.
    await win.webContents.executeJavaScript(code, true);
    await win.webContents.executeJavaScript('window.__harnessRun()', true);
  } catch (e) {
    finish({ ok: false, error: String((e && e.stack) || e) });
  }
});

app.on('window-all-closed', () => { /* the scenario decides when the run is over */ });

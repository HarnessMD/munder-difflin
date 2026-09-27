'use strict';

/* 0.5.3, F3 (founder, 24 Sep 2026): the missing-CLI card was drawn but dead.
 *
 * Two faults, one screen:
 *  - The card sat at z auto while xterm's own layers carry z-index of their
 *    own (the WebGL addon stamps each canvas with an inline z-index, its
 *    link layer is 2; xterm.css gives the helpers 5 and the accessibility
 *    tree 10). In the SAME stacking context the grid's canvas therefore won
 *    the hit test over the card: the pointer stayed the terminal's I-beam and
 *    Install could not be pressed. The overlay now says zIndex: 20.
 *  - The card's state was push-only (pty:cli-missing:<id> at spawn time). A
 *    pty that stopped at the card BEFORE its terminal was listening - an
 *    agent respawned at app start, a screen opened later - left a silent
 *    blank grid. The pool now also pulls the state once at acquire
 *    (pty:cliMissingState).
 *
 * The click half is a REAL hit test: headless Chrome renders the shipped
 * xterm.css plus the addon's inline canvas z-index under the overlay object
 * lifted VERBATIM from CliMissingCard.tsx, and the test asserts
 * document.elementFromPoint at the button's centre is the button and that a
 * CDP-dispatched click lands on it. A twin pane with the overlay's zIndex
 * stripped must fail the same probe, which proves the fixture reproduces the
 * founder's bug and the assertion is load-bearing. Skipped only when Chrome
 * is not on the machine. The wiring of the pull seam is pinned by reading
 * the source, the way the rest of the I2 suite pins its wiring. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

/* ── the z-index contract ─────────────────────────────────────────────── */

/** The overlay/scrim object literal of a component, evaluated verbatim. */
function styleLiteral(source, constName) {
  const m = source.match(new RegExp(`const ${constName}: CSSProperties = \\{([\\s\\S]*?)\\n\\};`));
  assert.ok(m, `${constName} literal found`);
  // Plain values and string tokens only, so the literal is valid JS as-is.
  // eslint-disable-next-line no-eval
  return eval(`({${m[1]}})`);
}

const cardSrc = read('src/renderer/src/components/CliMissingCard.tsx');
const loginSrc = read('src/renderer/src/components/CliLoginModal.tsx');
const cardOverlay = styleLiteral(cardSrc, 'overlay');
const loginScrim = styleLiteral(loginSrc, 'scrim');

test('the card and the login scrim sit above every xterm layer', () => {
  const css = read('node_modules/@xterm/xterm/css/xterm.css');
  const cssMax = Math.max(...[...css.matchAll(/z-index:\s*(-?\d+)/g)].map((m) => Number(m[1])));
  assert.ok(cssMax >= 10, `xterm.css declares layers up to ${cssMax} (accessibility tree)`);

  // The WebGL addon stamps each render layer canvas with an inline z-index
  // (observed live: the link layer at 2). If this stamp ever disappears the
  // pin below goes stale with it, so its presence is asserted here.
  const addon = read('node_modules/@xterm/addon-webgl/lib/addon-webgl.js');
  assert.match(addon, /style\.zIndex\s*=/, 'the addon gives its canvases their own z-index');

  for (const [name, style] of [['CliMissingCard overlay', cardOverlay], ['CliLoginModal scrim', loginScrim]]) {
    assert.equal(style.position, 'absolute', `${name} is positioned`);
    assert.equal(style.pointerEvents, 'auto', `${name} takes the pointer`);
    assert.equal(typeof style.zIndex, 'number', `${name} declares an explicit zIndex`);
    assert.ok(style.zIndex > cssMax, `${name} zIndex ${style.zIndex} clears xterm's ${cssMax}`);
  }
});

/* ── the pull seam (fault 2: blank grid after a restart) ──────────────── */

test('main answers pty:cliMissingState from the paused spawns', () => {
  const main = read('src/main/index.ts');
  const h = main.match(/ipcMain\.handle\('pty:cliMissingState',[\s\S]{0,300}?\}\);/);
  assert.ok(h, 'the handler exists');
  assert.match(h[0], /pendingCliMissing\.get\(id\)\?\.state \?\? null/, 'it reads the same map the card push reads');
  assert.match(h[0], /typeof id !== 'string'/, 'it refuses a non-string id');
});

test('preload exposes the pull next to the push', () => {
  const preload = read('src/preload/index.ts');
  assert.match(preload, /cliMissingState: \(id: string\): Promise<CliMissingState \| null> =>\s*\n\s*ipcRenderer\.invoke\('pty:cliMissingState', id\)/);
});

test('the pool pulls once at acquire and the push stays authoritative', () => {
  const pool = read('src/renderer/src/components/terminalPool.ts');
  const at = pool.indexOf('window.cth.cliMissingState?.(ptyId)');
  assert.ok(at > 0, 'the pool asks main at acquire');
  assert.ok(at > pool.indexOf('window.cth.onPtyCliMissing(ptyId'), 'the listener is armed BEFORE the ask, so no window exists where a push could be missed');
  const seed = pool.slice(at, at + 220);
  assert.match(seed, /state && !entry\.cliMissing/, 'a push that arrived while the answer was in flight is never overwritten');
});

/* ── the real click test (fault 1: card drawn but dead) ───────────────── */

const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']
  .find((p) => fs.existsSync(p));

/** One terminal pane: the shipped xterm.css classes, the addon's inline
 *  canvas z-index, and the overlay styles applied by the page script. */
function paneHtml(id) {
  return `
  <div class="pane" id="${id}" style="position: relative; width: 600px; height: 400px;">
    <div class="host" style="width: 100%; height: 100%;">
      <div class="terminal xterm">
        <div class="xterm-helpers"><textarea class="xterm-helper-textarea"></textarea></div>
        <div class="xterm-screen" style="position: relative; width: 600px; height: 400px;">
          <canvas class="xterm-link-layer" style="z-index: 2; width: 600px; height: 400px;"></canvas>
          <canvas style="width: 600px; height: 400px;"></canvas>
        </div>
        <div class="xterm-viewport"></div>
      </div>
    </div>
    <div class="overlay"><button style="cursor: pointer; padding: 6px 14px;">Install</button></div>
  </div>`;
}

function fixtureHtml(xtermCssHref, overlayStyle) {
  return `<!doctype html><html><head><meta charset="utf-8">
  <link rel="stylesheet" href="${xtermCssHref}">
  <style>body { margin: 0; } .xterm { cursor: text; }</style>
  </head><body>
  ${paneHtml('fixed')}
  ${paneHtml('broken')}
  <script>
    const overlayStyle = ${JSON.stringify(overlayStyle)};
    window.__clicks = 0;
    for (const pane of document.querySelectorAll('.pane')) {
      const ov = pane.querySelector('.overlay');
      for (const [k, v] of Object.entries(overlayStyle)) ov.style[k] = String(v);
      // The twin keeps every style BUT the z-index: the founder's build.
      if (pane.id === 'broken') ov.style.zIndex = '';
      ov.querySelector('button').addEventListener('click', () => { window.__clicks++; });
    }
    window.__probe = (paneId) => {
      const btn = document.querySelector('#' + paneId + ' button');
      const r = btn.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { hitIsButton: hit === btn || btn.contains(hit),
               hitTag: hit.tagName + '.' + hit.className,
               cursor: getComputedStyle(hit).cursor,
               cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    };
  </script></body></html>`;
}

test('elementFromPoint at the button centre returns the button, and a real click lands', { skip: CHROME ? false : 'Chrome is not installed on this machine' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-card-'));
  const cssPath = path.join(__dirname, '..', 'node_modules', '@xterm', 'xterm', 'css', 'xterm.css');
  const page = path.join(dir, 'fixture.html');
  fs.writeFileSync(page, fixtureHtml('file://' + cssPath, cardOverlay));

  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${path.join(dir, 'profile')}`,
    '--no-first-run', '--no-default-browser-check', 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  try {
    const port = await new Promise((resolve, reject) => {
      let err = '';
      const t = setTimeout(() => reject(new Error(`Chrome gave no DevTools line: ${err}`)), 15000);
      chrome.stderr.on('data', (d) => {
        err += d;
        const m = err.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
        if (m) { clearTimeout(t); resolve(Number(m[1])); }
      });
      chrome.on('exit', () => { clearTimeout(t); reject(new Error(`Chrome exited: ${err}`)); });
    });
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let seq = 0;
    const pending = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(typeof e.data === 'string' ? e.data : Buffer.from(e.data).toString());
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    };
    const send = (method, params = {}) => new Promise((resolve) => {
      const id = ++seq; pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evalJs = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true });
      assert.ok(!r.result.exceptionDetails, JSON.stringify(r.result.exceptionDetails ?? null));
      return r.result.result.value;
    };
    await send('Page.enable');
    // Both panes stacked are 800 tall; headless opens smaller, and
    // elementFromPoint answers null outside the viewport.
    await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'file://' + page });
    // elementFromPoint answers null until the page has laid out and painted,
    // so readiness is "a probe at a known point finds something", not just
    // "the script ran".
    for (let i = 0; i < 200 && await evalJs('typeof window.__probe === "function" && document.readyState === "complete" && document.elementFromPoint(10, 10) !== null') !== true; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }

    // The pane with the shipped overlay: the button IS the hit target.
    const fixed = await evalJs('window.__probe("fixed")');
    assert.equal(fixed.hitIsButton, true, `the shipped overlay wins the hit test (hit: ${fixed.hitTag})`);
    assert.notEqual(fixed.cursor, 'text', 'the pointer over the button is not the terminal I-beam');

    // The twin without the z-index: the founder's bug, reproduced. The grid's
    // link-layer canvas takes the point and the cursor is the I-beam. This is
    // the proof the fixture (and so the assertion above) is load-bearing.
    const broken = await evalJs('window.__probe("broken")');
    assert.equal(broken.hitIsButton, false, 'without the z-index the canvas wins: the bug reproduces');
    assert.match(broken.hitTag, /xterm-link-layer/);
    assert.equal(broken.cursor, 'text');

    // A REAL click, dispatched through the browser's input pipeline, reaches
    // the button's handler on the fixed pane.
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x: fixed.cx, y: fixed.cy, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
    }
    for (let i = 0; i < 40 && await evalJs('window.__clicks') === 0; i++) {
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.equal(await evalJs('window.__clicks'), 1, 'the dispatched click landed on the button');
    ws.close();
  } finally {
    // Chrome keeps writing its profile for a moment after the signal, so the
    // folder is removed only once it has exited, and with retries.
    const exited = chrome.exitCode !== null ? Promise.resolve() : new Promise((r) => chrome.once('exit', r));
    chrome.kill();
    await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))]);
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

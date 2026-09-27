'use strict';

/* 0.5.3 bug 22: after an app restart, a restored agent's terminal was blank
 * and stayed blank until a keystroke. Scroll and click did nothing because
 * there was nothing on screen to scroll or click.
 *
 * The first frame a TUI paints after a restore lands before the renderer's
 * pooled terminal subscribes (App.tsx pre warms terminals only after the whole
 * restore batch answers), and node-pty keeps no scrollback. The renderer's
 * recovery for that gap is `pty:redraw`, which asks the TUI for a fresh frame.
 * It did so with a SAME SIZE resize, and a same size TIOCSWINSZ delivers no
 * SIGWINCH: measured 0 signals in the app and 0 here on de9e70aa. The TUI was
 * never told anything, so it never repainted.
 *
 * This drives the real PtyManager against a real terminal whose child reports
 * every SIGWINCH it receives, with the size it saw. */

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { PtyManager } = loadTs('src/main/pty.ts');

const POSIX = process.platform !== 'win32';

function waitFor(read, pattern, ms) {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const out = read();
      if (pattern.test(out) || Date.now() - started > ms) return resolve(out);
      setTimeout(tick, 25);
    };
    tick();
  });
}

// The child loops forever, so it is killed in `finally`: a failing assertion
// must not leave a live pty holding the runner open (a hang is not a red).
test('redraw delivers SIGWINCH to the child and leaves the grid where it was', { skip: !POSIX, timeout: 15_000 }, async () => {
  const mgr = new PtyManager();
  const id = 'redraw-winch';
  const res = mgr.spawn({
    id,
    cwd: process.cwd(),
    command: '/bin/sh',
    args: ['-c', 'trap \'echo "WINCH $(stty size)"\' WINCH; echo READY; while :; do sleep 0.05; done'],
    cols: 80,
    rows: 24
  });
  assert.equal(res.ok, true, `spawn failed: ${res.error}`);
  try {
    await waitFor(() => mgr.tail(id), /READY/, 3000);
    assert.match(mgr.tail(id), /READY/, 'the child never armed its trap');

    const before = (mgr.tail(id).match(/WINCH/g) ?? []).length;
    const r = await mgr.redraw(id);
    assert.equal(r.ok, true, `redraw refused: ${r.error}`);

    // Wait for the LAST report to show the original grid: the redraw may deliver
    // one or two signals, and the one that matters is the one that ends at 24x80.
    const out = await waitFor(() => mgr.tail(id), /WINCH 24 80/, 2000);
    const delivered = (out.match(/WINCH/g) ?? []).length - before;
    assert.ok(delivered >= 1, `redraw delivered no SIGWINCH: the TUI was never asked for a frame (tail: ${JSON.stringify(out.slice(-200))})`);
    const last = out.match(/WINCH (\d+) (\d+)/g)?.pop();
    assert.equal(last, 'WINCH 24 80', `the grid must end where it started, got ${last}`);
  } finally {
    mgr.kill(id);
  }
});

test('redraw of a pty that is gone says so instead of throwing', async () => {
  const mgr = new PtyManager();
  const r = await mgr.redraw('nope');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /^no pty:/);
});

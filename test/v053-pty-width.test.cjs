'use strict';

/* 0.5.3, founder 24 Sep: Claude Code drew its rules, input box and status at
 * about 70% of the pane. The pty had 100 columns (the spawn placeholder) in a
 * pane the xterm had fitted to 136. How: the pane is measured before its
 * process exists (a restored orchestrator row mounts while his spawn is still
 * provisioning; a new agent's screen opens before the spawn answers; a restart
 * respawns under the same id). `pty:resize` then answered "no pty" and forgot,
 * the spawn took the placeholder, and the renderer never asked again because
 * ITS grid had not moved.
 *
 * Now main keeps the last grid the renderer asked for, per id, and a spawn
 * under that id starts there; the renderer sends its first real fit whether
 * or not the xterm grid moved. Driven against the real PtyManager and a real
 * child that reports its terminal size. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { PtyManager } = loadTs('src/main/pty.ts');
const POSIX = process.platform !== 'win32';
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function waitFor(get, pattern, ms) {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const out = get();
      if (pattern.test(out) || Date.now() - started > ms) return resolve(out);
      setTimeout(tick, 25);
    };
    tick();
  });
}

// The child prints its size once and then idles, so it is killed in `finally`.
// Waits are generous: under the parallel suite a first node-pty spawn can take
// over ten seconds to come up, and a slow pass must not read as a red.
const SIZE_CHILD = ['-c', 'echo "SIZE $(stty size)"; while :; do sleep 0.05; done'];
// The same, reporting again on every SIGWINCH.
const WINCH_CHILD = ['-c', 'trap \'echo "SIZE $(stty size)"\' WINCH; echo "SIZE $(stty size)"; while :; do sleep 0.05; done'];

test('1. a resize that arrives before the spawn is kept, and the spawn starts at that grid', { skip: !POSIX, timeout: 60_000 }, async () => {
  const mgr = new PtyManager();
  const id = 'width-before-spawn';
  const early = mgr.resize(id, 136, 40);
  assert.deepEqual(early, { ok: true, pending: true }, 'the ask is remembered, not refused');
  assert.deepEqual(mgr.wantedGrid(id), { cols: 136, rows: 40 });
  // The placeholder every spawn site passes today.
  const res = mgr.spawn({ id, cwd: process.cwd(), command: '/bin/sh', args: SIZE_CHILD, cols: 100, rows: 30 });
  assert.equal(res.ok, true, `spawn failed: ${res.error}`);
  try {
    const out = await waitFor(() => mgr.tail(id), /SIZE \d+ \d+/, 10_000);
    assert.match(out, /SIZE 40 136/, `the child saw the pane's grid, not the placeholder: ${out}`);
  } finally {
    mgr.kill(id);
  }
});

test('2. a respawn under the same id (restart) starts at the last measured grid, and a live resize still lands', { skip: !POSIX, timeout: 60_000 }, async () => {
  const mgr = new PtyManager();
  const id = 'width-restart';
  let res = mgr.spawn({ id, cwd: process.cwd(), command: '/bin/sh', args: SIZE_CHILD, cols: 80, rows: 24 });
  assert.equal(res.ok, true, res.error);
  try {
    await waitFor(() => mgr.tail(id), /SIZE 24 80/, 10_000);
    assert.deepEqual(mgr.resize(id, 120, 36), { ok: true }, 'a live pty is resized at once');
    mgr.kill(id);
    // The pane did not move while the process was dead, so nothing was re-sent.
    res = mgr.spawn({ id, cwd: process.cwd(), command: '/bin/sh', args: SIZE_CHILD, cols: 100, rows: 30 });
    assert.equal(res.ok, true, res.error);
    const out = await waitFor(() => mgr.tail(id), /SIZE \d+ \d+/, 10_000);
    assert.match(out, /SIZE 36 120/, `the restart kept the pane's grid: ${out}`);
  } finally {
    mgr.kill(id);
  }
});

test('2b. a resize that lands inside the attach redraw is kept, not put back to the old grid', { skip: !POSIX, timeout: 60_000 }, async () => {
  // The founder's case: the pty at the placeholder, the attach asks for a
  // redraw, and the view's first fit arrives during the redraw's 80 ms wait.
  const mgr = new PtyManager();
  const id = 'width-redraw-race';
  const res = mgr.spawn({ id, cwd: process.cwd(), command: '/bin/sh', args: WINCH_CHILD, cols: 100, rows: 30 });
  assert.equal(res.ok, true, res.error);
  try {
    await waitFor(() => mgr.tail(id), /SIZE 30 100/, 10_000);
    const redraw = mgr.redraw(id);
    await new Promise((r) => setTimeout(r, 30));
    assert.deepEqual(mgr.resize(id, 160, 37), { ok: true });
    assert.deepEqual(await redraw, { ok: true });
    await new Promise((r) => setTimeout(r, 300));
    const out = await waitFor(() => mgr.tail(id), /SIZE 37 160/, 10_000);
    const reports = out.match(/SIZE \d+ \d+/g) ?? [];
    assert.equal(reports[reports.length - 1], 'SIZE 37 160', `the pane's grid is the last word: ${reports.join(', ')}`);
  } finally {
    mgr.kill(id);
  }
});

test('3. a grid no pane can have is dropped; an unmeasured id keeps the caller\'s size', () => {
  const mgr = new PtyManager();
  for (const [c, r] of [[0, 0], [NaN, 24], [80, -1], [1, 1], [80.5, 24]]) {
    assert.equal(mgr.resize('width-bad', c, r).ok, false, `${c}x${r} refused`);
  }
  assert.equal(mgr.wantedGrid('width-bad'), null, 'and never remembered');
  assert.deepEqual(mgr.gridFor({ id: 'width-none', cols: 90, rows: 28 }), { cols: 90, rows: 28 });
  assert.deepEqual(mgr.gridFor({ id: 'width-none' }), { cols: 100, rows: 30 }, 'the placeholder when nobody said');
  // FitAddon's answer for an unsized host is 2 by 1; a hidden one gives NaN.
  assert.equal(mgr.resize('width-tiny', 2, 1).ok, false, 'a 2 by 1 grid is a measuring accident');
});

test('4. the renderer sends its first real fit even when the xterm grid did not move', () => {
  const view = read('src/renderer/src/components/PtyTerminalView.tsx');
  assert.match(view, /if \(!initialFitDone \|\| entry\.term\.cols !== before\.cols \|\| entry\.term\.rows !== before\.rows\) \{\s*window\.cth\.resizePty\(ptyId, entry\.term\.cols, entry\.term\.rows\);/, 'the first fit always reaches the pty');
  assert.match(view, /if \(!container\.clientWidth \|\| !container\.clientHeight\) return;/, 'never from an unsized host');
  // The zoom effect used to fit whatever host it had, sized or not.
  assert.match(view, /const host = hostRef\.current;\s*if \(!host \|\| !host\.clientWidth \|\| !host\.clientHeight\) return;\s*try \{\s*entry\.fit\.fit\(\);\s*window\.cth\.resizePty\(ptyId, entry\.term\.cols, entry\.term\.rows\);/, 'the zoom refit only from a sized host');
  const main = read('src/main/index.ts');
  assert.match(main, /ipcMain\.handle\('pty:resize', \(_evt, id: string, cols: number, rows: number\) => \{[\s\S]*?return ptyManager\.resize\(id, cols, rows\);/, 'the door is unchanged');
  const pty = read('src/main/pty.ts');
  assert.match(pty, /const grid = this\.gridFor\(opts\);\s*const proc = pty\.spawn\(file, spawnArgs, \{\s*name: 'xterm-256color',\s*cols: grid\.cols,\s*rows: grid\.rows,/, 'every spawn starts at the remembered grid');
});

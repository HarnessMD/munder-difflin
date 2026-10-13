'use strict';
/**
 * Regression test for the restart-terminal data loss (bug #14).
 *
 * The bug: restartWithModel's resume path (CommandCenterPanel.tsx) ran
 * disposeTerminal+acquireTerminal BEFORE the spawnPty call that can still fail,
 * then threw on `!res.ok` (spawn refused — cwd gone, CLI missing) and on a
 * refused resume (`res.resumed !== true`, the main process's requireResume
 * early-return). Both throws land AFTER the destroy: the catch only writes a
 * restart-error banner, so the pool kept the fresh EMPTY xterm — the old one's
 * scrollback is unrecoverable (node-pty keeps none; terminalPool.ts exists
 * precisely because of that) — and the agent's action label stayed stuck at
 * "recreating terminal…" with no correction. One failed "Restart & Continue"
 * erased the pane the button exists to redraw.
 *
 * The fix reorders: the kill/reset still run pre-spawn (a killed process is
 * already the goal, and the fresh-session path only soft-resets), but the
 * destroy/recreate/generation-bump of the resume path now runs after the two
 * throws — i.e. only when the replacement process was actually accepted. The
 * spawn answer beats the CLI's first frame, so startup output cannot be missed,
 * and the remount's attach re-requests a PTY redraw for anything it raced.
 *
 * HOW THIS TEST WORKS (deterministic, no network, no real PTY spawns): plain
 * node drives the repo's own Electron binary (the quit-sweep protocol) running
 * test/fixtures/bug-14-main.cjs, which boots a hidden window and executes
 * test/fixtures/bug-14.renderer.js inside it. The payload mounts the REAL
 * CommandCenterPanel + terminalPool + zustand store (loaded through a TS/TSX
 * transpile loader) against a scripted `window.cth` bridge, seeds live-looking
 * scrollback into the pooled xterms, and clicks "restart & continue" on three
 * agents:
 *
 *   A  spawnPty answers {ok:false,…}               → the `!res.ok` throw
 *   B  spawnPty answers {ok:true}, no `resumed`    → the refused-resume throw
 *   C  spawnPty answers {ok:true, resumed:true}    → success CONTROL
 *
 * The assertions then require, for the failures (A, B): the pool entry NOT
 * swapped, the scrollback intact, and the action label never set to
 * 'recreating terminal…' — while the success control (C) must still replace the
 * terminal and bump the generation, only ever after the spawn answer.
 *
 * Electron-only (the bug lives in the renderer's terminal pool), so elsewhere
 * this exits 0 after a smoke check — same convention as
 * test/quit-sweep.electron.test.cjs. Run: node --test test/restart-terminal-preserve.test.cjs
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');

if (process.platform !== 'win32' || !fs.existsSync(path.join(REPO, 'node_modules', 'electron'))) {
  console.log('  ok  (restart-terminal-preserve needs the repo\'s Electron binary; skipping elsewhere)');
  process.exit(0);
}

// From plain Node (not inside Electron), the electron package exports the path
// to the Electron executable.
const electronBin = require(path.join(REPO, 'node_modules', 'electron'));
const FIXTURE = path.join(__dirname, 'fixtures', 'bug-14-main.cjs');
// A throwaway blank page in tmp — the fixture only needs a file:// origin with
// a writable localStorage, never a repo artifact.
const BLANK_HTML = path.join(os.tmpdir(), `bug14-blank-${process.pid}.html`);
const RESULT = path.join(os.tmpdir(), `bug14-result-${process.pid}-${Date.now()}.json`);

/** Minimal check harness (bug-7 house style). */
const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, error: e });
  }
}
function assertCond(cond, msg) { if (!cond) throw new Error(msg); }

async function runElectron() {
  return new Promise((resolve) => {
    const env = Object.assign({}, process.env);
    delete env.ELECTRON_RUN_AS_NODE; // we want the BROWSER binary
    const args = [FIXTURE, `--result-file=${RESULT}`, `--repo=${REPO}`, `--blank=${BLANK_HTML}`];
    const child = spawn(electronBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      windowsHide: true
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    const killHard = setTimeout(() => {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
        } else {
          child.kill('SIGKILL');
        }
      } catch { /* already gone */ }
      resolve({ code: 'TIMEOUT', out, err: err + '\n[driver] killed after 120s' });
    }, 120_000);
    child.on('exit', (code) => {
      clearTimeout(killHard);
      resolve({ code, out, err });
    });
  });
}

function readResult() {
  try { return JSON.parse(fs.readFileSync(RESULT, 'utf8')); } catch { return null; }
}

test('a failed Restart & Continue keeps the pooled terminal, scrollback and label', async () => {
  fs.writeFileSync(BLANK_HTML, '<!doctype html><html><body><div id="root"></div></body></html>');
  try { fs.rmSync(RESULT, { force: true }); } catch { /* fresh */ }

  const run = await runElectron();
  const res = readResult();

  const dump = () => `electron exit: ${run.code}\n--- stdout ---\n${run.out.slice(-4000)}`
    + `\n--- stderr ---\n${run.err.slice(-4000)}`;

  assert.ok(res, `result file missing — the fixture never completed\n${dump()}`);
  assert.ok(!res.error, `harness error (not a bug assertion): ${res.error}\n${dump()}`);

  const S = res.scenarios || {};
  const A = S.A_spawnFailed || {};
  const B = S.B_resumeRefused || {};
  const C = S.C_restartOk || {};

  // ── controls (prove the click really reached restartWithModel) ──────────────
  check('CONTROL: the click reached restartWithModel (killPty → spawnPty, requireResume)', () => {
    assertCond(typeof A.callOrder === 'string' && A.callOrder.length > 0,
      'no call order recorded for scenario A: ' + JSON.stringify(A).slice(0, 400));
    assertCond(/killPty/.test(A.callOrder) && /spawnPty/.test(A.callOrder),
      'expected killPty and spawnPty in the recorded order, got: ' + A.callOrder);
    const spawnIdx = A.callOrder.indexOf('spawnPty');
    const killIdx = A.callOrder.indexOf('killPty');
    assertCond(killIdx !== -1 && spawnIdx > killIdx,
      'spawnPty must follow killPty, got: ' + A.callOrder);
    assertCond(/requireResume/.test(JSON.stringify(res.calls)), 'spawnPty was not called with requireResume');
  });

  check('CONTROL: scenario A hit the `!res.ok` throw — the restart error banner was set', () => {
    assertCond(/cwd does not exist/i.test(res.bodyText || ''),
      'the restart error banner (cwd does not exist…) is not rendered in the panel; body snippet: '
      + res.bodyText.slice(0, 400));
  });

  check('CONTROL: scenario B hit the refused-resume throw — its banner was set', () => {
    assertCond(/Resume was refused/i.test(res.bodyText || ''),
      'the refused-resume banner is not rendered in the panel; body snippet: ' + res.bodyText.slice(0, 400));
  });

  // ── the regression ──────────────────────────────────────────────────────────
  check('A failed restart must NOT replace the pooled terminal entry', () => {
    assertCond(A.entrySwapped === false,
      'the terminalPool entry WAS swapped before the failure was known: disposeTerminal+acquireTerminal '
      + 'ran before spawnPty could answer, so the throws left the fresh empty entry in place and the '
      + 'old xterm (with its scrollback) destroyed. Order: ' + A.callOrder);
  });

  check('the agent\'s scrollback must survive a failed "Restart & Continue"', () => {
    assertCond(/IMPORTANT SCROLLBACK A1/.test((A.bufferBefore || []).join('\n')),
      'scrollback seed missing BEFORE the click — test setup broken: ' + JSON.stringify(A.bufferBefore));
    assertCond(/IMPORTANT SCROLLBACK A1/.test((A.bufferAfter || []).join('\n')),
      'the scrollback was destroyed by the FAILED restart: the pooled xterm now reads '
      + JSON.stringify(A.bufferAfter) + ' — disposeTerminal tore down the old xterm whose buffer '
      + 'node-pty cannot restore, and acquireTerminal planted a blank one.');
  });

  check('the action label must not be left stuck at "recreating terminal…" after the failure', () => {
    assertCond(A.action !== 'recreating terminal…',
      'after the failed restart the action still reads "recreating terminal…" — the destroy ran '
      + 'before the spawn answer and the catch only writes restartErrors, never correcting it');
    assertCond(A.actionAfterExtraSettle !== 'recreating terminal…',
      'the label is still stuck after an extra settle (it never self-corrects): '
      + JSON.stringify(A.actionAfterExtraSettle));
  });

  check('a REFUSED resume (ok:true, no `resumed`) must also leave the terminal and label intact', () => {
    assertCond(B.entrySwapped === false,
      'the pool entry WAS swapped on the refused resume; entrySwapped=' + B.entrySwapped);
    assertCond(/IMPORTANT SCROLLBACK B1/.test((B.bufferAfter || []).join('\n')),
      'scenario B lost its scrollback to the refused resume: ' + JSON.stringify(B.bufferAfter));
    assertCond(B.action !== 'recreating terminal…',
      'the stuck label was set in scenario B too: ' + JSON.stringify(B.action));
  });

  // ── the success control: the reorder must not break the recreate ────────────
  check('a SUCCESSFUL restart still recreates the terminal (only after the spawn answer)', () => {
    assertCond(C.entrySwapped === true,
      'the flow must still replace the terminal when the replacement is accepted; entrySwapped='
      + C.entrySwapped + ', order: ' + C.callOrder);
    assertCond(C.terminalGeneration === 1, 'success control should bump terminalGeneration, got: ' + C.terminalGeneration);
    assertCond(C.action === 'continuing…',
      'success control should land on the "continuing…" action, got: ' + JSON.stringify(C.action));
    const order = C.callOrder || '';
    const spawnIdx = order.indexOf('spawnPty');
    const disposeIdx = order.indexOf('disposeTerminal');
    assertCond(disposeIdx !== -1 && spawnIdx !== -1 && disposeIdx > spawnIdx,
      'the successful restart must destroy the old terminal only AFTER the spawn answer; order: ' + order);
  });

  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name}`);
  if (failed.length > 0) {
    console.log('\nfailing assertions:');
    for (const f of failed) console.log(` - ${f.name}\n     ${f.error.message}`);
  }
  assert.equal(failed.length, 0, `${failed.length}/${results.length} restart-terminal assertions failed`
    + (failed.length ? `:\n - ${failed.map((f) => f.error.message).join('\n - ')}` : ''));
});

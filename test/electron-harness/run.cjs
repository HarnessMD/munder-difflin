'use strict';

/**
 * Node-side driver: run one scenario in a real Electron renderer and return its
 * result, so a `node --test` file can assert on rendered evidence.
 *
 * The child is a real Electron process, so it is slower than the rest of the suite
 * by roughly a second per scenario. That is the price of the evidence and is why
 * these live in their own test file rather than being sprinkled through the
 * existing ones.
 */
const { spawn } = require('node:child_process');
const { existsSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

/**
 * THE SANDBOX LIFECYCLE IS OWNED HERE, BY THE PARENT.
 *
 * Each Electron child gets a throwaway `userData`. The child used to create it and delete
 * it on the way out inside a swallowed `catch`; on Windows its own Chromium handles were
 * still open, the delete failed, nothing said so, and about 1,400 directories / 14 GB built
 * up in %TEMP%. So: the parent creates the directory, the child is TOLD where it is, and the
 * parent removes it once the child has EXITED - retrying for a bounded time, because
 * Windows releases a dead process's handles a moment after `close`.
 *
 * AND IT FAILS LOUDLY. A sandbox that still exists after the retries REJECTS the run with
 * the path in the message. A silent leftover is the defect; a red test is the fix working.
 */
const SANDBOX_REMOVE_ATTEMPTS = 25;
const SANDBOX_REMOVE_WAIT_MS = 200;

/** @param {string} prefix @param {string} [root] */
function createSandbox(prefix, root = tmpdir()) {
  return mkdtempSync(join(root, prefix));
}

/** Remove `dir`, retrying for a bounded time. Resolves when it is GONE; rejects, naming it,
 *  when it is not. @param {string} dir */
async function removeSandbox(dir, attempts = SANDBOX_REMOVE_ATTEMPTS, waitMs = SANDBOX_REMOVE_WAIT_MS) {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    try { rmSync(dir, { recursive: true, force: true }); } catch (e) { last = e; }
    if (!existsSync(dir)) return;
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw new Error(`HARNESS SANDBOX LEAK: could not remove ${dir} after ${attempts} attempts over ${attempts * waitMs} ms`
    + `${last ? ` (${last.code || last.message})` : ''}. It is still on disk - remove it by hand, and find out what is holding it.`);
}

/** Settle a child's result ONLY after its sandbox is gone; a leak outranks a result. */
function settleAfterCleanup(sandbox, resolve, reject, settle) {
  removeSandbox(sandbox).then(settle, (leak) => reject(leak));
}

const MARKER = '__HARNESS_RESULT__';

/**
 * @param {string} scenario absolute path to a `.ts` scenario entry
 * @param {{width?:number,height?:number,timeoutMs?:number}} [opts]
 * @returns {Promise<any>} whatever the scenario reported
 */
function runScenario(scenario, opts = {}) {
  const electron = require('electron');
  const root = join(__dirname, '..', '..');
  const sandbox = createSandbox('l0-harness-', opts.tempRoot);
  const args = [
    join(__dirname, 'harness-main.cjs'),
    '--sandbox', sandbox,
    '--scenario', scenario,
    '--width', String(opts.width ?? 1280),
    '--height', String(opts.height ?? 800),
    '--timeout', String(opts.timeoutMs ?? 30_000)
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(electron, args, {
      cwd: root,
      env: {
        ...process.env,
        // Never let a harness run inherit the isolated-Dev identity or attach to
        // the app's own sockets: this is a throwaway process, not an instance.
        MUNDER_DEV: '',
        ELECTRON_ENABLE_LOGGING: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });

    child.on('error', (e) => settleAfterCleanup(sandbox, resolve, reject, () => reject(e)));
    child.on('close', (code) => settleAfterCleanup(sandbox, resolve, reject, () => {
      const at = out.lastIndexOf(MARKER);
      if (at < 0) {
        reject(new Error(
          `harness produced no result (exit ${code}).\n--- stdout ---\n${out}\n--- stderr ---\n${err}`
        ));
        return;
      }
      const line = out.slice(at + MARKER.length).split('\n')[0];
      try {
        resolve(JSON.parse(line));
      } catch (e) {
        reject(new Error(`harness result was not JSON: ${line}\n${e}`));
      }
    }));
  });
}

/**
 * Run the A15 IPC-ordering experiment.
 *
 * THE COMMITTED TEST RUNS SMALL COUNTS ON PURPOSE. The published figure is 7,060
 * trials, and re-earning it takes minutes that the ordinary suite must not spend on
 * every run. What belongs in the suite is that the INSTRUMENT still works and still
 * finds no counterexample; the full figure is one command away and is named in the
 * test, so the expensive run stays reproducible instead of becoming a quotation.
 *
 *   node test/electron-harness/run-ipc-order.cjs --phase1 2000 --phase2 5000 --phase3 60
 */
function runIpcOrder(opts = {}) {
  const electron = require('electron');
  const root = join(__dirname, '..', '..');
  const sandbox = createSandbox('l0-ipcorder-', opts.tempRoot);
  const args = [
    join(__dirname, 'ipc-order-main.cjs'),
    '--sandbox', sandbox,
    '--phase1', String(opts.phase1 ?? 200),
    '--phase2', String(opts.phase2 ?? 500),
    '--phase3', String(opts.phase3 ?? 5)
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(electron, args, {
      cwd: root,
      env: { ...process.env, MUNDER_DEV: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', (e) => settleAfterCleanup(sandbox, resolve, reject, () => reject(e)));
    child.on('close', (code) => settleAfterCleanup(sandbox, resolve, reject, () => {
      const at = out.lastIndexOf(MARKER);
      if (at < 0) {
        reject(new Error(
          `ipc-order produced no result (exit ${code}).\n--- stdout ---\n${out}\n--- stderr ---\n${err}`
        ));
        return;
      }
      try { resolve(JSON.parse(out.slice(at + MARKER.length).split('\n')[0])); }
      catch (e) { reject(e); }
    }));
  });
}

module.exports = { runScenario, runIpcOrder, createSandbox, removeSandbox };

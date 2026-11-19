'use strict';

// A window's view that dies is reloaded, at most 3 times in any 60 s, and the reloaded page opens
// on the live project with a one shot "restored" notice. A clean exit, or a view that dies while
// the app quits, is left alone. With the view down, closing the primary window or quitting asks
// natively, so the app can still be quit.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const V = loadTs('src/shared/viewRecovery.ts');
const ts = require(path.join(ROOT, 'node_modules/typescript'));

/** One top level function of a TS file, as JS. */
function fnJs(file, name) {
  const src = read(file);
  const at = src.indexOf(`function ${name}(`);
  assert.ok(at >= 0, `${name} in ${file}`);
  const end = src.indexOf('\n}\n', at);
  return ts.transpileModule(src.slice(at, end + 2), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

test('the reload limit: 3 in any 60 s, the 4th stays down; a reload is allowed again once the spell passes', () => {
  assert.equal(V.MAX_RELOADS, 3);
  assert.equal(V.RELOAD_SPELL_MS, 60_000);
  const p = new V.ReloadPolicy();
  assert.deepEqual(p.next(0), { reload: true, streak: 1 });
  assert.deepEqual(p.next(10_000), { reload: true, streak: 2 });
  assert.deepEqual(p.next(59_000), { reload: true, streak: 3 });
  assert.deepEqual(p.next(59_500), { reload: false, streak: 3 });
  // a refused death is not counted: the window of the first reload decides
  assert.deepEqual(p.next(60_000), { reload: true, streak: 3 }, 'the first reload left the spell at exactly 60 s');
  assert.deepEqual(p.next(60_001), { reload: false, streak: 3 });
  assert.deepEqual(p.next(200_000), { reload: true, streak: 1 });
  // each window has its own policy
  const other = new V.ReloadPolicy();
  assert.deepEqual(other.next(59_500), { reload: true, streak: 1 });
});

function viewGoneHarness({ allowQuit = false, winGone = false, wcGone = false } = {}) {
  const logs = [];
  const notices = new Map();
  const reloads = [];
  const wc = { id: 7, isDestroyed: () => wcGone, reload: () => reloads.push(Date.now()) };
  const win = { isDestroyed: () => winGone };
  const run = new Function('hive', 'recoveryNotices', 'allowQuit', `${fnJs('src/main/index.ts', 'onViewGone')}; return onViewGone;`);
  const onViewGone = run({ appendLog: (e) => logs.push(e) }, notices, allowQuit);
  return { onViewGone, logs, notices, reloads, wc, win };
}

test('a view that dies is reloaded with a notice; a clean exit, a quit, or a gone window is left alone', () => {
  const h = viewGoneHarness();
  const policy = new V.ReloadPolicy();
  h.onViewGone(h.win, h.wc, { reason: 'crashed', exitCode: 11 }, false, policy);
  assert.equal(h.reloads.length, 1);
  const n = h.notices.get(7);
  assert.equal(n.reason, 'crashed');
  assert.equal(n.streak, 1);
  assert.equal(typeof n.at, 'number');
  assert.deepEqual(h.logs.map((l) => [l.kind, l.reason, l.reload, l.streak, l.floor]), [['render-process-gone', 'crashed', true, 1, false]]);
  h.onViewGone(h.win, h.wc, { reason: 'oom', exitCode: 0 }, true, policy);
  h.onViewGone(h.win, h.wc, { reason: 'killed', exitCode: 9 }, true, policy);
  h.notices.clear();
  h.onViewGone(h.win, h.wc, { reason: 'crashed', exitCode: 11 }, true, policy);
  assert.equal(h.reloads.length, 3, 'the fourth death in 60 s is not reloaded');
  assert.equal(h.notices.size, 0, 'and leaves no notice');
  assert.equal(h.logs.at(-1).reload, false, 'the refusal is logged');

  for (const [opts, details] of [[{}, { reason: 'clean-exit', exitCode: 0 }], [{ allowQuit: true }, { reason: 'crashed', exitCode: 11 }], [{ winGone: true }, { reason: 'crashed' }], [{ wcGone: true }, { reason: 'crashed' }]]) {
    const g = viewGoneHarness(opts);
    g.onViewGone(g.win, g.wc, details, false, new V.ReloadPolicy());
    assert.equal(g.reloads.length, 0, JSON.stringify(opts));
    assert.equal(g.notices.size, 0);
    assert.equal(g.logs.length, 0, 'nothing logged for a death that is left alone');
  }
});

test('wiring: each window has its own policy, the notice is one shot, the root reload goes through main', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /const reloads = new ReloadPolicy\(\);\s*\n\s*wc\.on\('render-process-gone', \(_e, details\) => onViewGone\(win, wc, details, isFloor, reloads\)\);/);
  assert.match(main, /ipcMain\.on\('window:recoveringSync', \(evt\) => \{ evt\.returnValue = recoveryNotices\.has\(evt\.sender\.id\); \}\);/);
  const take = main.slice(main.indexOf("ipcMain.handle('window:takeRecoveryNotice'"));
  assert.match(take.slice(0, 300), /recoveryNotices\.get\(evt\.sender\.id\) \?\? null;\s*\n\s*recoveryNotices\.delete\(evt\.sender\.id\);\s*\n\s*return n;/);
  const after = main.slice(main.indexOf("ipcMain.on('window:reloadAfterError'"));
  assert.match(after.slice(0, 400), /recoveryNotices\.set\(wc\.id, \{ at: Date\.now\(\), reason: 'render-error', streak: 1 \}\);[\s\S]*wc\.reload\(\);/);
  const pre = read('src/preload/index.ts');
  assert.match(pre, /recovering: \(\(\): boolean => \{ try \{ return ipcRenderer\.sendSync\('window:recoveringSync'\) === true; \} catch \{ return false; \} \}\)\(\),/);
  assert.match(pre, /takeRecoveryNotice: \(\): Promise<RecoveryNotice \| null> => ipcRenderer\.invoke\('window:takeRecoveryNotice'\)/);
  assert.match(pre, /reloadAfterError: \(\): void => ipcRenderer\.send\('window:reloadAfterError'\)/);
});

test('with the view down, closing the primary window and quitting ask natively, before the page modal', () => {
  const main = read('src/main/index.ts');
  const close = main.slice(main.indexOf('// Primary window: existing app-wide quit warning (renderer modal).'));
  assert.match(close.slice(0, 400), /if \(count === 0\) return;\s*\n\s*e\.preventDefault\(\);\s*\n\s*if \(viewGone\(wc\)\) \{ askQuitNatively\(win, count\); return; \}/);
  const quit = main.slice(main.indexOf("app.on('before-quit', (e) => {"));
  assert.match(quit.slice(0, 400), /if \(allowQuit\) return;[\s\S]*e\.preventDefault\(\);\s*\n\s*if \(mainWindow\) \{\s*\n\s*if \(viewGone\(mainWindow\.webContents\)\) \{ askQuitNatively\(mainWindow, count\); return; \}/);
  const gone = fnJs('src/main/index.ts', 'viewGone');
  const viewGone = new Function(`${gone}; return viewGone;`)();
  assert.equal(viewGone({ isDestroyed: () => false, isCrashed: () => false }), false);
  assert.equal(viewGone({ isDestroyed: () => false, isCrashed: () => true }), true);
  assert.equal(viewGone({ isDestroyed: () => true, isCrashed: () => false }), true);
  assert.equal(viewGone({ isDestroyed: () => { throw new Error('gone'); } }), true, 'a webContents that throws counts as down');

  const ask = fnJs('src/main/index.ts', 'askQuitNatively');
  for (const [choice, quits] of [[0, true], [1, false]]) {
    const calls = [];
    const dialog = { showMessageBoxSync: (...a) => { calls.push(a.length === 2 ? a[1] : a[0]); return choice; } };
    const fn = new Function('dialog', 'closingTime', 'teardownAndQuit', 'abortPendingRestart', `${ask}; return askQuitNatively;`)(
      dialog, { cancel: () => calls.push('cancel-closing') }, () => calls.push('quit'), () => calls.push('abort-restart'));
    fn({ isDestroyed: () => false }, 2);
    assert.equal(calls[0].cancelId, 1, 'Cancel is the safe default');
    assert.equal(calls[0].defaultId, 1);
    assert.match(calls[0].message, /2 running terminals will be stopped/);
    assert.deepEqual(calls.slice(1), quits ? ['cancel-closing', 'quit'] : ['abort-restart']);
  }
});

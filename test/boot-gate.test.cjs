'use strict';

/**
 * 0.5.2, card v052-startup-restore-loading (founder, 8 Sep 2026): after an
 * update the app opened over agents still spinning up, with no loading
 * state, and the release drop drawn on top. The drop was offered off
 * app-ready; it must be offered off restore-complete, and the blur that
 * covers the restore must always have a way out.
 *
 * The first half drives the pure decision (@shared/bootGate). The second
 * pins the wiring: both update surfaces wait on the gate, App marks the
 * reconcile, and both skins mount the overlay with the skip.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { bootSettled, bootRemaining, bootSkippable, BOOT_WAIT_CAP_MS, BOOT_SKIP_AFTER_MS } = loadTs('src/shared/bootGate.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const base = { onboardingComplete: true, reconciled: true, reconnecting: 0, restorable: 0, autoRestore: 'idle', landed: 0, elapsedMs: 1000, skipped: false };

test('a machine with nothing to restore is settled at once; so is one still in onboarding', () => {
  assert.equal(bootSettled(base), true);
  assert.equal(bootSettled({ ...base, onboardingComplete: false, reconciled: false, reconnecting: 4 }), true);
});

test('the gate waits for the reconcile, for every reattach, and for the automatic restore', () => {
  assert.equal(bootSettled({ ...base, reconciled: false }), false, 'before the reconcile the restorable list means nothing');
  assert.equal(bootSettled({ ...base, reconnecting: 2 }), false, 'sessions still reattaching');
  assert.equal(bootSettled({ ...base, restorable: 3, autoRestore: 'idle' }), false, 'the gap before the automatic restore fires: where the drop used to land');
  assert.equal(bootSettled({ ...base, restorable: 3, autoRestore: 'running' }), false, 'respawning');
  assert.equal(bootSettled({ ...base, restorable: 3, autoRestore: 'done' }), true, 'over, failures included: they show on the floor');
});

test('the way out: the cap, and the skip', () => {
  const stuck = { ...base, reconnecting: 1, restorable: 2, autoRestore: 'running' };
  assert.equal(bootSettled(stuck), false);
  assert.equal(bootSettled({ ...stuck, elapsedMs: BOOT_WAIT_CAP_MS }), true, 'the cap lifts it however stuck');
  assert.equal(bootSettled({ ...stuck, skipped: true }), true, 'the person may leave');
  assert.equal(bootSkippable({ ...stuck, elapsedMs: BOOT_SKIP_AFTER_MS - 1 }), false, 'a quick restore never shows the skip');
  assert.equal(bootSkippable({ ...stuck, elapsedMs: BOOT_SKIP_AFTER_MS }), true);
  assert.equal(bootSkippable({ ...base, elapsedMs: BOOT_SKIP_AFTER_MS }), false, 'nothing to skip once settled');
  assert.ok(BOOT_WAIT_CAP_MS >= 10_000 && BOOT_WAIT_CAP_MS <= 30_000, 'a cap of seconds, not minutes');
  // Thirty, counted from the shell (god, 9 Sep 2026): the founder's own
  // eleven-agent restore answers over about fifteen seconds after it fires.
  assert.equal(BOOT_WAIT_CAP_MS, 30_000);
});

test('the line in the middle counts what is still on its way back', () => {
  assert.equal(bootRemaining({ ...base, reconnecting: 2, restorable: 3, autoRestore: 'idle' }), 5);
  assert.equal(bootRemaining({ ...base, reconnecting: 1, restorable: 3, autoRestore: 'done' }), 1);
});

test('the line moves as spawns answer, not only when the batch ends', () => {
  // Found with MD_RESTORE_SLOW_MS: the restore is one Promise.all and the roster
  // fills after it, so `restorable` sat on 5 for the whole batch and the line
  // dropped 5 -> 0 in one step. Each answered spawn now takes one off.
  const run = { ...base, restorable: 5, autoRestore: 'running' };
  assert.equal(bootRemaining({ ...run, landed: 0 }), 5);
  assert.equal(bootRemaining({ ...run, landed: 2 }), 3);
  assert.equal(bootRemaining({ ...run, landed: 5 }), 0);
  assert.equal(bootRemaining({ ...run, landed: 9 }), 0, 'never negative, whatever the counter says');
  assert.equal(bootRemaining({ ...run, reconnecting: 1, landed: 4 }), 2, 'reattaches still count on top');
  assert.equal(bootRemaining({ ...run, autoRestore: 'done', landed: 1 }), 0, 'over is over, the counter does not matter');
  assert.equal(bootSettled({ ...run, landed: 5 }), false, 'the line reaching zero is not the batch being over: the roster fills after it');
});

test('the restore driver counts each answered spawn and the gate reads it', () => {
  const drv = read('src/renderer/src/hooks/useRestoreTeam.ts');
  assert.match(drv, /export function restoreLanded\(\): number/);
  const batch = drv.slice(drv.indexOf('await Promise.all('), drv.indexOf('// Add in the ORIGINAL roster order'));
  assert.equal((batch.match(/landed\+\+;\n\s+emit\(\);/g) ?? []).length, 3, 'restored, refused, and thrown each land, and each wakes the gate');
  assert.ok(!/alreadyLive\+\+;\n\s+useStore\.getState\(\)\.removeRestorableAgent\(a\.id\);\n\s+landed\+\+/.test(batch), 'an already-live agent leaves the restorable list itself and is not taken off twice');
  assert.match(drv, /restoring = true;\n\s+landed = 0;/, 'a run starts from zero');
  const gate = read('src/renderer/src/store/bootGate.ts');
  assert.match(gate, /landed: restoreLanded\(\),/, 'the store side feeds the counter into the pure decision');
});

test('the release drop is offered off restore-complete, on both surfaces', () => {
  const toast = read('src/renderer/src/components/UpdateToast.tsx');
  const pro = read('src/renderer/src/components/pro/ProTransients.tsx');
  for (const [name, src] of [['UpdateToast', toast], ['ProTransients', pro]]) {
    assert.match(src, /const bootSettled = useBootSettled\(\);/, `${name} reads the gate`);
    const gate = src.indexOf('if (!bootSettled) return null;');
    const drop = src.indexOf('<ReleaseDrop');
    assert.ok(gate > 0 && gate < drop, `${name} returns before the drop while the boot is open`);
    // The status is kept, not discarded: the drop still opens once settled.
    assert.ok(!/if \(!bootSettled\) \{ setStatus\(null\)/.test(src), `${name} must not throw the status away`);
  }
});

test('App marks the reconcile, on the answer and on the failure, so the gate can never wait forever for it', () => {
  const app = read('src/renderer/src/App.tsx');
  const start = app.indexOf('window.cth.listPtys().then(');
  const reconcile = app.slice(start, app.indexOf('return () => { cancelled = true; };', start));
  assert.equal((reconcile.match(/markReconciled\(\);/g) ?? []).length, 2, 'once after reconcileWithLivePtys, once in the catch');
  assert.ok(reconcile.indexOf('reconcileWithLivePtys') < reconcile.indexOf('markReconciled();'), 'the list is final before the gate counts it');
});

test('both skins mount the overlay with the skip, and it covers the whole window, blurred', () => {
  const app = read('src/renderer/src/App.tsx');
  const shell = read('src/renderer/src/components/pro/ProShell.tsx');
  const boot = read('src/renderer/src/components/pro/ProBooting.tsx');
  // Undefined while the config has not loaded: `config?.onboardingComplete
  // === true` fed false on the first frame and the gate latched settled
  // (test/boot-gate-wiring.test.cjs renders the real module to hold this).
  assert.match(app, /const boot = useBootRecovery\(config \? config\.onboardingComplete === true : undefined\);/);
  assert.doesNotMatch(app, /useBootRecovery\(config\?\.onboardingComplete === true\)/);
  // The clock starts at the shell, below every door.
  const clock = app.indexOf('<BootClock />');
  assert.ok(clock > 0, 'App mounts the clock');
  for (const door of ['<Paywall ', '<ProOnboarding ', '<HivePicker ']) {
    assert.ok(app.indexOf(door) > 0 && app.indexOf(door) < clock, `${door.trim()} returns before the clock starts`);
  }
  assert.match(app, /skin !== 'professional' && boot\.recovering && \(/);
  assert.match(app, /<ProBooting remaining=\{boot\.remaining\} skippable=\{boot\.skippable\} onSkip=\{boot\.skip\} card=\{<ClassicBootCard/);
  // The pixel card lives in App, not under pro/: the fence (pro-fence.test.cjs) keeps it there.
  assert.doesNotMatch(boot, /PixelPanel|PixelButton/);
  assert.match(shell, /useBootRecovery\(config \? config\.onboardingComplete === true : undefined\)/);
  assert.match(boot, /export function useBootRecovery\(onboardingComplete: boolean \| undefined\): BootRecovery/, 'no default: true or false for "not loaded" is the defect');
  assert.match(boot, /position: 'fixed', inset: 0, zIndex: 500/, 'the whole window, under the drop (600) which is gated anyway');
  assert.match(boot, /backdropFilter: 'blur\(9px\)'/);
  assert.match(boot, /skippable && onSkip && \(/);
  for (const l of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    assert.equal(typeof j.pro.boot.skip, 'string', `${l} has the skip label`);
    assert.doesNotMatch(j.pro.boot.skip, /—|–/, 'no dashes');
  }
});

'use strict';

/**
 * 0.5.3, founder on rc.4: "The dismiss all is not working as expected. It is
 * doing it one by one and then stopping midway. Instead, it should be doing it
 * all at once."
 *
 * Dismiss all used to await the single Dismiss per card, in series, and each
 * one rewrote tasks.json and made a git commit in main. Now every patch is
 * built first and sent in ONE call (hive:patchTasks) that main applies in one
 * write and one commit. Tests 1 to 4 RUN the bulk step and main's bulk patch;
 * test 5 pins the wiring.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { dismissAllAtOnce } = loadTs('src/renderer/src/components/askMeBulk.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const patchFor = (t) => (t.open ? { humanQA: [{ q: t.id, dismissedAt: 'now' }] } : null);

test('1. every question goes in ONE call, not one call per card', async () => {
  const calls = [];
  const r = await dismissAllAtOnce([{ id: 'a', open: true }, { id: 'b', open: true }, { id: 'c', open: true }], patchFor, async (patches) => {
    calls.push(patches.map((p) => p.id));
    return { ok: true, applied: patches.map((p) => p.id) };
  });
  assert.deepEqual(calls, [['a', 'b', 'c']], 'one send carrying all three');
  assert.deepEqual(r, { dismissed: 3, failed: 0 });
});

test('2. one card that fails does not stop the rest, and the count is right', async () => {
  // Main skips a card that is gone and patches the others in the same write.
  const r = await dismissAllAtOnce([{ id: 'a', open: true }, { id: 'b', open: true }, { id: 'c', open: true }], patchFor,
    async (patches) => ({ ok: true, applied: patches.map((p) => p.id).filter((id) => id !== 'b') }));
  assert.deepEqual(r, { dismissed: 2, failed: 1 });
});

test('3. a refused or thrown send fails them all and never throws; a card with nothing open is not counted', async () => {
  const three = [{ id: 'a', open: true }, { id: 'b', open: true }, { id: 'c', open: false }];
  assert.deepEqual(await dismissAllAtOnce(three, patchFor, async () => ({ ok: false, applied: ['a'] })), { dismissed: 0, failed: 2 });
  assert.deepEqual(await dismissAllAtOnce(three, patchFor, async () => { throw new Error('ipc gone'); }), { dismissed: 0, failed: 2 });
  let sent = false;
  assert.deepEqual(await dismissAllAtOnce([{ id: 'x', open: false }], patchFor, async () => { sent = true; return { ok: true }; }), { dismissed: 0, failed: 0 });
  assert.equal(sent, false, 'nothing to dismiss, nothing sent');
});

test('4. main: every named card patched in ONE pass, a missing one skipped, nothing else touched', () => {
  const { applyTaskPatches } = loadTs('src/shared/taskLedger.ts');
  const ledger = [{ id: 'a', title: 'A', humanQA: [] }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }];
  const { next, applied } = applyTaskPatches(ledger, [
    { id: 'a', patch: { humanQA: [{ q: 'x', dismissedAt: 'now' }] } },
    { id: 'gone', patch: { status: 'done' } },
    { id: 'c', patch: { status: 'done' } }
  ]);
  assert.deepEqual(applied, ['a', 'c']);
  assert.deepEqual(next.map((t) => t.id), ['a', 'b', 'c'], 'no card added or lost, order kept');
  assert.equal(next[0].title, 'A', 'unpatched fields kept');
  assert.equal(next[0].humanQA[0].dismissedAt, 'now');
  assert.equal(next[2].status, 'done');
  assert.equal(ledger[0].humanQA.length, 0, 'the input is not mutated');
  // hive.patchTasks: one read, one applyTaskPatches, one write (so one commit).
  const hive = read('src/main/hive.ts');
  const fn = hive.slice(hive.indexOf('  patchTasks(patches'), hive.indexOf('  /** Delete only the named card'));
  assert.match(fn, /const \{ next, applied \} = applyTaskPatches\(tasks, (patches|keyed)\);\n\s*if \(applied\.length\) this\.writeTasks\(next\);/, 'keyed: ids resolved through ticket-key aliases first');
  assert.equal((fn.match(/writeTasks\(/g) || []).length, 1);
});

test('5. wiring: one IPC, the single Dismiss\'s patch, the list clears at once, a toast reports failures', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /ipcMain\.handle\('hive:patchTasks'/);
  assert.match(main, /applied: hive\.patchTasks\(valid\)/);
  assert.match(read('src/preload/index.ts'), /hivePatchTasks: \(\n[^]*?ipcRenderer\.invoke\('hive:patchTasks', patches\)/);
  const actions = read('src/renderer/src/components/askMeActions.ts');
  assert.match(actions, /dismissAllAtOnce\(tasks, \(task\) => dismissalPatch\(task, now\), \(patches\) => window\.cth\.hivePatchTasks\(patches\)\)/);
  assert.match(actions, /const patch = dismissalPatch\(task\);/, 'the single Dismiss writes the same patch');
  assert.doesNotMatch(actions, /dismissEach/, 'no series loop left');
  const card = read('src/renderer/src/components/pro/AskMeCard.tsx');
  assert.match(card, /setGone\(new Set\(tasks\.map\(\(x\) => x\.id\)\)\);\n\s*const r = await dismissAllOpenQuestions/, 'the list clears before the call returns');
  assert.match(card, /if \(r\.failed > 0\) proToast\(t\('pro\.askMe\.dismissAllFailed'/);
  const modal = read('src/renderer/src/components/pro/AskMeModal.tsx');
  assert.match(modal, /waitsOnHuman\(x\) && !gone\.has\(x\.id\)/);
  for (const lng of ['en', 'zh-CN', 'ar']) {
    const a = JSON.parse(read(`src/renderer/src/i18n/locales/${lng}.json`)).pro.askMe;
    for (const k of ['dismissedAll', 'dismissAllFailed']) {
      assert.ok(a[k] && a[k].includes('{{count}}'), `${lng} ${k}`);
      assert.doesNotMatch(a[k], /[–—-]/, `${lng} ${k} has no dashes`);
    }
    assert.ok(a.dismissAllFailed.includes('{{total}}'), `${lng} names the total`);
  }
});

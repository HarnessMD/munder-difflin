'use strict';

/**
 * 0.5.2, card v052-check-again-when-downloaded (founder, 8 Sep 2026): with an
 * update downloaded, "Restart to update" replaced the only button and the
 * person could not check again. The decision is pure (@shared/updateState
 * secondaryUpdateAction) and both update surfaces read it through the one
 * hook, so the two skins cannot disagree.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { secondaryUpdateAction, reduceStatus } = loadTs('src/shared/updateState.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('the downloaded state, and only it, carries a second action: check', () => {
  assert.equal(secondaryUpdateAction({ state: 'downloaded', version: '0.5.2' }), 'check');
  for (const s of [
    null, { state: 'idle' }, { state: 'checking' }, { state: 'not-available' },
    { state: 'available', version: '0.5.2' }, { state: 'downloading', version: '0.5.2', percent: 40 },
    { state: 'available-manual', version: '0.5.2', url: 'x' }, { state: 'error', message: 'x' }, { state: 'just-updated', version: '0.5.1' },
  ]) {
    assert.equal(secondaryUpdateAction(s), null, JSON.stringify(s));
  }
});

test('a check that finds the same release leaves the downloaded state where it is: the staged file is kept', () => {
  // The renderer's reducer keeps the higher state while the same version is
  // re-checked; electron-updater keeps the cached file for the same reason.
  const downloaded = { state: 'downloaded', version: '0.5.2' };
  assert.equal(reduceStatus(downloaded, { state: 'checking' }).state, 'downloaded');
  assert.equal(reduceStatus(downloaded, { state: 'available', version: '0.5.2' }).state, 'downloaded');
  assert.equal(reduceStatus(downloaded, { state: 'downloaded', version: '0.5.2' }).state, 'downloaded');
  // A newer release found by the check supersedes it.
  assert.equal(reduceStatus(downloaded, { state: 'available', version: '0.5.3' }).version, '0.5.3');
});

test('both surfaces offer Check again beside Restart in that state, off the shared hook', () => {
  const hook = read('src/renderer/src/components/updates/useUpdatesSection.ts');
  assert.match(hook, /const secondary = secondaryUpdateAction\(status\);/);
  assert.match(hook, /checkAgain: secondary === 'check' \? checkAgain : null/);
  assert.match(hook, /await window\.cth\.updateCheckNow\(\)/, 'the same check as everywhere else, no cache clearing of ours');
  assert.doesNotMatch(hook, /clearCache|rm\(|unlink/, 'no hand-rolled cache clearing');
  for (const surface of ['src/renderer/src/components/UpdatesSection.tsx', 'src/renderer/src/components/pro/UpdatesScreen.tsx']) {
    const src = read(surface);
    assert.match(src, /checkAgain, checkAgainLabel \} = useUpdatesSection\(\)/, `${surface} reads the second action`);
    const second = src.indexOf('{checkAgain && (');
    const primary = src.indexOf('{view.button && (');
    assert.ok(second > 0 && second < primary, `${surface}: the quieter button sits before the primary one`);
    // The same rule that keeps the primary button whole beside prose.
    const block = src.slice(second, primary);
    assert.match(block, /style=\{\{ flexShrink: 0 \}\}/);
    assert.match(block, /disabled=\{busy \|\| view\.busy\}/);
  }
});

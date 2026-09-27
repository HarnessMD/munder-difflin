'use strict';

/**
 * MD_RESTORE_SLOW_MS (0.5.2, card v052-restore-loading-test-command): the
 * dev switch that staggers every spawn in a run so the boot restore can be
 * watched. Two things are pinned: the decision itself, which is pure, and
 * that main asks it immediately before the FINAL real spawn with a counter
 * that climbs and the packaged flag that kills it, never on the installer
 * branch.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { slowSpawnDelayMs } = loadTs('src/shared/restoreSlow.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('the Nth spawn waits N times the value, and only in a dev build', () => {
  assert.equal(slowSpawnDelayMs('2000', 3, false), 6000);
  assert.equal(slowSpawnDelayMs('2000', 1, false), 2000);
  assert.equal(slowSpawnDelayMs(' 1000 ', 2, false), 2000, 'whitespace around the number is not a reason to ignore it');
  // Packaged: dead whatever the environment says, the same rule as MD_NO_GOD.
  assert.equal(slowSpawnDelayMs('2000', 3, true), 0);
});

test('anything that is not a positive integer of milliseconds means no wait', () => {
  for (const bad of [undefined, '', 'garbage', '0', '-5', '1.5', '2e3', 'NaN', '1000ms']) {
    assert.equal(slowSpawnDelayMs(bad, 1, false), 0, JSON.stringify(bad));
  }
  // A sequence number below one, or not an integer, is not a spawn.
  assert.equal(slowSpawnDelayMs('2000', 0, false), 0);
  assert.equal(slowSpawnDelayMs('2000', -1, false), 0);
  assert.equal(slowSpawnDelayMs('2000', 1.5, false), 0);
});

test('main asks immediately before the final real spawn, with a climbing counter and the packaged flag', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /^let restoreSlowSeq = 0;$/m, 'one counter for the run');
  const call = main.indexOf("slowSpawnDelayMs(process.env.MD_RESTORE_SLOW_MS, ++restoreSlowSeq, app.isPackaged)");
  assert.ok(call > 0, 'the call is not there in that exact form');
  const core = main.slice(main.indexOf('async function spawnAgentCore('));
  const installer = core.indexOf('shellScript: buildMissingCliScript(');
  const finalSpawn = core.indexOf('const res = ptyManager.spawn(opts, owner);');
  const wait = core.indexOf('slowSpawnDelayMs(process.env.MD_RESTORE_SLOW_MS');
  assert.ok(installer > 0 && finalSpawn > installer, 'the installer branch precedes the final spawn');
  assert.ok(wait > installer && wait < finalSpawn, 'the wait must sit after the installer branch and before the final spawn');
  assert.ok(core.slice(wait, finalSpawn).includes('await new Promise((r) => setTimeout(r, wait))'), 'the wait is a real wait');
  assert.equal(main.split('slowSpawnDelayMs(').length - 1, 1, 'exactly one call site');
});

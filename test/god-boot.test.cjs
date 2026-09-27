'use strict';

/* The orchestrator's boot, and a terminal listing that FAILED. Found in review
 * beside 6bef7c9b: the same fault, `listPtys().catch(() => [])`, was still live
 * in the boot effect. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { godRunning, refusedBecauseAlive } = loadTs('src/shared/godBoot.ts');

test('a listing that failed is UNKNOWN, never "not running"', () => {
  assert.equal(godRunning({ answered: false, ids: [] }, 'pty-god'), 'unknown');
  assert.equal(godRunning({ answered: true, ids: [] }, 'pty-god'), 'no');
  assert.equal(godRunning({ answered: true, ids: ['a', 'pty-god'] }, 'pty-god'), 'yes');
});

test('main refusing a duplicate is proof he is alive', () => {
  assert.equal(refusedBecauseAlive('pty already exists for id pty-god'), true);
  assert.equal(refusedBecauseAlive('cwd not found'), false);
  assert.equal(refusedBecauseAlive(undefined), false);
});

test('the refusal text is still what main says', () => {
  const pty = fs.readFileSync(path.join(__dirname, '..', 'src/main/pty.ts'), 'utf8');
  assert.match(pty, /error: `pty already exists for id \$\{opts\.id\}`/);
});

test('HAS IT RUN: the boot asks the rule, never removes his row before a spawn succeeded, and reads a refusal as alive', () => {
  const useHive = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/hooks/useHive.ts'), 'utf8');
  const boot = useHive.slice(useHive.indexOf("useStore.getState().setGodStatus('booting');"), useHive.indexOf('// Kick Michael off once his TUI is up.'));
  assert.ok(boot.length > 0, 'boot effect not found');
  assert.doesNotMatch(boot, /listPtys\(\)\.catch\(\(\) => \[\]\)/, 'a failed listing is still an empty floor');
  assert.match(boot, /godRunning\(/);
  const spawn = boot.indexOf('window.cth.spawnPty(');
  const remove = boot.indexOf("removeAgent(GOD_ID, { keepQueue: true })");
  assert.ok(spawn > 0 && remove > spawn, 'his row is removed BEFORE the spawn is known to have worked');
  assert.match(boot, /refusedBecauseAlive\(res\.error\)/);
});

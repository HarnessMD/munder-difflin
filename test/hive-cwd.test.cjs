'use strict';

/**
 * Ingestion guarantee: whatever the user types, the hive registry stores an
 * ABSOLUTE cwd. A `~/…` entry used to land verbatim and then read
 * "not absolute" / cwdValid:false forever, so the agent could never spawn.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { HiveManager } = loadTs('src/main/hive.ts');

function tmpHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'md-hive-cwd-'));
}

function registryOf(home) {
  return JSON.parse(fs.readFileSync(path.join(home, 'hive', 'registry.json'), 'utf8'));
}

test('a "~/…" cwd is expanded before it reaches the registry', async (t) => {
  const home = tmpHome();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);

  await hive.ensureAgent({ id: 'a1', name: 'A', provider: 'claude', cwd: '~' });

  const agent = registryOf(home).agents.a1;
  assert.equal(agent.cwd, os.homedir(), 'the registry must hold the resolved path');
  assert.equal(path.isAbsolute(agent.cwd), true);
  // The home folder itself is not a working folder an agent may have (agentFolder.ts),
  // so the expanded "~" is marked invalid for that reason, not for being unexpanded.
  assert.equal(agent.cwdValid, false);
  assert.equal(hive.cwdValidity(agent.cwd).issue, 'home');
});

test('an absolute cwd is unchanged', async (t) => {
  const home = tmpHome();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);

  await hive.ensureAgent({ id: 'a1', name: 'A', provider: 'claude', cwd: home });

  const agent = registryOf(home).agents.a1;
  assert.equal(agent.cwd, home);
  assert.equal(agent.cwdValid, true);
});

test('cwdValidity repairs a "~" left in an older registry', async (t) => {
  const home = tmpHome();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);

  // Entries written before the fix are still on disk; reading one must not
  // report it as permanently invalid.
  // "~" is expanded: an unexpanded one would read as not-absolute. The home folder
  // itself is refused as a working folder, so the issue names that instead.
  assert.equal(hive.cwdValidity('~').issue, 'home');
  assert.equal(hive.cwdValidity(path.join('~', 'definitely-not-here-xyz')).valid, false,
    'expansion must not paper over a genuinely missing directory');
  assert.equal(hive.cwdValidity('relative/path').valid, false,
    'a relative path is still an error, not silently resolved');
});

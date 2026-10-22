/**
 * Auto mode keeps the OS sandbox ON.
 *
 * The app used to spawn every auto-mode agent with no sandbox at all (codex
 * `--dangerously-bypass-approvals-and-sandbox`; Claude with its opt-in sandbox
 * never enabled) for one reason: a hive worker writes to its agent folder under
 * <harnessHome>/hive/agents/<id>/, which sits OUTSIDE the project cwd. That is a
 * path-layout problem. Fix: keep the sandbox and declare those paths writable —
 * codex via `--add-dir`, Claude via `sandbox.filesystem.allowWrite` plus
 * `permissions.additionalDirectories` in the per-session settings file.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const electron = require.resolve('electron');
require.cache[electron] = {
  id: electron, filename: electron, loaded: true,
  exports: { Notification: class { show() {} static isSupported() { return false; } } }
};

const { HiveManager, resolveDirectoryGrants } = loadTs('src/main/hive.ts');
const { autoModeFlagForProvider } = loadTs('src/shared/agentProvider.ts');

function tmpHome() { return fs.mkdtempSync(path.join(os.tmpdir(), 'md-sandbox-')); }

test('codex auto mode is workspace-write with approvals off, never the full bypass', () => {
  const flag = autoModeFlagForProvider('codex');
  assert.equal(flag, '-a never -s workspace-write');
  assert.ok(!flag.includes('dangerously'));
});

test('a Claude agent gets a native sandbox that still allows its agent dir and the hive root', async () => {
  const home = tmpHome();
  const hive = new HiveManager(() => home);
  const palace = path.join(home, 'palace');
  const inj = await hive.ensureAgent(
    { id: 'jim-1', name: 'Jim', provider: 'claude', cwd: home },
    { extraWritableDirs: [palace] }
  );
  const i = inj.args.indexOf('--settings');
  assert.ok(i >= 0, 'claude spawn carries --settings');
  const settings = JSON.parse(fs.readFileSync(inj.args[i + 1], 'utf8'));
  const agentDir = path.join(home, 'hive', 'agents', 'jim-1');
  const hiveRoot = path.join(home, 'hive');
  assert.equal(settings.sandbox.enabled, true);
  assert.notEqual(settings.sandbox.failIfUnavailable, true, 'Windows must still spawn');
  assert.deepEqual(settings.sandbox.filesystem.allowWrite, [agentDir, hiveRoot, palace]);
  // Both layers, or the agent deadlocks: Edit/Write allowed but `mv … .done/` denied.
  assert.deepEqual(settings.permissions.additionalDirectories, settings.sandbox.filesystem.allowWrite);
  // No bypass of the sandbox anywhere in the injected args.
  assert.ok(!inj.args.some((a) => /dangerously/.test(a)));
});

test('a Copilot project outside Hive gets only scoped Hive directory grants before its prompt', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md sandbox-'));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'md project-'));
  const palace = path.join(home, 'palace with spaces');
  fs.mkdirSync(palace);
  const hive = new HiveManager(() => home);
  const inj = await hive.ensureAgent(
    { id: 'pam-1', name: 'Pam', provider: 'copilot', cwd: project },
    { extraWritableDirs: [palace, path.join(home, 'hive')] }
  );
  const agentDir = path.join(home, 'hive', 'agents', 'pam-1');
  const hiveRoot = path.join(home, 'hive');
  const promptAt = inj.args.indexOf('-p');

  assert.ok(!project.startsWith(hiveRoot), 'fixture keeps cwd outside Hive');
  assert.deepEqual(inj.args.slice(0, promptAt), [
    `--add-dir=${agentDir}`,
    `--add-dir=${hiveRoot}`,
    `--add-dir=${palace}`
  ]);
  assert.equal(inj.args[promptAt + 1].includes('HIVE PROTOCOL'), true, 'prompt contract is unchanged');
  assert.equal(inj.args.filter((arg) => arg === `--add-dir=${hiveRoot}`).length, 1, 'duplicate root is removed');
  assert.ok(!inj.args.includes('--allow-all-paths'), 'never widens access to every path');
});

test('directory grant resolution is platform-aware and optional failures never poison core grants', () => {
  const access = { flag: '--add-dir', valueStyle: 'equals', requiresExisting: true };
  const result = resolveDirectoryGrants(
    access,
    {
      required: ['C:\\Hive\\Agents\\pam-1\\', 'C:\\Hive', 'relative\\core', null],
      optional: [
        'c:\\hive',
        'C:\\Shared Space\\.\\memory',
        'C:\\missing',
        'C:\\file.txt',
        'C:\\denied',
        'relative\\extra'
      ]
    },
    {
      platform: 'win32',
      inspectDirectory(dir) {
        if (dir === 'C:\\Shared Space\\memory') return 'directory';
        if (dir === 'C:\\file.txt') return 'not-directory';
        if (dir === 'C:\\denied') throw Object.assign(new Error('denied'), { code: 'EACCES' });
        return 'missing';
      }
    }
  );

  assert.deepEqual(result.grants, [
    'C:\\Hive\\Agents\\pam-1',
    'C:\\Hive',
    'C:\\Shared Space\\memory'
  ]);
  assert.deepEqual(result.skipped.map(({ reason }) => reason), [
    'relative',
    'invalid',
    'missing',
    'not-directory',
    'inaccessible',
    'relative'
  ]);
});

test('Codex directory argv remains the existing separate-token form', async () => {
  const home = tmpHome();
  const hive = new HiveManager(() => home);
  hive.installCodexHooks = () => path.join(home, 'isolated-codex-home');
  const inj = await hive.ensureAgent({ id: 'dwight-1', name: 'Dwight', provider: 'codex', cwd: home });
  const agentDir = path.join(home, 'hive', 'agents', 'dwight-1');
  const hiveRoot = path.join(home, 'hive');
  assert.deepEqual(inj.args.slice(0, 5), [
    '--dangerously-bypass-hook-trust',
    '--add-dir', agentDir,
    '--add-dir', hiveRoot
  ]);
});

'use strict';

/*
 * An agent's working folder is the first of its writable folders. The disk root, the
 * home folder, or a folder that holds the app's data folder (config.json, the secrets)
 * would put the app's own settings inside the agent's reach. Claude's sandbox carves the
 * data folder back out (userDataDeny); Codex's workspace-write cannot. So the roster
 * marks such a folder invalid, spawn refuses it (spawnAgent.ts), and a Codex agent never
 * gets a writable root that holds the data folder.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const electron = require.resolve('electron');
require.cache[electron] = { id: electron, filename: electron, loaded: true,
  exports: { Notification: class { show() {} static isSupported() { return false; } } } };

const { setOfficePaths } = loadTs('src/core/paths.ts');
const { unsafeAgentFolder, holdsAppData } = loadTs('src/main/agentFolder.ts');
const { HiveManager } = loadTs('src/main/hive.ts');

/** A scratch "home" whose Library holds the app's data folder, as on macOS. */
function scratch() {
  const top = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-folder-')));
  const home = path.join(top, 'home');
  const appData = path.join(home, 'Library', 'Application Support', 'Munder Difflin');
  const project = path.join(home, 'dev', 'project');
  fs.mkdirSync(appData, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(appData, 'config.json'), '{}');
  setOfficePaths({ userData: () => appData, bundled: (n) => path.join(top, n) });
  return { top, home, appData, project, harness: path.join(top, 'harness') };
}

test('the root, the home folder and a folder holding the app data folder are unsafe', () => {
  const s = scratch();
  assert.equal(unsafeAgentFolder(path.parse(s.top).root, s.home, s.appData), 'root');
  assert.equal(unsafeAgentFolder(s.home, s.home, s.appData), 'home');
  assert.equal(unsafeAgentFolder(path.join(s.home, 'Library'), s.home, s.appData), 'contains-app-data');
  assert.equal(unsafeAgentFolder(s.appData, s.home, s.appData), 'contains-app-data');
  assert.equal(unsafeAgentFolder(s.project, s.home, s.appData), null);
  // A link to the home folder is the home folder.
  const link = path.join(s.top, 'link-to-home');
  fs.symlinkSync(s.home, link);
  assert.equal(unsafeAgentFolder(link, s.home, s.appData), 'home');
  assert.equal(holdsAppData(path.join(s.home, 'Library'), s.appData), true);
  assert.equal(holdsAppData(s.project, s.appData), false);
});

test('the roster marks an agent in a folder above the app data folder invalid', async () => {
  const s = scratch();
  const hive = new HiveManager(() => s.harness);
  const above = path.join(s.home, 'Library');
  await hive.ensureAgent({ id: 'claude-1', name: 'C', provider: 'claude', cwd: above }, {});
  await hive.ensureAgent({ id: 'claude-2', name: 'D', provider: 'claude', cwd: s.project }, {});
  const reg = JSON.parse(fs.readFileSync(path.join(s.harness, 'hive', 'registry.json'), 'utf8'));
  assert.equal(reg.agents['claude-1'].cwdValid, false);
  assert.equal(reg.agents['claude-2'].cwdValid, true);
});

test('a Claude agent above the app data folder has the data folder denied to it', async () => {
  const s = scratch();
  const hive = new HiveManager(() => s.harness);
  const inj = await hive.ensureAgent({ id: 'claude-1', name: 'C', provider: 'claude', cwd: path.join(s.home, 'Library') }, {});
  const settings = JSON.parse(fs.readFileSync(inj.args[inj.args.indexOf('--settings') + 1], 'utf8'));
  // Claude Code merges Edit deny rules into its sandbox, so this holds for Bash too.
  assert.ok(settings.permissions.deny.includes(`Edit(/${s.appData}/**)`), JSON.stringify(settings.permissions.deny));
});

test('a Codex agent never gets a writable root that holds the app data folder', async () => {
  const s = scratch();
  const hive = new HiveManager(() => s.harness);
  const above = path.join(s.home, 'Library');
  const inj = await hive.ensureAgent(
    { id: 'codex-1', name: 'X', provider: 'codex', cwd: above },
    { args: ['-a', 'never', '-s', 'workspace-write'], extraWritableDirs: [s.home] }
  );
  const toml = fs.readFileSync(path.join(inj.env.CODEX_HOME, 'config.toml'), 'utf8');
  const line = toml.split('\n').find((l) => l.startsWith('sandbox_workspace_write.writable_roots')) ?? '';
  const roots = line ? JSON.parse(line.slice(line.indexOf('=') + 1)) : [];
  const addDirs = inj.args.flatMap((a, i) => (inj.args[i - 1] === '--add-dir' ? [a] : []));
  const all = [...roots, ...addDirs];
  assert.ok(all.length > 0, 'expected the agent and hive folders as writable roots');
  for (const r of all) assert.equal(holdsAppData(r, s.appData), false, `writable root ${r} holds the app data folder`);
  assert.ok(!all.includes(above) && !all.includes(s.home));
  // The agent's own folder is still writable.
  assert.ok(all.includes(path.join(s.harness, 'hive', 'agents', 'codex-1')));
});

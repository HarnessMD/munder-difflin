'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');
const { HiveManager } = loadTs('src/main/hive.ts');
const git = loadTs('src/main/git.ts');
const providers = loadTs('src/shared/agentProvider.ts');
const worktreeFile = path.join(__dirname, '../src/main/agentWorktree.ts');
const restore = fs.existsSync(worktreeFile) ? loadTs('src/main/agentWorktree.ts') : {};
const source = ts.createSourceFile('index.ts', fs.readFileSync(path.join(__dirname, '../src/main/index.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
const fn = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'spawnAgentCore');
assert.ok(fn);
const output = ts.transpileModule(fn.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

async function fixture(t) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md restore origin ')));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  t.mock.method(os, 'homedir', () => home);
  const origin = path.join(home, 'repo with spaces');
  fs.mkdirSync(origin);
  const run = (args, cwd = origin) => cp.execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  run(['init', '-b', 'main']);
  run(['config', 'user.name', 'Fixture']);
  run(['config', 'user.email', 'fixture@example.invalid']);
  fs.writeFileSync(path.join(origin, 'tracked.txt'), 'initial\n');
  run(['add', 'tracked.txt']); run(['commit', '-m', 'initial']);
  let hive = new HiveManager(() => home);
  let maps;
  function boot() {
    maps = { worktreePaths: new Map(), worktreeOrigins: new Map(), ptyToAgent: new Map() };
    const deps = {
      ...fs, ...path, ...git, ...providers, ...restore, ...maps, hive,
      expandTilde: p => p,
      analytics: { track() {} }, readConfig: () => ({ harnessHome: home }),
      spawnFailReason: () => 'cwd_invalid',
      ptyManager: { isCommandAvailable: () => true, spawn: opts => fs.existsSync(opts.cwd) ? { ok: true } : { ok: false, error: `cwd does not exist: ${opts.cwd}` } },
      memory: { active: () => false, env: () => ({}) }, knowledge: { active: () => false, env: () => ({}) },
      skillsResourceDir: () => '', workerWake: { noteSpawn() {} }, syncKeepAwake() {},
      linkWorktreeDeps: async () => ({ ok: true }), console: { error() {}, warn() {}, log() {} }
    };
    return new Function(...Object.keys(deps), `${output}\nreturn spawnAgentCore;`)(...Object.values(deps));
  }
  let spawn = boot();
  const hire = () => spawn({ id: 'pty-jim', cwd: origin, command: 'fixture-cli', provider: 'custom', isolate: true, hive: { id: 'jim', name: 'Jim', cwd: origin, provider: 'custom' } }, null);
  const restart = async (cwd, fields = {}) => spawn({ id: 'pty-jim', cwd, command: 'fixture-cli', provider: 'custom', isolate: false, resume: true, hive: { id: 'jim', name: 'Jim', cwd, provider: 'custom', ...fields } }, null);
  return { home, origin, run, hire, restart, get hive() { return hive; }, get maps() { return maps; }, reboot() { hive = new HiveManager(() => home); spawn = boot(); } };
}

test('isolated hire persists its origin in the registry and spawn result', async t => {
  const f = await fixture(t);
  const res = await f.hire(); assert.equal(res.ok, true);
  assert.notEqual(res.cwd, f.origin);
  assert.equal(res.worktreeOrigin, f.origin);
  f.reboot();
  const saved = f.hive.registry().agents.jim;
  assert.equal(saved.worktreePath, res.cwd);
  assert.equal(saved.worktreeOrigin, f.origin);
});

test('restore after process restart reuses the exact dirty checkout and registers cleanup origin', async t => {
  const f = await fixture(t); const hired = await f.hire();
  fs.writeFileSync(path.join(hired.cwd, 'uncommitted.txt'), 'keep this work');
  f.reboot(); const res = await f.restart(hired.cwd, { worktreePath: hired.cwd, worktreeOrigin: f.origin });
  assert.equal(res.ok, true); assert.equal(res.cwd, hired.cwd);
  assert.equal(res.worktreePath, hired.cwd); assert.equal(res.worktreeOrigin, f.origin);
  assert.equal(f.maps.worktreeOrigins.get('pty-jim'), f.origin);
  assert.equal(fs.readFileSync(path.join(hired.cwd, 'uncommitted.txt'), 'utf8'), 'keep this work');
});

for (const remainder of ['missing directory', 'only .claude remains']) {
  test(`restore safely falls back to persisted origin when ${remainder}`, async t => {
    const f = await fixture(t); const hired = await f.hire();
    fs.writeFileSync(path.join(hired.cwd, 'unmerged.txt'), 'committed agent work');
    f.run(['add', 'unmerged.txt'], hired.cwd); f.run(['commit', '-m', 'unmerged agent work'], hired.cwd);
    const commit = f.run(['rev-parse', 'HEAD'], hired.cwd);
    fs.rmSync(hired.cwd, { recursive: true, force: true });
    if (remainder !== 'missing directory') { fs.mkdirSync(path.join(hired.cwd, '.claude'), { recursive: true }); fs.writeFileSync(path.join(hired.cwd, '.claude', 'keep'), 'not ours to delete'); }
    f.reboot();
    // Command Center supplies just cwd: registry metadata must be sufficient.
    const res = await f.restart(hired.cwd);
    assert.equal(res.ok, true); assert.equal(res.cwd, f.origin);
    assert.equal(res.worktreePath, undefined); assert.equal(res.worktreeOrigin, undefined);
    assert.equal(res.worktreeGone, true);
    assert.equal(f.hive.registry().agents.jim.cwdValid, true);
    assert.equal(f.hive.registry().agents.jim.worktreePath, undefined);
    assert.equal(f.maps.worktreePaths.size, 0, 'must never register the origin for worktree cleanup');
    assert.equal(f.run(['rev-parse', 'agent/jim']), commit, 'do not delete or replace the unmerged branch');
    assert.match(f.run(['worktree', 'list', '--porcelain']), /worktrees/ , 'do not prune stale entries');
    if (remainder !== 'missing directory') assert.equal(fs.readFileSync(path.join(hired.cwd, '.claude', 'keep'), 'utf8'), 'not ours to delete');
  });
}

test('roster metadata recovers an origin even when registry metadata is absent', async t => {
  const f = await fixture(t); const hired = await f.hire();
  fs.rmSync(hired.cwd, { recursive: true, force: true });
  fs.writeFileSync(path.join(f.home, 'hive', 'registry.json'), JSON.stringify({ agents: {} })); f.reboot();
  const res = await f.restart(hired.cwd, { worktreePath: hired.cwd, worktreeOrigin: f.origin });
  assert.equal(res.ok, true); assert.equal(res.cwd, f.origin);
});

test('missing legacy worktree without an origin gives an actionable error without provisioning', async t => {
  const f = await fixture(t); const dead = path.join(f.home, 'worktrees', 'legacy');
  const res = await f.restart(dead, { worktreePath: dead });
  assert.equal(res.ok, false); assert.match(res.error, /origin.*not.*saved|origin.*unknown/i);
  assert.equal(f.hive.registry().agents.jim, undefined);
});

test('an existing legacy linked worktree learns its origin without altering files', async t => {
  const f = await fixture(t); const wt = path.join(f.home, 'legacy checkout');
  f.run(['worktree', 'add', '-b', 'agent/legacy', wt]);
  const res = await f.restart(wt, { worktreePath: wt });
  assert.equal(res.ok, true); assert.equal(res.worktreeOrigin, f.origin);
  assert.equal(f.hive.registry().agents.jim.worktreeOrigin, f.origin);
});

test('missing origin fails visibly rather than retrying the dead worktree', async t => {
  const f = await fixture(t); const hired = await f.hire();
  fs.rmSync(hired.cwd, { recursive: true, force: true });
  fs.rmSync(f.origin, { recursive: true, force: true }); f.reboot();
  const res = await f.restart(hired.cwd, { worktreePath: hired.cwd, worktreeOrigin: f.origin });
  assert.equal(res.ok, false); assert.match(res.error, /origin.*unavailable/i);
});

test('an intentional cwd change is not redirected by stale registry metadata', async t => {
  const f = await fixture(t); await f.hire(); f.reboot();
  const other = path.join(f.home, 'other workspace'); fs.mkdirSync(other);
  const res = await f.restart(other);
  assert.equal(res.ok, true); assert.equal(res.cwd, other);
  assert.equal(res.worktreePath, undefined); assert.equal(res.worktreeOrigin, undefined);
  assert.equal(f.hive.registry().agents.jim.worktreePath, undefined);
});

test('a second restore after fallback uses the corrected recipe', async t => {
  const f = await fixture(t); const hired = await f.hire();
  fs.rmSync(hired.cwd, { recursive: true, force: true }); f.reboot();
  const first = await f.restart(hired.cwd);
  assert.equal(first.ok, true); f.reboot();
  const second = await f.restart(first.cwd);
  assert.equal(second.ok, true); assert.equal(second.cwd, f.origin);
  assert.equal(second.worktreePath, undefined);
});

test('a normal repository cannot be registered as a disposable linked worktree', async t => {
  const f = await fixture(t);
  const res = await f.restart(f.origin, { worktreePath: f.origin, worktreeOrigin: f.origin });
  assert.equal(res.ok, false);
  assert.equal(f.maps.worktreePaths.size, 0);
  assert.equal(f.run(['branch', '--show-current']), 'main');
});

test('Restore Team forwards roster isolation metadata and persists the resolved spawn recipe', async t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md roster restore '));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const { RosterStore } = loadTs('src/main/roster.ts');
  const roster = new RosterStore(() => home);
  const agent = { id: 'jim', name: 'Jim', command: 'fixture-cli', provider: 'custom', cwd: '/dead/checkout', worktreePath: '/dead/checkout', worktreeOrigin: '/original repo' };
  const state = { selectedId: null, agents: [], restorableAgents: [agent], addAgent(a) { this.agents.push(a); this.restorableAgents = []; } };
  const calls = [];
  const window = { cth: { gitIsRepo: async () => false, spawnPty: async opts => { calls.push(opts); return { ok: true, cwd: agent.worktreeOrigin, worktreeGone: true }; } } };
  const src = fs.readFileSync(path.join(__dirname, '../src/renderer/src/hooks/useRestoreTeam.ts'), 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  const deps = {
    react: { useEffect() {}, useSyncExternalStore: (_sub, snapshot) => snapshot() },
    '@/store/store': { useStore: { getState: () => state } },
    '@/store/config': { inferAgentProvider: providers.inferAgentProvider, tokenizeCommand: s => s.split(' ') },
    '@shared/agentRole': { roleForHiveSpawn: () => 'worker' }
  };
  new Function('require', 'exports', 'window', out)(name => { assert.ok(deps[name], name); return deps[name]; }, mod.exports, window);
  await mod.exports.useRestoreTeam().restoreTeam();
  assert.equal(calls[0].hive.worktreeOrigin, agent.worktreeOrigin);
  assert.equal(calls[0].hive.worktreePath, agent.worktreePath);
  assert.equal(state.agents[0].cwd, agent.worktreeOrigin);
  assert.equal(state.agents[0].worktreePath, undefined);
  assert.equal(state.agents[0].worktreeOrigin, undefined);
  assert.match(state.agents[0].action, /using base repo/);
  // The file store retains arbitrary durable fields, including isolation's
  // origin, through a process restart. No schema migration discards the recipe.
  roster.write({ version: 1, agents: [agent], archived: [], restorable: [], queues: {}, selectedId: null });
  assert.equal(new RosterStore(() => home).read().agents[0].worktreeOrigin, agent.worktreeOrigin);
});

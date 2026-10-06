'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const {
  codexRemoteAliasPath,
  codexRemoteEndpoint,
  codexRemoteSocketFits,
  withCodexRemoteArgs,
  planCodexLaunch,
  CODEX_REMOTE_SOCKET_MAX,
  CODEX_REMOTE_SOCKET_RELATIVE
} = loadTs('src/shared/codexRemote.ts');

test('Codex remote uses a short stable per-agent home alias', {
  skip: process.platform === 'win32' ? 'Codex remote uses Unix sockets and is disabled on Windows' : false
}, () => {
  const first = codexRemoteAliasPath('/very/long/hive/agent/.codex', 'dev-1', '/tmp');
  const again = codexRemoteAliasPath('/very/long/hive/agent/.codex', 'dev-1', '/tmp');
  const other = codexRemoteAliasPath('/very/long/hive/agent/.codex', 'dev-2', '/tmp');
  assert.equal(first, again);
  assert.notEqual(first, other);
  assert.ok(first.length < 80);
  assert.match(codexRemoteEndpoint(first), /^unix:\/\/\/tmp\//);
});

test('Auto Mode resume keeps its permissions, hive roots and prompt in a local TUI', () => {
  const args = ['resume', 'session-id', '-a', 'never', '-s', 'workspace-write',
    '--dangerously-bypass-hook-trust', '--add-dir', '/hive/agent', 'Drain the inbox'];
  const original = [...args];
  const plan = planCodexLaunch(args);
  assert.equal(plan.managedRemote, false);
  assert.match(plan.localReason, /resume/);
  assert.deepEqual(plan.args, ['--no-daemon', ...original]);
  assert.deepEqual(args, original);
});

test('fresh sandboxed launches retain --add-dir and use local execution', () => {
  for (const args of [
    ['-a', 'never', '-s', 'workspace-write', '--add-dir', '/hive', 'hello'],
    ['--add-dir=/hive', 'hello']
  ]) {
    const plan = planCodexLaunch(args);
    assert.equal(plan.managedRemote, false);
    assert.deepEqual(plan.args, ['--no-daemon', ...args]);
    assert.match(plan.localReason, /--add-dir/);
  }
});

test('fresh full-bypass launches can use remote without redundant directory grants', () => {
  for (const bypass of ['--dangerously-bypass-approvals-and-sandbox', '--yolo']) {
    const plan = planCodexLaunch([bypass, '--add-dir', '/hive', '--add-dir=/shared',
      '--dangerously-bypass-hook-trust', 'hello']);
    assert.equal(plan.managedRemote, true);
    assert.deepEqual(plan.args, [bypass, '--dangerously-bypass-hook-trust', 'hello']);
  }
});

test('compatible fresh launches and resumes retain remote support', () => {
  for (const args of [
    ['-a', 'never', '-s', 'workspace-write', 'hello'],
    ['resume', 'session-id', '--model', 'gpt-5.6-sol', 'hello'],
    ['--model', 'resume', 'hello'], // an option value is not a subcommand
    ['resume', 'session-id', '--', '--add-dir'] // literal prompt text
  ]) {
    assert.deepEqual(planCodexLaunch(args), { args, managedRemote: true });
  }
});

test('permission overrides on resume select local execution across CLI spellings', () => {
  for (const override of [
    ['--ask-for-approval=never'], ['--sandbox=workspace-write'], ['-anever'],
    ['-sworkspace-write'], ['--approve-for-me'], ['--yolo'],
    ['--profile', 'custom'], ['--permission-profile', 'custom'],
    ['-c', 'approval_policy="never"'], ['--config=sandbox_mode="workspace-write"'],
    ['-csandbox_workspace_write.writable_roots=["/hive"]'],
    ['-c=default_permissions="custom"']
  ]) {
    const args = [...override, 'resume', 'session-id'];
    assert.deepEqual(planCodexLaunch(args).args, ['--no-daemon', ...args]);
    assert.equal(planCodexLaunch(args).managedRemote, false);
  }
  assert.equal(planCodexLaunch(['fork', 'session-id', '-a', 'never']).managedRemote, false);
});

test('explicit transports are preserved without starting the managed remote daemon', () => {
  for (const args of [
    ['--no-daemon', 'resume', 'session-id', '-a', 'never'],
    ['--remote', 'wss://custom.example', 'resume', 'session-id'],
    ['--remote=unix:///custom.sock', 'hello']
  ]) {
    assert.deepEqual(planCodexLaunch(args), { args, managedRemote: false });
  }
});

test('the default alias root yields a socket within sun_path', () => {
  // The real hive home that failed with "path must be shorter than SUN_LEN".
  const realHome =
    '/Users/vyapakgoyal/Documents/HarnessAgents/hive/agents/dev2-mrxb3l43/.codex';
  const socket =
    codexRemoteAliasPath(realHome, 'dev2-mrxb3l43') + '/' + CODEX_REMOTE_SOCKET_RELATIVE;
  assert.ok(
    socket.length < CODEX_REMOTE_SOCKET_MAX,
    `socket path is ${socket.length} bytes: ${socket}`
  );
  // …and shorter than the home it replaces, which the $TMPDIR version was not.
  assert.ok(socket.length < (realHome + '/' + CODEX_REMOTE_SOCKET_RELATIVE).length);
});

test('an over-long alias root is rejected instead of failing at bind time', () => {
  const tmpdirStyle = '/var/folders/v6/9f10q5d148z7bxdzhr22xl7r0000gn/T/munder-codex';
  assert.equal(codexRemoteSocketFits(codexRemoteAliasPath('/h/.codex', 'a', tmpdirStyle)), false);
  assert.equal(codexRemoteSocketFits(codexRemoteAliasPath('/h/.codex', 'a')), true);
});

test('remote endpoint precedes both fresh and resumed Codex invocations', () => {
  const endpoint = 'unix:///tmp/munder-codex/a/app-server-control/app-server-control.sock';
  assert.deepEqual(
    withCodexRemoteArgs(['--model', 'gpt-5.6-sol', 'hello'], endpoint),
    ['--remote', endpoint, '--model', 'gpt-5.6-sol', 'hello']
  );
  assert.deepEqual(
    withCodexRemoteArgs(['resume', 'session-id', '--model', 'gpt-5.6-sol'], endpoint),
    ['--remote', endpoint, 'resume', 'session-id', '--model', 'gpt-5.6-sol']
  );
  assert.deepEqual(
    withCodexRemoteArgs(['--remote', endpoint, 'resume'], endpoint),
    ['--remote', endpoint, 'resume']
  );
});

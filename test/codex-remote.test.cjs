'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const {
  codexRemoteAliasPath,
  codexRemoteEndpoint,
  codexRemoteSocketFits,
  withCodexRemoteArgs,
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

// 0.5.3: a user's Codex worker died at launch with "Error: --add-dir is not
// supported with --remote. Configure additional workspace roots on the server."
// The hive adds --add-dir for auto mode; remote control then prepended --remote.
const { splitCodexAddDirs, codexWritableRootsToml } = loadTs('src/shared/codexRemote.ts');

test('--add-dir never sits next to --remote', () => {
  const args = ['--dangerously-bypass-hook-trust', '--add-dir', '/hive/agents/a', '--add-dir=/hive', 'resume', 'x'];
  const out = withCodexRemoteArgs(args, 'unix:///tmp/mdc/1/s.sock');
  assert.deepEqual(out, ['--remote', 'unix:///tmp/mdc/1/s.sock', '--dangerously-bypass-hook-trust', 'resume', 'x']);
  assert.deepEqual(splitCodexAddDirs(args).dirs, ['/hive/agents/a', '/hive']);
  // Already remote: the flag is still stripped.
  assert.deepEqual(withCodexRemoteArgs(['--remote', 'e', '--add-dir', '/d'], 'x'), ['--remote', 'e']);
});

test('the roots move into the worker config as writable_roots', () => {
  const top = codexWritableRootsToml('model = "o"\n[hooks]\n', ['/a', '/b "c"']);
  assert.equal(top, 'sandbox_workspace_write.writable_roots = ["/a", "/b \\"c\\""]\nmodel = "o"\n[hooks]\n');
  // An existing table gets the key under its header, never a duplicate table.
  const under = codexWritableRootsToml('[sandbox_workspace_write]\nnetwork_access = true\n', ['/a']);
  assert.equal(under, '[sandbox_workspace_write]\nwritable_roots = ["/a"]\nnetwork_access = true\n');
  assert.equal((under.match(/\[sandbox_workspace_write\]/g) || []).length, 1);
  // The user's own list is theirs: the caller keeps the local TUI.
  assert.equal(codexWritableRootsToml('[sandbox_workspace_write]\nwritable_roots = ["/x"]\n', ['/a']), null);
  assert.equal(codexWritableRootsToml('sandbox_workspace_write.writable_roots = []\n', ['/a']), null);
  assert.equal(codexWritableRootsToml('x = 1\n', []), 'x = 1\n');
});

test('main writes the roots before starting the daemon', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src/main/index.ts'), 'utf8');
  const body = src.slice(src.indexOf('async function enableCodexRemoteForSpawn'));
  const write = body.indexOf('codexWritableRootsToml(');
  const start = body.indexOf("['app-server', 'daemon', 'start']");
  assert.ok(write > 0 && start > write, 'writable_roots must be written before the daemon reads config.toml');
});

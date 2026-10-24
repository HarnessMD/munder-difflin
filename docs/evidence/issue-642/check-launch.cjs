const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require(process.cwd() + '/test/load-ts.cjs');
const codex = loadTs(process.env.CODEX_TEST_SOURCE || 'src/shared/codexRemote.ts');
test('Auto Mode resume retains permissions without remote transport', () => {
  const args = ['resume', 'session-id', '-a', 'never', '-s', 'workspace-write', '--add-dir', '/tmp/hive with spaces'];
  const endpoint = 'unix:///tmp/agent.sock';
  let launch;
  if (codex.planCodexLaunch) {
    const plan = codex.planCodexLaunch(args);
    launch = plan.managedRemote ? codex.withCodexRemoteArgs(plan.args, endpoint) : plan.args;
  } else {
    launch = codex.withCodexRemoteArgs(args, endpoint);
  }
  console.log('Codex argv:', JSON.stringify(launch));
  assert.equal(launch.includes('--remote'), false, 'Remote resume must not receive permission overrides');
  assert.ok(launch.includes('session-id'));
  assert.ok(launch.includes('never'));
  assert.ok(launch.includes('workspace-write'));
  assert.ok(launch.includes('/tmp/hive with spaces'));
});

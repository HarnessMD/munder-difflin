'use strict';

// `agent_run_ended` (0.5.1, Ryan's spec: hive/shared/v051-run-duration-spec.md).
// One event at the pty exit seam, pairing with agent_spawned. What this file
// pins, in the order it would hurt to lose:
//   1. NOTHING from PtyExitInfo but `signal` and `startedAt` reaches the event.
//      `tail` is raw terminal output, `command` a command line, `cwd` a path.
//   2. The buckets are Ryan's six, a separate set from session_ended's.
//   3. The four reasons, and how a crash by signal reads.
//   4. It fires before teardown drops the mapping, and never for an installer.
// index.ts imports electron and cannot load under plain node, so its wiring is
// asserted against the source text, the same pattern the rest of the suite uses.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

globalThis.__POSTHOG_KEY__ = 'test-key';
globalThis.__POSTHOG_HOST__ = 'https://example.invalid';
delete process.env.DO_NOT_TRACK;

const captured = [];
class FakePostHog { capture(p) { captured.push(p); } async shutdown() {} }
const posthogPath = require.resolve('posthog-node');
require.cache[posthogPath] = { id: posthogPath, filename: posthogPath, loaded: true, exports: { PostHog: FakePostHog } };

const { Analytics, runDurationBucket, runEndReason, RUN_END_REASONS } = loadTs('src/main/analytics.ts');
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function booted() {
  const a = new Analytics();
  a.init({ stateDir: fs.mkdtempSync(path.join(os.tmpdir(), 'md-run-ended-')), appVersion: '0.5.1', enabled: true });
  captured.length = 0;
  return a;
}

test('the event passes the allowlist with exactly its three properties', () => {
  const a = booted();
  a.track('agent_run_ended', { provider: 'claude', duration_bucket: '2-10m', ended_reason: 'completed' });
  assert.equal(captured.length, 1);
  const p = captured[0].properties;
  assert.equal(p.provider, 'claude');
  assert.equal(p.duration_bucket, '2-10m');
  assert.equal(p.ended_reason, 'completed');
  assert.equal(p.$process_person_profile, false);
});

test('tail, command and cwd never survive the allowlist, even when a caller passes them', () => {
  const a = booted();
  a.track('agent_run_ended', {
    provider: 'codex', duration_bucket: '<30s', ended_reason: 'error',
    tail: 'panic: sk-live-SECRET', command: '/usr/bin/codex --model x', cwd: '/Users/someone/repo'
  });
  assert.equal(captured.length, 1);
  const p = captured[0].properties;
  for (const k of ['tail', 'command', 'cwd']) assert.equal(k in p, false, `${k} leaked`);
  assert.doesNotMatch(JSON.stringify(p), /SECRET|\/Users\/someone|\/usr\/bin/);
});

test("Ryan's six buckets on their boundaries, a separate set from session_ended's", () => {
  assert.equal(runDurationBucket(0), '<30s');
  assert.equal(runDurationBucket(29_999), '<30s');
  assert.equal(runDurationBucket(30_000), '30s-2m');
  assert.equal(runDurationBucket(119_999), '30s-2m');
  assert.equal(runDurationBucket(120_000), '2-10m');
  assert.equal(runDurationBucket(599_999), '2-10m');
  assert.equal(runDurationBucket(600_000), '10-30m');
  assert.equal(runDurationBucket(1_799_999), '10-30m');
  assert.equal(runDurationBucket(1_800_000), '30m-2h');
  assert.equal(runDurationBucket(7_199_999), '30m-2h');
  assert.equal(runDurationBucket(7_200_000), '2h+');
  assert.equal(runDurationBucket(86_400_000), '2h+');
  // Never a bucket the spec does not have, and never a throw.
  assert.equal(runDurationBucket(-5), '<30s');
  assert.equal(runDurationBucket(Number.NaN), '<30s');
  // Not a widening of the session helper: it stays, unexported and untouched,
  // and none of its labels appears in the run helper.
  const src = read('src/main/analytics.ts');
  assert.match(src, /^function durationBucket\(ms: number\): string \{/m);
  assert.match(src, /^export function runDurationBucket\(ms: number\): string \{/m);
  const run = src.slice(src.indexOf('export function runDurationBucket'));
  const runBody = run.slice(0, run.indexOf('\n}\n') + 3);
  for (const label of ['<5m', '5-30m', '2-8h', '8h+']) {
    assert.equal(runBody.includes(`'${label}'`), false, `${label} is a session label`);
  }
});

test('four reasons, and how the two exit facts map onto them', () => {
  assert.deepEqual([...RUN_END_REASONS], ['completed', 'error', 'stopped', 'unknown']);
  assert.equal(runEndReason(0, undefined), 'completed');
  assert.equal(runEndReason(0, 0), 'completed');
  assert.equal(runEndReason(1, undefined), 'error');
  assert.equal(runEndReason(127, 0), 'error');
  assert.equal(runEndReason(0, 9), 'stopped');
  // A crash by signal reads as stopped: at the exit seam a kill and a crash
  // are both a signal, and the split is the follow-up the spec names.
  assert.equal(runEndReason(0, 11), 'stopped');
  assert.equal(runEndReason(null, undefined), 'unknown');
  assert.equal(runEndReason(undefined, null), 'unknown');
});

test('the exit handler fires it before teardown, for agents only, and reads only signal and startedAt', () => {
  const main = read('src/main/index.ts');
  const handler = main.slice(main.indexOf('ptyManager.setExitHandler('), main.indexOf('/** Keep the system from suspending'));
  const at = handler.indexOf("analytics.track('agent_run_ended'");
  assert.ok(at > 0, 'the event is fired from the exit handler');
  assert.ok(at < handler.lastIndexOf("teardownPty(id, 'exit');"), 'fired BEFORE teardownPty drops the pty->agent mapping');
  assert.ok(at > handler.indexOf('pendingInstallRelaunch.get(id)'), 'after the installer branch, which returns on a clean install exit');
  assert.match(handler, /const endedAgent = ptyToAgent\.get\(id\);/);
  const block = handler.slice(handler.indexOf('const endedAgent'), handler.lastIndexOf("teardownPty(id, 'exit');"));
  // The only two reads of `info` in the block. Everything else on it is forbidden.
  assert.match(block, /info\?\.startedAt/);
  assert.match(block, /info\?\.signal/);
  for (const bad of ['info?.tail', 'info.tail', 'info?.command', 'info.command', 'info?.cwd', 'info.cwd', 'tail:', 'cwd:', 'command:']) {
    assert.equal(block.includes(bad), false, `${bad} must not appear near the telemetry call`);
  }
  assert.match(block, /duration_bucket: runDurationBucket\(Date\.now\(\) - startedAt\)/);
  assert.match(block, /ended_reason: runEndReason\(exitCode, info\?\.signal\)/);
});

test('the pty session records its spawn time and hands it to the exit handler', () => {
  const pty = read('src/main/pty.ts');
  assert.match(pty, /lastOutputAt: Date\.now\(\),\n\s*startedAt: Date\.now\(\),/);
  assert.match(pty, /this\.exitHandler\?\.\(opts\.id, exitCode, \{\n\s*signal,\n\s*startedAt: session\.startedAt,/);
  assert.match(pty, /startedAt\?: number;/, 'PtyExitInfo carries it');
});

test('TELEMETRY.md carries the row, with the six buckets and four reasons', () => {
  const row = read('TELEMETRY.md').split('\n').find((l) => l.startsWith('| `agent_run_ended` |'));
  assert.ok(row, 'the row exists');
  for (const v of ['<30s', '30s-2m', '2-10m', '10-30m', '30m-2h', '2h+', 'completed', 'error', 'stopped', 'unknown', 'provider']) {
    assert.ok(row.includes(`\`${v}\``), `row lacks ${v}`);
  }
  assert.match(row, /never raw duration/);
});

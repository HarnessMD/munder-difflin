'use strict';

// Tests for md-slack-reply.cjs writing the bot-thread follow-ledger — the fix
// that stops user thread-replies from being silently lost. The ledger the poller
// reads (md-slack-poller.cjs loadBotThreadRoots) is only written by this CLI, so
// these assert the write path: create-if-missing, merge/preserve, newest
// lastBotTs, root fallback, fail-soft, and cross-module shape compatibility.

const assert = require('assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { tsMaxStr, resolveLedgerPath, upsertBotThread } = require('../resources/md-slack-reply.cjs');
const { loadBotThreadRoots } = require('../resources/md-slack-poller.cjs');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (err) { failures++; console.log(`  ✗ ${name}\n     ${err.message}`); }
}

const CH = 'C0BTJ8REX5Z';
function tmpLedger() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdreply-'));
  return { dir, p: path.join(dir, 'slack-bot-threads.json') };
}

console.log('md-slack-reply ledger tests');

test('tsMaxStr returns the newer ts / tolerates undefined', () => {
  assert.strictEqual(tsMaxStr('100.2', '100.1'), '100.2');
  assert.strictEqual(tsMaxStr('100.1', '100.2'), '100.2');
  assert.strictEqual(tsMaxStr(undefined, '5.0'), '5.0');
  assert.strictEqual(tsMaxStr('5.0', undefined), '5.0');
});

test('resolveLedgerPath: --ledger override, else alongside the config file', () => {
  assert.strictEqual(resolveLedgerPath({ ledger: '/x/l.json' }, '/y/slack-reply.json'), '/x/l.json');
  assert.strictEqual(resolveLedgerPath({}, '/y/z/slack-reply.json'), path.join('/y/z', 'slack-bot-threads.json'));
});

test('upsert creates the ledger with the poller-expected shape', () => {
  const { dir, p } = tmpLedger();
  assert.ok(!fs.existsSync(p), 'starts absent');
  const ok = upsertBotThread(p, { channel: CH, thread_ts: '100.1', botMsgTs: '100.5' });
  assert.strictEqual(ok, true);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.strictEqual(data.threads['100.1'].channel, CH);
  assert.strictEqual(data.threads['100.1'].lastBotTs, '100.5');
  // 0600 perms (owner-only).
  assert.strictEqual(fs.statSync(p).mode & 0o777, 0o600);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('poller loadBotThreadRoots reads what upsert wrote (shape compatibility)', () => {
  const { dir, p } = tmpLedger();
  upsertBotThread(p, { channel: CH, thread_ts: '200.2', botMsgTs: '200.9' });
  const roots = loadBotThreadRoots(p);
  assert.strictEqual(roots.length, 1);
  assert.deepStrictEqual(
    { ts: roots[0].ts, channel: roots[0].channel, lastBotTs: roots[0].lastBotTs },
    { ts: '200.2', channel: CH, lastBotTs: '200.9' }
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test('upsert merges — preserves other threads, keeps NEWEST lastBotTs', () => {
  const { dir, p } = tmpLedger();
  upsertBotThread(p, { channel: CH, thread_ts: 'A', botMsgTs: '10.0' });
  upsertBotThread(p, { channel: CH, thread_ts: 'B', botMsgTs: '20.0' });
  // Re-reply in A with an OLDER ts must not regress lastBotTs; a NEWER one advances it.
  upsertBotThread(p, { channel: CH, thread_ts: 'A', botMsgTs: '5.0' });
  upsertBotThread(p, { channel: CH, thread_ts: 'A', botMsgTs: '30.0' });
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.strictEqual(Object.keys(d.threads).length, 2, 'both threads preserved');
  assert.strictEqual(d.threads['A'].lastBotTs, '30.0', 'kept newest');
  assert.strictEqual(d.threads['B'].lastBotTs, '20.0', 'B untouched');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('upsert falls back to the thread root when botMsgTs is unknown', () => {
  const { dir, p } = tmpLedger();
  upsertBotThread(p, { channel: CH, thread_ts: '300.3' }); // no botMsgTs
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.strictEqual(d.threads['300.3'].lastBotTs, '300.3', 'baseline = root ts');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('upsert is fail-soft: a bad path returns false, never throws', () => {
  // A path whose parent dir does not exist → write fails, but must not throw.
  const bad = path.join(os.tmpdir(), 'no-such-dir-xyz-' + process.pid, 'x', 'ledger.json');
  let threw = false, ret = null;
  try { ret = upsertBotThread(bad, { channel: CH, thread_ts: 'Z', botMsgTs: '1.0' }); }
  catch { threw = true; }
  assert.strictEqual(threw, false, 'never throws');
  assert.strictEqual(ret, false, 'returns false on failure');
});

test('upsert tolerates a pre-existing corrupt ledger (starts fresh, still writes)', () => {
  const { dir, p } = tmpLedger();
  fs.writeFileSync(p, 'not json {');
  const ok = upsertBotThread(p, { channel: CH, thread_ts: 'C', botMsgTs: '9.0' });
  assert.strictEqual(ok, true);
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.strictEqual(d.threads['C'].lastBotTs, '9.0');
  fs.rmSync(dir, { recursive: true, force: true });
});

console.log(failures === 0 ? '\nall passed' : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);

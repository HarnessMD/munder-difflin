'use strict';

// Unit tests for the pure helpers of md-slack-poller.cjs — the pull->replay
// Slack poller. Requires the script as a module (it only runs main() when
// invoked directly), the same pattern as slack.test.cjs / slack-trigger.cjs.

const assert = require('assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHmac } = require('node:crypto');
const {
  parseArgs,
  tsGreater,
  maxTs,
  selectNewMessages,
  mentionsBot,
  mergeLedgerThreads,
  pruneStaleThreads,
  MAX_THREAD_AGE_SEC,
  loadBotThreadRoots,
  resolveLedgerPath,
  buildEventPayload,
  computeSignature,
} = require('../resources/md-slack-poller.cjs');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (err) { failures++; console.log(`  ✗ ${name}\n     ${err.message}`); }
}

const BOT = 'U0BOT';
const CH = 'C0CHAN';

console.log('slack poller tests (pull -> signed local replay)');

// ─── arg parsing ─────────────────────────────────────────────────────────────
test('parseArgs handles --key value, --key=value, and bare flags', () => {
  const a = parseArgs(['--channel', 'C1', '--interval=10', '--watch', '--verbose']);
  assert.strictEqual(a.channel, 'C1');
  assert.strictEqual(a.interval, '10');
  assert.strictEqual(a.watch, true);
  assert.strictEqual(a.verbose, true);
});

// ─── ts comparison ───────────────────────────────────────────────────────────
test('tsGreater compares Slack decimal-string ts numerically', () => {
  assert.strictEqual(tsGreater('1700000000.000200', '1700000000.000100'), true);
  assert.strictEqual(tsGreater('1700000000.000100', '1700000000.000200'), false);
  assert.strictEqual(tsGreater('1700000000.000100', '1700000000.000100'), false);
  assert.strictEqual(tsGreater('1', null), true, 'anything is newer than no baseline');
  assert.strictEqual(tsGreater(null, '1'), false);
});

test('maxTs returns the newer ts', () => {
  assert.strictEqual(maxTs('100.2', '100.1'), '100.2');
  assert.strictEqual(maxTs('100.1', '100.2'), '100.2');
  assert.strictEqual(maxTs(null, '5.0'), '5.0');
});

// ─── new-message selection (the dedup/no-replay core) ────────────────────────
test('selectNewMessages returns only ts > lastTs, ascending', () => {
  const msgs = [
    { ts: '30.0', text: 'c', user: 'U1' },
    { ts: '10.0', text: 'a', user: 'U1' },
    { ts: '20.0', text: 'b', user: 'U1' },
  ];
  const out = selectNewMessages(msgs, '10.0', BOT);
  assert.deepStrictEqual(out.map((m) => m.ts), ['20.0', '30.0']);
});

test('selectNewMessages with null lastTs returns all (sorted)', () => {
  const msgs = [{ ts: '2.0', user: 'U1' }, { ts: '1.0', user: 'U1' }];
  assert.deepStrictEqual(selectNewMessages(msgs, null, BOT).map((m) => m.ts), ['1.0', '2.0']);
});

test('selectNewMessages drops bot-authored + own-user messages (self-loop guard)', () => {
  const msgs = [
    { ts: '11.0', text: 'from bot_id', bot_id: 'B1' },
    { ts: '12.0', text: 'from bot user', user: BOT },
    { ts: '13.0', text: 'from human', user: 'U9' },
  ];
  const out = selectNewMessages(msgs, '10.0', BOT);
  assert.deepStrictEqual(out.map((m) => m.ts), ['13.0']);
});

test('selectNewMessages tolerates non-array / malformed input', () => {
  assert.deepStrictEqual(selectNewMessages(undefined, '1', BOT), []);
  assert.deepStrictEqual(selectNewMessages([null, { text: 'no ts' }, {}], '0', BOT), []);
});

// ─── mention detection (thread-follow decision only) ─────────────────────────
test('mentionsBot detects <@BOT> and ignores others', () => {
  assert.strictEqual(mentionsBot(`hey <@${BOT}> do X`, BOT), true);
  assert.strictEqual(mentionsBot('hey <@U0OTHER> do X', BOT), false);
  assert.strictEqual(mentionsBot('no mention', BOT), false);
  assert.strictEqual(mentionsBot('x', null), false);
});

// ─── synthetic event payload shape (what the server reads) ───────────────────
test('buildEventPayload produces an event_callback the server accepts', () => {
  const p = buildEventPayload(
    { ts: '100.1', text: `<@${BOT}> hi`, user: 'U9' },
    { channelId: CH, botUserId: BOT, teamId: 'T1' }
  );
  assert.strictEqual(p.type, 'event_callback');
  assert.strictEqual(p.authorizations[0].user_id, BOT);
  assert.strictEqual(p.event.type, 'message');
  assert.strictEqual(p.event.channel, CH);
  assert.strictEqual(p.event.ts, '100.1');
  assert.strictEqual(p.event.text, `<@${BOT}> hi`);
  assert.ok(!('subtype' in p.event), 'plain message has no subtype');
});

test('buildEventPayload preserves thread_ts and file_share + files', () => {
  const p = buildEventPayload(
    { ts: '100.2', text: 'see file', thread_ts: '100.1', subtype: 'file_share',
      files: [{ url_private: 'https://x', name: 'a.png' }] },
    { channelId: CH, botUserId: BOT, teamId: 'T1' }
  );
  assert.strictEqual(p.event.thread_ts, '100.1');
  assert.strictEqual(p.event.subtype, 'file_share');
  assert.strictEqual(p.event.files.length, 1);
});

test('buildEventPayload drops non-file_share subtypes (server would ignore them)', () => {
  const p = buildEventPayload(
    { ts: '100.3', text: 'edited', subtype: 'message_changed' },
    { channelId: CH, botUserId: BOT, teamId: 'T1' }
  );
  assert.ok(!('subtype' in p.event));
});

// ─── signature parity with the server's verify() ─────────────────────────────
test('computeSignature matches Slack v0 HMAC (server verify parity)', () => {
  const secret = 'test-signing-secret';
  const ts = '1700000000';
  const body = JSON.stringify({ type: 'event_callback' });
  const got = computeSignature(secret, ts, body);
  const expected = 'v0=' + createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex');
  assert.strictEqual(got, expected);
  assert.ok(got.startsWith('v0='));
});

// ─── GATE 1: bot-thread ledger reading + follow-set merge ────────────────────
test('resolveLedgerPath: --ledger override, else alongside config.json', () => {
  assert.equal(resolveLedgerPath({ ledger: '/x/l.json' }, '/y/config.json'), '/x/l.json');
  assert.equal(resolveLedgerPath({}, '/y/z/config.json'), path.join('/y/z', 'slack-bot-threads.json'));
});

test('loadBotThreadRoots parses the ledger; tolerates missing/corrupt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdpoll-'));
  const p = path.join(dir, 'ledger.json');
  assert.deepEqual(loadBotThreadRoots(p), [], 'missing file → []');
  fs.writeFileSync(p, 'not json{');
  assert.deepEqual(loadBotThreadRoots(p), [], 'corrupt file → []');
  fs.writeFileSync(p, JSON.stringify({
    version: 1,
    threads: {
      '100.1': { channel: CH, lastBotTs: '100.5', updated: 1 },
      '200.2': { channel: 'C_OTHER', updated: 2 },
      'bad': { nochannel: true },
    },
  }));
  const roots = loadBotThreadRoots(p);
  assert.equal(roots.length, 2, 'entries without a channel are skipped');
  const byTs = Object.fromEntries(roots.map((r) => [r.ts, r]));
  assert.equal(byTs['100.1'].channel, CH);
  assert.equal(byTs['100.1'].lastBotTs, '100.5');
  assert.equal(byTs['200.2'].lastBotTs, undefined);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('mergeLedgerThreads follows this-channel bot threads, baselining to lastBotTs', () => {
  const state = { threads: {} };
  const ledger = [
    { ts: '100.1', channel: CH, lastBotTs: '100.5' },   // adopt, baseline 100.5
    { ts: '300.3', channel: CH },                        // adopt, baseline = root
    { ts: '200.2', channel: 'C_OTHER', lastBotTs: '9' }, // other channel → skip
  ];
  const added = mergeLedgerThreads(state, ledger, CH);
  assert.equal(added, 2);
  assert.equal(state.threads['100.1'].lastReplyTs, '100.5', 'baseline = bot last reply → no history replay');
  assert.equal(state.threads['300.3'].lastReplyTs, '300.3', 'no lastBotTs → baseline = root');
  assert.ok(!state.threads['200.2'], 'other channel not followed');
});

test('mergeLedgerThreads never clobbers an already-followed thread cursor', () => {
  const state = { threads: { '100.1': { lastReplyTs: '100.9' } } };
  const added = mergeLedgerThreads(state, [{ ts: '100.1', channel: CH, lastBotTs: '100.5' }], CH);
  assert.equal(added, 0);
  assert.equal(state.threads['100.1'].lastReplyTs, '100.9', 'existing cursor preserved');
});

test('mergeLedgerThreads tolerates malformed ledger input', () => {
  const state = { threads: {} };
  assert.equal(mergeLedgerThreads(state, undefined, CH), 0);
  assert.equal(mergeLedgerThreads(state, [null, {}, { ts: 5, channel: CH }], CH), 0);
});

// ─── T102 addendum: 90-day expiry of the follow-set ──────────────────────────
test('pruneStaleThreads drops threads with no activity in >90 days, keeps recent', () => {
  const nowSec = 1_800_000_000;
  const old = String(nowSec - MAX_THREAD_AGE_SEC - 1000); // just past cutoff
  const recent = String(nowSec - 60);                     // 1 min ago
  const oldRootRecentReply = '100.0';                     // ancient root...
  const state = { threads: {
    [old]: { lastReplyTs: old },
    [recent]: { lastReplyTs: recent },
    [oldRootRecentReply]: { lastReplyTs: String(nowSec - 100) }, // ...but a recent reply
  } };
  const pruned = pruneStaleThreads(state, nowSec, MAX_THREAD_AGE_SEC);
  assert.equal(pruned, 1);
  assert.ok(!state.threads[old], 'stale thread dropped');
  assert.ok(state.threads[recent], 'recent thread kept');
  assert.ok(state.threads[oldRootRecentReply], 'old root with recent reply kept (activity = last reply)');
});

test('mergeLedgerThreads skips ledger roots already past the 90-day cutoff', () => {
  const nowSec = 1_800_000_000;
  const state = { threads: {} };
  const stale = String(nowSec - MAX_THREAD_AGE_SEC - 5);
  const fresh = String(nowSec - 30);
  const added = mergeLedgerThreads(state, [
    { ts: stale, channel: CH },
    { ts: fresh, channel: CH },
  ], CH, nowSec, MAX_THREAD_AGE_SEC);
  assert.equal(added, 1, 'only the fresh thread is adopted');
  assert.ok(state.threads[fresh] && !state.threads[stale]);
});

test('MAX_THREAD_AGE_SEC is 90 days', () => {
  assert.equal(MAX_THREAD_AGE_SEC, 90 * 24 * 60 * 60);
});

test('90-day cutoff boundary: just-under is kept, just-over is pruned', () => {
  const nowSec = 1_800_000_000;
  const justUnder = String(nowSec - (MAX_THREAD_AGE_SEC - 1)); // age = 90d − 1s → keep
  const justOver = String(nowSec - (MAX_THREAD_AGE_SEC + 1));  // age = 90d + 1s → prune
  const state = { threads: { [justUnder]: { lastReplyTs: justUnder }, [justOver]: { lastReplyTs: justOver } } };
  const pruned = pruneStaleThreads(state, nowSec, MAX_THREAD_AGE_SEC);
  assert.equal(pruned, 1);
  assert.ok(state.threads[justUnder], 'exactly under the cutoff is kept');
  assert.ok(!state.threads[justOver], 'exactly over the cutoff is pruned');
});

console.log(failures === 0 ? '\nall passed' : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);

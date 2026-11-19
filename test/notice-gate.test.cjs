'use strict';

/**
 * T-796: the four delivery rules for harness-generated notices.
 *
 *  1. dedup by signature, persisted across restarts;
 *  2. re-arm only once the condition cleared;
 *  3. defer non-urgent notices while the recipient waits on the human;
 *  4. nothing to dead (archived or unknown) recipients.
 *
 * And the boundary: agent-authored mail never passes the gate, so it is
 * delivered exactly once per message and unchanged, however often it repeats.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { NoticeGate, WaitTracker, breakerReasonClass, signatureOf, NOTICE_DEFER_CAP, NOTICE_LEDGER_TTL_MS } = loadTs('src/main/noticeGate.ts');
const { classifyHook } = loadTs('src/main/workerWake.ts');
const { HiveManager } = loadTs('src/main/hive.ts');

const LIVE = { dead: false, waiting: false };
const WAITING = { dead: false, waiting: true };
const DEAD = { dead: true, waiting: false };

function tmp(t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// Rule 1

test('rule 1: the same signature is delivered once, a different one goes', (t) => {
  const gate = new NoticeGate(path.join(tmp(t, 'ng-1-'), 'notice-ledger.json'));
  const n = { kind: 'breaker', key: 'steer:looping' };
  assert.equal(gate.decide('jim', n, LIVE), 'deliver');
  gate.markDelivered('jim', n);
  assert.equal(gate.decide('jim', n, LIVE), 'duplicate');
  assert.equal(gate.decide('jim', { kind: 'breaker', key: 'steer:error storm' }, LIVE), 'deliver');
  assert.equal(gate.decide('pam', n, LIVE), 'deliver', 'dedup is per recipient');
});

test('rule 1: the ledger survives a restart (a new gate on the same file)', (t) => {
  const file = path.join(tmp(t, 'ng-1r-'), 'notice-ledger.json');
  const n = { kind: 'heartbeat', key: 'quiet' };
  new NoticeGate(file).markDelivered('god-1', n);
  assert.equal(new NoticeGate(file).decide('god-1', n, LIVE), 'duplicate');
});

test('rule 1: entries older than the TTL are pruned on load', (t) => {
  const file = path.join(tmp(t, 'ng-ttl-'), 'notice-ledger.json');
  let now = Date.parse('2026-10-01T00:00:00Z');
  const n = { kind: 'worker', key: 'reaped-idle:worker-a' };
  new NoticeGate(file, () => now).markDelivered('god-1', n);
  now += NOTICE_LEDGER_TTL_MS + 1;
  assert.equal(new NoticeGate(file, () => now).decide('god-1', n, LIVE), 'deliver');
});

test('rule 1: a corrupt ledger never blocks delivery', (t) => {
  const file = path.join(tmp(t, 'ng-bad-'), 'notice-ledger.json');
  fs.writeFileSync(file, '{not json');
  assert.equal(new NoticeGate(file).decide('god-1', { kind: 'heartbeat', key: 'quiet' }, LIVE), 'deliver');
});

test('breaker signatures ignore the figures in the reason', () => {
  assert.equal(breakerReasonClass('looping: 7× identical tool call (Bash)'), 'looping');
  assert.equal(breakerReasonClass('looping: 9× identical tool call (Read)'), 'looping');
  assert.equal(breakerReasonClass('token velocity 91234/min > 50000/min'), 'token velocity /min > /min');
  assert.equal(breakerReasonClass(''), 'unspecified');
  assert.equal(signatureOf({ kind: 'breaker', key: 'steer:looping' }), 'breaker:steer:looping');
});

// Rule 2

test('rule 2: a signature re-arms only when its condition cleared', (t) => {
  const gate = new NoticeGate(path.join(tmp(t, 'ng-2-'), 'notice-ledger.json'));
  const n = { kind: 'heartbeat', key: 'actionable:abc', ctx: ['m1', 'm2'] };
  gate.markDelivered('god-1', n);
  // m2 still unread: the condition holds, nothing re-arms.
  const pending = new Set(['m2']);
  assert.equal(gate.rearm('god-1', 'heartbeat', (_k, ctx) => !ctx.some((id) => pending.has(id))), 0);
  assert.equal(gate.decide('god-1', n, LIVE), 'duplicate');
  // Both drained: cleared.
  pending.clear();
  assert.equal(gate.rearm('god-1', 'heartbeat', (_k, ctx) => !ctx.some((id) => pending.has(id))), 1);
  assert.equal(gate.decide('god-1', n, LIVE), 'deliver');
});

test('rule 2: a held notice whose condition cleared is dropped, not sent stale', (t) => {
  const gate = new NoticeGate(path.join(tmp(t, 'ng-2h-'), 'notice-ledger.json'));
  gate.hold('jim', { kind: 'breaker', key: 'steer:looping' }, {}, 'breaker');
  gate.hold('jim', { kind: 'worker', key: 'reaped-idle:w1', ctx: ['w1'] }, {}, 'x');
  assert.equal(gate.rearm('jim', 'breaker', () => true), 1);
  assert.deepEqual(gate.held().map((d) => d.sig), ['worker:reaped-idle:w1']);
  assert.equal(gate.release(() => LIVE).send.length, 1);
});

test('rule 1: a long-lived gate prunes past-TTL entries on its next write', (t) => {
  let now = Date.parse('2026-10-01T00:00:00Z');
  const gate = new NoticeGate(path.join(tmp(t, 'ng-ttlw-'), 'notice-ledger.json'), () => now);
  gate.markDelivered('god-1', { kind: 'worker', key: 'reaped-idle:old' });
  now += NOTICE_LEDGER_TTL_MS + 1;
  gate.markDelivered('god-1', { kind: 'worker', key: 'reaped-idle:new' });
  assert.deepEqual(gate.delivered('god-1'), ['worker:reaped-idle:new']);
});

test('rule 2: re-arming one kind leaves the other kinds alone', (t) => {
  const gate = new NoticeGate(path.join(tmp(t, 'ng-2k-'), 'notice-ledger.json'));
  gate.markDelivered('jim', { kind: 'breaker', key: 'steer:looping' });
  gate.markDelivered('jim', { kind: 'worker', key: 'reaped-idle:jim' });
  gate.rearm('jim', 'breaker', () => true);
  assert.deepEqual(gate.delivered('jim'), ['worker:reaped-idle:jim']);
});

// Rule 3

test('rule 3: a non-urgent notice waits, an urgent one goes', (t) => {
  const gate = new NoticeGate(path.join(tmp(t, 'ng-3-'), 'notice-ledger.json'));
  assert.equal(gate.decide('jim', { kind: 'breaker', key: 'steer:looping' }, WAITING), 'defer');
  assert.equal(gate.decide('jim', { kind: 'breaker', key: 'constrain:looping', urgent: true }, WAITING), 'deliver');
});

test('rule 3: a held notice is released once the wait ends, and survives a restart', (t) => {
  const file = path.join(tmp(t, 'ng-3r-'), 'notice-ledger.json');
  const n = { kind: 'breaker', key: 'steer:looping' };
  const gate = new NoticeGate(file);
  gate.hold('jim', n, { to: 'jim', subject: 'Circuit breaker: steer' }, 'breaker');
  assert.equal(gate.decide('jim', n, WAITING), 'duplicate', 'a held twin is not queued twice');
  let r = new NoticeGate(file).release(() => WAITING);
  assert.equal(r.send.length, 0);
  const after = new NoticeGate(file);
  r = after.release(() => LIVE);
  assert.equal(r.send.length, 1);
  assert.equal(r.send[0].payload.subject, 'Circuit breaker: steer');
  assert.equal(after.held().length, 0);
});

test('rule 3: the hold is capped per recipient, the oldest goes first', (t) => {
  const gate = new NoticeGate(path.join(tmp(t, 'ng-3c-'), 'notice-ledger.json'));
  let evicted = [];
  for (let i = 0; i <= NOTICE_DEFER_CAP; i++) evicted = gate.hold('jim', { kind: 'worker', key: `k${i}` }, {}, 'x');
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].sig, 'worker:k0');
  assert.equal(gate.held().length, NOTICE_DEFER_CAP);
});

test('WaitTracker: a permission prompt or an open question is a wait, the idle prompt is not', () => {
  const w = new WaitTracker();
  const note = (event, message, tool) => w.note('jim', event, classifyHook(event, message), tool);
  note('Notification', 'Claude is waiting for your input');
  assert.equal(w.isWaiting('jim'), false, 'idle prompt after a finished turn');
  note('Notification', 'Claude needs your permission to use Bash');
  assert.equal(w.why('jim'), 'permission');
  note('PostToolUse', undefined, 'Bash');
  assert.equal(w.isWaiting('jim'), false, 'approved and ran');
  note('PreToolUse', undefined, 'AskUserQuestion');
  assert.equal(w.why('jim'), 'question');
  note('UserPromptSubmit');
  assert.equal(w.isWaiting('jim'), false);
  note('Notification', 'Claude needs your permission to use Read');
  note('PreToolUse', undefined, 'Read');
  assert.equal(w.isWaiting('jim'), false, 'the next tool call proves the agent moved on');
  note('PreToolUse', undefined, 'AskUserQuestion');
  note('Notification', 'Claude is waiting for your input');
  assert.equal(w.isWaiting('jim'), false, 'a question closed with Esc ends at the idle prompt');
  note('Notification', 'Claude needs your permission to use Edit');
  w.forget('jim');
  assert.equal(w.isWaiting('jim'), false, 'a closed PTY waits for nothing');
});

// Rule 4

test('rule 4: nothing to the dead, and a held notice to an agent that died is dropped', (t) => {
  const gate = new NoticeGate(path.join(tmp(t, 'ng-4-'), 'notice-ledger.json'));
  const n = { kind: 'breaker', key: 'steer:looping' };
  assert.equal(gate.decide('jim', n, DEAD), 'dead');
  gate.hold('jim', n, {}, 'breaker');
  const r = gate.release(() => DEAD);
  assert.equal(r.send.length, 0);
  assert.equal(r.dead.length, 1);
  assert.equal(gate.held().length, 0);
});

// HiveManager: the rules on a real floor, and the boundary they must not cross

async function floor(t) {
  const home = tmp(t, 'ng-floor-');
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'god-1', name: 'Michael', provider: 'claude', cwd: home, isGod: true });
  await hive.ensureAgent({ id: 'jim-1', name: 'Jim', provider: 'claude', cwd: home });
  return { home, hive };
}

const heartbeat = (body = 'quiet floor') => ({ to: 'god', act: 'request', subject: 'Heartbeat', body });

test('floor: a repeated heartbeat reaches god once, also after a restart', async (t) => {
  const { home, hive } = await floor(t);
  const n = { kind: 'heartbeat', key: 'quiet' };
  assert.equal(hive.sendNotice(n, heartbeat(), 'heartbeat'), 'deliver');
  assert.equal(hive.sendNotice(n, heartbeat(), 'heartbeat'), 'duplicate');
  assert.equal(new HiveManager(() => home).sendNotice(n, heartbeat(), 'heartbeat'), 'duplicate');
  assert.equal(hive.inbox('god-1').length, 1);
  assert.ok(fs.existsSync(path.join(home, 'hive', 'notice-ledger.json')), 'state lives under the hive root');
  const logged = hive.logTail(200).filter((e) => e.kind === 'notice' && e.verdict === 'duplicate');
  assert.equal(logged.length, 2);
});

test('floor: a notice to a waiting agent is held, then delivered unchanged', async (t) => {
  const { hive } = await floor(t);
  let waiting = true;
  hive.setWaitingProbe((id) => id === 'jim-1' && waiting);
  const steer = { to: 'jim-1', act: 'request', subject: 'Circuit breaker: steer', body: 'Automated guardrail: looping' };
  assert.equal(hive.sendNotice({ kind: 'breaker', key: 'steer:looping' }, steer, 'breaker'), 'defer');
  assert.equal(hive.inbox('jim-1').length, 0);
  assert.equal(hive.flushNotices(), 0, 'still waiting');
  waiting = false;
  assert.equal(hive.flushNotices(), 1);
  const got = hive.inbox('jim-1');
  assert.equal(got.length, 1);
  assert.equal(got[0].subject, steer.subject);
  assert.equal(got[0].body, steer.body);
  assert.equal(got[0].from, 'breaker');
  assert.equal(hive.sendNotice({ kind: 'breaker', key: 'steer:looping' }, steer, 'breaker'), 'duplicate');
});

test('floor: an urgent notice reaches a waiting agent at once', async (t) => {
  const { hive } = await floor(t);
  hive.setWaitingProbe(() => true);
  const v = hive.sendNotice({ kind: 'breaker', key: 'constrain:looping', urgent: true },
    { to: 'jim-1', act: 'request', subject: 'Circuit breaker: constrain', body: 'stop' }, 'breaker');
  assert.equal(v, 'deliver');
  assert.equal(hive.inbox('jim-1').length, 1);
});

test('floor: nothing to an archived or unknown agent; god is never dead', async (t) => {
  const { hive } = await floor(t);
  hive.setArchived('jim-1', true);
  const n = { kind: 'breaker', key: 'steer:looping' };
  assert.equal(hive.sendNotice(n, { to: 'jim-1', subject: 'Circuit breaker: steer' }, 'breaker'), 'dead');
  assert.equal(hive.sendNotice(n, { to: 'nobody', subject: 'Circuit breaker: steer' }, 'breaker'), 'dead');
  assert.equal(hive.inbox('jim-1').length, 0);
  assert.equal(hive.inbox('god-1').length, 0, 'a dead notice is not bounced to god either');
  assert.equal(hive.noticeFacts('god').dead, false);
});

test('floor: god is never dead, even before a god is registered', (t) => {
  const home = tmp(t, 'ng-nogod-');
  const hive = new HiveManager(() => home);
  assert.equal(hive.noticeFacts('god').dead, false);
});

test('floor: a held notice whose recipient was archived meanwhile is dropped', async (t) => {
  const { hive } = await floor(t);
  let waiting = true;
  hive.setWaitingProbe(() => waiting);
  hive.sendNotice({ kind: 'breaker', key: 'steer:looping' }, { to: 'jim-1', subject: 'Circuit breaker: steer' }, 'breaker');
  hive.setArchived('jim-1', true);
  waiting = false;
  assert.equal(hive.flushNotices(), 0);
  assert.equal(hive.inbox('jim-1').length, 0);
  assert.ok(hive.logTail(200).some((e) => e.kind === 'notice' && e.verdict === 'dead' && e.held === true));
});

test('floor: rearm lets a cleared finding report again', async (t) => {
  const { hive } = await floor(t);
  const n = { kind: 'breaker', key: 'steer:looping' };
  const steer = { to: 'jim-1', subject: 'Circuit breaker: steer' };
  hive.sendNotice(n, steer, 'breaker');
  assert.equal(hive.rearmNotices('jim-1', 'breaker', () => true), 1);
  assert.equal(hive.sendNotice(n, steer, 'breaker'), 'deliver');
  assert.equal(hive.inbox('jim-1').length, 2);
});

test('boundary: agent-authored mail is never gated, every message arrives once and unchanged', async (t) => {
  const { home, hive } = await floor(t);
  // Every gate condition at its worst: god "waiting", the same subject twice,
  // a heartbeat-shaped subject. None of it may touch agent mail.
  hive.setWaitingProbe(() => true);
  hive.sendNotice({ kind: 'heartbeat', key: 'quiet' }, heartbeat(), 'heartbeat'); // held
  const outbox = path.join(home, 'hive', 'agents', 'jim-1', 'outbox');
  const body = 'r1 PASS, see the card';
  for (const id of ['jim-msg-1', 'jim-msg-2']) {
    fs.writeFileSync(path.join(outbox, `${id}.json`), JSON.stringify({ id, to: 'god', act: 'inform', subject: 'Heartbeat', body }));
  }
  assert.equal(hive.routeOnce(), 2);
  const got = hive.inbox('god-1').filter((m) => m.from === 'jim-1');
  assert.deepEqual(got.map((m) => m.id).sort(), ['jim-msg-1', 'jim-msg-2']);
  for (const m of got) { assert.equal(m.body, body); assert.equal(m.subject, 'Heartbeat'); }
  assert.equal(hive.routeOnce(), 0, 'each agent message is delivered exactly once');
  assert.equal(hive.inbox('god-1').filter((m) => m.from === 'heartbeat').length, 0, 'the notice is still held');
});

test('boundary: send() itself is unchanged and ungated', async (t) => {
  const { hive } = await floor(t);
  hive.setWaitingProbe(() => true);
  hive.send({ to: 'jim-1', act: 'request', subject: 'T-1', body: 'go' }, 'god-1');
  hive.send({ to: 'jim-1', act: 'request', subject: 'T-1', body: 'go' }, 'god-1');
  assert.equal(hive.inbox('jim-1').length, 2);
  assert.equal(fs.existsSync(path.join(hive.root(), 'notice-ledger.json')), false, 'no ledger without a notice');
});

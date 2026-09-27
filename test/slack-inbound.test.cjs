'use strict';

// 0.4.11, founder 6 Sep 2026: "Make sure that we use our workers or temps for
// the slack integration." A Slack message no longer waits in Michael's queue:
// src/main/slackInbound.ts writes a spawn request straight into the temps
// queue, opens a card, acks, informs Michael, and routes a follow up to the
// live temp that owns the thread. Everything is injected, so this drives the
// handler on a temp directory with fake deps.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const S = loadTs('src/main/slackInbound.ts');

const DASH = /[–—]|\s-\s/;

function fakeDeps(over = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-slack-inbound-'));
  const sent = [];
  const tasks = [];
  const patches = [];
  const informs = [];
  const acks = [];
  const deps = {
    spawnRequestsDir: () => path.join(dir, 'spawn-requests'),
    liveThreadOwner: () => undefined,
    threadSoFar: async () => [],
    tempCwd: () => '/Users/someone/Projects/acme',
    replyCommand: (channel, thread) => `"/opt/md/hive-node" "/opt/md/md-slack-reply.cjs" --channel ${channel} --thread ${thread} --text "<substantive result>"`,
    hive: {
      send: (msg, from) => { sent.push({ msg, from }); },
      addTask: (t) => { tasks.push(t); return true; },
      patchTask: (id, patch) => { patches.push({ id, patch }); return patches.length < 100; }
    },
    ack: async (m) => { acks.push(m); },
    informGod: (subject, body, slack) => { informs.push({ subject, body, slack }); },
    now: () => Date.parse('2026-09-06T10:00:00Z'),
    ...over
  };
  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });
  return { dir, deps, sent, tasks, patches, informs, acks, cleanup };
}

const msg = (over = {}) => ({
  text: 'fix the login bug on staging, users get a blank page after sign in',
  channel: 'C0123ABCD',
  ts: '1757152800.000100',
  thread_ts: '1757152800.000100',
  ...over
});

test('slackRequestId: the dot becomes a dash, anything odd is folded, the worker and card ids derive from it', () => {
  assert.equal(S.slackRequestId('1757152800.000100'), 'slack-1757152800-000100');
  assert.equal(S.slackRequestId(' 17.5/x y '), 'slack-17-5-x-y');
  assert.equal(S.slackRequestId(''), 'slack-unknown');
  assert.equal(S.slackWorkerId('slack-1-2'), 'worker-slack-1-2');
  assert.equal(S.slackTaskId('slack-1-2'), 'task-slack-1-2');
  assert.equal(S.slackRequestIdOfWorker('worker-slack-1-2'), 'slack-1-2');
  assert.equal(S.slackRequestIdOfWorker('worker-abc'), null, 'a god hired temp is not a Slack temp');
  assert.equal(S.slackRequestIdOfWorker('kevin'), null);
});

test('slackTempName: "Slack: first words", at most 28 characters, no trailing punctuation, markup dropped', () => {
  assert.equal(S.slackTempName('fix the login bug on staging please'), 'Slack: fix the login bug on');
  assert.ok(S.slackTempName('fix the login bug on staging please').length <= 28);
  assert.equal(S.slackTempName('ship it!'), 'Slack: ship it');
  assert.equal(S.slackTempName('<@U123> please look at <https://x.y/z|the deploy>, thanks.'), 'Slack: please look at the');
  assert.equal(S.slackTempName('supercalifragilisticexpialidocious now'), 'Slack: supercalifragilistice');
  assert.equal(S.slackTempName(''), 'Slack: attachment');
  assert.equal(S.slackTempName('   '), 'Slack: attachment');
});

test('a new message becomes a spawn request with origin slack, a doing card, an ack and a note to Michael', async () => {
  const f = fakeDeps();
  try {
    const out = await S.handleInboundSlack(msg(), f.deps);
    assert.deepEqual(out, { action: 'spawned', workerId: 'worker-slack-1757152800-000100', requestId: 'slack-1757152800-000100', taskId: 'task-slack-1757152800-000100' });

    const file = path.join(f.dir, 'spawn-requests', 'slack-1757152800-000100.json');
    assert.ok(fs.existsSync(file), 'the request is in the temps queue');
    assert.deepEqual(fs.readdirSync(path.join(f.dir, 'spawn-requests')), ['slack-1757152800-000100.json'], 'no temp file left behind');
    const req = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(req, {
      id: 'slack-1757152800-000100',
      origin: 'slack',
      objective: 'fix the login bug on staging, users get a blank page after sign in',
      cwd: '/Users/someone/Projects/acme',
      name: 'Slack: fix the login bug on',
      slack: { channel: 'C0123ABCD', thread_ts: '1757152800.000100' },
      isolate: true
    });

    assert.equal(f.tasks.length, 1);
    const card = f.tasks[0];
    assert.equal(card.id, 'task-slack-1757152800-000100');
    assert.equal(card.status, 'doing');
    assert.equal(card.assignee, 'worker-slack-1757152800-000100');
    assert.deepEqual(card.slack, { channel: 'C0123ABCD', thread_ts: '1757152800.000100' });
    assert.equal(card.title, 'fix the login bug on staging, users get a blank page after sign in');
    assert.ok(card.title.length <= 80);
    assert.deepEqual(card.dependsOn, []);
    assert.equal(card.priority, 1);
    assert.equal(card.createdAt, '2026-09-06T10:00:00.000Z');

    assert.equal(f.acks.length, 1, 'the received post was asked for once');
    assert.equal(f.informs.length, 1);
    assert.match(f.informs[0].subject, /^\[slack\] temp worker-slack-1757152800-000100 is handling thread 1757152800\.000100$/);
    assert.deepEqual(f.informs[0].slack, { channel: 'C0123ABCD', thread_ts: '1757152800.000100' });
    assert.match(f.informs[0].body, /informed, not asked/);
    assert.ok(!DASH.test(f.informs[0].body), 'no dash in the note to Michael');
    assert.equal(f.sent.length, 0, 'nothing goes through the inbox on a fresh request');
  } finally { f.cleanup(); }
});

test('a long first line is cut to 80 characters for the card title', async () => {
  const f = fakeDeps();
  try {
    const long = 'x'.repeat(120) + '\nsecond line';
    await S.handleInboundSlack(msg({ text: long }), f.deps);
    assert.ok(f.tasks[0].title.length <= 80, `title is ${f.tasks[0].title.length}`);
    assert.ok(f.tasks[0].title.endsWith('…'));
    assert.ok(!f.tasks[0].title.includes('second line'));
  } finally { f.cleanup(); }
});

test('attachments are listed in the objective and the card, by local path', async () => {
  const f = fakeDeps();
  try {
    await S.handleInboundSlack(msg({ text: '', files: [{ path: '/tmp/slack-files/a.png', name: 'a.png', mimetype: 'image/png' }] }), f.deps);
    const req = JSON.parse(fs.readFileSync(path.join(f.dir, 'spawn-requests', 'slack-1757152800-000100.json'), 'utf8'));
    assert.equal(req.objective, 'Attached files:\n/tmp/slack-files/a.png (a.png)');
    assert.equal(req.name, 'Slack: attachment');
    assert.equal(f.tasks[0].title, 'Slack: attachment', 'no text: the name stands in for the title');
  } finally { f.cleanup(); }
});

test('a follow up in a thread whose temp is alive goes to that temp, not to a new one', async () => {
  const f = fakeDeps({ liveThreadOwner: (t) => (t === '1757152800.000100' ? 'worker-slack-1757152800-000100' : undefined) });
  try {
    const out = await S.handleInboundSlack(msg({ text: 'also check the password reset page', ts: '1757152900.000200', thread_ts: '1757152800.000100' }), f.deps);
    assert.deepEqual(out, { action: 'forwarded', workerId: 'worker-slack-1757152800-000100', taskId: 'task-slack-1757152800-000100' });
    assert.equal(f.sent.length, 1);
    const { msg: m, from } = f.sent[0];
    assert.equal(from, 'slack');
    assert.equal(m.to, 'worker-slack-1757152800-000100');
    assert.equal(m.act, 'request');
    assert.equal(m.conversation, 'worker-slack-1757152800-000100');
    assert.equal(m.subject, 'Slack follow up');
    assert.match(m.body, /^also check the password reset page/);
    assert.match(m.body, /--channel C0123ABCD --thread 1757152800\.000100/);
    assert.ok(!fs.existsSync(path.join(f.dir, 'spawn-requests')), 'no request written');
    assert.equal(f.tasks.length, 0, 'no second card');
    assert.equal(f.informs.length, 0, 'Michael is not told twice about one thread');
    assert.equal(f.acks.length, 1, 'the person still gets the received post');
  } finally { f.cleanup(); }
});

test('a follow up whose temp is gone starts a new temp with the thread so far, minus the request itself', async () => {
  const f = fakeDeps({
    threadSoFar: async (channel, thread) => {
      assert.equal(channel, 'C0123ABCD');
      assert.equal(thread, '1757152800.000100');
      return [
        { user: 'U1', text: 'fix the login bug', ts: '1757152800.000100' },
        { user: 'B1', text: '*Fixed.* Deployed to staging.', ts: '1757152850.000150' },
        { user: 'U1', text: 'it is still blank for me', ts: '1757152900.000200' }
      ];
    }
  });
  try {
    const out = await S.handleInboundSlack(msg({ text: 'it is still blank for me', ts: '1757152900.000200', thread_ts: '1757152800.000100' }), f.deps);
    assert.equal(out.action, 'spawned');
    assert.equal(out.workerId, 'worker-slack-1757152900-000200', 'the new temp is keyed by the follow up message');
    const req = JSON.parse(fs.readFileSync(path.join(f.dir, 'spawn-requests', 'slack-1757152900-000200.json'), 'utf8'));
    assert.equal(req.objective, [
      'it is still blank for me',
      'Thread so far:\n[1757152800.000100] user U1: fix the login bug\n[1757152850.000150] user B1: *Fixed.* Deployed to staging.'
    ].join('\n\n'));
    assert.deepEqual(req.slack, { channel: 'C0123ABCD', thread_ts: '1757152800.000100' }, 'the reply lands in the original thread');
  } finally { f.cleanup(); }
});

test('a top level message never asks Slack for the thread', async () => {
  let asked = 0;
  const f = fakeDeps({ threadSoFar: async () => { asked += 1; return []; } });
  try {
    await S.handleInboundSlack(msg(), f.deps);
    assert.equal(asked, 0);
  } finally { f.cleanup(); }
});

test('threadSoFarLines: oldest first, the last 30 rows, texts cut at 500, markup dropped', () => {
  assert.equal(S.threadSoFarLines([]), '');
  const rows = Array.from({ length: 35 }, (_, i) => ({ user: `U${i}`, text: `m${i}`, ts: `${i}.0` }));
  const block = S.threadSoFarLines(rows);
  assert.ok(block.startsWith('Thread so far:\n[5.0] user U5: m5'));
  assert.ok(block.endsWith('[34.0] user U34: m34'));
  assert.equal(block.split('\n').length, 31);
  const long = S.threadSoFarLines([{ text: 'y'.repeat(600), ts: '1.0' }]);
  assert.match(long, /^Thread so far:\n\[1\.0\] someone: y{500}…$/);
  assert.equal(S.threadSoFarLines([{ user: 'U1', text: 'see <https://a.b/c|the page> and <@U9>', ts: '2.0' }]), 'Thread so far:\n[2.0] user U1: see the page and');
});

test('idempotent: the same message twice writes one request and one card, also once it is archived', async () => {
  const f = fakeDeps();
  try {
    await S.handleInboundSlack(msg(), f.deps);
    const file = path.join(f.dir, 'spawn-requests', 'slack-1757152800-000100.json');
    const first = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, first + '\n', 'utf8');
    const again = await S.handleInboundSlack(msg(), f.deps);
    assert.equal(again.action, 'spawned');
    assert.equal(fs.readFileSync(file, 'utf8'), first + '\n', 'not rewritten');
    assert.equal(f.tasks.length, 1);
    assert.equal(f.informs.length, 1);

    // The watcher moved it under .done: still one temp per message.
    fs.mkdirSync(path.join(f.dir, 'spawn-requests', '.done'), { recursive: true });
    fs.renameSync(file, path.join(f.dir, 'spawn-requests', '.done', 'slack-1757152800-000100.json'));
    await S.handleInboundSlack(msg(), f.deps);
    assert.ok(!fs.existsSync(file), 'not written again after archival');
    assert.equal(f.tasks.length, 1);
  } finally { f.cleanup(); }
});

test('no hive root: the handler throws rather than losing the message silently', async () => {
  const f = fakeDeps({ spawnRequestsDir: () => null });
  try {
    await assert.rejects(() => S.handleInboundSlack(msg(), f.deps), /no hive root/);
  } finally { f.cleanup(); }
});

test('a failing ack or card never stops the temp', async () => {
  const f = fakeDeps({ ack: async () => { throw new Error('slack down'); } });
  f.deps.hive.addTask = () => { throw new Error('ledger locked'); };
  try {
    const out = await S.handleInboundSlack(msg(), f.deps);
    assert.equal(out.action, 'spawned');
    assert.ok(fs.existsSync(path.join(f.dir, 'spawn-requests', 'slack-1757152800-000100.json')));
    assert.equal(f.informs.length, 1);
  } finally { f.cleanup(); }
});

test('onTempFinished: done with the summary as the result, blocked with the reason, false for any other agent', () => {
  const f = fakeDeps();
  try {
    assert.equal(S.onTempFinished('worker-slack-1757152800-000100', { ok: true, body: '  *Fixed.* Deployed to staging.  ' }, f.deps), true);
    assert.deepEqual(f.patches[0], {
      id: 'task-slack-1757152800-000100',
      patch: { status: 'done', result: '*Fixed.* Deployed to staging.', doneAt: '2026-09-06T10:00:00.000Z', updatedAt: '2026-09-06T10:00:00.000Z' }
    });
    assert.equal(S.onTempFinished('worker-slack-1757152800-000100', { ok: false, reason: 'idle for 20 min' }, f.deps), true);
    assert.equal(f.patches[1].patch.status, 'blocked');
    assert.match(f.patches[1].patch.result, /^The temp ended before it finished: idle for 20 min$/);
    assert.equal(S.onTempFinished('worker-slack-1757152800-000100', { ok: true, body: '' }, f.deps), true);
    assert.equal(f.patches[2].patch.result, undefined, 'an empty summary leaves the result unset so the done poster falls back');
    assert.equal(S.onTempFinished('worker-godjob-1', { ok: true, body: 'x' }, f.deps), false, 'not a Slack temp');
    assert.equal(S.onTempFinished('kevin', { ok: false, reason: 'x' }, f.deps), false);
    assert.equal(f.patches.length, 3);
    f.deps.hive.patchTask = () => false;
    assert.equal(S.onTempFinished('worker-slack-1', { ok: true, body: 'x' }, f.deps), false, 'the card is gone');
    f.deps.hive.patchTask = () => { throw new Error('locked'); };
    assert.equal(S.onTempFinished('worker-slack-1', { ok: true, body: 'x' }, f.deps), false, 'a ledger fault reads as not patched');
  } finally { f.cleanup(); }
});

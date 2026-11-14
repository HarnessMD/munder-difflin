'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { HiveManager } = require('./load-ts.cjs')('src/main/hive.ts');

async function floor(t, provider = 'claude', emit) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md outbox errors '));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  t.mock.method(os, 'homedir', () => home);
  const hive = new HiveManager(() => home, emit);
  await hive.ensureAgent({ id: 'god-1', name: 'Michael', provider: 'claude', cwd: home, isGod: true });
  await hive.ensureAgent({ id: 'worker-1', name: 'Pam', provider, cwd: home });
  const outbox = path.join(hive.root(), 'agents', 'worker-1', 'outbox');
  return { hive, outbox };
}

function publish(outbox, raw, filename = 'report.json') {
  const file = path.join(outbox, filename);
  fs.writeFileSync(file, raw);
  return file;
}

function fault(t, method, predicate) {
  const original = fs[method];
  t.mock.method(fs, method, (...args) => {
    if (predicate(...args)) throw Object.assign(new Error('private-payload-do-not-log'), { code: 'EACCES' });
    return original(...args);
  });
}

const events = (hive) => hive.logTail(500).filter(e => e.file === 'report.json');

for (const provider of ['claude', 'codex']) {
  test(`malformed JSON notifies its owning ${provider} sender once without echoing payload`, async t => {
    const { hive, outbox } = await floor(t, provider);
    publish(outbox, '{"from":"god-1","body":"private-payload-do-not-log"');
    assert.equal(hive.routeOnce(), 0);
    const notices = hive.inbox('worker-1');
    assert.equal(notices.length, 1);
    assert.equal(notices[0].from, 'system');
    assert.equal(notices[0].requires_reply, false);
    assert.match(notices[0].body, /malformed-json/);
    assert.match(notices[0].body, /bad-report\.json/);
    assert.equal(hive.inbox('god-1').length, 0);
    assert.equal(fs.existsSync(path.join(outbox, '.sent', 'bad-report.json')), true);
    assert.doesNotMatch(JSON.stringify([...events(hive), ...notices]), /private-payload-do-not-log/);
    hive.routeOnce();
    assert.equal(hive.inbox('worker-1').length, 1);
  });
}

test('a repaired-but-still-invalid document takes the same visible rejection path', async t => {
  const { hive, outbox } = await floor(t);
  publish(outbox, '{"body":"line one\nline two",');
  assert.equal(hive.routeOnce(), 0);
  assert.equal(hive.inbox('worker-1').length, 1);
  assert.equal(events(hive)[0].reason, 'malformed-json');
});

test('normalization failure is distinguished from a JSON syntax error', async t => {
  const { hive, outbox } = await floor(t);
  publish(outbox, 'null');
  assert.equal(hive.routeOnce(), 0);
  assert.equal(events(hive)[0].reason, 'normalize-failed');
  assert.match(hive.inbox('worker-1')[0].body, /normalize-failed/);
});

test('read failure is reported without leaking filesystem exception text', async t => {
  const { hive, outbox } = await floor(t);
  const file = publish(outbox, '{}');
  fault(t, 'readFileSync', p => p === file);
  assert.equal(hive.routeOnce(), 0);
  assert.equal(events(hive)[0].reason, 'read-failed');
  assert.equal(events(hive)[0].code, 'EACCES');
  assert.doesNotMatch(JSON.stringify(events(hive)), /private-payload/);
  assert.match(hive.inbox('worker-1')[0].body, /read-failed/);
});

test('delivery exception reports uncertain delivery and does not block the next file', async t => {
  const { hive, outbox } = await floor(t);
  publish(outbox, JSON.stringify({ id: 'failed-delivery', to: 'god', body: 'private-payload-do-not-log' }));
  publish(outbox, JSON.stringify({ id: 'healthy-delivery', to: 'god', body: 'good' }), 'z-good.json');
  fault(t, 'renameSync', (_from, to) => to === path.join(hive.root(), 'agents', 'god-1', 'inbox', 'failed-delivery.json'));
  assert.equal(hive.routeOnce(), 1);
  assert.equal(events(hive)[0].reason, 'route-failed');
  const notice = hive.inbox('worker-1')[0];
  assert.match(notice.body, /may have reached/);
  assert.doesNotMatch(notice.body, /private-payload/);
  assert.equal(hive.inbox('god-1')[0].body, 'good');
});

test('archive failure says routing completed and does not call it malformed or resend it', async t => {
  const { hive, outbox } = await floor(t);
  publish(outbox, JSON.stringify({ to: 'god', body: 'already delivered' }));
  fault(t, 'renameSync', (_from, to) => to === path.join(outbox, '.sent', 'report.json'));
  hive.routeOnce();
  assert.equal(events(hive)[0].reason, 'archive-failed');
  assert.equal(hive.inbox('god-1').length, 1);
  assert.match(hive.inbox('worker-1')[0].body, /Routing completed/);
  assert.match(hive.inbox('worker-1')[0].body, /do not resend/);
  hive.routeOnce();
  assert.equal(hive.inbox('god-1').length, 1);
});

test('failed quarantine is logged on retry without flooding the sender inbox', async t => {
  const { hive, outbox } = await floor(t);
  const file = publish(outbox, '{');
  const original = fs.renameSync;
  const mock = t.mock.method(fs, 'renameSync', (from, to) => {
    if (from === file) throw Object.assign(new Error('private-payload-do-not-log'), { code: 'EACCES' });
    return original(from, to);
  });
  hive.routeOnce();
  hive.routeOnce();
  assert.equal(fs.existsSync(file), true);
  assert.equal(hive.inbox('worker-1').length, 0);
  const failures = events(hive).filter(e => e.reason === 'quarantine-failed');
  assert.equal(failures.length, 2);
  assert.equal(failures[0].code, 'EACCES');
  mock.mock.restore();
  hive.routeOnce();
  assert.equal(fs.existsSync(file), false);
  assert.equal(hive.inbox('worker-1').length, 1);
});

test('a failed notification leaves a diagnostic and does not stop subsequent routing', async t => {
  const { hive, outbox } = await floor(t);
  publish(outbox, '{');
  publish(outbox, JSON.stringify({ to: 'god', body: 'good' }), 'z-good.json');
  const inbox = path.join(hive.root(), 'agents', 'worker-1', 'inbox');
  fault(t, 'renameSync', (_from, to) => path.dirname(to) === inbox);
  assert.equal(hive.routeOnce(), 1);
  assert.ok(events(hive).some(e => e.reason === 'notification-failed'));
  assert.equal(hive.inbox('god-1')[0].body, 'good');
});

test('partially delivered broadcast warns the sender instead of claiming nothing arrived', async t => {
  const { hive, outbox } = await floor(t);
  await hive.ensureAgent({ id: 'other-1', name: 'Jim', provider: 'claude', cwd: path.dirname(hive.root()) });
  publish(outbox, JSON.stringify({ id: 'broadcast-1', to: 'broadcast', body: 'original' }));
  fault(t, 'renameSync', (_from, to) => to === path.join(hive.root(), 'agents', 'other-1', 'inbox', 'broadcast-1.json'));
  hive.routeOnce();
  assert.equal(hive.inbox('god-1').length, 1);
  assert.equal(hive.inbox('other-1').length, 0);
  assert.match(hive.inbox('worker-1')[0].body, /may have reached some recipients/);
  hive.routeOnce();
  assert.equal(hive.inbox('god-1').length, 1);
});

test('a hookless sender receives the error through its normal terminal handoff', async t => {
  const handoffs = [];
  const { hive, outbox } = await floor(t, 'custom', (event, payload) => {
    if (event === 'hive:terminalHandoff') handoffs.push(payload);
    return true;
  });
  publish(outbox, '{');
  hive.routeOnce();
  assert.equal(handoffs.length, 1);
  assert.equal(handoffs[0].to, 'worker-1');
  assert.match(handoffs[0].body, /malformed-json/);
  assert.equal(handoffs[0].requiresReply, false);
});

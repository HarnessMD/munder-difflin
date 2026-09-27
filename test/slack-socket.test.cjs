// 0.4.11, founder 6 Sep 2026: "add another socket mode for connecting slack".
//
// src/main/slackSocket.ts driven by a fake socket and a fake Slack api: ack
// before any work, a resent envelope deduped, a refresh opens the new socket
// before the old one closes, link disabled stops with the right status, an
// error close reconnects with backoff, reconnectNow, the catch up sweep after
// a reconnect, what the socket delivered is not delivered again by the sweep,
// what arrived during downtime is, and catchupMs 0 means no sweep at all.
// Tokens in here are fakes and never asserted on.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const S = loadTs('src/main/slackSocket.ts');

const BOT = 'U0BOT';
const CH = 'C0CHAN';
const T0 = Date.parse('2026-09-06T10:00:00Z');
const S0 = Math.floor(T0 / 1000) + 10;
const ts = (secs, micros = 0) => `${secs}.${String(micros).padStart(6, '0')}`;
const settle = async (n = 3) => { for (let i = 0; i < n; i += 1) await new Promise((r) => setImmediate(r)); };

/** A fake `ws`: records what was sent, whether it was closed, and lets the test emit frames. */
function fakeWs(url) {
  const handlers = {};
  return {
    url, sent: [], closed: false,
    on(event, cb) { (handlers[event] ??= []).push(cb); },
    send(data) { this.sent.push(JSON.parse(data)); },
    close() { this.closed = true; },
    emit(event, ...args) { for (const cb of handlers[event] ?? []) cb(...args); },
    hello() { this.emit('message', JSON.stringify({ type: 'hello', debug_info: { approximate_connection_time: 3600 } })); },
    disconnect(reason) { this.emit('message', JSON.stringify({ type: 'disconnect', reason })); },
    event(id, ev, extra = {}) {
      this.emit('message', Buffer.from(JSON.stringify({ envelope_id: id, type: 'events_api', retry_attempt: extra.retry ?? 0, payload: { type: 'event_callback', authorizations: [{ user_id: BOT }], event: ev } })));
    }
  };
}
function fakeApi(handlers = {}) {
  const calls = [];
  let opened = 0;
  const api = async (method, token, params) => {
    calls.push({ method, params });
    if (method === 'apps.connections.open' && !handlers[method]) { opened += 1; return { ok: true, json: { ok: true, url: `wss://wss.slack.test/link/${opened}` } }; }
    const h = handlers[method];
    if (typeof h === 'function') return h(params, calls.length);
    if (Array.isArray(h)) return h.length > 1 ? h.shift() : h[0];
    if (h) return h;
    return { ok: true, json: { ok: true, messages: [] } };
  };
  api.calls = calls;
  api.of = (method) => calls.filter((c) => c.method === method);
  return api;
}
const authOk = { ok: true, json: { ok: true, team: 'Acme', user: 'munder', user_id: BOT } };
const history = (messages) => ({ ok: true, json: { ok: true, messages } });
function fakeTimers() {
  const pending = [];
  return {
    pending,
    setTimeout: (fn, ms) => { const h = { fn, ms }; pending.push(h); return h; },
    clearTimeout: (h) => { const i = pending.indexOf(h); if (i >= 0) pending.splice(i, 1); },
    fire: async (h) => { const i = pending.indexOf(h); if (i >= 0) pending.splice(i, 1); h.fn(); await settle(); }
  };
}
const tmpState = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'slack-socket-')), 'slack-poll.json');

function client(api, extra = {}) {
  const sockets = [];
  const delivered = [];
  const log = [];
  const timers = fakeTimers();
  let now = T0;
  const c = new S.SlackSocketClient({
    appToken: 'xapp-test', botToken: 'xoxb-test', channelId: CH, catchupMs: 0, stateFile: tmpState(),
    onMessage: (m) => { delivered.push(m); log.push(`delivered ${m.ts}`); },
    api, wsFactory: (url) => { const w = fakeWs(url); sockets.push(w); return w; },
    log: (l) => log.push(l), now: () => now, timers, ...extra
  });
  return { c, sockets, delivered, log, timers, tick: (ms) => { now += ms; } };
}
const mention = (n, text = 'ask') => ({ type: 'message', user: 'U1', channel: CH, text: `<@${BOT}> ${text}`, ts: ts(S0 + n) });

test('start: auth.test, then apps.connections.open, then a socket; hello means connected; a bad token fails closed', async () => {
  const api = fakeApi({ 'auth.test': authOk });
  const { c, sockets } = client(api);
  const r = await c.start();
  assert.deepEqual(r, { ok: true, team: 'Acme', botName: 'munder' });
  assert.deepEqual(api.calls.map((x) => x.method), ['auth.test', 'apps.connections.open']);
  assert.equal(sockets.length, 1);
  assert.equal(sockets[0].url, 'wss://wss.slack.test/link/1');
  assert.equal(c.status().connected, false, 'not connected until hello');
  sockets[0].hello();
  assert.deepEqual([c.status().connected, c.status().connectedAt, c.status().botUserId], [true, T0, BOT]);
  c.stop();
  assert.equal(sockets[0].closed, true);
  const bad = client(fakeApi({ 'auth.test': { ok: false, error: 'invalid_auth' } }));
  assert.deepEqual(await bad.c.start(), { ok: false, error: 'invalid_auth' });
  assert.equal(bad.sockets.length, 0);
});

test('an envelope is acknowledged before any work, and a resent envelope is delivered once', async () => {
  const api = fakeApi({ 'auth.test': authOk });
  const { c, sockets, delivered, log } = client(api);
  await c.start();
  const w = sockets[0];
  w.hello();
  w.event('e1', mention(1));
  assert.deepEqual(w.sent[0], { envelope_id: 'e1' });
  assert.ok(log.indexOf('delivered ' + ts(S0 + 1)) >= 0, 'delivered');
  w.event('e1', mention(1), { retry: 1 });
  assert.deepEqual(w.sent[1], { envelope_id: 'e1' }, 'the resend is acknowledged too');
  assert.equal(delivered.length, 1, 'but delivered once');
  assert.equal(delivered[0].text, 'ask', 'mention stripped');
  assert.equal(delivered[0].thread_ts, ts(S0 + 1));
  w.event('e2', { type: 'message', user: 'U1', channel: CH, text: 'plain chatter', ts: ts(S0 + 2) });
  assert.equal(delivered.length, 1, 'chatter without a mention is not delivered');
  w.event('e3', { type: 'message', user: 'U1', channel: CH, text: 'follow up', ts: ts(S0 + 3), thread_ts: ts(S0 + 1) });
  assert.equal(delivered.length, 2, 'a reply in the mentioned thread is');
  w.event('e4', { type: 'message', bot_id: 'B1', channel: CH, text: `<@${BOT}> from a bot`, ts: ts(S0 + 4) });
  assert.equal(delivered.length, 2, 'bots never trigger');
  c.stop();
});

test('a refresh opens the new socket first and closes the old one on the new hello', async () => {
  const api = fakeApi({ 'auth.test': authOk });
  const { c, sockets } = client(api);
  await c.start();
  sockets[0].hello();
  sockets[0].disconnect('refresh_requested');
  await settle();
  assert.equal(sockets.length, 2, 'apps.connections.open again, a new socket');
  assert.equal(api.of('apps.connections.open').length, 2);
  assert.equal(sockets[0].closed, false, 'the old socket stays until the new one is up');
  sockets[1].hello();
  assert.equal(sockets[0].closed, true, 'closed on the new hello');
  assert.equal(c.status().connected, true);
  sockets[0].emit('close');
  await settle();
  assert.equal(sockets.length, 2, 'the retired socket closing does not reconnect');
  sockets[1].disconnect('warning');
  await settle();
  assert.equal(sockets.length, 3, 'a warning is a refresh too');
  c.stop();
});

test('link_disabled stops the client and says why; nothing reconnects', async () => {
  const api = fakeApi({ 'auth.test': authOk });
  const { c, sockets, timers } = client(api);
  await c.start();
  sockets[0].hello();
  sockets[0].disconnect('link_disabled');
  await settle();
  assert.deepEqual([c.status().running, c.status().connected, c.status().lastError], [false, false, S.LINK_DISABLED_MESSAGE]);
  assert.equal(sockets[0].closed, true);
  assert.equal(timers.pending.length, 0, 'no reconnect timer');
  sockets[0].emit('close');
  await settle();
  assert.equal(sockets.length, 1);
});

test('an error close reconnects with backoff, 2 s doubling to 60 s, and a hello resets it', async () => {
  const api = fakeApi({ 'auth.test': authOk });
  const { c, sockets, timers, log, tick } = client(api);
  await c.start();
  sockets[0].hello();
  const delays = [];
  for (let i = 0; i < 7; i += 1) {
    const live = sockets[sockets.length - 1];
    live.emit('error', new Error('ECONNRESET'));
    live.emit('close');
    await settle();
    assert.equal(timers.pending.length, 1, `attempt ${i + 1}: one reconnect timer`);
    delays.push(timers.pending[0].ms);
    assert.equal(c.status().nextReconnectAt, T0 + timers.pending[0].ms);
    assert.equal(c.status().connected, false);
    await timers.fire(timers.pending[0]);
    assert.equal(sockets.length, i + 2, 'a new socket per attempt');
  }
  assert.deepEqual(delays, [2000, 4000, 8000, 16000, 32000, 60000, 60000]);
  sockets[sockets.length - 1].hello();
  assert.equal(c.status().nextReconnectAt, undefined);
  const live = sockets[sockets.length - 1];
  live.emit('close');
  await settle();
  assert.equal(timers.pending[0].ms, 2000, 'a hello resets the backoff');
  assert.ok(log.some((l) => l.startsWith('socket: reconnect in 2 s')));
  assert.ok(!log.some((l) => l.includes('xapp') || l.includes('xoxb')), 'no token in any log line');
  tick(0);
  c.stop();
});

test('reconnectNow drops the backoff, closes the dead socket and opens a new one at once', async () => {
  const api = fakeApi({ 'auth.test': authOk });
  const { c, sockets, timers } = client(api);
  await c.start();
  sockets[0].hello();
  sockets[0].emit('close');
  await settle();
  assert.equal(timers.pending.length, 1);
  c.reconnectNow();
  await settle();
  assert.equal(timers.pending.length, 0, 'the pending timer is cancelled');
  assert.equal(sockets.length, 2, 'a new socket now');
  sockets[1].hello();
  assert.equal(c.status().connected, true);
  // A laptop that slept: the socket is dead but never said so.
  c.reconnectNow();
  await settle();
  assert.equal(sockets[1].closed, true, 'the silent socket is closed');
  assert.equal(sockets.length, 3);
  c.stop();
});

test('with a catch up cadence: a sweep runs on every hello, what the socket delivered is not delivered again, what arrived during downtime is', async () => {
  const stamps = [];
  const api = fakeApi({
    'auth.test': authOk,
    'conversations.history': (params) => { stamps.push(params.oldest); return history(stamps.length === 2 ? [mention(1), mention(5, 'while you were away')] : []); },
    'conversations.replies': history([])
  });
  const { c, sockets, delivered, timers } = client(api, { catchupMs: 300_000 });
  await c.start();
  assert.ok(timers.pending.some((h) => h.ms === 0), 'the poller armed its first check');
  timers.pending.length = 0;
  sockets[0].hello();
  await settle();
  assert.equal(api.of('conversations.history').length, 1, 'one sweep on hello');
  assert.equal(c.status().lastCatchupAt, T0);
  sockets[0].event('e1', mention(1));
  assert.equal(delivered.length, 1);
  sockets[0].emit('close');
  await settle();
  await timers.fire(timers.pending.find((h) => h.ms === 2000));
  sockets[1].hello();
  await settle();
  assert.equal(api.of('conversations.history').length, 2, 'a sweep on the reconnect hello');
  assert.equal(stamps[1], ts(S0 + 1), 'the sweep asks for what came after the socket delivered message');
  assert.deepEqual(delivered.map((m) => m.text), ['ask', 'while you were away'], 'the socket delivered message is not repeated; the one from downtime is delivered by the sweep');
  assert.equal(c.status().hotThreads, 2);
  c.stop();
});

test('catchupMs 0 means no sweep at all', async () => {
  const api = fakeApi({ 'auth.test': authOk });
  const { c, sockets, timers } = client(api, { catchupMs: 0 });
  await c.start();
  sockets[0].hello();
  sockets[0].event('e1', mention(1));
  await settle();
  assert.equal(api.of('conversations.history').length, 0);
  assert.equal(timers.pending.length, 0);
  assert.equal(c.status().hotThreads, 1, 'counted from the in memory set');
  c.stop();
});

test('slackConnectionsOpenTest answers the Test connection button', async () => {
  assert.deepEqual(await S.slackConnectionsOpenTest('xapp-test', fakeApi()), { ok: true });
  assert.deepEqual(await S.slackConnectionsOpenTest('xapp-test', fakeApi({ 'apps.connections.open': { ok: false, error: 'invalid_auth' } })), { ok: false, error: 'invalid_auth' });
  assert.deepEqual(await S.slackConnectionsOpenTest('', fakeApi()), { ok: false, error: 'missing app token' });
});

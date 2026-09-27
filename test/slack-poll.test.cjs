// 0.4.11, founder 6 Sep 2026: "instead of relying on webhooks they can just
// rely on polling every minute once maybe, whatever is under the limit."
//
// The pure core (src/main/slack-poll.cjs) and the poller (src/main/slackPoller.ts)
// driven by a fake Slack api and a temp state file: cursor, ordering, hot
// threads, budget, backoff, terminal errors, first run, dedup after a state
// reload, noteDelivered. Tokens in here are fakes and never asserted on.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const core = require('../src/main/slack-poll.cjs');
const P = loadTs('src/main/slackPoller.ts');

const BOT = 'U0BOT';
const CH = 'C0CHAN';
const T0 = Date.parse('2026-09-06T10:00:00Z');
const S0 = Math.floor(T0 / 1000) + 10;   // message stamps sit after the first run cursor (= T0)
const ts = (secs, micros = 0) => `${secs}.${String(micros).padStart(6, '0')}`;

// ─── pure core ────────────────────────────────────────────────────────────────

test('compareTs never goes through a double: a microsecond apart is still apart', () => {
  assert.equal(core.compareTs('1700000000.000100', '1700000000.000099'), 1);
  assert.equal(core.compareTs('1700000000.000100', '1700000000.000100'), 0);
  assert.equal(core.compareTs('1700000000.0001', '1700000000.000100'), 0, 'padding is not a difference');
  assert.equal(core.compareTs('999999999.999999', '1000000000.000000'), -1, 'a longer integer part is later');
  assert.equal(core.tsFromMs(T0), `${Math.floor(T0 / 1000)}.000000`);
});

test('state: a first run starts at now, a channel change or a corrupt file resets, a good file round trips', () => {
  const fresh = core.createState(CH, T0);
  assert.equal(fresh.cursor, core.tsFromMs(T0), 'first run cursor = now, so history is never replayed');
  assert.deepEqual(fresh.threads, {});
  assert.equal(core.loadState('not json', CH, T0).cursor, fresh.cursor);
  assert.equal(core.loadState(JSON.stringify({ ...fresh, channel: 'C0OTHER', cursor: '1.000000' }), CH, T0).cursor, fresh.cursor, 'another channel reads as fresh');
  const saved = core.createState(CH, T0);
  saved.cursor = ts(S0 + 100);
  core.noteThreadActivity(saved, ts(S0 + 50), ts(S0 + 60), T0, { mentioned: true });
  const back = core.loadState(core.serializeState(saved), CH, T0 + 5);
  assert.equal(back.cursor, ts(S0 + 100));
  assert.equal(back.threads[ts(S0 + 50)].lastReplyTs, ts(S0 + 60));
  assert.ok(back.threads[ts(S0 + 50)].activatedAt > 0);
  assert.ok(!core.serializeState(saved).includes('xoxb'), 'the state never holds a token');
});

test('ordering: Slack answers newest first, the office delivers oldest first, and the cursor only moves forward', () => {
  const state = core.createState(CH, T0);
  state.cursor = ts(100);
  const msgs = [{ ts: ts(103) }, { ts: ts(101) }, { ts: ts(100) }, { text: 'no ts' }, { ts: ts(102) }];
  assert.deepEqual(core.sortOldestFirst(msgs).map((m) => m.ts), [ts(100), ts(101), ts(102), ts(103)]);
  assert.deepEqual(core.afterCursor(state, msgs).map((m) => m.ts), [ts(101), ts(102), ts(103)], 'the message at the cursor has been seen');
  assert.equal(core.advanceCursor(state, msgs), ts(103));
  assert.equal(core.advanceCursor(state, [{ ts: ts(50) }]), ts(103), 'never backwards');
});

test('hot threads: mentioned and active in the last day, least recently checked first, at most the budget, pruned after a week', () => {
  const state = core.createState(CH, T0);
  const H = 3600 * 1000;
  for (let i = 0; i < 12; i += 1) core.noteThreadActivity(state, ts(1000 + i), ts(1000 + i), T0 - i * H, { mentioned: true });
  core.noteThreadActivity(state, ts(2000), ts(2000), T0 - 30 * H, { mentioned: true });   // cold
  core.noteThreadActivity(state, ts(3000), ts(3000), T0);                                   // never mentioned
  state.threads[ts(1000)].lastCheckedAt = T0;                                               // just checked
  const hot = core.hotThreads(state, T0, 10);
  assert.equal(hot.length, 10);
  assert.ok(!hot.includes(ts(2000)), 'a thread quiet for 30 h is cold');
  assert.ok(!hot.includes(ts(3000)), 'a thread the bot was never mentioned in is not polled');
  assert.equal(hot[hot.length - 1] !== ts(1000) && !hot.includes(ts(1000)), true, 'the just checked thread waits its turn behind the budget');
  assert.equal(core.hotThreadCount(state, T0), 12);
  core.pruneThreads(state, T0 + 8 * 24 * H);
  assert.deepEqual(Object.keys(state.threads), [], 'a week of silence forgets the thread');
});

test('backoff: a 429 halves the budget to a floor of 1 and doubles the interval up to 10 min, Retry-After is honoured, ten clean ticks restore', () => {
  const b = core.createBackoff();
  assert.equal(core.nextDelayMs(b, 60_000), 60_000);
  core.onRateLimited(b, 90_000);
  assert.deepEqual([b.budget, b.factor], [5, 2]);
  assert.equal(core.nextDelayMs(b, 60_000), 120_000);
  core.onRateLimited(b, 500_000);
  assert.equal(core.nextDelayMs(b, 60_000), 500_000, 'never sooner than Retry-After');
  for (let i = 0; i < 6; i += 1) core.onRateLimited(b);
  assert.equal(b.budget, 1, 'floor 1');
  assert.equal(core.nextDelayMs(b, 60_000), 600_000, 'capped at 10 min');
  for (let i = 0; i < 9; i += 1) core.onCleanTick(b);
  assert.equal(b.budget, 1, 'nine clean ticks are not enough');
  core.onCleanTick(b);
  assert.deepEqual([b.budget, b.factor, core.nextDelayMs(b, 60_000)], [10, 1, 60_000]);
  assert.equal(core.retryAfterFromHeader('3'), 3000);
  assert.equal(core.retryAfterFromHeader(undefined), 60_000, 'no header reads as a minute');
});

test('terminal errors stop the loop; anything else retries', () => {
  for (const e of ['invalid_auth', 'not_in_channel', 'missing_scope', 'channel_not_found', 'account_inactive', 'token_revoked']) assert.ok(core.isTerminalError(e), e);
  assert.ok(!core.isTerminalError('ratelimited'));
  assert.ok(!core.isTerminalError('ECONNRESET'));
});

test('socket frames: hello, disconnect with a reason, an events_api envelope, an unknown envelope, garbage', () => {
  assert.deepEqual(core.parseSocketFrame('{"type":"hello","debug_info":{"approximate_connection_time":3600}}'), { kind: 'hello', approxLifetimeMs: 3_600_000 });
  assert.deepEqual(core.parseSocketFrame(Buffer.from('{"type":"disconnect","reason":"refresh_requested"}')), { kind: 'disconnect', reason: 'refresh_requested' });
  const env = core.parseSocketFrame(JSON.stringify({ envelope_id: 'e1', type: 'events_api', retry_attempt: 1, payload: { type: 'event_callback', authorizations: [{ user_id: BOT }], event: { type: 'message', text: 'hi', ts: ts(1), channel: CH } } }));
  assert.equal(env.kind, 'event');
  assert.equal(env.envelopeId, 'e1');
  assert.equal(env.retryAttempt, 1);
  assert.equal(env.event.text, 'hi');
  assert.equal(env.authorizations[0].user_id, BOT);
  assert.equal(core.parseSocketFrame('{"envelope_id":"e2","type":"interactive","payload":{}}').kind, 'other');
  assert.equal(core.parseSocketFrame('{{').kind, 'invalid');
  assert.equal(core.parseSocketFrame('[]').kind, 'other');
  assert.equal(core.withChannel({ ts: '1' }, CH).channel, CH);
  assert.ok(core.mentionsBot({ type: 'message', text: `<@${BOT}> hi` }, BOT));
  assert.ok(core.mentionsBot({ type: 'app_mention', text: 'hi' }, null));
  assert.ok(!core.mentionsBot({ type: 'message', text: 'hi' }, BOT));
});

// ─── the poller against a fake Slack ─────────────────────────────────────────

/** A fake Web API: answers per method from a queue, or a function, and records every call. */
function fakeApi(handlers = {}) {
  const calls = [];
  const api = async (method, token, params) => {
    calls.push({ method, params });
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
    fireNext: async () => { const h = pending.shift(); if (h) { h.fn(); await settle(); } return h?.ms; }
  };
}
const settle = () => new Promise((r) => setImmediate(r));
const tmpState = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'slack-poll-')), 'slack-poll.json');

function poller(api, extra = {}) {
  const delivered = [];
  const log = [];
  const timers = fakeTimers();
  const p = new P.SlackPoller({
    botToken: 'xoxb-test', channelId: CH, intervalMs: 0, stateFile: tmpState(),
    onMessage: (m) => { delivered.push(m); }, api, log: (l) => log.push(l), now: () => T0, timers, ...extra
  });
  return { p, delivered, log, timers };
}

test('start fails closed on a bad token, and on a good one learns who the bot is and writes a token free state file', async () => {
  const bad = poller(fakeApi({ 'auth.test': { ok: false, error: 'invalid_auth' } }));
  assert.deepEqual(await bad.p.start(), { ok: false, error: 'invalid_auth' });
  assert.equal(bad.p.status().running, false);
  const api = fakeApi({ 'auth.test': authOk });
  const { p } = poller(api);
  const r = await p.start();
  assert.deepEqual(r, { ok: true, team: 'Acme', botName: 'munder' });
  const s = p.status();
  assert.deepEqual([s.running, s.team, s.botName, s.botUserId, s.hotThreads], [true, 'Acme', 'munder', BOT, 0]);
  const file = fs.readFileSync(p['opts'].stateFile, 'utf8');
  assert.ok(!file.includes('xoxb'), 'no token in the state file');
  assert.equal(JSON.parse(file).cursor, core.tsFromMs(T0), 'first run cursor = now');
  assert.ok(!P.slackAuthTest.toString().includes('console.'), 'auth.test never logs');
});

test('a sweep asks for what came after the cursor, delivers oldest first through the trigger rules, and moves the cursor', async () => {
  const api = fakeApi({
    'auth.test': authOk,
    'conversations.history': [history([
      { type: 'message', user: 'U1', text: 'plain chatter', ts: ts(S0 + 3) },
      { type: 'message', user: 'U1', text: `<@${BOT}> second ask`, ts: ts(S0 + 2) },
      { type: 'message', user: 'U1', text: `<@${BOT}> first ask`, ts: ts(S0 + 1), files: [{ id: 'F1', url_private: 'https://files/1', name: 'a.png' }] },
      { type: 'message', bot_id: 'B1', text: `<@${BOT}> from a bot`, ts: ts(S0 + 0, 500) }
    ])]
  });
  const { p, delivered } = poller(api);
  await p.start();
  const r = await p.sweepNow();
  assert.deepEqual(r, { ok: true, delivered: 2 });
  assert.equal(api.of('conversations.history')[0].params.oldest, core.tsFromMs(T0), 'oldest = the cursor');
  assert.deepEqual(delivered.map((m) => m.text), ['first ask', 'second ask'], 'oldest first, mention stripped, chatter and bots skipped');
  assert.deepEqual(delivered[0]._rawFiles.map((f) => f.id), ['F1']);
  assert.equal(delivered[0].thread_ts, ts(S0 + 1), 'a parent is its own thread');
  assert.equal(JSON.parse(fs.readFileSync(p['opts'].stateFile, 'utf8')).cursor, ts(S0 + 3), 'the cursor is the newest ts seen, chatter included');
  assert.equal(p.status().hotThreads, 2, 'both asks opened hot threads');
  assert.equal(p.status().lastPollAt, T0);
});

test('a mentioned thread is polled for replies after its last reply; human replies deliver, the bot\'s own do not, and the thread is not re fetched', async () => {
  const parent = ts(S0 + 1);
  const api = fakeApi({
    'auth.test': authOk,
    'conversations.history': [history([{ type: 'message', user: 'U1', text: `<@${BOT}> ask`, ts: parent }]), history([])],
    'conversations.replies': [
      history([
        { type: 'message', user: 'U1', text: 'ask', ts: parent, thread_ts: parent },
        { type: 'message', user: 'U1', text: 'and one more thing', ts: ts(S0 + 5), thread_ts: parent },
        { type: 'message', bot_id: 'B1', text: 'working on it', ts: ts(S0 + 6), thread_ts: parent }
      ]),
      history([])
    ]
  });
  const { p, delivered } = poller(api);
  await p.start();
  await p.sweepNow();
  await p.sweepNow();
  const reps = api.of('conversations.replies');
  assert.equal(reps.length, 2);
  assert.deepEqual([reps[0].params.ts, reps[0].params.oldest], [parent, parent], 'first replies call starts at the parent');
  assert.equal(reps[1].params.oldest, ts(S0 + 6), 'the next call starts after the newest reply, the bot\'s included');
  assert.deepEqual(delivered.map((m) => [m.text, m.thread_ts]), [['ask', parent], ['and one more thing', parent]]);
});

test('the replies budget: ten threads a tick, the least recently checked first, the rest next tick', async () => {
  const api = fakeApi({ 'auth.test': authOk, 'conversations.history': history([]), 'conversations.replies': history([]) });
  const { p } = poller(api);
  await p.start();
  for (let i = 0; i < 12; i += 1) p.noteDelivered({ channel: CH, ts: ts(S0 + 100 + i), thread_ts: ts(S0 + 100 + i), mentioned: true });
  await p.sweepNow();
  const first = api.of('conversations.replies').map((c) => c.params.ts);
  assert.equal(first.length, 10);
  await p.sweepNow();
  const second = api.of('conversations.replies').slice(10).map((c) => c.params.ts);
  assert.equal(second.length, 10);
  assert.deepEqual(second.slice(0, 2), [ts(S0 + 110), ts(S0 + 111)], 'the two that waited go first');
});

test('a 429 backs off: Retry-After sets the next tick, the budget halves, ten clean ticks restore the cadence', async () => {
  let historyCalls = 0;
  const api = fakeApi({
    'auth.test': authOk,
    'conversations.history': () => { historyCalls += 1; return historyCalls === 1 ? { ok: false, status: 429, error: 'ratelimited', retryAfterMs: 90_000 } : history([]); }
  });
  const { p, timers } = poller(api, { intervalMs: 60_000 });
  await p.start();
  assert.equal(timers.pending[0].ms, 0, 'the first check runs at once');
  await timers.fireNext();
  assert.equal(timers.pending[0].ms, 120_000, 'doubled, and past Retry-After');
  assert.match(p.status().lastError, /slow down/);
  assert.equal(p.status().running, true, 'a 429 is not terminal');
  for (let i = 0; i < 9; i += 1) { await timers.fireNext(); assert.equal(timers.pending[0].ms, 120_000, `tick ${i + 1} still doubled`); }
  await timers.fireNext();
  assert.equal(timers.pending[0].ms, 60_000, 'ten clean ticks restore the interval');
  assert.equal(p.status().lastError, undefined);
  p.stop();
  assert.equal(timers.pending.length, 0, 'stop disarms the timer');
});

test('a terminal Slack error stops the loop and keeps the exact error; a network error keeps the cursor and retries', async () => {
  const api = fakeApi({ 'auth.test': authOk, 'conversations.history': { ok: false, error: 'not_in_channel' } });
  const { p, timers, log } = poller(api, { intervalMs: 60_000 });
  await p.start();
  await timers.fireNext();
  assert.deepEqual([p.status().running, p.status().lastError, p.status().nextPollAt, timers.pending.length], [false, 'not_in_channel', undefined, 0]);
  assert.ok(log.some((l) => l.includes('stopped (not_in_channel)')));
  const api2 = fakeApi({ 'auth.test': authOk, 'conversations.history': { ok: false, error: 'ECONNRESET' } });
  const two = poller(api2, { intervalMs: 60_000 });
  await two.p.start();
  const before = JSON.parse(fs.readFileSync(two.p['opts'].stateFile, 'utf8')).cursor;
  await two.timers.fireNext();
  assert.deepEqual([two.p.status().running, two.p.status().lastError, two.timers.pending[0].ms], [true, 'ECONNRESET', 60_000]);
  assert.equal(JSON.parse(fs.readFileSync(two.p['opts'].stateFile, 'utf8')).cursor, before, 'the cursor did not move');
});

test('after a restart the saved cursor keeps an already delivered message out, and the hot thread survives the reload', async () => {
  const stateFile = tmpState();
  const msg = { type: 'message', user: 'U1', text: `<@${BOT}> once`, ts: ts(S0 + 1) };
  const api = fakeApi({ 'auth.test': authOk, 'conversations.history': history([msg]), 'conversations.replies': history([]) });
  const one = poller(api, { stateFile });
  await one.p.start();
  await one.p.sweepNow();
  one.p.stop();
  assert.equal(one.delivered.length, 1);
  const two = poller(api, { stateFile });
  await two.p.start();
  assert.equal(two.p.status().hotThreads, 1, 'the mentioned thread is hot after the reload');
  await two.p.sweepNow();
  assert.equal(two.delivered.length, 0, 'the same message, answered again by the fake, is behind the cursor');
  assert.equal(api.of('conversations.history').pop().params.oldest, ts(S0 + 1));
  assert.equal(api.of('conversations.replies').pop().params.ts, ts(S0 + 1), 'and its replies are still checked');
});

test('noteDelivered: what the socket brought moves the cursor and the thread past it and marks it seen', async () => {
  const api = fakeApi({ 'auth.test': authOk, 'conversations.history': history([{ type: 'message', user: 'U1', text: `<@${BOT}> same`, ts: ts(S0 + 10) }]), 'conversations.replies': history([]) });
  const { p, delivered } = poller(api);
  await p.start();
  p.noteDelivered({ channel: CH, ts: ts(S0 + 10), thread_ts: ts(S0 + 10), mentioned: true });
  p.noteDelivered({ channel: CH, ts: ts(S0 + 12), thread_ts: ts(S0 + 10), mentioned: false });
  await p.sweepNow();
  assert.equal(delivered.length, 0, 'the message the socket delivered is not delivered again');
  assert.equal(api.of('conversations.history')[0].params.oldest, ts(S0 + 10), 'the cursor moved to the socket delivered parent');
  assert.equal(api.of('conversations.replies')[0].params.oldest, ts(S0 + 12), 'the thread starts after the socket delivered reply');
});

test('fetchThread answers oldest first with the parent, and slackAuthTest maps team, handle and user id', async () => {
  const api = fakeApi({
    'auth.test': authOk,
    'conversations.replies': history([{ user: 'U2', text: 'later', ts: ts(5) }, { user: 'U1', text: 'root', ts: ts(1) }])
  });
  assert.deepEqual(await P.fetchThread('xoxb-test', CH, ts(1), api), [{ user: 'U1', text: 'root', ts: ts(1) }, { user: 'U2', text: 'later', ts: ts(5) }]);
  assert.deepEqual(await P.slackAuthTest('xoxb-test', api), { ok: true, team: 'Acme', botName: 'munder', botUserId: BOT });
  assert.deepEqual(await P.slackAuthTest('xoxb-test', fakeApi({ 'auth.test': { ok: false, error: 'invalid_auth' } })), { ok: false, error: 'invalid_auth' });
});

test('the wiring the build depends on: the sidecar is copied next to the bundle and the module never imports electron', () => {
  const vite = fs.readFileSync(path.join(__dirname, '..', 'electron.vite.config.ts'), 'utf8');
  assert.match(vite, /\['src\/main\/slack-poll\.cjs', 'out\/main\/slack-poll\.cjs'\]/);
  for (const f of ['src/main/slackPoller.ts', 'src/main/slackSocket.ts', 'src/main/slack-poll.cjs']) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/from 'electron'|require\('electron'\)/.test(src), `${f} stays electron free`);
    // Copy means comments; `a - b` in code is arithmetic, not a dash.
    const comments = src.split('\n').filter((l) => /^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');
    assert.ok(!/[–—]|\s-\s/.test(comments), `${f}: no dashes in copy`);
  }
});

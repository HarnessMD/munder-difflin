'use strict';

// Read-ack 👍 on ingest: when SlackWebhookServer accepts a NEW inbound user
// message (the point it becomes a kanban card), it adds a Slack reaction
// (reactions.add, name='+1') to that message. Proven here by driving the server
// over HTTP with valid Slack signatures and an INJECTED reactFn (Slack mocked, no
// real HTTP, no token needed). Also unit-tests the pure result mapper.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createHmac } = require('node:crypto');
const loadTs = require('./load-ts.cjs');

const { SlackWebhookServer, mapReactionResult } = loadTs('src/main/slack.ts');

const SIGNING_SECRET = 's'.repeat(32);
const BOT = 'U0BOT';
const CH = 'C0CHAN';
const FAKE_TOKEN = 'xoxb-fake-token';
const SEEDED_ROOT = '1788400000.000100'; // a thread the bot already replied in

function sign(tsSec, rawBody) {
  return 'v0=' + createHmac('sha256', SIGNING_SECRET).update(`v0:${tsSec}:${rawBody}`).digest('hex');
}

function post(port, payloadObj) {
  const rawBody = JSON.stringify(payloadObj);
  const tsSec = Math.floor(Date.now() / 1000).toString();
  return new Promise((resolve, reject) => {
    const req = http.request({
      method: 'POST', hostname: '127.0.0.1', port, path: '/', agent: false,
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(rawBody),
        'x-slack-request-timestamp': tsSec,
        'x-slack-signature': sign(tsSec, rawBody),
      },
    }, (res) => { res.on('data', () => {}); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject);
    req.write(rawBody); req.end();
  });
}

function evt(event) {
  return { type: 'event_callback', authorizations: [{ user_id: BOT }], event };
}
function mention(ts, text = `<@${BOT}> do X`) {
  return evt({ type: 'app_mention', channel: CH, user: 'U0HUMAN', text, ts });
}
function plainReply(root, ts, text = 'follow-up, no mention') {
  return evt({ type: 'message', channel: CH, user: 'U0HUMAN', text, ts, thread_ts: root });
}

async function startServer(opts) {
  const seen = [];
  const reactions = [];
  const reactFn = opts && opts.reactFn
    ? opts.reactFn
    : async (o) => { reactions.push(o); return { ok: true }; };
  for (const port of [39870, 39871, 39872, 39873, 39874]) {
    const server = new SlackWebhookServer({
      port, signingSecret: SIGNING_SECRET, channelId: CH, skipTunnel: true,
      getBotToken: () => FAKE_TOKEN,
      reactFn,
      onMessage: (m) => seen.push(m),
      ...opts,
    });
    const res = await server.start();
    if (res.ok) return { server, port, seen, reactions };
    server.stop();
    if (!/failed to bind/.test(res.error || '')) throw new Error(`start error: ${res.error}`);
  }
  throw new Error('no free test port');
}

const settle = () => new Promise((r) => setImmediate(r));

// ─── ingest → read-ack wiring ────────────────────────────────────────────────

test('👍 added to an @-mention message: correct channel/ts/name + token from main', async () => {
  const { server, port, seen, reactions } = await startServer({});
  try {
    assert.equal(await post(port, mention('1788400100.000200')), 200);
    await settle();
    assert.equal(seen.length, 1, 'message ingested (card created)');
    assert.equal(reactions.length, 1, 'exactly one reaction added');
    assert.equal(reactions[0].channel, CH);
    assert.equal(reactions[0].timestamp, '1788400100.000200', 'reacts to the user message ts');
    assert.equal(reactions[0].name, '+1');
    assert.equal(reactions[0].botToken, FAKE_TOKEN, 'token supplied by main via getBotToken');
  } finally { server.stop(); }
});

test('👍 added to a plain reply in a seeded bot thread (genuine inbound, no mention)', async () => {
  const { server, port, seen, reactions } = await startServer({ initialActivatedThreads: [SEEDED_ROOT] });
  try {
    assert.equal(await post(port, plainReply(SEEDED_ROOT, '1788400200.000200')), 200);
    await settle();
    assert.equal(seen.length, 1);
    assert.equal(reactions.length, 1, 'read-ack on a bot-thread reply');
    assert.equal(reactions[0].timestamp, '1788400200.000200');
  } finally { server.stop(); }
});

test('NO 👍 for the bot\'s own posts or unrelated channel chatter', async () => {
  const { server, port, seen, reactions } = await startServer({ initialActivatedThreads: [SEEDED_ROOT] });
  try {
    // Bot's own message (bot_id present) — never react.
    assert.equal(await post(port, evt({ type: 'message', channel: CH, bot_id: 'B0BOT', text: 'i am the bot', ts: '1788400300.000200' })), 200);
    // Unrelated top-level human message (no mention, not in a bot thread) — not a card.
    assert.equal(await post(port, evt({ type: 'message', channel: CH, user: 'U0HUMAN', text: 'just chatting', ts: '1788400301.000200' })), 200);
    await settle();
    assert.equal(seen.length, 0, 'neither becomes a card');
    assert.equal(reactions.length, 0, 'no read-ack on non-ingested messages');
  } finally { server.stop(); }
});

test('👍 added ONCE per logical message (dedup: same channel:ts delivered twice)', async () => {
  const { server, port, seen, reactions } = await startServer({});
  try {
    // Same message arrives as app_mention AND message.* (shared channel:ts).
    const ts = '1788400400.000200';
    assert.equal(await post(port, mention(ts)), 200);
    assert.equal(await post(port, evt({ type: 'message', channel: CH, user: 'U0HUMAN', text: `<@${BOT}> do X`, ts })), 200);
    await settle();
    assert.equal(seen.length, 1, 'onMessage deduped');
    assert.equal(reactions.length, 1, 'reaction deduped too');
  } finally { server.stop(); }
});

test('reactions DISABLED when no bot-token accessor is wired (getBotToken omitted)', async () => {
  // Explicitly pass getBotToken: undefined to override startServer's default.
  const { server, port, seen, reactions } = await startServer({ getBotToken: undefined });
  try {
    assert.equal(await post(port, mention('1788400500.000200')), 200);
    await settle();
    assert.equal(seen.length, 1, 'ingestion unaffected');
    assert.equal(reactions.length, 0, 'no reaction attempted without a token accessor');
  } finally { server.stop(); }
});

test('a reaction failure NEVER breaks ingestion (missing_scope, thrown, or ok:false)', async () => {
  // reactFn that both rejects and returns missingScope across calls — ingestion
  // must still deliver every message.
  let calls = 0;
  const reactFn = async () => {
    calls++;
    if (calls === 1) throw new Error('network down');
    return { ok: false, error: 'missing_scope', missingScope: true };
  };
  const { server, port, seen } = await startServer({ reactFn });
  try {
    assert.equal(await post(port, mention('1788400600.000200')), 200);
    assert.equal(await post(port, mention('1788400601.000200')), 200);
    await settle();
    assert.equal(seen.length, 2, 'both messages ingested despite reaction failures');
    assert.equal(calls, 2, 'reaction attempted for each');
  } finally { server.stop(); }
});

// ─── pure result mapper ──────────────────────────────────────────────────────

test('mapReactionResult: ok, already_reacted (idempotent→ok), missing_scope, other', () => {
  assert.deepEqual(mapReactionResult({ ok: true }), { ok: true });
  assert.deepEqual(mapReactionResult({ ok: false, error: 'already_reacted' }), { ok: true, already: true });
  assert.deepEqual(mapReactionResult({ ok: false, error: 'missing_scope' }), { ok: false, error: 'missing_scope', missingScope: true });
  assert.deepEqual(mapReactionResult({ ok: false, error: 'channel_not_found' }), { ok: false, error: 'channel_not_found' });
  assert.deepEqual(mapReactionResult({}), { ok: false, error: 'reactions.add failed' });
});

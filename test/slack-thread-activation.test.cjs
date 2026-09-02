'use strict';

// T102 GATE 2 — persisted, bot-participated thread activation.
// Proves that SlackWebhookServer, seeded with the bot-thread ledger's roots
// (`initialActivatedThreads`, as startSlackServer does on every launch), fires a
// run on a PLAIN reply (NO @-mention) in a seeded thread — i.e. activation
// survives an app restart — while unrelated channel messages still do NOT fire,
// @-mention still works, and activateThread() activates a thread live.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createHmac } = require('node:crypto');
const loadTs = require('./load-ts.cjs');

const { SlackWebhookServer } = loadTs('src/main/slack.ts');

const SIGNING_SECRET = 's'.repeat(32);
const BOT = 'U0BOT';
const CH = 'C0CHAN';
const SEEDED_ROOT = '1788300000.000100';   // a thread the bot already replied in
const OTHER_ROOT = '1788300999.000100';    // a thread the bot is NOT in

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

/** event_callback wrapper with the bot id seeded in authorizations. */
function evt(event) {
  return { type: 'event_callback', authorizations: [{ user_id: BOT }], event };
}
/** A plain (non-mention) message that is a reply in `root`. */
function plainReply(root, ts, text = 'follow-up with no mention') {
  return evt({ type: 'message', channel: CH, user: 'U0HUMAN', text, ts, thread_ts: root });
}

async function startServer(opts) {
  const seen = [];
  for (const port of [39860, 39861, 39862, 39863]) {
    const server = new SlackWebhookServer({
      port, signingSecret: SIGNING_SECRET, channelId: CH, skipTunnel: true,
      onMessage: (m) => seen.push(m),
      ...opts,
    });
    const res = await server.start();
    if (res.ok) return { server, port, seen };
    server.stop();
    if (!/failed to bind/.test(res.error || '')) throw new Error(`start error: ${res.error}`);
  }
  throw new Error('no free test port');
}

const settle = () => new Promise((r) => setImmediate(r));

test('seeded (restart-restored) bot thread: a plain reply with NO @-mention fires', async () => {
  const { server, port, seen } = await startServer({ initialActivatedThreads: [SEEDED_ROOT] });
  try {
    assert.equal(await post(port, plainReply(SEEDED_ROOT, '1788300100.000200')), 200);
    await settle();
    assert.equal(seen.length, 1, 'plain reply in a seeded bot thread triggers');
    assert.equal(seen[0].thread_ts, SEEDED_ROOT);
    assert.equal(seen[0].text, 'follow-up with no mention');
  } finally { server.stop(); }
});

test('unrelated thread + unrelated top-level message do NOT fire', async () => {
  const { server, port, seen } = await startServer({ initialActivatedThreads: [SEEDED_ROOT] });
  try {
    // Reply in a thread the bot is NOT in.
    assert.equal(await post(port, plainReply(OTHER_ROOT, '1788300200.000200')), 200);
    // Plain top-level channel message, no mention, no thread.
    assert.equal(await post(port, evt({ type: 'message', channel: CH, user: 'U0HUMAN', text: 'just chatting', ts: '1788300201.000200' })), 200);
    await settle();
    assert.equal(seen.length, 0, 'neither unrelated message triggers a run');
  } finally { server.stop(); }
});

test('activateThread() live: after the bot replies, a plain reply fires', async () => {
  const { server, port, seen } = await startServer({}); // nothing seeded
  try {
    // Before activation: a plain reply in OTHER_ROOT does nothing.
    assert.equal(await post(port, plainReply(OTHER_ROOT, '1788300300.000200')), 200);
    await settle();
    assert.equal(seen.length, 0);
    // The bot replies into OTHER_ROOT → main calls activateThread live.
    server.activateThread(OTHER_ROOT);
    assert.equal(await post(port, plainReply(OTHER_ROOT, '1788300301.000200', 'now this should fire')), 200);
    await settle();
    assert.equal(seen.length, 1, 'plain reply fires once the thread is activated');
    assert.equal(seen[0].text, 'now this should fire');
  } finally { server.stop(); }
});

test('@-mention still triggers exactly as before (no regression)', async () => {
  const { server, port, seen } = await startServer({}); // nothing seeded
  try {
    const status = await post(port, evt({ type: 'app_mention', channel: CH, user: 'U0HUMAN', text: `<@${BOT}> do X`, ts: '1788300400.000200' }));
    assert.equal(status, 200);
    await settle();
    assert.equal(seen.length, 1, '@-mention fires');
    assert.equal(seen[0].text, 'do X', 'leading mention stripped');
  } finally { server.stop(); }
});

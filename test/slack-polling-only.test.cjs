'use strict';

// T94 — poll-only (NO-tunnel) mode for SlackWebhookServer.
// Proves that with `skipTunnel: true` the server:
//   - starts WITHOUT opening a public tunnel (ok:true, no url), so the caller in
//     index.ts proceeds to bring up the reply endpoint + done-observer,
//   - binds and serves on 127.0.0.1 (a real signed request is dispatched),
//   - keeps HMAC verify() fully enforced (bad signature -> 403),
// and that the DEFAULT (tunnel) construction is untouched (skipTunnel off).

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createHmac } = require('node:crypto');
const loadTs = require('./load-ts.cjs');

const { SlackWebhookServer } = loadTs('src/main/slack.ts');

const SIGNING_SECRET = 's'.repeat(32);

/** Slack-style v0 signature over the raw body — mirrors the server's verify(). */
function sign(tsSec, rawBody) {
  return 'v0=' + createHmac('sha256', SIGNING_SECRET).update(`v0:${tsSec}:${rawBody}`).digest('hex');
}

/** POST a raw body to 127.0.0.1:port with the given signature headers. */
function post(port, rawBody, { sig, ts } = {}) {
  const tsSec = ts ?? Math.floor(Date.now() / 1000).toString();
  const signature = sig ?? sign(tsSec, rawBody);
  return new Promise((resolve, reject) => {
    const req = http.request({
      method: 'POST', hostname: '127.0.0.1', port, path: '/',
      agent: false, // fresh connection per request — no cross-test socket reuse
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(rawBody),
        'x-slack-request-timestamp': tsSec,
        'x-slack-signature': signature,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.write(rawBody);
    req.end();
  });
}

/** Start a poll-only server, trying a few high ports to avoid collisions. */
async function startPollOnly(onMessage) {
  for (const port of [39847, 39848, 39849, 39850]) {
    const server = new SlackWebhookServer({ port, signingSecret: SIGNING_SECRET, skipTunnel: true, onMessage });
    const res = await server.start();
    if (res.ok) return { server, port, res };
    server.stop();
    if (!/failed to bind/.test(res.error || '')) throw new Error(`unexpected start error: ${res.error}`);
  }
  throw new Error('no free test port');
}

test('poll-only start(): ok with NO tunnel url (reply endpoint can then start)', async () => {
  const { server, res } = await startPollOnly(() => {});
  try {
    assert.equal(res.ok, true, 'start resolves ok even though no tunnel was opened');
    assert.equal(res.url, undefined, 'no public tunnel URL in poll-only mode');
  } finally { server.stop(); }
});

test('poll-only: a valid signed event on 127.0.0.1 is accepted (200) and dispatched', async () => {
  const seen = [];
  const { server, port } = await startPollOnly((m) => { seen.push(m); });
  try {
    const payload = JSON.stringify({
      type: 'event_callback',
      authorizations: [{ user_id: 'U0BOT' }],
      event: { type: 'app_mention', channel: 'C1', text: '<@U0BOT> hi from poller', ts: '100.1' },
    });
    const r = await post(port, payload);
    assert.equal(r.status, 200, 'server accepts the signed loopback delivery');
    // onMessage fires async after the 200; give the event loop a tick.
    await new Promise((res) => setImmediate(res));
    assert.equal(seen.length, 1, 'the message reached onMessage (the ingestion path)');
    assert.equal(seen[0].channel, 'C1');
    assert.equal(seen[0].text, 'hi from poller');
  } finally { server.stop(); }
});

test('poll-only: a BAD signature is still rejected 403 (verify() not downgraded)', async () => {
  const seen = [];
  const { server, port } = await startPollOnly((m) => { seen.push(m); });
  try {
    const payload = JSON.stringify({ type: 'event_callback', event: { type: 'message', channel: 'C1', text: 'x', ts: '1.1' } });
    const r = await post(port, payload, { sig: 'v0=deadbeef' });
    assert.equal(r.status, 403, 'bad signature rejected');
    await new Promise((res) => setImmediate(res));
    assert.equal(seen.length, 0, 'a forged event never reaches ingestion');
  } finally { server.stop(); }
});

test('poll-only: url_verification challenge still answered over loopback', async () => {
  const { server, port } = await startPollOnly(() => {});
  try {
    const payload = JSON.stringify({ type: 'url_verification', challenge: 'abc123' });
    const r = await post(port, payload);
    assert.equal(r.status, 200);
    assert.equal(JSON.parse(r.body).challenge, 'abc123');
  } finally { server.stop(); }
});

test('default (tunnel) construction leaves poll-only OFF — no behavior change', async () => {
  // Constructing WITHOUT skipTunnel must not change the request-handling contract:
  // a bad signature is still 403. (start() is not called here to avoid a real
  // network tunnel; the default tunnel code path is unchanged by inspection.)
  const seen = [];
  const server = new SlackWebhookServer({ port: 3999, signingSecret: SIGNING_SECRET, onMessage: (m) => seen.push(m) });
  const req = new (require('node:events').EventEmitter)();
  req.method = 'POST'; req.headers = { 'x-slack-signature': 'v0=bad', 'x-slack-request-timestamp': String(Math.floor(Date.now() / 1000)) };
  req.destroy = () => {};
  let status;
  const res = { writeHead(s) { status = s; return res; }, end() {} };
  server.handleRequest(req, res);
  req.emit('data', Buffer.from('{}'));
  req.emit('end');
  await new Promise((r) => setImmediate(r));
  assert.equal(status, 403, 'default mode still enforces the signature');
  assert.equal(seen.length, 0);
});

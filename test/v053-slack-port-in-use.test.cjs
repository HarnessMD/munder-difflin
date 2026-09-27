'use strict';

/**
 * 0.5.3, bug 11 (GaryP, 10 Sep 2026): Slack would not start after an upgrade,
 * "failed to bind port 3847: EADDRINUSE". Two ways to that sentence, both held
 * here with REAL sockets:
 *   1. something else holds the port (his case: an older Munder process). The
 *      server now takes a free port and the tunnel follows it.
 *   2. the tunnel failed after the port bound, and main dropped the server
 *      without stopping it, so the app held its own port against itself.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { SlackWebhookServer } = loadTs('src/main/slack.ts');
const ROOT = path.join(__dirname, '..');

/** Hold a port the way a stray process would. Resolves with the port and a closer. */
const squat = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, () => resolve({ port: s.address().port, close: () => new Promise((r) => s.close(r)) }));
});
const make = (port, openTunnel) => new SlackWebhookServer({ port, signingSecret: 'x', onMessage: () => {}, openTunnel });
const canBind = (port) => new Promise((resolve) => {
  const s = net.createServer();
  s.once('error', () => resolve(false));
  s.listen(port, () => s.close(() => resolve(true)));
});

test('a port somebody else holds is not fatal: a free one is taken and the tunnel is opened to IT', async () => {
  const held = await squat();
  const tunnelled = [];
  const server = make(held.port, async (p) => { tunnelled.push(p); return 'https://example.tunnel'; });
  try {
    const res = await server.start();
    assert.equal(res.ok, true, res.error);
    assert.equal(res.url, 'https://example.tunnel');
    assert.equal(res.movedFrom, held.port, 'it says which port it gave up on');
    assert.notEqual(res.port, held.port);
    assert.ok(res.port > 0);
    assert.deepEqual(tunnelled, [res.port], 'a tunnel to the old port would forward Slack to the stranger holding it');
  } finally {
    server.stop();
    await held.close();
  }
});

test('a free port is used as asked, and nothing claims to have moved', async () => {
  const held = await squat();
  await held.close(); // a port known to be free a moment ago
  const server = make(held.port, async () => 'https://example.tunnel');
  try {
    const res = await server.start();
    assert.equal(res.ok, true, res.error);
    assert.equal(res.port, held.port);
    assert.equal('movedFrom' in res, false);
  } finally {
    server.stop();
  }
});

test('a tunnel that fails leaves a server that stop() really releases', async () => {
  const held = await squat();
  await held.close();
  const server = make(held.port, async () => { throw new Error('offline'); });
  const res = await server.start();
  assert.equal(res.ok, false);
  assert.match(res.error, /tunnel unavailable: offline/);
  assert.equal(await canBind(held.port), false, 'the port is still bound: the local handler is live by design');
  server.stop();
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(await canBind(held.port), true, 'and stop gives it back');
});

test('main stops a server before dropping it, so a failed tunnel cannot hold the port against the next Turn on', () => {
  const main = fs.readFileSync(path.join(ROOT, 'src/main/index.ts'), 'utf8');
  assert.match(main, /if \(!res\.ok\) \{ slackServer\.stop\(\); slackServer = null; return res; \}/);
  assert.doesNotMatch(main, /if \(!res\.ok\) \{ slackServer = null; return res; \}/);
  assert.match(main, /if \(res\.movedFrom !== undefined\) console\.warn\(/, 'a moved port is said once in the log');
});

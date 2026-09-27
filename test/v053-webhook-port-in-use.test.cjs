/**
 * The rest of bug 11 (0.5.3): the webhook server had the same missing
 * EADDRINUSE handling as the Slack event server, and nothing on screen said
 * which port a server was really on.
 *
 * Tests 1 to 4 use REAL sockets: a real listener takes the port, the real
 * server starts against it, and a real HTTP request is made to where it says it
 * is. Only the public tunnel is stood in for, so no network is touched.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const loadTs = require('./load-ts.cjs');

const { WebhookServer } = loadTs('src/main/webhook.ts');
const { SlackWebhookServer } = loadTs('src/main/slack.ts');
const { boundPortLines } = loadTs('src/shared/boundPort.ts');

const squat = () => new Promise((res) => { const s = http.createServer((q, r) => { r.writeHead(418); r.end('squatter'); }); s.listen(0, () => res(s)); });
const get = (port, p) => new Promise((res, rej) => http.get({ host: '127.0.0.1', port, path: p }, (r) => { r.resume(); r.on('end', () => res(r.statusCode)); }).on('error', rej));
const hook = (port, openTunnel) => new WebhookServer({
  port, endpoints: [{ id: 'one', secret: 's'.repeat(32), kind: 'task' }],
  onMessage: () => null, lookupStatus: () => null, openTunnel
});

test('1. port free: bound where asked, nothing moved, and the tunnel is opened to that port', async () => {
  const s = await squat(); const port = s.address().port; await new Promise((r) => s.close(r));
  let tunnelled;
  const w = hook(port, async (p) => { tunnelled = p; return 'https://t.example'; });
  try {
    const res = await w.start();
    assert.deepEqual([res.ok, res.port, res.movedFrom, tunnelled], [true, port, undefined, port]);
    assert.deepEqual(w.boundPort(), { port });
  } finally { w.stop(); }
});

test('2. PORT IN USE: the server moves instead of staying off, the tunnel follows it, and it really answers there', async () => {
  const s = await squat(); const taken = s.address().port;
  let tunnelled;
  const w = hook(taken, async (p) => { tunnelled = p; return 'https://t.example'; });
  try {
    const res = await w.start();
    assert.equal(res.ok, true, res.error);
    assert.equal(res.movedFrom, taken);
    assert.notEqual(res.port, taken);
    assert.equal(tunnelled, res.port, 'a tunnel to the taken port would forward the public URL to the squatter');
    assert.deepEqual(w.boundPort(), { port: res.port, movedFrom: taken });
    assert.equal(await get(taken, '/status/x'), 418, 'the squatter still has its port');
    assert.notEqual(await get(res.port, '/status/x'), 418, 'ours answers on the new one');
  } finally { w.stop(); s.close(); }
});

test('3. tunnel down after a move: still reported as moved, still bound and stoppable, and stop forgets the move', async () => {
  const s = await squat(); const taken = s.address().port;
  const w = hook(taken, async () => { throw new Error('offline'); });
  try {
    const res = await w.start();
    assert.equal(res.ok, false); assert.match(res.error, /tunnel unavailable/);
    assert.equal(res.movedFrom, taken);
    assert.equal(w.listening(), true, 'the caller keeps a bound server so it can stop it');
    const port = res.port;
    w.stop();
    assert.deepEqual(w.boundPort(), {});
    await assert.rejects(get(port, '/'), /ECONNREFUSED/);
  } finally { w.stop(); s.close(); }
});

test('4. the Slack event server reports the same thing, so Settings can show it', async () => {
  const s = await squat(); const taken = s.address().port;
  const sl = new SlackWebhookServer({ port: taken, signingSecret: 'x', onMessage: () => {}, openTunnel: async () => 'https://t.example' });
  try {
    assert.deepEqual(sl.boundPort(), {});
    const res = await sl.start();
    assert.deepEqual(sl.boundPort(), { port: res.port, movedFrom: taken });
    sl.stop();
    assert.deepEqual(sl.boundPort(), {});
  } finally { sl.stop(); s.close(); }
});

test('5. what Settings says: nothing when not running, a quiet line on the asked for port, a warning with both numbers when moved', () => {
  assert.deepEqual(boundPortLines(null), []);
  assert.deepEqual(boundPortLines({}), []);
  assert.deepEqual(boundPortLines({ port: 3849 }), [{ key: 'boundPort', port: 3849, warn: false }]);
  assert.deepEqual(boundPortLines({ port: 51234, movedFrom: 3849 }), [{ key: 'boundPortMoved', port: 51234, from: 3849, warn: true }]);
  assert.deepEqual(boundPortLines({ port: 3849, movedFrom: 3849 }), [{ key: 'boundPort', port: 3849, warn: false }]);
});

test('6. the wiring: main reports it for both servers, Settings draws it, the saved port is never rewritten, three languages', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const main = read('src/main/index.ts');
  assert.match(main, /url: lastSlackUrl, \.\.\.\(slackServer\?\.boundPort\(\) \?\? \{\}\)/);
  assert.equal((main.match(/\.\.\.\(webhookServer\?\.boundPort\(\) \?\? \{\}\)/g) || []).length, 2, 'webhook:status and webhooks:status');
  assert.doesNotMatch(main, /writeConfig\(\{[^}]*(webhookPort|slackPort): (res|r)\.port/, 'a port taken for one session must not become the setting');
  // 0.5.3: the Slack and webhook cards moved to components/settings.
  const settings = read('src/renderer/src/components/settings/ConnectionsSection.tsx');
  assert.match(settings, /\{running && <BoundPortNote bound=\{live\} \/>\}/);
  // The webhook server's address moved to Inbound integrations (batch 3).
  assert.match(read('src/renderer/src/components/settings/InboundIntegrations.tsx'), /\{running && <BoundPortNote bound=\{status\} \/>\}/);
  assert.match(settings, /value=\{String\(get\('slackPort', 3847\)\)\}/, 'the input still shows the configured port');
  for (const lang of ['en', 'zh-CN', 'ar']) {
    const c = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`)).settings.connections;
    assert.match(c.boundPort, /\{\{port\}\}/);
    assert.match(c.boundPortMoved, /\{\{from\}\}/); assert.match(c.boundPortMoved, /\{\{port\}\}/);
    assert.doesNotMatch(c.boundPort + c.boundPortMoved, /[‒-―]| - /);
  }
});

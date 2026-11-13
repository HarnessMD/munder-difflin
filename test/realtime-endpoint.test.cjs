'use strict';

// Talk's configurable server (Settings → Voice): base URL checks, the token mint,
// and the SDP exchange MAIN makes for a self-hosted server. The network tests run
// against a stub that behaves like LocalAI: no /realtime/client_secrets, and a
// raw SDP offer accepted at /v1/realtime/calls?model=… .

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const loadTs = require('./load-ts.cjs');

const {
  DEFAULT_REALTIME_BASE_URL,
  SDP_RELAY_URL,
  checkRealtimeBaseUrl,
  isPrivateHost,
  realtimeCallsUrl,
  relaySdpFetch
} = loadTs('src/shared/realtimeEndpoint.ts');
const { mintToken, exchangeSdp } = loadTs('src/main/realtimeHttp.ts');

const KEY = 'sk-test-0123456789';
const OFFER = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\n';
const ANSWER = 'v=0\r\no=- 3 4 IN IP4 127.0.0.1\r\ns=answer\r\n';

/** A LocalAI-like server. `routes` may override a path's reply. Records every request. */
async function stub(routes = {}) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, headers: req.headers, body });
      const path = req.url.split('?')[0];
      const route = routes[path];
      if (route) return route(req, res, body);
      if (req.method === 'POST' && path === '/v1/realtime/calls') {
        res.writeHead(201, { 'Content-Type': 'application/sdp', Location: '/v1/realtime/calls/call_123' });
        return res.end(ANSWER);
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'not found' } }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  server.unref();
  const base = `http://127.0.0.1:${server.address().port}/v1`;
  return { base, seen, close: () => new Promise((r) => server.close(r)) };
}

test('a blank base URL means OpenAI, and a trailing slash is dropped', () => {
  assert.deepEqual(checkRealtimeBaseUrl(''), { ok: true, url: DEFAULT_REALTIME_BASE_URL });
  assert.deepEqual(checkRealtimeBaseUrl(undefined), { ok: true, url: DEFAULT_REALTIME_BASE_URL });
  assert.deepEqual(checkRealtimeBaseUrl('  https://api.openai.com/v1/  '), { ok: true, url: DEFAULT_REALTIME_BASE_URL });
  assert.deepEqual(checkRealtimeBaseUrl('https://llm.example.com/openai/v1'), { ok: true, url: 'https://llm.example.com/openai/v1' });
});

test('http:// is accepted only for this computer and private network hosts', () => {
  for (const url of [
    'http://192.168.1.20:8080/v1',
    'http://10.0.0.5/v1',
    'http://172.16.0.1:8080/v1',
    'http://172.31.255.255/v1',
    'http://127.0.0.1:8080/v1',
    'http://localhost:8080/v1',
    'http://ms-s1.local:8080/v1',
    'http://100.100.1.1:8080/v1',
    'http://169.254.10.10/v1',
    'http://[::1]:8080/v1',
    'http://[fd12:3456::1]:8080/v1'
  ]) {
    assert.equal(checkRealtimeBaseUrl(url).ok, true, url);
  }
  for (const url of ['http://api.openai.com/v1', 'http://8.8.8.8/v1', 'http://172.32.0.1/v1', 'http://192.169.0.1/v1', 'http://100.128.0.1/v1']) {
    const r = checkRealtimeBaseUrl(url);
    assert.equal(r.ok, false, url);
    assert.equal(r.problem, 'insecure', url);
  }
  assert.equal(isPrivateHost('LOCALHOST'), true);
  assert.equal(isPrivateHost('example.com'), false);
});

test('a base URL that is not a plain http(s) address is refused with its reason', () => {
  assert.equal(checkRealtimeBaseUrl('not a url').problem, 'invalid');
  assert.equal(checkRealtimeBaseUrl('ftp://192.168.1.2/v1').problem, 'scheme');
  assert.equal(checkRealtimeBaseUrl('https://user:pw@example.com/v1').problem, 'credentials');
  assert.equal(checkRealtimeBaseUrl('https://example.com/v1?x=1').problem, 'query');
  assert.equal(checkRealtimeBaseUrl('https://example.com/v1#frag').problem, 'query');
  assert.match(checkRealtimeBaseUrl('ftp://x/v1').error, /^Voice base URL refused: /);
});

test('the model rides on /realtime/calls only when the key is used directly', () => {
  const base = 'http://192.168.1.20:8080/v1';
  assert.equal(realtimeCallsUrl(base, { direct: false, model: 'gpt-realtime-2.1' }), `${base}/realtime/calls`);
  assert.equal(realtimeCallsUrl(base, { direct: true, model: 'my model/v2' }), `${base}/realtime/calls?model=my%20model%2Fv2`);
});

test('skip token request: nothing is minted and nothing is sent', async () => {
  const s = await stub();
  const r = await mintToken({ key: KEY, base: s.base, model: 'gpt-realtime', direct: true, isDefaultBase: false });
  assert.deepEqual(r, { ok: true, token: '', expiresAt: null, sessionConfig: { model: 'gpt-realtime' }, sdpViaMain: true });
  assert.equal(s.seen.length, 0);
  await s.close();
});

test('with a token server, the mint goes to <base>/realtime/client_secrets', async () => {
  const s = await stub({
    '/v1/realtime/client_secrets': (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ value: 'ek_abc', expires_at: 1700000000 }));
    }
  });
  const r = await mintToken({ key: KEY, base: s.base, model: 'gpt-realtime-2.1', direct: false, isDefaultBase: false });
  assert.deepEqual(r, { ok: true, token: 'ek_abc', expiresAt: 1700000000, sessionConfig: { model: 'gpt-realtime-2.1' }, sdpViaMain: true });
  assert.equal(s.seen.length, 1);
  assert.equal(s.seen[0].url, '/v1/realtime/client_secrets');
  assert.equal(s.seen[0].headers.authorization, `Bearer ${KEY}`);
  assert.deepEqual(JSON.parse(s.seen[0].body), { session: { type: 'realtime', model: 'gpt-realtime-2.1' } });
  // At OpenAI's own address the renderer still makes the SDP exchange itself.
  const own = await mintToken({ key: KEY, base: s.base, model: 'm', direct: false, isDefaultBase: true });
  assert.equal(own.sdpViaMain, false);
  await s.close();
});

test('a server with no token endpoint fails the mint and points at the skip option', async () => {
  const s = await stub();
  const r = await mintToken({ key: KEY, base: s.base, model: 'm', direct: false, isDefaultBase: false });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'mint_failed');
  assert.match(r.error, /token mint failed \(404\)/);
  assert.match(r.error, /Skip token request/);
  // GA endpoint, then the legacy one, as before.
  assert.deepEqual(s.seen.map((x) => x.url), ['/v1/realtime/client_secrets', '/v1/realtime/sessions']);
  await s.close();
});

test('direct mode: the SDP offer goes to <base>/realtime/calls?model= with the key as bearer', async () => {
  const s = await stub();
  const r = await exchangeSdp({ sdp: OFFER, base: s.base, model: 'gpt-realtime', direct: true, bearer: KEY });
  assert.deepEqual(r, { ok: true, sdp: ANSWER, location: '/v1/realtime/calls/call_123' });
  assert.equal(s.seen.length, 1);
  assert.equal(s.seen[0].url, '/v1/realtime/calls?model=gpt-realtime');
  assert.equal(s.seen[0].headers.authorization, `Bearer ${KEY}`);
  assert.equal(s.seen[0].headers['content-type'], 'application/sdp');
  assert.equal(s.seen[0].body, OFFER);
  await s.close();
});

test('a refused exchange reports the status and never repeats the key', async () => {
  const s = await stub({
    '/v1/realtime/calls': (req, res) => {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end(`bad key: ${req.headers.authorization}`);
    }
  });
  const r = await exchangeSdp({ sdp: OFFER, base: s.base, model: 'm', direct: true, bearer: KEY });
  assert.equal(r.ok, false);
  assert.match(r.error, /voice connect failed \(401\)/);
  assert.ok(!r.error.includes(KEY), r.error);
  assert.match(r.error, /\[redacted\]/);
  await s.close();
});

test('a missing offer, a missing bearer or a non-SDP answer is refused', async () => {
  const s = await stub({
    '/v1/realtime/calls': (req, res) => { res.writeHead(200); res.end('<html>login</html>'); }
  });
  assert.equal((await exchangeSdp({ sdp: '', base: s.base, model: 'm', direct: true, bearer: KEY })).ok, false);
  assert.equal((await exchangeSdp({ sdp: 'hello', base: s.base, model: 'm', direct: true, bearer: KEY })).ok, false);
  assert.equal((await exchangeSdp({ sdp: OFFER, base: s.base, model: 'm', direct: false, bearer: '' })).ok, false);
  assert.equal(s.seen.length, 0, 'none of those reach the server');
  const r = await exchangeSdp({ sdp: OFFER, base: s.base, model: 'm', direct: true, bearer: KEY });
  assert.deepEqual(r, { ok: false, error: 'voice connect failed: the server did not answer with SDP' });
  await s.close();
});

test('the relay answers only the relay address and passes every other fetch through', async () => {
  const passed = [];
  const realFetch = async (input) => { passed.push(String(input)); return new Response('real'); };
  const offers = [];
  const f = relaySdpFetch(realFetch, async (sdp) => { offers.push(sdp); return { ok: true, sdp: ANSWER, location: '/calls/c1' }; });

  assert.equal(await (await f('https://api.openai.com/v1/models')).text(), 'real');
  // The SDK passes a URL object and its own bearer, which the relay ignores.
  const res = await f(new URL(SDP_RELAY_URL), { method: 'POST', body: OFFER, headers: { Authorization: 'Bearer relayed-by-main' } });
  assert.equal(res.status, 201);
  assert.equal(await res.text(), ANSWER);
  assert.equal(res.headers.get('Location'), '/calls/c1');
  assert.equal(res.headers.get('Content-Type'), 'application/sdp');
  assert.deepEqual(offers, [OFFER]);
  assert.deepEqual(passed, ['https://api.openai.com/v1/models']);

  const failing = relaySdpFetch(realFetch, async () => ({ ok: false, error: 'voice connect failed (401)' }));
  await assert.rejects(failing(SDP_RELAY_URL, { method: 'POST', body: OFFER }), /voice connect failed \(401\)/);
});

test('end to end: the relay plus main\'s exchange reach the stub with the key, not the placeholder', async () => {
  const s = await stub();
  const f = relaySdpFetch(fetch, (sdp) => exchangeSdp({ sdp, base: s.base, model: 'gpt-realtime', direct: true, bearer: KEY }));
  const res = await f(new URL(SDP_RELAY_URL), { method: 'POST', body: OFFER, headers: { Authorization: 'Bearer relayed-by-main' } });
  assert.equal(await res.text(), ANSWER);
  assert.equal(s.seen[0].headers.authorization, `Bearer ${KEY}`);
  assert.equal(s.seen[0].url, '/v1/realtime/calls?model=gpt-realtime');
  await s.close();
});

'use strict';

/* Review finding 18: getBytes can hang for ever, and then so does whatever
 * awaits it (the skill installer's Promise.all, the hero payload).
 *
 * Proved here against a REAL https server on loopback, not a stub of the
 * response object: a stub would only show that the stub behaves the way I wrote
 * it. The certificate is made at test time with openssl so no key is ever
 * committed; without openssl the tests skip and say so. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const { execFileSync } = require('node:child_process');
const loadTs = require('./load-ts.cjs');

const { getBytes } = loadTs('src/main/fetchText.ts');

function makeCert() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-fetch-'));
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem'),
      '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore' });
    return { key: fs.readFileSync(path.join(dir, 'k.pem')), cert: fs.readFileSync(path.join(dir, 'c.pem')), done: () => fs.rmSync(dir, { recursive: true, force: true }) };
  } catch { fs.rmSync(dir, { recursive: true, force: true }); return null; }
}

const tls = makeCert();
const skip = tls ? false : 'openssl is not available to make a throwaway certificate';

async function withServer(handler, run) {
  const server = https.createServer({ key: tls.key, cert: tls.cert }, handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // the throwaway certificate, this process only
  try { return await run(`https://127.0.0.1:${server.address().port}`); }
  finally {
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
}

/** Settled within `ms`, or the string 'HUNG'. */
const settle = (p, ms) => Promise.race([p.then((v) => ({ ok: v }), (e) => ({ err: e })), new Promise((r) => setTimeout(() => r('HUNG'), ms).unref())]);

test('the control: a whole response resolves with its bytes', { skip }, async () => {
  const out = await withServer((req, res) => { res.end('hello'); }, (base) => settle(getBytes(`${base}/x`), 3000));
  assert.equal(out.ok?.toString(), 'hello');
});

test('a connection that dies AFTER the headers rejects; it does not hang', { skip }, async () => {
  const out = await withServer((req, res) => {
    res.writeHead(200, { 'content-length': '1000' });
    res.write('partial');
    setTimeout(() => req.socket.destroy(), 50);
  }, (base) => settle(getBytes(`${base}/x`, { timeoutMs: 1500 }), 4000));
  assert.notEqual(out, 'HUNG', 'the promise never settled: whatever awaits it spins for ever');
  assert.ok(out.err, 'a truncated body must be an error, never a short success');
});

test('a body that stalls after the headers times out', { skip }, async () => {
  const out = await withServer((req, res) => { res.writeHead(200, { 'content-length': '1000' }); res.write('partial'); },
    (base) => settle(getBytes(`${base}/x`, { timeoutMs: 700 }), 4000));
  assert.notEqual(out, 'HUNG');
  assert.ok(out.err);
});

test('a redirect loop ends', { skip }, async () => {
  let hops = 0;
  const out = await withServer((req, res) => { hops++; res.writeHead(302, { location: '/again' }); res.end(); },
    (base) => settle(getBytes(`${base}/x`, { timeoutMs: 1500 }), 6000));
  assert.notEqual(out, 'HUNG', `still following after ${hops} hops`);
  assert.ok(out.err && /redirect/i.test(String(out.err.message)), `expected a redirect error, got ${JSON.stringify(String(out.err?.message))}`);
  assert.ok(hops <= 6, `followed ${hops} hops`);
});

test('a redirect to plain http is refused, not followed', { skip }, async () => {
  const out = await withServer((req, res) => { res.writeHead(302, { location: 'http://127.0.0.1:9/x' }); res.end(); },
    (base) => settle(getBytes(`${base}/x`, { timeoutMs: 1500 }), 4000));
  assert.notEqual(out, 'HUNG');
  assert.ok(out.err && /https/i.test(String(out.err.message)), String(out.err?.message));
});

test.after(() => { tls?.done(); });

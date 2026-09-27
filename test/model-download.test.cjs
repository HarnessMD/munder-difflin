'use strict';

/* F16: the optional model download. Resumable with Range, sha256 checked,
 * the final name only appears after the hash matches. Runs against a local
 * http server that serves a fake model and can cut the connection at a byte
 * offset. Red on the base: src/main/transcribe/modelDownload.ts does not exist. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const loadTs = require('./load-ts.cjs');

const { downloadModel, modelInstalled, DownloadError } = loadTs('src/main/transcribe/modelDownload.ts');

const MODEL = Buffer.alloc(300_000);
for (let i = 0; i < MODEL.length; i++) MODEL[i] = (i * 7919) & 0xff;
const SHA = createHash('sha256').update(MODEL).digest('hex');

/** A model server. `cutAt` closes the socket after that many bytes of the
 *  first response; every request is logged with its Range header. */
function serve(t, { cutAt = null, body = MODEL, redirectFirst = false } = {}) {
  const requests = [];
  let first = true;
  const server = http.createServer((req, res) => {
    requests.push({ url: req.url, range: req.headers.range ?? null });
    if (redirectFirst && first) { first = false; res.writeHead(302, { location: '/real-model.bin' }); res.end(); return; }
    let start = 0;
    const m = /^bytes=(\d+)-$/.exec(req.headers.range ?? '');
    if (m) {
      start = Number(m[1]);
      if (start >= body.length) { res.writeHead(416); res.end(); return; }
      res.writeHead(206, { 'content-length': body.length - start, 'content-range': `bytes ${start}-${body.length - 1}/${body.length}` });
    } else {
      res.writeHead(200, { 'content-length': body.length });
    }
    const slice = body.subarray(start);
    if (cutAt !== null && requests.length === 1) {
      res.write(slice.subarray(0, cutAt));
      setTimeout(() => res.socket.destroy(), 20);
      return;
    }
    res.end(slice);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      t.after(() => server.close());
      resolve({ url: `http://127.0.0.1:${server.address().port}/model.bin`, requests });
    });
  });
}

function tmpDest(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-model-dl-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'models', 'ggml-fake.bin');
}

test('a clean download lands under the final name with the right bytes and hash', async (t) => {
  const { url, requests } = await serve(t);
  const dest = tmpDest(t);
  const progress = [];
  const r = await downloadModel({ url, dest, sha256: SHA, bytes: MODEL.length, onProgress: (n, total) => progress.push([n, total]) });
  assert.equal(r.bytes, MODEL.length);
  assert.equal(r.fetched, MODEL.length);
  assert.ok(fs.readFileSync(dest).equals(MODEL));
  assert.equal(fs.existsSync(dest + '.part'), false, 'the part file must be gone');
  assert.equal(requests[0].range, null, 'a fresh download sends no Range');
  assert.equal(progress.at(-1)[0], MODEL.length);
  assert.equal(progress.at(-1)[1], MODEL.length);
  assert.equal(await modelInstalled(dest, SHA), true);
});

test('a cut connection keeps the part file and the next call resumes with Range', async (t) => {
  const { url, requests } = await serve(t, { cutAt: 120_000 });
  const dest = tmpDest(t);
  await assert.rejects(downloadModel({ url, dest, sha256: SHA, bytes: MODEL.length }), (e) => e instanceof DownloadError && (e.code === 'network' || e.code === 'size'));
  assert.equal(fs.existsSync(dest), false, 'no final file after a short read');
  const partial = fs.statSync(dest + '.part').size;
  assert.ok(partial > 0 && partial < MODEL.length, `part file holds ${partial} bytes`);
  const r = await downloadModel({ url, dest, sha256: SHA, bytes: MODEL.length });
  assert.equal(requests[1].range, `bytes=${partial}-`, 'the resume asks for the rest');
  assert.equal(r.fetched, MODEL.length - partial, 'only the missing bytes are fetched');
  assert.ok(fs.readFileSync(dest).equals(MODEL));
});

test('a checksum mismatch never gets the final name and removes the part file', async (t) => {
  const { url } = await serve(t);
  const dest = tmpDest(t);
  const wrong = createHash('sha256').update('not the model').digest('hex');
  await assert.rejects(downloadModel({ url, dest, sha256: wrong, bytes: MODEL.length }), (e) => e instanceof DownloadError && e.code === 'checksum');
  assert.equal(fs.existsSync(dest), false);
  assert.equal(fs.existsSync(dest + '.part'), false);
});

test('an installed model is not fetched again', async (t) => {
  const { url, requests } = await serve(t);
  const dest = tmpDest(t);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, MODEL);
  const r = await downloadModel({ url, dest, sha256: SHA, bytes: MODEL.length });
  assert.equal(r.fetched, 0);
  assert.equal(requests.length, 0, 'no request when the file is already right');
});

test('a redirect is followed and the file still verifies', async (t) => {
  const { url } = await serve(t, { redirectFirst: true });
  const dest = tmpDest(t);
  const r = await downloadModel({ url, dest, sha256: SHA, bytes: MODEL.length });
  assert.equal(r.bytes, MODEL.length);
});

test('abort stops the transfer and reports aborted', async (t) => {
  const { url } = await serve(t);
  const dest = tmpDest(t);
  const ac = new AbortController();
  const p = downloadModel({ url, dest, sha256: SHA, bytes: MODEL.length, signal: ac.signal, onProgress: () => ac.abort() });
  await assert.rejects(p, (e) => e instanceof DownloadError && e.code === 'aborted');
  assert.equal(fs.existsSync(dest), false);
});

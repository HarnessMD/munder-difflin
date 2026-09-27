'use strict';

/**
 * File sharing — a local file, a public link, dead in an hour.
 *
 * The properties this feature lives or dies on, in the order they matter:
 *
 *   1. expiry arithmetic, including the copy, which rounds DOWN so the UI
 *      never promises time the server will not serve;
 *   2. the token is 256 bits of CSPRNG hex and nothing shorter is accepted;
 *   3. an EXPIRED share is not served, and it is not served differently from
 *      a token that never existed;
 *   4. an unknown token is 404 with no body, never a 410 with detail;
 *   5. traversal in the token position cannot reach a file. It cannot even
 *      reach the lookup;
 *   6. revoking removes the link and NOTHING on disk;
 *   7. the user visible copy carries no dashes, in the locale files and in the
 *      component's own JSX.
 *
 * The store is driven for real: a real HTTP server on a real ephemeral port,
 * real requests over a socket. Only the tunnel is stubbed, because a unit test
 * must never reach the network — the stub hands back the loopback root, so the
 * share URL the store builds is the one the test actually fetches.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const loadTs = require('./load-ts.cjs');

const pure = loadTs('src/shared/fileShare.ts');
const { FileShareStore } = loadTs('src/main/fileShare.ts');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

/* A directory of fixtures, torn down at the end of the run. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-file-share-'));
test.after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* noop */ } });

function fixture(name, body) {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, body);
  return p;
}

/** A store whose "tunnel" is the loopback server it is put in front of, and
 *  whose clock the test moves. Nothing here touches the network. */
function makeStore(opts = {}) {
  const clock = { t: opts.now ?? 1_700_000_000_000 };
  const store = new FileShareStore({
    now: () => clock.t,
    ttlMs: opts.ttlMs,
    maxBytes: opts.maxBytes,
    maxShares: opts.maxShares,
    openTunnel: opts.openTunnel ?? (async (port) => `http://127.0.0.1:${port}`)
  });
  return { store, clock };
}

/**
 * One request with the path sent VERBATIM.
 *
 * `fetch` normalises `..` away in the client before a byte leaves, which would
 * quietly turn the traversal tests into tests of the WHATWG URL parser. The raw
 * client is the point: the server has to be the thing that refuses.
 */
function raw(port, rawPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: rawPath, method }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks)
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

/* ---- 1. expiry arithmetic ------------------------------------------------ */

test('the TTL is one hour and expiry is inclusive of the instant it lands', () => {
  assert.equal(pure.SHARE_TTL_MS, 60 * 60 * 1000);
  const share = { expiresAt: 1000 };
  assert.equal(pure.isExpired(share, 999), false);
  assert.equal(pure.isExpired(share, 1000), true, 'the instant it expires is expired');
  assert.equal(pure.isExpired(share, 1001), true);
  assert.equal(pure.remainingMs(share, 400), 600);
  assert.equal(pure.remainingMs(share, 5000), 0, 'never negative');
});

test('the countdown rounds down, so the UI never promises time the server will not serve', () => {
  const at = (ms) => pure.shareCountdown({ expiresAt: ms }, 0);
  assert.deepEqual(at(60 * 60 * 1000), { unit: 'hours', count: 1 });
  assert.deepEqual(at(59 * 60 * 1000), { unit: 'minutes', count: 59 });
  assert.deepEqual(at(58 * 60 * 1000 + 59_000), { unit: 'minutes', count: 58 },
    'two minutes one second left may never read as three minutes');
  assert.deepEqual(at(90_000), { unit: 'minutes', count: 1 });
  assert.deepEqual(at(59_999), { unit: 'seconds', count: 59 }, 'and never sixty seconds');
  assert.deepEqual(at(500), { unit: 'seconds', count: 1 }, 'a live share never reads as zero');
  assert.deepEqual(at(0), { unit: 'expired', count: 0 });
  assert.deepEqual(at(-5000), { unit: 'expired', count: 0 });
});

test('expiresIn reads like a sentence and singularises', () => {
  const say = (ms) => pure.expiresIn({ expiresAt: ms }, 0);
  assert.equal(say(58 * 60 * 1000), '58 minutes left');
  assert.equal(say(60 * 60 * 1000), '1 hour left');
  assert.equal(say(60_000), '1 minute left');
  assert.equal(say(3000), '3 seconds left');
  assert.equal(say(1200), '1 second left');
  assert.equal(say(0), 'Expired');
});

/* ---- 2. the token -------------------------------------------------------- */

test('the token is at least 128 bits and is minted as hex', () => {
  assert.ok(pure.SHARE_TOKEN_BYTES * 8 >= 128, 'a share token must carry 128 bits or more');
  assert.equal(pure.SHARE_TOKEN_CHARS, pure.SHARE_TOKEN_BYTES * 2);
});

test('only the exact minted shape is a token', () => {
  assert.equal(pure.isValidShareToken('a'.repeat(64)), true);
  assert.equal(pure.isValidShareToken('A'.repeat(64)), false, 'uppercase is not what we mint');
  assert.equal(pure.isValidShareToken('a'.repeat(63)), false);
  assert.equal(pure.isValidShareToken('a'.repeat(65)), false);
  assert.equal(pure.isValidShareToken('../../etc/passwd'), false);
  assert.equal(pure.isValidShareToken(''), false);
  assert.equal(pure.isValidShareToken(null), false);
  assert.equal(pure.isValidShareToken(undefined), false);
});

test('real tokens are unguessable in shape and never repeat', async () => {
  const file = fixture('token-shape.txt', 'x');
  const { store } = makeStore();
  const seen = new Set();
  try {
    for (let i = 0; i < 12; i++) {
      const r = await store.create(file);
      assert.equal(r.ok, true);
      const token = r.share.url.split('/s/')[1];
      assert.match(token, /^[0-9a-f]{64}$/, 'the URL carries a 64 character hex token');
      assert.equal(seen.has(token), false, 'a token was minted twice');
      seen.add(token);
    }
  } finally {
    store.stop();
  }
});

/* ---- 3. an expired share is not served ---------------------------------- */

test('an expired share is not served, and the request itself sweeps it', async () => {
  const file = fixture('expires.txt', 'still here after the link dies');
  const { store, clock } = makeStore({ ttlMs: 60 * 60 * 1000 });
  try {
    const created = await store.create(file);
    assert.equal(created.ok, true);
    const port = store.localPort();
    const token = created.share.url.split('/s/')[1];

    const live = await raw(port, `/s/${token}`);
    assert.equal(live.status, 200, 'inside the hour the file is served');
    assert.equal(live.body.toString(), 'still here after the link dies');

    // The machine slept through the timer: the clock has moved past the hour
    // but nothing has revoked the share yet. The request must sweep it.
    clock.t += 60 * 60 * 1000 + 1;
    const dead = await raw(port, `/s/${token}`);
    assert.equal(dead.status, 404, 'an expired token is 404');
    assert.equal(dead.body.length, 0, 'and carries no body that could confirm it once existed');

    assert.equal(store.activeCount(), 0, 'the sweep dropped it');
    assert.equal(fs.existsSync(file), true, 'expiry never touches the file on disk');
  } finally {
    store.stop();
  }
});

test('the per share timer revokes a share nobody ever asks for', async () => {
  const file = fixture('timer.txt', 'unrequested');
  // Real clock here: this is the timer path, not the sweep path.
  const store = new FileShareStore({
    ttlMs: 40,
    openTunnel: async (port) => `http://127.0.0.1:${port}`
  });
  try {
    const created = await store.create(file);
    assert.equal(created.ok, true);
    // WAIT FOR THE REVOKE, do not sleep past the TTL and hope the timer ran.
    // A 40 ms TTL inside a 120 ms sleep is comfortable on an idle machine and
    // is not a promise on a loaded one; the deadline is what makes a timer that
    // never fires a failure rather than a coin toss.
    const revoked = Date.now() + 5000;
    while (store.activeCount() > 0 && Date.now() < revoked) await new Promise((r) => setTimeout(r, 10));
    assert.equal(store.activeCount(), 0, 'the timer revoked it with no request to trigger a sweep');
    assert.equal(store.publicUrl(), null, 'and the listener went with the last share');
    assert.equal(fs.existsSync(file), true, 'the file is untouched');
  } finally {
    store.stop();
  }
});

test('a share that expires by SWEEP takes the listener with it, exactly as one that expires by timer does', async () => {
  // 0.5.3, found by Kevin chasing the test above, which failed three times in
  // one day on a busy machine with "the listener went with the last share".
  // It was not the test. Two things expire a share: its own timer, and the
  // sweep that runs at the top of create, list, activeCount and every request.
  // Only the timer closed the listener, and the sweep CANCELS the timer of
  // whatever it drops. So whenever a sweep reached an expired share first, the
  // share went, its timer went with it, and nothing was left that would ever
  // close the loopback listener or stop publishing the tunnel address: zero
  // shares, one open public endpoint. A late timer is all it takes, and a busy
  // machine makes timers late. The clock is injected here so the sweep wins
  // every time, not one run in ten.
  const file = fixture('swept.txt', 'body');
  const { store, clock } = makeStore({ ttlMs: 60_000 });
  try {
    const created = await store.create(file);
    assert.equal(created.ok, true);
    assert.notEqual(store.publicUrl(), null, 'set up: it is being served');
    clock.t += 60_001;                       // past the TTL; the real timer has NOT fired
    assert.equal(store.activeCount(), 0, 'the sweep dropped it');
    assert.equal(store.publicUrl(), null, 'no shares, and the address is still published');
    assert.equal(store.localPort(), 0, 'no shares, and the listener is still bound');
  } finally {
    store.stop();
  }
});

/* ---- 4. an unknown token ------------------------------------------------- */

test('an unknown token is answered exactly like an expired one', async () => {
  const file = fixture('unknown.txt', 'body');
  const { store } = makeStore();
  try {
    const created = await store.create(file);
    const port = store.localPort();
    const real = created.share.url.split('/s/')[1];
    const fake = 'b'.repeat(64);
    assert.notEqual(real, fake);

    const miss = await raw(port, `/s/${fake}`);
    assert.equal(miss.status, 404);
    assert.equal(miss.body.length, 0, 'no body, so nothing distinguishes it from an expired token');

    // Everything that is not GET /s/<token> is the same 404.
    for (const p of ['/', '/s', '/s/', '/index.html', `/s/${real}/extra`, `/s/${real}x`]) {
      const r = await raw(port, p);
      assert.equal(r.status, 404, `${p} must not be routed`);
      assert.equal(r.body.length, 0, `${p} must answer with no body`);
    }
    // A query string is not part of the route and is ignored, because mail
    // clients and chat apps append their own. The token stays the credential.
    assert.equal((await raw(port, `/s/${real}?utm=x&t=1`)).status, 200);
    for (const method of ['POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']) {
      const r = await raw(port, `/s/${real}`, method);
      assert.equal(r.status, 404, `${method} is not a route`);
    }
    // ...and the real token still works, so none of that broke the one route.
    assert.equal((await raw(port, `/s/${real}`)).status, 200);
  } finally {
    store.stop();
  }
});

/* ---- 5. traversal -------------------------------------------------------- */

test('traversal in the token position cannot reach a file', () => {
  // The pure guard first: nothing but the exact route yields a token, so no
  // caller ever gets a string it could put in a path.
  const good = 'c'.repeat(64);
  assert.equal(pure.tokenFromPath(`/s/${good}`), good);
  for (const p of [
    '/s/../../etc/passwd',
    '/s/..%2f..%2fetc%2fpasswd',
    '/s/%2e%2e/%2e%2e/etc/passwd',
    `/s/${good}/../../etc/passwd`,
    `/s/${good}%00.png`,
    '/etc/passwd',
    '/s//etc/passwd',
    `/S/${good}`,
    `/s/${good.toUpperCase()}`,
    '/s/' + 'c'.repeat(63),
    ''
  ]) {
    assert.equal(pure.tokenFromPath(p), null, `${p} must not yield a token`);
  }
});

test('traversal over the wire is 404, and the file it aimed at is never opened', async () => {
  const file = fixture('traversal.txt', 'the only file this store knows');
  const secret = fixture('not-shared.txt', 'MUST NOT BE SERVED');
  const { store } = makeStore();
  try {
    await store.create(file);
    const port = store.localPort();
    const rel = path.relative('/', secret);
    for (const p of [
      '/s/../../etc/passwd',
      '/s/..%2f..%2fetc%2fpasswd',
      `/s/../../../${rel}`,
      `/s/${encodeURIComponent(secret)}`,
      `/../${rel}`,
      '/s/%2e%2e%2f%2e%2e%2fetc%2fhosts'
    ]) {
      const r = await raw(port, p);
      assert.equal(r.status, 404, `${p} must be 404`);
      assert.equal(r.body.length, 0, `${p} must return no bytes`);
      assert.equal(r.body.toString().includes('MUST NOT BE SERVED'), false);
    }
  } finally {
    store.stop();
  }
});

/* ---- 6. what the server sends and what revoking does --------------------- */

test('a served share is an attachment with a sanitised name and no sniffing', async () => {
  const file = fixture('report.pdf', 'not really a pdf, but the headers are the test');
  const { store } = makeStore();
  try {
    const created = await store.create(file);
    const port = store.localPort();
    const token = created.share.url.split('/s/')[1];
    const r = await raw(port, `/s/${token}`);
    assert.equal(r.status, 200);
    assert.match(r.headers['content-disposition'], /^attachment;/,
      'a share is a download, never a page rendered in the tunnel origin');
    assert.match(r.headers['content-disposition'], /filename="report\.pdf"/);
    assert.equal(r.headers['x-content-type-options'], 'nosniff');
    assert.equal(r.headers['cache-control'], 'no-store');
    assert.equal(r.headers['accept-ranges'], 'none');
    assert.equal(r.headers['content-length'], String(fs.statSync(file).size));
  } finally {
    store.stop();
  }
});

test('an active html file is served as an octet stream, never as html', () => {
  assert.equal(pure.contentTypeFor('page.html'), 'application/octet-stream');
  assert.equal(pure.contentTypeFor('vector.svg'), 'application/octet-stream');
  assert.equal(pure.contentTypeFor('script.js'), 'application/octet-stream');
  assert.equal(pure.contentTypeFor('shot.png'), 'image/png');
  assert.equal(pure.contentTypeFor('notes.md'), 'text/plain');
});

test('a hostile file name cannot break out of the header', () => {
  assert.equal(pure.safeFileName('../../etc/passwd'), 'passwd', 'directory components are dropped');
  assert.equal(pure.safeFileName('C:\\Windows\\system32\\x.dll'), 'x.dll');
  assert.equal(pure.safeFileName('a"; drop"table.txt'), 'a; droptable.txt', 'the quote cannot survive');
  assert.equal(pure.safeFileName('line\r\nX_Injected: 1.txt'), 'lineX_Injected: 1.txt',
    'a newline cannot forge a second header');
  assert.equal(pure.safeFileName('..'), 'download');
  assert.equal(pure.safeFileName(''), 'download');
  const cd = pure.contentDisposition('rapport été.pdf');
  assert.match(cd, /^attachment; filename="rapport _t_\.pdf"/, 'the ascii form is transliterated');
  assert.match(cd, /filename\*=UTF-8''rapport%20%C3%A9t%C3%A9\.pdf$/, 'the utf8 form survives');
  assert.equal(cd.split('"').length, 3, 'exactly one quoted run, so nothing escaped the header');
});

test('revoking kills the link and leaves the file alone', async () => {
  const file = fixture('revoke.txt', 'this file outlives its link');
  const { store } = makeStore();
  try {
    const created = await store.create(file);
    const port = store.localPort();
    const token = created.share.url.split('/s/')[1];
    assert.equal((await raw(port, `/s/${token}`)).status, 200);

    assert.deepEqual(store.revoke(created.share.id), { ok: true });
    assert.deepEqual(store.revoke(created.share.id), { ok: false }, 'revoking twice is not an error');
    assert.deepEqual(store.revoke('fs-nope'), { ok: false });
    assert.equal(store.list().length, 0);
    assert.equal(fs.existsSync(file), true, 'a share is a link, never a copy, and revoking deletes nothing');
    assert.equal(fs.readFileSync(file, 'utf8'), 'this file outlives its link');
  } finally {
    store.stop();
  }
});

/* ---- 7. main re-validates everything ------------------------------------- */

test('main refuses what the renderer should never have sent', async () => {
  const { store } = makeStore({ maxBytes: 32 });
  try {
    assert.deepEqual(await store.create('relative/path.txt'), { ok: false, error: 'notAbsolute' });
    assert.deepEqual(await store.create(''), { ok: false, error: 'notAbsolute' });
    assert.deepEqual(await store.create(null), { ok: false, error: 'notAbsolute' });
    assert.deepEqual(await store.create(42), { ok: false, error: 'notAbsolute' });
    assert.deepEqual(await store.create(TMP), { ok: false, error: 'notAFile' }, 'a directory is not a file');
    assert.deepEqual(
      await store.create(path.join(TMP, 'does-not-exist.txt')),
      { ok: false, error: 'unreadable' }
    );
    const big = fixture('big.bin', Buffer.alloc(64));
    assert.deepEqual(await store.create(big), { ok: false, error: 'tooBig' });
    assert.equal(store.localPort(), 0, 'nothing was bound, because nothing was accepted');
  } finally {
    store.stop();
  }
});

test('the active share count is capped', async () => {
  const file = fixture('capped.txt', 'x');
  const { store } = makeStore({ maxShares: 2 });
  try {
    assert.equal((await store.create(file)).ok, true);
    assert.equal((await store.create(file)).ok, true);
    assert.deepEqual(await store.create(file), { ok: false, error: 'tooMany' });
  } finally {
    store.stop();
  }
});

test('no tunnel means no share, rather than a link nobody can use', async () => {
  const file = fixture('no-tunnel.txt', 'x');
  const { store } = makeStore({ openTunnel: async () => { throw new Error('relay down'); } });
  try {
    assert.deepEqual(await store.create(file), { ok: false, error: 'noTunnel' });
    assert.equal(store.list().length, 0, 'a half share is never registered');
    assert.equal(store.publicUrl(), null);
  } finally {
    store.stop();
  }
});

test('many shares ride one server and one tunnel', async () => {
  const a = fixture('one.txt', 'AAA');
  const b = fixture('two.txt', 'BBB');
  let tunnels = 0;
  const { store, clock } = makeStore({
    openTunnel: async (port) => { tunnels++; return `http://127.0.0.1:${port}`; }
  });
  try {
    const first = await store.create(a);
    clock.t += 1000;
    const second = await store.create(b);
    assert.equal(tunnels, 1, 'one tunnel, not one per file');
    const port = store.localPort();
    assert.equal((await raw(port, `/s/${first.share.url.split('/s/')[1]}`)).body.toString(), 'AAA');
    assert.equal((await raw(port, `/s/${second.share.url.split('/s/')[1]}`)).body.toString(), 'BBB');
    assert.deepEqual(store.list().map((s) => s.name), ['two.txt', 'one.txt'], 'newest first');
  } finally {
    store.stop();
  }
});

test('the view that crosses the bridge carries no local path', async () => {
  const file = fixture('view.txt', 'x');
  const { store } = makeStore();
  try {
    const created = await store.create(file);
    assert.deepEqual(
      Object.keys(created.share).sort(),
      ['contentType', 'createdAt', 'expiresAt', 'id', 'name', 'size', 'url']
    );
    assert.equal(JSON.stringify(created.share).includes(TMP), false,
      'the renderer is never told where the file lives on disk');
    assert.match(created.share.id, /^fs-[0-9a-f]{16}$/);
    assert.equal(created.share.expiresAt - created.share.createdAt, 60 * 60 * 1000);
  } finally {
    store.stop();
  }
});

/* ---- 8. the token never leaks into a log or an error --------------------- */

test('nothing in the store or the store copy can print a token', () => {
  const main = read('src/main/fileShare.ts');
  // Every console call in this file, if there is one, must be about an id.
  const logs = main.match(/console\.[a-z]+\([^)]*\)/g) ?? [];
  for (const line of logs) {
    assert.equal(/token/i.test(line), false, `a log line mentions a token: ${line}`);
  }
  // A refusal is a code, never a sentence, so no error string can carry a path
  // or a token by accident.
  for (const code of ['notAbsolute', 'notAFile', 'unreadable', 'tooBig', 'tooMany', 'noServer', 'noTunnel']) {
    assert.ok(main.includes(`error: '${code}'`), `${code} must be returned as a code`);
  }
});

/* ---- 9. the copy --------------------------------------------------------- */

test('every file share string exists in the three locales, with no dash', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (
    v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]
  ));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [
    l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))
  ]));
  const keys = [
    'team.fileShare.title', 'team.fileShare.choose', 'team.fileShare.choosing',
    'team.fileShare.confirmTitle', 'team.fileShare.confirmBody', 'team.fileShare.confirmAction',
    'team.fileShare.warning', 'team.fileShare.copy', 'team.fileShare.copied',
    'team.fileShare.revoke', 'team.fileShare.revoked', 'team.fileShare.empty',
    'team.fileShare.active', 'team.fileShare.publishing',
    'team.fileShare.left.hours', 'team.fileShare.left.hour',
    'team.fileShare.left.minutes', 'team.fileShare.left.minute',
    'team.fileShare.left.seconds', 'team.fileShare.left.second',
    'team.fileShare.left.expired',
    'team.fileShare.error.notAbsolute', 'team.fileShare.error.notAFile',
    'team.fileShare.error.unreadable', 'team.fileShare.error.tooBig',
    'team.fileShare.error.tooMany', 'team.fileShare.error.noServer',
    'team.fileShare.error.noTunnel'
  ];
  for (const k of keys) {
    for (const l of Object.keys(locales)) {
      assert.ok(locales[l].has(k), `${k} is missing from ${l}`);
      const v = locales[l].get(k);
      assert.equal(typeof v, 'string');
      assert.ok(!/[—–]/.test(v) && !/ - /.test(v), `${k} (${l}) carries a dash: ${v}`);
      assert.equal(/michael/i.test(v), false, `${k} (${l}) names the orchestrator`);
    }
  }
  // The confirm has to say the two things that make it a real confirm: anyone,
  // and one hour. Not a vague "are you sure".
  const confirm = locales.en.get('team.fileShare.confirmBody');
  assert.match(confirm, /anyone/i, 'the confirm must say ANYONE with the link');
  assert.match(confirm, /hour/i, 'the confirm must say how long it lives');
  assert.match(confirm, /\{\{name\}\}/, 'and name the file being published');
});

test('the English copy in the pure module and the button carries no dashes', () => {
  const shared = read('src/shared/fileShare.ts');
  const button = read('src/renderer/src/components/team/ShareFileButton.tsx');
  // Only the string literals, so prose in comments is not the subject here.
  for (const [label, src] of [['shared', shared], ['button', button]]) {
    const literals = src.match(/'[^'\n]*'|`[^`\n]*`/g) ?? [];
    for (const lit of literals) {
      assert.equal(/[—–]/.test(lit), false, `${label} literal carries a dash: ${lit}`);
    }
  }
  // The countdown words themselves, generated rather than typed.
  for (const ms of [0, 1200, 59_000, 60_000, 58 * 60 * 1000, 60 * 60 * 1000]) {
    const said = pure.expiresIn({ expiresAt: ms }, 0);
    assert.equal(/[—–]/.test(said) || / - /.test(said), false, `"${said}" carries a dash`);
  }
});

test('the button confirms before it publishes, and the confirm is not optional', () => {
  const src = read('src/renderer/src/components/team/ShareFileButton.tsx');
  // The publish call may exist in exactly one place, and that place is behind
  // the confirm. If this ever becomes two call sites, one of them is a path
  // that puts a file on the internet without asking.
  const calls = src.match(/fileShareCreate\(/g) ?? [];
  assert.equal(calls.length, 1, 'fileShareCreate must have exactly one call site');
  assert.match(src, /ConfirmDialog/, 'the confirm is the kit dialog, not a bespoke one');
  assert.match(src, /team\.fileShare\.confirmBody/, 'and it shows the plain warning copy');
  assert.match(src, /danger/, 'publishing to the internet is a danger confirm');
  // Even borders only, and tokens rather than literal colour.
  assert.equal(/border(Top|Right|Bottom|Left):/.test(src), false, 'even 1px borders only');
  assert.equal(/#[0-9a-fA-F]{3,8}\b/.test(src), false, 'colours come from tokens, never a literal hex');
});

/* ---- 10. the bridge ------------------------------------------------------ */

test('the three IPC channels exist on both sides of the bridge', () => {
  const preload = read('src/preload/index.ts');
  const main = read('src/main/index.ts');
  for (const channel of ['fileShare:create', 'fileShare:list', 'fileShare:revoke']) {
    assert.ok(preload.includes(`'${channel}'`), `${channel} is not exposed in the preload`);
    assert.ok(main.includes(`ipcMain.handle('${channel}'`), `${channel} has no handler in main`);
  }
});

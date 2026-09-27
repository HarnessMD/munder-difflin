'use strict';

/* Review finding 9: two shares created before the first listener is up bind TWO
 * listeners, and one is never closed.
 *
 * `ensureServer` had no pending guard. Both calls saw `this.server === null`,
 * both called listen, the second overwrote `this.server`, and the tunnel had
 * been opened on the FIRST port, the one nothing pointed at any more. Revoke
 * every share, even stop the store, and that listener stayed open behind the
 * public tunnel until the app quit. It is the fault 1afccb47 exists to fix,
 * "a door we said was shut", one function over.
 *
 * REAL sockets here. The review could only show it with a faked createServer
 * because its sandbox refused listen(), and a fake only proves the fake. With
 * real ones the fault is real but NOT as the review described it: the tunnel
 * ends up on the listener the store keeps, and the LEAKED one is loopback only.
 * So it is not a public door. It is a listener nothing owns, that survives
 * stop(), and that keeps the process from exiting: the first version of this
 * test hung for exactly that reason, and passed, because it only looked at the
 * ports the store knew about. Hence the count of every server really made. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

// Count every http server that is REALLY created. Wrapped before the module
// loads; the compiled module reads `createServer` off node:http at call time.
const http = require('node:http');
const made = [];
const realCreateServer = http.createServer;
http.createServer = (...args) => { const s = realCreateServer(...args); made.push(s); return s; };

const { FileShareStore } = loadTs('src/main/fileShare.ts');
const listening = () => made.filter((s) => s.listening).map((s) => s.address().port);

/** Is anything accepting connections on this loopback port? */
const isOpen = (port) => new Promise((resolve) => {
  const s = net.connect({ port, host: '127.0.0.1' });
  s.once('connect', () => { s.destroy(); resolve(true); });
  s.once('error', () => resolve(false));
  s.setTimeout(1000, () => { s.destroy(); resolve(false); });
});

test('two creates at once share ONE listener, and revoking both leaves nothing listening', async () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'md-share-')), 'a.txt');
  fs.writeFileSync(f, 'body');
  const tunnelled = [];
  const store = new FileShareStore({
    ttlMs: 60_000,
    openTunnel: async (port) => { tunnelled.push(port); await new Promise((r) => setTimeout(r, 30)); return 'https://t.example'; }
  });
  const [a, b] = await Promise.all([store.create(f), store.create(f)]);
  assert.equal(a.ok && b.ok, true, JSON.stringify([a, b]));
  assert.equal(made.length, 1, `two creates at once made ${made.length} listeners: ${listening()}`);
  assert.deepEqual(listening(), [store.localPort()], 'a listener exists that the store does not hold');
  assert.equal(await isOpen(store.localPort()), true, 'the control: the listener the store knows about is up');
  assert.deepEqual([...new Set(tunnelled)], [store.localPort()], `the tunnel was opened on a port the store no longer holds: tunnel ${tunnelled}, store ${store.localPort()}`);

  const ports = [...new Set([...tunnelled, store.localPort()])];
  store.revoke(a.share.id);
  store.revoke(b.share.id);
  await new Promise((r) => setTimeout(r, 100));
  for (const p of ports) assert.equal(await isOpen(p), false, `port ${p} is still accepting connections with ZERO shares`);
  assert.deepEqual(listening(), [], 'a listener is still up with ZERO shares');
  store.stop();
  for (const p of ports) assert.equal(await isOpen(p), false, `port ${p} survived stop()`);
  assert.deepEqual(listening(), [], 'a listener survived stop()');
});

test.after(() => { for (const s of made) { try { s.closeAllConnections?.(); s.close(); } catch { /* already closed */ } } http.createServer = realCreateServer; });

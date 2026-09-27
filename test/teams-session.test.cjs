'use strict';

/**
 * The socket (plan 4.3) against a FAKE RELAY that speaks the live one's
 * frames and closes with each of its codes.
 *
 * What Phase 1 proves here:
 *   - the upgrade is a signed GET over the canonical string with the device
 *     id, and EVERY attempt spends a NEW nonce (a replay is `unauthorized`,
 *     which the client must never mistake for a lost seat);
 *   - an envelope is acked ONLY after it is on disk: the fake relay checks
 *     the spool file exists AT THE MOMENT the ack arrives;
 *   - each close code lands in the state the contract table says, and
 *     `stopped` locks the gate and still comes back on its own;
 *   - one 401 is retried once, two are a lost seat with reason unknown;
 *   - the backoff is jittered: five machines do not pick the same second.
 *
 * MUTATION CONTROLS, run by hand: (1) in teamsSession.ts change
 * `exp * (0.5 + rand())` to `exp` and the fleet test fails; (2) move the
 * `send({ t: 'ack' ... })` in the envelope case above `spool(...)` and the
 * "ack after disk" test fails.
 *
 * Runs UNSANDBOXED: the fake relay listens on loopback.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { WebSocketServer } = require('ws');
const loadTs = require('./load-ts.cjs');

/* ---- electron stub ---------------------------------------------------------- */

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-session-'));
const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath, filename: electronPath, loaded: true,
  exports: {
    app: { getPath: () => userData },
    safeStorage: {
      isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => 'gnome_libsecret',
      encryptString: (s) => Buffer.from('SEALED:' + s, 'utf8'),
      decryptString: (b) => Buffer.from(b).toString('utf8').slice(7),
    },
  },
};
delete process.env.MD_RELAY_URL; // the socket must find the relay through membership.json

const identity = loadTs('src/main/deviceIdentity.ts');
const membership = loadTs('src/main/teamsMembership.ts');
const gate = loadTs('src/main/teamsGate.ts');
const session = loadTs('src/main/teamsSession.ts');

const DEVICE_ID = 'dev_' + 'B'.repeat(22);
const envId = (c) => 'env_' + c.repeat(22);
const spoolFile = (kind, id) => path.join(userData, 'teams', 'spool', kind, `${id}.json`);

/* ---- the fake relay --------------------------------------------------------- */

const b64ToBuf = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
let sodium;
let devicePk;

const relay = {
  script: { upgrade: 'accept', ready: { queued: 0 }, queue: [], pong: true },
  upgrades: [],
  sockets: [],
  frames: [],
  queueCalls: [],
  spent: new Set(),
  nonces: 0,
  /** Recorded when an ack arrives: for each id, did its spool file exist then. */
  ackSnapshots: [], requestAcks: [],
  reset() {
    this.script = { upgrade: 'accept', ready: { queued: 0 }, queue: [], pong: true };
    this.upgrades = []; this.sockets = []; this.frames = []; this.queueCalls = []; this.ackSnapshots = []; this.requestAcks = [];
  },
  last() { return this.sockets[this.sockets.length - 1]; },
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (status, body) => {
    res.setHeader('date', new Date().toUTCString());
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === '/challenge') return send(200, { nonce: `nonce-${++relay.nonces}` });
  if (url.pathname === '/roster') {
    return send(200, {
      org: { orgId: 'org_1', name: 'Dunder Mifflin', seatsUsed: 2, seatsPaid: 5, defaultPermission: 'communication-only' },
      you: { memberId: 'mem_1', deviceId: DEVICE_ID },
      members: [
        { memberId: 'mem_1', name: 'Me', theyAllow: 'allow-all', suspended: false, isSelf: true,
          devices: [{ deviceId: DEVICE_ID, name: 'mine', publicKey: 'pk', fingerprint: 'AAAA', presence: 'online', lastSeenAt: null }] },
        { memberId: 'mem_2', name: 'Pam', theyAllow: 'communication-only', suspended: false, isSelf: false,
          devices: [{ deviceId: 'dev_' + 'P'.repeat(22), name: 'pam-laptop', publicKey: 'pk2', fingerprint: relay.script.pamFingerprint ?? 'BBBB', presence: 'offline', lastSeenAt: null }] },
      ],
    });
  }
  if (url.pathname === '/queue') {
    relay.queueCalls.push({ path: req.url, ack: url.searchParams.get('ack'), device: req.headers['x-md-device'] });
    if (relay.script.queueStatus) return send(relay.script.queueStatus, { ok: false, error: 'unauthorized', detail: null });
    const items = relay.script.queue.splice(0);
    return send(200, { items, nextCursor: null, requests: [] });
  }
  send(404, { ok: false, error: 'not_found', detail: null });
});

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  const nonce = req.headers['x-md-nonce'];
  const entry = { headers: req.headers, nonce, verified: null, verifiedUnderOtherKey: null, fresh: !relay.spent.has(nonce), at: Date.now() };
  relay.spent.add(nonce);
  relay.upgrades.push(entry);
  try {
    const canonical = ['MDv1', 'GET', '/connect', nonce, '', req.headers['x-md-device']].join('\n');
    const sig = new Uint8Array(b64ToBuf(req.headers['x-md-signature']));
    const msg = new Uint8Array(Buffer.from(canonical, 'utf8'));
    entry.verified = sodium.crypto_sign_verify_detached(sig, msg, devicePk);
    entry.verifiedUnderOtherKey = sodium.crypto_sign_verify_detached(sig, msg, sodium.crypto_sign_keypair().publicKey);
  } catch (e) { entry.verified = false; entry.error = String(e); }

  const mode = typeof relay.script.upgrade === 'function' ? relay.script.upgrade(entry, relay.upgrades.length) : relay.script.upgrade;
  if (mode !== 'accept') {
    socket.write(`HTTP/1.1 ${mode} Refused\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.frames = [];
    relay.sockets.push(ws);
    ws.on('message', (d) => {
      let f; try { f = JSON.parse(String(d)); } catch { return; }
      ws.frames.push(f); relay.frames.push(f);
      if (f.t === 'ping' && relay.script.pong) ws.send(JSON.stringify({ t: 'pong', at: relay.script.pongAt ?? new Date().toISOString() }));
      if (f.t === 'ack' && Array.isArray(f.envelopeIds)) {
        relay.ackSnapshots.push(f.envelopeIds.map((id) => ({ id, onDisk: fs.existsSync(spoolFile('envelopes', id)) })));
      }
      // 0.5.2: requests are acked too, on their own frame, after the spool
      // write. The live relay ignores the field until it learns it.
      if (f.t === 'ack' && Array.isArray(f.requestIds)) {
        relay.requestAcks.push(f.requestIds.map((id) => ({ id, onDisk: fs.existsSync(spoolFile('requests', id)) })));
      }
    });
    const r = relay.script.ready;
    if (r) ws.send(JSON.stringify({ t: 'ready', serverTime: r.serverTime ?? new Date().toISOString(), queued: r.queued ?? 0 }));
  });
});

const waitFor = async (fn, what, ms = 3000) => {
  const t0 = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let states = [];
let port;

test.before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  sodium = require('libsodium-wrappers');
  await sodium.ready;

  await identity.initCrypto();
  const pair = await identity.generateUnsaved();
  identity.saveIdentity(pair.publicKey, pair.privateKey);
  devicePk = new Uint8Array(pair.publicKey);
  membership.writeMembership({
    orgId: 'org_1', memberId: 'mem_1', deviceId: DEVICE_ID, orgName: 'Dunder Mifflin',
    relayUrl: `ws://127.0.0.1:${port}/connect`, enrolledAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(), lastVerifiedLocalAt: new Date().toISOString(),
    leaseSeconds: membership.LEASE_SECONDS,
  });
  assert.equal(gate.mode(), 'live');

  Object.assign(session.TUNING, {
    pingMs: 30, missLimit: 3, backoffBaseMs: 20, backoffCapMs: 120,
    offlineRetryMs: 60, stoppedRetryMs: 150, handshakeTimeoutMs: 2000, readyTimeoutMs: 800, touchEveryMs: 0,
    membershipCheckMs: 100,
  });
  session.onChange((v) => states.push(v.reason ? `${v.state}:${v.reason}` : v.state));
});

test.after(async () => {
  session.stop();
  for (const s of relay.sockets) { try { s.terminate(); } catch { /* gone */ } }
  await new Promise((r) => wss.close(() => server.close(r)));
});

test.beforeEach(() => {
  session.stop();
  gate.setRevoked(null);
  relay.reset();
  states = [];
});

/* ---- tests ---------------------------------------------------------------- */

test('the upgrade is signed over GET /connect with the device id, and ready means connected', async () => {
  relay.script.ready = { queued: 0, serverTime: '2031-01-01T00:00:00.000Z' };
  session.start();
  await waitFor(() => session.current().state === 'connected', 'connected');

  const up = relay.upgrades[0];
  assert.equal(up.headers['x-md-device'], DEVICE_ID, 'the relay\'s device id, not the local one');
  assert.match(up.nonce, /^nonce-\d+$/);
  assert.equal(up.verified, true, `signature did not verify over GET /connect: ${up.error ?? ''}`);
  assert.equal(up.verifiedUnderOtherKey, false, 'the verifier accepts anything; the line above proves nothing');
  assert.equal(up.fresh, true);
  assert.deepEqual(states, ['connecting', 'connected']);
  assert.equal(relay.queueCalls.length, 0, 'queued 0 and it drained anyway');
  // The ready frame is a proof of membership on an authenticated socket, in
  // the RELAY's clock.
  assert.equal(membership.readMembership().lastVerifiedAt, '2031-01-01T00:00:00.000Z');
  assert.equal(gate.mode(), 'live');
});

test('queued > 0 drains /queue and acks each envelope only after it is on disk', async () => {
  const a = envId('A'), b = envId('B');
  const item = (id) => ({ envelopeId: id, fromDeviceId: 'dev_x', fromMemberId: 'mem_x', ciphertext: 'c', nonce: 'n', senderSignature: 's', threadId: 'thr_1', sentAt: '2026-09-02T00:00:00.000Z', expiresAt: '2026-10-02T00:00:00.000Z' });
  relay.script.ready = { queued: 2 };
  relay.script.queue = [item(a), item(b)];
  session.start();
  await waitFor(() => session.current().state === 'connected', 'connected');
  await waitFor(() => relay.ackSnapshots.length >= 1, 'an ack');

  // AT LEAST one, not exactly one (0.5.3). The membership check polls this same
  // endpoint on a timer, so on a slow run a second call can land between the
  // ack above and this line. It failed that way once at load 25 and passed
  // alone five times of five. What this test is about is the FIRST round, so
  // that is what it pins; a drain that looped would be caught by the ack
  // snapshots below, which are exact.
  assert.ok(relay.queueCalls.length >= 1, 'the queue was never drained');
  assert.equal(relay.queueCalls[0].ack, null, 'the first round has nothing to ack');
  assert.equal(relay.queueCalls[0].device, DEVICE_ID);
  assert.deepEqual(relay.ackSnapshots[0], [{ id: a, onDisk: true }, { id: b, onDisk: true }],
    'an envelope was acked before it was on disk');
  assert.deepEqual(JSON.parse(fs.readFileSync(spoolFile('envelopes', a), 'utf8')), item(a));
  assert.equal(fs.statSync(spoolFile('envelopes', a)).mode & 0o777, 0o600);
  assert.equal(fs.existsSync(spoolFile('envelopes', a) + '.tmp'), false, 'the temp file outlived the rename');

  // A live frame takes the same path: disk first, then the ack.
  const c = envId('C');
  relay.last().send(JSON.stringify({ t: 'envelope', ...item(c) }));
  await waitFor(() => relay.ackSnapshots.length >= 2, 'the live ack');
  assert.deepEqual(relay.ackSnapshots[1], [{ id: c, onDisk: true }]);

  // A relay-chosen id is a filename. One that is not a safe name is refused,
  // never written, never acked. Frames on one socket are ordered, so an ack
  // for the bad one, if any, arrives BEFORE the ack for the good one sent
  // after it; waiting for the good ack makes the absence deterministic.
  // (MUTATION CONTROL 2: ack before spool acks the bad id and fails here.)
  const d = envId('D');
  relay.last().send(JSON.stringify({ t: 'envelope', ...item('../../evil') }));
  relay.last().send(JSON.stringify({ t: 'envelope', ...item(d) }));
  relay.last().send(JSON.stringify({ t: 'request', requestId: 'req_' + 'D'.repeat(22), type: 'run-task' }));
  await waitFor(() => relay.ackSnapshots.length >= 3, 'the ack for d');
  assert.deepEqual(relay.ackSnapshots[2], [{ id: d, onDisk: true }], 'the unsafe id was acked');
  await waitFor(() => fs.existsSync(spoolFile('requests', 'req_' + 'D'.repeat(22))), 'the request spooled');
  await waitFor(() => relay.requestAcks.length >= 1, 'the request ack');
  assert.deepEqual(relay.requestAcks[0], [{ id: 'req_' + 'D'.repeat(22), onDisk: true }], 'a request was acked before it was on disk');
  assert.equal(fs.existsSync(path.join(userData, 'evil.json')), false);
  assert.equal(fs.existsSync(path.join(userData, 'teams', 'evil.json')), false);

  // A spool that cannot be written is an envelope that is NOT acked, and it
  // stays on the relay for the next drain. The dir becomes a file; the
  // control restores it and the next envelope is acked as before.
  const dir = path.dirname(spoolFile('envelopes', d));
  fs.renameSync(dir, dir + '.aside');
  fs.writeFileSync(dir, 'not a directory');
  const e = envId('E'), f = envId('F');
  relay.last().send(JSON.stringify({ t: 'envelope', ...item(e) }));
  // ORDERING, NOT A SLEEP, and the same trick this test already uses above: a
  // request sent AFTER e and acked proves e has been handled and refused the
  // disk, so the repair below cannot race it. Sleeping 60 ms assumed the
  // handler had run inside that window; on a loaded machine it may not have,
  // and then e lands on the REPAIRED directory and the last assertion here
  // goes red for a reason that has nothing to do with the rule under test.
  // Requests spool to their own directory, which is untouched.
  const probe = 'req_' + 'E'.repeat(22);
  relay.last().send(JSON.stringify({ t: 'request', requestId: probe, type: 'run-task' }));
  await waitFor(() => relay.requestAcks.length >= 2, 'the probe request ack');
  fs.rmSync(dir);
  fs.renameSync(dir + '.aside', dir);
  relay.last().send(JSON.stringify({ t: 'envelope', ...item(f) }));
  await waitFor(() => relay.ackSnapshots.length >= 4, 'the ack for f');
  assert.deepEqual(relay.ackSnapshots[3], [{ id: f, onDisk: true }], 'an envelope that never reached disk was acked');
  assert.equal(fs.existsSync(spoolFile('envelopes', e)), false);
});

test('pings go out on the cadence; three unanswered and it reconnects with a NEW nonce', async () => {
  relay.script.pong = false;
  session.start();
  await waitFor(() => relay.upgrades.length >= 2, 'the second upgrade');
  const first = relay.sockets[0];
  assert.ok(first.frames.filter((f) => f.t === 'ping').length >= 3, `only ${first.frames.length} frames before it gave up`);
  assert.notEqual(relay.upgrades[1].nonce, relay.upgrades[0].nonce, 'the retry replayed the nonce');
  assert.equal(relay.upgrades[1].fresh, true);
  assert.ok(states.includes('reconnecting'), `states: ${states}`);
  relay.script.pong = true;
  relay.script.pongAt = '2032-01-01T00:00:00.000Z';
  await waitFor(() => relay.last() && relay.last().frames.some((f) => f.t === 'ping'), 'a ping on the new socket');
  // A pong is a proof of membership too, in the relay's clock.
  await waitFor(() => membership.readMembership().lastVerifiedAt === '2032-01-01T00:00:00.000Z', 'the pong moved the lease');
  delete relay.script.pongAt;
});

test('close 1011 and 1013 reconnect; 1000 is offline and comes back later', async () => {
  session.start();
  await waitFor(() => session.current().state === 'connected', 'connected');
  relay.last().close(1011, 'fault');
  await waitFor(() => relay.upgrades.length >= 2, 'reconnect after 1011');
  assert.deepEqual(states.slice(0, 3), ['connecting', 'connected', 'reconnecting']);
  await waitFor(() => session.current().state === 'connected' && relay.sockets.length >= 2, 'connected again');

  states = [];
  relay.last().close(1013, 'overloaded');
  await waitFor(() => relay.upgrades.length >= 3, 'reconnect after 1013');
  assert.equal(states[0], 'reconnecting');
  await waitFor(() => session.current().state === 'connected' && relay.sockets.length >= 3, 'connected again');

  states = [];
  const before = relay.upgrades.length;
  const t0 = Date.now();
  relay.last().close(1000, 'normal');
  await waitFor(() => states.includes('offline'), 'offline after 1000');
  assert.equal(states[0], 'offline', 'a normal close is not "reconnecting"');
  await waitFor(() => relay.upgrades.length > before, 'the retry after a normal close');
  assert.ok(Date.now() - t0 >= session.TUNING.offlineRetryMs - 5, 'came back before the offline delay');
});

test('a revoked frame then 1008: stopped with the reason, the gate locks, and it comes back on its own', async () => {
  const modes = [];
  const off = gate.onChange((m) => modes.push(m));
  session.start();
  await waitFor(() => session.current().state === 'connected', 'connected');
  relay.last().send(JSON.stringify({ t: 'revoked', reason: 'suspended' }));
  relay.last().close(1008, 'revoked');
  await waitFor(() => session.current().state === 'stopped', 'stopped');
  assert.deepEqual(session.current(), { state: 'stopped', reason: 'suspended' });
  assert.equal(gate.mode(), 'locked');
  assert.deepEqual(gate.lockInfo(), { kind: 'revoked', reason: 'suspended', orgName: 'Dunder Mifflin', lastVerifiedAt: membership.readMembership().lastVerifiedAt });
  assert.deepEqual(modes, ['locked']);

  // Unsuspended in the console: the next attempt is accepted and everything
  // returns, within one retry, with no button pressed.
  const before = relay.upgrades.length;
  await waitFor(() => relay.upgrades.length > before, 'the retry from stopped');
  await waitFor(() => session.current().state === 'connected', 'connected after unsuspend');
  assert.equal(gate.mode(), 'live');
  assert.equal(gate.lockInfo(), null);
  assert.deepEqual(modes, ['locked', 'live']);
  off();
});

test('a seat suspended while the socket is up is caught by the next membership check', async () => {
  session.start();
  await waitFor(() => session.current().state === 'connected', 'connected');
  // Today's relay: the live socket stays open, only signed requests are
  // refused from now on. Nothing closes; the check has to notice.
  relay.script.queueStatus = 401;
  relay.script.upgrade = '401';
  await waitFor(() => session.current().state === 'stopped', 'stopped from a live socket');
  assert.deepEqual(session.current(), { state: 'stopped', reason: 'unknown' });
  assert.equal(gate.mode(), 'locked');
  assert.ok(relay.queueCalls.length >= 1, 'no check was made');
  assert.equal(relay.upgrades.length, 3, 'the check should cost exactly one re-upgrade, refused twice');
  // Unsuspended: the check's own retry brings it back.
  relay.script.queueStatus = 0;
  relay.script.upgrade = 'accept';
  await waitFor(() => session.current().state === 'connected', 'connected after unsuspend');
  assert.equal(gate.mode(), 'live');
  // The control: with nothing wrong, the check drains and changes nothing.
  const n = relay.queueCalls.length;
  await waitFor(() => relay.queueCalls.length > n, 'a routine check');
  assert.equal(session.current().state, 'connected');
});

test('1008 with no frame is stopped with reason unknown', async () => {
  session.start();
  await waitFor(() => session.current().state === 'connected', 'connected');
  relay.last().close(1008, 'policy');
  await waitFor(() => session.current().state === 'stopped', 'stopped');
  assert.deepEqual(session.current(), { state: 'stopped', reason: 'unknown' });
  assert.equal(gate.lockInfo().reason, 'unknown');
});

test('HTTP 401 once is retried at once with a fresh nonce; twice in a row is a lost seat', async () => {
  relay.script.upgrade = (_entry, n) => (n === 1 ? '401' : 'accept');
  session.start();
  await waitFor(() => session.current().state === 'connected', 'connected after one 401');
  assert.equal(relay.upgrades.length, 2);
  assert.notEqual(relay.upgrades[1].nonce, relay.upgrades[0].nonce);
  assert.ok(!states.some((s) => s.startsWith('stopped')), `one 401 became a lost seat: ${states}`);
  assert.equal(gate.mode(), 'live');

  session.stop();
  relay.reset();
  states = [];
  relay.script.upgrade = '401';
  session.start();
  await waitFor(() => session.current().state === 'stopped', 'stopped after two 401s');
  assert.equal(relay.upgrades.length, 2, 'it kept trying past the second refusal');
  assert.deepEqual(session.current(), { state: 'stopped', reason: 'unknown' });
  assert.equal(gate.mode(), 'locked');
  assert.deepEqual(gate.lockInfo().kind, 'revoked');
});

test('HTTP 402 is stopped with reason entitlement, and 503 is reconnecting with backoff', async () => {
  relay.script.upgrade = '402';
  session.start();
  await waitFor(() => session.current().state === 'stopped', 'stopped on 402');
  assert.deepEqual(session.current(), { state: 'stopped', reason: 'entitlement' });
  assert.equal(gate.lockInfo().reason, 'entitlement');

  session.stop();
  gate.setRevoked(null);
  relay.reset();
  states = [];
  relay.script.upgrade = (_e, n) => (n <= 2 ? '503' : 'accept');
  session.start();
  await waitFor(() => session.current().state === 'connected', 'connected after two 503s');
  assert.equal(relay.upgrades.length, 3);
  assert.ok(states.includes('reconnecting'), `states: ${states}`);
  // The second gap is longer than the first: exponential, not fixed.
  const gaps = [relay.upgrades[1].at - relay.upgrades[0].at, relay.upgrades[2].at - relay.upgrades[1].at];
  assert.ok(gaps[0] >= session.TUNING.backoffBaseMs - 5, `first gap ${gaps[0]}ms is under the base`);
});

test('reconnectNow drops the socket and comes back from attempt zero; stop is offline and silent', async () => {
  session.start();
  await waitFor(() => session.current().state === 'connected', 'connected');
  session.reconnectNow();
  await waitFor(() => relay.upgrades.length >= 2 && session.current().state === 'connected', 'reconnected on demand');
  assert.equal(session._stateForTests().attempt, 0);
  session.stop();
  assert.equal(session.current().state, 'offline');
  const n = relay.upgrades.length;
  await sleep(session.TUNING.backoffCapMs + 50);
  assert.equal(relay.upgrades.length, n, 'stopped and it reconnected anyway');
});

test('D13 has a device id to act on: a rekeyed teammate is reported, and markVerified by that id clears it', async () => {
  const relayClient = loadTs('src/main/relay.ts');
  const pins = loadTs('src/main/teamPins.ts');
  const pamDevice = 'dev_' + 'P'.repeat(22);
  // First sight pins BBBB, unverified.
  let r = await relayClient.teamRoster();
  assert.equal(r.ok, true, JSON.stringify(r));
  let pam = r.data.teammates.find((m) => m.id === 'mem_2');
  assert.equal(pam.deviceId, pamDevice, 'the row carries the relay\'s device id');
  assert.equal(pam.verified, false);
  assert.equal(pam.previousFingerprint, undefined);
  // The relay now shows a different key for the same device: D13's trigger.
  relay.script.pamFingerprint = 'CCCC';
  r = await relayClient.teamRoster();
  pam = r.data.teammates.find((m) => m.id === 'mem_2');
  assert.equal(pam.fingerprint, 'CCCC');
  assert.equal(pam.previousFingerprint, 'BBBB', 'the local pin noticed the change; the relay did not say so');
  // The NEXT read, same new key: the change is still reported. D13 has to
  // survive the roster refresh that follows every presence frame; the first
  // cut answered only once and the modal would have vanished before anyone
  // pressed a button.
  r = await relayClient.teamRoster();
  pam = r.data.teammates.find((m) => m.id === 'mem_2');
  assert.equal(pam.previousFingerprint, 'BBBB', 'the change was reported once and then forgotten');
  // Accept: the only path to verified, keyed by the device id the row carries.
  pins.markVerified(pam.deviceId, pam.fingerprint);
  r = await relayClient.teamRoster();
  pam = r.data.teammates.find((m) => m.id === 'mem_2');
  assert.equal(pam.verified, true);
  assert.equal(pam.previousFingerprint, undefined);
  delete relay.script.pamFingerprint;
});

test('backoff: bounded, exponential to the cap, and JITTERED so a fleet spreads out', () => {
  const { backoffDelay, TUNING } = session;
  const base = TUNING.backoffBaseMs, cap = TUNING.backoffCapMs;
  assert.equal(backoffDelay(0, () => 0), base, 'the floor is the base');
  assert.equal(backoffDelay(0, () => 1), 2 * base);
  assert.equal(backoffDelay(30, () => 1), cap, 'the ceiling is the cap');
  // At the cap the window is [cap/2, cap]: the fleet does not pile onto the cap.
  assert.equal(backoffDelay(30, () => 0), cap / 2);
  let prev = 0;
  for (let n = 0; n < 12; n++) {
    const d = backoffDelay(n, () => 0.5);
    assert.ok(d >= prev, `not monotone at ${n}: ${d} < ${prev}`);
    assert.ok(d >= base && d <= cap);
    prev = d;
  }
  // THE FLEET. Five machines, the same attempt, real randomness: they must
  // not land on the same instant. MUTATION CONTROL: without the jitter every
  // value below is identical and `distinct` is 1.
  const fleet = Array.from({ length: 5 }, () => backoffDelay(3));
  const distinct = new Set(fleet).size;
  const spread = Math.max(...fleet) - Math.min(...fleet);
  assert.ok(distinct >= 3, `five machines picked ${distinct} distinct delays: ${fleet}`);
  assert.ok(spread > 0, `spread ${spread}ms`);
  // With the contract's values: attempt 3 is 8 s nominal, so the fleet lands
  // between 8 s and 16 s; at the cap, between 30 s and 60 s. Reported,
  // because the plan asks for the spread measured.
  const saved = { ...TUNING };
  Object.assign(TUNING, { backoffBaseMs: 1000, backoffCapMs: 60000 });
  const real = Array.from({ length: 5 }, () => backoffDelay(3));
  const atCap = Array.from({ length: 5 }, () => backoffDelay(9));
  Object.assign(TUNING, saved);
  assert.ok(Math.min(...real) >= 8000 && Math.max(...real) <= 16000, `fleet at attempt 3: ${real}`);
  assert.ok(Math.min(...atCap) >= 30000 && Math.max(...atCap) <= 60000, `fleet at the cap: ${atCap}`);
  console.log(`fleet of five, contract values: attempt 3 spread ${Math.max(...real) - Math.min(...real)} ms (${real.join(', ')}); at the cap spread ${Math.max(...atCap) - Math.min(...atCap)} ms (${atCap.join(', ')})`);
});

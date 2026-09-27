'use strict';

/**
 * Michael to Michael (plan 4.6): two laptops, A and B, in one process. The
 * electron stub's `userData` is switched between them, and since every store
 * (identity, membership, pins, threads, spool) reads from disk on each call,
 * a switch is a different machine. The fake relay stores what A posts; the
 * test hands it to B's spool the way the socket would and calls the bridge.
 *
 * What is proved:
 *   - the wire shapes are the relay's (base64url, a 32-char nonce, an 86-char
 *     signature), one /envelope per message with every device id;
 *   - B opens only what verifies against the key it PINNED for A's device:
 *     a forged signature, a tampered ciphertext, a changed key, an unknown
 *     device, a message for another device — none reach the local god;
 *   - both ends' levels bite: strict on B drops and says so in the log;
 *     strict on A's view of B bounces to god before anything is sent;
 *   - a `request` lands in B's queue and DOES NOTHING until approved;
 *     `always` flips B's override and the next one is auto-approved;
 *   - both threads show the message;
 *   - 0.5.2: the sending AGENT's name crosses inside the ciphertext and B
 *     reads "Michael A's Kevin", remembers it, and lists it for god; a
 *     payload sealed by an older build, with no sender, still opens.
 *
 * MUTATION CONTROL, run by hand: in teamsBridge.ts `open()`, replace the
 * `sigOk` check with `sigOk = true` and the forged-sender test fails.
 *
 * Runs UNSANDBOXED: the fake relay listens on loopback.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const loadTs = require('./load-ts.cjs');

/* ---- two machines, one electron stub --------------------------------------- */

const machines = {
  A: { userData: fs.mkdtempSync(path.join(os.tmpdir(), 'cth-bridge-A-')), memberId: 'mem_' + 'A'.repeat(22), deviceId: 'dev_' + 'A'.repeat(22), name: 'Michael A', machine: 'a-laptop' },
  B: { userData: fs.mkdtempSync(path.join(os.tmpdir(), 'cth-bridge-B-')), memberId: 'mem_' + 'B'.repeat(22), deviceId: 'dev_' + 'B'.repeat(22), name: 'Michael B', machine: 'b-laptop' },
};
let current = machines.A;
const on = (m) => { current = machines[m]; };

const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath, filename: electronPath, loaded: true,
  exports: {
    app: { getPath: () => current.userData },
    safeStorage: {
      isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => 'gnome_libsecret',
      encryptString: (s) => Buffer.from('SEALED:' + s, 'utf8'),
      decryptString: (b) => Buffer.from(b).toString('utf8').slice(7),
    },
  },
};
delete process.env.MD_RELAY_URL;

const identity = loadTs('src/main/deviceIdentity.ts');
const membership = loadTs('src/main/teamsMembership.ts');
const pins = loadTs('src/main/teamPins.ts');
const session = loadTs('src/main/teamsSession.ts');
const bridge = loadTs('src/main/teamsBridge.ts');

/* ---- the fake hive (both machines share one; `from` tells them apart) ------- */

const hiveLog = [];
const hiveSent = [];
// 0.5.2: what this floor calls its agents, the way `hive.registry()` would
// answer. Only Kevin is named here ON PURPOSE: the default message above is
// from `michael`, and leaving that id nameless keeps every 0.5.1 pin on the
// `[from Michael A on a-laptop]` prefix exactly as it was, which is also the
// older-sender case. `you` (the person's send box) never has a name.
const agentNames = { kevin: 'Kevin' };
// 0.5.2 (founder ruling, Option A): who answers inbound mail, as main reads it
// from config.responder, and which agents are active to take it. Unset and
// nobody active is the 0.5.1 floor: everything lands with god.
const floor = { responder: undefined, active: [] };
bridge.attach({
  send: (partial, from) => { const m = { ...partial, from: partial.from ?? from }; hiveSent.push(m); return m; },
  appendLog: (e) => hiveLog.push(e),
  godId: () => 'god',
  agentName: (id) => agentNames[id] ?? null,
  responder: () => floor.responder,
  activeAgentIds: () => floor.active,
});
const sentToGod = () => hiveSent.filter((m) => m.to === 'god' && !String(m.subject).startsWith('[refused'));
const bounces = () => hiveSent.filter((m) => String(m.subject).startsWith('[refused'));

/* ---- the fake relay --------------------------------------------------------- */

const toB64url = (b64) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => { const b = s.replace(/-/g, '+').replace(/_/g, '/'); return b + '='.repeat((4 - (b.length % 4)) % 4); };
const relay = {
  keys: { A: null, B: null },          // base64url public keys, as the roster shows them
  theyAllow: { A: 'communication-only', B: 'communication-only' },
  // 0.4.9: what each seat's orchestrator is called. B has one, A does not,
  // so both the named and the unnamed row are exercised everywhere.
  bossName: { A: null, B: 'Scott' },
  suspended: { A: false, B: false },
  // 0.5.2: the door each seat published, as the roster row reports it to the
  // OTHER machine (absent is an older relay), and whether the relay refuses
  // a POST into it with 403 not_receiving.
  receiving: { A: undefined, B: undefined },
  notReceiving: false,
  deliverNow: true,
  envelopes: [],                        // every /envelope body, with a minted id
  requests: [],
  // 0.5.2: every PATCH /me body, with the device that sent it, and how the
  // next one is answered: null is the live relay's 200, else that refusal
  // (an OLDER relay answers `invalid_body` naming the field it lacks).
  patches: [],
  patchMeReject: null,
  nonces: 0,
  reset() {
    this.envelopes = []; this.requests = []; this.deliverNow = true;
    this.theyAllow = { A: 'communication-only', B: 'communication-only' }; this.suspended = { A: false, B: false }; this.bossName = { A: null, B: 'Scott' };
    this.patches = []; this.patchMeReject = null;
    this.receiving = { A: undefined, B: undefined }; this.notReceiving = false;
  },
};
let port;
const mintSeq = { env: 0, req: 0 };

function rosterBody() {
  const dev = (m) => ({ deviceId: machines[m].deviceId, name: machines[m].machine, publicKey: relay.keys[m], fingerprint: 'x', presence: 'online', lastSeenAt: null });
  const member = (m, self) => ({
    memberId: machines[m].memberId, name: machines[m].name, bossName: relay.bossName[m], theyAllow: relay.theyAllow[m], suspended: relay.suspended[m], isSelf: self, devices: [dev(m)],
    ...(typeof relay.receiving[m] === 'boolean' ? { receiving: relay.receiving[m] } : {}),
  });
  const selfKey = current === machines.A ? 'A' : 'B';
  return {
    org: { orgId: 'org_1', name: 'Dunder Mifflin', seatsUsed: 2, seatsPaid: 5, defaultPermission: 'communication-only' },
    you: { memberId: current.memberId, deviceId: current.deviceId },
    members: [member('A', selfKey === 'A'), member('B', selfKey === 'B')],
  };
}

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/challenge') return send(200, { nonce: `nonce-${++relay.nonces}` });
    if (url.pathname === '/roster') return send(200, rosterBody());
    const closedDoor = () => send(403, { error: 'not_receiving', detail: 'Michael B is not receiving messages from you right now.' });
    if (url.pathname === '/envelope') {
      if (relay.notReceiving) return closedDoor();
      const body = JSON.parse(raw);
      // Minted like the live relay's: never reused, even across a reset. A
      // counter that restarted with the list handed a new test an id this
      // machine had already taken, which 0.5.2 rightly refuses.
      const id = 'env_' + String(++mintSeq.env).padStart(22, '1');
      relay.envelopes.push({ id, body, from: req.headers['x-md-device'] });
      return send(202, {
        envelopeIds: Object.fromEntries(body.toDeviceIds.map((d) => [d, id])),
        delivered: relay.deliverNow ? body.toDeviceIds : [], queued: relay.deliverNow ? [] : body.toDeviceIds,
      });
    }
    if (url.pathname === '/request') {
      if (relay.notReceiving) return closedDoor();
      const body = JSON.parse(raw);
      const id = 'req_' + String(++mintSeq.req).padStart(22, '1');
      relay.requests.push({ id, body, from: req.headers['x-md-device'] });
      return send(202, { requestId: id, delivered: [], queued: ['x'] });
    }
    if (url.pathname === '/me' && req.method === 'PATCH') {
      // The 0.5.2 contract: EXACTLY ONE of bossName, name, receive; 200 echoes
      // `you.name` and `you.receive` on the /me body.
      const body = JSON.parse(raw);
      relay.patches.push({ body, from: req.headers['x-md-device'] });
      if (relay.patchMeReject) return send(400, { error: relay.patchMeReject.error, detail: relay.patchMeReject.detail });
      const keys = Object.keys(body);
      if (keys.length !== 1 || !['bossName', 'name', 'receive'].includes(keys[0])) return send(400, { error: 'invalid_body', detail: `expected one of bossName, name, receive; got ${keys.join(', ')}` });
      return send(200, {
        org: { orgId: 'org_1', name: 'Dunder Mifflin', signingKey: 'K'.repeat(43), defaultPermission: 'communication-only', requireFingerprint: false, entitlement: { state: 'healthy', trialEndsAt: null, graceEndsAt: null } },
        you: { memberId: current.memberId, deviceId: current.deviceId, name: 'name' in body ? body.name : current.name, email: null, isAdmin: false, receive: 'receive' in body ? body.receive : null },
        membership: 'active', serverTime: new Date().toISOString(),
      });
    }
    send(404, { ok: false, error: 'not_found', detail: null });
  });
});

/** What the socket would have written to the spool for the machine `to`. */
function spoolEnvelope(to, stored, over = {}) {
  const from = stored.from === machines.A.deviceId ? 'A' : 'B';
  const item = {
    envelopeId: stored.id, fromDeviceId: machines[from].deviceId, fromMemberId: machines[from].memberId,
    ciphertext: stored.body.ciphertext, nonce: stored.body.nonce, senderSignature: stored.body.senderSignature,
    threadId: stored.body.threadId, sentAt: stored.body.sentAt, expiresAt: '2099-01-01T00:00:00.000Z', ...over,
  };
  const dir = path.join(machines[to].userData, 'teams', 'spool', 'envelopes');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${item.envelopeId}.json`), JSON.stringify(item));
  return item;
}

function spoolRequest(to, stored) {
  const from = stored.from === machines.A.deviceId ? 'A' : 'B';
  const item = {
    requestId: stored.id, fromMemberId: machines[from].memberId, fromDeviceId: machines[from].deviceId,
    type: stored.body.type, ciphertext: stored.body.ciphertext, nonce: stored.body.nonce, senderSignature: stored.body.senderSignature,
    at: new Date().toISOString(), expiresAt: stored.body.expiresAt, expired: false,
  };
  const dir = path.join(machines[to].userData, 'teams', 'spool', 'requests');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${item.requestId}.json`), JSON.stringify(item));
  return item;
}

const msg = (over = {}) => ({
  id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, conversation: 'conv-1', in_reply_to: null,
  from: 'michael', to: `member:${machines.B.memberId}`, act: 'inform', subject: 'the export dialog', body: 'Please look at the spacing.\nSecond line.',
  hops: 0, requires_reply: false, needs_human: false, created_at: new Date().toISOString(), ...over,
});

test.before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  await identity.initCrypto();
  for (const m of ['A', 'B']) {
    on(m);
    const pair = await identity.generateUnsaved();
    identity.saveIdentity(pair.publicKey, pair.privateKey);
    relay.keys[m] = toB64url(Buffer.from(pair.publicKey).toString('base64'));
    const now = new Date().toISOString();
    membership.writeMembership({
      orgId: 'org_1', memberId: machines[m].memberId, deviceId: machines[m].deviceId, orgName: 'Dunder Mifflin',
      relayUrl: `ws://127.0.0.1:${port}/connect`, enrolledAt: now, lastVerifiedAt: now, lastVerifiedLocalAt: now,
      leaseSeconds: membership.LEASE_SECONDS,
    });
  }
  on('A');
});

test.after(async () => { await new Promise((r) => server.close(r)); });

test.beforeEach(() => { hiveLog.length = 0; hiveSent.length = 0; relay.reset(); bridge._resetRosterForTests(); });

/* ---- waiting ---------------------------------------------------------------
 * TWO SHAPES, AND THE DIFFERENCE MATTERS. `waitFor` waits for something to
 * happen and fails on a deadline, which is what a positive claim needs: a fixed
 * sleep standing in for it passes on an idle machine and reddens on a loaded
 * one, which is the definition of a flake. `waitQuiet` waits for something to
 * STOP happening, which is what a negative claim needs: it returns once the
 * count has held still for a settle window, so "nothing else is coming" is
 * measured rather than guessed at with a round number of milliseconds.
 */
const waitFor = async (pred, ms = 1500) => {
  const deadline = Date.now() + ms;
  while (!pred() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
  return pred();
};
/** Poll `count` until it has not moved for `quietMs`, or the deadline passes. */
const waitQuiet = async (count, quietMs = 200, ms = 3000) => {
  const deadline = Date.now() + ms;
  let last = count(), stableSince = Date.now();
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 20));
    const now = count();
    if (now !== last) { last = now; stableSince = Date.now(); continue; }
    if (Date.now() - stableSince >= quietMs) return last;
  }
  return count();
};

/* ---- tests ---------------------------------------------------------------- */

test('threadIdFor is symmetric and under the relay\'s 64-char cap', () => {
  const a = bridge.threadIdFor(machines.A.memberId, machines.B.memberId);
  assert.equal(a, bridge.threadIdFor(machines.B.memberId, machines.A.memberId));
  assert.match(a, /^thr_[0-9a-f]{40}$/);
  assert.ok(a.length <= 64);
});

let firstEnvelope;

test('A → B: one /envelope with the relay\'s shapes, and A\'s thread shows it delivered', async () => {
  on('A');
  const m = msg();
  const out = await bridge.send(m);
  assert.deepEqual(out, { ok: true, delivery: 'delivered', via: 'envelope' });
  assert.equal(relay.envelopes.length, 1);
  const e = relay.envelopes[0];
  firstEnvelope = e;
  assert.equal(e.from, machines.A.deviceId);
  assert.deepEqual(e.body.toDeviceIds, [machines.B.deviceId]);
  assert.match(e.body.ciphertext, /^[A-Za-z0-9_-]+$/);
  assert.match(e.body.nonce, /^[A-Za-z0-9_-]{32}$/, 'nonce is 24 bytes base64url');
  assert.match(e.body.senderSignature, /^[A-Za-z0-9_-]{86}$/, 'signature is 64 bytes base64url');
  assert.equal(e.body.threadId, bridge.threadIdFor(machines.A.memberId, machines.B.memberId));
  assert.equal(e.body.sentAt, m.created_at);
  // The relay sees no plaintext.
  assert.ok(!Buffer.from(e.body.ciphertext.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8').includes('spacing'));

  const t = bridge.threadFor(machines.B.memberId);
  assert.equal(t.messages.length, 1);
  assert.equal(t.messages[0].from, 'you');
  assert.equal(t.messages[0].body, m.body);
  assert.equal(t.messages[0].delivery, 'delivered');
  const file = path.join(machines.A.userData, 'teams', 'threads', `${t.threadId}.json`);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.equal(sentToGod().length, 0, 'the sender\'s own god got mail');
});

test('B opens it against A\'s pinned key, hands it to the local god, and B\'s thread shows it', async () => {
  on('B');
  const item = spoolEnvelope('B', firstEnvelope);
  const out = await bridge.receive('envelopes', item.envelopeId);
  assert.equal(out, 'delivered');
  assert.equal(sentToGod().length, 1);
  const got = sentToGod()[0];
  assert.equal(got.from, `member:${machines.A.memberId}`, 'the sender is who the PIN says, not what the wire says');
  assert.equal(got.to, 'god');
  assert.equal(got.subject, `[from Michael A on a-laptop] the export dialog`);
  assert.equal(got.body, 'Please look at the spacing.\nSecond line.');
  assert.equal(got.hops, 0);
  const t = bridge.threadFor(machines.A.memberId);
  assert.equal(t.messages.length, 1);
  assert.equal(t.messages[0].from, machines.A.memberId);
  assert.equal(t.messages[0].delivery, 'delivered');
  assert.equal(fs.existsSync(path.join(machines.B.userData, 'teams', 'spool', 'envelopes', `${item.envelopeId}.json`)), false, 'the spool file outlived delivery');
  // Twice (a drain after an ack the relay did not see): the thread shows it once.
  spoolEnvelope('B', firstEnvelope);
  await bridge.receive('envelopes', item.envelopeId);
  assert.equal(bridge.threadFor(machines.A.memberId).messages.length, 1);
});

test('a forged sender is dropped before decryption: the signature must verify against the pinned key', async () => {
  on('B');
  const sodium = require('libsodium-wrappers'); await sodium.ready;
  const other = sodium.crypto_sign_keypair();
  const sig = sodium.crypto_sign_detached(new Uint8Array(Buffer.from(firstEnvelope.body.ciphertext, 'utf8')), other.privateKey);
  const forged = spoolEnvelope('B', { ...firstEnvelope, id: 'env_' + 'F'.repeat(22) }, { senderSignature: toB64url(Buffer.from(sig).toString('base64')) });
  const out = await bridge.receive('envelopes', forged.envelopeId);
  assert.match(out, /^dropped: senderSignature/);
  assert.equal(sentToGod().length, 0, 'a forged envelope reached the local god');
  // The control: the same bytes with the real signature are delivered.
  const real = spoolEnvelope('B', { ...firstEnvelope, id: 'env_' + 'G'.repeat(22) });
  assert.equal(await bridge.receive('envelopes', real.envelopeId), 'delivered');
  assert.equal(sentToGod().length, 1);
});

test('tampered ciphertext, an unknown device, and an envelope for another device are all dropped', async () => {
  on('B');
  const ct = firstEnvelope.body.ciphertext;
  const tampered = spoolEnvelope('B', { ...firstEnvelope, id: 'env_' + 'T'.repeat(22) }, { ciphertext: ct.slice(0, -2) + (ct.endsWith('AA') ? 'BB' : 'AA') });
  assert.match(await bridge.receive('envelopes', tampered.envelopeId), /^dropped: senderSignature/);
  const unknown = spoolEnvelope('B', { ...firstEnvelope, id: 'env_' + 'U'.repeat(22) }, { fromDeviceId: 'dev_' + 'Z'.repeat(22) });
  assert.match(await bridge.receive('envelopes', unknown.envelopeId), /^dropped: unknown sender device/);
  // A's envelope was sealed for B's device; A's own machine has no key in it.
  on('A');
  const notMine = spoolEnvelope('A', { ...firstEnvelope, id: 'env_' + 'N'.repeat(22), from: machines.B.deviceId });
  assert.match(await bridge.receive('envelopes', notMine.envelopeId), /^dropped: senderSignature|^dropped: no key for this device/);
  assert.equal(sentToGod().length, 0);
});

/* 0.4.10: the one word level became a `TeamPolicy`, so the inbound door is
   `receive` rather than the word `strict`. The old assertion pinned the OLD
   COPY (`you allow X nothing (strict)`); the rewrite pins the GUARANTEE, which
   is stronger: the drop names the person, the local god never sees it, the log
   records it, and the sender is still told nothing. It also proves the legacy
   word still reaches the new store, which the old line could not: `strict` is
   written here and `off` is what bites. */
test('a closed inbound door drops A\'s message and B\'s log says so; the sender is told nothing', async () => {
  on('B');
  pins.setYouAllow(machines.A.memberId, 'strict');
  assert.deepEqual(pins.youPolicyFor(machines.A.memberId), { receive: false, send: false, commands: false },
    'the legacy word did not migrate to a policy on read');
  const item = spoolEnvelope('B', { ...firstEnvelope, id: 'env_' + 'S'.repeat(22) });
  const out = await bridge.receive('envelopes', item.envelopeId);
  assert.match(out, /^dropped: you are not receiving messages from Michael A$/);
  assert.equal(sentToGod().length, 0);
  assert.ok(hiveLog.some((e) => e.kind === 'teams-spool' && /not receiving/.test(e.outcome)), 'the drop is not in the log');
  assert.equal(bounces().length, 0, 'the sender was told');
  pins.setYouAllow(machines.A.memberId, null);
});

/* THE STATUS IS THE OTHER HALF OF THE SAME DOOR, and it is new in 0.4.10.
   `effectivePolicy` ANDs it with the per person policy, so `off` silences
   everybody without touching a single override, and turning it back restores
   exactly what each person had. Absent means `open`, which is the identity for
   that AND and therefore the only default that does not change what a 0.4.9
   install already enforced. */
test('your status ANDs with every per person policy, and absent means no restriction', async () => {
  on('B');
  assert.deepEqual(pins.myStatus(), { receive: true, send: true, commands: true },
    'an unset status must be open, or upgrading from 0.4.9 silences everyone');

  pins.setMyStatus({ receive: false, send: false, commands: false });
  const silenced = spoolEnvelope('B', { ...firstEnvelope, id: 'env_' + 'Q'.repeat(22) });
  assert.match(await bridge.receive('envelopes', silenced.envelopeId), /^dropped: you are not receiving messages from/);
  assert.equal(sentToGod().length, 0, 'the status did not bite');

  // No override was touched, so turning the status back delivers again.
  assert.equal(pins.youPolicyFor(machines.A.memberId), undefined, 'the status wrote an override');
  pins.setMyStatus(null);
  const back = spoolEnvelope('B', { ...firstEnvelope, id: 'env_' + 'R'.repeat(22) });
  assert.equal(await bridge.receive('envelopes', back.envelopeId), 'delivered');
  assert.equal(sentToGod().length, 1);
});

/* A SCHEDULE THAT DOES NOTHING IS NOT A SCHEDULE. `applySchedule` is what the
   minute timer in `start()` calls, and `statusNow` is what every send and
   receive calls, so a machine asleep through a boundary still enforces the
   window it woke up inside. */
test('a schedule window moves the stored status, and statusNow applies it without the timer', () => {
  on('B');
  const at = new Date();
  const minute = at.getHours() * 60 + at.getMinutes();
  pins.setMyStatus({ receive: true, send: true, commands: true });
  pins.setMyStatusSchedule({
    enabled: true,
    windows: [{ days: [0, 1, 2, 3, 4, 5, 6], from: Math.max(0, minute - 1), to: Math.min(1440, minute + 2), preset: 'off' }],
    fallback: 'open',
  });

  // Enforced before anything is written down: this is the asleep-laptop case.
  assert.deepEqual(pins.statusNow(at), { receive: false, send: false, commands: false });
  assert.equal(pins.scheduleDriving(at), true);
  // And the stored status follows, so the one control shows what is in force.
  assert.deepEqual(pins.applySchedule(at), { receive: false, send: false, commands: false });
  assert.deepEqual(pins.myStatus(), { receive: false, send: false, commands: false });
  assert.equal(pins.applySchedule(at), null, 'a second pass rewrote a status that had not moved');

  pins.setMyStatusSchedule({ enabled: false, windows: [], fallback: 'converse' });
  pins.setMyStatus(null);
});

test('your own default bites for everyone without an override, and an override beats it', async () => {
  // THE FOUNDER'S BUG (2 Sept): three controls set a level and the message
  // path read none of them. The self row wrote under your OWN member id;
  // the detail card and the Network section wrote only renderer state.
  on('B');
  pins.setYouPolicyDefault('strict');
  assert.equal(pins.youPolicyFor(machines.A.memberId), undefined, 'no override for A yet');
  const blocked = spoolEnvelope('B', { ...firstEnvelope, id: 'env_' + 'D'.repeat(22) });
  assert.match(await bridge.receive('envelopes', blocked.envelopeId), /^dropped: you are not receiving messages from/);
  assert.equal(sentToGod().length, 0);

  // The per-person override is the more specific tier and wins either way.
  pins.setYouPolicy(machines.A.memberId, 'communication-only');
  const allowed = spoolEnvelope('B', { ...firstEnvelope, id: 'env_' + 'E'.repeat(22) });
  assert.equal(await bridge.receive('envelopes', allowed.envelopeId), 'delivered');
  assert.equal(sentToGod().length, 1);

  // The default survives an override write, and clearing it follows the org
  // default again (communication-only on this fake relay).
  assert.deepEqual(pins.youPolicyDefault(), { receive: false, send: false, commands: false },
    'the default was lost by an override write');
  pins.setYouPolicy(machines.A.memberId, null);
  pins.setYouPolicyDefault(null);
  assert.equal(pins.youPolicyDefault(), undefined);
  const again = spoolEnvelope('B', { ...firstEnvelope, id: 'env_' + 'F'.repeat(22) });
  assert.equal(await bridge.receive('envelopes', again.envelopeId), 'delivered');
});

test('strict on A\'s view of B bounces to god before anything is sent', async () => {
  on('A');
  relay.theyAllow.B = 'strict';
  // The roster is cached for a minute; a level B changed a moment ago reaches
  // A's sender-side check on the next fetch. B's OWN side bites at once (the
  // test above), which is the end that matters.
  bridge._resetRosterForTests();
  const out = await bridge.send(msg());
  assert.equal(out.ok, false);
  assert.match(out.reason, /allows nothing from you \(strict\)/);
  assert.equal(relay.envelopes.length, 0, 'it was sent anyway');
  assert.equal(bounces().length, 1);
  assert.match(bounces()[0].subject, /^\[refused — Michael B allows nothing from you \(strict\)\] the export dialog/);
  relay.theyAllow.B = 'communication-only';
});

test('a request lands in B\'s queue and does nothing until approved; `always` auto-approves the next', async () => {
  on('A');
  relay.deliverNow = false;
  const m = msg({ act: 'request', subject: 'run the migration test', body: 'Reproduce test/migrate.test.cjs on a fresh profile.' });
  const out = await bridge.send(m);
  assert.deepEqual(out, { ok: true, delivery: 'queued', via: 'request' });
  assert.equal(relay.requests.length, 1);
  assert.equal(relay.requests[0].body.toMemberId, machines.B.memberId);
  assert.equal(relay.requests[0].body.type, 'run-task');
  assert.ok(Date.parse(relay.requests[0].body.expiresAt) - Date.now() <= 24 * 3600 * 1000);

  on('B');
  const item = spoolRequest('B', relay.requests[0]);
  assert.equal(await bridge.receive('requests', item.requestId), 'queued');
  assert.equal(sentToGod().length, 0, 'the request reached god before anyone approved it');
  const pending = bridge.pendingRequests();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, item.requestId);
  assert.equal(pending[0].fromName, 'Michael A');
  assert.equal(pending[0].fromMachine, 'a-laptop');
  assert.equal(pending[0].subject, 'run the migration test');
  assert.equal(pending[0].type, 'run-task');
  assert.equal(pending[0].expired, false);

  assert.deepEqual(await bridge.decide(item.requestId, 'allow-once'), { ok: true });
  assert.equal(sentToGod().length, 1);
  assert.equal(sentToGod()[0].act, 'request');
  assert.equal(sentToGod()[0].from, `member:${machines.A.memberId}`);
  assert.equal(bridge.pendingRequests().length, 0);

  // Decline: gone, nothing delivered.
  const item2 = spoolRequest('B', { ...relay.requests[0], id: 'req_' + 'D'.repeat(22) });
  await bridge.receive('requests', item2.requestId);
  await bridge.decide(item2.requestId, 'decline');
  assert.equal(sentToGod().length, 1);
  assert.equal(bridge.pendingRequests().length, 0);

  // Always: the override flips and the NEXT request is auto-approved.
  const item3 = spoolRequest('B', { ...relay.requests[0], id: 'req_' + 'E'.repeat(22) });
  await bridge.receive('requests', item3.requestId);
  await bridge.decide(item3.requestId, 'always');
  // 0.4.10: `always` is the `open` preset, written as a policy so the control
  // that shows it and the path that enforces it read the same value.
  assert.deepEqual(pins.youPolicyFor(machines.A.memberId), { receive: true, send: true, commands: true });
  const item4 = spoolRequest('B', { ...relay.requests[0], id: 'req_' + 'H'.repeat(22) });
  assert.equal(await bridge.receive('requests', item4.requestId), 'delivered');
  assert.ok(hiveLog.some((e) => e.kind === 'teams-request' && e.decision === 'auto-approved'));
  assert.equal(sentToGod().length, 3);
  pins.setYouAllow(machines.A.memberId, null);
});

test('0.5.2: a request the relay lists again is neither queued nor delivered twice, and a declined one stays gone', async () => {
  // The relay re-lists every request on every drain until seven days past its
  // expiry, and it is never told a request was decided. Before 0.5.2 each
  // re-listing rewrote the queue file (the toast came back) or, with
  // `commands` on, handed the same work to god again.
  on('A');
  relay.deliverNow = false;
  await bridge.send(msg({ act: 'request', subject: 'replay me', body: 'Once is enough.' }));
  const stored = relay.requests[relay.requests.length - 1];

  on('B');
  const godBefore = sentToGod().length;
  const item = spoolRequest('B', { ...stored, id: 'req_' + 'R'.repeat(22) });
  assert.equal(await bridge.receive('requests', item.requestId), 'queued');
  assert.equal(bridge.pendingRequests().length, 1);
  // The same request, listed again by the next drain: dropped before it is
  // opened, the queue untouched, nothing to god.
  spoolRequest('B', { ...stored, id: item.requestId });
  assert.match(await bridge.receive('requests', item.requestId), /^dropped: already handled/);
  assert.equal(bridge.pendingRequests().length, 1);
  assert.equal(sentToGod().length, godBefore);
  // Declined, then listed again: it does not come back.
  await bridge.decide(item.requestId, 'decline');
  assert.equal(bridge.pendingRequests().length, 0);
  spoolRequest('B', { ...stored, id: item.requestId });
  assert.match(await bridge.receive('requests', item.requestId), /^dropped: already handled/);
  assert.equal(bridge.pendingRequests().length, 0, 'a declined request was resurrected by a drain');
  assert.equal(sentToGod().length, godBefore);
  assert.ok(!fs.existsSync(path.join(machines.B.userData, 'teams', 'spool', 'requests', `${item.requestId}.json`)), 'the spool file was left behind');

  // With `commands` on the first copy is work for god and the second is not.
  pins.setYouPolicy(machines.A.memberId, { receive: true, send: true, commands: true });
  const auto = spoolRequest('B', { ...stored, id: 'req_' + 'S'.repeat(22) });
  assert.equal(await bridge.receive('requests', auto.requestId), 'delivered');
  assert.equal(sentToGod().length, godBefore + 1);
  spoolRequest('B', { ...stored, id: auto.requestId });
  assert.match(await bridge.receive('requests', auto.requestId), /^dropped: already handled/);
  assert.equal(sentToGod().length, godBefore + 1, 'the same work reached god twice');
  pins.setYouPolicy(machines.A.memberId, null);

  // The memory is a file, 0600, and the queue never mistakes it for a request.
  const handled = path.join(machines.B.userData, 'teams', 'handled.json');
  assert.ok(fs.existsSync(handled));
  if (process.platform !== 'win32') assert.equal(fs.statSync(handled).mode & 0o777, 0o600);
  assert.ok(Object.keys(JSON.parse(fs.readFileSync(handled, 'utf8'))).includes(item.requestId));
  assert.equal(bridge.pendingRequests().length, 0);
  relay.deliverNow = true;
});

test('0.5.2: a request that expired before it arrived is dropped, not announced', async () => {
  on('A');
  relay.deliverNow = false;
  await bridge.send(msg({ act: 'request', subject: 'too late', body: 'Expired on the relay.' }));
  const stored = relay.requests[relay.requests.length - 1];
  on('B');
  const before = bridge.pendingRequests().length;
  const item = spoolRequest('B', { ...stored, id: 'req_' + 'X'.repeat(22) });
  fs.writeFileSync(path.join(machines.B.userData, 'teams', 'spool', 'requests', `${item.requestId}.json`), JSON.stringify({ ...item, expired: true }));
  assert.equal(await bridge.receive('requests', item.requestId), 'dropped: expired before it arrived');
  assert.equal(bridge.pendingRequests().length, before);
  // Listed again on the next drain: still nothing.
  spoolRequest('B', { ...stored, id: item.requestId });
  assert.match(await bridge.receive('requests', item.requestId), /^dropped: already handled/);
  relay.deliverNow = true;
});

test('0.5.2: an envelope replayed after a lost ack reaches god once', async () => {
  on('A');
  const out = await bridge.send(msg({ subject: 'replayed envelope' }));
  assert.equal(out.ok, true);
  const stored = relay.envelopes[relay.envelopes.length - 1];
  on('B');
  const before = sentToGod().length;
  const item = spoolEnvelope('B', stored);
  assert.equal(await bridge.receive('envelopes', item.envelopeId), 'delivered');
  assert.equal(sentToGod().length, before + 1);
  // The relay never saw the ack and lists it again; the thread has it.
  spoolEnvelope('B', stored);
  assert.equal(await bridge.receive('envelopes', item.envelopeId), 'dropped: already delivered');
  assert.equal(sentToGod().length, before + 1, 'god got the same envelope twice');
  assert.ok(hiveLog.some((e) => e.kind === 'teams-spool' && e.id === item.envelopeId && e.outcome === 'dropped: already delivered'), 'the repeat was not logged');
  const thread = bridge.threadFor(machines.A.memberId);
  assert.equal(thread.messages.filter((m) => m.subject === 'replayed envelope').length, 1);
});

test('0.5.2, the loose end: with the status Off and NO schedule, mail sent AFTER the switch is dropped, and so is every re-listing of it', async () => {
  // God's open question on the diagnosis: a notification for a message sent
  // after the recipient went Off, with no schedule enabled, was unexplained.
  // This is that case on the local relay: an envelope and a request, both
  // sent after B is Off, both re-listed as a drain would, and a request that
  // was already pending before the switch and is re-listed after it.
  on('B');
  pins.setMyStatusSchedule({ enabled: false, windows: [], fallback: 'converse' });
  const pendingBefore = bridge.pendingRequests().length;
  const godBefore = sentToGod().length;
  // A request that arrived BEFORE the switch sits in the queue.
  on('A');
  relay.deliverNow = false;
  await bridge.send(msg({ act: 'request', subject: 'before the switch', body: 'Queued while B still received.' }));
  const early = relay.requests[relay.requests.length - 1];
  on('B');
  const earlyItem = spoolRequest('B', { ...early, id: 'req_' + 'B'.repeat(22) });
  assert.equal(await bridge.receive('requests', earlyItem.requestId), 'queued');
  assert.equal(bridge.pendingRequests().length, pendingBefore + 1);

  // Now B goes Off by hand, no schedule.
  pins.setMyStatus({ receive: false, send: false, commands: false });
  assert.equal(pins.scheduleDriving(new Date()), false);

  on('A');
  const sentEnvelope = await bridge.send(msg({ subject: 'after the switch' }));
  assert.equal(sentEnvelope.ok, true, 'A cannot see B\'s door: the relay word is unchanged, so A still sends');
  const env = relay.envelopes[relay.envelopes.length - 1];
  await bridge.send(msg({ act: 'request', subject: 'work after the switch', body: 'Sent after B went Off.' }));
  const req = relay.requests[relay.requests.length - 1];

  on('B');
  const e = spoolEnvelope('B', env);
  assert.match(await bridge.receive('envelopes', e.envelopeId), /^dropped: you are not receiving/);
  const r = spoolRequest('B', { ...req, id: 'req_' + 'C'.repeat(22) });
  assert.match(await bridge.receive('requests', r.requestId), /^dropped: you are not receiving/);
  // The drain lists all three again. None of them reaches god or the queue.
  spoolEnvelope('B', env);
  assert.match(await bridge.receive('envelopes', e.envelopeId), /^dropped: you are not receiving/);
  spoolRequest('B', { ...req, id: r.requestId });
  assert.match(await bridge.receive('requests', r.requestId), /^dropped: you are not receiving/);
  spoolRequest('B', { ...early, id: earlyItem.requestId });
  assert.match(await bridge.receive('requests', earlyItem.requestId), /^dropped: already handled/);
  assert.equal(sentToGod().length, godBefore, 'something reached god after Off');
  assert.equal(bridge.pendingRequests().length, pendingBefore + 1, 'the queue changed after Off');
  // What is left for the person to see: the request from before the switch,
  // still pending, exactly as it was. Nothing new.
  assert.equal(bridge.pendingRequests()[0].id, earlyItem.requestId);
  await bridge.decide(earlyItem.requestId, 'decline');
  pins.setMyStatus(null);
  relay.deliverNow = true;
});

test('a changed key HOLDS the envelope for D13; verifying the new key delivers it', async () => {
  // A rekeys: a new identity on A's machine, and the roster shows the new key.
  on('A');
  const pair = await identity.generateUnsaved();
  identity.saveIdentity(pair.publicKey, pair.privateKey);
  relay.keys.A = toB64url(Buffer.from(pair.publicKey).toString('base64'));
  const m = msg({ subject: 'after the rekey' });
  await bridge.send(m);
  const stored = relay.envelopes[0];

  on('B');
  // The relay now shows a key for A's device that does not match B's pin.
  // The signature verifies against the NEW key, so this is not a forgery; it
  // is D13: hold, do not open, until the person confirms the safety number.
  const item = spoolEnvelope('B', stored);
  const out = await bridge.receive('envelopes', item.envelopeId);
  assert.equal(out, 'held');
  assert.equal(sentToGod().length, 0);
  assert.equal(fs.existsSync(path.join(machines.B.userData, 'teams', 'spool', 'envelopes', 'held', `${item.envelopeId}.json`)), true);
  // The person confirmed the new safety number out of band (D13 accept).
  pins.markVerified(machines.A.deviceId, identity.fingerprintFor(Buffer.from(pair.publicKey).toString('base64')));
  await bridge.retryHeld();
  assert.equal(sentToGod().length, 1);
  assert.equal(sentToGod()[0].subject, '[from Michael A on a-laptop] after the rekey');
  assert.equal(fs.existsSync(path.join(machines.B.userData, 'teams', 'spool', 'envelopes', 'held', `${item.envelopeId}.json`)), false);
});

test('teammatesLine names teammates as member:<id> with what they allow, and is null when not in a team', async () => {
  on('A');
  bridge._resetRosterForTests();
  assert.equal(bridge.teammatesLine(), null, 'a line before the roster was read');
  assert.ok(await waitFor(() => bridge.teammatesLine()), 'the roster never came back');
  const line = bridge.teammatesLine();
  /* 0.4.10: the four preset words, not the three wire words. The relay still
     sends `communication-only`; `normalizePolicy` turns it into `converse`,
     which is what every surface in the app now says, so an agent reading this
     line and a person reading the roster row read the same vocabulary. */
  assert.match(line, /Michael B, orchestrator "Scott" \(member:mem_B+, online, allows you converse\)/);
  assert.match(line, /or their orchestrator's nickname/, 'the line has to say a name is addressable, or no agent will try');
  assert.match(line, /inside your workspace/, 'an agent must be told a file it names becomes a link, and when it does not');
  assert.ok(!line.includes('Michael A ('), 'the line lists yourself');
  const saved = fs.readFileSync(path.join(machines.A.userData, 'teams', 'membership.json'));
  membership.forgetMembership();
  assert.equal(bridge.teammatesLine(), null);
  fs.writeFileSync(path.join(machines.A.userData, 'teams', 'membership.json'), saved);
});

test('resolveTeammate: a person\'s name or their orchestrator\'s nickname becomes member:<id>, and never the self row', async () => {
  on('A');
  bridge._resetRosterForTests();
  assert.equal(bridge.resolveTeammate('Scott'), null, 'nothing resolves before the roster is read');
  // That first call STARTS the read. Poll for it rather than sleeping a fixed
  // 50ms: under a loaded parallel run the fetch does not always land in time,
  // and a resolver test that fails on machine load teaches nothing.
  for (let i = 0; i < 100 && !bridge.resolveTeammate('Scott'); i++) await new Promise((r) => setTimeout(r, 20));
  const B = machines.B.memberId;
  assert.deepEqual(bridge.resolveTeammate('Michael B'), { memberId: B }, 'by the person\'s name');
  assert.deepEqual(bridge.resolveTeammate('Scott'), { memberId: B }, 'by the orchestrator\'s nickname');
  // Same normalisation as the relay's uniqueness key, or a name that WAS
  // accepted as unique could fail to address the seat holding it.
  assert.deepEqual(bridge.resolveTeammate('  scott '), { memberId: B }, 'case and spacing');
  assert.deepEqual(bridge.resolveTeammate('SCOTT'), { memberId: B });
  assert.equal(bridge.resolveTeammate('Michael A'), null, 'your own row is never a teammate');
  assert.equal(bridge.resolveTeammate('nobody'), null);
  assert.equal(bridge.resolveTeammate(''), null);
  // The router's own words must never be looked up as people.
  for (const reserved of ['god', 'broadcast', 'human', 'member:mem_x']) {
    assert.equal(bridge.resolveTeammate(reserved), null, reserved);
  }
});

/* ---- 0.5.2, OPTION D: agents' names travel inside the sealed message ------- */

/**
 * The roster names the PERSON and their orchestrator's nickname; it never
 * said which of their agents wrote, so god read "[from Michael A]" for a
 * message Kevin sent. The name now rides beside the message INSIDE the
 * ciphertext (`sender: { agentId, agent }`), so the relay holds no agent's
 * name and the reader still learns it: the subject, the thread line, a local
 * memory (names.json) and god's roster line all say Kevin.
 */
test('0.5.2: the sending agent\'s name crosses inside the ciphertext, and B reads "Michael A\'s Kevin"', async () => {
  on('A');
  const m = msg({ from: 'kevin', subject: 'from an agent' });
  const out = await bridge.send(m);
  assert.equal(out.ok, true, JSON.stringify(out));
  const stored = relay.envelopes[relay.envelopes.length - 1];
  // The wire body is the same five fields as before: nothing about the agent
  // sits beside the ciphertext for the relay to read.
  assert.deepEqual(Object.keys(stored.body).sort(), ['ciphertext', 'nonce', 'senderSignature', 'sentAt', 'threadId', 'toDeviceIds']);
  // A's own thread names the agent on the sent line.
  const sentLine = bridge.threadFor(machines.B.memberId).messages.find((x) => x.id === m.id);
  assert.equal(sentLine.agent, 'Kevin');

  on('B');
  const item = spoolEnvelope('B', stored);
  assert.equal(await bridge.receive('envelopes', item.envelopeId), 'delivered');
  const got = sentToGod()[sentToGod().length - 1];
  assert.equal(got.subject, '[from Michael A\'s Kevin on a-laptop] from an agent');
  assert.equal(got.from, `member:${machines.A.memberId}`, 'the sender is still who the PIN says, whatever the payload claims');
  const line = bridge.threadFor(machines.A.memberId).messages.find((x) => x.id === m.id);
  assert.equal(line.agent, 'Kevin');

  // Remembered on B, 0600, keyed by A's seat and then by the agent's id.
  const file = path.join(machines.B.userData, 'teams', 'names.json');
  const names = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(names[machines.A.memberId].agents.kevin.name, 'Kevin');
  if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);

  // And B's god is told, on the roster line, so it can answer Kevin by name.
  bridge._resetRosterForTests();
  for (let i = 0; i < 100 && !bridge.teammatesLine(); i++) await new Promise((r) => setTimeout(r, 20));
  assert.match(bridge.teammatesLine(), /Michael A \(member:mem_A+, online, allows you converse, agents seen: Kevin\)/);
});

test('0.5.2: the person\'s own send box seals no agent, and the reader shows the person alone', async () => {
  on('A');
  const m = msg({ from: 'you', subject: 'typed by hand' });
  assert.equal((await bridge.send(m)).ok, true);
  assert.equal(bridge.threadFor(machines.B.memberId).messages.find((x) => x.id === m.id).agent, undefined);
  on('B');
  const item = spoolEnvelope('B', relay.envelopes[relay.envelopes.length - 1]);
  assert.equal(await bridge.receive('envelopes', item.envelopeId), 'delivered');
  assert.equal(sentToGod()[sentToGod().length - 1].subject, '[from Michael A on a-laptop] typed by hand');
});

test('0.5.2: a message sealed by an older build, with no sender at all, still opens and delivers', async () => {
  // Sealed here by hand exactly as 0.5.1's `sealFor` did: the plaintext is
  // the three-field payload and nothing else. A build that predates the
  // field must not have its mail dropped by one that reads it.
  on('A');
  const sodium = require('libsodium-wrappers'); await sodium.ready;
  const m = msg({ subject: 'from an older build' });
  const plaintext = JSON.stringify({ v: 1, kind: 'hive-message', message: m });
  const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const box = sodium.crypto_secretbox_easy(new Uint8Array(Buffer.from(plaintext, 'utf8')), nonce, key);
  const sealedKey = (await identity.sealTo(fromB64url(relay.keys.B), Buffer.from(key).toString('base64'))).ciphertext;
  const ciphertext = toB64url(Buffer.from(JSON.stringify({ v: 1, box: Buffer.from(box).toString('base64'), keys: { [machines.B.deviceId]: sealedKey } }), 'utf8').toString('base64'));
  const sig = await identity.signDetached(ciphertext);
  const stored = {
    id: 'env_' + 'O'.repeat(22), from: machines.A.deviceId,
    body: {
      ciphertext, nonce: toB64url(Buffer.from(nonce).toString('base64')), senderSignature: toB64url(Buffer.from(sig).toString('base64')),
      threadId: bridge.threadIdFor(machines.A.memberId, machines.B.memberId), sentAt: m.created_at,
    },
  };
  on('B');
  const item = spoolEnvelope('B', stored);
  assert.equal(await bridge.receive('envelopes', item.envelopeId), 'delivered');
  const got = sentToGod()[sentToGod().length - 1];
  assert.equal(got.subject, '[from Michael A on a-laptop] from an older build', 'the 0.5.1 prefix, unchanged');
  assert.equal(bridge.threadFor(machines.A.memberId).messages.find((x) => x.id === m.id).agent, undefined);
});

/* ---- 0.5.2: one responder answers every inbound channel --------------------- */

test('0.5.2: the configured responder takes a teammate\'s message while it is active, and god takes it otherwise', async () => {
  on('A');
  const m1 = msg({ subject: 'for dwight' });
  assert.equal((await bridge.send(m1)).ok, true);
  const first = relay.envelopes[relay.envelopes.length - 1];
  const m2 = msg({ subject: 'for nobody' });
  assert.equal((await bridge.send(m2)).ok, true);
  const second = relay.envelopes[relay.envelopes.length - 1];

  on('B');
  floor.responder = 'dwight';
  floor.active = ['dwight', 'pam'];
  const a = spoolEnvelope('B', first);
  assert.equal(await bridge.receive('envelopes', a.envelopeId), 'delivered');
  const landed = hiveSent.find((x) => x.subject.endsWith('for dwight'));
  assert.equal(landed.to, 'dwight', 'the wire said god; the floor\'s setting decides');
  assert.equal(landed.from, `member:${machines.A.memberId}`);
  assert.ok(hiveLog.some((e) => e.kind === 'teams-received' && e.id === m1.id && e.to === 'dwight'), 'the log says who took it');
  assert.equal(bridge.threadFor(machines.A.memberId).messages.some((x) => x.id === m1.id), true, 'the thread shows it whoever took it');

  // THE FALLBACK IS NOT OPTIONAL: the chosen agent is not running, so the
  // orchestrator takes it, never nowhere.
  floor.active = [];
  const b = spoolEnvelope('B', second);
  assert.equal(await bridge.receive('envelopes', b.envelopeId), 'delivered');
  assert.equal(hiveSent.find((x) => x.subject.endsWith('for nobody')).to, 'god');
  floor.responder = undefined;
});

/* ---- 0.5.2: the receive door reaches the relay ---------------------------- */

/**
 * The inbound door was decided on arrival and nowhere else, so a sender's
 * thread said "delivered" for mail this machine dropped. The door is now
 * PUBLISHED (PATCH /me { receive }) from the same tiers the gate reads, the
 * roster row reads it back as `receiving`, and a sender is refused: by the
 * row before any POST, and by the relay's 403 when the row was stale.
 */
const receivePatches = (from) => relay.patches.filter((p) => 'receive' in p.body && p.from === from);

test('0.5.2: start() publishes this machine\'s inbound door: default true and no exceptions, one field per PATCH', async () => {
  on('A');
  relay.patches = [];
  const off = bridge.start();
  try {
    assert.ok(await waitFor(() => receivePatches(machines.A.deviceId).length > 0), 'no PATCH /me { receive } after start');
    const first = receivePatches(machines.A.deviceId)[0].body;
    assert.deepEqual(Object.keys(first), ['receive'], 'the contract takes exactly one field per PATCH');
    assert.deepEqual(first.receive, { default: true, members: {} });
    // The log line is written after the PATCH is answered, not with it, so
    // waiting for the PATCH is not waiting for the log. Under load that gap
    // is wide enough to read the log one write early: this failed once at
    // --test-concurrency=2 and passed 38/38 alone. Same wait as the line
    // above, for the same reason.
    assert.ok(await waitFor(() => hiveLog.some((e) => e.kind === 'teams-receive-published' && e.default === true && e.exceptions === 0)), 'the publish is not in the log');
  } finally { off(); }
});

test('0.5.2: Off reaches the relay as default false within a second, and clearing it as true', async () => {
  on('A');
  relay.patches = [];
  bridge.setStatus('off');
  assert.ok(await waitFor(() => receivePatches(machines.A.deviceId).some((p) => p.body.receive.default === false), 1000), 'Off did not reach the relay within a second');
  relay.patches = [];
  bridge.setStatus(null);
  assert.ok(await waitFor(() => receivePatches(machines.A.deviceId).some((p) => p.body.receive.default === true), 1000), 'the reopened door did not reach the relay');
});

test('0.5.2: an override on B alone is the one exception under members', async () => {
  on('A');
  relay.patches = [];
  bridge.setPolicy(machines.B.memberId, { receive: false, send: false, commands: false });
  assert.ok(await waitFor(() => receivePatches(machines.A.deviceId).some((p) => p.body.receive.members[machines.B.memberId] === false), 1000));
  assert.deepEqual(receivePatches(machines.A.deviceId).pop().body.receive, { default: true, members: { [machines.B.memberId]: false } });
  relay.patches = [];
  bridge.setPolicy(machines.B.memberId, null);
  assert.ok(await waitFor(() => receivePatches(machines.A.deviceId).some((p) => JSON.stringify(p.body.receive) === JSON.stringify({ default: true, members: {} })), 1000), 'clearing the override did not publish');
});

test('0.5.2: a roster row that says receiving:false bounces before anything is posted', async () => {
  on('A');
  relay.receiving.B = false;
  bridge._resetRosterForTests();
  const envelopes = relay.envelopes.length;
  const requests = relay.requests.length;
  const out = await bridge.send(msg({ subject: 'into a closed door' }));
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'Michael B is not receiving messages from you right now');
  assert.equal(relay.envelopes.length, envelopes, 'it was posted anyway');
  assert.equal(bounces().length, 1);
  assert.match(bounces()[0].subject, /^\[refused — Michael B is not receiving messages from you right now\] into a closed door/);
  // A request takes the same door.
  const req = await bridge.send(msg({ act: 'request', subject: 'work into a closed door' }));
  assert.equal(req.ok, false);
  assert.equal(relay.requests.length, requests);
  relay.receiving.B = undefined;
  bridge._resetRosterForTests();
});

test('0.5.2: a POST the relay answers 403 not_receiving marks the entry failed, and the bounce carries the relay\'s sentence', async () => {
  on('A');
  relay.notReceiving = true;
  const m = msg({ subject: 'refused by the relay' });
  const out = await bridge.send(m);
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'Michael B is not receiving messages from you right now.');
  assert.equal(relay.envelopes.length, 0, 'the relay stored it');
  const line = bridge.threadFor(machines.B.memberId).messages.find((x) => x.id === m.id);
  assert.equal(line.delivery, 'failed', 'a refused message must never read as delivered');
  assert.equal(bounces().length, 1);
  assert.match(bounces()[0].subject, /^\[refused — Michael B is not receiving messages from you right now\.\] refused by the relay/);
  relay.notReceiving = false;
});

test('0.5.2: a relay that refuses the field stops the publishing until the next connect, logged once, and sending still works', async () => {
  on('A');
  // THE CLEAR BELOW IS THE WHOLE PROBLEM. A debounced publish from the writes
  // above that lands AFTER `relay.patches = []` is counted as an attempt by
  // this test and reddens "one attempt" with a two. Sleeping a round 400 ms
  // was a guess at a debounce; waiting for the count to hold still is the
  // measurement, and it takes as long as the machine needs.
  await waitQuiet(() => receivePatches(machines.A.deviceId).length);
  relay.patches = [];
  relay.patchMeReject = { error: 'invalid_body', detail: 'unknown field: receive' };
  await bridge._publishReceiveNowForTests(true);
  assert.equal(receivePatches(machines.A.deviceId).length, 1, 'one attempt');
  assert.equal(hiveLog.filter((e) => e.kind === 'teams-receive-unsupported').length, 1);
  // The relay is fixed underneath, but this machine does not try again until
  // it reconnects: neither a forced publish nor a status change goes out.
  relay.patchMeReject = null;
  await bridge._publishReceiveNowForTests(true);
  bridge.setStatus('off');
  await waitQuiet(() => receivePatches(machines.A.deviceId).length);
  bridge.setStatus(null);
  await waitQuiet(() => receivePatches(machines.A.deviceId).length);
  assert.equal(receivePatches(machines.A.deviceId).length, 1, 'published while unsupported');
  assert.equal(hiveLog.filter((e) => e.kind === 'teams-receive-unsupported').length, 1, 'logged more than once');
  // Sending is untouched: the published door is a prediction, never the gate.
  const out = await bridge.send(msg({ subject: 'while the relay is old' }));
  assert.equal(out.ok, true, JSON.stringify(out));
  // The socket comes back: the flag clears and the door goes out again, forced.
  relay.patches = [];
  bridge._connectedForTests();
  assert.ok(await waitFor(() => receivePatches(machines.A.deviceId).length > 0, 1000), 'no publish after the reconnect');
  assert.deepEqual(receivePatches(machines.A.deviceId)[0].body.receive, { default: true, members: {} });
});

test('requireFingerprint has a consequence: a message to an unverified teammate is refused with the reason', async () => {
  on('A');
  // The org says verification is required (what /me would say; S2 is not
  // written, so the org file is written the way a /me answer writes it).
  const orgFile = path.join(machines.A.userData, 'teams', 'org.json');
  fs.writeFileSync(orgFile, JSON.stringify({
    orgId: 'org_1', name: 'Dunder Mifflin', signingKey: 'K'.repeat(43), defaultPermission: 'communication-only',
    requireFingerprint: true, entitlement: { state: 'healthy', trialEndsAt: null, graceEndsAt: null },
    seatsUsed: 2, seatsPaid: 5, you: { name: 'A', email: null, isAdmin: false }, membership: 'active', fetchedAt: new Date().toISOString(),
  }));
  const out = await bridge.send(msg({ subject: 'under the policy' }));
  assert.equal(out.ok, false);
  assert.match(out.reason, /requires you to verify Michael B's key before messaging/);
  assert.match(out.reason, /b-laptop/, 'the machine to verify is named');
  assert.equal(relay.envelopes.length, 0, 'sealed to an unverified key anyway');
  assert.equal(bounces().length, 1);
  // The person compares the safety number and verifies B's machine: it sends.
  pins.markVerified(machines.B.deviceId, identity.fingerprintFor(Buffer.from(relay.keys.B.replace(/-/g, '+').replace(/_/g, '/') + '=', 'base64').toString('base64')));
  const out2 = await bridge.send(msg({ subject: 'after verifying' }));
  assert.equal(out2.ok, true, JSON.stringify(out2));
  assert.equal(relay.envelopes.length, 1);
  // The control: with the policy off, an unverified teammate is fine.
  fs.rmSync(orgFile);
});

/* ---- files: a path in, a link out (0.4.10) --------------------------------- */

/**
 * The founder's ask was that agents on different machines hand each other
 * FILES over a link that dies in an hour. `src/main/fileShare.ts` publishes
 * one; nothing wired it to the message path, so `pro/Composer.tsx:86-88` was
 * still pasting a LOCAL PATH into a body that crosses to another machine.
 *
 * The store is faked here on purpose: this file's job is the BRIDGE's decision
 * about which files may be published and what the body ends up saying, and
 * `test/file-share.test.cjs` already drives a real server over real HTTP.
 */
const workspace = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cth-bridge-ws-')));
const elsewhere = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cth-bridge-out-')));
const minted = [];

test.before(() => {
  fs.writeFileSync(path.join(workspace, 'notes.txt'), 'in the workspace');
  fs.mkdirSync(path.join(workspace, 'build'), { recursive: true });
  fs.writeFileSync(path.join(elsewhere, 'private.txt'), 'not the agent\'s to publish');
  fs.symlinkSync(path.join(elsewhere, 'private.txt'), path.join(workspace, 'shortcut.txt'));
  bridge.attachShares({
    create: async (p) => {
      minted.push(p);
      const now = Date.now();
      return {
        ok: true,
        share: {
          id: `fs-${minted.length}`, name: path.basename(p), size: 16, contentType: 'text/plain',
          createdAt: now, expiresAt: now + 3600_000,
          url: `https://x.tunnelmole.net/s/${'a'.repeat(64)}`,
        },
      };
    },
    workspaceFor: (agentId) => (agentId === 'kevin' ? workspace : null),
  });
});

test('a file inside the agent\'s workspace becomes a link with its name and its hour', async () => {
  on('A');
  minted.length = 0;
  const file = path.join(workspace, 'notes.txt');
  // Exactly the block pro/Composer.tsx pastes today.
  const out = await bridge.send(msg({ from: 'kevin', subject: 'the notes', body: `Have a look.\n\nAttached files:\n- ${file} (notes.txt)` }));
  assert.equal(out.ok, true, JSON.stringify(out));
  assert.deepEqual(minted, [file], 'the share was minted for the resolved file');

  const thread = bridge.threadFor(machines.B.memberId);
  const sent = thread.messages[thread.messages.length - 1];
  assert.ok(!sent.body.includes(file), 'the local path crossed to another machine');
  // "1 hour left" and "59 minutes left" are BOTH truthful the instant a share
  // is minted: the countdown rounds down, so a single millisecond between the
  // mint and this line crosses the boundary. Pinning one of them made this test
  // pass alone and fail inside the full suite, where the machine is busy.
  // The guarantee is the name, the link, and a duration the reader can act on,
  // and that is what is pinned now.
  assert.match(sent.body, /- notes\.txt \(https:\/\/x\.tunnelmole\.net\/s\/a{64}, (1 hour|59 minutes) left\)/,
    'the reader needs the name, the link and how long they have');
  assert.equal(relay.envelopes.length, 1);
});

test('a file OUTSIDE the workspace is refused with an instruction, and nothing goes on the wire', async () => {
  on('A');
  minted.length = 0;
  const out = await bridge.send(msg({ from: 'kevin', subject: 'take this', body: `Read ${path.join(elsewhere, 'private.txt')}` }));
  assert.equal(out.ok, false);
  assert.match(out.reason, /^private\.txt is outside the workspace you are working in/);
  assert.match(out.reason, /Copy it into your workspace/, 'a refusal has to say what to do');
  assert.deepEqual(minted, [], 'a file outside the workspace was published anyway');
  assert.equal(relay.envelopes.length, 0, 'the message went with a dead path in it');
  assert.equal(bounces().length, 1, 'the sending agent was not told');
});

test('a symlink out of the workspace is outside the workspace, resolved before the check', async () => {
  on('A');
  minted.length = 0;
  const out = await bridge.send(msg({ from: 'kevin', subject: 'sneaky', body: `Read ${path.join(workspace, 'shortcut.txt')}` }));
  assert.equal(out.ok, false);
  // The refusal names the RESOLVED target, not the link the agent wrote.
  // "shortcut.txt is outside the workspace" would be confusing and false: the
  // link IS inside it. What would have been published is `private.txt`.
  assert.match(out.reason, /^private\.txt is outside the workspace/);
  assert.deepEqual(minted, []);
  assert.equal(relay.envelopes.length, 0);
});

test('a directory is refused, and an agent with no workspace cannot publish anything', async () => {
  on('A');
  minted.length = 0;
  const dir = await bridge.send(msg({ from: 'kevin', subject: 'everything', body: `Take ${path.join(workspace, 'build')}` }));
  assert.equal(dir.ok, false);
  assert.match(dir.reason, /^build is not a regular file this machine can read/);

  const stranger = await bridge.send(msg({ from: 'nobody', subject: 'from nowhere', body: `Read ${path.join(workspace, 'notes.txt')}` }));
  assert.equal(stranger.ok, false);
  assert.match(stranger.reason, /^notes\.txt is a local file and there is no workspace to check it against/);
  assert.deepEqual(minted, []);
  assert.equal(relay.envelopes.length, 0);
});

test('prose that looks like a path is left alone, so an ordinary message still sends', async () => {
  on('A');
  minted.length = 0;
  const out = await bridge.send(msg({ from: 'kevin', subject: 'the route', body: 'The /roster route is slow, and s/foo/bar did not help.' }));
  assert.equal(out.ok, true, JSON.stringify(out));
  assert.deepEqual(minted, [], 'a sentence with a slash in it minted a share');
  const thread = bridge.threadFor(machines.B.memberId);
  assert.equal(thread.messages[thread.messages.length - 1].body, 'The /roster route is slow, and s/foo/bar did not help.');
});

test('the person\'s own send box may name a file they typed, workspace or not', async () => {
  on('A');
  minted.length = 0;
  const file = path.join(elsewhere, 'private.txt');
  // `from: 'you'` is the person at the keyboard. They chose the file by typing
  // it; the workspace guard exists to stop an AGENT publishing one the person
  // never scoped it to.
  const out = await bridge.send(msg({ from: 'you', subject: 'here it is', body: `Here: ${file}` }));
  assert.equal(out.ok, true, JSON.stringify(out));
  assert.deepEqual(minted, [file]);
});

/* 0.4.10: the door takes a DRAFT, not a string.
 *
 * The old assertion pinned "the first line becomes the subject", which was the
 * workaround for a door that could only carry one string. The guarantee now is
 * stronger: the subject, the body, the act and `expectsReply` all cross whole,
 * and the message contract is enforced on THIS side, so a caller that skips the
 * composer's checks still meets them. */
test('sendFromPerson: the whole draft crosses, and main enforces the message contract itself', async () => {
  on('A');
  // A fresh thread: the turn budget is counted over the whole thread and the
  // tests above have already spent A's, which is itself the guarantee below.
  const threadFile = path.join(machines.A.userData, 'teams', 'threads', `${bridge.threadIdFor(machines.A.memberId, machines.B.memberId)}.json`);
  fs.rmSync(threadFile, { force: true });

  const out = await bridge.sendFromPerson(machines.B.memberId, {
    subject: 'hello Pam', body: 'Please look at the footer.', act: 'ask', expectsReply: true,
  });
  assert.equal(out.ok, true, JSON.stringify(out));
  const t = bridge.threadFor(machines.B.memberId);
  const last = t.messages[t.messages.length - 1];
  assert.equal(last.from, 'you');
  assert.equal(last.subject, 'hello Pam');
  assert.equal(last.body, 'Please look at the footer.');
  // `ask` is a question, so it is a `query` and never a `request`: routing it as
  // a request would put every question in a teammate's approval queue.
  assert.equal(last.act, 'query');

  // THE SHAPE IS CHECKED HERE, not only in the composer. Every refusal is an
  // instruction from @shared/teamMessage, never "invalid".
  const noSubject = await bridge.sendFromPerson(machines.B.memberId, { subject: '', body: 'x', act: 'inform', expectsReply: false });
  assert.equal(noSubject.ok, false);
  assert.match(noSubject.reason, /Give the message a subject/);
  const badAct = await bridge.sendFromPerson(machines.B.memberId, { subject: 'a subject', body: 'x', act: 'shout', expectsReply: false });
  assert.equal(badAct.ok, false);
  assert.match(badAct.reason, /Set act to one of ask, answer, inform, handoff\./);
  const longBody = await bridge.sendFromPerson(machines.B.memberId, { subject: 'a subject', body: 'x'.repeat(1201), act: 'inform', expectsReply: false });
  assert.equal(longBody.ok, false);
  assert.match(longBody.reason, /Cut the body to 1200 characters/);
  assert.equal(relay.envelopes.length, 1, 'a refused draft was still put on the wire');

  // THE TURN BUDGET IS COUNTED, not hoped for. Four entries in the thread and
  // the fifth is refused with the sentence that says what to do instead.
  // 0.4.11: this door is the PERSON'S seat, so the refusal is
  // CHANGE_IT_YOURSELF and never "ask your human": the old default sender of
  // `agent` told the person at the keyboard to go and find themselves.
  for (let i = 0; i < 3; i++) {
    const ok = await bridge.sendFromPerson(machines.B.memberId, { subject: `turn ${i}`, body: 'more', act: 'inform', expectsReply: false });
    assert.equal(ok.ok, true, JSON.stringify(ok));
  }
  const spent = await bridge.sendFromPerson(machines.B.memberId, { subject: 'one too many', body: 'more', act: 'inform', expectsReply: false });
  assert.equal(spent.ok, false);
  assert.match(spent.reason, /This thread has used its 4 turns\./);
  assert.match(spent.reason, /This thread is finished\. Start a new one with a new subject/);
  assert.ok(!/ask your human/.test(spent.reason), 'the person was told to ask themselves');
});

/* 0.4.11, THE FOUNDER'S TRAP. One thread file per pair forever, append only,
   and no door out: at four entries the composer went dead and the person was
   sent to controls that were never an input to it. Two fixes, both proved on
   the real store and the real relay:

     ROTATION   `startNewThread` renames the live file aside (`.1`, `.2`, ...)
                so history is archived, never destroyed; `threadFor` then
                answers empty and the budget is whole. The next message, either
                direction, derives the same pair hash and lands in the NEW file.
     FAILED     a send of YOURS marked `failed` buys no turn: it never reached
                anyone. The peer's entries and your in flight ones still count. */
test('startNewThread archives the spent thread, and the rotated pair accepts a fresh send', async () => {
  on('A');
  const threadId = bridge.threadIdFor(machines.A.memberId, machines.B.memberId);
  const dir = path.join(machines.A.userData, 'teams', 'threads');
  const before = bridge.threadFor(machines.B.memberId);
  assert.ok(before.messages.length >= 4, 'the trap is not armed: the thread above must be spent');
  const spent = await bridge.sendFromPerson(machines.B.memberId, { subject: 'still spent', body: 'x', act: 'inform', expectsReply: false });
  assert.equal(spent.ok, false, 'the previous test left this thread with turns to spend');

  assert.deepEqual(bridge.startNewThread(machines.B.memberId), { ok: true });
  // Archived, not destroyed: the same messages, byte for byte, one file over.
  const archived = JSON.parse(fs.readFileSync(path.join(dir, `${threadId}.1.json`), 'utf8'));
  assert.deepEqual(archived.messages, before.messages, 'the history was not preserved whole');
  assert.equal(fs.existsSync(path.join(dir, `${threadId}.json`)), false, 'the live file survived the rotation');
  const fresh = bridge.threadFor(machines.B.memberId);
  assert.equal(fresh.messages.length, 0, 'the rotated thread still has entries');
  assert.equal(fresh.threadId, threadId, 'the pair hash moved; inbound mail would miss the new thread');

  // The budget is whole again: the send that was just refused now leaves.
  const out = await bridge.sendFromPerson(machines.B.memberId, { subject: 'a fresh start', body: 'Round two.', act: 'ask', expectsReply: false });
  assert.equal(out.ok, true, JSON.stringify(out));
  const t = bridge.threadFor(machines.B.memberId);
  assert.equal(t.messages.length, 1);
  assert.equal(t.messages[0].subject, 'a fresh start');

  // A second rotation numbers upward rather than clobbering the first archive.
  assert.deepEqual(bridge.startNewThread(machines.B.memberId), { ok: true });
  assert.ok(fs.existsSync(path.join(dir, `${threadId}.1.json`)), 'the first archive was overwritten');
  assert.ok(fs.existsSync(path.join(dir, `${threadId}.2.json`)), 'the second rotation did not archive');
  assert.equal(bridge.threadFor(machines.B.memberId).messages.length, 0);

  // The door is shut to nonsense: yourself, and a machine outside any team.
  assert.deepEqual(bridge.startNewThread(machines.A.memberId), { ok: false }, 'you cannot rotate a thread with yourself');
});

test('your own failed sends buy no turn, so a string of failures cannot spend the thread', async () => {
  on('A');
  const threadId = bridge.threadIdFor(machines.A.memberId, machines.B.memberId);
  const file = path.join(machines.A.userData, 'teams', 'threads', `${threadId}.json`);
  // Four failed sends of A's own, exactly as `send` leaves them when the relay
  // refuses after the entry was appended as `sending`.
  const failed = (i) => ({
    id: `f-${i}`, from: 'you', act: 'inform', subject: `try ${i}`, body: 'never left',
    at: new Date().toISOString(), delivery: 'failed',
  });
  fs.writeFileSync(file, JSON.stringify({ memberId: machines.B.memberId, threadId, messages: [failed(1), failed(2), failed(3), failed(4)] }));

  // Under the old count these four spent the budget and the fifth bounced.
  const out = await bridge.sendFromPerson(machines.B.memberId, { subject: 'after the outage', body: 'Still here.', act: 'inform', expectsReply: false });
  assert.equal(out.ok, true, JSON.stringify(out));

  // Delivered entries still count, on both sides: with four of those the
  // refusal returns, which is the control that the rule reads `failed`, not
  // `from`.
  const delivered = (i, from) => ({
    id: `d-${i}`, from, act: 'inform', subject: `turn ${i}`, body: 'counted',
    at: new Date().toISOString(), delivery: 'delivered',
  });
  fs.writeFileSync(file, JSON.stringify({
    memberId: machines.B.memberId, threadId,
    messages: [delivered(1, 'you'), delivered(2, machines.B.memberId), delivered(3, 'you'), delivered(4, machines.B.memberId)],
  }));
  const refused = await bridge.sendFromPerson(machines.B.memberId, { subject: 'one over', body: 'x', act: 'inform', expectsReply: false });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /This thread has used its 4 turns\./);
  fs.rmSync(file, { force: true });
});

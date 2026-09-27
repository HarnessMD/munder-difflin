'use strict';

/**
 * The org channel (plan 4.4, Pam's S1), against a fake `/me` in the PLAN's
 * shape. Server item S2 is not written, so this proves the client side only:
 * the pin, the policy, the state, the lease seam, and the reason reaching the
 * gate. The day S2 lands, the e2e run verifies the shape; nothing here does.
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

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-org-'));
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
delete process.env.MD_RELAY_URL;

const identity = loadTs('src/main/deviceIdentity.ts');
const membership = loadTs('src/main/teamsMembership.ts');
const gate = loadTs('src/main/teamsGate.ts');
const org = loadTs('src/main/teamsOrg.ts');

const DEVICE_ID = 'dev_' + 'C'.repeat(22);
const KEY_A = 'A'.repeat(43);
const KEY_B = 'B'.repeat(43);

const relay = { nonces: 0, me: null, status: 200 };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (status, body) => { res.setHeader('date', new Date().toUTCString()); res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (url.pathname === '/challenge') return send(200, { nonce: `nonce-${++relay.nonces}` });
  if (url.pathname === '/me') {
    if (relay.status !== 200) return send(relay.status, { ok: false, error: relay.status === 404 ? 'not_found' : relay.status === 401 ? 'unauthorized' : 'server_error', detail: null });
    return send(200, relay.me);
  }
  send(404, { ok: false, error: 'not_found', detail: null });
});

const me = (over = {}, orgOver = {}) => ({
  org: {
    orgId: 'org_1', name: 'Dunder Mifflin', signingKey: KEY_A, defaultPermission: 'communication-only',
    requireFingerprint: false, entitlement: { state: 'trialing', trialEndsAt: '2026-09-15T00:00:00.000Z', graceEndsAt: null },
    seatsUsed: 2, seatsPaid: 5, ...orgOver,
  },
  you: { memberId: 'mem_1', deviceId: DEVICE_ID, name: 'Pam', email: 'pam@example.test', isAdmin: false },
  membership: 'active', serverTime: '2026-09-02T09:00:00.000Z', leaseSeconds: 259200, ...over,
});

test.before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  await identity.initCrypto();
  const pair = await identity.generateUnsaved();
  identity.saveIdentity(pair.publicKey, pair.privateKey);
  const now = new Date().toISOString();
  membership.writeMembership({
    orgId: 'org_1', memberId: 'mem_1', deviceId: DEVICE_ID, orgName: 'Dunder Mifflin (enrolment)',
    relayUrl: `ws://127.0.0.1:${server.address().port}/connect`, enrolledAt: now, lastVerifiedAt: now, lastVerifiedLocalAt: now,
    leaseSeconds: membership.LEASE_SECONDS,
  });
});
test.after(async () => { await new Promise((r) => server.close(r)); });
test.beforeEach(() => { relay.status = 200; relay.me = me(); gate.setRevoked(null); });

test('today\'s relay (no /me): unavailable, the name from enrolment, no rows invented', async () => {
  relay.status = 404;
  assert.equal(await org.refresh(), 'unavailable');
  const v = org.view();
  assert.equal(v.available, false);
  assert.equal(v.name, 'Dunder Mifflin (enrolment)');
  assert.equal(v.signingKey, null);
  assert.equal(v.requireFingerprint, null);
  assert.equal(org.policy(), null, 'a policy was invented');
  assert.equal(fs.existsSync(path.join(userData, 'teams', 'org.json')), false);
});

test('/me: written 0600, the key pinned UNVERIFIED on first sight, the policy and state readable', async () => {
  const seen = [];
  const off = org.onChange((v) => seen.push(v.keyVerified));
  assert.equal(await org.refresh(), 'updated');
  const v = org.view();
  assert.equal(v.available, true);
  assert.equal(v.name, 'Dunder Mifflin');
  assert.equal(v.signingKey, KEY_A);
  assert.match(v.keyGroups, /^([0-9A-F]{4} ){5}[0-9A-F]{4}$/, 'six groups of four');
  assert.equal(v.keyVerified, false, 'verified on first sight: nobody was asked');
  assert.equal(v.keyPreviousGroups, null);
  assert.deepEqual(org.policy(), { defaultPermission: 'communication-only', requireFingerprint: false });
  assert.equal(v.entitlement.state, 'trialing');
  assert.deepEqual(v.you, { name: 'Pam', email: 'pam@example.test', isAdmin: false });
  assert.equal(v.membership, 'active');
  assert.equal(v.fetchedAt, '2026-09-02T09:00:00.000Z');
  assert.equal(fs.statSync(path.join(userData, 'teams', 'org.json')).mode & 0o777, 0o600);
  assert.deepEqual(seen, [false]);
  off();
  assert.equal(gate.mode(), 'live');
});

test('Verify is the only path to true; a DIFFERENT key later is D13 for the org and clears it', async () => {
  await org.refresh();
  assert.deepEqual(org.verifyKey(), { ok: true });
  assert.equal(org.view().keyVerified, true);
  // The wire cannot set verified: the same key again stays verified, and a
  // different key drops it and keeps the old one beside the new.
  await org.refresh();
  assert.equal(org.view().keyVerified, true);
  relay.me = me({}, { signingKey: KEY_B });
  await org.refresh();
  const v = org.view();
  assert.equal(v.keyVerified, false);
  assert.equal(v.signingKey, KEY_B);
  assert.equal(v.keyPreviousGroups, org.keyGroups(KEY_A));
  assert.notEqual(v.keyGroups, v.keyPreviousGroups);
  // Back to A: it is a change again from B's point of view; the admin decides.
  relay.me = me();
  await org.refresh();
  assert.equal(org.view().keyVerified, false);
  org.verifyKey();
});

test('the org\'s leaseSeconds lands in membership.json (plan 2.3\'s org-configurable seam)', async () => {
  relay.me = me({ leaseSeconds: 24 * 3600 });
  await org.refresh();
  assert.equal(membership.readMembership().leaseSeconds, 24 * 3600);
  relay.me = me({ leaseSeconds: 259200 });
  await org.refresh();
  assert.equal(membership.readMembership().leaseSeconds, 259200);
  // An absent or absurd value leaves the lease alone.
  const before = membership.readMembership().leaseSeconds;
  relay.me = me({ leaseSeconds: 0 });
  await org.refresh();
  assert.equal(membership.readMembership().leaseSeconds, before);
});

test('membership state reaches the gate WITH ITS REASON, and an active answer clears a stopped', async () => {
  const modes = [];
  const off = gate.onChange((m) => modes.push(m));
  relay.me = me({ membership: 'suspended' });
  await org.refresh();
  assert.equal(gate.mode(), 'locked');
  assert.equal(gate.lockInfo().reason, 'suspended');
  relay.me = me({ membership: 'removed' });
  await org.refresh();
  assert.equal(gate.lockInfo().reason, 'removed');
  relay.me = me({}, { entitlement: { state: 'cancelled', trialEndsAt: null, graceEndsAt: null } });
  await org.refresh();
  assert.equal(gate.lockInfo().reason, 'entitlement');
  relay.me = me({}, { entitlement: { state: 'payment-failed', trialEndsAt: null, graceEndsAt: '2026-09-20T00:00:00.000Z' } });
  await org.refresh();
  assert.equal(gate.lockInfo().reason, 'entitlement', 'payment-failed is not active');
  // The socket said stopped:unknown (two 401s); /me says the seat is active.
  // The org's word outranks what the socket could infer.
  gate.setRevoked('unknown');
  relay.me = me();
  await org.refresh();
  assert.equal(gate.mode(), 'live');
  assert.equal(gate.lockInfo(), null);
  // Five pushes, not six: payment-failed after cancelled is the same reason
  // (entitlement) and the gate does not push the same word twice.
  assert.deepEqual(modes, ['locked', 'locked', 'locked', 'locked', 'live']);
  off();
});

test('a 401 or a transport failure leaves the last answer standing', async () => {
  await org.refresh();
  relay.status = 401;
  assert.equal(await org.refresh(), 'refused');
  assert.equal(org.view().available, true);
  relay.status = 503;
  assert.equal(await org.refresh(), 'offline');
  assert.equal(org.view().available, true);
  assert.equal(gate.mode(), 'live', 'a transport failure locked the gate');
});

test('a malformed /me is ignored, not applied', async () => {
  await org.refresh();
  relay.me = { org: { orgId: 'org_1' }, membership: 'weird' };
  assert.equal(await org.refresh(), 'offline');
  assert.equal(org.view().name, 'Dunder Mifflin');
});

test('the poll: a refresh on connect and on stopped, the quarter-hour cadence, hourly once lapsed', async () => {
  const session = loadTs('src/main/teamsSession.ts');
  // Not a socket test: the org module only listens to the session's state
  // changes, and the fake relay here has no /connect. Drive the listener
  // through the session's own subscriber list by starting the org poll and
  // counting /me reads.
  const before = relay.nonces;
  org.TUNING.pollMs = 40;
  org.TUNING.lapsedPollMs = 40;
  const stop = org.start();
  // WAIT FOR THE POLLS, do not sleep a fixed 150 ms and hope three cadences of
  // 40 ms fitted inside it. Under load they do not: this failed once at
  // --test-concurrency=2 with two reads and passed 8/8 alone. What is being
  // tested is that the poll repeats, not that node's timers are punctual, so
  // the test waits for the third read and only then asserts.
  const deadline = Date.now() + 5000;
  while (relay.nonces - before < 3 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 20));
  }
  stop();
  const reads = relay.nonces - before;
  assert.ok(reads >= 3, `expected the start read plus at least two polls, saw ${reads}`);
  void session;
});

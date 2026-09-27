'use strict';

/**
 * The join, D2 to D4, against a FAKE RELAY that speaks the live one's shapes.
 *
 * The property Phase 0 proves: on ANY refusal there is no key on disk and no
 * membership file, and on success there is exactly one of each, written only
 * after the relay's fingerprint matched the one this machine derived.
 *
 * Every absence claim has a positive control beside it: the same file exists
 * after the success case, so "does not exist" is not the test failing to look.
 * The fake relay verifies the enrol signature with libsodium, and the verifier
 * is shown to reject a different key, so a canonical-string regression on the
 * enrol path (six lines, empty device id) fails HERE and not only in the unit
 * test of the string.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const loadTs = require('./load-ts.cjs');

/* ---- electron stub ---------------------------------------------------------- */

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-enrol-'));
let encryptionAvailable = true;
const opened = [];

const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath, filename: electronPath, loaded: true,
  exports: {
    app: { getPath: () => userData },
    shell: { openExternal: async (u) => { opened.push(u); } },
    safeStorage: {
      isEncryptionAvailable: () => encryptionAvailable,
      getSelectedStorageBackend: () => 'gnome_libsecret',
      encryptString: (s) => Buffer.from('SEALED:' + s, 'utf8'),
      decryptString: (b) => {
        const s = Buffer.from(b).toString('utf8');
        if (!s.startsWith('SEALED:')) throw new Error('not encrypted by this store');
        return s.slice(7);
      },
    },
  },
};

/* ---- the fake relay --------------------------------------------------------- */

const b64urlToBuf = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const fingerprintOf = (pkBuf) => {
  const d = crypto.createHash('sha256').update(pkBuf).digest();
  return d.subarray(0, 12).toString('hex').toUpperCase().match(/.{4}/g).join(' ');
};
const DEVICE_ID = 'dev_' + 'A'.repeat(22);

/**
 * THE RELAY'S OWN CLOCK, as it stamps an enrolment. `lastVerifiedAt` is this
 * value (teamsEnrol.ts writes `res.data.enrolledAt` into it), and the lease is
 * measured from it, so a fixture pinned to a calendar date ROTS: twenty four
 * hours after that date the gate answers `degraded`, and seventy two hours
 * after it `locked`, so the suite passes or fails on the day it is run. It
 * also has to agree with `lastVerifiedLocalAt`, which is this machine's real
 * clock, or the clock-went-backwards guard answers `locked` on its own. A
 * minute ago satisfies both and is what a real enrol produces.
 */
const ENROLLED_AT = new Date(Date.now() - 60_000).toISOString();

/**
 * A LATER stamp, on the Date header of a signed response, which must move the
 * lease forward. It has to be after ENROLLED_AT (the lease only ever advances)
 * and, like it, near now. Floored to a whole second because an HTTP Date
 * header has no milliseconds, so this is exactly what the client parses back.
 */
const VERIFIED_AT = new Date(Math.floor((Date.now() - 30_000) / 1000) * 1000);

const relay = {
  /** What /enrol answers next: { status, body } or a function of the parsed body. */
  next: null,
  /** Every request: { method, path, headers, body, verified } */
  log: [],
  nonces: 0,
  /** The Date header put on signed responses, so the lease can be checked. */
  date: null,
};

let sodium;
async function verifyEnrol(req, raw) {
  const body = JSON.parse(raw);
  const canonical = ['MDv1', 'POST', '/enrol', req.headers['x-md-nonce'],
    crypto.createHash('sha256').update(raw, 'utf8').digest('hex'), ''].join('\n');
  const sig = b64urlToBuf(req.headers['x-md-signature']);
  const pk = b64urlToBuf(body.publicKey);
  const ok = sodium.crypto_sign_verify_detached(new Uint8Array(sig), new Uint8Array(Buffer.from(canonical, 'utf8')), new Uint8Array(pk));
  // The control: the same signature must NOT verify under another key, or the
  // line above proves nothing.
  const other = sodium.crypto_sign_keypair().publicKey;
  const okOther = sodium.crypto_sign_verify_detached(new Uint8Array(sig), new Uint8Array(Buffer.from(canonical, 'utf8')), other);
  return { ok, okOther, body, pk };
}

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', async () => {
    const url = new URL(req.url, 'http://x');
    const entry = { method: req.method, path: req.url, headers: req.headers, body: raw, verified: null };
    relay.log.push(entry);
    const send = (status, body) => {
      if (relay.date) res.setHeader('date', relay.date);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/challenge') return send(200, { nonce: `nonce-${++relay.nonces}` });
    if (url.pathname === '/enrol') {
      const v = await verifyEnrol(req, raw);
      entry.verified = v.ok;
      entry.verifiedUnderOtherKey = v.okOther;
      const next = typeof relay.next === 'function' ? relay.next(v) : relay.next;
      return send(next.status, next.body);
    }
    if (url.pathname === '/roster') {
      return send(200, {
        org: { orgId: 'org_1', name: 'Dunder Mifflin', seatsUsed: 1, seatsPaid: 5, defaultPermission: 'communication-only' },
        you: { memberId: 'mem_1', deviceId: DEVICE_ID },
        members: [],
      });
    }
    send(404, { ok: false, error: 'not_found', detail: null });
  });
});

let identity, membership, gate, enrol, relayClient, teams;
const identityFile = () => path.join(userData, 'teams', 'device-identity.json');
const membershipFile = () => path.join(userData, 'teams', 'membership.json');

test.before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.MD_RELAY_URL = `http://127.0.0.1:${server.address().port}`;
  delete process.env.MD_TEAMS_SIGNIN;
  sodium = require('libsodium-wrappers');
  await sodium.ready;
  identity = loadTs('src/main/deviceIdentity.ts');
  membership = loadTs('src/main/teamsMembership.ts');
  gate = loadTs('src/main/teamsGate.ts');
  relayClient = loadTs('src/main/relay.ts');
  enrol = loadTs('src/main/teamsEnrol.ts');
  teams = loadTs('src/shared/teams.ts');
});
test.after(() => server.close());

function reset() {
  encryptionAvailable = true;
  opened.length = 0;
  relay.log.length = 0;
  relay.next = null;
  relay.date = null;
  identity.forgetIdentity();
  membership.forgetMembership();
  enrol.cancelSignIn();
}

const hex64 = () => crypto.randomBytes(32).toString('hex');

/** Run the browser round trip with a grant that comes back by deep link. */
async function signInAndGrant() {
  const begun = await enrol.beginSignIn();
  assert.equal(begun.ok, true);
  const state = new URL(begun.url).searchParams.get('state');
  const link = teams.parseTeamsDeepLink(`munderdifflin://teams/enrol?grant=${hex64()}&state=${state}`);
  const r = enrol.receiveGrant({ grant: link.grant, state: link.state }, 'link');
  assert.equal(r.ok, true);
}

const nothingOnDisk = () => {
  assert.equal(identity.hasIdentity(), false, 'a key was written');
  assert.equal(fs.existsSync(identityFile()), false, 'the key file exists');
  assert.equal(fs.existsSync(membershipFile()), false, 'the membership file exists');
  assert.equal(gate.mode(), 'solo');
};

/* ---- the deep link ----------------------------------------------------------- */

test('parseTeamsDeepLink accepts both spellings and nothing else', () => {
  const g = hex64(), s = hex64();
  assert.deepEqual(teams.parseTeamsDeepLink(`munderdifflin://teams/enrol?grant=${g}&state=${s}`), { action: 'enrol', grant: g, state: s });
  assert.deepEqual(teams.parseTeamsDeepLink(`munderdifflin:teams/enrol?grant=${g}&state=${s}`), { action: 'enrol', grant: g, state: s });
  assert.equal(teams.parseTeamsDeepLink(`munderdifflin://hire?src=https://x/y.json`), null, 'a hire link is not a teams link');
  assert.equal(teams.parseTeamsDeepLink(`munderdifflin://teams/enrol?grant=${g}`), null, 'state is required');
  assert.equal(teams.parseTeamsDeepLink(`munderdifflin://teams/enrol?grant=abc&state=${s}`), null, 'a grant is 64 hex');
  assert.equal(teams.parseTeamsDeepLink(`munderdifflin://teams/revoke?grant=${g}&state=${s}`), null, 'only enrol');
  assert.equal(teams.parseTeamsDeepLink(`https://app.harnessmd.com/teams/enrol?grant=${g}&state=${s}`), null, 'only our scheme');
});

/* ---- the sign-in round trip ------------------------------------------------ */

test('beginSignIn opens the browser at the sign-in page with a fresh state', async () => {
  reset();
  const a = await enrol.beginSignIn();
  const b = await enrol.beginSignIn();
  assert.equal(opened.length, 2);
  assert.match(a.url, /^https:\/\/app\.harnessmd\.com\/desktop\/signin\?state=[0-9a-f]{64}$/);
  assert.notEqual(a.url, b.url, 'state must be fresh each time');
  assert.equal(gate.mode(), 'enrolling');
});

test('a deep link with the wrong state is refused and does NOT cancel the real sign-in', async () => {
  reset();
  const begun = await enrol.beginSignIn();
  const before = enrol._pendingForTests();
  const r = enrol.receiveGrant({ grant: hex64(), state: hex64() }, 'link');
  assert.equal(r.ok, false);
  assert.equal(r.error, 'signin');
  const after = enrol._pendingForTests();
  assert.equal(after.state, before.state, 'a foreign link cancelled the pending sign-in');
  assert.equal(after.hasGrant, false);
  // And the right state is still accepted afterwards: the refusal was of the
  // link, not of the sign-in.
  const state = new URL(begun.url).searchParams.get('state');
  assert.equal(enrol.receiveGrant({ grant: hex64(), state }, 'link').ok, true);
  assert.equal(enrol.hasGrant(), true);
});

test('a grant that arrives with no sign-in in progress is refused (cold start)', () => {
  reset();
  const r = enrol.receiveGrant({ grant: hex64(), state: hex64() }, 'link');
  assert.equal(r.ok, false);
  assert.equal(r.error, 'signin');
});

test('paste accepts the bare code, and a pasted whole link is still held to the state', async () => {
  reset();
  const begun = await enrol.beginSignIn();
  const state = new URL(begun.url).searchParams.get('state');
  assert.equal(enrol.receiveGrant({ grant: 'not a code' }, 'paste').ok, false);
  assert.equal(enrol.receiveGrant({ grant: `munderdifflin://teams/enrol?grant=${hex64()}&state=${hex64()}` }, 'paste').ok, false,
    'a pasted link carrying someone else\'s state must not be accepted');
  assert.equal(enrol.receiveGrant({ grant: `munderdifflin://teams/enrol?grant=${hex64()}&state=${state}` }, 'paste').ok, true);
  enrol.cancelSignIn();
  await enrol.beginSignIn();
  assert.equal(enrol.receiveGrant({ grant: hex64().toUpperCase() }, 'paste').ok, true, 'a bare code has no state to compare');
});

test('a keyring that cannot encrypt refuses BEFORE the browser opens', async () => {
  reset();
  encryptionAvailable = false;
  const r = await enrol.beginSignIn();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'keyring_unavailable');
  assert.equal(opened.length, 0, 'the browser opened for a machine that cannot keep a key');
  assert.equal(gate.mode(), 'solo');
});

/* ---- refusals leave nothing --------------------------------------------- */

test('enrol without a grant does not call the relay and leaves nothing', async () => {
  reset();
  const r = await enrol.enrol({ code: 'MD-ABCD-EFGH' }, { appVersion: '0.4.6' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'signin');
  assert.equal(relay.log.length, 0, 'the relay was called with no grant');
  nothingOnDisk();
});

const REFUSALS = [
  ['not_found → invalid', 404, { error: 'not_found', detail: 'That invite code is not valid.' }, 'invalid'],
  ['conflict redeemed → used', 409, { error: 'conflict', detail: 'That invite is redeemed.' }, 'used'],
  ['conflict expired → expired', 409, { error: 'conflict', detail: 'That invite is expired.' }, 'expired'],
  ['conflict suspended → refused with the sentence', 409, { error: 'conflict', detail: 'That member is suspended.' }, 'refused'],
  ['seats_exhausted → refused', 409, { error: 'seats_exhausted', detail: '10 of 10 seats are in use.' }, 'refused'],
  ['entitlement_inactive → refused', 402, { error: 'entitlement_inactive', detail: 'This organisation is not currently active.' }, 'refused'],
  ['device_limit → refused', 409, { error: 'device_limit', detail: 'A member may enrol at most 5 machines.' }, 'refused'],
  ['invalid_body (S10 not deployed: grant is an extra field) → refused', 400, { error: 'invalid_body', detail: 'body: unexpected field grant' }, 'refused'],
];

for (const [name, status, body, expected] of REFUSALS) {
  test(`refusal ${name}: no key, no membership, grant dropped`, async () => {
    reset();
    await signInAndGrant();
    relay.next = { status, body };
    const r = await enrol.enrol({ code: 'md abcd efgh' }, { appVersion: '0.4.6' });
    assert.equal(r.ok, false);
    assert.equal(r.error, expected, `${body.error}: mapped to ${r.error}`);
    assert.equal(r.detail, body.detail, 'the relay\'s sentence travels with the refusal');
    nothingOnDisk();
    assert.equal(enrol.hasGrant(), false, 'a possibly spent grant was kept for a retry');
    const sent = JSON.parse(relay.log.find((e) => e.path === '/enrol').body);
    assert.equal(sent.code, 'MD-ABCD-EFGH', 'the code is normalised before it is sent');
    assert.match(sent.grant, /^[0-9a-f]{64}$/);
  });
}

test('a relay that is down is `offline`, and nothing is written', async () => {
  reset();
  await signInAndGrant();
  const real = process.env.MD_RELAY_URL;
  // The URL is captured at module load, so point a second copy at a dead port.
  const dead = http.createServer(() => {});
  await new Promise((r) => dead.listen(0, '127.0.0.1', r));
  const port = dead.address().port;
  await new Promise((r) => dead.close(r));
  process.env.MD_RELAY_URL = `http://127.0.0.1:${port}`;
  try {
    // A fresh loader gives a fresh module graph that reads the dead URL at
    // load; the electron stub and the userData directory are the same.
    delete require.cache[require.resolve('./load-ts.cjs')];
    const loadFresh = require('./load-ts.cjs');
    const enrol2 = loadFresh('src/main/teamsEnrol.ts');
    await enrol2.beginSignIn();
    const st = enrol2._pendingForTests().state;
    enrol2.receiveGrant({ grant: hex64(), state: st }, 'link');
    const r = await enrol2.enrol({ code: 'MD-ABCD-EFGH' }, { appVersion: '0.4.6' });
    assert.equal(r.ok, false);
    assert.equal(r.error, 'offline');
  } finally {
    process.env.MD_RELAY_URL = real;
  }
  assert.equal(fs.existsSync(path.join(userData, 'teams', 'device-identity.json')), false);
  assert.equal(fs.existsSync(path.join(userData, 'teams', 'membership.json')), false);
});

test('MUTATION CONTROL: a relay reporting a fingerprint that is not ours is refused and writes nothing', async () => {
  reset();
  await signInAndGrant();
  relay.next = (v) => ({ status: 201, body: {
    deviceId: DEVICE_ID, memberId: 'mem_1', orgId: 'org_1', orgName: 'Dunder Mifflin',
    fingerprint: fingerprintOf(Buffer.from(sodium.crypto_sign_keypair().publicKey)),
    relayUrl: 'ws://127.0.0.1:4312/connect', enrolledAt: ENROLLED_AT,
  } });
  const r = await enrol.enrol({ code: 'MD-ABCD-EFGH' }, { appVersion: '0.4.6' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'refused');
  assert.equal(r.reason, 'fingerprint_mismatch');
  nothingOnDisk();
  // The relay DID accept: the refusal is ours. Remove the compare in
  // teamsEnrol.ts and this test is the one that fails.
  assert.equal(relay.log.find((e) => e.path === '/enrol').verified, true);
});

/* ---- success ------------------------------------------------------------- */

test('success: signed by the new key, key and membership written 0600, the RELAY\'s device id on the wire, lease recorded', async () => {
  reset();
  await signInAndGrant();
  relay.next = (v) => ({ status: 201, body: {
    deviceId: DEVICE_ID, memberId: 'mem_1', orgId: 'org_1', orgName: 'Dunder Mifflin',
    fingerprint: fingerprintOf(v.pk),
    relayUrl: 'ws://127.0.0.1:4312/connect', enrolledAt: ENROLLED_AT,
  } });
  const steps = [];
  const off = enrol.onProgress((s) => steps.push(s));
  const r = await enrol.enrol({ code: 'MD-ABCD-EFGH' }, { appVersion: '0.4.6' });
  off();
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(steps, ['keys', 'registering', 'checking']);
  assert.equal(r.org.name, 'Dunder Mifflin');
  assert.equal(r.deviceId, DEVICE_ID);

  const e = relay.log.find((x) => x.path === '/enrol');
  assert.equal(e.verified, true, 'the enrol was not signed by the key it registers');
  assert.equal(e.verifiedUnderOtherKey, false, 'the verifier accepts anything');
  assert.equal(e.headers['x-md-device'], undefined, 'enrol must carry no device header');
  const sent = JSON.parse(e.body);
  assert.deepEqual(Object.keys(sent).sort(), ['appVersion', 'code', 'deviceName', 'grant', 'os', 'publicKey']);

  // Positive controls for every "nothing on disk" above.
  assert.equal(identity.hasIdentity(), true);
  assert.equal(fs.statSync(identityFile()).mode & 0o777, 0o600);
  assert.equal(fs.statSync(membershipFile()).mode & 0o777, 0o600);
  const m = membership.readMembership();
  assert.equal(m.deviceId, DEVICE_ID);
  assert.equal(m.orgName, 'Dunder Mifflin');
  assert.equal(m.lastVerifiedAt, ENROLLED_AT);
  assert.equal(m.leaseSeconds, 72 * 3600);
  assert.equal(gate.mode(), 'live');
  assert.equal(enrol.hasGrant(), false, 'the grant is single use; nothing to keep');

  // The local, fingerprint-derived id and the relay's are different values,
  // and the wire carries the relay's. Sending the local one was the bug.
  const local = identity.deviceIdentity().deviceId;
  assert.notEqual(local, DEVICE_ID);
  relay.date = VERIFIED_AT.toUTCString();
  const roster = await relayClient.fetchRoster();
  assert.equal(roster.ok, true);
  const ch = relay.log.find((x) => x.path.startsWith('/challenge?'));
  assert.equal(ch.path, `/challenge?deviceId=${DEVICE_ID}`);
  const ro = relay.log.find((x) => x.path === '/roster');
  assert.equal(ro.headers['x-md-device'], DEVICE_ID);
  // One nonce per request, never reused: the roster's is not the enrol's.
  assert.match(ro.headers['x-md-nonce'], /^nonce-\d+$/);
  assert.notEqual(ro.headers['x-md-nonce'], e.headers['x-md-nonce']);
  // Plan 4.2: the successful signed response moved the lease forward, in the
  // relay's clock.
  assert.equal(membership.readMembership().lastVerifiedAt, VERIFIED_AT.toISOString());
});

test('the gate: an orphan key or an orphan membership is solo, never live', () => {
  reset();
  // Key without membership: the pre-Phase-0 build, or a crash between writes.
  const pair = sodium.crypto_sign_keypair();
  identity.saveIdentity(pair.publicKey, pair.privateKey);
  assert.equal(identity.hasIdentity(), true);
  assert.equal(gate.mode(), 'solo');
  identity.forgetIdentity();
  // Membership without a key: cannot sign, so cannot be a member.
  const now = new Date().toISOString();
  const fresh = {
    orgId: 'o', memberId: 'm', deviceId: DEVICE_ID, orgName: 'X', relayUrl: '',
    enrolledAt: now, lastVerifiedAt: now, lastVerifiedLocalAt: now, leaseSeconds: membership.LEASE_SECONDS,
  };
  membership.writeMembership(fresh);
  assert.equal(gate.mode(), 'solo');
  // And both together IS live: the control for the two above.
  identity.saveIdentity(pair.publicKey, pair.privateKey);
  assert.equal(gate.mode(), 'live');
  // Since Phase 1 the lease is enforced: the same two files with a proof
  // older than the lease are `locked`, not live (teams-gate.test.cjs has the
  // rest). Here so this control cannot silently pass on an expired lease.
  membership.writeMembership({ ...fresh, lastVerifiedAt: '2026-09-01T00:00:00.000Z', lastVerifiedLocalAt: '2026-09-01T00:00:00.000Z', leaseSeconds: 1 });
  assert.equal(gate.mode(), 'locked');
  reset();
});

test('a second machine (plan 4.8): no code, the grant alone names the seat, and the body carries no code field', async () => {
  reset();
  await signInAndGrant();
  relay.next = (v) => ({ status: 201, body: {
    deviceId: DEVICE_ID, memberId: 'mem_1', orgId: 'org_1', orgName: 'Dunder Mifflin',
    fingerprint: fingerprintOf(v.pk),
    relayUrl: 'ws://127.0.0.1:4312/connect', enrolledAt: ENROLLED_AT,
  } });
  const r = await enrol.enrol({ code: '   ' }, { appVersion: '0.4.6' });
  assert.equal(r.ok, true, JSON.stringify(r));
  const e = relay.log.find((x) => x.path === '/enrol');
  assert.equal(e.verified, true);
  const sent = JSON.parse(e.body);
  // ABSENT, not empty: the body is hashed into the signature and the relay's
  // validator refuses an empty string. S10 defines this grant-only enrol.
  assert.deepEqual(Object.keys(sent).sort(), ['appVersion', 'deviceName', 'grant', 'os', 'publicKey']);
  assert.equal(identity.hasIdentity(), true);
  assert.equal(membership.readMembership().orgName, 'Dunder Mifflin');
  reset();
});

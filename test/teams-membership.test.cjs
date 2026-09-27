'use strict';

/**
 * membership.json and the lease clock it carries (plan 2.3, recorded and not
 * yet enforced). The one property with teeth: `lastVerifiedAt` NEVER MOVES
 * BACKWARDS. A response arriving late, or a relay clock briefly behind ours,
 * must not shorten a lease, and a local clock set back must not either.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-membership-'));
const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath, filename: electronPath, loaded: true,
  exports: { app: { getPath: () => userData } },
};

const m = loadTs('src/main/teamsMembership.ts');
const file = () => path.join(userData, 'teams', 'membership.json');

const row = (over = {}) => ({
  orgId: 'org_1', memberId: 'mem_1', deviceId: 'dev_' + 'A'.repeat(22), orgName: 'Dunder Mifflin',
  relayUrl: 'ws://127.0.0.1:4312/connect', enrolledAt: '2026-09-01T00:00:00.000Z',
  lastVerifiedAt: '2026-09-01T00:00:00.000Z', lastVerifiedLocalAt: '2026-09-01T00:00:00.000Z',
  leaseSeconds: 259200, ...over,
});

test('absent is null, and touching an absent membership writes nothing', () => {
  m.forgetMembership();
  assert.equal(m.readMembership(), null);
  m.touchVerified('2026-09-02T00:00:00.000Z');
  assert.equal(fs.existsSync(file()), false, 'touchVerified created a membership out of nothing');
});

test('write is 0600 and reads back; a half-written file reads as absent', () => {
  m.writeMembership(row());
  assert.equal(fs.statSync(file()).mode & 0o777, 0o600);
  assert.deepEqual(m.readMembership(), row());
  fs.writeFileSync(file(), JSON.stringify({ orgId: 'x' }));
  assert.equal(m.readMembership(), null, 'a membership with no device id is not a membership');
  fs.writeFileSync(file(), '{ not json');
  assert.equal(m.readMembership(), null);
  m.forgetMembership();
  assert.equal(fs.existsSync(file()), false);
});

test('missing lease fields take the defaults, so an older file still gates', () => {
  const { lastVerifiedAt, leaseSeconds, relayUrl, ...older } = row();
  void lastVerifiedAt; void leaseSeconds; void relayUrl;
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(older));
  const r = m.readMembership();
  assert.equal(r.lastVerifiedAt, older.enrolledAt);
  assert.equal(r.lastVerifiedLocalAt, older.enrolledAt, 'a Phase 0 file has no local stamp; the server one stands in');
  assert.equal(r.leaseSeconds, m.LEASE_SECONDS);
  assert.equal(r.relayUrl, '');
});

test('touchVerified moves forward in the relay\'s clock and never backwards', () => {
  m.writeMembership(row({ lastVerifiedAt: '2026-09-02T12:00:00.000Z' }));
  const t0 = Date.now();
  m.touchVerified('Wed, 02 Sep 2026 13:00:00 GMT');
  assert.equal(m.readMembership().lastVerifiedAt, '2026-09-02T13:00:00.000Z');
  // The local stamp is LOCAL now, not the relay's time: the two clocks are
  // kept apart on purpose (the gate compares each only with itself).
  const local = Date.parse(m.readMembership().lastVerifiedLocalAt);
  assert.ok(local >= t0 - 5 && local <= Date.now() + 5, `local stamp is not local now: ${local}`);
  // Backwards: a late response, or a relay clock behind ours.
  m.touchVerified('Wed, 02 Sep 2026 12:30:00 GMT');
  assert.equal(m.readMembership().lastVerifiedAt, '2026-09-02T13:00:00.000Z', 'the lease was shortened');
  // Equal: no write (mtime is the observable).
  const before = fs.statSync(file()).mtimeMs;
  m.touchVerified('2026-09-02T13:00:00.000Z');
  assert.equal(fs.statSync(file()).mtimeMs, before);
});

test('an unparseable or absent Date header falls back to local time, which is at least now', () => {
  m.writeMembership(row({ lastVerifiedAt: '2020-01-01T00:00:00.000Z' }));
  const t0 = Date.now();
  m.touchVerified('not a date');
  const a = Date.parse(m.readMembership().lastVerifiedAt);
  assert.ok(a >= t0 - 5 && a <= Date.now() + 5, `fell back to local time: ${a} vs ${t0}`);
  m.writeMembership(row({ lastVerifiedAt: '2020-01-01T00:00:00.000Z' }));
  m.touchVerified(null);
  assert.ok(Date.parse(m.readMembership().lastVerifiedAt) >= t0 - 5);
  // The control: the same call with a real header lands on the header, not on now.
  m.writeMembership(row({ lastVerifiedAt: '2020-01-01T00:00:00.000Z' }));
  m.touchVerified('2021-06-01T00:00:00.000Z');
  assert.equal(m.readMembership().lastVerifiedAt, '2021-06-01T00:00:00.000Z');
  m.forgetMembership();
});

test('the lease constants are the 2.3 default and are named as a default, not a ruling', () => {
  assert.equal(m.LEASE_SECONDS, 72 * 3600);
  assert.equal(m.LEASE_WARN_SECONDS, 24 * 3600);
  const src = fs.readFileSync(path.join(__dirname, '..', 'src/main/teamsMembership.ts'), 'utf8');
  assert.match(src, /DEFAULT NOT RULING/, 'the seam for the founder\'s 2.3 ruling lost its marker');
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { pickNextAccount, pooledCredentials, decodeJwtEmail, COOLDOWN_MS } = loadTs('src/main/opencode-pool.ts');

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

/** Minimal fake credential row (the shape `credential` has in the store). */
function row(id, email, expires, active = 0, label = 'Default') {
  // Access token is a real JWT envelope so decodeJwtEmail is exercised too.
  const payload = Buffer.from(JSON.stringify({ email, exp: Math.floor(expires / 1000) })).toString('base64url');
  const access = `header.${payload}.signature`;
  return { id, label, active, value: JSON.stringify({ type: 'oauth', access, expires }) };
}

test('decodeJwtEmail reads the account out of an access token', () => {
  const { access } = JSON.parse(row('c1', 'someone@example.com', NOW).value);
  assert.equal(decodeJwtEmail(access), 'someone@example.com');
  assert.equal(decodeJwtEmail('not-a-jwt'), null);
  assert.equal(decodeJwtEmail(''), null);
});

test('pooledCredentials keeps one entry per row and marks the active account', () => {
  const creds = pooledCredentials([
    row('cred_a', 'a@x.com', NOW + 1 * HOUR, 0),
    row('cred_b', 'b@x.com', NOW + 2 * HOUR, 1, 'Personal'),
    row('cred_bad', 'ignored', NOW, 0)
  ].map((r, i) => (i === 2 ? { ...r, value: '{not json' } : r)));
  assert.equal(creds.length, 2);
  assert.deepEqual(creds.map((c) => c.account), ['a@x.com', 'b@x.com']);
  assert.equal(creds.find((c) => c.active).id, 'cred_b');
});

test('never re-picks the account that just failed', () => {
  const creds = pooledCredentials([
    row('cred_old', 'dead@x.com', NOW + 1 * HOUR, 1),
    row('cred_new', 'live@x.com', NOW + 2 * HOUR, 0)
  ]);
  const { pick, current } = pickNextAccount(creds, { now: NOW, cooldown: {} });
  assert.equal(current.account, 'dead@x.com');
  assert.equal(pick.id, 'cred_new');
});

test('one row per account, freshest login wins', () => {
  const creds = pooledCredentials([
    row('cred_stale', 'same@x.com', NOW + 1 * HOUR, 0),
    row('cred_fresh', 'same@x.com', NOW + 5 * HOUR, 0),
    row('cred_other', 'other@x.com', NOW + 2 * HOUR, 1)
  ]);
  const { pick } = pickNextAccount(creds, { now: NOW, cooldown: {} });
  assert.equal(pick.id, 'cred_fresh', 'must not offer the stale row of the same account');
});

test('prefers the freshest candidate when several accounts are free', () => {
  const creds = pooledCredentials([
    row('cred_a', 'a@x.com', NOW + 1 * HOUR, 1),
    row('cred_b', 'b@x.com', NOW + 3 * HOUR, 0),
    row('cred_c', 'c@x.com', NOW + 2 * HOUR, 0)
  ]);
  const { pick } = pickNextAccount(creds, { now: NOW, cooldown: {} });
  assert.equal(pick.account, 'b@x.com');
});

test('benched accounts are skipped and reported with the next release time', () => {
  const creds = pooledCredentials([
    row('cred_a', 'a@x.com', NOW + 1 * HOUR, 1),
    row('cred_b', 'b@x.com', NOW + 3 * HOUR, 0),
    row('cred_c', 'c@x.com', NOW + 2 * HOUR, 0)
  ]);
  const cooldown = { cred_b: NOW + 2 * HOUR, cred_c: NOW + 1 * HOUR };
  const { pick, benchedAccounts, nextAvailableAt } = pickNextAccount(creds, { now: NOW, cooldown });
  assert.equal(pick, null);
  assert.deepEqual(benchedAccounts.sort(), ['b@x.com', 'c@x.com']);
  assert.equal(nextAvailableAt, NOW + 1 * HOUR);
});

test('an expired cooldown is usable again', () => {
  const creds = pooledCredentials([
    row('cred_a', 'a@x.com', NOW + 1 * HOUR, 1),
    row('cred_b', 'b@x.com', NOW + 3 * HOUR, 0)
  ]);
  const { pick } = pickNextAccount(creds, { now: NOW, cooldown: { cred_b: NOW - 1 } });
  assert.equal(pick.id, 'cred_b');
});

test('a store with a single account yields no rotation', () => {
  const creds = pooledCredentials([row('cred_only', 'only@x.com', NOW + HOUR, 1)]);
  const { pick, benchedAccounts, nextAvailableAt } = pickNextAccount(creds, { now: NOW, cooldown: {} });
  assert.equal(pick, null);
  assert.deepEqual(benchedAccounts, []);
  assert.equal(nextAvailableAt, undefined);
});

test('cooldown is four hours', () => {
  assert.equal(COOLDOWN_MS, 4 * HOUR);
});

'use strict';

/**
 * The solo licence key's shape, checked here so the desktop field and the web
 * console cannot drift on what a valid key is.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const L = loadTs(path.join(__dirname, '..', 'src/shared/licenseKey.ts'));

const REAL = L.licenseFrom('7K2P9RXT4M8VQZ');

test('a generated key is valid, canonical, and grouped for reading', () => {
  assert.equal(L.isLicenseKey(REAL), true);
  assert.match(REAL, /^MDS-[0-9A-Z]{5}-[0-9A-Z]{5}-[0-9A-Z]{5}$/);
  assert.equal(L.checkLicense(REAL).key, REAL);
});

test('the shipped example is itself valid, so no screenshot shows an error state', () => {
  assert.equal(L.isLicenseKey(L.LICENSE_EXAMPLE), true);
});

test('a team invite code is recognised as such, not called invalid', () => {
  // The single most likely mistake: the two codes arrive by the same channels
  // and look alike. "That is a team invite code" is worth more than "invalid".
  assert.equal(L.checkLicense('MD-4F2A-9KQ1').problem, 'looks-like-invite');
  assert.equal(L.checkLicense('md-4f2a-9kq1').problem, 'looks-like-invite');
});

test('a single wrong character is caught in the field', () => {
  const broken = REAL.slice(0, -1) + (REAL.endsWith('0') ? '1' : '0');
  assert.equal(L.checkLicense(broken).problem, 'bad-checksum');
});

test('two transposed neighbours are caught, which a plain sum would miss', () => {
  const bare = REAL.replace(/[^0-9A-Z]/g, '').slice(3);
  assert.notEqual(bare[0], bare[1], 'pick a fixture whose first two symbols differ');
  const swapped = bare[1] + bare[0] + bare.slice(2);
  assert.equal(L.checkLicense('MDS' + swapped).problem, 'bad-checksum');
});

test('the confusable characters are folded to what the person meant', () => {
  // O for zero, I or L for one. Typing them is not an error, it is a font.
  const typed = REAL.replace(/0/g, 'O').replace(/1/g, 'I');
  const check = L.checkLicense(typed);
  assert.equal(check.problem, null, 'a folded key was rejected');
  assert.equal(check.key, REAL, 'folding did not canonicalise');
});

test('formatting a person pasted is forgiven, meaning is not', () => {
  const bare = REAL.replace(/-/g, '');
  assert.equal(L.checkLicense(bare).key, REAL);
  assert.equal(L.checkLicense('  ' + REAL.toLowerCase() + '  ').key, REAL);
  assert.equal(L.checkLicense(REAL.replace(/-/g, ' ')).key, REAL);
});

test('every way of being wrong has its own answer', () => {
  assert.equal(L.checkLicense('').problem, 'empty');
  assert.equal(L.checkLicense('   ').problem, 'empty');
  assert.equal(L.checkLicense('ABC-12345-12345-12345').problem, 'wrong-prefix');
  assert.equal(L.checkLicense('MDS-123').problem, 'wrong-length');
  assert.equal(L.checkLicense('MDS-1234567890123456').problem, 'wrong-length');
  // U is outside the alphabet on purpose and is not a confusable, so it is a
  // genuine bad character rather than something to fold.
  assert.equal(L.checkLicense('MDS-UUUUU-UUUUU-UUUUU').problem, 'bad-character');
});

test('nothing here can mint a key a server would take', () => {
  // licenseFrom appends a checksum to a body the SERVER generated. It refuses
  // a body of the wrong length or alphabet, so it cannot be turned into a
  // generator by feeding it a guess.
  assert.throws(() => L.licenseFrom('TOOSHORT'));
  assert.throws(() => L.licenseFrom('7K2P9RXT4M8VQZEXTRA'));
  assert.throws(() => L.licenseFrom('7K2P9RXT4M8VQ!'));
});

test('a licence is live on exactly the states an org is entitled on', () => {
  const billing = loadTs(path.join(__dirname, '..', 'src/shared/billing.ts'));
  for (const state of ['awaiting-card', 'trialing', 'healthy', 'payment-failed', 'cancelled']) {
    assert.equal(
      L.licenceIsLive({ state }),
      billing.isEntitled(state),
      `solo and team disagree about ${state}`
    );
  }
});

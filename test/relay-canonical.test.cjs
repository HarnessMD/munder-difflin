'use strict';

/**
 * The relay's canonical signing string.
 *
 * This is the one piece whose failure is INVISIBLE FROM THE NETWORK. Contract
 * 3.1: every auth failure is one undifferentiated `unauthorized` with no detail,
 * deliberately, because distinguishing them is an oracle. So a client that
 * builds this string wrongly gets a well-formed signature that simply does not
 * verify, and nothing in the response says why.
 *
 * It has to be right by construction, and the contract names both mistakes a
 * client makes first. Both are tested here by name.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const loadTs = require('./load-ts.cjs');

const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath, filename: electronPath, loaded: true,
  exports: {
    app: { getPath: () => '/tmp/cth-relay-test' },
    safeStorage: {
      isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => 'gnome_libsecret',
      encryptString: (s) => Buffer.from('SEALED:' + s, 'utf8'),
      decryptString: (b) => Buffer.from(b).toString('utf8').slice(7),
    },
  },
};

const { canonicalString, b64url } = loadTs('src/main/relay.ts');

const NONCE = '9c1f2a3b4c5d6e7f';

test('it is always SIX lines', () => {
  const withDevice = canonicalString({
    method: 'GET', path: '/roster', nonce: NONCE, deviceId: 'dev_abc',
  });
  assert.equal(withDevice.split('\n').length, 6);

  const enrolment = canonicalString({
    method: 'POST', path: '/enrol', nonce: NONCE, rawBody: '{"a":1}',
  });
  assert.equal(enrolment.split('\n').length, 6)
});

test('ENROL: line six is empty, so the string ENDS IN A NEWLINE', () => {
  // Contract 3.1, verbatim: "six lines with a blank last one, not five lines".
  // The natural mistake is to omit the field and produce five lines.
  const s = canonicalString({
    method: 'POST', path: '/enrol', nonce: NONCE, rawBody: '{}',
  });
  assert.equal(s.endsWith('\n'), true, 'must end in a newline');
  assert.equal(s.split('\n')[5], '', 'line six must be the empty string');
});

test('GET: line five is the EMPTY STRING, not the hash of the empty string', () => {
  // The other named mistake, and the more dangerous one, because
  // sha256("") is a real 64-char hex value that LOOKS more correct than "".
  const s = canonicalString({
    method: 'GET', path: '/roster', nonce: NONCE, deviceId: 'dev_abc',
  });
  const line5 = s.split('\n')[4];
  assert.equal(line5, '');

  const hashOfEmpty = crypto.createHash('sha256').update('').digest('hex');
  assert.notEqual(line5, hashOfEmpty, 'this is the mistake the contract names');
});

test('a body is hashed as lowercase hex SHA-256 of the RAW bytes', () => {
  const raw = '{"code":"MD-7K3P-QX92"}';
  const s = canonicalString({
    method: 'POST', path: '/enrol', nonce: NONCE, rawBody: raw,
  });
  assert.equal(s.split('\n')[4], crypto.createHash('sha256').update(raw).digest('hex'));
  assert.match(s.split('\n')[4], /^[0-9a-f]{64}$/, 'lowercase hex');
});

test('re-serialising a body changes the hash — the reason bytes are sent once', () => {
  const a = canonicalString({ method: 'POST', path: '/e', nonce: NONCE, rawBody: '{"a":1}' });
  const b = canonicalString({ method: 'POST', path: '/e', nonce: NONCE, rawBody: '{ "a": 1 }' });
  assert.notEqual(a, b, 'same object, different bytes, different signature');
});

test('the path carries its query string exactly as sent', () => {
  const s = canonicalString({
    method: 'GET', path: '/roster?since=2026-08-30T00%3A00%3A00Z',
    nonce: NONCE, deviceId: 'dev_abc',
  });
  assert.equal(s.split('\n')[2], '/roster?since=2026-08-30T00%3A00%3A00Z')
});

test('the method is uppercased, so a lowercase caller cannot silently fail', () => {
  const s = canonicalString({ method: 'get', path: '/roster', nonce: NONCE, deviceId: 'd' });
  assert.equal(s.split('\n')[1], 'GET');
});

test('the prefix is MDv1 and the nonce is line four', () => {
  const s = canonicalString({ method: 'GET', path: '/roster', nonce: NONCE, deviceId: 'd' });
  const lines = s.split('\n');
  assert.equal(lines[0], 'MDv1');
  assert.equal(lines[3], NONCE);
});

/* ---- base64url ---------------------------------------------------------------- */

test('signatures are base64URL with no padding, not base64', () => {
  // A `+`, `/` or `=` in a header value is the kind of thing that works on every
  // test vector and fails on roughly one signature in sixteen.
  const bytes = new Uint8Array([251, 255, 190, 0, 1, 2]);
  const out = b64url(bytes);
  assert.equal(/[+/=]/.test(out), false, out);
  assert.equal(
    Buffer.from(out.replace(/-/g, '+').replace(/_/g, '/'), 'base64').equals(Buffer.from(bytes)),
    true,
    'must still round trip',
  );
});

/* ---- signing end to end -------------------------------------------------------- */

test('a signature over the canonical string verifies with the public key', async () => {
  const sodium = require('libsodium-wrappers');
  await sodium.ready;
  const { signDetached, generateUnsaved } = loadTs('src/main/deviceIdentity.ts');

  const pair = await generateUnsaved();
  const canonical = canonicalString({
    method: 'POST', path: '/enrol', nonce: NONCE, rawBody: '{"code":"X"}',
  });
  const sig = await signDetached(canonical, pair.privateKey);

  assert.equal(
    sodium.crypto_sign_verify_detached(
      sig, new Uint8Array(Buffer.from(canonical, 'utf8')), pair.publicKey,
    ),
    true,
  );

  // Negative control: the same signature must NOT verify against a canonical
  // string that differs by one line. Without this, the check above passes even
  // if `canonicalString` returned a constant.
  const tampered = canonicalString({
    method: 'POST', path: '/enrol', nonce: 'a-different-nonce', rawBody: '{"code":"X"}',
  });
  assert.equal(
    sodium.crypto_sign_verify_detached(
      sig, new Uint8Array(Buffer.from(tampered, 'utf8')), pair.publicKey,
    ),
    false,
  );
});

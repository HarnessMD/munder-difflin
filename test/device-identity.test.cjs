'use strict';

/**
 * Device identity: the real keypair behind D3.
 *
 * Every assertion here has a NEGATIVE CONTROL next to it. A crypto test that
 * only ever checks the happy path passes just as well when the verification it
 * claims to exercise has been deleted, which is the failure this file is
 * written to avoid.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

/* ---- electron stub --------------------------------------------------------
   safeStorage is faked with a REVERSIBLE MARKER, not with identity. If the
   module ever forgot to encrypt, the stored bytes would not carry the marker
   and `stores the secret key encrypted, never in plaintext` would fail. */

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-identity-'));
let encryptionAvailable = true;
/** Linux only. `undefined` means the call throws, which is its own hazard. */
let storageBackend = 'gnome_libsecret';
let backendThrows = false;

const realPlatform = process.platform;
function asPlatform(p) {
  Object.defineProperty(process, 'platform', { value: p, configurable: true });
}
function restorePlatform() {
  Object.defineProperty(process, 'platform', { value: realPlatform, configurable: true });
}

const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath,
  filename: electronPath,
  loaded: true,
  exports: {
    app: { getPath: () => userData },
    safeStorage: {
      isEncryptionAvailable: () => encryptionAvailable,
      getSelectedStorageBackend: () => {
        if (backendThrows) throw new Error('not supported on this platform');
        return storageBackend;
      },
      encryptString: (s) => Buffer.from('SEALED:' + s, 'utf8'),
      decryptString: (b) => {
        const s = Buffer.from(b).toString('utf8');
        if (!s.startsWith('SEALED:')) throw new Error('not encrypted by this store');
        return s.slice('SEALED:'.length);
      }
    }
  }
};

const id = loadTs('src/main/deviceIdentity.ts');

const identityFile = () => path.join(userData, 'teams', 'device-identity.json');
function reset() {
  encryptionAvailable = true;
  storageBackend = 'gnome_libsecret';
  backendThrows = false;
  restorePlatform();
  id.forgetIdentity();
}

/* ---- the solo path -------------------------------------------------------- */

test('hasIdentity is false on a fresh machine and creates nothing', () => {
  reset();
  assert.equal(id.hasIdentity(), false);
  // The highest-consequence rule in the dispatch: a solo install must not even
  // acquire a file, let alone a key.
  assert.equal(fs.existsSync(identityFile()), false);
});

test('hasIdentity is true only after an identity actually exists', async () => {
  reset();
  assert.equal(id.hasIdentity(), false);
  await id.getOrCreateIdentity();
  assert.equal(id.hasIdentity(), true);
});

/* ---- generation and persistence ------------------------------------------- */

test('generates one keypair and returns the same one on the next call', async () => {
  reset();
  const first = await id.getOrCreateIdentity();
  const second = await id.getOrCreateIdentity();
  assert.equal(first.publicKey, second.publicKey);
  assert.equal(first.fingerprint, second.fingerprint);

  // Negative control: after forgetting, decision 06 says a NEW machine gets a
  // NEW key. If this came back equal, the "same one" assertion above would be
  // vacuous.
  id.forgetIdentity();
  const third = await id.getOrCreateIdentity();
  assert.notEqual(third.publicKey, first.publicKey);
});

test('stores the secret key encrypted, never in plaintext', async () => {
  reset();
  await id.getOrCreateIdentity();
  const raw = fs.readFileSync(identityFile(), 'utf8');
  const blob = JSON.parse(raw);

  const sk = Buffer.from(blob.sk, 'base64').toString('utf8');
  assert.ok(sk.startsWith('SEALED:'), 'secret key was not put through safeStorage');

  // The decrypted key must not appear anywhere in the file as written.
  const plaintextKey = sk.slice('SEALED:'.length);
  assert.equal(raw.includes(plaintextKey), false, 'plaintext secret key is present on disk');
});

test('the identity file is written 0600', async () => {
  reset();
  await id.getOrCreateIdentity();
  const mode = fs.statSync(identityFile()).mode & 0o777;
  assert.equal(mode, 0o600, `expected 0600, got ${mode.toString(8)}`);
});

test('refuses to generate a key when the OS cannot encrypt it', async () => {
  reset();
  encryptionAvailable = false;
  await assert.rejects(() => id.getOrCreateIdentity(), /unavailable/i);
  // Fail CLOSED: nothing written at all, not even a partial file.
  assert.equal(fs.existsSync(identityFile()), false);
});

/* ---- fingerprint ----------------------------------------------------------- */

test('fingerprint matches the shape the screens already draw', async () => {
  reset();
  const me = await id.getOrCreateIdentity();
  // mockTeam.ts: `4A7F 2C19 88BE 03D5 F16A 9C42`
  assert.match(me.fingerprint, /^[0-9A-F]{4}( [0-9A-F]{4}){5}$/);
  assert.equal(me.fingerprint.replace(/ /g, '').length, 24, '12 bytes of digest');
});

test('fingerprint is a function of the key, and a different key differs', () => {
  const a = Buffer.alloc(32, 1).toString('base64');
  const b = Buffer.alloc(32, 2).toString('base64');
  assert.equal(id.fingerprintFor(a), id.fingerprintFor(a));
  assert.notEqual(id.fingerprintFor(a), id.fingerprintFor(b));
});

/* ---- sealing and opening ---------------------------------------------------- */

/** A second machine, so "per recipient device" can actually be tested. */
async function otherDevice() {
  const sodium = require('libsodium-wrappers');
  await sodium.ready;
  const pair = sodium.crypto_sign_keypair();
  return {
    pk: Buffer.from(pair.publicKey).toString('base64'),
    sk: pair.privateKey,
    sodium
  };
}

test('a sealed envelope round trips and carries nothing readable', async () => {
  reset();
  const me = await id.getOrCreateIdentity();
  const secret = 'Two gaps off the scale, both in the footer.';

  const env = await id.sealTo(me.publicKey, secret);

  // What the relay holds must not contain the message.
  assert.equal(env.ciphertext.includes(Buffer.from(secret).toString('base64')), false);
  const asText = Buffer.from(env.ciphertext, 'base64').toString('utf8');
  assert.equal(asText.includes(secret), false, 'plaintext survived into the ciphertext');

  const opened = await id.openSealed(env, me.publicKey);
  assert.equal(opened, secret);
});

test('refuses an envelope whose sender key is not the pinned one', async () => {
  reset();
  const me = await id.getOrCreateIdentity();
  const other = await otherDevice();

  const env = await id.sealTo(me.publicKey, 'hello');
  // The message claims to be from me; the recipient has pinned someone else.
  //
  // The regex has to DISCRIMINATE. Both failure messages here contain the word
  // "pinned", so matching /pinned/ passed even with the sender check deleted —
  // the signature check threw instead and the test could not tell the two
  // apart. Match the phrase that only the sender-mismatch path can produce.
  await assert.rejects(
    () => id.openSealed(env, other.pk),
    /does not match the pinned key/
  );

  // Positive control: the identical envelope opens against the right key, so
  // the rejection above is the check firing and not an unrelated failure.
  assert.equal(await id.openSealed(env, me.publicKey), 'hello');
});

test('a tampered ciphertext does not open', async () => {
  reset();
  const me = await id.getOrCreateIdentity();
  const env = await id.sealTo(me.publicKey, 'the 1440 pass');

  const bytes = Buffer.from(env.ciphertext, 'base64');
  bytes[bytes.length - 1] ^= 0xff;
  const tampered = { ...env, ciphertext: bytes.toString('base64') };

  await assert.rejects(() => id.openSealed(tampered, me.publicKey));
  assert.equal(await id.openSealed(env, me.publicKey), 'the 1440 pass');
});

test('a forged signature inside a well formed box is rejected', async () => {
  reset();
  const me = await id.getOrCreateIdentity();
  const other = await otherDevice();
  const s = other.sodium;

  // Someone who is NOT the pinned sender builds a valid sealed box to me and
  // signs it with their own key, then labels it as coming from the pinned one.
  const message = Buffer.from('transfer the seats to me', 'utf8');
  const sig = s.crypto_sign_detached(new Uint8Array(message), other.sk);
  const payload = Buffer.from(JSON.stringify({
    m: message.toString('base64'),
    sig: Buffer.from(sig).toString('base64')
  }), 'utf8');
  const myCurve = s.crypto_sign_ed25519_pk_to_curve25519(
    new Uint8Array(Buffer.from(me.publicKey, 'base64'))
  );
  const forged = {
    ciphertext: Buffer.from(s.crypto_box_seal(new Uint8Array(payload), myCurve)).toString('base64'),
    senderPublicKey: me.publicKey
  };

  // The box opens. The signature is what catches it — which is the whole point
  // of signing separately, because a sealed box is anonymous by design.
  await assert.rejects(() => id.openSealed(forged, me.publicKey), /signature/i);
});

test('forgetIdentity leaves nothing behind', async () => {
  reset();
  await id.getOrCreateIdentity();
  assert.equal(fs.existsSync(identityFile()), true);
  id.forgetIdentity();
  assert.equal(fs.existsSync(identityFile()), false);
  assert.equal(id.hasIdentity(), false);
});

/* ---- the Linux hazard -------------------------------------------------------
   `isEncryptionAvailable()` returns TRUE on Linux even when the backend is
   `basic_text`, which encrypts with a hardcoded key. A fail-closed check built
   only on that call sails past it and writes a key we would then call
   encrypted. These tests exist because the API lies on exactly one platform. */

test('refuses basic_text on Linux, where the OS says yes and means obfuscation', async () => {
  reset();
  asPlatform('linux');
  storageBackend = 'basic_text';
  encryptionAvailable = true; // this is the point: the OS reports it CAN encrypt

  await assert.rejects(() => id.getOrCreateIdentity(), /hardcoded key/);
  assert.equal(fs.existsSync(identityFile()), false);

  // Positive control: the identical call on a real keyring succeeds, so the
  // rejection is the backend check firing and not Linux being refused wholesale.
  storageBackend = 'gnome_libsecret';
  const me = await id.getOrCreateIdentity();
  assert.match(me.fingerprint, /^[0-9A-F]{4}( [0-9A-F]{4}){5}$/);
});

test('refuses on Linux when the backend cannot be determined at all', async () => {
  reset();
  asPlatform('linux');
  backendThrows = true;
  // When the honest state is unknown, take the option that claims less.
  await assert.rejects(() => id.getOrCreateIdentity(), /could not determine/);
  assert.equal(fs.existsSync(identityFile()), false);
});

test('does not consult the backend off Linux, where the call does not apply', async () => {
  reset();
  asPlatform('darwin');
  backendThrows = true; // would reject if it were consulted
  const me = await id.getOrCreateIdentity();
  assert.equal(id.hasIdentity(), true);
  assert.ok(me.publicKey.length > 0);
});

test('a key already on disk stays sealed if the backend degrades to basic_text', async () => {
  reset();
  asPlatform('linux');
  const me = await id.getOrCreateIdentity();
  assert.equal(id.hasIdentity(), true);

  storageBackend = 'basic_text';
  // The read path holds the same standard as the write path: it will not hand
  // back a secret key it cannot say was protected.
  await assert.rejects(() => id.sealTo(me.publicKey, 'x'), /no device identity/);
});

test.after(() => {
  restorePlatform();
  fs.rmSync(userData, { recursive: true, force: true });
});

/**
 * DEVICE IDENTITY — the real keypair behind D3, replacing three setTimeout rows.
 *
 * One machine, one Ed25519 keypair, generated locally. The private key never
 * leaves this process: it is encrypted at rest with Electron `safeStorage`
 * (Keychain on macOS, DPAPI on Windows, libsecret on Linux) and is never sent
 * over IPC, never logged, and never written in plaintext.
 *
 * Nothing here is hand-rolled. Every primitive is libsodium used the way its
 * documentation says to use it:
 *   identity     Ed25519 keypair, per DEVICE not per person
 *   fingerprint  SHA-256 of the public key, first 12 bytes, groups of 4 hex
 *   encryption   X25519 + XChaCha20-Poly1305 sealed box, per recipient device
 *   authenticity signed by the sender, verified by the RECIPIENT, not the relay
 *
 * WHY SIGN-THEN-SEAL. A sealed box is anonymous by design: it proves nothing
 * about who sent it. So the signature is computed over the plaintext and sealed
 * along with it. The recipient opens the box and then verifies. The relay holds
 * only ciphertext and therefore cannot verify anything, which is the property we
 * want — a compromised relay can drop and delay messages, it cannot forge one.
 *
 * THE SOLO PATH IS NEVER GATED. Nothing in this file runs at boot. An install
 * with no organisation never calls `getOrCreateIdentity`, so it never generates
 * a key, never creates a file, and never prompts for anything. `hasIdentity()`
 * is the only function safe to call unconditionally, and it answers from the
 * filesystem without touching safeStorage or libsodium.
 */

import { app, safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import _sodium from 'libsodium-wrappers';

export interface DeviceIdentity {
  /** Base64 Ed25519 public key. Safe to publish — this is what the roster shows. */
  publicKey: string;
  /** `4A7F 2C19 88BE 03D5 F16A 9C42` — the safety number a human compares. */
  fingerprint: string;
  /** Stable local id for this device row. Derived, not random, so it survives a
   *  re-read without being written down twice. */
  deviceId: string;
}

/** What actually goes on the wire for one recipient device. */
export interface SealedEnvelope {
  /** Base64 sealed box. Opaque to the relay. */
  ciphertext: string;
  /** Base64 Ed25519 public key of the sender, so the recipient knows which key
   *  to verify against. Not trusted on its own — see `openSealed`. */
  senderPublicKey: string;
}

type Sodium = typeof _sodium;
let sodium: Sodium | null = null;

/** libsodium is WASM and needs one await before first use. Idempotent. */
export async function initCrypto(): Promise<void> {
  if (sodium) return;
  await _sodium.ready;
  sodium = _sodium;
}

function need(): Sodium {
  if (!sodium) {
    throw new Error('deviceIdentity: call initCrypto() before using crypto');
  }
  return sodium;
}

/* ---- storage --------------------------------------------------------------
   Same shape as the integrations secret store: a JSON blob at 0600 holding
   base64 of a safeStorage ciphertext, and a hard refusal to write when the OS
   has no encryption to offer. */

function identityPath(): string {
  return join(app.getPath('userData'), 'teams', 'device-identity.json');
}

interface StoredIdentity {
  /** safeStorage ciphertext (base64) of the base64 Ed25519 secret key. */
  sk: string;
  /** Base64 Ed25519 public key. Not secret, stored plainly so `hasIdentity`
   *  and the roster can read it without decrypting anything. */
  pk: string;
  createdAt: string;
}

/**
 * Whether the OS will really encrypt this, as opposed to merely saying it will.
 *
 * `isEncryptionAvailable()` IS NOT ENOUGH ON LINUX. It returns true even when
 * the selected backend is `basic_text`, which encrypts with a HARDCODED KEY.
 * That is obfuscation, not encryption: anyone who can read the file can read
 * the key. A fail-closed check built only on `isEncryptionAvailable()` sails
 * straight past it and writes a private key we would then describe as
 * encrypted, which is worse than refusing.
 *
 * `getSelectedStorageBackend()` is Linux-only, so it is only consulted there.
 * If it cannot be read at all we refuse rather than assume: when the honest
 * state is unknown, take the option that claims less.
 */
export type IdentityFailure = 'keyring_unavailable' | 'keyring_not_encrypting';

function encryptionIsReal(): { ok: true } | { ok: false; code: IdentityFailure; reason: string } {
  if (!safeStorage.isEncryptionAvailable()) {
    return { ok: false, code: 'keyring_unavailable', reason: 'OS secret encryption is unavailable' };
  }
  if (process.platform === 'linux') {
    let backend: string | undefined;
    try {
      backend = safeStorage.getSelectedStorageBackend?.();
    } catch {
      backend = undefined;
    }
    if (!backend) {
      return {
        ok: false, code: 'keyring_unavailable',
        reason: 'could not determine which keyring backend is in use'
      };
    }
    if (backend === 'basic_text') {
      return {
        ok: false, code: 'keyring_not_encrypting',
        reason: 'the only keyring available encrypts with a hardcoded key, which is obfuscation and not encryption'
      };
    }
  }
  return { ok: true };
}

/**
 * The same fail-closed check `saveIdentity` applies, exposed so enrolment can
 * run it BEFORE calling the relay. Learning after `/enrol` succeeded that the
 * key cannot be stored would leave a device row on the server with no key on
 * this machine to use it. Side-effect free; safe on the solo path.
 */
export function canStoreIdentity(): { ok: true } | { ok: false; code: IdentityFailure; reason: string } {
  return encryptionIsReal();
}

function readStored(): StoredIdentity | null {
  const p = identityPath();
  if (!existsSync(p)) return null;
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8'));
    if (parsed && typeof parsed.sk === 'string' && typeof parsed.pk === 'string') {
      return parsed as StoredIdentity;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStored(blob: StoredIdentity): void {
  const p = identityPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(blob, null, 2), { encoding: 'utf8', mode: 0o600 });
}

/**
 * Whether this machine has already enrolled. Cheap and side-effect free: it
 * does not decrypt, does not load libsodium, and does not create anything.
 * This is the ONLY function a solo install should ever reach.
 */
export function hasIdentity(): boolean {
  return readStored() !== null;
}

/* ---- fingerprint ---------------------------------------------------------- */

/**
 * SHA-256 of the public key, first 12 bytes, uppercase hex in groups of four.
 * 96 bits, which is enough for a safety number a human reads aloud. The shape
 * matches what the screens already draw in mockTeam.ts.
 */
export function fingerprintFor(publicKeyB64: string): string {
  const digest = createHash('sha256').update(Buffer.from(publicKeyB64, 'base64')).digest();
  return (digest.subarray(0, 12).toString('hex').toUpperCase().match(/.{4}/g) ?? []).join(' ');
}

/* ---- identity -------------------------------------------------------------- */

function toIdentity(pk: string): DeviceIdentity {
  const fingerprint = fingerprintFor(pk);
  return { publicKey: pk, fingerprint, deviceId: fingerprint.replace(/ /g, '').toLowerCase() };
}

/**
 * Read this device's identity, generating one on first call.
 *
 * NEVER call this at boot or anywhere on the solo path — generating a key is
 * what makes a machine a team machine. It belongs behind enrolment (D3) only.
 *
 * Fails closed. If the OS cannot encrypt, no key is generated and nothing is
 * written, because the alternative is a private key sitting in plaintext in
 * userData.
 */
export async function getOrCreateIdentity(): Promise<DeviceIdentity> {
  const existing = readStored();
  if (existing) return toIdentity(existing.pk);

  const usable = encryptionIsReal();
  if (!usable.ok) {
    // The code travels with the message so the renderer can pick real copy
    // without matching on prose. A refusal that cannot explain itself gets
    // worked around, filed as a bug, or "fixed" by deleting the gate.
    const err = new Error(
      `${usable.reason}; refusing to generate a device key that could only be stored unprotected`
    ) as Error & { code?: IdentityFailure };
    err.code = usable.code;
    throw err;
  }

  await initCrypto();
  const s = need();
  const pair = s.crypto_sign_keypair();
  const pk = Buffer.from(pair.publicKey).toString('base64');
  const skB64 = Buffer.from(pair.privateKey).toString('base64');

  writeStored({
    sk: safeStorage.encryptString(skB64).toString('base64'),
    pk,
    createdAt: new Date().toISOString()
  });

  return toIdentity(pk);
}

/**
 * The Ed25519 secret key. MAIN-INTERNAL ONLY — never expose this over IPC and
 * never return it to the renderer. Returns null when absent or undecryptable.
 */
function secretKey(): Uint8Array | null {
  const stored = readStored();
  if (!stored) return null;
  try {
    // THIS CHECK LOOKS REDUNDANT AND IS NOT. Work through the two cases.
    //
    // Written under a real keyring, backend later degrades to `basic_text`:
    // `decryptString` fails anyway on the wrong key material, so this line
    // changes nothing.
    //
    // Written under `basic_text` BEFORE the write gate above existed: it
    // decrypts perfectly, gets used forever, and nothing ever notices. That
    // case is the only one this line catches, and it is the reason it is here.
    //
    // The population is ZERO TODAY because this code has never shipped, so it
    // is a migration guard for machines that do not exist yet. It will not stay
    // empty. Do not delete this as dead weight.
    if (!encryptionIsReal().ok) return null;
    const b64 = safeStorage.decryptString(Buffer.from(stored.sk, 'base64'));
    return new Uint8Array(Buffer.from(b64, 'base64'));
  } catch {
    return null;
  }
}

/**
 * Forget this machine's identity. D14 (removed from the organisation) and a
 * sign-out both land here. A new key on next enrolment is deliberate: decision
 * 06 says a new machine gets a new keypair and no history, and D13 already
 * exists to explain the resulting fingerprint change to teammates.
 */
export function forgetIdentity(): void {
  const p = identityPath();
  if (existsSync(p)) rmSync(p, { force: true });
}

/* ---- sealing --------------------------------------------------------------- */

/**
 * Encrypt one message for ONE recipient device.
 *
 * A person with three machines gets three envelopes: a sealed box is bound to a
 * single recipient key, and that is the property that makes device-level
 * identity real rather than decorative.
 */
export async function sealTo(
  recipientPublicKeyB64: string,
  plaintext: string
): Promise<SealedEnvelope> {
  await initCrypto();
  const s = need();

  const sk = secretKey();
  if (!sk) throw new Error('no device identity on this machine');
  const stored = readStored()!;

  const message = Buffer.from(plaintext, 'utf8');
  // Sign the PLAINTEXT, then seal both. The recipient verifies after opening;
  // the relay, holding only ciphertext, cannot verify and is not asked to.
  const signature = s.crypto_sign_detached(new Uint8Array(message), sk);

  const payload = Buffer.from(
    JSON.stringify({
      m: message.toString('base64'),
      sig: Buffer.from(signature).toString('base64')
    }),
    'utf8'
  );

  // Ed25519 is a signing key; sealed boxes need the X25519 form of it. This
  // conversion is a libsodium primitive, not arithmetic of ours.
  const recipientCurve = s.crypto_sign_ed25519_pk_to_curve25519(
    new Uint8Array(Buffer.from(recipientPublicKeyB64, 'base64'))
  );

  return {
    ciphertext: Buffer.from(s.crypto_box_seal(new Uint8Array(payload), recipientCurve)).toString('base64'),
    senderPublicKey: stored.pk
  };
}

/**
 * Open an envelope addressed to this device and verify who wrote it.
 *
 * `expectedSenderPublicKey` is the key this device has PINNED for that
 * teammate. The envelope's own `senderPublicKey` is untrusted input: if the two
 * disagree we refuse rather than trusting the message's own claim about itself.
 * That refusal is what D13 renders.
 */
export async function openSealed(
  envelope: SealedEnvelope,
  expectedSenderPublicKey: string
): Promise<string> {
  await initCrypto();
  const s = need();

  if (envelope.senderPublicKey !== expectedSenderPublicKey) {
    throw new Error('sender key does not match the pinned key for this teammate');
  }

  const sk = secretKey();
  if (!sk) throw new Error('no device identity on this machine');

  const myCurvePk = s.crypto_sign_ed25519_pk_to_curve25519(
    new Uint8Array(Buffer.from(readStored()!.pk, 'base64'))
  );
  const myCurveSk = s.crypto_sign_ed25519_sk_to_curve25519(sk);

  const opened = s.crypto_box_seal_open(
    new Uint8Array(Buffer.from(envelope.ciphertext, 'base64')),
    myCurvePk,
    myCurveSk
  );

  const parsed = JSON.parse(Buffer.from(opened).toString('utf8')) as { m: string; sig: string };
  const message = new Uint8Array(Buffer.from(parsed.m, 'base64'));
  const ok = s.crypto_sign_verify_detached(
    new Uint8Array(Buffer.from(parsed.sig, 'base64')),
    message,
    new Uint8Array(Buffer.from(expectedSenderPublicKey, 'base64'))
  );
  if (!ok) throw new Error('signature does not verify against the pinned sender key');

  return Buffer.from(message).toString('utf8');
}

/* ---- what the relay client needs -------------------------------------------- */

/**
 * This device's public identity, or null if this machine has not enrolled.
 *
 * Cheap and side-effect free, like `hasIdentity`: it reads the stored public
 * half and derives, and it never decrypts. Safe on the solo path.
 */
export function deviceIdentity(): DeviceIdentity | null {
  const stored = readStored();
  return stored ? toIdentity(stored.pk) : null;
}

/**
 * Sign a canonical string for the relay.
 *
 * `withSecret` exists for ENROLMENT ONLY: that request is signed by the key
 * being registered, which is how the relay learns the caller holds the private
 * half, and at that moment nothing is stored yet.
 *
 * MAIN-INTERNAL. The secret key never crosses IPC and this must never be
 * exposed over one — a renderer that can ask for a signature over an arbitrary
 * string holds the credential just as surely as one holding the key.
 */
export async function signDetached(
  canonical: string,
  withSecret?: Uint8Array
): Promise<Uint8Array | null> {
  await initCrypto();
  const s = need();
  const sk = withSecret ?? secretKey();
  if (!sk) return null;
  return s.crypto_sign_detached(new Uint8Array(Buffer.from(canonical, 'utf8')), sk);
}

/**
 * Generate a keypair WITHOUT persisting it, for the enrolment round trip.
 *
 * Enrolment signs with the new key and only then learns whether the relay
 * accepted it. Persisting first would leave a key on a machine whose enrolment
 * was refused — a device row that exists locally and nowhere else, which then
 * reads as "enrolled" to `hasIdentity` forever.
 */
export async function generateUnsaved(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
  await initCrypto();
  const s = need();
  const pair = s.crypto_sign_keypair();
  return { publicKey: pair.publicKey, privateKey: pair.privateKey };
}

/**
 * Persist a keypair that enrolment has already ACCEPTED. Same fail-closed rules
 * as `getOrCreateIdentity`: if the OS cannot really encrypt, nothing is written.
 */
export function saveIdentity(publicKey: Uint8Array, privateKey: Uint8Array): DeviceIdentity {
  const usable = encryptionIsReal();
  if (!usable.ok) {
    const err = new Error(
      `${usable.reason}; refusing to store a device key that could only be kept unprotected`
    ) as Error & { code?: IdentityFailure };
    err.code = usable.code;
    throw err;
  }
  const pk = Buffer.from(publicKey).toString('base64');
  writeStored({
    sk: safeStorage.encryptString(Buffer.from(privateKey).toString('base64')).toString('base64'),
    pk,
    createdAt: new Date().toISOString()
  });
  return toIdentity(pk);
}

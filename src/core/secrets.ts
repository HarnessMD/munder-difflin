/**
 * THE CIPHER BEHIND THE SECRET STORE.
 *
 * Integration secrets are kept encrypted at rest. In the app the cipher is
 * Electron's safeStorage (the keychain on macOS, DPAPI on Windows, libsecret
 * on Linux), which the app registers at start (src/main/electronPaths.ts).
 * `createKeyCipher` is the cipher of the sealed store (src/core/sealedSecrets.ts).
 *
 * With no cipher registered the store fails closed, as it does when the OS
 * has no encryption: nothing is written in plain text, nothing is read.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export interface SecretCipher {
  /** Whether secrets can be encrypted right now. False means the store
   *  refuses to save and answers no secret. */
  available(): boolean;
  encrypt(plaintext: string): Buffer;
  decrypt(ciphertext: Buffer): string;
  /** Set by `createKeyCipher` only: a cipher that checks every byte it reads
   *  (AES GCM under a key nothing else is given). The OS keychain is not one. */
  readonly sealed?: true;
}

let registered: SecretCipher | null = null;

/** Called once by the host at start. */
export function setSecretCipher(cipher: SecretCipher | null): void {
  registered = cipher;
}

const NONE: SecretCipher = {
  available: () => false,
  encrypt: () => { throw new Error('no secret cipher is registered'); },
  decrypt: () => { throw new Error('no secret cipher is registered'); }
};

export function secretCipher(): SecretCipher {
  return registered ?? NONE;
}

const VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * A cipher over one 32 byte key: AES 256 GCM, a fresh 12 byte nonce per
 * secret, the tag checked on every read. Layout: version (1) | nonce (12) |
 * tag (16) | ciphertext. A wrong key, a cut blob or a changed byte throws on
 * decrypt, which the store answers as "no secret". The key is never written
 * by this module; where it lives is the host's business.
 */
export function createKeyCipher(key: Buffer): SecretCipher {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('the secret key must be 32 bytes');
  const k = Buffer.from(key);
  return {
    sealed: true,
    available: () => true,
    encrypt(plaintext) {
      const iv = randomBytes(IV_BYTES);
      const c = createCipheriv('aes-256-gcm', k, iv);
      const body = Buffer.concat([c.update(plaintext, 'utf8'), c.final()]);
      return Buffer.concat([Buffer.from([VERSION]), iv, c.getAuthTag(), body]);
    },
    decrypt(blob) {
      if (blob.length < 1 + IV_BYTES + TAG_BYTES || blob[0] !== VERSION) throw new Error('not a secret this cipher wrote');
      const iv = blob.subarray(1, 1 + IV_BYTES);
      const tag = blob.subarray(1 + IV_BYTES, 1 + IV_BYTES + TAG_BYTES);
      const d = createDecipheriv('aes-256-gcm', k, iv);
      d.setAuthTag(tag);
      return Buffer.concat([d.update(blob.subarray(1 + IV_BYTES + TAG_BYTES)), d.final()]).toString('utf8');
    }
  };
}

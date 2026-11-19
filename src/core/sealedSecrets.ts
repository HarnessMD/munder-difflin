/**
 * SEALED SECRETS: a secret is kept together with its own name and with what
 * it may be used for, under a key that is only ever used as a key.
 *
 * Why. The app's secret file is a plain file an agent on the laptop can
 * write. While each value was a bare keychain ciphertext, whoever asked for a
 * name got whatever ciphertext sat under it, and a ciphertext says nothing
 * about what it is for. So a value could be moved under another name, or sent
 * to another address, and the app handed it over.
 *
 * What holds here:
 *   - An envelope is AES 256 GCM under the store key (`createKeyCipher`), so
 *     it cannot be made, cut or joined without that key.
 *   - It carries its name (`r`) and its use (`u`). `openSealed` answers the
 *     secret only for that name and that use. A value moved under another
 *     name, asked for another address, or asked for an agent's environment
 *     when it was saved for the broker, reads as no secret.
 *   - A held use (`held`, `held-env`) can be opened by nobody: it waits for
 *     the person's yes, which seals it again as `http` or `env`. Only a key
 *     the person saves for an address that may not be theirs is held
 *     (integrations.ts, setIntegrationSecret); the move holds nothing.
 *
 * THE MOVE is the one moment the app decrypts what an agent may have
 * written: the old bare keychain ciphertexts. No file can mark it done (the
 * agent can delete any file), so it is safe every time it runs:
 *   - `movable`: only a plain text that is printable all the way is moved,
 *     spaces included. Any cut and join of keychain ciphertexts leaves at least
 *     one block of 16 random bytes, which is printable about once in eight
 *     million tries.
 *   - `encodeStoreKey`: the store key's own plain text has a byte below 0x20
 *     in every 16 byte block, so whole or in pieces it is never movable.
 *   - `sharesRun`: nothing that shares 16 characters with one of the app's
 *     own keys is moved.
 *   - `decideMove`: an older version's keys do not go away. Each key is
 *     ready at once for what it was used
 *     for, as the older version used it: an agent key for agents, an
 *     integration's key for the address its record has at that moment.
 *
 * Import free of Electron and of the file system: the host passes the cipher
 * and the facts.
 */
import { createKeyCipher, type SecretCipher } from './secrets';

/** What a secret may be used for. */
export type SecretUse =
  /** Sent by the broker, or the Test call, to this base address and no other. */
  | { kind: 'http'; url: string }
  /** Put into an agent's environment at its start (and the app's own call to that provider). */
  | { kind: 'env' }
  /** Read by the app itself, never sent on an agent's word. */
  | { kind: 'app' }
  /** Waiting for the person's yes; becomes `http` for this address. */
  | { kind: 'held'; url: string }
  /** Waiting for the person's yes; becomes `env`. */
  | { kind: 'held-env' };

const ENVELOPE_PREFIX = 's1:';
export const MOVABLE_MAX_BYTES = 4096;
const RUN = 16;

/** The longest secret a store keeps, in characters. One number, so a save
 *  can refuse a longer one before it writes anything. */
export const MAX_SECRET_CHARS = 64 * 1024;
export const SECRET_TOO_LONG = 'a secret must not be longer than 64 KB';

/**
 * The address a secret is tied to: scheme, host, port and path, with nothing
 * else. `null` for anything that is not a plain http or https address (a
 * user name in it, another scheme, text that does not parse). The host comes
 * out lower case and in its xn-- form, so a lookalike never equals the real one.
 */
export function baseAddress(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return null;
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username !== '' || u.password !== '' || u.hostname === '') return null;
  const path = u.pathname.replace(/\/+$/, '');
  return `${u.origin}${path}`;
}

function sameUse(sealed: SecretUse, asked: SecretUse): boolean {
  if (sealed.kind !== asked.kind) return false;
  if (sealed.kind === 'http' || sealed.kind === 'held') {
    const want = baseAddress((asked as { url: string }).url);
    return want !== null && want === sealed.url;
  }
  return true;
}

function cleanUse(u: unknown): SecretUse | null {
  if (!u || typeof u !== 'object') return null;
  const kind = (u as { kind?: unknown }).kind;
  if (kind === 'env' || kind === 'app' || kind === 'held-env') return { kind };
  if (kind === 'http' || kind === 'held') {
    const url = baseAddress((u as { url?: unknown }).url);
    return url === null ? null : { kind, url };
  }
  return null;
}

export const isEnvelope = (blob: unknown): blob is string => typeof blob === 'string' && blob.startsWith(ENVELOPE_PREFIX);

/** Seal a value under its name and its use. Throws when the use names no address. */
export function sealSecret(store: SecretCipher, ref: string, use: SecretUse, value: string): string {
  const u = cleanUse(use);
  if (u === null) throw new Error('a secret must be sealed for a plain http or https address');
  return ENVELOPE_PREFIX + store.encrypt(JSON.stringify({ r: ref, u, v: value })).toString('base64');
}

/** What an envelope holds, whatever it is for. Main only: for the person's
 *  yes and for the notice, never for a caller that sends or hands over. */
export function readSealed(store: SecretCipher, ref: string, blob: unknown): { use: SecretUse; value: string } | undefined {
  if (!isEnvelope(blob)) return undefined;
  try {
    const j = JSON.parse(store.decrypt(Buffer.from(blob.slice(ENVELOPE_PREFIX.length), 'base64'))) as { r?: unknown; u?: unknown; v?: unknown };
    const use = cleanUse(j?.u);
    if (!j || j.r !== ref || use === null || typeof j.v !== 'string') return undefined;
    return { use, value: j.v };
  } catch {
    return undefined;
  }
}

/**
 * The secret, for this name and this use only. A held secret is never
 * answered: asking with a held use is refused like any other mismatch.
 */
export function openSealed(store: SecretCipher, ref: string, asked: SecretUse, blob: unknown): string | undefined {
  if (asked.kind === 'held' || asked.kind === 'held-env') return undefined;
  const got = readSealed(store, ref, blob);
  return got && sameUse(got.use, asked) ? got.value : undefined;
}

// ─── The store key ───────────────────────────────────────────────────────────

const KEY_GROUP = 8;
// Above 0x10 on purpose: the keychain cipher pads with bytes 0x01 to 0x10, so a
// mark in that range at the end of a block would read as padding, and a
// ciphertext cut off after that block would decrypt to clean hex.
const KEY_MARK = '\u001f';

/**
 * The store key as the text that is handed to the keychain cipher: hex, with
 * a 0x1F after every eight characters. Every 16 byte block of it therefore
 * holds a byte below 0x20, so no piece of it is `movable`.
 */
export function encodeStoreKey(key: Buffer): string {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('the store key must be 32 bytes');
  const hex = key.toString('hex');
  let out = '';
  for (let i = 0; i < hex.length; i += KEY_GROUP) out += hex.slice(i, i + KEY_GROUP) + KEY_MARK;
  return out;
}

/** The key back, or `null` for anything `encodeStoreKey` did not write. */
export function decodeStoreKey(text: unknown): Buffer | null {
  if (typeof text !== 'string' || text.length !== 64 + 64 / KEY_GROUP) return null;
  let hex = '';
  for (let i = 0; i < text.length; i += KEY_GROUP + 1) {
    if (text[i + KEY_GROUP] !== KEY_MARK) return null;
    hex += text.slice(i, i + KEY_GROUP);
  }
  return /^[0-9a-f]{64}$/.test(hex) ? Buffer.from(hex, 'hex') : null;
}

/** The cipher envelopes are sealed with. */
export const storeCipher = (key: Buffer): SecretCipher => createKeyCipher(key);

// ─── The move ────────────────────────────────────────────────────────────────

/**
 * The most old entries one file may hold for the move to look at it at all.
 * The printable rule holds per try; a file with a million planted joins would
 * be a million tries in one start. Nobody has hundreds of saved keys.
 */
export const MOVE_MAX_ENTRIES = 200;

/**
 * Whether an old plain text may be moved at all: printable from end to end,
 * spaces included. A Fly token ("FlyV1 fm2_...") and a header value ("Bot
 * ...") have one, and 0.5.8 RCs dropped both. A line break, a tab
 * or any other control character is still refused, and so is the store key's
 * mark (0x1F, encodeStoreKey).
 */
export function movable(plain: unknown): plain is string {
  if (typeof plain !== 'string' || plain.length === 0 || plain.length > MOVABLE_MAX_BYTES) return false;
  for (let i = 0; i < plain.length; i++) {
    const c = plain.charCodeAt(i);
    if (c < 0x20 || c > 0x7e) return false;
  }
  return true;
}

/** Whether two texts share any run of 16 characters. */
export function sharesRun(a: string, b: string, run = RUN): boolean {
  if (a.length < run || b.length < run) return false;
  const seen = new Set<string>();
  for (let i = 0; i + run <= b.length; i++) seen.add(b.slice(i, i + run));
  for (let i = 0; i + run <= a.length; i++) if (seen.has(a.slice(i, i + run))) return true;
  return false;
}

/** Where a name's secret goes, as the host knows it. */
export type SecretSink =
  /** An agent's environment: a provider key, a key by name. */
  | { kind: 'env' }
  /** An integration: the address its record holds now. */
  | { kind: 'http'; recordUrl: string | undefined }
  /** The app's own. */
  | { kind: 'app' }
  /** A name nothing in the app reads. */
  | { kind: 'none' };

export type MoveDecision =
  | { ref: string; action: 'seal'; use: SecretUse }
  | { ref: string; action: 'drop'; reason: 'unreadable' | 'not-printable' | 'app-key' | 'no-use' | 'no-address' };

export interface MoveFacts {
  /** The plain texts of keys the app keeps for itself in its data folder. */
  appKeys: readonly string[];
  sinkOf(ref: string): SecretSink;
}

/**
 * What the move does with one old entry. `plain` is what the keychain cipher
 * answered for it, `undefined` when it could not be read.
 *
 * A key is ready to use at once, with the trust the older version
 * gave it: an agent key goes to agents, an integration's key is sealed for the
 * address its record has at this moment. Nothing is held. From then on the
 * key is tied to that address like any other (a later change of address in
 * the file does not carry it along).
 */
export function decideMove(ref: string, plain: string | undefined, facts: MoveFacts): MoveDecision {
  if (plain === undefined) return { ref, action: 'drop', reason: 'unreadable' };
  if (!movable(plain)) return { ref, action: 'drop', reason: 'not-printable' };
  if (facts.appKeys.some((k) => sharesRun(plain, k))) return { ref, action: 'drop', reason: 'app-key' };
  const sink = facts.sinkOf(ref);
  if (sink.kind === 'none') return { ref, action: 'drop', reason: 'no-use' };
  if (sink.kind === 'app') return { ref, action: 'seal', use: { kind: 'app' } };
  if (sink.kind === 'env') return { ref, action: 'seal', use: { kind: 'env' } };
  const record = baseAddress(sink.recordUrl);
  if (record === null) return { ref, action: 'drop', reason: 'no-address' };
  return { ref, action: 'seal', use: { kind: 'http', url: record } };
}

/** The person's yes: a held envelope sealed again for use. `undefined` when
 *  the envelope is not a held one under this name. */
export function releaseHeld(store: SecretCipher, ref: string, blob: unknown): string | undefined {
  const got = readSealed(store, ref, blob);
  if (!got) return undefined;
  if (got.use.kind === 'held') return sealSecret(store, ref, { kind: 'http', url: got.use.url }, got.value);
  if (got.use.kind === 'held-env') return sealSecret(store, ref, { kind: 'env' }, got.value);
  return undefined;
}

/** A value as the notice shows it: the first four and last four characters
 *  and the length; the length alone under twelve characters. */
export function maskSecret(value: string): { head: string; tail: string; length: number } {
  return value.length < 12
    ? { head: '', tail: '', length: value.length }
    : { head: value.slice(0, 4), tail: value.slice(-4), length: value.length };
}

/**
 * THE SECRET FILE, SEALED (src/core/sealedSecrets.ts holds the rules).
 *
 * Two files in the app's data folder:
 *   - the secret file: a map from a name to an envelope;
 *   - the store key file: the key envelopes are sealed with, itself kept
 *     under the host's cipher (the OS keychain in the app).
 * Both are plain files an agent on the laptop can write, so nothing here
 * trusts what it reads: a value that is not an envelope under this key, for
 * this name and this use, is no secret.
 *
 * The host's cipher is asked to decrypt two things here and nothing else:
 *   - the store key file, whose plain text must have the store key's shape;
 *   - in THE MOVE (`move`, at the app's start), the old bare values and the
 *     app's own key files it compares them with, and the copies of the old
 *     file a 0.5.8 RC start left (`fromOldCopies`). What an old value
 *     turns out to be is never handed to a caller: it is sealed for a use or
 *     dropped, by the rules in sealedSecrets.ts (`decideMove`).
 *
 * A host whose cipher is already a key cipher (`createKeyCipher`, never the
 * app's keychain) has no store key file: its own key seals the envelopes.
 *
 * SUCH A HOST ALSO KEEPS A LAST GOOD COPY (`<secret file>.good`): same folder, same
 * mode, the same bytes as the secret file after each save, so it holds only what
 * that file holds. A secret file that goes bad is set aside, never deleted, and the
 * copy put in its place. With no copy it starts with no keys and `.lost` names
 * what must be entered again. The app, whose cipher is the keychain, keeps no copy.
 *
 * Electron free: the files and the cipher are handed in.
 */
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, closeSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, writeSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { SecretCipher } from '../core/secrets';
import {
  baseAddress, decideMove, decodeStoreKey, encodeStoreKey, isEnvelope, maskSecret, openSealed, readSealed, releaseHeld, sealSecret, storeCipher,
  MAX_SECRET_CHARS, MOVABLE_MAX_BYTES, MOVE_MAX_ENTRIES, SECRET_TOO_LONG,
  type MoveDecision, type SecretSink, type SecretUse
} from '../core/sealedSecrets';

export interface SealedStoreDeps {
  /** The secret file (`integration-secrets.json`). */
  secretsFile: string;
  /** The store key file (`secret-store.key`). */
  keyFile: string;
  /** The host's cipher, asked on every use. */
  cipher: () => SecretCipher;
  /** For a name set aside; injected so a test can fix it. */
  now?: () => number;
  /** The names something still expects a key under, to say what must be entered again when a file is lost. */
  expectedRefs?: () => string[];
}

export type SecretState = 'none' | 'ready' | 'held' | 'unreadable';

export interface HeldSecret {
  ref: string;
  /** A mark of the exact stored value this row was read from. The person's
   *  answer carries it back, and it is applied only to that same value. */
  shown: string;
  /** `held`: waits to be sent to `url`. `held-env`: waits to be handed to agents. */
  kind: 'held' | 'held-env';
  url?: string;
  head: string;
  tail: string;
  length: number;
}

export interface MoveFacts {
  /** The files that hold keys the app keeps for itself in its data folder:
   *  JSON with the key's keychain ciphertext in `sk`. A file that is
   *  not there has no key to protect; one that is there and cannot be read
   *  stops the move. */
  appKeyFiles: readonly string[];
  sinkOf(ref: string): SecretSink;
}

/** A key file is small; a bigger file is not read. */
const APP_KEY_FILE_MAX = 64 * 1024;

/**
 * The files in a data folder that hold a key an app keeps for itself, for
 * `MoveFacts.appKeyFiles`. Other builds of the app can share this data folder,
 * and each keeps its own such files, so they are found by their shape, never
 * by name: a JSON file of at most 64 KB, at the top of the folder or one
 * folder down, whose `sk` is a string. A JSON file that is there but cannot be
 * read is listed too, so the move stops instead of guessing. A file that is
 * not JSON holds no key. Links are not followed.
 */
export function appKeyFilesIn(dataDir: string): string[] {
  const found: string[] = [];
  const look = (dir: string, depth: number): void => {
    let names: string[];
    try { names = readdirSync(dir); } catch { return; }
    for (const name of names) {
      const file = join(dir, name);
      let st: ReturnType<typeof lstatSync>;
      try { st = lstatSync(file); } catch { continue; }
      if (st.isDirectory()) { if (depth === 0) look(file, 1); continue; }
      if (!st.isFile() || !name.endsWith('.json') || st.size > APP_KEY_FILE_MAX) continue;
      let text: string;
      try { text = readFileSync(file, 'utf8'); } catch { found.push(file); continue; }
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { continue; }
      if (parsed && typeof parsed === 'object' && typeof (parsed as { sk?: unknown }).sk === 'string') found.push(file);
    }
  };
  look(dataDir, 0);
  return found;
}

export interface MoveResult {
  /** Why nothing was looked at this time; the old values stay as they are and read as not set. */
  skipped?: 'no-cipher' | 'key-unreadable' | 'app-key-unreadable' | 'too-many' | 'copy-failed' | 'file-unreadable';
  decisions: MoveDecision[];
  /** Names a 0.5.8 RC start held, ready again (only when there are any). */
  released?: string[];
  /** Names a 0.5.8 RC start dropped, kept again from the copy of the old file (only when there are any). */
  recovered?: string[];
}

/** The mark of one stored value: what a row of the notice was read from. */
const shownOf = (blob: string): string => createHash('sha256').update(blob, 'utf8').digest('hex');
/** A fixed text the host's cipher is asked to seal and open again, to tell
 *  "the keychain cannot be asked now" from "this file is not a store key". */
const PROBE = 'md-store-probe';

const KEY_FILE_MAX = 4096;
/** The longest old value the keychain is asked about: base64 of a ciphertext of a movable text, with room. */
const OLD_BLOB_MAX = 2 * MOVABLE_MAX_BYTES;
/** The list of names to set again: a name is short, and the list is as long as a move at most. */
const LOST_REF_MAX = 512;
const LOST_FILE_MAX = 1024 * 1024;
/** In the list of names to set again: keys were lost, and which is not known. */
const NAMES_UNKNOWN = '?';
/** What a name in a damaged file must look like to be taken as one. */
const NAME_IN_DAMAGED_FILE = /"([A-Za-z0-9][A-Za-z0-9:._-]{0,199})"\s*:\s*"/g;

/** Whole or not at all, on the disk before the rename, and read back: what does not read back replaces nothing. */
function writeAtomic(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    const fd = openSync(tmp, 'wx', 0o600);
    try { writeSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
    chmodSync(tmp, 0o600);
    if (readFileSync(tmp, 'utf8') !== text) throw Object.assign(new Error('the file did not read back'), { code: 'EREADBACK' });
    renameSync(tmp, file);
  } catch (e) {
    try { rmSync(tmp, { force: true }); } catch { /* nothing to clean */ }
    throw e;
  }
}

/** The text is a map of names, as the secret file must be. */
function isMapText(text: string): boolean {
  try {
    const parsed: unknown = JSON.parse(text);
    return !!parsed && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

export function createSealedStore(deps: SealedStoreDeps) {
  const now = deps.now ?? Date.now;
  const goodCopy = `${deps.secretsFile}.good`;
  /** Only a host whose own cipher is a key cipher keeps a copy (src/core/secrets.ts). */
  const keepsCopy = (): boolean => deps.cipher().sealed === true;

  // ─── The secret file ───────────────────────────────────────────────────────

  /** The file as a map with no prototype; empty when it is missing or not a map. */
  function readAll(): Record<string, string> {
    if (keepsCopy()) fileIsBad();
    const out: Record<string, string> = Object.create(null);
    try {
      const parsed: unknown = JSON.parse(readFileSync(deps.secretsFile, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return out;
      for (const [ref, value] of Object.entries(parsed as Record<string, unknown>)) if (typeof value === 'string') out[ref] = value;
    } catch { /* no file, or not ours to read */ }
    return out;
  }

  /** Whether a secret file is there that `readAll` cannot take as a map: one
   *  that cannot be read, or does not parse. It reads as empty, so a write
   *  over it would lose every name it holds. */
  function fileIsBad(): boolean {
    let text: string;
    try {
      text = readFileSync(deps.secretsFile, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') return false;
      return !putRight('');
    }
    return isMapText(text) ? false : !putRight(text);
  }

  /** Renamed, never deleted, and never over one set aside before. */
  function setAside(): void {
    const base = `${deps.secretsFile}.unreadable-${now()}`;
    let to = base;
    for (let n = 1; lstatSync(to, { throwIfNoEntry: false })?.isFile(); n++) to = `${base}-${n}`;
    renameSync(deps.secretsFile, to);
  }

  /** An office's secret file has gone bad: set it aside, then the last good copy, or say what is lost. A link stays where it is. False when it could not be done. */
  function putRight(badText: string): boolean {
    if (!keepsCopy()) return false;
    try {
      if (lstatSync(deps.secretsFile).isSymbolicLink()) return false;
      let copy: string | null = null;
      try {
        if (lstatSync(goodCopy).isFile()) copy = readFileSync(goodCopy, 'utf8');
      } catch { /* no copy */ }
      setAside();
      if (copy !== null && isMapText(copy)) {
        writeAtomic(deps.secretsFile, copy);
        return true;
      }
      const names = new Set([...badText.matchAll(NAME_IN_DAMAGED_FILE)].map((m) => m[1]));
      for (const ref of deps.expectedRefs?.() ?? []) names.add(ref);
      writeLost(names.size > 0 ? [...names] : [NAMES_UNKNOWN]);
      return true;
    } catch {
      return false;
    }
  }

  /** Makes the last good copy the same as a secret file that reads. A copy never outlives its file, and one that cannot be brought up to date goes if it holds a name the file does not. */
  function refreshCopy(): void {
    if (!keepsCopy()) return;
    let text: string;
    try {
      text = readFileSync(deps.secretsFile, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') { try { rmSync(goodCopy, { force: true }); } catch { /* looked at again at the next save */ } }
      return;
    }
    if (!isMapText(text)) return;
    let kept: string | null = null;
    try {
      if (lstatSync(goodCopy).isFile()) kept = readFileSync(goodCopy, 'utf8');
    } catch { /* no copy yet */ }
    if (kept === text) return;
    try {
      writeAtomic(goodCopy, text);
    } catch {
      try {
        const held = JSON.parse(text) as Record<string, unknown>;
        if (kept === null || Object.keys(JSON.parse(kept) as Record<string, unknown>).some((ref) => !(ref in held))) rmSync(goodCopy, { force: true });
      } catch { /* looked at again at the next save */ }
    }
  }

  /** Every write goes through here. A secret file that could not be read is
   *  set aside first (renamed, never deleted), as the key file is: a failed
   *  rename throws and nothing is written over it. */
  function writeAll(all: Record<string, string>): void {
    if (fileIsBad()) setAside();
    if (Object.keys(all).length === 0) rmSync(deps.secretsFile, { force: true });
    else writeAtomic(deps.secretsFile, JSON.stringify(all, null, 2));
    refreshCopy();
  }

  // ─── The names the update could not keep ───────────────────────────────────

  // Kept on disk beside the secret file until the person has seen them: the
  // notice names them at every start, not only at the one that dropped them.
  // Names only, never a value. NOT A TRUSTED FILE: it sits where the secret
  // file sits, and whatever can write there can add a name to the notice or
  // take one away. That shows or hides a line of the notice and nothing more;
  // no key is released, sent or handed out by what this file holds. The same
  // holds for the "seen" mark of a move that stood back, below.
  const lostFile = `${deps.secretsFile}.lost`;

  function readLost(): string[] {
    try {
      const text = readFileSync(lostFile, 'utf8');
      if (text.length > LOST_FILE_MAX) return [];
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) return [];
      return [...new Set(parsed.filter((r): r is string => typeof r === 'string' && r.length > 0 && r.length <= LOST_REF_MAX))].slice(0, MOVE_MAX_ENTRIES);
    } catch {
      return [];
    }
  }

  function writeLost(refs: string[]): void {
    if (refs.length === 0) { rmSync(lostFile, { force: true }); return; }
    writeAtomic(lostFile, JSON.stringify(refs));
  }

  // ─── A move that stood back ────────────────────────────────────────────────

  // The cause the person pressed Done on: the notice does not come back for
  // the same cause. A move that goes through forgets it.
  const skipSeenFile = `${deps.secretsFile}.unchecked-seen`;

  function skipSeen(): string | undefined {
    try {
      const text = readFileSync(skipSeenFile, 'utf8');
      return text.length > 0 && text.length <= 64 ? text : undefined;
    } catch {
      return undefined;
    }
  }

  function seeSkip(cause: string): void {
    try { writeAtomic(skipSeenFile, cause.slice(0, 64)); } catch { /* the notice comes back at the next start */ }
  }

  function forgetSkipSeen(): void {
    try { rmSync(skipSeenFile, { force: true }); } catch { /* nothing reads it once the cause changes */ }
  }

  /** The names that still hold a value an older version saved (nothing is opened). */
  const oldRefs = (): string[] => { const all = readAll(); return Object.keys(all).filter((ref) => !isEnvelope(all[ref])); };

  /** The names whose old key was dropped and that the person has not been through yet. */
  const lost = (): string[] => readLost();

  /** The person pressed Done on these names (or saved a new key under one). */
  function seenLost(refs: readonly string[]): void {
    const gone = new Set([...refs, NAMES_UNKNOWN]);
    const before = readLost();
    const left = before.filter((r) => !gone.has(r));
    if (left.length === before.length) return;
    try { writeLost(left); } catch { /* they are named again at the next start */ }
  }

  // ─── The store key ─────────────────────────────────────────────────────────

  // Kept for the life of the process once read: a key file swapped later
  // changes nothing until the next start.
  let kept: SecretCipher | null = null;

  /** Whether the host's cipher answers at all right now. */
  function hostAnswers(host: SecretCipher): boolean {
    try { return host.decrypt(host.encrypt(PROBE)) === PROBE; } catch { return false; }
  }

  /** The key in the key file, or why there is none. `damaged`: a file is
   *  there and does not hold a store key this host can open. `unsure`: the
   *  host's cipher could not be asked (a locked keychain, a refused prompt),
   *  so nothing is known about the file and it is left alone. */
  function readKeyFile(host: SecretCipher): { key: Buffer } | { key: null; why: 'none' | 'damaged' | 'unsure' } {
    let text: string;
    try {
      text = readFileSync(deps.keyFile, 'utf8');
    } catch (e) {
      return { key: null, why: (e as NodeJS.ErrnoException)?.code === 'ENOENT' ? 'none' : 'damaged' };
    }
    try {
      if (text.length > KEY_FILE_MAX) return { key: null, why: 'damaged' };
      const j = JSON.parse(text) as { v?: unknown; k?: unknown };
      if (!j || j.v !== 1 || typeof j.k !== 'string') return { key: null, why: 'damaged' };
      const sealed = Buffer.from(j.k, 'base64');
      // A key written in the clear is never taken, whatever the host's cipher
      // answers for bytes it did not write.
      if (decodeStoreKey(sealed.toString('latin1')) !== null) return { key: null, why: 'damaged' };
      let plain: string;
      try {
        plain = host.decrypt(sealed);
      } catch {
        // The file could not be opened. Only when the cipher itself works is that the file's fault.
        return { key: null, why: hostAnswers(host) ? 'damaged' : 'unsure' };
      }
      const key = decodeStoreKey(plain);
      return key ? { key } : { key: null, why: 'damaged' };
    } catch {
      return { key: null, why: 'damaged' };
    }
  }

  /**
   * The cipher envelopes are sealed with.
   *   `read`: a missing or damaged key answers `null`: nothing reads.
   *   `make`: a missing key is made; a damaged one still answers `null` (the
   *           move: nothing the person did asked for the old key to go).
   *   `replace`: the caller is saving for the person, so a key file that
   *           cannot be opened is also set aside (renamed, never deleted) and
   *           a new key made.
   */
  function store(mode: 'read' | 'make' | 'replace'): SecretCipher | null {
    const host = deps.cipher();
    if (!host.available()) return null;
    if (host.sealed) return host;
    if (kept) return kept;
    const got = readKeyFile(host);
    if (got.key) return (kept = storeCipher(got.key));
    if (mode === 'read' || (mode === 'make' && got.why !== 'none')) return null;
    // Never set a key file aside because the keychain did not answer: every kept secret would go with it.
    if (got.why === 'unsure') throw new Error('the system keychain did not answer, so the saved keys cannot be opened right now; nothing was changed. Unlock the keychain or allow the app, then try again');
    const key = randomBytes(32);
    // Encrypted before anything on disk is touched: a keychain that fails now leaves the old file where it is.
    const text = JSON.stringify({ v: 1, k: host.encrypt(encodeStoreKey(key)).toString('base64') });
    if (got.why === 'damaged') renameSync(deps.keyFile, `${deps.keyFile}.unreadable-${now()}`);
    writeAtomic(deps.keyFile, text);
    return (kept = storeCipher(key));
  }

  // ─── Reading and saving ────────────────────────────────────────────────────

  /** The secret, for this name and this use only. */
  function get(ref: string | undefined, use: SecretUse): string | undefined {
    if (!ref) return undefined;
    const blob = readAll()[ref];
    if (!isEnvelope(blob)) return undefined;
    try {
      const s = store('read');
      return s ? openSealed(s, ref, use, blob) : undefined;
    } catch {
      return undefined;
    }
  }

  /** Save a secret for one use. Called for the person only (their window),
   *  and by the move. Fails closed: never written in plain text. */
  function set(ref: string, use: SecretUse, plaintext: string): { ok: boolean; error?: string; fault?: true } {
    if (!ref) return { ok: false, error: 'secretRef required' };
    if (typeof plaintext !== 'string' || plaintext === '') return { ok: false, error: 'secret required' };
    if (plaintext.length > MAX_SECRET_CHARS) return { ok: false, error: SECRET_TOO_LONG };
    try {
      if (!deps.cipher().available()) {
        return { ok: false, error: 'OS secret encryption is unavailable; refusing to store a secret in plaintext' };
      }
      const s = store('replace');
      if (!s) return { ok: false, error: 'the secret store has no key' };
      const all = readAll();
      all[ref] = sealSecret(s, ref, use, plaintext);
      writeAll(all);
      seenLost([ref]);
      return { ok: true };
    } catch (e) {
      // `fault`: these words are a fault's own (they can name a path), not the app's.
      return { ok: false, error: e instanceof Error ? e.message : String(e), fault: true };
    }
  }

  /** Several saves and removals in ONE write of the file: all of them, or
   *  none. For an office's custom secrets, where one Save of the screen is
   *  one call. Nothing is written when any value cannot be sealed. */
  function setMany(sets: ReadonlyArray<{ ref: string; use: SecretUse; plaintext: string }>, removes: readonly string[]): { ok: boolean; error?: string; fault?: true } {
    for (const s of sets) {
      if (!s.ref) return { ok: false, error: 'secretRef required' };
      if (typeof s.plaintext !== 'string' || s.plaintext === '') return { ok: false, error: 'secret required' };
      if (s.plaintext.length > MAX_SECRET_CHARS) return { ok: false, error: SECRET_TOO_LONG };
    }
    try {
      if (sets.length > 0 && !deps.cipher().available()) {
        return { ok: false, error: 'OS secret encryption is unavailable; refusing to store a secret in plaintext' };
      }
      const s = sets.length > 0 ? store('replace') : null;
      if (sets.length > 0 && !s) return { ok: false, error: 'the secret store has no key' };
      const all = readAll();
      let changed = false;
      for (const ref of removes) if (ref in all) { delete all[ref]; changed = true; }
      for (const one of sets) { all[one.ref] = sealSecret(s!, one.ref, one.use, one.plaintext); changed = true; }
      if (changed) writeAll(all);
      if (sets.length > 0) seenLost(sets.map((x) => x.ref));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e), fault: true };
    }
  }

  /** What an envelope under this name is for, without its value. */
  function useOf(ref: string | undefined): SecretUse | undefined {
    if (!ref) return undefined;
    const blob = readAll()[ref];
    if (!isEnvelope(blob)) return undefined;
    try {
      const s = store('read');
      return s ? readSealed(s, ref, blob)?.use : undefined;
    } catch {
      return undefined;
    }
  }

  function state(ref: string | undefined): SecretState {
    if (!ref) return 'none';
    // A secret file that is there and cannot be taken as a map says nothing
    // about any name: "not there" would let a caller make a new value over
    // one that may still be in it.
    if (fileIsBad()) return 'unreadable';
    if (readAll()[ref] === undefined) return 'none';
    const use = useOf(ref);
    if (!use) return 'unreadable';
    return use.kind === 'held' || use.kind === 'held-env' ? 'held' : 'ready';
  }

  /** Whether a secret is stored under this name and may be used now. */
  const has = (ref: string | undefined): boolean => state(ref) === 'ready';

  /** Every name the file holds (nothing is opened). */
  const refs = (): string[] => Object.keys(readAll());

  /** Delete a stored secret. Idempotent. Throws when the file could not be
   *  written: the caller must not tell the person it is gone. */
  function remove(ref: string | undefined): void {
    if (!ref) return;
    const all = readAll();
    if (!(ref in all)) return;
    delete all[ref];
    writeAll(all);
  }

  /**
   * The value to keep under `to` for what is kept under `from` (a record got
   * a new id). An envelope is sealed again under the new name, for the same
   * use; anything else is handed back as it is.
   */
  function sealedAs(from: string, to: string, blob: string): string {
    if (!isEnvelope(blob)) return blob;
    try {
      const s = store('read');
      const got = s ? readSealed(s, from, blob) : undefined;
      return s && got ? sealSecret(s, to, got.use, got.value) : blob;
    } catch {
      return blob;
    }
  }

  /**
   * The person changed an integration's address in Settings. The secret
   * follows only when it was sealed for the address the record had: a record
   * whose address was changed in the file does not carry its key along.
   */
  function readdress(ref: string | undefined, fromUrl: string, toUrl: string): boolean {
    if (!ref) return false;
    const from = baseAddress(fromUrl);
    const to = baseAddress(toUrl);
    if (from === null || to === null || from === to) return false;
    try {
      const s = store('read');
      const all = readAll();
      const got = s ? readSealed(s, ref, all[ref]) : undefined;
      if (!s || !got || (got.use.kind !== 'http' && got.use.kind !== 'held') || got.use.url !== from) return false;
      all[ref] = sealSecret(s, ref, { kind: got.use.kind, url: to }, got.value);
      writeAll(all);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Held secrets: the person's yes ────────────────────────────────────────

  /** What waits for the person, masked. For the notice only. */
  function held(): HeldSecret[] {
    const out: HeldSecret[] = [];
    let s: SecretCipher | null;
    try { s = store('read'); } catch { return out; }
    if (!s) return out;
    const all = readAll();
    for (const ref of Object.keys(all)) {
      const got = readSealed(s, ref, all[ref]);
      if (!got) continue;
      if (got.use.kind === 'held') out.push({ ref, shown: shownOf(all[ref]), kind: 'held', url: got.use.url, ...maskSecret(got.value) });
      else if (got.use.kind === 'held-env') out.push({ ref, shown: shownOf(all[ref]), kind: 'held-env', ...maskSecret(got.value) });
    }
    return out;
  }

  const copyFile = `${deps.secretsFile}.before-seal`;

  /** Every copy of the file as an older version left it: the first, and a dated one per later batch. */
  function oldCopies(): string[] {
    const dir = dirname(deps.secretsFile);
    const first = basename(copyFile);
    try {
      return readdirSync(dir).filter((n) => n === first || (n.startsWith(`${first}.`) && /^\d+$/.test(n.slice(first.length + 1)))).map((n) => join(dir, n));
    } catch {
      return [];
    }
  }

  /** Whether every stored value is known to be settled: the store key was
   *  read, each value is an envelope that opens, none waits, and no name is
   *  still named as lost (its old value may be kept again from a copy).
   *  A store that cannot be read right now (a keychain that does not
   *  answer, a damaged key file) is not settled: nothing is known about what
   *  it holds. */
  function settled(all: Record<string, string>): boolean {
    if (readLost().some((ref) => ref !== NAMES_UNKNOWN)) return false;
    let s: SecretCipher | null;
    try { s = store('read'); } catch { return false; }
    if (!s) return false;
    for (const ref of Object.keys(all)) {
      if (!isEnvelope(all[ref])) return false;
      const got = readSealed(s, ref, all[ref]);
      if (!got || got.use.kind === 'held' || got.use.kind === 'held-env') return false;
    }
    return true;
  }

  /** The copies are kept while something still waits, and while the store cannot say. */
  function dropOldCopyWhenSettled(all: Record<string, string>): void {
    try {
      const copies = oldCopies();
      if (copies.length === 0 || !settled(all)) return;
      for (const c of copies) rmSync(c, { force: true });
    } catch { /* it stays; nothing reads it */ }
  }

  /** A new file with these bytes, for the owner only; never over anything, never through a link. */
  function writeNew(file: string, bytes: Buffer): void {
    const fd = openSync(file, 'wx', 0o600);
    try { writeSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
    chmodSync(file, 0o600);
  }

  /**
   * Keep the secret file as it is now, before the move changes it. Throws
   * when no copy holds these bytes afterwards: the move then changes nothing.
   * A first copy that already holds exactly these bytes is enough (a move
   * that stopped half way); a later batch of old values gets a dated copy.
   */
  function keepOldCopy(): void {
    const bytes = readFileSync(deps.secretsFile);
    try {
      writeNew(copyFile, bytes);
      return;
    } catch (e) {
      if ((e as NodeJS.ErrnoException)?.code !== 'EEXIST') throw e;
    }
    let same = false;
    try { same = lstatSync(copyFile).isFile() && readFileSync(copyFile).equals(bytes); } catch { same = false; }
    if (same) { chmodSync(copyFile, 0o600); return; }
    writeNew(`${copyFile}.${now()}`, bytes);
  }

  /**
   * "This is right": the held secret may be used from now on. `shown` is the
   * mark of the value the person was shown (`held()`): the yes is applied to
   * that exact stored value and to no other. A value that was put under the
   * name since is not released, and the row is asked again.
   */
  function release(ref: string, shown: string): boolean {
    try {
      const s = store('read');
      const all = readAll();
      if (typeof all[ref] !== 'string' || typeof shown !== 'string' || shownOf(all[ref]) !== shown) return false;
      const next = s ? releaseHeld(s, ref, all[ref]) : undefined;
      if (next === undefined) return false;
      all[ref] = next;
      writeAll(all);
      dropOldCopyWhenSettled(all);
      return true;
    } catch {
      return false;
    }
  }

  /** "Switch off": the held secret the person was shown is forgotten. Only
   *  that exact value, and only while it is still a held one. */
  function forgetHeld(ref: string, shown: string): boolean {
    try {
      const s = store('read');
      const all = readAll();
      if (typeof all[ref] !== 'string' || typeof shown !== 'string' || shownOf(all[ref]) !== shown) return false;
      const got = s ? readSealed(s, ref, all[ref]) : undefined;
      if (!got || (got.use.kind !== 'held' && got.use.kind !== 'held-env')) return false;
      delete all[ref];
      writeAll(all);
      dropOldCopyWhenSettled(all);
      return true;
    } catch {
      return false;
    }
  }

  // ─── The move ──────────────────────────────────────────────────────────────

  /** The plain texts of the app's own keys, or null when a file that is there cannot be read (nothing is moved then). */
  function appKeysOf(host: SecretCipher, files: readonly string[]): string[] | null {
    const appKeys: string[] = [];
    for (const file of files) {
      let text: string;
      try {
        text = readFileSync(file, 'utf8');
      } catch (e) {
        if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') continue;
        return null;
      }
      try {
        const sk = (JSON.parse(text) as { sk?: unknown }).sk;
        if (typeof sk !== 'string') throw new Error('shape');
        appKeys.push(host.decrypt(Buffer.from(sk, 'base64')));
      } catch {
        return null;
      }
    }
    return appKeys;
  }

  /** What the keychain answers for an old bare value, or undefined. A value too long to be a key is never asked about. */
  function oldPlain(host: SecretCipher, blob: string): string | undefined {
    try {
      return blob.length > OLD_BLOB_MAX ? undefined : host.decrypt(Buffer.from(blob, 'base64'));
    } catch {
      return undefined;
    }
  }

  /** The copies of the old file, the newest first: the dated ones by their date, then the first. */
  function copiesNewestFirst(): string[] {
    const stamp = (file: string): number => { const n = Number(file.slice(copyFile.length + 1)); return file === copyFile || !Number.isFinite(n) ? -1 : n; };
    return oldCopies().sort((a, b) => stamp(b) - stamp(a));
  }

  /**
   * A 0.5.8 RC start held every key an agent gets and every key of
   * an integration not at its provider's own address, and dropped a key with
   * a space in it. At the next start they come back, with no answer asked:
   *   - a held key is released when a copy of the old file (`.before-seal`)
   *     holds the very same value under the same name, so only a key that an
   *     older version had is released, never one the person saved held since;
   *   - a name the update named as lost, with no key under it now, is kept
   *     again from the newest copy that has it, by the move's own rules.
   * Nothing is asked of the keychain when nothing is held and nothing is lost.
   * Nothing is changed when anything fails. `decided`: the names the move
   * looked at at this very start, which are not looked at again.
   */
  function fromOldCopies(facts: MoveFacts, decided: ReadonlySet<string> = new Set()): { released?: string[]; recovered?: string[] } {
    try {
      const host = deps.cipher();
      if (!host.available() || host.sealed) return {};
      const copies = copiesNewestFirst();
      if (copies.length === 0) return {};
      const s = store('read');
      if (!s) return {};
      const all = readAll();
      const heldNow = new Map<string, string>();
      for (const ref of Object.keys(all)) {
        const got = readSealed(s, ref, all[ref]);
        if (got && (got.use.kind === 'held' || got.use.kind === 'held-env')) heldNow.set(ref, got.value);
      }
      const lostNow = readLost().filter((ref) => ref !== NAMES_UNKNOWN && !(ref in all) && !decided.has(ref));
      if (heldNow.size === 0 && lostNow.length === 0) return {};
      const wanted = new Set([...heldNow.keys(), ...lostNow]);
      // The old values under those names, the newest copy first.
      const olds = new Map<string, string[]>();
      for (const file of copies) {
        let parsed: unknown;
        try { parsed = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
        const entries = Object.entries(parsed as Record<string, unknown>);
        if (entries.length > MOVE_MAX_ENTRIES) continue;
        for (const [ref, blob] of entries) {
          if (!wanted.has(ref) || typeof blob !== 'string' || isEnvelope(blob)) continue;
          const list = olds.get(ref) ?? [];
          list.push(blob);
          olds.set(ref, list);
        }
      }
      if (olds.size === 0) return {};
      const released: string[] = [];
      for (const [ref, value] of heldNow) {
        if (!(olds.get(ref) ?? []).some((blob) => oldPlain(host, blob) === value)) continue;
        const next = releaseHeld(s, ref, all[ref]);
        if (next !== undefined) { all[ref] = next; released.push(ref); }
      }
      const recovered: string[] = [];
      const toRecover = lostNow.filter((ref) => olds.has(ref));
      const appKeys = toRecover.length > 0 ? appKeysOf(host, facts.appKeyFiles) : [];
      if (appKeys !== null) {
        for (const ref of toRecover) {
          const plain = oldPlain(host, olds.get(ref)![0]);
          const d = decideMove(ref, plain, { appKeys, sinkOf: facts.sinkOf });
          if (d.action === 'seal' && plain !== undefined) { all[ref] = sealSecret(s, ref, d.use, plain); recovered.push(ref); }
        }
      }
      if (released.length === 0 && recovered.length === 0) return {};
      writeAll(all);
      if (recovered.length > 0) seenLost(recovered);
      return { ...(released.length > 0 ? { released } : {}), ...(recovered.length > 0 ? { recovered } : {}) };
    } catch {
      return {};
    }
  }

  /**
   * The old bare keychain values, once and for all: each is sealed for its use
   * (ready at once) or dropped. Safe however often it runs and
   * whatever the two files hold (sealedSecrets.ts says why); a file with no
   * old value, nothing held and nothing lost costs one read. Before the first
   * change the file as it was is copied beside itself (`.before-seal`; a later
   * batch gets a dated copy; with no copy nothing is changed). The copies are
   * read again only by `fromOldCopies`, and go once the store is settled.
   */
  function move(facts: MoveFacts): MoveResult {
    // A secret file that is there and cannot be taken as a map reads as empty:
    // say so, or every key in it would read as not set with no word to the person.
    if (fileIsBad()) return { skipped: 'file-unreadable', decisions: [] };
    const all = readAll();
    const old = Object.keys(all).filter((ref) => !isEnvelope(all[ref]));
    if (old.length === 0) {
      forgetSkipSeen();
      const back = fromOldCopies(facts);
      dropOldCopyWhenSettled(readAll());
      return { decisions: [], ...back };
    }
    const host = deps.cipher();
    // A key cipher never wrote a bare value an app released: there is nothing to move.
    if (!host.available() || host.sealed) return { skipped: 'no-cipher', decisions: [] };
    if (old.length > MOVE_MAX_ENTRIES) return { skipped: 'too-many', decisions: [] };
    const appKeys = appKeysOf(host, facts.appKeyFiles);
    if (appKeys === null) return { skipped: 'app-key-unreadable', decisions: [] };
    let s: SecretCipher | null;
    try { s = store('make'); } catch { s = null; }
    if (!s) return { skipped: 'key-unreadable', decisions: [] };
    const decisions: MoveDecision[] = [];
    for (const ref of old) {
      const plain = oldPlain(host, all[ref]);
      const d = decideMove(ref, plain, { appKeys, sinkOf: facts.sinkOf });
      decisions.push(d);
      if (d.action === 'seal' && plain !== undefined) all[ref] = sealSecret(s, ref, d.use, plain);
      else delete all[ref];
    }
    // No copy, no change: a value is never dropped with nothing kept of it.
    try { keepOldCopy(); } catch { return { skipped: 'copy-failed', decisions: [] }; }
    // The names first, then the values: a stop between the two names a key that
    // is still there (the next start moves it), never drops one that nothing
    // names. A name nothing reads was dropped because nothing reads it: there
    // is nothing to set again. With no way to keep the names nothing is changed.
    const dropped = decisions.filter((d) => d.action === 'drop' && d.reason !== 'no-use').map((d) => d.ref);
    const namedBefore = readLost();
    if (dropped.length) { try { writeLost([...new Set([...namedBefore, ...dropped])]); } catch { return { skipped: 'copy-failed', decisions: [] }; } }
    try {
      writeAll(all);
    } catch (e) {
      if (dropped.length) { try { writeLost(namedBefore); } catch { /* a name too many is shown; no key is lost by it */ } }
      throw e;
    }
    forgetSkipSeen();
    // Keys an earlier batch left held or lost (a person who went back to 0.5.7 and came to 0.5.8 again).
    // The copy this move wrote stays until a later start finds the store settled.
    return { decisions, ...fromOldCopies(facts, new Set(old)) };
  }

  // An office from before the copy gets one here, and a crash between a save and its copy is made good.
  refreshCopy();
  return { get, set, setMany, has, state, useOf, refs, fileUnreadable: fileIsBad, remove, sealedAs, readdress, held, release, forgetHeld, move, lost, seenLost, oldRefs, skipSeen, seeSkip };
}

export type SealedStore = ReturnType<typeof createSealedStore>;

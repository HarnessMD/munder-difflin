/**
 * THE SOLO LICENSE KEY.
 *
 * A team seat is reached with an INVITE CODE, minted by an admin against an
 * org. A solo person has no org and no admin, so they buy a licence on the web
 * console and get a LICENSE KEY. Two different things, two different words, and
 * the words never cross: a solo screen never says invite or seat, and a team
 * screen never says licence.
 *
 * THE SHAPE, and why each decision was made:
 *
 *   MDS-XXXXX-XXXXX-XXXXX
 *
 * `MDS` because the invite code is `MD-XXXX-XXXX`. A person holding the wrong
 * one of the two must be able to see that at a glance, and a field must be able
 * to tell them WHICH they are holding rather than saying "invalid". Different
 * prefix, different group size, different group count.
 *
 * The alphabet is Crockford base32: the ten digits and the twenty two letters
 * that are left after removing I, L, O and U. I and L look like 1, O looks
 * like 0, and U is dropped because it turns up in words nobody wants printed on
 * an invoice. Decoding folds the confusable characters back, so a person who
 * types O for 0 is quietly right rather than told they are wrong.
 *
 * The last character is a checksum over the other fourteen. That is the whole
 * point of having a shape at all: a mistyped key is caught in the field, with
 * the cursor still in it, instead of after a round trip that says only that the
 * server did not recognise it. It is a transcription check and NOT a security
 * property. Anyone can compute it. The key's secrecy is its 70 bits of body,
 * and its authority is the server's record, never this file.
 *
 * Pure and import-free so `test/load-ts.cjs` can take it directly, and so the
 * console can run the same rules by porting one file rather than guessing.
 */

/** Crockford base32, in canonical order. Index is the symbol's value. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** What a person may type that we fold to what they meant. Crockford's own
 *  table: O is zero, I and L are one. Case is folded before this applies. */
const FOLD: Record<string, string> = { O: '0', I: '1', L: '1' };

export const LICENSE_PREFIX = 'MDS';
/** Three groups of five. Fourteen body symbols and one checksum. */
export const LICENSE_GROUPS = 3;
export const LICENSE_GROUP_LEN = 5;
export const LICENSE_BODY_LEN = LICENSE_GROUPS * LICENSE_GROUP_LEN; // 15
/** The example shown in placeholder text and docs. Not a real key: the body is
 *  all zeroes, which no generator produces, and the checksum is correct for it
 *  so the example itself is never flagged as a typo in a screenshot. */
export const LICENSE_EXAMPLE = 'MDS-00000-00000-00000';

/** The invite code the TEAM path uses, here only so a solo field can recognise
 *  one and say so. Never validate an invite with this module. */
const INVITE_RE = /^MD-[0-9A-Z]{4}-[0-9A-Z]{4}$/i;

export type LicenseProblem =
  | 'empty'
  | 'looks-like-invite'
  | 'wrong-prefix'
  | 'wrong-length'
  | 'bad-character'
  | 'bad-checksum';

export interface LicenseCheck {
  /** Canonical form, uppercase and hyphenated, only when `problem` is null. */
  key: string | null;
  problem: LicenseProblem | null;
}

/** Strip everything a person might paste around or inside a key: spaces, the
 *  hyphens we put there, a stray quote from a chat client. Case folded. */
function bare(input: string): string {
  return (input ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function symbolValue(ch: string): number {
  const folded = FOLD[ch] ?? ch;
  return ALPHABET.indexOf(folded);
}

/**
 * The checksum symbol for a body. A simple weighted sum modulo 32: position
 * weighted so that transposing two adjacent symbols changes the result, which
 * a plain sum would not catch and which is the second most common typing
 * mistake after a single wrong character.
 */
export function checksumOf(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const v = symbolValue(body[i]);
    if (v < 0) return '';
    sum = (sum + v * (i + 2)) % 32;
  }
  return ALPHABET[sum];
}

/** Group a bare 15 symbol body into the displayed form. */
export function formatLicense(body: string): string {
  const groups: string[] = [];
  for (let i = 0; i < body.length; i += LICENSE_GROUP_LEN) groups.push(body.slice(i, i + LICENSE_GROUP_LEN));
  return [LICENSE_PREFIX, ...groups].join('-');
}

/**
 * Check anything a person can type. Order matters: the most useful message
 * wins. Being told "that is a team invite code" is worth far more than being
 * told a prefix is wrong, and it is the single most likely mistake, because the
 * two codes arrive by the same channels and look alike at a glance.
 */
export function checkLicense(input: string): LicenseCheck {
  const raw = (input ?? '').trim();
  if (raw === '') return { key: null, problem: 'empty' };
  if (INVITE_RE.test(raw)) return { key: null, problem: 'looks-like-invite' };

  const all = bare(raw);
  if (!all.startsWith(LICENSE_PREFIX)) return { key: null, problem: 'wrong-prefix' };

  const body = all.slice(LICENSE_PREFIX.length);
  if (body.length !== LICENSE_BODY_LEN) return { key: null, problem: 'wrong-length' };

  const canonical: string[] = [];
  for (const ch of body) {
    const v = symbolValue(ch);
    if (v < 0) return { key: null, problem: 'bad-character' };
    canonical.push(ALPHABET[v]);
  }
  const fixed = canonical.join('');
  if (checksumOf(fixed.slice(0, -1)) !== fixed[fixed.length - 1]) {
    return { key: null, problem: 'bad-checksum' };
  }
  return { key: formatLicense(fixed), problem: null };
}

/** True only for a key that passed every check. The one predicate a caller
 *  should use; nothing else in the app should re-implement the test. */
export function isLicenseKey(input: string): boolean {
  return checkLicense(input).problem === null;
}

/**
 * Build a key from 14 body symbols the SERVER generated, appending the
 * checksum. The randomness is the caller's job and must come from a real CSPRNG
 * on the server; this file never generates one, so no client can mint a key
 * that a server would recognise.
 */
export function licenseFrom(body14: string): string {
  const up = bare(body14);
  if (up.length !== LICENSE_BODY_LEN - 1) throw new Error(`license body must be ${LICENSE_BODY_LEN - 1} symbols`);
  for (const ch of up) if (symbolValue(ch) < 0) throw new Error('license body has a symbol outside the alphabet');
  return formatLicense(up + checksumOf(up));
}

/**
 * WHAT A LICENCE ENTITLES, as the desktop understands it.
 *
 * Deliberately small. The server is the authority on whether a licence is live;
 * this record is what the machine caches so it can start up and tell the truth
 * while offline, in the same spirit as the org cache. `state` mirrors the
 * org's `BillingState` words so one set of copy serves both.
 */
export interface LicenseView {
  /** The key, canonical. Shown to the person; it is theirs. */
  key: string;
  state: 'awaiting-card' | 'trialing' | 'healthy' | 'payment-failed' | 'cancelled';
  /** ISO. Null when nothing is counting down. */
  renewsAt: string | null;
  /** The machine this licence is bound to, so a person can see which one it is
   *  on before they move it. */
  deviceLabel: string | null;
  /** Server time of the last successful check, for "as of" copy the way the org
   *  panel shows `fetchedAt`. Staleness visible rather than hidden. */
  checkedAt: string;
}

/** A licence may be used when the server says it is live. Mirrors the org side
 *  exactly (`isEntitled` in ./billing), so solo and team cannot drift on what
 *  paid means. */
export function licenceIsLive(view: Pick<LicenseView, 'state'>): boolean {
  return view.state === 'trialing' || view.state === 'healthy';
}

/** How long a machine may run on an UNCONFIRMED record before the gate stops
 *  admitting on it. The plane rule holds (a paid person offline for a trip
 *  keeps working); a machine that cannot confirm for two whole weeks is not on
 *  a trip, it is dodging the answer. Fourteen days on purpose: the same span
 *  the server gives a cancelled subscription (contract 6.1), so "how long can
 *  a licence coast" has one answer product-wide. (founder, 5 Sep 2026) */
export const LICENSE_STALE_MAX_MS = 14 * 24 * 60 * 60_000;

/**
 * THE GATE'S WHOLE QUESTION about a record it holds: live, and confirmed
 * recently enough to still be believed. `licenceIsLive` alone let a revoked
 * key work forever on a machine that simply never asked again; admission now
 * requires the answer to be at most `LICENSE_STALE_MAX_MS` old. A `checkedAt`
 * that does not parse refuses: an admission record whose date cannot be read
 * is one a machine should refuse, not guess at.
 */
export function licenceAdmits(view: Pick<LicenseView, 'state' | 'checkedAt'>, now = Date.now()): boolean {
  if (!licenceIsLive(view)) return false;
  const t = Date.parse(view.checkedAt);
  return Number.isFinite(t) && now - t <= LICENSE_STALE_MAX_MS;
}

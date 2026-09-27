/**
 * license.json: what a SOLO machine knows about the licence that admits it.
 *
 * `<userData>/teams/license.json`, beside membership.json, the device key and
 * the trust pins, and 0600 like all of them. It is the solo half of exactly
 * what `teamsMembership.ts` is for a team seat, and it is deliberately the same
 * shape of thing: a small local record that the gate reads, written only by
 * main, never by the renderer.
 *
 * WHY IT IS A FILE AND NOT A FLAG. The gate has to answer before the network
 * does. A person who paid, closed the laptop and got on a plane must still open
 * the app, so admission is decided from disk and the relay only ever moves the
 * record forward. That is the same reason `org.json` exists on the team side,
 * and the staleness is visible rather than hidden: `checkedAt` is shown.
 *
 * THE KEY IS A CREDENTIAL. It is stored here because the machine has to send it
 * to renew, and it is shown in the app because it is the person's own. It is
 * never logged, never put in an error message, and never written into a URL.
 * Every log line here says `keyTail`, the last four symbols, which is enough to
 * tell two licences apart and not enough to be one.
 */
import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { hostname, release } from 'node:os';
import { checkLicense, licenceAdmits, licenceIsLive, licenseFrom, type LicenseView } from '../shared/licenseKey';
import { fingerprintFor } from './deviceIdentity';
import { sharedDataDir } from './sharedData';

/** How often a live licence re-checks while the app is open. The same cadence
 *  as the org's `/me` poll (`teamsOrg.TUNING.pollMs`), because it is the same
 *  question asked of the same server about the same subscription. */
export const LICENSE_POLL_MS = 15 * 60_000;
/** Once it has lapsed, it is the person's problem to fix and there is nothing
 *  to learn by asking every quarter of an hour. */
export const LICENSE_LAPSED_POLL_MS = 60 * 60_000;

/**
 * THE ROUTES, as the server actually built them. One constant, so the two
 * halves reconcile in one line rather than in a search. `redeem` binds the key
 * to this device; `check` is the renewal question and binds nothing.
 *
 * NEITHER IS AUTHENTICATED, because the key IS the credential. That is the same
 * bargain an invite code makes, and it is why the key is 70 bits and why
 * nothing here ever logs it.
 */
export const LICENSE_ROUTES = {
  redeem: '/api/licence/redeem',
  check: '/api/licence/check'
} as const;

/**
 * THE DEVICE KEY MUST BE STABLE ACROSS RESTARTS. It is the identity the server
 * binds the licence to, so a client that regenerates it locks itself out on its
 * second run: the licence is still bound, but to a machine that no longer
 * exists by that name, and the person gets "another machine holds it" pointing
 * at themselves.
 *
 * It is NOT the team keypair. deviceIdentity.ts is explicit that generating
 * that key belongs behind enrolment only, and it has a reason this path cannot
 * accept: it fails closed when the OS keyring cannot encrypt, and a solo
 * person on such a machine must still be able to redeem what they paid for.
 * Nothing ever signs on this path (the server's own words), so the solo
 * identity is a keypair of its own whose PRIVATE half is discarded at birth:
 * only the public key is kept, in solo-device.json beside license.json, and a
 * public key needs no keyring. A wiped userData means a new identity, and the
 * console's Move control exists for exactly that day.
 */
export type RedeemError = 'invalid' | 'used' | 'expired' | 'offline' | 'refused';

export type RedeemResult =
  | { ok: true; license: LicenseView }
  | { ok: false; error: RedeemError; detail: string | null };

function filePath(): string {
  return join(sharedDataDir(), 'teams', 'license.json');
}

/**
 * `MD_DEV_PRO=1`, DEV BUILDS ONLY (0.5.2, 9 Sep 2026). A second instance run
 * beside a live office for testing has no paid answer of its own: the
 * founder's PRO is his org membership, and enrolling a test profile on the
 * live org would add a device row and presence writes to production member
 * documents, which was ruled out. A real key redeemed into a throwaway
 * profile binds a licence to a device that is deleted an hour later. So, in
 * a dev run only, this lever answers the gate with a synthetic live licence
 * and skips the renewal question. Ignored in a packaged app, the same way
 * MD_NO_GOD and MD_RESTORE_SLOW_MS are, so it can never reach a user: the
 * gate in App.tsx is unchanged and still reads whatever `readLicense` says.
 */
const DEV_PRO = !app.isPackaged && process.env.MD_DEV_PRO === '1';
/** A syntactically valid key (checksum and all), so every reader of the view
 *  treats it like any other, and one that no console will ever issue. */
const DEV_PRO_KEY = licenseFrom('0'.repeat(14));
function devProLicense(): LicenseView {
  return { key: DEV_PRO_KEY, state: 'healthy', renewsAt: null, deviceLabel: 'MD_DEV_PRO (dev run)', checkedAt: new Date().toISOString() };
}

/** The last four symbols, for a log line. Never the key. */
export function keyTail(key: string): string {
  return key.slice(-4);
}

function isView(v: unknown): v is LicenseView {
  if (!v || typeof v !== 'object') return false;
  const r = v as Partial<LicenseView>;
  return typeof r.key === 'string'
    && typeof r.state === 'string'
    && (r.renewsAt === null || typeof r.renewsAt === 'string')
    && (r.deviceLabel === null || typeof r.deviceLabel === 'string')
    && typeof r.checkedAt === 'string';
}

/**
 * Read the record, or null.
 *
 * A file that fails to parse, or whose key no longer passes `checkLicense`, is
 * treated as ABSENT rather than repaired. Admission is the thing this decides,
 * and a half readable admission record is one a machine should refuse, not
 * guess at. The file is left on disk so a person can be told what happened
 * instead of it quietly vanishing.
 */
export function readLicense(): LicenseView | null {
  if (DEV_PRO) return devProLicense();
  const p = filePath();
  if (!existsSync(p)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(p, 'utf8'));
    if (!isView(parsed)) return null;
    if (checkLicense(parsed.key).problem !== null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLicense(view: LicenseView): void {
  const p = filePath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(view, null, 2), { encoding: 'utf8', mode: 0o600 });
}

/** Remove the record. Used when a licence is cancelled and by a full reset. The
 *  machine drops back to the way in, which is the correct place for it. */
export function clearLicense(): void {
  try { rmSync(filePath(), { force: true }); } catch { /* already gone */ }
}

/** The person signed out (5 Sep 2026, the sidebar's drop-up): the record goes
 *  AND every subscriber hears it, so the gate drops the machine back to the
 *  way in at once. `clearLicense` alone is silent, which is right for the
 *  reset paths that call it and wrong here. The key itself stays valid: the
 *  server still holds the binding, and redeeming again on any machine rebinds. */
export function forgetLicense(): void {
  clearLicense();
  notify();
}

/** Whether this machine currently holds a licence that admits it. The gate's
 *  one question, answered from disk with no network — but bounded: a record
 *  the server has not confirmed within LICENSE_STALE_MAX_MS stops admitting
 *  (licenceAdmits, 5 Sep 2026), which is what keeps "works on a plane" from
 *  becoming "works forever behind a firewall". */
export function hasLiveLicense(): boolean {
  const v = readLicense();
  return v !== null && licenceAdmits(v);
}

/** How long since the record was last confirmed with the server, in ms, or
 *  null when there is no record. Shown as "as of", never hidden. */
export function ageMs(now = Date.now()): number | null {
  const v = readLicense();
  if (!v) return null;
  const t = Date.parse(v.checkedAt);
  return Number.isFinite(t) ? Math.max(0, now - t) : null;
}

/**
 * Map a server refusal onto the five words the screen has copy for.
 *
 * Anything unrecognised becomes `refused` and carries the server's own sentence
 * through as `detail`, which is shown and never branched on. That is the same
 * rule `EnrolResult` follows for the team path, and it is why a new server side
 * refusal does not need a desktop release to be readable.
 */
export function refusalOf(status: number, body: { error?: unknown; detail?: unknown }): { error: RedeemError; detail: string | null } {
  const detail = typeof body?.detail === 'string' && body.detail.trim() !== '' ? body.detail : null;
  const named = typeof body?.error === 'string' ? body.error : '';
  if (named === 'invalid' || named === 'used' || named === 'expired') return { error: named, detail };
  // The server's own codes, from API-CONTRACT §5.17 and §5.18:
  //   400  malformed key. Its `detail` is written to be shown verbatim and it
  //        distinguishes a team invite code from a plain typo, which is the
  //        single most useful sentence on this screen.
  //   404  unknown or revoked. Deliberately the same answer as malformed, so a
  //        scanner cannot tell a real key it does not hold from a fake one.
  //   409  another machine holds it, and `detail` names that machine.
  //   402  no live payment behind the licence. NOT `expired`: a licence
  //        awaiting a card has not expired, it has never started, and telling a
  //        person their new licence expired would send them to the wrong page.
  //        `refused` carries the server's own sentence through untouched.
  //   401  our public key was not 32 bytes, which is our bug and not theirs.
  if (status === 400 || status === 404) return { error: 'invalid', detail };
  if (status === 409) return { error: 'used', detail };
  if (status === 410) return { error: 'expired', detail };
  return { error: 'refused', detail };
}

/* ---- the solo device key --------------------------------------------------- */

/** Where the public half lives. 0600 like its neighbours, though it holds
 *  nothing secret: the private half was never written anywhere. */
function deviceKeyPath(): string {
  return join(sharedDataDir(), 'teams', 'solo-device.json');
}

const b64ToB64url = (b64: string): string => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Read or mint this machine's solo identity: a standard base64 Ed25519 public
 *  key. Minting discards the private half on the spot; see the header. */
export function soloDeviceKey(): string {
  const p = deviceKeyPath();
  if (existsSync(p)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(p, 'utf8'));
      const pk = (parsed as { publicKey?: unknown })?.publicKey;
      if (typeof pk === 'string' && Buffer.from(pk, 'base64').length === 32) return pk;
    } catch { /* unreadable: mint below, the licence Move control covers the rest */ }
  }
  const der = generateKeyPairSync('ed25519').publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
  const pk = der.subarray(der.length - 32).toString('base64');
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify({ publicKey: pk, createdAt: new Date().toISOString() }, null, 2), { encoding: 'utf8', mode: 0o600 });
  return pk;
}

/* ---- change notifications -------------------------------------------------- */

type LicenseSubscriber = (view: LicenseView | null) => void;
const subscribers = new Set<LicenseSubscriber>();

export function onLicenseChange(cb: LicenseSubscriber): () => void {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}

function notify(): void {
  const v = readLicense();
  subscribers.forEach((fn) => { try { fn(v); } catch { /* subscriber error */ } });
}

/* ---- the redemption -------------------------------------------------------- */

/** One origin for both routes, overridable the way SIGNIN_URL is
 *  (teamsEnrol.ts), so a dev console can stand in for the box. NOT
 *  CONSOLE_ORIGIN: app.harnessmd.com 301s the API to the apex, and fetch
 *  turns a redirected POST into a GET, so the call goes to the apex itself.
 *  Verified from outside on 5 Sep 2026: the apex answers, the app host
 *  redirects. */
export const LICENSE_ORIGIN = process.env.MD_LICENCE_ORIGIN ?? 'https://harnessmd.com';

/**
 * Redeem a key that already passed `checkLicense`, against the console's
 * public endpoint. Writes the record and notifies on success; writes nothing
 * on any refusal. The key is never logged and never put in a URL: it travels
 * once, in the POST body, over TLS.
 */
export async function redeemLicense(key: string): Promise<RedeemResult> {
  const publicKey = soloDeviceKey();
  const device = {
    name: hostname().slice(0, 80),
    os: `${process.platform} ${release()}`.slice(0, 40),
    appVersion: app.getVersion().slice(0, 20),
    publicKey: b64ToB64url(publicKey),
  };
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${LICENSE_ORIGIN}${LICENSE_ROUTES.redeem}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, device }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, error: 'offline', detail: null };
  }
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const r = refusalOf(res.status, (body ?? {}) as { error?: unknown; detail?: unknown });
    console.log(`[solo] redeem refused: ${r.error} (key …${keyTail(key)})`);
    return { ok: false, ...r };
  }
  const view = body as { key?: unknown; state?: unknown; renewsAt?: unknown; boundTo?: unknown; checkedAt?: unknown; fingerprint?: unknown };
  // Contract 5.18: derive the fingerprint from OUR key and compare. A server
  // that could choose the fingerprint could choose what the console verifies.
  if (view.fingerprint !== fingerprintFor(publicKey)) {
    return { ok: false, error: 'refused', detail: 'The server answered for a different machine, so nothing was saved. Try again.' };
  }
  const record: LicenseView = {
    key: typeof view.key === 'string' ? view.key : key,
    state: view.state as LicenseView['state'],
    renewsAt: typeof view.renewsAt === 'string' ? view.renewsAt : null,
    deviceLabel: typeof view.boundTo === 'string' ? view.boundTo : null,
    checkedAt: typeof view.checkedAt === 'string' ? view.checkedAt : new Date().toISOString(),
  };
  if (!isView(record)) {
    return { ok: false, error: 'refused', detail: 'The server answer was not readable, so nothing was saved. Try again.' };
  }
  writeLicense(record);
  notify();
  console.log(`[solo] licence redeemed (key …${keyTail(record.key)}, state ${record.state})`);
  return { ok: true, license: record };
}

/* ---- the renewal question (contract 5.18, licence.check.write) -------------- */

export type RecheckOutcome = 'none' | 'confirmed' | 'lapsed' | 'deactivated' | 'offline';

/**
 * Ask the server whether the cached record is still true, and make the answer
 * this machine's state. Until this existed the app never asked again after
 * redemption, so a key replaced on the console kept working here forever
 * (founder, 5 Sep 2026: "if someone replaces the keys then older key should be
 * inactive immediately"). The server side was already immediate — revoke
 * replaces the key hash and unbinds the machine in one write — this is the
 * half that makes the machine hear it.
 *
 * The verdicts:
 *   404 or 400     the key no longer exists (revoked, or replaced by a new
 *                  one). No grace on a dead credential: the record is removed
 *                  on the spot, the renderer is notified, and the gate refuses
 *                  on its next look.
 *   bound false    the licence moved to another machine or was released from
 *                  this one. Same removal: it is not this machine's any more.
 *   200 and bound  the record is refreshed (state can move to payment-failed
 *                  and back) and checkedAt restarts the staleness clock.
 *   anything else  offline and server trouble are NOT verdicts. The record is
 *                  left alone — the plane rule — and licenceAdmits' staleness
 *                  cap is what bounds how long that can be ridden.
 */
export async function recheckLicense(): Promise<RecheckOutcome> {
  // The lever's licence is nobody's to check: no key ever goes to the server.
  if (DEV_PRO) return 'confirmed';
  const rec = readLicense();
  if (!rec) return 'none';
  const deactivate = (why: string): void => {
    clearLicense();
    notify();
    console.log(`[solo] licence check: key …${keyTail(rec.key)} ${why}; this machine is out of Pro`);
  };
  // While unreachable, a record that has crossed the staleness cap must still
  // stop admitting NOW, not at the next relaunch: the notify makes every gate
  // look again with the clock it already respects.
  const offline = (): RecheckOutcome => {
    if (!licenceAdmits(rec)) notify();
    return 'offline';
  };
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${LICENSE_ORIGIN}${LICENSE_ROUTES.check}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: rec.key, publicKey: b64ToB64url(soloDeviceKey()) }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return offline();
  }
  if (res.status === 404 || res.status === 400) {
    // A server that KNOWS this route refuses a licence with a spoken `detail`
    // (contract 5.18 writes one for every named refusal); the router's own
    // unknown-path 404 carries `detail: null`. The difference matters: an
    // older box without the check route must read as unreachable here, never
    // as "your key is dead" — deactivating on a bare 404 would sign every
    // licensed machine out of Pro the moment it polled an old server.
    const refusal = await res.json().catch(() => null) as { detail?: unknown } | null;
    if (typeof refusal?.detail === 'string' && refusal.detail.trim() !== '') {
      deactivate('no longer exists (revoked or replaced)');
      return 'deactivated';
    }
    return offline();
  }
  if (!res.ok) return offline();
  const body: unknown = await res.json().catch(() => null);
  const v = body as { key?: unknown; state?: unknown; renewsAt?: unknown; bound?: unknown; boundTo?: unknown; checkedAt?: unknown } | null;
  if (!v || typeof v.key !== 'string' || typeof v.state !== 'string') return offline();
  if (v.bound !== true) {
    deactivate('is on another machine now');
    return 'deactivated';
  }
  const record: LicenseView = {
    key: v.key,
    state: v.state as LicenseView['state'],
    renewsAt: typeof v.renewsAt === 'string' ? v.renewsAt : null,
    deviceLabel: typeof v.boundTo === 'string' ? v.boundTo : rec.deviceLabel,
    checkedAt: typeof v.checkedAt === 'string' ? v.checkedAt : new Date().toISOString(),
  };
  if (!isView(record)) return offline();
  writeLicense(record);
  notify();
  return licenceIsLive(record) ? 'confirmed' : 'lapsed';
}

/**
 * The loop: one question at start, then LICENSE_POLL_MS apart while the answer
 * can still change things, LICENSE_LAPSED_POLL_MS once it has lapsed. A
 * setTimeout chain, not setInterval, so a slow answer can never stack calls;
 * unref'd so the poll never holds the process open at quit.
 */
export function startLicenseRecheckLoop(): () => void {
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;
  const tick = async (): Promise<void> => {
    const outcome = await recheckLicense().catch(() => 'offline' as const);
    if (stopped) return;
    const delay = outcome === 'lapsed' ? LICENSE_LAPSED_POLL_MS : LICENSE_POLL_MS;
    timer = setTimeout(() => { void tick(); }, delay);
    timer.unref();
  };
  void tick();
  return () => { stopped = true; if (timer) clearTimeout(timer); };
}

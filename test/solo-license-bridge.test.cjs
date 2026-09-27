/**
 * The solo licence bridge, end to end through the three layers (founder,
 * 5 Sep 2026: a paid key answered "this build cannot activate a key yet",
 * because SoloProBridge was declared and never implemented).
 *
 * What must stay true:
 *   1. Preload implements EVERY door SoloProBridge declares, by name, so the
 *      renderer's defensive read finds a whole bridge or none.
 *   2. Main handles both channels and pushes changes to the window.
 *   3. The redemption never uses the TEAM device key (deviceIdentity.ts is
 *      explicit: generating it belongs behind enrolment only, and it fails
 *      closed on a machine without a working keyring, which a solo person
 *      may well be on). The solo identity is its own key.
 *   4. The key is a credential: no log line interpolates it, only keyTail.
 *   5. Nothing is written before the fingerprint the server echoes is checked
 *      against one derived from OUR key.
 */
const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const read = (p) => readFileSync(join(__dirname, '..', p), 'utf8');
const preload = read('src/preload/index.ts');
const main = read('src/main/index.ts');
const store = read('src/main/soloLicense.ts');
const contract = read('src/shared/soloPro.ts');

test('preload implements every door SoloProBridge declares, by name', () => {
  const iface = contract.slice(contract.indexOf('export interface SoloProBridge'));
  const doors = [...iface.slice(0, iface.indexOf('}')).matchAll(/^\s{2}(\w+)\(/gm)].map((m) => m[1]);
  assert.deepEqual(doors.sort(), ['onSoloLicense', 'soloLicense', 'soloRedeemLicense'].sort(), 'the contract still names three doors');
  for (const d of doors) assert.match(preload, new RegExp(`\\b${d}:`), `preload is missing ${d}`);
  assert.match(preload, /soloLicense: .*ipcRenderer\.invoke\('solo:license'\)/s);
  assert.match(preload, /soloRedeemLicense: \(key: string\).*ipcRenderer\.invoke\('solo:license:redeem', key\)/s);
  assert.match(preload, /ipcRenderer\.on\('solo:license', listener\)/);
});

test('main handles both channels and pushes changes to the window', () => {
  assert.match(main, /ipcMain\.handle\('solo:license', \(\) => soloLicense\.readLicense\(\)\)/);
  // 0.5.0: the handler became a block so it can fire `licence_activated` with
  // `source: 'key_entry'` — the two doors into redemption (a typed key and the
  // checkout return) are the same call, and `source` is the whole point of the
  // property, so it cannot be fired inside redeemLicense itself. What matters
  // here is unchanged and still asserted: main sanitises a non-string key and
  // returns the redemption's own result untouched.
  assert.match(main, /ipcMain\.handle\('solo:license:redeem', async \(_e, key: unknown\) => \{/);
  assert.match(main, /soloLicense\.redeemLicense\(typeof key === 'string' \? key : ''\)/);
  assert.match(main, /if \(res\.ok\) analytics\.trackFunnel\('licence_activated', \{ plan: 'pro', source: 'key_entry' \}\);\s*\n\s*return res;/);
  assert.match(main, /soloLicense\.onLicenseChange\(\(v\) => \{\s*if \(mainWindow && !mainWindow\.isDestroyed\(\)\) mainWindow\.webContents\.send\('solo:license', v\);/);
});

test('the solo path never touches the team device key', () => {
  assert.ok(!/getOrCreateIdentity/.test(store), 'the enrolment-only keypair must stay behind enrolment');
  assert.match(store, /from '\.\/deviceIdentity'/, 'only the pure fingerprint helper crosses over');
  assert.match(store, /import \{ fingerprintFor \} from '\.\/deviceIdentity';/);
  assert.match(store, /function soloDeviceKey\(\)/);
  assert.match(store, /generateKeyPairSync\('ed25519'\)/);
});

test('the key is a credential: logged as keyTail only, never interpolated whole', () => {
  for (const line of store.split('\n')) {
    if (!line.includes('console.log')) continue;
    assert.ok(!/\$\{key\}|\$\{record\.key\}/.test(line), `a log line carries the whole key: ${line.trim()}`);
    assert.match(line, /keyTail\(/, `a log line on this path must identify the key by its tail: ${line.trim()}`);
  }
  assert.ok(!/[?&]key=/.test(store), 'the key never rides a URL');
});

test('nothing is written before the echoed fingerprint is checked against our own', () => {
  const fn = store.slice(store.indexOf('export async function redeemLicense'));
  const check = fn.indexOf('fingerprintFor(publicKey)');
  const write = fn.indexOf('writeLicense(');
  assert.ok(check !== -1 && write !== -1, 'both sites exist in redeemLicense');
  assert.ok(check < write, 'the server\'s echo is verified before the record exists');
  assert.match(fn, /return \{ ok: false, error: 'refused', detail: 'The server answered for a different machine/);
});

test('the redemption goes to the console origin with the dev override, on the declared route', () => {
  assert.match(store, /export const LICENSE_ORIGIN = process\.env\.MD_LICENCE_ORIGIN \?\? 'https:\/\/harnessmd\.com';/);
  assert.ok(!/CONSOLE_ORIGIN/.test(store.slice(store.indexOf('LICENSE_ORIGIN'))), 'the API origin must not be the app host: it 301s a POST into a GET');
  assert.match(store, /fetch\(`\$\{LICENSE_ORIGIN\}\$\{LICENSE_ROUTES\.redeem\}`/);
  assert.match(store, /publicKey: b64ToB64url\(publicKey\)/, 'the wire wants base64url of the raw 32 bytes');
});

/* ---- the renewal question (5 Sep 2026) -------------------------------------
 * "if someone replaces the keys then older key should be inactive immediately"
 * (founder). The server was already immediate: revoke replaces the key hash
 * and unbinds the machine in one write. These pins hold the half that makes
 * the MACHINE hear it, because before recheckLicense existed the app never
 * asked again after redemption and a revoked key kept working forever.
 */

test('the app asks the renewal question: at start, then on a poll for the life of the process', () => {
  assert.match(store, /export async function recheckLicense\(\): Promise<RecheckOutcome>/);
  assert.match(store, /fetch\(`\$\{LICENSE_ORIGIN\}\$\{LICENSE_ROUTES\.check\}`/, 'the declared check route, same origin rules as redeem');
  assert.match(store, /export function startLicenseRecheckLoop\(\)/);
  // A setTimeout chain re-armed from the outcome, unref'd so the poll can
  // never hold the process open at quit; lapsed licences ask less often.
  assert.match(store, /outcome === 'lapsed' \? LICENSE_LAPSED_POLL_MS : LICENSE_POLL_MS/);
  assert.match(store, /timer\.unref\(\);/);
  const main = read('src/main/index.ts');
  assert.match(main, /soloLicense\.startLicenseRecheckLoop\(\);/, 'main starts the loop at ready');
});

test('a dead key deactivates this machine on the spot: no grace on a revoked credential', () => {
  const fn = store.slice(store.indexOf('export async function recheckLicense'));
  // 404/400 (revoked or replaced) and bound:false (moved) both clear the
  // record and notify, which is what throws the running renderer out of Pro.
  // But ONLY a refusal that speaks: the router's unknown-path 404 carries
  // detail null, and an older box without the check route must read as
  // unreachable, never as "your key is dead".
  assert.match(fn, /if \(res\.status === 404 \|\| res\.status === 400\) \{/);
  assert.match(fn, /if \(typeof refusal\?\.detail === 'string' && refusal\.detail\.trim\(\) !== ''\) \{\s*\n\s*deactivate\('no longer exists \(revoked or replaced\)'\);/);
  assert.match(fn, /\}\s*\n\s*return offline\(\);\s*\n\s*\}\s*\n\s*if \(!res\.ok\) return offline\(\);/,
    'a bare 404 is unreachable, not a verdict');
  assert.match(fn, /if \(v\.bound !== true\) \{\s*\n\s*deactivate\('is on another machine now'\);/);
  assert.match(fn, /const deactivate = \(why: string\): void => \{\s*\n\s*clearLicense\(\);\s*\n\s*notify\(\);/);
  // Offline and server trouble are NOT verdicts: the record survives them.
  assert.ok(!/catch \{[\s\S]{0,80}clearLicense/.test(fn), 'a network failure must never deactivate');
  // But a record past the staleness cap stops admitting NOW, not at relaunch:
  // the offline path re-notifies so every gate looks again.
  assert.match(fn, /if \(!licenceAdmits\(rec\)\) notify\(\);/);
});

test('admission is bounded by the staleness clock on both halves', () => {
  assert.match(store, /return v !== null && licenceAdmits\(v\);/, "main's hasLiveLicense respects the cap");
  const gate = read('src/shared/soloPro.ts');
  assert.match(gate, /return license !== null && licenceAdmits\(license, now\);/, 'the renderer gate respects the cap');
});

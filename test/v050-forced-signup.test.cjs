'use strict';

// v050-forced-signup (0.5.0 step 5). The state table was ruled on 6 Sep 2026:
//   Q1 (god): a live licence and a registered free account pass UNTOUCHED.
//   Q3 (god): the 14 day licence staleness cap stays as shipped.
//   Q2 (founder, PENDING): offline with neither record. There is deliberately
//   no R5c case in this file; nothing may be built for that row either way
//   until he rules.
//
// The load bearing finding behind the table: THE WALL ALREADY SHIPPED in
// 0.4.11 (App.tsx gate, REQUIRE_MEMBERSHIP). What this file adds is the row
// per row record of the ruled behaviour, and the two invariants that keep a
// hard wall from ever hiding behind a network call:
//   I1  admit is computed from DISK AND CLOCK ONLY: nothing the admit path
//       imports can reach the network. This is the pin that survives someone
//       refactoring a fetch in two releases from now.
//   I2  the wall is never RAISED by a server answer: a network failure is not
//       a verdict (the plane rule), only a server answer that NAMES the key
//       dead removes a record, and every gate action fetch times out visibly
//       instead of hanging.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const { licenceAdmits, LICENSE_STALE_MAX_MS } = loadTs('src/shared/licenseKey.ts');
const { proGateAdmits } = loadTs('src/shared/soloPro.ts');
const { freeAdmits } = loadTs('src/shared/freeTier.ts');

const NOW = Date.parse('2026-09-06T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60_000).toISOString();

test('R1: a live licence confirmed within the cap admits, and is asked nothing', () => {
  const rec = { state: 'healthy', checkedAt: daysAgo(1) };
  assert.equal(licenceAdmits(rec, NOW), true);
  assert.equal(proGateAdmits('solo', { ...rec, key: 'k', renewsAt: null, deviceLabel: 'd' }, NOW), true);
  // Q1: untouched means the gate consults the record and nothing else; there
  // is no forced sign up branch for an admitted machine anywhere in App.tsx.
  const app = read('src/renderer/src/App.tsx');
  assert.match(app, /!soloAdmitted && !freeAdmitted && !classicPaid/, 'every admitted state short circuits past the wall');
});

test('R2: a registered free account admits, with no expiry and no clock at all', () => {
  assert.equal(freeAdmits({ email: 'a@b.c', personId: 'p1', registeredAt: daysAgo(400) }), true);
  assert.equal(freeAdmits(null), false);
  // Free is an identity, not a subscription: the module owns no staleness.
  assert.equal(freeAdmits.length, 1, 'freeAdmits takes no clock');
  const code = read('src/shared/freeTier.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /Date\.now|STALE_/, 'no time rule hides in the free tier');
});

test('R3: the machine with neither record meets the way in, full window, nothing else', () => {
  const app = read('src/renderer/src/App.tsx');
  // The wall covers the onboarded 0.4.6 upgrader too, and renders the entry
  // doors; the free record path lands on the paywall instead.
  assert.match(app, /REQUIRE_MEMBERSHIP && config\.onboardingComplete && !soloAdmitted && !freeAdmitted && !classicPaid/);
  assert.match(app, /return <ProOnboarding entryOnly \/>;/);
  const teams = read('src/shared/teams.ts');
  assert.match(teams, /export const REQUIRE_MEMBERSHIP = true/);
});

test('R4: only a server answer that NAMES the key dead removes the record', () => {
  const solo = read('src/main/soloLicense.ts');
  const fn = solo.slice(solo.indexOf('export async function recheckLicense'), solo.indexOf('The loop:'));
  // The two deactivations: a spoken refusal, and bound moving elsewhere.
  assert.match(fn, /if \(typeof refusal\?\.detail === 'string' && refusal\.detail\.trim\(\) !== ''\) \{\s*deactivate\('no longer exists/);
  assert.match(fn, /if \(v\.bound !== true\) \{\s*deactivate\('is on another machine now'\)/);
  // Everything else is offline, and offline leaves the record alone.
  assert.match(fn, /catch \{\s*return offline\(\);/);
  assert.match(fn, /if \(!res\.ok\) return offline\(\);/);
  assert.match(fn, /a bare 404 would sign every\s*\n?\s*\/\/ licensed machine out of Pro/, 'the old-server 404 stays a non verdict');
});

test('R5a: the licence rides offline exactly 14 days, then stops admitting (Q3: kept as shipped)', () => {
  assert.equal(LICENSE_STALE_MAX_MS, 14 * 24 * 60 * 60_000);
  assert.equal(licenceAdmits({ state: 'healthy', checkedAt: daysAgo(13) }, NOW), true);
  assert.equal(licenceAdmits({ state: 'trialing', checkedAt: daysAgo(15) }, NOW), false);
});

test('R5b: a free machine offline is admitted forever, by construction', () => {
  // Same admit as R2: no clock input exists, so no offline duration can
  // change the answer. The zero network claim is I1 below.
  assert.equal(freeAdmits({ email: 'a@b.c', personId: 'p1', registeredAt: daysAgo(1000) }), true);
});

// R5c: ABSENT ON PURPOSE. Offline with neither record is the founder's Q2 and
// is unruled; this comment is the placeholder so the row is not forgotten.

test('R3 copy: the wall speaks to the person who never had an account (ruled 6 Sep 2026)', () => {
  const entry = read('src/renderer/src/components/pro/onboarding/EntryStep.tsx');
  // The wall variant swaps title and lead and adds the one line under the
  // options; fresh onboarding keeps its own copy.
  assert.match(entry, /t\(wall \? 'pro\.onboarding\.entry\.wallTitle' : 'pro\.onboarding\.entry\.title'\)/);
  assert.match(entry, /t\(wall \? 'pro\.onboarding\.entry\.wallLead' : 'pro\.onboarding\.entry\.lead'\)/);
  assert.match(entry, /\{wall && <Note>\{t\('pro\.onboarding\.entry\.wallSame'\)\}<\/Note>\}/);

  const flow = read('src/renderer/src/components/pro/onboarding/ProOnboarding.tsx');
  const wallBlock = flow.slice(flow.indexOf('if (entryOnly) {'), flow.indexOf('if (step === 0'));
  assert.match(wallBlock, /<EntryStep\s*\n\s*wall/, 'the gate renders the wall variant');
  // The back link ruling: a control that loops back to the same wall is worse
  // than no control, so it renders only when the free record would admit.
  assert.match(wallBlock, /\{freeAdmits\(free\) && \(/);
  assert.match(wallBlock, /pro\.onboarding\.entry\.backToClassic/);

  // The offline sentence is the ruled one, localized, and the hardcoded
  // English it replaced is gone.
  const freeFlow = read('src/renderer/src/components/team/onboarding/freeFlow.ts');
  assert.match(freeFlow, /i18n\.t\('pro\.onboarding\.entry\.wallOffline'\)/);
  assert.doesNotMatch(freeFlow, /The server could not be reached/);

  // The four strings exist in three locales, translated, without a dash.
  const DASH = /[–—]|\s-\s/;
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) =>
    [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
  for (const k of ['wallTitle', 'wallLead', 'wallSame', 'wallOffline']) {
    const key = `pro.onboarding.entry.${k}`;
    for (const l of Object.keys(locales)) {
      const v = locales[l].get(key);
      assert.ok(typeof v === 'string' && v.length > 0, `${key} in ${l}`);
      assert.ok(!DASH.test(v), `${key} (${l}) carries a dash`);
    }
    assert.notEqual(locales['zh-CN'].get(key), locales.en.get(key), `${key} zh-CN is the English string`);
    assert.notEqual(locales.ar.get(key), locales.en.get(key), `${key} ar is the English string`);
  }
  // The ruled sentences, verbatim, so a later "improvement" is a loud choice.
  assert.equal(locales.en.get('pro.onboarding.entry.wallTitle'), 'Set up an account to keep working');
  assert.equal(locales.en.get('pro.onboarding.entry.wallOffline'), 'Signing in needs the internet. Your work is safe on this machine. Reconnect and try again.');
});

test('I1: the admit path imports nothing that can reach the network', () => {
  // Walk the shared admit modules transitively (shared imports shared only)
  // and refuse every network capable surface. THIS is the pin god asked for:
  // it fails the day someone refactors a fetch into the decision path.
  const seen = new Set();
  const queue = ['src/shared/soloPro.ts', 'src/shared/freeTier.ts', 'src/shared/licenseKey.ts', 'src/shared/teams.ts'];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const src = read(file);
    assert.doesNotMatch(src, /\bfetch\s*\(/, `${file} calls fetch`);
    assert.doesNotMatch(src, /from '(electron|https?|node:https?|node:net|node:dgram|undici|axios)'/, `${file} imports a network surface`);
    for (const m of src.matchAll(/from '(\.[^']*)'/g)) {
      const rel = m[1];
      const dir = path.dirname(file);
      let target = path.join(dir, rel);
      if (!target.endsWith('.ts')) target += '.ts';
      if (fs.existsSync(path.join(ROOT, target))) queue.push(target);
    }
  }
  assert.ok(seen.size >= 4, `walked ${seen.size} modules`);
});

test('I2: every gate action fetch times out visibly instead of hanging', () => {
  // R6: the wall is never raised by a server answer, and a slow box may delay
  // a sign up but must never turn a door into a spinner.
  const pins = [
    ['src/main/freeAccount.ts', 1],   // the grant spend behind the way in
    ['src/main/soloLicense.ts', 2],   // redeem and recheck
    ['src/main/relay.ts', 2]          // the nonce and every signed call (enrol)
  ];
  for (const [file, count] of pins) {
    const src = read(file);
    const fetches = (src.match(/await fetch\(/g) ?? []).length;
    const timeouts = (src.match(/AbortSignal\.timeout\(15_000\)/g) ?? []).length;
    assert.equal(fetches, count, `${file}: ${fetches} fetches, expected ${count}; a new one needs its own timeout`);
    assert.equal(timeouts, count, `${file}: every fetch carries AbortSignal.timeout(15_000)`);
  }
});

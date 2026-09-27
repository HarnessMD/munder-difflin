'use strict';

/**
 * SOLO PRO (founder, 4 Sep 2026): the app runs for one person with a license
 * key, and the two features he named as team only are absent rather than
 * refused.
 *
 * This reverses half of the 3 September membership ruling, so the tests that
 * matter most here are the ones that pin what did NOT move:
 *
 *   - a machine with a membership is on exactly the branch it was on;
 *   - a `locked` machine is never admitted, whatever else is true. That is the
 *     way this change goes wrong: a revoked seat forgets its identity, the
 *     gate reads `solo`, and the person keeps working. `proGateAdmits` refuses
 *     `locked` outright and this file is what stops that regression coming
 *     back;
 *   - Classic's D1 is for individuals and for teams (5 Sep 2026, second
 *     pass); the accountless way in stays dead.
 *
 * The rules are all in src/shared/soloPro.ts precisely so they can be checked
 * here without React. What has to be structural (a branch in App.tsx, a
 * section in a sidebar) is checked as text, and each of those says what the
 * guarantee is rather than what the code looks like.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const solo = loadTs('src/shared/soloPro.ts');
const perms = loadTs('src/shared/permissions.ts');
const licenseKey = loadTs('src/shared/licenseKey.ts');
const nav = loadTs('src/renderer/src/components/pro/proNav.ts');

const OB = 'src/renderer/src/components/pro/onboarding';
const app = read('src/renderer/src/App.tsx');
const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');

/** A license record in whatever state, with the fields the view declares.
 *  `checkedAt` is FRESH on purpose: since 5 Sep 2026 admission also requires
 *  the record to have been confirmed within LICENSE_STALE_MAX_MS, and a fixed
 *  date here would time-bomb every gate assert two weeks later. Staleness has
 *  its own tests below, driven through the explicit `now` parameter. */
const licence = (state) => ({
  key: 'MDS-00000-00000-00000', state, renewsAt: null, deviceLabel: null,
  checkedAt: new Date().toISOString()
});

/* ---- 1. who gets in ------------------------------------------------------ */

test('a member is admitted exactly as before, licence or no licence', () => {
  for (const mode of ['live', 'degraded']) {
    assert.equal(solo.proGateAdmits(mode, null), true, `${mode} with no licence`);
    assert.equal(solo.proGateAdmits(mode, licence('healthy')), true, `${mode} with one`);
  }
});

test('THE REGRESSION GUARD: a locked machine is never admitted, not even holding a live licence', () => {
  // A removed member presses "enter a new code", main forgets the identity,
  // and the gate reads `solo` a moment later. If the licence check were the
  // only thing between that machine and the app, a revoked seat would walk
  // straight back in. `locked` is refused before the licence is even read.
  assert.equal(solo.proGateAdmits('locked', null), false);
  assert.equal(solo.proGateAdmits('locked', licence('healthy')), false);
  assert.equal(solo.proGateAdmits('locked', licence('trialing')), false);
});

test('solo and enrolling are admitted by a live licence and by nothing else', () => {
  for (const mode of ['solo', 'enrolling']) {
    assert.equal(solo.proGateAdmits(mode, null), false, `${mode} with no licence is the 3 Sep behaviour`);
    assert.equal(solo.proGateAdmits(mode, licence('healthy')), true);
    assert.equal(solo.proGateAdmits(mode, licence('trialing')), true);
    // Not yet paid, and no longer paid. Both are the way in again, not the app.
    assert.equal(solo.proGateAdmits(mode, licence('awaiting-card')), false);
    assert.equal(solo.proGateAdmits(mode, licence('cancelled')), false);
    assert.equal(solo.proGateAdmits(mode, licence('payment-failed')), false);
  }
});

test('a live licence stops admitting once the server has not confirmed it for two weeks', () => {
  // 5 Sep 2026: `licenceIsLive` alone let a revoked key coast forever on a
  // machine that simply never asked again (or was kept offline). Admission now
  // has a clock: live AND confirmed within LICENSE_STALE_MAX_MS.
  const DAY = 24 * 60 * 60_000;
  const at = Date.parse('2026-09-05T10:00:00.000Z');
  const rec = { ...licence('healthy'), checkedAt: '2026-09-05T10:00:00.000Z' };
  assert.equal(licenseKey.LICENSE_STALE_MAX_MS, 14 * DAY, 'the allowance is the contract 6.1 cancelled grace, product-wide');
  assert.equal(solo.proGateAdmits('solo', rec, at + 13 * DAY), true, 'thirteen days offline is a trip');
  assert.equal(solo.proGateAdmits('solo', rec, at + 15 * DAY), false, 'fifteen days unconfirmed is refused');
  // A member is never subject to the licence clock; their gate is the org's.
  assert.equal(solo.proGateAdmits('live', rec, at + 15 * DAY), true);
  // An unreadable date refuses: an admission record you cannot date is one a
  // machine should refuse, not guess at.
  assert.equal(licenseKey.licenceAdmits({ state: 'healthy', checkedAt: 'not-a-date' }), false);
  // A dead state stays refused however fresh the check.
  assert.equal(licenseKey.licenceAdmits({ state: 'cancelled', checkedAt: new Date().toISOString() }), false);
});

test('the solo gate and the org gate agree on what paid means', () => {
  // One vocabulary, one rule: `licenceIsLive` mirrors `isEntitled`, and this
  // is where a change to one without the other shows up.
  const billing = loadTs('src/shared/billing.ts');
  for (const state of ['awaiting-card', 'trialing', 'healthy', 'payment-failed', 'cancelled']) {
    assert.equal(
      solo.proGateAdmits('solo', licence(state)),
      billing.isEntitled(state),
      `solo and org disagree on ${state}`
    );
  }
});

/* ---- 2. what exists ------------------------------------------------------ */

test('a solo install has no team destination, no Team knowledge, and one offer', () => {
  const d = solo.navFor('solo');
  assert.deepEqual([...d.companyRows], []);
  assert.equal(d.teamKnowledge, false);
  assert.equal(d.offerTeams, true);
  assert.equal(d.ownLicense, true);
});

test('a member and an admin keep both destinations and Team knowledge, and are never offered an upgrade', () => {
  for (const standing of ['member', 'admin']) {
    const d = solo.navFor(standing);
    assert.deepEqual([...d.companyRows], [solo.TEAM_ROW, solo.REQUESTS_ROW], standing);
    assert.equal(d.teamKnowledge, true, standing);
    assert.equal(d.offerTeams, false, standing);
    assert.equal(d.ownLicense, false, standing);
  }
});

test('the nav is composed from can(), not from a second copy of the table', () => {
  // The proof: every permission the nav treats as "network" or "knowledge" is
  // false for solo and true for somebody, so the nav cannot be right by
  // accident, and moving a permission between families in permissions.ts is
  // the only way to move the nav.
  for (const p of [...perms.NETWORK_PERMS, ...perms.KNOWLEDGE_PERMS]) {
    assert.equal(perms.can('solo', p), false, `${p} is reachable solo`);
    assert.ok(perms.can('admin', p) || perms.can('member', p), `${p} is reachable by nobody`);
    assert.equal(perms.isTeamOnly(p), true, `${p} is not marked team only`);
  }
  assert.equal(perms.isTeamOnly('billing.view'), false, 'billing is admin only, not team only');
});

test('the two families and billing cover the permission union exactly', () => {
  const covered = [...perms.NETWORK_PERMS, ...perms.KNOWLEDGE_PERMS, 'billing.view'].sort();
  assert.deepEqual(covered, [...perms.PERMS].sort(),
    'a permission joined the union without a family, so the nav has no opinion about it');
});

test('rows and panes are filtered by the same answer, so they cannot disagree', () => {
  const rows = [{ id: 'team' }, { id: 'requests' }];
  const panes = { team: 1, requests: 2, thread: 3, org: 4 };
  assert.deepEqual(solo.keepCompanyRows('solo', rows), []);
  assert.deepEqual(solo.keepCompanyPanes('solo', panes), {},
    'a solo install must not be able to navigate to a team pane either');
  assert.deepEqual(solo.keepCompanyRows('member', rows), rows);
  assert.deepEqual(solo.keepCompanyPanes('member', panes), panes);
  // PRO reads the same function through proNav, which is the point of it.
  assert.deepEqual(nav.proCompanyRows('solo', rows), []);
  assert.deepEqual(nav.proCompanyRows('admin', rows), rows);
  assert.deepEqual(nav.proDestinations('solo'), solo.navFor('solo'));
});

/* ---- 3. the licence key -------------------------------------------------- */

test('the key shape is licenseKey.ts and nothing here re-implements it', () => {
  const body = strip(read('src/shared/soloPro.ts'));
  assert.ok(!/ALPHABET|[0-9A-Z]{16,}/.test(body), 'soloPro grew its own key alphabet');
  assert.ok(!/function checksum|checksumOf\s*\(/.test(body), 'soloPro grew a second checksum');
  assert.match(read('src/shared/soloPro.ts'), /from '\.\/licenseKey'/,
    'soloPro must compose with the shared key module');
});

test('the field problems listed here are exactly the ones licenseKey can report', () => {
  const declared = [...read('src/shared/licenseKey.ts')
    .match(/export type LicenseProblem =([\s\S]*?);/)[1]
    .matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  assert.equal(declared.length, 6, 'the parser and the union disagree');
  assert.deepEqual([...solo.LICENSE_PROBLEMS].sort(), declared.sort());
});

test('every refusal a person can meet has copy, in all three locales', () => {
  for (const lang of ['en', 'zh-CN', 'ar']) {
    const dict = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`));
    const at = (k) => k.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), dict);
    for (const p of solo.LICENSE_PROBLEMS) {
      assert.equal(typeof at(`pro.onboarding.license.problem.${p}`), 'string', `${lang}: problem ${p}`);
    }
    for (const e of solo.LICENSE_REDEEM_ERRORS) {
      assert.equal(typeof at(`pro.onboarding.license.error.${e}`), 'string', `${lang}: error ${e}`);
    }
  }
});

test('the two words never cross: solo copy says licence, team copy says invite', () => {
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const all = new Map(flat(en));
  // The one place each is allowed to name the other is the field that tells a
  // person which key they are holding. Everything else keeps its own word.
  const CROSSING = new Set([
    'pro.onboarding.license.problem.looks-like-invite',
    'pro.onboarding.join.isLicenseKey',
    'pro.onboarding.join.useLicenseKey'
  ]);
  for (const [k, v] of all) {
    if (CROSSING.has(k) || typeof v !== 'string') continue;
    if (k.startsWith('pro.onboarding.license.')) {
      assert.ok(!/\b(invite|seat|seats)\b/i.test(v), `${k} uses team language: ${v}`);
    }
    if (k.startsWith('pro.onboarding.join.')) {
      assert.ok(!/\blicen[cs]e\b/i.test(v), `${k} uses solo language: ${v}`);
    }
  }
});

test('the console link is the solo one, built from the shared origin', () => {
  const links = loadTs('src/shared/consoleLinks.ts');
  assert.equal(solo.soloConsoleUrl(), `${links.CONSOLE_ORIGIN}/console/license`);
  assert.equal(solo.soloConsoleUrl('https://dev.example.com/'), 'https://dev.example.com/console/license');
  // Not one of the ORG's console pages: a solo person has no members page.
  assert.notEqual(solo.soloConsoleUrl(), links.consoleUrl('billing'));
});

/* ---- 4. the seams are named as rulings ----------------------------------- */

test('both rulings are in one file and both say whose they are and when', () => {
  const shared = read('src/shared/teams.ts');
  assert.match(shared, /export const REQUIRE_MEMBERSHIP = true; \/\/ founder ruling, 3 Sep 2026/,
    'the membership gate lost its ruling marker, or was switched off');
  assert.match(shared, /export const SOLO_PRO = (true|false); \/\/ founder ruling, 4 Sep 2026/,
    'the solo plan lost its ruling marker');
  // The 3 September wording is kept as history, not deleted, so the next
  // person to read this knows the rule moved and what it used to be.
  assert.match(shared, /WHAT THE RULING SAID ON 3 SEP/);
  assert.match(shared, /there is no "set up on my own" door any more/);
  assert.match(shared, /WHAT IT SAYS SINCE 4 SEP 2026/);
});

/* ---- 5. the gate in App.tsx ---------------------------------------------- */

test('App.tsx: the lock takes the window before anything asks about solo', () => {
  const lock = app.indexOf("if (LOCK_APP_ON_REVOKE && teamsMode === 'locked')");
  const gate = app.indexOf('REQUIRE_MEMBERSHIP && config.onboardingComplete');
  assert.ok(lock > 0, 'the lock branch is missing');
  assert.ok(gate > lock, 'the solo gate must come after the lock, never before it');
  assert.match(app, /return skin === 'professional' \? <ProTakeover \/> : <TeamsLock \/>;/,
    'the takeover is unchanged');
});

test('App.tsx: the gate admits a licensed PRO machine, a free Classic machine, and no other solo machine', () => {
  assert.match(app, /const soloAdmitted = SOLO_PRO && skin === 'professional' && proGateAdmits\(teamsMode, license\);/);
  // 5 Sep 2026 (the free tier): the wall now also asks the free record, which
  // admits CLASSIC only and `solo` only. `locked` still meets the takeover
  // long before this line, and a free record must never change that.
  const gate = app.indexOf("REQUIRE_MEMBERSHIP && config.onboardingComplete && !soloAdmitted && !freeAdmitted && !classicPaid && (teamsMode === 'solo' || teamsMode === 'enrolling')");
  assert.ok(gate > 0, 'the gate branch is missing from App.tsx');
  const branch = app.slice(gate, app.indexOf('}\n\n', gate));
  // 5 Sep 2026 (third pass): the gate screens are skin-free. A signed-in
  // unpaid machine meets the PAYWALL, whose continue-free action flips to
  // Classic; a machine with no account meets the same two doors step one has.
  // 0.5.0: the line also carries `trigger`, for `paywall_shown`. `onFree` is
  // still pinned first and the branch is still the paywall — the assertion is
  // widened by exactly the props that were added, not loosened to "a Paywall
  // somewhere", so it still fails if this branch stops flipping to Classic.
  assert.match(branch, /if \(freeAdmits\(free\)\) return <Paywall onFree=\{\(\) => setAppSkin\('office'\)\}[^>]*\/>;/,
    'signed in and unpaid is the paywall');
  assert.match(branch, /return <ProOnboarding entryOnly \/>;/, 'no account is the two doors, on any skin');
  const picker = app.indexOf('<HivePicker');
  assert.ok(picker > 0 && gate < picker, 'the gate must still sit before the first screen of the app proper');
});

test('App.tsx: the window waits for both records rather than flashing the way in', () => {
  // 5 Sep 2026 (third pass): the door screens read the free record on every
  // skin now, so ONE hold waits for both answers, one IPC trip each.
  assert.match(app, /if \(\(!licenseKnown \|\| !freeKnown\) && \(teamsMode === 'solo' \|\| teamsMode === 'enrolling'\)\) \{/);
});

test('App.tsx: the shell is handed only the destinations this standing has', () => {
  assert.match(app, /companyRows=\{keepCompanyRows\(standing, teamRows\)\}/);
  assert.match(app, /extraPanes=\{keepCompanyPanes\(standing, teamsPanes\(inOrg\)\)\}/);
});

/* ---- 6. the sidebar ------------------------------------------------------ */

test('a solo sidebar has no Team section at all, not a disabled row', () => {
  const body = strip(sidebar);
  assert.match(body, /const rowsForStanding = proCompanyRows\(standing, companyRows\);/);
  assert.match(body, /\{rowsForStanding\.length > 0 && \(/,
    'the TEAM label and its rows must be absent together');
  assert.ok(!/disabled/.test(body.slice(body.indexOf('pro.section.team'), body.indexOf('pro.section.team') + 800)),
    'a greyed out team row is exactly what the founder ruled out');
  assert.ok(!/isAdmin/.test(body), 'the sidebar must not read isAdmin directly');
});

test('the drop-up offers a solo person their licence and one upgrade, through the one answer', () => {
  const body = strip(sidebar);
  assert.match(body, /const dest = proDestinations\(standing\);/);
  assert.match(body, /\{dest\.ownLicense && \(\s*<MenuRow[^>]*label=\{t\('pro\.menu\.license'\)\}/,
    'the licence row is drawn for a solo install');
  assert.match(body, /soloConsoleUrl\(\)/, 'and it opens the solo console, not the org one');
  assert.match(body, /\{dest\.offerTeams && \(\s*<MenuRow[^>]*label=\{t\('pro\.menu\.upgrade'\)\}/,
    'the upgrade row is drawn for a solo install');
  assert.match(body, /can\(standing, 'billing\.view'\) && \(/, 'the billing row is still gated by can()');
  // The offer opens the ONE place it is made, not a Team screen the install
  // does not have.
  assert.match(body, /setOffer\(true\)/);
  assert.match(body, /<ProUpgradeToTeams onSetUpTeam=/);
});

/* ---- 7. onboarding ------------------------------------------------------- */

test('step one has two doors, the join and the SIGN-IN, and the gate screen is the same two doors', () => {
  const flow = strip(read(`${OB}/ProOnboarding.tsx`));
  assert.match(flow, /if \(entryOnly\) \{/);
  assert.match(flow, /<EntryStep\s+step=\{0\}/, 'step one is the entry step, not the join');
  assert.match(flow, /onJoined=\{\(r\) => \{ setEntry\(\{ path: 'team', orgName: r\.org\.name \}\); setStep\(1\); \}\}/);
  assert.match(flow, /onLicensed=\{\(\) => \{ setEntry\(\{ path: 'solo', orgName: '' \}\); setStep\(1\); \}\}/);
  const entry = strip(read(`${OB}/EntryStep.tsx`));
  assert.match(entry, /<JoinStep/);
  // 5 Sep 2026 (third pass, freemium): the solo door is the free SIGN-IN,
  // never a key up front. LicenseStep moved to the paywall and must not be
  // reachable from the entry.
  assert.match(entry, /<FreeSignInStep/);
  assert.ok(!/LicenseStep/.test(entry), 'the entry asks nobody for a licence key');
  assert.equal((entry.match(/<PathCard/g) || []).length, 2, 'exactly two doors');
  const signin = strip(read(`${OB}/FreeSignInStep.tsx`));
  assert.match(signin, /useFreeFlow/, 'one free sign-in flow across both frames');
  // A pasted code must have a visible way to submit (5 Sep 2026: it had only
  // an invisible Enter): the primary follows the field's content.
  assert.match(signin, /if \(hasCode\) free\.paste\(pasted\.trim\(\)\); else free\.begin\(\);/);
});

test('the solo path is a real path: it validates, redeems and moves on', () => {
  const step = strip(read(`${OB}/LicenseStep.tsx`));
  assert.match(step, /const check = checkLicense\(raw\);/, 'the field refuses before the server does');
  assert.match(step, /const res = await redeemLicense\(check\.key\);/);
  assert.match(step, /if \(res\.ok\) \{ setActive\(true\); return; \}/);
  assert.match(step, /soloConsoleUrl\(\)/, 'and the console is one press away');
  assert.ok(!/\bTODO\b|coming soon|lorem/i.test(step), 'no placeholder on a paid path');
  // The redemption is main's, declared and not faked here.
  const store = strip(read(`${OB}/soloLicense.ts`));
  assert.match(store, /if \(!api\?\.soloRedeemLicense\) \{\s*return \{ ok: false, error: 'unavailable', detail: null \};/,
    'a missing bridge must report an honest absence, never a fake success');
  assert.ok(!/Math\.random|setTimeout\(\s*\(\)\s*=>\s*.*ok: true/.test(store), 'no simulated redemption');
});

test('the invite field says which key you are holding rather than eating two characters of it', () => {
  const join = strip(read(`${OB}/JoinStep.tsx`));
  assert.match(join, /if \(clean\.startsWith\(LICENSE_PREFIX\)\) return '';/,
    'MDS must not be treated as an MD prefix plus a body');
  assert.match(join, /\{t\('pro\.onboarding\.join\.isLicenseKey'\)\}/);
  assert.match(join, /\{onLicenseKey && <Btn size="sm" onClick=\{onLicenseKey\}>/,
    'and the door they actually want is one press away');
});

test('the upgrade card names the two things a team adds, and they are the two families', () => {
  const card = strip(read(`${OB}/ProUpgradeToTeams.tsx`));
  assert.match(card, /t\('pro\.upgrade\.network'\)/);
  assert.match(card, /t\('pro\.upgrade\.knowledge'\)/);
  assert.ok(!/onJoinExisting/.test(card), 'PRO does not draw the button whose handler does nothing');
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
  assert.equal(en.pro.upgrade.knowledge, 'Team knowledge');
});

/**
 * THE FREE TIER (founder ruling, 5 Sep 2026): the current Classic, minus
 * everything team and everything PRO, admitted by an IDENTITY on disk that a
 * console sign-in wrote. This file holds the rules and the structure, because
 * the ways this feature goes wrong are exactly the old gate's ways plus two
 * new ones:
 *
 *   1. `locked` must never be rescued by a free record: a revoked seat that
 *      falls through into free Classic keeps working, which is the failure
 *      `proGateAdmits` was built to refuse. Free admits `solo` only.
 *   2. Free admits CLASSIC only. The professional skin still answers to the
 *      licence, or the free record would be a zero-rupee PRO key.
 *   3. The downgrade must not eat the upsell: the boot decision is one-shot
 *      and the live one requires having BEEN admitted, or a ModeSwitch flip
 *      to PRO would bounce straight back and the licence doors would be
 *      unreachable forever.
 *   4. The two deep link parsers must not accept each other's routes, or a
 *      crafted link steers a join into a free registration or the reverse.
 *
 * Rule tests run through test/load-ts.cjs; structure is pinned by source
 * shape, property-syntax regexes where a comment could disarm a bare word
 * (the d2401355 lesson).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const freeTier = loadTs('src/shared/freeTier.ts');

const app = read('src/renderer/src/App.tsx');
const mainSrc = read('src/main/index.ts');
const freeMain = read('src/main/freeAccount.ts');
const preload = read('src/preload/index.ts');
const rendererStore = read('src/renderer/src/store/freeAccount.ts');
const firstLaunch = read('src/renderer/src/components/team/onboarding/FirstLaunch.tsx');
const firstRunFlow = read('src/renderer/src/components/team/onboarding/FirstRunFlow.tsx');
const signInWait = read('src/renderer/src/components/team/onboarding/SignInWait.tsx');
const freeFlow = read('src/renderer/src/components/team/onboarding/freeFlow.ts');
const proOnboarding = read('src/renderer/src/components/pro/onboarding/ProOnboarding.tsx');

/* ---- 1. the record's rule ------------------------------------------------- */

test('freeAdmits: a person admits, absence and malformation refuse, an empty email still admits', () => {
  const view = { email: 'a@b.test', personId: 'clerk_x', registeredAt: new Date().toISOString() };
  assert.equal(freeTier.freeAdmits(view), true);
  assert.equal(freeTier.freeAdmits(null), false);
  assert.equal(freeTier.freeAdmits(undefined), false);
  // The capture happened server side at registration; the local email is
  // display data and must never lock out a person the server admitted.
  assert.equal(freeTier.freeAdmits({ ...view, email: '' }), true);
  assert.equal(freeTier.freeAdmits({ ...view, email: 42 }), false, 'a non-string email is a malformed record');
  assert.equal(freeTier.freeAdmits({ ...view, personId: '' }), false, 'no person, no admission');
  assert.equal(freeTier.freeAdmits({ ...view, personId: '   ' }), false);
});

/* ---- 2. the deep link ----------------------------------------------------- */

test('parseFreeDeepLink accepts exactly the free route, both spellings, and nothing else', () => {
  const g = 'ab'.repeat(32);
  const s = 'cd'.repeat(32);
  const parsed = freeTier.parseFreeDeepLink(`munderdifflin://free/register?grant=${g}&state=${s}`);
  assert.deepEqual(parsed, { action: 'free-register', grant: g, state: s });
  assert.deepEqual(freeTier.parseFreeDeepLink(`munderdifflin:free/register?grant=${g}&state=${s}`), parsed, 'the host-less spelling too');
  // The route IS the intent: the teams route must be refused here.
  assert.equal(freeTier.parseFreeDeepLink(`munderdifflin://teams/enrol?grant=${g}&state=${s}`), null);
  assert.equal(freeTier.parseFreeDeepLink(`https://free/register?grant=${g}&state=${s}`), null, 'wrong protocol');
  assert.equal(freeTier.parseFreeDeepLink(`munderdifflin://free/register?grant=nope&state=${s}`), null, 'grant must be 64 hex');
  assert.equal(freeTier.parseFreeDeepLink(`munderdifflin://free/register?grant=${g}`), null, 'state is required');
  assert.equal(freeTier.parseFreeDeepLink('not a url'), null);
});

test('the teams parser refuses the free route right back', () => {
  const teams = loadTs('src/shared/teams.ts');
  const g = 'ab'.repeat(32);
  const s = 'cd'.repeat(32);
  assert.equal(teams.parseTeamsDeepLink(`munderdifflin://free/register?grant=${g}&state=${s}`), null);
});

test('main routes the free deep link through the free parser, after the teams one', () => {
  assert.match(mainSrc, /const free = parseFreeDeepLink\(link\)/);
  assert.match(mainSrc, /freeAccount\.receiveFreeGrant\(\{ grant: free\.grant, state: free\.state \}, 'link'\)/);
  const handler = mainSrc.slice(mainSrc.indexOf('function handleDeepLink'));
  assert.ok(
    handler.indexOf('parseTeamsDeepLink') < handler.indexOf('parseFreeDeepLink'),
    'teams first: the established route keeps its position'
  );
});

/* ---- 3. main's half ------------------------------------------------------- */

test('free.json lives beside the other records, 0600, written only by main', () => {
  assert.match(freeMain, /join\(app\.getPath\('userData'\), 'teams', 'free\.json'\)/);
  assert.match(freeMain, /mode: 0o600/);
  // The record must round-trip through the admission rule on read, so a
  // hand-edited file refuses rather than admitting garbage.
  assert.match(freeMain, /freeAdmits\(parsed\) \? parsed : null/);
});

test('the free sign-in is its own flow: free intent on the URL, no enrol gate, no keyring', () => {
  assert.match(freeMain, /\$\{SIGNIN_URL\}\?state=\$\{state\}&intent=free/);
  // A free sign-in must not flip teamsMode to enrolling or touch the enrol
  // machinery: property pins on ABSENCE, stated as source facts.
  assert.ok(!/setEnrolling/.test(freeMain), 'the enrol gate is never touched');
  assert.ok(!/canStoreIdentity/.test(freeMain), 'free stores no credential, so no keyring check');
  assert.ok(!/generateKeyPairSync/.test(freeMain), 'free mints no device key');
});

test('registration spends the held grant once and writes only on the server saying who', () => {
  assert.match(freeMain, /const held = pending;\s*\n\s*pending = null;/, 'the grant is discarded before the network answers: single use either way');
  assert.match(freeMain, /\$\{LICENSE_ORIGIN\}\$\{FREE_REGISTER_ROUTE\}/);
  assert.match(freeMain, /typeof body\.email !== 'string' \|\| typeof body\.personId !== 'string'/, 'no write on a shapeless answer');
  assert.match(freeMain, /writeFreeAccount\(view\)/);
});

test('main exposes the five doors and pushes both signals', () => {
  for (const ch of ['free:account', 'free:signin:begin', 'free:signin:paste', 'free:signin:cancel', 'free:register']) {
    assert.match(mainSrc, new RegExp(`ipcMain\\.handle\\('${ch}'`), `main is missing ${ch}`);
  }
  assert.match(mainSrc, /freeAccount\.onFreeGrant\(\(\) => push\('free:signin:grant', null\)\)/);
  assert.match(mainSrc, /freeAccount\.onFreeAccountChange\(\(v\) =>/);
});

test('preload bridges every door the renderer store reads defensively', () => {
  for (const door of ['freeAccount:', 'onFreeAccount:', 'freeSignInBegin:', 'freeSignInPaste:', 'freeSignInCancel:', 'onFreeGrant:', 'freeRegister:']) {
    assert.ok(preload.includes(door), `preload is missing ${door.slice(0, -1)}`);
  }
  assert.match(rendererStore, /if \(!api\?\.freeAccount\) \{ set\(\{ free: null, known: true \}\); return; \}/,
    'a build without the bridge answers "no free account", known immediately');
});

/* ---- 4. the gate ---------------------------------------------------------- */

test('App: free admits Classic only, solo only, and the wall asks the free record and the paid one', () => {
  assert.match(app, /const freeAdmitted = skin !== 'professional' && teamsMode === 'solo' && freeAdmits\(free\)/);
  // 5 Sep 2026, second pass: a PAID individual is admitted into Classic too.
  // The licence bought the whole app; the paywall is never shown to a payer.
  assert.match(app, /const classicPaid = SOLO_PRO && skin !== 'professional' && teamsMode === 'solo' && proGateAdmits\(teamsMode, license\)/);
  assert.match(app, /!soloAdmitted && !freeAdmitted && !classicPaid && \(teamsMode === 'solo' \|\| teamsMode === 'enrolling'\)/);
  // Third pass: the wall is skin-free. Signed in and unpaid meets the
  // paywall; no account meets the entry doors.
  assert.match(app, /if \(freeAdmits\(free\)\) return <Paywall onFree=/, 'the signed-in wall is the paywall');
  assert.match(app, /return <ProOnboarding entryOnly \/>;/, 'the accountless wall is the two doors');
  // The one-trip hold for BOTH records, so nobody sees a door flash.
  assert.match(app, /\(!licenseKnown \|\| !freeKnown\) && \(teamsMode === 'solo' \|\| teamsMode === 'enrolling'\)/);
});

test('App: one onboarding for every fresh install, on any skin, and the sign-in lives inside it', () => {
  // 5 Sep 2026 (third pass): the Classic wizard chain no longer mounts from
  // the fresh path; ProOnboarding is THE onboarding, and its entry step
  // carries the sign-in (EntryStep -> FreeSignInStep).
  const branch = app.slice(app.indexOf('if (!config.onboardingComplete) {'), app.indexOf('<HivePicker'));
  assert.match(branch, /return <ProOnboarding onComplete=/);
  assert.ok(!/OnboardingWizard|FirstRunFlow/.test(branch), 'the old Classic chain is out of the fresh path');
  const entry = read('src/renderer/src/components/pro/onboarding/EntryStep.tsx');
  assert.match(entry, /<FreeSignInStep/);
  assert.ok(!/LicenseStep/.test(entry.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')),
    'no key ask at the entry: the key lives at the paywall');
});

test('App: the downgrade is one live transition, and the boot case is the paywall, never a silent flip', () => {
  // Third pass: the boot-time skin flip is GONE, because it would also have
  // eaten the fresh install's paywall. A key found dead at boot meets the
  // paywall at the gate; only a key dying mid-session flips the skin.
  assert.ok(!/bootRuled/.test(app), 'the boot flip stays retired');
  assert.match(app, /const wasAdmitted = useRef\(false\)/);
  assert.match(app, /wasAdmitted\.current && !admitted/, 'the live flip requires having BEEN admitted this session');
  const downgrades = [...app.matchAll(/setAppSkin\('office'\)/g)];
  assert.equal(downgrades.length, 2, 'exactly two office flips in App: the live downgrade and the paywall continue-free');
});

test('App: the focus mode button is back for the free standing, beside the switch, not instead of it', () => {
  assert.match(app, /\{freeAdmitted && \(/);
  const button = app.slice(app.indexOf('{freeAdmitted && ('), app.indexOf('<ModeSwitch />'));
  assert.match(button, /setFullscreen\(null\); return;/);
  assert.match(button, /x\.isGod && x\.ptyId/, 'falls back to god, then any live terminal');
  assert.match(button, /CollapseGlyph|ExpandGlyph/);
  assert.match(app, /function ExpandGlyph\(\)/);
  assert.match(app, /function CollapseGlyph\(\)/);
  assert.ok(app.indexOf('<ModeSwitch />') > app.indexOf('{freeAdmitted && ('), 'the switch is still there, after the button');
});

/* ---- 5. the door ---------------------------------------------------------- */

test('FirstLaunch splits into individuals and teams, and free lives behind the paywall skip', () => {
  // 5 Sep 2026, second pass: the "use it free" card is GONE. The split is for
  // individuals and for teams, and free is the paywall's skip after the
  // wizard, not a plan picked at the door.
  assert.match(firstLaunch, /onIndividuals: \(\) => void;\s*\n\s*onJoinTeam: \(\) => void;/);
  assert.match(firstLaunch, /t\('firstRun\.individuals\.title'\)/);
  assert.match(firstLaunch, /t\('firstRun\.teams\.title'\)/);
  assert.ok(!/onUseFree|firstRun\.free\./.test(firstLaunch), 'the free card is gone from D1');
  assert.match(firstRunFlow, /const free = useFreeFlow\(\)/);
  assert.match(firstRunFlow, /intent="free"/);
  const paywall = read('src/renderer/src/components/team/onboarding/Paywall.tsx');
  assert.match(firstRunFlow, /if \(onboarded\) \{\s*\n\s*return <Paywall onFree=\{free\.begin\} \/>;/);
  assert.match(paywall, /<LicenseStep/, 'one key field in the whole app: the paywall reuses LicenseStep');
  assert.match(paywall, /setAppSkin\('professional'\)/, 'a bought key lands in PRO');
  assert.match(paywall, /t\('paywall\.skip'\)/);
});

test('5 Sep 2026: the paywall is PRO chrome, and sells with the screens that exist', () => {
  // The founder rejected the first cut (a Classic dialog with two pixel
  // buttons). It is now the onboarding frame, wide, drawn from the kit.
  const paywall = read('src/renderer/src/components/team/onboarding/Paywall.tsx');
  assert.match(paywall, /<OnboardFrame\s*\n?\s*wide/);
  // Features and roadmap side by side when the window allows: the wall fits
  // a laptop window without a scroll (founder, 5 Sep 2026, second screenshot).
  assert.match(paywall, /gridTemplateColumns: 'repeat\(auto-fit, minmax\(400px, 1fr\)\)'/);
  const frame = read('src/renderer/src/components/pro/onboarding/OnboardFrame.tsx');
  assert.match(frame, /wide \? 'min\(1120px, 100%\)' : 'min\(520px, 100%\)'/);
  assert.match(paywall, /import \{ Btn, Card, Chip \} from '\.\.\/\.\.\/pro\/ui'/);
  assert.ok(!/PixelButton|PixelPanel|Centred/.test(paywall), 'the Classic dialog idiom came back');
  assert.deepEqual(paywall.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], [], 'the paywall carries a literal colour');
  // One tile per PRO screen a solo person gets, plus the orchestrator: a
  // tile that names a screen this build lacks would be a promise, not a sale.
  // TEN since 0.5.2 (founder, 9 Sep 2026): Agent rooms and the Stapler are
  // screens of their own that were never on the wall. The order is the
  // sidebar's, agents lifted to the front, and it is pinned because the copy
  // was written to be read in it.
  const TILES = ['orchestrator', 'agents', 'rooms', 'tasks', 'inbox', 'automations', 'memory', 'capabilities', 'stapler', 'temps'];
  for (const id of TILES) {
    assert.match(paywall, new RegExp(`\\{ id: '${id}', icon: '`), `the ${id} tile is missing`);
  }
  const tileAt = TILES.map((id) => paywall.indexOf(`{ id: '${id}', icon:`));
  assert.deepEqual([...tileAt].sort((a, b) => a - b), tileAt, 'the tiles are out of the order the copy was written in');
  assert.equal((paywall.match(/\{ id: '[a-z]+', icon: '/g) ?? []).length, TILES.length, 'a tile is on the wall that is not in the list');
  // The roadmap in the founder's order: Sandboxes, the Brain, mobile, growth.
  const order = ['sandboxes', 'brain', 'mobile', 'growth'].map((id) => paywall.indexOf(`{ id: '${id}', tone:`));
  assert.ok(order.every((i) => i >= 0), 'a roadmap stop is missing');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'the roadmap stops are out of the founder\'s order');
  // The two ways in and the way out: the console for a licence, the one
  // key field for a key already held, and skip as a plain ghost button.
  assert.match(paywall, /soloConsoleUrl\(\)/);
  assert.match(paywall, /kind="ghost" onClick=\{onFree\}/);
  // The plan line says the price and the machine rule, from the locales.
  assert.match(paywall, /t\('paywall\.price'\)/);
  assert.match(paywall, /t\('paywall\.oneMachine'\)/);
});

test('5 Sep 2026: the sidebar drop-up signs a solo person out, and says who and what plan, once each', () => {
  const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
  const profile = read('src/renderer/src/components/pro/ProfileScreen.tsx');
  const main = read('src/main/index.ts');
  const preload = read('src/preload/index.ts');
  const store = read('src/renderer/src/store/freeAccount.ts');
  const licence = read('src/main/soloLicense.ts');
  // The door, end to end: the drop-up row (solo only, two presses) calls the
  // store, the store the bridge, the bridge main, and main forgets BOTH
  // records through paths that notify, so the gate drops to the entry door.
  const row = sidebar.slice(sidebar.indexOf('{dest.ownLicense && (\n              <>'));
  assert.match(row, /signOutArmed \? t\('pro\.menu\.signOutConfirm'\) : t\('pro\.menu\.signOut'\)/);
  assert.match(row, /void freeDoor\.signOut\(\);/);
  assert.match(store, /freeSignOut\?\.\(\)/);
  assert.match(preload, /freeSignOut: \(\): Promise<\{ ok: true \}> => ipcRenderer\.invoke\('free:signout'\)/);
  assert.match(main, /ipcMain\.handle\('free:signout', \(\) => \{\s*\n\s*freeAccount\.cancelFreeSignIn\(\);\s*\n\s*freeAccount\.clearFreeAccount\(\);\s*\n\s*soloLicense\.forgetLicense\(\);/);
  assert.match(licence, /export function forgetLicense\(\): void \{\s*\n\s*clearLicense\(\);\s*\n\s*notify\(\);/);
  // "Solo · this machine" is gone from the sidebar and the profile: the
  // header says the place (org or plan), the row says the person (email).
  for (const [name, src] of [['ProSidebar', sidebar], ['ProfileScreen', profile]]) {
    assert.ok(!/t\('pro\.solo'\)|pro\.profile\.soloLine/.test(src), `${name} still says Solo · this machine`);
  }
  assert.match(sidebar, /const personLine = person\?\.email \|\| free\?\.email \|\| t\('pro\.profile\.emailUnknown'\)/);
  assert.match(sidebar, /const orgLine = org\?\.name \? `\$\{org\.name\} · Teams` : t\('pro\.plan\.pro'\)/);
  assert.match(profile, /const email = person\?\.email \|\| free\?\.email \|\| null/);
  // The offer row is named for what it is.
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
  assert.equal(en.pro.menu.upgrade, 'Munder Difflin for Teams');
  for (const loc of ['en', 'zh-CN', 'ar']) {
    const d = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    for (const k of ['signOut', 'signOutConfirm']) assert.equal(typeof d.pro.menu[k], 'string', `${loc} is missing pro.menu.${k}`);
    assert.equal(typeof d.pro.plan?.pro, 'string', `${loc} is missing pro.plan.pro`);
  }
});

test('SignInWait speaks for both intents through one component', () => {
  assert.match(signInWait, /intent\?: 'join' \| 'free'/);
  assert.match(signInWait, /firstRun\.freeSignin\.\$\{leaf\}/);
});

test('the free flow subscribes to the grant only while the door is open', () => {
  assert.match(freeFlow, /if \(stage !== 'signin'\) return;\s*\n\s*return freeDoor\.onGrant/);
});

test('the PRO entry wall carries the way back to Classic', () => {
  const wall = proOnboarding.slice(proOnboarding.indexOf('if (entryOnly) {'), proOnboarding.indexOf('if (step === 0'));
  assert.match(wall, /setAppSkin\('office'\)/);
  assert.match(wall, /pro\.onboarding\.entry\.backToClassic/);
});

/* ---- 6. the words --------------------------------------------------------- */

test('every locale carries the free door strings, and the subtitle stopped lying', () => {
  for (const loc of ['en', 'zh-CN', 'ar']) {
    const raw = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
      typeof v === 'object' && v !== null ? flat(v, p ? `${p}.${k}` : k) : [[p ? `${p}.${k}` : k, v]]);
    const map = new Map(flat(raw));
    for (const key of [
      'firstRun.individuals.title', 'firstRun.individuals.sub',
      'firstRun.teams.title', 'firstRun.teams.sub',
      'firstRun.freeSignin.title', 'firstRun.freeSignin.body', 'firstRun.freeSignin.accountNote',
      'paywall.title', 'paywall.body', 'paywall.haveKey', 'paywall.buy', 'paywall.skip',
      'paywall.price', 'paywall.oneMachine', 'paywall.features.title',
      ...['orchestrator', 'agents', 'rooms', 'tasks', 'inbox', 'automations', 'memory', 'capabilities', 'stapler', 'temps']
        .flatMap((id) => [`paywall.features.${id}.name`, `paywall.features.${id}.desc`]),
      'paywall.roadmap.title', 'paywall.roadmap.lead',
      ...['sandboxes', 'brain', 'mobile', 'growth']
        .flatMap((id) => ['when', 'status', 'title', 'desc'].map((leaf) => `paywall.roadmap.${id}.${leaf}`)),
      'pro.onboarding.entry.backToClassic'
    ]) {
      assert.ok(map.get(key), `${loc} is missing ${key}`);
    }
    assert.ok(!/team seat/i.test(map.get('firstRun.subtitle') ?? ''),
      `${loc}: the subtitle still claims the app runs on a team seat`);
  }
});

/* ---- 7. TRY PRO on the titlebar switch (5 Sep 2026) ----------------------- */

test('the free standing sees TRY PRO on the switch, lit, from the same gate as the Settings band', () => {
  const modeSwitch = read('src/renderer/src/components/pro/ModeSwitch.tsx');
  // The same four facts the Settings plans band reads, in the same expression,
  // so the switch and the band cannot disagree about who is free.
  assert.match(modeSwitch, /import \{ freeAdmits \} from '@shared\/freeTier'/);
  assert.match(modeSwitch, /import \{ proGateAdmits \} from '@shared\/soloPro'/);
  assert.match(modeSwitch, /const freeUser = skin !== 'professional' && teamsMode === 'solo'\s*\n\s*&& freeAdmits\(free\) && !proGateAdmits\(teamsMode, license\)/);
  assert.match(modeSwitch, /label: freeUser \? t\('mode\.tryPro'\) : t\('mode\.pro'\)/);
  // Lit on the PRO option only, for the free standing only, and only while
  // it is not the selected one: the selected pill keeps the accent it had.
  assert.match(modeSwitch, /const lit = freeUser && o\.value === 'professional' && !on;/);
  assert.match(modeSwitch, /background: on \? 'var\(--cth-accent\)' : lit \? /);
  assert.match(modeSwitch, /color-mix\(in srgb, var\(--cth-accent, var\(--cth-lemon\)\)/, 'Classic has no accent token, so the tint must fall back to its lemon');
  assert.ok(!/#[0-9A-Fa-f]{3,8}\b/.test(modeSwitch), 'a literal colour in the switch');
  // The hover hint on the lit pill is not "Switch to TRY PRO".
  assert.match(modeSwitch, /lit \? t\('mode\.tryProHint'\)/);
  assert.equal(JSON.parse(read('src/renderer/src/i18n/locales/en.json')).mode.tryPro, 'TRY PRO');
  for (const loc of ['en', 'zh-CN', 'ar']) {
    const d = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    for (const k of ['tryPro', 'tryProHint']) assert.equal(typeof d.mode[k], 'string', `${loc} is missing mode.${k}`);
    assert.ok(!/[–—]| - /.test(d.mode.tryPro + d.mode.tryProHint), `${loc}: a dash in the switch strings`);
  }
});

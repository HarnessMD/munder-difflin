'use strict';

/**
 * The gate with the lease in it (plan sections 2.3 and 5).
 *
 * Two clocks, kept apart on purpose. The lease's AGE is the relay's time at
 * the last proof against local time now: skew between the two is seconds
 * against thresholds of days. The TAMPER check compares the local clock only
 * with its own earlier reading, so a relay running ten minutes ahead cannot
 * lock an honest laptop, and a laptop set back an hour cannot extend its
 * lease. The one test that would fail under a naive cross-clock rule is
 * marked, and it is the control for the whole design.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-gate-'));
const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath, filename: electronPath, loaded: true,
  exports: {
    app: { getPath: () => userData },
    safeStorage: {
      isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => 'gnome_libsecret',
      encryptString: (s) => Buffer.from('SEALED:' + s, 'utf8'),
      decryptString: (b) => Buffer.from(b).toString('utf8').slice(7),
    },
  },
};

const identity = loadTs('src/main/deviceIdentity.ts');
const membership = loadTs('src/main/teamsMembership.ts');
const gate = loadTs('src/main/teamsGate.ts');

const H = 3600 * 1000;
const T0 = Date.parse('2026-09-01T12:00:00.000Z');
const iso = (ms) => new Date(ms).toISOString();

const row = (over = {}) => ({
  orgId: 'org_1', memberId: 'mem_1', deviceId: 'dev_' + 'A'.repeat(22), orgName: 'Dunder Mifflin',
  relayUrl: 'ws://127.0.0.1:4312/connect', enrolledAt: iso(T0 - 240 * H),
  lastVerifiedAt: iso(T0), lastVerifiedLocalAt: iso(T0), leaseSeconds: membership.LEASE_SECONDS, ...over,
});

test('leaseState: live under 24h, degraded past it, locked past 72h', () => {
  const m = row();
  assert.equal(gate.leaseState(m, T0 + 1 * H), 'live');
  assert.equal(gate.leaseState(m, T0 + 23.9 * H), 'live');
  assert.equal(gate.leaseState(m, T0 + 24.1 * H), 'degraded');
  assert.equal(gate.leaseState(m, T0 + 71.9 * H), 'degraded');
  assert.equal(gate.leaseState(m, T0 + 72.1 * H), 'locked');
  // The thresholds are the file's constants, not numbers copied into the gate.
  assert.equal(gate.leaseState(row({ leaseSeconds: 3600 }), T0 + 1.1 * H), 'locked');
});

test('the clock rule: local time behind its OWN last stamp locks; a relay clock ahead does not', () => {
  const m = row();
  // Set back six minutes: tampering, or a wildly wrong clock. Locked either way.
  assert.equal(gate.leaseState(m, T0 - 6 * 60 * 1000), 'locked');
  // Four minutes: inside the tolerance, and NTP does worse than that after sleep.
  assert.equal(gate.leaseState(m, T0 - 4 * 60 * 1000), 'live');
  assert.equal(gate.CLOCK_BACK_TOLERANCE_SECONDS, 5 * 60);
  // THE CONTROL. The relay's clock is ten minutes AHEAD of this machine, so
  // lastVerifiedAt (relay time) is later than local now. A naive "local <
  // lastVerifiedAt → locked" rule, which is what the plan literally says,
  // locks this honest laptop. The local stamp is why it does not.
  const ahead = row({ lastVerifiedAt: iso(T0 + 10 * 60 * 1000), lastVerifiedLocalAt: iso(T0) });
  assert.equal(gate.leaseState(ahead, T0 + 1000), 'live', 'relay skew locked an honest machine');
  // And the age is still measured on the relay's clock: ten minutes of skew
  // does not move a 24h threshold by more than ten minutes.
  assert.equal(gate.leaseState(ahead, T0 + 24 * H + 5 * 60 * 1000), 'live');
  assert.equal(gate.leaseState(ahead, T0 + 24 * H + 11 * 60 * 1000), 'degraded');
});

test('an unparseable last proof claims less: locked', () => {
  assert.equal(gate.leaseState(row({ lastVerifiedAt: 'never' }), T0), 'locked');
});

test('mode(): solo without both files, then live, degraded, locked from the lease, and back', async () => {
  membership.forgetMembership();
  identity.forgetIdentity();
  assert.equal(gate.mode(), 'solo');
  assert.equal(gate.lockInfo(), null);

  membership.writeMembership(row({ lastVerifiedAt: iso(Date.now()), lastVerifiedLocalAt: iso(Date.now()) }));
  assert.equal(gate.mode(), 'solo', 'a membership with no key is not a member');

  await identity.initCrypto();
  const pair = await identity.generateUnsaved();
  identity.saveIdentity(pair.publicKey, pair.privateKey);
  assert.equal(gate.mode(), 'live');
  assert.equal(gate.lockInfo(), null);

  membership.writeMembership(row({ lastVerifiedAt: iso(Date.now() - 30 * H), lastVerifiedLocalAt: iso(Date.now() - 30 * H) }));
  assert.equal(gate.mode(), 'degraded');
  assert.equal(gate.lockInfo(), null, 'degraded is not locked');

  membership.writeMembership(row({ lastVerifiedAt: iso(Date.now() - 80 * H), lastVerifiedLocalAt: iso(Date.now() - 80 * H) }));
  assert.equal(gate.mode(), 'locked');
  assert.deepEqual(gate.lockInfo(), {
    kind: 'lease', reason: null, orgName: 'Dunder Mifflin', lastVerifiedAt: membership.readMembership().lastVerifiedAt,
  });

  // A proof arrives (the socket's ready frame): live again, no ceremony.
  membership.touchVerified(iso(Date.now()));
  assert.equal(gate.mode(), 'live');
});

test('the relay\'s word outranks the lease: setRevoked locks, clearing it re-reads the lease', () => {
  membership.writeMembership(row({ lastVerifiedAt: iso(Date.now()), lastVerifiedLocalAt: iso(Date.now()) }));
  const seen = [];
  const off = gate.onChange((m) => seen.push(m));
  assert.equal(gate.mode(), 'live');
  gate.setRevoked('suspended');
  assert.equal(gate.mode(), 'locked');
  assert.deepEqual(gate.lockInfo(), { kind: 'revoked', reason: 'suspended', orgName: 'Dunder Mifflin', lastVerifiedAt: membership.readMembership().lastVerifiedAt });
  gate.setRevoked('suspended');
  assert.deepEqual(seen, ['locked'], 'the same word twice pushed twice');
  gate.setRevoked(null);
  assert.equal(gate.mode(), 'live');
  assert.deepEqual(seen, ['locked', 'live']);
  off();
});

test('enrolling outranks everything, and forget goes back to solo', () => {
  gate.setEnrolling(true);
  assert.equal(gate.mode(), 'enrolling');
  assert.equal(gate.lockInfo(), null);
  gate.setEnrolling(false);
  assert.equal(gate.mode(), 'live');
  membership.forgetMembership();
  identity.forgetIdentity();
  assert.equal(gate.mode(), 'solo');
});

test('the lease clock pushes when the answer changes and only then', async () => {
  membership.writeMembership(row({ lastVerifiedAt: iso(Date.now()), lastVerifiedLocalAt: iso(Date.now()) }));
  await identity.initCrypto();
  const pair = await identity.generateUnsaved();
  identity.saveIdentity(pair.publicKey, pair.privateKey);
  const seen = [];
  const off = gate.onChange((m) => seen.push(m));
  gate.startLeaseClock(10);
  // A QUIET WINDOW, not a wait: there is no event to wait for when the claim is
  // that nothing is pushed. A slow machine only makes this window cover fewer
  // ticks, which weakens the check and can never redden it. What underwrites it
  // is the wait below: that one proves the clock was alive the whole time, so
  // the silence here was a clock choosing not to push, not a clock asleep.
  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(seen, [], 'nothing changed and the clock pushed anyway');
  // Time passes: the file says the last proof was three days ago.
  membership.writeMembership(row({ lastVerifiedAt: iso(Date.now() - 80 * H), lastVerifiedLocalAt: iso(Date.now() - 80 * H) }));
  // WAIT FOR THE PUSH, do not sleep and hope one fitted. A 10 ms clock inside a
  // 60 ms sleep is six ticks on an idle machine and can be none on a loaded one.
  const pushed = Date.now() + 5000;
  while (seen.length === 0 && Date.now() < pushed) await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(seen, ['locked']);
  gate.stopLeaseClock();
  off();
  membership.forgetMembership();
  identity.forgetIdentity();
});

test('3.1 is a seam with a default, and it is named as a default', () => {
  const shared = fs.readFileSync(path.join(__dirname, '..', 'src/shared/teams.ts'), 'utf8');
  assert.match(shared, /export const LOCK_APP_ON_REVOKE = (true|false); \/\/ plan 3\.1, DEFAULT NOT RULING/,
    'the 3.1 seam lost its marker');
});

/* ---- the membership gate (founder ruling, 3 Sep 2026) --------------------
   The desktop does not run without a paid answer behind it. The gate already
   answers `solo`; these pin that `solo` on its own is not a way in.

   SCOPE, since 4 Sep 2026: PRO gained a second paid answer, a solo LICENSE
   KEY, and these tests were rewritten to say so where they had to. CLASSIC IS
   UNTOUCHED and the assertions below about it are unchanged: one door, the
   join, and no solo stage anywhere in its chain. */

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('REQUIRE_MEMBERSHIP is on, and named as a ruling, not a default', () => {
  assert.match(read('src/shared/teams.ts'), /export const REQUIRE_MEMBERSHIP = true; \/\/ founder ruling, 3 Sep 2026/,
    'the membership gate lost its ruling marker, or was switched off');
});

// REWRITTEN 4 Sep 2026. The founder reopened the solo door for PRO, so the
// gate no longer means "solo or enrolling is refused"; it means "no paid
// answer is refused", and a live LICENSE is now one of the two paid answers
// (`SOLO_PRO`, src/shared/teams.ts). Everything this test protected is still
// protected and one thing more: the branch still exists, still renders a way in
// rather than a message, still sits before the picker and before the first run
// branch, Classic still meets the join there, and the ONLY way a machine with
// no membership gets past it is `soloAdmitted`, which is PRO plus a live
// licence. See test/solo-pro.test.cjs for the truth table behind that word,
// including that it refuses `locked`.
test('App.tsx: an onboarded machine with no paid answer gets the way in, before the picker and the app', () => {
  const app = read('src/renderer/src/App.tsx');
  // 5 Sep 2026: the wall also asks the free record (`!freeAdmitted`), which is
  // Classic-and-solo only; the shape and position of the gate are unchanged.
  const gate = app.indexOf("REQUIRE_MEMBERSHIP && config.onboardingComplete && !soloAdmitted && !freeAdmitted && !classicPaid && (teamsMode === 'solo' || teamsMode === 'enrolling')");
  assert.ok(gate > 0, 'the gate branch is missing from App.tsx');
  const joins = app.slice(gate, app.indexOf('}\n\n', gate));
  // 5 Sep 2026 (third pass): the wall is skin-free. Signed in and unpaid is
  // the paywall; no account at all is the same two doors step one draws.
  assert.match(joins, /<Paywall onFree=/, 'the signed-in wall must be the paywall, not a message');
  assert.match(joins, /<ProOnboarding entryOnly \/>/, 'and the accountless wall the two doors, not a message');
  // The one exemption, spelled out where it is granted.
  assert.match(app, /const soloAdmitted = SOLO_PRO && skin === 'professional' && proGateAdmits\(teamsMode, license\);/,
    'the solo exemption must be PRO only and must go through proGateAdmits');
  const picker = app.indexOf('<HivePicker');
  assert.ok(picker > 0 && gate < picker, 'the gate must sit before the hive picker, which is the first screen of the app proper');
  // The pre-onboarding branch stays after the gate: ONE onboarding, any skin.
  const firstRun = app.indexOf('if (!config.onboardingComplete)');
  assert.ok(gate < firstRun, 'the gate must come before the first-run branch so both paths meet it');
  assert.match(app.slice(firstRun, picker), /<ProOnboarding onComplete=/);
});

test('the Classic D1 screens survive as harness fixtures only, and the accountless way in stays dead', () => {
  // 5 Sep 2026 (founder, third pass): ONE onboarding (ProOnboarding) mounts
  // for every fresh install, so FirstLaunch and FirstRunFlow are preview
  // harness fixtures now, not the product path (the App pins above hold the
  // product). They must still never re-grow the accountless way in, because a
  // fixture that models a dead ruling is how it creeps back.
  const launch = read('src/renderer/src/components/team/onboarding/FirstLaunch.tsx');
  assert.doesNotMatch(launch, /onSolo|onSignIn|firstRun\.solo|alreadySetUp/, 'FirstLaunch re-grew the accountless way in');
  assert.equal((launch.match(/<PathCard/g) || []).length, 2, 'D1 has exactly two cards');
  assert.match(launch, /onIndividuals/, 'and the first one is the individual path');
  const flow = read('src/renderer/src/components/team/onboarding/FirstRunFlow.tsx');
  assert.doesNotMatch(flow, /onDone\(\{\}\)/, 'FirstRunFlow still has the old solo stage');
  assert.match(flow, /useFreeFlow/, 'the free skip runs the console sign-in flow, not a local shortcut');
  assert.match(flow, /<Paywall onFree=/, 'the onboarded wall is the paywall');
  assert.ok(!fs.existsSync(path.join(__dirname, '..', 'src/renderer/src/components/team/onboarding/IndividualPath.tsx')),
    'IndividualPath.tsx should be deleted, not orphaned');
  for (const l of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    assert.equal(j.firstRun.solo, undefined, `${l}: firstRun.solo strings are dead`);
    assert.equal(j.firstRun.alreadySetUp, undefined, `${l}: firstRun.alreadySetUp is dead`);
  }
});

test('the entitlement lock tells the member what to do: an admin adds a card in the console', () => {
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
  assert.equal(en.team.revoked.entitlement.note, 'Ask your admin to add a card in the console.');
  assert.match(en.team.revoked.entitlement.body, /billing is not active/);
  // 5 Sep 2026 (second pass): the subtitle offers the two segments, for
  // yourself or with your team, and no longer names the invite code.
  assert.match(en.firstRun.subtitle, /yourself/);
});

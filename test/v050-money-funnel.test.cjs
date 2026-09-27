'use strict';

// The 0.5.0 MONEY FUNNEL (spec: hive/shared/v050-event-spec.md §2). Seven events:
// six in the app, one on the marketing site.
//
// WHAT THIS FILE EXISTS TO CATCH, and it is not a typo:
//
//   `track()` refuses anything outside the EVENTS allowlist, silently. A call
//   site without its allowlist entry compiles, runs, ships and emits NOTHING.
//   A green build cannot tell that apart from a working event, so every event
//   below is asserted to actually COME OUT of a booted Analytics through a fake
//   PostHog — not merely to be mentioned in the source.
//
// Three artefacts have to agree — the call site, the allowlist, and the public
// table in TELEMETRY.md — so all three are checked here, against each other.
//
// index.ts imports electron and cannot load under plain node, so its wiring is
// asserted against the source text, the same pattern the rest of the suite uses.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

globalThis.__POSTHOG_KEY__ = 'test-key';
globalThis.__POSTHOG_HOST__ = 'https://example.invalid';
delete process.env.DO_NOT_TRACK;

const captured = [];
class FakePostHog {
  capture(payload) { captured.push(payload); }
  async shutdown() {}
}
const posthogPath = require.resolve('posthog-node');
require.cache[posthogPath] = {
  id: posthogPath, filename: posthogPath, loaded: true, exports: { PostHog: FakePostHog }
};

const A = loadTs('src/main/analytics.ts');
const { Analytics, seatsBucket, isFunnelEvent, FUNNEL_EVENTS } = A;

const root = path.join(__dirname, '..');
const indexSrc = fs.readFileSync(path.join(root, 'src/main/index.ts'), 'utf8');
const telemetryMd = fs.readFileSync(path.join(root, 'TELEMETRY.md'), 'utf8');
const analyticsSrc = fs.readFileSync(path.join(root, 'src/main/analytics.ts'), 'utf8');
const siteHtml = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');

function booted() {
  const a = new Analytics();
  a.init({ stateDir: fs.mkdtempSync(path.join(os.tmpdir(), 'md-funnel-')), appVersion: '0.5.0', enabled: true });
  captured.length = 0; // drop first_run / app_launched
  return a;
}

/** Every event the six can legally send, with a legal value for each property. */
const LEGAL = {
  paywall_shown: { plan: 'pro', trigger: 'licence_missing' },
  checkout_opened: { plan: 'pro', seats_bucket: '2-5' },
  checkout_finished: { plan: 'teams', outcome: 'failed', reason: 'card_declined' },
  licence_activated: { plan: 'pro', source: 'checkout', period: 'annual' },
  access_blocked: { plan: 'teams', block: 'no_seat' },
  invite_redeemed: { role: 'admin' }
};

// ── 1. THE TRAP: each of the six really leaves the building ──────────────────

test('all six funnel events pass the allowlist and actually emit', () => {
  const a = booted();
  for (const [event, props] of Object.entries(LEGAL)) a.trackFunnel(event, props);

  assert.equal(captured.length, 6, 'one of the six was silently refused by the allowlist');
  const byEvent = Object.fromEntries(captured.map((c) => [c.event, c.properties]));
  for (const [event, props] of Object.entries(LEGAL)) {
    assert.ok(byEvent[event], `${event} never reached PostHog — missing EVENTS entry?`);
    for (const [k, v] of Object.entries(props)) {
      assert.equal(byEvent[event][k], v, `${event}.${k} did not survive track()`);
    }
  }
});

test('every funnel event stays anonymous, like every other event', () => {
  const a = booted();
  a.trackFunnel('licence_activated', LEGAL.licence_activated);
  const p = captured[0].properties;
  assert.equal(p.$process_person_profile, false);
  assert.equal(p.$ip, null);
  assert.equal(p.app_version, '0.5.0');
});

// ── 2. Values are checked, not just keys ─────────────────────────────────────

test('an unrecognised VALUE drops the whole event, not just the property', () => {
  const a = booted();
  a.trackFunnel('checkout_finished', { plan: 'pro', outcome: 'exploded', reason: 'other' });
  assert.equal(captured.length, 0, 'a free-form value reached PostHog');
});

test('checkout_finished does NOT carry period, on Ryan ruling 7 Sep', () => {
  // The property is either false (the browser owns the choice after the
  // hand-off) or redundant (checkout_opened already carries it and the two are
  // sequenceable on the install id). Dropping it is the ruling; this pins it,
  // because re-adding it would be a one-word edit that nothing else would catch.
  const a = booted();
  a.trackFunnel('checkout_finished', { plan: 'pro', outcome: 'succeeded', period: 'monthly' });
  assert.equal(captured.length, 0, 'period is no longer an allowed key on checkout_finished');
  assert.doesNotMatch(telemetryMd, /`checkout_finished` \| `plan`; `period`/);
});

test('an unrecognised KEY drops the whole event', () => {
  const a = booted();
  a.trackFunnel('licence_activated', { plan: 'pro', source: 'checkout', email: 'x@y.z' });
  assert.equal(captured.length, 0);
});

test('a property that belongs to another funnel event is refused', () => {
  const a = booted();
  // `block` is access_blocked's, not licence_activated's.
  a.trackFunnel('licence_activated', { plan: 'pro', block: 'no_seat' });
  assert.equal(captured.length, 0);
});

test('trackFunnel refuses an event outside the six', () => {
  const a = booted();
  a.trackFunnel('app_launched', {});
  a.trackFunnel('not_an_event', {});
  assert.equal(captured.length, 0);
  assert.equal(isFunnelEvent('app_launched'), false);
  assert.equal(isFunnelEvent('paywall_shown'), true);
  assert.equal(FUNNEL_EVENTS.length, 6);
});

// ── 3. seats_bucket is a bucket, never a number ──────────────────────────────

test('seatsBucket buckets on the spec boundaries', () => {
  assert.equal(seatsBucket(1), '1');
  assert.equal(seatsBucket(2), '2-5');
  assert.equal(seatsBucket(5), '2-5');
  assert.equal(seatsBucket(6), '6-20');
  assert.equal(seatsBucket(20), '6-20');
  assert.equal(seatsBucket(21), '21+');
  assert.equal(seatsBucket(4000), '21+');
  // Never throws, never invents a bucket the spec does not have.
  assert.equal(seatsBucket(0), '1');
  assert.equal(seatsBucket(null), '1');
  assert.equal(seatsBucket(undefined), '1');
  assert.equal(seatsBucket(Number.NaN), '1');
});

// ── 4. The three artefacts agree ─────────────────────────────────────────────

test('every funnel property has a value list, so nothing is key-checked only', () => {
  // The property names each event declares, read out of the allowlist source,
  // must all appear in FUNNEL_VALUES — otherwise trackFunnel would refuse a
  // legal event, or worse, let a free-form value through.
  for (const [event, props] of Object.entries(LEGAL)) {
    const a = booted();
    a.trackFunnel(event, props);
    assert.equal(captured.length, 1, `${event}: a declared property has no value list`);
  }
});

test('TELEMETRY.md lists all seven events and every enum value the code allows', () => {
  for (const event of FUNNEL_EVENTS) {
    assert.match(telemetryMd, new RegExp(`\`${event}\``), `TELEMETRY.md does not mention ${event}`);
  }
  // Every value in every closed enum is spelled out in the public table.
  const enums = [
    A.FUNNEL_PLANS, A.PAYWALL_TRIGGERS, A.CHECKOUT_PERIODS, A.SEATS_BUCKETS,
    A.CHECKOUT_OUTCOMES, A.CHECKOUT_REASONS, A.LICENCE_SOURCES, A.ACCESS_BLOCKS, A.INVITE_ROLES
  ];
  for (const list of enums) {
    for (const v of list) {
      assert.match(telemetryMd, new RegExp(`\`${v.replace(/[+]/g, '\\$&')}\``),
        `TELEMETRY.md does not list the value ${v}`);
    }
  }
});

test('TELEMETRY.md still promises no key, code, org, payment id or amount', () => {
  // Whitespace-tolerant: TELEMETRY.md is hard-wrapped prose, so any of these
  // phrases can be split across a line break at any time.
  const ws = (s) => new RegExp(s.split(' ').join('\\s+'), 'i');
  assert.match(telemetryMd, ws('no licence key or any part of one'));
  assert.match(telemetryMd, ws('no invite code'));
  assert.match(telemetryMd, ws('no payment or subscription id'));
  assert.match(telemetryMd, ws('never a number'));
});

// ── 5. The call sites are actually wired ─────────────────────────────────────

test('checkout_opened fires where the checkout is actually opened, and asserts no period', () => {
  const begin = indexSrc.slice(indexSrc.indexOf("ipcMain.handle('pro:checkout:begin'"));
  // The CALL, exactly: plan and the one-seat fact, and no period (0.5.1).
  assert.match(begin.slice(0, 1200), /trackFunnel\('checkout_opened', \{ plan: 'pro', seats_bucket: '1' \}\)/);
});

test('licence_activated names its source at each of the three doors', () => {
  assert.match(indexSrc, /trackFunnel\('licence_activated', \{ plan: 'pro', source: 'key_entry' \}\)/);
  assert.match(indexSrc, /trackFunnel\('licence_activated', \{\s*plan: 'pro', source: 'checkout', \.\.\.\(out\.period \? \{ period: out\.period \} : \{\}\)\s*\}\)/);
  assert.match(indexSrc, /trackFunnel\('licence_activated', \{ plan: 'teams', source: 'invite' \}\)/);
});

test('checkout_finished separates abandoned from failed, and says nothing on a repeat link', () => {
  assert.match(indexSrc, /outcome: 'succeeded'/);
  // entitlement_inactive is the person backing out, NOT a failure.
  assert.match(indexSrc, /entitlement_inactive[\s\S]{0,400}outcome: 'abandoned', reason: 'user_cancelled'/);
  // A spent grant (a second click of the same link) reports nothing at all.
  assert.match(indexSrc, /out\.claim\.error !== 'unauthorized'/);
});

test('invite_redeemed waits for the roster that knows the role', () => {
  assert.match(indexSrc, /awaitingInviteRole = true/);
  assert.match(indexSrc, /trackFunnel\('invite_redeemed', \{ role: v\.you\.isAdmin \? 'admin' : 'member' \}\)/);
});

test('licence_activated:invite does NOT wait with it — it has nothing to wait for', () => {
  // Ryan, 7 Sep: both its properties are known when the enrol succeeds, and a
  // machine that enrols then goes offline must not lose the one event that
  // proves money turned into working software.
  const watcher = indexSrc.slice(indexSrc.indexOf('teamsOrg.onChange((v) => {'));
  assert.doesNotMatch(watcher.slice(0, 400), /licence_activated/,
    'licence_activated must not ride on the roster view');
  const enrol = indexSrc.slice(indexSrc.indexOf("ipcMain.handle('teams:enrol'"));
  assert.match(enrol.slice(0, 1200), /trackFunnel\('licence_activated', \{ plan: 'teams', source: 'invite' \}\)/);
});

test('the renderer channel admits only what the renderer can actually see', () => {
  const seam = indexSrc.slice(indexSrc.indexOf('RENDERER_FUNNEL_EVENTS'));
  assert.match(seam.slice(0, 260), /'paywall_shown', 'access_blocked', 'checkout_opened'/);
  // The three that main fires at the line which knows the outcome must stay
  // main-only: a renderer able to name them could only ever double-count.
  for (const e of ['checkout_finished', 'licence_activated', 'invite_redeemed']) {
    assert.doesNotMatch(seam.slice(0, 260), new RegExp(`'${e}'`),
      `${e} is main-only and must not be reachable from the renderer`);
  }
  assert.match(seam, /isFunnelEvent\(event\) \|\| !RENDERER_FUNNEL_EVENTS\.has\(event\)/);
});

test('paywall_shown and access_blocked are wired in the renderer', () => {
  const paywall = fs.readFileSync(
    path.join(root, 'src/renderer/src/components/team/onboarding/Paywall.tsx'), 'utf8');
  assert.match(paywall, /useFunnelPing\(\{ event: 'paywall_shown', plan: 'pro', trigger \}\)/);
  const app = fs.readFileSync(path.join(root, 'src/renderer/src/App.tsx'), 'utf8');
  assert.match(app, /useAccessBlockedPing\(lockNow\?\.kind, lockNow\?\.reason\)/);
  // The trigger is now an expression, not a literal: one branch serves both a
  // person who never bought and one whose key died. See SET-PROOF B below.
  assert.match(app, /<Paywall onFree=\{\(\) => setAppSkin\('office'\)\} trigger=\{license \?/);
  const funnel = fs.readFileSync(path.join(root, 'src/renderer/src/analytics/funnel.tsx'), 'utf8');
  // A lease lock is connectivity, not a block: it must report nothing.
  assert.match(funnel, /kind !== 'revoked' \|\| fired\.current\) return/);
});

// ── 6. The site event ────────────────────────────────────────────────────────

// The public repo's site (docs/, owned by that repo) has no price groups, so
// this pin only runs where the site carries them.
test('pricing_viewed is wired on both price groups, and not through the out-of-scope ph()', { skip: !/data-plan=/.test(siteHtml) }, () => {
  assert.match(siteHtml, /data-plan="pro"/);
  assert.match(siteHtml, /data-plan="teams"/);
  assert.match(siteHtml, /window\.posthog\.capture\('pricing_viewed', \{ plan: plan, surface: 'landing' \}\)/);
  // `ph()` lives in the previous <script> block; calling it here would throw and
  // the event would never fire. This is the one place that must NOT use it.
  const block = siteHtml.slice(siteHtml.indexOf('pricing_viewed') - 1200, siteHtml.indexOf('pricing_viewed') + 200);
  assert.doesNotMatch(block, /\bph\('pricing_viewed'/);
});

test('the site still has no /pricing page, so surface is landing', () => {
  // The spec justifies this event partly on /pricing being a 404. If someone
  // adds the page, `surface: 'pricing'` becomes reachable and this must be revisited.
  assert.equal(fs.existsSync(path.join(root, 'docs/pricing.html')), false);
  assert.equal(fs.existsSync(path.join(root, 'docs/pricing')), false);
});

// ── 7. period is sent where it is known, and asserted nowhere (0.5.1) ─────────

test('period rides on licence_activated from the claim answer, and no call site asserts one', () => {
  // Until 0.5.1 a constant stamped `monthly` on every checkout_opened. The app
  // opens one checkout and the browser chooses the period after the handoff,
  // so that value could only ever be asserted, never observed: a property
  // whose only truthful value is a constant is noise in the allowlist. The
  // claimed licence knows what it is billed by, so the period lives there.
  // The constant may be NAMED in prose that explains its removal; it may not
  // be declared, imported or used.
  assert.doesNotMatch(analyticsSrc, /export const CHECKOUT_PERIOD_TODAY/);
  assert.doesNotMatch(indexSrc, /CHECKOUT_PERIOD_TODAY|period: 'monthly'|period: 'annual'/);

  const a = booted();
  a.trackFunnel('checkout_opened', { plan: 'pro', period: 'monthly', seats_bucket: '1' });
  assert.equal(captured.length, 0, 'checkout_opened must refuse period now');
  a.trackFunnel('licence_activated', { plan: 'pro', source: 'checkout', period: 'annual' });
  assert.equal(captured.length, 1, 'licence_activated must carry period');
  assert.equal(captured[0].properties.period, 'annual');
  // Absent is legal: the key and invite doors never learn it.
  a.trackFunnel('licence_activated', { plan: 'pro', source: 'key_entry' });
  assert.equal(captured.length, 2);
  assert.equal('period' in captured[1].properties, false);

  // The claim parser reads it by name against the closed list, and the only
  // checkout-door call spreads it in when present.
  const claim = fs.readFileSync(path.join(root, 'src/main/proCheckout.ts'), 'utf8');
  assert.match(claim, /\(CHECKOUT_PERIODS as readonly string\[\]\)\.includes\(answer\.period\)/);
  assert.match(claim, /return period \? \{ ok: true, redeemed, period \} : \{ ok: true, redeemed \};/);

  // The public table says the same, in the row and in the sentence.
  const ws = (s) => new RegExp(s.split(' ').join('\\s+'), 'i');
  assert.match(telemetryMd, /`period` — one of `monthly`, `annual` \(only when `source` is `checkout`\)/);
  assert.doesNotMatch(telemetryMd, /`checkout_opened` \| `plan`; `period`/);
  assert.match(telemetryMd, ws('A property whose only truthful value is a constant is noise in the allowlist'));
});

// ── 8. THE DENOMINATOR, PROVED AS A SET ──────────────────────────────────────
//
// Every rate in this funnel is measured against `paywall_shown`. If a surface
// that offers to buy something draws without firing it, every rate above it is
// silently inflated and NOTHING FAILS — which is exactly how the five silent
// surfaces survived the first pass and a green suite.
//
// So this does not count call sites. It rediscovers the set of files that
// offer a purchase, by looking for the ACTION rather than the component name,
// and requires each one to be accounted for: either it fires the event, or it
// is named below with the reason it must not. A seventh selling surface added
// tomorrow lands in `sells` and fails here until someone decides which it is.

/** Where money is asked for. A file reaching any of these is offering to sell. */
const PURCHASE_DESTINATIONS = [
  /harnessmd\.com\/checkout/,     // the teams checkout
  /#pricing/,                     // the marketing pricing section
  /proCheckoutBegin/,             // the PRO checkout, via main
  /soloConsoleUrl\(\)/,           // the licence console
  /consoleUrl\(/                  // the org console: members and BILLING
];

/** Surfaces that reach a purchase destination and MUST NOT fire the event.
 *  Each needs a reason, because "it does not fire" is the bug this test exists
 *  to catch and an unexplained entry here would hide one. */
const SILENT_BY_DESIGN = {
  'src/renderer/src/components/pro/ModeSwitch.tsx':
    'not a sale: it calls setAppSkin, and the PRO gate then draws the Paywall, which fires',
  'src/renderer/src/components/pro/onboarding/LicenseStep.tsx':
    'reached FROM the Paywall, which already fired; a key holder\'s door, not a pitch',
  'src/renderer/src/components/pro/ProSidebar.tsx':
    'the licence menu row is account management for someone who already paid; the upgrade card it hosts fires from ProUpgradeToTeams',
  // Ryan named `manageSeats` as the likely seventh surface and he was right
  // that it sells: adding a seat is a purchase and both of these open the
  // console's billing page. They are still NOT `paywall_shown`, and the reason
  // is Ryan's own spec rather than a preference — section 3 classes seat
  // expansion as `seat_count_changed`, "post-purchase expansion revenue, real
  // money but not launch-cohort money", deferred to the follow-up. These
  // screens are shown to an admin of an org that ALREADY PAYS, so counting
  // them as paywalls would put existing customers in the acquisition
  // denominator and DEFLATE every rate: more paywalls, the same activations.
  'src/renderer/src/components/pro/TeamScreen.tsx':
    'manage seats / invite open the console; expansion revenue, deferred to seat_count_changed (spec section 3)',
  'src/renderer/src/components/pro/BillingScreen.tsx':
    'manage seats / change card open the console; expansion revenue, same deferral'
};

function rendererFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) rendererFiles(full, out);
    else if (/\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

test('THE DENOMINATOR: every surface that offers a purchase fires paywall_shown', () => {
  const files = rendererFiles(path.join(root, 'src/renderer/src'));
  const sells = [];
  for (const full of files) {
    const src = fs.readFileSync(full, 'utf8');
    const rel = path.relative(root, full);
    // The helper that REPORTS a purchase is not itself a purchase surface.
    if (rel === 'src/renderer/src/analytics/funnel.tsx') continue;
    if (PURCHASE_DESTINATIONS.some((re) => re.test(src))) sells.push({ rel, src });
  }

  // The set is real, not a leftover: if this ever drops to one, the enumeration
  // stopped working rather than the app stopping selling.
  assert.ok(sells.length >= 5, `only ${sells.length} purchase surfaces found — the search broke`);

  // A host that DELEGATES the offer to one of the two upgrade cards is
  // accounted for BY that card — which is the whole reason the event lives in
  // the card and not in its four callers. The cards do not appear in `sells`
  // themselves, because they take the url as a prop and never name it, so the
  // delegation escape is only sound while the cards really do fire. That is
  // checked right here rather than trusted, so this test's claim about the SET
  // is true end to end and not just true of the hosts.
  const CARDS = [
    'src/renderer/src/components/team/UpgradeToTeams.tsx',
    'src/renderer/src/components/pro/onboarding/ProUpgradeToTeams.tsx'
  ];
  for (const rel of CARDS) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    // The CALL, not the name. This check had holes, each found by deliberately
    // breaking a surface and watching the test still pass: the hook name also
    // appears in an IMPORT line, and the event name also appeared in a COMMENT
    // saying the event lives here — a comment asserting a behaviour the code no
    // longer had, which is the exact pattern this repo has a sweep card for.
    assert.match(src, /event: 'paywall_shown'/,
      `${rel} is the card three surfaces delegate their offer to, and it fires nothing`);
  }

  const unaccounted = sells
    .filter(({ rel, src }) => !(rel in SILENT_BY_DESIGN)
      && !/event: 'paywall_shown'/.test(src)
      && !/UpgradeToTeams/.test(src))
    .map(({ rel }) => rel);

  assert.deepEqual(unaccounted, [],
    `these surfaces offer a purchase and fire no paywall_shown:\n  ${unaccounted.join('\n  ')}`);

  // And the exemptions are real files, so a rename cannot silently exempt
  // nothing while a renamed surface goes dark.
  for (const rel of Object.keys(SILENT_BY_DESIGN)) {
    assert.ok(fs.existsSync(path.join(root, rel)), `stale exemption: ${rel}`);
  }
});

test('the teams checkout is reported, and cannot double-count the PRO one', () => {
  const funnel = fs.readFileSync(path.join(root, 'src/renderer/src/analytics/funnel.tsx'), 'utf8');
  // The renderer names only the plan; nothing stamps a period any more (0.5.1).
  assert.match(funnel, /trackFunnel\?\.\('checkout_opened', \{ plan: 'teams' \}\)/);
  // The teams call carries plan and nothing else; the prose above it explains
  // why, so search the CALL rather than the file.
  const call = funnel.slice(funnel.indexOf('export function reportTeamsCheckoutOpened'));
  assert.doesNotMatch(call, /seats_bucket/);
  assert.doesNotMatch(call, /period/);
  // Main refuses any other plan across that seam, so a renderer bug cannot
  // double-count the PRO checkout that pro:checkout:begin already reports.
  assert.match(indexSrc, /event === 'checkout_opened' && clean\.plan !== 'teams'\) return \{ ok: false \}/);
  assert.doesNotMatch(indexSrc, /clean\.period =/);
  // Both upgrade cards report it, which is all four teams doors.
  for (const rel of ['src/renderer/src/components/team/UpgradeToTeams.tsx',
    'src/renderer/src/components/pro/onboarding/ProUpgradeToTeams.tsx']) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.match(src, /reportTeamsCheckoutOpened\(\); onSetUpTeam\(\)/, `${rel} does not report the checkout`);
    assert.match(src, /plan: 'teams', trigger: 'manual'/, `${rel} does not fire paywall_shown`);
  }
});

test('access_blocked separates a lost seat from an org that stopped paying', () => {
  const funnel = fs.readFileSync(path.join(root, 'src/renderer/src/analytics/funnel.tsx'), 'utf8');
  assert.match(funnel, /reason === 'entitlement' \? 'org_lapsed'/);
  assert.match(funnel, /'suspended' \|\| reason === 'removed'\) \? 'no_seat'/);
  // A revoked lock with no reason is not describable, and guessing would put a
  // wrong row in the number this split exists to produce.
  assert.match(funnel, /if \(!block\) return;/);
  assert.match(fs.readFileSync(path.join(root, 'src/renderer/src/App.tsx'), 'utf8'),
    /useAccessBlockedPing\(lockNow\?\.kind, lockNow\?\.reason\)/);
  const a = booted();
  a.trackFunnel('access_blocked', { plan: 'teams', block: 'org_lapsed' });
  assert.equal(captured.length, 1, 'org_lapsed is not on the allowlist');
});

// ── 9. The traps Ryan named, pinned so they cannot come back ─────────────────

test('the teams checkout never CALLS seatsBucket — its default would assert one seat', () => {
  // `seatsBucket(null)` returns '1' by design, which is the truth for the PRO
  // checkout (one machine) and a confident lie for a team (no number at all).
  // Omitting the property is not enough on its own: the danger is someone
  // "filling in the gap" by calling the helper, which would pass every other
  // test in this file. So no funnel call site may call it.
  const funnel = fs.readFileSync(path.join(root, 'src/renderer/src/analytics/funnel.tsx'), 'utf8');
  assert.doesNotMatch(funnel, /seatsBucket/);
  const teamsBlock = indexSrc.slice(indexSrc.indexOf("event === 'checkout_opened'"));
  assert.doesNotMatch(teamsBlock.slice(0, 600), /seatsBucket/);
  // And the helper still behaves the way that makes it dangerous, so this test
  // stops meaning anything the day someone "fixes" the default instead.
  assert.equal(seatsBucket(null), '1');
});

test('TELEMETRY.md says what no_seat does and does not cover', () => {
  // The narrowing was free only because 0.5.0 has not shipped: no historical
  // row carries the old wider meaning. After launch the same change would
  // leave permanently ambiguous rows.
  const ws = (s) => new RegExp(s.split(' ').join('\\s+'), 'i');
  assert.match(telemetryMd, ws('does not cover the organisation'));
  assert.match(telemetryMd, ws('Widening it back'));
});

test('SET-PROOF B: every paywall trigger is produced, or its absence is understood', () => {
  // A trigger nothing produces is either a dead enum member or a surface
  // nobody built. Mapping the surfaces onto the enum is what turns "I found
  // six" into "there is no seventh I have not thought about".
  const app = fs.readFileSync(path.join(root, 'src/renderer/src/App.tsx'), 'utf8');
  const hero = fs.readFileSync(path.join(root, 'src/renderer/src/components/SettingsHeroCard.tsx'), 'utf8');
  const cards = ['src/renderer/src/components/team/UpgradeToTeams.tsx',
    'src/renderer/src/components/pro/onboarding/ProUpgradeToTeams.tsx']
    .map((r) => fs.readFileSync(path.join(root, r), 'utf8')).join('\n');

  // PRODUCED. `licence_expired` is produced by the same branch as
  // `licence_missing`: a key found dead AT BOOT meets this paywall (the live
  // downgrade half flips to Classic instead), so one branch serves both and
  // the licence record tells them apart.
  assert.match(app, /trigger=\{license \? 'licence_expired' : 'licence_missing'\}/);
  assert.match(hero, /trigger: 'manual'/);
  assert.match(cards, /trigger: 'manual'/);

  // UNPRODUCED, and both are unproduced because the app does not do the thing,
  // not because a surface was missed:
  //  - `pro_feature`: nothing walls an individual PRO feature. The gate is
  //    whole-app, so a person meets the paywall or the app, never a feature.
  //  - `seat_limit`: running out of seats is refused by the RELAY at enrol
  //    (`seats_exhausted`), which is a join failure, not a paywall.
  // If either ever becomes reachable it needs a surface, and this is where
  // that decision gets made rather than noticed.
  const everywhere = [app, hero, cards].join('\n');
  for (const dead of ['pro_feature', 'seat_limit']) {
    assert.doesNotMatch(everywhere, new RegExp(`trigger[^\\n]*'${dead}'`),
      `${dead} is now produced — it needs a surface and a decision, not a silent value`);
  }
});

'use strict';

/**
 * The founder's 6 Sep 2026 conversion round, the parts that can be held
 * without a window (card v050-app-conversion-flow).
 *
 * ITEM 10 IS THE ONE WITH A REAL BUG BEHIND IT, so it gets the most here. The
 * team thread title rendered as "your <god name> and 's <god name>": the
 * teammate's name was empty, and their orchestrator was drawn with YOUR
 * orchestrator's name. Both faults are one line each and neither is visible
 * from a type check, which is why they are pinned as text.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
const LOCALES = ['en', 'ar', 'zh-CN'];

/* ---- item 10, the team communication title ------------------------------- */

test('10a. the thread title has a SEPARATE variable for their orchestrator', () => {
  // The bug: one `{{godName}}` used twice. `godName` is a global default
  // injected by i18n/useGodNameSync, so the second slot could only ever
  // render a copy of yours.
  for (const loc of LOCALES) {
    const s = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    const between = s.team.thread.between;
    const godNames = (between.match(/\{\{godName\}\}/g) || []).length;
    assert.equal(godNames, 1, `${loc}: {{godName}} must appear once, not twice`);
    assert.match(between, /\{\{theirGodName\}\}/, `${loc}: theirs needs its own variable`);
    assert.match(between, /\{\{name\}\}/, `${loc}: the teammate's name must still be there`);
    // The composer placeholder had the identical fault.
    assert.match(s.team.thread.composerPlaceholder, /\{\{theirGodName\}\}/, `${loc}: composer`);
    assert.doesNotMatch(s.team.thread.composerPlaceholder, /\{\{godName\}\}/, `${loc}: composer`);
    assert.equal(typeof s.team.thread.theirOrchestrator, 'string');
  }
});

test('10b. the thread passes the teammate\'s own bossName, with a generic fallback', () => {
  const thread = read('src/renderer/src/components/team/CrossNodeThread.tsx');
  // Not `godName`, and not a second read of the roster: `Teammate.bossName`
  // was already on the wire and already mapped; nothing was fetching it.
  assert.match(thread, /theirGodName: mate\.bossName\?\.trim\(\) \|\| t\('team\.thread\.theirOrchestrator'\)/);
  assert.match(thread, /mateGodName=\{mate\.bossName\?\.trim\(\) \|\| t\('team\.thread\.theirOrchestrator'\)\}/);
  const composer = read('src/renderer/src/components/team/DraftComposer.tsx');
  assert.match(composer, /theirGodName: mateGodName/);
});

test('10c. a teammate with no name on the wire never renders as the empty string', () => {
  // `RelayMember.name` is `string | null` and the console does not always hold
  // one. `?? ''` handed every surface a blank; the machine name is the only
  // other human-readable thing the relay reports about them.
  const relay = read('src/main/relay.ts');
  assert.doesNotMatch(relay, /name: m\.name \?\? '',/, "the ?? '' fallback is the bug");
  assert.match(relay, /name: m\.name\?\.trim\(\) \|\| device\.name,/);
});

/* ---- item 1, onboarding never mentions money ----------------------------- */

test('1. the fresh onboarding path names no price, plan, trial or upgrade', () => {
  // The paywall and the licence step are EXCLUDED on purpose: they are where
  // money belongs. So is the gate's wall, whose copy the founder ruled on
  // 6 Sep. This covers the screens a new individual actually walks through.
  const money = /\bfree\b|\bprice\b|pricing|\btrial\b|\bupgrade\b|\bpaid\b|subscri|billing|per month|\$\d/i;
  const paths = [
    ['pro.onboarding.entry.soloTitle', en.pro.onboarding.entry.soloTitle],
    ['pro.onboarding.entry.soloDesc', en.pro.onboarding.entry.soloDesc],
    ['pro.onboarding.entry.soloNeed', en.pro.onboarding.entry.soloNeed],
    ['pro.onboarding.entry.teamTitle', en.pro.onboarding.entry.teamTitle],
    ['pro.onboarding.entry.teamDesc', en.pro.onboarding.entry.teamDesc],
    ['pro.onboarding.entry.teamNeed', en.pro.onboarding.entry.teamNeed],
    ['pro.onboarding.entry.title', en.pro.onboarding.entry.title],
    ['pro.onboarding.entry.lead', en.pro.onboarding.entry.lead],
    ['firstRun.freeSignin.title', en.firstRun.freeSignin.title],
    ['firstRun.freeSignin.accountNote', en.firstRun.freeSignin.accountNote],
  ];
  for (const [key, value] of paths) {
    assert.doesNotMatch(value, money, `${key} mentions money: ${value}`);
  }
});

/* ---- items 3 and 4, the doors -------------------------------------------- */

test('3. a fresh install defers the team join to the END of onboarding', () => {
  const entry = read('src/renderer/src/components/pro/onboarding/EntryStep.tsx');
  assert.match(entry, /deferTeam\?: boolean/);
  assert.match(entry, /if \(deferTeam && picked === 'team'\) \{ onTeamChosen\?\.\(\); return; \}/);

  const flow = read('src/renderer/src/components/pro/onboarding/ProOnboarding.tsx');
  // Chosen, not joined: the code is asked for after the workspace exists.
  assert.match(flow, /deferTeam/);
  assert.match(flow, /onTeamChosen=\{\(\) => \{ setEntry\(\{ path: 'team', orgName: '' \}\); setStep\(1\); \}\}/);
  // And it BLOCKS: the config is written, then step 4 holds until admitted.
  assert.match(flow, /if \(entry\?\.path === 'team' && !enrolled\) \{/);
  assert.match(flow, /setStep\(4\);/);
});

test('3b. the block has exactly one other door, and it is the individual path', () => {
  const join = read('src/renderer/src/components/pro/onboarding/JoinStep.tsx');
  assert.match(join, /onLeaveTeam\?: \(\) => void;/);
  assert.match(join, /t\('pro\.onboarding\.join\.leaveTeam'\)/);
  // No skip, no trial, no "continue anyway" on this screen.
  assert.doesNotMatch(join, /continueAnyway|skipForNow|startTrial/i);

  const flow = read('src/renderer/src/components/pro/onboarding/ProOnboarding.tsx');
  // The door is real: it runs the same free sign-in the individual door runs.
  assert.match(flow, /if \(leftTeam\) \{\s*return <FreeSignInStep onDone=\{admit\}/);
  for (const loc of LOCALES) {
    const s = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    assert.equal(typeof s.pro.onboarding.join.leaveTeam, 'string', loc);
    assert.equal(typeof s.pro.onboarding.join.blockedTitle, 'string', loc);
  }
});

test('4. individual leads the entry step and team is the smaller branch', () => {
  const entry = read('src/renderer/src/components/pro/onboarding/EntryStep.tsx');
  const solo = entry.indexOf("icon=\"profile\" selected={picked === 'solo'}");
  const team = entry.indexOf("icon=\"team\" selected={picked === 'team'}");
  assert.ok(solo > 0 && team > 0, 'both cards must exist');
  assert.ok(solo < team, 'the individual card must come first');
  // The team card is the compact one; the individual card is not.
  const teamBlock = entry.slice(team - 220, team + 220);
  assert.match(teamBlock, /compact/);
  assert.match(entry, /compact\?: boolean;/);
});

/* ---- item 5, both directions --------------------------------------------- */

test('5. teams to individual is allowed only with exactly one member', () => {
  const main = read('src/main/index.ts');
  const h = main.slice(main.indexOf("ipcMain.handle('teams:leave'"), main.indexOf("ipcMain.handle('teams:leave'") + 1400);
  assert.ok(h.length > 100, 'the teams:leave handler must exist');
  // The count is the relay's, not a cached file's.
  assert.match(h, /await teamRoster\(\)/);
  assert.match(h, /roster\.data\.teammates\.length/);
  assert.match(h, /reason: 'has-teammates'/);
  // "I could not check" must never read as "there is nobody there".
  assert.match(h, /reason: 'unreachable'/);
  // Only then is anything torn down.
  const refuse = h.indexOf("reason: 'has-teammates'");
  const forget = h.indexOf('forgetMembership();');
  assert.ok(refuse > 0 && forget > refuse, 'the refusal must come before the teardown');

  const preload = read('src/preload/index.ts');
  assert.match(preload, /teamsLeave: \(\)/);
  // And the other direction still exists.
  const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
  assert.match(sidebar, /t\('pro\.menu\.upgrade'\)/);
  assert.match(sidebar, /t\('pro\.menu\.leaveTeam'\)/);
});

/* ---- items 6, 7, 8 -------------------------------------------------------- */

test('6. the profile drop-up is bounded, so it cannot run off the top', () => {
  const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
  const menu = sidebar.slice(sidebar.indexOf("role=\"menu\""), sidebar.indexOf("role=\"menu\"") + 2400);
  assert.match(menu, /maxHeight: 'calc\(100vh - 96px\)'/);
  assert.match(menu, /overflowY: 'auto'/);
  // The middle of the column keeps its own scroll region (6 Sep card).
  assert.match(sidebar, /data-sidebar-scroll style=\{\{ flex: 1, minHeight: 0, overflowY: 'auto'/);
});

test('7. PRO holds a boot state until restored agents are reattached', () => {
  const boot = read('src/renderer/src/components/pro/ProBooting.tsx');
  // The marker the store stamps on every restored agent.
  assert.match(boot, /export const RECONNECTING = 'reconnecting…';/);
  const store = read('src/renderer/src/store/store.ts');
  assert.match(store, /action: 'reconnecting…',/, 'the store must still stamp that marker');
  // Recovery ends when they are all back, not after a fixed delay.
  assert.match(boot, /s\.agents\.filter\(\(a\) => a\.action === RECONNECTING\)\.length/);
  // But it is capped, so one stuck session cannot lock the app out. 0.5.2:
  // the cap is the shared gate's, and the gate also waits for the automatic
  // restore (test/boot-gate.test.cjs has the decision itself).
  assert.match(boot, /BOOT_RECOVERY_CAP_MS/);
  assert.match(boot, /recovering: !gate\.settled/);
  const shell = read('src/renderer/src/components/pro/ProShell.tsx');
  assert.match(shell, /\{recovering && <ProBooting remaining=\{remaining\} skippable=\{skippable\} onSkip=\{skip\} \/>\}/);
});

test('8. the sidebar row carries a context figure, a note, and a dot that reads', () => {
  const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
  const row = sidebar.slice(sidebar.indexOf('function AgentRow('), sidebar.indexOf('function SectionLabel('));
  // Same arithmetic as the agent's own screen, so the two cannot disagree.
  assert.match(row, /Math\.min\(100, Math\.round\(\(agent\.contextTokens \/ agent\.contextLimit\) \* 100\)\)/);
  const screen = read('src/renderer/src/components/pro/AgentScreen.tsx');
  assert.match(screen, /Math\.min\(100, Math\.round\(\(agent\.contextTokens \/ agent\.contextLimit\) \* 100\)\)/);
  // No live session draws nothing, never a confident 0%.
  assert.match(row, /\{ctxPct !== null && \(/);
  // The note reuses the store field that already existed and already persists.
  assert.match(row, /const setAgentNote = useStore\(\(s\) => s\.setAgentNote\);/);
  const store = read('src/renderer/src/store/store.ts');
  assert.match(store, /setAgentNote: \(id, note\) =>/);
  // The dot: in front of the status WORD since the V2 row (0.5.3, F25), the
  // prototype's presence dot at 7, and ringed in the shared component.
  assert.match(row, /<StatusDot status=\{agent\.status\} size=\{7\} \/>\s*\{statusWord\}/);
  // 0.5.3, bug 16: the paint moved into @shared/statusDot so idle can be a
  // hollow ring. Both promises below still hold, one file over.
  const ui = read('src/renderer/src/components/pro/ui.tsx');
  assert.match(ui, /\.\.\.statusDotPaint\(status, size\)/);
  const paint = read('src/shared/statusDot.ts');
  assert.match(paint, /\?\? `var\(--cth-status-\$\{status\}\)`/, 'the colour stays a theme token');
  assert.match(paint, /boxShadow: '0 0 0 1px color-mix\(in srgb, var\(--cth-ink-900\) 30%, transparent\)'/);
});

/* ---- item 2, the paywall hand-off ---------------------------------------- */

const loadTs = require('./load-ts.cjs');
const checkout = loadTs('src/shared/proCheckout.ts');

test('2a. the checkout URL is /pro/checkout, never /checkout', () => {
  // /checkout on the console is the TEAM ADMIN door and redirects to
  // organisation creation. Kevin caught this by reading the routes; a solo
  // person sent there lands in the wrong flow entirely.
  assert.equal(checkout.PRO_CHECKOUT_PATH, '/pro/checkout');
  const state = 'a'.repeat(64);
  const url = checkout.proCheckoutUrl(state, 'https://app.harnessmd.com');
  assert.equal(url, `https://app.harnessmd.com/pro/checkout?state=${state}`);
  // A trailing slash on the origin must not produce a double slash.
  assert.equal(checkout.proCheckoutUrl(state, 'https://app.harnessmd.com/'), url);
  // And the app sends NO identity of its own: personId in a URL is not
  // authentication and must never drive billing.
  assert.doesNotMatch(url, /person|email|user|token/i);
});

test('2b. the return deep link is its own route and rejects anything malformed', () => {
  const g = 'b'.repeat(64), s = 'c'.repeat(64);
  const ok = checkout.parseProCheckoutDeepLink(`munderdifflin://pro/checkout?grant=${g}&state=${s}`);
  assert.deepEqual(ok, { action: 'pro-checkout', grant: g, state: s });
  // Both spellings, as the teams/free/hire parsers all accept.
  assert.ok(checkout.parseProCheckoutDeepLink(`munderdifflin:pro/checkout?grant=${g}&state=${s}`));
  // THE ROUTE IS THE INTENT: no other flow's link may parse here.
  assert.equal(checkout.parseProCheckoutDeepLink(`munderdifflin://free/register?grant=${g}&state=${s}`), null);
  assert.equal(checkout.parseProCheckoutDeepLink(`munderdifflin://teams/enrol?grant=${g}&state=${s}`), null);
  // Wrong scheme, short hex, missing half, junk.
  assert.equal(checkout.parseProCheckoutDeepLink(`https://pro/checkout?grant=${g}&state=${s}`), null);
  assert.equal(checkout.parseProCheckoutDeepLink(`munderdifflin://pro/checkout?grant=abc&state=${s}`), null);
  assert.equal(checkout.parseProCheckoutDeepLink('munderdifflin://pro/checkout'), null);
  assert.equal(checkout.parseProCheckoutDeepLink('not a url'), null);
});

test('2c. a return link is worthless without this machine\'s own live state', () => {
  const s = 'd'.repeat(64);
  const pending = { state: s, expiresAt: 1_000 };
  assert.equal(checkout.checkoutStateMatches(pending, s, 999), true);
  assert.equal(checkout.checkoutStateMatches(pending, s, 1_000), false, 'expired at the boundary');
  assert.equal(checkout.checkoutStateMatches(pending, 'e'.repeat(64), 999), false, "another attempt's state");
  assert.equal(checkout.checkoutStateMatches(null, s, 999), false, 'nothing pending');
  assert.equal(checkout.PRO_CHECKOUT_STATE_TTL_MS, 5 * 60_000);
});

test('2d. the paywall opens the agreed route, not the console front door', () => {
  const paywall = read('src/renderer/src/components/team/onboarding/Paywall.tsx');
  assert.match(paywall, /window\.cth\.proCheckoutBegin/);
  const preload = read('src/preload/index.ts');
  assert.match(preload, /proCheckoutBegin: \(\)/);
  assert.match(preload, /onProCheckoutReturn:/);
  const main = read('src/main/index.ts');
  assert.match(main, /ipcMain\.handle\('pro:checkout:begin'/);
  assert.match(main, /parseProCheckoutDeepLink\(link\)/);
  // Main vouches for the state before the renderer is told anything.
  const dispatch = main.slice(main.indexOf('const checkout = parseProCheckoutDeepLink'), main.indexOf('void handleHireLink(link);'));
  const verify = dispatch.indexOf('receiveCheckoutReturn');
  const notify = dispatch.indexOf("send('pro:checkout:return'");
  assert.ok(verify > 0 && notify > verify, 'state must be checked before the renderer hears about it');
});

test('2e. the claim contract is Kevin\'s, and an unknown answer is never guessed', () => {
  // Route, and the request carries the grant ALONE: no personId, no email and
  // not the state. The state is ours to check, and a value the server cannot
  // verify is one it must not accept.
  assert.equal(checkout.PRO_CHECKOUT_CLAIM_ROUTE, '/api/pro/checkout/claim');
  const main = read('src/main/proCheckout.ts');
  assert.match(main, /body: JSON\.stringify\(\{ grant \}\)/);
  assert.doesNotMatch(main, /JSON\.stringify\(\{[^}]*state/);

  // Branch on `error`, never on `detail`, which is prose and gets reworded.
  for (const e of ['invalid_body', 'unauthorized', 'entitlement_inactive', 'rate_limited', 'server_error']) {
    assert.equal(checkout.claimRefusalOf(400, { error: e }).error, e);
  }
  // Anything unrecognised is `unavailable`. Never a guess at which code it was.
  assert.equal(checkout.claimRefusalOf(418, { error: 'nonsense' }).error, 'unavailable');
  assert.equal(checkout.claimRefusalOf(200, {}).error, 'unavailable');
  // A missing route, or something answering in front of it.
  assert.equal(checkout.claimRefusalOf(404, {}).error, 'unavailable');
  assert.equal(checkout.claimRefusalOf(405, {}).error, 'unavailable');
  assert.equal(checkout.claimRefusalOf(503, {}).error, 'server_error');

  // THE STATUS FALLBACK MUST REACH THE SAME VERDICT AS THE BODY, because an
  // unparseable body is exactly when a gateway answered instead of the route.
  // Kevin's live status codes, with NO body at all:
  assert.equal(checkout.claimRefusalOf(400, {}).error, 'invalid_body');
  assert.equal(checkout.claimRefusalOf(401, {}).error, 'unauthorized');
  assert.equal(checkout.claimRefusalOf(429, {}).error, 'rate_limited');
  assert.equal(checkout.claimRefusalOf(500, {}).error, 'server_error');
  // 402 is the one that would have been wrong. It is entitlement_inactive,
  // the person who backed out of checkout, and it must NOT be recoverable:
  // otherwise somebody who never paid is invited to paste a key they do not
  // have instead of being sent back to finish paying.
  assert.equal(checkout.claimRefusalOf(402, {}).error, 'entitlement_inactive');
  assert.equal(checkout.claimIsRecoverable(checkout.claimRefusalOf(402, {}).error), false);
});

test('2g. the live answer shape parses, ok:true and all', () => {
  // Kevin's built route answers 201 { ok, key, email, personId, period }, matching
  // /api/free/register. Reading the fields BY NAME is why the extra `ok` costs
  // nothing, so this pins that the reader is by-name and not positional.
  const main = read('src/main/proCheckout.ts');
  assert.match(main, /typeof answer\.key !== 'string'/);
  assert.match(main, /redeemLicense\(answer\.key\)/);
  // A 2xx with no usable key is not a success we can act on.
  assert.match(main, /error: 'unavailable'/);
});

test('2f. a spent grant sends the person to their key, not to a failure', () => {
  // `unauthorized` is what a SECOND deep link looks like once the grant is
  // spent, so it must NOT be shown as an error to somebody who just paid.
  assert.equal(checkout.claimIsRecoverable('unauthorized'), true);
  assert.equal(checkout.claimIsRecoverable('unavailable'), true, 'the 404 of the unbuilt route');
  assert.equal(checkout.claimIsRecoverable('server_error'), true);
  assert.equal(checkout.claimIsRecoverable('offline'), true);
  // These two must not fall through: one wants a back-off, the other means
  // they abandoned checkout and belong back at it.
  assert.equal(checkout.claimIsRecoverable('rate_limited'), false);
  assert.equal(checkout.claimIsRecoverable('entitlement_inactive'), false);

  // The key never reaches the renderer: it goes straight to redeem.
  const main = read('src/main/proCheckout.ts');
  assert.match(main, /return period \? \{ ok: true, redeemed, period \} : \{ ok: true, redeemed \};/);
  const index = read('src/main/index.ts');
  const dispatch = index.slice(index.indexOf('const checkout = parseProCheckoutDeepLink'), index.indexOf('void handleHireLink(link);'));
  // Comments talk about the key; the CODE must not carry one. Strip the prose
  // and assert on what actually runs.
  const code = dispatch.replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(code, /\bkey\b/, 'no licence key may cross to the renderer');
  assert.match(dispatch, /claimIsRecoverable/);
});

test('2h. the five claim statuses are pairwise distinct, or the fallback is a guess', () => {
  /*
   * THIS GUARDS AN ASSUMPTION I CANNOT SEE FROM THIS SIDE, and Kevin proposed
   * it after checking the property held today (7 Sep 2026): 402 is unique to
   * `entitlement_inactive` across the whole wire error table, and the claim
   * route declares and throws exactly these five and nothing else.
   *
   * WHY IT IS LOAD BEARING. `claimRefusalOf` reads the body's `error` first and
   * only falls back to the status when the body does not parse, which is
   * exactly when a proxy or an error page answered instead of the route. That
   * fallback is only sound while each status maps back to ONE meaning. If a
   * second code ever takes 402, or the route's declared errors are widened, a
   * body-less refusal would reach a verdict the body would not have, which is
   * the precise failure the 402 fix removed.
   *
   * Both of those are edits on the web side that look harmless there. This
   * fails loudly on the day either happens, which is the only warning this
   * side would otherwise get.
   */
  const statuses = [400, 401, 402, 429, 500];
  const mapped = statuses.map((s) => checkout.claimRefusalOf(s, {}).error);
  assert.equal(new Set(mapped).size, statuses.length,
    `two statuses map to the same meaning: ${JSON.stringify(Object.fromEntries(statuses.map((s, i) => [s, mapped[i]])))}`);

  // And the direction each one sends somebody must stay split the way it is:
  // recoverable means "finish with your licence key", so the two that must
  // never fall through are the back-off and the never-paid.
  const recoverable = Object.fromEntries(mapped.map((e) => [e, checkout.claimIsRecoverable(e)]));
  assert.equal(recoverable.entitlement_inactive, false, 'never paid must go back to checkout');
  assert.equal(recoverable.rate_limited, false, 'a back-off must not become a paste prompt');
  assert.equal(recoverable.unauthorized, true, 'a spent grant usually means it already worked');
});

test('2i. the checkout origin can be pointed at a local stack, and production is unchanged', () => {
  /*
   * Without this the paywall round trip could not be exercised against a local
   * console at all: `CONSOLE_ORIGIN` is hardcoded, so pressing Buy always
   * opened the live site. Its own comment in shared/consoleLinks.ts claims it
   * is "overridable the same way the sign-in page is"; it was not, and the two
   * it names both read an env var (MD_TEAMS_SIGNIN_URL, MD_LICENCE_ORIGIN).
   */
  const main = read('src/main/proCheckout.ts');
  assert.match(main, /process\.env\.MD_CONSOLE_ORIGIN \?\? CONSOLE_ORIGIN/);
  assert.match(main, /origin: string = checkoutOrigin\(\)/);

  // THE READ MUST NOT MOVE INTO THE SHARED FILE. consoleLinks.ts is imported
  // by renderer components, where a bare process.env lookup is a runtime error
  // for whoever opens that menu.
  const shared = read('src/shared/consoleLinks.ts');
  assert.doesNotMatch(shared, /process\.env/, 'consoleLinks is renderer-reachable');
  assert.match(shared, /export const CONSOLE_ORIGIN = 'https:\/\/app\.harnessmd\.com'/,
    'production still ships the constant');

  // And the URL builder is origin-agnostic, so a local origin composes the
  // same path rather than a special case.
  const state = 'f'.repeat(64);
  assert.equal(
    checkout.proCheckoutUrl(state, 'http://localhost:4311'),
    `http://localhost:4311/pro/checkout?state=${state}`);
});

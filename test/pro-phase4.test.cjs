// PRO phase 4: Temps with the ledger, Team drawn by PRO with the standing
// gates, the three drop-up pages, and the gating rules that are rules
// because a test holds them (plan sections 4.8, 4.10, 6.3).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const nav = loadTs('src/renderer/src/components/pro/proNav.ts');
const shell = read('src/renderer/src/components/pro/ProShell.tsx');
const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
const temps = read('src/renderer/src/components/pro/TempsScreen.tsx');
const team = read('src/renderer/src/components/pro/TeamScreen.tsx');
const profile = read('src/renderer/src/components/pro/ProfileScreen.tsx');
const settings = read('src/renderer/src/components/SettingsModal.tsx');
const autos = read('src/renderer/src/components/pro/AutomationsScreen.tsx');

/* ───────────────────────────── navigation ────────────────────────────── */

test('the drop-up pages are screens with a branch each, and not sidebar rows', () => {
  assert.deepEqual([...nav.PRO_PAGES].slice(0, 3), ['profile', 'settings', 'updates']);
  for (const p of nav.PRO_PAGES) {
    assert.ok(nav.isProScreen(p), `${p} is not a screen`);
    assert.ok(!nav.PRO_SCREENS.includes(p), `${p} must not be a sidebar row`);
    assert.match(shell, new RegExp(`case '${p}':`), `ProShell has no case for '${p}'`);
    assert.match(sidebar, new RegExp(`onSelect\\('${p}'\\)`), `the drop-up does not open '${p}'`);
  }
  assert.match(shell, /case 'temps': return <TempsScreen \/>;/);
  assert.ok(!shell.includes('WorkersTab'), 'PRO must not mount the Classic WorkersTab any more');
  assert.match(shell, /if \(screen === TEAM_PANE\) return <TeamScreen \/>;/, 'the seam\'s team id is drawn by PRO');
  assert.match(shell, /extraPanes\[screen\]/, 'the other seam panes still come through extraPanes');
});

// REWRITTEN 4 Sep 2026 (the solo plan). The old assertion pinned the solo row
// to the literal `!can(standing, 'seats.view') && !inOrg`. That expression was
// two facts standing in for "solo", and the sidebar now has three solo
// decisions to make (the Team section, the licence row, the upgrade row), so
// standing in for it three times is how they drift apart. They read ONE answer
// instead, `proDestinations` → `navFor` → `can()`, and the guarantee is
// checked at both ends: the sidebar consults the answer, and the answer is
// itself derived from the permission table rather than from a second copy of
// it. Strictly stronger than the string it replaces.
test('the drop-up is gated by standing through can(), never by isAdmin', () => {
  const body = strip(sidebar);
  assert.match(body, /useStanding\(\)/);
  assert.ok(!/isAdmin/.test(body), 'the sidebar must not read isAdmin directly');
  assert.match(body, /const dest = proDestinations\(standing\);/, 'the drop-up reads the one answer');
  assert.match(body, /\{dest\.offerTeams && \(\s*<MenuRow[^>]*label=\{t\('pro\.menu\.upgrade'\)\}/, 'Upgrade to Teams is the solo row');
  assert.match(body, /\{dest\.ownLicense && \(\s*<MenuRow[^>]*label=\{t\('pro\.menu\.license'\)\}/, 'the licence row is the solo row');
  assert.match(body, /can\(standing, 'billing\.view'\) && \(/, 'the billing row (phase 5) is drawn only for billing.view');
  // And the answer is `can()` over the two team only families, not a guess.
  const solo = loadTs('src/shared/soloPro.ts');
  const perms = loadTs('src/shared/permissions.ts');
  assert.equal(solo.navFor('solo').offerTeams, true);
  assert.equal(solo.navFor('member').offerTeams, false);
  assert.equal(solo.navFor('admin').offerTeams, false);
  for (const p of [...perms.NETWORK_PERMS, ...perms.KNOWLEDGE_PERMS]) {
    assert.strictEqual(perms.can('solo', p), false, `${p} is reachable solo`);
  }
});

/* ───────────────────────────── temps ─────────────────────────────────── */

test('tempsData: filters bucket the five results and the search reads name, job and id', () => {
  const D = loadTs('src/renderer/src/components/pro/tempsData.ts');
  const H = loadTs('src/shared/workerHistory.ts');
  for (const r of H.WORKER_RESULTS) assert.ok(['done', 'reaped', 'stopped'].includes(D.resultBucket(r)), r);
  assert.equal(D.resultBucket('done'), 'done');
  assert.equal(D.resultBucket('stopped'), 'stopped');
  assert.equal(D.resultBucket('idle'), 'reaped');
  assert.equal(D.resultBucket('exited'), 'reaped');
  assert.equal(D.resultTone('done'), 'ok');
  assert.equal(D.resultTone('token-cap'), 'bad');
  const row = (i, extra) => ({ id: `r${i}`, workerId: `worker-${i}`, reqId: `${i}`, name: `w${i}`, job: `fix the ${i} thing`, baseBranch: 'main', hasSlack: false, spawnedAt: 0, endedAt: 1000, tokensUsed: 0, tokenCap: null, result: 'done', ok: true, worktree: null, ...extra });
  const rows = [row(1), row(2, { result: 'idle' }), row(3, { result: 'stopped', job: 'polish' })];
  assert.deepEqual(D.filterHistory(rows, 'reaped', '').map((r) => r.id), ['r2']);
  assert.deepEqual(D.filterHistory(rows, 'all', 'POLISH').map((r) => r.id), ['r3']);
  assert.deepEqual(D.filterHistory(rows, 'all', 'worker-1').map((r) => r.id), ['r1']);
  assert.deepEqual(D.filterHistory(rows, 'done', 'thing').map((r) => r.id), ['r1']);
  assert.equal(D.fmtSpan(4_000), '4s');
  assert.equal(D.fmtSpan(12 * 60_000), '12m');
  assert.equal(D.fmtSpan(125 * 60_000), '2h 05m');
  assert.equal(D.fmtSpan(60 * 3600_000), '3d');
  assert.equal(D.fmtTokens(12_345), '12k');
  assert.equal(D.jobLine('\n\n  first line  \nsecond'), 'first line');
});

test('the Temps screen reads the ledger through its door and re-reads on the poke', () => {
  assert.match(temps, /api\.workersHistory\(\)/);
  assert.match(temps, /api\.onWorkersHistoryUpdated\?\.\(read\)/);
  assert.match(temps, /window\.cth\.stopWorker\(workerId\)/, 'Stop is the same door Classic uses');
  assert.ok(!/rerun|reRun|respawn/i.test(strip(temps)), 'no re-run button: the desktop never spends on its own');
  for (const r of ['done', 'token-cap', 'idle', 'stopped', 'exited']) assert.match(temps, /pro\.temps\.result\.\$\{/, r);
});

/* ───────────────────────────── team ──────────────────────────────────── */

test('the Team screen is gated by can() per plan 6.3 and admin actions open the console, never a dead button', () => {
  const body = strip(team);
  assert.ok(!/isAdmin/.test(body), 'TeamScreen must not read isAdmin');
  assert.match(body, /can\(standing, 'seats\.view'\)/, 'seat counts are seats.view');
  assert.match(body, /can\(standing, 'team\.invite'\)/, 'Invite is team.invite');
  /* REWRITTEN 5 Sep 2026 (the simplification). This pinned NetworkPermissions
     into the sidebar under self.allow. 0.4.11 made the sidebar hold exactly
     one decision: your status. The same gate now guards StatusControl, and a
     second permissions card must not come back beside it; the per person
     setting is the drawer's dropdown, pinned by the teamsSetPolicy assertions
     below. Same gate, one surface fewer, nothing ungated. */
  assert.match(body, /can\(standing, 'self\.allow'\) && <StatusControl \/>/, 'your status is gated by self.allow, in the sidebar');
  assert.ok(!body.includes('NetworkPermissions'), 'the sidebar grew a second permissions surface back');
  assert.match(body, /can\(standing, 'seats\.manage'\)/);
  assert.match(body, /consoleUrl\(page\)/, 'admin actions go to the console page that owns them');
  assert.ok(!/team\.permissions/.test(body), 'no Permissions control: no route exists for it, so no row');
  assert.match(body, /requestInboxChat\(`dm:\$\{m\.id\}`\); nav\.go\('inbox'\)/, 'Message opens Inbox on that DM');
  /* 0.4.10. The drawer used to write `teamsSetYouAllow(open.id, level)`, one
     of three words on one axis. It now writes the three axis policy, and PRO
     must not reach the deprecated door at all: two doors onto one stored value
     is how the three controls that set a level and enforced none of them
     happened in the first place. Strictly stronger than the line it replaces,
     which only checked that SOME write existed. */
  assert.match(body, /teamsSetPolicy\?\.\(open\.id, policy\)/, 'the drawer writes a TeamPolicy, not a NetworkLevel');
  assert.ok(!/teamsSetYouAllow/.test(body), 'PRO must not write the deprecated one word door');
  assert.match(body, /teamsVerifyDevice\?\.\(open\.deviceId, open\.fingerprint\)/);
  const links = loadTs('src/shared/consoleLinks.ts');
  assert.equal(links.consoleUrl('members'), 'https://app.harnessmd.com/console/members');
  assert.equal(links.consoleUrl('billing', 'http://localhost:4311/'), 'http://localhost:4311/console/billing');
  const inbox = read('src/renderer/src/components/pro/InboxScreen.tsx');
  assert.match(inbox, /useState<string>\(\(\) => takeInboxChat\(\) \?\? 'floor'\)/, 'Inbox takes the handed-over chat on mount');
});

test('NetworkPermissions left the Automations org drawer, and the org row is gone (batch 3 #15)', () => {
  assert.ok(!autos.includes('NetworkPermissions'), 'NetworkPermissions still in AutomationsScreen');
  assert.doesNotMatch(strip(autos), /orgCfg|OrgEditor|org\.trigger\.key/, 'the organisation row is back');
  const settingsBody = strip(settings);
  // 0.5.3 batch 3 #15: organisation keys do not exist; the org panel has none.
  assert.doesNotMatch(strip(read('src/renderer/src/components/team/OrgPanel.tsx')), /OrgTriggerKey|org\.trigger\.key/, 'the org key row is back on the org panel');
  assert.match(settingsBody, /chrome === 'inline'/, 'SettingsModal has no inline chrome for the PRO page');
  const page = read('src/renderer/src/components/pro/SettingsScreen.tsx');
  assert.match(page, /<SettingsModal key=\{section \?\? ''\} config=\{config\} initialSection=\{section\} onClose=\{[^}]+\} chrome="inline" \/>/);
});

/* ───────────────────────────── profile ───────────────────────────────── */

test('Profile draws only reported facts, gates seats and entitlement, and arms sign out', () => {
  const body = strip(profile);
  assert.ok(!/isAdmin/.test(body));
  assert.match(body, /can\(standing, 'seats\.view'\)/);
  assert.match(body, /can\(standing, 'billing\.view'\)/);
  assert.match(body, /teamsForgetIdentity\?\.\(\)/, 'sign out is teams:identity:forget');
  assert.match(body, /if \(!armed\) \{ setArmed\(true\); return; \}/, 'sign out must be armed first');
  assert.match(body, /roster\.self\.fingerprint/, 'the fingerprint is the roster\'s, not typed in');
  assert.ok(!/SpritePortrait|Portrait/.test(body.replace('PersonInitials', '')), 'a person is initials, never a sprite');
});

test('useStanding is the one combiner of mode and /me', () => {
  const tm = read('src/renderer/src/components/team/teamsMode.ts');
  assert.match(tm, /export function useStanding\(\): OrgStanding/);
  assert.match(tm, /standingOf\(mode, org\?\.you\?\.isAdmin === true\)/);
  // Subdirectories included: pro/onboarding (0.4.9 phase 1) is under the same rule.
  const files = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
  const pro = files('src/renderer/src/components/pro').map((f) => strip(read(f))).join('\n');
  assert.ok(!/isAdmin/.test(pro), 'no PRO file reads isAdmin; every gate goes through can(useStanding(), perm)');
});

/* ───────────────────────────── i18n ──────────────────────────────────── */

test('every pro.* key the phase 4 screens use exists in all three locales', () => {
  const files = ['TempsScreen', 'TeamScreen', 'ProfileScreen', 'UpdatesScreen', 'SettingsScreen', 'ProSidebar'].map((f) => read(`src/renderer/src/components/pro/${f}.tsx`)).join('\n');
  const keys = new Set([...files.matchAll(/t\('((?:pro|team|common|rail)\.[a-zA-Z.]+)'/g)].map((m) => m[1]));
  for (const k of ['all', 'done', 'reaped', 'stopped']) keys.add(`pro.temps.filter.${k}`);
  for (const k of ['done', 'token-cap', 'idle', 'stopped', 'exited']) { keys.add(`pro.temps.result.${k}`); keys.add(`pro.temps.resultBlurb.${k}`); }
  for (const k of ['when', 'name', 'job', 'ran', 'tokens', 'result', 'worktree']) keys.add(`pro.temps.col.${k}`);
  for (const k of ['removed', 'preserved', 'none']) keys.add(`pro.temps.worktree.${k}`);
  for (const k of ['solo', 'member', 'admin']) keys.add(`pro.profile.standing.${k}`);
  for (const k of ['online', 'offline']) keys.add(`team.presence.${k}`);
  for (const k of ['active', 'suspended', 'removed']) keys.add(`team.org.membership.${k}`);
  for (const k of ['trialing', 'healthy', 'payment-failed', 'cancelled']) keys.add(`team.org.entitlement.${k}`);
  assert.ok(keys.size > 60, `parser found only ${keys.size} keys; the guard is disarmed`);
  for (const lang of ['en', 'zh-CN', 'ar']) {
    const dict = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`));
    for (const k of keys) {
      const v = k.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), dict);
      assert.equal(typeof v, 'string', `${lang} is missing ${k}`);
    }
  }
});

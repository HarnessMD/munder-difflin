'use strict';

/**
 * THE BOSS NICKNAME (founder order, 3 Sep 2026): "ask each Munder Difflin PRO
 * to choose a unique nickname for their boss and that will be how they will be
 * referenced and shown in the UI of team in other team members and they should
 * also be able to reference the team mate's agent by the team mate's name".
 *
 * Three properties, and each is tested where it actually lives:
 *   1. WHAT IS A NAME, and what makes two names the same one, is decided by
 *      src/shared/bossName.ts and by nothing else, because main claims with it,
 *      the field checks with it and the relay's uniqueness key is the same
 *      recipe. A second opinion anywhere is the bug this file exists to catch.
 *   2. THE CLAIM GOES TO THE RELAY FIRST. Uniqueness belongs to the org, so a
 *      rename that skipped the relay would put two Michaels on one roster.
 *   3. THE WORD IS SHOWN AND IS ADDRESSABLE: the roster line carries it (see
 *      test/teams-bridge.test.cjs for the line and the resolver), the rows draw
 *      it, and the router turns it into member:<id>.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PRO = 'src/renderer/src/components/pro';
const locale = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]);
const get = (o, k) => k.split('.').reduce((a, part) => (a && typeof a === 'object' ? a[part] : undefined), o);

const boss = loadTs('src/shared/bossName.ts');

/* ---- 1. one rule, one normaliser ------------------------------------------ */

test('a name is two to twenty four characters, and every script counts as letters', () => {
  for (const good of ['Scott', 'Mr. Scott', "D'Angelo", 'Boss 2', '老板', 'Señor', 'ab', 'x'.repeat(24)]) {
    assert.equal(boss.validateBossName(good).ok, true, good);
  }
  assert.equal(boss.validateBossName('').problem, 'empty');
  assert.equal(boss.validateBossName('   ').problem, 'empty');
  assert.equal(boss.validateBossName('a').problem, 'short');
  assert.equal(boss.validateBossName('x'.repeat(25)).problem, 'long');
  // The shape rule: no leading or trailing punctuation, nothing exotic inside.
  for (const bad of ['.Scott', "Scott'", 'Scott!', 'Scott<b>', 'a@b', 'Scott\n2']) {
    assert.equal(boss.validateBossName(bad).ok, false, bad);
    assert.equal(boss.validateBossName(bad).problem, 'chars', bad);
  }
  // Trimmed, otherwise as typed: the relay stores the word the person chose.
  assert.equal(boss.validateBossName('  Scott  ').name, 'Scott');
});

test('the same name is the same key: case, spacing and compatibility forms', () => {
  const k = boss.bossNameKey;
  assert.equal(k('Scott'), 'scott');
  assert.equal(k('  SCOTT  '), 'scott');
  assert.equal(k('Mr.   Scott'), 'mr. scott', 'inner runs collapse to one space');
  // NFKC, the same normalisation the relay's index uses. A fullwidth spelling
  // is not a second seat's chance at a name already taken.
  assert.equal(k('Ｓｃｏｔｔ'), 'scott');
  assert.equal(boss.sameBossName('Scott', 'ｓｃｏｔｔ'), true);
  assert.equal(boss.sameBossName('Scott', 'Scotty'), false);
  assert.equal(boss.sameBossName('Scott', null), false, 'a seat with no name collides with nobody');
  assert.equal(boss.sameBossName(null, null), false);
});

test('the holder lookup skips your own row and rows with no name', () => {
  const rows = [
    { id: 'me', name: 'You', bossName: 'Scott', isSelf: true },
    { id: 'pam', name: 'Pam Beesly', bossName: 'Dundie' },
    { id: 'ryan', name: 'Ryan Howard', bossName: null },
  ];
  assert.equal(boss.bossNameHolder('Scott', rows), null, 'your own name is not taken by someone else');
  assert.equal(boss.bossNameHolder('dundie', rows).id, 'pam');
  assert.equal(boss.bossNameHolder('Anything', rows), null);
  assert.equal(boss.bossNameHolder('Scott', rows, 'me'), null, 'skipped by id too');
});

/* ---- 2. the claim goes to the relay first --------------------------------- */

test('one door names the orchestrator, and it claims before it renames', () => {
  const main = strip(read('src/main/index.ts'));
  const handler = main.slice(main.indexOf("ipcMain.handle('teams:bossName:set'"), main.indexOf("ipcMain.handle('teams:connection'"));
  assert.ok(handler.includes('validateBossName('), 'the same rule as the field');
  const claim = handler.indexOf('patchMe({ bossName: name })');
  const rename = handler.indexOf('hive.presetGodName');
  assert.ok(claim > 0 && rename > 0, 'both halves are here');
  // `local` is DEFINED before the claim and CALLED after it; the call sites
  // that matter are the ones inside the branches, all of which follow.
  assert.ok(handler.indexOf('return local();', claim) > claim, 'nothing renames before the relay answered');
  assert.match(handler, /if \(res\.error === 'conflict'\) return \{[^}]*error: 'conflict'/, 'a taken word renames nothing');
  assert.match(handler, /res\.error === 'not_found'/, 'an older relay is not a refusal');
  assert.match(handler, /setBossNameNeeded\(false\)/, 'a successful claim clears the ask');

  // The join claims the name a machine already had, so an install that joins
  // later does not have to be asked for a word it has been using all along.
  const enrol = main.slice(main.indexOf("ipcMain.handle('teams:enrol'"), main.indexOf("ipcMain.handle('teams:connection'"));
  assert.match(enrol, /patchMe\(\{ bossName: parsed\.name \}\)/);
  assert.match(enrol, /setBossNameNeeded\(!claim\.ok && claim\.error === 'conflict'\)/, 'a refusal asks, never fails the join');
  assert.match(enrol, /if \(!res\.ok\) return res;/, 'a failed join claims nothing');
});

test('the preload door reports what the machine could not do, rather than pretending', () => {
  const pre = strip(read('src/preload/index.ts'));
  assert.match(pre, /teamsSetBossName: \(name: string\)/);
  assert.match(pre, /'conflict' \| 'invalid'/);
  for (const state of ['unsupported', 'offline']) {
    assert.ok(pre.includes(`${state}?: boolean`), `${state} is on the wire`);
  }
});

/* ---- 3. shown, and addressable -------------------------------------------- */

test('the router offers an unknown name to the bridge before it bounces', () => {
  const hive = strip(read('src/main/hive.ts'));
  assert.match(hive, /export interface RemoteBridge/, 'the bridge shape is declared, not implied');
  assert.match(hive, /resolve\?: \(name: string\) => \{ memberId: string \} \| \{ ambiguous: string\[\] \} \| null;/);
  const branch = hive.slice(hive.indexOf('if (t !== godId && !reg.agents[t] && this.remote.resolve)'));
  assert.ok(branch.length > 0, 'the resolve branch exists');
  assert.match(branch, /const to = `member:\$\{found\.memberId\}`;/, 'one match becomes a member address');
  assert.match(branch, /ambiguous/, 'more than one match bounces with the candidates');
  // Ordering: resolution is tried only after a real agent id failed to take it.
  assert.ok(hive.indexOf('if (this.deliver(msg, t)) { delivered.push(t); continue; }')
    < hive.indexOf('this.remote.resolve'), 'an agent on this floor always wins over a teammate name');

  const index = strip(read('src/main/index.ts'));
  assert.match(index, /resolve: \(name\) => teamsBridge\.resolveTeammate\(name\)/, 'the bridge is wired to the router');
});

test('every surface that shows a teammate shows the name their orchestrator goes by', () => {
  const screen = strip(read(`${PRO}/TeamScreen.tsx`));
  assert.match(screen, /mate\.bossName && <Chip tone="info" title=\{t\('team\.bossOf', \{ name: mate\.name \}\)\}>\{mate\.bossName\}<\/Chip>/,
    'the roster row draws the nickname, and only when there is one');
  assert.match(screen, /<BossNameField/, 'the self row can fix a missing name where the taken ones are listed');
  assert.match(screen, /m\?\.bossNameNeeded/, 'and asks only when the org actually refused the claim');

  const types = read('src/renderer/src/components/team/types.ts');
  assert.match(types, /bossName\?: string \| null;/, 'the roster row type carries it');
  const relay = strip(read('src/main/relay.ts'));
  assert.match(relay, /bossName: m\.bossName \?\? null/, 'main maps it onto the row the screens read');
  assert.match(relay, /export function patchMe/);
  assert.match(relay, /method: 'PATCH', path: '\/me'/);
});

test('the field is mounted in the three places a name can be chosen, and nowhere else', () => {
  const field = strip(read(`${PRO}/BossNameField.tsx`));
  assert.match(field, /window\.cth\.teamsSetBossName\(name\)/, 'one door');
  assert.match(field, /bossNameHolder\(parsed\.name, roster\.teammates\)/, 'the local check is the shared rule');
  assert.ok(!/PixelButton|PixelPanel|PixelBadge/.test(field), 'kit only');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(field), 'tokens only, no literal colour');

  // The onboarding half moved on 3 Sep 2026: the name is asked on the
  // ORCHESTRATOR's own step, beside the engine that runs it, not on the last
  // screen where it read as an afterthought.
  const onboarding = strip(read(`${PRO}/onboarding/OrchestratorStep.tsx`));
  assert.match(onboarding, /<BossNameField\s+initial=\{godName\} autoFocus hideSave onDraft=\{setName\} onSaved=\{setClaimed\}/);
  // CONTINUE IS THE CLAIM. Gating it on the field's own Save was a dead end:
  // Save is disabled while the word is still the prefilled one, so anyone
  // happy with "Michael" could never leave the step. The button owns the claim
  // now, and the guarantee moves with it: it still refuses to go on with a
  // name the org will not take, which is the whole reason this step exists.
  assert.match(onboarding, /const r = await claimBossName\(wanted\);/, 'the button claims the word itself');
  assert.match(onboarding, /if \(!r\.ok\) \{[\s\S]*?return;\s*\}/, 'a refused name does not advance the flow');
  assert.ok(onboarding.indexOf('onContinue();') > onboarding.indexOf('claimBossName('), 'and the claim comes first');
  assert.match(onboarding, /const ready = !!name\.trim\(\) && !blocked && !commandMissing && !claiming;/, 'an empty name cannot continue either');
  // THE CARD RENAMES AS YOU TYPE (founder, 3 Sep 2026). The nickname is not an
  // alias sitting beside Michael, it replaces him, so the rename has to be
  // visible while it happens: the card reads the DRAFT, never the claim.
  assert.match(onboarding, /const shown = name\.trim\(\) \|\| godName;/);
  assert.ok(!/claimed \?\? godName/.test(onboarding), 'the card waits for the claim before it renames');

  // And the last screen shows the word that was taken, asking for nothing.
  const team = strip(read(`${PRO}/onboarding/TeamStep.tsx`));
  assert.ok(!/BossNameField|claimBossName/.test(team), 'the name is asked twice');
  assert.match(team, /godName: string;/, 'the claimed word is handed down');

  const settings = strip(read('src/renderer/src/components/SettingsModal.tsx'));
  // 0.5.2 put the person's own name (NameSection) directly above it.
  assert.match(settings, /chrome === 'inline' && \(\s*<>\s*<NameSection \/>\s*<BossNameSection \/>/, 'PRO settings only; Classic keeps Edit Agent');
});

test('a name taken before the workspace exists is held, never refused', () => {
  // The step order made this unavoidable: the nickname is chosen on "Meet your
  // team" and the workspace is created by the button at the bottom of it, so at
  // the moment of the claim there is no registry to write into. Refusing there
  // reported a failure for a claim the relay had already accepted, and left the
  // person on a step with no way forward.
  const hive = strip(read('src/main/hive.ts'));
  assert.match(hive, /this\.pendingGodName = nextName;/, 'the name is held');
  assert.match(hive, /return \{ ok: true, name: nextName, deferred: true \};/, 'and reported as taken, because it was');
  assert.ok(!/presetGodName\(name: string\)[\s\S]{0,300}no harnessHome/.test(hive),
    'presetGodName no longer refuses a machine that has not picked a folder yet');
  assert.match(hive, /const deferred = this\.pendingGodName;[\s\S]{0,160}this\.presetGodName\(deferred\)/,
    'ensureHive writes it the moment there is somewhere to write it');
  assert.match(hive, /this\.pendingGodName = null;[\s\S]{0,80}this\.presetGodName\(deferred\)/,
    'cleared first, or the two call each other forever');
});

/* ---- the strings ---------------------------------------------------------- */

test('every nickname string exists in the three locales, with no dashes and no jargon', () => {
  const keys = new Set(['team.bossOf']);
  for (const f of [`${PRO}/BossNameField.tsx`, `${PRO}/TeamScreen.tsx`, `${PRO}/onboarding/TeamStep.tsx`]) {
    for (const m of strip(read(f)).matchAll(/\bt\(\s*'((?:pro\.boss|team\.boss)[^']*)'/g)) keys.add(m[1]);
  }
  for (const p of ['empty', 'short', 'long', 'chars']) keys.add(`pro.boss.err.${p}`);
  for (const p of ['offline', 'unsupported']) keys.add(`pro.boss.${p}`);
  assert.ok(keys.size >= 8, `found only ${keys.size} keys`);
  for (const l of ['en', 'zh-CN', 'ar']) {
    const loc = locale(l);
    for (const k of keys) assert.equal(typeof get(loc, k), 'string', `${l} is missing ${k}`);
  }
  // House style, and the fence's rule: no dashes in copy, no internal words.
  const banned = /harness config|\bhive\b|\bfloor\b|\bspawn(s|ed)?\b|\bpalace\b|\bpty\b/i;
  for (const [k, v] of flat(locale('en'))) {
    if (!k.startsWith('pro.boss') && k !== 'team.bossOf') continue;
    assert.ok(!/[—–]|(^| )-( |$)/.test(v), `${k} has a dash: ${v}`);
    assert.ok(!banned.test(v), `${k} says an internal word: ${v}`);
  }
  // The interpolation the title depends on must survive translation.
  for (const l of ['en', 'zh-CN', 'ar']) {
    assert.match(get(locale(l), 'team.bossOf'), /\{\{name\}\}/, `${l} dropped the name`);
  }
});

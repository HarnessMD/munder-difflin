// v0.4.9 phase 8: Teams in Classic, Option B, the Team window (plan Part 7).
//
// The founder's order: one dedicated place in Classic to see your teammates,
// message them, and read what they sent and what came back; every other teams
// and organisation trace leaves Classic. These pin that outcome: the window
// exists and reads the same roster and the same thread store the rest of the
// app reads, the Classic titlebar has the one door and PRO does not, the
// seam's panes stay PRO's, Classic Settings keeps one teams row, and every new
// string is in every locale.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const TEAM = 'src/renderer/src/components/team';
const PRO = 'src/renderer/src/components/pro';
const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));

test('the window exists, is Classic kit, and reads the roster and the thread CrossNodeThread reads', () => {
  const win = strip(read(`${TEAM}/TeamWindow.tsx`));
  assert.match(win, /export function TeamWindow\(/);
  assert.match(win, /export function TeamWindowButton\(/);
  for (const kit of ['PixelPanel', 'PixelButton', 'PixelBadge', 'SpritePortrait']) {
    assert.match(win, new RegExp(`import \\{ ${kit} \\} from '\\.\\./${kit}'`), `${kit} is the Classic kit`);
  }
  assert.match(win, /<SpritePortrait character=\{characterForTeammate\(mate\.name, mate\.id\)\}/, 'a teammate is a sprite, never initials');
  assert.ok(!/from '\.\.\/pro\/(?!proKeys')/.test(win), 'nothing from the PRO kit is drawn in Classic');
  assert.match(win, /const roster = useRoster\(\)/, 'the real roster');
  assert.match(win, /<CrossNodeThread key=\{selected\.id\} mate=\{selected\} \/>/,
    'the thread is the same component, so the same store and the same send');
  // The thread source, by its doors: useThread reads teamsThread and follows
  // onTeamsThread; the unread cache behind the badge reads the same two.
  const thread = strip(read(`${TEAM}/teamsThreads.ts`));
  const unread = strip(read(`${TEAM}/useUnreadTeamMessages.ts`));
  const crossNode = strip(read(`${TEAM}/CrossNodeThread.tsx`));
  assert.match(crossNode, /useThread\(mate\.id\)/);
  for (const door of ['teamsThread(', 'onTeamsThread']) {
    assert.ok(thread.includes(door), `useThread reads ${door}`);
    assert.ok(unread.includes(door), `the unread cache reads ${door}`);
  }
  assert.match(win, /useUnreadTeamMessages\(teammates\)/);
  assert.match(win, /unread\.markSeen\(selected\.id\)/, 'the thread on screen is read');
  assert.match(win, /mate\.verified && <PixelBadge status="success" label=\{t\('team\.verified'\)\}/, 'the Verified chip where the data has it');
  assert.match(win, /mate\.presence === 'online'/, 'a presence dot');
  assert.match(win, /<UpgradeToTeams/, 'solo gets the offer, not an empty directory');
  assert.match(crossNode, /el\.scrollTop = el\.scrollHeight/, 'newest at the bottom, and the bottom is in view');
});

test('Esc closes the window with the editable rule, in the capture phase', () => {
  const win = strip(read(`${TEAM}/TeamWindow.tsx`));
  assert.match(win, /if \(e\.key !== 'Escape'\) return;/);
  assert.match(win, /isEditable\(active\) && frameRef\.current\?\.contains\(active\)/, 'a field inside keeps the first Esc');
  assert.match(win, /\(active as HTMLElement\)\.blur\(\)/);
  assert.match(win, /window\.addEventListener\('keydown', onKey, true\)/, 'capture, so the fullscreen terminal never sees it');
  assert.match(win, /role="dialog"/);
});

test('the unread rule: their messages after the mark, never yours; the mark is their newest', () => {
  const U = loadTs(`${TEAM}/teamUnread.ts`);
  const line = (id, from, at, delivery = 'delivered') => ({ id, from, at, delivery, body: id, subject: '', act: '' });
  const msgs = [
    line('1', 'pam', '2026-09-03T10:00:00Z'),
    line('2', 'you', '2026-09-03T10:01:00Z', 'sending'),
    line('3', 'pam', '2026-09-03T10:02:00Z')
  ];
  assert.equal(U.unreadCount(msgs, undefined), 2, 'no mark: every one of theirs');
  assert.equal(U.unreadCount(msgs, '2026-09-03T10:00:00Z'), 1);
  assert.equal(U.unreadCount(msgs, '2026-09-03T10:02:00Z'), 0);
  assert.equal(U.unreadCount(msgs.map((m) => ({ ...m, delivery: 'failed' })), '2026-09-03T10:02:00Z'), 0, 'a delivery change is not a message');
  assert.equal(U.unreadCount([], undefined), 0);
  assert.equal(U.latestTheirs(msgs), '2026-09-03T10:02:00Z');
  assert.equal(U.latestTheirs(msgs.filter((m) => m.from === 'you')), null);
  assert.deepEqual(U.readSeen(), {}, 'no window: no marks and no throw');
  assert.doesNotThrow(() => U.writeSeen({ pam: '2026-09-03T10:02:00Z' }));
});

test('the chord: Meta or Ctrl with Shift and T, nothing else; the hint spells it per platform', () => {
  const K = loadTs(`${TEAM}/teamWindowKeys.ts`);
  const key = (k, mods = {}) => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });
  assert.equal(K.isTeamWindowChord(key('T', { metaKey: true, shiftKey: true })), true);
  assert.equal(K.isTeamWindowChord(key('T', { ctrlKey: true, shiftKey: true })), true, 'Ctrl on Windows and Linux');
  assert.equal(K.isTeamWindowChord(key('т', { metaKey: true, shiftKey: true, code: 'KeyT' })), true, 'another layout, the same key');
  assert.equal(K.isTeamWindowChord(key('t', { metaKey: true })), false, '⌘T is every browser\'s new tab');
  assert.equal(K.isTeamWindowChord(key('T', { shiftKey: true })), false, 'a capital T is typing');
  assert.equal(K.isTeamWindowChord(key('T', { metaKey: true, shiftKey: true, altKey: true })), false);
  assert.equal(K.isTeamWindowChord(key('N', { metaKey: true, shiftKey: true })), false, '⌘⇧N is the menu\'s New Floor');
  assert.equal(K.teamWindowHint('darwin'), '⌘⇧T');
  assert.equal(K.teamWindowHint('win32'), 'Ctrl+Shift+T');
  assert.equal(K.teamWindowHint(undefined), 'Ctrl+Shift+T');
  // PRO's table does not claim it, so the two cannot fire on one keystroke.
  const P = loadTs(`${PRO}/proKeys.ts`);
  assert.equal(P.proChordFor(key('T', { metaKey: true, shiftKey: true })), null);
  // The listener asks the table; the tooltip and the header read the hint.
  const state = strip(read(`${TEAM}/teamWindowState.ts`));
  assert.match(state, /if \(!isTeamWindowChord\(e\)\) return;/);
  assert.match(state, /window\.addEventListener\('keydown', onKey, true\)/, 'capture, so a terminal never sees it');
  assert.match(state, /export function openTeamWindow\(mate\?: Teammate\)/, 'any door can open it, naming a person');
  const win = strip(read(`${TEAM}/TeamWindow.tsx`));
  assert.match(win, /data-tip=\{tip\}/);
  assert.match(win, /\{hint\(\)\} · \{t\('teamWindow\.escHint'\)\}/, 'the header names the chord and Esc');
});

test('a teammate keeps one face: a cast first name is that sprite, anyone else a stable pick, never Michael', () => {
  const A = loadTs(`${TEAM}/teamAvatars.ts`);
  assert.equal(A.characterForTeammate('Pam Beesly', 'm_1'), 'pam');
  assert.equal(A.characterForTeammate('kevin', 'm_2'), 'kevin');
  const a = A.characterForTeammate('Chaitanya Giri', 'mem_abc');
  assert.equal(a, A.characterForTeammate('Chaitanya Giri', 'mem_abc'), 'the same person, the same face');
  assert.ok(typeof a === 'string' && a.length > 0);
  assert.notEqual(a, 'michael');
  assert.notEqual(A.characterForTeammate('Michael Scott', 'mem_x'), 'michael', 'Michael is the orchestrator');
  assert.ok(A.characterForTeammate('', 'mem_y'), 'a nameless row still gets a face');
});

test('App: Classic draws the button in the chrome slot and PRO its own chip; the window and the chord are Classic only', () => {
  const app = strip(read('src/renderer/src/App.tsx'));
  // 0.4.9 phase 6: the titlebar branches on the skin, and each branch draws
  // the chrome slot with its own occupant (test/pro-049-chrome.test.cjs).
  assert.match(app, /<AppChromeSlot><TeamWindowButton \/><\/AppChromeSlot>/);
  assert.match(app, /chrome=\{<AppChromeSlot><ProConnectionChip \/><\/AppChromeSlot>\}/);
  assert.match(app, /\{teamWindowOpen && skin !== 'professional' && \(\s*<TeamWindow onClose=\{closeTeamWindow\} \/>/);
  assert.match(app, /useTeamWindowShortcut\(skin !== 'professional'\)/);
  // The window mounts after Settings so it paints over it, and before the quit
  // warning, which outranks everything.
  const at = (s) => app.indexOf(s);
  assert.ok(at('<SettingsModal') < at('<TeamWindow onClose') && at('<TeamWindow onClose') < at('<QuitWarningModal'));
  // PRO draws nothing of it.
  for (const f of fs.readdirSync(path.join(ROOT, PRO))) {
    if (!/\.tsx?$/.test(f)) continue;
    assert.ok(!/TeamWindow/.test(strip(read(`${PRO}/${f}`))), `${f} references the Classic Team window`);
  }
});

test('Classic mounts neither the seam\'s roster pane nor its org pane; PRO still receives both through the seam', () => {
  const app = strip(read('src/renderer/src/App.tsx'));
  // The seam's panes and rows go to ProShell and nowhere else.
  assert.equal((app.match(/teamsPanes\(/g) || []).length, 1);
  const shellStart = app.indexOf('<ProShell');
  const shell = app.slice(shellStart, app.indexOf('/>', shellStart));
  // 0.4.10: both now pass through the solo filter, because a solo PRO install
  // has no team and must not be handed a row or a pane that opens on an empty
  // room. The guarantee this test exists for is unchanged and is now pinned
  // more tightly: the seam's rows and panes still reach ProShell and nowhere
  // else, and the ONLY thing between them is the standing filter.
  assert.match(shell, /companyRows=\{keepCompanyRows\(standing, teamRows\)\}/);
  assert.match(shell, /extraPanes=\{keepCompanyPanes\(standing, teamsPanes\(inOrg\)\)\}/);
  assert.match(app, /import \{[^}]*keepCompanyRows[^}]*\} from '@shared\/soloPro';/,
    'the filter must be the shared rule, not a second copy of it');
  const classic = app.slice(app.indexOf(') : (', shellStart), app.indexOf('<AgentStrip'));
  assert.ok(classic.length > 500, 'the Classic branch was found');
  assert.ok(!/teamsPanes|teamRows|TeamRosterPane|OrgPane|TeamsChrome/.test(classic), 'the Classic branch mounts a seam pane or the chip');
  // TeamTab and OrgPanel: reachable only through the seam, whose panes PRO
  // draws from extraPanes.
  const importers = walk('src/renderer/src').filter((f) => /\.tsx?$/.test(f) && /from '[^']*\/(TeamTab|OrgPanel)'/.test(strip(read(f))));
  assert.deepEqual(importers, [`${TEAM}/teamsSeam.tsx`], `TeamTab / OrgPanel imported by: ${importers.join(', ')}`);
  const seam = strip(read(`${TEAM}/teamsSeam.tsx`));
  assert.match(seam, /\[TEAM_PANE\]: <TeamRosterPane inOrg=\{inOrg\} \/>/);
  assert.match(seam, /\[ORG_PANE\]: <OrgPane \/>/);
  const win = strip(read(`${TEAM}/TeamWindow.tsx`));
  assert.ok(!/TeamTab|OrgPanel|team\.seats|entitlement/.test(win), 'the window draws no seats, no entitlement, no org panel');
});

test('seat counts and entitlement lines live only where members are gated from them: the seam\'s panes and PRO', () => {
  const sites = walk('src/renderer/src').filter((f) => /\.tsx?$/.test(f) && /team\.seats|entitlement\./.test(strip(read(f))));
  const allowed = new Set([`${TEAM}/TeamTab.tsx`, `${TEAM}/OrgPanel.tsx`]);
  const strays = sites.filter((f) => !allowed.has(f) && !f.startsWith(`${PRO}/`));
  assert.deepEqual(strays, [], `seats or entitlement drawn outside the gated panes: ${strays.join(', ')}`);
  assert.ok(sites.length >= 3, 'the scan found the known sites, so it is armed');
});

// 0.5.3 (settings redesign, founder 24 Sep: "remove the organisation setting
// from connections"): Settings carries no teams rows at all. The relay status
// is the Team window header's chip. Batch 3 #15: organisation keys do not
// exist, so the org panel has no key either.
test('Settings has no teams rows; the relay chip is the Team window\'s and no organisation key is anywhere', () => {
  const s = strip(read('src/renderer/src/components/SettingsModal.tsx'));
  assert.ok(!/ConnectionChip|teamWindow\.relay|org\.trigger\.key|OrgTriggerKey/.test(s), 'a teams row is back in Settings');
  assert.ok(!/team\.seats|useRoster|OrgPanel|TeamTab|NetworkPermissions/.test(s), 'no other teams surface in Settings');
  assert.match(strip(read(`${TEAM}/TeamWindow.tsx`)), /<ConnectionChip state=\{connection\.state\} reason=\{connection\.reason\} \/>/);
  const panel = strip(read(`${TEAM}/OrgPanel.tsx`));
  assert.ok(!/OrgTriggerKey|org\.trigger\.key|settings\.connections\.organisation/.test(panel), 'the organisation key is back on the org panel');
  assert.ok(!fs.existsSync(path.join(ROOT, `${TEAM}/OrgTriggerKey.tsx`)), 'OrgTriggerKey.tsx is back');
});

test('every teamWindow string exists in all three locales, the key sets match, and the English carries no dash', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
  const used = new Set();
  for (const f of [`${TEAM}/TeamWindow.tsx`]) {
    for (const m of strip(read(f)).matchAll(/\bt\(\s*'(teamWindow\.[^']+)'/g)) used.add(m[1]);
  }
  // 6 since 0.5.3: the three relay strings left with Settings' relay row.
  assert.ok(used.size >= 6, `the window uses ${used.size} of its strings`);
  for (const k of used) for (const l of Object.keys(locales)) assert.ok(locales[l].has(k), `${k} in ${l}`);
  const keysOf = (l) => [...locales[l].keys()].filter((k) => k.startsWith('teamWindow.')).sort();
  assert.deepEqual(keysOf('zh-CN'), keysOf('en'));
  assert.deepEqual(keysOf('ar'), keysOf('en'));
  for (const k of keysOf('en')) {
    const v = locales.en.get(k);
    assert.ok(!/—|–| - /.test(v), `${k} carries a dash: ${v}`);
    for (const l of ['zh-CN', 'ar']) assert.notEqual(locales[l].get(k), v, `${k} is untranslated in ${l}`);
    // Every key the window uses is drawn, so nothing sits in the file unused.
    assert.ok(used.has(k), `${k} is declared and never drawn`);
  }
  // Interpolating keys are called with their variable.
  const win = strip(read(`${TEAM}/TeamWindow.tsx`));
  assert.match(win, /t\('teamWindow\.tip', \{ hint: hint\(\) \}\)/);
  assert.match(win, /t\('teamWindow\.unreadAria', \{ count: unread\.total \}\)/);
  assert.match(win, /t\('teamWindow\.newCount', \{ count: unread \}\)/);
});

test('the release notes name the Team window under Unreleased, without a dash', () => {
  const log = read('CHANGELOG.md');
  const unreleased = log.slice(log.indexOf('## [Unreleased]'), log.indexOf('## [0.4.8]'));
  assert.ok(unreleased.includes('Team in Classic'));
  assert.ok(unreleased.includes('⌘⇧T'));
  assert.ok(!/—|–/.test(unreleased), 'the new notes carry no dashes');
});

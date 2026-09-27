'use strict';

/**
 * 0.5.3, features 1 to 4 (Snuggly Paws and Teminite, 10 to 12 Sep 2026): the
 * sidebar is the status view. Agents sit under their project, a row shows three
 * lines of its private note with the whole note on hover, and the list is
 * searched by what a note says. The two rules are pure (@shared/sidebarGroups,
 * @shared/noteTooltip); the sidebar only draws what they decide.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { groupAgentsByProject, showsGroupHeadings, matchesAgentSearch, projectOf, SIDEBAR_SEARCH_FROM } = loadTs('src/shared/sidebarGroups.ts');
const { noteShownLines, noteNeedsTooltipClamped, noteNeedsTooltip } = loadTs('src/shared/noteTooltip.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const a = (id, project, extra = {}) => ({ id, name: id, project, ...extra });

test('agents group by the project folder they were hired into, never by the worktree they run in', () => {
  // Two isolated agents on one repo: different cwd, same project.
  const ordered = [
    a('god', 'hive', { isGod: true }),
    a('pam', 'munder-difflin-pro', { cwd: '/home/worktrees/pam' }),
    a('jim', 'landing-site'),
    a('dwight', 'munder-difflin-pro', { cwd: '/home/worktrees/dwight' })
  ];
  const { pinned, groups } = groupAgentsByProject(ordered);
  assert.deepEqual(pinned.map((x) => x.id), ['god'], 'the orchestrator belongs to no project and stays on top');
  assert.deepEqual(groups.map((g) => [g.label, g.agents.map((x) => x.id)]), [
    ['munder-difflin-pro', ['pam', 'dwight']],
    ['landing-site', ['jim']]
  ]);
  assert.equal(projectOf({ id: 'x', name: 'x', project: '  api  ' }), 'api');
});

test('order is inherited: groups by their first member, members as they came, no project last', () => {
  const ordered = [a('ryan', ''), a('jim', 'site'), a('pam', 'Pro'), a('oscar', 'site'), a('kelly', undefined), a('dwight', 'pro')];
  const { groups } = groupAgentsByProject(ordered);
  assert.deepEqual(groups.map((g) => g.key), ['site', 'pro', '']);
  assert.deepEqual(groups[1].agents.map((x) => x.id), ['pam', 'dwight'], 'Pro and pro are one folder to a person');
  assert.equal(groups[1].label, 'Pro', 'and it keeps the spelling it was first seen with');
  assert.deepEqual(groups[2].agents.map((x) => x.id), ['ryan', 'kelly']);
  assert.deepEqual(ordered.map((x) => x.id), ['ryan', 'jim', 'pam', 'oscar', 'kelly', 'dwight'], 'the input is not reordered');
});

test('headings are drawn only when there is something to tell apart', () => {
  assert.equal(showsGroupHeadings(groupAgentsByProject([a('jim', 'site'), a('pam', 'site')]).groups), false);
  assert.equal(showsGroupHeadings(groupAgentsByProject([a('god', 'hive', { isGod: true })]).groups), false);
  assert.equal(showsGroupHeadings(groupAgentsByProject([a('jim', 'site'), a('pam', 'pro')]).groups), true);
});

test('search finds an agent by what its private note says', () => {
  const dwight = a('Dwight', 'billing', { note: 'Owns the Razorpay path.\nAsk before touching prod.', model: 'gpt-5.2-codex', provider: 'codex', description: 'payments engineer' });
  assert.equal(matchesAgentSearch(dwight, 'razorpay'), true, 'a word from the note');
  assert.equal(matchesAgentSearch(dwight, 'PROD razorpay'), true, 'every word, any order, any case, across lines');
  assert.equal(matchesAgentSearch(dwight, 'razorpay stripe'), false, 'every word has to be there');
  for (const q of ['dwi', 'billing', 'codex', 'payments', '']) assert.equal(matchesAgentSearch(dwight, q), true, q);
  assert.equal(matchesAgentSearch(a('Jim', 'site'), 'razorpay'), false);
  assert.equal(matchesAgentSearch({ id: 'x', name: 'X' }, 'note'), false, 'an agent with no note is not an error');
  assert.equal(SIDEBAR_SEARCH_FROM, 5);
});

test('a three line row shows a tooltip only when its clamp cut something', () => {
  assert.equal(noteShownLines('one\n\n  \ntwo  \nthree'), 'one\ntwo\nthree', 'blank lines do not spend the row');
  assert.equal(noteNeedsTooltipClamped('', 3, null), false);
  assert.equal(noteNeedsTooltipClamped('a\nb\nc', 3, null), false, 'three lines fit in three lines');
  assert.equal(noteNeedsTooltipClamped('a\nb\nc\nd', 3, null), true, 'four do not, known before layout');
  assert.equal(noteNeedsTooltipClamped('a\nb', 3, { scrollHeight: 26, clientHeight: 26 }), false, 'two lines, all shown: no tooltip');
  assert.equal(noteNeedsTooltipClamped('one very long line that wraps to five', 3, { scrollHeight: 66, clientHeight: 39 }), true, 'one line that wrapped past three is cut too');
  // The one line rule the classic row uses is unchanged.
  assert.equal(noteNeedsTooltip('a\nb', null), true);
});

test('the clamp is applied AFTER the caller style, or a row that asks for display block switches it off', () => {
  // Seen in the preview harness on 20 Sep: the sidebar passes display: block,
  // four lines drew, and nothing looked wrong until the row was measured.
  const src = read('src/renderer/src/components/NoteTooltip.tsx');
  assert.match(src, /\? \{ \.\.\.style, display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-line', overflowWrap: 'anywhere' \}/);
  assert.match(src, /lines > 1\s+\? noteNeedsTooltipClamped\(note, lines, \{ scrollHeight: el\.scrollHeight, clientHeight: el\.clientHeight \}\)/);
  assert.match(src, /\{lines > 1 \? noteShownLines\(note\) : first\}/);
});

test('the professional sidebar draws what the rules decide, and gives a row nothing new', () => {
  const sb = read('src/renderer/src/components/pro/ProSidebar.tsx');
  assert.match(sb, /orderedAgents\.filter\(\(a\) => matchesAgentSearch\(a, agentQuery\)\)/);
  assert.match(sb, /groupAgentsByProject\(shownAgents\)/);
  assert.match(sb, /agents\.length >= SIDEBAR_SEARCH_FROM && \(\s*<label data-agent-search/);
  assert.match(sb, /const open = searching \|\| !shutGroups\.includes\(g\.key\);/, 'a search opens every folded group');
  assert.match(sb, /data-agent-group=\{g\.key\} aria-expanded=\{open\}/);
  assert.match(sb, /GROUPS_SHUT_KEY = 'cth\.proAgentGroupsShut'/);
  assert.match(sb, /data-agent-note-text\s+lines=\{3\}/);
  // The seam agreed with Creed on 20 Sep: grouping and search choose WHICH
  // agents get a row. Since Pam's audit (0.5.3, F25) the row is given an id
  // and one stable callback, and reads its own agent; the seam is the same.
  assert.match(sb, /<AgentRow key=\{a\.id\} id=\{a\.id\} active=\{current === `agent:\$\{a\.id\}`\} onSelect=\{selectAgent\} onGo=\{goTo\} \/>/);
  assert.equal([...sb.matchAll(/<AgentRow\b/g)].length, 1, 'one place draws a row');
});

test('the Agents screen searches by the same rule, note included', () => {
  const screen = read('src/renderer/src/components/pro/AgentsScreen.tsx');
  assert.match(screen, /others\.filter\(\(a\) => matchesAgentSearch\(a, q\)\)/);
});

test('the three new sentences exist in every language', () => {
  for (const lng of ['en', 'zh-CN', 'ar']) {
    const s = JSON.parse(read(`src/renderer/src/i18n/locales/${lng}.json`)).pro.sidebar;
    for (const k of ['searchAgents', 'noAgentMatches', 'noProject']) assert.ok(s[k] && s[k].trim(), `${lng} ${k}`);
    assert.match(s.noAgentMatches, /\{\{query\}\}/);
    assert.doesNotMatch(Object.values(s).join(' '), /[–—]/, 'house style: no dashes');
  }
});

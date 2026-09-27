'use strict';

/**
 * 0.5.3, founder 24 Sep 2026, Ask me batch 2 (after batch 1):
 *   1. "the ask me tab below where the queue input is should be having
 *      padding at the top it looks abrupt"
 *   2. "The ask me modal should have a dismiss all button if there are more
 *      than one."
 *   3. "Confirm that ask me shown in the agent's tab is only the questions
 *      that that agent has asked, global ask me shows in Michael's (the
 *      orchestrator) tab."
 *   4. "If more than 1 ask me is present then the sidebar should always show
 *      the most recent ask me. in the sidebar agent card."
 * The rules run for real; the wiring is pinned in the source.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { asksFor, askerOf, ownsAsk } = loadTs('src/shared/askMeBadge.ts');
const { compareByNewestAsk } = loadTs('src/renderer/src/components/askMeOrder.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PRO = 'src/renderer/src/components/pro';

const ago = (min) => new Date(Date.UTC(2026, 8, 24, 12, 0) - min * 60_000).toISOString();
const ask = (q, min, extra = {}) => ({ q, askedAt: ago(min), ...extra });
const ids = (xs) => xs.map((x) => x.id);

// ─── 1. the dock has room above it ──────────────────────────────────────────

test('1. the dock sits on the thread paper with 12px above the box, the same gutter as the thread', () => {
  const inbox = read(`${PRO}/AgentInbox.tsx`);
  assert.match(inbox, /const ASK_DOCK_PAD_TOP = 12;/);
  assert.match(inbox, /<div data-ask-me-dock style=\{\{ flexShrink: 0, padding: `\$\{ASK_DOCK_PAD_TOP\}px 22px 10px`, background: 'var\(--cth-paper-100\)' \}\}>/);
  const section = inbox.slice(inbox.indexOf('<section data-ask-me-section'), inbox.indexOf('</section>'));
  // An empty thread wears the same paper, so the dock is never a band.
  assert.match(inbox, /<div data-inbox-empty style=\{\{[^}]*background: 'var\(--cth-paper-100\)' \}\}>/);
  assert.doesNotMatch(section.split('\n')[0], /margin/, 'the space is the dock\'s padding, not a margin showing another surface');
});

// ─── 3. scoping: the agent's own asks on its tab, global asks on the orchestrator's ─

const FLOOR = [
  { id: 'a', assignee: 'pam-1', humanQA: [ask('Pam\'s question', 5)] },
  { id: 'b', assignee: 'Pam', humanQA: [ask('Pam by name', 9)] },
  { id: 'c', humanQA: [ask('floor wide, no owner', 3)] },
  { id: 'd', assignee: 'god', humanQA: [ask('the orchestrator\'s own', 4)] },
  // The orchestrator wrote this one on Pam's card but says it is Jim's.
  { id: 'e', assignee: 'pam-1', humanQA: [ask('Jim\'s question on Pam\'s card', 1, { from: 'jim-9' })] },
  // An answered earlier entry's `from` never decides the open one.
  { id: 'f', assignee: 'jim-9', humanQA: [{ q: 'old', a: 'yes', from: 'pam-1' }, ask('Jim again', 2)] }
];

test('3. an agent\'s tab lists only its own asks; global ones go to the orchestrator and nowhere else', () => {
  assert.deepEqual(ids(asksFor(FLOOR, 'pam-1', 'Pam')), ['a', 'b']);
  assert.deepEqual(ids(asksFor(FLOOR, 'jim-9', 'Jim')), ['e', 'f']);
  assert.deepEqual(ids(asksFor(FLOOR, 'michael-1', 'Michael', true)), ['c', 'd']);
  // Every waiting ask lands on exactly one tab.
  const tabs = [['pam-1', 'Pam', false], ['jim-9', 'Jim', false], ['michael-1', 'Michael', true]];
  for (const w of FLOOR) {
    assert.equal(tabs.filter(([id, name, god]) => ownsAsk(w, id, name, god)).length, 1, w.id);
  }
});

test('3. the asker is the open entry\'s `from` when recorded, else the card\'s assignee', () => {
  assert.equal(askerOf(FLOOR[4]), 'jim-9');
  assert.equal(askerOf(FLOOR[5]), 'jim-9', 'an answered entry is history, not the asker');
  assert.equal(askerOf(FLOOR[0]), 'pam-1');
  assert.equal(askerOf({ humanQA: [ask('x', 1, { from: '   ' })] }), '', 'a blank from is no from: global');
  assert.equal(askerOf({}), '');
});

test('3. `from` survives the renderer\'s re-parse, so answering cannot move an ask to another tab', () => {
  const k = read('src/renderer/src/components/TasksKanban.tsx');
  assert.match(k, /\.\.\.\(typeof e\.from === 'string' && e\.from\.trim\(\) \? \{ from: e\.from \} : \{\}\)/);
  for (const p of ['src/main/hive.ts', 'src/preload/index.ts', 'src/renderer/src/components/TasksKanban.tsx']) {
    const s = read(p);
    const qa = s.slice(s.indexOf('export interface HumanQA {'), s.indexOf('}', s.indexOf('export interface HumanQA {')));
    assert.match(qa, /from\?: string;/, p);
  }
  // The orchestrator is told to record it, in its brief and in PROTOCOL.md.
  const hive = read('src/main/hive.ts');
  assert.match(hive, /push \{"q":"\.\.\.","askedAt":"<iso>","from":"<agent id>"\}/);
  assert.match(hive, /\{ "q": "the ask, in markdown", "askedAt": "<iso timestamp>", "from": "<agent id>" \}/);
  // The card names the same asker the tab is chosen by.
  const card = read(`${PRO}/AskMeCard.tsx`);
  assert.match(card, /const asker = askerOf\(task\) \|\| undefined;/);
  assert.match(card, /nameFor\(asker\) \?\? nameFor\('god'\)/);
});

// ─── 4. the rail card shows the newest ask ──────────────────────────────────

test('4. the rail card\'s Asked you is the newest of the agent\'s asks, not the first in the ledger', () => {
  // Ledger order is creation order: the oldest ask sits first.
  const ledger = [
    { id: 'old', status: 'blocked', assignee: 'pam-1', humanQA: [ask('from yesterday', 60 * 20)] },
    { id: 'mid', status: 'blocked', assignee: 'pam-1', humanQA: [ask('from this morning', 90)] },
    { id: 'new', status: 'blocked', assignee: 'Pam', humanQA: [ask('just now', 1)] }
  ];
  const open = (t) => t.humanQA.filter((e) => !e.a && !e.dismissedAt).at(-1);
  const newest = asksFor(ledger, 'pam-1', 'Pam').sort((a, b) => compareByNewestAsk(open(a), open(b)))[0];
  assert.equal(newest.id, 'new');
  assert.notEqual(asksFor(ledger, 'pam-1', 'Pam')[0].id, 'new', 'the old code\'s pick, for contrast');

  const rail = read(`${PRO}/ProSidebar.tsx`);
  const fn = rail.slice(rail.indexOf('function askFor('), rail.indexOf('function AgentRowBody'));
  assert.match(fn, /asksFor\(tasks\.filter\(waitsOnHuman\), agent\.id, agent\.name, agent\.isGod === true\)\.sort\(\(a, b\) => compareByNewestAsk\(openQuestion\(a\), openQuestion\(b\)\)\)\[0\]/,
    'the Ask me section\'s own rule and order');
  assert.match(fn, /text: previewLine\(openQuestion\(newest\)\?\.q \?\? ''\) \|\| undefined, card: newest\.id/, 'the text shown and the card opened are the same ask');
  assert.doesNotMatch(fn, /tasksOf/, 'no ledger order walk left');
  // Since rc.4 "Sidebar shows only agents and notes" skips the ask (v053-sidebar-agents-notes-only).
  assert.match(rail, /const \{ text: ask, card: askCard \} = useMemo\(\(\) => \(bare \? \(\{\} as ReturnType<typeof askFor>\) : askFor\(agent, tasks\)\), \[agent, tasks, bare\]\);/);
});

// ─── 2. Dismiss all ─────────────────────────────────────────────────────────

// 2. Dismiss all's bulk step is now test/v053-dismiss-all-at-once.test.cjs
// (founder on rc.4: "it should be doing it all at once").

test('2. the sheet shows Dismiss all only for two or more, and asks once before it acts', () => {
  const m = read(`${PRO}/AskMeModal.tsx`);
  assert.match(m, /\{waiting\.length > 1 && !confirming && \(\n\s*<Btn kind="ghost" size="sm" disabled=\{busy !== null\} dataAttrs=\{\{ 'data-ask-me-dismiss-all': '' \}\} onClick=\{\(\) => setConfirming\(true\)\}>/);
  assert.match(m, /\{confirming && waiting\.length > 1 && \(\n\s*<div data-ask-me-dismiss-confirm role="alertdialog"/);
  assert.match(m, /onClick=\{\(\) => \{ void dismissAll\(waiting\)\.finally\(\(\) => setConfirming\(false\)\); \}\}/);
  assert.doesNotMatch(m, /window\.confirm|\bconfirm\(/, 'never a browser dialog');
  const card = read(`${PRO}/AskMeCard.tsx`);
  assert.match(card, /const r = await dismissAllOpenQuestions\(tasks\)\.catch\([^\n]*\);\n\s*await refresh\(\);/, 'one re-read after the run');
});

test('2. the new words exist in every language, with no dashes', () => {
  for (const lng of ['en', 'zh-CN', 'ar']) {
    const a = JSON.parse(read(`src/renderer/src/i18n/locales/${lng}.json`)).pro.askMe;
    for (const k of ['dismissAll', 'dismissAllConfirm', 'dismissing', 'cancel']) {
      assert.ok(a[k] && a[k].trim(), `${lng} ${k}`);
      assert.doesNotMatch(a[k], /[–—-]/, `${lng} ${k}`);
    }
    assert.match(a.dismissAllConfirm, /\{\{count\}\}/, lng);
  }
});

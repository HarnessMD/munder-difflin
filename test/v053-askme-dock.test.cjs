'use strict';

/**
 * 0.5.3, founder 24 Sep 2026: "the ask me box should be smaller and placed
 * somewhere else and blend with the theme." It was a full width peach block
 * at the top of an agent's Inbox feed, orange caps, two line questions, about
 * 130px for one question.
 *
 *   PLACE   docked under the thread, so it sits directly above the composer
 *           where the answer is typed, in both places that draw an agent's
 *           conversation (the agent's Inbox tab and the Inbox screen's row).
 *   SMALLER one 32px row per question, the question on one line with an
 *           ellipsis, the task id, the time and Answer; three rows show and
 *           more scroll.
 *   BLEND   kit tokens only: the composer's queue box surface, one even 1px
 *           line, the kit chip for the count, ink and muted text. No waiting
 *           tint, no status colour, no caps, no raw hex.
 *
 * Answering is unchanged: a row opens the Ask me modal on its question.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const inbox = read(`${PRO}/AgentInbox.tsx`);
const section = inbox.slice(inbox.indexOf('function AskMeSection'), inbox.indexOf('function AgentThread'));

test('the section is docked under the thread, so it sits directly above the composer', () => {
  assert.match(inbox, /<>\n      <AgentThread agent=\{agent\} \/>\n      <AskMeSection agent=\{agent\} \/>\n    <\/>/);
  // In both parents the next thing after AgentInbox's column is the composer.
  const screen = read(`${PRO}/AgentScreen.tsx`);
  const pane = screen.indexOf('<Pane show={tab === \'inbox\'}><AgentInbox agent={agent} /></Pane>');
  assert.notEqual(pane, -1);
  const after = pane + '<Pane show={tab === \'inbox\'}><AgentInbox agent={agent} /></Pane>'.length;
  const between = screen.slice(after, screen.indexOf('<Composer agent={agent}', after));
  assert.doesNotMatch(between, /<AgentInbox|<section|data-ask-me/, 'only the terminal pane sits between the inbox and the composer');
  const inboxScreen = read(`${PRO}/InboxScreen.tsx`);
  assert.match(inboxScreen, /<AgentInbox agent=\{agent\} \/>\n      <AgentComposer agent=\{agent\} \/>/);
  // The thread takes the free height, the dock keeps its own. Batch 2 (24 Sep)
  // wrapped the section in a padded dock, so the fixed height moved there.
  assert.match(section, /<div data-ask-me-dock style=\{\{ flexShrink: 0,/);
});

test('smaller: one line per question with an ellipsis, three rows before it scrolls', () => {
  assert.match(inbox, /const ASK_ROW_H = 32;/);
  assert.match(section, /maxHeight: ASK_ROW_H \* 3, overflowY: 'auto'/);
  assert.match(section, /height: ASK_ROW_H,/);
  assert.match(section, /<span data-ask-me-q style=\{\{[^}]*whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' \}\}>/);
  assert.doesNotMatch(section, /WebkitLineClamp/, 'no two line clamp');
  assert.match(section, /\{task\.id\}/);
  assert.match(section, /fmtWhen\(open\.askedAt, i18n\.language\)/);
  assert.match(section, /<span data-ask-me-answer[^>]*>\{t\('pro\.askMe\.answer'\)\}<\/span>/);
});

test('blend: kit tokens only, no waiting tint, no status colour, no caps, no raw hex', () => {
  assert.doesNotMatch(section, /#[0-9a-fA-F]{3,8}\b/, 'a raw hex');
  assert.doesNotMatch(section, /status-waiting|status-blocked|accent/, 'a status or accent colour');
  assert.doesNotMatch(section, /textTransform|uppercase/, 'caps');
  assert.match(section, /border: '1px solid var\(--cth-ink-300\)', background: 'var\(--cth-cream-100\)'/, 'the composer queue box surface');
  assert.match(section, /<Chip tone="outline"[^>]*>\{mine\.length\}<\/Chip>/, 'the kit chip for the count');
  assert.doesNotMatch(section, /border(Left|Right)|borderBottom/, 'even edges: rows are divided by one top line each');
  const g = read('src/renderer/src/design/global.css');
  assert.match(g, /\.cth-ask-row \{ background: transparent; transition: background-color 120ms ease; \}/);
  assert.match(g, /\.cth-ask-row:hover \{ background: var\(--cth-cream-200\); \}/);
});

test('answering is unchanged: a row opens the modal on its own question and never navigates', () => {
  assert.match(section, /onClick=\{\(\) => openAskMe\(\{ taskId: task\.id \}\)\}/);
  assert.match(section, /if \(mine\.length === 0\) return null;/);
  assert.doesNotMatch(section, /usePaneNav|nav\.go|requestInboxChat/);
});

test('the Answer word in every language, no dashes', () => {
  for (const lng of ['en', 'zh-CN', 'ar']) {
    const w = JSON.parse(read(`src/renderer/src/i18n/locales/${lng}.json`)).pro.askMe.answer;
    assert.ok(w && w.trim(), lng);
    assert.doesNotMatch(w, /[–—-]/, lng);
  }
});

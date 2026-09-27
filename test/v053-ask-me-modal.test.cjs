'use strict';

/**
 * 0.5.3, the Pro rail V2 founder requirements (HANDOFF.md):
 *   1. every agent's Inbox, the orchestrator's included, has an Ask me section
 *      listing the questions that agent is waiting on the person for;
 *   2. clicking one opens the Ask me modal on that question, the same modal
 *      the bell opens, so the answer is given without leaving the screen.
 * The rule is pure and tested directly; the wiring is pinned in the source.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { asksFor, ownsAsk, askMeBadge } = loadTs('src/shared/askMeBadge.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PRO = 'src/renderer/src/components/pro';

const WAITING = [
  { id: 't1', assignee: 'pam-1' },
  { id: 't2', assignee: 'Jim' },
  { id: 't3' },
  { id: 't4', assignee: 'god' },
  { id: 't5', assignee: '  PAM ' },
  { id: 't6', assignee: '' }
];
const ids = (xs) => xs.map((x) => x.id);

test('a worker owns the cards assigned to its id or its name, in the order given', () => {
  assert.deepEqual(ids(asksFor(WAITING, 'pam-1', 'Pam')), ['t1', 't5'], 'a hand written card names the agent, in any case and spacing');
  assert.deepEqual(ids(asksFor(WAITING, 'jim-9', 'jim')), ['t2']);
  assert.deepEqual(ids(asksFor(WAITING, 'oscar-3', 'Oscar')), [], 'nothing of its own: the section is absent');
});

test('a worker never owns a card with no assignee, and never a card assigned to "god"', () => {
  assert.equal(ownsAsk({}, 'pam-1', 'Pam'), false);
  assert.equal(ownsAsk({ assignee: '' }, 'pam-1', 'Pam'), false);
  assert.equal(ownsAsk({ assignee: 'god' }, 'pam-1', 'Pam'), false);
});

test('the orchestrator owns his own cards and the unassigned ones, which the Ask Me chat already names as his', () => {
  assert.deepEqual(ids(asksFor(WAITING, 'michael-1', 'Michael', true)), ['t3', 't4', 't6']);
  assert.equal(ownsAsk({ assignee: 'Michael' }, 'michael-1', 'Michael', true), true);
  assert.equal(ownsAsk({ assignee: 'pam-1' }, 'michael-1', 'Michael', true), false, 'a worker\'s ask stays in the worker\'s section');
});

test('the bell\'s "mine" is the section\'s length: one list counted two ways', () => {
  for (const [id, name, god] of [['pam-1', 'Pam', false], ['jim-9', 'jim', false], ['michael-1', 'Michael', true], ['oscar-3', 'Oscar', false]]) {
    assert.equal(askMeBadge(WAITING, id, name, god).mine, asksFor(WAITING, id, name, god).length, id);
    assert.equal(askMeBadge(WAITING, id, name, god).total, WAITING.length);
  }
});

test('the modal store: one target, opened on a question or on the whole list, closed once', () => {
  const src = read(`${PRO}/askMeModalStore.ts`);
  assert.match(src, /export function openAskMe\(next: AskMeTarget = \{\}\): void \{\n  target = next;\n  notify\(\);/);
  assert.match(src, /export function closeAskMe\(\): void \{\n  if \(target === null\) return;/, 'closing twice notifies nobody twice');
  assert.match(src, /useSyncExternalStore\(subscribe, read, read\)/);
});

test('every agent\'s Inbox carries the section, because both places that draw an agent\'s conversation draw AgentInbox', () => {
  const inbox = read(`${PRO}/AgentInbox.tsx`);
  // 0.5.3, 24 Sep: docked under the thread, over the composer (v053-askme-dock).
  assert.match(inbox, /export function AgentInbox\(\{ agent \}: \{ agent: Agent \}\) \{\n  return \(\n    <>\n      <AgentThread agent=\{agent\} \/>\n      <AskMeSection agent=\{agent\} \/>/);
  assert.match(inbox, /asksFor\(\(tasks \?\? \[\]\)\.filter\(waitsOnHuman\), agent\.id, agent\.name, agent\.isGod === true\)/, 'the bell\'s rule, the Inbox\'s filter');
  assert.match(inbox, /if \(mine\.length === 0\) return null;/, 'absent, not an empty box');
  assert.match(inbox, /onClick=\{\(\) => openAskMe\(\{ taskId: task\.id \}\)\}/, 'a row opens the modal on its own question');
  assert.match(read(`${PRO}/AgentScreen.tsx`), /<AgentInbox agent=\{agent\} \/>/, 'a worker\'s screen');
  assert.match(read(`${PRO}/InboxScreen.tsx`), /<AgentInbox agent=\{agent\} \/>/, 'and every agent row of the Inbox, the orchestrator\'s pinned card included');
});

test('the modal: mounted once, the question it was opened on leads and takes the caret, answers through askMeActions', () => {
  const shell = read(`${PRO}/ProShell.tsx`);
  assert.equal((shell.match(/<AskMeModalHost \/>/g) ?? []).length, 1);
  const modal = read(`${PRO}/AskMeModal.tsx`);
  assert.match(modal, /<Sheet onClose=\{closeAskMe\}/, 'Esc and the backdrop close it, as every sheet');
  // Dismiss all (0.5.3 rc.4) hides what it has just sent (`gone`) until the ledger re-reads.
  assert.match(modal, /\(tasks \?\? \[\]\)\.filter\(\(x\) => waitsOnHuman\(x\) && !gone\.has\(x\.id\)\)\.sort\(\(a, b\) => compareByNewestAsk\(openQuestion\(a\), openQuestion\(b\)\)\)/, 'the Ask Me chat\'s list, in its order');
  assert.match(modal, /return i > 0 \? \[list\[i\], \.\.\.list\.slice\(0, i\), \.\.\.list\.slice\(i \+ 1\)\] : list;/);
  assert.match(modal, /focus=\{focusId \? task\.id === focusId : i === 0\}/);
  assert.match(modal, /if \(loaded && waiting\.length === 0 && busy === null\) closeAskMe\(\);/, 'the last answer closes it, never the first frame');
  assert.match(modal, /onOpenTask=\{\(id\) => \{ closeAskMe\(\); openTaskDetail\(id\); \}\}/, 'the task sheet is not opened under the modal');
  const card = read(`${PRO}/AskMeCard.tsx`);
  assert.match(card, /answerOpenQuestion\(task, drafts\[task\.id\] \?\? ''\)/);
  assert.match(card, /dismissOpenQuestion\(task\)/);
  assert.match(read(`${PRO}/InboxScreen.tsx`), /<AskMeCard key=\{task\.id\}/, 'the Inbox chat draws the same card');
});

test('answer right there: the bell, the section and the rail\'s Asked you strip open the modal and never navigate', () => {
  const bell = read(`${PRO}/AskMeBell.tsx`);
  assert.match(bell, /onClick=\{\(\) => openAskMe\(\)\}/);
  assert.doesNotMatch(bell, /usePaneNav|nav\.go|requestInboxChat/, 'the bell holds no way to leave the screen');
  const modal = read(`${PRO}/AskMeModal.tsx`);
  assert.doesNotMatch(modal, /usePaneNav|nav\.go|requestInboxChat/, 'nor does the modal');
  const card = read(`${PRO}/AskMeCard.tsx`);
  assert.doesNotMatch(card, /usePaneNav|nav\.go|requestInboxChat/, 'nor the card it draws');
  const inbox = read(`${PRO}/AgentInbox.tsx`);
  const section = inbox.slice(inbox.indexOf('function AskMeSection'), inbox.indexOf('function AgentThread'));
  assert.ok(section.length > 0);
  assert.doesNotMatch(section, /usePaneNav|nav\.go|requestInboxChat/, 'nor the section');
  // The strip sits inside the row, whose click opens the agent screen: the
  // strip stops the click before the row sees it.
  const rail = read(`${PRO}/ProSidebar.tsx`);
  assert.match(rail, /onClick=\{askCard \? \(e\) => \{ stop\(e\); openAskMe\(\{ taskId: askCard \}\); \} : undefined\}/);
  // Batch 2 (24 Sep) sorted it newest first, the section's own order; see
  // v053-askme-batch2 for the full pin.
  assert.match(rail, /asksFor\(tasks\.filter\(waitsOnHuman\), agent\.id, agent\.name, agent\.isGod === true\)\.sort\(/, 'the card is found by the section\'s own rule');
  assert.match(read(`${PRO}/railPieces.tsx`), /<span data-agent-strip=\{kind\} title=\{title \?\? text\} onClick=\{onClick\}/);
});

test('strings in every language, no plural keys, no dashes in the new code or copy', () => {
  for (const lng of ['en', 'zh-CN', 'ar']) {
    const askMe = JSON.parse(read(`src/renderer/src/i18n/locales/${lng}.json`)).pro.askMe;
    for (const k of ['sectionLabel', 'answerThis', 'loading']) assert.ok(askMe[k] && askMe[k].trim(), `${lng} ${k}`);
    assert.match(askMe.sectionLabel, /\{\{name\}\}/);
    assert.doesNotMatch(Object.values(askMe).join(' '), /[–—]/, lng);
  }
  for (const f of ['AskMeModal.tsx', 'AskMeCard.tsx', 'askMeModalStore.ts']) assert.doesNotMatch(read(`${PRO}/${f}`), /[–—]| - /, f);
});

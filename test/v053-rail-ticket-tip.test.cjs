'use strict';

/* 0.5.3 rc.4, founder 25 Sep 2026: "When we hover on the ticket on the
 * sidebar it should show the ticket details in the tooltip." Facts in
 * shared/ticketTip.ts; the tip in pro/ProSidebar.tsx (showTicketTip), the
 * same rail tip the live action line opens. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const T = loadTs('src/shared/ticketTip.ts');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');

const card = (over) => ({ id: 'T-120', title: 'Team knowledge receipt', status: 'doing', priority: 3, assignee: 'v2-andy', createdAt: '2026-09-23T08:00:00.000Z', dependsOn: [], ...over });

test('the head: key, status, priority (the ledger\'s level, or a label a person wrote)', () => {
  const f = T.ticketTipFacts(card());
  assert.equal(f.key, 'T-120');
  assert.equal(f.status, 'doing');
  assert.deepEqual(f.priority, { kind: 'level', level: 3 });
  assert.deepEqual(T.ticketTipFacts(card({ priority: 9 })).priority, { kind: 'level', level: 5 });
  assert.deepEqual(T.ticketTipFacts(card({ priority: 'P0' })).priority, { kind: 'label', label: 'P0' });
  assert.equal(T.ticketTipFacts(card({ priority: undefined })).priority, null);
});

test('the description: first six lines, then an ellipsis; a long single line is cut too; none is none', () => {
  const seven = ['1', '2', '3', '4', '5', '6', '7'].join('\n');
  assert.equal(T.clipDescription(seven), '1\n2\n3\n4\n5\n6…');
  assert.equal(T.clipDescription('\n\nshort\n\n'), 'short');
  const long = 'x'.repeat(900);
  const cut = T.clipDescription(long);
  assert.equal(cut.length, T.TICKET_TIP_CHARS + 1);
  assert.ok(cut.endsWith('…'));
  assert.equal(T.clipDescription(''), null);
  assert.equal(T.clipDescription(undefined), null);
});

test('assignee, age, and how many cards it waits on', () => {
  const f = T.ticketTipFacts(card({ dependsOn: ['T-118', 'T-119'] }));
  assert.equal(f.assignee, 'v2-andy');
  assert.equal(f.createdAt, Date.parse('2026-09-23T08:00:00.000Z'));
  assert.equal(f.dependsOn, 2);
  const bare = T.ticketTipFacts({ id: 'T-1', title: 't', status: 'todo' });
  assert.equal(bare.assignee, null);
  assert.equal(bare.createdAt, null);
  assert.equal(bare.dependsOn, 0);
  assert.equal(T.ticketTipFacts(card({ createdAt: 'not a date' })).createdAt, null);
});

test('the open question shows only while the card is blocked, and it is the newest unanswered one', () => {
  const qa = [{ q: 'old one', a: 'yes' }, { q: 'Which layout, A or B?' }, { q: 'dismissed', dismissedAt: '2026-09-24' }];
  assert.equal(T.ticketTipFacts(card({ status: 'blocked', humanQA: qa })).question, 'Which layout, A or B?');
  assert.equal(T.ticketTipFacts(card({ status: 'doing', humanQA: qa })).question, null);
  assert.equal(T.ticketTipFacts(card({ status: 'blocked', humanQA: [{ q: 'answered', a: 'ok' }] })).question, null);
});

test('the ticket line opens the rail tip on hover, leaves like the live tip, and the OS title is gone', () => {
  assert.match(sidebar, /<span data-agent-task=\{ticket\.id\} onMouseEnter=\{\(e\) => showTicketTip\(e\.currentTarget\)\} onMouseLeave=\{tip\.leave\}/);
  assert.doesNotMatch(sidebar, /title=\{`\$\{ticket\.id\} \$\{ticket\.title\}`\}/);
  const fn = sidebar.slice(sidebar.indexOf('const showTicketTip'), sidebar.indexOf('const clipBtn'));
  assert.match(fn, /const f = ticketTipFacts\(ticket\);/);
  assert.match(fn, /tip\.open\(el,/, 'the same rail tip as the live line');
  assert.match(fn, /<TipHead>\{\[f\.key, t\(`pro\.tasks\.status\.\$\{f\.status\}`/);
  assert.match(fn, /<TipLine text=\{f\.title\} full \/>/, 'the title in full');
  for (const k of ['ticketAssignee', 'ticketCreated', 'ticketDepends', 'ticketAsks']) assert.ok(fn.includes(`pro.rail.${k}`), k);
  assert.doesNotMatch(fn, /TipFoot/, 'a click opens the agent, so no Click to open');
  // The assignee reads as a name, and the row does not subscribe to the roster for it.
  assert.match(fn, /useStore\.getState\(\)\.agents\.find\(\(a\) => a\.id === f\.assignee \|\| a\.name === f\.assignee\)/);
});

test('the tip has words in every language', () => {
  for (const lang of ['en', 'ar', 'zh-CN']) {
    const r = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`)).pro.rail;
    for (const k of ['ticketAssignee', 'ticketCreated', 'ticketDepends', 'ticketAsks']) assert.ok(r[k], `${lang} ${k}`);
  }
});

'use strict';

/**
 * 0.5.3, founder on rc.4: "There should be a Tasks section inside agent view
 * along with Inbox and Terminal which will show the tasks done by the agent
 * and what and when with search and filter."
 *
 * Tests 1 to 5 RUN the rules (pro/agentTaskRules.ts); test 6 pins the tab, its
 * order and count, and test 7 the words in every language.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const A = loadTs('src/renderer/src/components/pro/agentTaskRules.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const NOW = Date.UTC(2026, 8, 25, 12, 0);
const ago = (h) => new Date(NOW - h * 3_600_000).toISOString();
const PAM = { id: 'pam-mt1', name: 'Pam' };
const LEDGER = [
  { id: 'T-1', title: 'Receipt layout', status: 'done', assignee: 'pam-mt1', createdAt: ago(80), doneAt: ago(2), result: 'Shipped layout A' },
  { id: 'T-2', title: 'Tax line', status: 'doing', assignee: 'Pam', createdAt: ago(30), startedAt: ago(5) },
  { id: 'T-3', title: 'Webhook retries', status: 'blocked', assignee: 'pam-mt1', createdAt: ago(100), humanQA: [{ q: 'Back off 24h?', askedAt: ago(72) }] },
  { id: 'T-4', title: 'Seats copy', status: 'todo', assignee: 'PAM', createdAt: ago(1000) },
  { id: 'T-5', title: 'Not hers', status: 'done', assignee: 'kevin-mt2', createdAt: ago(3), doneAt: ago(1) },
  { id: 'T-6', title: 'Nobody', status: 'todo', createdAt: ago(1) }
];
const all = { status: 'all', window: 'all', query: '', now: NOW };
const ids = (xs) => xs.map((x) => x.id);

test('1. the list shows only this agent\'s cards, by id or by name in any case', () => {
  assert.deepEqual(ids(A.agentTasks(LEDGER, PAM)).sort(), ['T-1', 'T-2', 'T-3', 'T-4']);
  assert.deepEqual(A.agentTasks(null, PAM), []);
  assert.deepEqual(ids(A.agentTasks(LEDGER, { id: 'kevin-mt2', name: 'Kevin' })), ['T-5']);
});

test('2. newest activity first', () => {
  assert.deepEqual(ids(A.filterAgentTasks(A.agentTasks(LEDGER, PAM), all)), ['T-1', 'T-2', 'T-3', 'T-4']);
});

test('3. search narrows it: title, key, description and result', () => {
  const mine = A.agentTasks(LEDGER, PAM);
  assert.deepEqual(ids(A.filterAgentTasks(mine, { ...all, query: 'tax' })), ['T-2']);
  assert.deepEqual(ids(A.filterAgentTasks(mine, { ...all, query: 't-3' })), ['T-3']);
  assert.deepEqual(ids(A.filterAgentTasks(mine, { ...all, query: 'layout a' })), ['T-1'], 'the result counts');
  assert.deepEqual(ids(A.filterAgentTasks(mine, { ...all, query: 'nothing like this' })), []);
});

test('4. a done card shows when it was done; each status has its own when', () => {
  const [done, doing, blocked, todo] = ['T-1', 'T-2', 'T-3', 'T-4'].map((id) => LEDGER.find((x) => x.id === id));
  assert.deepEqual(A.whenLine(done), { kind: 'done', at: Date.parse(ago(2)) });
  assert.equal(A.agoText(A.whenLine(done).at, NOW, 'en'), '2 hours ago');
  assert.deepEqual(A.whenLine(doing), { kind: 'started', at: Date.parse(ago(5)) });
  assert.deepEqual(A.whenLine(blocked), { kind: 'asked', at: Date.parse(ago(72)) });
  assert.equal(A.agoText(A.whenLine(blocked).at, NOW, 'en'), '3 days ago');
  assert.deepEqual(A.whenLine(todo), { kind: 'added', at: Date.parse(ago(1000)) });
  // Fallbacks until every card carries its stamps.
  assert.deepEqual(A.whenLine({ id: 'x', title: '', status: 'done', createdAt: ago(9) }), { kind: 'done', at: Date.parse(ago(9)) });
  assert.deepEqual(A.whenLine({ id: 'x', title: '', status: 'doing', updatedAt: ago(4), createdAt: ago(9) }), { kind: 'started', at: Date.parse(ago(4)) });
  assert.deepEqual(A.whenLine({ id: 'x', title: '', status: 'blocked', updatedAt: ago(6) }), { kind: 'blocked', at: Date.parse(ago(6)) });
  assert.equal(A.whenLine({ id: 'x', title: '', status: 'todo' }), null);
  { const s = A.stampText(Date.UTC(2026, 8, 25, 14, 2), 'en'); assert.match(s, /Sep/); assert.match(s, /25/); }
});

test('5. the status chips and the time window filter', () => {
  const mine = A.agentTasks(LEDGER, PAM);
  assert.deepEqual(ids(A.filterAgentTasks(mine, { ...all, status: 'done' })), ['T-1']);
  assert.deepEqual(ids(A.filterAgentTasks(mine, { ...all, status: 'blocked' })), ['T-3']);
  assert.deepEqual(ids(A.filterAgentTasks(mine, { ...all, window: 'week' })), ['T-1', 'T-2', 'T-3'], 'the todo added 41 days ago is out');
  assert.deepEqual(ids(A.filterAgentTasks(mine, { ...all, window: 'month' })), ['T-1', 'T-2', 'T-3']);
  assert.equal(A.inWindow(null, 'week', NOW), false);
  assert.equal(A.inWindow(null, 'all', NOW), true);
  assert.equal(A.inWindow(NOW - 60_000, 'today', NOW), true);
  assert.equal(A.inWindow(NOW - 3 * 86_400_000, 'today', NOW), false);
  assert.deepEqual(A.STATUS_FILTERS, ['all', 'doing', 'done', 'blocked', 'todo']);
  assert.deepEqual(A.TIME_WINDOWS, ['today', 'week', 'month', 'all']);
});

test('6. the tab: Inbox, Tasks, Terminal; the terminal stays the default; a count; a row opens the task sheet', () => {
  const s = read('src/renderer/src/components/pro/AgentScreen.tsx');
  assert.match(s, /type Tab = 'inbox' \| 'tasks' \| 'terminal';/);
  assert.match(s, /useState<Tab>\('terminal'\)/);
  assert.match(s, /\{ value: 'inbox', label: t\('pro\.room\.tabs\.inbox'\) \}, \{ value: 'tasks', label: t\('pro\.room\.tabs\.tasks'\), count: myTasks\?\.length \?\? 0 \}, \{ value: 'terminal'/);
  assert.match(s, /agentTasks\(ledger, agent\)/);
  assert.match(s, /<Pane show=\{tab === 'tasks'\}><AgentTasks agent=\{agent\} tasks=\{myTasks\} \/><\/Pane>/);
  const v = read('src/renderer/src/components/pro/AgentTasks.tsx');
  assert.match(v, /onClick=\{\(\) => openTaskDetail\(x\.id\)\}/);
  assert.match(v, /<SearchBox /);
  assert.match(v, /<FilterChip /);
  assert.match(v, /<Seg /);
  assert.match(v, /t\('pro\.agentTasks\.empty', \{ name: agent\.name \}\)/);
  // startedAt survives the parser, or "Started" could never be read.
  assert.match(read('src/renderer/src/components/TasksKanban.tsx'), /if \(typeof t\.startedAt === 'string'\) out\.startedAt = t\.startedAt;/);
});

test('7. every new word exists in en, zh-CN and ar, keeps its variables, and has no dashes', () => {
  for (const lng of ['en', 'zh-CN', 'ar']) {
    const pro = JSON.parse(read(`src/renderer/src/i18n/locales/${lng}.json`)).pro;
    assert.ok(pro.room.tabs.tasks, `${lng} tab`);
    assert.deepEqual(Object.keys(pro.room.tabs), ['inbox', 'tasks', 'terminal']);
    const a = pro.agentTasks;
    const flat = { search: a.search, statusLabel: a.statusLabel, windowLabel: a.windowLabel, empty: a.empty, ...a.window, ...Object.fromEntries(Object.entries(a.when).map(([k, v]) => [`when.${k}`, v])) };
    for (const [k, v] of Object.entries(flat)) {
      assert.ok(typeof v === 'string' && v.trim(), `${lng} ${k}`);
      assert.doesNotMatch(v, /[–—-]/, `${lng} ${k} has no dashes`);
      if (k.startsWith('when.')) assert.ok(v.includes('{{when}}'), `${lng} ${k} keeps {{when}}`);
    }
    assert.ok(a.empty.includes('{{name}}'), `${lng} empty keeps {{name}}`);
    assert.deepEqual(Object.keys(a.window), ['today', 'week', 'month', 'all']);
  }
});

'use strict';

/**
 * Task times and the Tasks screen's date control (0.5.3, founder on rc.4:
 * "a date wise filter with today, this week, this month and all time").
 * Main stamps startedAt, doneAt, reopenedAt and updatedAt on the same write
 * as the ticket keys; the screen filters on doneAt or the latest activity.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const T = loadTs('src/shared/taskTimes.ts');
const { HiveManager } = loadTs('src/main/hive.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('stamps: startedAt once, doneAt once, reopenedAt on a move out of done, updatedAt only on a real change', () => {
  const t0 = '2026-09-20T10:00:00.000Z';
  let r = T.stampTaskTimes([], [{ id: 'A-1', status: 'todo', title: 'x' }], t0);
  assert.equal(r.tasks[0].createdAt, t0, 'a new card without createdAt gets one');
  assert.equal(r.tasks[0].updatedAt, t0);
  assert.equal(r.tasks[0].startedAt, undefined);
  let prev = r.tasks;
  r = T.stampTaskTimes(prev, [{ ...prev[0], status: 'doing' }], '2026-09-21T00:00:00.000Z');
  assert.equal(r.tasks[0].startedAt, '2026-09-21T00:00:00.000Z');
  prev = r.tasks;
  r = T.stampTaskTimes(prev, [{ ...prev[0], status: 'done' }], '2026-09-22T00:00:00.000Z');
  assert.equal(r.tasks[0].doneAt, '2026-09-22T00:00:00.000Z');
  prev = r.tasks;
  r = T.stampTaskTimes(prev, [{ ...prev[0], status: 'doing' }], '2026-09-23T00:00:00.000Z');
  assert.equal(r.tasks[0].reopenedAt, '2026-09-23T00:00:00.000Z');
  assert.equal(r.tasks[0].doneAt, '2026-09-22T00:00:00.000Z', 'kept on reopen');
  assert.equal(r.tasks[0].startedAt, '2026-09-21T00:00:00.000Z', 'never overwritten');
  prev = r.tasks;
  r = T.stampTaskTimes(prev, [{ ...prev[0], status: 'done' }], '2026-09-24T00:00:00.000Z');
  assert.equal(r.tasks[0].doneAt, '2026-09-22T00:00:00.000Z', 'doneAt is the first done, never overwritten');
  // An unchanged card is the same object and no stamp moves.
  const same = T.stampTaskTimes(r.tasks, r.tasks.map((c) => ({ ...c })), '2026-09-30T00:00:00.000Z');
  assert.equal(same.changed, false);
  assert.equal(same.tasks[0].updatedAt, '2026-09-24T00:00:00.000Z');
  // A writer that dropped a stamp gets it back.
  const { startedAt: _s, doneAt: _d, ...stripped } = r.tasks[0];
  assert.equal(T.stampTaskTimes(r.tasks, [stripped], '2026-09-30T00:00:00.000Z').tasks[0].startedAt, '2026-09-21T00:00:00.000Z');
});

test('fallbacks: completedAt and created_at are read, never replaced by now; a card matches its old id by alias', () => {
  const r = T.stampTaskTimes([], [{ id: 'A-1', status: 'done', completedAt: '2026-01-02T00:00:00Z', created_at: '2026-01-01T00:00:00Z' }], '2026-09-25T00:00:00Z');
  assert.equal(r.tasks[0].doneAt, '2026-01-02T00:00:00Z');
  assert.equal(r.tasks[0].createdAt, '2026-01-01T00:00:00Z');
  const byAlias = T.stampTaskTimes([{ id: 'old', status: 'todo', startedAt: 'S' }], [{ id: 'A-2', alias: 'old', status: 'todo' }], 'N');
  assert.equal(byAlias.tasks[0].startedAt, 'S');
  assert.equal(T.taskActivityAt({ status: 'done', completedAt: 'C', updatedAt: 'U' }), 'C');
  assert.equal(T.taskActivityAt({ status: 'todo', doneAt: 'D', createdAt: 'A' }), 'A', 'doneAt counts only in the done column');
  assert.equal(T.taskActivityAt({ status: 'todo', created_at: 'A' }), 'A');
});

test('window maths: today opens at local midnight, the week on Monday, the month on the 1st', () => {
  const thu = new Date(2026, 8, 24, 15, 30); // Thursday 24 Sep 2026, local
  assert.equal(T.windowStart('today', thu).getTime(), new Date(2026, 8, 24).getTime());
  assert.equal(T.windowStart('week', thu).getTime(), new Date(2026, 8, 21).getTime(), 'Monday 21st');
  assert.equal(T.windowStart('week', new Date(2026, 8, 27, 23)).getTime(), new Date(2026, 8, 21).getTime(), 'Sunday is still the same week');
  assert.equal(T.windowStart('week', new Date(2026, 8, 21, 0, 0, 1)).getTime(), new Date(2026, 8, 21).getTime(), 'Monday opens its own week');
  assert.equal(T.windowStart('month', thu).getTime(), new Date(2026, 8, 1).getTime());
  assert.equal(T.windowStart('all', thu), null);
  const at = (d) => ({ status: 'todo', createdAt: d.toISOString() });
  assert.equal(T.inDateWindow(at(new Date(2026, 8, 24, 0, 0, 0)), 'today', thu), true, 'midnight is in');
  assert.equal(T.inDateWindow(at(new Date(2026, 8, 23, 23, 59, 59)), 'today', thu), false, 'a second before is out');
  assert.equal(T.inDateWindow(at(new Date(2026, 8, 20, 12)), 'week', thu), false, 'last Sunday');
  assert.equal(T.inDateWindow(at(new Date(2026, 7, 31, 12)), 'month', thu), false);
  assert.equal(T.inDateWindow({ status: 'todo' }, 'month', thu), false, 'no time at all: out of a window');
  assert.equal(T.inDateWindow({ status: 'todo' }, 'all', thu), true, 'but always in All time');
});

test('main stamps on the UI write path and on an agent editing tasks.json by hand, never on the first look', (t) => {
  const home = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'md-times-')), 'v053');
  fs.mkdirSync(home, { recursive: true });
  t.after(() => fs.rmSync(path.dirname(home), { recursive: true, force: true }));
  const hive = new HiveManager(() => home);
  hive.ensureHive();
  const file = path.join(home, 'hive', 'tasks.json');
  hive.addTask({ id: 'ui-1', title: 'a', status: 'todo', createdAt: '2026-01-01T00:00:00Z' });
  hive.patchTask('ui-1', { status: 'doing' });
  let disk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(disk.tasks[0].startedAt, 'startedAt from the UI patch');
  assert.equal(disk.tasks[0].createdAt, '2026-01-01T00:00:00Z');
  // An agent moves it to done by hand.
  disk.tasks[0].status = 'done';
  fs.writeFileSync(file, JSON.stringify(disk));
  hive.keyAgentTasks();
  disk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(disk.tasks[0].doneAt, 'doneAt from the router tick');
  // A fresh manager (an app start) only remembers the board on its first look.
  const fresh = new HiveManager(() => home);
  disk.tasks.push({ id: 'V53-9', title: 'hand', status: 'done' });
  fs.writeFileSync(file, JSON.stringify(disk));
  fresh.keyAgentTasks();
  const after = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(after.tasks[1].doneAt, undefined, 'no now-stamp on the first look after a start');
});

test('the screen: a Seg after a divider, remembered per session, board and list filtered, the empty column says so', () => {
  const screen = read('src/renderer/src/components/pro/TasksScreen.tsx');
  assert.match(screen, /sessionStorage\.getItem\(WINDOW_KEY\)/);
  assert.match(screen, /filterTasks\(source, filter, query, waitsOnHuman, dateWindow\)/);
  assert.match(screen, /data-date-window[^]*?<Seg[^]*?DATE_WINDOWS\.map/);
  assert.match(screen, /t\(windowed \? 'pro\.tasks\.nothingInWindow' : 'pro\.tasks\.nothingHere'\)/);
  assert.ok(screen.indexOf("setFilter('archived')") < screen.indexOf('data-date-window'), 'chip order stays; the date control comes after');
  const hive = read('src/main/hive.ts');
  assert.match(hive, /stampTaskTimes\(prev, keyed\.tasks/);
  for (const l of ['en', 'ar', 'zh-CN']) {
    const tasks = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.tasks;
    for (const k of ['label', 'today', 'week', 'month', 'all']) assert.ok(tasks.window[k], `${l} window.${k}`);
    assert.ok(tasks.nothingInWindow, l);
  }
});

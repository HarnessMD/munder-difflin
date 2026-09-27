'use strict';

/**
 * Ticket keys (0.5.3, founder on rc.4): "The ticket ID that gets created by
 * the agents should be three capital letter text-number ex: V53-299, MTK-122."
 * Assigned by the harness on every write path, so no prompt has to get it right.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const K = loadTs('src/shared/ticketKeys.ts');
const { HiveManager } = loadTs('src/main/hive.ts');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('the prefix comes from the folder name: three capitals or digits, a letter first', () => {
  assert.equal(K.derivePrefix('MunderDifflin'), 'MDF');
  assert.equal(K.derivePrefix('v053'), 'V53');
  assert.equal(K.derivePrefix('hive-2026'), 'H26');
  assert.equal(K.derivePrefix('acme'), 'ACM');
  assert.equal(K.derivePrefix('MTK'), 'MTK');
  assert.equal(K.derivePrefix('9'), 'TSK', 'no letter at all');
  for (const n of ['MunderDifflin', 'v053', 'x', 'Munder Difflin', 'my_team', 'MDv0.3.0']) assert.match(K.derivePrefix(n), /^[A-Z][A-Z0-9]{2}$/, n);
});

test('a card without a key gets PREFIX-N, keeps its old id as alias, and a key is kept as it is', () => {
  const meta = { prefix: 'V53', next: 299 };
  const r = K.assignTicketKeys([
    { id: 'v053-fix-thing', title: 'a' },
    { title: 'no id' },
    { id: 'MTK-122', title: 'already a key' },
    { id: '', title: 'empty' }
  ], meta);
  assert.deepEqual(r.tasks.map((t) => t.id), ['V53-299', 'V53-300', 'MTK-122', 'V53-301']);
  assert.equal(r.tasks[0].alias, 'v053-fix-thing');
  assert.equal(r.tasks[1].alias, undefined, 'nothing to remember');
  assert.equal(r.tasks[2].alias, undefined);
  assert.equal(r.meta.next, 302);
  assert.equal(r.changed, true);
  assert.equal(K.assignTicketKeys(r.tasks, r.meta).changed, false, 'a keyed board is left alone');
});

test('the counter never repeats: not after a lost counter, not against the archive, not when an agent writes its old copy back', () => {
  // The counter was lost (an agent rewrote tasks.json without `ticket`), but the board and the archive remember.
  const lost = K.assignTicketKeys([{ id: 'V53-310', title: 'x' }, { id: 'new-one' }], { prefix: 'V53', next: 1 }, [{ id: 'V53-400' }]);
  assert.equal(lost.tasks[1].id, 'V53-401');
  // An agent that held the old copy writes the old id back: it gets the SAME key, not a new one.
  const again = K.assignTicketKeys([{ id: 'new-one', title: 'the old copy' }], lost.meta);
  assert.equal(again.tasks[0].id, 'V53-401');
  assert.equal(again.meta.next, lost.meta.next, 'no number spent');
});

test('dependsOn, blockedBy and humanQA naming the old id still resolve, by key or alias', () => {
  const cards = [{ id: 'V53-7', alias: 'build-login' }, { id: 'V53-8', dependsOn: ['build-login'] }];
  assert.equal(K.resolveTask(cards, 'build-login').id, 'V53-7');
  assert.equal(K.resolveTask(cards, 'V53-7').id, 'V53-7');
  assert.equal(K.resolveTask(cards, 'nope'), undefined);
  assert.equal(K.canonicalTaskId(cards, 'build-login'), 'V53-7');
  const data = read('src/renderer/src/components/pro/taskData.ts');
  assert.match(data, /task\.dependsOn\.map\(\(id\) => resolveTask\(all, id\)\)/);
  assert.match(data, /t\.dependsOn\.includes\(task\.alias\)/);
});

function hiveAt(t, name = 'v053') {
  const home = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'md-keys-')), name);
  fs.mkdirSync(home, { recursive: true });
  t.after(() => fs.rmSync(path.dirname(home), { recursive: true, force: true }));
  const hive = new HiveManager(() => home);
  hive.ensureHive();
  return { home, hive, file: path.join(home, 'hive', 'tasks.json') };
}

test('main keys every write path: UI and Slack writes, and an agent editing tasks.json by hand', (t) => {
  const { hive, file } = hiveAt(t);
  // The UI / Slack / webhook path.
  assert.equal(hive.addTask({ id: 'slack-abc', title: 'from Slack', status: 'todo', dependsOn: [], priority: 3, createdAt: '2026-09-25T00:00:00Z' }), true);
  let disk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(disk.tasks[0].id, 'V53-1');
  assert.equal(disk.tasks[0].alias, 'slack-abc');
  assert.deepEqual({ prefix: disk.ticket.prefix, next: disk.ticket.next }, { prefix: 'V53', next: 2 }, 'the counter is in the same file');
  // Slack patches the card by the id it made it with.
  assert.equal(hive.patchTask('slack-abc', { status: 'done' }), true);
  disk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(disk.tasks[0].status, 'done');
  assert.equal(disk.tasks[0].id, 'V53-1', 'the key survives a patch by alias');
  assert.equal(hive.addTask({ id: 'slack-abc', title: 'again' }), false, 'idempotent by alias too');
  // An agent writes the file by hand, without ids and without the ticket meta.
  fs.writeFileSync(file, JSON.stringify({ tasks: [...disk.tasks, { title: 'agent card', dependsOn: ['slack-abc'] }] }));
  assert.equal(hive.keyAgentTasks(), 1);
  disk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(disk.tasks[1].id, 'V53-2');
  assert.equal(disk.ticket.next, 3, 'the counter came back from the keys on the board');
  assert.equal(hive.keyAgentTasks(), 0, 'nothing new, nothing written');
  assert.equal(hive.deleteTask('slack-abc'), true, 'delete by alias');
});

test('a chosen prefix wins for new cards; existing keys stay', (t) => {
  const { hive, file } = hiveAt(t, 'MunderDifflin');
  hive.addTask({ id: 'one', title: 'a' });
  hive.setTicketPrefix('MTK');
  hive.addTask({ id: 'two', title: 'b' });
  hive.setTicketPrefix('bad');
  const disk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(disk.tasks.map((x) => x.id), ['MDF-1', 'MTK-2'], 'one counter per hive: a new prefix goes on counting');
});

test('PROTOCOL.md and the god brief tell agents to leave id out; Settings, the sheet and Slack show the key', () => {
  const hive = read('src/main/hive.ts');
  assert.match(hive, /Leave \\`id\\` out; the harness assigns the ticket key \(e\.g\. V53-299\)\. Refer to cards by that key\./);
  assert.match(hive, /Leave "id" out of a new card; the harness assigns the ticket key \(e\.g\. V53-299\)\. Refer to cards by that key\./);
  assert.match(hive, /try \{ this\.keyAgentTasks\(\); \}/, 'the router tick keys hand written cards');
  const settings = read('src/renderer/src/components/SettingsModal.tsx');
  assert.match(settings, /data-ticket-prefix/);
  assert.match(settings, /stage\(\{ ticketPrefix: ticketPrefix \|\| undefined \}\)/);
  assert.match(read('src/main/index.ts'), /:white_check_mark: \*\$\{\/\^\[A-Z\]\[A-Z0-9\]\{2\}-\\d\+\$\/\.test\(task\.id\) \? `\$\{task\.id\} ` : ''\}\$\{task\.title\}\*/);
  for (const l of ['en', 'ar', 'zh-CN']) {
    const a = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).settings.autonomy;
    assert.ok(a.ticketPrefix && a.ticketPrefixHint.includes('{{example}}'), l);
  }
});

test('Dismiss all (patchTasks) finds a card by its old id and reports the id it was given', (t) => {
  const { hive, file } = hiveAt(t);
  hive.addTask({ id: 'ask-1', title: 'q1', status: 'todo' });
  hive.addTask({ id: 'ask-2', title: 'q2', status: 'todo' });
  assert.deepEqual(hive.patchTasks([{ id: 'ask-1', patch: { status: 'done' } }, { id: 'V53-2', patch: { status: 'done' } }, { id: 'gone', patch: {} }]), ['ask-1', 'V53-2']);
  const disk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(disk.tasks.map((x) => [x.id, x.status]), [['V53-1', 'done'], ['V53-2', 'done']]);
});

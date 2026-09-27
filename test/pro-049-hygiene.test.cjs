// PRO phase 7 of 0.4.9 (plan Part 6 W-A): tasks, Ask me and the board stop
// growing forever. The pure rules are pinned at every threshold's boundary,
// the board ask fires once per crossing, the archive copy precedes the ask in
// main, the ledgers and the IPC exist, the Settings rows exist for each field,
// the Archived chip and the Stale chip are drawn, and every string is in all
// three locales.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PRO = 'src/renderer/src/components/pro';
const H = loadTs('src/shared/taskHygiene.ts');

const DAY = 86_400_000;
const NOW = Date.parse('2026-09-03T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString();
const cfg = H.resolveTaskHygiene();

// 0.4.11, founder 6 Sep 2026: the board cap was 6000 tokens, "too low, make it 50000".
test('the defaults are the founder\'s: 2, 14, 21, 7 days and 50000 tokens, and a bad value reads as the default', () => {
  assert.deepEqual(H.TASK_HYGIENE_DEFAULTS, { doneArchiveDays: 2, staleFlagDays: 14, staleArchiveDays: 21, askNagDays: 7, boardTokenCap: 50000 });
  assert.deepEqual(H.TASK_HYGIENE_KEYS, ['doneArchiveDays', 'staleFlagDays', 'staleArchiveDays', 'askNagDays', 'boardTokenCap']);
  assert.deepEqual(H.resolveTaskHygiene(undefined), H.TASK_HYGIENE_DEFAULTS);
  assert.deepEqual(H.resolveTaskHygiene({ doneArchiveDays: 5, staleFlagDays: 0, askNagDays: -1, boardTokenCap: NaN }), { ...H.TASK_HYGIENE_DEFAULTS, doneArchiveDays: 5 });
  assert.deepEqual(H.resolveTaskHygiene({ boardTokenCap: '9000' }), H.TASK_HYGIENE_DEFAULTS, 'a string is not a threshold');
});

test('done: archives at exactly doneArchiveDays after doneAt, not a millisecond before; without a stamp the sweep stamps first', () => {
  const at = (ms) => ({ id: 'd', status: 'done', createdAt: iso(NOW - 30 * DAY), doneAt: iso(ms) });
  assert.equal(H.archiveReasonFor(at(NOW - 2 * DAY), cfg, NOW), 'done');
  assert.equal(H.archiveReasonFor(at(NOW - 2 * DAY + 1), cfg, NOW), null);
  // completedAt, which the god writes by hand on some cards, counts the same way.
  assert.equal(H.archiveReasonFor({ id: 'c', status: 'done', completedAt: iso(NOW - 3 * DAY) }, cfg, NOW), 'done');
  // No done stamp at all: the clock has not started, however old the card is.
  const unstamped = { id: 'u', status: 'done', createdAt: iso(NOW - 40 * DAY), updatedAt: iso(NOW - 39 * DAY) };
  assert.equal(H.archiveReasonFor(unstamped, cfg, NOW), null);
  const plan = H.planSweep([unstamped], cfg, NOW);
  assert.deepEqual(plan.stampDone, ['u']);
  assert.deepEqual(plan.archive, []);
});

test('stale: a todo or blocked card flags at exactly staleFlagDays untouched and archives at staleArchiveDays; doing never', () => {
  const todo = (touched) => ({ id: 't', status: 'todo', createdAt: iso(touched) });
  assert.equal(H.isStale(todo(NOW - 14 * DAY), cfg, NOW), true);
  assert.equal(H.isStale(todo(NOW - 14 * DAY + 1), cfg, NOW), false);
  assert.equal(H.staleDays(todo(NOW - 15 * DAY), cfg, NOW), 15);
  assert.equal(H.archiveReasonFor(todo(NOW - 21 * DAY), cfg, NOW), 'stale');
  assert.equal(H.archiveReasonFor(todo(NOW - 21 * DAY + 1), cfg, NOW), null);
  assert.equal(H.archiveReasonFor({ id: 'b', status: 'blocked', createdAt: iso(NOW - 21 * DAY) }, cfg, NOW), 'stale');
  assert.equal(H.archiveReasonFor({ id: 'x', status: 'doing', createdAt: iso(NOW - 90 * DAY) }, cfg, NOW), null);
  assert.equal(H.isStale({ id: 'x', status: 'doing', createdAt: iso(NOW - 90 * DAY) }, cfg, NOW), false);
  // A card with no dates cannot be judged and is left alone.
  assert.equal(H.archiveReasonFor({ id: 'n', status: 'todo' }, cfg, NOW), null);
  assert.equal(H.isStale({ id: 'n', status: 'todo' }, cfg, NOW), false);
});

test('"touched" is the newest stamp the card carries: updated, snake_case, completed, and every ask, answer and dismissal', () => {
  const old = iso(NOW - 40 * DAY);
  assert.equal(H.lastTouchedAt({ createdAt: old, updatedAt: iso(NOW - 3 * DAY) }), NOW - 3 * DAY);
  assert.equal(H.lastTouchedAt({ created_at: old, updated_at: iso(NOW - 4 * DAY) }), NOW - 4 * DAY);
  assert.equal(H.lastTouchedAt({ createdAt: old, humanQA: [{ q: 'q', askedAt: iso(NOW - 20 * DAY), a: 'a', answeredAt: iso(NOW - 5 * DAY) }] }), NOW - 5 * DAY);
  assert.equal(H.lastTouchedAt({ createdAt: old, humanQA: [{ q: 'q', askedAt: iso(NOW - 20 * DAY), dismissedAt: iso(NOW - 6 * DAY) }] }), NOW - 6 * DAY);
  assert.equal(H.lastTouchedAt({}), null);
  // An answered question 3 days ago keeps a 40 day old todo off the stale list.
  assert.equal(H.isStale({ id: 'a', status: 'todo', createdAt: old, humanQA: [{ q: 'q', askedAt: old, a: 'yes', answeredAt: iso(NOW - 3 * DAY) }] }, cfg, NOW), false);
});

test('an open question nags at exactly askNagDays and is never stale or archived, however old', () => {
  const asked = (ms) => ({ id: 'q', status: 'blocked', createdAt: iso(NOW - 60 * DAY), humanQA: [{ q: 'Which?', askedAt: iso(ms) }] });
  assert.equal(H.askNagDays(asked(NOW - 7 * DAY), cfg, NOW), 7);
  assert.equal(H.askNagDays(asked(NOW - 7 * DAY + 1), cfg, NOW), null);
  assert.equal(H.askNagDays(asked(NOW - 30 * DAY), cfg, NOW), 30);
  assert.equal(H.archiveReasonFor(asked(NOW - 30 * DAY), cfg, NOW), null, 'nags instead of archiving');
  assert.equal(H.isStale(asked(NOW - 30 * DAY), cfg, NOW), false, 'waiting on the human is not untouched');
  // Answered or dismissed: no longer open, nothing to nag about.
  assert.equal(H.askNagDays({ id: 'q', status: 'blocked', humanQA: [{ q: 'Which?', askedAt: iso(NOW - 30 * DAY), a: 'B', answeredAt: iso(NOW - 29 * DAY) }] }, cfg, NOW), null);
  assert.equal(H.askNagDays({ id: 'q', status: 'blocked', humanQA: [{ q: 'Which?', askedAt: iso(NOW - 30 * DAY), dismissedAt: iso(NOW - 29 * DAY) }] }, cfg, NOW), null);
  // An undated ask has nothing honest to say.
  assert.equal(H.askNagDays({ id: 'q', status: 'blocked', humanQA: [{ q: 'Which?' }] }, cfg, NOW), null);
  const plan = H.planSweep([asked(NOW - 8 * DAY)], cfg, NOW);
  assert.deepEqual(plan.nags, [{ id: 'q', days: 8 }]);
  assert.deepEqual(plan.archive, []);
});

test('the sweep plan moves cards with a note saying why, and applying it keeps every unmodelled field and is idempotent', () => {
  const live = [
    { id: 'done-old', status: 'done', doneAt: iso(NOW - 3 * DAY), repo: 'x', scope: 'y' },
    { id: 'done-new', status: 'done', doneAt: iso(NOW - 1 * DAY) },
    { id: 'done-unstamped', status: 'done', createdAt: iso(NOW - 10 * DAY) },
    { id: 'stale-old', status: 'todo', createdAt: iso(NOW - 25 * DAY), notes: ['keep me'] },
    { id: 'stale-flag', status: 'blocked', createdAt: iso(NOW - 15 * DAY) },
    { id: 'doing', status: 'doing', createdAt: iso(NOW - 99 * DAY) },
    { title: 'no id, left alone', status: 'done', doneAt: iso(NOW - 9 * DAY) }
  ];
  const plan = H.planSweep(live, cfg, NOW);
  assert.deepEqual(plan.archive.map((a) => [a.id, a.reason]), [['done-old', 'done'], ['stale-old', 'stale']]);
  assert.match(plan.archive[0].note, /^Done for 3 days/);
  assert.match(plan.archive[1].note, /^Untouched for 25 days/);
  assert.deepEqual(plan.stampDone, ['done-unstamped']);
  assert.deepEqual(plan.stale, ['stale-flag']);
  const nowIso = iso(NOW);
  const once = H.applySweepPlan(live, [{ id: 'earlier', status: 'done', archivedAt: iso(NOW - 9 * DAY), archiveReason: 'done' }], plan, nowIso);
  assert.equal(once.archived, 2);
  assert.equal(once.stamped, 1);
  assert.deepEqual(once.live.map((c) => c.id), ['done-new', 'done-unstamped', 'stale-flag', 'doing', undefined]);
  assert.equal(once.live[1].doneAt, nowIso, 'the clock starts at first sighting');
  assert.deepEqual(once.archive.map((c) => c.id), ['done-old', 'stale-old', 'earlier'], 'newest first, the earlier archive kept');
  assert.deepEqual(once.archive[0], { id: 'done-old', status: 'done', doneAt: iso(NOW - 3 * DAY), repo: 'x', scope: 'y', archivedAt: nowIso, archiveReason: 'done', archiveNote: plan.archive[0].note });
  assert.deepEqual(once.archive[1].notes, ['keep me'], 'a hand written field survives the move');
  // Same plan again over the result: nothing more moves, nothing doubles.
  const again = H.applySweepPlan(once.live, once.archive, H.planSweep(once.live, cfg, NOW), nowIso);
  assert.equal(again.archived, 0);
  assert.equal(again.stamped, 0);
  assert.deepEqual(again.archive.map((c) => c.id), ['done-old', 'stale-old', 'earlier']);
});

test('the board: tokens are characters over four (and the source says so), and the ask fires once per crossing', () => {
  assert.equal(H.estimateTokens(''), 0);
  assert.equal(H.estimateTokens('abcd'), 1);
  assert.equal(H.estimateTokens('abcde'), 2, 'rounded up');
  assert.match(read('src/shared/taskHygiene.ts'), /characters divided by four/i);
  // Sized from the default cap itself, so the boundary pin follows the founder's number.
  const under = 'x'.repeat(cfg.boardTokenCap * 4);
  const over = 'x'.repeat(cfg.boardTokenCap * 4 + 1);
  let state = { asked: false };
  let d = H.boardDecision(under, cfg, state);
  assert.deepEqual([d.over, d.ask], [false, false]);
  state = d.next;
  d = H.boardDecision(over, cfg, state);
  assert.deepEqual([d.over, d.ask], [true, true], 'the first crossing asks');
  state = d.next;
  d = H.boardDecision(over, cfg, state);
  assert.deepEqual([d.over, d.ask], [true, false], 'still over: no second ask');
  state = d.next;
  d = H.boardDecision(over + over, cfg, state);
  assert.deepEqual([d.over, d.ask], [true, false], 'growing further while over is still the same crossing');
  state = d.next;
  d = H.boardDecision(under, cfg, state);
  assert.deepEqual([d.over, d.ask, d.next.asked], [false, false, false], 'back under clears the latch');
  state = d.next;
  d = H.boardDecision(over, cfg, state);
  assert.deepEqual([d.over, d.ask], [true, true], 'the next crossing asks again');
  const msg = H.boardAskMessage(6200, 6000, '/hive/board-archive.md');
  assert.match(msg.body, /Decisions section verbatim/);
  assert.match(msg.body, /\/hive\/board-archive\.md/);
  assert.match(msg.body, /once per crossing/);
  assert.match(H.boardArchiveEntry('# Board\n\nbody', NOW, 6200), /^\n\n## Archived 2026-09-03T12:00:00\.000Z \(about 6200 tokens\)\n\n# Board\n\nbody\n$/);
});

test('main: the archive copy lands before the ask, through the heartbeat\'s door, once at boot and then hourly, cleared on teardown', () => {
  const sweep = strip(read('src/main/taskHygiene.ts'));
  const append = sweep.indexOf('hive.appendBoardArchive(');
  const send = sweep.indexOf("hive.send({ to: 'god', act: 'request'");
  assert.ok(append > 0 && send > 0 && append < send, 'board-archive.md is written before the god is asked');
  assert.match(sweep, /hive\.setHygieneState\(/, 'the latch is persisted');
  assert.match(sweep, /export const TASK_HYGIENE_INTERVAL_MS = 3_600_000;/);
  assert.match(sweep, /tick\(\);\s*timer = setInterval\(tick, intervalMs\);/, 'boot, then the interval');
  assert.match(sweep, /export function stopTaskHygiene\(\): void \{\s*if \(timer\) \{ clearInterval\(timer\); timer = null; \}/);
  const main = strip(read('src/main/index.ts'));
  assert.match(main, /hive\.startRouter\(\);[\s\S]{0,300}startTaskHygiene\(hive\);/, 'armed at boot, after the router');
  assert.match(main, /console\.error\('\[quit\] stopRouter:', e\); \}\s*try \{ stopTaskHygiene\(\); \}/, 'cleared on quit');
  assert.match(main, /console\.error\('\[reset\] stopRouter:', e\); \}\s*try \{ stopTaskHygiene\(\); \}/, 'cleared on reset');
  const hive = strip(read('src/main/hive.ts'));
  assert.match(hive, /tasksArchive\(\): unknown \{[\s\S]{0,200}'tasks-archive\.json'/, 'the archive ledger sits next to tasks.json');
  assert.match(hive, /appendBoardArchive\(entry: string\): string \{[\s\S]{0,200}'board-archive\.md'/);
  assert.match(hive, /appendFileSync\(p, entry, 'utf8'\)/, 'append only');
  assert.match(hive, /hygieneState\(\)[\s\S]{0,300}'hygiene\.json'/);
});

test('the archive ledger has a read IPC in preload and main, and the config field is declared in all three mirrors', () => {
  assert.match(read('src/preload/index.ts'), /hiveTasksArchive: \(\): Promise<unknown> => ipcRenderer\.invoke\('hive:tasksArchive'\)/);
  assert.match(read('src/main/index.ts'), /ipcMain\.handle\('hive:tasksArchive', \(\) => hive\.tasksArchive\(\)\);/);
  for (const f of ['src/main/config.ts', 'src/renderer/src/store/config.ts', 'src/preload/index.ts']) {
    assert.match(read(f), /taskHygiene\?: Partial<TaskHygieneConfig>;/, `${f} declares taskHygiene`);
  }
});

test('Settings has a row for each field under Autonomy & Budgets, staged on blur and committed by the one Save through updateConfig', () => {
  const src = strip(read('src/renderer/src/components/SettingsModal.tsx'));
  const section = src.slice(src.indexOf("activeSection === 'Autonomy & Budgets'"), src.indexOf("activeSection === 'Memory & Knowledge'"));
  assert.match(section, /t\('settings\.autonomy\.hygiene'\)/);
  assert.match(section, /TASK_HYGIENE_KEYS\.map\(\(k\) => \(/, 'one row per field, from the shared key list');
  assert.match(section, /t\(`settings\.autonomy\.hygieneField\.\$\{k\}`\)/);
  assert.match(section, /onBlur=\{\(\) => stage\(\{ taskHygiene: hygienePatch\(\) \}\)\}/);
  // 0.5.3 settings frame: the staged patch is the base of the one draft commit.
  assert.match(src, /const base: Partial<HarnessConfig> = \{[\s\S]{0,120}\.\.\.pending\s*\};[\s\S]{0,900}await draft\.commit\(base, \(patch\) => window\.cth\.updateConfig\(patch\)\);/, 'the staged patch reaches updateConfig');
  assert.match(src, /if \(hygiene\[k\]\.trim\(\) !== '' && Number\.isFinite\(n\) && n > 0\) out\[k\] = Math\.round\(n\);/, 'only a finite positive number is written');
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
  for (const k of H.TASK_HYGIENE_KEYS) assert.equal(typeof en.settings.autonomy.hygieneField[k], 'string', `en has a label for ${k}`);
});

test('the Tasks screen: an Archived chip swaps the source for the archive ledger, read only, and live cards show Stale and the open-question age', () => {
  const src = strip(read(`${PRO}/TasksScreen.tsx`));
  assert.match(src, /<FilterChip on=\{archivedView\} onClick=\{\(\) => setFilter\('archived'\)\}>\{t\('pro\.tasks\.filter\.archived'\)\}<\/FilterChip>/);
  assert.match(src, /const \{ tasks: archive \} = useTaskArchive\(archivedView\);/);
  assert.match(src, /const source = archivedView \? \(archive \?\? \[\]\) : all;/);
  assert.match(src, /const onOpen = archivedView \? undefined : openTaskDetail;/, 'archived cards open nothing');
  assert.match(src, /if \(!onOpen\) return <div style=\{shell\}>\{body\}<\/div>;/, 'a read only card is not a button');
  // The board moves cards since 3 Sep 2026; the archive is still read only, so
  // it is handed neither the drag nor the keyboard move.
  assert.match(src, /onMove=\{archivedView \? undefined : move\} onNudge=\{archivedView \? undefined : nudge\}/, 'archived cards cannot be moved either');
  assert.match(src, /if \(archivedView \|\| task\.status === to\) return;/, 'and the stage refuses them a second time');
  assert.match(src, /t\('pro\.tasks\.archivedOn', \{ when: fmtWhen\(task\.archivedAt, i18n\.language\) \}\)/, 'the sub line says when');
  assert.match(src, /t\(`pro\.tasks\.archiveReason\.\$\{task\.archiveReason\}`\)/, 'and why');
  assert.match(src, /<Chip tone="info" title=\{t\('pro\.tasks\.staleTitle', \{ count: stale \}\)\}>\{t\('pro\.tasks\.stale'\)\}<\/Chip>/);
  assert.match(src, /t\('pro\.tasks\.askOpenDays', \{ count: nag \}\)/);
  // The Ask me thread and the Ask me modal draw one card since 0.5.3.
  assert.match(strip(read(`${PRO}/AskMeCard.tsx`)), /t\('pro\.tasks\.askOpenDays', \{ count: nag \}\)/, 'the Ask me card says how long');
  assert.match(read(`${PRO}/InboxScreen.tsx`), /<AskMeCard key=\{task\.id\}/, 'and the Ask me thread draws that card');
  assert.match(strip(read(`${PRO}/TaskSheet.tsx`)), /t\('pro\.tasks\.askOpenDays', \{ count: nag \}\)/, 'and so does the sheet');
  const data = strip(read(`${PRO}/taskData.ts`));
  assert.match(data, /export type TaskFilter = 'all' \| 'asks' \| 'unassigned' \| 'archived' \| `agent:\$\{string\}`;/);
  assert.match(data, /api\.hiveTasksArchive\(\)/);
  assert.match(strip(read(`${PRO}/ProShell.tsx`)), /setTaskHygieneConfig\(taskHygiene\)/, 'the shell feeds the thresholds once');
  const kanban = strip(read('src/renderer/src/components/TasksKanban.tsx'));
  assert.match(kanban, /if \(t\.archiveReason === 'done' \|\| t\.archiveReason === 'stale'\) out\.archiveReason = t\.archiveReason;/, 'the parser carries the archive fields');
  assert.match(kanban, /if \(typeof t\.doneAt === 'string'\) out\.doneAt = t\.doneAt;/, 'and the sweep\'s stamp, only when present');
  assert.match(kanban, /\.\.\.stamps\(t\),/, 'no undefined key ever rides a spread over the on-disk card');
});

test('every new string is in all three locales, and the English carries no dashes', () => {
  const keys = [
    'pro.tasks.filter.archived', 'pro.tasks.archivedSub', 'pro.tasks.archiveEmpty', 'pro.tasks.archivedOn',
    'pro.tasks.archiveReason.done', 'pro.tasks.archiveReason.stale', 'pro.tasks.stale', 'pro.tasks.staleTitle',
    'pro.tasks.askOpenDays', 'pro.tasks.col.archived',
    'settings.autonomy.hygiene', 'settings.autonomy.hygieneDesc',
    ...H.TASK_HYGIENE_KEYS.map((k) => `settings.autonomy.hygieneField.${k}`)
  ];
  const get = (o, k) => k.split('.').reduce((cur, p) => (cur && typeof cur === 'object' ? cur[p] : undefined), o);
  for (const l of ['en', 'zh-CN', 'ar']) {
    const data = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    for (const k of keys) assert.equal(typeof get(data, k), 'string', `${k} in ${l}`);
    assert.match(get(data, 'pro.tasks.askOpenDays'), /\{\{count\}\}/, `${l} interpolates the day count`);
    assert.match(get(data, 'settings.autonomy.hygieneDesc'), /\{\{godName\}\}/, `${l} names the orchestrator`);
  }
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
  for (const k of keys) assert.ok(!/—|–| - /.test(get(en, k)), `${k} carries no dash`);
});

// 0.4.9, founder 3 Sep 2026: the task board moves cards.
//
// The rule that must not slip: THE BOARD STAGES, THE ORCHESTRATOR WRITES. He
// owns hive/tasks.json, and a renderer that writes it too is how a ledger gets
// corrupted. So a drag changes what is on screen and nothing else, a bar shows
// every change that is waiting, and Send hands him one message.
//
// What is pinned:
//   1. The move arithmetic, as arithmetic (src/shared/boardMoves.ts).
//   2. The screen: drag, drop, a keyboard equivalent, the save bar, and the
//      one door the batch leaves by.
//   3. Nothing on this screen writes the ledger.
//   4. Every new string in every locale.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const src = strip(read(`${PRO}/TasksScreen.tsx`));

const moves = loadTs(path.join(ROOT, 'src/shared/boardMoves.ts'));
const card = (id, status, title = `card ${id}`) => ({ id, title, status });

/* ---- 1. the arithmetic ---------------------------------------------------- */

test('a move stages, and a move back to where the ledger has it stages nothing', () => {
  const t9 = card('T-009', 'todo');
  const one = moves.stageMove({}, t9, 'doing');
  assert.deepEqual(one, { 'T-009': { id: 'T-009', title: 'card T-009', from: 'todo', to: 'doing' } });
  // Back where it started is not a change. The entry has to GO, or the bar
  // offers to send the orchestrator a move that moves nothing.
  assert.deepEqual(moves.stageMove(one, t9, 'todo'), {});
});

test('dragging one card through three columns is still one move, from where it began', () => {
  const t9 = card('T-009', 'todo');
  let s = moves.stageMove({}, t9, 'doing');
  s = moves.stageMove(s, t9, 'blocked');
  s = moves.stageMove(s, t9, 'done');
  assert.equal(Object.keys(s).length, 1);
  assert.equal(s['T-009'].from, 'todo', 'from is the ledger, never the last staged column');
  assert.equal(s['T-009'].to, 'done');
});

test('staging never mutates what it was given', () => {
  const before = moves.stageMove({}, card('T-001', 'todo'), 'doing');
  const copy = JSON.parse(JSON.stringify(before));
  moves.stageMove(before, card('T-002', 'todo'), 'done');
  assert.deepEqual(before, copy);
});

test('a card is drawn in its staged column, and in the ledger\'s when it has none', () => {
  const t9 = card('T-009', 'todo');
  assert.equal(moves.stagedStatus(t9, {}), 'todo');
  assert.equal(moves.stagedStatus(t9, moves.stageMove({}, t9, 'blocked')), 'blocked');
});

test('the keyboard move stops at both ends instead of wrapping', () => {
  assert.equal(moves.neighbourStatus('todo', -1), null);
  assert.equal(moves.neighbourStatus('done', 1), null);
  assert.equal(moves.neighbourStatus('todo', 1), 'doing');
  assert.equal(moves.neighbourStatus('done', -1), 'blocked');
});

test('the message names every card by id, and says what to do with it', () => {
  const text = moves.movesMessage([
    { id: 'T-009', title: 'Spawn cwd points at the dead repo', from: 'doing', to: 'todo' },
    { id: 'T-011', title: 'Authorize D0', from: 'blocked', to: 'doing' }
  ]);
  assert.match(text, /apply them to the task ledger and confirm/);
  assert.match(text, /^T-009: doing to todo {2}\(Spawn cwd points at the dead repo\)$/m);
  assert.match(text, /^T-011: blocked to doing {2}\(Authorize D0\)$/m);
  assert.ok(!/[—–]/.test(text), 'a dash in the message');
});

/* ---- 2. the screen -------------------------------------------------------- */

test('a card can be dragged, and reached by keyboard, and the column is the drop target', () => {
  assert.match(src, /draggable=\{!!onDragStart\} onDragStart=\{onDragStart\}/);
  assert.match(src, /e\.dataTransfer\.setData\('text\/plain', x\.id\)/, 'the card carries its id');
  // 0.5.3 rc.4: the column's handlers moved to pro/boardDrop.ts (drop anywhere
  // in a column); the same two facts are pinned there.
  const drop = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/components/pro/boardDrop.ts'), 'utf8');
  assert.match(src, /columnDrop<Status, HiveTask>\(s, \{ find: \(id\) => byId\.get\(id\), move: onMove, setOver \}\)/);
  assert.match(drop, /const task = deps\.find\(e\.dataTransfer\?\.getData\('text\/plain'\) \?\? ''\);/, 'and the column reads it back');
  assert.match(drop, /onDragOver\(e: DropEventLike\): void \{\n\s*e\.preventDefault\(\);/, 'without preventDefault no drop ever fires');
  // A board only a mouse can operate is a board half the users cannot operate.
  assert.match(src, /e\.key === 'ArrowLeft' \? -1 : e\.key === 'ArrowRight' \? 1 : null/);
  assert.match(src, /const next = neighbourStatus\(stagedStatus\(task, staged\), dir\);/);
});

test('the save bar appears with the first move, lists every one, and undoes them one at a time', () => {
  assert.match(src, /\{moves\.length > 0 && \(\s*<SaveBar/, 'the bar appears the moment something moves');
  assert.match(src, /moves\.length === 1 \? t\('pro\.tasks\.staged\.one'\) : t\('pro\.tasks\.staged\.many', \{ count: moves\.length \}\)/);
  assert.match(src, /onUndo=\{\(id\) => setStaged\(\(s\) => \{ const n = \{ \.\.\.s \}; delete n\[id\]; return n; \}\)\}/, 'each change is undoable on its own');
  assert.match(src, /onDiscard=\{\(\) => setStaged\(\{\}\)\}/);
  // 0.4.11: the per-move undo is a small round X icon button labelled from
  // i18n, not a text link; the behaviour, onUndo(m.id), is unchanged.
  assert.match(src, /onClick=\{\(\) => onUndo\(m\.id\)\} aria-label=\{t\('pro\.tasks\.unstage'\)\} title=\{t\('pro\.tasks\.unstage'\)\}/, 'the X carries its label for the screen reader and the hover');
  assert.match(src, /<ProIcon name="close" size=\{10\} \/>/, 'the control is an icon, not the word Undo');
  // Naming the card is the point: a bar that only says "3 changes" makes a
  // person guess which three.
  assert.match(src, /\{moves\.map\(\(m\) => \(/);
  assert.match(src, /t\(`pro\.tasks\.status\.\$\{m\.from\}`\)/);
  assert.match(src, /t\(`pro\.tasks\.status\.\$\{m\.to\}`\)/);
});

test('a staged card says so, with an even border and a chip, never a stripe', () => {
  assert.match(src, /border: `1px solid \$\{moved \? 'var\(--cth-accent\)' : 'var\(--cth-ink-300\)'\}`/);
  assert.match(src, /\{moved && <Chip tone="accent">\{t\('pro\.tasks\.moved'\)\}<\/Chip>\}/);
  // The rule is about CARDS. A table's row rules and the save bar's top edge
  // are separators between things, not an edge on one side of a card.
  const shell = src.slice(src.indexOf('const shell = {'), src.indexOf('const body = ('));
  assert.ok(!/borderLeft|borderTop|borderRight|borderBottom/.test(shell), 'the card grew a thicker edge on one side');
  const column = src.slice(src.indexOf('function Board('), src.indexOf('function SaveBar('));
  assert.match(column, /border: `1px solid \$\{hot \? 'var\(--cth-accent\)' : 'transparent'\}`/, 'and so does the drop target');
  assert.ok(!/borderLeft|borderRight/.test(column), 'a column grew an edge on one side');
});

/* ---- 3. one writer ---------------------------------------------------- */

test('sending is one queued message to the orchestrator, and the screen writes no ledger', () => {
  // `fromHuman` is what puts the batch in the orchestrator's thread as a
  // message from the PERSON (0.4.9 phase 3). Without it the board's send is
  // the only thing he does that the Inbox never shows him doing.
  assert.match(src, /useStore\.getState\(\)\.enqueueMessage\(god\.id, movesMessage\(moves\), \{ fromHuman: true \}\)/, 'one message, the door the composer uses');
  assert.match(src, /setStaged\(\{\}\);/, 'and the bar clears');
  assert.match(src, /disabled=\{!god \|\| sending\}/, 'with no orchestrator there is nobody to send to');
  // THE RULE. If any of these ever appear here, the renderer has become a
  // second writer of hive/tasks.json and the ledger is no longer safe.
  for (const door of ['hiveTasksWrite', 'writeFile', 'saveTasks', 'hiveSetTaskStatus']) {
    assert.ok(!src.includes(door), `the Tasks screen reaches ${door}: the board must stage, never write`);
  }
});

/* ---- 4. strings ------------------------------------------------------- */

test('every new board string exists in the three locales, with no dash', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
  // 0.4.11: pro.tasks.staged.undo (the old text link) gave way to
  // pro.tasks.unstage, the aria-label and tooltip of the X icon button.
  const keys = ['pro.tasks.moved', 'pro.tasks.dragHint', 'pro.tasks.staged.region', 'pro.tasks.staged.one',
    'pro.tasks.staged.many', 'pro.tasks.staged.hint', 'pro.tasks.staged.noGod', 'pro.tasks.staged.send',
    'pro.tasks.staged.sendNoGod', 'pro.tasks.staged.discard', 'pro.tasks.unstage', 'pro.tasks.staged.sent'];
  for (const k of keys) {
    for (const l of Object.keys(locales)) {
      assert.ok(locales[l].has(k), `${k} in ${l}`);
      const v = locales[l].get(k);
      assert.ok(!/[—–]/.test(v) && !/ - /.test(v), `${k} (${l}) carries a dash`);
    }
    assert.ok(src.includes(k.replace('pro.tasks.', '')), `${k} is used`);
  }
});

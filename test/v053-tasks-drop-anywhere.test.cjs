'use strict';

/**
 * 0.5.3, founder on rc.4: moving a card on the Tasks board "only works when
 * you drag it to the top of the new column". He wants the whole column to be
 * the target, lit the moment a drag enters it, and the card added on release
 * anywhere in it.
 *
 * Cause: the board grid aligned its columns to the start, so a column was
 * only as tall as its cards; below the last card the pointer was over the
 * grid, where nothing listened. Tests 1 to 3 RUN the column's handlers
 * (pro/boardDrop.ts) on dispatched events, test 4 pins the layout that makes
 * the column reach the bottom of the board.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { columnDrop } = loadTs('src/renderer/src/components/pro/boardDrop.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

/** A column: an element with an empty area under its one card. */
function column(status, { ledger, moves, overRef }) {
  const col = new EventTarget();
  const card = new EventTarget();
  const empty = new EventTarget();
  const kids = new Set([card, empty]);
  const h = columnDrop(status, {
    find: (id) => ledger.get(id),
    move: (task, to) => moves.push([task.id, to]),
    setOver: (fn) => { overRef.v = fn(overRef.v); }
  });
  const contains = (n) => n === col || kids.has(n);
  for (const [type, fn] of [['dragover', h.onDragOver], ['dragleave', h.onDragLeave], ['drop', h.onDrop]]) {
    // The handler sees the column as React hands it: currentTarget is the column.
    col.addEventListener(type, (e) => fn({ preventDefault: () => e.preventDefault(), currentTarget: { contains }, relatedTarget: e.relatedTarget, dataTransfer: e.dataTransfer }));
  }
  // A child passes its events up to the column, as the DOM bubbles them.
  for (const child of [card, empty]) {
    for (const type of ['dragover', 'dragleave', 'drop']) child.addEventListener(type, (e) => { const up = Object.assign(new Event(type, { cancelable: true }), { dataTransfer: e.dataTransfer, relatedTarget: e.relatedTarget }); col.dispatchEvent(up); if (up.defaultPrevented) e.preventDefault(); });
  }
  return { col, card, empty };
}
const dragEvent = (type, id, extra = {}) => {
  const data = { 'text/plain': id };
  return Object.assign(new Event(type, { cancelable: true }), { dataTransfer: { getData: (t) => data[t] ?? '', dropEffect: 'none' }, ...extra });
};

test('1. a drop on the EMPTY area of a column moves the card there', () => {
  const ledger = new Map([['T-1', { id: 'T-1' }]]);
  const moves = []; const overRef = { v: null };
  const { empty } = column('doing', { ledger, moves, overRef });
  empty.dispatchEvent(dragEvent('dragover', 'T-1'));
  assert.equal(overRef.v, 'doing', 'the column lights the moment the drag is over it');
  empty.dispatchEvent(dragEvent('drop', 'T-1'));
  assert.deepEqual(moves, [['T-1', 'doing']]);
  assert.equal(overRef.v, null, 'the light goes out on release');
});

test('2. a drop on a card or on the empty area does the same; an unknown id moves nothing', () => {
  const ledger = new Map([['T-1', { id: 'T-1' }], ['T-2', { id: 'T-2' }]]);
  const moves = []; const overRef = { v: null };
  const { card, empty } = column('done', { ledger, moves, overRef });
  card.dispatchEvent(dragEvent('drop', 'T-1'));
  empty.dispatchEvent(dragEvent('drop', 'T-2'));
  empty.dispatchEvent(dragEvent('drop', 'nope'));
  assert.deepEqual(moves, [['T-1', 'done'], ['T-2', 'done']]);
});

test('3. moving inside the column keeps it lit; leaving it turns it off, and never another column\'s light', () => {
  const moves = []; const overRef = { v: null };
  const { card, empty } = column('todo', { ledger: new Map(), moves, overRef });
  empty.dispatchEvent(dragEvent('dragover', 'T-1'));
  card.dispatchEvent(dragEvent('dragleave', 'T-1', { relatedTarget: card }));
  assert.equal(overRef.v, 'todo', 'from the empty area onto a card inside: still lit');
  card.dispatchEvent(dragEvent('dragleave', 'T-1', { relatedTarget: null }));
  assert.equal(overRef.v, null, 'out of the column: off');
  overRef.v = 'blocked';
  card.dispatchEvent(dragEvent('dragleave', 'T-1', { relatedTarget: null }));
  assert.equal(overRef.v, 'blocked', 'leaving To do does not switch off Blocked');
  const over = dragEvent('dragover', 'T-1');
  empty.dispatchEvent(over);
  assert.equal(over.defaultPrevented, true, 'dragover is accepted, or the browser refuses the drop');
});

test('4. the columns stretch to the full board and take the handlers on the whole column; the ring stays even', () => {
  const src = read('src/renderer/src/components/pro/TasksScreen.tsx');
  const board = src.slice(src.indexOf('function Board('), src.indexOf('function SaveBar('));
  assert.match(board, /gridTemplateColumns: 'repeat\(4, minmax\(200px, 1fr\)\)', gap: 12, minHeight: '100%', alignItems: 'stretch'/);
  assert.doesNotMatch(board, /alignItems: 'start'/, 'a start aligned column is only as tall as its cards');
  assert.match(board, /const dnd = onMove \? columnDrop<Status, HiveTask>\(s, \{ find: \(id\) => byId\.get\(id\), move: onMove, setOver \}\) : null;/);
  assert.match(board, /onDragOver=\{dnd\?\.onDragOver\}\n\s*onDragLeave=\{dnd\?\.onDragLeave\}\n\s*onDrop=\{dnd\?\.onDrop\}/);
  assert.match(board, /border: `1px solid \$\{hot \? 'var\(--cth-accent\)' : 'transparent'\}`/, '1px all round, no thicker edge');
  assert.doesNotMatch(board, /border(Left|Right|Top|Bottom)/);
});

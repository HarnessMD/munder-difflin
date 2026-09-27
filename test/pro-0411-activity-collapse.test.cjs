'use strict';

/**
 * PILOT FEEDBACK ITEM 7 (pro 0.4.11). The agent thread drowned in tool rows:
 * dozens of consecutive "Bash" lines, one per call. The fix is one pure rule
 * in src/shared/activityCollapse.ts: consecutive rows for the SAME tool fold
 * into one run; anything else breaks the run and passes through untouched.
 * This file pins the rule, and the copy the thread draws it with.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const A = loadTs(path.join(ROOT, 'src/shared/activityCollapse.ts'));

// Rows shaped like the thread's items: sys tool rows carry a tool name,
// everything else (a message, a send, an idle line) does not.
const tool = (name, ts) => ({ ts, kind: 'sys', tool: name });
const msg = (ts) => ({ ts, kind: 'msg' });
const idle = (ts) => ({ ts, kind: 'sys', tool: undefined });
const toolOf = (r) => (r.kind === 'sys' ? r.tool : undefined);

test('a single tool row comes back as a run of one, in place', () => {
  const rows = [msg(1), tool('Bash', 2), msg(3)];
  const out = A.collapseToolRuns(rows, toolOf);
  assert.equal(out.length, 3);
  assert.deepEqual(out[1], { kind: 'run', tool: 'Bash', count: 1, ts: 2, rows: [rows[1]] });
});

test('a run of the same tool folds into one row that counts them all', () => {
  const rows = Array.from({ length: 10 }, (_, i) => tool('Bash', i + 1));
  const out = A.collapseToolRuns(rows, toolOf);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'run');
  assert.equal(out[0].tool, 'Bash');
  assert.equal(out[0].count, 10);
  assert.equal(out[0].rows.length, 10);
});

test('the run keeps the timestamp of its LAST row, always', () => {
  const out = A.collapseToolRuns([tool('Bash', 100), tool('Bash', 200), tool('Bash', 350)], toolOf);
  assert.equal(out[0].ts, 350, 'the run reads as the moment it finished');
  const one = A.collapseToolRuns([tool('Read', 42)], toolOf);
  assert.equal(one[0].ts, 42, 'a run of one is its own last row');
});

test('a different tool breaks the run: two tools never share a line', () => {
  const out = A.collapseToolRuns(
    [tool('Bash', 1), tool('Bash', 2), tool('ToolSearch', 3), tool('Bash', 4)],
    toolOf
  );
  assert.deepEqual(out.map((x) => [x.tool, x.count]), [['Bash', 2], ['ToolSearch', 1], ['Bash', 1]]);
});

test('a message breaks the run, and so does a status line like waiting for work', () => {
  const rows = [tool('Bash', 1), tool('Bash', 2), msg(3), tool('Bash', 4), idle(5), tool('Bash', 6)];
  const out = A.collapseToolRuns(rows, toolOf);
  assert.deepEqual(
    out.map((x) => (x.kind === 'run' ? `run:${x.tool}x${x.count}` : `row@${x.row.ts}`)),
    ['run:Bashx2', 'row@3', 'run:Bashx1', 'row@5', 'run:Bashx1']
  );
});

test('a mixed sequence keeps its order, and non-tool rows pass through untouched', () => {
  const rows = [msg(1), tool('Read', 2), tool('Read', 3), msg(4), tool('Bash', 5), tool('Grep', 6), idle(7)];
  const out = A.collapseToolRuns(rows, toolOf);
  assert.equal(out.length, 6);
  assert.equal(out[0].row, rows[0], 'the very object, not a copy');
  assert.deepEqual(out[1], { kind: 'run', tool: 'Read', count: 2, ts: 3, rows: [rows[1], rows[2]] });
  assert.equal(out[2].row, rows[3]);
  assert.equal(out[3].tool, 'Bash');
  assert.equal(out[4].tool, 'Grep');
  assert.equal(out[5].row, rows[6], 'an idle line is not a tool and is not folded');
});

test('the function is pure: the input list and its rows are not written', () => {
  const rows = [tool('Bash', 1), tool('Bash', 2)];
  const before = JSON.stringify(rows);
  A.collapseToolRuns(rows, toolOf);
  assert.equal(JSON.stringify(rows), before);
  assert.equal(rows.length, 2);
});

test('an empty list and a nameless tool row are handled without folding anything', () => {
  assert.deepEqual(A.collapseToolRuns([], toolOf), []);
  // A tool entry that lost its name cannot be grouped under a blank heading;
  // it passes through and the thread's describeEntry fallback words it.
  const out = A.collapseToolRuns([idle(1), idle(2)], toolOf);
  assert.deepEqual(out.map((x) => x.kind), ['row', 'row']);
  const blank = A.collapseToolRuns([{ ts: 1, kind: 'sys', tool: '' }], toolOf);
  assert.equal(blank[0].kind, 'row', 'an empty name is no name');
});

/* ---- the thread actually uses it, with the counted copy ------------------- */

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('AgentInbox folds its feed through collapseToolRuns and words both cases', () => {
  const inbox = read('src/renderer/src/components/pro/AgentInbox.tsx');
  assert.match(inbox, /import \{ collapseToolRuns \} from '@shared\/activityCollapse';/);
  assert.match(inbox, /collapseToolRuns\(items, \(x\) => \(x\.kind === 'sys' && x\.e\.kind === 'tool' \? x\.e\.tool : undefined\)\)/,
    'only bare tool rows are offered for folding; messages and status lines are not');
  assert.match(inbox, /t\('pro\.room\.sys\.toolOnce', \{ tool: fi\.tool \}\)/, 'a lone tool row says the tool was used');
  assert.match(inbox, /t\('pro\.room\.sys\.toolRun', \{ tool: fi\.tool, count: fi\.count \}\)/, 'a folded run says how many times, with the real count');
  assert.match(inbox, /describeEntry\(it\.e, t, technical\)/, 'non-tool digest lines still go through describeEntry, unchanged');
});

test('the run copy exists in every locale and carries no dash', () => {
  for (const l of ['en', 'zh-CN', 'ar']) {
    const sys = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.room.sys;
    for (const k of ['toolOnce', 'toolRun']) {
      assert.equal(typeof sys[k], 'string', `${l} is missing pro.room.sys.${k}`);
      assert.match(sys[k], /\{\{tool\}\}/, `${l} ${k} does not interpolate the tool name`);
      assert.ok(!/—|–| - /.test(sys[k]), `${l} ${k} carries a dash`);
    }
    assert.match(sys.toolRun, /\{\{count\}\}/, `${l} toolRun does not interpolate the count`);
  }
});

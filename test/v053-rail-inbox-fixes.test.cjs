'use strict';

/**
 * Two faults seen on the real build during T133 (0.5.3, 23 Sep 2026), both in
 * the rail and the Inbox:
 *   a. the rail's Asked you strip printed the ask's raw markdown
 *      ("**Which accent colour...** - `sky`");
 *   b. the Inbox drew "Show 0 more lines" under most messages. The screens
 *      were right to trust the count; clampLines reported a message cut part
 *      way through its only line as clipped with 0 lines hidden. 52 of the 60
 *      messages on the test floor drew it. The pins checked the callers' copy,
 *      never the count the helper handed them.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const L = loadTs('src/shared/lineClamp.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

/* ---- b. the count ---------------------------------------------------------- */

const SHAPES = {
  'one long line': 'word '.repeat(400),
  'short lines then one long line': ['one', 'two', 'word '.repeat(400)].join('\n'),
  'a long line in the middle': ['one', 'word '.repeat(400), 'three', 'four'].join('\n'),
  'many short lines': Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n'),
  'a fence cut open': ['intro', '```js', ...Array.from({ length: 20 }, (_, i) => `const x${i} = ${i};`)].join('\n'),
  'a table cut': ['before', '| a | b |', '| - | - |', ...Array.from({ length: 20 }, (_, i) => `| ${i} | ${i} |`)].join('\n'),
  'an unbroken blob': 'x'.repeat(5000)
};

test('clipped always hides at least one line: the control never says "0 more lines"', () => {
  for (const [name, body] of Object.entries(SHAPES)) {
    for (const opts of [{}, { maxLines: 3 }, { maxLines: 2, maxChars: 80 }]) {
      const r = L.clampLines(body, opts);
      if (r.clipped) assert.ok(r.hiddenLines >= 1, `${name} ${JSON.stringify(opts)}: clipped with ${r.hiddenLines} hidden`);
      else assert.equal(r.hiddenLines, 0, name);
    }
  }
});

test('the count is the real remainder: whole lines not reached, plus the tail of the line cut part way', () => {
  assert.equal(L.clampLines('word '.repeat(400)).hiddenLines, 1, 'one line, cut: its tail is one hidden line');
  const r = L.clampLines(['one', 'word '.repeat(400), 'three', 'four'].join('\n'), { maxChars: 100 });
  assert.equal(r.clipped, true);
  assert.equal(r.hiddenLines, 3, 'the cut line\'s tail, three and four');
  assert.equal(L.clampLines(Array.from({ length: 400 }, (_, i) => `line ${i + 1}`).join('\n'), { maxLines: 5 }).hiddenLines, 395, 'unchanged for whole lines');
  assert.deepEqual(L.clampLines('short'), { text: 'short', clipped: false, hiddenLines: 0 });
});

test('both Inbox bodies still draw the control only when clipped, from this count', () => {
  const inbox = read('src/renderer/src/components/pro/InboxScreen.tsx');
  assert.match(inbox, /\{clamp\.clipped && \(/);
  assert.match(inbox, /t\('pro\.inbox\.showMore', \{ count: clamp\.hiddenLines \}\)/);
  const thread = read('src/renderer/src/components/pro/AgentInbox.tsx');
  assert.match(thread, /if \(!clamp\.clipped\) return <MarkdownPreview source=\{source\} variant="card" \/>;/);
});

/* ---- a. the strip ---------------------------------------------------------- */

test('an ask in markdown reads as plain words in one line', () => {
  const cases = [
    ['**Which accent colour for the drop page, sky or mint?**\n\n- `sky`\n- `mint`', 'Which accent colour for the drop page, sky or mint?'],
    ['Is `src/a.ts` the file, per [the spec](https://x.y/spec)?', 'Is src/a.ts the file, per the spec?'],
    ['- **Pick one**, A or B', 'Pick one, A or B'],
    ['1. Approve the spend?\n2. Or wait?', 'Approve the spend?'],
    ['## Ship it today?', 'Ship it today?'],
    ['Plain question?', 'Plain question?']
  ];
  for (const [q, want] of cases) assert.equal(L.previewLine(q), want, q);
});

test('the rail hands the strip the plain line, at the one place the ask leaves the ledger', () => {
  const rail = read('src/renderer/src/components/pro/ProSidebar.tsx');
  // Ask me batch 2 (24 Sep): the one place is now the newest ask of the agent's own.
  assert.match(rail, /text: previewLine\(openQuestion\(newest\)\?\.q \?\? ''\) \|\| undefined/);
  assert.doesNotMatch(rail, /return openQuestion\(t\)\?\.q;/, 'the raw question never reaches the strip');
});

test('one hidden line reads "1 more line", in every language, without plural keys', () => {
  for (const lng of ['en', 'zh-CN', 'ar']) {
    const pro = JSON.parse(read(`src/renderer/src/i18n/locales/${lng}.json`)).pro;
    for (const v of [pro.room.showMoreOne, pro.inbox.showMoreOne, pro.memory.moreLinesOne]) {
      assert.ok(v && v.trim(), lng);
      assert.doesNotMatch(v, /\{\{count\}\}|[–—]/, lng);
    }
  }
  assert.equal(JSON.parse(read('src/renderer/src/i18n/locales/en.json')).pro.inbox.showMoreOne, 'Show 1 more line');
  assert.match(read('src/renderer/src/components/pro/InboxScreen.tsx'), /clamp\.hiddenLines === 1 \? t\('pro\.inbox\.showMoreOne'\)/);
  assert.match(read('src/renderer/src/components/pro/AgentInbox.tsx'), /clamp\.hiddenLines === 1 \? t\('pro\.room\.showMoreOne'\)/);
  assert.match(read('src/renderer/src/components/pro/MemoryScreen.tsx'), /cut\.hiddenLines === 1 \? t\('pro\.memory\.moreLinesOne'\)/);
});

// 0.4.10, founder 3 Sep 2026: "The messages where AI sends a lot of text
// should only render first 4-5 lines in the inboxes section inside avatar and
// the inbox section in the sidebar." and "There are some cards with text
// overflowing out of them in tasks section/memory listing."
//
// What this pins:
//   1. src/shared/lineClamp.ts: clampLines and previewLine, as pure logic.
//   2. AgentInbox's thread clamps a long agent message to a handful of source
//      lines, with an expand and collapse control whose count is real.
//   3. The Inbox's agent row subtitle never shows raw Markdown syntax.
//   4. The floor thread clamps the same way, with the same control.
//   5. The two card overflow defects in TasksScreen and TaskSheet: a break
//      rule wherever a card was letting one long unbroken token blow out its
//      box, and table-layout: fixed so a percentage column width is real.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const thread = strip(read(`${PRO}/AgentInbox.tsx`));
const inbox = strip(read(`${PRO}/InboxScreen.tsx`));
const tasksScreen = strip(read(`${PRO}/TasksScreen.tsx`));
const taskSheet = strip(read(`${PRO}/TaskSheet.tsx`));

const L = loadTs('src/shared/lineClamp.ts');

/* ---- 1. clampLines, as arithmetic ----------------------------------------- */

test('short text passes through untouched', () => {
  const r = L.clampLines('one line\nanother line');
  assert.equal(r.clipped, false);
  assert.equal(r.hiddenLines, 0);
  assert.equal(r.text, 'one line\nanother line');
});

test('a long answer cuts at maxLines and says how many lines it hid', () => {
  const body = Array.from({ length: 400 }, (_, i) => `line ${i + 1}`).join('\n');
  const r = L.clampLines(body, { maxLines: 5 });
  assert.equal(r.clipped, true);
  assert.equal(r.text.split('\n').length, 5);
  assert.equal(r.text.split('\n')[0], 'line 1');
  assert.equal(r.hiddenLines, 395, 'the count in the row must be the real remainder, not a guess');
});

test('one enormous unbroken line is cut at maxChars, on a word boundary', () => {
  const body = `${'a'.repeat(50)} ${'b'.repeat(500)}`;
  const r = L.clampLines(body, { maxLines: 5, maxChars: 60 });
  assert.equal(r.clipped, true);
  assert.ok(r.text.length <= 60, 'the cut respects the character budget');
  assert.ok(!r.text.endsWith('b'.repeat(500)), 'the run of b is not kept whole');
});

test('a cut that would leave an open code fence drops back to before it opened', () => {
  const body = ['intro line', '```js', 'const x = 1;', 'const y = 2;', 'const z = 3;', 'const w = 4;'].join('\n');
  const r = L.clampLines(body, { maxLines: 5 });
  assert.equal(r.clipped, true);
  assert.ok(!r.text.includes('```'), 'the unterminated fence must not reach the renderer');
  assert.equal(r.text, 'intro line');
});

test('a cut that would leave a headerless table row drops the partial table', () => {
  const body = ['before', '| a | b |', '| - | - |', '| 1 | 2 |', '| 3 | 4 |', '| 5 | 6 |'].join('\n');
  const r = L.clampLines(body, { maxLines: 4 });
  assert.ok(!/^\s*\|.*\|\s*$/m.test(r.text), 'no stray pipe row is left dangling');
});

test('blank lines at the top and blank runs in the middle are not counted as content', () => {
  const r = L.clampLines('\n\n\nreal line one\n\n\nreal line two\n\n\n', { maxLines: 5 });
  assert.equal(r.clipped, false);
  assert.equal(r.text, 'real line one\n\nreal line two');
});

test('empty input clamps to nothing, not an error', () => {
  assert.deepEqual(L.clampLines(''), { text: '', clipped: false, hiddenLines: 0 });
  assert.deepEqual(L.clampLines(undefined), { text: '', clipped: false, hiddenLines: 0 });
});

/* ---- 2. previewLine, the one line reader used in the sidebar -------------- */

test('previewLine strips Markdown syntax rather than showing it literally', () => {
  assert.equal(L.previewLine('**bold** and _italic_ and `code`'), 'bold and italic and code');
  assert.equal(L.previewLine('[a link](https://example.com/x)'), 'a link');
  assert.equal(L.previewLine('# A heading'), 'A heading');
  assert.equal(L.previewLine('- a list item'), 'a list item');
  assert.equal(L.previewLine('> a quote'), 'a quote');
});

test('previewLine skips a leading fence line and blank lines, and takes the first real content', () => {
  assert.equal(L.previewLine('\n\n```\ncode inside\n```\nreal text'), 'code inside');
  assert.equal(L.previewLine(''), '');
});

test('previewLine truncates long text at the character budget', () => {
  const long = 'word '.repeat(60).trim();
  const r = L.previewLine(long, 20);
  assert.ok(r.length <= 20);
});

/* ---- 3. the agent thread clamps a long message ---------------------------- */

test('AgentInbox runs a message body through clampLines and draws a real expand control', () => {
  assert.match(thread, /import \{ clampLines(, previewLine)? \} from '@shared\/lineClamp';/);
  assert.match(thread, /export function ClampedMarkdown\(\{ source, expanded, onToggle \}/, 'the clamp and its control live in one place, not inlined per row');
  assert.match(thread, /const clamp = useMemo\(\(\) => clampLines\(source\), \[source\]\);/);
  // Unclamped text draws no control at all: the row must not grow a "more"
  // link under a message that was never cut.
  assert.match(thread, /if \(!clamp\.clipped\) return <MarkdownPreview source=\{source\} variant="card" \/>;/);
  assert.match(thread, /t\('pro\.room\.showMore', \{ count: clamp\.hiddenLines \}\)/, 'the count in the copy is the real hidden count, never invented');
  assert.match(thread, /t\('pro\.room\.showLess'\)/, 'collapsing again must be possible');
  // Wired into the message body, not left unused.
  assert.match(thread, /<ClampedMarkdown source=\{m\.body\} expanded=\{expanded\.has\(m\.id\)\} onToggle=\{\(\) => toggleExpanded\(m\.id\)\} \/>/);
});

test('expansion is kept per message id, so a poll appending new rows cannot reset it, and it can be reversed', () => {
  assert.match(thread, /const \[expanded, setExpanded\] = useState<Set<string>>\(\(\) => new Set\(\)\);/);
  assert.match(thread, /const toggleExpanded = \(id: string\) => setExpanded\(\(prev\) => \{/);
  assert.match(thread, /if \(next\.has\(id\)\) next\.delete\(id\); else next\.add\(id\);/, 'the same control must collapse what it expanded');
});

/* ---- 4. the inbox list row shows one clean line --------------------------- */

test('the agent row subtitle goes through previewLine so raw Markdown is not shown literally', () => {
  assert.match(inbox, /import \{ clampLines, previewLine \} from '@shared\/lineClamp';/);
  assert.match(inbox, /sub = last \? previewLine\(describeEntry\(last, t, technical\)\) : /, 'the digest line can carry an agent\'s own words, so it is previewed, not shown raw');
});

/* ---- 5. the floor thread clamps the same way ------------------------------ */

test('the floor thread runs a message body through the same clamp and control, keyed by message id', () => {
  assert.match(inbox, /function ClampedPlainBody\(\{ source, expanded, onToggle \}/);
  assert.match(inbox, /const clamp = useMemo\(\(\) => clampLines\(source\), \[source\]\);/);
  assert.match(inbox, /t\('pro\.inbox\.showMore', \{ count: clamp\.hiddenLines \}\)/);
  assert.match(inbox, /t\('pro\.inbox\.showLess'\)/);
  assert.match(inbox, /<ClampedPlainBody source=\{m\.body\} expanded=\{expanded\.has\(m\.id\)\} onToggle=\{\(\) => toggleExpanded\(m\.id\)\} \/>/);
  assert.ok(!/whiteSpace: 'pre-wrap', wordBreak: 'break-word' \}\}>\{m\.body\}<\/div>/.test(inbox), 'the raw unbound body render is gone from the floor thread');
});

test('the bubble measure is untouched: still exactly 5 bubbles in the Inbox', () => {
  // This is the guard test/pro-049-inbox.test.cjs already carries; repeated
  // here because this file's clamp work is the change most likely to nudge a
  // bubble without meaning to. No bubble was added or removed by this work.
  assert.equal((inbox.match(/maxWidth: BUBBLE/g) || []).length, 5);
});

/* ---- 6. the two card overflow defects -------------------------------------- */

test('TasksScreen: the board card title breaks a long unbroken token instead of overflowing the card', () => {
  assert.match(
    tasksScreen,
    /WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere', width: '100%' \}\}>\{task\.title\}<\/div>/
  );
});

test('TasksScreen: the list view table has a real fixed layout, so the 45% title column is not just advisory', () => {
  assert.match(tasksScreen, /<table style=\{\{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' \}\}>/);
  assert.match(tasksScreen, /<th style=\{\{ \.\.\.th, width: '45%' \}\}>\{t\('pro\.tasks\.col\.title'\)\}<\/th>/, 'the 45% column this fix makes real');
  assert.match(tasksScreen, /<span style=\{\{ overflowWrap: 'anywhere', minWidth: 0 \}\}>\{x\.title\}<\/span>/, 'the title cell gets a real break rule');
});

test('TaskSheet: the sheet header title breaks a long unbroken token instead of crowding the close control', () => {
  assert.match(
    taskSheet,
    /<h2 style=\{\{ margin: 0, flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: 'var\(--cth-ink-900\)', lineHeight: '20px', wordBreak: 'break-word' \}\}>\{task\.title\}<\/h2>/
  );
  // The pattern this copies, so the two cannot drift apart silently.
  assert.match(taskSheet, /wordBreak: 'break-word', fontFamily: 'var\(--cth-font-mono\)'/, 'the reference pattern this fix follows is still here');
});

/* ---- 7. every new string ships in all three locales, no dashes ------------ */

test('the show more and show less copy exists in en, zh-CN and ar, with no dashes', () => {
  const DASH = /—|–| - /;
  for (const l of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    for (const [ns, key] of [['room', 'showMore'], ['room', 'showLess'], ['inbox', 'showMore'], ['inbox', 'showLess']]) {
      const v = j.pro[ns][key];
      assert.equal(typeof v, 'string', `pro.${ns}.${key} missing in ${l}`);
      assert.ok(!DASH.test(v), `pro.${ns}.${key} in ${l} has a dash: "${v}"`);
    }
    assert.ok(j.pro.room.showMore.includes('{{count}}'), `pro.room.showMore in ${l} must carry the real count`);
    assert.ok(j.pro.inbox.showMore.includes('{{count}}'), `pro.inbox.showMore in ${l} must carry the real count`);
  }
});

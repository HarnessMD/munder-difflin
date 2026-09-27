'use strict';

// 0.4.11, founder 5 Sep 2026: the IDE redesign, piece B. ONE SEARCH.
//
// The 0.4.9 sidebar had "files · names · text", three modes of one column,
// and nothing said that names found a file and text found a line. The
// redesign keeps the two questions (a name hit is a file, a text hit is a
// line) and makes one box ask both, in three places: the Search tab, the
// quick open in the top bar (⌘P), and the home tab. What this file pins:
//
//   1. ONE hook owns both doors. Nothing else in the IDE calls listDir for an
//      index or searchFiles for contents, so the three boxes cannot disagree.
//   2. The debounces, and the rule that only the newest run may write.
//   3. Every ceiling is exposed by the hook and said by the surfaces.
//   4. A line leaves a row with its column and length; a name hit carries no
//      line, because it has none.
//   5. The props are the plan's, so the frame can be built against them.
//   6. The look is the kit's: icons from ideIcons, no pixel font, PRO tokens
//      with a Classic fallback, no literal colours, no dashes in the copy.
//   7. Every locale key used exists, or is on the list the frame applies.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const IDE = 'src/renderer/src/ide';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const raw = {
  hook: read(`${IDE}/useWorkspaceSearch.ts`),
  quick: read(`${IDE}/QuickOpen.tsx`),
  home: read(`${IDE}/HomeTab.tsx`),
  pane: read(`${IDE}/SearchPane.tsx`)
};
const code = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, strip(v)]));

/* ═══ 1. one hook, both doors ═══════════════════════════════════════════════ */

test('1. NamePane is gone, and the hook is the only place that reaches main for an index or a search', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, IDE, 'NamePane.tsx')), 'NamePane.tsx must be deleted, not left dead');
  assert.match(code.hook, /import \{ DEFAULT_NAME_LIMIT, collectFiles, matchNames, type FileIndex, type NameMatch \} from '@shared\/ideFileIndex';/);
  const doors = [...code.hook.matchAll(/window\.cth\.(\w+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(doors)].sort(), ['listDir', 'searchFiles']);
  for (const k of ['quick', 'home', 'pane']) {
    assert.ok(!/window\.cth\./.test(code[k]), `${k} must ask the hook, never main`);
    assert.match(code[k], /useWorkspaceSearch\(root, query/, `${k} reads the one hook`);
  }
  // The quick open and the home tab draw ONE answer: the same rows, the same renderer.
  assert.match(code.quick, /export function quickRows\(search: WorkspaceSearch, cap: number, commands: boolean\): QuickRow\[\]/);
  assert.match(code.quick, /export function SearchResults\(/);
  assert.match(code.home, /import \{ Kbd, SearchResults, quickRows, type QuickRow \} from '\.\/QuickOpen';/);
  assert.match(code.home, /quickRows\(search, HOME_CAP, false\)/);
  assert.match(code.quick, /quickRows\(search, QUICK_CAP, true\)/);
});

/* ═══ 2. the debounces, and who may write ═══════════════════════════════════ */

test('2. names filter an array on a short debounce; contents walk the disk on a longer one; Enter is now', () => {
  assert.match(code.hook, /export const NAME_DEBOUNCE_MS = 120;/);
  assert.match(code.hook, /export const TEXT_DEBOUNCE_MS = 250;/);
  assert.match(code.hook, /window\.setTimeout\(\(\) => setApplied\(query\), NAME_DEBOUNCE_MS\)/);
  assert.match(code.hook, /const pressed = run !== lastRun\.current;/);
  assert.match(code.hook, /const delay = pressed \? 0 : TEXT_DEBOUNCE_MS;/);
  assert.match(code.hook, /const mine = \+\+runId\.current;/);
  assert.match(code.hook, /if \(mine !== runId\.current\) return;/, 'only the newest run may write a result');
  // Both timers are cleared on the way out, so a keystroke never leaves one behind.
  assert.equal((code.hook.match(/return \(\) => window\.clearTimeout\(id\);/g) || []).length, 2);
  // An emptied box cancels whatever was in flight rather than letting it land.
  assert.match(code.hook, /if \(!q\) \{ runId\.current\+\+; setText\(\{ kind: 'idle' \}\); return; \}/);
  // The index is read once per root, and again only on demand.
  assert.match(code.hook, /\}, \[root, rebuild\]\);/);
  assert.match(code.hook, /const reindex = useCallback\(\(\) => setRebuild\(\(n\) => n \+ 1\), \[\]\);/);
  // The pane's Enter bumps the run; nothing in it starts a search of its own.
  assert.match(code.pane, /if \(e\.key === 'Enter'\) \{ e\.preventDefault\(\); setRun\(\(n\) => n \+ 1\); \}/);
  assert.ok(!/setTimeout/.test(code.pane), 'the pane has no timer of its own');
});

/* ═══ 3. every ceiling, exposed and said ════════════════════════════════════ */

test('3. the hook exposes every ceiling, and the surfaces say them in words', () => {
  for (const field of ['namesTotal: number', 'namesTruncated: boolean', 'indexTruncated: boolean', 'indexed: number | null', 'hitsTruncated: boolean', 'filesScanned: number']) {
    assert.ok(code.hook.includes(field), `WorkspaceSearch carries ${field}`);
  }
  assert.match(code.pane, /t\('ide\.find\.indexTruncated', \{ n: search\.indexed \}\)/);
  assert.match(code.pane, /t\('ide\.find\.listTruncated', \{ shown: search\.names\.length, total: search\.namesTotal \}\)/);
  assert.match(code.pane, /t\('ide\.search\.truncated'\)/);
  assert.match(code.pane, /t\('ide\.search\.count', \{ hits: search\.hits\.length, files: search\.hitFiles \}\)/);
  // A capped popover points at the rest instead of pretending five rows are all.
  assert.match(code.quick, /if \(search\.hits\.length > cap \|\| search\.hitsTruncated \|\| search\.namesTruncated\) \{\n\s+rows\.push\(\{ id: 'more', kind: 'more', total: search\.hits\.length \}\);/);
  assert.match(code.quick, /t\('ide\.quick\.showAll', \{ n: more\.total \}\)/);
  assert.match(code.quick, /export const QUICK_CAP = 5;/);
  assert.match(code.home, /export const HOME_CAP = 6;/);
});

/* ═══ 4. a line leaves the row; a name hit has no line ══════════════════════ */

test('4. a contents hit opens at its line with the matcher\'s own column and length; a name hit opens the file only', () => {
  assert.match(code.pane, /onClick=\{\(\) => onOpenHit\(h\.rel, h\.line, h\.col, h\.length\)\}/);
  assert.match(code.pane, /onClick=\{\(\) => onOpen\(m\.rel\)\}/);
  for (const k of ['quick', 'home']) {
    assert.match(code[k], /if \(row\.kind === 'file'\) onOpen\(row\.hit\.rel\);/, `${k}: a file row opens the file`);
    assert.match(code[k], /else if \(row\.kind === 'hit'\) onOpenHit\(row\.hit\.rel, row\.hit\.line, row\.hit\.col, row\.hit\.length\);/, `${k}: a hit row carries its line`);
  }
  // The highlight is the matcher's offsets, and a negative start marks nothing.
  assert.match(code.quick, /if \(start < 0 \|\| length <= 0\) return <>\{text\}<\/>;/);
  assert.match(code.pane, /<Marked text=\{h\.text\} start=\{h\.col - 1\} length=\{h\.length\} \/>/);
  // Enter opens the first row in the home tab; the quick open walks rows with the arrows.
  assert.match(code.home, /if \(e\.key === 'Enter'\) \{ e\.preventDefault\(\); pick\(rows\[0\]\); \}/);
  assert.match(code.quick, /if \(e\.key === 'ArrowDown'\)/);
  assert.match(code.quick, /else if \(e\.key === 'Enter'\) \{ e\.preventDefault\(\); pick\(rows\[active\] \?\? rows\[0\]\); \}/);
  // A long answer continues in the Search tab WITH the query.
  assert.match(code.quick, /else if \(row\.kind === 'more'\) onShowAll\(query\);/);
  assert.match(code.home, /else if \(row\.kind === 'more'\) onFindInFiles\(query\);/);
  assert.match(code.pane, /useEffect\(\(\) => \{ if \(handed !== undefined\) setQuery\(handed\); \}, \[handed\]\);/);
});

/* ═══ 5. the props are the plan's ══════════════════════════════════════════ */

function propsOf(src, name) {
  const at = src.indexOf(`export interface ${name} {`);
  assert.ok(at >= 0, `${name} is exported`);
  const body = src.slice(at, src.indexOf('\n}', at));
  return [...body.matchAll(/^\s+(\w+\??):/gm)].map((m) => m[1]);
}

test('5. QuickOpen, HomeTab and SearchPane take exactly the props the plan names', () => {
  assert.deepEqual(propsOf(code.quick, 'QuickOpenProps'), ['root', 'focusNonce', 'onOpen', 'onOpenHit', 'onNewFile', 'onShowAll']);
  assert.deepEqual(propsOf(code.home, 'HomeTabProps'), ['root', 'title', 'subtitle', 'recent', 'changed', 'focusNonce', 'onOpen', 'onOpenHit', 'onOpenDiff', 'onNewFile', 'onQuickOpen', 'onFindInFiles']);
  assert.deepEqual(propsOf(code.pane, 'SearchPaneProps'), ['root', 'focusNonce', 'query?', 'onOpen', 'onOpenHit']);
  assert.match(code.hook, /export function useWorkspaceSearch\(\n\s+root: string,\n\s+query: string,\n\s+opts: SearchOptions = NO_OPTIONS,\n\s+run = 0,/);
  assert.match(code.hook, /export interface SearchOptions \{ caseSensitive: boolean; wholeWord: boolean; regex: boolean \}/);
  assert.match(code.hook, /status: 'idle' \| 'indexing' \| 'searching' \| 'ready' \| 'error';/);
});

/* ═══ 6. the look is the kit's ═════════════════════════════════════════════ */

const DASH = /[–—]/;
const SPACED_HYPHEN = / - /;
const literals = (src) => [...src.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map((m) => m[0]);
const comments = (src) => [...src.matchAll(/\/\*[\s\S]*?\*\/|\/\/.*$/gm)].map((m) => m[0]);

test('6. icons from ideIcons, no pixel font, every PRO token with a Classic fallback, no literal colours, no dashes', () => {
  for (const [k, src] of Object.entries(code)) {
    if (k !== 'hook') {
      assert.match(src, /from '\.\/ideIcons'/, `${k} draws with the IDE's own icons`);
      assert.ok(!/@\/components\/Icon'/.test(src), `${k} must not use the Classic pixel Icon`);
    }
    assert.ok(!/--cth-font-display/.test(src), `${k}: the 8px pixel labels are what the redesign removes`);
    assert.ok(!/var\(--cth-(accent[a-z-]*|surface-active)\)/.test(src), `${k}: a PRO only token needs its Classic fallback`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src.replace(/t\('[^']*'\)/g, '')), `${k}: no literal colour`);
    assert.ok(!DASH.test(raw[k]), `${k}: no em or en dash anywhere`);
    for (const s of [...literals(raw[k]), ...comments(raw[k])]) {
      assert.ok(!SPACED_HYPHEN.test(s), `${k}: a spaced hyphen in copy or a comment: ${s.slice(0, 60)}`);
    }
  }
  // The results list rows fall back to the cream when the skin has no surface token.
  assert.match(code.quick, /background: on \? 'var\(--cth-surface-active, var\(--cth-cream-200\)\)' : 'transparent'/);
  // The mark is the accent's soft tint, and the ink stays the row's own.
  assert.match(code.quick, /background: 'var\(--cth-accent-soft, var\(--cth-lemon-light\)\)', color: 'inherit'/);
});

/* ═══ 7. every key exists, or is on the list the frame applies ══════════════ */

/** The strings this piece adds. Kevin applies them through the locked helper
 *  in one batch with the other pieces'; until then a key is allowed to be
 *  absent from the locales ONLY if it is on this list. */
const NEW_KEYS = {
  'ide.quick.placeholder': 'Search files or text in this workspace',
  'ide.quick.files': 'Files',
  'ide.quick.inFiles': 'In files',
  'ide.quick.commands': 'Commands',
  'ide.quick.showAll': 'Show all {{n}} in the Search tab',
  'ide.quick.none': 'Nothing matches {{query}}',
  'ide.search.hint': 'Type to search every file in the workspace. Names and contents both answer.',
  'ide.search.nameCount': '{{n}} file names',
  'ide.search.sectionNames': 'File names',
  'ide.search.sectionText': 'In files',
  'ide.home.newFileHint': 'In this folder',
  'ide.home.openFile': 'Open file',
  'ide.home.openFileHint': 'Find it by name',
  'ide.home.findInFiles': 'Search in code',
  'ide.home.findInFilesHint': 'Every line, every file',
  'ide.home.recent': 'Recent',
  'ide.home.changed': 'Changed',
  'ide.home.recentEmpty': 'Nothing opened yet.'
};

const get = (obj, key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);

test('7. every locale key the four files use exists in all three locales, or is on the list to apply', () => {
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))]));
  const used = new Set();
  for (const src of Object.values(code)) for (const m of src.matchAll(/\bt\('([a-zA-Z.]+)'/g)) used.add(m[1]);
  assert.ok(used.size >= 20, `the four files use ${used.size} keys`);
  for (const key of used) {
    const inEn = typeof get(locales.en, key) === 'string';
    assert.ok(inEn || key in NEW_KEYS, `${key} is neither in en.json nor on the list to apply`);
    if (inEn) {
      for (const l of ['zh-CN', 'ar']) assert.equal(typeof get(locales[l], key), 'string', `${key} missing in ${l}`);
    }
  }
  for (const [key, text] of Object.entries(NEW_KEYS)) {
    assert.ok(used.has(key), `${key} is on the list but no file uses it`);
    assert.ok(!DASH.test(text) && !SPACED_HYPHEN.test(text), `${key}: no dash in the English`);
    const en = get(locales.en, key);
    if (typeof en === 'string') assert.equal(en, text, `${key}: the applied English is the listed one`);
  }
});

'use strict';

// 0.4.9 phase 8, founder 3 Sep 2026: the IDE pass.
//
// Four asks, and the trap under each:
//
//   "editor chrome that reads as a    Chrome for its own sake is decoration. An
//    professional editor"             editor reads as one because it STATES
//                                     things: the path as a trail, the caret,
//                                     the language it is actually highlighting
//                                     with, how the file ends its lines, and
//                                     whether the buffer differs from the disk.
//                                     Every one of those has to be read off the
//                                     buffer. A status line that says UTF-8
//                                     because someone typed UTF-8 is a picture
//                                     of an editor.
//
//   "create a file, name it and save  The happy path is four lines. The trust
//    it without leaving the panel"    is in the four awkward cases: a name that
//                                     is taken, a name with a slash, a name
//                                     with no extension, and a folder that
//                                     cannot be written. Each needs its own
//                                     sentence, and the create still has to go
//                                     through the door that never truncates.
//
//   "search any file by name and by   Two questions, two answers. A name hit is
//    contents, and open the hit at    a file; a contents hit is a line inside
//    its line"                        one, and the line has to survive the trip
//                                     into the editor. Both lists are capped,
//                                     and a capped list that does not say so is
//                                     a list that lies about the workspace.
//
//   "markdown reading and reviewing   Rendering is reading. Reviewing is moving
//    as a first class mode"           through a document, so the outline has to
//                                     JUMP, and it has to jump in the source as
//                                     well as in the rendered page, or the same
//                                     click does nothing in half the modes.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const IDE = 'src/renderer/src/ide';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const panel = strip(read(`${IDE}/IdePanel.tsx`));
const chrome = strip(read(`${IDE}/EditorChrome.tsx`));
const dialog = strip(read(`${IDE}/NewFileDialog.tsx`));
// 5 Sep 2026 (0.4.11, the IDE redesign): NamePane is gone. Its index walk and
// its debounce moved into useWorkspaceSearch, the one hook the Search tab,
// the quick open and the home tab all read. The pins below that named the
// pane now name the hook, and hold the same guarantees.
const searchHook = strip(read(`${IDE}/useWorkspaceSearch.ts`));
const searchPane = strip(read(`${IDE}/SearchPane.tsx`));
const review = strip(read(`${IDE}/MarkdownReview.tsx`));
const monaco = strip(read(`${IDE}/MonacoEditor.tsx`));
const main = strip(read('src/main/index.ts'));

const NEW = loadTs('src/shared/ideNewFile.ts');
const INDEX = loadTs('src/shared/ideFileIndex.ts');
const MD = loadTs('src/shared/markdownOutline.ts');
const STATUS = loadTs('src/shared/ideStatus.ts');

/* ═══ 1. the chrome states facts, and reads them off the buffer ═══════════ */

test('line endings are counted from the buffer, and a file with both says so', () => {
  assert.equal(STATUS.detectLineEnding(''), 'none', 'a file with no newline has no line ending');
  assert.equal(STATUS.detectLineEnding('one line'), 'none');
  assert.equal(STATUS.detectLineEnding('a\nb\n'), 'LF');
  assert.equal(STATUS.detectLineEnding('a\r\nb\r\n'), 'CRLF');
  // The one a naive check gets wrong: it sees the first \r\n and says CRLF, or
  // sees a \n and says LF, and either way the person editing a file that will
  // produce a whitespace-only diff is not told.
  assert.equal(STATUS.detectLineEnding('a\r\nb\nc'), 'mixed');
});

test('lines and bytes are counted, never estimated', () => {
  assert.equal(STATUS.countLines('a\nb'), 2);
  assert.equal(STATUS.countLines('a\n'), 2, 'a trailing newline opens a line, the way the editor counts');
  assert.equal(STATUS.countLines(''), 1);
  // UTF-8, not `.length`. A file of emoji is not one byte per character, and
  // the status line sits next to a size the person can check.
  assert.equal(STATUS.utf8Bytes('abc'), 3);
  assert.equal(STATUS.utf8Bytes('€'), 3);
  assert.equal(STATUS.utf8Bytes('𝄞'), 4);
  assert.equal(STATUS.utf8Bytes('a€𝄞'), 8);
});

test('the language label follows the id the editor is actually using', () => {
  assert.equal(STATUS.languageLabel('typescript'), 'TypeScript');
  assert.equal(STATUS.languageLabel('plaintext'), 'Plain text');
  // Anything the table has never heard of comes back as itself, which is still
  // true. Inventing a pretty name for an unknown id is how a status line ends
  // up claiming a language the highlighter is not using.
  assert.equal(STATUS.languageLabel('brainfuck'), 'brainfuck');
  assert.match(panel, /languageId=\{languageForPath\(activeTab\.rel\)\}/,
    'the label must be built from the SAME id the editor highlights with');
});

test('the breadcrumb starts at the workspace and the folders are the parts that lead there', () => {
  const crumbs = STATUS.breadcrumb('/Users/me/proj', 'src/ide/IdePanel.tsx');
  assert.deepEqual(crumbs.map((c) => c.label), ['proj', 'src', 'ide', 'IdePanel.tsx']);
  assert.deepEqual(crumbs.map((c) => c.rel), ['', 'src', 'src/ide', null]);
  // A file at the root still gets a trail, because "which workspace" is half
  // the question the breadcrumb answers.
  assert.deepEqual(STATUS.breadcrumb('/a/b/work', 'README.md').map((c) => c.label), ['work', 'README.md']);
  assert.deepEqual(STATUS.breadcrumb('/a/b/work/', '').map((c) => c.label), ['work']);
});

test('the status line is rendered, and it is fed the live buffer and Monaco\'s own caret', () => {
  assert.match(panel, /<EditorStatusBar/);
  assert.match(panel, /content=\{buf\.content\}/, 'the status line must read the buffer on screen');
  assert.match(panel, /caret=\{caret\}/);
  assert.match(panel, /onCaret=\{setCaret\}/, 'the caret comes from the editor, not from a guess');
  assert.match(monaco, /editor\.onDidChangeCursorSelection/,
    'a caret reported only on cursor MOVE misses the selection');
  assert.match(monaco, /model\.getValueInRange\(sel\)\.length/, 'the selection size is measured');
  // A caret belongs to one file.
  assert.match(panel, /useEffect\(\(\) => \{ setCaret\(undefined\); setActiveHeading\(-1\); setJump\(null\); \}, \[activeKey\]\);/,
    'carrying a caret across a tab switch reports line 340 of a nine line file');
});

test('the unsaved indicator says which of four states it is in', () => {
  for (const key of ['ide.status.saving', 'ide.status.saveFailed', 'idePanel.saved', 'ide.status.unsaved', 'ide.status.onDisk']) {
    assert.ok(chrome.includes(`t('${key}')`), `the save chip never says ${key}`);
  }
  // A bullet after a filename is one symbol for four different situations.
  assert.match(chrome, /function SaveChip/);
  assert.match(panel, /saveState=\{buf\.saveState\}/);
});

test('the key sheet lists bindings that exist, and every label is a locale string', () => {
  const body = chrome.slice(chrome.indexOf('export function shortcutRows'), chrome.indexOf('export function ShortcutSheet'));
  const labels = [...body.matchAll(/t\('(ide\.keys\.[\w.]+)'\)/g)].map((m) => m[1]);
  assert.equal(labels.length, 10, 'the sheet grew or shrank; every row must be a real binding');
  assert.equal(new Set(labels).size, 10, 'a duplicated row');
  // The four this panel binds itself are bound in this panel.
  assert.match(panel, /if \(mod && \(e\.key === 's' \|\| e\.key === 'S'\)\)/, 'save');
  assert.match(panel, /if \(mod && !e\.shiftKey && \(e\.key === 'n' \|\| e\.key === 'N'\)\)/, 'new file');
  assert.match(panel, /if \(mod && !e\.shiftKey && \(e\.key === 'p' \|\| e\.key === 'P'\)\)/, 'find a file');
  assert.match(panel, /if \(mod && e\.shiftKey && \(e\.key === 'f' \|\| e\.key === 'F'\)\)/, 'find text');
  // ⌘W belongs to the application menu ("close window"). Shadowing it would
  // close a tab here and the whole window everywhere else.
  assert.ok(!/e\.key === 'w'/i.test(panel), 'the panel claims a key the app menu already owns');
});

test('Escape unwinds one layer at a time instead of closing the panel under an open dialog', () => {
  const esc = panel.slice(panel.indexOf("if (e.key === 'Escape')"), panel.indexOf("window.addEventListener('keydown', onKey)"));
  assert.match(esc, /if \(keysOpen\) \{ setKeysOpen\(false\); return; \}/);
  assert.match(esc, /if \(creatingIn !== null\) \{ setCreatingIn\(null\); return; \}/);
  // 0.5.3: Escape and the X button close through one function, which holds the rule.
  assert.match(esc, /requestClose\(\);/);
  assert.match(panel, /const requestClose = useCallback\(\(\) => \{ if \(!anyDirtyRef\.current\) setIdeOpen\(false\); \}/,
    'closing the IDE with unsaved work still has to be refused');
});

/* ═══ 2. creating a file, and the four awkward cases ══════════════════════ */

test('a plain name resolves to a path under the selected folder', () => {
  const r = NEW.checkNewFileName('src/ide', 'Thing.tsx');
  assert.equal(r.ok, true);
  assert.equal(r.rel, 'src/ide/Thing.tsx');
  assert.equal(r.parentRel, 'src/ide');
  assert.equal(r.name, 'Thing.tsx');
  assert.deepEqual(r.newDirs, [], 'nothing to create but the file');
  assert.deepEqual(r.notes, []);
  // And at the root, which is where `''` has to mean the workspace itself.
  assert.equal(NEW.checkNewFileName('', 'README.md').rel, 'README.md');
});

test('A SLASH IS A PATH, and the folders it implies are listed in the order they must be made', () => {
  const r = NEW.checkNewFileName('src', 'ide/deep/Thing.tsx');
  assert.equal(r.ok, true);
  assert.equal(r.rel, 'src/ide/deep/Thing.tsx');
  assert.equal(r.parentRel, 'src/ide/deep');
  // Outermost first: `fs:createFile` never makes a parent, and `fs:mkdir` is
  // deliberately not recursive, so the order is the whole point.
  assert.deepEqual(r.newDirs, ['src/ide', 'src/ide/deep']);
  assert.ok(r.notes.includes('nested'));
  // A slash with nothing after it names a folder, and this is a file field.
  assert.deepEqual(NEW.checkNewFileName('', 'docs/'), { ok: false, problem: 'folderNotFile' });
  assert.deepEqual(NEW.checkNewFileName('', 'a//b.ts'), { ok: false, problem: 'folderNotFile' });
});

test('NO EXTENSION IS A NOTE, NOT A REFUSAL: Dockerfile and .env are real files', () => {
  for (const name of ['Dockerfile', 'Makefile', 'LICENSE', '.env', 'notes.']) {
    const r = NEW.checkNewFileName('', name);
    assert.equal(r.ok, true, `${name} was refused`);
    assert.ok(r.notes.includes('noExtension'), `${name} should be flagged as extensionless`);
  }
  assert.ok(!NEW.checkNewFileName('', 'a.ts').notes.includes('noExtension'));
  assert.ok(!NEW.checkNewFileName('', '.env.local').notes.includes('noExtension'),
    'a leading dot is not an extension, but a second dot is');
  assert.ok(NEW.checkNewFileName('', '.env').notes.includes('hidden'));
});

test('the names that cannot become a create request each get their own reason', () => {
  const cases = [
    ['', 'empty'],
    ['   ', 'empty'],
    ['/etc/hosts', 'absolute'],
    ['\\etc\\hosts', 'absolute'],
    ['C:/Windows/x.txt', 'absolute'],
    ['../secret.txt', 'traversal'],
    ['a/../b.ts', 'traversal'],
    ['a/./b.ts', 'traversal'],
    ['a/ b.ts', 'spacePadded'],
    ['a /b.ts', 'spacePadded'],
    ['x\u0000y.ts', 'nullByte'],
    [`${'x'.repeat(300)}.ts`, 'tooLong']
  ];
  for (const [input, problem] of cases) {
    const r = NEW.checkNewFileName('src', input);
    assert.equal(r.ok, false, `${JSON.stringify(input)} was accepted`);
    assert.equal(r.problem, problem, `${JSON.stringify(input)} got the wrong reason`);
  }
  // Whitespace at the ENDS of what was typed is a typo, so it is trimmed
  // rather than thrown back; a space INSIDE a name is one people type on
  // purpose, and a space padding an inner folder step is neither.
  assert.equal(NEW.checkNewFileName('', 'notes.md  ').rel, 'notes.md');
  assert.equal(NEW.checkNewFileName('', '  leading.ts').rel, 'leading.ts');
  assert.equal(NEW.checkNewFileName('', 'my notes.md').rel, 'my notes.md');
});

test('an errno becomes a sentence, and permission is checked before "it is not there"', () => {
  assert.equal(NEW.explainCreateError('already exists'), 'exists');
  assert.equal(NEW.explainCreateError("EEXIST: file already exists, open '/x/a.ts'"), 'exists');
  assert.equal(NEW.explainCreateError('the folder above it does not exist'), 'noParent');
  assert.equal(NEW.explainCreateError("ENOENT: no such file or directory, open '/x/a.ts'"), 'noParent');
  // The trap: EACCES messages routinely mention a path that LOOKS missing, and
  // ordering the checks the other way tells a person to make a folder that is
  // already there and simply shut to them.
  assert.equal(NEW.explainCreateError("EACCES: permission denied, open '/x/a.ts'"), 'permission');
  assert.equal(NEW.explainCreateError('EPERM: operation not permitted'), 'permission');
  assert.equal(NEW.explainCreateError('EROFS: read-only file system'), 'readOnly');
  assert.equal(NEW.explainCreateError('ENOSPC: no space left on device'), 'noSpace');
  assert.equal(NEW.explainCreateError('path escapes root'), 'outsideRoot');
  assert.equal(NEW.explainCreateError('name starts or ends with a space'), 'nameRefused');
  // Anything unrecognised stays unrecognised rather than being filed under a
  // sentence that might be wrong. The dialog then shows the raw text.
  assert.equal(NEW.explainCreateError('the disk fell over'), 'unknown');
  assert.match(dialog, /if \(code === 'unknown'\) return raw;/,
    'an unrecognised failure must still reach the person');
});

test('every code and every refusal has a key, so none of them can render blank', () => {
  const codes = ['exists', 'noParent', 'permission', 'readOnly', 'outsideRoot', 'nameRefused', 'noSpace'];
  for (const c of codes) assert.equal(typeof NEW.CREATE_ERROR_KEYS[c], 'string', `no key for ${c}`);
  assert.equal(NEW.CREATE_ERROR_KEYS.unknown, undefined, 'unknown must not claim a canned sentence');
  const problems = ['empty', 'absolute', 'traversal', 'folderNotFile', 'nullByte', 'tooLong', 'spacePadded'];
  for (const p of problems) assert.equal(typeof NEW.NAME_PROBLEM_KEYS[p], 'string', `no key for ${p}`);
  for (const n of ['noExtension', 'nested', 'hidden']) {
    assert.equal(typeof NEW.NAME_NOTE_KEYS[n], 'string', `no key for ${n}`);
  }
});

test('CREATE GOES THROUGH THE REAL DOOR, folders first, and never through a write', () => {
  const mk = dialog.indexOf('window.cth.makeDir(root, dir)');
  const cf = dialog.indexOf('window.cth.createFile(root, check.rel)');
  assert.ok(mk > 0, 'the dialog does not make the folders a slash implies');
  assert.ok(cf > mk, 'the file is created before its folders exist');
  // `fs:createFile` opens `wx`, so it refuses rather than truncating. A
  // writeFile with empty content would silently empty an existing file, which
  // is exactly the failure the create path must never have.
  assert.ok(!dialog.includes('writeFile'), 'the dialog creates by writing, which truncates');
  // An "already exists" while making the PARENT folders is normal, not a
  // failure: the person typed a path through folders that partly exist.
  assert.match(dialog, /if \(!made\.ok && explainCreateError\(made\.error\) !== 'exists'\)/);
  // And the panel actually mounts it, and opens what it made.
  assert.match(panel, /<NewFileDialog/);
  assert.match(panel, /onCreated=\{onCreated\}/);
  assert.match(panel, /openEdit\(rel\);\s*setReveal\(\{ rel, line: 1, col: 1, length: 0, nonce: Date\.now\(\) \}\);/,
    'creating a file and leaving the person looking at a folder is half an action');
});

test('the taken name is caught before the click as well as after it', () => {
  assert.match(dialog, /window\.cth\.listDir\(root, targetFolder\)/, 'nothing reads the folder it will write into');
  assert.match(dialog, /const taken = check\.ok && siblings !== null && siblings\.has\(check\.name\);/);
  // Null is "not read yet" and must not warn either way, because a folder that
  // has not been listed is not an empty folder.
  assert.match(dialog, /setSiblings\(null\);/);
  assert.match(dialog, /disabled=\{!check\.ok \|\| taken \|\| busy\.kind === 'creating'\}/);
});

test('DELETE STILL MEANS TRASH. Nothing in the IDE may unlink', () => {
  // The policy this suite exists to keep. `fs:trash` is the only door, and it
  // goes to the OS bin, which is why there is no confirmation in front of it.
  const from = main.indexOf("ipcMain.handle('fs:trash'");
  const to = main.indexOf("ipcMain.handle('git:isRepo'", from);
  assert.ok(from > 0 && to > from, 'there is no fs:trash handler');
  assert.match(main.slice(from, to), /shell\.trashItem\(abs\)/, 'delete must go to the OS bin');
  for (const destructive of ['unlink', 'rmSync', 'rmdir']) {
    assert.ok(!main.slice(from, to).includes(destructive), `fs:trash calls ${destructive}`);
  }
  // Phase 8 added a create flow and a second search pane to this folder. Not
  // one file in it may reach for a permanent delete.
  for (const file of fs.readdirSync(path.join(ROOT, IDE))) {
    const src = read(`${IDE}/${file}`);
    for (const destructive of ['unlink', 'rmSync', 'rm -rf']) {
      assert.ok(!src.includes(destructive), `${file} calls ${destructive}`);
    }
  }
  assert.match(panel, /window\.cth\.trashPath\(root, rel\)/, 'the IDE lost its only recoverable delete');
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
  assert.match(en.fileTree.moveToBin, /[Bb]in/, 'the label must say where the file goes');
});

/* ═══ 3. two searches, two shapes, both bounded ═══════════════════════════ */

const tree = {
  '': [{ name: 'README.md', isDir: false }, { name: 'src', isDir: true }, { name: 'node_modules', isDir: true }, { name: '.git', isDir: true }],
  src: [{ name: 'a.ts', isDir: false }, { name: 'deep', isDir: true }],
  'src/deep': [{ name: 'b.ts', isDir: false }],
  node_modules: [{ name: 'junk.js', isDir: false }],
  '.git': [{ name: 'HEAD', isDir: false }]
};
const lister = (t) => async (rel) => (t[rel] ? { ok: true, entries: t[rel] } : { ok: false, error: 'ENOENT' });

test('the index is built through listDir alone, and skips what is never source', async () => {
  const ix = await INDEX.collectFiles(lister(tree));
  assert.deepEqual(ix.entries.map((e) => e.rel), ['README.md', 'src/a.ts', 'src/deep/b.ts']);
  assert.equal(ix.truncated, false);
  assert.equal(ix.dirsScanned, 3, 'node_modules and .git must never be listed at all');
  assert.deepEqual(ix.entries[2], { rel: 'src/deep/b.ts', name: 'b.ts', dir: 'src/deep' });
  // No invented IPC: the hook reaches for exactly the door the file tree uses
  // for the index, and main's matcher for the contents (5 Sep 2026: the two
  // panes became one hook, so both doors live here and nowhere else).
  const calls = [...searchHook.matchAll(/window\.cth\.(\w+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(calls)].sort(), ['listDir', 'searchFiles']);
});

test('a cut short index is a PREFIX of the tree, which is why the walk is breadth first', async () => {
  const capped = await INDEX.collectFiles(lister(tree), { maxFiles: 2 });
  assert.deepEqual(capped.entries.map((e) => e.rel), ['README.md', 'src/a.ts']);
  assert.equal(capped.truncated, true);
  // Depth first would spend the whole budget inside the first folder it walked
  // into and index nothing at the top, so a truncated list would be missing
  // exactly the files people look for by name.
  const dirs = await INDEX.collectFiles(lister(tree), { maxDirs: 2 });
  assert.equal(dirs.truncated, true);
  assert.deepEqual(dirs.entries.map((e) => e.rel), ['README.md', 'src/a.ts']);
  // An unreadable folder is not a failed index.
  const broken = await INDEX.collectFiles(lister({ '': tree[''], src: tree.src }));
  assert.equal(broken.entries.length, 2);
  assert.equal(broken.truncated, false);
});

test('a name match ranks the file people meant first, and says where it matched', () => {
  const entries = [
    { rel: 'a/notes.md', name: 'notes.md', dir: 'a' },
    { rel: 'b/notes.txt', name: 'notes.txt', dir: 'b' },
    { rel: 'notes/readme.md', name: 'readme.md', dir: 'notes' },
    { rel: 'x/my-notes.md', name: 'my-notes.md', dir: 'x' }
  ];
  const r = INDEX.matchNames(entries, 'notes');
  assert.deepEqual(r.matches.map((m) => m.rel),
    ['a/notes.md', 'b/notes.txt', 'x/my-notes.md', 'notes/readme.md'],
    'name beats path, prefix beats middle, shorter beats longer');
  assert.equal(r.total, 4);
  assert.equal(r.truncated, false);
  // The offsets are the matcher's own, so the highlight cannot disagree with
  // the reason the row is in the list.
  assert.deepEqual(
    r.matches.map((m) => [m.inName, m.start, m.length]),
    [[true, 0, 5], [true, 0, 5], [true, 3, 5], [false, 0, 5]]
  );
  assert.equal(INDEX.matchNames(entries, 'notes.md').matches[0].rel, 'a/notes.md',
    'an exact name is the best possible match');
  assert.deepEqual(INDEX.matchNames(entries, '   ').matches, [], 'an empty query matches nothing, not everything');
});

test('spaces are terms that must ALL appear, and a term across the slash marks nothing', () => {
  const entries = [
    { rel: 'src/ide/Panel.tsx', name: 'Panel.tsx', dir: 'src/ide' },
    { rel: 'docs/panel.md', name: 'panel.md', dir: 'docs' }
  ];
  assert.deepEqual(INDEX.matchNames(entries, 'ide panel').matches.map((m) => m.rel), ['src/ide/Panel.tsx']);
  assert.deepEqual(INDEX.matchNames(entries, 'docs panel').matches.map((m) => m.rel), ['docs/panel.md']);
  assert.deepEqual(INDEX.matchNames(entries, 'panel nothinghere').matches, []);
  // `ide/panel` is in the path and in neither piece the row draws, so there is
  // no honest place to put a highlight.
  const straddle = INDEX.matchNames(entries, 'ide/panel').matches[0];
  assert.equal(straddle.rel, 'src/ide/Panel.tsx');
  assert.equal(straddle.start, -1);
  assert.equal(straddle.length, 0);
});

test('A CAPPED LIST SAYS SO, and the pane prints both ceilings', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ rel: `d/f${i}.ts`, name: `f${i}.ts`, dir: 'd' }));
  const r = INDEX.matchNames(many, 'f', 5);
  assert.equal(r.matches.length, 5);
  assert.equal(r.total, 40, 'the count is what matched, not what was shown');
  assert.equal(r.truncated, true);
  assert.equal(INDEX.matchNames(many, 'f', 100).truncated, false);
  // 5 Sep 2026: the ceilings are the hook's figures now, printed by the one pane.
  assert.match(searchPane, /t\('ide\.find\.listTruncated', \{ shown: search\.names\.length, total: search\.namesTotal \}\)/);
  assert.match(searchPane, /t\('ide\.find\.indexTruncated', \{ n: search\.indexed \}\)/);
});

test('the name query is debounced; the contents query is debounced too, and Enter runs it at once', () => {
  // 5 Sep 2026 (0.4.11): the contents search used to demand Enter, because a
  // search per keystroke walks the disk for a prefix of what was meant. One
  // box now answers with names AND lines, so the contents search runs on a
  // longer debounce than the names do, and Enter still means now. What must
  // never change: a slow search that started first cannot land on top of a
  // fast one that started later.
  assert.match(searchHook, /export const NAME_DEBOUNCE_MS = \d+;/);
  assert.match(searchHook, /window\.setTimeout\(\(\) => setApplied\(query\), NAME_DEBOUNCE_MS\)/);
  assert.match(searchHook, /return \(\) => window\.clearTimeout\(id\);/, 'an undebounced timer fires for every keystroke');
  assert.match(searchHook, /export const TEXT_DEBOUNCE_MS = \d+;/);
  assert.match(searchHook, /const delay = pressed \? 0 : TEXT_DEBOUNCE_MS;/, 'Enter skips the wait, a keystroke does not');
  assert.match(searchHook, /if \(mine !== runId\.current\) return;/, 'only the newest run may write a result');
  assert.match(searchPane, /if \(e\.key === 'Enter'\) \{ e\.preventDefault\(\); setRun\(\(n\) => n \+ 1\); \}/);
  assert.ok(!/window\.cth\.searchFiles/.test(searchPane), 'the pane asks the hook, never main directly');
});

test('A CONTENTS HIT OPENS AT ITS LINE, and only in the file it was found in', () => {
  assert.match(panel, /setReveal\(\{ rel, line, col, length, nonce: Date\.now\(\) \}\)/,
    'without a fresh nonce, clicking the same hit twice does nothing');
  assert.match(panel, /reveal=\{reveal && reveal\.rel === activeTab\.rel \? reveal : undefined\}/,
    'one editor serves every tab, so an unguarded reveal jumps in the wrong file');
  // 5 Sep 2026: the row's door is named for what it carries, a hit with a line.
  assert.match(searchPane, /onOpenHit\(h\.rel, h\.line, h\.col, h\.length\)/, 'the line has to leave the row');
  assert.match(panel, /onOpenHit=\{openHit\}/);
  // A name hit has no line, so it opens the file and nothing more. Handing it
  // a line it does not have would put the caret somewhere invented. The one
  // pane has both doors, and NamePane no longer exists to be mounted.
  assert.match(searchPane, /onClick=\{\(\) => onOpen\(m\.rel\)\}/);
  assert.ok(!/NamePane/.test(panel), 'NamePane is gone; the Search tab answers with names too');
});

test('one pane answers with names and lines, and the three mode switch is gone', () => {
  // 5 Sep 2026 (0.4.11): "files · names · text" was three modes of one
  // column, and nothing said that names found a file and text found a line.
  // The tree is always the Explorer now, and Search is one box with two
  // sections. The guarantee that survives: a result list that is not showing
  // is not thrown away, which is the hook's state, not a pane's.
  assert.ok(!/'files' \| 'names' \| 'text'/.test(panel), 'the three mode switch is gone');
  assert.match(searchPane, /useWorkspaceSearch\(root, query, opts, run\)/);
  assert.match(searchPane, /t\('ide\.search\.sectionNames'\)/);
  assert.match(searchPane, /t\('ide\.search\.sectionText'\)/);
});

/* ═══ 4. markdown, read and reviewed ═════════════════════════════════════ */

const DOC = [
  '---',
  'title: Weekly review',
  '---',
  '',
  '# Top',
  '',
  'Setext heading',
  '==============',
  '',
  '```',
  '# not a heading',
  '```',
  '',
  '## Second ##',
  '',
  '> ### Quoted',
  '',
  'Under two',
  '---------'
].join('\n');

test('the outline finds every heading react-markdown renders, and no heading it does not', () => {
  const out = MD.markdownOutline(DOC);
  assert.deepEqual(out.map((e) => [e.level, e.text, e.line]), [
    [1, 'Top', 5],
    [1, 'Setext heading', 7],
    [2, 'Second', 14],
    [3, 'Quoted', 16],
    [2, 'Under two', 18]
  ]);
  // Front matter is the trap. A `---` on line one is YAML to every renderer in
  // use, and to a naive scanner the line after it is a setext heading
  // underlined by the closing `---`, so a report would open with a phantom
  // section called "title: Weekly review".
  assert.ok(!out.some((e) => e.text.includes('title')), 'the front matter became a heading');
  assert.ok(!out.some((e) => e.text.includes('not a heading')), 'a hash inside a fence is code');
  // A setext entry points at the TEXT, not at the underline, because that is
  // where a person editing it wants the caret.
  assert.equal(DOC.split('\n')[6], 'Setext heading');
});

test('a thematic break is not a heading, however much it looks like one', () => {
  assert.deepEqual(MD.markdownOutline('para\n\n---\n\nnext'), [], 'a rule after a blank line is a rule');
  assert.deepEqual(MD.markdownOutline('- item\n---\n'), [], 'a rule under a list item is a rule');
  assert.deepEqual(MD.markdownOutline('    # indented code\n').map((e) => e.text), []);
  assert.deepEqual(MD.markdownOutline('####### seven hashes\n').map((e) => e.text), []);
});

test('outline text is prose, and every id is unique so it can key a list', () => {
  const out = MD.markdownOutline('# The **bold** `code` [link](http://x) ![pic](y.png)\n\n# Same\n\n# Same\n');
  assert.equal(out[0].text, 'The bold code link pic');
  assert.deepEqual(out.map((e) => e.id), ['the-bold-code-link-pic', 'same', 'same-1']);
  assert.deepEqual(out.map((e) => e.index), [0, 1, 2], 'the index is the position among the rendered headings');
});

test('the review numbers are counted from the document, code and checkboxes included', () => {
  const src = [
    '# Title',
    '',
    'Some words here.',
    '',
    '- [x] done',
    '- [ ] todo',
    '',
    '```js',
    'code(); not(); prose();',
    '```'
  ].join('\n');
  const r = MD.markdownReview(src);
  assert.equal(r.headings, 1);
  assert.equal(r.codeBlocks, 1);
  assert.equal(r.tasksDone, 1);
  assert.equal(r.tasksTotal, 2);
  // Code is not prose and a checkbox is not a word. Counting either inflates
  // the estimate a reviewer is deciding on.
  assert.equal(r.words, 6, 'Title Some words here. done todo');
  assert.equal(r.readingMinutes, 1, 'a short note takes a minute, never zero');
  assert.equal(MD.markdownReview('').readingMinutes, 0, 'and an empty one has no estimate at all');
});

test('THE MARKDOWN MODE HAS AN OUTLINE, and its jump lands in BOTH halves', () => {
  assert.match(panel, /const outline = md \? markdownOutline\(buf\.content\) : \[\];/);
  assert.match(panel, /<OutlinePane/);
  // Scrolling the rendered page is half a jump. The other half is the source
  // line, which is what makes the same click work in code and split view.
  assert.match(panel, /setJump\(\{ index: entry\.index, nonce: Date\.now\(\) \}\);/);
  assert.match(panel, /setReveal\(\{ rel: activeTab\.rel, line: entry\.line, col: 1, length: 0, nonce: Date\.now\(\) \}\);/,
    'an outline that only scrolls the preview does nothing in code view');
  assert.match(panel, /<MarkdownBody/);
  assert.match(panel, /jump=\{jump\}/);
  assert.match(panel, /onActive=\{setActiveHeading\}/, 'an outline that cannot say where you are is a table of contents');
  // Source order and DOM order are the same document, so they are matched by
  // position, with a text fallback rather than a silent wrong jump.
  assert.match(review, /els\.length === list\.length \? els\[jump\.index\] \?\? null : null/);
  assert.match(review, /els\.find\(\(e\) => \(e\.textContent \?\? ''\)\.trim\(\) === want\)/);
  assert.match(review, /querySelectorAll\('h1,h2,h3,h4,h5,h6'\)/);
});

test('markdown opens rendered, and the empty outline explains itself', () => {
  assert.match(panel, /return 'preview';/, 'markdown in this app is read far more often than it is edited');
  assert.match(review, /t\('ide\.md\.noHeadings'\)/, 'a blank rail is not an answer');
  assert.match(review, /t\('ide\.md\.words'/);
  assert.match(review, /review\.readingMinutes > 0 &&/, 'an estimate of zero minutes is not an estimate');
});

/* ═══ 5. the strings ═════════════════════════════════════════════════════ */

test('every string phase 8 added exists in all three locales, with no dashes', () => {
  const keys = [
    'idePanel.emptyWhy', 'idePanel.emptyStep1', 'idePanel.emptyStep2', 'idePanel.emptyStep3',
    'idePanel.nothingOpen', 'idePanel.nothingOpenHow',
    'ide.status.pathLabel', 'ide.status.position', 'ide.status.selected', 'ide.status.lines',
    'ide.status.bytesTitle', 'ide.status.eolNone', 'ide.status.eolMixed', 'ide.status.eolMixedTitle',
    'ide.status.plainText', 'ide.status.unsaved', 'ide.status.saving', 'ide.status.saveFailed',
    'ide.status.onDisk', 'ide.status.loadingFile',
    'ide.keys.title', 'ide.keys.save', 'ide.keys.newFile', 'ide.keys.findFile', 'ide.keys.findText',
    'ide.keys.closeIde', 'ide.keys.findInFile', 'ide.keys.replace', 'ide.keys.palette',
    'ide.keys.goToLine', 'ide.keys.goToSymbol',
    'ide.create.title', 'ide.create.inFolder', 'ide.create.theWorkspace', 'ide.create.placeholder',
    'ide.create.willCreate', 'ide.create.willMakeFolders', 'ide.create.confirm', 'ide.create.creating',
    'ide.create.aimHere', 'ide.create.badEmpty', 'ide.create.badAbsolute', 'ide.create.badTraversal',
    'ide.create.badFolderNotFile', 'ide.create.badNullByte', 'ide.create.badTooLong',
    'ide.create.badSpacePadded', 'ide.create.noteNoExtension', 'ide.create.noteNested',
    'ide.create.noteHidden', 'ide.create.errExists', 'ide.create.errNoParent',
    'ide.create.errPermission', 'ide.create.errReadOnly', 'ide.create.errOutsideRoot',
    'ide.create.errNameRefused', 'ide.create.errNoSpace',
    'ide.find.names', 'ide.find.text', 'ide.find.namesTitle', 'ide.find.placeholder',
    'ide.find.reindex', 'ide.find.indexing', 'ide.find.indexed', 'ide.find.none', 'ide.find.count',
    'ide.find.indexTruncated', 'ide.find.listTruncated',
    'ide.md.outline', 'ide.md.outlineToggle', 'ide.md.noHeadings', 'ide.md.untitledHeading',
    'ide.md.words', 'ide.md.readingTime', 'ide.md.tasks'
  ];
  const get = (o, k) => k.split('.').reduce((a, p) => (a && typeof a === 'object' ? a[p] : undefined), o);
  const locales = {};
  for (const l of ['en', 'zh-CN', 'ar']) {
    locales[l] = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    for (const k of keys) assert.equal(typeof get(locales[l], k), 'string', `${l} is missing ${k}`);
  }
  for (const k of keys) {
    const v = get(locales.en, k);
    assert.ok(!/[—–]|(^| )-( |$)/.test(v), `${k} has a dash: ${v}`);
    assert.ok(!/coming soon|TODO|lorem/i.test(v), `${k} is a placeholder: ${v}`);
  }
  // The key names the constants point at have to be the keys that exist, or a
  // failed create renders an i18n key at the person.
  for (const key of [...Object.values(NEW.CREATE_ERROR_KEYS), ...Object.values(NEW.NAME_PROBLEM_KEYS), ...Object.values(NEW.NAME_NOTE_KEYS)]) {
    assert.equal(typeof get(locales.en, key), 'string', `${key} is referenced in code and missing from en`);
    assert.ok(keys.includes(key), `${key} is not covered by this sweep`);
  }
});

test('every interpolated string keeps its variables in all three locales', () => {
  const wanted = {
    'ide.status.position': ['col', 'line'],
    'ide.status.selected': ['n'],
    'ide.status.lines': ['n'],
    'ide.create.inFolder': ['folder'],
    'ide.create.willCreate': ['path'],
    'ide.create.willMakeFolders': ['folders'],
    'ide.create.errExists': ['folder'],
    'ide.create.errNoParent': ['folder'],
    'ide.create.errPermission': ['folder'],
    'ide.create.errReadOnly': ['folder'],
    'ide.find.indexed': ['n'],
    'ide.find.count': ['n'],
    'ide.find.indexTruncated': ['n'],
    'ide.find.listTruncated': ['shown', 'total'],
    'ide.md.words': ['n'],
    'ide.md.readingTime': ['n'],
    'ide.md.tasks': ['done', 'total']
  };
  const get = (o, k) => k.split('.').reduce((a, p) => (a && typeof a === 'object' ? a[p] : undefined), o);
  for (const l of ['en', 'zh-CN', 'ar']) {
    const loc = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    for (const [k, vars] of Object.entries(wanted)) {
      const got = [...String(get(loc, k)).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();
      assert.deepEqual(got, [...vars].sort(), `${l} ${k} lost or gained a variable`);
    }
  }
});

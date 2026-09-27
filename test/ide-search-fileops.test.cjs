'use strict';

/**
 * THE IDE'S NEW POWERS (0.4.9 phase 9): repo-wide search, and file operations.
 *
 * Search and the file operations are the first things in the app that let a
 * click in a tree CREATE, MOVE or DELETE something on disk, so most of this
 * file is about the guard rather than the feature. Every one of them takes a
 * root and a path relative to it, and `safeJoin` decides whether that pair is
 * allowed; the renderer is never trusted with an absolute path. These run
 * against a real temporary directory, because a structural test that greps for
 * the word `safeJoin` proves the call is written, not that it holds.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const M = loadTs('src/main/fs.ts');

/** A throwaway tree, with a sibling OUTSIDE the root to escape into. */
function fixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-ide-'));
  const root = path.join(base, 'workspace');
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.mkdirSync(path.join(root, 'node_modules', 'pkg'), { recursive: true });
  fs.mkdirSync(path.join(root, '.git'), { recursive: true });
  fs.mkdirSync(path.join(root, '.github'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'a.ts'), 'const needle = 1;\nconst other = 2;\nneedle();\n');
  fs.writeFileSync(path.join(root, 'src', 'b.ts'), '// no match here\nconst NEEDLE = 3;\n');
  fs.writeFileSync(path.join(root, 'node_modules', 'pkg', 'c.js'), 'needle everywhere\n');
  fs.writeFileSync(path.join(root, '.git', 'HEAD'), 'needle\n');
  fs.writeFileSync(path.join(root, '.github', 'ci.yml'), 'needle: true\n');
  fs.writeFileSync(path.join(root, 'bin.dat'), Buffer.from([0x6e, 0x00, 0x65, 0x65]));
  fs.writeFileSync(path.join(base, 'secret.txt'), 'needle outside the root\n');
  return { base, root };
}

const cleanup = (base) => fs.rmSync(base, { recursive: true, force: true });

/* ---- search ---------------------------------------------------------------- */

test('search finds every occurrence, with the line and column the editor needs', async () => {
  const { base, root } = fixture();
  try {
    const res = await M.searchInRoot(root, 'needle', { caseSensitive: true });
    assert.equal(res.ok, true);
    const rels = res.hits.map((h) => h.rel).sort();
    assert.deepEqual([...new Set(rels)].sort(), ['.github/ci.yml', 'src/a.ts']);
    const first = res.hits.find((h) => h.rel === 'src/a.ts');
    assert.equal(first.line, 1, 'lines are 1-based');
    assert.equal(first.col, 7, 'columns are 1-based');
    assert.equal(first.length, 6, 'the matcher reports what it matched');
    assert.equal(first.text, 'const needle = 1;', 'the whole line comes back for context');
    // Two hits in a.ts (line 1 and line 3), one in ci.yml.
    assert.equal(res.hits.filter((h) => h.rel === 'src/a.ts').length, 2);
  } finally { cleanup(base); }
});

test('the directories that are never source are skipped, and .github is not one of them', async () => {
  const { base, root } = fixture();
  try {
    const res = await M.searchInRoot(root, 'needle');
    const rels = new Set(res.hits.map((h) => h.rel));
    assert.ok(!rels.has('node_modules/pkg/c.js'), 'searched node_modules');
    assert.ok(![...rels].some((r) => r.startsWith('.git/')), 'searched .git');
    assert.ok(rels.has('.github/ci.yml'), 'a dot-directory that is not on the list must still be searched');
  } finally { cleanup(base); }
});

test('a binary file is not searched, however text-shaped its bytes look', async () => {
  const { base, root } = fixture();
  try {
    const res = await M.searchInRoot(root, 'n');
    assert.ok(!res.hits.some((h) => h.rel === 'bin.dat'), 'a null byte means not text');
  } finally { cleanup(base); }
});

test('a literal query is escaped, so a dot is a dot', async () => {
  const { base, root } = fixture();
  try {
    fs.writeFileSync(path.join(root, 'src', 'dots.ts'), 'a.b\naxb\n');
    const literal = await M.searchInRoot(root, 'a.b');
    assert.deepEqual(literal.hits.filter((h) => h.rel === 'src/dots.ts').map((h) => h.line), [1],
      'a literal search matched axb, which is the bug every naive search ships with');
    const rx = await M.searchInRoot(root, 'a.b', { regex: true });
    assert.deepEqual(rx.hits.filter((h) => h.rel === 'src/dots.ts').map((h) => h.line), [1, 2],
      'as a regex it must match both');
  } finally { cleanup(base); }
});

test('case and whole-word narrow the search the way their labels claim', async () => {
  const { base, root } = fixture();
  try {
    const insensitive = await M.searchInRoot(root, 'needle');
    assert.ok(insensitive.hits.some((h) => h.rel === 'src/b.ts'), 'NEEDLE should match by default');
    const sensitive = await M.searchInRoot(root, 'needle', { caseSensitive: true });
    assert.ok(!sensitive.hits.some((h) => h.rel === 'src/b.ts'));

    fs.writeFileSync(path.join(root, 'src', 'w.ts'), 'needles\nneedle\n');
    const word = await M.searchInRoot(root, 'needle', { wholeWord: true, caseSensitive: true });
    assert.deepEqual(word.hits.filter((h) => h.rel === 'src/w.ts').map((h) => h.line), [2]);
  } finally { cleanup(base); }
});

test('a bad regex is an answer, not a crash', async () => {
  const { base, root } = fixture();
  try {
    const res = await M.searchInRoot(root, '([unclosed', { regex: true });
    assert.equal(res.ok, false);
    assert.ok(res.error.length > 0);
  } finally { cleanup(base); }
});

test('a capped search says it is capped rather than passing a slice off as the whole', async () => {
  const { base, root } = fixture();
  try {
    fs.writeFileSync(path.join(root, 'src', 'many.ts'), 'x\n'.repeat(200));
    const res = await M.searchInRoot(root, 'x', { maxHits: 10 });
    assert.equal(res.hits.length, 10);
    assert.equal(res.truncated, true);
  } finally { cleanup(base); }
});

test('a zero-width match terminates instead of spinning forever', async () => {
  const { base, root } = fixture();
  try {
    // `a*` matches the empty string at every position. Without the lastIndex
    // bump this never returns, and the test times out rather than failing.
    const res = await M.searchInRoot(root, 'q*', { regex: true, maxHits: 50 });
    assert.equal(res.ok, true);
  } finally { cleanup(base); }
});

test('search cannot be pointed outside its root', async () => {
  const { base, root } = fixture();
  try {
    const res = await M.searchInRoot(root, 'needle');
    assert.ok(!res.hits.some((h) => h.rel.includes('secret')), 'the sibling file outside the root was read');
  } finally { cleanup(base); }
});

/* ---- file operations ------------------------------------------------------- */

test('a path that escapes the root is refused by every operation that writes', async () => {
  const { base, root } = fixture();
  try {
    const escapes = ['../secret.txt', '../../etc/hosts', 'src/../../secret.txt'];
    for (const rel of escapes) {
      assert.equal((await M.makeDirIn(root, rel)).ok, false, `mkdir ${rel}`);
      assert.equal((await M.createFileIn(root, rel)).ok, false, `create ${rel}`);
      assert.equal((await M.renameIn(root, 'src/a.ts', rel)).ok, false, `rename to ${rel}`);
      assert.equal((await M.renameIn(root, rel, 'src/z.ts')).ok, false, `rename from ${rel}`);
    }
    // The file outside is untouched and the file inside never moved.
    assert.equal(fs.readFileSync(path.join(base, 'secret.txt'), 'utf8'), 'needle outside the root\n');
    assert.ok(fs.existsSync(path.join(root, 'src', 'a.ts')));
  } finally { cleanup(base); }
});

test('nothing overwrites: creating or renaming onto something that exists fails', async () => {
  const { base, root } = fixture();
  try {
    const before = fs.readFileSync(path.join(root, 'src', 'a.ts'), 'utf8');
    const created = await M.createFileIn(root, 'src/a.ts');
    assert.equal(created.ok, false);
    assert.match(created.error, /exists/);
    assert.equal(fs.readFileSync(path.join(root, 'src', 'a.ts'), 'utf8'), before, 'the file was truncated');

    const dir = await M.makeDirIn(root, 'src');
    assert.equal(dir.ok, false, 'mkdir on an existing folder must not report success');

    const moved = await M.renameIn(root, 'src/a.ts', 'src/b.ts');
    assert.equal(moved.ok, false, 'POSIX rename would have silently deleted b.ts');
    assert.ok(fs.existsSync(path.join(root, 'src', 'b.ts')));
    assert.ok(fs.existsSync(path.join(root, 'src', 'a.ts')));
  } finally { cleanup(base); }
});

test('the names a file may not have are refused before the filesystem is asked', async () => {
  const { base, root } = fixture();
  try {
    for (const bad of ['', '   ', 'a/../b', 'a/./b', ' leading', 'trailing ', 'nul name']) {
      const r = await M.createFileIn(root, bad);
      assert.equal(r.ok, false, `created a file named ${JSON.stringify(bad)}`);
    }
  } finally { cleanup(base); }
});

test('the operations that should work, work', async () => {
  const { base, root } = fixture();
  try {
    assert.equal((await M.makeDirIn(root, 'src/deep')).ok, true);
    assert.ok(fs.statSync(path.join(root, 'src', 'deep')).isDirectory());

    assert.equal((await M.createFileIn(root, 'src/deep/new.ts')).ok, true);
    assert.equal(fs.readFileSync(path.join(root, 'src', 'deep', 'new.ts'), 'utf8'), '', 'a new file starts empty');

    const moved = await M.renameIn(root, 'src/deep/new.ts', 'src/deep/renamed.ts');
    assert.equal(moved.ok, true);
    assert.equal(moved.rel, 'src/deep/renamed.ts');
    assert.ok(!fs.existsSync(path.join(root, 'src', 'deep', 'new.ts')));
    assert.ok(fs.existsSync(path.join(root, 'src', 'deep', 'renamed.ts')));

    // Into a folder that does not exist is an error, not a tree of empty ones.
    assert.equal((await M.renameIn(root, 'src/deep/renamed.ts', 'nope/x.ts')).ok, false);
    assert.ok(!fs.existsSync(path.join(root, 'nope')));
  } finally { cleanup(base); }
});

/* ---- the wiring, and the one policy a test must not let anyone relax -------- */

test('DELETE MEANS TRASH. Nothing in the IDE path may unlink', () => {
  const main = strip(read('src/main/index.ts'));
  // Anchored on CODE, not on the section comment: `strip` has already removed
  // every comment, so slicing to one silently ran to the end of the file and
  // matched an `unlink` belonging to something else entirely.
  const from = main.indexOf("ipcMain.handle('fs:trash'");
  const to = main.indexOf("ipcMain.handle('git:isRepo'", from);
  assert.ok(from > 0 && to > from, 'there is no fs:trash handler');
  const handler = main.slice(from, to);
  assert.match(handler, /shell\.trashItem\(abs\)/, 'delete must go to the OS bin');
  // #337 replaced the lexical safeJoin with safeResolve, which canonicalizes and
  // refuses a symlink component as well as a `..`. Same policy, stronger guard.
  assert.match(handler, /await safeResolve\(root, rel\)/, 'the path is not confined');
  assert.match(handler, /that is the workspace itself/, 'trashing the root would take the workspace with it');
  for (const destructive of ['unlink', 'rmSync', 'rm(', 'rmdir']) {
    assert.ok(!handler.includes(destructive), `fs:trash calls ${destructive}; delete must be recoverable`);
  }
  // And the renderer has no other door to deletion.
  const pre = strip(read('src/preload/index.ts'));
  assert.match(pre, /trashPath: \(root: string, rel: string\)/);
  assert.ok(!/unlink|rmSync/.test(pre), 'the preload exposes a permanent delete');
});

test('every new IPC door validates its arguments before it reaches the filesystem', () => {
  const main = strip(read('src/main/index.ts'));
  for (const channel of ['fs:search', 'fs:mkdir', 'fs:createFile', 'fs:rename', 'fs:trash']) {
    const at = main.indexOf(`ipcMain.handle('${channel}'`);
    assert.ok(at > 0, `${channel} is not handled`);
    const body = main.slice(at, at + 900);
    assert.match(body, /typeof root !== 'string'/, `${channel} does not check its root`);
    assert.match(body, /invalid args/, `${channel} does not refuse bad arguments`);
  }
  // A query with no ceiling is a way to make main build a huge regex.
  assert.match(main.slice(main.indexOf("ipcMain.handle('fs:search'")), /query\.length > 1024/);
});

test('a search hit reveals only in the file it was found in', () => {
  const ide = strip(read('src/renderer/src/ide/IdePanel.tsx'));
  assert.match(ide, /reveal=\{reveal && reveal\.rel === activeTab\.rel \? reveal : undefined\}/,
    'one editor serves every tab, so an unguarded reveal jumps in the wrong file');
  assert.match(ide, /setReveal\(\{ rel, line, col, length, nonce: Date\.now\(\) \}\)/,
    'without a fresh nonce, clicking the same hit twice does nothing');
  const mon = strip(read('src/renderer/src/ide/MonacoEditor.tsx'));
  assert.match(mon, /revealLineInCenter/);
  assert.match(mon, /setSelection/, 'the hit should arrive highlighted');
});

test('switching workspace discards what belonged to the old root, and refuses while dirty', () => {
  const ide = strip(read('src/renderer/src/ide/IdePanel.tsx'));
  const fn = ide.slice(ide.indexOf('const switchTo = useCallback'), ide.indexOf('const openHit'));
  assert.ok(fn.length > 0, 'there is no switchTo');
  assert.match(fn, /if \(anyDirtyRef\.current \|\| next\.cwd === root\) return;/, 'an unsaved edit can be lost');
  // A tab is a path relative to its root; carrying one across opens a
  // different file with the same name.
  // 5 Sep 2026 (the 0.4.11 IDE redesign): the strip is never empty, so a
  // switch lands on a fresh home tab rather than on nothing. The old pin was
  // setTabs([]); the guarantee, that no tab of the old root survives, is the same.
  for (const reset of ['setTabs\\(\\[newHomeTab\\(\\)\\]\\)', 'setEditBuffers\\(\\{\\}\\)', 'setDiffData\\(\\{\\}\\)', 'setActiveKey\\(null\\)', 'setGitRoot\\(null\\)']) {
    assert.match(fn, new RegExp(reset), `switchTo does not reset ${reset}`);
  }
});

test('the tree owns the gesture and the panel owns the filesystem', () => {
  const tree = strip(read('src/renderer/src/components/FileTree.tsx'));
  // The tree must not reach for main itself, except to list a directory, which
  // is the one thing it did before any of this.
  const calls = [...tree.matchAll(/window\.cth\.(\w+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(calls)], ['listDir'], `the tree calls main directly: ${calls.join(', ')}`);
  assert.match(tree, /export interface FileTreeOps/);
  // Ops are optional: the tree is still a viewer without them.
  assert.match(tree, /ops\?: FileTreeOps/);
  assert.match(tree, /onContextMenu=\{ops \?/, 'the menu appears even when there is nothing it can do');
});

test('every string the IDE gained exists in all three locales, with no dashes', () => {
  const keys = [
    'ide.search.title', 'ide.search.placeholder', 'ide.search.run', 'ide.search.caseTitle',
    'ide.search.wordTitle', 'ide.search.regexTitle', 'ide.search.none', 'ide.search.count',
    'ide.search.truncated', 'ide.search.working',
    'fileTree.namePlaceholder', 'fileTree.newFile', 'fileTree.newFolder', 'fileTree.rename',
    'fileTree.copyPath', 'fileTree.moveToBin',
    'idePanel.switchWorkspace', 'idePanel.switchBlocked', 'idePanel.here'
  ];
  const get = (o, k) => k.split('.').reduce((a, p) => (a && typeof a === 'object' ? a[p] : undefined), o);
  for (const l of ['en', 'zh-CN', 'ar']) {
    const loc = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    for (const k of keys) assert.equal(typeof get(loc, k), 'string', `${l} is missing ${k}`);
  }
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
  for (const k of keys) {
    const v = get(en, k);
    assert.ok(!/[—–]|(^| )-( |$)/.test(v), `${k} has a dash: ${v}`);
  }
  // The counts are interpolated, so both names have to survive translation.
  for (const l of ['en', 'zh-CN', 'ar']) {
    const v = get(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)), 'ide.search.count');
    assert.match(v, /\{\{hits\}\}/, `${l} dropped hits`);
    assert.match(v, /\{\{files\}\}/, `${l} dropped files`);
  }
});

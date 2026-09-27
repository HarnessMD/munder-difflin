'use strict';

/**
 * 0.5.3, founder batch 2, I8: "the attachment button accepts PDFs, videos and
 * folders". The picker was openFile only with an Images filter first, so a
 * folder could never be chosen and a PDF or a video sat greyed out behind the
 * filter. The picker's options are a pure rule (shared/attachDialog) run here
 * per platform; the three composers and main are pinned to it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const A = loadTs('src/shared/attachDialog.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** What the picker lets a person choose before they touch any menu: the
 *  first filter is the one the panel opens with. */
const pickableAtOnce = (opts, file) => {
  if (!opts.properties.includes('openFile')) return false;
  const first = opts.filters?.[0];
  if (!first) return true;
  const ext = file.split('.').pop().toLowerCase();
  return first.extensions.includes('*') || first.extensions.includes(ext);
};
const OLD = { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Images', extensions: ['png', 'jpg'] }, { name: 'All Files', extensions: ['*'] }] };

test('a PDF and a video are pickable the moment the picker opens, on every platform (the old picker is the control)', () => {
  for (const file of ['brief.pdf', 'demo.mp4', 'call.mov']) {
    assert.equal(pickableAtOnce(OLD, file), false, `control: the old picker greyed out ${file}`);
    for (const platform of ['darwin', 'win32', 'linux']) {
      assert.equal(pickableAtOnce(A.attachDialogOptions(platform, 'any'), file), true, `${platform} any: ${file}`);
      assert.equal(pickableAtOnce(A.attachDialogOptions(platform, 'files'), file), true, `${platform} files: ${file}`);
    }
  }
  const names = A.ATTACH_FILTERS.map((f) => f.name);
  assert.deepEqual(names, ['All Files', 'Images', 'PDF', 'Videos'], 'the narrower filters stay, after the one that takes everything');
});

test('folders: in the one picker on the Mac, a picker of their own on Windows and Linux', () => {
  const mac = A.attachDialogOptions('darwin', 'any');
  assert.deepEqual(mac.properties, ['openFile', 'openDirectory', 'multiSelections']);
  for (const platform of ['win32', 'linux']) {
    const any = A.attachDialogOptions(platform, 'any');
    assert.ok(!any.properties.includes('openDirectory'), `${platform}: mixing would turn the picker into a folder picker`);
    const folders = A.attachDialogOptions(platform, 'folders');
    assert.deepEqual(folders.properties, ['openDirectory', 'multiSelections']);
    assert.equal(folders.filters, undefined);
  }
  assert.deepEqual(A.attachWants('darwin'), ['any'], 'one button on the Mac');
  assert.deepEqual(A.attachWants('win32'), ['files', 'folders'], 'two where one picker cannot take both');
  assert.deepEqual(A.attachWants('linux'), ['files', 'folders']);
  assert.deepEqual(A.attachWants(undefined), ['files', 'folders'], 'an unknown platform gets the two safe buttons');
});

test('a folder\'s name ends in a slash, so the chip and the message line say it is a folder', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attach-'));
  try {
    const sub = path.join(dir, 'screens');
    fs.mkdirSync(sub);
    const file = path.join(dir, 'brief.pdf');
    fs.writeFileSync(file, '%PDF');
    assert.equal(A.attachName(sub, fs.statSync(sub).isDirectory()), 'screens/');
    assert.equal(A.attachName(file, fs.statSync(file).isDirectory()), 'brief.pdf');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  assert.equal(A.attachName('C:\\Users\\me\\Designs\\', true), 'Designs/', 'a Windows path, trailing separator and all');
  assert.equal(A.attachName('/', true), '//', 'the root is still a folder');
});

test('only the three words a button sends are taken off the bridge', () => {
  assert.equal(A.asAttachWant('folders'), 'folders');
  assert.equal(A.asAttachWant('files'), 'files');
  for (const v of [undefined, null, 'rm -rf', 7, { want: 'folders' }]) assert.equal(A.asAttachWant(v), 'any');
});

test('main opens the picker from the rule, and names a folder by the rule', () => {
  const main = read('src/main/index.ts');
  const h = main.slice(main.indexOf("ipcMain.handle('dialog:attachFiles'"), main.indexOf("ipcMain.handle('clipboard:saveImage'"));
  assert.match(h, /dialog\.showOpenDialog\(win, attachDialogOptions\(process\.platform, asAttachWant\(want\)\)\)/);
  assert.match(h, /name: attachName\(p, isFolder\(p\)\)/);
  assert.doesNotMatch(h, /name: 'Images'/, 'no Images filter first any more');
  assert.match(read('src/preload/index.ts'), /ipcRenderer\.invoke\('dialog:attachFiles', want \?\? 'any'\)/);
});

test('every composer with an attach button draws one per kind the platform needs, and asks for that kind', () => {
  for (const f of ['src/renderer/src/components/pro/Composer.tsx', 'src/renderer/src/components/pro/AgentsScreen.tsx']) {
    const src = read(f);
    assert.match(src, /\{attachWants\(window\.cth\.platform\)\.map\(\(w\) => \(\n\s*<IconBtn key=\{w\} name=\{w === 'folders' \? 'folder' : 'clip'\} title=\{t\(ATTACH_TITLE\[w\]\)\} onClick=\{\(\) => \{ void attach\(w\); \}\} \/>/, f);
    assert.match(src, /const res = await window\.cth\.attachFiles\(want\);/, f);
  }
  const classic = read('src/renderer/src/components/MessageQueueComposer.tsx');
  assert.match(classic, /\{attachWants\(window\.cth\.platform\)\.map\(\(w\) => \(\n\s*<PixelButton key=\{w\} variant="secondary" size="sm" onClick=\{\(\) => \{ void pickFiles\(w\); \}\}>/);
  assert.match(classic, /const res = await window\.cth\.attachFiles\(want\);/);
  // No surface calls the picker the old way.
  for (const f of ['src/renderer/src/components/pro/Composer.tsx', 'src/renderer/src/components/pro/AgentsScreen.tsx', 'src/renderer/src/components/MessageQueueComposer.tsx']) {
    assert.doesNotMatch(read(f), /attachFiles\(\)/, f);
  }
});

test('strings in every language, no dashes', () => {
  for (const l of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    for (const v of [j.pro.agents.attachAny, j.pro.agents.attachFolder, j.queueComposer.folder]) {
      assert.ok(v && v.trim(), l);
      assert.doesNotMatch(v, /[–—]| - /, l);
    }
  }
  assert.doesNotMatch(read('src/shared/attachDialog.ts'), /[–—]| - /);
});

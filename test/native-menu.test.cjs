// Menu nativo traduzido via IPC (Task 10, fork pt-BR).
//
// O main nao tem i18n: o renderer empurra os 13 rotulos nativeMenu.* por
// menu:setLabels e o main reconstrói. Estes testes sao textuais (mesmo
// estilo de arabic-ui.test.cjs): o contrato que importa e o fio
// renderer -> preload -> main, nao o Electron em si.
'use strict';

const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\/[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');

const KEYS = ['file', 'edit', 'view', 'window', 'newFloor', 'undo', 'redo',
  'cut', 'copy', 'paste', 'selectAll', 'quit', 'close'];

test('preload exposes setMenuLabels over menu:setLabels', () => {
  const src = read('src/preload/index.ts');
  assert.match(src, /setMenuLabels: \(labels: Record<string, string>\)/,
    'preload must type the labels as a plain record (no locale coupling)');
  assert.match(src, /ipcRenderer\.invoke\('menu:setLabels', labels\)/,
    'preload must forward to the menu:setLabels channel');
});

test('main validates, stores and rebuilds on menu:setLabels', () => {
  const src = strip(read('src/main/index.ts'));
  assert.match(src, /ipcMain\.handle\('menu:setLabels'/, 'main must handle the channel');
  assert.match(src, /function isMenuLabels/, 'main must validate the pushed shape');
  assert.match(src, /length <= 60/, 'labels must be length-capped');
  assert.match(src, /if \(readConfig\(\)\.multiWindow\) installAppMenu/,
    'rebuild must respect the multiWindow flag (boot path parity)');
});

test('menu template consumes labels, keeps behavior', () => {
  const src = strip(read('src/main/index.ts'));
  for (const k of ['file', 'edit', 'newFloor', 'undo', 'quit', 'close', 'view', 'window']) {
    assert.match(src, new RegExp(`label: L\\.${k}\\b`), `template must use L.${k}`);
  }
  assert.ok(!/label: 'File'/.test(src) && !/label: 'Edit'/.test(src) && !/label: 'New Floor'/.test(src),
    'no hardcoded top-level English labels may remain');
  const accelFalse = (src.match(/registerAccelerator: false/g) || []).length;
  assert.equal(accelFalse, 6, `Edit keeps registerAccelerator:false x6 (dictation), found ${accelFalse}`);
  assert.match(src, /accelerator: 'CmdOrCtrl\+Shift\+N'/, 'New Floor shortcut must survive');
});

test('renderer pushes labels on boot and language switch', () => {
  const src = read('src/renderer/src/i18n/useMenuLabelsSync.ts');
  assert.match(src, /window\.cth\.setMenuLabels\(labels\)/, 'hook must push through the bridge');
  assert.match(src, /i18n\.on\('languageChanged', push\)/, 'hook must re-push on switch');
  const app = read('src/renderer/src/App.tsx');
  assert.match(app, /useMenuLabelsSync\(\)/, 'hook must be mounted near the root');
});

test('nativeMenu section exists with all 13 keys in every locale', () => {
  const loc = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
  const en = Object.keys(loc('en').nativeMenu ?? {});
  assert.deepEqual([...en].sort(), [...KEYS].sort(), 'en.nativeMenu must carry exactly the 13 keys');
  for (const l of ['pt-BR', 'zh-CN', 'ar']) {
    assert.deepEqual(Object.keys(loc(l).nativeMenu ?? {}).sort(), [...KEYS].sort(), `${l}.nativeMenu drifted`);
  }
  assert.equal(loc('pt-BR').nativeMenu.file, 'Arquivo', 'spot-check the pt-BR translation');
});

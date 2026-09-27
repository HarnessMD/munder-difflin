'use strict';

// 0.5.3, founder 25 Sep 2026, batch 2 #4: "Hold Option in agent message box
// works: Y (but when user has selected any other field other than the queue
// input area stapler should work for transcription like memory search.)"
//
// Inside our window a held Option went to Free Flow (the composer draft) or
// nowhere. Now the renderer says what has focus and exactly one listener takes
// the hold: a text field is dictated into by dictation from anywhere (paste at
// the cursor, Stapler eyes, meter, sounds), the composer and the terminal stay
// Free Flow's, a password field is nobody's. The rule runs for real here.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const F = loadTs('src/shared/dictationFocus.ts');

// A stand in for a DOM element: `inside` lists the selectors it sits within.
const el = (tagName, extra = {}, inside = []) => ({ tagName, ...extra, closest: (sel) => (inside.includes(sel) ? {} : null) });

test('what has focus: the composer, a field, a password, or nothing editable', () => {
  assert.equal(F.dictationFocusOf(el('TEXTAREA', {}, ['[data-freeflow-target]'])), 'composer');
  assert.equal(F.dictationFocusOf(el('TEXTAREA', {}, ['.xterm'])), 'composer', 'the terminal stays Free Flow\'s');
  assert.equal(F.dictationFocusOf(el('INPUT', { type: 'search' })), 'field', 'Memory search');
  assert.equal(F.dictationFocusOf(el('INPUT', { type: 'text' })), 'field', 'agent search, a Settings field');
  assert.equal(F.dictationFocusOf(el('INPUT', { type: '' })), 'field');
  assert.equal(F.dictationFocusOf(el('TEXTAREA')), 'field', 'notes, the Stapler card');
  assert.equal(F.dictationFocusOf(el('DIV', { isContentEditable: true })), 'field');
  assert.equal(F.dictationFocusOf(el('INPUT', { type: 'password' })), 'password');
  assert.equal(F.dictationFocusOf(el('INPUT', { type: 'checkbox' })), 'other');
  assert.equal(F.dictationFocusOf(el('INPUT', { type: 'text', readOnly: true })), 'other');
  assert.equal(F.dictationFocusOf(el('TEXTAREA', { disabled: true })), 'other');
  assert.equal(F.dictationFocusOf(el('BUTTON')), 'other');
  assert.equal(F.dictationFocusOf(null), 'other');
});

test('exactly one listener takes a hold, whatever has focus and whether Free Flow is on', () => {
  for (const focus of ['composer', 'field', 'password', 'other']) {
    for (const freeflow of [true, false]) {
      const anyApp = !F.anyAppStandsAside(freeflow, focus);
      const ff = freeflow && F.freeflowTakesHold(focus);
      const takers = Number(anyApp) + Number(ff);
      if (focus === 'password') assert.equal(takers, 0, 'a password field got dictation');
      else assert.equal(takers, 1, `${focus}, Free Flow ${freeflow}: ${takers} listeners took the hold`);
    }
  }
  assert.equal(F.anyAppStandsAside(true, 'field'), false, 'Memory search with Free Flow on: dictation from anywhere types into it');
  assert.equal(F.anyAppStandsAside(true, 'composer'), true, 'the composer keeps Free Flow');
});

test('main asks the rule with what the main window\'s renderer last said', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /ipcMain\.on\('dictation:focus', \(e, focus: unknown\) => \{\n\s+if \(!mainWindow \|\| e\.sender !== mainWindow\.webContents\) return;/, 'only the main window may say what has focus');
  assert.match(main, /if \(!focused \|\| focused !== mainWindow\) return false;\n(\s+\/\/[^\n]*\n)*\s+return anyAppStandsAside\(true, mainDictationFocus\);/);
  assert.match(read('src/preload/index.ts'), /dictationFocus: \(focus: 'composer' \| 'field' \| 'password' \| 'other'\): void => \{ ipcRenderer\.send\('dictation:focus', focus\); \}/);
});

test('Free Flow stands aside in a field, tells main on every focus change, and the composers are marked', () => {
  const hold = read('src/renderer/src/freeflow/holdOption.ts');
  assert.match(hold, /if \(isOptionKey\(e\)\) \{\n\s+if \(e\.repeat \|\| optionDown\) return;[^\n]*\n(\s+\/\/[^\n]*\n)+\s+if \(!freeflowTakesHold\(dictationFocusOf\(document\.activeElement as FocusTarget \| null\)\)\) return;/);
  assert.match(hold, /document\.addEventListener\('focusin', tellFocus, true\);/);
  assert.match(hold, /document\.addEventListener\('focusout', onFocusOut, true\);/);
  assert.match(hold, /document\.removeEventListener\('focusout', onFocusOut, true\);/);
  assert.match(read('src/renderer/src/components/pro/Composer.tsx'), /<textarea\n\s+ref=\{ref\}\n\s+data-freeflow-target/);
  assert.match(read('src/renderer/src/components/MessageQueueComposer.tsx'), /<textarea\n\s+ref=\{boxRef\}\n\s+data-freeflow-target/);
});

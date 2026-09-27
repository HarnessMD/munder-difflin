/**
 * Find and replace in an open IDE file (0.5.3, founder ask 25 Sep).
 *
 * The bar is Monaco's own find widget; ideFind.ts decides when the IDE opens it
 * for a key Monaco did not hear (the caret on the tree or a tab). Tests 1 to 6
 * RUN that rule, test 5 through a real EventTarget with dispatched events.
 * Test 7 is text: it checks the panel and the editor hand the rule the real
 * things, and that the theme dresses the widget.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const F = loadTs('src/renderer/src/ide/ideFind.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const key = (k, mods = {}) => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });
const MAC = true, PC = false;

/** A stand in editor that writes down what was done to it. */
function fakeEditor({ focused = false } = {}) {
  const log = [];
  return {
    log,
    hasWidgetFocus: () => focused,
    focus: () => log.push('focus'),
    getAction: (id) => ({ run: () => log.push(id) })
  };
}
const deps = (over = {}) => ({ editor: () => fakeEditor(), inIde: () => true, covered: () => false, mac: MAC, ...over });

test('1. the chords are the platform\'s, and the same ones Monaco binds in the text', () => {
  assert.equal(F.findChordFor(key('f', { metaKey: true }), MAC), 'find');
  assert.equal(F.findChordFor(key('ƒ', { metaKey: true, altKey: true, code: 'KeyF' }), MAC), 'replace', 'Option turns f into ƒ, the physical key still counts');
  assert.equal(F.findChordFor(key('f', { ctrlKey: true }), PC), 'find');
  assert.equal(F.findChordFor(key('h', { ctrlKey: true }), PC), 'replace');
  assert.equal(F.findChordFor(key('F', { metaKey: true }), MAC), 'find', 'caps lock is not a different key');
});

test('2. not a find chord: the wrong modifier, Shift (the workspace search), or another letter', () => {
  assert.equal(F.findChordFor(key('f', { ctrlKey: true }), MAC), null, 'Control F on a Mac is forward a character');
  assert.equal(F.findChordFor(key('f', { metaKey: true }), PC), null);
  assert.equal(F.findChordFor(key('f', { metaKey: true, shiftKey: true }), MAC), null, '⇧⌘F is the sidebar search');
  assert.equal(F.findChordFor(key('f', { ctrlKey: true, shiftKey: true }), PC), null);
  assert.equal(F.findChordFor(key('h', { metaKey: true }), MAC), null, '⌘H hides the app on a Mac');
  assert.equal(F.findChordFor(key('f', { ctrlKey: true, altKey: true }), PC), null);
  assert.equal(F.findChordFor(key('g', { metaKey: true }), MAC), null);
  assert.equal(F.findChordFor(key('f'), MAC), null);
});

test('3. outside the text, the chord focuses the editor and runs Monaco\'s own find or find and replace', () => {
  const ed = fakeEditor();
  assert.equal(F.routeFindKey(key('f', { metaKey: true }), deps({ editor: () => ed })), true);
  assert.deepEqual(ed.log, ['focus', 'actions.find']);
  const ed2 = fakeEditor();
  assert.equal(F.routeFindKey(key('h', { ctrlKey: true }), deps({ editor: () => ed2, mac: PC })), true);
  assert.deepEqual(ed2.log, ['focus', 'editor.action.startFindReplaceAction']);
});

test('4. left alone: Monaco already has it, focus is outside the IDE, a modal is up, or there is no text', () => {
  const chord = key('f', { metaKey: true });
  const ed = fakeEditor({ focused: true });
  assert.equal(F.routeFindKey(chord, deps({ editor: () => ed })), false, 'the caret or the find box is in the editor');
  assert.deepEqual(ed.log, []);
  assert.equal(F.routeFindKey({ ...chord, defaultPrevented: true }, deps()), false, 'Monaco handled it');
  assert.equal(F.routeFindKey(chord, deps({ inIde: () => false })), false, 'focus is somewhere else');
  assert.equal(F.routeFindKey(chord, deps({ covered: () => true })), false, 'Settings is over the IDE');
  assert.equal(F.routeFindKey(chord, deps({ editor: () => null })), false, 'an image or a markdown preview');
  assert.equal(F.routeFindKey(key('f', { metaKey: true, shiftKey: true }), deps()), false);
});

test('5. through a real listener: the chord is kept from what else listens, any other key passes', () => {
  const target = new EventTarget();
  const ed = fakeEditor();
  const later = [];
  target.addEventListener('keydown', (e) => { if (F.routeFindKey(e, deps({ editor: () => ed }))) e.preventDefault(); });
  target.addEventListener('keydown', (e) => { if (!e.defaultPrevented) later.push(e.key); });
  const fire = (k, mods) => {
    const ev = new Event('keydown', { cancelable: true });
    Object.assign(ev, key(k, mods));
    target.dispatchEvent(ev);
    return ev;
  };
  assert.equal(fire('f', { metaKey: true }).defaultPrevented, true);
  assert.equal(fire('s', { metaKey: true }).defaultPrevented, false);
  assert.deepEqual(later, ['s']);
  assert.deepEqual(ed.log, ['focus', 'actions.find']);
});

test('6. a missing action does not throw', () => {
  const ed = { hasWidgetFocus: () => false, focus: () => {}, getAction: () => null };
  assert.equal(F.routeFindKey(key('f', { metaKey: true }), deps({ editor: () => ed })), true);
});

test('7. the panel and the editor hand the rule the real things; the theme dresses the widget', () => {
  const panel = read('src/renderer/src/ide/IdePanel.tsx');
  assert.match(panel, /routeFindKey\(e, \{/);
  assert.match(panel, /coveredAboveIde\(document, window\)/);
  assert.match(panel, /panelRef\.current\?\.contains\(a\)/);
  assert.match(panel, /getDomNode\(\)\?\.isConnected/, 'a stale editor from a closed tab is not used');
  assert.match(panel, /onEditor=\{\(ed\) => \{ findEditorRef\.current = ed; \}\}/);
  // The find rule runs before Escape's close: the find box's Esc is Monaco's.
  assert.ok(panel.indexOf('routeFindKey(e') < panel.indexOf("e.key === 'Escape'"));
  const ed = read('src/renderer/src/ide/MonacoEditor.tsx');
  assert.match(ed, /onEditorRef\.current\?\.\(editor\)/);
  assert.match(ed, /onEditorRef\.current\?\.\(null\)/);
  // Arabic: Monaco under dir=rtl drew no code and mirrored the bar into itself.
  assert.match(ed, /wrapperProps=\{\{ dir: 'ltr' \}\}/);
  assert.match(read('src/renderer/src/ide/MonacoDiff.tsx'), /wrapperProps=\{\{ dir: 'ltr' \}\}/);
  const theme = read('src/renderer/src/ide/monaco.ts');
  for (const k of ['editorWidget.border', 'input.background', 'inputOption.activeBorder', 'editor.findMatchBackground', 'editor.findMatchHighlightBackground', 'focusBorder']) {
    assert.ok(theme.includes(`'${k}'`), `${k} is themed from the tokens`);
  }
});

/**
 * One shortcut opens the IDE from any screen (0.5.3, fix list feature 23).
 *
 * THE KEY IS ⌘I, Ctrl+I on Windows and Linux. Picked, not defaulted to:
 *  - a LETTER, because the table's other chords are punctuation and `\` and
 *    `;` need Shift or Alt on German, French and Nordic layouts, where a chord
 *    that forbids Shift and Alt cannot be typed at all;
 *  - not E: Ctrl+E is end of line in every shell, and on Windows and Linux the
 *    chord is Ctrl, so it would have taken a key people press all day inside
 *    the terminals this app is made of;
 *  - I is free: no menu accelerator, no listener, nothing in the IDE's own keys.
 *
 * It OPENS and never closes. Inside an open IDE ⌘I belongs to the editor
 * (trigger suggest), and Escape already closes the panel.
 *
 * REWRITTEN IN THE 0.5.3 REVIEW (Creed's findings 7, 12, 16 and 26 against
 * commit 6764fbb2). Test 1 used to pin Control I as correct ON EVERY PLATFORM,
 * so the suite defended a fault, and tests 3, 4 and 5 read source text and
 * passed with the behaviour broken. Tests 1 to 9 now RUN the code: a real
 * EventTarget, a real listener, real dispatched events. Test 10 is the only
 * text left, and it only checks that the app hands the rules the real window.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const K = loadTs('src/renderer/src/components/pro/proKeys.ts');
const R = loadTs('src/renderer/src/ide/ideShortcutRules.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const key = (k, mods = {}) => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });
const MAC = true, PC = false;

test('1. the modifier is the platform\'s: Command on macOS, Control elsewhere, and never the other one', () => {
  assert.equal(K.proChordFor(key('i', { metaKey: true }), MAC), 'ide');
  assert.equal(K.proChordFor(key('i', { ctrlKey: true }), PC), 'ide');
  assert.equal(K.proChordFor(key('i', { ctrlKey: true }), MAC), null, 'Control I on a Mac is Tab to readline and jump forward in vim');
  assert.equal(K.proChordFor(key('\\', { ctrlKey: true }), MAC), null, 'Control \\ on a Mac is SIGQUIT');
  assert.equal(K.proChordFor(key('i', { metaKey: true }), PC), null, 'the Windows key is the OS\'s');
  assert.equal(K.proChordFor(key('i', { metaKey: true, ctrlKey: true }), MAC), null);
  assert.equal(K.proChordFor(key('I', { metaKey: true }), MAC), 'ide', 'caps lock on is still the same chord');
  assert.equal(K.proChordFor(key('i'), MAC), null, 'a bare i is typing');
  assert.equal(K.proChordFor(key('i', { metaKey: true, shiftKey: true }), MAC), null);
  assert.equal(K.proChordFor(key('i', { metaKey: true, altKey: true }), MAC), null);
  assert.equal(K.CHORD_HINT.ide, '⌘I');
});

test('2. it opens a closed IDE and leaves an open one alone, so the editor keeps its own chord', () => {
  assert.equal(K.opensIde(key('i', { metaKey: true }), false, MAC), true);
  assert.equal(K.opensIde(key('i', { metaKey: true }), true, MAC), false);
  assert.equal(K.opensIde(key('k', { metaKey: true }), false, MAC), false);
});

test('3. a keydown with no key is not a chord and does not throw (it threw inside a window listener and inside xterm)', () => {
  for (const e of [{ metaKey: true }, { key: undefined, metaKey: true }, { key: '', metaKey: true }, { key: null, ctrlKey: true }]) {
    assert.doesNotThrow(() => K.proChordFor(e, MAC));
    assert.equal(K.proChordFor(e, MAC), null);
    assert.equal(K.proChordFor(e, PC), null);
  }
});

test('4. Arabic and Russian layouts: the key types a letter that is not ASCII, so the physical key is read instead', () => {
  assert.equal(K.proChordFor(key('ه', { metaKey: true, code: 'KeyI' }), MAC), 'ide', 'the app ships an Arabic locale');
  assert.equal(K.proChordFor(key('ш', { ctrlKey: true, code: 'KeyI' }), PC), 'ide');
  assert.equal(K.proChordFor(key('و', { metaKey: true, code: 'Comma' }), MAC), 'settings', 'the comma key is an Arabic letter too');
  assert.equal(K.proChordFor(key('ز', { metaKey: true, code: 'Period' }), MAC), 'agentConfig');
  assert.equal(K.proChordFor(key('ه', { metaKey: true }), MAC), null, 'no code, no guess');
  // Dvorak: the key in the I position types c. ASCII never falls back, or Command C would open the IDE.
  assert.equal(K.proChordFor(key('c', { metaKey: true, code: 'KeyI' }), MAC), null);
  // Dvorak's own I (physical G) is the chord, because that is the key the hint names.
  assert.equal(K.proChordFor(key('i', { metaKey: true, code: 'KeyG' }), MAC), 'ide');
});

/** A real EventTarget with the real listener on it, and a real dispatched event. */
function rig({ open = false, covered = false, mac = MAC } = {}) {
  const win = new EventTarget();
  const state = { open, covered, opened: 0 };
  const off = R.installIdeShortcut(win, { isOpen: () => state.open, open: () => { state.opened++; state.open = true; }, covered: () => state.covered, mac });
  const press = (k, mods = {}) => {
    const e = new Event('keydown', { cancelable: true });
    Object.assign(e, key(k, mods));
    win.dispatchEvent(e);
    return e.defaultPrevented;
  };
  return { state, press, off };
}

test('5. RUN: the chord opens the IDE once and is consumed; a second press with it open is left to the editor', () => {
  const r = rig();
  assert.equal(r.press('i', { metaKey: true }), true, 'consumed');
  assert.deepEqual([r.state.opened, r.state.open], [1, true]);
  assert.equal(r.press('i', { metaKey: true }), false, 'not consumed: the editor\'s trigger suggest gets it');
  assert.equal(r.state.opened, 1);
});

test('6. RUN: Control I on macOS opens nothing and is not consumed; other keys and keyless events pass through', () => {
  const r = rig();
  assert.equal(r.press('i', { ctrlKey: true }), false);
  assert.equal(r.press('k', { metaKey: true }), false);
  assert.equal(r.press(undefined, { metaKey: true }), false);
  assert.equal(r.state.opened, 0);
  const pc = rig({ mac: PC });
  assert.equal(pc.press('i', { ctrlKey: true }), true);
  assert.equal(pc.state.opened, 1);
});

test('7. RUN: with a modal up the chord does NOTHING, and after detach the listener is gone', () => {
  const r = rig({ covered: true });
  assert.equal(r.press('i', { metaKey: true }), false, 'an IDE opened under Settings is invisible with live Command S, N and P');
  assert.equal(r.state.opened, 0);
  r.state.covered = false;
  assert.equal(r.press('i', { metaKey: true }), true);
  const d = rig(); d.off();
  assert.equal(d.press('i', { metaKey: true }), false);
  assert.equal(d.state.opened, 0);
});

test('8. RUN: the terminal keeps the key from the CLI only when that same keydown opens the IDE', () => {
  const deps = (o) => ({ isOpen: () => !!o.open, open: () => {}, covered: () => !!o.covered, mac: o.mac });
  assert.equal(R.ideChordOpens(key('i', { ctrlKey: true }), deps({ mac: PC })), true, 'Ctrl+I is Tab: the agent must not get a Tab as the IDE opens');
  assert.equal(R.ideChordOpens(key('i', { ctrlKey: true }), deps({ mac: MAC })), false, 'on a Mac, Control I is the terminal\'s');
  assert.equal(R.ideChordOpens(key('i', { ctrlKey: true }), deps({ mac: PC, open: true })), false, 'IDE already open: nothing to yield to');
  assert.equal(R.ideChordOpens(key('i', { ctrlKey: true }), deps({ mac: PC, covered: true })), false, 'modal up: the listener ignores it, so the terminal keeps it');
});

test('9. RUN: what counts as "covered": fixed, above the IDE, and most of the window. A tooltip or the IDE itself does not', () => {
  const win = (styles) => ({ innerWidth: 1000, innerHeight: 800, getComputedStyle: (el) => styles.get(el) ?? { position: 'static', zIndex: 'auto' } });
  const el = (parent, w, h) => ({ parentElement: parent, getBoundingClientRect: () => ({ width: w, height: h }) });
  const overlay = el(null, 1000, 800); const dialog = el(overlay, 400, 300); const button = el(dialog, 80, 30);
  const covered = (z, target = overlay) => R.coveredAboveIde({ elementsFromPoint: () => [button] }, win(new Map([[target, { position: 'fixed', zIndex: String(z) }]])));
  assert.equal(covered(300), true, 'Settings: the hit is a button, the fixed overlay is two parents up');
  assert.equal(covered(290), false, 'the IDE\'s own level is not above it');
  assert.equal(covered(100), false, 'the titlebar');
  assert.equal(covered(9999, dialog), false, 'a small fixed thing above the centre (a tooltip, a menu) is not a modal');
  assert.equal(R.coveredAboveIde({ elementsFromPoint: () => [] }, win(new Map())), false);
  assert.equal(R.coveredAboveIde({ elementsFromPoint: () => { throw new Error('no layout'); } }, win(new Map())), false);
  assert.equal(R.IDE_Z_INDEX, 290);
});

test('9b. RUN: the panel takes the keyboard from the terminal when it opens and gives it back when it closes', () => {
  const log = [];
  const doc = { body: {}, activeElement: null };
  const mk = (name, focusable = true) => ({ name, isConnected: true, focus() { if (focusable) { doc.activeElement = this; } log.push(`focus:${name}`); }, blur() { doc.activeElement = doc.body; log.push(`blur:${name}`); } });
  const xterm = mk('xterm'); const panel = mk('panel');
  doc.activeElement = xterm;
  const restore = R.takeFocusForPanel(panel, doc);
  assert.equal(doc.activeElement, panel, 'typed text and Escape now go to the panel, not to the CLI under it');
  restore();
  assert.equal(doc.activeElement, xterm, 'closing hands the keyboard back');
  // A root that cannot take focus must still not leave the keyboard in the terminal.
  doc.activeElement = xterm;
  R.takeFocusForPanel(mk('stubborn', false), doc);
  assert.equal(doc.activeElement, doc.body);
  // The terminal was closed while the IDE was open: nothing to give focus back to.
  doc.activeElement = xterm; const back = R.takeFocusForPanel(panel, doc); xterm.isConnected = false; log.length = 0; back();
  assert.deepEqual(log, []);
  assert.doesNotThrow(() => R.takeFocusForPanel(null, doc)());
});

test('10. the app hands the rules the real window: mounted beside the panel in App, the panel focusable, the terminal asking the same question', () => {
  const app = read('src/renderer/src/App.tsx');
  assert.match(app, /<IdeShortcut \/>\s*\n\s*\{ideOpen && <IdePanel \/>\}/, 'mounted anywhere else it misses Classic, or fires behind the sign in wall');
  const sc = read('src/renderer/src/ide/IdeShortcut.tsx');
  assert.match(sc, /installIdeShortcut\(window, \{/);
  assert.match(sc, /covered: \(\) => coveredAboveIde\(document, window\)/);
  const panel = read('src/renderer/src/ide/IdePanel.tsx');
  assert.match(panel, /useEffect\(\(\) => takeFocusForPanel\(panelRef\.current, document\), \[\]\);/);
  assert.match(panel, /<div ref=\{panelRef\} tabIndex=\{-1\} data-ide-panel/);
  assert.match(panel, /zIndex: IDE_Z_INDEX,/);
  const pool = read('src/renderer/src/components/terminalPool.ts');
  assert.match(pool, /if \(ideChordOpens\(ev, \{/);
  assert.doesNotMatch(pool, /proChordFor\(ev\) === 'ide'/, 'that swallowed Control I on macOS and the chord with the IDE open');
  assert.match(read('src/renderer/src/components/pro/AgentScreen.tsx'), /CHORD_HINT\.ide/);
  assert.match(read('src/renderer/src/components/pro/GodScreen.tsx'), /CHORD_HINT\.ide/);
});

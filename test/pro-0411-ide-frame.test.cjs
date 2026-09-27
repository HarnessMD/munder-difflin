// 0.4.11, the IDE redesign (founder approved hive/shared/design/app-v2/
// ide-prototype.html on 5 Sep 2026; plan at ide-build-plan.md). This file
// pins the FRAME, IdePanel.tsx; the pieces have their own files
// (pro-0411-ide-tabs, pro-0411-ide-search, pro-0411-ide-sidebar).
//
// The contract:
//   1. Nothing open is a place: the strip always holds a home tab, the last
//      tab out is replaced by one, and the + opens another.
//   2. One search. The frame mounts QuickOpen in the top bar (⌘P) and the
//      Search tab in the sidebar (⇧⌘F); NamePane is gone and no "files ·
//      names · text" control remains.
//   3. Three sidebar tabs, all three panes stay mounted, the tree carries the
//      git letters as badges from the same changed list the Source tab reads.
//   4. The chrome is the PRO kit's: no pixel display font anywhere in the
//      IDE, and every PRO only token carries a Classic fallback.
//   5. Esc unwinds one layer at a time; ⌘W is NOT bound (the app menu owns it).
//   6. Every string the frame adds exists in all three locales without a dash.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const IDE = 'src/renderer/src/ide';
const panel = read(`${IDE}/IdePanel.tsx`);
const icons = read(`${IDE}/ideIcons.tsx`);
const code = panel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const DASH = /[–—]|\s-\s/;

test('1. the strip always holds a home tab, and the + opens another', () => {
  assert.match(panel, /useState<Tab\[\]>\(\(\) => \[newHomeTab\(\)\]\)/, 'opens on a home tab');
  assert.match(panel, /if \(remaining\.length === 0\) remaining = \[newHomeTab\(\)\];/, 'the last tab out is replaced by home');
  assert.match(panel, /const openHome = useCallback\(/);
  assert.match(panel, /onNewHome=\{openHome\}/, 'the + on the strip opens a home tab');
  assert.match(panel, /activeTab\?\.mode === 'home' && \(\s*<HomeTab/, 'the home tab renders HomeTab');
  // A switch of workspace lands on home, never on a blank strip.
  assert.match(panel, /setTabs\(\[newHomeTab\(\)\]\);/);
});

test('2. one search: QuickOpen in the top bar on ⌘P, the Search tab on ⇧⌘F, and no names pane', () => {
  assert.match(panel, /import \{ QuickOpen \} from '\.\/QuickOpen';/);
  assert.match(panel, /import \{ SearchPane \} from '\.\/SearchPane';/);
  assert.ok(!/NamePane/.test(panel), 'NamePane is gone from the frame');
  assert.ok(!/'files' \| 'names' \| 'text'/.test(panel), 'the three mode control is gone');
  assert.match(code, /\(e\.key === 'p' \|\| e\.key === 'P'\)\) \{\s*e\.preventDefault\(\);\s*setQuickFocus/, '⌘P focuses the quick open');
  assert.match(code, /e\.shiftKey && \(e\.key === 'f' \|\| e\.key === 'F'\)\) \{\s*e\.preventDefault\(\);\s*setSideTab\('search'\);\s*setSearchFocus/, '⇧⌘F opens the Search tab');
  assert.match(panel, /<QuickOpen\s+root=\{root\}\s+focusNonce=\{quickFocus\}\s+onOpen=\{openEdit\}\s+onOpenHit=\{openHit\}\s+onNewFile=\{startNewFile\}\s+onShowAll=\{showAllInSearch\}/);
  assert.match(panel, /<SearchPane key=\{root\} root=\{root\} focusNonce=\{searchFocus\} query=\{searchQuery\} onOpen=\{openEdit\} onOpenHit=\{openHit\} \/>/);
  // A hit opens the file and then asks the editor for the line, in that order.
  assert.match(panel, /const openHit = useCallback\(\(rel: string, line: number, col: number, length: number\) => \{\s*openEdit\(rel\);\s*setReveal\(/);
});

test('3. three sidebar tabs, all mounted, and the tree wears the git letters the Source tab lists', () => {
  assert.match(panel, /<SidebarTabs current=\{sideTab\} changedCount=\{changedFiles\.length\}/);
  for (const pane of ['explorer', 'search', 'git']) {
    assert.match(panel, new RegExp(`data-side-pane="${pane}"[^>]*display: sideTab === '${pane}' \\? 'flex' : 'none'`), `${pane} stays mounted, shown by display`);
  }
  assert.match(panel, /const badges = useMemo\(\(\) => Object\.fromEntries\(changedFiles\.map\(\(f\) => \[f\.path, f\.code\]\)\), \[changedFiles\]\);/);
  assert.match(panel, /<FileTree[\s\S]*?badges=\{badges\}[\s\S]*?collapseNonce=\{collapseNonce\}[\s\S]*?refreshNonce=\{refreshNonce\}[\s\S]*?dense/);
  assert.match(panel, /<SourceControlPane[\s\S]*?changed=\{changedFiles\}[\s\S]*?onOpenDiff=\{openDiff\}[\s\S]*?onOpenRevDiff=\{openRevDiff\}/);
  // The tab strip gets every handler the plan names.
  for (const h of ['onSelect', 'onClose', 'onCloseOthers', 'onCloseRight', 'onDuplicate', 'onCopyPath', 'onReveal', 'onNewHome']) {
    assert.match(panel, new RegExp(`<TabStrip[\\s\\S]*?${h}=`), `TabStrip ${h}`);
  }
  // The status bar knows the branch.
  assert.match(panel, /<EditorStatusBar[\s\S]*?branch=\{branch \?\? undefined\}/);
});

test('4. the chrome is the kit: no pixel font, and every PRO only token carries a Classic fallback', () => {
  assert.ok(!/--cth-font-display/.test(panel), 'no pixel display font in the frame');
  for (const f of [panel, icons]) {
    const bare = f.match(/var\(--cth-(accent[a-z-]*|surface-active|surface-hover)\)/g) || [];
    assert.deepEqual(bare, [], `a PRO only token without a fallback: ${bare.join(', ')}`);
  }
  assert.match(icons, /export const IDE_YELLOW = 'var\(--cth-accent-text, var\(--cth-lemon\)\)';/);
  // The founder's ruling: file glyphs in the yellow, added in the yellow, never green.
  assert.match(icons, /export function FileIcon\([\s\S]*?color: IDE_YELLOW/);
  assert.match(icons, /if \(code === 'A'\) return IDE_YELLOW;/);
  assert.ok(!/--cth-mint/.test(icons) && !/--cth-mint/.test(panel), 'no green in the IDE');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(code.replace(/#\$\{n\}/g, '')), 'no literal colours in the frame');
});

test('5. Esc unwinds one layer at a time, and ⌘W is left to the app menu', () => {
  const esc = code.slice(code.indexOf("if (e.key === 'Escape')"), code.indexOf('window.addEventListener'));
  // 0.5.3: the panel closes through ONE function, requestClose, so that Escape
  // and the X button cannot disagree again. X used to skip the unsaved check.
  const order = ['keysOpen', 'creatingIn !== null', 'switcherOpen', 'requestClose()'].map((s) => esc.indexOf(s));
  assert.ok(order.every((i) => i >= 0) && order.every((i, k) => k === 0 || i > order[k - 1]), `sheet, dialog, switcher, panel: ${order.join(' < ')}`);
  assert.match(code, /const requestClose = useCallback\(\(\) => \{ if \(!anyDirtyRef\.current\) setIdeOpen\(false\); \}/, 'never closes over an unsaved buffer');
  assert.ok(!/e\.key === 'w'/.test(code), '⌘W stays the app menu\'s close window');
});

test('5. a duplicate tab is a second window onto ONE buffer, and closing keeps the neighbour', () => {
  assert.match(panel, /openTab\(src\.mode, src\.rel, \{ \.\.\.src, key: `\$\{src\.key\}#\$\{n\}` \}\);/, 'the duplicate has its own key and the same rel');
  assert.match(panel, /const \[editBuffers, setEditBuffers\] = useState<Record<string, EditBuffer>>\(\{\}\);/, 'buffers are keyed by path, not by tab');
  assert.match(panel, /remaining\[Math\.min\(at, remaining\.length - 1\)\]\.key/, 'the tab to the left takes over');
});

test('6. the recent list is per workspace root, capped, and touched on every open', () => {
  assert.match(panel, /const LS_RECENT = 'cth\.ide\.recent::';/);
  assert.match(panel, /const RECENT_MAX = 8;/);
  assert.match(panel, /const openSource = useCallback\(\(rel: string\) => \{ ensureEdit\(rel\); openTab\('edit', rel\); touchRecent\(rel\); \}/);
  assert.match(panel, /setRecent\(readRecent\(next\.cwd\)\);/, 'a workspace switch reads that root\'s list');
});

test('6. every string the frame adds exists in all three locales, without a dash, variables intact', () => {
  const keys = [...panel.matchAll(/t\('(ide\.frame\.[a-zA-Z]+)'/g)].map((m) => m[1]);
  assert.ok(keys.length >= 6, `frame keys found: ${keys.length}`);
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))]));
  const get = (o, k) => k.split('.').reduce((a, p) => (a == null ? undefined : a[p]), o);
  for (const k of new Set(keys)) {
    const en = get(locales.en, k);
    assert.ok(typeof en === 'string' && en.length > 0, `en ${k}`);
    const vars = (en.match(/\{\{\w+\}\}/g) || []).sort();
    for (const l of ['en', 'zh-CN', 'ar']) {
      const s = get(locales[l], k);
      assert.ok(typeof s === 'string' && s.length > 0, `${l} ${k}`);
      assert.ok(!DASH.test(s), `${l} ${k}: no dash`);
      assert.deepEqual((s.match(/\{\{\w+\}\}/g) || []).sort(), vars, `${l} ${k}: same variables`);
    }
  }
});

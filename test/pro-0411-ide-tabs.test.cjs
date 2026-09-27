'use strict';

// 0.4.11, the IDE redesign the founder approved on 5 Sep 2026 from
// hive/shared/design/app-v2/ide-prototype.html. Piece A: the tab strip and
// the editor chrome.
//
// The contract pinned here:
//   1. TabStrip takes exactly the props the build plan names, and every
//      callback is a key: the strip owns the gesture, the panel the action.
//   2. The right click menu's rows come from a pure function. A Home tab has
//      nothing to copy and nothing to reveal, so it has no such rows.
//   3. A tab reads like the prototype: the file's glyph, the kind chip in one
//      of the three light tints that exist in both skins, the unsaved dot in
//      the app's yellow that gives way to the close button under the pointer,
//      the accent line on the open tab. Middle click closes.
//   4. The chrome is 12px UI font for crumbs, a 24px status bar that starts
//      with the branch, and a save chip that still says all four of its states
//      in words while the unsaved state became the Save button.
//   5. Nothing new uses the pixel Icon, the 8px display font, a literal colour,
//      or a PRO only token without its Classic fallback.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const IDE = 'src/renderer/src/ide';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const stripSrc = read(`${IDE}/TabStrip.tsx`);
const chromeSrc = read(`${IDE}/EditorChrome.tsx`);
const tabs = strip(stripSrc);
const chrome = strip(chromeSrc);

/** Lift one exported function out of a component file and hand it back as a
 *  callable. The file pulls React, which the test loader cannot resolve. */
function lift(src, name) {
  const at = src.indexOf(`export function ${name}`);
  assert.ok(at >= 0, `exports ${name}`);
  const end = src.indexOf('\n}', at);
  const js = ts.transpileModule(src.slice(at, end + 2).replace('export ', ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return new Function(`${js}; return ${name};`)();
}

const DASH = /[–—]|\s-\s/;
/** The words in a file: its comments and its string literals. Arithmetic is
 *  not prose, so `length - 1` is not a dash the house rule cares about. */
const prose = (raw) => [...raw.matchAll(/\/\/.*$|\/\*[\s\S]*?\*\/|'[^'\n]*'|"[^"\n]*"|`[^`]*`/gm)].map((m) => m[0]).join('\n');

/* ═══ 1. the props are the plan's ═════════════════════════════════════════ */

test('TabStrip takes the plan\'s props, and every callback is a key', () => {
  assert.match(tabs, /export type TabKind = 'home' \| 'edit' \| 'diff' \| 'revdiff' \| 'image';/);
  const item = tabs.slice(tabs.indexOf('export interface TabStripItem'), tabs.indexOf('export interface TabStripProps'));
  for (const f of ['key: string', 'kind: TabKind', 'rel: string', 'label: string', 'dirty: boolean', 'revLabel?: string']) {
    assert.ok(item.includes(f), `TabStripItem has ${f}`);
  }
  const props = tabs.slice(tabs.indexOf('export interface TabStripProps'), tabs.indexOf('export type TabMenuItemId'));
  for (const f of [
    'tabs: TabStripItem[]', 'activeKey: string | null',
    'onSelect: (key: string) => void', 'onClose: (key: string) => void', 'onCloseOthers: (key: string) => void',
    'onCloseRight: (key: string) => void', 'onDuplicate: (key: string) => void', 'onCopyPath: (key: string) => void',
    'onReveal: (key: string) => void', 'onNewHome: () => void'
  ]) {
    assert.ok(props.includes(f), `TabStripProps has ${f}`);
  }
  assert.match(tabs, /export function TabStrip\(/);
  // The + at the end of the strip opens a Home tab, and nothing else.
  assert.match(tabs, /data-new-home[\s\S]*?onClick=\{onNewHome\}/);
});

/* ═══ 2. the menu rows are a pure function ════════════════════════════════ */

test('a file tab\'s menu has seven rows with one divider; a Home tab has nothing to copy or reveal', () => {
  const tabMenuItems = lift(stripSrc, 'tabMenuItems');
  assert.deepEqual(tabMenuItems('edit'), ['close', 'closeOthers', 'closeRight', null, 'duplicate', 'copyPath', 'reveal']);
  assert.deepEqual(tabMenuItems('diff'), ['close', 'closeOthers', 'closeRight', null, 'duplicate', 'copyPath', 'reveal']);
  assert.deepEqual(tabMenuItems('home'), ['close', 'closeOthers', 'closeRight', null, 'duplicate']);
  // Every row runs the callback the plan names for it, by the tab's key.
  const run = tabs.slice(tabs.indexOf('const run = '), tabs.indexOf('const menuLabel'));
  for (const [id, cb] of [['close', 'onClose'], ['closeOthers', 'onCloseOthers'], ['closeRight', 'onCloseRight'], ['duplicate', 'onDuplicate'], ['copyPath', 'onCopyPath'], ['reveal', 'onReveal']]) {
    assert.ok(run.includes(`if (id === '${id}') ${cb}(key);`) || run.includes(`else if (id === '${id}') ${cb}(key);`), `${id} runs ${cb}`);
  }
  // Right click opens it; a click elsewhere, Escape, or a resize closes it.
  assert.match(tabs, /onContextMenu=\{\(e\) => openMenu\(e, tab\)\}/);
  assert.match(tabs, /window\.addEventListener\('mousedown', onDown\)/);
  assert.match(tabs, /if \(e\.key === 'Escape'\) \{ e\.stopPropagation\(\); setMenu\(null\); \}/);
  assert.match(tabs, /window\.addEventListener\('resize', close\)/);
  assert.match(tabs, /role="menu"/);
});

/* ═══ 3. a tab reads like the prototype ═══════════════════════════════════ */

test('a tab shows the file\'s glyph, its kind in a light tint, and the yellow unsaved dot', () => {
  assert.match(tabs, /import \{ FileIcon, IDE_YELLOW, IdeIcon \} from '\.\/ideIcons';/);
  assert.match(tabs, /tab\.kind === 'home'\s*\? <IdeIcon name="home"[^>]*\/>\s*: <FileIcon rel=\{tab\.rel\} size=\{14\} \/>/);
  // The three kinds that are not a plain file, in the three tints both skins have.
  assert.match(tabs, /tab\.kind === 'diff'\) return \{ text: t\('idePanel\.diff'\), bg: 'var\(--cth-sky-light\)' \}/);
  assert.match(tabs, /tab\.kind === 'revdiff'\) return \{ text: tab\.revLabel \?\? t\('idePanel\.rev'\), bg: 'var\(--cth-lilac-light\)' \}/);
  assert.match(tabs, /tab\.kind === 'image'\) return \{ text: t\('idePanel\.img'\), bg: 'var\(--cth-peach-light\)' \}/);
  // The unsaved dot is the app's yellow, 7px, and says so.
  assert.match(tabs, /className="ide-tab-dot"[\s\S]*?title=\{t\('ide\.status\.unsaved'\)\}[\s\S]*?background: IDE_YELLOW/);
  // Under the pointer the dot gives way to the close button.
  assert.ok(tabs.includes('.ide-tab.dirty .ide-tab-x{display:none}'));
  assert.ok(tabs.includes('.ide-tab.dirty:hover .ide-tab-x{display:grid}'));
  assert.ok(tabs.includes('.ide-tab.dirty:hover .ide-tab-dot{display:none}'));
  // The close button appears on hover and on the open tab.
  assert.ok(tabs.includes('.ide-tab .ide-tab-x{opacity:0}'));
  assert.ok(tabs.includes('.ide-tab:hover .ide-tab-x,.ide-tab.on .ide-tab-x'));
  // The open tab wears the accent line on top; the strip is 34px and hides its scrollbar.
  assert.match(tabs, /boxShadow: on \? `inset 0 2px 0 \$\{ACCENT\}` : undefined/);
  assert.match(tabs, /height: 34, flexShrink: 0/);
  assert.ok(tabs.includes('.ide-tabs::-webkit-scrollbar{height:0}'));
});

test('middle click closes, the close button does not select, and the tabs are tabs', () => {
  assert.match(tabs, /onAuxClick=\{\(e\) => \{ if \(e\.button === 1\) \{ e\.preventDefault\(\); onClose\(tab\.key\); \} \}\}/);
  assert.match(tabs, /onClick=\{\(e\) => \{ e\.stopPropagation\(\); onClose\(tab\.key\); \}\}/);
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /role="tab"[\s\S]*?aria-selected=\{on\}/);
  // Keyboard: Enter or Space opens the tab, since the tab is not a button (a
  // button cannot hold the close button).
  assert.match(tabs, /if \(e\.key === 'Enter' \|\| e\.key === ' '\) \{ e\.preventDefault\(\); onSelect\(tab\.key\); \}/);
});

/* ═══ 4. the chrome ═══════════════════════════════════════════════════════ */

test('the breadcrumb is 12px UI font, folder crumbs are hoverable buttons, the last crumb is the file', () => {
  const crumb = chrome.slice(chrome.indexOf('export function Breadcrumb'), chrome.indexOf('export function SaveChip'));
  assert.match(crumb, /fontFamily: 'var\(--cth-font-ui\)', fontSize: 12/);
  assert.match(crumb, /className="ide-crumb"[\s\S]*?onClick=\{\(\) => onPickFolder\(c\.rel \?\? ''\)\}/);
  assert.match(crumb, /color: last \? 'var\(--cth-ink-900\)' : 'var\(--cth-ink-500\)'/);
  assert.match(crumb, /fontWeight: last \? 500 : 400/);
  assert.ok(chrome.includes('.ide-crumb:hover{background:'), 'a folder crumb lights under the pointer');
  assert.ok(!/--cth-font-mono/.test(crumb), 'the trail is prose now, not a path in monospace');
});

test('the save chip still says its states in words, and the unsaved state is the Save button when it can save', () => {
  const chip = chrome.slice(chrome.indexOf('export function SaveChip'), chrome.indexOf('export interface CaretPosition'));
  for (const key of ['ide.status.saving', 'ide.status.saveFailed', 'idePanel.saved', 'ide.status.unsaved', 'ide.status.onDisk']) {
    assert.ok(chip.includes(`t('${key}')`), `the save chip never says ${key}`);
  }
  assert.match(chip, /onSave\?: \(\) => void/);
  assert.match(chip, /if \(dirty && onSave\) \{[\s\S]*?<button[\s\S]*?onClick=\{onSave\}[\s\S]*?background: ACCENT, color: ACCENT_INK/);
  assert.match(chip, /\{IS_MAC \? '⌘S' : 'Ctrl\+S'\}/);
  // Without a save action the unsaved state is the chip it always was.
  assert.match(chip, /if \(dirty\) \{\s*return <span[^>]*background: 'var\(--cth-lemon-light\)'[^>]*>\{t\('ide\.status\.unsaved'\)\}/);
  // The failure keeps its message where a person can read it.
  assert.match(chip, /title=\{error\}[\s\S]*?t\('ide\.status\.saveFailed'\)/);
});

test('the status bar is one 24px line that starts with the branch, and its old callers still compile', () => {
  const bar = chrome.slice(chrome.indexOf('export function EditorStatusBar'), chrome.indexOf('export function shortcutRows'));
  assert.match(bar, /branch\?: string;/);
  assert.match(bar, /\{branch && \([\s\S]*?<IdeIcon name="git" size=\{13\} \/>[\s\S]*?\{branch\}/);
  assert.match(bar, /height: 24, display: 'flex', alignItems: 'center', gap: 14/);
  // Backward compatible: the save props are optional and the chip draws only when given.
  assert.match(bar, /dirty\?: boolean;/);
  assert.match(bar, /saveState\?: SaveState;/);
  assert.match(bar, /\{saveState !== undefined && <SaveChip dirty=\{!!dirty\} saveState=\{saveState\} error=\{error\} onSave=\{onSave\} \/>\}/);
  // Every fact is still read off the buffer, none assumed.
  for (const fn of ['countLines(content)', 'detectLineEnding(content)', 'utf8Bytes(content)']) assert.ok(bar.includes(fn), fn);
  assert.match(bar, /caret\?\.line \?\? 1/);
  // The keyboard button is at the far right, after the spacer.
  const spacer = bar.indexOf("<span style={{ flex: 1 }} />");
  const keys = bar.indexOf('className="ide-keys-btn"');
  assert.ok(spacer > 0 && keys > spacer, 'the keys button sits after the spacer');
  // The sheet is unchanged in what it lists: ten bindings that exist.
  const rows = chrome.slice(chrome.indexOf('export function shortcutRows'), chrome.indexOf('export function ShortcutSheet'));
  const labels = [...rows.matchAll(/t\('(ide\.keys\.[\w.]+)'\)/g)].map((m) => m[1]);
  assert.equal(labels.length, 10);
  assert.equal(new Set(labels).size, 10);
});

/* ═══ 5. the redesign's hygiene ═══════════════════════════════════════════ */

test('no pixel Icon, no 8px display font, no literal colour, no dash, and every PRO token has its fallback', () => {
  for (const [name, src, raw] of [['TabStrip', tabs, stripSrc], ['EditorChrome', chrome, chromeSrc]]) {
    assert.ok(!/from '@\/components\/Icon'/.test(src), `${name} imports the Classic pixel Icon`);
    assert.ok(!/--cth-font-display/.test(src), `${name} uses the 8px display font`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, (m) => (/^['"`]#/.test(m) ? m : ''))), `${name} draws a literal colour`);
    assert.ok(!DASH.test(prose(raw)), `${name} carries a dash in its words`);
    // PRO only tokens never appear bare.
    for (const tok of ['--cth-accent', '--cth-accent-ink', '--cth-surface-active']) {
      const bare = new RegExp(`var\\(${tok}\\)`);
      assert.ok(!bare.test(src), `${name} names ${tok} without its Classic fallback`);
    }
  }
  assert.ok(tabs.includes("const ACCENT = 'var(--cth-accent, var(--cth-lemon))';"));
  assert.ok(tabs.includes("const HOVER = 'var(--cth-surface-active, var(--cth-cream-200))';"));
  assert.ok(chrome.includes("const ACCENT_INK = 'var(--cth-accent-ink, var(--cth-ink-900))';"));
});

test('every string the strip and the chrome say is a locale key from a known set', () => {
  const used = new Set([...(tabs + chrome).matchAll(/\bt\('([\w.]+)'/g)].map((m) => m[1]));
  const known = new Set([
    // existing
    'idePanel.closeTab', 'idePanel.diff', 'idePanel.rev', 'idePanel.img', 'idePanel.saved', 'fileTree.copyPath',
    'ide.status.unsaved', 'ide.status.saving', 'ide.status.saveFailed', 'ide.status.onDisk', 'ide.status.pathLabel',
    'ide.status.position', 'ide.status.selected', 'ide.status.lines', 'ide.status.bytesTitle', 'ide.status.eolMixedTitle',
    'ide.status.eolNone', 'ide.status.eolMixed', 'ide.status.plainText', 'ide.create.aimHere', 'ide.keys.title',
    'ide.keys.save', 'ide.keys.newFile', 'ide.keys.findFile', 'ide.keys.findText', 'ide.keys.closeIde', 'ide.keys.findInFile',
    'ide.keys.replace', 'ide.keys.palette', 'ide.keys.goToLine', 'ide.keys.goToSymbol',
    // new in 0.4.11 (applied to en, zh-CN and ar by the locale helper)
    'ide.tabs.closeOthers', 'ide.tabs.closeRight', 'ide.tabs.duplicate', 'ide.tabs.reveal', 'ide.tabs.newHome', 'ide.tabs.menu',
    'ide.status.save', 'ide.status.branch',
    // new in 0.5.3 (review finding 6): a dirty tab does not close, and says how to get out
    'idePanel.discardChanges', 'idePanel.tabDirtyClose'
  ]);
  for (const k of used) assert.ok(known.has(k), `unexpected key ${k}`);
  for (const k of ['ide.tabs.closeOthers', 'ide.tabs.closeRight', 'ide.tabs.duplicate', 'ide.tabs.reveal', 'ide.tabs.newHome', 'ide.status.save', 'ide.status.branch']) {
    assert.ok(used.has(k), `${k} is drawn`);
  }
});

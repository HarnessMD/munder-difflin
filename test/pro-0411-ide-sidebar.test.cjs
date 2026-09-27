// 0.4.11, the IDE redesign (founder approved 5 Sep 2026 from
// hive/shared/design/app-v2/ide-prototype.html). Piece C: the sidebar.
//
// The contract pinned here:
//   1. The tree has a DENSE mode for the IDE (24px rows, the ideIcons glyphs,
//      chevron carets, a git letter at the row's end, the active row on the
//      accent's soft tint) and, without it, renders exactly as it did for
//      Classic's FilesTab: the legacy row markup is still there, gated.
//   2. The git letters and the file glyphs take their colour from ideIcons:
//      added is the app's yellow (the founder's ruling, no green), modified
//      the lemon, deleted the coral.
//   3. Every PRO only token in the sidebar files carries a fallback, because
//      the IDE is one surface for both skins. No literal colours, no pixel
//      display face, no Classic pixel Icon in the new files.
//   4. SidebarTabs is Explorer · Search · Source in that order, and Source
//      carries the count pill only while something has changed.
//   5. SourceControlPane keeps Changes, History and Compare, keyed by the
//      repo's main root, and says the two git states in the gitTab words.
//   6. GitPanes kept its data flow: the same IPC calls, the same confirms.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const tree = read('src/renderer/src/components/FileTree.tsx');
const chrome = read('src/renderer/src/ide/SidebarChrome.tsx');
const source = read('src/renderer/src/ide/SourceControlPane.tsx');
const git = read('src/renderer/src/ide/GitPanes.tsx');
const icons = read('src/renderer/src/ide/ideIcons.tsx');
const FILES = { tree, chrome, source, git };

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const DASH = /[–—]|\s-\s/;

test('1. the tree has a dense mode, and without it the legacy row is what renders', () => {
  assert.match(tree, /dense\?: boolean;/);
  assert.match(tree, /badges\?: Record<string, string>;/);
  assert.match(tree, /collapseNonce\?: number;/);
  assert.match(tree, /refreshNonce\?: number;/);
  // The two branches, in this order: renaming, dense, legacy.
  assert.match(tree, /\) : dense \? \(\n\s+<div\n\s+className=\{IDE_ROW_CLASS\}/);
  // The legacy row is byte for byte what Classic's FilesTab mounted.
  assert.match(tree, /background: isActive \? 'var\(--cth-lemon-light\)' : 'transparent',/);
  assert.match(tree, /\{node\.expanded \? '▾' : '▸'\}/);
  assert.match(tree, /<Icon name=\{node\.isDir \? 'folder' : 'code'\} \/>/);
  assert.match(tree, />\{t\('common\.copy'\)\}<\/button>/);
  // The dense row: 24px, the glyphs, the caret, the badge, the yellow bar.
  assert.match(tree, /gap: 5, height: 24,/);
  assert.match(tree, /<IdeIcon name=\{node\.expanded \? 'folderOpen' : 'folder'\}/);
  assert.match(tree, /<FileIcon rel=\{node\.rel\} size=\{15\} \/>/);
  assert.match(tree, /<IdeIcon name="chevron" size=\{12\} style=\{\{ transform: node\.expanded \? 'rotate\(90deg\)' : 'none'/);
  assert.match(tree, /const badge = !node\.isDir \? badges\?\.\[node\.rel\] : undefined;/);
  assert.match(tree, /color: gitCodeColor\(badge\)/);
  assert.match(tree, /isActive && <i aria-hidden style=\{\{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 2, borderRadius: 2, background: IDE_YELLOW \}\} \/>/);
  // The nonces: collapse keeps subtrees, refresh keeps open folders open.
  assert.match(tree, /useEffect\(\(\) => \{ if \(collapseNonce\) setTree\(collapseAll\); \}, \[collapseNonce\]\);/);
  assert.match(tree, /useEffect\(\(\) => \{ if \(refreshNonce\) void reloadDir\(''\); \}, \[refreshNonce, reloadDir\]\);/);
  assert.match(tree, /expanded: node\.rel === '' \? node\.expanded : false,/);
  // Every FileTreeOps door is still wired, and delete still means the bin.
  for (const op of ['ops.newFile(', 'ops.newFolder(', 'ops.rename(', 'ops.remove(']) assert.ok(tree.includes(op), op);
  assert.match(tree, /t\('fileTree\.moveToBin'\)/);
});

test('2. the colours come from ideIcons: added is yellow, modified lemon, deleted coral', () => {
  assert.match(icons, /export const IDE_YELLOW = 'var\(--cth-accent-text, var\(--cth-lemon\)\)';/);
  assert.match(icons, /if \(code === 'A'\) return IDE_YELLOW;/);
  assert.match(icons, /if \(code === 'M'\) return 'var\(--cth-lemon\)';/);
  assert.match(icons, /if \(code === 'D'\) return 'var\(--cth-coral\)';/);
  assert.match(icons, /color: IDE_YELLOW, \.\.\.style/);
  for (const [name, src] of Object.entries(FILES)) {
    assert.ok(!/--cth-mint/.test(src), `${name}: no green on a git letter`);
  }
  assert.match(git, /color: gitCodeColor\(f\.status\)/);
  assert.match(source, /color: gitCodeColor\(f\.code\)/);
  assert.ok(!/function statusColor/.test(git), 'GitPanes no longer keeps a colour table of its own');
});

test('3. both skins: every PRO token has a fallback, no literal colours, no pixel face, no pixel Icon', () => {
  for (const [name, src] of Object.entries(FILES)) {
    const code = stripComments(src);
    const bare = code.match(/var\(--cth-(?:accent[a-z-]*|surface-active)\)/g) || [];
    assert.deepEqual(bare, [], `${name}: PRO only tokens without a fallback: ${bare.join(', ')}`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(code.replace(/data-[a-z-]+/g, '')), `${name}: no literal hex colour`);
    assert.ok(!/rgba?\(/.test(code), `${name}: no literal rgb colour`);
    assert.ok(!/--cth-font-display/.test(code), `${name}: the 8px pixel labels are gone`);
    // The house rule is about what a person reads: every quoted string (a
    // label, a title, a template) is checked; arithmetic like `i - 1` is not.
    const strings = code.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) || [];
    for (const s of strings) {
      if (/calc\(/.test(s)) continue; // CSS arithmetic, not prose
      assert.ok(!DASH.test(s.replace(/[↑↓→…·]/g, '')), `${name}: no dash in ${s}`);
    }
  }
  for (const name of ['chrome', 'source', 'git']) {
    assert.ok(!/from '@\/components\/Icon'/.test(FILES[name]), `${name}: the Classic pixel Icon is not used`);
    assert.ok(/from '\.\/ideIcons'/.test(FILES[name]), `${name}: draws from ideIcons`);
  }
  // The tree keeps the pixel Icon ONLY for the legacy branch.
  assert.match(tree, /import \{ Icon \} from '\.\/Icon';/);
  assert.match(tree, /import \{ FileIcon, IDE_YELLOW, IdeIcon, gitCodeColor \} from '@\/ide\/ideIcons';/);
  // Hover is a rule, injected once.
  assert.match(chrome, /export function ensureIdeSidebarStyle\(\): void \{/);
  assert.match(chrome, /document\.getElementById\('cth-ide-sidebar-style'\)\) return;/);
  assert.match(chrome, /export const IDE_ROW_CLASS = 'cth-ide-row';/);
});

test('4. SidebarTabs is Explorer, Search, Source, and the pill shows only with changes', () => {
  assert.match(chrome, /export type SideTab = 'explorer' \| 'search' \| 'git';/);
  assert.match(chrome, /const TAB_ORDER: SideTab\[\] = \['explorer', 'search', 'git'\];/);
  assert.match(chrome, /export function SidebarTabs\(\{ current, changedCount, onChange \}/);
  assert.match(chrome, /\{k === 'git' && changedCount > 0 && \(/);
  assert.match(chrome, /background: 'var\(--cth-accent, var\(--cth-lemon\)\)', color: 'var\(--cth-accent-ink, var\(--cth-ink-900\)\)'/);
  assert.match(chrome, /\{on && <i aria-hidden style=\{\{ position: 'absolute', left: 8, right: 8, bottom: -1, height: 2/);
  // The three labels and their tooltips are locale strings, keyed by tab.
  assert.match(chrome, /t\(`ide\.side\.\$\{k\}`\)/);
  assert.match(chrome, /t\(`ide\.side\.\$\{k\}Title`\)/);
  assert.match(chrome, /export function PaneHeader\(\{ title, actions \}/);
  assert.match(chrome, /export const IDE_PANE_CLASS = 'cth-ide-pane';/);
  assert.match(chrome, /export function SideIconButton\(/);
});

test('5. SourceControlPane: three views, keyed by the main root, git states in the gitTab words', () => {
  assert.match(source, /export function SourceControlPane\(\{ root, gitRoot, isRepo, changed, activeRel, onOpenDiff, onRefresh, onOpenRevDiff \}/);
  assert.match(source, /\{ value: 'changes', label: t\('ide\.git\.changes'\) \},\n\s+\{ value: 'history', label: t\('ide\.git\.history'\) \},\n\s+\{ value: 'compare', label: t\('ide\.git\.compare'\) \}/);
  assert.match(source, /<HistoryPane key=\{repo\} gitRoot=\{repo\} onOpenRevDiff=\{onOpenRevDiff\} \/>/);
  assert.match(source, /<ComparePane key=\{repo\} gitRoot=\{repo\} onOpenRevDiff=\{onOpenRevDiff\} \/>/);
  assert.match(source, /const repo = gitRoot \?\? root;/);
  assert.match(source, /isRepo === false && \(/);
  assert.match(source, /t\('gitTab\.notARepo'\)/);
  assert.match(source, /t\('gitTab\.notARepoHint'\)/);
  assert.match(source, /isRepo && changed\.length === 0 && <div style=\{noteStyle\}>\{t\('gitTab\.clean'\)\}<\/div>/);
  assert.match(source, /<SideIconButton name="refresh" title=\{t\('idePanel\.refresh'\)\} onClick=\{onRefresh\} \/>/);
  assert.match(source, /onClick=\{\(\) => onOpenDiff\(f\.path\)\}/);
  assert.match(source, /background: active \? 'var\(--cth-accent-soft, var\(--cth-lemon-light\)\)' : 'transparent'/);
  assert.ok(!/window\.cth\./.test(source), 'the pane draws from props; nothing here talks to git');
});

test('6. GitPanes kept its data flow: the same IPC, the same confirmations', () => {
  const calls = (git.match(/window\.cth\.[a-zA-Z]+/g) || []).sort();
  assert.deepEqual(calls, [
    'window.cth.gitBranch', 'window.cth.gitBranches', 'window.cth.gitCheckout', 'window.cth.gitCheckout',
    'window.cth.gitCommitFiles', 'window.cth.gitCompareRefs', 'window.cth.gitLogGraph'
  ]);
  assert.strictEqual((git.match(/window\.confirm\(/g) || []).length, 2, 'both checkouts still ask first');
  assert.match(git, /onOpenRevDiff\(`\$\{selected\.sha\}\^`, selected\.sha, f\.path, selected\.shortSha\)/);
  assert.match(git, /mode === 'three' \? \(result\.mergeBase \?\? base\) : base,/);
  assert.match(git, /<CommitGraph commits=\{commits\} currentBranch=\{branch\} onCommitClick=/);
  // Restyled: 24px rows in the UI face, the icon set's arrows.
  assert.match(git, /height: 24, padding: '0 8px 0 12px'/);
  assert.match(git, /<IdeIcon name="arrowRight" size=\{13\} \/> \{t\('gitPanes\.jumpHere'\)\}/);
  assert.ok(!/✕|⇄/.test(git), 'the typed glyph buttons became icons');
});

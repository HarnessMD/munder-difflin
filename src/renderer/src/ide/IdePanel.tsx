/**
 * THE IDE (0.4.11 redesign; founder approved hive/shared/design/app-v2/
 * ide-prototype.html on 5 Sep 2026, plan at ide-build-plan.md).
 *
 * What moved, and why. Every feature the 0.4.9 panel had is still here.
 *
 *   the home tab      nothing open is a place: the search box with its answers
 *                     under it, three doors (new file, open file, search in
 *                     code), the recent files, the changed files. The + on the
 *                     tab strip opens another one.
 *   one search        "files · names · text" is gone. Explorer is always the
 *                     tree; Search is one box that answers with file names AND
 *                     lines in files; the same answer sits behind ⌘P in the top
 *                     bar (QuickOpen). Names and text were two panes because
 *                     they are two kinds of hit, and they still are: two
 *                     sections of one answer, not two modes of one pane.
 *   the sidebar       three tabs at its top, Explorer · Search · Source
 *                     control, the last carrying the changed count. The git
 *                     rail no longer sits above the tree and steals its height.
 *   tabs              a file icon, the name, an unsaved dot that becomes the
 *                     close button on hover, DIFF, REV and IMG chips, and a
 *                     right click menu (TabStrip).
 *   the crumb bar     the per file controls live here: markdown code, split,
 *                     preview with the outline toggle, view image, copy path,
 *                     and the save chip.
 *   the status bar    branch, caret, selection, lines, size, endings, language
 *                     and the key sheet, in one 24px line (EditorStatusBar).
 *
 * ⌘W is deliberately NOT bound: on macOS the app menu owns it as close window,
 * and the renderer cannot stop that accelerator. Tabs close by their × and by
 * middle click.
 *
 * The IDE is one surface for BOTH skins. PRO tokens the Classic skin lacks
 * are written with a fallback (see ideIcons.tsx for the yellow).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import { FileTree, type FileTreeOps } from '@/components/FileTree';
import { SpritePortrait } from '@/components/SpritePortrait';
import { SearchPane } from './SearchPane';
import { QuickOpen } from './QuickOpen';
import { HomeTab } from './HomeTab';
import { TabStrip, type TabStripItem } from './TabStrip';
import { SidebarTabs, PaneHeader, IDE_PANE_CLASS, type SideTab } from './SidebarChrome';
import type { IdeSession } from '@shared/ideSession';
import { buffersAfterTrash, canCloseTab, dirtyCount, discardChanges, orphanDirtyRels, readStillWanted, tabsAfterCloseOthers, tabsAfterCloseRight } from '@shared/ideBuffers';
import { useIdeSession } from './useIdeSession';
import { SourceControlPane } from './SourceControlPane';
import { MonacoEditor, type CaretReport, type Editor as MonacoInstance } from './MonacoEditor';
import { MonacoDiff } from './MonacoDiff';
import { ImagePreview } from './ImagePreview';
import { NewFileDialog } from './NewFileDialog';
import { MarkdownBody, OutlinePane, type OutlineJump } from './MarkdownReview';
import { Breadcrumb, EditorStatusBar, SaveChip, ShortcutSheet } from './EditorChrome';
import { IdeIcon, IDE_YELLOW } from './ideIcons';
import { isImagePath, isSvgPath } from '@shared/imageTypes';
import { markdownOutline } from '@shared/markdownOutline';
import { languageForPath } from './monaco';
import { parentOfRel } from '@shared/ideNewFile';
import { IDE_Z_INDEX, coveredAboveIde, takeFocusForPanel } from './ideShortcutRules';
import { routeFindKey } from './ideFind';
import { IS_MAC_PLATFORM } from '@/components/pro/proKeys';

// v0.3.4 markdown preview: per-md-tab view mode, defaulted from the last choice.
type MdView = 'code' | 'split' | 'preview';
const LS_MD_VIEW = 'cth.ide.mdView';
/** Show the heading outline beside a markdown file. Remembered, like the view. */
const LS_MD_OUTLINE = 'cth.ide.mdOutline';
/** The sidebar's width, remembered. */
const LS_SIDE_WIDTH = 'cth.ide.sideWidth';
/** The files opened most recently, per workspace root. */
const LS_RECENT = 'cth.ide.recent::';
const RECENT_MAX = 8;
const isMarkdown = (rel: string) => /\.(md|markdown)$/i.test(rel);
/**
 * Markdown opens RENDERED (0.4.9 phase 8). It used to open split, which is the
 * right default for a file you came to edit and the wrong one for the reason
 * markdown is opened in this app nine times in ten: an agent wrote a report and
 * a person is here to read it. The choice is still sticky, so anyone who
 * switches to split once keeps it.
 */
function defaultMdView(): MdView {
  try {
    const v = window.localStorage.getItem(LS_MD_VIEW);
    if (v === 'code' || v === 'split' || v === 'preview') return v;
  } catch { /* noop */ }
  return 'preview';
}
function defaultOutlineOn(): boolean {
  try { return window.localStorage.getItem(LS_MD_OUTLINE) !== '0'; } catch { return true; }
}
function readRecent(root: string): string[] {
  try {
    const raw = window.localStorage.getItem(LS_RECENT + root);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : [];
  } catch { return []; }
}
function writeRecent(root: string, list: string[]): void {
  try { window.localStorage.setItem(LS_RECENT + root, JSON.stringify(list.slice(0, RECENT_MAX))); } catch { /* private mode */ }
}

// ─── Local mirrors of the main-side git shapes (kept renderer-local like GitTab) ──
interface GitStatusEntry { path: string; index: string; worktree: string }
interface GitStatusT { staged: GitStatusEntry[]; unstaged: GitStatusEntry[]; untracked: string[] }

type TabMode = 'home' | 'edit' | 'diff' | 'revdiff' | 'image';
interface Tab {
  key: string; rel: string; mode: TabMode;
  /** revdiff only: the two sides + a short human label ("a1b2c3d" / "main…feat"). */
  revA?: string; revB?: string; revLabel?: string;
}

interface EditBuffer {
  content: string;
  original: string;
  status: 'loading' | 'ready' | 'error';
  error?: string;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
}
interface DiffData {
  status: 'loading' | 'ready' | 'binary' | 'error';
  head: string;
  working: string;
  error?: string;
}

const tabKey = (mode: TabMode, rel: string) => `${mode}::${rel}`;
const basename = (rel: string) => rel.split('/').pop() || rel;
let homeSerial = 0;
const newHomeTab = (): Tab => ({ key: `home::${++homeSerial}`, rel: '', mode: 'home' });

/** Which agent's workspace the IDE is showing, and how confidently we know it. */
interface IdeTarget {
  agent: Agent | null;
  root: string | null;
  /** True when NOBODY told us which agent this is and we had to guess. The
   *  guess is usually right, but the title says so rather than asserting a name
   *  it cannot stand behind. */
  inferred: boolean;
}

/** Snapshot the IDE's target once at mount.
 *
 *  Preference order, most-trustworthy first:
 *   1. `ideAgentId` — the opener said exactly who this is for.
 *   2. the current selection — right for anything opened off the sidebar.
 *   3. the god agent, then the first agent — last resorts so the IDE still
 *      opens on *something* browsable instead of an empty shell.
 *  Everything past (1) is marked `inferred`, because those paths are exactly the
 *  ones that can disagree with what the user was actually looking at. */
function pickIdeTarget(): IdeTarget {
  const s = useStore.getState();
  const byId = (id: string | null): Agent | null => (id ? s.agents.find((a) => a.id === id) ?? null : null);
  const named = byId(s.ideAgentId);
  if (named?.cwd) return { agent: named, root: named.cwd, inferred: false };
  const guess = byId(s.selectedId) ?? s.agents.find((a) => a.isGod) ?? s.agents[0] ?? null;
  if (guess?.cwd) return { agent: guess, root: guess.cwd, inferred: true };
  return { agent: null, root: null, inferred: false };
}

/* ─── shared styles (tokens with Classic fallbacks) ───────────────────────── */
const ACCENT = 'var(--cth-accent, var(--cth-lemon))';
const ACCENT_INK = 'var(--cth-accent-ink, var(--cth-ink-900))';
const ACCENT_SOFT = 'var(--cth-accent-soft, var(--cth-lemon-light))';
const HOVER = 'var(--cth-surface-active, var(--cth-cream-200))';
const LINE = '1px solid var(--cth-ink-300)';
const RADIUS = 'var(--cth-radius-md, 7px)';

const iconBtn: CSSProperties = {
  width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', padding: 0,
  display: 'inline-grid', placeItems: 'center', color: 'var(--cth-ink-500)', cursor: 'pointer', flexShrink: 0
};
const smallBtn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 9px', borderRadius: RADIUS,
  border: LINE, background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)', font: 'inherit',
  fontFamily: 'var(--cth-font-ui)', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap'
};
const ghostBtn: CSSProperties = { ...smallBtn, border: '1px solid transparent', background: 'transparent', color: 'var(--cth-ink-500)' };
const kbd: CSSProperties = {
  fontFamily: 'var(--cth-font-mono)', fontSize: 10, color: 'var(--cth-ink-500)', background: 'var(--cth-cream-200)',
  border: LINE, borderRadius: 4, padding: '0 4px', lineHeight: '15px', whiteSpace: 'nowrap'
};

export function IdePanel() {
  const { t } = useTranslation();
  const setIdeOpen = useStore((s) => s.setIdeOpen);
  const agents = useStore((s) => s.agents);
  /**
   * Settable since 0.4.9 phase 9 (the project switcher). Switching resets
   * everything below, because every tab, buffer and diff is a path relative
   * to the OLD root.
   */
  const [target, setTarget] = useState<IdeTarget>(pickIdeTarget);
  const root = target.root;
  const [sideTab, setSideTab] = useState<SideTab>('explorer');
  /** Bumped to hand the keyboard to the search box (⇧⌘F) or the quick open (⌘P). */
  const [searchFocus, setSearchFocus] = useState(0);
  const [quickFocus, setQuickFocus] = useState(0);
  const [homeFocus, setHomeFocus] = useState(0);
  /** A query handed from the quick open's "show all" to the Search tab. */
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  /** Where a search hit wants the caret. The nonce is what makes clicking the
   *  same hit twice scroll back to it. */
  const [reveal, setReveal] = useState<{ rel: string; line: number; col: number; length: number; nonce: number } | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  /** The new-file flow (0.4.9 phase 8). `null` when it is closed; otherwise the
   *  folder the file will land in, root relative, `''` being the workspace. */
  const [creatingIn, setCreatingIn] = useState<string | null>(null);
  /** Where the caret is, as Monaco reports it. Undefined until it has. */
  const [caret, setCaret] = useState<CaretReport | undefined>(undefined);
  const [keysOpen, setKeysOpen] = useState(false);
  const [outlineOn, setOutlineOn] = useState<boolean>(defaultOutlineOn);
  const [jump, setJump] = useState<OutlineJump | null>(null);
  const [activeHeading, setActiveHeading] = useState(-1);
  const [collapseNonce, setCollapseNonce] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // The strip always holds at least the home tab: an empty strip is a blank
  // pane, and the redesign's whole point is that nothing open is a place.
  const [tabs, setTabs] = useState<Tab[]>(() => [newHomeTab()]);
  const [activeKey, setActiveKey] = useState<string | null>(() => null);
  const [editBuffers, setEditBuffers] = useState<Record<string, EditBuffer>>({});
  const [diffData, setDiffData] = useState<Record<string, DiffData>>({});
  const [recent, setRecent] = useState<string[]>(() => (root ? readRecent(root) : []));

  const [isRepo, setIsRepo] = useState<boolean | null>(null);
  const [status, setStatus] = useState<GitStatusT | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [sideWidth, setSideWidth] = useState<number>(() => {
    try { const v = Number(window.localStorage.getItem(LS_SIDE_WIDTH)); return v >= 200 && v <= 520 ? v : 260; } catch { return 260; }
  });
  const [gitRoot, setGitRoot] = useState<string | null>(null);
  useEffect(() => {
    if (!root) return;
    let alive = true;
    void window.cth.gitMainRepo(root).then((r) => { if (alive) setGitRoot(r ?? root); });
    return () => { alive = false; };
  }, [root]);
  // Per-markdown-tab view mode (code | split | preview); changing it also
  // updates the sticky default for the next markdown file.
  const [mdViews, setMdViews] = useState<Record<string, MdView>>({});
  const setMdView = useCallback((rel: string, v: MdView) => {
    setMdViews((p) => ({ ...p, [rel]: v }));
    try { window.localStorage.setItem(LS_MD_VIEW, v); } catch { /* noop */ }
  }, []);
  const toggleOutline = useCallback(() => {
    setOutlineOn((v) => {
      const next = !v;
      try { window.localStorage.setItem(LS_MD_OUTLINE, next ? '1' : '0'); } catch { /* private mode */ }
      return next;
    });
  }, []);

  // Refs so window/editor handlers always see current values without rebinding.
  const tabsRef = useRef(tabs); tabsRef.current = tabs;
  const activeKeyRef = useRef(activeKey); activeKeyRef.current = activeKey;
  const editBuffersRef = useRef(editBuffers); editBuffersRef.current = editBuffers;
  const rootRef = useRef(root); rootRef.current = root;
  const diffDataRef = useRef(diffData); diffDataRef.current = diffData;

  // The first tab stands in when nothing is active (the home tab, on open).
  const activeTab = useMemo(() => tabs.find((tb) => tb.key === activeKey) ?? tabs[0] ?? null, [tabs, activeKey]);

  // A caret position and a scroll position belong to ONE file. Carrying either
  // across a tab switch would have the status line reporting line 340 of a file
  // with nine lines in it.
  useEffect(() => { setCaret(undefined); setActiveHeading(-1); setJump(null); }, [activeKey]);

  // ─── Buffer / diff loaders ────────────────────────────────────────────────
  const ensureEdit = useCallback((rel: string) => {
    if (!root || editBuffersRef.current[rel]) return;
    setEditBuffers((p) => ({ ...p, [rel]: { content: '', original: '', status: 'loading', saveState: 'idle' } }));
    const askedUnder = root;
    window.cth.readFile(root, rel).then((res) => {
      // The project may have changed while this was in flight, and agent
      // worktrees of one repo share every relative path (review finding 13).
      if (!readStillWanted(askedUnder, rootRef.current)) return;
      setEditBuffers((p) => ({
        ...p,
        [rel]: res.ok
          ? { content: res.content, original: res.content, status: 'ready', saveState: 'idle' }
          : { content: '', original: '', status: 'error', error: res.error, saveState: 'idle' }
      }));
    });
  }, [root]);

  const ensureDiff = useCallback((rel: string, force = false) => {
    if (!root) return;
    const cur = diffDataRef.current[rel];
    if (!force && cur && cur.status !== 'error') return;
    setDiffData((p) => ({ ...p, [rel]: { status: 'loading', head: '', working: '' } }));
    window.cth.gitDiff(root, rel).then((res) => {
      if (!('ok' in res) || res.ok !== true) {
        const error = 'error' in res && typeof res.error === 'string' ? res.error : 'diff failed';
        setDiffData((p) => ({ ...p, [rel]: { status: 'error', head: '', working: '', error } }));
        return;
      }
      setDiffData((p) => ({
        ...p,
        [rel]: res.isBinary
          ? { status: 'binary', head: '', working: '' }
          : { status: 'ready', head: res.head, working: res.working }
      }));
    });
  }, [root]);

  // ─── Tab actions ──────────────────────────────────────────────────────────
  /** Insert after the active tab, the way a browser does, unless it exists. */
  const openTab = useCallback((mode: TabMode, rel: string, extra?: Partial<Tab>) => {
    const key = extra?.key ?? tabKey(mode, rel);
    setTabs((prev) => {
      if (prev.some((tb) => tb.key === key)) return prev;
      const at = prev.findIndex((tb) => tb.key === activeKeyRef.current);
      const next = [...prev];
      next.splice(at === -1 ? prev.length : at + 1, 0, { key, rel, mode, ...extra });
      return next;
    });
    setActiveKey(key);
  }, []);

  const touchRecent = useCallback((rel: string) => {
    if (!root) return;
    setRecent((prev) => {
      const next = [rel, ...prev.filter((r) => r !== rel)].slice(0, RECENT_MAX);
      writeRecent(root, next);
      return next;
    });
  }, [root]);

  /** Force a file into Monaco regardless of type — the "view source" escape
   *  hatch behind the image preview. */
  const openSource = useCallback((rel: string) => { ensureEdit(rel); openTab('edit', rel); touchRecent(rel); }, [ensureEdit, openTab, touchRecent]);

  /** The default open. Images go to the preview instead of Monaco: the text
   *  reader rejects anything with a null byte. SVG is a picture first here
   *  too, with view source one click away. */
  const openEdit = useCallback((rel: string) => {
    if (isImagePath(rel)) { openTab('image', rel); touchRecent(rel); return; }
    openSource(rel);
  }, [openSource, openTab, touchRecent]);

  // v0.3.4: rev-pinned diff tabs (per-commit files + branch compare). Both
  // sides load through the metadata-guarded git:showFile IPC at the MAIN root.
  const openRevDiff = useCallback((revA: string, revB: string, rel: string, revLabel: string) => {
    const repo = gitRoot ?? root;
    if (!repo) return;
    const key = `rev::${revA}::${revB}::${rel}`;
    openTab('revdiff', rel, { key, revA, revB, revLabel });
    if (diffDataRef.current[key] && diffDataRef.current[key].status !== 'error') return;
    setDiffData((p) => ({ ...p, [key]: { status: 'loading', head: '', working: '' } }));
    void Promise.all([
      window.cth.gitShowFile(repo, revA, rel),
      window.cth.gitShowFile(repo, revB, rel)
    ]).then(([a, b]) => {
      if (!a.ok || !b.ok) {
        const error = (!a.ok ? a.error : !b.ok ? (b as { error: string }).error : 'diff failed');
        setDiffData((p) => ({ ...p, [key]: { status: 'error', head: '', working: '', error } }));
        return;
      }
      if (a.isBinary || b.isBinary) {
        setDiffData((p) => ({ ...p, [key]: { status: 'binary', head: '', working: '' } }));
        return;
      }
      setDiffData((p) => ({ ...p, [key]: { status: 'ready', head: a.content, working: b.content } }));
    });
  }, [gitRoot, root, openTab]);

  // ─── The session: what this workspace looked like last time (0.5.3, bug 13) ─
  // What a session is: @shared/ideSession. When it is read and written, which
  // is the part that can go wrong: ./useIdeSession.
  const restoreSession = useCallback((session: IdeSession) => {
    const restored: Tab[] = session.tabs.map((tb) => ({ key: tabKey(tb.mode, tb.rel), rel: tb.rel, mode: tb.mode }));
    setTabs(restored);
    setActiveKey(session.active >= 0 ? restored[session.active].key : restored[0].key);
    setSideTab(session.sideTab);
    setMdViews(session.mdViews);
    // A restored tab nobody loads is a tab stuck on "loading" for ever: the
    // loaders are only ever called by the actions that OPEN a tab. A file that
    // has gone since then shows the reader's own error in its tab, which is
    // the truth, and the person closes it.
    for (const tb of restored) {
      if (tb.mode === 'edit') ensureEdit(tb.rel);
      else if (tb.mode === 'diff') ensureDiff(tb.rel);
    }
  }, [ensureEdit, ensureDiff]);
  // ─── end restoreSession
  useIdeSession(root, { tabs, activeKey, sideTab, mdViews }, restoreSession);

  // Entry point from elsewhere in the app ("open in IDE" on the file overlay):
  // consume the queued absolute path once the root is known, open it (preview
  // for markdown), then clear the queue slot so a later IDE open starts fresh.
  useEffect(() => {
    if (!root) return;
    const abs = useStore.getState().ideInitialFile;
    if (!abs) return;
    useStore.getState().setIdeInitialFile(null);
    const prefix = root.endsWith('/') ? root : `${root}/`;
    if (!abs.startsWith(prefix)) return; // different workspace — tree still lets them browse
    const rel = abs.slice(prefix.length);
    openEdit(rel);
    if (isMarkdown(rel)) setMdViews((p) => ({ ...p, [rel]: 'preview' }));
  }, [root, openEdit]);
  const openDiff = useCallback((rel: string) => { ensureDiff(rel, true); openTab('diff', rel); }, [ensureDiff, openTab]);
  const openHome = useCallback(() => {
    const tb = newHomeTab();
    openTab('home', '', { key: tb.key });
    setHomeFocus((n) => n + 1);
  }, [openTab]);

  /** Close one tab. The neighbour on the left takes over, and the last tab
   *  out is replaced by a home tab so the strip is never empty. */
  const closeTab = useCallback((key: string) => {
    const prev = tabsRef.current;
    const at = prev.findIndex((tb) => tb.key === key);
    if (at === -1) return;
    // The last editor tab onto unsaved text does not close (review finding 6):
    // its buffer used to stay behind with nothing on screen showing it, and the
    // panel then refused to close for no visible reason. Save it, or Discard
    // changes from the tab's menu.
    if (!canCloseTab(prev[at], editBuffersRef.current, prev)) return;
    let remaining = prev.filter((tb) => tb.key !== key);
    if (remaining.length === 0) remaining = [newHomeTab()];
    setTabs(remaining);
    setActiveKey((curr) => (curr !== key ? curr : remaining[Math.min(at, remaining.length - 1)].key));
  }, []);
  const closeOthers = useCallback((key: string) => {
    const keep = tabsRef.current.find((tb) => tb.key === key);
    if (!keep) return;
    // Every tab still holding unsaved text stays.
    setTabs(tabsAfterCloseOthers(tabsRef.current, key, editBuffersRef.current));
    setActiveKey(key);
  }, []);
  const closeRight = useCallback((key: string) => {
    const prev = tabsRef.current;
    const at = prev.findIndex((tb) => tb.key === key);
    if (at === -1) return;
    const remaining = tabsAfterCloseRight(prev, key, editBuffersRef.current);
    setTabs(remaining);
    setActiveKey((curr) => (remaining.some((tb) => tb.key === curr) ? curr : key));
  }, []);
  /** A second tab onto the same thing. Buffers are keyed by path, so two edit
   *  tabs on one file are two windows onto one buffer, never two copies. */
  const duplicateTab = useCallback((key: string) => {
    const src = tabsRef.current.find((tb) => tb.key === key);
    if (!src) return;
    if (src.mode === 'home') { openHome(); return; }
    const n = tabsRef.current.filter((tb) => tb.rel === src.rel && tb.mode === src.mode).length + 1;
    openTab(src.mode, src.rel, { ...src, key: `${src.key}#${n}` });
  }, [openHome, openTab]);

  const onEditChange = useCallback((rel: string, value: string) => {
    setEditBuffers((p) => (p[rel] ? { ...p, [rel]: { ...p[rel], content: value, saveState: 'idle' } } : p));
  }, []);

  // ─── Git status (changed files) ───────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    if (!root) { setIsRepo(false); return; }
    const repo = await window.cth.gitIsRepo(root);
    setIsRepo(repo);
    if (!repo) { setStatus(null); setBranch(null); return; }
    const [s, b] = await Promise.all([window.cth.gitStatus(root), window.cth.gitBranch(root)]);
    if (!('error' in s)) setStatus(s as GitStatusT);
    if (!('error' in b)) setBranch(b.current ?? (b.detached ? t('gitTab.detachedHead') : null));
  }, [root, t]);

  const save = useCallback(async (rel: string) => {
    if (!root) return;
    const buf = editBuffersRef.current[rel];
    if (!buf || buf.status !== 'ready' || buf.content === buf.original || buf.saveState === 'saving') return;
    setEditBuffers((p) => ({ ...p, [rel]: { ...p[rel], saveState: 'saving' } }));
    const res = await window.cth.writeFile(root, rel, buf.content);
    if (res.ok) {
      // original ← the exact snapshot written (buf.content captured at save-start), NOT p[rel].content:
      // if the user typed during the in-flight write, those keystrokes stay in content and remain dirty
      // (content !== original) so they're persisted on the next save instead of being silently dropped.
      setEditBuffers((p) => ({ ...p, [rel]: { ...p[rel], original: buf.content, saveState: 'saved' } }));
      setTimeout(() => setEditBuffers((p) => (p[rel] ? { ...p, [rel]: { ...p[rel], saveState: 'idle' } } : p)), 1200);
      void refreshStatus();
    } else {
      setEditBuffers((p) => ({ ...p, [rel]: { ...p[rel], saveState: 'error', error: res.error } }));
    }
  }, [root, refreshStatus]);

  useEffect(() => {
    void refreshStatus();
    const id = window.setInterval(() => { void refreshStatus(); }, 4000);
    return () => window.clearInterval(id);
  }, [refreshStatus]);

  const changedFiles = useMemo(() => {
    if (!status) return [];
    const map = new Map<string, string>();
    for (const e of status.unstaged) map.set(e.path, e.worktree);
    for (const e of status.staged) if (!map.has(e.path)) map.set(e.path, e.index);
    for (const p of status.untracked) if (!map.has(p)) map.set(p, '?');
    return [...map.entries()].map(([path, code]) => ({ path, code })).sort((a, b) => a.path.localeCompare(b.path));
  }, [status]);
  /** The same facts as badges on the tree rows, so the tree and the Changes
   *  list cannot disagree about which files moved. */
  const badges = useMemo(() => Object.fromEntries(changedFiles.map((f) => [f.path, f.code])), [changedFiles]);

  const anyDirty = useMemo(
    () => Object.values(editBuffers).some((b) => b.status === 'ready' && b.content !== b.original),
    [editBuffers]
  );
  const anyDirtyRef = useRef(anyDirty); anyDirtyRef.current = anyDirty;
  /** The one way out of the panel. Closing unmounts it and every unsaved buffer
   *  with it, so it is refused while anything is unsaved, the same rule the
   *  project switcher follows. Escape always did this; the X button did not,
   *  and discarded the edits without a word (0.5.3, found with bug 13). */
  const requestClose = useCallback(() => { if (!anyDirtyRef.current) setIdeOpen(false); }, [setIdeOpen]);

  // Unsaved text is NEVER without a tab (review finding 6). A refusal to close
  // with nothing on screen to explain it is an IDE that cannot be closed. A
  // dirty tab no longer closes, so this should find nothing; if a restore or
  // the tab cap ever leaves one behind, it is put back in front of the person
  // at once, not when they next try to leave.
  useEffect(() => {
    for (const rel of orphanDirtyRels(tabs, editBuffers)) openTab('edit', rel);
  }, [tabs, editBuffers, openTab]);

  /** Put a file back to what is on disk. The one way out of unsaved text that
   *  is not saving it, for the save that keeps failing; a person chooses it. */
  const discardTab = useCallback((key: string) => {
    const tb = tabsRef.current.find((x) => x.key === key);
    if (tb && tb.mode === 'edit') setEditBuffers((p) => discardChanges(p, tb.rel) as Record<string, EditBuffer>);
  }, []);

  // Main is told HOW MANY files are unsaved, never the text, so quitting can
  // say so (finding 15). Zero on unmount: a closed IDE holds nothing.
  const unsaved = useMemo(() => dirtyCount(editBuffers), [editBuffers]);
  useEffect(() => { window.cth.ideDirty?.(unsaved); }, [unsaved]);
  useEffect(() => () => { window.cth.ideDirty?.(0); }, []);

  /* ─── Phase 9: switching workspace, searching it, editing its tree ───────── */

  /** Every workspace this window can reach, newest agent first, deduped by
   *  directory: two agents in one worktree are one place to go, not two. */
  const workspaces = useMemo(() => {
    const seen = new Set<string>();
    const out: { agent: Agent; cwd: string }[] = [];
    for (const a of agents) {
      if (!a.cwd || seen.has(a.cwd)) continue;
      seen.add(a.cwd);
      out.push({ agent: a, cwd: a.cwd });
    }
    return out;
  }, [agents]);

  /**
   * Point the IDE at another workspace. Everything below the root is discarded
   * rather than translated: a tab is a path relative to the root it was opened
   * under. Refused outright while anything is unsaved: the alternative is a
   * confirmation nobody reads standing between a person and their own edit.
   */
  const switchTo = useCallback((next: { agent: Agent; cwd: string }) => {
    setSwitcherOpen(false);
    if (anyDirtyRef.current || next.cwd === root) return;
    setTabs([newHomeTab()]);
    setActiveKey(null);
    setEditBuffers({});
    setDiffData({});
    setStatus(null);
    setBranch(null);
    setIsRepo(null);
    setGitRoot(null);
    setReveal(null);
    setSideTab('explorer');
    setSearchQuery(undefined);
    setCreatingIn(null);
    setCaret(undefined);
    setJump(null);
    setActiveHeading(-1);
    setRecent(readRecent(next.cwd));
    setTarget({ agent: next.agent, root: next.cwd, inferred: false });
  }, [root]);

  /** A search hit: open the file, then ask the editor for that line. Both, in
   *  that order, because the reveal has to survive the buffer arriving late. */
  const openHit = useCallback((rel: string, line: number, col: number, length: number) => {
    openEdit(rel);
    setReveal({ rel, line, col, length, nonce: Date.now() });
  }, [openEdit]);

  /** The quick open's "show all": the Search tab takes the question over. */
  const showAllInSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSideTab('search');
    setSearchFocus((n) => n + 1);
  }, []);

  /** The tree owns the gesture; this owns the IPC. Errors come back as text
   *  the tree prints on the row. */
  const fileOps: FileTreeOps | undefined = useMemo(() => {
    if (!root) return undefined;
    const at = (parent: string, name: string) => (parent ? `${parent}/${name}` : name);
    const err = (r: { ok: true } | { ok: false; error: string }) => (r.ok ? null : r.error);
    return {
      newFile: async (parent, name) => err(await window.cth.createFile(root, at(parent, name))),
      newFolder: async (parent, name) => err(await window.cth.makeDir(root, at(parent, name))),
      rename: async (rel, nextName) => {
        const i = rel.lastIndexOf('/');
        return err(await window.cth.renamePath(root, rel, at(i === -1 ? '' : rel.slice(0, i), nextName)));
      },
      remove: async (rel) => {
        const r = await window.cth.trashPath(root, rel);
        if (!r.ok) return r.error;
        // Its unsaved text goes with it: the person deleted the file, and a buffer
        // for a file that is gone can never be saved, only block (finding 6).
        // Before the tabs close, so a dirty one is no longer held.
        editBuffersRef.current = buffersAfterTrash(editBuffersRef.current, rel);
        setEditBuffers((p) => buffersAfterTrash(p, rel));
        // A tab onto something that is now in the bin is a tab onto nothing.
        for (const tab of tabsRef.current) {
          if (tab.mode !== 'home' && (tab.rel === rel || tab.rel.startsWith(`${rel}/`))) closeTab(tab.key);
        }
        return null;
      }
    };
  }, [root, closeTab]);

  /** Where a new file goes by default: the folder of whatever is open, or the
   *  workspace root when nothing is. A breadcrumb click overrides it. */
  const defaultNewFolder = useCallback(() => {
    const tb = tabsRef.current.find((x) => x.key === activeKeyRef.current);
    return tb && tb.mode !== 'home' ? parentOfRel(tb.rel) : '';
  }, []);
  const startNewFile = useCallback(() => setCreatingIn((cur) => (cur === null ? defaultNewFolder() : cur)), [defaultNewFolder]);

  /** A file that has just been made: open it, and put the caret in it. */
  const onCreated = useCallback((rel: string) => {
    setCreatingIn(null);
    openEdit(rel);
    setReveal({ rel, line: 1, col: 1, length: 0, nonce: Date.now() });
    setRefreshNonce((n) => n + 1);
  }, [openEdit]);

  const copyAbs = useCallback((rel: string) => {
    if (root) navigator.clipboard.writeText(rel ? `${root}/${rel}` : root).catch(() => { /* noop */ });
  }, [root]);

  /** Reveal in Explorer: the tree's active row follows the active tab, so
   *  showing the tab's file is a matter of bringing the Explorer forward. */
  const revealTab = useCallback((key: string) => {
    setActiveKey(key);
    setSideTab('explorer');
  }, []);

  // The keyboard comes to the panel when it opens and goes back when it closes
  // (0.5.3 review, finding 7; the why is on takeFocusForPanel).
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => takeFocusForPanel(panelRef.current, document), []);
  // The editor on screen, for Cmd/Ctrl+F pressed outside its text (ideFind.ts).
  const findEditorRef = useRef<MonacoInstance | null>(null);

  // ─── Keyboard ─────────────────────────────────────────────────────────────
  // Only bindings that do something. ⌘W is not here: on macOS the app menu
  // claims it for "close window", and shadowing it would close a tab in the
  // IDE and the whole window everywhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+F (and the replace chord) opens the editor's find bar even
      // when the caret is on the tree or a tab. Inside the text Monaco has
      // already taken the key, and the rule leaves it be.
      if (routeFindKey(e, {
        editor: () => {
          const ed = findEditorRef.current;
          return ed && ed.getDomNode()?.isConnected ? ed : null;
        },
        inIde: () => {
          const a = document.activeElement;
          return !a || a === document.body || !!panelRef.current?.contains(a);
        },
        covered: () => coveredAboveIde(document, window),
        mac: IS_MAC_PLATFORM
      })) {
        e.preventDefault();
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 's' || e.key === 'S')) {
        const tb = tabsRef.current.find((x) => x.key === activeKeyRef.current);
        if (tb && tb.mode === 'edit') { e.preventDefault(); void save(tb.rel); }
        return;
      }
      if (mod && !e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        startNewFile();
        return;
      }
      // ⌘P is the quick open in the top bar: files, lines and commands.
      if (mod && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setQuickFocus((n) => n + 1);
        return;
      }
      // ⇧⌘F is the Search tab of the sidebar.
      if (mod && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setSideTab('search');
        setSearchFocus((n) => n + 1);
        return;
      }
      if (e.key === 'Escape') {
        // Esc unwinds one layer at a time: the sheet, then the dialog, then the
        // switcher, then the panel. Closing the whole IDE out from under an
        // open dialog is how a half typed name gets lost.
        if (keysOpen) { setKeysOpen(false); return; }
        if (creatingIn !== null) { setCreatingIn(null); return; }
        if (switcherOpen) { setSwitcherOpen(false); return; }
        requestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, requestClose, startNewFile, keysOpen, creatingIn, switcherOpen]);

  // ─── Sidebar splitter drag ────────────────────────────────────────────────
  const startDrag = (e: React.MouseEvent) => {
    const startX = e.clientX; const startW = sideWidth;
    let w = startW;
    const onMove = (ev: MouseEvent) => { w = Math.min(520, Math.max(200, startW + (ev.clientX - startX))); setSideWidth(w); };
    const onUp = () => {
      document.body.style.cursor = '';
      try { window.localStorage.setItem(LS_SIDE_WIDTH, String(w)); } catch { /* private mode */ }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    document.body.style.cursor = 'ew-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  };

  // Image tabs highlight in the tree too — the tree's job is "what am I looking
  // at", and an image is as much "open" as a text file is.
  const activeEditRel = activeTab && (activeTab.mode === 'edit' || activeTab.mode === 'image')
    ? activeTab.rel
    : undefined;

  const stripItems: TabStripItem[] = useMemo(() => tabs.map((tb) => {
    const buf = editBuffers[tb.rel];
    return {
      key: tb.key, kind: tb.mode, rel: tb.rel,
      label: tb.mode === 'home' ? t('ide.frame.home') : basename(tb.rel),
      dirty: tb.mode === 'edit' && !!buf && buf.status === 'ready' && buf.content !== buf.original,
      closeBlocked: !canCloseTab(tb, editBuffers, tabs),
      revLabel: tb.revLabel
    };
  }), [tabs, editBuffers, t]);

  const folderName = root ? basename(root) : '';
  const homeSubtitle = root
    ? (branch ? t('ide.frame.homeSubtitle', { folder: folderName, branch, count: changedFiles.length }) : folderName)
    : '';

  return (
    <div ref={panelRef} tabIndex={-1} data-ide-panel style={{
      outline: 'none',
      position: 'fixed', inset: 0, zIndex: IDE_Z_INDEX,
      background: 'var(--cth-paper-100)', color: 'var(--cth-ink-900)',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--cth-font-ui)', fontSize: 12.5,
      paddingTop: 40
    }}>
      {/* ── Top bar: the workspace, the one search, the few actions ── */}
      <div
        className="cth-titlebar-drag"
        data-ide-top
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 40,
          background: 'var(--cth-cream-50)', borderBottom: LINE,
          display: 'flex', alignItems: 'center', gap: 10,
          paddingLeft: 88, paddingRight: 10, userSelect: 'none'
        }}
      >
        <div style={{ position: 'relative', minWidth: 0 }} className="cth-titlebar-nodrag">
          <button
            type="button"
            onClick={() => { if (workspaces.length > 1 && !anyDirty) setSwitcherOpen((v) => !v); }}
            aria-haspopup={workspaces.length > 1 ? 'menu' : undefined}
            aria-expanded={switcherOpen}
            title={target.inferred && target.agent
              ? t('idePanel.workspaceInferred', { name: target.agent.name })
              : anyDirty && workspaces.length > 1 ? t('idePanel.switchBlocked')
              : workspaces.length > 1 ? t('idePanel.switchWorkspace') : (root ?? '')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, height: 28, padding: '0 8px 0 4px', borderRadius: RADIUS,
              border: 'none', background: switcherOpen ? HOVER : 'transparent', font: 'inherit', color: 'inherit',
              cursor: workspaces.length > 1 && !anyDirty ? 'pointer' : 'default', maxWidth: 320, minWidth: 0, textAlign: 'start'
            }}
          >
            {target.agent ? <SpritePortrait character={target.agent.character} size={22} /> : <IdeIcon name="folder" size={16} style={{ color: 'var(--cth-ink-500)' }} />}
            <span style={{ minWidth: 0, display: 'grid', lineHeight: 1.2 }}>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {target.agent ? t('idePanel.workspace', { name: target.agent.name }) : t('idePanel.noAgent')}
                {target.inferred ? <span style={{ fontWeight: 400, color: 'var(--cth-ink-500)' }}> ({t('idePanel.assumed')})</span> : null}
              </span>
              <span style={{ fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--cth-font-mono)' }}>
                {root ? basename(root) : t('idePanel.noWorkspace')}
              </span>
            </span>
            {workspaces.length > 1 && <IdeIcon name="chevron" size={12} style={{ color: 'var(--cth-ink-500)', transform: 'rotate(90deg)' }} />}
          </button>
          {switcherOpen && !anyDirty && (
            <>
              <div onClick={() => setSwitcherOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 399 }} />
              <div role="menu" style={{
                position: 'absolute', top: '100%', insetInlineStart: 0, marginTop: 4, zIndex: 400,
                minWidth: 280, maxHeight: '52vh', overflowY: 'auto', padding: 6,
                background: 'var(--cth-cream-50)', border: LINE,
                borderRadius: 10, boxShadow: 'var(--cth-shadow-hard)',
                display: 'flex', flexDirection: 'column', gap: 1
              }}>
                {workspaces.map((w) => {
                  const here = w.cwd === root;
                  return (
                    <button
                      key={w.cwd}
                      type="button"
                      role="menuitem"
                      onClick={() => switchTo(w)}
                      disabled={here}
                      title={w.cwd}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 8px',
                        border: 'none', borderRadius: 6, textAlign: 'start', font: 'inherit', color: 'inherit',
                        cursor: here ? 'default' : 'pointer', background: here ? HOVER : 'transparent', minWidth: 0
                      }}>
                      <SpritePortrait character={w.agent.character} size={20} />
                      <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{w.agent.name}{here ? ` · ${t('idePanel.here')}` : ''}</span>
                      <span style={{
                        flex: 1, minWidth: 0, fontSize: 11, fontFamily: 'var(--cth-font-mono)', color: 'var(--cth-ink-500)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'start'
                      }}>{w.cwd}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <span style={{ flex: 1 }} />
        {root && (
          <div className="cth-titlebar-nodrag" style={{ width: 'min(520px, 44vw)' }}>
            <QuickOpen
              root={root}
              focusNonce={quickFocus}
              onOpen={openEdit}
              onOpenHit={openHit}
              onNewFile={startNewFile}
              onShowAll={showAllInSearch}
            />
          </div>
        )}
        <span style={{ flex: 1 }} />
        <div className="cth-titlebar-nodrag" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {root && (
            <button type="button" onClick={startNewFile} title={t('ide.keys.newFile')} style={ghostBtn}>
              <IdeIcon name="newFile" size={14} />{t('ide.create.title')}
            </button>
          )}
          <button type="button" onClick={() => setKeysOpen((v) => !v)} title={t('ide.keys.title')} aria-label={t('ide.keys.title')} style={iconBtn}>
            <IdeIcon name="keys" size={15} />
          </button>
          <button
            type="button"
            onClick={requestClose}
            title={anyDirty ? t('idePanel.closeBlocked') : t('idePanel.closeIde')}
            aria-label={t('idePanel.closeIde')}
            style={{ ...smallBtn, height: 26 }}
          >
            {t('ide.frame.close')}<span style={kbd}>Esc</span>
          </button>
        </div>
      </div>

      {/* Body */}
      {!root ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: 24, textAlign: 'center', color: 'var(--cth-ink-500)'
        }}>
          <IdeIcon name="folder" size={28} style={{ color: IDE_YELLOW }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{t('idePanel.noWorkspace')}</div>
          <div style={{ fontSize: 13, maxWidth: 460, lineHeight: 1.5 }}>{t('idePanel.emptyWhy')}</div>
          <ol style={{ margin: 0, paddingInlineStart: 20, textAlign: 'start', fontSize: 13, lineHeight: 1.6, color: 'var(--cth-ink-700)' }}>
            <li>{t('idePanel.emptyStep1')}</li>
            <li>{t('idePanel.emptyStep2')}</li>
            <li>{t('idePanel.emptyStep3')}</li>
          </ol>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {/* ── Sidebar: Explorer · Search · Source control ── */}
          <aside data-ide-side style={{
            width: sideWidth, flexShrink: 0, minHeight: 0,
            display: 'flex', flexDirection: 'column',
            borderRight: LINE, background: 'var(--cth-cream-50)'
          }}>
            <SidebarTabs current={sideTab} changedCount={changedFiles.length} onChange={(next) => { setSideTab(next); if (next === 'search') setSearchFocus((n) => n + 1); }} />
            {/* All three stay mounted. Glancing at the tree after a search and
                coming back to an empty results list would make the pane feel
                like it had forgotten the question. */}
            <section data-side-pane="explorer" className={IDE_PANE_CLASS} style={{ flex: 1, minHeight: 0, display: sideTab === 'explorer' ? 'flex' : 'none', flexDirection: 'column' }}>
              <PaneHeader
                title={folderName}
                actions={(
                  <>
                    <button type="button" onClick={() => setCreatingIn(defaultNewFolder())} title={t('ide.create.title')} aria-label={t('ide.create.title')} style={{ ...iconBtn, width: 20, height: 20 }}><IdeIcon name="newFile" size={13} /></button>
                    <button type="button" onClick={() => setCollapseNonce((n) => n + 1)} title={t('ide.frame.collapseAll')} aria-label={t('ide.frame.collapseAll')} style={{ ...iconBtn, width: 20, height: 20 }}><IdeIcon name="collapse" size={13} /></button>
                    <button type="button" onClick={() => setRefreshNonce((n) => n + 1)} title={t('idePanel.refresh')} aria-label={t('idePanel.refresh')} style={{ ...iconBtn, width: 20, height: 20 }}><IdeIcon name="refresh" size={13} /></button>
                  </>
                )}
              />
              <div style={{ flex: 1, minHeight: 0 }}>
                <FileTree
                  root={root}
                  activeRel={activeEditRel}
                  onOpenFile={openEdit}
                  onCopyPath={copyAbs}
                  ops={fileOps}
                  badges={badges}
                  collapseNonce={collapseNonce}
                  refreshNonce={refreshNonce}
                  dense
                />
              </div>
            </section>
            <section data-side-pane="search" style={{ flex: 1, minHeight: 0, display: sideTab === 'search' ? 'flex' : 'none', flexDirection: 'column' }}>
              <SearchPane key={root} root={root} focusNonce={searchFocus} query={searchQuery} onOpen={openEdit} onOpenHit={openHit} />
            </section>
            <section data-side-pane="git" className={IDE_PANE_CLASS} style={{ flex: 1, minHeight: 0, display: sideTab === 'git' ? 'flex' : 'none', flexDirection: 'column' }}>
              <SourceControlPane
                root={root}
                gitRoot={gitRoot}
                isRepo={isRepo}
                changed={changedFiles}
                activeRel={activeTab?.mode === 'diff' ? activeTab.rel : undefined}
                onOpenDiff={openDiff}
                onRefresh={() => { void refreshStatus(); }}
                onOpenRevDiff={openRevDiff}
              />
            </section>
          </aside>
          {/* Splitter */}
          <div onMouseDown={startDrag} title={t('ide.frame.resize')} style={{ width: 4, marginLeft: -2, cursor: 'ew-resize', flexShrink: 0, zIndex: 1 }} />

          {/* ── Editor column: tabs, crumbs, the pane, the status line ── */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--cth-paper-100)' }}>
            <TabStrip
              tabs={stripItems}
              activeKey={activeTab?.key ?? null}
              onSelect={setActiveKey}
              onClose={closeTab}
              onCloseOthers={closeOthers}
              onCloseRight={closeRight}
              onDiscard={discardTab}
              onDuplicate={duplicateTab}
              onCopyPath={(key) => { const tb = tabsRef.current.find((x) => x.key === key); if (tb && tb.mode !== 'home') copyAbs(tb.rel); }}
              onReveal={revealTab}
              onNewHome={openHome}
            />

            <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {activeTab?.mode === 'home' && (
                <HomeTab
                  root={root}
                  title={target.agent ? t('idePanel.workspace', { name: target.agent.name }) : folderName}
                  subtitle={homeSubtitle}
                  recent={recent}
                  changed={changedFiles}
                  focusNonce={homeFocus}
                  onOpen={openEdit}
                  onOpenHit={openHit}
                  onOpenDiff={openDiff}
                  onNewFile={startNewFile}
                  onQuickOpen={() => setQuickFocus((n) => n + 1)}
                  onFindInFiles={(query?: string) => { if (query) setSearchQuery(query); setSideTab('search'); setSearchFocus((n) => n + 1); }}
                />
              )}

              {/* The image preview draws its own bar (the path, the size, fit
                  or 1:1, view source, copy path), so it gets no crumb bar on
                  top: two bars over one picture is the old layout's mistake. */}
              {activeTab?.mode === 'image' && (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ImagePreview
                    // Keyed by path so switching image tabs tears the previous
                    // preview down — that unmount is what revokes its blob URL.
                    key={activeTab.key}
                    root={root}
                    rel={activeTab.rel}
                    onCopyPath={() => copyAbs(activeTab.rel)}
                    onViewSource={isSvgPath(activeTab.rel) ? () => openSource(activeTab.rel) : undefined}
                  />
                </div>
              )}

              {activeTab?.mode === 'edit' && (() => {
                const buf = editBuffers[activeTab.rel];
                const md = isMarkdown(activeTab.rel);
                const view: MdView = md ? (mdViews[activeTab.rel] ?? defaultMdView()) : 'code';
                const dirty = !!buf && buf.status === 'ready' && buf.content !== buf.original;
                const crumbs = (
                  <CrumbBar root={root} rel={activeTab.rel} onPickFolder={(folder) => setCreatingIn(folder)}
                    right={(
                      <>
                        {md && (
                          <>
                            <span role="radiogroup" aria-label={t('idePanel.mdPreview')} style={{ display: 'inline-flex', padding: 2, gap: 1, background: 'var(--cth-cream-100)', border: LINE, borderRadius: RADIUS }}>
                              {(['code', 'split', 'preview'] as const).map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  role="radio"
                                  aria-checked={view === v}
                                  onClick={() => setMdView(activeTab.rel, v)}
                                  title={v === 'code' ? t('idePanel.mdSourceOnly') : v === 'split' ? t('idePanel.mdSplit') : t('idePanel.mdPreview')}
                                  style={{
                                    height: 20, padding: '0 8px', border: 'none', borderRadius: 5, font: 'inherit', fontSize: 11.5, cursor: 'pointer',
                                    background: view === v ? 'var(--cth-cream-50)' : 'transparent', color: view === v ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)',
                                    fontWeight: view === v ? 500 : 400, boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.08)' : undefined
                                  }}
                                >{v === 'code' ? t('idePanel.code') : v === 'split' ? t('idePanel.split') : t('idePanel.preview')}</button>
                              ))}
                            </span>
                            <button type="button" onClick={toggleOutline} aria-pressed={outlineOn} title={t('ide.md.outlineToggle')} aria-label={t('ide.md.outlineToggle')}
                              style={{ ...iconBtn, background: outlineOn ? HOVER : 'transparent', color: outlineOn ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)' }}>
                              <IdeIcon name="list" size={14} />
                            </button>
                          </>
                        )}
                        {isImagePath(activeTab.rel) && (
                          <button type="button" onClick={() => openTab('image', activeTab.rel)} title={t('idePanel.viewImage')} style={ghostBtn}><IdeIcon name="fileImage" size={13} />{t('idePanel.viewImage')}</button>
                        )}
                        <button type="button" onClick={() => copyAbs(activeTab.rel)} title={t('idePanel.copyPath')} aria-label={t('idePanel.copyPath')} style={iconBtn}><IdeIcon name="copy" size={14} /></button>
                        {buf && <SaveChip dirty={dirty} saveState={buf.saveState} error={buf.error} onSave={() => void save(activeTab.rel)} />}
                      </>
                    )} />
                );
                if (!buf || buf.status === 'loading') return <>{crumbs}<Centered>{t('ide.status.loadingFile')}</Centered></>;
                if (buf.status === 'error') return <>{crumbs}<Centered tone="error">{buf.error}</Centered></>;
                const outline = md ? markdownOutline(buf.content) : [];
                return (
                  <>
                    {crumbs}
                    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                      {/* The outline sits beside BOTH halves, not inside the
                          preview: in split view it is still the document's
                          table of contents, and in code view its jump lands the
                          editor's caret on the heading's own line. */}
                      {md && outlineOn && (
                        <OutlinePane
                          entries={outline}
                          source={buf.content}
                          activeIndex={view === 'code' ? -1 : activeHeading}
                          onJump={(entry) => {
                            setJump({ index: entry.index, nonce: Date.now() });
                            setReveal({ rel: activeTab.rel, line: entry.line, col: 1, length: 0, nonce: Date.now() });
                          }}
                        />
                      )}
                      {view !== 'preview' && (
                        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                          <MonacoEditor
                            path={activeTab.rel}
                            value={buf.content}
                            onChange={(v) => onEditChange(activeTab.rel, v)}
                            onSave={() => void save(activeTab.rel)}
                            onCaret={setCaret}
                            onEditor={(ed) => { findEditorRef.current = ed; }}
                            // Only for the file the hit was in: one editor
                            // instance serves every tab, so an unguarded reveal
                            // would jump to line 40 of whatever you opened next.
                            reveal={reveal && reveal.rel === activeTab.rel ? reveal : undefined}
                          />
                        </div>
                      )}
                      {md && view !== 'code' && (
                        <MarkdownBody
                          rel={activeTab.rel}
                          root={root}
                          source={buf.content}
                          split={view === 'split'}
                          outline={outline}
                          jump={jump}
                          onActive={setActiveHeading}
                          onOpenMarkdownLink={(link) => {
                            openSource(link);
                            setMdViews((p) => ({ ...p, [link]: 'preview' }));
                          }}
                        />
                      )}
                    </div>
                  </>
                );
              })()}

              {(activeTab?.mode === 'diff' || activeTab?.mode === 'revdiff') && (() => {
                const dataKey = activeTab.mode === 'diff' ? activeTab.rel : activeTab.key;
                const d = diffData[dataKey];
                const crumbs = (
                  <CrumbBar root={root} rel={activeTab.rel} onPickFolder={(folder) => setCreatingIn(folder)}
                    right={(
                      <>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, height: 20, padding: '0 7px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                          fontFamily: activeTab.mode === 'revdiff' ? 'var(--cth-font-mono)' : undefined,
                          background: activeTab.mode === 'revdiff' ? 'var(--cth-lilac-light)' : 'var(--cth-sky-light)', color: 'var(--cth-ink-900)'
                        }}>
                          {activeTab.mode === 'revdiff' ? (activeTab.revLabel ?? `${activeTab.revA} → ${activeTab.revB}`) : `HEAD · ${t('idePanel.workingTree')}`}
                        </span>
                        {activeTab.mode === 'diff' && (
                          <button type="button" onClick={() => ensureDiff(activeTab.rel, true)} title={t('idePanel.refreshDiff')} aria-label={t('idePanel.refreshDiff')} style={iconBtn}><IdeIcon name="refresh" size={14} /></button>
                        )}
                        <button type="button" onClick={() => openEdit(activeTab.rel)} style={ghostBtn}><IdeIcon name="code" size={13} />{t('ide.frame.openFile')}</button>
                      </>
                    )} />
                );
                if (!d || d.status === 'loading') return <>{crumbs}<Centered>{t('idePanel.loadingDiff')}</Centered></>;
                if (d.status === 'error') return <>{crumbs}<Centered tone="error">{d.error}</Centered></>;
                if (d.status === 'binary') return <>{crumbs}<Centered>{t('idePanel.binaryDiff')}</Centered></>;
                return (
                  <>
                    {crumbs}
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <MonacoDiff path={activeTab.rel} original={d.head} modified={d.working} />
                    </div>
                  </>
                );
              })()}

              {keysOpen && <ShortcutSheet onClose={() => setKeysOpen(false)} />}
            </div>

            {/* The status line. For an open file it reads the buffer and the
                caret; for everything else it still says where you are. */}
            {activeTab?.mode === 'edit' && editBuffers[activeTab.rel]?.status === 'ready' ? (() => {
              const buf = editBuffers[activeTab.rel];
              // The save chip lives in the crumb bar now, so the status line
              // is given no save state: one chip, one place.
              return (
                <EditorStatusBar
                  content={buf.content}
                  caret={caret}
                  languageId={languageForPath(activeTab.rel)}
                  branch={branch ?? undefined}
                  onShowKeys={() => setKeysOpen(true)}
                />
              );
            })() : (
              <div data-ide-status style={{
                height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '0 6px 0 12px',
                borderTop: LINE, background: 'var(--cth-cream-50)', fontSize: 11, color: 'var(--cth-ink-500)',
                fontFamily: 'var(--cth-font-mono)', fontVariantNumeric: 'tabular-nums'
              }}>
                {branch && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--cth-font-ui)' }}><IdeIcon name="git" size={12} />{branch}</span>}
                {isRepo === false && <span style={{ fontFamily: 'var(--cth-font-ui)' }}>{t('gitTab.notARepo')}</span>}
                {changedFiles.length > 0 && <span style={{ fontFamily: 'var(--cth-font-ui)' }}>{t('ide.frame.changedCount', { count: changedFiles.length })}</span>}
                <span style={{ flex: 1 }} />
                <button type="button" onClick={() => setKeysOpen(true)} title={t('ide.keys.title')} aria-label={t('ide.keys.title')} style={{ ...iconBtn, width: 22, height: 22 }}><IdeIcon name="keys" size={13} /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW FILE (0.4.9 phase 8). Rendered at the panel's own level so it sits
          above every pane, and only ever while a workspace is open. */}
      {creatingIn !== null && root && (
        <NewFileDialog
          root={root}
          folderRel={creatingIn}
          onCreated={onCreated}
          onClose={() => setCreatingIn(null)}
        />
      )}
    </div>
  );
}

/**
 * The bar above the pane: the breadcrumb on the left (every folder a button
 * that aims the new file field), the per file controls on the right.
 */
function CrumbBar({ root, rel, onPickFolder, right }: { root: string; rel: string; onPickFolder: (folderRel: string) => void; right?: React.ReactNode }) {
  return (
    <div data-ide-crumbs style={{
      height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px 0 12px',
      borderBottom: LINE, background: 'var(--cth-paper-100)', minWidth: 0
    }}>
      <Breadcrumb root={root} rel={rel} onPickFolder={onPickFolder} />
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>{right}</span>
    </div>
  );
}

function Centered({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, textAlign: 'center', fontSize: 13,
      color: tone === 'error' ? 'var(--cth-coral)' : 'var(--cth-ink-500)'
    }}>{children}</div>
  );
}

// The accent is referenced by the crumb bar's controls through the shared
// constants above; exported for the frame test, which pins that every PRO
// token this surface names carries a Classic fallback.
export const IDE_FRAME_TOKENS = { ACCENT, ACCENT_INK, ACCENT_SOFT, HOVER } as const;

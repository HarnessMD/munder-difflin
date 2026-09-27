import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { FileIcon, IDE_YELLOW, IdeIcon, gitCodeColor } from '@/ide/ideIcons';
import { IDE_ROW_CLASS, ensureIdeSidebarStyle } from '@/ide/SidebarChrome';

interface DirEntry {
  name: string;
  isDir: boolean;
  size: number;
  mtime: number;
}

interface NodeState {
  rel: string;        // relative to root; '' for root
  name: string;
  isDir: boolean;
  expanded: boolean;
  children?: NodeState[]; // loaded lazily
  loading?: boolean;
  error?: string;
}

/**
 * FILE OPERATIONS (0.4.9 phase 9). Optional: the tree is a viewer without
 * them, which is what the dead FilesTab and any future read-only mount want.
 *
 * The tree owns the GESTURE (which row, what the person typed, when to
 * reload); the caller owns the ACTION, so the one place that knows about
 * roots and IPC stays the one place that talks to main. Each returns an error
 * string, or null when it worked — the tree shows it on the row rather than
 * in a dialog nobody asked for.
 */
export interface FileTreeOps {
  newFile: (parentRel: string, name: string) => Promise<string | null>;
  newFolder: (parentRel: string, name: string) => Promise<string | null>;
  rename: (rel: string, nextName: string) => Promise<string | null>;
  /** Deletes to the OS bin. The label says so, which is why there is no
   *  confirmation step in front of it. */
  remove: (rel: string, isDir: boolean) => Promise<string | null>;
}

export interface FileTreeProps {
  root: string;
  /** Active file (relative path, no leading slash) */
  activeRel?: string;
  onOpenFile: (rel: string) => void;
  onCopyPath: (rel: string) => void;
  ops?: FileTreeOps;
  /**
   * THE IDE'S TREE (0.4.11 redesign, founder approved 5 Sep 2026). With
   * `dense` the rows are the sidebar's: 24px, the UI face, the glyphs from
   * ideIcons (files in the app's yellow), chevron carets, a hover ground, the
   * active row on the accent's soft tint with a yellow bar, and no per row
   * copy button (the context menu has Copy path). Without it the tree renders
   * exactly as it did, which is what Classic's FilesTab still mounts.
   */
  dense?: boolean;
  /** A git letter per changed file (rel → M, A, D, R, ?), drawn at the row's
   *  end so the tree and the Changes list agree about what changed. A folder
   *  with changes inside it carries a quiet dot while it is closed. */
  badges?: Record<string, string>;
  /** Bump to collapse every folder. 0 and undefined do nothing. */
  collapseNonce?: number;
  /** Bump to re-read the root, keeping open folders open. 0 and undefined do nothing. */
  refreshNonce?: number;
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}K`;
  return `${(n / 1024 / 1024).toFixed(1)}M`;
}

const HIDE_PATTERNS = [/^\.git$/, /^node_modules$/, /^out$/, /^dist$/];

const parentOf = (rel: string): string => {
  const i = rel.lastIndexOf('/');
  return i === -1 ? '' : rel.slice(0, i);
};

/** What the tree is currently asking the person to type. */
type Editing =
  | { kind: 'new-file' | 'new-folder'; parentRel: string }
  | { kind: 'rename'; rel: string; initial: string };

/** Every folder closed except the root, subtrees kept so reopening is free. */
const collapseAll = (node: NodeState): NodeState => ({
  ...node,
  expanded: node.rel === '' ? node.expanded : false,
  children: node.children?.map(collapseAll)
});

export function FileTree({ root, activeRel, onOpenFile, onCopyPath, ops, dense, badges, collapseNonce, refreshNonce }: FileTreeProps) {
  const { t } = useTranslation();
  const [tree, setTree] = useState<NodeState>({
    rel: '', name: 'root', isDir: true, expanded: true
  });
  const [menu, setMenu] = useState<{ x: number; y: number; node: NodeState } | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [opError, setOpError] = useState<{ rel: string; message: string } | null>(null);
  if (dense) ensureIdeSidebarStyle();

  /** The folders that hold a changed file, so a closed one can say so. */
  const changedDirs = useMemo(() => {
    const s = new Set<string>();
    for (const rel of Object.keys(badges ?? {})) {
      let i = rel.lastIndexOf('/');
      while (i > 0) { s.add(rel.slice(0, i)); i = rel.lastIndexOf('/', i - 1); }
    }
    return s;
  }, [badges]);

  const loadDir = useCallback(async (rel: string) => {
    const res = await window.cth.listDir(root, rel);
    if (!res.ok) return { error: res.error };
    const filtered = res.entries.filter(e => !HIDE_PATTERNS.some(re => re.test(e.name)));
    return { children: filtered.map((e: DirEntry): NodeState => ({
      rel: rel ? `${rel}/${e.name}` : e.name,
      name: e.name,
      isDir: e.isDir,
      expanded: false
    })) };
  }, [root]);

  // Initial root load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await loadDir('');
      if (cancelled) return;
      setTree(prev => ({ ...prev, ...res }));
    })();
    return () => { cancelled = true; };
  }, [loadDir]);

  /** Update a node deep in the tree by rel path. */
  const updateNode = useCallback((rel: string, patch: Partial<NodeState> | ((n: NodeState) => Partial<NodeState>)) => {
    setTree(prev => {
      const apply = (node: NodeState): NodeState => {
        if (node.rel === rel) {
          const p = typeof patch === 'function' ? patch(node) : patch;
          return { ...node, ...p };
        }
        if (!node.children) return node;
        return { ...node, children: node.children.map(apply) };
      };
      return apply(prev);
    });
  }, []);

  /** Re-read one directory after an operation changed it. Only that one: a
   *  full reload would collapse every folder the person had opened. */
  const reloadDir = useCallback(async (rel: string) => {
    const res = await loadDir(rel);
    if ('error' in res && res.error) { updateNode(rel, { error: res.error }); return; }
    // Anything already open under here stays open: children are matched by rel
    // and their loaded subtrees carried across.
    setTree(prev => {
      const apply = (node: NodeState): NodeState => {
        if (node.rel === rel) {
          const before = new Map((node.children ?? []).map((c) => [c.rel, c]));
          const children = (res.children ?? []).map((c) => {
            const old = before.get(c.rel);
            return old ? { ...c, expanded: old.expanded, children: old.children } : c;
          });
          return { ...node, children, error: undefined, expanded: true };
        }
        if (!node.children) return node;
        return { ...node, children: node.children.map(apply) };
      };
      return apply(prev);
    });
  }, [loadDir, updateNode]);

  // The sidebar header's two nonces (0.4.11): collapse everything, or read the
  // root again with every open folder kept open. Zero is the resting value.
  useEffect(() => { if (collapseNonce) setTree(collapseAll); }, [collapseNonce]);
  useEffect(() => { if (refreshNonce) void reloadDir(''); }, [refreshNonce, reloadDir]);

  const toggle = useCallback(async (node: NodeState) => {
    if (!node.isDir) {
      onOpenFile(node.rel);
      return;
    }
    if (node.expanded) {
      updateNode(node.rel, { expanded: false });
      return;
    }
    // Expand: load if not already loaded
    if (!node.children) {
      updateNode(node.rel, { expanded: true, loading: true });
      const res = await loadDir(node.rel);
      if ('error' in res && res.error) {
        updateNode(node.rel, { loading: false, error: res.error });
        return;
      }
      updateNode(node.rel, { loading: false, error: undefined, children: res.children });
    } else {
      updateNode(node.rel, { expanded: true });
    }
  }, [loadDir, onOpenFile, updateNode]);

  // The menu closes on anything that is not the menu: a click elsewhere, Esc,
  // or the tree scrolling out from under it.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  /** Run one operation, then re-read the directory it changed. */
  const commit = useCallback(async (value: string) => {
    if (!ops || !editing) return;
    const name = value.trim();
    setEditing(null);
    setOpError(null);
    if (!name) return;
    if (editing.kind === 'rename') {
      if (name === editing.initial) return;
      const err = await ops.rename(editing.rel, name);
      if (err) { setOpError({ rel: editing.rel, message: err }); return; }
      await reloadDir(parentOf(editing.rel));
      return;
    }
    const err = editing.kind === 'new-file'
      ? await ops.newFile(editing.parentRel, name)
      : await ops.newFolder(editing.parentRel, name);
    if (err) { setOpError({ rel: editing.parentRel, message: err }); return; }
    await reloadDir(editing.parentRel);
    if (editing.kind === 'new-file') {
      onOpenFile(editing.parentRel ? `${editing.parentRel}/${name}` : name);
    }
  }, [ops, editing, reloadDir, onOpenFile]);

  const remove = useCallback(async (node: NodeState) => {
    if (!ops) return;
    setMenu(null);
    const err = await ops.remove(node.rel, node.isDir);
    if (err) { setOpError({ rel: node.rel, message: err }); return; }
    await reloadDir(parentOf(node.rel));
  }, [ops, reloadDir]);

  /** Where a "new thing" goes when the menu was opened on `node`: inside a
   *  folder, beside a file. */
  const newParent = (node: NodeState): string => (node.isDir ? node.rel : parentOf(node.rel));

  const startNew = async (node: NodeState, kind: 'new-file' | 'new-folder') => {
    setMenu(null);
    const parent = newParent(node);
    // The input has to be visible, so the folder it will appear in is opened
    // first, and loaded if it never has been.
    if (node.isDir && !node.expanded) await toggle(node);
    setEditing({ kind, parentRel: parent });
  };

  const nameInput = (initial: string, key: string) => (
    <NameInput
      key={key}
      initial={initial}
      onCancel={() => setEditing(null)}
      onCommit={(v) => { void commit(v); }}
      placeholder={t('fileTree.namePlaceholder')}
    />
  );

  // Row geometry differs by mode; the indent per level does not.
  const indent = (depth: number) => (dense ? 8 : 6) + depth * 14;
  const noteStyle = (depth: number): React.CSSProperties => (dense
    ? { padding: '2px 8px', paddingLeft: indent(depth) + 20, fontFamily: 'var(--cth-font-ui)', fontSize: 11.5, color: 'var(--cth-ink-500)' }
    : { padding: '2px 6px', paddingLeft: 24 + depth * 14, fontSize: 12, color: 'var(--cth-ink-500)' });
  const errStyle = (depth: number): React.CSSProperties => ({ ...noteStyle(depth), color: 'var(--cth-coral)', fontSize: dense ? 11 : 12 });

  const renderNode = (node: NodeState, depth: number): React.ReactNode => {
    if (node.rel === '' && depth === 0) {
      // Render children of root only
      return (
        <div>
          {editing && editing.kind !== 'rename' && editing.parentRel === '' && (
            <div style={{ paddingLeft: dense ? indent(0) + 14 : 20 }}>{nameInput('', 'new-root')}</div>
          )}
          {node.children?.map(c => renderNode(c, 0))}
          {node.loading && <div style={{ padding: 8, fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('fileTree.loading')}</div>}
          {node.error && <div style={{ padding: 8, fontSize: 12, color: 'var(--cth-coral)' }}>{node.error}</div>}
          {opError?.rel === '' && <div style={{ padding: 8, fontSize: 12, color: 'var(--cth-coral)' }}>{opError.message}</div>}
        </div>
      );
    }
    const isActive = activeRel === node.rel;
    const renamingThis = editing?.kind === 'rename' && editing.rel === node.rel;
    const badge = !node.isDir ? badges?.[node.rel] : undefined;
    const holdsChanges = node.isDir && !node.expanded && changedDirs.has(node.rel);
    const onContextMenu = ops ? (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMenu({ x: e.clientX, y: e.clientY, node });
    } : undefined;
    return (
      <div key={node.rel}>
        {renamingThis ? (
          <div style={{ paddingLeft: dense ? indent(depth) + 14 : 20 + depth * 14 }}>{nameInput(node.name, `rename-${node.rel}`)}</div>
        ) : dense ? (
          <div
            className={IDE_ROW_CLASS}
            data-tree-row={node.rel}
            data-active={isActive || undefined}
            onClick={() => toggle(node)}
            onContextMenu={onContextMenu}
            title={node.rel}
            style={{
              position: 'relative', display: 'flex', alignItems: 'center', gap: 5, height: 24,
              paddingRight: 8, paddingLeft: indent(depth),
              background: isActive ? 'var(--cth-accent-soft, var(--cth-lemon-light))' : 'transparent',
              color: isActive ? 'var(--cth-ink-900)' : 'var(--cth-ink-700)',
              cursor: 'pointer', fontFamily: 'var(--cth-font-ui)', fontSize: 12, userSelect: 'none', whiteSpace: 'nowrap'
            }}
          >
            {isActive && <i aria-hidden style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 2, borderRadius: 2, background: IDE_YELLOW }} />}
            <span aria-hidden style={{ width: 14, height: 14, display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--cth-ink-500)' }}>
              {node.isDir && <IdeIcon name="chevron" size={12} style={{ transform: node.expanded ? 'rotate(90deg)' : 'none', transition: 'transform 100ms' }} />}
            </span>
            {node.isDir
              ? <IdeIcon name={node.expanded ? 'folderOpen' : 'folder'} size={15} style={{ color: 'var(--cth-ink-500)' }} />
              : <FileIcon rel={node.rel} size={15} />}
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
            {badge && (
              <span data-badge={badge} style={{ flexShrink: 0, fontFamily: 'var(--cth-font-mono)', fontSize: 10, fontWeight: 600, color: gitCodeColor(badge) }}>
                {badge}
              </span>
            )}
            {holdsChanges && <i aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cth-ink-500)', flexShrink: 0 }} />}
          </div>
        ) : (
          <div
            onClick={() => toggle(node)}
            onContextMenu={onContextMenu}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 6px',
              paddingLeft: 6 + depth * 14,
              background: isActive ? 'var(--cth-lemon-light)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--cth-font-ui)',
              fontSize: 12,
              color: 'var(--cth-ink-900)',
              userSelect: 'none'
            }}
          >
            {node.isDir ? (
              <span style={{
                width: 10, display: 'inline-block', textAlign: 'center',
                fontFamily: 'var(--cth-font-mono)', color: 'var(--cth-ink-700)'
              }}>
                {node.expanded ? '▾' : '▸'}
              </span>
            ) : (
              <span style={{ width: 10, display: 'inline-block' }} />
            )}
            <Icon name={node.isDir ? 'folder' : 'code'} />
            <span style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>{node.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onCopyPath(node.rel); }}
              title={t('fileTree.copyPathTitle')}
              style={{
                padding: '0 4px',
                fontSize: 10,
                fontFamily: 'var(--cth-font-ui)',
                color: 'var(--cth-ink-500)',
                background: 'transparent', border: 'none', cursor: 'pointer'
              }}
            >{t('common.copy')}</button>
          </div>
        )}
        {opError?.rel === node.rel && (
          <div style={errStyle(depth)}>
            {opError.message}
          </div>
        )}
        {node.isDir && node.expanded && (
          <div>
            {editing && editing.kind !== 'rename' && editing.parentRel === node.rel && (
              <div style={{ paddingLeft: dense ? indent(depth + 1) + 14 : 20 + (depth + 1) * 14 }}>{nameInput('', `new-${node.rel}`)}</div>
            )}
            {node.loading && (
              <div style={noteStyle(depth)}>
                {t('fileTree.loading')}
              </div>
            )}
            {node.error && (
              <div style={errStyle(depth)}>
                {node.error}
              </div>
            )}
            {node.children?.map(c => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-file-tree={dense ? 'dense' : undefined}
      style={{
        overflow: 'auto', height: '100%',
        background: 'var(--cth-cream-50)',
        paddingTop: 4,
        paddingBottom: dense ? 12 : 0
      }}
      onContextMenu={ops ? (e) => {
        // Right-clicking the empty space below the tree means "in the root".
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, node: tree });
      } : undefined}
    >
      {renderNode(tree, 0)}
      {menu && ops && (
        <div
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', left: menu.x, top: menu.y, zIndex: 400,
            minWidth: 190, padding: 5,
            background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)',
            border: '1px solid var(--cth-ink-300)', borderRadius: 9,
            boxShadow: 'var(--cth-shadow-hard)',
            display: 'flex', flexDirection: 'column'
          }}>
          <MenuItem onClick={() => { void startNew(menu.node, 'new-file'); }}>{t('fileTree.newFile')}</MenuItem>
          <MenuItem onClick={() => { void startNew(menu.node, 'new-folder'); }}>{t('fileTree.newFolder')}</MenuItem>
          {menu.node.rel !== '' && <>
            <div style={{ height: 1, background: 'var(--cth-ink-300)', margin: '4px 0' }} />
            <MenuItem onClick={() => {
              setEditing({ kind: 'rename', rel: menu.node.rel, initial: menu.node.name });
              setMenu(null);
            }}>{t('fileTree.rename')}</MenuItem>
            <MenuItem onClick={() => { onCopyPath(menu.node.rel); setMenu(null); }}>{t('fileTree.copyPath')}</MenuItem>
            <MenuItem danger onClick={() => { void remove(menu.node); }}>{t('fileTree.moveToBin')}</MenuItem>
          </>}
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button" role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '6px 9px', border: 'none', borderRadius: 6, textAlign: 'start',
        font: 'inherit', fontFamily: 'var(--cth-font-ui)', fontSize: 12, cursor: 'pointer',
        background: hover ? 'var(--cth-surface-active, var(--cth-cream-200))' : 'transparent',
        color: danger ? 'var(--cth-status-blocked)' : 'var(--cth-ink-900)'
      }}>
      {children}
    </button>
  );
}

/**
 * The one input the tree ever shows. Enter commits, Escape abandons, and so
 * does losing focus — a half-typed name left sitting in a tree is a row that
 * looks like a file and is not one.
 */
function NameInput({ initial, onCommit, onCancel, placeholder }: {
  initial: string; onCommit: (v: string) => void; onCancel: () => void; placeholder: string;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // Select the stem, not the extension: renaming `IdePanel.tsx` is almost
    // always about the name, and selecting all of it makes the person retype
    // `.tsx` every time.
    const dot = initial.lastIndexOf('.');
    if (dot > 0) el.setSelectionRange(0, dot);
    else el.select();
  }, [initial]);
  return (
    <input
      ref={ref}
      value={value}
      placeholder={placeholder}
      spellCheck={false}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onCancel()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); onCommit(value); }
        else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      }}
      style={{
        width: 'calc(100% - 28px)', height: 20, margin: '2px 0',
        padding: '0 5px', font: 'inherit', fontFamily: 'var(--cth-font-ui)', fontSize: 12,
        border: '1px solid var(--cth-accent, var(--cth-lemon))', borderRadius: 4, outline: 'none',
        background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)'
      }}
    />
  );
}

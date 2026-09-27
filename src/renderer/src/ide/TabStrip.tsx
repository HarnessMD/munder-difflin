/**
 * THE TAB STRIP (0.4.11, the IDE redesign the founder approved on 5 Sep 2026
 * from hive/shared/design/app-v2/ide-prototype.html).
 *
 * A tab reads like Cursor's: the file's glyph, the name, a small chip for the
 * kinds that are not a plain file (DIFF, REV, IMG), an unsaved dot in the
 * app's yellow that becomes the close button under the pointer, and a 2px
 * accent line on top of the one that is open. The strip scrolls sideways
 * with no scrollbar of its own, and ends in a + that opens a Home tab.
 *
 * The strip owns the GESTURES (click, middle click, right click, the menu)
 * and the panel owns the ACTIONS: every callback is a key, and the panel
 * decides what closing, duplicating or revealing means for that key. The
 * menu's rows come from `tabMenuItems`, a pure function, so the test can say
 * exactly which rows a Home tab has and which a file tab has.
 *
 * Hover states need CSS, and inline styles cannot say :hover, so the strip
 * injects one rule set once, the way AgentsScreen does for its cards.
 */
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FileIcon, IDE_YELLOW, IdeIcon } from './ideIcons';

export type TabKind = 'home' | 'edit' | 'diff' | 'revdiff' | 'image';

export interface TabStripItem {
  key: string;
  kind: TabKind;
  rel: string;
  label: string;
  dirty: boolean;
  /** This tab holds the only view of unsaved text, so it will not close
   *  (shared/ideBuffers.ts canCloseTab). */
  closeBlocked?: boolean;
  revLabel?: string;
}

export interface TabStripProps {
  tabs: TabStripItem[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  onClose: (key: string) => void;
  onCloseOthers: (key: string) => void;
  onCloseRight: (key: string) => void;
  /** Put the file back to what is on disk. Offered only on a dirty tab. */
  onDiscard: (key: string) => void;
  onDuplicate: (key: string) => void;
  /** Only offered when kind !== 'home'. */
  onCopyPath: (key: string) => void;
  /** Only offered when kind !== 'home'. */
  onReveal: (key: string) => void;
  /** The + at the end of the strip. */
  onNewHome: () => void;
}

export type TabMenuItemId = 'close' | 'closeOthers' | 'closeRight' | 'discard' | 'duplicate' | 'copyPath' | 'reveal';

/** The rows of a tab's right click menu, in order; `null` is a divider. A Home
 *  tab has no path, so it has nothing to copy and nothing to reveal. */
export function tabMenuItems(kind: TabKind, dirty = false): (TabMenuItemId | null)[] {
  const rows: (TabMenuItemId | null)[] = ['close', 'closeOthers', 'closeRight', null];
  // The one way out of unsaved text that is not saving it, and a person's choice.
  if (dirty) rows.push('discard', null);
  rows.push('duplicate');
  if (kind !== 'home') rows.push('copyPath', 'reveal');
  return rows;
}

const ACCENT = 'var(--cth-accent, var(--cth-lemon))';
const HOVER = 'var(--cth-surface-active, var(--cth-cream-200))';

/** The chip a non file tab wears: which kind, in which of the three light
 *  tints that exist in both skins. */
function kindChip(tab: TabStripItem, t: (k: string) => string): { text: string; bg: string } | null {
  if (tab.kind === 'diff') return { text: t('idePanel.diff'), bg: 'var(--cth-sky-light)' };
  if (tab.kind === 'revdiff') return { text: tab.revLabel ?? t('idePanel.rev'), bg: 'var(--cth-lilac-light)' };
  if (tab.kind === 'image') return { text: t('idePanel.img'), bg: 'var(--cth-peach-light)' };
  return null;
}

export function TabStrip({
  tabs, activeKey, onSelect, onClose, onCloseOthers, onCloseRight, onDiscard, onDuplicate, onCopyPath, onReveal, onNewHome
}: TabStripProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<{ x: number; y: number; key: string; kind: TabKind; dirty: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // The menu closes on anything that is not the menu: a click elsewhere,
  // Escape, or the window changing size under it.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setMenu(null); } };
    const close = () => setMenu(null);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  const openMenu = (e: ReactMouseEvent, tab: TabStripItem) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, key: tab.key, kind: tab.kind, dirty: tab.dirty });
  };

  const run = (id: TabMenuItemId) => {
    if (!menu) return;
    const key = menu.key;
    setMenu(null);
    if (id === 'close') onClose(key);
    else if (id === 'closeOthers') onCloseOthers(key);
    else if (id === 'closeRight') onCloseRight(key);
    else if (id === 'discard') onDiscard(key);
    else if (id === 'duplicate') onDuplicate(key);
    else if (id === 'copyPath') onCopyPath(key);
    else if (id === 'reveal') onReveal(key);
  };

  const menuLabel = (id: TabMenuItemId): string => ({
    close: t('idePanel.closeTab'),
    closeOthers: t('ide.tabs.closeOthers'),
    closeRight: t('ide.tabs.closeRight'),
    discard: t('idePanel.discardChanges'),
    duplicate: t('ide.tabs.duplicate'),
    copyPath: t('fileTree.copyPath'),
    reveal: t('ide.tabs.reveal')
  })[id];

  return (
    <div
      role="tablist"
      className="ide-tabs"
      style={{
        height: 34, flexShrink: 0, display: 'flex', alignItems: 'stretch',
        background: 'var(--cth-paper-100)', borderBottom: '1px solid var(--cth-ink-300)',
        overflowX: 'auto', overflowY: 'hidden',
        fontFamily: 'var(--cth-font-ui)', fontSize: 12, userSelect: 'none'
      }}
    >
      {tabs.map((tab) => {
        const on = tab.key === activeKey;
        const chip = kindChip(tab, t);
        const cls = `ide-tab${on ? ' on' : ''}${tab.dirty ? ' dirty' : ''}`;
        return (
          <div
            key={tab.key}
            role="tab"
            tabIndex={0}
            aria-selected={on}
            data-tab={tab.key}
            data-kind={tab.kind}
            className={cls}
            title={tab.kind === 'home' ? tab.label : tab.rel}
            onClick={() => onSelect(tab.key)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(tab.key); } }}
            onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClose(tab.key); } }}
            onContextMenu={(e) => openMenu(e, tab)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px 0 10px', maxWidth: 200, flexShrink: 0,
              borderRight: '1px solid var(--cth-ink-300)', position: 'relative', cursor: 'default',
              color: on ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)', fontWeight: on ? 500 : 400,
              background: on ? 'var(--cth-cream-100)' : 'transparent',
              boxShadow: on ? `inset 0 2px 0 ${ACCENT}` : undefined,
              whiteSpace: 'nowrap', outline: 'none'
            }}
          >
            {tab.kind === 'home'
              ? <IdeIcon name="home" size={14} style={{ color: 'var(--cth-ink-500)' }} />
              : <FileIcon rel={tab.rel} size={14} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{tab.label}</span>
            {chip && (
              <span style={{
                fontSize: 9.5, letterSpacing: '0.05em', fontWeight: 600, padding: '0 4px', borderRadius: 4,
                lineHeight: '14px', background: chip.bg, color: 'var(--cth-ink-900)', flexShrink: 0
              }}>{chip.text}</span>
            )}
            {tab.dirty && (
              <span
                className="ide-tab-dot"
                title={t('ide.status.unsaved')}
                aria-label={t('ide.status.unsaved')}
                style={{ width: 7, height: 7, borderRadius: '50%', background: IDE_YELLOW, flexShrink: 0, margin: '0 5px' }}
              />
            )}
            <button
              type="button"
              className="ide-tab-x"
              title={tab.closeBlocked ? t('idePanel.tabDirtyClose') : t('idePanel.closeTab')}
              aria-label={tab.closeBlocked ? t('idePanel.tabDirtyClose') : t('idePanel.closeTab')}
              onClick={(e) => { e.stopPropagation(); onClose(tab.key); }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: 18, height: 18, borderRadius: 4, border: 'none', padding: 0, background: 'transparent',
                display: 'grid', placeItems: 'center', color: 'var(--cth-ink-500)', cursor: 'pointer', flexShrink: 0
              }}
            >
              <IdeIcon name="x" size={12} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="ide-tab-add"
        data-new-home
        title={t('ide.tabs.newHome')}
        aria-label={t('ide.tabs.newHome')}
        onClick={onNewHome}
        style={{
          width: 32, flexShrink: 0, border: 'none', padding: 0, background: 'transparent',
          display: 'grid', placeItems: 'center', color: 'var(--cth-ink-500)', cursor: 'pointer'
        }}
      >
        <IdeIcon name="plus" size={14} />
      </button>

      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t('ide.tabs.menu')}
          data-tab-menu
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', zIndex: 400, minWidth: 190, padding: 5,
            left: Math.min(menu.x, window.innerWidth - 210), top: Math.min(menu.y, window.innerHeight - 220),
            background: 'var(--cth-cream-100)', color: 'var(--cth-ink-900)',
            border: '1px solid var(--cth-ink-300)', borderRadius: 9, boxShadow: 'var(--cth-shadow-hard)',
            display: 'flex', flexDirection: 'column'
          }}
        >
          {tabMenuItems(menu.kind, menu.dirty).map((id, i) => (
            id === null
              ? <div key={`sep-${i}`} style={{ height: 1, background: 'var(--cth-ink-300)', margin: '4px 0' }} />
              : <MenuRow key={id} label={menuLabel(id)} onClick={() => run(id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuRow({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const style: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 9px', borderRadius: 6,
    border: 'none', textAlign: 'start', font: 'inherit', fontFamily: 'var(--cth-font-ui)', fontSize: 12,
    cursor: 'pointer', color: 'var(--cth-ink-900)', background: hover ? HOVER : 'transparent'
  };
  return (
    <button type="button" role="menuitem" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={style}>
      {label}
    </button>
  );
}

// The hover rules inline styles cannot express: the close button appears
// under the pointer and on the open tab, and an unsaved tab's dot gives way to
// the close button while the pointer is on it. One rule set, injected once.
const TAB_CSS = [
  '.ide-tabs::-webkit-scrollbar{height:0}',
  `.ide-tab:hover{background:${HOVER};color:var(--cth-ink-900)}`,
  '.ide-tab .ide-tab-x{opacity:0}',
  '.ide-tab:hover .ide-tab-x,.ide-tab.on .ide-tab-x,.ide-tab .ide-tab-x:focus-visible{opacity:1}',
  `.ide-tab .ide-tab-x:hover{background:${HOVER};color:var(--cth-ink-900)}`,
  '.ide-tab.dirty .ide-tab-x{display:none}',
  '.ide-tab.dirty:hover .ide-tab-x{display:grid}',
  '.ide-tab.dirty:hover .ide-tab-dot{display:none}',
  `.ide-tab-add:hover{background:${HOVER};color:var(--cth-ink-900)}`,
  `.ide-tab:focus-visible{box-shadow:inset 0 0 0 2px ${ACCENT}}`
].join('');
if (typeof document !== 'undefined' && !document.getElementById('ide-tabs-style')) {
  const style = document.createElement('style');
  style.id = 'ide-tabs-style';
  style.textContent = TAB_CSS;
  document.head.appendChild(style);
}

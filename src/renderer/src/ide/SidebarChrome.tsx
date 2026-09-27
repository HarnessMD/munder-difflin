/**
 * THE IDE SIDEBAR'S CHROME (0.4.11, the IDE redesign the founder approved on
 * 5 Sep 2026 from hive/shared/design/app-v2/ide-prototype.html).
 *
 *   SidebarTabs     Explorer · Search · Source, three equal tabs at the top
 *                   of the sidebar. The current one carries a 2px accent
 *                   underline; Source carries a count pill while anything
 *                   has changed. This replaces the FILES · NAMES · TEXT
 *                   control that sat above the tree and said nothing.
 *   PaneHeader      a 30px uppercase label with actions that fade in when
 *                   the pointer is over the pane (or the actions have focus),
 *                   so a quiet tree stays quiet and the tools are there the
 *                   moment they are wanted.
 *   SideIconButton  the 20px icon button those actions are made of.
 *
 * Hover states need a rule, not a style object, so this file injects ONE
 * stylesheet once (the way AgentsScreen does) and every row in the sidebar
 * shares it through IDE_ROW_CLASS. The IDE is one surface for both skins, so
 * every PRO token here carries a fallback the Classic skin declares.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IdeIcon, type IdeIconName } from './ideIcons';

export type SideTab = 'explorer' | 'search' | 'git';

/** A hoverable sidebar row (tree rows, change rows, commit rows). */
export const IDE_ROW_CLASS = 'cth-ide-row';
/** Wrap a pane in this so its header actions fade in while the pointer is over it. */
export const IDE_PANE_CLASS = 'cth-ide-pane';
const PANE_HEADER_CLASS = 'cth-ide-pane-h';
const PANE_ACTIONS_CLASS = 'cth-ide-pane-acts';
const ICON_BTN_CLASS = 'cth-ide-ib';
const SIDE_TAB_CLASS = 'cth-ide-sidetab';

const HOVER_BG = 'var(--cth-surface-active, var(--cth-cream-200))';

/** One rule set for the whole sidebar, injected the first time anything here
 *  renders. Idempotent: the id guard keeps a second mount from adding a twin. */
export function ensureIdeSidebarStyle(): void {
  if (typeof document === 'undefined' || document.getElementById('cth-ide-sidebar-style')) return;
  const style = document.createElement('style');
  style.id = 'cth-ide-sidebar-style';
  style.textContent = [
    `.${IDE_ROW_CLASS}:hover{background:${HOVER_BG};color:var(--cth-ink-900)}`,
    `.${ICON_BTN_CLASS}:hover{background:${HOVER_BG};color:var(--cth-ink-900)}`,
    `.${SIDE_TAB_CLASS}:hover{background:${HOVER_BG};color:var(--cth-ink-900)}`,
    `.${PANE_ACTIONS_CLASS}{opacity:0;transition:opacity 100ms}`,
    `.${IDE_PANE_CLASS}:hover .${PANE_ACTIONS_CLASS},.${PANE_HEADER_CLASS}:hover .${PANE_ACTIONS_CLASS},.${PANE_ACTIONS_CLASS}:focus-within{opacity:1}`
  ].join('\n');
  document.head.appendChild(style);
}

const TAB_ICON: Record<SideTab, IdeIconName> = { explorer: 'folder', search: 'search', git: 'git' };
const TAB_ORDER: SideTab[] = ['explorer', 'search', 'git'];

export function SidebarTabs({ current, changedCount, onChange }: { current: SideTab; changedCount: number; onChange: (t: SideTab) => void }) {
  const { t } = useTranslation();
  ensureIdeSidebarStyle();
  return (
    <div role="tablist" style={{ display: 'flex', gap: 2, padding: '6px 6px 0', borderBottom: '1px solid var(--cth-ink-300)', flexShrink: 0 }}>
      {TAB_ORDER.map((k) => {
        const on = k === current;
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={on}
            data-side={k}
            className={SIDE_TAB_CLASS}
            title={t(`ide.side.${k}Title`)}
            onClick={() => onChange(k)}
            style={{
              position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              height: 30, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
              borderRadius: '7px 7px 0 0', font: 'inherit', fontFamily: 'var(--cth-font-ui)', fontSize: 12, fontWeight: 500,
              color: on ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)'
            }}
          >
            <IdeIcon name={TAB_ICON[k]} size={13} />
            <span>{t(`ide.side.${k}`)}</span>
            {k === 'git' && changedCount > 0 && (
              <span data-changed-count style={{
                fontSize: 10, lineHeight: '15px', padding: '0 5px', borderRadius: 8, fontWeight: 600,
                fontFamily: 'var(--cth-font-mono)',
                background: 'var(--cth-accent, var(--cth-lemon))', color: 'var(--cth-accent-ink, var(--cth-ink-900))'
              }}>{changedCount}</span>
            )}
            {on && <i aria-hidden style={{ position: 'absolute', left: 8, right: 8, bottom: -1, height: 2, borderRadius: 2, background: 'var(--cth-accent, var(--cth-lemon))' }} />}
          </button>
        );
      })}
    </div>
  );
}

export function PaneHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  ensureIdeSidebarStyle();
  return (
    <div className={PANE_HEADER_CLASS} style={{
      display: 'flex', alignItems: 'center', gap: 4, height: 30, padding: '0 6px 0 12px', flexShrink: 0,
      fontFamily: 'var(--cth-font-ui)', fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase',
      fontWeight: 600, color: 'var(--cth-ink-500)'
    }}>
      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      {actions && <span className={PANE_ACTIONS_CLASS} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>{actions}</span>}
    </div>
  );
}

export function SideIconButton({ name, title, onClick, active, size = 20, style }: {
  name: IdeIconName; title: string; onClick: () => void; active?: boolean; size?: number; style?: CSSProperties;
}) {
  ensureIdeSidebarStyle();
  return (
    <button
      type="button"
      className={ICON_BTN_CLASS}
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: 5, padding: 0, border: 'none', cursor: 'pointer',
        display: 'inline-grid', placeItems: 'center', font: 'inherit',
        background: active ? HOVER_BG : 'transparent', color: active ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)',
        ...style
      }}
    >
      <IdeIcon name={name} size={Math.round(size * 0.65)} />
    </button>
  );
}

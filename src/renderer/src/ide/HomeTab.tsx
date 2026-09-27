/**
 * THE HOME TAB (0.4.11, the IDE redesign the founder approved on 5 Sep 2026).
 *
 * Nothing open used to be a blank pane with one sentence in it. It is a place
 * now: the workspace's name, the one search box with its answer drawn under
 * it, three doors (New file, Open file, Search in code), the files this
 * person had open, and the files that changed. The + on the tab strip opens
 * another one of these.
 *
 * The answer under the box is the same `quickRows` and `SearchResults` the
 * top bar's quick open draws, off the same hook, so Enter here opens exactly
 * what Enter there would.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IS_MAC } from './EditorChrome';
import { FileIcon, IdeIcon, gitCodeColor, type IdeIconName } from './ideIcons';
import { Kbd, SearchResults, quickRows, type QuickRow } from './QuickOpen';
import { useWorkspaceSearch } from './useWorkspaceSearch';

export interface HomeTabProps {
  root: string;
  /** The workspace's name, the agent's ("Kevin's workspace"). */
  title: string;
  /** The folder, the branch, the counts: whatever the frame knows. */
  subtitle: string;
  recent: string[];
  changed: { path: string; code: string }[];
  /** Bumped by the panel when this tab is shown, so the box takes the keyboard. */
  focusNonce: number;
  onOpen: (rel: string) => void;
  onOpenHit: (rel: string, line: number, col: number, length: number) => void;
  onOpenDiff: (rel: string) => void;
  onNewFile: () => void;
  onQuickOpen: () => void;
  /** Carries the query when a long answer continues in the Search tab. */
  onFindInFiles: (query?: string) => void;
}

/** How many of each the home tab shows before it points at the Search tab. */
export const HOME_CAP = 6;

export function HomeTab({ root, title, subtitle, recent, changed, focusNonce, onOpen, onOpenHit, onOpenDiff, onNewFile, onQuickOpen, onFindInFiles }: HomeTabProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const search = useWorkspaceSearch(root, query);
  const rows = useMemo(() => quickRows(search, HOME_CAP, false), [search]);
  const showing = query.trim().length > 0;
  const mod = IS_MAC ? '⌘' : 'Ctrl+';

  useEffect(() => {
    if (!focusNonce) return;
    inputRef.current?.focus();
  }, [focusNonce]);

  const pick = (row: QuickRow | undefined) => {
    if (!row) return;
    if (row.kind === 'file') onOpen(row.hit.rel);
    else if (row.kind === 'hit') onOpenHit(row.hit.rel, row.hit.line, row.hit.col, row.hit.length);
    else if (row.kind === 'more') onFindInFiles(query);
    else onNewFile();
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '52px 24px 24px', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)' }}>
      <div style={{ width: 'min(680px, 100%)' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</h1>
        <div style={{ color: 'var(--cth-ink-500)', margin: '4px 0 18px', fontSize: 12.5 }}>{subtitle}</div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 10px 0 14px',
          border: '1px solid var(--cth-ink-300)', borderRadius: 'var(--cth-radius-lg, 12px)', background: 'var(--cth-cream-50)',
          boxShadow: showing ? '0 0 0 3px var(--cth-accent-soft, var(--cth-lemon-light))' : 'none', cursor: 'text'
        }}>
          <IdeIcon name="search" size={16} style={{ color: 'var(--cth-ink-500)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); pick(rows[0]); }
              else if (e.key === 'Escape') { e.preventDefault(); setQuery(''); }
            }}
            placeholder={t('ide.quick.placeholder')}
            aria-label={t('ide.quick.placeholder')}
            spellCheck={false}
            style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', font: 'inherit', fontSize: 14, color: 'var(--cth-ink-900)' }}
          />
          <Kbd>{mod}P</Kbd>
        </label>
        {showing && (
          <div data-home-results style={{ marginTop: 8, padding: 6, background: 'var(--cth-cream-50)', border: '1px solid var(--cth-ink-300)', borderRadius: 'var(--cth-radius-lg, 12px)', boxShadow: 'var(--cth-shadow-hard)' }}>
            <SearchResults search={search} query={query} rows={rows} onPick={pick} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, margin: '12px 0 26px' }}>
          <Door icon="newFile" label={t('ide.create.title')} hint={t('ide.home.newFileHint')} keys={`${mod}N`} onClick={onNewFile} />
          <Door icon="folder" label={t('ide.home.openFile')} hint={t('ide.home.openFileHint')} keys={`${mod}P`} onClick={onQuickOpen} />
          <Door icon="search" label={t('ide.home.findInFiles')} hint={t('ide.home.findInFilesHint')} keys={IS_MAC ? '⇧⌘F' : 'Ctrl+Shift+F'} onClick={() => onFindInFiles()} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 22 }}>
          <div>
            <ListHeading count={recent.length}>{t('ide.home.recent')}</ListHeading>
            {recent.length === 0 && <Empty>{t('ide.home.recentEmpty')}</Empty>}
            {recent.map((rel) => (
              <ListRow key={rel} onClick={() => onOpen(rel)} title={rel}>
                <FileIcon rel={rel} size={14} />
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{rel.split('/').pop()}</span>
                <Dir rel={rel} />
              </ListRow>
            ))}
          </div>
          <div>
            <ListHeading count={changed.length}>{t('ide.home.changed')}</ListHeading>
            {changed.length === 0 && <Empty>{t('gitTab.clean')}</Empty>}
            {changed.map((c) => (
              <ListRow key={c.path} onClick={() => onOpenDiff(c.path)} title={c.path}>
                <span style={{
                  width: 20, height: 18, borderRadius: 5, display: 'inline-grid', placeItems: 'center', flexShrink: 0,
                  fontFamily: 'var(--cth-font-mono)', fontSize: 10.5, fontWeight: 600,
                  background: 'var(--cth-cream-200)', color: gitCodeColor(c.code)
                }}>{c.code === ' ' ? '·' : c.code}</span>
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{c.path.split('/').pop()}</span>
                <Dir rel={c.path} />
              </ListRow>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- pieces --------------------------------------------------------------- */

function Door({ icon, label, hint, keys, onClick }: { icon: IdeIconName; label: string; hint: string; keys: string; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', minWidth: 0, textAlign: 'start',
        border: '1px solid var(--cth-ink-300)', borderRadius: 'var(--cth-radius-md, 10px)', background: 'var(--cth-cream-50)',
        font: 'inherit', color: 'var(--cth-ink-900)', cursor: 'pointer'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cth-surface-active, var(--cth-cream-200))'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cth-cream-50)'; }}
    >
      <span style={{
        width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', flexShrink: 0,
        background: 'var(--cth-accent-soft, var(--cth-lemon-light))', color: 'var(--cth-accent-text, var(--cth-lemon))'
      }}>
        <IdeIcon name={icon} size={16} />
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 500, fontSize: 12.5 }}>{label}</span>
        <span style={{ display: 'block', color: 'var(--cth-ink-500)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hint}</span>
      </span>
      <Kbd>{keys}</Kbd>
    </button>
  );
}

function ListHeading({ count, children }: { count: number; children: ReactNode }) {
  return (
    <h3 style={{ margin: '0 0 6px', fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--cth-ink-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
      {children}
      <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: 'none', fontFamily: 'var(--cth-font-mono)' }}>{count}</span>
    </h3>
  );
}

function ListRow({ onClick, title, children }: { onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0, padding: '5px 8px',
        border: 'none', borderRadius: 'var(--cth-radius-sm, 6px)', background: 'transparent', textAlign: 'start',
        font: 'inherit', fontSize: 12.5, color: 'var(--cth-ink-900)', cursor: 'pointer'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cth-surface-active, var(--cth-cream-200))'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Dir({ rel }: { rel: string }) {
  const i = rel.lastIndexOf('/');
  return <span style={{ color: 'var(--cth-ink-500)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{i === -1 ? '' : rel.slice(0, i)}</span>;
}

function Empty({ children }: { children: ReactNode }) {
  return <div style={{ color: 'var(--cth-ink-500)', fontSize: 12, padding: '6px 8px' }}>{children}</div>;
}

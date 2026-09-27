/**
 * THE QUICK OPEN (0.4.11, the IDE redesign the founder approved on 5 Sep 2026).
 *
 * The one search box in the top bar, and the popover under it. ⌘P lands the
 * keyboard here from anywhere in the IDE. It answers with what the workspace
 * has: Files (names that match), In files (lines that match, each with its
 * line number and the match marked), a row to carry a long answer into the
 * Search tab, and the commands a person reaches for from a search box.
 *
 * `SearchResults` and `quickRows` are shared with the home tab, which draws
 * the same answer under a bigger box. One row model, one renderer, so the two
 * cannot disagree about what a hit looks like or what pressing Enter opens.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IS_MAC } from './EditorChrome';
import { FileIcon, IdeIcon } from './ideIcons';
import { useWorkspaceSearch, type NameHit, type TextHit, type WorkspaceSearch } from './useWorkspaceSearch';

export interface QuickOpenProps {
  root: string;
  /** Bumped by the panel when ⌘P asks for the box, so it takes focus even when
   *  it already had it once. */
  focusNonce: number;
  onOpen: (rel: string) => void;
  onOpenHit: (rel: string, line: number, col: number, length: number) => void;
  onNewFile: () => void;
  /** A long answer continues in the Search tab, with the query carried over. */
  onShowAll: (query: string) => void;
}

/** How many of each the popover shows before it points at the Search tab. */
export const QUICK_CAP = 5;

export type QuickRow =
  | { id: string; kind: 'file'; hit: NameHit }
  | { id: string; kind: 'hit'; hit: TextHit }
  | { id: string; kind: 'more'; total: number }
  | { id: string; kind: 'command'; command: 'newFile' };

/** The flat list the keyboard walks: files, then lines, then the way to the
 *  rest, then the commands. Same order as the rows are drawn. */
export function quickRows(search: WorkspaceSearch, cap: number, commands: boolean): QuickRow[] {
  const rows: QuickRow[] = [];
  for (const hit of search.names.slice(0, cap)) rows.push({ id: `f:${hit.rel}`, kind: 'file', hit });
  for (const hit of search.hits.slice(0, cap)) rows.push({ id: `h:${hit.rel}:${hit.line}:${hit.col}`, kind: 'hit', hit });
  if (search.hits.length > cap || search.hitsTruncated || search.namesTruncated) {
    rows.push({ id: 'more', kind: 'more', total: search.hits.length });
  }
  if (commands) rows.push({ id: 'c:newFile', kind: 'command', command: 'newFile' });
  return rows;
}

export function QuickOpen({ root, focusNonce, onOpen, onOpenHit, onNewFile, onShowAll }: QuickOpenProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const search = useWorkspaceSearch(root, query);
  const rows = useMemo(() => quickRows(search, QUICK_CAP, true), [search]);
  const showing = open && query.trim().length > 0;

  useEffect(() => {
    if (!focusNonce) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusNonce]);

  // A new answer starts at its first row.
  useEffect(() => { setActive(0); }, [query, rows.length]);

  useEffect(() => {
    if (!showing) return;
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [showing]);

  const pick = (row: QuickRow | undefined) => {
    if (!row) return;
    if (row.kind === 'file') onOpen(row.hit.rel);
    else if (row.kind === 'hit') onOpenHit(row.hit.rel, row.hit.line, row.hit.col, row.hit.length);
    else if (row.kind === 'more') onShowAll(query);
    else onNewFile();
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: 'min(520px, 44vw)', height: 28 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 28, padding: '0 8px 0 10px',
        border: '1px solid var(--cth-ink-300)', borderRadius: 'var(--cth-radius-md, 8px)',
        background: showing ? 'var(--cth-cream-50)' : 'var(--cth-cream-100)', color: 'var(--cth-ink-500)', cursor: 'text'
      }}>
        <IdeIcon name="search" size={13} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(rows.length - 1, i + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
            else if (e.key === 'Enter') { e.preventDefault(); pick(rows[active] ?? rows[0]); }
            else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); setQuery(''); inputRef.current?.blur(); }
          }}
          placeholder={t('ide.quick.placeholder')}
          aria-label={t('ide.quick.placeholder')}
          aria-expanded={showing}
          spellCheck={false}
          style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', font: 'inherit', fontSize: 12.5, color: 'var(--cth-ink-900)' }}
        />
        <Kbd>{IS_MAC ? '⌘P' : 'Ctrl+P'}</Kbd>
      </label>
      {showing && (
        <div role="listbox" style={{
          position: 'absolute', left: 0, right: 0, top: 34, zIndex: 40, padding: 6, maxHeight: '60vh', overflowY: 'auto',
          background: 'var(--cth-cream-50)', border: '1px solid var(--cth-ink-300)', borderRadius: 'var(--cth-radius-lg, 10px)',
          boxShadow: 'var(--cth-shadow-hard)'
        }}>
          <SearchResults search={search} query={query} rows={rows} activeId={rows[active]?.id} onPick={pick} />
        </div>
      )}
    </div>
  );
}

/* ---- the shared answer ---------------------------------------------------- */

export function SearchResults({ search, query, rows, activeId, onPick }: {
  search: WorkspaceSearch; query: string; rows: QuickRow[]; activeId?: string; onPick: (row: QuickRow) => void;
}) {
  const { t } = useTranslation();
  const files = rows.filter((r) => r.kind === 'file');
  const hits = rows.filter((r) => r.kind === 'hit');
  const more = rows.find((r) => r.kind === 'more');
  const commands = rows.filter((r) => r.kind === 'command');
  const nothing = files.length === 0 && hits.length === 0 && search.status === 'ready';
  return (
    <>
      {files.length > 0 && <Section>{t('ide.quick.files')}</Section>}
      {files.map((r) => r.kind === 'file' && (
        <Row key={r.id} on={r.id === activeId} onClick={() => onPick(r)} title={r.hit.rel}>
          <FileIcon rel={r.hit.rel} size={14} />
          <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
            {r.hit.inName && r.hit.start >= 0 ? <Marked text={r.hit.name} start={r.hit.start} length={r.hit.length} /> : r.hit.name}
          </span>
          <Path>{r.hit.dir}</Path>
        </Row>
      ))}
      {hits.length > 0 && (
        <Section>{t('ide.quick.inFiles')} · {t('ide.search.count', { hits: search.hits.length, files: search.hitFiles })}</Section>
      )}
      {hits.map((r) => r.kind === 'hit' && (
        <Row key={r.id} on={r.id === activeId} onClick={() => onPick(r)} title={`${r.hit.rel}:${r.hit.line}:${r.hit.col}`}>
          <FileIcon rel={r.hit.rel} size={14} />
          <span style={{ whiteSpace: 'nowrap' }}>{r.hit.rel.split('/').pop()}</span>
          <span style={{ color: 'var(--cth-ink-500)', fontSize: 11, flexShrink: 0 }}>:{r.hit.line}</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre', fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, color: 'var(--cth-ink-700)' }}>
            <Marked text={r.hit.text.trimStart()} start={r.hit.col - 1 - (r.hit.text.length - r.hit.text.trimStart().length)} length={r.hit.length} />
          </span>
        </Row>
      ))}
      {more && more.kind === 'more' && (
        <Row key={more.id} on={more.id === activeId} onClick={() => onPick(more)}>
          <Path>{t('ide.quick.showAll', { n: more.total })}</Path>
          <span style={{ flex: 1 }} />
          <Kbd>{IS_MAC ? '⇧⌘F' : 'Ctrl+Shift+F'}</Kbd>
        </Row>
      )}
      {search.status === 'indexing' && <Note>{t('ide.find.indexing')}</Note>}
      {search.status === 'searching' && <Note>{t('ide.search.working')}</Note>}
      {search.status === 'error' && <Note tone="error">{search.error}</Note>}
      {nothing && <Note>{t('ide.quick.none', { query: query.trim() })}</Note>}
      {commands.length > 0 && <Section>{t('ide.quick.commands')}</Section>}
      {commands.map((r) => r.kind === 'command' && (
        <Row key={r.id} on={r.id === activeId} onClick={() => onPick(r)}>
          <IdeIcon name="newFile" size={14} style={{ color: 'var(--cth-ink-500)' }} />
          <span style={{ fontWeight: 500 }}>{t('ide.create.title')}</span>
          <span style={{ flex: 1 }} />
          <Kbd>{IS_MAC ? '⌘N' : 'Ctrl+N'}</Kbd>
        </Row>
      ))}
    </>
  );
}

/** The matched run, marked. The offsets come from the matcher, so the highlight
 *  and the reason the row is here cannot disagree. A negative start marks
 *  nothing rather than something invented. */
export function Marked({ text, start, length }: { text: string; start: number; length: number }) {
  if (start < 0 || length <= 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <mark style={{ background: 'var(--cth-accent-soft, var(--cth-lemon-light))', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(start, start + length)}
      </mark>
      {text.slice(start + length)}
    </>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--cth-ink-500)', fontWeight: 600, padding: '6px 8px 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {children}
    </div>
  );
}

function Row({ on, onClick, title, children }: { on?: boolean; onClick: () => void; title?: string; children: ReactNode }) {
  return (
    <button
      type="button" role="option" aria-selected={on} title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0, padding: '5px 8px',
        border: 'none', borderRadius: 'var(--cth-radius-sm, 6px)', textAlign: 'start', font: 'inherit', fontSize: 12.5,
        cursor: 'pointer', color: 'var(--cth-ink-900)',
        background: on ? 'var(--cth-surface-active, var(--cth-cream-200))' : 'transparent'
      }}
      onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = 'var(--cth-surface-active, var(--cth-cream-200))'; }}
      onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Path({ children }: { children: ReactNode }) {
  return <span style={{ color: 'var(--cth-ink-500)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{children}</span>;
}

function Note({ children, tone }: { children: ReactNode; tone?: 'error' }) {
  return <div style={{ padding: '6px 8px', fontSize: 12, color: tone === 'error' ? 'var(--cth-coral)' : 'var(--cth-ink-500)' }}>{children}</div>;
}

export const kbdStyle: CSSProperties = {
  fontFamily: 'var(--cth-font-mono)', fontSize: 10, color: 'var(--cth-ink-500)', background: 'var(--cth-cream-200)',
  border: '1px solid var(--cth-ink-300)', borderRadius: 4, padding: '0 4px', lineHeight: '15px', whiteSpace: 'nowrap', flexShrink: 0
};

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd style={kbdStyle}>{children}</kbd>;
}

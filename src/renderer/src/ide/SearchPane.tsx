/**
 * THE SEARCH TAB (0.4.11, the IDE redesign the founder approved on 5 Sep 2026).
 *
 * The 0.4.9 sidebar had "files · names · text": three modes of one column,
 * and nothing said that "names" found a file and "text" found a line. This is
 * one box that answers with both, off `useWorkspaceSearch`: a File names
 * section (the file, with the match marked in its name), then In files
 * grouped by file (the file as a row you can fold, its lines under it with
 * the match marked). Aa, ab and .* are where they were. The ceilings are
 * still said out loud: the index that stopped early, the name list that is
 * showing part of what matched, the contents result main cut short.
 *
 * Enter runs the contents search at once instead of waiting out the
 * debounce, because a person who typed a word and hit return meant now.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FileIcon, IdeIcon } from './ideIcons';
import { Marked } from './QuickOpen';
import { useWorkspaceSearch, type SearchOptions, type TextHit } from './useWorkspaceSearch';

export interface SearchPaneProps {
  root: string;
  /** Bumped by the panel when ⇧⌘F asks for this pane, so the box takes focus
   *  even when the pane was already on screen. */
  focusNonce: number;
  /** A query handed over from the quick open or the home tab. */
  query?: string;
  onOpen: (rel: string) => void;
  /** Open a file at a position. The IDE owns tabs; this pane owns finding. */
  onOpenHit: (rel: string, line: number, col: number, length: number) => void;
}

interface FileGroup { rel: string; hits: TextHit[] }

export function SearchPane({ root, focusNonce, query: handed, onOpen, onOpenHit }: SearchPaneProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(handed ?? '');
  const [opts, setOpts] = useState<SearchOptions>({ caseSensitive: false, wholeWord: false, regex: false });
  const [run, setRun] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const search = useWorkspaceSearch(root, query, opts, run);

  useEffect(() => { if (handed !== undefined) setQuery(handed); }, [handed]);

  useEffect(() => {
    if (!focusNonce) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusNonce]);

  const groups: FileGroup[] = useMemo(() => {
    const by = new Map<string, TextHit[]>();
    for (const h of search.hits) {
      const list = by.get(h.rel);
      if (list) list.push(h);
      else by.set(h.rel, [h]);
    }
    return [...by.entries()].map(([rel, hits]) => ({ rel, hits }));
  }, [search.hits]);

  const hasQuery = query.trim().length > 0;
  const toggle = (key: keyof SearchOptions) => setOpts((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)' }}>
      <label style={{
        margin: '8px 8px 6px', display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 6px 0 9px', flexShrink: 0,
        border: '1px solid var(--cth-ink-300)', borderRadius: 'var(--cth-radius-md, 8px)', background: 'var(--cth-cream-50)', cursor: 'text'
      }}>
        <IdeIcon name="search" size={13} style={{ color: 'var(--cth-ink-500)' }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setRun((n) => n + 1); } }}
          placeholder={t('ide.search.placeholder')}
          aria-label={t('ide.search.placeholder')}
          spellCheck={false}
          style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', font: 'inherit', fontSize: 12.5, color: 'var(--cth-ink-900)' }}
        />
        <Opt on={opts.caseSensitive} title={t('ide.search.caseTitle')} onClick={() => toggle('caseSensitive')}>Aa</Opt>
        <Opt on={opts.wholeWord} title={t('ide.search.wordTitle')} onClick={() => toggle('wholeWord')}>ab</Opt>
        <Opt on={opts.regex} title={t('ide.search.regexTitle')} onClick={() => toggle('regex')}>.*</Opt>
      </label>

      {/* The summary, and every ceiling, said in words. */}
      <div style={{ padding: '2px 12px 6px', fontSize: 11.5, lineHeight: 1.45, color: 'var(--cth-ink-500)', flexShrink: 0 }}>
        {!hasQuery && <div>{t('ide.search.hint')}</div>}
        {hasQuery && search.status === 'indexing' && <div>{t('ide.find.indexing')}</div>}
        {hasQuery && search.status === 'searching' && <div>{t('ide.search.working')}</div>}
        {hasQuery && search.status === 'error' && <div style={{ color: 'var(--cth-coral)' }}>{search.error}</div>}
        {hasQuery && search.status === 'ready' && (
          <div>
            {search.hits.length === 0 ? t('ide.search.none') : t('ide.search.count', { hits: search.hits.length, files: search.hitFiles })}
            {' · '}
            {search.namesTotal === 0 ? t('ide.find.none') : t('ide.search.nameCount', { n: search.namesTotal })}
          </div>
        )}
        {search.indexTruncated && search.indexed !== null && <div>{t('ide.find.indexTruncated', { n: search.indexed })}</div>}
        {search.namesTruncated && <div>{t('ide.find.listTruncated', { shown: search.names.length, total: search.namesTotal })}</div>}
        {search.hitsTruncated && <div>{t('ide.search.truncated')}</div>}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
        {search.names.length > 0 && (
          <>
            <SectionLabel>{t('ide.search.sectionNames')}</SectionLabel>
            {search.names.map((m) => (
              <Row key={m.rel} onClick={() => onOpen(m.rel)} title={m.rel} indent={12}>
                <FileIcon rel={m.rel} size={14} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.inName && m.start >= 0 ? <Marked text={m.name} start={m.start} length={m.length} /> : m.name}
                </span>
                <span style={{ color: 'var(--cth-ink-500)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, marginLeft: 'auto', maxWidth: 110 }}>{m.dir}</span>
              </Row>
            ))}
          </>
        )}
        {groups.length > 0 && <SectionLabel>{t('ide.search.sectionText')}</SectionLabel>}
        {groups.map((g) => (
          <div key={g.rel}>
            <Row onClick={() => setCollapsed((p) => ({ ...p, [g.rel]: !p[g.rel] }))} title={g.rel} indent={10} strong>
              <span style={{ width: 14, display: 'grid', placeItems: 'center', color: 'var(--cth-ink-500)', flexShrink: 0 }}>
                <IdeIcon name="chevron" size={13} style={{ transform: collapsed[g.rel] ? 'none' : 'rotate(90deg)', transition: 'transform 100ms' }} />
              </span>
              <FileIcon rel={g.rel} size={14} />
              <span style={{ whiteSpace: 'nowrap' }}>{g.rel.split('/').pop()}</span>
              <span style={{ color: 'var(--cth-ink-500)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1, fontWeight: 400 }}>{g.rel.includes('/') ? g.rel.slice(0, g.rel.lastIndexOf('/')) : ''}</span>
              <span style={{ fontSize: 10.5, color: 'var(--cth-ink-500)', background: 'var(--cth-cream-200)', borderRadius: 8, padding: '0 6px', lineHeight: '16px', fontFamily: 'var(--cth-font-mono)', flexShrink: 0 }}>{g.hits.length}</span>
            </Row>
            {!collapsed[g.rel] && g.hits.map((h, i) => (
              <button
                key={`${h.line}:${h.col}:${i}`}
                type="button"
                onClick={() => onOpenHit(h.rel, h.line, h.col, h.length)}
                title={`${h.rel}:${h.line}:${h.col}`}
                style={{
                  display: 'flex', gap: 8, width: '100%', alignItems: 'baseline', minWidth: 0,
                  padding: '2px 10px 2px 30px', border: 'none', background: 'transparent',
                  font: 'inherit', fontSize: 11.5, color: 'var(--cth-ink-700)', cursor: 'pointer', textAlign: 'start'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cth-surface-active, var(--cth-cream-200))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', fontSize: 10.5, flexShrink: 0, width: 26, textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{h.line}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre', fontFamily: 'var(--cth-font-mono)', fontSize: 11 }}>
                  <Marked text={h.text} start={h.col - 1} length={h.length} />
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- pieces --------------------------------------------------------------- */

function Opt({ on, title, onClick, children }: { on: boolean; title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button" title={title} aria-pressed={on} onClick={onClick}
      style={{
        width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer', flexShrink: 0,
        fontFamily: 'var(--cth-font-mono)', fontSize: 10.5, fontWeight: 600, display: 'grid', placeItems: 'center',
        background: on ? 'var(--cth-accent-soft, var(--cth-lemon-light))' : 'transparent',
        color: on ? 'var(--cth-accent-text, var(--cth-lemon))' : 'var(--cth-ink-500)'
      }}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: 24, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--cth-ink-500)', fontWeight: 600 }}>
      {children}
    </div>
  );
}

function Row({ onClick, title, indent, strong, children }: { onClick: () => void; title: string; indent: number; strong?: boolean; children: ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0, height: 24, paddingLeft: indent, paddingRight: 8,
        border: 'none', background: 'transparent', font: 'inherit', fontSize: 12, fontWeight: strong ? 500 : 400,
        color: 'var(--cth-ink-900)', cursor: 'pointer', textAlign: 'start', whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cth-surface-active, var(--cth-cream-200))'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

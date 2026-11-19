// Ported from Prozzta/guppyos 02d0d50b (MIT).
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { HistoryItem, HistoryProvider } from '@shared/history';
import { useRtl } from '@/i18n/useDirection';
import { PixelButton } from './PixelButton';
import {
  EMPTY_WINDOW,
  UNAVAILABLE_KEY,
  applyNewer,
  applyOlder,
  applyTail,
  clockOf,
  visibleRange,
  type HistoryWindow
} from './historyModel';

/**
 * An agent's conversation, read from its engine's OWN record of the session:
 * what was sent in (PROMPT),
 * what the agent wrote (REPLY), one line per tool use, and a rule where the
 * conversation was compacted. The terminal's scrollback is not that record:
 * resize repaints and replays pile stale frames into it. Read only, never
 * sent anywhere; it survives restarts and reloads because it reads the file
 * again (window.cth.historyPage, by agent id only).
 *
 * Virtualised: only rows in view (plus an overscan) are mounted, and the
 * model (historyModel.ts) keeps at most HISTORY_RETAIN_MAX items. It follows
 * new turns only while scrolled to the bottom. Every box has an even border
 * and the kind sits in a chip (no coloured edge).
 */

const POLL_MS = 2000;
const EST_ROW = 44;
const STICK_PX = 24;

const ENGINE: Record<HistoryProvider, string> = { claude: 'Claude Code', codex: 'Codex', antigravity: 'Antigravity' };
/** The compaction markers main writes (main/historyNormalize.ts), shown in the reader's words. */
const COMPACTED: ReadonlySet<string> = new Set(['Conversation compacted', 'Context compacted']);

/** One history row. Exported for render tests. */
export function HistoryRow({ item }: { item: HistoryItem }) {
  const { t } = useTranslation();
  const rtl = useRtl();
  const clock = clockOf(item.at);
  const when = item.at !== null ? new Date(item.at).toLocaleString() : undefined;
  if (item.kind === 'system') {
    // A rule with the words in the middle, not dashes typed into the text.
    const rule: CSSProperties = { flex: 1, height: 1, background: 'var(--cth-ink-300)' };
    return (
      <div data-kind="system" title={when} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-ui)' }}>
        <span style={rule} />
        <span dir={rtl ? 'auto' : undefined}>{COMPACTED.has(item.text) ? t('history.compacted') : item.text}</span>
        {clock && <span style={{ fontFamily: 'var(--cth-font-mono)' }}>{clock}</span>}
        <span style={rule} />
      </div>
    );
  }
  if (item.kind === 'tool') {
    return (
      <div data-kind="tool" title={when} style={{
        display: 'flex', gap: 6, alignItems: 'baseline', padding: '2px 10px 2px 18px',
        fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', minWidth: 0
      }}>
        <span aria-hidden style={{ flexShrink: 0 }}>›</span>
        <span dir="ltr" style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>
        {clock && <span style={{ flexShrink: 0 }}>{clock}</span>}
      </div>
    );
  }
  const prompt = item.kind === 'user';
  const tag: CSSProperties = { fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px', padding: '1px 5px 0', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)' };
  return (
    <div data-kind={item.kind} style={{
      margin: '6px 8px', padding: '6px 10px 8px',
      boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)', background: 'var(--cth-paper-100)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ ...tag, color: 'var(--cth-ink-900)', background: prompt ? 'var(--cth-sky-light)' : 'var(--cth-mint-light)' }}>
          {t(prompt ? 'history.prompt' : 'history.reply')}
        </span>
        {clock && <span title={when} style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)' }}>{clock}</span>}
      </div>
      {/* The conversation stays as written. */}
      <div dir={rtl ? 'auto' : undefined} style={{ fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-900)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', userSelect: 'text' }}>
        {item.text}
        {item.truncated && <small style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}> {t('history.cut')}</small>}
      </div>
    </div>
  );
}

export interface HistoryListProps {
  win: HistoryWindow;
  /** The rows to mount, from visibleRange. */
  first: number;
  last: number;
  padTop: number;
  padBottom: number;
  loading: boolean;
  following: boolean;
  onLoadOlder?: () => void;
  onJumpLatest?: () => void;
}

/** The presentational list: header controls, spacers and the mounted rows. Exported for render tests. */
export function HistoryList({ win, first, last, padTop, padBottom, loading, following, onLoadOlder, onJumpLatest }: HistoryListProps) {
  const { t } = useTranslation();
  const state: CSSProperties = { padding: '40px 24px', textAlign: 'center', fontSize: 13, lineHeight: '19px', color: 'var(--cth-ink-700)' };
  const button = (label: string, onClick?: () => void, disabled?: boolean) =>
    <PixelButton size="sm" variant="ghost" onClick={onClick} disabled={disabled}>{label}</PixelButton>;
  if (win.unavailable) return <div style={state}>{t(UNAVAILABLE_KEY[win.unavailable])}</div>;
  if (!win.fileId) return <div style={state}>{loading ? '' : t('history.empty')}</div>;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 6 }}>
        {win.atStart
          ? <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('history.start')}</span>
          : button(t('history.loadOlder'), onLoadOlder, loading)}
      </div>
      {win.items.length === 0 && <div style={state}>{t('history.empty')}</div>}
      <div data-pad-top style={{ height: padTop }} />
      {/* The measured wrapper CONTAINS its row's margins (flow-root), so its offsetHeight is the
          row's true stride; collapsed margins would make every message row measure short. */}
      {win.items.slice(first, last).map((item) => (
        <div key={item.id} data-hid={item.id} style={{ display: 'flow-root' }}><HistoryRow item={item} /></div>
      ))}
      <div style={{ height: padBottom }} />
      {!following && (
        <div style={{ position: 'sticky', bottom: 8, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ pointerEvents: 'auto' }}>
            <PixelButton variant="secondary" size="sm" onClick={onJumpLatest}>{t('history.jump')}</PixelButton>
          </span>
        </div>
      )}
    </>
  );
}

export interface HistoryViewProps {
  agentId: string;
}

export function HistoryView({ agentId }: HistoryViewProps) {
  const { t } = useTranslation();
  const [win, setWin] = useState<HistoryWindow>(EMPTY_WINDOW);
  const [loading, setLoading] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [, setMeasureTick] = useState(0);

  const scroller = useRef<HTMLDivElement | null>(null);
  const winRef = useRef(win);
  winRef.current = win;
  const busy = useRef(false);
  const stick = useRef(true);
  const heights = useRef(new Map<string, number>());
  const widthRef = useRef(0);
  // Set before an older page is prepended: the row that was first on screen, and how far
  // below the viewport's top it sat. Held until that row is mounted and measured in place.
  const anchor = useRef<{ id: string; delta: number; until: number } | null>(null);
  const historyPage = useCallback(
    (req: Parameters<typeof window.cth.historyPage>[0]) => window.cth.historyPage(req),
    []
  );

  const loadTail = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const page = await historyPage({ agentId });
      heights.current.clear();
      stick.current = true;
      setAtBottom(true);
      setWin(applyTail(page));
    } catch {
      if (!winRef.current.fileId) setWin({ ...EMPTY_WINDOW, unavailable: 'unreadable' });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [agentId, historyPage]);

  const loadOlder = useCallback(async () => {
    const w = winRef.current;
    if (busy.current || w.atStart || !w.fileId) return;
    busy.current = true;
    setLoading(true);
    let reload = false;
    try {
      const page = await historyPage({ agentId, before: w.start });
      const next = applyOlder(winRef.current, page);
      if (next === 'reload') reload = true;
      else {
        const el = scroller.current;
        if (el) {
          const row = [...el.querySelectorAll<HTMLElement>('[data-hid]')].find((r) => r.offsetTop + r.offsetHeight > el.scrollTop);
          anchor.current = row ? { id: row.dataset.hid!, delta: row.offsetTop - el.scrollTop, until: Date.now() + 1500 } : null;
        }
        stick.current = false;
        setWin(next);
      }
    } catch { /* keep what is shown */ } finally {
      busy.current = false;
      setLoading(false);
    }
    if (reload) void loadTail();
  }, [agentId, loadTail, historyPage]);

  // At the live end already: just scroll down. Otherwise the tail is reloaded.
  const jumpLatest = useCallback(() => {
    const el = scroller.current;
    if (winRef.current.live && el) {
      stick.current = true;
      setAtBottom(true);
      el.scrollTop = el.scrollHeight;
      setScrollTop(el.scrollTop);
      return;
    }
    void loadTail();
  }, [loadTail]);

  // First load, and a fresh start whenever the agent changes. Dropped on unmount.
  const shownFor = useRef<string | null>(null);
  useEffect(() => {
    if (shownFor.current !== agentId) {
      shownFor.current = agentId;
      setWin(EMPTY_WINDOW);
      heights.current.clear();
    }
    void loadTail();
  }, [agentId, loadTail]);

  // Follow: a size-checked poll while mounted. No source yet → retry the tail.
  useEffect(() => {
    const tick = () => {
      const w = winRef.current;
      if (busy.current) return;
      if (!w.fileId) { void loadTail(); return; }
      if (!w.live) return;
      busy.current = true;
      historyPage({ agentId, after: w.end }).then((page) => {
        busy.current = false;
        const next = applyNewer(winRef.current, page);
        if (next === 'reload') { void loadTail(); return; }
        if (next !== winRef.current) setWin(next);
      }, () => { busy.current = false; });
    };
    const t = setInterval(tick, POLL_MS);
    return () => clearInterval(t);
  }, [agentId, loadTail, historyPage]);

  // Viewport size; a width change invalidates measured heights.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== widthRef.current) { widthRef.current = el.clientWidth; heights.current.clear(); setMeasureTick((n) => n + 1); }
      setViewport(el.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // After each render: measure mounted rows, then keep the scroll position right.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let changed = false;
    el.querySelectorAll<HTMLElement>('[data-hid]').forEach((row) => {
      const id = row.dataset.hid!;
      const h = row.offsetHeight;
      if (h > 0 && Math.abs((heights.current.get(id) ?? -1) - h) > 0.5) { heights.current.set(id, h); changed = true; }
    });
    const a = anchor.current;
    if (a) {
      const items = winRef.current.items;
      const idx = items.findIndex((i) => i.id === a.id);
      if (idx < 0 || Date.now() > a.until) anchor.current = null;
      else {
        // In the DOM when mounted; otherwise from the (partly estimated) heights above it.
        const row = el.querySelector<HTMLElement>(`[data-hid="${CSS.escape(a.id)}"]`);
        const pad = el.querySelector<HTMLElement>('[data-pad-top]');
        let top = pad ? pad.offsetTop : 0;
        if (row) top = row.offsetTop;
        else for (let i = 0; i < idx; i += 1) top += heights.current.get(items[i].id) ?? EST_ROW;
        const want = Math.max(0, top - a.delta);
        if (Math.abs(el.scrollTop - want) >= 1) el.scrollTop = want;
        if (row && !changed) anchor.current = null;
      }
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight;
    }
    // Programmatic scrolls update the virtual window now, not on a later scroll event.
    if (Math.abs(el.scrollTop - scrollTop) >= 1) setScrollTop(el.scrollTop);
    if (changed) setMeasureTick((n) => n + 1);
  });

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
    stick.current = bottom;
    if (bottom !== atBottom) setAtBottom(bottom);
    setScrollTop(el.scrollTop);
  };

  const hs = win.items.map((i) => heights.current.get(i.id) ?? EST_ROW);
  const range = visibleRange(hs, scrollTop, viewport || 600);
  // Following means: the window reaches the live end AND the view is at the bottom.
  const following = win.live && atBottom;

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
    <div
      ref={scroller}
      onScroll={onScroll}
      data-history-view
      style={{
        flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
        // This list keeps its own place (the Load older anchor, the
        // stick-to-bottom). The browser's scroll anchoring would move scrollTop whenever rows
        // above the view mount or unmount, and the layout effect below feeds scrollTop back into
        // the virtual window: the two fought in a render loop React aborts, unmounting the app.
        overflowAnchor: 'none',
        background: 'var(--cth-paper-200)', position: 'relative'
      }}
    >
      <HistoryList
        win={win}
        first={range.first}
        last={range.last}
        padTop={range.padTop}
        padBottom={range.padBottom}
        loading={loading}
        following={following || !win.fileId}
        onLoadOlder={() => void loadOlder()}
        onJumpLatest={jumpLatest}
      />
    </div>
      {/* Where it is read from, which the fork leaves out (P5). */}
      {win.fileId && win.provider && (
        <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--cth-ink-500)', background: 'var(--cth-cream-100)', boxShadow: 'inset 0 1px 0 var(--cth-ink-300)', flexShrink: 0 }}>
          {t('history.footer', { engine: ENGINE[win.provider] })}
        </div>
      )}
    </div>
  );
}

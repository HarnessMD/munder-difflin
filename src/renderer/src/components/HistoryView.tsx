// Ported from Prozzta/guppyos 02d0d50b (MIT).
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { HistoryItem } from '@shared/history';
import { useRtl } from '@/i18n/useDirection';
import { PixelButton } from './PixelButton';
import {
  EMPTY_WINDOW,
  ENGINE_NAME,
  UNAVAILABLE_KEY,
  applyNewer,
  applyOlder,
  applyTail,
  clockOf,
  systemKey,
  visibleRange,
  type HistoryWindow
} from './historyModel';

/**
 * The History tab (Pam's P5): an agent's conversation, read from its engine's OWN record.
 *
 * The terminal's scrollback is not a record of the conversation: resize repaints and
 * transcript replays pile stale frames into it. This tab reads the transcript instead, so
 * it shows each turn once, and it survives app restarts and window reloads because it
 * simply reads the file again. Read only, never sent anywhere.
 *
 * Virtualised: only rows in view (plus an overscan) are mounted, and the model
 * (historyModel.ts) keeps at most HISTORY_RETAIN_MAX items. It follows new turns only
 * while scrolled to the bottom. Every box has an even 1 px border and its kind in a chip
 * (PROMPT for what was sent in, REPLY for what the agent wrote); the compacted line is a
 * rule with the words in the middle. Conversation text stays as written.
 */

const POLL_MS = 2000;
const EST_ROW = 44;
const STICK_PX = 24;

const small: CSSProperties = { fontSize: 11, color: 'var(--cth-ink-500)' };
const mono: CSSProperties = { fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)' };
const rule: CSSProperties = { flex: 1, height: 1, background: 'var(--cth-ink-300)' };

/** One history row. Exported for render tests. */
export function HistoryRow({ item }: { item: HistoryItem }) {
  const { t } = useTranslation();
  const rtl = useRtl();
  const clock = clockOf(item.at);
  const when = item.at !== null ? new Date(item.at).toLocaleString() : undefined;
  if (item.kind === 'system') {
    const key = systemKey(item.text);
    return (
      <div data-kind="system" title={when} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', ...small }}>
        <span aria-hidden style={rule} />
        {key ? <span>{t(key)}</span> : <code dir="ltr" style={mono}>{item.text}</code>}
        {clock && <span style={mono}>{clock}</span>}
        <span aria-hidden style={rule} />
      </div>
    );
  }
  if (item.kind === 'tool') {
    return (
      <div data-kind="tool" dir="ltr" title={when} style={{
        display: 'flex', gap: 6, alignItems: 'baseline', padding: '2px 10px 2px 18px', minWidth: 0, ...mono
      }}>
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>› {item.text}</span>
        {clock && <span style={{ flexShrink: 0 }}>{clock}</span>}
      </div>
    );
  }
  const prompt = item.kind === 'user';
  return (
    <div data-kind={item.kind} style={{
      margin: '6px 8px', padding: '6px 10px 8px',
      background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={{
          fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px', padding: '1px 5px 0',
          color: 'var(--cth-ink-900)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
          background: prompt ? 'var(--cth-sky-light)' : 'var(--cth-mint-light)'
        }}>
          {t(prompt ? 'history.prompt' : 'history.reply')}
        </span>
        {clock && <span title={when} style={mono}>{clock}</span>}
      </div>
      <div dir={rtl ? 'auto' : undefined} style={{
        fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-900)',
        whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', userSelect: 'text'
      }}>
        {item.text}
        {item.truncated && <span style={small}> {t('history.cut')}</span>}
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

/** A history that cannot be shown, or has nothing yet: one centred line. */
function StateLine({ k }: { k: string }) {
  const { t } = useTranslation();
  return <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, lineHeight: '19px', color: 'var(--cth-ink-700)' }}>{t(k)}</div>;
}

/** The presentational list: header controls, spacers and the mounted rows. Exported for render tests. */
export function HistoryList({ win, first, last, padTop, padBottom, loading, following, onLoadOlder, onJumpLatest }: HistoryListProps) {
  const { t } = useTranslation();
  if (win.unavailable) return <StateLine k={UNAVAILABLE_KEY[win.unavailable]} />;
  // Before the first answer there is nothing to say yet.
  if (!win.fileId) return loading ? null : <StateLine k="history.empty" />;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 6 }}>
        {win.atStart
          ? <span style={small}>{t('history.start')}</span>
          : <PixelButton variant="ghost" size="sm" onClick={onLoadOlder} disabled={loading}>{t('history.loadOlder')}</PixelButton>}
      </div>
      {win.items.length === 0 && <StateLine k="history.empty" />}
      <div data-pad-top style={{ height: padTop }} />
      {/* The measured wrapper CONTAINS its row's margins (flow-root), so its offsetHeight is
          the row's true stride; otherwise a message row's 6 px margins collapse out of it and
          every message row is measured 6 px short. */}
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

  const loadTail = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const page = await window.cth.hiveHistory({ agentId });
      heights.current.clear();
      stick.current = true;
      setAtBottom(true);
      setWin(applyTail(page));
    } catch {
      setWin({ ...EMPTY_WINDOW, unavailable: 'unreadable' });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [agentId]);

  const loadOlder = useCallback(async () => {
    const w = winRef.current;
    if (busy.current || w.atStart || !w.fileId) return;
    busy.current = true;
    setLoading(true);
    let reload = false;
    try {
      const page = await window.cth.hiveHistory({ agentId, before: w.start });
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
  }, [agentId, loadTail]);

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
  useEffect(() => {
    setWin(EMPTY_WINDOW);
    heights.current.clear();
    void loadTail();
  }, [loadTail]);

  // Follow: a size-checked poll while mounted. No source yet: retry the tail.
  useEffect(() => {
    const timer = setInterval(() => {
      const w = winRef.current;
      if (busy.current) return;
      if (!w.fileId) { void loadTail(); return; }
      if (!w.live) return;
      busy.current = true;
      window.cth.hiveHistory({ agentId, after: w.end }).then((page) => {
        busy.current = false;
        const next = applyNewer(winRef.current, page);
        if (next === 'reload') { void loadTail(); return; }
        if (next !== winRef.current) setWin(next);
      }, () => { busy.current = false; });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [agentId, loadTail]);

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
    <div data-history-tab style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        ref={scroller}
        onScroll={onScroll}
        data-history-view
        style={{
          flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
          // This list keeps its own place (the Load older anchor, the stick to bottom). The
          // browser's scroll anchoring would move scrollTop whenever rows above the view mount
          // or unmount, and the layout effect above feeds scrollTop back into the virtual
          // window: the two would fight in a render loop.
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
      {win.provider && (
        <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--cth-ink-500)', background: 'var(--cth-cream-100)', boxShadow: 'inset 0 1px 0 var(--cth-ink-300)' }}>
          {t('history.footer', { engine: ENGINE_NAME[win.provider] })}
        </div>
      )}
    </div>
  );
}

/**
 * THE SMALL PARTS OF THE PRO RAIL'S ROW (0.5.3, F25, Pam's V2 prototype,
 * hive/shared/design/sidebar-pro/v3): the tooltip that opens away from the
 * rail for the badge and the live line, the right click menu, an attention
 * strip, the age text, and the inline note editor. The row itself is in
 * ProSidebar.tsx; nothing here reads the store.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { placeTip, TIP_SURFACE_ATTR, type TipPlace, type TipSurfaceKind } from '@shared/tipPlacement';
import { ageWord } from '@shared/railSeen';
import { useAgoNow } from './railData';
import { inputStyle } from './ui';

/* ---- the tip ------------------------------------------------------------- */

function surfaceOf(el: HTMLElement): { kind: TipSurfaceKind; box: DOMRect } | undefined {
  const host = el.closest(`[${TIP_SURFACE_ATTR}]`);
  if (!(host instanceof HTMLElement)) return undefined;
  const kind = host.getAttribute(TIP_SURFACE_ATTR);
  if (kind !== 'rail' && kind !== 'dock') return undefined;
  return { kind, box: host.getBoundingClientRect() };
}

export const RAIL_TIP_WIDTH = 280;
/** The grace between leaving the badge and the tip closing: long enough to
 *  cross the gap into the tip, short enough that it never lingers. */
export const RAIL_TIP_GRACE_MS = 150;

export interface RailTipHandle {
  /** Open (or move) the tip on this element with this content. */
  open: (anchor: HTMLElement, content: ReactNode) => void;
  /** The pointer left the anchor or the tip: close after the grace. */
  leave: () => void;
  /** The pointer is on the tip: keep it. */
  stay: () => void;
  close: () => void;
  node: ReactNode;
}

/** One tip per row, drawn through a portal at a fixed position to the right
 *  of the rail (founder, 23 Sep 2026: a tip opens away from its surface). It
 *  stays while the pointer is on the anchor or the tip. */
export function useRailTip(): RailTipHandle {
  const [state, setState] = useState<{ anchor: HTMLElement; content: ReactNode } | null>(null);
  const [place, setPlace] = useState<TipPlace | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);
  const cancel = () => { if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; } };
  const open = useCallback((anchor: HTMLElement, content: ReactNode) => {
    cancel();
    const surface = surfaceOf(anchor);
    setPlace(placeTip(anchor.getBoundingClientRect(), { w: window.innerWidth, h: window.innerHeight }, surface));
    setState({ anchor, content });
  }, []);
  const close = useCallback(() => { cancel(); setState(null); setPlace(null); }, []);
  const leave = useCallback(() => { cancel(); timer.current = window.setTimeout(() => { timer.current = null; setState(null); setPlace(null); }, RAIL_TIP_GRACE_MS); }, []);
  const stay = useCallback(() => cancel(), []);
  useEffect(() => () => cancel(), []);
  // Once drawn, the real height decides whether it has to move up to stay
  // inside the window (the same rule TruncatedNote applies).
  useLayoutEffect(() => {
    const el = state?.anchor; const box = boxRef.current;
    if (!place || !el || !box || place.top === undefined) return;
    const surface = surfaceOf(el);
    if (surface?.kind !== 'rail') return;
    const next = placeTip(el.getBoundingClientRect(), { w: window.innerWidth, h: window.innerHeight }, { ...surface, tipHeight: box.offsetHeight });
    if (next.top !== place.top) setPlace(next);
  }, [place, state]);
  const node = state && place ? createPortal(
    <div
      ref={boxRef}
      data-rail-tip
      role="tooltip"
      onMouseEnter={stay}
      onMouseLeave={leave}
      style={{
        position: 'fixed', left: place.left, top: place.top, bottom: place.bottom, zIndex: 60,
        width: RAIL_TIP_WIDTH, maxWidth: place.width, boxSizing: 'border-box',
        background: 'var(--cth-cream-100)', color: 'var(--cth-ink-700)',
        border: '1px solid var(--cth-ink-300)', borderRadius: 8, boxShadow: 'var(--cth-shadow-hard)',
        padding: '8px 0', fontSize: 11, lineHeight: 1.4, fontFamily: 'var(--cth-font-ui)'
      }}
    >
      {state.content}
    </div>,
    document.body
  ) : null;
  return { open, leave, stay, close, node };
}

/** The tip's heading: "3 new from Creed", "Kevin now · T-118". */
export function TipHead({ children }: { children: ReactNode }) {
  return <h4 style={{ margin: '0 10px 6px', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>{children}</h4>;
}

/** One line of a tip: text on the left, clamped to two lines at 11px unless
 *  `full`, the age on the right (Pam's badge tip rule). */
export function TipLine({ text, age, full }: { text: string; age?: string; full?: boolean }) {
  const clamp: CSSProperties = full ? {} : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' };
  return (
    <div data-tip-line style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 10px', minWidth: 0 }}>
      <span style={{ flex: 1, minWidth: 0, color: 'var(--cth-ink-900)', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...clamp }}>{text}</span>
      {age && <small style={{ flexShrink: 0, color: 'var(--cth-ink-500)', fontVariantNumeric: 'tabular-nums', paddingTop: 1, fontSize: 11 }}>{age}</small>}
    </div>
  );
}

export function TipFoot({ children }: { children: ReactNode }) {
  return <div style={{ margin: '6px 10px 0', paddingTop: 6, borderTop: '1px solid var(--cth-ink-300)', color: 'var(--cth-ink-500)', fontSize: 10.5 }}>{children}</div>;
}

/* ---- the right click menu ---------------------------------------------------- */

export interface RowMenuItem { id: string; label: string; danger?: boolean; run: () => void }

/** A fixed menu at the pointer, inside the window, closing on an outside
 *  press, Escape, a scroll or a choice. */
export function RowMenu({ at, items, onClose }: { at: { x: number; y: number }; items: (RowMenuItem | 'rule')[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ left: at.x, top: at.y });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    setPos({ left: Math.max(8, Math.min(at.x, window.innerWidth - w - 8)), top: Math.max(8, Math.min(at.y, window.innerHeight - h - 8)) });
  }, [at.x, at.y]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onClose, true); window.removeEventListener('resize', onClose); };
  }, [onClose]);
  return createPortal(
    <div
      ref={ref} role="menu" data-rail-menu
      style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 70, minWidth: 190, background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-300)', borderRadius: 10, boxShadow: 'var(--cth-shadow-hard)', padding: 5, fontFamily: 'var(--cth-font-ui)', fontSize: 13, color: 'var(--cth-ink-900)' }}
    >
      {items.map((it, i) => it === 'rule'
        ? <div key={`rule-${i}`} style={{ borderTop: '1px solid var(--cth-ink-300)', margin: '5px 0' }} />
        : (
          <button
            key={it.id} type="button" role="menuitem" data-menu-item={it.id}
            onClick={(e) => { e.stopPropagation(); onClose(); it.run(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: it.danger ? 'var(--cth-status-blocked)' : 'inherit' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cth-surface-active)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >{it.label}</button>
        ))}
    </div>,
    document.body
  );
}

/* ---- a strip, the age, the note editor --------------------------------------- */

/** "Asked you · which layout?", "Crashed · exit 1, 12m ago", "Finished · T-118 Billing". */
export function Strip({ kind, word, text, color, tint, title, onClick }: { kind: string; word: string; text: string; color: string; tint: string; title?: string; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <span data-agent-strip={kind} title={title ?? text} onClick={onClick} style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '3px 7px', borderRadius: 6, background: tint, color, minWidth: 0, cursor: onClick ? 'pointer' : undefined }}>
      <b style={{ fontWeight: 600, flexShrink: 0 }}>{word}</b>
      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
    </span>
  );
}

/** The age at the end of the live line. Only this text follows the clock, so
 *  the 30 s tick touches nothing else in the row. */
export function Ago({ ts, style }: { ts: number; style?: CSSProperties }) {
  const now = useAgoNow();
  if (!ts) return null;
  return <span data-agent-ago style={{ marginLeft: 'auto', flexShrink: 0, fontVariantNumeric: 'tabular-nums', ...style }}>{ageWord(ts, Math.max(now, ts))}</span>;
}

/** Enter is a new line, Cmd or Ctrl Enter saves, Escape cancels; Save and
 *  Cancel are there for the mouse. Multi line, the model's size. */
export function NoteEditor({ initial, placeholder, hint, saveLabel, cancelLabel, onSave, onCancel }: {
  initial: string; placeholder: string; hint: string; saveLabel: string; cancelLabel: string;
  onSave: (text: string) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const save = () => onSave(draft.replace(/\s+$/, ''));
  return (
    <span data-agent-note-editor style={{ marginTop: 3, display: 'flex', flexDirection: 'column', gap: 4 }} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}>
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => { const n = e.target.value.length; e.target.setSelectionRange(n, n); }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', height: 'auto', minHeight: 52, resize: 'vertical', padding: '5px 7px', borderRadius: 6, fontSize: 10.5, lineHeight: 1.35, fontFamily: 'inherit' }}
      />
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--cth-ink-500)' }}>
        <span style={{ flex: 1, minWidth: 0 }}>{hint}</span>
        <button type="button" data-note-cancel onClick={onCancel} style={{ border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', color: 'var(--cth-ink-700)', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, cursor: 'pointer', font: 'inherit' }}>{cancelLabel}</button>
        <button type="button" data-note-save onClick={save} style={{ border: '1px solid var(--cth-ink-900)', background: 'var(--cth-ink-900)', color: 'var(--cth-cream-100)', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, cursor: 'pointer', font: 'inherit' }}>{saveLabel}</button>
      </span>
    </span>
  );
}

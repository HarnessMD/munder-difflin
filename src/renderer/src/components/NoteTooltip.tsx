/**
 * THE NOTE, ONE LINE, AND THE WHOLE NOTE ON HOVER WHEN SOMETHING IS HIDDEN
 * (0.5.2, card v052-agent-note-tooltip, founder 8 Sep 2026).
 *
 * Both skins draw an agent's note as one ellipsised line. PRO's row carried
 * title={agent.note} on it, the native tooltip, and the founder still
 * reported the note as unreadable: the native tip waits about a second, is
 * drawn by the OS, and prints a multi-line note as one run of text. So this
 * is a real tooltip, the same in Classic and PRO.
 *
 * TWO RULES. It appears only when the row hides something (@shared/noteTooltip:
 * the line was cut, or the note has more lines), never on a short note the
 * person can already read. And it is drawn through a portal at a fixed
 * position, because the sidebar's scroll region and the row's own overflow
 * would clip anything positioned inside them.
 *
 * WHERE (0.5.3, founder 23 Sep 2026): inside a surface that declares itself
 * (`data-tip-surface="rail"` on the professional sidebar) the tip opens away
 * from that surface, to the right of a rail or above a dock, so it never
 * covers a sibling row. The rule itself is `@shared/tipPlacement`.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { noteFirstLine, noteNeedsTooltip, noteNeedsTooltipClamped, noteShownLines } from '@shared/noteTooltip';
import { placeTip, TIP_SURFACE_ATTR, type TipPlace, type TipSurfaceKind } from '@shared/tipPlacement';

/** The surface this line sits in, if it declared one (founder, 23 Sep 2026:
 *  a tip opens away from its rail or dock, never over sibling rows). The
 *  rail's own box is the one measured, so the tip clears the whole rail. */
function surfaceOf(el: HTMLElement): { kind: TipSurfaceKind; box: DOMRect } | undefined {
  const host = el.closest(`[${TIP_SURFACE_ATTR}]`);
  if (!(host instanceof HTMLElement)) return undefined;
  const kind = host.getAttribute(TIP_SURFACE_ATTR);
  if (kind !== 'rail' && kind !== 'dock') return undefined;
  return { kind, box: host.getBoundingClientRect() };
}

export function TruncatedNote({ note, style, lines = 1, ...rest }: {
  note: string | null | undefined;
  style?: CSSProperties;
  /** How many lines the row shows before it cuts. One is the classic row; the
   *  professional sidebar shows three (0.5.3, feature 3). */
  lines?: number;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'style' | 'title' | 'children'>) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<TipPlace | null>(null);
  const first = noteFirstLine(note);

  // A rail tip is top aligned to its row; once drawn, its real height decides
  // whether it has to move up to stay inside the window.
  useLayoutEffect(() => {
    const el = ref.current; const box = tipRef.current;
    if (!tip || !el || !box || tip.top === undefined) return;
    const surface = surfaceOf(el);
    if (surface?.kind !== 'rail') return;
    const next = placeTip(el.getBoundingClientRect(), { w: window.innerWidth, h: window.innerHeight }, { ...surface, tipHeight: box.offsetHeight });
    if (next.top !== tip.top) setTip(next);
  }, [tip]);

  // Anything that moves the line closes the tip: a scroll anywhere, a resize.
  useEffect(() => {
    if (!tip) return;
    const close = () => setTip(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [tip]);

  const open = () => {
    const el = ref.current;
    if (!el) return;
    const hidden = lines > 1
      ? noteNeedsTooltipClamped(note, lines, { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight })
      : noteNeedsTooltip(note, { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
    if (!hidden) return;
    setTip(placeTip(el.getBoundingClientRect(), { w: window.innerWidth, h: window.innerHeight }, surfaceOf(el)));
  };

  return (
    <>
      <span
        {...rest}
        ref={ref}
        onPointerEnter={open}
        onPointerLeave={() => setTip(null)}
        style={lines > 1
          // The clamp goes AFTER the caller's style: a row that asks for
          // `display: block` (the professional sidebar does) would switch the
          // clamp off, and the row would show every line while looking fine.
          ? { ...style, display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }
          : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...style }}
      >{lines > 1 ? noteShownLines(note) : first}</span>
      {tip && note && createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          data-note-tooltip
          style={{
            position: 'fixed', left: tip.left, top: tip.top, bottom: tip.bottom, width: tip.width,
            zIndex: 700, pointerEvents: 'none',
            padding: '5px 8px', borderRadius: 4,
            background: 'var(--cth-ink-900)', color: 'var(--cth-cream-100)',
            boxShadow: 'inset 0 0 0 1px var(--cth-ink-700), var(--cth-shadow-hard)',
            fontFamily: 'var(--cth-font-ui)', fontSize: 11, lineHeight: '15px', fontStyle: 'normal',
            textTransform: 'none', letterSpacing: 0,
            whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'
          }}
        >{note.trim()}</div>,
        document.body
      )}
    </>
  );
}

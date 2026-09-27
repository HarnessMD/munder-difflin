/**
 * DRAG TO REORDER THE RAIL (0.5.3, founder 24 Sep 2026: "make sure the ui that
 * we build when user drags any particular agent up or down is smooth").
 *
 * Only while Keep my agent order is on and nothing is being searched. The row
 * lifts and follows the pointer; the rows it passes slide out of its way with
 * a short transform (150 ms), so nothing reflows while the pointer moves. The
 * order is written once, on release. The rows themselves are the memoised
 * AgentRow and are never re-rendered by a drag: the transform sits on the
 * wrapper this file draws, so a status update cannot make the list flicker
 * and a drag cannot make a row repaint its contents.
 *
 * Batch 3 (founder, 25 Sep: "reorder does not work at all"): the grip was a
 * 10px strip on the row's left edge, invisible until hovered, so nobody found
 * it. It is now a small handle drawn under every avatar, always shown while
 * the setting is on, with the hand cursor. Project headings move the same way,
 * with no handle of their own: press a heading and move a few pixels and the
 * whole project (heading and rows) lifts; a press that does not move is still
 * the click that folds it.
 *
 * The keyboard way is the row menu's Move up / Move down, through the same
 * context. The rules (where a row lands, how far the others slide, what a
 * move may cross) are shared/agentOrder.ts.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { portraitBox } from '../SpritePortrait';
import { canMove as canMoveRule, dropIndex, moveBy, moveInGroup, shiftFor } from '@shared/agentOrder';

export interface RailOrder {
  /** Rows can be moved: the setting is on and nothing is being searched. */
  enabled: boolean;
  move: (id: string, delta: -1 | 1) => void;
  canMove: (id: string, delta: -1 | 1) => boolean;
}

const OFF: RailOrder = { enabled: false, move: () => {}, canMove: () => false };
export const RailOrderContext = createContext<RailOrder>(OFF);
export const useRailOrder = (): RailOrder => useContext(RailOrderContext);

interface Drag {
  id: string;
  ids: string[];
  from: number;
  to: number;
  dy: number;
  height: number;
  centres: number[];
  startY: number;
  /** Still under the move threshold: nothing lifts yet, and a release is a click. */
  armed?: boolean;
}

/** How far a heading must move before a press becomes a drag. */
const DRAG_THRESHOLD = 4;
/** The handle under the avatar, centred on it (founder retest, 25 Sep: it sat
 *  right of the avatar). The portrait asked for at 28 is 28 TALL but only
 *  portraitBox(28).w wide (18: the sprite is taller than wide), so the centre
 *  is the row's padding plus half that width, not half of 28. The row's
 *  padding is ProSidebar AgentRow's `6px 6px 6px ${CARD_PAD_LEFT}px`: 10 on
 *  the left, 6 on the right, and in Arabic the avatar sits on the right. */
const ROW_PAD_LEFT = 10;
const ROW_PAD_RIGHT = 6;
const AVATAR_W = portraitBox(28).w;
const GRIP_TOP = 38;
const GRIP_WIDTH = 22;
const GRIP_LTR = ROW_PAD_LEFT + AVATAR_W / 2 - GRIP_WIDTH / 2;
const GRIP_RTL = ROW_PAD_RIGHT + AVATAR_W / 2 - GRIP_WIDTH / 2;

// The click that ends a real drag must not fold a project or open an agent.
function swallowNextClick(): void {
  const eat = (e: Event) => { e.stopPropagation(); e.preventDefault(); };
  window.addEventListener('click', eat, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener('click', eat, { capture: true }), 0);
}

function reducedMotion(): boolean {
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true; } catch { return false; }
}

export function useRailDrag(enabled: boolean, groups: string[][], commit: (next: string[][]) => void) {
  const { t } = useTranslation();
  const els = useRef(new Map<string, HTMLElement>());
  const [drag, setDrag] = useState<Drag | null>(null);
  // A moment with no transition after a drop, so the rows that just took
  // their new places do not animate back from the offsets they were drawn at.
  const [settling, setSettling] = useState(false);
  const reduce = useMemo(reducedMotion, []);
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;

  const order: RailOrder = useMemo(() => ({
    enabled,
    move: (id, delta) => { if (enabled && canMoveRule(groupsRef.current, id, delta)) commit(moveBy(groupsRef.current, id, delta)); },
    canMove: (id, delta) => enabled && canMoveRule(groupsRef.current, id, delta)
  }), [enabled, commit]);

  const onMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (d.armed) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      document.body.style.cursor = 'grabbing';
    }
    const to = dropIndex(d.centres, d.from, d.centres[d.from] + dy);
    const next = { ...d, dy, to, armed: false };
    dragRef.current = next;
    setDrag(next);
  }, []);
  const onUp = useCallback(() => {
    const d = dragRef.current;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    document.body.style.cursor = '';
    dragRef.current = null;
    if (!d) return;
    if (d.armed) { setDrag(null); return; }
    swallowNextClick();
    setSettling(true);
    setDrag(null);
    if (d.to !== d.from) commit(moveInGroup(groupsRef.current, d.id, d.to));
    // Not an animation, just a pause: long enough for the new order to paint.
    window.setTimeout(() => setSettling(false), 60);
  }, [commit, onMove]);
  useEffect(() => () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  }, [onMove, onUp]);

  /** `threshold`: a heading, which is also a button; the drag waits for the
   *  pointer to move so a plain click still reaches it. */
  const start = (e: React.PointerEvent, id: string, threshold = false) => {
    if (!enabled || e.button !== 0) return;
    const ids = groupsRef.current.find((g) => g.includes(id));
    if (!ids || ids.length < 2) return;
    if (!threshold) e.preventDefault();
    e.stopPropagation();
    const rects = ids.map((x) => els.current.get(x)?.getBoundingClientRect());
    if (rects.some((r) => !r)) return;
    const rs = rects as DOMRect[];
    const from = ids.indexOf(id);
    // The slot a row takes: its own height plus the gap to the next one.
    const next = rs[from + 1] ?? rs[from - 1];
    const gap = next ? Math.max(0, Math.abs(next.top - rs[from].top) - (next.top > rs[from].top ? rs[from].height : next.height)) : 0;
    const d: Drag = { id, ids, from, to: from, dy: 0, height: rs[from].height + gap, centres: rs.map((r) => r.top + r.height / 2), startY: e.clientY, armed: threshold };
    dragRef.current = d;
    if (!threshold) { setDrag(d); document.body.style.cursor = 'grabbing'; }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  /** The wrapper every movable thing sits in: it carries the transform. */
  const block = (id: string, children: ReactNode, kind: 'row' | 'group'): ReactNode => {
    const live = drag && !drag.armed ? drag : null;
    const i = live ? live.ids.indexOf(id) : -1;
    const held = live?.id === id;
    const style: CSSProperties = { position: 'relative' };
    if (live && i >= 0) {
      style.transform = `translateY(${held ? live.dy : shiftFor(i, live.from, live.to, live.height)}px)`;
      style.transition = held || reduce ? 'none' : 'transform 150ms ease';
      if (held) {
        style.zIndex = 3;
        style.borderRadius = 8;
        style.background = 'var(--cth-paper-100)';
        style.boxShadow = 'var(--cth-shadow-hard)';
      }
    } else if (!settling && !reduce) {
      style.transition = 'transform 150ms ease';
    }
    return (
      <div
        key={id}
        ref={(el) => { if (el) els.current.set(id, el); else els.current.delete(id); }}
        {...(kind === 'row' ? { 'data-order-row': id } : { 'data-order-group': id })}
        data-dragging={held ? '' : undefined}
        className={enabled ? (kind === 'row' ? 'cth-order-row' : 'cth-order-group') : undefined}
        style={style}
      >
        {children}
      </div>
    );
  };

  /** An agent row with its handle under the avatar. */
  const wrap = (id: string, row: ReactNode, name: string): ReactNode => block(id, (
    <>
      {row}
      {/* Alone in its project there is nowhere to go: no handle. */}
      {enabled && (groups.find((g) => g.includes(id))?.length ?? 0) > 1 && (
        <span
          role="button" tabIndex={-1} aria-hidden
          className="cth-order-grip" data-order-grip={id}
          title={t('pro.rail.dragToMove', { name })}
          onPointerDown={(e) => start(e, id)}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: GRIP_TOP, width: GRIP_WIDTH, height: 14, borderRadius: 4,
            ['--cth-grip-ltr' as string]: `${GRIP_LTR}px`, ['--cth-grip-rtl' as string]: `${GRIP_RTL}px`,
            display: 'grid', placeItems: 'center', cursor: drag?.id === id ? 'grabbing' : 'grab', touchAction: 'none', zIndex: 4,
            color: 'var(--cth-ink-500)'
          }}
        >
          <svg width="12" height="6" viewBox="0 0 12 6" aria-hidden>
            {[1, 5].flatMap((y) => [1, 6, 11].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" />))}
          </svg>
        </span>
      )}
    </>
  ), 'row');

  /** A project: heading and rows move as one. The heading starts the drag. */
  const group = (key: string, children: ReactNode): ReactNode => block(key, children, 'group');
  const headingDown = (e: React.PointerEvent, key: string) => start(e, key, true);

  return { order, wrap, group, headingDown, dragging: drag && !drag.armed ? drag.id : null };
}

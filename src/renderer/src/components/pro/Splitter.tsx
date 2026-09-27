/**
 * A DRAG HANDLE FOR THE PRO RIGHT RAIL (0.4.10, founder 4 Sep 2026: "make the
 * right sidebar drag to resize horizontally").
 *
 * Ported from the Classic floor's SidebarSplitter, which has held that job
 * since 0.3: mouse down arms it, the move and up listeners live on the WINDOW
 * so the drag survives the pointer leaving the 8px handle, and the width is
 * clamped by the caller's floor and ceiling rather than by the DOM.
 *
 * THREE THINGS CLASSIC'S DOES NOT DO.
 *
 *   1. It is reachable from the keyboard. A separator that only answers a
 *      drag is a control a person on a keyboard cannot use at all, so this is
 *      a `role="separator"` with `aria-valuenow` and the left and right arrows
 *      move it by RAIL_STEP. Left widens the rail, because left is the
 *      direction the handle travels to widen it.
 *   2. It never animates. MemoryScreen owns the one requestAnimationFrame loop
 *      in PRO (test/pro-phase6) and the stage measures its wrapper every
 *      frame, so a resize needs no observer and no second loop: the next frame
 *      already reads the new width.
 *   3. The clamp is shared arithmetic, not a local Math.min. `railWidthFrom`
 *      lives in shared/memoryGraphModel.ts so the drag, the arrow keys and the
 *      stored width all round the same way and are unit tested once.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { RAIL_MAX, RAIL_MIN, RAIL_STEP, clampRail, railWidthFrom } from '@shared/memoryGraphModel';

export interface SplitterProps {
  /** Current rail width in px. */
  width: number;
  onChange: (px: number) => void;
  /** Double click puts it back here. */
  reset: number;
  label: string;
  title: string;
  min?: number;
  max?: number;
}

/** The narrowest the thing beside the rail may be squeezed to. A rail dragged
 *  across the whole window is a rail that ate the thing it describes, and the
 *  static ceiling cannot know how wide the window is today. */
const NEIGHBOUR_FLOOR = 380;

export function Splitter({ width, onChange, reset, label, title, min = RAIL_MIN, max = RAIL_MAX }: SplitterProps) {
  const start = useRef<{ clientX: number; width: number } | null>(null);
  const [active, setActive] = useState(false);
  const ceiling = useCallback(() => Math.max(min, Math.min(max, window.innerWidth - NEIGHBOUR_FLOOR)), [min, max]);

  useEffect(() => {
    if (!active) return;
    const onMove = (e: MouseEvent) => {
      const from = start.current;
      if (!from) return;
      // Dragging LEFT is a positive delta, because left is what widens a rail
      // pinned to the right edge.
      onChange(railWidthFrom(from.width, from.clientX - e.clientX, min, ceiling()));
    };
    const onUp = () => { start.current = null; setActive(false); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [active, min, ceiling, onChange]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? RAIL_STEP * 3 : RAIL_STEP;
    if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(railWidthFrom(width, step, min, ceiling())); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); onChange(railWidthFrom(width, -step, min, ceiling())); }
    else if (e.key === 'Home') { e.preventDefault(); onChange(clampRail(ceiling(), min, ceiling())); }
    else if (e.key === 'End') { e.preventDefault(); onChange(clampRail(min, min, ceiling())); }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={title}
      onMouseDown={(e) => { start.current = { clientX: e.clientX, width }; setActive(true); e.preventDefault(); }}
      onDoubleClick={() => onChange(clampRail(reset, min, ceiling()))}
      onKeyDown={onKeyDown}
      style={{
        width: 8, flexShrink: 0, position: 'relative', cursor: 'ew-resize', alignSelf: 'stretch',
        background: active ? 'var(--cth-accent-soft)' : 'transparent', border: 'none', padding: 0
      }}
    >
      {/* The grip: three marks in the middle of the column, so the handle reads
          as something to pull rather than as a gap between two panels. */}
      <span style={{
        position: 'absolute', top: '50%', left: 2, transform: 'translateY(-50%)',
        width: 4, height: 26, borderRadius: 'var(--cth-radius-sm)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
      }}>
        <span style={{ height: 2, borderRadius: 'var(--cth-radius-sm)', background: active ? 'var(--cth-accent)' : 'var(--cth-ink-300)' }} />
        <span style={{ height: 2, borderRadius: 'var(--cth-radius-sm)', background: active ? 'var(--cth-accent)' : 'var(--cth-ink-300)' }} />
        <span style={{ height: 2, borderRadius: 'var(--cth-radius-sm)', background: active ? 'var(--cth-accent)' : 'var(--cth-ink-300)' }} />
      </span>
    </div>
  );
}

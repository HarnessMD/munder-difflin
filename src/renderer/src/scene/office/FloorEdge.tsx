// The white edge round the office floor. The box keeps its size and the edge is drawn on its
// outer side. The floor sits inside; what its art does not cover is filled with the floor's
// background colour.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { floorEdge, OFFICE_EDGE } from './framing';

/** The area inside the edge, in CSS px; `inset` is its offset from the box's top left. */
export interface FloorInner { w: number; h: number; inset: number }

export function FloorEdge({ fill, children }: { fill: string; children: (inner: FloorInner) => ReactNode }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    // The border box: the edge is sized from the whole box, its own lines included.
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox((was) => (was.w === r.width && was.h === r.height ? was : { w: r.width, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const edge = floorEdge(box.w, box.h);
  const inner = { w: Math.max(0, box.w - 2 * edge.inset), h: Math.max(0, box.h - 2 * edge.inset), inset: edge.inset };
  return (
    <div ref={boxRef} data-floor-edge style={{ position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box', overflow: 'hidden', background: OFFICE_EDGE.bandColour, border: `${edge.line}px solid ${OFFICE_EDGE.lineColour}` }}>
      <div data-floor-inner style={{ position: 'absolute', inset: edge.band, overflow: 'hidden', border: `${edge.line}px solid ${OFFICE_EDGE.lineColour}`, background: fill }}>
        {children(inner)}
      </div>
    </div>
  );
}

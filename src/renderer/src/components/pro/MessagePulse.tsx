/**
 * W-C, THE MESSAGE PULSE (0.4.9 phase 6): the React half. The store is
 * pulseStore.ts; this file is
 *
 *   usePulseFeed()   ONE subscription to `window.cth.onHiveMessage`, mounted
 *                    once in ProShell. `from` and `to` are agent ids (`god` is
 *                    the orchestrator, `human` the person); `targets` is the
 *                    resolved recipient list, so a message to a group beats
 *                    once per recipient.
 *   useBeat(id)      true while `id` is at either end of a live beat. The
 *                    Agents grid turns it into the accent RING (a 2px
 *                    box-shadow, never a thicker border: the even border
 *                    rule) and the sidebar rows into a soft accent fill.
 *   PulseOverlay     the travelling dot: an SVG laid over the grid's content
 *                    that measures the two cards (`data-agent`) and animates
 *                    a 7px accent dot down the straight line between them.
 *
 * MOTION IS CSS, NOT A FRAME LOOP. Each dot is one keyframe animation with
 * its endpoints in custom properties, so there is nothing to tick and
 * nothing runs when the grid is idle; MemoryScreen stays the one owner of a
 * requestAnimationFrame in PRO. Under `prefers-reduced-motion: reduce` the
 * overlay draws nothing at all and the glow carries the whole message.
 */
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from 'react';
import { DOT_MS, isLive, pulse, readBeats, subscribeBeats, type Beat } from './pulseStore';

/** The accent ring a card wears for the beat. */
export const BEAT_RING = '0 0 0 2px var(--cth-accent)';

export function useBeat(id: string): boolean {
  return useSyncExternalStore(subscribeBeats, () => isLive(id), () => false);
}

/** Mounted once, in ProShell: the one subscription that feeds the store. */
export function usePulseFeed(): void {
  useEffect(() => {
    const api = window.cth;
    if (!api?.onHiveMessage) return;
    return api.onHiveMessage((e) => {
      const targets = e.targets?.length ? e.targets : [e.to];
      for (const to of targets) pulse(e.from, to);
    });
  }, []);
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Lay this inside a `position: relative` wrapper around the cards. */
export function PulseOverlay() {
  const beats = useSyncExternalStore(subscribeBeats, readBeats, readBeats);
  const ref = useRef<SVGSVGElement>(null);
  const dots = beats.filter((b) => b.dot);
  if (dots.length === 0 || reducedMotion()) return null;
  return (
    <svg ref={ref} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 2 }}>
      {dots.map((b) => <TravellingDot key={b.id} beat={b} svg={ref} />)}
    </svg>
  );
}

interface Segment { x1: number; y1: number; x2: number; y2: number }

/** Measured once, on mount: the two card centres in the overlay's own space.
 *  A card that is not in the grid (filtered out, or a person) means no dot. */
function TravellingDot({ beat, svg }: { beat: Beat; svg: RefObject<SVGSVGElement | null> }) {
  const [seg, setSeg] = useState<Segment | null>(null);
  useLayoutEffect(() => {
    const host = svg.current?.parentElement;
    const box = svg.current?.getBoundingClientRect();
    if (!host || !box) return;
    const centre = (id: string) => {
      const el = host.querySelector<HTMLElement>(`[data-agent="${CSS.escape(id)}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
    };
    const a = centre(beat.from);
    const b = centre(beat.to);
    if (a && b) setSeg({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }, [beat, svg]);
  if (!seg) return null;
  const vars = {
    '--pulse-x1': `${seg.x1}px`, '--pulse-y1': `${seg.y1}px`,
    '--pulse-x2': `${seg.x2}px`, '--pulse-y2': `${seg.y2}px`
  } as CSSProperties;
  return (
    <g style={vars}>
      <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="var(--cth-accent)" strokeWidth={1} strokeDasharray="3 4"
        style={{ animation: `pro-pulse-fade ${DOT_MS}ms linear forwards` }} />
      <circle r={3.5} fill="var(--cth-accent)" style={{ animation: `pro-pulse-travel ${DOT_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards` }} />
    </g>
  );
}

// The two keyframes, injected once. The endpoints are custom properties set
// per dot, so one rule serves every beat.
const style = document.createElement('style');
style.textContent = '@keyframes pro-pulse-travel{from{transform:translate(var(--pulse-x1),var(--pulse-y1));opacity:1}to{transform:translate(var(--pulse-x2),var(--pulse-y2));opacity:.85}}@keyframes pro-pulse-fade{from{opacity:.55}to{opacity:0}}';
if (typeof document !== 'undefined' && !document.getElementById('pro-pulse-style')) { style.id = 'pro-pulse-style'; document.head.appendChild(style); }

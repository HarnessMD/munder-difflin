import { memo, useEffect, useRef, type AnimationEvent } from 'react';
import { onPersonSent } from './seasonEvents';
import { glowFor, glowWait, moodFor } from './seasonCornerPlan';
import './christmasCorner.css';

/**
 * THE CHRISTMAS CORNER of a queue input area: the twin of the Halloween
 * corner (SeasonCorner.tsx draws one or the other by the season). Every
 * piece reacts to something real, by the same rules (seasonCornerPlan.ts):
 *   the tree's lights   the agent's status: twinkling at work, a slow
 *                       breath while dozing, one jump when it needs you,
 *                       dark with no session;
 *   the star            how full the agent's context is (the candle's rule);
 *   a gift              leaves with each message the person sends.
 * A short string of lights hangs in the corner where the cobweb hangs.
 *
 * It never changes layout: the whole corner is absolutely placed over the
 * input area's root, and only the tree's drawn shape takes the pointer (a
 * click makes it hop). Only transform and opacity move.
 */
export interface ChristmasCornerProps {
  agentId: string;
  status: string;
  hasSession: boolean;
  contextTokens: number | undefined;
  contextLimit: number | undefined;
}

export const ChristmasCorner = memo(function ChristmasCorner({ agentId, status, hasSession, contextTokens, contextLimit }: ChristmasCornerProps) {
  const mood = moodFor({ status, hasSession });
  const glow = glowFor(contextTokens, contextLimit);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const starRef = useRef<HTMLDivElement | null>(null);
  const giftRef = useRef<HTMLDivElement | null>(null);

  // The star: opacity only, written when the value changed and at most once
  // a second, like the candle.
  const shownAt = useRef<number | null>(null);
  useEffect(() => {
    const show = (): void => {
      shownAt.current = Date.now();
      if (starRef.current) starRef.current.style.opacity = String(glow);
    };
    const wait = glowWait(shownAt.current, Date.now());
    if (wait === 0) { show(); return; }
    const t = setTimeout(show, wait);
    return () => clearTimeout(t);
  }, [glow]);

  // A gift per message the person sends to this agent.
  useEffect(() => onPersonSent((id) => {
    if (id !== agentId) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    play(giftRef.current, 'cth-xc-go');
  }), [agentId]);

  const ended = (e: AnimationEvent<HTMLDivElement>): void => {
    if (e.animationName === 'cth-xc-hop') e.currentTarget.classList.remove('cth-xc-hop');
    if (e.animationName === 'cth-xc-send') e.currentTarget.classList.remove('cth-xc-go');
  };

  return (
    <div className="cth-xc" aria-hidden="true" data-mood={mood}>
      <svg className="cth-xc-garland" viewBox="0 0 56 12" width="56" height="12">
        <path d="M0 2 Q14 10 28 3 Q42 10 56 2" stroke="var(--cth-season-ink)" strokeWidth="0.8" fill="none" opacity="0.6" />
        {GARLAND.map(([x, y], i) => (
          <circle key={i} className={`cth-xc-bulb cth-xc-b${i % 4}`} cx={x} cy={y} r="1.6" fill={BULB_FILL[i % 4]} />
        ))}
      </svg>
      <div ref={treeRef} className="cth-xc-tree" onAnimationEnd={ended}>
        <div className="cth-xc-lean">
          <div ref={starRef} className="cth-xc-level"><div className="cth-xc-glow" /></div>
          <svg className="cth-xc-layer" viewBox="0 0 24 28" width="22" height="26">
            <rect x="10" y="23" width="4" height="4" fill="#6B4426" />
            {/* The drawn shape is the only thing in the corner that takes the pointer. */}
            <g className="cth-xc-hit" onClick={() => play(treeRef.current, 'cth-xc-hop')}>
              <path d="M12 3 L20 13 L16 13 L22 23 L2 23 L8 13 L4 13 Z" fill="var(--cth-season-green)" />
            </g>
            <path d="M12 3 L8 13 L10 13 L6 21" stroke="var(--cth-season-green-hi)" strokeWidth="1.2" fill="none" />
            <path d="M6 16 Q12 19 18 15" stroke="var(--cth-season-gold)" strokeWidth="0.9" fill="none" />
            {TREE_BULBS.map(([x, y], i) => (
              <circle key={i} className={`cth-xc-bulb cth-xc-b${i % 4}`} cx={x} cy={y} r="1.3" fill={BULB_FILL[i % 4]} />
            ))}
            <path d="M12 0 L13.2 2.6 L16 2.8 L13.8 4.5 L14.6 7.2 L12 5.6 L9.4 7.2 L10.2 4.5 L8 2.8 L10.8 2.6 Z" fill="var(--cth-season-gold)" />
          </svg>
        </div>
      </div>
      <div ref={giftRef} className="cth-xc-gift" onAnimationEnd={ended}>
        <svg viewBox="0 0 16 16" width="16" height="16">
          <rect x="1" y="5" width="14" height="10" fill="var(--cth-season-red)" />
          <rect x="7" y="5" width="2" height="10" fill="var(--cth-season-gold)" />
          <rect x="1" y="8" width="14" height="2" fill="var(--cth-season-gold)" />
          <path d="M8 5 C5 1, 2 3, 5 5 Z M8 5 C11 1, 14 3, 11 5 Z" fill="var(--cth-season-gold)" />
        </svg>
      </div>
    </div>
  );
});

/** Start a one shot animation again, even while it is still playing. */
function play(el: HTMLElement | null, cls: string): void {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

const BULB_FILL = ['var(--cth-season-red)', 'var(--cth-season-gold)', 'var(--cth-season-green-hi)', '#6FA8DC'] as const;
const TREE_BULBS: ReadonlyArray<readonly [number, number]> = [[11, 9], [14, 11], [8, 16], [13, 15], [17, 19], [6, 20], [11, 20]];
const GARLAND: ReadonlyArray<readonly [number, number]> = [[5, 4.6], [11, 6.6], [17, 6.6], [23, 4.6], [33, 4.6], [39, 6.6], [45, 6.6], [51, 4.6]];

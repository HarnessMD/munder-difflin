import './pieces.css';

/**
 * The night's creatures, one source each (W4b): the cobweb, the spider and
 * the bat. SeasonCorner and the window layer draw these, so no piece is
 * drawn twice. The kit rows that use them: 7 (cobweb idle), 2 (spider
 * loader), 12 and 23 (bats).
 */
export function Cobweb({ size = 56 }: { size?: number }) {
  return (
    <svg className="cth-pc-web" viewBox="0 0 80 80" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="var(--cth-ink-500)" strokeWidth="1.1" strokeLinecap="round">
        <path d="M80 0 L10 0 M80 0 L22 38 M80 0 L48 62 M80 0 L80 72" />
        <path d="M66 0 Q68 8 80 12" />
        <path d="M50 0 Q54 16 62 23 Q70 26 80 26" />
        <path d="M34 0 Q40 22 51 33 Q60 40 80 42" />
        <path d="M20 0 Q28 28 40 44 Q54 56 80 58" />
      </g>
    </svg>
  );
}

export function Spider({ width = 13 }: { width?: number }) {
  return (
    <svg className="cth-pc-spider" viewBox="0 0 20 16" width={width} height={width * 0.8} aria-hidden="true">
      <g stroke="var(--cth-season-bat)" strokeWidth="1.2" strokeLinecap="round" fill="none">
        <path d="M7 7 L2 3 M7 8 L1 8 M7 9 L2 13 M13 7 L18 3 M13 8 L19 8 M13 9 L18 13" />
      </g>
      <ellipse cx="10" cy="8.5" rx="4" ry="4.5" fill="var(--cth-season-bat)" />
      <circle cx="8.6" cy="7.6" r="1.1" fill="var(--cth-season-ghost)" />
      <circle cx="11.4" cy="7.6" r="1.1" fill="var(--cth-season-ghost)" />
      <circle cx="8.8" cy="7.9" r="0.5" fill="var(--cth-season-ink)" />
      <circle cx="11.6" cy="7.9" r="0.5" fill="var(--cth-season-ink)" />
    </svg>
  );
}

// The wings are separate boxes: a transform on an SVG <g> is not composited
// (Kevin's perf note on #171), so a caller flaps .cth-pc-bat-wing, never a path.
const BAT_WING_L = 'M19 9 C14 3, 8 2, 1 5 C5 6, 6 9, 5 12 C8 10, 10 12, 11 14 C13 11, 16 11, 19 12 Z';
const BAT_WING_R = 'M21 9 C26 3, 32 2, 39 5 C35 6, 34 9, 35 12 C32 10, 30 12, 29 14 C27 11, 24 11, 21 12 Z';

/** A bat, 44 by 22. `className` goes on the outer box, the one a caller flies. */
export function Bat({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="cth-pc cth-pc-bat">
        <div className="cth-pc-bat-wing cth-pc-bat-wing-l">
          <svg viewBox="0 0 20 20" width="22" height="22"><path d={BAT_WING_L} fill="var(--cth-season-bat)" /></svg>
        </div>
        <div className="cth-pc-bat-wing cth-pc-bat-wing-r">
          <svg viewBox="20 0 20 20" width="22" height="22"><path d={BAT_WING_R} fill="var(--cth-season-bat)" /></svg>
        </div>
        <svg className="cth-pc-bat-body" viewBox="0 0 40 20" width="44" height="22">
          <ellipse cx="20" cy="10.5" rx="3.2" ry="4" fill="var(--cth-season-bat)" />
          <path d="M17.6 7.2 L18 4.6 L19.2 6.8 Z M22.4 7.2 L22 4.6 L20.8 6.8 Z" fill="var(--cth-season-bat)" />
          <circle cx="18.9" cy="9.6" r="0.8" fill="var(--cth-season-orange-hi)" />
          <circle cx="21.1" cy="9.6" r="0.8" fill="var(--cth-season-orange-hi)" />
        </svg>
      </div>
    </div>
  );
}

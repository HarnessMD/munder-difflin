import './pieces.css';

/**
 * The Send button's candle (kit row 9), two boxes: the wick, a 2 by 3 stub on
 * the button's top edge, and the flame above it, lit on hover and on keyboard
 * focus. The caller places both and fades the flame in (opacity, transform);
 * the focus ring stays the button's own.
 */
export function Wick() {
  return <div className="cth-pc cth-pc-wick" aria-hidden="true" />;
}

export function Flame({ height = 10 }: { height?: number }) {
  const w = height * 0.7;
  return (
    <div className="cth-pc cth-pc-flame" aria-hidden="true" style={{ width: w, height }}>
      <svg viewBox="0 0 7 10" width={w} height={height}>
        <path d="M3.5 0 C5 2.5, 7 4.2, 7 6.5 C7 8.6, 5.4 10, 3.5 10 C1.6 10, 0 8.6, 0 6.5 C0 4.2, 2 2.5, 3.5 0 Z" fill="var(--cth-season-orange)" />
        <path d="M3.5 4 C4.4 5.4, 5.2 6.2, 5.2 7.4 C5.2 8.5, 4.4 9.2, 3.5 9.2 C2.6 9.2, 1.8 8.5, 1.8 7.4 C1.8 6.2, 2.6 5.4, 3.5 4 Z" fill="var(--cth-season-flame)" />
      </svg>
    </div>
  );
}

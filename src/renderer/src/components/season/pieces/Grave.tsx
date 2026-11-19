import './pieces.css';

/**
 * Three strands of web that spin out of a ticked checkbox (kit row 10). Each
 * strand is its own box, anchored at the box's top left corner, so a caller
 * grows it with scale and fades it (transform, opacity). No spider here: the
 * spider belongs to the loader.
 */
export function WebStrands({ size = 18 }: { size?: number }) {
  const strand = (n: number, d: string) => (
    <div className={`cth-pc-strand cth-pc-strand-${n}`}>
      <svg viewBox="0 0 18 18" width={size} height={size}><path d={d} fill="none" stroke="var(--cth-ink-500)" strokeWidth="1" strokeLinecap="round" /></svg>
    </div>
  );
  return (
    <div className="cth-pc cth-pc-strands" aria-hidden="true" style={{ width: size, height: size }}>
      {strand(1, 'M0 0 Q7 1.5 17 1')}
      {strand(2, 'M0 0 Q8 6 15 14')}
      {strand(3, 'M0 0 Q1.5 8 1 17')}
    </div>
  );
}

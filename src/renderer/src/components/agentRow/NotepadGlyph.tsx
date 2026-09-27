/**
 * THE NOTEPAD GLYPH (0.5.3, F25; founder, 23 Sep: the note's icon is the
 * notepad, not the pencil, and it stands in front of the note). One inline
 * SVG in the current colour, so it follows the text it labels.
 */
export function NotepadGlyph({ size = 11, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      data-notepad-glyph
      viewBox="0 0 24 24" width={size} height={size} aria-hidden
      style={{ flexShrink: 0, display: 'block', stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', ...style }}
    >
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v3M15 3v3M9 11h6M9 15h4" />
    </svg>
  );
}

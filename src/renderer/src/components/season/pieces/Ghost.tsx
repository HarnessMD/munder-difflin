import './pieces.css';

export type GhostFace = 'calm' | 'boo' | 'poof' | 'rattled' | 'peek' | 'mail';

/**
 * The season's ghost (kit rows 13, 3, 6, 16). One body, five faces:
 *   calm     eyes open, nothing said
 *   boo      a round open mouth: the "Copied" ghost that pops up
 *   poof     eyes shut in a smile: floats out of a finished card
 *   rattled  wide eyes and a wobbly mouth: a failure's one shake
 *   peek     eyes looking up and to the side: over a tooltip's edge
 *   mail     carrying a letter: the corner's ghost that leaves with a sent message
 * The box is the moving part; the caller animates it (transform, opacity).
 */
export function Ghost({ face = 'calm', size = 20 }: { face?: GhostFace; size?: number }) {
  return (
    <div className="cth-pc cth-pc-ghost" aria-hidden="true" style={{ width: size, height: size * 1.15 }}>
      <svg viewBox="0 0 40 46" width={size} height={size * 1.15}>
        <path d="M4 22 C4 9, 12 2, 20 2 C28 2, 36 9, 36 22 L36 42 C33 39, 31 45, 28 42 C25 39, 23 45, 20 42 C17 39, 15 45, 12 42 C9 39, 7 45, 4 42 Z"
          fill="var(--cth-season-ghost)" stroke="var(--cth-season-purple)" strokeWidth="1.8" />
        <GhostFaceArt face={face} />
      </svg>
    </div>
  );
}

function GhostFaceArt({ face }: { face: GhostFace }) {
  const ink = 'var(--cth-season-ink)';
  switch (face) {
    case 'boo':
      return (<g fill={ink}><ellipse cx="14.5" cy="18" rx="2.6" ry="3.4" /><ellipse cx="25.5" cy="18" rx="2.6" ry="3.4" /><ellipse cx="20" cy="29" rx="4" ry="5" /></g>);
    case 'poof':
      return (<g fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round"><path d="M11.5 19 Q14.5 16 17.5 19 M22.5 19 Q25.5 16 28.5 19 M16 26 Q20 30 24 26" /></g>);
    case 'rattled':
      return (<g><circle cx="14.5" cy="18" r="3.6" fill={ink} /><circle cx="25.5" cy="18" r="3.6" fill={ink} /><circle cx="15.5" cy="17" r="1.2" fill="var(--cth-season-ghost)" /><circle cx="26.5" cy="17" r="1.2" fill="var(--cth-season-ghost)" /><path d="M13 29 Q15.5 26.5 18 29 Q20.5 31.5 23 29 Q25.5 26.5 28 29" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" /></g>);
    case 'mail':
      return (<g><ellipse cx="14.5" cy="19" rx="2.6" ry="3.4" fill={ink} /><ellipse cx="25.5" cy="19" rx="2.6" ry="3.4" fill={ink} /><rect x="13" y="28" width="14" height="9" rx="1" fill="var(--cth-season-flame)" stroke={ink} strokeWidth="1" /><path d="M13 28.5 L20 34 L27 28.5" stroke={ink} strokeWidth="1" fill="none" /></g>);
    case 'peek':
      return (<g fill={ink}><ellipse cx="16" cy="16" rx="2.4" ry="3.2" /><ellipse cx="27" cy="16" rx="2.4" ry="3.2" /><ellipse cx="22" cy="27" rx="2" ry="1.4" /></g>);
    default:
      return (<g fill={ink}><ellipse cx="14.5" cy="19" rx="2.6" ry="3.4" /><ellipse cx="25.5" cy="19" rx="2.6" ry="3.4" /><path d="M16 27 Q20 30 24 27" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" /></g>);
  }
}

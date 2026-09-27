/**
 * 0.5.3, bug 16 (Teminite, 12 Sep 2026): in the professional skin the working
 * dot and the idle dot read as the same dot. Measured, they sat 1.36 to 1
 * apart in light and 1.68 to 1 in dark, and a 9px disc carries almost no hue.
 *
 * Colour alone cannot fix that on a white ground: a grey and a green that must
 * both clear 3 to 1 against white land at nearly the same luminance whatever
 * values are picked. So the two states differ in SHAPE. Idle, the resting
 * state, is a hollow ring; every state that means something is happening stays
 * a filled disc. That also holds for a reader who cannot tell green from grey.
 */
export const HOLLOW_STATUSES: readonly string[] = ['idle'];

export function isHollowStatus(status: string): boolean {
  return HOLLOW_STATUSES.includes(status);
}

const DOT_TOKEN: Record<string, string> = { idle: 'var(--cth-dot-idle)', working: 'var(--cth-dot-working)' };

export interface StatusDotPaint {
  background: string;
  boxShadow: string;
}

/** The ring of a hollow dot is drawn inside the box so both shapes keep the
 *  same outer size and rows do not shift when an agent goes idle. */
export function statusDotPaint(status: string, size: number): StatusDotPaint {
  // Idle and working have dot colours of their own (tokens.css, bug 16); every
  // other state paints in its status token, as it always has.
  const token = DOT_TOKEN[status] ?? `var(--cth-status-${status})`;
  if (isHollowStatus(status)) {
    const ring = size >= 8 ? 2 : 1.5;
    return { background: 'transparent', boxShadow: `inset 0 0 0 ${ring}px ${token}` };
  }
  return {
    background: token,
    boxShadow: '0 0 0 1px color-mix(in srgb, var(--cth-ink-900) 30%, transparent)'
  };
}

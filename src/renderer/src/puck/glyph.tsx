/**
 * THE STAPLER'S GLYPHS, one module for the two places that draw them: the
 * ring on the puck itself (puck/PuckApp) and the Actions tab of the Stapler
 * screen in PRO (components/pro/PuckScreen), which leads every section with
 * the button the person sees on the ring (founder, 9 Sep 2026: "lead every
 * section with that button image actually present in stapler"). One path
 * table, so the screen cannot drift from the puck.
 */
import type { PuckAction } from '@shared/puck';

export const PUCK_GLYPH_PATHS: Record<string, string> = {
  screenshot: 'M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M9 12h6',
  mic: 'M9 3h6v8a3 3 0 01-6 0zM5 11a7 7 0 0014 0M12 18v3M9 21h6',
  video: 'M3 7a1 1 0 011-1h11a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1zM16 10l5-3v10l-5-3',
  eyeOff: 'M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10 10 0 0121 12a10.6 10.6 0 01-2.2 3.1M6.6 6.6A10.6 10.6 0 003 12a10 10 0 0013.4 4.4',
  eye: 'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6zM12 12m-2.5 0a2.5 2.5 0 105 0a2.5 2.5 0 10-5 0',
  computer: 'M3 5h18v11H3zM8 20h8M12 16v4',
  close: 'M6 6l12 12M18 6L6 18',
  stop: 'M7 7h10v10H7z',
  check: 'M5 12l5 5L20 7'
};

/** The glyph each action wears on the ring at rest. The ring swaps two of
 *  them live (a running meeting shows stop, an invisible stapler shows
 *  eyeOff); the screen shows the resting one. */
export const PUCK_ACTION_GLYPH: Record<PuckAction, string> = {
  screenshot: 'screenshot', message: 'mic', meeting: 'video', invisible: 'eye', computerUse: 'computer'
};

export function PuckGlyph({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={PUCK_GLYPH_PATHS[name] ?? ''} />
    </svg>
  );
}

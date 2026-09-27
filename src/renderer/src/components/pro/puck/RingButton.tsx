/**
 * The ring button as it is on the Stapler, for the Actions tab: the same
 * glyph (puck/glyph) on the same face (puck.css `.puck-btn`: the off white
 * disc, a hairline, a soft shadow), standing still. The puck window's
 * stylesheet is not loaded in the main renderer, so the face is written once
 * here, and test/pro-052-stapler-actions.test.cjs holds it to the stylesheet.
 */
import type { PuckAction } from '@shared/puck';
import { PUCK_ACTION_GLYPH, PuckGlyph } from '@/puck/glyph';
import { useAppTheme } from '@/design/theme';

/** One face per theme since 0.5.3, when the Stapler learned to go dark: a
 *  picture of its button has to go dark with it. Each value is the one puck.css
 *  resolves to for `.puck-btn` in that theme, and the test holds both. */
export const RING_BUTTON_FACE = {
  light: {
    background: '#FFF8E7',
    color: '#1A1320',
    border: '1px solid rgba(26, 19, 32, 0.14)',
    boxShadow: '0 3px 8px rgba(26, 19, 32, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.7)'
  },
  dark: {
    background: '#1D1D22',
    color: '#DEDBD6',
    border: '1px solid rgba(222, 219, 214, 0.18)',
    boxShadow: '0 3px 8px rgba(26, 19, 32, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
  }
} as const;

export function RingButton({ action, size = 30 }: { action: PuckAction; size?: number }) {
  const face = RING_BUTTON_FACE[useAppTheme()];
  return (
    <span aria-hidden style={{ ...face, width: size, height: size, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}>
      <PuckGlyph name={PUCK_ACTION_GLYPH[action]} size={Math.round(size * 0.46)} />
    </span>
  );
}

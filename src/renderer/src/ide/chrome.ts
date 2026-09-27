/**
 * The IDE's shared bar chrome.
 *
 * These three style objects were previously private to IdePanel, which was fine
 * while IdePanel rendered every pane itself. The image preview renders its own
 * bar, and a second copy of "padding 3px 8px, cream-200, ink-700 hairline" would
 * drift the moment either file was touched — the two bars sit directly on top of
 * each other in the same tab strip, so any drift is immediately visible. One
 * definition, imported by both.
 *
 * Every colour is a token, never a literal: the app ships a light AND a dark
 * theme that swap by redefining these variables, so a hardcoded hex here would
 * look correct in exactly one of them.
 */
import type { CSSProperties } from 'react';

/** The horizontal bar above an editor / preview body. 0.4.11 redesign: the
 *  30px crumb bar of the prototype, on the paper, with the kit's hairline. */
export const ideBarStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 8px 0 12px', flexShrink: 0,
  background: 'var(--cth-paper-100)', borderBottom: '1px solid var(--cth-ink-300)',
  fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-500)'
};

/** Square, borderless button that holds only an icon. */
export const ideIconBtn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, width: 26, height: 26, borderRadius: 6, background: 'transparent', border: 'none',
  cursor: 'pointer', color: 'var(--cth-ink-500)', flexShrink: 0
};

/** Small labelled button used for bar actions (save, copy path, view toggles). */
export const ideTextBtn: CSSProperties = {
  padding: '0 9px', height: 26, fontFamily: 'var(--cth-font-ui)', fontSize: 12, fontWeight: 500,
  color: 'var(--cth-ink-900)', background: 'var(--cth-cream-50)', border: '1px solid var(--cth-ink-300)',
  borderRadius: 'var(--cth-radius-md, 7px)', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
};

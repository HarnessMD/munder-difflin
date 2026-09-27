/**
 * WHERE A ROW'S TOOLTIP OPENS (0.5.3, founder 23 Sep 2026, the four sidebar
 * changes, number 1). A tooltip must open AWAY from its surface into the main
 * section, never over sibling rows or cards:
 *
 * - a row in a vertical rail (the professional sidebar, the Classic roster):
 *   to the RIGHT of the rail, rail right edge plus 8px, top aligned to the
 *   hovered row, clamped to the viewport;
 * - a card in a bottom dock (the Classic agent strip): ABOVE the dock, card
 *   top minus the tip height minus 8px, left aligned to the card, clamped.
 *
 * With no surface declared, the 0.5.2 rule holds: below the line, or above it
 * in the bottom third of the window. Pure, so the rule is testable without a
 * DOM; the component measures and calls.
 */
export type TipSurfaceKind = 'rail' | 'dock';

export interface Box { left: number; top: number; right: number; bottom: number }
export interface Viewport { w: number; h: number }
export interface TipPlace { left: number; top?: number; bottom?: number; width: number }

export const TIP_MAX_W = 300;
export const TIP_GAP = 6;
/** The founder's number: the gap between the surface and the tip it opens away from. */
export const SURFACE_GAP = 8;

export function placeTip(
  anchor: Box,
  viewport: Viewport,
  surface?: { kind: TipSurfaceKind; box: Box; tipHeight?: number }
): TipPlace {
  const width = Math.max(120, Math.min(TIP_MAX_W, viewport.w - 16));
  if (surface?.kind === 'rail') {
    // Right of the rail, never over it; if the window is too narrow for that,
    // the tip still stays inside the viewport.
    const left = Math.round(Math.max(8, Math.min(viewport.w - 8 - width, surface.box.right + SURFACE_GAP)));
    // Top aligned to the row; once the tip's height is known, pushed up so it
    // never runs off the bottom edge.
    const maxTop = surface.tipHeight ? viewport.h - 8 - surface.tipHeight : viewport.h - 8;
    const top = Math.round(Math.max(8, Math.min(anchor.top, maxTop)));
    return { left, top, width };
  }
  if (surface?.kind === 'dock') {
    // Above the dock, left aligned to the card. Anchoring the bottom edge to
    // the card's top is "card top minus tip height minus 8px" without needing
    // the height first.
    const left = Math.round(Math.max(8, Math.min(viewport.w - 8 - width, surface.box.left)));
    return { left, bottom: Math.round(viewport.h - surface.box.top + SURFACE_GAP), width };
  }
  const left = Math.round(Math.max(8, Math.min(viewport.w - 8 - width, anchor.left)));
  // Below the line unless the bottom third of the window: then above it.
  const below = anchor.bottom + TIP_GAP;
  if (below < viewport.h * 0.66) return { left, top: Math.round(below), width };
  return { left, bottom: Math.round(viewport.h - anchor.top + TIP_GAP), width };
}

/** The attribute a surface carries so a tooltip inside it knows which way to open. */
export const TIP_SURFACE_ATTR = 'data-tip-surface';

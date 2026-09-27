/**
 * THE PRO SIDEBAR'S WIDTH (0.5.3 rc.4, founder 25 Sep 2026: "The left sidebar
 * should be adjustable. You should be able to increase or decrease the width
 * by clicking on the edge and dragging it.")
 *
 * The rules, pure so a test takes them directly. The drag and the stored value
 * are components/professional/railState.ts and pro/ProSidebar.tsx.
 *   - 288 is the default and what a double click on the edge returns to
 *     (ProSidebar's PRO_SIDEBAR_WIDTH, the width a name needs beside the
 *     Orchestrator chip);
 *   - 220 to 480, whatever the pointer does or the stored value says;
 *   - a stored value that is not a number is the default;
 *   - in Arabic the sidebar sits on the right, so its inner edge is the left
 *     one and moving the pointer left makes it wider.
 */
export const RAIL_WIDTH_DEFAULT = 288;
export const RAIL_WIDTH_MIN = 220;
export const RAIL_WIDTH_MAX = 480;
/** One arrow key press on the focused edge. */
export const RAIL_WIDTH_STEP = 16;

export function clampRailWidth(value: unknown): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return RAIL_WIDTH_DEFAULT;
  return Math.round(Math.min(RAIL_WIDTH_MAX, Math.max(RAIL_WIDTH_MIN, n)));
}

/** The width while the edge is dragged from `startX` (where the press was, at
 *  `startWidth`) to `x`. */
export function dragRailWidth(startWidth: number, startX: number, x: number, rtl: boolean): number {
  return clampRailWidth(startWidth + (rtl ? startX - x : x - startX));
}

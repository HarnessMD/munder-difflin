/**
 * Where a menu opened at the pointer goes so all of it is on screen (founder,
 * 15 Oct 2026: a right click on a file low in the tree opened a menu that ran
 * off the bottom of the window).
 *
 * Below and to the right of the pointer when it fits. Where it does not, it
 * opens above, or to the left, of the pointer, as a desktop menu does; a menu
 * taller or wider than the window is pinned to the margin. The size is the
 * menu's own, measured once it is drawn. No DOM here, so the tests can prove it.
 */
export interface MenuPoint { x: number; y: number }
export interface MenuSize { w: number; h: number }

export const MENU_MARGIN = 8;

export function placeMenu(at: MenuPoint, size: MenuSize, view: MenuSize, margin: number = MENU_MARGIN): { left: number; top: number } {
  const axis = (p: number, len: number, room: number): number => {
    if (p + len <= room - margin) return p;
    // Flip to the other side of the pointer, then keep the whole of it inside.
    const flipped = p - len;
    return Math.max(margin, Math.min(flipped, room - margin - len));
  };
  return { left: axis(at.x, size.w, view.w), top: axis(at.y, size.h, view.h) };
}

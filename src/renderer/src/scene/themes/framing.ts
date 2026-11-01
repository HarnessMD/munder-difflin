// Ported from Prozzta/guppyos 02d0d50b (MIT).
// How a stations floor is framed in its pane (TES-GUPPY-FRAMING). The office fits its whole
// map; a pack whose art covers only part of its map is framed on the art instead, so the art,
// not the map's empty margin, is centred. The bottom rows of the art that hold nothing anyone
// stands on (a ship's outer hull below the deck) are a dead band: the fit ignores them, so the
// floor scales up and that band, and only that band, may run off the pane's bottom edge.
//
// Pure: the camera (office/Camera.ts) and the default pane size (App) read it.

/** A rectangle of map pixels and how many of its bottom rows may be clipped. */
export interface FloorFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Bottom rows of the frame that hold no content (no floor, no station, no walker). */
  deadBottom: number;
  /** The visual box that is fitted exactly: the back-wall top through the front-wall lip,
   * and the two outer lips.  Art beyond it (including the outer hull) remains real art. */
  fit?: { x0: number; y0: number; x1: number; y1: number };
}

/** Map pixels kept clear around the art on its top, left and right. */
export const FRAME_MARGIN = 8;

/**
 * Measured from the packs' own art (test/tes-framing.test.cjs recomputes both from the map):
 * Star Hike's star-hike-bridge.tmx is 960×640 and its drawn art covers x 320..607, y 32..415.
 * `frontLip` is the art landmark at y 367 (its lowest outline row); the independently measured
 * walkable deck happens to end there. Rows 368..415 are the hull's outer face: 48 dead rows.
 */
export const PACK_ART: Readonly<Record<string, { x0: number; y0: number; x1: number; y1: number; deadBottom: number; backWallTop: number; frontLip: number; leftLip: number; rightLip: number }>> = {
  // The fit landmarks are measured pack pixels: the art bounds are the two outer lips, the
  // back-wall top, and the front-wall lip. The hull continues below frontLip through y1, but
  // never participates in the fit.
  starhike: { x0: 320, y0: 32, x1: 607, y1: 415, deadBottom: 48, backWallTop: 32, frontLip: 367, leftLip: 320, rightLip: 607 },
};

/** A pack's art frame (its art with the margin), or null for a floor that fits its whole map. */
export function packFrame(packId: string | null | undefined): FloorFrame | null {
  const a = packId && Object.prototype.hasOwnProperty.call(PACK_ART, packId) ? PACK_ART[packId] : undefined;
  if (!a) return null;
  const x = Math.max(0, a.x0 - FRAME_MARGIN), y = Math.max(0, a.y0 - FRAME_MARGIN);
  const f: FloorFrame = { x, y, w: a.x1 + 1 + FRAME_MARGIN - x, h: a.y1 + 1 - y, deadBottom: a.deadBottom };
  f.fit = { x0: a.leftLip, y0: a.backWallTop, x1: a.rightLip, y1: a.frontLip };
  return f;
}

/** The frame a floor fits: the pack's art frame when it lies inside the map, else the whole map. */
export function floorFrame(packId: string | null | undefined, mapW: number, mapH: number): FloorFrame {
  const f = packFrame(packId);
  if (!f || f.x + f.w > mapW || f.y + f.h > mapH) return { x: 0, y: 0, w: mapW, h: mapH, deadBottom: 0 };
  return f;
}

/** The pane aspect (width / height) that the frame fills exactly: its content, the dead band left out. */
export function frameAspect(f: FloorFrame): number {
  return f.fit ? (f.fit.x1 - f.fit.x0 + 1) / (f.fit.y1 - f.fit.y0 + 1) : f.w / (f.h - f.deadBottom);
}

/** The App row around the floor: 16 px padding on each side and the 10 px splitter. */
export const FLOOR_ROW_CHROME = 16 * 2 + 10;

/** TES-FLOOR-WHOLE-188: a framed floor pane takes its row's padding on the top, left and bottom
 *  (negative margins), so its floor reaches the window's edges: 16 px more each way. */
export const FLOOR_PANE_BLEED = 16;

/**
 * The default sidebar width that gives the floor pane the frame's aspect, for a viewport
 * `viewportWidth` wide and a floor pane `paneHeight` tall (the pane with its bleed: it starts
 * at the window's left edge). Clamped as the splitter clamps
 * (320..1200, and at most viewport - 360). Used only while the user has not sized the sidebar.
 */
export function framedSidebarWidth(f: FloorFrame, viewportWidth: number, paneHeight: number): number {
  const paneW = Math.round(paneHeight * frameAspect(f));
  const max = Math.min(1200, Math.max(320, viewportWidth - 360));
  return Math.min(max, Math.max(320, viewportWidth - (FLOOR_ROW_CHROME - FLOOR_PANE_BLEED) - paneW));
}

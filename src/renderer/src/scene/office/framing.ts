// How the office floor is framed in its pane: its art inside the map, the edge drawn
// round the box (FloorEdge.tsx), and the fitted rect the canvas takes inside that edge.
//
// Pure: the floor (office/OfficeFloor.tsx) and the registry (office/themeRegistry.ts) read it.

/**
 * The Office's art inside its map. office.tmj is 34×22 tiles of 16 px (544×352); its outer
 * wall (the white edge) leaves 4 px see through on the left, right and bottom, and is 12 px thick.
 * OFFICE_ART is the wall's outside, OFFICE_FLOOR its inside: what The Office shows inside the shared
 * edge (FloorEdge.tsx). Its camera fits OFFICE_FLOOR, and its canvas is only as big as that, so the
 * art's own wall never shows inside the drawn one.
 */
export const OFFICE_ART = { x: 4, y: 0, w: 536, h: 348 } as const;
export const OFFICE_FLOOR = { x: 16, y: 12, w: 512, h: 324 } as const;

/**
 * The Office's edge, drawn round its box (FloorEdge.tsx): a 2 px dark line, a 6 px white band and
 * a 2 px dark line, in The Office's map px, the same in both app themes. One of those map px is
 * `edgeUnit` CSS px: the scale The Office's whole wall would have, fitted in the box.
 */
export const OFFICE_EDGE = { line: 2, band: 6, lineColour: '#302a28', bandColour: '#ffffff' } as const;

/** One Office map pixel in CSS px, for a floor box `w`×`h`: the scale The Office's wall has in that box. */
function edgeUnit(w: number, h: number): number {
  return w > 0 && h > 0 ? Math.min(w / OFFICE_ART.w, h / OFFICE_ART.h) : 0;
}

/** The edge drawn round a floor box `w`×`h`, in CSS px; `inset` is where the floor inside starts. */
export function floorEdge(w: number, h: number): { line: number; band: number; inset: number } {
  const u = edgeUnit(w, h);
  return { line: OFFICE_EDGE.line * u, band: OFFICE_EDGE.band * u, inset: (2 * OFFICE_EDGE.line + OFFICE_EDGE.band) * u };
}

/** The largest `aw`×`ah` shaped rect that fits a `w`×`h` area, centred, in whole CSS px. */
export function fitRect(w: number, h: number, aw: number, ah: number): { x: number; y: number; w: number; h: number } {
  if (!(w > 0 && h > 0 && aw > 0 && ah > 0)) return { x: 0, y: 0, w: 0, h: 0 };
  const k = Math.min(w / aw, h / ah);
  const fw = Math.floor(aw * k), fh = Math.floor(ah * k);
  return { x: (w - fw) / 2, y: (h - fh) / 2, w: fw, h: fh };
}

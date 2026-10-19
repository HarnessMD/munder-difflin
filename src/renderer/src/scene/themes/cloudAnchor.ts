// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Where a station floor draws a person, and where their thought cloud hangs (TES-BUBBLES-188 c).
// 1.1.87 hung every cloud from the walker's point, but a seated person is drawn at the seat pose,
// not there: at the Speck desks the clouds floated 16-30 px above the heads. The cloud now hangs
// from the sprite as drawn, so it sits the same few pixels above the head seated or standing.

/** The person as the floor moves them. */
export interface DrawnPerson {
  x: number;
  y: number;
  seated?: boolean;
  seat?: { x: number; y: number } | null;
  moving?: boolean;
}

/** The sprite's top-left as drawn: at the seat pose (pose.x is the frame's centre, pose.y its
 *  top), in the seat without one, else standing on the walker's feet with a step's bob. */
export function drawnSprite(p: DrawnPerson, pose: { x: number; y: number } | null, fw: number, fh: number, clock: number): { x: number; y: number } {
  const seated = !!(p.seated && p.seat);
  if (seated && pose) return { x: Math.round(pose.x - fw / 2), y: Math.round(pose.y) };
  if (seated && p.seat) return { x: Math.round(p.seat.x - fw / 2), y: Math.round(p.seat.y - fh) };
  const bob = p.moving && Math.floor(clock / 180) % 2 ? -1 : 0;
  return { x: Math.round(p.x - fw / 2), y: Math.round(p.y - fh) + bob };
}

/** The cloud's anchor for a drawn sprite: the middle of its frame's foot line, where a standing
 *  walker's point is, so ThoughtBubble's offset puts the cloud just above the drawn head. */
export function cloudAnchor(drawn: { x: number; y: number }, fw: number, fh: number): { x: number; y: number } {
  return { x: drawn.x + fw / 2, y: drawn.y + fh };
}

/**
 * The CSS box a sprite portrait of `size` px occupies, given the sprite
 * frame's native width and height. Pure, so the sidebar can line its agent
 * note up with the text beside the portrait and a test can check the number.
 *
 * The frame is taller than it is wide, so the box is never `size` square:
 *   - below one native frame height: `size` tall, proportionally narrower
 *     (the sprite is painted larger and downsampled smoothly into that box);
 *   - at or above it: the nearest whole multiple of the frame, never below 1,
 *     because a fractional blit with smoothing off drops sprite rows unevenly.
 *
 * SpritePortrait draws exactly this box; it is the one place the rule lives.
 */
export function snapPortraitScaleFor(boxPx: number, frameH: number): number {
  return Math.max(1, Math.round(boxPx / frameH));
}

export function portraitBoxFor(size: number, frameW: number, frameH: number): { w: number; h: number } {
  if (size < frameH) return { w: Math.round(size * (frameW / frameH)), h: size };
  const scale = snapPortraitScaleFor(size, frameH);
  return { w: Math.round(frameW * scale), h: Math.round(frameH * scale) };
}

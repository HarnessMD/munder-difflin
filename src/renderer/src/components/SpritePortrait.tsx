import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { OfficeCharacterName } from '@/scene/office/castRoster';
/* Size only. The PAINTER is loaded dynamically below, so portraitArt (hundreds
   of lines of procedural sprite drawing) is fetched only when a portrait is
   drawn. See castRoster.ts for why these two constants live there. */
import { PORTRAIT_W, PORTRAIT_H } from '@/scene/office/castRoster';
import { useSeason } from '@/design/season';
import { avatarsVersion, subscribeAvatars } from '@/scene/office/avatarRegistry';

const FRAME_W = PORTRAIT_W;
const FRAME_H = PORTRAIT_H;

/** Pixels per source pixel for a box `boxPx` tall: the NEAREST WHOLE multiple
 *  of the native frame height, never below 1. A fractional blit with smoothing
 *  off drops sprite rows unevenly, so the face comes out mangled AND small. */
function snapPortraitScale(boxPx: number): number {
  return Math.max(1, Math.round(boxPx / FRAME_H));
}

/** Backing scale for a box SMALLER than one native frame, where no whole
 *  multiple can fit the box: paint at 2x and let the browser downsample
 *  smoothly, which keeps every feature instead of dropping rows. */
const SUB_NATIVE_SCALE = 2;

export interface SpritePortraitProps {
  character: OfficeCharacterName;
  /** Pixels per source pixel. Whole numbers are exact; half-steps (1.5, 2.5)
   *  double every other row, which pixel art survives. The blit runs with
   *  smoothing off, so nothing here is ever interpolated. */
  scale?: number;
  /** Fit the sprite to a box `size` px tall. At or above the native frame
   *  height the scale snaps to a whole multiple and the canvas IS that snapped
   *  box, pixelated. Below it the sprite is painted at SUB_NATIVE_SCALE and
   *  downsampled smoothly into the box, because no whole multiple fits.
   *  Omitted, `scale` decides. */
  size?: number;
  background?: string;
}

/** An agent's identity tile: the static standing portrait, composed
 *  procedurally in portraitArt. */
export function SpritePortrait({
  character,
  scale = 2,
  size,
  background = 'transparent'
}: SpritePortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Halloween dresses the cast (costumes.ts), so a season change repaints.
  const season = useSeason();
  const subNative = size !== undefined && size < FRAME_H;
  const paintScale = size === undefined ? scale : subNative ? SUB_NATIVE_SCALE : snapPortraitScale(size);
  // A `custom:<id>` character repaints when that avatar is edited or removed.
  // Built-ins never change, so for them this is one extra dependency that
  // never fires.
  const avatarsAt = useSyncExternalStore(subscribeAvatars, avatarsVersion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    void import('@/scene/office/portraitArt')
      .then(({ paintPortrait }) => { if (!cancelled) paintPortrait(ctx, character, paintScale); })
      .catch(() => { /* chunk load race */ });
    return () => { cancelled = true; };
  }, [character, paintScale, background, avatarsAt, season]);

  // A fractional scale can land on a fractional pixel count; the canvas
  // attributes are integers either way, so round once and use the same number
  // for the backing store and the CSS box (a mismatch is what makes pixel art
  // blurry).
  const w = Math.round(FRAME_W * paintScale);
  const h = Math.round(FRAME_H * paintScale);
  // The CSS box equals the backing store, except below one native frame: the
  // whole-multiple backing store shrinks smoothly into the box the caller
  // asked for, which reads clearer at that size than dropped pixel rows.
  const cssW = subNative ? Math.round(size * (FRAME_W / FRAME_H)) : w;
  const cssH = subNative ? size : h;

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      style={{
        width: cssW,
        height: cssH,
        imageRendering: subNative ? 'auto' : 'pixelated',
        flexShrink: size !== undefined ? 0 : undefined
      }}
    />
  );
}

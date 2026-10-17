import { useEffect, useRef } from 'react';
import { paintCastPortrait, type CharacterName } from '@/scene/office/cast';
import { PORTRAIT_W, PORTRAIT_H } from '@/scene/office/portraitArt';
import { useStore } from '@/store/store';
import { getTheme } from '@/scene/office/themeRegistry';
import { loadTheme } from '@/scene/office/themeLoader';

const FRAME_W = PORTRAIT_W;
const FRAME_H = PORTRAIT_H;

export interface SpritePortraitProps {
  character: CharacterName | string;
  /** Pixels per source pixel. Whole numbers are exact; half-steps (1.5, 2.5)
   *  double every other row, which pixel art survives. The blit runs with
   *  smoothing off, so nothing here is ever interpolated. */
  scale?: number;
  background?: string;
}

/** Standing portrait of a cast member (theme custom sprite or procedurally drawn). */
export function SpritePortrait({
  character,
  scale = 2,
  background = 'transparent'
}: SpritePortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const officeTheme = useStore((s) => s.officeTheme);

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

    const draw = async () => {
      // First check if current theme has custom getFrames
      try {
        let theme = getTheme(officeTheme);
        if (!theme) {
          theme = await loadTheme(officeTheme);
        }
        if (cancelled) return;

        if (theme?.cast?.getFrames && theme.cast.byName && theme.cast.byName[character]) {
          const frames = await theme.cast.getFrames(character);
          if (cancelled) return;
          // Frame 0,0 is frontStand (Texture)
          const frontStandTex = frames?.[0]?.[0];
          const imgResource = (frontStandTex?.source?.resource ?? (frontStandTex?.source as any)?._resource) as HTMLImageElement | HTMLCanvasElement | undefined;
          if (imgResource && (imgResource instanceof HTMLImageElement || imgResource instanceof HTMLCanvasElement)) {
            // Source frame dimensions: 18x32. Top 28px corresponds to bust/portrait.
            const frameRect = frontStandTex.frame;
            const sx = frameRect.x;
            const sy = frameRect.y;
            const sw = Math.min(frameRect.width, FRAME_W);
            const sh = Math.min(frameRect.height, FRAME_H);
            ctx.drawImage(
              imgResource,
              sx, sy, sw, sh,
              0, 0, sw * scale, sh * scale
            );
            return;
          }
        }
      } catch {
        // Fall through to procedural
      }

      if (cancelled) return;
      paintCastPortrait(ctx, character, scale).catch(() => { /* asset load race */ });
    };

    void draw();

    return () => { cancelled = true; };
  }, [character, scale, background, officeTheme]);

  // A fractional scale can land on a fractional pixel count; the canvas
  // attributes are integers either way, so round once and use the same number
  // for the backing store and the CSS box (a mismatch is what makes pixel art
  // blurry).
  const w = Math.round(FRAME_W * scale);
  const h = Math.round(FRAME_H * scale);

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      style={{
        width: w,
        height: h,
        imageRendering: 'pixelated'
      }}
    />
  );
}

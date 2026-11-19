// Ported from Prozzta/guppyos 02d0d50b (MIT).
import { useEffect, useRef } from 'react';
import { paintCastPortrait, type OfficeCharacterName } from '@/scene/office/cast';
import { PORTRAIT_W, PORTRAIT_H } from '@/scene/office/portraitArt';
import { useStore } from '@/store/store';
import { portraitPlan, type LookDraft, type LookSubject } from '@/scene/themes/looks';
import { paintPackPortrait } from '@/scene/themes/lookArt';
import { useThemeLooks } from '@/scene/themes/useThemeLooks';

const FRAME_W = PORTRAIT_W;
const FRAME_H = PORTRAIT_H;

/** Who the portrait is of. Under the Office every one of these paints the
 *  Office character exactly as before; under a theme pack, the pack's art:
 *  - agent: that agent's look in the active theme (or the pack's fallback);
 *  - draft: the look builder's live, unsaved look;
 *  - sample: the pack's declared sample look (onboarding);
 *  - character alone: always the Office character (the Office cast pickers). */
export type PortraitSubjectProps =
  | { agent: LookSubject & { character: OfficeCharacterName }; draft?: never; sample?: never; character?: never }
  | { draft: LookDraft; character: OfficeCharacterName; agent?: never; sample?: never }
  | { sample: true; character: OfficeCharacterName; agent?: never; draft?: never }
  | { character: OfficeCharacterName; agent?: never; draft?: never; sample?: never };

export type SpritePortraitProps = PortraitSubjectProps & {
  /** Pixels per source pixel. Whole numbers are exact; half-steps (1.5, 2.5)
   *  double every other row, which pixel art survives. The blit runs with
   *  smoothing off, so nothing here is ever interpolated. */
  scale?: number;
  background?: string;
  /** The theme to draw in (default: the active project theme). */
  themeId?: string;
};

/** Static standing portrait of an agent: the one portrait route for every card. */
export function SpritePortrait(props: SpritePortraitProps) {
  const { scale = 2, background = 'transparent' } = props;
  const activeTheme = useStore((s) => s.officeTheme);
  const themeId = props.themeId ?? activeTheme;
  const looks = useThemeLooks(themeId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const character = (props.agent ? props.agent.character : props.character) as OfficeCharacterName;
  const subject = props.agent ? { agent: props.agent } : props.draft ? { draft: props.draft, character } : props.sample ? { sample: true as const, character } : { character };
  const plan = portraitPlan(themeId, looks ?? null, subject, { w: FRAME_W, h: FRAME_H });
  // Only what changes the picture: a new look object with the same content does not repaint.
  const planKey = plan.kind === 'office' ? `office|${plan.character}`
    : [plan.themeId, plan.body.id, plan.row, plan.crop.join(','), plan.colors.skin, plan.colors.shirt, plan.colors.hair].join('|');
  const waiting = looks === undefined && plan.kind === 'office' && (!!props.agent || !!props.draft || !!props.sample);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (waiting) return; // the pack is still loading: never flash the Office character
    if (plan.kind === 'pack' && looks) { paintPackPortrait(ctx, looks, plan); return; }
    // The Office paint is async: it goes to its own canvas and lands only while
    // this effect is current, so a late one never covers a newer (pack) paint.
    let live = true;
    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const octx = off.getContext('2d');
    if (!octx) return;
    octx.imageSmoothingEnabled = false;
    paintCastPortrait(octx, character, scale).then(() => {
      if (!live) return;
      ctx.clearRect(0, 0, FRAME_W * scale, FRAME_H * scale); // as the Office paint clears its own box
      ctx.drawImage(off, 0, 0);
    }).catch(() => { /* asset load race */ });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey, scale, background, waiting, looks]);

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
      data-portrait={plan.kind}
      style={{
        width: w,
        height: h,
        imageRendering: 'pixelated'
      }}
    />
  );
}

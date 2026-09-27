import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { OfficeCharacterName } from '@/scene/office/castRoster';
/* Size only. The PAINTER is loaded dynamically below, so portraitArt — 591 lines
   of procedural sprite drawing — never enters the graph in the Professional skin.
   See castRoster.ts for why these two constants live there. */
import { PORTRAIT_W, PORTRAIT_H } from '@/scene/office/castRoster';
import { portraitBoxFor } from '@shared/portraitBox';
import { useAppSkin } from '@/design/skin';
import { avatarsVersion, subscribeAvatars } from '@/scene/office/avatarRegistry';
import type { RoleGlyphName } from './RoleGlyph';
import type { StatusKind } from './PixelBadge';

const FRAME_W = PORTRAIT_W;
const FRAME_H = PORTRAIT_H;

/** Pixels per source pixel for a box `boxPx` tall: the NEAREST WHOLE multiple
 *  of the native frame height, never below 1. Fractional scales are what made
 *  the PRO portraits look muffled (pilot item 15): a 0.7 blit with smoothing
 *  off drops sprite rows unevenly, so the face came out mangled AND small. */
export function snapPortraitScale(boxPx: number): number {
  return Math.max(1, Math.round(boxPx / FRAME_H));
}

/** Backing scale for a box SMALLER than one native frame, where no whole
 *  multiple can fit the box: paint at 2x and let the browser downsample
 *  smoothly, which keeps every feature instead of dropping rows. */
export const SUB_NATIVE_SCALE = 2;

/** The CSS box a portrait of `size` occupies, in px. The sprite frame is
 *  taller than it is wide, so the box is NOT `size` square (the rule is
 *  written out in shared/portraitBox.ts). Exported so a layout that has to
 *  line something up with the text beside a portrait (the sidebar's agent
 *  note) can take the real width rather than guess it. The component below
 *  computes the same box from its own lines; test/pro-agent-row-card runs
 *  those lines against the shared rule for every size, so they cannot drift. */
export function portraitBox(size: number): { w: number; h: number } {
  return portraitBoxFor(size, FRAME_W, FRAME_H);
}

export interface SpritePortraitProps {
  character: OfficeCharacterName;
  /** Pixels per source pixel. Whole numbers are exact; half-steps (1.5, 2.5)
   *  double every other row, which pixel art survives. The blit runs with
   *  smoothing off, so nothing here is ever interpolated. */
  scale?: number;
  /** Opt-in (the PRO render sites): fit the sprite to a box `size` px tall.
   *  At or above the native frame height the scale snaps to a whole multiple
   *  (snapPortraitScale) and the canvas IS that snapped box, pixelated. Below
   *  it the sprite is painted at SUB_NATIVE_SCALE and downsampled smoothly
   *  into the box, because no whole multiple fits. Omitted, `scale` behaves
   *  exactly as it always has, so every existing caller draws the same
   *  pixels. */
  size?: number;
  background?: string;
  /** Professional draws identity as a role glyph instead of a sprite (section 9).
   *  Pass the agent's hire one-liner so the glyph can be inferred; omit it and
   *  the agent reads as unassigned. Ignored entirely in Office. */
  description?: string;
  isGod?: boolean;
  /** Skip inference and name the glyph outright. */
  role?: RoleGlyphName;
  /** Professional only: the corner status dot (section 9). Office shows status
   *  elsewhere on the card, so this is ignored there. */
  status?: StatusKind;
  /** Professional only: the dot's halo must match the surface the tile SITS ON,
   *  not always the page ground. Pam's note. */
  haloColor?: string;
  /** Keep the SPRITE even in Professional. Only for the Office character
   *  pickers, whose entire job is choosing sprite art — swapping those to role
   *  glyphs would render fifteen identical tiles and make the picker useless.
   *  This is the one path that can pull portraitArt in Professional, and it is
   *  user-initiated and lazy. Whether Professional should offer an Office
   *  character picker at all is a section 9 product question, not mechanism. */
  forceSprite?: boolean;
}

/**
 * An agent's identity tile.
 *
 * Office: the static standing portrait, composed procedurally in portraitArt.
 * Professional: a role glyph — section 9 is explicit that this skin has no
 * sprites, and it is also what keeps the sprite art out of the Professional
 * bundle. Both skins render the same box so no layout moves when you switch.
 */
export function SpritePortrait({
  character,
  scale = 2,
  size,
  background = 'transparent',
  description,
  isGod,
  role,
  status,
  haloColor,
  forceSprite = false
}: SpritePortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const skin = useAppSkin();
  // `size` given: an integer sprite scale, never the fractional blit that
  // blurred PRO's portraits. `size` omitted: exactly the `scale` contract
  // every existing caller (Classic included) has always had.
  const subNative = size !== undefined && size < FRAME_H;
  const paintScale = size === undefined ? scale : subNative ? SUB_NATIVE_SCALE : snapPortraitScale(size);
  // A `custom:<id>` character repaints when that avatar is edited or removed.
  // Built-ins never change, so for them this is one extra dependency that
  // never fires.
  const avatarsAt = useSyncExternalStore(subscribeAvatars, avatarsVersion);

  useEffect(() => {
    // Founder, 2 Sep 2026: PRO keeps the people. Every skin paints the sprite;
    // `forceSprite` is kept for callers and no longer changes anything here.
    void forceSprite;
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
    // Dynamic so the painter is fetched only in Office. The cancelled guard
    // matters here in a way it did not when this was synchronous: the skin can
    // flip while the chunk is in flight.
    void import('@/scene/office/portraitArt')
      .then(({ paintPortrait }) => { if (!cancelled) paintPortrait(ctx, character, paintScale); })
      .catch(() => { /* chunk load race */ });
    return () => { cancelled = true; };
  }, [character, paintScale, background, skin, forceSprite, avatarsAt]);

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

  // The role glyph was PRO's portrait until 2 Sep 2026 (section 9: "this skin
  // has no sprites"). The founder overruled it: avatars persist in PRO, never
  // initials, never glyphs. `role`, `status` and `haloColor` are still accepted
  // so callers do not change; the canvas below is the portrait in every skin.
  void role; void status; void haloColor; void description; void isGod;

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

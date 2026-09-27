/**
 * The puck's face, which is the whole puck: a blobatar (blobatar.dev, MIT,
 * the founder's call on 7 Sep 2026) with nothing behind it. A small creature
 * drawn from the word in `look.seed`, the same word always the same creature.
 * Drawn by the floating window, by the pickers on the Puck screen and by its
 * preview, so every one shows exactly what the window will show.
 *
 * There is no disc since the founder's second look the same day: the creature
 * floats on its own over other apps, so it carries a soft shadow to read on a
 * white document and a dark IDE alike. Its body is `look.color`, any hex,
 * painted exactly (a palette override, so blobatar's own ramp never shifts
 * it). Blobatar keeps its eyes readable against its own ramp only, so the tone
 * is chosen here from the body's luminance (shared/puck bodyLook): dark eyes on
 * a light body, light eyes on a dark one.
 *
 * THE COLOUR WINS OVER THE POSE. Four of blobatar's poses tint the body (mad
 * red, love pink, shy a blush, sick green), most of the way, so a creature in
 * the sick pose was green whatever colour was picked, and the founder read
 * that as "the colour does not apply" (7 Sep 2026). Here every pose is worn
 * without its tint: the person chose the colour, the pose is the face.
 *
 * `blobatar/react` is the adapter that ships inside the core package. The
 * same component is `@blobatar/react`, and the subpath goes away in v3, so a
 * move to v3 means one import line here.
 */
import { Blobatar } from 'blobatar/react';
import * as pose from 'blobatar/expression';
import 'blobatar/motion.css';
import { bodyLook, normalizeHex, PUCK_DEFAULT_COLOR, PUCK_SHAPE_TRAIT, type PuckExpression, type PuckShape } from '@shared/puck';

/** What a face is made of: the fields of PuckConfig that draw it. */
export interface PuckLook { seed: string; shape: PuckShape; expression: PuckExpression; color: string }

/** A pose with its tint taken off, so the body keeps the colour it was given. */
const untinted = (e: pose.Expression): pose.Expression => ({ ...e, tint: undefined });

/** Blobatar's fourteen poses by our names. Passed as values, not strings,
 *  which is how blobatar keeps the poses out of a bundle that has none. */
const POSE: Record<PuckExpression, pose.Expression> = {
  idle: untinted(pose.idle), happy: untinted(pose.happy), sad: untinted(pose.sad), mad: untinted(pose.mad),
  surprised: untinted(pose.surprised), wink: untinted(pose.wink), sleepy: untinted(pose.sleepy), smug: untinted(pose.smug),
  unsure: untinted(pose.unsure), scared: untinted(pose.scared), love: untinted(pose.love), shy: untinted(pose.shy),
  sick: untinted(pose.sick), thinking: untinted(pose.thinking)
};

export function PuckFace({ look, size, style, shadow = true, animate = 'hover' }: {
  look: PuckLook; size: number; style?: React.CSSProperties;
  /** The soft shadow that separates the creature from whatever is behind it.
   *  Off inside a picker chip, which has its own edge. */
  shadow?: boolean;
  /** `always`: breathe, blink and glance on their own, for the window and the
   *  preview. `hover`: still until the pointer is over it, for a row of pickers. */
  animate?: 'always' | 'hover';
}) {
  // A colour this build cannot read (a page mid hot reload, a hand edited
  // config) wears the default rather than nothing.
  const body = normalizeHex(look.color) ?? PUCK_DEFAULT_COLOR;
  const { hue, tone } = bodyLook(body);
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, flexShrink: 0, lineHeight: 0,
        filter: shadow ? 'drop-shadow(0 2px 5px rgba(26, 19, 32, 0.18))' : undefined,
        ...style
      }}
    >
      <Blobatar
        name={look.seed}
        size={size}
        background={false}
        hue={hue}
        tone={tone}
        palette={{ head: body }}
        expression={POSE[look.expression]}
        traits={look.shape === 'auto' ? undefined : { shape: PUCK_SHAPE_TRAIT[look.shape] }}
        animate={animate}
        style={{ display: 'block' }}
      />
    </div>
  );
}

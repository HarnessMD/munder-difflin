import { CSSProperties, ReactNode, useState } from 'react';
import { useAppSkin } from '@/design/skin';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

export interface PixelButtonProps {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: CSSProperties;
  title?: string;
}

const heightBySize: Record<Size, number> = { sm: 24, md: 32, lg: 40 };
const padBySize: Record<Size, string> = { sm: '0 8px', md: '0 12px', lg: '0 16px' };

export function PixelButton({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  fullWidth = false,
  style,
  title
}: PixelButtonProps) {
  const skin = useAppSkin();
  const [pressed, setPressed] = useState(false);
  const [hover, setHover] = useState(false);

  // DISABLED TEXT IS ITS OWN COLOR, not the variant's.
  //
  // Every variant swaps its FILL to `--cth-cream-300` when disabled, but the
  // variants used to keep their enabled text token — and `primary`'s is
  // `--cth-cream-50`, the INVERSE foreground picked to sit on an ink-900 button.
  // On the cream-300 disabled fill that pairing collapses: in dark mode it is
  // #1A191E text on #37363E (~1.4:1, effectively invisible), and in light mode a
  // near-white #FFFDF5 on tan, which is barely better. That is why a disabled
  // Send or Dispatch reads as an empty box.
  //
  // `--cth-ink-500` is the one foreground that works against cream-300 in BOTH
  // themes, because both tokens flip together — and a muted label is what a
  // disabled control should look like anyway.
  const disabledText = 'var(--cth-ink-500)';

  /**
   * PROFESSIONAL: FILLS CARRY INTERACTIVITY, BORDERS CARRY STRUCTURE.
   *
   * Office's primary is an ink-900 fill with cream-50 text. In Professional dark
   * `--cth-ink-900` is #FFFFFF, so that same rule painted a WHITE primary button
   * on every screen — the one thing section 6.2 and Pam's kit explicitly rule out
   * ("a primary button is never white"; a loud primary is the landing-page device
   * this skin exists to avoid). Creed caught it in a rendered screenshot rather
   * than in source, because in source it is a token that looks right.
   *
   * This CANNOT be a `var(--cth-control-base, var(--cth-ink-900))` fallback like
   * the radius work, because the two skins invert the TEXT as well as the fill:
   * Office puts light text on a dark fill, Professional puts primary text on a
   * subtle one. A CSS fallback can pick a missing value; it cannot pick a
   * different pairing. So the branch is explicit.
   *
   * The ladder is Pam's, and the four names describe PROMINENCE, not interaction
   * state — the same value is one control's rest and another's hover:
   *   Primary    rest control-base   hover control-raised  press control-strong
   *   Secondary  rest control-quiet  hover control-base    press control-raised
   *   Ghost      rest no chrome      hover control-quiet   press control-base
   */
  const step = (rest: string, hovered: string, press: string) =>
    disabled ? 'var(--cth-control-quiet)' : (pressed ? press : hover ? hovered : rest);

  const professional = (() => {
    const quiet = 'var(--cth-control-quiet)';
    const base = 'var(--cth-control-base)';
    const raised = 'var(--cth-control-raised)';
    const strong = 'var(--cth-control-strong)';
    switch (variant) {
      case 'primary':
        return {
          fill: step(base, raised, strong),
          text: disabled ? disabledText : 'var(--cth-ink-900)',
          border: 'var(--cth-ink-300)',   // a hairline, one rung above secondary
          shadow: 'transparent'           // section 6.3: no drop shadow on controls
        };
      case 'secondary':
        return {
          fill: step(quiet, base, raised),
          text: disabled ? disabledText : 'var(--cth-ink-900)',
          border: 'var(--cth-ink-300)',
          shadow: 'transparent'
        };
      case 'ghost':
        // The toolbar action keeps NO chrome at rest on purpose — it has no
        // border either, so it never had the invisible-edge problem this fixes.
        return {
          fill: disabled ? 'transparent' : (pressed ? base : hover ? quiet : 'transparent'),
          text: disabled ? disabledText : 'var(--cth-ink-700)',
          border: 'transparent',
          shadow: 'transparent'
        };
      case 'destructive':
        // Status colour, which section 3 permits: blocked/destructive is one of
        // the three things colour is allowed to carry.
        return {
          fill: disabled ? quiet : (hover ? 'var(--cth-status-blocked-tint)' : 'var(--cth-status-blocked)'),
          text: disabled ? disabledText : 'var(--cth-cream-50)',
          border: 'var(--cth-ink-300)',
          shadow: 'transparent'
        };
    }
  });

  const office = (() => {
    switch (variant) {
      case 'primary':
        return {
          fill:    disabled ? 'var(--cth-cream-300)' : (hover ? 'var(--cth-ink-700)' : 'var(--cth-ink-900)'),
          text:    disabled ? disabledText : 'var(--cth-cream-50)',
          border:  'var(--cth-ink-900)',
          shadow:  'var(--cth-ink-900)'
        };
      case 'secondary':
        return {
          fill:    disabled ? 'var(--cth-cream-300)' : (hover ? 'var(--cth-cream-200)' : 'var(--cth-cream-100)'),
          text:    disabled ? disabledText : 'var(--cth-ink-900)',
          border:  'var(--cth-ink-300)',
          shadow:  'var(--cth-ink-100)'
        };
      case 'ghost':
        return {
          fill:    hover ? 'var(--cth-cream-200)' : 'transparent',
          text:    disabled ? disabledText : 'var(--cth-ink-700)',
          border:  'var(--cth-ink-300)',
          shadow:  'var(--cth-ink-100)'
        };
      case 'destructive':
        return {
          fill:    disabled ? 'var(--cth-cream-300)' : (hover ? 'var(--cth-coral-light)' : 'var(--cth-coral)'),
          text:    disabled ? disabledText : 'var(--cth-ink-900)',
          border:  'var(--cth-ink-500)',
          shadow:  'var(--cth-ink-300)'
        };
    }
  });

  const palette = (skin === 'professional' ? professional() : office())!;

  return (
    <button
      title={title}
      onClick={disabled ? undefined : onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => { setPressed(false); setHover(false); }}
      onMouseEnter={() => setHover(true)}
      disabled={disabled}
      style={{
        // Centre content HERE rather than trusting each call site.
        //
        // A <button> with a fixed height centres bare text on its own, but a
        // child that is itself `inline-flex` (which every icon+label call site
        // uses, to sit the glyph beside the word) aligns on ITS baseline
        // instead. So a row of buttons where some labels were wrapped and some
        // were bare text — `edit` beside `IDE` and `terminal` — sat at visibly
        // different heights. Fixing it per call site fixes today's row and not
        // the next one someone writes.
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Matches the gap the wrapped call sites already use, so an icon can be
        // dropped in beside a label with no wrapper at all.
        gap: 4,
        // Kill descender-driven drift: with the height fixed above, an inherited
        // line-height only moves the text off centre.
        lineHeight: 1,
        // A button never shrinks below its own label. The default flex-shrink is
        // 1, and with `whiteSpace: nowrap` below, a squeezed button keeps drawing
        // its full-width text out of a narrowed box — so in a tight row the
        // labels paint straight over whatever sits to their left. That is not a
        // clipped button, it is two controls on top of each other.
        flexShrink: 0,
        height: heightBySize[size],
        padding: padBySize[size],
        background: palette.fill,
        color: palette.text,
        border: 'none',
        // v0.3.4: 1px hairline + 1px lift — the 2px chrome read as heavy boxes
        boxShadow: pressed && !disabled
          ? `inset 0 0 0 1px ${palette.border}`
          : `inset 0 0 0 1px ${palette.border}, 0 1px 0 ${palette.shadow}`,
        transform: pressed && !disabled ? 'translateY(1px)' : 'none',
        fontFamily: 'var(--cth-font-ui)',
        fontSize: size === 'lg' ? 'var(--cth-text-body-md)' : 'var(--cth-text-body-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : 'auto',
        userSelect: 'none',
        // Height is fixed by the size variant above, so a label that wraps does
        // not make the button taller — the extra line simply prints through the
        // bottom border. Every label here is a short phrase ("Check for updates",
        // "reset & start over"), so wrapping is always a layout bug rather than a
        // wanted behaviour. Callers that genuinely want a multi-line button can
        // still override, since `style` spreads after this.
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {children}
    </button>
  );
}

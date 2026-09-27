/**
 * Theme values for the surfaces that CANNOT read CSS.
 *
 * xterm, Monaco and CodeMirror all take literal colours: they paint to a canvas
 * or build their own stylesheet, so `var(--cth-*)` is not available to them.
 * Every one of them therefore RE-STATED the palette as hex literals, and
 * PtyTerminalView's own comment records what that costs — its dark set was left
 * on the pre-readability ramp after tokens.css moved, so every terminal sat a
 * visible step apart from the panel holding it until someone noticed.
 *
 * This module removes that whole class of bug: instead of re-stating the values,
 * it READS THE RESOLVED TOKENS back off <html> with getComputedStyle. The skin
 * and theme attributes are stamped there by design/skin.ts and design/theme.ts,
 * so one read gives the correct answer for whichever of the four combinations is
 * live, and the values can never drift from tokens.css again.
 *
 * WHAT IS STILL LITERAL, AND WHY. The sixteen ANSI slots are not ours: they are
 * what a PROGRAM asks for when it prints in colour, so they are tuned for
 * legibility against the ground rather than chosen from our palette. They stay
 * as a table — but the table is now keyed by skin as well as theme, which is the
 * axis that was missing.
 */
import type { AppTheme } from './theme';
import type { AppSkin } from './skin';

/** Read resolved `--cth-*` values off <html>. Falls back when the DOM is absent
 *  (tests, SSR) or a token is undefined, so a caller always gets a usable colour. */
export function readTokens<K extends string>(map: Record<K, string>, fallback: Record<K, string>): Record<K, string> {
  let cs: CSSStyleDeclaration | null = null;
  try { cs = getComputedStyle(document.documentElement); } catch { /* no DOM */ }
  const out = {} as Record<K, string>;
  for (const key of Object.keys(map) as K[]) {
    const v = cs?.getPropertyValue(map[key]).trim();
    out[key] = v || fallback[key];
  }
  return out;
}

/** The surface half of a terminal/editor theme — always token-derived. */
const SURFACE_TOKENS = {
  background:          '--cth-paper-100',
  foreground:          '--cth-ink-900',
  selectionBackground: '--cth-cream-200',
  border:              '--cth-ink-300',
  dim:                 '--cth-ink-500',
  gutter:              '--cth-cream-100',
  lineHighlight:       '--cth-cream-200',
  cursor:              '--cth-coral'
} as const;

const SURFACE_FALLBACK = {
  background: '#FCFAF0', foreground: '#1A1320', selectionBackground: '#FFEC99',
  border: '#A899B5', dim: '#6B5878', gutter: '#FFF8E7', lineHighlight: '#FFF8E7',
  cursor: '#D96A62'
};

export type Surface = Record<keyof typeof SURFACE_TOKENS, string>;

export function readSurface(): Surface {
  return readTokens(SURFACE_TOKENS, SURFACE_FALLBACK);
}

/** The sixteen ANSI slots. */
export interface AnsiSet {
  black: string; red: string; green: string; yellow: string;
  blue: string; magenta: string; cyan: string; white: string;
  brightBlack: string; brightRed: string; brightGreen: string; brightYellow: string;
  brightBlue: string; brightMagenta: string; brightCyan: string; brightWhite: string;
}

/* Office light — the ANSI "white"/"yellow"/bright slots are remapped to readable
   dark inks: programs that print white or pale-yellow text (expecting a dark
   terminal) were otherwise invisible on cream. minimumContrastRatio (terminalPool)
   adjusts per-cell foreground on top of this. */
const OFFICE_LIGHT: AnsiSet = {
  black: '#1A1320', red: '#D1453B', green: '#20904B', yellow: '#9C6B00',
  blue: '#2B6CB0', magenta: '#8A5CF0', cyan: '#1F9C94', white: '#3A2F44',
  brightBlack: '#6B5878', brightRed: '#E0584E', brightGreen: '#2E9E54',
  brightYellow: '#B8860B', brightBlue: '#3B7DC4', brightMagenta: '#9B72F2',
  brightCyan: '#2BA89F', brightWhite: '#1A1320'
};

/* Office dark — muted professional: recognisable hues, no fluorescing on the
   dark ground; brights are one legible step up, not pastels. */
const OFFICE_DARK: AnsiSet = {
  black: '#222229', red: '#E08C82', green: '#74C096', yellow: '#CFAA57',
  blue: '#6FB3C4', magenta: '#A896E3', cyan: '#6FB3C4', white: '#DEDBD6',
  brightBlack: '#96919F', brightRed: '#EBA39C', brightGreen: '#96CDA9',
  brightYellow: '#E5C87E', brightBlue: '#8FC5D1', brightMagenta: '#C0B3EB',
  brightCyan: '#8FC5D1', brightWhite: '#EFEDE9'
};

/**
 * Professional REUSES the Office ANSI sets, and that is a decision rather than a
 * gap. These sixteen slots describe what a PROGRAM asked for, not what our design
 * wants: they are tuned for legibility against a light or a dark ground, and
 * Professional's grounds are a lighter light and a darker dark of the same two.
 * Inventing a second set of sixteen hues would be design work with no brief —
 * DESIGN-PROFESSIONAL.md section 3 governs OUR colour, and is explicit that
 * colour carries status, liveness and project identity; program output is none
 * of those. The skin axis exists here now, so if the design lane ever does want
 * a distinct Professional set, it drops in without touching a call site.
 */
const ANSI: Record<AppSkin, Record<AppTheme, AnsiSet>> = {
  office:       { light: OFFICE_LIGHT, dark: OFFICE_DARK },
  professional: { light: OFFICE_LIGHT, dark: OFFICE_DARK }
};

export function ansiFor(skin: AppSkin, theme: AppTheme): AnsiSet {
  return ANSI[skin][theme];
}

/**
 * The ANSI table for one engine's terminal. Grok's themes paint their whole
 * background with a palette slot, not a colour of their own: its light theme
 * (grokday) fills with slot 15, bright white, and writes its text in slots 0,
 * 7 and 8 (Grok 1.0.41, measured 24 Sep 2026). The light table above maps
 * slot 15 to a dark ink so white text stays readable on cream, which turned
 * Grok's light background near black: the founder's "Grok is still black in
 * light mode" after GROK_THEME=grokday was already set. For a Grok pane in the
 * light theme, slot 15 is the terminal's own background instead, so grokday
 * fills with the same colour as the pane and its dark text reads as it should.
 * Every other engine keeps the table unchanged.
 */
export function ansiForProvider(skin: AppSkin, theme: AppTheme, provider: string | undefined, background: string): AnsiSet {
  const base = ansiFor(skin, theme);
  if (provider === 'grok' && theme === 'light') return { ...base, brightWhite: background };
  return base;
}

/** A complete xterm theme: token-derived surface + the ANSI table. */
export function xtermTheme(skin: AppSkin, theme: AppTheme, provider?: string) {
  const s = readSurface();
  return {
    background: s.background,
    foreground: s.foreground,
    cursor: s.cursor,
    cursorAccent: s.background,
    selectionBackground: s.selectionBackground,
    selectionForeground: s.foreground,
    ...ansiForProvider(skin, theme, provider, s.background)
  };
}

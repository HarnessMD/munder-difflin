/**
 * Resolves an xterm `ITheme` from the `--cth-*` custom properties instead of
 * a hardcoded light/dark JS object. xterm paints via canvas/WebGL and cannot
 * read CSS custom properties itself, so the values are read once per call
 * with `getComputedStyle` — call this again whenever the app theme (or an
 * active theme pack) changes, rather than caching the result.
 */

export function cssVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export interface XtermThemeOptions {
  /** Defaults to `--cth-coral`, matching PtyTerminalView's prior literal
   *  (same value in both themes). TerminalView passes its own frozen,
   *  pre-v0.3.4 cursor colour instead. */
  cursor?: string;
}

export function buildXtermTheme(opts: XtermThemeOptions = {}) {
  const cursor = opts.cursor ?? cssVar('--cth-coral');
  return {
    background: cssVar('--cth-paper-100'),
    foreground: cssVar('--cth-ink-900'),
    cursor,
    cursorAccent: cssVar('--cth-paper-100'),
    selectionBackground: cssVar('--cth-term-selection-bg'),
    selectionForeground: cssVar('--cth-ink-900'),
    black: cssVar('--cth-term-black'),
    red: cssVar('--cth-term-red'),
    green: cssVar('--cth-term-green'),
    yellow: cssVar('--cth-term-yellow'),
    blue: cssVar('--cth-term-blue'),
    magenta: cssVar('--cth-term-magenta'),
    cyan: cssVar('--cth-term-cyan'),
    white: cssVar('--cth-term-white'),
    brightBlack: cssVar('--cth-ink-500'),
    brightRed: cssVar('--cth-term-bright-red'),
    brightGreen: cssVar('--cth-term-bright-green'),
    brightYellow: cssVar('--cth-term-bright-yellow'),
    brightBlue: cssVar('--cth-term-bright-blue'),
    brightMagenta: cssVar('--cth-term-bright-magenta'),
    brightCyan: cssVar('--cth-term-bright-cyan'),
    brightWhite: cssVar('--cth-term-bright-white')
  };
}

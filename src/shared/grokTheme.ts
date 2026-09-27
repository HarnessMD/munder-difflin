/**
 * WHAT THEME GROK SHOULD START IN (0.5.3, bug 18; founder, 14 Sep 2026: "Grok
 * stays dark when the app is in light mode").
 *
 * Measured on 20 Sep 2026 against Grok Build 1.0.34 in a real terminal, and its
 * own theming guide says the same:
 *   - GrokNight, a dark theme, is Grok's DEFAULT.
 *   - With `theme = "auto"` it follows the OPERATING SYSTEM's appearance on a
 *     desktop, never the terminal it runs in.
 *   - COLORFGBG, the only hint this app sent it, is read only over SSH, tmux or
 *     headless. With `COLORFGBG=0;15` it still painted a black background.
 *   - `GROK_THEME=grokday` painted a white one. That is the lever.
 *
 * So the app says which theme through GROK_THEME, in the agent's environment
 * only. It never writes the person's `~/.grok/config.toml`. And it stays out of
 * the way of a choice the person already made: a theme named in that file, or a
 * GROK_THEME already in their environment, wins. Pure, so a test takes it
 * directly; the caller reads the file and hands the text in.
 */

/** The theme names Grok documents for its two neutral themes. */
export const GROK_LIGHT_THEME = 'grokday';
export const GROK_DARK_THEME = 'groknight';

/** `[ui].theme` from a Grok config.toml, lower cased, or null when it is not
 *  set. Only as much TOML as this one key needs: a table header and a quoted
 *  string value, comments ignored. */
export function grokConfiguredTheme(configToml: string | null | undefined): string | null {
  let inUi = false;
  for (const raw of (configToml ?? '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const table = /^\[\s*([^\]]+?)\s*\]$/.exec(line);
    if (table) { inUi = table[1] === 'ui'; continue; }
    if (!inUi) continue;
    const kv = /^theme\s*=\s*(?:"([^"]*)"|'([^']*)')$/.exec(line);
    if (kv) return (kv[1] ?? kv[2] ?? '').trim().toLowerCase() || null;
  }
  return null;
}

/**
 * The GROK_THEME to put in a Grok agent's environment, or undefined to leave
 * its environment alone.
 */
export function grokThemeEnv(
  appTheme: 'light' | 'dark' | undefined,
  configToml: string | null | undefined,
  existingEnvTheme: string | undefined
): string | undefined {
  if (!appTheme) return undefined;
  if (existingEnvTheme && existingEnvTheme.trim()) return undefined; // the person set it themselves
  const chosen = grokConfiguredTheme(configToml);
  // `auto` and `system` mean "follow the operating system", which is the very
  // behaviour that leaves Grok dark inside a light app. Those, and no choice at
  // all, are ours to answer. A named theme is the person's.
  if (chosen && chosen !== 'auto' && chosen !== 'system') return undefined;
  return appTheme === 'dark' ? GROK_DARK_THEME : GROK_LIGHT_THEME;
}

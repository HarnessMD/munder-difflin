'use strict';

/**
 * 0.5.3, bug 18 (founder, 14 Sep 2026): Grok stays dark when the app is light.
 * Measured against Grok Build 1.0.34 in a real terminal on 20 Sep 2026: with
 * COLORFGBG=0;15, the only hint the app sent, it painted background index 0
 * (black); with GROK_THEME=grokday it painted index 15 (white). Its theming
 * guide says COLORFGBG is read only over SSH, tmux or headless. So the hint
 * never fired for Grok on anybody's desktop.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { grokThemeEnv, grokConfiguredTheme, GROK_LIGHT_THEME, GROK_DARK_THEME } = loadTs('src/shared/grokTheme.ts');
const ROOT = path.join(__dirname, '..');

// The founder's own config on the day, which names no theme at all.
const NO_THEME = '[cli]\nx = 1\n\n[ui]\nmax_thoughts_width = 120\ncompact_mode = false\nauto_light_theme = "grokday"\n';

test('a Grok that was given no theme is told the app theme', () => {
  assert.equal(grokThemeEnv('light', NO_THEME, undefined), 'grokday');
  assert.equal(grokThemeEnv('dark', NO_THEME, undefined), 'groknight');
  assert.equal(grokThemeEnv('light', null, undefined), 'grokday', 'no config file at all is the common case');
  assert.equal(GROK_LIGHT_THEME, 'grokday');
  assert.equal(GROK_DARK_THEME, 'groknight');
});

test('auto and system mean "follow the operating system", which is the bug, so they are answered too', () => {
  assert.equal(grokThemeEnv('light', '[ui]\ntheme = "auto"\n', undefined), 'grokday');
  assert.equal(grokThemeEnv('light', '[ui]\ntheme = "System"\n', undefined), 'grokday');
});

test('a theme the person chose is left alone, in the file or in their environment', () => {
  assert.equal(grokThemeEnv('light', '[ui]\ntheme = "tokyonight"\n', undefined), undefined);
  assert.equal(grokThemeEnv('light', "[ui]\ntheme = 'terminal' # my own colours\n", undefined), undefined);
  assert.equal(grokThemeEnv('light', NO_THEME, 'rosepine'), undefined, 'GROK_THEME already set by them');
  assert.equal(grokThemeEnv(undefined, NO_THEME, undefined), undefined, 'no app theme known, nothing to say');
});

test('only [ui].theme counts: not a theme key in another table, not auto_light_theme, not a comment', () => {
  assert.equal(grokConfiguredTheme(NO_THEME), null, 'auto_light_theme is not theme');
  assert.equal(grokConfiguredTheme('[other]\ntheme = "tokyonight"\n[ui]\ncompact_mode = true\n'), null);
  assert.equal(grokConfiguredTheme('[ui]\n# theme = "tokyonight"\n'), null);
  assert.equal(grokConfiguredTheme('[ ui ]\r\ntheme   =   "GrokDay"\r\n'), 'grokday');
  assert.equal(grokConfiguredTheme('[ui]\ntheme = ""\n'), null);
  assert.equal(grokConfiguredTheme(''), null);
});

test('hive sets GROK_THEME for the grok provider only, in the agent env, and never writes the Grok config', () => {
  const hive = fs.readFileSync(path.join(ROOT, 'src/main/hive.ts'), 'utf8');
  assert.match(hive, /if \(\(meta\.provider \?\? 'claude'\) === 'grok'\) \{\s+const grokTheme = grokThemeEnv\(opts\.theme, readGrokConfigToml\(\), process\.env\.GROK_THEME \?\? process\.env\.LC_GROK_THEME\);\s+if \(grokTheme\) env\.GROK_THEME = grokTheme;(?:\s*\/\/.*)*\s+delete env\.COLORFGBG;\s+\}/);
  const reader = hive.slice(hive.indexOf('function readGrokConfigToml()'), hive.indexOf('export class HiveManager'));
  assert.match(reader, /readFileSync\(/);
  assert.doesNotMatch(reader, /writeFileSync|appendFileSync/, 'the person\'s config.toml is read, never written');
  // (Codex's per agent config.toml IS written elsewhere in this file, on purpose; that is not Grok's.)
  assert.equal([...hive.matchAll(/readGrokConfigToml\(\)/g)].length, 2, 'one definition, one use');
});

test('a Grok agent gets no COLORFGBG: on Grok 1.0.41 it turned grokday back to a black background', () => {
  const hive = fs.readFileSync(path.join(ROOT, 'src/main/hive.ts'), 'utf8');
  const grok = hive.slice(hive.indexOf("if ((meta.provider ?? 'claude') === 'grok') {"));
  const block = grok.slice(0, grok.indexOf('\n    }\n') + 6);
  assert.match(block, /delete env\.COLORFGBG;/);
  // The generic hint is still set before it, for every other provider.
  assert.ok(hive.indexOf("env.COLORFGBG = opts.theme === 'dark'") < hive.indexOf('delete env.COLORFGBG;'));
});

// The founder, 24 Sep 2026, on the build with GROK_THEME=grokday already in
// the agent's env: "grok terminal is still black". grokday fills its
// background with palette slot 15, and the app's light palette maps slot 15 to
// a dark ink. Measured on Grok 1.0.41: grokday writes 48;5;15 for the ground
// and 38;5;0 / 7 / 8 for its text.
test('a Grok pane in the light theme maps slot 15 to its own background', () => {
  const { ansiForProvider, ansiFor } = loadTs('src/renderer/src/design/surfaceTheme.ts');
  const bg = '#FBFAF7';
  const grok = ansiForProvider('professional', 'light', 'grok', bg);
  assert.equal(grok.brightWhite, bg, 'grokday ground is the pane ground');
  const base = ansiFor('professional', 'light');
  assert.notEqual(base.brightWhite, bg, 'the shared table is untouched');
  for (const k of ['black', 'white', 'brightBlack']) assert.equal(grok[k], base[k], `grokday text slot ${k} keeps its dark ink`);
  assert.deepEqual(ansiForProvider('professional', 'light', 'claude', bg), base, 'other engines unchanged');
  assert.deepEqual(ansiForProvider('professional', 'dark', 'grok', bg), ansiFor('professional', 'dark'), 'dark theme unchanged');
});

test('every terminal view hands its agent engine to the palette', () => {
  const view = fs.readFileSync(path.join(ROOT, 'src/renderer/src/components/PtyTerminalView.tsx'), 'utf8');
  assert.match(view, /xtermTheme\(skin, ptyTheme, provider\)/);
  assert.match(view, /\[ptyTheme, skin, ptyId, provider\]/);
  for (const f of ['CommandCenterPanel.tsx', 'FullscreenTerminal.tsx', 'AgentDetailPanel.tsx', 'pro/AgentScreen.tsx', 'pro/god/TerminalTab.tsx']) {
    const src = fs.readFileSync(path.join(ROOT, 'src/renderer/src/components', f), 'utf8');
    const tag = src.slice(src.indexOf('<PtyTerminalView'), src.indexOf('/>', src.indexOf('<PtyTerminalView')));
    assert.match(tag, /provider=\{agent\.provider\}/, `${f} passes the engine`);
  }
});

/**
 * Monaco bootstrap for the Electron renderer (electron-vite / Vite).
 *
 * Two things have to be true for Monaco to work in a bundled Electron app:
 *
 *  1. Workers must be SELF-HOSTED, not fetched from a CDN. We import each
 *     language worker through Vite's `?worker` suffix, which emits a real
 *     bundled worker chunk and a constructor. `MonacoEnvironment.getWorker`
 *     hands Monaco the right one per language. This is the electron-vite-safe
 *     equivalent of the classic `getWorkerUrl` CDN dance — it works offline and
 *     inside the packaged `app.asar` because the worker URL is resolved by Vite
 *     at build time (relative `base: './'`).
 *
 *  2. `@monaco-editor/react` must use THIS bundled `monaco` instance rather than
 *     its default behaviour of lazy-loading monaco from a CDN via AMD. We pin it
 *     with `loader.config({ monaco })`.
 *
 * Import this module once (for its side effects) before any editor mounts.
 */
import { useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import { readSurface } from '@/design/surfaceTheme';
import type { AppSkin } from '@/design/skin';
import type { AppTheme } from '@/design/theme';
import { useAppTheme } from '@/design/theme';
import { useAppSkin } from '@/design/skin';
import { loader } from '@monaco-editor/react';

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    switch (label) {
      case 'json':
        return new JsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new HtmlWorker();
      case 'typescript':
      case 'javascript':
        return new TsWorker();
      default:
        return new EditorWorker();
    }
  }
};


let configured = false;

/** Pin @monaco-editor/react to the bundled monaco. Idempotent.
 *  Theme registration is NO LONGER done here: a theme now depends on the live
 *  skin + theme tokens, so it is (re)defined by useMonacoTheme instead of once
 *  at setup. */
export function setupMonaco(): typeof monaco {
  if (!configured) {
    configured = true;
    loader.config({ monaco });
  }
  return monaco;
}

/**
 * Monaco takes literal colours and cannot read CSS, so its theme is BUILT from
 * the resolved --cth-* tokens rather than re-stated as hex. See
 * design/surfaceTheme.ts for why that matters.
 *
 * THIS USED TO BE ONE HARD-WIRED LIGHT THEME. `CTH_MONACO_THEME` was the constant
 * string 'cth-light' and `defineThemes` defined only that, so the IDE painted
 * cream in Office DARK too — a shipped bug, not a Professional-only one. It now
 * has both axes: a theme is defined per skin+theme on demand and re-defined when
 * either moves, because Monaco resolves a theme by name at apply time.
 */
function themeName(skin: AppSkin, theme: AppTheme): string {
  return `cth-${skin}-${theme}`;
}

/** `#RRGGBB` plus an alpha byte. A token that is not six digit hex (it never
 *  is today) is returned as it is: opaque beats a colour Monaco rejects. */
function withAlpha(hex: string, aa: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${aa}` : hex;
}

/** (Re)define the theme for the CURRENT skin/theme from live token values. */
export function defineMonacoTheme(m: typeof monaco, skin: AppSkin, theme: AppTheme): string {
  const s = readSurface();
  const dark = theme === 'dark';
  const name = themeName(skin, theme);
  const bare = (hex: string) => hex.replace('#', '');
  m.editor.defineTheme(name, {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: bare(s.foreground), background: bare(s.background) },
      { token: 'comment', foreground: bare(s.dim), fontStyle: 'italic' },
      { token: 'keyword', foreground: dark ? 'A896E3' : '8B5CF6' },
      { token: 'string', foreground: dark ? '74C096' : '3FA45B' },
      { token: 'number', foreground: dark ? 'E08C82' : 'D94F4F' },
      { token: 'type', foreground: dark ? '6FB3C4' : '2A9D94' },
      { token: 'function', foreground: dark ? 'CFAA57' : 'C2603A' },
      { token: 'variable', foreground: bare(s.foreground) },
      { token: 'delimiter', foreground: bare(s.dim) }
    ],
    colors: {
      'editor.background': s.background,
      'editor.foreground': s.foreground,
      'editorLineNumber.foreground': s.border,
      'editorLineNumber.activeForeground': s.foreground,
      'editor.selectionBackground': s.selectionBackground,
      'editor.lineHighlightBackground': s.lineHighlight,
      'editorCursor.foreground': s.cursor,
      'editorGutter.background': s.gutter,
      'editorWidget.background': s.gutter,
      'editorIndentGuide.background1': s.border,
      // The find and replace bar (ideFind.ts): Monaco's own widget, dressed in
      // the app's paper, ink and coral so it reads as ours in all four looks.
      'editorWidget.foreground': s.foreground,
      'editorWidget.border': s.border,
      'widget.shadow': dark ? '#00000066' : '#1A132026',
      'input.background': s.background,
      'input.foreground': s.foreground,
      'input.border': s.border,
      'input.placeholderForeground': s.dim,
      'inputOption.activeBorder': s.cursor,
      'inputOption.activeBackground': withAlpha(s.cursor, '33'),
      'inputOption.activeForeground': s.foreground,
      'focusBorder': s.cursor,
      'icon.foreground': s.dim,
      'toolbar.hoverBackground': s.lineHighlight,
      'editor.findMatchBackground': withAlpha(s.cursor, '66'),
      'editor.findMatchBorder': s.cursor,
      'editor.findMatchHighlightBackground': withAlpha(s.cursor, '2E'),
      'editor.findRangeHighlightBackground': s.lineHighlight,
      // Diff tints stay literal: they are translucent overlays that must read as
      // added/removed on ANY ground, and both skins keep the same green/red sense.
      'diffEditor.insertedTextBackground': '#6BCF7F33',
      'diffEditor.removedTextBackground': '#FF6B6B33',
      'diffEditor.insertedLineBackground': '#6BCF7F22',
      'diffEditor.removedLineBackground': '#FF6B6B22'
    }
  });
  return name;
}


/**
 * The theme name to hand `<Editor theme=...>`, kept in step with both axes.
 *
 * Monaco resolves a theme by NAME at apply time, so the definition has to be
 * (re)registered before the name is used — and re-registered when the tokens
 * behind it change, which is exactly what a skin or theme flip does. Defining in
 * an effect and returning the name in state gives Monaco a name that is always
 * backed by current values.
 */
export function useMonacoTheme(): string {
  const theme = useAppTheme();
  const skin = useAppSkin();
  const [name, setName] = useState(() => `cth-${skin}-${theme}`);
  useEffect(() => {
    setName(defineMonacoTheme(setupMonaco(), skin, theme));
  }, [skin, theme]);
  return name;
}

/** Map a filename to a Monaco language id (used to set the model language). */
export function languageForPath(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path;
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  switch (ext) {
    case 'ts': return 'typescript';
    case 'tsx': return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs': return 'javascript';
    case 'json': return 'json';
    case 'md':
    case 'markdown': return 'markdown';
    case 'py': return 'python';
    case 'rb': return 'ruby';
    case 'go': return 'go';
    case 'rs': return 'rust';
    case 'java': return 'java';
    case 'c':
    case 'h': return 'c';
    case 'cpp':
    case 'cc':
    case 'hpp': return 'cpp';
    case 'cs': return 'csharp';
    case 'php': return 'php';
    case 'sh':
    case 'bash':
    case 'zsh': return 'shell';
    case 'html':
    case 'htm': return 'html';
    case 'css': return 'css';
    case 'scss': return 'scss';
    case 'less': return 'less';
    case 'yml':
    case 'yaml': return 'yaml';
    case 'toml': return 'ini';
    case 'xml': return 'xml';
    case 'sql': return 'sql';
    case 'dockerfile': return 'dockerfile';
    default:
      if (name.toLowerCase() === 'dockerfile') return 'dockerfile';
      return 'plaintext';
  }
}

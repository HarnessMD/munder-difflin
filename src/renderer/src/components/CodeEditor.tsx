import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAppTheme } from '@/design/theme';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { yaml } from '@codemirror/lang-yaml';
import { Icon } from './Icon';
import { PixelButton } from './PixelButton';

// ─── Theme matching CTH palette ─────────────────────────────────────────────
// UNLIKE xterm AND MONACO, CodeMirror can read CSS. It emits real stylesheet
// rules against real DOM nodes, so `var(--cth-*)` resolves at paint time and this
// surface follows BOTH axes with no JavaScript at all — no token values are
// re-stated here and none can drift. (xterm paints to a canvas and Monaco carries
// its own colour model, which is why those two need design/surfaceTheme.ts.)
//
// It used to be hard-coded cream with `{ dark: false }` and `theme="light"` on
// the component, so the file editor stayed light in Office DARK as well — a
// shipped bug, not a Professional-only one.
const cthEditorTheme = (dark: boolean) => EditorView.theme({
  '&': {
    background: 'var(--cth-paper-100)',
    color: 'var(--cth-ink-900)',
    height: '100%',
    fontFamily: 'VT323, "JetBrains Mono", monospace',
    fontSize: '16px'
  },
  '.cm-content': { caretColor: 'var(--cth-coral)', padding: '8px 0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--cth-coral)', borderLeftWidth: '2px' },
  '.cm-scroller': { fontFamily: 'inherit', overflow: 'auto' },
  '.cm-gutters': {
    background: 'var(--cth-cream-100)',
    color: 'var(--cth-ink-500)',
    borderRight: '1px solid var(--cth-ink-100)'
  },
  '.cm-activeLineGutter': { background: 'var(--cth-cream-200)' },
  '.cm-activeLine': { background: 'var(--cth-cream-200)' },
  '.cm-selectionBackground, ::selection': { background: 'var(--cth-cream-200) !important' },
  '.cm-searchMatch': { background: 'var(--cth-lemon-light)', outline: '1px solid var(--cth-ink-900)' },
  '.cm-searchMatch.cm-searchMatch-selected': { background: 'var(--cth-lemon)' }
}, { dark });

/* Syntax hues, the one part that is NOT a token. These describe code structure,
   not our chrome, so there is no --cth-* slot for them — the same argument that
   keeps the sixteen ANSI slots literal in design/surfaceTheme.ts. The dark set is
   not invented: it reuses the Office dark ANSI hues already tuned for legibility
   on a dark ground, which is what Monaco's dark rules use too, so the two editors
   agree. Structural colours (variables, headings, operators, comments) go through
   tokens and so follow the skin. */
const SYNTAX = {
  light: { keyword: '#B197FC', string: '#6BCF7F', number: '#FF6B6B', fn: '#FFA07A', type: '#4ECDC4' },
  dark:  { keyword: '#A896E3', string: '#74C096', number: '#E08C82', fn: '#CFAA57', type: '#6FB3C4' }
};

const cthSyntax = (dark: boolean) => {
  const c = dark ? SYNTAX.dark : SYNTAX.light;
  return HighlightStyle.define([
    { tag: tags.keyword,        color: c.keyword },
    { tag: tags.operator,       color: 'var(--cth-ink-500)' },
    { tag: [tags.string, tags.regexp], color: c.string },
    { tag: [tags.number, tags.bool, tags.null], color: c.number },
    { tag: tags.comment,        color: 'var(--cth-ink-500)', fontStyle: 'italic' },
    { tag: tags.variableName,   color: 'var(--cth-ink-900)' },
    { tag: tags.function(tags.variableName), color: c.fn },
    { tag: [tags.typeName, tags.className], color: c.type },
    { tag: tags.propertyName,   color: 'var(--cth-ink-700)' },
    { tag: tags.heading,        color: 'var(--cth-ink-900)', fontWeight: 'bold' as any },
    { tag: tags.link,           color: c.type, textDecoration: 'underline' as any },
    { tag: tags.meta,           color: 'var(--cth-ink-500)' }
  ]);
};

function extensionsFor(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (['ts', 'tsx'].includes(ext)) return [javascript({ jsx: true, typescript: true })];
  if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) return [javascript({ jsx: ext.endsWith('x') })];
  if (ext === 'json') return [json()];
  if (['md', 'markdown'].includes(ext)) return [markdown()];
  if (ext === 'py') return [python()];
  if (['html', 'htm'].includes(ext)) return [html()];
  if (ext === 'css') return [css()];
  if (['yml', 'yaml'].includes(ext)) return [yaml()];
  return [];
}

export interface CodeEditorProps {
  root: string;
  /** Relative file path within `root` */
  filePath: string | null;
  /** Escalate this file into the IDE. The sidebar editor is deliberately
   *  small; the IDE is where tabs, the tree, git, and markdown preview live. */
  onOpenInIde?: () => void;
  onCopyPath?: () => void;
}

export function CodeEditor({
  root, filePath, onOpenInIde, onCopyPath
}: CodeEditorProps) {
  const appTheme = useAppTheme();
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [absPath, setAbsPath] = useState<string | undefined>();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load file on path change
  useEffect(() => {
    let cancelled = false;
    if (!filePath) {
      setContent(''); setOriginalContent(''); setError(undefined);
      setAbsPath(undefined);
      return;
    }
    setLoading(true);
    setError(undefined);
    window.cth.readFile(root, filePath).then(res => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setContent(res.content);
        setOriginalContent(res.content);
        setAbsPath(res.path);
      } else {
        setContent('');
        setOriginalContent('');
        setAbsPath(undefined);
        setError(res.error);
      }
    });
    return () => { cancelled = true; };
  }, [root, filePath]);

  const dirty = content !== originalContent;

  const save = useCallback(async () => {
    if (!filePath || !dirty) return;
    setSaveState('saving');
    const res = await window.cth.writeFile(root, filePath, content);
    if (res.ok) {
      setOriginalContent(content);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1200);
    } else {
      setSaveState('error');
      setError(res.error);
      setTimeout(() => setSaveState('idle'), 4000);
    }
  }, [filePath, dirty, content, root]);

  // Cmd-S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const extensions = useMemo(
    () => [cthEditorTheme(appTheme === 'dark'), syntaxHighlighting(cthSyntax(appTheme === 'dark')), ...(filePath ? extensionsFor(filePath) : [])],
    [filePath, appTheme]
  );

  if (!filePath) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        background: 'var(--cth-paper-200)',
        textAlign: 'center'
      }}>
        <div style={{ opacity: 0.5 }}>
          <Icon name="code" size={2} />
        </div>
        <div style={{
          fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px',
          textTransform: 'uppercase', letterSpacing: 1,
          color: 'var(--cth-ink-700)'
        }}>
          No file open
        </div>
        <div style={{
          fontFamily: 'var(--cth-font-ui)', fontSize: 13,
          color: 'var(--cth-ink-500)'
        }}>
          Pick a file from the tree to view it here.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--cth-paper-100)'
    }}>
      {/* Mini header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 8px',
        background: 'var(--cth-cream-200)',
        borderBottom: '1px solid var(--cth-ink-700)',
        fontFamily: 'var(--cth-font-ui)', fontSize: 12,
        color: 'var(--cth-ink-700)'
      }}>
        <Icon name="code" />
        <span style={{
          flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }} title={absPath}>{filePath}{dirty && ' •'}</span>
        {onCopyPath && (
          <button
            onClick={onCopyPath}
            title="Copy absolute path"
            style={editorBtn}
          >copy path</button>
        )}
        <button
          onClick={save}
          disabled={!dirty || saveState === 'saving'}
          title="Save (Cmd-S)"
          style={{ ...editorBtn, opacity: dirty ? 1 : 0.5 }}
        >
          {saveState === 'saving' ? '...' : saveState === 'saved' ? 'saved' : saveState === 'error' ? 'err' : 'save'}
        </button>
        {onOpenInIde && (
          <button
            onClick={onOpenInIde}
            title="Open in the IDE"
            aria-label="Open in the IDE"
            style={editorBtn}
          >
            <Icon name="code" />
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 12, color: 'var(--cth-ink-500)' }}>loading…</div>
        ) : error ? (
          <div style={{ padding: 12, color: 'var(--cth-coral)' }}>{error}</div>
        ) : (
          <CodeMirror
            value={content}
            onChange={(v) => setContent(v)}
            extensions={extensions}
            height="100%"
            theme={appTheme}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLine: true,
              foldGutter: true,
              autocompletion: false
            }}
          />
        )}
      </div>
    </div>
  );
}

const editorBtn: React.CSSProperties = {
  padding: '0 6px', height: 22,
  fontFamily: 'var(--cth-font-ui)', fontSize: 12,
  color: 'var(--cth-ink-900)',
  background: 'var(--cth-cream-100)',
  border: 'none',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
  cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 4
};

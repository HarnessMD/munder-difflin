import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { setupMonaco, useMonacoTheme, languageForPath } from './monaco';

// Pin @monaco-editor/react to the bundled monaco + register themes at module load,
// before any <Editor/> mounts (avoids a CDN fetch / unthemed first paint).
setupMonaco();

/**
 * Where to put the caret (0.4.9 phase 9, repo-wide search).
 *
 * `nonce` is the whole point: clicking the SAME search hit twice has to scroll
 * back to it, and a `{line, col}` that has not changed would be a no-op. It
 * also means the reveal survives the editor mounting late — the effect and the
 * mount handler both apply whatever the current target is.
 */
export interface RevealTarget {
  line: number;
  col: number;
  nonce: number;
  /** Characters to select at that position, so a search hit arrives
   *  highlighted rather than leaving the reader to find it again. */
  length?: number;
}

/** What the status line needs from the editor: where the caret is, and how much
 *  is selected. Reported rather than inferred, because a status line that
 *  computes a caret position from the buffer is a status line that is wrong the
 *  moment anyone uses a second cursor. */
export interface CaretReport {
  /** 1 based, as Monaco counts. */
  line: number;
  column: number;
  /** Characters inside the selection, 0 when there is none. */
  selected: number;
}

export interface MonacoEditorProps {
  /** File path — drives syntax language only. */
  path: string;
  value: string;
  onChange: (value: string) => void;
  /** Invoked on Cmd/Ctrl+S while the editor has focus. */
  onSave?: () => void;
  readOnly?: boolean;
  reveal?: RevealTarget;
  /** Caret and selection, for the status line (0.4.9 phase 8). */
  onCaret?: (report: CaretReport) => void;
  /** The editor instance once mounted, null when it goes. The panel needs it to
   *  open the find bar when Cmd/Ctrl+F is pressed outside the text (ideFind.ts). */
  onEditor?: (editor: Editor | null) => void;
}

export type Editor = Parameters<OnMount>[0];

export function MonacoEditor({ path, value, onChange, onSave, readOnly, reveal, onCaret, onEditor }: MonacoEditorProps) {
  const monacoTheme = useMonacoTheme();
  // Keep the latest onSave in a ref so the editor command (bound once at mount)
  // always calls the current handler without rebinding.
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onCaretRef = useRef(onCaret);
  onCaretRef.current = onCaret;
  const editorRef = useRef<Editor | null>(null);
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  const onEditorRef = useRef(onEditor);
  onEditorRef.current = onEditor;
  useEffect(() => () => onEditorRef.current?.(null), []);

  const applyReveal = (ed: Editor, target: RevealTarget): void => {
    const end = target.col + (target.length ?? 0);
    ed.revealLineInCenter(target.line);
    ed.setSelection({ startLineNumber: target.line, startColumn: target.col, endLineNumber: target.line, endColumn: end });
    ed.focus();
  };

  // The file's content arrives asynchronously, so the editor is frequently
  // mounted with an empty buffer and filled a tick later. Revealing on the
  // nonce AND on the value covers both orders without double-scrolling,
  // because a reveal is idempotent.
  useEffect(() => {
    const ed = editorRef.current;
    if (ed && reveal) applyReveal(ed, reveal);
  }, [reveal?.nonce, reveal, value]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current?.();
    });
    // One listener for both facts. `onDidChangeCursorSelection` fires for a
    // plain caret move as well (an empty selection is still a selection), so
    // subscribing to the position event too would only double the work.
    editor.onDidChangeCursorSelection((e) => {
      const sel = e.selection;
      const model = editor.getModel();
      onCaretRef.current?.({
        line: sel.positionLineNumber,
        column: sel.positionColumn,
        selected: model ? model.getValueInRange(sel).length : 0
      });
    });
    if (revealRef.current) applyReveal(editor, revealRef.current);
    onEditorRef.current?.(editor);
  };

  return (
    <Editor
      theme={monacoTheme}
      language={languageForPath(path)}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={handleMount}
      // Code reads left to right in every language. Under Arabic's dir=rtl
      // Monaco inherited the direction, drew no text and mirrored its find bar
      // into itself, so the editor keeps its own direction.
      wrapperProps={{ dir: 'ltr' }}
      loading={<div style={{ padding: 12, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-ui)' }}>loading editor…</div>}
      options={{
        readOnly,
        fontFamily: '"JetBrains Mono", "SF Mono", Menlo, monospace',
        fontSize: 12,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        renderWhitespace: 'selection',
        tabSize: 2,
        wordWrap: 'off',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        padding: { top: 8, bottom: 8 }
      }}
    />
  );
}

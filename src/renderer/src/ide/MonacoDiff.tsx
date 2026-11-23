import { DiffEditor } from '@monaco-editor/react';
import { setupMonaco, useMonacoTheme, languageForPath } from './monaco';

setupMonaco();

export interface MonacoDiffProps {
  /** File path — drives syntax language only. */
  path: string;
  /** Left side (committed HEAD content). */
  original: string;
  /** Right side (current working-tree content). */
  modified: string;
}

/** Read-only side-by-side diff (working tree vs HEAD) backed by Monaco's
 *  built-in DiffEditor — the same dependency as the editor, no extra view layer. */
export function MonacoDiff({ path, original, modified }: MonacoDiffProps) {
  const monacoTheme = useMonacoTheme();
  return (
    <DiffEditor
      theme={monacoTheme}
      language={languageForPath(path)}
      original={original}
      modified={modified}
      // Left to right in every language, as the editor (MonacoEditor.tsx).
      wrapperProps={{ dir: 'ltr' }}
      loading={<div style={{ padding: 12, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-ui)' }}>loading diff…</div>}
      options={{
        readOnly: true,
        renderSideBySide: true,
        fontFamily: '"JetBrains Mono", "SF Mono", Menlo, monospace',
        fontSize: 12,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        ignoreTrimWhitespace: false,
        renderOverviewRuler: false
      }}
    />
  );
}

/**
 * THE FACTS AN EDITOR'S STATUS LINE STATES (0.4.9 phase 8).
 *
 * An editor reads as professional when the strip along the bottom answers, at a
 * glance, four questions a text box cannot: where is the caret, what language
 * is this being read as, how does this file end its lines, and how much of it
 * is there. Every one of those is derived from the buffer, so every one of them
 * is pure and belongs here rather than inside a component that cannot be
 * tested.
 *
 * The one rule this file exists to keep: none of it may GUESS. A status line
 * that says `UTF-8` on a file nobody checked the encoding of is decoration
 * pretending to be information. Line endings are counted from the actual bytes
 * of the buffer, and a file with both kinds says so instead of picking one.
 */

/** How this buffer ends its lines. `none` is a single line with no terminator,
 *  which is a real state and not the same as LF. */
export type LineEnding = 'LF' | 'CRLF' | 'mixed' | 'none';

export function detectLineEnding(content: string): LineEnding {
  const s = typeof content === 'string' ? content : '';
  const total = (s.match(/\n/g) ?? []).length;
  if (total === 0) return 'none';
  const crlf = (s.match(/\r\n/g) ?? []).length;
  if (crlf === 0) return 'LF';
  if (crlf === total) return 'CRLF';
  return 'mixed';
}

/** Lines as an editor counts them: a trailing newline does not open a new one
 *  in the sense a person means, but it does in the sense Monaco means, and the
 *  status line sits beside Monaco. So: split count, which is Monaco's. */
export function countLines(content: string): number {
  const s = typeof content === 'string' ? content : '';
  return s.split('\n').length;
}

/** Bytes the buffer occupies as UTF-8. Reported because a file that is 40 lines
 *  and 2 MB is a minified file, and knowing that before waiting on the editor
 *  is worth one number. */
export function utf8Bytes(content: string): number {
  const s = typeof content === 'string' ? content : '';
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) as number;
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
}

/**
 * Human name for a Monaco language id.
 *
 * Deliberately keyed on the ID rather than on the file extension: the
 * extension table already exists once, in `src/renderer/src/ide/monaco.ts`,
 * and it decides how the file is actually highlighted. Labelling from a second
 * extension table would let the status line claim a language the editor is not
 * using. Anything not listed falls back to the id itself, which is still true.
 */
const LANGUAGE_LABELS: Readonly<Record<string, string>> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  json: 'JSON',
  markdown: 'Markdown',
  python: 'Python',
  ruby: 'Ruby',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  php: 'PHP',
  shell: 'Shell',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  yaml: 'YAML',
  ini: 'INI',
  xml: 'XML',
  sql: 'SQL',
  dockerfile: 'Dockerfile',
  plaintext: 'Plain text'
};

export function languageLabel(languageId: string): string {
  return LANGUAGE_LABELS[languageId] ?? languageId;
}

/**
 * The breadcrumb: the workspace, then each folder, then the file.
 *
 * The workspace segment is the root's own basename, so the trail starts
 * somewhere a person recognises instead of at an anonymous `src`. Folder
 * segments carry the root relative path they stand for, which is what lets a
 * click on one aim the new file field at that folder.
 */
export interface Crumb {
  label: string;
  /** Root relative path of the folder this crumb stands for. `''` is the
   *  workspace root. `null` on the final segment, which is the file itself. */
  rel: string | null;
}

export function breadcrumb(root: string, rel: string): Crumb[] {
  const rootName = (root ?? '').replace(/[/\\]+$/, '').split(/[/\\]/).pop() || (root ?? '');
  const parts = (rel ?? '').split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ label: rootName, rel: '' }];
  for (let i = 0; i < parts.length - 1; i++) {
    crumbs.push({ label: parts[i], rel: parts.slice(0, i + 1).join('/') });
  }
  if (parts.length) crumbs.push({ label: parts[parts.length - 1], rel: null });
  return crumbs;
}

/* The caret position itself is NOT formatted here. `Ln 12, Col 4` is a
 * sentence, it is read right to left in Arabic, and this app ships Arabic, so
 * it is an interpolated locale string (`ide.status.position`) like every other
 * sentence. The numbers that go into it come from Monaco. */

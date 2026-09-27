/**
 * THE IDE'S ICONS (0.4.11, the IDE redesign the founder approved on 5 Sep 2026
 * from hive/shared/design/app-v2/ide-prototype.html).
 *
 * One set, one stroke weight, one colour rule, so the tree, the tabs, the
 * search results and the home tab cannot drift apart:
 *
 *   IdeIcon    a chrome glyph in the current ink (`currentColor`).
 *   FileIcon   a file's glyph by extension, ALWAYS in the app's yellow
 *              (founder, 5 Sep 2026: "change the icon colors from green to
 *              the yellow we use in our dark and light modes"). The token is
 *              the accent's text shade, which is the readable yellow on both
 *              grounds; the lemon is the fallback for the Classic skin, which
 *              declares no accent tokens.
 *   gitCodeColor  the colour of a git status letter. Added is the same
 *              yellow; modified stays the lemon; deleted the coral.
 *
 * The IDE is one surface for both skins, so nothing here names a PRO only
 * token without a fallback.
 */
import type { CSSProperties } from 'react';

export const IDE_YELLOW = 'var(--cth-accent-text, var(--cth-lemon))';

export type IdeIconName =
  | 'file' | 'fileCode' | 'fileBraces' | 'fileMd' | 'fileImage' | 'fileText'
  | 'folder' | 'folderOpen' | 'chevron' | 'search' | 'git' | 'diff' | 'home'
  | 'keys' | 'list' | 'refresh' | 'collapse' | 'newFile' | 'newFolder'
  | 'x' | 'plus' | 'clock' | 'compare' | 'copy' | 'arrowRight' | 'eye' | 'code' | 'columns' | 'more';

const PATHS: Record<IdeIconName, string> = {
  file: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6',
  fileCode: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M10 13l-2 2 2 2M14 13l2 2-2 2',
  fileBraces: 'M8 4c-2 0-3 1-3 3v3c0 1-1 2-2 2 1 0 2 1 2 2v3c0 2 1 3 3 3M16 4c2 0 3 1 3 3v3c0 1 1 2 2 2-1 0-2 1-2 2v3c0 2-1 3-3 3',
  fileMd: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM7 15V9l2.5 3L12 9v6M16 9v6m0 0-2-2m2 2 2-2',
  fileImage: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM8.5 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5-9 9',
  fileText: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  folderOpen: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H6l-3 8zM3 18V7',
  chevron: 'm9 6 6 6-6 6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-3.5-3.5',
  git: 'M6 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm0 12a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm12-9a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 8.5v7M18 11.5a6 6 0 0 1-6 6H8.5',
  diff: 'M12 3v18M5 8h5M5 16h5M14 8h5M14 16h5',
  home: 'm3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  keys: 'M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  collapse: 'M4 7h16M4 12h16M4 17h16',
  newFile: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M12 12v6M9 15h6',
  newFolder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 10v6M9 13h6',
  x: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4v4l3 2',
  compare: 'M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7',
  copy: 'M9 9h11v11H9zM5 15V5a2 2 0 0 1 2-2h10',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  code: 'm8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14',
  columns: 'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM12 4v16',
  more: 'M5 12h.01M12 12h.01M19 12h.01'
};

export function IdeIcon({ name, size = 15, style, title }: { name: IdeIconName; size?: number; style?: CSSProperties; title?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}
      fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[name]} />
    </svg>
  );
}

/** The glyph a path gets in the tree, the tabs and every list of files. */
export function fileIconName(rel: string): IdeIconName {
  const ext = rel.split('.').pop()?.toLowerCase() ?? '';
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h', 'cpp', 'cs', 'sh', 'zsh', 'css', 'scss', 'html', 'htm', 'vue', 'svelte', 'sql'].includes(ext)) return 'fileCode';
  if (['json', 'yml', 'yaml', 'toml', 'plist', 'xml', 'lock'].includes(ext)) return 'fileBraces';
  if (['md', 'markdown', 'mdx'].includes(ext)) return 'fileMd';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext)) return 'fileImage';
  if (['txt', 'log', 'csv', 'env'].includes(ext)) return 'fileText';
  return 'file';
}

export function FileIcon({ rel, size = 15, style }: { rel: string; size?: number; style?: CSSProperties }) {
  return <IdeIcon name={fileIconName(rel)} size={size} style={{ color: IDE_YELLOW, ...style }} />;
}

/** A git status letter's colour. Added is the app's yellow (the founder's
 *  ruling, no green in the IDE), modified the lemon, deleted the coral,
 *  renamed or copied the lilac, untracked the quiet ink. */
export function gitCodeColor(code: string): string {
  if (code === 'A') return IDE_YELLOW;
  if (code === 'M') return 'var(--cth-lemon)';
  if (code === 'D') return 'var(--cth-coral)';
  if (code === 'R' || code === 'C') return 'var(--cth-lilac)';
  return 'var(--cth-ink-500)';
}

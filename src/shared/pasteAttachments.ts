/**
 * WHAT A PASTE INTO A MESSAGE BOX IS (0.5.3, bug 8; Jinbo, 14 Sep 2026).
 *
 * The classic composer turned a pasted screenshot into an attachment. The
 * professional composers had no paste handling at all, so the same keystroke
 * there attached nothing. The decision is here, pure, so every composer asks
 * the same question and a test can take it directly:
 *
 *   image  the clipboard holds picture data (a screenshot, "Copy image"). There
 *          is no file behind it, so main writes one and hands back its path.
 *   files  the clipboard holds files copied in Finder or Explorer. They already
 *          have paths.
 *   text   anything else. The composer does nothing and the browser pastes.
 *
 * Image wins over files: a screenshot copied from some apps arrives as BOTH a
 * picture item and a nameless file, and the nameless file has no path.
 */
export type PasteKind = 'image' | 'files' | 'text';

export interface ClipboardItemLike { kind: string; type: string }

export function pasteKind(items: readonly ClipboardItemLike[], fileCount: number): PasteKind {
  if (items.some((it) => it.kind === 'file' && it.type.startsWith('image/'))) return 'image';
  return fileCount > 0 ? 'files' : 'text';
}

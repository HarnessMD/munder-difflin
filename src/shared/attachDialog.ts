/**
 * WHAT THE ATTACH BUTTON'S PICKER ACCEPTS (0.5.3, founder batch 2, I8: "the
 * attachment button accepts PDFs, videos and folders").
 *
 * Until 0.5.3 the picker was `openFile` only, with an Images filter first, so
 * a folder could not be chosen at all and a PDF or a video sat greyed out
 * until the person found the filter menu. Now the first filter takes every
 * file, and the narrower ones (images, PDFs, videos) follow for whoever wants
 * them.
 *
 * FOLDERS AND THE PLATFORMS. The Mac's panel takes files and folders in one
 * picker. Windows and Linux cannot: given both, Electron's picker there
 * becomes a folder picker and every file greys out. So on those two the
 * composer offers two buttons, one per kind, and the Mac keeps one. Agents
 * are sent paths, so a folder is a path like any other; its name carries a
 * trailing slash, so the chip and the message line both say it is a folder.
 */

export type AttachWant = 'any' | 'files' | 'folders';

export interface AttachDialogOptions {
  title: string;
  properties: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
  filters?: { name: string; extensions: string[] }[];
}

export const ATTACH_FILTERS: { name: string; extensions: string[] }[] = [
  { name: 'All Files', extensions: ['*'] },
  { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic', 'tiff', 'avif'] },
  { name: 'PDF', extensions: ['pdf'] },
  { name: 'Videos', extensions: ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', 'mpg', 'mpeg'] }
];

/** One picker takes files and folders together only on the Mac. */
export function mixesFilesAndFolders(platform: string): boolean {
  return platform === 'darwin';
}

/** The buttons a composer draws for attaching: one on the Mac, two elsewhere. */
export function attachWants(platform: string): AttachWant[] {
  return mixesFilesAndFolders(platform) ? ['any'] : ['files', 'folders'];
}

/** The picker for one button. 'any' on a platform that cannot mix falls back
 *  to files, the old behaviour, rather than a folder picker nobody expected. */
export function attachDialogOptions(platform: string, want: AttachWant = 'any'): AttachDialogOptions {
  const kind: AttachWant = want === 'any' && !mixesFilesAndFolders(platform) ? 'files' : want;
  if (kind === 'folders') return { title: 'Attach folders', properties: ['openDirectory', 'multiSelections'] };
  if (kind === 'files') return { title: 'Attach files', properties: ['openFile', 'multiSelections'], filters: ATTACH_FILTERS };
  return { title: 'Attach files or folders', properties: ['openFile', 'openDirectory', 'multiSelections'], filters: ATTACH_FILTERS };
}

/** A chosen path's name for the chip and the message: a folder ends in "/". */
export function attachName(path: string, isFolder: boolean): string {
  const parts = path.replace(/[\\/]+$/, '').split(/[\\/]/);
  const base = parts.pop() || path;
  return isFolder ? `${base}/` : base;
}

/** Only the three words a button can send are taken off the bridge. */
export function asAttachWant(v: unknown): AttachWant {
  return v === 'files' || v === 'folders' ? v : 'any';
}

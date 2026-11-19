/**
 * Image file detection — the ONE place that answers "is this path an image, and
 * what mime does it carry?".
 *
 * Shared on purpose. Three call sites need the same answer and they live on
 * opposite sides of the IPC boundary: the main process stamps a mime onto the
 * bytes it reads (`fs.readFileBinary`), the IDE decides whether a click opens
 * Monaco or the image preview, and the markdown renderer decides whether an
 * `<img src>` is worth resolving. If those three ever disagree, the failure is
 * silent and confusing — a file opens as a preview that then reports "unknown
 * image", or opens in Monaco as mojibake. Keeping the table here makes
 * disagreement impossible.
 *
 * Detection is BY EXTENSION, not by magic bytes. That is deliberate: the
 * renderer must decide how to open a file *before* it has any bytes, so a
 * content sniff isn't available at the moment the decision is made. The mime is
 * only ever used to label a `blob:` URL for the platform's own image decoder —
 * a mislabelled file simply fails to decode and shows the preview's error state,
 * it never becomes a script or a navigation.
 *
 * TWO KINDS OF INPUT, two families of functions. A markdown `src` is a URL:
 * `?v=2` and `#fig` are cache-busters and fragments, not part of the name
 * (`imageMimeForPath`, `isImagePath`, `isSvgPath`). A path from the file tree or
 * from `fs` is a DISK path: `QA#1.png` is a perfectly good file name and a
 * workspace can live under `C:\Users\me\C#work\` (`imageMimeForDiskPath`,
 * `isImageDiskPath`, `isSvgDiskPath`). Feeding one kind to the other's API
 * truncates the name at the `#` and silently loses the extension.
 */

/** Extension (lower-case, no dot) → mime type. */
const MIME_BY_EXT: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  svg: 'image/svg+xml'
};

/**
 * The mime for a bare lower-case extension, or null.
 *
 * OWN keys only. The table is a plain object literal, so an unguarded
 * `MIME_BY_EXT['constructor']` hands back Object itself: `x.constructor` became
 * an "image", and the "mime" the main process stamped onto it was a function
 * that cannot cross IPC.
 */
function mimeForExtension(ext: string): string | null {
  return Object.hasOwn(MIME_BY_EXT, ext) ? MIME_BY_EXT[ext] : null;
}

/** Lower-cased extension of a single file NAME (no separators), or ''. */
function extensionOfFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0 || dot === fileName.length - 1) return '';
  return fileName.slice(dot + 1).toLowerCase();
}

/**
 * Last component of a disk path. Splits on BOTH separators: the main process
 * hands over native Windows paths, the renderer uses `/`, and the answer has to
 * be the same either way.
 */
function fileNameOfDiskPath(diskPath: string): string {
  return diskPath.split(/[\\/]/).pop() ?? '';
}

/**
 * Lower-cased extension of the URL path `p` without the dot, or '' when there
 * is none.
 *
 * URL semantics: strips a `?query` / `#hash` first. Markdown authored by an
 * agent routinely carries cache-busting suffixes (`./shot.png?v=2`), and
 * treating `png?v=2` as the extension would silently drop exactly the
 * screenshots we want to render. Only the LAST path segment is considered, so a
 * dotted directory name (`v1.2/report`) can never masquerade as an extension.
 * For a path from disk use the `*DiskPath` functions instead.
 */
export function extensionOf(p: string): string {
  if (typeof p !== 'string') return '';
  const clean = p.split('#')[0].split('?')[0];
  return extensionOfFileName(clean.split('/').pop() ?? '');
}

/** The image mime for the URL path `p`, or null when the extension isn't a known image. */
export function imageMimeForPath(p: string): string | null {
  return mimeForExtension(extensionOf(p));
}

/** True when the URL path `p` names a raster or vector image we can render. */
export function isImagePath(p: string): boolean {
  return imageMimeForPath(p) !== null;
}

/**
 * SVG is the one image format that is ALSO source code people edit by hand.
 * Callers use this to keep a "view source" escape hatch: an .svg opens as a
 * picture (that's what you want 95% of the time) but must never become
 * un-editable, which is what routing every image straight to a read-only
 * preview would have done. URL semantics; see `isSvgDiskPath` for disk paths.
 */
export function isSvgPath(p: string): boolean {
  return extensionOf(p) === 'svg';
}

/**
 * The image mime for a single file NAME exactly as it is on disk — `#` and `?`
 * included — or null. The markdown resolver calls this on the DECODED last
 * segment, so `QA%231.png` is judged as `QA#1.png` and `cover.png%23notes.txt`
 * by its real `.txt`.
 */
export function imageMimeForFileName(fileName: string): string | null {
  if (typeof fileName !== 'string') return null;
  return mimeForExtension(extensionOfFileName(fileName));
}

/** The image mime for a disk path (workspace-relative or absolute, either separator), or null. */
export function imageMimeForDiskPath(diskPath: string): string | null {
  if (typeof diskPath !== 'string') return null;
  return imageMimeForFileName(fileNameOfDiskPath(diskPath));
}

/** True when the disk path names an image we can render. */
export function isImageDiskPath(diskPath: string): boolean {
  return imageMimeForDiskPath(diskPath) !== null;
}

/** `isSvgPath` for a disk path. */
export function isSvgDiskPath(diskPath: string): boolean {
  if (typeof diskPath !== 'string') return false;
  return extensionOfFileName(fileNameOfDiskPath(diskPath)) === 'svg';
}

/** Human byte size for a status line: "864 B", "1.4 MB". */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

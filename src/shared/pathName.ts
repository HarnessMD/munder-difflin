/**
 * A folder's name taken from its path, and the two put back together.
 *
 * WINDOWS (0.5.6): a folder picked on Windows comes back as
 * `C:\Users\me\Documents\Office`. Every helper here used to split on `/`
 * alone, found no separator, and called the whole path the name. On the
 * workspace step that was more than a wrong label: the name field strips
 * separators as you type, so one edit turned the path into `C:UsersmeOffice`.
 *
 * A drive letter or a network share marks a Windows path, and only then is a
 * backslash a separator. On macOS and Linux a backslash is a legal character
 * in a folder's name, so every other path is split and joined exactly as it
 * was before.
 */
export function isWindowsPath(p: string): boolean {
  return /^[A-Za-z]:([\\/]|$)|^\\\\/.test(p);
}

/** The last segment alone, for a label. The path itself when it has none. */
export function lastSegment(p: string): string {
  return p.split(isWindowsPath(p) ? /[\\/]/ : '/').filter(Boolean).pop() ?? p;
}

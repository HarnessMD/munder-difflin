/**
 * A TRANSCRIPT FILE, OPENED SAFELY EVERY TIME.
 *
 * A hook's `transcript_path` is kept and opened again BY NAME on every poll,
 * for the context gauge and for the cost reading. Every reader opens it
 * through `openGuarded`:
 *
 *   - opened without following a link at the last step, and without
 *     blocking (a named pipe swapped in must not hang the main process);
 *   - the OPENED file must be a regular file (asked of the handle, not of
 *     the name).
 */
import fs from 'node:fs';

/** Does an opened file (its `stat`, taken from the handle) pass? Only a
 *  regular file does. `file` is the name it was opened by. */
export function guardHolds(_file: string, opened: { isFile(): boolean }): boolean {
  return opened.isFile();
}

/** Read only, no link followed at the last step, and never waiting on a
 *  pipe or a device. Reading a regular file is not changed by O_NONBLOCK. */
export const READ_FLAGS = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0);

/** Open `file` for reading, or null. The caller closes the handle. */
export function openGuarded(file: string): number | null {
  let fd: number;
  // Non blocking: a named pipe put where the file was would otherwise hold
  // this open, and the whole main process with it, until someone writes.
  try { fd = fs.openSync(file, READ_FLAGS); } catch { return null; }
  try {
    if (guardHolds(file, fs.fstatSync(fd))) return fd;
  } catch { /* falls through to close */ }
  try { fs.closeSync(fd); } catch { /* already closed */ }
  return null;
}

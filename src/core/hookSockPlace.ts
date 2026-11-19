/**
 * Where a hook socket can live. A unix socket path has a short limit (104 bytes on macOS, 108 on
 * Linux); past it every bind fails and, with no socket, every hook is allowed (F13). A hive deep in
 * a folder tree cannot have its socket in the hive, so it gets a short private folder of its own
 * under the temp folder, named by a hash of the hive's path.
 */
import { createHash } from 'node:crypto';
import { chmodSync, lstatSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

const SHORT_FOLDER = 'md-hive-';

export const hookSockTooLong = (p: string): boolean => Buffer.byteLength(p) > 100;

/** The socket of a hive whose own path is too long for one. The same hive gets the same path on every run. */
export function shortHookSockPath(root: string, temp = tmpdir()): string {
  const name = `${SHORT_FOLDER}${createHash('sha256').update(root).digest('hex').slice(0, 16)}`;
  const inTemp = join(temp, name, 'hooks.sock');
  return hookSockTooLong(inTemp) ? join('/tmp', name, 'hooks.sock') : inTemp;
}

export const isShortHookSockPath = (sock: string): boolean => basename(dirname(sock)).startsWith(SHORT_FOLDER);

/**
 * A socket's folder, made or checked. It must be a real folder, this user's, that nobody else can
 * enter. Anything else throws and is left exactly as it is. It is never made safe by changing its
 * mode: the folder named could be somebody's home, or one another user made first under a shared /tmp.
 */
export function prepareHookSockFolder(sockPath: string, whatToDo = 'move it aside'): void {
  const dir = dirname(sockPath);
  mkdirSync(dirname(dir), { recursive: true });
  let made = false;
  try { mkdirSync(dir, { mode: 0o700 }); made = true; } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
  }
  const st = lstatSync(dir);
  if (!st.isDirectory()) throw new Error(`the hook socket folder is not a folder: ${dir}`);
  if (typeof process.getuid === 'function' && st.uid !== process.getuid()) {
    throw new Error(`the hook socket folder belongs to another user: ${dir}`);
  }
  // Made just now under a tight umask it can come out narrower, never wider; its own folder is set exactly.
  if (made) chmodSync(dir, 0o700);
  else if ((st.mode & 0o077) !== 0) {
    throw new Error(`the hook socket folder was not made by this office and others can enter it: ${dir}. It is left as it is; ${whatToDo}`);
  }
}

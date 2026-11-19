/**
 * The last lines of a file, read from the end (0.5.5, Stanley's idle audit
 * item 9). logTail read the whole of log.jsonl (2.3 MB on the founder's
 * floor, and it only grows) to hand back its last 200 lines, every 3 to 5
 * seconds from MemoryScreen and the Command Center. This reads backwards in
 * chunks until it has the lines it needs, so the cost follows the lines
 * asked for, not the size of the file.
 */
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';

const CHUNK = 64 * 1024;

/** Up to `n` last non-empty lines of `path`, oldest first. [] when unreadable. */
export function tailLines(path: string, n: number): string[] {
  if (!(n > 0)) return [];
  let fd: number;
  try { fd = openSync(path, 'r'); } catch { return []; }
  try {
    const size = fstatSync(fd).size;
    let pos = size;
    let parts: Buffer[] = [];
    let newlines = 0;
    // n lines need n+1 newlines to be sure the first one is whole (a trailing
    // newline at the end of the file is one more).
    while (pos > 0 && newlines <= n + 1) {
      const len = Math.min(CHUNK, pos);
      pos -= len;
      const buf = Buffer.alloc(len);
      readSync(fd, buf, 0, len, pos);
      for (let i = 0; i < len; i++) if (buf[i] === 10) newlines++;
      parts = [buf, ...parts];
    }
    let text = Buffer.concat(parts).toString('utf8');
    // Started mid file: the first piece may be a cut line (or a cut character).
    if (pos > 0) text = text.slice(text.indexOf('\n') + 1);
    return text.split('\n').filter((l) => l.trim().length > 0).slice(-n);
  } catch {
    return [];
  } finally {
    try { closeSync(fd); } catch { /* already closed */ }
  }
}

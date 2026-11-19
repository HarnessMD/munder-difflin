/** Terminal cell coordinates, including soft wraps and narrowly shaped TUI path breaks. */
interface Cell { getChars(): string; getWidth(): number }
interface Line { isWrapped: boolean; length: number; getCell(x: number): Cell | undefined }
interface Buffer { length: number; getLine(y: number): Line | undefined }
export interface LinkPoint { x: number; y: number }
export interface LinkRange { start: LinkPoint; end: LinkPoint }

/** The characters a link is made of, and nothing else (as cliLogin's LINK_ROW). */
const LINK_ROW = /^[A-Za-z0-9%&=._~:/?#@!$'()*+,;-]+$/;

/** `manualPaths` only proposes a reading. The caller must stat the WHOLE path before using it. */
export function terminalLogicalLine(buffer: Buffer, row: number, cols: number, manualPaths = false) {
  const maxRows = 32;
  const info = new Map<number, { text: string; first: number; last: number }>();
  const describe = (y: number) => {
    let hit = info.get(y);
    if (hit) return hit;
    const line = buffer.getLine(y);
    let text = '', first = cols, last = -1;
    for (let x = 0; line && x < Math.min(cols, line.length); x++) {
      const cell = line.getCell(x);
      if (!cell || cell.getWidth() === 0) continue;
      const chars = cell.getChars() || ' ';
      text += chars;
      if (/\S/.test(chars)) { first = Math.min(first, x); last = x + Math.max(1, cell.getWidth()) - 1; }
    }
    hit = { text: text.trim(), first, last };
    info.set(y, hit);
    return hit;
  };
  const manualBefore = (y: number): boolean => {
    if (!manualPaths || y <= 0 || !buffer.getLine(y) || buffer.getLine(y)?.isWrapped) return false;
    const a = describe(y - 1), b = describe(y);
    return a.first === b.first && a.first <= 8 && a.last >= cols - 17
      && /^(?:\/|~\/|[A-Za-z]:[\\/])/.test(a.text) && /[\\/]$/.test(a.text)
      && /^[\p{L}\p{N}_@.[\]+-][^\s<>"'`|]*$/u.test(b.text)
      && /(?:\.[\p{L}][\p{L}\p{N}_-]*(?::\d+(?::\d+)?)?|[\\/])$/u.test(b.text);
  };
  // A LINK A TUI BROKE INTO ROWS ITSELF: agy prints its Google sign in link as rows
  // of the terminal's width less two, each a line of its own at the same indent, so xterm never marks them wrapped and
  // a click opened the first row alone (a Google 404). A row joins the one above when that one runs to the right edge
  // and ends in a link (or is itself such a row), and this one is at the same indent and is only link characters. A
  // web address only: nothing is asked of the disk, and `manual` (a path guess to confirm) is not set.
  const urlBefore = (y: number, depth = 0): boolean => {
    if (y <= 0 || depth > maxRows || !buffer.getLine(y) || buffer.getLine(y)?.isWrapped) return false;
    const a = describe(y - 1), b = describe(y);
    if (a.first !== b.first || a.last < cols - 3 || !LINK_ROW.test(b.text)) return false;
    return /https?:\/\/\S+$/.test(a.text) || (LINK_ROW.test(a.text) && urlBefore(y - 1, depth + 1));
  };
  const rowBefore = (y: number) => manualBefore(y) || urlBefore(y);
  const joinsBefore = (y: number) => !!buffer.getLine(y)?.isWrapped || rowBefore(y);

  let first = row, last = row;
  while (first > 0 && row - first < maxRows && joinsBefore(first)) first--;
  while (last + 1 < buffer.length && last - first < maxRows && joinsBefore(last + 1)) last++;
  const empty = { text: '', manual: false, range: (_start: number, _end: number): LinkRange | null => null };
  if (joinsBefore(first) || joinsBefore(last + 1)) return empty;
  const starts: LinkPoint[] = [], ends: LinkPoint[] = [];
  let text = '', manual = false;
  for (let y = first; y <= last; y++) {
    const line = buffer.getLine(y);
    if (!line) continue;
    const continuingManual = y > first && rowBefore(y);
    const followedManual = y < last && rowBefore(y + 1);
    manual ||= (y > first && manualBefore(y)) || (y < last && manualBefore(y + 1));
    const from = continuingManual ? describe(y).first : 0;
    const to = followedManual ? describe(y).last + 1 : Math.min(cols, line.length);
    for (let x = from; x < to; x++) {
      const cell = line.getCell(x);
      if (!cell || cell.getWidth() === 0) continue;
      const chars = cell.getChars();
      if (!chars && x === cols - 1 && y < last && buffer.getLine(y + 1)?.getCell(0)?.getWidth() === 2) continue;
      const value = chars || ' ';
      for (let i = 0; i < value.length; i++) {
        starts.push({ x: x + 1, y: y + 1 });
        ends.push({ x: Math.min(cols, x + Math.max(1, cell.getWidth())), y: y + 1 });
      }
      text += value;
    }
  }
  text = text.trimEnd();
  return {
    text, manual,
    range(start: number, end: number): LinkRange | null {
      return start >= 0 && end > start && end <= text.length ? { start: starts[start], end: ends[end - 1] } : null;
    }
  };
}

/** Failed manual guesses leave the original row intact, including a valid standalone filename. */
export async function confirmedTerminalLine(buffer: Buffer, row: number, cols: number, exists: (raw: string) => Promise<boolean>) {
  const candidate = terminalLogicalLine(buffer, row, cols, true);
  if (!candidate.manual) return candidate;
  try { if (await exists(candidate.text.trim())) return candidate; } catch { /* retain original reading */ }
  return terminalLogicalLine(buffer, row, cols);
}

export function rangesOverlap(a: LinkRange, b: LinkRange): boolean {
  const before = (x: LinkPoint, y: LinkPoint) => x.y < y.y || (x.y === y.y && x.x < y.x);
  return !before(a.end, b.start) && !before(b.end, a.start);
}

/** Let xterm's linkifier see modifier clicks, but do not also send those gestures
 * to a mouse-reporting TUI, which could repaint/move the target before mouseup.
 * Only mouse report frames are suppressed; typing, paste and terminal replies pass.
 */
export function createTerminalMouseLinkGate(defer: (run: () => void) => unknown = (run) => setTimeout(run, 0)) {
  let modified = false, generation = 0;
  return {
    observe(event: { metaKey: boolean; ctrlKey: boolean }): void {
      modified = event.metaKey || event.ctrlKey;
      const current = ++generation;
      // A task (not a microtask) resets after the full DOM event dispatch.
      defer(() => { if (generation === current) modified = false; });
    },
    forward(data: string): boolean {
      return !modified || !/^(?:\x1b\[<\d+;\d+;\d+[mM]|\x1b\[\d+;\d+;\d+M|\x1b\[M[\s\S]{3})$/.test(data);
    }
  };
}

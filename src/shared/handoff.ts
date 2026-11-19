/**
 * The handoff file (0.5.6): `<agent folder>/handoff.md`, where an agent keeps
 * the state of each piece of work it has open, so a cleared session can pick
 * the work up without reading its whole memory.md.
 *
 *   # Handoff: <agent name>
 *
 *   ## <work id> | <one line title>
 *   _touched: 2026-10-08T12:34:56Z_
 *   State: ...
 *   Next: ...
 *   Files: ...
 *   Open: ...
 *
 * The agent writes it. The app only trims it (handoffJob.ts): the newest 12
 * sections by their `_touched:` line stay, and at most 200,000 bytes; older
 * sections move word for word to the raw archive. Pure, so the job, the
 * prompt builder and a test share one definition.
 */
import { utf8Bytes } from './memoryShape';

export const HANDOFF_FILE = 'handoff.md';
/** At most this many sections stay in handoff.md. */
export const HANDOFF_MAX_SECTIONS = 12;
/** At most this many bytes: 50,000 tokens at 4 bytes a token. */
export const HANDOFF_MAX_BYTES = 200_000;

/** What a new agent's handoff.md holds. Read at every session start, so
 *  short: the shape of a section is in the agent's prompt and PROTOCOL.md. */
export function handoffSeed(name: string): string {
  return `# Handoff: ${name}\n\n_One section per piece of work. The app keeps the newest ${HANDOFF_MAX_SECTIONS}._\n`;
}

/** One `## <work id> | <title>` section. */
export interface HandoffSection {
  /** The heading text before the first `|`. The whole heading when it has none. */
  workId: string;
  title: string;
  /** The `_touched:` time in ms, or null when the section has no such line or
   *  the line holds no time. */
  touched: number | null;
  /** The section word for word, heading line first, trailing blank lines off. */
  text: string;
}

/** A section and the lines it covers: `start` is its heading, `end` is the
 *  next heading or the end of the file. */
interface Span extends HandoffSection { start: number; end: number }

/** `_touched: <time>_`. The underscores are optional, so a line an agent
 *  wrote without them still dates its section. */
const TOUCHED_LINE = /^_?touched:\s*(.*?)_?$/i;

function spansOf(lines: string[]): Span[] {
  const starts: number[] = [];
  lines.forEach((l, i) => { if (/^##\s/.test(l)) starts.push(i); });
  return starts.map((start, k) => {
    const end = k + 1 < starts.length ? starts[k + 1] : lines.length;
    const heading = lines[start].replace(/^##\s+/, '').trim();
    const bar = heading.indexOf('|');
    // The first line that holds a time counts.
    let touched: number | null = null;
    for (let i = start + 1; i < end && touched === null; i++) {
      const m = TOUCHED_LINE.exec(lines[i].trim());
      const t = m ? Date.parse(m[1].trim()) : NaN;
      if (!Number.isNaN(t)) touched = t;
    }
    return {
      workId: (bar < 0 ? heading : heading.slice(0, bar)).trim(),
      title: bar < 0 ? '' : heading.slice(bar + 1).trim(),
      touched,
      text: lines.slice(start, end).join('\n').replace(/\s+$/, ''),
      start,
      end
    };
  });
}

const plain = ({ workId, title, touched, text }: Span): HandoffSection => ({ workId, title, touched, text });

/** Oldest first. A section with no `_touched:` time is older than any that
 *  has one; among those, and among equal times, the earlier in the file is
 *  the older. */
function byAge(a: Span, b: Span): number {
  if (a.touched === null || b.touched === null) {
    if (a.touched !== b.touched) return a.touched === null ? -1 : 1;
    return a.start - b.start;
  }
  return a.touched - b.touched || a.start - b.start;
}

/** What one trim does to handoff.md. */
export interface HandoffTrim {
  /** handoff.md without the moved sections; every other byte as it was. */
  keep: string;
  /** The sections that leave, oldest first. Empty when the file is within
   *  both limits. */
  moved: HandoffSection[];
}

/**
 * Plan a trim. The sections past the newest `maxSections` leave; then the
 * oldest leave, one at a time, until the file is at or under `maxBytes`. The
 * newest section never leaves, even when it alone is over the cap. The text
 * before the first `## ` heading stays. The edit is on the lines themselves,
 * so the kept sections do not change by a byte or move.
 */
export function planHandoffTrim(
  text: string,
  opts: { maxSections?: number; maxBytes?: number } = {}
): HandoffTrim {
  const maxSections = Math.max(1, opts.maxSections ?? HANDOFF_MAX_SECTIONS);
  const maxBytes = opts.maxBytes ?? HANDOFF_MAX_BYTES;
  const lines = text.split('\n');
  const oldestFirst = spansOf(lines).sort(byAge);
  // A line costs its bytes and the newline that joins it to the next.
  const cost = (s: Span): number => lines.slice(s.start, s.end).reduce((n, l) => n + utf8Bytes(l) + 1, 0);
  let drop = Math.max(0, oldestFirst.length - maxSections);
  let bytes = utf8Bytes(text);
  for (let i = 0; i < drop; i++) bytes -= cost(oldestFirst[i]);
  while (bytes > maxBytes && drop < oldestFirst.length - 1) { bytes -= cost(oldestFirst[drop]); drop += 1; }
  if (drop === 0) return { keep: text, moved: [] };
  const gone = oldestFirst.slice(0, drop);
  const out = new Set<number>();
  for (const s of gone) for (let i = s.start; i < s.end; i++) out.add(i);
  return { keep: lines.filter((_, i) => !out.has(i)).join('\n'), moved: gone.map(plain) };
}

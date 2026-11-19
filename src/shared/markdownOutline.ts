/**
 * READING AND REVIEWING MARKDOWN (0.4.9 phase 8).
 *
 * The IDE could already RENDER markdown. Rendering is reading; reviewing is
 * moving through a document you did not write, knowing how long it is, where
 * its sections are, which one you are in, and jumping between them. A twelve
 * screen report with no outline is read by scrolling and hoping.
 *
 * This module is the document's structure, derived from the SOURCE rather than
 * from the rendered DOM, for one reason that matters: a heading in the source
 * has a LINE NUMBER, and the line number is what lets clicking an outline entry
 * put the editor's caret on that heading as well as scrolling the preview to
 * it. The DOM knows where a heading is on screen and nothing about where it is
 * in the file.
 *
 * No dependency. `react-markdown` and `remark-gfm` already ship in this app and
 * render the document; they do not hand back a heading list with line numbers,
 * and adding a plugin to extract one is more moving parts than reading the
 * lines. What IS load bearing is that this finds the same headings react-markdown
 * renders, so the two agree about order: fenced code and YAML front matter are
 * skipped here exactly as they are skipped there, and both ATX (`## Thing`) and
 * setext (`Thing` over `----`) headings count, because both render as headings.
 */

export interface OutlineEntry {
  /** 1 to 6. */
  level: number;
  /** Heading text with inline markup removed, ready to print in a list. */
  text: string;
  /** 1 based line of the heading in the source, for the editor's caret. */
  line: number;
  /** Position in document order, which is also the position of the matching
   *  element among the rendered headings. */
  index: number;
  /** Stable, unique, GitHub shaped slug. */
  id: string;
}

/** Strip the inline markup that would otherwise show up as punctuation in a
 *  sidebar: emphasis, code spans, links, images, and a trailing anchor. */
export function stripInlineMarkdown(input: string): string {
  let s = input;
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');      // image, keep the alt
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');        // link, keep the text
  s = s.replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1');       // reference link
  s = s.replace(/`+([^`]*)`+/g, '$1');                  // code span
  s = s.replace(/(\*\*\*|___)(.*?)\1/g, '$2');
  s = s.replace(/(\*\*|__)(.*?)\1/g, '$2');
  s = s.replace(/(\*|_)(.*?)\1/g, '$2');
  s = s.replace(/~~(.*?)~~/g, '$1');
  s = s.replace(/<[^>]*>/g, '');                        // literal html tags
  return s.replace(/\s+/g, ' ').trim();
}

/** GitHub shaped anchor slug. Duplicates get a numeric suffix, which is what
 *  makes the id usable as a React key. */
function slugify(text: string, used: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-') || 'section';
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
/** Lines that can never be the TEXT half of a setext heading. */
const NOT_PARAGRAPH = /^ {0,3}(?:[-*+][ \t]|\d+[.)][ \t]|>|#{1,6}[ \t]|={2,}[ \t]*$|-{2,}[ \t]*$|\|)/;

/**
 * Every heading in `source`, in document order.
 *
 * Front matter is skipped. That is not a nicety: a `---` fence on line one is
 * YAML to every markdown renderer in use, and to a naive line scanner the line
 * AFTER it looks like the text of a setext heading underlined by the closing
 * `---`, so a report with front matter would open with a phantom section
 * called `title: Weekly review`.
 */
export function markdownOutline(source: string): OutlineEntry[] {
  const text = typeof source === 'string' ? source : '';
  const lines = text.split('\n');
  const out: OutlineEntry[] = [];
  const used = new Map<string, number>();

  let i = 0;
  // YAML front matter, only when it opens on the very first line.
  if (/^---[ \t]*$/.test(lines[0] ?? '')) {
    let end = -1;
    for (let j = 1; j < lines.length; j++) {
      if (/^(---|\.\.\.)[ \t]*$/.test(lines[j])) { end = j; break; }
    }
    if (end > 0) i = end + 1;
  }

  let fence: string | null = null;
  for (; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code. Everything inside is text, including a line of hashes.
    const f = FENCE.exec(line);
    if (f) {
      if (fence === null) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;

    // An indented code block (four spaces) is also not a heading, and the ATX
    // pattern already refuses more than three leading spaces.

    // A heading quoted inside a blockquote still RENDERS as a heading, so it
    // counts here too, or the outline and the rendered document would disagree
    // about how many headings there are.
    const unquoted = line.replace(/^ {0,3}(?:>[ \t]?)+/, '');
    const atx = ATX.exec(unquoted);
    if (atx) {
      // A closing run of hashes is decoration: `## Thing ##`.
      const body = (atx[2] ?? '').replace(/[ \t]+#+[ \t]*$/, '');
      const clean = stripInlineMarkdown(body);
      out.push({ level: atx[1].length, text: clean, line: i + 1, index: out.length, id: slugify(clean, used) });
      continue;
    }

    // Setext: this line is the underline, the one above is the heading.
    const st = SETEXT.exec(line);
    if (st && i > 0) {
      const prev = lines[i - 1];
      if (prev.trim() && !NOT_PARAGRAPH.test(prev) && !FENCE.test(prev)) {
        const clean = stripInlineMarkdown(prev.trim());
        out.push({
          level: st[1][0] === '=' ? 1 : 2,
          text: clean,
          // The heading is the TEXT line, not the underline: that is where a
          // person editing it wants the caret.
          line: i,
          index: out.length,
          id: slugify(clean, used)
        });
      }
    }
  }
  return out;
}

/**
 * What a reviewer wants to know before they start: how long is this, how much
 * of it is code, and is there a checklist in it that is not finished.
 *
 * Reading time is at 220 words a minute, which is the low end of adult prose
 * reading, and is rounded UP to one minute so a short note never claims to take
 * zero. It is an estimate and the label says so.
 */
export interface MarkdownReview {
  words: number;
  headings: number;
  codeBlocks: number;
  tasksDone: number;
  tasksTotal: number;
  /** Whole minutes, never zero for a document with any words in it. */
  readingMinutes: number;
}

const WORDS_PER_MINUTE = 220;

export function markdownReview(source: string): MarkdownReview {
  const text = typeof source === 'string' ? source : '';
  const lines = text.split('\n');
  let fence: string | null = null;
  let codeBlocks = 0;
  let tasksDone = 0;
  let tasksTotal = 0;
  const prose: string[] = [];

  for (const line of lines) {
    const f = FENCE.exec(line);
    if (f) {
      if (fence === null) { fence = f[1][0]; codeBlocks++; }
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const task = /^ {0,8}[-*+][ \t]+\[([ xX])\][ \t]/.exec(line);
    if (task) {
      tasksTotal++;
      if (task[1] !== ' ') tasksDone++;
    }
    prose.push(line);
  }

  // Per line, BEFORE joining: heading hashes, list bullets and checkbox marks
  // are punctuation, and counting `[x]` as a word would inflate every document
  // with a checklist in it.
  const cleaned = prose
    .map((l) => l
      .replace(/^ {0,3}#{1,6}[ \t]*/, '')
      .replace(/^ {0,8}[-*+][ \t]+(?:\[[ xX]\][ \t]+)?/, '')
      .replace(/^ {0,8}\d+[.)][ \t]+/, ''))
    .join(' ');
  const words = stripInlineMarkdown(cleaned)
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

  return {
    words,
    headings: markdownOutline(text).length,
    codeBlocks,
    tasksDone,
    tasksTotal,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  };
}

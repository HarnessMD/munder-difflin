/**
 * WHY get_memory SAID "I DON'T KNOW" (0.5.2, card v052-voice-michael-memory-dead-ends).
 *
 * The tool was never missing. It handed the voice model the MemPalace CLI's
 * printout as one string and cut it at 1600 characters: a banner of equals
 * signs, then "[1] wing / room", "Source:", "Match: cosine=…", then the hit's
 * text, which on the founder's palace is often a slab of source code (two
 * wings hold 44 thousand drawers mined from code). Sixteen hundred characters
 * bought the banner and most of ONE hit. Nothing in that says what the team
 * knows, so the model said it did not know. The text fallback had the same
 * end: it matched the WHOLE spoken sentence as a substring of one line, so
 * "what did we decide about the relay deploy" never matched anything.
 *
 * This file is the fix, pure so test/voice-memory.test.cjs can drive it
 * (shared/memorySearch.ts is the memory GRAPH's search and is untouched):
 *   parseMempalaceSearch   the printout as hits (wing, room, source, scores, text)
 *   rankMemoryHits         notes before code, weak hits dropped, a few kept
 *   spokenMemoryHits       "Kevin's notes: …" per hit, under one budget
 *   keywordsOf / scoreLine the text fallback matches WORDS of the question
 */

export interface MemoryHit {
  n: number;
  wing: string;
  room: string;
  source: string;
  cosine: number;
  bm25: number;
  text: string;
}

/** Characters of memory the voice model gets per call. About 600 tokens:
 *  six hits at three hundred characters and their labels. The old 1600 held
 *  the banner and one hit; 2400 holds the answer. Tool results are fresh
 *  input each call (only the persona prefix is cached), so this is the one
 *  number that trades cost for an answer, and it is small beside the audio. */
export const MEMORY_RESULT_CHARS = 2400;
/** Hits kept after ranking, and characters of text quoted from each. */
export const MEMORY_HITS_MAX = 6;
export const MEMORY_HIT_CHARS = 320;
/** Below this cosine a hit is noise, unless nothing better came back. */
export const MEMORY_MIN_COSINE = 0.3;

const HEAD = /^\s*\[(\d+)\]\s+(.+?)\s+\/\s+(.+?)\s*$/;
const RULE = /^\s*[─-]{5,}\s*$/;
const BANNER = /^\s*={5,}\s*$/;

/** The CLI's printout as hits. Tolerant: an unknown line inside a hit is
 *  text; a printout with no "[n] wing / room" head gives []. */
export function parseMempalaceSearch(output: string): MemoryHit[] {
  const hits: MemoryHit[] = [];
  let cur: MemoryHit | null = null;
  let text: string[] = [];
  const close = (): void => {
    if (cur) { cur.text = text.join(' ').replace(/\s+/g, ' ').trim(); hits.push(cur); }
    cur = null; text = [];
  };
  for (const raw of (output || '').split(/\r?\n/)) {
    const head = HEAD.exec(raw);
    if (head) { close(); cur = { n: Number(head[1]), wing: head[2].trim(), room: head[3].trim(), source: '', cosine: 0, bm25: 0, text: '' }; continue; }
    if (!cur) continue;
    if (RULE.test(raw) || BANNER.test(raw)) { close(); continue; }
    const src = /^\s*Source:\s*(.+?)\s*$/.exec(raw);
    if (src && !cur.source) { cur.source = src[1]; continue; }
    const match = /^\s*Match:\s*(.*)$/.exec(raw);
    if (match && cur.cosine === 0 && cur.bm25 === 0 && !text.length) {
      const c = /cosine=([0-9.]+)/.exec(match[1]); const b = /bm25=([0-9.]+)/.exec(match[1]);
      cur.cosine = c ? Number(c[1]) : 0; cur.bm25 = b ? Number(b[1]) : 0;
      continue;
    }
    if (raw.trim()) text.push(raw.trim());
  }
  close();
  return hits;
}

/** Whether the CLI answered at all, as opposed to a printout this file does
 *  not understand. The tool falls back to the raw text only for the latter. */
export function looksLikeMempalaceSearch(output: string): boolean {
  return /Results for:/.test(output || '');
}

/** A note (memory.md, or any markdown) outranks a source file at the same
 *  score: the founder's question is what the team KNOWS, and the notes are
 *  where that is written. */
export function isNoteSource(source: string): boolean {
  return /(^|\/)memory\.md$/i.test(source) || /\.md$/i.test(source);
}

export function rankMemoryHits(hits: readonly MemoryHit[], max = MEMORY_HITS_MAX): MemoryHit[] {
  const withText = hits.filter((h) => h.text);
  if (!withText.length) return [];
  const best = Math.max(...withText.map((h) => h.cosine));
  // Drop the noise only when something better came back; a palace that
  // answers weakly everywhere still answers.
  const kept = best >= MEMORY_MIN_COSINE + 0.05 ? withText.filter((h) => h.cosine >= MEMORY_MIN_COSINE) : withText;
  const score = (h: MemoryHit): number => h.cosine + (isNoteSource(h.source) ? 0.15 : 0) + Math.min(h.bm25, 3) / 30;
  return [...kept].sort((a, b) => score(b) - score(a) || a.n - b.n).slice(0, Math.max(1, max));
}

/** The wing's name as spoken: "kevin-mt6kt4po" is Kevin, "god" is the
 *  orchestrator, anything else is itself. */
export function speakerOf(wing: string): string {
  const w = (wing || '').trim();
  if (!w) return 'someone';
  if (w === 'god') return 'the orchestrator';
  const bare = w.replace(/-[a-z0-9]{6,}$/i, '');
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/** Hits as one spoken paragraph under the budget: the newest-ranked first,
 *  each cut to MEMORY_HIT_CHARS, later hits dropped rather than the whole
 *  truncated mid-word. */
export function spokenMemoryHits(hits: readonly MemoryHit[], maxChars = MEMORY_RESULT_CHARS): string {
  const parts: string[] = [];
  let used = 0;
  for (const h of hits) {
    const who = speakerOf(h.wing);
    const base = h.source.replace(/^.*\//, '');
    const label = isNoteSource(h.source) ? `${who}'s notes` : `${who}'s file ${base}`;
    const body = h.text.length > MEMORY_HIT_CHARS ? `${h.text.slice(0, MEMORY_HIT_CHARS - 1).trimEnd()}…` : h.text;
    const line = `${label}: ${body}`;
    if (parts.length && used + line.length + 1 > maxChars) break;
    parts.push(parts.length ? line : (line.length > maxChars ? `${line.slice(0, maxChars - 1)}…` : line));
    used += line.length + 1;
  }
  return parts.join(' ');
}

const STOP = new Set(('the a an and or of to in on at for with about what who when where why how did do does is are was were be been ' +
  'we you i it that this they them our us me my your have has had tell say said know remember decide decided note noted learn learned ' +
  'team memory please any some there here from by as into up out over just so then than also which whom whose will would could should can ' +
  'let get got one thing things something anything everything').split(' '));

/** The words of a spoken question worth matching: lower case, three letters
 *  or more, no stop words, first eight, in order. */
export function keywordsOf(query: string): string[] {
  const out: string[] = [];
  for (const w of (query || '').toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 3 || STOP.has(w) || out.includes(w)) continue;
    out.push(w);
    if (out.length >= 8) break;
  }
  return out;
}

/** How many distinct keywords a line carries. */
export function scoreLine(line: string, keywords: readonly string[]): number {
  const l = (line || '').toLowerCase();
  let n = 0;
  for (const k of keywords) if (l.includes(k)) n++;
  return n;
}

/** The words a line must carry to count: half of them, at least one. */
export function keywordThreshold(keywords: readonly string[]): number {
  return Math.max(1, Math.ceil(keywords.length / 2));
}

/** A window of the line around its first keyword, for the excerpt. */
export function excerptAround(line: string, keywords: readonly string[], width = 220): string {
  const l = line.trim();
  if (l.length <= width) return l;
  const lower = l.toLowerCase();
  let at = -1;
  for (const k of keywords) { const i = lower.indexOf(k); if (i !== -1 && (at === -1 || i < at)) at = i; }
  const start = Math.max(0, Math.min(at === -1 ? 0 : at - Math.floor(width / 3), l.length - width));
  return `${start ? '…' : ''}${l.slice(start, start + width).trim()}${start + width < l.length ? '…' : ''}`;
}

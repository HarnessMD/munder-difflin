/**
 * The shape of an agent's memory.md, and its two archive files. No imports, so
 * the prompt builder (hive.ts) and the memory job (reflect.ts) share one
 * definition and a test loads it as is.
 *
 * memory.md regions, top to bottom (0.5.6: a plain job in the app keeps them,
 * no model reads or rewrites a line):
 *   ## 📏 Rules (never moved)          what the agent must always or never do
 *   ## 📌 Durable facts (pinned ...)    pinned notes, capped; the oldest (top)
 *                                      lines move to the raw archive
 *   ## Recent                          the newest sections, word for word: up to
 *                                      12 and 40 KB, never fewer than 3. Older
 *                                      sections move to the raw archive, and so
 *                                      do the oldest lines of one section that
 *                                      is over 40 KB alone
 *
 * Until 0.5.6 a third region, `## 🗜 Condensed history`, held a summary a model
 * wrote. The job moves it to the raw archive once, word for word, and it is gone.
 *
 * Beside it, in the agent's folder, never read at task start:
 *   memory-archive.md          the index: one line per batch that moved (its
 *                              dates, what moved, the raw file), capped
 *   memory-archive-raw.md      everything that moved, word for word, add only,
 *   memory-archive-raw-2.md    written in parts so MemPalace keeps indexing them
 *   ...                        (its miner skips a file over 500 chunks, ~350 KB)
 *
 * NAMED PER SIDE in a hive an earlier build synced (it has a `sync.git`):
 *   memory-archive-laptop.md, memory-archive-raw-laptop-1.md, -2 ... so an
 *   agent keeps adding to the archive it already has. Otherwise
 *   (`setArchiveSide` never called) the names are the ones above, and files
 *   of the older names stay where they are.
 */

export const RULES_HEADING = '## 📏 Rules (never moved)';
/** Any `## ` heading starting with this is the Rules region. */
export const RULES_HEADING_PREFIX = '## 📏';

/** The Rules region's limit (the founder's ruling). Over it nothing moves (nothing in Rules ever
 *  does); the agent is told at its next start to trim the list. */
export const RULES_CAP_BYTES = 16 * 1024;
/** The pinned notes' limit. Over it the oldest lines move to the archive. */
export const PINNED_NOTES_CAP_BYTES = 48 * 1024;
/** The index's limit (memory-archive.md). Past it the oldest index lines move
 *  to the raw archive, until the index is back under ARCHIVE_DRAIN_TO_BYTES. */
export const ARCHIVE_CAP_BYTES = 32 * 1024;
export const ARCHIVE_DRAIN_TO_BYTES = 16 * 1024;
/** At most this much moves in one batch (one index line). The pinned notes
 *  move one batch a tick, so a large block catches up over several ticks. */
export const MOVE_STEP_BYTES = 32 * 1024;
/** A batch of whole sections closes at this many, so its index line can name
 *  every heading. */
export const BATCH_SECTIONS_MAX = 12;
/** A raw archive part is closed once the next batch would take it past this.
 *  Well under MemPalace's 500 chunk skip (800 chars each, 100 overlap). */
export const RAW_PART_BYTES = 256 * 1024;
/** The newest sections the job keeps word for word: up to the section count
 *  setting (12) AND up to this much together, newest first (the founder's
 *  ruling, plan 3.12). Older ones move word for word to the raw archive. */
export const KEPT_SECTIONS_CAP_BYTES = 40 * 1024;
/** ...but never fewer than this many, whatever their size (the founder's
 *  ruling). */
export const KEPT_SECTIONS_MIN = 3;
/** One kept section over KEPT_SECTIONS_CAP_BYTES alone loses its oldest lines
 *  until it is under this (0.5.6). Half the cap, so each trim moves a real
 *  batch and not a few lines every tick. */
export const SECTION_TRIM_TO_BYTES = 20 * 1024;
/** A memory notice (the spawn prompt line, or its log line) at most once per
 *  agent per this window. */
export const MEMORY_NOTICE_WINDOW_MS = 86_400_000;

/** Any `## ` heading starting with this is the pinned notes. */
export const PINNED_HEADING_PREFIX = '## 📌';
/** What the old condenser wrote into an empty pinned block. Not a note. */
export const PINNED_PLACEHOLDER = '_(none yet)_';
/** Any `## ` heading starting with this is the summary region a model wrote
 *  until 0.5.6. The job moves it to the raw archive once. */
export const CONDENSED_HEADING_PREFIX = '## 🗜';

export const ARCHIVE_FILE = 'memory-archive.md';
export const RAW_ARCHIVE_BASE = 'memory-archive-raw';

/** The first line of memory-archive.md once it is the index. A file without
 *  it is a summary a model wrote before 0.5.6. */
export const ARCHIVE_INDEX_HEADING = '# Memory archive index';
/** The line under the heading: how to read an index line. */
export const ARCHIVE_INDEX_NOTE = '_One line for each batch the app moved out of memory.md, oldest first: its dates | what moved | the raw file that holds it word for word | the batch id to search that file for._';

/** Is this text of memory-archive.md the index (and not an old summary)? */
export function isArchiveIndex(text: string): boolean {
  return text.startsWith(ARCHIVE_INDEX_HEADING);
}

/** One index line. `what` is one line with no `|` in it. */
export function archiveIndexLine(dates: string, what: string, rawFile: string, sha: string): string {
  return `- ${dates} | ${what} | ${rawFile} | batch ${sha}`;
}

/** The dates part of an index line: the one date, or the first and last, that
 *  the moved text carries; with none, the day of the move. */
export function indexDates(dates: string[], isoTime: string): string {
  if (dates.length === 0) return `moved ${isoTime.slice(0, 10)}`;
  const sorted = [...dates].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return first === last ? first : `${first} to ${last}`;
}

/** Which office this is, for the archive names: set at start (src/core/archiveSide.ts). Null: the older names. */
export type ArchiveSide = 'laptop' | 'cloud';
let archiveSide: ArchiveSide | null = null;
export function setArchiveSide(side: ArchiveSide | null): void {
  archiveSide = side;
}

/** The index file's name: memory-archive.md, or memory-archive-laptop.md once the office syncs. */
export function archiveFileName(side: ArchiveSide | null = archiveSide): string {
  return side ? `memory-archive-${side}.md` : ARCHIVE_FILE;
}

/** File name of raw part `n` (1 based): memory-archive-raw.md, then -2, -3; per office memory-archive-raw-laptop-1.md, -2. */
export function rawPartName(n: number, side: ArchiveSide | null = archiveSide): string {
  if (side) return `${RAW_ARCHIVE_BASE}-${side}-${Math.max(1, n)}.md`;
  return n <= 1 ? `${RAW_ARCHIVE_BASE}.md` : `${RAW_ARCHIVE_BASE}-${n}.md`;
}

/** The part number of a raw archive file name of this office's naming, or null for any other file. */
export function rawPartNumber(name: string, side: ArchiveSide | null = archiveSide): number | null {
  if (side) {
    const s = new RegExp(`^memory-archive-raw-${side}-(\\d+)\\.md$`).exec(name);
    const n = s ? Number(s[1]) : 0;
    return n >= 1 ? n : null;
  }
  if (name === `${RAW_ARCHIVE_BASE}.md`) return 1;
  const m = /^memory-archive-raw-(\d+)\.md$/.exec(name);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 2 ? n : null;
}

/** The body under the Rules heading (every one, merged), or null when the
 *  file has none. */
export function rulesBodyOf(text: string): string | null {
  return regionBodyOf(text, RULES_HEADING_PREFIX);
}

/** Two bodies of the same region, in file order, as one (a file can carry a
 *  region's heading twice; every line under each counts). Shared with the
 *  job's parseMemory so the two always agree. */
export function mergeBodies(a: string | null, b: string): string {
  if (a === null || !a.trim()) return b;
  if (!b.trim()) return a;
  return `${a}\n${b}`;
}

/** The body under every `## ` heading that starts with `prefix`, merged in
 *  file order, or null when there is no such heading. */
function regionBodyOf(text: string, prefix: string): string | null {
  let body: string | null = null;
  let cur: string[] | null = null;
  const close = () => { if (cur) body = mergeBodies(body, cur.join('\n').replace(/\s+$/, '')); cur = null; };
  for (const l of text.split('\n')) {
    if (/^##\s/.test(l)) { close(); if (l.trim().startsWith(prefix)) cur = []; }
    // Blank lines before a body's first text are not part of it (as parseMemory).
    else if (cur && (cur.length > 0 || l !== '')) cur.push(l);
  }
  close();
  return body;
}

/** UTF-8 size of the pinned notes: their non-empty trimmed lines, one per line,
 *  as the move step measures them (0 when there are none). */
export function pinnedNotesBytesOf(text: string): number {
  const body = regionBodyOf(text, PINNED_HEADING_PREFIX);
  if (!body) return 0;
  return utf8Bytes(body.split('\n').map((l) => l.trim()).filter((l) => l && l !== PINNED_PLACEHOLDER).join('\n'));
}

/** The pinned notes are over their cap and the file has no Rules heading, so
 *  nothing moves until the agent sorts its rules out of them (ruling 3.11). */
export function pinnedNeedsSort(text: string): boolean {
  return rulesBodyOf(text) === null && pinnedNotesBytesOf(text) > PINNED_NOTES_CAP_BYTES;
}

/** Is a once-a-window notice due, given when it was last given? */
export function noticeDue(last: number | undefined, now: number, windowMs = MEMORY_NOTICE_WINDOW_MS): boolean {
  return last === undefined || now - last >= windowMs;
}

/** UTF-8 size of the Rules body (0 when there is none). */
export function rulesBytesOf(text: string): number {
  const body = rulesBodyOf(text);
  return body ? utf8Bytes(body) : 0;
}

export function rulesOverLimit(text: string): boolean {
  return rulesBytesOf(text) > RULES_CAP_BYTES;
}

/** UTF-8 byte length without Buffer, so the renderer could load this too. */
export function utf8Bytes(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

/**
 * The PRO Memory screen's topic model (phase 4 of 0.4.9, decision D5).
 *
 * WHAT WENT WRONG BEFORE. The old screen listed "shared topics" pulled from
 * every `## ` heading in every memory.md. The janitor (src/main/reflect.ts)
 * writes the same three region headings into every agent's file, so the list
 * filled with "Durable facts (pinned — never condensed)" and "Condensed
 * history": storage regions, not things anyone remembers.
 *
 * WHAT THIS DOES. A memory.md is read as the three regions reflect.ts
 * maintains, and each region yields NOTES of one KIND:
 *
 *   pinned       one note per line of the pinned block   (a durable fact)
 *   summaries    one note per paragraph of the condensed block
 *   recent       one note per dated `## ` section, verbatim
 *
 * The fourth kind, deliverables, is not in memory.md at all: hive.ts calls
 * the hive root's `shared/` and `research/` folders "research deliverables",
 * and the files there are what agents produced for each other. The screen
 * lists those folders (fs:listDir) and folds them in here.
 *
 * A TOPIC is the merge of notes with the same kind and the same normalised
 * label across agents, so "Known by" is real: two agents whose pinned block
 * carries the same fact share one topic. Nothing here touches the DOM, so
 * test/pro-049-memory.test.cjs loads it directly.
 */

export type MemoryKind = 'pinned' | 'summaries' | 'recent' | 'deliverables';
export const MEMORY_KINDS: readonly MemoryKind[] = ['pinned', 'summaries', 'recent', 'deliverables'];

/** The raw region a kind maps to, as the file (or the folder) spells it. The
 *  technical rendering shows this in a tooltip; the simple rendering never
 *  shows it. The two headings are reflect.ts's own, quoted as written. */
export const WING_OF: Record<MemoryKind, string> = {
  pinned: '## 📌 Durable facts (pinned — never condensed)',
  summaries: '## 🗜 Condensed history',
  recent: '## Recent',
  deliverables: 'hive/shared, hive/research'
};

/** The two folders under the hive root whose files count as deliverables. */
export const DELIVERABLE_DIRS: readonly string[] = ['shared', 'research'];

export interface MemoryNote {
  agentId: string;
  kind: Exclude<MemoryKind, 'deliverables'>;
  label: string;
  /** A short, markup-free excerpt for the list and the panel. */
  text: string;
  /** The verbatim markdown the note came from, for the note sheet. */
  body: string;
  /** 1-based line in memory.md where the note starts. */
  line: number;
  /** YYYY-MM-DD when the heading carried one (recent notes). */
  date?: string;
}

export interface DeliverableFile {
  /** Path relative to the hive root, forward slashes: `shared/design/x.html`. */
  rel: string;
  name: string;
  size: number;
  mtime: number;
}

export interface MemoryTopic {
  id: string;
  kind: MemoryKind;
  label: string;
  text: string;
  agentIds: string[];
  /** How many agents hold it. */
  weight: number;
  /** Newest date among the notes, or the file's mtime as YYYY-MM-DD. */
  date?: string;
  notes: MemoryNote[];
  file?: DeliverableFile;
}

/* ───────────────────────────── text helpers ───────────────────────────── */

const DATE_PREFIX = /^\s*(\d{4}-\d{2}-\d{2})\s*(?:~?\d{1,2}:\d{2}\s*[A-Za-z]{0,4})?\s*(?:\([^)]*\))?\s*[—–\-:·]*\s*/;

/** `2026-09-01 10:29Z — hourly clean` → { date, rest: 'hourly clean' }. */
export function splitDate(heading: string): { date?: string; rest: string } {
  const m = heading.match(DATE_PREFIX);
  if (!m) return { rest: heading.trim() };
  return { date: m[1], rest: heading.slice(m[0].length).trim() || heading.trim() };
}

/** Markdown to plain words: no bullets, no emphasis, no code ticks, one space. */
export function clean(s: string): string {
  return s
    .replace(/^\s*(?:[-*+•]|\d+[.)])\s+/, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalise(s: string): string {
  return clean(s).toLowerCase().replace(/[#:.,;!?"'“”‘’()]+/g, '').replace(/\s+/g, ' ').trim();
}

/** A bold lead (`**Role & Outputs:** …`) is the label a writer chose. */
function boldLead(s: string): string | null {
  const m = s.trim().match(/^(?:[-*+•]\s+)?\*\*([^*]{3,80}?)\*\*\s*[:：]?/);
  return m ? m[1].replace(/[:：]\s*$/, '').trim() : null;
}

/** The first sentence, or the first 60 characters at a word boundary. */
export function sentenceLabel(s: string, max = 60): string {
  const plain = clean(s);
  const m = plain.match(/^(.+?)(?:[.;!?]\s|\s[—–]\s|$)/);
  let head = (m ? m[1] : plain).trim();
  if (head.length < 3) head = plain;
  if (head.length <= max) return head;
  const cut = head.slice(0, max).replace(/\s+\S*$/, '');
  return (cut.length >= 12 ? cut : head.slice(0, max)) + '…';
}

function excerpt(s: string, max = 240): string {
  const plain = clean(s.replace(/\n+/g, ' '));
  return plain.length > max ? plain.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : plain;
}

/* ───────────────────────────── the parser ─────────────────────────────── */

interface Section { heading: string; line: number; body: string[] }

function sectionsOf(text: string): { preamble: string[]; sections: Section[] } {
  const lines = text.split('\n');
  const sections: Section[] = [];
  const preamble: string[] = [];
  let cur: Section | null = null;
  lines.forEach((l, i) => {
    if (/^##\s/.test(l)) { cur = { heading: l.replace(/^##\s+/, '').trim(), line: i + 1, body: [] }; sections.push(cur); }
    else if (cur) cur.body.push(l);
    else preamble.push(l);
  });
  return { preamble, sections };
}

const isPinned = (h: string) => /^📌/.test(h) || /durable facts/i.test(h);
const isSummary = (h: string) => /^🗜/.test(h) || /condensed history/i.test(h);
const isRecentMarker = (h: string) => /^recent$/i.test(h);

function paragraphs(body: string[], firstLine: number): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  let buf: string[] = [];
  let start = 0;
  body.forEach((l, i) => {
    if (l.trim() === '') {
      if (buf.length) { out.push({ text: buf.join('\n'), line: firstLine + start }); buf = []; }
      return;
    }
    if (!buf.length) start = i;
    buf.push(l);
  });
  if (buf.length) out.push({ text: buf.join('\n'), line: firstLine + start });
  return out;
}

/** Every note in one agent's memory.md, in file order. */
export function parseMemoryNotes(agentId: string, text: string): MemoryNote[] {
  const out: MemoryNote[] = [];
  if (!text || !text.trim()) return out;
  const { preamble, sections } = sectionsOf(text);

  if (sections.length === 0) {
    // A file with no `## ` at all: whatever follows the seed header is one
    // recent note, so a fresh agent's first paragraph is not invisible.
    const rest = preamble.filter((l) => !/^#\s/.test(l) && !/^_.*_$/.test(l.trim()) && l.trim());
    if (rest.length) out.push({ agentId, kind: 'recent', label: sentenceLabel(rest[0]), text: excerpt(rest.join(' ')), body: rest.join('\n'), line: 1 });
    return out;
  }

  for (const s of sections) {
    if (isPinned(s.heading)) {
      s.body.forEach((l, i) => {
        if (!l.trim() || /^#/.test(l)) return;
        out.push({ agentId, kind: 'pinned', label: boldLead(l) ?? sentenceLabel(l), text: excerpt(l), body: l, line: s.line + 1 + i });
      });
    } else if (isSummary(s.heading)) {
      for (const p of paragraphs(s.body, s.line + 1)) {
        out.push({ agentId, kind: 'summaries', label: boldLead(p.text) ?? sentenceLabel(p.text), text: excerpt(p.text, 300), body: p.text, line: p.line });
      }
    } else if (isRecentMarker(s.heading) && s.body.every((l) => !l.trim())) {
      continue; // the marker heading the janitor keeps above the verbatim tail
    } else {
      const { date, rest } = splitDate(s.heading);
      const bodyText = s.body.join('\n').trim();
      out.push({ agentId, kind: 'recent', label: sentenceLabel(rest, 72), text: excerpt(bodyText || rest), body: `## ${s.heading}\n${bodyText}`, line: s.line, date });
    }
  }
  return out;
}

/* ───────────────────────────── topics ─────────────────────────────────── */

const KIND_ORDER: Record<MemoryKind, number> = { pinned: 0, summaries: 1, recent: 2, deliverables: 3 };

function dayOf(ms: number): string | undefined {
  if (!ms) return undefined;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/**
 * Merge every agent's notes (and the deliverable files) into topics. Shared
 * first, then newest, then by kind and label, so the top of the list is what
 * the team agrees on and what just happened.
 */
export function buildTopics(memories: Record<string, string>, files: DeliverableFile[] = []): MemoryTopic[] {
  const acc = new Map<string, MemoryTopic>();
  for (const [agentId, text] of Object.entries(memories)) {
    for (const n of parseMemoryNotes(agentId, text)) {
      const norm = normalise(n.label);
      if (norm.length < 3) continue;
      const key = `${n.kind}|${norm}`;
      const t = acc.get(key);
      if (t) {
        if (!t.agentIds.includes(agentId)) t.agentIds.push(agentId);
        t.notes.push(n);
        if (n.date && (!t.date || n.date > t.date)) t.date = n.date;
      } else {
        acc.set(key, { id: `topic:${n.kind}:${norm}`, kind: n.kind, label: n.label, text: n.text, agentIds: [agentId], weight: 1, date: n.date, notes: [n] });
      }
    }
  }
  // A deliverable is held by every agent whose notes name the file.
  const lowered = Object.entries(memories).map(([id, t]) => [id, (t || '').toLowerCase()] as const);
  for (const f of files) {
    const needle = f.name.toLowerCase();
    const agentIds = needle.length >= 4 ? lowered.filter(([, t]) => t.includes(needle)).map(([id]) => id) : [];
    acc.set(`deliverables|${f.rel}`, { id: `topic:deliverables:${f.rel}`, kind: 'deliverables', label: f.name, text: f.rel, agentIds, weight: agentIds.length, date: dayOf(f.mtime), notes: [], file: f });
  }
  const all = [...acc.values()];
  for (const t of all) t.weight = t.agentIds.length;
  all.sort((a, b) =>
    b.weight - a.weight
    || (b.date ?? '').localeCompare(a.date ?? '')
    || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
    || a.label.localeCompare(b.label));
  return all;
}

export interface TopicFilter { kind: MemoryKind | 'all'; whose: string | null; q: string }

export function filterTopics(topics: MemoryTopic[], f: TopicFilter): MemoryTopic[] {
  const q = f.q.trim().toLowerCase();
  return topics.filter((t) =>
    (f.kind === 'all' || t.kind === f.kind)
    && (!f.whose || t.agentIds.includes(f.whose))
    && (!q || t.label.toLowerCase().includes(q) || t.text.toLowerCase().includes(q)));
}

/** How many topics the graph draws (MEMORY_GRAPH_SPEC's cap, unchanged). */
export const GRAPH_TOPIC_CAP = 24;

/** The absolute path of an agent's memory.md, given the harness home. */
export function memoryPathOf(home: string, agentId: string): string {
  return `${home.replace(/[\\/]+$/, '')}/hive/agents/${agentId}/memory.md`;
}

/** The absolute path of a deliverable, given the harness home. */
export function deliverablePathOf(home: string, rel: string): string {
  return `${home.replace(/[\\/]+$/, '')}/hive/${rel}`;
}

/** Fold two levels of `fs:listDir` output into deliverable files, newest first. */
export function foldDeliverables(entries: { dir: string; entries: { name: string; isDir: boolean; size: number; mtime: number }[] }[], cap = 300): DeliverableFile[] {
  const files: DeliverableFile[] = [];
  for (const { dir, entries: list } of entries) {
    for (const e of list) {
      if (e.isDir || e.name.startsWith('.')) continue;
      files.push({ rel: `${dir}/${e.name}`, name: e.name, size: e.size, mtime: e.mtime });
    }
  }
  files.sort((a, b) => b.mtime - a.mtime || a.rel.localeCompare(b.rel));
  return files.slice(0, cap);
}

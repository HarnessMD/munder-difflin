/**
 * What an agent knew before the app cleared it (0.5.6).
 *
 * A clear on a switch of work, for a Codex file too large, or on the
 * orchestrator's ask (askedClear.ts) asks the agent to hand off first. Its
 * handoff.md is what it chose to write. This file keeps the rest within reach:
 * the latest summary of the conversation that was cleared, copied word for
 * word from its transcript, and the transcript's path. Main writes it to
 * last-session.md in the agent's folder when the clear is typed, and the first
 * wake after the clear says where it is (switchClear.clearedLead).
 *
 * WHERE THE SUMMARY IS. Claude Code writes each compaction's summary into the
 * transcript as a message marked `isCompactSummary`. Codex writes a record of
 * type `compacted` whose `message` is the summary when Codex wrote it itself,
 * and empty when OpenAI's servers did the compaction: that summary is kept in
 * a form only Codex reads, so the file says so and points at the transcript.
 * A session that was never compacted has no summary at all.
 *
 * No electron import, no fs import: main reads the lines and writes the file.
 */
import type { HandoffReason } from './switchClear';

export const LAST_SESSION_FILE = 'last-session.md';

/** How many earlier transcripts the file keeps a path to. */
export const EARLIER_KEPT = 10;

/** The longest summary the file holds, in characters. */
export const SUMMARY_MAX_CHARS = 512 * 1024;

/** What one transcript line says, when it is a summary. `text` is empty for a
 *  Codex compaction OpenAI's servers did. */
export interface FoundSummary {
  engine: 'claude' | 'codex';
  text: string;
}

/** Cheap test before a parse: only these lines can hold a summary. */
export function mayHoldSummary(line: string): boolean {
  return line.includes('"isCompactSummary"') || line.includes('"compacted"');
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (p && typeof p === 'object' && typeof (p as { text?: unknown }).text === 'string' ? (p as { text: string }).text : ''))
      .join('');
  }
  return '';
}

/** The summary one transcript line holds, or null. Never throws. */
export function summaryFromLine(line: string): FoundSummary | null {
  if (!mayHoldSummary(line)) return null;
  let o: unknown;
  try { o = JSON.parse(line); } catch { return null; }
  if (!o || typeof o !== 'object') return null;
  const rec = o as { isCompactSummary?: unknown; message?: { content?: unknown }; type?: unknown; payload?: { message?: unknown } };
  if (rec.isCompactSummary === true) return { engine: 'claude', text: textOf(rec.message?.content) };
  if (rec.type === 'compacted' && rec.payload && typeof rec.payload === 'object') {
    return { engine: 'codex', text: typeof rec.payload.message === 'string' ? rec.payload.message : '' };
  }
  return null;
}

/** Feed lines oldest first; keeps the latest summary seen. */
export class SummaryScan {
  latest: FoundSummary | null = null;
  line(line: string): void {
    const found = summaryFromLine(line);
    if (found) this.latest = found;
  }
}

/** The transcript paths an older last-session.md names, newest first. */
export function earlierTranscripts(existing: string): string[] {
  const out: string[] = [];
  // Only the head of the file: the summary below it is copied text.
  const head = existing.split('\n## Summary')[0] ?? '';
  let inEarlier = false;
  for (const raw of head.split('\n')) {
    const l = raw.trim();
    const full = /^- Full conversation: (.+)$/.exec(l);
    if (full) { out.push(full[1].trim()); continue; }
    if (l.startsWith('## ')) { inEarlier = l === '## Earlier sessions'; continue; }
    if (inEarlier && l.startsWith('- ')) out.push(l.slice(2).trim());
  }
  return out.filter((p, i) => p && out.indexOf(p) === i);
}

const REASONS: Record<HandoffReason, string> = {
  switch: 'your next work was different',
  size: 'your conversation file was too large',
  asked: 'the orchestrator asked for it'
};

export interface LastSessionFacts {
  clearedAt: string;
  reason: HandoffReason;
  /** The work the agent was on, when known. */
  work?: string;
  /** The transcript of the session that was cleared, when the hooks named it. */
  transcriptPath?: string;
  /** The latest summary in that transcript, or null for none. */
  summary: FoundSummary | null;
  /** Earlier transcript paths, newest first (earlierTranscripts). */
  earlier: string[];
}

/** The whole of last-session.md. */
export function lastSessionText(f: LastSessionFacts): string {
  const work = f.work && f.work.trim() ? `"${f.work.trim().replace(/\s+/g, ' ').slice(0, 128)}"` : 'none named';
  const earlier = f.earlier.filter((p, i) => p && p !== f.transcriptPath && f.earlier.indexOf(p) === i).slice(0, EARLIER_KEPT);
  const lines = [
    '# Last session before the clear',
    '',
    `_Cleared ${f.clearedAt} because ${REASONS[f.reason]}. Work: ${work}._`,
    '',
    f.transcriptPath
      ? `- Full conversation: ${f.transcriptPath}`
      : '- Full conversation: the app was not told where this session was kept.',
    '  Search it for a phrase when you need exact words. It can be very large: never read it whole.',
    '- To reopen it, type /resume in your terminal.',
    ''
  ];
  if (earlier.length) lines.push('## Earlier sessions', '', ...earlier.map((p) => `- ${p}`), '');
  lines.push('## Summary', '');
  if (!f.summary) {
    lines.push('This session was never compacted, so there is no summary. Your handoff.md has what you wrote before the clear.');
  } else if (!f.summary.text.trim()) {
    lines.push('Codex kept this session\'s summary in a form only Codex can read. Your handoff.md has what you wrote before the clear; search the full conversation above for more.');
  } else {
    const text = f.summary.text.trim();
    lines.push(text.length > SUMMARY_MAX_CHARS ? `${text.slice(0, SUMMARY_MAX_CHARS)}\n\n(The summary was longer; the rest is in the full conversation above.)` : text);
  }
  return `${lines.join('\n')}\n`;
}

/** The outcomes of the submit door (providerAutomation SubmitOutcome). */
type Outcome = 'submitted' | 'unconfirmed' | 'stuck' | 'held' | 'gone';

export interface PendingSave {
  reason: HandoffReason;
  work?: string;
  transcriptPath?: string;
}

/**
 * Which clear is the app's own, and which transcript it cleared. The path is
 * taken when the hand off request is typed: the hand off turn still runs in
 * the session about to be cleared, and once the clear lands the hooks name the
 * new one. A clear with no hand off before it (a person's own /clear) saves
 * nothing, and a wake typed after a hand off means its clear was dropped.
 */
export class ClearHistory {
  private pending = new Map<string, PendingSave>();

  noteTyped(
    agentId: string | undefined,
    kind: 'wake' | 'handoff' | 'clear' | 'other',
    outcome: Outcome,
    pressOnly: boolean,
    facts: () => PendingSave | null
  ): PendingSave | null {
    if (!agentId || pressOnly || outcome === 'held' || outcome === 'gone') return null;
    if (kind === 'handoff') {
      const f = facts();
      if (f) this.pending.set(agentId, f);
      return null;
    }
    if (kind === 'wake') { this.pending.delete(agentId); return null; }
    if (kind !== 'clear') return null;
    const save = this.pending.get(agentId) ?? null;
    this.pending.delete(agentId);
    return save;
  }

  forget(agentId: string): void {
    this.pending.delete(agentId);
  }
}

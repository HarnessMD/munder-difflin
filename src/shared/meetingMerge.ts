/**
 * THE YOU AND THEM MERGE (0.5.3, F16, the founder's "you and them kind of
 * view", 23 Sep 2026; hive/shared/v053/F16-SYSTEM-AUDIO-PLAN.md).
 *
 * A meeting records two tracks: the microphone (you) and the other side of
 * the call (them: a system tap on the Mac, the loopback on Windows, the
 * monitor source on Linux). Each track's segment is transcribed on its own
 * and the engine hands back lines with times inside the clip. This file
 * turns the two lists into one transcript block, in the order the words
 * were said, with the speaker in front of each run:
 *
 *   [10:04] You: Right, the release.
 *   [10:09] Them: Creed has the desktop half at c08.
 *   [10:15] You: And the web half is frozen at 773.
 *
 * Rules, all pure so a test drives them with fixtures:
 *   - lines are ordered by their start time, whichever track they are on;
 *     a tie goes to the line that ends first, then to you;
 *   - consecutive lines of one speaker are one run, joined with a space,
 *     stamped with the first line's start;
 *   - times are seconds inside the clip; `offsetMs` (the segment's start
 *     in the meeting) moves them onto the meeting clock;
 *   - a clip with no second track reads exactly as a one track transcript
 *     did before: one line per engine line, no speaker prefix (a caller
 *     that wants the prefix on a one track meeting passes `label: true`);
 *   - blank lines and lines with no text are dropped; unsorted input is
 *     sorted; nothing is invented for a gap.
 *
 * Platform independent by design: the same function serves the Mac's
 * helper, Windows and Linux, and whichever engine transcribed the clips.
 */

export interface TimedLine {
  /** Seconds from the start of the clip. */
  t0: number;
  t1: number;
  text: string;
}

export type Speaker = 'you' | 'them';

export interface SpeakerRun {
  speaker: Speaker;
  /** Milliseconds on the meeting clock. */
  startMs: number;
  endMs: number;
  text: string;
}

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim();

function timed(lines: readonly TimedLine[], speaker: Speaker, offsetMs: number): SpeakerRun[] {
  const out: SpeakerRun[] = [];
  for (const l of lines) {
    const text = clean(l.text ?? '');
    if (!text) continue;
    const t0 = Number.isFinite(l.t0) ? Math.max(0, l.t0) : 0;
    const t1 = Number.isFinite(l.t1) ? Math.max(t0, l.t1) : t0;
    out.push({ speaker, startMs: Math.round(offsetMs + t0 * 1000), endMs: Math.round(offsetMs + t1 * 1000), text });
  }
  return out;
}

/**
 * Interleave the two tracks' lines by time and join each speaker's
 * consecutive lines into one run. `you` and `them` are the engine's lines
 * for the same clip; `offsetMs` is where the clip starts in the meeting.
 */
export function mergeTracks(you: readonly TimedLine[], them: readonly TimedLine[], offsetMs = 0): SpeakerRun[] {
  const all = [...timed(you, 'you', offsetMs), ...timed(them, 'them', offsetMs)];
  all.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs || (a.speaker === 'you' ? -1 : 1) - (b.speaker === 'you' ? -1 : 1));
  const runs: SpeakerRun[] = [];
  for (const line of all) {
    const last = runs[runs.length - 1];
    if (last && last.speaker === line.speaker) {
      last.text = `${last.text} ${line.text}`;
      last.endMs = Math.max(last.endMs, line.endMs);
    } else {
      runs.push({ ...line });
    }
  }
  return runs;
}

/** `[mm:ss]`, or `[hh:mm:ss]` past an hour: the same rule shared/puck.ts
 *  `clockOf` prints, so a two track transcript stamps like a one track one. */
export function clockStamp(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `[${two(h)}:${two(m)}:${two(sec)}]` : `[${two(m)}:${two(sec)}]`;
}

export interface TranscriptWords { you: string; them: string }
export const TRANSCRIPT_WORDS: TranscriptWords = { you: 'You', them: 'Them' };

/**
 * The block appended to transcript.md for one clip. With a second track
 * every run carries its speaker; with none, and `label` off, the block is
 * what a one track meeting wrote before this existed: one stamped line per
 * engine line, no prefix. Ends with a blank line, as the old lines did.
 */
export function transcriptBlock(you: readonly TimedLine[], them: readonly TimedLine[] | null, offsetMs = 0, opts: { label?: boolean; words?: TranscriptWords } = {}): string {
  const words = opts.words ?? TRANSCRIPT_WORDS;
  if (them === null && !opts.label) {
    const lines = timed(you, 'you', offsetMs).sort((a, b) => a.startMs - b.startMs);
    return lines.map((l) => `${clockStamp(l.startMs)} ${l.text}\n\n`).join('');
  }
  const runs = mergeTracks(you, them ?? [], offsetMs);
  return runs.map((r) => `${clockStamp(r.startMs)} ${words[r.speaker]}: ${r.text}\n\n`).join('');
}

/** An engine that gave one text and no times: one line for the whole clip. */
export function wholeClip(text: string, durationMs: number): TimedLine[] {
  const t = clean(text);
  return t ? [{ t0: 0, t1: Math.max(0, durationMs) / 1000, text: t }] : [];
}

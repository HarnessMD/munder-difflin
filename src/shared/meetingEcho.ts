/**
 * THE ECHO GUARD (0.5.3, batch 2 result 9; founder 24 Sep 2026: "when it's in
 * high volume on laptop the output sound of "Them" gets in the transcription
 * and makes it polluted. and even what they say is added in You section").
 *
 * With "Also record the other side of calls" on and the laptop's speakers
 * loud, the microphone hears the other side as well, so their words come back
 * a second time on the You track. The microphone is recorded through
 * Chromium, whose echo canceller only knows the sound Chromium itself plays;
 * a call app's audio is not in it. So the cleanup happens here, on the lines:
 *
 *   A You line that says what a Them line said AT THE SAME TIME is the echo.
 *
 * How, tuned on a simulated call (test/fixtures/meeting-echo, and the bench
 * in hive/shared/v053/evidence/meeting-echo):
 *   - the You words of the whole segment are read as one stream, and so are
 *     the Them words: the engine splits lines where it likes, and an echoed
 *     sentence often straddles two You lines;
 *   - a run of at least `minRun` words that also runs, in order, in the Them
 *     stream AT THE SAME TIME (within `windowS` seconds; word times are
 *     spread evenly over their line) is echo: sound from the speakers reaches
 *     the microphone in milliseconds, a spoken reply comes after;
 *   - each Them word can be echoed once: the person repeating their words
 *     right after ("Thursday at ten" back to "on Thursday at ten") keeps
 *     them, because the echo already used that run up;
 *   - only the echoed words are cut; a line is dropped only when nothing of
 *     it is left, so words the person said inside an echoed line stay.
 * A short repeat (under `minRun` words) is never touched, which is why the
 * run length is four: "thursday at 10" is three.
 *
 * Only the rendered transcript is filtered. The segments' raw lines on disk
 * keep every word, so a wrong call loses nothing.
 */
import type { TimedLine } from './meetingMerge';

export interface EchoOptions {
  /** How far apart, in seconds, a You word and the Them word it echoes may be. */
  windowS: number;
  /** The shortest run of words, in order, counted as echo. */
  minRun: number;
}

/** On the bench every echoed word landed within 1.5 s of its Them word
 *  (1 s missed some at medium and loud volume); 2 s leaves room for the two
 *  tracks' capture latencies. A reply that repeats their words starts after
 *  they stop, so it lands later than that and is kept. */
export const ECHO_DEFAULTS: EchoOptions = { windowS: 2, minRun: 4 };

export interface EchoResult {
  lines: TimedLine[];
  /** You lines removed whole. */
  dropped: number;
  /** You lines kept with echo cut out of them. */
  trimmed: number;
  /** Words removed, over all lines. */
  words: number;
}

/** A word as compared: lower case, accents and punctuation gone. */
export function normWord(w: string): string {
  return w.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}']/gu, '').replace(/^'+|'+$/g, '');
}

interface Word { line: number; idx: number; norm: string; t: number }

/** Every word of the lines, in time order, with a time spread over its line. */
function stream(lines: readonly TimedLine[]): { words: Word[]; raw: string[][] } {
  const raw: string[][] = [];
  const words: Word[] = [];
  lines.forEach((l, line) => {
    const toks = (l.text ?? '').split(/\s+/).filter(Boolean);
    raw.push(toks);
    const t0 = Number.isFinite(l.t0) ? l.t0 : 0;
    const t1 = Number.isFinite(l.t1) ? Math.max(t0, l.t1) : t0;
    toks.forEach((w, idx) => {
      const norm = normWord(w);
      if (norm) words.push({ line, idx, norm, t: t0 + ((t1 - t0) * (idx + 0.5)) / toks.length });
    });
  });
  words.sort((a, b) => a.t - b.t || a.line - b.line || a.idx - b.idx);
  return { words, raw };
}

/** Remove the other side's words that came back through the microphone. */
export function removeEcho(you: readonly TimedLine[], them: readonly TimedLine[], opts: Partial<EchoOptions> = {}): EchoResult {
  const o = { ...ECHO_DEFAULTS, ...opts };
  const y = stream(you);
  const th = stream(them).words;
  const used = new Array<boolean>(th.length).fill(false);
  const cut = new Set<string>();
  const Y = y.words;
  let i = 0;
  while (i < Y.length) {
    // The longest run starting here, against Them words not yet echoed.
    let best = 0;
    let at = -1;
    for (let j = 0; j < th.length; j++) {
      if (used[j] || th[j].norm !== Y[i].norm || Math.abs(th[j].t - Y[i].t) > o.windowS) continue;
      let k = 0;
      while (i + k < Y.length && j + k < th.length && !used[j + k] && Y[i + k].norm === th[j + k].norm) k++;
      if (k > best) { best = k; at = j; }
    }
    if (best >= o.minRun) {
      for (let k = 0; k < best; k++) { used[at + k] = true; cut.add(`${Y[i + k].line}:${Y[i + k].idx}`); }
      i += best;
    } else i++;
  }
  const lines: TimedLine[] = [];
  let dropped = 0;
  let trimmed = 0;
  you.forEach((l, n) => {
    const toks = y.raw[n];
    const keep = toks.filter((_, idx) => !cut.has(`${n}:${idx}`));
    if (keep.length === toks.length) { lines.push(l); return; }
    if (!keep.some((w) => normWord(w))) { dropped++; return; }
    trimmed++;
    lines.push({ ...l, text: keep.join(' ') });
  });
  return { lines, dropped, trimmed, words: cut.size };
}

/**
 * Is this output device the machine's own speakers? Then a two track meeting
 * shows one quiet hint, "Headphones give the cleanest transcript" (batch 2
 * #9, point 3). Read from the output device's label as Chromium gives it:
 *   Mac      "Default - MacBook Pro Speakers (Built-in)", "Built-in Output";
 *            with a wired headset the same port reads "External Headphones"
 *   Windows  "Speakers (Realtek(R) Audio)", "Headphones (Realtek(R) Audio)"
 *   Linux    "Built-in Audio Analog Stereo" names the card, not the port,
 *            so it cannot tell speakers from headphones and gets no hint
 * Anything that says headphones, headset, earbuds or AirPods is not speakers.
 */
export function speakersAreBuiltIn(label: string): boolean {
  if (!label) return false;
  if (/head(phone|set)|ear(bud|phone)s?|airpods|\bbuds\b/i.test(label)) return false;
  return /\bspeakers?\b/i.test(label) || /built-?in output/i.test(label);
}

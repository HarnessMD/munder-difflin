/**
 * The vocabulary prompt for whisper (F16).
 *
 * whisper.cpp takes an "initial prompt": text the decoder sees before the
 * audio, which biases it towards the spellings in it. We hand it the default
 * tech vocabulary plus the user's own words as one comma separated line.
 *
 * Budget: the decoder keeps at most n_text_ctx / 2 = 224 tokens of the prompt
 * (whisper.cpp, whisper_full, max_prompt_ctx) and when the prompt is longer it
 * keeps the LAST 224 and drops the head. So the user's words go last, where
 * they can never be the part that is cut, and the default list is trimmed from
 * its front if the two together do not fit.
 *
 * Measured on this Mac with the real helper (F16-WHISPER-BENCH.md, "Vocabulary
 * prompt"): the 153 word test list is 460 tokens, so whisper would keep only its
 * last 224, about 75 names; a prompt costs about 100 ms on a 5 s utterance and
 * nudges the decoder towards digits ("923" for "nine two three"); on the
 * headset meeting clip a prompt within budget improved WER (9.7 to 9.1 %) when
 * NOT carried into every window and doubled the errors when carried, so the
 * helper does not carry it unless asked. Tokens are not counted here (no
 * tokenizer in main; the helper answers {"tokenize"} when a live count is
 * wanted); the character budget below is 224 tokens at the measured 3.1
 * characters per token for comma separated product names.
 */

export const WHISPER_PROMPT_MAX_TOKENS = 224;
/** Characters that fit in 224 tokens of comma separated names, measured (690 chars = 224 tokens). */
export const WHISPER_PROMPT_MAX_CHARS = 680;

export interface PromptInput {
  /** The shipped default vocabulary. Off when the user turned it off. */
  defaultWords?: readonly string[];
  /** The user's own words, always kept, always last. */
  customWords?: readonly string[];
  /** Override the character budget (tests). */
  maxChars?: number;
}

function clean(words: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words ?? []) {
    const w = String(raw ?? '').replace(/\s+/g, ' ').replace(/,/g, ' ').trim();
    if (!w) continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

/**
 * Build the initial prompt. Empty string when there is nothing to say, so the
 * helper skips the prompt entirely (an empty initial prompt is not the same as
 * none for whisper: it still costs a decode step).
 */
export function buildWhisperPrompt(input: PromptInput): string {
  const max = input.maxChars ?? WHISPER_PROMPT_MAX_CHARS;
  const custom = clean(input.customWords);
  const customSet = new Set(custom.map((w) => w.toLowerCase()));
  const defaults = clean(input.defaultWords).filter((w) => !customSet.has(w.toLowerCase()));
  // The user's words are always in, and last in the text (whisper keeps the
  // last 224 tokens). The shipped list is in priority order, the product and
  // the labs first (Kevin, 23 Sep 2026), so it is trimmed from its TAIL: the
  // head is kept and the least important names are the ones that go.
  const kept: string[] = [];
  let length = 0;
  const take = (w: string): boolean => {
    const add = w.length + (kept.length ? 2 : 0);
    if (length + add > max) return false;
    kept.push(w);
    length += add;
    return true;
  };
  const customLength = custom.reduce((n, w, i) => n + w.length + (i ? 2 : 0), 0);
  const roomForDefaults = custom.length ? Math.max(0, max - customLength - 2) : max;
  let usedByDefaults = 0;
  for (const w of defaults) {
    const add = w.length + (kept.length ? 2 : 0);
    if (usedByDefaults + add > roomForDefaults) break;
    kept.push(w);
    usedByDefaults += add;
    length += add;
  }
  for (const w of custom) if (!take(w)) break;
  return kept.join(', ');
}

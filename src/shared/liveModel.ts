/**
 * The model an agent is ACTUALLY running, and the command line that brings it
 * back on that model (0.5.3 bug 2).
 *
 * Two halves of one report. (a) Changing the model inside the CLI (`/model`)
 * never reached the sidebar: the app receives the live model on every Claude
 * status line tick and in every Codex hook payload, and read neither. (b) After
 * an app restart agents did not come back on the model they were last running:
 * the restore replays the saved `command`, so an old `--model` in it beat the
 * saved `model`, and a command with no `--model` at all was given TODAY's floor
 * default by main.
 *
 * One rule answers both: the store's `model` is the model last seen running,
 * and every respawn writes it into the command line it replays.
 */
import { providerPreset, type AgentProvider } from './agentProvider';
import { tokenizeCommand } from './commandLine';

/** The live model in a hook payload, or undefined.
 *   - Claude Code's status line sends `model: { id, display_name }`.
 *   - Codex sends `model: "<id>"` on every hook event.
 *  A payload from inside a sub agent (`agent_type` set) is not the agent's own
 *  model: sub agents routinely run a smaller one. */
export function liveModelOf(payload: { model?: unknown; agent_type?: unknown } | null | undefined): string | undefined {
  if (!payload || payload.agent_type) return undefined;
  const m = payload.model;
  const id = typeof m === 'string' ? m : (m && typeof m === 'object' && typeof (m as { id?: unknown }).id === 'string' ? (m as { id: string }).id : '');
  const trimmed = id.trim();
  return trimmed || undefined;
}

/** One word, written so `tokenizeCommand` reads the same word back. That
 *  tokenizer has no escapes: a word is bare, or inside one kind of quote. So a
 *  word holding BOTH kinds cannot be written at all, and that is null. */
function quote(token: string): string | null {
  if (token === '') return '""';
  const dq = token.includes('"');
  const sq = token.includes("'");
  if (dq && sq) return null;
  if (dq) return `'${token}'`;
  if (sq || /\s/.test(token)) return `"${token}"`;
  return token;
}

/** A word of the line WITH where it sits and whether it was quoted. The same
 *  expression `tokenizeCommand` splits with, so the two cannot disagree about
 *  where a word ends; this one just keeps what that one throws away. */
interface Word { value: string; start: number; end: number; quoted: boolean }
function wordsOf(line: string): Word[] {
  const out: Word[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    out.push({ value: m[1] ?? m[2] ?? m[3], start: m.index, end: m.index + m[0].length, quoted: m[3] === undefined });
  }
  return out;
}

/** CLIs whose help documents a short form of the model flag (checked:
 *  `codex --help`, `kimi --help`). Claude Code has none. */
const SHORT_MODEL_FLAG: Partial<Record<AgentProvider, string>> = { codex: '-m', kimi: '-m' };

const sameWords = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((w, i) => w === b[i]);

/**
 * `command` with its model set to `model`.
 *
 * THE RESULT IS SAVED and replayed on every restart, so a wrong rebuild is a
 * command that is wrong for good. Two earlier versions split the line into
 * words and glued it back, and both lost something: the first lost quoting, the
 * second lost a quoted prompt that merely STARTED with `--model`, because by the
 * time the loop looked at a word its quotes were gone, and the read back check
 * compared against a list the loop had already dropped the word from.
 *
 * So this one never rebuilds the line. It finds the model flag as a SPAN of the
 * original text and replaces only that span; every other byte is the person's.
 *  - Only a BARE word can be a flag. A quoted word is an argument, always.
 *  - Nothing after a bare `--` is a flag: those are positionals.
 *  - The short form counts where the CLI documents one.
 *  - A second model flag is removed, so the line carries one model.
 *  - A model that cannot be written as one word leaves the line untouched: a
 *    stale model is a smaller harm than a command that no longer runs.
 * It still reads the result back, against an expectation built from the
 * ORIGINAL words, not from its own output.
 */
/**
 * The model a command line names with its engine's model flag, or undefined
 * when it names none. The reader for commandWithModel's writer: a hand edited
 * line that says `--model X` is saved with model X, so the restore path, which
 * writes the stored model back into the line, never undoes the edit.
 */
export function modelInCommand(command: string | undefined, provider: AgentProvider): string | undefined {
  const preset = providerPreset(provider);
  if (!command || !preset.supportsModel || !preset.modelFlag) return undefined;
  const flag = preset.modelFlag;
  const short = SHORT_MODEL_FLAG[provider];
  const words = wordsOf(command.trim());
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (w.quoted) continue;
    if (w.value === '--') return undefined;
    if (w.value === flag || (short !== undefined && w.value === short)) {
      const next = words[i + 1];
      return next !== undefined && (next.quoted || !next.value.startsWith('-')) ? next.value : undefined;
    }
    if (w.value.startsWith(`${flag}=`)) return w.value.slice(flag.length + 1) || undefined;
  }
  return undefined;
}

export function commandWithModel(command: string | undefined, model: string | undefined, provider: AgentProvider): string {
  const line = (command ?? '').trim();
  const preset = providerPreset(provider);
  const want = model?.trim();
  if (!line || !want || !preset.supportsModel || !preset.modelFlag) return line;
  const flag = preset.modelFlag;
  const short = SHORT_MODEL_FLAG[provider];

  // How the new model is written. A value starting with a dash would be read
  // back as the NEXT flag, so it goes in the `--model=value` form, which only
  // works for a value with no space or quote in it.
  const quoted = quote(want);
  if (quoted === null) return line;
  let written: string;
  if (want.startsWith('-')) {
    if (quoted !== want) return line;
    written = `${flag}=${want}`;
  } else {
    written = `${flag} ${quoted}`;
  }

  const words = wordsOf(line);
  // Spans of the text that ARE a model flag (with its value), in order.
  const spans: { start: number; end: number; first: number; last: number }[] = [];
  let positionalsFrom = words.length;
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (w.quoted) continue;
    if (w.value === '--') { positionalsFrom = i; break; }
    if (w.value === flag || (short !== undefined && w.value === short)) {
      const next = words[i + 1];
      // The value is the next word unless that is itself a bare flag.
      const takes = next !== undefined && (next.quoted || !next.value.startsWith('-'));
      spans.push({ start: w.start, end: takes ? next.end : w.end, first: i, last: takes ? i + 1 : i });
      if (takes) i++;
    } else if (w.value.startsWith(`${flag}=`)) {
      spans.push({ start: w.start, end: w.end, first: i, last: i });
    }
  }

  let result: string;
  const expected: string[] = [];
  const writtenWords = tokenizeCommand(written);
  if (spans.length === 0) {
    // No model yet: add one, before any `--` so it stays a flag.
    if (positionalsFrom < words.length) {
      const at = words[positionalsFrom].start;
      result = `${line.slice(0, at)}${written} ${line.slice(at)}`;
      words.forEach((w, i) => { if (i === positionalsFrom) expected.push(...writtenWords); expected.push(w.value); });
    } else {
      result = `${line} ${written}`;
      expected.push(...words.map((w) => w.value), ...writtenWords);
    }
  } else {
    // Replace the first span, remove the rest (with the space before each).
    let text = '';
    let cursor = 0;
    spans.forEach((sp, n) => {
      if (n === 0) { text += line.slice(cursor, sp.start) + written; }
      else { text += line.slice(cursor, sp.start).replace(/\s+$/, ''); }
      cursor = sp.end;
    });
    result = (text + line.slice(cursor)).trim();
    const inSpan = (i: number) => spans.findIndex((sp) => i >= sp.first && i <= sp.last);
    words.forEach((w, i) => {
      const n = inSpan(i);
      if (n === -1) expected.push(w.value);
      else if (n === 0 && i === spans[0].first) expected.push(...writtenWords);
    });
  }
  // Read it back. `expected` comes from the ORIGINAL words, so a word this
  // function wrongly consumed would be missing from the result and not from it.
  return sameWords(tokenizeCommand(result), expected) ? result : line;
}

/**
 * TEXT THAT REACHES THE VOICE MODEL FROM A TERMINAL (0.5.2, card
 * v052-voice-michael-terminal-context).
 *
 * "What is this guy doing" is answered from an agent's screen. A terminal is
 * the richest injection surface in the app: an agent prints whatever a web
 * page, a file or another model told it to, and every byte of that would
 * otherwise land in Michael's context as if the person had said it. So
 * nothing from a terminal reaches the model raw. Three passes, all pure and
 * pinned by test/voice-terminal.test.cjs:
 *
 *   stripTerminalControl   escape sequences and control bytes out (a stream
 *                          read straight from the pty, before any terminal
 *                          has drawn it)
 *   neutralizeHostile      the same lead-ins session.ts has always stripped
 *                          from floor deltas: role markers, "ignore previous
 *                          instructions", "you are now", "new instructions"
 *   terminalForVoice       the last lines that carry content, oldest first,
 *                          each cut, the whole capped from the OLD end so the
 *                          newest lines always survive
 *
 * Secrets are the fourth pass and stay in main (hive.ts redactSecrets): the
 * handler runs it on every line before this file's scrub, so a key printed
 * on screen never leaves the trusted side.
 */
import { terminalTail } from './agentCard';

/** Lines Michael gets by default, and the most he may ask for. */
export const VOICE_TERMINAL_LINES = 25;
export const VOICE_TERMINAL_MAX_LINES = 40;
/** Longest line, and longest whole answer, in characters. */
export const VOICE_TERMINAL_LINE_MAX = 160;
export const VOICE_TERMINAL_MAX_CHARS = 2400;

// CSI (ESC [ … final), OSC (ESC ] … BEL or ST), the two-byte escapes, and the
// remaining C0 control bytes except tab and newline.
const CSI = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const ESC2 = /\x1b[@-Z\\-_]/g;
const CTRL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

/** A raw pty stream as plain text: escapes gone, carriage returns folded
 *  into newlines so a redrawn line is a line of its own. */
export function stripTerminalControl(s: string): string {
  return (s || '')
    .replace(OSC, '')
    .replace(CSI, '')
    .replace(ESC2, '')
    .replace(/\r\n?/g, '\n')
    .replace(CTRL, '');
}

/** The injection lead-ins session.ts strips from every floor delta, as one
 *  shared rule. Parentheses go because the session frames its own notes in
 *  them; newlines and runs of space fold to one space. No length cap here:
 *  callers cap for their own channel. */
export function neutralizeHostile(s: string): string {
  return (s || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[()]/g, '')
    // Each lead-in goes with the rest of its sentence AND its full stop, so
    // what is left reads as the neighbouring sentences, not as ". Then".
    .replace(/\b(?:ignore|disregard|forget|override)\b[^.!?]*\b(?:previous|above|prior|instruction|system|prompt)\b[^.!?]*[.!?]?/gi, '')
    .replace(/\b(?:system|assistant|developer|user)\s*:/gi, '')
    .replace(/\bnew instructions?\b[^.!?]*[.!?]?/gi, '')
    .replace(/\byou are (?:now )?[^.!?]*[.!?]?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface TerminalForVoiceOptions {
  lines?: number;
  lineMax?: number;
  maxChars?: number;
  /** Runs on each line BEFORE the scrub. Main passes redactSecrets. */
  redact?: (line: string) => string;
}

/**
 * The last lines of a terminal for the voice model, oldest first. `rows` is
 * the screen as a terminal drew it (or a stripped stream split on newlines).
 * Spinner frames, box rules and blank padding are dropped and a status line
 * repainted on every beat is said once (agentCard terminalTail). Then every
 * line is redacted, scrubbed and cut, and the whole is capped from the old
 * end so the newest lines are the ones that survive.
 */
export function terminalForVoice(rows: readonly string[], opts: TerminalForVoiceOptions = {}): string[] {
  const want = Math.max(1, Math.min(VOICE_TERMINAL_MAX_LINES, Math.floor(opts.lines ?? VOICE_TERMINAL_LINES)));
  const lineMax = opts.lineMax ?? VOICE_TERMINAL_LINE_MAX;
  const maxChars = opts.maxChars ?? VOICE_TERMINAL_MAX_CHARS;
  const redact = opts.redact ?? ((l: string) => l);
  const tail = terminalTail(rows, want, Number.MAX_SAFE_INTEGER);
  const out: string[] = [];
  for (const raw of tail) {
    const line = neutralizeHostile(redact(raw));
    if (!line) continue;
    out.push(line.length > lineMax ? `${line.slice(0, lineMax - 1)}…` : line);
  }
  let total = out.reduce((n, l) => n + l.length, 0);
  while (out.length > 1 && total > maxChars) total -= out.shift()!.length;
  if (out.length === 1 && out[0].length > maxChars) out[0] = `${out[0].slice(0, maxChars - 1)}…`;
  return out;
}

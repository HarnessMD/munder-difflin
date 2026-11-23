/**
 * Is a Claude agent in the middle of a turn, by its own session file?
 *
 * With its hooks lost the app takes a busy agent for idle and types a queued send into the turn it is in. The CLI
 * queues it and one reply answers both: two quick messages reach it as one. The session file is written whatever
 * happens to the hooks, so a queued send reads it first: a prompt with no turn end after it holds the send.
 *
 * Only the tail is read, newest line first, and the scan stops at the first line that opens or closes a turn. Prompt
 * text is read here to tell a prompt from an interrupt or a local command, and goes nowhere.
 */
import { readLinesBackward } from './historyTail';

/** How much of the file's tail is read: a turn whose prompt is further back reads as closed. */
export const SESSION_TURN_TAIL_BYTES = 2 * 1024 * 1024;

export type TurnMark = { kind: 'prompt'; at: number } | { kind: 'end' };

/** What one session line says about the turn: a prompt opens one, an end or an interrupt closes it, null is neither. */
export function turnMark(line: string): TurnMark | null {
  let e: Record<string, unknown> & { message?: { content?: unknown; stop_reason?: unknown } };
  try { e = JSON.parse(line); } catch { return null; }
  if (!e || typeof e !== 'object' || e.isSidechain === true) return null;
  if (e.type === 'system') return e.subtype === 'turn_duration' || e.subtype === 'stop_hook_summary' ? { kind: 'end' } : null;
  if (e.type === 'assistant') {
    // The last reply of a turn carries its stop reason; one that calls a tool goes on.
    if (e.isApiErrorMessage === true) return { kind: 'end' };
    const r = e.message?.stop_reason;
    return typeof r === 'string' && r !== 'tool_use' ? { kind: 'end' } : null;
  }
  if (e.type !== 'user' || e.isMeta === true || e.isCompactSummary === true) return null;
  const c = e.message?.content;
  const blocks = Array.isArray(c) ? c as Array<{ type?: unknown; text?: unknown }> : null;
  const texts = typeof c === 'string' ? [c] : blocks ? blocks.filter((b) => b?.type === 'text').map((b) => String(b.text ?? '')) : [];
  if (texts.some((t) => t.startsWith('[Request interrupted'))) return { kind: 'end' };
  // A tool's result is the turn going on, not a new prompt.
  if (!(typeof c === 'string') && !(blocks && !blocks.some((b) => b?.type === 'tool_result'))) return null;
  // A local command's own lines (/compact, /model, a ! shell line) start no model turn, and nothing ever ends one.
  if (texts.some((t) => /^\s*<(command-|local-command-|bash-)/.test(t))) return null;
  const at = Date.parse(String(e.timestamp ?? ''));
  return { kind: 'prompt', at: Number.isFinite(at) ? at : Number.POSITIVE_INFINITY };
}

/** Read from the tail of a session file: `not-found` when the tail read holds no prompt and no end, and the file
 *  goes on before it. Such a turn reads as closed, and the caller logs it (Kevin). */
export type TurnRead = 'open' | 'closed' | 'not-found';

export function sessionTurnRead(file: string, since: number): TurnRead {
  let found: boolean | null = null;
  let seen = 0;
  const scan = readLinesBackward(file, null, (newestFirst) => {
    // Asked after every line, also one skipped as too long: only a line newly added is read.
    if (newestFirst.length === seen) return false;
    seen = newestFirst.length;
    const m = turnMark(newestFirst[seen - 1].text);
    if (!m) return false;
    found = m.kind === 'prompt' && m.at >= since;
    return true;
  }, { budget: SESSION_TURN_TAIL_BYTES });
  if (found !== null) return found ? 'open' : 'closed';
  return scan.start > 0 ? 'not-found' : 'closed';
}


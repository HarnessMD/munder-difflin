/**
 * THE TWO FACTS AN AGENT SURFACE HAS TO READ CORRECTLY BEFORE IT CAN DRAW THEM
 * (v0.4.9 phase 7). Both were read with a truthiness test, and in each case the
 * truthiness test IS the defect:
 *
 *   the token cap    `caps[id] ? … : …` folds THREE states into two. "No cap
 *                    written for this agent", "capped at N", and "a zero on
 *                    disk that the breaker will never enforce" are different
 *                    answers to "what limits this agent", and only the first
 *                    one means the workspace default applies. Drawn through a
 *                    truthiness test, a zero renders as a blank in the agent
 *                    screen and as the digit 0 in the orchestrator's config
 *                    tab, so the same config reads as two different promises.
 *
 *   the terminal     the bottom of a live terminal is a REPAINTING TUI frame:
 *   tail             blank rows, box rules, and the same status line written
 *                    again on every beat. `rows.slice(-3)` on that is three
 *                    lines of box drawing, which is not "the last three lines
 *                    of terminal output", it is three lines of furniture.
 *
 * React free, DOM free and dependency free on purpose: test/load-ts.cjs loads
 * this module directly, which is the only way either rule gets a unit test.
 */
import { MAX_AGENT_TOKEN_CAP } from './tokenCaps';

/* ── the token cap ─────────────────────────────────────────────────────────── */

/** What actually limits one agent's tokens, and where that limit comes from.
 *  'none' is a real answer, not a missing one: nothing is capping this agent. */
export type AgentTokenCap =
  | { source: 'agent'; tokens: number }
  | { source: 'workspace'; tokens: number }
  | { source: 'none' };

/**
 * A cap the breaker would actually apply. src/main/breaker.ts requires
 * `typeof cap === 'number' && cap > 0` before it will ever trip on one, and
 * src/main/config.ts refuses to WRITE anything else, so the only values that
 * reach here outside that range came from an older build or a hand edited
 * config file. A screen that draws one of those as a cap is promising a limit
 * that cannot fire, which is worse than saying nothing.
 */
export function isEnforceableCap(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value > 0
    && value <= MAX_AGENT_TOKEN_CAP;
}

/**
 * The cap in force for one agent: its own if it has an enforceable one, else
 * the workspace default if that is enforceable, else nothing. The workspace
 * default is only consulted when the agent has no cap of its own, which is the
 * same order main applies.
 */
export function readAgentTokenCap(
  agentId: string,
  agentCaps: Record<string, unknown> | undefined,
  workspaceCap: unknown
): AgentTokenCap {
  const own = agentCaps ? agentCaps[agentId] : undefined;
  if (isEnforceableCap(own)) return { source: 'agent', tokens: own };
  if (isEnforceableCap(workspaceCap)) return { source: 'workspace', tokens: workspaceCap };
  return { source: 'none' };
}

/**
 * What the token cap FIELD holds: the agent's own cap as text, empty when it
 * has none. Deliberately not the resolved cap, because the field is an editor
 * for this agent's own value and pre-filling it with the workspace number
 * would turn a glance into a per agent override on the next blur.
 */
export function tokenCapFieldText(
  agentId: string,
  agentCaps: Record<string, unknown> | undefined
): string {
  const own = agentCaps ? agentCaps[agentId] : undefined;
  return isEnforceableCap(own) ? String(own) : '';
}

/* ── the terminal tail ─────────────────────────────────────────────────────── */

/** Lines shown on a card. Three, because that is what the founder asked for. */
export const TAIL_LINES = 3;
/** How far back up the buffer the search for those lines is allowed to go. A
 *  TUI can hold thirty rows of frame above the last real sentence; past this
 *  the reading is too old to call "what it is doing now". */
export const TAIL_SCAN_ROWS = 80;
/** Longest line drawn. A terminal row is wider than a card. */
export const TAIL_LINE_MAX = 140;

/** A row worth showing has a letter or a digit in it. Box rules, rustling
 *  spinners made of braille dots, a bare `>` prompt and blank padding do not. */
const HAS_CONTENT = /[\p{L}\p{N}]/u;

/**
 * The last `limit` lines of real output from a terminal buffer, oldest first.
 *
 * `rows` is the raw buffer, oldest first, exactly as xterm hands it over. The
 * function is total: an empty buffer, a buffer of nothing but frame, a
 * non-string row, all give back an empty list rather than a guess.
 *
 * BOUNDED THREE WAYS, because this runs on every card of the grid on a timer:
 * at most TAIL_SCAN_ROWS rows are read, at most `limit` lines come back, and
 * each is cut to `maxLen`.
 */
export function terminalTail(
  rows: readonly string[],
  limit: number = TAIL_LINES,
  maxLen: number = TAIL_LINE_MAX
): string[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const want = Math.floor(limit);
  if (!Number.isFinite(want) || want <= 0 || maxLen <= 1) return [];

  const out: string[] = [];
  const stop = Math.max(0, rows.length - TAIL_SCAN_ROWS);
  for (let i = rows.length - 1; i >= stop && out.length < want; i--) {
    const raw = rows[i];
    if (typeof raw !== 'string') continue;
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line || !HAS_CONTENT.test(line)) continue;
    // A TUI repaints its status line unchanged on every beat, so three rows of
    // buffer are often one line of information. Say it once.
    if (line === out[out.length - 1]) continue;
    out.push(line.length > maxLen ? `${line.slice(0, maxLen - 1)}…` : line);
  }
  return out.reverse();
}

/** True when two tails carry the same lines, so a poll that read the same
 *  screen again does not re-render every card in the grid. */
export function sameTail(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

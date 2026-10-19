/**
 * R4: read a Codex terminal's screen before automatic typing, so a wake or a
 * queued message is never typed into a screen that is not the chat composer.
 * The case that started it: a wake typed `[hive] check inbox` + Enter into
 * Codex's folder-trust screen, where `n` means Quit.
 *
 * Pure: `extractCodexScreen` turns the xterm buffer into small facts, and
 * `codexScreenHold` says whether to hold. It holds on every screen it can name:
 *  - the startup draft: the newest session header still shows `model: loading`,
 *    or a `Resuming session…` / `Forking session…` line sits under it (trust,
 *    login and the update prompt come during startup);
 *  - a Codex popup or selection list at the bottom of the screen (trust, sign in,
 *    update, approvals, rate limits, model pickers): a key hint as one of the last
 *    two rows, a selected choice row above it, and a header row above the choices;
 *  - a transient footer a keystroke owns (`again to quit`, `esc close`, ...).
 * A screen it cannot name is typed into as before. The fork allowed only the exact
 * empty composer row; that model is Codex 0.157.1's, and on the 0.153 line a second
 * placeholder, a session header scrolled out of the buffer, or a footer without the
 * status line would hold every delivery for good. Holding on what it can name
 * covers the screens that do harm.
 *
 * The app never answers a popup: no key, no Esc. The person does.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT).
 */

/** The session header box's title (history_cell SessionHeaderHistoryCell). */
export const CODEX_HEADER_TITLE = '>_ OpenAI Codex';
/** Printed under the startup draft's header for a resume / fork. */
export const CODEX_SESSION_STARTING = ['Resuming session…', 'Forking session…'] as const;
/** Footer modes that are transient and owned by a keystroke. */
export const CODEX_TRANSIENT_FOOTER = ['again to quit', 'to edit previous message', 'esc close'] as const;
/** How many rows below the cursor are the footer, at most. */
export const CODEX_FOOTER_ROWS = 6;
/** How many non-empty rows at the BOTTOM of the buffer are kept, at most. A popup hides the
 *  composer and Codex parks the cursor wherever its last draw left it, so a popup is read
 *  from the bottom of the screen, not from the cursor. */
export const CODEX_TAIL_ROWS = 24;
/** The longest popup text a hold reason carries. */
export const CODEX_POPUP_TEXT_MAX = 160;
/** No row of ours is longer than this; a longer one is cut (the facts stay small). */
export const CODEX_ROW_MAX = 400;
/** How far below a header title its `model:` line may sit. */
const HEADER_BOX_ROWS = 8;

export type CodexHeaderState = 'NONE' | 'LOADING' | 'MODEL';

export interface CodexScreenFacts {
  /** The NEWEST header box in the whole buffer, scrollback included. */
  header: CodexHeaderState;
  /** A `Resuming session…` / `Forking session…` line below the newest header. */
  startingAfterHeader: boolean;
  /** The non-empty rows below the cursor, trimmed (the footer), at most CODEX_FOOTER_ROWS. */
  footer: string[];
  /** The last non-empty rows of the buffer, oldest first, right-trimmed (the indent is kept:
   *  it tells a popup's header and choices apart), at most CODEX_TAIL_ROWS. */
  tail: string[];
}

const cut = (s: string): string => (s.length > CODEX_ROW_MAX ? s.slice(0, CODEX_ROW_MAX) : s);

/** The header box's title row, `│ >_ OpenAI Codex (v…)`: anchored on the box edge, so an agent
 *  merely printing the words is not a header. */
function isHeaderTitle(row: string): boolean {
  return row.startsWith(`│ ${CODEX_HEADER_TITLE} (v`);
}

/**
 * Read the facts from a terminal buffer. `line(i)` returns buffer row `i` (0 = the oldest
 * scrollback row) as text, or undefined; `length` is the number of rows; `cursorRow` is the
 * absolute row of the cursor (`baseY + cursorY`).
 */
export function extractCodexScreen(line: (i: number) => string | undefined, length: number, cursorRow: number): CodexScreenFacts {
  let header: CodexHeaderState = 'NONE';
  let startingAfterHeader = false;
  // Every marker is anchored at COLUMN 0: Codex draws its session header box there, and an
  // agent quoting a header, or a lone "Resuming session…", is indented in its transcript.
  for (let title = length - 1; title >= 0; title -= 1) {
    if (!isHeaderTitle(line(title) ?? '')) continue;
    let model: string | null = null;
    let boxEnd = -1;
    for (let i = title + 1; i < Math.min(length, title + HEADER_BOX_ROWS); i += 1) {
      const row = line(i) ?? '';
      if (row.startsWith('╰')) { boxEnd = i; break; }   // ╰ closes the box
      const m = /^│ model:\s+(\S+)/.exec(row);
      if (m) model = m[1];
    }
    // A titled box with no `│ model:` row (the /status card) is not a session header.
    if (model === null) continue;
    header = model === 'loading' ? 'LOADING' : 'MODEL';
    // The startup draft prints its Resuming/Forking line on the row directly under its box.
    const next = boxEnd >= 0 ? (line(boxEnd + 1) ?? '').trimEnd() : '';
    startingAfterHeader = CODEX_SESSION_STARTING.some((s) => next === `  ${s}`);
    break;
  }
  const footer: string[] = [];
  for (let i = cursorRow + 1; i < length && footer.length < CODEX_FOOTER_ROWS; i += 1) {
    const row = (line(i) ?? '').trim();
    if (row) footer.push(cut(row));
  }
  const tail: string[] = [];
  for (let i = length - 1; i >= 0 && tail.length < CODEX_TAIL_ROWS; i -= 1) {
    const row = (line(i) ?? '').trimEnd();
    if (row.trim()) tail.unshift(cut(row));
  }
  return { header, startingAfterHeader, footer, tail };
}

/** The key hint at the bottom of a Codex popup: `Press enter to confirm or esc to go back`,
 *  `enter select · esc back`, and the trust and update screens' `Press enter to continue`.
 *  A key starts with a letter and has no `.`, `:` or `\`, so the status line
 *  `<model> <effort> · <cwd>` is never a hint. */
const POPUP_KEY = '[A-Za-z][A-Za-z0-9+/-]*';
const POPUP_HINT = [
  new RegExp(`^Press ${POPUP_KEY} to [a-z][a-z ]* or ${POPUP_KEY} to [a-z][a-z ]*$`),
  new RegExp(`^${POPUP_KEY} [a-z][a-z ]* · ${POPUP_KEY} [a-z][a-z ]*$`),
  new RegExp(`^Press ${POPUP_KEY} to continue$`)
];
/** The SELECTED choice row, drawn at column 0 (`› 1. Yes, continue`), and any choice row. */
const POPUP_SELECTED = /^› \d+\. \S/;
const POPUP_CHOICE = /^(› | {2})\d+\. \S/;
/** A wrapped description of a choice is indented further than the header (4+ columns). */
const POPUP_DESCRIPTION = /^ {4,}\S/;

/** The Codex popup at the bottom of the screen, as one bounded line (its last header row),
 *  or null. A composer, its footer and the transcript never have all three parts. */
export function codexPopup(f: CodexScreenFacts): string | null {
  const rows = f.tail;
  let hint = -1;
  for (let i = rows.length - 1; i >= Math.max(0, rows.length - 2); i -= 1) {
    if (POPUP_HINT.some((re) => re.test(rows[i].trim()))) { hint = i; break; }
  }
  if (hint < 0) return null;
  let selected = -1;
  for (let i = hint - 1; i >= 0; i -= 1) if (POPUP_SELECTED.test(rows[i])) { selected = i; break; }
  if (selected < 0) return null;
  // The choices block: walk up over choice rows and their wrapped descriptions.
  let top = selected;
  while (top > 0 && (POPUP_CHOICE.test(rows[top - 1]) || POPUP_DESCRIPTION.test(rows[top - 1]))) top -= 1;
  if (top === 0) return null;                                   // no header row left in the tail
  const title = rows[top - 1].trim();
  // An agent's transcript bullet ("• Done.") is not a popup's header.
  if (title.startsWith('• ')) return null;
  return title.length > CODEX_POPUP_TEXT_MAX ? `${title.slice(0, CODEX_POPUP_TEXT_MAX - 1)}…` : title;
}

/** Why automatic typing must wait on this screen, or null to type. */
export function codexScreenHold(f: CodexScreenFacts): string | null {
  if (f.header === 'LOADING') return 'startup';
  if (f.header === 'MODEL' && f.startingAfterHeader) return 'session-starting';
  const popup = codexPopup(f);
  if (popup) return `popup:${popup}`;
  if (f.footer.some((row) => CODEX_TRANSIENT_FOOTER.some((t) => row.includes(t)))) return 'transient-footer';
  return null;
}

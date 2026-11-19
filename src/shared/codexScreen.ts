/**
 * Is the Codex screen its chat prompt? Automatic delivery types only into
 * Codex's empty prompt, and presses Enter only on its own text there, never
 * into another screen: the folder trust question (where `n` means Quit), the
 * sign in, the update prompt, a model or rate limit popup, or the startup
 * draft Codex draws before any of them (it looks like a prompt and is not).
 *
 * Read from the rows main already gets from the window (ptySubmit.ts). Only a
 * readable screen is judged: with none (no window, a terminal never opened, a
 * grid that does not match) delivery keeps its old rule, so an agent whose
 * tab was never opened is not stopped.
 *
 * The texts are Codex's own; each was found in Codex 0.153.4 as installed
 * here. A Codex release that changes its placeholder holds every wake until
 * this is updated, which ptySubmit.ts logs.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT): src/shared/codexScreen.ts.
 */
import { boxHoldsTail } from './providerAutomation';

/** The empty prompt row: the prompt mark and Codex's fixed placeholder. */
export const CODEX_EMPTY_PROMPT_ROW = '› Ask Codex to do anything';
/** The session header box's title row, drawn at column 0. */
export const CODEX_HEADER_TITLE = '│ >_ OpenAI Codex (v';
/** Printed right under the startup draft's header for a resume or a fork. */
export const CODEX_SESSION_STARTING = ['  Resuming session…', '  Forking session…'] as const;
/** Footer modes owned by a key press: a prompt under one is not the plain prompt. */
export const CODEX_TRANSIENT_FOOTER = ['again to quit', 'to edit previous message', 'esc close'] as const;

/** How far below a header title its `model:` row may sit. */
const HEADER_BOX_ROWS = 8;
/** A choice row of a Codex list or popup: `› 1. Yes, continue`, or a toggle
 *  row: `› [x] MCP servers` (the import screen's second step, "space to
 *  toggle"). Codex 0.153.4's strings do not show how it draws the mark, so
 *  every bracket form is taken: a list taken for a prompt is typed into. */
const CHOICE_ROW = /^(› | {2})(\d+\. |\[[ xX✓✔•*]\] )\S/;
/** The key hint at the bottom of every Codex popup, in its styles. LIST_HINT
 *  below is the list form of Codex 0.153.4's import screen ("Bring over
 *  supported setup from another coding agent", shown when a project holds
 *  another agent's config): "<key> to move, <key> to select, c to customize". */
const POPUP_KEY = '[A-Za-z][A-Za-z0-9+/-]*';
const HINT_ITEM = '\\S+(?: \\S+)? to [a-z][a-z ]*';
const POPUP_HINT = [
  new RegExp(`^Press ${POPUP_KEY} to [a-z][a-z ]* or ${POPUP_KEY} to [a-z][a-z ]*$`),
  new RegExp(`^${POPUP_KEY} [a-z][a-z ]* · ${POPUP_KEY} [a-z][a-z ]*$`)
];
/** The list form fits prose too ("Run tests to check, then push to deploy"),
 *  so it is read only on the last non empty row on screen, where the screen's
 *  own hint sits and a transcript line never does under a live composer. */
const LIST_HINT = new RegExp(`^${HINT_ITEM}(?:, ${HINT_ITEM})+,?$`);

export interface CodexScreenVerdict { ok: boolean; reason: string }

/** The prompt and what sits under it, from the rows of one screen. */
interface CodexBottom {
  /** The prompt row: the lowest row that starts with the prompt mark. */
  at: number;
  /** The composer's text: the prompt row without its mark, then its own rows. */
  composer: string;
  /** The rows under the composer (status line, key hints, key modes), non empty. */
  footer: string[];
  /** The composer's last row. */
  end: number;
}

/**
 * Read the composer and the footer. Codex draws a blank row between them
 * (every recorded screen: prompt, blank, status line, `? for shortcuts`), and
 * a typed message may hold blank rows of its own, so the footer is the LAST run
 * of non empty rows, set off from the prompt by a blank row; everything from
 * the prompt down to that blank is the composer.
 */
function codexBottom(rows: readonly string[]): CodexBottom | null {
  let at = -1;
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].startsWith('› ') || rows[i] === '›') { at = i; break; }
  if (at < 0) return null;
  let end = rows.length - 1;
  while (end > at && !rows[end].trim()) end--;
  let start = end;
  while (start - 1 > at && rows[start - 1].trim()) start--;
  const split = end > at && start - 1 > at; // a blank row sits between the prompt and the last run
  const own = rows.slice(at, split ? start : end + 1);
  const footer = split ? rows.slice(start, end + 1).filter((r) => r.trim()) : [];
  const composer = rows[at] === CODEX_EMPTY_PROMPT_ROW && own.slice(1).every((r) => !r.trim())
    ? ''
    : [rows[at].replace(/^›\s?/, ''), ...own.slice(1)].join('\n');
  return { at, composer, footer, end: at + own.length - 1 };
}

/**
 * Steps 1 and 2 of the verdict: the reason when a startup screen or a popup
 * covers the composer, else null. A list's selected choice (`› 1. Yes`,
 * `› [x] Hooks`) is drawn with the prompt mark, so the lowest such row is
 * checked as well.
 */
function codexCovered(rows: readonly string[], bottom: CodexBottom | null): string | null {
  // 1. Past startup: the newest header box on screen shows a model, not
  //    `loading`, and no Resuming or Forking line sits under it. A header
  //    scrolled off the screen means startup is long over.
  for (let t = rows.length - 1; t >= 0; t--) {
    if (!rows[t].startsWith(CODEX_HEADER_TITLE)) continue;
    let model: string | null = null;
    let end = -1;
    for (let i = t + 1; i < Math.min(rows.length, t + HEADER_BOX_ROWS); i++) {
      if (rows[i].startsWith('╰')) { end = i; break; }
      const m = /^│ model:\s+(\S+)/.exec(rows[i]);
      if (m) model = m[1];
    }
    if (model === null) continue; // a titled box with no model row (the /status card) is not the header
    if (model === 'loading') return 'codex is still starting';
    if (end >= 0 && CODEX_SESSION_STARTING.some((s) => rows[end + 1] === s)) return 'codex is still resuming the session';
    break;
  }
  // 2. A popup or a list of choices is up: never typed into, never answered.
  //    Its key hint is its last row (every recorded popup), so only the last 3
  //    non empty rows, or the 2 rows right above the prompt, are read: a
  //    transcript line shaped like a hint must not hold an idle Codex.
  //    A real composer's own rows never count: a message may quote a hint.
  const composer = bottom && !CHOICE_ROW.test(rows[bottom.at]) ? bottom : null;
  const outside = rows.map((r, i) => (composer && i >= composer.at && i <= composer.end ? '' : r));
  const hintRows = [...outside.filter((r) => r.trim()).slice(-3), ...(bottom ? rows.slice(Math.max(0, bottom.at - 2), bottom.at) : [])];
  if (hintRows.some((r) => POPUP_HINT.some((h) => h.test(r.trim())))) return 'a codex popup is open';
  let last = rows.length - 1;
  while (last >= 0 && !rows[last].trim()) last--;
  if (last >= 0 && LIST_HINT.test(outside[last].trim())) return 'a codex popup is open';
  if (bottom && CHOICE_ROW.test(rows[bottom.at])) return 'a codex list of choices is open';
  return null;
}

/** Is `text` still unsubmitted in Codex's composer? Null (no evidence either
 *  way) with no prompt on screen, or a popup, a list of choices or a startup
 *  screen over it: a covered composer is not an empty one. */
export function codexStillPending(lines: readonly string[], text: string): boolean | null {
  const rows = lines.map((l) => l.replace(/\s+$/, ''));
  const b = codexBottom(rows);
  if (!b || codexCovered(rows, b) !== null) return null;
  return boxHoldsTail(b.composer, text, 'in');
}

/**
 * `type`: may text be typed now? Only into the empty prompt.
 * `press`: may Enter be pressed on `text`, typed already? Only when the
 * composer ends with it, so Enter never sends a person's text or anything
 * typed after ours, and no list, popup or startup screen is up.
 */
export function codexScreenVerdict(lines: readonly string[], mode: 'type' | 'press', text = ''): CodexScreenVerdict {
  const rows = lines.map((l) => l.replace(/\s+$/, ''));
  const bottom = codexBottom(rows);
  const covered = codexCovered(rows, bottom);
  if (covered) return { ok: false, reason: covered };
  // 3. The prompt: the lowest row that starts with the prompt mark.
  if (!bottom) return { ok: false, reason: 'no codex prompt on screen' };
  // Key modes show in the footer only; a message quoting one never counts.
  if (bottom.footer.some((r) => CODEX_TRANSIENT_FOOTER.some((f) => r.includes(f)))) return { ok: false, reason: 'a codex key mode is open' };
  // The whole composer, not only its first row: a row drawn under the
  // placeholder before the blank is text too.
  if (mode === 'type' && bottom.composer !== '') return { ok: false, reason: 'the codex prompt is not empty' };
  if (mode === 'press' && !boxHoldsTail(bottom.composer, text, 'end')) return { ok: false, reason: 'the codex prompt holds other text' };
  return { ok: true, reason: mode === 'type' ? 'empty prompt' : 'prompt' };
}

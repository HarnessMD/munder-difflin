/** Slash commands that open an interactive picker/panel instead of starting a
 * normal agent turn. Automated queue delivery must wait until that UI closes. */
const INTERACTIVE_COMMANDS = new Set([
  '/model',
  '/reasoning',
  '/permissions',
  '/permission',
  '/provider',
  '/settings',
  '/config',
  '/experimental',
  '/experiments',
  '/hooks',
  '/mcp',
  '/apps',
  '/plugins',
  '/resume',
  '/sessions'
]);

export function opensInteractiveTerminalUi(input: string): boolean {
  // Only a BARE command opens a picker. `/model` prompts you to choose;
  // `/model sonnet` applies the argument and returns to the prompt with no UI
  // to close. Matching on the first token alone latched the block on the second
  // form too, and nothing could ever clear it — the agent's message queue then
  // silently stopped delivering for the rest of the session.
  const trimmed = input.trim().toLowerCase();
  if (/\s/.test(trimmed)) return false;
  return INTERACTIVE_COMMANDS.has(trimmed);
}

/** Follow output only if the user was already at (or one line from) the bottom.
 * This keeps live TUIs visible without yanking someone reading scrollback. */
export function shouldFollowTerminalOutput(viewportY: number, baseY: number): boolean {
  return baseY - viewportY <= 1;
}

/** How long after a program clears the scrollback (CSI 3 J) we keep re-pinning
 * a scrolled-up reader at the same distance from the bottom. A full-screen
 * redraw (clear screen + clear scrollback + home, then the whole transcript
 * again) arrives as several pty chunks; once it has landed, new output must
 * stop dragging the reader along. */
export const SCROLLBACK_CLEAR_RESTORE_MS = 250;

/** Where a scrolled-up reader was when the program cleared the scrollback. */
export interface ScrollbackClearAnchor {
  viewportY: number;
  baseY: number;
}

/** The viewport line that puts a reader back where they were after the program
 * cleared the scrollback (CSI 3 J). xterm clamps a scrolled-up viewport to line
 * 0 and leaves it there while the redraw refills the buffer, which is the
 * "jumps to the top" bug. While the redraw is still refilling, keep the reader
 * the same distance above the bottom; once the buffer is back to its old length
 * the old line holds the same text again, so return to it exactly (`done`). A
 * redraw that reprints less than the reader had scrolled past lands on line 0,
 * the nearest text still there. */
export function scrollbackRestoreLine(baseY: number, anchor: ScrollbackClearAnchor): { line: number; done: boolean } {
  if (baseY >= anchor.baseY) return { line: Math.max(0, anchor.viewportY), done: true };
  return { line: Math.max(0, baseY - Math.max(0, anchor.baseY - anchor.viewportY)), done: false };
}

/** How long an untouched draft on the prompt keeps blocking queue delivery.
 *
 * The block exists so automation can't fuse its text onto a half-written line.
 * It still has to expire, because the flag is set from KEYSTROKES and a TUI that
 * swallows keys for its own UI can leave it set while the prompt is visibly
 * empty — a phantom draft, which wedged the queue for the rest of the session.
 *
 * Half an hour, not a minute. The old 60s window fired while the user had merely
 * paused to think, and treating a real draft as abandoned is the expensive
 * mistake; leaving a queued message parked a while longer is the cheap one. When
 * it does fire, delivery simply types after the existing text (the two fuse into
 * one prompt) — automation never deletes what the user wrote. */
export const STALE_INPUT_MS = 1_800_000;

/** How long an untouched picker keeps blocking queue delivery.
 * The picker latch is set when the user submits a bare `/model`-style command
 * and is cleared by an Enter, Escape or Ctrl-C typed into that terminal — so a
 * picker closed any other way leaves it set with no path back. Same half hour,
 * same reason: it is the user's menu, so wait a long time, then deliver. We
 * never send Escape ourselves; closing someone's open menu to make room for a
 * queued message is not ours to do. */
export const STALE_PICKER_MS = 1_800_000;

export interface TerminalAutomationState {
  exited: boolean;
  pickerOpen: boolean;
  inputDirty: boolean;
  settleUntil: number;
  inputDirtyAt?: number; // last keystroke that left a draft; absent ⇒ never expires
  pickerOpenedAt?: number; // when the picker latched; absent ⇒ never expires
}

/** A picker nobody has interacted with for STALE_PICKER_MS is treated as gone. */
export function isStaleTerminalPicker(
  state: TerminalAutomationState,
  now = Date.now()
): boolean {
  return state.pickerOpen
    && state.pickerOpenedAt !== undefined
    && now - state.pickerOpenedAt >= STALE_PICKER_MS;
}

/** Why automation may not own the prompt right now, or null when it may. */
export type TerminalAutomationBlock = 'exited' | 'picker' | 'draft' | 'settling' | null;

/** A draft nobody has touched for STALE_INPUT_MS is treated as abandoned. */
export function isStaleTerminalDraft(
  state: TerminalAutomationState,
  now = Date.now()
): boolean {
  return state.inputDirty
    && state.inputDirtyAt !== undefined
    && now - state.inputDirtyAt >= STALE_INPUT_MS;
}

export function terminalAutomationBlock(
  state: TerminalAutomationState,
  now = Date.now()
): TerminalAutomationBlock {
  if (state.exited) return 'exited';
  if (state.pickerOpen && !isStaleTerminalPicker(state, now)) return 'picker';
  if (state.inputDirty && !isStaleTerminalDraft(state, now)) return 'draft';
  if (now < state.settleUntil) return 'settling';
  return null;
}

/** Automatic writes may own the prompt only when no user draft or picker does. */
export function canAutomateTerminal(
  state: TerminalAutomationState,
  now = Date.now()
): boolean {
  return terminalAutomationBlock(state, now) === null;
}

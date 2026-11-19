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

// A draft on the prompt holds queue delivery until the box is empty, at any age (Kevin, Pam b8 row 6).
// It used to expire after half an hour, and the queued message was then typed after the person's text: the two
// went to the agent as one prompt, the R7 fault by another road. A phantom draft (keys a TUI swallowed for its
// own UI) is cleared by settleDraft once the rendered prompt line reads empty, and the person can clear a draft
// from the queue row.

/** How long an untouched picker keeps blocking queue delivery.
 * The picker latch is set when the user submits a bare `/model`-style command
 * and is cleared by an Enter, Escape or Ctrl-C typed into that terminal — so a
 * picker closed any other way leaves it set with no path back. Half an hour:
 * it is the user's menu, so wait a long time, then deliver. We
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

/**
 * Settle the keystroke count against one read of the rendered prompt line, and
 * say whether a person's draft is there (0.5.6).
 *
 * A read of "empty" used to overrule the count for that one read only. So a
 * phantom draft (a key the TUI swallowed for a menu, counted and never
 * cleared) let a queued message be typed, and then the message itself, now on
 * the prompt line, read as the person's draft: every press of the submit key
 * was skipped and the message sat in the input box until the person pressed
 * Return in the terminal. An empty line now clears the count for good, so only
 * a key pressed after it can hold the prompt again.
 */
export function settleDraft(entry: { lineBuf: string; inputDirty: boolean }, lineHasText: boolean | null): boolean {
  if (entry.inputDirty && lineHasText === false) {
    entry.lineBuf = '';
    entry.inputDirty = false;
  }
  return entry.inputDirty;
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

export function terminalAutomationBlock(
  state: TerminalAutomationState,
  now = Date.now()
): TerminalAutomationBlock {
  if (state.exited) return 'exited';
  if (state.pickerOpen && !isStaleTerminalPicker(state, now)) return 'picker';
  if (state.inputDirty) return 'draft';
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

/**
 * HOLD OPTION IN ANY FIELD OF OUR OWN WINDOW (founder, 25 Sep 2026, batch 2
 * #4: "when user has selected any other field other than the queue input area
 * stapler should work for transcription like memory search").
 *
 * Two things listen for a held Option while our window has focus: Free Flow
 * (renderer, freeflow/holdOption.ts), which writes into the agent's composer
 * draft, and dictation from anywhere (main, the md-hotkey helper), which
 * pastes at the cursor of whatever has focus, with the Stapler's eyes, meter
 * and sounds. Before, the second always stood aside in our window when Free
 * Flow was on, so a held Option in Memory search, a Settings field or agent
 * search went to the composer instead, or nowhere.
 *
 * Now the renderer says what kind of element has focus, and exactly one of
 * the two takes the hold:
 *
 *   composer  the message box (Free Flow's own target), or the terminal,
 *             which has no field of its own: Free Flow, as before
 *   field     any other text field: dictation from anywhere, into it
 *   password  nobody
 *   other     nothing editable: Free Flow, as before
 *
 * Import free, so test/load-ts.cjs runs it.
 */

export type DictationFocus = 'composer' | 'field' | 'password' | 'other';

/** The input types a person types words into. */
const TEXT_INPUTS = new Set(['', 'text', 'search', 'email', 'url', 'tel']);

/** The part of an element this reads, so a test can hand in a plain object. */
export interface FocusTarget {
  tagName: string;
  type?: string;
  isContentEditable?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  closest?: (selector: string) => unknown;
}

export function dictationFocusOf(el: FocusTarget | null | undefined): DictationFocus {
  if (!el) return 'other';
  if (el.closest?.('[data-freeflow-target]')) return 'composer';
  // xterm types through a hidden textarea: the terminal is Free Flow's.
  if (el.closest?.('.xterm')) return 'composer';
  const tag = el.tagName.toUpperCase();
  if (tag === 'INPUT') {
    const type = (el.type ?? '').toLowerCase();
    if (type === 'password') return 'password';
    if (!TEXT_INPUTS.has(type) || el.readOnly || el.disabled) return 'other';
    return 'field';
  }
  if (tag === 'TEXTAREA') return el.readOnly || el.disabled ? 'other' : 'field';
  if (el.isContentEditable) return 'field';
  return 'other';
}

/** Main: whether dictation from anywhere leaves a hold alone while OUR window
 *  has focus. It takes a field; Free Flow (when on) takes the rest; a
 *  password field is nobody's. */
export function anyAppStandsAside(freeflowEnabled: boolean, focus: DictationFocus): boolean {
  if (focus === 'password') return true;
  if (focus === 'field') return false;
  return freeflowEnabled;
}

/** The renderer: whether Free Flow takes this hold. */
export function freeflowTakesHold(focus: DictationFocus): boolean {
  return focus === 'composer' || focus === 'other';
}

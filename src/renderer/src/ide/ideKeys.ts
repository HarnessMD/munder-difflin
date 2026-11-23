/**
 * The IDE's keyboard chord, in one table.
 *
 * ⌘I opens the IDE: Meta on macOS and Ctrl elsewhere (enforced by
 * ideChordFor). The shortcut listener and the find keys ask this file.
 *
 * A chord with Shift or Alt held is NOT one of ours: it is left alone so a
 * future binding (or the OS) can have it. `key` is compared as the browser
 * reports it, so a non US layout is still read by the character it produced.
 *
 * Pure: no React, no DOM, so a test can call it with a plain object.
 */
export type IdeChord = 'ide';

export interface ChordKey {
  key: string;
  /** The physical key, layout independent ("KeyI"). Only read when `key` is
   *  not an ASCII character; see ideChordFor. */
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const KEY_OF: Readonly<Record<string, IdeChord>> = {
  // The IDE, from any screen. A LETTER on purpose: `\` and most punctuation
  // need Shift or Alt on German, French and Nordic layouts, and a chord that
  // forbids both cannot be typed there. Not E: Ctrl+E is end of line in every
  // shell and the chord is Ctrl on Windows and Linux.
  i: 'ide'
};

/** The same chord by PHYSICAL key, for a layout whose keys do not produce
 *  ASCII. */
const CODE_OF: Readonly<Record<string, IdeChord>> = {
  KeyI: 'ide'
};

/** macOS, read once. False in a test runner, which passes `mac` itself. */
export const IS_MAC_PLATFORM = typeof navigator !== 'undefined' && /mac/i.test(String(navigator.userAgent ?? ''));

/**
 * The chord a keydown is, or null when it is not one of ours.
 *
 * THE MODIFIER IS THE PLATFORM'S, NOT EITHER. On macOS it is Command and ONLY
 * Command: Control there belongs to the terminal this app is made of. Control I
 * is Tab to readline and jump forward in vim. Taking the chord from Control on
 * a Mac takes a key people press inside the agent's own CLI. Elsewhere it is
 * Control, and Meta (the Windows key) is left to the OS. Both held is nobody's
 * chord.
 *
 * THE KEY IS THE CHARACTER, WITH THE PHYSICAL KEY AS THE FALLBACK. `key` is
 * what the layout produced, so Dvorak and AZERTY press the key that is
 * LABELLED I, which is what the hint on screen says. On an Arabic or Russian
 * layout that key produces a letter that is not in the table at all, so when
 * `key` is not ASCII the physical `code` is read instead.
 *
 * A keydown with no `key` (an autofill or IME synthetic event) is not a chord.
 */
function ideChordFor(e: ChordKey, mac: boolean = IS_MAC_PLATFORM): IdeChord | null {
  if (mac ? !(e.metaKey && !e.ctrlKey) : !(e.ctrlKey && !e.metaKey)) return null;
  if (e.altKey || e.shiftKey) return null;
  if (typeof e.key !== 'string' || e.key.length === 0) return null;
  // Lower cased so caps lock does not turn the chord into a different key. Shift
  // is already refused above, so this cannot let a shifted chord through.
  const byKey = KEY_OF[e.key] ?? KEY_OF[e.key.toLowerCase()];
  if (byKey) return byKey;
  // Only a non ASCII key falls back. Command plus an ASCII letter that is not
  // ours (Dvorak's key in the I position types C) must stay not ours.
  if (/^[\x00-\x7f]+$/.test(e.key)) return null;
  return (typeof e.code === 'string' && CODE_OF[e.code]) || null;
}

/** The chord OPENS the IDE and never closes it. Inside an open IDE it belongs
 *  to the editor (trigger suggest), and Escape already closes the panel. */
export function opensIde(e: ChordKey, ideOpen: boolean, mac: boolean = IS_MAC_PLATFORM): boolean {
  return !ideOpen && ideChordFor(e, mac) === 'ide';
}

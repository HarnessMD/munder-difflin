/**
 * PRO's keyboard chords, in one table (phase 6, plan §7 "keyboard").
 *
 * Four chords since 0.5.3 (⌘I, the IDE), all Meta on macOS and Ctrl elsewhere
 * (enforced by proChordFor since the 0.5.3 review), all promised somewhere
 * on screen before this file existed: the sidebar chevron's tooltip says ⌘\,
 * the drop-up's Settings row shows ⌘, as its hint, and the agent screen's
 * config panel answered ⌘. from its own inline check. A hint that names a
 * chord nobody wired is a lie in the UI; the table is the one place the
 * chords are spelled, the listeners ask it, and test/pro-phase6.test.cjs
 * holds the hints and the table to the same three keys.
 *
 * A chord with Shift or Alt held is NOT one of ours: ⌘⇧, and ⌥⌘\ are left
 * alone so a future binding (or the OS) can have them. `key` is compared as
 * the browser reports it, so a non-US layout that types `\` through Alt is
 * still read by the character it produced.
 *
 * Pure: no React, no DOM, so the test can call it with a plain object.
 */
export type ProChord = 'sidebar' | 'settings' | 'agentConfig' | 'ide';

export interface ChordKey {
  key: string;
  /** The physical key, layout independent ("KeyI"). Only read when `key` is
   *  not an ASCII character; see proChordFor. */
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** What each chord is shown as in the UI. One glyph table, one truth. */
export const CHORD_HINT: Readonly<Record<ProChord, string>> = {
  sidebar: '⌘\\',
  settings: '⌘,',
  agentConfig: '⌘.',
  ide: '⌘I'
};

const KEY_OF: Readonly<Record<string, ProChord>> = {
  '\\': 'sidebar',
  ',': 'settings',
  '.': 'agentConfig',
  // 0.5.3, feature 23: the IDE, from any screen. A LETTER on purpose: `\` and
  // most punctuation need Shift or Alt on German, French and Nordic layouts,
  // and a chord that forbids both cannot be typed there. Not E: Ctrl+E is end
  // of line in every shell and the chord is Ctrl on Windows and Linux.
  i: 'ide'
};

/** The same four chords by PHYSICAL key, for a layout whose keys do not
 *  produce ASCII (0.5.3, review finding 26). */
const CODE_OF: Readonly<Record<string, ProChord>> = {
  Backslash: 'sidebar',
  Comma: 'settings',
  Period: 'agentConfig',
  KeyI: 'ide'
};

/** macOS, read once. False in a test runner, which passes `mac` itself. */
export const IS_MAC_PLATFORM = typeof navigator !== 'undefined' && /mac/i.test(String(navigator.userAgent ?? ''));

/**
 * The chord a keydown is, or null when it is not one of ours.
 *
 * THE MODIFIER IS THE PLATFORM'S, NOT EITHER (0.5.3, review finding 12). On
 * macOS it is Command and ONLY Command: Control there belongs to the terminal
 * this app is made of. Control I is Tab to readline and jump forward in vim,
 * Control \ is SIGQUIT. Taking either chord from Control on a Mac takes a key
 * people press inside the agent's own CLI. Elsewhere it is Control, and Meta
 * (the Windows key) is left to the OS. Both held is nobody's chord.
 *
 * THE KEY IS THE CHARACTER, WITH THE PHYSICAL KEY AS THE FALLBACK (finding 26).
 * `key` is what the layout produced, so Dvorak and AZERTY press the key that is
 * LABELLED I, which is what the hint on screen says. On an Arabic or Russian
 * layout that key produces a letter that is not in the table at all, and Command
 * plus it did nothing, in an app that ships an Arabic locale. When `key` is not
 * ASCII the physical `code` is read instead. All four chords take the fallback:
 * the comma and period keys are Arabic letters too.
 *
 * A keydown with no `key` (an autofill or IME synthetic event) is not a chord.
 * It used to throw here, inside a window listener and inside xterm's handler.
 */
export function proChordFor(e: ChordKey, mac: boolean = IS_MAC_PLATFORM): ProChord | null {
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
  return !ideOpen && proChordFor(e, mac) === 'ide';
}

/**
 * Should a focused terminal keep this keydown from the agent's CLI? Only when
 * the same keydown is about to open the IDE. It used to be "whenever it is the
 * IDE chord", which on macOS also ate Control I (Tab, vim jump forward) and ate
 * the chord while the IDE was already open and doing nothing with it.
 */
export function terminalYieldsToIde(e: ChordKey, ideOpen: boolean, mac: boolean = IS_MAC_PLATFORM): boolean {
  return opensIde(e, ideOpen, mac);
}

/** True when the element that has focus is a text field, where Esc means
 *  "stop editing this" before it means "close what I am in". */
export function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return (el as HTMLElement).isContentEditable === true;
}

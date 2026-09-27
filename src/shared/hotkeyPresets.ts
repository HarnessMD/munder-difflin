/**
 * SHORTCUT PRESETS (0.5.3, founder 24 Sep 2026: "for shortcut changing input
 * sections just show a list of 10-12 alternatives to choose from, typing the
 * key stroke names is an antipattern"). Settings draws each chord field as a
 * list of these; nothing is typed.
 *
 * Every list is per platform, holds its field's default, and was picked so
 * that:
 *   - no chord is in two lists, so one pick can never take another field's key;
 *   - no chord is one the OS or the everyday apps already own (SYSTEM_CHORDS,
 *     below, is the list the test checks against);
 *   - every chord parses (hotkeyName.ts) and names only keys the md-hotkey
 *     helpers take.
 * A stored chord that is not in the list (typed by hand before this change,
 * or written into config.json) stays readable: the field shows it as its own
 * row, marked custom, until something else is picked.
 *
 * Names are the stored form ("Control+Alt+Space"); `chordLabel` draws them
 * with the Mac's symbols (⌃⌥Space) or as Ctrl + Alt + Space elsewhere, and
 * `chordWords` spells them out in plain words.
 */
import { isHoldKey, sameChord } from './hotkeyName';

export type ChordField = 'pushToTalk' | 'meeting' | 'capture';
type Os = 'mac' | 'other';

const osOf = (platform: string | undefined): Os => (platform === 'darwin' ? 'mac' : 'other');

const PRESETS: Record<Os, Record<ChordField, readonly string[]>> = {
  mac: {
    // Held down while speaking: two modifiers and a key that is easy to hold.
    // Hold Option alone first: the default since 0.5.3 (founder, 24 Sep).
    pushToTalk: [
      'Option', 'Control+Alt+Space', 'Control+Shift+Space', 'Alt+Shift+Space', 'Control+Alt+D', 'Control+Alt+V',
      'Control+Alt+Return', 'Control+Alt+Slash', 'Control+Alt+Period', 'Control+Alt+Comma', 'Control+Alt+Semicolon'
    ],
    meeting: [
      'Shift+Command+Space', 'Control+Alt+M', 'Control+Shift+M', 'Alt+Shift+M', 'Control+Alt+Command+M',
      'Control+Alt+R', 'Control+Shift+R', 'Alt+Shift+R', 'Control+Alt+Command+R', 'Shift+Command+Return'
    ],
    capture: [
      'Control+Shift+5', 'Control+Shift+6', 'Control+Shift+7', 'Control+Shift+8', 'Control+Shift+9',
      'Control+Alt+5', 'Control+Alt+S', 'Control+Shift+S', 'Alt+Shift+S', 'Control+Alt+Command+S', 'Control+Alt+Command+5'
    ]
  },
  other: {
    pushToTalk: [
      'Control+Alt+Space', 'Alt+Shift+Space', 'Control+Alt+D', 'Control+Alt+V', 'Control+Alt+Return',
      'Control+Alt+Slash', 'Control+Alt+Period', 'Control+Alt+Comma', 'Control+Alt+Semicolon', 'Control+Alt+Quote'
    ],
    meeting: [
      'Control+Shift+Space', 'Control+Alt+M', 'Control+Shift+M', 'Alt+Shift+M', 'Control+Alt+Shift+M',
      'Control+Alt+R', 'Alt+Shift+R', 'Control+Alt+Shift+R', 'F8', 'F9'
    ],
    capture: [
      'Control+Shift+PrintScreen', 'Control+Alt+PrintScreen', 'Control+Shift+5', 'Control+Shift+6', 'Control+Shift+7',
      'Control+Shift+8', 'Control+Shift+9', 'Control+Alt+S', 'Alt+Shift+S', 'Control+Alt+Shift+S'
    ]
  }
};

/** Chords the OS or everyday apps own. No preset may be one of these; the test
 *  holds every list against it. Mac: Spotlight, input source, emoji, Finder
 *  search, the screenshot keys, app switcher, Mission Control, lock screen,
 *  force quit, full screen, help. Windows and Linux: task manager, lock,
 *  terminal, workspace moves, the window menu, Save As, high contrast. */
export const SYSTEM_CHORDS: Record<Os, readonly string[]> = {
  mac: [
    'Command+Space', 'Control+Space', 'Alt+Command+Space', 'Control+Command+Space',
    'Shift+Command+3', 'Shift+Command+4', 'Shift+Command+5', 'Shift+Command+6', 'Control+Shift+Command+3', 'Control+Shift+Command+4',
    'Command+Tab', 'Control+Up', 'Control+Down', 'Control+Left', 'Control+Right', 'Control+Command+Q', 'Alt+Command+Escape',
    'Control+Command+F', 'Shift+Command+Slash', 'Command+Q', 'Command+W', 'Command+H', 'Command+M', 'F5', 'F11', 'F12'
  ],
  other: [
    'Control+Alt+Delete', 'Control+Shift+Escape', 'Control+Escape', 'Alt+Tab', 'Alt+F4', 'Alt+Space', 'Control+Alt+T', 'Control+Alt+L',
    'Control+Alt+Up', 'Control+Alt+Down', 'Control+Alt+Left', 'Control+Alt+Right', 'Control+Shift+S', 'Alt+Shift+PrintScreen',
    'Alt+PrintScreen', 'PrintScreen', 'Super+Space', 'F1', 'F10', 'F11', 'F12'
  ]
};

/** The field's list on this platform, default first. */
export function chordPresets(field: ChordField, platform: string | undefined): readonly string[] {
  return PRESETS[osOf(platform)][field];
}

/** The preset a stored chord is (matched the way the helpers match, so
 *  "Cmd+Shift+Space" is Shift+Command+Space), or null when it is custom. */
export function presetFor(field: ChordField, platform: string | undefined, stored: string): string | null {
  const s = stored.trim();
  if (!s) return null;
  return chordPresets(field, platform).find((p) => sameChord(p, s)) ?? null;
}

const MAC_MOD: Record<string, string> = { control: '⌃', ctrl: '⌃', alt: '⌥', option: '⌥', opt: '⌥', shift: '⇧', command: '⌘', cmd: '⌘', super: '⌘', meta: '⌘' };
const MAC_ORDER = ['⌃', '⌥', '⇧', '⌘'];
const WORD_MOD: Record<Os, Record<string, string>> = {
  mac: { control: 'Control', ctrl: 'Control', alt: 'Option', option: 'Option', opt: 'Option', shift: 'Shift', command: 'Command', cmd: 'Command', super: 'Command', meta: 'Command' },
  other: { control: 'Ctrl', ctrl: 'Ctrl', alt: 'Alt', option: 'Alt', opt: 'Alt', shift: 'Shift', command: 'Super', cmd: 'Super', super: 'Super', meta: 'Super' }
};
const KEY_SIGN: Record<string, string> = {
  space: 'Space', return: 'Return', enter: 'Enter', slash: '/', period: '.', comma: ',', semicolon: ';', quote: "'",
  printscreen: 'PrintScreen', print: 'PrintScreen', prtsc: 'PrintScreen', escape: 'Esc', esc: 'Esc', tab: 'Tab', grave: '`'
};
const KEY_WORD: Record<string, string> = { slash: 'Slash', period: 'Period', comma: 'Comma', semicolon: 'Semicolon', quote: 'Quote', grave: 'Backtick' };

function parts(name: string): { mods: string[]; key: string } {
  const p = name.split('+').map((x) => x.trim()).filter(Boolean);
  const key = p.pop() ?? '';
  return { mods: p.map((m) => m.toLowerCase()), key };
}
const keySign = (k: string): string => KEY_SIGN[k.toLowerCase()] ?? (k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1));

/** ⌃⌥Space on the Mac (Apple's order: ⌃ ⌥ ⇧ ⌘); Ctrl + Alt + Space elsewhere. */
export function chordLabel(name: string, platform: string | undefined): string {
  if (isHoldKey(name)) return osOf(platform) === 'mac' ? '⌥' : 'Alt';
  const { mods, key } = parts(name);
  if (osOf(platform) === 'mac') {
    const signs = mods.map((m) => MAC_MOD[m] ?? m).sort((a, b) => MAC_ORDER.indexOf(a) - MAC_ORDER.indexOf(b));
    return `${signs.join('')}${keySign(key)}`;
  }
  return [...mods.map((m) => WORD_MOD.other[m] ?? m), keySign(key)].join(' + ');
}

/** The same chord in plain words: "Control Option Space". */
export function chordWords(name: string, platform: string | undefined): string {
  const os = osOf(platform);
  if (isHoldKey(name)) return WORD_MOD[os].option;
  const { mods, key } = parts(name);
  const order = ['Control', 'Ctrl', 'Option', 'Alt', 'Shift', 'Command', 'Super'];
  const words = mods.map((m) => WORD_MOD[os][m] ?? m).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return [...words, KEY_WORD[key.toLowerCase()] ?? keySign(key)].join(' ');
}

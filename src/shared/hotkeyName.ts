/**
 * HOT KEY NAMES (0.5.3, F16). The chord names the app stores and hands the
 * md-hotkey helpers: "Control+Alt+Space", "Shift+Command+Space", "F9". This
 * is the helpers' parser in TypeScript, so Settings can refuse a bad chord
 * before it is saved and main can say why without asking the helper: the
 * modifiers first (command, cmd, super, meta, control, ctrl, alt, option,
 * opt, shift), then one key; a key with no modifier is refused unless it is
 * an F key; a bare modifier is refused. The helpers stay the truth for what
 * the OS accepts (register-failed when another app holds the chord).
 *
 * The meeting chord (founder, 23 Sep 2026): Shift+Command+Space on the Mac,
 * Control+Shift+Space on Windows and Linux. An empty stored key means the
 * platform default.
 *
 * The capture chord (founder, 23 Sep 2026, I6): Control+Shift+5 on the Mac,
 * Control+Shift+PrintScreen on Windows and Linux, armed by default. The key
 * name is `PrintScreen`, with `Print` and `PrtSc` as aliases (Creed's win.c
 * and linux.c take the same three); a Mac has
 * no such key, so the Mac refuses it as bad-key.
 */
const MODIFIERS = new Set(['command', 'cmd', 'super', 'meta', 'control', 'ctrl', 'alt', 'option', 'opt', 'shift']);
const KEYS = new Set([
  ...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''),
  '=', '-', ']', '[', "'", ';', '\\', ',', '/', '.', '`',
  'return', 'enter', 'tab', 'space', 'backspace', 'delete', 'escape', 'esc',
  'home', 'end', 'pageup', 'pagedown', 'left', 'right', 'down', 'up',
  'plus', 'minus', 'comma', 'period', 'slash', 'semicolon', 'quote', 'grave',
  'printscreen', 'print', 'prtsc'
]);
const PRINT_SCREEN = new Set(['printscreen', 'print', 'prtsc']);
const F_KEY = /^f([1-9]|1\d|20)$/;

export type HotkeyProblem = 'empty' | 'bad-modifier' | 'bad-key' | 'bare-key' | 'bare-modifier';

/** "Option" alone is not a chord but a HOLD (0.5.3, founder 24 Sep 2026):
 *  either Option key held with nothing else for 300 ms starts dictation.
 *  Only the Mac helper takes it (tools/md-hotkey/main.swift, the hold). */
export function isHoldKey(name: string): boolean {
  const k = name.trim().toLowerCase();
  return k === 'option' || k === 'alt' || k === 'opt';
}

/** null when the chord parses; otherwise why not. `platform` refuses the
 *  keys that platform lacks (PrintScreen on the Mac). */
export function hotkeyProblem(name: string, platform?: string): HotkeyProblem | null {
  if (isHoldKey(name)) return platform && platform !== 'darwin' ? 'bare-modifier' : null;
  const parts = name.split('+').map((p) => p.trim());
  const last = parts[parts.length - 1] ?? '';
  if (!last) return parts.length > 1 && MODIFIERS.has(parts[0]?.toLowerCase() ?? '') ? 'bare-modifier' : 'empty';
  for (const m of parts.slice(0, -1)) if (!MODIFIERS.has(m.toLowerCase())) return 'bad-modifier';
  const key = last.toLowerCase();
  if (MODIFIERS.has(key)) return 'bare-modifier';
  const isF = F_KEY.test(key);
  if (!KEYS.has(key) && !isF) return 'bad-key';
  if (PRINT_SCREEN.has(key) && platform === 'darwin') return 'bad-key';
  if (parts.length === 1 && !isF) return 'bare-key';
  return null;
}

export const validHotkey = (name: string): boolean => hotkeyProblem(name) === null;

/** Push to talk: hold Option alone on the Mac (0.5.3); Windows and Linux
 *  have no any app helper in this build and keep the chord. */
export function defaultPushToTalkKey(platform: string): string {
  return platform === 'darwin' ? 'Option' : 'Control+Alt+Space';
}

export function defaultMeetingKey(platform: string): string {
  return platform === 'darwin' ? 'Shift+Command+Space' : 'Control+Shift+Space';
}

/** The chord to arm for the meeting toggle: the stored one, or the platform's. */
export function meetingKeyFor(stored: string | undefined, platform: string): string {
  const s = (stored ?? '').trim();
  return s || defaultMeetingKey(platform);
}

export function defaultCaptureKey(platform: string): string {
  return platform === 'darwin' ? 'Control+Shift+5' : 'Control+Shift+PrintScreen';
}

/** The chord to arm for the capture: the stored one, or the platform's. */
export function captureKeyFor(stored: string | undefined, platform: string): string {
  const s = (stored ?? '').trim();
  return s || defaultCaptureKey(platform);
}

/** A chord on a key the helper in this build may not know yet: PrintScreen
 *  lands in win.c and linux.c with Creed's #60. A helper that answers
 *  bad-key to it is an old build, not a wrong chord. */
export const needsNewHelperKey = (name: string): boolean => /(^|\+)\s*(printscreen|print|prtsc)\s*$/i.test(name);

/** The same chord written two ways ("Shift+Cmd+Space", "Command+Shift+Space"). */
export function sameChord(a: string, b: string): boolean {
  const norm = (n: string): string => {
    const parts = n.split('+').map((p) => p.trim().toLowerCase()).filter(Boolean);
    const last = parts.pop() ?? '';
    const key = PRINT_SCREEN.has(last) ? 'printscreen' : last;
    const mods = parts.map((m) => (m === 'cmd' || m === 'super' || m === 'meta' ? 'command' : m === 'ctrl' ? 'control' : m === 'option' || m === 'opt' ? 'alt' : m)).sort();
    return [...mods, key].join('+');
  };
  return norm(a) === norm(b);
}

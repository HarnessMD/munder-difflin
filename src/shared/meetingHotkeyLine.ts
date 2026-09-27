/**
 * THE MEETING CHORD, THE LINE UNDER ITS KEY FIELD (0.5.3, F16). One sentence
 * from main's `meetingHotkey:status`: armed with which chord, or why not.
 * Red (`bad`) when the person can do something about it: a chord that does
 * not parse, one the OS refused, a helper that did not start.
 */
export interface MeetingHotkeyStatusLike {
  platform: string;
  key: string;
  defaultKey: string;
  armed: string | null;
  reason: string | null;
  detail?: string;
}

export type Translate = (key: string, opts?: Record<string, unknown>) => string;

const OS_WORD: Record<string, string> = { darwin: 'macOS', win32: 'Windows', linux: 'Linux' };

export function meetingHotkeyLine(t: Translate, s: MeetingHotkeyStatusLike | null): { text: string; bad: boolean } {
  if (!s) return { text: '', bad: false };
  if (s.armed) return { text: t('settings.transcribe.meetingKeyArmed', { key: s.armed }), bad: false };
  return chordLine(t, s);
}

/** The capture chord's line (I6): the same sentences as the meeting chord's,
 *  except that it may not be the meeting's chord, its Wayland line speaks of
 *  screenshots, and a helper too old for PrintScreen is a build to wait for
 *  (Windows and Linux until #60), not red. */
export function captureHotkeyLine(t: Translate, s: MeetingHotkeyStatusLike | null): { text: string; bad: boolean } {
  if (!s) return { text: '', bad: false };
  if (s.armed) return { text: t('settings.transcribe.meetingKeyArmed', { key: s.armed }), bad: false };
  // Windows and Linux before #60: no helper, or one that does not know
  // PrintScreen yet. Either way the next build, not the person, fixes it.
  if (s.reason === 'not-available' && /(printscreen|print|prtsc)\s*$/i.test(s.key)) return { text: t('settings.transcribe.captureKeyNeedsHelper', { key: s.key }), bad: false };
  if (s.reason === 'needs-helper') return { text: t('settings.transcribe.captureKeyNeedsHelper', { key: s.key }), bad: false };
  if (s.reason === 'wayland' || s.reason === 'wayland-unsupported') return { text: t('settings.transcribe.captureKeyWayland'), bad: false };
  if (s.reason === 'register-failed' && s.detail === 'in-use-by-meeting') return { text: t('settings.transcribe.captureKeyMeeting', { key: s.key }), bad: true };
  return chordLine(t, s);
}

function chordLine(t: Translate, s: MeetingHotkeyStatusLike): { text: string; bad: boolean } {
  switch (s.reason) {
    case 'floor': return { text: t('settings.transcribe.meetingKeyFloor'), bad: false };
    // Known from the environment before the helper is asked, or the helper's
    // own answer (linux.c: wayland-unsupported): the same sentence.
    case 'wayland':
    case 'wayland-unsupported': return { text: t('settings.transcribe.meetingKeyWayland'), bad: false };
    case 'not-available': return { text: t('settings.transcribe.meetingKeyNoHelper'), bad: false };
    case 'no-tap': return { text: t('settings.transcribe.meetingKeyOldHelper'), bad: false };
    case 'bad-key': return { text: t('settings.transcribe.meetingKeyBad'), bad: true };
    case 'register-failed':
      if (s.detail === 'in-use-by-arm') return { text: t('settings.transcribe.meetingKeySame', { key: s.key }), bad: true };
      return { text: t('settings.transcribe.meetingKeyRefused', { os: OS_WORD[s.platform] ?? s.platform, key: s.key }), bad: true };
    case 'start-failed': return { text: t('settings.transcribe.meetingKeyFailed', { detail: s.detail ?? '' }), bad: true };
    // Any other refusal the helper names (Creed's helpers say why on
    // Wayland, for one): shown red with its word, never swallowed.
    default: return s.reason ? { text: t('settings.transcribe.meetingKeyFailed', { detail: s.detail ? `${s.reason}: ${s.detail}` : s.reason }), bad: true } : { text: '', bad: false };
  }
}

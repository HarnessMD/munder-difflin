/**
 * THE OTHER SIDE OF CALLS, THE LINE UNDER THE SWITCH (0.5.3, F16, PR 5).
 * One sentence saying where the other side of a call would come from on
 * this machine, or why it cannot, from main's `systemAudio:status` answer:
 *   macOS    the Screen Recording grant, granted or not (the row beside it
 *            offers Allow and Open System Settings), or the two reasons the
 *            helper cannot run (macOS 12 and older, a build without it);
 *   Windows  nothing to grant, Windows hands the app what it plays;
 *   Linux    the monitor of the output PulseAudio or PipeWire lists, by its
 *            name, or the reason none is (X11 or Wayland make no difference).
 * Pure: takes the translator so the tests read it without a DOM.
 */
export interface SystemAudioStatusLike {
  platform: string;
  available: boolean;
  granted: boolean;
  source: 'helper' | 'renderer' | null;
  reason?: string;
  detail?: string;
}

export type Translate = (key: string, opts?: Record<string, unknown>) => string;

export function systemAudioLine(t: Translate, s: SystemAudioStatusLike | null): string {
  if (!s) return '';
  if (s.platform === 'darwin') {
    if (s.reason === 'macos-too-old') return t('settings.transcribe.sysAudioMacTooOld');
    if (s.reason === 'no-helper') return t('settings.transcribe.sysAudioNoHelper');
    return `${t('settings.transcribe.sysAudioScreen')}: ${s.granted ? t('settings.transcribe.granted') : t('settings.transcribe.notGranted')}`;
  }
  if (s.platform === 'win32') return t('settings.transcribe.sysAudioWindowsReady');
  if (s.platform === 'linux') return s.available ? t('settings.transcribe.sysAudioMonitorFound', { name: s.detail ?? '' }) : t('settings.transcribe.sysAudioNoMonitor');
  return t('settings.transcribe.sysAudioUnavailable');
}

/** The value of the state attribute the hand tests read. */
export function systemAudioStateKey(s: SystemAudioStatusLike): string {
  return s.available && s.granted ? 'ready' : (s.reason ?? 'not-granted');
}

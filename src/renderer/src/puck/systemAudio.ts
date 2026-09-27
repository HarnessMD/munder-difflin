/**
 * THE OTHER SIDE OF THE CALL, FROM THE RENDERER (0.5.3, F16, You and Them;
 * hive/shared/v053/F16-SYSTEM-AUDIO-PLAN.md, PRs 3 and 4).
 *
 * On the Mac the other side is captured by a helper and handed to main, so
 * the renderer has nothing to open. On Windows and Linux it is a second
 * MediaStream the recorder rolls beside the microphone:
 *   Windows  the screen's loopback audio. The puck asks getDisplayMedia and
 *            main's setDisplayMediaRequestHandler answers with the primary
 *            screen and `audio: 'loopback'` (Electron 31 and later, no
 *            picker, no helper, no driver). The video track is stopped and
 *            dropped here; only the audio goes to the recorder.
 *   Linux    the monitor of the output device. PulseAudio and PipeWire (through
 *            pipewire-pulse) list it as an audio INPUT whose label starts
 *            with "Monitor of", and getUserMedia opens it like a microphone,
 *            with the voice processing off so the far side is not "cancelled"
 *            as echo. Nothing to grant, X11 or Wayland alike: this is audio,
 *            not screen capture. The puck tells main whether a monitor is
 *            listed (`systemAudio:monitor`), at load and whenever the devices
 *            change, so main can answer the Settings row and decide at
 *            meeting start whether the meeting is two track at all.
 * Never throws: a refusal, a missing API or a stream with no audio track
 * is null, and the meeting starts with the microphone alone.
 */
export interface SystemAudioDoors {
  platform: string;
  getDisplayMedia?: (c: DisplayMediaStreamOptions) => Promise<MediaStream>;
  getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>;
  enumerateDevices?: () => Promise<Array<Pick<MediaDeviceInfo, 'kind' | 'label' | 'deviceId'>>>;
  /** Tells main what the Linux probe found; see `systemAudio:monitor`. */
  reportMonitor?: (m: MonitorDevice | null) => void;
  onDeviceChange?: (fn: () => void) => () => void;
}

export interface MonitorDevice { deviceId: string; label: string }

function doors(): SystemAudioDoors {
  const platform = typeof window !== 'undefined' && window.cth?.platform ? String(window.cth.platform) : '';
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  return {
    platform,
    getDisplayMedia: md?.getDisplayMedia ? (c) => md.getDisplayMedia(c) : undefined,
    getUserMedia: md?.getUserMedia ? (c) => md.getUserMedia(c) : undefined,
    enumerateDevices: md?.enumerateDevices ? () => md.enumerateDevices() : undefined,
    reportMonitor: typeof window !== 'undefined' && window.cth?.systemAudioMonitor ? (m) => window.cth.systemAudioMonitor(m) : undefined,
    onDeviceChange: md ? (fn) => { md.addEventListener('devicechange', fn); return () => md.removeEventListener('devicechange', fn); } : undefined
  };
}

/** Keep the audio, stop and drop the video the display request came with. */
export function audioOnly(stream: MediaStream): MediaStream | null {
  for (const t of stream.getVideoTracks()) { try { t.stop(); } catch { /* noop */ } try { stream.removeTrack(t); } catch { /* noop */ } }
  return stream.getAudioTracks().length > 0 ? stream : null;
}

/** The first audio input whose label PulseAudio or PipeWire gave as the
 *  monitor of an output ("Monitor of Built-in Audio Analog Stereo"). Labels
 *  are empty until this page has opened a microphone once; the caller
 *  handles that (`probeMonitor`). */
export function findMonitor(devices: Array<Pick<MediaDeviceInfo, 'kind' | 'label' | 'deviceId'>>): MonitorDevice | null {
  const hit = devices.find((d) => d.kind === 'audioinput' && /^monitor of\b/i.test(d.label.trim()));
  return hit ? { deviceId: hit.deviceId, label: hit.label.trim() } : null;
}

const stopAll = (s: MediaStream): void => { for (const t of s.getTracks()) { try { t.stop(); } catch { /* noop */ } } };

/** Lists the devices and finds the monitor. When every label is empty the
 *  page has never opened a microphone, so one is opened and closed at once
 *  (the recorder opens the real one a moment later) and the list is read
 *  again with its labels. Reports the answer to main when a door for that
 *  is there. */
export async function probeMonitor(d: SystemAudioDoors = doors()): Promise<MonitorDevice | null> {
  let found: MonitorDevice | null = null;
  try {
    if (d.platform === 'linux' && d.enumerateDevices) {
      let devices = await d.enumerateDevices();
      const inputs = devices.filter((x) => x.kind === 'audioinput');
      if (inputs.length > 0 && inputs.every((x) => !x.label) && d.getUserMedia) {
        try { stopAll(await d.getUserMedia({ audio: true })); devices = await d.enumerateDevices(); } catch { /* no microphone grant: the labels stay empty */ }
      }
      found = findMonitor(devices);
    }
  } catch { found = null; }
  try { d.reportMonitor?.(found); } catch { /* noop */ }
  return found;
}

/** Keeps main's picture of the Linux monitor current: one probe now and one
 *  on every device change. Returns the disposer. No-op off Linux. */
export function watchMonitor(d: SystemAudioDoors = doors()): () => void {
  if (d.platform !== 'linux') return () => {};
  void probeMonitor(d);
  const off = d.onDeviceChange ? d.onDeviceChange(() => { void probeMonitor(d); }) : () => {};
  return off;
}

export async function openSystemStream(d: SystemAudioDoors = doors()): Promise<MediaStream | null> {
  try {
    if (d.platform === 'win32') {
      if (!d.getDisplayMedia) return null;
      // Both are asked for: Chromium refuses an audio only display request.
      const stream = await d.getDisplayMedia({ video: true, audio: true });
      return audioOnly(stream);
    }
    if (d.platform === 'linux') {
      if (!d.getUserMedia) return null;
      const monitor = await probeMonitor(d);
      if (!monitor) return null;
      // The far side is not a voice to clean up: no echo cancellation (it
      // would cancel exactly the sound we want), no noise gate, no gain.
      const stream = await d.getUserMedia({ audio: { deviceId: { exact: monitor.deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (stream.getAudioTracks().length === 0) { stopAll(stream); return null; }
      return stream;
    }
    return null;
  } catch {
    return null;
  }
}

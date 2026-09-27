/**
 * A `window.cth` for the harness, installed only when there is none (so this
 * file is inert inside the app). Every unknown call answers a resolved
 * `undefined`; every `on*` listener returns an unsubscribe. The puck's calls
 * answer sample data so its screen and its window draw every state from
 * props. Nothing here is the app's behaviour; it is what a screen sees when
 * main is not there, made plausible enough to look at.
 */
import { DEFAULT_PUCK_CONFIG, DEFAULT_PUCK_STATE, ringFootprint, type PuckMeeting, type PuckScreenshot } from '@shared/puck';

const SVG_THUMB = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="150"><rect width="240" height="150" fill="#cfe5e9"/><rect x="18" y="18" width="204" height="24" rx="4" fill="#fff8e7"/><rect x="18" y="56" width="140" height="12" rx="3" fill="#a899b5"/><rect x="18" y="76" width="180" height="12" rx="3" fill="#a899b5"/><rect x="18" y="96" width="110" height="12" rx="3" fill="#a899b5"/></svg>'
);

const MEETINGS: PuckMeeting[] = [
  {
    id: '2026-09-07_10-32-05', title: 'Meeting 7/9/2026, 10:32', startedAt: '2026-09-07T10:32:05.000Z', endedAt: '2026-09-07T11:04:40.000Z',
    status: 'done', dir: '/Users/you/HarnessAgents/puck/meetings/2026-09-07_10-32-05', transcriptPath: '/Users/you/HarnessAgents/puck/meetings/2026-09-07_10-32-05/transcript.md',
    durationMs: 32 * 60_000, hit: null,
    // Transcribed yesterday, so the sweep has already taken the audio: the
    // preview draws the line a person sees a day after a meeting.
    segments: [0, 1, 2, 3].map((seq) => ({
      seq, file: `seg-00${seq + 1}.webm`, startMs: seq * 600_000, durationMs: 600_000, transcribed: true, error: null,
      transcribedAt: '2026-09-07T11:05:00.000Z', audioDeletedAt: '2026-09-08T11:05:00.000Z'
    }))
  },
  {
    id: '2026-09-06_15-00-12', title: 'Meeting 6/9/2026, 15:00', startedAt: '2026-09-06T15:00:12.000Z', endedAt: '2026-09-06T15:21:00.000Z',
    status: 'pending', dir: '/Users/you/HarnessAgents/puck/meetings/2026-09-06_15-00-12', transcriptPath: '/Users/you/HarnessAgents/puck/meetings/2026-09-06_15-00-12/transcript.md',
    durationMs: 21 * 60_000, hit: null,
    // Still pending, so every byte is still there: audio waiting for a key is
    // never on the clock.
    segments: [0, 1, 2].map((seq) => ({
      seq, file: `seg-00${seq + 1}.webm`, startMs: seq * 600_000, durationMs: 600_000, transcribed: seq === 0, error: null,
      transcribedAt: seq === 0 ? '2026-09-06T15:22:00.000Z' : null, audioDeletedAt: null
    }))
  }
];

const TRANSCRIPT = `# Meeting 7/9/2026, 10:32\n\nStarted 2026-09-07T10:32:05.000Z\n\n[00:00] Right, the release. Creed has the desktop half at c08 and the web half is frozen at 773, so the founder runs the review script top to bottom before anything moves.\n\n[10:00] On the puck: the ring needs the screenshot on top, the two recorders at the shoulders, and the disabled one low where a hand does not reach for it.\n\n[20:00] Meeting audio is the microphone only. If somebody wants the other side of a call captured that is a system audio question, and it is not this card.\n\n[30:00] Action: the transcript folder sits beside the hive, not inside it, because the hive commits on every message.\n`;

const SCREENSHOTS: PuckScreenshot[] = [
  { path: '/Users/you/HarnessAgents/puck/screenshots/2026-09-07_11-20-02.png', takenAt: '2026-09-07T11:20:02.000Z', note: 'The invoice total is wrong, it should be 39 per seat.', sentAt: '2026-09-07T11:20:40.000Z', width: 640, height: 400, thumb: SVG_THUMB, deletedAt: null },
  { path: '/Users/you/HarnessAgents/puck/screenshots/2026-09-07_09-05-51.png', takenAt: '2026-09-07T09:05:51.000Z', note: null, sentAt: null, width: 480, height: 300, thumb: SVG_THUMB, deletedAt: null }
];

export function installCthStub(): void {
  const w = window as unknown as { cth?: unknown };
  if (w.cth) return;
  const side = ringFootprint(DEFAULT_PUCK_CONFIG.size);
  const answers: Record<string, unknown> = {
    puckState: { ...DEFAULT_PUCK_STATE, shown: true, canTranscribe: true, screenAccess: 'granted', offset: { x: side / 2, y: side / 2 } },
    puckConfig: { ...DEFAULT_PUCK_CONFIG, enabled: true, captureRegion: { x: 220, y: 140, width: 640, height: 400, displayId: '1' } },
    puckMeetings: MEETINGS,
    puckMeetingTranscript: { ok: true, text: TRANSCRIPT, meta: MEETINGS[0] },
    puckScreenshots: SCREENSHOTS,
    puckSend: { ok: true, id: 'preview' },
    updateConfig: {},
    integrationsList: [],
    integrationsTemplates: []
  };
  // A frame may install its own answer for a call (`window.cth.x = fn`) to
  // make a screen live in the harness; an own property wins over the table.
  w.cth = new Proxy({} as Record<string, unknown>, {
    get(t, key: string) {
      if (Object.prototype.hasOwnProperty.call(t, key)) return t[key];
      if (key.startsWith('on')) return () => () => {};
      if (key in answers) return () => Promise.resolve(answers[key]);
      return () => Promise.resolve(undefined);
    }
  });
}

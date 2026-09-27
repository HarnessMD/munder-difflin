/**
 * The puck's recorder. Two shapes of capture from one microphone:
 *
 *   MEETING   long. The recorder ROLLS every `segmentMs`: the running
 *             MediaRecorder is stopped, its clip is handed to main as one
 *             segment, and a fresh MediaRecorder starts on the same stream.
 *             Each segment is a complete file with its own header, so each
 *             transcribes on its own and the transcript grows while the
 *             meeting is still going. The gap between two segments is one
 *             event loop turn.
 *   MESSAGE   short, and written down while it is spoken (founder, 7 Sep
 *             2026). It rolls too, at a PAUSE in the voice: a meter on the
 *             stream reads the level ten times a second, and once a part is
 *             at least PUCK_MESSAGE_SEGMENT.minMs old and the voice has been
 *             quiet for pauseMs, the part is handed over and a new one
 *             starts, so the cut falls between words and not inside one.
 *             A part never runs past maxMs. The whole message stops itself
 *             at PUCK_MESSAGE_MAX_SECONDS. Without an AudioContext (an old
 *             engine, a test) parts roll on maxMs alone.
 *
 * Free Flow's recorder (src/renderer/src/freeflow/recorder.ts) is the model
 * for the mic handling; it is not reused because it is bound to the app's
 * store and delivers into a composer draft, and this window has neither.
 */
import { blobToWav16k } from '../audio/toWav';
import { PUCK_MESSAGE_MAX_SECONDS, PUCK_MESSAGE_SEGMENT } from '@shared/puck';

export type RecorderMode =
  | { kind: 'meeting'; meetingId: string; segmentMs: number }
  | { kind: 'message' };

export interface ClipBytes { audio: ArrayBuffer; mimeType: string }
/** Which side of the call a clip is: the microphone, or the other side. */
export type ClipTrack = 'you' | 'them';
export type ClipHandler = (clip: ClipBytes, final: boolean, track: ClipTrack) => Promise<void>;

let stream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
/* THE OTHER SIDE (0.5.3, F16, You and Them): a second stream, when the
   caller has one, recorded by a second MediaRecorder that starts, rolls and
   stops in step with the microphone's, so the two clips of a segment cover
   the same seconds and carry the same seq. Its clip is delivered first; the
   microphone's delivery waits for it, so a segment's other side is on disk
   before the next segment starts and before a stop resolves. */
let themStream: MediaStream | null = null;
let themRecorder: MediaRecorder | null = null;
let themChunks: Blob[] = [];
let themDone: Promise<void> | null = null;
let mode: RecorderMode | null = null;
let seq = 0;
let startedAt = 0;
let segmentStartedAt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let capTimer: ReturnType<typeof setTimeout> | null = null;
let onClip: ClipHandler | null = null;
let finalResolve: (() => void) | null = null;
let meter: { ctx: AudioContext; tick: ReturnType<typeof setInterval> } | null = null;
let quietSince = 0;
/** A segment is being handed over (between a roll's stop and the next
 *  segment). A stop that lands here must wait for it, not tear down under it:
 *  that race left the Stapler stuck in "listening" (founder, 25 Sep 2026). */
let delivering = false;
/** Every part handed over so far, written down in order: the next one waits. */
let written: Promise<void> = Promise.resolve();
/** Bumped by cancel(): a start still waiting on the microphone checks it and
 *  gives the stream back instead of recording into a take already dropped. */
let generation = 0;
/** The last level the meter read (0 when no meter), and when anything last
 *  happened: a start, a level read, a chunk. The Stapler's meter and its
 *  watchdog read these. */
let lastLevel = 0;
let lastActivity = 0;

/** Prefer opus in webm; fall back to whatever the platform records. */
function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  for (const c of candidates) { try { if (MediaRecorder.isTypeSupported(c)) return c; } catch { /* next */ } }
  return '';
}

function teardown(): void {
  if (timer) { clearTimeout(timer); timer = null; }
  if (capTimer) { clearTimeout(capTimer); capTimer = null; }
  if (meter) { clearInterval(meter.tick); void meter.ctx.close().catch(() => undefined); meter = null; }
  try { stream?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
  try { themStream?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
  stream = null;
  recorder = null;
  chunks = [];
  themStream = null;
  themRecorder = null;
  themChunks = [];
  themDone = null;
  mode = null;
}

function startSegment(): void {
  if (!stream) return;
  const mimeType = pickMimeType();
  const r = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  chunks = [];
  segmentStartedAt = Date.now();
  quietSince = 0;
  r.ondataavailable = (ev: BlobEvent) => { if (ev.data && ev.data.size > 0) { chunks.push(ev.data); lastActivity = Date.now(); } };
  // The take this part belongs to: a part whose onstop comes after its take
  // ended (a stop, a cancel) is dropped, never handed to the next take.
  const take = generation;
  r.onstop = () => {
    if (take !== generation) return;
    const type = r.mimeType || mimeType || 'audio/webm';
    // This part's audio, taken before the next part starts over `chunks`.
    const blob = new Blob(chunks, { type });
    chunks = [];
    // A message rolled at a pause: the next part starts NOW, before this one
    // is written down, so nothing said during the transcription is lost
    // (25 Sep 2026: it was, up to a second and a half at every pause). The
    // parts are written down one after another (`written`), so the words
    // still land in the order they were said. A meeting segment, or the
    // last part, is handed over as before.
    if (mode?.kind === 'message' && finalResolve === null) {
      startSegment();
      arm();
      delivering = false;
      const prev = written;
      written = prev.then(() => deliverPart(blob, type, take));
      return;
    }
    delivering = true;
    const prev = written;
    written = prev.then(() => deliver(blob, type)).finally(() => { delivering = false; });
  };
  recorder = r;
  if (themStream) {
    const tr = mimeType ? new MediaRecorder(themStream, { mimeType }) : new MediaRecorder(themStream);
    themChunks = [];
    tr.ondataavailable = (ev: BlobEvent) => { if (ev.data && ev.data.size > 0) themChunks.push(ev.data); };
    let settle: () => void = () => {};
    themDone = new Promise<void>((res) => { settle = res; });
    tr.onstop = () => { void deliverThem(tr.mimeType || mimeType || 'audio/webm').finally(settle); };
    themRecorder = tr;
    tr.start();
  }
  r.start();
}

/** The other side's clip for the segment that just ended. */
async function deliverThem(type: string): Promise<void> {
  const blob = new Blob(themChunks, { type });
  themChunks = [];
  if (blob.size === 0) return;
  const wav = await blobToWav16k(blob, 'them');
  const clip: ClipBytes = wav ? { audio: wav.audio, mimeType: wav.mimeType } : { audio: await blob.arrayBuffer(), mimeType: type.split(';')[0] };
  const cb = onClip;
  if (cb) { try { await cb(clip, false, 'them'); } catch { /* the caller reports */ } }
}

/** A message part that rolled at a pause, the next part already recording:
 *  written down, never the last one (the running part carries `final`). */
async function deliverPart(blob: Blob, type: string, take: number): Promise<void> {
  if (take !== generation || blob.size === 0) return;
  const wav = await blobToWav16k(blob, 'segment');
  const clip: ClipBytes = wav ? { audio: wav.audio, mimeType: wav.mimeType } : { audio: await blob.arrayBuffer(), mimeType: type.split(';')[0] };
  if (take !== generation) return;
  const cb = onClip;
  if (cb) { try { await cb(clip, false, 'you'); } catch { /* the caller reports */ } }
}

/** The active segment ended (a meeting's roll, a stop or the cap): hand it
 *  over, and either start the next one or finish for good. It runs after
 *  every part before it has been written down. */
async function deliver(blob: Blob, type: string): Promise<void> {
  const gen = generation;
  // The other side first, for the same seq.
  if (themDone) { await themDone; themDone = null; }
  // 0.5.3, F16: the local recognisers read wav, so each segment is decoded
  // and resampled here; an undecodable clip goes out as recorded.
  const wav = blob.size > 0 ? await blobToWav16k(blob, 'segment') : null;
  const clip: ClipBytes = wav ? { audio: wav.audio, mimeType: wav.mimeType } : { audio: await blob.arrayBuffer(), mimeType: type.split(';')[0] };
  // Cancelled while this part was being read: it goes nowhere.
  if (gen !== generation) return;
  // Read AFTER the awaits: a stop that came in while this part was being
  // decoded makes this the last part, so the caller still hears `final`.
  const final = finalResolve !== null;
  const cb = onClip;
  if (cb && (blob.size > 0 || final)) { try { await cb(clip, final, 'you'); } catch { /* the caller reports */ } }
  if (final) {
    const done = finalResolve;
    finalResolve = null;
    teardown();
    done?.();
    return;
  }
  // A stop that came in while this part was being written down (the handler
  // above awaits the transcription): the take is over, so no next part may
  // start. Before this, one did, and it recorded until the next pause, 2 to 3
  // seconds past the click, and those words were appended (founder, 25 Sep
  // 2026). The handler still hears `final`, with no audio.
  if (finalResolve) { await finishEmpty(); return; }
  seq += 1;
  startSegment();
  arm();
}

/** End the active part and start the next; the clip goes out from onstop. */
function roll(): void {
  if (!recorder || recorder.state !== 'recording') return;
  // The hand over starts here, not at onstop: the recorder says it stopped
  // on a later turn, and a Stop in between found no running part, ended the
  // take at once, and the part then landed after the end (25 Sep 2026).
  delivering = true;
  if (themRecorder && themRecorder.state === 'recording') { try { themRecorder.stop(); } catch { /* its clip is lost, the microphone's is not */ } }
  try { recorder.stop(); } catch { /* deliver runs from onstop */ }
}

/** The roll timer: a meeting's segment length, or a message part's longest
 *  run when no pause comes. */
function arm(): void {
  if (timer) clearTimeout(timer);
  if (!mode) return;
  const ms = mode.kind === 'meeting' ? mode.segmentMs : PUCK_MESSAGE_SEGMENT.maxMs;
  timer = setTimeout(roll, ms);
}

/** The whole message stops itself at the cap. */
function armCap(): void {
  if (capTimer) clearTimeout(capTimer);
  if (mode?.kind !== 'message') return;
  capTimer = setTimeout(() => { void stop(); }, PUCK_MESSAGE_MAX_SECONDS * 1000);
}

/** The level meter that finds a pause in a message. Best effort: without an
 *  AudioContext the parts roll on the timer alone. */
function startMeter(): void {
  if (mode?.kind !== 'message' || !stream || typeof AudioContext === 'undefined') return;
  try {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const tick = setInterval(() => {
      if (!recorder || recorder.state !== 'recording') return;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const now = Date.now();
      lastLevel = rms;
      if (rms >= PUCK_MESSAGE_SEGMENT.quiet) lastActivity = now;
      if (rms >= PUCK_MESSAGE_SEGMENT.quiet) { quietSince = 0; return; }
      if (!quietSince) { quietSince = now; return; }
      if (now - segmentStartedAt >= PUCK_MESSAGE_SEGMENT.minMs && now - quietSince >= PUCK_MESSAGE_SEGMENT.pauseMs) roll();
    }, 100);
    meter = { ctx, tick };
  } catch { meter = null; }
}

export function isRecording(): boolean {
  return mode !== null;
}

/** The meter's last reading (RMS), for the Stapler's live level. */
export function level(): number {
  return mode ? lastLevel : 0;
}

/** When the take last showed life: its start, a voice above the quiet line,
 *  or a chunk of audio. The Stapler's watchdog drops a take that has none
 *  for a minute. */
export function lastActive(): number {
  return lastActivity;
}

export function segmentInfo(): { seq: number; startMs: number; durationMs: number } {
  return { seq, startMs: segmentStartedAt - startedAt, durationMs: Date.now() - segmentStartedAt };
}

/**
 * Open the microphone and start. `clip` is called for every segment with
 * `final` true on the last one. Resolves once recording is running, or with
 * the reason it could not start; never throws.
 */
export async function start(m: RecorderMode, clip: ClipHandler, opts: { them?: MediaStream | null } = {}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (mode) return { ok: false, error: 'already recording' };
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return { ok: false, error: 'no microphone api' };
  const gen = ++generation;
  // Claim the recorder now, so a second start while the microphone prompt is
  // up is refused and a cancel meanwhile has something to cancel.
  mode = m;
  lastActivity = Date.now();
  lastLevel = 0;
  let opened: MediaStream;
  try {
    // Batch 2 #9: a meeting asks for Chromium's voice processing by name. These
    // are Chromium's defaults for `audio: true` already, so nothing changes on
    // the wire; it is said here so nobody turns it off. Its echo canceller
    // only knows sound Chromium itself plays, so a call app's audio through
    // loud speakers still reaches this track; shared/meetingEcho.ts cleans
    // the transcript for that.
    opened = await navigator.mediaDevices.getUserMedia(m.kind === 'meeting'
      ? { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
      : { audio: true });
  } catch (e) {
    if (gen === generation) mode = null;
    const name = e instanceof DOMException ? e.name : '';
    return { ok: false, error: name === 'NotAllowedError' ? 'mic-denied' : 'mic-failed' };
  }
  if (gen !== generation) {
    // Cancelled while the microphone was opening: give it straight back.
    try { opened.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    return { ok: false, error: 'cancelled' };
  }
  stream = opened;
  // A second track only for a meeting: a spoken message is yours alone.
  themStream = m.kind === 'meeting' && opts.them && opts.them.getAudioTracks().length > 0 ? opts.them : null;
  mode = m;
  onClip = clip;
  seq = 0;
  written = Promise.resolve();
  startedAt = Date.now();
  try {
    startSegment();
  } catch {
    teardown();
    return { ok: false, error: 'recording not supported' };
  }
  arm();
  armCap();
  startMeter();
  return { ok: true };
}

/** Stop for good. Resolves after the last segment has been delivered, and
 *  the caller's clip handler ALWAYS hears `final` once, even when there was
 *  no running segment to stop (it then gets an empty clip): that call is
 *  what tells main the take is over. */
export function stop(): Promise<void> {
  if (!mode) return Promise.resolve();
  if (timer) { clearTimeout(timer); timer = null; }
  if (capTimer) { clearTimeout(capTimer); capTimer = null; }
  if (finalResolve) {
    // A second stop while the first is finishing: wait for the same end.
    const first = finalResolve;
    return new Promise<void>((resolve) => { finalResolve = () => { first(); resolve(); }; });
  }
  return new Promise<void>((resolve) => {
    finalResolve = resolve;
    // A part is being handed over: deliver() reads finalResolve after it and
    // makes that part the last one, or ends the take without another.
    if (delivering) { releaseMic(); return; }
    if (!recorder || recorder.state !== 'recording') { releaseMic(); void finishEmpty(); return; }
    if (themRecorder && themRecorder.state === 'recording') { try { themRecorder.stop(); } catch { /* its clip is lost */ } }
    try { recorder.stop(); } catch { void finishEmpty(); }
    releaseMic();
  });
}

/** The microphone goes at the click: its tracks end and the meter stops, so
 *  nothing said after Stop or Done is recorded, and the system's microphone
 *  light goes out. What was recorded before the click is still delivered. */
function releaseMic(): void {
  if (meter) { clearInterval(meter.tick); void meter.ctx.close().catch(() => undefined); meter = null; }
  try { stream?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
  try { themStream?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
}

/** Nothing is left to record: the handler still hears `final` (with no
 *  audio), then everything is let go. */
async function finishEmpty(): Promise<void> {
  // A start still waiting on the microphone must not record after this.
  generation += 1;
  const cb = onClip;
  const done = finalResolve;
  finalResolve = null;
  if (cb) { try { await cb({ audio: new ArrayBuffer(0), mimeType: 'audio/webm' }, true, 'you'); } catch { /* the caller reports */ } }
  teardown();
  done?.();
}

/** Drop the take: no clip goes anywhere, the microphone is let go at once,
 *  and a start still waiting on the microphone gives it back when it opens.
 *  The caller tells main (puckMessageStop with no audio). Safe at any time. */
export function cancel(): void {
  generation += 1;
  const done = finalResolve;
  finalResolve = null;
  onClip = null;
  // Disarmed whatever its state: a part rolled a moment ago still has its
  // onstop to come, and it must not land in the next take.
  try { if (recorder) { recorder.onstop = null; if (recorder.state === 'recording') recorder.stop(); } } catch { /* torn down below */ }
  try { if (themRecorder) { themRecorder.onstop = null; if (themRecorder.state === 'recording') themRecorder.stop(); } } catch { /* torn down below */ }
  teardown();
  delivering = false;
  lastLevel = 0;
  done?.();
}

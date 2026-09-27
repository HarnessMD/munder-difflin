/**
 * RECORD MESSAGE FROM THE STAPLER (founder, 25 Sep 2026, batch 2): "simple
 * done or cancel buttons that come up while listening and after we click on
 * done then the transcribed text should show up on the UI with text written
 * and the mic and add screenshot the entire mini input area we show."
 *
 * A take started from the ring goes through four phases:
 *
 *   starting      the microphone is opening (the first time, macOS asks)
 *   listening     the eyes, the live level, and exactly Done and Cancel
 *   transcribing  Done was pressed: the last part is being written down
 *   card          the compose card, the words already in its box
 *
 * Cancel (or Esc) from any phase before the card drops the audio and goes
 * back to idle. A click on the disc while listening does nothing: the two
 * buttons are the only way out, so a stray click cannot open a half written
 * card (what the founder saw).
 *
 * Import free, so test/load-ts.cjs runs it.
 */

export type TakePhase = 'idle' | 'starting' | 'listening' | 'transcribing' | 'card';

export interface TakeInputs {
  /** The take was started from the ring (no card was open). */
  ringTake: boolean;
  /** Main says a message is recording. */
  recording: boolean;
  /** The Stapler's busy state. */
  busy: 'send' | 'transcribe' | 'starting' | 'stopping' | null;
  /** A compose card exists. */
  card: boolean;
}

export function takePhase(i: TakeInputs): TakePhase {
  if (!i.ringTake) return i.card ? 'card' : 'idle';
  if (i.busy === 'starting') return 'starting';
  if (i.recording) return 'listening';
  if (i.busy === 'transcribe' || i.busy === 'stopping') return 'transcribing';
  return i.card ? 'card' : 'idle';
}

/** A take with no sign of life this long is dropped: no voice above the
 *  quiet line, no audio chunk, no end. Kevin, 25 Sep: "a watchdog must drop a
 *  listening state that gets no audio or no end event (say 60 s after the
 *  last level update)". */
export const TAKE_WATCHDOG_MS = 60_000;

/** Whether the watchdog should drop the take now. Only a live phase can
 *  expire; `lastActive` is the recorder's last sign of life (or the take's
 *  start, when the recorder never started). */
export function takeExpired(phase: TakePhase, lastActive: number, now: number, limit = TAKE_WATCHDOG_MS): boolean {
  if (phase !== 'starting' && phase !== 'listening' && phase !== 'transcribing') return false;
  return now - lastActive >= limit;
}

/** Dictation from anywhere (the Option hold) shows on the Stapler too; its
 *  listening or transcribing view is dropped when main sends nothing for as
 *  long, so a lost end event cannot leave the eyes stuck. */
export function dictationExpired(phase: string, lastEvent: number, now: number, limit = TAKE_WATCHDOG_MS): boolean {
  return (phase === 'listening' || phase === 'transcribing') && now - lastEvent >= limit;
}

/** Main's own safety net: a message still marked recording this long after
 *  it started is cleared, whatever the Stapler window did (it may have
 *  crashed or reloaded). The take stops itself at `maxSeconds`, so this sits
 *  a watchdog's length past that. */
export function messageOverdue(startedAt: number, now: number, maxSeconds: number, limit = TAKE_WATCHDOG_MS): boolean {
  return now - startedAt >= maxSeconds * 1000 + limit;
}

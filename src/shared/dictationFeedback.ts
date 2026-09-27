/**
 * WHAT THE STAPLER SHOWS WHILE YOU DICTATE FROM ANYWHERE (0.5.3, founder
 * 24 Sep 2026: "change the eyes ... into the last expression ... a small
 * visual feedback of voice getting dictated ... a dictation start and
 * dictation stop sound").
 *
 * main forwards the any app loop's events to the Stapler window as
 * `puck:dictation` (src/main/puck.ts puckDictationEvent). This file turns that
 * stream into one small view, and says when a sound plays:
 *
 *   keydown       listening: the eyes switch to `thinking`, the meter runs,
 *                 the start sound plays
 *   level         one more bar on the meter (listening only)
 *   keyup         transcribing: the stop sound plays
 *   transcribing  transcribing
 *   injected, empty, tap, helper-exited   back to normal
 *   cancelled     back to normal, the stop sound if it was listening
 *   error         a short error; `permission` names what to grant
 *
 * Import free, so test/load-ts.cjs runs it.
 */

export interface PuckDictationEvent {
  type: string;
  /** The Settings switch for the start and stop sounds. */
  sounds: boolean;
  rms?: number;
  peak?: number;
  error?: string;
  detail?: string;
  why?: string;
  text?: string;
}

export type DictationPhase = 'idle' | 'listening' | 'transcribing' | 'error';

export interface DictationView {
  phase: DictationPhase;
  /** The meter, oldest first, each 0 to 1. */
  levels: number[];
  /** The error code on `error`: 'permission' (detail says which), or the loop's. */
  error?: string;
  detail?: string;
}

export const METER_BARS = 14;
export const IDLE_VIEW: DictationView = { phase: 'idle', levels: [] };

/** Loudness to bar height. Speech sits around 0.02 to 0.2 RMS; a square
 *  root spreads that over the bar, and a quiet room stays near the floor. */
export function levelOf(rms: number): number {
  if (!Number.isFinite(rms) || rms <= 0) return 0;
  return Math.min(1, Math.sqrt(rms / 0.2));
}

export function dictationStep(v: DictationView, e: PuckDictationEvent): { view: DictationView; sound: 'start' | 'stop' | null } {
  const sound = (s: 'start' | 'stop'): 'start' | 'stop' | null => (e.sounds ? s : null);
  switch (e.type) {
    case 'keydown':
      return { view: { phase: 'listening', levels: [] }, sound: sound('start') };
    case 'level':
      if (v.phase !== 'listening') return { view: v, sound: null };
      return { view: { ...v, levels: [...v.levels, levelOf(Number(e.rms ?? 0))].slice(-METER_BARS) }, sound: null };
    case 'keyup':
      return { view: { phase: 'transcribing', levels: v.levels }, sound: v.phase === 'listening' ? sound('stop') : null };
    case 'transcribing':
      return { view: { phase: 'transcribing', levels: v.levels }, sound: null };
    case 'cancelled':
      return { view: IDLE_VIEW, sound: v.phase === 'listening' ? sound('stop') : null };
    case 'injected': case 'empty': case 'tap': case 'helper-exited':
      return { view: IDLE_VIEW, sound: null };
    case 'error':
      return { view: { phase: 'error', levels: [], error: e.error ?? 'error', detail: e.detail }, sound: v.phase === 'listening' ? sound('stop') : null };
    default:
      return { view: v, sound: null };
  }
}

/** The two nudges, as notes for a tiny synth: start rises, stop falls. Each
 *  is under 200 ms and quiet (peak gain 0.05), and nothing is fetched. */
export const DICTATION_SOUNDS: Record<'start' | 'stop', Array<{ freq: number; at: number; dur: number }>> = {
  start: [{ freq: 660, at: 0, dur: 0.07 }, { freq: 990, at: 0.07, dur: 0.09 }],
  stop: [{ freq: 880, at: 0, dur: 0.07 }, { freq: 587, at: 0.07, dur: 0.09 }]
};
export const DICTATION_SOUND_GAIN = 0.05;

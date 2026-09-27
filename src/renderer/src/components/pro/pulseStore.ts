/**
 * W-C, THE MESSAGE PULSE (0.4.9 phase 6, plan Part 6): the store half.
 *
 * When the orchestrator routes a message the UI shows it moving: both cards
 * light up with the accent ring, a dot travels from the source card to the
 * destination card, and the two sidebar rows glow for the same beat. This
 * file is the beats themselves, kept pure (no React, no DOM) so a test can
 * drive it with its own clock; MessagePulse.tsx is the subscription, the
 * hooks and the overlay.
 *
 * A beat lives BEAT_MS then expires; one timer at a time walks the list.
 * Under load the dots stop and the glows stay: more than MAX_DOTS_PER_WINDOW
 * beats inside THROTTLE_WINDOW_MS coalesce into glows without travelling
 * dots, because twenty dots crossing a grid at once is noise, and the ring
 * still says who is talking. A message to or from the person (`human`) has
 * no card at one end, so it glows the agent only and never draws a dot.
 */
export interface Beat {
  id: number;
  from: string;
  to: string;
  /** When the beat started, ms since the epoch. */
  at: number;
  /** Whether a dot travels; false when throttled or when one end is a person. */
  dot: boolean;
}

export const BEAT_MS = 1200;
export const DOT_MS = 900;
export const THROTTLE_WINDOW_MS = 1000;
export const MAX_DOTS_PER_WINDOW = 6;
/** The id the router uses for the person; the orchestrator is `god`. */
export const HUMAN_ID = 'human';

let beats: Beat[] = [];
let recent: number[] = [];
let seq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const subs = new Set<() => void>();

function emit(): void {
  subs.forEach((f) => f());
}

export function subscribeBeats(cb: () => void): () => void {
  subs.add(cb);
  return () => { subs.delete(cb); };
}

export function readBeats(): Beat[] {
  return beats;
}

/** Whether `id` is at either end of a live beat: the ring and the row glow. */
export function isLive(id: string): boolean {
  return beats.some((b) => b.from === id || b.to === id);
}

/** Record a routed message. Returns the beat, or null for nothing to show. */
export function pulse(from: string, to: string, now: number = Date.now()): Beat | null {
  if (!from || !to || from === to) return null;
  recent = recent.filter((t) => now - t < THROTTLE_WINDOW_MS);
  recent.push(now);
  const dot = recent.length <= MAX_DOTS_PER_WINDOW && from !== HUMAN_ID && to !== HUMAN_ID;
  const beat: Beat = { id: ++seq, from, to, at: now, dot };
  beats = [...beats, beat];
  emit();
  schedule(now);
  return beat;
}

/** Drop every beat older than BEAT_MS. Exported so a test can tick the clock. */
export function expireBeats(now: number = Date.now()): void {
  const next = beats.filter((b) => now - b.at < BEAT_MS);
  if (next.length !== beats.length) {
    beats = next;
    emit();
  }
}

function schedule(now: number): void {
  if (timer !== null || beats.length === 0) return;
  const soonest = Math.min(...beats.map((b) => b.at + BEAT_MS));
  timer = setTimeout(() => {
    timer = null;
    const t = Date.now();
    expireBeats(t);
    schedule(t);
  }, Math.max(0, soonest - now) + 5);
}

/** Forget everything, including the pending timer. Tests only. */
export function resetPulse(): void {
  beats = [];
  recent = [];
  if (timer !== null) { clearTimeout(timer); timer = null; }
  emit();
}

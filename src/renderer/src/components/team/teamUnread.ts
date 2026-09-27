/**
 * What "unread" means on the Team button (phase 8): a message a TEAMMATE
 * sent that arrived after you last had their thread open in the Team
 * window. Your own messages never count, and a delivery state changing on
 * one of yours does not either.
 *
 * THE MARK IS THIS MACHINE'S, in localStorage, keyed by member id. It is a
 * per-machine convenience, not a fact main owns: the relay never knew a
 * message was read (`Delivery` has no `read` on purpose, shared/teams.ts)
 * and this adds nothing to the wire. Losing the marks costs a badge and
 * nothing else. A thread with no mark counts every message of theirs,
 * which is the honest answer for a thread you have never opened here.
 *
 * Pure apart from the two storage functions, which guard `window` so a
 * test can load this file under node.
 */
import type { ThreadEntry } from '@shared/teams';

export type SeenMarks = Record<string, string>;

const STORAGE_KEY = 'cth.teamWindow.seen';

export function readSeen(): SeenMarks {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: SeenMarks = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeSeen(marks: SeenMarks): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(marks));
  } catch {
    /* private mode, or no window: the badge is the only thing lost */
  }
}

function stamp(at: string): number {
  const n = Date.parse(at);
  return Number.isFinite(n) ? n : NaN;
}

/** Teammate messages newer than the mark. No mark means every one of theirs. */
export function unreadCount(messages: ThreadEntry[], seenAt: string | undefined): number {
  const since = seenAt ? stamp(seenAt) : -Infinity;
  let n = 0;
  for (const m of messages) {
    if (m.from === 'you') continue;
    const t = stamp(m.at);
    if (Number.isFinite(t) && t > since) n++;
  }
  return n;
}

/** The mark that makes a thread fully read: its newest teammate message. */
export function latestTheirs(messages: ThreadEntry[]): string | null {
  let best: string | null = null;
  let bestT = -Infinity;
  for (const m of messages) {
    if (m.from === 'you') continue;
    const t = stamp(m.at);
    if (Number.isFinite(t) && t > bestT) { bestT = t; best = m.at; }
  }
  return best;
}

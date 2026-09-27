/**
 * Whether the Team window is open (v0.4.9 phase 8, plan Part 7, Option B).
 *
 * A STORE, NOT A PROP, because the window is designed for more than one
 * door: the titlebar button and its chord open it today, and 0.5.0's
 * Reception desk on the floor (Option A) opens the same panel from the
 * scene, which has no path to App's state. Same subscribable shape as
 * teamsState.ts, and like it no localStorage: an open window is not a
 * preference worth remembering across a relaunch.
 *
 * `openTeamWindow(mate)` also selects the person, through the same
 * `openThread` PRO's thread pane reads, so a door that knows who you meant
 * lands on their conversation.
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { Teammate } from './types';
import { openThread } from './teamsState';
import { isTeamWindowChord } from './teamWindowKeys';

let open = false;
const subscribers = new Set<() => void>();

function set(next: boolean): void {
  if (next === open) return;
  open = next;
  subscribers.forEach((fn) => fn());
}

export function openTeamWindow(mate?: Teammate): void {
  if (mate) openThread(mate);
  set(true);
}

export function closeTeamWindow(): void {
  set(false);
}

export function toggleTeamWindow(): void {
  set(!open);
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function useTeamWindowOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open);
}

/**
 * The chord, armed by App for Classic only: PRO has its own Team screen and
 * its own chord table, and a window over it would be a second door to a
 * destination that already has one. Capture phase, so a focused terminal
 * never sees the keystroke.
 */
export function useTeamWindowShortcut(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!isTeamWindowChord(e)) return;
      e.preventDefault();
      e.stopPropagation();
      toggleTeamWindow();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled]);
}

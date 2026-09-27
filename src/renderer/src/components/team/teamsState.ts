/**
 * Which teammate's thread is open.
 *
 * D11 is a pane, and panes are addressed by id, but "the thread with Pam" is a
 * pane WITH AN ARGUMENT and `extraPanes` is keyed by a fixed string. The built-in
 * panes already solve this the same way — `agent:<id>` selects the agent in the
 * store and the layout reads it back — so this mirrors that rather than inventing
 * a parametrised pane id the seam would have to learn to parse.
 *
 * IT HOLDS THE TEAMMATE, NOT AN ID. It used to hold an id and look it up in the
 * fixture, which meant a real teammate (whose id is a relay member id) could be
 * opened from the drawer and then not found, and the thread pane said "pick
 * someone" to a person who just had. The drawer has the row it was opened from;
 * it hands that over.
 *
 * SAME SUBSCRIBABLE SHAPE as design/theme.ts, design/skin.ts and railState.ts,
 * and deliberately WITHOUT their localStorage: the rail's collapse is a
 * preference and worth remembering, an open conversation is not. Reopening the
 * app into a thread you were reading last Tuesday is not continuity, it is the
 * app deciding what you came back for.
 */
import { useSyncExternalStore } from 'react';
import type { Teammate } from './types';

let openMate: Teammate | null = null;
const subscribers = new Set<() => void>();

export function openThread(mate: Teammate): void {
  if (mate.id === openMate?.id) return;
  openMate = mate;
  subscribers.forEach((fn) => fn());
}

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  return () => { subscribers.delete(onChange); };
}

export function useOpenThreadMate(): Teammate | null {
  return useSyncExternalStore(subscribe, () => openMate);
}

/**
 * The connection state D12's chip and D7's stale bar render.
 *
 * ONE WRITER, AND IT IS MAIN. The socket in `teamsSession.ts` is the only
 * thing that knows whether this machine is connected to its team, and it
 * pushes every change through `teams:connection`. Nothing in the renderer
 * sets this store from a guess: in Phase 0 the roster read wrote it, because
 * there was no socket and a signed read that was answered was the truest
 * statement available. That writer is gone.
 *
 * `connecting` until the first answer: before main has said anything, the
 * value that claims least is the one that says we are asking. WITHOUT A
 * BRIDGE (the preview harness) it stays there; the boards pass their own
 * literal to the chip and never read this store.
 */
import { useSyncExternalStore } from 'react';
import type { ConnectionView } from '@shared/teams';

let current: ConnectionView = { state: 'connecting' };
let started = false;
const subscribers = new Set<() => void>();

function set(v: ConnectionView): void {
  if (v.state === current.state && v.reason === current.reason) return;
  current = v;
  subscribers.forEach((fn) => fn());
}

function start(): void {
  if (started) return;
  started = true;
  const api = typeof window === 'undefined' ? undefined : window.cth;
  if (!api?.teamsConnection) return;
  void api.teamsConnection().then(set, () => { /* main will push */ });
  api.onTeamsConnection(set);
}

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  return () => { subscribers.delete(onChange); };
}

export function useConnection(): ConnectionView {
  start();
  return useSyncExternalStore(subscribe, () => current);
}

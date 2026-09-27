/**
 * D11's thread and D10's queue, renderer side. Both are MAIN's: the bridge
 * keeps the thread store and the request queue on disk and pushes when either
 * changes; these hooks read once and follow. Without a bridge (the preview
 * harness) they return nothing and the components fall back to the fixtures,
 * which is the only case that may render a message nobody sent.
 */
import { useCallback, useEffect, useState } from 'react';
import type { PendingRequest, ThreadView } from '@shared/teams';

function api() {
  return typeof window === 'undefined' ? undefined : window.cth;
}

export function useThread(memberId: string): { thread: ThreadView | null; reload: () => void } {
  const [thread, setThread] = useState<ThreadView | null>(null);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    const a = api();
    if (!a?.teamsThread) { setThread(null); return; }
    let live = true;
    void a.teamsThread(memberId).then((t) => { if (live) setThread(t); }, () => { /* keep */ });
    const off = a.onTeamsThread?.((id) => { if (id === memberId) reload(); }) ?? (() => {});
    return () => { live = false; off(); };
  }, [memberId, nonce, reload]);
  return { thread, reload };
}

export function useRequests(): { requests: PendingRequest[] | null; reload: () => void } {
  const [requests, setRequests] = useState<PendingRequest[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    const a = api();
    if (!a?.teamsRequests) { setRequests(null); return; }
    let live = true;
    void a.teamsRequests().then((r) => { if (live) setRequests(r); }, () => { /* keep */ });
    const off = a.onTeamsRequests?.(reload) ?? (() => {});
    return () => { live = false; off(); };
  }, [nonce, reload]);
  return { requests, reload };
}

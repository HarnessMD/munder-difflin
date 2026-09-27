/**
 * The unread count behind the Team button, and the per-person counts in the
 * Team window's directory (phase 8).
 *
 * ONE CACHE FOR EVERY CALLER. The button in the titlebar and the window
 * both ask, and each would otherwise read every thread on its own. So the
 * threads live here at module level, read through the SAME bridge door
 * CrossNodeThread's `useThread` reads (`teamsThread`, then `onTeamsThread`
 * for every change), so the badge and the conversation cannot disagree
 * about a message.
 *
 * WITHOUT A BRIDGE (the preview harness, a test) there are no threads and
 * the count is zero. A badge is a claim, and the fixture thread is nobody's
 * mail.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { ThreadEntry } from '@shared/teams';
import type { Teammate } from './types';
import { latestTheirs, readSeen, unreadCount, writeSeen, type SeenMarks } from './teamUnread';

function api() {
  return typeof window === 'undefined' ? undefined : window.cth;
}

const threads = new Map<string, ThreadEntry[]>();
let seen: SeenMarks | null = null;
let version = 0;
const subscribers = new Set<() => void>();
let following = false;

function bump(): void {
  version++;
  subscribers.forEach((fn) => fn());
}

function read(memberId: string): void {
  const a = api();
  if (!a?.teamsThread) return;
  void a.teamsThread(memberId).then(
    (t) => { threads.set(memberId, t?.messages ?? []); bump(); },
    () => { /* keep what we had */ }
  );
}

/** Follow every thread in the list; a push for one of them re-reads it. */
function track(ids: string[]): void {
  const a = api();
  if (!a?.teamsThread) return;
  if (!following && a.onTeamsThread) {
    following = true;
    a.onTeamsThread((memberId) => { if (threads.has(memberId)) read(memberId); });
  }
  for (const id of ids) {
    if (!threads.has(id)) { threads.set(id, []); read(id); }
  }
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

function marks(): SeenMarks {
  if (!seen) seen = readSeen();
  return seen;
}

/** Everything they have sent so far is read. Called by the window while
 *  their thread is the one on screen. */
export function markThreadSeen(memberId: string): void {
  const latest = latestTheirs(threads.get(memberId) ?? []);
  if (!latest) return;
  const m = marks();
  if (m[memberId] === latest) return;
  seen = { ...m, [memberId]: latest };
  writeSeen(seen);
  bump();
}

export interface UnreadTeamMessages {
  total: number;
  byMember: Record<string, number>;
  markSeen: (memberId: string) => void;
}

export function useUnreadTeamMessages(teammates: Teammate[]): UnreadTeamMessages {
  const key = teammates.map((m) => m.id).join('\n');
  useEffect(() => { track(key ? key.split('\n') : []); }, [key]);
  useSyncExternalStore(subscribe, () => version);
  const m = marks();
  const byMember: Record<string, number> = {};
  let total = 0;
  for (const mate of teammates) {
    const n = unreadCount(threads.get(mate.id) ?? [], m[mate.id]);
    byMember[mate.id] = n;
    total += n;
  }
  const markSeen = useCallback((id: string) => markThreadSeen(id), []);
  return { total, byMember, markSeen };
}

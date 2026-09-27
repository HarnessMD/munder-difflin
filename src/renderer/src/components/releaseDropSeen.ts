/**
 * "Seen once is seen", for the release drop.
 *
 * The drop is offered from two places: a push on `update:status`, and the pull
 * of `update:current` that every mount of the offer surface makes so a push
 * from before the window existed is not lost. Main keeps the last status for
 * the life of the process, and until now nothing told it the drop had been
 * closed. So every remount of the surface re-pulled the same status and opened
 * the same page again: the shell coming back after the paywall, the way in or
 * the hive picker; a skin switch; a config reload; in dev, a hot reload. And
 * every re-push did the same. Closing the drop closed it until the next one of
 * those, which on a fresh install is minutes (founder, 7 Sep 2026: "the release
 * drop keeps appearing again and again even when we are closing it").
 *
 * This is the memory of what was closed. A module level list, so a remount in
 * the same window remembers; mirrored into localStorage under the `cth.`
 * prefix, so a relaunch remembers too and Settings' "reset and start over",
 * which clears every `cth.` key, forgets it along with everything else. Keyed by
 * state and version (`releaseDropKey`), so a new release, or the same release
 * moving from available to downloaded, is a new page and opens.
 *
 * Only the DROP consults this. A release with no authored block still gets the
 * corner card on its own terms (offered again on the next push, since a card
 * that was dismissed is a small thing to see twice and a staged update is not
 * something to hide). And the explicit "what's new" door in Settings never asks
 * here at all: closing a page must not make it unreadable afterwards.
 */
import type { UpdateStatus } from '@shared/updateState';
import { releaseDropKey } from '@shared/updateState';
import { extractDropHtml } from '@shared/releaseDrop';

const LS_KEY = 'cth.releaseDropSeen';
/** Enough for every page a person could plausibly close on one install before
 *  the oldest is irrelevant; a bounded record so the key can never grow. */
const KEEP = 8;

export interface DropSeen {
  isSeen(key: string | null): boolean;
  markSeen(key: string | null): void;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * A record of closed pages over the given storage, or over memory alone when
 * there is none. Reads the stored list once; an unreadable record is an empty
 * one, and a write that fails leaves the window's own memory intact, so the
 * worst case of a broken localStorage is a page that returns after a relaunch,
 * never one that returns on every remount.
 */
export function createDropSeen(storage: StorageLike | null): DropSeen {
  const keys: string[] = [];
  try {
    const raw = storage?.getItem(LS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) for (const k of parsed) if (typeof k === 'string') keys.push(k);
  } catch { /* an unreadable record is an empty one */ }
  return {
    isSeen(key) {
      return key !== null && keys.includes(key);
    },
    markSeen(key) {
      if (key === null || keys.includes(key)) return;
      keys.push(key);
      while (keys.length > KEEP) keys.shift();
      try { storage?.setItem(LS_KEY, JSON.stringify(keys)); } catch { /* memory still holds it for this window */ }
    }
  };
}

function windowStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** The one record both offer surfaces (Classic's toast, PRO's transients)
 *  share, so a page closed on either is closed on both. */
export const dropSeen: DropSeen = createDropSeen(windowStorage());

/**
 * The offer as it stands, unless it is a drop the person already closed. A
 * status without an authored block passes through untouched: the corner card
 * keeps its own rule. Null stays null.
 */
export function offerUnlessSeen<T extends UpdateStatus>(next: T | null, seen: DropSeen = dropSeen): T | null {
  if (!next) return null;
  const notes = 'notes' in next ? next.notes : undefined;
  if (!extractDropHtml(notes)) return next;
  return seen.isSeen(releaseDropKey(next)) ? null : next;
}

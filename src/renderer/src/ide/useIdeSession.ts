/**
 * Keeps one workspace's IDE session in storage, and hands back the saved one
 * when a workspace is opened (0.5.3, bug 13). The rule for WHAT a session is
 * lives in @shared/ideSession; this is only the timing, which is the part that
 * can go wrong, so it is small, on its own, and mounted for real by
 * test/ide-session.test.cjs.
 *
 * THE TIMING RULE: a root is never written before it has been read. The first
 * render of any root is a blank home tab. Saving that would replace the very
 * session about to be restored.
 */
import { useEffect, useRef } from 'react';
import { IDE_SESSION_KEY, parseIdeSession, toIdeSession, type IdeSession } from '@shared/ideSession';

export interface LiveIdeSession {
  tabs: ReadonlyArray<{ key: string; mode: string; rel: string }>;
  activeKey: string | null;
  sideTab: string;
  mdViews: Readonly<Record<string, string>>;
}

type SessionStore = Pick<Storage, 'getItem' | 'setItem'>;
const browserStore = (): SessionStore | null => { try { return window.localStorage; } catch { return null; } };

export function useIdeSession(
  root: string | null,
  live: LiveIdeSession,
  onRestore: (session: IdeSession) => void,
  store: SessionStore | null = browserStore()
): void {
  /** The root whose saved session has been read. */
  const restoredFor = useRef<string | null>(null);
  const onRestoreRef = useRef(onRestore); onRestoreRef.current = onRestore;
  /** The tabs array the restore saw, until the panel has adopted the session. */
  const adopting = useRef<unknown>(null);
  const tabsRef = useRef(live.tabs); tabsRef.current = live.tabs;

  // THE WRITE IS DECLARED BEFORE THE READ ON PURPOSE. Effects run in the order
  // they are declared. On the pass where a root is new, this one must run
  // first, see that the root has not been read, and do nothing. The other way
  // round, the read marks the root restored and this then saves the blank tabs
  // of that same render over the session it just read.
  const { tabs, activeKey, sideTab, mdViews } = live;
  useEffect(() => {
    if (!root || restoredFor.current !== root) return;
    // The restore below hands a session to the panel, and the panel adopts it on
    // a LATER render. Until then `tabs` is still the blank array of this render.
    // Under StrictMode, which the app runs in, effects run twice, so this one
    // ran again with the root already marked restored and wrote that blank over
    // the session it had just read. Nothing is written until the tabs are no
    // longer the very array the restore saw.
    if (adopting.current === tabs) return;
    adopting.current = null;
    try { store?.setItem(IDE_SESSION_KEY + root, JSON.stringify(toIdeSession({ tabs, activeKey, sideTab, mdViews }))); } catch { /* private mode, quota */ }
  }, [root, tabs, activeKey, sideTab, mdViews, store]);

  // On open AND on a project switch: both are "a root that has not been read".
  useEffect(() => {
    if (!root || restoredFor.current === root) return;
    let session = parseIdeSession(null);
    // A read that THROWS is not an empty session (finding 25). Marking the root
    // restored anyway let the next tab change save over a session we had simply
    // failed to read. Unreadable means: write nothing for this root.
    try { session = parseIdeSession(store?.getItem(IDE_SESSION_KEY + root)); } catch { return; }
    restoredFor.current = root;
    if (session.tabs.length > 0) { adopting.current = tabsRef.current; onRestoreRef.current(session); }
  }, [root, store]);
}

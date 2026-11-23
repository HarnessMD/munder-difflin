/**
 * The update badge's wiring, shared by the two titlebars.
 *
 * The state machine itself (which state wins, what a click does) lives in
 * src/shared/updateState.ts. This is the renderer side of it: the
 * subscription to main's updater, the click, and the one-off "you are current"
 * flash after a manual check. It was the body of UpdateBadge.tsx; 0.4.9 phase 6
 * lifted it here so the facts live apart from the pixels.
 */
import { useCallback, useEffect, useState } from 'react';
import { describeUpdate, reduceStatus, type UpdateBadgeView, type UpdateStatus } from '@shared/updateState';

declare const __APP_VERSION__: string;

export interface UpdateBadgeState {
  status: UpdateStatus | null;
  view: UpdateBadgeView;
  /** A click is in flight. */
  busy: boolean;
  /** The click does something and nothing is in flight. */
  interactive: boolean;
  /** Brief, positive "checked, you are current" flash after a MANUAL check
   *  that found no update. Without it a successful check settles silently
   *  back to the quiet chip, indistinguishable from a click that did nothing. */
  checkedOk: boolean;
  version: string;
  click: () => Promise<void>;
}

export function useUpdateBadge(): UpdateBadgeState {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkedOk, setCheckedOk] = useState(false);

  useEffect(() => {
    // Subscribe first, then pull: main may have emitted before this window
    // finished loading (or before a reload), and `update:current` re-serves it.
    const off = window.cth.onUpdateStatus?.((next) => setStatus((prev) => reduceStatus(prev, next)));
    void window.cth.updateCurrent?.().then((cur) => {
      if (cur) setStatus((prev) => reduceStatus(prev, cur));
    }).catch(() => { /* older main without the handler; the push channel still works */ });
    return off;
  }, []);

  // The acknowledgement is a flash, not a mode: clear it after a few seconds.
  useEffect(() => {
    if (!checkedOk) return;
    const t = setTimeout(() => setCheckedOk(false), 3500);
    return () => clearTimeout(t);
  }, [checkedOk]);

  const view = describeUpdate(status, __APP_VERSION__);

  const click = useCallback(async () => {
    if (view.action === 'none' || busy) return;
    setBusy(true);
    try {
      if (view.action === 'check') {
        const res = await window.cth.updateCheckNow();
        // A successful "already current" check has to say so out loud. runCheck
        // has settled lastStatus by the time this resolves, so read it back: a
        // no-update result flashes the acknowledgement; an available update is
        // already loud on its own (the chip changes) so it is left alone.
        if (res?.ok) {
          const cur = await window.cth.updateCurrent?.();
          const st = cur?.state;
          if (!st || st === 'not-available' || st === 'idle' || st === 'just-updated') setCheckedOk(true);
        }
      }
      else if (view.action === 'open-release' && status?.state === 'available') {
        // The newer release is built from source, so the click opens its page.
        await window.cth.updateOpenRelease(status.url);
      }
    } catch { /* the emitted status carries the failure; nothing to do here */ }
    setBusy(false);
  }, [view.action, busy, status]);

  return {
    status, view, busy,
    interactive: view.action !== 'none' && !view.busy,
    checkedOk,
    version: __APP_VERSION__,
    click
  };
}

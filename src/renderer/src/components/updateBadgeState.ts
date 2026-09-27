/**
 * The update badge's wiring, shared by the two titlebars.
 *
 * The state machine itself (which state wins, what a click does) lives in
 * src/shared/updateState.ts. This is the renderer side of it: the
 * subscription to main's updater, the click, and the two one-off notices
 * (the "you are current" flash after a manual check, the "now replace the
 * app" notice after a manual download starts). It was the body of
 * UpdateBadge.tsx; 0.4.9 phase 6 lifted it here so the Classic badge
 * (UpdateBadge.tsx) and the PRO version chip (pro/ProTitlebar.tsx) render one
 * set of facts rather than two subscriptions that could disagree. No pixels
 * here, so PRO may reach it.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  describeUpdate, manualDownloadUrl, manualInstallSteps, pendingVersion, reduceStatus,
  type UpdateBadgeView, type UpdateStatus
} from '@shared/updateState';

declare const __APP_VERSION__: string;

export interface UpdateBadgeState {
  status: UpdateStatus | null;
  view: UpdateBadgeView;
  /** A click is in flight. */
  busy: boolean;
  /** The click does something and nothing is in flight. */
  interactive: boolean;
  /** The version whose manual download just started, for the "now replace
   *  the app" notice. Local state: a one-off explanation, not an update state. */
  started: string | null;
  dismissStarted: () => void;
  /** Brief, positive "checked, you are current" flash after a MANUAL check
   *  that found no update. Without it a successful check settles silently
   *  back to the quiet chip, indistinguishable from a click that did nothing. */
  checkedOk: boolean;
  /** The newer release the status names, or null. */
  pending: string | null;
  steps: { os: string; steps: string[] };
  version: string;
  click: () => Promise<void>;
}

export function useUpdateBadge(): UpdateBadgeState {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState<string | null>(null);
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
      else if (view.action === 'download') await window.cth.updateDownload();
      else if (view.action === 'restart') await window.cth.updateRestartAndInstall();
      else if (view.action === 'manual' && status) {
        // The click IS the download. Auto-update lives in Settings.
        const url = manualDownloadUrl(status, window.cth.platform, window.cth.arch);
        if (url) {
          await window.cth.updateOpenRelease(url);
          setStarted(pendingVersion(status, __APP_VERSION__));
        }
      }
    } catch { /* the emitted status carries the failure; nothing to do here */ }
    setBusy(false);
  }, [view.action, busy, status]);

  return {
    status, view, busy,
    interactive: view.action !== 'none' && !view.busy,
    started, dismissStarted: () => setStarted(null),
    checkedOk,
    pending: pendingVersion(status, __APP_VERSION__),
    steps: manualInstallSteps(window.cth.platform ?? 'darwin'),
    version: __APP_VERSION__,
    click
  };
}

/**
 * "IS THERE A NEW VERSION?", ANSWERED ONCE, DRAWN TWICE.
 *
 * The update conversation (subscribe, check, download, restart, the manual
 * fallback, the release digest) is the same conversation in both skins, and it
 * has to stay the same: two copies of this reducer would eventually disagree
 * about what is installed, and the disagreement would be invisible until an
 * update failed. So the whole of it lives here, with no JSX and no skin, and
 * UpdatesSection (Classic) and pro/UpdatesScreen (PRO) each render the same
 * answers in their own vocabulary.
 *
 * The shared describeUpdateSettings() is still the source of truth for tone,
 * action and busy; only the three prose fields are re-derived through i18n,
 * because the shared function renders English for the toolbar badge and the
 * toast, which are not translated.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { summarizeReleaseNotes } from '@shared/releaseNotes';
import {
  describeUpdateSettings, manualDownloadUrl, manualInstallSteps, pendingVersion,
  reduceStatus, clampPercent, secondaryUpdateAction, type UpdateStatus
} from '@shared/updateState';

declare const __APP_VERSION__: string;

export interface UpdatesView {
  /** One line: what version you are on, or what is waiting. */
  headline: string;
  /** The sentence under it. */
  detail: string;
  /** The one button, or null when there is nothing to press. */
  button: string | null;
  /** 'ready' is the only state that earns emphasis and a primary button. */
  tone: ReturnType<typeof describeUpdateSettings>['tone'];
  /** True while main is mid flight; the button stays drawn but disabled. */
  busy: boolean;
}

export interface UpdatesSectionState {
  view: UpdatesView;
  /** The version a manual download would fetch, or null. */
  pending: string | null;
  /** Platform named, plus the steps to install by hand. */
  steps: ReturnType<typeof manualInstallSteps>;
  /** Set once a manual download has been handed to the browser. */
  manualStarted: string | null;
  downloadManually: () => void;
  /** The primary action for the current state. */
  run: () => void;
  /** 0.5.2: the second, quieter action some states carry beside `run`, or
   *  null. With an update downloaded this is Check again, so Restart is no
   *  longer the only thing on offer (secondaryUpdateAction). */
  checkAgain: (() => void) | null;
  checkAgainLabel: string;
  /** True while this component is waiting on its own click. */
  busy: boolean;
  /** The release digest, empty in states that carry no notes. */
  notes: string[];
  /** 0 to 100 while a download is in flight, null otherwise. PRO draws a
   *  meter with it; Classic says it in the detail line and nothing else. */
  percent: number | null;
  /** The raw state name, for a skin that wants to label it precisely. 'idle'
   *  is "nothing has been asked yet", which is NOT the same claim as
   *  'not-available' ("we asked, you are current"), and a chip that conflated
   *  them would be telling people something nobody checked. */
  state: UpdateStatus['state'] | 'idle';
  version: string;
}

export function useUpdatesSection(): UpdatesSectionState {
  const { t } = useTranslation();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualStarted, setManualStarted] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe before pulling: main may have emitted while this screen was
    // closed, and `update:current` re-serves the last known state.
    const off = window.cth.onUpdateStatus?.((next) => setStatus((prev) => reduceStatus(prev, next)));
    void window.cth.updateCurrent?.().then((cur) => {
      if (cur) setStatus((prev) => reduceStatus(prev, cur));
    }).catch(() => { /* older main without the handler — the push channel still works */ });
    return off;
  }, []);

  const v = __APP_VERSION__;
  const shared = describeUpdateSettings(status, v);
  const pending = pendingVersion(status, v);
  const steps = manualInstallSteps(window.cth.platform ?? 'darwin');

  const prose = useMemo((): Pick<UpdatesView, 'headline' | 'detail' | 'button'> => {
    switch (status?.state) {
      case 'checking':
        return { headline: t('updatesSection.onVersion', { v }), detail: t('updatesSection.checkingDetail'), button: null };
      case 'available':
        return {
          headline: t('updatesSection.availableHeadline', { version: status.version }),
          detail: t('updatesSection.availableDetail', { v }),
          button: t('updatesSection.downloadBtn', { version: status.version })
        };
      case 'downloading':
        return {
          headline: t('updatesSection.downloadingHeadline', { version: status.version }),
          detail: t('updatesSection.downloadingDetail', { percent: clampPercent(status.percent) }),
          button: null
        };
      case 'downloaded':
        return {
          headline: t('updatesSection.downloadedHeadline', { version: status.version }),
          detail: t('updatesSection.downloadedDetail', { v }),
          button: t('updatesSection.restartBtn')
        };
      case 'available-manual':
        return {
          headline: t('updatesSection.availableHeadline', { version: status.version }),
          detail: status.reason
            ? t('updatesSection.manualDetailReason', { reason: status.reason })
            : t('updatesSection.manualDetail'),
          button: t('updatesSection.openReleaseBtn')
        };
      case 'error':
        return {
          headline: t('updatesSection.errorHeadline'),
          detail: t('updatesSection.errorDetail', { message: status.message, v }),
          button: t('updatesSection.retryBtn')
        };
      case 'not-available':
        return {
          headline: t('updatesSection.latestHeadline', { v }),
          detail: t('updatesSection.latestDetail'),
          button: t('updatesSection.checkAgainBtn')
        };
      case 'idle':
      default:
        return {
          headline: t('updatesSection.onVersion', { v }),
          detail: t('updatesSection.idleDetail'),
          button: t('updatesSection.checkBtn')
        };
    }
  }, [status, t, v]);

  // The same digest the update toast renders, for the same reason: the release
  // body is already in hand, and "what would I get?" is the second question
  // anyone asks after "is there a new version?".
  const notes = useMemo(
    () => summarizeReleaseNotes(status && 'notes' in status ? status.notes : undefined),
    [status]
  );

  const downloadManually = useCallback(() => {
    if (!status) return;
    const url = manualDownloadUrl(status, window.cth.platform, window.cth.arch);
    if (!url) return;
    void window.cth.updateOpenRelease(url);
    setManualStarted(pendingVersion(status, v));
  }, [status, v]);

  const run = useCallback(() => {
    if (shared.action === 'none' || busy) return;
    setBusy(true);
    void (async () => {
      try {
        if (shared.action === 'restart') await window.cth.updateRestartAndInstall();
        else if (shared.action === 'download') await window.cth.updateDownload();
        else if (shared.action === 'check') await window.cth.updateCheckNow();
        else if (shared.action === 'open-release') {
          await window.cth.updateOpenRelease(status?.state === 'available-manual' ? status.url : undefined);
        }
      } catch { /* the emitted status carries the failure — nothing to do here */ }
      setBusy(false);
    })();
  }, [shared.action, busy, status]);

  const secondary = secondaryUpdateAction(status);
  const checkAgain = useCallback(() => {
    if (busy) return;
    setBusy(true);
    void (async () => {
      try { await window.cth.updateCheckNow(); } catch { /* the emitted status carries the failure */ }
      setBusy(false);
    })();
  }, [busy]);

  return {
    view: { ...prose, tone: shared.tone, busy: shared.busy },
    pending, steps, manualStarted, downloadManually, run, busy, notes,
    checkAgain: secondary === 'check' ? checkAgain : null,
    checkAgainLabel: t('updatesSection.checkAgainBtn'),
    percent: status?.state === 'downloading' ? clampPercent(status.percent) : null,
    state: status?.state ?? 'idle',
    version: v
  };
}

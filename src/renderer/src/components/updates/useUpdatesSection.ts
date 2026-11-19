/**
 * "IS THERE A NEW VERSION?", ANSWERED ONCE, DRAWN TWICE.
 *
 * The update conversation (subscribe, check, the newer release and its page,
 * the release digest) is the same conversation in both skins, and it has to
 * stay the same: two copies of this reducer would eventually disagree about
 * what is out, and the disagreement would be invisible until someone missed a
 * release. So the whole of it lives here, with no JSX and no skin, and
 * UpdatesSection renders the answers.
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
  describeUpdateSettings, reduceStatus, secondaryUpdateAction, type UpdateStatus
} from '@shared/updateState';

declare const __APP_VERSION__: string;

export interface UpdatesView {
  /** One line: what version you are on, or what is out. */
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
  /** The primary action for the current state. */
  run: () => void;
  /** The second, quieter action some states carry beside `run`, or null. With
   *  a newer release named this is Check again, so opening its page is not the
   *  only thing on offer (secondaryUpdateAction). */
  checkAgain: (() => void) | null;
  checkAgainLabel: string;
  /** True while this component is waiting on its own click. */
  busy: boolean;
  /** The release digest, empty in states that carry no notes. */
  notes: string[];
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

  const prose = useMemo((): Pick<UpdatesView, 'headline' | 'detail' | 'button'> => {
    switch (status?.state) {
      case 'checking':
        return { headline: t('updatesSection.onVersion', { v }), detail: t('updatesSection.checkingDetail'), button: null };
      case 'available':
        return {
          headline: t('updatesSection.availableHeadline', { version: status.version }),
          detail: t('updatesSection.sourceDetail', {
            v,
            defaultValue: "You're on v{{v}}. Releases ship as source, so build it the way you built this one."
          }),
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

  const run = useCallback(() => {
    if (shared.action === 'none' || busy) return;
    setBusy(true);
    void (async () => {
      try {
        if (shared.action === 'check') await window.cth.updateCheckNow();
        else if (shared.action === 'open-release') {
          await window.cth.updateOpenRelease(status?.state === 'available' ? status.url : undefined);
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
    run, busy, notes,
    checkAgain: secondary === 'check' ? checkAgain : null,
    checkAgainLabel: t('updatesSection.checkAgainBtn'),
    state: status?.state ?? 'idle',
    version: v
  };
}

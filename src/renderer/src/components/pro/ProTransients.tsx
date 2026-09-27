/**
 * PRO'S TRANSIENTS (0.4.9 phase 6, plan Part 2 G7). App.tsx mounts this
 * under PRO where Classic mounts its overlay slot; the five Classic surfaces
 * it stands in for (UpdateToast, CompletionToast, the Teams toast and modal,
 * QuitWarningModal) are never reached from PRO. Nothing here forks their
 * logic: each half subscribes to the same push the Classic component
 * subscribes to, or calls the same hook, and only the pixels are the kit's.
 *
 *   update offers     `onUpdateStatus` and `updateCurrent`, the states a
 *                     person has to act on: a downloaded update raises the
 *                     kit's update card (ProUpdateCard) whose primary action
 *                     is Restart to update; a release this install cannot
 *                     fetch itself raises the same card with Download or
 *                     Open releases. Both wait until answered. A release
 *                     whose body carries an authored drop block upgrades
 *                     the card to the centered ReleaseDrop moment, exactly
 *                     as under Classic, 'just-updated' included so the drop
 *                     greets the user right after an update applies
 *                     (founder, 5 Sep 2026: the popup follows each skin's
 *                     design, and the drop ships with the update on both).
 *   completions       `onRealtimeCompletion`: one nine second toast per
 *                     finished voice dispatch, deduplicated on redelivery.
 *   a teammate's ask  the seam's `useRequestRows` and `decide`: one waiting
 *                     toast per request with Allow once; the X is Not now,
 *                     which loses nothing, the row stays on Requests.
 *   a key change      the seam's `RekeyHost` with a kit sheet in place of
 *                     the Classic dialog. Not dismissable: it asks a question
 *                     with a security answer.
 *   quitting          the quit warning, as one sheet above everything, with
 *                     App's handlers. Two doors only (founder, 5 Sep 2026):
 *                     keep them running, or kill all and quit.
 *
 * The release drop is the ONE Classic-built surface PRO mounts as is. Its
 * chrome is the landing site's window, a deliberate skin exemption
 * (ReleaseDrop.tsx explains why the sandboxed srcdoc it frames can never
 * follow a skin), so there is nothing to redraw for PRO. The 0.4.9 plan's
 * "Classic only" ruling on the drop was reversed by the founder on 5 Sep
 * 2026; under PRO "what's new" now re-opens the drop when the current
 * release carries one, and opens the release page when nothing is authored.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { releaseDropKey, type UpdateStatus } from '@shared/updateState';
import { extractDropHtml } from '@shared/releaseDrop';
import { ReleaseDrop } from '../ReleaseDrop';
import { dropSeen, offerUnlessSeen } from '../releaseDropSeen';
import { useBootSettled } from '@/store/bootGate';
import { ProUpdateCard } from './ProUpdateCard';
import { RekeyHost, decide, inHarness, useRequestRows } from '../team/teamsSeam';
import { Fingerprint } from '../team/primitives';
import type { Teammate } from '../team/types';
import { Btn, SectionH, Sheet, dismissToast, proToast } from './ui';

export interface QuitAsk {
  ptyCount: number;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ProTransients({ quit }: { quit: QuitAsk | null }) {
  useCompletionToasts();
  useApprovalToasts();
  return (
    <>
      <UpdateOffer />
      <RekeyHost render={(p) => <RekeyDialog {...p} />} />
      {quit && <QuitDialog {...quit} />}
    </>
  );
}

/* ---- the update offer ------------------------------------------------------ */

/** The three states this surface acts on. 'just-updated' is here for the
 *  drop alone: main emits it on the first boot after the version moved, so
 *  an authored release page greets the user right after the update applies;
 *  without an authored block it renders nothing, exactly like UpdateToast. */
type OfferStatus = Extract<UpdateStatus, { state: 'downloaded' | 'available-manual' | 'just-updated' }>;

function offerable(s: UpdateStatus): OfferStatus | null {
  return s.state === 'downloaded' || s.state === 'available-manual' || s.state === 'just-updated' ? s : null;
}

function UpdateOffer() {
  const [status, setStatus] = useState<OfferStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const bootSettled = useBootSettled();

  useEffect(() => {
    const api = window.cth;
    // One card, held as state rather than a toast stack, so a re-push of the
    // state already on screen re-renders the same card in place and can
    // never stack a second one; a state that was answered or dismissed is
    // offered again on the next push (the 6h re-check re-emits it). A
    // non-actionable push (a re-check, say) must not erase an unanswered
    // offer, so offerable() returning null changes nothing. The one thing
    // NOT offered again is a release page the person already closed: main
    // holds the same status for the life of the process, and this surface
    // remounts whenever the shell does (the paywall, the way in, the hive
    // picker, a skin switch), so without that memory the drop came back on
    // every remount and every re-push (releaseDropSeen.ts).
    const offer = (s: UpdateStatus) => { const next = offerUnlessSeen(offerable(s)); if (next) setStatus(next); };
    const off = api.onUpdateStatus?.(offer);
    // Main may have emitted before this window existed; pull the last status.
    void api.updateCurrent?.().then(offer).catch(() => { /* nothing to show */ });
    // Settings' hero card asks to re-open the release notes. A release that
    // carries an authored drop re-opens the drop (founder, 5 Sep 2026:
    // the drop is no longer Classic only); with nothing authored the honest
    // answer is still the release page. `updateCurrent()` rather than the
    // remembered state because "later" clears the local copy while main
    // still holds it, and dismissing a release must not make it unreadable.
    const onShow = async () => {
      try {
        const cur = await api.updateCurrent();
        const next = offerable(cur);
        if (next && extractDropHtml(next.notes)) { setStatus(next); return; }
      } catch { /* fall through to the page */ }
      void api.updateOpenRelease();
    };
    window.addEventListener('cth:show-release-notes', onShow);
    return () => { off?.(); window.removeEventListener('cth:show-release-notes', onShow); };
  }, []);

  const dropHtml = useMemo(() => extractDropHtml(status?.notes), [status?.notes]);

  // 0.5.2, card v052-startup-restore-loading: the drop is offered off
  // restore-complete, not app-ready. The status is kept and renders the
  // moment the boot gate settles (store/bootGate.ts).
  if (!bootSettled) return null;
  if (!status) return null;

  // An authored release: hand the whole moment to the centered drop instead
  // of the corner card, on the same condition Classic's UpdateToast uses.
  // Restart-to-install is not lost with the card's button: the titlebar
  // version chip and Settings -> Updates still offer it after this closes.
  // Closing it is remembered (by state and version), so neither a remount nor
  // a re-push of this same page opens it again; a new release, or this one
  // reaching a later state, is a new page. Settings' "what's new" still opens
  // it on request.
  if (dropHtml) {
    return (
      <ReleaseDrop
        version={status.version}
        html={dropHtml}
        onDismiss={() => { dropSeen.markSeen(releaseDropKey(status)); setStatus(null); }}
      />
    );
  }
  // Freshly updated with nothing authored for this release: nothing to say.
  if (status.state === 'just-updated') return null;

  const shown = status;
  /** Close the card FIRST, then ask main to quit and install. The quit path
   *  raises the quit warning when agents run; a cancel there is not a
   *  failure and the card stays closed, but a refusal from main brings the
   *  offer back so it can be retried. */
  const restart = () => {
    setBusy(true);
    setStatus(null);
    void window.cth.updateRestartAndInstall()
      .then((res) => { if (!res.ok) { setStatus(shown); setBusy(false); } })
      .catch(() => { setStatus(shown); setBusy(false); });
  };
  /** Same call the manual state's button makes: main resolves `undefined` to
   *  the releases page and refuses any URL outside this project. */
  const openRelease = () => {
    void window.cth.updateOpenRelease(shown.state === 'available-manual' ? (shown.downloadUrl ?? shown.url) : undefined);
  };

  return <ProUpdateCard status={shown} busy={busy} onDismiss={() => setStatus(null)} onRestart={restart} onOpenRelease={openRelease} />;
}

/* ---- a finished voice dispatch --------------------------------------------- */

const COMPLETION_MS = 9000;

function useCompletionToasts(): void {
  const { t } = useTranslation();
  const godName = useStore((s) => s.agents.find((a) => a.isGod)?.name);
  const nameRef = useRef(godName);
  nameRef.current = godName;
  useEffect(() => {
    const subscribe = window.cth?.onRealtimeCompletion;
    if (!subscribe) return;
    const seen = new Set<string>();
    return subscribe((evt) => {
      const key = `${evt.correlationId}:${evt.completedAt}`;
      if (seen.has(key)) return;
      seen.add(key);
      proToast(t('pro.notice.completed', { name: nameRef.current ?? t('pro.agents.orchestrator'), summary: evt.summary }), { ms: COMPLETION_MS, tone: 'ok' });
    });
  }, [t]);
}

/* ---- a teammate wants to send work ----------------------------------------- */

function useApprovalToasts(): void {
  const { t } = useTranslation();
  const rows = useRequestRows();
  /** Request id to toast id: each request is offered once; dismissed means
   *  not now and the row stays on the Requests screen with its count. */
  const raised = useRef(new Map<string, number>());
  useEffect(() => {
    const harness = inHarness();
    for (const r of rows) {
      const have = raised.current.get(r.id);
      if (r.expired) { if (have !== undefined) dismissToast(have); continue; }
      if (have !== undefined) continue;
      const id = proToast(`${t('pro.notice.request', { name: r.fromName, machine: r.fromMachine })} ${r.preview}`, {
        ms: 0,
        action: { label: t('pro.notice.allowOnce'), run: () => { if (!harness) decide(r.id, 'allow-once'); } }
      });
      raised.current.set(r.id, id);
    }
    // A request decided elsewhere (the Requests screen) takes its toast with it.
    for (const [rid, tid] of raised.current) {
      if (!rows.some((r) => r.id === rid)) { dismissToast(tid); raised.current.delete(rid); }
    }
  }, [rows, t]);
}

/* ---- a teammate's key changed ---------------------------------------------- */

function RekeyDialog({ mate, onAccept, onBlock }: { mate: Teammate; onAccept: () => void; onBlock: () => void }) {
  const { t } = useTranslation();
  const p: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--cth-ink-700)' };
  return (
    <Sheet onClose={() => { /* a security question is not dismissed, it is answered */ }} width={540} zIndex={950}>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{t('team.fingerprint.title', { name: mate.name })}</h2>
        <p style={p}>{t('team.fingerprint.usually')}</p>
        <p style={p}>{t('team.fingerprint.couldAlso')}</p>
        <p style={{ ...p, padding: '8px 10px', fontWeight: 500, borderRadius: 8, color: 'var(--cth-status-blocked)', background: 'var(--cth-status-blocked-tint)' }}>
          {t('team.fingerprint.doNotSend')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 8, background: 'var(--cth-cream-200)' }}>
          <SectionH>{t('team.fingerprint.was')}</SectionH>
          <Fingerprint value={mate.previousFingerprint ?? ''} />
          <SectionH>{t('team.fingerprint.now')}</SectionH>
          <Fingerprint value={mate.fingerprint} compareTo={mate.previousFingerprint} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Btn onClick={onBlock}>{t('team.fingerprint.blockForNow')}</Btn>
          <Btn kind="primary" onClick={onAccept}>{t('team.fingerprint.accept')}</Btn>
        </div>
      </div>
    </Sheet>
  );
}

/* ---- quitting -------------------------------------------------------------- */

function QuitDialog({ ptyCount, onCancel, onConfirm }: QuitAsk) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const confirm = () => { setBusy(true); void onConfirm(); };
  const body: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--cth-ink-700)' };
  const note: React.CSSProperties = { ...body, padding: '8px 10px', borderRadius: 8, background: 'var(--cth-cream-200)', fontSize: 12.5 };

  return (
    // Above every other surface: this is the last thing asked before the
    // process dies, so it outranks whatever it interrupts. The backdrop and
    // Esc answer "keep them running". Two doors only (founder, 5 Sep 2026):
    // the body says exactly what the kill does before the person picks it.
    <Sheet onClose={onCancel} width={480} zIndex={1000}>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{t('pro.quit.title')}</h2>
        <p style={{ ...body, fontWeight: 500, color: 'var(--cth-ink-900)' }}>
          {ptyCount === 1 ? t('pro.quit.runningOne') : t('pro.quit.runningMany', { count: ptyCount })}
        </p>
        <p style={body}>{t('pro.quit.killBody')}</p>
        <div style={note}>{t('pro.quit.killKeeps')}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <Btn onClick={onCancel} disabled={busy}>{t('pro.quit.keep')}</Btn>
          <Btn kind="danger" onClick={confirm} disabled={busy}>{busy ? t('pro.quit.killing') : t('pro.quit.killAll')}</Btn>
        </div>
      </div>
    </Sheet>
  );
}

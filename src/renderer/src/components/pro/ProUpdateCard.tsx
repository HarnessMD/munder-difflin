/**
 * THE PRO UPDATE POPUP (founder, 5 Sep 2026: "the update popup that comes,
 * that also needs to follow the pro design by default. And if it's on
 * classic, then it should have the classic design"). Classic keeps
 * UpdateToast; under PRO an actionable update raises this card instead of
 * the one line toast it used to get.
 *
 * It lives in the same transient layer as the pro toasts (zIndex 300, above
 * the screens and sheets, below the rekey and quit dialogs) but in the
 * corner rather than the centre strip, so a passing "Copied" toast and a
 * waiting offer never cover each other. `right` rather than
 * `inset-inline-end` on purpose, matching Classic's transient corner: the
 * offer has always sat on the right in RTL, and moving it is a separate
 * decision from this card existing. It covers nothing but its own corner;
 * an update is an offer, never a modal.
 *
 * The digest obeys UpdateToast's three rules, unchanged: no notes means no
 * block (summarizeReleaseNotes returns [] for an empty or structure only
 * body, and nothing renders, not even the heading); the digest is capped in
 * releaseNotes.ts AND clamped with a scroll here; Read more reuses the same
 * updateOpenRelease bridge the manual state's button has always used.
 *
 * Only the pixels live here. The wiring (the subscription, the re-offer on
 * a refused restart, the authored release drop) stays in ProTransients.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { summarizeReleaseNotes } from '@shared/releaseNotes';
import type { UpdateStatus } from '@shared/updateState';
import { Btn } from './ui';

/** The two states a person has to act on. 'just-updated' never reaches this
 *  card: with an authored drop it becomes the drop, without one it is
 *  nothing. */
export type UpdateCardStatus = Extract<UpdateStatus, { state: 'downloaded' | 'available-manual' }>;

export function ProUpdateCard({ status, busy, onDismiss, onRestart, onOpenRelease }: {
  status: UpdateCardStatus;
  busy: boolean;
  /** "Later". Loses nothing: the titlebar version chip and Settings keep
   *  offering the same update until it is applied. */
  onDismiss: () => void;
  onRestart: () => void;
  onOpenRelease: () => void;
}) {
  const { t } = useTranslation();
  const notes = useMemo(() => summarizeReleaseNotes(status.notes), [status.notes]);
  const downloaded = status.state === 'downloaded';
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 300, width: 360, maxWidth: 'calc(100vw - 36px)' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px',
        background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)',
        border: '1px solid var(--cth-ink-300)', borderRadius: 12,
        boxShadow: '0 12px 32px rgba(0,0,0,0.18)'
      }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>
          {downloaded
            ? t('pro.notice.updateDownloaded', { version: status.version })
            : t('pro.notice.updateAvailable', { version: status.version })}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--cth-ink-700)' }}>
          {downloaded ? t('pro.notice.updateDownloadedBody') : t('pro.notice.updateAvailableBody')}
        </div>
        {notes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>
              {t('pro.notice.whatsNew')}
            </span>
            {/* The digest is already capped at ~280 chars; the clamp is the
                second belt, for the day a release body defeats the parser. */}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 96, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {notes.map((line, i) => (
                <li key={i} style={{ display: 'flex', gap: 6, fontSize: 12, lineHeight: 1.45, color: 'var(--cth-ink-700)' }}>
                  <span aria-hidden style={{ color: 'var(--cth-ink-300)' }}>•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onOpenRelease}
              style={{
                alignSelf: 'flex-start', border: 'none', background: 'transparent', padding: 0,
                font: 'inherit', fontSize: 12, color: 'var(--cth-ink-700)', textDecoration: 'underline', cursor: 'pointer'
              }}
            >
              {t('pro.notice.readMore')}
            </button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn size="sm" onClick={onDismiss} disabled={busy}>{t('pro.notice.later')}</Btn>
          <Btn size="sm" kind="primary" onClick={downloaded ? onRestart : onOpenRelease} disabled={busy}>
            {downloaded
              ? t('pro.notice.restartToUpdate')
              : status.downloadUrl ? t('pro.notice.download') : t('pro.notice.openReleases')}
          </Btn>
        </div>
      </div>
    </div>
  );
}

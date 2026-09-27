/**
 * D13 — a teammate's key changed.
 *
 * Serious without being alarming. The honest reading is almost always benign,
 * so the benign explanation goes first; but the other explanation is real and
 * burying it would make this dialog decorative.
 */
import { useTranslation } from 'react-i18next';
import { Fingerprint } from './primitives';
import type { Teammate } from './types';
import { Btn } from '../pro/ui';

export interface FingerprintWarningProps {
  mate: Teammate;
  onAccept: () => void;
  onBlock: () => void;
}

export function FingerprintWarning({ mate, onAccept, onBlock }: FingerprintWarningProps) {
  const { t } = useTranslation();
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: 'rgba(0,0,0,0.5)',
      display: 'grid', placeItems: 'center', padding: 24
    }}>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: 560, maxWidth: '100%',
          background: 'var(--cth-cream-50)',
          borderRadius: 'var(--cth-radius-xl, 12px)',
          // STRUCTURE DOES NOT TAKE HUE, and a security warning is not an
          // exception to that — ruled 30 Aug. The hairline stays ink-300 like
          // every other panel; the warning earns its attention from the word
          // and the mark inside, not from the frame around them. A coloured
          // frame is the same mistake as a coloured banner border.
          boxShadow: 'inset 0 0 0 1px var(--cth-ink-300), var(--cth-shadow-hard)',
          display: 'flex', flexDirection: 'column'
        }}>
        <header style={{ padding: 16, boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>
            {t('team.fingerprint.title', { name: mate.name })}
          </span>
        </header>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)' }}>
            {t('team.fingerprint.usually')}
          </p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)' }}>
            {t('team.fingerprint.couldAlso')}
          </p>
          {/* The warning the frame used to carry. Same shape as every other
              banner in this feature: the TINT is the fill, the hairline stays
              ink-300, and the hue lands on the words. */}
          <p style={{
            margin: 0, padding: '8px 10px',
            fontSize: 13, lineHeight: '20px', fontWeight: 500,
            color: 'var(--cth-status-blocked)',
            background: 'var(--cth-status-blocked-tint)',
            borderRadius: 'var(--cth-radius-md, 8px)',
            boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
          }}>
            {t('team.fingerprint.doNotSend')}
          </p>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: 12,
            borderRadius: 'var(--cth-radius-md, 8px)',
            background: 'var(--cth-cream-200)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{
                fontFamily: 'var(--cth-font-mono)', fontSize: 11, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--cth-ink-500)'
              }}>{t('team.fingerprint.was')}</span>
              <Fingerprint value={mate.previousFingerprint ?? ''} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{
                fontFamily: 'var(--cth-font-mono)', fontSize: 11, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--cth-ink-500)'
              }}>{t('team.fingerprint.now')}</span>
              {/* Differing groups are picked out in the blocked hue. */}
              <Fingerprint value={mate.fingerprint} compareTo={mate.previousFingerprint} />
            </div>
          </div>
        </div>

        <footer style={{
          padding: 12, boxShadow: 'inset 0 1px 0 var(--cth-ink-300)',
          display: 'flex', justifyContent: 'flex-end', gap: 8
        }}>
          <Btn kind="ghost" onClick={onBlock}>
            {t('team.fingerprint.blockForNow')}
          </Btn>
          <Btn kind="primary" onClick={onAccept}>
            {t('team.fingerprint.accept')}
          </Btn>
        </footer>
      </div>
    </div>
  );
}

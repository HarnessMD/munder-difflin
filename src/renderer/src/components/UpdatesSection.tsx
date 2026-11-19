/**
 * Settings → General → "Updates", in Classic.
 *
 * The toolbar already carries an update chip (UpdateBadge), but a chip that
 * stays blank when everything is fine is not somewhere you go to *ask* — and
 * "is there a new version?" is exactly the question people open Settings with.
 * This block always answers it: the version you're on, whether it's the latest,
 * and one button that names what pressing it does.
 *
 * Every answer comes from useUpdatesSection(); this file is the drawing of it
 * and nothing else.
 */
import { useTranslation } from 'react-i18next';
import { useUpdatesSection } from './updates/useUpdatesSection';
import { PixelButton } from './PixelButton';

export function UpdatesSection() {
  const { t } = useTranslation();
  const { view, run, busy, notes, checkAgain, checkAgainLabel } = useUpdatesSection();

  return (
    <div>
      <div style={{
        fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
        color: 'var(--cth-ink-500)', textTransform: 'uppercase', marginBottom: 10
      }}>
        {t('updatesSection.title')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{
            fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)',
            // Only an actionable state earns emphasis; "you're up to date" is
            // information, not a call to action.
            fontWeight: view.tone === 'ready' ? 600 : 400
          }}>
            {view.headline}
          </span>
          <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
            {view.detail}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          {/* 0.5.2, card v052-check-again-when-downloaded: the second button,
              quieter, before the primary one. It now sits beside "Open release
              page". Same flexShrink rule as the primary, for the same reason. */}
          {checkAgain && (
            <PixelButton variant="secondary" size="sm" onClick={checkAgain} disabled={busy || view.busy} style={{ flexShrink: 0 }}>
              {checkAgainLabel}
            </PixelButton>
          )}
          {view.button && (
            <PixelButton
              variant={view.tone === 'ready' ? 'primary' : 'secondary'}
              size="sm"
              onClick={run}
              disabled={busy || view.busy}
              /* The label is a phrase ("Check for updates", "Open release page"),
                 and this row is a flex line whose left column carries two lines of
                 prose. Without this the button is the flexible item: it gets
                 squeezed, the label wraps to two lines, and because the button's
                 height is fixed by its size the second line prints straight
                 through the bottom border. The kit already refuses to wrap; what
                 it cannot know is that this particular row has a prose column
                 beside it with minWidth: 0, which is what yields instead. */
              style={{ flexShrink: 0 }}
            >
              {view.button}
            </PixelButton>
          )}
        </div>
      </div>
      {notes.length > 0 && (
        <ul style={{
          listStyle: 'none', margin: '8px 0 0', padding: 0,
          display: 'flex', flexDirection: 'column', gap: 4
        }}>
          {notes.map((line, i) => (
            <li key={i} style={{
              display: 'flex', gap: 6,
              fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)'
            }}>
              <span aria-hidden style={{ color: 'var(--cth-ink-300)' }}>•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Settings → General → "Updates", in Classic.
 *
 * The toolbar already carries an update chip (UpdateBadge), but a chip that
 * stays blank when everything is fine is not somewhere you go to *ask* — and
 * "is there a new version?" is exactly the question people open Settings with.
 * This block always answers it: the version you're on, whether it's the latest,
 * and one button that names what pressing it does.
 *
 * Every answer comes from useUpdatesSection(), which PRO's own Updates screen
 * also renders, so the two skins can never disagree about what is installed.
 * This file is the Classic drawing of it and nothing else.
 */
import { Trans, useTranslation } from 'react-i18next';
import { useUpdatesSection } from './updates/useUpdatesSection';
import { Btn } from './pro/ui';

export function UpdatesSection() {
  const { t } = useTranslation();
  const { view, pending, steps, manualStarted, downloadManually, run, busy, notes, checkAgain, checkAgainLabel } = useUpdatesSection();

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
          {pending && (
            <Btn
              size="sm"
              onClick={downloadManually}
              title={t('updatesSection.downloadManuallyTitle', { version: pending })}
            >
              {t('updatesSection.downloadManually')}
            </Btn>
          )}
          {/* 0.5.2, card v052-check-again-when-downloaded: the second button,
              quieter, before the primary one. Same flexShrink rule as the
              primary, for the same reason. */}
          {checkAgain && (
            <Btn size="sm" onClick={checkAgain} disabled={busy || view.busy} style={{ flexShrink: 0 }}>
              {checkAgainLabel}
            </Btn>
          )}
          {view.button && (
            <Btn
              kind={view.tone === 'ready' ? 'primary' : 'default'}
              size="sm"
              onClick={run}
              disabled={busy || view.busy}
              /* The label is a phrase ("Check for updates", "Restart to update"),
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
            </Btn>
          )}
        </div>
      </div>
      {manualStarted && (
        <div style={{
          marginTop: 10, padding: '10px 12px', fontSize: 12, lineHeight: 1.5,
          color: 'var(--cth-ink-900)', background: 'var(--cth-paper-100)',
          border: '2px solid var(--cth-ink-900)'
        }}>
          <Trans i18nKey="updatesSection.manualDownloadingTitle" values={{ version: manualStarted }} components={{ b: <b /> }}>
            v{manualStarted} is downloading in your browser.
          </Trans>{' '}
          <Trans i18nKey="updatesSection.manualDownloadingBody" values={{ os: steps.os }}>
            When it lands, quit this app, install the new version over the current one, open it and
            pick the same project. On {steps.os}:
          </Trans>
          <ol style={{ margin: '4px 0 0', paddingLeft: 18, color: 'var(--cth-ink-700)' }}>
            {steps.steps.map((line) => <li key={line}>{line}</li>)}
          </ol>
        </div>
      )}
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

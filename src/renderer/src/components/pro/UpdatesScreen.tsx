/**
 * VERSION & UPDATES, drawn in the kit (0.4.9 phase 5).
 *
 * Same conversation as Classic's UpdatesSection, same reducer, same wording:
 * both read useUpdatesSection(), so the two skins cannot disagree about what
 * is installed. What differs is the drawing. PRO gets the page to itself, so
 * the state is a card with a status chip rather than a line in a modal, a
 * download shows a real meter instead of a percentage buried in prose, and the
 * manual instructions are a numbered list in their own panel.
 */
import { useTranslation } from 'react-i18next';
import { Trans } from 'react-i18next';
import { useUpdatesSection } from '../updates/useUpdatesSection';
import { Bar, Btn, Card, Chip, Meter, SectionH, type ChipTone } from './ui';

/**
 * The chip beside the headline. Keyed off the raw state, not the tone, so it
 * can tell "we asked, you are current" from "nobody has asked yet" — the idle
 * state gets no chip at all rather than a claim nothing checked.
 */
const STATE_CHIP: Partial<Record<string, { tone: ChipTone; key: string }>> = {
  'not-available': { tone: 'ok', key: 'pro.updates.state.current' },
  available: { tone: 'warn', key: 'pro.updates.state.available' },
  'available-manual': { tone: 'warn', key: 'pro.updates.state.available' },
  downloading: { tone: 'think', key: 'pro.updates.state.downloading' },
  downloaded: { tone: 'ok', key: 'pro.updates.state.ready' },
  checking: { tone: 'think', key: 'pro.updates.state.checking' },
  error: { tone: 'bad', key: 'pro.updates.state.failed' }
};

export function UpdatesScreen({ appVersion }: { appVersion: string }) {
  const { t } = useTranslation();
  const { view, pending, steps, manualStarted, downloadManually, run, busy, notes, percent, state, checkAgain, checkAgainLabel } = useUpdatesSection();
  const chip = STATE_CHIP[state];

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)' }}>
      <Bar title={t('pro.menu.updates')} sub={`v${appVersion}`} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 18px 32px' }}>
        {/* Full content width (pilot feedback item 18): the cards fill the
            screen like every other full page; no half-width column. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: view.tone === 'ready' ? 600 : 500, lineHeight: 1.35 }}>
                    {view.headline}
                  </span>
                  {chip && <Chip tone={chip.tone}>{t(chip.key)}</Chip>}
                </div>
                <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--cth-ink-500)' }}>{view.detail}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                {pending && (
                  <Btn size="sm" onClick={downloadManually} title={t('updatesSection.downloadManuallyTitle', { version: pending })}
                    style={{ whiteSpace: 'nowrap' }}>
                    {t('updatesSection.downloadManually')}
                  </Btn>
                )}
                {checkAgain && (
                  <Btn size="sm" onClick={checkAgain} disabled={busy || view.busy} style={{ flexShrink: 0 }}>
                    {checkAgainLabel}
                  </Btn>
                )}
                {view.button && (
                  <Btn size="sm" kind={view.tone === 'ready' ? 'primary' : 'default'} onClick={run}
                    disabled={busy || view.busy} style={{ whiteSpace: 'nowrap' }}>
                    {view.button}
                  </Btn>
                )}
              </div>
            </div>
            {percent !== null && <Meter pct={percent} />}
          </Card>

          {notes.length > 0 && (
            <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SectionH>{t('pro.updates.whatsNew')}</SectionH>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {notes.map((line, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.5, color: 'var(--cth-ink-700)' }}>
                    <span aria-hidden style={{ color: 'var(--cth-ink-300)' }}>•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {manualStarted && (
            <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionH>{t('pro.updates.byHand')}</SectionH>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--cth-ink-700)' }}>
                <Trans i18nKey="updatesSection.manualDownloadingTitle" values={{ version: manualStarted }} components={{ b: <b /> }}>
                  v{manualStarted} is downloading in your browser.
                </Trans>{' '}
                <Trans i18nKey="updatesSection.manualDownloadingBody" values={{ os: steps.os }}>
                  When it lands, quit this app, install the new version over the current one, open it and
                  pick the same project. On {steps.os}:
                </Trans>
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: 'var(--cth-ink-700)' }}>
                {steps.steps.map((line) => <li key={line}>{line}</li>)}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

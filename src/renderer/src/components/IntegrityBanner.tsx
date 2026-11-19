// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * A settings, task board or agent list file that does not read. Main keeps the file as it is, saves a dated
 * copy beside it and pauses writes to it (window.cth.integrityIssues); this
 * banner names the file in plain words, says where the copy is, and goes away
 * by itself once the file reads again. It cannot be dismissed while changes are
 * paused. Main sends no change event, so the list is read again every few
 * seconds. Its own root in main.tsx, over the picker and the app.
 */
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import { useIntegrityIssues } from './integrityIssues';

/** "Your settings (config.json)" and the like; any other file by its own name. */
const NAMED: Record<string, string> = { 'config.json': 'integrity.file.config', 'tasks.json': 'integrity.file.tasks', 'registry.json': 'integrity.file.registry' };

export function IntegrityBanner() {
  const { t } = useTranslation();
  const issues = useIntegrityIssues();
  if (!issues.length) return null;
  return (
    <div style={{ position: 'fixed', top: 48, left: 0, right: 0, zIndex: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
      {issues.map((issue) => {
        const base = issue.file.split(/[\\/]/).pop() ?? issue.file;
        const name = NAMED[base] ? t(NAMED[base]) : base;
        const [before, after] = t('integrity.body', { copy: '\u0001' }).split('\u0001');
        return (
          <div key={issue.file} role="status" data-integrity-banner={base} style={{
            pointerEvents: 'auto', width: 'min(560px, calc(100% - 32px))', padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--cth-font-ui)',
            background: 'var(--cth-paper-100)', color: 'var(--cth-ink-900)',
            boxShadow: 'inset 0 0 0 1px var(--cth-ink-500), var(--cth-shadow-hard)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
              <span style={{
                fontFamily: 'var(--cth-font-display)', fontSize: 8, fontWeight: 400, lineHeight: '14px', padding: '0 5px',
                display: 'inline-block', whiteSpace: 'nowrap', background: 'var(--cth-lemon-light)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
              }}>{t('integrity.paused')}</span>
              <span>{t('integrity.title', { file: name })}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: '17px', color: 'var(--cth-ink-700)' }}>
              {issue.copy
                ? <>{before}<code dir="ltr" style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, overflowWrap: 'anywhere' }}>{issue.copy.split(/[\\/]/).pop()}</code>{after}</>
                : null}
              {base === 'config.json' ? `${issue.copy ? ' ' : ''}${t('integrity.defaults')}` : null}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <PixelButton variant="secondary" size="sm" onClick={() => void window.cth.revealDamagedFile(issue.file)}>{t('integrity.show')}</PixelButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import type { RecoveryNotice as RecoveryNoticeView } from '@shared/viewRecovery';

const POLL_MS = 5000;

function Tag({ children }: { children: ReactNode }) {
  return (
    <span style={{
      display: 'inline-block', fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px', padding: '0 5px',
      whiteSpace: 'nowrap', fontWeight: 400, color: 'var(--cth-ink-900)', background: 'var(--cth-lemon-light)',
      boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
    }}>{children}</span>
  );
}

const boxStyle: CSSProperties = {
  padding: '10px 12px', background: 'var(--cth-paper-100)', color: 'var(--cth-ink-900)',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-500), var(--cth-shadow-hard)',
};

/** The time main brought the window back, in the window's language. */
function clock(at: number, lang: string): string {
  const d = new Date(at);
  try { return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }); } catch { return d.toLocaleTimeString(); }
}

/** After main reloaded this window by itself (its view died, or the root error
 *  boundary asked): says so once, with the time, until OK (Pam's P7). Taking the
 *  notice clears it, so the next window does not say it again. */
export function RecoveryNotice() {
  const { t, i18n } = useTranslation();
  const [notice, setNotice] = useState<RecoveryNoticeView | null>(null);
  useEffect(() => {
    let alive = true;
    void window.cth.takeRecoveryNotice().then((n) => { if (alive) setNotice(n ?? null); }).catch(() => { /* none */ });
    return () => { alive = false; };
  }, []);
  if (!notice) return null;
  return (
    <div role="status" style={{
      ...boxStyle, position: 'fixed', insetInlineStart: 16, bottom: 16, zIndex: 900, maxWidth: 360,
      fontSize: 12.5, lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <b>{t('recovery.title', { time: clock(notice.at, i18n.language) })}</b>
      <span>{t('recovery.body')}</span>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PixelButton variant="secondary" size="sm" onClick={() => setNotice(null)}>{t('recovery.ok')}</PixelButton>
      </div>
    </div>
  );
}

export interface IntegrityIssue { file: string; copy: string | null; error: string }

/** The sources of truth main holds as damaged (config.json, tasks.json,
 *  registry.json), by name, polled. An empty list once they read again. */
export function useIntegrityIssues(): IntegrityIssue[] {
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => window.cth.integrityIssues()
      .then((list) => { if (alive) setIssues(Array.isArray(list) ? list : []); })
      .catch(() => { /* keep the last list */ });
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  return issues;
}

/** The plain words for each file the banner can name. */
const FILE_KEY: Record<string, string> = { 'config.json': 'config', 'tasks.json': 'tasks', 'registry.json': 'registry' };

/** A file that does not read (Kevin's R2, Pam's P7): kept as it is, copied under
 *  a dated name, and nothing writes over it. The banner names it in plain words,
 *  says where the copy is, and goes by itself once the file reads again; it has
 *  no close while changes are paused. "show the file" opens its folder. */
export function IntegrityBanner() {
  const { t } = useTranslation();
  const issues = useIntegrityIssues();
  if (!issues.length) return null;
  return (
    <div style={{
      position: 'fixed', top: 48, left: '50%', transform: 'translateX(-50%)', zIndex: 950,
      width: 'min(560px, calc(100% - 32px))', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {issues.map((issue) => {
        const key = FILE_KEY[issue.file];
        const name = key ? t(`integrity.file.${key}`) : issue.file;
        // The copy's name sits in code type inside the sentence.
        const [before, after] = t('integrity.body', { copy: '\u0001' }).split('\u0001');
        return (
          <div key={issue.file} role="status" data-integrity={issue.file} style={{ ...boxStyle, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
              <Tag>{t('integrity.paused')}</Tag>
              <span>{t('integrity.title', { file: name })}</span>
            </div>
            {/* With no copy made, the same line without naming one (Pam's P7). */}
            <p style={{ margin: 0, fontSize: 12, lineHeight: '17px', color: 'var(--cth-ink-700)' }}>
              {issue.copy
                ? <>{before}<code dir="ltr" style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, overflowWrap: 'anywhere' }}>{issue.copy}</code>{after}</>
                : t('integrity.bodyNoCopy')}
              {key === 'config' && ' ' + t('integrity.defaults')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <PixelButton variant="secondary" size="sm" onClick={() => void window.cth.integrityReveal(issue.file).catch(() => undefined)}>
                {t('integrity.show')}
              </PixelButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

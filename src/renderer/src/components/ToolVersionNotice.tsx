/**
 * A tool installed at a version other than the one this app is tested with
 * (MEMPALACE_PIN). A NOTICE, not a failure: it uses the waiting colour, the row
 * above it still reads found, and nothing is blocked or run. The command to
 * switch is shown to copy; the person decides whether to run it.

 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { versionNotice, type ToolStatus } from '../../../shared/toolCatalog';
import { BooCopied } from './season/Kit';

export function ToolVersionNotice({ tool }: { tool: ToolStatus }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const notice = versionNotice(tool);
  if (!notice) return null;
  const copy = () => {
    void navigator.clipboard.writeText(notice.command).then(
      () => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); },
      () => { /* the command is on screen to select by hand */ }
    );
  };
  return (
    <div
      data-testid="tool-version-notice"
      style={{
        padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 6,
        background: 'var(--cth-status-waiting-tint, var(--cth-cream-100))',
        boxShadow: 'inset 0 0 0 1px var(--cth-status-waiting)'
      }}
    >
      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--cth-ink-900)' }}>
        {t('setupPanel.versionNotice', { installed: notice.installed, pinned: notice.pinned })}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        <code style={{
          flex: 1, minWidth: 0, fontFamily: 'var(--cth-font-mono)', fontSize: 11,
          padding: '4px 6px', background: 'var(--cth-cream-100)',
          boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
          color: 'var(--cth-ink-900)', overflowX: 'auto', whiteSpace: 'pre'
        }}>{notice.command}</code>
        <button
          type="button"
          onClick={copy}
          style={{
            flexShrink: 0, fontFamily: 'var(--cth-font-ui)', fontSize: 11, padding: '0 8px',
            background: 'var(--cth-cream-200)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
            border: 'none', cursor: 'pointer', color: 'var(--cth-ink-900)', position: 'relative', isolation: 'isolate'
          }}
        >{copied ? t('common.copy') + ' ✓' : t('common.copy')}{copied && <BooCopied />}</button>
      </div>
    </div>
  );
}

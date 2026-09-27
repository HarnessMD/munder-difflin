/**
 * PREREQUISITES, the PRO section (v0.4.9 phase 5a, founder's order): the
 * local tool lookup lives in Settings → Prerequisites and nowhere else, and
 * it runs ONLY after the person presses Check now under the sentence that
 * says what it does. Nothing is probed on mount; the Capabilities page no
 * longer calls tools:status at all.
 *
 * Rendered by SettingsModal under its inline chrome (the PRO Settings page)
 * in the modal's own idiom, since phase 5b restyles the whole modal later;
 * Classic keeps SetupPanel unchanged. The rows carry the same facts and the
 * same install hints SetupPanel gives: found, the resolved path and detail,
 * the platform install command with a copy button, the note, the docs link.
 * tools:status resolves each binary on PATH by design (no process is
 * launched for a version string), so a version shows only where the probe
 * reports one in `detail`.
 */
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { ToolKind, ToolStatus } from '../../../shared/toolCatalog';

const KINDS: ToolKind[] = ['prerequisite', 'memory', 'engine'];

const head: CSSProperties = { fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px', color: 'var(--cth-ink-500)', textTransform: 'uppercase', marginBottom: 10 };
const kindHead: CSSProperties = { fontFamily: 'var(--cth-font-display)', fontSize: 10, letterSpacing: 0.5, color: 'var(--cth-ink-500)', textTransform: 'uppercase' };
const btn: CSSProperties = { padding: '5px 10px 4px', border: 'none', cursor: 'pointer', fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-900)', background: 'var(--cth-cream-200)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)' };
const row: CSSProperties = { padding: 10, display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)' };

export function PrerequisitesCheck() {
  const { t } = useTranslation();
  const [tools, setTools] = useState<ToolStatus[] | null>(null);
  const [busy, setBusy] = useState(false);

  /** The only caller of tools:status on this page: a click, never a mount. */
  const check = async () => {
    setBusy(true);
    try { setTools(await window.cth.toolsStatus()); }
    catch { setTools([]); }
    finally { setBusy(false); }
  };

  const found = (tools ?? []).filter((x) => x.found).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={head}>{t('pro.prereq.title')}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ flex: 1, minWidth: 220, fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-700)' }}>{t('pro.prereq.confirm')}</span>
        <button type="button" disabled={busy} onClick={() => { void check(); }} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>
          {busy ? t('pro.prereq.checking') : tools ? t('pro.prereq.recheck') : t('pro.prereq.check')}
        </button>
      </div>
      {tools && (
        <>
          <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.prereq.summary', { found, total: tools.length })}</span>
          {KINDS.map((kind) => {
            const rows = tools.filter((x) => x.kind === kind);
            if (rows.length === 0) return null;
            return (
              <div key={kind} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={kindHead}>{t(`pro.prereq.kind.${kind}`)}</div>
                {rows.map((x) => <ToolRow key={x.id} tool={x} />)}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function ToolRow({ tool }: { tool: ToolStatus }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(tool.installCommand).then(
      () => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); },
      () => { /* the command is on screen to select by hand */ }
    );
  };
  return (
    <div style={row}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 11, flex: 1, minWidth: 0 }}>{tool.label.toUpperCase()}</span>
        <span style={{
          fontFamily: 'var(--cth-font-display)', fontSize: 9, letterSpacing: 0.5, padding: '2px 6px', whiteSpace: 'nowrap', color: 'var(--cth-ink-900)',
          background: tool.found ? 'var(--cth-status-success-tint)' : 'var(--cth-cream-200)', boxShadow: `inset 0 0 0 1px ${tool.found ? 'var(--cth-status-success)' : 'var(--cth-ink-300)'}`
        }}>{tool.found ? t('pro.prereq.found') : t('pro.prereq.missing')}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: 1.5 }}>{tool.why}</div>
      {tool.found && (tool.path || tool.detail) && (
        <div style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', wordBreak: 'break-all' }}>
          {[tool.path, tool.detail].filter(Boolean).join(' · ')}
        </div>
      )}
      {!tool.found && tool.installCommand && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
          <code style={{ flex: 1, minWidth: 0, fontFamily: 'var(--cth-font-mono)', fontSize: 11, padding: '4px 6px', background: 'var(--cth-cream-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', color: 'var(--cth-ink-900)', overflowX: 'auto', whiteSpace: 'pre' }}>{tool.installCommand}</code>
          <button type="button" onClick={copy} style={{ ...btn, flexShrink: 0, fontSize: 11 }}>{copied ? t('pro.prereq.copied') : t('common.copy')}</button>
        </div>
      )}
      {(tool.note || tool.docsUrl) && (
        <div style={{ fontSize: 11, color: 'var(--cth-ink-500)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tool.note && <span>{tool.note}</span>}
          {tool.docsUrl && (
            <button type="button" onClick={() => { void window.cth.openExternal(tool.docsUrl!); }} style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', fontSize: 11, color: 'var(--cth-ink-700)', cursor: 'pointer', textDecoration: 'underline' }}>{t('pro.prereq.docs')}</button>
          )}
        </div>
      )}
    </div>
  );
}

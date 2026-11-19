/**
 * Closing over unsaved text asks first (founder, 15 Oct 2026: closing a file
 * with unsaved changes "does not do anything, it should ideally open a prompt
 * box ... your changes would be lost and close option", and closing the IDE
 * "should ask them to save/discard all changes").
 *
 * One dialog for both: a tab names its file, the IDE lists every file. Save
 * writes first and closes only when every write worked; a write that fails
 * keeps the dialog open and says which. Drawn like the new file dialog, above
 * every pane.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ideTextBtn as textBtn } from './chrome';

export interface UnsavedDialogProps {
  /** `tab`: one file is closing. `ide`: the whole IDE is. */
  scope: 'tab' | 'ide';
  /** Paths, relative to the workspace, with unsaved text. */
  files: string[];
  saving: boolean;
  /** Paths whose save failed in the last try. */
  failed: string[];
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedDialog({ scope, files, saving, failed, onSave, onDiscard, onCancel }: UnsavedDialogProps) {
  const { t } = useTranslation();
  const saveRef = useRef<HTMLButtonElement | null>(null);
  // Enter saves, the safe answer; Escape is Cancel.
  useEffect(() => { saveRef.current?.focus(); }, []);
  return (
    <>
      <div onClick={saving ? undefined : onCancel} style={{ position: 'fixed', inset: 0, zIndex: 429, background: 'rgba(0,0,0,0.16)' }} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={t('idePanel.unsaved.title')}
        data-ide-unsaved={scope}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); if (!saving) onCancel(); }
        }}
        style={{
          position: 'fixed', top: '18vh', insetInlineStart: '50%', transform: 'translateX(-50%)',
          zIndex: 430, width: 460, maxWidth: '92vw', padding: 16,
          display: 'flex', flexDirection: 'column', gap: 10,
          background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)',
          border: '1px solid var(--cth-ink-300)', borderRadius: 8,
          boxShadow: 'var(--cth-shadow-hard)', fontFamily: 'var(--cth-font-ui)'
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t('idePanel.unsaved.title')}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--cth-ink-700)' }}>
          {scope === 'tab' ? t('idePanel.unsaved.tabBody', { file: files[0] ?? '' }) : t('idePanel.unsaved.ideBody')}
        </div>
        {scope === 'ide' && (
          <ul data-ide-unsaved-files style={{ margin: 0, padding: '6px 10px', listStyle: 'none', maxHeight: 180, overflowY: 'auto', border: '1px solid var(--cth-ink-300)', borderRadius: 6, background: 'var(--cth-paper-100)' }}>
            {files.map((rel) => (
              <li key={rel} style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12, lineHeight: '20px', overflowWrap: 'anywhere', color: failed.includes(rel) ? 'var(--cth-coral)' : 'var(--cth-ink-900)' }}>{rel}</li>
            ))}
          </ul>
        )}
        {failed.length > 0 && (
          <div role="alert" style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--cth-coral)' }}>{t('idePanel.unsaved.failed', { files: failed.join(', ') })}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
          <button type="button" onClick={onCancel} disabled={saving} style={textBtn}>{t('idePanel.unsaved.cancel')}</button>
          <button type="button" data-ide-unsaved-discard onClick={onDiscard} disabled={saving}
            style={{ ...textBtn, color: 'var(--cth-coral)' }}>
            {scope === 'tab' ? t('idePanel.unsaved.closeWithout') : t('idePanel.unsaved.discardAll')}
          </button>
          <button type="button" ref={saveRef} data-ide-unsaved-save onClick={onSave} disabled={saving}
            style={{ ...textBtn, background: 'var(--cth-accent)', color: 'var(--cth-accent-ink)', opacity: saving ? 0.6 : 1 }}>
            {saving ? t('idePanel.unsaved.saving') : scope === 'tab' ? t('idePanel.unsaved.saveAndClose') : t('idePanel.unsaved.saveAll')}
          </button>
        </div>
      </div>
    </>
  );
}

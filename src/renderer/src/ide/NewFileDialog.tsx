/**
 * MAKE A FILE WITHOUT LEAVING THE PANEL (0.4.9 phase 8).
 *
 * There was already a "New file" in the tree's right click menu. It asked for a
 * name in a row, handed the name straight to `fs:createFile`, and printed
 * whatever came back on the row it came from. That is fine on the happy path
 * and it is exactly where a file panel loses trust everywhere else, because the
 * four things people actually type are:
 *
 *   a name that is taken       the create refuses (it opens `wx`, so it never
 *                              truncates), and this says so BEFORE the click as
 *                              well, from the folder listing it already has.
 *   a name with a slash        which is a path, and is useful. The folders it
 *                              implies are listed, and made in order, because
 *                              `fs:createFile` will not make a parent.
 *   a name with no extension   which is fine. It gets a note saying the file
 *                              will open as plain text, not a refusal.
 *   a folder they cannot write which is EACCES, and the only honest answer is
 *                              to name the folder and the reason.
 *
 * Every decision about the NAME is made in `@shared/ideNewFile`, which is pure
 * and tested. This file is the surface: the field, the preview of the path it
 * will make, and the message when the filesystem disagrees.
 *
 * It creates through the doors that already exist (`fs:mkdir`, `fs:createFile`)
 * and invents none.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CREATE_ERROR_KEYS, NAME_NOTE_KEYS, NAME_PROBLEM_KEYS,
  checkNewFileName, explainCreateError
} from '@shared/ideNewFile';
import { ideTextBtn as textBtn } from './chrome';

export interface NewFileDialogProps {
  root: string;
  /** Folder the file lands in, relative to the root. `''` is the root. */
  folderRel: string;
  /** Called with the created path, relative to the root. */
  onCreated: (rel: string) => void;
  onClose: () => void;
}

type Busy = { kind: 'idle' } | { kind: 'creating' } | { kind: 'failed'; message: string };

export function NewFileDialog({ root, folderRel, onCreated, onClose }: NewFileDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState<Busy>({ kind: 'idle' });
  /** Names already in the target folder, for the warning that arrives before
   *  the click rather than after it. Null while it is still being read, which
   *  is NOT the same as an empty folder and must not warn either way. */
  const [siblings, setSiblings] = useState<Set<string> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const check = useMemo(() => checkNewFileName(folderRel, value), [folderRel, value]);
  const targetFolder = check.ok ? check.parentRel : folderRel;

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Read the folder the file would land in, so "that name is taken" can be said
  // while the person is still typing it.
  useEffect(() => {
    let alive = true;
    setSiblings(null);
    void window.cth.listDir(root, targetFolder).then((res) => {
      if (!alive) return;
      setSiblings(res.ok ? new Set(res.entries.map((e) => e.name)) : new Set());
    });
    return () => { alive = false; };
  }, [root, targetFolder]);

  const taken = check.ok && siblings !== null && siblings.has(check.name);

  const create = async (): Promise<void> => {
    if (!check.ok || busy.kind === 'creating') return;
    setBusy({ kind: 'creating' });
    // Folders first, outermost in, because createFile never makes a parent.
    // An "already exists" here is not a failure: the person typed a path
    // through folders that are partly already there, which is normal.
    for (const dir of check.newDirs) {
      const made = await window.cth.makeDir(root, dir);
      if (!made.ok && explainCreateError(made.error) !== 'exists') {
        setBusy({ kind: 'failed', message: message(made.error) });
        return;
      }
    }
    const res = await window.cth.createFile(root, check.rel);
    if (!res.ok) { setBusy({ kind: 'failed', message: message(res.error) }); return; }
    onCreated(check.rel);
  };

  /** An errno turned into a sentence, or the raw text when it is one we have
   *  never seen. Never swallowed: an unrecognised failure is still shown. */
  const message = (raw: string): string => {
    const code = explainCreateError(raw);
    if (code === 'unknown') return raw;
    return t(CREATE_ERROR_KEYS[code], { folder: targetFolder || t('ide.create.theWorkspace') });
  };

  const problem = !check.ok && value.trim() ? t(NAME_PROBLEM_KEYS[check.problem]) : null;
  const notes = check.ok ? check.notes : [];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 429, background: 'rgba(0,0,0,0.16)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('ide.create.title')}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); onClose(); }
        }}
        style={{
          position: 'fixed', top: '18vh', insetInlineStart: '50%', transform: 'translateX(-50%)',
          zIndex: 430, width: 460, maxWidth: '92vw', padding: 14,
          display: 'flex', flexDirection: 'column', gap: 8,
          background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)',
          border: '1px solid var(--cth-ink-300)', borderRadius: 8,
          boxShadow: 'var(--cth-shadow-hard)'
        }}
      >
        <div style={{
          fontFamily: 'var(--cth-font-display)', fontSize: 8, textTransform: 'uppercase',
          letterSpacing: 1, color: 'var(--cth-ink-700)'
        }}>{t('ide.create.title')}</div>

        <label style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-700)' }}>
          {t('ide.create.inFolder', { folder: folderRel || t('ide.create.theWorkspace') })}
        </label>

        <input
          ref={inputRef}
          value={value}
          spellCheck={false}
          placeholder={t('ide.create.placeholder')}
          aria-label={t('ide.create.placeholder')}
          onChange={(e) => { setValue(e.target.value); setBusy({ kind: 'idle' }); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void create(); } }}
          style={{
            height: 30, padding: '0 8px', font: 'inherit', fontFamily: 'var(--cth-font-mono)', fontSize: 13,
            border: '1px solid var(--cth-ink-300)', borderRadius: 6,
            background: 'var(--cth-paper-100)', color: 'var(--cth-ink-900)'
          }}
        />

        {/* What this will actually make, spelled out. A person typing
            `docs/notes.md` should not have to guess where it lands. */}
        <div style={{
          fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, color: 'var(--cth-ink-500)',
          wordBreak: 'break-all', minHeight: 16
        }}>
          {check.ok ? t('ide.create.willCreate', { path: check.rel }) : ''}
        </div>

        {problem && <Line tone="bad">{problem}</Line>}
        {taken && <Line tone="bad">{t('ide.create.errExists', { folder: targetFolder || t('ide.create.theWorkspace') })}</Line>}
        {check.ok && check.newDirs.length > 0 && (
          <Line tone="note">{t('ide.create.willMakeFolders', { folders: check.newDirs.join(', ') })}</Line>
        )}
        {notes.filter((n) => n !== 'nested').map((n) => (
          <Line key={n} tone="note">{t(NAME_NOTE_KEYS[n])}</Line>
        ))}
        {busy.kind === 'failed' && <Line tone="bad">{busy.message}</Line>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
          <button type="button" onClick={onClose} style={textBtn}>{t('common.cancel')}</button>
          <button
            type="button"
            onClick={() => { void create(); }}
            disabled={!check.ok || taken || busy.kind === 'creating'}
            style={{
              ...textBtn,
              background: check.ok && !taken ? 'var(--cth-accent)' : 'var(--cth-cream-100)',
              color: check.ok && !taken ? 'var(--cth-accent-ink)' : 'var(--cth-ink-500)',
              opacity: check.ok && !taken && busy.kind !== 'creating' ? 1 : 0.6
            }}
          >{busy.kind === 'creating' ? t('ide.create.creating') : t('ide.create.confirm')}</button>
        </div>
      </div>
    </>
  );
}

function Line({ children, tone }: { children: React.ReactNode; tone: 'bad' | 'note' }) {
  return (
    <div style={{
      fontFamily: 'var(--cth-font-ui)', fontSize: 12, lineHeight: 1.4,
      color: tone === 'bad' ? 'var(--cth-coral)' : 'var(--cth-ink-500)'
    }}>{children}</div>
  );
}

/**
 * EDITOR CHROME (0.4.9 phase 8, restyled for the 0.4.11 redesign the founder
 * approved on 5 Sep 2026 from hive/shared/design/app-v2/ide-prototype.html).
 *
 * The panel had an editor in it and did not read as one. What separates the two
 * is not decoration, it is a handful of facts the surface states without being
 * asked:
 *
 *   the breadcrumb   where this file is, as a trail you can point at, instead
 *                    of one ellipsised path stuffed in a title attribute. The
 *                    folder crumbs are buttons because the new file field has
 *                    to be aimed somewhere, and the place a person means is
 *                    almost always the folder they are already looking at.
 *   the save chip    what state the buffer is in, in words. A bullet after the
 *                    filename says "something", and a person has to remember
 *                    which something. Unsaved, saving, saved and the failure
 *                    are four different states and they say four things. Since
 *                    the redesign the unsaved state is the Save button itself,
 *                    when the caller gives it something to do.
 *   the status line  branch, caret, selection, size, line endings, language.
 *                    Every one read off the buffer (see `@shared/ideStatus`) or
 *                    handed in by the panel, none of them assumed. One 24px
 *                    line at the bottom, in the terminal's face.
 *   the key sheet    the shortcuts, in a panel with no menu bar to find them
 *                    in. Monaco has shipped find, replace, the palette and go
 *                    to line since the editor landed and essentially nobody
 *                    knew, because nothing in the app ever said so.
 *
 * The sheet lists ONLY bindings that exist: Monaco's own defaults, and the four
 * this panel binds itself. Do not add an aspirational row.
 *
 * The IDE is one surface for both skins, so every PRO token here carries the
 * Classic fallback beside it.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { breadcrumb, countLines, detectLineEnding, languageLabel, utf8Bytes } from '@shared/ideStatus';
import { formatBytes } from '@shared/imageTypes';
import { IdeIcon } from './ideIcons';

/** Electron reports the host platform in the UA; there is no platform helper in
 *  the renderer, and printing ⌘ to a Linux user would be worse than useless. */
export const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const ACCENT = 'var(--cth-accent, var(--cth-lemon))';
const ACCENT_INK = 'var(--cth-accent-ink, var(--cth-ink-900))';
const HOVER = 'var(--cth-surface-active, var(--cth-cream-200))';

/* ─────────────────────────────── breadcrumb ─────────────────────────────── */

export function Breadcrumb({ root, rel, onPickFolder }: {
  root: string;
  rel: string;
  /** Aim the new file field at a folder. */
  onPickFolder?: (folderRel: string) => void;
}) {
  const { t } = useTranslation();
  const crumbs = breadcrumb(root, rel);
  return (
    <nav
      aria-label={t('ide.status.pathLabel')}
      style={{
        display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1,
        overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: 'var(--cth-font-ui)', fontSize: 12
      }}
    >
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${c.rel ?? 'file'}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>
            {i > 0 && (
              <span aria-hidden style={{ padding: '0 2px', color: 'var(--cth-ink-300)' }}>/</span>
            )}
            {last || !onPickFolder ? (
              <span
                title={last ? `${root}/${rel}` : c.label}
                style={{
                  padding: '2px 4px', borderRadius: 4,
                  color: last ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)',
                  fontWeight: last ? 500 : 400,
                  overflow: 'hidden', textOverflow: 'ellipsis'
                }}
              >{c.label}</span>
            ) : (
              <button
                type="button"
                className="ide-crumb"
                onClick={() => onPickFolder(c.rel ?? '')}
                title={t('ide.create.aimHere')}
                style={{
                  padding: '2px 4px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer',
                  font: 'inherit', color: 'var(--cth-ink-500)', maxWidth: 160,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}
              >{c.label}</button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/* ─────────────────────────────── save state ─────────────────────────────── */

/**
 * The unsaved indicator, in words.
 *
 * Honest means it never claims more than it knows: `saved` appears only after a
 * write came back ok, and it stands down again a beat later rather than sitting
 * there implying the buffer on screen is still the buffer on disk. A failed
 * write keeps its message until something changes, because that is the one
 * state a person must not scroll past.
 *
 * With `onSave`, the unsaved state is the Save button (the redesign's
 * breadcrumb bar): the word "unsaved" is its tooltip, the action is the
 * button. Without it, the unsaved state is the chip it always was.
 */
export function SaveChip({ dirty, saveState, error, onSave }: {
  dirty: boolean; saveState: SaveState; error?: string; onSave?: () => void;
}) {
  const { t } = useTranslation();
  const chip: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
    padding: '0 6px', height: 18, borderRadius: 5,
    fontFamily: 'var(--cth-font-ui)', fontSize: 10.5, fontWeight: 500, lineHeight: '18px', whiteSpace: 'nowrap'
  };
  if (saveState === 'saving') {
    return <span style={{ ...chip, background: 'var(--cth-sky-light)', color: 'var(--cth-ink-900)' }}>{t('ide.status.saving')}</span>;
  }
  if (saveState === 'error') {
    return (
      <span title={error} style={{ ...chip, background: 'var(--cth-coral-light)', color: 'var(--cth-ink-900)' }}>
        {t('ide.status.saveFailed')}
      </span>
    );
  }
  if (saveState === 'saved') {
    return <span style={{ ...chip, background: 'var(--cth-cream-200)', color: 'var(--cth-ink-700)' }}>{t('idePanel.saved')}</span>;
  }
  if (dirty && onSave) {
    return (
      <button
        type="button"
        onClick={onSave}
        title={t('ide.status.unsaved')}
        aria-label={`${t('ide.status.save')}: ${t('ide.status.unsaved')}`}
        style={{
          ...chip, height: 22, padding: '0 8px', border: 'none', cursor: 'pointer', fontSize: 11.5,
          background: ACCENT, color: ACCENT_INK, borderRadius: 6
        }}
      >
        {t('ide.status.save')}
        <kbd style={{ font: 'inherit', fontFamily: 'var(--cth-font-mono)', fontSize: 10, opacity: 0.75 }}>{IS_MAC ? '⌘S' : 'Ctrl+S'}</kbd>
      </button>
    );
  }
  if (dirty) {
    return <span style={{ ...chip, background: 'var(--cth-lemon-light)', color: 'var(--cth-ink-900)' }}>{t('ide.status.unsaved')}</span>;
  }
  return (
    <span title={t('ide.status.onDisk')} style={{ ...chip, background: 'var(--cth-cream-200)', color: 'var(--cth-ink-500)' }}>
      {t('idePanel.saved')}
    </span>
  );
}

/* ─────────────────────────────── status line ────────────────────────────── */

export interface CaretPosition { line: number; column: number; selected: number }

export function EditorStatusBar({ content, caret, languageId, dirty, saveState, error, onShowKeys, branch, onSave }: {
  content: string;
  /** Undefined until Monaco has reported one, which is why the position slot
   *  falls back to line 1 column 1 rather than to a blank. */
  caret?: CaretPosition;
  languageId: string;
  /** The save state is drawn here only when the caller hands it over; the
   *  redesign's breadcrumb bar carries it instead and leaves these out. */
  dirty?: boolean;
  saveState?: SaveState;
  error?: string;
  onShowKeys: () => void;
  /** The checked out branch, drawn first. Omitted outside a repository. */
  branch?: string;
  onSave?: () => void;
}) {
  const { t } = useTranslation();
  const lines = countLines(content);
  const eol = detectLineEnding(content);
  const bytes = utf8Bytes(content);
  const cell: React.CSSProperties = {
    fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)',
    whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums'
  };
  const word: React.CSSProperties = { ...cell, fontFamily: 'var(--cth-font-ui)' };
  return (
    <div style={{
      height: 24, display: 'flex', alignItems: 'center', gap: 14, padding: '0 6px 0 12px', flexShrink: 0,
      background: 'var(--cth-cream-100)', borderTop: '1px solid var(--cth-ink-300)'
    }}>
      {branch && (
        <span style={{ ...word, display: 'inline-flex', alignItems: 'center', gap: 5 }} title={t('ide.status.branch')}>
          <IdeIcon name="git" size={13} />
          {branch}
        </span>
      )}
      <span style={cell}>
        {t('ide.status.position', { line: caret?.line ?? 1, col: caret?.column ?? 1 })}
      </span>
      {caret && caret.selected > 0 && (
        <span style={cell}>{t('ide.status.selected', { n: caret.selected })}</span>
      )}
      <span style={cell}>{t('ide.status.lines', { n: lines })}</span>
      <span style={cell} title={t('ide.status.bytesTitle')}>{formatBytes(bytes)}</span>
      <span style={cell} title={eol === 'mixed' ? t('ide.status.eolMixedTitle') : undefined}>
        {eol === 'none' ? t('ide.status.eolNone') : eol === 'mixed' ? t('ide.status.eolMixed') : eol}
      </span>
      <span style={word}>
        {languageId === 'plaintext' ? t('ide.status.plainText') : languageLabel(languageId)}
      </span>
      <span style={{ flex: 1 }} />
      {saveState !== undefined && <SaveChip dirty={!!dirty} saveState={saveState} error={error} onSave={onSave} />}
      <button
        type="button"
        className="ide-keys-btn"
        onClick={onShowKeys}
        title={t('ide.keys.title')}
        aria-label={t('ide.keys.title')}
        style={{
          width: 22, height: 22, borderRadius: 6, border: 'none', padding: 0, background: 'transparent',
          display: 'grid', placeItems: 'center', color: 'var(--cth-ink-500)', cursor: 'pointer', flexShrink: 0
        }}
      >
        <IdeIcon name="keys" size={14} />
      </button>
    </div>
  );
}

/* ─────────────────────────────── the key sheet ──────────────────────────── */

/** Bindings that actually exist. The first four are this panel's own (see the
 *  keydown handler in IdePanel); the rest are Monaco's defaults, unchanged. */
export function shortcutRows(t: (k: string) => string): ReadonlyArray<readonly [string, string]> {
  const mod = IS_MAC ? '⌘' : 'Ctrl+';
  const shift = IS_MAC ? '⇧' : 'Shift+';
  const alt = IS_MAC ? '⌥' : 'Alt+';
  const ctrl = IS_MAC ? '⌃' : 'Ctrl+';
  return [
    [`${mod}S`, t('ide.keys.save')],
    [`${mod}N`, t('ide.keys.newFile')],
    [`${mod}P`, t('ide.keys.findFile')],
    [`${shift}${mod}F`, t('ide.keys.findText')],
    ['Esc', t('ide.keys.closeIde')],
    [`${mod}F`, t('ide.keys.findInFile')],
    [IS_MAC ? `${alt}${mod}F` : 'Ctrl+H', t('ide.keys.replace')],
    ['F1', t('ide.keys.palette')],
    [`${ctrl}G`, t('ide.keys.goToLine')],
    [`${shift}${mod}O`, t('ide.keys.goToSymbol')]
  ];
}

/** The sheet. Esc closes it, a click outside closes it, and it takes focus so
 *  the keyboard does not stay behind in the editor. */
export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const rows = shortcutRows((k) => t(k));
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 419 }} />
      <div
        ref={ref}
        role="dialog"
        aria-label={t('ide.keys.title')}
        tabIndex={-1}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
        style={{
          position: 'absolute', insetInlineEnd: 12, bottom: 32, zIndex: 420,
          width: 300, padding: '10px 12px',
          background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-300)',
          borderRadius: 10, boxShadow: 'var(--cth-shadow-hard)', outline: 'none'
        }}
      >
        <div style={{
          fontFamily: 'var(--cth-font-ui)', fontSize: 12, fontWeight: 600,
          color: 'var(--cth-ink-900)', marginBottom: 6
        }}>{t('ide.keys.title')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 10px', alignItems: 'baseline' }}>
          {rows.map(([keys, label]) => (
            <ShortcutRow key={label} keys={keys} label={label} />
          ))}
        </div>
      </div>
    </>
  );
}

function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <>
      <span style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-700)' }}>{label}</span>
      <span style={{
        fontFamily: 'var(--cth-font-mono)', fontSize: 10.5, color: 'var(--cth-ink-500)',
        background: 'var(--cth-cream-200)', border: '1px solid var(--cth-ink-300)',
        padding: '0 4px', borderRadius: 4, lineHeight: '15px', justifySelf: 'end', whiteSpace: 'nowrap'
      }}>{keys}</span>
    </>
  );
}

/** The same list, flat, for the empty state. It is the one moment the pane has
 *  nothing else to say, so the shortcuts are shown rather than hidden behind a
 *  button nobody has a reason to press yet. */
export function ShortcutHint() {
  const { t } = useTranslation();
  return (
    <div style={{
      marginTop: 10, display: 'grid', gap: 2, justifyItems: 'center',
      fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-ink-300)'
    }}>
      {shortcutRows((k) => t(k)).slice(0, 5).map(([keys, label]) => (
        <div key={label} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--cth-font-mono)', color: 'var(--cth-ink-500)' }}>{keys}</span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

// Hover rules inline styles cannot say. One rule set, injected once.
const CHROME_CSS = [
  `.ide-crumb:hover{background:${HOVER};color:var(--cth-ink-900)}`,
  `.ide-keys-btn:hover{background:${HOVER};color:var(--cth-ink-900)}`
].join('');
if (typeof document !== 'undefined' && !document.getElementById('ide-chrome-style')) {
  const style = document.createElement('style');
  style.id = 'ide-chrome-style';
  style.textContent = CHROME_CSS;
  document.head.appendChild(style);
}

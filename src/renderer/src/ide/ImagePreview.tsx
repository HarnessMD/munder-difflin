/**
 * Image tab body for the IDE.
 *
 * Replaces the dead end this app used to have: opening a .png in the IDE created
 * a tab whose entire content was the red text "binary file (not displayable)",
 * because the only file reader available refused anything with a null byte. That
 * made screenshots — the single most common non-text artefact an agent writes —
 * invisible inside the product that produced them.
 *
 * The bytes arrive over IPC and are held as a `blob:` URL by useWorkspaceImage,
 * which owns revocation (see the note there: blob URLs outlive the elements that
 * reference them, and IDE tabs open and close all day).
 *
 * The bar deliberately mirrors the editor's bar minus Save — nothing here is
 * editable — so the tab strip reads as one surface rather than two.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceImage } from '@/hooks/useWorkspaceImage';
import { formatBytes, isSvgPath } from '@shared/imageTypes';
import { ideBarStyle, ideIconBtn, ideTextBtn } from './chrome';
import { FileIcon, IdeIcon } from './ideIcons';

export interface ImagePreviewProps {
  /** Absolute workspace root the path is confined to. */
  root: string;
  /** Workspace-relative path of the image. */
  rel: string;
  /** Copy the absolute path (same affordance as the editor bar). */
  onCopyPath: () => void;
  /** Open this file in Monaco instead. Present for SVG, whose source is
   *  hand-edited often enough that a read-only preview would be a regression. */
  onViewSource?: () => void;
}

export function ImagePreview({ root, rel, onCopyPath, onViewSource }: ImagePreviewProps) {
  const { t } = useTranslation();
  const img = useWorkspaceImage(root, rel);
  // Fit is the default because the common case is a full-screen screenshot that
  // is far wider than the pane; showing it at 1:1 first would open every tab
  // scrolled into the top-left corner of a picture nobody can see the shape of.
  const [fit, setFit] = useState(true);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [decodeFailed, setDecodeFailed] = useState(false);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={ideBarStyle}>
        <FileIcon rel={rel} size={14} />
        <span
          style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--cth-font-mono)', color: 'var(--cth-ink-900)' }}
          title={rel}
        >{rel}</span>

        {/* Facts about the file, in the same muted register as the diff bar's
            HEAD → working tree label. Dimensions only exist once the image has
            actually decoded, so this stays honest about what is known. */}
        <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>
          {dims ? `${dims.w}×${dims.h}` : '—'}
          {img.status === 'ready' ? ` · ${formatBytes(img.size)}` : ''}
        </span>

        {/* 0.4.11: the kit's segmented control, the same one the markdown
            view switch uses in the crumb bar. */}
        <span role="radiogroup" style={{ display: 'inline-flex', padding: 2, gap: 1, background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-300)', borderRadius: 'var(--cth-radius-md, 7px)' }}>
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={fit === v}
              onClick={() => setFit(v)}
              title={v ? t('imagePreview.fitTitle') : t('imagePreview.oneToOneTitle')}
              style={{
                height: 20, padding: '0 8px', border: 'none', borderRadius: 5, font: 'inherit', fontSize: 11.5, cursor: 'pointer',
                background: fit === v ? 'var(--cth-cream-50)' : 'transparent', color: fit === v ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)',
                fontWeight: fit === v ? 500 : 400, boxShadow: fit === v ? '0 1px 2px rgba(0,0,0,0.08)' : undefined
              }}
            >{v ? t('imagePreview.fit') : '1:1'}</button>
          ))}
        </span>

        {onViewSource && (
          <button type="button" onClick={onViewSource} title={t('imagePreview.viewSourceTitle')} style={{ ...ideTextBtn, border: '1px solid transparent', background: 'transparent', color: 'var(--cth-ink-500)' }}>
            <IdeIcon name="code" size={13} />{t('imagePreview.viewSource')}
          </button>
        )}
        <button type="button" onClick={onCopyPath} title={t('idePanel.copyPath')} aria-label={t('idePanel.copyPath')} style={ideIconBtn}>
          <IdeIcon name="copy" size={14} />
        </button>
      </div>

      <div style={{
        flex: 1, minHeight: 0, overflow: 'auto',
        display: 'flex', alignItems: fit ? 'center' : 'flex-start', justifyContent: fit ? 'center' : 'flex-start',
        padding: 16,
        // A checkerboard, not a flat fill: transparent PNGs are everywhere in
        // agent output (icons, cropped screenshots) and on a plain background a
        // transparent region is indistinguishable from a white or black one.
        // Both tones are tokens, so the board inverts with the theme instead of
        // glowing white in dark mode.
        backgroundColor: 'var(--cth-paper-100)',
        backgroundImage: `
          linear-gradient(45deg, var(--cth-cream-200) 25%, transparent 25%),
          linear-gradient(-45deg, var(--cth-cream-200) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, var(--cth-cream-200) 75%),
          linear-gradient(-45deg, transparent 75%, var(--cth-cream-200) 75%)`,
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
      }}>
        {img.status === 'loading' && <Centered>{t('imagePreview.loading')}</Centered>}
        {img.status === 'error' && <Centered tone="error">{img.error}</Centered>}
        {img.status === 'ready' && decodeFailed && (
          <Centered tone="error">
            {t('imagePreview.decodeFailed')}
          </Centered>
        )}
        {img.status === 'ready' && !decodeFailed && (
          <img
            src={img.url}
            alt={rel}
            onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => setDecodeFailed(true)}
            style={fit
              // `maxWidth/maxHeight: 100%` only shrinks — a 32px favicon is not
              // blown up into a blurry poster, it just sits there at 32px.
              ? { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }
              // 1:1 must NOT be allowed to shrink: it is inside a flex row, and
              // flex's default `min-width: auto` would squeeze the image back
              // down to the pane — which is precisely the state the user just
              // clicked away from.
              : { flexShrink: 0 }}
          />
        )}
      </div>
    </div>
  );
}

function Centered({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return (
    <div style={{
      margin: 'auto', padding: 16, textAlign: 'center',
      fontFamily: 'var(--cth-font-ui)', fontSize: 13,
      color: tone === 'error' ? 'var(--cth-coral)' : 'var(--cth-ink-500)'
    }}>{children}</div>
  );
}

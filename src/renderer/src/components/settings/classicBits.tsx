/**
 * The small Classic pieces the Integrations, connection and trigger screens
 * share: the input looks, an on and off switch, a plain tag, a notice, a
 * modal sheet with its close button. Each one is a
 * Pixel component or Classic tokens only: square corners, every border a 1px
 * inset shadow, colour in a badge's dot and never in the text.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from '../PixelButton';
import { PixelPanel } from '../PixelPanel';

/* ---- inputs ------------------------------------------------------------------ */

export const classicInput: CSSProperties = {
  width: '100%',
  padding: '6px 8px 4px',
  background: 'var(--cth-paper-100)',
  border: 'none',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
  fontFamily: 'var(--cth-font-ui)',
  fontSize: 13,
  color: 'var(--cth-ink-900)',
  outline: 'none'
};

export const classicMonoInput: CSSProperties = { ...classicInput, fontFamily: 'var(--cth-font-mono)', fontSize: 12 };

export const classicTextarea: CSSProperties = { ...classicInput, minHeight: 84, resize: 'vertical', lineHeight: '20px' };

/** A preformatted block: a manifest, an auth header, a request shape. */
export const classicCodeBox: CSSProperties = {
  margin: 0, padding: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  background: 'var(--cth-paper-100)',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
  fontFamily: 'var(--cth-font-mono)', fontSize: 11, lineHeight: '16px',
  color: 'var(--cth-ink-700)', overflow: 'auto', maxHeight: 220
};

/** The Classic small caps: a heading or a field label. */
export const classicLabel: CSSProperties = {
  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
  color: 'var(--cth-ink-700)', textTransform: 'uppercase'
};

/* ---- controls ---------------------------------------------------------------- */

/** On and off, as Classic Settings draws it: a small button that says which. */
export function OnOff({ on, onChange, disabled, label }: { on: boolean; onChange: (next: boolean) => void; disabled?: boolean; label?: string }) {
  const { t } = useTranslation();
  return (
    <PixelButton variant={on ? 'primary' : 'secondary'} size="sm" disabled={disabled} title={label} onClick={() => onChange(!on)} dataAttrs={{ 'data-on': on ? 'true' : 'false' }}>
      {on ? t('common.on') : t('common.off')}
    </PixelButton>
  );
}

/** A plain tag: a count, a state word, a place. `accent` is the lemon ring. */
export function Tag({ children, accent, style }: { children: ReactNode; accent?: boolean; style?: CSSProperties }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap',
      padding: '2px 8px 0', background: 'var(--cth-cream-100)',
      boxShadow: `inset 0 0 0 1px ${accent ? 'var(--cth-lemon)' : 'var(--cth-ink-300)'}`,
      fontFamily: 'var(--cth-font-ui)', fontSize: 'var(--cth-text-body-sm)', lineHeight: 'var(--cth-lh-body-sm)',
      color: 'var(--cth-ink-900)', ...style
    }}>{children}</span>
  );
}

/** The tone of a notice or a dot: one of the Classic status colours. */
export type ClassicTone = 'idle' | 'waiting' | 'working' | 'blocked' | 'success' | 'thinking';

/** An 8px square in a status colour, PixelBadge's dot. */
export function ToneDot({ tone }: { tone: ClassicTone }) {
  return <span aria-hidden style={{ width: 8, height: 8, flexShrink: 0, background: tone === 'idle' ? 'var(--cth-ink-300)' : `var(--cth-status-${tone})` }} />;
}

/** A Classic notice: a dot, a bold word, the sentence, and any buttons. */
export function ClassicNotice({ tone, word, children, action }: { tone: ClassicTone; word?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 12px 6px',
      background: 'var(--cth-cream-100)',
      boxShadow: `inset 0 0 0 1px ${tone === 'idle' ? 'var(--cth-ink-300)' : `var(--cth-status-${tone})`}`,
      fontFamily: 'var(--cth-font-ui)', fontSize: 'var(--cth-text-body-sm)', lineHeight: 'var(--cth-lh-body-sm)', color: 'var(--cth-ink-700)'
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
        <ToneDot tone={tone} />
        {word && <b style={{ color: 'var(--cth-ink-900)' }}>{word}</b>}
        {children && <span style={{ minWidth: 0 }}>{children}</span>}
      </span>
      {action && <span style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>{action}</span>}
    </div>
  );
}

/* ---- the modal sheet -------------------------------------------------------- */

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * Esc closes the sheet. When the key lands while a field inside the sheet has
 * focus, Esc leaves the field and keeps the sheet, so a half typed answer is
 * not thrown away; the next Esc closes. The sheet takes the key before
 * anything under it.
 */
export function useEscapeToClose(onClose: () => void, within: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const active = document.activeElement;
      e.preventDefault();
      e.stopPropagation();
      if (isEditable(active) && within.current?.contains(active)) { (active as HTMLElement).blur(); return; }
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, within]);
}

/** The Classic modal: a dark scrim that closes on a click, and a dialog panel. */
export function ClassicSheet({ onClose, width = 560, zIndex = 500, title, children }: { onClose: () => void; width?: number; zIndex?: number; title?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeToClose(onClose, ref);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex, background: 'rgba(26, 19, 32, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div ref={ref} role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()} style={{ width, maxWidth: '92vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <PixelPanel variant="dialog" noPadding style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {children}
        </PixelPanel>
      </div>
    </div>
  );
}

/** Close, as Classic draws it: the ✕ glyph in a ghost button. */
export function CloseButton({ onClick, title }: { onClick: () => void; title: string }) {
  return <PixelButton variant="ghost" size="sm" onClick={onClick} title={title}>✕</PixelButton>;
}

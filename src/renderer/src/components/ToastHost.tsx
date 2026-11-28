/**
 * The one host for `showToast` (toast.ts), drawn like CompletionToast. Mounted
 * once in App's overlay slot, which owns the corner; this column stacks its
 * own toasts. Renders null when there is nothing to say.
 */
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import { dismissToast, readToasts, subscribeToasts, type Toast } from './toast';

const DOT: Record<Toast['tone'], string | undefined> = {
  neutral: undefined,
  ok: 'var(--cth-status-success)',
  bad: 'var(--cth-status-blocked)'
};

export function ToastHost() {
  const list = useSyncExternalStore(subscribeToasts, readToasts, readToasts);
  const { t } = useTranslation();
  if (list.length === 0) return null;
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420, pointerEvents: 'none' }}>
      {list.map((x) => (
        <div
          key={x.id}
          style={{
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 8px 6px 12px',
            background: 'var(--cth-paper-100)',
            boxShadow: 'inset 0 0 0 1px var(--cth-ink-500), var(--cth-shadow-hard)',
            fontFamily: 'var(--cth-font-ui)',
            fontSize: 'var(--cth-text-body-sm)',
            lineHeight: 'var(--cth-lh-body-sm)',
            color: 'var(--cth-ink-900)'
          }}
        >
          {DOT[x.tone] && <span aria-hidden style={{ width: 8, height: 8, flexShrink: 0, background: DOT[x.tone] }} />}
          <span style={x.wrap
            ? { flex: 1, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere' }
            : { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {x.text}
          </span>
          {x.action && (
            <PixelButton variant="ghost" size="sm" onClick={() => { x.action?.run(); dismissToast(x.id); }}>
              {x.action.label}
            </PixelButton>
          )}
          <PixelButton variant="ghost" size="sm" title={t('common.close')} onClick={() => dismissToast(x.id)}>
            ✕
          </PixelButton>
        </div>
      ))}
    </div>
  );
}

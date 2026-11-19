// Ported from Prozzta/guppyos 02d0d50b (MIT).
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';

/**
 * A render error stays in its own place (Pam's P7). React 18 unmounts the whole
 * root on an error no boundary catches, so one broken panel blanked the window
 * while main and the agents went on running. A boundary draws what failed in
 * place of its children and offers a way back: 'remount' draws them again
 * ("Try again"); 'reload' reloads the window ("Reload the window"), for the
 * root, where nothing else is left to show. The error goes to the console.
 */
export interface ErrorBoundaryProps {
  /** What is shown here, already translated, for "{{where}} could not be shown".
   *  Left out on the root. */
  where?: string;
  recover: 'remount' | 'reload';
  children: ReactNode;
}

interface State { error: Error | null }

/** The one-shot flag App.tsx reads at start to skip the project picker (a project switch
 *  leaves it too), for a reload main cannot do: the reload lands back on the open project,
 *  and useHive keeps the agents that are still running instead of starting them again. */
const SKIP_PICKER_ONCE = 'cth.skipHivePickerOnce';

/** Reload through main, so the reloaded page opens on this project and says it was
 *  restored (window.cth.recovering, takeRecoveryNotice); here only when that fails. */
function reloadWindow(): void {
  try { window.cth.reloadAfterError(); return; } catch { /* reload here */ }
  try { window.localStorage.setItem(SKIP_PICKER_ONCE, '1'); } catch { /* the picker shows first */ }
  window.location.reload();
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ErrorBoundary] ${this.props.where ?? 'the app'}:`, error, info?.componentStack);
  }

  private readonly recover = (): void => {
    if (this.props.recover === 'reload') { reloadWindow(); return; }
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const reload = this.props.recover === 'reload';
    const box = <ErrorBox where={this.props.where} reload={reload} error={error} onRecover={this.recover} />;
    // The root fills the window: there is nothing else left on it.
    return reload
      ? <div style={{ position: 'fixed', inset: 0, padding: 24, overflow: 'auto', background: 'var(--cth-cream-100)' }}>{box}</div>
      : box;
  }
}

function ErrorBox({ where, reload, error, onRecover }: { where?: string; reload: boolean; error: Error; onRecover: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" data-error-boundary={where ?? 'app'} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 16,
      fontSize: 13, lineHeight: '19px', color: 'var(--cth-ink-900)', background: 'var(--cth-paper-100)',
    }}>
      <span style={{
        display: 'inline-block', fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px', padding: '0 5px',
        whiteSpace: 'nowrap', color: 'var(--cth-ink-900)', background: 'var(--cth-peach-light)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
      }}>
        {t('error.tag')}
      </span>
      <span>{reload ? t('error.app') : t('error.panel', { where })}</span>
      {/* The error itself stays as the code gives it. */}
      <code dir="ltr" style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', overflowWrap: 'anywhere' }}>
        {error.message || String(error)}
      </code>
      <PixelButton variant={reload ? 'primary' : 'secondary'} size="sm" onClick={onRecover}>
        {reload ? t('error.reload') : t('error.tryAgain')}
      </PixelButton>
    </div>
  );
}

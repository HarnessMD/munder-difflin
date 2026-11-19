// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * One panel's render error no longer takes the whole window down.
 *
 * React unmounts the ENTIRE root on an error no boundary catches, so a loop in
 * one tab blanked the window while main and the agents kept running. A boundary
 * shows what failed in place of its children and offers a way back: 'remount'
 * draws the children again ("Try again"); 'reload' reloads the window ("Reload
 * the window"), for the root, where nothing else is left to show. The error is
 * written to the console; there is no renderer error row in main's log yet.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { pixelAction } from './classicAction';
import type { ActionButton } from './actionButton';
import { reloadWindow } from './crashReload';

export interface ErrorBoundaryProps {
  /** The panel's name as the person reads it (already translated), for "{{where}} could not
   *  be shown". Leave it out on the root. */
  where?: string;
  recover: 'remount' | 'reload';
  /** The recover button; left out, the small pixel button (classicAction.tsx). */
  button?: ActionButton;
  children: ReactNode;
}

interface State { error: Error | null }

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
    const box = <ErrorBox where={this.props.where} reload={this.props.recover === 'reload'} error={error} onRecover={this.recover} button={this.props.button} />;
    // The root fills the window: there is nothing else left on it.
    return this.props.recover === 'reload'
      ? <div style={{ position: 'fixed', inset: 0, background: 'var(--cth-cream-100)', padding: 24, overflow: 'auto' }}>{box}</div>
      : box;
  }
}

function ErrorBox({ where, reload, error, onRecover, button }: { where?: string; reload: boolean; error: Error; onRecover: () => void; button?: ActionButton }) {
  const { t } = useTranslation();
  const label = reload ? t('error.reload') : t('error.tryAgain');
  const tag = { fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px', padding: '0 5px' };
  return (
    <div role="alert" data-error-boundary={where ?? 'app'} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 16,
      fontFamily: 'var(--cth-font-ui)', fontSize: 13, lineHeight: '19px', color: 'var(--cth-ink-900)', background: 'var(--cth-paper-100)',
    }}>
      <span style={{ ...tag, display: 'inline-block', whiteSpace: 'nowrap', color: 'var(--cth-ink-900)', background: 'var(--cth-peach-light)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)' }}>
        {t('error.tag')}
      </span>
      <span>{reload ? t('error.app') : t('error.panel', { where })}</span>
      {/* The error itself stays as the code gives it. */}
      <code dir="ltr" style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', overflowWrap: 'anywhere' }}>
        {error.message || String(error)}
      </code>
      {(button ?? pixelAction)({ label, kind: reload ? 'primary' : 'default', onClick: onRecover })}
    </div>
  );
}

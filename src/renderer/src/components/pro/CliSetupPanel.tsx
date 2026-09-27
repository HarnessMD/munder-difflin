/**
 * The panel above the composer while an agent's CLI is being set up (0.5.3,
 * batch 2, the founder's 24 Sep flow). Main sets the phase:
 *
 *   installing       what is happening and where to watch it; no button.
 *   signin, waiting  the provider's login runs in the Terminal tab. "Setup
 *                    complete, start agent" is shown but DISABLED (founder,
 *                    24 Sep: it "was enabled even when the login was not
 *                    completed"), with the reason under it.
 *   signin, done     the login exited 0, or the CLI's own status command says
 *                    signed in: the text says so and the button is live.
 *   signin, failed   the login ended without finishing: "Sign in again", and
 *                    a quieter "Start anyway" for someone who signs in another
 *                    way.
 *   no login step    a CLI that asks on its first run: nothing to wait for.
 *   manual           (batch 4) "Set up manually" put the provider's command in
 *                    the Terminal tab with the agent's own environment. Start
 *                    is live: the person checks the agent works there first.
 *   ended signed out (cause 'exit') an installed CLI's run ended as a signed
 *                    out one does. Nothing runs until the person presses Sign
 *                    in (the provider's login, in the Terminal tab); the line
 *                    the CLI printed is quoted. Then it is the signin flow.
 *
 * Until the sign in is seen to finish, "Set up manually" is offered too.
 *
 * It sits above the composer so it is visible from the Inbox tab and the
 * Terminal tab alike. Kit Btn and Chip, tokens only, one even border.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setupCanGoManual, setupCanStart, setupCanStartAnyway, type CliSetupState } from '@shared/cliSetup';
import { openManualSetup, retrySetupLogin, startAgentAfterSetup } from '../terminalPool';
import { useStore } from '@/store/store';
import { Btn, Chip } from './ui';

export function CliSetupPanel({ ptyId, setup, onShowTerminal }: { ptyId: string; setup: CliSetupState; onShowTerminal?: () => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An agent whose run ended (cause 'exit') is alive again once Start works:
  // the row's stopped or crashed mark goes, as the right panel's Restart does.
  const start = async (mode?: 'anyway') => {
    const r = await startAgentAfterSetup(ptyId, mode);
    if (r.ok && setup.cause === 'exit') {
      const { agents, updateAgent } = useStore.getState();
      const a = agents.find((x) => x.ptyId === ptyId);
      if (a) updateAgent(a.id, { exit: undefined, archived: false, status: 'idle' });
    }
    return r;
  };
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fn();
      if (!r.ok) setError(r.error ?? 'refused');
    } finally { setBusy(false); }
  };

  const installing = setup.phase === 'installing';
  const manual = setup.phase === 'manual' ? setup.manual ?? null : null;
  const canStart = setupCanStart(setup);
  const failed = setupCanStartAnyway(setup);
  const goManual = setupCanGoManual(setup);
  // Batch 2: the agent's own run ended signed out and nothing has run yet.
  const ended = !installing && !manual && setup.cause === 'exit' && !setup.login && !setup.signedIn;
  const waiting = !installing && !manual && !canStart && !failed && !ended;
  const finished = !installing && !manual && canStart && setup.loginCommand !== null;

  let title: string;
  let body: string;
  if (manual) {
    title = t('terminal.cliSetup.manualTitle', { label: setup.label });
    body = manual.reason === 'install'
      ? t('terminal.cliSetup.manualInstallBody', { command: manual.command })
      : t('terminal.cliSetup.manualSigninBody', { command: manual.command });
  } else if (ended) {
    title = t('terminal.cliSetup.exitTitle', { label: setup.label });
    body = setup.loginCommand
      ? (setup.authLine ? t('terminal.cliSetup.exitBodySaid', { line: setup.authLine, command: setup.loginCommand }) : t('terminal.cliSetup.exitBody', { command: setup.loginCommand }))
      : t('terminal.cliSetup.exitBodyNoLogin', { label: setup.label });
  } else if (installing) {
    title = t('terminal.cliSetup.installingTitle', { label: setup.label });
    body = t('terminal.cliSetup.installingBody');
  } else if (failed) {
    title = t('terminal.cliSetup.signinFailedTitle');
    body = t('terminal.cliSetup.signinFailedBody', { command: setup.loginCommand });
  } else if (finished) {
    title = t('terminal.cliSetup.signinDoneTitle');
    body = t('terminal.cliSetup.signinDoneBody', { label: setup.label });
  } else if (setup.loginCommand) {
    title = t('terminal.cliSetup.signinTitle');
    body = t('terminal.cliSetup.signinBody', { command: setup.loginCommand });
  } else {
    title = t('terminal.cliSetup.signinTitle');
    body = t('terminal.cliSetup.signinBodyFirstRun', { label: setup.label });
  }

  return (
    <div
      role="status"
      data-cli-setup={setup.phase}
      data-cli-setup-login={setup.login ?? 'none'}
      style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 10px', border: '1px solid var(--cth-ink-300)', borderRadius: 10, background: 'var(--cth-cream-100)', minWidth: 0 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--cth-ink-900)' }}>
          {title}
          {/* (e): only claude, codex and cursor can say this, from their own
              status command. */}
          {setup.signedIn && <Chip tone="ok">{t('terminal.cliSetup.signedIn')}</Chip>}
        </span>
        <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--cth-ink-700)' }}>{body}</span>
        {manual && <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--cth-ink-900)' }} data-cli-manual-hint="true">{t('terminal.cliSetup.manualThen')}</span>}
        {ended && setup.loginCommand && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('terminal.cliSetup.signinWaiting')}</span>}
        {waiting && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('terminal.cliSetup.signinWaiting')}</span>}
        {error && <span style={{ fontSize: 12, color: 'var(--cth-ink-700)' }}>{t('terminal.cliSetup.startFailed', { error })}</span>}
      </div>
      {onShowTerminal && (
        <Btn size="sm" kind="ghost" onClick={onShowTerminal}>{t('terminal.cliSetup.showTerminal')}</Btn>
      )}
      {goManual && (
        <Btn size="sm" kind="ghost" disabled={busy} onClick={() => { void run(() => openManualSetup(ptyId)); }} dataAttrs={{ 'data-cli-manual-setup': 'signin' }}>
          {t('terminal.cliSetup.manual')}
        </Btn>
      )}
      {failed && (
        <>
          <Btn size="sm" kind="ghost" disabled={busy} onClick={() => { void run(() => start('anyway')); }} dataAttrs={{ 'data-cli-setup-anyway': 'true' }}>
            {t('terminal.cliSetup.startAnyway')}
          </Btn>
          <Btn size="sm" kind="primary" disabled={busy} onClick={() => { void run(() => retrySetupLogin(ptyId)); }} dataAttrs={{ 'data-cli-setup-retry': 'true' }}>
            {t('terminal.cliSetup.retryLogin')}
          </Btn>
        </>
      )}
      {ended && setup.loginCommand && (
        <Btn size="sm" kind="primary" disabled={busy} onClick={() => { void run(() => retrySetupLogin(ptyId)); }} dataAttrs={{ 'data-cli-setup-signin': 'true' }}>
          {t('terminal.cliSetup.signin')}
        </Btn>
      )}
      {!installing && !failed && (
        <Btn size="sm" kind={ended && setup.loginCommand ? 'default' : 'primary'} disabled={busy || !canStart} title={canStart ? undefined : t('terminal.cliSetup.signinWaiting')} onClick={() => { void run(() => start()); }} dataAttrs={{ 'data-cli-setup-start': canStart ? 'ready' : 'waiting' }}>
          {busy ? t('terminal.cliSetup.starting') : t('terminal.cliSetup.start')}
        </Btn>
      )}
    </div>
  );
}

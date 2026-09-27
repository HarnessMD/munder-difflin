/**
 * The card a terminal shows when its engine CLI is not installed (0.5.3, I2).
 *
 * Calm on purpose: nothing has failed, nothing has run. It names the CLI, says
 * exactly what Install will run and where from, and has one button. On the
 * manual rung (nothing the app can run here) it gives the line to paste and a
 * Check again button. After an install that did not finish, the installer's
 * own last lines are shown under the card and the button reads Try again,
 * with "Set up manually" beside it (batch 4, founder 24 Sep 2026): a terminal
 * with the agent's own environment and the install command in it, for an
 * install the app cannot finish. The manual rung gets the same button.
 * Drawn over the terminal grid, which stays underneath for the installer's
 * output the moment the button is pressed.
 *
 * Built from the kit (founder, 23 Sep 2026: "this should be a cursor that
 * should allow clicking the buttons and this screen should follow our theme"):
 * the kit Btn for Install and the docs, the kit surface for the box, the kit
 * mono block for the command, tokens only, so both skins and both themes come
 * out right without a colour named here. The overlay root says
 * `pointerEvents: 'auto'` and `cursor: 'default'` OUT LOUD: pointer-events
 * inherits, so a host that turns them off above the terminal (an overlay
 * layer, the puck window's pass-through root, the preview harness) would
 * otherwise leave the buttons drawn but dead and the pointer the terminal's.
 */
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CliMissingState } from '@shared/cliMissing';
import { cliMissingAction } from '@shared/cliMissing';
import { installMissingCli, openManualSetup } from './terminalPool';
import { Btn, CodeBox } from './pro/ui';

const overlay: CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16, background: 'var(--cth-paper-100)', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-700)',
  pointerEvents: 'auto', cursor: 'default',
  // F3 (founder, 24 Sep 2026): xterm's layers carry their own z-index (the
  // link-layer canvas 2, the helpers 5, the accessibility tree 10) in the
  // SAME stacking context as this overlay, so at z auto the grid's canvas sat
  // above the card in hit testing: the pointer stayed the terminal's I-beam
  // and Install could not be pressed. 20 clears every xterm layer.
  zIndex: 20
};
const box: CSSProperties = {
  maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 16,
  border: '1px solid var(--cth-ink-300)', borderRadius: 12, background: 'var(--cth-cream-50)'
};

export function CliMissingCard({ ptyId, state }: { ptyId: string; state: CliMissingState }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const action = cliMissingAction(state);
  const custom = state.provider === 'custom';

  const press = async (fn: (id: string) => Promise<{ ok: boolean; error?: string }> = installMissingCli) => {
    if (busy) return;
    setBusy(true); setRefused(null);
    try {
      const r = await fn(ptyId);
      if (!r.ok) setRefused(r.error ?? 'refused');
    } finally { setBusy(false); }
  };

  // What Install will do, one sentence, by rung.
  let what: string;
  if (custom) what = t('terminal.cliMissing.customWhat');
  else if (state.rung === 'npm') what = t('terminal.cliMissing.npmWhat');
  else if (state.rung === 'node-then-npm') what = t('terminal.cliMissing.nodeWhat', { version: state.nodeVersion ?? 'Node.js' });
  else if (state.rung === 'native') what = t('terminal.cliMissing.nativeWhat', { label: state.label });
  else if (state.nodeMissing) what = t('terminal.cliMissing.manualNodeWhat');
  else what = t('terminal.cliMissing.manualWhat', { label: state.label });
  const shown = state.command ?? state.manualCommand;
  const canGoManual = !custom && !!shown && (!!state.failed || state.rung === 'manual');

  return (
    <div style={overlay} data-cli-missing={state.provider} data-cli-missing-rung={state.rung} data-cli-missing-failed={state.failed ? 'true' : undefined}>
      <div style={box} role="status">
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cth-ink-900)' }}>
          {custom ? t('terminal.cliMissing.customTitle', { bin: state.bin }) : t('terminal.cliMissing.title', { label: state.label })}
        </span>
        <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{what}</span>
        {shown && <CodeBox style={{ fontSize: 12 }} dataAttrs={{ 'data-cli-missing-command': 'true' }}>{shown}</CodeBox>}
        {state.failed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12 }}>{t('terminal.cliMissing.failed', { code: state.failed.exitCode })}</span>
            {state.failed.tail && <CodeBox style={{ fontSize: 12, maxHeight: 140 }} dataAttrs={{ 'data-cli-missing-tail': 'true' }}>{state.failed.tail}</CodeBox>}
          </div>
        )}
        {refused && <span style={{ fontSize: 12 }}>{t('terminal.cliMissing.refused', { error: refused })}</span>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn kind="primary" size="sm" disabled={busy} onClick={() => { void press(); }} dataAttrs={{ 'data-cli-missing-action': action }}>
            {busy ? t('terminal.cliMissing.working')
              : action === 'install' ? t('terminal.cliMissing.install')
              : action === 'retry' ? t('terminal.cliMissing.retry')
              : t('terminal.cliMissing.check')}
          </Btn>
          {canGoManual && (
            <Btn kind="ghost" size="sm" disabled={busy} onClick={() => { void press(openManualSetup); }} dataAttrs={{ 'data-cli-manual-setup': 'install' }}>{t('terminal.cliSetup.manual')}</Btn>
          )}
          {state.docsUrl && (
            <Btn kind="ghost" size="sm" onClick={() => { void window.cth.openExternal(state.docsUrl as string); }}>{t('terminal.cliMissing.docs')}</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

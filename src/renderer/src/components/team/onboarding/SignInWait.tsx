/**
 * D2b — the browser is open, and this screen is what the app shows meanwhile.
 *
 * Two ways back in, and both are drawn: the deep link, which is the
 * accelerator and simply works on macOS and Windows, and the paste box, which
 * is the path that always works (Linux AppImages have no protocol handler
 * unless someone installed one). The console shows the grant as a code beside
 * the link for exactly this reason, plan 2.2.
 *
 * The account note is the sentence the plan says the join page must carry:
 * joining makes an account with the team's sign-in provider.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from '../../PixelButton';
import { PixelPanel } from '../../PixelPanel';
import { SteppedDots } from '../primitives';
import { Centred } from './EnterInviteCode';

export interface SignInWaitProps {
  /** Set when the sign-in failed or timed out: the relay's or main's sentence. */
  error?: string | null;
  /** Something is in flight (a paste being checked, the browser being reopened). */
  busy?: boolean;
  /**
   * Which door opened the browser (5 Sep 2026, the free tier). The round trip
   * is identical; the sentences differ, because a join makes a seat and the
   * free door makes an account and nothing else. Defaults to the join.
   */
  intent?: 'join' | 'free';
  onOpenAgain: () => void;
  onPaste: (pasted: string) => void;
  onBack: () => void;
}

export function SignInWait({ error, busy, intent = 'join', onOpenAgain, onPaste, onBack }: SignInWaitProps) {
  const { t } = useTranslation();
  const [pasted, setPasted] = useState('');
  const k = (leaf: string): string =>
    intent === 'free' ? `firstRun.freeSignin.${leaf}` : `firstRun.signin.${leaf}`;

  return (
    <Centred>
      <PixelPanel variant="dialog" noPadding style={{ width: 520, maxWidth: '100%' }}>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>
            {t(k('title'))}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!error && <SteppedDots color="var(--cth-ink-500)" />}
            <span style={{ fontSize: 13, lineHeight: '20px', color: error ? 'var(--cth-status-blocked)' : 'var(--cth-ink-700)' }}>
              {error ?? t(k('body'))}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--cth-ink-500)' }} htmlFor="teams-grant-paste">
              {t('firstRun.signin.pasteLabel')}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="teams-grant-paste"
                value={pasted}
                onChange={e => setPasted(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && pasted.trim()) onPaste(pasted.trim()); }}
                placeholder={t('firstRun.signin.pastePlaceholder')}
                spellCheck={false}
                style={{
                  flex: 1, minWidth: 0, height: 32, padding: '0 10px',
                  borderRadius: 'var(--cth-radius-sm, 6px)',
                  background: 'var(--cth-cream-200)', border: 'none',
                  boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
                  fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-900)',
                  outline: 'none'
                }} />
              <PixelButton variant="secondary" size="md" disabled={!pasted.trim() || busy}
                onClick={() => onPaste(pasted.trim())}>
                {t('firstRun.signin.pasteButton')}
              </PixelButton>
            </div>
          </div>

          <span style={{ fontSize: 12, lineHeight: '18px', color: 'var(--cth-ink-500)' }}>
            {t(k('accountNote'))}
          </span>

          <div style={{ display: 'flex', gap: 8 }}>
            <PixelButton variant="primary" size="md" disabled={busy} onClick={onOpenAgain}>
              {t('firstRun.signin.openAgain')}
            </PixelButton>
            <PixelButton variant="secondary" size="md" disabled={busy} onClick={onBack}>
              {t('firstRun.signin.back')}
            </PixelButton>
          </div>
        </div>
      </PixelPanel>
    </Centred>
  );
}

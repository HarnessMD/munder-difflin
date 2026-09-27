/**
 * D3 — the keypair moment, and the two steps after it.
 *
 * It takes a second or two, and a blank spinner would waste the one moment
 * where saying what is happening actually earns something. The three rows are
 * the three things that happen, in order, and the line underneath is the claim
 * the whole product rests on.
 *
 * THIS SCREEN DOES NOTHING ITSELF. Main runs the enrol (generate, register,
 * verify, write) and pushes which row it is on; a refusal arrives as a value
 * and is rendered on the row it stopped at, with the relay's own sentence
 * where there is one. There is no timer: a row advances because the thing it
 * names happened. The retry goes back to D2, because after a refusal the
 * sign-in grant is spent and the code may be wrong, and both live there.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from '../../PixelButton';
import { PixelPanel } from '../../PixelPanel';
import { SteppedDots, StatusDot } from '../primitives';
import { Centred } from './EnterInviteCode';
import type { EnrolProgress } from '@shared/teams';
import type { EnrolError } from './joinFlow';

/** Declared with the join it belongs to (joinFlow.ts); re-exported so the
 *  screen's importers keep their path. */
export type { EnrolError };

export interface IdentitySetupProps {
  /** Unknown until the relay answers; the copy says "your team" meanwhile. */
  orgName?: string | null;
  /** Which row is running, or `done` when all three have completed. */
  step: EnrolProgress | 'done';
  error: EnrolError | null;
  onRetry: () => void;
  /** Called shortly after `step` becomes `done`, so the third tick is seen. */
  onDone: () => void;
}

const ROWS: EnrolProgress[] = ['keys', 'registering', 'checking'];

export function IdentitySetup({ orgName, step, error, onRetry, onDone }: IdentitySetupProps) {
  const { t } = useTranslation();
  const org = orgName || t('firstRun.identity.yourTeam');
  const active = step === 'done' ? ROWS.length : ROWS.indexOf(step);

  useEffect(() => {
    if (step !== 'done' || error) return;
    const id = setTimeout(onDone, 400);
    return () => clearTimeout(id);
  }, [step, error, onDone]);

  const message = error
    ? (error.reason === 'keyring_unavailable' ? t('firstRun.identity.keyringUnavailable')
      : error.reason === 'keyring_not_encrypting' ? t('firstRun.identity.keyringNotEncrypting')
      : error.detail ?? t(`firstRun.code.error.${error.code}`))
    : null;

  return (
    <Centred>
      <PixelPanel variant="dialog" noPadding style={{ width: 520, maxWidth: '100%' }}>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>
            {t('firstRun.identity.title')}
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ROWS.map((row, i) => {
              const done = i < active;
              const isFail = error !== null && i === active;
              const running = i === active && !error;
              return (
                <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 16, display: 'grid', placeItems: 'center' }}>
                    {done && <StatusDot status="success" />}
                    {running && <SteppedDots color="var(--cth-ink-500)" />}
                    {isFail && <StatusDot status="blocked" />}
                  </span>
                  <span style={{
                    fontSize: 13,
                    color: done || running || isFail ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)'
                  }}>{t(`firstRun.identity.${row}`, { org })}</span>
                </div>
              );
            })}
          </div>

          {message ? (
            <>
              <span style={{ fontSize: 13, color: 'var(--cth-status-blocked)' }}>{message}</span>
              <PixelButton variant="primary" size="md" onClick={onRetry}>
                {t('firstRun.code.retry')}
              </PixelButton>
            </>
          ) : (
            <span style={{ fontSize: 12, lineHeight: '18px', color: 'var(--cth-ink-500)' }}>
              {t('firstRun.identity.privateKeyNote')}
            </span>
          )}
        </div>
      </PixelPanel>
    </Centred>
  );
}

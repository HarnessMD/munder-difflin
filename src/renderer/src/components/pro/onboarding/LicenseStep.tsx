/**
 * THE SOLO PATH: enter the license key you bought.
 *
 * The team path's mirror image, and deliberately not its copy. An invite code
 * is minted by an admin for a seat in an org; a license key is bought by the
 * person holding it for the machine in front of them. So this screen never says
 * invite, code, seat or team, and it opens the person's OWN console rather than
 * their admin's.
 *
 * THE FIELD REFUSES BEFORE THE SERVER DOES. `checkLicense` (@shared/licenseKey)
 * knows the prefix, the length, the alphabet and the checksum, so a typo is
 * caught with the cursor still in the field instead of after a round trip that
 * can only say "not recognised". The one message it goes out of its way to give
 * is "that is a team invite code", because holding the wrong one of the two is
 * the likeliest mistake on this screen and "invalid" would be a cruel way to
 * say it. That one is shown while typing; the rest wait until Activate is
 * pressed, so the field is not scolding a half typed key.
 *
 * THE REDEMPTION IS MAIN'S (SoloProBridge in @shared/soloPro). There is no
 * fallback that pretends: with no bridge the answer is `unavailable` and the
 * screen says what to do about it.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LICENSE_EXAMPLE, checkLicense, type LicenseProblem } from '@shared/licenseKey';
import { soloConsoleUrl, type LicenseRedeemError } from '@shared/soloPro';
import { SteppedDots } from '../../team/primitives';
import { Btn, Field, monoInputStyle } from '../ui';
import { ProIcon } from '../icons';
import { ErrorLine, Note, OnboardFooter, OnboardFrame } from './OnboardFrame';
import { redeemLicense } from './soloLicense';

export interface LicenseStepProps {
  /** Zero based step for the bar; absent draws no bar. */
  step?: number;
  /** The key is redeemed and main holds the record. */
  onDone: () => void;
  /** Back to the two doors. Absent draws no Back. */
  onBack?: () => void;
}

export function LicenseStep({ step, onDone, onBack }: LicenseStepProps) {
  const { t } = useTranslation();
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [failure, setFailure] = useState<{ error: LicenseRedeemError; detail: string | null } | null>(null);
  const [active, setActive] = useState(false);

  const check = checkLicense(raw);
  const ready = check.problem === null;
  // The one problem worth saying before Activate is pressed: a person holding
  // the other kind of key needs to know that now, not after they press.
  const shown: LicenseProblem | null =
    check.problem === 'looks-like-invite' ? 'looks-like-invite'
      : tried && check.problem && check.problem !== 'empty' ? check.problem
        : null;

  /* DELIBERATELY FIRES NO `paywall_shown` (0.5.0 funnel). This step is reached
     FROM the Paywall, which has already fired for this person, and this door is
     for someone who holds or is fetching a key rather than someone being sold
     to. A second event here would double-count the same paywall. */
  const openConsole = () => { void window.cth.openExternal?.(soloConsoleUrl()); };

  const activate = async () => {
    setTried(true);
    if (!check.key || busy) return;
    setBusy(true);
    setFailure(null);
    const res = await redeemLicense(check.key);
    setBusy(false);
    if (res.ok) { setActive(true); return; }
    setFailure({ error: res.error, detail: res.detail });
  };

  if (active) {
    return (
      <OnboardFrame
        step={step}
        title={t('pro.onboarding.license.active.title')}
        lead={t('pro.onboarding.license.active.sub')}
        footer={<OnboardFooter primary={
          <Btn kind="primary" onClick={onDone}>{t('pro.onboarding.continue')}</Btn>
        } />}
      />
    );
  }

  return (
    <OnboardFrame
      step={step}
      title={t('pro.onboarding.license.title')}
      lead={t('pro.onboarding.license.lead')}
      footer={<OnboardFooter
        back={onBack && <Btn kind="ghost" disabled={busy} onClick={onBack}>{t('pro.onboarding.back')}</Btn>}
        primary={
          <Btn kind="primary" disabled={!ready || busy} onClick={() => { void activate(); }}>
            {busy
              ? <><SteppedDots color="currentColor" />{t('pro.onboarding.license.checking')}</>
              : failure ? t('pro.onboarding.license.retry') : t('pro.onboarding.license.activate')}
          </Btn>
        }
      />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label={t('pro.onboarding.license.label')}>
          <input
            aria-label={t('pro.onboarding.license.label')}
            value={raw}
            onChange={(e) => { setRaw(e.target.value.toUpperCase()); setFailure(null); setTried(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void activate(); }}
            placeholder={LICENSE_EXAMPLE}
            spellCheck={false}
            autoFocus
            style={{
              ...monoInputStyle, letterSpacing: '0.08em',
              border: `1px solid ${shown || failure ? 'var(--cth-status-blocked)' : 'var(--cth-ink-300)'}`
            }}
          />
          {shown && <ErrorLine>{t(`pro.onboarding.license.problem.${shown}`)}</ErrorLine>}
          {!shown && failure && (
            <ErrorLine>
              {failure.error === 'refused' && failure.detail
                ? failure.detail
                : t(`pro.onboarding.license.error.${failure.error}`)}
            </ErrorLine>
          )}
        </Field>
        <Note>{t('pro.onboarding.license.whereIsIt')}</Note>
        <div>
          <Btn onClick={openConsole}>
            <ProIcon name="external" size={14} />{t('pro.onboarding.license.openConsole')}
          </Btn>
        </div>
      </div>
    </OnboardFrame>
  );
}

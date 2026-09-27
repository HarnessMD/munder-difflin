/**
 * THE SOLO DOOR IS A SIGN-IN, NOT A KEY (founder ruling, 5 Sep 2026, third
 * pass): freemium means nobody is asked for a licence key up front. Everyone,
 * PRO or free, gives the same thing here, a name and an email through the
 * console's sign-in, and the paid distinction happens AFTER onboarding at the
 * paywall. This step replaces LicenseStep behind EntryStep's individual card;
 * LicenseStep itself lives on at the paywall, which is where a key is a
 * reasonable thing to hold.
 *
 * The machinery is team/onboarding/freeFlow.ts, the exact hook the Classic
 * door uses, so the two skins cannot drift on WHAT a free sign-in does. Only
 * the frame is PRO's.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SteppedDots } from '../../team/primitives';
import { Btn, Field, monoInputStyle } from '../ui';
import { ErrorLine, Note, OnboardFooter, OnboardFrame } from './OnboardFrame';
import { useFreeFlow } from '../../team/onboarding/freeFlow';

export interface FreeSignInStepProps {
  /** Zero based step for the bar; absent draws no bar (the gate's screen). */
  step?: number;
  /** The account exists and free.json is written: the person moves on. */
  onDone: () => void;
  onBack: () => void;
}

export function FreeSignInStep({ step, onDone, onBack }: FreeSignInStepProps) {
  const { t } = useTranslation();
  const [pasted, setPasted] = useState('');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const free = useFreeFlow(() => onDoneRef.current());

  // The person picked this door: the browser opens once, immediately, the
  // same moment the join's sign-in opens. "Open the browser again" re-begins.
  const begun = useRef(false);
  useEffect(() => {
    if (begun.current) return;
    begun.current = true;
    free.begin();
  }, [free]);

  const waiting = free.stage === 'registering' || free.busy;
  // The primary button follows the person's hand (5 Sep 2026: a pasted code
  // had no button, only an invisible Enter): an empty field reopens the
  // browser, a filled one submits the code. One primary, two moments.
  const hasCode = pasted.trim() !== '';

  return (
    <OnboardFrame
      step={step}
      title={t('firstRun.freeSignin.title')}
      lead={t('firstRun.freeSignin.body')}
      footer={<OnboardFooter
        back={<Btn kind="ghost" disabled={waiting} onClick={() => { free.back(); onBack(); }}>{t('pro.onboarding.back')}</Btn>}
        primary={
          <Btn
            kind="primary" disabled={waiting}
            onClick={() => { if (hasCode) free.paste(pasted.trim()); else free.begin(); }}
          >
            {waiting
              ? <><SteppedDots color="currentColor" />{t('firstRun.signin.pasteButton')}</>
              : hasCode ? t('firstRun.signin.pasteButton') : t('firstRun.signin.openAgain')}
          </Btn>
        }
      />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {free.error && <ErrorLine>{free.error}</ErrorLine>}
        <Field label={t('firstRun.signin.pasteLabel')}>
          <input
            aria-label={t('firstRun.signin.pasteLabel')}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && pasted.trim()) free.paste(pasted.trim()); }}
            placeholder={t('firstRun.signin.pastePlaceholder')}
            spellCheck={false}
            style={monoInputStyle}
          />
        </Field>
        <Note>{t('firstRun.freeSignin.accountNote')}</Note>
      </div>
    </OnboardFrame>
  );
}

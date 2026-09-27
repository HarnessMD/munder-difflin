/**
 * Step 1, "Sign in and join your team". The surface is the prototype's; the
 * join underneath is the one FirstRunFlow performs (team/onboarding/joinFlow.ts):
 * the code, the browser round trip for the grant, the three enrol rows main
 * pushes as they start, every refusal rendered where it happened, and after
 * a refusal no key and no membership on this machine.
 *
 * The four stages share one card. The title and the lead change with the
 * stage so the person always reads what is happening now, and the footer
 * carries only the action that stage really has.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useJoinFlow } from '../../team/onboarding/joinFlow';
import type { FirstRunResult } from '../../team/onboarding/FirstRunFlow';
import { useRoster } from '../../team/useRoster';
import { SteppedDots } from '../../team/primitives';
import { Btn, Field, StatusDot, monoInputStyle } from '../ui';
import { ErrorLine, Note, OnboardFooter, OnboardFrame } from './OnboardFrame';
import type { EnrolProgress } from '@shared/teams';
import { LICENSE_PREFIX } from '@shared/licenseKey';

export interface JoinStepProps {
  /** Zero based step for the bar; absent draws no bar. */
  step?: number;
  onDone: (r: FirstRunResult) => void;
  /** Back to the two doors (EntryStep). Absent draws no Back. */
  onBack?: () => void;
  /** The person pasted a license key into the invite field: offer the door
   *  they actually want. Absent, the field only says which key they hold. */
  onLicenseKey?: () => void;
  /**
   * THE ONE WAY OUT OF THE TEAM BLOCK (founder, 6 Sep 2026, item 3).
   *
   * When this screen is the block at the end of onboarding there is no Back:
   * behind it is a finished setup, not another step. The person is held here
   * until a code admits them, and the single alternative is to start again as
   * an individual. That is not a skip and it is not a trial; it is the other
   * product, and it is why this is a separate prop from `onBack`. Absent, the
   * screen behaves as it always did, as step 1 of the join.
   */
  onLeaveTeam?: () => void;
}

const ROWS: EnrolProgress[] = ['keys', 'registering', 'checking'];

/** True the moment what was typed can only be a solo license key. The two
 *  prefixes share their first two letters, so this decides before `bodyOf`
 *  does, and the field says which key the person is holding rather than
 *  quietly eating two characters of it. */
function looksLikeLicense(raw: string): boolean {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').startsWith(LICENSE_PREFIX);
}

/** The eight characters after MD, from whatever was typed or pasted. A whole
 *  code pasted with its prefix loses the prefix; a body that happens to start
 *  with MD is left alone because it is never ten characters long. A license
 *  key is left whole and refused above. */
function bodyOf(raw: string): string {
  let clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.startsWith(LICENSE_PREFIX)) return '';
  if (clean.length >= 10 && clean.startsWith('MD')) clean = clean.slice(2);
  return clean.slice(0, 8);
}

const shown = (body: string) => (body.length > 4 ? `${body.slice(0, 4)}-${body.slice(4)}` : body);

export function JoinStep({ step, onDone, onBack, onLicenseKey, onLeaveTeam }: JoinStepProps) {
  const { t } = useTranslation();
  const join = useJoinFlow('code');
  const [body, setBody] = useState('');
  const [typed, setTyped] = useState('');
  const [pasted, setPasted] = useState('');
  const wrongKey = looksLikeLicense(typed);
  const complete = body.length === 8;
  const code = `MD-${body.slice(0, 4)}-${body.slice(4)}`;
  const linkStyle = {
    background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit',
    fontSize: 12, color: 'var(--cth-ink-500)', textDecoration: 'underline', textUnderlineOffset: 3, textAlign: 'start'
  } as const;

  if (join.stage === 'joined') {
    return <Joined step={step} orgName={join.orgName ?? ''} onDone={onDone} />;
  }

  if (join.stage === 'identity') {
    const active = join.step === 'done' ? ROWS.length : ROWS.indexOf(join.step);
    const org = join.orgName || t('pro.onboarding.join.identity.yourTeam');
    const message = join.error
      ? (join.error.reason === 'keyring_unavailable' ? t('pro.onboarding.join.identity.keyringUnavailable')
        : join.error.reason === 'keyring_not_encrypting' ? t('pro.onboarding.join.identity.keyringNotEncrypting')
        : join.error.detail ?? t(`pro.onboarding.join.error.${join.error.code}`))
      : null;
    return (
      <OnboardFrame step={step} title={t('pro.onboarding.join.title')} lead={t('pro.onboarding.join.identity.lead')}
        footer={message ? <OnboardFooter primary={<Btn kind="primary" onClick={join.retry}>{t('pro.onboarding.join.retry')}</Btn>} /> : undefined}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ROWS.map((row, i) => {
            const done = i < active;
            const failed = join.error !== null && i === active;
            const running = i === active && !join.error;
            return (
              <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 16, display: 'grid', placeItems: 'center' }}>
                  {done && <StatusDot status="success" />}
                  {running && <SteppedDots color="var(--cth-ink-500)" />}
                  {failed && <StatusDot status="blocked" />}
                </span>
                <span style={{ fontSize: 13, color: done || running || failed ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)' }}>
                  {t(`pro.onboarding.join.identity.${row}`, { org })}
                </span>
              </div>
            );
          })}
          {message ? <ErrorLine>{message}</ErrorLine> : <Note>{t('pro.onboarding.join.identity.privateKeyNote')}</Note>}
        </div>
      </OnboardFrame>
    );
  }

  if (join.stage === 'signin') {
    const lead = join.error
      ? <ErrorLine>{join.error.detail ?? t(`pro.onboarding.join.error.${join.error.code}`)}</ErrorLine>
      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><SteppedDots color="var(--cth-ink-500)" />{t('pro.onboarding.join.signin.body')}</span>;
    const usePasted = () => { if (pasted.trim()) join.pasteGrant(pasted.trim()); };
    return (
      <OnboardFrame step={step} title={t('pro.onboarding.join.title')} lead={lead}
        footer={<OnboardFooter
          back={<Btn kind="ghost" disabled={join.busy} onClick={join.backToCode}>{t('pro.onboarding.back')}</Btn>}
          primary={<Btn kind="primary" disabled={join.busy} onClick={join.openAgain}>{t('pro.onboarding.join.signin.openAgain')}</Btn>}
        />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t('pro.onboarding.join.signin.pasteLabel')}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                aria-label={t('pro.onboarding.join.signin.pasteLabel')}
                value={pasted} onChange={(e) => setPasted(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') usePasted(); }}
                placeholder={t('pro.onboarding.join.signin.pastePlaceholder')} spellCheck={false}
                style={{ ...monoInputStyle, flex: 1, width: 'auto' }}
              />
              <Btn disabled={!pasted.trim() || join.busy} onClick={usePasted}>{t('pro.onboarding.join.signin.use')}</Btn>
            </div>
          </Field>
          <Note>{t('pro.onboarding.join.signin.accountNote')}</Note>
        </div>
      </OnboardFrame>
    );
  }

  /* 'code' (and 'choose', which this surface never enters: the sentence
     about the console is the whole of D1 here). */
  const retrying = join.error?.code === 'offline' || join.error?.code === 'signin';
  const submit = () => { if (complete && !join.busy) join.submitCode(code); };
  return (
    <OnboardFrame
      step={step}
      title={t(onLeaveTeam ? 'pro.onboarding.join.blockedTitle' : 'pro.onboarding.join.title')}
      lead={t(onLeaveTeam ? 'pro.onboarding.join.blockedLead' : 'pro.onboarding.join.lead')}
      footer={<OnboardFooter
        back={onBack && <Btn kind="ghost" disabled={join.busy} onClick={onBack}>{t('pro.onboarding.back')}</Btn>}
        primary={
          <Btn kind="primary" disabled={!complete || join.busy} onClick={submit}>
            {join.busy
              ? <><SteppedDots color="currentColor" />{t('pro.onboarding.join.checking')}</>
              : retrying ? t('pro.onboarding.join.retry') : t('pro.onboarding.continue')}
          </Btn>
        } />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label={t('pro.onboarding.join.codeLabel')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 13, color: 'var(--cth-ink-500)' }}>MD</span>
            <input
              aria-label={t('pro.onboarding.join.codeLabel')}
              value={shown(body)} onChange={(e) => { setTyped(e.target.value); setBody(bodyOf(e.target.value)); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder={t('pro.onboarding.join.codePlaceholder')} spellCheck={false} autoFocus
              style={{
                ...monoInputStyle, flex: 1, width: 'auto', letterSpacing: '0.12em',
                border: `1px solid ${join.error || wrongKey ? 'var(--cth-status-blocked)' : 'var(--cth-ink-300)'}`
              }}
            />
          </div>
          {wrongKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ErrorLine>{t('pro.onboarding.join.isLicenseKey')}</ErrorLine>
              {onLicenseKey && <Btn size="sm" onClick={onLicenseKey}>{t('pro.onboarding.join.useLicenseKey')}</Btn>}
            </div>
          )}
          {!wrongKey && join.error && (
            <ErrorLine>
              {(join.error.code === 'refused' || join.error.code === 'signin') && join.error.detail
                ? join.error.detail
                : t(`pro.onboarding.join.error.${join.error.code}`)}
            </ErrorLine>
          )}
        </Field>
        <Note>{t('pro.onboarding.join.noCode')}</Note>
        <button type="button" onClick={join.secondMachine} disabled={join.busy} style={linkStyle}>
          {t('pro.onboarding.join.secondMachine')}
        </button>
        {/* Item 3: the only other door, and it is a real one. Rendered last
            and as a link, because it is the alternative rather than the
            action: the person came here to join a team. */}
        {onLeaveTeam && (
          <button type="button" onClick={onLeaveTeam} disabled={join.busy} style={linkStyle}>
            {t('pro.onboarding.join.leaveTeam')}
          </button>
        )}
      </div>
    </OnboardFrame>
  );
}

/**
 * D4's payoff, on the same card. The level question D4 asked is not asked
 * here: nothing persists the answer (the Classic wizard only echoes it), and
 * the org default the relay reports is what applies. That default rides in
 * the result so the contract App.tsx expects is unchanged. The roster read is
 * the first signed read this machine makes, and it is real; the Continue does
 * not wait on it because the value is not acted on.
 */
function Joined({ step, orgName, onDone }: { step?: number; orgName: string; onDone: (r: FirstRunResult) => void }) {
  const { t } = useTranslation();
  const roster = useRoster();
  return (
    <OnboardFrame step={step} title={t('pro.onboarding.join.joined.title')} lead={t('pro.onboarding.join.joined.sub', { org: orgName })}
      footer={<OnboardFooter primary={
        <Btn kind="primary" onClick={() => onDone({ org: { name: orgName }, level: roster.defaultPermission })}>
          {t('pro.onboarding.continue')}
        </Btn>
      } />}
    />
  );
}

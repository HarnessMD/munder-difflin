/**
 * Step 4: the orchestrator, as a sprite, with its one line. ONLY the
 * orchestrator (founder, 5 Sep 2026: "The agents shown at the time of
 * spawning should be just michael as we only spin up one agent after
 * booting") — the step used to show a second "first hire" card that boot
 * never spawned, a promise the workspace immediately broke. Hiring happens
 * in the workspace, so this screen shows exactly what opening it starts.
 *
 * THE NAME IS ALREADY CHOSEN when this screen is reached (founder, 3 Sep
 * 2026). It is asked and claimed one step earlier, on the orchestrator's own
 * step, where the card renames as it is typed. This screen is the last look
 * before the workspace opens, so it shows the word that was taken and asks
 * for nothing more.
 */
import { useTranslation } from 'react-i18next';
import { SteppedDots } from '../../team/primitives';
import { Btn, CastPortrait, Chip } from '../ui';
import { ErrorLine, OnboardFooter, OnboardFrame } from './OnboardFrame';

export interface TeamStepProps {
  step: number;
  busy: boolean;
  error?: string;
  /** The word the orchestrator step claimed. */
  godName: string;
  onBack: () => void;
  onOpen: () => void;
}

export function TeamStep({ step, busy, error, godName, onBack, onOpen }: TeamStepProps) {
  const { t } = useTranslation();
  const row = { display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--cth-ink-300)', borderRadius: 10 } as const;
  return (
    <OnboardFrame step={step} title={t('pro.onboarding.team.title')} lead={t('pro.onboarding.team.lead', { godName })}
      footer={<OnboardFooter
        back={<Btn kind="ghost" disabled={busy} onClick={onBack}>{t('pro.onboarding.back')}</Btn>}
        primary={<Btn kind="primary" disabled={busy} onClick={onOpen}>
          {busy ? <><SteppedDots color="currentColor" />{t('pro.onboarding.team.opening')}</> : t('pro.onboarding.team.open')}
        </Btn>}
      />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={row}>
          <CastPortrait character="michael" size={40} isGod />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {godName}
              <Chip tone="accent">{t('pro.onboarding.team.orchestrator')}</Chip>
            </div>
            <div style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--cth-ink-500)' }}>{t('pro.onboarding.team.orchestratorLine')}</div>
          </div>
        </div>
        {error && <ErrorLine>{error}</ErrorLine>}
      </div>
    </OnboardFrame>
  );
}

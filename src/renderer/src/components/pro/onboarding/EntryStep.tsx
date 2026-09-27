/**
 * STEP 1, THE DOOR: "How are you using Munder Difflin?"
 *
 * Between 3 and 4 September 2026 there was one door and it was the team join.
 * The founder reopened the other one for PRO, and on 5 Sep (third pass) made
 * it freemium: the solo door is a plain SIGN-IN (name and email through the
 * console), never a licence key. The key moved to the paywall after
 * onboarding, where holding one is a reasonable state to be in.
 *
 * IT IS A QUESTION, NOT A SALES PAGE. Both cards say what the plan is and what
 * you need in your hand to finish it, because the single most likely mistake
 * here is holding the wrong one of the two, and the fields on both paths are
 * built to say which one you are holding.
 *
 * THE SAME SCREEN IS THE GATE'S. An install that finished setting up and has
 * neither a membership nor a license meets this with no step bar (`step`
 * absent), so there is one place where a person picks a way in and one set of
 * copy for it. Neither path completes here in that case: the gate lets the app
 * through the moment main writes the membership or the license.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProEntryPath } from '@shared/soloPro';
import type { FirstRunResult } from '../../team/onboarding/FirstRunFlow';
import { Btn, Card } from '../ui';
import { ProIcon } from '../icons';
import { JoinStep } from './JoinStep';
import { FreeSignInStep } from './FreeSignInStep';
import { Note, OnboardFooter, OnboardFrame } from './OnboardFrame';

export interface EntryStepProps {
  /** Zero based step for the bar; absent draws no bar (the gate's screen). */
  step?: number;
  /** The team path finished. Absent on the gate's screen, which never completes. */
  onJoined: (r: FirstRunResult) => void;
  /** The solo path finished. Since 5 Sep 2026 (third pass) that means the
   *  FREE ACCOUNT is registered, not a key redeemed: freemium asks nobody for
   *  a licence key up front, and the paid distinction happens after
   *  onboarding, at the paywall. */
  onLicensed: () => void;
  /** True from the moment a door is opened until it is closed again. The flow
   *  above uses it to stop its resume rule firing mid path: a record that
   *  appears while somebody is standing on this screen is that person creating
   *  it, and their own screen has something to say about it first. */
  onPathChosen?: (inPath: boolean) => void;
  /** The gate's wall (v050-forced-signup R3, copy ruled 6 Sep 2026): the same
   *  two options under a title and lead written for the person who updated
   *  and has NEVER had an account, with the promise that local work is
   *  untouched said before anything else, and one line naming where a PRO key
   *  or a team invite goes. Fresh onboarding keeps its own copy. */
  wall?: boolean;
  /**
   * FRESH ONBOARDING DEFERS THE JOIN (founder, 6 Sep 2026, item 3). The app
   * decides which kind of user this is AFTER onboarding, not before, so on a
   * fresh install picking the team path records the INTENT and moves on; the
   * invite code is asked for at the end, where it blocks. Without this the
   * team person is stopped at the door and never sees the product they were
   * invited to.
   *
   * The gate's wall keeps the old behaviour, and must: that machine has
   * already onboarded, so there is nothing left to defer the code until.
   */
  deferTeam?: boolean;
  /** The team path was CHOSEN, not completed. Only called when `deferTeam`. */
  onTeamChosen?: () => void;
}

export function EntryStep({ step, onJoined, onLicensed, onPathChosen, wall, deferTeam, onTeamChosen }: EntryStepProps) {
  const { t } = useTranslation();
  const [path, setPath] = useState<ProEntryPath | null>(null);
  const [picked, setPicked] = useState<ProEntryPath | null>(null);
  useEffect(() => { onPathChosen?.(path !== null); }, [path, onPathChosen]);

  if (path === 'team') {
    return (
      <JoinStep
        step={step} onDone={onJoined}
        onBack={() => setPath(null)}
        onLicenseKey={() => { setPicked('solo'); setPath('solo'); }}
      />
    );
  }
  if (path === 'solo') {
    return <FreeSignInStep step={step} onDone={onLicensed} onBack={() => setPath(null)} />;
  }

  return (
    <OnboardFrame
      step={step}
      title={t(wall ? 'pro.onboarding.entry.wallTitle' : 'pro.onboarding.entry.title')}
      lead={t(wall ? 'pro.onboarding.entry.wallLead' : 'pro.onboarding.entry.lead')}
      footer={<OnboardFooter primary={
        <Btn
          kind="primary"
          disabled={!picked}
          onClick={() => {
            // Item 3: on a fresh install the team pick is an intent, not a
            // join. The code is asked for after onboarding, where it blocks.
            if (deferTeam && picked === 'team') { onTeamChosen?.(); return; }
            setPath(picked);
          }}
        >{t('pro.onboarding.continue')}</Btn>
      } />}
    >
      {/* PRO IS THE DEFAULT PATH AND TEAMS IS THE BRANCH OFF IT (founder,
          6 Sep 2026, item 4). It used to be two cards of equal weight with
          TEAM on top, which read as two equal products and made the team
          door the obvious one. Individual now leads at full size; team sits
          under it, compact, still a real choice and plainly the smaller one. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PathCard
          icon="profile" selected={picked === 'solo'} onClick={() => setPicked('solo')}
          title={t('pro.onboarding.entry.soloTitle')}
          desc={t('pro.onboarding.entry.soloDesc')}
          need={t('pro.onboarding.entry.soloNeed')}
        />
        <PathCard
          compact
          icon="team" selected={picked === 'team'} onClick={() => setPicked('team')}
          title={t('pro.onboarding.entry.teamTitle')}
          desc={t('pro.onboarding.entry.teamDesc')}
          need={t('pro.onboarding.entry.teamNeed')}
        />
        {wall && <Note>{t('pro.onboarding.entry.wallSame')}</Note>}
      </div>
    </OnboardFrame>
  );
}

/** One door: what the plan is, and what you need in your hand for it.
 *
 *  `compact` is the branch rather than the default path: smaller box, smaller
 *  type, and the "what you need" line folded onto the description instead of
 *  taking a line of its own. It is deliberately still a Card with the same
 *  hit area behaviour, because a smaller choice must not become a harder one
 *  to click. */
function PathCard({ icon, title, desc, need, selected, onClick, compact }: {
  icon: 'team' | 'profile'; title: string; desc: string; need: string;
  selected: boolean; onClick: () => void; compact?: boolean;
}) {
  return (
    <Card
      selected={selected}
      onClick={onClick}
      ariaLabel={title}
      style={compact
        ? { padding: '9px 12px', gap: 3, borderRadius: 8 }
        : { padding: '14px 16px', gap: 6, borderRadius: 10 }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', gap: compact ? 7 : 8,
        fontSize: compact ? 12 : 13, fontWeight: 600
      }}>
        <ProIcon name={icon} size={compact ? 13 : 15} style={{ color: 'var(--cth-ink-500)' }} />
        {title}
      </span>
      <span style={{
        fontSize: compact ? 11.5 : 12, lineHeight: 1.4,
        color: compact ? 'var(--cth-ink-500)' : 'var(--cth-ink-700)'
      }}>
        {compact ? `${desc} ${need}` : desc}
      </span>
      {!compact && (
        <span style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--cth-ink-500)' }}>{need}</span>
      )}
    </Card>
  );
}

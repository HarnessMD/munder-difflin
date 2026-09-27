/**
 * The first-run path, D1 through D4, sitting in front of the existing wizard.
 *
 * TWO SEGMENTS (3 Sep 2026 ruling, amended twice 5 Sep 2026): FOR INDIVIDUALS
 * and FOR TEAMS. Teams is the join, ending in the wizard carrying the org it
 * joined. Individuals onboard first (App mounts the org-less wizard) and meet
 * the PAYWALL after, where buying redeems a licence key and skipping runs the
 * free sign-in; the free path ends in a WRITTEN RECORD, not a callback: main
 * writes free.json, the gate admits on it, and this flow unmounts because the
 * reason for it is gone (shared/freeTier.ts). App.tsx also mounts this in
 * front of an ALREADY onboarded machine with no paid answer (`onboarded`),
 * where the screen is the paywall directly and `onDone` is never reached.
 *
 * THE SCREENS ARE CLASSIC; THE JOIN IS SHARED. Everything the join does (the
 * bridge, the stages, the one enrol per grant, the five minute wait) lives in
 * joinFlow.ts, because the PRO onboarding (v0.4.9 phase 1) draws the same
 * join on its own card and the two must not drift. This file only maps each
 * stage to the Classic screen that shows it.
 */
import { FirstLaunch } from './FirstLaunch';
import { EnterInviteCode } from './EnterInviteCode';
import { SignInWait } from './SignInWait';
import { IdentitySetup } from './IdentitySetup';
import { JoinedSummary } from './JoinedSummary';
import { useJoinFlow } from './joinFlow';
import { useFreeFlow } from './freeFlow';
import { Paywall } from './Paywall';
import type { NetworkLevel } from '../types';

export interface FirstRunResult {
  org: { name: string };
  level: NetworkLevel;
}

export interface FirstRunFlowProps {
  onDone: (r: FirstRunResult) => void;
  /**
   * The machine already finished onboarding and has no paid answer (the wall
   * mount): the screen owed is the PAYWALL, not the two cards, because the
   * choice left is buy or skip, not who this install is for.
   */
  onboarded?: boolean;
  /** A fresh install chose the individual path: App mounts the org-less
   *  wizard, and this flow's part is over until the paywall after it. */
  onIndividuals?: () => void;
}

export function FirstRunFlow({ onDone, onboarded, onIndividuals }: FirstRunFlowProps) {
  const join = useJoinFlow('choose');
  // The free path (5 Sep 2026, second pass): free is the paywall's SKIP, not
  // a card. Registration writes free.json in main and the gate in App.tsx
  // admits on the record itself, so there is nothing to hand `onDone`: the
  // wall unmounts because the reason for it is gone.
  const free = useFreeFlow();

  if (free.stage !== 'idle') {
    return (
      <SignInWait
        intent="free"
        error={free.error}
        busy={free.busy || free.stage === 'registering'}
        onOpenAgain={free.begin}
        onPaste={free.paste}
        onBack={free.back}
      />
    );
  }

  if (onboarded) {
    return <Paywall onFree={free.begin} />;
  }

  switch (join.stage) {
    case 'choose':
      return (
        <FirstLaunch
          onIndividuals={() => onIndividuals?.()}
          onJoinTeam={() => join.goTo('code')}
        />
      );
    case 'code':
      return (
        <EnterInviteCode
          onContinue={join.submitCode}
          onNoCode={() => join.goTo('choose')}
          onSecondMachine={join.secondMachine}
          error={join.error?.code ?? null}
          errorDetail={join.error?.detail ?? null}
          validating={join.busy}
        />
      );
    case 'signin':
      return (
        <SignInWait
          error={join.error ? (join.error.detail ?? undefined) ?? null : null}
          busy={join.busy}
          onOpenAgain={join.openAgain}
          onPaste={join.pasteGrant}
          onBack={join.backToCode}
        />
      );
    case 'identity':
      return (
        <IdentitySetup
          orgName={join.orgName}
          step={join.step}
          error={join.error}
          onRetry={join.retry}
          onDone={join.finishIdentity}
        />
      );
    case 'joined':
      return (
        <JoinedSummary
          orgName={join.orgName ?? ''}
          onOpen={level => onDone({ org: { name: join.orgName ?? '' }, level })}
        />
      );
  }
}

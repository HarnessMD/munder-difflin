/**
 * PRO ONBOARDING (v0.4.9 phase 1, decision D2). Four steps on one card: the
 * way in, name your workspace, meet your orchestrator, meet your team. Classic
 * keeps its own chain (FirstRunFlow, OnboardingWizard, HivePicker); App.tsx
 * mounts this one under the PRO skin.
 *
 * STEP ONE HAS TWO DOORS SINCE 4 SEP 2026 (founder), and since 5 Sep (third
 * pass) this is THE onboarding for every fresh install on any skin: for
 * individuals, a plain SIGN-IN through the console (name and email, never a
 * licence key: freemium fronts nobody with a key); for teams, the join. The
 * paid distinction happens AFTER onboarding, at the paywall App.tsx shows a
 * signed-in unpaid machine. The other three steps do not care which door was
 * used: a workspace, an orchestrator and a first hire are the same facts
 * either way, and that is the point of putting the fork in one step.
 *
 * THE ORCHESTRATOR STEP IS NEW (founder, 3 Sep 2026). Its engine and model
 * used to be two controls at the bottom of the workspace screen and its name
 * a field on the last one, which read as settings rather than as the one
 * agent that runs the team.
 *
 * WHAT IT WRITES IS WHAT THE WIZARD WRITES. The completion goes through the
 * same two doors (`ensureHarnessHome`, then one `updateConfig`) with the same
 * set of fields, so an install onboarded here is indistinguishable in its
 * config from one onboarded in Classic (test/pro-049-onboarding.test.cjs
 * compares the two calls' keys). A solo install writes the same fields as a
 * team one: the plan is main's record, never a config flag the renderer sets.
 * The steps the wizard had for repositories and the reliability toggles are
 * Settings matters; their config defaults apply, exactly as they do when the
 * wizard's user leaves them alone.
 *
 * RESUMING. Both doors write their record before the config is complete, so an
 * install that quit between the two would otherwise be asked to pay or to join
 * again. When the gate already answers live, or main already holds a live
 * license, step one is skipped and the flow opens on the workspace step.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { providerPreset } from '@shared/agentProvider';
import { classifyEngineAvailability, engineBlocksOnboarding } from '@shared/engineAvailability';
import type { ToolStatus } from '@shared/toolCatalog';
import { licenceIsLive } from '@shared/licenseKey';
import type { ProEntryPath } from '@shared/soloPro';
import { useResolvedGodName } from '@/hooks/useResolvedGodName';
import { isInOrg, useMembership, useTeamsMode } from '../../team/teamsMode';
import { EntryStep } from './EntryStep';
import { FreeSignInStep } from './FreeSignInStep';
import { JoinStep } from './JoinStep';
import { OrchestratorStep } from './OrchestratorStep';
import { TeamStep } from './TeamStep';
import { useSoloLicense } from './soloLicense';
import { setAppSkin } from '@/design/skin';
import { freeAdmits } from '@shared/freeTier';
import { useFreeAccount } from '@/store/freeAccount';
import { WorkspaceStep, draftHome, nameProblem, type WorkspaceDraft } from './WorkspaceStep';

export interface ProOnboardingProps {
  /** The config as `updateConfig` returned it, once the workspace is open. */
  onComplete?: (next: HarnessConfig) => void;
  /** An onboarded install with no way in: the two doors alone, no step bar.
   *  Never completes here; the gate lets the app through the moment main
   *  writes the membership or the license. */
  entryOnly?: boolean;
}

/** Which door was used, and the org's name when there was one. A solo install
 *  has no org, so the workspace step is given an empty name and draws no chip
 *  rather than being handed a word for something that does not exist. */
interface Entry { path: ProEntryPath; orgName: string }

/** The wizard's default home, expanded at the config-write boundary. */
const DEFAULT_DRAFT: WorkspaceDraft = {
  dir: '~', name: 'HarnessAgents', provider: 'claude',
  model: providerPreset('claude').recommendedOrchestratorModel
};

export function ProOnboarding({ onComplete, entryOnly }: ProOnboardingProps) {
  const { t } = useTranslation();
  /** Step 4 is the TEAM BLOCK: onboarding is finished and the config is
   *  written, but a person who chose the team path has no membership yet, so
   *  the app is held here until an invite code lands. See `finish`. */
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [entry, setEntry] = useState<Entry | null>(null);
  /** The config `finish` already wrote, held so the team block can hand it to
   *  `onComplete` once the person is admitted (or once they leave for the
   *  individual path). Writing it twice would be the same write; keeping it is
   *  simply cheaper and keeps `onComplete` honest about what was stored. */
  const [written, setWritten] = useState<HarnessConfig | null>(null);
  /** The one way out of the team block: start again as an individual. */
  const [leftTeam, setLeftTeam] = useState(false);
  const [draft, setDraft] = useState<WorkspaceDraft>(DEFAULT_DRAFT);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  // The word the orchestrator step claimed, so the last screen shows what was
  // taken rather than re-reading a registry that does not exist yet.
  const resolvedGodName = useResolvedGodName();
  const [godName, setGodName] = useState<string | null>(null);

  // Resuming: see the header. Either record is enough, and a membership wins
  // when somehow both exist, because an org is the richer answer (it has a
  // name to put on the workspace step).
  const mode = useTeamsMode();
  const membership = useMembership();
  const { license } = useSoloLicense();
  const { free } = useFreeAccount();
  const enrolled = isInOrg(mode);
  // 5 Sep 2026 (third pass): the solo door writes a FREE ACCOUNT, not a key,
  // so resuming counts either solo record. A licence can also already exist
  // (a paid person reinstalling): both resume onto the workspace step.
  const licensed = (license !== null && licenceIsLive(license)) || freeAdmits(free);
  // Standing on a door right now is not resuming. Without this, the record
  // written by the join or the redemption a second ago would count as one that
  // was already there, and the screen that says it worked would be replaced
  // before it was read.
  const [inPath, setInPath] = useState(false);
  useEffect(() => {
    if (entryOnly || entry || inPath || (!enrolled && !licensed)) return;
    setEntry(enrolled
      ? { path: 'team', orgName: membership?.orgName ?? '' }
      : { path: 'solo', orgName: '' });
    setStep((s) => (s === 0 ? 1 : s));
  }, [entryOnly, entry, inPath, enrolled, licensed, membership?.orgName]);

  // Which engine CLIs are on this machine, so a pick that cannot boot is
  // refused here with the reason, not discovered when nothing starts.
  // `undefined` is "the probe is not back": nothing is blocked on it.
  const [engines, setEngines] = useState<ToolStatus[] | undefined>();
  const [probing, setProbing] = useState(false);
  const probeEngines = useCallback(async () => {
    setProbing(true);
    try { setEngines(await window.cth.toolsStatus()); }
    catch { /* leave undefined: unknown, never blocking */ }
    finally { setProbing(false); }
  }, []);
  useEffect(() => { void probeEngines(); }, [probeEngines]);
  const engineBlocked = engineBlocksOnboarding(classifyEngineAvailability(engines, draft.provider));

  const finish = async () => {
    setBusy(true);
    setError(undefined);
    const harnessHome = draftHome({ ...draft, name: draft.name.trim() });
    const problem = nameProblem(draft.name);
    if (problem) {
      setError(t(problem === 'space' ? 'pro.onboarding.workspace.errSpace' : 'pro.onboarding.workspace.errFolder'));
      setBusy(false); setStep(1); return;
    }
    // A late probe result can change the answer after the person moved on.
    // Never write a godProvider that is known to be unable to boot.
    if (engineBlocked) {
      setError(t('pro.onboarding.workspace.engineMissing', { label: providerPreset(draft.provider).label }));
      setBusy(false); setStep(2); return;
    }
    const ensure = await window.cth.ensureHarnessHome(harnessHome);
    if (!ensure.ok) {
      setError(ensure.error ?? t('pro.onboarding.workspace.errCreate'));
      setBusy(false); setStep(1); return;
    }
    const next = await window.cth.updateConfig({
      onboardingComplete: true,
      audience: draft.readAs ?? 'technical',
      harnessHome,
      registeredRepos: [],
      autoMode: true,
      godProvider: draft.provider,
      godModel: draft.model,
      telemetryEnabled: true,
      // Only a custom engine has a command the app cannot build for itself.
      // Every other provider resolves through buildSpawnCommand, so writing
      // one would be storing a fact the app already knows.
      ...(draft.provider === 'custom' && draft.command?.trim() ? { defaultCommand: draft.command.trim() } : {})
    });
    setBusy(false);
    // ITEM 3 (founder, 6 Sep 2026). A person who chose the team path finishes
    // onboarding like everyone else and is BLOCKED HERE until an invite code
    // admits them. No skip, no trial, no "continue anyway": the only other
    // door is back to the individual path, and that door is real (`leftTeam`).
    // The check is `enrolled`, the live membership, not the path alone, so a
    // person who joined mid flow is never asked for a code they already spent.
    if (entry?.path === 'team' && !enrolled) {
      setWritten(next);
      setStep(4);
      return;
    }
    onComplete?.(next);
  };

  if (entryOnly) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <EntryStep
          wall
          onJoined={() => { /* the gate has already let us through */ }}
          onLicensed={() => { /* the gate has already let us through */ }}
        />
        {/* THE WAY BACK (5 Sep 2026, the free tier; narrowed 6 Sep 2026,
            v050-forced-signup, ruled by god). The link exists for the FREE
            machine that flipped the titlebar switch to PRO: flipping back is
            the whole action, the gate re-admits from the free record. For the
            machine with NO free record the same link is a loop, the skin
            flips and the wall is drawn again in Classic, and a control that
            loops back to the same wall reads as the app being broken. So it
            renders only when the free record would actually admit. */}
        {freeAdmits(free) && (
          <button
            onClick={() => setAppSkin('office')}
            style={{
              position: 'absolute', top: 14, left: 16, zIndex: 2,
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              fontSize: 12, color: 'var(--cth-ink-500)',
              textDecoration: 'underline', textUnderlineOffset: 3
            }}
          >
            {t('pro.onboarding.entry.backToClassic')}
          </button>
        )}
      </div>
    );
  }
  if (step === 0 || !entry) {
    return (
      <EntryStep
        step={0}
        deferTeam
        onPathChosen={setInPath}
        onTeamChosen={() => { setEntry({ path: 'team', orgName: '' }); setStep(1); }}
        onJoined={(r) => { setEntry({ path: 'team', orgName: r.org.name }); setStep(1); }}
        onLicensed={() => { setEntry({ path: 'solo', orgName: '' }); setStep(1); }}
      />
    );
  }
  if (step === 1) {
    return (
      <WorkspaceStep
        step={1} orgName={entry.orgName}
        draft={draft} onChange={(next) => { setDraft(next); setError(undefined); }}
        error={error}
        onContinue={() => { setError(undefined); setStep(2); }}
      />
    );
  }
  if (step === 2) {
    return (
      <OrchestratorStep
        step={2}
        draft={draft} onChange={(next) => { setDraft(next); setError(undefined); }}
        engines={engines} probing={probing} onProbe={() => { void probeEngines(); }}
        godName={godName ?? resolvedGodName} onNamed={setGodName}
        error={error}
        onBack={() => setStep(1)}
        onContinue={() => { setError(undefined); setStep(3); }}
      />
    );
  }
  if (step === 4) {
    // THE TEAM BLOCK. Onboarding is done and written; admission is not.
    // The one way out is the individual path, and it has to actually work,
    // so it runs the same free sign-in the individual door runs and then
    // completes with the config that was already stored.
    const admit = () => onComplete?.(written ?? ({} as HarnessConfig));
    if (leftTeam) {
      return <FreeSignInStep onDone={admit} onBack={() => setLeftTeam(false)} />;
    }
    return (
      <JoinStep
        onDone={admit}
        onLeaveTeam={() => setLeftTeam(true)}
      />
    );
  }

  return (
    <TeamStep
      step={3} busy={busy} error={error} godName={godName ?? resolvedGodName}
      onBack={() => setStep(2)}
      onOpen={() => { void finish(); }}
    />
  );
}

/**
 * Step 3, "Meet your orchestrator" (founder, 3 Sep 2026). It used to be two
 * controls buried on the workspace screen and a name field on the last one.
 * It is its own step now because the orchestrator is not a setting: it is the
 * one agent that reads every message, keeps the board, hands work out and
 * holds the budget. So the step opens by saying that, then asks the three
 * things the app cannot start without.
 *
 *   the name      claimed on the relay through the same door the settings row
 *                 uses (`claimBossName`). It REPLACES Michael: the card above
 *                 the field renames as the person types, so what they are
 *                 about to get is what they can see.
 *   the engine    every provider the app supports, the same list the add
 *                 agent sheet offers, plus the model and, for a custom
 *                 engine, the command. A CLI this machine cannot start is
 *                 refused here with the reason, never discovered later when
 *                 nothing boots. An engine that cannot RECEIVE messages is
 *                 offered with what that costs said plainly, because the
 *                 founder asked for the whole list and hiding three of them
 *                 is not the same as explaining them.
 *   the model     shown to everyone. Depth is a language setting, never a
 *                 feature gate (founder, same order): the non technical
 *                 rendering says the same things in plainer words, it does
 *                 not lose a control.
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AGENT_PROVIDER_PRESETS, modelsForProvider } from '@/store/config';
import { providerPreset, type AgentProvider } from '@shared/agentProvider';
import { classifyEngineAvailability, engineBlocksOnboarding } from '@shared/engineAvailability';
import type { ToolStatus } from '@shared/toolCatalog';
import { ProIcon } from '../icons';
import { Btn, CastPortrait, Chip, Field, SelectBox, monoInputStyle } from '../ui';
import { BossNameField, claimBossName } from '../BossNameField';
import { ErrorLine, Note, OnboardFooter, OnboardFrame } from './OnboardFrame';
import type { WorkspaceDraft } from './WorkspaceStep';

export interface OrchestratorStepProps {
  step: number;
  draft: WorkspaceDraft;
  onChange: (next: WorkspaceDraft) => void;
  engines: ToolStatus[] | undefined;
  probing: boolean;
  onProbe: () => void;
  /** The name it has now, which the field opens on. */
  godName: string;
  /** The word the relay took, so the next step can show it. */
  onNamed: (name: string) => void;
  error?: string;
  onBack: () => void;
  onContinue: () => void;
}

export function OrchestratorStep({ step, draft, onChange, engines, probing, onProbe, godName, onNamed, error, onBack, onContinue }: OrchestratorStepProps) {
  const { t } = useTranslation();
  const [name, setName] = useState<string>(godName);
  const [claimed, setClaimed] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const preset = providerPreset(draft.provider);
  const availability = classifyEngineAvailability(engines, draft.provider);
  const blocked = engineBlocksOnboarding(availability);
  const customEngine = draft.provider === 'custom';
  const commandMissing = customEngine && !(draft.command ?? '').trim();
  const shown = name.trim() || godName;

  const pickProvider = (provider: AgentProvider) => {
    // The model follows the engine, so the select below never offers a model
    // the chosen engine cannot run.
    onChange({ ...draft, provider, model: providerPreset(provider).recommendedOrchestratorModel });
  };

  const go = useCallback(async () => {
    setClaimError(null);
    const wanted = name.trim();
    // Claiming the prefilled word is as much a choice as a typed one: this is
    // the door, and it is the only thing that can stop the step.
    if (claimed !== wanted) {
      setClaiming(true);
      const r = await claimBossName(wanted);
      setClaiming(false);
      if (!r.ok) {
        setClaimError(r.conflict ? `${t('pro.boss.taken')}${r.text ? ` ${r.text}` : ''}` : (r.text ?? t('pro.boss.err.chars')));
        return;
      }
      setClaimed(wanted);
    }
    onNamed(wanted);
    onContinue();
  }, [claimed, name, onContinue, onNamed, t]);

  const availChip = availability.state === 'installed'
    ? <Chip tone="ok" title={availability.path ?? undefined}>{t('pro.onboarding.workspace.avail.installed')}</Chip>
    : availability.state === 'installs-on-first-run'
      ? <Chip tone="muted">{t('pro.onboarding.workspace.avail.installs')}</Chip>
      : availability.state === 'not-installable'
        ? <Chip tone="bad">{t('pro.onboarding.workspace.avail.missing')}</Chip>
        : null;

  const ready = !!name.trim() && !blocked && !commandMissing && !claiming;

  return (
    <OnboardFrame step={step} title={t('pro.onboarding.orchestrator.title')} lead={t('pro.onboarding.orchestrator.lead')}
      footer={<OnboardFooter
        back={<Btn kind="ghost" disabled={claiming} onClick={onBack}>{t('pro.onboarding.back')}</Btn>}
        primary={<Btn kind="primary" disabled={!ready} onClick={() => { void go(); }}>
          {claiming ? t('pro.boss.checking') : t('pro.onboarding.continue')}
        </Btn>}
      />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* The card renames as the field is typed into. The nickname is not an
            alias sitting beside Michael, it is what the orchestrator is called
            from here on, so the rename has to be visible while it happens. */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--cth-ink-300)', borderRadius: 10 }}>
          <CastPortrait character="michael" size={40} isGod />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {shown}
              <Chip tone="accent">{t('pro.onboarding.team.orchestrator')}</Chip>
            </div>
            <div style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--cth-ink-500)' }}>{t('pro.onboarding.team.orchestratorLine')}</div>
          </div>
        </div>

        <ul style={{ margin: 0, paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, lineHeight: 1.45, color: 'var(--cth-ink-700)' }}>
          <li>{t('pro.onboarding.orchestrator.factRoute')}</li>
          <li>{t('pro.onboarding.orchestrator.factBoard')}</li>
          <li>{t('pro.onboarding.orchestrator.factBudget')}</li>
        </ul>

        <BossNameField
          initial={godName} autoFocus hideSave onDraft={setName} onSaved={setClaimed}
          label={t('pro.onboarding.orchestrator.nameLabel')} hint={t('pro.onboarding.orchestrator.nameHint', { current: godName })}
        />

        <Field label={t('pro.onboarding.workspace.engine', { godName: shown })} hint={blocked ? undefined : t('pro.onboarding.workspace.engineHint', { godName: shown })}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <SelectBox<AgentProvider>
              ariaLabel={t('pro.onboarding.workspace.engine', { godName: shown })}
              value={draft.provider}
              options={AGENT_PROVIDER_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
              onChange={pickProvider}
              style={{ flex: 1, width: 'auto' }}
            />
            {availChip}
          </div>
          {!preset.canReceiveInbox && (
            <Note>{t('pro.onboarding.orchestrator.noInbox', { label: preset.label })}</Note>
          )}
          {blocked && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ErrorLine>{t('pro.onboarding.workspace.engineMissing', { label: preset.label })}</ErrorLine>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Btn size="sm" disabled={probing} onClick={onProbe}>{t('pro.onboarding.workspace.checkAgain')}</Btn>
                {availability.docsUrl && (
                  <Btn size="sm" kind="ghost" onClick={() => { void window.cth.openExternal(availability.docsUrl!); }}>
                    <ProIcon name="external" size={14} />{t('pro.onboarding.workspace.installDocs')}
                  </Btn>
                )}
              </div>
            </div>
          )}
        </Field>

        {preset.supportsModel && (
          <Field label={t('pro.onboarding.workspace.model')}>
            <SelectBox<string>
              ariaLabel={t('pro.onboarding.workspace.model')}
              value={draft.model ?? ''}
              options={modelsForProvider(draft.provider).map((m) => ({ value: m.id ?? '', label: m.label }))}
              onChange={(v) => onChange({ ...draft, model: v || undefined })}
            />
          </Field>
        )}

        {customEngine && (
          <Field label={t('pro.onboarding.orchestrator.command')} hint={t('pro.onboarding.orchestrator.commandHint')}>
            <input
              aria-label={t('pro.onboarding.orchestrator.command')}
              value={draft.command ?? ''} onChange={(e) => onChange({ ...draft, command: e.target.value })}
              placeholder="your-agent-cli" spellCheck={false} style={monoInputStyle}
            />
          </Field>
        )}

        {(claimError || error) && <ErrorLine>{claimError ?? error}</ErrorLine>}
      </div>
    </OnboardFrame>
  );
}

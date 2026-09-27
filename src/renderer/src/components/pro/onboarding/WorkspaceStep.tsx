/**
 * Step 2, "Name your workspace": the folder everything lives in, and who is
 * going to be reading these screens.
 *
 *   the audience (`config.audience`), which is D1's switch for every PRO
 *   screen, asked as "Are you technical or non-technical?" (founder, 3 Sep
 *   2026: ask about the person, not about the screen).
 *
 * THE ORCHESTRATOR IS NOT HERE ANY MORE (same order). Its engine, model,
 * command and name are their own step, which opens by saying what the
 * orchestrator is and why it is worth a minute. See `OrchestratorStep.tsx`.
 *
 * NAME AND FOLDER ARE ONE FACT. The config has no field for a workspace name;
 * the app names a workspace by its folder's last segment (the launch picker
 * always has). So the name edits the folder's last segment and Browse sets
 * both, and Settings shows the same two things later. A folder segment may
 * not carry a separator, and it may not carry a space either: that is
 * REFUSED in validation with the fix offered, not silently rewritten under
 * the person's fingers.
 */
import { useTranslation } from 'react-i18next';
import type { AgentProvider } from '@shared/agentProvider';
import { ProIcon } from '../icons';
import { Btn, Card, Chip, Field, inputStyle, monoInputStyle } from '../ui';
import { setAudience } from '../depth';
import { ErrorLine, Note, OnboardFooter, OnboardFrame } from './OnboardFrame';

export type AudienceChoice = 'technical' | 'non-technical';

export interface WorkspaceDraft {
  /** The folder above the workspace. `~` on a fresh install. */
  dir: string;
  /** The workspace's name, which is its folder's last segment. */
  name: string;
  /** The answer to "Are you technical or non-technical?", written as `config.audience`. */
  readAs?: AudienceChoice;
  provider: AgentProvider;
  model?: string;
  /** Only when the engine is `custom`: the command that starts it. */
  command?: string;
}

export function draftHome(d: WorkspaceDraft): string {
  return d.dir ? `${d.dir}/${d.name}` : d.name;
}

export function splitPath(p: string): { dir: string; name: string } {
  const trimmed = p.replace(/\/+$/, '');
  const at = trimmed.lastIndexOf('/');
  if (at < 0) return { dir: '', name: trimmed };
  return { dir: trimmed.slice(0, at) || '/', name: trimmed.slice(at + 1) };
}

/** A name is a folder segment: no separators. */
const cleanName = (raw: string) => raw.replace(/[/\\]/g, '');

/** A space is refused, not stripped, so the person sees the rule. This is
 *  what the refusal offers as the fix. */
export function despace(raw: string): string {
  return raw.trim().replace(/\s+/g, '-');
}

export function nameProblem(raw: string): 'empty' | 'space' | null {
  if (!raw.trim()) return 'empty';
  if (/\s/.test(raw)) return 'space';
  return null;
}

export interface WorkspaceStepProps {
  step: number;
  orgName: string;
  draft: WorkspaceDraft;
  onChange: (next: WorkspaceDraft) => void;
  error?: string;
  onContinue: () => void;
}

export function WorkspaceStep({ step, orgName, draft, onChange, error, onContinue }: WorkspaceStepProps) {
  const { t } = useTranslation();
  const problem = nameProblem(draft.name);
  const ready = !problem && !!draft.readAs;
  const suggestion = despace(draft.name);

  const browse = async () => {
    const res = await window.cth.chooseFolder();
    if (res.ok) onChange({ ...draft, ...splitPath(res.path) });
  };
  const pickAudience = (audience: AudienceChoice) => {
    onChange({ ...draft, readAs: audience });
    // D1: the rendering follows the answer from here on, not from the next launch.
    setAudience(audience);
  };

  return (
    <OnboardFrame step={step} title={t('pro.onboarding.workspace.title')} lead={t('pro.onboarding.workspace.lead')}
      footer={<OnboardFooter primary={<Btn kind="primary" disabled={!ready} onClick={onContinue}>{t('pro.onboarding.continue')}</Btn>} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {orgName && <Chip tone="accent" style={{ alignSelf: 'flex-start' }}>{t('pro.onboarding.workspace.forOrg', { org: orgName })}</Chip>}

        <Field label={t('pro.onboarding.workspace.name')}>
          <input
            aria-label={t('pro.onboarding.workspace.name')}
            value={draft.name} onChange={(e) => onChange({ ...draft, name: cleanName(e.target.value) })}
            style={{ ...inputStyle, border: `1px solid ${problem === 'space' ? 'var(--cth-status-blocked)' : 'var(--cth-ink-300)'}` }}
            spellCheck={false}
          />
          {problem === 'space' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ErrorLine>{t('pro.onboarding.workspace.errSpace')}</ErrorLine>
              <Btn size="sm" onClick={() => onChange({ ...draft, name: suggestion })}>{t('pro.onboarding.workspace.useSuggestion', { suggestion })}</Btn>
            </div>
          )}
        </Field>

        <Field label={t('pro.onboarding.workspace.folder')} hint={t('pro.onboarding.workspace.hint')}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input aria-label={t('pro.onboarding.workspace.folder')} value={draftHome(draft)} readOnly style={{ ...monoInputStyle, flex: 1, width: 'auto', color: 'var(--cth-ink-700)' }} />
            <Btn onClick={() => { void browse(); }}><ProIcon name="folder" size={14} />{t('pro.onboarding.workspace.browse')}</Btn>
          </div>
        </Field>

        <Field label={t('pro.onboarding.workspace.readAs')} hint={t('pro.onboarding.workspace.readAsHint')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              ['non-technical', t('pro.onboarding.workspace.plain'), t('pro.onboarding.workspace.plainDesc')],
              ['technical', t('pro.onboarding.workspace.technical'), t('pro.onboarding.workspace.technicalDesc')]
            ] as const).map(([value, label, desc]) => (
              <Card key={value} selected={draft.readAs === value} onClick={() => pickAudience(value)} ariaLabel={label} style={{ padding: '12px 14px', gap: 4, borderRadius: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--cth-ink-500)' }}>{desc}</span>
              </Card>
            ))}
          </div>
        </Field>

        {error && <ErrorLine>{error}</ErrorLine>}
        {!error && <Note>{t('pro.onboarding.workspace.later')}</Note>}
      </div>
    </OnboardFrame>
  );
}

/**
 * THE ONE FIELD THAT NAMES THIS MACHINE'S ORCHESTRATOR (founder order, 3 Sep
 * 2026: every PRO chooses a unique nickname for their boss, and that is how
 * teammates and their agents refer to it).
 *
 * Three surfaces mount this and no other: onboarding's "Meet your team", PRO
 * Settings, and the Team screen's own row when a seat still owes the org a
 * name. One field means one set of rules and one door, so the word shown in a
 * teammate's roster can never disagree with the word this machine signs with.
 *
 * The check in front of the person is advisory: it compares against the roster
 * this machine has already read, so it can say "taken" before a round trip.
 * The DECISION is the relay's, through `teamsSetBossName`, because uniqueness
 * belongs to the organisation and two machines can type the same word at the
 * same moment. A `conflict` from the relay always wins over a local pass.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { bossNameHolder, validateBossName, type BossNameProblem } from '@shared/bossName';
import { useResolvedGodName } from '@/hooks/useResolvedGodName';
import { useRoster } from '../team/useRoster';
import { Btn, Field, inputStyle } from './ui';

export interface BossNameFieldProps {
  /** What the orchestrator is called now; the field opens on it. */
  initial: string;
  /** Called with the saved word once the relay (or a solo machine) took it. */
  onSaved?: (name: string) => void;
  /** Onboarding wants the caret here; the settings row does not. */
  autoFocus?: boolean;
  /** Onboarding drives its own primary button, so it hides this one and
   *  calls `save` through the ref-free contract below instead. */
  hideSave?: boolean;
  /** Every keystroke, and once on mount. The ref-free half of `hideSave`: the
   *  parent owning the button also has to own the word it is about to claim. */
  onDraft?: (value: string) => void;
  label?: string;
  hint?: string;
}

type Outcome =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'saved' }
  | { kind: 'note'; text: string }
  | { kind: 'error'; text: string };

/**
 * Claim a name. Exported so onboarding can drive it from its own Open button
 * and get the same answers, rather than reimplementing the door.
 */
export async function claimBossName(name: string): Promise<
  { ok: true; note: 'saved' | 'offline' | 'unsupported' } | { ok: false; text: string | null; conflict: boolean }
> {
  const r = await window.cth.teamsSetBossName(name);
  if (r.ok) return { ok: true, note: r.offline ? 'offline' : r.unsupported ? 'unsupported' : 'saved' };
  return { ok: false, text: r.detail, conflict: r.error === 'conflict' };
}

/**
 * The same field as a Settings row, reading the orchestrator's current name
 * for itself. PRO Settings mounts this; Classic never does, because renaming
 * the orchestrator there is the agent's own Edit dialog and always has been.
 */
export function BossNameSection() {
  const { t } = useTranslation();
  const godName = useResolvedGodName();
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>
        {t('pro.boss.yours')}
      </div>
      <BossNameField key={saved ?? godName} initial={saved ?? godName} onSaved={setSaved} />
    </div>
  );
}

export function BossNameField({ initial, onSaved, autoFocus, hideSave, onDraft, label, hint }: BossNameFieldProps) {
  const { t } = useTranslation();
  const roster = useRoster();
  const [value, setValue] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });

  // A new initial (the orchestrator was renamed elsewhere) refills a field the
  // person has not started editing.
  useEffect(() => { setValue(initial); }, [initial]);
  // The parent that hid the Save button needs the word, including the prefilled
  // one it would otherwise never hear about.
  useEffect(() => { onDraft?.(value); }, [value, onDraft]);

  const parsed = useMemo(() => validateBossName(value), [value]);
  // Advisory only: see the header. Rows with no nickname never match.
  const holder = useMemo(
    () => (parsed.ok ? bossNameHolder(parsed.name, roster.teammates) : null),
    [parsed, roster.teammates]
  );

  const problem: BossNameProblem | null = parsed.ok ? null : parsed.problem;
  const localError = value.trim() === '' && !autoFocus ? null
    : problem ? t(`pro.boss.err.${problem}`)
    : holder ? `${t('pro.boss.taken')} ${t('team.bossOf', { name: holder.name })}`
    : null;

  const unchanged = parsed.ok && parsed.name === initial.trim();
  const blocked = !parsed.ok || !!holder || outcome.kind === 'busy';

  const save = async () => {
    if (!parsed.ok || holder) return;
    setOutcome({ kind: 'busy' });
    const r = await claimBossName(parsed.name);
    if (r.ok) {
      setOutcome(r.note === 'saved' ? { kind: 'saved' } : { kind: 'note', text: t(`pro.boss.${r.note}`) });
      onSaved?.(parsed.name);
      return;
    }
    setOutcome({ kind: 'error', text: r.conflict ? `${t('pro.boss.taken')}${r.text ? ` ${r.text}` : ''}` : (r.text ?? t('pro.boss.err.chars')) });
  };

  const message = localError
    ? { text: localError, bad: true }
    : outcome.kind === 'error' ? { text: outcome.text, bad: true }
    : outcome.kind === 'saved' ? { text: t('pro.boss.saved'), bad: false }
    : outcome.kind === 'note' ? { text: outcome.text, bad: false }
    : null;

  return (
    <Field label={label ?? t('pro.boss.label')} hint={hint ?? t('pro.boss.hint')}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          aria-label={label ?? t('pro.boss.label')}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => { setValue(e.target.value); setOutcome({ kind: 'idle' }); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !blocked && !unchanged) { e.preventDefault(); void save(); } }}
          placeholder={t('pro.boss.placeholder')}
          spellCheck={false}
          style={{
            ...inputStyle, flex: 1, width: 'auto',
            border: `1px solid ${message?.bad ? 'var(--cth-status-blocked)' : 'var(--cth-ink-300)'}`,
          }}
        />
        {!hideSave && (
          <Btn kind="primary" disabled={blocked || unchanged} onClick={() => { void save(); }}>
            {outcome.kind === 'busy' ? t('pro.boss.checking') : t('pro.boss.save')}
          </Btn>
        )}
      </div>
      {message && (
        <span style={{ fontSize: 11.5, lineHeight: 1.4, color: message.bad ? 'var(--cth-status-blocked)' : 'var(--cth-ink-500)' }}>
          {message.text}
        </span>
      )}
    </Field>
  );
}

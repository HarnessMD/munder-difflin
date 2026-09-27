/**
 * THE PERSON'S OWN NAME (0.5.2). The relay holds a display name per seat and
 * until now nothing on the machine could set it: it was whatever the console
 * held at enrol, often nothing, and every teammate's roster and thread then
 * fell back to this MACHINE's name. This is the field that sets it.
 *
 * It is the sibling of `BossNameField`, and deliberately simpler. A person's
 * name is not unique in an organisation (two Michaels are two people), so
 * there is no roster check and no `conflict`; the only rule is length, one
 * to eighty characters after trimming, which is the relay's own rule. And
 * there is no local half: the nickname renames an agent on this machine
 * whether or not the relay heard, but a person's name lives on the relay and
 * nowhere else, so a refusal or an outage saves nothing and the message says
 * so instead of claiming a save that did not happen.
 *
 * Two surfaces mount it: PRO Settings, above the nickname, and the Team
 * screen's own row when the relay has no name for this seat.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoster } from '../team/useRoster';
import { Btn, Field, inputStyle } from './ui';

const MAX_LENGTH = 80;

export interface NameFieldProps {
  /** The name the relay holds now, or '' when it holds none. */
  initial: string;
  /** Called once the relay took the word (null when it was cleared). */
  onSaved?: (name: string | null) => void;
  label?: string;
  hint?: string;
}

type Outcome =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'note'; text: string }
  | { kind: 'error'; text: string };

/**
 * The field as a Settings row, reading the current name from the roster's
 * self row. `unnamed` means the relay holds nothing and the row's `name` is
 * the machine's; the field opens empty then rather than on the machine.
 */
export function NameSection() {
  const roster = useRoster();
  const [saved, setSaved] = useState<string | null | undefined>(undefined);
  const current = roster.self && !roster.self.unnamed ? roster.self.name : '';
  const initial = saved === undefined ? current : (saved ?? '');
  return <NameField key={initial} initial={initial} onSaved={setSaved} />;
}

export function NameField({ initial, onSaved, label, hint }: NameFieldProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });

  // A new initial (the name changed elsewhere) refills a field the person
  // has not started editing.
  useEffect(() => { setValue(initial); }, [initial]);

  const trimmed = useMemo(() => value.trim(), [value]);
  const tooLong = trimmed.length > MAX_LENGTH;
  const unchanged = trimmed === initial.trim();
  const blocked = tooLong || outcome.kind === 'busy';

  const save = async () => {
    if (blocked || unchanged) return;
    setOutcome({ kind: 'busy' });
    const next = trimmed === '' ? null : trimmed;
    const r = await window.cth.teamsSetName(next);
    if (r.ok) {
      setOutcome({ kind: 'note', text: t(r.name === null ? 'pro.name.cleared' : 'pro.name.saved') });
      onSaved?.(r.name);
      return;
    }
    // Nothing was saved in any of these; the sentence says what stood in
    // the way rather than pretending the word went through.
    if (r.error === 'invalid') setOutcome({ kind: 'error', text: t('pro.name.err.length') });
    else if (r.error === 'unsupported') setOutcome({ kind: 'error', text: t('pro.name.unsupported') });
    else setOutcome({ kind: 'error', text: t('pro.name.offline') });
  };

  const message = tooLong
    ? { text: t('pro.name.err.length'), bad: true }
    : outcome.kind === 'error' ? { text: outcome.text, bad: true }
    : outcome.kind === 'note' ? { text: outcome.text, bad: false }
    : null;

  return (
    <Field label={label ?? t('pro.name.label')} hint={hint ?? t('pro.name.hint')}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          aria-label={label ?? t('pro.name.label')}
          value={value}
          onChange={(e) => { setValue(e.target.value); setOutcome({ kind: 'idle' }); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !blocked && !unchanged) { e.preventDefault(); void save(); } }}
          placeholder={t('pro.name.placeholder')}
          spellCheck={false}
          maxLength={MAX_LENGTH * 2}
          style={{
            ...inputStyle, flex: 1, width: 'auto',
            border: `1px solid ${message?.bad ? 'var(--cth-status-blocked)' : 'var(--cth-ink-300)'}`,
          }}
        />
        <Btn kind="primary" disabled={blocked || unchanged} onClick={() => { void save(); }}>
          {t('pro.name.save')}
        </Btn>
      </div>
      {message && (
        <span style={{ fontSize: 11.5, lineHeight: 1.4, color: message.bad ? 'var(--cth-status-blocked)' : 'var(--cth-ink-500)' }}>
          {message.text}
        </span>
      )}
    </Field>
  );
}

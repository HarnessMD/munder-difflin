/**
 * THE ONE VOCABULARY FOR WHO MAY SEND WHAT, drawn once (0.4.11).
 *
 * The founder: the guardrails were right but they were said four different
 * ways on four surfaces, and every surface said all of them. This file is the
 * collapse. It exports the two pieces every surface shares:
 *
 *   PresetPicker   the four plain words as one segmented control, with ONE
 *                  sentence under it saying what the chosen word means. A
 *                  combination the four words do not cover shows as a fifth
 *                  segment, Custom, which appears only while it is true.
 *   LaneSwitches   the three raw switches behind the words. They live under
 *                  an Advanced disclosure wherever they are drawn, because
 *                  they are the control most people never need.
 *
 * There are exactly TWO surfaces in PRO and this component is neither: your
 * status is edited in the Team right sidebar (`StatusControl`) and a
 * teammate's own setting on their card (`TeammateDetail`). The default this
 * component used to put beside the status is edited here only for the CLASSIC
 * team window (TriggersTab), which has no right sidebar; under PRO nothing
 * mounts it, so there is no third surface.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  POLICY_PRESETS, TEAM_AXES, isSilent, policyOf, presetOf,
  type PolicyPreset, type TeamAxis, type TeamPolicy,
} from '@shared/teamPolicy';
import { Seg, Switch } from '../pro/ui';
import { ProIcon } from '../pro/icons';
import { PolicyChip } from './primitives';
import { useRoster } from './useRoster';

/** The word a policy answers to: one of the four, or Custom. */
export type PresetWord = PolicyPreset | 'custom';

export function presetWord(policy: TeamPolicy): PresetWord {
  return presetOf(policy) ?? 'custom';
}

/**
 * `commands` implies `receive`, and turning `receive` off has to take
 * `commands` with it or the stored value contradicts itself. The same repair
 * `normalizePolicy` makes, made here so a switch never shows the
 * contradiction even for a moment.
 */
export function withAxis(policy: TeamPolicy, axis: TeamAxis, on: boolean): TeamPolicy {
  const next = { ...policy, [axis]: on };
  if (axis === 'commands' && on) next.receive = true;
  if (axis === 'receive' && !on) next.commands = false;
  return next;
}

/** Off, Listen, Converse, Open, and one sentence. The whole mental model. */
export function PresetPicker(
  { policy, onPick, ariaLabel }:
  { policy: TeamPolicy; onPick: (preset: PolicyPreset) => void; ariaLabel: string }
) {
  const { t } = useTranslation();
  const word = presetWord(policy);
  const options: { value: PresetWord; label: string }[] = [
    ...POLICY_PRESETS.map((p) => ({ value: p as PresetWord, label: t(`team.pick.${p}.word`) })),
    ...(word === 'custom' ? [{ value: 'custom' as PresetWord, label: t('team.pick.custom.word') }] : [])
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <Seg<PresetWord>
        value={word}
        options={options}
        onChange={(v) => { if (v !== 'custom') onPick(v); }}
        ariaLabel={ariaLabel}
      />
      <p style={{ margin: 0, fontSize: 12, lineHeight: '17px', color: 'var(--cth-ink-500)' }}>
        {t(`team.pick.${word}.line`)}
      </p>
    </div>
  );
}

/** The three raw switches. Everything the four words can say and the one
 *  thing they cannot: a mix of your own. */
export function LaneSwitches(
  { policy, onChange }: { policy: TeamPolicy; onChange: (next: TeamPolicy) => void }
) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {TEAM_AXES.map((axis) => (
        <div key={axis} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ marginTop: 1, flex: 'none', display: 'inline-flex' }}>
            <Switch
              on={policy[axis]}
              onChange={(on) => onChange(withAxis(policy, axis, on))}
              label={t(`team.axis.${axis}.label`)}
            />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cth-ink-900)' }}>
              {t(`team.axis.${axis}.label`)}
            </span>
            <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
              {t(`team.axis.${axis}.blurb`)}
            </span>
          </span>
        </div>
      ))}
      {isSilent(policy) && (
        <p style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
          {t('team.policy.silent')}
        </p>
      )}
    </div>
  );
}

/** A folded row: the schedule and the switches live behind one of these so
 *  the everyday surface is the four words and nothing else. 1px all round. */
export function Disclosure(
  { label, defaultOpen, summary, children }:
  { label: string; defaultOpen?: boolean; summary?: ReactNode; children: ReactNode }
) {
  const [open, setOpen] = useState(defaultOpen === true);
  return (
    <div style={{
      border: '1px solid var(--cth-ink-300)',
      borderRadius: 'var(--cth-radius-lg, 10px)',
      background: 'var(--cth-cream-50)'
    }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          border: 'none', background: 'transparent', cursor: 'pointer',
          font: 'inherit', padding: '8px 10px', textAlign: 'start',
          color: 'var(--cth-ink-900)', fontSize: 12.5, fontWeight: 500
        }}>
        <ProIcon name={open ? 'chevronDown' : 'chevronRight'} size={12} style={{ color: 'var(--cth-ink-500)' }} />
        <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
        {summary}
      </button>
      {open && (
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * THE CLASSIC SURFACE. What this machine allows a teammate who has no setting
 * of their own, edited from the Classic team window's Triggers tab, which has
 * no PRO sidebar. Same store as ever (`teamsSetPolicyDefault`), same words as
 * the two PRO surfaces, and the people who differ stay listed so the reset
 * stays reachable from Classic.
 */
export function NetworkPermissions() {
  const { t } = useTranslation();
  /* The same roster as D7, so the two screens cannot disagree about who is on
     the team or what they are set to, and the same policy store the message
     path reads. Neither has ever been on the wire. */
  const roster = useRoster();
  const overrides = roster.teammates.filter((m) => roster.hasOverride(m.id));
  const setDefault = (policy: TeamPolicy | null) => {
    void window.cth?.teamsSetPolicyDefault?.(policy).then(() => roster.reload());
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{
          fontFamily: 'var(--cth-font-mono)', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cth-ink-500)'
        }}>{t('team.network.title')}</span>
        <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)' }}>
          {t('team.network.blurb')}
        </p>
      </div>

      <PresetPicker
        policy={roster.policyDefault}
        onPick={(preset) => setDefault(policyOf(preset))}
        ariaLabel={t('team.network.title')}
      />

      <Disclosure label={t('pro.status.advanced')}>
        <LaneSwitches policy={roster.policyDefault} onChange={setDefault} />
      </Disclosure>

      {roster.policyDefaultSet && (
        <button type="button" onClick={() => setDefault(null)} style={{
          alignSelf: 'flex-start', border: 'none', background: 'transparent',
          padding: 0, cursor: 'pointer', font: 'inherit', fontSize: 12,
          textDecoration: 'underline', color: 'var(--cth-ink-500)'
        }}>{t('team.network.followOrg')}</button>
      )}

      <p style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
        {t('team.network.statusNarrows')}
      </p>

      {/* Only people who differ from the default appear here. An empty table is
          the normal state and says nothing rather than showing a header. */}
      {overrides.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--cth-font-mono)', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cth-ink-500)'
          }}>{t('team.network.overrides')}</span>
          <div style={{
            borderRadius: 'var(--cth-radius-lg, 10px)',
            boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
            overflow: 'hidden'
          }}>
            {overrides.map((m, i) => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                background: i % 2 ? 'var(--cth-cream-200)' : 'var(--cth-cream-100)',
                boxShadow: i < overrides.length - 1 ? 'inset 0 -1px 0 var(--cth-ink-100)' : undefined
              }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--cth-ink-900)' }}>
                  {m.name}
                </span>
                <PolicyChip
                  policy={roster.policyFor(m.id)}
                  title={t(`team.pick.${presetWord(roster.policyFor(m.id))}.line`)}
                />
                <button
                  onClick={() => {
                    void window.cth?.teamsSetPolicy?.(m.id, null).then(() => roster.reload());
                  }}
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    padding: 0, fontSize: 12, textDecoration: 'underline',
                    color: 'var(--cth-ink-500)'
                  }}>{t('team.network.reset')}</button>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
            {t('team.network.overridesHint', { org: roster.org?.name ?? '' })}
          </p>
        </div>
      )}
    </section>
  );
}

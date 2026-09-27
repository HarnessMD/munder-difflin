/**
 * YOUR STATUS. ONE CONTROL, ONE TRUTH, AND IT LIVES HERE.
 *
 * The founder: "Our status should be only visible to see and edit in one place
 * in the right sidebar." Before 0.4.10 there was no status at all: the self row
 * on Team, the cross node thread header and the Profile device list all drew a
 * hard coded `presence="online"`, so the app showed three of a thing it did not
 * have. This is the thing, and it is drawn in exactly one place.
 *
 * WHAT A STATUS IS HERE. Not a word like "away". `TeamPolicy` on three axes,
 * `receive`, `send` and `commands`, because "away" tells another person's agent
 * nothing it can act on while "I take messages but not work" does. It is ANDed
 * with every per person policy (`effectivePolicy`), so switching to `off`
 * silences everybody without walking the roster, and switching back restores
 * exactly what each person had. That is the whole reason a status exists rather
 * than a bulk edit.
 *
 * THE SCHEDULE IS NOT DECORATION. `scheduledPreset` is applied on a minute
 * timer in main AND on every send and receive, because a laptop asleep through
 * the boundary of a window wakes with the timer still pending; without the
 * second check a message would go out under a status the person had scheduled
 * themselves out of. While a window is deciding, this control says so rather
 * than letting the person believe their last click is still in force.
 *
 * 0.4.11, THE SIMPLIFICATION. The everyday surface is the four words as one
 * segmented control with one sentence (`PresetPicker`). The schedule folds
 * under "On a schedule" and the three raw switches under "Advanced"
 * (`LaneSwitches`), because the words cover everything most people ever set
 * and a mix the words cannot say shows on the control as Custom. Nothing about
 * what is STORED changed: the same `TeamPolicy`, the same doors.
 */
import { useTranslation } from 'react-i18next';
import {
  POLICY_PRESETS, normalizeSchedule, policyOf, presetOf,
  type PolicyPreset, type StatusSchedule, type StatusWindow, type TeamPolicy,
} from '@shared/teamPolicy';
import { Disclosure, LaneSwitches, PresetPicker } from '../team/NetworkPermissions';
import { PolicyChip } from '../team/primitives';
import { useRoster } from '../team/useRoster';
import { Btn, SectionH } from './ui';
import { ProIcon } from './icons';

export function StatusControl() {
  const { t, i18n } = useTranslation();
  const roster = useRoster();
  const schedule = roster.schedule;

  const setStatus = (policy: TeamPolicy) => {
    void window.cth?.teamsSetStatus?.(policy).then(() => roster.reload());
  };
  const saveSchedule = (next: StatusSchedule) => {
    void window.cth?.teamsSetSchedule?.(normalizeSchedule(next)).then(() => roster.reload());
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionH right={<PolicyChip policy={roster.status} />}>{t('pro.status.title')}</SectionH>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--cth-ink-500)' }}>
        {t('pro.status.blurb')}
      </p>

      {roster.scheduleDriving && (
        <p style={{
          margin: 0, padding: '8px 10px', fontSize: 12, lineHeight: '17px',
          borderRadius: 'var(--cth-radius-lg, 10px)',
          border: '1px solid var(--cth-ink-300)',
          background: 'var(--cth-cream-50)', color: 'var(--cth-ink-700)'
        }}>{t('pro.status.driving')}</p>
      )}

      <PresetPicker
        policy={roster.status}
        onPick={(preset) => setStatus(policyOf(preset))}
        ariaLabel={t('pro.status.title')}
      />

      {/* The whole schedule, unchanged, one fold down. The summary chip says
          On while it is armed so the fold never hides an active schedule. */}
      <Disclosure
        label={t('pro.status.onSchedule')}
        defaultOpen={schedule.enabled}
        summary={schedule.enabled
          ? <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('pro.status.scheduleOn')}</span>
          : undefined}>
        <ScheduleEditor
          schedule={schedule}
          onChange={saveSchedule}
          locale={i18n.language}
          t={t}
        />
      </Disclosure>

      <Disclosure
        label={t('pro.status.advanced')}
        defaultOpen={presetOf(roster.status) === null}>
        <LaneSwitches policy={roster.status} onChange={setStatus} />
      </Disclosure>
    </section>
  );
}

/* ---- the schedule ----------------------------------------------------------
   Windows are LOCAL time and half open, `from` inclusive and `to` exclusive,
   measured in minutes since midnight. A window whose end is before its start
   wraps past midnight, which is the only way to say "asleep from 22:00 to
   07:00" in one row; the editor says so out loud when it happens rather than
   letting it look like a mistake. */

function ScheduleEditor(
  { schedule, onChange, locale, t }:
  {
    schedule: StatusSchedule;
    onChange: (next: StatusSchedule) => void;
    locale: string;
    t: (key: string, opts?: Record<string, unknown>) => string;
  }
) {
  const days = dayNames(locale);
  const patch = (over: Partial<StatusSchedule>) => onChange({ ...schedule, ...over });
  const patchWindow = (i: number, over: Partial<StatusWindow>) =>
    patch({ windows: schedule.windows.map((w, j) => (j === i ? { ...w, ...over } : w)) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          flex: 1, fontFamily: 'var(--cth-font-mono)', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cth-ink-500)'
        }}>{t('pro.status.scheduleTitle')}</span>
        <button
          type="button"
          role="switch"
          aria-checked={schedule.enabled}
          onClick={() => patch({ enabled: !schedule.enabled })}
          style={{
            border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 12,
            height: 24, padding: '0 10px',
            borderRadius: 'var(--cth-radius-sm, 6px)',
            boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
            background: schedule.enabled ? 'var(--cth-control-base, var(--cth-cream-200))' : 'transparent',
            color: 'var(--cth-ink-900)'
          }}>{schedule.enabled ? t('pro.status.scheduleOn') : t('pro.status.scheduleOff')}</button>
      </div>

      {!schedule.enabled ? (
        <p style={{ margin: 0, fontSize: 12, lineHeight: '17px', color: 'var(--cth-ink-500)' }}>
          {t('pro.status.scheduleOffBlurb')}
        </p>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 12, lineHeight: '17px', color: 'var(--cth-ink-500)' }}>
            {t('pro.status.scheduleBlurb')}
          </p>

          {schedule.windows.map((w, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', gap: 8, padding: 10,
              border: '1px solid var(--cth-ink-300)',
              borderRadius: 'var(--cth-radius-lg, 10px)',
              background: 'var(--cth-cream-50)'
            }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {days.map((name, d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={w.days.includes(d)}
                    onClick={() => patchWindow(i, { days: toggleDay(w.days, d) })}
                    title={name.long}
                    style={{
                      minWidth: 30, height: 24, padding: '0 6px',
                      border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 11,
                      borderRadius: 'var(--cth-radius-sm, 6px)',
                      boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
                      background: w.days.includes(d) ? 'var(--cth-control-base, var(--cth-cream-200))' : 'transparent',
                      color: w.days.includes(d) ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)'
                    }}>{name.short}</button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>
                  {t('pro.status.from')}
                  <TimeField value={w.from} onChange={(from) => patchWindow(i, { from })} />
                </label>
                <label style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>
                  {t('pro.status.to')}
                  <TimeField value={w.to} onChange={(to) => patchWindow(i, { to })} />
                </label>
                <PresetSelect
                  value={w.preset}
                  label={t('pro.status.windowPreset')}
                  onChange={(preset) => patchWindow(i, { preset })}
                  t={t}
                />
                <Btn size="sm" kind="ghost" onClick={() => patch({ windows: schedule.windows.filter((_, j) => j !== i) })}>
                  <ProIcon name="close" size={12} />{t('pro.status.removeWindow')}
                </Btn>
              </div>

              {w.days.length === 0 && (
                <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('pro.status.noDays')}</span>
              )}
              {w.from > w.to && (
                <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('pro.status.wraps')}</span>
              )}
            </div>
          ))}

          <Btn size="sm" onClick={() => patch({ windows: [...schedule.windows, NEW_WINDOW()] })}>
            <ProIcon name="plus" size={12} />{t('pro.status.addWindow')}
          </Btn>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.status.fallback')}</span>
            <PresetSelect
              value={schedule.fallback}
              label={t('pro.status.fallback')}
              onChange={(fallback) => patch({ fallback })}
              t={t}
            />
          </div>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
            {t('pro.status.fallbackBlurb')}
          </p>
        </>
      )}
    </div>
  );
}

/** A fresh window opens on the working week, 09:00 to 17:00, `converse`. Every
 *  one of those is a value the person can see and change on the row they just
 *  added; none of it is enforced until they press the schedule on. */
const NEW_WINDOW = (): StatusWindow => ({ days: [1, 2, 3, 4, 5], from: 9 * 60, to: 17 * 60, preset: 'converse' });

function toggleDay(days: number[], d: number): number[] {
  return days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b);
}

/** Minutes since local midnight, as `<input type="time">` speaks it. 1440 is a
 *  legal `to` (the end of the day) and has no clock face, so it is shown as
 *  23:59 and written back as 1440 only when it was 1440 to begin with. */
function TimeField({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const shown = value >= 1440 ? '23:59' : `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
  return (
    <input
      type="time"
      value={shown}
      onChange={(e) => {
        const [h, m] = e.target.value.split(':').map((n) => Number.parseInt(n, 10));
        if (!Number.isFinite(h) || !Number.isFinite(m)) return;
        onChange(Math.min(1439, Math.max(0, h * 60 + m)));
      }}
      style={{
        marginInlineStart: 6, height: 24, padding: '0 6px',
        border: 'none', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
        borderRadius: 'var(--cth-radius-sm, 6px)',
        background: 'var(--cth-control-quiet, var(--cth-cream-100))',
        color: 'var(--cth-ink-900)', font: 'inherit', fontSize: 12
      }}
    />
  );
}

function PresetSelect(
  { value, label, onChange, t }:
  {
    value: PolicyPreset;
    label: string;
    onChange: (preset: PolicyPreset) => void;
    t: (key: string, opts?: Record<string, unknown>) => string;
  }
) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as PolicyPreset)}
      style={{
        height: 24, padding: '0 6px',
        border: 'none', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
        borderRadius: 'var(--cth-radius-sm, 6px)',
        background: 'var(--cth-control-quiet, var(--cth-cream-100))',
        color: 'var(--cth-ink-900)', font: 'inherit', fontSize: 12
      }}>
      {POLICY_PRESETS.map((p) => (
        <option key={p} value={p}>{t(`team.preset.${p}.label`)}</option>
      ))}
    </select>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Day names from the platform, in the app's language, rather than seven more
 * keys in three locale files that would then have to agree with the calendar
 * everywhere else. The week always starts on Sunday because `Date.getDay()`
 * and `StatusWindow.days` both count from Sunday, and reordering the buttons
 * without reordering the indices is exactly how a schedule fires on the wrong
 * day.
 */
function dayNames(locale: string): { short: string; long: string }[] {
  const short = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  return Array.from({ length: 7 }, (_, d) => {
    // 2024-01-07 was a Sunday, so +d walks Sunday through Saturday.
    const day = new Date(Date.UTC(2024, 0, 7 + d));
    return { short: short.format(day), long: long.format(day) };
  });
}

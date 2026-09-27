/**
 * CLASSIC | PRO, in the titlebar where the focus-mode button was.
 *
 * Founder, 2 Sep 2026: "instead of the full screen icon make it a toggle
 * switch that indicates if we are in Classic mode or PRO mode." It is the
 * ONE writer of the skin now that Settings → Appearance is gone: two writers
 * of one preference is how a person changes it in one place and is surprised
 * by the other.
 *
 * Classic keeps the fullscreen focus terminal (Esc, the agent header); PRO's
 * agent screen is the focus, so the button that toggled it has no job here.
 *
 * Founder, 5 Sep 2026: on a FREE install the PRO option reads TRY PRO and is
 * lit a little, because for that person the switch is the door to the
 * licence screens, not a place they have been. The gate is the Settings plans
 * band's, expression for expression, so the two cannot disagree about who is
 * free. The lit pill is a tint of the accent over the switch's own ground:
 * Classic defines no accent token, so it falls back to its lemon, and the ink
 * stays the theme's ink so the label reads on both grounds.
 */
import { useTranslation } from 'react-i18next';
import { freeAdmits } from '@shared/freeTier';
import { proGateAdmits } from '@shared/soloPro';
import { setAppSkin, useAppSkin, type AppSkin } from '@/design/skin';
import { useFreeAccount } from '@/store/freeAccount';
import { useSoloLicense } from '@/components/pro/onboarding/soloLicense';
import { useTeamsMode } from '@/components/team/teamsMode';

export function ModeSwitch() {
  const { t } = useTranslation();
  const skin = useAppSkin();
  const teamsMode = useTeamsMode();
  const { free } = useFreeAccount();
  const { license } = useSoloLicense();
  const freeUser = skin !== 'professional' && teamsMode === 'solo'
    && freeAdmits(free) && !proGateAdmits(teamsMode, license);
  /* DELIBERATELY FIRES NO `paywall_shown` (0.5.0 funnel), and this is not an
     omission. The lit "TRY PRO" is not a sale: pressing it only calls
     `setAppSkin`, and the PRO gate in App.tsx then draws the Paywall, which
     fires the event itself. Firing here as well would count one person meeting
     one paywall twice and inflate the denominator every rate is measured
     against. If you are here to "add the missing event", it is already there,
     one screen along. */
  const opts: { value: AppSkin; label: string }[] = [
    { value: 'office', label: t('mode.classic') },
    { value: 'professional', label: freeUser ? t('mode.tryPro') : t('mode.pro') }
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t('mode.label')}
      className="cth-titlebar-nodrag"
      style={{
        display: 'inline-flex', alignItems: 'center', height: 28, padding: 2, gap: 2,
        background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
        borderRadius: 'var(--cth-radius-md, 6px)', fontFamily: 'var(--cth-font-ui)', fontSize: 11.5, userSelect: 'none'
      }}
    >
      {opts.map((o) => {
        const on = skin === o.value;
        const lit = freeUser && o.value === 'professional' && !on;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            data-mode={o.value}
            data-lit={lit || undefined}
            onClick={() => setAppSkin(o.value)}
            title={on ? undefined : lit ? t('mode.tryProHint') : t('mode.switchTo', { mode: o.label })}
            style={{
              height: 22, padding: '0 9px', border: 'none', cursor: on ? 'default' : 'pointer',
              borderRadius: 'var(--cth-radius-sm, 4px)', font: 'inherit', fontWeight: on || lit ? 600 : 500,
              letterSpacing: o.value === 'professional' ? '0.04em' : undefined,
              background: on ? 'var(--cth-accent)' : lit ? 'color-mix(in srgb, var(--cth-accent, var(--cth-lemon)) 22%, transparent)' : 'transparent',
              boxShadow: lit ? 'inset 0 0 0 1px color-mix(in srgb, var(--cth-accent, var(--cth-lemon)) 70%, transparent)' : undefined,
              color: on ? 'var(--cth-accent-ink)' : lit ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)'
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

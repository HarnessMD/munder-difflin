/**
 * The two pieces D6 ADDS to the onboarding wizard, lifted out of it.
 *
 * WHY THEY ARE NOT INLINE IN OnboardingWizard.tsx, which is where they started.
 * D6 is the one screen in this slice that had never been rendered: the wizard
 * reads config over IPC, so the preview harness cannot mount it, and the harness
 * rule — "if a screen cannot be rendered from props alone it does not belong
 * here" — is right and was not going to be bent with a fake `window.cth`. A stub
 * would have shown a screen nobody would ever see.
 *
 * But D6 is not a new screen. It is the solo wizard plus exactly these two
 * blocks, and BOTH ARE PURE. Out here they render from props, so the only pixels
 * D6 actually adds get looked at, under the harness's own rule rather than around
 * it. What stays unrendered is the wizard's step flow, which is unchanged from
 * upstream and was already reviewed.
 *
 * It also keeps the fork's diff against the wizard down to two element usages
 * instead of sixty lines of inline JSX, which is the difference between a file
 * that keeps merging and one that conflicts on every upstream touch.
 */
import { useTranslation } from 'react-i18next';
import { LEVEL_KEY, type NetworkLevel } from './types';

/**
 * Pinned to every wizard step on the team path, so it is never unclear whose
 * machine this is being set up as.
 */
export function OrgSetupBanner({ orgName }: { orgName: string }) {
  const { t } = useTranslation();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px',
      background: 'var(--cth-cream-200)',
      borderRadius: 'var(--cth-radius-md, 8px)',
      boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
    }}>
      <span style={{
        width: 24, height: 24, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        borderRadius: 'var(--cth-radius-sm, 6px)',
        background: 'var(--cth-cream-300)',
        fontFamily: 'var(--cth-font-mono)', fontSize: 10,
        color: 'var(--cth-ink-700)'
      }}>{orgName.slice(0, 2).toUpperCase()}</span>
      <span style={{ fontSize: 13, color: 'var(--cth-ink-900)' }}>
        {t('onboarding.org.settingUpFor', { org: orgName })}
      </span>
    </div>
  );
}

/**
 * The permissions step's team half. READ ONLY, and that is the design: the level
 * was already chosen on D4 and it is theirs to change, so the wizard reports it
 * rather than asking a second time.
 */
export function TeamLevelSummary({ level }: { level: NetworkLevel }) {
  const { t } = useTranslation();
  const key = LEVEL_KEY[level];
  return (
    <>
      <div style={{ height: 1, background: 'var(--cth-ink-300)', margin: '2px 0' }} />
      <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 10, color: 'var(--cth-ink-700)' }}>
        {t('onboarding.permissions.teamHead')}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 12,
        background: 'var(--cth-cream-200)',
        borderRadius: 'var(--cth-radius-md, 8px)',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cth-ink-900)' }}>
            {t(`team.level.${key}.label`)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--cth-ink-700)' }}>
            {t(`team.level.${key}.blurb`)}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>
        {t('onboarding.permissions.teamNote')}
      </div>
    </>
  );
}

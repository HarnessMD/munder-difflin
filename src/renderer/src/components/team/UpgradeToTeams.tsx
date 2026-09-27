/**
 * D15 — an individual on Pro who wants to start a team.
 *
 * Setting a team up is a purchase, so it opens the web console in a browser
 * rather than pretending the app can take a payment. Joining one is not, so it
 * stays in the app and goes straight to the code screen.
 */
import { useTranslation } from 'react-i18next';
import { Btn, Panel } from '../pro/ui';
import { reportTeamsCheckoutOpened, useFunnelPing } from '@/analytics/funnel';

export interface UpgradeToTeamsProps {
  onSetUpTeam: () => void;
  onJoinExisting: () => void;
}

export function UpgradeToTeams({ onSetUpTeam, onJoinExisting }: UpgradeToTeamsProps) {
  const { t } = useTranslation();
/* `paywall_shown` + `checkout_opened` (0.5.0 funnel) live in THIS component,
   not in its four callers, on purpose: this card is drawn by
   the Team pane, the Team window and the PRO Team screen, and instrumenting the callers
   would be four copies of one fact that could drift apart one at a time.
   `manual` because nobody is walled here — the person opened a team surface
   and found the offer. `reportTeamsCheckoutOpened` wraps the caller's handler
   rather than replacing it: the caller still owns WHICH url it opens, this
   only records that a teams checkout was started, which main never sees. */
  useFunnelPing({ event: 'paywall_shown', plan: 'teams', trigger: 'manual' });
  return (
    <Panel style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>
        {t('team.upgrade.title')}
      </span>
      <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)' }}>
        {t('team.upgrade.body')}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Btn kind="primary" onClick={() => { reportTeamsCheckoutOpened(); onSetUpTeam(); }}>
          {t('team.upgrade.setUp')}
        </Btn>
        <Btn onClick={onJoinExisting}>
          {t('team.upgrade.join')}
        </Btn>
      </div>
      <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>
        {t('team.upgrade.opensBrowser')}
      </span>
    </Panel>
  );
}

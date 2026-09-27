/**
 * D15 under PRO: a person on a solo plan, offered a team. Setting one up is a
 * purchase, so it opens the web console; that is the one control drawn. The
 * Classic card also offers "Join an existing team", whose handler in the seam
 * does nothing yet (D2 lives in first run), and PRO does not draw a button
 * that does nothing.
 *
 * THIS CARD IS REACHABLE AGAIN (founder, 4 Sep 2026). Under the membership
 * gate as it stood on 3 September no shipped build could draw it: a machine
 * with no org never got past the join. PRO's solo plan means it is now the one
 * place the app tells a solo person what a team would add, opened from the
 * profile drop-up (ProSidebar) and nowhere else.
 *
 * IT NAMES THE TWO THINGS THAT ARE MISSING, because that is the whole content
 * of the offer. The founder named them: the NETWORK, which is teammates and
 * what passes between their agents, and TEAM KNOWLEDGE, the shared brain. They
 * are the two families in src/shared/permissions.ts, so the sentence on this
 * card and the gate in the nav are describing one rule.
 */
import { useTranslation } from 'react-i18next';
import { ProIcon } from '../icons';
import { Btn, Card } from '../ui';
import { reportTeamsCheckoutOpened, useFunnelPing } from '@/analytics/funnel';

export function ProUpgradeToTeams({ onSetUpTeam }: { onSetUpTeam: () => void }) {
  const { t } = useTranslation();
/* `paywall_shown` + `checkout_opened` (0.5.0 funnel) live in THIS component,
   not in its four callers, on purpose: this card is drawn by
   the PRO profile drop-up and the Team pane, and instrumenting the callers
   would be four copies of one fact that could drift apart one at a time.
   `manual` because nobody is walled here — the person opened a team surface
   and found the offer. `reportTeamsCheckoutOpened` wraps the caller's handler
   rather than replacing it: the caller still owns WHICH url it opens, this
   only records that a teams checkout was started, which main never sees. */
  useFunnelPing({ event: 'paywall_shown', plan: 'teams', trigger: 'manual' });
  return (
    <Card style={{ padding: 18, gap: 10, maxWidth: 520 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t('team.upgrade.title')}</h2>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--cth-ink-700)' }}>{t('team.upgrade.body')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Adds icon="team" title={t('pro.upgrade.network')} body={t('pro.upgrade.networkBody')} />
        <Adds icon="memory" title={t('pro.upgrade.knowledge')} body={t('pro.upgrade.knowledgeBody')} />
      </div>
      <div><Btn kind="primary" onClick={() => { reportTeamsCheckoutOpened(); onSetUpTeam(); }}><ProIcon name="external" size={14} />{t('team.upgrade.setUp')}</Btn></div>
      <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('team.upgrade.opensBrowser')}</span>
    </Card>
  );
}

/** One of the two things a team adds: its name, and what it does. */
function Adds({ icon, title, body }: { icon: 'team' | 'memory'; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <ProIcon name={icon} size={15} style={{ color: 'var(--cth-ink-500)', marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--cth-ink-500)' }}>{body}</div>
      </div>
    </div>
  );
}

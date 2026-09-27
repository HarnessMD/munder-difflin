/**
 * PROFILE (phase 4, plan 4.10): who is signed in, which org, which machine,
 * and the one way out.
 *
 * Every fact here is one the desktop already holds: `teams:org` for the
 * person and the org (name, email, isAdmin, entitlement, seats, membership,
 * fetchedAt), `teams:membership` for the enrolment (device id, enrolled at,
 * last verified), the roster for this machine's fingerprint and the other
 * devices under the same person. Nothing is invented; a fact the relay has
 * not reported yet is drawn as absent, not as a default.
 *
 * SIGN OUT is `teams:identity:forget`: this machine forgets its key and its
 * membership, the next enrolment mints a new key and a new fingerprint (what
 * teammates then see as "changed", D13). Armed on first press, so a stray
 * click cannot do it. Solo has nothing to sign out of and sees the offer
 * to upgrade instead.
 *
 * Seat counts and the entitlement line are gated (`seats.view`,
 * `billing.view`): a member never sees them, here or anywhere.
 *
 * 0.4.10: THERE IS NO STATUS ON THIS SCREEN, and that is the design. Your
 * status is edited and read in one place, the right sidebar of Team
 * (`StatusControl`). The dots in the device list are the relay's heartbeat for
 * each machine, which is a different fact, and they are titled so they cannot
 * be mistaken for one.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { can } from '@shared/permissions';
import { usePaneNav } from '../professional/paneNav';
import { useFreeAccount } from '../../store/freeAccount';
import { useRoster } from '../team/useRoster';
import { isInOrg, useMembership, useOrg, useStanding, useTeamsMode } from '../team/teamsMode';
import { Fingerprint } from '../team/primitives';
import { Bar, Btn, Chip, Kv, SectionH } from './ui';
import { ProIcon } from './icons';

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const nav = usePaneNav();
  const mode = useTeamsMode();
  const inOrg = isInOrg(mode);
  const org = useOrg();
  const membership = useMembership();
  const standing = useStanding();
  const roster = useRoster();
  const [armed, setArmed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 6000);
    return () => window.clearTimeout(id);
  }, [armed]);

  const person = org?.you ?? null;
  const { free } = useFreeAccount();
  const name = person?.name || roster.self?.name || t('pro.you');
  // The org's record of the person first; otherwise the account this machine
  // signed in with (5 Sep 2026), which every install has since the free tier.
  const email = person?.email || free?.email || null;
  const when = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const signOut = () => {
    if (!armed) { setArmed(true); return; }
    setLeaving(true);
    void window.cth?.teamsForgetIdentity?.().finally(() => { setLeaving(false); setArmed(false); });
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)' }}>
      <Bar title={t('pro.profile.title')} sub={inOrg ? org?.name : t('pro.plan.pro')} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 18px 32px' }}>
        {/* Full content width (pilot feedback item 18): the cards fill the
            screen like every other full page; no half-width column. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Person */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <PersonInitials name={name} />
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{name}</span>
                <span style={{ fontSize: 12.5, color: 'var(--cth-ink-500)' }}>{email ?? t('pro.profile.emailUnknown')}</span>
              </div>
              <Chip tone={standing === 'admin' ? 'accent' : 'muted'}>{t(`pro.profile.standing.${standing}`)}</Chip>
            </div>
          </Card>

          {/* Org */}
          {inOrg ? (
            <Card>
              <SectionH right={<Btn size="sm" kind="ghost" onClick={() => nav.go('org')}>{t('team.org.title')}<ProIcon name="chevronRight" size={12} /></Btn>}>{t('pro.profile.orgTitle')}</SectionH>
              <Kv rows={[
                { k: t('team.org.nameTitle'), v: org?.name ?? membership?.orgName ?? '—' },
                { k: t('pro.profile.membership'), v: org?.membership ? t(`team.org.membership.${org.membership}`) : '—' },
                ...(can(standing, 'seats.view') && org?.seatsUsed != null && org?.seatsPaid != null ? [{ k: t('pro.profile.seats'), v: t('team.seats', { used: org.seatsUsed, total: org.seatsPaid }) }] : []),
                ...(can(standing, 'billing.view') && org?.entitlement ? [{ k: t('pro.profile.plan'), v: t(`team.org.entitlement.${org.entitlement.state}`, { when: when(org.entitlement.trialEndsAt ?? org.entitlement.graceEndsAt) }) }] : []),
                { k: t('pro.profile.asOf'), v: when(org?.fetchedAt) }
              ]} />
            </Card>
          ) : (
            <Card>
              <SectionH>{t('pro.profile.orgTitle')}</SectionH>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--cth-ink-700)', lineHeight: 1.5 }}>{t('pro.profile.soloBlurb')}</p>
              {/* DELIBERATELY FIRES NO `paywall_shown` (0.5.0 funnel). It wears
                  the upgrade card's own title, so it reads like a sale, but it
                  only navigates: the Team screen then draws `UpgradeToTeams`,
                  which fires. Firing here too would count one person meeting
                  one offer twice. Same shape as ModeSwitch. */}
              <div><Btn onClick={() => nav.go('team')}>{t('team.upgrade.title')}<ProIcon name="chevronRight" size={12} /></Btn></div>
            </Card>
          )}

          {/* Machine */}
          <Card>
            <SectionH>{t('pro.profile.machineTitle')}</SectionH>
            {inOrg && roster.self ? (
              <>
                <Kv rows={[
                  { k: t('pro.profile.machineName'), v: roster.self.machine },
                  { k: t('pro.profile.deviceId'), v: membership?.deviceId ?? '—', mono: true },
                  { k: t('pro.profile.enrolledAt'), v: when(membership?.enrolledAt) },
                  { k: t('pro.profile.lastVerified'), v: when(membership?.lastVerifiedAt) }
                ]} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('pro.team.yourFingerprint')}</span>
                  <div style={{ padding: '10px 12px', border: '1px solid var(--cth-ink-300)', borderRadius: 10, background: 'var(--cth-cream-50)' }}>
                    <Fingerprint value={roster.self.fingerprint} />
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{t('pro.team.fingerprintBlurb')}</span>
                </div>
                {roster.selfDevices.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('team.org.devicesTitle')}</span>
                    {roster.selfDevices.map((d) => (
                      <div key={d.deviceId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                        {/* CONNECTION, NOT STATUS. This dot is the relay's
                            heartbeat for one machine. Your status, what you let
                            reach your agents, is edited in exactly one place,
                            the right sidebar of Team, and is deliberately not
                            echoed here: two places to read it is two places for
                            it to be wrong. The title says which one this is. */}
                        <i title={t(`team.presence.${d.presence}`)} style={{ width: 6, height: 6, borderRadius: '50%', background: d.presence === 'online' ? 'var(--cth-status-working)' : 'var(--cth-ink-300)', display: 'inline-block' }} />
                        <span style={{ flex: 1 }}>{d.name}</span>
                        {d.isThis && <Chip tone="muted">{t('team.org.thisMachine')}</Chip>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--cth-ink-500)', lineHeight: 1.5 }}>{t('pro.profile.machineSolo')}</p>
            )}
          </Card>

          {/* Sign out */}
          {inOrg && (
            <Card>
              <SectionH>{t('pro.profile.signOutTitle')}</SectionH>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--cth-ink-700)', lineHeight: 1.5 }}>{t('pro.profile.signOutBlurb')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Btn kind="danger" onClick={signOut} disabled={leaving}>{armed ? t('pro.profile.signOutConfirm') : t('pro.profile.signOut')}</Btn>
                {armed && <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.profile.signOutArmed')}</span>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, border: '1px solid var(--cth-ink-300)', borderRadius: 12, background: 'var(--cth-cream-100)' }}>{children}</div>;
}

/** A PERSON: initials (or, later, a photo). Agents are sprites; this is never an agent. */
function PersonInitials({ name }: { name: string }) {
  const ini = name.split(/[\s-]+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <span style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'var(--cth-cream-200)', color: 'var(--cth-ink-900)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15 }}>{ini}</span>
  );
}

/**
 * S1, "This org" (Pam, UI-PLAN-teams-v2 §3). One panel that answers four
 * questions a member cannot otherwise answer: which org am I in, is it the
 * one I think it is, what does it require of me, and is it healthy.
 *
 *   - The name, immediately qualified: what the org calls itself, not proof.
 *   - The signing key, six groups of four, mono, at rest, with a STATED trust
 *     state: unverified on first sight, verified only after a person says so.
 *     Same trust on first use as a device pin, for the same reason: a relay
 *     that could set verified could clear it.
 *   - The out of band instruction in the product: read the six groups to your
 *     admin, or compare them with what the admin's own app shows (S7: the
 *     admin is a desktop user too, so the console is not needed). Verify is
 *     a button a human presses after doing that.
 *   - Policy in effect, WITH its consequence: the default for new teammates,
 *     and when verification is required, what is refused until you do it.
 *   - State: entitlement and trial day and seats FOR AN ADMIN ONLY (founder,
 *     2 Sep 2026: members do not see pricing, billing or seats; permissions.ts
 *     `seats.view` / `billing.view`), then your own row and its membership.
 *
 * `standing` is required, not defaulted: a caller that forgets it is a type
 * error, never a member quietly shown the seat count again.
 *
 * Until the relay reports `/me` (server item S2) only the name is known, and
 * the panel says so instead of drawing rows with nothing behind them.
 */
import { useTranslation } from 'react-i18next';
import { StatusPill } from './primitives';
import { LEVEL_KEY } from './types';
import type { OrgView } from '@shared/teams';
import { can, type OrgStanding } from '@shared/permissions';
import { Btn, Panel } from '../pro/ui';

export interface OwnDeviceRow {
  deviceId: string;
  name: string;
  presence: 'online' | 'offline';
  lastSeenAt: string | null;
  isThis: boolean;
}

export interface OrgPanelProps {
  org: OrgView;
  /** Who is looking (permissions.standingOf): decides whether the entitlement
   *  and seat rows are drawn at all. */
  standing: OrgStanding;
  /** Your own machines, from the roster (plan 4.8). A lost laptop is one of
   *  these rows; the admin revokes it from the console and it stops. */
  devices?: OwnDeviceRow[];
  onVerify?: () => void;
  onBack?: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', boxShadow: 'inset 0 -1px 0 var(--cth-ink-100)' }}>
      <span style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>{title}</span>
      {children}
    </section>
  );
}

const body: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)' };
const mono: React.CSSProperties = {
  fontFamily: 'var(--cth-font-mono)', fontSize: 15, letterSpacing: '0.06em',
  color: 'var(--cth-ink-900)', padding: '10px 12px',
  background: 'var(--cth-cream-200)', borderRadius: 'var(--cth-radius-md, 8px)',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', userSelect: 'all', wordBreak: 'break-word',
};

export function OrgPanel({ org, devices = [], onVerify, onBack, standing }: OrgPanelProps) {
  const { t, i18n } = useTranslation();
  const when = (iso: string | null) =>
    iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }) : '';
  const changed = !!org.keyPreviousGroups;

  return (
    <Panel noPadding style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('team.org.title')}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {org.name}
          </span>
        </div>
        {onBack && <Btn kind="ghost" size="sm" onClick={onBack}>{t('team.org.back')}</Btn>}
      </header>

      <Section title={t('team.org.nameTitle')}>
        <p style={body}>{t('team.org.nameProvenance')}</p>
      </Section>

      {!org.available ? (
        <Section title={t('team.org.keyTitle')}>
          <p style={body}>{t('team.org.unavailable')}</p>
        </Section>
      ) : (
        <>
          <Section title={t('team.org.keyTitle')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StatusPill status={org.keyVerified ? 'success' : changed ? 'blocked' : 'waiting'}>
                {t(org.keyVerified ? 'team.org.keyVerified' : changed ? 'team.org.keyChanged' : 'team.org.keyUnverified')}
              </StatusPill>
            </div>
            <div style={mono}>{org.keyGroups}</div>
            {changed && (
              <>
                <p style={{ ...body, color: 'var(--cth-status-blocked)' }}>{t('team.org.keyChangedBody')}</p>
                <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('team.org.previousKey')}</span>
                <div style={{ ...mono, color: 'var(--cth-ink-500)', textDecoration: 'line-through' }}>{org.keyPreviousGroups}</div>
              </>
            )}
            <p style={body}>{t('team.org.keyInstruction')}</p>
            {!org.keyVerified && (
              <div>
                <Btn kind="primary" size="sm" onClick={onVerify}>{t('team.org.verify')}</Btn>
              </div>
            )}
          </Section>

          <Section title={t('team.org.policyTitle')}>
            <p style={body}>
              {t('team.org.defaultPermission', { level: t(`team.levels.${LEVEL_KEY[org.defaultPermission ?? 'communication-only']}.label`) })}
            </p>
            <p style={{ ...body, color: org.requireFingerprint ? 'var(--cth-ink-900)' : 'var(--cth-ink-700)' }}>
              {t(org.requireFingerprint ? 'team.org.requireFingerprintOn' : 'team.org.requireFingerprintOff')}
            </p>
          </Section>

          {/* No organisation key here: organisation keys do not exist
              (founder batch 3 #15), so the setting is gone everywhere. */}

          {/* Admin only: entitlement is billing and seats are the plan's size,
              neither of which a member is shown (permissions.ts). The section
              is absent for a member rather than blanked, so nothing on the
              panel hints at a row they are not allowed to read. */}
          {can(standing, 'billing.view') && (
            <Section title={t('team.org.stateTitle')}>
              <p style={body}>
                {org.entitlement && t(`team.org.entitlement.${org.entitlement.state}`, {
                  when: when(org.entitlement.state === 'trialing' ? org.entitlement.trialEndsAt : org.entitlement.graceEndsAt),
                })}
              </p>
              {can(standing, 'seats.view') && org.seatsUsed !== null && org.seatsPaid !== null && (
                <p style={body}>{t('team.seats', { used: org.seatsUsed, total: org.seatsPaid })}</p>
              )}
            </Section>
          )}

          <Section title={t('team.org.devicesTitle')}>
            {devices.length === 0
              ? <p style={body}>{t('team.org.devicesNone')}</p>
              : devices.map((d) => (
                <div key={d.deviceId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--cth-ink-900)' }}>
                  <StatusPill status={d.presence === 'online' ? 'success' : 'idle'}>
                    {t(`team.presence.${d.presence}`)}
                  </StatusPill>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  {d.isThis && <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('team.org.thisMachine')}</span>}
                </div>
              ))}
            <p style={{ ...body, fontSize: 12 }}>{t('team.org.devicesHint')}</p>
          </Section>

          <Section title={t('team.org.youTitle')}>
            <p style={body}>
              {[org.you?.name, org.you?.email].filter(Boolean).join(' · ')}
              {org.you?.isAdmin ? ` · ${t('team.org.admin')}` : ''}
            </p>
            <p style={body}>{org.membership && t(`team.org.membership.${org.membership}`)}</p>
            {org.fetchedAt && (
              <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>
                {t('team.org.asOf', { when: new Date(org.fetchedAt).toLocaleString(i18n.language) })}
              </span>
            )}
          </Section>
        </>
      )}
    </Panel>
  );
}

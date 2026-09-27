/**
 * THE TAKEOVER (plan 4.5, 5; Pam's revocation-takeover.html). One surface,
 * one reason at a time, and the remedy the reason actually allows.
 *
 *   suspended    reversible, seat still held, key intact → talk to your admin.
 *                NO "enter a new code": offering one says the key is gone.
 *   removed      seat released, key revoked, cannot re-enrol → solo, or a new code.
 *   entitlement  the org's billing is not active (no card, or a failed one); not the member's action → tell your admin.
 *   unknown      two `unauthorized` in a row and no `/me` to ask (today's
 *                server). Says ended OR paused, asserts no reason, offers
 *                nothing that would assert one.
 *   lease        this machine has not reached its team for longer than the
 *                lease allows. Reconnect to continue; the solo floor is not
 *                offered because this machine is enrolled.
 *
 * WHERE IT RENDERS is plan 3.1's open question, and `LOCK_APP_ON_REVOKE`
 * decides: full window (`full`) with local work not offered, or on the Team
 * surface with the rest of the app running. The copy is the same either way.
 */
import { useTranslation } from 'react-i18next';
import { StatusPill } from './primitives';
import type { LockInfo, StopReason } from '@shared/teams';
import { Btn, Panel } from '../pro/ui';

export interface RevokedTakeoverProps {
  info: LockInfo;
  /** Full-window (3.1 lock) or a panel over the Team surface. */
  full?: boolean;
  onReconnect?: () => void;
  onContinueSolo?: () => void;
  onEnterNewCode?: () => void;
}

type Copy = 'suspended' | 'removed' | 'entitlement' | 'unknown' | 'lease';

/* Pam's three hues for the three reasons. `unknown` and `lease` assert no
   reason, so they take the hue that claims least and still reads as a pill. */
const PILL: Record<Copy, 'waiting' | 'blocked' | 'working'> = {
  suspended: 'waiting', removed: 'blocked', entitlement: 'working', unknown: 'waiting', lease: 'waiting'
};

function copyFor(info: LockInfo): Copy {
  if (info.kind === 'lease') return 'lease';
  return (info.reason ?? 'unknown') as StopReason;
}

export function RevokedTakeover({ info, full = false, onReconnect, onContinueSolo, onEnterNewCode }: RevokedTakeoverProps) {
  const { t, i18n } = useTranslation();
  const copy = copyFor(info);
  const since = new Date(info.lastVerifiedAt);
  const sinceLabel = Number.isFinite(since.getTime())
    ? since.toLocaleString(i18n.language, { weekday: 'long', hour: 'numeric', minute: '2-digit' })
    : '';

  const body = (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      padding: 24, maxWidth: 440, textAlign: 'center'
    }}>
      <StatusPill status={PILL[copy]}>{t(`team.revoked.${copy}.pill`)}</StatusPill>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--cth-ink-900)', lineHeight: '22px' }}>
        {t(`team.revoked.${copy}.title`, { org: info.orgName, since: sinceLabel })}
      </span>
      <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)' }}>
        {t(`team.revoked.${copy}.body`, { org: info.orgName, since: sinceLabel })}
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Every state may try again: a reconnect is the one remedy that
            asserts nothing about why. It is the ONLY button on `lease`. */}
        <Btn kind="primary" onClick={onReconnect}>
          {t('team.revoked.reconnect')}
        </Btn>
        {/* Solo is offered where the seat is truly gone or the plan is the
            org's problem, and never under the 3.1 lock, where local work is
            not on offer at all. */}
        {!full && (copy === 'removed' || copy === 'entitlement' || copy === 'suspended') && (
          <Btn onClick={onContinueSolo}>
            {t('team.revoked.continueSolo')}
          </Btn>
        )}
        {/* A new code is right ONLY when the key cannot re-enrol. */}
        {copy === 'removed' && (
          <Btn onClick={onEnterNewCode}>
            {t('team.revoked.enterCode')}
          </Btn>
        )}
      </div>
      {(copy === 'suspended' || copy === 'entitlement' || copy === 'unknown') && (
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>
          {t(`team.revoked.${copy}.note`)}
        </span>
      )}
    </div>
  );

  if (full) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'grid', placeItems: 'center',
        background: 'var(--cth-cream-100)'
      }}>
        <Panel noPadding>{body}</Panel>
      </div>
    );
  }
  return (
    <Panel noPadding style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center'
    }}>
      {body}
    </Panel>
  );
}

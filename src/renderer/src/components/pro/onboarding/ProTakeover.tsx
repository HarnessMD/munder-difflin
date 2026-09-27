/**
 * THE TAKEOVER, PRO (v0.4.9 phase 1). What a member sees under the 3.1 lock
 * when the seat stopped working or the lease ran out: one reason at a time,
 * the words Creed wrote for it (team.revoked.*), and only the remedy that
 * reason really allows. Classic keeps RevokedTakeover; App.tsx mounts this
 * one under the PRO skin. Null while the reason is still being read, which
 * is one IPC round trip, exactly as TeamsLock is.
 *
 *   suspended    reversible, key intact: talk to your admin. No new code.
 *   removed      seat released, key revoked: a new code is the way back.
 *   entitlement  the org's billing is not active: the admin's to fix.
 *   unknown      two `unauthorized` in a row and no `/me` to ask.
 *   lease        this machine has not reached its team for too long.
 *
 * Reconnect is on every state: it asserts nothing about why. Local work is
 * not offered under the lock (plan 3.1), so there is no solo button here.
 */
import { useTranslation } from 'react-i18next';
import { LOCK_APP_ON_REVOKE, type LockInfo, type StopReason } from '@shared/teams';
import { useLockInfo, useLockRemedies } from '../../team/teamsMode';
import { Btn, Card, Chip, type ChipTone } from '../ui';

type Copy = 'suspended' | 'removed' | 'entitlement' | 'unknown' | 'lease';

const TONE: Record<Copy, ChipTone> = { suspended: 'warn', removed: 'bad', entitlement: 'warn', unknown: 'muted', lease: 'warn' };

function copyFor(info: LockInfo): Copy {
  if (info.kind === 'lease') return 'lease';
  return (info.reason ?? 'unknown') as StopReason;
}

export function ProTakeover() {
  const lock = useLockInfo();
  const remedies = useLockRemedies();
  if (!LOCK_APP_ON_REVOKE || !lock) return null;
  return <TakeoverCard info={lock} onReconnect={remedies.onReconnect} onEnterNewCode={remedies.onEnterNewCode} />;
}

/** The card alone, from props, so it can be looked at without a lock. */
export function TakeoverCard({ info, onReconnect, onEnterNewCode }: { info: LockInfo; onReconnect: () => void; onEnterNewCode: () => void }) {
  const { t, i18n } = useTranslation();
  const copy = copyFor(info);
  const since = new Date(info.lastVerifiedAt);
  const sinceLabel = Number.isFinite(since.getTime())
    ? since.toLocaleString(i18n.language, { weekday: 'long', hour: 'numeric', minute: '2-digit' })
    : '';
  const vars = { org: info.orgName, since: sinceLabel };
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', padding: 24, background: 'var(--cth-cream-50)', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)' }}>
      <Card style={{ width: 'min(460px, 100%)', margin: 'auto', padding: 24, alignItems: 'center', textAlign: 'center', gap: 12, background: 'var(--cth-cream-100)', boxShadow: 'var(--cth-shadow-hard)' }}>
        <Chip tone={TONE[copy]}>{t(`team.revoked.${copy}.pill`)}</Chip>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{t(`team.revoked.${copy}.title`, vars)}</h2>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--cth-ink-700)' }}>{t(`team.revoked.${copy}.body`, vars)}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Btn kind="primary" onClick={onReconnect}>{t('team.revoked.reconnect')}</Btn>
          {/* A new code is right ONLY when the key cannot re-enrol. */}
          {copy === 'removed' && <Btn onClick={onEnterNewCode}>{t('team.revoked.enterCode')}</Btn>}
        </div>
        {(copy === 'suspended' || copy === 'entitlement' || copy === 'unknown') && (
          <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t(`team.revoked.${copy}.note`)}</span>
        )}
      </Card>
    </div>
  );
}

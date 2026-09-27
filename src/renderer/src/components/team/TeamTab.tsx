/**
 * D7 — the member's own view of their team, and D14, which takes the same
 * surface over when an admin revokes the seat.
 *
 * This is what replaces a web dashboard for everyone who is not an admin.
 * There is deliberately no member facing web login, so everything a member
 * needs about their org has to be reachable here.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlyphAvatar, PermissionPill, StatusPill } from './primitives';
import { TeammateDetail } from './TeammateDetail';
import { useRoster } from './useRoster';
import { useMembership } from './teamsMode';
import { RevokedTakeover } from './RevokedTakeover';
import type { ConnectionState, NetworkLevel, Teammate } from './types';
import type { LockInfo } from '@shared/teams';
import { LEVEL_KEY, NETWORK_LEVELS } from './types';
import { Panel } from '../pro/ui';

export interface TeamTabProps {
  /** REQUIRED. It defaulted to `connected` once, which meant a caller that
   *  forgot to pass it shipped a roster that could never look stale. The seam
   *  reads the connection store and passes it; the boards pass a literal. */
  connection: ConnectionState;
  /** D14 / Pam's S2: the gate says `locked` and this is why. Replaces the
   *  `removed` boolean, which could only say one of the reasons. */
  lock?: LockInfo | null;
  onReconnect?: () => void;
  onContinueSolo?: () => void;
  onEnterNewCode?: () => void;
  /** Open D11 with this teammate. Optional so the preview boards can render the
   *  roster on its own; in the app it is always supplied. */
  onOpenThread?: (mate: Teammate) => void;
  /** Open S1, "This org". The org name in the header is the way in (Pam:
   *  reached from the Team surface). */
  onOpenOrg?: () => void;
}

export function TeamTab({
  connection, lock = null, onReconnect, onContinueSolo, onEnterNewCode, onOpenThread, onOpenOrg
}: TeamTabProps) {
  const { t } = useTranslation();
  /* The roster is the RELAY's now. `useRoster` joins it with this machine's
     trust pins and personal overrides in main, so nothing here can read
     `verified` off the wire — there is nothing on the wire to read. */
  const roster = useRoster();
  /* The org name comes from membership.json, not the roster: a device the
     relay refuses cannot read the roster, which is the whole situation. */
  const membership = useMembership();
  const [local, setLocal] = useState<Teammate[] | null>(null);
  const teammates = local ?? roster.teammates;
  const self = roster.self;
  const [openId, setOpenId] = useState<string | null>(null);

  /* A local edit (D9's per-person override) shows immediately and is persisted
     by main; the next reload takes the server's word again. */
  const setTeammates = (next: Teammate[] | ((prev: Teammate[]) => Teammate[])) =>
    setLocal(typeof next === 'function' ? next(teammates) : next);

  // Disconnected dims the list rather than hiding it: the roster is still true,
  // it is only the presence dots that have gone stale.
  const stale = connection !== 'connected';
  const open = teammates.find(m => m.id === openId) ?? null;

  if (lock) {
    return (
      <RevokedTakeover
        info={lock}
        onReconnect={onReconnect}
        onContinueSolo={onContinueSolo}
        onEnterNewCode={onEnterNewCode}
      />
    );
  }

  return (
    <Panel noPadding style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
          {/* The name is the way into S1: the panel that says whether this is
              the org you think it is. A button, because a name that is not
              proof of anything should lead to the thing that is. */}
          <button
            onClick={onOpenOrg}
            disabled={!onOpenOrg}
            title={onOpenOrg ? t('team.org.title') : undefined}
            style={{
              background: 'transparent', border: 'none', padding: 0, textAlign: 'start',
              cursor: onOpenOrg ? 'pointer' : 'default', fontFamily: 'inherit',
              fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
              color: 'var(--cth-ink-900)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textDecoration: onOpenOrg ? 'underline dotted' : 'none', textUnderlineOffset: 3
            }}>{roster.org?.name ?? membership?.orgName ?? ''}</button>
          <span style={{
            fontFamily: 'var(--cth-font-mono)', fontSize: 11,
            color: 'var(--cth-ink-500)'
          }}>{roster.org
            ? t('team.seats', { used: roster.org.seatsUsed, total: roster.org.seatsPaid })
            : roster.error
              ? (roster.error.detail ?? roster.error.code)
              : ''}</span>
        </div>
        {/* NO ConnectionChip HERE. The titlebar carries one, it is global and
            always visible, so a second in this header is the same fact twice —
            and now that neither is a button, duplicate information with no
            compensating utility. The stale bar below still says what changed. */}
      </header>

      {stale && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px',
          background: 'var(--cth-status-waiting-tint)',
          color: 'var(--cth-status-waiting)',
          fontSize: 12,
          boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)'
        }}>
          {t('team.staleBar')}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', opacity: stale ? 0.5 : 1 }}>
        {/* Your own row is pinned at the top and your level is editable here.
            It renders only when the roster has actually named a self row: the
            relay marks it with `isSelf`, and before the roster loads there is
            no self to draw. Passing a null through to SelfRow typechecked and
            would have thrown at render, because `self` is also a DOM global and
            the checker resolved the wrong one. */}
        {self && (
          <SelfRow
            self={self}
            onChange={level => {
              /* Your own row's level is THIS MACHINE'S DEFAULT for every
                 teammate without an override: it is what the message path
                 falls back to before the org default, and it never leaves the
                 machine. It used to be written under your own member id,
                 which nothing read, so "Blocked" here blocked nothing. */
              void window.cth?.teamsSetYouAllowDefault?.(level).then(() => roster.reload());
            }}
          />
        )}

        {teammates.length === 0 ? (
          <EmptyTeam />
        ) : (
          teammates.map((m, i) => (
            <TeammateRow
              key={m.id}
              mate={m}
              alternate={i % 2 === 1}
              onOpen={() => setOpenId(m.id)}
            />
          ))
        )}
      </div>

      {open && (
        <TeammateDetail
          mate={open}
          onClose={() => setOpenId(null)}
          onChangeYouAllow={level => {
            /* The local flip is only so the card does not lag the round trip.
               The override lives in main's trust file, keyed by THEIR member
               id, which is the key the message path looks up on receipt. */
            setTeammates(list => list.map(m => m.id === open.id
              ? { ...m, youAllow: level, overridden: level !== roster.yourDefault }
              : m));
            void window.cth?.teamsSetYouAllow?.(open.id, level).then(() => roster.reload());
          }}
          onVerify={() => {
            /* A human confirmed the safety number out of band. The pin is
               main's (teamPins), keyed by the relay's device id; the local
               flip is only so the pill does not lag the round trip. */
            setTeammates(list => list.map(m => m.id === open.id
              ? { ...m, verified: true, previousFingerprint: undefined }
              : m));
            if (open.deviceId) void window.cth?.teamsVerifyDevice?.(open.deviceId, open.fingerprint);
          }}
          onMessage={() => { setOpenId(null); onOpenThread?.(open); }}
        />
      )}
    </Panel>
  );
}

function SelfRow({ self, onChange }: { self: Teammate; onChange: (l: NetworkLevel) => void }) {
  const { t } = useTranslation();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px',
      background: 'var(--cth-cream-200)',
      boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)'
    }}>
      <GlyphAvatar name={self.name} presence={self.presence} surface="var(--cth-cream-200)" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--cth-ink-900)' }}>
            {t('team.you')}
          </span>
          <span style={{
            height: 18, padding: '0 6px', display: 'inline-flex', alignItems: 'center',
            borderRadius: 'var(--cth-radius-sm, 6px)',
            background: 'var(--cth-cream-300)',
            fontFamily: 'var(--cth-font-mono)', fontSize: 10,
            color: 'var(--cth-ink-700)'
          }}>{t('team.youBadge')}</span>
        </span>
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{self.machine}</span>
      </div>
      {/* Editable inline: this is the one level on this screen that is yours. */}
      <select
        value={self.youAllow}
        onChange={e => onChange(e.target.value as NetworkLevel)}
        aria-label={t('team.yourLevel')}
        style={{
          height: 24, padding: '0 6px',
          borderRadius: 'var(--cth-radius-sm, 6px)',
          background: 'var(--cth-control-quiet, var(--cth-cream-100))',
          border: 'none', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
          color: 'var(--cth-ink-900)', fontSize: 11
        }}>
        {NETWORK_LEVELS.map(l => (
          <option key={l} value={l}>{t(`team.level.${LEVEL_KEY[l]}.label`)}</option>
        ))}
      </select>
    </div>
  );
}

function TeammateRow(
  { mate, alternate, onOpen }: { mate: Teammate; alternate: boolean; onOpen: () => void }
) {
  const { t } = useTranslation();
  // Blocked BY them: the row dims, because there is nothing you can send.
  const blocked = mate.theyAllow === 'strict';
  const surface = alternate ? 'var(--cth-cream-200)' : 'var(--cth-cream-100)';
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', cursor: 'pointer',
        background: surface,
        boxShadow: 'inset 0 -1px 0 var(--cth-ink-100)',
        opacity: blocked ? 0.55 : 1
      }}>
      <GlyphAvatar name={mate.name} presence={mate.presence} surface={surface} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 14, fontWeight: 500, color: 'var(--cth-ink-900)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{mate.name}</span>
        <span style={{
          fontSize: 12, color: 'var(--cth-ink-500)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{mate.machine}</span>
      </div>
      {!mate.verified && (
        <StatusPill status="waiting">{t('team.unverified')}</StatusPill>
      )}
      {/* What THEY allow YOU. Not what you allow them: this is the one that
          decides whether anything you send will land. */}
      <PermissionPill level={mate.theyAllow} />
    </div>
  );
}

function EmptyTeam() {
  const { t } = useTranslation();
  return (
    <div style={{
      padding: '48px 24px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
    }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>
        {t('team.empty.title')}
      </span>
      <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)', maxWidth: 320 }}>
        {t('team.empty.body')}
      </p>
    </div>
  );
}

/**
 * TEAM (phase 4). The people in this org and what their clones may reach.
 *
 * WHAT EACH STANDING SEES (plan 6.3, gated through `can()` and nothing else):
 *   admin   the roster, seats, Invite / Seats / Remove — which open the
 *           CONSOLE, because minting an invite, changing seats and removing a
 *           member are console routes with no relay route on the desktop
 *           (src/shared/consoleLinks.ts). The button says "in the console".
 *   member  the roster, presence, their own fingerprint and devices, and
 *           their status (StatusControl, the one machine wide control).
 *           No seat line, no invite.
 *   solo    the offer to upgrade (UpgradeToTeams), as the seam drew it.
 *
 * WHAT IS NOT HERE: "Permissions" for ANOTHER person's clones
 * (`team.permissions`). No route exists for it anywhere, console included,
 * so no row is drawn rather than a row that would have to lie.
 *
 * Data is the same roster Creed's TeamTab reads (useRoster over teams:roster),
 * the same doors for the writes (teamsSetPolicy, teamsVerifyDevice), and
 * TeammateDetail itself for the drawer, so the two skins cannot disagree about
 * who is on the team. Message → Inbox on that person's DM.
 *
 * 0.4.10, THE RIGHT SIDEBAR IS THE ONLY PLACE A STATUS LIVES. 0.4.11 finished
 * the thought: the sidebar holds `StatusControl` and nothing else about
 * permissions, because your status is the one machine wide decision and a
 * teammate's own setting is made on their card in the drawer. The self row
 * draws the relay's presence rather than a hard coded "online".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { can } from '@shared/permissions';
import type { TeamPolicy } from '@shared/teamPolicy';
import { laneSummary } from '@shared/laneSummary';
import { consoleUrl } from '@shared/consoleLinks';
import { usePaneNav } from '../professional/paneNav';
import { useRoster } from '../team/useRoster';
import { useResolvedGodName } from '@/hooks/useResolvedGodName';
import { BossNameField } from './BossNameField';
import { NameField } from './NameField';
import { isInOrg, useMembership, useOrg, useStanding, useTeamsMode } from '../team/teamsMode';
import { useConnection } from '../team/teamsConnection';
import { TeammateDetail } from '../team/TeammateDetail';
import { UpgradeToTeams } from '../team/UpgradeToTeams';
import { StatusControl } from './StatusControl';
import { Fingerprint, GlyphAvatar, PolicyChip } from '../team/primitives';
import type { Teammate } from '../team/types';
import { Bar, Btn, Chip, SectionH, useEscapeToClose } from './ui';
import { ProIcon } from './icons';
import { requestInboxChat } from './inboxIntent';
import { ORG_PANE } from '../team/teamsSeam';

export function TeamScreen() {
  const mode = useTeamsMode();
  if (!isInOrg(mode)) {
    return (
      <div style={{ position: 'absolute', inset: 0, padding: 16, overflowY: 'auto' }}>
        <UpgradeToTeams
          onSetUpTeam={() => { void window.open?.('https://harnessmd.com/checkout', '_blank'); }}
          onJoinExisting={() => { /* D2 lives in first run; nothing to open yet (same as the seam). */ }}
        />
      </div>
    );
  }
  return <OrgTeam />;
}

function OrgTeam() {
  const { t } = useTranslation();
  const nav = usePaneNav();
  const roster = useRoster();
  const org = useOrg();
  const membership = useMembership();
  const standing = useStanding();
  const connection = useConnection();
  const [openId, setOpenId] = useState<string | null>(null);
  const closeDetail = useCallback(() => setOpenId(null), []);
  const [local, setLocal] = useState<Teammate[] | null>(null);

  const mates = local ?? roster.teammates;
  const open = mates.find((m) => m.id === openId) ?? null;
  const online = mates.filter((m) => m.presence === 'online').length;
  const stale = connection.state !== 'connected';
  const orgName = roster.org?.name ?? membership?.orgName ?? org?.name ?? '';
  const seats = can(standing, 'seats.view') && roster.org ? t('team.seats', { used: roster.org.seatsUsed, total: roster.org.seatsPaid }) : null;
  const sub = [t('pro.team.online', { n: online, total: mates.length }), seats].filter(Boolean).join(' · ');

  const message = (m: Teammate) => { requestInboxChat(`dm:${m.id}`); nav.go('inbox'); };
  const openConsole = (page: 'members' | 'billing') => { void window.open?.(consoleUrl(page), '_blank'); };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)' }}>
      <Bar title={orgName || t('rail.team')} sub={sub}>
        <Btn kind="ghost" onClick={() => nav.go(ORG_PANE)} title={t('team.org.title')}><ProIcon name="org" size={14} />{t('pro.team.organisation')}</Btn>
        {can(standing, 'team.invite') && (
          <Btn kind="primary" onClick={() => openConsole('members')} title={t('pro.team.opensConsole')}><ProIcon name="plus" size={14} />{t('pro.team.invite')}<ProIcon name="external" size={12} /></Btn>
        )}
      </Bar>
      {stale && (
        <div style={{ padding: '7px 18px', background: 'var(--cth-status-waiting-tint)', color: 'var(--cth-status-waiting)', fontSize: 12, borderBottom: '1px solid var(--cth-ink-300)' }}>{t('team.staleBar')}</div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', position: 'relative' }}>
        {/* Roster */}
        <div style={{ overflowY: 'auto', padding: '14px 18px 24px', display: 'flex', flexDirection: 'column', gap: 8, opacity: stale ? 0.6 : 1 }}>
          <SectionH>{t('pro.team.people')}</SectionH>
          {roster.self && <SelfCard self={roster.self} onNamed={roster.reload} />}
          {mates.length === 0 ? (
            <div style={{ padding: '14px 16px', border: '1px solid var(--cth-ink-300)', borderRadius: 10, fontSize: 12.5, color: 'var(--cth-ink-500)', background: 'var(--cth-cream-100)' }}>
              <div style={{ fontWeight: 600, color: 'var(--cth-ink-900)', marginBottom: 3 }}>{t('team.empty.title')}</div>
              {can(standing, 'team.invite') ? t('pro.team.emptyAdmin') : t('team.empty.body')}
            </div>
          ) : mates.map((m) => (
            <MateRow
              key={m.id}
              mate={m}
              mine={roster.effectiveFor(m.id)}
              theirs={roster.theirPolicy(m)}
              onOpen={() => setOpenId(m.id)}
              onMessage={() => message(m)}
            />
          ))}
        </div>

        {/* Side: YOUR STATUS, then the standing-specific card. The status is
            here and nowhere else in the app: one control, one truth (founder,
            0.4.10). 0.4.11 collapsed the second card that sat under it: a
            teammate's own setting lives on their card in the drawer, so the
            sidebar holds exactly one decision. */}
        <aside style={{ borderLeft: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {can(standing, 'self.allow') && <StatusControl />}
          {can(standing, 'seats.manage') ? (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionH>{t('pro.team.adminTitle')}</SectionH>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{t('pro.team.adminBlurb')}</p>
              <ConsoleLink label={t('pro.team.invite')} onClick={() => openConsole('members')} />
              <ConsoleLink label={t('pro.team.removeMember')} onClick={() => openConsole('members')} />
              <ConsoleLink label={t('pro.team.manageSeats')} onClick={() => openConsole('billing')} />
            </section>
          ) : roster.self && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionH>{t('pro.team.yourFingerprint')}</SectionH>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{t('pro.team.fingerprintBlurb')}</p>
              <div style={{ padding: '10px 12px', border: '1px solid var(--cth-ink-300)', borderRadius: 10, background: 'var(--cth-cream-50)' }}>
                <Fingerprint value={roster.self.fingerprint} />
              </div>
            </section>
          )}
        </aside>

        {open && (
          <EscapeCloses onClose={closeDetail}>
          <TeammateDetail
            mate={open}
            onClose={closeDetail}
            policy={roster.policyFor(open.id)}
            status={roster.status}
            theirs={roster.theirPolicy(open)}
            overridden={roster.hasOverride(open.id)}
            onChangePolicy={(policy) => {
              // No optimistic copy: the policy lives in main's pin file, main
              // pushes `teams:policy` the moment it lands, and `useRoster`
              // re-reads on that push. A local flip here would be a second
              // truth for the one value this release exists to make single.
              void window.cth?.teamsSetPolicy?.(open.id, policy).then(() => roster.reload());
            }}
            onVerify={() => {
              setLocal((list) => (list ?? roster.teammates).map((m) => m.id === open.id ? { ...m, verified: true, previousFingerprint: undefined } : m));
              if (open.deviceId) void window.cth?.teamsVerifyDevice?.(open.deviceId, open.fingerprint).then(() => { setLocal(null); roster.reload(); });
            }}
            onMessage={() => { setOpenId(null); message(open); }}
          />
          </EscapeCloses>
        )}
      </div>
    </div>
  );
}

function SelfCard({ self, onNamed }: { self: Teammate; onNamed: () => void }) {
  const { t } = useTranslation();
  // A device enrolled without a display name comes back nameless from the
  // relay (seen live, 2 Sep: an empty avatar beside the badge). "You" is the
  // name then, and it is also what the avatar draws as ME. 0.5.2: main now
  // falls back to the machine's name and flags the row `unnamed`, so the
  // flag is the signal rather than an empty string.
  const name = self.unnamed ? t('team.you') : (self.name.trim() || t('team.you'));
  const godName = useResolvedGodName();
  // 0.4.9: this seat owes the org a unique name for its orchestrator, because
  // the claim at enrol was refused. Asked HERE, beside the roster that shows
  // which words are already taken, rather than in a modal over it.
  const [needed, setNeeded] = useState(false);
  useEffect(() => {
    let live = true;
    void window.cth.teamsMembership().then((m) => { if (live) setNeeded(!!m?.bossNameNeeded); });
    return () => { live = false; };
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 14px', border: '1px solid var(--cth-ink-300)', borderRadius: 10, background: 'var(--cth-cream-200)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* The relay's presence for this machine, not a hard coded "online".
            It used to be the literal, which meant the app drew a status it did
            not have. The one status control is in the right sidebar; this row
            reports connection and never edits anything. */}
        <GlyphAvatar name={name} presence={self.presence} size={32} surface="var(--cth-cream-200)" />
        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {name} <Chip tone="muted" style={{ marginInlineStart: 4 }}>{t('team.youBadge')}</Chip>
            {!needed && <Chip tone="info" style={{ marginInlineStart: 4 }} title={t('pro.boss.yours')}>{godName}</Chip>}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{self.machine}</span>
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('pro.team.thisMachine')}</span>
      </div>
      {/* 0.5.2: no name on the relay means teammates see this machine's name
          for the person. Asked here, on the row that shows what they see. */}
      {self.unnamed && (
        <NameField initial="" hint={t('pro.name.needed')} onSaved={onNamed} />
      )}
      {needed && (
        <BossNameField
          initial={godName}
          hint={t('pro.boss.needed')}
          onSaved={() => setNeeded(false)}
        />
      )}
    </div>
  );
}

/**
 * ONE ROW, ONE SENTENCE AT MOST (0.4.11).
 *
 * The row used to say both directions in words, each with its own reason,
 * which is four facts per person and a roster that read as a wall. When the
 * lane is fully open the row now says nothing about it, because an open lane
 * needs no caption. When something is closed it says the single tightest
 * fact, one sentence from `laneSummary`, which prefers naming YOUR side
 * because your side is the one you can fix. The drawer computes the same
 * sentence from the same helper, so the two cannot disagree.
 *
 * `mine` is the EFFECTIVE policy, status already applied, because the
 * effective one is what decides.
 */
function MateRow(
  { mate, mine, theirs, onOpen, onMessage }:
  {
    mate: Teammate;
    mine: TeamPolicy;
    theirs: TeamPolicy;
    onOpen: () => void;
    onMessage: () => void;
  }
) {
  const { t } = useTranslation();
  const changed = !!mate.previousFingerprint;
  const lane = laneSummary(mine, theirs);
  return (
    <div
      role="button" tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid var(--cth-ink-300)', borderRadius: 10, background: 'var(--cth-cream-100)', cursor: 'pointer' }}
    >
      <GlyphAvatar name={mate.name} presence={mate.presence} size={32} />
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mate.name}</span>
          {/* 0.4.9: the name THEIR orchestrator goes by, which is also the word
              an agent here can address it with. No nickname, no chip. */}
          {mate.bossName && <Chip tone="info" title={t('team.bossOf', { name: mate.name })}>{mate.bossName}</Chip>}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mate.machine} · {t(`team.presence.${mate.presence}`)}</span>
        {/* 0.5.2: what their agents have called themselves in messages that
            reached this machine. Nothing until something has arrived. */}
        {mate.agents && mate.agents.length > 0 && (
          <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('team.agentsSeen', { names: mate.agents.join(', ') })}
          </span>
        )}
        {lane && (
          <span style={{ fontSize: 11.5, lineHeight: '16px', color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t(`team.lane.${lane}`)}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {/* THEIR status, which is theirs to change and ours only to report. */}
        <PolicyChip policy={theirs} title={t('team.detail.theyAllow')} />
        {changed ? <Chip tone="bad">{t('team.org.keyChanged')}</Chip> : mate.verified ? <Chip tone="ok">{t('team.verified')}</Chip> : <Chip tone="outline">{t('team.unverified')}</Chip>}
      </div>
      <Btn size="sm" onClick={onMessage} title={t('team.detail.messageTheirMichael')} style={{ marginInlineStart: 4 }} type="button">
        <ProIcon name="inbox" size={13} />{t('pro.team.message')}
      </Btn>
    </div>
  );
}

function ConsoleLink({ label, onClick }: { label: string; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick} title={t('pro.team.opensConsole')} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, border: '1px solid var(--cth-ink-300)',
      background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)', cursor: 'pointer', font: 'inherit', fontSize: 12.5, textAlign: 'start'
    }}>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('pro.team.inConsole')}</span>
      <ProIcon name="external" size={12} style={{ color: 'var(--cth-ink-500)' }} />
    </button>
  );
}

/** The teammate drawer is the seam's component (Creed's, untouched); PRO
 *  adds Esc around it. `display: contents` keeps the wrapper out of layout
 *  while still telling the hook which fields are inside the drawer. */
function EscapeCloses({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeToClose(onClose, ref);
  return <div ref={ref} style={{ display: 'contents' }}>{children}</div>;
}

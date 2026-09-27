/**
 * THE TEAM WINDOW (v0.4.9 phase 8; plan Part 7, Option B).
 *
 * Founder's order: in Classic, one dedicated place to see your teammates,
 * message them, and read what they sent and what came back; every other
 * teams and organisation trace leaves Classic. This is that place. It is a
 * NEW FRONT DOOR ON EXISTING PLUMBING: the roster is `useRoster` (the same
 * `teams:roster` PRO's Team screen reads), the conversation is
 * CrossNodeThread (main's thread store and its real send), and nothing
 * here talks to the relay on its own.
 *
 * TWO PANES. Left, the directory: the sprite, a presence dot, the name and
 * machine, the Verified chip where the pin says so, and how many messages
 * they sent since you last read them. Right, the selected person's thread,
 * newest at the bottom, with the composer under it. Solo, the offer to
 * start a team (D15) is the honest content, not an empty directory.
 *
 * DESIGNED FOR ANY DOOR. The titlebar button opens it today and the chord
 * toggles it; 0.5.0's Reception desk opens the same component from the
 * floor through teamWindowState.ts, which is why the open flag is a store
 * rather than a prop of App.
 *
 * ESC CLOSES IT, with PRO's rule (proKeys.isEditable): a field inside
 * keeps the first Esc, so a half typed message is not thrown away by the
 * key that was meant to leave the field. Capture phase, so the fullscreen
 * terminal under the window never sees the key.
 *
 * WHAT IS NOT HERE, on purpose: seats, entitlement, the org key, the
 * per-person permission cards. Members are not shown seats or billing
 * (permissions.ts), and the rest is PRO's Team screen and the Command
 * Center's Network card. The window is people and their messages.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelPanel } from '../PixelPanel';
import { PixelButton } from '../PixelButton';
import { PixelBadge } from '../PixelBadge';
import { SpritePortrait } from '../SpritePortrait';
import { isEditable } from '../pro/proKeys';
import { CrossNodeThread } from './CrossNodeThread';
import { UpgradeToTeams } from './UpgradeToTeams';
import { ConnectionChip, SteppedDots } from './primitives';
import { useRoster } from './useRoster';
import { useConnection } from './teamsConnection';
import { isInOrg, useMembership, useTeamsMode } from './teamsMode';
import { openThread, useOpenThreadMate } from './teamsState';
import { characterForTeammate } from './teamAvatars';
import { teamWindowHint } from './teamWindowKeys';
import { toggleTeamWindow, useTeamWindowOpen } from './teamWindowState';
import { useUnreadTeamMessages } from './useUnreadTeamMessages';
import type { Teammate } from './types';

export interface TeamWindowProps {
  onClose: () => void;
}

function hint(): string {
  return teamWindowHint(typeof window === 'undefined' ? undefined : window.cth?.platform);
}

export function TeamWindow({ onClose }: TeamWindowProps) {
  const { t, i18n } = useTranslation();
  const mode = useTeamsMode();
  const roster = useRoster();
  const connection = useConnection();
  const membership = useMembership();
  const frameRef = useRef<HTMLDivElement | null>(null);

  const teammates = roster.teammates;
  const unread = useUnreadTeamMessages(teammates);

  // The person a door named (openTeamWindow(mate)), or the one whose thread
  // was open last in this session; else whoever has unread mail, else the
  // first row. Selection is re-checked against the roster so a stale door
  // argument never selects someone who left the team.
  const doorMate = useOpenThreadMate();
  const [selectedId, setSelectedId] = useState<string | null>(() => doorMate?.id ?? null);
  useEffect(() => {
    if (teammates.length === 0) return;
    if (selectedId && teammates.some((m) => m.id === selectedId)) return;
    const withMail = teammates.find((m) => (unread.byMember[m.id] ?? 0) > 0);
    setSelectedId((withMail ?? teammates[0]).id);
  }, [teammates, selectedId, unread.byMember]);
  const selected = teammates.find((m) => m.id === selectedId) ?? null;

  // While their thread is on screen, everything they sent is read, including
  // what arrives now. The count is the dependency, so a new arrival re-marks.
  const selectedUnread = selected ? unread.byMember[selected.id] ?? 0 : 0;
  useEffect(() => {
    if (selected) unread.markSeen(selected.id);
  }, [selected, selectedUnread, unread.markSeen]);

  // Esc, in the capture phase, with the editable rule from PRO's sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const active = document.activeElement;
      e.stopPropagation();
      if (isEditable(active) && frameRef.current?.contains(active)) {
        (active as HTMLElement).blur();
        return;
      }
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const select = (mate: Teammate) => {
    setSelectedId(mate.id);
    openThread(mate);
  };

  const inOrg = isInOrg(mode);
  const orgName = roster.org?.name ?? membership?.orgName ?? '';
  const stale = inOrg && connection.state !== 'connected';
  const since = mode === 'degraded' && membership?.lastVerifiedAt
    ? new Date(membership.lastVerifiedAt).toLocaleString(i18n.language, { weekday: 'long', hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26, 19, 32, 0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300
      }}
    >
      <div
        ref={frameRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('teamWindow.title')}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 960, maxWidth: '92vw', height: 720, maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          filter: 'drop-shadow(4px 4px 0 rgba(26, 19, 32, 0.25))'
        }}
      >
        <PixelPanel
          variant="dialog"
          title={t('teamWindow.title')}
          noPadding
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}
        >
          <header style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
            boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
              <span style={{
                fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--cth-ink-900)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>{orgName}</span>
              {/* The roster's refusal, if any, in its own words: a blank
                  directory with no reason is the thing this line prevents. */}
              {roster.error && (
                <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-status-blocked)' }}>
                  {roster.error.detail ?? roster.error.code}
                </span>
              )}
            </div>
            {inOrg && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {since && (
                  <span style={{ fontSize: 11, color: 'var(--cth-status-waiting)', whiteSpace: 'nowrap' }}>
                    {t('team.degraded.banner', { since })}
                  </span>
                )}
                <ConnectionChip state={connection.state} reason={connection.reason} />
              </span>
            )}
            <span style={{
              fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap'
            }}>{hint()} · {t('teamWindow.escHint')}</span>
            <PixelButton variant="ghost" size="sm" onClick={onClose}>{t('common.close')}</PixelButton>
          </header>

          {stale && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              background: 'var(--cth-status-waiting-tint)', color: 'var(--cth-status-waiting)',
              fontSize: 12, boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)'
            }}>
              {t('team.staleBar')}
            </div>
          )}

          {!inOrg ? (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
              <UpgradeToTeams
                onSetUpTeam={() => { void window.open?.('https://harnessmd.com/checkout', '_blank'); }}
                onJoinExisting={() => { /* D2 lives in first run; nothing to open yet (same as the seam). */ }}
              />
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <Directory
                teammates={teammates}
                loading={roster.loading}
                selectedId={selectedId}
                counts={unread.byMember}
                stale={stale}
                onSelect={select}
              />
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, padding: 12, display: 'flex' }}>
                {selected ? (
                  <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                    {/* The thread is main's store; the component reads it
                        itself and sends through the bridge. Keyed so a
                        switch of person never keeps the other one's draft. */}
                    <CrossNodeThread key={selected.id} mate={selected} />
                  </div>
                ) : (
                  <div style={{
                    flex: 1, display: 'grid', placeItems: 'center',
                    fontSize: 13, color: 'var(--cth-ink-500)', textAlign: 'center', padding: 24
                  }}>
                    {teammates.length === 0 && !roster.loading ? t('team.empty.body') : t('team.thread.pickSomeone')}
                  </div>
                )}
              </div>
            </div>
          )}
        </PixelPanel>
      </div>
    </div>
  );
}

function Directory({ teammates, loading, selectedId, counts, stale, onSelect }: {
  teammates: Teammate[];
  loading: boolean;
  selectedId: string | null;
  counts: Record<string, number>;
  stale: boolean;
  onSelect: (mate: Teammate) => void;
}) {
  const { t } = useTranslation();
  return (
    <div style={{
      width: 300, flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column',
      boxShadow: 'inset -1px 0 0 var(--cth-ink-300)'
    }}>
      <div style={{
        padding: '10px 16px 6px',
        fontFamily: 'var(--cth-font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cth-ink-500)'
      }}>{t('teamWindow.directory')}</div>
      {/* Disconnected dims the list rather than hiding it: the roster is still
          true, it is only the presence dots that have gone stale. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', opacity: stale ? 0.5 : 1 }}>
        {loading && teammates.length === 0 ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}><SteppedDots /></div>
        ) : teammates.length === 0 ? (
          <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{t('team.empty.title')}</span>
            <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)' }}>{t('team.empty.body')}</p>
          </div>
        ) : (
          teammates.map((m) => (
            <DirectoryRow
              key={m.id}
              mate={m}
              selected={m.id === selectedId}
              unread={counts[m.id] ?? 0}
              onOpen={() => onSelect(m)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DirectoryRow({ mate, selected, unread, onOpen }: {
  mate: Teammate; selected: boolean; unread: number; onOpen: () => void;
}) {
  const { t } = useTranslation();
  // Blocked BY them: the row dims, because nothing you send will land.
  const blocked = mate.theyAllow === 'strict';
  const surface = selected ? 'var(--cth-cream-200)' : 'var(--cth-cream-50)';
  const online = mate.presence === 'online';
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', margin: '0 8px 4px', cursor: 'pointer',
        background: surface,
        // One 1px ring when selected, a hairline rule otherwise. Never a
        // thicker edge on one side.
        boxShadow: selected ? 'inset 0 0 0 1px var(--cth-ink-900)' : 'inset 0 0 0 1px var(--cth-ink-100)',
        opacity: blocked ? 0.55 : 1
      }}>
      <span style={{ position: 'relative', flex: 'none', display: 'inline-block', lineHeight: 0 }}>
        <SpritePortrait character={characterForTeammate(mate.name, mate.id)} scale={1.5} />
        <span
          title={t(`team.presence.${mate.presence}`)}
          style={{
            position: 'absolute', right: -3, bottom: -1,
            width: 8, height: 8, borderRadius: 'var(--cth-radius-pill, 999px)',
            background: online ? 'var(--cth-status-success)' : 'var(--cth-status-idle)',
            boxShadow: `0 0 0 1.5px ${surface}`
          }} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 13, fontWeight: 500, color: 'var(--cth-ink-900)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{mate.name}</span>
        <span style={{
          fontSize: 11, color: 'var(--cth-ink-500)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{mate.machine}</span>
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flex: 'none' }}>
        {/* Only where the pin says so: an Unverified chip on every new
            teammate would be noise, and the thread header already says the
            channel is encrypted. */}
        {mate.verified && <PixelBadge status="success" label={t('team.verified')} />}
        {unread > 0 && <CountPill count={unread} label={t('teamWindow.newCount', { count: unread })} />}
      </span>
    </div>
  );
}

function CountPill({ count, label }: { count: number; label: string }) {
  return (
    <span
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 18, height: 18, padding: '0 5px',
        borderRadius: 'var(--cth-radius-pill, 999px)',
        background: 'var(--cth-ink-900)', color: 'var(--cth-cream-100)',
        fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '18px'
      }}>{count > 99 ? '99+' : count}</span>
  );
}

/**
 * The titlebar door (Classic only; App draws it in the chrome slot). Same
 * box as the theme and settings buttons beside it, plus the unread count
 * when there is one. The tooltip names the chord, so the hint is never a
 * promise nobody wired: the chord and the hint read one table
 * (teamWindowKeys.ts).
 */
export function TeamWindowButton() {
  const { t } = useTranslation();
  const roster = useRoster();
  const unread = useUnreadTeamMessages(roster.teammates);
  const open = useTeamWindowOpen();
  const tip = t('teamWindow.tip', { hint: hint() });
  const label = unread.total > 0
    ? `${tip}. ${t('teamWindow.unreadAria', { count: unread.total })}`
    : tip;
  return (
    <button
      className="cth-titlebar-nodrag cth-tip"
      onClick={toggleTeamWindow}
      data-tip={tip}
      aria-label={label}
      aria-pressed={open}
      aria-haspopup="dialog"
      style={{
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, padding: 0,
        background: open ? 'var(--cth-cream-200)' : 'var(--cth-paper-100)',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
        border: 'none', borderRadius: 'var(--cth-radius-md, 2px)', cursor: 'pointer',
        color: 'var(--cth-ink-900)'
      }}
    >
      <TeamGlyph />
      {unread.total > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute', top: -6, right: -6,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 'var(--cth-radius-pill, 999px)',
            background: 'var(--cth-ink-900)', color: 'var(--cth-cream-100)',
            boxShadow: '0 0 0 1px var(--cth-cream-100)',
            fontFamily: 'var(--cth-font-display)', fontSize: 7, lineHeight: '16px'
          }}>{unread.total > 99 ? '99+' : unread.total}</span>
      )}
    </button>
  );
}

/** Two people, drawn the way the gear beside it is: a 24 box, stroke only,
 *  rendered at 16, so the titlebar's row of controls reads as one set. */
function TeamGlyph() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M17.5 13.6a6.5 6.5 0 0 1 4 6.4" />
    </svg>
  );
}

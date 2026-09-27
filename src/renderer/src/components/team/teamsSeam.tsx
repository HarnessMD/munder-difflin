/**
 * THE TEAMS SURFACE, WIRED INTO THE APP. This file is the whole of the fork's
 * divergence from upstream at the app level: App.tsx gains one import and four
 * usages, and everything about what Teams is lives here.
 *
 * WHAT REPLACED WHAT, because a container was deleted to get here.
 *
 * `TeamPane` existed because the Teams screens had no home: the agent sidebar is
 * per agent, so a company-wide surface had nowhere to go, and it took the floor
 * region and carried its OWN two-tab bar (roster / requests) to switch between
 * D7 and D10. That bar was correct while it was the only navigation there was.
 * The moment `team` and `requests` became rail rows it turned into a SECOND
 * navigation to the same two destinations, so it is gone and the pane with it —
 * the rail rows are the navigation now, and there is one of them.
 *
 * WHAT THIS SUPPLIES, and why each part is where it is:
 *
 *   companyRows / extraPanes  destinations. Keyed by the SAME id, which is what
 *                             makes the pairing checkable rather than a habit.
 *   TeamsChrome               D12, the connection chip. Persistent, so chrome.
 *   TeamsOverlay              D10's toast and D13's key warning. Both are facts
 *                             about this machine, not about the open pane, so
 *                             neither may be mounted inside one.
 *
 * THE THREAD (D11) HAS NO RAIL ROW ON PURPOSE. A conversation is not a
 * destination — there is no row called "the thread with Pam" — so it is a pane
 * reached from the teammate drawer and nowhere else.
 *
 * WHO DECIDES "IN AN ORG": the gate in main, through `useTeamsMode` (plan
 * section 5). The localStorage fixture that used to decide it is gone, and so
 * is the literal `connected` the chip used to show: the chip reads the
 * connection store, which in Phase 0 the roster read writes (see
 * teamsConnection.ts) and in Phase 1 the socket will.
 *
 * FIXTURES STAY IN THE HARNESS. Once the gate was real, every fixture this
 * file rendered "inside an org" would have rendered to a real member: a queue
 * of requests nobody sent, a thread nobody wrote, a key warning about a
 * teammate who does not exist. So the requests row counts zero, the queue is
 * empty, the thread starts empty and the toast and the modal render nothing
 * in the app until Phase 1 and 2 give them real triggers. Without a bridge
 * (the harness) they render the fixture, which is what the boards review.
 *
 * PROFESSIONAL ONLY, and stated rather than discovered: rows and panes exist in
 * the skin that has a rail. Office keeps its floor untouched, which is also the
 * fork's whole value — the less it diverges from upstream, the longer it merges.
 * The consequence is real and is not hidden: in an org, an Office user sees the
 * connection chip and has no way to open the roster. Adding an Office-shaped
 * route would be a second navigation to the same two screens, which is exactly
 * what was just deleted.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import type { RailRowSpec } from '../professional/railState';
import { usePaneNav } from '../professional/paneNav';
import { ApprovalQueue, ApprovalToast } from './ApprovalQueue';
import { CrossNodeThread } from './CrossNodeThread';
import { FingerprintWarning } from './FingerprintWarning';
import { TeamTab } from './TeamTab';
import { UpgradeToTeams } from './UpgradeToTeams';
import { useRoster } from './useRoster';
import { useRequests } from './teamsThreads';
import type { IncomingRequest, Teammate } from './types';
import { ConnectionChip } from './primitives';
import { RevokedTakeover } from './RevokedTakeover';
import { MOCK_REQUESTS, MOCK_TEAMMATES } from './mockTeam';
import { openThread, useOpenThreadMate } from './teamsState';
import { isInOrg, useLockInfo, useLockRemedies, useMembership, useOrg, useTeamsMode } from './teamsMode';
import { useAppSkin } from '@/design/skin';
import { ProUpgradeToTeams } from '../pro/onboarding/ProUpgradeToTeams';
import { OrgPanel } from './OrgPanel';
import { useConnection } from './teamsConnection';
import { LOCK_APP_ON_REVOKE } from '@shared/teams';
import { standingOf } from '@shared/permissions';

/** Pane ids. Exported because the rows, the panes and the routes all key off
 *  them and three copies of a string literal is how a seam silently unpairs. */
export const TEAM_PANE = 'team';
export const REQUESTS_PANE = 'requests';
export const THREAD_PANE = 'thread';
/** S1. No rail row: reached from the Team surface's org name. */
export const ORG_PANE = 'org';

/** No bridge means the preview harness, the one place the fixtures may show. */
export function inHarness(): boolean {
  return typeof window === 'undefined' || !window.cth?.teamsRoster;
}

/**
 * D10's rows, from main's request queue (the bridge decrypts, derives the
 * preview from the subject and the detail from the body; the relay never had
 * either). The harness shows the fixture so D10 stays reviewable. Exported
 * (0.4.9 phase 6) so PRO's toast reads the same queue as the Classic one.
 */
export function useRequestRows(): IncomingRequest[] {
  const { requests } = useRequests();
  if (inHarness()) return MOCK_REQUESTS;
  return (requests ?? []).map((r) => ({
    id: r.id, fromName: r.fromName, fromMachine: r.fromMachine,
    preview: r.subject || r.body.split('\n')[0], detail: r.body,
    at: new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    expired: r.expired,
  }));
}

export function decide(id: string, decision: 'allow-once' | 'always' | 'decline'): void {
  const api = typeof window === 'undefined' ? undefined : window.cth;
  void api?.teamsRequestDecide?.(id, decision);
}

/**
 * The COMPANY rows this fork contributes.
 *
 * `requests` appears only inside an org. Solo, there is no one to send you
 * anything, and a permanently empty queue is a row people learn to skip.
 * `team` appears either way because solo is what D15 is FOR — the row is how
 * someone on Pro finds out Teams exists.
 */
export function useTeamsCompanyRows(inOrg: boolean): RailRowSpec[] {
  const { t } = useTranslation();
  const requestRows = useRequestRows();
  const rows: RailRowSpec[] = [
    { id: TEAM_PANE, label: t('rail.team'), glyph: 'g-community' }
  ];
  if (inOrg) {
    rows.push({
      id: REQUESTS_PANE, label: t('rail.requests'), glyph: 'n-alert',
      count: requestRows.filter((r) => !r.expired).length
    });
  }
  return rows;
}

/** The panes those rows open, plus the thread, which no row opens. */
export function teamsPanes(inOrg: boolean): Record<string, ReactNode> {
  return {
    [TEAM_PANE]: <TeamRosterPane inOrg={inOrg} />,
    [REQUESTS_PANE]: <RequestsPane />,
    [THREAD_PANE]: <ThreadPane />,
    [ORG_PANE]: <OrgPane />
  };
}

/* The takeover's remedies live with the gate (teamsMode.ts, `useLockRemedies`)
   since 0.4.9 phase 1, so the PRO takeover and this one call the same doors. */

function TeamRosterPane({ inOrg }: { inOrg: boolean }) {
  const nav = usePaneNav();
  const mode = useTeamsMode();
  const connection = useConnection();
  const lock = useLockInfo();
  const remedies = useLockRemedies();
  const skin = useAppSkin();
  if (mode === 'locked' && lock) {
    // Pam's panel takeover (3.1 boolean false). Under the lock, App.tsx has
    // already taken the window and this pane never mounts.
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <TeamTab connection={connection.state} lock={lock} {...remedies} />
      </div>
    );
  }
  if (!inOrg) {
    // D15. No org on this machine means the member path never ran, so the
    // honest content of this row is the offer, not an empty roster.
    const setUp = () => { void window.open?.('https://harnessmd.com/checkout', '_blank'); };
    return (
      <div style={{ position: 'absolute', inset: 0, padding: 16, overflowY: 'auto' }}>
        {/* PRO draws the kit card (0.4.9 phase 1); Classic keeps its own. */}
        {skin === 'professional' ? (
          <ProUpgradeToTeams onSetUpTeam={setUp} />
        ) : (
          <UpgradeToTeams
            onSetUpTeam={setUp}
            onJoinExisting={() => { /* D2 lives in first run; nothing to open yet. */ }}
          />
        )}
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <TeamTab
        connection={connection.state}
        onOpenThread={(mate) => { openThread(mate); nav.go(THREAD_PANE); }}
        onOpenOrg={() => nav.go(ORG_PANE)}
      />
    </div>
  );
}

/**
 * S1, "This org". The org channel (plan 4.4) is main's; the panel reads its
 * view and offers Verify, the one path to a verified org key. In the harness
 * there is no org; the boards render the panel with their own fixture.
 */
function OrgPane() {
  const nav = usePaneNav();
  const mode = useTeamsMode();
  const org = useOrg();
  const roster = useRoster();
  const api = typeof window === 'undefined' ? undefined : window.cth;
  if (!org) return null;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <OrgPanel
        org={org}
        standing={standingOf(mode, org.you?.isAdmin === true)}
        devices={roster.selfDevices}
        onVerify={() => { void api?.teamsOrgVerify?.(); }}
        onBack={() => nav.go(TEAM_PANE)}
      />
    </div>
  );
}

function RequestsPane() {
  const rows = useRequestRows();
  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 12 }}>
      <ApprovalQueue requests={rows} onDecide={inHarness() ? undefined : decide} />
    </div>
  );
}

function ThreadPane() {
  const { t } = useTranslation();
  const nav = usePaneNav();
  const mate = useOpenThreadMate();
  // Reachable only from the drawer, so an empty thread pane means someone
  // deep-linked or reloaded. Say so and give them the way back rather than
  // rendering a conversation with nobody in it.
  if (!mate) {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24
      }}>
        <button
          onClick={() => nav.go(TEAM_PANE)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--cth-font-ui)', fontSize: 13, color: 'var(--cth-ink-500)'
          }}
        >
          {t('team.thread.pickSomeone')}
        </button>
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* The thread is main's store (teamsThreads.ts); the component reads it
          itself and falls back to the fixture only where no bridge exists. */}
      <CrossNodeThread mate={mate} />
    </div>
  );
}

/**
 * D12 in the chrome slot.
 *
 * Hidden entirely outside an org: telling someone with no team that they are
 * `Connected` claims a team that does not exist. Inside one it reads the
 * connection store, whose writer is named in teamsConnection.ts.
 *
 * IT REPORTS, IT DOES NOT NAVIGATE, and it used to do both. Opening the roster
 * was its job while the roster had no other way in; the `Team` rail row is that
 * way in now, and leaving the chip clickable would make it a second route to a
 * destination that already has one — the same redundancy that just cost the
 * pane its tab bar. One navigation, and the chip goes back to being a status.
 */
export function TeamsChrome() {
  const { t, i18n } = useTranslation();
  const mode = useTeamsMode();
  const connection = useConnection();
  const membership = useMembership();
  const lock = useLockInfo();
  // `locked` under Pam's panel shows the chip too: in Office there is no rail,
  // so the chip is the entire story. Under the 3.1 lock this never mounts.
  if (!isInOrg(mode) && mode !== 'locked') return null;
  /* `degraded` (plan 2.3): the chip already says offline or reconnecting; the
     banner adds SINCE WHEN, which is the fact that makes 24 hours different
     from 24 seconds. Server time of the last proof, in the person's locale. */
  const since = mode === 'degraded' && membership?.lastVerifiedAt
    ? new Date(membership.lastVerifiedAt).toLocaleString(i18n.language, { weekday: 'long', hour: 'numeric', minute: '2-digit' })
    : null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <ConnectionChip state={connection.state} reason={lock?.reason ?? connection.reason ?? undefined} />
      {since && (
        <span style={{ fontSize: 11, color: 'var(--cth-status-waiting)', whiteSpace: 'nowrap' }}>
          {t('team.degraded.banner', { since })}
        </span>
      )}
    </span>
  );
}

/**
 * Plan 3.1 with `LOCK_APP_ON_REVOKE` true: the whole window, before anything
 * else renders, and local work is not offered. App.tsx returns this in place
 * of the app when the gate says `locked`. Null while the reason is still
 * being read, which is one IPC round trip.
 */
export function TeamsLock() {
  const lock = useLockInfo();
  const remedies = useLockRemedies();
  if (!LOCK_APP_ON_REVOKE || !lock) return null;
  return <RevokedTakeover info={lock} full onReconnect={remedies.onReconnect} onEnterNewCode={remedies.onEnterNewCode} />;
}

/**
 * D13 — the modal half of what Teams puts in the overlay slot.
 *
 * Modal because it asks a question with a security answer and there is no
 * correct way to ignore it. The slot guarantees it suppresses every toast while
 * it is up, which is the whole reason that rule lives there rather than here.
 *
 * ITS REAL TRIGGER IS A PIN THE ROSTER JOIN NOTICED CHANGING: `teamPins` in
 * main pins a fingerprint on first sight and reports `previousFingerprint`
 * when the relay shows a different one for the same device. Accept marks the
 * new key verified through the one path to `verified: true`; Block sets your
 * override for that person to `strict` (D9), which is the real consequence
 * the copy promises, and is reversible from D9. In the harness the fixture's
 * rekeyed teammate renders instead, so D13 stays reviewable.
 */
export function TeamsModal() {
  return <RekeyHost render={(p) => <FingerprintWarning {...p} />} />;
}

/** What a key change dialog is told: the teammate, and the two answers. */
export interface RekeyProps { mate: Teammate; onAccept: () => void; onBlock: () => void }

/**
 * The trigger and the two consequences, without the pixels: Classic renders
 * the FingerprintWarning through it and PRO its kit sheet (0.4.9 phase 6),
 * so the one question has one watcher whichever skin asks it.
 */
export function RekeyHost({ render }: { render: (p: RekeyProps) => ReactNode }) {
  const mode = useTeamsMode();
  if (inHarness()) return <HarnessRekey render={render} />;
  if (!isInOrg(mode)) return null;
  return <RekeyWatch render={render} />;
}

function HarnessRekey({ render }: { render: (p: RekeyProps) => ReactNode }) {
  const [rekeyed, setRekeyed] = useState(() => MOCK_TEAMMATES.find((m) => m.previousFingerprint) ?? null);
  if (!rekeyed) return null;
  return <>{render({ mate: rekeyed, onAccept: () => setRekeyed(null), onBlock: () => setRekeyed(null) })}</>;
}

function RekeyWatch({ render }: { render: (p: RekeyProps) => ReactNode }) {
  const roster = useRoster();
  // Answered this session, by id: the same person rekeying again is a new
  // event and the roster will report it as one after the next reload.
  const [answered, setAnswered] = useState<string | null>(null);
  const rekeyed = roster.teammates.find((m) => m.previousFingerprint && m.deviceId && m.id !== answered) ?? null;
  if (!rekeyed) return null;
  const api = typeof window === 'undefined' ? undefined : window.cth;
  return (
    <>
      {render({
        mate: rekeyed,
        onAccept: () => {
          setAnswered(rekeyed.id);
          void api?.teamsVerifyDevice?.(rekeyed.deviceId!, rekeyed.fingerprint).then(() => roster.reload());
        },
        onBlock: () => {
          setAnswered(rekeyed.id);
          void api?.teamsSetYouAllow?.(rekeyed.id, 'strict').then(() => roster.reload());
        }
      })}
    </>
  );
}

/**
 * D10 — the transient half.
 *
 * Transient because it has a queue behind it: dismissing it loses nothing, the
 * request is still on the requests row, which is why that row carries a count.
 *
 * It self-gates and renders null when there is nothing waiting, the same shape
 * as every other toast the slot stacks. It does NOT position itself — three
 * toasts anchoring to one corner independently is how they covered each other.
 * The queue is Phase 2's; in the app there is nothing waiting yet.
 */
export function TeamsToast() {
  const rows = useRequestRows();
  // Dismissed here means "not now": the row stays on the requests pane, which
  // is why that row carries a count. Decisions go to main.
  //
  // REMEMBERED ACROSS RESTARTS (0.5.2, card v052-teammate-message-notifications).
  // This used to be component state alone, so every relaunch, and every
  // remount of the shell, raised the same toast for the same request again;
  // with the log showing dozens of launches a day that read as new mail that
  // never came. The record lives under the `cth.` prefix so Settings' "reset
  // and start over" forgets it with everything else, and it is bounded.
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissedToasts());
  const toast = rows.find((r) => !r.expired && !dismissed.has(r.id)) ?? null;
  if (!toast) return null;
  const hide = () => setDismissed((d) => { const next = new Set(d).add(toast.id); writeDismissedToasts(next); return next; });
  const harness = inHarness();
  return (
    <ApprovalToast
      request={toast}
      onAllowOnce={() => { hide(); if (!harness) decide(toast.id, 'allow-once'); }}
      onDismiss={hide}
      onAlwaysAllow={() => { hide(); if (!harness) decide(toast.id, 'always'); }}
    />
  );
}

/* ---- the toast's memory of what was dismissed --------------------------- */

const DISMISSED_KEY = 'cth.teamsToastDismissed';
/** Requests expire in a day and the relay forgets them a week later; more
 *  than this many dismissals on one machine is a queue nobody is reading. */
const DISMISSED_KEEP = 40;

function readDismissedToasts(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeDismissedToasts(ids: Set<string>): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids].slice(-DISMISSED_KEEP)));
  } catch { /* this window still remembers; a relaunch may not */ }
}

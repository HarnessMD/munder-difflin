/**
 * THE GATE, RENDERER SIDE. Main answers `mode()` (plan section 5); this store
 * reads it once and subscribes to changes. Every Teams surface in the app
 * reads `useTeamsMode()` and nothing else decides whether this machine is in
 * an org. `orgFixture.ts` is gone: the answer comes from membership.json now.
 *
 * SAME SUBSCRIBABLE SHAPE as teamsState.ts and railState.ts, and like the
 * first of those it has no localStorage: membership is a fact main owns, and a
 * cached copy in the renderer would be a second source of truth for the thing
 * the gate exists to have exactly one of.
 *
 * WITHOUT A BRIDGE (the preview harness, a test) the answer is `solo` and
 * stays there. The harness mounts the Teams components directly and never
 * needs the app to think it is in an org.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { LockInfo, MembershipView, OrgView, TeamsMode } from '@shared/teams';
import { standingOf, type OrgStanding } from '@shared/permissions';

let current: TeamsMode = 'solo';
let started = false;
const subscribers = new Set<() => void>();

function set(mode: TeamsMode): void {
  if (mode === current) return;
  current = mode;
  subscribers.forEach((fn) => fn());
}

function start(): void {
  if (started) return;
  started = true;
  const api = typeof window === 'undefined' ? undefined : window.cth;
  if (!api?.teamsMode) return;
  void api.teamsMode().then(set, () => { /* main will push; stay solo until it does */ });
  api.onTeamsMode(set);
}

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  return () => { subscribers.delete(onChange); };
}

export function useTeamsMode(): TeamsMode {
  start();
  return useSyncExternalStore(subscribe, () => current);
}

/** `live` and `degraded` both mean the Teams surface renders. `locked` is the
 *  takeover and `enrolling` is first run; neither shows a roster. */
export function isInOrg(mode: TeamsMode): boolean {
  return mode === 'live' || mode === 'degraded';
}

/**
 * Why the gate says `locked`, for the takeover's copy. Re-read on every mode
 * change and whenever the connection changes, because a `stopped` reason can
 * arrive while the mode is already `locked` (lease first, then the relay's
 * word). Null whenever the mode is not `locked`, and null in the harness.
 */
export function useLockInfo(): LockInfo | null {
  const mode = useTeamsMode();
  const [info, setInfo] = useState<LockInfo | null>(null);
  useEffect(() => {
    const api = typeof window === 'undefined' ? undefined : window.cth;
    if (!api?.teamsLockInfo || mode !== 'locked') { setInfo(null); return; }
    let live = true;
    const read = () => { void api.teamsLockInfo().then((v) => { if (live) setInfo(v); }, () => { /* keep */ }); };
    read();
    const off = api.onTeamsConnection ? api.onTeamsConnection(read) : () => {};
    return () => { live = false; off(); };
  }, [mode]);
  return info;
}

/**
 * What the renderer may know about the membership: org name and ids, never key
 * material. Re-read whenever the mode changes, because that is the only time
 * the file behind it changes. Null while solo, and null in the harness.
 */
export function useMembership(): MembershipView | null {
  const mode = useTeamsMode();
  const [m, setM] = useState<MembershipView | null>(null);
  useEffect(() => {
    const api = typeof window === 'undefined' ? undefined : window.cth;
    if (!api?.teamsMembership || mode === 'solo') { setM(null); return; }
    let live = true;
    void api.teamsMembership().then((v) => { if (live) setM(v); }, () => { if (live) setM(null); });
    return () => { live = false; };
  }, [mode]);
  return m;
}

/**
 * S1's input: what the org has told this machine (plan 4.4). Main pushes on
 * every `/me` answer and on Verify. Null in the harness and while solo.
 */
export function useOrg(): OrgView | null {
  const mode = useTeamsMode();
  const [org, setOrg] = useState<OrgView | null>(null);
  useEffect(() => {
    const api = typeof window === 'undefined' ? undefined : window.cth;
    if (!api?.teamsOrg || mode === 'solo' || mode === 'enrolling') { setOrg(null); return; }
    let live = true;
    void api.teamsOrg().then((v) => { if (live) setOrg(v); }, () => { /* keep */ });
    const off = api.onTeamsOrg?.((v) => { if (live) setOrg(v); }) ?? (() => {});
    return () => { live = false; off(); };
  }, [mode]);
  return org;
}

/** The takeover's three remedies, wired to main. Reconnect is the only one
 *  that asserts nothing; forget is offered only where the key is truly gone.
 *  Shared by the Classic takeover (teamsSeam) and the PRO one
 *  (pro/onboarding/ProTakeover), so the two cannot drift on what a button does. */
export function useLockRemedies() {
  const api = typeof window === 'undefined' ? undefined : window.cth;
  return {
    onReconnect: () => { void api?.teamsReconnect?.(); },
    // `removed`: the key can never re-enrol, so forgetting it loses nothing
    // and the gate reads solo again, where D1 offers a new code.
    onEnterNewCode: () => { void api?.teamsForgetIdentity?.(); },
    onContinueSolo: () => { void api?.teamsForgetIdentity?.(); },
  };
}

/**
 * The one line that turns mode + `/me` into a standing (src/shared/permissions.ts).
 * Every gate in the renderer reads this hook and then `can(standing, perm)`;
 * nothing reads `isAdmin` on its own, so the table in permissions.ts stays the
 * only place a yes or a no comes from.
 */
export function useStanding(): OrgStanding {
  const mode = useTeamsMode();
  const org = useOrg();
  return standingOf(mode, org?.you?.isAdmin === true);
}

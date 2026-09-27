import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_SCHEDULE, effectivePolicy, normalizePolicy, policyOf,
  type StatusSchedule, type TeamPolicy,
} from '@shared/teamPolicy';
import type { NetworkLevel, Teammate } from './types';
import { MOCK_ORG, MOCK_SELF, MOCK_TEAMMATES } from './mockTeam';

/**
 * THE ROSTER, FROM THE RELAY.
 *
 * The same seam the console uses: `{ data, error, loading }`, failures as
 * VALUES, and one place that decides where the data comes from. A screen never
 * learns which side answered.
 *
 * WHY THE FIXTURE PATH SURVIVES HERE AND NOT IN THE CONSOLE. The preview
 * harness mounts these components with no `window.cth` at all — that is the
 * whole reason it can render them without the app running, and it is what makes
 * D7 reviewable. So the absence of the bridge is a legitimate state, and it
 * falls back to the fixture rather than showing an error nobody can act on.
 *
 * That is NOT a silent fallback of the kind ruled out on the console side. It
 * triggers only when the IPC bridge does not exist, which cannot happen in the
 * shipped app: there, a relay failure is a real error and is rendered as one.
 *
 * IT NO LONGER WRITES THE CONNECTION STORE. The socket in main does (Phase 1,
 * teamsConnection.ts). What it does instead is RE-READ ITSELF when main says
 * a presence frame arrived or the socket came back, which is how D8's dots
 * follow the relay without the roster polling.
 */
/** One of your machines, as the relay lists it. Mirrors main's `OwnDevice`. */
export interface OwnDevice {
  deviceId: string;
  name: string;
  presence: 'online' | 'offline';
  lastSeenAt: string | null;
  isThis: boolean;
}

export interface RosterOrg {
  name: string;
  seatsUsed: number;
  seatsPaid: number;
}

export interface RosterState {
  teammates: Teammate[];
  self: Teammate | null;
  /** Name and seats for D7's header. Null until the relay has answered. */
  org: RosterOrg | null;
  /** The org default the admin set, as the relay reports it. */
  defaultPermission: NetworkLevel;
  /** What THIS MACHINE allows a teammate with no override: your own default
   *  when you set one, else the org default. The self row and the Network
   *  section's top card show this and set it; `overridden` is measured
   *  against it. Joined in main from `teamPins`, never on the wire. */
  yourDefault: NetworkLevel;
  /** Every machine enrolled under this person, this one first (plan 4.8, S1). */
  selfDevices: OwnDevice[];
  error: { code: string; detail: string | null } | null;
  loading: boolean;
  /** True when this is fixture data because no bridge exists (harness only). */
  isFixture: boolean;
  reload: () => void;

  /* ---- the 0.4.10 permission model ---------------------------------------
     `Teammate.youAllow` above is the DEPRECATED one word value main's roster
     join still computes (src/main/relay.ts:516). Nothing in PRO reads it: the
     three below are the truth, they come from the pin store rather than the
     relay, and they are what `teamsBridge` enforces. */

  /** YOUR STATUS, the whole machine's answer, schedule already applied. */
  status: TeamPolicy;
  schedule: StatusSchedule;
  /** True while a schedule window is deciding, so the control can say the
   *  schedule is driving rather than pretend the person just chose this. */
  scheduleDriving: boolean;
  /** What you allow a teammate with no override of their own. */
  policyDefault: TeamPolicy;
  /** True when THIS MACHINE has set that default. False means it is the org
   *  default the relay reports, which is what makes "follow the org again" a
   *  control that only appears when there is something to undo. */
  policyDefaultSet: boolean;
  /** Whether this person has an override, as opposed to following the default.
   *  Absent is not `off`; it is "follow the default", and the two need to look
   *  different or a reset control has nothing to say. */
  hasOverride: (memberId: string) => boolean;
  /** What you allow this person, BEFORE your status is applied. This is the
   *  value the per person editor writes. */
  policyFor: (memberId: string) => TeamPolicy;
  /** What is actually in force: your status ANDed with the above. This is the
   *  value a row must show, because it is the one that decides. */
  effectiveFor: (memberId: string) => TeamPolicy;
  /** What THEY allow you, as the relay reports it. */
  theirPolicy: (mate: Teammate) => TeamPolicy;
}

/** What main sends for the policy store. Mirrors `PolicyView` in
 *  src/main/teamsBridge.ts; declared here so the renderer compiles without
 *  reaching into main. */
interface PolicyPayload {
  status: TeamPolicy;
  schedule: StatusSchedule;
  scheduleDriving: boolean;
  policyDefault: TeamPolicy | null;
  overrides: Record<string, TeamPolicy>;
}

interface Bridge {
  teamsRoster?: () => Promise<
    | { ok: true; data: {
        org: { name: string; seatsUsed: number; seatsPaid: number; defaultPermission: NetworkLevel };
        teammates: Teammate[]; self: Teammate | null; selfDevices: OwnDevice[];
        yourDefault?: NetworkLevel;
      } }
    | { ok: false; error: string; detail: string | null }
  >;
  teamsPolicy?: (memberIds: string[]) => Promise<PolicyPayload>;
  onTeamsPolicy?: (cb: () => void) => () => void;
  onTeamsPresence?: (cb: () => void) => () => void;
  onTeamsConnection?: (cb: (v: { state: string }) => void) => () => void;
}

function bridge(): Bridge | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { cth?: Bridge };
  return w.cth?.teamsRoster ? w.cth : null;
}

type RosterCore = Omit<RosterState,
  'reload' | 'status' | 'schedule' | 'scheduleDriving' | 'policyDefault'
  | 'policyDefaultSet' | 'hasOverride' | 'policyFor' | 'effectiveFor' | 'theirPolicy'>;

export function useRoster(): RosterState {
  const [state, setState] = useState<RosterCore>({
    teammates: [], self: null, org: null, defaultPermission: 'communication-only',
    yourDefault: 'communication-only', selfDevices: [],
    error: null, loading: true, isFixture: false,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let live = true;
    const api = bridge();

    if (!api?.teamsRoster) {
      // Harness, or a test. See the header: this is the only case that falls
      // back, and it is the case where an error would be noise.
      setState({
        teammates: MOCK_TEAMMATES, self: MOCK_SELF,
        org: { name: MOCK_ORG.name, seatsUsed: MOCK_ORG.seatsUsed, seatsPaid: MOCK_ORG.seats },
        defaultPermission: MOCK_ORG.defaultLevel, yourDefault: MOCK_ORG.defaultLevel,
        selfDevices: [{ deviceId: 'dev_this', name: MOCK_SELF.machine, presence: 'online', lastSeenAt: null, isThis: true }],
        error: null, loading: false, isFixture: true,
      });
      return;
    }

    setState((s) => ({ ...s, loading: true }));
    api.teamsRoster().then(
      (r) => {
        if (!live) return;
        if (r.ok) {
          setState({
            teammates: r.data.teammates, self: r.data.self,
            org: { name: r.data.org.name, seatsUsed: r.data.org.seatsUsed, seatsPaid: r.data.org.seatsPaid },
            defaultPermission: r.data.org.defaultPermission,
            yourDefault: r.data.yourDefault ?? r.data.org.defaultPermission,
            selfDevices: r.data.selfDevices ?? [],
            error: null, loading: false, isFixture: false,
          });
        } else {
          setState((s) => ({
            ...s, error: { code: r.error, detail: r.detail },
            loading: false, isFixture: false,
          }));
        }
      },
      (e) => {
        if (!live) return;
        // Should be unreachable: main returns refusals as values. If it ever
        // arrives it is a bug here, and it must not leave the pane spinning.
        setState((s) => ({
          ...s,
          error: { code: 'server_error', detail: e instanceof Error ? e.message : String(e) },
          loading: false, isFixture: false,
        }));
      },
    );
    return () => { live = false; };
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  /* ---- the policy store, read beside the roster --------------------------
     A SECOND READ, on purpose. The roster comes from the relay and the policy
     comes from this machine's pin file; joining them in main would put a disk
     read behind a network round trip, so a status change would not show until
     the relay answered. They are re-read together on `nonce` and separately
     when main says the policy moved, which is what makes a scheduled status
     appear on screen the minute it takes effect. */
  const [policy, setPolicy] = useState<PolicyPayload | null>(null);
  const memberKey = state.teammates.map((m) => m.id).join(',');
  const readPolicy = useCallback(() => {
    const api = bridge();
    if (!api?.teamsPolicy) return;
    void api.teamsPolicy(memberKey ? memberKey.split(',') : []).then(
      (p) => setPolicy(p),
      // Main answers with a value, never a throw. If one ever arrives, keeping
      // the last known policy is safer than falling back to a permissive one.
      () => { /* keep what we have */ },
    );
  }, [memberKey]);
  useEffect(() => { readPolicy(); }, [readPolicy, nonce]);
  useEffect(() => {
    const api = bridge();
    if (!api?.onTeamsPolicy) return;
    return api.onTeamsPolicy(() => readPolicy());
  }, [readPolicy]);

  /* The harness has no bridge, so the fixtures stand in: status `open`, which
     is the identity for the AND in `effectivePolicy` and therefore the only
     value that leaves the per person policies visible. */
  const fallbackDefault = normalizePolicy(state.yourDefault);
  const status = policy?.status ?? policyOf('open');
  const policyDefault = policy?.policyDefault ?? fallbackDefault;
  const overrides = policy?.overrides ?? fixtureOverrides(state.isFixture, state.teammates);

  const hasOverride = useCallback(
    (memberId: string) => Object.prototype.hasOwnProperty.call(overrides, memberId),
    [overrides],
  );
  const policyFor = useCallback(
    (memberId: string) => overrides[memberId] ?? policyDefault,
    [overrides, policyDefault],
  );
  const effectiveFor = useCallback(
    (memberId: string) => effectivePolicy(status, overrides[memberId] ?? policyDefault),
    [status, overrides, policyDefault],
  );

  /* Presence changed, or the socket came back after a gap: the dots and the
     seat count may be stale, so read again. Debounced, because a relay
     restart makes every teammate flip offline and online within a second. */
  useEffect(() => {
    const api = bridge();
    if (!api?.onTeamsPresence || !api.onTeamsConnection) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; reload(); }, 400);
    };
    const offPresence = api.onTeamsPresence(bump);
    const offConnection = api.onTeamsConnection((v) => { if (v.state === 'connected') bump(); });
    return () => {
      if (timer) clearTimeout(timer);
      offPresence();
      offConnection();
    };
  }, [reload]);

  return {
    ...state, reload,
    status,
    schedule: policy?.schedule ?? { ...EMPTY_SCHEDULE, windows: [] },
    scheduleDriving: policy?.scheduleDriving ?? false,
    policyDefault,
    policyDefaultSet: policy ? policy.policyDefault !== null : false,
    hasOverride,
    policyFor,
    effectiveFor,
    theirPolicy,
  };
}

/** What THEY allow you. The relay carries the deprecated one word value, and
 *  `normalizePolicy` takes it through `presetFromLegacy`, so this is exact
 *  rather than a guess: the three old words map one to one onto three of the
 *  four presets.
 *
 *  0.5.2: their own machine's door wins over the org's word. `receiving`
 *  false is what their bridge published for this sender, and a send would
 *  be refused by the relay, so the row and the drawer say their side is
 *  closed rather than predicting a delivery that cannot happen. `commands`
 *  goes with it, since a command arrives as a message. */
function theirPolicy(mate: Teammate): TeamPolicy {
  const policy = normalizePolicy(mate.theyAllow);
  return mate.receiving === false ? { ...policy, receive: false, commands: false } : policy;
}

/** The harness draws the fixture roster with no bridge behind it. Reading the
 *  fixtures' own `youAllow` keeps the preview boards honest about which rows
 *  differ from the default, instead of showing every row as "follows default". */
function fixtureOverrides(isFixture: boolean, mates: Teammate[]): Record<string, TeamPolicy> {
  if (!isFixture) return {};
  const out: Record<string, TeamPolicy> = {};
  for (const m of mates) if (m.overridden) out[m.id] = normalizePolicy(m.youAllow);
  return out;
}

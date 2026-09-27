/**
 * The two money-funnel events the RENDERER is the only one who can see
 * (0.5.0 spec §2): a purchase surface was drawn, or a dead end was.
 *
 * WHY A COMPONENT AND NOT A CALL. Both moments are "this screen appeared", and
 * the screens are chosen by early returns in App.tsx, where a hook cannot go.
 * Wrapping the returned element keeps the decision at the branch that made it
 * and fires exactly once per mount, which is once per time the person actually
 * met the screen — a `useEffect` in each of the three components would have
 * said the same thing in three places and drifted.
 *
 * Everything here is advisory. Main re-checks the event name against the two
 * the renderer may send, and every VALUE against its closed enum, and drops
 * the whole event rather than send an unrecognised one. So this file cannot
 * widen TELEMETRY.md's contract however it is called; see the note on
 * `analytics:funnel` in main.
 */
import { useEffect, useRef } from 'react';

/** Why the paywall was drawn. Mirrors `PAYWALL_TRIGGERS` in main/analytics.ts. */
export type PaywallTrigger =
  | 'pro_feature' | 'seat_limit' | 'licence_missing' | 'licence_expired' | 'manual';

/** Why the app refused, with no purchase surface offered. Mirrors
 *  `ACCESS_BLOCKS` in main/analytics.ts. */
export type AccessBlock =
  | 'no_seat' | 'seat_limit_reached' | 'org_required' | 'licence_missing' | 'org_lapsed';

type Ping =
  | { event: 'paywall_shown'; plan: 'pro' | 'teams'; trigger: PaywallTrigger }
  | { event: 'access_blocked'; plan: 'pro' | 'teams'; block: AccessBlock };

/**
 * Report one funnel screen, once, when it mounts.
 *
 * The properties are read from the FIRST render deliberately: this reports the
 * screen that appeared, and a trigger that changed underneath a screen already
 * on the glass would be a second story about the same appearance.
 */
export function useFunnelPing(ping: Ping): void {
  useEffect(() => {
    const { event, ...props } = ping;
    void window.cth?.trackFunnel?.(event, props as Record<string, string>);
    // Mount only: see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * `access_blocked`, fired when the app locks a machine OUT of an org.
 *
 * Not a mount ping, for two reasons that both come from the lock itself:
 *
 *  - the lock's KIND and REASON arrive one IPC round trip after the screen
 *    does, so a mount-only ping would fire before there was anything to say;
 *  - only `revoked` is an access decision. A `lease` lock is a machine that
 *    has not reached the relay recently, which is connectivity, and counting
 *    an offline laptop as a withdrawn seat would inflate the one number this
 *    event exists to produce. So the lease lock reports NOTHING rather than
 *    report the wrong block.
 *
 * THE TWO REVOKED REASONS ARE DIFFERENT PROBLEMS (7 Sep 2026, Ryan's own
 * pre-condition, met): `suspended` and `removed` mean this PERSON lost their
 * seat, and the remedy is their admin. `entitlement` means the ORG stopped
 * paying, the remedy is billing, and every seat in that org is gone at once.
 * Reporting both as `no_seat` made the most actionable event in the set
 * unactionable, so they are `no_seat` and `org_lapsed`.
 *
 * Once per lock EPISODE, not once per app: the ref resets when the lock
 * clears, so a machine that is locked, reconnects and is locked again next
 * month reports twice, which is two blocks and reads as two.
 */
export function useAccessBlockedPing(
  kind: 'revoked' | 'lease' | null | undefined,
  /** `StopReason` from @shared/teams, widened here rather than cast: it really
   *  does carry `'unknown'`, and a revoked lock that cannot say why is not
   *  describable in the enum — see the null branch below. */
  reason: 'suspended' | 'removed' | 'entitlement' | 'unknown' | null | undefined
): void {
  const fired = useRef(false);
  useEffect(() => {
    if (!kind) { fired.current = false; return; }
    if (kind !== 'revoked' || fired.current) return;
    // A revoked lock with no reason at all is not describable in the enum, and
    // guessing one would put a wrong row in the very number this splits.
    const block: AccessBlock | null = reason === 'entitlement' ? 'org_lapsed'
      : (reason === 'suspended' || reason === 'removed') ? 'no_seat'
        : null;
    if (!block) return;
    fired.current = true;
    void window.cth?.trackFunnel?.('access_blocked', { plan: 'teams', block });
  }, [kind, reason]);
}

/**
 * `useFunnelPing`, but for a surface whose own condition arrives LATE.
 *
 * The Settings plans band is the case: it is drawn only for a machine the free
 * record admits and no licence covers, and both of those records come back
 * over IPC after the component has already mounted. A mount-only ping would
 * fire before there was anything to report, or not fire at all.
 *
 * Once per time the condition becomes true, and armed again when it goes
 * false, so signing out and back in reports two paywalls, which is two.
 */
export function useFunnelPingWhen(on: boolean, ping: Ping): void {
  const fired = useRef(false);
  useEffect(() => {
    if (!on) { fired.current = false; return; }
    if (fired.current) return;
    fired.current = true;
    const { event, ...props } = ping;
    void window.cth?.trackFunnel?.(event, props as Record<string, string>);
    // `ping` is read at the moment the condition turns true, on purpose: see
    // the note on useFunnelPing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
}

/**
 * A TEAMS checkout was opened in the browser.
 *
 * This exists because the teams purchase is a plain `window.open` in the
 * renderer — main never sees it, so main cannot report it, and until this
 * existed `checkout_opened` could only ever carry `plan: 'pro'`: every teams
 * purchase the app can start was invisible while teams ACTIVATIONS were being
 * reported above it. A funnel with a bottom and no top.
 *
 * `plan` is hardcoded here and main refuses this event for any other plan, so
 * this can never double-count the PRO checkout that `pro:checkout:begin`
 * already reports.
 *
 * NO `seats_bucket` (god's ruling, 7 Sep 2026, following Ryan's on `period`):
 * the seat count is chosen on the page we are handing off to, so the app
 * cannot know it. A property the app cannot know is either false or
 * redundant; the absence is a fact about the app, not missing data.
 *
 * NO `period` either, and that is not the same reason: main STAMPS it, from
 * the one constant that already answers this for the PRO checkout. Sending it
 * from here would be a second copy of a value that has to stay identical, and
 * the day the app can open an annual checkout it must be one edit, not two.
 */
export function reportTeamsCheckoutOpened(): void {
  void window.cth?.trackFunnel?.('checkout_opened', { plan: 'teams' });
}

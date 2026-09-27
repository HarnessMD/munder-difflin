/**
 * Teams wire shapes shared by main, preload and the renderer.
 *
 * NOTHING HERE TOUCHES A NETWORK OR A KEY. It is the deep link parser and the
 * types that cross the IPC bridge, kept in one file so the three sides cannot
 * drift from each other the way three copies of a string literal do.
 */

/* ---- the deep link -------------------------------------------------------- */

/**
 * What the browser hands back after the sign-in:
 *
 *   munderdifflin://teams/enrol?grant=<64 hex>&state=<64 hex>
 *
 * Both values are 32 random bytes as lowercase hex. `state` was minted by THIS
 * app when it opened the browser, and main compares it before accepting the
 * grant, so a link someone else crafted (a web page, another app, a second copy
 * of the console) cannot push a grant into an app that never asked for one.
 *
 * The grant is single use and lives five minutes on the relay, and it is spent
 * the moment it is used. That is what makes one that leaks out of a URL bar or
 * a browser history worthless: by the time anyone reads it back, it is gone.
 */
export interface TeamsDeepLink {
  action: 'enrol';
  grant: string;
  state: string;
}

const HEX64 = /^[0-9a-f]{64}$/;

/** True for exactly the shape a grant or a state takes. */
export function isGrantToken(s: string): boolean {
  return HEX64.test(s);
}

export function parseTeamsDeepLink(link: string): TeamsDeepLink | null {
  let u: URL;
  try { u = new URL(link); } catch { return null; }
  if (u.protocol !== 'munderdifflin:') return null;
  // Both munderdifflin://teams/enrol (host + path) and munderdifflin:teams/enrol
  // (path only), the same two spellings `parseHireDeepLink` accepts.
  const host = u.host.toLowerCase();
  const path = u.pathname.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  const route = host ? `${host}/${path}` : path;
  if (route !== 'teams/enrol') return null;
  const grant = (u.searchParams.get('grant') ?? '').toLowerCase();
  const state = (u.searchParams.get('state') ?? '').toLowerCase();
  if (!HEX64.test(grant) || !HEX64.test(state)) return null;
  return { action: 'enrol', grant, state };
}

/* ---- what crosses the bridge ---------------------------------------------- */

/**
 * The gate's answer. `degraded` and `locked` are Phase 1 (the lease and the
 * takeover); they are in the union now so the renderer's switch is complete
 * from day one and adding them later is a main-side change only.
 */
export type TeamsMode = 'solo' | 'enrolling' | 'live' | 'degraded' | 'locked';

/**
 * D2's failure states. The first four are the original screen's; `refused`
 * carries the relay's own sentence for every refusal that has no better copy,
 * and `signin` is the browser round trip not completing.
 */
export type CodeError = 'invalid' | 'used' | 'expired' | 'offline' | 'refused' | 'signin';

/** The three rows on D3, in the order they happen. Pushed by main as each starts. */
export type EnrolProgress = 'keys' | 'registering' | 'checking';

export type EnrolResult =
  | {
      ok: true;
      org: { orgId: string; name: string };
      memberId: string;
      deviceId: string;
      fingerprint: string;
    }
  | {
      ok: false;
      error: CodeError;
      /** The relay's sentence, or ours. Shown, never branched on. */
      detail: string | null;
      /** A machine reason where one exists, so the screen can pick real copy. */
      reason?: 'keyring_unavailable' | 'keyring_not_encrypting' | 'fingerprint_mismatch';
    };

/** What the renderer may know about this machine's membership. No key material. */
export interface MembershipView {
  orgId: string;
  orgName: string;
  memberId: string;
  deviceId: string;
  enrolledAt: string;
  /** Server time of the last proof of membership, for the `degraded` banner. */
  lastVerifiedAt: string;
  /** 0.4.9: the enrol-time nickname claim was refused, so the Team screen's
   *  self row asks for a unique one. Absent or false otherwise. */
  bossNameNeeded?: boolean;
}

/* ---- Michael to Michael (plan 4.6) --------------------------------------- */

/** Pam's states; never `read`. "Collected" is the strongest honest word. */
export type Delivery = 'delivered' | 'sending' | 'queued' | 'failed';

/** One line of a thread as this machine keeps it: the plaintext of what it
 *  sent and received. The relay never had it. */
export interface ThreadEntry {
  id: string;
  /** `you`, or the teammate's member id. */
  from: 'you' | string;
  act: string;
  subject: string;
  body: string;
  at: string;
  delivery: Delivery;
  /** 0.5.2: the AGENT behind the line, when known. On a received entry it is
   *  the sender's agent as the sealed message named it (the person's name is
   *  `from`); on a sent entry it is the local agent's display name. Absent
   *  when the person typed it themselves or an older build sent it. */
  agent?: string;
}

export interface ThreadView {
  memberId: string;
  threadId: string;
  messages: ThreadEntry[];
}

export type RequestKind = 'run-task' | 'share-context' | 'join-thread';

/** D10's row. `subject` and `body` are derived here after decrypting; the
 *  relay never had a preview to give (contract 3.8). */
export interface PendingRequest {
  id: string;
  fromMemberId: string;
  fromName: string;
  fromMachine: string;
  type: RequestKind;
  subject: string;
  body: string;
  at: string;
  expiresAt: string;
  expired: boolean;
}

export type RequestDecision = 'allow-once' | 'always' | 'decline';

/* ---- the org channel (plan 4.4, Pam's S1) --------------------------------- */

/**
 * `BillingState`, FIVE values.
 *
 * It was four (contract amendment 1) and the server's own enum has been five
 * since the card gate landed (`teams-backend/src/schemas.mjs:48`). A new org is
 * created at `awaiting-card` and sits there until a payment is confirmed, so
 * `awaiting-card` is the state EVERY org passes through, and it was the one
 * value this side refused to parse. `teamsOrg.valid()` rejected the whole `/me`
 * response over it, which meant the desktop learned nothing at all about an org
 * that had not paid yet: no name, no seats, no standing, and therefore no admin.
 */
export type BillingState = 'awaiting-card' | 'trialing' | 'healthy' | 'payment-failed' | 'cancelled';

/**
 * What the org has told this machine, as S1 renders it. `available` is false
 * until the relay answers `/me` (server item S2): the name then comes from
 * enrolment and everything else is honestly absent, because a policy row
 * without the policy behind it is the defect Pam catalogued.
 */
export interface OrgView {
  available: boolean;
  orgId: string;
  /** What the org calls itself. Not proof of anything; the key below is. */
  name: string;
  /** The key itself, base64url. Null until reported. */
  signingKey: string | null;
  /** Six groups of four, mono, at rest: the same safety-number form as a
   *  device fingerprint, so the admin reads it the same way. */
  keyGroups: string | null;
  /** A person pressed Verify after the out of band check. Never from the wire. */
  keyVerified: boolean;
  /** The six groups the relay showed before the key changed. D13 for the org itself. */
  keyPreviousGroups: string | null;
  defaultPermission: 'strict' | 'communication-only' | 'allow-all' | null;
  requireFingerprint: boolean | null;
  entitlement: { state: BillingState; trialEndsAt: string | null; graceEndsAt: string | null } | null;
  seatsUsed: number | null;
  seatsPaid: number | null;
  you: { name: string | null; email: string | null; isAdmin: boolean } | null;
  membership: 'active' | 'suspended' | 'removed' | null;
  /** Server time of the answer this view is built from. */
  fetchedAt: string | null;
}

/* ---- the connection (plan 4.3) ------------------------------------------ */

/**
 * The socket from THIS MACHINE's point of view. Five are the contract's and
 * the relay has no opinion on which is showing; `stopped` is Pam's sixth:
 * close code 1008 is terminal, and a chip saying "reconnecting" over it
 * would promise a retry that is not coming. `network-blocked` is a local
 * policy state the relay never causes; nothing produces it yet.
 */
export type ConnectionState =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'offline'
  | 'network-blocked'
  | 'stopped';

/** The relay's word for why a seat stopped working (a `revoked` frame, or a
 *  402 on the upgrade), or `unknown`: two consecutive `unauthorized` with no
 *  frame and no `/me` to ask, which is plan 4.5 on today's server. */
export type RevokeReason = 'removed' | 'suspended' | 'entitlement';
export type StopReason = RevokeReason | 'unknown';

export interface ConnectionView {
  state: ConnectionState;
  /** Only with `stopped`. */
  reason?: StopReason;
}

/** Why the gate answers `locked`, for the takeover's copy (plan 4.5, 5). */
export interface LockInfo {
  /** `lease`: this machine has not reached its team for longer than the lease
   *  allows, or its clock went backwards. `revoked`: the relay stopped it. */
  kind: 'lease' | 'revoked';
  /** With `revoked` only. */
  reason: StopReason | null;
  orgName: string;
  /** Server time of the last proof of membership, for "since Tuesday". */
  lastVerifiedAt: string;
}

/**
 * Plan 3.1, DEFAULT NOT RULING. The founder has not said whether losing a seat
 * (or letting the lease run out) locks the whole app or only the team
 * features. `true` is the plan as approved: `locked` is a full-window takeover
 * and local work is not offered. `false` is Pam's sheet: the takeover sits on
 * the Team surface, the chip says `stopped`, and the rest of the app runs.
 * Both are built; this one constant chooses, and the day it binds god gets
 * the measured cost of each side.
 */
export const LOCK_APP_ON_REVOKE = true; // plan 3.1, DEFAULT NOT RULING

/**
 * THE MEMBERSHIP GATE. FOUNDER RULING, 3 SEP 2026, not a default: the desktop
 * does not run for a machine that has no paid answer behind it. A machine the
 * gate reads as `solo` is shown the way in and nothing behind it, and an
 * existing solo install that updates into this build meets the same screen.
 * The server decides who is entitled; this constant only says that the desktop
 * refuses to run without that answer. `false` is the 0.4.7 behaviour, kept
 * buildable so the harness and the dev lane can still exercise the app with no
 * account at all, never shipped.
 *
 * WHAT THE RULING SAID ON 3 SEP, and no longer says. In his words then: the
 * app is for people whose organisation has a card on file and nobody else,
 * a machine reading as `solo` gets the join screen and nothing behind it, and
 * there is no "set up on my own" door any more.
 *
 * WHAT IT SAYS SINCE 4 SEP 2026. The founder asked for that door back, for PRO
 * (`SOLO_PRO` below). A person with no organisation buys a solo plan and gets a
 * LICENSE KEY, and that key is the paid answer this constant is really about;
 * an organisation's card is now one of the two ways to have one, not the only
 * one. So the gate did not weaken: it stopped conflating "paid" with "in an
 * org". What has NOT changed, and must not: a machine with a membership behaves
 * exactly as it did, a `locked` machine is still the takeover and can never
 * fall through into solo, and Classic still has one door and it is the join.
 * The rule now lives as one function, `proGateAdmits` in ./soloPro.
 */
export const REQUIRE_MEMBERSHIP = true; // founder ruling, 3 Sep 2026

/**
 * THE SOLO PLAN. FOUNDER RULING, 4 SEP 2026, not a default: PRO has a plan for
 * one person. Such a machine has no org, no invite code and no seat; it has a
 * license key, its own onboarding, and no access to the two features the
 * founder named as team only, the network and the computer brain
 * (src/shared/permissions.ts, the two families; src/shared/soloPro.ts, the nav).
 *
 * CLASSIC IS NOT IN THIS. The Classic chain keeps exactly the 0.4.9 behaviour:
 * one door, the join. `false` restores 0.4.9 for PRO too and is what the seam
 * is for, since the solo path's other half (the console and the redemption
 * endpoint) ships on its own schedule.
 */
export const SOLO_PRO = true; // founder ruling, 4 Sep 2026

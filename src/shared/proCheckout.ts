/**
 * THE PAYWALL HAND-OFF (founder, 6 Sep 2026, item 2), agreed with Kevin who
 * owns the web half, 7 Sep 2026.
 *
 * THE SHAPE IS THE ONE THIS REPO ALREADY USES TWICE. `teams.ts` (enrol) and
 * `freeTier.ts` (register) are the same bargain: the app mints a 64 hex
 * `state`, the browser does the human part, the console mints a single use
 * `grant`, and a deep link hands both back. This is the third, and it is
 * deliberately not a fourth idea.
 *
 * WHY /pro/checkout AND NOT /checkout. Kevin read the routes rather than
 * agreeing with the first proposal: `/checkout` already exists on the console
 * and is the TEAM ADMIN door, redirecting to organisation creation. A solo
 * person sent there would land in the wrong flow entirely. `/pro` is the solo
 * dashboard family, so `/pro/checkout` sits with its own kind and collides
 * with nothing.
 *
 * NOBODY SIGNS IN TWICE, and not because we carry a token. The person signed
 * in IN THE BROWSER at step one, because that is the only way a grant is
 * minted at all for either existing round trip. That browser still holds the
 * session when the paywall opens it, so `/pro/checkout` goes straight through.
 * The app deliberately sends NO identity of its own: `personId` in a URL is
 * not authentication and must never drive billing.
 *
 * ONE THING LIVES ENTIRELY ON KEVIN'S SIDE, recorded here because it is the
 * kind of fault that only shows for the people you did not test with. The
 * console's `safeNext` allowlist is a list membership by design, not a
 * sanitiser, and it does not permit a query string, so `next=/pro/checkout?
 * state=…` would have been rejected and the state lost, but ONLY for someone
 * not already signed in. Kevin holds the state in a short lived httpOnly
 * cookie and calls the guard with the bare path. Nothing of that crosses to
 * the app, and the guard stays a list.
 */

/** The console's solo checkout page. `state` is this machine's nonce. */
export const PRO_CHECKOUT_PATH = '/pro/checkout' as const;

/**
 * Where the paywall sends the browser. The origin is passed in rather than
 * baked so the dev console can be pointed at, exactly as `soloConsoleUrl`
 * takes one.
 */
export function proCheckoutUrl(state: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}${PRO_CHECKOUT_PATH}?state=${state}`;
}

/* ---- the deep link -------------------------------------------------------- */

/**
 * What the browser hands back once the payment is done:
 *
 *   munderdifflin://pro/checkout?grant=<64 hex>&state=<64 hex>
 *
 * A route of its own rather than a parameter on an existing one, for the same
 * reason `free/register` is separate from `teams/enrol`: THE ROUTE IS THE
 * INTENT, so no crafted link can steer one flow's parser into another's.
 */
export interface ProCheckoutDeepLink {
  action: 'pro-checkout';
  grant: string;
  state: string;
}

const HEX64 = /^[0-9a-f]{64}$/;

export function parseProCheckoutDeepLink(link: string): ProCheckoutDeepLink | null {
  let u: URL;
  try { u = new URL(link); } catch { return null; }
  if (u.protocol !== 'munderdifflin:') return null;
  // Both munderdifflin://pro/checkout and munderdifflin:pro/checkout, the same
  // two spellings the teams, free and hire parsers all accept.
  const host = u.host.toLowerCase();
  const path = u.pathname.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  const route = host ? `${host}/${path}` : path;
  if (route !== 'pro/checkout') return null;
  const grant = (u.searchParams.get('grant') ?? '').toLowerCase();
  const state = (u.searchParams.get('state') ?? '').toLowerCase();
  if (!HEX64.test(grant) || !HEX64.test(state)) return null;
  return { action: 'pro-checkout', grant, state };
}

/* ---- spending the grant --------------------------------------------------- */

/**
 * Exchanges the single-use grant for the licence key. Kevin's contract,
 * 7 Sep 2026, endpoint id `pro.checkout.claim.write`.
 *
 * PUBLIC, like `/api/free/register` and for the same reason: the app holds no
 * session, so the GRANT is the credential, and it is single use.
 *
 * THE STATE DOES NOT TRAVEL. The app minted it, the app holds it, and the app
 * checks the returned one before ever calling this. A value the server cannot
 * verify is a value the server must not accept, which is the same split enrol
 * and register already make.
 *
 * NOT LIVE YET at the time of writing: Kevin has committed to this contract
 * and has not built it (his W6). Everything here therefore has to degrade to
 * the licence-key paste path, which is what `claimIsRecoverable` is for, and
 * a 404 has to behave like any other "not now".
 */
export const PRO_CHECKOUT_CLAIM_ROUTE = '/api/pro/checkout/claim' as const;

/** What a successful claim answers with. The full key exists here and nowhere
 *  else, so it goes straight to redeem and is never logged. */
export interface ProClaimAnswer {
  ok: true;
  key: string;
  email: string;
  personId: string;
  /** What the licence is billed by (console, 8 Sep 2026). Optional on the
   *  wire: a console older than the field omits it, and the app then sends no
   *  period rather than a guess. The closed list is `CHECKOUT_PERIODS` in
   *  main/analytics.ts, and the only reader is the funnel's
   *  `licence_activated` at the checkout door. */
  period?: 'monthly' | 'annual';
}

/**
 * Branch on these and NEVER on `detail`, which is prose and gets reworded.
 * `unavailable` is ours, not Kevin's: it covers the route not existing yet,
 * and anything else unreadable coming back.
 */
export type ProClaimError =
  | 'invalid_body'
  | 'unauthorized'
  | 'entitlement_inactive'
  | 'rate_limited'
  | 'server_error'
  | 'offline'
  | 'unavailable';

export type ProClaimResult =
  | ProClaimAnswer
  | { ok: false; error: ProClaimError; detail: string | null };

/**
 * Should this refusal send the person to the licence-key paste path rather
 * than showing them a failure?
 *
 * `unauthorized` is the common one and is the important case: it is exactly
 * what a SECOND deep link looks like once the grant is spent, so the person
 * has very likely already succeeded. Treating that as an error would tell
 * somebody who just paid that something went wrong. `rate_limited` and
 * `entitlement_inactive` are the two that must NOT fall through: one wants a
 * back-off and the other means they abandoned checkout and belong back at it.
 */
export function claimIsRecoverable(error: ProClaimError): boolean {
  return error === 'unauthorized'
    || error === 'server_error'
    || error === 'offline'
    || error === 'unavailable'
    || error === 'invalid_body';
}

/** Map an HTTP status and body onto the contract. Anything unrecognised is
 *  `unavailable`, never a guess at which of Kevin's codes it might be. */
export function claimRefusalOf(
  status: number,
  body: { error?: unknown; detail?: unknown }
): { error: ProClaimError; detail: string | null } {
  const named = typeof body.error === 'string' ? body.error : '';
  const detail = typeof body.detail === 'string' ? body.detail : null;
  const known: ProClaimError[] = ['invalid_body', 'unauthorized', 'entitlement_inactive', 'rate_limited', 'server_error'];
  if ((known as string[]).includes(named)) return { error: named as ProClaimError, detail };

  /* THE STATUS FALLBACK MATTERS WHEN THE BODY DOES NOT PARSE, which is exactly
   * when a proxy, a gateway or an error page answered instead of the route. It
   * has to reach the same verdict the body would have.
   *
   * 402 IS THE ONE THAT WOULD HAVE BEEN WRONG, and Kevin named it: it is
   * `entitlement_inactive`, the person who backed out of checkout, and it is
   * the case that must NOT fall through to the paste path. Without this line an
   * unreadable 402 landed on `unavailable`, which IS recoverable, so somebody
   * who never paid would have been invited to enter a licence key they do not
   * have instead of being sent back to finish paying.
   *
   * Kevin's codes, pinned by status: 400 invalid_body, 401 unauthorized,
   * 402 entitlement_inactive, 429 rate_limited, 500 server_error. */
  if (status === 400) return { error: 'invalid_body', detail };
  if (status === 401) return { error: 'unauthorized', detail };
  if (status === 402) return { error: 'entitlement_inactive', detail };
  if (status === 429) return { error: 'rate_limited', detail };
  // The route is missing, or something in front of it answered.
  if (status === 404 || status === 405) return { error: 'unavailable', detail };
  if (status >= 500) return { error: 'server_error', detail };
  return { error: 'unavailable', detail };
}

/* ---- the state handshake -------------------------------------------------- */

/** How long a minted `state` is worth answering. Five minutes, the same
 *  window `teamsEnrol` and `freeAccount` give their grants: long enough to
 *  read a card form, short enough that a link found later is dead. */
export const PRO_CHECKOUT_STATE_TTL_MS = 5 * 60_000;

export interface PendingCheckout {
  state: string;
  expiresAt: number;
}

/**
 * Is this the link we are waiting for? Argument for argument the same test
 * `freeAccount.completeFree` applies: a link must carry the state THIS machine
 * minted and it must not have expired. A link that fails either is not an
 * error to show, it is a link for somebody else's session or an old one.
 */
export function checkoutStateMatches(
  pending: PendingCheckout | null,
  state: string,
  now: number = Date.now()
): boolean {
  if (!pending) return false;
  if (now >= pending.expiresAt) return false;
  return pending.state === state.trim().toLowerCase();
}

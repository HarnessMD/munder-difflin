/**
 * The app's half of the paywall hand-off (founder item 2; contract agreed with
 * Kevin, 7 Sep 2026). The rules and the reasoning are in
 * `../shared/proCheckout.ts`; this is the machine state around them.
 *
 * IT HOLDS EXACTLY ONE PENDING STATE, in memory, like `freeAccount` does.
 * Opening the browser again replaces it: a person who clicks twice is on their
 * second attempt, not running two, and a link carrying the first state is then
 * correctly refused rather than quietly accepted.
 *
 * NOTHING IS PERSISTED. A state that did not come back before the app closed
 * is worth nothing afterwards, and writing it would mean a five minute
 * credential surviving on disk for no gain.
 *
 * SPENDING THE GRANT IS BUILT AGAINST A CONTRACT THAT IS NOT LIVE YET. Kevin
 * gave the route, the request and the answer in writing on 7 Sep and has said
 * plainly that he has not written the endpoint (his W6), so it answers 404
 * today. That is fine and it is why this was worth building now rather than
 * later: every refusal `claimIsRecoverable` covers, 404 included, falls
 * through to the licence-key paste path, so TODAY the person gets exactly the
 * behaviour they got before this existed, and the day he ships it starts
 * working with nothing to change here. The one thing never done is guessing:
 * an unrecognised answer is `unavailable`, never a guess at which of his codes
 * it might have been.
 */
import { randomBytes } from 'node:crypto';
import { shell } from 'electron';
import { CONSOLE_ORIGIN } from '../shared/consoleLinks';
import {
  checkoutStateMatches, claimRefusalOf, proCheckoutUrl,
  PRO_CHECKOUT_CLAIM_ROUTE, PRO_CHECKOUT_STATE_TTL_MS,
  type PendingCheckout, type ProClaimResult
} from '../shared/proCheckout';
import { LICENSE_ORIGIN, redeemLicense, type RedeemResult } from './soloLicense';
import { CHECKOUT_PERIODS, type CheckoutPeriod } from './analytics';

/**
 * WHERE THE BROWSER IS SENT, overridable for a local stack.
 *
 * `CONSOLE_ORIGIN` is a hardcoded constant, and its own comment in
 * `shared/consoleLinks.ts` claims it is "overridable the same way the sign-in
 * page is". It is not: `SIGNIN_URL` reads `MD_TEAMS_SIGNIN_URL` and
 * `LICENSE_ORIGIN` reads `MD_LICENCE_ORIGIN`, and that constant reads nothing.
 * So pressing Buy always opened the live site, and the checkout round trip
 * could not be exercised against a local console at all.
 *
 * THE READ IS HERE AND NOT IN THE SHARED FILE ON PURPOSE. `consoleLinks.ts` is
 * imported by renderer components (`ProSidebar`, `TeamScreen`), and a bare
 * `process.env` lookup evaluated in the renderer is a runtime error waiting for
 * whoever opens that menu. Main is Node and can read it safely, and the paywall
 * hand-off is the only path that needs it.
 *
 * Unset in production, which is every packaged build, so the constant is what
 * ships and nothing about the live flow changes.
 */
const checkoutOrigin = (): string => process.env.MD_CONSOLE_ORIGIN ?? CONSOLE_ORIGIN;

let pending: PendingCheckout | null = null;

/** Test seam, and the only way to clear the state without minting a new one. */
export function forgetPendingCheckout(): void {
  pending = null;
}

/** What the renderer is told when a return link lands. */
export type CheckoutReturn =
  | { ok: true; grant: string }
  | { ok: false; reason: 'no-pending' | 'state-mismatch' | 'expired' };

/**
 * Mint a fresh `state` and open the console's solo checkout in the person's
 * real browser, because that is where their session already is. Returns the
 * URL so a caller can show it (and so a test can assert it) rather than
 * needing to observe the shell.
 */
export async function beginProCheckout(
  open: (url: string) => Promise<void> = (u) => shell.openExternal(u),
  origin: string = checkoutOrigin(),
  now: number = Date.now()
): Promise<{ url: string; state: string }> {
  const state = randomBytes(32).toString('hex');
  pending = { state, expiresAt: now + PRO_CHECKOUT_STATE_TTL_MS };
  const url = proCheckoutUrl(state, origin);
  await open(url);
  return { url, state };
}

/**
 * A `munderdifflin://pro/checkout` link came back. Verify it against the state
 * this machine minted BEFORE anything is done with the grant.
 *
 * The three refusals are told apart on purpose: "nothing pending" and "not my
 * state" mean this link belongs to some other attempt and the person should
 * simply be offered the door again, while "expired" is the one worth saying
 * out loud, because they did everything right and only took too long.
 *
 * The state is spent on any answer, success or refusal. A nonce that survives
 * being tested is not a nonce.
 */
export function receiveCheckoutReturn(
  grant: string,
  state: string,
  now: number = Date.now()
): CheckoutReturn {
  const held = pending;
  pending = null;
  if (!held) return { ok: false, reason: 'no-pending' };
  if (held.state !== state.trim().toLowerCase()) return { ok: false, reason: 'state-mismatch' };
  if (!checkoutStateMatches(held, state, now)) return { ok: false, reason: 'expired' };
  return { ok: true, grant };
}

/**
 * Exchange the grant for a licence key and redeem it, which is the whole of
 * the return leg. Two calls, in this order, because they are two different
 * facts: the console says WHICH licence this person bought, and redeem binds
 * it to THIS machine and writes the record the gate reads.
 *
 * The key is handled exactly as `redeemLicense` handles one: it travels once
 * in a POST body over TLS, is never logged and never put in a URL. It is not
 * returned to the renderer either; the caller gets the outcome, not the
 * credential.
 */
export async function claimAndRedeem(grant: string): Promise<
  | { ok: true; redeemed: RedeemResult; period?: CheckoutPeriod }
  | { ok: false; claim: Extract<ProClaimResult, { ok: false }> }
> {
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${LICENSE_ORIGIN}${PRO_CHECKOUT_CLAIM_ROUTE}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // The grant and nothing else. No personId, no email, and NOT the state:
      // a value the server cannot verify is one it must not accept.
      body: JSON.stringify({ grant }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, claim: { ok: false, error: 'offline', detail: null } };
  }
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const r = claimRefusalOf(res.status, (body ?? {}) as { error?: unknown; detail?: unknown });
    console.log(`[pro] checkout claim refused: ${r.error} (${res.status})`);
    return { ok: false, claim: { ok: false, ...r } };
  }
  const answer = (body ?? {}) as { key?: unknown; period?: unknown };
  if (typeof answer.key !== 'string' || answer.key.trim() === '') {
    // A 2xx with no key is not a success we can act on.
    return { ok: false, claim: { ok: false, error: 'unavailable', detail: null } };
  }
  /* `period` (0.5.1): what the licence is billed by, for the funnel's
     `licence_activated`. Read BY NAME and checked against the closed list; a
     console that omits it, or says something outside the list, yields no
     period at all. The property is then absent, never guessed. */
  const period = typeof answer.period === 'string'
    && (CHECKOUT_PERIODS as readonly string[]).includes(answer.period)
    ? (answer.period as CheckoutPeriod) : undefined;
  const redeemed = await redeemLicense(answer.key);
  return period ? { ok: true, redeemed, period } : { ok: true, redeemed };
}

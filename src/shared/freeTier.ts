/**
 * THE FREE TIER, as data (founder ruling, 5 Sep 2026).
 *
 * The 3 Sep ruling closed the app to non-members; the 4 Sep amendment opened
 * PRO to a bought licence key. THIS amendment opens CLASSIC, and only Classic,
 * to a person with a free account: the current Classic, minus everything team
 * and everything PRO. One Classic, not a fork of an old one.
 *
 * A FREE ACCOUNT IS AN IDENTITY, NOT A CREDENTIAL. The person signs in on the
 * console (Clerk owns identity there, same as every paid path) through the
 * SAME desktop sign-in round trip a team join uses: the app mints a `state`,
 * the browser signs the person in, the console mints a single-use grant naming
 * that person, and the deep link hands it back. The app then spends the grant
 * at `/api/free/register`, which answers with WHO the grant named, and that
 * answer is the record written to disk. Nothing here can admit a revoked team
 * seat: `locked` is a takeover and the gate in App.tsx never consults the free
 * record for a machine in that mode.
 *
 * FREE DOES NOT EXPIRE. There is no staleness cap and no recheck loop, which
 * is exactly the difference between an identity and a subscription: the
 * licence's 14 day cap exists because money can stop moving, and no money
 * moves here. A free machine makes ZERO network calls after registration.
 *
 * Structural and window-free like ./soloPro.ts, so test/free-tier.test.cjs can
 * hold the rules without zustand or electron in the room.
 */

/* ---- the record ----------------------------------------------------------- */

/** What `<userData>/teams/free.json` holds: who this install belongs to. */
export interface FreeAccountView {
  /** The email the console's identity provider verified. Shown in Settings so
   *  the person knows which account this install is theirs under. */
  email: string;
  /** The console's person id, the same subject a paid seat would name. */
  personId: string;
  /** When this machine registered. Informational: it never gates. */
  registeredAt: string;
}

/**
 * Does this record admit a machine into free Classic?
 *
 * Presence with a person behind it is the whole rule, on purpose: see the
 * header. A malformed record (hand-edited, truncated write) refuses, and the
 * person meets the free door again rather than an admitted-but-anonymous
 * install. The email must BE a string but may be empty: the capture happens
 * server side at registration (the provider knows the email even when the
 * answer here carried none), and a person the server admitted must never be
 * locked out by a display field.
 */
export function freeAdmits(view: FreeAccountView | null | undefined): boolean {
  if (!view) return false;
  return typeof view.email === 'string'
    && typeof view.personId === 'string' && view.personId.trim() !== '';
}

/* ---- the deep link -------------------------------------------------------- */

/**
 * What the browser hands back after the FREE sign-in:
 *
 *   munderdifflin://free/register?grant=<64 hex>&state=<64 hex>
 *
 * Same bargain as `teams.ts`'s enrol link, same shapes, same `state` check in
 * main before the grant is accepted. A separate route rather than a param on
 * `teams/enrol` so neither parser can be steered into the other's flow by a
 * crafted link: the route IS the intent.
 */
export interface FreeDeepLink {
  action: 'free-register';
  grant: string;
  state: string;
}

const HEX64 = /^[0-9a-f]{64}$/;

export function parseFreeDeepLink(link: string): FreeDeepLink | null {
  let u: URL;
  try { u = new URL(link); } catch { return null; }
  if (u.protocol !== 'munderdifflin:') return null;
  // Both munderdifflin://free/register and munderdifflin:free/register, the
  // same two spellings the teams and hire parsers accept.
  const host = u.host.toLowerCase();
  const path = u.pathname.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  const route = host ? `${host}/${path}` : path;
  if (route !== 'free/register') return null;
  const grant = (u.searchParams.get('grant') ?? '').toLowerCase();
  const state = (u.searchParams.get('state') ?? '').toLowerCase();
  if (!HEX64.test(grant) || !HEX64.test(state)) return null;
  return { action: 'free-register', grant, state };
}

/* ---- the server route ----------------------------------------------------- */

/**
 * Spends the grant, records the install, answers with who it named. Public
 * like `/api/licence/check` and for the same reason: the single-use grant IS
 * the credential. Beside the licence routes on `LICENSE_ORIGIN`.
 */
export const FREE_REGISTER_ROUTE = '/api/free/register' as const;

/** What a successful register answers with. */
export interface FreeRegisterAnswer {
  ok: true;
  email: string;
  personId: string;
}

export type FreeRegisterError = 'invalid_grant' | 'offline' | 'refused';

export type FreeRegisterResult =
  | FreeRegisterAnswer
  | { ok: false; error: FreeRegisterError; detail: string | null };

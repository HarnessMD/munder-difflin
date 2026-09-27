/**
 * SOLO PRO: what a one person install is, and what it may reach.
 *
 * THE RULING THIS ANSWERS. On 3 September 2026 the founder closed the solo
 * door entirely (`REQUIRE_MEMBERSHIP` in ./teams): the app was for people
 * whose organisation had a card on file and for nobody else. On 4 September he
 * reopened it for PRO, with a plan of its own: a solo person buys a LICENSE KEY
 * on the web console and redeems it here. Classic did not move and must not.
 *
 * THE TWO WORDS NEVER CROSS. A team seat is reached with an INVITE CODE minted
 * by an admin. A solo plan is reached with a LICENSE KEY bought by the person
 * using it. So a solo screen never says invite, code or seat, and a team screen
 * never says license. The shape of the key, its checksum and the "that is an
 * invite code, not a license key" answer all live in ./licenseKey, which landed
 * with the console work; this file composes with it rather than keeping a
 * second copy of the rules.
 *
 * WHAT THIS FILE DECIDES, and why it is one file:
 *
 *   1. WHO GETS IN.        `proGateAdmits` is the whole of the gate rule, so
 *                          App.tsx states it once instead of spelling out four
 *                          modes inline. The safety property it carries is that
 *                          `locked` is never admitted: a person whose seat was
 *                          revoked must not fall through into solo and keep
 *                          working, which is the way this change goes wrong.
 *   2. WHAT EXISTS.        `navFor` turns a standing into the set of
 *                          destinations that are real on this install, so the
 *                          sidebar and the pane table read ONE answer and
 *                          cannot disagree. It composes with `can()` and does
 *                          not restate the table: the moment a permission moves
 *                          family in ./permissions, the nav follows.
 *
 * A solo person must never be shown a door onto an empty room, and never a room
 * that refuses them something the plan can simply never give. So Team and Team
 * knowledge are ABSENT rather than disabled, and the offer of a team is made
 * once, in one place.
 *
 * React free and window free on purpose: the rules are unit tested directly
 * (test/solo-pro.test.cjs) and the screens that read them stay dumb.
 */
import { can, KNOWLEDGE_PERMS, NETWORK_PERMS, type OrgStanding, type TeamsMode } from './permissions';
import { licenceAdmits, type LicenseProblem, type LicenseView } from './licenseKey';
import { CONSOLE_ORIGIN } from './consoleLinks';

/* ---- 1. who gets in ------------------------------------------------------- */

/**
 * Does this machine have a way into the app at all?
 *
 * `live` and `degraded` are a member, and answer exactly what they answered on
 * 0.4.9: an existing org member is not put on a different path by any of this.
 *
 * `locked` is FALSE and is the reason this function exists. Locked means a seat
 * was revoked or a lease ran out, and the takeover owns the window; if the gate
 * ever asked "well, is this machine solo then?" a removed member would answer
 * yes and keep working. Locked is never a solo install, whatever else is true.
 *
 * `solo` and `enrolling` are admitted only by a live license that has been
 * CONFIRMED recently enough to believe (`licenceAdmits`, 5 Sep 2026: a live
 * state alone let a revoked key coast forever on a machine that never asked
 * again). No license is the 3 September behaviour unchanged: the entry
 * screen, and nothing behind it.
 */
export function proGateAdmits(mode: TeamsMode, license: LicenseView | null, now = Date.now()): boolean {
  if (mode === 'locked') return false;
  if (mode === 'live' || mode === 'degraded') return true;
  return license !== null && licenceAdmits(license, now);
}

/** The two doors the PRO entry screen offers. `team` redeems an invite code
 *  against an org; `solo` redeems a license key against nothing but itself. */
export type ProEntryPath = 'team' | 'solo';
export const PRO_ENTRY_PATHS: readonly ProEntryPath[] = ['team', 'solo'];

/* ---- 2. what exists ------------------------------------------------------- */

/** The seam's two company pane ids, named here because this file decides
 *  whether they are drawn and a third copy of a string literal is how a seam
 *  silently unpairs (see teamsSeam.tsx on the same point). */
export const TEAM_ROW = 'team';
export const REQUESTS_ROW = 'requests';

export interface SoloNav {
  /** The company pane ids this standing may be offered. An ALLOW LIST: the
   *  caller intersects it with the rows the seam actually contributes, so a
   *  row that exists only inside an org stays the seam's business. */
  companyRows: readonly string[];
  /** Whether Team knowledge, the founder's "computer brain", exists here. */
  teamKnowledge: boolean;
  /** Whether to draw the ONE offer of a team. True exactly when neither of the
   *  two families is reachable, which is what solo means. */
  offerTeams: boolean;
  /** Whether this install has a license of its own to manage. Same condition,
   *  named separately because they are two different rows and a later plan may
   *  separate them. */
  ownLicense: boolean;
}

/**
 * Which destinations are real for a standing.
 *
 * Composed with `can()` over the two families in ./permissions, never from a
 * second copy of the table: `network` is "may this person do anything at all
 * with a teammate", and a standing that can do nothing with a teammate has no
 * business being shown the Team row.
 */
export function navFor(standing: OrgStanding): SoloNav {
  const network = NETWORK_PERMS.some((p) => can(standing, p));
  const teamKnowledge = KNOWLEDGE_PERMS.some((p) => can(standing, p));
  return {
    companyRows: network ? [TEAM_ROW, REQUESTS_ROW] : [],
    teamKnowledge,
    offerTeams: !network && !teamKnowledge,
    ownLicense: !network && !teamKnowledge
  };
}

/** The rows a sidebar may draw, filtered from whatever the seam offered.
 *  Generic so the sidebar keeps its own row type and this file never learns
 *  what a rail row looks like. */
export function keepCompanyRows<T extends { id: string }>(standing: OrgStanding, rows: readonly T[]): T[] {
  const allowed = navFor(standing).companyRows;
  return rows.filter((r) => allowed.includes(r.id));
}

/** The panes those rows open. Solo gets none of them: a pane nothing can
 *  navigate to is the defect proNav.ts exists to prevent, and a pane a solo
 *  person CAN navigate to would be the empty room. */
export function keepCompanyPanes<T>(standing: OrgStanding, panes: Record<string, T>): Record<string, T> {
  if (navFor(standing).companyRows.length === 0) return {};
  return panes;
}

/* ---- 3. the console ------------------------------------------------------- */

/**
 * A solo person's own console page: where the license key is bought, read back
 * and managed, exactly as `consoleUrl` sends an admin to the org's pages. Not
 * added to `ConsolePage` in ./consoleLinks because that union is the ORG's
 * pages and a solo person has no org; the origin is shared so a dev console
 * overrides both at once.
 */
export function soloConsoleUrl(origin: string = CONSOLE_ORIGIN): string {
  return `${origin.replace(/\/+$/, '')}/console/license`;
}

/* ---- 4. the bridge this needs from main ----------------------------------- */

/**
 * Why a redemption did not happen. `invalid`, `used`, `expired` and `refused`
 * are the server's answers and mirror the invite code's `CodeError` word for
 * word where the meaning is the same, so one set of habits covers both.
 *
 * `unavailable` is RENDERER ONLY and main must never send it: it is what the
 * app says when this build has no redemption bridge at all, so the screen
 * reports an honest absence instead of a promise that silently does nothing.
 */
export type LicenseRedeemError = 'invalid' | 'used' | 'expired' | 'offline' | 'refused' | 'unavailable';

export const LICENSE_REDEEM_ERRORS: readonly LicenseRedeemError[] = [
  'invalid', 'used', 'expired', 'offline', 'refused', 'unavailable'
];

/** Every refusal the FIELD can make before any network call, from
 *  ./licenseKey's `checkLicense`. Listed so the copy for each can be checked
 *  against the union rather than against somebody's memory of it. */
export const LICENSE_PROBLEMS: readonly LicenseProblem[] = [
  'empty', 'looks-like-invite', 'wrong-prefix', 'wrong-length', 'bad-character', 'bad-checksum'
];

export type LicenseRedeemResult =
  | { ok: true; license: LicenseView }
  | { ok: false; error: LicenseRedeemError; detail: string | null };

/**
 * WHAT MAIN MUST SUPPLY, declared here and implemented on the other side of
 * the fanout (the console and the redemption endpoint are a separate lane).
 * The renderer reads it off `window.cth` defensively, the same way it reads
 * every other optional teams door, so a build without it degrades to "no
 * license on this machine" rather than throwing.
 */
export interface SoloProBridge {
  /** The license this machine has redeemed, or null. Two file reads, the same
   *  shape as `teamsMembership`. Never the server round trip. */
  soloLicense(): Promise<LicenseView | null>;
  /** Pushed whenever the record changes: a redemption, a refresh, a lapse. */
  onSoloLicense(cb: (view: LicenseView | null) => void): () => void;
  /** Redeem a key that already passed `checkLicense`. Writes the record on
   *  success and writes nothing on any refusal. */
  soloRedeemLicense(key: string): Promise<LicenseRedeemResult>;
}

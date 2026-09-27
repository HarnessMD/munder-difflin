/**
 * WHO MAY DO WHAT, in one function.
 *
 * The desktop learns the signed-in person's standing from the relay's `/me`
 * (src/main/teamsOrg.ts → OrgView.you.isAdmin) and from the Teams mode
 * (src/shared/teams.ts TeamsMode). Neither is a role; together they are. This
 * file is the only place that turns them into a yes or a no, so a screen
 * never asks `isAdmin` directly and a new permission cannot be added without
 * a row in the table below (test/permissions.test.cjs asserts every cell).
 *
 * THE RULE, from the founder (2 Sep 2026): admins see admin things; members
 * never see pricing, billing, seats or invites. Solo has no org, so it has no
 * org permissions at all; what it sees instead is the offer to upgrade.
 *
 * SOLO IS A STANDING PEOPLE ACTUALLY REACH NOW (founder, 4 Sep 2026). Between
 * 3 and 4 September the membership gate meant no shipped build could render a
 * single screen to a `solo` standing, so every `can('solo', ...)` answer below
 * was correct and unobservable. PRO now has a solo plan, so those answers are
 * drawn. Nothing in the table moved: what changed is that `src/shared/soloPro.ts`
 * reads it for NAVIGATION as well, so a destination a solo install could only
 * meet a refusal on is not offered at all. See the two families below.
 *
 * Standing is derived, not stored:
 *   solo    no org on this machine (mode 'solo' or 'enrolling')
 *   member  in an org, not an admin, OR in an org whose seat is locked or
 *           degraded — a locked admin is a member until the relay says otherwise,
 *           because every admin action needs the relay anyway
 *   admin   in an org, live, and `/me` says isAdmin
 *
 * Hiding is not enforcing. Main re-checks `isAdmin` on every admin-only IPC
 * and the relay refuses non-admins server side; this table is the FIRST wall,
 * the one that decides what is drawn.
 */
/** Mirrors `TeamsMode` in src/shared/teams.ts on teams/clients-backend (Creed's
 *  branch, about to land). Declared here so this file compiles on both sides
 *  of that merge; once it lands, swap this for `import type { TeamsMode } from './teams'`
 *  and the union below must not drift from it. */
export type TeamsMode = 'solo' | 'enrolling' | 'live' | 'degraded' | 'locked';

export type OrgStanding = 'solo' | 'member' | 'admin';

export type Perm =
  | 'billing.view'        // Subscription & billing page, plan, invoices, payment method
  | 'seats.view'          // seat counts anywhere (toolbar, org panel, drop-up)
  | 'seats.manage'        // add or remove seats
  | 'team.invite'         // mint an invite / grant
  | 'team.permissions'    // change what ANOTHER person's clones may reach
  | 'team.remove'         // remove or suspend a member
  | 'knowledge.add'       // add to Team knowledge (Company Brain ruling 2)
  | 'knowledge.suggest'   // suggest to Team knowledge, the members' one polite write
  | 'self.allow';         // what MY clones allow: per person, never admin-only

export const PERMS: readonly Perm[] = [
  'billing.view', 'seats.view', 'seats.manage', 'team.invite', 'team.permissions',
  'team.remove', 'knowledge.add', 'knowledge.suggest', 'self.allow'
];

/**
 * THE TWO FAMILIES THE FOUNDER NAMED (4 Sep 2026), as sets rather than as a
 * sentence in a comment, because `soloPro.ts` has to compose with them and a
 * sentence cannot be composed with.
 *
 * NETWORK is "the network": the teammate surface. The Team screen, the roster,
 * seats, invites, cross person messaging, and what MY clones allow another
 * person's clones to do. Every one of these needs a second person, and a solo
 * install has none.
 *
 * KNOWLEDGE is "the computer brain": Team knowledge, called Company Brain in
 * the ruling. Both writes into it are here; there is no read permission
 * because reading is what having the team gets you.
 *
 * `billing.view` is in neither on purpose. It is not a team feature, it is an
 * ADMIN one: a member does not see it either, and a solo person manages their
 * licence in their own console rather than on an in app billing page.
 * Together the three cover PERMS exactly, which test/permissions.test.cjs
 * pins so a new permission cannot join the union unfamilied.
 */
export const NETWORK_PERMS: readonly Perm[] = [
  'team.invite', 'team.permissions', 'team.remove',
  'seats.view', 'seats.manage', 'self.allow'
];
export const KNOWLEDGE_PERMS: readonly Perm[] = ['knowledge.add', 'knowledge.suggest'];

/** A permission that only exists once there is a team. The union of the two
 *  families above; `billing.view` is not one of these. */
export function isTeamOnly(perm: Perm): boolean {
  return (NETWORK_PERMS as readonly string[]).includes(perm)
    || (KNOWLEDGE_PERMS as readonly string[]).includes(perm);
}

const ADMIN_ONLY: ReadonlySet<Perm> = new Set<Perm>([
  'billing.view', 'seats.view', 'seats.manage', 'team.invite', 'team.permissions',
  'team.remove', 'knowledge.add'
]);
const MEMBER_TOO: ReadonlySet<Perm> = new Set<Perm>(['knowledge.suggest', 'self.allow']);

/**
 * Admin SURVIVES `degraded` and not `locked` (god's ruling, 2 Sep 2026):
 * degraded means the server has not been reached lately, locked means the
 * person no longer has standing, and only the second is a demotion. An admin
 * offline still sees their own org's billing; OrgPanel shows `fetchedAt`, so
 * the staleness is visible rather than hidden. May move with the founder's
 * 3.1 ruling (whether losing a seat locks the whole app).
 */
export function standingOf(mode: TeamsMode, isAdmin: boolean): OrgStanding {
  if (mode === 'solo' || mode === 'enrolling') return 'solo';
  if ((mode === 'live' || mode === 'degraded') && isAdmin) return 'admin';
  return 'member';
}

export function can(standing: OrgStanding, perm: Perm): boolean {
  if (standing === 'admin') return ADMIN_ONLY.has(perm) || MEMBER_TOO.has(perm);
  if (standing === 'member') return MEMBER_TOO.has(perm);
  // solo: `self.allow` is meaningful only inside an org, so nothing at all.
  // What a solo install is OFFERED instead of each of these is decided in
  // ./soloPro, which reads this function; never add a solo exception here.
  return false;
}

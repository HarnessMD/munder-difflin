/**
 * THE SCREENS PRO SHIPS WITH, as a CLOSED union.
 *
 * The rail this replaces keyed its panes by an open enum (`PaneId`, see
 * professional/railState.ts) so a fork could add a destination without editing
 * the file. The cost showed up as a defect: `'tasks'` and `'askme'` were declared,
 * had rows, and had NO pane branch, so both fell through to the org chart and
 * nobody noticed because nothing could. A closed union makes that a type error
 * in ProShell's switch, and test/pro-nav.test.cjs makes it a test failure for
 * the sidebar rows, which are strings by the time they reach a button.
 *
 * The Teams seam still contributes panes by string id (`team`, `requests`,
 * `thread`, `org`). Those stay OUTSIDE this union on purpose: they are Creed's
 * to add and rename, and the shell reaches them through `extraPanes` exactly as
 * the old layout did. `isProScreen()` is the one place that decides whether an
 * id is ours.
 *
 * WHICH OF THEM EXIST IS A SECOND QUESTION (4 Sep 2026, the solo plan). The
 * union says what PRO can draw; `navFor` in @shared/soloPro says what THIS
 * install may reach, and a solo install may reach none of the seam's rows. The
 * two questions are answered in two places and joined here, so the sidebar and
 * the pane table cannot end up with different ideas of what exists: both go
 * through `navFor`, one through `proCompanyRows` below and one through
 * `keepCompanyPanes` in App.tsx.
 */
import { keepCompanyRows, navFor, type SoloNav } from '@shared/soloPro';
import type { OrgStanding } from '@shared/permissions';

export type ProScreen =
  | 'tasks'
  | 'inbox'
  | 'automations'
  | 'memory'
  | 'capabilities'
  | 'puck'
  | 'agents'
  | `agent:${string}`
  | 'temps'
  | 'profile'
  | 'settings'
  | 'updates'
  | 'billing';

/** The fixed screens, in sidebar order. `agent:<id>` is not listed: it is
 *  reached from Agents, never from a row. */
/** A sidebar row: every screen except the agent screen and the drop-up pages. */
export type ProNavScreen = Exclude<ProScreen, `agent:${string}` | ProPage>;
export type ProPage = 'profile' | 'settings' | 'updates' | 'billing';

/** `puck` (7 Sep 2026) is the floating window's own screen: its face, size
 *  and actions, the meetings it recorded and the screenshots it took. Last
 *  of the work rows because it is configured once and visited for its
 *  transcripts, not something a person returns to every hour. */
export const PRO_SCREENS: readonly ProNavScreen[] = [
  'tasks', 'inbox', 'automations', 'memory', 'capabilities', 'puck', 'agents', 'temps'
];

/** The pages under the profile drop-up (phases 4 and 5). Not sidebar rows,
 *  so not in PRO_SCREENS; still screens, so the shell's switch must have a
 *  branch for each (test/pro-phase4.test.cjs). `billing` is drawn only for
 *  `can(standing, 'billing.view')` and answered by main only for an admin. */
export const PRO_PAGES: readonly ProPage[] = ['profile', 'settings', 'updates', 'billing'];

export function isProScreen(id: string): id is ProScreen {
  return id.startsWith('agent:')
    || (PRO_SCREENS as readonly string[]).includes(id)
    || (PRO_PAGES as readonly string[]).includes(id);
}

/** The screen PRO opens on. Agents, because the person opening the app wants
 *  to know what the clones are doing before anything else. Solo included: it
 *  is the one screen every install has. */
export const PRO_HOME: ProScreen = 'agents';

/**
 * The seam rows this standing may be offered, from the rows the seam actually
 * contributed. Solo gets an empty list: the Team row would open the offer to
 * buy a team, and a permanent advertisement is not a destination. The offer is
 * made once instead, from the profile drop-up (ProSidebar).
 *
 * A THIN WRAPPER ON PURPOSE. The rule is in @shared/soloPro so it can be unit
 * tested without React; this is where PRO reads it, so a future reader looking
 * for "why is there no Team row" finds the answer from the nav file rather than
 * from a filter buried in a component.
 */
export function proCompanyRows<T extends { id: string }>(standing: OrgStanding, rows: readonly T[]): T[] {
  return keepCompanyRows(standing, rows);
}

/** Everything else that answer carries: whether Team knowledge exists here,
 *  whether to make the one offer, whether there is a license to manage. */
export function proDestinations(standing: OrgStanding): SoloNav {
  return navFor(standing);
}

/**
 * The one door into the shell from ABOVE it. The titlebar sits in App.tsx,
 * outside ProShell, so its connection chip cannot call `go` directly; it
 * raises this event and the shell answers with the same `go` the sidebar
 * uses (the `cth:` CustomEvent convention, as `cth:open-settings`). The
 * detail names a screen or one of the seam's pane ids; anything else is
 * ignored rather than landing on a blank pane.
 */
export const PRO_NAVIGATE_EVENT = 'cth:pro-navigate';
export function proNavigate(screen: string): void {
  window.dispatchEvent(new CustomEvent(PRO_NAVIGATE_EVENT, { detail: { screen } }));
}

/**
 * Where the desktop sends a person for the things the CONSOLE owns. Minting
 * an invite, changing the seat count, removing a member, the payment method:
 * those are console routes (hive/shared/web/harnessmd, `console.invite.mint.write`
 * and friends, admin auth) and the desktop has no relay route for any of them,
 * so a desktop button for one of them opens the page where it actually
 * happens. The button says so ("in the console"), because a control that
 * silently leaves the app is a surprise and one that pretends to act in the
 * app is a lie.
 *
 * One origin, overridable the same way the sign-in page is
 * (src/main/teamsEnrol.ts SIGNIN_URL), so a dev console works too.
 */
export const CONSOLE_ORIGIN = 'https://app.harnessmd.com';

export type ConsolePage = 'members' | 'billing' | 'settings';

export function consoleUrl(page: ConsolePage, origin: string = CONSOLE_ORIGIN): string {
  return `${origin.replace(/\/+$/, '')}/console/${page}`;
}

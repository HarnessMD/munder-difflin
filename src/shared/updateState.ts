/**
 * Update notice status model + presentation mapping.
 *
 * Releases are source only: a GitHub release carries notes and GitHub's own
 * source archive, and people build the app themselves. So the app never
 * downloads or installs anything. Main (src/main/updater.ts) polls
 * releases/latest and reports what it found, the toolbar badge
 * (src/renderer/src/components/UpdateBadge.tsx), the toast and Settings render
 * it, and the rules that matter (which state wins when two arrive out of order,
 * what the button says and does) live here where they can be unit tested
 * without booting Electron.
 */

export type UpdateStatus =
  /** Nothing known yet (fresh window, or dev build where we never check). */
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'not-available' }
  /** A newer release is out. `url` is its page on GitHub. `notes` is its body,
   *  read from the same releases/latest reply, so the toast can show what is
   *  new without a second request. */
  | { state: 'available'; version: string; url: string; notes?: string }
  /** First launch after the version moved: `version` is the one now RUNNING and
   *  `notes` its release body, so the renderer can show that release's page. */
  | { state: 'just-updated'; version: string; notes?: string }
  | { state: 'error'; message: string };

export type UpdateAction = 'none' | 'check' | 'open-release';

/** Where releases are published. GitHub redirects the old name, and the poll
 *  follows one redirect, but this is the name to keep current. */
export const REPO = 'HarnessMD/munder-difflin';

/** The newer release a status knows about, or null. */
export function pendingVersion(status: UpdateStatus | null, current: string): string | null {
  if (status?.state !== 'available') return null;
  return isNewer(status.version, current) ? status.version : null;
}

export interface UpdateBadgeView {
  /** Extra text beside the version, or null to show the version alone. */
  label: string | null;
  /** What a click does. 'none' renders the badge non-interactive. */
  action: UpdateAction;
  tone: 'idle' | 'busy' | 'ready' | 'warn';
  /** Tooltip — the only place the underlying error is ever surfaced verbatim. */
  title: string;
  busy: boolean;
}

/** `1.2.3` / `v1.2.3` -> [1,2,3]; null for anything that isn't semver-ish. */
export function parseVersion(v: string): [number, number, number] | null {
  const m = String(v ?? '').trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

/**
 * Should the "what's new" release drop open on this launch?
 *
 * `previous` is the `last-run-version` stamp (null when the file does not
 * exist), `current` is the running version.
 *
 * The drop used to require a stamp to already be present, which meant it fired
 * for almost nobody: the stamp AND its reader shipped in the same release, so
 * no earlier install had the file, `previous` read null on the upgrade INTO
 * that release, and a genuinely fresh install had nothing either.
 *
 *   - same version relaunch  -> false. Seen once is seen.
 *   - never run before       -> true.  The fresh-install case that was missing.
 *   - version moved forward  -> true.  The ordinary upgrade.
 *   - version moved BACKWARD -> false. A downgrade has nothing new to announce.
 *
 * Note the forward test is "not a downgrade", not `isNewer(current, previous)`.
 * `isNewer` compares major.minor.patch only and discards `-rc.N`, so a second
 * RC of the same version (0.4.7-rc.1 -> 0.4.7-rc.2) is neither newer nor older;
 * asking "is this a downgrade?" lets that case through DELIBERATELY (a new
 * build does have new notes) while still refusing a real downgrade. Doing it
 * here rather than by teaching `isNewer` about prereleases keeps the change off
 * the badge/pending state machine, which reads `isNewer` for other decisions.
 */
export function shouldShowReleaseDrop(previous: string | null, current: string): boolean {
  if (previous === current) return false;
  if (previous === null) return true;
  return !isNewer(previous, current);
}

/** How much a state says. A state that says more is never replaced by one
 *  that says less for the SAME version; see `reduceStatus`. */
function rank(s: UpdateStatus): number {
  switch (s.state) {
    case 'idle': return 0;
    case 'checking': return 1;
    case 'not-available': return 1;
    case 'error': return 1;
    case 'just-updated': return 1;
    case 'available': return 2;
  }
}

function versionOf(s: UpdateStatus): string | null {
  return 'version' in s ? s.version : null;
}

/**
 * The second, quieter action some states carry beside the primary one. With a
 * newer release named, the primary button opens its page, and this keeps
 * "check again" on offer beside it.
 */
export function secondaryUpdateAction(status: UpdateStatus | null): 'check' | null {
  return status?.state === 'available' ? 'check' : null;
}

/**
 * Fold a new status into the current one.
 *
 * The rule that matters: once a newer release has been named, the 6 hourly
 * re-check (or a manual "check now") must NOT wipe the notice out from under
 * the person reading it. `checking`, `not-available` and a transient `error`
 * all rank lower and lose. A genuinely NEWER version always wins, so a long
 * running app that sees 0.3.7 after 0.3.6 was announced moves forward.
 */
export function reduceStatus(prev: UpdateStatus | null, next: UpdateStatus): UpdateStatus {
  if (!prev) return next;
  const pv = versionOf(prev);
  const nv = versionOf(next);
  if (pv && nv && isNewer(nv, pv)) return next;   // a newer release supersedes
  if (pv && nv && pv !== nv) return next;         // different (e.g. rolled back) release
  return rank(next) >= rank(prev) ? next : prev;
}

/**
 * What the toolbar badge shows and does for a given status.
 *
 * `currentVersion` is the running app's version — it is always rendered next to
 * the logo, so every one of these views is "v0.3.6" plus at most one extra chip.
 */
export function describeUpdate(status: UpdateStatus | null, currentVersion: string): UpdateBadgeView {
  const v = currentVersion;
  const pending = pendingVersion(status, v);
  if (pending) {
    return {
      label: `v${pending} available`, action: 'open-release', tone: 'ready', busy: false,
      title: `v${pending} is out. Click to open its release page.`
    };
  }
  switch (status?.state) {
    case 'checking':
      return { label: 'checking…', action: 'none', tone: 'busy', busy: true, title: `Checking for updates (you're on v${v})` };
    case 'error':
      return {
        label: 'update check failed', action: 'check', tone: 'warn', busy: false,
        title: `${status.message} — click to try again`
      };
    case 'not-available':
    case 'just-updated':
      // A check has confirmed it, so say so. Idle (no check yet) stays bare.
      return { label: 'latest', action: 'check', tone: 'idle', busy: false, title: `v${v} is the latest version — click to check again` };
    case 'idle':
    default:
      return { label: null, action: 'check', tone: 'idle', busy: false, title: `v${v} — click to check for updates` };
  }
}

export interface UpdateSettingsView {
  /** Headline: the version that matters right now, yours or the newer one. */
  headline: string;
  /** One sentence of explanation. Carries the verbatim error when there is one. */
  detail: string;
  /** Primary button label, or null while a check is in flight and there is
   *  nothing useful to press. */
  button: string | null;
  action: UpdateAction;
  busy: boolean;
  tone: 'idle' | 'busy' | 'ready' | 'warn';
}

/**
 * What the Settings → General "Updates" block shows and does.
 *
 * Separate from `describeUpdate` on purpose. The toolbar chip has room for two
 * words and has to stay quiet when nothing is happening, so its idle state says
 * nothing at all; Settings is where someone goes *to ask*, so every state gets a
 * full sentence and, outside a check in flight, a button. The states and the
 * transitions between them are shared, which is the part that has to stay in
 * sync.
 */
export function describeUpdateSettings(
  status: UpdateStatus | null,
  currentVersion: string
): UpdateSettingsView {
  const v = currentVersion;
  switch (status?.state) {
    case 'checking':
      return {
        headline: `You're on v${v}`,
        detail: 'Checking for a newer release…',
        button: null, action: 'none', busy: true, tone: 'busy'
      };
    case 'available':
      return {
        headline: `v${status.version} is available`,
        detail: `You're on v${v}. Releases ship as source, so build it the way you built this one.`,
        button: 'Open release page', action: 'open-release', busy: false, tone: 'ready'
      };
    case 'just-updated':
      return {
        headline: `You're on v${v}`,
        detail: 'Freshly updated. This is the latest release.',
        button: 'Check for updates', action: 'check', busy: false, tone: 'idle'
      };
    case 'error':
      return {
        headline: 'Update check failed',
        detail: `${status.message} (you're on v${v}).`,
        button: 'Try again', action: 'check', busy: false, tone: 'warn'
      };
    case 'not-available':
      return {
        headline: `v${v} is the latest version`,
        detail: "You're already up to date — nothing to install.",
        button: 'Check again', action: 'check', busy: false, tone: 'idle'
      };
    case 'idle':
    default:
      return {
        headline: `You're on v${v}`,
        detail: 'Updates are checked automatically every 6 hours. Check now if you want to be sure.',
        button: 'Check for updates', action: 'check', busy: false, tone: 'idle'
      };
  }
}

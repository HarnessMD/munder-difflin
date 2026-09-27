/**
 * WHEN THE APP IS BACK (0.5.2, card v052-startup-restore-loading).
 *
 * The founder's first launch of 0.5.1: the window opened with last session's
 * agents still spinning up, nothing on it answered a click, and the release
 * notes drop sat on top of that. Two faults in one moment. The drop was
 * offered off app-ready rather than off restore-complete, and the restore had
 * no loading state of its own in Classic and only a partial one in PRO
 * (reattached sessions, not respawned ones).
 *
 * This is the one answer to "is the restore over", pure so a test can drive
 * it. Everything the renderer knows about the restore is folded in here:
 *
 *   reconciled     App has asked main which terminals survived (listPtys) and
 *                  sorted the roster into live and restorable. Before that
 *                  answer the restorable list is empty and means nothing.
 *   reconnecting   agents still stamped `reconnecting…`, whose session main
 *                  is reattaching.
 *   restorable     workers whose terminal died with the last session and
 *                  wait for the automatic restore to respawn them.
 *   autoRestore    the boot restore: not started, running, or finished
 *                  (finished with failures counts as finished; the failures
 *                  show on the floor and are not a reason to hold the app).
 *
 * A WAY OUT, ALWAYS. A restore that hangs, a session that never reattaches,
 * a spawn that never answers: none of them may hold the person forever. Two
 * exits, both here: a hard cap, and a skip the overlay offers after a few
 * seconds. An app you cannot get into is worse than a roster briefly wrong.
 */

export type AutoRestorePhase = 'idle' | 'running' | 'done';

export interface BootGateInput {
  /** A KNOWN answer. The renderer must not ask while the config is still
   *  loading (store/bootGate.ts holds the question until it is): asked with
   *  false on App's first frame, this read "fresh install, nothing to
   *  restore", latched, and the blur never drew for anyone (0.5.2, found by
   *  rendering the real gate through React before the tag). */
  onboardingComplete: boolean;
  reconciled: boolean;
  reconnecting: number;
  restorable: number;
  autoRestore: AutoRestorePhase;
  /** Spawns of the running restore that have answered, restored or failed.
   *  The restore is one batch and the roster fills only after it, so this is
   *  the only way the line can move while the batch runs. */
  landed: number;
  /** Since the window first rendered. */
  elapsedMs: number;
  /** The person pressed "continue without waiting". */
  skipped: boolean;
}

/** Never hold the app longer than this, however many sessions are stuck.
 *  Counted from the moment the shell is on screen (store/bootGate.ts), not
 *  from page load, so a sign-in, the paywall or the hive picker before it
 *  spends none of the budget. Thirty seconds, not twenty: the founder's own
 *  eleven-agent restore answers over about fifteen seconds after it fires,
 *  and a fourteen-agent team ran past twenty with agents still landing. */
export const BOOT_WAIT_CAP_MS = 30_000;
/** The skip is offered after this long, so a quick restore never shows it. */
export const BOOT_SKIP_AFTER_MS = 3_000;

/** True once the restore is over, capped, or skipped. A fresh install, or a
 *  machine that is not yet through onboarding, has nothing to restore and is
 *  settled at once. */
export function bootSettled(i: BootGateInput): boolean {
  if (!i.onboardingComplete) return true;
  if (i.skipped) return true;
  if (i.elapsedMs >= BOOT_WAIT_CAP_MS) return true;
  if (!i.reconciled) return false;
  if (i.reconnecting > 0) return false;
  if (i.autoRestore === 'running') return false;
  // Restorable agents and a restore that has not started: the delay before
  // the automatic restore fires. Waiting here is what keeps the drop from
  // landing in that gap.
  if (i.autoRestore === 'idle' && i.restorable > 0) return false;
  return true;
}

/** How many agents are still on their way back, for the loader's line. */
export function bootRemaining(i: BootGateInput): number {
  const restoring = i.autoRestore === 'done' ? 0 : Math.max(0, i.restorable - i.landed);
  return i.reconnecting + restoring;
}

/** Whether the overlay should offer the way out yet. */
export function bootSkippable(i: BootGateInput): boolean {
  return !bootSettled(i) && i.elapsedMs >= BOOT_SKIP_AFTER_MS;
}

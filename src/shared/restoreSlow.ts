/**
 * MD_RESTORE_SLOW_MS (0.5.2, card v052-restore-loading-test-command): a dev
 * switch that staggers every agent spawn in a run, so the boot restore can be
 * WATCHED. The restore gate and its loading state exist for the seconds in
 * which last session's team is coming back, and on a fast machine those
 * seconds are gone before a person can look at them. With the variable set
 * the Nth spawn of the run waits N times the value, so a five agent team
 * comes back one after another and the gate is on screen for the whole of
 * it.
 *
 * Pure and import-free so a test can pin it without electron. The decision
 * is: nothing in a packaged app (the switch can never reach a user, the same
 * rule as MD_NO_GOD), nothing for a value that is not a positive integer of
 * milliseconds, nothing for a sequence number below one; else value times
 * the sequence number.
 */
export function slowSpawnDelayMs(envValue: string | undefined, seq: number, packaged: boolean): number {
  if (packaged) return 0;
  if (!Number.isInteger(seq) || seq < 1) return 0;
  const raw = (envValue ?? '').trim();
  if (!/^\d+$/.test(raw)) return 0;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) return 0;
  return value * seq;
}

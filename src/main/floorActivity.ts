/** Pure activity-time policy kept separate from filesystem signal collection. */
export function isFloorActivityQuiet(
  activityTimes: Iterable<number>, thresholdMs: number, now = Date.now()
): boolean {
  let latest = 0;
  for (const value of activityTimes) {
    if (Number.isFinite(value) && value > latest) latest = value;
  }
  // No evidence is not evidence of quiet; preserve the heartbeat's fail-safe.
  return latest > 0 && now - latest > thresholdMs;
}

/**
 * Ask before leaving a section with unsaved settings. Integrations holds its
 * changes as a draft until Save; leaving it, by another Settings row or by
 * closing Settings, must not drop that draft without a word. So the section
 * holding a draft registers a guard here, and every door that leaves it goes
 * through `guardedLeave`.
 *
 * One guard at a time, because one section is on show. A guard answers true
 * when it has taken the leave over (it asks, and calls `proceed` itself once
 * the person has answered), false to let it through at once.
 */
export type LeaveGuard = (proceed: () => void) => boolean;

let guard: LeaveGuard | null = null;

/** Register the guard of the section on show. The returned function takes it
 *  away again, and only if it is still the one registered. */
export function setLeaveGuard(next: LeaveGuard): () => void {
  guard = next;
  return () => { if (guard === next) guard = null; };
}

/** Leave the section on show: at once, or once its guard has asked. */
export function guardedLeave(proceed: () => void): void {
  if (guard && guard(proceed)) return;
  proceed();
}

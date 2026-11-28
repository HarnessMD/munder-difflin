/** The floor's feed of needs a fix notices (main's `hive:degraded`). Main keeps each one until a floor takes it
 *  (src/main/degradedPending.ts): this takes what waits now, when the surface mounts, and again on every push, so a
 *  notice raised before the floor was up (the sign in door, onboarding) is shown when it mounts, once. A preload
 *  without the take hands the push itself on. Returns the unsubscribe. */
export interface DegradedEvent { agentId: string; name: string; reason: string; message: string }

export function followDegraded(show: (e: DegradedEvent) => void): (() => void) | undefined {
  const api = window.cth;
  // Typed as always there, but a test's window (or an older preload) may lack it.
  const take = api?.hiveTakeDegraded as (() => Promise<DegradedEvent[]>) | undefined;
  let live = true;
  const pull = (): void => {
    if (!take) return;
    void take().then((list) => { if (live) for (const e of list) show(e); }, () => { /* none to take: the pushes still arrive */ });
  };
  pull();
  const off = api?.onHiveDegraded?.((evt) => { if (!take) show(evt); else pull(); });
  return () => { live = false; off?.(); };
}

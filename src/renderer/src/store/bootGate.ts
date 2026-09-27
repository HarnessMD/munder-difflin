/**
 * The renderer's side of `@shared/bootGate`: the facts the pure decision
 * needs, gathered from the store and the restore driver, and the two things
 * only the renderer knows: whether App's PTY reconcile has answered, and
 * whether the person skipped the wait.
 *
 * ONE LATCH. Once the boot is settled it stays settled for the life of the
 * window: a manual "restore team" an hour later is not a boot and must not
 * blur the app again, and the release drop, once allowed, must not be taken
 * back by a later state change.
 *
 * TWO THINGS LEARNED BEFORE THE 0.5.2 TAG, by rendering this module through
 * React with App's real inputs (test/boot-gate-wiring.test.cjs):
 *   1. App's first frame has no config yet. Fed as `onboardingComplete:
 *      false`, the pure decision read "fresh install, nothing to restore",
 *      the latch closed on frame one, and the blur never drew for anyone,
 *      the drop was never held. Unknown is held here as "not decided yet".
 *   2. The clock ran from page load. A sign-in, the paywall, or Classic's
 *      hive picker sits between page load and the shell, so a licence pasted
 *      eight minutes in met a gate that had capped long ago. The clock now
 *      starts when the shell is on screen (App mounts <BootClock/> below
 *      every door), which is also where the cap and the skip are counted.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { useStore } from '@/store/store';
import { autoRestorePhase, restoreLanded, subscribeRestore } from '@/hooks/useRestoreTeam';
import { bootRemaining, bootSettled, bootSkippable, type BootGateInput } from '@shared/bootGate';

/** When the shell first came on screen; null before that. The cap and the
 *  skip count from here, so no door before the shell spends the budget. */
let t0: number | null = null;
let reconciled = false;
let skipped = false;
let settledLatch = false;
/** The `reconnecting…` count, reported by the one hook that can read the
 *  marker without a circular import (ProBooting.tsx owns the literal). */
let latestReconnecting = 0;
/** What App knows about onboarding: undefined until the config has loaded.
 *  Undefined is "not decided yet", never "not onboarded". */
let latestOnboarding: boolean | undefined = undefined;
const subs = new Set<() => void>();

function emit(): void {
  for (const fn of [...subs]) fn();
}

function subscribe(fn: () => void): () => void {
  subs.add(fn);
  const offRestore = subscribeRestore(fn);
  const offStore = useStore.subscribe(fn);
  return () => { subs.delete(fn); offRestore(); offStore(); };
}

/** App.tsx, the moment `reconcileWithLivePtys` has run. */
export function markReconciled(): void {
  if (reconciled) return;
  reconciled = true;
  emit();
}

/** App, the first time its main return is on screen, below every door. */
export function markBootShellMounted(): void {
  if (t0 !== null) return;
  t0 = Date.now();
  emit();
}

/** The overlay's way out. */
export function skipBootWait(): void {
  if (skipped) return;
  skipped = true;
  emit();
}

function inputs(): BootGateInput {
  return {
    onboardingComplete: latestOnboarding === true,
    reconciled,
    reconnecting: latestReconnecting,
    restorable: useStore.getState().restorableAgents.length,
    autoRestore: autoRestorePhase(),
    landed: restoreLanded(),
    elapsedMs: t0 === null ? 0 : Date.now() - t0,
    skipped,
  };
}

function settledNow(): boolean {
  if (settledLatch) return true;
  // No config yet: not decided, and above all not latched.
  if (latestOnboarding === undefined) return false;
  if (bootSettled(inputs())) settledLatch = true;
  return settledLatch;
}

export interface BootGateView {
  settled: boolean;
  remaining: number;
  skippable: boolean;
}

/**
 * The gate, for the overlay. `reconnecting` is passed in rather than read
 * here so this module never imports the marker's owner; `onboardingComplete`
 * is undefined until the config has loaded. Ticks while the boot is open so
 * the cap and the skip offer arrive on time without an event; the tick is
 * what carries the cap, since the clock may start after this effect does.
 */
/** The whole view as one primitive, so a change in ANY part of it re-renders
 *  the reader. With only `settled` as the snapshot, a spawn landing (the
 *  count), the skip becoming available (three seconds) and the cap all left
 *  the snapshot unchanged, and the overlay re-rendered only when something
 *  else in the shell happened to: the line sat on the full count until the
 *  last spawn answered (found by mounting the boot, 0.5.2, before the tag). */
function viewKey(): string {
  if (settledNow()) return 'settled';
  const i = inputs();
  return `${bootRemaining(i)}|${bootSkippable(i) ? 1 : 0}`;
}

export function useBootGate(report: { reconnecting: number; onboardingComplete: boolean | undefined }): BootGateView {
  latestReconnecting = report.reconnecting;
  latestOnboarding = report.onboardingComplete;
  const key = useSyncExternalStore(subscribe, viewKey, viewKey);
  const settled = key === 'settled';
  useEffect(() => {
    if (settled) return;
    const id = setInterval(emit, 250);
    return () => { clearInterval(id); };
  }, [settled]);
  if (settled) return { settled: true, remaining: 0, skippable: false };
  const [remaining, skippable] = key.split('|');
  return { settled: false, remaining: Number(remaining), skippable: skippable === '1' };
}

/** For the surfaces that must wait for the boot: the release drop above all.
 *  Reads the same latch the overlay writes, so the drop cannot open while the
 *  blur is up and cannot be held back once it is down. */
export function useBootSettled(): boolean {
  return useSyncExternalStore(subscribe, settledNow, settledNow);
}

/** Test seam. Nothing in the app calls this. */
export function _resetBootGateForTests(): void {
  t0 = null;
  reconciled = false;
  skipped = false;
  settledLatch = false;
  latestReconnecting = 0;
  latestOnboarding = undefined;
}

/**
 * THE LICENSE, RENDERER SIDE.
 *
 * Main owns the record (a solo person's license key, redeemed once and cached
 * so the machine can start up and tell the truth offline). This store reads it
 * once and subscribes to changes, the same shape and the same reasoning as
 * team/teamsMode.ts: no localStorage, because a cached copy here would be a
 * second source of truth for the one thing the gate exists to have exactly one
 * of.
 *
 * `known` IS NOT A DETAIL. The first read is a round trip, and during it the
 * honest answer is "not yet", not "no license". Without it a licensed solo
 * person would see their entry screen flash up on every launch, which is the
 * app telling them it has forgotten who they are. App.tsx holds the window
 * blank for that one trip, exactly as it already does for the config.
 *
 * THE REDEMPTION ENDPOINT IS NOT THIS LANE'S. `SoloProBridge` in
 * @shared/soloPro declares the three doors main must open; every one is read
 * optionally, so a build without them answers "no license" and reports
 * `unavailable` instead of throwing or, worse, pretending.
 */
import { useSyncExternalStore } from 'react';
import type { LicenseView } from '@shared/licenseKey';
import type { LicenseRedeemResult, SoloProBridge } from '@shared/soloPro';

type Snapshot = { license: LicenseView | null; known: boolean };

let current: Snapshot = { license: null, known: false };
let started = false;
const subscribers = new Set<() => void>();

function set(next: Snapshot): void {
  if (next.license === current.license && next.known === current.known) return;
  current = next;
  subscribers.forEach((fn) => fn());
}

function bridge(): Partial<SoloProBridge> | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.cth as unknown as Partial<SoloProBridge> | undefined;
}

function start(): void {
  if (started) return;
  started = true;
  const api = bridge();
  // No bridge (the preview harness, a test, a build whose main half has not
  // landed): the answer is "no license" and it is known immediately. Nothing
  // waits on a door that does not exist.
  if (!api?.soloLicense) { set({ license: null, known: true }); return; }
  void api.soloLicense().then(
    (v) => set({ license: v ?? null, known: true }),
    () => set({ license: null, known: true })
  );
  api.onSoloLicense?.((v) => set({ license: v ?? null, known: true }));
}

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  return () => { subscribers.delete(onChange); };
}

/** The license this machine has redeemed, and whether main has answered yet. */
export function useSoloLicense(): Snapshot {
  start();
  return useSyncExternalStore(subscribe, () => current);
}

/**
 * Redeem a key main has never seen. The caller has already run `checkLicense`,
 * so everything this can report is the server's answer or the absence of a way
 * to ask. On success the record is mirrored here immediately: main pushes too,
 * but the screen that redeemed must not wait on a push to move on.
 */
export async function redeemLicense(key: string): Promise<LicenseRedeemResult> {
  const api = bridge();
  if (!api?.soloRedeemLicense) {
    return { ok: false, error: 'unavailable', detail: null };
  }
  try {
    const res = await api.soloRedeemLicense(key);
    if (res.ok) set({ license: res.license, known: true });
    return res;
  } catch (e) {
    // Main threw rather than answering. That is a refusal with a sentence, and
    // the sentence is shown rather than branched on.
    return { ok: false, error: 'refused', detail: e instanceof Error ? e.message : null };
  }
}

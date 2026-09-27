/**
 * The one door to the role bundle sheet (v0.4.9 W-B). A module store like
 * agentSheetStore: the Capabilities header and the agent room's details
 * panel both call `openBundleSheet`, and BundleSheetHost (mounted once in
 * ProShell, inside the pane provider so its toast can open the agent) draws
 * the sheet. `agentId` preselects the agent when the call comes from a room.
 */
import { useSyncExternalStore } from 'react';

export interface BundleSheetTarget { agentId?: string }

let target: BundleSheetTarget | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

export function openBundleSheet(next: BundleSheetTarget = {}): void {
  target = next;
  notify();
}
export function closeBundleSheet(): void {
  if (target === null) return;
  target = null;
  notify();
}
function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => { subs.delete(cb); };
}
const read = () => target;
export function useBundleSheet(): BundleSheetTarget | null {
  return useSyncExternalStore(subscribe, read, read);
}

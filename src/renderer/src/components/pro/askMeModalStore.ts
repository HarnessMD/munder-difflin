/**
 * The one door to the Ask me modal (0.5.3, the Pro rail V2 founder
 * requirements). A module store like bundleSheetStore: the agent screen's
 * bell and the Ask me section on every agent's Inbox thread both call
 * `openAskMe`, and AskMeModalHost (mounted once in ProShell) draws the sheet.
 * `taskId` opens it on that question; without one it opens on the whole list.
 */
import { useSyncExternalStore } from 'react';

export interface AskMeTarget { taskId?: string }

let target: AskMeTarget | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

export function openAskMe(next: AskMeTarget = {}): void {
  target = next;
  notify();
}
export function closeAskMe(): void {
  if (target === null) return;
  target = null;
  notify();
}
function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => { subs.delete(cb); };
}
const read = () => target;
export function useAskMe(): AskMeTarget | null {
  return useSyncExternalStore(subscribe, read, read);
}

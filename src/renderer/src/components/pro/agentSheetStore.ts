/**
 * The one PRO door for adding or editing an agent (decision D3: one sheet for
 * both, PRO only; Classic keeps its wizard). A module store, like depth.ts:
 * the grid's Add card, the sidebar, the onboarding "Change" button and the
 * agent room's "Open the full editor" all call `openAgentSheet`, and
 * AgentSheetHost (mounted once in ProShell) draws the sheet.
 */
import { useSyncExternalStore } from 'react';

export type AgentSheetTarget = { mode: 'add' } | { mode: 'edit'; agentId: string };

let target: AgentSheetTarget | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

export function openAgentSheet(next: AgentSheetTarget): void {
  target = next;
  notify();
}
export function closeAgentSheet(): void {
  if (target === null) return;
  target = null;
  notify();
}
function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => { subs.delete(cb); };
}
const read = () => target;
export function useAgentSheet(): AgentSheetTarget | null {
  return useSyncExternalStore(subscribe, read, read);
}

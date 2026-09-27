/**
 * WHAT THE PRO SIDEBAR READS OF AN AGENT (0.5.3, F25 groundwork; Pam's audit
 * in hive/shared/design/sidebar-pro/v3/HANDOFF.md). It orders, searches,
 * groups the list and counts who is live: nine fields. The store is asked
 * for those and nothing else (store/agentSlices.ts), so a pty chunk reaches
 * the one row it is about and never the sidebar.
 */
import { agentSliceHook, type AgentSlice } from '@/store/agentSlices';

const FIELDS = ['name', 'isGod', 'project', 'note', 'description', 'model', 'provider', 'status'] as const;

export type SidebarAgent = AgentSlice<(typeof FIELDS)[number]>;

/** The roster as the sidebar lists it: live, and quiet about hook chunks. */
export const useSidebarAgents: () => SidebarAgent[] = agentSliceHook(FIELDS);

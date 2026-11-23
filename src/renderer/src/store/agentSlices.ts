/**
 * A LIST SURFACE'S VIEW OF THE ROSTER (0.5.3, F25 groundwork; Pam's audit).
 *
 * A surface that orders, groups or counts agents needs a few fields of
 * every agent, and used to subscribe to the whole array, so the pty
 * parser's per chunk write (action, progress, context) re-rendered it and
 * every row under it. `agentSliceHook(fields)` makes a hook that asks the
 * store for those fields only, compared field by field: a chunk that
 * changes nothing the surface draws is a write it never hears. The rows
 * read their own record through `useAgent`, so nothing drawn is stale.
 *
 * The slice for an agent is cached against the agent's object, which the
 * store keeps for every agent a patch did not touch; a patched agent whose
 * listed fields are unchanged keeps its old slice too. So the selector's
 * array is shallow equal to the last one exactly when nothing here moved.
 */
import { useShallow } from 'zustand/react/shallow';
import { useStore, type Agent } from './store';

export type AgentSlice<K extends keyof Agent> = Pick<Agent, K | 'id'>;

export function agentSliceHook<K extends keyof Agent>(fields: readonly K[]): () => AgentSlice<K>[] {
  const keys = Array.from(new Set<keyof Agent>(['id', ...fields])) as (K | 'id')[];
  const slices = new Map<string, { src: Agent; slice: AgentSlice<K> }>();
  const sliceOf = (a: Agent): AgentSlice<K> => {
    const hit = slices.get(a.id);
    if (hit && hit.src === a) return hit.slice;
    const next = {} as AgentSlice<K>;
    for (const k of keys) (next as Record<string, unknown>)[k] = a[k];
    if (hit && keys.every((k) => hit.slice[k] === next[k])) {
      hit.src = a;
      return hit.slice;
    }
    slices.set(a.id, { src: a, slice: next });
    return next;
  };
  const select = (s: { agents: Agent[] }): AgentSlice<K>[] => {
    const out = s.agents.map(sliceOf);
    // An agent that left the roster leaves the cache with it.
    if (slices.size !== out.length) {
      const live = new Set(out.map((x) => x.id));
      for (const id of slices.keys()) if (!live.has(id)) slices.delete(id);
    }
    return out;
  };
  return () => useStore(useShallow(select));
}

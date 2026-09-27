/**
 * ONE AGENT OUT OF THE STORE, BY ID (0.5.3, F25 groundwork).
 *
 * A row that takes the whole agent from its parent renders whenever the
 * parent does, and the parent renders on every hook event of every agent.
 * A row that asks the store for its own agent renders only when THAT record
 * changes: `updateAgent` keeps every untouched agent's object (store.ts,
 * `a.id === id ? { ...a, ...patch } : a`), so the selector's answer is the
 * same reference until this agent's own patch lands, and zustand skips the
 * render. Both skins' rows read through here.
 *
 * The lookup is indexed per roster array rather than a `find` per row per
 * store write: with N rows that would be N scans of N on every chunk the
 * pty parser writes.
 */
import { useStore, type Agent } from './store';

const index = new WeakMap<readonly Agent[], Map<string, Agent>>();

/** The agent with this id in this roster, or undefined once it is gone. */
export function agentIn(agents: readonly Agent[], id: string): Agent | undefined {
  let byId = index.get(agents);
  if (!byId) {
    byId = new Map(agents.map((a) => [a.id, a]));
    index.set(agents, byId);
  }
  return byId.get(id);
}

/** Live: this agent's record, re-rendering the caller only when it changes. */
export function useAgent(id: string): Agent | undefined {
  return useStore((s) => agentIn(s.agents, id));
}

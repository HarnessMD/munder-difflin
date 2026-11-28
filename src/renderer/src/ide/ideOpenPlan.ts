/**
 * What an "open in IDE" does when the IDE is already open. Pure, no React, so
 * it can be tested in node.
 */
import { ownerOfPath } from './ownerOfPath';

/** An open asked of the IDE: a file, a workspace, or only "come forward". */
export interface IdeOpenRequest {
  path: string | null;
  agentId: string | null;
}

export type IdeOpenPlan =
  | { kind: 'open'; rel: string }
  | { kind: 'switch'; agent: { id: string; name: string; cwd: string }; cwd: string }
  | { kind: 'blocked'; name: string; file: string | null }
  | { kind: 'none' };

/**
 * What an open does in an IDE that is already showing `root`. The panel stays
 * open across opens, so it must take them after it is mounted: the same
 * workspace opens the file; another workspace is switched to by the project
 * switcher's own rule, which refuses while anything is unsaved, and then the
 * person is told why the file did not open.
 */
export function planIdeOpen<A extends { id: string; name: string; cwd?: string }>(opts: {
  root: string | null;
  anyDirty: boolean;
  agents: ReadonlyArray<A>;
  req: IdeOpenRequest;
}): IdeOpenPlan {
  const { root, anyDirty, agents, req } = opts;
  const named = req.agentId ? agents.find((a) => a.id === req.agentId) ?? null : null;
  const owner = req.path ? ownerOfPath(agents, req.path) : null;
  const who = owner ?? named;
  const cwd = who?.cwd || null;
  const file = req.path ? req.path.split('/').pop() ?? req.path : null;
  if (who && cwd && cwd !== root) {
    if (anyDirty) return { kind: 'blocked', name: who.name, file };
    return { kind: 'switch', agent: { id: who.id, name: who.name, cwd }, cwd };
  }
  if (req.path && root) {
    const prefix = root.endsWith('/') ? root : `${root}/`;
    if (req.path.startsWith(prefix)) return { kind: 'open', rel: req.path.slice(prefix.length) };
  }
  return { kind: 'none' };
}

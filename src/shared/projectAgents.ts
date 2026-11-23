/**
 * WHO WORKS ON A PROJECT (task force 0.5.8 round 2, item 5): the cards of the
 * Projects view's agents panel, worked out from what already exists.
 *
 * - Every linked worktree of the project's repo (`git worktree list`), named by
 *   the agent whose `worktreePath` it is, else by the folder the app made it in
 *   (the folder name is the agent or temp id, and survives a restart).
 * - Every agent whose own folder is the project or inside it, with no worktree.
 * - A temp is marked as one; when it is torn down its worktree goes, and so
 *   does its card.
 *
 * Working or Idle comes from the agent's state; a worktree nobody in the
 * roster owns is Working while a terminal runs in it (the list's `live`).
 *
 * Pure: the renderer hands in what it read. Paths are compared with forward
 * slashes and, on Windows, without regard to case.
 */
import { isTempAgentId } from './tempAgent';

export interface ProjectAgentInput {
  id: string;
  name: string;
  cwd?: string;
  worktreePath?: string;
  working: boolean;
}
export interface ProjectWorktreeInput { path: string; branch: string | null }
export interface ProjectOwnedInput { path: string; name: string; live: boolean }

export interface ProjectAgentCard {
  /** Stable key: the folder the card is about. */
  key: string;
  /** The roster agent, or null for a worktree only its folder names. */
  agentId: string | null;
  name: string;
  temp: boolean;
  /** The folder its files are in: its worktree, or its own folder. */
  path: string;
  /** Its own worktree (Open files and Compare), or false for an agent working
   *  in the project's own checkout. */
  ownWorktree: boolean;
  branch: string | null;
  working: boolean;
  /** For a plain folder: where it works, relative to the project ('' is the whole folder). */
  folderRel: string;
}

export function normPath(p: string, windows: boolean): string {
  let s = p.replace(/\\/g, '/');
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return windows ? s.toLowerCase() : s;
}

/** True when `child` is `parent` or inside it. */
export function isInside(child: string, parent: string, windows: boolean): boolean {
  const c = normPath(child, windows);
  const p = normPath(parent, windows);
  return c === p || c.startsWith(p.endsWith('/') ? p : `${p}/`);
}

function relOf(child: string, parent: string, windows: boolean): string {
  const c = child.replace(/\\/g, '/').replace(/\/$/, '');
  const p = parent.replace(/\\/g, '/').replace(/\/$/, '');
  if (normPath(c, windows) === normPath(p, windows)) return '';
  return c.slice(p.length + 1);
}

const folderName = (p: string): string => p.replace(/\\/g, '/').replace(/\/$/, '').split('/').pop() ?? p;

export function projectAgentCards(opts: {
  root: string;
  /** The repo's worktrees, the main checkout included, or [] for a plain folder. */
  worktrees: ReadonlyArray<ProjectWorktreeInput>;
  owned: ReadonlyArray<ProjectOwnedInput>;
  agents: ReadonlyArray<ProjectAgentInput>;
  windows: boolean;
}): ProjectAgentCard[] {
  const { root, worktrees, owned, agents, windows } = opts;
  const n = (p: string) => normPath(p, windows);
  const cards: ProjectAgentCard[] = [];
  const seenAgents = new Set<string>();
  const rootBranch = worktrees.find((w) => n(w.path) === n(root))?.branch ?? null;

  for (const wt of worktrees) {
    if (n(wt.path) === n(root)) continue;
    const agent = agents.find((a) => a.worktreePath && n(a.worktreePath) === n(wt.path))
      ?? agents.find((a) => a.id === folderName(wt.path) && !a.worktreePath);
    const row = owned.find((o) => n(o.path) === n(wt.path));
    // A worktree the app did not make, and no agent owns, is someone else's: not a card.
    if (!agent && !row) continue;
    const id = agent?.id ?? row?.name ?? folderName(wt.path);
    if (agent) seenAgents.add(agent.id);
    cards.push({
      key: n(wt.path),
      agentId: agent?.id ?? null,
      name: agent?.name ?? id,
      temp: isTempAgentId(id),
      path: wt.path,
      ownWorktree: true,
      branch: wt.branch,
      working: agent ? agent.working : !!row?.live,
      folderRel: ''
    });
  }

  for (const a of agents) {
    if (seenAgents.has(a.id) || !a.cwd || !isInside(a.cwd, root, windows)) continue;
    cards.push({
      key: `${n(a.cwd)}#${a.id}`,
      agentId: a.id,
      name: a.name,
      temp: isTempAgentId(a.id),
      path: a.cwd,
      ownWorktree: false,
      branch: rootBranch,
      working: a.working,
      folderRel: relOf(a.cwd, root, windows)
    });
  }

  // Working first, then by name, so the busy ones are at the top.
  return cards.sort((x, y) => Number(y.working) - Number(x.working) || x.name.localeCompare(y.name));
}

/** The name an "also changing" line or a folder note uses: the one agent
 *  working in that folder, else null ("An agent"). */
export function onlyAgentIn(cards: ReadonlyArray<ProjectAgentCard>, absPath: string, windows: boolean): string | null {
  const in_ = cards.filter((c) => isInside(absPath, c.path, windows));
  return in_.length === 1 ? in_[0].name : null;
}

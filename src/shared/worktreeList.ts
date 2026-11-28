/**
 * The worktree list and its delete rule (0.5.3, feature 24).
 *
 * Every isolated agent and every temp gets its own git worktree, a second full
 * checkout of the project. The app reclaims one only when its work has landed,
 * and since 0.5.3 a crashed agent KEEPS a dirty one (shared/worktreeFate.ts).
 * Both are right, and both leave folders nobody can see. This is the rule for
 * the one place a person finds and removes them.
 *
 * Pure, so the rule is tested without git or Electron. main/worktreeAdmin.ts
 * applies it with real git and a real disk.
 */

/** One folder under a worktrees root, as the screen first shows it. Everything
 *  here is read from the disk without running git, so the list is instant
 *  however many folders there are. What the folder HOLDS is asked per row
 *  (WorktreeWork): measured on the founder's own machine, 46 worktrees of a
 *  large project took over two minutes when the list waited for git. */
export interface WorktreeRow {
  /** Absolute folder. Also the id the renderer hands back to delete it. */
  path: string;
  /** Folder name, which is the agent or temp id it was made for. */
  name: string;
  /** Main checkout it belongs to. Null when it is not a linked worktree. */
  projectRoot: string | null;
  /** Checked out branch, or null when detached or unknown. */
  branch: string | null;
  /** Folder creation time, epoch ms. 0 when the disk would not say. */
  createdAt: number;
  /** A running terminal has this folder, or one inside it, as its cwd. */
  live: boolean;
}

/** What a folder holds, asked of git one row at a time. */
export interface WorktreeWork {
  /** Branch the unmerged count is measured against. Null when the app no longer
   *  remembers it: the count is then commits that are on no other branch. */
  base: string | null;
  /** False when git could not answer. An unknown is treated as holding work. */
  known: boolean;
  /** Changed or new files that are in no commit. Lost for good on delete. */
  uncommitted: number;
  /** Commits the base branch does not have. They stay on the branch. */
  unmerged: number;
}

/** Does deleting this folder put anything at risk? Unknown counts as yes. */
export function worktreeHoldsWork(w: Pick<WorktreeWork, 'known' | 'uncommitted' | 'unmerged'>): boolean {
  return !w.known || w.uncommitted > 0 || w.unmerged > 0;
}

export type WorktreeDeleteRefusal =
  /** Not a folder directly under a worktrees root this app created. */
  | 'outside'
  /** A running agent is in it. Never removable, confirmed or not. */
  | 'live'
  /** Git does not know it as a worktree, so `git worktree remove` cannot run. */
  | 'not-a-worktree'
  /** Holds work and the person has not said yes to losing it. */
  | 'needs-confirm';

/**
 * May this folder be removed? The order is the point: where it is, then who is
 * in it, then what is in it. `confirmed` only ever answers the last question,
 * so no flag from the renderer can remove a live agent's folder or one outside
 * the roots.
 */
export function worktreeDeleteVerdict(
  f: { underRoot: boolean; live: boolean; isWorktree: boolean; work: Pick<WorktreeWork, 'known' | 'uncommitted' | 'unmerged'> },
  confirmed: boolean
): { ok: true } | { ok: false; code: WorktreeDeleteRefusal } {
  if (!f.underRoot) return { ok: false, code: 'outside' };
  if (f.live) return { ok: false, code: 'live' };
  if (!f.isWorktree) return { ok: false, code: 'not-a-worktree' };
  if (worktreeHoldsWork(f.work) && !confirmed) return { ok: false, code: 'needs-confirm' };
  return { ok: true };
}

/** Is `child` the folder `parent` or somewhere inside it? Both already resolved. */
export function isSameOrInside(parent: string, child: string, sep: string): boolean {
  if (!parent || !child) return false;
  const p = parent.endsWith(sep) ? parent.slice(0, -sep.length) : parent;
  return child === p || child.startsWith(p + sep);
}

/** Size for the list: "812 B", "1.4 GB", "240 MB". */
export function worktreeSizeLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) { n /= 1024; u++; }
  return `${u === 0 || n >= 100 ? Math.round(n) : n.toFixed(1)} ${units[u]}`;
}

/** Whole days since `createdAt`. Null when the time is unknown. */
export function worktreeAgeDays(createdAt: number, now: number): number | null {
  if (!createdAt || createdAt > now) return null;
  return Math.floor((now - createdAt) / 86_400_000);
}

/** Removable before running, then oldest: a running agent's folder cannot be
 *  deleted, so it is the row least worth a look, and the oldest are the likeliest
 *  to be forgotten. */
export function sortWorktreeRows(rows: readonly WorktreeRow[]): WorktreeRow[] {
  return [...rows].sort((a, b) =>
    Number(a.live) - Number(b.live)
    || (a.createdAt || Infinity) - (b.createdAt || Infinity)
    || a.name.localeCompare(b.name));
}

/** One sentence the row shows about what a folder holds: a key under
 *  `settings.worktrees`, with the numbers it needs. The sentence is chosen HERE
 *  by `count === 1`, the house pattern, because the locales carry no plural keys. */
export interface WorktreeWorkLine { key: string; count?: number; base?: string; risky: boolean }

export function worktreeWorkLines(w: WorktreeWork): WorktreeWorkLine[] {
  if (!w.known) return [{ key: 'unknown', risky: true }];
  const out: WorktreeWorkLine[] = [];
  if (w.uncommitted > 0) out.push({ key: w.uncommitted === 1 ? 'uncommittedOne' : 'uncommittedMany', count: w.uncommitted, risky: true });
  if (w.unmerged > 0) {
    const one = w.unmerged === 1;
    out.push(w.base
      ? { key: one ? 'notInBaseOne' : 'notInBaseMany', count: w.unmerged, base: w.base, risky: true }
      : { key: one ? 'onlyHereOne' : 'onlyHereMany', count: w.unmerged, risky: true });
  }
  return out.length ? out : [{ key: 'clean', risky: false }];
}

/** The age sentence, same pattern. Null when the age is unknown. */
export function worktreeAgeLine(createdAt: number, now: number): { key: string; count: number } | null {
  const d = worktreeAgeDays(createdAt, now);
  if (d === null) return null;
  return { key: d === 0 ? 'ageToday' : d === 1 ? 'ageOne' : 'ageMany', count: d };
}

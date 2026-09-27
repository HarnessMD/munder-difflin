/**
 * The task ledger as PRO reads it. One poll, shared shape, and the two
 * inverses the sheet needs (what a card waits on, what it unblocks). Since
 * 0.4.9 (W-A) also the archive ledger, read only while the Archived chip is
 * on, and the hygiene thresholds every task surface draws from.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { parseTasks, type HiveTask } from '../TasksKanban';
import { resolveTaskHygiene, type TaskHygieneConfig } from '@shared/taskHygiene';
import { resolveTask } from '@shared/ticketKeys';
import { inDateWindow, type DateWindow } from '@shared/taskTimes';

/** The ledger, live. Since 0.5.3 one module level poll shared by every
 *  caller (store/taskLedger.ts, Pam's audit): nine hook instances used to be
 *  nine timers and nine parses of the same file. Same shape as before. */
export { useTaskLedger } from '@/store/taskLedger';

/** The archive ledger (hive/tasks-archive.json), polled only while `active`:
 *  it changes once an hour at most, and nobody looks at it by default. Null
 *  until the first read lands; an empty array is a real, empty archive. */
export function useTaskArchive(active: boolean, pollMs = 30_000): { tasks: HiveTask[] | null; refresh: () => Promise<void> } {
  const [tasks, setTasks] = useState<HiveTask[] | null>(null);
  const refresh = useCallback(async () => {
    const api = window.cth;
    if (!api?.hiveTasksArchive) return;
    try { setTasks(parseTasks(await api.hiveTasksArchive())); } catch { /* keep the last read */ }
  }, []);
  useEffect(() => {
    if (!active) return;
    void refresh();
    const id = window.setInterval(() => { void refresh(); }, pollMs);
    return () => window.clearInterval(id);
  }, [active, refresh, pollMs]);
  return { tasks, refresh };
}

/* ---- the hygiene thresholds, fed once by ProShell (same shape as depth.ts) --
 * The Tasks screen, the Inbox's Ask me thread and the task sheet all draw the
 * Stale chip and the "still open" reminder from these; threading the config
 * through three prop chains for five numbers would be the wrong trade. */
let hygiene: TaskHygieneConfig = resolveTaskHygiene(undefined);
const hygieneSubs = new Set<() => void>();

export function setTaskHygieneConfig(partial: Partial<TaskHygieneConfig> | undefined): void {
  const next = resolveTaskHygiene(partial);
  if (
    next.doneArchiveDays === hygiene.doneArchiveDays && next.staleFlagDays === hygiene.staleFlagDays
    && next.staleArchiveDays === hygiene.staleArchiveDays && next.askNagDays === hygiene.askNagDays
    && next.boardTokenCap === hygiene.boardTokenCap
  ) return;
  hygiene = next;
  hygieneSubs.forEach((f) => f());
}
function subscribeHygiene(cb: () => void): () => void {
  hygieneSubs.add(cb);
  return () => { hygieneSubs.delete(cb); };
}
const readHygiene = (): TaskHygieneConfig => hygiene;

export function useTaskHygiene(): TaskHygieneConfig {
  return useSyncExternalStore(subscribeHygiene, readHygiene, readHygiene);
}

/** Cards this one waits on, resolved; unknown ids are dropped, not invented. */
export function waitsOn(task: HiveTask, all: HiveTask[]): HiveTask[] {
  // By key or by the id the card had before it was keyed (0.5.3 ticket keys).
  return task.dependsOn.map((id) => resolveTask(all, id)).filter((t): t is HiveTask => !!t);
}

/** Cards that list this one in dependsOn: what finishing it unblocks. */
export function unblocks(task: HiveTask, all: HiveTask[]): HiveTask[] {
  return all.filter((t) => t.id !== task.id && (t.dependsOn.includes(task.id) || (!!task.alias && t.dependsOn.includes(task.alias))));
}

/** The history a card can HONESTLY show: the ledger stores no event trail, so
 *  it is the timestamps the card carries, created plus every ask, answer and
 *  dismissal, oldest first. Nothing is inferred. */
export function taskHistory(task: HiveTask): { at: string; kind: 'created' | 'asked' | 'answered' | 'dismissed' }[] {
  const out: { at: string; kind: 'created' | 'asked' | 'answered' | 'dismissed' }[] = [{ at: task.createdAt, kind: 'created' }];
  for (const e of task.humanQA ?? []) {
    if (e.askedAt) out.push({ at: e.askedAt, kind: 'asked' });
    if (e.answeredAt) out.push({ at: e.answeredAt, kind: 'answered' });
    if (e.dismissedAt) out.push({ at: e.dismissedAt, kind: 'dismissed' });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/** 'archived' switches the SOURCE (the caller hands in the archive ledger);
 *  over that list it filters like 'all'. */
export type TaskFilter = 'all' | 'asks' | 'unassigned' | 'archived' | `agent:${string}`;

/** `window` is the date control (0.5.3): a done card counts by its doneAt,
 *  any other by its latest activity; local time, weeks start Monday. */
export function filterTasks(tasks: HiveTask[], filter: TaskFilter, query: string, hasOpenAsk: (t: HiveTask) => boolean, window: DateWindow = 'all', now: Date = new Date()): HiveTask[] {
  const q = query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (!inDateWindow(t, window, now)) return false;
    if (filter === 'asks' && !hasOpenAsk(t)) return false;
    if (filter === 'unassigned' && t.assignee) return false;
    if (filter.startsWith('agent:') && t.assignee !== filter.slice('agent:'.length)) return false;
    if (q && !`${t.title}\n${t.id}\n${t.description ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

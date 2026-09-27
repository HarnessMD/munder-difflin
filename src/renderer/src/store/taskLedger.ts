/**
 * THE TASK LEDGER, READ ONCE (0.5.3, F25 groundwork; Pam's audit in
 * hive/shared/design/sidebar-pro/v3/HANDOFF.md).
 *
 * `useTaskLedger` used to be a poll per hook instance: nine callers in PRO
 * and the Classic strip's own, each with its own interval and its own
 * parse of hive/tasks.json, each handing every subscriber a fresh array so
 * everything below it rendered on every tick. Here the renderer keeps ONE
 * copy of the ledger. One timer runs while anybody is listening, at the
 * shortest interval anybody asked for; one read is in flight at a time; a
 * tick that returns the same ledger keeps the same array, so nobody
 * renders for a poll that changed nothing. `refresh` is the same function
 * for everyone, so a screen that writes a card and re-reads still works
 * and the read it forces is shared too.
 *
 * The assignee index is built once per ledger, not once per row: a
 * sidebar with N rows asking "what is this agent's ticket" is N map reads,
 * not N scans of the ledger.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { parseTasks, type HiveTask } from '../components/TasksKanban';

let ledger: HiveTask[] | null = null;
let raw = '';
const subs = new Set<() => void>();
/** Every mounted hook's interval, keyed by a token; the timer runs at the minimum. */
const wants = new Map<object, number>();
let timer: number | null = null;
let timerMs = 0;
let inflight: Promise<void> | null = null;

function notify(): void {
  subs.forEach((f) => f());
}

/** Read the ledger through the door once; concurrent callers share the read.
 *  Resolves when the read has landed (or failed and kept the last ledger). */
export function refreshTaskLedger(): Promise<void> {
  if (inflight) return inflight;
  const api = typeof window === 'undefined' ? undefined : window.cth;
  if (!api?.hiveTasks) return Promise.resolve();
  inflight = (async () => {
    try {
      const got = await api.hiveTasks();
      // The same file is the same ledger: keep the array so subscribers do
      // not render for a tick that changed nothing.
      const text = JSON.stringify(got ?? null);
      if (ledger !== null && text === raw) return;
      raw = text;
      ledger = parseTasks(got);
      byAssignee = null;
      notify();
    } catch {
      /* keep the last ledger */
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function retime(): void {
  let min = Infinity;
  for (const ms of wants.values()) min = Math.min(min, ms);
  if (!Number.isFinite(min)) {
    if (timer !== null) { window.clearInterval(timer); timer = null; timerMs = 0; }
    return;
  }
  if (timer !== null && timerMs === min) return;
  if (timer !== null) window.clearInterval(timer);
  timerMs = min;
  timer = window.setInterval(() => { void refreshTaskLedger(); }, min);
}

function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => { subs.delete(cb); };
}
const read = (): HiveTask[] | null => ledger;
/** The ledger as it is right now, for code that is not a hook (the rail's
 *  open mark records which cards were already done). Null before the first read. */
export function readTaskLedger(): HiveTask[] | null { return ledger; }

/** The ledger, live, shared by every caller. Null until the first read lands. */
export function useTaskLedger(pollMs = 5000): { tasks: HiveTask[] | null; refresh: () => Promise<void> } {
  const tasks = useSyncExternalStore(subscribe, read, read);
  useEffect(() => {
    const token = {};
    wants.set(token, pollMs);
    retime();
    // The first listener reads now; later ones get what is already here and
    // the next tick, rather than each forcing a read of their own.
    if (ledger === null) void refreshTaskLedger();
    return () => { wants.delete(token); retime(); };
  }, [pollMs]);
  return { tasks, refresh: refreshTaskLedger };
}

/* ---- the assignee index, one per ledger ---------------------------------- */
let byAssignee: { of: HiveTask[]; map: Map<string, HiveTask[]> } | null = null;
const NONE: HiveTask[] = [];

/** Every card an agent holds, in ledger order; the same array until the
 *  ledger changes, so a memoised row can compare it by reference. */
export function tasksOf(tasks: HiveTask[] | null, assignee: string): HiveTask[] {
  if (!tasks) return NONE;
  if (!byAssignee || byAssignee.of !== tasks) {
    const map = new Map<string, HiveTask[]>();
    for (const t of tasks) {
      if (!t.assignee) continue;
      const list = map.get(t.assignee);
      if (list) list.push(t); else map.set(t.assignee, [t]);
    }
    byAssignee = { of: tasks, map };
  }
  return byAssignee.map.get(assignee) ?? NONE;
}

/** The card a row names for an agent: doing before blocked before todo,
 *  never a done one (the rule AgentsScreen's ticketFor set in 0.4.9). */
const TICKET_ORDER: Record<string, number> = { doing: 0, blocked: 1, todo: 2 };
export function ticketOf(tasks: HiveTask[] | null, assignee: string): HiveTask | null {
  let best: HiveTask | null = null;
  for (const t of tasksOf(tasks, assignee)) {
    if (t.status === 'done') continue;
    if (!best || (TICKET_ORDER[t.status] ?? 9) < (TICKET_ORDER[best.status] ?? 9)) best = t;
  }
  return best;
}

/** Test seam: forget everything, as a fresh renderer would. */
export function resetTaskLedgerForTests(): void {
  ledger = null; raw = ''; byAssignee = null;
  if (timer !== null) { window.clearInterval(timer); timer = null; timerMs = 0; }
  wants.clear();
}

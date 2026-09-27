/**
 * The worker (Temps) ledger's shape and its pure operations. main/workerHistory.ts
 * owns the file; this module owns what a row is, which rows survive a read,
 * and how an append caps the list, so test/worker-history.test.cjs can prove
 * those without electron. Same split as slackHistory.ts.
 *
 * ONE ROW PER TEARDOWN. Every worker death funnels through main's teardownPty
 * (done-release, token-cap reap, idle reap, manual stop, crash), so that is
 * the one place a row is written, and `result` says which of those it was.
 * The row is the only record a temp leaves once its floor card is archived
 * and its worktree is gone; before it existed the Temps tab could show what
 * was running and nothing about what had run.
 */
export type WorkerResult =
  | 'done'       // the worker signalled done (replied in-thread); the only `ok`
  | 'token-cap'  // reaped: cumulative tokens exceeded its cap
  | 'idle'       // reaped: no output for longer than the idle cap
  | 'stopped'    // a person pressed Stop
  | 'exited';    // the PTY ended on its own without signalling done (crash, quit)

export const WORKER_RESULTS: readonly WorkerResult[] = ['done', 'token-cap', 'idle', 'stopped', 'exited'];

/** What became of the isolated worktree, once the async check has run. Null
 *  until then, and null for a worker that never had one. */
export type WorktreeFate = 'removed' | 'preserved';

export interface WorkerHistoryEntry {
  id: string;
  workerId: string;
  reqId: string;
  name: string;
  /** The objective, as dispatched, cut to JOB_MAX chars. Plain text; the Slack
   *  reply command and the autonomy preamble are added at dispatch, not here. */
  job: string;
  baseBranch: string;
  hasSlack: boolean;
  spawnedAt: number;
  endedAt: number;
  tokensUsed: number;
  /** The effective cap at teardown, or null when uncapped. */
  tokenCap: number | null;
  result: WorkerResult;
  ok: boolean;
  worktree: WorktreeFate | null;
}

/** Ledger cap, the same as trigger history (plan 4.8). */
export const WORKER_HISTORY_LIMIT = 500;
export const JOB_MAX = 400;

export type WorkerHistoryInput = Omit<WorkerHistoryEntry, 'id' | 'endedAt' | 'ok' | 'worktree'> & {
  id?: string; endedAt?: number; worktree?: WorktreeFate | null;
};

export function isWorkerResult(v: unknown): v is WorkerResult {
  return typeof v === 'string' && (WORKER_RESULTS as readonly string[]).includes(v);
}

/** Structural guard for one persisted row. A malformed line in the file
 *  drops that line, never the ledger. */
export function isWorkerHistoryEntry(v: unknown): v is WorkerHistoryEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<WorkerHistoryEntry>;
  return typeof e.id === 'string'
    && typeof e.workerId === 'string'
    && typeof e.reqId === 'string'
    && typeof e.name === 'string'
    && typeof e.job === 'string'
    && typeof e.baseBranch === 'string'
    && typeof e.hasSlack === 'boolean'
    && typeof e.spawnedAt === 'number'
    && typeof e.endedAt === 'number'
    && typeof e.tokensUsed === 'number'
    && (e.tokenCap === null || typeof e.tokenCap === 'number')
    && isWorkerResult(e.result)
    && typeof e.ok === 'boolean'
    && (e.worktree === null || e.worktree === 'removed' || e.worktree === 'preserved');
}

/** The file is JSON Lines, newest first. A line that does not parse, or parses
 *  to something that is not a row, is skipped; the rest survive. */
export function parseWorkerHistory(text: string): WorkerHistoryEntry[] {
  const out: WorkerHistoryEntry[] = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    let v: unknown;
    try { v = JSON.parse(s); } catch { continue; }
    if (isWorkerHistoryEntry(v)) out.push(v);
  }
  return out;
}

export function serializeWorkerHistory(entries: WorkerHistoryEntry[]): string {
  return entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : '');
}

/** The ledger with one row added at the front, built FIELD BY FIELD (never a
 *  spread of the caller's object), de-duplicated by id, capped. `ok` is
 *  derived from `result`, not supplied: only `done` is a success. */
export function withWorkerHistoryEntry(current: WorkerHistoryEntry[], input: WorkerHistoryInput, id: string, now: number): { entry: WorkerHistoryEntry; next: WorkerHistoryEntry[] } {
  const entry: WorkerHistoryEntry = {
    id: input.id ?? id,
    workerId: input.workerId,
    reqId: input.reqId,
    name: input.name,
    job: input.job.length > JOB_MAX ? input.job.slice(0, JOB_MAX - 1) + '…' : input.job,
    baseBranch: input.baseBranch,
    hasSlack: input.hasSlack,
    spawnedAt: input.spawnedAt,
    endedAt: input.endedAt ?? now,
    tokensUsed: Math.max(0, Math.round(input.tokensUsed)),
    tokenCap: input.tokenCap != null && input.tokenCap > 0 ? input.tokenCap : null,
    result: input.result,
    ok: input.result === 'done',
    worktree: input.worktree ?? null
  };
  const next = [entry, ...current.filter((e) => e.id !== entry.id)].slice(0, WORKER_HISTORY_LIMIT);
  return { entry, next };
}

/** The one thing that may change after the fact: what became of the worktree,
 *  which is only known once the async unintegrated-work check has run. The
 *  newest row for that worker is the one it belongs to. */
export function withWorktreeFate(current: WorkerHistoryEntry[], workerId: string, fate: WorktreeFate): WorkerHistoryEntry[] {
  const idx = current.findIndex((e) => e.workerId === workerId);
  if (idx < 0) return current;
  const next = current.slice();
  next[idx] = { ...next[idx], worktree: fate };
  return next;
}

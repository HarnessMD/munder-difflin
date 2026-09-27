/**
 * The Temps screen's pure half: which ledger rows a filter keeps, how a
 * duration and a token figure read, and the tone a result carries. No React,
 * no window; test/pro-phase4.test.cjs proves it directly.
 */
import type { WorkerHistoryEntry, WorkerResult } from '@shared/workerHistory';

export type TempsFilter = 'all' | 'done' | 'reaped' | 'stopped';
export const TEMPS_FILTERS: readonly TempsFilter[] = ['all', 'done', 'reaped', 'stopped'];

/** `reaped` is the two automatic reasons plus a PTY that ended on its own:
 *  everything a person did not do and the worker did not finish. */
export function resultBucket(r: WorkerResult): Exclude<TempsFilter, 'all'> {
  if (r === 'done') return 'done';
  if (r === 'stopped') return 'stopped';
  return 'reaped';
}

export function resultTone(r: WorkerResult): 'ok' | 'warn' | 'bad' | 'muted' {
  switch (r) {
    case 'done': return 'ok';
    case 'stopped': return 'muted';
    case 'idle': return 'warn';
    case 'token-cap': return 'bad';
    case 'exited': return 'bad';
  }
}

export function filterHistory(rows: WorkerHistoryEntry[], filter: TempsFilter, q: string): WorkerHistoryEntry[] {
  const needle = q.trim().toLowerCase();
  return rows.filter((r) => {
    if (filter !== 'all' && resultBucket(r.result) !== filter) return false;
    if (!needle) return true;
    return r.name.toLowerCase().includes(needle) || r.job.toLowerCase().includes(needle) || r.workerId.toLowerCase().includes(needle);
  });
}

/** `4s`, `12m`, `2h 05m`, `3d`: the span a worker ran, at the precision a
 *  table column can afford. */
export function fmtSpan(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${String(m % 60).padStart(2, '0')}m`;
  return `${Math.round(h / 24)}d`;
}

export function fmtTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

/** The first line of the objective, for the table; the drawer shows it whole. */
export function jobLine(job: string): string {
  const line = job.split('\n').find((l) => l.trim()) ?? '';
  return line.trim();
}

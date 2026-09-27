/**
 * The worker (Temps) ledger on disk: one row per ephemeral-worker teardown,
 * written from main's teardownPty, the one place every worker death passes.
 * PRO's Temps screen reads it as the history table under the live rows.
 *
 * Same shape and the same reasons as slackHistory.ts: its own file in
 * userData (append-heavy, disposable, never able to cost the user a setting),
 * newest first on disk, capped, every disk touch wrapped so recording a
 * teardown can never fail the teardown. Plan 4.8 named `<harnessHome>/hive/`;
 * the two ledgers before it settled in userData (god accepted the deviation),
 * so this one follows them: the folder that moves with the app, not with the
 * hive, and the same place a person looks for the other two.
 *
 * JSON LINES rather than one JSON document: a row is appended per event and
 * a half-written last line loses that line, not the file (shared/workerHistory.ts
 * `parseWorkerHistory` skips what does not parse; the test proves it).
 */
import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  parseWorkerHistory, serializeWorkerHistory, withWorkerHistoryEntry, withWorktreeFate,
  type WorkerHistoryEntry, type WorkerHistoryInput, type WorktreeFate
} from '../shared/workerHistory';

function historyPath(): string {
  return join(app.getPath('userData'), 'worker-history.jsonl');
}

function readAll(): WorkerHistoryEntry[] {
  const p = historyPath();
  if (!existsSync(p)) return [];
  try { return parseWorkerHistory(readFileSync(p, 'utf8')); } catch { return []; }
}

function writeAll(entries: WorkerHistoryEntry[]): void {
  try {
    const p = historyPath();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, serializeWorkerHistory(entries), 'utf8');
  } catch { /* best-effort; a ledger write must never fail the teardown it records */ }
}

/** Newest first. */
export function listWorkerHistory(): WorkerHistoryEntry[] {
  return readAll();
}

export function appendWorkerHistory(input: WorkerHistoryInput): WorkerHistoryEntry {
  const { entry, next } = withWorkerHistoryEntry(readAll(), input, randomBytes(8).toString('hex'), Date.now());
  writeAll(next);
  return entry;
}

/** Record what became of a worker's worktree once the async check has run. */
export function setWorkerHistoryWorktree(workerId: string, fate: WorktreeFate): void {
  writeAll(withWorktreeFate(readAll(), workerId, fate));
}

export function clearWorkerHistory(): void {
  writeAll([]);
}

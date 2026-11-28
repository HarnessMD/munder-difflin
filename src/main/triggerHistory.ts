/**
 * The trigger ledger on disk — every inbound message a webhook or a peer's clone
 * node pushed at us, and every reply we sent back.
 *
 * It lives in its OWN file rather than in config.json for two reasons: it is
 * append-heavy (config.json is rewritten wholesale on every `writeConfig`, so a
 * growing array in it would make every unrelated settings write more expensive),
 * and it is disposable — losing history must never be able to cost the user their
 * settings. Structurally it follows config.ts: sync fs, mkdirSync-on-write, and a
 * try/catch around every disk touch that degrades to an empty ledger. Nothing here
 * throws at its caller, because the caller is always on a request path where
 * failing to RECORD an event must not fail the event itself.
 *
 * SECURITY — NEVER write a secret, API key or token into an entry. The ledger is
 * plaintext JSON in userData and is surfaced verbatim in the UI, so a webhook
 * secret or an org apiKey landing here would be a durable leak of a live
 * credential. Entries are therefore built FIELD BY FIELD below rather than by
 * spreading the caller's object: a caller that hands us a whole `WebhookTrigger`
 * (which carries `secret`) still gets only the ledger fields persisted.
 */
import { officePaths } from '../core/paths';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  TRIGGER_HISTORY_LIMIT,
  type InboundKind,
  type TriggerHistoryEntry
} from '../shared/triggers';

/** What a caller must supply; `id` and `at` are stamped for them unless the
 *  caller has its own (a replayed/reconstructed entry keeps its identity). */
export type TriggerHistoryInput =
  Omit<TriggerHistoryEntry, 'id' | 'at'> & { id?: string; at?: number };

/** Only these may be changed after the fact. The ledger is append-only in spirit:
 *  an entry's source, direction and body are the record of what happened and are
 *  not rewritable — the mutable part is the operator's verdict on it. */
export type TriggerHistoryPatch = Partial<
  Pick<TriggerHistoryEntry, 'decision' | 'taskId' | 'correlationId' | 'title'>
>;

function historyPath(): string {
  return join(officePaths().userData(), 'trigger-history.json');
}

/** Newest first ON DISK as well as in memory. `listTriggerHistory` is the hot
 *  path (the UI re-reads it on every render of the Triggers tab) and the cap is
 *  enforced on every append, so keeping the file in display order makes both a
 *  slice instead of a sort. */
function readAll(): TriggerHistoryEntry[] {
  const p = historyPath();
  if (!existsSync(p)) return [];
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

function writeAll(entries: TriggerHistoryEntry[]): void {
  try {
    const p = historyPath();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(entries, null, 2), 'utf8');
  } catch { /* best-effort; a ledger write must never fail the event it records */ }
}

/** Structural guard for one persisted row. A hand-edited or partially-written
 *  file drops the bad rows rather than the whole ledger. */
function isEntry(v: unknown): v is TriggerHistoryEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<TriggerHistoryEntry>;
  return typeof e.id === 'string'
    && (e.source === 'webhook' || e.source === 'org')
    && (e.direction === 'inbound' || e.direction === 'outbound')
    && typeof e.body === 'string'
    && typeof e.at === 'number';
}

function normaliseKind(kind: unknown): InboundKind {
  return kind === 'communication' ? 'communication' : 'directive';
}

/**
 * Record one event and return the row as persisted (the caller usually needs the
 * generated `id` so it can flip a `pending` decision later).
 *
 * The returned entry is what went to disk, so callers never have to guess how
 * their input was normalised.
 */
export function appendTriggerHistory(input: TriggerHistoryInput): TriggerHistoryEntry {
  // Explicit field list — see the SECURITY note at the top of this file.
  const entry: TriggerHistoryEntry = {
    id: input.id ?? randomBytes(8).toString('hex'),
    source: input.source,
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    direction: input.direction,
    peer: input.peer,
    title: input.title,
    body: input.body,
    kind: normaliseKind(input.kind),
    decision: input.decision,
    correlationId: input.correlationId,
    taskId: input.taskId,
    at: input.at ?? Date.now()
  };
  writeAll([entry, ...readAll()].slice(0, TRIGGER_HISTORY_LIMIT));
  return entry;
}

/** The whole ledger, newest first. */
export function listTriggerHistory(): TriggerHistoryEntry[] {
  return readAll();
}

/**
 * Amend one entry's verdict — the `pending` → `approved`/`rejected` transition
 * when the operator answers a strict-mode message, plus the `taskId` of whatever
 * the approval spawned. Returns null when the id is gone, which is a normal
 * outcome: the entry may have aged past TRIGGER_HISTORY_LIMIT while the operator
 * was deciding, and that is not an error worth throwing over.
 */
export function updateTriggerHistory(
  id: string,
  patch: TriggerHistoryPatch
): TriggerHistoryEntry | null {
  const all = readAll();
  const i = all.findIndex((e) => e.id === id);
  if (i < 0) return null;
  const next: TriggerHistoryEntry = { ...all[i] };
  if (patch.decision !== undefined) next.decision = patch.decision;
  if (patch.taskId !== undefined) next.taskId = patch.taskId;
  if (patch.correlationId !== undefined) next.correlationId = patch.correlationId;
  if (patch.title !== undefined) next.title = patch.title;
  all[i] = next;
  writeAll(all);
  return next;
}

/** Wipe the ledger, or just one source's half of it (clearing webhook noise
 *  should not throw away the org conversation, and vice versa). Removing the file
 *  outright on a full clear keeps a stale-but-unreadable file from lingering. */
export function clearTriggerHistory(source?: 'webhook' | 'org'): void {
  if (!source) {
    try { rmSync(historyPath(), { force: true }); } catch { /* best-effort */ }
    return;
  }
  writeAll(readAll().filter((e) => e.source !== source));
}

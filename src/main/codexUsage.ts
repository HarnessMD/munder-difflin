/**
 * Codex token usage for the cost ledger and the breaker (#629).
 *
 * A Codex agent pushes no OTel and has no Claude transcript, so telemetry read
 * it as zero tokens. Codex already writes cumulative totals into its rollout
 * JSONL as `event_msg` / `token_count` rows, and every Codex hook payload names
 * that file as `transcript_path`. This reads the newest totals from the tail.
 *
 * Read on hook events only (debounced by CodexUsageScheduler), never polled; async; at most
 * the final 1 MiB; and confined with realpath to the agent's OWN
 * `<CODEX_HOME>/sessions`, so a crafted transcript_path cannot make main read
 * any other file. hive.ts links that sessions dir under ~/.codex/sessions;
 * realpath resolves both sides, so the check holds through the link.
 */
import { open, realpath } from 'node:fs/promises';
import { READ_FLAGS, guardHolds } from '../core/guardedFile';
import { basename, extname, isAbsolute, join, relative } from 'node:path';
import { parseCodexRateLimitsTail } from '../shared/usageLimits';

export interface CodexUsageTail {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  ts: number;
}

const MAX_TAIL_BYTES = 1024 * 1024;
const READ_BLOCK_BYTES = 64 * 1024;

function tokenCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
    && Number.isInteger(value) && value >= 0;
}

/** Parse the newest valid cumulative token_count event in a JSONL tail. */
export function parseCodexUsageTail(text: string): CodexUsageTail | null {
  const lines = text.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    let row: unknown;
    try { row = JSON.parse(lines[i]); } catch { continue; }
    if (!row || typeof row !== 'object') continue;
    const event = row as { timestamp?: unknown; type?: unknown; payload?: unknown };
    if (event.type !== 'event_msg' || !event.payload || typeof event.payload !== 'object') continue;
    const payload = event.payload as { type?: unknown; info?: unknown };
    if (payload.type !== 'token_count' || !payload.info || typeof payload.info !== 'object') continue;
    const usage = (payload.info as { total_token_usage?: unknown }).total_token_usage;
    if (!usage || typeof usage !== 'object') continue;
    const totals = usage as Record<string, unknown>;
    const inputTokens = totals.input_tokens;
    const cachedTokens = totals.cached_input_tokens;
    const outputTokens = totals.output_tokens;
    const cacheWriteTokens = totals.cache_write_input_tokens ?? 0;
    const ts = typeof event.timestamp === 'string' ? Date.parse(event.timestamp) : NaN;
    if (!tokenCount(inputTokens) || !tokenCount(cachedTokens) || !tokenCount(outputTokens)
      || !tokenCount(cacheWriteTokens) || cachedTokens > inputTokens || !Number.isFinite(ts)) continue;
    return {
      input: inputTokens - cachedTokens,
      output: outputTokens,
      cacheRead: cachedTokens,
      cacheCreation: cacheWriteTokens,
      ts
    };
  }
  return null;
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/** Read at most the final 1 MiB after resolving all symlinks/junctions. */
export function readCodexUsage(path: string, agentCodexHome?: string): Promise<CodexUsageTail | null> {
  return readCodexTail(path, agentCodexHome, parseCodexUsageTail);
}

/** The newest rate limits in the same file, read the same guarded way (usage limits, DATA.md). */
export function readCodexRateLimits(path: string, agentCodexHome?: string): Promise<CodexRateLimitsTail | null> {
  return readCodexTail(path, agentCodexHome, parseCodexRateLimitsTail);
}

/** The newest row `parse` finds in the final 1 MiB, confined to the agent's own sessions. */
async function readCodexTail<T>(path: string, agentCodexHome: string | undefined, parse: (text: string) => T | null): Promise<T | null> {
  try {
    const resolvedPath = await realpath(path);
    if (extname(resolvedPath).toLowerCase() !== '.jsonl') return null;

    if (!agentCodexHome) return null;
    const resolvedRoot = await realpath(join(agentCodexHome, 'sessions'));
    if (!isWithin(resolvedRoot, resolvedPath)) return null;

    // Never a plain open: a named pipe swapped in for the file would hold it for good.
    const file = await open(resolvedPath, READ_FLAGS);
    try {
      const opened = await file.stat();
      // A regular file only, asked of the opened handle (src/core/guardedFile.ts).
      if (!guardHolds(path, opened)) return null;
      const size = opened.size;
      const firstByte = Math.max(0, size - MAX_TAIL_BYTES);
      let position = size;
      let tail = Buffer.alloc(0);
      while (position > firstByte) {
        const length = Math.min(READ_BLOCK_BYTES, position - firstByte);
        position -= length;
        const block = Buffer.allocUnsafe(length);
        const { bytesRead } = await file.read(block, 0, length, position);
        if (!bytesRead) break;
        tail = Buffer.concat([block.subarray(0, bytesRead), tail]);
        const text = tail.toString('utf8');
        const firstNewline = text.indexOf('\n');
        const completeTail = position === 0 ? text : firstNewline === -1 ? '' : text.slice(firstNewline + 1);
        const found = parse(completeTail);
        if (found) return found;
      }
      return null;
    } finally {
      await file.close();
    }
  } catch {
    return null;
  }
}

/** The newest rate limits a session file holds (shared/usageLimits.ts). */
export type CodexRateLimitsTail = NonNullable<ReturnType<typeof parseCodexRateLimitsTail>>;

/** One Codex usage snapshot, in the shape telemetry.ingestAgentUsage takes. */
export interface CodexUsageSample extends CodexUsageTail {
  agentId: string;
  sessionId: string;
  model: string;
  usd: number;
}

export interface CodexUsageSchedulerDeps {
  /** The agent's own CODEX_HOME when it is a Codex agent, else null. Asked when
   *  the timer fires, so a Claude agent's hooks never cost a registry read. */
  codexHomeFor(agentId: string): string | null;
  /** Where a fresh snapshot goes (telemetry.ingestAgentUsage in main). */
  ingest(sample: CodexUsageSample): void;
  /** The rollout reader; tests hand in a controllable one. */
  read?: (path: string, agentCodexHome?: string) => Promise<CodexUsageTail | null>;
  /** Debounce per agent. */
  delayMs?: number;
  /** Where the file's newest rate limits go (main/usageLimits.ts). Left out, the file is read once, for tokens only. */
  limits?(agentId: string, tail: CodexRateLimitsTail): void;
  /** The rate limits reader; tests hand in their own. */
  readLimits?: (path: string, agentCodexHome?: string) => Promise<CodexRateLimitsTail | null>;
}

/** Schedules the Codex usage reads for main: debounced per agent, async, never
 *  polled, and dropped when the agent is forgotten while a read is in flight.
 *  forget() bumps a per agent epoch; the timer captures the epoch before it
 *  awaits the read and drops the result when it changed. Without it a read
 *  that finished after teardown would hand the respawned run the dead run's
 *  totals, the #571 bug through another door. No electron import. */
export class CodexUsageScheduler {
  private readonly pending = new Map<string, { timer: ReturnType<typeof setTimeout>; revision: number }>();
  private readonly epochs = new Map<string, number>();

  constructor(private readonly deps: CodexUsageSchedulerDeps) {}

  schedule(agentId: string, transcriptPath: string, sessionId: string, model: string): void {
    if (!agentId || basename(agentId) !== agentId || agentId === '.' || agentId === '..') return;
    // Codex names its rollouts rollout-<time>-<uuid>.jsonl. A string check, so a
    // Claude agent's hooks never cost a registry read here.
    if (!/^rollout-.*\.jsonl$/i.test(basename(transcriptPath))) return;
    const previous = this.pending.get(agentId);
    if (previous) clearTimeout(previous.timer);
    const revision = (previous?.revision ?? 0) + 1;
    const timer = setTimeout(() => {
      void (async () => {
        if (this.pending.get(agentId)?.revision !== revision) return;
        this.pending.delete(agentId);
        const epoch = this.epochOf(agentId);
        const home = this.deps.codexHomeFor(agentId);
        if (!home) return;
        const usage = await (this.deps.read ?? readCodexUsage)(transcriptPath, home);
        // Forgotten while the read was in flight: this is the dead run's total.
        if (this.epochOf(agentId) !== epoch) return;
        if (usage) this.deps.ingest({ agentId, sessionId, model, usd: 0, ...usage });
        if (!this.deps.limits) return;
        const limits = await (this.deps.readLimits ?? readCodexRateLimits)(transcriptPath, home);
        if (limits && this.epochOf(agentId) === epoch) this.deps.limits(agentId, limits);
      })().catch(() => { /* usage telemetry must never affect hook handling */ });
    }, this.deps.delayMs ?? 2_000);
    this.pending.set(agentId, { timer, revision });
  }

  /** The agent's PTY is torn down: cancel a pending read and invalidate one in flight. */
  forget(agentId: string): void {
    const pending = this.pending.get(agentId);
    if (pending) clearTimeout(pending.timer);
    this.pending.delete(agentId);
    this.epochs.set(agentId, this.epochOf(agentId) + 1);
  }

  private epochOf(agentId: string): number {
    return this.epochs.get(agentId) ?? 0;
  }
}

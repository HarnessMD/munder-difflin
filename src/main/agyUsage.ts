/**
 * Antigravity (agy) token usage for the cost ledger and the breaker.
 *
 * An agy agent pushes no OTel and has no Claude transcript, so telemetry read
 * it as zero tokens and caps and the breaker could not act. agy writes each
 * model turn to `<brain>/<conversation id>/.system_generated/logs/
 * transcript_full.jsonl`, one step a line, and a model turn (type
 * PLANNER_RESPONSE) carries that turn's own `input_tokens` (input not read
 * from the cache), `cache_read_tokens` and `output_tokens`. Checked on a real
 * agy 1.4.4 run of ours (hive/shared/eng/sandbox-v1/agy-transcript-sample.jsonl):
 * the two turns add up to the run's own usage total. The totals here are the
 * sum over the file, cumulative, as telemetry.ingestAgentUsage takes them.
 *
 * Read on hook events only (debounced by AgyUsageScheduler), never polled,
 * async. Only the bytes added since the last read are read: the file has
 * every step in full and only grows. The conversation id comes from the
 * hook's session_id, and the file is confined with realpath to agy's own
 * brain folder, so a crafted id cannot make main read any other file.
 */
import { open, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { READ_FLAGS, guardHolds } from '../core/guardedFile';

export interface AgyUsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  ts: number;
}

/** One agy usage snapshot, in the shape telemetry.ingestAgentUsage takes. */
export interface AgyUsageSample extends AgyUsageTotals {
  agentId: string;
  sessionId: string;
  model: string;
  usd: number;
}

/** agy's brain folder for the CLI, where every conversation keeps its logs. */
export const AGY_BRAIN_DIR = join(homedir(), '.gemini', 'antigravity-cli', 'brain');
const CONVERSATION_RE = /^[0-9A-Za-z-]{8,64}$/;
const READ_BLOCK_BYTES = 256 * 1024;
/** A line longer than this is a step's full content, never a token count we need whole. */
const MAX_LINE_BYTES = 64 * 1024 * 1024;

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0 ? value : 0;
}

/** Add one transcript line's tokens to `into`; true when the line was a model turn with tokens. */
export function addAgyStep(line: string, into: AgyUsageTotals): boolean {
  // A cheap test first: most lines are tool output, and parsing each is the cost.
  if (!line.includes('PLANNER_RESPONSE') || !line.includes('_tokens')) return false;
  let row: unknown;
  try { row = JSON.parse(line); } catch { return false; }
  if (!row || typeof row !== 'object') return false;
  const step = row as Record<string, unknown>;
  if (step.type !== 'PLANNER_RESPONSE') return false;
  if (!('input_tokens' in step) && !('output_tokens' in step)) return false;
  into.input += count(step.input_tokens);
  // Thinking is billed as output. The sample run had none, so the name is the
  // run total's (thinking_tokens); a step without it adds nothing.
  into.output += count(step.output_tokens) + count(step.thinking_tokens);
  into.cacheRead += count(step.cache_read_tokens);
  const ts = typeof step.created_at === 'string' ? Date.parse(step.created_at) : NaN;
  if (Number.isFinite(ts)) into.ts = Math.max(into.ts, ts);
  return true;
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/** Where one agent's file was read to, so the next read takes only what was added. */
interface ReadState {
  file: string;
  ino: number;
  offset: number;
  rest: string;
  totals: AgyUsageTotals;
  any: boolean;
}

/** Reads one conversation's totals, from where the last read stopped. */
export class AgyUsageReader {
  private readonly states = new Map<string, ReadState>();

  constructor(private readonly brainDir: string = AGY_BRAIN_DIR) {}

  /** The file a conversation id names, or null when the id is not one. */
  transcriptOf(conversationId: string): string | null {
    if (!CONVERSATION_RE.test(conversationId)) return null;
    return join(this.brainDir, conversationId, '.system_generated', 'logs', 'transcript_full.jsonl');
  }

  async read(agentId: string, conversationId: string): Promise<AgyUsageTotals | null> {
    const path = this.transcriptOf(conversationId);
    if (!path) return null;
    try {
      const resolved = await realpath(path);
      if (!isWithin(await realpath(this.brainDir), resolved)) return null;
      // Never a plain open: a named pipe swapped in for the file would hold it for good.
      const file = await open(resolved, READ_FLAGS);
      try {
        const opened = await file.stat();
        if (!guardHolds(resolved, opened)) return null;
        let state = this.states.get(agentId);
        // A new conversation, a new file under the same name, or one that shrank: read it from the start.
        if (!state || state.file !== resolved || state.ino !== opened.ino || opened.size < state.offset) {
          state = { file: resolved, ino: opened.ino, offset: 0, rest: '', totals: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0, ts: 0 }, any: false };
        }
        const next: ReadState = { ...state, totals: { ...state.totals } };
        while (next.offset < opened.size) {
          const length = Math.min(READ_BLOCK_BYTES, opened.size - next.offset);
          const block = Buffer.allocUnsafe(length);
          const { bytesRead } = await file.read(block, 0, length, next.offset);
          if (!bytesRead) break;
          next.offset += bytesRead;
          const lines = (next.rest + block.subarray(0, bytesRead).toString('utf8')).split('\n');
          next.rest = lines.pop() ?? '';
          // A step's content can be huge; the part kept for the next block never grows past this.
          if (next.rest.length > MAX_LINE_BYTES) next.rest = '';
          for (const line of lines) if (addAgyStep(line, next.totals)) next.any = true;
        }
        this.states.set(agentId, next);
        // A step with no created_at still counts; the sample is then as of this read.
        return next.any ? { ...next.totals, ts: next.totals.ts || Date.now() } : null;
      } finally {
        await file.close();
      }
    } catch {
      return null;
    }
  }

  forget(agentId: string): void {
    this.states.delete(agentId);
  }
}

export interface AgyUsageSchedulerDeps {
  /** True when the agent is an agy agent. Asked when the timer fires, so another provider's hooks never cost a registry read. */
  isAgy(agentId: string): boolean;
  /** Where a fresh snapshot goes (telemetry.ingestAgentUsage). */
  ingest(sample: AgyUsageSample): void;
  /** The reader; tests hand in one on a folder of their own. */
  reader?: Pick<AgyUsageReader, 'read' | 'forget'>;
  /** Debounce per agent. */
  delayMs?: number;
}

/** Schedules the agy usage reads: debounced per agent, async, never polled,
 *  and dropped when the agent is forgotten while a read is in flight (the
 *  CodexUsageScheduler's epoch, for the same #571 reason). No electron import. */
export class AgyUsageScheduler {
  private readonly pending = new Map<string, { timer: ReturnType<typeof setTimeout>; revision: number }>();
  private readonly epochs = new Map<string, number>();
  private readonly reader: Pick<AgyUsageReader, 'read' | 'forget'>;

  constructor(private readonly deps: AgyUsageSchedulerDeps) {
    this.reader = deps.reader ?? new AgyUsageReader();
  }

  schedule(agentId: string, sessionId: string, model: string): void {
    if (!agentId || !CONVERSATION_RE.test(sessionId)) return;
    const previous = this.pending.get(agentId);
    if (previous) clearTimeout(previous.timer);
    const revision = (previous?.revision ?? 0) + 1;
    const timer = setTimeout(() => {
      void (async () => {
        if (this.pending.get(agentId)?.revision !== revision) return;
        this.pending.delete(agentId);
        const epoch = this.epochOf(agentId);
        if (!this.deps.isAgy(agentId)) return;
        const usage = await this.reader.read(agentId, sessionId);
        // Forgotten while the read was in flight: this is the dead run's total.
        if (!usage || this.epochOf(agentId) !== epoch) return;
        this.deps.ingest({ agentId, sessionId, model, usd: 0, ...usage });
      })().catch(() => { /* usage telemetry must never affect hook handling */ });
    }, this.deps.delayMs ?? 2_000);
    this.pending.set(agentId, { timer, revision });
  }

  /** The agent's PTY is torn down: cancel a pending read, invalidate one in flight, start the next run's count afresh. */
  forget(agentId: string): void {
    const pending = this.pending.get(agentId);
    if (pending) clearTimeout(pending.timer);
    this.pending.delete(agentId);
    this.epochs.set(agentId, this.epochOf(agentId) + 1);
    this.reader.forget(agentId);
  }

  private epochOf(agentId: string): number {
    return this.epochs.get(agentId) ?? 0;
  }
}

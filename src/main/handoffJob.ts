/**
 * The handoff job (0.5.6): keeps every agent's handoff.md within its limits.
 *
 * An agent writes one section per piece of work (src/shared/handoff.ts). When
 * the file holds more than 12 sections or more than 200,000 bytes, the oldest
 * sections move word for word into the agent's raw archive
 * (memory-archive-raw*.md, the memory job's writeRawBatch) and the kept text
 * is written back. The archive is written and read back first, so a section
 * never leaves handoff.md before it is in the archive. No AI call.
 *
 * Runs in the Electron main process beside the memory job (reflect.ts), for
 * the same reason: only this process has the folder grant.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { swapOver, writeRawBatch } from './reflect';
import { HANDOFF_FILE, planHandoffTrim } from '../shared/handoff';

/** How often the job looks at every handoff.md. */
export const HANDOFF_JOB_INTERVAL_MS = 600_000;
/** What the raw archive's batch line says the text came from. */
const RAW_SOURCE = 'handoff.md';

/** Outcome of one agent's trim, for the log and the tests. */
export interface HandoffTrimResult {
  trimmed: boolean;
  /** `trimmed`, `no-file`, `nothing-to-move`, or why the run stopped. */
  reason: string;
  detail?: string;
  /** How many sections moved (or would have). */
  sections?: number;
  oldBytes?: number;
  newBytes?: number;
  rawPart?: string;
}

/**
 * Trim one agent's handoff.md. Order is what makes it lossless:
 *   1. append the sections that leave, word for word, to the raw archive and
 *      read them back; only then may they leave handoff.md;
 *   2. write the kept text over the text this run read (swapOver: atomic, and
 *      not at all when the agent edited the file in between; the next run
 *      plans again from the new text, and a batch already in the archive is
 *      not written twice).
 */
export function trimHandoff(agentDir: string, isoTime: string): HandoffTrimResult {
  const path = join(agentDir, HANDOFF_FILE);
  let text: string;
  try { text = readFileSync(path, 'utf8'); } catch { return { trimmed: false, reason: 'no-file' }; }
  const plan = planHandoffTrim(text);
  if (plan.moved.length === 0) return { trimmed: false, reason: 'nothing-to-move' };
  const sections = plan.moved.length;
  const oldBytes = Buffer.byteLength(text, 'utf8');
  // Oldest first, a blank line between two sections.
  const lines = plan.moved.flatMap((s, i) => [...(i ? [''] : []), ...s.text.split('\n')]);
  const raw = writeRawBatch(agentDir, lines, isoTime, RAW_SOURCE);
  if (!raw.ok) return { trimmed: false, reason: 'raw-write-failed', detail: raw.error, sections, oldBytes };
  const swap = swapOver(path, text, plan.keep);
  if (!swap.ok) return { trimmed: false, reason: swap.reason, ...(swap.detail ? { detail: swap.detail } : {}), sections, oldBytes };
  return {
    trimmed: true, reason: 'trimmed', sections, oldBytes,
    newBytes: Buffer.byteLength(plan.keep, 'utf8') + swap.appendedBytes,
    rawPart: basename(raw.part)
  };
}

export class HandoffJob {
  private timer: NodeJS.Timeout | null = null;
  /** Per agent: handoff.md's size and time when a run found nothing to move.
   *  Until the file changes the job does not read it again. */
  private quietAt = new Map<string, string>();

  /**
   * @param getHome   Lazily resolve harnessHome so the job follows config.
   * @param appendLog Sink for `handoff-trim` and `handoff-trim-abort` events.
   */
  constructor(
    private getHome: () => string | null,
    private appendLog: (event: Record<string, unknown>) => void,
    private now: () => number = Date.now
  ) {}

  start(): void {
    if (this.timer || !this.getHome()) return;
    this.timer = setInterval(() => { this.runNow(); }, HANDOFF_JOB_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /** Trim every agent's handoff.md that is over a limit (or just `onlyId`).
   *  Returns the runs that moved something or stopped. */
  runNow(onlyId?: string): Array<HandoffTrimResult & { id: string }> {
    const home = this.getHome();
    if (!home) return [];
    const agentsDir = join(home, 'hive', 'agents');
    let ids: string[];
    try { ids = readdirSync(agentsDir); } catch { return []; }
    if (onlyId) ids = ids.filter((id) => id === onlyId);
    const results: Array<HandoffTrimResult & { id: string }> = [];
    for (const id of ids) {
      const dir = join(agentsDir, id);
      let stamp: string;
      try { const st = statSync(join(dir, HANDOFF_FILE)); stamp = `${st.size}:${st.mtimeMs}`; } catch { continue; }
      if (this.quietAt.get(id) === stamp) continue;
      const r = trimHandoff(dir, new Date(this.now()).toISOString());
      if (r.reason === 'no-file') continue;
      // The stat taken before the read, so a write after it is read next run.
      if (r.reason === 'nothing-to-move') { this.quietAt.set(id, stamp); continue; }
      results.push({ id, ...r });
      try { this.appendLog({ kind: r.trimmed ? 'handoff-trim' : 'handoff-trim-abort', agentId: id, ...r }); }
      catch { /* best-effort */ }
    }
    return results;
  }
}

/**
 * Lifetime cost, recovered from `cost-ledger.jsonl`.
 *
 * WHY THIS EXISTS
 * ───────────────
 * `AgentUsageSample.usd` is a CUMULATIVE-SINCE-PROCESS-START counter, not a
 * lifetime one. `TelemetryCollector` accumulates into in-memory maps
 * (`sessions` / `agentSessions`), so an app restart rebuilds them empty and the
 * counter restarts at ~0 under the SAME `session_id` (the agent resumes; only
 * our accumulator forgot). Every consumer that reads the LAST value therefore
 * understates spend for any agent that has been through a restart.
 *
 * Measured on a live ledger with dozens of such resets, the last value hid
 * 59% of real spend. The shortfall scales with how often the app is restarted,
 * so a long-running floor is affected worse than a fresh one.
 *
 * THE RECOVERY
 * ────────────
 * The ledger keeps every line, so the pre-reset peaks are still on disk. Within
 * one (agent, session) the counter only ever climbs, so a DECREASE is the reset
 * signature and nothing else. Lifetime is then:
 *
 *     sum(peak of each closed segment) + peak of the open segment
 *
 * Any decrease counts, with only a float-noise epsilon. A dollar threshold was
 * considered and rejected: real restarts routinely drop from well under a
 * dollar straight to zero, so any threshold big enough to be worth having
 * silently misses them. A cumulative counter has no legitimate reason to go
 * down, so the magic number bought nothing and cost coverage.
 *
 * COST / SHAPE
 * ────────────
 * The ledger is append-only and grows without bound, so on an established
 * floor a full fold takes long enough that it must NOT land on the Electron
 * main thread. Folding is therefore async and INCREMENTAL: each pass reads only
 * the bytes appended since the last one and keeps the running segment state.
 * Steady-state cost per pass is a few hundred bytes regardless of ledger size.
 *
 * Read-only: this module never writes to the ledger.
 */

import { createReadStream } from 'fs';
import { open } from 'fs/promises';
import { filesInOrder } from './appendLog';

/** Per (agent, session) fold state: closed segments plus the open one. */
interface Segment {
  /** Sum of the peaks of every segment already closed by a reset. */
  committed: number;
  /** High-water mark of the segment currently open. */
  peak: number;
}

/** Float noise guard. Real resets drop by cents at minimum, so anything below
 *  this is arithmetic dust rather than a restart. */
const EPS = 1e-9;

/** Cap per pass so a cold start cannot stall behind one enormous read. The
 *  fold simply resumes on the next call. */
const MAX_BYTES_PER_PASS = 8 * 1024 * 1024;

export class CostLedgerTotals {
  /** Bytes of the CURRENT ledger file already folded. */
  private offset = 0;
  /** LOG-STALL-AV F2: the ledger rotates (every rotated file is kept), so the fold reads the
   *  rotated files in order, then the live one. A file is identified by its file id, which a
   *  rename keeps: the live file being folded when it rotates is simply continued under its new
   *  name. Rotated files are immutable; once read to the end they are done. */
  private curId: string | null = null;
  private readonly doneIds = new Set<string>();
  /** Trailing partial line, kept as BYTES so a multi-byte character split
   *  across a read boundary is never decoded in half. */
  private tail: Buffer = Buffer.alloc(0);
  /** `agentId \t sessionId` → fold state. */
  private readonly seg = new Map<string, Segment>();
  /** agentId → lifetime usd. Recomputed after each pass. */
  private totals = new Map<string, number>();
  /** One pass at a time; a timer must never stack folds on itself. */
  private folding = false;
  /** True once a full pass has completed, so callers can tell "no spend" from
   *  "not read yet" instead of reporting a confident $0. */
  private warm = false;

  /** Lifetime usd for one agent, or null when the ledger has not been folded
   *  yet. Null rather than 0 so a caller never publishes a cold zero as fact. */
  usdFor(agentId: string): number | null {
    if (!this.warm) return null;
    return this.totals.get(agentId) ?? 0;
  }

  /** Every agent's lifetime usd. Empty until the first pass completes. */
  all(): Map<string, number> {
    return new Map(this.totals);
  }

  /** Has at least one full pass completed? */
  get ready(): boolean {
    return this.warm;
  }

  /** True lifetime spend across every agent in the ledger. */
  floorTotal(): number {
    let t = 0;
    for (const v of this.totals.values()) t += v;
    return t;
  }

  /**
   * Fold whatever has been appended since the last pass. Returns immediately;
   * the work happens off the caller's stack. Safe to call from a timer and
   * never throws (a ledger we cannot read just leaves the last good totals in
   * place, same contract as the other best-effort writers here).
   */
  refresh(ledgerPath: string): Promise<void> {
    if (this.folding) return Promise.resolve();
    this.folding = true;
    return this.fold(ledgerPath)
      .catch(() => { /* keep last good totals */ })
      .finally(() => { this.folding = false; });
  }

  /** Fold repeatedly until caught up to EOF. Convenience for callers that want
   *  the number now rather than over the next few timer ticks. */
  async refreshFully(ledgerPath: string): Promise<void> {
    for (let i = 0; i < 4096; i++) {
      await this.refresh(ledgerPath);
      if (this.warm) return;
    }
  }

  private async fold(ledgerPath: string): Promise<void> {
    const files = filesInOrder(ledgerPath);
    let seenCur = this.curId === null;
    for (let i = 0; i < files.length; i++) {
      const live = i === files.length - 1;
      let fh;
      // An unreadable live ledger leaves the last good totals (and warmth) as they were.
      // The live file is briefly absent right after a rotation: every rotated file read means
      // the fold is caught up. With nothing read at all, the last good totals stand.
      try { fh = await open(files[i], 'r'); } catch { if (live) { if (this.curId === null && this.doneIds.size) this.warm = true; return; } continue; }
      try {
        const st = await fh.stat({ bigint: true });
        const id = `${st.dev}:${st.ino}`;
        const size = Number(st.size);
        if (this.doneIds.has(id)) continue;
        if (this.curId === null) { this.curId = id; this.offset = 0; this.tail = Buffer.alloc(0); }
        if (id !== this.curId) {
          // The file we were folding is gone (not a rotation: those keep the id): start clean.
          if (!seenCur) { this.reset(); return this.fold(ledgerPath); }
          continue;
        }
        seenCur = true;
        // Truncated underneath us: the offset now points past the end. Start clean.
        if (size < this.offset) { this.reset(); return; }
        if (size > this.offset) {
          const end = Math.min(size, this.offset + MAX_BYTES_PER_PASS) - 1;
          const from = this.offset;
          await new Promise<void>((resolve, reject) => {
            const stream = createReadStream('', { fd: fh!.fd, start: from, end, autoClose: false });
            stream.on('data', (chunk: string | Buffer) => this.consume(typeof chunk === 'string' ? Buffer.from(chunk) : chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve());
          });
          this.offset = end + 1;
          this.recompute();
          // A capped pass is still behind: resume here next time.
          if (this.offset < size) return;
        }
        if (live) { this.warm = true; return; }
        // A rotated file read to its end: done for good; the next file starts at 0.
        this.doneIds.add(id);
        this.curId = null;
        this.offset = 0;
      } finally { await fh.close().catch(() => {}); }
    }
  }

  /** Fold one buffer, holding back any incomplete trailing line. */
  private consume(chunk: Buffer): void {
    const buf = this.tail.length ? Buffer.concat([this.tail, chunk]) : chunk;
    const cut = buf.lastIndexOf(0x0a); // '\n'
    if (cut === -1) { this.tail = buf; return; }
    this.tail = buf.subarray(cut + 1);
    for (const line of buf.subarray(0, cut).toString('utf8').split('\n')) {
      if (line) this.foldLine(line);
    }
  }

  private foldLine(line: string): void {
    let row: { agent_id?: string; session_id?: string; usd?: number };
    try { row = JSON.parse(line); } catch { return; } // half-written tail line
    if (!row || typeof row.agent_id !== 'string') return;
    const usd = typeof row.usd === 'number' && Number.isFinite(row.usd) ? row.usd : 0;

    const key = `${row.agent_id}\t${row.session_id ?? ''}`;
    let s = this.seg.get(key);
    if (!s) { s = { committed: 0, peak: 0 }; this.seg.set(key, s); }

    if (usd < s.peak - EPS) {
      // Counter went backwards: the previous segment ended at its peak.
      s.committed += s.peak;
      s.peak = usd;
    } else if (usd > s.peak) {
      s.peak = usd;
    }
  }

  private recompute(): void {
    const next = new Map<string, number>();
    for (const [key, s] of this.seg) {
      const agentId = key.slice(0, key.indexOf('\t'));
      next.set(agentId, (next.get(agentId) ?? 0) + s.committed + s.peak);
    }
    this.totals = next;
  }

  private reset(): void {
    this.offset = 0;
    this.curId = null;
    this.doneIds.clear();
    this.tail = Buffer.alloc(0);
    this.seg.clear();
    this.totals = new Map();
    this.warm = false;
  }
}

/**
 * One-shot fold of a ledger already in memory. Used by tests and by any caller
 * that wants the number without holding an incremental reader.
 */
export function lifetimeUsdFromLedger(text: string): Map<string, number> {
  const t = new CostLedgerTotals();
  // Reuse the exact same fold path so the two can never disagree.
  (t as unknown as { consume(b: Buffer): void }).consume(Buffer.from(text.endsWith('\n') ? text : `${text}\n`));
  (t as unknown as { recompute(): void }).recompute();
  return t.all();
}

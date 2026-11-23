/**
 * MemoryReflector: the job that keeps every `agents/<id>/memory.md` within its
 * budget. Plain file work since 0.5.6: no model reads or rewrites a line.
 *
 * Until 0.5.6 a hidden Claude session summarised the oldest notes. It spent
 * tokens on every run, and it could not shrink a file whose weight sat in one
 * section: agents append under the last `## ` heading, whole sections were the
 * only unit, and the newest three always stayed. Now, on an in-process timer,
 * the job MOVES the oldest text word for word into the raw archive
 * (memory-archive-raw*.md) and writes one index line per batch into
 * memory-archive.md:
 *   - pinned notes over their cap: the oldest lines, one batch a tick;
 *   - a recent region over the budget: whole oldest sections first, then the
 *     oldest lines of a section that is over the cap alone;
 *   - once per agent: the summaries a model wrote before 0.5.6.
 * The Rules region never moves.
 *
 * Why in-process (Electron main), NOT launchd: launchd-spawned shells are blocked
 * by macOS TCC from `~/Documents`; only this process has the folder grant. So the
 * loop lives alongside `memory.start()`, never a cron.
 *
 * Nothing is lost on any path: memory.md is backed up first, every batch is
 * appended to the raw archive and read back from disk, a gate checks that
 * memory.md loses only whole lines and that each of them was read back, and
 * only then is memory.md swapped atomically. When a step fails the file is left
 * byte for byte as it was and the only trace is a `memory-move-abort` log line.
 * The miner re-indexes the changed files on its next tick because their mtime
 * changed (memory.ts).
 *
 * Runs in the Electron main process.
 */
import {
  existsSync, statSync, readdirSync, readFileSync, writeFileSync,
  mkdirSync, copyFileSync, renameSync, openSync, fsyncSync, closeSync, appendFileSync, constants as fsConstants
} from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import {
  ARCHIVE_CAP_BYTES, ARCHIVE_DRAIN_TO_BYTES, archiveFileName, ARCHIVE_INDEX_HEADING, ARCHIVE_INDEX_NOTE, BATCH_SECTIONS_MAX,
  CONDENSED_HEADING_PREFIX, KEPT_SECTIONS_CAP_BYTES, KEPT_SECTIONS_MIN, MEMORY_NOTICE_WINDOW_MS, MOVE_STEP_BYTES,
  PINNED_HEADING_PREFIX, PINNED_NOTES_CAP_BYTES, PINNED_PLACEHOLDER, RAW_PART_BYTES, RULES_CAP_BYTES, RULES_HEADING_PREFIX,
  SECTION_TRIM_TO_BYTES, archiveIndexLine, indexDates, isArchiveIndex, mergeBodies, noticeDue, pinnedNeedsSort,
  pinnedNotesBytesOf, rawPartName, rawPartNumber, rulesBodyOf, rulesBytesOf
} from '../shared/memoryShape';

/** Total memory.md budget — mirrors the janitor's CONTEXT_BUDGET_BYTES (128 KB). */
const BUDGET_BYTES = 131_072;
/** One `rules-over-limit` line per agent per this window. */
export const RULES_WARN_WINDOW_MS = 86_400_000;

/**
 * Move pinned notes only out of a file that has a Rules region (0.5.5, Plan D
 * Part 3, the founder's ruling, plan 3.11: true). Until an agent has sorted its rules
 * under the Rules heading, its oldest pinned lines include its oldest rules,
 * and moving them would take them out of what it reads at task start. So a
 * file with no Rules region keeps all its pinned lines; while its notes are
 * over the cap the agent is told once a day, at its next start, to sort them
 * (hive.ts), and the reflector logs `pinned-needs-sort` once a day.
 *
 * 0.5.6: the whole sections of such a file wait the same way (planRecentMove,
 * sectionsNeedSort). A file from before the Rules heading can keep a rule
 * under any `## ` heading, and the oldest sections are the first to leave.
 */
export const MOVE_NEEDS_RULES_REGION = true;

/** The divider above the recent sections. Its heading line never moves. */
const RECENT_HEADING = '## Recent';

export interface ReflectSettings {
  enabled: boolean;
  /** How often to scan for oversized memory files. */
  intervalMs: number;
  /** Move when the part that can shrink exceeds this percent of BUDGET_BYTES. */
  byteTriggerPct: number;
  /** ...OR when `## ` section count exceeds this (AND bytes > minBytes). */
  sectionTrigger: number;
  /** Newest K `## ` sections always kept word for word. */
  recentKeep: number;
  /** Never trim the recent sections of a file smaller than this; also the
   *  byte floor for the section-count trigger. */
  minBytes: number;
}

/** A `## ` section: its heading line and the body text beneath it. */
export interface Section { heading: string; body: string }

/** A parsed memory.md split into its regions. `pinned` is null for a legacy
 *  (un-structured) file. `condensed` is the summary region a model wrote until
 *  0.5.6; it is null once the job has moved it out. */
interface Parsed {
  header: string;            // the `# Memory …` H1 + any preamble before the first `##`
  rules: string | null;      // body under the Rules heading (0.5.5), verbatim, never moved
  pinned: string | null;     // body under the pinned heading (no heading line)
  condensed: string | null;  // body under the old condensed heading
  recent: Section[];         // every other `## ` section, in file order (oldest→newest)
}

/** What a step moves: the summaries a model wrote before 0.5.6 (once), the
 *  oldest pinned notes, or older sections and lines of the recent region. */
export type MoveKind = 'summaries' | 'pinned' | 'sections';

/** One batch for the raw archive, and what its index line says. */
export interface MoveBatch {
  /** What the raw archive gets, word for word. */
  lines: string[];
  /** What moved, as the index line names it. */
  what: string;
  /** Every date (YYYY-MM-DD) the moved text carries. With none the index line
   *  gives the day of the move. */
  dates: string[];
  /** The note in the raw archive's batch line. */
  source?: string;
}

/** One planned move out of memory.md. */
export interface MovePlan {
  batches: MoveBatch[];
  /** memory.md with exactly the moved lines removed; every other byte as it was. */
  after: string;
}

/** Outcome of one step for one agent, surfaced to the manual IPC + tests. A
 *  step with nothing to do gives no result. */
export interface ReflectResult {
  id: string;
  moved: boolean;            // did text leave for the raw archive?
  what?: MoveKind;
  reason: string;            // `moved`, `nothing-to-move`, or why the step stopped
  oldBytes?: number;         // memory.md before the step
  newBytes?: number;         // and after it
}

export class MemoryReflector {
  private timer: NodeJS.Timeout | null = null;
  private started = false;
  /** True while a reflectNow() pass is in flight: one pass at a time (a pass
   *  must not overlap the next interval tick), mirroring MemoryManager. */
  private reflecting = false;
  /** Per agent: when the last `rules-over-limit` line was logged. */
  private rulesWarnedAt = new Map<string, number>();
  /** Per agent: when the last `pinned-needs-sort` line was logged. */
  private sortWarnedAt = new Map<string, number>();
  /** Per agent: memory.md's size and time when a tick found nothing to do in
   *  it. Until the file changes (or a day passes, for the daily lines) the
   *  loop does not read it again. */
  private quietAt = new Map<string, { size: number; mtimeMs: number; at: number }>();
  /** Agents whose files this app run has looked through for the summaries a
   *  model wrote before 0.5.6. Each memory.md is read once for that, whatever
   *  its size; after it a small file is not read again. */
  private summariesLooked = new Set<string>();

  /**
   * @param getHome      Lazily resolve harnessHome so reflection follows config.
   * @param getSettings  Reflect tunables (interval + thresholds), read each tick.
   * @param appendLog    Sink for `memory-move`/`memory-move-abort` events (hive log.jsonl).
   */
  constructor(
    private getHome: () => string | null,
    private getSettings: () => ReflectSettings,
    private appendLog: (event: Record<string, unknown>) => void,
    private now: () => number = Date.now
  ) {}

  // — lifecycle (mirrors MemoryManager) —

  start(): void {
    if (this.started) return;
    if (!this.getSettings().enabled) return;
    if (!this.getHome()) return;
    this.started = true;
    // First scan one interval out, not on boot, so launch isn't competing with
    // file work (and a freshly-restored home isn't trimmed before it's mined).
    const ms = Math.max(60_000, this.getSettings().intervalMs);
    this.timer = setInterval(() => { void this.reflectNow(); }, ms);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.started = false;
  }

  // — scan —

  /** Reflect every agent whose memory crossed a threshold (or just `onlyId`),
   *  one at a time. Serialized via `reflecting` so a pass can't overlap the
   *  next tick. Returns the per-step outcomes (used by the manual IPC + tests). */
  async reflectNow(onlyId?: string): Promise<ReflectResult[]> {
    const home = this.getHome();
    if (!home) return [];
    if (this.reflecting) return [];
    const agentsDir = join(home, 'hive', 'agents');
    if (!existsSync(agentsDir)) return [];
    const settings = this.getSettings();
    let ids: string[];
    try { ids = readdirSync(agentsDir); } catch { return []; }
    if (onlyId) ids = ids.filter((id) => id === onlyId);

    this.reflecting = true;
    const results: ReflectResult[] = [];
    try {
      for (const id of ids) {
        const before = results.length;
        this.reflectOne(home, id, settings, !!onlyId, results);
        // Plain file work on the main process: after an agent that had a step
        // run, the app takes a turn before the next agent.
        if (results.length > before) await new Promise<void>((resolve) => { setImmediate(resolve); });
      }
    } finally {
      this.reflecting = false;
    }
    return results;
  }

  /** Every step for one agent, in order: the old summaries (once), the pinned
   *  notes, the recent sections. A step that stops ends the agent's turn; the
   *  next tick starts again from the file as it is then. */
  private reflectOne(home: string, id: string, settings: ReflectSettings, manual: boolean, results: ReflectResult[]): void {
    const mem = join(home, 'hive', 'agents', id, 'memory.md');
    // The size first: a file this small has nothing to move or warn about, so
    // the loop does not read it (most agents, every tick) once it has been
    // looked through for the old summaries. A file that has not changed since
    // a tick found nothing to do in it is not read again either, until a day
    // passes.
    let st: { size: number; mtimeMs: number };
    try { const s0 = statSync(mem); st = { size: s0.size, mtimeMs: s0.mtimeMs }; } catch { return; }
    const size = st.size;
    const looked = this.summariesLooked.has(id);
    if (!manual && looked && size <= RULES_CAP_BYTES && size < settings.minBytes) return;
    const q = this.quietAt.get(id);
    if (!manual && looked && q && q.size === st.size && q.mtimeMs === st.mtimeMs && this.now() - q.at < MEMORY_NOTICE_WINDOW_MS) return;
    this.quietAt.delete(id);
    // The stat taken before the read, so a write after it is read next tick.
    const quiet = () => { this.quietAt.set(id, { ...st, at: this.now() }); };
    let bytes = 0;
    let text = '';
    try {
      text = readFileSync(mem, 'utf8');
      bytes = Buffer.byteLength(text, 'utf8');
    } catch { return; }
    const reread = (): boolean => {
      try { text = readFileSync(mem, 'utf8'); bytes = Buffer.byteLength(text, 'utf8'); return true; } catch { return false; }
    };

    // A Rules list over its limit is the agent's to trim (it is told at its
    // next start); nothing in it ever moves.
    const rulesBytes = rulesBytesOf(text);
    if (rulesBytes > RULES_CAP_BYTES) this.warnRulesOverLimit(id, rulesBytes);
    // Notes over the cap in a file with no Rules heading: nothing moves until
    // the agent sorts them (it is told at its next start). Logged here, before
    // any return below, so the state shows in the log.
    if (MOVE_NEEDS_RULES_REGION && pinnedNeedsSort(text)) this.warnNeedsSort(id, pinnedNotesBytesOf(text));

    // Quiet is recorded only when this tick wrote nothing to the file.
    let wrote = false;

    // Once per agent: the summaries a model wrote before 0.5.6 leave, whatever
    // the file's size.
    const summaries = this.moveSummaries(home, id, mem, text);
    if (summaries) {
      results.push(summaries);
      if (!summaries.moved || !reread()) return;
      wrote = true;
    }
    this.summariesLooked.add(id);

    // Pinned notes over their cap: the oldest lines move to the archive, one
    // step per tick, before and apart from the recent sections (no trigger:
    // the cap is a limit, not a heuristic).
    const pinned = this.movePinned(home, id, mem, text);
    if (pinned) {
      results.push(pinned);
      if (!pinned.moved || !reread()) return;
      wrote = true;
    }
    const markQuiet = wrote ? () => {} : quiet;

    // A manual single-agent call trims on demand (skips the trigger); the
    // autonomous loop honors the threshold.
    if (!manual && !overBudget(text, bytes, settings)) { markQuiet(); return; }
    const recent = this.moveRecent(home, id, mem, text, settings);
    if (recent) { results.push(recent); return; }
    // Over the trigger with nothing that may move: the newest sections stay
    // whatever their size, and none of them is over the cap alone.
    results.push({ id, moved: false, reason: 'nothing-to-move', oldBytes: bytes });
    markQuiet();
  }

  // ─── once per agent: the summaries a model wrote before 0.5.6 ───

  /**
   * Two texts a model wrote leave for the raw archive, word for word: the
   * `## 🗜 Condensed history` region of memory.md, and the summary that was
   * memory-archive.md. That file then starts again as the index. Null when the
   * agent has neither, which is every run after the first.
   */
  private moveSummaries(home: string, id: string, mem: string, text: string): ReflectResult | null {
    const agentDir = dirname(mem);
    const oldBytes = Buffer.byteLength(text, 'utf8');
    const fail = (reason: string, detail?: string): ReflectResult => {
      this.logAbort(id, 'summaries', reason, detail, { oldBytes });
      return { id, moved: false, what: 'summaries', reason, oldBytes };
    };
    const plan = planSummaryMove(text);
    const archivePath = join(agentDir, archiveFileName());
    let old = '';
    try { if (existsSync(archivePath)) old = readFileSync(archivePath, 'utf8'); }
    catch (e) { return fail('archive-read-failed', String(e)); }
    const hasOld = old.trim() !== '' && !isArchiveIndex(old);
    if (!plan && !hasOld) return null;

    if (hasOld) {
      // The summary file first: a copy into the run's backup folder, its text
      // into the raw archive and read back, and only then the index over it.
      const iso = new Date(this.now()).toISOString();
      const backupDir = join(home, 'hive', 'backups', utcStamp(), id);
      let backup: string;
      try { backup = backupCopy(archivePath, backupDir); } catch (e) { return fail('backup-failed', String(e)); }
      const batches = chunkLines(old.replace(/\n$/, '').split('\n'), MOVE_STEP_BYTES).map((lines): MoveBatch => ({
        lines, what: `the old ${archiveFileName()}, a summary a model wrote (moved once)`, dates: [],
        source: `its old summary in ${archiveFileName()}, written by a model`
      }));
      const raw = archiveBatches(agentDir, batches, iso);
      if (!raw.ok) return fail(raw.reason, raw.detail);
      const index = writeIndex(agentDir, raw.done, iso, backupDir, true);
      if (!index.ok) return fail('index-write-failed', index.detail);
      try {
        this.appendLog({
          kind: 'memory-move', agentId: id, what: 'summaries', from: archiveFileName(), batches: raw.done.length,
          movedBytes: Buffer.byteLength(old, 'utf8'), rawParts: partNames(raw.done), backup
        });
      } catch { /* best-effort */ }
    }
    if (!plan) return { id, moved: true, what: 'summaries', reason: 'moved', oldBytes, newBytes: oldBytes };
    return this.applyMove(home, id, mem, text, plan, 'summaries');
  }

  // — move the oldest pinned notes to the archive (0.5.5, Plan D Part 3) —

  /**
   * One step: when the pinned notes are over PINNED_NOTES_CAP_BYTES, take lines
   * from the top (oldest) until they are under it, at most MOVE_STEP_BYTES.
   * Returns null when there is nothing to move.
   */
  private movePinned(home: string, id: string, mem: string, text: string): ReflectResult | null {
    const plan = planPinnedMove(text, { needsRules: MOVE_NEEDS_RULES_REGION });
    if (!plan) return null;
    const n = plan.exact.length;
    return this.applyMove(home, id, mem, text, {
      after: plan.after,
      batches: [{ lines: plan.exact, what: `pinned notes: ${n} ${n === 1 ? 'line' : 'lines'}`, dates: datesOf(plan.exact) }]
    }, 'pinned', {
      movedBytes: plan.movedBytes, pinnedBytesBefore: plan.pinnedBytesBefore, pinnedBytesAfter: plan.pinnedBytesAfter
    });
  }

  // ─── move older sections, and the oldest lines of a section over the cap (0.5.6) ───

  /** Null when every recent section may stay as it is. */
  private moveRecent(home: string, id: string, mem: string, text: string, s: ReflectSettings): ReflectResult | null {
    const keep = Math.max(1, s.recentKeep);
    // Whole sections that wait for a Rules heading: logged like the pinned
    // notes that do, once a day (the agent is told at its next start).
    if (MOVE_NEEDS_RULES_REGION && sectionsNeedSort(text, keep)) this.warnNeedsSort(id, pinnedNotesBytesOf(text), true);
    const plan = planRecentMove(text, keep, { needsRules: MOVE_NEEDS_RULES_REGION });
    if (!plan) return null;
    return this.applyMove(home, id, mem, text, plan, 'sections', { sections: plan.sections, trimmed: plan.trimmed });
  }

  /**
   * Carry out one planned move. Order is what makes it lossless:
   *   1. back up memory.md (a cold copy under hive/backups);
   *   2. append every batch word for word to the raw archive, then read each
   *      one back from disk;
   *   3. the gate: memory.md may lose only whole lines, each of them read back
   *      in step 2, and the Rules region none;
   *   4. add one index line per batch to memory-archive.md;
   *   5. swap memory.md, over the text this run read.
   * A step that fails stops the run with memory.md as it was. A batch a failed
   * run left in the archive is found by its sha on the retry, not written twice.
   */
  private applyMove(
    home: string, id: string, mem: string, text: string, plan: MovePlan, what: MoveKind,
    extra: Record<string, unknown> = {}
  ): ReflectResult {
    const oldBytes = Buffer.byteLength(text, 'utf8');
    const agentDir = dirname(mem);
    const fail = (reason: string, detail?: string): ReflectResult => {
      this.logAbort(id, what, reason, detail, { oldBytes, batches: plan.batches.length });
      return { id, moved: false, what, reason, oldBytes };
    };

    const backupDir = join(home, 'hive', 'backups', utcStamp(), id);
    let backup: string;
    try { backup = backupCopy(mem, backupDir); } catch (e) { return fail('backup-failed', String(e)); }

    const iso = new Date(this.now()).toISOString();
    const raw = archiveBatches(agentDir, plan.batches, iso);
    if (!raw.ok) return fail(raw.reason, raw.detail);

    const verdict = verifyMove(text, plan.after, raw.held);
    if (!verdict.ok) return fail(verdict.reason);

    const index = writeIndex(agentDir, raw.done, iso, backupDir);
    if (!index.ok) return fail('index-write-failed', index.detail);

    const swap = swapOver(mem, text, plan.after);
    if (!swap.ok) return fail(swap.reason, swap.detail);
    const afterBytes = Buffer.byteLength(plan.after, 'utf8');
    const newBytes = afterBytes + swap.appendedBytes;
    try {
      this.appendLog({
        kind: 'memory-move', agentId: id, what, batches: raw.done.length, lines: verdict.removed,
        movedBytes: oldBytes - afterBytes, rawParts: partNames(raw.done),
        ...(raw.done.some((d) => d.already) ? { rawAlreadyThere: true } : {}),
        ...extra, oldBytes, newBytes, backup,
        ...(swap.appendedBytes ? { appendedDuringRun: swap.appendedBytes } : {})
      });
    } catch { /* best-effort */ }
    // The miner re-indexes within its next cycle: mtime changed, no extra wiring.
    return { id, moved: true, what, reason: 'moved', oldBytes, newBytes };
  }

  /** One `rules-over-limit` line per agent per RULES_WARN_WINDOW_MS. */
  private warnRulesOverLimit(id: string, rulesBytes: number): void {
    const now = this.now();
    const last = this.rulesWarnedAt.get(id);
    if (last !== undefined && now - last < RULES_WARN_WINDOW_MS) return;
    this.rulesWarnedAt.set(id, now);
    try { this.appendLog({ kind: 'rules-over-limit', agentId: id, rulesBytes, limitBytes: RULES_CAP_BYTES }); }
    catch { /* best-effort */ }
  }

  /** One `pinned-needs-sort` line per agent per MEMORY_NOTICE_WINDOW_MS.
   *  `sectionsWait` marks the line of a file whose whole sections wait. */
  private warnNeedsSort(id: string, pinnedBytes: number, sectionsWait = false): void {
    const now = this.now();
    if (!noticeDue(this.sortWarnedAt.get(id), now, MEMORY_NOTICE_WINDOW_MS)) return;
    this.sortWarnedAt.set(id, now);
    try { this.appendLog({ kind: 'pinned-needs-sort', agentId: id, pinnedBytes, limitBytes: PINNED_NOTES_CAP_BYTES, ...(sectionsWait ? { sectionsWait } : {}) }); }
    catch { /* best-effort */ }
  }

  private logAbort(id: string, what: MoveKind, reason: string, detail?: string, extra?: Record<string, unknown>): void {
    try { this.appendLog({ kind: 'memory-move-abort', agentId: id, what, reason, ...(detail ? { detail } : {}), ...extra }); }
    catch { /* best-effort */ }
  }
}

// ─── pure helpers (the deterministic, unit-testable half) ────────────────────

/** Count level-2 (`## `) headings — `# ` H1 and `### ` deeper headings excluded. */
export function countSections(text: string): number {
  return (text.match(/^##\s/gm) ?? []).length;
}

/** Split a memory.md into header + its regions. A legacy flat file (no pinned
 *  heading) parses with `pinned` null and every `## ` section in `recent`. */
export function parseMemory(text: string): Parsed {
  const lines = text.split('\n');
  let firstSection = lines.findIndex((l) => /^##\s/.test(l));
  if (firstSection === -1) firstSection = lines.length;
  const header = lines.slice(0, firstSection).join('\n').replace(/\s+$/, '');

  // Carve the remaining lines into `## ` sections (heading + body until next `##`).
  const sections: Section[] = [];
  let cur: Section | null = null;
  for (let i = firstSection; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line)) {
      if (cur) sections.push(cur);
      cur = { heading: line, body: '' };
    } else if (cur) {
      cur.body += (cur.body ? '\n' : '') + line;
    }
  }
  if (cur) sections.push(cur);

  let rules: string | null = null;
  let pinned: string | null = null;
  let condensed: string | null = null;
  const recent: Section[] = [];
  for (const s of sections) {
    const h = s.heading.trim();
    // The Rules region (0.5.5) must be known here, or the job would take it
    // for a recent section and move it out.
    // A region's heading can appear twice: every body counts, merged in file
    // order (a later one used to replace the earlier, and its lines were lost).
    if (h.startsWith(RULES_HEADING_PREFIX)) rules = mergeBodies(rules, s.body.replace(/\s+$/, ''));
    else if (h.startsWith(PINNED_HEADING_PREFIX)) pinned = mergeBodies(pinned, s.body.replace(/\s+$/, ''));
    else if (h.startsWith(CONDENSED_HEADING_PREFIX)) condensed = mergeBodies(condensed, s.body.replace(/\s+$/, ''));
    else if (h === RECENT_HEADING) { /* divider — its siblings ARE the recent list */ }
    else recent.push(s);
  }
  return { header, rules, pinned, condensed, recent };
}

/** UTF-8 size of the pinned block's body (0 for a legacy file without one). */
export function pinnedBytesOf(text: string): number {
  const pinned = parseMemory(text).pinned;
  return pinned ? Buffer.byteLength(pinned, 'utf8') : 0;
}

/**
 * The gate before a swap. memory.md may change only by losing whole lines, and
 * every line it loses must be among `held`, the lines read back from the raw
 * archive. The Rules region must come back byte for byte. A plan that fails
 * here is never written.
 */
export function verifyMove(
  before: string, after: string, held: string[]
): { ok: true; removed: number } | { ok: false; reason: string } {
  const have = new Map<string, number>();
  for (const line of held) have.set(line, (have.get(line) ?? 0) + 1);
  const kept = after.split('\n');
  let k = 0;
  let removed = 0;
  for (const line of before.split('\n')) {
    if (k < kept.length && kept[k] === line) { k += 1; continue; }
    const n = have.get(line) ?? 0;
    if (n === 0) return { ok: false, reason: 'removed-line-not-archived' };
    have.set(line, n - 1);
    removed += 1;
  }
  if (k !== kept.length) return { ok: false, reason: 'text-altered' };
  if (removed === 0) return { ok: false, reason: 'nothing-removed' };
  if (rulesBodyOf(after) !== rulesBodyOf(before)) return { ok: false, reason: 'rules-altered' };
  return { ok: true, removed };
}

/**
 * Copy `src` into `dir` under its own name, never over an earlier backup: two
 * steps in the same second share the stamp folder, so a taken name gets `.2`,
 * `.3` before its extension. The folder name stays the stamp the retention
 * sweep reaps. Throws when the copy fails.
 */
export function backupCopy(src: string, dir: string): string {
  mkdirSync(dir, { recursive: true });
  const ext = extname(src);
  const base = basename(src, ext);
  for (let n = 1; n < 1000; n++) {
    const path = join(dir, n === 1 ? `${base}${ext}` : `${base}.${n}${ext}`);
    try { copyFileSync(src, path, fsConstants.COPYFILE_EXCL); return path; }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; }
  }
  throw new Error(`no free backup name for ${basename(src)} in ${dir}`);
}

/** `20260606T110912Z` — matches the janitor's backup-dir stamp format. */
function utcStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Replace a file with `next`, but only over the text this run read.
 *
 * The run reads the file, writes the archive, then writes the file. Agents
 * append to memory.md all day (prompt rules 2 and 4), and a rename over the
 * file would lose every line appended in between. So:
 *  - unchanged: swap;
 *  - only appended to: swap, with the new tail after `next`, where the agent
 *    wrote it (inside the newest kept section);
 *  - anything else: do nothing (`changed-during-condense`, the name it has had
 *    since 0.5.5); the next tick tries again from the new text.
 * The window left is the few milliseconds between this read and the rename.
 */
export function swapOver(
  path: string, read: string, next: string
): { ok: true; appendedBytes: number } | { ok: false; reason: string; detail?: string } {
  let current: string;
  try { current = readFileSync(path, 'utf8'); } catch (e) { return { ok: false, reason: 'swap-failed', detail: String(e) }; }
  let body = next;
  let appendedBytes = 0;
  if (current !== read) {
    if (!current.startsWith(read)) return { ok: false, reason: 'changed-during-condense' };
    const tail = current.slice(read.length);
    appendedBytes = Buffer.byteLength(tail, 'utf8');
    body = (next.endsWith('\n') || tail.startsWith('\n') ? next : `${next}\n`) + tail;
  }
  try { atomicWrite(path, body); } catch (e) { return { ok: false, reason: 'swap-failed', detail: String(e) }; }
  return { ok: true, appendedBytes };
}

/** Write `text` to `path` atomically: temp sibling → fsync → rename over target. */
function atomicWrite(path: string, text: string): void {
  const tmp = `${path}.tmp-${Math.random().toString(36).slice(2, 10)}`;
  writeFileSync(tmp, text, 'utf8');
  try {
    const fd = openSync(tmp, 'r+');
    try { fsyncSync(fd); } finally { closeSync(fd); }
  } catch { /* fsync best-effort; rename is the durability guarantee */ }
  renameSync(tmp, path);
}

/**
 * The trigger for the recent sections: the part that can shrink (the file
 * minus the Rules region and the pinned notes) over byteTriggerPct of the
 * budget, or section sprawl, both above the byte floor. With the defaults that
 * is 64 KB: the 128 KB budget less the Rules limit and the pinned cap.
 */
export function overBudget(text: string, bytes: number, s: ReflectSettings): boolean {
  if (bytes < s.minBytes) return false;
  const shrinkable = bytes - rulesBytesOf(text) - pinnedBytesOf(text);
  if (shrinkable > (BUDGET_BYTES * s.byteTriggerPct) / 100) return true;
  return countSections(text) > s.sectionTrigger;
}

/** A section as it stands in the file, trailing space trimmed. */
function sectionText(s: Section): string {
  return `${s.heading}\n${s.body}`.replace(/\s+$/, '');
}

/**
 * Which recent sections stay word for word (ruling 3.12): newest first, up to
 * `keepCount` AND up to `capBytes` together, never fewer than the newest
 * `minKeep` (or `keepCount`, when that is smaller). The kept ones are always
 * the newest run of sections. `bySize` is the part of `evict` that the count
 * alone would have kept.
 */
export function splitRecent(
  recent: Section[], keepCount: number,
  capBytes = KEPT_SECTIONS_CAP_BYTES, minKeep = KEPT_SECTIONS_MIN
): { keep: Section[]; evict: Section[]; bySize: Section[] } {
  const byCount = Math.max(0, recent.length - keepCount);
  const floor = Math.min(minKeep, keepCount);
  let start = recent.length;
  let bytes = 0;
  while (start > byCount) {
    const size = Buffer.byteLength(sectionText(recent[start - 1]), 'utf8');
    if (recent.length - start >= floor && bytes + size > capBytes) break;
    bytes += size;
    start -= 1;
  }
  return { keep: recent.slice(start), evict: recent.slice(0, start), bySize: recent.slice(byCount, start) };
}

/** A `## ` section as lines of the file: [start, end), the heading line first. */
interface Span { start: number; end: number; heading: string }

/** Every `## ` section of a file split into lines. The piece after a final
 *  newline is not a line of any section, so it never moves. */
function sectionSpans(lines: string[]): Span[] {
  const stop = lines.length > 0 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  const spans: Span[] = [];
  for (let i = 0; i < stop; i++) {
    if (!/^##\s/.test(lines[i])) continue;
    if (spans.length) spans[spans.length - 1].end = i;
    spans.push({ start: i, end: stop, heading: lines[i] });
  }
  return spans;
}

const isRegion = (heading: string, prefix: string): boolean => heading.trim().startsWith(prefix);

const linesBytes = (lines: string[]): number => lines.reduce((n, l) => n + Buffer.byteLength(l, 'utf8') + 1, 0);

/** Lines cut into runs of at most `maxBytes`, from the top, so a retry over a
 *  file that only grew cuts the same first runs. A line over the limit is a
 *  run of its own. */
function chunkLines(lines: string[], maxBytes: number): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  let size = 0;
  for (const line of lines) {
    const add = Buffer.byteLength(line, 'utf8') + 1;
    if (cur.length && size + add > maxBytes) { out.push(cur); cur = []; size = 0; }
    cur.push(line);
    size += add;
  }
  if (cur.length) out.push(cur);
  return out;
}

const DATE = '(20\\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01]))';
/** A date anywhere in a heading. */
const HEADING_DATE = new RegExp(`(?:^|\\D)${DATE}(?!\\d)`);
/** A date a note starts with, after its bullet and any emphasis mark. */
const LINE_DATE = new RegExp(`^\\s*(?:[-*+]\\s+)?[*_\\[(]*${DATE}(?!\\d)`);

/** Every date the text carries: in a heading, or at the start of a line. */
function datesOf(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const m = (/^#{2,}\s/.test(line) ? HEADING_DATE : LINE_DATE).exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

/** A heading as an index line names it: no `## `, one line, no `|`, at most
 *  60 characters. */
function indexHeading(heading: string): string {
  const t = heading.replace(/^##\s+/, '').replace(/\s+/g, ' ').replace(/\|/g, '/').trim();
  return t.length > 60 ? `${t.slice(0, 57)}...` : t;
}

/**
 * The one time move (0.5.6): every `## 🗜` region, heading and body, leaves
 * memory.md. Null when the file has none.
 */
export function planSummaryMove(text: string): MovePlan | null {
  const lines = text.split('\n');
  const drop = new Set<number>();
  for (const s of sectionSpans(lines)) {
    if (!isRegion(s.heading, CONDENSED_HEADING_PREFIX)) continue;
    for (let i = s.start; i < s.end; i++) drop.add(i);
  }
  if (drop.size === 0) return null;
  return {
    batches: chunkLines(lines.filter((_, i) => drop.has(i)), MOVE_STEP_BYTES).map((chunk): MoveBatch => ({
      lines: chunk, what: 'condensed history, a summary a model wrote (moved once)', dates: [],
      source: 'its condensed history, a summary a model wrote'
    })),
    after: lines.filter((_, i) => !drop.has(i)).join('\n')
  };
}

/**
 * Where a section starts once it is cut to size: the index of its first body
 * line that stays. A section within `cap` keeps every line. One over it loses
 * lines from the top, the oldest, until it is under `target`. The cut lands on
 * the start of a note (not a blank or an indented line), and the newest line
 * always stays.
 */
function oversizeCut(lines: string[], s: Span, cap: number, target: number): number {
  const first = s.start + 1;
  let size = Buffer.byteLength(lines.slice(s.start, s.end).join('\n').replace(/\s+$/, ''), 'utf8');
  if (size <= cap) return first;
  let newest = s.end - 1;
  while (newest > s.start && !lines[newest].trim()) newest -= 1;
  let cut = first;
  while (cut < newest && size > target) { size -= Buffer.byteLength(lines[cut], 'utf8') + 1; cut += 1; }
  while (cut < newest && (!lines[cut].trim() || /^\s/.test(lines[cut]))) cut += 1;
  return cut;
}

/** One planned move of the recent region. */
export interface RecentMove extends MovePlan {
  /** Whole sections that leave. */
  sections: number;
  /** Sections that stay and lose their oldest lines. */
  trimmed: number;
}

/**
 * Plan the move of the recent region (0.5.6). Null when nothing may leave.
 *
 * Every `## ` section but Rules and the pinned notes is a recent section, in
 * file order, oldest first. Two things leave, both from the oldest end:
 *   - a section that is over `capBytes` alone keeps only its newest lines
 *     (under `trimTo`). This is the case the old condenser could not shrink:
 *     an agent appending under the last heading for weeks;
 *   - then whole sections, until the newest `keepCount` and `capBytes` are
 *     left, never fewer than `minKeep` (splitRecent, on the cut sizes).
 * The edit is on the text itself, so nothing else in the file changes by a
 * byte. A batch holds whole sections up to `batchBytes` and BATCH_SECTIONS_MAX
 * of them; lines of one section go in batches of their own, each starting
 * with a copy of the section's heading so it reads alone in the archive.
 *
 * With `needsRules`, no whole section leaves a file that has no Rules region
 * (MOVE_NEEDS_RULES_REGION): a rule the agent has not sorted yet can sit in
 * any of them. The oldest lines of one section over the cap still leave.
 */
export function planRecentMove(
  text: string, keepCount: number,
  opts: { capBytes?: number; minKeep?: number; trimTo?: number; batchBytes?: number; needsRules?: boolean } = {}
): RecentMove | null {
  const capBytes = opts.capBytes ?? KEPT_SECTIONS_CAP_BYTES;
  const minKeep = opts.minKeep ?? KEPT_SECTIONS_MIN;
  const trimTo = opts.trimTo ?? SECTION_TRIM_TO_BYTES;
  const batchBytes = opts.batchBytes ?? MOVE_STEP_BYTES;
  const lines = text.split('\n');
  // The `## Recent` divider with nothing under it is not a section. With text
  // under it (an agent wrote straight below it) that text moves like any
  // other; the divider's own line stays.
  const recent = sectionSpans(lines)
    .filter((s) => !isRegion(s.heading, RULES_HEADING_PREFIX) && !isRegion(s.heading, PINNED_HEADING_PREFIX))
    .map((s) => ({ ...s, divider: s.heading.trim() === RECENT_HEADING }))
    .filter((s) => !s.divider || lines.slice(s.start + 1, s.end).some((l) => l.trim()));
  if (recent.length === 0) return null;

  const cuts = recent.map((s) => oversizeCut(lines, s, capBytes, trimTo));
  const sized = recent.map((s, k): Section => ({ heading: s.heading, body: lines.slice(cuts[k], s.end).join('\n') }));
  const wait = opts.needsRules === true && rulesBodyOf(text) === null;
  const gone = wait ? 0 : splitRecent(sized, keepCount, capBytes, minKeep).evict.length;

  const drop = new Set<number>();
  const batches: MoveBatch[] = [];
  let run: Array<{ heading: string; lines: string[] }> = [];
  let runBytes = 0;
  const flush = (): void => {
    if (run.length === 0) return;
    const moved = run.flatMap((u) => u.lines);
    batches.push({
      lines: moved, what: `sections: ${run.map((u) => indexHeading(u.heading)).join('; ')}`,
      dates: datesOf(moved), source: 'older sections'
    });
    run = [];
    runBytes = 0;
  };
  let sections = 0;
  let trimmed = 0;
  recent.forEach((s, k) => {
    const whole = k < gone && !s.divider;
    const from = whole ? s.start : s.start + 1;
    const to = k < gone ? s.end : cuts[k];
    if (to <= from) return;
    for (let i = from; i < to; i++) drop.add(i);
    const moved = lines.slice(from, to);
    const size = linesBytes(moved);
    if (whole) sections += 1; else trimmed += 1;
    if (whole && size <= batchBytes) {
      if (run.length >= BATCH_SECTIONS_MAX || (run.length > 0 && runBytes + size > batchBytes)) flush();
      run.push({ heading: s.heading, lines: moved });
      runBytes += size;
      return;
    }
    flush();
    chunkLines(moved, batchBytes).forEach((chunk, n) => {
      const part = whole && n === 0 ? chunk : [s.heading, ...chunk];
      // The heading's date is when the section began: it dates the first
      // batch, and a later one only when its own lines carry no date.
      const own = datesOf(chunk);
      batches.push({
        lines: part, what: `lines of: ${indexHeading(s.heading)}`,
        dates: n === 0 || own.length === 0 ? [...datesOf([s.heading]), ...own] : own,
        source: whole ? 'an older section, in parts' : 'the oldest lines of one section'
      });
    });
  });
  flush();
  if (drop.size === 0) return null;
  return { batches, after: lines.filter((_, i) => !drop.has(i)).join('\n'), sections, trimmed };
}

/**
 * Does the file hold sections that wait for a Rules heading? True when it has
 * no Rules region and the plan without the wait takes out more than the plan
 * with it. The job logs it and the prompt builder tells the agent to sort
 * (hive.ts). `keepCount` is the job's setting; the prompt builder has none
 * and asks with the shipped 12 (config.ts, reflectRecentKeep), whatever the
 * file's size.
 */
export function sectionsNeedSort(text: string, keepCount = 12): boolean {
  if (rulesBodyOf(text) !== null) return false;
  const free = planRecentMove(text, keepCount);
  return free !== null && free.after !== (planRecentMove(text, keepCount, { needsRules: true })?.after ?? text);
}

/** One planned move step: which pinned lines leave, and memory.md without them. */
export interface PinnedMove {
  moved: string[];
  /** The same lines as they stand in the file, for the raw archive. */
  exact: string[];
  movedBytes: number;
  /** memory.md with exactly those lines removed; every other byte as it was. */
  after: string;
  pinnedBytesBefore: number;
  pinnedBytesAfter: number;
}

/**
 * Plan one move step. Null when the pinned notes are within the cap (or, with
 * `needsRules`, when the file has no Rules region). Lines leave from the top,
 * the oldest, until the notes are under the cap, at most `step` bytes of them,
 * always at least one. The edit is on the text itself, so nothing else in the
 * file changes by a byte.
 */
export function planPinnedMove(
  text: string,
  opts: { cap?: number; step?: number; needsRules?: boolean } = {}
): PinnedMove | null {
  const cap = opts.cap ?? PINNED_NOTES_CAP_BYTES;
  const step = opts.step ?? MOVE_STEP_BYTES;
  if (opts.needsRules && rulesBodyOf(text) === null) return null;
  const lines = text.split('\n');
  // Notes under every pinned heading, in file order (as parseMemory reads them).
  const notes: Array<{ index: number; text: string }> = [];
  let inPinned = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { inPinned = lines[i].trim().startsWith(PINNED_HEADING_PREFIX); continue; }
    if (!inPinned) continue;
    const t = lines[i].trim();
    if (t && t !== PINNED_PLACEHOLDER) notes.push({ index: i, text: t });
  }
  if (notes.length === 0) return null;
  const sizeOf = (xs: Array<{ text: string }>) => Buffer.byteLength(xs.map((x) => x.text).join('\n'), 'utf8');
  const before = sizeOf(notes);
  if (before <= cap) return null;
  const take: Array<{ index: number; text: string }> = [];
  let movedBytes = 0;
  while (take.length < notes.length) {
    const next = notes[take.length];
    const add = Buffer.byteLength(next.text, 'utf8') + (take.length ? 1 : 0);
    if (take.length > 0 && movedBytes + add > step) break;
    take.push(next);
    movedBytes += add;
    if (sizeOf(notes.slice(take.length)) <= cap) break;
  }
  const drop = new Set(take.map((x) => x.index));
  const after = lines.filter((_, i) => !drop.has(i)).join('\n');
  return {
    moved: take.map((x) => x.text),
    exact: take.map((x) => lines[x.index]),
    movedBytes,
    after,
    pinnedBytesBefore: before,
    pinnedBytesAfter: sizeOf(notes.slice(take.length))
  };
}

/** The text one batch adds to the raw archive, and its id: the sha256 of its
 *  lines, so a retry of the same batch can find it. */
export function rawBatch(lines: string[], isoTime: string, source?: string): { sha: string; text: string } {
  const sha = createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex').slice(0, 16);
  const from = source ? `memory.md (${source})` : 'memory.md';
  const text = `<!-- moved from ${from} ${isoTime} batch ${sha} (${lines.length} lines) -->\n${lines.join('\n')}\n`;
  return { sha, text };
}

/** How many times this raw archive part holds batch `sha` whole: its batch
 *  line, then `lines` word for word. A batch line with other text under it (a
 *  write cut short, or a batch line an agent pasted into a note) does not count. */
function countBatch(partText: string, sha: string, lines: string[]): number {
  const body = `${lines.join('\n')}\n`;
  const mark = `batch ${sha} (`;
  let n = 0;
  for (let at = partText.indexOf(mark); at !== -1; at = partText.indexOf(mark, at + 1)) {
    const eol = partText.indexOf('\n', at);
    if (eol !== -1 && partText.startsWith(body, eol + 1)) n += 1;
  }
  return n;
}

/**
 * Append one batch, word for word, to the agent's raw archive, then read it
 * back. Add only, in parts: a new part starts when the batch would take the
 * current one past RAW_PART_BYTES. A batch already in any part (a retry after
 * a failed swap) is not written again.
 */
export function writeRawBatch(
  agentDir: string, lines: string[], isoTime: string, source?: string
): { ok: true; part: string; already: boolean } | { ok: false; error: string } {
  return putRawBatch(agentDir, lines, isoTime, source, 1);
}

/** writeRawBatch for a batch the archive must hold `copies` times. One plan
 *  can carry the same lines twice (an agent that wrote one line a thousand
 *  times), and each copy that leaves memory.md must be in the archive. */
function putRawBatch(
  agentDir: string, lines: string[], isoTime: string, source: string | undefined, copies: number
): { ok: true; part: string; already: boolean } | { ok: false; error: string } {
  try {
    const { sha, text } = rawBatch(lines, isoTime, source);
    const parts = readdirSync(agentDir)
      .map((name) => ({ name, n: rawPartNumber(name) }))
      .filter((p): p is { name: string; n: number } => p.n !== null)
      .sort((a, b) => a.n - b.n);
    let have = 0;
    for (const p of parts) {
      have += countBatch(readFileSync(join(agentDir, p.name), 'utf8'), sha, lines);
      if (have >= copies) return { ok: true, part: join(agentDir, p.name), already: true };
    }
    let n = parts.length ? parts[parts.length - 1].n : 1;
    let path = join(agentDir, rawPartName(n));
    const size = existsSync(path) ? statSync(path).size : 0;
    if (size > 0 && size + Buffer.byteLength(text, 'utf8') > RAW_PART_BYTES) { n += 1; path = join(agentDir, rawPartName(n)); }
    const lead = existsSync(path) && statSync(path).size > 0 && !readFileSync(path, 'utf8').endsWith('\n') ? '\n' : '';
    appendFileSync(path, lead + text, 'utf8');
    try {
      const fd = openSync(path, 'r+');
      try { fsyncSync(fd); } finally { closeSync(fd); }
    } catch { /* fsync best-effort */ }
    if (!readFileSync(path, 'utf8').includes(text)) return { ok: false, error: `read back of ${basename(path)} did not find the batch` };
    return { ok: true, part: path, already: false };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** One batch as the raw archive holds it. */
interface Archived { batch: MoveBatch; sha: string; part: string; already: boolean }

const partNames = (done: Archived[]): string[] => [...new Set(done.map((d) => basename(d.part)))];

/**
 * Append every batch to the raw archive, then read each one back from disk.
 * `held` is every line the archive was read back to hold: the only lines the
 * gate lets memory.md lose.
 */
function archiveBatches(
  agentDir: string, batches: MoveBatch[], isoTime: string
): { ok: true; done: Archived[]; held: string[] } | { ok: false; reason: string; detail?: string } {
  const done: Archived[] = [];
  // How many batches of this plan carry the same lines, by sha.
  const need = new Map<string, { lines: string[]; copies: number }>();
  for (const batch of batches) {
    const sha = rawBatch(batch.lines, isoTime, batch.source).sha;
    const same = need.get(sha) ?? { lines: batch.lines, copies: 0 };
    same.copies += 1;
    need.set(sha, same);
    const raw = putRawBatch(agentDir, batch.lines, isoTime, batch.source, same.copies);
    if (!raw.ok) return { ok: false, reason: 'raw-write-failed', detail: raw.error };
    done.push({ batch, sha, part: raw.part, already: raw.already });
  }
  // The read back: the parts the writes named, from disk, once each.
  const read: string[] = [];
  try { for (const part of new Set(done.map((d) => d.part))) read.push(readFileSync(part, 'utf8')); }
  catch (e) { return { ok: false, reason: 'raw-verify-failed', detail: String(e) }; }
  for (const [sha, same] of need) {
    const have = read.reduce((n, body) => n + countBatch(body, sha, same.lines), 0);
    if (have < same.copies) {
      return { ok: false, reason: 'raw-verify-failed', detail: `the archive holds batch ${sha} ${have} times, the plan needs ${same.copies}` };
    }
  }
  return { ok: true, done, held: done.flatMap((d) => d.batch.lines) };
}

/**
 * Add one index line per batch to memory-archive.md, making the file when it
 * is not there. A batch the index already names (a retry) gets no second
 * line, and no other text in the file is touched. When the index lines pass
 * ARCHIVE_CAP_BYTES the oldest go to the raw archive, word for word and read
 * back, until the rest is under ARCHIVE_DRAIN_TO_BYTES; one line in their
 * place names the raw file that holds them. `afresh` starts the index over a
 * summary a model wrote: the caller has that text in the raw archive and in
 * `backupDir` already.
 */
function writeIndex(
  agentDir: string, done: Archived[], isoTime: string, backupDir: string, afresh = false
): { ok: true } | { ok: false; detail: string } {
  const path = join(agentDir, archiveFileName());
  const lineOf = (d: Archived): string =>
    archiveIndexLine(indexDates(d.batch.dates, isoTime), d.batch.what, basename(d.part), d.sha);
  const isEntry = (l: string): boolean => l.startsWith('- ');
  try {
    let current = '';
    if (!afresh && existsSync(path)) current = readFileSync(path, 'utf8');
    if (current.trim() && !isArchiveIndex(current)) return { ok: false, detail: `${archiveFileName()} is not the index yet` };
    let lines = current.trim()
      ? current.replace(/\n$/, '').split('\n')
      : [ARCHIVE_INDEX_HEADING, '', ARCHIVE_INDEX_NOTE, ''];
    let changed = !current.trim();
    for (const d of done) {
      if (lines.some((l) => isEntry(l) && l.endsWith(`| batch ${d.sha}`))) continue;
      lines.push(lineOf(d));
      changed = true;
    }
    const entryAt = lines.flatMap((l, i) => (isEntry(l) ? [i] : []));
    let size = linesBytes(entryAt.map((i) => lines[i]));
    // The newest line always stays.
    let k = 0;
    if (size > ARCHIVE_CAP_BYTES) {
      while (k < entryAt.length - 1 && size > ARCHIVE_DRAIN_TO_BYTES) { size -= Buffer.byteLength(lines[entryAt[k]], 'utf8') + 1; k += 1; }
    }
    if (k > 0) {
      const oldest = entryAt.slice(0, k);
      if (current.trim()) backupCopy(path, backupDir);
      const moved = archiveBatches(agentDir, [{
        lines: oldest.map((i) => lines[i]), what: `${k} older lines of this index`, dates: [],
        source: `the oldest lines of the ${archiveFileName()} index`
      }], isoTime);
      if (!moved.ok) return { ok: false, detail: `${moved.reason}${moved.detail ? `: ${moved.detail}` : ''}` };
      const gone = new Set(oldest);
      const pointer = lineOf(moved.done[0]);
      lines = lines.flatMap((l, i) => (i === oldest[0] ? [pointer] : gone.has(i) ? [] : [l]));
      changed = true;
    }
    if (changed) atomicWrite(path, `${lines.join('\n')}\n`);
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Retention policy: what every unbounded store on disk is allowed to grow to,
 * and which entries survive when it is over.
 *
 * WHY THIS EXISTS
 * ───────────────
 * Eight stores in this app were written append only and never trimmed. Two of
 * them say so in their own comments and then do nothing about it
 * (costLifetime.ts:33, roster.ts:191). On a floor of five agents the cost
 * ledger gains a row every 30 seconds per agent, the roster backs itself up on
 * every single write, and the router archives one JSON file per handled message
 * every 1.5 seconds. There are real users on this build, so these grow on real
 * machines, forever.
 *
 * WHY COUNT AND BYTES, NEVER AGE
 * ──────────────────────────────
 * An age window is the obvious bound and the wrong one. "Keep 30 days" is blown
 * out by one busy afternoon (a day of six agents is more archived messages than
 * a quiet month of one) and holds nothing at all on a machine used twice a
 * month, where it deletes the only history there is. A count holds in both
 * cases: it is the same promise to the busy user and the occasional one. Age
 * appears here only as `minAgeMs`, which is a SAFETY floor and not a bound: it
 * stops the sweep racing a writer that touched a file seconds ago.
 *
 * Pure and IO free, in the same split as palaceReap.ts: the decisions live
 * here, the `rm` lives in main/retention.ts. Every number below has its reason
 * beside it, because a bound nobody can defend is a bound the next person
 * doubles.
 */

/** How a store's bound is counted. */
export type RetentionKind = 'bytes' | 'count';

/** Everything the sweep needs to know about one store. */
export interface RetentionPolicy {
  /** Stable id: appears in the sweep's log line and in the tests. */
  readonly id: string;
  /** What a person calls it. User visible, so no dashes. */
  readonly label: string;
  readonly kind: RetentionKind;
  /** Bytes for `bytes`; files, directories, lines or rows for `count`. */
  readonly max: number;
  /** One sentence saying why this number and not another. */
  readonly why: string;
  /**
   * Directory reaps only. Beyond the newest `max`, also keep the newest
   * survivor of each of the most recent N calendar days. This is the recovery
   * story a flat count cannot serve: "an agent went missing some time last
   * week" needs one file per day, not a thousand from this morning.
   */
  readonly keepDailyDays?: number;
  /** Never delete anything younger than this. A safety floor, not a bound. */
  readonly minAgeMs?: number;
}

/** A minute is long enough that no writer is still mid rename, and short enough
 *  that it never changes what a sweep achieves. */
const FRESH_FLOOR_MS = 60_000;

/**
 * The table. Every store the survey found growing without a cap.
 *
 * The `why` strings are load bearing: they are the argument for the number, and
 * `test/retention.test.cjs` asserts every policy carries one.
 */
export const RETENTION_POLICIES = {
  costLedger: {
    id: 'costLedger',
    label: 'Cost ledger',
    kind: 'bytes',
    max: 4 * 1024 * 1024,
    why: 'costLifetime.ts folds at most 8 MB per pass, so a ledger kept under that always ends up behind the folder saved offset and it refolds from zero instead of reading shifted bytes; lifetime spend survives the trim exactly because the carry lines below preserve it, so the only thing this cap costs is per beat detail that nothing reads.'
  },
  hiveLog: {
    id: 'hiveLog',
    label: 'Hive event log',
    kind: 'bytes',
    max: 4 * 1024 * 1024,
    why: 'logTail reads the WHOLE file synchronously and the heartbeat calls it on every beat, so the cap is what the main process can afford to re read on a timer rather than what a person might like to browse; 4 MB is roughly 25,000 events, about a week of a busy floor.'
  },
  rosterBackups: {
    id: 'rosterBackups',
    label: 'Roster backups',
    kind: 'count',
    max: 50,
    keepDailyDays: 30,
    minAgeMs: FRESH_FLOOR_MS,
    why: 'A roster is restored either within minutes of a bad write or from the day something went missing, so keep every backup of the current session plus one per day for a month: at most 80 files instead of the thousands a busy day produces.'
  },
  messageArchive: {
    id: 'messageArchive',
    label: 'Handled messages',
    kind: 'count',
    max: 500,
    minAgeMs: FRESH_FLOOR_MS,
    why: 'voiceMessages parses every file in inbox/.done and outbox/.sent on every Inbox open and then shows at most 200, so the cap is what main can afford to re read: 500 per folder per agent is more than the surface can ever display.'
  },
  spawnRequests: {
    id: 'spawnRequests',
    label: 'Spawn requests',
    kind: 'count',
    max: 200,
    minAgeMs: FRESH_FLOOR_MS,
    why: 'Nothing reads a request after the worker starts; the folders exist only so a request is never processed twice, and 200 is enough for a person to see what was asked for recently.'
  },
  tasksArchive: {
    id: 'tasksArchive',
    label: 'Archived cards',
    kind: 'count',
    max: 1000,
    why: 'The Archived chip is a list a person scans, and 1000 cards is more than a year of a busy board; this is where the hourly hygiene sweep PUTS what it removes, so without a cap the bloat only moves.'
  },
  boardArchive: {
    id: 'boardArchive',
    label: 'Board archive',
    kind: 'bytes',
    max: 2 * 1024 * 1024,
    why: 'Each entry is a whole copy of board.md, so this is counted in copies rather than cards: 2 MB is roughly 40 full boards, by which point the oldest copy has been superseded dozens of times.'
  },
  memoryBackups: {
    id: 'memoryBackups',
    label: 'Memory backups',
    kind: 'count',
    max: 50,
    minAgeMs: FRESH_FLOOR_MS,
    why: 'A condense backup is read when a condense went wrong, which is noticed within a day or two; 50 stamps is every condense of the last week on a floor of ten agents that condense daily.'
  },
  commandHistory: {
    id: 'commandHistory',
    label: 'Command history',
    kind: 'count',
    max: 5000,
    why: 'listHistory clamps any request to 1000 rows, so 5000 is five times the deepest page the UI can ask for and still bounds the table at a few megabytes of SQLite.'
  }
} as const satisfies Record<string, RetentionPolicy>;

export type RetentionStoreId = keyof typeof RETENTION_POLICIES;

/** The command history cap, named the way SLACK_HISTORY_LIMIT and
 *  WORKER_HISTORY_LIMIT are so db.ts reads like its siblings. */
export const COMMAND_HISTORY_LIMIT = RETENTION_POLICIES.commandHistory.max;

// ─── line based files ────────────────────────────────────────────────────────

/** One line of a ledger, as far as the planner cares. Byte length only, so a
 *  200 MB ledger is planned from numbers and never from its contents. */
export interface LedgerLine {
  /** Bytes of the line INCLUDING its trailing newline. */
  readonly bytes: number;
}

export interface TrimPlan {
  /** Lines dropped from the FRONT (oldest first). */
  readonly drop: number;
  /** Lines kept, always the newest ones. */
  readonly keep: number;
  /** Byte offset, within the lines given, of the first line to keep. */
  readonly keepFromByte: number;
  readonly bytesDropped: number;
  readonly bytesKept: number;
}

/**
 * What survives a trim: the NEWEST lines that fit the bound.
 *
 * Never returns an empty keep for a non empty file. A single line larger than
 * the whole budget is kept anyway, because a file trimmed to nothing has lost
 * the one thing a trim is supposed to protect, and one oversized line is a
 * malformed writer's problem rather than a retention problem.
 */
export function planTrim(lines: readonly LedgerLine[], policy: RetentionPolicy): TrimPlan {
  const total = lines.reduce((n, l) => n + Math.max(0, l.bytes), 0);
  if (lines.length === 0) return { drop: 0, keep: 0, keepFromByte: 0, bytesDropped: 0, bytesKept: 0 };

  let keep: number;
  if (policy.kind === 'count') {
    keep = Math.min(lines.length, Math.max(1, Math.floor(policy.max)));
  } else {
    let acc = 0;
    keep = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      const b = Math.max(0, lines[i].bytes);
      if (keep > 0 && acc + b > policy.max) break;
      acc += b;
      keep++;
    }
  }
  const drop = lines.length - keep;
  let bytesDropped = 0;
  for (let i = 0; i < drop; i++) bytesDropped += Math.max(0, lines[i].bytes);
  return { drop, keep, keepFromByte: bytesDropped, bytesDropped, bytesKept: total - bytesDropped };
}

// ─── directory based stores ──────────────────────────────────────────────────

/** A file or directory in a store, as far as the planner cares. */
export interface ReapCandidate {
  readonly name: string;
  readonly mtimeMs: number;
}

export interface ReapPlan {
  readonly keep: string[];
  readonly drop: string[];
}

/** Local calendar day of a timestamp. Local rather than UTC because the daily
 *  tier exists for a person saying "some time on Tuesday", and their Tuesday is
 *  the local one. */
function dayKey(ms: number): string {
  const d = new Date(ms);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}${mo}${day}`;
}

/**
 * Which entries to delete, newest kept first.
 *
 * Order: newest mtime first, ties broken on name descending so two files written
 * in the same millisecond produce a stable, reproducible plan rather than one
 * that depends on readdir order.
 *
 * Then, in order:
 *   1. the newest `max` are kept, always;
 *   2. if `keepDailyDays` is set, the newest survivor of each of the next
 *      `keepDailyDays` distinct days is kept as well;
 *   3. anything younger than `minAgeMs` is kept, whatever the plan says;
 *   4. everything else is dropped.
 *
 * Refuses to plan a total wipe: if the rules would drop every entry the plan
 * comes back empty instead. Deleting a user's last copy of anything is the one
 * outcome this module must never produce, so it is refused here as well as
 * guarded in main.
 */
export function planReap(
  files: readonly ReapCandidate[],
  policy: RetentionPolicy,
  nowMs: number
): ReapPlan {
  const sorted = [...files].sort((a, b) => (b.mtimeMs - a.mtimeMs) || b.name.localeCompare(a.name));
  const max = Math.max(1, Math.floor(policy.max));
  const keep: string[] = [];
  const drop: string[] = [];
  const daysKept = new Set<string>();
  const dailyBudget = Math.max(0, policy.keepDailyDays ?? 0);
  const minAge = Math.max(0, policy.minAgeMs ?? 0);
  let dailyUsed = 0;

  sorted.forEach((f, i) => {
    if (i < max) { keep.push(f.name); daysKept.add(dayKey(f.mtimeMs)); return; }
    if (nowMs - f.mtimeMs < minAge) { keep.push(f.name); return; }
    if (dailyUsed < dailyBudget) {
      const k = dayKey(f.mtimeMs);
      if (!daysKept.has(k)) {
        daysKept.add(k);
        dailyUsed++;
        keep.push(f.name);
        return;
      }
    }
    drop.push(f.name);
  });

  if (files.length > 0 && keep.length === 0) return { keep: sorted.map((f) => f.name), drop: [] };
  return { keep, drop };
}

// ─── the cost ledger's carry ─────────────────────────────────────────────────

/**
 * Trimming the cost ledger by lines alone would silently break lifetime spend.
 *
 * costLifetime.ts recovers lifetime cost from this file by folding each
 * (agent, session) run of CUMULATIVE samples: a DECREASE means the app
 * restarted, so the segment that just ended is committed at its peak and a new
 * one opens. Lifetime for a key is therefore `sum(peaks of closed segments) +
 * peak of the open one`. Drop the head of the file and every closed segment in
 * it is gone, and the number the PRO floor shows for an agent falls, with
 * nothing to tell the user why.
 *
 * So the trim carries the dropped region forward in two kinds of line, and the
 * arithmetic comes out EXACT:
 *
 *   1. For every key that STRADDLES the cut, its last dropped line, verbatim.
 *      Within an open segment the counter only climbs, so the last value IS the
 *      peak, and the kept rows then fold on from exactly where they left off.
 *   2. One carry line per agent holding, for every key, the sum of its closed
 *      segment peaks, plus the whole value of any key that ended in the dropped
 *      region and so needs no line of its own. It is written under a reserved
 *      session id that can never collide with a real session. On the next sweep
 *      that carry line is itself in the dropped region and folds back into the
 *      new one, so carries collapse rather than accumulate.
 *
 * Straddling keys are the only ones that leave a line behind, and there is at
 * most one per live session, so the head this adds is a handful of lines rather
 * than one per session the machine has ever run. That distinction matters: a
 * floor that spawns a hundred ephemeral workers a day would otherwise grow a
 * survivor line per worker forever, which is the exact shape of leak this
 * module exists to remove.
 *
 * test/retention.test.cjs proves the invariant the way it actually matters: it
 * folds the original and the trimmed file through costLifetime.ts's OWN
 * `lifetimeUsdFromLedger` and asserts the totals match, so the two folds can
 * never drift apart without a red test.
 */
export const CARRY_SESSION_ID = 'retention_carry';

/** Float noise guard, the same one costLifetime.ts uses. A cumulative counter
 *  has no legitimate reason to go down, so anything below this is dust. */
const EPS = 1e-9;

interface CarrySegment {
  committed: number;
  peak: number;
  lastLine: string;
}

export interface CostCarryPlan {
  /** One line per agent, written first. */
  readonly carry: string[];
  /** The last dropped line of every straddling key, in the order the keys first
   *  appeared, written after the carry lines. */
  readonly survivors: string[];
}

/** The (agent, session) key one raw ledger line belongs to, or null when the
 *  line is not a usable row. Exported so main builds the "still present after
 *  the cut" set with the same derivation the fold uses. */
export function costLedgerKeyOf(line: string): string | null {
  const raw = line.trim();
  if (!raw) return null;
  let row: { agent_id?: unknown; session_id?: unknown };
  try { row = JSON.parse(raw); } catch { return null; }
  if (!row || typeof row.agent_id !== 'string' || !row.agent_id) return null;
  return `${row.agent_id}\t${typeof row.session_id === 'string' ? row.session_id : ''}`;
}

/**
 * Folds the dropped region of a cost ledger one line at a time, so main can
 * stream a 200 MB file past it without ever holding the file in memory. State
 * is one small record per (agent, session) key seen in the dropped region.
 */
export class CostCarryFold {
  private readonly seg = new Map<string, CarrySegment>();
  private readonly carried = new Map<string, number>();

  /** Fold one raw line. Unparseable or shapeless lines are skipped, exactly as
   *  costLifetime.ts skips them, so a half written tail costs that line only. */
  add(line: string): void {
    const raw = line.trim();
    if (!raw) return;
    let row: { agent_id?: unknown; session_id?: unknown; usd?: unknown };
    try { row = JSON.parse(raw); } catch { return; }
    if (!row || typeof row.agent_id !== 'string' || !row.agent_id) return;
    const agentId = row.agent_id;
    const sessionId = typeof row.session_id === 'string' ? row.session_id : '';
    const usd = typeof row.usd === 'number' && Number.isFinite(row.usd) ? row.usd : 0;

    // The reserved key never survives as a line: its whole value folds into the
    // next carry, which is what stops two carry lines for one agent ever
    // existing at once (the fold would read the second as a reset, not a sum).
    if (sessionId === CARRY_SESSION_ID) {
      this.carried.set(agentId, (this.carried.get(agentId) ?? 0) + usd);
      return;
    }

    const key = `${agentId}\t${sessionId}`;
    let s = this.seg.get(key);
    if (!s) { s = { committed: 0, peak: 0, lastLine: raw }; this.seg.set(key, s); }
    s.lastLine = raw;
    if (usd < s.peak - EPS) { s.committed += s.peak; s.peak = usd; }
    else if (usd > s.peak) { s.peak = usd; }
  }

  /**
   * The lines to write at the head of the trimmed ledger.
   *
   * `keptKeys` is the set of keys that still have rows after the cut, from
   * costLedgerKeyOf. A key not in it ended in the dropped region, so its whole
   * value folds into the carry and it needs no line. Omitting the set is still
   * exact, it just leaves a line for every key instead of only the straddling
   * ones, which is the right fallback for a caller that cannot see the tail.
   */
  finish(nowMs: number, keptKeys?: ReadonlySet<string>): CostCarryPlan {
    const totals = new Map(this.carried);
    const survivors: string[] = [];
    for (const [key, s] of this.seg) {
      const agentId = key.slice(0, key.indexOf('\t'));
      const straddles = keptKeys ? keptKeys.has(key) : true;
      const carried = straddles ? s.committed : s.committed + s.peak;
      if (carried > 0) totals.set(agentId, (totals.get(agentId) ?? 0) + carried);
      if (straddles) survivors.push(s.lastLine);
    }
    const carry: string[] = [];
    for (const [agentId, usd] of totals) {
      if (!(usd > 0)) continue;
      carry.push(JSON.stringify({
        agent_id: agentId,
        session_id: CARRY_SESSION_ID,
        ts: nowMs,
        input: 0,
        output: 0,
        cache_read: 0,
        cache_creation: 0,
        model: CARRY_SESSION_ID,
        usd
      }));
    }
    return { carry, survivors };
  }
}

/** One shot version of the fold, for tests and for any caller that already has
 *  the dropped lines in hand. Shares the exact code path so the two agree. */
export function planCostLedgerCarry(
  droppedLines: readonly string[],
  nowMs: number,
  keptLines: readonly string[] = []
): CostCarryPlan {
  const fold = new CostCarryFold();
  for (const l of droppedLines) fold.add(l);
  const keptKeys = new Set<string>();
  for (const l of keptLines) {
    const k = costLedgerKeyOf(l);
    if (k) keptKeys.add(k);
  }
  return fold.finish(nowMs, keptKeys);
}

// ─── copy ────────────────────────────────────────────────────────────────────

/** A size a person can read. Whole numbers under 10 units get one decimal, so
 *  "1.4 MB" and "940 KB" rather than "1.42891 MB". No dashes anywhere. */
export function formatBytes(bytes: number): string {
  const n = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
  return `${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10} ${units[u]}`;
}

/** What one store's sweep did, in the shape the copy below reads. */
export interface RetentionOutcome {
  readonly id: string;
  readonly label: string;
  /** Files, directories, lines or rows removed. */
  readonly removed: number;
  readonly freedBytes: number;
  /** Set when the sweep declined to touch a store, and why. */
  readonly refused?: string;
}

/** One line for one store. User visible, so no dashes. */
export function retentionLine(o: RetentionOutcome): string {
  if (o.refused) return `${o.label}: skipped, ${o.refused}.`;
  if (!o.removed && !o.freedBytes) return `${o.label}: already inside its limit.`;
  if (!o.removed) return `${o.label}: freed ${formatBytes(o.freedBytes)}.`;
  return `${o.label}: removed ${o.removed.toLocaleString('en-US')}, freed ${formatBytes(o.freedBytes)}.`;
}

/** The whole sweep in one sentence. User visible, so no dashes. */
export function retentionSummary(outcomes: readonly RetentionOutcome[]): string {
  const worked = outcomes.filter((o) => !o.refused && (o.removed > 0 || o.freedBytes > 0));
  if (worked.length === 0) return 'Every store on disk is already inside its limit.';
  const freed = worked.reduce((n, o) => n + o.freedBytes, 0);
  const stores = worked.length === 1 ? '1 store' : `${worked.length} stores`;
  return `Trimmed ${stores} and freed ${formatBytes(freed)}.`;
}

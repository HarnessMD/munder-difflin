/**
 * Reap agent processes a PREVIOUS run left behind.
 *
 * Every agent PTY is a child of the browser process, and the normal quit path
 * tears them down: killAll() kills each one, and on POSIX closing the pty HUPs
 * the foreground group. Neither runs if the app never gets to quit. A main
 * process that is SIGKILLed, OOM killed, or lost to a power cut leaves its
 * agents running, reparented to init, with no window and nobody to stop them.
 *
 * They are not merely idle. Observed live on 2026-09-07: an orphaned `codex`
 * from a killed run still held its session rollout open, so the NEXT launch
 * could not resume that agent at all ("thread ... already has an active writer
 * (code -32600)"), and it was dead on arrival every time until the orphan was
 * killed by hand. A survivor also keeps burning tokens and CPU against an
 * account nobody is watching.
 *
 * So the app records the PTYs it starts, and sweeps the survivors at startup.
 *
 * The whole risk here is PID reuse: a recorded pid may belong to something else
 * entirely by the next launch, and killing a stranger's process tree is far
 * worse than leaving an orphan. Every kill is therefore gated on IDENTITY, not
 * just liveness: the process must still have the start time AND the command we
 * recorded. When identity cannot be established, for any reason, nothing is
 * killed. A missed orphan is a nuisance; a wrong kill is not.
 *
 * 0.5.5 perf rule: nothing here blocks the main process on `ps`. A spawn only
 * notes the pid; the identity is read by one async `ps` a moment later (once
 * the child has exec'd its real binary), and the boot sweep reads every
 * survivor's identity in ONE async `ps` call.
 */
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { hardKillTree, isAlive } from './procKill';

/** One PTY we started, in enough detail to recognise it again after a restart. */
export interface LedgerEntry {
  /** The pty id, for the log line; never used to match. */
  id: string;
  pid: number;
  /** `ps -o lstart=`: a full precision start timestamp. The pid alone is not
   *  an identity; the pid plus its start time effectively is. */
  startedAt: string;
  /** Last token of `ps -o comm=`, e.g. `node` or `codex`. A second, cheap
   *  check: a reused pid that somehow shares a start time is still very
   *  unlikely to also be running the same binary. */
  command: string;
}

export interface ProcessIdentity { startedAt: string; command: string }

/** How long after a spawn the identity is read. node-pty starts the child
 *  through a helper that then execs the real binary; reading too early would
 *  record the helper's name. The start time does not change across exec. */
export const IDENTITY_DELAY_MS = 1_500;
const PS_TIMEOUT_MS = 2_000;

/** Parse `ps -o pid=,lstart=,comm=` output into pid → identity.
 *
 *  Parsed from the END, not by column width: `lstart` is rendered in the
 *  machine's LOCALE, so it is neither a fixed width nor a known format ("Mon
 *  Sep  7 09:46:24 2026" in C, "lun. sept.  7 09:46:24 2026" in fr_FR). The
 *  pid leads, the last field is the command and everything between is the
 *  timestamp, whatever the locale renders. That the string is locale dependent
 *  is fine: it is only ever compared against a value THIS machine recorded
 *  earlier, and a locale change between runs makes the comparison fail, which
 *  spares the process: the safe direction. */
export function parsePsIdentities(stdout: string): Map<number, ProcessIdentity> {
  const out = new Map<number, ProcessIdentity>();
  for (const raw of String(stdout ?? '').split('\n')) {
    const m = raw.match(/^\s*(\d+)\s+(.*\S)\s+(\S+)\s*$/);
    if (!m) continue;
    out.set(Number(m[1]), { startedAt: m[2].trim(), command: m[3] });
  }
  return out;
}

/** Identities of the given live pids, read with ONE async `ps`. A pid missing
 *  from the map is gone or unverifiable. Never rejects; always empty on
 *  Windows (no `ps`), so nothing is ever killed there by this path. */
export function readIdentities(pids: number[]): Promise<Map<number, ProcessIdentity>> {
  const valid = pids.filter((p) => Number.isInteger(p) && p > 0);
  if (!valid.length || process.platform === 'win32') return Promise.resolve(new Map());
  return new Promise((resolve) => {
    try {
      execFile('ps', ['-o', 'pid=,lstart=,comm=', '-p', valid.join(',')],
        { timeout: PS_TIMEOUT_MS, encoding: 'utf8' },
        // `ps` exits 1 when any listed pid is gone, with the others still
        // printed, so stdout is read whatever the exit status.
        (_err, stdout) => resolve(parsePsIdentities(String(stdout ?? ''))));
    } catch { resolve(new Map()); }
  });
}

/** Whether this recorded entry still names the SAME process we started.
 *
 *  Exported because it is the entire safety argument for the sweep, and it is
 *  worth being able to test on its own. */
export function isSameProcess(entry: LedgerEntry, live: ProcessIdentity | null | undefined): boolean {
  if (!live) return false;                                  // gone, or unverifiable
  if (!entry.startedAt || !entry.command) return false;     // ledger from an older build
  return live.startedAt === entry.startedAt && live.command === entry.command;
}

export function readLedger(path: string): LedgerEntry[] {
  try {
    if (!existsSync(path)) return [];
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (!Array.isArray(raw)) return [];
    return raw.filter((e): e is LedgerEntry =>
      !!e && typeof (e as LedgerEntry).pid === 'number' &&
      typeof (e as LedgerEntry).startedAt === 'string' &&
      typeof (e as LedgerEntry).command === 'string');
  } catch { return []; }
}

function writeLedger(path: string, rows: LedgerEntry[]): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(rows));
  } catch { /* the ledger is a best effort record, never a blocker */ }
}

/**
 * Track the PTYs of the CURRENT run.
 *
 * Deliberately a plain file rewritten on each change rather than an append log:
 * the set is small (one row per running agent), and a file that is always the
 * complete truth cannot be left half replayed by a crash mid write.
 */
export class AgentLedger {
  private rows: LedgerEntry[] = [];
  /** Pids noted at spawn whose identity has not been read yet. */
  private pending = new Map<number, string>();

  constructor(
    private readonly path: string,
    private readonly identify: (pids: number[]) => Promise<Map<number, ProcessIdentity>> = readIdentities,
    private readonly delayMs: number = IDENTITY_DELAY_MS
  ) {}

  /** Note a PTY we just started. Costs a Map insert and an unref'd timer: the
   *  identity is read later by one async `ps`, while the pid is still ours
   *  (a pid that exits first is forgotten by remove() and never recorded).
   *  Reading it at sweep time instead would describe whoever holds the pid
   *  then, which proves nothing. Returns when the row is settled (tests). */
  add(id: string, pid: number): Promise<void> {
    if (!Number.isInteger(pid) || pid <= 0 || process.platform === 'win32') return Promise.resolve();
    this.pending.set(pid, id);
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        void this.identify([pid]).then((ids) => {
          // Exited (or killed) while we waited: it has nothing to be swept for.
          if (this.pending.get(pid) !== id) { resolve(); return; }
          this.pending.delete(pid);
          const live = ids.get(pid);
          if (!live) { resolve(); return; }           // unverifiable now = never sweepable later
          this.rows = this.rows.filter((r) => r.pid !== pid);
          this.rows.push({ id, pid, ...live });
          writeLedger(this.path, this.rows);
          resolve();
        }, () => resolve());
      }, this.delayMs);
      t.unref?.();
    });
  }

  /** Forget a PTY that exited or was killed. */
  remove(pid: number): void {
    this.pending.delete(pid);
    const next = this.rows.filter((r) => r.pid !== pid);
    if (next.length === this.rows.length) return;
    this.rows = next;
    writeLedger(this.path, next);
  }

  /** Drop the whole ledger: the clean quit path, where killAll() has already
   *  stopped everything and nothing should be swept next time. */
  clear(): void {
    this.rows = [];
    this.pending.clear();
    try { rmSync(this.path, { force: true }); } catch { /* nothing to remove */ }
  }
}

export interface SweepReport {
  /** Entries that were still the process we started, and were killed. */
  killed: LedgerEntry[];
  /** Entries whose pid was alive but is no longer ours: deliberately spared. */
  spared: LedgerEntry[];
}

/**
 * Take the previous run's ledger off disk. Synchronous and tiny (one small
 * JSON read and an unlink), and it MUST run before this run spawns anything:
 * this run's ledger writes to the same path. The async check then works on
 * the rows in memory.
 */
export function takePreviousLedger(ledgerPath: string): LedgerEntry[] {
  const rows = readLedger(ledgerPath);
  try { rmSync(ledgerPath, { force: true }); } catch { /* already gone */ }
  return rows;
}

/**
 * Kill whatever a previous run left behind. One async `ps` for every survivor,
 * then a group kill for each one that is provably still ours.
 *
 * Windows takes the same path: readIdentities is empty there (no `ps`), so
 * nothing is killed rather than something wrong being killed. Windows quits
 * already run a synchronous `taskkill /T /F` sweep in killAll().
 */
export async function sweepStaleAgents(
  rows: LedgerEntry[],
  log: (msg: string, detail?: unknown) => void = () => {},
  identify: (pids: number[]) => Promise<Map<number, ProcessIdentity>> = readIdentities
): Promise<SweepReport> {
  const report: SweepReport = { killed: [], spared: [] };
  const alive = rows.filter((e) => isAlive(e.pid));        // the rest exited on their own
  if (!alive.length) return report;
  const ids = await identify(alive.map((e) => e.pid));
  for (const entry of alive) {
    if (!isSameProcess(entry, ids.get(entry.pid))) {
      // The pid is in use by something that is not our agent, or we could not
      // prove otherwise. Either way it is not ours to kill.
      report.spared.push(entry);
      continue;
    }
    hardKillTree(entry.pid);
    report.killed.push(entry);
  }
  if (report.killed.length || report.spared.length) {
    log('[stale-agents] swept a previous run', {
      killed: report.killed.map((e) => `${e.id}:${e.pid}`),
      spared: report.spared.map((e) => `${e.id}:${e.pid}`)
    });
  }
  return report;
}

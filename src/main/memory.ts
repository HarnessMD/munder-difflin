/**
 * MemoryManager — semantic memory for the hive, backed by the MemPalace CLI.
 *
 * CLI-only (no MCP): the harness keeps a single shared palace under harnessHome,
 * points every agent's `MEMPALACE_PALACE_PATH` at it, and mines each agent's
 * `memory.md` into its own wing so the whole team can recall by meaning via
 * `mempalace search` / `mempalace wake-up`. Degrades silently to no-op when the
 * `mempalace` CLI isn't installed — the markdown memory still works.
 *
 *   init    : mempalace init <home> --yes --no-llm        (heuristics-only, no LLM)
 *   store   : mempalace mine <stageDir> --wing <id> --agent <id>
 *   recall  : mempalace search "<q>" --results N   /   mempalace wake-up
 *
 * 0.5.6: the store holds memory files only. `stageDir` is a folder of copies
 * of one agent's memory files, never the agent folder itself, and the store
 * from before is moved aside once. Both are in palaceScope.ts.
 *
 * 0.5.6: every run, the app's and an agent's (`md-memory`), takes one machine
 * wide lock per store first, so only one MemPalace loads at a time
 * (memoryGate.ts). See gatedSpawn.
 *
 * Runs in the Electron main process.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ensureKilled } from './procKill';
import { findCommandOnPath, shellPathGeneration, userShellPath } from './shellEnv';
import { quarantineDirsToReap, quarantineStampMs, nextMineDelayMs } from './palaceReap';
import {
  MINE_STAGE_DIR, memoryFilesOf, memoryFilesStamp, pruneMineStage, rebuildPalaceOnce, syncMineStage
} from './palaceScope';
import { AGENT_IGNORE_LINES, mergeIgnoreLines } from '../shared/hiveRepo';
import { redactSecrets } from '../shared/redactSecrets';
import { syncCodexMemory, type OpenSqlite } from './codexMemory';
import { MEMORY_GATE_BUSY_EXIT, ensureLockFile, gateEnv, gatedCommand, palaceLockPath, type GateOptions } from './memoryGate';

/** Non-memory files `mempalace mine` must not ingest: the Claude Code hooks
 *  config (a large JSON blob that swamps the wake-up digest), the cursor, raw
 *  inbox/outbox message JSON, and a Codex worker's private CODEX_HOME. `mempalace
 *  mine` honors .gitignore, so we drop one in each agent dir rather than touch the
 *  mine command.
 *
 *  The list itself lives in shared/hiveRepo.ts. It used to be declared here AND
 *  in hive.ts with a "MUST STAY IN SYNC" comment on both, which is the kind of
 *  invariant that drifts with no symptom until a repo bloats again. There is one
 *  copy now. See shared/hiveRepo.ts for why `.codex/` matters beyond mempalace:
 *  it is also what stops the hive's git repo versioning every Codex transcript
 *  and sqlite log, which reached 7.5GB of .git on one hive and far more on
 *  others. This writer is still the important one: it runs on every mine cycle,
 *  so it is the only one that reaches an agent that is not running.
 *
 *  0.5.6: the miner no longer reads the agent folder (it reads the staged
 *  copies, palaceScope.ts), so this file no longer decides what is indexed. It
 *  is still written here for the hive's git history, which is why it must stay
 *  a list of things to leave out and never become an allow list. */

/** Idempotently ensure `<agentDir>/.gitignore` excludes the non-memory files.
 *  Writes only the missing lines (append-only) so it's safe to call every cycle. */
function ensureMineIgnore(agentDir: string): void {
  const path = join(agentDir, '.gitignore');
  let existing = '';
  try { if (existsSync(path)) existing = readFileSync(path, 'utf8'); } catch { return; }
  const merged = mergeIgnoreLines(existing, AGENT_IGNORE_LINES);
  if (merged === null) return; // already covered — don't rewrite every cycle
  try { writeFileSync(path, merged, 'utf8'); } catch { /* best-effort */ }
}

export type EmbeddingModel = 'minilm' | 'embeddinggemma';

export interface MemorySettings {
  enabled: boolean;
  model: EmbeddingModel;
}

export interface MemoryStatus {
  available: boolean;        // mempalace CLI found on PATH
  enabled: boolean;          // user setting
  active: boolean;           // available && enabled && have a home
  initialized: boolean;      // palace directory exists
  palacePath: string | null;
  model: EmbeddingModel;
  bin: string | null;
}

// Re-mine changed memories every 10 min, up from 3.
//
// Every `mempalace mine` opens the palace, and every open runs MemPalace's
// quarantine gate — which on a palace stuck in the rename loop means another
// full-size copy of the segment left on disk. The gate is not ours to fix, but
// how often we invoke it is. Mining is already skipped for agents whose
// memory.md has not changed, so this only affects an agent editing its notes
// repeatedly: its changes are batched into one mine instead of three. A memory
// written now is searchable within ten minutes rather than three, which no one
// is waiting on. `reapPalace` handles the copies that still get made.
const MINE_INTERVAL_MS = 600_000;
// Ceiling for the quarantine backoff below. Low on purpose: a memory is not
// searchable until it has been mined, and the reaper already handles the disk,
// so there is nothing here worth making recall half an hour stale for.
const MINE_BACKOFF_MAX_MS = 1_800_000;
const MINE_TIMEOUT_MS = 10 * 60_000; // hard cap per mine (first run downloads the embedding model)
/** 0.5.6: how long a mine waits for the machine wide MemPalace lock
 *  (memoryGate.ts) before it counts as not done and is tried again on a later
 *  pass. Longer than an agent's 60 s: a search holds the lock for at most 180 s.
 *  The mine itself has no 180 s limit; MINE_TIMEOUT_MS still caps it, counted
 *  after this wait. */
const MINE_LOCK_WAIT_MS = 5 * 60_000;
/** mempalace's device "auto" picks the CoreML execution provider on Apple
 *  Silicon, and CoreML runs the quantized embeddinggemma ONNX graph partially
 *  (330/1647 nodes) with fp16 partitions that overflow → EVERY vector comes
 *  back NaN and chroma rejects every upsert ("Embeddings must not contain NaN
 *  or Infinity values"), so no memory ever gets indexed. Reproduced + verified
 *  2026-08-16: same input is NaN under CoreMLExecutionProvider and clean under
 *  CPU. Pin cpu for BOTH the mine loop and the agents' own `mempalace search`
 *  (a query embedded to NaN breaks recall the same way).
 *
 *  Scope, deliberately macOS-WIDE rather than per-model: the pin costs the
 *  other model nothing. minilm rides chromadb's ONNXMiniLM_L6_V2, whose model
 *  build UNCONDITIONALLY removes CoreMLExecutionProvider ("not as well
 *  optimized as CPU" — chromadb's words), so minilm never runs on CoreML with
 *  or without this pin; embeddinggemma (mempalace's own ONNX class, no such
 *  pruning) is the only path that would reach CoreML, and that path is the NaN
 *  bug. Other platforms keep mempalace's own default ("auto").
 *
 *  A user's OWN device choice wins: if MEMPALACE_EMBEDDING_DEVICE is already
 *  exported we emit nothing, so the inherited value flows through untouched —
 *  which also leaves a one-command way to reproduce the NaN behaviour
 *  (`MEMPALACE_EMBEDDING_DEVICE=coreml`). Exported as a function of
 *  (platform, envOverride) so every branch is reachable from a test on any
 *  platform — same trick as `buildMissingCliScript`. */
export function mempalaceDevice(
  platform: NodeJS.Platform,
  envOverride: string | undefined
): string | undefined {
  if (envOverride) return undefined; // explicit user choice — never override
  return platform === 'darwin' ? 'cpu' : undefined;
}
const MEMPALACE_DEVICE = mempalaceDevice(process.platform, process.env.MEMPALACE_EMBEDDING_DEVICE);

export class MemoryManager {
  private binCache: string | null | undefined;
  /** The shell PATH generation `binCache` was resolved against. */
  private binGen = -1;
  private mineTimer: NodeJS.Timeout | null = null;
  private mineStopped = false;
  /** Current gap between mine passes. Widens while the palace is quarantining. */
  private mineDelayMs = MINE_INTERVAL_MS;
  /** Newest quarantine stamp seen so far, so a LATER one means the palace
   *  quarantined again. A count would be useless: the reaper deletes them. */
  private lastQuarantineTs = 0;
  private initStarted = false;
  /** True while a mineNow() pass is in flight — serializes palace writers. */
  private mining = false;
  /** agentId → stamp of its memory files at last successful mine (skip
   *  unchanged). 0.5.6: every memory file counts, not memory.md alone. */
  private lastMined = new Map<string, string>();
  /** 0.5.6: the one time rebuild is tried once per run (see rebuildOnce). */
  private rebuildTried = false;
  /** 0.5.6: a mine's wait for the MemPalace lock. A field so a test can shorten it. */
  private mineLockWaitMs = MINE_LOCK_WAIT_MS;

  constructor(
    private getHome: () => string | null,
    private getSettings: () => MemorySettings,
    /** Whose Codex memories are copied into codex-memory.md before a pass stages their files, and the
     *  SQLite library to read them with (main/codexMemory.ts). Absent: nothing is copied or removed. */
    private codex?: { on: (agentId: string) => boolean; open: OpenSqlite }
  ) {}

  palacePath(): string | null {
    const h = this.getHome();
    return h ? join(h, 'palace') : null;
  }

  /** Resolve the mempalace CLI against the user's PATH + common uv/pip spots. */
  bin(): string | null {
    const gen = shellPathGeneration();
    // A found CLI is kept for the whole run, while the file is still there.
    if (this.binCache && this.binGen === gen && existsSync(this.binCache)) return this.binCache;
    const isWin = process.platform === 'win32';
    // "Not found" is kept on Windows (looking again is a process); elsewhere
    // looking again is a few file checks, so an install made from a terminal
    // while the app runs is seen by the next caller.
    if (isWin && this.binCache === null && this.binGen === gen) return null;
    let found: string | null = null;
    // 1) Ask the PATH. Windows uses `where` and a `.exe` suffix; everything
    //    else walks the folders of the login shell's PATH. No shell is started
    //    (0.5.5, Plan G: `$SHELL -ilc which mempalace` blocked the main
    //    process for 1.5 s at launch and on every status request).
    try {
      if (isWin) {
        const res = spawnSync('where', ['mempalace'], { encoding: 'utf8', timeout: 3000 });
        const p = res.stdout.trim().split(/\r?\n/)[0]?.trim();
        if (p && existsSync(p)) found = p;
      } else {
        found = findCommandOnPath('mempalace', userShellPath());
      }
    } catch { /* fall through */ }
    // 2) Probe common install locations (uv tool / homebrew / pip).
    if (!found) found = this.fallbackBin();
    this.binCache = found;
    this.binGen = gen;
    return found;
  }

  /** The common uv tool / homebrew / pip locations, checked with existsSync
   *  only (no process). Used after a PATH lookup found nothing. */
  fallbackBin(): string | null {
    const isWin = process.platform === 'win32';
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    const candidates = isWin
      ? [
          join(home, '.local', 'bin', 'mempalace.exe'),
          join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Python', 'Scripts', 'mempalace.exe')
        ]
      : [
          `${home}/.local/bin/mempalace`,
          '/opt/homebrew/bin/mempalace',
          '/usr/local/bin/mempalace'
        ];
    for (const c of candidates) if (c && existsSync(c)) return c;
    return null;
  }
  /** Force re-resolution (e.g. after the user installs mempalace). */
  resetBinCache(): void { this.binCache = undefined; }

  available(): boolean { return this.bin() !== null; }
  enabled(): boolean { return this.getSettings().enabled; }
  active(): boolean { return this.available() && this.enabled() && this.getHome() !== null; }
  model(): EmbeddingModel { return this.getSettings().model === 'embeddinggemma' ? 'embeddinggemma' : 'minilm'; }

  status(): MemoryStatus {
    return this.statusWithBin(this.bin());
  }

  /** Build status from a CLI path an async batch resolver already found, so a
   *  status probe does not have to launch a synchronous login shell (the setup
   *  panel's tools:status, issue #446). */
  statusWithBin(bin: string | null): MemoryStatus {
    const palace = this.palacePath();
    const enabled = this.enabled();
    return {
      available: bin !== null,
      enabled,
      active: bin !== null && enabled && this.getHome() !== null,
      initialized: !!palace && existsSync(palace),
      palacePath: palace,
      model: this.model(),
      bin
    };
  }

  /** Env merged into each agent's spawn so its `mempalace` CLI hits the shared palace. */
  env(): Record<string, string> {
    const palace = this.palacePath();
    if (!this.active() || !palace) return {};
    // 0.5.6: the lock file `md-memory` takes. Made here, before the agent
    // starts, because a sandboxed agent may write the store but not the folder
    // the lock sits in; it can still lock a file it can only read.
    ensureLockFile(palaceLockPath(palace));
    return {
      MEMPALACE_PALACE_PATH: palace,
      MEMPALACE_EMBEDDING_MODEL: this.model(),
      ...(MEMPALACE_DEVICE ? { MEMPALACE_EMBEDDING_DEVICE: MEMPALACE_DEVICE } : {})
    };
  }

  private childEnv(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      MEMPALACE_PALACE_PATH: this.palacePath() ?? '',
      MEMPALACE_EMBEDDING_MODEL: this.model(),
      ...(MEMPALACE_DEVICE ? { MEMPALACE_EMBEDDING_DEVICE: MEMPALACE_DEVICE } : {})
    };
  }

  /**
   * 0.5.6: how the app runs `mempalace <args>`: under the same machine wide
   * lock as an agent's `md-memory` (memoryGate.ts), on the same lock file
   * (`<palace>.lock`, from MEMPALACE_PALACE_PATH in childEnv). When no Python
   * is found for the gate, mempalace runs directly, as before.
   */
  private gatedSpawn(bin: string, args: string[], gate: GateOptions): { command: string; args: string[]; env: NodeJS.ProcessEnv } {
    const palace = this.palacePath();
    const lock = palace ? palaceLockPath(palace) : '';
    if (lock) ensureLockFile(lock);
    const run = lock ? gatedCommand(bin, args, lock) : null;
    if (!run) return { command: bin, args, env: this.childEnv() };
    return { command: run.command, args: run.args, env: { ...this.childEnv(), ...gateEnv(gate) } };
  }

  // — lifecycle —

  /** Start the mine loop. `mempalace mine` auto-creates the palace on first run
   *  (lazily downloading the embedding model, one-time). We deliberately do NOT
   *  run `mempalace init`: it ends in an interactive "Mine now? [Y/n]" prompt
   *  that --yes doesn't cover, so a spawned child would hang forever. */
  start(): void {
    if (!this.active() || this.initStarted) return;
    if (!this.bin() || !this.getHome() || !this.palacePath()) return;
    this.initStarted = true;
    // Sweep once at boot, before the first mine. An app updating into this fix
    // arrives at a palace that has been accumulating copies for as long as it
    // has been running — 357 of them here — and waiting for the first agent to
    // edit its memory.md would leave all of that on disk for an arbitrary
    // while. This is the pass that makes the existing pile go away by itself.
    this.reapPalace();
    this.startMineLoop();
  }

  stop(): void {
    this.mineStopped = true;
    if (this.mineTimer) { clearTimeout(this.mineTimer); this.mineTimer = null; }
  }

  /**
   * Re-resolve the CLI, arm the mine loop if it is only now possible, and report.
   *
   * `start()` runs once at boot and bails when mempalace isn't on PATH yet. If the
   * user installs it AFTER that — the common case, since the settings panel is
   * where they find out they need it — nothing re-invoked `start()`, so the mine
   * loop never ran. The palace is created by the first `mempalace mine`, so it
   * never appeared either, and `initialized` (existsSync(palace)) stayed false
   * while `available` flipped true: the status pill read "On — getting ready…"
   * forever and only an app restart cleared it.
   *
   * The status poll is the one thing that reliably notices the install, so it is
   * where the re-arm belongs. `start()` is idempotent (initStarted), so repeated
   * polls never start a second loop — and it still deliberately does NOT run
   * `mempalace init`, which ends in an interactive "Mine now? [Y/n]" that `--yes`
   * doesn't cover and that hangs a spawned child.
   */
  refresh(): MemoryStatus {
    // A CLI that was found stays found (bin() checks the file is still there).
    // Only "not found" is looked for again, so opening Settings starts nothing.
    if (!this.binCache) this.resetBinCache();
    this.start();
    return this.status();
  }

  /** Self-scheduling rather than `setInterval`, so the gap can widen when the
   *  palace is quarantining and snap back the moment it stops. */
  private startMineLoop(): void {
    if (this.mineTimer) return;
    const tick = () => {
      void this.mineNow().finally(() => {
        if (this.mineStopped) return;
        this.mineTimer = setTimeout(tick, this.mineDelayMs);
        this.mineTimer.unref?.();
      });
    };
    // Armed synchronously. `mineTimer` is the "is the loop running" signal that
    // `refresh()` reports on right after `start()`, and setting it only once the
    // first mine resolves would report the loop as dead for a whole pass —
    // which is exactly the re-arm-after-install case that has its own test.
    this.mineTimer = setTimeout(tick, 0);
    this.mineTimer.unref?.();
  }

  // — mining (store) —

  /** Mine every agent whose memory changed since last time, one at a time.
   *  The palace permits a single writer, so mines MUST be serialized — firing
   *  them concurrently makes all but one fail with "held by another writer".
   *  `mining` guards against a slow pass overlapping the next interval tick. */
  async mineNow(): Promise<void> {
    const home = this.getHome();
    const bin = this.bin();
    if (!this.active() || !home || !bin) return;
    if (this.mining) return; // a previous pass is still running — let it finish
    const agentsDir = join(home, 'hive', 'agents');
    if (!existsSync(agentsDir)) return;
    let ids: string[];
    try { ids = readdirSync(agentsDir); } catch { return; }
    const stageRoot = join(home, 'hive', MINE_STAGE_DIR);
    this.mining = true;
    try {
      this.rebuildOnce(); // with `mining` set: no mine of ours is writing the store
      for (const id of ids) {
        const agentDir = join(agentsDir, id);
        this.syncCodex(id, agentDir); // Before the files are listed, so the copy is staged this pass
        // 0.5.6: memory files only, whatever else the agent keeps in its folder.
        const files = memoryFilesOf(agentDir);
        const stamp = memoryFilesStamp(files);
        if (this.lastMined.get(id) === stamp) continue; // unchanged: skip the model load
        this.lastMined.set(id, stamp);
        const stageDir = join(stageRoot, id);
        let staged = 0;
        try { staged = syncMineStage(agentDir, stageDir, files); }
        catch (e) {
          console.error(`[memory] stage ${id} failed: ${e instanceof Error ? e.message : String(e)}`);
          this.lastMined.delete(id); // let the next tick retry
          continue;
        }
        if (!staged) continue; // no memory file, nothing to mine
        ensureMineIgnore(agentDir); // for the hive's git history, not for the miner
        await this.mineAgent(stageDir, id); // one writer at a time
      }
      pruneMineStage(stageRoot, ids);
    } finally {
      this.mining = false;
    }
    // Every pass above may have left another copy behind, and whether it did
    // decides how long we wait before the next one.
    const quarantined = this.reapPalace();
    this.mineDelayMs = nextMineDelayMs(
      this.mineDelayMs, MINE_INTERVAL_MS, MINE_BACKOFF_MAX_MS, quarantined
    );
  }

  /** Write or remove one agent's codex-memory.md (main/codexMemory.ts). On only for a Codex agent whose
   *  switch is on; for every other agent this removes a copy left behind, and finds nothing. A database that
   *  cannot be read leaves the last copy as it was. Never stops the pass. */
  private syncCodex(id: string, agentDir: string): void {
    const codex = this.codex;
    if (!codex) return;
    try {
      const r = syncCodexMemory(agentDir, id, codex.on(id), codex.open, redactSecrets);
      if (r === 'written' || r === 'removed') console.log(`[memory] codex memories of ${id}: ${r}`);
    } catch (e) {
      console.error(`[memory] codex memories of ${id} not read this pass: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /**
   * Delete quarantined segment copies MemPalace renamed aside and never removed.
   *
   * Safe to delete: the rename is precisely what takes them OUT of the palace's
   * live set, and Chroma has already rebuilt by the time we see one. They are
   * diagnostic residue. `quarantineDirsToReap` keeps the newest couple so there
   * is still something to look at, and refuses to touch anything recent enough
   * to still be mid-recovery.
   *
   * Best-effort throughout. A palace we cannot read, or a directory we cannot
   * remove, must never take down the mine loop — this is disk hygiene, not a
   * correctness path.
   */
  private reapPalace(): boolean {
    const palace = this.palacePath();
    if (!palace || !existsSync(palace)) return false;
    let names: string[];
    try { names = readdirSync(palace); } catch { return false; }

    let newest = 0;
    for (const name of names) {
      const ts = quarantineStampMs(name);
      if (ts !== null && ts > newest) newest = ts;
    }
    // The boot sweep runs before the first mine precisely so it can seed this:
    // otherwise a palace that arrives with a backlog would read as "just
    // quarantined" and back the loop off before it has mined anything.
    const fresh = this.lastQuarantineTs > 0 && newest > this.lastQuarantineTs;
    if (newest > this.lastQuarantineTs) this.lastQuarantineTs = newest;

    const doomed = quarantineDirsToReap(names.map((name) => ({ name })), Date.now());
    if (!doomed.length) return fresh;
    let removed = 0;
    for (const name of doomed) {
      try { rmSync(join(palace, name), { recursive: true, force: true }); removed += 1; }
      catch { /* locked, gone, or not ours — leave it and try again next pass */ }
    }
    if (removed) console.log(`[memory] reaped ${removed} quarantined palace segment(s)`);
    return fresh;
  }

  /**
   * 0.5.6, once per store: move the store from before aside so the miner fills
   * a new one from memory files only (rebuildPalaceOnce in palaceScope.ts has
   * the rules and the marker). Called at the head of a mine pass with `mining`
   * set, so it never runs while a mine of ours is writing the store. Tried
   * once per run: when the rename fails the old store stays in use and the
   * next launch tries again.
   *
   * Search needs no switch. Agents and the app read one path: it holds the old
   * store until the rename and the new one from the first mine after it, and
   * the new one answers with what has been mined so far. In the seconds
   * between, `mempalace search` reports that there is no palace and exits.
   */
  private rebuildOnce(): void {
    if (this.rebuildTried) return;
    this.rebuildTried = true;
    const palace = this.palacePath();
    if (!palace) return;
    const r = rebuildPalaceOnce(palace);
    if (r.state === 'failed') {
      console.error(`[memory] could not move the old search store aside (${r.error}); it stays in use, the next launch tries again`);
      return;
    }
    if (r.state === 'renamed') {
      this.lastMined.clear(); // the new store is empty: every agent is mined again
      console.log(`[memory] search store is rebuilt from memory files only; the old one is kept at ${r.aside}`);
    } else if (r.state === 'aside-exists') {
      console.warn(`[memory] ${r.aside} already exists; the search store was not moved aside`);
    }
    if (r.error) console.error(`[memory] ${r.error}`);
  }

  private mineAgent(stageDir: string, id: string): Promise<void> {
    return new Promise((resolve) => {
      const bin = this.bin();
      if (!bin) { resolve(); return; }
      // 0.5.6: under the machine wide MemPalace lock, with a longer wait than
      // an agent's search and no 180 s limit (MINE_TIMEOUT_MS below is the cap).
      // A lock that stays busy exits MEMORY_GATE_BUSY_EXIT: not done, retried.
      const run = this.gatedSpawn(bin, ['mine', stageDir, '--wing', id, '--agent', id], {
        waitSeconds: this.mineLockWaitMs / 1000, limitSeconds: 0, busyExit: MEMORY_GATE_BUSY_EXIT
      });
      // stdin closed (mempalace can prompt); mempalace dedups so re-mining is safe.
      const proc = spawn(run.command, run.args, {
        env: run.env, stdio: ['ignore', 'ignore', 'pipe']
      });
      let err = '';
      proc.stderr?.on('data', (d) => { err += d.toString(); });
      // Hard ceiling: a wedged mine used to hold its PID forever AND leave
      // `mining` stuck true, silently stopping all future passes. Generous cap
      // because the first run may lazily download the embedding model. Counted
      // after the lock wait, so a mine that waited still gets its full cap.
      const timer = setTimeout(() => {
        console.error(`[memory] mine ${id} timed out after ${MINE_TIMEOUT_MS / 60000}min — killing`);
        try { proc.kill('SIGTERM'); } catch { /* gone */ }
        ensureKilled(proc.pid); // SIGKILL sweep if SIGTERM is ignored
      }, MINE_TIMEOUT_MS + this.mineLockWaitMs);
      timer.unref?.();
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === MEMORY_GATE_BUSY_EXIT) {
          console.log(`[memory] mine ${id} waited for MemPalace and will be tried again on a later pass`);
          this.lastMined.delete(id); // never ran: nothing is marked indexed
        } else if (code !== 0) {
          console.error(`[memory] mine ${id} exited ${code}: ${err.slice(-300)}`);
          this.lastMined.delete(id); // let the next tick retry
        }
        resolve();
      });
      proc.on('error', () => { clearTimeout(timer); this.lastMined.delete(id); resolve(); });
    });
  }

  // — recall (read) —

  /** Run one mempalace read command asynchronously. These used to be spawnSync
   *  with a 120s timeout — on a cold model load that BLOCKED the Electron main
   *  process (renderer IPC, timers, every window) for up to two minutes. Same
   *  contract, but the event loop keeps breathing and a wedged CLI is swept. */
  private runCli(args: string[], label: string): Promise<{ ok: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      const bin = this.bin();
      if (!this.active() || !bin) { resolve({ ok: false, output: '', error: 'semantic memory not active' }); return; }
      let proc: ReturnType<typeof spawn>;
      try {
        // 0.5.6: the same machine wide lock as an agent's `md-memory`, with its
        // 60 s wait. A busy lock answers with the busy line, as an agent sees it.
        const run = this.gatedSpawn(bin, args, {});
        proc = spawn(run.command, run.args, { env: run.env, stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) {
        resolve({ ok: false, output: '', error: e instanceof Error ? e.message : String(e) });
        return;
      }
      let out = '', err = '';
      let settled = false;
      const settle = (r: { ok: boolean; output: string; error?: string }): void => {
        if (!settled) { settled = true; clearTimeout(timer); resolve(r); }
      };
      proc.stdout?.setEncoding('utf8');
      proc.stderr?.setEncoding('utf8');
      proc.stdout?.on('data', (d: string) => { out += d; });
      proc.stderr?.on('data', (d: string) => { err += d; });
      const timer = setTimeout(() => {
        try { proc.kill('SIGTERM'); } catch { /* gone */ }
        ensureKilled(proc.pid);
        settle({ ok: false, output: out, error: `${label} timed out` });
      }, 120_000);
      timer.unref?.();
      proc.on('close', (code) => {
        if (code !== 0) settle({ ok: false, output: out, error: (err || `${label} failed`).trim() });
        else settle({ ok: true, output: out });
      });
      proc.on('error', (e) => settle({ ok: false, output: '', error: e.message }));
    });
  }

  /** Semantic search across the shared palace. Returns the CLI's text output. */
  search(query: string, opts: { wing?: string; results?: number } = {}): Promise<{ ok: boolean; output: string; error?: string }> {
    // Eight, not five (0.5.2): on a palace that also holds mined source, the
    // notes often sit behind a few code hits, and the tool ranks notes first.
    // 0.5.6: the store holds memory files only. Eight stays: a store from
    // before can still be in use (a rename that failed), and the archives and
    // handoff files now share the results with the notes.
    const args = ['search', query, '--results', String(opts.results ?? 8)];
    if (opts.wing) args.push('--wing', opts.wing);
    return this.runCli(args, 'search');
  }

  /** Session-start digest (~600-900 tokens). */
  wakeUp(wing?: string): Promise<{ ok: boolean; output: string; error?: string }> {
    const args = ['wake-up'];
    if (wing) args.push('--wing', wing);
    return this.runCli(args, 'wake-up');
  }
}

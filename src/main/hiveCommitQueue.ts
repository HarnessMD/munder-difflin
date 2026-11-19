/**
 * The hive's git, off the main thread (0.5.5, Plan E sections 12 and 13).
 *
 * Until 0.5.4 every hive event ran `git add -A` and `git commit` with spawnSync,
 * so clicks, terminal output and message routing waited 0.2 to 0.6 s for git,
 * 100 to 350 times a day. Now `HiveManager.commit(message)` only marks the hive
 * as changed and returns; this queue does the git work:
 *
 *  - One worker, one git job at a time, git run with `spawn`.
 *  - A scan runs when the mark is set and the last scan started a window ago or
 *    more (5 minutes). The first change after a quiet time scans at once, so a
 *    lone event is never held back; changes inside the window wait for its end
 *    and go in as one commit.
 *  - A job runs `git status --porcelain` first. Nothing changed: no add, no
 *    commit. Otherwise the size guard, `git add -A`, `git commit`.
 *  - The scan at app start and the one at quit run with the untracked cache
 *    off, so a stale cache can never hide a file from the scans that matter.
 *  - A step cut off by the 8 second limit, or a lock that outlasts five tries,
 *    puts the batch back in front of the next one: order is kept and no event
 *    is lost. The files are on disk the whole time.
 *  - Git's clean up (`gc --auto`) is its own step after a commit, with a long
 *    limit: the commit runs with gc.auto=0 so the 8 second limit on it can never
 *    kill a repack half way. Not after the quit scan: quit waits 5 s at most,
 *    and a repack is the one step that can take longer.
 *
 * Every dependency is injected, so a test drives the clock and git.
 */
import { spawn } from 'node:child_process';
import { safeGit } from '../core/gitSafe';

/** Every queue not yet dropped or drained, for `settleHiveCommitQueues`. */
const liveQueues = new Set<HiveCommitQueue>();

/** Drop every live queue: stop a running git step and wait for it. For tests
 *  that remove a temp hive right after hive calls (a git still writing into
 *  `.git` would make the removal fail with ENOTEMPTY). The app never calls it. */
export async function settleHiveCommitQueues(ms: number = QUIT_DRAIN_MS): Promise<void> {
  await Promise.all([...liveQueues].map((q) => q.drop(ms)));
}

/** The batching window: at most one scan per window while events keep coming. */
export const HIVE_COMMIT_WINDOW_MS = 5 * 60 * 1000;
/** The limit on status, add and commit, as before. */
export const GIT_STEP_TIMEOUT_MS = 8000;
/** The limit on `gc --auto`: long, so a repack is never killed half way. The
 *  pack settings from boundGcMemory keep its memory in check. */
export const GIT_GC_TIMEOUT_MS = 30 * 60 * 1000;
/** How long quit waits for the queue, stopping git included. */
export const QUIT_DRAIN_MS = 5000;
/** How long a flush (a home change) waits, stopping git included. */
export const FLUSH_MS = 10_000;
const LOCK_TRIES = 5;
/** How many event messages a batch commit lists in its body. */
const BODY_LINES = 20;

export interface GitOut { ok: boolean; out: string; err: string; timedOut?: boolean }
export type GitOpts = { timeoutMs?: number; input?: string; signal?: AbortSignal };
/** Runs git in `root`. Never throws. */
export type HiveGit = (root: string, args: string[], opts?: GitOpts) => Promise<GitOut>;
/** The same, bound to one root. */
export type RootGit = (args: string[], opts?: GitOpts) => Promise<GitOut>;

/** Which scan: an ordinary batch, a flush (a caller waiting; no gc), or the
 *  whole scans at start and quit. */
export type ScanKind = 'batch' | 'flush' | 'start' | 'quit';

/** After SIGTERM, how long a stopped git and its children get before SIGKILL. */
export const GIT_KILL_GRACE_MS = 2000;
/** How often a stopped process group is checked for survivors. */
const GROUP_POLL_MS = 50;
/** The part of a bounded wait (flush, quit) kept for stopping git: the kill
 *  grace, then the group poll and the chain settling. Both waits together fit
 *  inside the bound. */
export const STOP_WAIT_MS = GIT_KILL_GRACE_MS + 500;

/** Split a bound into the wait for the queue and the wait for a stopped git. */
export function stopBudget(ms: number): { first: number; second: number } {
  const first = Math.max(0, ms - STOP_WAIT_MS);
  return { first, second: Math.max(0, Math.min(STOP_WAIT_MS, ms - first)) };
}

/** Is any process of group `pgid` alive? Signal 0 probes without touching it. */
function groupAlive(pgid: number): boolean {
  try { process.kill(-pgid, 0); return true; } catch { return false; }
}

/** Send `sig` to git and everything it started. On macOS and Linux git runs in
 *  its own process group, so `gc`'s repack and pack-objects get it too (git gc
 *  does not pass SIGTERM on: its repack went on writing a pack for 12 s after
 *  gc itself exited). On Windows, taskkill /T takes the tree, and has no
 *  gentle form, so it always forces. */
function signalTree(pid: number, sig: 'SIGTERM' | 'SIGKILL'): void {
  if (process.platform === 'win32') {
    try { spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('error', () => {}); } catch { /* gone */ }
    return;
  }
  try { process.kill(-pid, sig); } catch { try { process.kill(pid, sig); } catch { /* gone */ } }
}

/**
 * Git with `spawn`, so the main thread never waits for it.
 *
 * A step past its limit, or stopped by `signal` (quit past its time, a reset,
 * a home change), is stopped as a tree: SIGTERM to git's whole process group,
 * which git answers by removing its own lock files, then SIGKILL after
 * GIT_KILL_GRACE_MS for anything still there. The promise settles only when
 * git has exited AND its group is empty, so "stopped" always means nothing of
 * it is still writing into `.git`. (Node's own `signal` option reports the
 * abort at once, 5 s before git had actually exited.)
 */
export function spawnHiveGit(baseArgs: string[]): HiveGit {
  // The hive's `.git/config` can be written by an agent, or by a client on
  // the bridge: each step runs on a private copy of it that holds only the
  // keys on the allow list, and never records a nested repository
  // (src/core/gitSafe.ts).
  return async (root, args, opts) => {
    if (opts?.signal?.aborted) return { ok: false, out: '', err: 'aborted' };
    const safe = await safeGit(root, [...baseArgs, ...args], { hive: true });
    if (!safe.ok) return { ok: false, out: '', err: safe.error };
    const res = await runHiveGit(safe.program, safe.args, safe.env, safe.cwd, opts).finally(safe.done);
    return { ...res, out: safe.fix(res.out), err: safe.fix(res.err) };
  };
}

function runHiveGit(program: string, args: string[], env: NodeJS.ProcessEnv, root: Parameters<HiveGit>[0], opts: Parameters<HiveGit>[2]): Promise<GitOut> {
  return new Promise<GitOut>((resolve) => {
    if (opts?.signal?.aborted) { resolve({ ok: false, out: '', err: 'aborted' }); return; }
    let out = '';
    let err = '';
    let timedOut = false;
    let stopped = false;
    let exited = false;
    let exitCode: number | null = null;
    let settled = false;
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(program, args, {
        cwd: root, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
        // Its own process group (POSIX), so a stop reaches every child.
        detached: process.platform !== 'win32'
      });
    } catch (e) {
      resolve({ ok: false, out: '', err: e instanceof Error ? e.message : String(e) });
      return;
    }
    const pid = child.pid;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const settle = (extraErr = '') => {
      if (settled) return;
      settled = true;
      for (const t of timers) clearTimeout(t);
      opts?.signal?.removeEventListener('abort', onAbort);
      const ok = exitCode === 0 && !timedOut && !stopped;
      resolve({ ok, out, err: err + extraErr + (stopped && !timedOut ? (err ? '\n' : '') + 'aborted' : ''), ...(timedOut ? { timedOut: true } : {}) });
    };
    /** Settle once git has exited and, after a stop, its group is empty. */
    const settleWhenGone = () => {
      if (!exited) return;
      if (!stopped || pid === undefined || process.platform === 'win32' || !groupAlive(pid)) { settle(); return; }
      timers.push(setTimeout(settleWhenGone, GROUP_POLL_MS));
    };
    const stop = () => {
      if (stopped || pid === undefined) return;
      stopped = true;
      signalTree(pid, 'SIGTERM');
      timers.push(setTimeout(() => { signalTree(pid, 'SIGKILL'); }, GIT_KILL_GRACE_MS));
      settleWhenGone();
    };
    const onAbort = () => stop();
    opts?.signal?.addEventListener('abort', onAbort, { once: true });
    timers.push(setTimeout(() => { timedOut = true; stop(); }, opts?.timeoutMs ?? GIT_STEP_TIMEOUT_MS));
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (d: string) => { out += d; });
    child.stderr?.on('data', (d: string) => { err += d; });
    // A spawn that never started (git missing): no 'close' may follow.
    child.on('error', (e) => { if (pid === undefined) { exited = true; settle(e.message); } else err += e.message; });
    child.on('close', (code) => { exited = true; exitCode = code; settleWhenGone(); });
    child.stdin?.on('error', () => { /* git exited before reading its input */ });
    child.stdin?.end(opts?.input ?? '');
  });
}

/** One event: its own message. Several: a count, with the first messages in
 *  the body so `git log` still says what happened. */
export function batchMessage(messages: readonly string[], kind: ScanKind = 'batch'): string {
  if (messages.length === 0) return kind === 'start' ? 'hive: changes found at start' : kind === 'quit' ? 'hive: changes at quit' : 'hive: changes';
  if (messages.length === 1) return messages[0];
  const shown = messages.slice(0, BODY_LINES);
  const more = messages.length - shown.length;
  return `hive: ${messages.length} events\n\n${shown.join('\n')}${more > 0 ? `\n(and ${more} more)` : ''}`;
}

export interface HiveCommitQueueDeps {
  git: HiveGit;
  /** Does `root` hold a git repo? */
  hasRepo(root: string): boolean;
  /** Remove a lock git left behind. Called only between the worker's own git
   *  steps, never while one runs. */
  clearStaleLock(root: string): void;
  /** Once per launch per root, before its first scan: the repo hygiene. */
  prepare?(root: string, git: RootGit): Promise<void>;
  /** Once per launch per root, AFTER its first scan: the untracked cache test.
   *  git's disk test waits about 6 s for file times to move, and the first scan
   *  runs with the cache off anyway, so it never waits for the test. */
  afterFirstScan?(root: string, git: RootGit): Promise<void>;
  /** Before `add -A`: ignore untracked files too big for history. */
  sizeGuard?(root: string, git: RootGit): Promise<void>;
  warn?(message: string): void;
  now?(): number;
  setTimer?(fn: () => void, ms: number): unknown;
  clearTimer?(handle: unknown): void;
  sleep?(ms: number): Promise<void>;
  windowMs?: number;
}

type JobResult = 'done' | 'retry';

export class HiveCommitQueue {
  private readonly d: Required<Omit<HiveCommitQueueDeps, 'prepare' | 'afterFirstScan' | 'sizeGuard'>> & Pick<HiveCommitQueueDeps, 'prepare' | 'afterFirstScan' | 'sizeGuard'>;
  /** The root the pending batch belongs to. */
  private root: string | null = null;
  /** Marked events, each with its order number, so batches that come back
   *  from several stopped jobs merge in the order they happened. */
  private pending: Array<[number, string]> = [];
  private seq = 0;
  private dirty = false;
  private lastScanAt = Number.NEGATIVE_INFINITY;
  private timer: unknown = null;
  /** Jobs run one after another on this chain. */
  private chain: Promise<void> = Promise.resolve();
  private jobs = 0;
  private gitRunning = false;
  /** The running git step's own stop: a flush stops a running gc with it. */
  private stepAbort: AbortController | null = null;
  private gcRunning = false;
  /** While a flush waits, jobs skip their gc step. */
  private flushing = 0;
  /** While above 0, no git step starts: a flush ran out of time and the jobs
   *  already on the chain end without git, keeping their batch (F3b). */
  private held = 0;
  private closed = false;
  /** Stops the running git step (SIGTERM) when quit runs out of time or the
   *  hive is erased. */
  private readonly abort = new AbortController();
  private readonly prepared = new Set<string>();
  private readonly scannedOnce = new Set<string>();

  constructor(deps: HiveCommitQueueDeps) {
    liveQueues.add(this);
    this.d = {
      warn: (m) => console.warn(m),
      now: Date.now,
      setTimer: (fn, ms) => { const t = setTimeout(fn, ms); (t as { unref?: () => void }).unref?.(); return t; },
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      windowMs: HIVE_COMMIT_WINDOW_MS,
      ...deps
    };
  }

  /** A hive event: remember it and return at once. Git never runs here. */
  mark(root: string, message: string): void {
    if (this.closed) return;
    // A different hive: the old root's batch goes now, against the old root,
    // before the new root's events start a batch of their own.
    if (this.root !== null && this.root !== root && this.dirty) this.startScan('batch');
    this.root = root;
    this.dirty = true;
    this.pending.push([this.seq++, message]);
    this.schedule();
  }

  /** Is one of the worker's git steps running right now? */
  isGitRunning(): boolean { return this.gitRunning; }

  /** Is anything marked and not yet committed, or is a job running? */
  isIdle(): boolean { return !this.dirty && this.jobs === 0; }

  /** Wait for the jobs already started, without starting one. */
  whenIdle(): Promise<void> { return this.chain; }

  /**
   * Commit what is marked now, ignoring the window, and wait for the queue, at
   * most `ms`. For a caller that needs git finished (a home change copies the
   * hive). gc is not part of it: a running gc is stopped, and jobs skip theirs
   * while a flush waits. Past `ms` less the kill grace, the running step is
   * stopped as a tree and the flush waits for it to exit. Resolves true when
   * the queue finished on its own. Both waits fit inside `ms`.
   *
   * Past the bound the queue is held first: no new git step starts (the job's
   * next step, a queued job), and every job on the chain now ends without git
   * and keeps its batch for the next window. The hold lifts only once those
   * jobs have ended, so no git step can start between the flush returning and
   * the caller copying the hive.
   */
  async flush(ms: number = FLUSH_MS): Promise<boolean> {
    this.flushing++;
    try {
      if (this.gcRunning) this.stepAbort?.abort();
      if (this.dirty) this.startScan('flush');
      const { first, second } = stopBudget(ms);
      const drained = await this.waitChain(first);
      if (drained) return true;
      this.held++;
      void this.chain.then(() => { this.held--; });
      this.stepAbort?.abort();
      await this.waitChain(second);
      return false;
    } finally {
      this.flushing--;
    }
  }

  /** Wait for the chain at most `ms`; true when it finished. */
  private async waitChain(ms: number): Promise<boolean> {
    let timer: unknown = null;
    const done = await Promise.race([
      this.chain.then(() => true),
      new Promise<boolean>((r) => { timer = this.d.setTimer(() => r(false), ms); })
    ]);
    this.d.clearTimer(timer);
    return done;
  }

  /** A whole scan of `root` with the untracked cache off (the app start). */
  scanAtStart(root: string): Promise<void> {
    if (this.closed) return this.chain;
    if (this.root !== null && this.root !== root && this.dirty) this.startScan('batch');
    this.root = root;
    this.startScan('start');
    return this.chain;
  }

  /** Quit: one last whole scan with the untracked cache off, waiting at most
   *  `ms`. Nothing new starts after it. Resolves true when the queue drained. */
  async drainForQuit(root: string | null, ms: number = QUIT_DRAIN_MS): Promise<boolean> {
    if (this.closed) return this.isIdle();
    if (root) {
      if (this.root !== null && this.root !== root && this.dirty) this.startScan('batch');
      this.root = root;
      this.startScan('quit');
    } else if (this.dirty) {
      this.startScan('batch');
    }
    this.closed = true;
    liveQueues.delete(this);
    const { first, second } = stopBudget(ms);
    const drained = await this.waitChain(first);
    if (drained) return true;
    // Out of time: a git child is not killed when the app exits. Stop the
    // tree now (SIGTERM, so git removes its own lock, then SIGKILL) and wait
    // for it to exit, inside the same bound. What it did not commit is on
    // disk, and the scan at the next start commits it.
    this.abort.abort();
    await this.waitChain(second);
    return false;
  }

  /** The hive is going away (reset): forget what is marked, start nothing
   *  more, and wait for a running job to end, at most `ms`. */
  async drop(ms: number = QUIT_DRAIN_MS): Promise<void> {
    this.closed = true;
    liveQueues.delete(this);
    this.dirty = false;
    this.pending = [];
    if (this.timer !== null) { this.d.clearTimer(this.timer); this.timer = null; }
    // The folder is about to go: stop the running git tree now rather than
    // wait out a repack, and wait until it has really exited.
    this.abort.abort();
    await this.waitChain(ms);
  }

  private schedule(): void {
    if (this.closed || !this.dirty || this.timer !== null || this.jobs > 0) return;
    const wait = Math.max(0, this.lastScanAt + this.d.windowMs - this.d.now());
    this.timer = this.d.setTimer(() => { this.timer = null; if (this.dirty && this.jobs === 0) this.startScan('batch'); }, wait);
  }

  /** Take the pending batch and put a job for it on the chain. */
  private startScan(kind: ScanKind): void {
    const root = this.root;
    if (!root) return;
    if (this.timer !== null) { this.d.clearTimer(this.timer); this.timer = null; }
    const batch = this.pending;
    const messages = batch.map(([, m]) => m);
    this.pending = [];
    this.dirty = false;
    this.lastScanAt = this.d.now();
    this.jobs++;
    this.chain = this.chain.then(async () => {
      let result: JobResult = 'done';
      try { result = await this.job(root, messages, kind); }
      catch (e) { this.d.warn(`[hive] commit job failed: ${e instanceof Error ? e.message : String(e)}`); result = 'retry'; }
      this.jobs--;
      if (result === 'retry' && !this.closed) {
        // Back with whatever came since, for the same root: the next window
        // tries again with every message in the order it happened (several
        // jobs stopped by one flush come back oldest last).
        // Only for the same hive: once the queue has moved to another root,
        // requeueing would switch it back (rule 11).
        if (this.root === root) {
          this.pending = [...batch, ...this.pending].sort((a, b) => a[0] - b[0]);
          this.dirty = true;
        } else {
          this.d.warn(`[hive] ${messages.length} commit(s) for ${root} left to the next start: the hive changed`);
        }
      }
      this.schedule();
    });
  }

  private rootGit(root: string): RootGit {
    return async (args, opts) => {
      if (this.stopping()) return { ok: false, out: '', err: 'aborted' };
      const step = new AbortController();
      this.stepAbort = step;
      this.gitRunning = true;
      this.gcRunning = args.includes('gc');
      try {
        return await this.d.git(root, args, { ...opts, signal: AbortSignal.any([this.abort.signal, step.signal]) });
      } finally {
        this.gitRunning = false;
        this.gcRunning = false;
        if (this.stepAbort === step) this.stepAbort = null;
      }
    };
  }

  /** Is git being stopped: quit or reset (for good), or a flush out of time
   *  (until its hold lifts)? A job that sees it ends and keeps its batch. */
  private stopping(): boolean { return this.held > 0 || this.abort.signal.aborted; }

  private async job(root: string, messages: string[], kind: ScanKind): Promise<JobResult> {
    if (!this.d.hasRepo(root)) return 'done';
    if (this.stopping()) return 'retry';
    const result = await this.scan(root, messages, kind);
    if (!this.scannedOnce.has(root) && !this.stopping()) {
      this.scannedOnce.add(root);
      try { await this.d.afterFirstScan?.(root, this.rootGit(root)); } catch (e) { this.d.warn(`[hive] repo setup after the first scan failed: ${e instanceof Error ? e.message : String(e)}`); }
      // Cut off by a stop: try the setup again after the next scan.
      if (this.stopping()) this.scannedOnce.delete(root);
    }
    return result;
  }

  private async scan(root: string, messages: string[], kind: ScanKind): Promise<JobResult> {
    const git = this.rootGit(root);
    if (!this.prepared.has(root)) {
      this.prepared.add(root);
      try { await this.d.prepare?.(root, git); } catch (e) { this.d.warn(`[hive] repo prepare failed: ${e instanceof Error ? e.message : String(e)}`); }
      if (this.stopping()) { this.prepared.delete(root); return 'retry'; }
    }
    // The scans at start and quit never trust the untracked cache.
    const noCache = kind === 'batch' || kind === 'flush' ? [] : ['-c', 'core.untrackedCache=false'];
    const run: RootGit = (args, opts) => git([...noCache, ...args], opts);

    const status = await run(['status', '--porcelain', '-z']);
    if (this.stopping()) return 'retry';
    if (!status.ok) {
      this.d.warn(`[hive] git status failed${status.timedOut ? ' (timed out)' : ''}: ${status.err.trim()}`);
      return 'retry';
    }
    if (status.out === '') return 'done';

    try { await this.d.sizeGuard?.(root, run); } catch { /* the guard must never stop a commit */ }
    if (this.stopping()) return 'retry';

    const message = batchMessage(messages, kind);
    let committed = false;
    for (let attempt = 0; attempt < LOCK_TRIES; attempt++) {
      this.d.clearStaleLock(root);
      const add = await run(['add', '-A']);
      if (this.stopping()) return 'retry';
      if (add.timedOut) { this.d.warn('[hive] git add timed out; next window'); return 'retry'; }
      // gc.auto=0: the clean up is its own step below, so this 8 s limit can
      // never cut a repack off half way.
      const commit = await run(['-c', 'gc.auto=0', 'commit', '-q', '-m', message]);
      if (commit.ok) { committed = true; break; }
      if (this.stopping()) return 'retry';
      if (commit.timedOut) { this.d.warn('[hive] git commit timed out; next window'); return 'retry'; }
      if (/nothing to commit/i.test(commit.out + commit.err)) return 'done';
      if (!add.ok || /index\.lock/i.test(commit.err)) { await this.d.sleep(50 * (attempt + 1)); continue; }
      this.d.warn(`[hive] commit gave up after ${attempt + 1} attempts: ${(commit.err || commit.out).trim()}`);
      return 'done';
    }
    if (!committed) { this.d.warn(`[hive] commit still locked after ${LOCK_TRIES} attempts; next window`); return 'retry'; }
    // No gc at quit (a repack can outlast the 5 s), nor while a caller waits.
    if (kind !== 'quit' && kind !== 'flush' && this.flushing === 0) {
      const gc = await run(['gc', '--auto', '--quiet'], { timeoutMs: GIT_GC_TIMEOUT_MS });
      if (!gc.ok) this.d.warn(`[hive] git gc --auto failed${gc.timedOut ? ' (timed out)' : ''}: ${gc.err.trim()}`);
    }
    return 'done';
  }
}

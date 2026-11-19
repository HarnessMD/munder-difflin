/**
 * Stop the Codex app-server daemon an agent started, when the agent
 * ends, when the app quits, and at launch for the ones an earlier run left.
 *
 * enableCodexRemoteForSpawn (index.ts) runs `codex app-server daemon start`
 * with CODEX_HOME set to a short alias (/tmp/mdc/<8 hex>, codexRemote.ts).
 * Codex detaches that daemon at once, so it never dies with the agent or the
 * app. Nothing stopped it: measured on one Mac, 13 idle daemons and 13 helper
 * loops, about 1 GB, none with a terminal attached.
 *
 * Codex's own `daemon stop` removes the app-server but leaves its
 * `pid-update-loop` helper alive (parent 1). Both pids are in Codex's pid
 * files under $CODEX_HOME/app-server-daemon/, with the process start time.
 * A recorded pid is killed only when ps still shows that start time and the
 * `codex` command, the same identity rule as staleAgents.ts. When identity
 * cannot be read, nothing is killed.
 *
 * Windows: the app starts no daemon there (enableCodexRemoteForSpawn returns
 * at once), so every entry point here is a no op on win32.
 */
import { execFile } from 'node:child_process';
import { lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { codexRemoteAliasPath, CODEX_REMOTE_ALIAS_ROOT } from '../shared/codexRemote';
import { parsePsIdentities, type ProcessIdentity } from './staleAgents';

export const DAEMON_PID_FILE = join('app-server-daemon', 'daemon.pid');
export const UPDATER_PID_FILE = join('app-server-daemon', 'daemon-updater.pid');

/** What it takes to stop one daemon: its CODEX_HOME alias and the CLI that started it. */
export interface CodexDaemonRef { home: string; executable: string; env: NodeJS.ProcessEnv }

export interface CodexDaemonDeps {
  /** Runs one `codex ...` command; index.ts passes runCodexDaemonCommand. */
  run: (executable: string, args: string[], env: NodeJS.ProcessEnv, timeoutMs: number) => Promise<{ ok: boolean; error?: string }>;
  /** pid to identity, for the pids still alive. Defaults to one `ps`. */
  identities?: (pids: number[]) => Promise<Map<number, ProcessIdentity>>;
  kill?: (pid: number) => void;
  log?: (msg: string, detail?: unknown) => void;
  platform?: NodeJS.Platform;
}

interface Recorded { pid: number; startedAt: string }

/** A Codex pid file: {"pid":29082,"processStartTime":"Mon Nov  2 03:40:36 2026",...}. */
export function readCodexPidFile(path: string): Recorded | null {
  try {
    const j = JSON.parse(readFileSync(path, 'utf8')) as { pid?: unknown; processStartTime?: unknown };
    if (!Number.isInteger(j.pid) || (j.pid as number) <= 1) return null;
    if (typeof j.processStartTime !== 'string' || !j.processStartTime.trim()) return null;
    return { pid: j.pid as number, startedAt: j.processStartTime };
  } catch { return null; }
}

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** The same process Codex recorded: same start time, and still `codex`. */
export function isRecordedCodex(rec: Recorded, live: ProcessIdentity | undefined): boolean {
  if (!live) return false;
  const cmd = live.command.split(/[\\/]/).pop() ?? '';
  return cmd === 'codex' && squash(live.startedAt) === squash(rec.startedAt);
}

/** One `ps` in the C locale, which is how Codex writes processStartTime. */
function psIdentities(pids: number[]): Promise<Map<number, ProcessIdentity>> {
  if (!pids.length) return Promise.resolve(new Map());
  return new Promise((done) => {
    try {
      execFile('ps', ['-o', 'pid=,lstart=,comm=', '-p', pids.join(',')],
        { timeout: 2_000, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } },
        (_err, stdout) => done(parsePsIdentities(String(stdout ?? ''))));
    } catch { done(new Map()); }
  });
}

function recordedPids(home: string): Recorded[] {
  return [DAEMON_PID_FILE, UPDATER_PID_FILE]
    .map((f) => readCodexPidFile(join(home, f)))
    .filter((r): r is Recorded => r !== null);
}

/** Stop one home's daemon and its helper. Returns the pids it killed by hand.
 *  Does nothing when neither recorded process is still running. */
export async function stopCodexDaemon(ref: CodexDaemonRef, deps: CodexDaemonDeps, timeoutMs = 10_000): Promise<{ ran: boolean; killed: number[] }> {
  if ((deps.platform ?? process.platform) === 'win32') return { ran: false, killed: [] };
  const identities = deps.identities ?? psIdentities;
  const kill = deps.kill ?? ((pid: number) => { try { process.kill(pid, 'SIGTERM'); } catch { /* gone */ } });
  // Read BEFORE the stop: it is the pid file that names the helper Codex leaves.
  const recorded = recordedPids(ref.home);
  const before = await identities(recorded.map((r) => r.pid));
  if (!recorded.some((r) => isRecordedCodex(r, before.get(r.pid)))) return { ran: false, killed: [] };
  const res = await deps.run(ref.executable, ['app-server', 'daemon', 'stop'], { ...ref.env, CODEX_HOME: ref.home }, timeoutMs);
  if (!res.ok) deps.log?.('[codex-daemon] stop failed; ending its processes by pid:', res.error);
  const after = await identities(recorded.map((r) => r.pid));
  const killed: number[] = [];
  for (const r of recorded) {
    if (!isRecordedCodex(r, after.get(r.pid))) continue;
    kill(r.pid);
    killed.push(r.pid);
  }
  deps.log?.('[codex-daemon] stopped', { home: ref.home, killed });
  return { ran: true, killed };
}

/** The daemons this run started, by hive agent id. */
export class CodexDaemons {
  private readonly refs = new Map<string, CodexDaemonRef>();
  private sweeping: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: CodexDaemonDeps) {}

  remember(agentId: string, ref: CodexDaemonRef): void { this.refs.set(agentId, ref); }
  has(agentId: string): boolean { return this.refs.has(agentId); }

  /** The agent ended for good: stop its daemon. Fire and forget for callers. */
  stop(agentId: string): Promise<void> {
    const ref = this.refs.get(agentId);
    if (!ref) return Promise.resolve();
    this.refs.delete(agentId);
    return stopCodexDaemon(ref, this.deps).then(() => undefined, (e) => { this.deps.log?.('[codex-daemon] stop error:', e); });
  }

  /** App quit: every remembered daemon, waiting at most `timeoutMs`. */
  stopAll(timeoutMs: number): Promise<void> {
    const all = [...this.refs.keys()].map((id) => this.stop(id));
    return Promise.race([
      Promise.all(all).then(() => undefined),
      new Promise<void>((r) => setTimeout(r, timeoutMs))
    ]);
  }

  /** Launch: daemons an earlier run left (a crash, a force quit, an older
   *  build). Only links the app made for an agent of THIS hive, checked by
   *  recomputing the alias; links into another hive belong to another app.
   *  An agent that is live, or started by this run, is skipped. One at a time. */
  sweep(o: { hiveRoot: string; live: ReadonlySet<string>; cli: () => Promise<{ executable: string; env: NodeJS.ProcessEnv }>; aliasRoot?: string }): Promise<string[]> {
    const run = async (): Promise<string[]> => {
      if ((this.deps.platform ?? process.platform) === 'win32') return [];
      const root = o.aliasRoot ?? CODEX_REMOTE_ALIAS_ROOT;
      const agentsDir = resolve(o.hiveRoot, 'agents') + sep;
      let names: string[] = [];
      try { names = readdirSync(root); } catch { return []; }
      const stopped: string[] = [];
      // The CLI is looked up once, and only when there is a link to look at.
      let cli: { executable: string; env: NodeJS.ProcessEnv } | null = null;
      for (const name of names) {
        const alias = join(root, name);
        let target: string;
        try {
          if (!lstatSync(alias).isSymbolicLink()) continue;
          target = readlinkSync(alias);
        } catch { continue; }
        const abs = resolve(root, target);
        if (!abs.startsWith(agentsDir)) continue;
        const agentId = abs.slice(agentsDir.length).split(sep)[0];
        if (!agentId || o.live.has(agentId) || this.refs.has(agentId)) continue;
        if (codexRemoteAliasPath(target, agentId, root) !== alias) continue;
        try {
          cli ??= await o.cli();
          const r = await stopCodexDaemon({ home: alias, executable: cli.executable, env: cli.env }, this.deps);
          if (r.ran) stopped.push(agentId);
        } catch (e) { this.deps.log?.('[codex-daemon] sweep error:', e); }
      }
      if (stopped.length) this.deps.log?.('[codex-daemon] launch sweep stopped leftovers of', stopped);
      return stopped;
    };
    const p = run();
    this.sweeping = p.catch(() => undefined);
    return p;
  }

  /** A spawn waits for the launch sweep, so it never starts a daemon the sweep then stops. */
  settled(maxMs: number): Promise<void> {
    return Promise.race([
      this.sweeping.then(() => undefined),
      new Promise<void>((r) => setTimeout(r, maxMs))
    ]);
  }
}

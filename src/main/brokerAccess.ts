/**
 * Integration broker access for EVERY hive agent (0.5.5).
 *
 * Until 0.5.4 only a temp was granted the broker (processSpawnRequest), so a
 * lasting agent, spawned or restored, had no MD_BROKER_* and could reach no
 * integration. spawnAgentCore now grants every hive spawn. What env alone
 * cannot do, this file does:
 *
 * 1. Env is frozen at process start and the broker's port is new on every
 *    launch, so an agent that outlives a broker restart (or started before the
 *    broker was listening) holds a dead URL. The current URL and token are
 *    also written to `<agentDir>/.broker`, mode 600, and rewritten whenever the
 *    broker (re)starts, so a long job re-reads the file instead of its env.
 * 2. An integration enabled after an agent started is added to its grant in
 *    place (IntegrationBroker.retarget), same token.
 *
 * The file is a capability handle, never the integration secret. It is written
 * owner only, replaced atomically, ignored by the hive's git
 * (AGENT_IGNORE_LINES) and removed at teardown. Electron free, so it is
 * testable under plain node.
 */
import { randomBytes } from 'node:crypto';
import { closeSync, existsSync, fchmodSync, openSync, renameSync, rmSync, writeSync } from 'node:fs';
import { join } from 'node:path';

export const BROKER_FILE = '.broker';

/** The two env vars a granted agent gets. */
export interface BrokerEnv { MD_BROKER_URL: string; MD_BROKER_TOKEN: string }

/** The slice of IntegrationBroker this needs (small so tests can fake it). */
export interface BrokerLike {
  running(): boolean;
  url(): string;
  grant(id: string, allowedIds: string[]): string;
  revoke(id: string): void;
  retargetEach(allowedFor: (id: string) => string[]): void;
}

/** Write `<agentDir>/.broker` owner only. Temp file then rename, so a reader
 *  never sees half a token. The temp file is made new under a name nobody
 *  can know beforehand ('wx': made, or not written at all), so nothing put
 *  at its name is ever written through; its mode is set on the open file. */
export function writeBrokerFile(agentDir: string, env: BrokerEnv, now = Date.now()): boolean {
  if (!agentDir || !existsSync(agentDir)) return false;
  const file = join(agentDir, BROKER_FILE);
  const tmp = `${file}.${randomBytes(8).toString('hex')}.tmp`;
  const body = JSON.stringify({ url: env.MD_BROKER_URL, token: env.MD_BROKER_TOKEN, writtenAt: new Date(now).toISOString() }) + '\n';
  let fd: number | undefined;
  let made = false;
  try {
    fd = openSync(tmp, 'wx', 0o600);
    made = true;
    writeSync(fd, body);
    fchmodSync(fd, 0o600);
    closeSync(fd);
    fd = undefined;
    renameSync(tmp, file);
    return true;
  } catch {
    if (fd !== undefined) { try { closeSync(fd); } catch { /* noop */ } }
    // Only a file made here is removed: what was at the name before is not this function's.
    if (made) { try { rmSync(tmp, { force: true }); } catch { /* noop */ } }
    return false;
  }
}

export function removeBrokerFile(agentDir: string | undefined): void {
  if (!agentDir) return;
  try { rmSync(join(agentDir, BROKER_FILE), { force: true }); } catch { /* best-effort */ }
}

/**
 * The broker grants of the live hive agents, keyed by pty id (the id
 * teardownPty revokes by). Every hive spawn is tracked, granted or not, so a
 * spawn that beat the broker to its port is granted the moment it listens.
 */
export class BrokerGrants {
  private readonly dirs = new Map<string, string>();

  /** @param allowedIds what a spawn may reach: the same for every agent. */
  constructor(private readonly broker: BrokerLike, private readonly allowedIds: () => string[]) {}

  private mint(id: string): BrokerEnv {
    return { MD_BROKER_URL: this.broker.url(), MD_BROKER_TOKEN: this.broker.grant(id, this.allowedIds()) };
  }

  /** Track a spawn and grant it when the broker is up. The env to merge, or
   *  an empty object when the broker is not listening yet (onBrokerStart
   *  grants it then, through the file). */
  grant(id: string, agentDir: string | undefined): Partial<BrokerEnv> {
    if (agentDir) this.dirs.set(id, agentDir);
    if (!this.broker.running()) return {};
    const env = this.mint(id);
    if (agentDir) writeBrokerFile(agentDir, env);
    return env;
  }

  /** Revoke, remove the file, stop tracking. Idempotent. */
  release(id: string): void {
    try { this.broker.revoke(id); } catch { /* best-effort */ }
    removeBrokerFile(this.dirs.get(id));
    this.dirs.delete(id);
  }

  /** The broker just started: new port, every old token gone. Mint a fresh
   *  grant for each tracked agent and rewrite its file. Returns files written. */
  onBrokerStart(): number {
    if (!this.broker.running()) return 0;
    let n = 0;
    for (const [id, dir] of this.dirs) if (writeBrokerFile(dir, this.mint(id))) n++;
    return n;
  }

  /** The enabled integrations changed: widen or narrow every live grant to
   *  the new list. No new token. */
  onIntegrationsChanged(): void {
    try { this.broker.retargetEach(() => this.allowedIds()); } catch { /* best-effort */ }
  }
}

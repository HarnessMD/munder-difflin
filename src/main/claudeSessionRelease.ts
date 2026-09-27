/**
 * Free a Claude conversation before `--resume` reopens it.
 *
 * 0.5.3, user report: Restart & Continue in Monitors answered that the Claude
 * session was already active, attach to it or stop it; the user stopped it
 * from a new terminal window and then it worked. Claude Code 2.1 keeps a
 * registry of live sessions and refuses `--resume <id>` while anything in it
 * holds that id: "Run `claude agents` to find its id, then `claude attach <id>`
 * to open it, or `claude stop <id>` first to resume it here."
 *
 * Two holders exist on disk under the Claude config dir:
 *   sessions/<pid>.json    an interactive process: {pid, sessionId, procStart}.
 *                          Ours is the old agent process, still exiting when
 *                          the respawn starts, or left behind by a shell.
 *   jobs/<short>/state.json a background session run by Claude's daemon:
 *                          {sessionId, daemonShort, state}. `claude stop <short>`
 *                          ends it and keeps the conversation.
 *
 * Reading is pure (tested against fixture dirs); stopping is the caller's.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFile } from 'node:child_process';

export interface SessionHolder {
  kind: 'interactive' | 'background';
  /** interactive: the process holding the session. */
  pid?: number;
  /** interactive: the process start time Claude recorded, to refuse a reused pid. */
  procStart?: string;
  /** background: the id `claude stop` takes. */
  shortId?: string;
  state?: string;
}

function readJson(path: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(readFileSync(path, 'utf8'));
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Background states that no longer hold a session. 'done' is NOT one of them:
 *  it means the turn finished and the session sits idle, still holding the id
 *  (`claude agents --json` lists it as active). Anything else is stopped. */
const FINISHED_JOB_STATES = new Set(['stopped', 'completed', 'exited', 'killed']);

export function findSessionHolders(sessionId: string, claudeDir: string, selfPid = process.pid): SessionHolder[] {
  const out: SessionHolder[] = [];
  if (!sessionId) return out;
  let names: string[] = [];
  try { names = readdirSync(join(claudeDir, 'sessions')); } catch { /* none */ }
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const j = readJson(join(claudeDir, 'sessions', name));
    if (!j || j.sessionId !== sessionId || typeof j.pid !== 'number' || j.pid === selfPid) continue;
    out.push({ kind: 'interactive', pid: j.pid, procStart: typeof j.procStart === 'string' ? j.procStart : undefined });
  }
  let jobs: string[] = [];
  try { jobs = readdirSync(join(claudeDir, 'jobs')); } catch { /* none */ }
  for (const dir of jobs) {
    const j = readJson(join(claudeDir, 'jobs', dir, 'state.json'));
    if (!j || (j.sessionId !== sessionId && j.resumeSessionId !== sessionId)) continue;
    const state = typeof j.state === 'string' ? j.state : undefined;
    if (state && FINISHED_JOB_STATES.has(state)) continue;
    out.push({ kind: 'background', shortId: typeof j.daemonShort === 'string' ? j.daemonShort : basename(dir), state });
  }
  return out;
}

function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === 'EPERM'; }
}

function run(file: string, args: string[], timeoutMs: number): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout) => {
      resolve({ ok: !err, out: String(stdout ?? '') });
    });
  });
}

/** The pid still belongs to the process Claude recorded (pids get reused). */
async function sameProcess(pid: number, procStart: string | undefined): Promise<boolean> {
  if (!procStart || process.platform === 'win32') return false;
  const r = await run('ps', ['-o', 'lstart=', '-p', String(pid)], 3000);
  return r.ok && r.out.trim().replace(/\s+/g, ' ') === procStart.trim().replace(/\s+/g, ' ');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Stop whatever holds `sessionId` so `--resume` is accepted. Never throws;
 *  returns what it did, for the log. An interactive holder is only signalled
 *  when its start time matches Claude's record, so a reused pid is left alone
 *  (on Windows, where that cannot be checked, it is left alone too). */
export async function releaseClaudeSession(
  sessionId: string,
  claudeDir: string,
  claudeExe: string,
  waitMs = 3000
): Promise<string[]> {
  const done: string[] = [];
  for (const h of findSessionHolders(sessionId, claudeDir)) {
    if (h.kind === 'background' && h.shortId) {
      const r = await run(claudeExe, ['stop', h.shortId], 15000);
      done.push(`stop ${h.shortId} ${r.ok ? 'ok' : 'failed'}`);
      continue;
    }
    const pid = h.pid;
    if (!pid || !alive(pid)) continue;
    if (!(await sameProcess(pid, h.procStart))) { done.push(`skip ${pid} (not verifiable)`); continue; }
    try { process.kill(pid, 'SIGTERM'); } catch { /* gone */ }
    const until = Date.now() + waitMs;
    while (alive(pid) && Date.now() < until) await sleep(100);
    if (alive(pid)) { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } await sleep(200); }
    done.push(`term ${pid} ${alive(pid) ? 'still alive' : 'ok'}`);
  }
  return done;
}

/**
 * The main side of the `hive:history` IPC: one bounded page of an agent's
 * conversation, read from its CLI's own transcript.
 *
 * Resolves an agent's CURRENT transcript from its id alone (the window never
 * names a path), reads one bounded page of it (historyTail) and normalises the
 * lines (historyNormalize). Electron free: the facts it needs are injected.
 *
 * Sources, each used only where it resolves (links followed) inside that
 * engine's own store:
 *  - Claude Code: the hook's transcript_path, else `projectDir(cwd)/<session id>.jsonl`,
 *    inside `<config dir>/projects` (~/.claude, or CLAUDE_CONFIG_DIR).
 *  - Codex: the hook's transcript_path, else the rollout for the registry session
 *    id, inside the agent's own CODEX_HOME and the session folders it links to.
 *    Only an agent with NO session id falls back to the newest rollout: with one,
 *    another session's file is never shown.
 *  - Antigravity: the hook's transcript_path, else
 *    `~/.gemini/antigravity-cli/brain/<conversation>/.system_generated/logs/transcript.jsonl`,
 *    inside that brain folder.
 *
 * The resolved path is cached per agent and re-resolved when the session id or
 * the hook path changes, or the file disappears; a miss is looked up again after
 * 3 s, so a follow poll never walks the Codex folders on every tick.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT).
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  HISTORY_PAGE_DEFAULT,
  HISTORY_PAGE_MAX,
  type HistoryItem,
  type HistoryPage,
  type HistoryProvider
} from '../shared/history';
import { normalizeLine } from './historyNormalize';
import { readLinesBackward, readLinesForward, type LineRef, type TailLimits } from './historyTail';
import { projectDir } from './transcript';

export interface HistoryAgentFacts {
  provider?: string;
  cwd?: string;
  sessionId?: string;
}

export interface HistoryDeps {
  agent(agentId: string): HistoryAgentFacts | null;
  transcriptPath(agentId: string): string | undefined;
  codexHomeFor(agentId: string): string | null;
  geminiHome(): string;
}

const AGENT_ID = /^[A-Za-z0-9_.-]{1,128}$/;
const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;
/** How long a miss is kept before the transcript is looked up again. */
export const HISTORY_MISS_MS = 3000;

function isFile(p: string): boolean {
  try { return statSync(p).isFile(); } catch { return false; }
}

function real(p: string): string | null {
  try { return realpathSync(p); } catch { return null; }
}

/** Is `child` inside `dir`? Both as given. */
function inside(dir: string, child: string): boolean {
  const rel = path.relative(path.resolve(dir), path.resolve(child));
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** `file` when it is a file that resolves (links followed) inside one of
 *  `roots` (each resolved too), else null. */
function realInside(roots: string[], file: string | null | undefined): string | null {
  if (!file || !isFile(file)) return null;
  const f = real(file);
  if (!f) return null;
  return roots.some((r) => { const rr = real(r); return !!rr && inside(rr, f); }) ? file : null;
}

/** Where a Claude Code transcript may live: `<config dir>/projects`. */
export function claudeProjectRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  const roots = [path.join(os.homedir(), '.claude', 'projects')];
  const cfg = env.CLAUDE_CONFIG_DIR?.trim();
  if (cfg) roots.push(path.join(cfg, 'projects'));
  return roots;
}

/** Where a hive Codex agent's rollouts may live: its own CODEX_HOME and the
 *  session folders it links to (installCodexHooks keeps them under the person's
 *  ~/.codex scan roots). */
export function codexRoots(home: string): string[] {
  return [home, path.join(home, 'sessions'), path.join(home, 'archived_sessions')];
}

/** The rollout for `sessionId` under `<codexHome>/sessions`, or null. */
export function findCodexRollout(codexHome: string, sessionId: string): string | null {
  if (!codexHome || !/^[0-9a-fA-F][0-9a-fA-F-]{15,}$/.test(sessionId)) return null;
  const stack: Array<{ dir: string; depth: number }> = [{ dir: path.join(codexHome, 'sessions'), depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop()!;
    let ents: import('node:fs').Dirent[];
    try { ents = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (depth < 4) stack.push({ dir: p, depth: depth + 1 }); continue; }
      if (e.isFile() && e.name.endsWith('.jsonl') && e.name.includes(sessionId)) return p;
    }
  }
  return null;
}

/** The newest `sessions/YYYY/MM/DD/rollout-*.jsonl` under `codexHome`, or null.
 *  A fixed three level walk, so a stray folder cannot turn it into a scan of a home. */
export function findNewestRollout(codexHome: string): string | null {
  const root = path.join(codexHome, 'sessions');
  if (!existsSync(root)) return null;
  let newest: { file: string; mtimeMs: number } | null = null;
  const dirs = (p: string): string[] => {
    try { return readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); }
    catch { return []; }
  };
  for (const y of dirs(root)) {
    for (const m of dirs(path.join(root, y))) {
      for (const d of dirs(path.join(root, y, m))) {
        const dayDir = path.join(root, y, m, d);
        let names: string[] = [];
        try { names = readdirSync(dayDir); } catch { continue; }
        for (const name of names) {
          if (!name.startsWith('rollout-') || !name.endsWith('.jsonl')) continue;
          const file = path.join(dayDir, name);
          try {
            const st = statSync(file);
            if (!newest || st.mtimeMs > newest.mtimeMs) newest = { file, mtimeMs: st.mtimeMs };
          } catch { /* vanished mid walk */ }
        }
      }
    }
  }
  return newest?.file ?? null;
}

function asProvider(p: string | undefined): HistoryProvider | null {
  const v = p ?? 'claude';
  return v === 'claude' || v === 'codex' || v === 'antigravity' ? v : null;
}

function offsetArg(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : undefined;
}

export class HistoryService {
  /** Per agent: the file found for `key` (null: a miss, kept until `until`). */
  private cache = new Map<string, { key: string; file: string | null; until: number }>();

  constructor(private readonly deps: HistoryDeps, private readonly limits: TailLimits = {}, private readonly now: () => number = Date.now) {}

  /** The transcript file for an agent, or why there is none. */
  resolve(agentId: string): { provider: HistoryProvider; file: string } | { reason: 'no-agent' | 'unsupported-provider' | 'no-transcript' } {
    const a = this.deps.agent(agentId);
    if (!a) return { reason: 'no-agent' };
    const provider = asProvider(a.provider);
    if (!provider) return { reason: 'unsupported-provider' };
    const sid = a.sessionId && SESSION_ID.test(a.sessionId) ? a.sessionId : '';
    const hookPath = this.deps.transcriptPath(agentId) ?? '';
    const key = `${provider}|${sid}|${hookPath}|${a.cwd ?? ''}`;
    const hit = this.cache.get(agentId);
    if (hit && hit.key === key) {
      if (hit.file && existsSync(hit.file)) return { provider, file: hit.file };
      if (!hit.file && this.now() < hit.until) return { reason: 'no-transcript' };
    }
    const file = this.locate(agentId, provider, sid, hookPath, a.cwd ?? '');
    this.cache.set(agentId, { key, file, until: this.now() + HISTORY_MISS_MS });
    return file ? { provider, file } : { reason: 'no-transcript' };
  }

  private locate(agentId: string, provider: HistoryProvider, sid: string, hookPath: string, cwd: string): string | null {
    const hook = hookPath.endsWith('.jsonl') ? hookPath : '';
    if (provider === 'claude') {
      const roots = claudeProjectRoots();
      return realInside(roots, hook)
        ?? (sid && cwd && path.isAbsolute(cwd) ? realInside(roots, path.join(projectDir(cwd), `${sid}.jsonl`)) : null);
    }
    if (provider === 'codex') {
      const home = this.deps.codexHomeFor(agentId);
      if (!home) return null;
      const roots = codexRoots(home);
      const fromHook = realInside(roots, hook);
      if (fromHook) return fromHook;
      // With a session id, only that session's rollout: never a newer one's.
      if (sid) return realInside(roots, findCodexRollout(home, sid));
      return realInside(roots, findNewestRollout(home));
    }
    // antigravity
    const brain = path.join(this.deps.geminiHome(), 'antigravity-cli', 'brain');
    if (path.basename(hook) === 'transcript.jsonl') {
      const fromHook = realInside([brain], hook);
      if (fromHook) return fromHook;
    }
    return sid ? realInside([brain], path.join(brain, sid, '.system_generated', 'logs', 'transcript.jsonl')) : null;
  }

  forget(agentId: string): void {
    this.cache.delete(agentId);
  }

  /** One page. Never throws: a bad request or an unreadable file is a reason, not an error. */
  page(req: unknown): HistoryPage {
    const r = (typeof req === 'object' && req !== null ? req : {}) as Record<string, unknown>;
    const agentId = typeof r.agentId === 'string' && AGENT_ID.test(r.agentId) ? r.agentId : '';
    if (!agentId) return { ok: false, reason: 'no-agent' };
    const resolved = this.resolve(agentId);
    if ('reason' in resolved) return { ok: false, reason: resolved.reason };
    const { provider, file } = resolved;
    const limitRaw = typeof r.limit === 'number' && Number.isFinite(r.limit) ? Math.floor(r.limit) : HISTORY_PAGE_DEFAULT;
    const limit = Math.max(1, Math.min(HISTORY_PAGE_MAX, limitRaw));
    const after = offsetArg(r.after);
    const before = offsetArg(r.before);
    const head = {
      ok: true as const,
      provider,
      fileId: createHash('sha1').update(path.resolve(file)).digest('hex').slice(0, 12),
      fileName: path.basename(file)
    };
    try {
      const toItems = (lines: LineRef[]): HistoryItem[] => lines.flatMap((l) => normalizeLine(provider, l.text, l.offset));
      if (after !== undefined) {
        const size = statSync(file).size;
        // Smaller than where we were: truncated or replaced. The view reloads the tail.
        if (size < after) return { ...head, items: [], start: 0, end: 0, atStart: false, size, reset: true };
        const res = readLinesForward(file, after, this.limits);
        return { ...head, items: toItems(res.lines), start: res.start, end: res.end, atStart: res.start === 0, size: res.size };
      }
      // Each line is normalised once, as it is met (newest first), so the scan
      // can stop as soon as the page is full.
      const groups: HistoryItem[][] = [];
      let seen = 0;
      let count = 0;
      const res = readLinesBackward(file, before ?? null, (newestFirst) => {
        while (seen < newestFirst.length) {
          const l = newestFirst[seen++];
          const items = normalizeLine(provider, l.text, l.offset);
          groups.push(items);
          count += items.length;
        }
        return count >= limit;
      }, this.limits);
      const items = groups.reverse().flat();
      return { ...head, items, start: res.start, end: res.end, atStart: res.start === 0, size: res.size };
    } catch {
      return { ok: false, reason: 'unreadable' };
    }
  }
}

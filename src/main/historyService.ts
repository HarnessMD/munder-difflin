/**
 * The main side of the `hive:history` IPC, read only.
 *
 * Resolves an agent's CURRENT transcript from its id alone (the renderer never names a
 * path), reads one bounded page of it (historyTail) and normalises the lines
 * (historyNormalize). Electron free: the facts it needs are injected.
 *
 * Sources:
 *  - Claude Code: the hook's transcript_path (only inside Claude's projects folder), else
 *    `projectDir(cwd)/<registry sessionId>.jsonl`.
 *  - Codex: the rollout for the registry sessionId under the agent's own CODEX_HOME, else
 *    the hook's transcript_path inside that home, else, for an agent with no sessionId,
 *    the home's newest rollout. The
 *    home's `sessions` folder is a link into ~/.codex/sessions/munder-difflin
 *    (hive.ts exposeCodexDataDir), so a path inside the link's target counts as inside.
 *  - Antigravity: the hook's transcript_path (only inside the brain folder), else
 *    `<gemini home>/antigravity-cli/brain/<conversation>/.system_generated/logs/transcript.jsonl`.
 *
 * Every path is used only when it resolves inside that provider's store. The resolved
 * path is cached per agent and looked up again only when the session id or the hook path
 * changes, or the file disappears; a guess or a miss is kept 3 s: the Codex lookup walks
 * dated folders, and that must not happen on every follow poll.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT): src/main/historyService.ts, with this app's own
 * Codex home and rollout lookup in place of the fork's codexThreadRotation and
 * codexRolloutCapacity.
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
  /** Applied to every text that leaves here. The agent's answers are drawn in the thread, and a transcript can hold a secret. */
  redact?(text: string): string;
}

const AGENT_ID = /^[A-Za-z0-9_.-]{1,128}$/;
const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;

function isFile(p: string): boolean {
  try { return statSync(p).isFile(); } catch { return false; }
}

/** Is `child` inside `dir` (after resolution)? */
function inside(dir: string, child: string): boolean {
  const rel = path.relative(path.resolve(dir), path.resolve(child));
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function realOrNull(p: string): string | null {
  try { return realpathSync(p); } catch { return null; }
}

/** The hook's path, resolved, when it is really inside one of `roots`, also
 *  resolved: a link named *.jsonl inside a root that points anywhere fails. */
function realInside(roots: string[], hookPath: string): string | null {
  const real = realOrNull(hookPath);
  if (!real) return null;
  return roots.some((r) => { const rr = realOrNull(r); return rr !== null && inside(rr, real); }) ? real : null;
}

/** How long a Codex "newest rollout" guess, or a miss, is kept: a new
 *  session's file may not be on disk at the first poll, so it is looked up
 *  again soon, but not on every follow poll. */
const NEWEST_GUESS_MS = 3_000;

/**
 * Where a hook-reported transcript_path may live, per provider. The hook payload is a
 * CLI's claim, so it is only trusted inside that provider's own store:
 *  - Claude: `<config dir>/projects` (~/.claude, or CLAUDE_CONFIG_DIR when set);
 *  - Codex: the agent's own CODEX_HOME, and where its session folders really are;
 *  - Antigravity: `<gemini home>/antigravity-cli/brain`.
 */
export function claudeProjectRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  const roots = [path.join(os.homedir(), '.claude', 'projects')];
  const cfg = env.CLAUDE_CONFIG_DIR?.trim();
  if (cfg) roots.push(path.join(cfg, 'projects'));
  return roots;
}

function codexRoots(home: string): string[] {
  const roots = [home];
  for (const kind of ['sessions', 'archived_sessions']) {
    const r = realOrNull(path.join(home, kind));
    if (r) roots.push(r);
  }
  return roots;
}

/**
 * A Codex home's rollout: the one for `sessionId` when given, else the newest.
 * `sessions/YYYY/MM/DD/rollout-*.jsonl` is a fixed three level shape, walked as such
 * so a stray folder cannot turn this into an unbounded scan.
 */
export function findCodexRollout(codexHome: string, sessionId?: string): string | null {
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
          if (sessionId && !name.endsWith(`-${sessionId}.jsonl`)) continue;
          const file = path.join(dayDir, name);
          try {
            const st = statSync(file);
            if (!st.isFile()) continue;
            if (!newest || st.mtimeMs > newest.mtimeMs) newest = { file, mtimeMs: st.mtimeMs };
          } catch { /* gone mid walk */ }
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
  /** Per agent: the file found (null for a miss) and, for a guess or a miss,
   *  when to look again. */
  private cache = new Map<string, { key: string; file: string | null; until?: number }>();

  constructor(private readonly deps: HistoryDeps, private readonly limits: TailLimits = {}) {}

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
    if (hit && hit.key === key && (hit.until === undefined || Date.now() < hit.until)) {
      if (hit.file === null) return { reason: 'no-transcript' };
      if (existsSync(hit.file)) return { provider, file: hit.file };
    }
    const found = this.locate(agentId, provider, sid, hookPath, a.cwd ?? '');
    if (!found) { this.cache.set(agentId, { key, file: null, until: Date.now() + NEWEST_GUESS_MS }); return { reason: 'no-transcript' }; }
    // Only a file found by session id or hook path is kept for the session. The
    // newest rollout is a guess (a new session's may not be on disk yet, and the
    // last one's still is), so it is looked up again after a few seconds.
    this.cache.set(agentId, { key, file: found.file, ...(found.guess ? { until: Date.now() + NEWEST_GUESS_MS } : {}) });
    return { provider, file: found.file };
  }

  /** Every path, the hook's or one built from the session id, is used only
   *  when it resolves inside the provider's own store: a link planted where the
   *  session's file should be must not be followed out of it. */
  private locate(agentId: string, provider: HistoryProvider, sid: string, hookPath: string, cwd: string): { file: string; guess?: boolean } | null {
    const hookOk = hookPath.endsWith('.jsonl') && isFile(hookPath);
    if (provider === 'claude') {
      const roots = claudeProjectRoots();
      const hook = hookOk ? realInside(roots, hookPath) : null;
      if (hook) return { file: hook };
      if (sid && cwd && path.isAbsolute(cwd)) {
        const p = path.join(projectDir(cwd), `${sid}.jsonl`);
        const real = isFile(p) ? realInside(roots, p) : null;
        if (real) return { file: real };
      }
      return null;
    }
    if (provider === 'codex') {
      const home = this.deps.codexHomeFor(agentId);
      if (!home) return null;
      const roots = codexRoots(home);
      const byId = sid ? findCodexRollout(home, sid) : null;
      const byIdReal = byId ? realInside(roots, byId) : null;
      if (byIdReal) return { file: byIdReal };
      const hook = hookOk ? realInside(roots, hookPath) : null;
      if (hook) return { file: hook };
      // The newest rollout is a guess, and only for an agent with no session
      // id: with one, the newest is another session's (the last one's), shown
      // as current while the agent idles.
      if (sid) return null;
      const newest = findCodexRollout(home);
      const newestReal = newest ? realInside(roots, newest) : null;
      return newestReal ? { file: newestReal, guess: true } : null;
    }
    // antigravity
    const brain = path.join(this.deps.geminiHome(), 'antigravity-cli', 'brain');
    const hook = hookOk && path.basename(hookPath) === 'transcript.jsonl' ? realInside([brain], hookPath) : null;
    if (hook) return { file: hook };
    if (sid) {
      const p = path.join(brain, sid, '.system_generated', 'logs', 'transcript.jsonl');
      const real = isFile(p) ? realInside([brain], p) : null;
      if (real) return { file: real };
    }
    return null;
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
      const clean = (items: HistoryItem[]): HistoryItem[] => (this.deps.redact ? items.map((i) => ({ ...i, text: this.deps.redact!(i.text) })) : items);
      const toItems = (lines: LineRef[]): HistoryItem[] => clean(lines.flatMap((l) => normalizeLine(provider, l.text, l.offset)));
      if (after !== undefined) {
        const size = statSync(file).size;
        // Smaller than where we were: truncated or replaced. The view reloads the tail.
        if (size < after) return { ...head, items: [], start: 0, end: 0, atStart: false, size, reset: true };
        const res = readLinesForward(file, after, this.limits);
        return { ...head, items: toItems(res.lines), start: res.start, end: res.end, atStart: res.start === 0, size: res.size };
      }
      // Each line is normalised once, as it is met (newest first), so the scan can stop
      // as soon as the page is full.
      const groups: HistoryItem[][] = [];
      let seen = 0;
      let count = 0;
      const res = readLinesBackward(file, before ?? null, (newestFirst) => {
        while (seen < newestFirst.length) {
          const l = newestFirst[seen++];
          const items = clean(normalizeLine(provider, l.text, l.offset));
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

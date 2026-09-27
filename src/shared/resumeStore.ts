/**
 * Where each CLI keeps its sessions on disk, so a restart only attaches a
 * resume id the CLI can actually open (0.5.3, the founder's "the session
 * getting lost after restart ... it should not be lost for any agent").
 *
 * Claude and Codex have their own richer checks (transcript seeding by cwd,
 * the per agent CODEX_HOME walk). This module covers the rest.
 *
 * THE STORE IS RESOLVED FROM THE SPAWN'S OWN ENVIRONMENT, never from the
 * person's home alone (Kevin's review of #90): the app runs every pi agent
 * with a per agent PI_CODING_AGENT_DIR, so its sessions are not under
 * ~/.pi at all, and a check that read ~/.pi would call a good id missing and
 * start the agent fresh, the exact loss this module exists to stop. The
 * caller passes the environment the CLI is spawned with (process.env with
 * the agent's env over it, which is what the pty hands the child), and each
 * provider's own override is honoured the way the CLI's code resolves it:
 *
 *   kimi    KIMI_CODE_HOME, else ~/.kimi-code        -> sessions/wd_* /session_<id>
 *   grok    GROK_HOME, else ~/.grok                  -> sessions/<cwd>/<id>
 *   qwen    QWEN_RUNTIME_DIR, else QWEN_HOME, else ~/.qwen -> projects/* /chats/<id>.*
 *           (a runtimeOutputDir in its settings moves it too: cannot tell)
 *   pi      PI_CODING_AGENT_SESSION_DIR (files directly in it), else
 *           PI_CODING_AGENT_DIR, else ~/.pi/agent    -> sessions/* /<file with the id>
 *           (a sessionDir in its settings moves it too: cannot tell)
 *   cursor  ~/.cursor/chats/<md5 of cwd>/<id>; CURSOR_CONFIG_DIR,
 *           CURSOR_DATA_DIR or XDG_CONFIG_HOME set: cannot tell
 *
 * Read from each CLI's shipped code on 24 Sep 2026 (kimi 2.1.0, qwen 0.24.x,
 * pi's config.js and main.js, cursor-agent 2026.09.18, grok's own GROK_HOME).
 *
 * THE SAFETY RULE: whenever the root the check would read might not be the
 * one the CLI will read, the answer is "cannot tell" (null here), and the
 * caller attaches the newest recorded id unchecked. A wrong "missing" costs a
 * session; a wrong "present" costs one failed resume.
 *
 * No spec, so attach-only: OpenCode (1.x keeps sessions in opencode.db, a
 * SQLite file, not a directory per session), Gemini, Antigravity, Crush,
 * Copilot (stores not verifiable on the machine this was written on).
 */
import type { AgentProvider } from './agentProvider';

export interface SessionStoreSpec {
  /** The store's root directory, resolved from the spawn's environment. */
  root: string;
  /** Path segments under root down to the directory holding the sessions.
   *  '*' matches any one entry. Empty: the sessions sit in root itself. */
  segments: string[];
  /** True when this directory entry is the session `sid`. */
  match: (entry: string, sid: string) => boolean;
}

export interface StoreContext {
  /** The environment the CLI is spawned with. */
  env: Record<string, string | undefined>;
  /** The person's home directory. */
  home: string;
  /** The agent's working directory (project settings may move a store). */
  cwd?: string;
  /** Reads a small text file, or null when it is absent. */
  readText: (file: string) => string | null;
}

const joinPath = (a: string, b: string): string => (a.endsWith('/') ? a + b : `${a}/${b}`);
const set = (v: string | undefined): v is string => typeof v === 'string' && v.trim().length > 0;

/** The store spec for a provider under this spawn's environment, or null
 *  when the store is unknown or cannot be pinned down: the caller must then
 *  attach without checking (never silently drop the id). */
export function providerSessionStore(provider: AgentProvider, ctx: StoreContext): SessionStoreSpec | null {
  const { env, home } = ctx;
  switch (provider) {
    case 'kimi': {
      const root = set(env.KIMI_CODE_HOME) ? env.KIMI_CODE_HOME : joinPath(home, '.kimi-code');
      return { root, segments: ['sessions', '*'], match: (e, sid) => e === `session_${sid}` };
    }
    case 'grok': {
      const root = set(env.GROK_HOME) ? env.GROK_HOME : joinPath(home, '.grok');
      return { root, segments: ['sessions', '*'], match: (e, sid) => e === sid };
    }
    case 'qwen': {
      const configDir = set(env.QWEN_HOME) ? env.QWEN_HOME : joinPath(home, '.qwen');
      if (!set(env.QWEN_RUNTIME_DIR)) {
        // A runtimeOutputDir in the user's or the project's settings moves the
        // session data; the check cannot follow that faithfully, so it steps aside.
        const settings = [joinPath(configDir, 'settings.json'), ctx.cwd ? joinPath(joinPath(ctx.cwd, '.qwen'), 'settings.json') : ''];
        if (settings.some((f) => f && (ctx.readText(f) ?? '').includes('runtimeOutputDir'))) return null;
      }
      const root = set(env.QWEN_RUNTIME_DIR) ? env.QWEN_RUNTIME_DIR : configDir;
      return { root, segments: ['projects', '*', 'chats'], match: (e, sid) => e.startsWith(sid) };
    }
    case 'pi': {
      if (set(env.PI_CODING_AGENT_SESSION_DIR)) {
        return { root: env.PI_CODING_AGENT_SESSION_DIR, segments: [], match: (e, sid) => e.includes(sid) };
      }
      const agentDir = set(env.PI_CODING_AGENT_DIR) ? env.PI_CODING_AGENT_DIR : joinPath(joinPath(home, '.pi'), 'agent');
      if ((ctx.readText(joinPath(agentDir, 'settings.json')) ?? '').includes('sessionDir')) return null;
      return { root: agentDir, segments: ['sessions', '*'], match: (e, sid) => e.includes(sid) };
    }
    case 'cursor': {
      if (set(env.CURSOR_CONFIG_DIR) || set(env.CURSOR_DATA_DIR) || set(env.XDG_CONFIG_HOME)) return null;
      return { root: joinPath(home, '.cursor'), segments: ['chats', '*'], match: (e, sid) => e === sid };
    }
    default: return null;
  }
}

/** Lists a directory's entries, or null when it does not exist. The caller
 *  injects it (main wraps readdirSync); tests hand in a plain map. */
export type DirLister = (dir: string) => string[] | null;

/** The fixed part of the store (the root and every segment before the first
 *  '*') exists. When it does not, this CLI has never written a session under
 *  this root, and the absence of an id proves nothing. */
export function storeCanCheck(spec: SessionStoreSpec, list: DirLister): boolean {
  let dir = spec.root;
  for (const seg of spec.segments) {
    if (seg === '*') break;
    dir = joinPath(dir, seg);
  }
  return list(dir) !== null;
}

/** Does `sid` exist in this store? Walks the segments, fanning out at '*'. */
export function storeHasSession(spec: SessionStoreSpec, sid: string, list: DirLister): boolean {
  let dirs: string[] = [spec.root];
  for (const seg of spec.segments) {
    dirs = seg === '*'
      ? dirs.flatMap((d) => (list(d) ?? []).map((e) => joinPath(d, e)))
      : dirs.map((d) => joinPath(d, seg));
  }
  return dirs.some((d) => (list(d) ?? []).some((e) => spec.match(e, sid)));
}

/**
 * The one decision a non-Claude, non-Codex restart makes: which recorded id
 * to hand the CLI, or undefined to start fresh AND SAY SO.
 *  - a checkable store: the newest candidate the store actually has,
 *  - no spec, or a store never written under this root: the newest
 *    candidate, unchecked, because dropping a possibly good id loses a
 *    session to save a maybe.
 */
export function chooseResumeSession(
  candidates: readonly (string | undefined | null)[],
  spec: SessionStoreSpec | null,
  list: DirLister
): { sid: string | undefined; checked: boolean } {
  const first = candidates.find((c): c is string => !!c);
  if (!spec || !storeCanCheck(spec, list)) return { sid: first, checked: false };
  for (const c of candidates) {
    if (c && storeHasSession(spec, c, list)) return { sid: c, checked: true };
  }
  return { sid: undefined, checked: true };
}

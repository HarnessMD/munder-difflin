/**
 * THE ACTIVITY DIGEST (v0.4.9 phase 2, decision D4). What an agent card and the
 * agent room's Inbox show as "what it is doing", in the agent's own terms,
 * built in main from the hook events every spawned session already sends
 * (main/hooks.ts HookServer) and kept per agent as a ring buffer, so the
 * renderer can reload without losing the morning.
 *
 * One entry per event worth a line. `detail` is the one line summary of the
 * tool input (a path, the head of a command, a pattern), never the whole
 * payload: the technical rendering shows it, the simple one does not.
 */
export type ActivityKind =
  /** A tool ran: `tool` names it, `detail` says on what. */
  | 'tool'
  /** The session asked for the human (permission, a question). `text` is its message. */
  | 'notice'
  /** The session reached its idle prompt. */
  | 'idle'
  /** Context compaction began or ended. */
  | 'compact'
  /** The session started or was resumed. */
  | 'session'
  /** A hive message left this agent (its outbox). `text` is the subject. */
  | 'message';

export interface ActivityEntry {
  /** epoch ms */
  ts: number;
  kind: ActivityKind;
  tool?: string;
  detail?: string;
  text?: string;
  /** The WHOLE path of the file this tool touched, when it touched one.
   *
   *  `detail` is deliberately shortened to its last two segments so a line
   *  stays readable, and a shortened path cannot be opened. The founder asked
   *  (3 Sep 2026) that clicking a file an agent made should open it, so the
   *  path is carried beside the words rather than parsed back out of them. */
  path?: string;
}

export interface ActivityPush {
  agentId: string;
  entry: ActivityEntry;
}

/** Entries kept per agent. The number is a memory bound, not a UI promise. */
export const ACTIVITY_RING = 200;

const MAX_DETAIL = 120;

function clip(s: string): string {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > MAX_DETAIL ? `${one.slice(0, MAX_DETAIL - 1)}…` : one;
}

function baseName(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join('/') : parts.join('/');
}

/**
 * The one line a person can read about a tool call. Paths are shortened to
 * their last two segments; commands keep their head; everything else is the
 * first string field found. Unknown shapes yield undefined, never "[object]".
 *
 * Order matters: Grep and Glob carry a `pattern` AND the `path` they search,
 * and the directory is not what a person wants to read, so the pattern wins
 * over a bare `path`. Only `file_path` and `notebook_path` name the file a
 * tool actually touches, so those come first.
 */
/**
 * The file a tool call actually touched, whole and absolute, or undefined.
 *
 * Only `file_path` and `notebook_path` name a file a tool writes or reads;
 * `path` is the DIRECTORY a search runs in and `pattern` is not a file at all,
 * so neither qualifies. A relative path is refused: the chip opens what it
 * names, and a path resolved against the wrong working directory opens the
 * wrong file or nothing.
 */
export function fileTouchedBy(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const o = input as Record<string, unknown>;
  for (const k of ['file_path', 'notebook_path']) {
    const v = o[k];
    if (typeof v === 'string' && v.startsWith('/') && v.length > 1) return v;
  }
  return undefined;
}

export function summariseToolInput(tool: string | undefined, input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const o = input as Record<string, unknown>;
  const str = (k: string): string | undefined => (typeof o[k] === 'string' && (o[k] as string).trim() ? (o[k] as string) : undefined);
  const file = str('file_path') ?? str('notebook_path');
  if (file) return clip(baseName(file));
  if (str('command')) return clip(str('command')!);
  if (str('pattern')) return clip(str('pattern')! + (str('glob') ? ` in ${str('glob')}` : ''));
  if (str('path')) return clip(baseName(str('path')!));
  if (str('url')) return clip(str('url')!);
  if (str('query')) return clip(str('query')!);
  if (str('description')) return clip(str('description')!);
  if (str('prompt')) return clip(str('prompt')!);
  if (str('skill')) return clip(str('skill')!);
  void tool;
  for (const v of Object.values(o)) if (typeof v === 'string' && v.trim()) return clip(v);
  return undefined;
}

/** Tools whose runs are not worth a line to a person (bookkeeping). */
const QUIET_TOOLS = new Set(['TodoWrite', 'TaskOutput', 'TaskStop']);

/** A field of the hook payload as the string it claims to be, or undefined.
 *  The payload is JSON off a socket: the type says string, the wire may not. */
function word(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

/** Map a hook event to the entry it deserves, or null when it is noise. */
export function entryForHookEvent(event: string, p: { tool?: string; toolInput?: unknown; message?: string; notificationType?: string; source?: string }, ts: number): ActivityEntry | null {
  switch (event) {
    case 'PreToolUse': {
      const tool = word(p.tool);
      if (!tool || QUIET_TOOLS.has(tool)) return null;
      const path = fileTouchedBy(p.toolInput);
      return { ts, kind: 'tool', tool, detail: summariseToolInput(tool, p.toolInput), ...(path ? { path } : {}) };
    }
    case 'Notification': {
      const message = word(p.message);
      if (!message) return null;
      return { ts, kind: 'notice', text: clip(message) };
    }
    case 'Stop': return { ts, kind: 'idle' };
    case 'PreCompact': return { ts, kind: 'compact', text: 'started' };
    case 'PostCompact': return { ts, kind: 'compact', text: 'done' };
    case 'SessionStart': {
      const source = word(p.source);
      return { ts, kind: 'session', text: source ? clip(source) : undefined };
    }
    default: return null;
  }
}

/**
 * The outbox line: a hive message left this agent. The subject is clipped to
 * the same width as every other line; a blank subject is not worth a line.
 */
export function entryForMessage(subject: string | undefined, ts: number): ActivityEntry | null {
  const text = typeof subject === 'string' ? clip(subject) : '';
  if (!text) return null;
  return { ts, kind: 'message', text };
}

/**
 * What each agent's CLI has told the hook server lately, kept so a delivery can
 * PROVE its message was submitted (autosend, 0.5.5).
 *
 * Noted at the moment a hook request arrives, before any other handler work
 * (HookServer.handle), so a busy handler cannot delay the proof. Kept in
 * memory only, and of the prompt only its last 48 characters with whitespace
 * removed (promptTail): enough to recognise our own text, never the message.
 */
import { promptTail, tailMatches } from '../shared/providerAutomation';

/** Events that mean a prompt was taken or a turn is running. Only these are
 *  proof of activity, and only these show the hook channel works (gate G1,
 *  G2): a status line tick or the idle Notification comes on its own schedule
 *  (Claude sends the idle one 60 s after a turn ends), and SessionStart and the
 *  status line ride the command shim while UserPromptSubmit rides http, so they
 *  say nothing about the prompt's transport. UserPromptSubmit counts even when
 *  its tail does not match: the box was emptied, and our text was in it. */
export const TURN_EVENTS: ReadonlySet<string> = new Set([
  'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'Stop', 'StopFailure',
  'SubagentStop', 'PreCompact', 'PostCompact', 'PreInvocation', 'PostInvocation'
]);

interface AgentHooks {
  /** Last time each event arrived. */
  lastAt: Map<string, number>;
  /** Last time a TURN_EVENTS event arrived. */
  turnAt: number;
  /** The most recent UserPromptSubmit tails, newest last. */
  prompts: Array<{ at: number; tail: string }>;
  /** When a prompt that asks the person opened (a permission, a question), or 0 once it closed. */
  askOpenAt: number;
}

/**
 * A PROMPT THAT ASKS THE PERSON IS OPEN (trigger-prompt-058, god, 9 Nov 2026: a launch desk trigger's Enter approved a
 * subagent's permission prompt that had waited 3 hours, and its own text was lost). Opened by a Notification that needs
 * the person (a permission, an approval, a confirm: agentState.ts stateAfter's rule) or by the AskUserQuestion tool.
 * Closed only by what answers it: the tool running or failing (PostToolUse, PostToolUseFailure), a prompt sent
 * (UserPromptSubmit) or a new session (SessionStart). Not by a Stop: a background subagent's prompt stays open after
 * its parent's turn ends. Not by the quiet "waiting for your input" Notification, which also comes while it is open.
 */
const ASKS_PERSON = /permission|approve|approval|confirm|needs your/i;
const QUIET = /waiting for your input|is idle|waiting for input/i;
const ASK_CLOSED: ReadonlySet<string> = new Set(['PostToolUse', 'PostToolUseFailure', 'UserPromptSubmit', 'SessionStart']);
/** A Notification's words that ask the person, never the quiet one. */
export function asksPerson(message: string | undefined): boolean {
  const m = (message ?? '').trim();
  return !!m && ASKS_PERSON.test(m) && !QUIET.test(m);
}

/**
 * A COMPACTION IS RUNNING. From PreCompact until one of these comes after it: the
 * compaction ended (PostCompact, or the new session it starts), the turn it ran in ended or failed, or the CLI took a
 * prompt or ran a tool, so it is in a turn again. Typed into a running /compact, a person's message reached god as
 * local command output and the compaction never finished (log.jsonl 22:55:50 and 22:56:06 IST).
 */
const COMPACT_OVER: readonly string[] = ['PostCompact', 'SessionStart', 'Stop', 'StopFailure', 'UserPromptSubmit', 'PreToolUse'];

const PROMPTS_KEPT = 8;

export class HookProofRecord {
  private byAgent = new Map<string, AgentHooks>();

  constructor(private now: () => number = Date.now) {}

  note(agentId: string | undefined, event: string, prompt?: unknown, extra?: { message?: unknown; tool?: unknown }): void {
    if (!agentId) return;
    const at = this.now();
    let a = this.byAgent.get(agentId);
    if (!a) { a = { lastAt: new Map(), turnAt: 0, prompts: [], askOpenAt: 0 }; this.byAgent.set(agentId, a); }
    a.lastAt.set(event, at);
    if (TURN_EVENTS.has(event)) a.turnAt = at;
    if (event === 'Notification' && asksPerson(typeof extra?.message === 'string' ? extra.message : undefined)) a.askOpenAt = at;
    else if (event === 'PreToolUse' && extra?.tool === 'AskUserQuestion') a.askOpenAt = at;
    else if (ASK_CLOSED.has(event)) a.askOpenAt = 0;
    if (event === 'UserPromptSubmit' && typeof prompt === 'string') {
      a.prompts.push({ at, tail: promptTail(prompt) });
      if (a.prompts.length > PROMPTS_KEPT) a.prompts.shift();
    }
  }

  /** A turn event (TURN_EVENTS) from this agent at or after `sinceMs`: a
   *  prompt was taken or a turn ran. Asked since the terminal started, it is
   *  also "this agent's hook channel works". */
  activitySeen(agentId: string | undefined, sinceMs: number): boolean {
    const a = agentId ? this.byAgent.get(agentId) : undefined;
    return !!a && a.turnAt > 0 && a.turnAt >= sinceMs;
  }

  /** One of `events` at or after `sinceMs`. */
  eventSeen(agentId: string | undefined, sinceMs: number, events: readonly string[]): boolean {
    const a = agentId ? this.byAgent.get(agentId) : undefined;
    return !!a && events.some((e) => { const at = a.lastAt.get(e) ?? 0; return at > 0 && at >= sinceMs; });
  }

  /** Any event at all from this agent at or after `sinceMs`. */
  anySeen(agentId: string | undefined, sinceMs: number): boolean {
    const a = agentId ? this.byAgent.get(agentId) : undefined;
    if (!a) return false;
    for (const at of a.lastAt.values()) if (at > 0 && at >= sinceMs) return true;
    return false;
  }

  /** A prompt that asks the person is open, by this agent's hooks (askOpenAt above). */
  askOpen(agentId: string | undefined): boolean {
    return (agentId ? this.byAgent.get(agentId)?.askOpenAt ?? 0 : 0) > 0;
  }

  /** When this agent's running compaction began (COMPACT_OVER above): a PreCompact at or after `sinceMs`, less than
   *  `maxMs` ago, with nothing in COMPACT_OVER after it. 0 when none is running. A CLI that dies mid compaction sends
   *  no end, so after `maxMs` the compaction is taken as over. */
  compactRunningSince(agentId: string | undefined, sinceMs: number, maxMs: number): number {
    const a = agentId ? this.byAgent.get(agentId) : undefined;
    const pre = a?.lastAt.get('PreCompact') ?? 0;
    if (!a || pre <= 0 || pre < sinceMs || this.now() - pre >= maxMs) return 0;
    return COMPACT_OVER.some((e) => (a.lastAt.get(e) ?? 0) > pre) ? 0 : pre;
  }

  /** When `event` last arrived from this agent, or 0. */
  lastEventAt(agentId: string | undefined, event: string): number {
    return (agentId ? this.byAgent.get(agentId)?.lastAt.get(event) : undefined) ?? 0;
  }

  /** The last UserPromptSubmit from this agent: the prompt its current turn
   *  began with (founderTurn.ts). */
  lastPrompt(agentId: string | undefined): { at: number; tail: string } | null {
    const a = agentId ? this.byAgent.get(agentId) : undefined;
    return a?.prompts[a.prompts.length - 1] ?? null;
  }

  /** A UserPromptSubmit at or after `sinceMs` whose prompt ends with `tail`. */
  promptSeen(agentId: string | undefined, sinceMs: number, tail: string): boolean {
    const a = agentId ? this.byAgent.get(agentId) : undefined;
    return !!a && a.prompts.some((p) => p.at >= sinceMs && tailMatches(p.tail, tail));
  }
}

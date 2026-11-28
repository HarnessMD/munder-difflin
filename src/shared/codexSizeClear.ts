/**
 * A Codex conversation file that has grown too large is cleared (0.5.6).
 *
 * Codex appends every step of a conversation to one JSONL file (a "rollout"),
 * images in full as base64. One person's files were 405 to 416 MB. On a restart
 * the app resumes that conversation and Codex parses the whole file, so the
 * start is slow and heavy. Codex's `/clear` starts a new chat in a new file, and
 * the app learns the new session from the agent's next hook (hive.ts
 * recordSession), so a later restart resumes the small file.
 *
 * So when a Codex agent's live rollout passes CODEX_ROLLOUT_CLEAR_BYTES, the app
 * clears it at its next idle moment, exactly as the clear on a switch of work
 * does (switchClear.ts): the hand off request first, then the clear, both
 * through the agent's queue, the clear asked of main's gate before it is typed.
 * This runs whether that automation is on or off.
 *
 *   - Codex only. Any other engine is never checked.
 *   - The size is read by stat, never by reading the file, at most once every
 *     CODEX_SIZE_CHECK_MS per agent.
 *   - Never mid turn: the window queues the hand off only when the agent is
 *     idle and nothing waits in its queue, and main hands it out only when no
 *     hand off is already out and no sub agent is open.
 *   - One clear per file: once the clear for a file is typed, that file is
 *     never checked again. A new file (a new path in the hooks) starts afresh.
 *
 * No electron import, no fs import: main hands in the stat, and the window and
 * the tests share this file.
 */
import type { AgentProvider } from './agentProvider';
import type { SwitchPhase, TypedKind } from './switchClear';

/** The size past which a Codex rollout is cleared: 100 MB. */
export const CODEX_ROLLOUT_CLEAR_BYTES = 100 * 1024 * 1024;

/** At most one stat of an agent's rollout in this long. */
export const CODEX_SIZE_CHECK_MS = 60_000;

/** What the window knows when it may queue the clear. */
export interface SizeClearWindowFacts {
  provider: AgentProvider;
  /** The queue's own idle gate (canDeliverToAgent): no turn open, no menu. */
  idle: boolean;
  /** Messages waiting in the agent's queue. */
  queued: number;
  /** The orchestrator asked for this clear (askedClear.ts): any engine. */
  asked?: boolean;
}

/** The next idle moment, as the window sees it: a Codex agent (or any agent
 *  the orchestrator asked to clear), no turn open, and nothing waiting to be
 *  typed. */
export function sizeClearReady(f: SizeClearWindowFacts): boolean {
  return (f.provider === 'codex' || f.asked === true) && f.idle && f.queued === 0;
}

/** What main knows when the window asks for the hand off request. */
export interface SizeHandoffFacts {
  /** Where the clear on a switch of work is for this agent. */
  phase: SwitchPhase;
  /** Open sub agents (BackgroundWork.open). */
  openBackground: number;
  /** The engine has a clear command, and hooks the app hears a turn end from. */
  canClear: boolean;
}

interface Watch {
  /** The live rollout this agent's hooks last named. */
  path: string;
  /** Its size at the last stat, in bytes. */
  bytes: number;
  /** Past the limit, and its clear has not been typed yet. */
  due: boolean;
  /** The clear for this file was typed: it is never checked again. */
  done: boolean;
}

/** The outcomes of the submit door (providerAutomation SubmitOutcome). */
type Outcome = 'submitted' | 'unconfirmed' | 'stuck' | 'held' | 'gone';

export class CodexSizeClear {
  private watches = new Map<string, Watch>();
  /** When each agent's rollout was last looked at. Per agent, not per file. */
  private checkedAt = new Map<string, number>();

  constructor(private now: () => number = Date.now) {}

  /**
   * Look at one agent's live rollout, if it is time to. `providerOf` is asked
   * only when a check is due, so a beat over every agent reads the registry
   * once a minute at most. `size` is a stat: bytes, or null when the file
   * cannot be read. Answers whether the clear is due now.
   */
  async check(
    agentId: string,
    path: string | undefined,
    providerOf: () => AgentProvider,
    size: (path: string) => Promise<number | null>
  ): Promise<boolean> {
    if (!agentId || !path) return false;
    let w = this.watches.get(agentId);
    // A new file: a new watch. The old one's clear, typed or not, is over.
    if (!w || w.path !== path) {
      w = { path, bytes: 0, due: false, done: false };
      this.watches.set(agentId, w);
    }
    if (w.done) return false;
    const now = this.now();
    if (now - (this.checkedAt.get(agentId) ?? Number.NEGATIVE_INFINITY) < CODEX_SIZE_CHECK_MS) return w.due;
    this.checkedAt.set(agentId, now);
    if (providerOf() !== 'codex') {
      this.watches.delete(agentId);
      return false;
    }
    let bytes: number | null = null;
    try { bytes = await size(path); } catch { bytes = null; }
    // The agent moved to another file, or was forgotten, while the stat ran.
    if (this.watches.get(agentId) !== w || w.done) return false;
    if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return w.due;
    w.bytes = bytes;
    w.due = bytes > CODEX_ROLLOUT_CLEAR_BYTES;
    return w.due;
  }

  /** Is the clear due for this agent's current file? */
  due(agentId: string): boolean {
    return this.watches.get(agentId)?.due === true;
  }

  /** May main hand out the hand off request now? Due, an engine that can be
   *  cleared, no hand off already out, and no sub agent open. A switch that
   *  has just cleared (`cleared`) does not stand in the way: the hand off moves
   *  it back to `asked`, and the wake behind it still says the context is new. */
  handoffDue(agentId: string, f: SizeHandoffFacts): boolean {
    if (!this.due(agentId) || !f.canClear) return false;
    if (f.phase === 'asked') return false;
    return f.openBackground === 0;
  }

  /**
   * Something went through the submit door for this agent. When it was the
   * clear, and this file was due, the file is done: the size in bytes is
   * returned for the log, once. Anything else, or nothing typed, is null. A
   * clear left in the input box counts as typed, as it does for the switch.
   */
  noteTyped(agentId: string | undefined, kind: TypedKind, outcome: Outcome, pressOnly = false): number | null {
    if (!agentId || pressOnly || kind !== 'clear' || outcome === 'held' || outcome === 'gone') return null;
    const w = this.watches.get(agentId);
    if (!w || !w.due || w.done) return null;
    w.due = false;
    w.done = true;
    return w.bytes;
  }

  /** What is known of one agent's file (for tests and logs). */
  state(agentId: string): { path: string; bytes: number; due: boolean; done: boolean } | undefined {
    const w = this.watches.get(agentId);
    return w ? { ...w } : undefined;
  }

  /** The agent's terminal closed. */
  forget(agentId: string): void {
    this.watches.delete(agentId);
    this.checkedAt.delete(agentId);
  }
}

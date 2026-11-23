/**
 * Clear on a switch of work (0.5.6).
 *
 * An agent that has been on one piece of work for an hour carries that work's
 * whole context into the next one. So when a wake is about to be typed, and
 * its work id is not the work the agent is on, and the session is old enough,
 * the app does three things in order:
 *
 *   1. types a short hand off request in place of the wake;
 *   2. when that turn ends, types the engine's clear command;
 *   3. types the wake for the new work.
 *
 * The hand off request and the clear ride the agent's queue like any message:
 * typed at an idle prompt only, never over a person's draft or an open menu.
 *
 * WHO DECIDES. Main does. It writes every wake (hive:wakeText and the worker
 * watchdog) and sees every text that is typed (the one submit door), so the
 * state below lives there, in memory. The window types what main hands it and
 * asks `clearGate` before it types the clear.
 *
 * WHAT HOLDS THE CLEAR. An open sub agent, and nothing else. A switch does not
 * start while one is open, and a clear that is already queued waits for it,
 * with no ceiling. A background command is not held on: the hooks show one
 * start and never show it finish, so a count of them could only go up (see
 * BackgroundWork).
 *
 * THE ONE THING THIS MUST NEVER DO is clear a context after the wake for the
 * new work was typed into it: that mail is filed when the turn ends, and the
 * agent would never act on it. So a wake that is typed, or handed out, while a
 * switch is under way ends the switch, and `clearGate` then answers `drop`.
 *
 * A CODEX FILE TOO LARGE takes the same road (codexSizeClear.ts): its own hand
 * off request, typed at an idle prompt with nothing queued, then the clear
 * through the same gate. It does not wait for a wake or for this rule. So does
 * a clear THE ORCHESTRATOR ASKS FOR (askedClear.ts), on any engine that can be
 * cleared. Every one of these clears saves what the agent knew to its
 * last-session.md first (lastSession.ts).
 *
 * No electron import, no store import: main, the window and the tests share it.
 */
import { typeable, wakeIds, wakesReceiver } from './hiveNudge';
import { workIdOf } from './workId';

/* ───────────────────────────────── the rule ───────────────────────────── */

/** The setting, kept at `contextTrigger.switchClear`. */
export interface SwitchClearRule {
  enabled: boolean;
  /** The agent's session must be at least this old before a switch clears it. */
  minSessionMs: number;
}

/** Off until the person switches it on in Automations (founder, 15 Oct 2026:
 *  "this should not be turned on by default"). */
export const DEFAULT_SWITCH_CLEAR: SwitchClearRule = { enabled: false, minSessionMs: 3_600_000 };

/** The range main keeps `minSessionMs` in: a minute to a day. */
export const SWITCH_CLEAR_MIN_MS = 60_000;
export const SWITCH_CLEAR_MAX_MS = 86_400_000;

/** A saved rule made safe: a boolean, and a whole number of ms in range. */
export function sanitizeSwitchClear(patch: unknown, current: SwitchClearRule = DEFAULT_SWITCH_CLEAR): SwitchClearRule {
  const p = (patch && typeof patch === 'object' ? patch : {}) as Partial<SwitchClearRule>;
  const ms = typeof p.minSessionMs === 'number' && Number.isFinite(p.minSessionMs)
    ? Math.min(SWITCH_CLEAR_MAX_MS, Math.max(SWITCH_CLEAR_MIN_MS, Math.round(p.minSessionMs)))
    : current.minSessionMs;
  return { enabled: typeof p.enabled === 'boolean' ? p.enabled : current.enabled, minSessionMs: ms };
}

/* ───────────────────────────────── the texts ──────────────────────────── */

/** The fixed head and tail of the hand off request. Neither is the head of an
 *  inbox wake, so the queue's one pending wake rule and the wake filing both
 *  read it as an ordinary message. */
const HANDOFF_HEAD = 'Hand off now: your next work is different and your context will be cleared.';
const HANDOFF_TAIL = 'then stop. Do not start new work.';
/** The head of the same request when a Codex conversation file has grown past
 *  its limit (codexSizeClear.ts). The tail, and so the rest, is the same. */
const SIZE_HANDOFF_HEAD = 'Hand off now: your conversation file is too large and your context will be cleared.';
/** The head of the same request when the orchestrator asked for the clear
 *  (askedClear.ts): its last resort for a context that stays too full. */
const ASKED_HANDOFF_HEAD = 'Hand off now: the orchestrator is clearing your context because it has grown too large.';
/** What each section of handoff.md is asked to hold. */
const HANDOFF_FIELDS = '(State, Next, Files, Open, and any command still running in the background and where its output goes)';

/** One line of typed text: no control characters, no line breaks. */
function line(text: unknown, max: number): string {
  return typeable(text).replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * The hand off request. One line, so it is safe for an engine that is typed
 * raw. `work` is the work the agent is on, the one its section is for;
 * `handoffPath` is the absolute path of its handoff.md. The clear takes the
 * whole context, so an agent that holds more than one piece of work (the
 * orchestrator) is told to write those sections too. A background command is
 * not held on (see the head of this file), so the agent is asked to write
 * down any that is still running: the note is all the new context has of it.
 */
export function handoffRequestText(work: string, handoffPath: string): string {
  return `${HANDOFF_HEAD} Update the section for "${line(work, 128)}" in ${line(handoffPath, 1024)} now ${HANDOFF_FIELDS}, and the section of any other work you still hold, append any durable fact to memory.md, ${HANDOFF_TAIL}`;
}

/**
 * The hand off request before a Codex agent whose conversation file passed its
 * limit is cleared (codexSizeClear.ts). The same work is still ahead, so only
 * the reason differs. `work` is the work the agent is on; with none known yet,
 * every section it holds is asked for.
 */
export function sizeHandoffRequestText(work: string | undefined, handoffPath: string): string {
  const on = line(work, 128);
  const where = line(handoffPath, 1024);
  return on
    ? `${SIZE_HANDOFF_HEAD} Update the section for "${on}" in ${where} now ${HANDOFF_FIELDS}, and the section of any other work you still hold, append any durable fact to memory.md, ${HANDOFF_TAIL}`
    : `${SIZE_HANDOFF_HEAD} Update the section of each piece of work you hold in ${where} now ${HANDOFF_FIELDS}, append any durable fact to memory.md, ${HANDOFF_TAIL}`;
}

/**
 * The hand off request when the orchestrator asked for the clear
 * (askedClear.ts). Its work goes on after the clear, so, as for a file too
 * large, only the reason differs.
 */
export function askedHandoffRequestText(work: string | undefined, handoffPath: string): string {
  const on = line(work, 128);
  const where = line(handoffPath, 1024);
  return on
    ? `${ASKED_HANDOFF_HEAD} Update the section for "${on}" in ${where} now ${HANDOFF_FIELDS}, and the section of any other work you still hold, append any durable fact to memory.md, ${HANDOFF_TAIL}`
    : `${ASKED_HANDOFF_HEAD} Update the section of each piece of work you hold in ${where} now ${HANDOFF_FIELDS}, append any durable fact to memory.md, ${HANDOFF_TAIL}`;
}

/** Is this text a hand off request, for a switch, a file too large or the
 *  orchestrator's ask? A wake is never one, whatever a message body inside it
 *  says: a wake is known by its closing lines. */
export function isHandoffRequest(text: string): boolean {
  return handoffReason(text) !== null;
}

/** Why the app asked for this hand off, or null when the text is not one. */
export type HandoffReason = 'switch' | 'size' | 'asked';
export function handoffReason(text: string): HandoffReason | null {
  const t = text.trim();
  if (!t.endsWith(HANDOFF_TAIL)) return null;
  const ids = wakeIds(t);
  if (ids.filed.length || ids.yours.length) return null;
  if (t.includes(HANDOFF_HEAD)) return 'switch';
  if (t.includes(SIZE_HANDOFF_HEAD)) return 'size';
  if (t.includes(ASKED_HANDOFF_HEAD)) return 'asked';
  return null;
}

/** The first line of the first wake after a switch clear. With the path of
 *  last-session.md (lastSession.ts), one more sentence says where what the
 *  agent knew before the clear was kept. */
export function clearedLead(handoffPath: string, lastSessionPath?: string): string {
  const head = `Your context was cleared for new work. Read ${line(handoffPath, 1024)} and the Rules part of your memory.md first.`;
  return lastSessionPath
    ? `${head} What you knew before the clear is kept in ${line(lastSessionPath, 1024)}: open it when asked about earlier work.`
    : head;
}

/** That line in front of a wake. The wake is still read from its end. */
export function withClearedLead(wake: string, handoffPath: string, oneLine = false, lastSessionPath?: string): string {
  return `${clearedLead(handoffPath, lastSessionPath)}${oneLine ? ' || ' : '\n\n'}${wake}`;
}

/* ─────────────────────────────── the decision ─────────────────────────── */

/** The work id of the oldest message that wakes, of mail given oldest first. A
 *  note that only rides along is not what the agent is being woken for. */
export function oldestWakingWork(
  mail: ReadonlyArray<{ work?: unknown; conversation?: unknown; id?: unknown; act?: unknown; created_at?: unknown }>,
  now = Date.now()
): string {
  const first = mail.find((m) => wakesReceiver(m, now)) ?? mail[0];
  return first ? workIdOf(first) : '';
}

export interface SwitchFacts {
  rule: SwitchClearRule;
  /** The work the agent is on. Absent: no wake has been carried yet. */
  onWork?: string;
  /** The work id of the oldest waking message. */
  wakeWork: string;
  /** When the agent's session started: its spawn, or its last clear. */
  sessionStartedAt: number;
  now: number;
  /** The engine has a clear command, and hooks the app hears a turn end from. */
  canClear: boolean;
  /** Open sub agents (BackgroundWork.open). */
  openBackground: number;
}

/**
 * Does this wake start a switch? Every condition must hold. No work yet means
 * no clear: the first wake only sets the work. The same work never clears.
 */
export function shouldSwitch(f: SwitchFacts): boolean {
  if (!f.rule.enabled || !f.canClear) return false;
  if (!f.onWork || !f.wakeWork || f.onWork === f.wakeWork) return false;
  if (f.openBackground > 0) return false;
  return f.now - f.sessionStartedAt >= f.rule.minSessionMs;
}

/* ───────────────────────────── background work ────────────────────────── */

/** What one hook payload says, for this file. Main fills it from the payload. */
export interface HookFacts {
  agentId?: string;
  event: string;
  tool?: string;
  toolInput?: unknown;
  sessionId?: string;
  /** Set on a payload sent from inside a sub agent. */
  agentType?: string;
  /** SessionStart only: startup, resume, clear or compact. */
  source?: string;
}

/** The tool that starts a sub agent in Claude Code (the newer name second). */
export const SUBAGENT_TOOLS: readonly string[] = ['Task', 'Agent'];

function inBackground(toolInput: unknown): boolean {
  return !!toolInput && typeof toolInput === 'object' && (toolInput as { run_in_background?: unknown }).run_in_background === true;
}

interface Counts {
  /** Sub agent tool calls the agent is blocked on right now. */
  calls: number;
  /** Of those, the ones whose sub agent has not stopped yet. */
  awaiting: number;
  /** Sub agents started in the background and not seen to stop. */
  running: number;
  /** This engine sends SubagentStart, so tool calls are not counted as starts. */
  startHook: boolean;
}

/**
 * Open sub agents per agent, counted from the hooks the app already receives.
 *
 * WHAT THE HOOKS SHOW.
 *  - A sub agent STARTING: the agent's own PreToolUse and PostToolUse of the
 *    sub agent tool, with `run_in_background` in its input when it is started
 *    in the background. An engine that sends SubagentStart (Grok) is counted
 *    by that instead.
 *  - A sub agent STOPPING: SubagentStop. Claude Code sends it with the sub
 *    agent's own id, not the agent's, so it is tied back to the agent by the
 *    session id both carry. An engine that sends it under the agent's id is
 *    counted directly.
 *  - A turn ENDING (Stop): no blocking call can still be open.
 *  - A session STARTING (SessionStart, not after a compaction): nothing from
 *    before is open.
 *
 * WHAT THEY DO NOT SHOW. A background COMMAND finishing. The Bash call that
 * starts one carries `run_in_background`, and no hook is sent when its process
 * exits. So background commands are not counted here at all: a count that can
 * only rise would hold every later clear for good.
 */
export class BackgroundWork {
  private counts = new Map<string, Counts>();
  /** session id to the agent whose own payloads carried it. */
  private owner = new Map<string, string>();

  private of(agentId: string): Counts {
    let c = this.counts.get(agentId);
    if (!c) { c = { calls: 0, awaiting: 0, running: 0, startHook: false }; this.counts.set(agentId, c); }
    return c;
  }

  note(h: HookFacts): void {
    if (h.event === 'SubagentStop') {
      // The session's owner first: Claude sends this with the sub agent's id.
      const agentId = (h.sessionId ? this.owner.get(h.sessionId) : undefined) ?? (h.agentType ? undefined : h.agentId);
      if (!agentId) return;
      const c = this.of(agentId);
      if (c.awaiting > 0) c.awaiting -= 1;
      else c.running = Math.max(0, c.running - 1);
      return;
    }
    // Everything else counts only from the agent's own payloads.
    if (!h.agentId || h.agentType) return;
    if (h.sessionId) this.owner.set(h.sessionId, h.agentId);
    const c = this.of(h.agentId);
    if (h.event === 'SubagentStart') { c.startHook = true; c.running += 1; return; }
    if (h.event === 'SessionStart') {
      if (h.source !== 'compact') { c.calls = 0; c.awaiting = 0; c.running = 0; }
      return;
    }
    if (h.event === 'Stop') { c.calls = 0; c.awaiting = 0; return; }
    if (c.startHook || !h.tool || !SUBAGENT_TOOLS.includes(h.tool)) return;
    const background = inBackground(h.toolInput);
    if (h.event === 'PreToolUse' && !background) { c.calls += 1; c.awaiting += 1; }
    if (h.event === 'PostToolUse') {
      if (background) c.running += 1;
      else { c.calls = Math.max(0, c.calls - 1); c.awaiting = Math.min(c.awaiting, c.calls); }
    }
  }

  /** Sub agents this agent has open now. */
  open(agentId: string | undefined): number {
    const c = agentId ? this.counts.get(agentId) : undefined;
    return c ? c.calls + c.running : 0;
  }

  forget(agentId: string): void {
    this.counts.delete(agentId);
    for (const [session, who] of this.owner) if (who === agentId) this.owner.delete(session);
  }
}

/* ────────────────────────────── the state machine ─────────────────────── */

/** Where one agent's switch is.
 *   none      no switch under way
 *   asked     the hand off request was typed; the clear has not landed
 *   cleared   the clear landed; the wake for the new work has not been typed */
export type SwitchPhase = 'none' | 'asked' | 'cleared';

/** What the caller knows when a wake is about to be typed; the rest is here. */
export type WakeFacts = Pick<SwitchFacts, 'rule' | 'wakeWork' | 'canClear'>;

/** What main hands the window when a wake is about to be typed. */
export type WakeStep = { kind: 'handoff'; work: string } | { kind: 'wake'; cleared: boolean };

/** What the window is told when it is about to type the clear. */
export type ClearGate = 'go' | 'hold' | 'drop';

/** What a typed text was. `other` is anything this file does not act on. */
export type TypedKind = 'wake' | 'handoff' | 'clear' | 'other';

/** Name a typed text. A wake first: a wake may quote anything in a body.
 *  `clearCommand` is the engine's own, or null when it has none. */
export function typedKind(text: string, clearCommand: string | null): TypedKind {
  const ids = wakeIds(text);
  if (ids.filed.length || ids.yours.length) return 'wake';
  if (isHandoffRequest(text)) return 'handoff';
  if (clearCommand && text.trim() === clearCommand.trim()) return 'clear';
  return 'other';
}

interface AgentSwitch {
  sessionStartedAt: number;
  onWork?: string;
  phase: SwitchPhase;
  /** The work of the wake main last wrote for this agent. */
  offered?: string;
}

/** The outcomes of the submit door (providerAutomation SubmitOutcome). */
type Outcome = 'submitted' | 'unconfirmed' | 'stuck' | 'held' | 'gone';

export class SwitchClear {
  readonly background = new BackgroundWork();
  private agents = new Map<string, AgentSwitch>();

  constructor(private now: () => number = Date.now) {}

  private of(agentId: string): AgentSwitch {
    let a = this.agents.get(agentId);
    if (!a) { a = { sessionStartedAt: this.now(), phase: 'none' }; this.agents.set(agentId, a); }
    return a;
  }

  /** The agent's terminal started: a session starts now, on no work yet. */
  noteSpawn(agentId: string): void {
    this.agents.set(agentId, { sessionStartedAt: this.now(), phase: 'none' });
  }

  /** Feed every hook payload. */
  noteHook(h: HookFacts): void {
    this.background.note(h);
    if (h.event !== 'SessionStart' || !h.agentId || h.agentType || h.source === 'compact') return;
    // A session that starts is a context that is new: the CLI came up, or it
    // was cleared (by this app or by a person at the keyboard).
    const a = this.of(h.agentId);
    a.sessionStartedAt = this.now();
    if (a.phase === 'asked') a.phase = 'cleared';
  }

  /**
   * A wake is about to be typed for this agent: what goes in its place?
   * Reading this while a switch is under way ends the switch (see the head of
   * this file), so only the two wake sites call it.
   */
  wakeStep(agentId: string, facts: WakeFacts): WakeStep {
    const a = this.of(agentId);
    a.offered = facts.wakeWork;
    if (a.phase === 'cleared') return { kind: 'wake', cleared: true };
    if (a.phase === 'asked') { a.phase = 'none'; return { kind: 'wake', cleared: false }; }
    return this.due(agentId, facts) ? { kind: 'handoff', work: a.onWork as string } : { kind: 'wake', cleared: false };
  }

  /** Would a wake for this work start a switch now? Changes nothing: the
   *  worker watchdog asks, and leaves such a wake to the window. */
  due(agentId: string, facts: WakeFacts): boolean {
    const a = this.agents.get(agentId);
    if (!a || a.phase !== 'none') return false;
    return shouldSwitch({
      ...facts, onWork: a.onWork, sessionStartedAt: a.sessionStartedAt, now: this.now(), openBackground: this.background.open(agentId)
    });
  }

  /**
   * Does the worker watchdog leave this wake to the window? Two cases.
   *
   * A wake that would START a switch: only the window can queue the clear
   * behind the hand off request, so the watchdog steps back. Not for ever:
   * once the oldest mail is `stallMs` old the window has had its chance (it
   * may be gone), and the watchdog types the plain wake, so a worker is never
   * left on its mail. That switch is then skipped. Mail of unknown age is
   * never waited on.
   *
   * A clear that is HELD on an open sub agent: the hold has no ceiling, so the
   * watchdog does not cut it short with a wake of its own.
   */
  leftToWindow(agentId: string, facts: WakeFacts, oldestMailAt: number, stallMs: number): boolean {
    if (this.clearGate(agentId) === 'hold') return true;
    if (!this.due(agentId, facts)) return false;
    return oldestMailAt > 0 && this.now() - oldestMailAt < stallMs;
  }

  /** The worker watchdog is about to type a wake of its own: no switch. */
  abandon(agentId: string): void {
    const a = this.agents.get(agentId);
    if (a && a.phase === 'asked') a.phase = 'none';
  }

  /**
   * Something went through the submit door for this agent. `wakeWork` is the
   * work of a wake the caller wrote itself; without it the last one handed
   * out by `wakeStep` is used.
   *
   * A text that was typed and is still in the input box (`stuck`) counts as
   * typed: it goes when a later press of the key takes it, and every way of
   * being early here is the safe one (a clear that is skipped, never a clear
   * that lands after a wake). A press of the key alone types nothing new, and
   * nothing was typed when a person held the terminal or the process was gone.
   */
  noteTyped(agentId: string | undefined, kind: TypedKind, outcome: Outcome, pressOnly = false, wakeWork?: string): void {
    if (!agentId || pressOnly || outcome === 'held' || outcome === 'gone') return;
    const a = this.of(agentId);
    // A hand off typed means a clear follows. From `cleared` too: a Codex
    // agent cleared for a file too large (codexSizeClear.ts) may get no wake
    // before its next file is too large, and its clear must not be dropped.
    if (kind === 'handoff') { if (a.phase !== 'asked') a.phase = 'asked'; return; }
    if (kind === 'clear') {
      a.sessionStartedAt = this.now();
      if (a.phase === 'asked') a.phase = 'cleared';
      return;
    }
    if (kind === 'wake') {
      const work = wakeWork || a.offered;
      if (work) a.onWork = work;
      a.phase = 'none';
    }
  }

  /** The window is about to type the clear it queued behind a hand off. */
  clearGate(agentId: string): ClearGate {
    const a = this.agents.get(agentId);
    if (!a || a.phase !== 'asked') return 'drop';
    return this.background.open(agentId) > 0 ? 'hold' : 'go';
  }

  phase(agentId: string): SwitchPhase {
    return this.agents.get(agentId)?.phase ?? 'none';
  }

  /** The work the agent is on, and when its session started (for tests and logs). */
  state(agentId: string): { onWork?: string; sessionStartedAt: number; phase: SwitchPhase } | undefined {
    const a = this.agents.get(agentId);
    return a ? { onWork: a.onWork, sessionStartedAt: a.sessionStartedAt, phase: a.phase } : undefined;
  }

  /** The agent's terminal closed. */
  forget(agentId: string): void {
    this.agents.delete(agentId);
    this.background.forget(agentId);
  }
}

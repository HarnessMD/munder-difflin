/**
 * WorkerWakeWatchdog — main-process inbox-wake watchdog for worker agents (#151).
 *
 * The renderer's idle inbox-wake nudge (useHive.ts effect #3) is the ONLY wake
 * path for a worker that has gone quiet at its prompt: it polls on a setInterval
 * in the renderer, so a throttled/occluded window (Chromium suspends background
 * setInterval timers) can miss the moment mail lands and the worker then sits on
 * an undrained inbox forever — the orchestrator ("god") never has this problem
 * because the main process re-engages it on its own heartbeat cadence.
 *
 * This watchdog is the worker-side counterpart: on a cadence it finds live
 * workers that are genuinely idle, have newly arrived inbox mail, are not
 * paused / not awaiting a human decision, and have not been nudged recently —
 * then types the same guarded nudge the renderer would have, directly into the
 * PTY. Message ids make this edge-triggered: unchanged undrained mail is never
 * re-announced once a minute forever.
 *
 * Safety mirrors the renderer's guarded queue-drain (useHive.ts dispatch):
 *  - only a GENUINELY idle worker is nudged (no PTY output for IDLE_MS — the
 *    same quiescence the renderer's idle fallback uses), never a mid-turn one,
 *  - never inside the boot sequence (BOOT_GRACE_MS from spawn, mirroring the
 *    renderer's bootGraceUntil),
 *  - delivery paused / agent paused / halted → no nudge (ControlRegistry),
 *  - an operator hold (registry onHold — "1:1 with the human") → no nudge,
 *  - a recent permission/HITL notification re-arms a block (HITL_REARM_MS) so a
 *    prompt the human is deciding on is never typed into,
 *  - a per-worker cooldown (NUDGE_COOLDOWN_MS) so the watchdog and the renderer
 *    nudge don't stack on top of each other.
 *
 * One exception to "genuinely idle" (#455): a STALLED worker, whose mail is
 * WORKER_WAKE_STALL_MS old with no hook or telemetry turn since it landed, is
 * nudged whatever its terminal prints, and again after each cooldown even for
 * mail already announced. The rule is off while the agent's hooks show an open
 * turn (up to WORKER_WAKE_OPEN_TURN_MS). Every other hold still applies, and the beat logs
 * why a worker with old mail is held (explain).
 *
 * Deliberately the renderer's own nudge text, delivered through the same
 * submitter as the renderer's queue (main/ptySubmit.ts, autosend 0.5.5).
 *
 * No electron import — unit-testable (mirrors ControlRegistry).
 */

import { OpenQuestionTracker } from '../shared/openQuestion';
import { TURN_EVENTS } from './hookProof';

/** The exact nudge the renderer's inbox-wake loop would have typed. */
export const WORKER_WAKE_NUDGE =
  'You have new hive inbox message(s) — read your inbox, act on them now, and move handled ones to inbox/.done/. Act autonomously; only message god if you genuinely need a decision.';

/** No PTY output for this long = genuinely idle (renderer QUIESCE_IDLE_MS). */
export const WORKER_WAKE_IDLE_MS = 12_000;
/** Never nudge inside the boot sequence (renderer BOOT_GRACE_MS). */
export const WORKER_WAKE_BOOT_GRACE_MS = 35_000;
/** Minimum gap between two watchdog nudges of the same worker. */
export const WORKER_WAKE_COOLDOWN_MS = 60_000;
/** A permission/HITL notification blocks nudges for this long after it fires. */
export const WORKER_WAKE_HITL_REARM_MS = 5 * 60_000;
/** Mail this old with NO session activity since it landed = a STALLED worker:
 *  its CLI never took the first turn (a boot time nudge lost while the TUI was
 *  still drawing, an occluded renderer that never typed one). PTY output cannot
 *  vouch for such a worker: a TUI redraws its chrome without doing any work,
 *  and the boot sequence itself is output. So past this age the quiet output
 *  and never output rules are bypassed, and so is the announced ids edge
 *  trigger (it is for a worker that HEARD the announcement; a stalled one did
 *  not), still subject to paused, halted, hold, HITL, open question, boot
 *  grace and cooldown. Observed live 2026-09-06: a worker sat 17 minutes on
 *  its work order with 0 tokens until the human typed "read your inbox".
 *
 *  "Session activity" is a tool span or a usage sample with tokens (telemetry,
 *  which only Claude Code exports) OR a hook event that proves a turn
 *  (isTurnHook). The rule is OFF for an agent that has produced neither a
 *  telemetry sample nor a single hook event: with no channel that could ever
 *  show a turn, "no activity" is not evidence of anything. (#455) */
export const WORKER_WAKE_STALL_MS = 90_000;
/** How long an OPEN turn keeps the stall rule off. A turn is open when the
 *  agent's newest turn hook is not Stop or StopFailure: it is inside one long
 *  step (a 5 minute test run, a long file write, the model still writing), so
 *  "no turn hook since the mail landed" is not evidence that it ignored the
 *  mail, and the quiet output and mid turn rules decide. Past this age with no
 *  new hook the turn counts as wedged and the stall rule applies again. */
export const WORKER_WAKE_OPEN_TURN_MS = 15 * 60_000;
/** Minimum age of pending mail before a held worker is reported in the log. */
export const WORKER_WAKE_REPORT_MS = 60_000;

/** A hook event message that means "the agent needs the human" — permission /
 *  approve / confirm prompts (mirrors the renderer's needsHuman detection in
 *  useHive.ts). Anything matching the idle-waiting shape is NOT a HITL hold. */
export type HookClass = 'needsHuman' | 'idle' | null;

export function classifyHook(event: string | undefined, message: string | undefined): HookClass {
  if (event === 'Notification') {
    const msg = (message ?? '').toLowerCase();
    const idleWaiting = !msg
      || msg.includes('waiting for your input')
      || msg.includes('is idle')
      || msg.includes('waiting for input');
    const needsHuman = msg.includes('permission')
      || msg.includes('approve')
      || msg.includes('confirm')
      || msg.includes('needs your');
    if (needsHuman && !idleWaiting) return 'needsHuman';
    return 'idle';
  }
  return null;
}

/** A hook event that proves the CLI took a turn: the activity signal every
 *  engine the harness shims produces, unlike telemetry, which only Claude Code
 *  exports. SessionStart is the CLI coming up, not a turn: a worker whose boot
 *  nudge was lost has exactly that and nothing else. Notification is the CLI
 *  waiting. PreCompact and PostCompact are left out on purpose: Claude's
 *  background precomputed compaction fires them while the agent sits idle.
 *  Narrower than hookProof's TURN_EVENTS, which answers a different question
 *  (did the box empty / did the agent move on). */
export function isTurnHook(event: string | undefined): boolean {
  switch (event) {
    case 'UserPromptSubmit':
    case 'PreToolUse':
    case 'PostToolUse':
    case 'PostToolUseFailure':
    case 'Stop':
    case 'StopFailure':
    case 'SubagentStart':
    case 'SubagentStop':
      return true;
    default:
      return false;
  }
}

/** One worker's live facts, gathered by the caller each beat. */
export interface WorkerWakeFacts {
  /** Worker agent id (god is never a candidate). */
  agentId: string;
  /** True when this agent is the orchestrator — god is never nudged. */
  isGod?: boolean;
  /** Live PTY id, or undefined when the agent has no terminal. */
  ptyId?: string;
  /** Timestamp of the PTY's last output (0 = never output). */
  lastOutputAt: number;
  /** IDs of undrained inbox messages (empty → nothing to wake for). */
  inboxIds: readonly string[];
  /** ControlRegistry snapshot flags. */
  autoDeliveryPaused: boolean;
  paused: boolean;
  halted: boolean;
  /** The operator's "1:1 with the human" claim (registry onHold). Deliberately
   *  NOT a ControlRegistry flag — hold lives in the hive registry (setAgentHold
   *  never calls control.pause), so it has to ride the facts explicitly: the
   *  human's keyboard input into the PTY is invisible to lastOutputAt, so
   *  output quiescence cannot tell a finished turn from their half-composed
   *  line, and a nudge typed over it would fuse onto it. */
  onHold?: boolean;
  /** When telemetry last showed the CLI doing a turn (a tool span, or a usage
   *  sample WITH tokens: activityEvidenceAt), or 0/undefined when it never has. */
  lastActivityAt?: number;
  /** True when the telemetry collector holds ANY usage sample for the agent
   *  (even the zero token one stamped at session start): its CLI exports
   *  telemetry, so a missing turn there means something. */
  hasTelemetry?: boolean;
  /** created_at of the OLDEST undrained inbox message, or 0/undefined when
   *  unknown (the stall rule then stays off: fail closed). */
  oldestMailAt?: number;
}

/** Why a worker with pending mail is NOT being nudged right now. */
export type WorkerWakeHold =
  | 'god' | 'no-mail' | 'no-pty'
  | 'delivery-paused' | 'paused' | 'halted' | 'on-hold'
  | 'booting' | 'mid-turn' | 'boot-grace' | 'hitl' | 'question' | 'announced' | 'cooldown';

/** The inbox ids that count as mail: non empty strings only. */
function liveInboxIds(f: WorkerWakeFacts): Set<string> {
  return new Set(f.inboxIds.filter((id) => typeof id === 'string' && id.length > 0));
}

/** Mail has waited WORKER_WAKE_STALL_MS and the CLI has shown no session
 *  activity since it landed: whatever its terminal is printing, this worker is
 *  not working the mail. */
export function isStalledWorker(f: WorkerWakeFacts, now = Date.now()): boolean {
  const mailAt = f.oldestMailAt ?? 0;
  if (mailAt <= 0 || liveInboxIds(f).size === 0) return false;
  if (now - mailAt < WORKER_WAKE_STALL_MS) return false;
  return (f.lastActivityAt ?? 0) < mailAt;
}

/** The subset of telemetry the activity rule reads. Structural so the beat can
 *  hand it the collector's own types and tests can hand it literals. */
export interface ActivityEvidence {
  /** The agent's latest usage sample (cumulative counters, ts = last update). */
  usage?: { ts: number; input: number; output: number } | null;
  /** Tool spans the agent has run, in arrival order. */
  spans?: ReadonlyArray<{ ts: number }> | null;
}

/** When the CLI last demonstrably did a turn, or 0 when it never has.
 *  A usage sample only counts when it carries tokens: the collector stamps a
 *  sample at session start with every counter at zero, and a boot time sample
 *  is exactly what a worker that never took its first turn has. A tool span is
 *  always a turn. */
export function activityEvidenceAt(ev: ActivityEvidence): number {
  const u = ev.usage;
  const worked = u && (Number(u.input) || 0) + (Number(u.output) || 0) > 0 ? Number(u.ts) || 0 : 0;
  let span = 0;
  for (const s of ev.spans ?? []) if (s && Number(s.ts) > span) span = Number(s.ts);
  return Math.max(worked, span);
}

export class WorkerWakeWatchdog {
  /** ptyId → spawn timestamp (boot grace). */
  private spawnedAt = new Map<string, number>();
  /** agentId → last nudge timestamp (cooldown). */
  private lastNudgeAt = new Map<string, number>();
  /** agentId → inbox ids included in the last nudge. This turns the watchdog
   *  into an edge trigger: a worker is nudged again only when a new id appears. */
  private announcedInboxIds = new Map<string, Set<string>>();
  /** agentId → timestamp of the last needsHuman hook notification. */
  private lastHumanNeedsAt = new Map<string, number>();
  /** Agents with a multiple choice question open (0.5.3 bug 19). Unlike the
   *  HITL hold this one does not expire: a menu nobody has answered is still a
   *  menu an hour later, and the silence it sits in is not an idle prompt. */
  private questions = new OpenQuestionTracker();
  /** agentId → last turn event (TURN_EVENTS): the agent moved on (gate G5). */
  private lastTurnAt = new Map<string, number>();
  /** agentId → its last hook event of ANY kind: the agent's hooks are alive,
   *  so a missing turn hook means something (#455 stall rule). */
  private hookSeenAt = new Map<string, number>();
  /** agentId → its last hook event that proves a turn (isTurnHook). */
  private lastTurnHookAt = new Map<string, number>();
  /** agentId → the name of that event: Stop or StopFailure closes the turn. */
  private lastTurnHookEvent = new Map<string, string>();
  /** agentId → when its hold was last reported, so the beat logs a held
   *  worker once per cooldown instead of every beat. */
  private lastHoldReportAt = new Map<string, number>();

  /** Record a PTY spawn so its boot sequence is left alone. */
  noteSpawn(ptyId: string, at = Date.now()): void {
    this.spawnedAt.set(ptyId, at);
  }

  /** Feed hook events (from HookServer) so a HITL prompt blocks nudges. */
  noteHook(agentId: string | undefined, event: string | undefined, message: string | undefined, at = Date.now(), tool?: string): void {
    if (!agentId) return;
    this.questions.note(agentId, event, tool);
    this.hookSeenAt.set(agentId, at);
    if (isTurnHook(event) && at > (this.lastTurnHookAt.get(agentId) ?? 0)) {
      this.lastTurnHookAt.set(agentId, at);
      this.lastTurnHookEvent.set(agentId, event as string);
    }
    if (classifyHook(event, message) === 'needsHuman') this.lastHumanNeedsAt.set(agentId, at);
    else if (event && TURN_EVENTS.has(event)) this.lastTurnAt.set(agentId, at);
  }

  /** A menu or a person's decision owns this agent's input: a question is open,
   *  or a needs-human notification is newer than the agent's last turn event
   *  and less than WORKER_WAKE_HITL_REARM_MS old. The PTY submitter checks it
   *  before every typing and every press (autosend B5): a Return on an open
   *  menu selects an option. Unlike the nudge's own rule, the hold ends the
   *  moment the agent moves on (gate G5): a person who answers a permission
   *  prompt in ten seconds must not wait five minutes for the queue. */
  holdsInput(agentId: string, now = Date.now()): boolean {
    if (this.questions.isOpen(agentId)) return true;
    const lastHuman = this.lastHumanNeedsAt.get(agentId) ?? 0;
    if (lastHuman <= 0 || now - lastHuman >= WORKER_WAKE_HITL_REARM_MS) return false;
    return lastHuman > (this.lastTurnAt.get(agentId) ?? 0);
  }

  /** Blocked on the person, with no time limit: a question menu is open, or a
   *  needs human notification is newer than the agent's last turn event. holdsInput stops at five minutes because it
   *  guards typing; a prompt nobody answered for an hour is an hour waiting on you. */
  waitsOnPerson(agentId: string): boolean {
    if (this.questions.isOpen(agentId)) return true;
    const lastHuman = this.lastHumanNeedsAt.get(agentId) ?? 0;
    return lastHuman > 0 && lastHuman > (this.lastTurnAt.get(agentId) ?? 0);
  }

  /** When the agent's hooks last proved a turn, or 0 when they never have. */
  turnHookAt(agentId: string): number {
    return this.lastTurnHookAt.get(agentId) ?? 0;
  }

  /** The agent's hooks show a turn in progress: its newest turn hook is not
   *  Stop or StopFailure and is under WORKER_WAKE_OPEN_TURN_MS old. */
  openTurn(agentId: string, now = Date.now()): boolean {
    const at = this.lastTurnHookAt.get(agentId) ?? 0;
    if (at <= 0 || now - at >= WORKER_WAKE_OPEN_TURN_MS) return false;
    const event = this.lastTurnHookEvent.get(agentId);
    return event !== 'Stop' && event !== 'StopFailure';
  }

  /** The stall rule on everything known: the beat's telemetry evidence plus
   *  the hooks', and OFF for an agent that has produced neither a telemetry
   *  sample nor a single hook event (see WORKER_WAKE_STALL_MS), and while its
   *  hooks show an open turn (see WORKER_WAKE_OPEN_TURN_MS). */
  private isStalled(f: WorkerWakeFacts, now: number): boolean {
    const observable = !!f.hasTelemetry || this.hookSeenAt.has(f.agentId);
    if (!observable) return false;
    if (this.openTurn(f.agentId, now)) return false;
    const lastActivityAt = Math.max(f.lastActivityAt ?? 0, this.turnHookAt(f.agentId));
    return isStalledWorker({ ...f, lastActivityAt }, now);
  }

  /** Forget per-agent state (e.g. the agent's PTY was closed). */
  forget(agentId: string, ptyId?: string): void {
    this.lastNudgeAt.delete(agentId);
    this.announcedInboxIds.delete(agentId);
    this.lastHumanNeedsAt.delete(agentId);
    this.lastTurnAt.delete(agentId);
    this.hookSeenAt.delete(agentId);
    this.lastTurnHookAt.delete(agentId);
    this.lastTurnHookEvent.delete(agentId);
    this.lastHoldReportAt.delete(agentId);
    this.questions.forget(agentId);
    if (ptyId) this.spawnedAt.delete(ptyId);
  }

  /** Why this worker is held right now, or null when it should be nudged.
   *  The same checks decide() applies, in the same order, exposed so the beat
   *  can LOG why a worker with old pending mail is not being woken (#455).
   *  Pure: never touches the announcement or cooldown memory. */
  explain(f: WorkerWakeFacts, now = Date.now()): WorkerWakeHold | null {
    const inboxIds = liveInboxIds(f);
    if (inboxIds.size === 0) return 'no-mail';
    if (f.isGod) return 'god';
    if (!f.ptyId) return 'no-pty';
    if (f.autoDeliveryPaused) return 'delivery-paused';
    if (f.paused) return 'paused';
    if (f.halted) return 'halted';
    if (f.onHold) return 'on-hold'; // operator's 1:1: never type into their terminal
    // A stalled worker (old mail, no turn since) is nudged whatever its
    // terminal prints: output is not evidence of work (#455).
    const stalled = this.isStalled(f, now);
    if (f.lastOutputAt <= 0 && !stalled) return 'booting'; // never produced output
    if (now - f.lastOutputAt < WORKER_WAKE_IDLE_MS && !stalled) return 'mid-turn';
    const spawned = this.spawnedAt.get(f.ptyId) ?? 0;
    if (spawned > 0 && now - spawned < WORKER_WAKE_BOOT_GRACE_MS) return 'boot-grace';
    const lastHuman = this.lastHumanNeedsAt.get(f.agentId) ?? 0;
    if (lastHuman > 0 && now - lastHuman < WORKER_WAKE_HITL_REARM_MS) return 'hitl';
    if (this.questions.isOpen(f.agentId)) return 'question'; // Return would pick an option
    // Edge trigger: mail already announced is not announced again, unless the
    // worker is stalled, i.e. it demonstrably never acted on the announcement.
    const announced = this.announcedInboxIds.get(f.agentId);
    if (announced && !stalled && !Array.from(inboxIds).some((id) => !announced.has(id))) return 'announced';
    const lastNudge = this.lastNudgeAt.get(f.agentId) ?? 0;
    if (lastNudge > 0 && now - lastNudge < WORKER_WAKE_COOLDOWN_MS) return 'cooldown';
    return null;
  }

  /** The worker ids that should be nudged right now, in stable registry order.
   *  Pure decision — the caller types the nudge. Remembers what it announced
   *  (the edge trigger) and when (the cooldown). */
  decide(facts: readonly WorkerWakeFacts[], now = Date.now()): string[] {
    const out: string[] = [];
    for (const f of facts) {
      const inboxIds = liveInboxIds(f);
      if (inboxIds.size === 0) {
        // A fully drained inbox starts a fresh announcement cycle and bounds the
        // remembered set even for a worker that lives for months.
        this.announcedInboxIds.delete(f.agentId);
        continue;
      }
      if (this.explain(f, now) !== null) continue;
      this.lastNudgeAt.set(f.agentId, now);
      this.announcedInboxIds.set(f.agentId, inboxIds);
      out.push(f.agentId);
    }
    return out;
  }

  /** The nudge decide() chose was not typed: the key alone was pressed on an
   *  older wake still in the input box. A wake carries its own mail (0.5.6), so
   *  what was announced here was not in it. Forget the announcement, and a
   *  later beat announces the mail that wake did not carry. */
  unannounce(agentId: string): void {
    this.announcedInboxIds.delete(agentId);
  }

  /** True once per WORKER_WAKE_COOLDOWN_MS per worker: the beat's log gate. */
  shouldReportHold(agentId: string, now = Date.now()): boolean {
    const last = this.lastHoldReportAt.get(agentId) ?? 0;
    if (last > 0 && now - last < WORKER_WAKE_COOLDOWN_MS) return false;
    this.lastHoldReportAt.set(agentId, now);
    return true;
  }

  /** Last time this worker was nudged (0 = never) — useful for diagnostics. */
  lastNudge(agentId: string): number {
    return this.lastNudgeAt.get(agentId) ?? 0;
  }
}

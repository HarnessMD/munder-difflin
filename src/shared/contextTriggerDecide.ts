import { inferAgentProvider } from './agentProvider';
import { LARGE_CONTEXT_WINDOW, atOrOverBar, compactsAtTurnEnd, windowTokens } from './contextBar';
import { clearCommandForProvider, compactionCommandForProvider } from './providerAutomation';
import type { ContextRule } from './triggers';

/**
 * WHICH AGENTS GET THE COMPACT OR CLEAR COMMAND when a context rule fires.
 *
 * The clock decides WHEN (src/core/contextTriggerTimer.ts); this decides WHO.
 * It lived in the renderer (useHive.ts) and was moved here unchanged. Pure:
 * everything it reads is handed in.
 *
 * The order of the rules: the turn end road (`only`), compact on ask (`asked`),
 * the hold while a switch of work clear waits (`holdCompact`), and Force
 * compact (`front`). The timer leaves an agent with a token count to its turn
 * end (shared/contextBar.ts).
 */

/**
 * May the drain type into this agent's terminal right now?
 *
 * The gate used to be `status === 'idle'`, full stop, and that stranded mail
 * indefinitely. `looping` is not a terminal state the agent recovers from on its
 * own — it is the circuit breaker's PIN, re-asserted on every beat for as long
 * as the agent is `constrained` or `stopped`. The PTY-quiescence fallback only
 * un-pins `working`, so a breaker-armed agent never returned to `idle` and its
 * queue never drained. Observed live: an agent over its token cap sat pinned
 * while a nudge enqueued two seconds after the message landed went undelivered
 * for minutes, until something outside the app woke it.
 *
 * That is self-defeating, because the breaker STEERS by mailing the agent it
 * armed ("stop, write a plan, send it to god"). Under the old gate the one
 * message meant to unwedge a wedged agent was exactly the message that could
 * never arrive.
 *
 * So a pinned agent is deliverable once its terminal has been silent for
 * `quiesceMs` — the same evidence the idle fallback already trusts to decide a
 * turn is over. The pin stays on the avatar and the badge; it just stops
 * doubling as a delivery lock.
 *
 * `compacting` gets the same admission, and for a stronger reason: PreCompact
 * sets it and only a PostCompact hook clears it — exactly the signal a CLI that
 * hangs or dies mid-compact never sends (a crash fires no hook, and the Stop
 * that would flip the agent idle may already have been consumed). The
 * quiescence sweep only rescues 'working', so a wedged 'compacting' agent could
 * never return to 'idle' on its own, and the drain being strictly head-of-line,
 * one stuck compact starved every later message in the queue — user replies,
 * god directives, even the inbox nudge whose whole job is to unstick the agent.
 * A terminal silent past `quiesceMs` is the same evidence the 'looping' case
 * already trusts: the compact is finished or dead, and either way the queue
 * must move. The badge stays; the delivery lock goes.
 *
 * Everything else still holds the prompt:
 *   - `working` / `thinking`: mid-turn. The quiescence fallback flips a genuinely
 *     finished turn to `idle`, and then the ordinary gate applies.
 *   - `waiting` / `blocked`: an interactive prompt is on screen. The drain ends
 *     every delivery with Enter, which would ANSWER it — the same reason the
 *     one-time TUI seed refuses to type at those two statuses.
 *
 * Fails CLOSED on an unknown `ptyQuietMs` (no reading, or a PTY that has never
 * emitted): silence we cannot measure is not evidence of silence.
 *
 * `questionOpen` (0.5.3 bug 19) overrides every status, `idle` included. A
 * multiple choice menu waiting for a person is silent, and silence is what
 * lands an agent on `idle`: the quiescence fallback does it after twelve
 * seconds and the idle Notification does it after a minute. The status cannot
 * be trusted to say a menu is up, so the tool call that opened it is asked
 * directly (shared/openQuestion.ts).
 */
export function canDeliverToAgent(
  status: string,
  ptyQuietMs: number | null,
  quiesceMs: number,
  questionOpen = false,
  exited = false
): boolean {
  if (questionOpen) return false;
  // The process ended on its own. The exit handler puts the agent on
  // 'idle' (nothing is running, so nothing is mid-turn), and 'idle' is exactly
  // what lets the drain type — so a queued message was typed into a dead
  // terminal two seconds after the agent-exit row, and the delivery mark then
  // left the card reading "Working" for good with no process to take it off.
  // A terminal whose process is gone is not an idle prompt; it is a corpse.
  // `exit` is cleared by every way back (restart, revive, reopen, restore team,
  // and the next hook event an agent that is alive again sends), so this never
  // holds a queue that has somewhere to go.
  if (exited) return false;
  if (status === 'idle' || status === 'sleeping') return true;
  // 'looping' (breaker pin) and 'compacting' (PreCompact, no PostCompact yet —
  // see the comment above for why that state is un-recoverable on its own) both
  // release the prompt once the terminal is measurably quiet.
  if (status !== 'looping' && status !== 'compacting') return false;
  return ptyQuietMs !== null && ptyQuietMs >= quiesceMs;
}

/** What the deciding reads of an agent. The renderer's `Agent` fits. */
export interface ContextTriggerAgent {
  id: string;
  ptyId?: string;
  status: string;
  sleeping?: boolean;
  command?: string;
  provider?: unknown;
  model?: string;
  contextTokens?: number;
  contextLimit?: number;
}

/** At/above this window size an agent counts as "large context". One copy, in shared/contextBar.ts. */
export { LARGE_CONTEXT_WINDOW };

/**
 * How full this agent's context window is, 0-100, or null when we have no
 * reading at all.
 *
 * Two sources feed the store and only one is exact: the status-line shim pushes
 * real `contextTokens` + `contextLimit` (effect 2d), while the transcript poll
 * (2c) backfills tokens ONLY. So an agent can legitimately know its token count
 * without knowing its window — infer the window the same way 2c does rather
 * than throwing the token reading away.
 */
export function contextFillPct(a: ContextTriggerAgent): number | null {
  if (a.contextTokens === undefined || !Number.isFinite(a.contextTokens)) return null;
  return (a.contextTokens / windowTokens(a)) * 100;
}

/**
 * The context-pressure gate: is this agent full enough to be worth interrupting?
 *
 * `minContextPct` of 0 disables the gate (the rule's cadence alone fires it).
 *
 * FAIL-OPEN when we have no reading. That is the deliberate choice: context
 * telemetry arrives over the Claude status-line/hook path, so most non-Claude
 * providers report nothing at all. Failing closed there would silently reinstate
 * the very bug this replaces — a fleet that never compacts — only harder to
 * notice. An unmetered agent therefore falls back to time-only firing, which is
 * exactly the old behaviour and no worse.
 */
export function passesContextPressure(a: ContextTriggerAgent, rule: ContextRule): boolean {
  const large = (a.contextLimit ?? 0) >= LARGE_CONTEXT_WINDOW;
  const bar = large ? rule.minContextPctLargeWindow : rule.minContextPct;
  if (!(bar > 0)) return true;
  const pct = contextFillPct(a);
  if (pct === null) return true;
  return pct >= bar;
}


export interface ContextTriggerInput {
  action: 'compact' | 'clear';
  rule: ContextRule;
  agents: readonly ContextTriggerAgent[];
  /** How long this terminal has been silent, or null when that is not known. */
  quietMs: (ptyId: string) => number | null;
  /** The silence after which a looping or compacting agent may be typed to. */
  quiesceMs: number;
  /** A multiple choice question is open on this agent. */
  questionOpen: (agentId: string) => boolean;
  /** The texts already queued for this agent, in order. */
  queued: (agentId: string) => readonly string[];
  /** The context count at the last compact DELIVERED to each agent. */
  lastCompactUsed: Readonly<Record<string, number | undefined>>;
  /** The one agent whose turn just ended. Absent, this is the timer and every
   *  agent is looked at. */
  only?: string;
  /** An agent asked for this compact (compact-requests/), so the bar
   *  is the asker's, not checked here. */
  asked?: boolean;
  /** No compact for this agent now. The window passes its switch of work
   *  clear that is still queued (switchClearPending). */
  holdCompact?: (agentId: string) => boolean;
  /** A compact was typed into this agent and has not ended: one need, one /compact. The window passes
   *  compactAwaited: from the compact's delivery until its PostCompact, a new session, or COMPACT_AWAIT_MAX_MS. */
  compactPending?: (agentId: string) => boolean;
}

/**
 * ONE NEED, ONE COMPACT. The turn end road queued a second /compact 28 s after the first
 * (log.jsonl 22:55:50 and 22:56:18 IST): the first had not finished, a turn ended meanwhile, and its count had moved,
 * so the latch let it through. After a compact goes in, no other is queued for the agent until the CLI says it ended
 * (PostCompact, or the new session a compact starts), or this long has passed: one the person stopped with Escape
 * sends neither.
 */
export const COMPACT_AWAIT_MAX_MS = 30 * 60_000;

/** A compact delivered at `typedAt` (or none) still stands for the agent's need at `now`. */
export function compactAwaited(typedAt: number | undefined, now: number): boolean {
  return typeof typedAt === 'number' && typedAt > 0 && now - typedAt < COMPACT_AWAIT_MAX_MS;
}

/** A token count that lands this long after a turn end still counts for that
 *  turn end (0.5.6): it can come a moment after the Stop hook. */
export const TURN_END_READING_MS = 10_000;
/** Force compact (0.5.8): a compact that has waited this long behind a busy
 *  turn stops the turn with Escape. */
export const FORCE_COMPACT_AFTER_MS = 60_000;
/** The engines whose turn Escape stops cleanly. */
export const FORCE_COMPACT_PROVIDERS: readonly string[] = ['claude'];
/** Told to the agent once the compact that stopped its turn is in. */
export const FORCE_COMPACT_CARRY_ON = 'The app stopped your last turn to compact your context (Force compact is on). Carry on with the work you were doing.';

/** One command to queue. `compactUsed`: the count to latch when it is delivered.
 *  `front`: Force compact, so it goes ahead of everything waiting. */
export interface ContextTriggerSend { agentId: string; command: string; compactUsed?: number; front?: boolean }

export function decideContextTrigger(input: ContextTriggerInput): ContextTriggerSend[] {
  const { action, rule, agents, only, asked = false } = input;
  const out: ContextTriggerSend[] = [];
      for (const a of agents) {
        if (!a.ptyId) continue;
        // Housekeeping is never demand for a session. Sleeping agents retain
        // their terminal id, and the message delivery gate below intentionally
        // allows real mail to wake them. Skip this fire; after a real wake the
        // next timer/turn end can maintain their context as usual.
        if (a.sleeping || a.status === 'sleeping') continue;
        if (only !== undefined && a.id !== only) continue;
        // No compact while the clear on a switch of work is queued for it.
        if (action === 'compact' && input.holdCompact?.(a.id)) continue;
        // One need, one compact: the last one has not ended.
        if (action === 'compact' && input.compactPending?.(a.id)) continue;
        // The timer leaves an agent with a token count to its turn end.
        if (only === undefined && action === 'compact' && compactsAtTurnEnd(a, rule)) continue;
        // Gate #109-2: don't enqueue a context command for an agent that cannot
        // currently receive one (e.g. god 'blocked' on a human prompt). Enqueuing
        // anyway left a stuck /compact at the head of the queue that dedupe then
        // collapsed every subsequent hourly attempt against, forever — the exact
        // same check the drain itself uses immediately before typing, so a
        // command is never queued in a state the drain would refuse to deliver.
        if (!canDeliverToAgent(a.status, input.quietMs(a.ptyId), input.quiesceMs, input.questionOpen(a.id))) continue;
        const provider = inferAgentProvider(a.command, a.provider);
        const command = action === 'clear'
          ? clearCommandForProvider(provider, rule.message)
          : compactionCommandForProvider(provider, rule.message);
        // No trustworthy command for this CLI (Crush's palette-only TUI, Copilot's
        // print mode, an unknown custom binary) — leave its terminal alone.
        if (!command) continue;
        // At a turn end the bar is in tokens, and there is a count to hold
        // against it. On the timer it is the old percent gate, which lets an
        // agent with no count through.
        if (!asked && (only !== undefined ? !atOrOverBar(a, rule) : !passesContextPressure(a, rule))) continue;
        const verb = command.trimStart().split(/\s+/)[0];
        const queued = input.queued(a.id);
        if (queued.some((text) => text.trimStart().startsWith(verb))) continue;
        // The latch, compact only. `used` reaches this gate from Claude's status
        // line, which only reports after an API call. A /compact on an agent that
        // has done nothing since the last one makes no call at all — Claude refuses
        // it locally with "Not enough messages to compact" — so the count stays
        // byte-identical and the pressure gate passes on the same number the next
        // cycle, and the next. Seen in the wild: /compact every hour for 15 straight
        // hours at exactly 400958 tokens, then 11 more at exactly 221772, each a
        // no-op the agent still had to read and answer. Higher thresholds make it
        // rarer, not absent: any agent parked above its bar repeats forever.
        //
        // So remember the count at the last compact queued and skip while it is
        // byte-identical. Deliberately equality and not "hasn't grown": the rule's
        // thresholds own that decision, and an agent still above them deserves its
        // /compact whether the count moved up or down. A frozen count is the one
        // state those thresholds cannot reason about, because nothing they could do
        // would ever change it. /clear needs no equivalent — the queue drain zeroes
        // the store reading when it lands.
               const used = a.contextTokens ?? 0;
        if (action === 'compact' && input.lastCompactUsed[a.id] === used) continue;
        // The latch is written at successful DELIVERY (see the flush() dispatch
        // callback below), not here. Writing it at enqueue time recorded
        // "already compacted at N tokens" for a compaction that might never
        // actually happen — e.g. blocked by the gate just above, or a failed
        // send — silently latching out every future attempt at that count.
        // compactUsed rides on the queued message so the delivery site knows
        // which count to latch.
        // Force compact puts it ahead of everything waiting (forceCompactDue).
        out.push(action === 'compact'
          ? { agentId: a.id, command, compactUsed: used, ...(rule.force === true ? { front: true } : {}) }
          : { agentId: a.id, command });
      }
  return out;
}

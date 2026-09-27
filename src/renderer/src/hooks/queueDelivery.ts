/** Run one queued delivery and acknowledge it only after the sender resolves.
 * Rejections deliberately leave the queue item untouched for the next retry. */
export async function deliverWithAcknowledgement(
  send: () => Promise<void>,
  acknowledge: () => void
): Promise<boolean> {
  try {
    await send();
    acknowledge();
    return true;
  } catch {
    return false;
  }
}

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
  questionOpen = false
): boolean {
  if (questionOpen) return false;
  if (status === 'idle') return true;
  if (status !== 'looping') return false;
  return ptyQuietMs !== null && ptyQuietMs >= quiesceMs;
}

/**
 * What the agent's status becomes the moment a message has been typed into its
 * terminal and Return pressed (0.5.3 bug 7).
 *
 * Only two things ever set `working`: a hook event from the agent's own CLI, and
 * the terminal parser, which runs only while that agent's terminal is open. The
 * app typing a task into an agent is a third fact, and the app is the one party
 * that knows it for certain. Without this an engine with no hook bridge (kimi,
 * cursor, copilot, custom) never read as working unless someone was looking at
 * its terminal, so the orchestrator could hand it a task, the card could read
 * "doing", and the row stayed grey with the header counting one agent active.
 *
 * Safe for every engine because the quiescence fallback takes `working` back
 * after the terminal has been silent, hooks or no hooks.
 *
 * Null means leave the status alone:
 *  - a slash command starts no turn (/clear, /model, /context), and /compact
 *    reports itself through PreCompact;
 *  - a breaker pinned agent stays `looping`, the pin outranks everything.
 */
export function statusAfterDelivery(
  text: string,
  breakerArmed: boolean
): { status: 'working'; action: string } | null {
  const typed = text.trim();
  if (!typed || typed.startsWith('/') || breakerArmed) return null;
  return { status: 'working', action: 'reading a new message' };
}

/** The subset of a QueuedMessage this module needs. Kept structural so the
 *  gate is testable without dragging the store (and zustand) into the test. */
export interface DeliveryGateMessage {
  precondition?: 'inbox-nonempty';
}

export type PreconditionVerdict = 'send' | 'drop';

/** Re-check a queued message's delivery-time precondition, immediately before it
 *  is typed into a PTY.
 *
 *  A queue item is decided at enqueue time and delivered an arbitrary interval
 *  later, so some messages describe a world that may no longer exist by the time
 *  their turn comes. The inbox-wake nudge is the motivating case: an agent that
 *  is already awake routinely drains its whole inbox during the same turn the
 *  nudge was queued from, and delivering it afterwards spends a full turn
 *  discovering there is nothing to read.
 *
 *  Returns 'drop', never 'defer': a stale message left at the head of the queue
 *  would block every message behind it forever.
 *
 *  Fails OPEN. If the inbox cannot be read we send, because a spurious nudge
 *  costs one turn whereas a swallowed one can leave real mail unread
 *  indefinitely. */
export async function checkPrecondition(
  message: DeliveryGateMessage,
  readInbox: () => Promise<{ id?: string }[]>
): Promise<PreconditionVerdict> {
  if (message.precondition !== 'inbox-nonempty') return 'send';
  try {
    return (await readInbox()).length > 0 ? 'send' : 'drop';
  } catch {
    return 'send';
  }
}

/**
 * SEND NOW GOES STRAIGHT IN (founder, 25 Sep 2026): "Send now" on a queued
 * message types it into the agent's own CLI at once and submits it, even
 * mid-turn, so the CLI's own queue holds it. It jumps every other app-queued
 * message and leaves the app queue once the CLI has it.
 *
 * Only CLIs known to take input typed mid-turn: Claude Code queues a message
 * submitted while it works and runs it after the turn. Every other engine is
 * unverified, so it keeps the old rule (front of the queue, typed once idle).
 *
 * A question on screen still holds it, as does `waiting` / `blocked`: the
 * Return that submits would ANSWER the prompt, the same reason the ordinary
 * gate refuses those (canDeliverToAgent above).
 */
export const MID_TURN_INPUT_PROVIDERS: readonly string[] = ['claude'];

export function takesInputMidTurn(provider: string): boolean {
  return MID_TURN_INPUT_PROVIDERS.includes(provider);
}

export function canSendNowMidTurn(status: string, provider: string, questionOpen = false): boolean {
  if (questionOpen || !takesInputMidTurn(provider)) return false;
  return status === 'idle' || status === 'working' || status === 'thinking' || status === 'looping';
}

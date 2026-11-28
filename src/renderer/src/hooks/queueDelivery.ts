/** Run one queued delivery and acknowledge it only after the sender resolves.
 * Rejections deliberately leave the queue item untouched for the next retry.
 * A sender that resolves with an outcome (autosend, 0.5.5) is acknowledged only
 * on `submitted` or `unconfirmed`:
 *  - `held`: nothing was typed (a person was typing there); no failure either;
 *  - `behind`: held too, because an earlier send of ours still sits in the box (R7);
 *  - `stuck`: the text is still in the agent's input box. The message stays at
 *    the head, marked, and the queue holds behind it: typing the next one onto
 *    it would send the two fused;
 *  - `gone`: a press only pass found the process that held the text exited or
 *    replaced (gate G4). Its box is gone: clear the mark and type it again;
 *  - `moved`: typed and pressed, and the agent moved with no prompt taken
 *    (trigger-prompt-058). The Enter may have answered something on its screen,
 *    or the prompt's hook was lost: never typed again by itself, the row asks. */
export async function deliverWithAcknowledgement(
  send: () => Promise<unknown>,
  acknowledge: (proved: boolean) => void
): Promise<boolean | 'held' | 'behind' | 'stuck' | 'gone' | 'moved'> {
  try {
    const result = await send();
    const outcome = (result as { outcome?: unknown } | undefined)?.outcome;
    if (outcome === 'held' && (result as { behind?: unknown }).behind === true) return 'behind';
    if (outcome === 'unconfirmed' && (result as { moved?: unknown }).moved === true) return 'moved';
    if (outcome === 'held' || outcome === 'stuck' || outcome === 'gone') return outcome;
    acknowledge(provedByAgent(result));
    return true;
  } catch {
    return false;
  }
}

/**
 * DELIVERED OR ONLY SENT. A send that goes on down the queue is not
 * always known to have arrived: `unconfirmed`, and a box seen empty on the
 * screen, say only that it left. Delivered is what the agent's own CLI reported
 * through a hook, so an engine with no hook says no more than sent until it
 * answers (sendsAnswered in shared/inboxThread.ts).
 */
export function provedByAgent(result: unknown): boolean {
  const proof = (result as { proof?: unknown } | undefined)?.proof;
  return proof === 'hook' || proof === 'activity';
}

/** Automatic press-only passes on a stuck head before the person decides (A7). */
export const STUCK_MAX_AUTO_PRESSES = 3;

/** What the drain does with a head marked stuck: press the key alone (never
 *  retype the text), or wait. A person's "Press Return" presses once more
 *  whatever the count; otherwise at most three automatic passes, each after the
 *  normal cooldown. */
export function stuckHeadAction(
  stuck: { presses: number; pressNow?: boolean },
  sinceLastTryMs: number,
  cooldownMs: number
): 'press' | 'wait' {
  if (stuck.pressNow) return 'press';
  if (stuck.presses >= STUCK_MAX_AUTO_PRESSES) return 'wait';
  return sinceLastTryMs >= cooldownMs ? 'press' : 'wait';
}

// `canDeliverToAgent` lives in src/shared/contextTriggerDecide.ts. Re-exported
// so every caller here reads it where it always did.
export { canDeliverToAgent } from '@shared/contextTriggerDecide';

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
  breakerArmed: boolean,
  exited = false
): { status: 'working'; action: string } | null {
  const typed = text.trim();
  // Nothing is reading it — the process has ended. A card whose
  // process exited must not read "Working": no hook will ever take it off, and
  // the row then lies for as long as the agent is left alone. The drain's own
  // gate (canDeliverToAgent) refuses an exited agent, so this is the second
  // lock on the same door.
  if (!typed || typed.startsWith('/') || breakerArmed || exited) return null;
  return { status: 'working', action: 'reading a new message' };
}

/**
 * What a breaker pinned agent's status becomes the moment the breaker lets go
 * (0.5.6).
 *
 * The pin sets `looping`, and until now only the agent's next hook event took
 * it off. An agent that stopped because the breaker told it to sends no hook
 * event, so it read "looping" for as long as it stayed quiet, long after the
 * breaker itself was back to healthy.
 *
 * `working` and not `idle`: the app does not know which it is, and `idle` is
 * what lets the drain type. A silent terminal is taken to `idle` by the
 * quiescence sweep, the same evidence a finished turn is judged on, and a busy
 * one is corrected by its next hook event.
 *
 * Null means the agent was not pinned and nothing changes.
 */
export function statusWhenBreakerClears(status: string, exited = false): { status: 'working'; action: string } | null {
  // Not for an agent whose process is gone — see statusAfterDelivery.
  return status === 'looping' && !exited ? { status: 'working', action: 'breaker cleared' } : null;
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
 * untested, so it keeps the old rule (front of the queue, typed once idle).
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

/**
 * FORCE COMPACT (19 Oct 2026, the founder): "if it does not get executed in
 * next one minute after getting added it should automatically push it
 * through". A compact typed while an agent works waits for the whole turn,
 * Send now included: Claude Code holds a typed `/compact` until its turn ends.
 * The one way through is to stop the turn. So, with the compact rule's Force
 * compact on, a compact the app queued that has waited FORCE_COMPACT_AFTER_MS
 * at the head of a busy Claude agent's queue gets ONE Escape. The turn stops,
 * the terminal goes quiet, the agent reads as idle (the quiescence fallback),
 * the drain types the compact, and FORCE_COMPACT_CARRY_ON goes in after it.
 *
 * Never on a question or a permission prompt (`waiting`, `blocked`, an open
 * question: Escape would answer it), never on a head the person is editing or
 * one already typed into the box, never twice for one message, and only on
 * Claude, the one engine this was read for. The caller also holds it for a
 * person's draft or menu in the terminal, a paused agent and a paused floor.
 */
export const FORCE_COMPACT_AFTER_MS = 60_000;
export const FORCE_COMPACT_PROVIDERS: readonly string[] = ['claude'];
export const FORCE_COMPACT_CARRY_ON = 'The app stopped your last turn to compact your context (Force compact is on). Carry on with the work you were doing.';

export function forceCompactDue(o: {
  force: boolean;
  head: { ts: number; compactUsed?: number; editing?: boolean; stuck?: unknown } | undefined;
  /** The head is a compact command. */
  isCompact: boolean;
  status: string;
  provider: string;
  questionOpen: boolean;
  /** Escape was already pressed for this head. */
  pressed: boolean;
  now: number;
}): boolean {
  const h = o.head;
  if (!o.force || !h || o.pressed || !o.isCompact || h.compactUsed === undefined) return false;
  if (h.editing || h.stuck || o.questionOpen || !FORCE_COMPACT_PROVIDERS.includes(o.provider)) return false;
  if (o.status !== 'working' && o.status !== 'thinking') return false;
  return o.now - h.ts >= FORCE_COMPACT_AFTER_MS;
}

/** Where in `seen` the prompt is that proves a send typed at `since`, or -1. A prompt from before the send
 *  proves nothing: the same words sent twice have the same tail. */
export function promptSeenSince(
  seen: ReadonlyArray<{ tail: string; at: number }>,
  ourTail: string,
  since: number,
  matches: (hookTail: string, ourTail: string) => boolean
): number {
  return seen.findIndex((p) => p.at >= since && matches(p.tail, ourTail));
}

/** The stuck heads a late UserPromptSubmit proves sent (autosend, 0.5.5): the
 *  queue head was typed into `fromAgent`, before `now`, and the prompt's tail
 *  matches what was typed. Tail alone is not enough (G3): the same text sent to
 *  two agents has the same tail. */
export function stuckHeadsReleasedBy(
  queues: Record<string, ReadonlyArray<{ id: string; stuck?: { agentId: string; typedAt: number; tail: string } }>>,
  fromAgent: string | undefined,
  tail: string,
  now: number,
  matches: (hookTail: string, ourTail: string) => boolean
): Array<{ queueId: string; messageId: string }> {
  if (!fromAgent) return [];
  const out: Array<{ queueId: string; messageId: string }> = [];
  for (const [queueId, q] of Object.entries(queues)) {
    const stuck = q[0]?.stuck;
    if (!stuck || stuck.agentId !== fromAgent || now < stuck.typedAt) continue;
    if (matches(tail, stuck.tail)) out.push({ queueId, messageId: q[0].id });
  }
  return out;
}

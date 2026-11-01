/**
 * Nudge delivery — the actual text-then-Enter sequence typed into a worker's
 * PTY, with echo-aware timing and Enter-only retries (#WAKE-STUCK).
 *
 * The prior sequence (still used by submitToPty in useHive.ts for everything
 * that ISN'T an inbox nudge) was: write the text, wait a FIXED 140ms, write
 * "\r", done — no check that either write actually reached the TUI's input
 * line. Observed live: the nudge text lands but the Enter keystroke is
 * swallowed (a slow/occluded TUI, a redraw mid-keystroke, a provider that was
 * still painting its prompt), the text sits unsubmitted in the input box, and
 * the NEXT beat — seeing new mail, or simply off cooldown — writes ANOTHER
 * full nudge on top of it. The agent's input box ends up with the nudge text
 * duplicated, never submitted, and the agent itself never acts on any of it.
 *
 * Fix, in two parts:
 *  1. Wait for the PTY to ECHO the typed text (new output since the write)
 *     before sending Enter, instead of a fixed guess — bounded between
 *     NUDGE_ECHO_WAIT_MIN_MS and NUDGE_ECHO_WAIT_MAX_MS so neither a very slow
 *     nor a very fast terminal is mistimed.
 *  2. After Enter, confirm the PTY actually reacted (new output again — a
 *     TUI accepting Enter always redraws SOMETHING: the input line clearing,
 *     the next prompt, a tool call starting). No reaction within
 *     NUDGE_ENTER_CONFIRM_MS means the Enter was swallowed: resend ONLY the
 *     Enter keystroke (never the text — the text is still sitting there) with
 *     backoff, up to NUDGE_ENTER_MAX_RETRIES times, then give up and say so.
 *
 * This is a heuristic, not true terminal-buffer inspection: the main process
 * has no headless xterm instance reading the PTY's rendered screen (xterm.js
 * only runs in the renderer), so "the prompt line still holds the text" is
 * read through the one signal the main process actually has — whether the
 * PTY produced ANY new output — rather than literally re-parsing the line.
 * It is strictly better than the fixed-delay, no-feedback sequence it
 * replaces, and every phase is logged so a real miss is visible after the
 * fact instead of silently inferred as "probably fine".
 *
 * No electron import — unit-testable with fake deps (mirrors workerWake.ts).
 */

/** Minimum time to wait before sending Enter, even if an echo is seen sooner —
 *  some TUIs redraw the input line in more than one paint. */
export const NUDGE_ECHO_WAIT_MIN_MS = 400;
/** Maximum time to wait for an echo before sending Enter regardless. */
export const NUDGE_ECHO_WAIT_MAX_MS = 600;
/** Poll granularity while waiting for an echo or a post-Enter reaction. */
export const NUDGE_POLL_MS = 50;
/** How long to wait, after sending Enter, for the PTY to react before treating
 *  it as swallowed. */
export const NUDGE_ENTER_CONFIRM_MS = 500;
/** Backoff before each Enter-only retry (index 0 = before the 1st retry). */
export const NUDGE_ENTER_RETRY_BACKOFF_MS = [300, 600, 1200] as const;
/** How many times to resend a bare Enter before giving up. */
export const NUDGE_ENTER_MAX_RETRIES = NUDGE_ENTER_RETRY_BACKOFF_MS.length;

export type NudgeDeliveryResult =
  | 'confirmed'      // the PTY reacted to Enter — delivery is done
  | 'stuck'          // Enter never got a reaction, even after every retry
  | 'write-failed';  // the PTY itself rejected a write (e.g. already dead)

/** One line of the delivery's own account of what it did, in order. Logged via
 *  deps.log as it happens (not batched), so a crash mid-delivery still leaves a
 *  trail. */
export type NudgeDeliveryPhase =
  | 'typed' | 'typed-failed'
  | 'enter-sent' | 'enter-failed'
  | 'confirmed'
  | 'stuck' | 'enter-retry' | 'gave-up';

export interface NudgeDeliveryDeps {
  /** Synchronous PTY write — mirrors PtyManager.write's own signature. */
  write: (ptyId: string, data: string) => { ok: boolean; error?: string };
  /** Epoch ms of the PTY's most recent output, or 0 if it has never produced
   *  any (mirrors PtyManager.lastOutputAt, with undefined coerced to 0). */
  lastOutputAt: (ptyId: string) => number;
  /** One structured log line per phase — the caller's hive.appendLog (writes
   *  to the durable, append-only log.jsonl) or an equivalent sink. Must never
   *  throw; a throwing logger would abort delivery mid-sequence. */
  log: (event: { kind: 'worker-nudge'; phase: NudgeDeliveryPhase; agentId: string; ptyId: string; attempt?: number; error?: string }) => void;
  /** Overridable for tests; defaults to a real timer-based sleep. */
  sleep?: (ms: number) => Promise<void>;
}

function realSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll lastOutputAt until it advances past `baseline`, or `maxWaitMs` of
 *  (injected) sleep has elapsed. Returns true iff new output was seen.
 *
 *  Deliberately tracks elapsed time as "ms handed to `sleep`" rather than
 *  reading the wall clock directly: the wall clock is what a test's fake
 *  `sleep` exists to replace, and a real-time deadline here would make this
 *  function un-fast-forwardable (and, on a genuinely busy event loop, could
 *  under-poll if the loop falls behind Date.now()). */
async function waitForOutputSince(
  ptyId: string,
  baseline: number,
  maxWaitMs: number,
  deps: NudgeDeliveryDeps,
  sleep: (ms: number) => Promise<void>
): Promise<boolean> {
  let waited = 0;
  for (;;) {
    if (deps.lastOutputAt(ptyId) > baseline) return true;
    if (waited >= maxWaitMs) return false;
    const step = Math.min(NUDGE_POLL_MS, maxWaitMs - waited);
    await sleep(step);
    waited += step;
  }
}

/**
 * Type `text` into `ptyId`, then Enter, confirming each step against the PTY's
 * own output rather than a fixed delay. Never retypes `text` — a swallowed
 * Enter is retried as Enter alone, up to NUDGE_ENTER_MAX_RETRIES times.
 */
export async function deliverNudge(
  ptyId: string,
  agentId: string,
  text: string,
  deps: NudgeDeliveryDeps
): Promise<NudgeDeliveryResult> {
  const sleep = deps.sleep ?? realSleep;
  const log = (phase: NudgeDeliveryPhase, extra?: { attempt?: number; error?: string }): void => {
    try { deps.log({ kind: 'worker-nudge', phase, agentId, ptyId, ...extra }); } catch { /* logging must never break delivery */ }
  };

  const beforeText = deps.lastOutputAt(ptyId);
  const wroteText = deps.write(ptyId, text);
  if (!wroteText.ok) {
    log('typed-failed', { error: wroteText.error });
    return 'write-failed';
  }
  log('typed');

  // Wait for the echo: never less than the minimum (some TUIs paint the input
  // line in more than one pass), never more than the maximum.
  await sleep(NUDGE_ECHO_WAIT_MIN_MS);
  await waitForOutputSince(ptyId, beforeText, NUDGE_ECHO_WAIT_MAX_MS - NUDGE_ECHO_WAIT_MIN_MS, deps, sleep);

  const beforeEnter = deps.lastOutputAt(ptyId);
  const wroteEnter = deps.write(ptyId, '\r');
  if (!wroteEnter.ok) {
    log('enter-failed', { error: wroteEnter.error });
    return 'write-failed';
  }
  log('enter-sent');

  for (let attempt = 0; ; attempt++) {
    const reacted = await waitForOutputSince(ptyId, beforeEnter, NUDGE_ENTER_CONFIRM_MS, deps, sleep);
    if (reacted) {
      log('confirmed', { attempt });
      return 'confirmed';
    }
    if (attempt >= NUDGE_ENTER_MAX_RETRIES) {
      log('gave-up', { attempt });
      return 'stuck';
    }
    log('stuck', { attempt });
    await sleep(NUDGE_ENTER_RETRY_BACKOFF_MS[attempt]);
    // Enter ONLY — never re-send `text`. The text written above is still
    // sitting in the input box; retyping it is exactly the duplication bug
    // this module exists to stop.
    const retried = deps.write(ptyId, '\r');
    if (!retried.ok) {
      log('enter-failed', { attempt: attempt + 1, error: retried.error });
      return 'write-failed';
    }
    log('enter-retry', { attempt: attempt + 1 });
  }
}

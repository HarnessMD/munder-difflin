/**
 * SLACK COMES BACK BY ITSELF AFTER A FAILED START (0.5.6).
 *
 * 13 Oct 2026: the app was opened before the network was up. Slack's start
 * asked Slack who the token belongs to, got `getaddrinfo ENOTFOUND slack.com`
 * five seconds later, stopped its poller and returned. Nothing tried again.
 * The switch still read on, no message came in and no reply went out until
 * someone switched Slack off and on by hand. Anyone who opens the app before
 * their network is up gets the same.
 *
 * So a failed start is now owed another try for as long as the switch is on:
 *   - after a wait that doubles from five seconds to five minutes;
 *   - at once when the machine says the network came back, or when it wakes.
 *
 * It never gives up on its own. A token Slack rejects is asked about once
 * every five minutes, which costs one small call and keeps the fault on the
 * screen; the alternative is guessing which errors are for ever, and a wrong
 * guess is this bug again.
 *
 * `online` only ever brings a try FORWARD. A machine that wrongly reports no
 * network still gets its try when the wait is up.
 *
 * Pure and free of Electron so a test drives it with its own clock.
 */

/** The first wait. */
export const SLACK_RETRY_MIN_MS = 5_000;
/** The longest wait. */
export const SLACK_RETRY_MAX_MS = 5 * 60_000;
/** How often a pending retry looks at the network while it waits. */
export const SLACK_RETRY_WATCH_MS = 5_000;

/** The wait before try number `attempt` (1 is the first retry): 5 s, 10 s,
 *  20 s, 40 s, 80 s, 160 s, then 5 min for good. */
export function slackRetryDelayMs(attempt: number): number {
  const n = Number.isFinite(attempt) ? Math.max(1, Math.floor(attempt)) : 1;
  return Math.min(SLACK_RETRY_MIN_MS * 2 ** Math.min(n - 1, 16), SLACK_RETRY_MAX_MS);
}

/** What Settings and the Inbox say while a start has failed. */
export function slackStartFailedText(error: string | undefined): string {
  return `Could not connect to Slack: ${error || 'unknown'}. Trying again.`;
}

export interface SlackStartRetryDeps {
  /** Start Slack again. The start reports its own outcome through `failed`
   *  or `succeeded`, the same as a start a person asked for. */
  start: () => unknown;
  /** The switch is on and nothing the chosen way needs is missing. */
  wanted: () => boolean;
  /** A start is in flight right now. Its outcome decides what happens next. */
  busy: () => boolean;
  /** False only when the machine knows it has no network. */
  online?: () => boolean;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface SlackStartRetryState {
  /** How many starts in a row have failed. 0 when nothing is owed. */
  attempt: number;
  /** Why the last start failed. */
  error?: string;
  /** When the next try is due at the latest (epoch ms). */
  retryAt?: number;
}

export class SlackStartRetry {
  private attempt = 0;
  private error: string | undefined;
  private dueAt: number | undefined;
  private timer: unknown = null;
  private sawOffline = false;

  constructor(private readonly deps: SlackStartRetryDeps) {}

  private now(): number { return this.deps.now ? this.deps.now() : Date.now(); }
  private online(): boolean {
    try { return this.deps.online ? this.deps.online() : true; } catch { return true; }
  }

  /** A start failed for a reason that is not a missing field. */
  failed(error: string): void {
    this.attempt += 1;
    this.error = error;
    this.dueAt = this.now() + slackRetryDelayMs(this.attempt);
    this.sawOffline = !this.online();
    this.arm();
  }

  /** A start worked. Nothing is owed. */
  succeeded(): void { this.cancel(); }

  /** Slack was stopped, switched off or changed. Nothing is owed. */
  cancel(): void {
    this.disarm();
    this.attempt = 0;
    this.error = undefined;
    this.dueAt = undefined;
    this.sawOffline = false;
  }

  /** The machine woke. Try now, when a try is owed. */
  tryNow(): void {
    if (this.dueAt === undefined) return;
    this.disarm();
    this.go();
  }

  state(): SlackStartRetryState {
    return { attempt: this.attempt, ...(this.error !== undefined ? { error: this.error } : {}), ...(this.dueAt !== undefined ? { retryAt: this.dueAt } : {}) };
  }

  private disarm(): void {
    if (this.timer === null) return;
    (this.deps.clearTimer ?? ((h) => clearTimeout(h as NodeJS.Timeout)))(this.timer);
    this.timer = null;
  }

  private arm(): void {
    this.disarm();
    if (this.dueAt === undefined) return;
    const wait = Math.max(0, Math.min(SLACK_RETRY_WATCH_MS, this.dueAt - this.now()));
    this.timer = (this.deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms)))(() => this.tick(), wait);
  }

  private tick(): void {
    this.timer = null;
    if (this.dueAt === undefined) return;
    if (!this.deps.wanted()) { this.cancel(); return; }
    const on = this.online();
    const cameBack = on && this.sawOffline;
    if (!on) this.sawOffline = true;
    if (cameBack || this.now() >= this.dueAt) this.go();
    else this.arm();
  }

  private go(): void {
    if (!this.deps.wanted()) { this.cancel(); return; }
    this.sawOffline = false;
    // Armed again BEFORE the start, so a start that never answers cannot end
    // the retries. A start that fails moves this on; one that works clears it.
    this.dueAt = this.now() + slackRetryDelayMs(this.attempt + 1);
    this.arm();
    if (this.deps.busy()) return;
    try { void this.deps.start(); } catch { /* the next try is already armed */ }
  }
}

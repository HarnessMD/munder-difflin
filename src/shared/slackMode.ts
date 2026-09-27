/**
 * How Slack reaches the office (0.4.11, founder 6 Sep 2026: "instead of relying
 * on webhooks they can just rely on polling every minute", then Socket Mode as
 * a second way, webhooks kept as the third; "they can only connect one at a
 * time"; a frequency picker on both the polling and the socket way).
 *
 * Shared by main (which runs the transport), preload (the IPC contract) and the
 * renderer (the Settings form and the Inbox), so the three cannot disagree on
 * the mode names, the picker choices or the status shape. No electron import.
 *
 *   polling  the office asks Slack for new messages on a timer, bot token only,
 *            catches up after downtime from a saved cursor
 *   socket   the office holds a Socket Mode WebSocket open (app token), instant,
 *            with a catch up sweep on a timer for what arrived while it was down
 *   webhook  the original Events API server behind a public tunnel (signing
 *            secret, port); what arrives while it is down is lost
 *
 * Every way needs the office open and the laptop awake: the poller, the socket
 * and the webhook server all run on this machine.
 */

export type SlackMode = 'polling' | 'socket' | 'webhook';

export const SLACK_MODES: readonly SlackMode[] = ['polling', 'socket', 'webhook'];

/** Seconds between history checks in polling mode. */
export const SLACK_POLL_CHOICES: readonly number[] = [30, 60, 120, 300];
export const SLACK_POLL_DEFAULT = 60;
export const SLACK_POLL_MIN = 30;
export const SLACK_POLL_MAX = 300;

/** Seconds between catch up sweeps in socket mode; 0 is off. */
export const SLACK_CATCHUP_CHOICES: readonly number[] = [0, 60, 300, 900, 3600];
export const SLACK_CATCHUP_DEFAULT = 300;
export const SLACK_CATCHUP_MIN = 60;
export const SLACK_CATCHUP_MAX = 3600;

/** Who handles a Slack request once it is in (founder, 6 Sep 2026: "Michael
 *  needs to triage the slack requests, give it as a configuration option,
 *  make it default"). `michael` lands the request in the orchestrator's queue
 *  under the autonomous request protocol, and he routes it to the right agent
 *  or hires a temp. `temps` hires a temp for each request at once and informs
 *  him. Independent of the way in: every transport lands on the same door. */
export type SlackTriage = 'michael' | 'temps';
export const SLACK_TRIAGES: readonly SlackTriage[] = ['michael', 'temps'];
export const SLACK_TRIAGE_DEFAULT: SlackTriage = 'michael';

export function resolveSlackTriage(cfg: { slackTriage?: string } | null | undefined): SlackTriage {
  const v = cfg?.slackTriage;
  return v === 'michael' || v === 'temps' ? v : SLACK_TRIAGE_DEFAULT;
}

/** The upgrade rule: a saved mode wins; an install that already ran the
 *  webhook (Slack on with a signing secret) keeps it so the upgrade breaks
 *  nothing; everyone else lands on polling, the recommended default. */
export function resolveSlackMode(cfg: { slackMode?: string; slackEnabled?: boolean; slackSigningSecret?: string } | null | undefined): SlackMode {
  const m = cfg?.slackMode;
  if (m === 'polling' || m === 'socket' || m === 'webhook') return m;
  if (cfg?.slackEnabled && typeof cfg.slackSigningSecret === 'string' && cfg.slackSigningSecret.trim()) return 'webhook';
  return 'polling';
}

/** A number outside the range, or not a number, reads as the default. */
export function resolvePollSeconds(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= SLACK_POLL_MIN && v <= SLACK_POLL_MAX ? Math.round(v) : SLACK_POLL_DEFAULT;
}

/** 0 is a real choice (off); anything else outside the range reads as the default. */
export function resolveCatchupSeconds(v: unknown): number {
  if (v === 0) return 0;
  return typeof v === 'number' && Number.isFinite(v) && v >= SLACK_CATCHUP_MIN && v <= SLACK_CATCHUP_MAX ? Math.round(v) : SLACK_CATCHUP_DEFAULT;
}

/** What `slack:status` answers. Times are epoch milliseconds. Fields a mode
 *  does not have are absent: `url` is the webhook's tunnel, `nextPollAt` is
 *  polling's, `socketConnectedAt` and `lastCatchupAt` are the socket's. */
export interface SlackStatus {
  running: boolean;
  mode: SlackMode;
  url?: string;
  /** Webhook way only: the port the event server is really on, and the
   *  configured one when it was taken (shared/boundPort.ts, 0.5.3). */
  port?: number;
  movedFrom?: number;
  team?: string;
  botName?: string;
  lastPollAt?: number;
  nextPollAt?: number;
  socketConnectedAt?: number;
  lastCatchupAt?: number;
  lastError?: string;
  hotThreads?: number;
  tempsLive?: number;
  /** When nothing runs: what the saved config still lacks before the chosen
   *  way CAN start (e.g. 'missing channel'), from main's readiness check.
   *  Absent while a transport runs. Added 6 Sep 2026, card
   *  slack-bridge-never-starts: enabled-but-unstartable must never again be
   *  indistinguishable from healthy-but-quiet. */
  configError?: string;
}

/**
 * Why an app-initiated Slack post did not go out.
 *
 * Shared so the main-process refusal and whatever surface reports it say the
 * same sentence, and so that sentence names the control the person has to go
 * and find. It is checked by test, which is the point: rename the switch on the
 * screen and this string has to move with it.
 */
export const SLACK_PROACTIVE_OFF_REASON =
  'Slack posting on its own is off, so nothing was sent. Turn on "Post in Slack on its own" in Settings, Connections, Slack.';

/**
 * The bot-token scopes each way needs, as Slack names them.
 *
 * ONE source, because three copies drift: these are shown beside the token
 * field, and they are the list the granted-scope check is diffed against. The
 * prose in `slackWay.help.<mode>` still walks a person through creating the app;
 * it is no longer the only place the scopes appear (founder, 7 Sep 2026: he
 * asked for the permissions to be named, and they already were, behind an info
 * button nobody presses).
 *
 * `channels:read` / `groups:read` are here because the form now lists the bot's
 * channels instead of asking for an id. They are the only two that are optional
 * in the sense that the form falls back to asking when they are refused.
 */
export const SLACK_BOT_SCOPES: Readonly<Record<SlackMode, readonly string[]>> = {
  polling: ['channels:history', 'groups:history', 'chat:write', 'files:read', 'channels:read', 'groups:read'],
  socket: ['channels:history', 'groups:history', 'chat:write', 'files:read', 'channels:read', 'groups:read'],
  webhook: ['chat:write', 'channels:history', 'groups:history']
};

/** The app-level token's one scope, socket mode only. Not a bot scope, so it is
 *  never in the diff above; `apps.connections.open` succeeding is its test. */
export const SLACK_APP_SCOPE = 'connections:write';

/** One channel the bot is already a member of, from `users.conversations`. */
export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

/**
 * What `slack:test` answers.
 *
 * This is the DIAGNOSTIC, so it must be able to run when the config is
 * incomplete and say what is incomplete about it. It used to be gated on the
 * same readiness check that it exists to explain: the button that tells you the
 * channel is missing was disabled BECAUSE the channel was missing, so the one
 * screen that could have answered the question offered nothing to press
 * (founder, 7 Sep 2026). `missing` is the answer to "why can I not turn this
 * on", in the user's words, and it is filled in whether or not the calls ran.
 */
export interface SlackTestResult {
  ok: boolean;
  team?: string;
  botName?: string;
  socket?: { ok: boolean; error?: string };
  error?: string;
  /** Field labels the chosen way still needs, in the order the form shows them.
   *  Empty when nothing is missing. */
  missing?: string[];
  /** The channels the bot is in. Present when `users.conversations` answered,
   *  which is what lets the form stop asking for an id. */
  channels?: SlackChannel[];
  /** `users.conversations` was refused for want of `channels:read` /
   *  `groups:read`. Not an error: the form falls back to asking for the id,
   *  because a workspace that will not grant the scope must still be usable. */
  channelsNeedScope?: boolean;
  /** Anything else that stopped the channel list arriving, verbatim from Slack. */
  channelsError?: string;
  /** The scopes this bot token actually carries, read off Slack's own
   *  `x-oauth-scopes` response header. Absent when no call was made or Slack
   *  did not send it, which is why `missingScopes` is separate: unknown is not
   *  the same as none, and a form that treats it as none tells people to grant
   *  things they already granted. */
  grantedScopes?: string[];
  /** What the chosen way needs and this token does not have. Present only when
   *  `grantedScopes` is known, so a list of one real gap replaces a correct list
   *  a person has to diff by eye. */
  missingScopes?: string[];
}

/**
 * Credentials to test INSTEAD of the saved ones.
 *
 * The form sends what is on screen, so Test connection answers about the token
 * you just pasted and writes nothing. Before this, testing meant saving first,
 * which made "test" a decision with a side effect and put the tokens on disk
 * before anyone had said they were right.
 */
export interface SlackTestDraft {
  mode?: SlackMode;
  botToken?: string;
  appToken?: string;
  signingSecret?: string;
}

/** The patch `slack:setConfig` accepts. Tokens flow one way, into main. */
export interface SlackConfigPatch {
  enabled?: boolean;
  mode?: SlackMode;
  signingSecret?: string;
  botToken?: string;
  appToken?: string;
  channelId?: string;
  port?: number;
  proactivePosting?: boolean;
  pollSeconds?: number;
  catchupSeconds?: number;
  tempCwd?: string;
  triage?: SlackTriage;
}

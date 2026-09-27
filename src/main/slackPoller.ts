/**
 * SlackPoller: the "Check for messages" way of reaching Slack (0.4.11).
 *
 * Founder, 6 Sep 2026: "instead of relying on webhooks they can just rely on
 * polling every minute once maybe, whatever is under the limit." One bot token,
 * no signing secret, no port, no tunnel. Each tick asks Slack for what came
 * after a saved cursor, then for the replies in the threads the bot was
 * mentioned in recently, and hands every message that passes the SAME trigger
 * rules the webhook uses (slack-trigger.cjs) to `onMessage` in the SAME shape
 * (SlackInboundMessage), so nothing downstream knows which way it came.
 *
 * The decisions (cursor, hot threads, budget, backoff, terminal errors) live
 * in slack-poll.cjs, pure and unit tested; this file owns the network, the
 * timer and the state file. Deliberately free of any `electron` import so it
 * can be driven by a fake api in test/slack-poll.test.cjs.
 *
 * The socket way (slackSocket.ts) reuses this class for its catch up sweep:
 * every message the socket delivers is reported through `noteDelivered`, so
 * a sweep only asks Slack for what the socket did not already bring in.
 */
import { request as httpsRequest } from 'node:https';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { stripLeadingMention, type SlackEventFile, type SlackInboundMessage } from './slack';

// The pure cores. Required, not imported, for the reason slack.ts gives:
// the sidecars are copied next to the bundle, not bundled.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const trigger = require('./slack-trigger.cjs') as {
  shouldTrigger: (ev: unknown, botUserId: string | null, channelId: string | undefined, activated: ActivatedThreads) => { trigger: boolean; text: string; files: SlackEventFile[] };
  ActivatedThreads: new (maxSize?: number) => ActivatedThreads;
  SeenEvents: new (maxSize?: number) => SeenEvents;
  dedupKey: (ev: unknown) => string;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const core = require('./slack-poll.cjs') as PollCore;

export interface ActivatedThreads { add(threadTs: string): void; has(threadTs: string): boolean; readonly size: number }
export interface SeenEvents { seen(key: string): boolean; readonly size: number }

interface ThreadState { lastReplyTs: string; activatedAt: number; lastActivityAt: number; lastCheckedAt: number }
interface PollState { version: number; channel: string; cursor: string; threads: Record<string, ThreadState>; botUserId: string | null }
interface Backoff { budget: number; factor: number; cleanTicks: number; retryAfterMs: number }
interface PollCore {
  HISTORY_LIMIT: number; REPLIES_LIMIT: number;
  compareTs(a: string, b: string): number;
  createState(channel: string, nowMs: number): PollState;
  loadState(raw: unknown, channel: string, nowMs: number): PollState;
  serializeState(state: PollState): string;
  sortOldestFirst<T extends { ts?: string }>(messages: T[]): T[];
  advanceCursor(state: PollState, messages: { ts?: string }[]): string;
  afterCursor<T extends { ts?: string }>(state: PollState, messages: T[]): T[];
  noteThreadActivity(state: PollState, threadTs: string, ts: string | undefined, nowMs: number, opts?: { mentioned?: boolean }): void;
  noteThreadChecked(state: PollState, threadTs: string, nowMs: number): void;
  hotThreads(state: PollState, nowMs: number, budget?: number): string[];
  hotThreadCount(state: PollState, nowMs: number): number;
  pruneThreads(state: PollState, nowMs: number): void;
  createBackoff(): Backoff;
  onRateLimited(b: Backoff, retryAfterMs?: number): Backoff;
  onCleanTick(b: Backoff): Backoff;
  nextDelayMs(b: Backoff, baseIntervalMs: number): number;
  isTerminalError(error: unknown): boolean;
  retryAfterFromHeader(value: unknown): number;
  withChannel<T>(message: T, channel: string): T;
  mentionsBot(ev: unknown, botUserId: string | null): boolean;
}

export interface SlackApiResult {
  ok: boolean;
  error?: string;
  status?: number;
  retryAfterMs?: number;
  json?: unknown;
  /** The token's granted scopes, from Slack's `x-oauth-scopes` response header.
   *  Every Web API call carries it, so the cheapest auth.test doubles as a
   *  permissions read and nobody has to be told to go and look. Absent when the
   *  header is missing; absent is UNKNOWN, never "none". */
  scopes?: string[];
}
/** POST to https://slack.com/api/<method> with a bearer token. Form encoded,
 *  which every Web API method accepts. The default rides node:https like the
 *  rest of slack.ts: no SDK. Tests inject their own. */
export type SlackApi = (method: string, token: string, params: Record<string, string | number | boolean>) => Promise<SlackApiResult>;

/** Optional clock and timers, so tests can drive the poller without waiting. */
export interface PollTimers {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export const slackApi: SlackApi = (method, token, params) => new Promise<SlackApiResult>((resolve) => {
  if (!token) { resolve({ ok: false, error: 'missing token' }); return; }
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.set(k, String(v));
  const data = body.toString();
  const req = httpsRequest({
    method: 'POST',
    hostname: 'slack.com',
    path: `/api/${method}`,
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
      'content-length': Buffer.byteLength(data),
      authorization: `Bearer ${token}`
    }
  }, (res) => {
    const chunks: Buffer[] = [];
    res.on('data', (c: Buffer) => chunks.push(c));
    res.on('end', () => {
      const status = res.statusCode ?? 0;
      // Slack sends the token's scopes on every Web API response. Read it here
      // so one auth.test answers "is the token good" AND "what may it do".
      const rawScopes = res.headers['x-oauth-scopes'];
      const scopes = typeof rawScopes === 'string'
        ? rawScopes.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;
      if (status === 429) {
        resolve({ ok: false, error: 'ratelimited', status, retryAfterMs: core.retryAfterFromHeader(res.headers['retry-after']) });
        return;
      }
      try {
        const json = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { ok?: boolean; error?: string };
        resolve({ ok: json.ok === true, error: json.ok === true ? undefined : (json.error ?? `http ${status}`), status, json, ...(scopes ? { scopes } : {}) });
      } catch { resolve({ ok: false, error: 'bad response from Slack', status, ...(scopes ? { scopes } : {}) }); }
    });
  });
  req.on('error', (e) => resolve({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  req.write(data);
  req.end();
});

/** Who the token is: the workspace, the bot's handle and its user id (what
 *  `<@…>` mentions carry). Doubles as the Test connection call. */
export async function slackAuthTest(botToken: string, api: SlackApi = slackApi): Promise<{ ok: boolean; team?: string; botName?: string; botUserId?: string; error?: string; scopes?: string[] }> {
  const r = await api('auth.test', botToken, {});
  // The scopes ride the response header, so they come back even on a refusal:
  // an `invalid_auth` carries none, but a token that is real and merely
  // under-scoped can say so, which is the useful case.
  if (!r.ok) return { ok: false, error: r.error ?? 'auth.test failed', ...(r.scopes ? { scopes: r.scopes } : {}) };
  const j = (r.json ?? {}) as { team?: string; user?: string; user_id?: string };
  return { ok: true, team: j.team, botName: j.user, botUserId: j.user_id, ...(r.scopes ? { scopes: r.scopes } : {}) };
}

/**
 * The channels this bot is already in, so the form can stop asking for an id.
 *
 * `users.conversations` with no `user` is "the channels the caller is a member
 * of", and the caller is the bot. That is exactly the set that can work: a
 * channel the bot was never invited to is useless to us whatever its id, and an
 * id typed from the About tab is the step people got wrong.
 *
 * Needs `channels:read` for public and `groups:read` for private. A workspace
 * that grants neither answers `missing_scope`, which is reported as its own
 * outcome rather than an error, because the form must then fall back to asking
 * for the id instead of refusing to work at all.
 *
 * One page. `limit` is the API's own cap and a bot in more than 200 channels is
 * a picker nobody wants to scroll anyway; the manual override covers it.
 */
export async function slackListChannels(
  botToken: string,
  api: SlackApi = slackApi
): Promise<{ ok: true; channels: { id: string; name: string; isPrivate: boolean }[] } | { ok: false; error: string; needsScope: boolean }> {
  const r = await api('users.conversations', botToken, {
    types: 'public_channel,private_channel',
    exclude_archived: true,
    limit: 200
  });
  if (!r.ok) {
    const error = r.error ?? 'users.conversations failed';
    return { ok: false, error, needsScope: error === 'missing_scope' || error === 'not_allowed_token_type' };
  }
  const j = (r.json ?? {}) as { channels?: { id?: string; name?: string; is_private?: boolean }[] };
  const channels = (j.channels ?? [])
    .filter((c): c is { id: string; name?: string; is_private?: boolean } => typeof c.id === 'string' && c.id.length > 0)
    .map((c) => ({ id: c.id, name: typeof c.name === 'string' ? c.name : c.id, isPrivate: c.is_private === true }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, channels };
}

/** One conversations.replies call, oldest first, parent included: what a
 *  follow up temp reads as "the thread so far". */
export async function fetchThread(botToken: string, channel: string, thread_ts: string, api: SlackApi = slackApi): Promise<{ user?: string; text: string; ts: string }[]> {
  const r = await api('conversations.replies', botToken, { channel, ts: thread_ts, limit: core.REPLIES_LIMIT });
  if (!r.ok) return [];
  const j = (r.json ?? {}) as { messages?: { user?: string; text?: string; ts?: string }[] };
  return core.sortOldestFirst(j.messages ?? []).map((m) => ({ user: m.user, text: typeof m.text === 'string' ? m.text : '', ts: m.ts as string }));
}

export interface SlackPollerOptions {
  botToken: string;
  channelId: string;
  /** Milliseconds between ticks. 0 = no timer: the socket way owns the cadence and calls `sweepNow()`. */
  intervalMs: number;
  /** JSON state file (cursor, hot threads, bot user id). Created on first save. Never holds a token. */
  stateFile: string;
  onMessage: (m: SlackInboundMessage) => void | Promise<void>;
  api?: SlackApi;
  log?: (line: string) => void;
  now?: () => number;
  timers?: PollTimers;
}

export interface SlackPollStatus {
  running: boolean;
  lastPollAt?: number;
  nextPollAt?: number;
  lastError?: string;
  hotThreads: number;
  team?: string;
  botName?: string;
  botUserId?: string;
}

interface SlackMessage {
  type?: string; subtype?: string; bot_id?: string; user?: string; text?: string;
  ts?: string; thread_ts?: string; channel?: string; files?: unknown[];
  reply_count?: number; latest_reply?: string;
}

export class SlackPoller {
  private readonly opts: SlackPollerOptions;
  private readonly api: SlackApi;
  private readonly now: () => number;
  private readonly timers: PollTimers;
  private readonly log: (line: string) => void;
  private state: PollState;
  private backoff: Backoff = core.createBackoff();
  /** Shared with the socket way when it runs a sweep, so both agree on which
   *  threads the bot answers in and which messages are already delivered. */
  readonly activated: ActivatedThreads = new trigger.ActivatedThreads();
  readonly seen: SeenEvents = new trigger.SeenEvents();
  private botUserId: string | null = null;
  private team?: string;
  private botName?: string;
  private running = false;
  private sweeping = false;
  private timer: unknown = null;
  private lastPollAt?: number;
  private nextPollAt?: number;
  private lastError?: string;

  constructor(opts: SlackPollerOptions) {
    this.opts = opts;
    this.api = opts.api ?? slackApi;
    this.now = opts.now ?? (() => Date.now());
    this.timers = opts.timers ?? {
      setTimeout: (fn, ms) => { const h = setTimeout(fn, ms); (h as { unref?: () => void }).unref?.(); return h; },
      clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>)
    };
    this.log = opts.log ?? (() => { /* quiet by default */ });
    this.state = core.createState(opts.channelId, this.now());
  }

  /** auth.test, load the state file, arm the timer. Fails closed: a bad
   *  token or channel returns the error and nothing is armed. */
  async start(): Promise<{ ok: boolean; error?: string; team?: string; botName?: string }> {
    if (this.running) return { ok: false, error: 'already running' };
    if (!this.opts.botToken) return { ok: false, error: 'missing bot token' };
    if (!this.opts.channelId) return { ok: false, error: 'missing channel' };
    const who = await slackAuthTest(this.opts.botToken, this.api);
    if (!who.ok) { this.lastError = who.error; return { ok: false, error: who.error }; }
    this.team = who.team;
    this.botName = who.botName;
    this.botUserId = who.botUserId ?? null;
    this.loadState();
    this.state.botUserId = this.botUserId;
    this.saveState();
    this.running = true;
    this.lastError = undefined;
    // The first check runs at once: the cursor is now on a first run, so this
    // costs one call and gives the status line a "last check" straight away.
    if (this.opts.intervalMs > 0) this.arm(0);
    return { ok: true, team: this.team, botName: this.botName };
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) { this.timers.clearTimeout(this.timer); this.timer = null; }
    this.nextPollAt = undefined;
    this.saveState();
  }

  status(): SlackPollStatus {
    return {
      running: this.running,
      lastPollAt: this.lastPollAt,
      nextPollAt: this.running ? this.nextPollAt : undefined,
      lastError: this.lastError,
      hotThreads: core.hotThreadCount(this.state, this.now()),
      team: this.team,
      botName: this.botName,
      botUserId: this.botUserId ?? undefined
    };
  }

  /** The socket way delivered this message itself: move the cursor and the
   *  thread's last reply past it and mark it seen, so a sweep asks only for
   *  what came after and never delivers it twice. */
  noteDelivered(m: { channel: string; ts: string; thread_ts: string; mentioned: boolean }): void {
    if (!m.ts) return;
    this.seen.seen(`${m.channel}:${m.ts}`);
    const isParent = !m.thread_ts || m.thread_ts === m.ts;
    if (isParent) core.advanceCursor(this.state, [{ ts: m.ts }]);
    const thread = m.thread_ts || m.ts;
    if (m.mentioned) this.activated.add(thread);
    if (m.mentioned || this.activated.has(thread)) {
      core.noteThreadActivity(this.state, thread, m.ts, this.now(), { mentioned: m.mentioned });
    }
    this.saveState();
  }

  /** One pass: history after the cursor, then the hot threads. Safe to call
   *  while a timer is armed; overlapping calls are refused, not queued. */
  async sweepNow(): Promise<{ ok: boolean; delivered: number; error?: string }> {
    if (this.sweeping) return { ok: false, delivered: 0, error: 'sweep in progress' };
    if (!this.opts.botToken) return { ok: false, delivered: 0, error: 'missing bot token' };
    this.sweeping = true;
    let delivered = 0;
    let limited = false;
    try {
      const nowMs = this.now();
      this.lastPollAt = nowMs;
      const channel = this.opts.channelId;
      // 1. New parents after the cursor.
      const hist = await this.api('conversations.history', this.opts.botToken, {
        channel, oldest: this.state.cursor, limit: core.HISTORY_LIMIT, inclusive: false
      });
      if (!hist.ok) {
        if (hist.status === 429) { limited = true; this.onLimited(hist.retryAfterMs); return { ok: false, delivered, error: 'ratelimited' }; }
        return this.fail(hist.error ?? 'history failed', delivered);
      }
      const hj = (hist.json ?? {}) as { messages?: SlackMessage[] };
      const parents = core.afterCursor(this.state, hj.messages ?? []);
      for (const raw of parents) {
        const ev = core.withChannel(raw, channel);
        if (this.deliver(ev, nowMs)) delivered += 1;
        // A parent the bot answers in with replies newer than what we have:
        // count it as activity so the thread stays hot. The replies themselves
        // come from conversations.replies below.
        const t = this.state.threads[ev.ts as string];
        if (t && typeof ev.latest_reply === 'string' && core.compareTs(ev.latest_reply, t.lastReplyTs) > 0) {
          core.noteThreadActivity(this.state, ev.ts as string, undefined, nowMs);
          t.lastActivityAt = Math.max(t.lastActivityAt, nowMs);
        }
      }
      core.advanceCursor(this.state, parents);
      // 2. Replies in the hot threads, least recently checked first, within budget.
      for (const thread of core.hotThreads(this.state, nowMs, this.backoff.budget)) {
        const t = this.state.threads[thread];
        const rep = await this.api('conversations.replies', this.opts.botToken, {
          channel, ts: thread, oldest: t.lastReplyTs, limit: core.REPLIES_LIMIT, inclusive: false
        });
        if (!rep.ok) {
          if (rep.status === 429) { limited = true; this.onLimited(rep.retryAfterMs); return { ok: false, delivered, error: 'ratelimited' }; }
          if (core.isTerminalError(rep.error)) return this.fail(rep.error as string, delivered);
          // A thread that vanished (thread_not_found) just stops being checked.
          this.log(`slack poll: replies for a thread failed (${rep.error ?? 'unknown'})`);
          core.noteThreadChecked(this.state, thread, nowMs);
          continue;
        }
        const rj = (rep.json ?? {}) as { messages?: SlackMessage[] };
        const replies = core.sortOldestFirst(rj.messages ?? [])
          .filter((m) => m.ts !== thread && core.compareTs(m.ts as string, t.lastReplyTs) > 0);
        for (const raw of replies) {
          const ev = core.withChannel({ ...raw, thread_ts: raw.thread_ts ?? thread }, channel);
          if (this.deliver(ev, nowMs)) delivered += 1;
          core.noteThreadActivity(this.state, thread, ev.ts, nowMs);
        }
        core.noteThreadChecked(this.state, thread, nowMs);
      }
      core.pruneThreads(this.state, nowMs);
      this.lastError = undefined;
      return { ok: true, delivered };
    } catch (e) {
      return this.fail(e instanceof Error ? e.message : String(e), delivered);
    } finally {
      if (!limited && this.running) core.onCleanTick(this.backoff);
      this.saveState();
      this.sweeping = false;
      if (this.running && this.opts.intervalMs > 0) this.arm(core.nextDelayMs(this.backoff, this.opts.intervalMs));
    }
  }

  /** The same gate as the webhook: trigger rules, non empty, dedup, then the
   *  same message shape. Returns whether it was handed on. */
  private deliver(ev: SlackMessage, nowMs: number): boolean {
    const { trigger: fire, text: rawText, files } = trigger.shouldTrigger(ev, this.botUserId, this.opts.channelId, this.activated);
    if (!fire) return false;
    const text = stripLeadingMention(rawText);
    const channel = typeof ev.channel === 'string' ? ev.channel : this.opts.channelId;
    const ts = typeof ev.ts === 'string' ? ev.ts : '';
    const thread_ts = (typeof ev.thread_ts === 'string' && ev.thread_ts) || ts;
    if (!(text || files.length > 0) || !channel || !ts) return false;
    const key = trigger.dedupKey(ev);
    if (key && this.seen.seen(key)) return false;
    const mentioned = core.mentionsBot(ev, this.botUserId);
    core.noteThreadActivity(this.state, thread_ts, ts, nowMs, { mentioned });
    const msg: SlackInboundMessage = { text, channel, ts, thread_ts };
    if (files.length > 0) msg._rawFiles = files;
    try { void this.opts.onMessage(msg); } catch { /* delivery is best effort, like the webhook */ }
    return true;
  }

  private onLimited(retryAfterMs?: number): void {
    core.onRateLimited(this.backoff, retryAfterMs);
    this.lastError = 'Slack asked us to slow down; checking less often for a while';
    this.log(`slack poll: rate limited, budget ${this.backoff.budget}, interval x${this.backoff.factor}`);
  }

  /** A terminal error stops the loop and keeps the exact Slack error for the
   *  status line; anything else is kept as the last error and retried. */
  private fail(error: string, delivered: number): { ok: false; delivered: number; error: string } {
    this.lastError = error;
    if (core.isTerminalError(error)) {
      this.log(`slack poll: stopped (${error})`);
      this.running = false;
      if (this.timer !== null) { this.timers.clearTimeout(this.timer); this.timer = null; }
      this.nextPollAt = undefined;
    } else {
      this.log(`slack poll: check failed, will retry (${error})`);
    }
    return { ok: false, delivered, error };
  }

  private arm(delayMs: number): void {
    if (this.timer !== null) this.timers.clearTimeout(this.timer);
    this.nextPollAt = this.now() + delayMs;
    this.timer = this.timers.setTimeout(() => { this.timer = null; void this.sweepNow(); }, delayMs);
  }

  private loadState(): void {
    let raw: string | null = null;
    try { if (existsSync(this.opts.stateFile)) raw = readFileSync(this.opts.stateFile, 'utf8'); } catch { raw = null; }
    this.state = core.loadState(raw, this.opts.channelId, this.now());
    for (const [thread, t] of Object.entries(this.state.threads)) if (t.activatedAt > 0) this.activated.add(thread);
  }

  private saveState(): void {
    try {
      mkdirSync(dirname(this.opts.stateFile), { recursive: true });
      writeFileSync(this.opts.stateFile, core.serializeState(this.state), { mode: 0o600 });
    } catch (e) {
      this.log(`slack poll: could not save state (${e instanceof Error ? e.message : String(e)})`);
    }
  }
}

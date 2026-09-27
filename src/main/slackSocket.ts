/**
 * SlackSocketClient: the "Stay connected" way of reaching Slack (0.4.11,
 * founder 6 Sep 2026: "add another socket mode for connecting slack").
 *
 * Slack's Socket Mode: the office asks `apps.connections.open` with the app
 * level token for a one time WebSocket address, opens it, and Slack pushes
 * every subscribed event down it as an envelope carrying the SAME event body
 * the webhook receives. No public URL, no signing secret: the socket is
 * authenticated by the app token when it opens. The rules that keep it up:
 *
 *   1. acknowledge every envelope by sending its id back BEFORE any work, so
 *     Slack's three second window is never at risk; a resent envelope is
 *     absorbed by the same channel:ts dedup the webhook uses,
 *   2. `hello` means connected; a `disconnect` with `refresh_requested` or
 *     `warning` (about hourly) opens a NEW socket first and closes the old
 *     one once the new one says hello; `link_disabled` means the person
 *     turned Socket Mode off in the Slack app, so the client stops and says so,
 *   3. any other close or error reconnects with backoff, 2 s doubling to 60 s,
 *     and `reconnectNow()` (power resume) reconnects at once,
 *   4. the app token is never logged; log lines say "socket" and the reason.
 *
 * Downtime is lossy: Slack cannot deliver while no socket is open and does
 * not queue. So with `catchupMs` > 0 the client runs a SlackPoller on the
 * same state file as a catch up sweep on that cadence, and once right after
 * every (re)connect. Everything the socket delivers is reported to the poller
 * through `noteDelivered`, so a sweep asks only for what the socket missed.
 *
 * No `electron` import; `ws` (already a dependency) is the default socket,
 * and tests inject a fake through `wsFactory`.
 */
import WebSocket from 'ws';
import { stripLeadingMention, type SlackEventFile, type SlackInboundMessage } from './slack';
import { SlackPoller, slackApi, slackAuthTest, type ActivatedThreads, type PollTimers, type SeenEvents, type SlackApi } from './slackPoller';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const trigger = require('./slack-trigger.cjs') as {
  shouldTrigger: (ev: unknown, botUserId: string | null, channelId: string | undefined, activated: ActivatedThreads) => { trigger: boolean; text: string; files: SlackEventFile[] };
  ActivatedThreads: new (maxSize?: number) => ActivatedThreads;
  SeenEvents: new (maxSize?: number) => SeenEvents;
  dedupKey: (ev: unknown) => string;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const core = require('./slack-poll.cjs') as {
  parseSocketFrame: (raw: unknown) => { kind: 'hello' | 'disconnect' | 'event' | 'other' | 'invalid'; envelopeId?: string; reason?: string; retryAttempt?: number; event?: SocketEvent; authorizations?: { user_id?: string }[] };
  mentionsBot: (ev: unknown, botUserId: string | null) => boolean;
};

interface SocketEvent { type?: string; subtype?: string; bot_id?: string; channel?: string; text?: string; ts?: string; thread_ts?: string; files?: unknown[] }

/** The slice of a `ws` socket the client uses; a test's fake implements it. */
export interface WsLike {
  on(event: 'open' | 'message' | 'close' | 'error', cb: (...a: any[]) => void): void; // eslint-disable-line @typescript-eslint/no-explicit-any
  send(data: string): void;
  close(): void;
  terminate?(): void;
}

export interface SlackSocketOptions {
  appToken: string;
  botToken: string;
  /** OPTIONAL (7 Sep 2026). Every socket event carries its own channel, so the
   *  socket needs no id to receive: empty means "every channel the bot is in".
   *  What it costs is the catch up sweep, which reads ONE channel's history and
   *  therefore cannot run without being told which. */
  channelId?: string;
  /** Catch up sweep cadence in ms; 0 = off (no poller at all). */
  catchupMs: number;
  stateFile: string;
  onMessage: (m: SlackInboundMessage) => void | Promise<void>;
  api?: SlackApi;
  wsFactory?: (url: string) => WsLike;
  log?: (line: string) => void;
  now?: () => number;
  timers?: PollTimers;
}

export interface SlackSocketStatus {
  running: boolean;
  connected: boolean;
  connectedAt?: number;
  lastCatchupAt?: number;
  lastError?: string;
  hotThreads: number;
  team?: string;
  botName?: string;
  botUserId?: string;
  /** When the next reconnect attempt is due, while backing off. */
  nextReconnectAt?: number;
}

/** What `Test connection` runs for the app token: can Slack hand us a socket address. */
export async function slackConnectionsOpenTest(appToken: string, api: SlackApi = slackApi): Promise<{ ok: boolean; error?: string }> {
  if (!appToken) return { ok: false, error: 'missing app token' };
  const r = await api('apps.connections.open', appToken, {});
  if (!r.ok) return { ok: false, error: r.error ?? 'apps.connections.open failed' };
  const url = ((r.json ?? {}) as { url?: string }).url;
  return typeof url === 'string' && url.startsWith('wss://') ? { ok: true } : { ok: false, error: 'no socket address in the answer' };
}

const BACKOFF_MIN_MS = 2_000;
const BACKOFF_MAX_MS = 60_000;
export const LINK_DISABLED_MESSAGE = 'Socket Mode is off in your Slack app';

export class SlackSocketClient {
  private readonly opts: SlackSocketOptions;
  private readonly api: SlackApi;
  private readonly now: () => number;
  private readonly timers: PollTimers;
  private readonly log: (line: string) => void;
  private readonly wsFactory: (url: string) => WsLike;
  private readonly poller: SlackPoller | null;
  /** Without a poller the client keeps the webhook's in memory sets. */
  private readonly ownActivated: ActivatedThreads = new trigger.ActivatedThreads();
  private readonly ownSeen: SeenEvents = new trigger.SeenEvents();
  private ws: WsLike | null = null;
  /** The old socket during a refresh: closed once the new one says hello. */
  private retiring: WsLike | null = null;
  private running = false;
  private connected = false;
  private connectedAt?: number;
  private lastCatchupAt?: number;
  private lastError?: string;
  private botUserId: string | null = null;
  private team?: string;
  private botName?: string;
  private backoffMs = BACKOFF_MIN_MS;
  private reconnectTimer: unknown = null;
  private nextReconnectAt?: number;
  private connecting = false;
  /** Bumps on every connect, so a stale socket's close never reconnects over a live one. */
  private generation = 0;

  constructor(opts: SlackSocketOptions) {
    this.opts = opts;
    this.api = opts.api ?? slackApi;
    this.now = opts.now ?? (() => Date.now());
    this.timers = opts.timers ?? {
      setTimeout: (fn, ms) => { const h = setTimeout(fn, ms); (h as { unref?: () => void }).unref?.(); return h; },
      clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>)
    };
    this.log = opts.log ?? (() => { /* quiet by default */ });
    this.wsFactory = opts.wsFactory ?? ((url) => new WebSocket(url) as unknown as WsLike);
    // No channel, no sweep. The poller reads one named channel's history, so
    // building it without an id only produces a 'missing channel' that sinks
    // the socket's own start over a component the socket does not need to
    // receive. Live delivery is unaffected; what is lost is the downtime
    // catch up, and the form says so where the choice is made.
    this.poller = opts.catchupMs > 0 && !!opts.channelId?.trim()
      ? new SlackPoller({
        botToken: opts.botToken, channelId: opts.channelId, intervalMs: opts.catchupMs, stateFile: opts.stateFile,
        onMessage: opts.onMessage, api: this.api, log: this.log, now: this.now, timers: opts.timers
      })
      : null;
  }

  private get activated(): ActivatedThreads { return this.poller ? this.poller.activated : this.ownActivated; }
  private get seen(): SeenEvents { return this.poller ? this.poller.seen : this.ownSeen; }

  /** auth.test with the bot token, the poller when a sweep is wanted, then
   *  the first socket. Fails closed on a bad token. */
  async start(): Promise<{ ok: boolean; error?: string; team?: string; botName?: string }> {
    if (this.running) return { ok: false, error: 'already running' };
    if (!this.opts.appToken) return { ok: false, error: 'missing app token' };
    if (!this.opts.botToken) return { ok: false, error: 'missing bot token' };
    const who = await slackAuthTest(this.opts.botToken, this.api);
    if (!who.ok) { this.lastError = who.error; return { ok: false, error: who.error }; }
    this.team = who.team;
    this.botName = who.botName;
    this.botUserId = who.botUserId ?? null;
    if (this.poller) {
      const p = await this.poller.start();
      if (!p.ok) { this.lastError = p.error; return { ok: false, error: p.error }; }
    }
    this.running = true;
    this.lastError = undefined;
    this.backoffMs = BACKOFF_MIN_MS;
    const opened = await this.connect();
    if (!opened.ok) {
      // A failed first open is not fatal: the backoff loop keeps trying, the
      // status line says why. The person sees "Reconnecting" rather than a dead
      // button, and a laptop that just woke up needs exactly this.
      this.scheduleReconnect(opened.error ?? 'could not open the socket');
    }
    return { ok: true, team: this.team, botName: this.botName };
  }

  /** Close everything; no reconnect after this. */
  stop(): void {
    this.running = false;
    this.clearReconnect();
    this.generation += 1;
    this.closeSocket(this.retiring); this.retiring = null;
    this.closeSocket(this.ws); this.ws = null;
    this.connected = false;
    this.poller?.stop();
  }

  /** Power resume, or the person pressing retry: drop the backoff and open a
   *  new socket now. The old one, if any, is closed; a laptop that slept has
   *  a dead socket that will never say so on its own. */
  reconnectNow(): void {
    if (!this.running) return;
    this.clearReconnect();
    this.backoffMs = BACKOFF_MIN_MS;
    this.generation += 1;
    this.closeSocket(this.retiring); this.retiring = null;
    this.closeSocket(this.ws); this.ws = null;
    this.connected = false;
    void this.connect().then((r) => { if (!r.ok) this.scheduleReconnect(r.error ?? 'could not open the socket'); });
  }

  status(): SlackSocketStatus {
    return {
      running: this.running,
      connected: this.connected,
      connectedAt: this.connectedAt,
      lastCatchupAt: this.lastCatchupAt,
      lastError: this.lastError,
      hotThreads: this.poller ? this.poller.status().hotThreads : this.activated.size,
      team: this.team,
      botName: this.botName,
      botUserId: this.botUserId ?? undefined,
      nextReconnectAt: this.nextReconnectAt
    };
  }

  /** Ask Slack for a socket address and open it. `apps.connections.open` is
   *  called every time: the address is one time. */
  private async connect(): Promise<{ ok: boolean; error?: string }> {
    if (this.connecting) return { ok: false, error: 'already connecting' };
    this.connecting = true;
    const gen = ++this.generation;
    try {
      const r = await this.api('apps.connections.open', this.opts.appToken, {});
      if (!this.running || gen !== this.generation) return { ok: false, error: 'superseded' };
      if (!r.ok) return { ok: false, error: r.error ?? 'apps.connections.open failed' };
      const url = ((r.json ?? {}) as { url?: string }).url;
      if (typeof url !== 'string' || !url.startsWith('wss://')) return { ok: false, error: 'no socket address in the answer' };
      let sock: WsLike;
      try { sock = this.wsFactory(url); } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
      this.attach(sock, gen);
      this.ws = sock;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    } finally {
      this.connecting = false;
    }
  }

  private attach(sock: WsLike, gen: number): void {
    let gone = false;
    const onGone = (why: string): void => {
      if (gone) return;
      gone = true;
      if (this.retiring === sock) { this.retiring = null; return; }   // the old socket of a refresh, expected
      if (sock !== this.ws || gen !== this.generation) return;        // a stale socket, already replaced
      this.ws = null;
      this.connected = false;
      if (!this.running) return;
      this.scheduleReconnect(why);
    };
    sock.on('message', (data: unknown) => { if (sock === this.ws || sock === this.retiring) this.onFrame(sock, data); });
    sock.on('close', () => onGone('socket closed'));
    sock.on('error', (e: unknown) => {
      const why = e instanceof Error ? e.message : String(e);
      if (sock === this.ws) this.lastError = why;
      onGone(why);
    });
  }

  private onFrame(sock: WsLike, data: unknown): void {
    const frame = core.parseSocketFrame(data);
    switch (frame.kind) {
      case 'hello': {
        if (sock !== this.ws) return;
        this.connected = true;
        this.connectedAt = this.now();
        this.lastError = undefined;
        this.backoffMs = BACKOFF_MIN_MS;
        this.clearReconnect();
        this.log('socket: connected');
        if (this.retiring) { this.closeSocket(this.retiring); this.retiring = null; }
        // The sweep that covers whatever arrived while no socket was open.
        if (this.poller) {
          void this.poller.sweepNow().then((r) => { if (r.ok) this.lastCatchupAt = this.now(); });
        }
        return;
      }
      case 'disconnect': {
        const reason = frame.reason ?? 'unknown';
        this.log(`socket: disconnect (${reason})`);
        if (reason === 'link_disabled') {
          this.lastError = LINK_DISABLED_MESSAGE;
          this.stop();
          return;
        }
        if (sock !== this.ws) return;
        // refresh_requested, warning, or anything else Slack announces: open
        // the new socket first, retire this one, close it on the new hello.
        this.retiring = sock;
        this.ws = null;
        void this.connect().then((r) => {
          if (r.ok) return;
          // The new socket could not open: keep the old one until Slack closes
          // it, then the normal reconnect path takes over.
          this.ws = this.retiring; this.retiring = null;
          this.lastError = r.error;
        });
        return;
      }
      case 'event': {
        // Ack first, before any work. Slack resends after three seconds of
        // silence, and the dedup below would then have to absorb a repeat.
        try { sock.send(JSON.stringify({ envelope_id: frame.envelopeId })); } catch { /* the close handler reconnects */ }
        if (!this.botUserId) {
          const id = frame.authorizations?.[0]?.user_id;
          if (id) this.botUserId = id;
        }
        if (frame.event) this.deliver(frame.event);
        return;
      }
      case 'other': {
        if (frame.envelopeId) { try { sock.send(JSON.stringify({ envelope_id: frame.envelopeId })); } catch { /* as above */ } }
        return;
      }
      default:
        return;
    }
  }

  /** The webhook's gate, verbatim: trigger rules, non empty, dedup, same shape. */
  private deliver(ev: SocketEvent): void {
    const { trigger: fire, text: rawText, files } = trigger.shouldTrigger(ev, this.botUserId, this.opts.channelId || undefined, this.activated);
    if (!fire) return;
    const text = stripLeadingMention(rawText);
    const channel = typeof ev.channel === 'string' ? ev.channel : '';
    const ts = typeof ev.ts === 'string' ? ev.ts : '';
    const thread_ts = (typeof ev.thread_ts === 'string' && ev.thread_ts) || ts;
    if (!(text || files.length > 0) || !channel || !ts) return;
    const key = trigger.dedupKey(ev);
    if (key && this.seen.seen(key)) return;
    const mentioned = core.mentionsBot(ev, this.botUserId);
    // The poller's seen set is the one above when a poller exists, so this only
    // moves the cursor and the thread's last reply past what the socket brought.
    this.poller?.noteDelivered({ channel, ts, thread_ts, mentioned });
    const msg: SlackInboundMessage = { text, channel, ts, thread_ts };
    if (files.length > 0) msg._rawFiles = files;
    try { void this.opts.onMessage(msg); } catch { /* best effort, like the webhook */ }
  }

  private scheduleReconnect(why: string): void {
    if (!this.running || this.reconnectTimer !== null) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, BACKOFF_MAX_MS);
    this.nextReconnectAt = this.now() + delay;
    this.log(`socket: reconnect in ${Math.round(delay / 1000)} s (${why})`);
    this.reconnectTimer = this.timers.setTimeout(() => {
      this.reconnectTimer = null;
      this.nextReconnectAt = undefined;
      if (!this.running) return;
      void this.connect().then((r) => { if (!r.ok) this.scheduleReconnect(r.error ?? 'could not open the socket'); });
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) { this.timers.clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.nextReconnectAt = undefined;
  }

  private closeSocket(sock: WsLike | null): void {
    if (!sock) return;
    try { sock.close(); } catch { /* already gone */ }
  }
}

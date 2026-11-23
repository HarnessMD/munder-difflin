/**
 * SlackWebhookServer — receive Slack messages and hand them to the harness.
 *
 * A bare `node:http` server (no @slack/bolt) that implements just enough of the
 * Slack Events API to let the user pipe a channel's messages into Michael's
 * message queue:
 *   - verifies EVERY request with Slack's signing-secret HMAC over the RAW body
 *     plus a 5-minute replay-timestamp guard (403 on any failure),
 *   - answers the one-time `url_verification` challenge handshake,
 *   - on a plain `message` event, strips a leading bot mention and emits the
 *     text via `onMessage`.
 *
 * It also opens a `tunnelmole` tunnel so the local port is reachable from Slack's
 * servers; the tunnel URL is what the user pastes into their Slack app's Event
 * Subscriptions → Request URL. The tunnel is best-effort: the local handler is
 * the security boundary and stays up even if the tunnel can't be established.
 *
 * Runs in the Electron main process. Deliberately free of any `electron`
 * import so it can be unit-/smoke-tested as a plain Node module.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BoundPort } from '../shared/boundPort';
import { keepTunnel, type KeptTunnel } from './tunnel';
import { isSlackUserId, type SlackPlace, type SlackRef } from '../shared/slackBrief';
// NOTE: `tunnelmole` is an ESM-only package. The Electron main process is bundled
// as CommonJS, so a static `import` gets externalized into `require('tunnelmole')`
// and throws ERR_REQUIRE_ESM at load. It is imported dynamically inside
// main/tunnel.ts instead — Rollup preserves dynamic import() in CJS output, which
// can load ESM. Do not hoist this back to a top-level import.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  shouldTrigger: _shouldTrigger,
  ActivatedThreads: _ActivatedThreads,
  SeenEvents: _SeenEvents,
  dedupKey: _dedupKey,
  slackFileUrl,
  isSlackHost,
  looksLikeHtmlStub,
  SLACK_FILE_MAX_REDIRECTS,
} = require('./slack-trigger.cjs') as {
    shouldTrigger: (
      ev: SlackPayload['event'],
      botUserId: string | null,
      channelId: string | readonly string[] | undefined,
      activatedThreads: _IActivatedThreads
    ) => SlackTriggerResult;
    ActivatedThreads: new (maxSize?: number) => _IActivatedThreads;
    SeenEvents: new (maxSize?: number) => _ISeenEvents;
    dedupKey: (ev: SlackPayload['event']) => string;
    slackFileUrl: (file: { url_private?: string; url_private_download?: string }) => string | undefined;
    isSlackHost: (host: string) => boolean;
    looksLikeHtmlStub: (contentType: string | undefined, head: Buffer | string) => boolean;
    SLACK_FILE_MAX_REDIRECTS: number;
  };

/** The pure Slack file download helpers (defined in slack-trigger.cjs so they
 *  stay unit testable without electron), for index.ts's downloadSlackFile. */
export const slackFileHelpers = { slackFileUrl, isSlackHost, looksLikeHtmlStub, SLACK_FILE_MAX_REDIRECTS };

interface _IActivatedThreads {
  add(threadTs: string): void;
  has(threadTs: string): boolean;
  readonly size: number;
}

interface _ISeenEvents {
  seen(key: string): boolean;
  readonly size: number;
}

/** Raw Slack file metadata as received in the `files[]` array of a file_share event.
 *  Populated by slack-trigger.cjs; consumed and stripped by index.ts after download. */
export interface SlackEventFile {
  id?: string;
  url_private: string;
  /** Preferred download URL (Content-Disposition attachment); may be absent. */
  url_private_download?: string;
  name?: string;
  mimetype?: string;
  size?: number;
}

/** What slack-trigger.cjs answers for one event (0.5.6: where it was written
 *  and the messages shared into it ride along). */
export interface SlackTriggerResult { trigger: boolean; text: string; files: SlackEventFile[]; place?: SlackPlace; shares?: SlackRef[] }

/** Stamp where a message was written, who wrote it and what was shared into
 *  it. One function for the three transports, so none can leave a part out. */
export function withSlackContext(msg: SlackInboundMessage, ev: { user?: unknown } | null | undefined, res: Pick<SlackTriggerResult, 'place' | 'shares'>): SlackInboundMessage {
  if (res.place) msg.place = res.place;
  if (typeof ev?.user === 'string' && ev.user) msg.user = ev.user;
  if (res.shares && res.shares.length > 0) msg._shares = res.shares;
  return msg;
}

export interface SlackWebhookServerOptions {
  /** Local TCP port the HTTP server binds to (and the tunnel forwards to). */
  port: number;
  /** Slack app signing secret (Basic Information → Signing Secret). Required. */
  signingSecret: string;
  /** Optional channel filter: one id or several. When set, events from other
   *  channels are dropped; a direct message is never filtered (0.5.6). */
  channelId?: string | readonly string[];
  /** Called once per accepted, de-mentioned message — with the Slack thread
   *  coordinates needed to reply back in the originating thread. May be async
   *  (e.g. to download file attachments before forwarding via IPC). */
  onMessage: (m: SlackInboundMessage) => void | Promise<void>;
  /** How the public tunnel is opened. The app leaves this out and gets
   *  tunnelmole; a test passes its own so no network is touched. */
  openTunnel?: (port: number) => Promise<string>;
  /** The tunnelmole tunnel closed (the service ends each one after 12 hours)
   *  and was reopened at this new public root (main/tunnel.ts). */
  onTunnelUrl?: (url: string) => void;
}

/** A verified, de-mentioned inbound Slack message plus the coordinates needed to
 *  reply in-thread. `thread_ts` is the original message's thread (or its own ts
 *  when it isn't itself a reply), so office replies nest under the request.
 *
 *  `files` carries LOCAL file paths (post-download by index.ts); it is absent for
 *  text-only messages. `_rawFiles` is an INTERNAL transport field that index.ts
 *  reads to download attachments, then strips before forwarding via IPC — renderers
 *  never see it. */
export interface SlackInboundMessage {
  text: string;
  channel: string;
  ts: string;
  thread_ts: string;
  /** LOCAL paths of downloaded attachments (undefined for text-only messages). */
  files?: { path: string; name: string; mimetype: string }[];
  /** INTERNAL: raw Slack file metadata; consumed + stripped by index.ts onMessage. */
  _rawFiles?: SlackEventFile[];
  /** 0.5.6: where it was written. Absent reads as a channel. */
  place?: SlackPlace;
  /** 0.5.6: the Slack user id of the person who wrote it. */
  user?: string;
  /** INTERNAL, 0.5.6: messages shared into this one, read by index.ts. */
  _shares?: SlackRef[];
}

/** Reject request bodies larger than this — Slack event payloads are tiny; the
 *  cap stops an unauthenticated peer from forcing unbounded memory use before
 *  we've even checked the signature. */
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB
/** Slack's recommended replay window: reject timestamps more than 5 min off. */
const REPLAY_WINDOW_SECONDS = 60 * 5;
/** Cap how long we wait for the public tunnel before giving up (server stays up). */
const TUNNEL_START_TIMEOUT_MS = 10_000;
/** Socket inactivity timeout for Slack API calls (matches fetchText.ts's 12s). */
const SLACK_API_TIMEOUT_MS = 12_000;

export class SlackWebhookServer {
  private server: Server | null = null;
  /** The port this server is bound to, or will try first. It moves when the
   *  asked for port is taken (0.5.3, bug 11), and the tunnel follows it. */
  private port: number;
  /** The port config asked for. Only ever reported, never bound again. */
  private readonly requestedPort: number;
  /** Set when the asked for port was taken and the server moved off it. */
  private movedFromPort: number | undefined;
  private readonly tunnelOpener?: (port: number) => Promise<string>;
  private readonly onTunnelUrl?: (url: string) => void;
  /** The kept tunnelmole tunnel, when the app opened it (not a test's opener). */
  private tunnel: KeptTunnel | null = null;
  private readonly signingSecret: string;
  private readonly channelId?: string | readonly string[];
  private readonly onMessage: (m: SlackInboundMessage) => void | Promise<void>;
  /** Bot's own Slack user id — learned from `authorizations[].user_id` on the
   *  first event_callback. Used to detect <@BOTID> text mentions. */
  private botUserId: string | null = null;
  /** Thread roots where the bot was @-mentioned; subsequent replies in these
   *  threads also trigger onMessage. Bounded FIFO to prevent unbounded growth. */
  private readonly activatedThreads: _IActivatedThreads = new _ActivatedThreads();
  /** Idempotency cache of recently-forwarded message identities (channel:ts).
   *  Stops a single message from firing onMessage — and thus the ack reply —
   *  twice when the app subscribes to both `app_mention` and `message.*` (Slack
   *  sends both for one @-mention), and absorbs Slack's retry of un-acked events. */
  private readonly seenEvents: _ISeenEvents = new _SeenEvents();

  constructor(opts: SlackWebhookServerOptions) {
    this.port = opts.port;
    this.requestedPort = opts.port;
    this.tunnelOpener = opts.openTunnel;
    this.onTunnelUrl = opts.onTunnelUrl;
    this.signingSecret = opts.signingSecret;
    this.channelId = typeof opts.channelId === 'string' ? (opts.channelId.trim() || undefined) : opts.channelId;
    this.onMessage = opts.onMessage;
  }

  /**
   * Bind the local HTTP server, then open a public tunnel to it. The HTTP
   * handler (the security boundary) is live the instant `listen` resolves; the
   * tunnel is opened afterwards and is non-fatal — if it can't be established
   * (offline, loca.lt down, timed out) the server keeps running and we report
   * the tunnel error without a URL.
   */
  async start(): Promise<{ ok: boolean; url?: string; error?: string; port?: number; movedFrom?: number }> {
    if (this.server) return { ok: false, error: 'already running' };
    if (!this.signingSecret) return { ok: false, error: 'missing signing secret' };
    let movedFrom: number | undefined;
    try {
      await this.listen(this.requestedPort);
    } catch (e) {
      // 0.5.3, bug 11 (GaryP, 10 Sep 2026): "failed to bind port 3847:
      // EADDRINUSE" after an upgrade, because an older Munder process still
      // held the port, and Slack stayed off until he found and killed it.
      // Nothing outside this process knows the local port: Slack talks to the
      // tunnel's public address, and the tunnel is opened below to whatever
      // port was bound. So a taken port is not a reason to stay off. Take a
      // free one, the way fileShare's ensureServer does.
      if ((e as NodeJS.ErrnoException)?.code !== 'EADDRINUSE') {
        this.stop();
        return { ok: false, error: `failed to bind port ${this.requestedPort}: ${errMsg(e)}` };
      }
      try {
        await this.listen(0);
        movedFrom = this.requestedPort;
        this.movedFromPort = movedFrom;
      } catch (e2) {
        this.stop();
        return { ok: false, error: `failed to bind port ${this.requestedPort} (in use) or any free port: ${errMsg(e2)}` };
      }
    }
    const bound = { port: this.port, ...(movedFrom !== undefined ? { movedFrom } : {}) };
    try {
      const url = await this.openTunnel();
      if (!url) throw new Error('tunnelmole returned empty URL');
      // main/tunnel.ts keeps it open: a close reopens it and onTunnelUrl hears the new root.
      return { ok: true, url, ...bound };
    } catch (e) {
      // Surface the tunnel failure rather than silently returning ok:true with no url.
      return { ok: false, error: `tunnel unavailable: ${errMsg(e)}`, ...bound };
    }
  }

  /** Where the server really is, for Settings (shared/boundPort.ts). Empty when
   *  it is not bound. */
  boundPort(): BoundPort {
    if (!this.server) return {};
    return { port: this.port, ...(this.movedFromPort !== undefined ? { movedFrom: this.movedFromPort } : {}) };
  }

  /** Close the HTTP server and its tunnel. Idempotent and best-effort. */
  stop(): void {
    this.tunnel?.close();
    this.tunnel = null;
    this.movedFromPort = undefined;
    try { this.server?.close(); } catch { /* noop */ }
    this.server = null;
  }

  private listen(port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const server = createServer((req, res) => this.handleRequest(req, res));
      const onError = (e: Error): void => reject(e);
      server.once('error', onError);
      server.listen(port, () => {
        server.off('error', onError);
        this.server = server;
        // Port 0 means "any": read back the one the system gave.
        const addr = server.address();
        this.port = addr && typeof addr === 'object' ? addr.port : port;
        resolve();
      });
    });
  }

  private async openTunnel(): Promise<string> {
    if (this.tunnelOpener) return this.tunnelOpener(this.port);
    // TODO: optional persistent domain, when config carries one.
    const port = this.port;
    this.tunnel?.close();
    const tunnel = await keepTunnel({
      name: 'slack',
      port,
      startTimeoutMs: TUNNEL_START_TIMEOUT_MS,
      listening: () => this.server?.listening === true && this.port === port,
      onUrl: (url) => { this.onTunnelUrl?.(url); },
      onDown: () => { if (this.tunnel === tunnel) this.tunnel = null; }
    });
    // Stopped while it opened: let it go rather than keep a tunnel nothing serves.
    if (!this.server) { tunnel.close(); throw new Error('stopped'); }
    this.tunnel = tunnel;
    return tunnel.url;
  }

  /** Buffer the raw body (needed verbatim for the HMAC) under a size cap, then
   *  verify + dispatch. Only POST is accepted. */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    const chunks: Buffer[] = [];
    let size = 0;
    let aborted = false;
    req.on('data', (c: Buffer) => {
      if (aborted) return;
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        aborted = true;
        res.writeHead(413); res.end();
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (aborted) return;
      this.handleBody(req, res, Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', () => {
      if (aborted) return;
      try { res.writeHead(400); res.end(); } catch { /* socket already gone */ }
    });
  }

  private handleBody(req: IncomingMessage, res: ServerResponse, rawBody: string): void {
    // 1) Authenticate over the RAW body BEFORE parsing. Any failure → 403.
    if (!this.verify(req, rawBody)) { res.writeHead(403); res.end(); return; }

    let payload: SlackPayload;
    try { payload = JSON.parse(rawBody) as SlackPayload; }
    catch { res.writeHead(400); res.end(); return; }

    // 2) URL verification handshake — echo the challenge back.
    if (payload.type === 'url_verification' && typeof payload.challenge === 'string') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ challenge: payload.challenge }));
      return;
    }

    // 3) Real events: only @-mentions or replies in activated threads — not every
    //    plain channel message. Cache the bot user id from authorizations so we
    //    can detect text mentions (<@BOTID>) without an extra API scope.
    if (payload.type === 'event_callback' && payload.event) {
      // Learn the bot's own user id on first sighting (present on every event_callback).
      const authUserId = payload.authorizations?.[0]?.user_id;
      if (authUserId && !this.botUserId) this.botUserId = authUserId;

      const ev = payload.event;
      const fired = _shouldTrigger(ev, this.botUserId, this.channelId, this.activatedThreads);
      const { trigger, text: rawText, files: rawFiles } = fired;
      if (trigger) {
        const text = stripLeadingMention(rawText);
        const channel = typeof ev.channel === 'string' ? ev.channel : '';
        const ts = typeof ev.ts === 'string' ? ev.ts : '';
        const thread_ts = (typeof ev.thread_ts === 'string' && ev.thread_ts) || ts;
        // Fire when text is non-empty OR files are attached (file_share may have no caption).
        if ((text || rawFiles.length > 0) && channel && ts) {
          // Dedup: only ONE onMessage (and thus one ack) per logical message. When
          // the app subscribes to both `app_mention` and `message.*`, a single
          // @-mention arrives as TWO event_callbacks that share channel:ts; this
          // also absorbs Slack's retry of an un-acked event. Gated AFTER the
          // mention/thread filter, so non-triggering messages are unaffected.
          const dupKey = _dedupKey(ev);
          const isDuplicate = dupKey ? this.seenEvents.seen(dupKey) : false;
          if (!isDuplicate) {
            const msg = withSlackContext({ text, channel, ts, thread_ts }, ev, fired);
            if (rawFiles.length > 0) msg._rawFiles = rawFiles;
            try { void this.onMessage(msg); } catch { /* delivery is best-effort */ }
          }
        }
      }
    }

    // Always 200 so Slack treats the event as delivered and doesn't retry.
    res.writeHead(200); res.end();
  }

  /**
   * Verify a request is genuinely from Slack: HMAC-SHA256 of `v0:<ts>:<rawBody>`
   * with the signing secret must equal the `X-Slack-Signature` header (compared
   * in constant time), AND the timestamp must be within the replay window.
   */
  private verify(req: IncomingMessage, rawBody: string): boolean {
    const sig = req.headers['x-slack-signature'];
    const ts = req.headers['x-slack-request-timestamp'];
    if (typeof sig !== 'string' || typeof ts !== 'string') return false;

    // Replay guard: reject stale or non-numeric timestamps (> 5 min skew).
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum)) return false;
    if (Math.abs(Date.now() / 1000 - tsNum) > REPLAY_WINDOW_SECONDS) return false;

    const expected = 'v0=' + createHmac('sha256', this.signingSecret)
      .update(`v0:${ts}:${rawBody}`)
      .digest('hex');
    const provided = Buffer.from(sig);
    const computed = Buffer.from(expected);
    // timingSafeEqual throws on length mismatch — guard, and a differing length
    // is itself a mismatch, so bail before the constant-time compare.
    if (provided.length !== computed.length) return false;
    return timingSafeEqual(provided, computed);
  }
}

/** Minimal shape of the Slack Events API payloads we handle. */
interface SlackPayload {
  type?: string;
  challenge?: string;
  /** Present on event_callback — contains the bot's own user_id so we can
   *  detect <@BOTID> text mentions without any extra API scope. */
  authorizations?: { user_id?: string }[];
  event?: {
    /** 'message' for regular channel messages; 'app_mention' for @-mentions. */
    type?: string;
    /** 'file_share' for file uploads; 'message_changed' / 'channel_join' etc. dropped. */
    subtype?: string;
    bot_id?: string;
    channel?: string;
    /** 'im' for a direct message, 'mpim' for a group one (message events only). */
    channel_type?: string;
    /** The Slack user id of the person who wrote it. */
    user?: string;
    text?: string;
    /** Message timestamp — Slack's per-message id, used as the reply thread root. */
    ts?: string;
    /** Set when the message is itself a reply; the thread to post back into. */
    thread_ts?: string;
    /** Present on file_share events — the uploaded files' metadata. */
    files?: {
      id?: string;
      url_private?: string;
      url_private_download?: string;
      name?: string;
      mimetype?: string;
      size?: number;
    }[];
  };
}

/** Strip a single leading `<@BOTID>` app-mention so "@bot do X" enqueues "do X".
 *  Exported (0.4.11) so the polling and Socket Mode transports strip the same way. */
export function stripLeadingMention(text: string): string {
  return text.replace(/^\s*<@[A-Z0-9]+>\s*/i, '').trim();
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Post a reply into a Slack thread via `chat.postMessage` — a raw `node:https`
 * POST (no `@slack/*` dep), matching the repo's zero-SDK approach. The bot token
 * is passed in by the caller: it lives in main's config and never leaves the
 * main process, and is NEVER logged. Resolves Slack's `{ ok, error? }`.
 */
/** What every post reports, token excluded. */
export interface SlackPostRecord { channel: string; thread_ts: string; text: string; ok: boolean; error?: string }
let postSink: ((r: SlackPostRecord) => void) | null = null;
/** Main installs the ledger here (slackHistory.ts). One sink for the three
 *  callers of postSlackReply, so no post can happen off the record. */
export function setSlackPostSink(sink: ((r: SlackPostRecord) => void) | null): void { postSink = sink; }

export function postSlackReply(opts: {
  botToken: string;
  channel: string;
  thread_ts: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    if (!opts.botToken) { resolve({ ok: false, error: 'missing bot token' }); return; }
    // CLAUSE-1 guard (fix-slack-integration): refuse any send that lacks an
    // EXPLICIT channel + thread target. A blank/whitespace thread_ts would post
    // to the channel root — an implicit destination the caller never named — so
    // every app/voice-initiated send must pass the thread it was explicitly given.
    // The Slack-origin done-reply poller and the loopback /reply endpoint always
    // pass concrete values, so this never fires for them (no behaviour change).
    if (!opts.channel?.trim() || !opts.thread_ts?.trim()) {
      resolve({ ok: false, error: 'missing explicit channel or thread_ts' }); return;
    }
    const body = JSON.stringify({ channel: opts.channel, thread_ts: opts.thread_ts, text: opts.text });
    const req = httpsRequest({
      method: 'POST',
      hostname: 'slack.com',
      path: '/api/chat.postMessage',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(body),
        authorization: `Bearer ${opts.botToken}`
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { ok?: boolean; error?: string };
          resolve({ ok: json.ok === true, error: json.error });
        } catch { resolve({ ok: false, error: 'bad response from Slack' }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: errMsg(e) }));
    // Node has no default socket timeout, so a peer that accepts the connection
    // but never responds would leave this promise pending forever, wedging the
    // done summary poller (its finally never runs) and hanging the loopback
    // /reply handler. Destroy with an error so the 'error' handler resolves the
    // usual transient path.
    req.setTimeout(SLACK_API_TIMEOUT_MS, () => req.destroy(new Error('timed out')));
    req.write(body);
    req.end();
  }).then((r) => {
    // Recorded after the fact so a ledger fault can never block the post; the
    // sink is wrapped because it is main's code running on Slack's callback.
    try { postSink?.({ channel: opts.channel, thread_ts: opts.thread_ts, text: opts.text, ok: r.ok, error: r.error }); } catch { /* ledger only */ }
    return r;
  });
}

/**
 * A direct message to one person (0.5.6, founder 12 Oct 2026: "being able to
 * send DMs to users"). `chat.postMessage` takes a user id as the channel and
 * posts into the bot's own direct message with that person. The only target
 * without a thread that this module will post to, and only for a Slack user
 * id: a channel still needs its thread (the guard in postSlackReply).
 * Recorded like every post, under the conversation Slack answers with.
 */
export function postSlackDm(opts: { botToken: string; user: string; text: string }): Promise<{ ok: boolean; error?: string; channel?: string; ts?: string }> {
  return new Promise<{ ok: boolean; error?: string; channel?: string; ts?: string }>((resolve) => {
    if (!opts.botToken) { resolve({ ok: false, error: 'missing bot token' }); return; }
    const user = String(opts.user ?? '').trim();
    if (!isSlackUserId(user)) { resolve({ ok: false, error: 'a direct message needs a Slack user id (U… or W…)' }); return; }
    if (!String(opts.text ?? '').trim()) { resolve({ ok: false, error: 'missing text' }); return; }
    const body = JSON.stringify({ channel: user, text: opts.text });
    const req = httpsRequest({
      method: 'POST',
      hostname: 'slack.com',
      path: '/api/chat.postMessage',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(body),
        authorization: `Bearer ${opts.botToken}`
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { ok?: boolean; error?: string; channel?: string; ts?: string };
          resolve({ ok: json.ok === true, error: json.error, channel: json.channel, ts: json.ts });
        } catch { resolve({ ok: false, error: 'bad response from Slack' }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: errMsg(e) }));
    req.setTimeout(SLACK_API_TIMEOUT_MS, () => req.destroy(new Error('timed out')));
    req.write(body);
    req.end();
  }).then((r) => {
    try { postSink?.({ channel: r.channel ?? String(opts.user ?? '').trim(), thread_ts: r.ts ?? '', text: opts.text, ok: r.ok, error: r.error }); } catch { /* ledger only */ }
    return r;
  });
}

/** Per-session shared secret + lazy bot-token accessor for the reply endpoint. */
export interface SlackReplyServerOptions {
  /** Secret the helper must echo in the `x-md-reply-token` header. */
  token: string;
  /** Latest bot token, read lazily so a config change is picked up at reply time. */
  getBotToken: () => string | undefined;
  /** Fired with a thread_ts after an agent's DIRECT reply posts successfully through
   *  this loopback. Lets main record that the thread was already answered so the
   *  done-summary poller can skip it (the poller is a fallback, not a duplicator). */
  onReplied?: (thread_ts: string) => void;
}

/**
 * Loopback-only HTTP endpoint that lets a bundled helper script post a Slack
 * reply WITHOUT ever seeing the bot token. It binds to `127.0.0.1` exclusively
 * and is NEVER placed behind the public tunnel (only the webhook port is
 * forwarded). Every request must carry the per-session `x-md-reply-token`
 * header; non-loopback peers are refused even though the bind already excludes
 * them (defense in depth). Main writes `{ port, token }` to
 * `<userData>/slack-reply.json` so the helper can find this socket.
 */
export class SlackReplyServer {
  private server: Server | null = null;
  private readonly token: string;
  private readonly getBotToken: () => string | undefined;
  private readonly onReplied?: (thread_ts: string) => void;

  constructor(opts: SlackReplyServerOptions) {
    this.token = opts.token;
    this.getBotToken = opts.getBotToken;
    this.onReplied = opts.onReplied;
  }

  /** Bind a loopback port (0 ⇒ OS-assigned). Resolves the actual bound port. */
  start(preferredPort = 0): Promise<{ ok: boolean; port?: number; error?: string }> {
    return new Promise((resolve) => {
      if (this.server) { resolve({ ok: false, error: 'already running' }); return; }
      const server = createServer((req, res) => this.handle(req, res));
      const onError = (e: Error): void => { server.off('listening', onListening); resolve({ ok: false, error: errMsg(e) }); };
      const onListening = (): void => {
        server.off('error', onError);
        this.server = server;
        const addr = server.address();
        resolve({ ok: true, port: addr && typeof addr === 'object' ? addr.port : preferredPort });
      };
      server.once('error', onError);
      server.once('listening', onListening);
      // '127.0.0.1' ONLY — the public tunnel forwards the webhook port, never this.
      server.listen(preferredPort, '127.0.0.1');
    });
  }

  /** Close the endpoint. Idempotent and best-effort. */
  stop(): void {
    try { this.server?.close(); } catch { /* noop */ }
    this.server = null;
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    // Defense in depth: even bound loopback-only, refuse any non-loopback peer.
    if (!isLoopback(req.socket.remoteAddress ?? '')) { res.writeHead(403); res.end(); return; }
    if (req.method !== 'POST' || (req.url ?? '').split('?')[0] !== '/reply') {
      res.writeHead(404); res.end(); return;
    }
    if (!this.checkToken(req.headers['x-md-reply-token'])) { res.writeHead(401); res.end(); return; }

    const chunks: Buffer[] = [];
    let size = 0;
    let aborted = false;
    req.on('data', (c: Buffer) => {
      if (aborted) return;
      size += c.length;
      if (size > MAX_BODY_BYTES) { aborted = true; res.writeHead(413); res.end(); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (aborted) return;
      let parsed: { channel?: string; thread_ts?: string; text?: string; user?: string };
      try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: 'bad json' })); return; }
      const botToken = this.getBotToken();
      if (!botToken) { res.writeHead(503); res.end(JSON.stringify({ ok: false, error: 'no bot token' })); return; }
      this.post(res, botToken, parsed);
    });
    req.on('error', () => { if (!aborted) { try { res.writeHead(400); res.end(); } catch { /* socket gone */ } } });
  }

  /** Post one reply or direct message, the text already final. */
  private post(res: ServerResponse, botToken: string, parsed: { channel?: string; thread_ts?: string; text?: string; user?: string }): void {
    // 0.5.6: `user` in place of a channel and a thread is a direct message
    // to that person. It answers no thread, so nothing is marked as replied.
    if (parsed.user) {
      if (!parsed.text) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: 'user, text required' })); return; }
      postSlackDm({ botToken, user: parsed.user, text: parsed.text })
        .then((r) => { res.writeHead(r.ok ? 200 : 502, { 'content-type': 'application/json' }); res.end(JSON.stringify(r)); })
        .catch((e) => { res.writeHead(500); res.end(JSON.stringify({ ok: false, error: errMsg(e) })); });
      return;
    }
    if (!parsed.channel || !parsed.thread_ts || !parsed.text) {
      res.writeHead(400); res.end(JSON.stringify({ ok: false, error: 'channel, thread, text required' })); return;
    }
    const thread_ts = parsed.thread_ts;
    postSlackReply({ botToken, channel: parsed.channel, thread_ts, text: parsed.text })
      .then((r) => {
        // A successful DIRECT reply means the agent already answered this thread —
        // tell main so the done-summary poller treats it as a fallback and skips it.
        if (r.ok) { try { this.onReplied?.(thread_ts); } catch { /* never break the reply */ } }
        res.writeHead(r.ok ? 200 : 502, { 'content-type': 'application/json' }); res.end(JSON.stringify(r));
      })
      .catch((e) => { res.writeHead(500); res.end(JSON.stringify({ ok: false, error: errMsg(e) })); });
  }

  /** Constant-time match of the request's reply token against the session token. */
  private checkToken(provided: string | string[] | undefined): boolean {
    if (typeof provided !== 'string') return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(this.token);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}

/** True for IPv4 loopback (127.0.0.0/8) and IPv6 ::1 (incl. v4-mapped form). */
function isLoopback(addr: string): boolean {
  const a = addr.replace(/^::ffff:/, '');
  return a === '::1' || a.startsWith('127.');
}

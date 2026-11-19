/**
 * HookServer — the bridge between `claude` lifecycle hooks and the harness.
 *
 * Each spawned agent is launched with `--settings` pointing its hooks at a tiny
 * shim (see HOOK_SHIM in hive.ts) that forwards the hook payload to the Unix
 * domain socket this server listens on. We then:
 *   - drive avatar state from PreToolUse/PostToolUse/Notification/etc., and
 *   - report lifecycle boundaries while renderer-side guarded queues deliver
 *     inbox work only after the session reaches a safe idle prompt.
 *
 * Claude Code 2.1.63+ skips the shim for every event but SessionStart and the
 * status line: its native http hooks POST to a loopback listener here instead
 * (0.5.5 perf, item 6; hookTransport.ts decides per spawn). Both paths run the
 * same handle(), so a reply cannot depend on how the hook arrived.
 *
 * Lives in src/core and imports nothing from Electron. Nothing here may
 * trust an event as proof that its own agent did something.
 */
import { hookSockTooLong, isShortHookSockPath, prepareHookSockFolder } from './hookSockPlace';
import { HookProofRecord } from '../main/hookProof';
import { promptTail } from '../shared/providerAutomation';
import { createServer, createConnection, type Server, type Socket } from 'node:net';
import { createServer as createHttpServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, rmSync, statSync } from 'node:fs';
import type { PtyOwner } from './host';
import type { HiveManager } from '../main/hive';
import type { HarnessConfig } from '../main/config';
import type { ControlRegistry } from '../main/control';
import type { CircuitBreaker } from '../main/breaker';
import { estimateCostUsd } from '../main/pricing';
import { validateHookEvent } from '../shared/hookEvents';
import type { HookSink } from '../main/hookSink';

import { liveModelOf } from '../shared/liveModel';
import type { HookFacts } from '../shared/switchClear';
import { renderResponseStyle } from '../shared/responseStyle';
import type { HookHttpEndpoint } from '../main/hookTransport';

/** Maximum JSON payload bytes in one newline-delimited hook frame. */
const MAX_HOOK_FRAME_BYTES = 256 * 1024;

interface HookPayload {
  /** Ownership probe from ensureListening(): answered with { pong, instance }, never a hook. */
  ping?: string;
  hook_event_name?: string;
  agent_id?: string | null;
  session_id?: string;
  transcript_path?: string;
  /** Status-line payloads only: the session's live context accounting. */
  context_window?: { total_input_tokens?: number; context_window_size?: number };
  /** Claude Code's status line: the plan's 5 hour and weekly limits (shared/usageLimits.ts parses it). */
  rate_limits?: unknown;
  cwd?: string;
  tool_name?: string;
  tool_input?: unknown;
  stop_hook_active?: boolean;
  prompt?: string;
  source?: string;
  notification_type?: string;
  /** Notification hook text, e.g. "Claude is waiting for your input" (idle) vs a
   *  permission request. Used to tell "needs you" from "just done / lingering". */
  message?: string;
  /** CostSample payloads only (synthesized by the proxy-bridge sidecar for
   *  qwen). Raw token counts for one response, fed to the cost ledger. */
  model?: string | { id?: string; display_name?: string };
  /** Set by Claude Code and Codex on payloads sent from INSIDE a sub agent. */
  agent_type?: string;
  input?: number;
  output?: number;
  cache_read?: number;
  cache_creation?: number;
}

/** Live health of the hook socket — the ONE endpoint every lifecycle hook,
 *  proxy-bridge emit and cost sample travels through. When nothing accepts on
 *  it the shims' connect() fails and they exit 0 with empty stdout, which the
 *  CLI reads as "allow": the breaker is inert, fleet.json never appears, no cost
 *  is recorded — and until #277 nothing said so. The beat writes this into
 *  fleet.json so an operator (or god) can see it without a debugger. */
export interface HookSocketHealth {
  /** HIVE_SOCK — where the shims connect. null while the hive has no root. */
  path: string | null;
  /** True only while our server is listening AND (POSIX) the path still
   *  resolves to the socket we bound — a socket FILE can exist while nothing
   *  accepts on it, so existence proves nothing. */
  listening: boolean;
  /** Epoch ms of the current bind; null when not listening. */
  since: number | null;
  /** The last bind/verify failure — 'EADDRINUSE', 'TOOLONG', 'ENOENT', 'REPLACED',
   *  'NOROOT', … — or null when healthy. */
  lastError: string | null;
  /** Bind attempts since the last successful listen (0 when healthy). */
  attempts: number;
  /** Listeners this process had to abandon because a stranger took the path
   *  (see detach()) — a non-zero count is worth a look. */
  orphans: number;
}

/** Back-off between automatic re-bind attempts after a failure. Once spent, the
 *  beat still calls ensureListening() on its own cadence, so the server never
 *  stops trying — it just stops toasting. */
const BIND_RETRY_MS = [500, 1_000, 2_000, 4_000, 8_000];
/** The hook events logged as `hook-seen`: the session, its turns and its compacts, no tool events. */
const LOGGED_HOOKS: ReadonlySet<string> = new Set(['SessionStart', 'UserPromptSubmit', 'Stop', 'StopFailure', 'SessionEnd', 'PreCompact', 'PostCompact']);

/** Identity of the socket FILE we bound — enough to tell, synchronously, whether
 *  the path still leads to it (APFS/NTFS never reuse inode numbers). */
interface FileMark { dev: number; ino: number }
const markOf = (p: string): FileMark | null => {
  try { const st = statSync(p); return { dev: st.dev, ino: st.ino }; } catch { return null; }
};
const sameMark = (a: FileMark | null, b: FileMark | null): boolean =>
  !!a && !!b && a.dev === b.dev && a.ino === b.ino;

/** Who answers at the path: nobody (missing, or a stale file from a crashed
 *  run), a stranger (another live instance — never touched), or us. */
type PathOwner = 'nobody' | 'other' | 'self';

/** A hook boundary that may carry fresh token totals in its transcript (#629). */
export interface HookUsageEvent {
  agentId: string; event: string; transcriptPath: string; sessionId: string; model: string;
}

export class HookServer {
  private server: Server | null = null;
  /** This process's identity, echoed back by the ownership ping so a probe can
   *  tell "our listener" from "some other live instance" at the same path. */
  private readonly instanceId = randomUUID();
  /** The socket FILE we bound (POSIX), so stop() and the beat can tell our
   *  socket from one another instance created at the same path (#277). */
  private mark: FileMark | null = null;
  private bound: { path: string; since: number } | null = null;
  /** Listeners abandoned because a stranger owns the path now. Closing one would
   *  make libuv unlink(2) the PATH — by name, not by inode — and take the
   *  stranger's live socket with it. Kept unref()ed until the process exits. */
  private orphans: Server[] = [];
  private lastError: string | null = null;
  private bindAttempts = 0;
  /** The failure code last written to the log, so a long outage logs once per
   *  reason after the back-off instead of once per beat. Null when healthy. */
  private loggedCode: string | null = null;
  private binding = false;
  private retryTimer: NodeJS.Timeout | null = null;
  /** One toast per outage, not one per retry. */
  private alerted = false;
  /** Set by stop(): the beat must not re-bind while the hive is being moved or
   *  the app is quitting — only start() re-arms. */
  private stopped = false;
  /** 0.5.5 perf, item 6: the loopback HTTP listener Claude Code's native http
   *  hooks POST to (see hookTransport.ts). Unlike the socket it lives for the
   *  whole app run: stop() (changeHome, reset) leaves it bound, because a new
   *  port would strand every running agent on a dead URL, failing open without
   *  a word. Only stopHttp() at quit closes it. */
  private http: HttpServer | null = null;
  private httpPort: number | null = null;
  /** Per app launch. Travels to agents in their env, never in a file or argv. */
  private readonly httpToken = randomBytes(32).toString('hex');
  /** Per agent hook times and prompt tails, read by the PTY submitter (autosend). */
  readonly proof = new HookProofRecord();
  /** agentId → the live session's transcript file, learned from hook payloads.
   *  Lets the harness read per-agent telemetry (e.g. current context size)
   *  even when several agents share one cwd. */
  private transcriptPaths = new Map<string, string>();
  /** agentId → the latest context-window accounting from the statusLine shim
   *  (current tokens + the REAL window size — 200k vs 1M, which nothing else
   *  exposes). The renderer already gets this pushed live on `hive:contextUpdate`;
   *  we also retain the last value here so a main-side read (the voice read-layer's
   *  get_agent_detail / list_agents) can report "how full is each agent's context"
   *  without depending on a renderer round-trip. */
  private contextById = new Map<string, { tokens: number; limit: number; ts: number }>();
  /** agentId to the model last seen running, so the renderer is told on CHANGE
   *  and not on every status line tick (0.5.3 bug 2). */
  private modelById = new Map<string, string>();
  /** The goal last delivered to each agent's current session. Goals are durable
   *  roster state, so repeating an unchanged multi-kilobyte briefing on every
   *  prompt only bloats the transcript. One entry per agent is sufficient: an
   *  agent has one live session, and a new session id replaces the old entry. */
  private deliveredGoalByAgent = new Map<string, { sessionId: string | null; goal: string | null }>();
  /** Identity is a session introduction, not context to append on every model step. */
  private deliveredIdentityByAgent = new Map<string, string | null>();
  /** The steer a hook's reply carries, until that reply is written. */
  private steersOut = new WeakMap<HookPayload, { agentId: string; event: string; text: string }>();

  constructor(
    private hive: HiveManager,
    /** Where renderer events go: a WebContents, or a fan out over every
     *  window (fanOutHookSink). */
    private getWebContents: () => HookSink | PtyOwner | null,
    private getConfig: () => HarnessConfig,
    /** #7C — operator control state. Optional so tests can omit it. */
    private control?: ControlRegistry,
    /** Circuit breaker (Lane A #6.6b) — fed the hook-derived signals (session id,
     *  repeated identical tool calls). Optional so the server still runs without it. */
    private breaker?: CircuitBreaker,
    /** Standing goal text for an agent (from the durable roster). Optional so
     *  tests can omit it; when set, injected at session start and when changed. */
    private getStandingGoal?: (agentId: string) => string | null,
    /** Optional observer of every hook boundary (agentId, event, message). The
     *  worker inbox-wake watchdog (workerWake.ts) feeds on this to learn when an
     *  agent is parked on a permission/HITL prompt so it never types into it. */
    private onEvent?: (agentId: string | undefined, event: string, message: string | undefined, tool?: string, source?: string) => void
  ) {}

  /** Bind the hook socket. Asynchronous and safe to call repeatedly — a
   *  listening server is left alone. Before #277 this returned SILENTLY when the
   *  hive had no root yet, and left the outcome of listen() to a console.error
   *  nobody reads: either way the whole control plane could be dead for a
   *  session with nothing logged. Now every outcome is logged (console and the
   *  hive's log.jsonl), failures are retried, and the beat keeps verifying. */
  /** #629: fire and forget observer of the hook boundaries that end a unit of
   *  work, for providers whose usage lives in their own transcript (Codex). It
   *  only schedules a read; it must never delay or change the hook reply. Set
   *  after construction so the digest stays the constructor's last argument. */
  private onUsageEvent?: (event: HookUsageEvent) => void;
  setUsageObserver(cb: ((event: HookUsageEvent) => void) | undefined): void {
    this.onUsageEvent = cb;
  }
  /** 0.5.6: observer of what each payload says about sub agents and sessions,
   *  for the clear on a switch of work (shared/switchClear.ts). It gets every
   *  payload, a sub agent's own included: Claude sends SubagentStop under the
   *  sub agent's id. Set after construction; it never changes the hook reply. */
  private onFacts?: (facts: HookFacts) => void;
  setFactsObserver(cb: ((facts: HookFacts) => void) | undefined): void {
    this.onFacts = cb;
  }
  /** Usage limits (DATA.md, limits-bar): a Claude agent's status line `rate_limits`, as sent, for
   *  main/usageLimits.ts to parse and keep. Fire and forget; it never changes the hook reply. */
  private onRateLimits?: (agentId: string | undefined, rateLimits: unknown) => void;
  setRateLimitsObserver(cb: ((agentId: string | undefined, rateLimits: unknown) => void) | undefined): void {
    this.onRateLimits = cb;
  }
  start(): void {
    this.stopped = false;
    void this.ensureListening();
  }

  /** The hook socket's live state — the beat writes it into fleet.json. */
  health(): HookSocketHealth {
    const listening = !!this.server?.listening && this.bound !== null;
    return {
      path: this.hive.sockPath(),
      listening,
      since: listening && this.bound ? this.bound.since : null,
      lastError: this.lastError,
      attempts: this.bindAttempts,
      orphans: this.orphans.length
    };
  }

  /** Make sure something is listening at HIVE_SOCK, and that it is US. Called
   *  by start() and then from the beat. Three outcomes:
   *    - not bound (never, or the last bind failed) → bind, with back-off;
   *    - bound, but the path no longer leads to our socket → we are "listening"
   *      on an orphaned inode while every shim's connect() fails: log it as lost
   *      and re-bind — unless a LIVE server owns the path now, which is never
   *      stolen;
   *    - bound and verified → nothing to do. */
  async ensureListening(): Promise<HookSocketHealth> {
    if (this.stopped || this.binding) return this.health();
    const sock = this.hive.sockPath();
    if (!sock) {
      if (this.lastError !== 'NOROOT') {
        this.lastError = 'NOROOT';
        console.warn('[hive] hook socket not bound: the hive has no root yet (the beat will retry)');
      }
      return this.health();
    }
    if (this.server?.listening && this.bound) {
      // Cheap check first (POSIX): the file at the path is still the one we bound.
      if (this.mark && sameMark(this.mark, markOf(sock))) return this.health();
      // Definitive check: does connecting to the path reach US?
      const owner = await this.probe(sock);
      if (owner === 'self') { this.mark = markOf(sock); return this.health(); }
      const code = owner === 'other' ? 'REPLACED' : 'ENOENT';
      this.detach(owner === 'other');
      console.error(`[hive] hook socket LOST (${code}): ${sock} no longer reaches our listener — every hook has been allowed meanwhile`);
      this.hive.appendLog({ kind: 'hooks', state: 'lost', path: sock, code });
      if (owner === 'other') { this.bindAttempts += 1; this.fail(sock, 'EADDRINUSE', 'another process is listening there now'); return this.health(); }
    }
    await this.bind(sock);
    return this.health();
  }

  private async bind(sock: string): Promise<void> {
    this.binding = true;
    try {
      this.bindAttempts += 1;
      // listen() would fail with EADDRINUSE, which names the wrong cause.
      if (process.platform !== 'win32' && hookSockTooLong(sock)) { this.fail(sock, 'TOOLONG', `the path is ${Buffer.byteLength(sock)} bytes, 100 at most`); return; }
      if (process.platform !== 'win32' && isShortHookSockPath(sock)) {
        try { prepareHookSockFolder(sock); } catch (e) { this.fail(sock, 'SOCKFOLDER', e instanceof Error ? e.message : String(e)); return; }
      }
      // A LINK at the socket's path is never bound through: listen() would put
      // the socket wherever the link points, outside the folder that was
      // prepared for it. A dangling one does not even show to existsSync. The
      // link is removed (never what it points at) and the socket made in its place.
      if (process.platform !== 'win32') {
        try { if (lstatSync(sock).isSymbolicLink()) rmSync(sock); } catch { /* nothing there */ }
      }
      if (process.platform !== 'win32' && existsSync(sock)) {
        // A file left by a crashed run is normal and is cleared. A file a LIVE
        // stranger accepts on is theirs: report it, never steal it.
        if (await this.probe(sock) === 'other') { this.fail(sock, 'EADDRINUSE', 'another process is listening there'); return; }
        try { rmSync(sock); } catch { /* listen() below reports it */ }
      }
      const server = createServer((conn) => this.serve(conn));
      const outcome = new Promise<string | null>((resolve) => {
        server.once('listening', () => resolve(null));
        server.once('error', (e: NodeJS.ErrnoException) => resolve(e.code ?? e.message));
      });
      // listen() binds the path — and creates the socket file — synchronously;
      // only the 'listening' event is deferred. Publish the handle and record
      // which file is ours right here, before anything else can run: a caller
      // that looks straight after start() sees the server, and a file that
      // replaces ours later can never be mistaken for it.
      // The file is made by listen() with what the umask leaves, and exists
      // from that call on: under umask 0 it was 0777 until the chmod below.
      // The umask is narrowed for the one synchronous call that makes it.
      const umaskWas = process.platform === 'win32' ? null : process.umask(0o177);
      try { server.listen(sock); } finally { if (umaskWas !== null) process.umask(umaskWas); }
      this.server = server;
      this.mark = process.platform === 'win32' ? null : markOf(sock);
      this.bound = { path: sock, since: Date.now() };
      const err = await outcome;
      if (this.server !== server) return; // stop() or a re-bind took this handle over meanwhile
      if (err !== null) {
        this.server = null;
        this.mark = null;
        this.bound = null;
        try { server.close(); } catch { /* noop */ }
        this.fail(sock, err, 'listen() failed');
        return;
      }
      server.on('error', (e) => console.error('[hive] hook server error:', e));
      // The owner alone: listen() makes the file with whatever the umask leaves (0755 under 022).
      if (process.platform !== 'win32') { try { chmodSync(sock, 0o600); } catch (e) { console.error('[hive] hook socket mode not set:', e); } }
      const recovered = this.loggedCode !== null;
      this.lastError = null;
      this.loggedCode = null;
      this.bindAttempts = 0;
      this.alerted = false;
      console.log(`[hive] hook server listening on ${sock}${recovered ? ' (recovered)' : ''}`);
      this.hive.appendLog({ kind: 'hooks', state: 'listening', path: sock, ...(recovered ? { recovered: true } : {}) });
    } finally {
      this.binding = false;
    }
  }

  /** A bind (or verify) failed: say so where an operator can find it, schedule
   *  a retry, and — once the back-off is spent — toast once per outage. */
  private fail(sock: string, code: string, detail: string): void {
    this.lastError = code;
    const i = Math.max(0, this.bindAttempts - 1);
    // Loud through the back-off, then only when the reason changes: the beat
    // keeps retrying every 15 s, and a line per beat is 5,760 lines a day.
    if (i <= BIND_RETRY_MS.length || code !== this.loggedCode) {
      console.error(`[hive] hook socket bind FAILED (${code}) at ${sock}: ${detail} — attempt ${this.bindAttempts}. Until this recovers every agent hook is ALLOWED and no cost is recorded.`);
      this.hive.appendLog({ kind: 'hooks', state: 'bind-failed', path: sock, code, attempt: this.bindAttempts });
      this.loggedCode = code;
    }
    if (i < BIND_RETRY_MS.length) {
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => { this.retryTimer = null; void this.ensureListening(); }, BIND_RETRY_MS[i]);
      this.retryTimer.unref();
    } else if (!this.alerted) {
      this.alerted = true;
      this.notify('Hive hooks are down', `Nothing is listening at ${sock} (${code}). Every agent hook is being allowed and no cost is recorded until this recovers.`);
    }
  }

  /** One shim connection: a bounded, newline-delimited JSON frame in (#399),
   *  a JSON reply out. The ownership ping is answered here and never reaches
   *  handle(). */
  private serve(conn: Socket): void {
    let pending = Buffer.alloc(0);
    const rejectOversizedFrame = (bytes: number): void => {
      this.hive.appendLog({
        kind: 'hook-frame-rejected',
        reason: 'frame-too-large',
        bytes,
        limit: MAX_HOOK_FRAME_BYTES,
      });
      conn.destroy();
    };
    conn.on('data', (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      const nl = pending.indexOf(0x0a);
      if (nl === -1) {
        if (pending.length > MAX_HOOK_FRAME_BYTES) rejectOversizedFrame(pending.length);
        return; // wait for the full line
      }
      // The byte limit covers the JSON payload and excludes its newline.
      if (nl > MAX_HOOK_FRAME_BYTES) {
        rejectOversizedFrame(nl);
        return;
      }
      // Hook shims send one newline-delimited request per connection and stop writing.
      // conn.end() below closes the connection after that single frame is handled.
      const frame = pending.subarray(0, nl).toString('utf8');
      let payload: HookPayload = {};
      try { payload = JSON.parse(frame); } catch { /* ignore */ }
      if (!payload || typeof payload !== 'object') payload = {};
      if (typeof payload.ping === 'string') { conn.end(JSON.stringify({ pong: payload.ping, instance: this.instanceId })); return; }
      let res: unknown = {};
      try { res = this.handle(payload); } catch { res = {}; }
      const steered = this.steersOut.get(payload);
      if (steered && conn.destroyed) { this.control?.returnSteer(steered.agentId, steered.text); return; }
      conn.end(JSON.stringify(res ?? {}), () => { if (steered) this.steerLanded(steered); });
    });
    conn.on('error', () => { /* shim hung up — ignore */ });
  }

  /** Connect to the path and ask who is there. */
  private probe(sock: string, timeoutMs = 750): Promise<PathOwner> {
    return new Promise((resolve) => {
      let settled = false;
      let connected = false;
      let data = '';
      const nonce = randomUUID();
      const finish = (v: PathOwner): void => {
        if (!settled) { settled = true; resolve(v); }
        try { c.destroy(); } catch { /* noop */ }
      };
      const c = createConnection(sock, () => { connected = true; c.write(JSON.stringify({ ping: nonce }) + '\n'); });
      c.setEncoding('utf8');
      c.on('data', (d) => { data += d; });
      c.on('end', () => {
        try {
          const r = JSON.parse(data) as { pong?: string; instance?: string };
          finish(r.pong === nonce && r.instance === this.instanceId ? 'self' : 'other');
        } catch { finish('other'); }
      });
      c.on('error', () => finish(connected ? 'other' : 'nobody'));
      setTimeout(() => finish(connected ? 'other' : 'nobody'), timeoutMs).unref();
    });
  }

  /** Let go of the current listener. Closing it is right ONLY while the path
   *  still leads to our socket (or to nothing): libuv unlink(2)s the path by NAME
   *  on close, so closing a listener whose path a live stranger has since bound
   *  deletes THEIR socket — the app is up, hooks.sock is gone, every hook
   *  allows, nothing is logged (#277). In that case the handle is abandoned
   *  instead: unreachable by path, one fd, reclaimed at exit. */
  private detach(orphan: boolean): void {
    const s = this.server;
    this.server = null;
    this.mark = null;
    this.bound = null;
    if (!s) return;
    if (orphan) {
      try { s.unref(); } catch { /* noop */ }
      this.orphans.push(s);
      return;
    }
    try { s.close(); } catch { /* noop */ }
  }

  /** The SOCKET only. The #175 http listener is never stopped or restarted
   *  here (or by any re-bind above): it lives for the whole app run and only
   *  stopHttp() at quit closes it. */
  stop(): void {
    this.stopped = true;
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
    // Synchronous (quit and relaunch paths cannot wait for a probe): the file
    // at the path is ours → close, and libuv removes it; missing → close, the
    // unlink is a no-op; a DIFFERENT file → someone else bound the path after
    // us, leave their socket alone and abandon ours.
    const sock = this.bound?.path ?? null;
    const now = sock && process.platform !== 'win32' ? markOf(sock) : null;
    const stranger = !!this.mark && !!now && !sameMark(this.mark, now);
    this.detach(stranger);
  }

  /** Bind the loopback HTTP listener once per app run (127.0.0.1, a free port).
   *  Resolves the endpoint, or null when it could not bind; every spawn then
   *  keeps the command hooks. Calling it again returns the same endpoint. */
  startHttp(): Promise<HookHttpEndpoint | null> {
    if (this.http) return Promise.resolve(this.httpEndpoint());
    return new Promise((resolve) => {
      const server = createHttpServer((req, res) => this.onHttp(req, res));
      this.http = server;
      server.on('error', (e) => {
        console.error('[hive] hook http listener error:', e);
        if (this.httpPort === null) resolve(null);
      });
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        this.httpPort = addr && typeof addr === 'object' ? addr.port : null;
        resolve(this.httpEndpoint());
      });
    });
  }

  /** The bound endpoint, or null before the listener is up. */
  httpEndpoint(): HookHttpEndpoint | null {
    return this.httpPort === null ? null : { port: this.httpPort, token: this.httpToken };
  }

  /** App quit only. See the `http` field for why stop() leaves it alone. */
  stopHttp(): void {
    try { this.http?.close(); } catch { /* noop */ }
    this.http = null;
    this.httpPort = null;
  }

  private httpTokenOk(header: string | undefined): boolean {
    const want = Buffer.from(`Bearer ${this.httpToken}`);
    const got = Buffer.from(header ?? '');
    return got.length === want.length && timingSafeEqual(got, want);
  }

  /** One hook per request: POST /hook/<agentId>, JSON body, JSON reply. Routed
   *  into the SAME handle() as the socket so the two paths cannot drift. */
  private onHttp(req: IncomingMessage, res: ServerResponse): void {
    const m = /^\/hook\/([^/?#]+)$/.exec(req.url ?? '');
    if (req.method !== 'POST' || !m) {
      res.writeHead(404).end();
      return;
    }
    if (!this.httpTokenOk(req.headers.authorization)) {
      // One line, never the token (neither ours nor what was sent).
      this.hive.appendLog({ kind: 'hook-http-rejected', reason: 'bad-token' });
      res.writeHead(401).end();
      return;
    }
    const chunks: Buffer[] = [];
    let bytes = 0;
    let rejected = false;
    req.on('data', (chunk: Buffer) => {
      if (rejected) return;
      bytes += chunk.length;
      if (bytes > MAX_HOOK_FRAME_BYTES) {
        // Same limit and the same log line as an oversized socket frame.
        rejected = true;
        this.hive.appendLog({
          kind: 'hook-frame-rejected',
          reason: 'frame-too-large',
          bytes,
          limit: MAX_HOOK_FRAME_BYTES,
        });
        res.writeHead(413, { connection: 'close' }).end();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) return;
      let payload: HookPayload = {};
      try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* ignore */ }
      if (!payload || typeof payload !== 'object') payload = {};
      let urlId = '';
      try { urlId = decodeURIComponent(m[1]); } catch { /* an id that does not decode names no agent */ }
      // The shim's rule, exactly: a payload that names an agent keeps it (Claude's
      // own sub agent id, today), and the URL id only fills a missing one.
      if (!payload.agent_id) payload.agent_id = urlId || null;
      let out: unknown = {};
      try { out = this.handle(payload); } catch { out = {}; }
      // The CLI gave up on this hook and hung up: the steer goes back for the next one, not into a closed socket.
      const steered = this.steersOut.get(payload);
      if (steered && (res.destroyed || req.socket.destroyed)) { this.control?.returnSteer(steered.agentId, steered.text); return; }
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out ?? {}), () => { if (steered) this.steerLanded(steered); });
    });
    req.on('error', () => { /* client hung up, ignore */ });
  }

  /** The transcript file of an agent's CURRENT session, if any hook has fired. */
  transcriptPath(agentId: string): string | undefined {
    return this.transcriptPaths.get(agentId);
  }

  /** The latest context-window accounting for an agent (current tokens + the real
   *  window size), or undefined if no statusLine tick has fired for it yet. */
  contextFor(agentId: string): { tokens: number; limit: number; ts: number } | undefined {
    return this.contextById.get(agentId);
  }

  private handle(p: HookPayload): unknown {
    const agentId = p.agent_id ?? undefined;
    const event = p.hook_event_name ?? 'Unknown';
    // Autosend proof first, before any other work here can delay it.
    this.proof.note(agentId, event, p.prompt, { message: p.message, tool: p.tool_name });
    // The session and turn events as they arrive, so a hook lost in the CLI can be told from one lost here.
    // Tool events are left out: they add nothing to delivery and come by the hundred. A prompt's tail
    // length only, never its text.
    if (LOGGED_HOOKS.has(event)) try {
      this.hive.appendLog({ kind: 'hook-seen', event, agentId: agentId ?? null, ...(event === 'UserPromptSubmit' && typeof p.prompt === 'string' ? { tailLen: promptTail(p.prompt).length } : {}) });
    } catch { /* the log never affects the reply */ }
    this.onEvent?.(agentId, event, p.message, p.tool_name, p.source);
    try {
      this.onFacts?.({ agentId, event, tool: p.tool_name, toolInput: p.tool_input, sessionId: p.session_id, agentType: p.agent_type, source: p.source });
    } catch { /* an observer must never affect the hook reply */ }
    if (agentId && typeof p.transcript_path === 'string' && p.transcript_path) {
      this.transcriptPaths.set(agentId, p.transcript_path);
    }
    if (this.onUsageEvent && agentId && typeof p.transcript_path === 'string' && p.transcript_path
      && typeof p.session_id === 'string' && p.session_id
      && (event === 'PostToolUse' || event === 'Stop' || event === 'PostCompact')) {
      try {
        this.onUsageEvent({
          agentId,
          event,
          transcriptPath: p.transcript_path,
          sessionId: p.session_id,
          model: typeof p.model === 'string' ? p.model : ''
        });
      } catch { /* usage observation must never affect the hook reply */ }
    }

    // Status-line payloads carry the session's EXACT context accounting —
    // current tokens AND the real window size (200k vs 1M, which nothing else
    // exposes). Forward to the renderer for the agent-card context gauge.
    // Handled FIRST and returned early: this is pure telemetry from the
    // statusLine shim, not a real hook boundary — it must never trip the
    // HALT gate or feed the breaker's loop detector below. The early return
    // also (deliberately) skips recordSession for status ticks: a statusLine
    // payload's session_id adds nothing the real hooks don't already record,
    // and telemetry should never write to the registry. transcript_path IS
    // still captured above, where every payload shape benefits from it.
    // 0.5.3 bug 2(a): the model the agent is actually running. Claude Code sends
    // it on the status line and nowhere else, Codex on every hook payload, and
    // neither was read, so a `/model` inside the CLI never reached the sidebar.
    // BEFORE the Status return below: that tick is the only Claude source.
    const liveModel = liveModelOf(p);
    if (agentId && liveModel && this.modelById.get(agentId) !== liveModel) {
      this.modelById.set(agentId, liveModel);
      this.getWebContents()?.send('hive:modelUpdate', { agentId, model: liveModel });
    }

    if (event === 'Status') {
      if (p.rate_limits && typeof p.rate_limits === 'object') {
        try { this.onRateLimits?.(agentId, p.rate_limits); } catch { /* the limits never affect a hook */ }
      }
      const cw = p.context_window;
      if (agentId && cw && typeof cw.total_input_tokens === 'number'
        && typeof cw.context_window_size === 'number' && cw.context_window_size > 0) {
        // Retain for main-side reads (voice get_agent_detail / list_agents) …
        this.contextById.set(agentId, {
          tokens: cw.total_input_tokens,
          limit: cw.context_window_size,
          ts: Date.now()
        });
        // … and forward live to the renderer's agent-card context gauge.
        this.getWebContents()?.send('hive:contextUpdate', {
          agentId,
          tokens: cw.total_input_tokens,
          limit: cw.context_window_size
        });
      }
      return {};
    }

    // 7C.3 — a graceful operator HALT overrides everything (incl. the inbox
    // drain below): stop the agent CLEANLY at this hook boundary rather than
    // killing the PTY. session_id is in the payload for a later --resume.
    if (agentId && this.control?.shouldHalt(agentId)) {
      this.emit(agentId, event, p);
      return { continue: false, stopReason: 'Halted by the operator from the floor.' };
    }

    // Capture the Claude Code session id for idempotent --resume + cost dedup
    // (Lane A #6.6a). Cheap: recordSession writes only when it changes.
    if (agentId && p.session_id) this.hive.recordSession(agentId, p.session_id);

    // CostSample — synthesized by the proxy-bridge sidecar (qwen) on every
    // response with usage. Persist it to the SAME cost ledger as Claude's OTel
    // path, keyed by the synthesized session_id, then return early so cost stays
    // OUT of the Claude-only OTel/breaker/drain paths below. `usd` is the fallback
    // per-model estimate (a local model normally costs ~$0, but the row keeps the
    // accounting schema uniform). Pure telemetry — never feeds the loop detector.
    if (event === 'CostSample') {
      if (agentId && p.session_id) {
        const input = p.input ?? 0;
        const output = p.output ?? 0;
        const cacheRead = p.cache_read ?? 0;
        const cacheCreation = p.cache_creation ?? 0;
        this.hive.appendCostLedger({
          agentId,
          sessionId: p.session_id,
          ts: Date.now(),
          input,
          output,
          cacheRead,
          cacheCreation,
          model: liveModel ?? '',
          usd: estimateCostUsd(liveModel, {
            inputTokens: input,
            outputTokens: output,
            cacheReadTokens: cacheRead,
            cacheWriteTokens: cacheCreation
          })
        });
      }
      return {};
    }

    // Feed the breaker its hook-derived loop signal: a tool that actually ran.
    // A repeated identical (name+input) PostToolUse is the runaway-loop tell.
    if (event === 'PostToolUse' && agentId) {
      this.breaker?.recordToolUse(agentId, p.tool_name, p.tool_input);
    }

    // A human just spoke to this agent (issue #376): stamp the third progress
    // clock the no-progress arm reads. A conversation is prose in, prose out —
    // no hive file changes, no tool spans — which the arm otherwise reads as
    // "generating tokens without coordinating". A runaway loop is ONE prompt
    // followed by many tool calls, so this clock goes stale exactly when it
    // should and blinds nothing.
    if (event === 'UserPromptSubmit' && agentId) {
      this.breaker?.recordUserPrompt(agentId);
    }

    // Compaction exemption (issue #109): PreCompact opens it so the compaction
    // token burst can't trip the Δoutput arms; PostCompact — or any SessionStart,
    // since a fresh session makes in-flight compaction state moot — closes it
    // down to the trailing grace (a no-op when nothing was compacting).
    if (event === 'PreCompact' && agentId) this.breaker?.recordCompactStart(agentId);
    if ((event === 'PostCompact' || event === 'SessionStart') && agentId) {
      this.breaker?.recordCompactEnd(agentId);
    }

    if ((event === 'Stop' || event === 'SubagentStop') && agentId) {
      // Respect any upstream Stop hook that already re-entered this boundary.
      if (p.stop_hook_active) { this.emit(agentId, event, p); return {}; }
      // Never turn unread hive mail into a forced continuation at Stop. That old
      // path bypassed terminal-draft/HITL safety and could spend credits while a
      // user was answering a question. Inbox files remain durable; the renderer
      // wakes the agent later through its guarded idle-only delivery path.
      this.notify(agentId ?? 'Agent', 'finished — idle');
      this.emit(agentId, event, p);
      return {};
    }

    // 7C.1 — HITL gate: deny a tool call at the PreToolUse boundary when the
    // agent is paused or this tool is gated. Race-free (immediate return, no
    // renderer round-trip → can't hit the shim timeout). Slow human APPROVAL is
    // deliberately left to Claude's native permission prompt.
    if (event === 'PreToolUse' && agentId && this.control) {
      const d = this.control.toolDecision(agentId, p.tool_name ?? '');
      if (d.deny) {
        this.emitControl(agentId, p.tool_name, d.reason);
        this.emit(agentId, event, p);
        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: d.reason ?? 'Denied by operator.'
          }
        };
      }
    }

    // 7C.2 — mid-run steering: inject queued operator guidance as context on the
    // next eligible hook (no fragile typing into the TUI). Delivered once.
    // Merged with the roster line below so the two injections never displace each
    // other (only ONE additionalContext can be returned per hook).
    let steer: string | null = null;
    if ((event === 'UserPromptSubmit' || event === 'PostToolUse') && agentId && this.control) {
      steer = this.control.takeSteer(agentId) ?? null;
      if (steer) this.steersOut.set(p, { agentId, event, text: steer });
    }

    // Keep god's roster CURRENT. fleet.json is always fresh on disk, but god's
    // context is not: after a restart it resumes a transcript describing the old
    // floor and messages agents that are long gone. Push the live roster in as
    // additionalContext at the start of each session and on every prompt, so god
    // knows the floor all the time instead of only when it remembers to Read.
    // God-only and one line — every other agent is unaffected.
    const wantsRoster = (event === 'SessionStart' || event === 'UserPromptSubmit')
      && !!agentId && this.hive.isGod(agentId);
    // Hand the roster the LIVE context-window occupancy (contextById) so each
    // agent line can carry a `ctx NN%` — god then sees whose context is nearly
    // full when it routes work, instead of guessing from cumulative token spend.
    const roster = wantsRoster
      ? this.hive.rosterContext((id) => this.contextFor(id))
      : null;

    // Standing goal (hire Briefing) — durable roster field, re-read every cycle so
    // an Edit Agent save is picked up on the next UserPromptSubmit without
    // restarting the worker. Deliver it once at SessionStart, then only when its
    // value changes; repeating an unchanged briefing on every prompt can make it
    // one of the largest elements in a long transcript. Kept out of
    // --append-system-prompt (volatile-free cache invariant); lives on the live
    // hook channel instead.
    const wantsGoal = (event === 'SessionStart' || event === 'UserPromptSubmit') && !!agentId;
    const goalRaw = wantsGoal ? (this.getStandingGoal?.(agentId) ?? null) : null;
    let goal: string | null = null;
    if (wantsGoal) {
      const sessionId = p.session_id ?? null;
      const delivered = this.deliveredGoalByAgent.get(agentId);
      const newSession = !delivered || delivered.sessionId !== sessionId;
      const changed = !!delivered && delivered.sessionId === sessionId && delivered.goal !== goalRaw;
      if (event === 'SessionStart' || newSession || changed) {
        this.deliveredGoalByAgent.set(agentId, { sessionId, goal: goalRaw });
        if (goalRaw) {
          goal = `<goal>\n${goalRaw}\n</goal>`;
        } else if (changed && delivered?.goal) {
          // Silence would leave the old briefing alive in the model's context.
          // Explicitly revoke it when the operator clears the durable field.
          goal = '<goal>\n[Cleared by the operator. Stop following the previous standing goal.]\n</goal>';
        }
      }
    }

    // Response style (v0.4.10) — the house brief for HOW to answer, user editable
    // in Settings and read fresh from the config on every boundary, so a save
    // reaches every hooks-bridge engine (claude, codex, gemini, grok) on its next
    // turn with NO restart. The two engines with no hook bridge (cursor, copilot)
    // get the identical block prepended to the text typed into their PTY by
    // useHive.ts; both sides render through renderResponseStyle so they cannot
    // drift. Every agent gets one — an absent/empty config value normalizes to
    // the shipped default rather than to nothing.
    //
    // CACHE: this string is re-sent on every UserPromptSubmit, so it must be
    // volatile free. shared/responseStyle.ts reads no clock, no counter and no
    // agent id, which is why the same brief renders byte identical turn after
    // turn. Same discipline as injectedPrompt()'s cache-invariance note.
    const wantsStyle = (event === 'SessionStart' || event === 'UserPromptSubmit') && !!agentId;
    const style = wantsStyle ? renderResponseStyle(this.getConfig().responseStyle) : null;

    // PreInvocation is EVERY model step in Antigravity. Give identity only
    // at the first boundary of a session. Its conversationId reaches us as
    // session_id; Codex/Grok also report SessionStart on clear. An explicit
    // clear re-arms even an engine that keeps the same session id.
    if (agentId && (event === 'SessionEnd' || (event === 'SessionStart' && p.source === 'clear'))) {
      this.deliveredIdentityByAgent.delete(agentId);
    }
    let identity: string | null = null;
    if (agentId && (event === 'SessionStart' || event === 'UserPromptSubmit' || event === 'PreInvocation')) {
      const delivered = this.deliveredIdentityByAgent.get(agentId);
      // A hook omitting the id is not evidence of a new session.
      const sessionId = p.session_id ?? delivered ?? null;
      if (!this.deliveredIdentityByAgent.has(agentId) || sessionId !== delivered) {
        identity = this.hive.sessionIdentity?.(agentId) ?? null;
        if (identity) this.deliveredIdentityByAgent.set(agentId, sessionId);
      }
    }

    if (steer || roster || goal || style || identity) {
      this.emit(agentId, event, p);
      return {
        hookSpecificOutput: {
          hookEventName: event,
          // ORDER, deliberately: style, stable identity, roster, goal, steer.
          //  - The style leads because it is the only invariant piece. It is the
          //    same text on every turn for every agent, so putting it ahead of the
          //    roster (whose token/cost/ctx numbers move every turn) keeps the
          //    stable prefix of this block stable.
          //  - The style is HOW to answer and the goal is WHAT to do, so the goal
          //    sits closer to the work: a standing tone brief must never read as
          //    if it outranks the mission.
          //  - The steer stays last, where it already was. It is the operator
          //    speaking about THIS turn, and the most immediate instruction is
          //    the one that should be read last.
          additionalContext: [style, identity, roster, goal, steer].filter(Boolean).join('\n\n')
        }
      };
    }

    // A Notification hook that means "the agent is blocked waiting for the user"
    // (idle prompt) deserves a desktop toast too — distinct from a permission
    // request, which surfaces natively in the agent's own Claude Code session
    // (approvable remotely via /remote-control).
    if (
      event === 'Notification' &&
      (p.notification_type === 'idle' ||
        (p.message ?? '').toLowerCase().includes('waiting for your input'))
    ) {
      this.notify(agentId ?? 'Agent', p.message ?? 'needs your attention');
    }

    // Forward everything else to the renderer so avatars reflect real activity.
    this.emit(agentId, event, p);
    return {};
  }


  /** Fire a native desktop notification — gated on the user's `notifications`
   *  setting. Only the OS toast is gated; the hive:hookEvent emit is always sent
   *  so avatars/UI stay live regardless. Best-effort: never throw into the hook. */
  private notify(title: string, body: string): void {
    if (!this.getConfig().notifications) return;
    try {
      this.notifier?.(title, body);
    } catch { /* notifications unsupported on this platform — ignore */ }
  }

  /** How a toast is shown: the host's business. The app sets Electron's
   *  Notification; with none set, no toast is shown and the hook goes on. The
   *  `notifications` setting is checked above, in `notify`. */
  private notifier: ((title: string, body: string) => void) | null = null;
  setNotifier(notifier: ((title: string, body: string) => void) | null): void {
    this.notifier = notifier;
  }

  /** Tell the renderer a tool call was gated/denied (#7C.1) so it can surface it
   *  (toast / control strip) — distinct from the avatar hook stream. */
  private emitControl(agentId: string, tool: string | undefined, reason: string | undefined): void {
    this.getWebContents()?.send('control:approvalRequest', { agentId, tool, reason });
  }

  /** A steer's proof: the reply that carries it was written to the CLI. A steer is never typed, so this is its
   *  pty-submit line, and the window says delivered only from here. Never the text. */
  private steerLanded(s: { agentId: string; event: string; text: string }): void {
    this.hive.appendLog({ kind: 'pty-submit', agentId: s.agentId, source: 'steer', chars: s.text.length, event: s.event, proof: 'hook', outcome: 'submitted' });
    this.getWebContents()?.send('hive:steerLanded', { agentId: s.agentId, tail: promptTail(s.text) });
  }

  private emit(agentId: string | undefined, event: string, p: HookPayload, blocked = false): void {
    const payload = {
      agentId,
      event,
      tool: p.tool_name,
      notificationType: p.notification_type,
      source: p.source,
      message: p.message,
      blocked,
      ...(event === 'UserPromptSubmit' && typeof p.prompt === 'string' ? { promptTail: promptTail(p.prompt) } : {})
    };
    if (!validateHookEvent(payload)) {
      console.warn('[hive] rejected invalid hook event:', event);
      return;
    }
    this.getWebContents()?.send('hive:hookEvent', payload);
  }
}

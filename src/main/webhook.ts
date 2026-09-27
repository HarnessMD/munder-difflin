/**
 * WebhookServer — a generic, secret-gated inbound HTTP API that turns external
 * POSTs into hive work and lets each caller poll that work's status by a token.
 *
 * MANY endpoints, ONE server, ONE tunnel. Endpoints are told apart by the id in
 * the request path, so adding a webhook costs no extra port and no extra tunnel:
 *   - POST /<webhookId>  + `x-md-webhook-secret: <that endpoint's secret>`
 *       + JSON body matching THAT endpoint's user-editable schema
 *       → 200 `{ ok, token, taskId }`  when the endpoint's TriggerMode lets the
 *         message through (routed to god, kanban card created), or
 *       → 202 `{ ok, pending: true, token, status: 'awaiting-approval' }` when the
 *         mode holds it for the operator. Either way the caller gets its token.
 *   - GET  /<webhookId>  + `x-md-webhook-token: <token>` (or `?token=`)
 *       → returns ONLY that token's task status: `{ ok, status, title, result? }`.
 *   - POST / (bare) is an alias for the endpoint with id `legacy`, so a caller
 *     holding the pre-multi-endpoint URL keeps working across the upgrade.
 *
 * SECURITY — this is a PUBLIC surface (tunnel-forwarded), unlike the loopback
 * /reply endpoint, so the gate is strict. Every property of the single-endpoint
 * version is preserved, plus the ones multi-tenancy adds:
 *   - constant-time secret comparison (`timingSafeEqual`, length-guarded), against
 *     THAT endpoint's secret only — revoking one endpoint cannot affect another,
 *   - an UNKNOWN endpoint id is answered exactly like a WRONG secret: the compare
 *     still runs (against an unguessable per-process decoy) and the reply is the
 *     same 401 body, so the surface can't be walked to discover which ids exist,
 *   - GET does its token lookup whether or not the id is known, for the same
 *     reason: identical work, identical 404 — no enumeration signal,
 *   - secrets are held only in this class, and NEVER logged, echoed, or forwarded
 *     into the routed message / card / response (the handler is handed `{id,name}`,
 *     not the endpoint record),
 *   - the capability token is unguessable (minted by the caller-side handler,
 *     192-bit) and a GET reveals only the single task it maps to — no listing,
 *   - a request body cap + fixed-window rate limits (GLOBAL *and* per-endpoint, so
 *     one noisy caller can't starve the others) bound abuse before parsing/crypto.
 *
 * Runs in the Electron main process. Deliberately free of any `electron` import so
 * it can be unit-/smoke-tested as a plain Node module. The actual card creation +
 * god routing + token→status lookup are injected as callbacks (they need hive
 * access, which lives in the main entrypoint); this class owns only transport,
 * the secret gate, schema validation, rate limiting, and the tunnel.
 */
import { createServer, type IncomingHttpHeaders, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { hasServiceSignature, inboundFromService, isServiceSource, verifyServiceSignature, type ServiceSource } from './serviceWebhooks';
import { validateAgainstSchema, type InboundKind, type WebhookAuth, type WebhookSource } from '../shared/triggers';
import type { BoundPort } from '../shared/boundPort';
// NOTE: `tunnelmole` is an ESM-only package. The Electron main process is bundled
// as CommonJS, so a static `import` gets externalized into `require('tunnelmole')`
// and throws ERR_REQUIRE_ESM at load. It is imported dynamically inside
// `openTunnel()` instead — Rollup preserves dynamic import() in CJS output, which
// can load ESM. Do not hoist this back to a top-level import.

/** One servable endpoint — the structural subset of `WebhookTrigger` this class
 *  needs. A whole `WebhookTrigger` is assignable, so callers pass config rows
 *  straight in without a mapping step. */
export interface WebhookEndpoint {
  id: string;
  name: string;
  /** Shared secret the caller echoes in `x-md-webhook-secret`. Never leaves this class. */
  secret: string;
  /** User-editable JSON Schema (serialised) inbound bodies are checked against. */
  schema: string;
  /** GitHub, Linear or Telegram: their own signature and payload instead of
   *  ours (main/serviceWebhooks.ts). Absent or `custom` is our contract. */
  source?: WebhookSource;
  /** A custom caller's proof: header (default), bearer or hmac. */
  auth?: WebhookAuth;
}

/** What the dispatch handler is told about the endpoint a message arrived on.
 *  DELIBERATELY excludes `secret`: the handler writes cards, hive messages and
 *  history rows, and none of them may ever be able to carry a live credential. */
export interface WebhookEndpointRef {
  id: string;
  name: string;
}

/** The validated body of an accepted POST — just the work to do plus the sender's
 *  own framing of it. The secret has already been verified and is intentionally
 *  NOT part of this shape, so it can never be forwarded onward. */
export interface WebhookInbound {
  message: string;
  title?: string;
  /** Declared by the caller when they bothered to; the handler classifies when not. */
  kind?: InboundKind;
  /** Who is sending, for the trigger history. Falls back to the endpoint name. */
  from?: string;
}

/** What the handler did with an accepted message. `pending` is the whole point of
 *  the split: the caller is told, honestly, whether work actually started. */
export interface WebhookDispatch {
  /** Capability token to hand back — the ONLY echo, and only ever returned once. */
  token: string;
  /** Kanban card id; absent while a message waits for the operator (no card yet). */
  taskId?: string;
  /** true = held for operator approval (→ 202), false = routed to god (→ 200). */
  pending: boolean;
}

/** What a GET exposes for a token — mirrors the kanban's public columns only,
 *  plus the synthetic statuses a held message reports before it becomes work. */
export interface WebhookTaskStatus {
  status: string;
  title: string;
  result?: string;
}

export interface WebhookServerOptions {
  /** Local TCP port the HTTP server binds to (and the tunnel forwards to). */
  port: number;
  /** The endpoints to serve. May be swapped later with `setEndpoints`. */
  endpoints: WebhookEndpoint[];
  /** How the public tunnel is opened. The app leaves this out and gets
   *  tunnelmole; a test passes its own so no network is touched. */
  openTunnel?: (port: number) => Promise<string>;
  /**
   * Turn a verified POST into hive work (or into a held message awaiting the
   * operator). Return null to signal a server-side failure (→ 500). The token it
   * returns is the ONLY thing echoed to the caller; no secret ever reaches here.
   */
  onMessage: (msg: WebhookInbound, endpoint: WebhookEndpointRef) => WebhookDispatch | null;
  /**
   * Resolve a capability token to its task's public status, or null when the
   * token maps to nothing (→ 404). MUST be scoped to the one token — it must
   * never reveal or enumerate any other task.
   */
  lookupStatus: (token: string) => WebhookTaskStatus | null;
}

/** Reject bodies larger than this before buffering — callers send tiny JSON; the
 *  cap stops an unauthenticated peer forcing unbounded memory use pre-auth. */
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB
/** Cap how long we wait for the public tunnel before giving up (server stays up). */
const TUNNEL_START_TIMEOUT_MS = 10_000;
/** Basic abuse guard: at most this many requests per fixed window, globally. */
const RATE_LIMIT = 120;
/** …and this many per endpoint, so one noisy caller burns its own budget first
 *  instead of everyone's. Strictly below the global cap, or it would never bind. */
const PER_ENDPOINT_RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

/** Bare `POST /` keeps serving the endpoint the pre-multi-endpoint migration
 *  parked under this id, so a caller already pointed at the old URL is unaffected. */
export const LEGACY_ENDPOINT_ID = 'legacy';

/** Rate-limit bucket shared by EVERY unknown id. One bucket, not one per id:
 *  per-id buckets for ids we don't serve would let a prober both grow our memory
 *  unboundedly and — worse — observe that unknown ids never hit the per-endpoint
 *  limit while real ones do. Sharing one bucket makes the two indistinguishable. */
const UNKNOWN_BUCKET = ':unknown';

export class WebhookServer {
  private server: Server | null = null;
  private tunnelUrl: string | null = null;
  /** The port this server is bound to, or will try first. It moves when the
   *  asked for port is taken (0.5.3, the rest of bug 11), and the tunnel follows. */
  private port: number;
  /** The port config asked for. Only ever reported, never bound again. */
  private readonly requestedPort: number;
  /** Set when the asked for port was taken and the server moved off it. */
  private movedFromPort: number | undefined;
  private readonly tunnelOpener?: (port: number) => Promise<string>;
  private endpoints = new Map<string, WebhookEndpoint>();
  private readonly onMessage: (msg: WebhookInbound, endpoint: WebhookEndpointRef) => WebhookDispatch | null;
  private readonly lookupStatus: (token: string) => WebhookTaskStatus | null;
  /** Compared against when the requested id doesn't exist, purely so the failure
   *  path does the same work as a wrong-secret failure. Random per process and
   *  never exported, so it cannot be matched even by accident. */
  private readonly decoySecret = randomBytes(32).toString('hex');
  // Fixed-window rate limiters keyed by bucket ('' = global, else the endpoint id).
  // The remote IP is the tunnel's, so per-IP would be meaningless behind tunnelmole.
  private windows = new Map<string, { start: number; count: number }>();

  constructor(opts: WebhookServerOptions) {
    this.port = opts.port;
    this.requestedPort = opts.port;
    this.tunnelOpener = opts.openTunnel;
    this.onMessage = opts.onMessage;
    this.lookupStatus = opts.lookupStatus;
    this.setEndpoints(opts.endpoints);
  }

  /**
   * Swap the served endpoint list WITHOUT restarting the server or the tunnel —
   * the operator adds, edits and revokes webhooks from the UI, and a restart would
   * mint a fresh (ephemeral) tunnel URL, silently breaking every caller of every
   * OTHER endpoint. The map is rebuilt wholesale so a removed id stops resolving
   * on the very next request.
   */
  setEndpoints(list: WebhookEndpoint[]): void {
    const next = new Map<string, WebhookEndpoint>();
    for (const e of list) {
      if (!e || typeof e.id !== 'string' || !e.id || typeof e.secret !== 'string' || !e.secret) continue;
      next.set(e.id, e);
    }
    this.endpoints = next;
    // Drop rate-limit state for ids we no longer serve; keep the global and
    // unknown buckets so a swap can't be used to reset an in-flight flood.
    for (const key of [...this.windows.keys()]) {
      if (key === '' || key === UNKNOWN_BUCKET) continue;
      if (!next.has(key)) this.windows.delete(key);
    }
  }

  /** Ids currently served, for the settings surface that shows per-endpoint URLs. */
  endpointIds(): string[] {
    return [...this.endpoints.keys()];
  }

  /** The public tunnel URL, or null when no tunnel is up. */
  publicUrl(): string | null {
    return this.tunnelUrl;
  }

  /** Where the server really is, for Settings (shared/boundPort.ts). Empty when
   *  it is not bound. */
  boundPort(): BoundPort {
    if (!this.server) return {};
    return { port: this.port, ...(this.movedFromPort !== undefined ? { movedFrom: this.movedFromPort } : {}) };
  }

  /** Is the local HTTP server bound? `start()` reports ok:false for a tunnel
   *  failure too, and in THAT case the security boundary is still live — the
   *  caller must keep the instance (or the listener leaks, unstoppable). */
  listening(): boolean {
    return this.server != null;
  }

  /**
   * Bind the local HTTP server, then open a public tunnel to it. The HTTP handler
   * (the security boundary) is live the instant `listen` resolves; the tunnel is
   * opened afterwards and is non-fatal — if it can't be established the server
   * keeps running and we report the tunnel error without a URL.
   */
  async start(): Promise<{ ok: boolean; url?: string; error?: string } & BoundPort> {
    if (this.server) return { ok: false, error: 'already running' };
    if (this.endpoints.size === 0) return { ok: false, error: 'no enabled webhook endpoints' };
    this.movedFromPort = undefined;
    try {
      await this.listen(this.requestedPort);
    } catch (e) {
      // 0.5.3, the rest of bug 11. A taken port used to leave every webhook off
      // until the person found what held it. Callers through the tunnel do not
      // know the local port, and the tunnel is opened below to whatever was
      // bound, so for them a free port is as good. A LOCAL caller pointed at the
      // configured port does break, which is why the move is reported
      // (boundPort) and shown in Settings instead of being silent.
      if ((e as NodeJS.ErrnoException)?.code !== 'EADDRINUSE') {
        this.stop();
        return { ok: false, error: `failed to bind port ${this.requestedPort}: ${errMsg(e)}` };
      }
      try {
        await this.listen(0);
        this.movedFromPort = this.requestedPort;
      } catch (e2) {
        this.stop();
        return { ok: false, error: `failed to bind port ${this.requestedPort} (in use) or any free port: ${errMsg(e2)}` };
      }
    }
    const bound = this.boundPort();
    try {
      const url = await this.openTunnel();
      if (!url) throw new Error('tunnelmole returned empty URL');
      this.tunnelUrl = url;
      // tunnelmole runs in the background; there is no close handle to wire here.
      return { ok: true, url, ...bound };
    } catch (e) {
      // Surface the tunnel failure rather than silently returning ok:true with no url.
      return { ok: false, error: `tunnel unavailable: ${errMsg(e)}`, ...bound };
    }
  }

  /** Close the HTTP server. Idempotent and best-effort.
   *  Note: tunnelmole has no documented close handle; teardown is best-effort. */
  stop(): void {
    this.tunnelUrl = null;
    try { this.server?.close(); } catch { /* noop */ }
    this.server = null;
    this.movedFromPort = undefined;
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
    // TODO: optional persistent domain — pass `domain` here when config carries one.
    // Dynamic import keeps the ESM-only `tunnelmole` out of the CJS require graph.
    const { tunnelmole } = await import('tunnelmole');
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out')), TUNNEL_START_TIMEOUT_MS);
      tunnelmole({ port: this.port })
        .then((url) => { clearTimeout(timer); resolve(url); })
        .catch((e) => { clearTimeout(timer); reject(e); });
    });
  }

  /** Fixed-window limiter — bounds total work before any parse/crypto runs. */
  private allowRequest(bucket: string, limit: number): boolean {
    const now = Date.now();
    const w = this.windows.get(bucket);
    if (!w || now - w.start > RATE_WINDOW_MS) {
      this.windows.set(bucket, { start: now, count: 1 });
      return true;
    }
    w.count += 1;
    return w.count <= limit;
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    // Rate limit first — cheapest possible rejection, ahead of any work.
    if (!this.allowRequest('', RATE_LIMIT)) { json(res, 429, { ok: false, error: 'rate limited' }); return; }
    const id = readEndpointId(req);
    const endpoint = id !== null ? this.endpoints.get(id) ?? null : null;
    // Per-endpoint budget, with every unknown id sharing one bucket (see UNKNOWN_BUCKET).
    if (!this.allowRequest(endpoint ? endpoint.id : UNKNOWN_BUCKET, PER_ENDPOINT_RATE_LIMIT)) {
      json(res, 429, { ok: false, error: 'rate limited' }); return;
    }
    const method = req.method ?? '';
    if (method === 'GET') { this.handleStatus(req, res, endpoint); return; }
    if (method === 'POST') { this.handleCreate(req, res, endpoint); return; }
    res.writeHead(405); res.end();
  }

  /**
   * GET — return the status of the token's task (token only; never a listing).
   *
   * The lookup runs even when the id is unknown, and the answer is then the same
   * 404 the unknown-token case gives. Skipping the lookup would make "no such
   * webhook" measurably cheaper than "no such token", which is exactly the signal
   * an id-enumeration probe is looking for.
   */
  private handleStatus(req: IncomingMessage, res: ServerResponse, endpoint: WebhookEndpoint | null): void {
    const token = readToken(req);
    if (!token) { json(res, 401, { ok: false, error: 'token required' }); return; }
    let status: WebhookTaskStatus | null = null;
    try { status = this.lookupStatus(token); }
    catch { json(res, 500, { ok: false, error: 'lookup failed' }); return; }
    // 404 for an unknown token — identical to a malformed one and to an unknown
    // endpoint id, so a probe can't distinguish any of the three (no enumeration).
    if (!status || !endpoint) { json(res, 404, { ok: false, error: 'not found' }); return; }
    json(res, 200, { ok: true, status: status.status, title: status.title, result: status.result ?? null });
  }

  /** POST — verify this endpoint's secret, then buffer + validate + dispatch. */
  private handleCreate(req: IncomingMessage, res: ServerResponse, endpoint: WebhookEndpoint | null): void {
    if (endpoint && isServiceSource(endpoint.source)) { this.handleServiceCreate(req, res, endpoint, endpoint.source); return; }
    // Authenticate BEFORE reading the body so an unauthenticated peer can't even
    // make us buffer (within the size cap). 401 on any failure — no detail leaked,
    // and an unknown id lands here too so it is answered identically.
    // An HMAC caller signs the body, so only the header's presence can be
    // checked now; the signature itself is checked once the body is in.
    const hmac = endpoint?.auth === 'hmac';
    if (hmac ? !hasCustomSignature(req.headers) : (!this.verifySecret(req, endpoint) || !endpoint)) { json(res, 401, { ok: false, error: 'unauthorized' }); return; }
    if (!endpoint) { json(res, 401, { ok: false, error: 'unauthorized' }); return; }

    const chunks: Buffer[] = [];
    let size = 0;
    let aborted = false;
    req.on('data', (c: Buffer) => {
      if (aborted) return;
      size += c.length;
      if (size > MAX_BODY_BYTES) { aborted = true; json(res, 413, { ok: false, error: 'too large' }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (aborted) return;
      const raw = Buffer.concat(chunks);
      if (hmac && !verifyCustomSignature(req.headers, raw, endpoint.secret)) { json(res, 401, { ok: false, error: 'unauthorized' }); return; }
      let parsed: unknown;
      try { parsed = JSON.parse(raw.toString('utf8')); }
      catch { json(res, 400, { ok: false, error: 'bad json' }); return; }

      // The endpoint's own schema decides what a valid body is. Echoing the
      // validator's message is safe: it describes the CALLER's payload and can
      // never contain our secret (the schema is the operator's own document).
      const check = validateAgainstSchema(parsed, parseSchema(endpoint.schema));
      if (!check.ok) { json(res, 400, { ok: false, error: check.error }); return; }

      const body = (parsed ?? {}) as Record<string, unknown>;
      // `message` is required regardless of what the user's schema says — it is
      // the one field the router cannot work without, so a schema edited to drop
      // it fails here rather than producing an empty card.
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message) { json(res, 400, { ok: false, error: 'message required' }); return; }
      const inbound: WebhookInbound = { message };
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (title) inbound.title = title;
      if (body.kind === 'directive' || body.kind === 'communication') inbound.kind = body.kind;
      const from = typeof body.from === 'string' ? body.from.trim() : '';
      if (from) inbound.from = from;

      let out: WebhookDispatch | null = null;
      try { out = this.onMessage(inbound, { id: endpoint.id, name: endpoint.name }); }
      catch { json(res, 500, { ok: false, error: 'could not create task' }); return; }
      if (!out) { json(res, 500, { ok: false, error: 'could not create task' }); return; }
      // 202, not 200: the message was accepted but no work has started. The caller
      // still gets its token so it can poll the hold, and the GET reports the hold
      // honestly rather than pretending a task is queued.
      if (out.pending) {
        json(res, 202, {
          ok: true,
          pending: true,
          status: 'awaiting-approval',
          token: out.token,
          detail: 'accepted — waiting for the operator to approve it before the hive sees it'
        });
        return;
      }
      json(res, 200, { ok: true, token: out.token, taskId: out.taskId });
    });
    req.on('error', () => { if (!aborted) { try { res.writeHead(400); res.end(); } catch { /* socket gone */ } } });
  }

  /**
   * POST from GitHub, Linear or Telegram (0.5.3). Their signature covers the
   * raw body, so the header's presence is checked first (nothing to prove,
   * nothing buffered) and the signature itself once the body is in. Their own
   * payload is turned into the message, so the endpoint's schema does not
   * apply. An event with nothing for an agent answers 200 so the service does
   * not retry it, and goes nowhere.
   */
  private handleServiceCreate(req: IncomingMessage, res: ServerResponse, endpoint: WebhookEndpoint, source: ServiceSource): void {
    if (!hasServiceSignature(source, req.headers)) { json(res, 401, { ok: false, error: 'unauthorized' }); return; }
    const chunks: Buffer[] = [];
    let size = 0;
    let aborted = false;
    req.on('data', (c: Buffer) => {
      if (aborted) return;
      size += c.length;
      if (size > MAX_BODY_BYTES) { aborted = true; json(res, 413, { ok: false, error: 'too large' }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (aborted) return;
      const raw = Buffer.concat(chunks);
      if (!verifyServiceSignature(source, req.headers, raw, endpoint.secret)) { json(res, 401, { ok: false, error: 'unauthorized' }); return; }
      let parsed: unknown;
      try { parsed = JSON.parse(raw.toString('utf8')); }
      catch { json(res, 400, { ok: false, error: 'bad json' }); return; }
      const got = inboundFromService(source, req.headers, parsed);
      if (got.skip) { json(res, 200, { ok: true, ignored: got.reason }); return; }
      const inbound: WebhookInbound = { message: got.message, title: got.title, ...(got.from ? { from: got.from } : {}) };
      let out: WebhookDispatch | null = null;
      try { out = this.onMessage(inbound, { id: endpoint.id, name: endpoint.name }); }
      catch { json(res, 500, { ok: false, error: 'could not create task' }); return; }
      if (!out) { json(res, 500, { ok: false, error: 'could not create task' }); return; }
      json(res, out.pending ? 202 : 200, out.pending ? { ok: true, pending: true, status: 'awaiting-approval' } : { ok: true, taskId: out.taskId });
    });
    req.on('error', () => { if (!aborted) { try { res.writeHead(400); res.end(); } catch { /* socket gone */ } } });
  }

  /**
   * Constant-time check that `x-md-webhook-secret` equals THIS endpoint's secret.
   * A length mismatch is itself a failure and short-circuits before the compare
   * (timingSafeEqual throws on unequal lengths).
   *
   * A null endpoint (unknown id) still runs the comparison, against a decoy no
   * caller can hold, and then fails unconditionally — so "no such webhook" costs
   * the same as "wrong secret" and answers with the same 401.
   */
  private verifySecret(req: IncomingMessage, endpoint: WebhookEndpoint | null): boolean {
    // 'bearer' reads the secret from Authorization; 'header' (and an unknown
    // id) from x-md-webhook-secret. Either way the compare below is the same.
    const provided = endpoint?.auth === 'bearer' ? bearerToken(req.headers.authorization) : req.headers['x-md-webhook-secret'];
    if (typeof provided !== 'string') return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(endpoint ? endpoint.secret : this.decoySecret);
    if (a.length !== b.length) return false;
    const equal = timingSafeEqual(a, b);
    return endpoint ? equal : false;
  }
}

/** The token of an `Authorization: Bearer <token>` header, or null. */
export function bearerToken(h: string | undefined): string | null {
  const m = typeof h === 'string' ? /^Bearer\s+(\S+)\s*$/i.exec(h) : null;
  return m ? m[1] : null;
}

/** The header an HMAC caller signs with, and its `sha256=<hex>` value. */
export const CUSTOM_SIGNATURE_HEADER = 'x-md-signature';
function hasCustomSignature(headers: IncomingHttpHeaders): boolean {
  const v = headers[CUSTOM_SIGNATURE_HEADER];
  return typeof v === 'string' && v.length > 0;
}
/** Does `x-md-signature` carry sha256=HMAC(secret, body)? Constant time. */
export function verifyCustomSignature(headers: IncomingHttpHeaders, rawBody: Buffer, secret: string): boolean {
  const got = headers[CUSTOM_SIGNATURE_HEADER];
  if (typeof got !== 'string' || !secret) return false;
  const want = Buffer.from(`sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`);
  const have = Buffer.from(got.trim().toLowerCase());
  return have.length === want.length && timingSafeEqual(have, want);
}

/**
 * The endpoint id from the request path: `/foo` → `foo`, bare `/` → `legacy`.
 * A deeper path (`/a/b`) resolves to null = "no such endpoint", which is then
 * answered exactly like a wrong secret / unknown token.
 */
function readEndpointId(req: IncomingMessage): string | null {
  let pathname: string;
  try { pathname = new URL(req.url ?? '/', 'http://localhost').pathname; }
  catch { return null; }
  const segments = pathname.split('/').filter((s) => s.length > 0);
  if (segments.length === 0) return LEGACY_ENDPOINT_ID;
  if (segments.length > 1) return null;
  try { return decodeURIComponent(segments[0]); } catch { return segments[0]; }
}

/** Parse the endpoint's stored schema. An unparseable one yields `undefined`,
 *  which `validateAgainstSchema` treats as "accept" — a mistyped schema must not
 *  lock a caller out of an endpoint they hold a valid secret for. */
function parseSchema(schema: string): unknown {
  if (typeof schema !== 'string' || !schema.trim()) return undefined;
  try { return JSON.parse(schema); } catch { return undefined; }
}

/** Pull the capability token from the `x-md-webhook-token` header, falling back
 *  to a `?token=` query param. Header is preferred (kept out of URL/access logs). */
function readToken(req: IncomingMessage): string {
  const h = req.headers['x-md-webhook-token'];
  if (typeof h === 'string' && h.trim()) return h.trim();
  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const q = url.searchParams.get('token');
    if (q && q.trim()) return q.trim();
  } catch { /* malformed url → no token */ }
  return '';
}

function json(res: ServerResponse, status: number, body: unknown): void {
  try {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  } catch { /* socket already gone */ }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

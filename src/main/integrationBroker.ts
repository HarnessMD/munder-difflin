/**
 * Loopback secret broker (Phase 2 foundation, main process).
 *
 * A 127.0.0.1-only HTTP proxy. An ephemeral worker calls
 *   <METHOD> http://127.0.0.1:<port>/i/<integrationId>/<path...>
 * authenticating with a PER-WORKER CAPABILITY TOKEN (a handle, NOT any secret) in the
 * `Authorization: Bearer` / `X-MD-Broker-Token` header. The broker validates the token,
 * authorizes the integration, decrypts the integration's real secret, injects it as the
 * upstream auth header, forwards to the integration's baseUrl, and streams the response
 * back. The worker uses the integration WITHOUT EVER SEEING the credential.
 *
 * Generalizes the existing src/main/slack.ts `SlackReplyServer` (a loopback broker that
 * posts Slack replies without the agent seeing the bot token) to an N-integration proxy.
 *
 * DEPENDENCY-FREE of electron by design: `getRecord` + `getSecret` are injected, so this
 * module is unit-testable under plain node. The secret is materialized ONLY here, at
 * forward-time, and is NEVER logged, NEVER returned to the worker, NEVER echoed in an
 * error.
 *
 * NOT an open proxy: a worker can only reach baseUrls the user registered (it selects an
 * integration by id, never a host), and the path is confined under the integration
 * origin (see resolveUpstreamUrl).
 *
 * Contract: hive/docs/integrations-spec.md.
 *
 * 0.5.6: `/secrets` hands a running agent the AI provider keys and custom
 * secrets saved in Settings, read fresh on each request, so one saved after
 * the agent started reaches it with no restart (main/agentSecrets.ts).
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  type IntegrationRecord,
  buildAuthRequest,
  resolveUpstreamUrl,
  authTypeNeedsSecret
} from '../shared/integrations';
import { integrationList, type WebhookListInput } from '../shared/integrationList';

const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB request-body cap
const UPSTREAM_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT = 'munder-difflin-broker/1';

/** Hop-by-hop headers never forwarded in either direction. */
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade'
]);
/** Request headers the worker is NEVER allowed to pass upstream. */
const STRIP_REQUEST = new Set([
  'authorization', 'x-md-broker-token', 'host', 'cookie', 'content-length', ...HOP_BY_HOP
]);
/** Response headers never forwarded back (fetch already decodes the body, so the
 *  upstream content-encoding/length would be wrong). */
const STRIP_RESPONSE = new Set([
  'content-encoding', 'content-length', 'set-cookie', ...HOP_BY_HOP
]);

interface Capability {
  workerId: string;
  allowedIds: Set<string>;
  grantedAt: number;
}

export interface IntegrationBrokerDeps {
  /** Resolve an integration record by id (injected — the registry). */
  getRecord: (id: string) => IntegrationRecord | undefined;
  /** Decrypt a secret by ref (injected — the secret store). Main-internal. */
  /** The secret, only when it was sealed for this base address (sealedStore.ts). */
  getSecret: (secretRef: string | undefined, baseUrl: string) => string | undefined;
  /** Why `getSecret` answered nothing, when the reason is that a kept key
   *  cannot be read: the whole file of kept keys (`store`) or this one key
   *  (`key`). Null for every other reason (no key was typed, or it is kept
   *  for another address). Asked ONLY after `getSecret` answered nothing.
   *  Absent, or when it throws: the answer is `no_secret`, as it always was. */
  keyProblem?: (secretRef: string | undefined) => 'store' | 'key' | null;
  /**
   * 0.5.6: the keys and secrets a RUNNING agent may use
   * (`resources/md-secret.cjs`, main/agentSecrets.ts). `GET` or `POST
   * /secrets` lists names and kinds; `POST /secrets/read` with {"name"}
   * returns one value, read from the store at that moment. The worker id is
   * the one the token was granted to, NEVER anything in the body. Absent: the
   * routes are 404.
   */
  secrets?: (workerId: string, route: 'list' | 'read', body: unknown) => { status: number; body: unknown } | Promise<{ status: number; body: unknown }>;
  /**
   * 0.5.9 (limits-bar): each engine's usage limits, for `md-limits`
   * (shared/mdLimitsScript.ts). `GET /limits` answers this object as JSON:
   * the snapshot main or the office daemon keeps (main/usageLimits.ts), its
   * words, and where it was read. Any valid token may ask; nothing in it is
   * an agent's or a credential. Absent: the route is 404.
   */
  limits?: () => Promise<unknown>;
  /**
   * 0.5.8 (hire-defaults-058): the engines and their models, which are
   * installed and signed in here, for `md-models` (core/engineModels.ts).
   * `GET /models` answers it as JSON. Any valid token may ask; it holds no
   * key and no account. Absent: the route is 404.
   */
  models?: () => Promise<unknown>;
  /**
   * 0.5.8: the inbound webhooks of this computer, for `GET /integrations`.
   * Only the fields the list reads (shared/integrationList.ts); a disabled
   * one is left out there. Absent: the list holds no webhook.
   */
  webhooks?: () => WebhookListInput[];
  /**
   * 0.5.6: one line per call to a service connection, for its Activity tab.
   * Absent: nothing is logged.
   */
  log?: (event: ConnectionCallEvent) => void;
}

/** One call through the broker to a connection, once it has ended. Never the
 *  path, the query, a header or a body: which connection, which worker, the
 *  method, the status sent back (0 when none was) and, when the broker itself
 *  answered, its error code (`cut` when the call ended before its answer did). */
export interface ConnectionCallEvent {
  kind: 'conn-call';
  id: string;
  agentId: string;
  method: string;
  status: number;
  error?: string;
}

/** The code each broker error answer carried, for the call's log line. */
const errorCodes = new WeakMap<ServerResponse, string>();

/** A secrets request is one name. */
const MAX_SECRETS_BODY_BYTES = 4 * 1024;

/** True for IPv4 loopback (127.0.0.0/8) and IPv6 ::1 (incl. v4-mapped). Mirrors slack.ts. */
function isLoopback(addr: string): boolean {
  const a = addr.replace(/^::ffff:/, '');
  return a === '::1' || a.startsWith('127.');
}

export class IntegrationBroker {
  private server: Server | null = null;
  private port = 0;
  private readonly deps: IntegrationBrokerDeps;
  /** token -> capability. In-memory only; NEVER persisted. */
  private readonly byToken = new Map<string, Capability>();
  /** workerId -> token, for revoke. */
  private readonly byWorker = new Map<string, string>();

  constructor(deps: IntegrationBrokerDeps) {
    this.deps = deps;
  }

  /** Bind a loopback port (0 ⇒ OS-assigned). Resolves the bound port. */
  start(preferredPort = 0): Promise<{ ok: boolean; port?: number; error?: string }> {
    return new Promise((resolve) => {
      if (this.server) { resolve({ ok: true, port: this.port }); return; }
      const server = createServer((req, res) => this.handle(req, res));
      const onError = (e: Error): void => { server.off('listening', onListening); resolve({ ok: false, error: e.message }); };
      const onListening = (): void => {
        server.off('error', onError);
        this.server = server;
        const addr = server.address();
        this.port = addr && typeof addr === 'object' ? addr.port : preferredPort;
        resolve({ ok: true, port: this.port });
      };
      server.once('error', onError);
      server.once('listening', onListening);
      // 127.0.0.1 ONLY — never bound to a routable interface, never tunneled.
      server.listen(preferredPort, '127.0.0.1');
    });
  }

  /** Close the broker. Idempotent and best-effort. Clears all capabilities. */
  stop(): void {
    try { this.server?.close(); } catch { /* noop */ }
    this.server = null;
    this.port = 0;
    this.byToken.clear();
    this.byWorker.clear();
  }

  /** Whether the broker is bound and serving. */
  running(): boolean {
    return !!this.server && this.port > 0;
  }

  /** The base URL workers use (only valid while running). */
  url(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  /** Mint a per-worker capability token granting access to `allowedIds`. Any prior
   *  token for this worker is revoked first. The token is a random handle — never a
   *  secret, never persisted. */
  grant(workerId: string, allowedIds: string[]): string {
    this.revoke(workerId);
    const token = randomBytes(32).toString('base64url');
    this.byToken.set(token, { workerId, allowedIds: new Set(allowedIds), grantedAt: Date.now() });
    this.byWorker.set(workerId, token);
    return token;
  }

  /** Point every live capability at `allowedIds` without minting new tokens,
   *  so an integration enabled after an agent started reaches it too (0.5.5).
   *  Tokens stay the same: an agent's env and its .broker file keep working. */
  retarget(allowedIds: string[]): void {
    for (const cap of this.byToken.values()) cap.allowedIds = new Set(allowedIds);
  }

  /** The same, with each worker's own list: what one agent may reach is not
   *  what the next one may (a person's connection is given agent by agent). */
  retargetEach(allowedFor: (workerId: string) => string[]): void {
    for (const cap of this.byToken.values()) cap.allowedIds = new Set(allowedFor(cap.workerId));
  }

  /** Revoke a worker's capability (called on teardown). Idempotent. */
  revoke(workerId: string): void {
    const token = this.byWorker.get(workerId);
    if (token) { this.byToken.delete(token); this.byWorker.delete(workerId); }
  }

  /** Constant-time-ish lookup of a presented token against live capabilities. */
  private resolveCapability(provided: string | undefined): Capability | undefined {
    if (!provided) return undefined;
    const a = Buffer.from(provided);
    for (const [token, cap] of this.byToken) {
      const b = Buffer.from(token);
      if (a.length === b.length && timingSafeEqual(a, b)) return cap;
    }
    return undefined;
  }

  private static sendError(res: ServerResponse, status: number, code: string, message: string): void {
    if (res.headersSent) { try { res.end(); } catch { /* noop */ } return; }
    errorCodes.set(res, code);
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: message, code }));
  }

  /** Extract the bearer/x-md-broker-token from the request. */
  private static tokenFrom(req: IncomingMessage): string | undefined {
    const x = req.headers['x-md-broker-token'];
    if (typeof x === 'string' && x) return x;
    const auth = req.headers['authorization'];
    if (typeof auth === 'string') {
      const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
      if (m) return m[1].trim();
    }
    return undefined;
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    // 1) Loopback — defense in depth even though the bind already excludes others.
    if (!isLoopback(req.socket.remoteAddress ?? '')) {
      return IntegrationBroker.sendError(res, 403, 'forbidden', 'loopback callers only');
    }
    // 2) Capability token.
    const cap = this.resolveCapability(IntegrationBroker.tokenFrom(req));
    if (!cap) return IntegrationBroker.sendError(res, 401, 'unauthorized', 'missing or invalid capability token');

    const rawUrl = req.url ?? '';
    // 2a') 0.5.6: the keys and secrets routes. Who is asking is the token.
    const secretsRoute = /^\/secrets(?:\/(read))?\/?(?:\?[^#]*)?$/.exec(rawUrl);
    if (secretsRoute) {
      if (!this.deps.secrets) return IntegrationBroker.sendError(res, 404, 'not_found', 'keys and secrets are not available');
      const method = (req.method ?? 'GET').toUpperCase();
      const route = secretsRoute[1] === 'read' ? 'read' : 'list';
      if (route === 'read' && method !== 'POST') return IntegrationBroker.sendError(res, 405, 'method_not_allowed', 'POST {"name": "<NAME>"}');
      if (route === 'list' && method !== 'GET' && method !== 'POST') return IntegrationBroker.sendError(res, 405, 'method_not_allowed', 'GET /secrets lists the names');
      void this.secretsRequest(req, res, cap.workerId, route);
      return;
    }
    // 2a'') 0.5.9: the engines' usage limits (md-limits), and 0.5.8 (hire-defaults-058) the engines and their
    // models (md-models). Read only; any valid token.
    const readRoute = /^\/(limits|models)\/?(?:\?[^#]*)?$/.exec(rawUrl);
    if (readRoute) {
      const which = readRoute[1] === 'models' ? 'models' : 'limits';
      const read = this.deps[which];
      const what = which === 'models' ? 'the engines and models' : 'the usage limits';
      if (!read) return IntegrationBroker.sendError(res, 404, 'not_found', which === 'models' ? 'engines and models are not available' : 'usage limits are not available');
      if ((req.method ?? 'GET').toUpperCase() !== 'GET') return IntegrationBroker.sendError(res, 405, 'method_not_allowed', `GET /${which}`);
      read().then((body) => {
        if (res.writableEnded) return;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      }, () => { if (!res.writableEnded) IntegrationBroker.sendError(res, 500, 'internal', `${what} could not be read`); });
      return;
    }
    // 2b) GET /i: the ids this token may reach, and nothing else (no name, no
    // base URL, no secret reference). Without it an agent had to guess an id.
    if (/^\/i\/?(\?[^#]*)?$/.test(rawUrl)) {
      if ((req.method ?? 'GET').toUpperCase() !== 'GET') return IntegrationBroker.sendError(res, 405, 'method_not_allowed', 'GET /i lists the integration ids this token may reach');
      const ids = [...cap.allowedIds].filter((id) => this.deps.getRecord(id)?.enabled === true);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ids }));
      return;
    }
    // 2b') 0.5.8 (founder, 9 Nov 2026): GET /integrations, the same ids in
    // words an agent can act on: each one's name, kind (API, connected
    // account, webhook) and what it allows, and the webhooks that bring
    // messages in. Built field by field (shared/integrationList.ts): never a
    // key, a secret reference, a connection id or a webhook secret.
    if (/^\/integrations\/?(\?[^#]*)?$/.test(rawUrl)) {
      if ((req.method ?? 'GET').toUpperCase() !== 'GET') return IntegrationBroker.sendError(res, 405, 'method_not_allowed', 'GET /integrations lists what this token may reach and what each allows');
      let webhooks: WebhookListInput[] = [];
      try { webhooks = this.deps.webhooks?.() ?? []; } catch { webhooks = []; }
      const integrations = integrationList([...cap.allowedIds].map((id) => this.deps.getRecord(id)), webhooks);
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ integrations }));
      return;
    }

    // 3) Parse /i/<integrationId>/<path...>.
    const m = /^\/i\/([^/?#]+)(?:\/([^?#]*))?(\?[^#]*)?$/.exec(rawUrl);
    if (!m) return IntegrationBroker.sendError(res, 404, 'not_found', 'expected /i/<integrationId>/<path>');
    const integrationId = decodeURIComponent(m[1]);
    const path = m[2] ?? '';
    const query = m[3] ?? '';
    // 0.5.6: a call to a connection that exists gets one log line once it ends.
    if (this.deps.log && this.deps.getRecord(integrationId)) this.logWhenDone(req, res, integrationId, cap.workerId);

    // 4) Authorize against this worker's capability.
    if (!cap.allowedIds.has(integrationId)) {
      return IntegrationBroker.sendError(res, 403, 'forbidden', 'integration not in this worker capability');
    }
    // 5) Resolve the record (still enabled?).
    const rec = this.deps.getRecord(integrationId);
    if (!rec) return IntegrationBroker.sendError(res, 404, 'not_found', 'unknown integration');
    if (!rec.enabled) return IntegrationBroker.sendError(res, 403, 'forbidden', 'integration is disabled');

    // 6) Confine the upstream URL under the integration origin (NOT an open proxy).
    const upstream = resolveUpstreamUrl(rec.baseUrl, path + query);
    if (!upstream) return IntegrationBroker.sendError(res, 400, 'bad_request', 'invalid or out-of-bounds path');

    // 7) Secret (decrypted ONLY here, used ONLY to inject the upstream header).
    let secret: string | undefined;
    if (authTypeNeedsSecret(rec.authType)) {
      secret = this.deps.getSecret(rec.secretRef, rec.baseUrl);
      if (!secret) {
        // The sentence is read by the agent that called. No path, no key name, no address.
        let problem: 'store' | 'key' | null = null;
        try { problem = this.deps.keyProblem?.(rec.secretRef) ?? null; } catch { problem = null; }
        if (problem === 'store') return IntegrationBroker.sendError(res, 503, 'secret_store_unreadable', 'the keys this office keeps cannot be read, so this connection cannot be used; setting the key again will not work until that is mended; tell the person');
        if (problem === 'key') return IntegrationBroker.sendError(res, 503, 'secret_unreadable', 'the key kept for this connection cannot be read; ask the person to type it again in Settings');
        return IntegrationBroker.sendError(res, 503, 'no_secret', 'no key is kept for this integration at this address; ask the person to set it in Settings');
      }
    }

    void this.forward(req, res, rec, upstream, secret);
  }

  /** The call's one log line, written when the response closes, whichever
   *  way it ends. Built from fixed fields only (ConnectionCallEvent). */
  private logWhenDone(req: IncomingMessage, res: ServerResponse, id: string, workerId: string): void {
    const raw = (req.method ?? 'GET').toUpperCase();
    const method = /^[A-Z]{1,10}$/.test(raw) ? raw : 'OTHER';
    res.once('close', () => {
      const code = errorCodes.get(res) ?? (res.writableFinished ? undefined : 'cut');
      const event: ConnectionCallEvent = { kind: 'conn-call', id, agentId: workerId, method, status: res.headersSent ? res.statusCode : 0, ...(code ? { error: code } : {}) };
      try { this.deps.log?.(event); } catch { /* the log never fails the call */ }
    });
  }

  /** One keys and secrets request: at most one short JSON body, handed to
   *  main with the worker id the token resolved to. The answer may hold a
   *  value, so it is never cached and never logged here. */
  private async secretsRequest(req: IncomingMessage, res: ServerResponse, workerId: string, route: 'list' | 'read'): Promise<void> {
    let body: unknown = {};
    try {
      const raw = await readBodyCapped(req, MAX_SECRETS_BODY_BYTES);
      const text = raw.toString('utf8').trim();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      if ((e as Error).message === 'too_large') return IntegrationBroker.sendError(res, 413, 'payload_too_large', 'request body too large');
      return IntegrationBroker.sendError(res, 400, 'bad_request', 'the body must be JSON');
    }
    try {
      const r = await this.deps.secrets!(workerId, route, body);
      if (res.headersSent) return;
      res.writeHead(r.status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(r.body));
    } catch {
      IntegrationBroker.sendError(res, 500, 'secrets_failed', 'the key could not be read');
    }
  }

  private async forward(
    req: IncomingMessage,
    res: ServerResponse,
    rec: IntegrationRecord,
    upstream: URL,
    secret: string | undefined
  ): Promise<void> {
    const body = await this.readBody(req, res);
    if (body === null) return;
    const sent = await this.send(req, rec, upstream, secret, body.bytes);
    if ('error' in sent) return IntegrationBroker.sendError(res, 502, 'bad_gateway', `upstream request failed: ${sent.error}`);
    await this.stream(res, sent);
  }

  /** Buffer the request body with a hard cap (write methods). Null when the
   *  error answer has already been sent. */
  private async readBody(req: IncomingMessage, res: ServerResponse): Promise<{ bytes: Buffer | undefined } | null> {
    const method = (req.method ?? 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD') return { bytes: undefined };
    try {
      return { bytes: await readBodyCapped(req) };
    } catch (e) {
      if ((e as Error).message === 'too_large') IntegrationBroker.sendError(res, 413, 'payload_too_large', 'request body too large');
      else IntegrationBroker.sendError(res, 400, 'bad_request', 'could not read request body');
      return null;
    }
  }

  /** One upstream request with the credential injected. */
  private async send(
    req: IncomingMessage,
    rec: IntegrationRecord,
    upstream: URL,
    secret: string | undefined,
    body: Buffer | undefined
  ): Promise<{ response: Response; timer: NodeJS.Timeout } | { error: string }> {
    const method = (req.method ?? 'GET').toUpperCase();
    // Sanitize worker headers, then inject the auth header(s). Injected auth ALWAYS
    // wins: the strip list removes any worker-supplied authorization/auth header.
    const outHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      const key = k.toLowerCase();
      if (STRIP_REQUEST.has(key)) continue;
      if (Array.isArray(v)) outHeaders[key] = v.join(', ');
      else if (typeof v === 'string') outHeaders[key] = v;
    }
    if (!outHeaders['user-agent']) outHeaders['user-agent'] = DEFAULT_USER_AGENT;
    const { headers: injected, query: injectedQuery } = buildAuthRequest(rec, secret);
    for (const [k, v] of Object.entries(injected)) {
      delete outHeaders[k]; // ensure the worker can't shadow an injected header
      outHeaders[k] = v;
    }
    // A query-parameter API carries its credential in the URL. `set` (not
    // `append`) so a worker that supplied the same parameter cannot shadow it.
    for (const [k, v] of Object.entries(injectedQuery)) upstream.searchParams.set(k, v);

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const response = await fetch(upstream, {
        method,
        headers: outHeaders,
        body: body as BodyInit | undefined,
        redirect: 'manual',
        signal: ac.signal
      });
      return { response, timer };
    } catch (e) {
      clearTimeout(timer);
      // The message could in theory contain the URL but never the secret.
      return { error: (e as Error).message };
    }
  }

  /** Stream the response back (status + sanitized headers + body). */
  private async stream(res: ServerResponse, sent: { response: Response; timer: NodeJS.Timeout }): Promise<void> {
    const upstreamRes = sent.response;
    const respHeaders: Record<string, string> = {};
    upstreamRes.headers.forEach((value, key) => {
      if (!STRIP_RESPONSE.has(key.toLowerCase())) respHeaders[key] = value;
    });
    res.writeHead(upstreamRes.status, respHeaders);
    try {
      if (upstreamRes.body) {
        await pipeWebStream(upstreamRes.body, res);
      } else {
        res.end();
      }
    } catch {
      try { res.end(); } catch { /* socket gone */ }
    } finally {
      clearTimeout(sent.timer);
    }
  }
}

/** Read a request body into a Buffer, aborting past MAX_BODY_BYTES (throws 'too_large'). */
function readBodyCapped(req: IncomingMessage, max = MAX_BODY_BYTES): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > max) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (e) => reject(e));
  });
}

/** Pipe a web ReadableStream (fetch response body) to a node ServerResponse. */
function pipeWebStream(web: ReadableStream<Uint8Array>, res: ServerResponse): Promise<void> {
  return new Promise((resolve, reject) => {
    const node = Readable.fromWeb(web as Parameters<typeof Readable.fromWeb>[0]);
    node.on('error', reject);
    res.on('error', reject);
    res.on('finish', resolve);
    node.pipe(res);
  });
}

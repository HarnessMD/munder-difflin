/**
 * FileShareStore — one local file, one public link, dead in an hour.
 *
 * The founder's ask: agents on different machines need to hand each other
 * files, and the link must die after an hour. Before this there was no
 * cross machine path at all; the composer pasted a LOCAL PATH, which only
 * works when the agent happens to share a filesystem with the sender.
 *
 * SHAPE — ONE server, MANY shares, ONE tunnel:
 *   - a single `http` listener on 127.0.0.1 and an ephemeral port, started
 *     lazily on the first share and closed when the last one goes,
 *   - one `tunnelmole` tunnel in front of it, opened once and reused,
 *   - `GET /s/<64 hex>` and NOTHING else. Every other method, every other
 *     path, an expired token and an unknown token all get the same answer:
 *     404, no body. An internet scanner must not be able to learn that a
 *     token was ever valid, so there is no 410 and no "expired" detail.
 *
 * SECURITY — the token is the ONLY credential, so:
 *   - 256 bits from `crypto.randomBytes`, hex, minted here and never logged,
 *     never put in an error, never written to the activity log (share ids go
 *     in log lines instead, which is what they are for),
 *   - the request path must match `/s/<64 hex>` EXACTLY. User input is never
 *     joined into a filesystem path anywhere in this file: the token is a Map
 *     key, and the bytes come from the absolute path stored at create time,
 *     so directory traversal has nothing to traverse,
 *   - the final gate is a `timingSafeEqual` against the stored token, run on
 *     a hit and on a miss alike,
 *   - `Content-Disposition: attachment` with a sanitised name, `nosniff`, and
 *     an inert content type, so a shared file cannot execute in the tunnel's
 *     origin in somebody else's browser,
 *   - no listing, no ranges, no directory, one file per token.
 *
 * EXPIRY — belt AND braces, on purpose:
 *   - a timer per share fires at `expiresAt` and revokes it, which is what
 *     kills a share nobody ever asks for, and
 *   - EVERY request sweeps first. A laptop that slept through the timer wakes
 *     with the timer still pending; the sweep is what stops it serving a stale
 *     share in that window. Neither one alone is enough.
 *
 * Revoking removes the token from the Map. It deletes NOTHING on disk: a share
 * is a link to the user's file, never a copy of it, and revoking a link must
 * never be able to lose somebody their work.
 *
 * Deliberately free of any `electron` import, like `webhook.ts`, so the unit
 * tests can drive a real server on a real ephemeral port.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createReadStream, realpathSync, statSync } from 'node:fs';
import { basename, isAbsolute } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  MAX_ACTIVE_SHARES, MAX_SHARE_BYTES, SHARE_TOKEN_BYTES, SHARE_TTL_MS,
  contentDisposition, contentTypeFor, isExpired, safeFileName, toShareView, tokenFromPath,
  type FileShare, type FileShareView, type ShareRefusal
} from '../shared/fileShare';
// NOTE: `tunnelmole` is ESM only and the main process bundles as CommonJS, so a
// static import becomes `require('tunnelmole')` and throws ERR_REQUIRE_ESM at
// load. It is imported dynamically inside `openTunnelViaTunnelmole()` instead,
// the same workaround `webhook.ts` documents. Do not hoist it.

/** Cap how long we wait for the public tunnel. Matches `webhook.ts`. */
const TUNNEL_START_TIMEOUT_MS = 10_000;
/** Fixed window abuse guard on a PUBLIC surface. A download is one request;
 *  this only bounds a prober, and it is checked before any lookup or crypto. */
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;

export type CreateShareResult =
  | { ok: true; share: FileShareView }
  | { ok: false; error: ShareRefusal };

export interface FileShareStoreOptions {
  /** Open a public tunnel to `port` and resolve its root URL. Injected so a
   *  unit test drives a REAL local server without ever reaching the network. */
  openTunnel?: (port: number) => Promise<string>;
  /** Clock, injected so expiry can be tested without waiting an hour. */
  now?: () => number;
  ttlMs?: number;
  maxBytes?: number;
  maxShares?: number;
}

export class FileShareStore {
  /** token → share. The token is the key, so a lookup cannot be tricked into
   *  naming a file: there is no path arithmetic anywhere in the read path. */
  private shares = new Map<string, FileShare>();
  /** id → token, so revoke and the renderer can speak in ids only. */
  private byId = new Map<string, string>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private server: Server | null = null;
  /** Remembered across a quiet stretch so the next share re-binds the SAME
   *  port and reuses the tunnel already pointed at it (see `closeServer`). */
  private boundPort = 0;
  private tunnelUrl: string | null = null;
  private tunnelPending: Promise<string | null> | null = null;
  private serverPending: Promise<boolean> | null = null;
  private window: { start: number; count: number } | null = null;
  /** Compared against on a miss purely so a miss does the same work as a hit.
   *  Random per process, never exported, so it cannot match by accident. */
  private readonly decoyToken = randomBytes(SHARE_TOKEN_BYTES).toString('hex');

  private readonly openTunnel: (port: number) => Promise<string>;
  private readonly now: () => number;
  private readonly ttlMs: number;
  private readonly maxBytes: number;
  private readonly maxShares: number;

  constructor(opts: FileShareStoreOptions = {}) {
    this.openTunnel = opts.openTunnel ?? openTunnelViaTunnelmole;
    this.now = opts.now ?? (() => Date.now());
    this.ttlMs = opts.ttlMs ?? SHARE_TTL_MS;
    this.maxBytes = opts.maxBytes ?? MAX_SHARE_BYTES;
    this.maxShares = opts.maxShares ?? MAX_ACTIVE_SHARES;
  }

  /* ---- public API -------------------------------------------------------- */

  /**
   * Publish one file. Everything is re-validated HERE: the renderer's path is
   * a request, not a fact, and main is the only thing that decides what a
   * public URL points at.
   *
   * Fails with a CODE, never a sentence, and never one that quotes the path.
   */
  async create(input: unknown): Promise<CreateShareResult> {
    const raw = typeof input === 'string' ? input.trim() : '';
    if (!raw || !isAbsolute(raw)) return { ok: false, error: 'notAbsolute' };
    this.sweep();
    if (this.shares.size >= this.maxShares) return { ok: false, error: 'tooMany' };

    let resolved: string;
    let size: number;
    try {
      // Resolve the link NOW and store the target. A symlink re-pointed after
      // the person confirmed would otherwise change what is published without
      // a second confirm.
      resolved = realpathSync(raw);
      const st = statSync(resolved);
      if (!st.isFile()) return { ok: false, error: 'notAFile' };
      size = st.size;
    } catch {
      return { ok: false, error: 'unreadable' };
    }
    if (size > this.maxBytes) return { ok: false, error: 'tooBig' };

    if (!(await this.ensureServer())) return { ok: false, error: 'noServer' };
    const base = await this.ensureTunnel();
    if (!base) {
      // No public URL means no share. Leaving a half share registered would
      // put a file behind a link nobody can use, which is worse than a refusal.
      this.closeServerIfIdle();
      return { ok: false, error: 'noTunnel' };
    }

    const now = this.now();
    const share: FileShare = {
      id: `fs-${randomBytes(8).toString('hex')}`,
      path: resolved,
      name: safeFileName(basename(resolved)),
      size,
      contentType: contentTypeFor(basename(resolved)),
      createdAt: now,
      expiresAt: now + this.ttlMs,
      token: randomBytes(SHARE_TOKEN_BYTES).toString('hex')
    };
    this.shares.set(share.token, share);
    this.byId.set(share.id, share.token);
    this.arm(share);
    return { ok: true, share: toShareView(share, base) };
  }

  /** Live shares, newest first. Sweeps first, so an expired one is never
   *  listed even if its timer has not fired yet. */
  list(): FileShareView[] {
    this.sweep();
    const base = this.server ? this.tunnelUrl : null;
    return [...this.shares.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => toShareView(s, base));
  }

  /** Revoke by id. Removes the token from the Map and touches NOTHING on disk. */
  revoke(input: unknown): { ok: boolean } {
    const id = typeof input === 'string' ? input : '';
    const token = this.byId.get(id);
    if (!token) return { ok: false };
    this.drop(token);
    this.closeServerIfIdle();
    return { ok: true };
  }

  /** Revoke everything and close the listener. For app shutdown. */
  stop(): void {
    for (const token of [...this.shares.keys()]) this.drop(token);
    this.closeServer();
  }

  /** The tunnel root while shares are being served, else null. */
  publicUrl(): string | null {
    return this.server ? this.tunnelUrl : null;
  }

  /** The loopback port the listener is bound to, or 0. For tests. */
  localPort(): number {
    return this.server ? this.boundPort : 0;
  }

  /** How many shares are live right now (after a sweep). */
  activeCount(): number {
    this.sweep();
    return this.shares.size;
  }

  /* ---- the served surface ------------------------------------------------ */

  /**
   * The whole public surface. Public so a test can drive it directly, but the
   * tests bind a real server and speak real HTTP to it, because the value here
   * IS the transport behaviour.
   */
  handleRequest(req: IncomingMessage, res: ServerResponse): void {
    // Sweep BEFORE anything else. The per-share timer is the primary revoker;
    // this covers the window where the machine slept through it.
    this.sweep();
    // Cheapest possible rejection, ahead of any lookup or compare. 429 rather
    // than 404 because it says nothing about whether any token exists.
    if (!this.allowRequest()) { res.writeHead(429); res.end(); return; }
    if ((req.method ?? '') !== 'GET') { notFound(res); return; }

    const token = tokenFromPath(pathnameOf(req.url));
    if (!token) { notFound(res); return; }
    const share = this.shares.get(token) ?? null;
    // The Map is the INDEX. This is the gate, and it runs on a miss too, so an
    // unknown token costs the same as a known one.
    const stored = share ? share.token : this.decoyToken;
    if (!constantTimeEqual(stored, token) || !share) { notFound(res); return; }

    // Re-stat rather than trusting the size recorded an hour ago: the file may
    // have been moved, replaced or truncated since. A vanished file revokes.
    let size: number;
    try {
      const st = statSync(share.path);
      if (!st.isFile()) { this.drop(token); notFound(res); return; }
      size = st.size;
    } catch {
      this.drop(token);
      notFound(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': share.contentType,
      'Content-Length': String(size),
      'Content-Disposition': contentDisposition(share.name),
      // A share is a moving target: it stops existing in an hour, so nothing
      // downstream may keep a copy of it or of this response.
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'none',
      'Referrer-Policy': 'no-referrer'
    });
    const stream = createReadStream(share.path);
    stream.on('error', () => { res.destroy(); });
    res.on('close', () => { stream.destroy(); });
    stream.pipe(res);
  }

  /* ---- expiry ------------------------------------------------------------ */

  /** Drop every share whose hour has run out. Returns how many went. */
  private sweep(): number {
    const now = this.now();
    let dropped = 0;
    for (const [token, share] of [...this.shares]) {
      if (isExpired(share, now)) { this.drop(token); dropped++; }
    }
    // `drop` cancels the share's own timer, and that timer was the ONLY thing
    // that closed the listener after an expiry. So a share expired here, ahead
    // of a late timer, used to leave the listener bound and the tunnel address
    // published with nothing behind them, until some later share was revoked.
    // Whoever removes the last share closes the door, whichever path it was.
    if (dropped > 0) this.closeServerIfIdle();
    return dropped;
  }

  /** Arm the per share revoker. Unref'd: an expiry timer must never be the
   *  reason the app refuses to quit. */
  private arm(share: FileShare): void {
    const delay = Math.max(0, share.expiresAt - this.now());
    const timer = setTimeout(() => {
      this.drop(share.token);
      this.closeServerIfIdle();
    }, delay);
    if (typeof timer.unref === 'function') timer.unref();
    this.timers.set(share.token, timer);
  }

  /** Forget one share. Nothing on disk is touched, ever. */
  private drop(token: string): void {
    const timer = this.timers.get(token);
    if (timer) { clearTimeout(timer); this.timers.delete(token); }
    const share = this.shares.get(token);
    if (share) this.byId.delete(share.id);
    this.shares.delete(token);
  }

  /* ---- transport --------------------------------------------------------- */

  private allowRequest(): boolean {
    const now = this.now();
    if (!this.window || now - this.window.start > RATE_WINDOW_MS) {
      this.window = { start: now, count: 1 };
      return true;
    }
    this.window.count += 1;
    return this.window.count <= RATE_LIMIT;
  }

  /** One startup at a time (review finding 9). Two creates that both arrived
   *  before the first listener was up each saw `server === null`, each bound a
   *  listener, and the second overwrote `this.server`: the first was then held
   *  by nothing, survived revoke and stop(), and kept the process alive.
   *  Concurrent creates share one attempt, the way ensureTunnel already does. */
  private ensureServer(): Promise<boolean> {
    if (this.server) return Promise.resolve(true);
    this.serverPending ??= this.startServer().finally(() => { this.serverPending = null; });
    return this.serverPending;
  }

  private async startServer(): Promise<boolean> {
    if (this.server) return true;
    try {
      await this.listen(this.boundPort);
      return true;
    } catch {
      if (!this.boundPort) return false;
      // The remembered port was taken while we were idle. Take a fresh one,
      // and drop the cached tunnel with it: it forwards to the old port.
      this.boundPort = 0;
      this.tunnelUrl = null;
      try {
        await this.listen(0);
        return true;
      } catch {
        return false;
      }
    }
  }

  private listen(port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const server = createServer((req, res) => this.handleRequest(req, res));
      const onError = (e: Error): void => reject(e);
      server.once('error', onError);
      // Loopback only. The tunnel is the ONLY thing that makes this reachable,
      // so an app running with the tunnel down is not listening on any LAN.
      server.listen(port, '127.0.0.1', () => {
        server.off('error', onError);
        const addr = server.address();
        if (addr && typeof addr === 'object') this.boundPort = addr.port;
        this.server = server;
        resolve();
      });
    });
  }

  /** Open the tunnel once and reuse it. Concurrent creates share one attempt. */
  private async ensureTunnel(): Promise<string | null> {
    if (this.tunnelUrl) return this.tunnelUrl;
    if (!this.tunnelPending) {
      const port = this.boundPort;
      this.tunnelPending = withTimeout(this.openTunnel(port), TUNNEL_START_TIMEOUT_MS)
        .then((url) => {
          const base = typeof url === 'string' ? url.trim() : '';
          this.tunnelUrl = base ? base.replace(/\/+$/, '') : null;
          return this.tunnelUrl;
        })
        .catch(() => null)
        .finally(() => { this.tunnelPending = null; });
    }
    return this.tunnelPending;
  }

  private closeServerIfIdle(): void {
    if (this.shares.size === 0) this.closeServer();
  }

  /**
   * Close the loopback listener.
   *
   * WHAT ACTUALLY HAPPENS TO THE TUNNEL, honestly: closing this listener is
   * what stops the bytes, and that is what revocation is here. `tunnelmole`
   * exposes no close handle (the same limitation `webhook.ts:231` records), so
   * its client keeps running inside this process with nothing behind it and the
   * public URL answers with a gateway error instead of a file. This code cannot
   * tear that client down; only the app exiting does. The bound port is
   * REMEMBERED so the next share re-binds it and reuses the tunnel already
   * pointed at it, rather than orphaning a second client per share.
   */
  private closeServer(): void {
    const server = this.server;
    this.server = null;
    try { server?.close(); } catch { /* noop */ }
  }
}

/* ---- module helpers ------------------------------------------------------ */

/** 404, no body, no header that hints at why. Used for a bad method, a bad
 *  path, an unknown token and an expired token alike. */
function notFound(res: ServerResponse): void {
  res.writeHead(404);
  res.end();
}

/** The pathname, with no query and no fragment. An unparseable URL is ''. */
function pathnameOf(url: string | undefined): string {
  try {
    return new URL(url ?? '/', 'http://127.0.0.1').pathname;
  } catch {
    return '';
  }
}

/** Length checked `timingSafeEqual`. Both sides are 64 char hex in the real
 *  path; the length guard is here because `timingSafeEqual` throws otherwise. */
function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out')), ms);
    work.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

/** The real tunnel. Dynamic import keeps the ESM only package out of the CJS
 *  require graph; see the note at the top of this file. */
async function openTunnelViaTunnelmole(port: number): Promise<string> {
  const { tunnelmole } = await import('tunnelmole');
  return tunnelmole({ port });
}

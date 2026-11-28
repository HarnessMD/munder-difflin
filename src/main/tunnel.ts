/**
 * The public tunnel (tunnelmole) for the webhook server, Slack's HTTP mode and
 * file share links, kept open for as long as the app wants it (the
 * app quitting 12 hours after it started: hive/shared/eng/crash-1027/REPORT.md).
 *
 * Two things in tunnelmole 2.4.0 did it:
 * - The hosted service ends every connection after 12 hours, and the client's
 *   `clientDisconnect` message runs `process.exit(exitCode)` in OUR process.
 *   Two more handlers exit too (`hostnameAssigned` with no port,
 *   `hostnameAlreadyTaken`). A library must never end the app, so all three
 *   are replaced here: each writes a log line and closes that one connection.
 * - tunnelmole reconnects only a custom subdomain, so a random one died for
 *   good at 12 hours and every webhook stopped. Here any close reopens the
 *   tunnel, with backoff, and hands the caller the new URL (a new random
 *   subdomain: whoever holds the old one must be given the new one).
 *
 * The handlers are swapped on tunnelmole's own `messageHandlers` object, which
 * its socket looks up per message. The package has no `exports` map, so the
 * deep import is the same module instance its socket uses. The swapped
 * `hostnameAssigned` is also how one connection is told from another:
 * tunnelmole hands it the options object we passed, so each tunnel learns its
 * own socket and URL. (The library's URL event is one for the whole process,
 * so two tunnels opening at once could each get the other's URL.)
 *
 * tunnelmole() itself exits with code 1 when nothing listens on the port, so a
 * tunnel is only opened while `listening()` says our server is up on it.
 *
 * Kevin's trigger, so a test need not wait 12 hours: with MD_TUNNEL_DROP_AFTER_S
 * set, each connection, that many seconds after it opens, is handed to the
 * swapped `clientDisconnect` as if the service had sent it (exit code 1).
 */
// NOTE: `tunnelmole` is ESM only and the main process bundles as CommonJS, so
// it is imported dynamically (see webhook.ts). Do not hoist these imports.

export type TunnelName = 'webhook' | 'slack' | 'file-share';

export interface KeepTunnelOptions {
  name: TunnelName;
  port: number;
  /** True while our server listens on `port`. Checked before every open. */
  listening: () => boolean;
  /** A reopened tunnel's new public root. Not called for the first one. */
  onUrl?: (url: string) => void;
  /** The tunnel closed and is not reopened, because nothing listens on the port any more. */
  onDown?: () => void;
  startTimeoutMs: number;
}

export interface KeptTunnel {
  /** The public root it opened with. Later ones come through `onUrl`. */
  url: string;
  /** Stop for good: no reopen, and the connection is closed. */
  close: () => void;
}

/** The part of tunnelmole's `ws` socket used here. */
interface TunnelSocket {
  close(): void;
  on(event: 'close', listener: () => void): unknown;
}
type Options = { port: number };
type Handler = (message: Record<string, unknown>, websocket: TunnelSocket, options: Options) => unknown;

const RETRY_FIRST_MS = 2_000;
const RETRY_MAX_MS = 5 * 60_000;

let log: (e: Record<string, unknown>) => void = () => {};
/** Where tunnel lines go: log.jsonl (index.ts). */
export function setTunnelLog(fn: (e: Record<string, unknown>) => void): void {
  log = fn;
}

/** Each open's options object, to the tunnel that made it. */
const byOptions = new WeakMap<Options, Kept>();

function tunnelOf(options: Options): TunnelName | 'unknown' {
  return byOptions.get(options)?.name ?? 'unknown';
}

function dropAfterMs(): number {
  const s = Number(process.env.MD_TUNNEL_DROP_AFTER_S);
  return Number.isFinite(s) && s > 0 ? s * 1000 : 0;
}

let loaded: Promise<(options: Options) => Promise<string>> | null = null;
/** tunnelmole's handlers, once swapped. */
let handlers: Record<string, Handler> | null = null;

/** tunnelmole, with its exiting handlers replaced. Once per process. */
function load(): Promise<(options: Options) => Promise<string>> {
  loaded ??= (async () => {
    const [{ tunnelmole }, { messageHandlers }, { eventHandler, URL_ASSIGNED }] = await Promise.all([
      import('tunnelmole'),
      import('tunnelmole/dist/message-handlers.js'),
      import('tunnelmole/dist/src/events/event-handler.js')
    ]);
    const swapped = messageHandlers as unknown as Record<string, Handler>;
    const original = swapped.hostnameAssigned;
    swapped.hostnameAssigned = (message, websocket, options) => {
      const kept = byOptions.get(options);
      if (!kept) return original(message, websocket, options);
      // Each tunnelmole() call leaves a listener for the library's URL event,
      // which is never sent now. Nothing here waits on it.
      eventHandler.removeAllListeners(URL_ASSIGNED);
      kept.attach(options, websocket, typeof message.hostname === 'string' ? message.hostname : '');
    };
    swapped.clientDisconnect = (message, websocket, options) => {
      log({ kind: 'tunnel-disconnect', tunnel: tunnelOf(options), exitCode: message.exitCode ?? null });
      try { websocket.close(); } catch { /* already closed */ }
    };
    swapped.hostnameAlreadyTaken = (_message, websocket, options) => {
      log({ kind: 'tunnel-refused', tunnel: tunnelOf(options), reason: 'hostname already taken' });
      try { websocket.close(); } catch { /* already closed */ }
    };
    handlers = swapped;
    return tunnelmole as (options: Options) => Promise<string>;
  })();
  loaded.catch(() => { loaded = null; });
  return loaded;
}

class Kept {
  readonly name: TunnelName;
  private closed = false;
  private current: Options | null = null;
  private socket: TunnelSocket | null = null;
  private waiter: { resolve: (url: string) => void; reject: (e: Error) => void } | null = null;
  private retry: NodeJS.Timeout | null = null;
  private drop: NodeJS.Timeout | null = null;
  private attempt = 0;

  constructor(private readonly opts: KeepTunnelOptions) {
    this.name = opts.name;
  }

  async first(): Promise<KeptTunnel> {
    try {
      const url = await this.open();
      log({ kind: 'tunnel-open', tunnel: this.name, port: this.opts.port, url });
      return { url, close: () => this.close() };
    } catch (e) {
      this.close();
      throw e;
    }
  }

  /** tunnelmole saw the URL for one of our opens. A late one, or one after close, is let go. */
  attach(options: Options, socket: TunnelSocket, hostname: string): void {
    if (this.closed || options !== this.current || !hostname) {
      try { socket.close(); } catch { /* already closed */ }
      return;
    }
    this.socket = socket;
    socket.on('close', () => this.dropped(socket));
    const ms = dropAfterMs();
    if (ms) {
      // The swapped handler, as the service would reach it.
      this.drop = setTimeout(() => { handlers?.clientDisconnect({ type: 'clientDisconnect', exitCode: 1 }, socket, options); }, ms);
    }
    const waiter = this.waiter;
    this.waiter = null;
    waiter?.resolve(`https://${hostname}`);
  }

  close(): void {
    this.closed = true;
    this.current = null;
    if (this.retry) clearTimeout(this.retry);
    if (this.drop) clearTimeout(this.drop);
    this.retry = this.drop = null;
    const socket = this.socket;
    this.socket = null;
    try { socket?.close(); } catch { /* already closed */ }
  }

  private async open(): Promise<string> {
    if (!this.opts.listening()) throw new Error('nothing listens on the port');
    const tunnelmole = await load();
    const options: Options = { port: this.opts.port };
    byOptions.set(options, this);
    this.current = options;
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.current === options) this.current = null;
        this.waiter = null;
        reject(new Error('timed out'));
      }, this.opts.startTimeoutMs);
      this.waiter = {
        resolve: (url) => { clearTimeout(timer); resolve(url); },
        reject: (e) => { clearTimeout(timer); reject(e); }
      };
      tunnelmole(options).catch((e: unknown) => {
        if (this.current !== options) return;
        this.waiter?.reject(e instanceof Error ? e : new Error(String(e)));
        this.waiter = null;
      });
    });
  }

  private dropped(socket: TunnelSocket): void {
    if (socket !== this.socket) return;
    this.socket = null;
    if (this.drop) clearTimeout(this.drop);
    this.drop = null;
    if (this.closed) return;
    log({ kind: 'tunnel-closed', tunnel: this.name, port: this.opts.port });
    this.later();
  }

  private later(): void {
    if (this.closed || this.retry) return;
    const ms = Math.min(RETRY_FIRST_MS * 2 ** this.attempt, RETRY_MAX_MS);
    this.attempt++;
    this.retry = setTimeout(() => { this.retry = null; void this.reopen(); }, ms);
  }

  private async reopen(): Promise<void> {
    if (this.closed) return;
    if (!this.opts.listening()) {
      log({ kind: 'tunnel-reopen', tunnel: this.name, ok: false, error: 'nothing listens on the port' });
      this.close();
      this.opts.onDown?.();
      return;
    }
    try {
      const url = await this.open();
      if (this.closed) return;
      this.attempt = 0;
      log({ kind: 'tunnel-reopen', tunnel: this.name, ok: true, url });
      this.opts.onUrl?.(url);
    } catch (e) {
      if (this.closed) return;
      log({ kind: 'tunnel-reopen', tunnel: this.name, ok: false, error: e instanceof Error ? e.message : String(e), attempt: this.attempt });
      this.later();
    }
  }
}

/** Open a tunnel to `port` and keep it open until `close()`. Rejects when the first open fails. */
export function keepTunnel(opts: KeepTunnelOptions): Promise<KeptTunnel> {
  return new Kept(opts).first();
}

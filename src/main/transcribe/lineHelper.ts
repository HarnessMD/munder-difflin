/**
 * A JSON LINES HELPER, OWNED FROM MAIN (0.5.3, F16).
 *
 * The native helpers under resources/transcribe speak one protocol: a JSON
 * object per line on stdin, JSON lines on stdout. A line with an `id` answers
 * a request; a line with an `event` and no id is something the helper saw on
 * its own (a key press, audio, an error). This class spawns the process on
 * first use, hands out ids, matches replies, forwards progress lines to the
 * request that asked for them, forwards events to one listener, and starts a
 * fresh process on the next call after the old one dies.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

export type HelperLine = Record<string, unknown>;

export class HelperError extends Error {
  constructor(public readonly code: string, public readonly detail?: Record<string, unknown>) {
    super(detail && typeof detail.detail === 'string' ? `${code}: ${detail.detail}` : code);
  }
}

interface Pending {
  resolve: (r: HelperLine) => void;
  reject: (e: Error) => void;
  onLine?: (r: HelperLine) => void;
  /** Which lines close the request. Default: any line with `ok`, `text` or `error`. */
  isFinal?: (r: HelperLine) => boolean;
}

export interface LineHelperOptions {
  env?: NodeJS.ProcessEnv;
  onEvent?: (e: HelperLine) => void;
  onExit?: (why: string) => void;
  /** Override what closes a request; the default closes on `ok`, `text`, `error`. */
  isFinal?: (r: HelperLine) => boolean;
}

export class LineHelper {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private buffer = '';
  private stderrTail = '';

  constructor(private readonly binary: string, private readonly opts: LineHelperOptions = {}) {}

  get running(): boolean { return this.proc !== null; }

  private ensure(): ChildProcessWithoutNullStreams {
    if (this.proc) return this.proc;
    const p = spawn(this.binary, [], { stdio: ['pipe', 'pipe', 'pipe'], env: this.opts.env ?? process.env });
    // A helper that dies between two writes makes the next one fail with
    // EPIPE. The write's own callback reports it to the caller; without a
    // listener the stream would also throw it as an uncaught error in main.
    p.stdin.on('error', () => { /* reported by the write callback */ });
    this.proc = p;
    this.buffer = '';
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (chunk: string) => this.onData(chunk));
    p.stderr.setEncoding('utf8');
    p.stderr.on('data', (chunk: string) => { this.stderrTail = (this.stderrTail + chunk).slice(-2000); });
    const gone = (why: string) => {
      if (this.proc !== p) return;
      this.proc = null;
      const err = new HelperError('helper-exited', { detail: why, stderr: this.stderrTail });
      for (const [, w] of this.pending) w.reject(err);
      this.pending.clear();
      this.opts.onExit?.(why);
    };
    p.on('exit', (code, signal) => gone(`exit ${code ?? ''}${signal ? ` signal ${signal}` : ''}`));
    p.on('error', (e) => gone(e.message));
    // A write that lands after the helper died raises 'error' on its stdin
    // (EPIPE). Unheard, that is an uncaught exception in main; heard, the
    // 'exit' above has already rejected every pending request with why.
    p.stdin.on('error', () => { /* the exit handler says why */ });
    return p;
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let nl: number;
    while ((nl = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, nl);
      this.buffer = this.buffer.slice(nl + 1);
      if (!line.trim()) continue;
      let reply: HelperLine;
      try { reply = JSON.parse(line) as HelperLine; } catch { continue; }
      if (typeof reply.id !== 'number') {
        if (typeof reply.event === 'string' || typeof reply.error === 'string') this.opts.onEvent?.(reply);
        continue; // the ready line, or anything without an id
      }
      const w = this.pending.get(reply.id);
      if (!w) continue;
      const done = (w.isFinal ?? this.opts.isFinal ?? defaultFinal)(reply);
      if (done) {
        this.pending.delete(reply.id);
        if (typeof reply.error === 'string') w.reject(new HelperError(reply.error, reply));
        else w.resolve(reply);
      } else {
        w.onLine?.(reply);
      }
    }
  }

  /** Send one request; resolves with its closing line, rejects on `error`. */
  request(req: HelperLine, onLine?: (r: HelperLine) => void, isFinal?: (r: HelperLine) => boolean): Promise<HelperLine> {
    const p = this.ensure();
    const id = this.nextId++;
    return new Promise<HelperLine>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onLine, isFinal });
      p.stdin.write(JSON.stringify({ id, ...req }) + '\n', (e) => {
        if (e) { this.pending.delete(id); reject(new HelperError('helper-write-failed', { detail: e.message })); }
      });
    });
  }

  /** Ask the helper to quit and wait for it; kill it if it does not. */
  async stop(): Promise<void> {
    const p = this.proc;
    if (!p) return;
    await new Promise<void>((resolve) => {
      p.once('exit', () => resolve());
      this.request({ op: 'shutdown' }).catch(() => { /* it is exiting */ });
      setTimeout(() => { if (this.proc === p) p.kill(); }, 2000).unref();
    });
  }

  /** For a test that wants the process gone under a request's feet. */
  killForTests(signal: NodeJS.Signals = 'SIGKILL'): void { this.proc?.kill(signal); }
}

function defaultFinal(r: HelperLine): boolean {
  return 'ok' in r || 'text' in r || 'error' in r;
}

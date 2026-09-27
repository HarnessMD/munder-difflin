/**
 * The resident `md-whisper` helper (F16): where it lives, how it is started,
 * and one JSON line per request and reply over its stdin and stdout.
 *
 * Protocol (tools/transcribe-helper/md-whisper.cpp is the other end):
 *   start  md-whisper --model <ggml> [--threads N] [--no-gpu]
 *   ready  {"ready":true,"model":...,"gpu":true,"threads":4,"whisper":"<commit>"}
 *   ask    {"id","audioPath"|"pcm16"+"sampleRate","mode","prompt","model"?}
 *   reply  {"id","text","segments":[{t0,t1,text}],"ms","seconds"} | {"id","error"}
 *
 * The model loads once; a request that names a different `model` swaps it in
 * the helper and it stays swapped. Requests are answered in order (the helper
 * is single threaded), so this client queues them and matches replies by id.
 *
 * No electron import: the caller passes the paths (tests run this against the
 * real binary with a fixture wav, skipped when the binary is not built).
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

export type TranscribeMode = 'dictation' | 'meeting';

export interface HelperRequest {
  audioPath?: string;
  /** Raw int16 little endian mono samples. */
  pcm16?: Buffer;
  sampleRate?: number;
  mode?: TranscribeMode;
  /** whisper's initial prompt, see prompt.ts. */
  prompt?: string;
  /** ggml file to use for this and later requests. */
  model?: string;
  timeoutMs?: number;
}

export interface HelperSegment { t0: number; t1: number; text: string }

export interface HelperReply {
  text: string;
  segments: HelperSegment[];
  /** Decode time inside the helper. */
  ms: number;
  /** Audio length as the helper saw it. */
  seconds: number;
}

export interface HelperReady { model: string; gpu: boolean; threads: number; whisper: string }

/** The helper target folder electron-builder ships for this platform. */
export function helperTarget(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'darwin') return 'darwin-universal';
  if (platform === 'win32') return 'win32-x64';
  return 'linux-x64';
}

/**
 * Where the helper binary and the bundled model are. `resourcesRoot` is
 * `process.resourcesPath` in a packaged app and `<repo>/resources` in dev; both
 * hold `transcribe/<target>/md-whisper` and `transcribe/models/<file>`.
 */
export function helperPaths(resourcesRoot: string, platform: NodeJS.Platform = process.platform): { binary: string; modelsDir: string } {
  const exe = platform === 'win32' ? 'md-whisper.exe' : 'md-whisper';
  return {
    binary: join(resourcesRoot, 'transcribe', helperTarget(platform), exe),
    modelsDir: join(resourcesRoot, 'transcribe', 'models')
  };
}

export function helperAvailable(resourcesRoot: string, platform: NodeJS.Platform = process.platform): boolean {
  return existsSync(helperPaths(resourcesRoot, platform).binary);
}

interface Pending {
  resolve: (r: HelperReply) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

export interface WhisperHelperOptions {
  binary: string;
  model: string;
  threads?: number;
  gpu?: boolean;
  /** Called with whisper's stderr lines (its own logging), for the app log. */
  onLog?: (line: string) => void;
  startTimeoutMs?: number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

export class WhisperHelper {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<string, Pending>();
  private seq = 0;
  private readyInfo: HelperReady | null = null;
  private exited: Error | null = null;

  constructor(private readonly opts: WhisperHelperOptions) {}

  get ready(): HelperReady | null { return this.readyInfo; }
  get running(): boolean { return this.proc !== null && this.exited === null; }

  /** Spawn and wait for the ready line. Rejects if the model does not load. */
  start(): Promise<HelperReady> {
    if (this.proc) return Promise.resolve(this.readyInfo!);
    const args = ['--model', this.opts.model];
    if (this.opts.threads) args.push('--threads', String(this.opts.threads));
    if (this.opts.gpu === false) args.push('--no-gpu');
    const proc = spawn(this.opts.binary, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    // A helper that dies between two writes makes the next one fail with
    // EPIPE. The write's own callback reports it to the caller; without a
    // listener the stream would also throw it as an uncaught error in main.
    proc.stdin.on('error', () => { /* reported by the write callback */ });
    this.proc = proc;
    this.exited = null;
    return new Promise<HelperReady>((resolve, reject) => {
      const startTimer = setTimeout(() => {
        reject(new Error('md-whisper did not report ready in time'));
        this.stop();
      }, this.opts.startTimeoutMs ?? 60_000);
      let settled = false;
      const settle = (fn: () => void) => { if (!settled) { settled = true; clearTimeout(startTimer); fn(); } };

      createInterface({ input: proc.stdout }).on('line', (line) => {
        if (!line.trim()) return;
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(line) as Record<string, unknown>; } catch { this.opts.onLog?.(`md-whisper: unparseable line: ${line}`); return; }
        if ('ready' in msg) {
          if (msg.ready === true) {
            this.readyInfo = { model: String(msg.model), gpu: msg.gpu === true, threads: Number(msg.threads), whisper: String(msg.whisper) };
            settle(() => resolve(this.readyInfo!));
          } else {
            settle(() => reject(new Error(String(msg.error ?? 'md-whisper failed to start'))));
          }
          return;
        }
        const id = typeof msg.id === 'string' ? msg.id : null;
        const p = id ? this.pending.get(id) : undefined;
        if (!p) { this.opts.onLog?.(`md-whisper: reply for unknown request ${line.slice(0, 120)}`); return; }
        this.pending.delete(id!);
        clearTimeout(p.timer);
        if (typeof msg.error === 'string') {
          const e = new Error(typeof msg.detail === 'string' ? `${msg.error}: ${msg.detail}` : msg.error) as Error & { code?: string };
          e.code = msg.error;
          p.reject(e);
          return;
        }
        p.resolve({
          text: String(msg.text ?? ''),
          segments: Array.isArray(msg.segments) ? (msg.segments as HelperSegment[]) : [],
          ms: Number(msg.ms ?? 0),
          seconds: Number(msg.seconds ?? 0)
        });
      });
      createInterface({ input: proc.stderr }).on('line', (line) => { if (line.trim()) this.opts.onLog?.(line); });
      proc.on('error', (e) => {
        this.exited = e;
        settle(() => reject(e));
        this.failAll(e);
      });
      proc.on('exit', (code, signal) => {
        const e = new Error(`md-whisper exited (${signal ?? code})`);
        this.exited = e;
        this.proc = null;
        this.readyInfo = null;
        settle(() => reject(e));
        this.failAll(e);
      });
    });
  }

  private failAll(e: Error): void {
    for (const [, p] of this.pending) { clearTimeout(p.timer); p.reject(e); }
    this.pending.clear();
  }

  transcribe(req: HelperRequest): Promise<HelperReply> {
    if (!this.proc || this.exited) return Promise.reject(this.exited ?? new Error('md-whisper is not running'));
    if (!req.audioPath && !req.pcm16) return Promise.reject(new Error('request needs audioPath or pcm16'));
    const id = `r${++this.seq}`;
    const wire: Record<string, unknown> = { id, mode: req.mode ?? 'dictation' };
    if (req.audioPath) wire.audioPath = req.audioPath;
    if (req.pcm16) { wire.pcm16 = req.pcm16.toString('base64'); wire.sampleRate = req.sampleRate ?? 16000; }
    if (req.prompt) wire.prompt = req.prompt;
    if (req.model) wire.model = req.model;
    return new Promise<HelperReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`md-whisper request ${id} timed out`));
      }, req.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.proc!.stdin.write(JSON.stringify(wire) + '\n', (e) => {
        if (e) { this.pending.delete(id); clearTimeout(timer); reject(e); }
      });
    });
  }

  /** Close stdin so the helper exits on its own; kill it if it lingers. */
  stop(): void {
    const proc = this.proc;
    if (!proc) return;
    this.proc = null;
    this.readyInfo = null;
    try { proc.stdin.end(); } catch { /* already closed */ }
    const killer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch { /* gone */ } }, 3000);
    proc.once('exit', () => clearTimeout(killer));
    this.failAll(new Error('md-whisper stopped'));
  }
}

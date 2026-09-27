/**
 * THE APPLE SPEECH HELPER, FROM THE MAIN PROCESS (0.5.3, F16).
 *
 * `md-speech` is a small Swift program (tools/md-speech/main.swift) that wraps
 * SpeechAnalyzer on macOS 26. It stays resident so the system keeps the model
 * warm, reads one JSON request per line on stdin and answers with JSON lines
 * on stdout, every line carrying the request's id. This module owns that
 * process: it spawns it on first use, hands out ids, matches replies, streams
 * dictation partials to the caller, and starts a fresh helper if the old one
 * dies. The router (src/main/transcribe/index.ts, Kevin) decides WHEN to call
 * it; this file only knows HOW.
 *
 * Nothing here touches the network. The model is Apple's own on device asset;
 * `install()` reserves or downloads it through the helper with progress lines.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

/** Seconds, the shape md-whisper answers with too. */
export interface SpeechSegment { t0: number; t1: number; text: string }
export interface SpeechResult { text: string; segments: SpeechSegment[]; ms: number; engine: string; locale: string }
export interface SpeechStatus {
  locale: string;
  /** The worse of the two module types; both are needed. */
  status: 'installed' | 'supported' | 'downloading' | 'unsupported' | 'unknown';
  dictation: string;
  transcriber: string;
  installed: string[];
  supported: string[];
}
/** A streamed dictation: audio goes in while the user speaks, the final text
 *  comes a moment after `end()`. Measured 23 Sep: 65 to 90 ms after the last
 *  chunk once the helper is warm, against 2 to 8 s for the same clip sent
 *  whole after the key went up. */
export interface SpeechStream {
  /** 16 bit little endian mono PCM at the rate the stream was opened with. */
  push(pcm16: Buffer): void;
  /** No more audio; resolves with the final text. `ms` is end to final. */
  end(): Promise<SpeechResult & { totalMs: number; seconds: number; chunks: number }>;
  /** Nothing wanted (a tap): the session is dropped, `end()` must not follow. */
  cancel(): void;
}
export interface StreamRequest {
  sampleRate?: number;
  channels?: number;
  mode?: 'dictation' | 'meeting';
  words?: string[];
  locale?: string;
  engine?: 'transcriber' | 'dictation';
}
export interface AssetProgress { state: 'downloading' | 'installed'; progress?: number; ms?: number; locale: string }
export interface TranscribeRequest {
  /** A wav (or anything AVAudioFile reads) on disk, or raw 16 bit PCM. */
  audioPath?: string;
  pcm16?: Buffer;
  sampleRate?: number;
  channels?: number;
  mode: 'dictation' | 'meeting';
  /** Custom vocabulary: goes in as SpeechAnalyzer contextual strings. */
  words?: string[];
  locale?: string;
  /** Partials on or off; defaults to on for dictation, off for meeting. */
  stream?: boolean;
  /** "transcriber" (default, the measured one) or "dictation" (opt in). */
  engine?: 'transcriber' | 'dictation';
  /** Download the asset first when it is only supported. */
  autoInstall?: boolean;
}

export class MdSpeechError extends Error {
  constructor(public readonly code: string, public readonly detail?: Record<string, unknown>) {
    super(detail && typeof detail.detail === 'string' ? `${code}: ${detail.detail}` : code);
  }
}

type Reply = Record<string, unknown> & { id?: unknown };
interface Pending {
  resolve: (r: Reply) => void;
  reject: (e: Error) => void;
  onLine?: (r: Reply) => void;
}

/** Where the helper lives: beside the app's resources when packaged, in the
 *  repo's resources/ folder in dev. One universal binary (arm64 and x86_64),
 *  the same shape as md-whisper. */
export function mdSpeechPath(resourcesPath: string): string {
  return path.join(resourcesPath, 'transcribe', 'darwin-universal', 'md-speech');
}

export function mdSpeechAvailable(resourcesPath: string): boolean {
  if (process.platform !== 'darwin') return false;
  return existsSync(mdSpeechPath(resourcesPath));
}

export class MdSpeech {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private buffer = '';
  private stderrTail = '';

  constructor(private readonly binary: string, private readonly env: NodeJS.ProcessEnv = process.env) {}

  /** The helper is alive (spawned and not exited). */
  get running(): boolean { return this.proc !== null; }

  private ensure(): ChildProcessWithoutNullStreams {
    if (this.proc) return this.proc;
    const p = spawn(this.binary, [], { stdio: ['pipe', 'pipe', 'pipe'], env: this.env });
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
      const err = new MdSpeechError('helper-exited', { detail: why, stderr: this.stderrTail });
      for (const [, w] of this.pending) w.reject(err);
      this.pending.clear();
    };
    p.on('exit', (code, signal) => gone(`exit ${code ?? ''}${signal ? ` signal ${signal}` : ''}`));
    p.on('error', (e) => gone(e.message));
    return this.proc;
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let nl: number;
    while ((nl = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, nl);
      this.buffer = this.buffer.slice(nl + 1);
      if (!line.trim()) continue;
      let reply: Reply;
      try { reply = JSON.parse(line) as Reply; } catch { continue; }
      const id = typeof reply.id === 'number' ? reply.id : -1;
      const w = this.pending.get(id);
      if (!w) continue;
      // The helper's ready line has no id and no pending request; it is skipped
      // above. A final line is one with text or error; the rest is progress.
      if ('text' in reply || 'error' in reply || ('ok' in reply) || ('status' in reply && !('event' in reply)) || (reply.event === 'asset' && reply.state === 'installed')) {
        this.pending.delete(id);
        if ('error' in reply) w.reject(new MdSpeechError(String(reply.error), reply));
        else w.resolve(reply);
      } else {
        w.onLine?.(reply);
      }
    }
  }

  private send(req: Record<string, unknown>, onLine?: (r: Reply) => void): Promise<Reply> {
    return this.sendWithId(req, onLine).reply;
  }

  private sendWithId(req: Record<string, unknown>, onLine?: (r: Reply) => void): { id: number; reply: Promise<Reply> } {
    const p = this.ensure();
    const id = this.nextId++;
    const reply = new Promise<Reply>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onLine });
      p.stdin.write(JSON.stringify({ id, ...req }) + '\n', (e) => {
        if (e) { this.pending.delete(id); reject(new MdSpeechError('helper-write-failed', { detail: e.message })); }
      });
    });
    return { id, reply };
  }

  /** A line with no id and no reply: a stream's chunk, end or cancel. */
  private write(obj: Record<string, unknown>): void {
    const p = this.proc;
    if (!p) return;
    p.stdin.write(JSON.stringify(obj) + '\n', () => { /* a dead helper rejects the stream's reply */ });
  }

  async ping(): Promise<{ version: string; macos: string }> {
    const r = await this.send({ op: 'ping' });
    return { version: String(r.version), macos: String(r.macos) };
  }

  async status(locale = 'en_US'): Promise<SpeechStatus> {
    return await this.send({ op: 'status', locale }) as unknown as SpeechStatus;
  }

  /** Reserve or download the on device model for a locale. Progress lines
   *  arrive while a download runs (fraction 0..1); the promise resolves when
   *  the asset is installed. */
  async install(locale = 'en_US', onProgress?: (p: AssetProgress) => void): Promise<{ ms: number }> {
    const r = await this.send({ op: 'install', locale }, (line) => {
      if (line.event === 'asset') onProgress?.(line as unknown as AssetProgress);
    });
    return { ms: Number(r.ms ?? 0) };
  }

  /** Transcribe once. `onPartial` receives the text so far while a dictation
   *  streams; the promise resolves with the final text and segments. */
  async transcribe(req: TranscribeRequest, onPartial?: (text: string) => void): Promise<SpeechResult> {
    const wire: Record<string, unknown> = { mode: req.mode };
    if (req.audioPath) wire.audioPath = req.audioPath;
    if (req.pcm16) { wire.pcm16 = req.pcm16.toString('base64'); wire.sampleRate = req.sampleRate ?? 16000; wire.channels = req.channels ?? 1; }
    if (req.words?.length) wire.words = req.words;
    if (req.locale) wire.locale = req.locale;
    if (req.stream !== undefined) wire.stream = req.stream;
    if (req.engine) wire.engine = req.engine;
    if (req.autoInstall) wire.autoInstall = true;
    const r = await this.send(wire, (line) => {
      if (typeof line.partial === 'string') onPartial?.(line.partial);
    });
    return {
      text: String(r.text ?? ''),
      segments: Array.isArray(r.segments) ? r.segments as SpeechSegment[] : [],
      ms: Number(r.ms ?? 0),
      engine: String(r.engine ?? ''),
      locale: String(r.locale ?? '')
    };
  }

  /** Open a streamed dictation. Resolves once the helper has a session taking
   *  audio; rejects with code `unknown-op` on a helper without streams (the
   *  caller then sends the whole clip through `transcribe`). */
  openStream(req: StreamRequest, onPartial?: (text: string) => void): Promise<SpeechStream> {
    const wire: Record<string, unknown> = { op: 'stream', sampleRate: req.sampleRate ?? 16000, channels: req.channels ?? 1, mode: req.mode ?? 'dictation' };
    if (req.words?.length) wire.words = req.words;
    if (req.locale) wire.locale = req.locale;
    if (req.engine) wire.engine = req.engine;
    return new Promise<SpeechStream>((resolve, reject) => {
      let opened = false;
      const { id, reply } = this.sendWithId(wire, (line) => {
        if (line.stream === 'open' && !opened) { opened = true; resolve(handle); }
        if (typeof line.partial === 'string') onPartial?.(line.partial);
      });
      // A cancel closes the reply with an error nobody may be waiting on.
      reply.catch((e) => { if (!opened) reject(e); });
      const handle: SpeechStream = {
        push: (pcm16) => this.write({ op: 'chunk', stream: id, pcm16: pcm16.toString('base64') }),
        end: async () => {
          this.write({ op: 'end', stream: id });
          const r = await reply;
          return {
            text: String(r.text ?? ''),
            segments: Array.isArray(r.segments) ? r.segments as SpeechSegment[] : [],
            ms: Number(r.ms ?? 0),
            totalMs: Number(r.totalMs ?? 0),
            seconds: Number(r.seconds ?? 0),
            chunks: Number(r.chunks ?? 0),
            engine: String(r.engine ?? ''),
            locale: String(r.locale ?? '')
          };
        },
        cancel: () => this.write({ op: 'cancel', stream: id })
      };
    });
  }

  /** Run a moment of silence through a session so the system loads the model
   *  now, not on the user's first press (3 to 4 s at load, then under 100 ms). */
  async warm(locale = 'en_US'): Promise<{ ms: number }> {
    const r = await this.send({ op: 'warm', locale });
    return { ms: Number(r.ms ?? 0) };
  }

  /** Ask the helper to quit; resolves once it has. */
  async stop(): Promise<void> {
    const p = this.proc;
    if (!p) return;
    await new Promise<void>((resolve) => {
      p.once('exit', () => resolve());
      this.send({ op: 'shutdown' }).catch(() => { /* it is exiting */ });
      setTimeout(() => { if (this.proc === p) p.kill(); }, 2000).unref();
    });
  }
}

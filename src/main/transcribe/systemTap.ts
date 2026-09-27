/**
 * THE OTHER SIDE OF A CALL ON macOS, FROM THE MAIN PROCESS (0.5.3, F16,
 * hive/shared/v053/F16-SYSTEM-AUDIO-PLAN.md, PR 2).
 *
 * `md-tap` (tools/md-tap/main.swift) taps the display's audio through
 * ScreenCaptureKit, this app's own sound excluded, and hands over 16 kHz
 * mono int16 chunks on the JSON lines protocol every helper on the floor
 * speaks, each stamped with the wall clock time of its first sample. This
 * class owns that process through the shared LineHelper: start feeds every
 * chunk to the caller (the puck's ring, which cuts them to the microphone's
 * segments), stop ends the capture, and the permission calls back the
 * Settings row. macOS 13 or later, and the Screen Recording grant, which is
 * the one the puck's screenshot already asks for.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { release } from 'node:os';
import { HelperError, LineHelper, type HelperLine } from './lineHelper';

export interface TapChunk { pcm16: Buffer; sampleRate: number; seq: number; ts?: number }
export type TapEvent =
  | { type: 'audio-start'; startedAt: number }
  | { type: 'chunk'; chunk: TapChunk }
  | { type: 'audio-end'; seconds: number; peak: number; chunks: number }
  | { type: 'error'; error: string; detail?: string }
  | { type: 'helper-exited'; why: string };

export function mdTapPath(resourcesPath: string): string {
  return path.join(resourcesPath, 'transcribe', 'darwin-universal', 'md-tap');
}
/** Darwin 22 is macOS 13, the first with ScreenCaptureKit audio. */
export function mdTapAvailable(resourcesPath: string, platform: NodeJS.Platform = process.platform, darwinRelease: string = release()): boolean {
  if (platform !== 'darwin') return false;
  const major = parseInt(darwinRelease.split('.')[0] ?? '', 10);
  if (!Number.isFinite(major) || major < 22) return false;
  return existsSync(mdTapPath(resourcesPath));
}

export class SystemTap {
  private helper: LineHelper;
  private running = false;

  constructor(binary: string, private readonly onEvent: (e: TapEvent) => void, env?: NodeJS.ProcessEnv) {
    this.helper = new LineHelper(binary, {
      env,
      onEvent: (l) => this.onLine(l),
      onExit: (why) => { this.running = false; onEvent({ type: 'helper-exited', why }); }
    });
  }

  get active(): boolean { return this.running; }

  async permissions(): Promise<{ screen: boolean }> {
    const r = await this.helper.request({ op: 'permissions' }, undefined, (l) => 'screen' in l || 'error' in l);
    return { screen: r.screen === true };
  }
  /** Asks once when never asked; macOS grants after the app is reopened. */
  async requestPermission(): Promise<{ screen: boolean }> {
    const r = await this.helper.request({ op: 'requestPermission' }, undefined, (l) => 'screen' in l || 'error' in l);
    return { screen: r.screen === true };
  }
  async openSettings(): Promise<boolean> {
    const r = await this.helper.request({ op: 'openSettings' });
    return r.ok === true;
  }

  /** Begin the tap; resolves with the wall clock start. Rejects with code
   *  `screen-denied` or `capture-failed`. */
  async start(): Promise<{ startedAt: number }> {
    const r = await this.helper.request({ op: 'start' });
    this.running = true;
    return { startedAt: Number(r.startedAt) };
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    await this.helper.request({ op: 'stop' }).catch(() => { /* it may be gone */ });
  }

  /** End the helper for good (app quit). */
  async dispose(): Promise<void> {
    if (this.helper.running) await this.helper.stop();
    this.running = false;
  }

  private onLine(l: HelperLine): void {
    switch (l.event) {
      case 'audio-start': this.onEvent({ type: 'audio-start', startedAt: Number(l.startedAt) }); break;
      case 'chunk': {
        const pcm16 = Buffer.from(String(l.pcm16 ?? ''), 'base64');
        const ts = typeof l.ts === 'number' ? l.ts : undefined;
        this.onEvent({ type: 'chunk', chunk: { pcm16, sampleRate: Number(l.sampleRate ?? 16000), seq: Number(l.seq ?? 0), ts } });
        break;
      }
      case 'audio-end': this.onEvent({ type: 'audio-end', seconds: Number(l.seconds ?? 0), peak: Number(l.peak ?? 0), chunks: Number(l.chunks ?? 0) }); break;
      case 'error': this.running = false; this.onEvent({ type: 'error', error: String(l.error), detail: l.detail === undefined ? undefined : String(l.detail) }); break;
      default:
        if (typeof l.error === 'string') this.onEvent({ type: 'error', error: l.error });
    }
  }
}

export const isTapDenied = (e: unknown): boolean => e instanceof HelperError && e.code === 'screen-denied';

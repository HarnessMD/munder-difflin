/**
 * DICTATE INTO ANY APP, macOS (0.5.3, F16, the plan's step 3).
 *
 * The user holds a key anywhere on the Mac, talks, lets go, and the words
 * land in whatever text field has focus, in any app. The pieces:
 *
 *   md-hotkey (tools/md-hotkey/main.swift)  the key with key up, the mic
 *                                            while it is held, the paste
 *   a transcriber                            md-speech on macOS 26, md-whisper
 *                                            elsewhere; the router picks
 *   this file                                the loop between the two
 *
 * Two ways the audio travels. STREAMED, when the transcriber offers
 * `openStream`: the helper hands over 16 kHz PCM in chunks while the key is
 * held, each goes straight to a session the recogniser works on during the
 * speech, and the final text lands a moment after key up (65 to 90 ms on
 * md-speech once warm, 23 Sep). FILE MODE, the fallback: the helper hands
 * back the whole clip on key up and it goes through `transcribe` in one go
 * (2 to 8 s on Apple under load, which is why streaming exists). The loop
 * keeps every chunk, so a stream that is refused (a helper without the op
 * answers `unknown-op`: md-whisper) or fails falls back to file mode for
 * that utterance, and a refusal turns streaming off for the rest of the
 * session. Either way the text goes to the helper to paste (pasteboard,
 * Cmd+V, pasteboard restored). One utterance at a time, in order; a hold
 * shorter than `minHoldMs` is a tap and is ignored.
 *
 * Permissions the user must grant, in this order, both remembered per app
 * signature: Microphone (asked by `requestMic`), then Accessibility (asked by
 * `requestAccessibility`, which also covers posting the Cmd+V keystroke).
 * `permissions()` reports the three states for a Settings row; `openSettings`
 * jumps to the pane. Ad hoc signed dev builds lose the grants on every
 * rebuild (F16-ANY-APP-DICTATION.md, section 4), so the flow is hand tested
 * on the packaged build.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { HelperError, LineHelper, type HelperLine } from './lineHelper';

export interface AnyAppStream {
  push(pcm16: Buffer): void;
  end(): Promise<{ text: string; ms?: number }>;
  cancel(): void;
}
export interface AnyAppTranscriber {
  transcribe(req: { pcm16: Buffer; sampleRate: number; mode: 'dictation'; words?: string[] }, onPartial?: (text: string) => void): Promise<{ text: string }>;
  /** A session that takes the audio while the key is held. Reject with code
   *  `unknown-op` or `unsupported` from a helper without it; the loop then
   *  uses `transcribe` for the whole clip, now and for every later press. */
  openStream?(req: { sampleRate: number; mode: 'dictation'; words?: string[] }, onPartial?: (text: string) => void): Promise<AnyAppStream>;
}

export type AnyAppEvent =
  | { type: 'keydown' }
  /** The microphone's loudness while held, 0 to 1, about every 40 ms: the
   *  Stapler's live meter (0.5.3). */
  | { type: 'level'; rms: number; peak: number }
  /** Something else was pressed during a hold take: nothing is typed. */
  | { type: 'cancelled'; why: string }
  | { type: 'keyup'; heldMs: number }
  | { type: 'tap'; heldMs: number }
  | { type: 'transcribing'; seconds: number; streamed: boolean }
  | { type: 'partial'; text: string }
  /** `ms` is key up to pasted, the number the user feels. */
  | { type: 'injected'; text: string; ms: number; streamed: boolean }
  /** Streaming was refused by the transcriber; file mode from here on. */
  | { type: 'stream-off'; why: string }
  | { type: 'empty' }
  | { type: 'error'; error: string; detail?: string }
  | { type: 'helper-exited'; why: string };

export interface AnyAppPermissions { mic: 'authorized' | 'denied' | 'notDetermined' | 'restricted' | 'unknown'; accessibility: boolean; postEvent: boolean }

export interface AnyAppOptions {
  helperPath: string;
  /** Electron style accelerator with at least one modifier, or an F key: "Control+Alt+Space". */
  key: string;
  transcriber: AnyAppTranscriber;
  /** The vocabulary to favour, read fresh for every utterance. */
  words?: () => string[];
  onEvent?: (e: AnyAppEvent) => void;
  /** A hold shorter than this is a tap, not dictation. Default 250 ms. */
  minHoldMs?: number;
  /** Stream the held audio when the transcriber can take it. Default true. */
  stream?: boolean;
  /** Asked at every key down: true drops this take without a trace (no
   *  events, nothing typed). main uses it while our own window has focus and
   *  Free Flow's in app hold-Option owns the gesture there. */
  ignore?: () => boolean;
  /** How long the pasted text stays on the pasteboard before it is put back. Default 300 ms. */
  restoreMs?: number;
  env?: NodeJS.ProcessEnv;
}

/** Hold Option alone (0.5.3); shared/transcribeConfig.ts holds the same. */
export const DEFAULT_PUSH_TO_TALK_KEY = 'Option';

/** The helper for this platform (F16, Windows and Linux from 23 Sep): the
 *  Swift one on macOS, the C ones from tools/md-hotkey-native elsewhere, all
 *  speaking one protocol. */
export function mdHotkeyPath(resourcesPath: string, platform: NodeJS.Platform = process.platform): string {
  const target = platform === 'darwin' ? 'darwin-universal' : platform === 'win32' ? 'win32-x64' : 'linux-x64';
  return path.join(resourcesPath, 'transcribe', target, platform === 'win32' ? 'md-hotkey.exe' : 'md-hotkey');
}
export function mdHotkeyAvailable(resourcesPath: string, platform: NodeJS.Platform = process.platform): boolean {
  return existsSync(mdHotkeyPath(resourcesPath, platform));
}

/** `floor`: this process is a floor (B23), and the hotkey is machine wide, so
 *  only the main floor arms it. */
export type AnyAppUnavailableReason = 'no-helper' | 'wayland' | 'floor';

/** A Wayland session, with or without XWayland: an X11 key grab there never
 *  sees a key pressed in a native Wayland window, so it is refused whole. */
export function isWaylandSession(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.XDG_SESSION_TYPE === 'wayland' || (!!env.WAYLAND_DISPLAY && !env.DISPLAY);
}

/** Why no global key can run here (any app dictation and the meeting chord
 *  share the helper and its limits), or null when it can. The Settings row
 *  shows the sentence; the switch stays off. In order: a floor (the main
 *  floor owns the keys), a Wayland session (no build can fix that, so it
 *  outranks a missing helper), then the helper not in this build. */
export function anyAppUnavailableReason(resourcesPath: string, platform: NodeJS.Platform = process.platform, env: NodeJS.ProcessEnv = process.env, opts: { floor?: boolean } = {}): AnyAppUnavailableReason | null {
  if (opts.floor) return 'floor';
  if (platform === 'linux' && isWaylandSession(env)) return 'wayland';
  if (!mdHotkeyAvailable(resourcesPath, platform)) return 'no-helper';
  return null;
}

interface Held {
  /** The session, or null when opening failed (file mode for this one). */
  open: Promise<AnyAppStream | null>;
  parts: Buffer[];
  sampleRate: number;
  keyupAt: number;
}

const streamRefused = (e: unknown): boolean => e instanceof HelperError && (e.code === 'unknown-op' || e.code === 'unsupported');

export class AnyAppDictation {
  private helper: LineHelper;
  private chain: Promise<void> = Promise.resolve();
  private armedKey: string | null = null;
  /** True once the transcriber refused a stream: file mode for the session. */
  private streamOff = false;
  private held: Held | null = null;
  /** The current take is being dropped (opts.ignore said so at key down). */
  private skipping = false;

  constructor(private readonly opts: AnyAppOptions) {
    this.helper = new LineHelper(opts.helperPath, {
      env: opts.env,
      onEvent: (e) => this.onHelperEvent(e),
      onExit: (why) => { this.armedKey = null; opts.onEvent?.({ type: 'helper-exited', why }); }
    });
  }

  get armed(): string | null { return this.armedKey; }
  /** Chunks while held, or the whole clip on key up. */
  get streaming(): boolean { return (this.opts.stream ?? true) && typeof this.opts.transcriber.openStream === 'function'; }
  get streamRefused(): boolean { return this.streamOff; }

  /** Spawn the helper and register the key. */
  async start(): Promise<{ key: string; keyCode: number; stream: boolean }> {
    const r = await this.helper.request({ op: 'arm', key: this.opts.key, record: true, stream: this.streaming });
    this.armedKey = this.opts.key;
    return { key: this.opts.key, keyCode: Number(r.keyCode), stream: r.stream === true };
  }

  /** Unregister the key and end the helper. */
  async stop(): Promise<void> {
    if (this.helper.running) {
      await this.helper.request({ op: 'disarm' }).catch(() => { /* it may be gone */ });
      await this.helper.stop();
    }
    this.armedKey = null;
  }

  async permissions(): Promise<AnyAppPermissions> {
    const r = await this.helper.request({ op: 'permissions' }, undefined, (l) => 'mic' in l || 'error' in l);
    return { mic: r.mic as AnyAppPermissions['mic'], accessibility: r.accessibility === true, postEvent: r.postEvent === true };
  }
  async requestMic(): Promise<AnyAppPermissions['mic']> {
    const r = await this.helper.request({ op: 'requestMic' }, undefined, (l) => 'mic' in l || 'error' in l);
    return r.mic as AnyAppPermissions['mic'];
  }
  async requestAccessibility(): Promise<boolean> {
    const r = await this.helper.request({ op: 'requestAccessibility' }, undefined, (l) => 'accessibility' in l || 'error' in l);
    return r.accessibility === true;
  }
  async requestPostEvent(): Promise<boolean> {
    const r = await this.helper.request({ op: 'requestPostEvent' }, undefined, (l) => 'postEvent' in l || 'error' in l);
    return r.postEvent === true;
  }
  async openSettings(pane: 'accessibility' | 'microphone' | 'inputMonitoring'): Promise<boolean> {
    const r = await this.helper.request({ op: 'openSettings', pane });
    return r.ok === true;
  }

  /** Paste text into the frontmost app now (the Settings "try it" button). */
  async inject(text: string, dryRun = false): Promise<{ posted: boolean }> {
    const r = await this.helper.request({ op: 'inject', text, dryRun, restoreMs: this.opts.restoreMs ?? 300 });
    return { posted: r.posted === true };
  }

  private onHelperEvent(e: HelperLine): void {
    const emit = this.opts.onEvent;
    if (e.event === 'keydown') this.skipping = this.opts.ignore?.() === true;
    if (this.skipping) {
      // Dropped take: swallow everything up to its end.
      if (e.event === 'audio' || e.event === 'audio-end' || e.event === 'cancel') this.skipping = false;
      if (e.event === 'keydown' || e.event === 'keyup' || e.event === 'chunk' || e.event === 'level' || e.event === 'audio' || e.event === 'audio-end' || e.event === 'cancel') return;
    }
    switch (e.event) {
      case 'level':
        emit?.({ type: 'level', rms: Number(e.rms ?? 0), peak: Number(e.peak ?? 0) });
        break;
      case 'cancel': {
        const h = this.held;
        this.held = null;
        if (h) void h.open.then((st) => st?.cancel());
        emit?.({ type: 'cancelled', why: String(e.why ?? '') });
        break;
      }
      case 'keydown':
        emit?.({ type: 'keydown' });
        if (this.streaming) this.held = this.openHeld();
        break;
      case 'keyup':
        emit?.({ type: 'keyup', heldMs: Number(e.heldMs ?? 0) });
        if (this.held) this.held.keyupAt = Date.now();
        break;
      case 'chunk': {
        // While the key is held: keep it, and hand it to the session once
        // that is open (the promise keeps the order).
        const h = this.held ?? (this.held = this.openHeld());
        const buf = Buffer.from(String(e.pcm16 ?? ''), 'base64');
        h.sampleRate = Number(e.sampleRate ?? h.sampleRate);
        h.parts.push(buf);
        void h.open.then((s) => s?.push(buf));
        break;
      }
      case 'audio-end': {
        const h = this.held;
        this.held = null;
        if (!h) break;
        const seconds = Number(e.seconds ?? 0);
        const minHold = (this.opts.minHoldMs ?? 250) / 1000;
        if (!h.keyupAt) h.keyupAt = Date.now();
        if (seconds < minHold) {
          void h.open.then((s) => s?.cancel());
          emit?.({ type: 'tap', heldMs: Math.round(seconds * 1000) });
          break;
        }
        this.chain = this.chain.then(() => this.streamed(h, seconds)).catch(() => { /* reported inside */ });
        break;
      }
      case 'audio': {
        const seconds = Number(e.seconds ?? 0);
        const minHold = (this.opts.minHoldMs ?? 250) / 1000;
        if (seconds < minHold) { emit?.({ type: 'tap', heldMs: Math.round(seconds * 1000) }); break; }
        const pcm16 = Buffer.from(String(e.pcm16 ?? ''), 'base64');
        const sampleRate = Number(e.sampleRate ?? 16000);
        // One at a time, in the order the user spoke.
        this.chain = this.chain.then(() => this.utterance(pcm16, sampleRate, seconds, Date.now())).catch(() => { /* reported inside */ });
        break;
      }
      case 'error': emit?.({ type: 'error', error: String(e.error), detail: e.detail === undefined ? undefined : String(e.detail) }); break;
      default:
        if (typeof e.error === 'string') emit?.({ type: 'error', error: e.error });
    }
  }

  /** The key just went down: open a session, unless streaming is off. */
  private openHeld(): Held {
    const emit = this.opts.onEvent;
    const h: Held = { open: Promise.resolve(null), parts: [], sampleRate: 16000, keyupAt: 0 };
    const open = this.opts.transcriber.openStream;
    if (this.streamOff || !open) return h;
    h.open = open.call(this.opts.transcriber, { sampleRate: 16000, mode: 'dictation', words: this.opts.words?.() }, (p) => emit?.({ type: 'partial', text: p }))
      .catch((err: unknown) => {
        if (streamRefused(err)) {
          this.streamOff = true;
          emit?.({ type: 'stream-off', why: err instanceof Error ? err.message : String(err) });
        }
        // Whatever the reason, this utterance goes through file mode.
        return null;
      });
    return h;
  }

  /** Key up after a streamed hold: finish the session, or fall back. */
  private async streamed(h: Held, seconds: number): Promise<void> {
    const emit = this.opts.onEvent;
    const s = await h.open;
    const whole = () => this.utterance(Buffer.concat(h.parts), h.sampleRate, seconds, h.keyupAt);
    if (!s) return whole();
    emit?.({ type: 'transcribing', seconds, streamed: true });
    let text = '';
    try {
      text = (await s.end()).text.trim();
    } catch (err) {
      if (streamRefused(err)) { this.streamOff = true; emit?.({ type: 'stream-off', why: err instanceof Error ? err.message : String(err) }); }
      // The chunks are still here: file mode for this one.
      return whole();
    }
    await this.paste(text, h.keyupAt, true);
  }

  private async utterance(pcm16: Buffer, sampleRate: number, seconds: number, keyupAt: number): Promise<void> {
    const emit = this.opts.onEvent;
    emit?.({ type: 'transcribing', seconds, streamed: false });
    let text = '';
    try {
      const r = await this.opts.transcriber.transcribe(
        { pcm16, sampleRate, mode: 'dictation', words: this.opts.words?.() },
        (p) => emit?.({ type: 'partial', text: p })
      );
      text = r.text.trim();
    } catch (err) {
      emit?.({ type: 'error', error: 'transcription-failed', detail: err instanceof Error ? err.message : String(err) });
      return;
    }
    await this.paste(text, keyupAt, false);
  }

  private async paste(text: string, keyupAt: number, streamed: boolean): Promise<void> {
    const emit = this.opts.onEvent;
    if (!text) { emit?.({ type: 'empty' }); return; }
    try {
      await this.inject(text);
      emit?.({ type: 'injected', text, ms: Date.now() - keyupAt, streamed });
    } catch (err) {
      const code = err instanceof HelperError ? err.code : 'inject-failed';
      emit?.({ type: 'error', error: code, detail: err instanceof Error ? err.message : String(err) });
    }
  }
}

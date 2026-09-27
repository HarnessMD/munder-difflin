/**
 * THE TRANSCRIPTION ROUTER (0.5.3, F16, founder 23 Sep 2026). One door for the
 * two places that turn audio into text, the composer's push to talk (Free
 * Flow) and Stapler's meeting and message recorders: the caller hands over a
 * clip exactly as it did for Groq, and gets the same { ok, text } back. What
 * changed is where the words come from: Apple's on device recogniser
 * (md-speech, macOS 26) or whisper.cpp (md-whisper, every platform), each a
 * resident helper this router spawns once and keeps; Groq only when the user
 * pasted a key and asked for it, or when nothing local can answer.
 *
 * Audio: the helpers read a wav from disk, so the renderer hands over 16 kHz
 * mono wav (see renderer/audio/toWav) and this writes it to a temp file for
 * the request. A webm or ogg clip (an older recording on disk) can only go to
 * Groq; without a key it is refused with a plain reason.
 *
 * Vocabulary: the shipped list plus the user's words go to Apple whole (no
 * cap measured) and to whisper as its initial prompt, which keeps 224 tokens,
 * about 75 names; prompt.ts trims the shipped list from its tail and keeps
 * every user word.
 */
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, release } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { HarnessConfig } from '../config';
import { transcribeWithGroq, DEFAULT_GROQ_MODEL, type TranscribeOptions, type TranscribeResult } from '../freeflow';
import { DEFAULT_TRANSCRIBE_VOCABULARY, vocabularyFor } from '../../shared/transcribeVocabulary';
import { withTranscribeDefaults, type TranscribeConfig, type TranscribeModel } from '../../shared/transcribeConfig';
import { chooseEngine, appleUsable, type ChosenEngine, type EngineFacts, type TranscribeMode } from './engineChoice';
import { WhisperHelper, helperPaths, helperAvailable } from './whisperHelper';
import { buildWhisperPrompt } from './prompt';
import { WHISPER_MODELS } from './models';
import { downloadModel, modelInstalled } from './modelDownload';
import { MdSpeech, mdSpeechPath, mdSpeechAvailable } from './mdSpeech';
import { encodeWav } from '../../shared/wav';

export interface RouterDeps {
  /** process.resourcesPath in the packaged app, <repo>/resources in dev. */
  resourcesPath: string;
  /** app.getPath('userData'): downloaded models live under <userData>/models. */
  userDataPath: string;
  readConfig: () => HarnessConfig;
  platform?: NodeJS.Platform;
  darwinMajor?: number;
  log?: (line: string) => void;
  /** Injected for tests; the real one is Groq. */
  groq?: (opts: TranscribeOptions) => Promise<TranscribeResult>;
}

export interface TranscribeCall extends Omit<TranscribeOptions, 'apiKey'> {
  mode?: TranscribeMode;
  apiKey?: string;
}

export interface RouterStatus {
  platform: NodeJS.Platform;
  engines: { apple: boolean; whisper: boolean; groq: boolean };
  chosen: { dictation: ChosenEngine | null; meeting: ChosenEngine | null };
  model: { selected: TranscribeModel; inUse: TranscribeModel; installed: Record<TranscribeModel, boolean>; path: Record<TranscribeModel, string> };
  words: { total: number; custom: number; whisperKept: number; whisperPromptChars: number };
  config: TranscribeConfig;
}

export function darwinMajorOf(rel: string = release()): number {
  const n = parseInt(rel.split('.')[0] ?? '', 10);
  return Number.isFinite(n) ? n : 0;
}

export class TranscribeRouter {
  private whisper: WhisperHelper | null = null;
  private whisperModelPath: string | null = null;
  private speech: MdSpeech | null = null;
  /** The md-speech this router has warmed, so it happens once per helper. */
  private speechWarmed: MdSpeech | null = null;
  private readonly platform: NodeJS.Platform;
  private readonly darwinMajor: number;
  private readonly groq: (opts: TranscribeOptions) => Promise<TranscribeResult>;

  constructor(private readonly deps: RouterDeps) {
    this.platform = deps.platform ?? process.platform;
    this.darwinMajor = deps.darwinMajor ?? (this.platform === 'darwin' ? darwinMajorOf() : 0);
    this.groq = deps.groq ?? transcribeWithGroq;
  }

  private log(line: string): void { this.deps.log?.(`[transcribe] ${line}`); }

  config(): TranscribeConfig { return withTranscribeDefaults(this.deps.readConfig().transcribe); }

  /** Where each whisper model lives: the bundled one beside the helper, the
   *  downloaded one under userData. */
  modelPath(id: TranscribeModel): string {
    const info = WHISPER_MODELS[id];
    if (info.url) return join(this.deps.userDataPath, 'models', info.file);
    return join(helperPaths(this.deps.resourcesPath, this.platform).modelsDir, info.file);
  }

  modelInstalledSync(id: TranscribeModel): boolean { return existsSync(this.modelPath(id)); }

  /** The selected model when its file is there, else the bundled base: a
   *  wiped userData or a synced config on a fresh machine must not take whisper
   *  out entirely (Creed's review of #48). */
  modelInUse(cfg: TranscribeConfig = this.config()): TranscribeModel {
    return cfg.model === 'small' && !this.modelInstalledSync('small') ? 'base' : cfg.model;
  }

  facts(cfg: TranscribeConfig = this.config()): EngineFacts {
    const groqKey = typeof this.deps.readConfig().groqApiKey === 'string' && this.deps.readConfig().groqApiKey!.trim().length > 0;
    return {
      platform: this.platform,
      darwinMajor: this.darwinMajor,
      appleAvailable: this.platform === 'darwin' && mdSpeechAvailable(this.deps.resourcesPath),
      whisperAvailable: helperAvailable(this.deps.resourcesPath, this.platform) && this.modelInstalledSync(this.modelInUse(cfg)),
      groqKey
    };
  }

  /** The words the engines are told about: shipped list (unless off) then the user's. */
  words(cfg: TranscribeConfig = this.config()): string[] {
    return vocabularyFor(cfg.customWords, cfg.defaultVocabulary);
  }

  whisperPrompt(cfg: TranscribeConfig = this.config()): string {
    return buildWhisperPrompt({ defaultWords: cfg.defaultVocabulary ? DEFAULT_TRANSCRIBE_VOCABULARY : [], customWords: cfg.customWords });
  }

  status(): RouterStatus {
    const cfg = this.config();
    const f = this.facts(cfg);
    const prompt = this.whisperPrompt(cfg);
    return {
      platform: this.platform,
      engines: { apple: appleUsable(f), whisper: f.whisperAvailable, groq: f.groqKey },
      chosen: { dictation: chooseEngine(cfg.engine, 'dictation', f), meeting: chooseEngine(cfg.engine, 'meeting', f) },
      model: {
        selected: cfg.model,
        inUse: this.modelInUse(cfg),
        installed: { base: this.modelInstalledSync('base'), small: this.modelInstalledSync('small') },
        path: { base: this.modelPath('base'), small: this.modelPath('small') }
      },
      words: { total: this.words(cfg).length, custom: cfg.customWords.length, whisperKept: prompt ? prompt.split(', ').length : 0, whisperPromptChars: prompt.length },
      config: cfg
    };
  }

  /** True when some engine can answer a request of this kind right now. */
  canTranscribe(mode: TranscribeMode = 'meeting'): boolean {
    const cfg = this.config();
    return chooseEngine(cfg.engine, mode, this.facts(cfg)) !== null;
  }

  async downloadModel(id: TranscribeModel, onProgress?: (received: number, total: number | null) => void): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
    const info = WHISPER_MODELS[id];
    if (!info.url) return { ok: false, error: 'bundled' };
    const dest = this.modelPath(id);
    try {
      mkdirSync(join(this.deps.userDataPath, 'models'), { recursive: true });
      if (await modelInstalled(dest, info.sha256)) return { ok: true, path: dest };
      await downloadModel({ url: info.url, dest, sha256: info.sha256, bytes: info.bytes, onProgress });
      this.log(`downloaded ${info.file}`);
      return { ok: true, path: dest };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log(`download of ${info.file} failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  async transcribe(call: TranscribeCall): Promise<TranscribeResult> {
    const cfg = this.config();
    const mode: TranscribeMode = call.mode ?? 'dictation';
    const f = this.facts(cfg);
    const engine = chooseEngine(cfg.engine, mode, f);
    if (!engine) return { ok: false, error: 'no transcription engine: the local helpers are missing and no Groq key is set' };
    const mime = (call.mimeType ?? 'audio/webm').split(';')[0].trim().toLowerCase();
    const isWav = mime === 'audio/wav' || mime === 'audio/x-wav' || mime === 'audio/wave';
    if (engine === 'groq') return this.viaGroq(call);
    if (!isWav) {
      // An old clip on disk, or a caller that did not convert: only Groq reads it.
      if (f.groqKey) return this.viaGroq(call);
      return { ok: false, error: `local transcription needs wav audio, got ${mime}` };
    }
    const tmp = join(tmpdir(), `md-transcribe-${randomUUID()}.wav`);
    try {
      // The clip is speech; on a shared machine's /tmp it is the user's alone.
      writeFileSync(tmp, toBuffer(call.audio), { mode: 0o600 });
      // The founder's fallback order: a local failure falls to the other local
      // engine when there is one, then to Groq when a key exists. Every engine
      // that failed is taken out of the facts, so the chain walks the whole
      // `auto` order and does not stop after one hop.
      const failed: ChosenEngine[] = [];
      const errors: string[] = [];
      // A local engine that heard nothing (24 Sep): on dictation the other
      // local engine gets the same clip before an empty answer is believed,
      // since "nothing typed" is what a failing recogniser looks like to the
      // person. Never Groq for this: silence is not sent to the cloud.
      let heardNothing = false;
      let next: ChosenEngine | null = engine;
      while (next) {
        const started = Date.now();
        try {
          if (next === 'groq') {
            const r = await this.viaGroq(call);
            if (r.ok || errors.length === 0) return r;
            return { ok: false, error: [...errors, `groq: ${r.error ?? 'failed'}`].join('; ') };
          }
          const { text, segments } = next === 'apple'
            ? await this.viaApple(tmp, mode, this.words(cfg))
            : await this.viaWhisper(tmp, mode, cfg);
          this.log(`${next} ${mode} ${Date.now() - started} ms, ${text.length} chars${failed.length ? ` (after ${failed.join(', ')} failed)` : ''}`);
          if (!text && mode === 'dictation') {
            const tried: ChosenEngine[] = [...failed, next];
            const other = chooseEngine('auto', mode, {
              ...f,
              groqKey: false,
              appleAvailable: f.appleAvailable && !tried.includes('apple'),
              whisperAvailable: f.whisperAvailable && !tried.includes('whisper')
            });
            if (other && !tried.includes(other)) {
              this.log(`${next} ${mode} heard nothing; trying ${other}`);
              heardNothing = true;
              failed.push(next);
              next = other;
              continue;
            }
          }
          // The lines with their times ride along for a meeting clip (the You
          // and Them merge); a dictation reads the text and ignores them.
          return call.timestamps && segments?.length ? { ok: true, text, segments } : { ok: true, text };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.log(`${next} ${mode} failed: ${msg}`);
          failed.push(next);
          errors.push(`${next}: ${msg}`);
          next = chooseEngine('auto', mode, {
            ...f,
            appleAvailable: f.appleAvailable && !failed.includes('apple'),
            whisperAvailable: f.whisperAvailable && !failed.includes('whisper')
          });
          if (next && failed.includes(next)) next = null;
          // After an empty answer the fallback is local only (see above).
          if (heardNothing && next === 'groq') next = null;
        }
      }
      // Every engine that answered heard nothing: that is silence, not an error.
      if (heardNothing) return { ok: true, text: '' };
      return { ok: false, error: errors.join('; ') };
    } finally {
      try { unlinkSync(tmp); } catch { /* already gone */ }
    }
  }

  /** The any app loop's shape off the Mac (F16, Windows and Linux): raw 16 kHz
   *  PCM in, text out, through the same engine choice as the composer. The
   *  loop runs in file mode there (md-whisper refuses streams), one clip per
   *  key up. Throws on failure so the loop reports it as an event. */
  async transcribePcm16(req: { pcm16: Buffer; sampleRate: number; mode?: TranscribeMode }): Promise<{ text: string }> {
    // A fresh ArrayBuffer: a pooled Buffer's byteOffset need not be even.
    const bytes = req.pcm16.buffer.slice(req.pcm16.byteOffset, req.pcm16.byteOffset + req.pcm16.byteLength - (req.pcm16.byteLength % 2));
    const wav = Buffer.from(encodeWav(new Int16Array(bytes), req.sampleRate));
    const r = await this.transcribe({ audio: wav, mimeType: 'audio/wav', filename: 'anyapp.wav', mode: req.mode ?? 'dictation' });
    if (!r.ok) throw new Error(r.error ?? 'transcription failed');
    return { text: r.text ?? '' };
  }

  private viaGroq(call: TranscribeCall): Promise<TranscribeResult> {
    const cfg = this.deps.readConfig();
    return this.groq({ ...call, apiKey: cfg.groqApiKey ?? '', model: call.model ?? cfg.freeflowModel ?? DEFAULT_GROQ_MODEL });
  }

  /** The resident md-speech, spawned on first use. Right after it spawns the
   *  asset is reserved and a moment of silence goes through it, so the system
   *  loads the model now and not on the composer's first dictation (3 to 4 s
   *  at load, then under 100 ms; 23 Sep). A failure is logged, never thrown:
   *  the transcribe that follows reports its own. */
  private speechHelper(): MdSpeech {
    this.speech ??= new MdSpeech(mdSpeechPath(this.deps.resourcesPath));
    const s = this.speech;
    if (this.speechWarmed !== s) {
      this.speechWarmed = s;
      void s.install('en_US').then(() => s.warm('en_US'))
        .then((r) => this.log(`md-speech warm in ${r.ms} ms`))
        .catch((e: unknown) => this.log(`md-speech warm failed: ${e instanceof Error ? e.message : String(e)}`));
    }
    return s;
  }

  /** At launch: load the dictation engine now so the first press does not
   *  wait. Apple: spawn and warm md-speech. Whisper (the default since 24 Sep):
   *  start md-whisper, which loads the model; on a machine that never ran
   *  this build it also compiles its GPU kernels, about 30 s once, and that
   *  belongs here rather than on the first dictation (measured 24 Sep on an
   *  M1: first call 33 s, every call after 0.2 to 0.5 s). */
  warmUp(): void {
    const s = this.status();
    if (s.chosen.dictation === 'apple') this.speechHelper();
    if (s.chosen.dictation === 'whisper') {
      const started = Date.now();
      void this.whisperReady(this.config())
        .then(() => this.log(`md-whisper warm in ${Date.now() - started} ms`))
        .catch((e: unknown) => this.log(`md-whisper warm failed: ${e instanceof Error ? e.message : String(e)}`));
    }
  }

  /** The resident md-whisper, started once. A call that arrives while it is
   *  still starting waits for that start instead of spawning a second one. */
  private whisperStarting: Promise<WhisperHelper> | null = null;
  private whisperReady(cfg: TranscribeConfig): Promise<WhisperHelper> {
    if (this.whisperStarting) return this.whisperStarting;
    if (this.whisper && this.whisper.running) return Promise.resolve(this.whisper);
    const modelPath = this.modelPath(this.modelInUse(cfg));
    this.whisper?.stop();
    const w = new WhisperHelper({ binary: helperPaths(this.deps.resourcesPath, this.platform).binary, model: modelPath, onLog: (l) => this.log(`whisper: ${l}`) });
    this.whisper = w;
    const starting = w.start().then(() => { this.whisperModelPath = modelPath; return w; });
    this.whisperStarting = starting;
    const clear = (): void => { if (this.whisperStarting === starting) this.whisperStarting = null; };
    starting.then(clear, clear);
    return starting;
  }

  private async viaApple(audioPath: string, mode: TranscribeMode, words: string[]): Promise<{ text: string; segments: TranscribeResult['segments'] }> {
    const r = await this.speechHelper().transcribe({ audioPath, mode, words, stream: false, autoInstall: true });
    return { text: r.text.trim(), segments: r.segments };
  }

  private async viaWhisper(audioPath: string, mode: TranscribeMode, cfg: TranscribeConfig): Promise<{ text: string; segments: TranscribeResult['segments'] }> {
    const modelPath = this.modelPath(this.modelInUse(cfg));
    const whisper = await this.whisperReady(cfg);
    const prompt = this.whisperPrompt(cfg);
    const swap = this.whisperModelPath !== modelPath ? { model: modelPath } : {};
    const r = await whisper.transcribe({ audioPath, mode, prompt: prompt || undefined, ...swap });
    this.whisperModelPath = modelPath;
    return { text: r.text.trim(), segments: r.segments };
  }

  stop(): void {
    this.whisper?.stop();
    this.whisper = null;
    void this.speech?.stop().catch(() => { /* gone */ });
    this.speech = null;
    this.speechWarmed = null;
  }
}

function toBuffer(audio: ArrayBuffer | Uint8Array | Buffer): Buffer {
  if (Buffer.isBuffer(audio)) return audio;
  if (audio instanceof Uint8Array) return Buffer.from(audio.buffer, audio.byteOffset, audio.byteLength);
  return Buffer.from(audio);
}

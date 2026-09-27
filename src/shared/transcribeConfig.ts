/**
 * THE DICTATION AND MEETINGS SETTINGS (0.5.3, F16, founder 23 Sep 2026): one
 * object under `transcribe` in the config, read by main (the router that picks
 * the engine, the any app loop) and drawn by the Settings section. Kept
 * shared so the three copies of the config type agree on one shape.
 *
 * `engine`: which recogniser transcribes. `auto` is the founder's default:
 * Apple's on device engine for dictation on macOS 26, whisper for meetings
 * and for every other machine, Groq only when the user pasted a key and
 * nothing local is there. `model`: the whisper model, the bundled base or the
 * downloaded small. `customWords`: the user's own names, on top of the
 * shipped vocabulary unless `defaultVocabulary` is off. `pushToTalkKey` and
 * `anyApp`: dictation into any app on macOS.
 */
export type TranscribeEngine = 'auto' | 'apple' | 'whisper' | 'groq';
export type TranscribeModel = 'base' | 'small';

export interface TranscribeConfig {
  engine: TranscribeEngine;
  model: TranscribeModel;
  customWords: string[];
  defaultVocabulary: boolean;
  pushToTalkKey: string;
  anyApp: boolean;
  /** Also record the other side of calls in a meeting, where this machine
   *  has a source for it (0.5.3, F16). On by default. */
  meetingSystemAudio: boolean;
  /** The chord that starts and stops a Stapler meeting from anywhere (0.5.3,
   *  F16, founder 23 Sep). Empty means the platform default: Shift+Command+Space
   *  on the Mac, Control+Shift+Space on Windows and Linux (shared/hotkeyName). */
  meetingKey: string;
  /** The capture chord (I6). '' = the platform's (defaultCaptureKey). */
  captureKey: string;
  /** A soft sound when dictation starts listening and when it stops (0.5.3,
   *  founder 24 Sep). On by default. */
  dictationSounds: boolean;
  /** The fields the user set in Settings. main wrote the whole object on
   *  every save, so a stored `anyApp: false` or the old push to talk key may
   *  be a default nobody chose; only the fields named here are kept over a
   *  new default (0.5.3: Option hold and any app on, founder 24 Sep). */
  chosen: Array<'anyApp' | 'pushToTalkKey'>;
}

/** Hold Option alone for 300 ms, anywhere (founder, 24 Sep 2026). The helper
 *  takes "Option" as a hold, not a chord (tools/md-hotkey/main.swift). */
export const DEFAULT_PUSH_TO_TALK_KEY = 'Option';
/** The default before 0.5.3's Option hold, kept to recognise it on disk.
 *  Still the default off the Mac: the Windows and Linux helpers take chords,
 *  and a bare Option is not one (F16, founder 25 Sep: #60 is in 0.5.3). */
export const OLD_PUSH_TO_TALK_KEY = 'Control+Alt+Space';

/** The push to talk key a new install gets on this platform. */
export function defaultPushToTalkKeyFor(platform: string): string {
  return platform === 'darwin' ? DEFAULT_PUSH_TO_TALK_KEY : OLD_PUSH_TO_TALK_KEY;
}
const hostPlatform = (): string => (typeof process !== 'undefined' && typeof process.platform === 'string' ? process.platform : 'darwin');

export const DEFAULT_TRANSCRIBE: TranscribeConfig = {
  engine: 'auto',
  model: 'base',
  customWords: [],
  defaultVocabulary: true,
  pushToTalkKey: DEFAULT_PUSH_TO_TALK_KEY,
  anyApp: true,
  meetingSystemAudio: true,
  meetingKey: '',
  captureKey: '',
  dictationSounds: true,
  chosen: []
};

const ENGINES: readonly TranscribeEngine[] = ['auto', 'apple', 'whisper', 'groq'];
const MODELS: readonly TranscribeModel[] = ['base', 'small'];
/** A custom word is one line of the Settings box: a name, a phrase, an acronym. */
export const MAX_CUSTOM_WORDS = 500;
export const MAX_CUSTOM_WORD_CHARS = 64;

/** Every field present and of the right type, whatever the file said. A
 *  stored value the app does not know (an engine from a later release, a
 *  model that was renamed) falls back to the default for that one field. */
export function withTranscribeDefaults(stored: unknown, platform: string = hostPlatform()): TranscribeConfig {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const engine = ENGINES.includes(s.engine as TranscribeEngine) ? (s.engine as TranscribeEngine) : DEFAULT_TRANSCRIBE.engine;
  const model = MODELS.includes(s.model as TranscribeModel) ? (s.model as TranscribeModel) : DEFAULT_TRANSCRIBE.model;
  const customWords = cleanCustomWords(s.customWords);
  const defaultVocabulary = typeof s.defaultVocabulary === 'boolean' ? s.defaultVocabulary : DEFAULT_TRANSCRIBE.defaultVocabulary;
  const chosen = (Array.isArray(s.chosen) ? s.chosen : []).filter((c): c is 'anyApp' | 'pushToTalkKey' => c === 'anyApp' || c === 'pushToTalkKey');
  const chosenSet = [...new Set(chosen)];
  // A stored value is kept when the user chose it, or when it is not a value
  // an older build wrote as its default. Otherwise the new default wins.
  const storedKey = typeof s.pushToTalkKey === 'string' ? s.pushToTalkKey.trim() : '';
  // On the Mac an unchosen old default moves to the Option hold (#110). Off the
  // Mac Control+Alt+Space IS the default, and a bare Option (a 0.5.3 build
  // before this wrote it for every platform) cannot be armed, so it goes back.
  const armable = !(platform !== 'darwin' && storedKey === DEFAULT_PUSH_TO_TALK_KEY);
  const oldMacDefault = platform === 'darwin' && storedKey === OLD_PUSH_TO_TALK_KEY;
  const keep = !!storedKey && armable && (chosenSet.includes('pushToTalkKey') || !oldMacDefault);
  const pushToTalkKey = keep ? storedKey : defaultPushToTalkKeyFor(platform);
  const anyApp = typeof s.anyApp === 'boolean' && (chosenSet.includes('anyApp') || s.anyApp) ? s.anyApp : DEFAULT_TRANSCRIBE.anyApp;
  const dictationSounds = typeof s.dictationSounds === 'boolean' ? s.dictationSounds : DEFAULT_TRANSCRIBE.dictationSounds;
  const meetingSystemAudio = typeof s.meetingSystemAudio === 'boolean' ? s.meetingSystemAudio : DEFAULT_TRANSCRIBE.meetingSystemAudio;
  const meetingKey = typeof s.meetingKey === 'string' ? s.meetingKey.trim() : DEFAULT_TRANSCRIBE.meetingKey;
  const captureKey = typeof s.captureKey === 'string' ? s.captureKey.trim() : DEFAULT_TRANSCRIBE.captureKey;
  return { engine, model, customWords, defaultVocabulary, pushToTalkKey, anyApp, meetingSystemAudio, meetingKey, captureKey, dictationSounds, chosen: chosenSet };
}

/** The user's words as the box gave them: trimmed, one per entry, blanks and
 *  repeats (ignoring case) dropped, capped in count and length. */
export function cleanCustomWords(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/\r?\n|,/) : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const w = String(item ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_CUSTOM_WORD_CHARS);
    if (!w) continue;
    const k = w.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
    if (out.length >= MAX_CUSTOM_WORDS) break;
  }
  return out;
}

/**
 * WHICH ENGINE TRANSCRIBES (0.5.3, F16). Pure, so the rule is testable without
 * a helper on disk. The founder's decision, 23 Sep 2026, on the benchmark:
 * Apple's on device recogniser for dictation on macOS 26 (nothing to ship, the
 * best word error), whisper.cpp for meetings and for every other machine (it
 * fits the installer and clears the headset line), Groq only as the fallback
 * the user opted into by pasting a key.
 *
 * Changed 24 Sep 2026 (founder): "the stapler's default transcription model
 * should be the bundled one we provide". `auto` is the bundled whisper.cpp
 * first for dictation too; Apple is the first fallback on macOS 26 and stays
 * selectable by name.
 *
 * `darwinMajor` is the kernel major from os.release(): 25 is macOS 26, where
 * SpeechAnalyzer exists; md-speech itself exits with "unsupported-macos" below
 * that, so the router never even spawns it there.
 */
import type { TranscribeEngine } from '../../shared/transcribeConfig';

export type TranscribeMode = 'dictation' | 'meeting';
export type ChosenEngine = 'apple' | 'whisper' | 'groq';

export interface EngineFacts {
  platform: NodeJS.Platform;
  darwinMajor: number;
  /** md-speech is on disk. */
  appleAvailable: boolean;
  /** md-whisper and the selected model are on disk. */
  whisperAvailable: boolean;
  /** The user pasted a Groq key. */
  groqKey: boolean;
}

export const APPLE_MIN_DARWIN_MAJOR = 25;

export function appleUsable(f: EngineFacts): boolean {
  return f.platform === 'darwin' && f.darwinMajor >= APPLE_MIN_DARWIN_MAJOR && f.appleAvailable;
}

/** The engine for this request, or null when nothing can transcribe. A
 *  preference that cannot be honoured falls through the same order `auto`
 *  uses, so a chosen engine that is missing never silently returns nothing. */
export function chooseEngine(pref: TranscribeEngine, mode: TranscribeMode, f: EngineFacts): ChosenEngine | null {
  const apple = appleUsable(f);
  const order: ChosenEngine[] = mode === 'dictation'
    ? ['whisper', 'apple', 'groq']
    : ['whisper', 'apple', 'groq'];
  const usable = (e: ChosenEngine): boolean => (e === 'apple' ? apple : e === 'whisper' ? f.whisperAvailable : f.groqKey);
  if (pref !== 'auto' && usable(pref)) return pref;
  for (const e of order) if (usable(e)) return e;
  return null;
}

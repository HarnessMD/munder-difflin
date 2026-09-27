/**
 * DICTATE INTO ANY APP FOLLOWS THE CHOSEN ENGINE (0.5.3, founder 24 Sep 2026:
 * "the stapler's default transcription model should be the bundled one").
 * The any app loop used md-speech whatever Settings said. It still streams
 * through md-speech when the router picks Apple for dictation; for Whisper or
 * Groq the held audio goes through the router as one wav, the same door the
 * composer and the Stapler use, fallbacks included. No stream here: the loop
 * reads a transcriber without `openStream` as file mode.
 */
import { encodeWav } from '../../shared/wav';
import type { AnyAppTranscriber } from './anyApp';

export type RouteWav = (wav: Buffer) => Promise<{ ok: boolean; text?: string; error?: string }>;

export function anyAppViaRouter(route: RouteWav): AnyAppTranscriber {
  return {
    transcribe: async (req) => {
      // Copied into a fresh buffer: the helper's chunk may sit at an odd
      // offset, and an Int16Array view needs an even one.
      const bytes = new Uint8Array(req.pcm16.byteLength - (req.pcm16.byteLength % 2));
      bytes.set(req.pcm16.subarray(0, bytes.byteLength));
      const wav = Buffer.from(encodeWav(new Int16Array(bytes.buffer), req.sampleRate));
      const r = await route(wav);
      if (!r.ok) throw new Error(r.error ?? 'transcription failed');
      return { text: (r.text ?? '').trim() };
    }
  };
}

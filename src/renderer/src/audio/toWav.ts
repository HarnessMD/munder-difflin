/**
 * A recorded clip to the wav the local recognisers read (0.5.3, F16). The
 * recorders capture what MediaRecorder gives them, webm or ogg with opus
 * inside; WebAudio decodes that, an OfflineAudioContext resamples it to
 * 16 kHz mono, and shared/wav writes the bytes. Null when the clip cannot be
 * decoded, and the caller sends the original so Groq can still read it.
 */
import { encodeWav, floatToInt16, mixToMono, resampleLinear, WAV_SAMPLE_RATE } from '@shared/wav';

export interface WavClip { audio: ArrayBuffer; mimeType: 'audio/wav'; filename: string; seconds: number }

export async function blobToWav16k(blob: Blob, filenameBase = 'clip'): Promise<WavClip | null> {
  if (typeof AudioContext === 'undefined') return null;
  let ctx: AudioContext | null = null;
  try {
    ctx = new AudioContext();
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const mono = await toMono16k(decoded);
    const pcm = floatToInt16(mono);
    return { audio: encodeWav(pcm, WAV_SAMPLE_RATE), mimeType: 'audio/wav', filename: `${filenameBase}.wav`, seconds: pcm.length / WAV_SAMPLE_RATE };
  } catch {
    return null;
  } finally {
    void ctx?.close().catch(() => undefined);
  }
}

async function toMono16k(decoded: AudioBuffer): Promise<Float32Array> {
  const channels: Float32Array[] = [];
  for (let c = 0; c < decoded.numberOfChannels; c++) channels.push(decoded.getChannelData(c));
  const mono = mixToMono(channels);
  if (decoded.sampleRate === WAV_SAMPLE_RATE) return mono;
  if (typeof OfflineAudioContext === 'undefined') return resampleLinear(mono, decoded.sampleRate, WAV_SAMPLE_RATE);
  try {
    const frames = Math.max(1, Math.ceil(mono.length * WAV_SAMPLE_RATE / decoded.sampleRate));
    const off = new OfflineAudioContext(1, frames, WAV_SAMPLE_RATE);
    const src = off.createBufferSource();
    const buf = off.createBuffer(1, mono.length, decoded.sampleRate);
    buf.copyToChannel(new Float32Array(mono), 0);
    src.buffer = buf;
    src.connect(off.destination);
    src.start(0);
    const rendered = await off.startRendering();
    return rendered.getChannelData(0);
  } catch {
    return resampleLinear(mono, decoded.sampleRate, WAV_SAMPLE_RATE);
  }
}

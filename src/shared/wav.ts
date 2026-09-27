/**
 * A 16 bit PCM wav writer (0.5.3, F16). The local recognisers read a wav from
 * disk; the recorders capture webm or ogg. The renderer decodes the clip with
 * WebAudio, resamples it to 16 kHz mono, and this turns the samples into the
 * bytes main writes out. Pure, so the header is testable in node.
 */
export const WAV_SAMPLE_RATE = 16_000;

export function floatToInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return out;
}

/** Average the channels into one. A mono buffer comes back as is. */
export function mixToMono(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i] / channels.length;
  return out;
}

/** Linear resampling, enough for speech going to 16 kHz; the renderer
 *  prefers OfflineAudioContext when it has one and uses this as the fallback. */
export function resampleLinear(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate || samples.length === 0) return samples;
  const ratio = fromRate / toRate;
  const n = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(samples.length - 1, i0 + 1);
    const t = pos - i0;
    out[i] = samples[i0] * (1 - t) + samples[i1] * t;
  }
  return out;
}

/** RIFF/WAVE, PCM 16 bit, one channel. */
export function encodeWav(pcm: Int16Array, sampleRate: number = WAV_SAMPLE_RATE): ArrayBuffer {
  const dataBytes = pcm.length * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buf);
  const ascii = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ascii(36, 'data');
  v.setUint32(40, dataBytes, true);
  new Int16Array(buf, 44).set(pcm);
  return buf;
}

/** The header read back, for tests and for a sanity check before a request. */
export function readWavHeader(buf: ArrayBuffer): { sampleRate: number; channels: number; bits: number; dataBytes: number } | null {
  if (buf.byteLength < 44) return null;
  const v = new DataView(buf);
  const tag = (off: number) => String.fromCharCode(v.getUint8(off), v.getUint8(off + 1), v.getUint8(off + 2), v.getUint8(off + 3));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  return { channels: v.getUint16(22, true), sampleRate: v.getUint32(24, true), bits: v.getUint16(34, true), dataBytes: v.getUint32(40, true) };
}

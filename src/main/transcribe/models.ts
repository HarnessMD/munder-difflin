/**
 * The whisper models the app knows (F16). `base` ships inside the app;
 * `small` is an optional download from our release server.
 *
 * Checksums are of the official ggml files from the whisper.cpp project's
 * model repo (huggingface.co/ggerganov/whisper.cpp), measured in
 * F16-WHISPER-BENCH.md. The server copy under /releases/models/ is the same
 * file; the downloader refuses anything whose sha256 differs.
 */

export type WhisperModelId = 'base' | 'small';

export interface WhisperModelInfo {
  id: WhisperModelId;
  file: string;
  bytes: number;
  sha256: string;
  /** Present only for models the app downloads. */
  url?: string;
  /** Plain words for the Settings row; the UI copy is Kevin's, these are labels. */
  label: string;
}

export const MODELS_BASE_URL = 'https://app.harnessmd.com/releases/models/';

export const WHISPER_MODELS: Record<WhisperModelId, WhisperModelInfo> = {
  base: {
    id: 'base',
    file: 'ggml-base.en-q5_1.bin',
    bytes: 59721011,
    sha256: '4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f',
    label: 'base.en q5_1'
  },
  small: {
    id: 'small',
    file: 'ggml-small.en-q5_1.bin',
    bytes: 190098681,
    sha256: 'bfdff4894dcb76bbf647d56263ea2a96645423f1669176f4844a1bf8e478ad30',
    url: MODELS_BASE_URL + 'ggml-small.en-q5_1.bin',
    label: 'small.en q5_1'
  }
};

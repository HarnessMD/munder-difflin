/**
 * Optional model download (F16): fetch a ggml file into `<userData>/models/`,
 * resumable, sha256 checked, atomic.
 *
 * Resume: the partial file is `<dest>.part`; a restart sends `Range: bytes=N-`
 * and appends when the server answers 206, or starts over when it answers 200.
 * Verify: the whole file is hashed after the last byte and compared with the
 * checksum from the model table; a mismatch deletes the part file and fails, so
 * a corrupt or substituted file never gets the final name. Atomic: the rename
 * to `dest` happens only after the hash matches, so `dest` either does not
 * exist or is a verified model.
 *
 * Plain node http/https so the test can stand up a local server; no electron
 * import here.
 */
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, promises as fsp, renameSync, statSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import http from 'node:http';
import https from 'node:https';
import type { IncomingMessage } from 'node:http';

export interface DownloadRequest {
  url: string;
  dest: string;
  sha256: string;
  /** Expected size, used for progress and to refuse a server that sends more. */
  bytes?: number;
  onProgress?: (received: number, total: number | null) => void;
  signal?: AbortSignal;
  /** Redirect hops to follow (3xx with Location). */
  maxRedirects?: number;
}

export interface DownloadResult {
  ok: true;
  dest: string;
  bytes: number;
  /** Bytes fetched in THIS call (the rest came from a previous part file). */
  fetched: number;
}

export class DownloadError extends Error {
  constructor(message: string, readonly code: 'http' | 'aborted' | 'checksum' | 'size' | 'network') {
    super(message);
    this.name = 'DownloadError';
  }
}

function get(url: string, headers: Record<string, string>, signal?: AbortSignal): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { headers, signal }, resolve);
    req.on('error', (e) => reject(new DownloadError(e.message, signal?.aborted ? 'aborted' : 'network')));
  });
}

async function sha256File(file: string): Promise<string> {
  const h = createHash('sha256');
  const fh = await fsp.open(file, 'r');
  try {
    const buf = Buffer.alloc(1 << 20);
    for (;;) {
      const { bytesRead } = await fh.read(buf, 0, buf.length, null);
      if (bytesRead === 0) break;
      h.update(buf.subarray(0, bytesRead));
    }
  } finally { await fh.close(); }
  return h.digest('hex');
}

/** True when `dest` exists and matches the checksum (the model is installed). */
export async function modelInstalled(dest: string, sha256: string): Promise<boolean> {
  if (!existsSync(dest)) return false;
  try { return (await sha256File(dest)) === sha256; } catch { return false; }
}

export async function downloadModel(req: DownloadRequest): Promise<DownloadResult> {
  const part = req.dest + '.part';
  mkdirSync(dirname(req.dest), { recursive: true });
  if (await modelInstalled(req.dest, req.sha256)) {
    return { ok: true, dest: req.dest, bytes: statSync(req.dest).size, fetched: 0 };
  }
  let have = existsSync(part) ? statSync(part).size : 0;
  if (req.bytes !== undefined && have > req.bytes) { unlinkSync(part); have = 0; }

  // Follow redirects by hand so the Range header survives them.
  let url = req.url;
  let res: IncomingMessage | null = null;
  for (let hop = 0; hop <= (req.maxRedirects ?? 5); hop++) {
    const headers: Record<string, string> = { 'user-agent': 'munder-difflin-model-download' };
    if (have > 0) headers.range = `bytes=${have}-`;
    const r = await get(url, headers, req.signal);
    if (r.statusCode && r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
      r.resume();
      url = new URL(r.headers.location, url).toString();
      continue;
    }
    res = r;
    break;
  }
  if (!res) throw new DownloadError('too many redirects', 'http');

  let append = false;
  if (res.statusCode === 206 && have > 0) {
    append = true;
  } else if (res.statusCode === 200) {
    have = 0;
  } else if (res.statusCode === 416 && have > 0) {
    // The part file is already the full length (or longer); drop it and refetch.
    res.resume();
    unlinkSync(part);
    return downloadModel({ ...req });
  } else {
    res.resume();
    throw new DownloadError(`server answered ${res.statusCode}`, 'http');
  }

  const total = req.bytes ?? (() => {
    const len = Number(res.headers['content-length']);
    return Number.isFinite(len) && len > 0 ? len + (append ? have : 0) : null;
  })();

  let fetched = 0;
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(part, { flags: append ? 'a' : 'w' });
    // An abort tears the socket down, and the socket's own error can arrive
    // before the abort listener does; the abort is the cause, so it is the code.
    const fail = (e: DownloadError) => {
      res!.destroy();
      out.destroy();
      reject(req.signal?.aborted ? new DownloadError('download aborted', 'aborted') : e);
    };
    const onAbort = () => fail(new DownloadError('download aborted', 'aborted'));
    req.signal?.addEventListener('abort', onAbort, { once: true });
    res!.on('data', (chunk: Buffer) => {
      fetched += chunk.length;
      if (req.bytes !== undefined && have + fetched > req.bytes) { fail(new DownloadError('server sent more than the expected size', 'size')); return; }
      req.onProgress?.(have + fetched, total);
    });
    res!.on('error', (e) => fail(new DownloadError(e.message, req.signal?.aborted ? 'aborted' : 'network')));
    res!.on('aborted', () => fail(new DownloadError('connection closed before the file ended', 'network')));
    out.on('error', (e) => fail(new DownloadError(e.message, 'network')));
    out.on('finish', () => { req.signal?.removeEventListener('abort', onAbort); resolve(); });
    res!.pipe(out);
  });

  const size = statSync(part).size;
  if (req.bytes !== undefined && size !== req.bytes) {
    // A short read with a clean end: keep the part file, the next call resumes.
    throw new DownloadError(`got ${size} of ${req.bytes} bytes`, 'size');
  }
  const got = await sha256File(part);
  if (got !== req.sha256) {
    unlinkSync(part);
    throw new DownloadError(`checksum mismatch: expected ${req.sha256}, got ${got}`, 'checksum');
  }
  renameSync(part, req.dest);
  return { ok: true, dest: req.dest, bytes: size, fetched };
}

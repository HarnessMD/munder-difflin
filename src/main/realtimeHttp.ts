/**
 * Talk's two HTTP calls, kept free of Electron so they can be tested against a stub
 * server: the ephemeral-token mint, and the SDP offer/answer exchange MAIN makes
 * when the renderer cannot (see `relaySdpFetch` in shared/realtimeEndpoint.ts).
 *
 * Both take the key as an argument. The caller (realtime.ts) decrypts it, and
 * nothing here returns it, logs it, or puts it in an error message.
 */
import { realtimeCallsUrl, realtimeEndpoints, type SdpExchangeResult } from '../shared/realtimeEndpoint';

export const REALTIME_HTTP_TIMEOUT_MS = 15_000;

/** An SDP offer is a few kilobytes; anything far larger is not one. */
const MAX_SDP_BYTES = 256 * 1024;

export type MintResult =
  | {
      ok: true;
      token: string;
      expiresAt: number | null;
      sessionConfig: { model: string };
      /** True when MAIN must make the SDP exchange: a self-hosted base URL is out of
       *  the renderer's reach, and in direct mode the bearer is the real key. */
      sdpViaMain: boolean;
    }
  | { ok: false; error: string; code?: string };

async function post(
  url: string,
  body: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<{ status: number; ok: boolean; text: string; location: string | null }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: 'POST', headers, body, signal: ac.signal });
    return { status: r.status, ok: r.ok, text: await r.text(), location: r.headers.get('Location') };
  } finally {
    clearTimeout(timer);
  }
}

/** A server's error text, cut short, with the secret taken out in case the server
 *  echoes the request back. */
function serverText(text: string, secret: string): string {
  return (secret ? text.split(secret).join('[redacted]') : text).slice(0, 200);
}

function networkError(e: unknown, what: string): string {
  if (e instanceof Error) return e.name === 'AbortError' ? `${what} timed out` : e.message;
  return String(e);
}

/** Mint a short-lived ephemeral client secret at `base`, or, in direct mode, skip
 *  the mint: the key itself is then the bearer, used only by `exchangeSdp`. */
export async function mintToken(opts: {
  key: string;
  base: string;
  model: string;
  direct: boolean;
  isDefaultBase: boolean;
  timeoutMs?: number;
}): Promise<MintResult> {
  const { key, base, model, direct } = opts;
  const sdpViaMain = direct || !opts.isDefaultBase;
  // Direct mode: nothing to mint. The token stays empty; main sends the key itself
  // as the bearer on /realtime/calls.
  if (direct) return { ok: true, token: '', expiresAt: null, sessionConfig: { model }, sdpViaMain };

  const urls = realtimeEndpoints(base);
  const timeoutMs = opts.timeoutMs ?? REALTIME_HTTP_TIMEOUT_MS;
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  try {
    // GA shape first: { session: { type, model } } → { value, expires_at, ... }.
    let res = await post(urls.clientSecrets, JSON.stringify({ session: { type: 'realtime', model } }), headers, timeoutMs);
    // Older accounts: fall back to the legacy sessions endpoint shape.
    if (res.status === 404) res = await post(urls.legacySessions, JSON.stringify({ model }), headers, timeoutMs);

    let json: Record<string, unknown> | undefined;
    try { json = res.text ? (JSON.parse(res.text) as Record<string, unknown>) : undefined; } catch { /* non-JSON body */ }

    if (!res.ok) {
      const errObj = json?.error as { message?: unknown } | undefined;
      const msg =
        (typeof errObj?.message === 'string' && serverText(errObj.message, key)) ||
        (res.text ? serverText(res.text, key) : `HTTP ${res.status}`);
      const hint = res.status === 404 && !opts.isDefaultBase
        ? ' (this server has no token endpoint; try "Skip token request" in Settings → Voice)'
        : '';
      return { ok: false, error: `token mint failed (${res.status}): ${msg}${hint}`, code: 'mint_failed' };
    }

    // Normalize across GA ({ value }) and legacy ({ client_secret: { value } }) shapes.
    const clientSecret = json?.client_secret as { value?: unknown; expires_at?: unknown } | undefined;
    const token =
      (typeof json?.value === 'string' && (json.value as string)) ||
      (typeof clientSecret?.value === 'string' && clientSecret.value) ||
      '';
    if (!token) return { ok: false, error: 'mint returned no ephemeral token', code: 'no_token' };

    const expRaw = json?.expires_at ?? clientSecret?.expires_at;
    const expiresAt = typeof expRaw === 'number' ? expRaw : null;
    return { ok: true, token, expiresAt, sessionConfig: { model }, sdpViaMain };
  } catch (e) {
    return { ok: false, error: networkError(e, 'token mint'), code: 'network' };
  }
}

/** POST the renderer's SDP offer to `base`/realtime/calls and return the answer.
 *  The bearer is the key itself in direct mode, otherwise the minted token. */
export async function exchangeSdp(opts: {
  sdp: string;
  base: string;
  model: string;
  direct: boolean;
  bearer: string;
  timeoutMs?: number;
}): Promise<SdpExchangeResult> {
  const { sdp, bearer } = opts;
  if (!sdp || Buffer.byteLength(sdp, 'utf8') > MAX_SDP_BYTES || !sdp.startsWith('v=')) {
    return { ok: false, error: 'voice connect failed: the SDP offer is missing or malformed' };
  }
  if (!bearer) return { ok: false, error: 'voice connect failed: no token or key to send' };
  const url = realtimeCallsUrl(opts.base, { direct: opts.direct, model: opts.model });
  try {
    const res = await post(
      url,
      sdp,
      { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/sdp' },
      opts.timeoutMs ?? REALTIME_HTTP_TIMEOUT_MS
    );
    if (!res.ok) {
      const detail = res.text ? `: ${serverText(res.text, bearer)}` : '';
      return { ok: false, error: `voice connect failed (${res.status})${detail}` };
    }
    if (!res.text.startsWith('v=')) {
      return { ok: false, error: 'voice connect failed: the server did not answer with SDP' };
    }
    return { ok: true, sdp: res.text, ...(res.location ? { location: res.location } : {}) };
  } catch (e) {
    return { ok: false, error: networkError(e, 'voice connect') };
  }
}

/**
 * Where Talk connects: the base URL of an OpenAI Realtime compatible server, and
 * the URLs derived from it.
 *
 * The default is OpenAI's own API. A self-hosted server (LocalAI, for one) is set in
 * Settings → Voice. Plain http:// is accepted only for this computer and private
 * network addresses, so a typo cannot send the key or the voice over the open
 * internet unencrypted.
 *
 * Pure and dependency-free, like realtimePricing.ts: the main-process mint and SDP
 * relay, the Settings field and the tests all read this one copy.
 */

export const DEFAULT_REALTIME_BASE_URL = 'https://api.openai.com/v1';

/** Why a base URL was refused. Settings turns these into its own words. */
export type RealtimeBaseUrlProblem = 'invalid' | 'scheme' | 'insecure' | 'credentials' | 'query';

export type RealtimeBaseUrlCheck =
  | { ok: true; url: string }
  | { ok: false; problem: RealtimeBaseUrlProblem; error: string };

const PROBLEM_TEXT: Record<RealtimeBaseUrlProblem, string> = {
  invalid: 'it is not a valid URL',
  scheme: 'it must start with https:// (or http:// for a private network address)',
  insecure: 'http:// is allowed only for this computer or a private network address; use https://',
  credentials: 'it must not contain a user name or password',
  query: 'it must not end in a query (?…) or a fragment (#…)'
};

/** True for this computer and private network addresses: the only hosts plain
 *  http:// is accepted for. Covers localhost, 127/8, 10/8, 172.16/12, 192.168/16,
 *  link-local 169.254/16, carrier-grade NAT 100.64/10 (Tailscale and similar),
 *  `.local` mDNS names, and IPv6 loopback, unique-local and link-local addresses. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (h === '::1') return true;
  return /^f[cd][0-9a-f]{2}:/.test(h) || /^fe[89ab][0-9a-f]:/.test(h);
}

/** Check a base URL as typed. Blank means the default. On success `url` is the
 *  normalized form: no trailing slash, so `${url}/realtime/calls` is always right. */
export function checkRealtimeBaseUrl(raw: string | null | undefined): RealtimeBaseUrlCheck {
  const text = (raw ?? '').trim();
  if (!text) return { ok: true, url: DEFAULT_REALTIME_BASE_URL };
  const refuse = (problem: RealtimeBaseUrlProblem): RealtimeBaseUrlCheck => ({
    ok: false,
    problem,
    error: `Voice base URL refused: ${PROBLEM_TEXT[problem]}.`
  });
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return refuse('invalid');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return refuse('scheme');
  if (u.protocol === 'http:' && !isPrivateHost(u.hostname)) return refuse('insecure');
  if (u.username || u.password) return refuse('credentials');
  if (u.search || u.hash) return refuse('query');
  return { ok: true, url: `${u.origin}${u.pathname}`.replace(/\/+$/, '') };
}

/** The endpoints under a (normalized) base URL. */
export function realtimeEndpoints(base: string): {
  clientSecrets: string;
  legacySessions: string;
  calls: string;
} {
  return {
    clientSecrets: `${base}/realtime/client_secrets`,
    legacySessions: `${base}/realtime/sessions`,
    calls: `${base}/realtime/calls`
  };
}

/** Where the SDP offer goes. With a minted token the model is already part of the
 *  session the token was made for, and OpenAI's /realtime/calls takes no query.
 *  With the key used directly there is no such session, so the model rides along
 *  as `?model=`, which is how LocalAI reads it. */
export function realtimeCallsUrl(base: string, opts: { direct: boolean; model: string }): string {
  const calls = realtimeEndpoints(base).calls;
  return opts.direct ? `${calls}?model=${encodeURIComponent(opts.model)}` : calls;
}

/**
 * The address the renderer's WebRTC transport is pointed at when MAIN has to make
 * the SDP exchange. `.invalid` never resolves (RFC 2606), and nothing ever fetches
 * it: `relaySdpFetch` answers it in place.
 */
export const SDP_RELAY_URL = 'https://realtime-relay.invalid/v1/realtime/calls';

export type SdpExchangeResult =
  | { ok: true; sdp: string; location?: string }
  | { ok: false; error: string };

/**
 * A fetch that hands the one request to `SDP_RELAY_URL` to `exchange` (an IPC call
 * to main) and passes every other request to `realFetch` untouched.
 *
 * Why this exists: the voice SDK posts its SDP offer with the page's own fetch.
 * The renderer's Content-Security-Policy only lets the page reach OpenAI, so a
 * self-hosted server is out of the page's reach, and with "use key directly" the
 * bearer would have to be the real API key, which never enters the renderer. MAIN
 * has neither limit, so it makes that one POST and this returns its answer to the
 * SDK as if the SDK had fetched it. A failed exchange throws, so the connect fails
 * with main's message instead of a garbled SDP.
 */
export function relaySdpFetch(
  realFetch: typeof fetch,
  exchange: (sdp: string) => Promise<SdpExchangeResult>
): typeof fetch {
  const relay = new URL(SDP_RELAY_URL).href;
  return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url !== relay) return realFetch(input, init);
    const sdp = typeof init?.body === 'string' ? init.body : '';
    const r = await exchange(sdp);
    if (!r.ok) throw new Error(r.error);
    const headers: Record<string, string> = { 'Content-Type': 'application/sdp' };
    if (r.location) headers.Location = r.location;
    return new Response(r.sdp, { status: 201, headers });
  }) as typeof fetch;
}

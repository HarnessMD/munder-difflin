/**
 * Fetch the user's provider-usage endpoint. Never fatal: every failure comes back
 * as `{ ok: false, error }` so a down Raspberry Pi can never block a standup.
 *
 * Deliberately not `fetchText.getText`: that helper is https-only with a fixed
 * user agent, but this endpoint usually lives on a LAN box (plain http) and may
 * need a bearer token. Redirects are refused so a token is never replayed to a
 * host the user did not configure.
 */
import {
  parseUsageResponse, validateUsageUrl, DEFAULT_USAGE_TIMEOUT_MS,
  type UsageSnapshot, type UsageEndpointConfig
} from '../shared/usageEndpoint';

const MAX_BODY_BYTES = 256 * 1024;

export type UsageFetchResult =
  | { ok: true; snapshot: UsageSnapshot }
  | { ok: false; error: string };

export async function fetchUsage(cfg: Pick<UsageEndpointConfig, 'url' | 'token' | 'timeoutMs'>): Promise<UsageFetchResult> {
  const url = validateUsageUrl(cfg.url);
  if (!url) return { ok: false, error: 'not an http(s) URL' };
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), cfg.timeoutMs > 0 ? cfg.timeoutMs : DEFAULT_USAGE_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (cfg.token) headers.authorization = `Bearer ${cfg.token}`;
    const res = await fetch(url, { headers, redirect: 'manual', signal: ac.signal });
    if (res.status >= 300 && res.status < 400) return { ok: false, error: `redirect (${res.status}) refused` };
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > MAX_BODY_BYTES) return { ok: false, error: 'response too large' };
    const text = await readCapped(res);
    if (text === null) return { ok: false, error: 'response too large' };
    let json: unknown;
    try { json = JSON.parse(text); } catch { return { ok: false, error: 'not JSON' }; }
    const snapshot = parseUsageResponse(json);
    return snapshot ? { ok: true, snapshot } : { ok: false, error: 'no usable agents in response' };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return { ok: false, error: aborted ? 'timed out' : e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/** Read the body but give up once it passes the cap (a chunked response can lie about its length). */
async function readCapped(res: Response): Promise<string | null> {
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

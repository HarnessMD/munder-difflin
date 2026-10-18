/**
 * Provider-quota "usage endpoint" — a user-run HTTP service that reports how much
 * of each agent engine's allowance is left. Pure parsing + summarising (no I/O) so
 * it is unit-testable and shared by main and any future renderer view.
 *
 * Contract (every window is optional, so a custom endpoint may report only what it
 * knows; unknown keys and malformed entries are dropped rather than rejected):
 *
 *   {
 *     "timestamp": "2026-10-17T14:40:00Z",
 *     "agents": {
 *       "claude": {
 *         "five_hour": { "remaining_pct": 90.0, "resets_at": "2026-10-17T18:00:00Z" },
 *         "weekly":    { "remaining_pct": 69.5, "resets_at": "2026-10-21T00:00:00Z" },
 *         "availability": "available"
 *       }
 *     }
 *   }
 */

export interface UsageWindow {
  /** 0-100, clamped. */
  remainingPct: number;
  /** ISO timestamp, or null when the endpoint did not say. */
  resetsAt: string | null;
}

export interface AgentUsage {
  /** Window name (five_hour, weekly, ...) -> state. Insertion order is preserved. */
  windows: Record<string, UsageWindow>;
  /** Free text from the endpoint ("available", "limited", "exhausted", ...). */
  availability: string | null;
}

export interface UsageSnapshot {
  timestamp: string | null;
  agents: Record<string, AgentUsage>;
}

/** User-facing settings for the endpoint (persisted in config.json). */
export interface UsageEndpointConfig {
  enabled: boolean;
  url: string;
  /** Optional bearer token, sent as `Authorization: Bearer <token>`. */
  token?: string;
  timeoutMs: number;
}

export const DEFAULT_USAGE_TIMEOUT_MS = 5000;
export const MAX_USAGE_TIMEOUT_MS = 30_000;

/** http(s) only; returns the normalised URL or null. */
export function validateUsageUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch { return null; }
}

/** Clamp a patch from the UI into something safe to persist. */
export function normalizeUsageEndpoint(v: unknown): UsageEndpointConfig {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<UsageEndpointConfig>;
  const url = typeof o.url === 'string' ? o.url.trim() : '';
  const t = typeof o.timeoutMs === 'number' && Number.isFinite(o.timeoutMs) ? Math.round(o.timeoutMs) : DEFAULT_USAGE_TIMEOUT_MS;
  return {
    // An enabled endpoint with no valid URL is just a standup that always logs an error.
    enabled: !!o.enabled && validateUsageUrl(url) !== null,
    url,
    ...(typeof o.token === 'string' && o.token.trim() ? { token: o.token.trim() } : {}),
    timeoutMs: Math.min(MAX_USAGE_TIMEOUT_MS, Math.max(500, t))
  };
}

/** At or below this the agent is close to its cap: steer new work elsewhere. */
export const LOW_PCT = 15;
/** A window resetting within this long, with at least BURN_MIN_PCT left, is
 *  allowance that will be wasted unless it is used now. */
export const BURN_WITHIN_MS = 2 * 60 * 60 * 1000;
export const BURN_MIN_PCT = 30;

const MAX_AGENTS = 64;
const MAX_WINDOWS = 8;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function isoOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Validate an endpoint response. Returns null when nothing usable is in it. */
export function parseUsageResponse(body: unknown): UsageSnapshot | null {
  if (!isObj(body) || !isObj(body.agents)) return null;
  const agents: Record<string, AgentUsage> = {};
  for (const [name, raw] of Object.entries(body.agents).slice(0, MAX_AGENTS)) {
    if (!isObj(raw)) continue;
    const windows: Record<string, UsageWindow> = {};
    for (const [key, w] of Object.entries(raw)) {
      if (Object.keys(windows).length >= MAX_WINDOWS) break;
      if (!isObj(w) || typeof w.remaining_pct !== 'number' || !Number.isFinite(w.remaining_pct)) continue;
      windows[key] = {
        remainingPct: Math.min(100, Math.max(0, w.remaining_pct)),
        resetsAt: isoOrNull(w.resets_at)
      };
    }
    const availability = typeof raw.availability === 'string' ? raw.availability.slice(0, 40) : null;
    if (Object.keys(windows).length === 0 && !availability) continue;
    agents[name.slice(0, 40)] = { windows, availability };
  }
  if (Object.keys(agents).length === 0) return null;
  return { timestamp: isoOrNull(body.timestamp), agents };
}

/** "2h 10m", "3d 4h", "45m", "now". */
export function formatDuration(ms: number): string {
  if (ms <= 60_000) return 'now';
  const m = Math.round(ms / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${mm}m`;
  return `${mm}m`;
}

const pct = (n: number): string => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

/** One line per agent, with a routing hint when the numbers call for one. */
export function summarizeForOrchestrator(snap: UsageSnapshot, now: number = Date.now()): string {
  const lines: string[] = [];
  for (const [name, a] of Object.entries(snap.agents)) {
    const parts: string[] = [];
    let lowest = 100;
    let burn: string | null = null;
    for (const [key, w] of Object.entries(a.windows)) {
      const label = key.replace(/_/g, ' ');
      const resetMs = w.resetsAt ? Date.parse(w.resetsAt) - now : null;
      parts.push(`${label} ${pct(w.remainingPct)} left${resetMs !== null ? ` (resets in ${formatDuration(resetMs)})` : ''}`);
      lowest = Math.min(lowest, w.remainingPct);
      if (resetMs !== null && resetMs > 0 && resetMs <= BURN_WITHIN_MS && w.remainingPct >= BURN_MIN_PCT) {
        burn = `${label} resets in ${formatDuration(resetMs)} with ${pct(w.remainingPct)} unused`;
      }
    }
    const avail = (a.availability ?? '').toLowerCase();
    const blocked = avail !== '' && avail !== 'available';
    let hint = '';
    if (blocked || lowest <= LOW_PCT) hint = ' — LOW: avoid new work here, reroute to another engine';
    else if (burn) hint = ` — use it or lose it: ${burn}, good time to hand this engine more work`;
    lines.push(`- ${name}: ${parts.join('; ') || 'no window data'}${a.availability ? ` [${a.availability}]` : ''}${hint}`);
  }
  return lines.join('\n');
}

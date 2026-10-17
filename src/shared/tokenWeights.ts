/**
 * GOD-STARTUP-TOKENS R3 (1.1.79): token figures a person reads as WORK.
 *
 * A Claude/Codex request re-sends the whole conversation, most of it served from the prompt cache.
 * The raw figure (input + output + cache read + cache write) counts every re-sent token in full,
 * so a startup that re-reads a 300K context for a dozen steps "used 4M tokens" while costing about
 * what 600K of fresh input would. The billed-equivalent figure weighs each kind by what the
 * provider charges relative to an input token:
 *   - cache read  x0.1;
 *   - cache write x1.25 (5-minute lifetime) or x2 (1-hour lifetime);
 *   - input and output x1 (output's own price is a cost question; usd stays the cost figure).
 * The sample carries no cache lifetime (Claude Code's OTel counts one cacheCreation). god's ruling
 * (2026-10-02): a write of UNKNOWN lifetime weighs x2, because this floor's Claude Code writes
 * 1-hour cache and understating cost is the worse error; only a part the sample says was 5-minute
 * (`cacheCreation5m`) weighs x1.25.
 * The raw figure is kept beside it (fleet.json `tokensRaw`, the card's tooltip), and every token
 * CAP still counts raw: this changes what is shown, not when a breaker trips.
 */

export const CACHE_READ_WEIGHT = 0.1;
export const CACHE_WRITE_5M_WEIGHT = 1.25;
export const CACHE_WRITE_1H_WEIGHT = 2;

export interface TokenCounts {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  /** The part of cacheCreation known to be written with the 5-minute lifetime (x1.25); the rest
   *  (1-hour, or unknown) weighs x2. */
  cacheCreation5m?: number;
}

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/** input + output + cache read + cache write: what the token caps count. */
export function rawTokens(s: TokenCounts | null | undefined): number {
  return s ? n(s.input) + n(s.output) + n(s.cacheRead) + n(s.cacheCreation) : 0;
}

/** R3: the billed-equivalent figure (whole tokens). */
export function billedEquivalentTokens(s: TokenCounts | null | undefined): number {
  if (!s) return 0;
  const write = n(s.cacheCreation);
  const w5m = Math.min(write, n(s.cacheCreation5m));
  return Math.round(n(s.input) + n(s.output) + CACHE_READ_WEIGHT * n(s.cacheRead)
    + CACHE_WRITE_5M_WEIGHT * w5m + CACHE_WRITE_1H_WEIGHT * (write - w5m));
}

/** R3: the tooltip line that says what the shown figure is and what the raw one was. */
export function tokenFigureTitle(s: TokenCounts | null | undefined): string {
  const raw = rawTokens(s);
  return `${billedEquivalentTokens(s).toLocaleString()} billed-equivalent tokens (cache reads x${CACHE_READ_WEIGHT}, cache writes x${CACHE_WRITE_1H_WEIGHT}, x${CACHE_WRITE_5M_WEIGHT} when known to be 5-minute). `
    + `Raw: ${raw.toLocaleString()} (cache read ${n(s?.cacheRead).toLocaleString()}, cache write ${n(s?.cacheCreation).toLocaleString()}); the token caps count raw.`;
}

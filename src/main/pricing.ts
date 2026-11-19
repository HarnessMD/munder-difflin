/**
 * Fallback-only model → price table (USD per million tokens).
 *
 * The LIVE telemetry path does NOT use this. Claude Code emits a pre-computed,
 * per-model `cost_usd` on every `api_request` log and a `claude_code.cost.usage`
 * metric (verified by the 7A.1 spike), so the collector (`telemetry.ts`) trusts
 * Claude's own figure. This table exists solely for the OFFLINE transcript
 * reconciler (`transcript.ts`), which runs when telemetry is off and must
 * estimate cost from raw token counts.
 *
 * It supersedes the old hard-coded Sonnet-for-everyone constants that lived in
 * `transcript.ts` (cost bug #1 — Opus undercosted ~5×, Haiku overcosted). Prices
 * are now matched per model family. This is the ONE place per-model pricing
 * lives; both the transcript backend and the collector's fallback import it.
 */

/** USD per million tokens for one model family. */
export interface ModelPrice {
  inputPerM: number;
  outputPerM: number;
  cacheReadPerM: number;
  cacheWritePerM: number;
}

// Anthropic list prices, USD per million tokens. Approximate, fallback-only —
// the live path uses Claude's own per-model cost, so drift here is harmless.
const OPUS: ModelPrice = { inputPerM: 15, outputPerM: 75, cacheReadPerM: 1.5, cacheWritePerM: 18.75 };
const SONNET: ModelPrice = { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.3, cacheWritePerM: 3.75 };
const HAIKU: ModelPrice = { inputPerM: 0.8, outputPerM: 4, cacheReadPerM: 0.08, cacheWritePerM: 1.0 };
// Sonnet 5.5 (28 Sep 2026) is priced below the Sonnet family row, so it gets
// its own. $2 in, $10 out (platform.claude.com models overview); the $0.20
// cache read is Claude Code 2.1.284's own costUSD for a live call, and the
// cache write is the usual 1.25 times input.
const SONNET_5_5: ModelPrice = { inputPerM: 2, outputPerM: 10, cacheReadPerM: 0.2, cacheWritePerM: 2.5 };
// Fable 5.2 (10 Nov 2026): $8 in, $40 out, $0.20 cache read (0.025 times
// input), $10 for a 5 minute cache write (platform.claude.com pricing). Like
// the rows above, the one cache write rate is the 5 minute one (1.25 times
// input); a 1 hour write lists at $16.
const FABLE_5_2: ModelPrice = { inputPerM: 8, outputPerM: 40, cacheReadPerM: 0.2, cacheWritePerM: 10 };
// GPT-6.1 Sol (OpenAI, Codex; 10 Nov 2026): $2 in, $0.10 cached input, $10
// out (developers.openai.com model page). OpenAI charges no extra to write a
// cache, so a cache write is priced as plain input.
const GPT_6_1_SOL: ModelPrice = { inputPerM: 2, outputPerM: 10, cacheReadPerM: 0.1, cacheWritePerM: 2 };

/** When the model id is unknown, assume Sonnet (the historical default). */
const DEFAULT_PRICE: ModelPrice = SONNET;

/**
 * Strip Claude Code's variant suffix so `claude-opus-4-8[1m]` (the form the
 * `token.usage` metric carries) and `claude-opus-4-8` (the base id the
 * `api_request` log carries) resolve to the same family. Case is preserved;
 * matching is done case-insensitively in `priceFor`.
 */
export function normalizeModel(model: string | undefined | null): string {
  return (model ?? '').trim().replace(/\[[^\]]*\]\s*$/, '');
}

/** Resolve a model id to its price row by family, falling back to Sonnet. */
export function priceFor(model: string | undefined | null): ModelPrice {
  const m = normalizeModel(model).toLowerCase();
  if (m.includes('opus')) return OPUS;
  if (m.includes('haiku')) return HAIKU;
  if (/sonnet-5-5(?![0-9])/.test(m)) return SONNET_5_5;
  if (/fable-5-2(?![0-9])/.test(m)) return FABLE_5_2;
  if (/gpt-6\.1-sol(?![0-9])/.test(m)) return GPT_6_1_SOL;
  if (m.includes('sonnet')) return SONNET;
  return DEFAULT_PRICE;
}

/** Token split used by the cost estimator (matches `AgentUsage` token fields). */
export interface TokenSplit {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/**
 * Estimate USD cost for a token split using the model's fallback price row.
 * Used only by the transcript reconciler; the live path trusts Claude's cost.
 */
export function estimateCostUsd(model: string | undefined | null, tokens: TokenSplit): number {
  const p = priceFor(model);
  return (
    (tokens.inputTokens / 1_000_000) * p.inputPerM +
    (tokens.outputTokens / 1_000_000) * p.outputPerM +
    (tokens.cacheReadTokens / 1_000_000) * p.cacheReadPerM +
    (tokens.cacheWriteTokens / 1_000_000) * p.cacheWritePerM
  );
}

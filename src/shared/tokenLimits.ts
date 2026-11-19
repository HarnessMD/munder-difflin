/**
 * TOKEN LIMITS PER PERIOD (0.5.6, founder 16 Oct 2026): "a way where users
 * can set daily/every 5 hour/weekly and monthly token velocity so like a drop
 * down to set frequency and an input area to set token cap. This setting
 * should be available for individual agents as well as the whole office".
 *
 * One limit is a period and a cap. The office has at most one, each agent at
 * most one. What a period counts:
 *
 *   5h      the last five hours, rolling
 *   day     since midnight today, local time
 *   week    since Monday 00:00, local time
 *   month   since the 1st 00:00, local time
 *
 * Tokens are the agent's WORK tokens: input, output and context newly written
 * to the cache. Context re-read from the cache is left out, the rule the
 * per agent cap already follows (breaker.ts, #189): it is re-billed on every
 * request against a large fixed context and would make any limit a timer.
 *
 * Over a limit, the circuit breaker trips: an agent over its own limit, and
 * for the office the agent that used the most in the period. It steers, then
 * constrains, and stops only when Hard stop is on, as for every other cap. It
 * clears when the period moves on.
 *
 * Pure: no clock of its own and no disk, so the rules are tested directly.
 */

export type TokenPeriod = '5h' | 'day' | 'week' | 'month';
export const TOKEN_PERIODS: readonly TokenPeriod[] = ['5h', 'day', 'week', 'month'];

export interface TokenLimit {
  period: TokenPeriod;
  /** Tokens, a whole number above 0. */
  cap: number;
}

export interface TokenLimits {
  office?: TokenLimit;
  agents?: Record<string, TokenLimit>;
}

/** The largest cap the settings take: a trillion is beyond any month. */
export const MAX_TOKEN_LIMIT = 1_000_000_000_000;

/** A limit as stored, or null when it is not one. */
export function normalizeTokenLimit(v: unknown): TokenLimit | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as { period?: unknown; cap?: unknown };
  if (typeof o.period !== 'string' || !(TOKEN_PERIODS as readonly string[]).includes(o.period)) return null;
  if (typeof o.cap !== 'number' || !Number.isInteger(o.cap) || o.cap <= 0 || o.cap > MAX_TOKEN_LIMIT) return null;
  return { period: o.period as TokenPeriod, cap: o.cap };
}

const HOUR = 3600_000;

/** When the period that holds `now` began. */
export function periodStart(period: TokenPeriod, now: number): number {
  if (period === '5h') return now - 5 * HOUR;
  const d = new Date(now);
  if (period === 'day') return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (period === 'week') {
    const back = (d.getDay() + 6) % 7; // Monday is 0
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime();
  }
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/** How a period reads inside a sentence, for the breaker's reason. English,
 *  like every breaker reason: it is the agent's message, not a screen. */
const PHRASE: Record<TokenPeriod, string> = { '5h': 'in the last 5 hours', day: 'today', week: 'this week', month: 'this month' };

/**
 * Which agents are over a limit now, and why. `managed` are the agents the
 * breaker may act on (the orchestrator is not one); `counted` is everyone
 * whose tokens are the office's, the orchestrator included. Over the office
 * limit, the managed agent that used the most in the period is the one named,
 * the way the office token cap already names its biggest spender.
 */
export function overLimits(opts: {
  limits: TokenLimits | undefined;
  managed: readonly string[];
  counted: readonly string[];
  used: (agentId: string, period: TokenPeriod) => number;
}): Map<string, string> {
  const out = new Map<string, string>();
  const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
  for (const id of opts.managed) {
    const own = normalizeTokenLimit(opts.limits?.agents?.[id]);
    if (!own) continue;
    const used = opts.used(id, own.period);
    if (used > own.cap) out.set(id, `token limit: ${fmt(used)} tokens ${PHRASE[own.period]}, over this agent's limit of ${fmt(own.cap)}`);
  }
  const office = normalizeTokenLimit(opts.limits?.office);
  if (office) {
    let total = 0;
    for (const id of opts.counted) total += opts.used(id, office.period);
    if (total > office.cap) {
      let top: string | null = null;
      let most = -1;
      for (const id of opts.managed) {
        const u = opts.used(id, office.period);
        if (u > most) { most = u; top = id; }
      }
      if (top && most > 0 && !out.has(top)) {
        out.set(top, `office token limit: ${fmt(total)} tokens ${PHRASE[office.period]} across the office, over its limit of ${fmt(office.cap)} (this agent used the most, ${fmt(most)})`);
      }
    }
  }
  return out;
}

/** One limit as the screens show it. */
export interface TokenLimitRow {
  limit: TokenLimit | null;
  /** The period the usage below is counted over: the limit's, else today. */
  period: TokenPeriod;
  used: number;
  resetsAt: number | null;
}

export interface TokenLimitsView {
  office: TokenLimitRow;
  agents: Record<string, TokenLimitRow>;
}

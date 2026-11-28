/**
 * TOKENS USED PER AGENT, BY QUARTER HOUR (0.5.6, the token limits of
 * @shared/tokenLimits). The usage samples are cumulative and restart with the
 * app, and the cost ledger is trimmed to a few megabytes, so neither can say
 * what an agent used this week. This keeps the answer: the breaker beat hands
 * every live sample here, the increase since the last one is added to the
 * quarter hour it arrived in, and quarters older than 33 days are dropped.
 *
 * THE INCREASE. Per agent the last session id and work token total are kept.
 *   same session, higher     the difference
 *   same session, lower      the app restarted and the counter with it: the
 *                            new total is all new
 *   a new session            its total is all new
 *   never seen before        nothing: the first sample is the baseline, so a
 *                            session already under way when this build first
 *                            runs is not counted as one burst
 * Only samples with a session id come here: the beat gives the ledger the
 * same ones (a live session), and a transcript read has none.
 *
 * On disk at `<hive>/token-usage.json`, out of the hive's history
 * (HIVE_IGNORE_LINES), written at most once a minute. Free of `electron`.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AgentUsageSample } from './usage';

const QUARTER = 15 * 60_000;
const KEEP_MS = 33 * 24 * 3600_000;
const WRITE_EVERY_MS = 60_000;

interface State {
  v: 1;
  last: Record<string, { session: string; value: number }>;
  /** agent id → quarter hour start (ms, as a key) → tokens. */
  buckets: Record<string, Record<string, number>>;
}

/** Work tokens: input, output and context newly written to the cache. */
export function workTokens(s: Pick<AgentUsageSample, 'input' | 'output' | 'cacheCreation'>): number {
  const n = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : 0);
  return n(s.input) + n(s.output) + n(s.cacheCreation);
}

export class TokenUsage {
  private state: State | null = null;
  private stateFile: string | null = null;
  private dirty = false;
  private lastWrite = 0;

  constructor(private readonly file: () => string | null) {}

  private load(): State {
    const f = this.file();
    if (this.state && f === this.stateFile) return this.state;
    this.stateFile = f;
    let s: State = { v: 1, last: {}, buckets: {} };
    if (f) {
      try {
        const raw = JSON.parse(readFileSync(f, 'utf8')) as Partial<State>;
        if (raw && typeof raw === 'object') s = { v: 1, last: raw.last ?? {}, buckets: raw.buckets ?? {} };
      } catch { /* none yet */ }
    }
    this.state = s;
    return s;
  }

  /** One live sample from the beat. Answers the work tokens it added. */
  record(sample: AgentUsageSample, now: number): number {
    if (!sample.sessionId) return 0;
    const s = this.load();
    const value = workTokens(sample);
    const prev = s.last[sample.agentId];
    let add = 0;
    if (prev) add = prev.session !== sample.sessionId || value < prev.value ? value : value - prev.value;
    if (!prev || prev.session !== sample.sessionId || prev.value !== value) {
      s.last[sample.agentId] = { session: sample.sessionId, value };
      this.dirty = true;
    }
    if (add > 0) {
      const key = String(Math.floor(now / QUARTER) * QUARTER);
      const mine = (s.buckets[sample.agentId] ??= {});
      mine[key] = (mine[key] ?? 0) + add;
      this.dirty = true;
    }
    return add > 0 ? add : 0;
  }

  /** Tokens this agent used from `start` on, by whole quarter hours: the
   *  quarter `start` falls in counts. */
  usedSince(agentId: string, start: number): number {
    const mine = this.load().buckets[agentId];
    if (!mine) return 0;
    const from = Math.floor(start / QUARTER) * QUARTER;
    let sum = 0;
    for (const [k, v] of Object.entries(mine)) if (Number(k) >= from) sum += v;
    return sum;
  }

  /** Write when something changed and a minute has passed, or `force`.
   *  Quarters past the window go first. */
  flush(now: number, force = false): void {
    if (!this.dirty || (!force && now - this.lastWrite < WRITE_EVERY_MS)) return;
    const f = this.file();
    if (!f) return;
    const s = this.load();
    for (const [id, mine] of Object.entries(s.buckets)) {
      for (const k of Object.keys(mine)) if (now - Number(k) > KEEP_MS) delete mine[k];
      if (!Object.keys(mine).length) delete s.buckets[id];
    }
    try {
      mkdirSync(dirname(f), { recursive: true });
      const tmp = `${f}.tmp`;
      writeFileSync(tmp, JSON.stringify(s), 'utf8');
      renameSync(tmp, f);
      this.dirty = false;
      this.lastWrite = now;
    } catch { /* the next beat tries again */ }
  }
}

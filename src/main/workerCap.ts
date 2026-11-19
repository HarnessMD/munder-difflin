import { tokensOf, workTokensOf } from './breaker';
import type { AgentUsageSample } from './usage';

export interface WorkerCapVerdict {
  reap: boolean;
  /** input + output + cacheCreation — the figure tested against the cap. */
  work: number;
  /** All kinds incl. cacheRead — the display/cost figure. */
  total: number;
}

/** Whether a temp worker is over its token cap (a cap <= 0 means none). Tests
 *  WORK tokens, as the per-agent breaker budget does (#189): cacheRead grows
 *  with the request count against a large fixed context, not with the work. */
export function workerCapVerdict(s: AgentUsageSample | null, tokenCap: number): WorkerCapVerdict {
  const work = workTokensOf(s);
  return { reap: tokenCap > 0 && work > tokenCap, work, total: tokensOf(s) };
}

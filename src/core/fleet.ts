/**
 * THE LIVE FLEET SNAPSHOT.
 *
 * `<hive>/fleet.json` is what Michael reads to see who is on the floor: one
 * row per agent from the registry, with its breaker level, tokens, spend and
 * inbox backlog. The `floor` field (whether the launch picker has been
 * dismissed) is the window's answer, which the caller passes in.
 */
import { join } from 'node:path';
import type { HiveManager } from '../main/hive';
import { isLive } from '../shared/agentLive';
import type { TelemetryCollector } from '../main/telemetry';
import type { CostLedgerTotals } from '../main/costLifetime';
import type { CircuitBreaker } from '../main/breaker';

export interface FleetDeps {
  hive: HiveManager;
  telemetry: Pick<TelemetryCollector, 'snapshot'>;
  costTotals: Pick<CostLedgerTotals, 'refresh' | 'usdFor'>;
  breaker: Pick<CircuitBreaker, 'levelFor'>;
  /** The hook listener's own health, published as `hooks`. */
  hookHealth: () => unknown;
  /** An agent's context as its status line last said it (the hook listener's `contextFor`). */
  contextFor: (agentId: string) => { tokens: number; limit: number } | undefined;
  /** Whether the floor has been let start: the window's answer in the app. */
  floor: () => string;
}

/** Build + write the live fleet snapshot Michael reads (`<hive>/fleet.json`).
 *  Always-on (independent of the heartbeat) since `claude agents` can't see the
 *  hive's sibling sessions. PII-free; never throws (called from a timer). */
export function writeFleet(d: FleetDeps): void {
  const { hive, telemetry, costTotals, breaker } = d;
  if (!hive.enabled()) return;
  try {
    const reg = hive.registry();
    const snap = telemetry.snapshot();
    const usageById = new Map(snap.usage.map((u) => [u.agentId, u]));
    const now = Date.now();
    // Async + incremental; returns immediately and never throws into the timer.
    const hiveRoot = hive.root();
    if (hiveRoot) void costTotals.refresh(join(hiveRoot, 'cost-ledger.jsonl'));
    const agents = Object.entries(reg.agents)
      .filter(([, a]) => isLive(a) || a.sleeping)
      .map(([id, a]) => {
        const u = usageById.get(id);
        const spans = snap.spans[id] ?? [];
        const tokens = u ? u.input + u.output + u.cacheRead + u.cacheCreation : 0;
        // `usd` is LIFETIME (reset-corrected). Until the first fold completes we
        // fall back to the session figure rather than publishing a cold $0.
        const lifetime = costTotals.usdFor(id);
        const sessionUsd = u ? Number(u.usd.toFixed(4)) : 0;
        // The context fill god's roster shows as ctx NN%, so any
        // agent can watch it and ask for a compact (compact-requests/).
        const ctx = d.contextFor(id);
        return {
          id,
          sleeping: a.sleeping === true,
          status: a.sleeping ? 'sleeping' : a.status,
          name: a.name,
          role: a.role ?? (a.isGod ? 'orchestrator' : 'agent'),
          cwd: a.cwd,
          isGod: !!a.isGod,
          breaker: breaker.levelFor(id),
          tokens,
          usd: lifetime === null ? sessionUsd : Number(lifetime.toFixed(4)),
          sessionUsd,
          lastTool: spans.length ? spans[spans.length - 1].tool : null,
          lastActiveSecAgo: u ? Math.round((now - u.ts) / 1000) : null,
          inboxBacklog: hive.inboxBacklog(id),
          onHold: !!a.onHold,
          contextTokens: ctx?.tokens ?? null,
          contextLimit: ctx?.limit ?? null,
          contextPct: ctx && ctx.limit > 0 ? Math.round((ctx.tokens / ctx.limit) * 100) : null
        };
      });
    // `hooks` is the hook socket's own health: god and the operator can read
    // from fleet.json whether the socket path hooks (SessionStart, the status
    // line, non Claude shims) are being enforced at all.
    hive.writeFleetSnapshot({ ts: now, floor: d.floor(), agents, hooks: d.hookHealth() });
  } catch (e) {
    console.error('[fleet] snapshot failed:', e);
  }
}

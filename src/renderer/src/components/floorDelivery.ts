/** The floor wide delivery switch (v0.3.4), used by the command
 *  center.
 *
 *  The switch flips its display at once (optimistic) and writes every live
 *  agent's control state. controlAutoDelivery resolves the agent's REAL
 *  snapshot, or null on failure, and those results used to be thrown away, so
 *  the switch could read "paused" for the whole floor while an agent mid spawn
 *  or mid teardown never got the update (#530). Now every result is checked;
 *  when any agent did not confirm, the switch re-syncs from the god's own
 *  snapshot, the state it was seeded from. */

interface ControlSnap { autoDeliveryPaused: boolean }

export interface FloorDeliveryApi {
  controlAutoDelivery(agentId: string, paused: boolean): Promise<ControlSnap | null>;
  controlSnapshot(agentId: string): Promise<ControlSnap | null>;
}

export interface FloorDeliveryResult {
  /** Agents whose snapshot did not confirm the new state. */
  failed: string[];
  /** What the switch should show now: `next` when every agent confirmed, the
   *  god's real state after a failure, or null when even that could not be
   *  read (keep what is shown). */
  shown: boolean | null;
}

export async function applyFloorDelivery(
  agentIds: readonly string[],
  next: boolean,
  godId: string,
  api: FloorDeliveryApi
): Promise<FloorDeliveryResult> {
  const results = await Promise.all(agentIds.map((id) => api.controlAutoDelivery(id, next).catch(() => null)));
  const failed = agentIds.filter((_, i) => !results[i] || results[i]!.autoDeliveryPaused !== next);
  if (failed.length === 0) return { failed, shown: next };
  console.error(
    `[floor-delivery] ${failed.length}/${agentIds.length} agent(s) did not confirm ` +
    `${next ? 'paused' : 'auto'} (${failed.join(', ')}); re-syncing the switch from ${godId}`
  );
  const godSnap = await api.controlSnapshot(godId).catch(() => null);
  return { failed, shown: godSnap ? godSnap.autoDeliveryPaused : null };
}

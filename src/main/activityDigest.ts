/**
 * THE ACTIVITY DIGEST, main side (v0.4.9 phase 2, decision D4). One ring of
 * ActivityEntry per agent id, capped at ACTIVITY_RING with the oldest dropped,
 * fed by the HookServer (tool calls, notices, idle, compaction, session starts)
 * and by the hive router (outbox mail). Every record is also pushed live to the
 * renderer on 'hive:agentActivity', and a reload asks for the whole ring back
 * through the 'hive:agentActivity' invoke, so the card never forgets the
 * morning. The last entry's ts is the agent's updatedAt; no separate channel.
 *
 * Pure apart from the WebContents TYPE: node:test loads it through load-ts
 * with a fake sender, no Electron needed.
 */
import type { WebContents } from 'electron';
import { ACTIVITY_RING, type ActivityEntry, type ActivityPush } from '../shared/activity';

export class ActivityDigest {
  private rings = new Map<string, ActivityEntry[]>();

  constructor(
    private getWebContents: () => WebContents | null,
    /** Entries kept per agent. A memory bound, defaulting to the shared contract. */
    private cap: number = ACTIVITY_RING
  ) {}

  /** Append one entry for an agent, dropping the oldest past the cap, and push it live. */
  record(agentId: string, entry: ActivityEntry): void {
    if (!agentId) return;
    let ring = this.rings.get(agentId);
    if (!ring) { ring = []; this.rings.set(agentId, ring); }
    ring.push(entry);
    if (ring.length > this.cap) ring.splice(0, ring.length - this.cap);
    const push: ActivityPush = { agentId, entry };
    try { this.getWebContents()?.send('hive:agentActivity', push); } catch { /* window torn down */ }
  }

  /** The newest `limit` entries, oldest first. The renderer reads updatedAt off the last one. */
  list(agentId: string, limit: number = ACTIVITY_RING): ActivityEntry[] {
    const ring = this.rings.get(agentId);
    if (!ring || ring.length === 0) return [];
    const n = Number.isInteger(limit) && limit > 0 ? Math.min(limit, ring.length) : ring.length;
    return ring.slice(ring.length - n);
  }

  /** Drop an agent's ring when main tears the agent down, so a replacement with the same id starts clean. */
  forget(agentId: string): void {
    this.rings.delete(agentId);
  }
}

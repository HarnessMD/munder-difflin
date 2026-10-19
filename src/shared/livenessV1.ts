// Ported from Prozzta/guppyos 02d0d50b (MIT).
// src/shared/livenessV1.ts — the single definition. Producer: AgentLivenessMonitor (Dwight).
// Consumers: boardMonitor/detectStale and floorDigest (Creed), the UI.

export type LivenessClassification =
  | 'BUSY_PROGRESSING' | 'IDLE' | 'SUSPECT' | 'STUCK_WAKE'
  | 'CRASHED' | 'EXITED' | 'UNKNOWN';

export type LivenessLifecycle = 'LIVE' | 'ARCHIVED' | 'DELETED';

/** Mirrors the registry's ArchiveReason (src/main/hive.ts:204). Set iff lifecycle === 'ARCHIVED'. */
export type LivenessArchiveReason = 'explicit' | 'orphan' | 'pty-exit';

/** Reserved reason values with a meaning for consumers. The producer may use other bounded machine
 *  values (enumerated in ZERO-TOKEN-LIVENESS-DESIGN.md); consumers treat unknown values as opaque. */
export const LIVENESS_REASON_OPERATOR_HOLD = 'operator-hold' as const;

export interface LivenessV1 {
  agentId: string;
  incarnation: string;              // PTY spawn identity; changes on respawn
  lifecycle: LivenessLifecycle;
  archivedAt?: number;              // set when lifecycle is ARCHIVED (registry archival edge)
  archiveReason?: LivenessArchiveReason; // set iff lifecycle === 'ARCHIVED'
  classification: LivenessClassification;
  classifiedSince: number;          // changes only on a classification/lifecycle transition
  reason: string;                   // bounded machine value, never model output;
                                    // 'operator-hold' (with classification IDLE) = explicit pause/HITL/hold
  evidence: {
    sampledAt: number;
    lastPtyTrafficAt?: number;
    lastHookAt?: number;
    lastRolloutStartedAt?: number;
    lastRolloutCompleteAt?: number;
    lastTurnEndAt?: number;         // main-session Stop only; never subagent Stop
    lastWakeRefusalAt?: number;
    wakeRefusalSince?: number;
    processExitAt?: number;
    exitCode?: number | null;
  };
}

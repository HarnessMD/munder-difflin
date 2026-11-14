// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * ZERO-TOKEN-LIVENESS: how a liveness-v1 record looks on a Command Center card (design "UI and
 * Human choices"). Pure: the chip component renders this and nothing else, so what a state OFFERS
 * is decided here, testably, and the component only wires clicks.
 *
 * Offers are click-only (Jim L3): rendering a chip, a liveness edge and a periodic sample never
 * invoke a control. Restart-and-continue and the mail re-offer start model work, so they are only
 * ever offered as buttons a person presses.
 */
import { LIVENESS_REASON_OPERATOR_HOLD, type LivenessClassification, type LivenessV1 } from './livenessV1';

export type LivenessTone = 'green' | 'neutral' | 'amber' | 'red' | 'dark';
/** inspect: show the agent's terminal and log. restart-continue: the existing Restart & Continue.
 *  reoffer: re-offer waiting mail after the stuck-wake watchdog gave up (main checks it again). */
export type LivenessAction = 'inspect' | 'restart-continue' | 'reoffer';

export interface LivenessChipView {
  label: string;
  tone: LivenessTone;
  /** "for 12m" style duration since `classifiedSince`. */
  duration: string;
  /** Tooltip lines: state, incarnation, reason, evidence ages, archive time. */
  detail: string[];
  actions: LivenessAction[];
}

const LABEL: Record<LivenessClassification, string> = {
  BUSY_PROGRESSING: 'busy', IDLE: 'idle', SUSPECT: 'suspect', STUCK_WAKE: 'stuck',
  CRASHED: 'crashed', EXITED: 'exited', UNKNOWN: 'unknown'
};
const TONE: Record<LivenessClassification, LivenessTone> = {
  BUSY_PROGRESSING: 'green', IDLE: 'neutral', SUSPECT: 'amber', STUCK_WAKE: 'red',
  CRASHED: 'red', EXITED: 'dark', UNKNOWN: 'neutral'
};

export function formatLivenessAge(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d`;
}

export function livenessChipView(rec: LivenessV1, now: number): LivenessChipView {
  const onHold = rec.classification === 'IDLE' && rec.reason === LIVENESS_REASON_OPERATOR_HOLD;
  const ev = rec.evidence;
  const age = (t: number | undefined, what: string): string[] => (typeof t === 'number' && t > 0 ? [`${what} ${formatLivenessAge(now - t)} ago`] : []);
  const detail = [
    `${rec.classification}${rec.lifecycle !== 'LIVE' ? ` (${rec.lifecycle})` : ''} since ${new Date(rec.classifiedSince).toISOString()}`,
    `reason: ${rec.reason}`,
    `incarnation: ${rec.incarnation}`,
    ...(rec.lifecycle === 'ARCHIVED' ? [`archived${rec.archiveReason ? ` (${rec.archiveReason})` : ''}${rec.archivedAt ? ` at ${new Date(rec.archivedAt).toISOString()}` : ''}`] : []),
    ...age(ev.lastPtyTrafficAt, 'terminal output'),
    ...age(ev.lastHookAt, 'hook'),
    ...age(ev.lastRolloutStartedAt, 'rollout start'),
    ...age(ev.lastRolloutCompleteAt, 'rollout complete'),
    ...age(ev.lastTurnEndAt, 'turn end'),
    ...age(ev.lastWakeRefusalAt, 'wake refused'),
    ...age(ev.processExitAt, `process exit${ev.exitCode !== undefined ? ` (code ${ev.exitCode})` : ''}`)
  ];
  const actions: LivenessAction[] = [];
  if (rec.classification === 'SUSPECT' || rec.classification === 'STUCK_WAKE') actions.push('inspect');
  if (rec.classification === 'STUCK_WAKE' && rec.reason === 'wwr-max-recoveries' && rec.lifecycle === 'LIVE') actions.push('reoffer');
  // A process that ended can be restarted and continued, unless a person archived it on purpose.
  if ((rec.classification === 'CRASHED' || rec.classification === 'EXITED') && rec.lifecycle !== 'DELETED'
    && !(rec.lifecycle === 'ARCHIVED' && rec.archiveReason === 'explicit')) actions.push('restart-continue');
  const base = onHold ? 'on hold' : LABEL[rec.classification];
  if (rec.lifecycle !== 'LIVE') {
    // Archived / deleted agents render neutral; the last classification and archive time stay.
    return {
      label: `${rec.lifecycle === 'ARCHIVED' ? 'archived' : 'deleted'} · ${base}`,
      tone: 'neutral', duration: formatLivenessAge(now - rec.classifiedSince), detail, actions
    };
  }
  return { label: base, tone: onHold ? 'neutral' : TONE[rec.classification], duration: formatLivenessAge(now - rec.classifiedSince), detail, actions };
}

/**
 * Merge one record into the renderer's map. A record older than the one held (by sampledAt) is
 * dropped: the startup snapshot can resolve AFTER a pushed edge, and must not put back a stale
 * badge (for example an old incarnation's STUCK after a respawn).
 */
export function applyLivenessUpdate(map: Readonly<Record<string, LivenessV1>>, rec: LivenessV1): Record<string, LivenessV1> {
  const prev = map[rec.agentId];
  if (prev && prev.evidence.sampledAt > rec.evidence.sampledAt) return map as Record<string, LivenessV1>;
  return { ...map, [rec.agentId]: rec };
}

/** The floor summary: how many LIVE agents are in each classification. */
export function livenessSummary(records: readonly LivenessV1[]): Partial<Record<LivenessClassification, number>> {
  const out: Partial<Record<LivenessClassification, number>> = {};
  for (const r of records) if (r.lifecycle === 'LIVE') out[r.classification] = (out[r.classification] ?? 0) + 1;
  return out;
}

/**
 * The Automations screen's one list. Three unrelated records (scheduled
 * missions, the two context rules, webhook endpoints) become rows of one shape so the list, the filter and the drawer
 * can treat them alike. Pure: no React, no doors, so test/pro-automations
 * can prove the projection against fixtures.
 *
 * WHAT "LAST" MEANS PER KIND. A mission stamps `lastFiredAt` itself. A
 * webhook fires when a message arrives, and the only
 * record of that is the trigger history ledger, so `last` is the newest
 * ledger row for that source. A context rule fires inside the terminal and
 * leaves no ledger; its `last` is unknown and the row says so rather than
 * inventing a time.
 */
import type { ContextRule, ContextTriggerConfig, TriggerHistoryEntry, WebhookTrigger } from '@shared/triggers';

// No organisation row: organisation keys do not exist (founder batch 3 #15).
export type AutoKind = 'schedule' | 'context' | 'webhook';
export type AutoFilter = 'all' | AutoKind;
export const AUTO_KINDS: AutoKind[] = ['schedule', 'context', 'webhook'];

/** A scheduled mission as main stores it. Preload's copy omits `weekly`; the
 *  drawer edits it, so the full record is declared here. */
export interface Mission {
  id: string;
  label: string;
  intervalMs: number;
  weekly?: { days: number[]; minute: number };
  to: string;
  body: string;
  enabled: boolean;
  autoCompact?: boolean;
  lastFiredAt?: number;
  kind?: 'dispatch' | 'heartbeat' | 'compact';
  quietThresholdMs?: number;
}

export type ContextRuleId = 'compact' | 'clear';
export const CONTEXT_RULE_IDS: ContextRuleId[] = ['compact', 'clear'];

export type AutoRow =
  | { kind: 'schedule'; id: string; enabled: boolean; last?: number; mission: Mission }
  | { kind: 'context'; id: `context:${ContextRuleId}`; enabled: boolean; last?: number; ruleId: ContextRuleId; rule: ContextRule }
  | { kind: 'webhook'; id: string; enabled: boolean; last?: number; pending: number; hook: WebhookTrigger };

export interface AutoSources {
  missions: Mission[];
  context: ContextTriggerConfig | null;
  webhooks: WebhookTrigger[];
  history: TriggerHistoryEntry[];
}

/** Newest ledger row for one source, or nothing. */
export function lastFiredFor(history: TriggerHistoryEntry[], source: 'webhook' | 'org', sourceId?: string): number | undefined {
  let best: number | undefined;
  for (const h of history) {
    if (h.source !== source) continue;
    if (sourceId !== undefined && h.sourceId !== sourceId) continue;
    if (best === undefined || h.at > best) best = h.at;
  }
  return best;
}

export function pendingFor(history: TriggerHistoryEntry[], source: 'webhook' | 'org', sourceId?: string): number {
  return history.filter((h) => h.source === source && (sourceId === undefined || h.sourceId === sourceId) && h.decision === 'pending').length;
}

/** The rows in display order: missions, the two rules, the endpoints.
 *  Order is by kind and then by the record's own order, never
 *  by time, so a row does not jump while the user is looking at it. */
export function projectRows(src: AutoSources): AutoRow[] {
  const rows: AutoRow[] = [];
  for (const m of src.missions) rows.push({ kind: 'schedule', id: m.id, enabled: m.enabled, last: m.lastFiredAt, mission: m });
  if (src.context) {
    for (const ruleId of CONTEXT_RULE_IDS) {
      const rule = src.context[ruleId];
      rows.push({ kind: 'context', id: `context:${ruleId}`, enabled: rule.enabled, ruleId, rule });
    }
  }
  for (const hook of src.webhooks) {
    rows.push({ kind: 'webhook', id: hook.id, enabled: hook.enabled, last: lastFiredFor(src.history, 'webhook', hook.id), pending: pendingFor(src.history, 'webhook', hook.id), hook });
  }
  return rows;
}

export function filterRows(rows: AutoRow[], filter: AutoFilter): AutoRow[] {
  return filter === 'all' ? rows : rows.filter((r) => r.kind === filter);
}

/** History rows that belong to one automation, newest first, capped. */
export function historyFor(history: TriggerHistoryEntry[], row: AutoRow, limit = 8): TriggerHistoryEntry[] {
  if (row.kind !== 'webhook') return [];
  return history
    .filter((h) => h.source === 'webhook' && h.sourceId === row.id)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

/** A fresh dispatch mission for "New schedule": weekday mornings at 09:00 to
 *  the orchestrator, off until the user fills the body and switches it on. */
export function newMission(now: number, to: string): Mission {
  return {
    id: `m_${now.toString(36)}`,
    label: '',
    intervalMs: 86_400_000,
    weekly: { days: [1, 2, 3, 4, 5], minute: 540 },
    to,
    body: '',
    enabled: false,
    kind: 'dispatch'
  };
}

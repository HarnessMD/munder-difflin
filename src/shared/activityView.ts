// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * CARD-IDLE-WHILE-WORKING (1.1.78): what every working/idle DISPLAY says about an agent - the
 * player card, the roster strip, the agent panel, the office floor and the LIVE ROSTER line god
 * reads.
 *
 * The renderer's own `status` is driven by hook events, and during a long tool call no hook fires
 * (and the PTY may go quiet, which its quiescence fallback reads as turn-done). So the card read
 * "idle" while the agent worked, though the zero-token liveness classification correctly said
 * BUSY_PROGRESSING. The busy/idle question is the liveness classification's to answer: a LIVE
 * BUSY_PROGRESSING record shows working, a LIVE IDLE record shows idle. Every richer status
 * (needs you, waiting, compacting, the breaker's looping pin, the person's own draft, gone) is a
 * different fact and is kept as it is.
 *
 * Display only: delivery gating keeps reading the agent's own `status` (main owns submission).
 * Pure; no clock of its own.
 */
import { formatLivenessAge } from './livenessView';
import type { LivenessV1 } from './livenessV1';

/** Statuses that only say "busy or not". The liveness classification decides these. */
const BUSY_OR_NOT: ReadonlySet<string> = new Set(['idle', 'working', 'thinking', 'success']);

/**
 * IDLE-MEANS-IDLE (1.1.87): the heavy-job lock as the displays read it (fleet.json `heavyLock`, the
 * `heavy-lock:changed` push). "Idle" means the agent's TURN is closed, and an agent that started a
 * suite in the background, waits in the lock's queue or has a slot reserved has closed its turn too.
 * The lock knows those facts; this joins them to the agent. Display only: the wake lifecycle and the
 * liveness classes never see it, so a queued agent stays wakeable for "HEAVY SLOT FREE".
 */
export interface HeavyLockView {
  holders?: ReadonlyArray<{ agentId: string; kind: string; since: string; background: boolean }>;
  waiters?: ReadonlyArray<{ agentId: string; kind: string; since: string; position: number }>;
  reserved?: ReadonlyArray<{ agentId: string; kind: string; until: string }>;
}

/** What the lock says an agent is doing between turns (epoch ms times). */
export type HeavyActivity =
  | { state: 'background'; kind: string; since: number }
  | { state: 'queued'; kind: string; position: number; since: number }
  | { state: 'reserved'; kind: string; until: number };

/** An agent's place in the lock: a BACKGROUND holder, a waiter (QUEUED #n) or a RESERVED slot, in
 *  that order; null otherwise. A foreground holder is null: its turn is open, so it already shows
 *  working. The lock never has one agent in two of these (a holder is dequeued and unreserved). */
export function heavyActivity(agentId: string | null | undefined, lock: HeavyLockView | null | undefined): HeavyActivity | null {
  if (!agentId || !lock) return null;
  const h = lock.holders?.find((x) => x && x.agentId === agentId);
  if (h) return h.background ? { state: 'background', kind: h.kind, since: Date.parse(h.since) } : null;
  const w = lock.waiters?.find((x) => x && x.agentId === agentId);
  if (w) return { state: 'queued', kind: w.kind, position: w.position, since: Date.parse(w.since) };
  const r = lock.reserved?.find((x) => x && x.agentId === agentId);
  if (r) return { state: 'reserved', kind: r.kind, until: Date.parse(r.until) };
  return null;
}

/** "06:26Z" */
function clockZ(ms: number): string {
  return Number.isFinite(ms) ? `${new Date(ms).toISOString().slice(11, 16)}Z` : '?';
}

/** The card line for a heavy state: "suite in background 3m", "queued for heavy slot #2 (4m)",
 *  "heavy slot reserved until 06:26Z". With no `now` (the floor's thought cloud), no age. */
export function heavyText(heavy: HeavyActivity | null | undefined, now?: number): string | null {
  if (!heavy) return null;
  const age = (since: number): string => (now === undefined ? '' : formatLivenessAge(now - since));
  switch (heavy.state) {
    case 'background': return now === undefined ? `${heavy.kind} in background` : `${heavy.kind} in background ${age(heavy.since)}`;
    case 'queued': return now === undefined ? `queued for heavy slot #${heavy.position}` : `queued for heavy slot #${heavy.position} (${age(heavy.since)})`;
    case 'reserved': return `heavy slot reserved until ${clockZ(heavy.until)}`;
  }
}

/** fleet.json's per-agent `heavy` field: the same facts with ISO times, so god and the agents read an
 *  agent's place in the lock without joining holders and waiters themselves. */
export function heavyFleetField(heavy: HeavyActivity | null): { state: HeavyActivity['state']; kind: string; position?: number; since?: string; until?: string } | null {
  if (!heavy) return null;
  const iso = (ms: number): string | undefined => (Number.isFinite(ms) ? new Date(ms).toISOString() : undefined);
  switch (heavy.state) {
    case 'background': return { state: heavy.state, kind: heavy.kind, since: iso(heavy.since) };
    case 'queued': return { state: heavy.state, kind: heavy.kind, position: heavy.position, since: iso(heavy.since) };
    case 'reserved': return { state: heavy.state, kind: heavy.kind, until: iso(heavy.until) };
  }
}

/** PANEL-BLINK-188: the one rule for the working blink, on the floor's chair panels and the cards' status
 *  dots alike: the shown statuses whose chip reads "working". Waiting, compacting, looping hold steady. */
export function workingBlinks(status: string): boolean {
  return status === 'working' || status === 'thinking';
}

/** The status to SHOW, given the hook-driven status, the agent's liveness record and (IDLE-MEANS-IDLE)
 *  its place in the heavy-job lock. Precedence: a richer status and CRASHED/EXITED/STUCK/SUSPECT, then
 *  WORKING, then a background job ('working': it stays at its desk), then queued or reserved
 *  ('waiting'), then idle. */
export function activityStatus<S extends string>(status: S, rec: LivenessV1 | null | undefined, heavy?: HeavyActivity | null): S | 'working' | 'idle' | 'waiting' {
  const base = livenessStatus(status, rec);
  if (!heavy || (base !== 'idle' && base !== 'success')) return base;
  // Only a LIVE agent the classifier calls idle (or one with no record yet) is overlaid.
  if (rec && (rec.lifecycle !== 'LIVE' || rec.classification !== 'IDLE')) return base;
  return heavy.state === 'background' ? 'working' : 'waiting';
}

function livenessStatus<S extends string>(status: S, rec: LivenessV1 | null | undefined): S | 'working' | 'idle' {
  if (!rec || rec.lifecycle !== 'LIVE' || !BUSY_OR_NOT.has(status)) return status;
  if (rec.classification === 'BUSY_PROGRESSING') return status === 'thinking' ? status : 'working';
  // Andy S1: 'success' (the turn just finished) is a kind of idle: Stop re-samples IDLE at once,
  // and turning it into 'idle' would erase the office floor's success glyph and the card's "done".
  if (rec.classification === 'IDLE') return status === 'success' ? status : 'idle';
  return status;
}

/** A tool call in progress: its name, when it started (epoch ms) and, when the hook carries one,
 *  the call's own id (Claude's tool_use_id). */
export interface RunningTool { name: string; since: number; id?: string }

/** FLEET-LIVENESS-BLIND N2 (Creed): the name of a call whose degraded Codex PreToolUse named no tool. */
export const UNKNOWN_TOOL = 'unknown';

/** Jim N1: tools can run in PARALLEL, so an agent has a LIST of tools in progress (oldest first).
 *  A PreToolUse adds one; its PostToolUse removes ONE: the call with its id when both carry one
 *  (Creed N1: overlapping same-name calls end the right entry), else the oldest of that name, else
 *  (Creed N2) the oldest unknown one; a Post naming no tool removes the oldest unknown, else the oldest. */
export function toolStarted(list: readonly RunningTool[] | undefined, name: string, now: number, id?: string): RunningTool[] {
  return [...(list ?? []), id ? { name, since: now, id } : { name, since: now }];
}
export function toolEnded(list: readonly RunningTool[] | undefined, name: string | undefined, id?: string): RunningTool[] {
  const l = [...(list ?? [])];
  let i = id ? l.findIndex((t) => t.id === id) : -1;
  if (i < 0 && name) i = l.findIndex((t) => t.name === name && (!id || !t.id));
  if (i < 0) i = l.findIndex((t) => t.name === UNKNOWN_TOOL);
  if (i < 0 && !name) i = 0;
  if (i >= 0 && l.length) l.splice(i, 1);
  return l;
}

/** "using Bash for 7m" while the shown status is busy and a tool is running; null otherwise. */
export function runningToolText(shown: string, tool: RunningTool | null | undefined, now: number): string | null {
  if (!tool || !tool.name || (shown !== 'working' && shown !== 'thinking')) return null;
  return `using ${tool.name} for ${formatLivenessAge(now - tool.since)}`;
}

/** The one-word state the LIVE ROSTER line gives each agent, from its liveness record and
 *  (IDLE-MEANS-IDLE) its place in the heavy-job lock: "BACKGROUND suite 3m", "QUEUED heavy #2 4m",
 *  "RESERVED to 06:26Z" in place of idle. */
export function rosterActivity(rec: LivenessV1 | null | undefined, now: number, tool?: { name: string; forSec: number } | null, heavy?: HeavyActivity | null): string | null {
  if (!rec || rec.lifecycle !== 'LIVE') return null;
  const age = formatLivenessAge(now - rec.classifiedSince);
  switch (rec.classification) {
    case 'BUSY_PROGRESSING':
      return tool && tool.name ? `WORKING ${age} (running ${tool.name} ${formatLivenessAge(tool.forSec * 1000)})` : `WORKING ${age}`;
    case 'IDLE':
      if (heavy?.state === 'background') return `BACKGROUND ${heavy.kind} ${formatLivenessAge(now - heavy.since)}`;
      if (heavy?.state === 'queued') return `QUEUED heavy #${heavy.position} ${formatLivenessAge(now - heavy.since)}`;
      if (heavy?.state === 'reserved') return `RESERVED to ${clockZ(heavy.until)}`;
      return `idle ${age}`;
    case 'SUSPECT': return `suspect ${age}`;
    case 'STUCK_WAKE': return `stuck ${age}`;
    case 'CRASHED': return `crashed ${age}`;
    case 'EXITED': return `exited ${age}`;
    default: return null;
  }
}

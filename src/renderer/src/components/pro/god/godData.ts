/**
 * The orchestrator's screen, the pure half (v0.4.9 phase 3, plan Part 4
 * section 4, decision D9). Nothing here touches React or the DOM, so
 * test/pro-049-god.test.cjs loads it with loadTs and pins the arithmetic the
 * tabs draw: which six tabs exist, how the routing log names a message once,
 * how the breaker's worst level is picked, and how a typed cap becomes a
 * number.
 */

export type GodTab = 'terminal' | 'messages' | 'routing' | 'budget' | 'board' | 'config';

/** The six tabs the prototype designed (viewGod), in its order. The second
 *  one is the agent to agent stream; the prototype's own word for it is one
 *  PRO does not say (plan Part 3), so the tab is called Messages. */
export const GOD_TABS: readonly GodTab[] = ['terminal', 'messages', 'routing', 'budget', 'board', 'config'];

export function isGodTab(v: unknown): v is GodTab {
  return typeof v === 'string' && (GOD_TABS as readonly string[]).includes(v);
}

/** The shape both message tabs read: the `hive:messages` door's rows, which
 *  is what the Inbox reads too (InboxScreen.useFloor). */
export interface RoutedMessage {
  id: string;
  from: string;
  to: string;
  act: string;
  subject: string;
  created_at: string;
  direction?: 'inbox' | 'outbox';
}

/**
 * One row per message, newest first. The door returns the sender's outbox
 * copy AND the recipient's inbox copy of the same message, and a broadcast
 * lands in every inbox; a routing log names a delivery once. The inbox copy
 * wins when both exist, because it is the one that proves delivery.
 */
export function routingRows<T extends RoutedMessage>(rows: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const r of rows) {
    const prev = byId.get(r.id);
    if (!prev || (prev.direction !== 'inbox' && r.direction === 'inbox')) byId.set(r.id, r);
  }
  return [...byId.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

/** How many of the rows were created on the same calendar day as `now`. */
export function countToday(rows: readonly { created_at: string }[], now: Date = new Date()): number {
  const day = now.toDateString();
  let n = 0;
  for (const r of rows) {
    const d = new Date(r.created_at);
    if (!isNaN(d.getTime()) && d.toDateString() === day) n += 1;
  }
  return n;
}

/* ───────────────────────────── the breaker ─────────────────────────────── */

export type BreakerLevel = 'healthy' | 'steering' | 'constrained' | 'stopped';
export const BREAKER_LEVELS: readonly BreakerLevel[] = ['healthy', 'steering', 'constrained', 'stopped'];

export interface BreakerSnapshot {
  agentId: string;
  level: BreakerLevel;
  reason: string;
  ts: number;
}

/** Mirrors DEFAULTS in src/main/breaker.ts, the values the policy applies
 *  when the config leaves a threshold unset. The test pins the two tables to
 *  each other, so a change in main fails here instead of drifting. */
export const BREAKER_DEFAULTS = {
  enabled: true,
  hardStop: false,
  repeatedToolLimit: 8,
  errorStormLimit: 5,
  tokenVelocityPerMin: 60_000
} as const;

const rank = (l: BreakerLevel): number => BREAKER_LEVELS.indexOf(l);

/** The worst level among the agents named in `ids` (the live roster), with
 *  the agent it belongs to. Healthy with nobody named when nothing tripped. */
export function worstBreaker(states: Readonly<Record<string, BreakerSnapshot>>, ids: readonly string[]): BreakerSnapshot | null {
  let worst: BreakerSnapshot | null = null;
  for (const id of ids) {
    const s = states[id];
    if (!s) continue;
    if (!worst || rank(s.level) > rank(worst.level) || (rank(s.level) === rank(worst.level) && s.ts > worst.ts)) worst = s;
  }
  return worst;
}

/** The most recent state that was not healthy, on any agent: the breaker's
 *  last action, for the "Last action" row. Null when it never acted. */
export function lastBreakerAction(states: Readonly<Record<string, BreakerSnapshot>>): BreakerSnapshot | null {
  let last: BreakerSnapshot | null = null;
  for (const s of Object.values(states)) {
    if (s.level === 'healthy') continue;
    if (!last || s.ts > last.ts) last = s;
  }
  return last;
}

/* ───────────────────────────── the budget ──────────────────────────────── */

/** Sum a per agent figure over the ids given (spend in USD, tokens per
 *  minute); an agent with no sample counts as zero. */
export function sumOver(values: Readonly<Record<string, number>>, ids: readonly string[]): number {
  let total = 0;
  for (const id of ids) total += values[id] ?? 0;
  return total;
}

/** Percent of a cap, clamped to 100; null when there is no cap to measure
 *  against, so a meter is not drawn for a number that means nothing. */
export function pctOf(n: number, cap: number | undefined): number | null {
  if (!cap || cap <= 0) return null;
  return Math.min(100, Math.round((n / cap) * 100));
}

/** A typed count ("800,000", "800000", " 1_000_000 ") as a positive integer,
 *  undefined for empty or nonsense. The same rule the agent screen's token
 *  cap applies, so the two fields agree. */
export function parseCount(text: string): number | undefined {
  const cleaned = text.replace(/[,_\s]/g, '');
  if (cleaned === '') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

/** A typed dollar amount ("$120", "120", "12.50") as a positive number,
 *  undefined for empty or nonsense. */
export function parseUsd(text: string): number | undefined {
  const cleaned = text.replace(/[$,\s]/g, '');
  if (cleaned === '') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** A count for a field, "" when unset. */
export function countText(n: number | undefined): string {
  return n === undefined || !Number.isFinite(n) ? '' : String(n);
}

/** The first sentence of a role line, for the header's plain sub line. */
export function firstSentence(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^[^.!?\n]+[.!?]?/);
  return (m ? m[0] : trimmed).trim();
}

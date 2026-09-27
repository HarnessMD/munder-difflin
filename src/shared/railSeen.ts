/**
 * WHAT THE PRO RAIL REMEMBERS ABOUT WHAT YOU HAVE LOOKED AT (0.5.3, F25,
 * HANDOFF.md data items 1 and 3).
 *
 * Two marks per agent, both this machine's, in localStorage, the same way the
 * Team button keeps its unread marks (components/team/teamUnread.ts): the
 * moment the person last OPENED the agent's screen, and the ids of that
 * agent's cards that were already done when they did. Opening the agent is
 * the only thing that clears a badge or a Finished strip; hovering never does
 * (founder). Losing the marks costs a badge and nothing else.
 *
 * Pure apart from the two storage functions, which guard `window` so a test
 * can load this file under node.
 */

export interface RailSeen {
  /** Agent id to the ISO stamp of the last time its screen was opened here. */
  opened: Record<string, string>;
  /** Agent id to the ids of its cards that were done at that last open. */
  done: Record<string, string[]>;
}

export const RAIL_SEEN_KEY = 'cth.proRail.seen';

export function emptyRailSeen(): RailSeen { return { opened: {}, done: {} }; }

export function readRailSeen(): RailSeen {
  try {
    const raw = window.localStorage.getItem(RAIL_SEEN_KEY);
    if (!raw) return emptyRailSeen();
    return parseRailSeen(JSON.parse(raw));
  } catch { return emptyRailSeen(); }
}

export function writeRailSeen(seen: RailSeen): void {
  try { window.localStorage.setItem(RAIL_SEEN_KEY, JSON.stringify(seen)); } catch { /* private mode, or no window */ }
}

/** Anything on disk that is not the shape is dropped field by field, never thrown. */
export function parseRailSeen(v: unknown): RailSeen {
  const out = emptyRailSeen();
  if (!v || typeof v !== 'object') return out;
  const o = v as { opened?: unknown; done?: unknown };
  if (o.opened && typeof o.opened === 'object') {
    for (const [k, at] of Object.entries(o.opened as Record<string, unknown>)) if (typeof at === 'string') out.opened[k] = at;
  }
  if (o.done && typeof o.done === 'object') {
    for (const [k, ids] of Object.entries(o.done as Record<string, unknown>)) {
      if (Array.isArray(ids)) out.done[k] = ids.filter((x): x is string => typeof x === 'string');
    }
  }
  return out;
}

export interface DoneCardLike {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  doneAt?: string;
  completedAt?: string;
  updatedAt?: string;
}

/** The moment a card was finished, as far as the ledger says: the hygiene
 *  sweep's doneAt, else the orchestrator's completedAt, else its updatedAt. */
export function doneStampOf(t: DoneCardLike): number {
  for (const at of [t.doneAt, t.completedAt, t.updatedAt]) {
    if (!at) continue;
    const n = Date.parse(at);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

/** The ledger's assignee is an agent id on cards the app writes and a name on
 *  cards an orchestrator wrote by hand (the same rule as @shared/askMeBadge). */
export function isAssignedTo(assignee: string | undefined, agentId: string, agentName?: string): boolean {
  if (!assignee) return false;
  const a = assignee.toLowerCase();
  return a === agentId.toLowerCase() || (!!agentName && a === agentName.toLowerCase());
}

/**
 * The cards an agent finished since the person last looked at it: done cards
 * of its own that were stamped after the last open, or, for a card with no
 * stamp, that were not already done at the last open. An agent never opened
 * here shows nothing as finished: every old card would be "news" otherwise,
 * and a strip that says Finished about last month is noise, not news.
 */
export function finishedSince<T extends DoneCardLike>(tasks: readonly T[], agentId: string, agentName: string | undefined, seen: RailSeen): T[] {
  const openedAt = seen.opened[agentId];
  if (!openedAt) return [];
  const floor = Date.parse(openedAt);
  if (!Number.isFinite(floor)) return [];
  const known = new Set(seen.done[agentId] ?? []);
  return tasks.filter((t) => {
    if (t.status !== 'done' || !isAssignedTo(t.assignee, agentId, agentName)) return false;
    const at = doneStampOf(t);
    return Number.isFinite(at) ? at > floor : !known.has(t.id);
  });
}

/** The marks after opening an agent now: the stamp, and its done cards as known. */
export function markOpened<T extends DoneCardLike>(seen: RailSeen, agentId: string, agentName: string | undefined, tasks: readonly T[], now = new Date()): RailSeen {
  const done = tasks.filter((t) => t.status === 'done' && isAssignedTo(t.assignee, agentId, agentName)).map((t) => t.id);
  return { opened: { ...seen.opened, [agentId]: now.toISOString() }, done: { ...seen.done, [agentId]: done } };
}

/** The mail an agent sent the person is unread until the agent is opened. */
export function unreadMail(count: number | undefined): number { return count && count > 0 ? count : 0; }

/** Short relative age the row prints: "now", "12s", "9m", "1h", "2d". */
export function ageWord(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

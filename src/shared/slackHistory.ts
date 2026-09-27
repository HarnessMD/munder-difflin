/**
 * The Slack ledger's shape and its pure operations. main/slackHistory.ts owns
 * the file; this module owns what a row is, which rows survive a read, and
 * how an append caps the list, so test/slack-history.test.cjs can prove those
 * without electron.
 */
export interface SlackHistoryEntry {
  id: string;
  /** inbound: a Slack thread message that became work; outbound: a post we made. */
  direction: 'inbound' | 'outbound';
  channel: string;
  thread_ts: string;
  text: string;
  /** Outbound only: whether Slack accepted the post. Inbound rows are always true. */
  ok: boolean;
  error?: string;
  /** The card a done-summary was posted for, when there was one. */
  taskId?: string;
  at: number;
}

/** Ledger cap; the oldest rows fall off past this. */
export const SLACK_HISTORY_LIMIT = 200;

export type SlackHistoryInput = Omit<SlackHistoryEntry, 'id' | 'at'> & { id?: string; at?: number };

/** Structural guard for one persisted row: a hand-edited or half-written file
 *  drops the bad rows rather than the whole ledger. */
export function isSlackHistoryEntry(v: unknown): v is SlackHistoryEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<SlackHistoryEntry>;
  return typeof e.id === 'string'
    && (e.direction === 'inbound' || e.direction === 'outbound')
    && typeof e.channel === 'string'
    && typeof e.thread_ts === 'string'
    && typeof e.text === 'string'
    && typeof e.ok === 'boolean'
    && typeof e.at === 'number';
}

/** What the file parses to: an array of valid rows, or nothing. */
export function parseSlackHistory(raw: unknown): SlackHistoryEntry[] {
  return Array.isArray(raw) ? raw.filter(isSlackHistoryEntry) : [];
}

/** The ledger with one row added at the front, built FIELD BY FIELD (never a
 *  spread of the caller's object), de-duplicated by id, capped. */
export function withSlackHistoryEntry(current: SlackHistoryEntry[], input: SlackHistoryInput, id: string, now: number): { entry: SlackHistoryEntry; next: SlackHistoryEntry[] } {
  const entry: SlackHistoryEntry = {
    id: input.id ?? id,
    direction: input.direction,
    channel: input.channel,
    thread_ts: input.thread_ts,
    text: input.text,
    ok: input.ok,
    at: input.at ?? now
  };
  if (input.error) entry.error = input.error;
  if (input.taskId) entry.taskId = input.taskId;
  const next = [entry, ...current.filter((e) => e.id !== entry.id)].slice(0, SLACK_HISTORY_LIMIT);
  return { entry, next };
}

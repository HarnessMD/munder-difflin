/**
 * THE AGENT'S TASKS TAB, the rules only (0.5.3, founder on rc.4: "There should
 * be a Tasks section inside agent view along with Inbox and Terminal which
 * will show the tasks done by the agent and what and when with search and
 * filter."). Import free, so test/v053-agent-tasks-tab.test.cjs runs it; the
 * drawing is AgentTasks.tsx.
 *
 * Whose card: the ledger's assignee is written by hand, as the agent's id or
 * its name, so both count (a name in any case).
 *
 * When: the ledger has no single "when". A done card says when it was done,
 * a doing card when it started, a blocked card when it asked you (or when it
 * was last touched), a todo card when it was added; each falls back to the
 * next stamp the card does have. Newest activity first.
 */

export type TaskStatusLike = 'todo' | 'doing' | 'blocked' | 'done';
export interface TaskLike {
  id: string;
  title: string;
  description?: string;
  result?: string;
  assignee?: string;
  status: TaskStatusLike;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  completedAt?: string;
  doneAt?: string;
  humanQA?: ReadonlyArray<{ q: string; a?: string; askedAt?: string; dismissedAt?: string }>;
}

export type StatusFilter = 'all' | TaskStatusLike;
export type TimeWindow = 'today' | 'week' | 'month' | 'all';
export const STATUS_FILTERS: StatusFilter[] = ['all', 'doing', 'done', 'blocked', 'todo'];
export const TIME_WINDOWS: TimeWindow[] = ['today', 'week', 'month', 'all'];

/** The kind of "when" a row shows. */
export type WhenKind = 'done' | 'started' | 'asked' | 'blocked' | 'added';
export interface WhenLine { kind: WhenKind; at: number }

const ms = (iso: string | undefined): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};
const first = (...isos: Array<string | undefined>): number | null => {
  for (const iso of isos) { const t = ms(iso); if (t !== null) return t; }
  return null;
};

/** Every card this agent holds, by id or by name. */
export function agentTasks<T extends TaskLike>(tasks: readonly T[] | null, agent: { id: string; name: string }): T[] {
  if (!tasks) return [];
  const name = agent.name.trim().toLowerCase();
  return tasks.filter((t) => !!t.assignee && (t.assignee === agent.id || (!!name && t.assignee.trim().toLowerCase() === name)));
}

/** The open ask on a card, as the ASK ME board reads it. */
function openAsk(t: TaskLike): { askedAt?: string } | null {
  const qa = t.humanQA ?? [];
  for (let i = qa.length - 1; i >= 0; i--) if (!qa[i].a && !qa[i].dismissedAt) return qa[i];
  return null;
}

/** What the row says about when, or null for a card with no stamp at all. */
export function whenLine(t: TaskLike): WhenLine | null {
  let kind: WhenKind; let at: number | null;
  switch (t.status) {
    case 'done': kind = 'done'; at = first(t.doneAt, t.completedAt, t.updatedAt, t.createdAt); break;
    case 'doing': kind = 'started'; at = first(t.startedAt, t.updatedAt, t.createdAt); break;
    case 'blocked': {
      const asked = ms(openAsk(t)?.askedAt);
      if (asked !== null) { kind = 'asked'; at = asked; } else { kind = 'blocked'; at = first(t.updatedAt, t.createdAt); }
      break;
    }
    default: kind = 'added'; at = first(t.createdAt, t.updatedAt);
  }
  return at === null ? null : { kind, at };
}

/** The newest stamp on a card, for the order. */
export function lastActivity(t: TaskLike): number {
  let best = -Infinity;
  for (const iso of [t.doneAt, t.completedAt, t.updatedAt, t.startedAt, t.createdAt, openAsk(t)?.askedAt]) {
    const v = ms(iso); if (v !== null && v > best) best = v;
  }
  return best;
}

/** Is `at` inside the window: today since local midnight, the last 7 days,
 *  the last 30 days, or any time. */
export function inWindow(at: number | null, win: TimeWindow, now: number): boolean {
  if (win === 'all') return true;
  if (at === null) return false;
  if (win === 'today') { const d = new Date(now); d.setHours(0, 0, 0, 0); return at >= d.getTime(); }
  const days = win === 'week' ? 7 : 30;
  return at >= now - days * 86_400_000;
}

/** Search (title, key, description, result), status and window, newest first. */
export function filterAgentTasks<T extends TaskLike>(tasks: readonly T[], opts: { status: StatusFilter; window: TimeWindow; query: string; now: number }): T[] {
  const q = opts.query.trim().toLowerCase();
  return tasks
    .filter((t) => opts.status === 'all' || t.status === opts.status)
    .filter((t) => inWindow(whenLine(t)?.at ?? null, opts.window, opts.now))
    .filter((t) => !q || `${t.title}\n${t.id}\n${t.description ?? ''}\n${t.result ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => lastActivity(b) - lastActivity(a));
}

/** "2 hours ago", in the reader's language (Intl, so ar and zh-CN come free). */
export function agoText(at: number, now: number, locale: string): string {
  const sec = Math.round((at - now) / 1000);
  const abs = Math.abs(sec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 60) return rtf.format(sec, 'second');
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(sec / 3600), 'hour');
  if (abs < 30 * 86_400) return rtf.format(Math.round(sec / 86_400), 'day');
  return rtf.format(Math.round(sec / (30 * 86_400)), 'month');
}

/** "25 Sep 14:02", in the reader's language. */
export function stampText(at: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(at);
}
